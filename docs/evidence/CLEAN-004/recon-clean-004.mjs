#!/usr/bin/env node
/**
 * recon-clean-004.mjs — CLEAN-004 探针的**一次性侦察**（隔离实例 + 无头浏览器 → 导出宿主 DOM 结构面）。
 *
 * 目的：在写断言之前先拿到当前 HEAD 下**隔离实例真实渲染**的宿主 DOM 事实——会话列表的容器与行选择器、
 * 首次启动模态、侧栏结构与工作台/控制台几何锚点。侦察结果用于把断言选择器钉在真实结构上（不猜类名）。
 *
 * 与 probe-clean-004.mjs 共享同一套隔离装配纪律（同族先例 scripts/probe-nv-bar-geometry.mjs）：
 * 隔离根 + 包含性校验 + 只读 junction 平面 + 随机端口 + 真实 $DSH_HOME 只读指纹。清理在 finally 内、
 * exit 之前执行（同族 BUG-007 R1 F-7 / UX-060 R1 F-1 教训），可用 --keep-home 关闭实例保留侦察现场。
 *
 * 用法：node recon-clean-004.mjs [--out <dir>] [--keep-home]
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = dirname(dirname(dirname(HERE)))
const PROFILE_NAME = 'clean004recon'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (t) => createHash('sha256').update(t).digest('hex')

function parseArgs(argv) {
  const opts = { out: join(tmpdir(), 'clean004-recon'), keepHome: false }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--out') opts.out = argv[++i]
    else if (a === '--keep-home') opts.keepHome = true
    else { console.error('用法错误：未知参数 ' + a); process.exit(2) }
  }
  return opts
}

async function bootChild(root, home, planeNodeModules, port) {
  if (!(home !== root && home.startsWith(root + sep))) { console.error('BOOT-ERR 隔离失败：' + home); process.exit(2) }
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
    name: 'dsh-profile-' + PROFILE_NAME, private: true,
    dependencies: { 'dsh-novel-writing': 'link:' + REPO_ROOT },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-novel-writing'], patchReload: 'live' } },
  }, null, 2) + '\n')
  writeFileSync(join(profileDir, 'cordis.yml'), '[]\n')
  writeFileSync(join(profileDir, 'cordis.patch.yml'), '[]\n')
  const appBoot = await import(pathToFileURL(join(planeNodeModules, 'dsh-app-boot', 'lib', 'index.js')).href)
  const lib = join(planeNodeModules, 'dsh', 'lib')
  const shim = readdirSync(lib).filter((f) => /^profile-boot-.*\.js$/.test(f)).find((f) => readFileSync(join(lib, f), 'utf8').includes('export { runProfile }'))
  if (shim === undefined) { console.error('BOOT-ERR launcher shim 缺失'); process.exit(2) }
  const runProfile = (await import(pathToFileURL(join(lib, shim)).href)).runProfile
  const booted = await runProfile({ environment: appBoot.loadLayeredEnv('dsh'), profile: PROFILE_NAME, fromDefaultProfile: undefined, patchFiles: [], args: ['--no-open', '--port', String(port)] })
  console.log('BOOT-READY pid=' + process.pid)
  const stop = () => { try { booted.shutdown.shutdown(0).then(() => process.exit(0), () => process.exit(0)) } catch { process.exit(0) } }
  process.on('SIGTERM', stop)
  process.on('message', (m) => { if (m === 'stop') stop() })
  setInterval(() => {}, 1 << 30)
}
if (process.argv[2] === '--boot') {
  await bootChild(process.argv[3], process.argv[4], process.argv[5], Number(process.argv[6]))
  await new Promise(() => {})
}

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
      } else if (msg.method !== undefined) { for (const h of cdp.handlers.get(msg.method) ?? []) { try { h(msg.params) } catch { /* ignore */ } } }
    }
    return cdp
  }
  on(method, handler) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(handler) }
  send(method, params = {}) { return new Promise((res, rej) => { const id = ++this.seq; this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails !== undefined) throw new Error('page eval failed: ' + String(JSON.stringify(r.exceptionDetails)).slice(0, 300))
    return r.result.value
  }
}

function resolvePlane() {
  const home = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  for (const pd of [join(home, 'profiles', 'web'), join(home, 'profiles')]) {
    if (!existsSync(pd)) continue
    try {
      const resolved = createRequire(join(pd, 'index.js')).resolve('@deepseek-ai/dsh/package.json')
      return { nodeModules: dirname(dirname(resolved)) }
    } catch { /* next */ }
  }
  return null
}
function findBrowser() {
  const c = [
    join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.ProgramFiles ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.ProgramFiles ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter((p) => p !== '' && existsSync(p))
  return c[0] ?? null
}
function realFingerprint(home) {
  const fp = { settingsSha: null, entries: {} }
  try { fp.settingsSha = sha256(readFileSync(join(home, 'settings.yaml'), 'utf8')) } catch { /* none */ }
  try { for (const d of readdirSync(home, { withFileTypes: true })) { const st = statSync(join(home, d.name)); fp.entries[d.name] = { dir: st.isDirectory(), size: st.size, mtimeMs: Math.round(st.mtimeMs) } } } catch { /* none */ }
  return fp
}
const freePort = () => new Promise((resolve, reject) => { const s = createServer(); s.on('error', reject); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) }) })

/** 侦察现场：一本未绑定书（覆盖自动建会话链）+ 一本已绑定书。 */
const NOVELS = [
  { id: 'zz-recon-first', title: '侦察一号', updated: '2026-09-13T10:00:00.000Z' },
  { id: 'aa-recon-second', title: '侦察二号', updated: '2026-09-13T09:00:00.000Z' },
]
function writeFixture(novelsRoot) {
  mkdirSync(novelsRoot, { recursive: true })
  for (const n of NOVELS) {
    const proj = join(novelsRoot, n.id, 'novel-project')
    mkdirSync(join(proj, '07-content'), { recursive: true })
    writeFileSync(join(proj, 'workflow-state.json'), JSON.stringify({
      current_stage: 'outline_writing', completed_stages: ['work_type_selection'],
      project_info: { title: n.title, work_type: '长篇小说' }, files: {},
      guardrails: { release_allowed: false, monetization_allowed: false },
      statistics: { total_chapters: 1, total_words: 500, last_updated: n.updated },
    }, null, 2))
    writeFileSync(join(proj, '07-content', 'chapter-001.md'), '# 第1章 侦察\n\n正文。\n', 'utf8')
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const plane = resolvePlane()
  const browser = findBrowser()
  if (plane === null || browser === null) { console.error('[recon] 环境不可用'); return 2 }
  const realHome = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? '', '.dsh')
  const realBefore = realFingerprint(realHome)
  const root = mkdtempSync(join(tmpdir(), 'clean004-recon-'))
  const dirs = { root, home: join(root, 'dsh-home'), userprofile: join(root, 'userprofile'), appdata: join(root, 'appdata'), localappdata: join(root, 'localappdata'), edge: join(root, 'edge'), tmp: join(root, 'tmp'), novels: join(root, 'novels') }
  for (const [k, d] of Object.entries(dirs)) if (k !== 'novels') mkdirSync(d, { recursive: true })
  const containment = {}
  for (const k of ['home', 'userprofile', 'appdata', 'localappdata', 'edge', 'tmp', 'novels']) containment[k] = dirs[k] !== root && dirs[k].startsWith(root + sep)
  if (Object.values(containment).some((v) => v !== true)) { console.error('[recon] 隔离校验失败 ' + JSON.stringify(containment)); rmSync(root, { recursive: true, force: true }); return 2 }
  mkdirSync(opts.out, { recursive: true })
  writeFixture(dirs.novels)
  writeFileSync(join(dirs.home, 'settings.yaml'), 'novel-writing:\n  workspaceRoot: ' + dirs.novels.replace(/\\/g, '/') + '\n', 'utf8')

  const appPort = await freePort(); const cdpPort = await freePort()
  const childEnv = { ...process.env, DSH_HOME: dirs.home, USERPROFILE: dirs.userprofile, HOME: dirs.userprofile, APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata, TEMP: dirs.tmp, TMP: dirs.tmp }
  let boot = null, edge = null, cdp = null
  const bootOut = []; const pageLog = []
  const dump = { isolation: { root, containment, realEnvBefore: realBefore }, steps: [] }
  const stopAll = async () => {
    try { if (cdp !== null) cdp.ws.close() } catch { /* ignore */ }
    try { if (edge !== null && edge.exitCode === null) edge.kill() } catch { /* ignore */ }
    try { if (boot !== null && boot.exitCode === null) boot.kill() } catch { /* ignore */ }
    await sleep(900)
    if (boot !== null && boot.exitCode === null) { try { boot.kill('SIGKILL') } catch { /* ignore */ } }
    if (edge !== null && edge.exitCode === null) { try { edge.kill('SIGKILL') } catch { /* ignore */ } }
    await sleep(400)
  }
  try {
    boot = spawn(process.execPath, [fileURLToPath(import.meta.url), '--boot', root, dirs.home, plane.nodeModules, String(appPort)], { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] })
    let appUrl = null
    boot.stdout.on('data', (b) => { const t = String(b); bootOut.push(t.trim()); const m = /(http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+)/.exec(t); if (m !== null && appUrl === null) appUrl = m[1] })
    boot.stderr.on('data', (b) => bootOut.push('ERR ' + String(b).trim()))
    for (let i = 0; i < 200 && appUrl === null; i += 1) { if (boot.exitCode !== null) break; await sleep(250) }
    if (appUrl === null) { console.error('[recon] 实例未启动：' + bootOut.join(' | ').slice(0, 600)); return 2 }
    let serving = false
    for (let i = 0; i < 160 && serving !== true; i += 1) { try { const r = await fetch(appUrl, { redirect: 'manual' }); if (r.status !== undefined) serving = true } catch { await sleep(250) } }
    console.log('[recon] 实例就绪 ' + appUrl.replace(/token=.*/, 'token=***'))

    edge = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions', '--remote-debugging-port=' + cdpPort, '--user-data-dir=' + dirs.edge, '--window-size=1400,900', appUrl],
      { env: { ...process.env, USERPROFILE: dirs.userprofile, HOME: dirs.userprofile, APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata }, stdio: ['ignore', 'pipe', 'pipe'] })
    let target = null
    const deadline = Date.now() + 60000
    while (Date.now() < deadline && target === null && edge.exitCode === null) {
      await sleep(300)
      try { const list = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json(); target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl !== undefined) ?? null } catch { /* retry */ }
    }
    if (target === null) { console.error('[recon] 无调试目标'); return 2 }
    cdp = await Cdp.attach(target.webSocketDebuggerUrl)
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable')
    cdp.on('Runtime.consoleAPICalled', (p) => pageLog.push('console.' + p.type + ' ' + (p.args ?? []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 200)))
    cdp.on('Runtime.exceptionThrown', (p) => pageLog.push('exception ' + String(p.exceptionDetails?.exception?.description ?? '').slice(0, 200)))
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false })

    const waitFor = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if ((await cdp.evaluate(expr)) === true) return true } catch { /* retry */ } await sleep(250) } return false }
    const ready = await waitFor("document.querySelector('.nv-drawer') !== null", 90000)
    console.log('[recon] 插件 UI 就绪=' + String(ready))
    if (!ready) { dump.pageLog = pageLog.slice(-20); dump.bodyText = await cdp.evaluate("(document.body.innerText || '').slice(0, 800)").catch(() => null); return 1 }

    // 1) 首要模态截断：宿主首次启动模态（未点「继续」时）
    dump.modalsBefore = await cdp.evaluate(`(() => [...document.querySelectorAll('div,section,dialog')].filter((n) => {
      const cs = getComputedStyle(n); const r = n.getBoundingClientRect()
      return (cs.position === 'fixed' || cs.position === 'absolute') && r.width > 300 && r.height > 200 && cs.display !== 'none' && +cs.zIndex >= 50
    }).slice(0, 12).map((n) => ({ cls: n.className === undefined ? null : String(n.className).slice(0, 120), z: getComputedStyle(n).zIndex, rect: (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(n.getBoundingClientRect()), text: (n.innerText || '').slice(0, 120) })))()`)
    // 关掉宿主模态
    await cdp.evaluate("(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '继续'); if (b !== undefined) b.click(); return true })()")
    await sleep(1200)

    // 2) 打开控制台并做结构侦察
    await cdp.evaluate("(() => { const h = document.querySelector('.nv-drawer-head'); if (h !== null) h.click(); return true })()")
    await waitFor("document.querySelector('.nv-console') !== null", 15000)
    await sleep(1500)
    dump.consoleOpen = await cdp.evaluate("document.querySelector('.nv-console') !== null")

    // 3) 会话服务：页面侧对宿主 client API 的可达性侦察（用于设计「找 session」断言与「自动建会话」链）
    dump.apiProbe = await cdp.evaluate(`(async () => {
      const out = { rpc: null, list: null }
      try {
        const r = await fetch('/api/rpc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: 'recon-1', method: 'sessions.list', params: {} }) })
        out.rpc = { status: r.status, text: (await r.text()).slice(0, 600) }
      } catch (e) { out.rpc = 'err ' + String(e) }
      return out
    })()`)

    // 4) 坐点：从抽屉卡进入分栏，侦察宿主会话 DOM 结构（.nv-split 之外的宿主容器）
    await cdp.evaluate("(() => { const c = document.querySelector('.nv-drawer .nv-card'); if (c !== null) c.click(); return true })()")
    const splitOk = await waitFor("document.querySelector('.nv-bar') !== null", 60000)
    dump.splitOpened = splitOk
    await sleep(1500)
    dump.hostDom = await cdp.evaluate(`(() => {
      const rectOf = (e) => { if (e === null) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }
      const phase = document.querySelector('[data-phase]')
      const root = phase === null ? null : phase
      const out = {
        phase: phase === null ? null : phase.getAttribute('data-phase'),
        rootCls: root === null ? null : String(root.className).slice(0, 160),
        children: root === null ? [] : [...root.children].map((c) => ({ tag: c.tagName, cls: String(c.className).slice(0, 120), rect: rectOf(c) })),
        // 侧栏会话行候选：宿主侧栏里可点的会话条目
        sidebarCandidates: [...document.querySelectorAll('a,button,[role=button],[role=option],[role=tab]')].filter((n) => {
          const cls = String(n.className)
          return !/^nv-/.test(cls) && /session|Session|会话/i.test(cls + ' ' + String(n.getAttribute('data-testid') || '') + ' ' + (n.textContent || '').slice(0, 40))
        }).slice(0, 12).map((n) => ({ tag: n.tagName, cls: String(n.className).slice(0, 120), testid: n.getAttribute('data-testid'), text: (n.textContent || '').trim().slice(0, 60), rect: rectOf(n) })),
        taSplitClose: document.querySelectorAll('.ta_splitClose').length,
        nvAll: [...document.querySelectorAll('[class^=nv-],[class*= nv-]')].map((n) => String(n.className).split(' ')[0]).filter((v, i, a) => a.indexOf(v) === i).sort(),
      }
      return out
    })()`)
    dump.nvClasses = await cdp.evaluate(`(() => { const s = [...document.querySelectorAll('[class]')].map((n) => String(n.className)).join(' ').split(/\\s+/).filter((c) => c.startsWith('nv-')); return [...new Set(s)].sort() })()`)
    // 5) 几何侦察：会话根候选链 + 插件分栏/控制台真实 rect（验证挤压方向与宽度口径）
    dump.geometry = await cdp.evaluate(`(() => {
      const rectOf = (e) => { if (e === null || e === undefined) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1) } }
      const phases = [...document.querySelectorAll('[data-phase]')].map((n) => ({ tag: n.tagName, phase: n.getAttribute('data-phase'), children: n.children.length, rect: rectOf(n), cls: String(n.className).slice(0, 80) }))
      const root = document.querySelector('[data-phase]')
      const chain = []
      let cur = root
      while (cur !== null && chain.length < 6) { chain.push({ tag: cur.tagName, cls: String(cur.className).slice(0, 80), rect: rectOf(cur) }); cur = cur.parentElement }
      return {
        viewport: { w: window.innerWidth, h: window.innerHeight }, phases, chain,
        split: rectOf(document.querySelector('.nv-split')), left: rectOf(document.querySelector('.nv-left')),
        mid: rectOf(document.querySelector('.nv-mid')), vdiv: rectOf(document.querySelector('.nv-vdiv')),
        chatdiv: rectOf(document.querySelector('.nv-chatdiv')), chdiv: rectOf(document.querySelector('.nv-chdiv')),
        console: rectOf(document.querySelector('.nv-console')), bar: rectOf(document.querySelector('.nv-bar')),
        sidebarRight: (() => { const d = document.querySelector('.nv-drawer'); if (d === null) return null; const aside = d.closest('aside,nav,[class*=sidebar],[class*=Sidebar]'); return { drawer: rectOf(d), aside: rectOf(aside), asideCls: aside === null ? null : String(aside.className).slice(0, 80) } })(),
        viewArea: root === null ? null : { child0: rectOf(root.children[0]), child1: rectOf(root.children[1]), child1Margin: root.children[1] === undefined ? null : { ml: root.children[1].style.marginLeft, mr: root.children[1].style.marginRight, w: root.children[1].style.width, wt: root.children[1].style.width === '' ? null : getComputedStyle(root.children[1]).width } },
      }
    })()`)
    // 6) 会话行候选（宿主侧栏）结构面
    dump.sessionRows = await cdp.evaluate(`(() => {
      const other = [...document.querySelectorAll('div[class*=session],div[class*=Session],li,[role=listitem]')].slice(0, 40)
      return {
        count: other.length,
        sample: other.filter((n) => (n.textContent || '').trim() !== '').slice(0, 15).map((n) => ({ tag: n.tagName, cls: String(n.className).slice(0, 90), text: (n.textContent || '').trim().slice(0, 50), clickable: n.onclick !== null || n.getAttribute('role') !== null })),
      }
    })()`)
    dump.sessionsFoundUI = await cdp.evaluate(`(() => {
      const head = document.querySelector('.nv-drawer-head'); if (head !== null) head.click()
      return { consoleAfterToggle: document.querySelector('.nv-console') !== null }
    })()`)
    await sleep(1200)
    const searchSetup = await cdp.evaluate(`(() => {
      const inp = document.querySelector('.nv-csearch input'); if (inp === null) return 'no-search'
      const proto = window.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(inp, '新会话')
      inp.dispatchEvent(new Event('input', { bubbles: true }))
      return inp.value
    })()`)
    await sleep(1600)
    dump.sessionSearch = await cdp.evaluate(`(() => ({
      setup: ${JSON.stringify(searchSetup)},
      found: (document.querySelector('.nv-cfound-title') || {}).textContent ?? null,
      rows: [...document.querySelectorAll('.nv-cfound .nv-srow')].map((n) => ({ t: (n.querySelector('.nv-srow-title') || {}).textContent, sub: (n.querySelector('.nv-srow-sub') || {}).textContent })),
      cards: document.querySelectorAll('.nv-cgrid .nv-ccard').length,
    }))()`)
    await cdp.evaluate("(() => { const inp = document.querySelector('.nv-csearch input'); if (inp === null) return false; Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, ''); inp.dispatchEvent(new Event('input', { bubbles: true })); return true })()")
    await sleep(900)
    dump.bodyHead = await cdp.evaluate("(document.body.innerText || '').slice(0, 400)")

    // 7) 「找 session」可行性侦察：把宿主「新会话」按钮 + 若干候选关键词逐一试，找可命中的会话标题
    dump.newSessionProbe = await (async () => {
      const out = {}
      const before = await cdp.evaluate("document.querySelectorAll('.nv-drawer .nv-card').length")
      // 7a) 插件分栏控制条的「绑定新会话」（真实 UI 路径建会话）
      await cdp.evaluate("(() => { const b = [...document.querySelectorAll('.nv-wfctl button')].find((x) => (x.textContent || '').indexOf('绑定新会话') >= 0); if (b === undefined) return false; b.click(); return true })()")
      await sleep(4000)
      out.afterBindNew = await cdp.evaluate("(() => ({ notice: (document.querySelector('.nv-notice') ?? document.querySelector('.nv-bar-note') ?? {}).textContent ?? null, drawerSubs: [...document.querySelectorAll('.nv-drawer .nv-card-sub')].map((n) => n.textContent) }))()")
      out.before, out.after = before, await cdp.evaluate('document.querySelectorAll(".nv-cgrid .nv-ccard").length')
      // 7b) 宿主侧栏「新会话」按钮点击后的 DOM 变化（是否进入会话视图）
      await cdp.evaluate("(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '新会话' && !/^nv-/.test(String(x.className))); if (b === undefined) return false; b.click(); return true })()")
      await sleep(3000)
      out.afterHostNewSession = await cdp.evaluate("(() => ({ body: (document.body.innerText || '').slice(0, 500), splitStillOpen: document.querySelector('.nv-split') !== null }))()")
      return out
    })()
    // 9) 决定性：宿主侧栏自建会话（宿主 UI 路径）之后，插件「找到的会话」是否可命中
    dump.hostSessionFlow = await (async () => {
      const res = {}
      // 9a) 先开控制台（确保搜索输入在位）
      await cdp.evaluate("(() => { const h = document.querySelector('.nv-drawer-head'); if (h !== null) h.click(); return true })()")
      await sleep(1500)
      res.consoleOpen = await cdp.evaluate("document.querySelector('.nv-console') !== null")
      // 9b) 点宿主「新会话」按钮（宿主自己的建会话 UI）
      res.hostBtnClicked = await cdp.evaluate("(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '新会话' && !/^nv-/.test(String(x.className))); if (b === undefined) return false; b.click(); return true })()")
      await sleep(3000)
      // 9c) 宿主是否开始渲染会话行（侧栏 / 主体）
      res.afterHostNew = await cdp.evaluate(`(() => {
        const body = document.body.innerText || ''
        return {
          head: body.slice(0, 260),
          noSessions: body.indexOf('暂无会话') >= 0,
          consoleOpen: document.querySelector('.nv-console') !== null,
          bodyHasWorkspacePicker: body.indexOf('选择工作区') >= 0,
        }
      })()`)
      // 9d) 关键词试：宿主侧栏行标题 + 「新会话」+ 会话 id 前缀
      const trials = {}
      for (const kw of ['新会话', '会话', 'session']) {
        await cdp.evaluate(`(() => { const i = document.querySelector('.nv-csearch input'); if (i === null) return false; Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(kw)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
        await sleep(2000)
        trials[kw] = await cdp.evaluate(`(() => ({ found: (document.querySelector('.nv-cfound-title') || {}).textContent ?? null, rows: [...document.querySelectorAll('.nv-cfound .nv-srow')].map((n) => ({ t: (n.querySelector('.nv-srow-title') || {}).textContent, sub: (n.querySelector('.nv-srow-sub') || {}).textContent })) }))()`)
      }
      res.trials = trials
      // 9e) 宿主会话记录面（隔离实例）：sessions 目录 + storages
      res.hostDisk = await (async () => {
        const list = []
        const walk = (dir, depth) => {
          if (depth > 3) return
          let items = []
          try { items = readdirSync(dir, { withFileTypes: true }) } catch { return }
          for (const it of items.slice(0, 20)) {
            const p = join(dir, it.name)
            list.push((it.isDirectory() ? 'D ' : 'F ') + p.slice(dirs.home.length + 1))
            if (it.isDirectory()) walk(p, depth + 1)
          }
        }
        walk(join(dirs.home, 'sessions'), 0)
        walk(join(dirs.home, 'storages'), 0)
        return list.slice(0, 60)
      })()
      return res
    })()

    await cdp.send('Page.captureScreenshot', { format: 'png' }).then((s) => writeFileSync(join(opts.out, 'recon-split.png'), Buffer.from(s.data, 'base64')))
    return 0
  } catch (e) {
    dump.crash = String(e && e.stack ? e.stack : e).slice(0, 1500)
    console.error('[recon] 异常 ' + dump.crash)
    return 1
  } finally {
    dump.pageLog = pageLog.slice(-25)
    dump.bootTail = bootOut.slice(-15)
    await stopAll()
    dump.realEnvAfter = realFingerprint(realHome)
    dump.realEnvUnchanged = JSON.stringify(realBefore) === JSON.stringify(dump.realEnvAfter)
    writeFileSync(join(opts.out, 'recon.json'), JSON.stringify(dump, null, 2) + '\n')
    if (!opts.keepHome) {
      for (const k of ['home', 'userprofile', 'appdata', 'localappdata', 'edge', 'tmp', 'novels']) { try { rmSync(dirs[k], { recursive: true, force: true }) } catch { /* ignore */ } }
      let ok = false
      try { rmSync(root, { recursive: true, force: true }); ok = !existsSync(root) } catch { /* ignore */ }
      console.log('[recon] 隔离根已清理=' + String(ok) + '；侦察结果 → ' + join(opts.out, 'recon.json'))
    } else {
      console.log('[recon] --keep-home：隔离根保留在 ' + root)
    }
  }
}
const code = await main()
process.exit(code)
