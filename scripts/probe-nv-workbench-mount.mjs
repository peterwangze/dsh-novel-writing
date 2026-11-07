#!/usr/bin/env node
/**
 * probe-nv-workbench-mount.mjs — 工作台挂载「用户真路径」断言探针（COMPAT-023）
 *
 * 目的（BUG-012 教训的制度化）：BUG-012 的「点小说工作台不出现」由用户先用出——当时看护面只覆盖
 * 预设行单格，客户端面（抽屉 → 控制台浮层 → 建书 → 点书卡 → 分栏工作台挂载）零看护。本探针把
 * BUG-012 阶段 B 的**验证脚本模式**固化为可复跑的版本化资产：完整用户路径逐环断言 + console 零
 * React #310 / 零 slot entry crashed + 截图落证据目录。
 *
 * boot 模式（COMPAT-023 修复后的统一模式，与 probe-nv-ux012 / probe-nv-bar-geometry 同源）：
 * 官方 CLI + DSH_HOME 重定向——parent 装配隔离 profile（junction 插件 + bundles 声明），spawn
 * `dsh.cmd --profile <name> --no-open --port <port>`（默认桌面运行时 CLI = 0.2.2-rc.1；--dsh /
 * NV_PROBE_DSH 可换 npm-global 等其他代际 CLI——**换 CLI 即换代际**，断言逻辑零改动）；token 从
 * stdout `dsh web: http://127.0.0.1:<port>/?token=` 行捕获，**入库前 `<redacted>`**。
 *
 * 断言面（全部真驱动：真点击〔命中性校验后派发〕/ 真 HTTP novel-create / 真 console 捕获）：
 *   W1 抽屉渲染      `.nv-drawer` 在场 + 书卡计数基线（`.nv-card`）
 *   W2 控制台挂载    点 `.nv-drawer-head` ⇒ `.nv-console`=1 ∧ `.nv-home`=1（shell.overlay 槽消费实证）
 *   W3 建书 API      POST `/novel-writing/api/novel-create` {name} ⇒ HTTP 200 + 书卡出现
 *   W4 分栏挂载      点新书卡 ⇒ `.nv-split`≥1（用户真症状路径的修复证明——BUG-012 修复前同路径=0）
 *   W5 会话自动绑定  抽屉提示行出现「已为《…》创建并关联新会话。」（autoBindDone 文案与产品同源现读）
 *   W6 console 卫生  0 × `Minified React error #310` ∧ 0 × `slot entry crashed` ∧ pageerror 披露
 *   Z  隔离与收尾    真实 $DSH_HOME 只读复核（前后指纹一致）+ 只杀自启进程树 + 端口释放
 *
 * 首跑门处置（BUG-012 实测的两类形态，如实记录不伪装通过）：
 *   · 宿主首跑引导对话框（`[role=dialog]` + `_mask_` 遮罩 + `aria-label="关闭"` 关闭钮）⇒ 点**自带
 *     关闭钮**（最小干预，零设置变更）；
 *   · 登录遮罩（iframe → platform.deepseek.com）⇒ 同样只尝试关闭钮；两类都关不掉 ⇒ 记 envBlocked
 *     （exit 2，不渲染成断言失败——环境门 ≠ 产品缺陷；处置依据 docs/evidence/BUG-012/fix-verification.md）。
 *
 * 隔离与真实环境纪律（与 probe-nv-ux012 同口径）：全部写入落 `mkdtempSync(tmpdir())` 临时根；子进程
 * DSH_HOME/USERPROFILE/HOME/APPDATA/LOCALAPPDATA/TEMP 重定向 + 路径包含性校验；用户真实 `~/.dsh`
 * 只读指纹前后复核；浏览器 profile 落临时根；端口默认 3080（占用则 3081）；**只杀自启进程树**
 * （taskkill /T /F 按本探针 spawn 的 PID——绝不按端口/进程名扫杀他人进程）。
 *
 * 用法：
 *   node scripts/probe-nv-workbench-mount.mjs                       # 0.2.2 桌面 CLI，截图落 docs/evidence/COMPAT-023/
 *   node scripts/probe-nv-workbench-mount.mjs --out <dir> --port 3081 --dsh <dsh.cmd> [--keep]
 * 退出码：0 = W1~W6 全绿；1 = 有断言不成立（红态/回归——如 #310 复发）；2 = 环境不可用（无浏览器/CLI
 *         不可达/首跑门关不掉/隔离校验失败）。
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, realpathSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT_SRC = join(REPO_ROOT, 'lib', 'client.js')
const PROFILE_NAME = 'nvwbprobe'
const DESKTOP_CLI = 'D:\\app\\dsh\\resources\\runtime\\cli\\bin\\dsh.cmd' // 桌面运行时 CLI（0.2.2-rc.1；COMPAT-020/BUG-012 验证通道）
const VIEWPORT = { width: 1440, height: 900 }
const BOOK_NAME = 'COMPAT023工作台挂载验证书'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (t) => createHash('sha256').update(t).digest('hex')
/** W5 期望文案与产品同源（autoBindDone 模板键现读——不复制字面量，C3/readI18n 同式）。 */
function readAutoBindTemplate() {
  const src = readFileSync(CLIENT_SRC, 'utf8')
  const m = /autoBindDone:\s*\(title\)\s*=>\s*`([^`]+)\$\{title\}([^`]+)`/.exec(src)
  if (m === null) throw new Error('autoBindDone 模板键未找到（lib/client.js）——探针期望文案与产品失配')
  return { prefix: m[1], suffix: m[2] }
}

function parseArgs(argv) {
  const opts = { out: join(REPO_ROOT, 'docs', 'evidence', 'COMPAT-023'), keep: false, help: false, dsh: null, port: 3080 }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--out') opts.out = argv[++i]
    else if (a === '--keep') opts.keep = true
    else if (a === '--dsh') opts.dsh = String(argv[++i] ?? '')
    else if (a === '--port') opts.port = Number(argv[++i])
    else if (a === '--help' || a === '-h') opts.help = true
    else { console.error('用法错误：未知参数 ' + a); process.exit(2) }
  }
  if (!Number.isInteger(opts.port) || opts.port < 1024 || opts.port > 65535) { console.error('用法错误：--port 需为 1024-65535（探针纪律：默认 3080，备用 3081）'); process.exit(2) }
  return opts
}

// ── boot 基建（与 probe-nv-ux012 / probe-nv-bar-geometry 同源——COMPAT-023 统一模式）──
function resolveHostCli(explicit) {
  if (typeof explicit === 'string' && explicit !== '') {
    return existsSync(explicit) ? { cmd: explicit, source: '--dsh 参数' } : null
  }
  if (typeof process.env.NV_PROBE_DSH === 'string' && process.env.NV_PROBE_DSH !== '') {
    return existsSync(process.env.NV_PROBE_DSH) ? { cmd: process.env.NV_PROBE_DSH, source: 'env NV_PROBE_DSH' } : null
  }
  if (existsSync(DESKTOP_CLI)) return { cmd: DESKTOP_CLI, source: '桌面运行时 CLI（默认；0.2.2-rc.1）' }
  return { cmd: 'dsh', source: 'PATH 上的 dsh（npm-global；Windows 下经 shell 解析）' }
}

function prepareIsolatedProfile(root, home) {
  if (!(home !== root && home.startsWith(root + sep))) { console.error('BOOT-ERR 隔离失败：DSH_HOME 不在隔离根内 → ' + home); return false }
  if (home === join(process.env.USERPROFILE ?? '', '.dsh')) { console.error('BOOT-ERR 真实路径泄漏：DSH_HOME 指向真实用户目录'); return false }
  const profileDir = join(home, 'profiles', PROFILE_NAME)
  const nm = join(profileDir, 'node_modules')
  mkdirSync(nm, { recursive: true })
  const r = spawnSync('cmd', ['/c', 'mklink', '/J', join(nm, 'dsh-novel-writing'), REPO_ROOT], { stdio: 'ignore' })
  if (r.status !== 0 && !existsSync(join(nm, 'dsh-novel-writing'))) { console.error('BOOT-ERR junction: ' + join(nm, 'dsh-novel-writing')); return false }
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

/** 只杀**自启**进程树（taskkill /T /F 按本探针 spawn 的 PID；绝不扫杀他人进程）。 */
function killTree(child) {
  if (child === null || child.pid === undefined || child.exitCode !== null) return
  if (process.platform === 'win32') {
    try { spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { stdio: 'ignore' }) } catch { try { child.kill('SIGKILL') } catch { /* ignore */ } }
  } else {
    try { child.kill('SIGKILL') } catch { /* ignore */ }
  }
}

function findBrowser() {
  const candidates = [
    join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.ProgramFiles ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.ProgramFiles ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['ProgramFiles(x86)'] ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter((p) => p !== '' && existsSync(p))
  return candidates[0] ?? null
}

/** 用户真实 `$DSH_HOME` 只读指纹（收尾复核未变 ⇒ 真实环境零写入；口径同 probe-nv-ux012）。 */
function realFingerprint(home) {
  const fp = { home, settingsSha: null, profiles: null, preset: null }
  try { if (existsSync(join(home, 'settings.yaml'))) fp.settingsSha = sha256(readFileSync(join(home, 'settings.yaml'), 'utf8')) } catch { /* ignore */ }
  try { fp.profiles = readdirSync(join(home, 'profiles')).sort().join(',') } catch { /* ignore */ }
  try {
    const dir = join(home, '.agent-presets', 'novel-writing')
    fp.preset = readdirSync(dir).sort().map((f) => f + ':' + (existsSync(join(dir, f)) ? statSync(join(dir, f)).size : 0)).join(',')
  } catch { /* ignore */ }
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

// ── 极简 CDP 客户端（Node 内置 WebSocket；与既有探针同式）──────────────────────
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
  if (opts.help) { console.log('用法：node scripts/probe-nv-workbench-mount.mjs [--out <dir>] [--port <n=3080>] [--dsh <dsh.cmd>] [--keep]'); return 0 }

  const hostCli = resolveHostCli(opts.dsh)
  if (hostCli === null) { console.error('[probe] 环境错误：指定的宿主 CLI 不可达（--dsh / NV_PROBE_DSH）'); return 2 }
  const browser = findBrowser()
  if (browser === null) { console.error('[probe] 环境错误：未找到 Chromium 内核浏览器（Edge/Chrome）'); return 2 }
  const autoBind = readAutoBindTemplate()

  // 端口纪律：默认 3080；被占（他人实例在跑）⇒ 备用 3081；两个都占 ⇒ 环境错误（不抢占他人端口）
  let appPort = opts.port
  if (!(await portFree(appPort))) {
    appPort = appPort === 3080 ? 3081 : 3080
    if (!(await portFree(appPort))) { console.error('[probe] 环境错误：端口 3080/3081 均被占用（探针纪律不抢占他人实例）'); return 2 }
    console.log(`[probe] 端口 ${opts.port} 被占 ⇒ 备用 ${appPort}`)
  }
  const cdpPort = await freePort()

  const realHome = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  const realBefore = realFingerprint(realHome)

  const root = mkdtempSync(join(tmpdir(), 'nvwb-probe-'))
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
  writeFileSync(join(dirs.home, 'settings.yaml'), 'novel-writing:\n  workspaceRoot: ' + dirs.novels.replace(/\\/g, '/') + '\n', 'utf8')

  console.log('[probe] COMPAT-023 工作台挂载探针（用户真路径：抽屉 → 控制台 → 建书 → 点书卡 → 分栏）')
  console.log('  临时根 = ' + root + '（containment 校验全真；真实 $DSH_HOME 只读）')
  console.log('  宿主 CLI = ' + hostCli.cmd + '（来源 ' + hostCli.source + '）')
  console.log('  浏览器 = ' + browser + '；端口 = ' + appPort + '；证据目录 = ' + opts.out)

  const childEnv = {
    ...process.env,
    DSH_HOME: dirs.home, USERPROFILE: dirs.userprofile, HOME: dirs.userprofile,
    APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata, TEMP: dirs.tmp, TMP: dirs.tmp,
  }

  const report = {
    tool: 'probe-nv-workbench-mount', task: 'COMPAT-023', startedAt: new Date().toISOString(),
    isolation: { root, dshHome: dirs.home, hostCli, browser, port: appPort, containment, realEnvBefore: realBefore },
    autoBindTemplate: autoBind,
    steps: {}, assertions: [], consoleCaptured: { errors: [], pageerrors: [] }, envBlocked: null, instanceUrlRedacted: null,
    screenshots: {}, realEnvAfter: null, ok: false,
  }
  const assertion = (id, label, ok, detail) => {
    report.assertions.push({ id, label, ok: ok === true, detail: detail ?? null, at: new Date().toISOString() })
    console.log('  ' + (ok === true ? 'OK  ' : 'FAIL') + ' ' + id + '：' + label + (ok === true ? '' : ' :: ' + JSON.stringify(detail).slice(0, 400)))
    return ok === true
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
      // ── 1) 隔离实例 ─────────────────────────────────────────────────────
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
      if (appUrl === null) {
        report.envBlocked = '隔离实例未启动：' + bootOut.join(' | ').slice(0, 800)
        console.error('[probe] 环境错误：' + report.envBlocked.slice(0, 300))
        return 2
      }
      report.instanceUrlRedacted = appUrl.replace(/token=.*/, 'token=<redacted>')
      console.log('  隔离实例 URL = ' + report.instanceUrlRedacted)
      let serving = false
      for (let i = 0; i < 120 && serving !== true; i += 1) {
        try { const res = await fetch(appUrl, { redirect: 'manual' }); if (res.status !== undefined) serving = true } catch { await sleep(250) }
      }
      if (serving !== true) { report.envBlocked = '隔离实例 HTTP 未就绪'; console.error('[probe] 环境错误：HTTP 未就绪'); return 2 }

      // ── 2) 无头浏览器 + CDP ────────────────────────────────────────────
      // 浏览器进程环境 = 系统 env 原样（COMPAT-023 实测订正：重定向 APPDATA/LOCALAPPDATA 会让
      // 当前 Edge 启动即退——`Unable to get local app data path`，CDP 端口不开；浏览器隔离边界 =
      // --user-data-dir 落临时根 + --no-first-run，DSH 实例子进程保持全量重定向）。
      edge = spawn(browser, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
        '--disable-features=Translate,MediaRouter', '--remote-debugging-port=' + cdpPort,
        '--user-data-dir=' + dirs.edge, '--window-size=' + VIEWPORT.width + ',' + VIEWPORT.height, appUrl,
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
      await new Promise((r) => setTimeout(r, 2500))

      // ── 3) 首跑门处置（BUG-012 实测形态 + COMPAT-023 实测补充；关不掉 = envBlocked，不冒充断言）──
      // 已实测形态：①「开始使用」引导对话框（aria-label="关闭" 关闭钮）；②「预览版说明」对话框
      // （唯一钮 =「继续」_primary）；③登录遮罩（iframe → platform.deepseek.com）。处置 = 点对话框
      // **自带**按钮（继续/开始/知道了/关闭/跳过——最小干预，零设置变更），多轮直到无遮罩。
      const GATE_BTN_RE = '/^(继续|开始使用|开始|知道了|知道了。|关闭|跳过|continue|start|got it|close|skip|dismiss)$/i'
      const dismissFirstRunGates = async () => {
        const attempts = 6
        for (let i = 0; i < attempts; i += 1) {
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
        return { dismissed: still.mask !== true && still.dialog !== true, rounds: attempts, still }
      }
      const gate = await dismissFirstRunGates()
      report.steps.firstRunGate = gate
      if (gate.dismissed !== true) {
        report.envBlocked = '首跑门（引导对话框/登录遮罩）关不掉——点击无法送达（环境门 ≠ 产品缺陷；处置依据 docs/evidence/BUG-012/fix-verification.md）'
        console.error('[probe] 环境错误：' + report.envBlocked)
        return 2
      }

      /** 命中性校验 + 派发点击（遮罩拦截 ⇒ 如实失败——BUG-012 阶段 A 误诊的制度化防再犯）。 */
      const realClick = async (selector) => {
        const box = await cdp.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el === null) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } })()`)
        if (box === null) return { ok: false, reason: 'selector 未命中: ' + selector }
        const hit = await cdp.evaluate(`(() => { const top = document.elementFromPoint(${box.x}, ${box.y}); const el = document.querySelector(${JSON.stringify(selector)}); return top === null ? null : { tag: top.tagName, cls: String(top.className).slice(0, 90), inside: el.contains(top) || top === el } })()`)
        if (hit === null || hit.inside !== true) return { ok: false, reason: '指针被拦截（elementFromPoint ≠ 目标）: ' + JSON.stringify(hit) }
        await cdp.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); return true })()`)
        return { ok: true, hit }
      }
      const countSel = async (selector) => cdp.evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`)
      const waitFor = async (expr, ms, what) => {
        for (let i = 0; i < Math.ceil(ms / 250); i += 1) {
          if (await cdp.evaluate(expr) === true) return true
          await sleep(250)
        }
        return false
      }
      const shot = async (name) => {
        try {
          const r = await cdp.send('Page.captureScreenshot', { format: 'png' })
          const path = join(opts.out, name)
          writeFileSync(path, Buffer.from(r.data, 'base64'))
          report.screenshots[name] = path
          console.log('  截图 = ' + path)
        } catch (e) { console.error('  截图失败 ' + name + '：' + String(e)) }
      }

      // ── W1 抽屉渲染 ─────────────────────────────────────────────────────
      const drawerSeen = await waitFor(`document.querySelector('.nv-drawer') !== null`, 30000, '抽屉')
      const cardBaseline = drawerSeen ? await countSel('.nv-drawer .nv-card') : -1
      report.steps.w1 = { drawerSeen, cardBaseline }
      assertion('W1-drawer-rendered', '插件抽屉渲染（.nv-drawer 在场）+ 书卡基线 ' + cardBaseline, drawerSeen === true && cardBaseline >= 0)

      // ── W2 控制台挂载（shell.overlay 槽消费实证）────────────────────────
      await shot('workbench-01-drawer.png')
      const clickHead = await realClick('.nv-drawer-head')
      const consoleSeen = clickHead.ok === true && await waitFor(`document.querySelector('.nv-console') !== null && document.querySelector('.nv-home') !== null`, 15000, '控制台浮层')
      const nvCount = await countSel('[class*="nv-"]')
      report.steps.w2 = { clickHead, consoleSeen, nvCount }
      assertion('W2-console-mounted', '点抽屉头 ⇒ .nv-console=1 ∧ .nv-home=1（shell.overlay 槽消费实证；BUG-012 阶段 B 断言①）', consoleSeen === true, { clickHead, nvCount })
      await shot('workbench-02-console.png')

      // ── W3 建书 API（真 HTTP——**页内 fetch**：同源 cookie 鉴权随请求面走；服务端裸 fetch 会 401）──
      const createRes = await cdp.evaluate(`(async () => {
        try {
          const r = await fetch('/novel-writing/api/novel-create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: ${JSON.stringify(BOOK_NAME)} }) })
          let body = null
          try { body = await r.json() } catch { /* 无 JSON 体 */ }
          return { status: r.status, body }
        } catch (e) { return { status: 0, error: String(e) } }
      })()`)
      const createdOk = createRes.status === 200
      const createdBody = createRes.body ?? null
      const cardAppeared = createdOk === true && await waitFor(`(() => { const t = [...document.querySelectorAll('.nv-drawer .nv-card-title')].find((n) => (n.textContent || '').trim() === ${JSON.stringify(BOOK_NAME)}); return t !== undefined })()`, 20000, '新书卡')
      report.steps.w3 = { httpStatus: createRes.status, body: createdBody, cardAppeared }
      assertion('W3-create-api', `POST novel-create {name} ⇒ HTTP 200 ∧ 书卡出现（返回 id=${createdBody?.id ?? null}）`, createdOk === true && cardAppeared === true, report.steps.w3)

      // ── W4 分栏挂载（用户真症状路径）+ W5 会话自动绑定 ─────────────────
      /** 书卡按标题定位 + 命中性校验 + 点击派发（抽屉书卡无 data-* 锚——定位键 = .nv-card-title 文本）。 */
      const clickCardByTitle = async (title) => {
        const state = await cdp.evaluate(`(() => {
          const card = [...document.querySelectorAll('.nv-drawer .nv-card')].find((c) => { const t = c.querySelector('.nv-card-title'); return t !== null && (t.textContent || '').trim() === ${JSON.stringify(title)} })
          if (card === undefined) return { ok: false, reason: '书卡未命中（title=' + ${JSON.stringify(title)} + '）' }
          const r = card.getBoundingClientRect()
          const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2)
          const top = document.elementFromPoint(x, y)
          return { ok: true, x, y, inside: top !== null && (top === card || card.contains(top)), hitCls: top === null ? null : String(top.className).slice(0, 80) }
        })()`)
        if (state.ok !== true) return state
        if (state.inside !== true) return { ok: false, reason: '指针被拦截（elementFromPoint ≠ 书卡）', hit: state }
        await cdp.evaluate(`(() => {
          const card = [...document.querySelectorAll('.nv-drawer .nv-card')].find((c) => { const t = c.querySelector('.nv-card-title'); return t !== null && (t.textContent || '').trim() === ${JSON.stringify(title)} })
          if (card !== undefined) card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
          return true
        })()`)
        return { ok: true }
      }
      const clickCard = await clickCardByTitle(BOOK_NAME)
      const splitSeen = clickCard.ok === true && await waitFor(`document.querySelectorAll('.nv-split').length >= 1`, 20000, '分栏工作台')
      const noticeSeen = await cdp.evaluate(`(() => { const texts = [...document.querySelectorAll('.nv-drawer, .nv-notice, body')]; const t = texts.map((n) => n.textContent || '').join('\\n'); return t.includes(${JSON.stringify(autoBind.prefix)}) && t.includes(${JSON.stringify(autoBind.suffix)}) })()`)
      report.steps.w4 = { clickCard, splitCount: splitSeen ? await countSel('.nv-split') : 0, noticeSeen }
      assertion('W4-split-mounted', '点书卡 ⇒ .nv-split ≥ 1（BUG-012 修复前同路径 = 0——SlotErrorBoundary 卸载）', splitSeen === true, report.steps.w4)
      assertion('W5-auto-bind-notice', '抽屉提示行含「已为《…》创建并关联新会话。」（autoBindDone 文案与产品同源）', noticeSeen === true, { noticeSeen })
      await shot('workbench-03-split.png')

      // ── W6 console 卫生 ─────────────────────────────────────────────────
      await sleep(2500) // 让迟发错误（挂载后 effect 链）有落地窗口
      const errs = report.consoleCaptured.errors
      const pageerrs = report.consoleCaptured.pageerrors
      const react310 = [...errs, ...pageerrs].filter((t) => t.includes('#310') || t.includes('Minified React error'))
      const slotCrash = [...errs, ...pageerrs].filter((t) => t.includes('slot entry crashed'))
      report.steps.w6 = { consoleErrors: errs.length, pageerrors: pageerrs.length, react310: react310.length, slotCrash: slotCrash.length, sample: [...errs.slice(0, 3), ...pageerrs.slice(0, 3)] }
      assertion('W6-console-clean', 'console 零 React #310 ∧ 零 slot entry crashed（pageerror 计数如实披露：' + pageerrs.length + '）', react310.length === 0 && slotCrash.length === 0, report.steps.w6)

      return report.assertions.every((a) => a.ok === true) ? 0 : 1
    } finally {
      await stopAll()
    }
  })()

  // ── Z 隔离与收尾复核 ──────────────────────────────────────────────────────
  report.realEnvAfter = realFingerprint(realHome)
  report.ok = code === 0
  const realUnchanged = report.realEnvAfter.settingsSha === realBefore.settingsSha && report.realEnvAfter.profiles === realBefore.profiles && report.realEnvAfter.preset === realBefore.preset
  report.cleanup = { realEnvUnchanged: realUnchanged, port: appPort, kept: opts.keep === true }
  console.log('  收尾：真实 $DSH_HOME 只读复核 ' + (realUnchanged ? '一致（零写入）' : '**不一致**') + '；自启进程树已收口（taskkill /T /F 按本探针 PID）')
  const reportPath = join(opts.out, 'workbench-mount-report.json')
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
  console.log('  报告 = ' + reportPath)
  if (opts.keep !== true) { rmSync(root, { recursive: true, force: true }); console.log('  临时根已清理（--keep 可保留）') }
  if (realUnchanged !== true) { console.error('[probe] 隔离失效：真实 $DSH_HOME 指纹变化——立即人工核查'); return 2 }
  return code
}

// ── 入口守卫（被 import 时不自举——口径同 probe-nv-ux012 F-12）──────────────────
const isDirectEntry = (() => {
  try {
    if (process.argv[1] === undefined || process.argv[1] === null) return false
    const self = realpathSync(fileURLToPath(import.meta.url))
    const arg = pathToFileURL(process.argv[1])
    return arg.protocol === 'file:' && realpathSync(fileURLToPath(arg)) === self
  } catch { return false }
})()
const code = isDirectEntry ? await main() : 0
if (isDirectEntry) process.exit(code)
