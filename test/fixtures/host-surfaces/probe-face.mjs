/**
 * probe-face.mjs — CI 门禁（sanity）内的**离线结构对账**工具，三面职责：
 *   A. 探测轨判据机检（ci.yml `host-latest-probe` job 的 heredoc 判据脚本）；
 *   B. 探测轨**接线**自断言（机检步骤 MUST 留在 sanity 段内）；
 *   C. install 头部「宿主布局契约」块 ↔ 契约面 4/5 声明 正则对账（COMPAT-009）。
 * 三面共用同一判据：**只读仓库文件 + 构造隔离目录**，零网络 / 零 install / 不因宿主发版误红。
 *
 * 动因（COMPAT-014，收口 REVIEW-COMPAT-007-R1 F1/F2/F4/F5；F3/F6/F7 一并行为断言）：判据脚本内联在 ci.yml
 * 的 heredoc 里，而该 job 被 `if` 排除于 PR/push ⇒ 脚本的**语法/逻辑缺陷在 PR 面零机检**，只能等首次
 * schedule 暴露（F2）；同时「命令白名单」与「探测文件名 ↔ 命令」绑定均只靠人工审查（F5）、`schedule` 对既有
 * job 的副作用面（F1）、版本维未对账（F4）也各需机检。本工具把上述检查搬进 sanity（PR 门禁）——**全程离线**：
 * 无网络、无 install、不读 registry、不因宿主发版误红（检查的是**脚本与结构**，不是宿主版本 ⇒ 不违背
 * 「只读网络探测不进 PR 门禁」原意）。
 *
 * COMPAT-015 增补（收口 REVIEW-COMPAT-014-R1；逐项对应）：
 *   F1 → ② 补「`on` 四键」正则断言（原只检 `  schedule:` ⇒ 删 push/pull_request/workflow_dispatch 三者时
 *        记录仍全绿：PR 门禁 / 手动随查静默消失，假绿方向）＋ ⑦ 四键逐一删除的**变异负例**；
 *   F2 → ② 增接线**自断言**：两条接线行 MUST 落在 `jobSection(yml,'sanity')` 段内（全文子串匹配会被
 *        「步骤移出 sanity」骗过）＋ ⑦ 变异负例（同一条步骤文本移入 host-latest-probe ⇒ 旧全文守卫仍绿、
 *        段绑定守卫必红）；
 *   F4 → ④ 补判据 ① / ③ / ⑤ 三段**构造负例**（各 1 例：探测面缺包 ⇒ exit 2 + 归因 / fixtures 自洽破坏
 *        ⇒ exit 1 coverage / 受限版本口径外形态 ⇒ exit 1 version-form）；三段此前零负例，逻辑缺陷只能靠人工审查；
 *   F5 → ④ 补「输入异常 + 宿主新版本**同轮并报**」例（ci.yml 判据脚本同步改：input 分支退出前并报 failures）；
 *   F6 → ⑥ 补白名单**自指面**：判据脚本本体（由 node 执行 ⇒ 等效命令面）零 install/npx/pack/子进程/fetch/URL；
 *        并把 ci.yml 探测 job 注释里的「允许 / 禁止」声明面与 ALLOWED / FORBIDDEN 常量做**双向对账**；
 *   F7 → runNode 加 `spawnSync` timeout（60s）+ 超时归类；⑦ 含**真跑实测**（阻塞脚本在 1.2s 上限下被终止）；
 *   F8 → die() 归因分型（「输入缺失」vs「工具与契约失配」）+ `hostSurface.packages` 结构守卫（原会走未捕获
 *        TypeError）+ `process.on('exit')` 清理 tmp（原 die/异常路径不清理，与头注释「用毕删除」不符）；
 *   COMPAT-009 → ⑧ install.ps1/install.sh 头部「宿主布局契约」块（固定标记行 `host-contract:v1`，RB-02）
 *        ↔ 契约面 4/5 对应声明 正则对账 + 变异负例（删标记 / 改约定字面量 / 丢约定项 ⇒ 必红）。
 *
 * COMPAT-016 增补（收口 REVIEW-COMPAT-015-R1 P3；本工具为承接面）：
 *   P3-1 → `deleteOnChild` 变异**最小化**（原「段落式跳过」在删 `on:` 最后一个子键时连带吞掉其后空行与 `jobs:`
 *        ⇒ 变异体非最小、红点不可单独归因）+ ⑦ 增**变异体最小性**机检（`jobs:` 段与三 job 权限读数原样保留）；
 *   P3-4 → `jobsStart` / `jobSection` / `jobCmd` 抽为**共享纯函数模块** `./yml-jobs.mjs`（`test/smoke.mjs` ⑧b 同款
 *        消费同一对象，消除「两处各写一份镜像而无交叉机检」）；
 *   P3-11 → ⑧ golden 由「数量 5」改**有序 id 集** `['4.1','4.2','4.3','4.4','5.5']` + 换项/删项/增项三向负例。
 *
 * 职责（检查项）：
 *   ① 提取 ci.yml 内联判据（heredoc，定界约定泛化）→ `node --check`（语法机检）；
 *   ② 事件门禁结构断言（A-F1）：`on` 含**四类事件键**（F1）∧ `schedule` 只跑探测 job（sanity/host-logic 反向
 *      if）∧ 各 job `permissions: contents: read` ∧ **接线自断言**（F2：两条机检接线行落在 sanity 段内）；
 *   ③ 命令白名单 + stem↔命令一一对应（A-F5）：探测 job 的 shell 命令逐条 ∈ 白名单（禁 install/ci/npx/pack/
 *      cache/tar），每个探测目标恰 1 条 `npm view @deepseek-ai/<stem> versions --json > "$PROBE_DIR/<stem>…"`，
 *      且无越界探测；
 *   ④ 构造 probe JSON + fixtures + 契约**驱动判据真跑**（A-F2）并断言退出码语义：
 *      绿例（exit 0）/ 新版本红例（exit 1，version-drift）/ 非 CLI 子句②红例（exit 1，coverage）/
 *      CLI 代理例（A-F3：CLI 覆盖版本不在上游列表 ⇒ **仍须绿**，报文含代理限定语）/
 *      输入缺失例（A-F7：空文件 ⇒ **exit 2** + 逐包归因）/
 *      判据 ① 负例（F4：探测面缺契约声明包 ⇒ exit 2 + 面/输入双归因）/
 *      判据 ③ 负例（F4：fixtures 自洽破坏 ⇒ exit 1 + 类别 coverage）/
 *      判据 ⑤ 负例（F4：受限版本口径外形态 ⇒ exit 1 + 类别 version-form）/
 *      输入 + 版本漂移**同轮并报**例（F5：退出码 2 且 drift 明细不丢）/
 *      版本维失配例（A-F4：契约侧与 fixtures 侧各一）；
 *   ⑤ 失败分类处置覆盖（A-F6）：`fail()` 使用的**全部类别** ≡ `DISPOSAL` 表键集（双向）——新增类别不写处置
 *      文案即红；
 *   ⑥ 白名单自指面（F6）：判据脚本本体零禁用面命中 ∧ ci.yml 注释声明面 ↔ ALLOWED/FORBIDDEN 常量双向对账；
 *   ⑦ 守卫负例与运行器健壮性（F1/F2/F7）：变异构造「删键 / 移出 sanity 段」必红；阻塞脚本必被 timeout 终止；
 *   ⑧ install 头部布局契约对账（COMPAT-009）：两脚本标记块存在 ∧ 约定项键集一致 ∧ 每项字面量在契约对应
 *      item 的 symbol 内；变异负例（删标记 / 改字面量 / 丢项）必红。
 *
 * 只读纪律：只读 `.github/workflows/ci.yml` / `lib/host-contract.mjs` / `test/fixtures/host-surfaces/*.json` /
 * `install.ps1` / `install.sh`；写操作仅发生在 `os.tmpdir()` 下 `mkdtempSync` 的隔离目录（构造用例 + 子进程
 * 日志），**成功 / 失败 / 未捕获异常三条路径均清理**（F8：`process.on('exit')` 兜底，原仅成功路径清理）。
 * 子进程输出经**临时文件 fd** 收集（非管道）——避免受限沙箱下管道不可用的环境依赖。
 *
 * 直接运行（CI sanity 步骤；离线、零依赖）：
 *   node test/fixtures/host-surfaces/probe-face.mjs [--json-out <path>]
 * 退出码：0 = 全部通过；1 = 有失败项；2 = 输入缺失**或**工具与契约失配（报文字首区分归因，F8）。
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, openSync, closeSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { extractHeredocs } from './ci-mock-face.mjs'
// COMPAT-016 P3-4：job 段切分与 run 行归一由**共享纯函数模块**提供（原在 `test/smoke.mjs` 各写一份镜像、无交叉机检）。
import { jobsStart, jobSection, jobCmd } from './yml-jobs.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..', '..', '..')
const CI_YML = join(REPO_ROOT, '.github', 'workflows', 'ci.yml')
const CONTRACT = join(REPO_ROOT, 'lib', 'host-contract.mjs')
const FIXTURES_DIR = HERE
const PROBE_SCRIPT_SUFFIX = 'nv-host-latest-probe.mjs'
const PROBE_JOB = 'host-latest-probe'
const GATE_BASIC_JOBS = ['sanity', 'host-logic']
// F1：`on` 必须含的四类事件键（缺任一 ⇒ 对应触发面静默消失：pull_request ⇒ PR 门禁、workflow_dispatch ⇒ 手动随查）
const EVENT_KEYS = ['push', 'pull_request', 'schedule', 'workflow_dispatch']
// F2：本工具的接线行——MUST 落在 sanity 段内（step run 行 + 语法检查清单行）
const SELF_INVOCATION = 'node test/fixtures/host-surfaces/probe-face.mjs'
const SELF_CHECK = 'node --check test/fixtures/host-surfaces/probe-face.mjs'
// F7：判据子进程超时上限（秒级离线机检不该退化为 job 级超时）
const RUN_TIMEOUT_MS = 60000
// COMPAT-009：install 头部布局契约块
const INSTALL_FILES = ['install.ps1', 'install.sh']
const INSTALL_MARKER = 'host-contract:v1'
const INSTALL_HEAD_LIMIT = 60
// COMPAT-016 P3-11（收口 REVIEW-COMPAT-015-R1 P3-11）：golden 由「数量 5」改为**有序 id 集**——原实现只锁数量 ⇒
// 两脚本同步把 `[4.2]` 换成 `[4.6]` 并写入 ∈ 4.6 symbol 的字面量即可全绿（`keysA === keysB` 只保证两脚本自洽，
// 面 4/5 的**覆盖面脱靶**零信号）。扩项 / 删项 / 换项 MUST 显式改 golden（同仓 golden 先例）。
const INSTALL_GOLDEN_ENTRIES = ['4.1', '4.2', '4.3', '4.4', '5.5']
// COMPAT-008：探针固化脚本的接线（离线自检模式在 sanity 内执行 ⇒ PR 面即可发现脚本回归）
const PROBE_HOST = 'scripts/probe-host.mjs'
const PROBE_HOST_INVOCATION = 'node scripts/probe-host.mjs --self-check'
// 互斥词法：两正则不同时命中（写入时即校验，见 ④ 后置断言）
const results = []
const record = (name, ok, detail) => { results.push({ name, ok, detail }); return ok }

// F8：失败归因分型——原 die() 对所有情形统一输出「输入缺失」，会把「工具与契约结构失配」误导为「文件不可读」。
// 两类共用退出码 2（A-F7 口径：2 = 用法/输入类，与「检测到新版本」的 1 区分），报文字首点名归因。
const die = (kind, msg) => { console.error('[probe-face] ' + kind + '：' + msg); process.exit(2) }

// F8：tmp 清理兜底——die()/未捕获异常发生在 mkdtempSync 之后时，原实现不清理（与头注释「用毕删除」不符）。
let tmpRoot = null
process.on('exit', () => {
  if (tmpRoot !== null) {
    try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* 清理失败不掩盖退出码 */ }
  }
})

// ── 提取/结构工具 ────────────────────────────────────────────────────────────
/** 判据脚本源码（契约：ci.yml 内 target 以 `nv-host-latest-probe.mjs` 结尾的 heredoc；缺失即结构性失配）。 */
function probeScriptSource(yml) {
  const heredocs = extractHeredocs(yml)
  for (const [target, body] of heredocs) if (target.endsWith(PROBE_SCRIPT_SUFFIX)) return { target, body }
  return null
}

// `jobsStart` / `jobSection` / `jobCmd` 由共享纯函数模块 `./yml-jobs.mjs` 提供（COMPAT-016 P3-4，见文件头 import）：
// 原实现在本文件与 `test/smoke.mjs` 各写一份**镜像**且无任何交叉机检（R1 P3-4）——现两处消费同一对象，镜像面消除。

/** job → `if:` 表达式（无 `if` 记 null）。 */
function jobGates(yml) {
  const lines = yml.split('\n')
  const start = jobsStart(lines)
  const gates = new Map()
  for (let i = start; i < lines.length; i++) {
    if (!/^  [A-Za-z0-9_-]+:\s*$/.test(lines[i])) continue
    const job = lines[i].trim().replace(':', '')
    gates.set(job, null)
    for (let j = i + 1; j < lines.length && !/^  [A-Za-z0-9_-]+:\s*$/.test(lines[j]); j++) {
      const m = /^    if:\s*(.+?)\s*$/.exec(lines[j])
      if (m !== null) { gates.set(job, m[1]); break }
    }
  }
  return gates
}

/** job 的 permissions 键集（无声明 → []）。 */
function jobPermissions(yml, job) {
  const section = jobSection(yml, job)
  if (section === null) return []
  const out = []
  const i = section.findIndex((l) => /^    permissions:\s*$/.test(l))
  if (i < 0) return out
  for (let j = i + 1; j < section.length; j++) {
    const m = /^      ([a-z-]+):\s*([a-z-]+)\s*$/.exec(section[j])
    if (m === null) break
    out.push(m[1] + ': ' + m[2])
  }
  return out
}

/** 事件门禁表达式求值：仅接受本 workflow 已审查过的两种形态（未知形态 = fail-closed 失败）。 */
function evaluateGate(expr, event) {
  if (expr === null) return true
  if (expr === "github.event_name != 'schedule'") return event !== 'schedule'
  if (expr === "github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'") {
    return event === 'schedule' || event === 'workflow_dispatch'
  }
  return null
}

/** F1：`on` 四键完整性——返回缺失键列表（空数组 = 齐全）。 */
const eventKeysMissing = (src) => EVENT_KEYS.filter((k) => !new RegExp('^  ' + k + ':', 'm').test(src))

/** F1 变异工具：删除 `on:` 下的某个子键及其缩进子行（用于四键负例构造）。
 *  COMPAT-016 P3-1（收口 REVIEW-COMPAT-015-R1 P3-1）：原实现用「跳过直到下一个 `^  [A-Za-z_]+:` 键行」的**段落式**
 *  跳过状态——删 `on:` 的**最后一个**子键（`workflow_dispatch`）时其后空行与 0 缩进的 `jobs:` 均不匹配复位正则 ⇒
 *  被连带删除，变异体**非最小**（② 的门禁记录与权限记录同时变红，红点不可单独归因四键断言；若有人据此负例做
 *  二分定位会被误导）。现改为**最小变异**：只删目标键行 + 其 `≥4 空格` 缩进的子行，遇空行 / 0 或 2 空格行即结束。 */
function deleteOnChild(src, key) {
  const out = []
  const keyRe = new RegExp('^  ' + key + ':')
  let inTarget = false
  for (const l of src.split('\n')) {
    if (keyRe.test(l)) { inTarget = true; continue }   // 目标键行：删除并进入其子行区
    if (inTarget && /^ {4}/.test(l)) continue          // 目标键的子行（≥4 空格缩进）：删除
    inTarget = false
    out.push(l)
  }
  return out.join('\n')
}

/** F2：接线行是否落在 sanity 段内（**段绑定**，非全文子串）。行形态兼容两种写法：
 *  YAML 块标量内独立一行（`          node …`）与同一步骤的 `run:` 单行（`run: node …`）。 */
function wiringInSanity(src) {
  const section = jobSection(src, 'sanity')
  if (section === null) return { ok: false, why: 'sanity 段缺失' }
  const cmds = section.map(jobCmd)
  const run = cmds.includes(SELF_INVOCATION)
  const check = cmds.includes(SELF_CHECK)
  const host = cmds.includes(PROBE_HOST_INVOCATION)
  return { ok: run && check && host, why: 'run=' + run + ' check=' + check + ' probeHost=' + host + '（sanity 段 ' + section.length + ' 行）' }
}

/** F2 变异工具：把接线行移入 `host-latest-probe` 段（同一步骤文本仍在文件中 ⇒ 旧「全文子串」守卫仍绿）。 */
function moveWiringOutOfSanity(src) {
  const isWiring = (l) => {
    const t = jobCmd(l)
    return t === SELF_INVOCATION || t === SELF_CHECK || t === PROBE_HOST_INVOCATION
  }
  const out = src.split('\n').filter((l) => !isWiring(l))
  const probeJobStart = out.findIndex((l) => l === '  ' + PROBE_JOB + ':')
  const insertAt = probeJobStart < 0 ? out.length : probeJobStart + 1
  out.splice(insertAt, 0, '          run: ' + SELF_INVOCATION, '          run: ' + SELF_CHECK, '          run: ' + PROBE_HOST_INVOCATION)
  return out.join('\n')
}

/** 运行 node 子进程：输出经临时文件 fd 收集（非管道，避免受限沙箱下命名管道不可用）。
 *  F7：带 `timeout`（默认 60s）——判据脚本若阻塞，原实现会同步挂起至 CI job 级超时；超时归类为失败项。 */
function runNode(args, logPath, timeoutMs = RUN_TIMEOUT_MS) {
  const fd = openSync(logPath, 'w')
  let r
  try {
    r = spawnSync(process.execPath, args, { stdio: ['ignore', fd, fd], cwd: REPO_ROOT, timeout: timeoutMs })
  } finally {
    closeSync(fd)
  }
  const err = r.error === undefined || r.error === null ? null : r.error
  return {
    status: r.status,
    signal: r.signal === undefined ? null : r.signal,
    error: err === null ? null : String(err.code ?? err.message ?? err),
    timedOut: err !== null && (err.code === 'ETIMEDOUT' || String(err.message ?? '').includes('ETIMEDOUT')),
    output: existsSync(logPath) ? readFileSync(logPath, 'utf8') : '',
  }
}

// COMPAT-009：install 头部布局契约块解析（`#   [<item>] <名> = <字面量>`）+ 契约对账（纯函数，便于负例构造）
const INSTALL_KEY_RE = /^\s*#\s*\[(\d+\.\d+)\]\s*([^=]+?)\s*=\s*(.+?)\s*$/
// RB-02：固定标记行 = **整行恰为 `# host-contract:v1`**（正文中提及该串的说明行不算标记——防「标记被删而说明行残留」假绿）。
const INSTALL_MARKER_LINE_RE = new RegExp('^\\s*#\\s*' + INSTALL_MARKER + '\\s*$')
function parseInstallContract(src) {
  const lines = src.replace(/^\uFEFF/, '').split('\n')
  const entries = []
  for (const l of lines) {
    const m = INSTALL_KEY_RE.exec(l)
    if (m !== null) entries.push({ item: m[1], label: m[2], literal: m[3] })
  }
  return { markerAt: lines.findIndex((l) => INSTALL_MARKER_LINE_RE.test(l)), entries }
}
/** P3-11：golden **有序 id 集**对账（双向——多 / 少 / 换项均红；原实现只比数量，覆盖面脱靶零信号）。 */
function installGoldenProblems(items) {
  const got = items.join(',')
  const want = INSTALL_GOLDEN_ENTRIES.join(',')
  return got === want ? [] : ['约定项 id 集 [' + got + '] ≠ golden [' + want + ']（双向：扩项/删项/换项均须显式改 golden）']
}
/** 返回问题清单（空数组 = 对账通过）；契约 `symbol` 是宿主耦合声明的单一事实源。 */
function installContractProblems(ps1, sh, hc) {
  const problems = []
  const parsed = {}
  for (const [name, text] of [[INSTALL_FILES[0], ps1], [INSTALL_FILES[1], sh]]) {
    const p = parseInstallContract(text)
    parsed[name] = p
    if (p.markerAt < 0) problems.push(name + '：缺少固定标记行 `' + INSTALL_MARKER + '`')
    else if (p.markerAt >= INSTALL_HEAD_LIMIT) problems.push(name + '：标记行不在头部 ' + INSTALL_HEAD_LIMIT + ' 行内（第 ' + (p.markerAt + 1) + ' 行）')
    if (p.entries.length === 0) problems.push(name + '：未解析到任何 `[<item>] 名 = 字面量` 约定行')
    for (const e of p.entries) {
      const it = hc.items.find((x) => x.item === e.item)
      if (it === undefined) { problems.push(name + '：约定项 [' + e.item + '] 不在契约 items[] 内（面 4/5 安装注册项）'); continue }
      // 字面量口径：` + ` 分隔 = **合取式**（多段约定名逐段对账），任一片段缺失即红。
      const miss = e.literal.split(' + ').map((s) => s.trim()).filter((s) => s !== '').filter((f) => !String(it.symbol).includes(f))
      if (miss.length > 0) problems.push(name + '：[' + e.item + '] 字面量片段 ' + JSON.stringify(miss) + ' 未出现在契约该项 symbol 内')
    }
  }
  const keysA = parsed[INSTALL_FILES[0]].entries.map((e) => e.item).sort().join(',')
  const keysB = parsed[INSTALL_FILES[1]].entries.map((e) => e.item).sort().join(',')
  if (keysA !== keysB) problems.push('两脚本约定项键集不一致：' + INSTALL_FILES[0] + '=[' + keysA + '] vs ' + INSTALL_FILES[1] + '=[' + keysB + ']')
  // P3-11：golden 对**有序 id 集**（跨脚本一致性由上式 keysA === keysB 兜住 ⇒ 单侧对 golden 即可覆盖两脚本）。
  for (const p of installGoldenProblems(parsed[INSTALL_FILES[0]].entries.map((e) => e.item))) problems.push(p)
  return problems
}

// ── 主流程 ──────────────────────────────────────────────────────────────────
if (!existsSync(CI_YML)) die('输入缺失', 'ci.yml 不存在：' + CI_YML)
if (!existsSync(CONTRACT)) die('输入缺失', '契约不存在：' + CONTRACT)
for (const f of INSTALL_FILES) if (!existsSync(join(REPO_ROOT, f))) die('输入缺失', '安装脚本不存在：' + f)
const yml = readFileSync(CI_YML, 'utf8')
const probe = probeScriptSource(yml)
if (probe === null) die('工具与契约失配', 'ci.yml 未找到判据 heredoc（target 以 ' + PROBE_SCRIPT_SUFFIX + ' 结尾）——heredoc 约定变更后需同步本工具')
const { hostContract } = await import(pathToFileURL(CONTRACT).href)
// F8：契约结构守卫——`hostSurface.packages` 形态变化（改名/置空）原会走未捕获 TypeError（exit 1 + 栈回溯），
// 现归因为「工具与契约失配」。
if (hostContract?.hostSurface?.packages === null || typeof hostContract?.hostSurface?.packages !== 'object') {
  die('工具与契约失配', '契约 hostSurface.packages 形态异常（缺失/非普通对象）——契约结构变更后需同步本工具')
}
const declared = [...new Set(Object.values(hostContract.hostSurface.packages).flat())].sort()
const targets = [...declared, 'dsh'].sort()

// ① 判据脚本提取 + 语法机检
record('① 判据 heredoc 提取（' + probe.target + '，' + probe.body.split('\n').length + ' 行）', probe.body.trim().length > 0, 'len=' + probe.body.length)
const tmp = mkdtempSync(join(tmpdir(), 'probe-face-'))
tmpRoot = tmp
const probeScript = join(tmp, 'nv-host-latest-probe.mjs')
writeFileSync(probeScript, probe.body)
const checkRun = runNode(['--check', probeScript], join(tmp, 'check.log'))
record('① `node --check` 判据脚本（语法机检；PR 门禁内覆盖，原为零机检）', checkRun.status === 0 && !checkRun.timedOut,
  'status=' + String(checkRun.status) + (checkRun.timedOut ? ' ⏱ 超时（' + RUN_TIMEOUT_MS + 'ms）' : '') + (checkRun.status === 0 ? '' : ' :: ' + checkRun.output.split('\n').slice(0, 4).join(' | ')))

// ② 事件门禁结构（A-F1）+ 最小 permissions + 接线自断言（F2）
const gates = jobGates(yml)
const jobNames = [...gates.keys()]
const expectedByEvent = {
  push: GATE_BASIC_JOBS,
  pull_request: GATE_BASIC_JOBS,
  schedule: [PROBE_JOB],
  workflow_dispatch: [...GATE_BASIC_JOBS, PROBE_JOB],
}
const gateEvaluations = {}
let gateUnknown = []
for (const [job, expr] of gates) {
  gateEvaluations[job] = {}
  for (const event of Object.keys(expectedByEvent)) {
    const v = evaluateGate(expr, event)
    if (v === null) gateUnknown.push(job + ':' + expr)
    gateEvaluations[job][event] = v
  }
}
const gateMismatch = []
for (const [event, want] of Object.entries(expectedByEvent)) {
  const got = jobNames.filter((j) => gateEvaluations[j][event] === true).sort()
  if (JSON.stringify(got) !== JSON.stringify([...want].sort())) gateMismatch.push(event + ': got=' + JSON.stringify(got) + ' want=' + JSON.stringify([...want].sort()))
}
record('② A-F1 事件门禁结构断言：schedule ⇒ 仅 ' + PROBE_JOB + '（sanity/host-logic 反向 if）；push/pull_request ⇒ 既有 job；workflow_dispatch ⇒ 全量',
  gateMismatch.length === 0 && gateUnknown.length === 0 && yml.includes('  schedule:'),
  'mismatch=' + JSON.stringify(gateMismatch) + ' unknown=' + JSON.stringify(gateUnknown) + ' jobs=' + JSON.stringify(jobNames))
const permsBad = jobNames.filter((j) => JSON.stringify(jobPermissions(yml, j)) !== JSON.stringify(['contents: read']))
record('② A-F1 最小 permissions：三个 job 均显式 `contents: read`（含既有 sanity/host-logic）', permsBad.length === 0, 'bad=' + JSON.stringify(permsBad))
// F1：原实现只检 `  schedule:` ⇒ 从 `on:` 删除 pull_request / workflow_dispatch 时 ② 记录**仍全绿**（PR 门禁 /
// 手动随查静默消失，假绿方向；evaluateGate 是 `if` 表达式纯函数，与 `on:` 无关）。四键各自断言存在。
const missingEventKeys = eventKeysMissing(yml)
record('② A-F1 `on` 四键完整性：push / pull_request / schedule / workflow_dispatch 各存一（REVIEW-COMPAT-014-R1 F1）',
  missingEventKeys.length === 0, 'missing=' + JSON.stringify(missingEventKeys))
// F2：接线守卫 MUST 是**段绑定**的（全文子串匹配会被「把步骤移出 sanity」骗过——正是 R1 F2 的失效模式本身）。
const selfWiring = wiringInSanity(yml)
record('② A-F2 接线**自断言**：`' + SELF_INVOCATION + '` / `' + SELF_CHECK + '` / `' + PROBE_HOST_INVOCATION + '` 均落在 jobSection(yml,"sanity") 段内（非全文子串）',
  selfWiring.ok, selfWiring.why)

// ③ 命令白名单 + stem↔命令一一对应（A-F5）
const section = jobSection(yml, PROBE_JOB)
if (section === null) die('工具与契约失配', 'ci.yml 未找到 job 段：' + PROBE_JOB + '——job 改名后需同步本工具')
const commandLines = []
{
  let inRun = false
  let inHeredoc = false
  for (const raw of section) {
    const t = raw.trim()
    // YAML 结构行（步骤头/键/块起始）——任何一步的开头都重置 run 块状态
    if (/^- name:/.test(t) || /^(if|runs-on|uses|with|env|permissions|node-version):/.test(t)) { inRun = false; inHeredoc = false; continue }
    if (/^run:\s*\|?\s*$/.test(t)) { inRun = true; continue }
    if (!inRun || t === '') continue
    if (inHeredoc) { if (/^[A-Z_]+$/.test(t)) inHeredoc = false; continue }   // heredoc 体（判据 JS）不属命令面
    if (/^cat > .*<<'[A-Z_]+'\s*$/.test(t)) { commandLines.push(t); inHeredoc = true; continue }
    if (t.startsWith('#')) continue
    commandLines.push(t)
  }
}
const ALLOWED = [
  /^mkdir -p "\$PROBE_DIR"$/,
  /^npm view @deepseek-ai\/[a-z0-9-]+ versions --json > "\$PROBE_DIR\/[a-z0-9-]+\.versions\.json"$/,
  /^npm view @deepseek-ai\/dsh dist-tags --json > "\$PROBE_DIR\/dsh\.dist-tags\.json"$/,
  /^cat > "\$RUNNER_TEMP\/nv-host-latest-probe\.mjs" <<'PROBE_EOF'$/,
  /^node "\$RUNNER_TEMP\/nv-host-latest-probe\.mjs" "\$PROBE_DIR" test\/fixtures\/host-surfaces lib\/host-contract\.mjs$/,
  /^echo ".*"$/,
]
const FORBIDDEN = [/\bnpm\s+(install|ci|i|add)\b/, /\bnpx\b/, /\bnpm\s+pack\b/, /\bactions\/cache\b/, /\btar\b/, /\bunpack\b/]
const notAllowed = commandLines.filter((l) => !ALLOWED.some((re) => re.test(l)))
const forbiddenHit = commandLines.filter((l) => FORBIDDEN.some((re) => re.test(l)))
record('③ A-F5 命令白名单（正向）：探测 job 的 ' + commandLines.length + ' 条命令逐条 ∈ 白名单 ∧ 无 install/ci/npx/pack/cache/tar',
  notAllowed.length === 0 && forbiddenHit.length === 0,
  'notAllowed=' + JSON.stringify(notAllowed) + ' forbidden=' + JSON.stringify(forbiddenHit))
const viewLines = commandLines.filter((l) => l.startsWith('npm view '))
const stemBad = []
for (const stem of targets) {
  const want = 'npm view @deepseek-ai/' + stem + ' versions --json > "$PROBE_DIR/' + stem + '.versions.json"'
  if (viewLines.filter((l) => l === want).length !== 1) stemBad.push(stem)
}
for (const l of viewLines) {
  const m = /^npm view @deepseek-ai\/([a-z0-9-]+) /.exec(l)
  if (m === null || !targets.includes(m[1])) stemBad.push('越界:' + l)
}
record('③ A-F5 stem↔命令一一对应：' + targets.length + ' 个探测目标各恰 1 条 `npm view … versions --json` 且文件名为同名 stem（无越界探测）',
  stemBad.length === 0 && viewLines.filter((l) => l.includes('dist-tags')).length === 1,
  'bad=' + JSON.stringify(stemBad))

// ④ 构造 probe JSON 驱动判据真跑（A-F2 / A-F3 / A-F4 / A-F7 / F4 / F5）
const fixtures = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf8')))
const greenLists = {}
for (const p of declared) {
  greenLists[p] = [...new Set(fixtures.map((fx) => fx.packages?.[p]?.version).filter((v) => typeof v === 'string'))].sort()
}
greenLists.dsh = [...new Set(fixtures.map((fx) => fx.hostVersion))].sort()
/** 写一个 probe 目录（覆盖给定列表；缺省 = 绿例）。 */
function makeProbeDir(name, overrides, emptyFiles = []) {
  const dir = join(tmp, name)
  mkdirSync(dir, { recursive: true })
  const lists = { ...greenLists, ...overrides }
  for (const [p, list] of Object.entries(lists)) writeFileSync(join(dir, p + '.versions.json'), JSON.stringify(list, null, 2) + '\n')
  for (const f of emptyFiles) writeFileSync(join(dir, f), '')
  return dir
}
/** 拷贝 fixtures 目录并追加一份构造快照（A-F4 第二向：新增第 4 份 fixture）。 */
function makeFourthFixtureDir() {
  const dir = join(tmp, 'fixtures-4th')
  mkdirSync(dir, { recursive: true })
  for (const [i, fx] of fixtures.entries()) writeFileSync(join(dir, 'copy-' + i + '.json'), JSON.stringify(fx, null, 2) + '\n')
  const four = JSON.parse(JSON.stringify(fixtures[fixtures.length - 1]))
  four.hostVersion = '0.1.6-rc.1'
  for (const [name, meta] of Object.entries(four.packages)) {
    if (!hostContract.hostSurface.versionExceptions.includes(name)) meta.version = '0.1.6-rc.1'   // host 族随 hostVersion 走（例外包保持独立版本族）
  }
  writeFileSync(join(dir, 'zz-0.1.6-rc.1.json'), JSON.stringify(four, null, 2) + '\n')
  return dir
}
/** F4（判据③）：拷贝 fixtures 并把一个**非例外包**的版本改成 ≠ hostVersion（破坏 fixtures 自洽）。 */
function makeSelfInconsistentFixtureDir() {
  const dir = join(tmp, 'fixtures-self')
  mkdirSync(dir, { recursive: true })
  for (const [i, fx] of fixtures.entries()) {
    const clone = JSON.parse(JSON.stringify(fx))
    if (i === fixtures.length - 1) clone.packages['dsh-tools'].version = '0.1.3-rc.9'   // dsh-tools 非例外包 ⇒ ③ 必报
    writeFileSync(join(dir, 'copy-' + i + '.json'), JSON.stringify(clone, null, 2) + '\n')
  }
  return dir
}
const runCase = (label, probeDir, fixturesDir = FIXTURES_DIR, contractPath = CONTRACT) =>
  runNode([probeScript, probeDir, fixturesDir, contractPath], join(tmp, 'case-' + label + '.log'))
const cases = []
const expectCase = (label, run, wantStatus, mustInclude = []) => {
  const ok = !run.timedOut && run.status === wantStatus && mustInclude.every((s) => run.output.includes(s))
  cases.push({ label, ok, status: run.status, wantStatus, timedOut: run.timedOut })
  record('④ ' + label, ok, 'status=' + String(run.status) + '（期望 ' + wantStatus + '）' + (run.timedOut ? ' ⏱ 超时（' + RUN_TIMEOUT_MS + 'ms）' : '') + (ok ? '' : ' :: ' + run.output.split('\n').slice(0, 3).join(' | ')))
}

const greenProbe = makeProbeDir('green')
const greenRun = runCase('green', greenProbe)
expectCase('A-F2 绿例：构造 probe JSON（≡ fixtures 覆盖）⇒ exit 0', greenRun, 0, ['✅ 无新宿主版本'])

const driftRun = runCase('drift', makeProbeDir('drift', { 'dsh-settings': [...greenLists['dsh-settings'], '0.1.5-rc.3'].sort() }))
expectCase('A-F2 红例（新版本）：同车更高版本 ⇒ exit 1 + 类别 version-drift', driftRun, 1, ['detected new host version 0.1.5-rc.3', '类别 version-drift', '⇒ 处置：'])

const cliPast = runCase('cli-past', makeProbeDir('cli-past', { dsh: ['0.1.0-rc.1', '0.1.4-rc.1'] }))
expectCase('A-F3 CLI 代理例：CLI 覆盖版本不在上游列表 ⇒ **仍绿**（子句②对 CLI 不适用）+ 代理限定语', cliPast, 0, ['CLI 覆盖面 = hostVersion 代理（子句②不适用）'])

const covMissing = runCase('cov-missing', makeProbeDir('cov-missing', { 'dsh-settings': greenLists['dsh-settings'].filter((v) => v !== '0.1.1-rc.2') }))
expectCase('A-F3b 子句②对非 CLI **仍然生效**：覆盖版本上游消失 ⇒ exit 1 + 类别 coverage', covMissing, 1, ['不在上游已发布列表', '类别 coverage'])

const emptyRun = runCase('empty', makeProbeDir('empty', {}, ['dsh-settings.versions.json']))
expectCase('A-F7 输入缺失例：空文件（npm view 失败残留）⇒ exit 2 + 逐包归因（**非** exit 1）', emptyRun, 2, ['探测输入异常', 'dsh-settings：探测输入不可解析', '退出码 2'])

const contract4thKey = join(tmp, 'contract-extra-version.mjs')
// EOL 口径：契约文件为 CRLF（仓内既有约定）——构造前规范为 LF，仅用于临时副本，不写回仓库。
const contractMutated = readFileSync(CONTRACT, 'utf8').replace(/\r\n/g, '\n').replace("    packages: {\n      '0.1.1-rc.2':", "    packages: {\n      '0.1.9-rc.9': ['dsh-tools'],\n      '0.1.1-rc.2':")
if (!contractMutated.includes("'0.1.9-rc.9'")) die('工具与契约失配', 'A-F4 构造失败：契约 packages 键锚点未命中（契约结构变更后需同步本工具）')
writeFileSync(contract4thKey, contractMutated)
const contractBadRun = runCase('contract-extra', greenProbe, FIXTURES_DIR, contract4thKey)
expectCase('A-F4 契约侧版本维失配（构造：契约多声明一个版本键）⇒ exit 1', contractBadRun, 1, ['版本维双向对账'])

const fourth = makeFourthFixtureDir()
const fourthRun = runCase('fixtures-4th', greenProbe, fourth)
expectCase('A-F4 fixtures 侧版本维失配（构造：新增第 4 份快照）⇒ exit 1', fourthRun, 1, ['版本维双向对账'])

// F4：判据 ①/③/⑤ 三段（A-F2 残留面）此前**零负例** ⇒ 逻辑缺陷只能靠人工审查。各补 1 例：
const missingStemDir = makeProbeDir('missing-stem')
rmSync(join(missingStemDir, 'cordis.versions.json'))
const missingStemRun = runCase('missing-stem', missingStemDir)
expectCase('F4 判据① 负例（探测面缺契约声明包）：删一个 stem ⇒ exit 2 + 面归因（「探测面缺契约声明包」）+ 输入归因（「探测输入缺失」）——两向均不静默',
  missingStemRun, 2, ['探测面缺契约声明包 cordis', '探测输入缺失', '退出码 2'])

const selfInconsistentRun = runCase('fixtures-self', greenProbe, makeSelfInconsistentFixtureDir())
expectCase('F4 判据③ 负例（fixtures 自洽）：非例外包 dsh-tools 版本 ≠ hostVersion ⇒ exit 1 + 类别 coverage + 「fixtures 自洽」',
  selfInconsistentRun, 1, ['fixtures 自洽', '类别 coverage'])

const versionFormRun = runCase('version-form', makeProbeDir('version-form', { cordis: [...greenLists['cordis'], '0.1.5-beta.1'] }))
expectCase('F4 判据⑤ 负例（受限版本口径）：上游串 `0.1.5-beta.1`（track 表外）⇒ exit 1 + 类别 version-form + 「重建 fixtures 关不掉」处置', versionFormRun, 1, ['形态超出受限口径', '类别 version-form', '重建 fixtures 关不掉'])

const inputDriftRun = runCase('input-drift', makeProbeDir('input-drift', { 'dsh-settings': [...greenLists['dsh-settings'], '0.1.5-rc.3'].sort() }, ['cordis.versions.json']))
expectCase('F5 输入异常 + 宿主新版本**同轮并报**：空文件（input ⇒ 退出码 2）∧ dsh-settings 新版本（version-drift）——两者 MUST 同时出现在报文（原实现 input 分支先 exit(2)，drift 明细被吞 ⇒ 发版暴露延后一轮）',
  inputDriftRun, 2, ['探测输入异常', '探测输入不可解析（cordis.versions.json）', '同轮另检出', '类别 version-drift', 'detected new host version 0.1.5-rc.3'])

// ⑤ A-F6 失败分类处置覆盖（fail() 类别 ≡ DISPOSAL 键集，双向）
const disposalStart = probe.body.indexOf('const DISPOSAL = {')
const disposalBlock = disposalStart < 0 ? '' : probe.body.slice(disposalStart, probe.body.indexOf('\n}', disposalStart))
const disposalKeys = [...new Set([...disposalBlock.matchAll(/'([a-z-]+)':\s*'/g)].map((m) => m[1]))].sort()
const usedClasses = [...new Set([...probe.body.matchAll(/fail\('([a-z-]+)'/g)].map((m) => m[1]).concat(['input']))].sort()
record('⑤ A-F6 分类处置覆盖：fail() 类别 ' + JSON.stringify(usedClasses) + ' ≡ DISPOSAL 键集 ' + JSON.stringify(disposalKeys),
  disposalKeys.length > 0 && JSON.stringify(usedClasses) === JSON.stringify(disposalKeys) && probe.body.includes('── 类别 '),
  'used=' + JSON.stringify(usedClasses) + ' declared=' + JSON.stringify(disposalKeys))

// ⑥ 白名单**自指面**（F6）：③ 的 FORBIDDEN 只施加于 run 块命令面，而判据脚本体由 node 执行（等效命令面）
// ——若未来在其内部加入 npm/网络/子进程调用，「白名单/禁词」检查**无信号**；同时 ci.yml 注释里的「允许/禁止」
// 声明面与 ALLOWED/FORBIDDEN 常量之间原亦零对账（声明与实现可各说各话）。
const SCRIPT_FORBIDDEN = [
  { re: /\bnpm\s+(install|ci|i|add)\b/, why: 'install 类命令' },
  { re: /\bnpx\b/, why: 'npx' },
  { re: /\bnpm\s+pack\b/, why: 'npm pack' },
  { re: /\bchild_process\b/, why: '子进程调用' },
  { re: /\bfetch\s*\(/, why: 'fetch 网络面' },
  { re: /\bhttps?:\/\//, why: 'URL 字面量（网络面）' },
]
const selfHits = SCRIPT_FORBIDDEN.filter((f) => f.re.test(probe.body)).map((f) => f.why)
record('⑥ 白名单自指面（判据脚本本体）：heredoc JS 内零 install/npx/pack/child_process/fetch/URL 命中（' + SCRIPT_FORBIDDEN.length + ' 类禁词）',
  selfHits.length === 0, 'hit=' + JSON.stringify(selfHits))

// 声明面（ci.yml 探测 job 的「允许/禁止」注释块）↔ 实现面（ALLOWED / FORBIDDEN 常量）双向对账：
//   （i）每条声明项 MUST 在注释块内出现（声明真实存在）；（ii）每个声明**禁用**项 MUST 被某条 FORBIDDEN 常量拦截；
//   （iii）每条 FORBIDDEN 常量 MUST 有被声明的样本触发（无「常量里悄悄多一条没声明的禁令」）；
//   （iv）允许样本 MUST ∈ ALLOWED 且 MUST NOT 被 FORBIDDEN 命中。
const declText = (section ?? []).filter((l) => l.trim().startsWith('#')).map((l) => l.trim()).join('\n')
const DECL_ALLOWED = [{ label: 'npm view', sample: 'npm view @deepseek-ai/dsh versions --json > "$PROBE_DIR/dsh.versions.json"' }]
const DECL_FORBIDDEN = [
  { label: 'npm install', samples: ['npm install x'] },
  { label: 'npm ci', samples: ['npm ci'] },
  { label: 'npx', samples: ['npx foo'] },
  { label: 'npm pack', samples: ['npm pack'] },
  { label: '解包 tarball', samples: ['tar -xzf pkg.tgz', 'unpack pkg'] },
  { label: 'actions/cache', samples: ['uses: actions/cache@v4'] },
]
const declMissing = [...DECL_ALLOWED, ...DECL_FORBIDDEN].filter((d) => !declText.includes(d.label)).map((d) => d.label)
const declNotBlocked = DECL_FORBIDDEN.filter((d) => !d.samples.some((s) => FORBIDDEN.some((re) => re.test(s)))).map((d) => d.label)
const constUncovered = FORBIDDEN.map((re, i) => ({ re, i })).filter(({ re }) => !DECL_FORBIDDEN.some((d) => d.samples.some((s) => re.test(s)))).map(({ i }) => i)
const allowedSampleOk = DECL_ALLOWED.every((d) => ALLOWED.some((re) => re.test(d.sample)) && !FORBIDDEN.some((re) => re.test(d.sample)))
record('⑥ 白名单声明面 ↔ 常量双向对账：声明项（允许 ' + DECL_ALLOWED.length + ' / 禁止 ' + DECL_FORBIDDEN.length + '）全部在探测 job 注释块内 ∧ 声明禁用面逐项可被 FORBIDDEN 拦截 ∧ 每条 FORBIDDEN 常量均有声明来源（未覆盖常量 ' + JSON.stringify(constUncovered) + '）∧ 允许样本 ∈ ALLOWED',
  declMissing.length === 0 && declNotBlocked.length === 0 && constUncovered.length === 0 && allowedSampleOk,
  'declMissing=' + JSON.stringify(declMissing) + ' notBlocked=' + JSON.stringify(declNotBlocked) + ' constUncovered=' + JSON.stringify(constUncovered) + ' allowedSample=' + allowedSampleOk)

// ⑦ 守卫负例（F1/F2）+ 运行器健壮性真跑（F7）
const eventNegMutants = EVENT_KEYS.map((k) => ({ key: k, src: deleteOnChild(yml, k) }))
const eventNegNotRed = eventNegMutants.filter((m) => eventKeysMissing(m.src).length === 0).map((m) => m.key)
// P3-1（COMPAT-016）变异体**最小性**机检：除目标键（及其子行）外，`jobs:` 段与三个 job 的权限读数 MUST 原样保留——
// 否则 ② 的门禁/权限记录会随四键断言**同时**变红，红点不可单独归因（原实现在删最后一个子键时连带吞掉空行与 `jobs:`）。
const eventNegNonMinimal = eventNegMutants.filter((m) => {
  const mutGates = jobGates(m.src)
  return !m.src.includes('\njobs:')
    || !jobNames.every((j) => mutGates.has(j) && JSON.stringify(jobPermissions(m.src, j)) === JSON.stringify(jobPermissions(yml, j)))
}).map((m) => m.key)
record('⑦ 守卫负例（F1 四键）：逐一删除 `on` 下的 ' + EVENT_KEYS.join(' / ') + ' 键 ⇒ 四键断言**均必红**（未变红者 = 守卫对该键无判别力）∧ 变异体**最小**（`jobs:` 段与三个 job 权限读数原样保留 ⇒ 红点可单独归因四键断言）',
  eventNegNotRed.length === 0 && eventNegNonMinimal.length === 0,
  'notRed=' + JSON.stringify(eventNegNotRed) + ' nonMinimal=' + JSON.stringify(eventNegNonMinimal))
const movedYml = moveWiringOutOfSanity(yml)
const oldSubstringStillGreen = movedYml.includes(SELF_INVOCATION) && movedYml.includes(SELF_CHECK) && movedYml.includes(PROBE_HOST_INVOCATION)
const newSectionRed = !wiringInSanity(movedYml).ok
record('⑦ 守卫负例（F2 接线强度）：把接线行移入 ' + PROBE_JOB + ' 段 ⇒ **旧「全文子串」守卫仍绿**（' + oldSubstringStillGreen + '）而段绑定守卫必红（' + newSectionRed + '）——本负例即 REVIEW-COMPAT-014-R1 F2 的失效模式本身',
  oldSubstringStillGreen && newSectionRed, 'oldSubstringGreen=' + oldSubstringStillGreen + ' sectionBoundRed=' + newSectionRed)
const hangRun = runNode(['-e', 'setTimeout(() => {}, 300000)'], join(tmp, 'hang.log'), 1200)
record('⑦ 运行器健壮性（F7）：阻塞脚本在上限下被 `spawnSync` timeout 终止并归类（真跑实测：1.2s 上限 → timedOut=' + hangRun.timedOut + ', status=' + String(hangRun.status) + ', signal=' + String(hangRun.signal) + '）——原无 timeout ⇒ 判据阻塞时 sanity 挂到 job 级超时且无归因',
  hangRun.timedOut && hangRun.status === null, 'timedOut=' + hangRun.timedOut + ' status=' + String(hangRun.status) + ' signal=' + String(hangRun.signal) + ' error=' + String(hangRun.error))

// ⑧ install 头部「宿主布局契约」块 ↔ 契约面 4/5 声明 正则对账（COMPAT-009）
// 动因：安装脚本头部承载「宿主布局/注册通道/目录约定」知识，历史上只靠人工同步契约（轴②安装面）——
// 两处（脚本知识 vs 契约声明）静默漂移时零信号。本段把「标记块存在 + 约定项键集一致 + 字面量 ∈ 契约 symbol」
// 机检化；**install 脚本行为零变化**（本块为纯注释，独立证据见 COMPAT-015 CHANGELOG「强等价」）。
const installPs1Text = readFileSync(join(REPO_ROOT, INSTALL_FILES[0]), 'utf8')
const installShText = readFileSync(join(REPO_ROOT, INSTALL_FILES[1]), 'utf8')
const installProblems = installContractProblems(installPs1Text, installShText, hostContract)
const installEntries = parseInstallContract(installPs1Text).entries
record('⑧ COMPAT-009 install 头部布局契约对账：两脚本标记块（固定标记行 `' + INSTALL_MARKER + '`）存在且在头部 ' + INSTALL_HEAD_LIMIT + ' 行内 ∧ 约定项键集跨脚本一致 ∧ 每项字面量 ∈ 契约对应 item 的 symbol（' + installEntries.length + ' 项 / golden id 集 ' + INSTALL_GOLDEN_ENTRIES.join(',') + '：' + installEntries.map((e) => e.item).join(',') + '）',
  installProblems.length === 0, 'problems=' + JSON.stringify(installProblems))
const markerStripped = installContractProblems(installPs1Text.replace(/^\s*#\s*host-contract:v1\s*$/m, ''), installShText, hostContract)
const literalChanged = installContractProblems(installPs1Text, installShText.replace('.agent-presets/<preset-id>/', '.agent-presets/wrong-id/'), hostContract)
const entryDropped = installContractProblems(installPs1Text.replace(/^\s*#\s*\[4\.3\].*$/m, ''), installShText, hostContract)
record('⑧ COMPAT-009 对账负例：删标记行 ⇒ 红（' + markerStripped.length + ' 项）∧ 改预设目录字面量 ⇒ 红（' + literalChanged.length + ' 项）∧ 删一个约定项 ⇒ 红（' + entryDropped.length + ' 项）',
  markerStripped.some((p) => p.includes('缺少固定标记行')) && literalChanged.some((p) => p.includes('未出现在契约该项 symbol 内')) && entryDropped.some((p) => p.includes('键集不一致')),
  'marker=' + JSON.stringify(markerStripped) + ' literal=' + JSON.stringify(literalChanged) + ' dropped=' + JSON.stringify(entryDropped))

// P3-11（COMPAT-016）golden **有序 id 集**双向负例：原实现只锁数量 5 ⇒ 两脚本**同步换项**（`[4.2]`→`[4.6]` 并写入
// ∈ 4.6 symbol 的字面量）时 `keysA === keysB` 与数量对账**均绿**（覆盖面脱靶零信号）。三向构造（换项 / 删项 /
// 增项）各自必红，且现行条目集合恰等于 golden（非恒真）。
const goldenIdCases = [
  { label: '换项', ids: ['4.1', '4.2', '4.3', '4.4', '4.5'] },
  { label: '删项', ids: ['4.1', '4.2', '4.3', '4.5'] },
  { label: '增项', ids: ['4.1', '4.2', '4.3', '4.4', '5.5', '4.6'] },
]
const goldenIdNeg = goldenIdCases.map((c) => ({ label: c.label, problems: installGoldenProblems(c.ids).length }))
record('⑧ COMPAT-016 P3-11 golden **有序 id 集**（' + INSTALL_GOLDEN_ENTRIES.join(',') + '）双向负例：换项 / 删项 / 增项三向构造均必红 ∧ 现行条目集合恰等于 golden（原实现只锁数量 ⇒ 两脚本同步换 id 仍全绿）',
  installGoldenProblems(installEntries.map((e) => e.item)).length === 0 && goldenIdNeg.every((g) => g.problems > 0),
  'negatives=' + JSON.stringify(goldenIdNeg) + ' current=' + JSON.stringify(installEntries.map((e) => e.item)))

// ── 报告 ────────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok)
console.log('[probe-face] COMPAT-014/015 门禁离线机检（ci.yml → ' + probe.target + '；零网络 / 零 install）')
for (const r of results) console.log((r.ok ? '  ✅ ' : '  ❌ ') + r.name + (r.ok ? '' : ' :: ' + r.detail))
console.log('[probe-face] 构造用例 ' + cases.length + ' 例（' + cases.map((c) => c.label + '=' + String(c.status)).join(' / ') + '）')
const jsonOutIdx = process.argv.indexOf('--json-out')
if (jsonOutIdx > 0 && process.argv[jsonOutIdx + 1] !== undefined) {
  writeFileSync(process.argv[jsonOutIdx + 1], JSON.stringify({ ok: failed.length === 0, results, cases }, null, 2) + '\n')
}
rmSync(tmp, { recursive: true, force: true })
if (failed.length > 0) {
  console.error('[probe-face] FAIL：' + failed.length + ' 项失败 / ' + results.length + ' 项')
  process.exit(1)
}
console.log('[probe-face] OK：' + results.length + ' 项机检全通过（判据语法/门禁+四键/白名单+自指面/构造退出码语义/分类处置/守卫负例/install 头部契约对账）')
