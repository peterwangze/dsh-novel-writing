#!/usr/bin/env node
/**
 * probe-paper-render.mjs — 稿纸渲染异常复现探针（BUG-016）
 *
 * 背景：用户 2026-11-10 截图（真机 2560×1528 窗口）——工作台打开「第 1 章 / 38 章」时：
 *   · 稿纸只剩一条窄带，正文（1/469 页）几乎完全空白，只在页底露出「1 / 469」；
 *   · 左栏章节列表只显示 2 行半就被裁断；
 *   · 顶栏右侧按钮被窗口右缘裁掉（「编辑」右半边消失、✕ 之外还有溢出）。
 * 本探针用**用户真实章节文件的内容规模**（真实 novel-001 的 chapter-001.md，约 2431 字 / 141 行）
 * 在隔离实例里复现，并给出可判定的几何读数，而不是靠肉眼判断。
 *
 * 用例（全部以「可量化的期望」判定）：
 *   P1 稿纸高度       .nv-sheet 的 clientHeight ≥ 360px（约 6 行正文），且 < 容器高的 92%（留页底）
 *   P2 正文可读高     .nv-sheet-scroll 的 clientHeight ≥ 240px（≥ 8 行 × 行高 30px）
 *   P3 正文真的渲染了  .nv-content 内有 ≥ 10 个 <p>，且 .nv-content 的 scrollHeight > 200
 *   P4 无横向溢出     .nv-sheet / .nv-content / .nv-main 的 scrollWidth ≤ clientWidth + 1
 *   P5 左栏列表高度   .nv-rb-list clientHeight ≥ 240px（至少 7 行 32px 可点）
 *   P6 顶栏按钮完整   .nv-bar 的 scrollWidth ≤ clientWidth + 1；✕/编辑 按钮右缘 ≤ .nv-split 右缘
 *   P7 页码组件       .nv-sheet-foot 存在时其 rect 必须落在 .nv-sheet 内（不得跑到纸外）
 *
 * 用法：node scripts/probe-paper-render.mjs [--out <dir>] [--port 3083] [--dsh <cli>] [--chapter <md>] [--keep]
 * 退出码：0 = 全绿；1 = 有 FAIL；2 = 环境不可用。
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_OUT = join(REPO_ROOT, '.scratch-render', 'report')
const PROFILE_NAME = 'nvpaperrender'
const DESKTOP_CLI = 'D:\\app\\dsh\\resources\\runtime\\cli\\bin\\dsh.cmd'
const BOOK_TITLE = '稿纸渲染验证书'
const REAL_CHAPTER = 'D:\\AI\\writing\\novel-001\\novel-project\\07-content\\chapter-001.md'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (t) => createHash('sha256').update(t).digest('hex')

function parseArgs(argv) {
  const opts = { out: DEFAULT_OUT, keep: false, help: false, dsh: null, port: 3083, chapter: REAL_CHAPTER, width: 2560, height: 1528, splitH: 0, fakePopupHeader: false }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--out') opts.out = argv[++i]
    else if (a === '--keep') opts.keep = true
    else if (a === '--dsh') opts.dsh = String(argv[++i] ?? '')
    else if (a === '--port') opts.port = Number(argv[++i])
    else if (a === '--chapter') opts.chapter = String(argv[++i] ?? '')
    else if (a === '--size') { const p = String(argv[++i] ?? '').split('x'); opts.width = Number(p[0]); opts.height = Number(p[1]) }
    else if (a === '--split-h') opts.splitH = Number(argv[++i])
    else if (a === '--fake-popup-header') opts.fakePopupHeader = true
    else if (a === '--help' || a === '-h') opts.help = true
    else { console.error('用法错误：未知参数 ' + a); process.exit(2) }
  }
  if (!Number.isInteger(opts.port)) { console.error('用法错误：--port 需为整数'); process.exit(2) }
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
  if (opts.help) { console.log('用法：node scripts/probe-paper-render.mjs [--out <dir>] [--port 3083] [--dsh <cli>] [--chapter <md>] [--size WxH] [--keep]'); return 0 }
  const hostCli = resolveHostCli(opts.dsh)
  if (hostCli === null) { console.error('[probe] 环境错误：宿主 CLI 不可达'); return 2 }
  const browser = findBrowser()
  if (browser === null) { console.error('[probe] 环境错误：未找到 Chromium 内核浏览器'); return 2 }
  if (!existsSync(opts.chapter)) { console.error('[probe] 环境错误：章节样本不存在 ' + opts.chapter); return 2 }
  const chapterText = readFileSync(opts.chapter, 'utf8')

  let appPort = opts.port
  if (!(await portFree(appPort))) {
    appPort += 1
    if (!(await portFree(appPort))) { console.error('[probe] 环境错误：端口被占用'); return 2 }
  }
  const cdpPort = await freePort()
  const realHome = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? '', '.dsh')
  const realBefore = realFingerprint(realHome)

  const root = mkdtempSync(join(tmpdir(), 'nvpaper-'))
  const dirs = { root, home: join(root, 'dsh-home'), userprofile: join(root, 'userprofile'), appdata: join(root, 'appdata'), localappdata: join(root, 'localappdata'), edge: join(root, 'edge-profile'), tmp: join(root, 'tmp') }
  for (const d of Object.values(dirs)) if (d !== root) mkdirSync(d, { recursive: true })
  const containment = {}
  for (const k of ['home', 'userprofile', 'appdata', 'localappdata', 'edge', 'tmp']) containment[k] = dirs[k].startsWith(root + sep)
  if (Object.values(containment).some((v) => v !== true)) { console.error('[probe] 隔离校验失败'); rmSync(root, { recursive: true, force: true }); return 2 }
  mkdirSync(opts.out, { recursive: true })

  console.log('[probe] 稿纸渲染探针（真实章节内容 ' + Buffer.byteLength(chapterText) + ' bytes；窗口 ' + opts.width + '×' + opts.height + '）')
  const childEnv = { ...process.env, DSH_HOME: dirs.home, USERPROFILE: dirs.userprofile, HOME: dirs.userprofile, APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata, TEMP: dirs.tmp, TMP: dirs.tmp }

  const report = {
    tool: 'probe-paper-render', task: 'BUG-016', startedAt: new Date().toISOString(),
    isolation: { root, hostCli, browser, port: appPort, containment, window: { w: opts.width, h: opts.height }, chapterBytes: Buffer.byteLength(chapterText) },
    steps: {}, assertions: [], consoleCaptured: { errors: [], pageerrors: [] }, envBlocked: null, realEnvAfter: null, ok: false,
  }
  const assertion = (id, label, status, detail) => {
    const st = status === true ? 'OK' : status === false ? 'FAIL' : String(status)
    report.assertions.push({ id, label, status: st, detail: detail ?? null })
    console.log('  ' + (st === 'OK' ? 'OK  ' : st === 'SKIP' ? 'SKIP' : 'FAIL') + ' ' + id + '：' + label + (st === 'OK' ? '' : ' :: ' + JSON.stringify(detail).slice(0, 420)))
    return st === 'OK'
  }

  let boot = null, edge = null, cdp = null
  const bootOut = []
  const stopAll = async () => {
    try { if (cdp !== null) cdp.ws.close() } catch { /* ignore */ }
    try { if (edge !== null && edge.exitCode === null) edge.kill() } catch { /* ignore */ }
    killTree(boot)
    await sleep(800)
  }

  const code = await (async () => {
    try {
      if (prepareIsolatedProfile(root, dirs.home) !== true) { report.envBlocked = 'profile 装配失败'; return 2 }
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
      if (appUrl === null) { report.envBlocked = '实例未启动：' + bootOut.join(' | ').slice(0, 600); return 2 }
      const token = (/token=([A-Za-z0-9_-]+)/.exec(appUrl) ?? [])[1] ?? ''
      const origin = new URL(appUrl).origin
      let serving = false
      for (let i = 0; i < 120 && serving !== true; i += 1) {
        try { const res = await fetch(appUrl, { redirect: 'manual' }); if (res.status !== undefined) serving = true } catch { await sleep(250) }
      }
      if (serving !== true) { report.envBlocked = 'HTTP 未就绪'; return 2 }

      const apiUrl = (name) => origin + '/novel-writing/api/' + name + '?token=' + encodeURIComponent(token)
      const postJson = async (name, body) => {
        const res = await fetch(apiUrl(name), { method: 'POST', headers: { 'content-type': 'application/json', origin, referer: origin + '/' }, body: JSON.stringify(body) })
        return { status: res.status, json: await res.json().catch(() => null) }
      }
      const created = await postJson('novel-create', { name: BOOK_TITLE, title: BOOK_TITLE })
      const novelId = created.json !== null && created.json !== null && typeof created.json.id === 'string' ? created.json.id : null
      if (novelId === null) { report.envBlocked = '建书失败：' + JSON.stringify(created).slice(0, 300); return 2 }
      const projectDir = join(created.json.path, 'novel-project')
      mkdirSync(join(projectDir, '07-content'), { recursive: true })
      // 铺 12 章：首章用真实章节内容，其余短章——同时复现「左栏 38 行列表」的高度压力
      for (let n = 1; n <= 12; n += 1) {
        const name = 'chapter-' + String(n).padStart(3, '0') + '.md'
        const body = n === 1 ? chapterText : ('# 第 ' + n + ' 章 样本\n\n第 ' + n + ' 章的正文占位，用于验证左栏目录高度。\n')
        writeFileSync(join(projectDir, '07-content', name), body, 'utf8')
      }
      report.steps.fixture = { novelId, projectDir, chapters: 12, firstChapterBytes: Buffer.byteLength(chapterText) }

      edge = spawn(browser, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--disable-features=Translate,MediaRouter', '--remote-debugging-port=' + cdpPort,
        '--user-data-dir=' + dirs.edge, '--window-size=' + opts.width + ',' + opts.height, appUrl,
      ], { stdio: ['ignore', 'pipe', 'pipe'] })
      let target = null
      for (let i = 0; i < 120 && target === null; i += 1) {
        await sleep(500)
        try {
          const list = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json()
          target = list.find((t) => t.type === 'page' && String(t.url).includes('127.0.0.1')) ?? null
        } catch { /* CDP 未就绪 */ }
      }
      if (target === null) { report.envBlocked = 'CDP target 不可得'; return 2 }
      cdp = await Cdp.attach(target.webSocketDebuggerUrl)
      await cdp.send('Runtime.enable')
      await cdp.send('Page.enable')
      // 真实窗口尺寸（headless 的 --window-size 不一定等于 layout viewport）
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: opts.width, height: opts.height, deviceScaleFactor: 1, mobile: false })
      cdp.on('Runtime.exceptionThrown', (p) => report.consoleCaptured.pageerrors.push(String(p.exceptionDetails?.text ?? '').slice(0, 300)))
      cdp.on('Page.javascriptDialogOpening', () => { cdp.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}) })
      await sleep(3000)

      // 首跑门：只处理「宿主引导对话框 / 登录遮罩」，找不到可关按钮时如实记录现场（不无限重试）。
      const GATE_RE = '/^(继续|开始使用|开始|知道了|知道了。|关闭|跳过|continue|start|got it|close|skip|dismiss)$/i'
      const dismissGates = async () => {
        let last = null
        for (let i = 0; i < 6; i += 1) {
          const st = await cdp.evaluate(`(() => {
            const dlg = document.querySelector('[role=dialog]')
            const b = dlg === null ? undefined : [...dlg.querySelectorAll('button')].find((x) => ${GATE_RE}.test((x.getAttribute('aria-label') ?? '').trim()) || ${GATE_RE}.test((x.textContent ?? '').trim()))
            if (b !== undefined) b.click()
            return { mask: document.querySelector('[class*="_mask_"]') !== null, dlg: dlg !== null, btn: b === undefined ? null : (b.textContent || '').trim().slice(0, 16) }
          })()`)
          last = st
          if (st.mask !== true && st.dlg !== true) return { ok: true, rounds: i }
          await sleep(1200)
        }
        return { ok: false, last }
      }
      const gate = await dismissGates()
      report.steps.firstRunGate = gate
      if (gate.ok !== true) { report.envBlocked = '首跑门关不掉：' + JSON.stringify(gate); return 2 }

      const clickByText = async (selector, text) => {
        const idx = await cdp.evaluate(`(() => { const n = [...document.querySelectorAll(${JSON.stringify(selector)})]; return n.findIndex((x) => (x.textContent || '').includes(${JSON.stringify(text)})) })()`)
        if (typeof idx !== 'number' || idx < 0) return false
        await cdp.evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})][${idx}]; el.scrollIntoView({ block: 'center' }); el.click(); return true })()`)
        return true
      }
      const visible = async (sel) => cdp.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (el === null) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 })()`)
      const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn() === true) return true; await sleep(300) } return false }

      // 复刻宿主「向用户提问」弹窗：文档里出现一个位置靠下的 <header>（宿主弹窗标题栏）。
      // 真机症状 = 工作台被顶到这个 header 的下缘，稿纸只剩一条窄带。
      if (opts.fakePopupHeader === true) {
        await cdp.evaluate(`(() => {
          const host = document.createElement('div')
          host.id = 'nv-fake-popup'
          host.style.cssText = 'position:fixed;left:360px;top:470px;width:520px;height:120px;z-index:50'
          host.innerHTML = '<header style="height:44px;display:block">向用户提问</header><div style="height:76px"></div>'
          document.body.appendChild(host)
          return true
        })()`)
        await sleep(400)
      }

      // 打开书斋 → 首页书卡 → 工作台
      await clickByText('button, [role=button], a', '小说管理工作台')
      await waitFor(async () => (await visible('.nv-cbody-home')) === true, 12000)
      // 等首页轮询把新书带进来（2.5s 周期），再点书卡——否则点的是空态页
      await waitFor(async () => (await cdp.evaluate(`(() => document.body.innerText.includes(${JSON.stringify(BOOK_TITLE)}))()`)) === true, 15000)
      await sleep(800)
      const cardClicked = await cdp.evaluate(`(() => {
        const nodes = [...document.querySelectorAll('.nv-home button, .nv-home [role=button], .nv-home a')]
        const hit = nodes.find((n) => (n.textContent || '').includes(${JSON.stringify(BOOK_TITLE)}))
          ?? [...document.querySelectorAll('.nv-home *')].find((n) => (n.textContent || '').trim() === ${JSON.stringify(BOOK_TITLE)})
        if (hit === undefined) return false
        hit.click()
        return true
      })()`)
      const splitVisible = await waitFor(async () => (await visible('.nv-split')) === true, 20000)
      report.steps.open = { cardClicked, splitVisible }
      if (splitVisible !== true) { report.envBlocked = '工作台未打开（前置失败）'; return 2 }
      // 可选：把工作台压到指定高度（复刻宿主只给工作台一小段 viewArea 的真机状态）
      if (Number.isFinite(opts.splitH) && opts.splitH > 0) {
        await cdp.evaluate(`(() => { const s = document.querySelector('.nv-split'); if (s === null) return false; s.style.height = ${opts.splitH} + 'px'; window.dispatchEvent(new Event('resize')); return true })()`)
        await sleep(1200)
      }
      // 等详情与章节正文到位（正文渲染后才谈几何）
      await waitFor(async () => (await cdp.evaluate(`(() => (document.querySelector('.nv-content')?.children.length ?? 0) >= 10)()`)), 20000)
      await sleep(1500)

      const geom = await cdp.evaluate(`(() => {
        const q = (s) => document.querySelector(s)
        const box = (el) => { if (el === null || el === undefined) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) } }
        const sheet = q('.nv-sheet')
        const scroll = q('.nv-sheet-scroll')
        const content = q('.nv-content')
        const list = q('.nv-rb-list')
        const bar = q('.nv-bar')
        const split = q('.nv-split')
        const foot = q('.nv-sheet-foot')
        const paperCol = q('.nv-paper-col')
        const railbar = q('.nv-railbar')
        return {
          split: box(split), bar: box(bar), barScroll: bar === null ? null : { sw: bar.scrollWidth, cw: bar.clientWidth },
          railbar: box(railbar), list: box(list), listScroll: list === null ? null : { sh: list.scrollHeight, ch: list.clientHeight },
          paperCol: box(paperCol), sheet: box(sheet), scroll: box(scroll),
          content: box(content), contentChildren: content === null ? 0 : content.children.length, contentParagraphs: content === null ? 0 : content.querySelectorAll('p').length,
          contentScroll: content === null ? null : { sh: content.scrollHeight, sw: content.scrollWidth },
          foot: box(foot),
          overflow: {
            sheetX: sheet === null ? null : sheet.scrollWidth - sheet.clientWidth,
            contentX: content === null ? null : content.scrollWidth - content.clientWidth,
            mainX: (() => { const m = q('.nv-main'); return m === null ? null : m.scrollWidth - m.clientWidth })(),
          },
          closeBtn: box(q('.nv-bar-close')), editBtn: box(q('.nv-paper-actions .nv-paper-btn')),
        }
      })()`)
      report.steps.geometry = geom

      const innerH = opts.height
      const sheetH = geom.sheet === null ? 0 : geom.sheet.h
      const scrollH = geom.scroll === null ? 0 : geom.scroll.h
      const listH = geom.list === null ? 0 : geom.list.h
      assertion('P1', '稿纸高度 ≥ 360px 且留出页底（< 容器 92%）', sheetH >= 360 && sheetH < innerH * 0.92, { sheetH, innerH })
      assertion('P2', '正文可读高 ≥ 240px（≥8 行）', scrollH >= 240, { scrollH })
      assertion('P3', '正文真的渲染（≥10 个 <p> 且 scrollHeight > 200）', geom.contentParagraphs >= 10 && geom.contentScroll !== null && geom.contentScroll.sh > 200, { paragraphs: geom.contentParagraphs, scenes: geom.contentChildren, contentScroll: geom.contentScroll })
      assertion('P4', '无横向溢出（sheet/content/main 均 ≤ clientWidth+1）',
        geom.overflow.sheetX !== null && geom.overflow.sheetX <= 1 && geom.overflow.contentX <= 1 && (geom.overflow.mainX === null || geom.overflow.mainX <= 1),
        geom.overflow)
      assertion('P5', '左栏章节列表高度 ≥ 240px（≥7 行可点）', listH >= 240, { listH, listScroll: geom.listScroll })
      assertion('P6', '顶栏无横向溢出且按钮右缘在容器内',
        geom.barScroll !== null && geom.barScroll.sw <= geom.barScroll.cw + 1
        && geom.closeBtn !== null && geom.split !== null && geom.closeBtn.right <= geom.split.right
        && geom.editBtn !== null && geom.editBtn.right <= geom.split.right,
        { barScroll: geom.barScroll, closeRight: geom.closeBtn === null ? null : geom.closeBtn.right, editRight: geom.editBtn === null ? null : geom.editBtn.right, splitRight: geom.split === null ? null : geom.split.right })
      assertion('P7', '页码组件在稿纸内（不得跑到纸外/重叠正文）',
        geom.foot === null || (geom.sheet !== null && geom.foot.bottom <= geom.sheet.bottom + 1 && geom.foot.right <= geom.sheet.right + 1),
        { foot: geom.foot, sheet: geom.sheet })

      // 诊断：宿主「提问弹窗」场景——文档里是否有靠下的 <header> 被 hostHeaderBottom 采信
      report.steps.headerScan = await cdp.evaluate(`(() => {
        const split = document.querySelector('.nv-split')
        const sr = split === null ? null : split.getBoundingClientRect()
        const out = []
        for (const h of [...document.querySelectorAll('header')]) {
          if (h.closest('.nv-split') !== null) continue
          const r = h.getBoundingClientRect()
          out.push({ text: (h.textContent || '').trim().slice(0, 40), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) })
        }
        return { splitTop: sr === null ? null : Math.round(sr.top), splitH: sr === null ? null : Math.round(sr.height), headers: out.slice(0, 12), count: out.length }
      })()`)
      // 现场截图：与用户截图同状态的可视证据（.scratch-render 下）
      try {
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
        const shotPath = join(opts.out, 'workbench.png')
        writeFileSync(shotPath, Buffer.from(shot.data, 'base64'))
        report.steps.screenshot = shotPath
      } catch (e) { report.steps.screenshot = 'failed: ' + String(e && e.message) }
      report.steps.pageerrors = report.consoleCaptured.pageerrors.slice(0, 5)
      return report.assertions.some((a) => a.status === 'FAIL') ? 1 : 0
    } catch (e) {
      report.envBlocked = 'probe 异常：' + (e instanceof Error ? e.message : String(e))
      console.error('[probe] ' + report.envBlocked)
      return 2
    } finally {
      await stopAll()
      report.realEnvAfter = realFingerprint(realHome)
      report.isolation.realEnvUnchanged = JSON.stringify(realBefore) === JSON.stringify(report.realEnvAfter)
      report.ok = report.assertions.length > 0 && report.assertions.every((a) => a.status !== 'FAIL')
      try { writeFileSync(join(opts.out, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8') } catch { /* ignore */ }
      if (opts.keep !== true) { try { rmSync(root, { recursive: true, force: true }) } catch { /* ignore */ } }
    }
  })()

  const ok = report.assertions.filter((a) => a.status === 'OK').length
  const bad = report.assertions.filter((a) => a.status === 'FAIL').length
  console.log('\n[probe] ' + (code === 0 ? 'PASS' : code === 2 ? 'ENV-BLOCKED' : 'FAIL') + ' — ' + ok + ' OK / ' + bad + ' FAIL；报告 = ' + join(opts.out, 'report.json'))
  return code
}

main().then((c) => process.exit(c)).catch((e) => { console.error('[probe] 致命错误：' + (e instanceof Error ? e.stack : String(e))); process.exit(2) })
