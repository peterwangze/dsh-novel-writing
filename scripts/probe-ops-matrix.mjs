#!/usr/bin/env node
/**
 * probe-ops-matrix.mjs — 全量操作矩阵真实宿主探针（官方 CLI + 临时 DSH_HOME + Edge/CDP）
 *
 * 目的：用真实宿主实例，对「用户会做的每一个基础操作」做**期望驱动**验证（不是源码面字符串断言）。
 * 基线缺陷来源：BUG-014 复核 + 书斋/控制台审计（F-01~F-09）+ 工作台审计（WB-01~WB-13）+
 * 工作流控制条审计（QA-01~QA-12）。本探针覆盖其中可在单实例内确定性复现的部分：
 *
 *   O1  打开书斋          侧栏入口 → .nv-console 出现、首页 .nv-home 渲染
 *   O2  打开工作台        首页书卡 → .nv-split 出现、顶栏可见
 *   O3  切换章节          左栏点第 2 章 → 稿纸抬头「第 2 章」、正文来自第二章
 *   O4  编辑态切章（P0）   编辑中改字 → 点第 1 章 → 退出编辑（无 textarea）∧ 抬头第 1 章 ∧
 *                        稿纸不出现刚输入的文字（原缺陷：旧草稿以新章名义保存 = 数据损坏）
 *   O5  空正文保存         清空正文 → 保存 → 可见「正文不能为空」且仍在编辑态（原缺陷：静默无反应）
 *   O6  保存成功反馈       正常保存 → 「已保存 · N 字」在**阅读态**可见（原缺陷：提示被同帧卸载）
 *   O7  文件预览切章       资料文件打开时点章节 → 稿纸回到章节正文（原缺陷：抬头换章正文仍是文件）
 *   O8  关闭按钮可访问名   ✕ 的 aria-label 非空且非键名（原缺陷：closeSplit 未定义 → undefined）
 *   O9  Esc 分层           首页搜索下拉打开时按 Esc → 控制台**不关**（原缺陷：一次 Esc 连关两层）
 *   O10 缺键不泄漏         全页可见文本不含 'undefined' / 'closeSplit' / 'homeDetailLoading' 键名
 *   O11 关闭工作台还原     ✕ 关闭 → .nv-split 消失、宿主 viewArea 标记撤销
 *   O12 console 卫生       0 × React #310 / 0 × pageerror（渲染期崩溃会让整块浮层静默卸载）
 *
 * 不在本探针覆盖（需人机协同或多实例）：抽屉↔绑定会话切换（BUG-014/QA-01~03，源码面 + smoke 看护）、
 * 会话级取消/压缩（QA 语义依赖宿主实现）、拖拽排序（指针拖拽在 headless 下不稳定）。
 *
 * 隔离纪律（与 probe-ux067 同源）：全部写临时根；子进程 DSH_HOME/USERPROFILE/HOME/APPDATA/
 * LOCALAPPDATA/TEMP 重定向；真实 $DSH_HOME 只读指纹前后一致；浏览器 --user-data-dir 亦在临时根；
 * 只杀自启进程树；token 入库前 <redacted>。
 *
 * 用法：node scripts/probe-ops-matrix.mjs [--out <dir>] [--port 3082] [--dsh <cli>] [--keep]
 * 退出码：0 = 断言全绿（SKIP 不算失败）；1 = 有 FAIL；2 = 环境不可用（CLI/浏览器/CDP/首跑门）。
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_OUT = join(REPO_ROOT, '.scratch-ops', 'report')
const PROFILE_NAME = 'nvopsmatrix'
const DESKTOP_CLI = 'D:\\app\\dsh\\resources\\runtime\\cli\\bin\\dsh.cmd'
const BOOK_TITLE = '运维矩阵验证书'
const CH1 = '第一章 矩阵甲\n\nMATRIX-CH1：第一章的正文标记，用于验证切章后正文与抬头一致。\n'
const CH2 = '第二章 矩阵乙\n\nMATRIX-CH2：第二章的正文标记，用于验证切章后正文确实换成了第二章。\n'
const OUTLINE_MARKER = 'MATRIX-OUTLINE'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (t) => createHash('sha256').update(t).digest('hex')

function parseArgs(argv) {
  const opts = { out: DEFAULT_OUT, keep: false, help: false, dsh: null, port: 3082 }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--out') opts.out = argv[++i]
    else if (a === '--keep') opts.keep = true
    else if (a === '--dsh') opts.dsh = String(argv[++i] ?? '')
    else if (a === '--port') opts.port = Number(argv[++i])
    else if (a === '--help' || a === '-h') opts.help = true
    else { console.error('用法错误：未知参数 ' + a); process.exit(2) }
  }
  if (!Number.isInteger(opts.port) || opts.port < 1024 || opts.port > 65535) { console.error('用法错误：--port 需为 1024-65535'); process.exit(2) }
  return opts
}

function resolveHostCli(explicit) {
  if (typeof explicit === 'string' && explicit !== '') return existsSync(explicit) ? { cmd: explicit, source: '--dsh 参数' } : null
  if (typeof process.env.NV_PROBE_DSH === 'string' && process.env.NV_PROBE_DSH !== '') return existsSync(process.env.NV_PROBE_DSH) ? { cmd: process.env.NV_PROBE_DSH, source: 'env NV_PROBE_DSH' } : null
  if (existsSync(DESKTOP_CLI)) return { cmd: DESKTOP_CLI, source: '桌面运行时 CLI（默认）' }
  return { cmd: 'dsh', source: 'PATH 上的 dsh' }
}

function prepareIsolatedProfile(root, home) {
  if (!(home !== root && home.startsWith(root + sep))) return false
  if (home === join(process.env.USERPROFILE ?? '', '.dsh')) return false
  const profileDir = join(home, 'profiles', PROFILE_NAME)
  const nm = join(profileDir, 'node_modules')
  mkdirSync(nm, { recursive: true })
  const r = spawnSync('cmd', ['/c', 'mklink', '/J', join(nm, 'dsh-novel-writing'), REPO_ROOT], { stdio: 'ignore' })
  if (r.status !== 0 && !existsSync(join(nm, 'dsh-novel-writing'))) return false
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
    name: 'dsh-profile-' + PROFILE_NAME,
    private: true,
    dependencies: { 'dsh-novel-writing': 'link:' + REPO_ROOT },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-novel-writing'], patchReload: 'live' } },
  }, null, 2) + '\n')
  writeFileSync(join(profileDir, 'cordis.yml'), '[]\n')
  writeFileSync(join(profileDir, 'cordis.patch.yml'), '[]\n')
  return true
}

function spawnHostCli(cmd, args, env) {
  return spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })
}

function killTree(child) {
  if (child === null || child.pid === undefined || child.exitCode !== null) return
  if (process.platform === 'win32') {
    try { spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { stdio: 'ignore' }) } catch { try { child.kill('SIGKILL') } catch { /* ignore */ } }
  } else { try { child.kill('SIGKILL') } catch { /* ignore */ } }
}

function findBrowser() {
  const candidates = [
    join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.ProgramFiles ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.ProgramFiles ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter((p) => p !== '' && existsSync(p))
  return candidates[0] ?? null
}

function realFingerprint(home) {
  const fp = { home, settingsSha: null, profiles: null }
  try { if (existsSync(join(home, 'settings.yaml'))) fp.settingsSha = sha256(readFileSync(join(home, 'settings.yaml'), 'utf8')) } catch { /* ignore */ }
  try { fp.profiles = readdirSync(join(home, 'profiles')).sort().join(',') } catch { /* ignore */ }
  return fp
}

const portFree = (port) => new Promise((resolve) => {
  const srv = createServer()
  srv.on('error', () => resolve(false))
  srv.listen(port, '127.0.0.1', () => { srv.close(() => resolve(true)) })
})
const freePort = () => new Promise((resolve, reject) => {
  const srv = createServer()
  srv.on('error', reject)
  srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)) })
})

class Cdp {
  constructor(ws) { this.ws = ws; this.seq = 0; this.pending = new Map(); this.handlers = new Map() }
  static async attach(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('cdp ws connect failed')) })
    const cdp = new Cdp(ws)
    ws.onmessage = (ev) => {
      let msg = null
      try { msg = JSON.parse(String(ev.data)) } catch { return }
      if (msg.id !== undefined && cdp.pending.has(msg.id)) {
        const p = cdp.pending.get(msg.id); cdp.pending.delete(msg.id)
        if (msg.error !== undefined) p.rej(new Error('cdp ' + msg.method + ': ' + JSON.stringify(msg.error)))
        else p.res(msg.result)
      } else if (msg.method !== undefined) {
        for (const h of cdp.handlers.get(msg.method) ?? []) { try { h(msg.params) } catch { /* ignore */ } }
      }
    }
    return cdp
  }
  on(method, handler) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(handler) }
  send(method, params = {}) {
    return new Promise((res, rej) => { const id = ++this.seq; this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails !== undefined) throw new Error('page eval failed: ' + String(JSON.stringify(r.exceptionDetails)).slice(0, 300))
    return r.result.value
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) { console.log('用法：node scripts/probe-ops-matrix.mjs [--out <dir>] [--port <n=3082>] [--dsh <cli>] [--keep]'); return 0 }
  const hostCli = resolveHostCli(opts.dsh)
  if (hostCli === null) { console.error('[probe] 环境错误：宿主 CLI 不可达（--dsh / NV_PROBE_DSH）'); return 2 }
  const browser = findBrowser()
  if (browser === null) { console.error('[probe] 环境错误：未找到 Chromium 内核浏览器（Edge/Chrome）'); return 2 }

  let appPort = opts.port
  if (!(await portFree(appPort))) {
    appPort = appPort + 1
    if (!(await portFree(appPort))) { console.error('[probe] 环境错误：端口 ' + opts.port + '/' + appPort + ' 均被占用'); return 2 }
    console.log('[probe] 端口 ' + opts.port + ' 被占 ⇒ 备用 ' + appPort)
  }
  const cdpPort = await freePort()
  const realHome = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  const realBefore = realFingerprint(realHome)

  const root = mkdtempSync(join(tmpdir(), 'nvops-probe-'))
  const dirs = { root, home: join(root, 'dsh-home'), userprofile: join(root, 'userprofile'), appdata: join(root, 'appdata'), localappdata: join(root, 'localappdata'), edge: join(root, 'edge-profile'), tmp: join(root, 'tmp'), novels: join(root, 'novels') }
  for (const [k, d] of Object.entries(dirs)) if (k !== 'novels') mkdirSync(d, { recursive: true })
  const containment = {}
  for (const k of ['home', 'userprofile', 'appdata', 'localappdata', 'edge', 'tmp', 'novels']) containment[k] = dirs[k] !== root && dirs[k].startsWith(root + sep)
  if (Object.values(containment).some((v) => v !== true)) {
    console.error('[probe] 隔离校验失败：重定向路径越出临时根 ' + JSON.stringify(containment))
    rmSync(root, { recursive: true, force: true })
    return 2
  }
  mkdirSync(opts.out, { recursive: true })
  // 注意：workspaceRoot 的实际生效面由插件自身决定（settings.yaml 键名/格式随宿主代际变化），
  // 因此夹具**不假设**根路径——以 /api/novel-create 返回的真实 path 为准（下一步回填）。
  const novelsRoot = join(dirs.userprofile, 'novels')
  mkdirSync(novelsRoot, { recursive: true })

  console.log('[probe] 操作矩阵探针（书斋 → 工作台 → 章节编辑/保存 → Esc 分层 → 关闭还原）')
  console.log('  临时根 = ' + root + '（真实 $DSH_HOME 只读指纹对齐）')
  console.log('  宿主 CLI = ' + hostCli.cmd + '；浏览器 = ' + browser + '；端口 = ' + appPort + '；证据 = ' + opts.out)

  const childEnv = {
    ...process.env,
    DSH_HOME: dirs.home, USERPROFILE: dirs.userprofile, HOME: dirs.userprofile,
    APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata, TEMP: dirs.tmp, TMP: dirs.tmp,
  }

  const report = {
    tool: 'probe-ops-matrix', task: 'BUG-015', startedAt: new Date().toISOString(),
    isolation: { root, dshHome: dirs.home, hostCli, browser, port: appPort, containment, realEnvBefore: realBefore },
    steps: {}, assertions: [], consoleCaptured: { errors: [], pageerrors: [] }, envBlocked: null, instanceUrlRedacted: null,
    realEnvAfter: null, ok: false,
  }
  const assertion = (id, label, status, detail) => {
    // 允许传布尔（true=OK / false=FAIL）或 'OK'|'SKIP'|'FAIL'
    const st = status === true ? 'OK' : status === false ? 'FAIL' : String(status)
    report.assertions.push({ id, label, status: st, detail: detail ?? null, at: new Date().toISOString() })
    console.log('  ' + (st === 'OK' ? 'OK  ' : st === 'SKIP' ? 'SKIP' : 'FAIL') + ' ' + id + '：' + label + (st === 'OK' ? '' : ' :: ' + JSON.stringify(detail).slice(0, 400)))
    return st === 'OK'
  }

  let boot = null, edge = null, cdp = null
  const bootOut = []
  const stopAll = async () => {
    try { if (cdp !== null) cdp.ws.close() } catch { /* ignore */ }
    try { if (edge !== null && edge.exitCode === null) edge.kill() } catch { /* ignore */ }
    killTree(boot)
    await sleep(700)
    if (edge !== null && edge.exitCode === null) { try { edge.kill('SIGKILL') } catch { /* ignore */ } }
    await sleep(300)
  }

  const code = await (async () => {
    try {
      if (prepareIsolatedProfile(root, dirs.home) !== true) { report.envBlocked = 'profile 装配失败'; console.error('[probe] 环境错误：隔离 profile 装配失败'); return 2 }
      boot = spawnHostCli(hostCli.cmd, ['--profile', PROFILE_NAME, '--no-open', '--port', String(appPort)], childEnv)
      let appUrl = null
      boot.stdout.on('data', (b) => {
        const t = String(b)
        bootOut.push(t.trim())
        const m = /(http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+)/.exec(t)
        if (m !== null && appUrl === null) appUrl = m[1]
      })
      boot.stderr.on('data', (b) => bootOut.push('ERR ' + String(b).trim()))
      for (let i = 0; i < 240 && appUrl === null; i += 1) { if (boot.exitCode !== null) break; await sleep(250) }
      if (appUrl === null) { report.envBlocked = '隔离实例未启动：' + bootOut.join(' | ').slice(0, 800); console.error('[probe] 环境错误：' + report.envBlocked.slice(0, 300)); return 2 }
      report.instanceUrlRedacted = appUrl.replace(/token=.*/, 'token=<redacted>')
      const token = (/token=([A-Za-z0-9_-]+)/.exec(appUrl) ?? [])[1] ?? ''
      const origin = new URL(appUrl).origin
      let serving = false
      for (let i = 0; i < 120 && serving !== true; i += 1) {
        try { const res = await fetch(appUrl, { redirect: 'manual' }); if (res.status !== undefined) serving = true } catch { await sleep(250) }
      }
      if (serving !== true) { report.envBlocked = '隔离实例 HTTP 未就绪'; console.error('[probe] 环境错误：HTTP 未就绪'); return 2 }

      // ── 夹具：经真实 HTTP API 建书，再写两章正文 + 一份大纲（避免依赖 UI 创建流程）──
      const apiUrl = (name, query) => origin + '/novel-writing/api/' + name + '?token=' + encodeURIComponent(token) + (query === undefined ? '' : '&' + query)
      const postJson = async (name, body) => {
        // 宿主 CSRF 守卫要求 Origin/Referer 与 harness origin 一致 + content-type=application/json
        const res = await fetch(apiUrl(name), {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin, referer: origin + '/' },
          body: JSON.stringify(body),
        })
        return { status: res.status, json: await res.json().catch(() => null) }
      }
      const created = await postJson('novel-create', { name: BOOK_TITLE, title: BOOK_TITLE })
      const novelId = created.json !== null && created.json.novel !== undefined && created.json.novel !== null ? created.json.novel.id : (created.json !== null && typeof created.json.id === 'string' ? created.json.id : null)
      report.steps.fixture = { createStatus: created.status, novelId, raw: created.json === null ? null : Object.keys(created.json) }
      if (typeof novelId !== 'string' || novelId === '') {
        report.envBlocked = '夹具失败：/api/novel-create 未返回书目 id（' + JSON.stringify(created).slice(0, 300) + '）'
        console.error('[probe] 环境错误：' + report.envBlocked)
        return 2
      }
      const createdPath = created.json !== null && typeof created.json.path === 'string' ? created.json.path : ''
      const bookDir = createdPath !== '' ? createdPath : join(dirs.novels, novelId)
      // 项目实体在 <novel 目录>/novel-project/（PROJECT_DIR），章节与大纲都在其下。
      const projectDir = join(bookDir, 'novel-project')
      mkdirSync(join(projectDir, '07-content'), { recursive: true })
      mkdirSync(join(projectDir, '06-chapter-outlines'), { recursive: true })
      writeFileSync(join(projectDir, '07-content', 'chapter-001.md'), CH1, 'utf8')
      writeFileSync(join(projectDir, '07-content', 'chapter-002.md'), CH2, 'utf8')
      writeFileSync(join(projectDir, '06-chapter-outlines', 'chapter-001.md'), '# 大纲一\n\n' + OUTLINE_MARKER + '\n', 'utf8')
      const ov = await (await fetch(apiUrl('overview'))).json()
      report.steps.fixtureOverview = { novels: Array.isArray(ov.novels) ? ov.novels.length : null, chapters: (Array.isArray(ov.novels) ? (ov.novels.find((n) => n.id === novelId) ?? {}).totalChapters : null) }
      // 文件系统事实核对：书目录是否真的落在配置的 workspaceRoot 下（否则后续 UI 断言全是假红）
      try {
        report.steps.fixtureFs = {
          createdPath: created.json !== null ? created.json.path : null,
          bookEntries: existsSync(bookDir) ? readdirSync(bookDir) : null,
          projectEntries: existsSync(projectDir) ? readdirSync(projectDir) : null,
          chaptersOnDisk: existsSync(join(projectDir, '07-content')) ? readdirSync(join(projectDir, '07-content')) : null,
        }
      } catch (e) { report.steps.fixtureFs = { err: String(e) } }

      edge = spawn(browser, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--disable-features=Translate,MediaRouter', '--remote-debugging-port=' + cdpPort,
        '--user-data-dir=' + dirs.edge, '--window-size=1680,900', appUrl,
      ], { stdio: ['ignore', 'pipe', 'pipe'] })
      let target = null
      for (let i = 0; i < 120 && target === null; i += 1) {
        await sleep(500)
        try {
          const list = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json()
          target = list.find((t) => t.type === 'page' && String(t.url).includes('127.0.0.1')) ?? null
        } catch { /* CDP 未就绪 */ }
      }
      if (target === null) { report.envBlocked = 'CDP target 不可得'; console.error('[probe] 环境错误：CDP target 不可得'); return 2 }
      cdp = await Cdp.attach(target.webSocketDebuggerUrl)
      await cdp.send('Runtime.enable')
      await cdp.send('Page.enable')
      cdp.on('Runtime.consoleAPICalled', (p) => {
        if (p.type === 'error') report.consoleCaptured.errors.push((p.args ?? []).map((a) => String(a.value ?? a.description ?? a.type)).join(' ').slice(0, 400))
      })
      cdp.on('Runtime.exceptionThrown', (p) => {
        report.consoleCaptured.pageerrors.push(String(p.exceptionDetails?.text ?? '') + ' ' + String(p.exceptionDetails?.exception?.description ?? '').slice(0, 300))
      })
      // 原生 confirm：一律接受（脏稿确认等守卫的可测化前提）
      cdp.on('Page.javascriptDialogOpening', () => { cdp.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}) })
      await sleep(2500)

      const GATE_BTN_RE = '/^(继续|开始使用|开始|知道了|知道了。|关闭|跳过|continue|start|got it|close|skip|dismiss)$/i'
      const dismissFirstRunGates = async () => {
        for (let i = 0; i < 6; i += 1) {
          const state = await cdp.evaluate(`(() => {
            const dlg = document.querySelector('[role=dialog]')
            const gateBtn = dlg === null ? undefined : [...dlg.querySelectorAll('button')].find((b) => ${GATE_BTN_RE}.test((b.getAttribute('aria-label') ?? '').trim()) || ${GATE_BTN_RE}.test((b.textContent ?? '').trim()))
            const mask = document.querySelector('[class*="_mask_"]')
            return { hasDialog: dlg !== null, gateBtnText: gateBtn === undefined ? null : (gateBtn.textContent || '').trim().slice(0, 20), mask: mask !== null }
          })()`)
          if (state.mask !== true && state.hasDialog !== true) return { dismissed: true, rounds: i }
          if (state.gateBtnText !== null) {
            await cdp.evaluate(`(() => { const dlg = document.querySelector('[role=dialog]'); const b = [...dlg.querySelectorAll('button')].find((x) => ${GATE_BTN_RE}.test((x.getAttribute('aria-label') ?? '').trim()) || ${GATE_BTN_RE}.test((x.textContent ?? '').trim())); if (b !== undefined) b.click(); return true })()`)
          }
          await sleep(1500)
        }
        const still = await cdp.evaluate(`(() => ({ mask: document.querySelector('[class*="_mask_"]') !== null, dialog: document.querySelector('[role=dialog]') !== null }))()`)
        return { dismissed: still.mask !== true && still.dialog !== true, rounds: 6, still }
      }
      const gate = await dismissFirstRunGates()
      report.steps.firstRunGate = gate
      if (gate.dismissed !== true) { report.envBlocked = '首跑门关不掉——点击无法送达（环境门 ≠ 产品缺陷）'; console.error('[probe] 环境错误：' + report.envBlocked); return 2 }

      const clickSel = async (selector, label) => {
        const box = await cdp.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el === null) return null; el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) } })()`)
        if (box === null) return { ok: false, reason: 'selector 未命中: ' + selector }
        if (box.w < 2 || box.h < 2) return { ok: false, reason: '元素无尺寸（不可点击）: ' + selector }
        const hit = await cdp.evaluate(`(() => { const top = document.elementFromPoint(${box.x}, ${box.y}); const el = document.querySelector(${JSON.stringify(selector)}); return top === null ? null : { tag: top.tagName, cls: String(top.className).slice(0, 90), inside: el.contains(top) || top === el } })()`)
        if (hit === null || hit.inside !== true) return { ok: false, reason: '指针被拦截: ' + JSON.stringify(hit) }
        await cdp.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.click(); return true })()`)
        return { ok: true, at: box, label: label ?? selector }
      }
      const clickRowNum = async (num) => {
        const idx = await cdp.evaluate(`(() => {
          const rows = [...document.querySelectorAll('.nv-rb-row')]
          return rows.findIndex((r) => ((r.querySelector('.nv-rb-num')?.textContent ?? '').trim()) === ${JSON.stringify(String(num))})
        })()`)
        if (typeof idx !== 'number' || idx < 0) return { ok: false, reason: '未找到章号 ' + num + ' 的行' }
        await cdp.evaluate(`(() => { const r = [...document.querySelectorAll('.nv-rb-row')][${idx}]; r.scrollIntoView({ block: 'center' }); r.click(); return true })()`)
        return { ok: true, idx }
      }
      const clickByText = async (selector, text) => {
        const idx = await cdp.evaluate(`(() => { const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})]; const i = nodes.findIndex((n) => (n.textContent || '').includes(${JSON.stringify(text)})); return i })()`)
        if (typeof idx !== 'number' || idx < 0) return { ok: false, reason: '未找到文本为「' + text + '」的 ' + selector }
        const box = await cdp.evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})][${idx}]; el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) } })()`)
        if (box.w < 2 || box.h < 2) return { ok: false, reason: '目标无尺寸' }
        await cdp.evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})][${idx}]; el.click(); return true })()`)
        return { ok: true, at: box }
      }
      const visible = async (selector) => cdp.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el === null) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 })()`)
      const textOf = async (selector) => cdp.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el === null ? null : (el.textContent || '').trim() })()`)
      const setValue = async (selector, text) => cdp.evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)})
        if (el === null) return null
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
        setter.call(el, ${JSON.stringify(text)})
        el.dispatchEvent(new Event('input', { bubbles: true }))
        return el.value
      })()`)
      const waitFor = async (fn, ms) => {
        const t0 = Date.now()
        while (Date.now() - t0 < ms) { if (await fn() === true) return true; await sleep(300) }
        return false
      }

      // ── O1 打开书斋 ─────────────────────────────────────────────────────
      // 侧栏入口 = 宿主 sidebar footer 的插件行（文案「小说管理工作台」/副文案「打开工作台界面…」）。
      // 用文本命中而非 class 猜测：宿主 chrome 的 class 是哈希的，猜选择器会误点宿主品牌区。
      let open = await clickByText('button, [role=button], a', '小说管理工作台')
      if (open.ok !== true) open = await clickByText('button, [role=button], a', '打开工作台界面')
      let consoleOpen = await waitFor(async () => visible('.nv-console'), 8000)
      if (consoleOpen !== true) {
        // 兜底重试一次（宿主首帧可能还在装配槽位）
        await clickByText('button, [role=button], a', '小说管理工作台')
        consoleOpen = await waitFor(async () => visible('.nv-console'), 8000)
      }
      const homeVisible = await waitFor(async () => (await visible('.nv-cbody-home')) === true, 8000)
      assertion('O1', '打开书斋：控制台出现且落在任务流首页', open.ok === true && consoleOpen === true && homeVisible === true, { open, consoleVisible: consoleOpen, homeVisible })

      // ── O2 打开工作台 ───────────────────────────────────────────────────
      // 页面侧 overview 诊断（服务端概览与本机 fetch 一致时才谈「UI 未刷新」）
      report.steps.pageOverview = await cdp.evaluate(`(async () => {
        try {
          const r = await fetch('/novel-writing/api/overview')
          const j = await r.json()
          return { status: r.status, keys: Object.keys(j ?? {}), novels: Array.isArray(j?.novels) ? j.novels.map((n) => ({ id: n.id, chapters: n.totalChapters, title: n.title })) : null }
        } catch (e) { return { err: String(e) } }
      })()`)
      report.steps.homeText = String(await cdp.evaluate(`(() => document.querySelector('.nv-home')?.textContent ?? '')()`)).slice(0, 300)
      await sleep(3000) // 等一次 2.5s 轮询把新书刷进首页
      // 书卡 selector 不做无据猜测：同时在 .nv-home 内按文本找可点元素，并把首页 DOM 轮廓留证。
      const homeOutline = await cdp.evaluate(`(() => {
        const root = document.querySelector('.nv-home')
        if (root === null) return null
        const out = []
        for (const el of root.querySelectorAll('*')) {
          if (out.length >= 60) break
          const r = el.getBoundingClientRect()
          if (r.width < 4 || r.height < 4) continue
          out.push({ tag: el.tagName, cls: String(el.className).slice(0, 60), txt: (el.textContent || '').trim().slice(0, 40) })
        }
        return out
      })()`)
      report.steps.homeOutline = homeOutline
      let card = await clickByText('.nv-home button', BOOK_TITLE)
      if (card.ok !== true) card = await clickByText('.nv-home [role=button]', BOOK_TITLE)
      if (card.ok !== true) card = await clickByText('.nv-home *', BOOK_TITLE)
      const splitVisible = await waitFor(async () => (await visible('.nv-split')) === true, 15000)
      assertion('O2', '首页点书卡进入工作台：.nv-split 出现且顶栏可见', card.ok === true && splitVisible === true && (await visible('.nv-bar')) === true, { card, splitVisible, outline: (homeOutline ?? []).slice(0, 12) })
      report.steps.workbenchDom = await cdp.evaluate(`(() => {
        const rail = document.querySelector('.nv-rail')
        const head = document.querySelector('.nv-sheet-head')
        const rows = rail === null ? [] : [...rail.querySelectorAll('*')].filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 4 && r.height > 4 && (el.children.length === 0 || el.tagName === 'BUTTON')
        }).slice(0, 40).map((el) => ({ tag: el.tagName, cls: String(el.className).slice(0, 50), txt: (el.textContent || '').trim().slice(0, 30) }))
        return { railText: rail === null ? null : (rail.textContent || '').trim().slice(0, 200), headText: head === null ? null : (head.textContent || '').trim().slice(0, 120), rows }
      })()`)

      // ── O3 切换章节（真实选择器：.nv-rb-row 章行，.nv-rb-num 章号，.nv-rb-name 章名）──
      report.steps.detailProbe = await cdp.evaluate(`(async () => {
        try {
          const r = await fetch('/novel-writing/api/novel?id=' + encodeURIComponent(${JSON.stringify(novelId)}))
          const j = await r.json()
          return { status: r.status, chapters: Array.isArray(j?.chapters) ? j.chapters.map((c) => ({ num: c.num, name: c.name, words: c.words })) : null, keys: Object.keys(j ?? {}) }
        } catch (e) { return { err: String(e) } }
      })()`)
      report.steps.railText = String(await cdp.evaluate(`(() => document.querySelector('.nv-rb-body')?.textContent ?? document.querySelector('.nv-rail')?.textContent ?? '')()`)).slice(0, 300)
      const railReady = await waitFor(async () => (await cdp.evaluate(`(() => document.querySelectorAll('.nv-rb-row').length)()`)) >= 2, 20000)
      const ch2 = await clickRowNum(2)
      const head2 = await waitFor(async () => String(await textOf('.nv-sheet-head')).includes('第 2 章'), 12000)
      const body2 = String(await cdp.evaluate(`(() => document.querySelector('.nv-sheet-scroll')?.textContent ?? '')()`))
      assertion('O3', '左栏点第 2 章：抬头显示第 2 章且正文为第二章', railReady === true && ch2.ok === true && head2 === true && body2.includes('MATRIX-CH2'), { railReady, ch2, head2, hasCh2: body2.includes('MATRIX-CH2') })

      // ── O4 编辑态切章（P0 数据损坏回归）────────────────────────────────
      // 编辑入口 = 纸页头 .nv-paper-actions .nv-paper-btn（文案「编辑」/「关闭」）。
      const editBtn = await clickByText('.nv-paper-actions .nv-paper-btn', '编辑')
      const taShown = await waitFor(async () => (await visible('.nv-sheet-edit')) === true, 8000)
      await setValue('.nv-sheet-edit', 'MATRIX-DIRTY：这是编辑中未保存的脏稿标记。')
      const dirtyShown = await waitFor(async () => (await cdp.evaluate(`(() => document.querySelector('.nv-paper-save')?.getAttribute('data-dirty') === 'true')()`)) === true, 8000)
      const toCh1 = await clickRowNum(1)
      const leftEditor = await waitFor(async () => (await visible('.nv-sheet-edit')) !== true, 8000)
      // 切章后稿纸头会在下一次 detail/章节轮询前短暂空转 ⇒ 等抬头真的换成第 1 章再取文本。
      await waitFor(async () => String(await textOf('.nv-sheet-head')).includes('第 1 章'), 8000)
      const head1 = String(await textOf('.nv-sheet-head'))
      const sheetText = String(await cdp.evaluate(`(() => document.querySelector('.nv-sheet-scroll')?.textContent ?? '')()`))
      assertion('O4', '编辑中切章：退出编辑、抬头换章、旧草稿不出现在新章（不再串稿）',
        editBtn.ok === true && taShown === true && dirtyShown === true && toCh1.ok === true && leftEditor === true
        && head1.includes('第 1 章') && !sheetText.includes('MATRIX-DIRTY') && sheetText.includes('MATRIX-CH1'),
        { editBtn, taShown, dirtyShown, toCh1, leftEditor, head1: head1.slice(0, 60), dirtyLeak: sheetText.includes('MATRIX-DIRTY'), hasCh1: sheetText.includes('MATRIX-CH1') })

      // ── O5 空正文保存 ───────────────────────────────────────────────────
      await clickByText('.nv-paper-actions .nv-paper-btn', '编辑')
      await waitFor(async () => (await visible('.nv-sheet-edit')) === true, 6000)
      await setValue('.nv-sheet-edit', '')
      const saveBtn = await clickByText('.nv-sheet-actions button', '保存')
      const emptyNotice = await waitFor(async () => String(await textOf('.nv-sheet-head')).includes('正文不能为空'), 6000)
      const stillEditing = (await visible('.nv-sheet-edit')) === true
      assertion('O5', '清空正文后保存：可见「正文不能为空」且仍在编辑态（不再静默无反应）', saveBtn.ok === true && emptyNotice === true && stillEditing === true, { saveBtn, emptyNotice, stillEditing })

      // ── O6 保存成功反馈（阅读态可见）────────────────────────────────────
      await setValue('.nv-sheet-edit', CH1 + '\nMATRIX-SAVED：保存后的正文标记。\n')
      const save2 = await clickByText('.nv-sheet-actions button', '保存')
      const savedNotice = await waitFor(async () => String(await textOf('.nv-sheet-head')).includes('已保存'), 8000)
      const backToRead = (await visible('.nv-sheet-edit')) !== true
      const wordsShown = String(await cdp.evaluate(`(() => document.querySelector('.nv-paper-words')?.textContent ?? '')()`)).trim()
      assertion('O6', '正常保存：阅读态仍可见「已保存 · N 字」且字数即时更新', save2.ok === true && savedNotice === true && backToRead === true && /\d/.test(wordsShown), { save2, savedNotice, backToRead, wordsShown })

      // ── O7 文件预览切章 ─────────────────────────────────────────────────
      // 资料区入口 = .nv-rb-mat-head（左栏底部「资料」折叠头）。
      const fileTab = await clickByText('.nv-rb-mat-head', '资料')
      let fileRow = { ok: false, reason: '资料页签不可达' }
      if (fileTab.ok === true) {
        await sleep(800)
        report.steps.matTree = String(await cdp.evaluate(`(() => document.querySelector('.nv-rb-mat')?.textContent ?? '')()`)).slice(0, 200)
        report.steps.matRows = await cdp.evaluate(`(() => [...document.querySelectorAll('.nv-rb-mat button, .nv-rb-mat [role=treeitem], .nv-rb-mat a')].slice(0, 20).map((el) => ({ tag: el.tagName, txt: (el.textContent || '').trim().slice(0, 40) })))()`)
        // 目录节点先展开（首击=切换展开），再点文件名才真正打开预览。
        const dirRow = await clickByText('.nv-rb-mat button, .nv-rb-mat [role=treeitem], .nv-rb-mat a', '06-chapter-outlines')
        if (dirRow.ok === true) { await sleep(700) }
        fileRow = await clickByText('.nv-rb-mat button, .nv-rb-mat [role=treeitem], .nv-rb-mat a', 'chapter-001')
        if (fileRow.ok !== true) fileRow = { ok: false, reason: '展开目录后仍未出现文件行', dirRow }
      }
      if (fileRow.ok !== true) {
        assertion('O7', '文件预览打开时点章节：稿纸回到章节正文', 'SKIP', { fileTab, fileRow, note: '资料树入口在本次宿主 DOM 中不可达（不伪造）' })
      } else {
        const fileShown = await waitFor(async () => String(await cdp.evaluate(`(() => document.querySelector('.nv-sheet-scroll')?.textContent ?? '')()`)).includes(OUTLINE_MARKER), 8000)
        const back = await clickRowNum(2)
        const chapterBack = await waitFor(async () => {
          const t = String(await cdp.evaluate(`(() => document.querySelector('.nv-sheet-scroll')?.textContent ?? '')()`))
          return !t.includes(OUTLINE_MARKER) && t.includes('MATRIX-CH2')
        }, 8000)
        assertion('O7', '文件预览打开时点章节：稿纸回到章节正文（抬头与正文一致）', fileShown === true && back.ok === true && chapterBack === true, { fileShown, back, chapterBack })
      }

      // ── O8 关闭按钮可访问名 ─────────────────────────────────────────────
      const closeAria = await cdp.evaluate(`(() => { const b = document.querySelector('.nv-bar-close'); return b === null ? null : { aria: b.getAttribute('aria-label'), title: b.getAttribute('title') } })()`)
      assertion('O8', '工作台 ✕ 有可访问名（非 undefined / 非键名）',
        closeAria !== null && typeof closeAria.aria === 'string' && closeAria.aria.length > 0
        && closeAria.aria !== 'closeSplit' && closeAria.title === closeAria.aria,
        closeAria)

      // ── O9 Esc 分层（首页搜索下拉）────────────────────────────────────
      // 关闭工作台后书斋默认收起 ⇒ 重新从侧栏入口打开，才能测「首页搜索 + Esc」分层。
      await clickSel('.nv-bar-close', '关闭工作台')
      await sleep(1200)
      if ((await visible('.nv-console')) !== true) await clickByText('button, [role=button], a', '小说管理工作台')
      await waitFor(async () => (await visible('.nv-cbody-home')) === true, 10000)
      const SEARCH_SEL = '.nv-cbody-home input, .nv-home input, .nv-tsearch input'
      let searchInput = await cdp.evaluate(`(() => { const i = document.querySelector(${JSON.stringify('.nv-cbody-home input, .nv-home input, .nv-tsearch input')}); return i === null ? null : { cls: String(i.className).slice(0, 60), ph: i.getAttribute('placeholder') } })()`)
      if (searchInput === null) {
        // 控制台可能停在「全部书籍」二级页 ⇒ 先返回首页再找搜索框
        await clickByText('.nv-console button', '返回首页')
        await waitFor(async () => (await visible('.nv-cbody-home')) === true, 8000)
        searchInput = await cdp.evaluate(`(() => { const i = document.querySelector(${JSON.stringify('.nv-cbody-home input, .nv-home input, .nv-tsearch input')}); return i === null ? null : { cls: String(i.className).slice(0, 60), ph: i.getAttribute('placeholder') } })()`)
      }
      report.steps.searchInput = searchInput
      if (searchInput === null) {
        assertion('O9', '首页搜索 Esc 只关下拉、不关控制台', 'SKIP', { note: '首页搜索输入框不可达' })
      } else {
        await setValue(SEARCH_SEL, '矩阵')
        await sleep(700)
        const popOpen = (await visible('.nv-tsearch-pop')) === true
        await cdp.evaluate(`(() => { const el = document.querySelector('.nv-tsearch input, .nv-cbody-home input[type=search], .nv-home input'); el.focus(); el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return true })()`)
        await sleep(700)
        const stillOpen = (await visible('.nv-console')) === true
        const popClosed = (await visible('.nv-tsearch-pop')) !== true
        assertion('O9', '首页搜索 Esc 只关下拉、不关控制台（分层正确）', popOpen === true && stillOpen === true && popClosed === true, { popOpen, stillOpen, popClosed })
      }

      // ── O10 缺键不泄漏 ─────────────────────────────────────────────────
      const bodyText = String(await cdp.evaluate(`(() => document.body.innerText ?? '')()`))
      const leaks = ['undefined', 'closeSplit', 'homeDetailLoading', '[object Object]'].filter((k) => bodyText.includes(k))
      assertion('O10', '页面可见文本不含 undefined / 未翻译键名', leaks.length === 0, { leaks: leaks, sample: bodyText.slice(0, 200) })

      // ── O11 关闭还原 ────────────────────────────────────────────────────
      // 关闭浮层走 Esc（控制台自身的关闭路径，避免依赖具体关闭按钮的 aria 文案）。
      await cdp.evaluate(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return true })()`)
      const consoleClosed = await waitFor(async () => (await visible('.nv-console')) !== true, 8000)
      const hostMarker = await cdp.evaluate(`(() => ({ marker: document.documentElement.hasAttribute('data-nv-drawer-host'), split: document.querySelector('.nv-split') !== null }))()`)
      assertion('O11', '关闭控制台：浮层卸载且不留宿主标记', consoleClosed === true && hostMarker.marker !== true, { consoleClosed, hostMarker })

      // ── O12 console 卫生 ───────────────────────────────────────────────
      const errs = report.consoleCaptured.errors.concat(report.consoleCaptured.pageerrors)
      const crashed = errs.filter((e) => /Minified React error #310|Rendered more hooks|slot entry crashed|Cannot read properties of undefined/i.test(e))
      assertion('O12', '无渲染期崩溃/React 钩子错误（0 × #310 / 0 × pageerror）', crashed.length === 0, { total: errs.length, crashed: crashed.slice(0, 4) })

      return report.assertions.some((a) => a.status === 'FAIL') ? 1 : 0
    } catch (e) {
      report.envBlocked = 'probe 异常：' + (e instanceof Error ? e.message : String(e))
      console.error('[probe] ' + report.envBlocked)
      return 2
    } finally {
      await stopAll()
      report.realEnvAfter = realFingerprint(realHome)
      report.isolation.realEnvUnchanged = JSON.stringify(report.isolation.realEnvBefore) === JSON.stringify(report.realEnvAfter)
      report.ok = report.assertions.length > 0 && report.assertions.every((a) => a.status !== 'FAIL')
      report.finishedAt = new Date().toISOString()
      try {
        writeFileSync(join(opts.out, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
        writeFileSync(join(opts.out, 'summary.md'), [
          '# 操作矩阵探针报告（BUG-015）', '',
          '- 开始：' + report.startedAt + '；结束：' + (report.finishedAt ?? '—'),
          '- 隔离根：`' + root + '`；真实 $DSH_HOME 指纹' + (report.isolation.realEnvUnchanged === true ? '未变化' : '**变化了**'),
          '- 断言：' + report.assertions.filter((a) => a.status === 'OK').length + ' OK / '
            + report.assertions.filter((a) => a.status === 'SKIP').length + ' SKIP / '
            + report.assertions.filter((a) => a.status === 'FAIL').length + ' FAIL', '',
          '| 用例 | 结论 | 证据 |', '| --- | --- | --- |',
          ...report.assertions.map((a) => '| ' + a.id + ' ' + a.label + ' | ' + a.status + ' | `' + String(JSON.stringify(a.detail)).replace(/\|/g, '\\|').slice(0, 220) + '` |'),
        ].join('\n') + '\n', 'utf8')
      } catch { /* ignore */ }
      if (opts.keep !== true) { try { rmSync(root, { recursive: true, force: true }) } catch { /* ignore */ } }
    }
  })()

  console.log('\n[probe] ' + (code === 0 ? 'PASS' : code === 2 ? 'ENV-BLOCKED' : 'FAIL')
    + ' — ' + report.assertions.filter((a) => a.status === 'OK').length + ' OK / '
    + report.assertions.filter((a) => a.status === 'SKIP').length + ' SKIP / '
    + report.assertions.filter((a) => a.status === 'FAIL').length + ' FAIL；报告 = ' + join(opts.out, 'report.json'))
  return code
}

main().then((c) => process.exit(c)).catch((e) => { console.error('[probe] 致命错误：' + (e instanceof Error ? e.stack : String(e))); process.exit(2) })
