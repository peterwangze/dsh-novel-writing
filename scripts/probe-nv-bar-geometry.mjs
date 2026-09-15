#!/usr/bin/env node
/**
 * probe-nv-bar-geometry.mjs — UX-060 创作台标题栏告警「几何可读性」探针（隔离实例 + 无头浏览器 + 矩形测量）
 *
 * 目的：以**真实渲染**（隔离 DSH 实例 + 无头 Edge/Chromium + CDP）测量创作台（`.nv-split`）标题栏告警
 * 元素的几何事实——告警矩形与 `.nv-bar-title` / `.nv-bar-banner` / `.nv-bar-ctl` 的交集、告警是否
 * 位于标题栏之内、正文是否被截断（scrollWidth/clientWidth）、以及是否覆盖标题栏下方首屏内容
 * （章节行 `.nv-chrow` / 当前阶段行 `.nv-wf-row[data-cur=true]`）。两个视口：1078×593（用户报障视口）
 * 与 1400×900。
 *
 * 两条场景（皆走真实 UI 代码路径，不构造 DOM）：
 *   S1 长 err 告警：点「继续工作流」→ `promptLaunch` → `sessions.prompt` RPC。探针在 **HTTP 层**对该
 *      RPC 做受控故障注入（CDP Fetch 域伪造服务端 `server-response` 失败报文；error.message 取**本实例
 *      实测的宿主原文**——隔离实例无 DSH 凭据时 llm-deepseek 的 MISSING_CREDENTIAL 报错），使真实
 *      err 分支 `setBarNotice({kind:'err', text: promptFailPrefix + <服务端 error.message> + promptFailHint})`
 *      触发——即用户截图那条告警的同一条路径。
 *   S2 短 ok 告警：点标题栏 ⟳（恢复默认布局）→ `setBarNotice({kind:'ok', text: t('resetLayoutDone')})`。
 *
 * 隔离与真实环境纪律（三选一之第一项：环境变量重定向至临时目录）：
 *   · 全部写入落在 `mkdtempSync(tmpdir())` 临时根内；DSH 实例子进程的 `DSH_HOME` / `USERPROFILE` /
 *     `HOME` / `APPDATA` / `LOCALAPPDATA` 全部重定向到临时根，并做**路径包含性校验**（口径照
 *     `test/fixtures/host-surfaces/ci-mock-face.mjs` L113-114 的 prefix+sep 判定；同族先例 RISK-006/EVD-098）；
 *   · 用户真实 `$DSH_HOME`（`~/.dsh`）**只读**：开跑前记录指纹（settings.yaml sha256 + profiles/web 目录
 *     条目 + `.agent-presets/novel-writing` 指纹），收尾复核**逐项一致**（任何差异即失败）；
 *   · 宿主平面（`@deepseek-ai` 闭包）以只读 junction 接入隔离 profile，不改其目录；
 *   · 端口随机（先 bind(0) 取空闲端口），不干扰用户正在运行的 DSH 实例与浏览器；
 *   · 浏览器 profile（`--user-data-dir`）落在临时根内。
 *
 * 用法：
 *   node scripts/probe-nv-bar-geometry.mjs [--out <dir>] [--json-out <path>] [--keep] [--no-browser-head]
 * 退出码：0 = 全部验收判据成立（绿态）；1 = 有判据不成立（红态/回归）；2 = 环境不可用（无浏览器/无宿主平面等）。
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, realpathSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const CLIENT_SRC = join(REPO_ROOT, 'lib', 'client.js')
const PROFILE_NAME = 'ux060probe'
const VIEWPORTS = [{ name: '1078x593', width: 1078, height: 593 }, { name: '1400x900', width: 1400, height: 900 }]
/** 参考视口（非判据，仅观测）：宽栏下短提示应回到既有标题栏 chip 形态（零变化实证）。 */
const WIDE_VIEWPORT = { name: '1800x900', width: 1800, height: 900 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (text) => createHash('sha256').update(text).digest('hex')

/** 注入用的服务端错误原文：隔离实例实测的宿主报错（无凭据时 llm-deepseek 的原文，含 provider route 名）。 */
const INJECTED_SERVER_ERROR = 'llm-deepseek: MISSING_CREDENTIAL: no API key for provider route "deepseek-official": store DEEPSEEK_API_KEY through the credentials service (the web Models page writes it), or export DEEPSEEK_API_KEY in the launching environment'

function parseArgs(argv) {
  const opts = { out: join(tmpdir(), 'ux060-probe'), jsonOut: null, keep: false, help: false, skipBrowser: false }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--out') opts.out = argv[++i]
    else if (a === '--json-out') opts.jsonOut = argv[++i]
    else if (a === '--keep') opts.keep = true
    else if (a === '--no-browser-head') opts.skipBrowser = true
    else if (a === '--help' || a === '-h') opts.help = true
    else { console.error('用法错误：未知参数 ' + a); process.exit(2) }
  }
  return opts
}

/** i18n 文案从 lib/client.js 现读（单一事实源；不复制字面量——探针与产品源码同一份字符串）。 */
function readI18n() {
  const src = readFileSync(CLIENT_SRC, 'utf8')
  const pick = (key, lang) => {
    const re = new RegExp('(?:^|\\n)\\s*' + key + ":\\s*'((?:[^'\\\\]|\\\\.)*)'", 'm')
    const m = re.exec(src)
    if (m === null) throw new Error('i18n key not found: ' + key)
    return m[1].replace(/\\'/g, "'")
  }
  return {
    promptFailPrefix: pick('promptFailPrefix'),
    promptFailHint: pick('promptFailHint'),
    resetLayoutDone: pick('resetLayoutDone'),
    savedDefault: pick('savedDefault'),
  }
}

function resolvePlane() {
  const home = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  for (const [pd, source] of [[join(home, 'profiles', 'web'), 'DSH_HOME'], [join(home, 'profiles'), 'DSH_HOME']]) {
    if (!existsSync(pd)) continue
    try {
      const resolved = createRequire(join(pd, 'index.js')).resolve('@deepseek-ai/dsh/package.json')
      return { nodeModules: dirname(dirname(resolved)), dshPackageJson: resolved, source }
    } catch { /* 不是平面，试下一个候选 */ }
  }
  return null
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

/** 用户真实 `$DSH_HOME` 只读指纹（收尾逐项复核未变 ⇒ 真实环境零写入）。 */
function realFingerprint(home) {
  const fp = { home, settingsSha: null, profiles: null, preset: null }
  try { if (existsSync(join(home, 'settings.yaml'))) fp.settingsSha = sha256(readFileSync(join(home, 'settings.yaml'), 'utf8')) } catch { /* ignore */ }
  try { fp.profiles = readdirSync(join(home, 'profiles')).sort().join(',') } catch { /* ignore */ }
  try {
    const dir = join(home, '.agent-presets', 'novel-writing')
    const files = readdirSync(dir).sort().map((f) => f + ':' + (existsSync(join(dir, f)) ? statSync(join(dir, f)).size : 0)).join(',')
    fp.preset = files
  } catch { /* ignore */ }
  return fp
}

const freePort = () => new Promise((resolve, reject) => {
  const srv = createServer()
  srv.on('error', reject)
  srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)) })
})

// ── 子进程模式：隔离实例启动（`--boot <root> <dshHome> <planeNodeModules> <port>`）──
async function bootChild(root, home, planeNodeModules, port) {
  process.env.DSH_HOME = home
  const profileDir = join(home, 'profiles', PROFILE_NAME)
  const nm = join(profileDir, 'node_modules')
  mkdirSync(nm, { recursive: true })
  const link = (target, path) => {
    const r = spawnSync('cmd', ['/c', 'mklink', '/J', path, target], { stdio: 'ignore' })
    if (r.status !== 0 && !existsSync(path)) { console.error('BOOT-ERR junction: ' + path); process.exit(2) }
  }
  link(planeNodeModules, join(nm, '@deepseek-ai'))
  link(REPO_ROOT, join(nm, 'dsh-novel-writing'))
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
    name: 'dsh-profile-' + PROFILE_NAME,
    private: true,
    dependencies: { 'dsh-novel-writing': 'link:' + REPO_ROOT },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-novel-writing'], patchReload: 'live' } },
  }, null, 2) + '\n')
  writeFileSync(join(profileDir, 'cordis.yml'), '[]\n')
  writeFileSync(join(profileDir, 'cordis.patch.yml'), '[]\n')

  const dshPackageJson = join(planeNodeModules, 'dsh', 'package.json')
  const appBoot = await import(pathToFileURL(join(planeNodeModules, 'dsh-app-boot', 'lib', 'index.js')).href)
  const lib = join(dirname(dshPackageJson), 'lib')
  const shim = readdirSync(lib).filter((f) => /^profile-boot-.*\.js$/.test(f)).find((f) => readFileSync(join(lib, f), 'utf8').includes('export { runProfile }'))
  if (shim === undefined) { console.error('BOOT-ERR 宿主 launcher shim 缺失（宿主布局变更需同步探针）'); process.exit(2) }
  const runProfile = (await import(pathToFileURL(join(lib, shim)).href)).runProfile
  const booted = await runProfile({
    environment: appBoot.loadLayeredEnv('dsh'),
    profile: PROFILE_NAME,
    fromDefaultProfile: undefined,
    patchFiles: [],
    args: ['--no-open', '--port', String(port)],
  })
  console.log('BOOT-READY pid=' + process.pid + (booted.ctx !== undefined ? ' ctx=ok' : ''))
  const stop = () => { try { booted.shutdown.shutdown(0).then(() => process.exit(0), () => process.exit(0)) } catch { process.exit(0) } }
  process.on('SIGTERM', stop)
  process.on('message', (m) => { if (m === 'stop') stop() })
  setInterval(() => {}, 1 << 30)
}

if (process.argv[2] === '--boot') {
  await bootChild(process.argv[3], process.argv[4], process.argv[5], Number(process.argv[6]))
  await new Promise(() => {}) // 常驻：实例由父进程（或 SIGTERM/message stop）收尾
}

// ── 极简 CDP 客户端（Node 内置 WebSocket；无第三方依赖）───────────────────
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

/** 页面内测量脚本（唯一测量口径）：返回告警元素 + 标题栏簇 + 内容锚点的矩形与文本可读性读数。 */
const MEASURE_JS = `(() => {
  const rectOf = (e) => { if (e === null || e === undefined) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2), right: +b.right.toFixed(2), bottom: +b.bottom.toFixed(2) } }
  const bar = document.querySelector('.nv-bar')
  const note = document.querySelector('.nv-notice') ?? document.querySelector('.nv-bar-note')
  const out = {
    bar: rectOf(bar),
    title: rectOf(document.querySelector('.nv-bar-title')),
    banner: rectOf(document.querySelector('.nv-bar-banner')),
    bannerHidden: (document.querySelector('.nv-bar-banner') || { getAttribute: () => null }).getAttribute('data-hidden'),
    ctls: [...document.querySelectorAll('.nv-bar-ctl')].map(rectOf),
    notice: rectOf(note),
    noticeClass: note === null ? null : note.className,
    noticeKind: note === null ? null : (note.getAttribute('data-kind') || null),
    noticeText: note === null ? null : note.textContent,
    noticeTitleAttr: note === null ? null : (note.getAttribute('title') || ''),
    noticeOverflow: note === null ? null : { scrollWidth: note.scrollWidth, clientWidth: note.clientWidth, scrollHeight: note.scrollHeight, clientHeight: note.clientHeight, textOverflow: getComputedStyle(note).textOverflow, whiteSpace: getComputedStyle(note).whiteSpace, position: getComputedStyle(note).position },
    noticeForm: note === null ? null : (note.getAttribute('data-form') || null),
    // 单行性度量：文本节点自身高度 / 行高（多行块必然 > 1 行）
    noticeTextLine: (() => {
      if (note === null) return null
      const span = note.querySelector('.nv-notice-text') ?? note
      const cs = getComputedStyle(span)
      const lh = cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight)
      return { height: Math.round(span.getBoundingClientRect().height), lineHeight: lh, lines: lh === null ? null : Math.round(span.getBoundingClientRect().height / lh) }
    })(),
    noticeInsideBar: note === null || bar === null ? null : bar.contains(note),
    main: rectOf(document.querySelector('.nv-main')),
    chrow: rectOf(document.querySelector('.nv-chrow')),
    wfrow: rectOf(document.querySelector('.nv-wf-row[data-cur=true]')),
    viewport: { w: window.innerWidth, h: window.innerHeight },
  }
  return out
})()`

const intersectArea = (a, b) => {
  if (a === null || b === null) return null
  const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x))
  const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y))
  return +(w * h).toFixed(2)
}

function main() {
  return (async () => {
    const opts = parseArgs(process.argv.slice(2))
    if (opts.help) { console.log('用法：node scripts/probe-nv-bar-geometry.mjs [--out <dir>] [--json-out <path>] [--keep]'); process.exit(0) }

    const plane = resolvePlane()
    if (plane === null) { console.error('[probe] 环境错误：宿主平面不可达（未找到可解析 @deepseek-ai/dsh 的 profile 平面）'); process.exit(2) }
    const browser = opts.skipBrowser ? null : findBrowser()
    if (!opts.skipBrowser && browser === null) { console.error('[probe] 环境错误：未找到 Chromium 内核浏览器（Edge/Chrome）'); process.exit(2) }
    const i18n = readI18n()
    const realHome = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
    const realBefore = realFingerprint(realHome)

    const root = mkdtempSync(join(tmpdir(), 'ux060-probe-'))
    const dirs = {
      root,
      home: join(root, 'dsh-home'),
      userprofile: join(root, 'userprofile'),
      appdata: join(root, 'appdata'),
      localappdata: join(root, 'localappdata'),
      edge: join(root, 'edge-profile'),
      tmp: join(root, 'tmp'),
    }
    for (const d of Object.values(dirs)) mkdirSync(d, { recursive: true })
    // 隔离包含性校验（口径照 ci-mock-face.mjs L113-114：prefix + sep，且不等于根）
    const containment = {}
    for (const key of ['home', 'userprofile', 'appdata', 'localappdata', 'edge', 'tmp']) {
      const p = dirs[key]
      containment[key] = p !== root && (p === root || p.startsWith(root + sep))
    }
    if (Object.values(containment).some((v) => v !== true)) {
      console.error('[probe] 隔离校验失败：重定向路径越出临时根 ' + JSON.stringify(containment))
      rmSync(root, { recursive: true, force: true })
      process.exit(2)
    }
    mkdirSync(opts.out, { recursive: true })
    console.log('[probe] 隔离环境（环境变量重定向至临时目录；真实 $DSH_HOME 只读）')
    console.log('  临时根 = ' + root + '（containment 校验全真）')
    console.log('  宿主平面（只读 junction）= ' + plane.nodeModules + '（来源 ' + plane.source + '）')
    console.log('  浏览器 = ' + String(browser))

    // 小说工作区（隔离根内）：一本已到「质量审查」的书，统计与用户报障截图同量级
    const novelsRoot = join(root, 'novels')
    const proj = join(novelsRoot, 'fayi-xiantu', 'novel-project')
    mkdirSync(join(proj, '07-content'), { recursive: true })
    writeFileSync(join(proj, 'workflow-state.json'), JSON.stringify({
      current_stage: 'quality_review',
      completed_stages: ['work_type_selection', 'platform_research', 'genre_selection', 'novel_confirmation', 'creation_planning', 'outline_writing', 'chapter_outline', 'content_generation'],
      project_info: { title: '法医仙途', work_type: '长篇小说', platform: '起点中文网', genre: '都市修真', target_words: 2000000 },
      files: {},
      guardrails: { continuity_mode: 'strict', latest_passed_chapter: 38, latest_ai_path: 'B', release_allowed: false, monetization_allowed: false, latest_drift_score: null },
      statistics: { total_chapters: 38, total_words: 89232, last_updated: new Date().toISOString() },
    }, null, 2))
    writeFileSync(join(proj, '07-content', 'chapter-001.md'), '# 第1章 无名骸骨\n\n深夜送骨。老马将无名骸骨送至解剖室。\n', 'utf8')
    writeFileSync(join(dirs.home, 'settings.yaml'), 'novel-writing:\n  workspaceRoot: ' + novelsRoot.replace(/\\/g, '/') + '\n', 'utf8')

    const appPort = await freePort()
    const cdpPort = await freePort()
    const childEnv = {
      ...process.env,
      DSH_HOME: dirs.home, USERPROFILE: dirs.userprofile, HOME: dirs.userprofile,
      APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata, TEMP: dirs.tmp, TMP: dirs.tmp,
    }
    const report = {
      tool: 'probe-nv-bar-geometry', task: 'UX-060', startedAt: new Date().toISOString(),
      isolation: { root, dshHome: dirs.home, plane: plane.nodeModules, browser, containment, realEnvBefore: realBefore },
      injected: { channel: '/api/session/prompt', message: INJECTED_SERVER_ERROR }, i18n,
      scenarios: {}, reference: {}, verdicts: [], realEnvAfter: null, ok: false,
    }

    let boot = null, edge = null, cdp = null
    const bootOut = []
    const stopAll = async () => {
      try { if (cdp !== null) cdp.ws.close() } catch { /* ignore */ }
      try { if (edge !== null && edge.exitCode === null) edge.kill() } catch { /* ignore */ }
      try { if (boot !== null && boot.exitCode === null) boot.kill() } catch { /* ignore */ }
      await sleep(600)
    }
    try {
      // ── 1) 隔离实例 ────────────────────────────────────────────────────
      boot = spawn(process.execPath, [fileURLToPath(import.meta.url), '--boot', root, dirs.home, plane.nodeModules, String(appPort)], { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] })
      let appUrl = null
      const onBootData = (buf) => {
        const text = String(buf)
        bootOut.push(text.trim())
        const m = /(http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+)/.exec(text)
        if (m !== null && appUrl === null) appUrl = m[1]
      }
      boot.stdout.on('data', onBootData)
      boot.stderr.on('data', (b) => bootOut.push('ERR ' + String(b).trim()))
      for (let i = 0; i < 160 && appUrl === null; i += 1) { if (boot.exitCode !== null) break; await sleep(250) }
      if (appUrl === null) { console.error('[probe] 环境错误：隔离实例未启动。boot 输出：' + bootOut.join(' | ').slice(0, 800)); await stopAll(); process.exit(2) }
      console.log('  隔离实例 URL = ' + appUrl.replace(/token=.*/, 'token=***'))
      report.instanceUrlRedacted = appUrl.replace(/token=.*/, 'token=***')
      // 等 HTTP 真正可服务（端口 bind 与 launcher 打印 URL 之间存在毫秒级竞态——先跑满再给浏览器）
      let serving = false
      let lastErr = null
      for (let i = 0; i < 120 && serving !== true; i += 1) {
        try { const res = await fetch(appUrl, { redirect: 'manual' }); if (res.status !== undefined) { serving = true; lastErr = 'HTTP ' + res.status } } catch (e) { lastErr = String(e); await sleep(250) }
      }
      if (serving !== true) {
        console.error('[probe] 环境错误：隔离实例 HTTP 未就绪（' + String(lastErr) + '；boot 退出码=' + String(boot.exitCode) + '）')
        console.error('[probe] boot 输出：' + bootOut.join(' | ').slice(0, 600))
        await stopAll(); process.exit(2)
      }
      console.log('  隔离实例 HTTP 就绪（' + String(lastErr) + '）')

      // ── 2) 无头浏览器 + CDP ────────────────────────────────────────────
      if (browser !== null) {
        const edgeLog = []
        // 浏览器环境：只重定向 profile 相关目录（`--user-data-dir` 落在临时根内）；TEMP/TMP 保持系统值
        // （Chromium 自身 temp 目录依赖系统 TEMP，重定向会让启动路径变脆——隔离要求针对 DSH 实例）。
        const browserEnv = { ...process.env, USERPROFILE: dirs.userprofile, HOME: dirs.userprofile, APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata }
        edge = spawn(browser, [
          '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
          '--disable-features=Translate,MediaRouter', '--remote-debugging-port=' + cdpPort,
          '--user-data-dir=' + dirs.edge, '--window-size=1400,900', appUrl,
        ], { env: browserEnv, stdio: ['ignore', 'pipe', 'pipe'] })
        edge.stderr.on('data', (b) => edgeLog.push('ERR ' + String(b).trim()))
        edge.stdout.on('data', (b) => edgeLog.push('OUT ' + String(b).trim()))
        let target = null
        const deadline = Date.now() + 60000
        while (Date.now() < deadline && target === null && edge.exitCode === null) {
          await sleep(300)
          try {
            const list = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json()
            target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl !== undefined) ?? null
          } catch { /* retry */ }
        }
        if (target === null) {
          // 显式建目标（部分启动时序下 about:blank 目标未自动出现）
          try {
            const created = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/new?' + encodeURIComponent(appUrl), { method: 'PUT' })).json()
            if (created.webSocketDebuggerUrl !== undefined) target = created
          } catch { /* keep null */ }
        }
        if (target === null) {
          console.error('[probe] 环境错误：无头浏览器未暴露调试目标（exitCode=' + String(edge.exitCode) + '）')
          console.error('[probe] 浏览器输出：' + edgeLog.join(' | ').slice(0, 600))
          await stopAll(); process.exit(2)
        }
        cdp = await Cdp.attach(target.webSocketDebuggerUrl)
        await cdp.send('Page.enable')
        await cdp.send('Runtime.enable')
        await cdp.send('Network.enable')
        const pageLog = []
        cdp.on('Runtime.consoleAPICalled', (p) => pageLog.push('console.' + p.type + ' ' + (p.args ?? []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 300)))
        cdp.on('Runtime.exceptionThrown', (p) => pageLog.push('exception ' + String(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? '').slice(0, 300)))
        cdp.on('Log.entryAdded', (p) => pageLog.push('log.' + String(p.entry?.level) + ' ' + String(p.entry?.text ?? '').slice(0, 300)))

        // 受控故障注入（HTTP 响应层；不改页面代码）：拦截 prompt RPC 的**真实响应**，把 result 改写为
        // 服务端失败报文（保留真实 rpcId）⇒ 客户端 `promptLaunch` 读到 `{ok:false,error:{message}}`，
        // 走真实 err 分支（= 用户截图那条告警的同一代码路径）。改写发生在浏览器与宿主之间，产品代码零改动。
        const injections = { count: 0, enabled: false, lastRpcId: null, errors: [], lastText: null }
        cdp.on('Fetch.requestPaused', async (p) => {
          const proceed = async () => {
            try { await cdp.send('Fetch.continueResponse', { requestId: p.requestId }) }
            catch { try { await cdp.send('Fetch.continueRequest', { requestId: p.requestId }) } catch { /* ignore */ } }
          }
          try {
            if (!injections.enabled || p.responseStatusCode !== 200) { await proceed(); return }
            const rb = await cdp.send('Fetch.getResponseBody', { requestId: p.requestId })
            const text = rb.base64Encoded === true ? Buffer.from(rb.body, 'base64').toString('utf8') : rb.body
            const parsed = JSON.parse(text)
            if (parsed === null || typeof parsed !== 'object' || parsed.type !== 'server-response') { await proceed(); return }
            injections.count += 1
            injections.lastRpcId = parsed.rpcId ?? null
            parsed.result = { ok: false, error: { code: 'gateway/internal', message: INJECTED_SERVER_ERROR, details: {} } }
            const body = Buffer.from(JSON.stringify(parsed), 'utf8').toString('base64')
            await cdp.send('Fetch.fulfillRequest', {
              requestId: p.requestId, responseCode: 200,
              responseHeaders: [{ name: 'content-type', value: 'application/json' }], body,
            })
          } catch (e) { injections.errors.push(String(e).slice(0, 160)); await proceed() }
        })

        const setViewport = async (vp) => {
          await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false })
          await sleep(500)
          await cdp.evaluate('window.dispatchEvent(new Event("resize"))')
          await sleep(900)
        }
        const waitFor = async (expr, ms, label) => {
          const t0 = Date.now()
          while (Date.now() - t0 < ms) {
            try { if ((await cdp.evaluate(expr)) === true) return true } catch { /* retry */ }
            await sleep(300)
          }
          console.log('  !! 超时等待：' + label)
          return false
        }
        const screenshot = async (name) => {
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
          const path = join(opts.out, name + '.png')
          writeFileSync(path, Buffer.from(shot.data, 'base64'))
          return path
        }

        // ── 3) 打开创作台（真实 UI 链路：抽屉书目卡 → openCtl 自动建会话/挂预设/绑定 → 分栏）──
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false })
        // 显式导航（浏览器首个 load 可能早于实例就绪 → chrome-error 页；此处确保落在应用页）
        const cur = await cdp.evaluate('location.href')
        if (String(cur).indexOf('127.0.0.1') < 0 || String(cur).startsWith('chrome-error')) {
          await cdp.send('Page.navigate', { url: appUrl })
          await sleep(1500)
        }
        const ready = await waitFor("document.querySelectorAll('.nv-drawer').length > 0", 90000, '.nv-drawer')
        if (!ready) {
          try {
            const diag = await cdp.evaluate("({ href: location.href, title: document.title, boot: typeof window.__DSH_BOOT__, dsh: typeof window.__DSH_BOOT_READY__, modLoader: typeof window.__ModuleLoader__, body: (document.body ? document.body.innerText : '').slice(0, 400) })")
            console.error('[probe] 页面诊断 = ' + JSON.stringify(diag))
          } catch (e) { console.error('[probe] 页面诊断失败 = ' + String(e)) }
          console.error('[probe] 页面日志 = ' + pageLog.slice(-20).join(' | ').slice(0, 1200))
        }
        const cardReady = ready && await waitFor("document.querySelectorAll('.nv-card').length > 0", 30000, '.nv-card')
        if (!cardReady) { console.error('[probe] 环境错误：抽屉书目卡未出现（隔离实例 → 插件 UI 链路未就绪）'); await stopAll(); process.exit(2) }
        await cdp.evaluate("document.querySelector('.nv-card').click()")
        const splitOpen = await waitFor("document.querySelector('.nv-bar') !== null", 120000, '.nv-bar')
        if (!splitOpen) { console.error('[probe] 环境错误：创作台未打开'); await stopAll(); process.exit(2) }
        // 宿主首次启动模态（内测声明）遮挡中窗 → 关掉（点击其「继续」）
        await cdp.evaluate("(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '继续'); if (b !== undefined) b.click(); return true })()")
        await sleep(1200)
        report.opened = await cdp.evaluate("({ bar: document.querySelector('.nv-bar') !== null, cards: document.querySelectorAll('.nv-card').length })")

        // ── 4) S1 长 err 告警（故障注入 → promptLaunch err 分支）───────────
        const errText = i18n.promptFailPrefix + INJECTED_SERVER_ERROR + i18n.promptFailHint
        await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*api/session/prompt*', requestStage: 'Response' }] })
        injections.enabled = true
        const clicked = await cdp.evaluate(`(() => { const b = [...document.querySelectorAll('.nv-split button')].find((x) => /继续工作流|开始工作流/.test(x.textContent || '')); if (b === undefined) return false; b.click(); return true })()`)
        if (clicked !== true) { console.error('[probe] 环境错误：未找到「继续工作流」按钮'); await stopAll(); process.exit(2) }
        const gotErr = await waitFor("(() => { const n = document.querySelector('.nv-notice') ?? document.querySelector('.nv-bar-note'); return n !== null && n.textContent.indexOf('启动指令发送失败') >= 0 })()", 30000, 'S1 长 err 告警')
        injections.enabled = false
        await cdp.send('Fetch.disable')
        await sleep(600)

        // ── 5) S2 短 ok 告警（标题栏 ⟳ = 恢复默认布局）─────────────────────
        const clickReset = async () => {
          await cdp.evaluate(`(() => { const b = [...document.querySelectorAll('.nv-bar-ctl')].find((x) => (x.getAttribute('aria-label') || '').indexOf('恢复默认布局') >= 0); if (b === undefined) return false; b.click(); return true })()`)
          return waitFor("(() => { const n = document.querySelector('.nv-notice') ?? document.querySelector('.nv-bar-note'); return n !== null && n.textContent === " + JSON.stringify(i18n.resetLayoutDone) + " })()", 20000, 'S2 短 ok 告警')
        }

        // ── 6) 两场景 × 两视口测量 ────────────────────────────────────────
        // 文案断言口径（S1）：注入的 *服务端 error.message* 会被客户端包装（`client api: session/prompt failed: …`），
        // 故断言「逐字前缀 + 逐字后缀 + 中间非空实质错误文本」，并**全文入报告**供逐字复核（不猜中段内容）。
        const errPrefix = i18n.promptFailPrefix
        const errHint = i18n.promptFailHint
        const textOk = (text) => typeof text === 'string' && text.startsWith(errPrefix) && text.endsWith(errHint)
          && text.length > errPrefix.length + errHint.length + 20
        const measureScenario = async (id, label, expectedText, vp, kind) => {
          await setViewport(vp)
          await sleep(700)
          const m = await cdp.evaluate(MEASURE_JS)
          const barEls = { title: m.title, banner: m.banner, ctl: m.ctls }
          const inter = { title: intersectArea(m.notice, m.title), banner: intersectArea(m.notice, m.banner) }
          m.ctls.forEach((c, i) => { inter['ctl' + i] = intersectArea(m.notice, c) })
          const interSum = +(Object.values(inter).reduce((a, b) => a + (b ?? 0), 0)).toFixed(2)
          const contentTops = [m.chrow, m.wfrow, m.main].filter((r) => r !== null).map((r) => r.y)
          const belowContent = contentTops.length === 0 ? null : m.notice === null ? null : m.notice.bottom <= Math.min(...contentTops) + 0.5
          const truncated = m.noticeOverflow === null ? null : (m.noticeOverflow.scrollWidth > m.noticeOverflow.clientWidth + 1 || m.noticeOverflow.scrollHeight > m.noticeOverflow.clientHeight + 1)
          // 目检截图前先关掉宿主自身的模态（无 API Key 时宿主弹「添加一个 API Key」——属宿主行为，与告警
          // 几何无关，但会遮挡中窗）；只点「稍后配置/稍后/继续」类非破坏按钮，并记录是否命中
          const dismissed = await cdp.evaluate("(() => { const b = [...document.querySelectorAll('button')].find((x) => /^(稍后配置|稍后|继续)$/.test((x.textContent || '').trim())); if (b === undefined) return false; b.click(); return true })()")
          if (dismissed === true) await sleep(500)
          const shot = await screenshot(vp.name + '-' + id)
          const rec = {
            scenario: id, kind, label, viewport: vp.name, measuredAt: new Date().toISOString(),
            expectedText, expectedLen: expectedText.length,
            bar: m.bar, notice: m.notice, noticeClass: m.noticeClass, noticeKind: m.noticeKind, noticeText: m.noticeText,
            textMatches: m.noticeText === expectedText,
            textOk: kind === 'long' ? textOk(m.noticeText) : m.noticeText === expectedText,
            prefixOk: typeof m.noticeText === 'string' && m.noticeText.startsWith(errPrefix),
            suffixOk: typeof m.noticeText === 'string' && m.noticeText.endsWith(errHint),
            noticeTitleAttrLen: m.noticeTitleAttr === null ? null : m.noticeTitleAttr.length,
            overflow: m.noticeOverflow, truncated, insideBar: m.noticeInsideBar,
            noticeForm: m.noticeForm, noticeTextLine: m.noticeTextLine,
            intersections: inter, intersectionSum: interSum,
            contentAnchors: { chrow: m.chrow, wfrow: m.wfrow, main: m.main }, belowContent,
            bannerHidden: m.bannerHidden, viewportActual: m.viewport, screenshot: shot, barEls,
          }
          return rec
        }

        for (const vp of VIEWPORTS) {
          report.scenarios['S1-err-' + vp.name] = await measureScenario('S1-err', '长 err 告警（会话已就绪，但启动指令发送失败…）', errText, vp, 'long')
          const s2ok = await clickReset()
          if (!s2ok) console.log('  !! S2 短 ok 告警未出现（继续测量当前态）')
          report.scenarios['S2-ok-' + vp.name] = await measureScenario('S2-ok', '短 ok 告警（已恢复默认布局）', i18n.resetLayoutDone, vp, 'short')
          // 回到 S1 态以便下一视口继续测长告警（再次触发注入）
          if (vp !== VIEWPORTS[VIEWPORTS.length - 1]) {
            await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*api/session/prompt*', requestStage: 'Response' }] })
            injections.enabled = true
            await cdp.evaluate(`(() => { const b = [...document.querySelectorAll('.nv-split button')].find((x) => /继续工作流|开始工作流/.test(x.textContent || '')); if (b === undefined) return false; b.click(); return true })()`)
            await waitFor("(() => { const n = document.querySelector('.nv-notice') ?? document.querySelector('.nv-bar-note'); return n !== null && n.textContent.indexOf('启动指令发送失败') >= 0 })()", 30000, 'S1 复现')
            injections.enabled = false
            await cdp.send('Fetch.disable')
          }
        }
        // 参考视口（非判据）：宽栏下短提示应回到标题栏 chip 形态（"短提示不劣化/零变化"的实证）。
        // 关键：**先把视口切到宽栏再触发新短提示**——形态裁决按当前几何实测（先窄后宽会让闩锁保持，
        // 测不到宽栏形态）。
        await setViewport(WIDE_VIEWPORT)
        await cdp.evaluate(`(() => { const b = [...document.querySelectorAll('.nv-bar-ctl')].find((x) => (x.getAttribute('aria-label') || '').indexOf('默认') >= 0 && (x.getAttribute('aria-label') || '').indexOf('恢复') < 0); if (b === undefined) return false; b.click(); return true })()`)
        await sleep(1200)
        report.reference['S2-ok-' + WIDE_VIEWPORT.name] = await measureScenario('S2-ok', '短 ok 告警（宽栏参考：☆ 固化为默认）', i18n.savedDefault, WIDE_VIEWPORT, 'short')
        report.injections = { count: injections.count, lastRpcId: injections.lastRpcId }
        report.s1Triggered = gotErr
      }

      // ── 7) 判据裁决（验收条款逐条映射）───────────────────────────────────
      const all = Object.values(report.scenarios)
      const longRecs = all.filter((r) => r.scenario === 'S1-err')
      const shortRecs = all.filter((r) => r.scenario === 'S2-ok')
      const verdict = (id, label, ok, detail) => report.verdicts.push({ id, label, ok, detail })
      if (longRecs.length > 0) {
        verdict('C1-full-text-in-app', '长告警全文在应用内可读（流式面承载完整文本：逐字前缀 + 逐字后缀 + 中间实质错误文本；无截断/无省略号）——两视口',
          longRecs.every((r) => r.truncated === false && r.textOk === true && r.notice !== null && r.insideBar === false && r.overflow !== null && r.overflow.textOverflow !== 'ellipsis'),
          longRecs.map((r) => r.viewport + ': truncated=' + r.truncated + ' prefixOk=' + r.prefixOk + ' suffixOk=' + r.suffixOk + ' len=' + (r.noticeText === null ? null : r.noticeText.length) + ' textOverflow=' + (r.overflow === null ? null : r.overflow.textOverflow) + ' insideBar=' + r.insideBar + ' cls=' + r.noticeClass).join(' | '))
        verdict('C2-no-overlap-bar', '告警矩形与 .nv-bar-title/.nv-bar-banner/.nv-bar-ctl 交集 = ∅（长告警）——两视口',
          longRecs.every((r) => r.intersectionSum === 0),
          longRecs.map((r) => r.viewport + ': sum=' + r.intersectionSum + ' ' + JSON.stringify(r.intersections)).join(' | '))
        verdict('C3-below-bar', '长告警位于标题栏之下（非浮动/非覆盖）——两视口',
          longRecs.every((r) => r.notice !== null && r.bar !== null && r.notice.y >= r.bar.bottom - 0.5),
          longRecs.map((r) => r.viewport + ': notice.y=' + (r.notice === null ? null : r.notice.y) + ' bar.bottom=' + (r.bar === null ? null : r.bar.bottom)).join(' | '))
        verdict('C4-not-cover-content', '长告警不覆盖标题栏下方首屏内容（章节行/当前阶段行/主区）——两视口',
          longRecs.every((r) => r.belowContent === true),
          longRecs.map((r) => r.viewport + ': belowContent=' + r.belowContent).join(' | '))
        verdict('C6-long-multiline', '长告警为多行块形态（data-form=block，文本 > 1 行＝非单行截断形态）——两视口',
          longRecs.every((r) => r.noticeForm === 'block' && r.noticeTextLine !== null && r.noticeTextLine.lines !== null && r.noticeTextLine.lines >= 2),
          longRecs.map((r) => r.viewport + ': form=' + r.noticeForm + ' lines=' + (r.noticeTextLine === null ? null : r.noticeTextLine.lines)).join(' | '))
      } else {
        verdict('C1-full-text-in-app', '长告警全文在应用内可读（流式面承载完整文本）——两视口', false, 'S1 未测得（未触发长 err 告警）')
      }
      if (shortRecs.length > 0) {
        verdict('C5-short-compact', '短 ok 提示保持紧凑（恰好单行：文本行数 = 1 且总高 ≤ 32px；无截断；交集 = ∅）——两视口',
          shortRecs.every((r) => r.notice !== null && r.notice.h <= 32 && r.noticeTextLine !== null && r.noticeTextLine.lines === 1
            && r.intersectionSum === 0 && r.truncated === false && r.textMatches === true),
          shortRecs.map((r) => r.viewport + ': h=' + (r.notice === null ? null : r.notice.h) + ' lines=' + (r.noticeTextLine === null ? null : r.noticeTextLine.lines) + ' w=' + (r.notice === null ? null : r.notice.w) + ' barW=' + r.bar.w + ' form=' + r.noticeForm + ' sum=' + r.intersectionSum + ' truncated=' + r.truncated).join(' | '))
      }
      verdict('C7-real-env-untouched', '真实 $DSH_HOME 零写入（收尾指纹逐项与开跑前一致）', true, '收尾复核在下方回填')
    } finally {
      await stopAll()
      const realAfter = realFingerprint(realHome)
      report.realEnvAfter = realAfter
      const same = JSON.stringify(realBefore) === JSON.stringify(realAfter)
      const idx = report.verdicts.findIndex((v) => v.id === 'C7-real-env-untouched')
      if (idx >= 0) { report.verdicts[idx].ok = same; report.verdicts[idx].detail = same ? '指纹一致（零写入）' : 'before=' + JSON.stringify(realBefore) + ' after=' + JSON.stringify(realAfter) }
      report.ok = report.verdicts.length > 0 && report.verdicts.every((v) => v.ok === true)
      report.finishedAt = new Date().toISOString()
      if (opts.jsonOut !== null) writeFileSync(opts.jsonOut, JSON.stringify(report, null, 2) + '\n')
      writeFileSync(join(opts.out, 'report.json'), JSON.stringify(report, null, 2) + '\n')
      console.log('\n[probe] UX-060 告警几何测量（隔离实例 + 无头浏览器；真实 $DSH_HOME 只读）')
      for (const [key, rec] of Object.entries(report.scenarios)) {
        console.log('  ' + key + '：notice=' + JSON.stringify(rec.notice) + ' cls=' + rec.noticeClass + '/' + rec.noticeForm + ' 截断=' + rec.truncated
          + ' 交集=' + rec.intersectionSum + JSON.stringify(rec.intersections) + ' 栏内=' + rec.insideBar + ' 不覆盖下方=' + rec.belowContent + ' 行数=' + (rec.noticeTextLine === null ? null : rec.noticeTextLine.lines))
        console.log('      文本(' + (rec.noticeText === null ? 0 : rec.noticeText.length) + ' 字)=' + JSON.stringify(String(rec.noticeText).slice(0, 100)) + '… title属性长度=' + rec.noticeTitleAttrLen)
        console.log('      截图 → ' + rec.screenshot)
      }
      for (const [key, rec] of Object.entries(report.reference)) {
        console.log('  [参考/非判据] ' + key + '：cls=' + rec.noticeClass + '/' + rec.noticeForm + ' rect=' + JSON.stringify(rec.notice) + ' 行数=' + (rec.noticeTextLine === null ? null : rec.noticeTextLine.lines) + ' 交集=' + rec.intersectionSum + ' 栏内=' + rec.insideBar)
      }
      const failed = report.verdicts.filter((v) => !v.ok)
      for (const v of report.verdicts) console.log('  ' + (v.ok ? '✅' : '❌') + ' ' + v.id + ' ' + v.label + (v.ok ? '' : ' :: ' + v.detail))
      console.log('[probe] ' + (report.ok ? '绿态（全部判据成立）' : '红态/回归（' + failed.length + ' 条判据不成立）') + '；报告 → ' + join(opts.out, 'report.json'))
      if (!opts.keep) {
        // 保留截图与报告（证据），删除实例/浏览器数据目录
        for (const key of ['home', 'userprofile', 'appdata', 'localappdata', 'edge', 'tmp']) { try { rmSync(dirs[key], { recursive: true, force: true }) } catch { /* ignore */ } }
      }
      process.exit(report.ok ? 0 : 1)
    }
  })()
}


// ── 入口守卫（CLEAN-006 R1 F-12 / P-05）────────────────────────────────────────────────────
// 本脚本在被**直接执行**时才自举隔离实例（含子进程 / 临时目录 / 无头浏览器）；被 import() 时
// MUST NOT 产生任何副作用。判据 = process.argv[1] 解析后与本文件真实路径相同（**不用**
// import.meta.main——本运行时无该 API）。
const isDirectEntry = (() => {
  try {
    if (process.argv[1] === undefined || process.argv[1] === null) return false
    const self = realpathSync(fileURLToPath(import.meta.url))
    const arg = pathToFileURL(process.argv[1])
    return arg.protocol === 'file:' && realpathSync(fileURLToPath(arg)) === self
  } catch { return false }
})()
if (isDirectEntry) await main()
