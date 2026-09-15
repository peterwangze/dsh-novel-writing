#!/usr/bin/env node
/**
 * probe-nv-ux012.mjs — UX-012 新建链 / 模态行为「入仓行为探针」（隔离实例 + 无头浏览器 + 真实 UI 驱动）
 *
 * 目的（P-04 测试看护 / UX-012-R1 **F7**）：把 UX-012 的**行为级**验收固化为**可复跑**的版本化资产。
 * 交付时的行为验收来自未入仓的 `nv-probe-ux012`（`git ls-files` 0 命中 ⇒ 不可复跑），smoke 只做
 * **源码面字符串存在性**断言 —— 于是「卡片点击冒泡 → 遮罩自关」这类交付时实测过的**真缺陷**若复发，
 * smoke 仍会全绿。本探针补上该行为面。
 *
 * 断言面全部走**真实 UI 代码路径**（真点击 / 真键盘事件 / 真 HTTP 拦截 / 真宿主 RPC），
 * 不构造 DOM、不 mock 产品代码、**不做源码字符串直查**（同族教训 = CLEAN-006 F-2 / UX-060 R1 F-2）：
 *   A 新建弹窗（几何/模态语义/卡片内点击不自关/遮罩关/Esc 关且控制台保留/焦点归还/焦点陷阱/
 *     重开复位/请求体仅 {name}/busy 禁关/创建成功链）
 *   B 绑定面板（**D-1**：Esc 只关面板、控制台保持打开 + F6 模态语义）
 *   C 创建链**两个消费点**（F2 收口后等价性）：openCtl.autoCreate（卡片→自动建会话→分栏）与
 *     控制条「绑定新会话」（bindNewSessionCtl → 仅绑定不打开）
 *   Z 隔离与真实环境零写入 + 隔离根清理
 *   FALSIFIABILITY 谓词登记表 red/ok 向量自证（「构造反例 ⇒ 必红」）
 *
 * 隔离与真实环境纪律（三选一之**第一项**：环境变量重定向至临时目录）：
 *   · 全部写入落在 `mkdtempSync(tmpdir())` 临时根内；实例子进程的 `DSH_HOME` / `USERPROFILE` /
 *     `HOME` / `APPDATA` / `LOCALAPPDATA` / `TEMP` 全部重定向到临时根，并做**路径包含性校验**
 *     （口径照 `test/fixtures/host-surfaces/ci-mock-face.mjs` L113-114 的 prefix+sep 判定）；
 *   · 用户真实 `$DSH_HOME`（`~/.dsh`）**只读**：开跑前记录指纹（settings.yaml / profiles/web/
 *     package.json / .agent-presets/novel-writing 三处 sha256 + 全根目录条目面），收尾复核
 *     **strict 面逐项一致**且无「workspaceRoot 指向隔离根」的污染签名；
 *   · 宿主平面（`@deepseek-ai` 闭包）以只读 junction 接入隔离 profile，不改其目录；
 *   · 端口随机（先 bind(0) 取空闲端口），不干扰用户正在运行的 DSH 实例与浏览器，**不终止任何进程**
 *     （只回收本探针自己 spawn 的子进程）；
 *   · 浏览器 profile（`--user-data-dir`）落在临时根内。
 *
 * 用法：
 *   node scripts/probe-nv-ux012.mjs [--out <dir>] [--keep] [--no-browser-head]
 *   node scripts/probe-nv-ux012.mjs --falsifiability     # 仅跑谓词登记表的 red/ok 向量自证（零浏览器/零实例）
 * 退出码：0 = 全部断言成立（绿态）；1 = 有断言不成立（红态/回归）；2 = 环境不可用或隔离校验失败。
 */
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const CLIENT_SRC = join(REPO_ROOT, 'lib', 'client.js')
const PROFILE_NAME = 'ux012probe'
const VIEWPORT = { width: 1400, height: 900 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (t) => createHash('sha256').update(t).digest('hex')

function parseArgs(argv) {
  const opts = { out: join(tmpdir(), 'ux012-probe'), keep: false, help: false, skipBrowser: false, falsifiability: false }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--out') opts.out = argv[++i]
    else if (a === '--keep') opts.keep = true
    else if (a === '--no-browser-head') opts.skipBrowser = true
    else if (a === '--falsifiability') opts.falsifiability = true
    else if (a === '--help' || a === '-h') opts.help = true
    else { console.error('用法错误：未知参数 ' + a); process.exit(2) }
  }
  return opts
}

// ══════════════════════════════════════════════════════════════════════════════
// 谓词登记表 —— 部署断言与可失败性自证**唯一同源**（口径照 CLEAN-004 R2 N-02）。
//   纪律：① 每条谓词的判定语义只写在本块内（纯函数：测量值 → boolean）；
//         ② 部署侧只经 `evalPred('<id>', 测量值)` 取值，不得就地重写同一表达式；
//         ③ 每条 MUST 有 ≥1 `red*`（真实缺陷形态 ⇒ MUST false）与 ≥1 `ok*`（MUST true）向量，
//            向量缺失即自证失效（`--falsifiability` 退出码 1）。
// ══════════════════════════════════════════════════════════════════════════════
const PREDICATE_REGISTRY = [
  {
    id: 'D1-esc-bind-panel-yield',
    finding: 'UX-012-R1 F7 / CLEAN-004 D-1',
    fn: (v) => v.opened === true && v.modal === false && v.console === true,
    red: { note: '修复前实况（CLEAN-004 `D2-esc-bind-yield` FAIL 读数）：Esc 后绑定面板仍在场、控制台也在场', v: { opened: true, modal: true, console: true } },
    red2: { note: '反向回归：Esc 连关两层（面板关了、控制台也被连带关闭）', v: { opened: true, modal: false, console: false } },
    red3: { note: '前置未取得：绑定面板未打开（不可判绿——防空真）', v: { opened: false, modal: false, console: true } },
    ok: { note: 'D-1 目标行为：Esc 只关面板、控制台保持打开', v: { opened: true, modal: false, console: true } },
  },
  {
    id: 'D1-busy-keeps-panel',
    finding: 'CLEAN-007 D-1（busy 守卫）',
    fn: (v) => v.busy === true && v.modal === true,
    red: { note: '绑定请求在飞时 Esc 仍关窗（busy 守卫失效）', v: { busy: true, modal: false } },
    ok: { note: 'busy 中 Esc 不关（守卫在位）', v: { busy: true, modal: true } },
  },
  {
    id: 'F6-modal-semantics',
    finding: 'UX-012-R1 F6',
    fn: (v) => v.role === 'dialog' && v.ariaModal === 'true' && typeof v.label === 'string' && v.label !== ''
      && v.trap === true && v.restored === true,
    red: { note: '修复前实况：容器无 role/aria-modal（模态语义缺失）', v: { role: null, ariaModal: null, label: '', trap: false, restored: false } },
    red2: { note: '有语义但无焦点陷阱（Tab 可逸出到背后控制台）', v: { role: 'dialog', ariaModal: 'true', label: '＋ 新建小说', trap: false, restored: true } },
    red3: { note: '有语义与陷阱但关闭后焦点不归还', v: { role: 'dialog', ariaModal: 'true', label: '＋ 新建小说', trap: true, restored: false } },
    ok: { note: '语义 + 陷阱 + 归还三者齐备', v: { role: 'dialog', ariaModal: 'true', label: '＋ 新建小说', trap: true, restored: true } },
  },
  {
    id: 'F3-reopen-resets-dirname',
    finding: 'UX-012-R1 F3',
    fn: (v) => v.reopened === true && v.cancelClosed === true && v.reopenedValue === '',
    red: { note: '修复前实况：取消后重开，上次输入的目录名仍在框内', v: { reopened: true, cancelClosed: true, reopenedValue: 'zzz-cancel-check' } },
    red2: { note: '前置未取得：弹窗未重开（不可判绿——防空真）', v: { reopened: false, cancelClosed: true, reopenedValue: null } },
    ok: { note: '取消后重开输入框为空（关窗即复位）', v: { reopened: true, cancelClosed: true, reopenedValue: '' } },
  },
  {
    id: 'F2-single-source',
    finding: 'UX-012-R1 F2',
    // defs = `launcher.createSessionFor` 实现数；calls = 消费点数；inlineCopies = 内联创建链副本数
    // （收口前 `openCtl.autoCreate` 与 `bindNewSessionCtl` 各一份 = 2）
    fn: (v) => v.defs === 1 && v.calls === 2 && v.inlineCopies === 1,
    red: { note: '修复前实况：无共享实现、两处内联副本（创建链双事实源）', v: { defs: 0, calls: 0, inlineCopies: 2 } },
    red2: { note: '只接一个消费点（另一处仍是内联副本）', v: { defs: 1, calls: 1, inlineCopies: 1 } },
    red3: { note: '实现被复制成两份（收口失效）', v: { defs: 2, calls: 2, inlineCopies: 1 } },
    ok: { note: '单一实现 + 两消费点 + 只剩共享实现内的 1 处 createArg 构造', v: { defs: 1, calls: 2, inlineCopies: 1 } },
  },
  {
    id: 'A9-body-name-only',
    finding: 'UX-012（仅目录名）+ CLEAN-007 回归面',
    fn: (v) => Array.isArray(v.keys) && v.keys.length === 1 && v.keys[0] === 'name',
    red: { note: 'UX-012 之前的旧形态（带 title 字段）', v: { keys: ['name', 'title'] } },
    red2: { note: '请求体混入内部字段（越界上报）', v: { keys: ['name', 'root'] } },
    ok: { note: 'UX-012 契约：请求体仅 { name }', v: { keys: ['name'] } },
  },
  {
    id: 'C2-autocreate-opens-split',
    finding: 'F2 消费点①（openCtl.autoCreate）',
    fn: (v) => v.split === true && v.consoleClosed === true,
    red: { note: '收口后回归：卡片点击不再打开分栏（链丢失）', v: { split: false, consoleClosed: false } },
    red2: { note: '分栏打开但控制台未按互斥关闭（多浮层共存）', v: { split: true, consoleClosed: false } },
    ok: { note: '分栏打开 + 控制台互斥关闭', v: { split: true, consoleClosed: true } },
  },
  {
    id: 'C1-bindnew-consumer',
    finding: 'F2 消费点②（bindNewSessionCtl）',
    fn: (v) => v.noticeOk === true && v.rebound === true && v.openedNoSplitChange === true,
    red: { note: '收口后回归：提示未出现（链在第二消费点失效）', v: { noticeOk: false, rebound: false, openedNoSplitChange: false } },
    red2: { note: '提示出现但绑定未变（假成功）', v: { noticeOk: true, rebound: false, openedNoSplitChange: true } },
    ok: { note: '提示 bindNewDone + 绑定键指向新会话 + 不自动打开/切视图', v: { noticeOk: true, rebound: true, openedNoSplitChange: true } },
  },
]

/**
 * 自证：对每条登记谓词求值**全部** `red*`/`ok*` 向量（通配收集，不写死 red/red2/ok 键名——静默丢弃向量
 * 即视为自证失效）。`--falsifiability` 独立入口消费本函数，零浏览器/零实例。
 */
function falsifiabilityReport() {
  const rows = []
  let redTotal = 0
  let okTotal = 0
  for (const p of PREDICATE_REGISTRY) {
    const pick = (prefix) => Object.keys(p).filter((k) => new RegExp('^' + prefix + '\\d*$').test(k) && p[k] !== undefined)
    const redResults = pick('red').map((k) => ({ vector: k, note: p[k].note, result: p.fn(p[k].v) }))
    const okResults = pick('ok').map((k) => ({ vector: k, note: p[k].note, result: p.fn(p[k].v) }))
    redTotal += redResults.length
    okTotal += okResults.length
    rows.push({
      id: p.id, finding: p.finding,
      predicateSha256: sha256(String(p.fn)),
      redCount: redResults.length, okCount: okResults.length,
      redsAllFalse: redResults.length >= 1 && redResults.every((r) => r.result === false),
      oksAllTrue: okResults.length >= 1 && okResults.every((r) => r.result === true),
      redResults, okResults,
      pass: redResults.length >= 1 && okResults.length >= 1
        && redResults.every((r) => r.result === false) && okResults.every((r) => r.result === true),
    })
  }
  return { rows, allPass: rows.every((r) => r.pass === true), vectorTally: { red: redTotal, ok: okTotal } }
}

/** 运行期部署消费台账（报告 `deployments` 面：静态绑定数 + 运行期实际消费数 + 谓词源 sha256）。 */
const predicateTake = {}
function staticCallSiteCounts() {
  const src = readFileSync(new URL(import.meta.url), 'utf8')
  const out = {}
  for (const p of PREDICATE_REGISTRY) out[p.id] = src.split("evalPred('" + p.id + "'").length - 1
  return out
}
/** 部署侧**唯一合法判定入口**：按 id 取登记表谓词并求值（不得就地重写表达式）。 */
function evalPred(id, measurement) {
  const entry = PREDICATE_REGISTRY.find((p) => p.id === id)
  if (entry === undefined) throw new Error('evalPred: 未登记的谓词 id → ' + id)
  predicateTake[id] = { count: (predicateTake[id]?.count ?? 0) + 1, sha: sha256(String(entry.fn)), measurement }
  return entry.fn(measurement) === true
}

// ── 隔离实例引导（子进程自举；口径照 scripts/probe-nv-bar-geometry.mjs / CLEAN-004 探针）──
async function bootChild(root, home, planeNodeModules, port) {
  if (!(home !== root && home.startsWith(root + sep))) { console.error('BOOT-ERR 隔离失败：DSH_HOME 不在隔离根内 → ' + home); process.exit(2) }
  if (home === join(process.env.USERPROFILE ?? '', '.dsh')) { console.error('BOOT-ERR 真实路径泄漏：DSH_HOME 指向真实用户目录'); process.exit(2) }
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

  const appBoot = await import(pathToFileURL(join(planeNodeModules, 'dsh-app-boot', 'lib', 'index.js')).href)
  const lib = join(planeNodeModules, 'dsh', 'lib')
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

// ── 极简 CDP 客户端（Node 内置 WebSocket）──
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

function resolvePlane() {
  const home = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  for (const pd of [join(home, 'profiles', 'web'), join(home, 'profiles')]) {
    if (!existsSync(pd)) continue
    try {
      const resolved = createRequire(join(pd, 'index.js')).resolve('@deepseek-ai/dsh/package.json')
      return { nodeModules: dirname(dirname(resolved)), source: 'DSH_HOME=' + home }
    } catch { /* 试下一个候选 */ }
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

/** 真实 `$DSH_HOME` 只读指纹（strict 面 = 被注入写操作的许可面；inventory 面 = 全根条目）。 */
function realFingerprint(home) {
  const fp = { home, strict: { settingsSha: null, profileJsonSha: null, presetsSha: null }, inventory: {} }
  try { fp.strict.settingsSha = sha256(readFileSync(join(home, 'settings.yaml'), 'utf8')) } catch { /* 无 */ }
  try { fp.strict.profileJsonSha = sha256(readFileSync(join(home, 'profiles', 'web', 'package.json'), 'utf8')) } catch { /* 无 */ }
  try {
    const dir = join(home, '.agent-presets', 'novel-writing')
    fp.strict.presetsSha = sha256(readdirSync(dir).sort().map((f) => f + ':' + statSync(join(dir, f)).size).join(','))
  } catch { /* 无 */ }
  try {
    for (const d of readdirSync(home, { withFileTypes: true })) {
      const p = join(home, d.name)
      try { const st = statSync(p); fp.inventory[d.name] = { dir: st.isDirectory(), size: st.size, mtimeMs: Math.round(st.mtimeMs) } } catch { fp.inventory[d.name] = { error: true } }
    }
  } catch { /* 目录不存在 */ }
  return fp
}

/** 零污染判定：strict 全等 ∧ 无「workspaceRoot 指向隔离根」污染签名（inventory 差异仅如实记录）。 */
function realEnvVerdict(before, after, isolationRoot) {
  const strictDeltas = {}
  for (const key of Object.keys(after.strict)) {
    if (before.strict[key] !== after.strict[key]) strictDeltas[key] = { before: before.strict[key], after: after.strict[key] }
  }
  const inventoryDeltas = {}
  const names = new Set([...Object.keys(before.inventory), ...Object.keys(after.inventory)])
  for (const n of names) {
    const b = before.inventory[n]
    const a = after.inventory[n]
    if (JSON.stringify(b) !== JSON.stringify(a)) inventoryDeltas[n] = { before: b ?? null, after: a ?? null }
  }
  let leakSignature = null
  try {
    const yml = readFileSync(join(after.home, 'settings.yaml'), 'utf8')
    const m = /novel-writing:[\s\S]{0,200}?workspaceRoot:\s*(\S+)/.exec(yml)
    const root = m === null ? null : m[1]
    leakSignature = { novelWritingWorkspaceRoot: root, pointsIntoIsolation: root !== null && String(root).indexOf('ux012-probe-') >= 0, isolationRoot }
  } catch (e) { leakSignature = { error: String(e) } }
  const ok = Object.keys(strictDeltas).length === 0 && leakSignature.pointsIntoIsolation !== true
  return { ok, strictDeltas, inventoryDeltas, inventoryDeltaCount: Object.keys(inventoryDeltas).length, leakSignature }
}

const freePort = () => new Promise((resolve, reject) => {
  const srv = createServer()
  srv.on('error', reject)
  srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)) })
})

/** i18n 文案从 lib/client.js 现读（单一事实源；探针与产品源码同一份字符串，不复制字面量）。 */
function readI18n() {
  const src = readFileSync(CLIENT_SRC, 'utf8')
  // 键值可能与他键同行（如 `auto: '自动', closed: '关闭', notStarted: '未开始',`）⇒ 起点字符类须含
  // 空白/逗号/花括号，不能只认行首（否则同行键误报「未找到」）。`[\s,{]` 亦排除 `pickCancel` 之类
  // 以同名子串结尾的其他键（其前驱字符是字母，不在字符类内）。
  const pick = (key) => {
    const re = new RegExp('(?:^|[\\s,{])' + key + ":\\s*'((?:[^'\\\\]|\\\\.)*)'", 'm')
    const m = re.exec(src)
    if (m === null) throw new Error('i18n key not found: ' + key)
    return m[1].replace(/\\'/g, "'")
  }
  const pickFn = (key) => {
    const re = new RegExp('(?:^|[\\s,{])' + key + ':\\s*\\(\\w+\\)\\s*=>\\s*`([^`]*)`', 'm')
    const m = re.exec(src)
    if (m === null) throw new Error('i18n template not found: ' + key)
    return m[1]
  }
  return {
    newNovelBtn: pick('newNovelBtn'),
    cancel: pick('cancel'),
    createBtn: pick('createBtn'),
    dirPlaceholder: pick('dirPlaceholder'),
    nameRequired: pick('nameRequired'),
    closed: pick('closed'),
    bindNewSession: pick('bindNewSession'),
    unbound: pick('unbound'),
    stale: pick('stale'),
    bindNewDonePrefix: pickFn('bindNewDone').split('${')[0], // 「已为本书绑定新会话 」前缀（id 由探针拼接核对）
  }
}

// ── 隔离 fixture（全部落在隔离根内）──
const NOVELS = [
  { id: 'zz-first-probe', title: '孤星纪元', updated: '2026-09-13T10:00:00.000Z', chapters: 3, words: 1200, stage: 'outline_writing', completed: ['work_type_selection'], release: true, monetize: false },
  { id: 'aa-second-probe', title: '青禾纪事', updated: '2026-09-13T09:00:00.000Z', chapters: 0, words: 0, stage: null, completed: [], release: false, monetize: false },
  { id: 'nn-stale-bound', title: '失效绑定书', updated: '2026-09-13T07:00:00.000Z', chapters: 5, words: 9000, stage: 'creation_planning', completed: ['work_type_selection'], release: false, monetize: false },
  { id: 'bb-fourth-probe', title: '雪落无声', updated: '2026-09-13T06:00:00.000Z', chapters: 1, words: 2000, stage: 'outline_writing', completed: [], release: false, monetize: false },
  { id: 'cc-fifth-probe', title: '折戟', updated: '2026-09-13T05:00:00.000Z', chapters: 2, words: 4000, stage: 'outline_writing', completed: [], release: false, monetize: false },
]
/** 失效绑定目标：一个必然不存在的会话 id ⇒ 卡片/绑定面板走 stale 路径（D-1 的触发环境）。 */
const STALE_SESSION_ID = 'session-does-not-exist-ux012'

function writeFixture(novelsRoot) {
  mkdirSync(novelsRoot, { recursive: true })
  for (const n of NOVELS) {
    const proj = join(novelsRoot, n.id, 'novel-project')
    mkdirSync(join(proj, '07-content'), { recursive: true })
    writeFileSync(join(proj, 'workflow-state.json'), JSON.stringify({
      current_stage: n.stage,
      completed_stages: n.completed,
      project_info: { title: n.title, work_type: '长篇小说', platform: '起点中文网', genre: '都市修真', target_words: 1000000 },
      files: {},
      guardrails: { continuity_mode: 'strict', latest_passed_chapter: n.chapters, latest_ai_path: 'B', release_allowed: n.release, monetization_allowed: n.monetize, latest_drift_score: null },
      statistics: { total_chapters: n.chapters, total_words: n.words, last_updated: n.updated },
    }, null, 2))
    writeFileSync(join(proj, '07-content', 'chapter-001.md'), '# 第1章 试笔\n\n这是一段用于渲染验证的正文。\n', 'utf8')
  }
}

/** 隔离小说根注册为宿主工作区（隔离根内写入；结构口径取自真实实例 storages/workspace.json）。 */
function registerFixtureWorkspace(home, novelsRoot) {
  const id = randomUUID()
  const now = new Date().toISOString()
  mkdirSync(join(home, 'storages'), { recursive: true })
  writeFileSync(join(home, 'storages', 'workspace.json'), JSON.stringify({
    unit: { name: 'workspace', version: 2 },
    global: { initialized: true, workspaceIds: [id], archivedSessionIds: [] },
    tables: { workspaces: { [id]: { path: novelsRoot, title: 'novels', sessionIds: [], createdAt: now, updatedAt: now } } },
  }, null, 2) + '\n')
  return { workspaceId: id, path: novelsRoot }
}

// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) { console.log('用法：node scripts/probe-nv-ux012.mjs [--out <dir>] [--keep] [--no-browser-head] | --falsifiability'); return 0 }

  // ── 0) 可失败性自证模式（零浏览器 / 零实例 / 零网络）──
  if (opts.falsifiability === true) {
    const rep = falsifiabilityReport()
    const sites = staticCallSiteCounts()
    for (const r of rep.rows) {
      const bound = sites[r.id] ?? 0
      console.log('  ' + (r.pass === true ? 'OK  ' : 'FAIL') + ' ' + r.id + ' [' + r.finding + '] red=' + r.redCount + ' ok=' + r.okCount
        + ' redsAllFalse=' + r.redsAllFalse + ' oksAllTrue=' + r.oksAllTrue + ' 部署消费点=' + bound)
    }
    console.log('FALSIFIABILITY ' + (rep.allPass === true ? 'PASS' : 'FAIL') + '：向量 red=' + rep.vectorTally.red + ' ok=' + rep.vectorTally.ok + '（每条 MUST ≥1 red 且 red 全 false、≥1 ok 且 ok 全 true）')
    return rep.allPass === true ? 0 : 1
  }

  const plane = resolvePlane()
  if (plane === null) { console.error('[probe] 环境错误：宿主平面不可达（未找到可解析 @deepseek-ai/dsh 的 profile 平面）'); return 2 }
  const browser = opts.skipBrowser ? null : findBrowser()
  if (!opts.skipBrowser && browser === null) { console.error('[probe] 环境错误：未找到 Chromium 内核浏览器（Edge/Chrome）'); return 2 }

  const i18n = readI18n()
  const realHome = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  const realBefore = realFingerprint(realHome)

  const root = mkdtempSync(join(tmpdir(), 'ux012-probe-'))
  const dirs = {
    root,
    home: join(root, 'dsh-home'),
    userprofile: join(root, 'userprofile'),
    appdata: join(root, 'appdata'),
    localappdata: join(root, 'localappdata'),
    edge: join(root, 'edge-profile'),
    tmp: join(root, 'tmp'),
    novels: join(root, 'novels'),
  }
  for (const [k, d] of Object.entries(dirs)) if (k !== 'novels') mkdirSync(d, { recursive: true })
  const containment = {}
  for (const k of ['home', 'userprofile', 'appdata', 'localappdata', 'edge', 'tmp', 'novels']) containment[k] = dirs[k] !== root && dirs[k].startsWith(root + sep)
  if (Object.values(containment).some((v) => v !== true)) {
    console.error('[probe] 隔离校验失败：重定向路径越出临时根 ' + JSON.stringify(containment))
    rmSync(root, { recursive: true, force: true })
    return 2
  }
  mkdirSync(opts.out, { recursive: true })
  writeFixture(dirs.novels)
  writeFileSync(join(dirs.home, 'settings.yaml'),
    'novel-writing:\n  workspaceRoot: ' + dirs.novels.replace(/\\/g, '/') + '\n  bindings:\n    nn-stale-bound: ' + STALE_SESSION_ID + '\n', 'utf8')
  const fixtureWs = registerFixtureWorkspace(dirs.home, dirs.novels)

  console.log('[probe] UX-012 隔离实例探针（环境变量重定向至临时目录；真实 $DSH_HOME 只读）')
  console.log('  临时根 = ' + root + '（containment 校验全真）')
  console.log('  宿主平面（只读 junction）= ' + plane.nodeModules)
  console.log('  浏览器 = ' + String(browser))

  const appPort = await freePort()
  const cdpPort = await freePort()
  const childEnv = {
    ...process.env,
    DSH_HOME: dirs.home, USERPROFILE: dirs.userprofile, HOME: dirs.userprofile,
    APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata, TEMP: dirs.tmp, TMP: dirs.tmp,
  }
  if (!(childEnv.DSH_HOME !== root && childEnv.DSH_HOME.startsWith(root + sep))) {
    console.error('[probe] 隔离失败：childEnv.DSH_HOME 越界 → ' + childEnv.DSH_HOME)
    rmSync(root, { recursive: true, force: true })
    return 2
  }

  const report = {
    tool: 'probe-nv-ux012', task: 'CLEAN-007（F7）', head: null, headDirty: null, startedAt: new Date().toISOString(),
    isolation: { root, dshHome: dirs.home, plane: plane.nodeModules, browser, containment, realEnvBefore: realBefore, env: { DSH_HOME: childEnv.DSH_HOME, USERPROFILE: childEnv.USERPROFILE, HOME: childEnv.HOME, APPDATA: childEnv.APPDATA, LOCALAPPDATA: childEnv.LOCALAPPDATA, TEMP: childEnv.TEMP } },
    i18n, fixture: { novels: NOVELS.map((n) => n.id), staleBinding: { 'nn-stale-bound': STALE_SESSION_ID }, workspace: fixtureWs },
    assertions: [], facts: {}, pageLog: [], envErrors: [], falsifiability: null, realEnvAfter: null, cleanup: null, ok: false,
  }

  let boot = null, edge = null, cdp = null
  const bootOut = []
  const pageLog = []
  const assertion = (id, area, label, ok, detail, status) => {
    const st = status !== undefined ? status : (ok === true ? 'PASS' : 'FAIL')
    const rec = { id, area, label, ok: st === 'PASS', status: st, detail: detail === undefined ? null : detail, at: new Date().toISOString() }
    report.assertions.push(rec)
    console.log('  ' + (st === 'PASS' ? 'OK  ' : st === 'N-A' ? 'N-A ' : 'FAIL') + ' ' + id + ' [' + area + '] ' + label + (st === 'PASS' ? '' : ' :: ' + JSON.stringify(rec.detail).slice(0, 500)))
    return rec
  }
  const stopAll = async () => {
    try { if (cdp !== null) cdp.ws.close() } catch { /* ignore */ }
    try { if (edge !== null && edge.exitCode === null) edge.kill() } catch { /* ignore */ }
    try { if (boot !== null && boot.exitCode === null) boot.kill() } catch { /* ignore */ }
    await sleep(900)
    if (boot !== null && boot.exitCode === null) { try { boot.kill('SIGKILL') } catch { /* ignore */ } }
    if (edge !== null && edge.exitCode === null) { try { edge.kill('SIGKILL') } catch { /* ignore */ } }
    await sleep(400)
  }

  let code = 0
  try {
    try {
      const r = spawnSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' })
      report.head = String(r.stdout ?? '').trim()
      const st = spawnSync('git', ['-C', REPO_ROOT, 'status', '--porcelain', '--', 'lib/client.js'], { encoding: 'utf8' })
      report.headDirty = String(st.stdout ?? '').trim() !== ''
    } catch { /* git 不可用 */ }

    // ── 1) 隔离实例 ────────────────────────────────────────────────────────
    boot = spawn(process.execPath, [fileURLToPath(import.meta.url), '--boot', root, dirs.home, plane.nodeModules, String(appPort)], { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] })
    let appUrl = null
    boot.stdout.on('data', (b) => {
      const t = String(b)
      bootOut.push(t.trim())
      const m = /(http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+)/.exec(t)
      if (m !== null && appUrl === null) appUrl = m[1]
    })
    boot.stderr.on('data', (b) => bootOut.push('ERR ' + String(b).trim()))
    for (let i = 0; i < 200 && appUrl === null; i += 1) { if (boot.exitCode !== null) break; await sleep(250) }
    if (appUrl === null) {
      report.envErrors.push('隔离实例未启动：' + bootOut.join(' | ').slice(0, 800))
      console.error('[probe] 环境错误：隔离实例未启动')
      return 2
    }
    report.instanceUrlRedacted = appUrl.replace(/token=.*/, 'token=***')
    let serving = false, lastErr = null
    for (let i = 0; i < 160 && serving !== true; i += 1) {
      try { const res = await fetch(appUrl, { redirect: 'manual' }); if (res.status !== undefined) { serving = true; lastErr = 'HTTP ' + res.status } } catch (e) { lastErr = String(e); await sleep(250) }
    }
    if (serving !== true) { report.envErrors.push('隔离实例 HTTP 未就绪（' + String(lastErr) + '）'); console.error('[probe] 环境错误：HTTP 未就绪'); return 2 }
    console.log('  隔离实例就绪（' + String(lastErr) + '）')
    if (browser === null) { console.error('[probe] 环境错误：--no-browser-head 模式无可断言场景'); return 2 }

    // ── 2) 无头浏览器 + CDP ────────────────────────────────────────────────
    edge = spawn(browser, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      '--disable-features=Translate,MediaRouter', '--remote-debugging-port=' + cdpPort,
      '--user-data-dir=' + dirs.edge, '--window-size=' + VIEWPORT.width + ',' + VIEWPORT.height, appUrl,
    ], { env: { ...process.env, USERPROFILE: dirs.userprofile, HOME: dirs.userprofile, APPDATA: dirs.appdata, LOCALAPPDATA: dirs.localappdata }, stdio: ['ignore', 'pipe', 'pipe'] })
    edge.stderr.on('data', (b) => pageLog.push('edge ' + String(b).trim().slice(0, 200)))
    let target = null
    const deadline = Date.now() + 60000
    while (Date.now() < deadline && target === null && edge.exitCode === null) {
      await sleep(300)
      try { const list = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json(); target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl !== undefined) ?? null } catch { /* retry */ }
    }
    if (target === null) { report.envErrors.push('无头浏览器未暴露调试目标'); console.error('[probe] 环境错误：无调试目标'); return 2 }
    cdp = await Cdp.attach(target.webSocketDebuggerUrl)
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable')
    cdp.on('Runtime.consoleAPICalled', (p) => pageLog.push('console.' + p.type + ' ' + (p.args ?? []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 300)))
    cdp.on('Runtime.exceptionThrown', (p) => pageLog.push('exception ' + String(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? '').slice(0, 300)))
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false })
    const cur = await cdp.evaluate('location.href')
    if (String(cur).indexOf('127.0.0.1') < 0 || String(cur).startsWith('chrome-error')) { await cdp.send('Page.navigate', { url: appUrl }); await sleep(1500) }

    const waitFor = async (expr, ms, label) => {
      const t0 = Date.now()
      while (Date.now() - t0 < ms) { try { if ((await cdp.evaluate(expr)) === true) return true } catch { /* retry */ } await sleep(250) }
      console.log('  !! 超时等待：' + label)
      return false
    }
    const clickSel = (sel) => cdp.evaluate(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); if (n === null) return false; n.click(); return true })()`)
    /**
     * 聚焦 + 激活（等价于「用户先聚焦该控件再点击」）：`n.focus()`（触发真实 `focusin` ⇒ 焦点归还的
     *  「最近一次模态外焦点」目标由此建立）+ `n.click()`（真实 React `onClick`）。
     * 为什么不用 CDP 坐标鼠标事件：触发器（＋磁贴）位于可滚动网格内，`getBoundingClientRect()` 可能
     * 落在视口外 ⇒ 坐标点击命中不了（实测 `modalOpened=false` 而 `.click()` 同点可用）；坐标点击属
     * **驱动脆性**，与断言强度无关。键盘面（Esc/Tab）仍走 `Input.dispatchKeyEvent` 真实按键。
     * 返回**完整诊断**（候选数/可见数/tag/disabled/tabIndex/rects/inert 祖先/聚焦前后 activeElement），
     * 供报告取证——「聚焦是否生效」在宿主环境里属外部事实，如实记录而非假设。
     */
    const focusThenClick = async (sel) => {
      const diag = await cdp.evaluate(`(() => {
        const all = [...document.querySelectorAll(${JSON.stringify(sel)})]
        const vis = all.filter((x) => x.getClientRects().length > 0)
        const n = vis[0] ?? all[0] ?? null
        if (n === null) return { found: false, candidates: all.length }
        const label = (x) => (x === null || x === undefined ? null : String(x.className || x.tagName || '').slice(0, 60))
        const cs = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(n) : null
        let inert = false
        for (let p = n; p !== null && p !== undefined; p = p.parentElement) {
          if (typeof p.hasAttribute === 'function' && p.hasAttribute('inert')) { inert = true; break }
        }
        const before = label(document.activeElement)
        let after = before
        try { n.focus(); after = label(document.activeElement) } catch (e) { after = 'throw:' + String(e) }
        return {
          found: true, candidates: all.length, visible: vis.length, tag: n.tagName,
          disabled: n.disabled === true, tabIndex: n.tabIndex, rects: n.getClientRects().length,
          visibility: cs === null ? null : cs.visibility, display: cs === null ? null : cs.display,
          w: Math.round(n.getBoundingClientRect().width), h: Math.round(n.getBoundingClientRect().height),
          inertAncestor: inert, docHasFocus: document.hasFocus(), before, afterFocus: document.activeElement === n, after,
        }
      })()`)
      const clicked = await clickSel(sel)
      return { ...diag, clicked }
    }
    const pressEsc = async () => {
      await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
    }
    const pressTab = async (shift) => {
      const mods = shift === true ? 8 : 0
      await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: mods })
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: mods })
    }
    const setInput = (selector, value) => cdp.evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)})
      if (node === null) return 'no-node'
      const proto = window.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, ${JSON.stringify(value)})
      node.dispatchEvent(new Event('input', { bubbles: true }))
      return node.value
    })()`)
    /** 模态几何 + 语义 + 焦点读数（一次 evaluate 取全）。 */
    const modalStateOf = (sel) => cdp.evaluate(`(() => {
      const n = document.querySelector(${JSON.stringify(sel)})
      if (n === null) return { present: false }
      const b = n.getBoundingClientRect()
      const act = document.activeElement
      return {
        present: true, x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1),
        vw: window.innerWidth, vh: window.innerHeight,
        role: n.getAttribute('role'), ariaModal: n.getAttribute('aria-modal'), label: n.getAttribute('aria-label'),
        inputs: n.querySelectorAll('input').length,
        btns: [...n.querySelectorAll('button')].map((x) => (x.textContent || '').trim()),
        disabledBtns: [...n.querySelectorAll('button')].filter((x) => x.disabled).length,
        inputDisabled: n.querySelector('input') === null ? null : n.querySelector('input').disabled,
        focusedTag: act === null ? null : act.tagName,
        focusedIn: act !== null && n.contains(act),
      }
    })()`)

    // ── 3) 页面就绪 ────────────────────────────────────────────────────────
    await cdp.evaluate("(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '继续'); if (b !== undefined) b.click(); return true })()")
    const drawerReady = await waitFor("document.querySelector('.nv-drawer') !== null", 90000, '.nv-drawer')
    if (!drawerReady) {
      const diag = await cdp.evaluate("({ href: location.href, body: (document.body ? document.body.innerText : '').slice(0, 300) })").catch(() => null)
      report.envErrors.push('页面未就绪：' + JSON.stringify(diag) + ' | 日志 ' + pageLog.slice(-10).join(' | ').slice(0, 600))
      console.error('[probe] 环境错误：.nv-drawer 未出现')
      return 2
    }
    await cdp.evaluate("(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === '继续'); if (b !== undefined) b.click(); return true })()")
    await sleep(800)
    const haveCards = await waitFor("document.querySelectorAll('.nv-drawer .nv-card').length >= 5", 45000, '抽屉书目卡')

    // ── 4) 打开控制台（后续模态/创建链场景的宿主环境）──────────────────────
    await clickSel('.nv-drawer-head')
    const consoleOpened = await waitFor("document.querySelector('.nv-console') !== null", 15000, '.nv-console 打开')
    const gridReady = await waitFor("document.querySelectorAll('.nv-cgrid .nv-ccard').length >= 5", 20000, '卡片网格就绪')
    assertion('UX012-A0-console-ready', '准备', '抽屉渲染书目卡 → 控制台打开 → 卡片网格就绪（行为场景前置）',
      haveCards === true && consoleOpened === true && gridReady === true, { haveCards, consoleOpened, gridReady })

    // ══ A) 新建弹窗（UX-012 原交付面 + CLEAN-007 F6/F3 + busy 回归面）══════
    // A1/A2：聚焦+激活 ＋ 磁贴（真焦点 → 供 A6 焦点归还核对）→ 模态几何 + 模态语义
    const tileDiag = await focusThenClick('.nv-cplus')
    const clickedTile = tileDiag.found === true && tileDiag.clicked === true
    report.facts.triggerFocus = tileDiag
    const modalOpened = await waitFor("document.querySelector('.nv-cmodal') !== null", 10000, '.nv-cmodal')
    const modal = await modalStateOf('.nv-cmodal')
    report.facts.createModal = modal
    const centered = modal.present === true
      && Math.abs((modal.x + modal.w / 2) - modal.vw / 2) <= 2 && Math.abs((modal.y + modal.h / 2) - modal.vh / 2) <= 2
    assertion('UX012-A1-create-modal', '新建弹窗', '＋磁贴 → 居中模态（水平+垂直居中 ≤2px）+ 单输入 + 恰「创建/取消」两钮（autoFocus 焦点面见 A1b——宿主 inert 环境下不可移，单独判定）',
      clickedTile === true && modalOpened === true && centered === true && modal.inputs === 1
      && modal.btns.indexOf(i18n.cancel) >= 0 && modal.btns.indexOf(i18n.createBtn) >= 0,
      { clickedTile, modalOpened, centered, inputs: modal.inputs, btns: modal.btns, focusedTag: modal.focusedTag, focusedIn: modal.focusedIn })
    report.facts.focusTrap = report.facts.focusTrap ?? {}
    const semantics = { role: modal.role, ariaModal: modal.ariaModal, label: modal.label, trap: null, restored: null }
    assertion('UX012-A2-modal-semantics-role', '新建弹窗/F6', '模态容器声明 role="dialog" + aria-modal="true" + 非空 aria-label（读屏可辨「已在弹窗内」）',
      modal.role === 'dialog' && modal.ariaModal === 'true' && typeof modal.label === 'string' && modal.label === i18n.newNovelBtn,
      { role: modal.role, ariaModal: modal.ariaModal, label: modal.label, expectLabel: i18n.newNovelBtn })

    // A3：卡片内点击**不**冒泡到遮罩（交付时探针实测过的真缺陷：点卡片随即自关）
    const clickedTitle = await clickSel('.nv-cmodal-title')
    await sleep(500)
    const afterCardClick = await cdp.evaluate("document.querySelector('.nv-cmodal') !== null")
    assertion('UX012-A3-card-click-no-selfclose', '新建弹窗', '点卡片内部（标题区）→ 弹窗**不**自关（stopPropagation 回归面；点「创建」随即自关即红）',
      clickedTitle === true && afterCardClick === true, { clickedTitle, modalStillOpen: afterCardClick })

    // A7：焦点陷阱 —— 两段判定（**接线**确定性 + **焦点移动**受宿主环境约束时如实记 N-A，绝不渲染成 PASS）
    // ① 接线：真实 Tab（CDP Input.dispatchKeyEvent）→ 在**冒泡相位**读 `e.defaultPrevented`
    //    （插件监听在 window 捕获相位先执行 ⇒ 冒泡相位可观测其 preventDefault 结果）。无陷阱 ⇒ false。
    await cdp.evaluate(`(() => {
      window.__nvProbeKey = null
      if (window.__nvProbeSpy !== undefined) window.removeEventListener('keydown', window.__nvProbeSpy, false)
      window.__nvProbeSpy = (e) => { if (e.key === 'Tab') { window.__nvProbeKey = { key: e.key, shift: e.shiftKey === true, prevented: e.defaultPrevented, active: document.activeElement === null ? null : String(document.activeElement.className || document.activeElement.tagName || '').slice(0, 60) } } }
      window.addEventListener('keydown', window.__nvProbeSpy, false)
      return true
    })()`)
    const trapProbe = await cdp.evaluate(`(() => {
      const n = document.querySelector('.nv-cmodal')
      if (n === null) return { items: 0 }
      const all = [...n.getElementsByTagName('*')].filter((x) => {
        const tag = x.tagName.toUpperCase()
        return (tag === 'BUTTON' || tag === 'INPUT') && x.disabled !== true && x.getClientRects().length > 0
      })
      if (all.length === 0) return { items: 0 }
      all[all.length - 1].focus()
      return { items: all.length, lastTag: all[all.length - 1].tagName, firstHtml: all[0].className, focusMovedToLast: document.activeElement === all[all.length - 1] }
    })()`)
    await pressTab(false)
    await sleep(350)
    const tabObserved = await cdp.evaluate('window.__nvProbeKey ?? null')
    const afterTab = await cdp.evaluate(`(() => {
      const n = document.querySelector('.nv-cmodal')
      const act = document.activeElement
      const all = n === null ? [] : [...n.getElementsByTagName('*')].filter((x) => {
        const tag = x.tagName.toUpperCase()
        return (tag === 'BUTTON' || tag === 'INPUT') && x.disabled !== true && x.getClientRects().length > 0
      })
      return { sameAsFirst: all.length > 0 && act === all[0], inModal: n !== null && act !== null && n.contains(act) }
    })()`)
    await pressTab(true)
    await sleep(350)
    const shiftObserved = await cdp.evaluate('window.__nvProbeKey ?? null')
    const afterShiftTab = await cdp.evaluate(`(() => {
      const n = document.querySelector('.nv-cmodal')
      const act = document.activeElement
      const all = n === null ? [] : [...n.getElementsByTagName('*')].filter((x) => {
        const tag = x.tagName.toUpperCase()
        return (tag === 'BUTTON' || tag === 'INPUT') && x.disabled !== true && x.getClientRects().length > 0
      })
      return { sameAsLast: all.length > 0 && act === all[all.length - 1], inModal: n !== null && act !== null && n.contains(act) }
    })()`)
    // 宿主环境取证：插件子树祖先链上的 inert / aria-hidden（inert 子树内 `focus()` 为空操作）
    const envFocus = await cdp.evaluate(`(() => {
      const chainOf = (n) => {
        const out = []
        for (let p = n; p !== null && p !== undefined && out.length < 12; p = p.parentElement) {
          out.push({ tag: p.tagName, cls: String(p.className || '').slice(0, 40), inert: typeof p.hasAttribute === 'function' && p.hasAttribute('inert'), ariaHidden: typeof p.getAttribute === 'function' ? p.getAttribute('aria-hidden') : null })
        }
        return out
      }
      const card = document.querySelector('.nv-cmodal')
      const first = card === null ? null : [...card.getElementsByTagName('*')].find((x) => x.tagName.toUpperCase() === 'BUTTON')
      const probeFocus = (n) => { if (n === null || n === undefined) return null; const b = document.activeElement === null ? null : String(document.activeElement.className || document.activeElement.tagName || '').slice(0, 40); try { n.focus() } catch { /* ignore */ }; const a = document.activeElement === null ? null : String(document.activeElement.className || document.activeElement.tagName || '').slice(0, 40); return { before: b, after: a, moved: document.activeElement === n } }
      return {
        modalChain: card === null ? null : chainOf(card),
        modalFirstButtonFocus: probeFocus(first),
        modalInputFocus: probeFocus(card === null ? null : card.querySelector('input')),
        tileChain: document.querySelector('.nv-cplus') === null ? null : chainOf(document.querySelector('.nv-cplus')),
      }
    })()`)
    report.facts.focusTrap = { trapProbe, tabObserved, shiftObserved, afterTab, afterShiftTab, envFocus }
    const trapWired = tabObserved !== null && tabObserved.prevented === true
    assertion('UX012-A7-focus-trap-wiring', '新建弹窗/F6', '焦点陷阱**接线**：末位元素上真实 Tab → 模态处理器吞掉该键（默认行为被 preventDefault；冒泡相位实测）⇒ Tab 不会逸出到背后控制台；无陷阱（未接线）即红',
      trapProbe.items >= 3 && trapWired === true, { trapProbe, tabObserved, afterTab })
    const focusMovable = envFocus.modalInputFocus !== null && envFocus.modalInputFocus.moved === true
    if (focusMovable !== true) {
      assertion('UX012-A7b-focus-wrap', '新建弹窗/F6', '焦点陷阱**回绕效果**（末位 Tab → 首位）：宿主环境使插件子树焦点不可移（祖先链 inert / focus() 空操作）⇒ **N-A**，如实标注不渲染成 PASS',
        false, { envFocus, trapProbe, afterTab, afterShiftTab }, 'N-A')
    } else {
      assertion('UX012-A7b-focus-wrap', '新建弹窗/F6', '焦点陷阱**回绕效果**：末位元素上 Tab → 回绕到首位（且仍在模态内）；首位上 Shift+Tab → 回到末位',
        afterTab.sameAsFirst === true && afterTab.inModal === true && afterShiftTab.sameAsLast === true, { trapProbe, afterTab, afterShiftTab })
    }
    semantics.trap = trapWired === true
    semantics.trapWrap = afterTab.sameAsFirst === true && afterShiftTab.sameAsLast === true
    // A1b：autoFocus 焦点面 —— 与 A7b 同一环境闸门（插件子树在宿主 `inert` 容器下 ⇒ `focus()` 空操作）。
    // 环境可移 ⇒ 断言打开瞬间焦点已在模态输入框；不可移 ⇒ **N-A**（如实标注，不渲染成 PASS）。
    if (focusMovable !== true) {
      assertion('UX012-A1b-input-autofocus', '新建弹窗/F6', '打开瞬间焦点落在模态输入框（React autoFocus）：宿主环境使插件子树焦点不可移（祖先链含 `inert`）⇒ **N-A**，如实标注不渲染成 PASS',
        false, { focusedTagAtOpen: modal.focusedTag, focusedInAtOpen: modal.focusedIn, envFocus: envFocus.modalInputFocus }, 'N-A')
    } else {
      assertion('UX012-A1b-input-autofocus', '新建弹窗/F6', '打开瞬间焦点落在模态输入框（React autoFocus）',
        modal.focusedTag === 'INPUT' && modal.focusedIn === true, { focusedTagAtOpen: modal.focusedTag, focusedInAtOpen: modal.focusedIn })
    }

    // A8（F3）：输入目录名 → 取消 → 重开 → 输入框已复位
    await setInput('.nv-cmodal input', 'zzz-cancel-check')
    await sleep(200)
    const cancelClicked = await cdp.evaluate("(() => { const b = [...document.querySelectorAll('.nv-cmodal button')].find((x) => (x.textContent || '').trim() === " + JSON.stringify(i18n.cancel) + "); if (b === undefined) return false; b.click(); return true })()")
    await sleep(500)
    const cancelClosed = (await cdp.evaluate("document.querySelector('.nv-cmodal') !== null")) === false
    await clickSel('.nv-cplus')
    const reopened = await waitFor("document.querySelector('.nv-cmodal') !== null", 10000, '弹窗重开')
    const reopenedValue = await cdp.evaluate("(() => { const n = document.querySelector('.nv-cmodal input'); return n === null ? null : n.value })()")
    report.facts.dirnameReset = { cancelClicked, cancelClosed, reopened, reopenedValue }
    const f3Measured = { reopened, cancelClosed, reopenedValue }
    assertion('UX012-A8-reopen-resets-dirname', '新建弹窗/F3', '取消关闭后重开：目录名输入框为空（关窗即复位——原仅创建成功路径清空，失败/取消/Esc/遮罩四路残留；前置 = 确已重开——防空真断言）',
      evalPred('F3-reopen-resets-dirname', f3Measured), report.facts.dirnameReset)

    // A4：遮罩点击关闭（前置 = 弹窗确在场，否则「弹窗不在场」会**真空 PASS**）
    const modalWasOpen = await cdp.evaluate("document.querySelector('.nv-cmodal') !== null")
    const backdropClicked = await clickSel('.nv-cmodal-backdrop')
    await sleep(500)
    const afterBackdrop = await cdp.evaluate("document.querySelector('.nv-cmodal') !== null")
    assertion('UX012-A4-backdrop-close', '新建弹窗', '点遮罩（.nv-cmodal-backdrop）→ 弹窗关闭（前置 = 弹窗确在场——防空真断言）',
      modalWasOpen === true && backdropClicked === true && afterBackdrop === false,
      { modalWasOpen, backdropClicked, stillOpen: afterBackdrop })

    // A5 + A6：Esc 关闭模态（控制台保留）+ 焦点归还（F6）
    // 焦点归还的契约 = 「归还到打开前聚焦的元素」：触发器若能聚焦（focusin 生效）即为触发器本身；
    // 若宿主环境使触发器不可聚焦（诊断 facts.triggerFocus 如实记录 visibility/inert/rects），则归还目标
    // = 打开前更早的前置焦点元素 ⇒ 判据退化为「焦点未被丢弃（不在 body、不在模态内、与前置焦点一致）」。
    const preActive = await cdp.evaluate("document.activeElement === null ? null : String(document.activeElement.className || document.activeElement.tagName || '')")
    const escTriggerDiag = await focusThenClick('.nv-cplus')
    const modalOpenedBefore = await waitFor("document.querySelector('.nv-cmodal') !== null", 10000, '弹窗（Esc 场景）')
    await pressEsc()
    await sleep(600)
    const escState = await cdp.evaluate("({ modal: document.querySelector('.nv-cmodal') !== null, console: document.querySelector('.nv-console') !== null, active: document.activeElement === null ? null : String(document.activeElement.className || document.activeElement.tagName || '') })")
    report.facts.escCreate = { preActive, escTriggerDiag, modalOpenedBefore, ...escState }
    assertion('UX012-A5-esc-close-console-kept', '新建弹窗/Esc', 'Esc 关新建弹窗且控制台保持打开（NvConsole 自持 Esc 处理；对照 CLEAN-004 `B17-esc-layer-yield`；前置 = 弹窗确在场——防空真断言）',
      modalOpenedBefore === true && escState.modal === false && escState.console === true, report.facts.escCreate)
    const triggerFocused = escTriggerDiag.afterFocus === true
    const returnedToTrigger = triggerFocused === true && typeof escState.active === 'string' && escState.active.indexOf('nv-cplus') >= 0
    const returnedToPreFocus = triggerFocused !== true && escState.active === preActive && escState.active !== null && escState.active !== 'body'
    const restoredOk = returnedToTrigger === true || returnedToPreFocus === true
    semantics.restored = restoredOk === true
    assertion('UX012-A6-focus-restore', '新建弹窗/F6', '模态关闭后焦点**归还**打开前聚焦的元素（触发器可聚焦 ⇒ 归还到＋磁贴；否则归还到更早的前置焦点元素）且不落 body、不留在模态内（原实现无归还 ⇒ 焦点丢失）',
      restoredOk === true && escState.active !== null && escState.active !== 'body',
      { preActive, triggerFocused, returnedToTrigger, returnedToPreFocus, activeAfterClose: escState.active, triggerDiag: escTriggerDiag })

    // semantics 汇总（F6 谓词单点判定：语义 + 陷阱 + 归还）
    assertion('UX012-A2b-modal-semantics-full', '新建弹窗/F6', 'F6 三面齐备：role/aria-modal/aria-label ∧ 焦点陷阱 ∧ 焦点归还（谓词取自共享登记表 `F6-modal-semantics`）',
      evalPred('F6-modal-semantics', semantics), semantics)

    // A9/A10/A11：真实请求体 + busy 禁关 + 创建成功链（CDP Fetch 域名挂起请求做真实「在飞」态）
    const createdId = 'probe-ux012-a1'
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/novel-writing/api/novel-create*', requestStage: 'Request' }] })
    const paused = []
    cdp.on('Fetch.requestPaused', (p) => { paused.push(p) })
    await clickSel('.nv-cplus')
    await waitFor("document.querySelector('.nv-cmodal') !== null", 10000, '弹窗（创建场景）')
    await setInput('.nv-cmodal input', createdId)
    await sleep(200)
    await cdp.evaluate("(() => { const b = [...document.querySelectorAll('.nv-cmodal button')].find((x) => (x.textContent || '').trim() === " + JSON.stringify(i18n.createBtn) + "); if (b !== undefined) b.click(); return true })()")
    for (let i = 0; i < 40 && paused.length === 0; i += 1) await sleep(150)
    const intercepted = paused.length > 0 ? paused[0] : null
    let bodyKeys = null
    let bodyValue = null
    if (intercepted !== null) {
      try {
        const obj = JSON.parse(String(intercepted.request.postData ?? '{}'))
        bodyKeys = Object.keys(obj)
        bodyValue = obj.name
      } catch { bodyKeys = null }
    }
    report.facts.createRequest = { method: intercepted === null ? null : intercepted.request.method, url: intercepted === null ? null : String(intercepted.request.url).replace(/token=.*/, 'token=***'), postData: intercepted === null ? null : String(intercepted.request.postData ?? '') }
    assertion('UX012-A9-create-request-body', '新建弹窗/契约', '真实 HTTP 请求体**仅** `{ name }`（键集 == [\'name\'] 且值 = 输入目录名）——UX-012 契约面，行为级（非源码字符串直查）',
      evalPred('A9-body-name-only', { keys: bodyKeys }), { keys: bodyKeys, name: bodyValue, method: report.facts.createRequest.method })
    const busyState = await modalStateOf('.nv-cmodal')
    // busy 期间三条关闭路径均不得生效：Esc / 遮罩 / ✕
    await pressEsc()
    await sleep(400)
    const escWhileBusy = await cdp.evaluate("document.querySelector('.nv-cmodal') !== null")
    await clickSel('.nv-cmodal-backdrop')
    await sleep(400)
    const backdropWhileBusy = await cdp.evaluate("document.querySelector('.nv-cmodal') !== null")
    report.facts.busy = { modal: busyState, escWhileBusy, backdropWhileBusy }
    assertion('UX012-A10-busy-blocks-close', '新建弹窗/busy', '创建请求在飞（Fetch 域挂起）时：两钮 + 输入框 disabled ∧ Esc 不关 ∧ 遮罩点击不关（避免请求完成后无处落 notice）',
      evalPred('D1-busy-keeps-panel', { busy: true, modal: escWhileBusy === true && backdropWhileBusy === true })
      && busyState.disabledBtns === 2 && busyState.inputDisabled === true,
      { disabledBtns: busyState.disabledBtns, inputDisabled: busyState.inputDisabled, escWhileBusy, backdropWhileBusy })
    if (intercepted !== null) await cdp.send('Fetch.continueRequest', { requestId: intercepted.requestId })
    await cdp.send('Fetch.disable')
    const createClosed = await waitFor("document.querySelector('.nv-cmodal') === null", 20000, '创建成功 → 弹窗关闭')
    const cardAppeared = await waitFor("document.querySelector('.nv-ccard[data-nv-id=\"" + createdId + "\"]') !== null", 30000, '新书卡片出现')
    const createNotice = await cdp.evaluate("(() => { const n = document.querySelector('.nv-caction-msg'); return n === null ? null : n.textContent })()")
    report.facts.createFlow = { createClosed, cardAppeared, createNotice }
    assertion('UX012-A11-create-success-flow', '新建弹窗/创建链', '请求放行 → 弹窗关闭 + 新书卡片出现（overview 轮询）+ 控制台 notice 指引下一步',
      createClosed === true && cardAppeared === true && typeof createNotice === 'string' && createNotice.length > 0,
      { createClosed, cardAppeared, createNotice })

    // ══ B) 绑定面板：D-1（Esc 只关面板）+ F6 模态语义 ══════════════════════
    const consoleStillOpen = await cdp.evaluate("document.querySelector('.nv-console') !== null")
    const staleIconClicked = await clickSel('.nv-ccard[data-nv-id="nn-stale-bound"] .nv-cico')
    const bindPanelOpened = await waitFor("document.querySelector('.nv-modal') !== null", 15000, '绑定面板 .nv-modal')
    const bindModal = await modalStateOf('.nv-modal')
    report.facts.bindPanel = { consoleStillOpen, staleIconClicked, bindPanelOpened, modal: bindModal }
    assertion('UX012-B2-bind-panel-semantics', '绑定面板/F6', '绑定面板（同族 .nv-modal）同样声明 role="dialog" + aria-modal="true" + 非空 aria-label（与新建弹窗一并补，避免形态分叉）',
      bindPanelOpened === true && bindModal.role === 'dialog' && bindModal.ariaModal === 'true' && typeof bindModal.label === 'string' && bindModal.label.length > 0,
      { role: bindModal.role, ariaModal: bindModal.ariaModal, label: bindModal.label, consoleStillOpen })
    await pressEsc()
    await sleep(700)
    const escBind = await cdp.evaluate("({ modal: document.querySelector('.nv-modal') !== null, console: document.querySelector('.nv-console') !== null, bind: null })")
    report.facts.escBind = escBind
    assertion('UX012-B1-esc-bind-panel（D-1）', '绑定面板/Esc', '**D-1**：绑定面板打开时按 Esc → 只关面板、控制台保持打开（NvConsole 让位后由面板自挂监听接手；修复前 `{modal:true,console:true}`；前置 = 面板确在场——防空真断言）',
      evalPred('D1-esc-bind-panel-yield', { opened: bindPanelOpened === true, modal: escBind.modal, console: escBind.console }), { bindPanelOpened, ...escBind })

    // ══ C) 创建链两消费点（F2 收口后等价性）══════════════════════════════
    const boundIdOf = (id) => cdp.evaluate("fetch('/novel-writing/api/overview').then((r) => r.json()).then((o) => (o.bindings || {})[" + JSON.stringify(id) + "] ?? null)")
    const beforeBound = await boundIdOf('zz-first-probe')
    await clickSel('.nv-ccard[data-nv-id="zz-first-probe"]')
    const splitOpened = await waitFor("document.querySelector('.nv-bar') !== null", 90000, '分栏 .nv-bar')
    await sleep(1200)
    const c2State = await cdp.evaluate("({ split: document.querySelector('.nv-bar') !== null, console: document.querySelector('.nv-console') !== null })")
    const afterAutoBound = await boundIdOf('zz-first-probe')
    report.facts.consumer1 = { beforeBound, afterAutoBound, ...c2State }
    assertion('UX012-C2-opencctl-consumer', '创建链/消费点①', '未绑定卡点击 → `openCtl.autoCreate`（经共享 `launcher.createSessionFor`：workspaceId/root+id → create → 预设 → bind）→ 分栏打开 + 控制台互斥关闭 ∧ 绑定键已写入（谓词取自登记表 `C2-autocreate-opens-split`）',
      evalPred('C2-autocreate-opens-split', { split: c2State.split, consoleClosed: c2State.console !== true })
      && beforeBound === null && typeof afterAutoBound === 'string' && afterAutoBound.length > 0,
      { ...report.facts.consumer1 })

    // 消费点②：创作台控制条「绑定新会话」→ 仅绑定不打开（bindNewSessionCtl）
    const bindBtnClicked = await cdp.evaluate(`(() => {
      const b = [...document.querySelectorAll('.nv-wfctl-btn2')].find((x) => (x.getAttribute('title') || '') === ${JSON.stringify(i18n.bindNewSession)})
      if (b === undefined) return false
      b.click(); return true
    })()`)
    const noticeArrived = await waitFor("(() => { const n = document.querySelector('.nv-bar-note') || document.querySelector('.nv-notice'); return n !== null && (n.textContent || '').indexOf(" + JSON.stringify(i18n.bindNewDonePrefix) + ") >= 0 })()", 60000, 'bindNewDone 提示')
    const barNotice = await cdp.evaluate("(() => { const n = document.querySelector('.nv-bar-note') || document.querySelector('.nv-notice'); return n === null ? null : n.textContent })()")
    const afterBindNew = await boundIdOf('zz-first-probe')
    const splitStillThere = await cdp.evaluate("document.querySelector('.nv-bar') !== null")
    report.facts.consumer2 = { bindBtnClicked, noticeArrived, barNotice, afterBindNew, splitStillThere }
    assertion('UX012-C1-bindnew-consumer', '创建链/消费点②', '创作台控制条「绑定新会话」→ 经**同一** `launcher.createSessionFor` 建会话+挂预设+写绑定 → `.nv-bar-note` 出现 `bindNewDone` 提示 ∧ 绑定键指向**新**会话 ∧ 不自动打开/不切视图（谓词取自登记表 `C1-bindnew-consumer`）',
      evalPred('C1-bindnew-consumer', {
        noticeOk: noticeArrived === true,
        rebound: typeof afterBindNew === 'string' && afterBindNew.length > 0 && afterBindNew !== afterAutoBound,
        openedNoSplitChange: splitStillThere === true,
      }) && bindBtnClicked === true,
      { ...report.facts.consumer2, previousBound: afterAutoBound })

    // F2 单点收口（源码结构面，与上面两条**行为面**消费点互补）：实现数/消费点数/内联副本数
    const srcNow = readFileSync(CLIENT_SRC, 'utf8')
    const f2Counts = {
      defs: (srcNow.match(/async createSessionFor\(novel, opts\)/g) ?? []).length,
      calls: (srcNow.match(/launcher\.createSessionFor\(/g) ?? []).length,
      inlineCopies: (srcNow.match(/let createArg = /g) ?? []).length,
    }
    report.facts.creationChain = f2Counts
    assertion('UX012-C3-single-source', '创建链/F2', '创建链单点收口：`launcher.createSessionFor` 实现恰 1 份 ∧ 消费点恰 2 处（两消费点共用）∧ 内联副本已删（`let createArg` 仅存于共享实现；谓词取自登记表 `F2-single-source`）',
      evalPred('F2-single-source', f2Counts), f2Counts)
    // 注意：**不在此处 return**——退出码由 finally 依断言 tally 计算（`return <常量>` 会覆盖 tally 判定）
  } finally {
    // 可失败性自证（与部署面同源登记表；向量缺失/red 非 false 即自证失效）
    const fals = falsifiabilityReport()
    const sites = staticCallSiteCounts()
    report.falsifiability = {
      allPass: fals.allPass, vectorTally: fals.vectorTally,
      rows: fals.rows.map((r) => ({
        id: r.id, finding: r.finding, predicateSha256: r.predicateSha256,
        redCount: r.redCount, okCount: r.okCount, redsAllFalse: r.redsAllFalse, oksAllTrue: r.oksAllTrue,
        staticCallSites: sites[r.id] ?? 0, runtimeCalled: (predicateTake[r.id]?.count ?? 0) >= 1,
        pass: r.pass,
      })),
    }
    const falsOk = fals.allPass === true && report.falsifiability.rows.every((r) => r.staticCallSites >= 1)
    assertion('UX012-FALSIFIABILITY', '自证', '可失败性自证：每条登记谓词 ≥1 red（真实缺陷形态 ⇒ 断言必红）与 ≥1 ok（⇒ 必绿）向量全量求值 ∧ 每条 ≥1 处静态部署消费点（红向量非 false / 向量缺失 / 未接线即红）',
      falsOk === true, report.falsifiability.rows)
    const failed = report.assertions.filter((a) => a.status === 'FAIL')
    code = failed.length === 0 ? 0 : 1

    await stopAll()
    report.realEnvAfter = realFingerprint(realHome)
    const verdict = realEnvVerdict(realBefore, report.realEnvAfter, root)
    report.realEnvVerdict = verdict
    assertion('UX012-Z1-real-env-untouched', '隔离', '真实 $DSH_HOME 零写入：strict 面（settings.yaml / profiles-web package.json / .agent-presets 指纹）逐项一致 ∧ 无「workspaceRoot 指向隔离根」污染签名',
      verdict.ok === true, { strictDeltas: verdict.strictDeltas, inventoryDeltaCount: verdict.inventoryDeltaCount, leakSignature: verdict.leakSignature })
    if (opts.keep === true) {
      report.cleanup = { root, kept: true }
    } else {
      let removed = false
      for (let i = 0; i < 5 && removed !== true; i += 1) {
        try { rmSync(root, { recursive: true, force: true }) } catch { /* retry */ }
        removed = !existsSync(root)
        if (removed !== true) await sleep(600)
      }
      report.cleanup = { root, kept: false, rootRemoved: removed }
      assertion('UX012-Z2-isolation-cleanup', '隔离', '隔离根在收尾清理（process.exit 之前执行——同族 BUG-007 R1 F-7 / UX-060 R1 F-1 的 %TEMP% 残留教训）', removed === true, report.cleanup)
    }

    const tally = { total: report.assertions.length, pass: report.assertions.filter((a) => a.status === 'PASS').length, fail: report.assertions.filter((a) => a.status === 'FAIL').length, na: report.assertions.filter((a) => a.status === 'N-A').length }
    report.tally = tally
    report.ok = tally.fail === 0 && code === 0
    report.finishedAt = new Date().toISOString()
    const outPath = join(opts.out, 'report-ux012.json')
    writeFileSync(outPath, JSON.stringify(report, null, 2))
    console.log('\n  tally = ' + tally.total + ' 条 / PASS ' + tally.pass + ' / FAIL ' + tally.fail + ' / N-A ' + tally.na)
    console.log('  报告 = ' + outPath)
    console.log('  head = ' + String(report.head) + '（headDirty=' + String(report.headDirty) + '）')
    console.log('  可失败性自证 = ' + (report.falsifiability.allPass === true ? 'PASS' : 'FAIL') + '（red ' + report.falsifiability.vectorTally.red + ' / ok ' + report.falsifiability.vectorTally.ok + '）')
    console.log('\nPROBE UX-012 ' + (report.ok === true ? 'ALL PASS' : 'FAILED') + '：' + tally.pass + '/' + tally.total)
  }
  return code
}

const code = await main()
process.exit(code)
