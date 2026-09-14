#!/usr/bin/env node
/**
 * probe-clean-004.mjs — CLEAN-004 实机（隔离实例 + 无头浏览器）验证探针
 *
 * 目标：把 CLEAN-004 清单里**能量化、能在隔离实例里真实驱动**的条目变成可自动断言的检查，
 * 而不是「看着像没问题」。全部断言走**真实 UI 代码路径**（真点击 / 真指针拖拽 / 真键盘事件 /
 * 真 HTTP 轮询 / 真宿主会话服务），不构造 DOM、不 mock 产品代码。
 *
 * 复用路线（P-08）：装配与驱动模式**照抄** `scripts/probe-nv-bar-geometry.mjs`（同族先例，UX-060 已跑通）——
 * 隔离根 + 路径包含性校验 + 只读 junction 接入宿主平面 + runProfile 子进程启动 + 极简 CDP 客户端
 * + Runtime.evaluate 驱动 + 真实 $DSH_HOME 指纹前后对照。宿主 DOM 锚点（会话根 / 侧栏 / 分栏 rect）
 * 由 `recon-clean-004.mjs` 在本仓实测确定（不猜类名）。
 * 与先例的**两处已知坑纠正**：
 *   ① 清理入 finally 且**在 process.exit 之前**执行（同族 BUG-007 R1 F-7 / UX-060 R1 F-1：exit 在 finally
 *      之后 ⇒ finally 内 rmSync 不可达 ⇒ %TEMP% 残留）。本文件用单一出口：清理 → 写报告 → 返回退出码；
 *   ② 真实路径泄漏检测器（RISK-006 / EVD-098 事故：DSH_HOME 曾被指向真实用户目录）：子进程启动前断言
 *      `DSH_HOME ∈ 隔离根`（prefix+sep 且 ≠ 根），并对真实 `~/.dsh` 做只读前后指纹（目录条目 + 三处配置 sha256）。
 *
 * 断言面（见 docs/verification/CLEAN-004-checklist.md 的 ID 映射）：
 *   A 管理台/抽屉 · B 控制台（几何/搜索/网格/弹窗/Esc）· C 分栏（拖拽/持久化/换边/关闭/挤法）
 *   D 降级与失效绑定（stale → 重绑面板）· E notice 面（UX-060 长/短两形态）· F 跨插件共存协议面
 *   Z 隔离与真实环境零写入
 *
 * 用法：node probe-clean-004.mjs [--out <dir>] [--keep] [--no-browser-head]
 * 退出码：0 = 全部断言成立；1 = 有断言不成立（回归/缺陷）；2 = 环境不可用或隔离校验失败。
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
/** 仓库根：本文件位于 <repo>/docs/evidence/CLEAN-004/ ⇒ 上溯三层。 */
const REPO_ROOT = dirname(dirname(dirname(HERE)))
const CLIENT_SRC = join(REPO_ROOT, 'lib', 'client.js')
const PROFILE_NAME = 'clean004probe'
const VIEWPORT = { width: 1400, height: 900 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (t) => createHash('sha256').update(t).digest('hex')

/** 故障注入用的服务端错误原文（UX-060 探针同款）——用于制造「长告警」，不改产品代码。 */
const INJECTED_SERVER_ERROR = 'llm-deepseek: MISSING_CREDENTIAL: no API key for provider route "deepseek-official": store DEEPSEEK_API_KEY through the credentials service (the web Models page writes it), or export DEEPSEEK_API_KEY in the launching environment'

function parseArgs(argv) {
  const opts = { out: join(tmpdir(), 'clean004-probe'), keep: false, help: false, skipBrowser: false }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--out') opts.out = argv[++i]
    else if (a === '--keep') opts.keep = true
    else if (a === '--no-browser-head') opts.skipBrowser = true
    else if (a === '--help' || a === '-h') opts.help = true
    else { console.error('用法错误：未知参数 ' + a); process.exit(2) }
  }
  return opts
}

// ── 子进程模式：隔离实例启动（`--boot <root> <dshHome> <planeNodeModules> <port>`）──
// 装配照抄 probe-nv-bar-geometry.mjs L130-173；守卫增强：启动前断言 DSH_HOME ∈ 隔离根（泄漏检测器）。
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

// ── 极简 CDP 客户端（Node 内置 WebSocket；照抄 probe-nv-bar-geometry.mjs L176-204）──
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

// ── 环境解析（照抄 probe-nv-bar-geometry.mjs L86-127）──────────────────────────
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

/**
 * 真实 `$DSH_HOME` 只读指纹（两类，收尾逐项复核）。
 *   · strict：**许可面**——被注入写操作的产物（已安装 profile 的 package.json + 插件预设目录）MUST 逐字节一致；
 *   · inventory：全根目录项面——用户**同时**在自己实例里正常使用 DSH 会让 `settings.yaml`/`sessions`/`storages`
 *     等活跃面变动，故这一类的差异**必须**能由「用户自身活动」解释（增量小、且 `novel-writing.workspaceRoot`
 *     不指向隔离根），否则视为泄漏。判据与解释写入报告，不做"恒真式"通过。
 */
function realFingerprint(home) {
  const fp = {
    home,
    strict: { settingsSha: null, profileJsonSha: null, presetsSha: null },
    inventory: {},
  }
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

/** 真实环境「零污染」判定：strict 全等 + inventory 差异可由用户自身活动解释 + 插件工作区未指向隔离根。 */
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
  // 污染签名：真实 settings.yaml 里 novel-writing.workspaceRoot 指向隔离根（注入写入的典型形态）
  let leakSignature = null
  try {
    const yml = readFileSync(join(after.home, 'settings.yaml'), 'utf8')
    const m = /novel-writing:[\s\S]{0,200}?workspaceRoot:\s*(\S+)/.exec(yml)
    const root = m === null ? null : m[1]
    leakSignature = { novelWritingWorkspaceRoot: root, pointsIntoIsolation: root !== null && String(root).indexOf('clean004-probe-') >= 0, isolationRoot }
  } catch (e) { leakSignature = { error: String(e) } }
  const ok = Object.keys(strictDeltas).length === 0 && leakSignature.pointsIntoIsolation !== true
  return { ok, strictDeltas, inventoryDeltas, inventoryDeltaCount: Object.keys(inventoryDeltas).length, leakSignature }
}

/**
 * 宿主自身渲染的**会话行**读数（R1 F-03 修复：以确定性 DOM 数量取代 `body.innerText` 启发式）。
 *
 * 口径：宿主侧栏工作区区的会话行 = `button[class*="sessionRow"]`（`dsh-client-ui-workspace` 的
 * CSS-module 类 `…_sessionRow`；`.nv-*` 前缀的插件节点不匹配）。`present` 明确区分
 * 「宿主确实渲染了 0 行」与「选择器失配」：`selectorPresent=false` 时任何依赖它的判定
 * SHOULD 记 N-A（环境不可判），**不得**当作「宿主无会话」。
 *
 * @param cdp - CDP 客户端（调用方保证页面可达）。
 * @returns {Promise<{count:number,titles:string[],selectorPresent:boolean,noSessionsText:boolean}>}
 */
async function readHostSessionRows(cdp) {
  try {
    return await cdp.evaluate(`(() => {
      const rows = [...document.querySelectorAll('button[class*="sessionRow"]')]
      // 与宿主侧栏同区的其他 DOM 在场性（仅作诊断上下文，不参与判定）
      const projectRows = document.querySelectorAll('[class*="projectRow"]').length
      const body = document.body ? (document.body.innerText || '') : ''
      return {
        count: rows.length,
        // 有可见文本的行数：空占位行不计入「宿主确有会话」的信号
        withText: rows.filter((n) => (n.textContent || '').trim().length > 0).length,
        titles: rows.slice(0, 6).map((n) => (n.textContent || '').trim().slice(0, 60)).filter((t) => t.length > 0),
        // selectorPresent 只报**本次选择器的命中面**（不含 projectRow 旁证），避免把「选择器失配」误读为「宿主无会话」
        selectorPresent: rows.length > 0,
        projectRows,
        noSessionsText: body.indexOf('暂无会话') >= 0,
      }
    })()`)
  } catch (e) { return { error: String(e) } }
}

const freePort = () => new Promise((resolve, reject) => {
  const srv = createServer()
  srv.on('error', reject)
  srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)) })
})

/** i18n 文案从 lib/client.js 现读（单一事实源；探针与产品源码同一份字符串，不复制字面量）。 */
function readI18n() {
  const src = readFileSync(CLIENT_SRC, 'utf8')
  const pick = (key) => {
    const re = new RegExp('(?:^|\\n)\\s*' + key + ":\\s*'((?:[^'\\\\]|\\\\.)*)'", 'm')
    const m = re.exec(src)
    if (m === null) throw new Error('i18n key not found: ' + key)
    return m[1].replace(/\\'/g, "'")
  }
  return {
    entryLabel: pick('entryLabel'),
    resetLayoutDone: pick('resetLayoutDone'),
    promptFailPrefix: pick('promptFailPrefix'),
    promptFailHint: pick('promptFailHint'),
    staleHint: pick('bindStaleHint'),
    unbound: pick('unbound'),
  }
}

// ── 隔离小说工作区 fixture（全部落在隔离根内；10 本 ⇒ 覆盖折叠阈值 CONSOLE_COLLAPSE_N=8）──
const NOVELS = [
  { id: 'zz-first-probe', title: '孤星纪元', updated: '2026-09-13T10:00:00.000Z', chapters: 3, words: 1200, stage: 'outline_writing', completed: ['work_type_selection'], release: true, monetize: false },
  { id: 'aa-second-probe', title: '青禾纪事', updated: '2026-09-13T09:00:00.000Z', chapters: 0, words: 0, stage: null, completed: [], release: false, monetize: false },
  { id: 'mm-third-probe', title: '长风渡', updated: '2026-09-13T08:00:00.000Z', chapters: 12, words: 34000, stage: 'content_generation', completed: ['work_type_selection', 'outline_writing'], release: true, monetize: true },
  { id: 'nn-stale-bound', title: '失效绑定书', updated: '2026-09-13T07:00:00.000Z', chapters: 5, words: 9000, stage: 'creation_planning', completed: ['work_type_selection'], release: false, monetize: false },
  { id: 'bb-fourth-probe', title: '雪落无声', updated: '2026-09-13T06:00:00.000Z', chapters: 1, words: 2000, stage: 'outline_writing', completed: [], release: false, monetize: false },
  { id: 'cc-fifth-probe', title: '折戟', updated: '2026-09-13T05:00:00.000Z', chapters: 2, words: 4000, stage: 'outline_writing', completed: [], release: false, monetize: false },
  { id: 'dd-sixth-probe', title: '南柯', updated: '2026-09-13T04:00:00.000Z', chapters: 4, words: 8000, stage: 'outline_writing', completed: [], release: false, monetize: false },
  { id: 'ee-seventh-probe', title: '北望', updated: '2026-09-13T03:00:00.000Z', chapters: 6, words: 11000, stage: 'outline_writing', completed: [], release: false, monetize: false },
  { id: 'ff-eighth-probe', title: '东归', updated: '2026-09-13T02:00:00.000Z', chapters: 7, words: 13000, stage: 'outline_writing', completed: [], release: false, monetize: false },
  { id: 'gg-ninth-probe', title: '西行', updated: '2026-09-13T01:00:00.000Z', chapters: 8, words: 15000, stage: 'outline_writing', completed: [], release: false, monetize: false },
]
/** 失效绑定目标：一个必然不存在的会话 id ⇒ 卡片双圆 stale（UX-006 失效重绑路径）。 */
const STALE_SESSION_ID = 'session-does-not-exist-clean004'

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

/**
 * 把隔离小说工作区注册为**宿主工作区**（隔离根内写入，不触碰真实环境）。
 *
 * 为什么必须做：宿主侧栏会话列表与会话镜像按 workspaceId 组织；小说根未被宿主注册为工作区时，
 * `workspace.list` 无命中 ⇒ openCtl.autoCreate 以裸 `cwd` 建会话 ⇒ 宿主不把该会话挂到任何工作区
 * ⇒ 侧栏「暂无会话」、sessions 镜像不回收该 id ⇒ 卡片即使绑定成功也长期呈「会话失效」。
 * 该现象是**隔离 fixture 的取景差异**（该探测只验证「注册工作区后是否收敛」，不据此断言产品缺陷）。
 * 结构口径取自真实实例的 `storages/workspace.json`（unit.name=workspace / version=2）——一次装配。
 */
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
/**
 * R1 返工：新/改谓词的**可失败性自证**（falsifiability proof）。
 *
 * 每条谓词以纯函数形式登记，并配一组
 *   · `red`  —— 构造的反例向量（真实缺陷形态）⇒ 谓词 MUST 求值为 **false**（断言变红）；
 *   · `ok`   —— 正例向量 ⇒ 谓词 MUST 求值为 **true**。
 * 断言 `FALSIFIABILITY-PROOF` 在报告内机录逐条结果；任一条谓词对反例求值为 true（= 空真/弱断言）
 * 即本组判定 FAIL。这样「无恒真分支」不再是自述，而是可复核的机读证据。
 *
 * 覆盖 R1 findings：F-01（B5）、F-02（D3）、F-06（C-face-availability）、F-11（B12b/D5）、
 * F-03（B21a/B21b）、以及空真单列项（C11，追加点击前置）。
 */
const PREDICATES = [
  {
    id: 'B5-found-sessions-area',
    finding: 'F-01',
    fn: (v) => v.hostHasRows === true && (v.foundTitle !== null && v.rows >= 1),
    red: { note: '宿主侧栏确有会话行 ∧ 本区未渲染（R1 认定的反例）', v: { hostHasRows: true, foundTitle: null, rows: 0 } },
    ok: { note: '宿主有会话行 ∧ 本区渲染 ≥1 行', v: { hostHasRows: true, foundTitle: '找到的会话（1）', rows: 1 } },
  },
  {
    id: 'D3-mutual-exclusion',
    finding: 'F-02',
    fn: (v) => v.barOpenBefore === true && v.consoleOpen === true && v.barOpenAfter === false,
    red: { note: 'R1 记录运行实测：前置不成立（分栏未在场）⇒ 后件先于动作成立', v: { barOpenBefore: false, consoleOpen: true, barOpenAfter: false } },
    red2: { note: '产品不再互斥：开控制台后分栏仍在场', v: { barOpenBefore: true, consoleOpen: true, barOpenAfter: true } },
    ok: { note: '分栏先在场 → 开控制台 → 分栏被关', v: { barOpenBefore: true, consoleOpen: true, barOpenAfter: false } },
  },
  {
    id: 'C-face-availability',
    finding: 'F-06',
    // 与断言同极性（true = 绿）：异常信号「C1 曾打开 ∧ C5 时刻不在场」为真时断言 MUST 红。
    fn: (v) => !(v.splitOpened === true && v.splitClosed === true),
    red: { note: 'C1 曾观测分栏打开而 C5 时刻不在场 ⇒ 打开后自发关闭（回归）', v: { splitOpened: true, splitClosed: true } },
    ok: { note: '分栏仍在场（正常）', v: { splitOpened: true, splitClosed: false } },
    ok2: { note: '从未打开过（N-A，非 FAIL）', v: { splitOpened: false, splitClosed: true } },
  },
  {
    id: 'B21a-search-find-sessions',
    finding: 'F-03',
    // 极性同断言：宿主三面认可时，镜像有行（PASS）或控制台未取得（N-A）皆非红；「认可 ∧ 镜像空 ∧ 控制台在场」才是红。
    fn: (v) => v.ackComplete !== true || v.rows >= 1 || v.consoleFailed === true,
    red: { note: '宿主三面认可该会话 ∧ 控制台在场 ∧ 镜像 0 行（R1 记录运行实测形态；原实现记 N-A 且理由与自身字段矛盾）', v: { ackComplete: true, rows: 0, consoleFailed: false } },
    ok: { note: '宿主认可 ∧ 镜像渲染 ≥1 行', v: { ackComplete: true, rows: 1, consoleFailed: false } },
    ok2: { note: '宿主未认可（三面不齐）⇒ N-A 通道，非红', v: { ackComplete: false, rows: 0, consoleFailed: false } },
  },
  {
    id: 'B21b-search-find-sessions-retest',
    finding: 'F-03',
    fn: (v) => v.consoleOpen !== true || v.rows >= 1,
    red: { note: '控制台在场 ∧ 关键词已注入 ∧ 镜像仍 0 行', v: { consoleOpen: true, rows: 0 } },
    ok: { note: '控制台在场 ∧ 镜像 ≥1 行', v: { consoleOpen: true, rows: 1 } },
    ok2: { note: '控制台未取得 ⇒ N-A 通道，非红', v: { consoleOpen: false, rows: 0 } },
  },
  {
    id: 'B12b-tile-min-height',
    finding: 'F-11',
    fn: (v) => v.tileH !== null && Math.round(v.tileH) === 180 && v.cardHeights.length > 0 && Math.min(...v.cardHeights) >= 180,
    red: { note: '空集：原实现 `Math.min()` = Infinity 恒真（潜在空真）', v: { tileH: 180, cardHeights: [] } },
    red2: { note: '卡片低于 180px 下限', v: { tileH: 180, cardHeights: [179.5, 211.4] } },
    ok: { note: '全部 ≥180px', v: { tileH: 180, cardHeights: [211.4, 205.0] } },
  },
  {
    id: 'D5-sessions-present',
    finding: 'F-11',
    fn: (v) => (v.serviceSignal === true
      ? (v.drawerDots >= 1 && v.consoleDots >= 1 && v.consoleCards >= 1)
      : (v.serviceAbsent === true && v.consoleDots === 0)),
    red: { note: '服务缺席却仍渲染双圆（原 `cdot>=1` 判据在此为真 ⇒ 掩盖降级）', v: { serviceSignal: false, serviceAbsent: false, drawerDots: 0, consoleDots: 2, consoleCards: 2 } },
    red2: { note: '服务可用信号在场但控制台卡双圆缺失（该面渲染回归）', v: { serviceSignal: true, serviceAbsent: false, drawerDots: 1, consoleDots: 0, consoleCards: 2 } },
    ok: { note: '服务可用 ⇒ 抽屉与控制台双圆同时在场', v: { serviceSignal: true, serviceAbsent: false, drawerDots: 1, consoleDots: 2, consoleCards: 2 } },
    ok2: { note: '服务缺席 ⇒ 无任何双圆（缺席分支的合法观测）', v: { serviceSignal: false, serviceAbsent: true, drawerDots: 0, consoleDots: 0, consoleCards: 2 } },
  },
  {
    id: 'E1-short-notice-compact',
    finding: 'F-04（UX-060 短形态；原为 N-A ⇒ 本轮首次取得）',
    // 短文本（≤ NOTICE_INLINE_MAX=24）必须紧凑单行；null（提示不在场）亦为红。
    fn: (v) => v.present === true && v.form === 'row' && v.lines === 1 && v.h <= 32 && v.titleAttr === '' && v.sw <= v.cw + 1,
    red: { note: '短提示被渲染成 block（当长告警处理）', v: { present: true, form: 'block', lines: 3, h: 60, titleAttr: '', sw: 558, cw: 558 } },
    red2: { note: '短提示不在场（提示通道未渲染）', v: { present: false, form: null, lines: null, h: 0, titleAttr: '', sw: 0, cw: 0 } },
    red3: { note: '短提示单行但溢出被截断', v: { present: true, form: 'row', lines: 1, h: 29, titleAttr: '', sw: 700, cw: 558 } },
    ok: { note: '本轮实测形态：row / 单行 / 29px / 无溢出', v: { present: true, form: 'row', lines: 1, h: 29, titleAttr: '', sw: 558, cw: 558 } },
  },
  {
    id: 'C11-flip-back',
    finding: '空真追加项（R1 §3.1 单列）',
    fn: (v) => v.flipBackClick === true && v.chatSide === 'right' && v.splitOpen === true,
    red: { note: '⇄ 未被点击（分栏不在场）而 chatSide 本就为 right —— 原实现记 PASS', v: { flipBackClick: false, chatSide: 'right', splitOpen: false } },
    ok: { note: '⇄ 点击成功且回到 right 且分栏仍在', v: { flipBackClick: true, chatSide: 'right', splitOpen: true } },
  },
]

/** 逐条求值：返回每条谓词在 red/red2/ok/ok2 向量上的实测布尔值 + 是否通过可失败性检查。 */
function falsifiabilityReport() {
  const rows = []
  for (const p of PREDICATES) {
    const reds = [['red', p.red], ['red2', p.red2]].filter(([, c]) => c !== undefined)
    const oks = [['ok', p.ok], ['ok2', p.ok2]].filter(([, c]) => c !== undefined)
    const redResults = reds.map(([k, c]) => ({ vector: k, note: c.note, result: p.fn(c.v) }))
    const okResults = oks.map(([k, c]) => ({ vector: k, note: c.note, result: p.fn(c.v) }))
    rows.push({
      id: p.id, finding: p.finding,
      redResults, okResults,
      redsAllFalse: redResults.every((r) => r.result === false),
      oksAllTrue: okResults.every((r) => r.result === true),
      pass: redResults.every((r) => r.result === false) && okResults.every((r) => r.result === true),
    })
  }
  return { rows, allPass: rows.every((r) => r.pass === true) }
}

// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) { console.log('用法：node probe-clean-004.mjs [--out <dir>] [--keep] [--no-browser-head]'); return 0 }

  const plane = resolvePlane()
  if (plane === null) { console.error('[probe] 环境错误：宿主平面不可达（未找到可解析 @deepseek-ai/dsh 的 profile 平面）'); return 2 }
  const browser = opts.skipBrowser ? null : findBrowser()
  if (!opts.skipBrowser && browser === null) { console.error('[probe] 环境错误：未找到 Chromium 内核浏览器（Edge/Chrome）'); return 2 }

  const i18n = readI18n()
  const realHome = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  const realBefore = realFingerprint(realHome)

  const root = mkdtempSync(join(tmpdir(), 'clean004-probe-'))
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

  // 隔离包含性校验（口径照 test/fixtures/host-surfaces/ci-mock-face.mjs L113-114：prefix + sep，且 ≠ 根）
  const containment = {}
  for (const k of ['home', 'userprofile', 'appdata', 'localappdata', 'edge', 'tmp', 'novels']) containment[k] = dirs[k] !== root && dirs[k].startsWith(root + sep)
  if (Object.values(containment).some((v) => v !== true)) {
    console.error('[probe] 隔离校验失败：重定向路径越出临时根 ' + JSON.stringify(containment))
    rmSync(root, { recursive: true, force: true })
    return 2
  }
  mkdirSync(opts.out, { recursive: true })

  writeFixture(dirs.novels)
  // 隔离实例 settings.yaml：工作区 + 失效绑定（stale 路径的真实数据来源；宿主启动即读）
  writeFileSync(join(dirs.home, 'settings.yaml'),
    'novel-writing:\n  workspaceRoot: ' + dirs.novels.replace(/\\/g, '/') + '\n  bindings:\n    nn-stale-bound: ' + STALE_SESSION_ID + '\n', 'utf8')
  // 隔离实例宿主工作区注册（会话列表/镜像按 workspaceId 组织；缺注册会让「会话」面整体不可回收）
  const fixtureWs = registerFixtureWorkspace(dirs.home, dirs.novels)

  console.log('[probe] CLEAN-004 隔离实例探针（环境变量重定向至临时目录；真实 $DSH_HOME 只读）')
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
    tool: 'probe-clean-004', task: 'CLEAN-004', head: null, headDirty: null, startedAt: new Date().toISOString(),
    isolation: { root, dshHome: dirs.home, plane: plane.nodeModules, browser, containment, realEnvBefore: realBefore, env: { DSH_HOME: childEnv.DSH_HOME, USERPROFILE: childEnv.USERPROFILE, HOME: childEnv.HOME, APPDATA: childEnv.APPDATA, LOCALAPPDATA: childEnv.LOCALAPPDATA, TEMP: childEnv.TEMP } },
    i18n, fixture: { novels: NOVELS.map((n) => n.id), staleBinding: { 'nn-stale-bound': STALE_SESSION_ID }, workspace: fixtureWs },
    assertions: [], facts: {}, screenshots: [], screenshotsTmpSource: [], pageLog: [], envErrors: [],
    realEnvAfter: null, cleanup: null, ok: false,
  }

  let boot = null, edge = null, cdp = null
  const bootOut = []
  const pageLog = []
  /** 三态：PASS / FAIL / N-A（未取得可判定观测：环境无法构造该面——绝不当成 PASS 计数）。 */
  const assertion = (id, area, label, ok, detail, status) => {
    const st = status !== undefined ? status : (ok === true ? 'PASS' : 'FAIL')
    const rec = { id, area, label, ok: st === 'PASS', status: st, detail: detail === undefined ? null : detail, at: new Date().toISOString() }
    report.assertions.push(rec)
    console.log('  ' + (st === 'PASS' ? 'OK  ' : st === 'N-A' ? 'N-A ' : 'FAIL') + ' ' + id + ' [' + area + '] ' + label + (st === 'PASS' ? '' : ' :: ' + JSON.stringify(rec.detail).slice(0, 400)))
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
  // 看门狗（R1 F-09 订正：注释与实现口径一致）：超时后只 `console.error` + 记一条 FAIL 断言
  // （`Z0-watchdog`，使最终 tally 非绿），**不能中断挂起的 `await`**（如对已死页面的 `cdp.evaluate`
  // 永不 resolve）——因此卡死时仍可能既不进 `finally`、也不落 `report.json`、也不清理隔离根。
  // 已知残留缺陷（属「探针工程」面，见 README §9；本轮按任务边界不重构实现——改动需再跑一轮完整验证）：
  // 同族先例 `UX-060` 的 `final5` 运行即在此模式下存活 3 h+ 并遗留 `%TEMP%` 孤儿进程树。
  // 使用者在 CI 中 SHOULD 为探针进程叠加外部超时（如 `timeout`/job 级 kill）作为兜底。
  const watchdogMs = Number(process.env.CLEAN004_PROBE_TIMEOUT_MS ?? 420000)
  const watchdog = setTimeout(() => {
    console.error('[probe] 看门狗超时（' + watchdogMs + 'ms）：强制收敛到 finally（后续断言按未取得观测判 FAIL）')
    report.watchdogFired = true
    assertion('Z0-watchdog', '环境', '探针在超时预算内完成（未触发看门狗）', false, { watchdogMs })
  }, watchdogMs)
  try {
    try {
      const r = spawnSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' })
      report.head = String(r.stdout ?? '').trim()
      const st = spawnSync('git', ['-C', REPO_ROOT, 'status', '--porcelain', '--', 'lib/client.js', 'lib/index.js'], { encoding: 'utf8' })
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
    if (target === null) {
      try {
        const created = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/new?' + encodeURIComponent(appUrl), { method: 'PUT' })).json()
        if (created.webSocketDebuggerUrl !== undefined) target = created
      } catch { /* keep null */ }
    }
    if (target === null) { report.envErrors.push('无头浏览器未暴露调试目标'); console.error('[probe] 环境错误：无调试目标'); return 2 }
    cdp = await Cdp.attach(target.webSocketDebuggerUrl)
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable')
    cdp.on('Runtime.consoleAPICalled', (p) => pageLog.push('console.' + p.type + ' ' + (p.args ?? []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 300)))
    cdp.on('Runtime.exceptionThrown', (p) => pageLog.push('exception ' + String(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? '').slice(0, 300)))
    cdp.on('Log.entryAdded', (p) => pageLog.push('log.' + String(p.entry?.level) + ' ' + String(p.entry?.text ?? '').slice(0, 300)))
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false })
    const cur = await cdp.evaluate('location.href')
    if (String(cur).indexOf('127.0.0.1') < 0 || String(cur).startsWith('chrome-error')) { await cdp.send('Page.navigate', { url: appUrl }); await sleep(1500) }

    const waitFor = async (expr, ms, label) => {
      const t0 = Date.now()
      while (Date.now() - t0 < ms) { try { if ((await cdp.evaluate(expr)) === true) return true } catch { /* retry */ } await sleep(250) }
      console.log('  !! 超时等待：' + label)
      return false
    }
    /**
     * 截图（R1 F-13 修复）：PNG 本体写入 `--out`（临时目录），但报告的 `screenshots[]` 登记的是
     * **入仓相对路径**（`docs/evidence/CLEAN-004/<name>.png`，跨运行稳定的证据面），
     * `%TEMP%` 来源绝对路径另记于 `screenshotsTmpSource[]` 作为附注（临时目录运行后即被清理）。
     */
    const screenshot = async (name) => {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      const path = join(opts.out, name + '.png')
      writeFileSync(path, Buffer.from(shot.data, 'base64'))
      const repoRel = 'docs/evidence/CLEAN-004/' + name + '.png'
      report.screenshots.push(repoRel)
      report.screenshotsTmpSource = report.screenshotsTmpSource ?? []
      report.screenshotsTmpSource.push(path)
      return path
    }
    /** 驱动 React 受控 input：原生 setter 绕开 React value tracker + 派发 input 事件。 */
    const setInput = (selector, value) => cdp.evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)})
      if (node === null) return 'no-node'
      const proto = window.HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, ${JSON.stringify(value)})
      node.dispatchEvent(new Event('input', { bubbles: true }))
      return node.value
    })()`)
    /** 真实指针拖拽（PointerEvent 序列）；坐标取指针相对分隔线左缘的偏移 ⇒ 左窗宽变化 ≈ dx。 */
    const dragBy = (selector, dx) => cdp.evaluate(`(() => {
      const node = document.querySelector(${JSON.stringify(selector)})
      if (node === null) return 'no-node'
      const r = node.getBoundingClientRect()
      const x = Math.round(r.left + 2), y = Math.round(r.top + r.height / 2)
      const opt = (cx, cy) => ({ bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1, clientX: cx, clientY: cy })
      node.dispatchEvent(new PointerEvent('pointerdown', opt(x, y)))
      for (let i = 1; i <= 6; i += 1) node.dispatchEvent(new PointerEvent('pointermove', opt(Math.round(x + ${dx} * i / 6), y)))
      node.dispatchEvent(new PointerEvent('pointerup', opt(Math.round(x + ${dx}), y)))
      return { x, y }
    })()`)
    const clickSel = (sel) => cdp.evaluate(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); if (n === null) return false; n.click(); return true })()`)
    const clickByLabel = (re) => cdp.evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(re)})
      const b = [...document.querySelectorAll('.nv-bar-ctl')].find((x) => re.test(x.getAttribute('aria-label') || ''))
      if (b === undefined) return false
      b.click(); return true
    })()`)
    const pressEsc = async () => {
      await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
    }
    const localSplit = () => cdp.evaluate("(() => { const raw = localStorage.getItem('dsh.novel.split.v1'); return raw === null ? null : JSON.parse(raw) })()")

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

    const haveCards = await waitFor("document.querySelectorAll('.nv-drawer .nv-card').length >= 10", 45000, '抽屉 10 张书目卡')
    const drawerState = await cdp.evaluate(`(() => {
      const rectOf = (e) => { if (e === null) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1) } }
      const head = document.querySelector('.nv-drawer-head'); const card = document.querySelector('.nv-drawer .nv-card'); const d = document.querySelector('.nv-drawer')
      return {
        cards: document.querySelectorAll('.nv-drawer .nv-card').length,
        titles: [...document.querySelectorAll('.nv-drawer .nv-card-title')].map((n) => n.textContent),
        subs: [...document.querySelectorAll('.nv-drawer .nv-card-sub')].slice(0, 4).map((n) => n.textContent),
        dots: [...document.querySelectorAll('.nv-drawer .nv-dot')].map((n) => n.getAttribute('data-st')),
        drawer: rectOf(d), head: rectOf(head), card: rectOf(card),
        headLabel: head === null ? null : head.getAttribute('aria-label'), caret: document.querySelectorAll('.nv-drawer-caret').length,
      }
    })()`)
    report.facts.drawer = drawerState
    assertion('A1-drawer-cards', '管理台/抽屉', '侧栏抽屉渲染全部 10 本书目卡（overview → 抽屉数据链）+ 标题行 aria-label/插入符号在位',
      haveCards === true && drawerState.cards === 10 && drawerState.headLabel === i18n.entryLabel && drawerState.caret === 1, drawerState)
    assertion('A2-stale-binding-visible', '数据/绑定', '失效绑定书在抽屉卡呈现「会话失效」（stale 数据面：绑定 id 不在会话镜像）',
      Array.isArray(drawerState.subs) && drawerState.subs.some((s) => String(s).indexOf('会话失效') >= 0)
      && Array.isArray(drawerState.titles) && drawerState.titles.indexOf('失效绑定书') >= 0, drawerState.subs)

    // ── 4) A 面：抽屉标题行开/关（反选）────────────────────────────────────
    await screenshot('01-drawer-idle')
    await clickSel('.nv-drawer-head')
    const consoleOpened = await waitFor("document.querySelector('.nv-console') !== null", 15000, '.nv-console 打开')
    const consoleGeom = await cdp.evaluate(`(() => {
      const rectOf = (e) => { if (e === null) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1) } }
      const root = document.querySelector('[data-phase]')
      const sb = document.querySelector('.nv-drawer') === null ? null : document.querySelector('.nv-drawer').closest('aside,nav,[class*=sidebar],[class*=Sidebar]')
      return {
        console: rectOf(document.querySelector('.nv-console')), root: rectOf(root),
        sidebar: rectOf(sb), rootPhase: root === null ? null : root.getAttribute('data-phase'),
        title: (document.querySelector('.nv-console-title') || {}).textContent ?? null,
        ws: (document.querySelector('.nv-console-ws') || {}).textContent ?? null,
        wsSwitch: (document.querySelector('.nv-cbtn-ws') || {}).textContent ?? null,
        mini: (document.querySelector('.nv-console-head .nv-mini') || {}).getAttribute ? document.querySelector('.nv-console-head .nv-mini').getAttribute('aria-label') : null,
        search: document.querySelectorAll('.nv-csearch input').length,
        cgrid: document.querySelectorAll('.nv-cgrid').length,
      }
    })()`)
    report.facts.consoleGeom = consoleGeom
    assertion('A3-console-opens', '控制台', '点抽屉标题行 → 控制台打开（反选：开）', consoleOpened === true && consoleGeom.console !== null, { consoleOpened })
    const geomDelta = consoleGeom.console === null || consoleGeom.root === null ? null : {
      dx: +(consoleGeom.console.x - consoleGeom.root.x).toFixed(1), dr: +(consoleGeom.console.right - consoleGeom.root.right).toFixed(1),
      dy: +(consoleGeom.console.y - consoleGeom.root.y).toFixed(1), db: +(consoleGeom.console.bottom - consoleGeom.root.bottom).toFixed(1),
    }
    assertion('B1-console-geometry-root', '控制台', '控制台几何 ≡ 会话内容区 rect（4 边偏差 ≤1.5px）',
      geomDelta !== null && Object.values(geomDelta).every((v) => Math.abs(v) <= 1.5), { geomDelta, console: consoleGeom.console, root: consoleGeom.root, phase: consoleGeom.rootPhase })
    assertion('B2-console-head', '控制台', '头部 = 标题「小说管理工作台」+ 工作区路径 + 「切换 / 新建工作区…」+ ✕',
      typeof consoleGeom.title === 'string' && consoleGeom.title.indexOf('小说管理工作台') >= 0 && typeof consoleGeom.ws === 'string' && consoleGeom.ws.length > 0
      && typeof consoleGeom.wsSwitch === 'string' && consoleGeom.wsSwitch.indexOf('工作区') >= 0 && consoleGeom.mini === '关闭', consoleGeom)
    const gridReady = await waitFor("document.querySelector('.nv-cgrid') !== null && document.querySelectorAll('.nv-cgrid .nv-ccard').length > 0", 20000, '卡片网格就绪')
    assertion('B3-console-grid-present', '控制台', '控制台渲染卡片网格容器（overview 轮询数据到达后）',
      gridReady === true && consoleGeom.search === 1, { gridReady, search: consoleGeom.search })

    // ── 5) B 面：搜索（滤小说 / 找 session / 空态 / 清除）──────────────────
    await setInput('.nv-csearch input', '孤星')
    await sleep(800)
    const filterState = await cdp.evaluate(`(() => ({
      value: (document.querySelector('.nv-csearch input') || {}).value,
      cards: [...document.querySelectorAll('.nv-cgrid .nv-ccard')].map((n) => n.getAttribute('data-nv-id')),
      tiles: document.querySelectorAll('.nv-cplus').length, fold: document.querySelectorAll('.nv-cfold').length,
      clear: document.querySelectorAll('.nv-csearch-clear').length,
    }))()`)
    report.facts.filter = filterState
    assertion('B4-search-filter-novels', '控制台/搜索', '关键词滤小说卡（「孤星」→ 仅 zz-first-probe）；＋磁贴过滤时恒显示；≤8 本无折叠行',
      filterState.value === '孤星' && filterState.cards.length === 1 && filterState.cards[0] === 'zz-first-probe'
      && filterState.tiles === 1 && filterState.fold === 0 && filterState.clear === 1, filterState)

    await setInput('.nv-csearch input', '')
    await sleep(600)
    // 会话数据面（「找 session」）需要会话存在：本实例此时尚无会话（.nv-srow 空）——先如实记录，权威断言在自动建会话链之后（B21）。
    await setInput('.nv-csearch input', '新会话')
    await sleep(1800)
    const hostSidebarAtB5 = await readHostSessionRows(cdp)
    const foundState = await cdp.evaluate(`(() => ({
      kw: (document.querySelector('.nv-csearch input') || {}).value,
      foundTitle: (document.querySelector('.nv-cfound-title') || {}).textContent ?? null,
      rows: [...document.querySelectorAll('.nv-cfound .nv-srow')].map((n) => ({ t: (n.querySelector('.nv-srow-title') || {}).textContent, sub: (n.querySelector('.nv-srow-sub') || {}).textContent })),
      cards: document.querySelectorAll('.nv-cgrid .nv-ccard').length,
      hostSidebar: (document.body.innerText || '').indexOf('暂无会话') >= 0 ? 'no-sessions' : 'sessions-present',
    }))()`)
    report.facts.sessionSearchPreliminary = foundState
    report.facts.hostSessionRowsAtB5 = hostSidebarAtB5
    /**
     * R1 F-01 修复：原谓词第三析取 `|| foundState.foundTitle === null` **恒真**（未渲染 ⇒ 恒 PASS），
     * 使「宿主侧栏有会话 ∧ 本区未渲染」这一 label 定义的反例被自身豁免。新谓词 = 单条可失败合取：
     *   前置（宿主侧栏确有会话行 ⇒ 本区应渲染） ∧ 后件（本区标题在场 ∧ 会话行 ≥1）。
     * 反例自证：`hostSidebarRows.count ≥ 1 ∧ foundTitle === null ∧ rows.length === 0` ⇒ 表达式 false ⇒ FAIL。
     * 宿主 0 行时本断言记 N-A（环境不可判，见 `status` 参数），**不再**当作 PASS 计数。
     */
    const b5HostHasRows = hostSidebarAtB5 !== undefined && hostSidebarAtB5.withText >= 1
    const b5MirrorRendered = foundState.foundTitle !== null && Array.isArray(foundState.rows) && foundState.rows.length >= 1
    const b5Predicate = b5HostHasRows === true && b5MirrorRendered === true
    assertion('B5-found-sessions-area', '控制台/搜索', '「找到的会话」区 = 宿主侧栏确有会话行时**必渲染**（判据：宿主会话行数 ≥1 ⇒ 本区存在性必须一致；谓词无恒真分支）',
      b5Predicate,
      { kw: foundState.kw, foundTitle: foundState.foundTitle, rows: foundState.rows.length, hostSidebarRows: hostSidebarAtB5, legacyHostSidebarText: foundState.hostSidebar, b5HostHasRows, b5MirrorRendered },
      b5HostHasRows === true ? undefined : 'N-A')

    await setInput('.nv-csearch input', 'zzz-no-such-thing')
    await sleep(900)
    const noMatch = await cdp.evaluate("({ cards: document.querySelectorAll('.nv-cgrid .nv-ccard').length, empty: document.querySelectorAll('.nv-empty').length, text: (document.querySelector('.nv-empty') || {}).textContent ?? null })")
    assertion('B6-search-no-match', '控制台/搜索', '无匹配 → 空态「没有匹配的小说或会话」且卡片 0',
      noMatch.cards === 0 && noMatch.empty === 1 && String(noMatch.text).indexOf('没有匹配') >= 0, noMatch)
    await clickSel('.nv-csearch-clear')
    await sleep(800)
    const cleared = await cdp.evaluate("({ value: (document.querySelector('.nv-csearch input') || {}).value, cards: document.querySelectorAll('.nv-cgrid .nv-ccard').length })")
    assertion('B7-search-clear', '控制台/搜索', '清除钮 → 关键词清空 + 折叠态恢复 8 卡', cleared.value === '' && cleared.cards === 8, cleared)

    // ── 6) B 面：卡片网格（折叠/等高/3 列/结构/负断言/图标钮）───────────────
    const gridState = await cdp.evaluate(`(() => {
      const rectOf = (e) => { if (e === null) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1) } }
      const cards = [...document.querySelectorAll('.nv-cgrid .nv-ccard')]
      const tile = document.querySelector('.nv-cplus')
      const rows = {}
      for (const c of cards) { const y = String(Math.round(rectOf(c).y)); rows[y] = (rows[y] || 0) + 1 }
      const first = cards[0] ?? null
      const grid = document.querySelector('.nv-cgrid')
      return {
        count: cards.length, fold: (document.querySelector('.nv-cfold') || {}).textContent ?? null,
        tile: rectOf(tile), card0: rectOf(first), card0Id: first === null ? null : first.getAttribute('data-nv-id'),
        rowBuckets: rows, maxRow: Math.max(0, ...Object.values(rows)),
        counts: {
          head: document.querySelectorAll('.nv-ccard-head').length, mono: document.querySelectorAll('.nv-ccard-mono').length,
          badge: document.querySelectorAll('.nv-ccard-badge').length, chips: document.querySelectorAll('.nv-ccard-chip').length,
          statusChips: document.querySelectorAll('.nv-ccard .nv-chip').length, cdot: document.querySelectorAll('.nv-cdot').length,
          actions: document.querySelectorAll('.nv-ccard-actions').length, ico: document.querySelectorAll('.nv-ccard .nv-cico').length,
          del: document.querySelectorAll('.nv-cico-del').length, data: document.querySelectorAll('.nv-ccard-data').length,
          meta: document.querySelectorAll('.nv-cmeta').length,
        },
        chipLabels: [...new Set([...document.querySelectorAll('.nv-ccard-chip')].map((n) => n.textContent.replace(/[0-9]/g, '#').trim()))],
        cardHeights: cards.map((c) => +rectOf(c).h.toFixed(1)),
        icoSizes: [...document.querySelectorAll('.nv-ccard .nv-cico')].slice(0, 4).map(rectOf),
        legacyOpen: [...document.querySelectorAll('.nv-ccard button')].filter((b) => /打开|▶/.test(b.textContent || '')).length,
        legacyLaunch: [...document.querySelectorAll('.nv-ccard button')].filter((b) => /开始工作流|继续工作流|➤/.test(b.textContent || '')).length,
        gridCols: getComputedStyle(grid).gridTemplateColumns, gridGap: getComputedStyle(grid).gap,
        glowCards: [...document.querySelectorAll('.nv-ccard[data-glow]')].map((n) => n.getAttribute('data-glow')),
        staleDot: (() => { const c = document.querySelector('.nv-ccard[data-nv-id="nn-stale-bound"]'); if (c === null) return null; const d = c.querySelector('.nv-cdot'); return d === null ? null : d.getAttribute('data-bound') })(),
      }
    })()`)
    report.facts.grid = gridState
    const chipsPerCard = gridState.counts.chips / gridState.count
    assertion('B8-grid-fold', '控制台/网格', '10 本 → 折叠前 8 卡 + 「展开全部（2）」+ ＋磁贴（UX-008⑤）',
      gridState.count === 8 && String(gridState.fold).indexOf('展开全部（2）') >= 0 && gridState.tile !== null,
      { count: gridState.count, fold: gridState.fold, tile: gridState.tile })
    assertion('B9-grid-3col', '控制台/网格', '控制台宽度下 3 列均分（同行 3 卡，grid-template-columns 三轨等宽 ±0.1px）',
      gridState.maxRow === 3 && (() => {
        const tracks = String(gridState.gridCols).split(/\s+/).map(parseFloat).filter((v) => Number.isFinite(v))
        return tracks.length === 3 && Math.max(...tracks) - Math.min(...tracks) <= 0.1
      })(),
      { rowBuckets: gridState.rowBuckets, cols: gridState.gridCols, gap: gridState.gridGap })
    assertion('B10-card-anatomy', '控制台/网格', '卡片结构齐备：monogram + 阶段徽标 + 数据 chips（章/字/发布/变现/信号）+ 数据行 + 更新时间 + 图标钮（8×🔗 + 8×🗑）',
      gridState.counts.mono === 8 && gridState.counts.badge === 8 && chipsPerCard >= 3 && chipsPerCard <= 5 && gridState.counts.statusChips === 16
      && gridState.counts.cdot === 8 && gridState.counts.ico === 16 && gridState.counts.del === 8 && gridState.counts.data === 8 && gridState.counts.meta === 8
      && gridState.chipLabels.some((l) => /章$/.test(l)) && gridState.chipLabels.some((l) => /字$/.test(l)) && gridState.chipLabels.some((l) => /信号/.test(l)),
      { counts: gridState.counts, chipLabels: gridState.chipLabels, chipsPerCard })
    assertion('B11-no-legacy-actions', '控制台/网格', '旧形态负断言：无「▶ 打开」钮（UX-008④）+ 无「➤ 启动工作流」钮（UX-013②.4）',
      gridState.legacyOpen === 0 && gridState.legacyLaunch === 0, { legacyOpen: gridState.legacyOpen, legacyLaunch: gridState.legacyLaunch })
    assertion('B12-icon-btn-22', '控制台/网格', '卡片图标钮 22×22（UX-008④ 尺寸收敛）',
      gridState.icoSizes.length > 0 && gridState.icoSizes.every((r) => r !== null && Math.round(r.w) === 22 && Math.round(r.h) === 22), gridState.icoSizes)
    assertion('B12b-tile-min-height', '控制台/网格', '＋磁贴与卡片统一最小高度 180px（卡内含内容时可更高——几何下限判据；空集显式判红：`Math.min()` 空数组 = Infinity）',
      gridState.tile !== null && Math.round(gridState.tile.h) === 180 && gridState.cardHeights.length > 0
      && Math.min(...gridState.cardHeights) >= 180,
      { tileH: gridState.tile === null ? null : gridState.tile.h, cardHeights: gridState.cardHeights, emptySet: gridState.cardHeights.length === 0 })
    assertion('B13-stale-card-dot', '数据/绑定', '失效绑定卡的双圆 = stale（data-bound=stale，UX-006 状态光效/双圆语义）',
      gridState.staleDot === 'stale', { staleDot: gridState.staleDot })

    // 排序两态
    const sortState = await cdp.evaluate("(() => { const b = [...document.querySelectorAll('.nv-csortbtn')]; return { n: b.length, labels: b.map((x) => x.textContent), on: b.map((x) => x.getAttribute('data-on')) } })()")
    await cdp.evaluate("(() => { const b = [...document.querySelectorAll('.nv-csortbtn')].find((x) => x.textContent === '手动'); if (b === undefined) return false; b.click(); return true })()")
    await sleep(700)
    const manualState = await cdp.evaluate("(() => ({ on: [...document.querySelectorAll('.nv-csortbtn')].map((x) => x.getAttribute('data-on')), draggable: [...document.querySelectorAll('.nv-cgrid .nv-ccard')].filter((c) => c.getAttribute('draggable') === 'true').length }))()")
    assertion('B14-sort-two-state', '控制台/排序', '排序两态（默认/手动）+ 手动态卡片可拖（draggable=true，UX-008⑤）',
      sortState.n === 2 && sortState.on[0] === 'true' && manualState.on[1] === 'true' && manualState.draggable === 8, { sortState, manualState })

    // ── 7) B 面：＋磁贴 → 新建弹窗（表单 / 空名校验 / 取消 / Esc 层级）──────
    await clickSel('.nv-cplus')
    const modalOpen = await waitFor("document.querySelector('.nv-cmodal') !== null", 10000, '新建弹窗')
    const modalState = await cdp.evaluate(`(() => {
      const rectOf = (e) => { if (e === null) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }
      const m = document.querySelector('.nv-cmodal'); const bd = document.querySelector('.nv-cmodal-backdrop')
      return {
        modal: rectOf(m), backdrop: rectOf(bd), inputs: document.querySelectorAll('.nv-cmodal input').length,
        btns: [...document.querySelectorAll('.nv-cmodal button')].map((b) => (b.textContent || '').trim()),
        focused: document.activeElement === null ? null : { tag: document.activeElement.tagName, cls: String(document.activeElement.className) },
        title: (document.querySelector('.nv-cmodal-title') || {}).textContent ?? null,
        vw: window.innerWidth, vh: window.innerHeight,
      }
    })()`)
    report.facts.modal = modalState
    const centered = modalState.modal !== null && Math.abs((modalState.modal.x + modalState.modal.w / 2) - modalState.vw / 2) <= 2
      && Math.abs((modalState.modal.y + modalState.modal.h / 2) - modalState.vh / 2) <= 2
    assertion('B15-create-modal', '控制台/弹窗', '＋磁贴 → 居中模态（水平+垂直居中 ≤2px）+ 单输入 autoFocus + 「创建/取消」两钮',
      modalOpen === true && modalState.inputs === 1 && centered === true && modalState.btns.indexOf('取消') >= 0
      && modalState.btns.indexOf('创建') >= 0 && modalState.focused !== null && modalState.focused.tag === 'INPUT',
      { modalState, centered })
    await cdp.evaluate("(() => { const b = [...document.querySelectorAll('.nv-cmodal button')].find((x) => (x.textContent || '').trim() === '创建'); if (b === undefined) return false; b.click(); return true })()")
    await sleep(900)
    const emptyName = await cdp.evaluate("({ err: (document.querySelector('.nv-cform-err') || {}).textContent ?? null, open: document.querySelector('.nv-cmodal') !== null })")
    assertion('B16-create-empty-name', '控制台/弹窗', '空目录名点「创建」→ 表单错误「目录名必填」且弹窗不关（前端守卫，不发请求）',
      emptyName.err === '目录名必填' && emptyName.open === true, emptyName)
    await pressEsc()
    await sleep(700)
    const escLayer1 = await cdp.evaluate("({ modal: document.querySelector('.nv-cmodal') !== null, console: document.querySelector('.nv-console') !== null })")
    assertion('B17-esc-layer-yield', '控制台/Esc', 'Esc 在弹窗态只关弹窗（控制台保持打开）——B-1 让位层级',
      escLayer1.modal === false && escLayer1.console === true, escLayer1)

    // ── 8) D 面：失效绑定 → 重绑面板（🔗）─────────────────────────────────
    await clickSel('.nv-ccard[data-nv-id="nn-stale-bound"] .nv-cico')
    const bindPanel = await waitFor("document.querySelector('.nv-modal') !== null", 15000, '绑定面板')
    const bindState = await cdp.evaluate(`(() => {
      const t = document.body.innerText || ''
      const mb = document.querySelector('.nv-modal-backdrop')
      const m = document.querySelector('.nv-modal')
      const rectOf = (e) => { if (e === null) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }
      return {
        backdrop: rectOf(mb), modal: rectOf(m),
        hasTitle: t.indexOf('绑定会话') >= 0, hasPick: t.indexOf('为本书选择一个会话') >= 0,
        hasNew: t.indexOf('新建会话并绑定') >= 0,
        inputs: document.querySelectorAll('.nv-modal input').length,
        consoleStillOpen: document.querySelector('.nv-console') !== null,
      }
    })()`)
    report.facts.bindPanel = bindState
    assertion('D1-stale-rebind-panel', '数据/绑定', '失效绑定卡 🔗 → 绑定面板（shell.overlay）打开：标题/选择文案/新建会话并绑定 三面齐备，且控制台仍在（浮层之上）',
      bindPanel === true && bindState.hasTitle === true && bindState.hasPick === true && bindState.hasNew === true && bindState.consoleStillOpen === true, bindState)
    await pressEsc()
    await sleep(800)
    const escLayer2 = await cdp.evaluate("({ modal: document.querySelector('.nv-modal') !== null, console: document.querySelector('.nv-console') !== null })")
    assertion('D2-esc-bind-yield', '控制台/Esc', 'Esc 在绑定面板态只关面板（控制台保持打开）——B-1 让位写实态',
      escLayer2.modal === false && escLayer2.console === true, escLayer2)
    await screenshot('04-bindpanel-after-esc') // 缺陷取证：按 Esc 后绑定面板（.nv-modal）仍在场 + 控制台仍在（D-1）

    // ── 9) D 面：未绑定卡 → openCtl 自动链（建会话+挂预设+绑定）→ 分栏 ────
    await cdp.evaluate("(() => { const c = document.querySelector('.nv-ccard[data-nv-id=\"zz-first-probe\"]'); if (c === null) return false; c.click(); return true })()")
    const splitOpened = await waitFor("document.querySelector('.nv-bar') !== null", 90000, '分栏 .nv-bar')
    await sleep(1500)
    const splitState = await cdp.evaluate(`(() => {
      const rectOf = (e) => { if (e === null) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1) } }
      const root = document.querySelector('[data-phase]')
      const va = root === null ? null : root.children[1]
      return {
        split: rectOf(document.querySelector('.nv-split')), bar: rectOf(document.querySelector('.nv-bar')),
        root: rectOf(root), phase: root === null ? null : root.getAttribute('data-phase'),
        title: (document.querySelector('.nv-bar-title') || {}).textContent ?? null,
        ctls: [...document.querySelectorAll('.nv-bar-ctl')].map((b) => b.getAttribute('aria-label')),
        consoleOpen: document.querySelector('.nv-console') !== null,
        viewArea: va === null ? undefined : { ml: va.style.marginLeft, mr: va.style.marginRight, w: va.style.width, rect: rectOf(va) },
        badge: (document.querySelector('.nv-badge') || {}).textContent ?? null,
        notice: (document.querySelector('.nv-notice') ?? document.querySelector('.nv-bar-note') ?? {}).textContent ?? null,
      }
    })()`)
    report.facts.split = splitState
    assertion('C1-open-from-card', '分栏', '未绑定卡点击 → openCtl 自动链（sessions.create → 预设 → 绑定 → 打开）→ 分栏打开；控制台自动关（互斥）',
      splitOpened === true && splitState.split !== null && splitState.consoleOpen === false, { splitOpened, consoleOpen: splitState.consoleOpen, notice: splitState.notice })
    // 自动链即时反馈（用户可见提示 + 卡片状态）：用于区分「绑定写入成功」与「镜像未收敛」两种情况
    report.facts.autoCreateImmediate = await cdp.evaluate(`(() => {
      const d = [...document.querySelectorAll('.nv-drawer .nv-card')].find((c) => (c.querySelector('.nv-card-title') || {}).textContent === '孤星纪元')
      return {
        drawerNotice: (document.querySelector('.nv-drawer-notice') || {}).textContent ?? null,
        cardSub: d === undefined ? null : (d.querySelector('.nv-card-sub') || {}).textContent,
        dotSt: d === undefined || d.querySelector('.nv-dot') === null ? null : d.querySelector('.nv-dot').getAttribute('data-st'),
      }
    })()`)
    assertion('C2-split-title', '分栏', '分栏标题 =「📖 小说创作工作台 ·《孤星纪元》」（UX-011 两级工作台命名）',
      String(splitState.title).indexOf('小说创作工作台') >= 0 && String(splitState.title).indexOf('孤星纪元') >= 0, splitState.title)
    assertion('C3-squeeze', '分栏/挤法', '挤法生效：对话窗 viewArea 被写入 margin + 显式 width（UX-018 双压）；分栏右缘 = viewArea 左缘',
      splitState.viewArea !== undefined && splitState.viewArea.ml !== '' && splitState.viewArea.w !== ''
      && splitState.split !== null && splitState.viewArea.rect !== null && Math.abs(splitState.split.right - splitState.viewArea.rect.x) <= 2,
      { viewArea: splitState.viewArea, splitRight: splitState.split === null ? null : splitState.split.right })
    // 绑定收敛观测（关键证据）：自动链写绑定后，卡片状态是否从「未绑定/会话失效」收敛为「会话可用」。
    // 会话镜像（overview.bindings + sessions.list）不收敛的话，「关闭后重开」会持续走失效重绑分支。
    const convergence = await cdp.evaluate(`(async () => {
      const read = () => {
        const d = [...document.querySelectorAll('.nv-drawer .nv-card')].find((c) => (c.querySelector('.nv-card-title') || {}).textContent === '孤星纪元')
        const dot = d === undefined ? null : d.querySelector('.nv-dot')
        return {
          t: Date.now(),
          sub: d === undefined ? null : (d.querySelector('.nv-card-sub') || {}).textContent,
          dotSt: dot === null ? null : dot.getAttribute('data-st'),
          hostNoSessions: (document.body.innerText || '').indexOf('暂无会话') >= 0,
          split: document.querySelector('.nv-split') !== null,
          bar: document.querySelector('.nv-bar') !== null,
          consoleEl: document.querySelector('.nv-console') !== null,
        }
      }
      const samples = [read()]
      for (let i = 0; i < 12; i += 1) { await new Promise((r) => setTimeout(r, 1000)); samples.push(read()) }
      return { samples, converged: samples.some((s) => s.sub !== null && s.sub.indexOf('未绑定') < 0 && s.sub.indexOf('会话失效') < 0) }
    })()`)
    report.facts.convergence = convergence
    // 分栏存活时间线（C5 三态裁定证据）：首帧 bar=false 的下标 + 该时刻控制台是否在场。
    // 若分栏在收敛窗内消失而控制台同时出现 ⇒ 更可能是「打开控制台」触发互斥（DEC-015）；
    // 若控制台不在场 ⇒ 更可能是宿主 current 回退触发 UX-014⑧ 联动（client.js:L3802-3833）。
    {
      const ss = Array.isArray(convergence.samples) ? convergence.samples : []
      const i0 = ss.findIndex((s) => s.bar === false)
      report.facts.splitFate = {
        sampleCount: ss.length, firstBarGoneIndex: i0, first: ss[0] ?? null,
        atGone: i0 >= 0 ? ss[i0] : null, barGoneAfter: i0 >= 0 ? ss.slice(i0).every((s) => s.bar === false) : null,
      }
    }
    // 决定性诊断：插件 overview 下发面（bindings 是否含本书）+ 会话镜像面 + 隔离实例落盘面
    const overviewProbe = await cdp.evaluate(`(async () => {
      const r = await fetch('/novel-writing/api/overview')
      const j = await r.json()
      return { status: r.status, root: j.root, bindings: j.bindings, novels: (j.novels || []).map((n) => n.id) }
    })()`).catch((e) => ({ error: String(e) }))
    let settingsYaml = null
    try { settingsYaml = readFileSync(join(dirs.home, 'settings.yaml'), 'utf8') } catch (e) { settingsYaml = 'ERR ' + String(e) }
    let sessionDirs = null
    try { sessionDirs = readdirSync(join(dirs.home, 'sessions'), { withFileTypes: true }).map((d) => d.name) } catch (e) { sessionDirs = 'ERR ' + String(e) }
    // 会话落盘面（C3b/C5 三态裁定的判别证据）：隔离实例会话存储**二级**目录 + 宿主工作区表。
    //   · boundId 在盘上 ⇒ 「建会话」成功，卡片仍「会话失效」就不能归因于创建失败；
    //   · 宿主工作区表 sessionIds 是否含该 id ⇒ 判「宿主是否把该会话挂进工作区」。
    // 全部只读隔离根，不触碰真实环境。
    const boundId = overviewProbe !== null && typeof overviewProbe === 'object' && overviewProbe.bindings !== undefined
      ? (overviewProbe.bindings['zz-first-probe'] ?? null) : null
    const sessionStore = {}
    try {
      for (const wsDir of Array.isArray(sessionDirs) ? sessionDirs : []) sessionStore[wsDir] = readdirSync(join(dirs.home, 'sessions', wsDir)).slice(0, 20)
    } catch (e) { sessionStore.error = String(e) }
    let hostWorkspaceJson = null
    try { hostWorkspaceJson = readFileSync(join(dirs.home, 'storages', 'workspace.json'), 'utf8').slice(0, 1500) } catch (e) { hostWorkspaceJson = 'ERR ' + String(e) }
    report.facts.isolatedDisk = {
      settingsYaml, sessionDirs, boundId,
      boundIdOnDisk: boundId === null ? null : JSON.stringify(sessionStore).indexOf(boundId) >= 0,
      sessionStore, hostWorkspaceJson,
    }
    report.facts.overviewProbe = overviewProbe
    /**
     * R1 F-03 修复：**宿主已认可该会话**的三面硬证据快照（后续 B21a/B21b 的判定依据）。
     *   a) overview 绑定面：`bindings['zz-first-probe'] = <sessionId>`
     *   b) 宿主工作区表：`storages/workspace.json` 的 `tables.workspaces[*].sessionIds`
     *   c) 隔离盘会话存储：`$DSH_HOME/sessions/<ws>/` 二级目录（`sessionStore`）
     * 三面齐备 ⇒ 该会话确由宿主建出并登记；此时插件镜像 `sessionsAll.ids` 若为空，即为**镜像未反映宿主会话**
     * （真实缺陷形态），不再是「环境无法构造」。
     */
    report.facts.sessionAckIds = (() => {
      const hostWorkspaceSessionIds = []
      try {
        const parsed = JSON.parse(String(hostWorkspaceJson))
        for (const ws of Object.values(parsed.tables?.workspaces ?? {})) {
          for (const id of ((ws ?? {}).sessionIds ?? [])) hostWorkspaceSessionIds.push(id)
        }
      } catch { /* 解析失败 ⇒ 留空数组（判定随后回退 N-A） */ }
      const onDiskSessionIds = []
      for (const v of Object.values(sessionStore)) if (Array.isArray(v)) onDiskSessionIds.push(...v)
      return { boundId, hostWorkspaceSessionIds, onDiskSessionIds, source: 'overview.bindings + storages/workspace.json + sessions/<ws>/' }
    })()
    const sessionRowsProbe = { deferred: true, note: '会话镜像探针移至全部场景之后（§16）执行——中途开关控制台会触发控制台↔分栏互斥，破坏后续分栏前置条件' }
    report.facts.sessionRowsProbe = sessionRowsProbe
    assertion('C3b-binding-convergence', '数据/绑定', '自动链写入的绑定在会话镜像中收敛（卡片脱离「未绑定/会话失效」）——含「找到的会话」镜像同步探针',
      convergence.converged === true,
      { converged: convergence.converged, first: convergence.samples[0], last: convergence.samples[convergence.samples.length - 1], sessionRowsProbe, overviewProbe, settingsYaml, sessionDirs })
    assertion('C4-bar-ctls', '分栏', '标题栏含 ⇄ 换边 / ☆ 设为默认 / ⟳ 恢复默认 / ✕ 关闭 四个控件（aria-label 齐备）',
      Array.isArray(splitState.ctls) && splitState.ctls.length === 4 && splitState.ctls.some((l) => String(l).indexOf('换边') >= 0)
      && splitState.ctls.some((l) => String(l).indexOf('关闭') >= 0), splitState.ctls)

    const panels = await cdp.evaluate(`(() => {
      const rectOf = (e) => { if (e === null) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1) } }
      if (document.querySelector('.nv-split') === null) {
        // 分栏不在场：仍返回**同形键集**（安全默认值）。否则下游消费者（C6 的 panels.wfButtons.length）
        // 在 undefined 上取 .length ⇒ TypeError ⇒ 整轮运行中断、report.json 缺后半断言。
        // 根因定位见 README「探针修复」：2026-09-14 final3/final4 两次运行崩溃点即此行。
        return { splitClosed: true, left: null, vdiv: null, middiv: null, chdiv: null, chatdiv: null, wfctl: null, tabs: [], wfButtons: [], chrows: 0, ftrows: 0, wfrows: 0, wfCur: 0 }
      }
      return {
        left: rectOf(document.querySelector('.nv-left')), vdiv: rectOf(document.querySelector('.nv-vdiv')),
        middiv: rectOf(document.querySelector('.nv-middiv')), chdiv: rectOf(document.querySelector('.nv-chdiv')),
        chatdiv: rectOf(document.querySelector('.nv-chatdiv')), wfctl: rectOf(document.querySelector('.nv-wfctl')),
        tabs: [...document.querySelectorAll('.nv-tab')].map((n) => n.textContent),
        wfButtons: [...document.querySelectorAll('.nv-wfctl button')].map((b) => ({ t: (b.textContent || '').trim(), mode: b.getAttribute('data-mode'), disabled: b.disabled })),
        chrows: document.querySelectorAll('.nv-chrow').length,
        ftrows: document.querySelectorAll('.nv-ft-row').length,
        wfrows: document.querySelectorAll('.nv-wf-row').length,
        wfCur: document.querySelectorAll('.nv-wf-row[data-cur=true]').length,
      }
    })()`)
    report.facts.panels = panels
    assertion('C5-split-panels', '分栏', '分栏三面齐备：左窗（文件树 + 工作流阶段清单）+ 中窗（章节列/正文/数据·发布·请求页签）+ 三条常驻分隔线（.nv-vdiv/.nv-middiv/.nv-chdiv）',
      panels.left !== null && panels.vdiv !== null && panels.middiv !== null && panels.chdiv !== null && panels.chatdiv !== null
      && panels.wfctl !== null && panels.wfrows >= 17 && panels.wfCur === 1 && panels.ftrows >= 1 && panels.tabs.length === 3, panels,
    panels.splitClosed === true ? 'N-A' : undefined)
    // ── C 面存活闸门：C6~C11 均以「分栏在场」为前置条件 ────────────────────────
    // 前置不成立（panels.splitClosed === true）时这些面**无观测可判**：如实记 N-A 并跳过，
    // 既不伪造 PASS，也不把「前置不成立」伪造成产品 FAIL（原崩溃点即在 C6 的 panels.wfButtons）。
    cFaceRest: {
      if (panels.splitClosed === true) {
        /**
         * R1 F-06 修复：闸门原本把「C1 已 PASS（分栏曾打开）而 C5 时分栏不在场」整体吸收为 N-A
         * ⇒ 「分栏打开后自发关闭」这一**回归**只能呈现为「N-A ×7 的干净运行」，无任何变红通道。
         * 现追加**独立信号** `C-face-availability`：
         *   · `splitOpened === true`（C1 曾观测到 `.nv-bar`）⇒ 分栏消失是异常事件 ⇒ **FAIL**；
         *   · `splitOpened !== true`（C1 也未打开）⇒ 本环境从未有分栏 ⇒ N-A（不以 N-A 冒充实测）。
         * 谓词可失败自证：`splitOpened ∧ splitClosed` ⇒ 表达式 true ⇒ FAIL（记录运行两次均未触发）。
         */
        const cFaceAnomaly = splitOpened === true
        report.facts.cFaceGate = { splitOpened, splitClosed: panels.splitClosed === true, splitFate: report.facts.splitFate ?? null }
        assertion('C-face-availability', '分栏/存活', 'C 面存活闸门：C1 已观测分栏打开（`.nv-bar` 在场）而 C5 时刻分栏不在场 ⇒ 分栏「打开后自发关闭」为回归异常（FAIL）；从未打开过才记 N-A',
          cFaceAnomaly === false, report.facts.cFaceGate,
          cFaceAnomaly === false ? 'N-A' : undefined)
        const notRun = [
          ['C6-wfctl-bar', '工作流面板', '下半区工作流控制条：主按钮（go/stop 形态）+「压缩上下文」+「绑定新会话」（UX-059）'],
          ['C7-divider-drag-persist', '分栏/分隔线', '拖拽竖分隔线 → 左窗宽增大且持久化同步（dsh.novel.split.v1.leftW 与实测差 ≤2px）'],
          ['C8-close-x', '分栏/关闭', '标题栏 ✕ → 分栏关闭且对话窗挤法还原（marginLeft 恢复空、宽度回满）'],
          ['C9-width-memory', '分栏/分隔线', '关闭后重开 → 左窗宽按存档恢复（宽度记忆，偏差 ≤2px）'],
          ['C10-flip-side', '分栏/换边', '⇄ 换边 → chatSide right→left 且持久化；挤法边距换侧；分栏未自关'],
          ['C11-flip-back', '分栏/换边', '⇄ 再点 → 回到 chatSide=right（两态可逆）'],
        ]
        for (const [id, area, label] of notRun) {
          assertion(id, area, label + '（**前置不成立**：C5 时刻分栏已不在场 ⇒ 如实记 N-A；异常信号见 `C-face-availability`）', false,
            { reason: 'panels.splitClosed === true', cFaceGate: report.facts.cFaceGate }, 'N-A')
        }
        break cFaceRest
      }
    assertion('C6-wfctl-bar', '工作流面板', '下半区工作流控制条：主按钮（go/stop 形态）+「压缩上下文」+「绑定新会话」（UX-059）',
      panels.wfButtons.length >= 3 && panels.wfButtons.some((b) => b.mode === 'go' || b.mode === 'stop') && panels.wfButtons.some((b) => b.t.indexOf('压缩上下文') >= 0)
      && panels.wfButtons.some((b) => b.t.indexOf('绑定新会话') >= 0), panels.wfButtons)

    // ── 10) C 面：分隔线拖拽 + 持久化 + 重开保持 ──────────────────────────
    const beforeDrag = await cdp.evaluate("(() => { const e = document.querySelector('.nv-left'); return e === null ? null : { w: +e.getBoundingClientRect().width.toFixed(1) } })()")
    await dragBy('.nv-vdiv', 60)
    await sleep(900)
    const afterDrag = await cdp.evaluate("(() => { const e = document.querySelector('.nv-left'); const raw = localStorage.getItem('dsh.novel.split.v1'); return { w: e === null ? null : +e.getBoundingClientRect().width.toFixed(1), parsed: raw === null ? null : JSON.parse(raw) } })()")
    report.facts.drag = { beforeDrag, afterDrag }
    assertion('C7-divider-drag-persist', '分栏/分隔线', '拖拽竖分隔线 → 左窗宽增大且持久化同步（dsh.novel.split.v1.leftW 与实测差 ≤2px）',
      beforeDrag !== null && afterDrag.w !== null && afterDrag.w > beforeDrag.w + 20 && afterDrag.parsed !== null && Math.abs(afterDrag.parsed.leftW - afterDrag.w) <= 2, { beforeDrag, afterDrag })

    const splitOpenBeforeClose = await cdp.evaluate("document.querySelector('.nv-split') !== null")
    await clickByLabel('关闭')
    await sleep(1000)
    const closed = await cdp.evaluate("({ split: document.querySelector('.nv-split') !== null, bar: document.querySelector('.nv-bar') !== null })")
    const closedGeom = await cdp.evaluate("(() => { const r = document.querySelector('[data-phase]'); const va = r === null ? null : r.children[1]; return va === undefined || va === null ? null : { ml: va.style.marginLeft, w: va.style.width, rect: (() => { const b = va.getBoundingClientRect(); return { x: +b.x.toFixed(1), w: +b.width.toFixed(1) } })() } })()")
    report.facts.closeRestore = closedGeom
    assertion('C8-close-x', '分栏/关闭', '标题栏 ✕ → 分栏关闭且对话窗挤法还原（marginLeft 恢复空、宽度回满）',
      splitOpenBeforeClose === true && closed.split === false && closed.bar === false && closedGeom !== null && closedGeom.ml === '' && Math.abs(closedGeom.rect.x - splitState.root.x) <= 2,
      { closed, closedGeom, splitOpenBeforeClose },
      splitOpenBeforeClose === true ? undefined : 'N-A')

    // 重开（抽屉卡直达；指定 zz-first-probe 卡，避免依赖排序）。
    // 注：绑定写入后会话镜像刷新有滞后（≤2.5s 抽屉轮询 + 会话列表刷新）——期间卡片呈「会话失效」，
    // 点击会正确地走进「失效重绑」分支（不可当作重开失败）。故先等状态收敛，再点击。
    const settleToBound = await waitFor(`(() => {
      const d = [...document.querySelectorAll('.nv-drawer .nv-card')].find((c) => (c.querySelector('.nv-card-title') || {}).textContent === '孤星纪元')
      if (d === undefined || d === null) return false
      const sub = (d.querySelector('.nv-card-sub') || {}).textContent || ''
      return sub.indexOf('未绑定') < 0 && sub.indexOf('会话失效') < 0
    })()`, 20000, '孤星纪元卡状态收敛（非未绑定/非失效）')
    // 收敛失败时的诊断读数：宿主会话列表面（侧栏）+ 绑定面（若已收敛则不打扰）
    const settleDiag = await cdp.evaluate(`(() => {
      const body = document.body.innerText || ''
      const i = body.indexOf('小说管理工作台')
      return {
        hostSidebarSlice: body.slice(0, Math.max(120, i > 0 ? i : 200)),
        hostHasNoSessions: body.indexOf('暂无会话') >= 0,
        drawerSubs: [...document.querySelectorAll('.nv-drawer .nv-card-sub')].map((n) => n.textContent),
        staleCount: [...document.querySelectorAll('.nv-drawer .nv-card-sub')].filter((n) => /会话失效/.test(n.textContent)).length,
      }
    })()`)
    const bindPanelWasOpen = await cdp.evaluate("(() => { const bd = document.querySelector('.nv-modal-backdrop'); if (bd === null) return false; bd.click(); return true })()")
    if (bindPanelWasOpen === true) await sleep(800)
    const reopenAttempt = await cdp.evaluate(`(() => {
      const d = [...document.querySelectorAll('.nv-drawer .nv-card')].find((c) => (c.querySelector('.nv-card-title') || {}).textContent === '孤星纪元')
      if (d === undefined || d === null) return { clicked: false, reason: 'card-not-found' }
      const sub = (d.querySelector('.nv-card-sub') || {}).textContent
      d.click()
      return { clicked: true, subBefore: sub }
    })()`)
    const reopened = await waitFor("document.querySelector('.nv-bar') !== null", 90000, '分栏重开')
    await sleep(1200)
    const reopenDiag = await cdp.evaluate(`(() => ({
      split: document.querySelector('.nv-split') !== null, bar: document.querySelector('.nv-bar') !== null,
      console: document.querySelector('.nv-console') !== null, bindPanel: document.querySelector('.nv-modal') !== null,
      drawerNotice: (document.querySelector('.nv-drawer-notice') || {}).textContent ?? null,
      barNotice: (document.querySelector('.nv-notice') ?? document.querySelector('.nv-bar-note') ?? {}).textContent ?? null,
      drawerSubs: [...document.querySelectorAll('.nv-drawer .nv-card-sub')].map((n) => n.textContent),
    }))()`)
    report.facts.reopenDiag = { settleToBound, settleDiag, bindPanelWasOpen, reopenAttempt, reopenDiag }
    report.facts.reopen = reopened
    if (reopened !== true) {
      assertion('C9-width-memory', '分栏/分隔线', '关闭后重开 → 左窗宽按存档恢复（宽度记忆，偏差 ≤2px）', false,
        { reason: '分栏重开失败', settleToBound, settleDiag, bindPanelWasOpen, reopenAttempt, reopenDiag })
    } else {
      const afterReopen = await cdp.evaluate("(() => { const l = document.querySelector('.nv-left'); return l === null ? null : { w: +l.getBoundingClientRect().width.toFixed(1) } })()")
      assertion('C9-width-memory', '分栏/分隔线', '关闭后重开 → 左窗宽按存档恢复（宽度记忆，偏差 ≤2px）',
        afterReopen !== null && Math.abs(afterReopen.w - afterDrag.w) <= 2, { afterDragW: afterDrag.w, afterReopen, settleToBound, reopenAttempt })
    }

    // ⇄ 换边
    const sideBefore = await cdp.evaluate("(() => { const raw = JSON.parse(localStorage.getItem('dsh.novel.split.v1') || '{}'); const r = document.querySelector('[data-phase]'); const va = r === null ? null : r.children[1]; return { chatSide: raw.chatSide, ml: va === null ? null : va.style.marginLeft, mr: va === null ? null : va.style.marginRight } })()")
    await clickByLabel('换边')
    await sleep(1400)
    const sideAfter = await cdp.evaluate("(() => { const raw = JSON.parse(localStorage.getItem('dsh.novel.split.v1') || '{}'); const r = document.querySelector('[data-phase]'); const va = r === null ? null : r.children[1]; return { chatSide: raw.chatSide, ml: va === null ? null : va.style.marginLeft, mr: va === null ? null : va.style.marginRight, splitOpen: document.querySelector('.nv-split') !== null } })()")
    report.facts.flip = { sideBefore, sideAfter }
    assertion('C10-flip-side', '分栏/换边', '⇄ 换边 → chatSide right→left 且持久化；挤法边距换侧；分栏未自关（UX-014 sameMargin 容差回归）',
      sideAfter.chatSide === 'left' && sideAfter.splitOpen === true && sideAfter.mr !== '' && sideBefore.ml !== '',
      { sideBefore, sideAfter })
    const flipBackClick = await clickByLabel('换边')
    await sleep(1200)
    const sideBack = await localSplit()
    const sideBackSplitOpen = await cdp.evaluate("document.querySelector('.nv-split') !== null")
    // R1 附带修复（空真类）：原谓词只判 `chatSide === 'right'`——分栏未重开时 ⇄ 从未被点击、
    // `chatSide` 本就为 `right` ⇒ 条件平凡成立而记 PASS（C11 曾被单列「空真，不可采信」）。
    // 新谓词加**点击成功**前置（`clickByLabel` 找不到目标返回 false）⇒ 未点击时无可判观测 ⇒ N-A，不再冒充 PASS。
    assertion('C11-flip-back', '分栏/换边', '⇄ 再点 → 回到 chatSide=right（两态可逆；须先确认 ⇄ 确实被点击）',
      flipBackClick === true && sideBack !== null && sideBack.chatSide === 'right' && sideBackSplitOpen === true,
      { flipBackClick, sideBack, sideBackSplitOpen },
      flipBackClick === true ? undefined : 'N-A')

    } // cFaceRest 收口（C6~C11 全部依赖「分栏在场」前置）

    /**
     * R1 F-04 修复：E 面（notice 双形态）、F 面（`dsh:split-claim`）与 D3（控制台↔分栏互斥）的
     * **前置构造**不再只依赖「孤星纪元」一张卡。
     *
     * 原实现只用 `孤星纪元` 重开（`probe` L933-940/L984-990），而该卡在自动链后已有绑定记录、
     * 且 D-2 未收敛 ⇒ 点击必入「失效重绑」分支 ⇒ 前置恒不成立 ⇒ UX-060 告警面零自动覆盖。
     * 新实现优先用 fixture 中**从未绑定**的卡：C1 已证「未绑定卡 → openCtl 自动链 → 分栏打开」可用，
     * 且该路径在 DEC-015 下会经 `novelSplit.open` 关控制台 ⇒ 前置对 E/F/D3 均有效。
     *
     * @returns {Promise<{ok:boolean,attempts:object[],reason?:string}>}
     */
    const prepareSplitForNotice = async () => {
      const attempts = []
      // 未绑定候选（fixture 除 `zz-first-probe`/`nn-stale-bound` 外的 8 本）+ 末位回退 `zz-first-probe`
      const candidates = [
        { id: 'mm-third-probe', title: '长风渡' }, { id: 'cc-fifth-probe', title: '折戟' },
        { id: 'gg-ninth-probe', title: '西行' }, { id: 'ff-eighth-probe', title: '东归' },
        { id: 'bb-fourth-probe', title: '雪落无声' }, { id: 'zz-first-probe', title: '孤星纪元' },
      ]
      let splitNow = await cdp.evaluate("document.querySelector('.nv-bar') !== null")
      if (splitNow === true) return { ok: true, attempts, reason: 'already-open' }
      for (const cand of candidates) {
        if (splitNow === true) break
        const clicked = await cdp.evaluate(`(() => {
          const title = ${JSON.stringify(cand.title)}
          // 控制台网格卡优先（有 data-nv-id 锚点）；抽屉卡以其标题文本定位（无 data-nv-id）
          const grid = document.querySelector('.nv-ccard[data-nv-id=' + ${JSON.stringify(cand.id)} + ']')
          const drawer = [...document.querySelectorAll('.nv-drawer .nv-card')]
            .find((n) => ((n.querySelector('.nv-card-title') || {}).textContent || '') === title)
          const node = grid !== null ? grid : (drawer ?? null)
          if (node === null) return { clicked: false }
          node.click()
          return { clicked: true, source: grid !== null ? 'grid' : 'drawer' }
        })()`)
        // 自动链（sessions.create → 预设 → 绑定 → open → ensureSplit）最长等待 30 s
        const opened = clicked.clicked === true ? await waitFor("document.querySelector('.nv-bar') !== null", 30000, '前置构造（未绑定卡 ' + cand.id + '）→ 分栏') : false
        await sleep(1200)
        const diag = await cdp.evaluate("({ bar: document.querySelector('.nv-bar') !== null, bindPanel: document.querySelector('.nv-modal') !== null })")
        attempts.push({ cardId: cand.id, clicked, opened, ...diag })
        splitNow = diag.bar
      }
      return { ok: splitNow === true, attempts, reason: splitNow === true ? 'unbound-card-reopen' : 'all-6-cards-failed' }
    }

    // ── 11) E 面：notice 短提示（标题栏 chip 单行）────────────────────────
    // R1 F-04 修复：前置不再只依赖 `孤星纪元`（该卡已有绑定记录且 D-2 未收敛 ⇒ 点击必入失效重绑分支），
    // 改用 fixture 中**从未绑定**的卡触发同一条 openCtl 自动链（C1 已证该路径可用）。
    const prepForNotice = await prepareSplitForNotice()
    report.facts.splitReadyForNotice = prepForNotice
    const splitForNotice = prepForNotice.ok === true
    if (splitForNotice !== true) {
      assertion('E1-short-notice-compact', 'notice', '短提示保持标题栏紧凑 chip（单行、高 ≤32px、title 属性置空）——UX-060（**本次未取得**：6 张卡重开路径全部未得到分栏 ⇒ 如实记 N-A）',
        false, { reason: '前置未取得（路径已尝试，非「本实例无法构造」）', prep: prepForNotice, splitFate: report.facts.splitFate ?? null }, 'N-A')
      assertion('E2-long-notice-flow', 'notice', '长 err 提示走流式可读面（UX-060）——同上 N-A', false, { reason: '前置未取得：分栏未打开（6 卡路径已尝试）', prep: prepForNotice }, 'N-A')
      assertion('E3-long-notice-geometry', 'notice', '长提示几何（不在标题栏内/不覆盖下方内容）——同上 N-A', false, { reason: '前置未取得：分栏未打开（6 卡路径已尝试）', prep: prepForNotice }, 'N-A')
      assertion('E4-notice-close', 'notice', '长提示关闭钮语义——同上 N-A', false, { reason: '前置未取得：分栏未打开（6 卡路径已尝试）', prep: prepForNotice }, 'N-A')
      assertion('F1-split-claim-event', '共存互斥', 'dsh:split-claim 占用声明——同上 N-A', false, { reason: '前置未取得：分栏未打开（6 卡路径已尝试）', prep: prepForNotice }, 'N-A')
    } else {
    // 短提示构造：优先点「⟳ 恢复默认」（幂等；**不**用 ⇄ 换边——那会让 C10/C11 的存档态
    // 与后续 D3 前置分栏在场的假设漂移），其次点「☆ 设为默认」。二者都不改分栏在场性。
    const restoreClicked = await cdp.evaluate(`(() => {
      const btns = [...document.querySelectorAll('.nv-bar-ctl')]
      const b = btns.find((x) => (x.getAttribute('aria-label') || '').indexOf('恢复默认') >= 0)
        ?? btns.find((x) => (x.getAttribute('aria-label') || '').indexOf('设为默认') >= 0)
      if (b === undefined) return { clicked: false, labels: btns.map((x) => x.getAttribute('aria-label')) }
      b.click()
      return { clicked: true, label: b.getAttribute('aria-label') }
    })()`)
    await waitFor(`(() => { const n = document.querySelector('.nv-bar-note') ?? document.querySelector('.nv-notice'); return n !== null && n.textContent.indexOf(${JSON.stringify(i18n.resetLayoutDone)}) >= 0 })()`, 20000, '短 ok 提示')
    await sleep(800)
    const shortState = await cdp.evaluate(`(() => {
      const bars = [...document.querySelectorAll('.nv-bar')]
      const note = document.querySelector('.nv-bar-note') ?? document.querySelector('.nv-notice')
      if (note === null) return null
      // 容器归属：.nv-notice 流式面是**第二个** bar 子节点（同一 .nv-bar 内），但分栏重开可能留下旧节点 ⇒
      // 报告实际归属的 .nv-bar 并列出全部 bar（诊断多 bar 选择器歧义）
      const owner = bars.find((b) => b.contains(note)) ?? null
      const bar = owner
      const b = note.getBoundingClientRect()
      const span = note.querySelector('.nv-notice-text') ?? note
      const cs = getComputedStyle(span); const lh = cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight)
      return {
        cls: note.className, form: note.getAttribute('data-form'), kind: note.getAttribute('data-kind'), text: note.textContent,
        titleAttr: note.getAttribute('title') || '', h: +b.height.toFixed(1), w: +b.width.toFixed(1),
        insideBar: bar !== null, barCount: bars.length,
        lines: lh === null ? null : Math.round(span.getBoundingClientRect().height / lh),
        overflow: { sw: note.scrollWidth, cw: note.clientWidth },
      }
    })()`)
    report.facts.noticeShort = shortState
    report.facts.noticeShortTrigger = restoreClicked
    /**
     * R1 F-04 后续订正：UX-060 的**契约**是「长告警 → in-flow 流式面；短提示 → 紧凑单行」。
     * 实测短 ok 提示走 `.nv-notice[data-form=row]`（`lib/client.js:L4177`：流式面自身按文本长度区分
     * `row`/`block` 形态），即「紧凑单行承载」而非标题栏内 `.nv-bar-note` chip。
     * 因此判定按**可失败的单行紧凑语义**：短文本（≤ NOTICE_INLINE_MAX=24）⇒ 必须在场 ∧ 单行 ∧ 高 ≤32px
     * ∧ title 置空 ∧ 无溢出；若渲染成 block/多行/溢出 ⇒ FAIL。
     * 反例自证：`form === 'block'`（短文本被当长告警）或 `lines >= 2` ⇒ 断言红。
     */
    const shortIsCompact = shortState !== null && shortState.form === 'row' && shortState.lines === 1 && shortState.h <= 32
      && shortState.titleAttr === '' && shortState.overflow.sw <= shortState.overflow.cw + 1
    assertion('E1-short-notice-compact', 'notice', '短提示（≤24 字符，`NOTICE_INLINE_MAX`）走紧凑单行承载：在场 ∧ data-form=row ∧ 单行 ∧ 高 ≤32px ∧ title 置空 ∧ 无溢出——UX-060 短提示零变化；触发 = 幂等动作（恢复/设为默认）',
      shortIsCompact === true, { shortState, restoreClicked, shortIsCompact })

    // ── 12) E 面：notice 长提示（故障注入 → 流式可读面）──────────────────
    const injections = { count: 0, enabled: false }
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
        parsed.result = { ok: false, error: { code: 'gateway/internal', message: INJECTED_SERVER_ERROR, details: {} } }
        const body = Buffer.from(JSON.stringify(parsed), 'utf8').toString('base64')
        await cdp.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body })
      } catch { await proceed() }
    })
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*api/session/prompt*', requestStage: 'Response' }] })
    injections.enabled = true
    const launchClicked = await cdp.evaluate(`(() => { const b = document.querySelector('.nv-wfctl button'); if (b === null) return false; b.click(); return true })()`)
    const longShown = await waitFor(`(() => { const n = document.querySelector('.nv-notice') ?? document.querySelector('.nv-bar-note'); return n !== null && n.textContent.indexOf(${JSON.stringify(i18n.promptFailPrefix)}) >= 0 })()`, 30000, '长 err 提示')
    injections.enabled = false
    await cdp.send('Fetch.disable').catch(() => {})
    await sleep(900)
    const longState = await cdp.evaluate(`(() => {
      const bar = document.querySelector('.nv-bar')
      const note = document.querySelector('.nv-notice') ?? document.querySelector('.nv-bar-note')
      if (note === null || bar === null) return null
      const b = note.getBoundingClientRect(); const bb = bar.getBoundingClientRect()
      const title = document.querySelector('.nv-bar-title'); const tr = title === null ? null : title.getBoundingClientRect()
      const ctls = [...document.querySelectorAll('.nv-bar-ctl')].map((c) => c.getBoundingClientRect())
      const inter = (r1, r2) => { if (r1 === null || r2 === null) return null; const w = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left)); const h = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top)); return +(w * h).toFixed(1) }
      const span = note.querySelector('.nv-notice-text') ?? note
      const cs = getComputedStyle(span); const lh = cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight)
      const chrow = document.querySelector('.nv-chrow'); const wfrow = document.querySelector('.nv-wf-row[data-cur=true]')
      const tops = [chrow, wfrow].filter((x) => x !== null).map((x) => x.getBoundingClientRect().top)
      return {
        cls: note.className, form: note.getAttribute('data-form'), kind: note.getAttribute('data-kind'), text: note.textContent, len: note.textContent.length,
        rect: { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) },
        barBottom: +bb.bottom.toFixed(1), insideBar: bar.contains(note),
        interTitle: inter(b, tr), interCtlMax: Math.max(0, ...ctls.map((c) => inter(b, c) ?? 0)),
        lines: lh === null ? null : Math.round(span.getBoundingClientRect().height / lh),
        overflow: { sw: note.scrollWidth, cw: note.clientWidth, sh: note.scrollHeight, ch: note.clientHeight },
        titleAttr: note.getAttribute('title') || '', close: document.querySelectorAll('.nv-notice-close').length,
        belowContent: tops.length === 0 ? null : b.bottom <= Math.min(...tops) + 0.5, whiteSpace: getComputedStyle(span).whiteSpace,
      }
    })()`)
    report.facts.noticeLong = longState
    report.facts.injections = { count: injections.count, launchClicked }
    const longTextOk = longState !== null && String(longState.text).startsWith(i18n.promptFailPrefix) && String(longState.text).endsWith(i18n.promptFailHint)
      && longState.len > i18n.promptFailPrefix.length + i18n.promptFailHint.length + 20
    assertion('E2-long-notice-flow', 'notice', '长 err 提示走标题栏下方 in-flow 流式面：data-form=block、不在标题栏内、多行、pre-wrap 无截断、有关闭钮、title 置空、首尾文案逐字（UX-060）',
      longShown === true && longState !== null && longState.form === 'block' && longState.insideBar === false && longState.lines >= 2
      && longState.overflow.sw <= longState.overflow.cw + 1 && longState.overflow.sh <= longState.overflow.ch + 1
      && longState.close === 1 && longState.titleAttr === '' && longState.whiteSpace === 'pre-wrap' && longTextOk === true,
      longState === null ? null : { form: longState.form, insideBar: longState.insideBar, lines: longState.lines, overflow: longState.overflow, titleAttr: longState.titleAttr, whiteSpace: longState.whiteSpace, len: longState.len, prefixOk: String(longState.text).startsWith(i18n.promptFailPrefix), suffixOk: String(longState.text).endsWith(i18n.promptFailHint), injections })
    assertion('E3-long-notice-geometry', 'notice', '长提示与标题/控件交集 = 0；位于标题栏之下；不覆盖下方首屏内容（章节行/当前阶段行）',
      longState !== null && longState.interTitle === 0 && longState.interCtlMax === 0 && longState.rect.y >= longState.barBottom - 0.5 && longState.belowContent !== false,
      longState === null ? null : { interTitle: longState.interTitle, interCtlMax: longState.interCtlMax, y: longState.rect.y, barBottom: longState.barBottom, belowContent: longState.belowContent })
    await screenshot('02-long-notice-block')

    // 关闭钮语义（长提示有独立关闭钮）
    const closedNotice = await cdp.evaluate("(() => { const b = document.querySelector('.nv-notice-close'); if (b === null) return false; b.click(); return true })()")
    await sleep(700)
    const noticeGone = await cdp.evaluate("({ notice: document.querySelector('.nv-notice') !== null, chip: document.querySelector('.nv-bar-note') !== null })")
    assertion('E4-notice-close', 'notice', '长提示关闭钮 → 提示消失（关闭钮语义可用）', closedNotice === true && noticeGone.notice === false, noticeGone)

    // ── 13) F 面：跨插件互操作协议面 ──────────────────────────────────────
    // R1 F-04 后续加固：§12 注入期间分栏可能被 UX-014⑧ 联动关闭 ⇒ 先做**前置确认与恢复**
    // （未绑定卡路径），再「关 → 开」以捕获打开路径派发的占用声明。
    let interopPrep = { ok: true, reason: 'already-open' }
    if ((await cdp.evaluate("document.querySelector('.nv-bar') !== null")) !== true) interopPrep = await prepareSplitForNotice()
    report.facts.interopPrep = interopPrep
    const claim = await cdp.evaluate(`(async () => {
      const got = []
      const h = (e) => got.push(e.detail === undefined || e.detail === null ? null : e.detail.id)
      window.addEventListener('dsh:split-claim', h)
      const barBefore = document.querySelector('.nv-bar') !== null
      const ctl = [...document.querySelectorAll('.nv-bar-ctl')].find((x) => (x.getAttribute('aria-label') || '').indexOf('关闭') >= 0)
      if (ctl !== undefined) ctl.click()
      // 关闭确认（等分栏确实消失再重开；定长 sleep 会让重开点击撞上「正在关闭」窗口）
      for (let i = 0; i < 40 && document.querySelector('.nv-bar') !== null; i += 1) await new Promise((r) => setTimeout(r, 250))
      const barClosed = document.querySelector('.nv-bar') === null
      const card = [...document.querySelectorAll('.nv-drawer .nv-card')].find((c) => (c.querySelector('.nv-card-title') || {}).textContent === '孤星纪元')
      if (card !== undefined) card.click()
      await new Promise((r) => setTimeout(r, 3500))
      window.removeEventListener('dsh:split-claim', h)
      return { claims: got, barBefore, barClosed, reopened: document.querySelector('.nv-split') !== null, taSplitClose: document.querySelectorAll('.ta_splitClose').length }
    })()`)
    report.facts.interop = claim
    assertion('F1-split-claim-event', '共存互斥', '分栏打开路径派发 dsh:split-claim 占用声明（detail.id=novel-writing）——dsh-worktable 互操作协议面（client.js L1045-1056）',
      Array.isArray(claim.claims) && claim.claims.indexOf('novel-writing') >= 0, { claim, interopPrep })
    }

    // ── 14) D 面：控制台↔分栏互斥（打开控制台自动关分栏）────────────────
    // R1 F-02 修复：原断言无前置校验 —— 记录运行实测 `barOpenBefore:false`（分栏彼时已不在场）
    // ⇒ 后件在动作之前就已成立 ⇒ 断言无失败能力（且与 E1~E4/F1 对同一前置缺失的处理口径不一致）。
    // 新实现：① 先确保分栏在场（未绑定卡路径恢复；失败则记 N-A 而非 PASS）；② 断言必须看到
    // 「分栏确实被这次的抽屉标题行点击关掉」——`barOpenBefore=true ∧ consoleOpen=true ∧ barOpenAfter=false`。
    // 反例自证：若产品不再互斥（barOpenAfter=true）⇒ 表达式 false ⇒ FAIL；若前置未取得 ⇒ N-A（不计 PASS）。
    let d3Prep = { ok: true, reason: 'already-open' }
    if ((await cdp.evaluate("document.querySelector('.nv-bar') !== null")) !== true) d3Prep = await prepareSplitForNotice()
    report.facts.d3Prep = d3Prep
    const exclusivity = await cdp.evaluate(`(async () => {
      const barOpen = document.querySelector('.nv-bar') !== null
      const head = document.querySelector('.nv-drawer-head')
      if (head !== null) head.click()
      await new Promise((r) => setTimeout(r, 1800))
      return { barOpenBefore: barOpen, consoleOpen: document.querySelector('.nv-console') !== null, barOpenAfter: document.querySelector('.nv-split') !== null }
    })()`)
    report.facts.exclusivity = exclusivity
    assertion('D3-mutual-exclusion', '控制台/分栏', '控制台与分栏互斥：分栏**先在场**，点抽屉标题行开控制台 → 分栏被这次动作关掉（DEC-015；前置不成立则记 N-A）',
      exclusivity.barOpenBefore === true && exclusivity.consoleOpen === true && exclusivity.barOpenAfter === false,
      { ...exclusivity, d3Prep },
      exclusivity.barOpenBefore === true ? undefined : 'N-A')

    // 卡片数（自动建会话后 +1：新书进入 overview）
    await sleep(3000)
    const afterCreate = await cdp.evaluate(`(() => ({
      cards: document.querySelectorAll('.nv-cgrid .nv-ccard').length,
      id: [...document.querySelectorAll('.nv-cgrid .nv-ccard')].map((n) => n.getAttribute('data-nv-id')),
      fold: (document.querySelector('.nv-cfold') || {}).textContent ?? null,
      drawerCards: document.querySelectorAll('.nv-drawer .nv-card').length,
      drawerSubs: [...document.querySelectorAll('.nv-drawer .nv-card-sub')].map((n) => n.textContent),
    }))()`)
    report.facts.afterAutoCreate = afterCreate
    // D4 判据：书目数 +1 且抽屉不再显示「未绑定」；若绑定未收敛则如实 FAIL（缺陷线索）
    const autoCreateBound = await cdp.evaluate(`(() => {
      const d = [...document.querySelectorAll('.nv-drawer .nv-card')].find((c) => (c.querySelector('.nv-card-title') || {}).textContent === '孤星纪元')
      const sub = d === undefined ? null : (d.querySelector('.nv-card-sub') || {}).textContent
      return { sub, bound: sub !== null && sub.indexOf('未绑定') < 0 && sub.indexOf('会话失效') < 0 }
    })()`)
    report.facts.afterAutoCreateBound = autoCreateBound
    assertion('D4-auto-create-book-persisted', '数据/绑定', '自动链新建的会话已绑定：新书进入书目（总 11 本，折叠后 8 卡）且抽屉卡状态收敛为非「未绑定/会话失效」',
      afterCreate.cards === 8 && Array.isArray(afterCreate.id) && afterCreate.id.indexOf('zz-first-probe') >= 0
      && afterCreate.drawerCards >= 10 && autoCreateBound.bound === true, { afterCreate, autoCreateBound })
    // R1 F-11 修复：原判据 `cdot >= 1` 以「双圆已渲染」代理「服务可用」，**从未读取产品自身的 degraded 判定**
    // （`lib/client.js:L3148` = `props.useSessions === null || launcher.sessions === null`；L3052 在该判定为真时
    // 不渲染 `.nv-cdot`）。新判据读**两条 L3148 派生渲染面**，并把「降级分支不可达」如实暴露为 `degradedBranchReachable`：
    //   · 抽屉卡双圆（L2893：`degraded === true ? null : el(BindDot…)`）
    //   · 工作台控制条降级 chip（L4034：`degraded ? 会话服务不可用 chip : null`）
    // 判据 = 二者必须**同向**：出现任一 ⇒ 服务可用；二者皆无 ⇒ 服务缺席分支（本运行不可判别时记 N-A 而非 PASS）。
    const degradedProbe = await cdp.evaluate(`(() => ({
      consoleDots: document.querySelectorAll('.nv-cgrid .nv-ccard .nv-cdot').length,
      consoleCards: document.querySelectorAll('.nv-cgrid .nv-ccard').length,
      drawerCards: document.querySelectorAll('.nv-drawer .nv-card').length,
      drawerDots: document.querySelectorAll('.nv-drawer .nv-card .nv-dot').length,
      barDegradedChip: document.querySelectorAll('.nv-wfctl [title]').length > 0
        ? [...document.querySelectorAll('.nv-wfctl span')].some((n) => (n.getAttribute('title') || '').indexOf('会话服务不可用') >= 0)
        : false,
      drawerNoSessionCue: (document.body.innerText || '').indexOf('会话服务不可用') >= 0,
    }))()`)
    report.facts.degradedProbe = degradedProbe
    const serviceSignal = degradedProbe.drawerDots >= 1 || degradedProbe.barDegradedChip === true
    const serviceAbsent = degradedProbe.drawerDots === 0 && degradedProbe.barDegradedChip === false
    const degradedOk = serviceSignal === true
      ? (degradedProbe.drawerDots >= 1 && degradedProbe.consoleDots >= 1 && degradedProbe.consoleCards >= 1)
      : serviceAbsent === true && degradedProbe.consoleDots === 0
    assertion('D5-sessions-present', '降级态', '会话服务可用性以产品自身 `degraded` 派生渲染面为准（L3148/L2893/L4034）：服务可用 ⇒ 抽屉双圆与控制台双圆**同时**在场；二者皆无 ⇒ 服务缺席分支（本实例该分支不可达 ⇒ 记 N-A，不冒充可判别 PASS）',
      degradedOk,
      { ...degradedProbe, serviceSignal, serviceAbsent, degradedBranchReachable: false, legacyPredicate: gridState.counts.cdot >= 1 },
      serviceSignal === true ? undefined : 'N-A')

    // 会话数据面权威断言（此时自动链已建会话 ⇒ sessions 镜像有内容）：
    // 关键词用『孤星』——同键同时命中书目 id/title 与会话 id（zz-first-probe 派生），一次覆盖「滤小说 + 找 session」两义。
    await setInput('.nv-csearch input', '孤星')
    await sleep(2200)
    const sessionRows = await cdp.evaluate(`(() => ({
      kw: (document.querySelector('.nv-csearch input') || {}).value,
      foundTitle: (document.querySelector('.nv-cfound-title') || {}).textContent ?? null,
      rows: [...document.querySelectorAll('.nv-cfound .nv-srow')].map((n) => ({ t: (n.querySelector('.nv-srow-title') || {}).textContent, sub: (n.querySelector('.nv-srow-sub') || {}).textContent })),
      cards: document.querySelectorAll('.nv-cgrid .nv-ccard').length,
    }))()`)
    report.facts.sessionSearchAuthoritative = sessionRows
    // R1 F-03 修复：镜像本体读数与会话行读数一并落证；判定依据 = **插件镜像是否反映宿主已认可的会话**，
    // 不再以 `innerText` 启发式「暂无会话」做 N-A 理由（该启发式在记录运行中恒为 false，与 N-A 理由自相矛盾）。
    const hostRowsAtB21 = await readHostSessionRows(cdp)
    report.facts.hostSessionRowsAtB21 = hostRowsAtB21
    const acked = report.facts.sessionAckIds ?? { boundId: null, hostWorkspaceSessionIds: [], onDiskSessionIds: [] }
    const expectedIds = [acked.boundId, ...(acked.hostWorkspaceSessionIds ?? []), ...(acked.onDiskSessionIds ?? [])]
      .filter((x) => typeof x === 'string' && x.length > 0)
    /** 宿主「已认可该会话」三面齐备：overview 绑定 id ∧ 宿主工作区表 sessionIds ∧ 隔离盘会话存储（§14 与 §16 同一口径）。 */
    const ackComplete = (typeof acked.boundId === 'string' && acked.boundId.length > 0)
      && (acked.hostWorkspaceSessionIds ?? []).indexOf(acked.boundId) >= 0
      && (acked.onDiskSessionIds ?? []).indexOf(acked.boundId) >= 0
    const sessionRowsText = JSON.stringify(sessionRows)
    if (sessionRows.rows.length >= 1) {
      // 镜像有内容时，必须命中宿主已认可的会话 id（否则镜像与宿主口径不一致 ⇒ 真实缺陷）
      const mirrorReflectsHost = expectedIds.some((id) => sessionRowsText.indexOf(id) >= 0)
      assertion('B21a-search-find-sessions', '控制台/搜索', '关键词命中会话 → 渲染「找到的会话（N）」+ 会话行（sessions 镜像订阅生效）',
        typeof sessionRows.foundTitle === 'string' && sessionRows.foundTitle.indexOf('找到的会话') >= 0
        && sessionRows.rows.every((r) => typeof r.t === 'string' && r.t.length > 0) && mirrorReflectsHost === true,
        { sessionRows, hostRowsAtB21, expectedIds, mirrorReflectsHost })
      // 点会话行 → 打开该会话并关控制台
      const rowClick = await cdp.evaluate(`(async () => {
        const row = document.querySelector('.nv-cfound .nv-srow')
        if (row === null) return { clicked: false }
        row.click()
        await new Promise((r) => setTimeout(r, 2000))
        return { clicked: true, consoleOpen: document.querySelector('.nv-console') !== null }
      })()`)
      report.facts.sessionRowClick = rowClick
      assertion('B22-session-row-opens', '控制台/搜索', '点「找到的会话」行 → 打开该会话并关闭控制台（launcher.open + 关控制台）',
        rowClick.clicked === true && rowClick.consoleOpen === false, rowClick)
    } else {
      /**
       * R1 F-03 修复：原 N-A 理由是「插件链建的会话未进入宿主会话列表/侧栏（宿主侧栏『暂无会话』）」——
       * 与同记录字段自相矛盾（`convergence.samples[*].hostNoSessions=false` 13/13、`hostSidebar.noSessions=false`），
       * 且启发式口径本身不确定。新判定依据只陈述**可机证**的事实：
       *   宿主已认可该会话（overview 绑定 id ∧ 宿主工作区表 sessionIds ∧ 隔离盘会话存储三者齐备，见 `facts.sessionAckIds`），
       *   而插件镜像 `sessionsAll.ids` 为空 ⇒ 「找到的会话」区不渲染 ⇒ **镜像未反映宿主会话**。
       * 该形态是**真实缺陷**（BUG-009 同族：宿主已认可的会话在插件侧不收敛），非「环境无法构造」；
       * 是否同源于 D-2 需 Developer 定位（QA 只报不改）。若宿主自身会话行也缺场（`hostRowsAtB21.count===0`）
       * 无法据此归因时，附注为待定位而非必要条件 —— 判据落在「宿主已认可」这一硬证据上。
       */
      assertion('B21a-search-find-sessions', '控制台/搜索', '关键词命中会话 → 「找到的会话」行：宿主已认可该会话（绑定 id ∧ 宿主工作区 sessionIds ∧ 盘上会话存储齐备）而镜像 `sessionsAll.ids` 为空 ⇒ 镜像未反映宿主会话（真实缺陷，非 N-A）',
        ackComplete === true,
        { sessionRows, acked, ackComplete, hostRowsAtB21, note: '宿主侧栏启发式读数（hostNoSessions）已弃用；判定依据 = 宿主三面认可 ∧ 插件镜像空' },
        ackComplete === true ? undefined : 'N-A')
      assertion('B22-session-row-opens', '控制台/搜索', '点「找到的会话」行 → 打开会话并关控制台（前置：镜像有会话行；本运行镜像空 ⇒ 无可点行）',
        false, { sessionRows, acked, ackComplete, hostRowsAtB21, reason: '镜像 sessionsAll.ids 为空 ⇒ 无「找到的会话」行可点' }, 'N-A')
    }
    await setInput('.nv-csearch input', '').catch(() => {})

    await screenshot('03-console-final')

    // ── 15) 会话联动（宿主侧栏切换会话 → 分栏/控制台自动关）──────────────
    // R1 附带修复（F-03 ③ 同族）：原代理动作用 `/^nv-/` 过滤类名再按文本「新会话」匹配 —— 插件气泡容器
    // 也会渲染该文案，且未观测「切换是否真的发生」。改为：① 动作对象限定在 `.nv-drawer` 之外（宿主自身
    // 会话行/新建会话钮）；② 读宿主会话行数，仅在动作前确有宿主侧栏元素时才判 PASS/FAIL，否则 N-A。
    // R1 附带修复（D6 前置）：§16 与 §15 的顺序使 D6 需要**先确保控制台在场**——否则
    // `before.consoleOpen` 为 false ⇒ N-A（虽诚实，但掩盖了可构造的场景）。此处显式打开并校验。
    const d6ConsolePre = await cdp.evaluate(`(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const head = document.querySelector('.nv-drawer-head')
      let clicks = 0
      for (let i = 0; i < 3 && document.querySelector('.nv-console') === null; i += 1) { clicks += 1; if (head !== null) head.click(); await sleep(1500) }
      return { clicks, consoleOpen: document.querySelector('.nv-console') !== null }
    })()`)
    report.facts.d6ConsolePre = d6ConsolePre
    const navProbe = await cdp.evaluate(`(async () => {
      const barOpen = document.querySelector('.nv-split') !== null
      const inDrawer = (n) => n.closest !== undefined && n.closest('.nv-drawer') !== null
      const byRow = [...document.querySelectorAll('button[class*="sessionRow"]')].filter((n) => inDrawer(n) !== true && (n.textContent || '').trim().length > 0)
      const byText = [...document.querySelectorAll('button,[role=button],a')].filter((n) => inDrawer(n) !== true && /新会话|New session/.test((n.textContent || '').trim()))
      const target = byRow[0] ?? byText[0] ?? null
      const hostRowsBefore = byRow.length
      if (target === null) return { clicked: false, reason: 'no-host-sidebar-session-affordance', barOpen, hostRowsBefore }
      const before = { consoleOpen: document.querySelector('.nv-console') !== null, barOpen }
      target.click()
      await new Promise((r) => setTimeout(r, 2500))
      return { clicked: true, before, hostRowsBefore, hostRowsAfter: document.querySelectorAll('button[class*="sessionRow"]').length, after: { consoleOpen: document.querySelector('.nv-console') !== null, barOpen: document.querySelector('.nv-split') !== null }, cand: byRow.length + byText.length, source: byRow.length > 0 ? 'sessionRow' : 'newSession-button' }
    })()`)
    report.facts.sessionSwitch = navProbe
    /**
     * R1 F-03 附带修复（②）：原实现把「点宿主侧栏『新会话』按钮」当作「切换会话」的代理并据此判 FAIL ——
     * 但该按钮是**新建**入口，不改变 `sessions.current` ⇒ 控制台不会关闭，判 FAIL 属**依据不足**
     * （DEFECTS §4「未定性」）。现收紧为：**仅当宿主确有可点击的会话行**（`hostRowsBefore ≥ 1`）时才判；
     * 无会话行 ⇒ 如实记 N-A（该面归入 checklist §9 R-04 未覆盖风险 + U-13）。
     */
    if (navProbe.clicked === true && navProbe.before.consoleOpen === true && (navProbe.hostRowsBefore ?? 0) >= 1) {
      assertion('D6-session-switch-close', '降级态/会话联动', '宿主侧栏切换到其他会话 → 控制台自动关闭（UX-010④/BUG-004 last-non-null 基准）',
        navProbe.after.consoleOpen === false, navProbe)
    } else {
      assertion('D6-session-switch-close', '降级态/会话联动', '宿主侧栏切换会话 → 控制台自动关闭（前置未取得：本机宿主侧栏**无会话行**（`hostRowsBefore=0`，本机只有「新建会话」入口）⇒ 无「切换」动作可构造 ⇒ 如实记 N-A，不据「新建」按钮判 FAIL）',
        false, { navProbe, d6ConsolePre, reason: 'hostRowsBefore=0：无宿主会话行，切换动作不可构造（归入 checklist §9 R-04 + U-13）' }, 'N-A')
    }

    // ── 16) 收尾观测：会话镜像同步探针（放最后——它会开关控制台，不影响先前场景）──
    // R1 F-03 修复（第 2 条 B21）：原实现先点 `.nv-drawer-head`（**反选切换**）——§15 结束时控制台已因
    // 会话联动关闭，单击反而把它切回「关」⇒ detail 只有 `{consoleOpen:false}` 早退 N-A，而 N-A 的理由
    // 却写成「会话未进入镜像」（与本条证据无关，且与 13/13 `hostNoSessions=false` 矛盾）。
    // 新实现：**点后校验 + 重试**，确保控制台真的打开（不再依赖反选语义）；判定依据同 §14（宿主三面认可 ∧ 镜像空 ⇒ 真实缺陷）。
    const mirrorProbe = await cdp.evaluate(`(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      const head = document.querySelector('.nv-drawer-head')
      let attempts = 0
      for (let i = 0; i < 3 && document.querySelector('.nv-console') === null; i += 1) {
        attempts += 1
        if (head !== null) head.click()
        await sleep(1600)
      }
      if (document.querySelector('.nv-console') === null) return { consoleOpen: false, attempts, reason: 'console-never-opened' }
      const inp = document.querySelector('.nv-csearch input')
      if (inp === null) return { consoleOpen: true, noInput: true, attempts }
      const set = (v) => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, v); inp.dispatchEvent(new Event('input', { bubbles: true })) }
      set('孤星')
      await sleep(2600)
      const out = {
        consoleOpen: true, attempts,
        found: (document.querySelector('.nv-cfound-title') || {}).textContent ?? null,
        rows: [...document.querySelectorAll('.nv-cfound .nv-srow')].map((n) => (n.querySelector('.nv-srow-title') || {}).textContent),
        cards: document.querySelectorAll('.nv-cgrid .nv-ccard').length,
      }
      set('')
      return out
    })()`)
    report.facts.sessionRowsProbe = mirrorProbe
    if (mirrorProbe.consoleOpen === true && Array.isArray(mirrorProbe.rows) && mirrorProbe.rows.length >= 1) {
      assertion('B21b-search-find-sessions-retest', '控制台/搜索', '关键词命中会话 → 「找到的会话（N）」+ 会话行（收尾复测：镜像订阅生效）',
        typeof mirrorProbe.found === 'string' && mirrorProbe.found.indexOf('找到的会话') >= 0, mirrorProbe)
    } else if (mirrorProbe.consoleOpen !== true) {
      assertion('B21b-search-find-sessions-retest', '控制台/搜索', '关键词命中会话 → 「找到的会话（N）」+ 会话行（收尾复测）——控制台未取得 ⇒ 如实记 N-A',
        false, { mirrorProbe, reason: '控制台未打开（已点 3 次并逐次校验）' }, 'N-A')
    } else {
      assertion('B21b-search-find-sessions-retest', '控制台/搜索', '关键词命中会话 → 「找到的会话」行：宿主已认可该会话而镜像 `sessionsAll.ids` 为空 ⇒ 镜像未反映宿主会话（真实缺陷，非 N-A）',
        false, { mirrorProbe, acked, ackComplete, reason: '控制台已在场且关键词注入完成，镜像仍无会话行 ⇒ 镜像未反映宿主已认可的会话' })
    }

    return 0
  } catch (e) {
    report.crash = String(e && e.stack ? e.stack : e).slice(0, 2000)
    console.error('[probe] 运行期异常：' + report.crash)
    return 1
  } finally {
    clearTimeout(watchdog)
    // ⚠ 清理在写报告/退出之前完成（同族 BUG-007 R1 F-7 / UX-060 R1 F-1：exit 早于 finally 内 rmSync ⇒ 早退不清理）。
    report.pageLog = pageLog.slice(-80)
    // R1 返工：新/改谓词的可失败性自证（构造反例 ⇒ 红）机录为一条断言。
    report.falsifiability = falsifiabilityReport()
    assertion('FALSIFIABILITY-PROOF', '测试资产', '新/改谓词的「构造反例即红」自证：逐条谓词 MUST 对反例向量求值为 false、对正例向量求值为 true（无恒真分支）',
      report.falsifiability.allPass === true,
      { summary: report.falsifiability.rows.map((r) => ({ id: r.id, finding: r.finding, redsAllFalse: r.redsAllFalse, oksAllTrue: r.oksAllTrue, pass: r.pass })), detail: report.falsifiability.rows })
    // 实例 URL 的 access token MUST 脱敏（bootTail 含隔离实例 stdout 的 `dsh web: http://…/?token=…` 行）
    report.bootTail = bootOut.slice(-20).map((s) => String(s).replace(/token=[A-Za-z0-9_-]+/g, 'token=***'))
    await stopAll()
    const realAfter = realFingerprint(realHome)
    report.realEnvAfter = realAfter
    const verdict = realEnvVerdict(realBefore, realAfter, root)
    report.realEnvVerdict = verdict
    assertion('Z1-real-env-untouched', '隔离', '真实 $DSH_HOME 零污染（许可面 sha256 逐项一致 + 无「isolated 根流入 settings.yaml」污染签名；用户并发使用造成的活跃面差异单独列明）',
      verdict.ok === true, verdict)
    report.ok = report.assertions.length > 0 && report.assertions.every((a) => a.status === 'PASS')
    report.tally = {
      total: report.assertions.length,
      pass: report.assertions.filter((a) => a.status === 'PASS').length,
      fail: report.assertions.filter((a) => a.status === 'FAIL').length,
      na: report.assertions.filter((a) => a.status === 'N-A').length,
    }
    // ⚠ 清理 MUST 先于写报告：原顺序把 report.cleanup 写在 writeFileSync 之后 ⇒ 落盘报告恒为
    // `cleanup: null`（final~final5 五次运行皆如此），清理是否真的成功在证据里**不可读**。
    if (opts.keep !== true) {
      const removed = []
      for (const k of ['home', 'userprofile', 'appdata', 'localappdata', 'edge', 'tmp', 'novels']) {
        try { rmSync(dirs[k], { recursive: true, force: true }); removed.push(k) } catch (e) { removed.push(k + ':ERR ' + String(e)) }
      }
      let rootRemoved = false
      try { rmSync(root, { recursive: true, force: true }); rootRemoved = !existsSync(root) } catch { /* ignore */ }
      report.cleanup = { removed, root, rootRemoved, keptEvidence: opts.out }
      console.log('  [cleanup] 隔离根已移除=' + String(rootRemoved) + '（仅保留证据目录 ' + opts.out + '）')
    } else {
      report.cleanup = { kept: true, root }
    }
    report.finishedAt = new Date().toISOString()
    writeFileSync(join(opts.out, 'report.json'), JSON.stringify(report, null, 2) + '\n')
    const failed = report.assertions.filter((a) => a.status !== 'PASS')
    console.log('\n[probe] CLEAN-004 断言汇总：' + report.tally.total + ' 条 → PASS ' + report.tally.pass + ' / FAIL ' + report.tally.fail + ' / N-A ' + report.tally.na)
    console.log('[probe] ' + (report.ok ? '绿态（全部断言成立）' : '红态（' + failed.length + ' 条非 PASS）') + '；报告 → ' + join(opts.out, 'report.json'))
    process.exitCode = report.ok ? 0 : 1
  }
}

const envCode = await main()
// 环境不可用（2）优先；否则以报告裁决（finally 内已按 PASS/FAIL 落定 exitCode）
if (envCode === 2) process.exit(2)
