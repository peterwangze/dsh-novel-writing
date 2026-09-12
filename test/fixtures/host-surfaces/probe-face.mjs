/**
 * probe-face.mjs — 宿主发版探测轨（`host-latest-probe` job 内联判据）的**离线机检**工具。
 *
 * 动因（COMPAT-014，收口 REVIEW-COMPAT-007-R1 F1/F2/F4/F5；F3/F6/F7 一并行为断言）：判据脚本内联在 ci.yml
 * 的 heredoc 里，而该 job 被 `if` 排除于 PR/push ⇒ 脚本的**语法/逻辑缺陷在 PR 面零机检**，只能等首次
 * schedule 暴露（F2）；同时「命令白名单」与「探测文件名 ↔ 命令」绑定均只靠人工审查（F5）、`schedule` 对既有
 * job 的副作用面（F1）、版本维未对账（F4）也各需机检。本工具把上述检查搬进 sanity（PR 门禁）——**全程离线**：
 * 无网络、无 install、不读 registry、不因宿主发版误红（检查的是**脚本与结构**，不是宿主版本 ⇒ 不违背
 * 「只读网络探测不进 PR 门禁」原意）。
 *
 * 职责（检查项）：
 *   ① 提取 ci.yml 内联判据（heredoc，定界约定泛化）→ `node --check`（语法机检）；
 *   ② 事件门禁结构断言（A-F1）：`schedule` 只跑探测 job（sanity/host-logic 反向 if）∧ 各 job `permissions:
 *      contents: read` ∧ `on` 含四类事件；
 *   ③ 命令白名单 + stem↔命令一一对应（A-F5）：探测 job 的 shell 命令逐条 ∈ 白名单（禁 install/ci/npx/pack/
 *      cache/tar），每个探测目标恰 1 条 `npm view @deepseek-ai/<stem> versions --json > "$PROBE_DIR/<stem>…"`，
 *      且无越界探测；
 *   ④ 构造 probe JSON + fixtures + 契约**驱动判据真跑**（A-F2）并断言退出码语义：
 *      绿例（exit 0）/ 新版本红例（exit 1，version-drift）/ 非 CLI 子句②红例（exit 1，coverage）/
 *      CLI 代理例（A-F3：CLI 覆盖版本不在上游列表 ⇒ **仍须绿**，报文含代理限定语）/
 *      输入缺失例（A-F7：空文件 ⇒ **exit 2** + 逐包归因）/ 版本维失配例（A-F4：契约侧与 fixtures 侧各一）；
 *   ⑤ 失败分类处置覆盖（A-F6）：`fail()` 使用的**全部类别** ≡ `DISPOSAL` 表键集（双向）——新增类别不写处置
 *      文案即红。
 *
 * 只读纪律：只读 `.github/workflows/ci.yml` / `lib/host-contract.mjs` / `test/fixtures/host-surfaces/*.json`；
 * 写操作仅发生在 `os.tmpdir()` 下 `mkdtempSync` 的隔离目录（构造用例 + 子进程日志），用毕删除。
 * 子进程输出经**临时文件 fd** 收集（非管道）——避免受限沙箱下管道不可用的环境依赖。
 *
 * 直接运行（CI sanity 步骤；离线、零依赖）：
 *   node test/fixtures/host-surfaces/probe-face.mjs [--json-out <path>]
 * 退出码：0 = 全部通过；1 = 有失败项；2 = 输入缺失（ci.yml / 契约 / fixtures 不可读）。
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, openSync, closeSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { extractHeredocs } from './ci-mock-face.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..', '..', '..')
const CI_YML = join(REPO_ROOT, '.github', 'workflows', 'ci.yml')
const CONTRACT = join(REPO_ROOT, 'lib', 'host-contract.mjs')
const FIXTURES_DIR = HERE
const PROBE_SCRIPT_SUFFIX = 'nv-host-latest-probe.mjs'
const PROBE_JOB = 'host-latest-probe'
const GATE_BASIC_JOBS = ['sanity', 'host-logic']

const results = []
const record = (name, ok, detail) => { results.push({ name, ok, detail }); return ok }
const die = (msg) => { console.error('[probe-face] 输入缺失：' + msg); process.exit(2) }

// ── 提取/结构工具 ────────────────────────────────────────────────────────────
/** 判据脚本源码（契约：ci.yml 内 target 以 `nv-host-latest-probe.mjs` 结尾的 heredoc；缺失即结构性失败）。 */
function probeScriptSource(yml) {
  const heredocs = extractHeredocs(yml)
  for (const [target, body] of heredocs) if (target.endsWith(PROBE_SCRIPT_SUFFIX)) return { target, body }
  return null
}

/** `jobs:` 段起始行（`on:` 的子键与 job 键同为 2 空格缩进 ⇒ 必须从 jobs: 之后开始扫描）。 */
function jobsStart(lines) {
  const i = lines.findIndex((l) => l === 'jobs:')
  return i < 0 ? 0 : i + 1
}

/** 某个 job 的 YAML 段（本 workflow 的 job 键 = 顶层缩进 2 空格；到下一个 job 键或文件末为止）。 */
function jobSection(yml, job) {
  const lines = yml.split('\n')
  const start = lines.findIndex((l, i) => i >= jobsStart(lines) && l === '  ' + job + ':')
  if (start < 0) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[i])) { end = i; break }
  return lines.slice(start, end)
}

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

/** 运行 node 子进程：输出经临时文件 fd 收集（非管道，避免受限沙箱下命名管道不可用）。 */
function runNode(args, logPath) {
  const fd = openSync(logPath, 'w')
  let r
  try {
    r = spawnSync(process.execPath, args, { stdio: ['ignore', fd, fd], cwd: REPO_ROOT })
  } finally {
    closeSync(fd)
  }
  return { status: r.status, error: r.error === undefined ? null : String(r.error), output: existsSync(logPath) ? readFileSync(logPath, 'utf8') : '' }
}

// ── 主流程 ──────────────────────────────────────────────────────────────────
if (!existsSync(CI_YML)) die('ci.yml 不存在：' + CI_YML)
if (!existsSync(CONTRACT)) die('契约不存在：' + CONTRACT)
const yml = readFileSync(CI_YML, 'utf8')
const probe = probeScriptSource(yml)
if (probe === null) die('ci.yml 未找到判据 heredoc（target 以 ' + PROBE_SCRIPT_SUFFIX + ' 结尾）')
const { hostContract } = await import(pathToFileURL(CONTRACT).href)
const declared = [...new Set(Object.values(hostContract.hostSurface.packages).flat())].sort()
const targets = [...declared, 'dsh'].sort()

// ① 判据脚本提取 + 语法机检
record('① 判据 heredoc 提取（' + probe.target + '，' + probe.body.split('\n').length + ' 行）', probe.body.trim().length > 0, 'len=' + probe.body.length)
const tmp = mkdtempSync(join(tmpdir(), 'probe-face-'))
const probeScript = join(tmp, 'nv-host-latest-probe.mjs')
writeFileSync(probeScript, probe.body)
const checkRun = runNode(['--check', probeScript], join(tmp, 'check.log'))
record('① `node --check` 判据脚本（语法机检；PR 门禁内覆盖，原为零机检）', checkRun.status === 0, 'status=' + String(checkRun.status) + (checkRun.status === 0 ? '' : ' :: ' + checkRun.output.split('\n').slice(0, 4).join(' | ')))

// ② 事件门禁结构（A-F1）+ 最小 permissions
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

// ③ 命令白名单 + stem↔命令一一对应（A-F5）
const section = jobSection(yml, PROBE_JOB)
if (section === null) die('ci.yml 未找到 job 段：' + PROBE_JOB)
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

// ④ 构造 probe JSON 驱动判据真跑（A-F2 / A-F3 / A-F4 / A-F7）
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
const runCase = (label, probeDir, fixturesDir = FIXTURES_DIR, contractPath = CONTRACT) =>
  runNode([probeScript, probeDir, fixturesDir, contractPath], join(tmp, 'case-' + label + '.log'))
const cases = []
const expectCase = (label, run, wantStatus, mustInclude = []) => {
  const ok = run.status === wantStatus && mustInclude.every((s) => run.output.includes(s))
  cases.push({ label, ok, status: run.status, wantStatus })
  record('④ ' + label, ok, 'status=' + String(run.status) + '（期望 ' + wantStatus + '）' + (ok ? '' : ' :: ' + run.output.split('\n').slice(0, 3).join(' | ')))
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
if (!contractMutated.includes("'0.1.9-rc.9'")) die('A-F4 构造失败：契约 packages 键锚点未命中（契约结构变更后需同步本工具）')
writeFileSync(contract4thKey, contractMutated)
const contractBadRun = runCase('contract-extra', greenProbe, FIXTURES_DIR, contract4thKey)
expectCase('A-F4 契约侧版本维失配（构造：契约多声明一个版本键）⇒ exit 1', contractBadRun, 1, ['版本维双向对账'])

const fourth = makeFourthFixtureDir()
const fourthRun = runCase('fixtures-4th', greenProbe, fourth)
expectCase('A-F4 fixtures 侧版本维失配（构造：新增第 4 份快照）⇒ exit 1', fourthRun, 1, ['版本维双向对账'])

// ⑤ A-F6 失败分类处置覆盖（fail() 类别 ≡ DISPOSAL 键集，双向）
const disposalStart = probe.body.indexOf('const DISPOSAL = {')
const disposalBlock = disposalStart < 0 ? '' : probe.body.slice(disposalStart, probe.body.indexOf('\n}', disposalStart))
const disposalKeys = [...new Set([...disposalBlock.matchAll(/'([a-z-]+)':\s*'/g)].map((m) => m[1]))].sort()
const usedClasses = [...new Set([...probe.body.matchAll(/fail\('([a-z-]+)'/g)].map((m) => m[1]).concat(['input']))].sort()
record('⑤ A-F6 分类处置覆盖：fail() 类别 ' + JSON.stringify(usedClasses) + ' ≡ DISPOSAL 键集 ' + JSON.stringify(disposalKeys),
  disposalKeys.length > 0 && JSON.stringify(usedClasses) === JSON.stringify(disposalKeys) && probe.body.includes('── 类别 '),
  'used=' + JSON.stringify(usedClasses) + ' declared=' + JSON.stringify(disposalKeys))

// ── 报告 ────────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok)
console.log('[probe-face] COMPAT-014 探测轨判据离线机检（ci.yml → ' + probe.target + '；零网络 / 零 install）')
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
console.log('[probe-face] OK：' + results.length + ' 项机检全通过（判据语法/门禁/白名单/构造退出码语义/分类处置）')
