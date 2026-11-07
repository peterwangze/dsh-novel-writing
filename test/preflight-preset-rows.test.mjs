/**
 * test/preflight-preset-rows.test.mjs — 行级预检 CLI 的独立测试（COMPAT-021；smoke 侧接线机检见 test/smoke.mjs COMPAT-023 ④）
 *
 * 覆盖面（docs/COMPATIBILITY.md §7.4/§9.2/§12.1「严格校验」）：
 *   ① 六个离线 fixture（spawn `scripts/preflight-preset-rows.mjs --fixture …`）——四代际 exit 0 /
 *      unknown exit 1（fail-closed，全行 NOT_RUN）/ negative exit 1 且输出含 ERR_PACKAGE_PATH_NOT_EXPORTED；
 *      逐 fixture 对照 `expected.json`（verdict / generation / 退出码 / 行状态表）；
 *   ② 真实仓内真跑（--patch cordis.patch.yml --legacy agent-presets/novel-writing/agent.cordis.yml）：
 *      断言**可移植结构不变量**（R1 F2：generation ∈ 已知声明代 + ok:true + 0 FAIL + dual PASS +
 *      双披露恰 1/1——不硬钉本机版本）；无宿主平面的环境（CI）该面按 BUG-007 三态口径断言
 *      exit 3 + verdict=NOT_RUN（**NOT_RUN 绝不断言成 PASS**），并用故障注入
 *      NV_COMPAT_PLANE=profile + 空 $DSH_HOME 确定性复现 exit 3；
 *   ③ 用法错误面（未知参数 / 非法 --generation）exit 2；--strict 下 unknown 仍 exit 1 且 overridden:true。
 *   ⑤ 端到端混合平面 fail-closed（R1 F1）：`--global-root <dir>` 诊断注入伪全局闭包（与伪 profile 双平面
 *      代际不同 ⇒ legacy-only 行必 FAIL MIXED_PLANE_FAIL_CLOSED 而非 KNOWN_DROP；注入时 JSON 必含
 *      plane.globalRootOverride 审计标记——注入不得冒充自然根，§8.3 injected 纪律）。
 *   ⑥ COMPAT-023 --surfaces 维度端到端：pristine 30 格（24 PASS + 6 WARN 集中 unknown 代）/
 *      tamper 负向（缓存副本抹 shell.overlay ⇒ decl-0.2.2 面 2 FAIL SURFACE_EVIDENCE_MISMATCH）/
 *      缓存缺面（12 SKIP ≠ PASS + 12 PASS + 6 WARN，exit 0 三态；--strict 升红双码）/ 用法面 exit 2。
 *
 * 汇总行：`PREFLIGHT TEST PASSED/FAILED (n)`。退出码 0/1。
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SCRIPT = join(REPO_ROOT, 'scripts', 'preflight-preset-rows.mjs')
const FIXTURES = join(REPO_ROOT, 'test', 'fixtures', 'host-generations')
const NODE = process.execPath

let passed = 0
let failed = 0
const fail = (name, detail) => { failed += 1; console.error('FAIL ' + name + (detail === '' ? '' : '：' + detail)) }
const ok = (name) => { passed += 1; console.log('ok   ' + name) }

/** spawn CLI；stdoutFull/stderrFull 合并供 mustContain 断言（negative 的报文可能在任一流）。 */
function run(args, env = {}) {
  const result = spawnSync(NODE, [SCRIPT, ...args], { cwd: REPO_ROOT, encoding: 'utf8', env: { ...process.env, ...env } })
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', combined: (result.stdout ?? '') + '\n' + (result.stderr ?? '') }
}

function tryJson(text) {
  try { return JSON.parse(text) } catch { return null }
}

// ── ① 六个离线 fixture ───────────────────────────────────────────────────────
for (const fixture of ['legacy-0.1', 'decl-0.2.0', 'decl-0.2.1', 'decl-0.2.2', 'unknown', 'negative-missing-export']) {
  const expectedPath = join(FIXTURES, fixture, 'expected.json')
  if (!existsSync(expectedPath)) { fail(`${fixture} fixture 缺 expected.json`, ''); continue }
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8'))
  const result = run(['--fixture', join(FIXTURES, fixture), '--json'])
  const report = tryJson(result.stdout)
  if (report === null) { fail(`${fixture} fixture 输出不是 JSON`, String(result.combined).slice(0, 200)); continue }
  const bad = []
  if (result.status !== expected.exitCode) bad.push(`exit ${result.status} ≠ ${expected.exitCode}`)
  if (report.generation !== expected.expectedGeneration) bad.push(`generation ${report.generation} ≠ ${expected.expectedGeneration}`)
  if (report.ok !== (expected.verdict === 'pass')) bad.push(`ok ${report.ok} ≠ ${expected.verdict === 'pass'}`)
  for (const [source, rows] of Object.entries(expected.rows ?? {})) {
    for (const [rowId, wantStatus] of Object.entries(rows)) {
      const actual = report.rows.filter((row) => row.source === source && row.id === rowId)
      if (actual.length === 0) { bad.push(`${source}:${rowId} 未出现在 rows`); continue }
      const first = actual[0]
      if (first.status !== wantStatus) bad.push(`${source}:${rowId} status ${first.status} ≠ ${wantStatus}`)
    }
  }
  for (const needle of expected.mustContain ?? []) {
    if (!result.combined.includes(needle)) bad.push(`输出未含 ${needle}`)
  }
  // BUG-007 三态自洽：unknown fixture 的行全部 NOT_RUN，绝无 PASS
  if (fixture === 'unknown') {
    const passCount = report.rows.filter((row) => row.status === 'PASS').length
    if (passCount !== 0) bad.push(`unknown fixture 出现 ${passCount} 个 PASS（NOT_RUN 不得渲染成 PASS）`)
  }
  if (bad.length === 0) ok(`${fixture} fixture：exit=${result.status} generation=${report.generation} verdict=${expected.verdict}（行状态表与 expected.json 全等）`)
  else fail(`${fixture} fixture`, bad.join('；'))
}

// ── ② 真实仓内真跑（可移植口径，R1 F2：不硬钉本机版本——fail-loud 而非假绿）────────
const real = run(['--patch', 'cordis.patch.yml', '--legacy', 'agent-presets/novel-writing/agent.cordis.yml', '--json'])
if (real.status === 3) {
  // 无宿主平面的环境（CI）：BUG-007 三态口径——断言 NOT_RUN 披露，绝不断言成 PASS
  const report = tryJson(real.stdout)
  const bad = []
  if (report === null) bad.push('exit 3 但输出不是 JSON')
  else {
    if (report.ok !== false) bad.push('ok 必须为 false')
    if (report.verdict !== 'NOT_RUN') bad.push(`verdict ${report.verdict} ≠ NOT_RUN`)
    if ((report.errors ?? []).some((e) => e.code !== 'ENV_UNDECIDABLE')) bad.push('errors 应仅含 ENV_UNDECIDABLE')
  }
  if (bad.length === 0) ok('真实仓内真跑（无宿主平面环境）：exit 3 + verdict=NOT_RUN（NOT_RUN ≠ PASS，如实披露）')
  else fail('真实仓内真跑（无宿主平面环境）', bad.join('；'))
} else {
  // 有宿主平面：断结构不变量（generation ∈ 已知声明代 + ok + 0 FAIL + dual PASS + 双披露恰 1/1）
  const report = tryJson(real.stdout)
  const bad = []
  if (report === null) { bad.push('输出不是 JSON') }
  else {
    if (real.status !== 0) bad.push(`exit ${real.status} ≠ 0`)
    if (report.ok !== true) bad.push('ok ≠ true')
    const knownDecl = ['decl-0.2.0', 'decl-0.2.1', 'decl-0.2.2']
    if (!knownDecl.includes(report.generation)) bad.push(`generation ${report.generation} ∉ ${knownDecl.join('/')}（环境代际未知——fail-loud）`)
    if (!['profile', 'install-anchor'].includes(report.confidence)) bad.push(`confidence ${report.confidence} ∉ profile/install-anchor`)
    const failRows = report.rows.filter((row) => row.status === 'FAIL')
    if (failRows.length !== 0) bad.push(`${failRows.length} 个 FAIL 行（首个：${failRows[0].source}:${failRows[0].id}）`)
    if (report.dual?.status !== 'PASS') bad.push(`dual ${report.dual?.status} ≠ PASS`)
    if (report.summary?.knownDrop !== 1) bad.push(`knownDrop ${report.summary?.knownDrop} ≠ 1（legacy 源恰 1 行 legacy-only 披露）`)
    if (report.summary?.knownVariant !== 1) bad.push(`knownVariant ${report.summary?.knownVariant} ≠ 1（legacy 源 worker-thread 变体披露）`)
    if (report.plane?.globalRootOverride !== undefined) bad.push('无注入运行出现 plane.globalRootOverride 标记（R2 N1：标记仅注入时允许出现）')
  }
  if (bad.length === 0) ok(`真实仓内真跑（本机平面）：exit=0 ok=true generation=${report.generation}（hostVersion=${report.hostVersion}，confidence=${report.confidence}）行集 0 FAIL`)
  else fail('真实仓内真跑（本机平面）', bad.join('；'))
}

// exit 3 的确定性复现（故障注入 §8.3）：空 $DSH_HOME + NV_COMPAT_PLANE=profile（禁安装锚点 fallback）
{
  const emptyHome = mkdtempSync(join(tmpdir(), 'nv-preflight-empty-'))
  const result = run(['--json'], { DSH_HOME: emptyHome, NV_COMPAT_PLANE: 'profile' })
  const report = tryJson(result.stdout)
  const bad = []
  if (result.status !== 3) bad.push(`exit ${result.status} ≠ 3`)
  if (report === null || report.verdict !== 'NOT_RUN' || report.ok !== false) bad.push('未按 NOT_RUN 披露')
  rmSync(emptyHome, { recursive: true, force: true })
  if (bad.length === 0) ok('环境不可判定面：空 DSH_HOME + NV_COMPAT_PLANE=profile ⇒ exit 3 + NOT_RUN（fail-closed，非崩溃）')
  else fail('环境不可判定面', bad.join('；'))
}

// ── ③ 用法与覆盖语义 ─────────────────────────────────────────────────────────
{
  const bad1 = run(['--bogus'])
  const bad2 = run(['--generation', 'nope', '--fixture', join(FIXTURES, 'decl-0.2.2')])
  const strictUnknown = run(['--fixture', join(FIXTURES, 'decl-0.2.2'), '--generation', 'unknown', '--strict', '--json'])
  const report = tryJson(strictUnknown.stdout)
  const bad = []
  if (bad1.status !== 2) bad.push(`未知参数 exit ${bad1.status} ≠ 2`)
  if (bad2.status !== 2) bad.push(`非法 --generation exit ${bad2.status} ≠ 2`)
  if (strictUnknown.status !== 1) bad.push(`--strict unknown exit ${strictUnknown.status} ≠ 1`)
  if (report === null || report.overridden !== true || report.generation !== 'unknown') bad.push('--generation 覆盖未标 overridden:true / generation 未生效')
  if (bad.length === 0) ok('用法错误面（exit 2）与 --generation 覆盖语义（overridden:true；--strict unknown 仍 exit 1）')
  else fail('用法与覆盖语义', bad.join('；'))
}

// ── ④ C3 混合平面判据与投影 fail-closed（纯函数单元面；混合平面无法在本机端到端构造，判据核心在此钉死）──
{
  const { pathToFileURL } = await import('node:url')
  const { dispositionFor, projectRows } = await import(pathToFileURL(join(REPO_ROOT, 'lib', 'host-compat', 'preset-projection.mjs')).href)
  const { GENERATION_DROPPED, detectGeneration } = await import(pathToFileURL(join(REPO_ROOT, 'lib', 'host-compat', 'generation-manifest.mjs')).href)
  const bad = []
  // 两平面代际对 legacy-only 行处置相反 = CLI droppedDispositionConflicts 的判定核心（MIXED_PLANE_FAIL_CLOSED）
  const legacyAction = dispositionFor('legacy-0.1', GENERATION_DROPPED.name).action
  const declAction = dispositionFor('decl-0.2.1', GENERATION_DROPPED.name).action
  if (legacyAction !== 'keep' || declAction !== 'drop') bad.push(`dropped 处置 ${legacyAction}/${declAction} ≠ keep/drop（混合平面 fail-closed 判据前提失真）`)
  // unknown 绝不投影（不返回行数组）
  const u = projectRows('unknown', [{ id: 'x', name: '@deepseek-ai/dsh-tool-fs' }])
  if (Array.isArray(u) || u?.error !== 'unknown-generation') bad.push(`projectRows('unknown') 未 fail-closed：${JSON.stringify(u)}`)
  // 判据双轴矛盾 ⇒ unknown（0.1.x 版本 + 声明代在场；0.2.x 版本 + 缺席；≥0.3.0）
  for (const [hostVersion, hasAgentPreset] of [['0.1.5-rc.2', true], ['0.2.1-rc.2', false], ['0.3.0', true], ['banana', true]]) {
    if (detectGeneration({ hostVersion, hasAgentPreset }) !== 'unknown') bad.push(`detectGeneration(${hostVersion},${hasAgentPreset}) 应为 unknown`)
  }
  if (bad.length === 0) ok('C3 判据核心：legacy/decl 对 legacy-only 行处置相反（keep≠drop ⇒ 混合平面 fail-closed 前提）∧ projectRows(unknown) 不投影 ∧ 判据双轴矛盾恒 unknown')
  else fail('C3 判据核心', bad.join('；'))
}

// ── ⑤ 端到端混合平面 fail-closed（R1 F1 返工：C3 接线的仓内回归守卫）────────────
// 构造（纯临时目录，mkdtemp，跑完即清）：伪 profile = decl-0.2.2 fixture 平面副本
// （dsh@0.2.2-rc.1 + agent-preset 在场 ⇒ decl-0.2.2）；伪全局闭包 = legacy-0.1 fixture
// 平面副本（dsh@0.1.5-rc.2 无 agent-preset ⇒ legacy-0.1），经 --global-root 注入——
// 两平面代际不同且对 legacy-only 行处置相反（drop vs keep）⇒ 该行必须 FAIL
// MIXED_PLANE_FAIL_CLOSED（而非 KNOWN_DROP 静默跳过），--strict 再加 STRICT_MIXED_PLANE。
// 变异自测（已做，见任务报告）：把 CLI 的 conflict 接线短路（droppedDispositionConflicts
// 恒 false）后本用例必红；恢复后全绿——断言对 C3 回归真有判别力。
{
  const profileDir = mkdtempSync(join(tmpdir(), 'nv-mixed-profile-'))
  const globalDir = mkdtempSync(join(tmpdir(), 'nv-mixed-global-'))
  try {
    cpSync(join(FIXTURES, 'decl-0.2.2', 'node_modules'), join(profileDir, 'node_modules'), { recursive: true })
    cpSync(join(FIXTURES, 'legacy-0.1', 'node_modules', '@deepseek-ai'), join(globalDir, '@deepseek-ai'), { recursive: true })
    // 临时副本元数据补齐（不动 shipped fixtures）：支持 `/package.json` 解析 + 入口 stub
    //（真平面模式的包解析路径需要；stub 为空 CJS 模块 ⇒ schema 检查落 NO_SCHEMA，不引入其它 FAIL）
    for (const pkgName of ['dsh-agent-preset', 'dsh-tool-subagent-control', 'dsh-workflow-ptc']) {
      const pkgPath = join(profileDir, 'node_modules', '@deepseek-ai', pkgName, 'package.json')
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      pkg.exports = { ...pkg.exports, './package.json': './package.json' }
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
    }
    for (const pkgName of ['dsh-tool-subagent-control', 'dsh-workflow-ptc']) {
      mkdirSync(join(profileDir, 'node_modules', '@deepseek-ai', pkgName, 'lib'), { recursive: true })
      writeFileSync(join(profileDir, 'node_modules', '@deepseek-ai', pkgName, 'lib', 'index.js'), 'module.exports = {}\n')
    }
    const baseArgs = ['--profile', profileDir, '--global-root', globalDir,
      '--patch', join(FIXTURES, 'decl-0.2.2', 'rows.patch.yml'),
      '--legacy', join(FIXTURES, 'decl-0.2.2', 'rows.legacy.yml')]
    const mixed = run([...baseArgs, '--json'])
    const report = tryJson(mixed.stdout)
    const bad = []
    const auditBad = []
    if (report === null) { bad.push('输出不是 JSON：' + String(mixed.combined).slice(0, 160)) }
    else {
      if (mixed.status !== 1) bad.push(`exit ${mixed.status} ≠ 1`)
      if (report.generation !== 'decl-0.2.2') bad.push(`generation ${report.generation} ≠ decl-0.2.2（主平面 = 伪 profile）`)
      if (report.plane?.secondary?.generation !== 'legacy-0.1') bad.push(`secondary ${report.plane?.secondary?.generation} ≠ legacy-0.1`)
      if (report.mixedPlane !== true) bad.push('mixedPlane ≠ true')
      if (report.mixedPlaneDetail?.droppedDispositionConflicts !== true) bad.push('droppedDispositionConflicts ≠ true')
      const droppedRow = report.rows.find((row) => row.source === 'legacy' && row.id === 'tool-subagent-list-agents')
      if (droppedRow === undefined) bad.push('legacy 源未出现 tool-subagent-list-agents 行')
      else {
        if (droppedRow.status !== 'FAIL') bad.push(`legacy-only 行 status ${droppedRow.status} ≠ FAIL（静默跳过 = RISK-C3 复活）`)
        if (droppedRow.status === 'KNOWN_DROP') bad.push('legacy-only 行被披露为 KNOWN_DROP（混合平面下必须 fail-closed）')
        if (!String(droppedRow.message).includes('MIXED_PLANE_FAIL_CLOSED')) bad.push('行报文未含 MIXED_PLANE_FAIL_CLOSED')
      }
      if (!report.errors.some((e) => e.code === 'MIXED_PLANE_FAIL_CLOSED' && e.rowId === 'tool-subagent-list-agents')) bad.push('errors 未含 rowId 命中的 MIXED_PLANE_FAIL_CLOSED')
      const strict = run([...baseArgs, '--strict', '--json'])
      const strictReport = tryJson(strict.stdout)
      if (strict.status !== 1) bad.push(`--strict exit ${strict.status} ≠ 1`)
      if (strictReport === null || !strictReport.errors.some((e) => e.code === 'STRICT_MIXED_PLANE')) bad.push('--strict 未加判 STRICT_MIXED_PLANE')
      // R2 N1（独立断言组）：注入可审计性——注入时 JSON 必含 override 标记；无注入运行不得出现（下方 ② 真跑组反向覆盖）
      if (report.plane?.globalRootOverride !== true) auditBad.push('注入运行未含 plane.globalRootOverride=true（注入不得冒充自然根）')
      if (report.plane?.secondary?.via !== 'global-root-override') auditBad.push(`secondary.via ${report.plane?.secondary?.via} ≠ global-root-override`)
    }
    if (bad.length === 0) ok('端到端混合平面（伪 profile=decl-0.2.2 × 伪全局闭包=legacy-0.1，--global-root 注入）：exit 1 ∧ mixedPlane=true ∧ droppedDispositionConflicts=true ∧ legacy-only 行 FAIL（MIXED_PLANE_FAIL_CLOSED，非 KNOWN_DROP）∧ --strict 加 STRICT_MIXED_PLANE')
    else fail('端到端混合平面 fail-closed', bad.join('；'))
    if (auditBad.length === 0 && bad.length === 0) ok('注入可审计性（R2 N1）：--global-root 注入运行 JSON 含 plane.globalRootOverride=true ∧ secondary.via=global-root-override（§8.3 injected 纪律——注入不得冒充自然根；无注入运行零标记，由 ② 真跑组的 plane 字段实跑佐证）')
    else fail('注入可审计性（R2 N1）', auditBad.join('；'))
  } finally {
    rmSync(profileDir, { recursive: true, force: true })
    rmSync(globalDir, { recursive: true, force: true })
  }
}

// ── ⑥ COMPAT-023 --surfaces 维度（全依赖面看护：30 格对账 + tamper 负向判别 + SKIP 语义 + --strict 晋升）──
// 与 smoke 的 COMPAT-023 ④（接线机检）互补：本组端到端真跑 CLI——pristine 24 PASS + 6 WARN（unknown
// 代六面全 WARN，fail-closed 不冒绿）；tamper 负向（缓存副本抹掉 shell.overlay 证据 ⇒ face2 必红
// ——BUG-012 教训：客户端面失据必须 FAIL 而非静默绿）；缓存缺面 ⇒ SKIP ≠ PASS（faces 1-3 = verified
// 依赖缓存、faces 4-6 = fixture-record 只看仓库文件 ⇒ 12 SKIP + 12 PASS + 6 WARN）；--strict 把
// WARN/SKIP 晋升为 exit 1（STRICT_SURFACE_UNKNOWN / STRICT_SURFACE_SKIP）；用法面 exit 2。
{
  const pristine = run(['--surfaces', '--json'])
  const pReport = tryJson(pristine.stdout)
  const pBad = []
  if (pristine.status !== 0) pBad.push(`pristine exit ${pristine.status} ≠ 0`)
  if (pReport === null || pReport.mode !== 'surfaces') pBad.push('输出不是 surfaces 模式 JSON')
  else {
    if (pReport.ok !== true) pBad.push('ok ≠ true')
    const s = pReport.summary
    if (s?.total !== 30 || s?.pass !== 24 || s?.warn !== 6 || s?.skip !== 0 || s?.fail !== 0) pBad.push(`summary ${JSON.stringify(s)} ≠ 30/24/6/0/0`)
    const warnGens = new Set(pReport.rows.filter((r) => r.status === 'WARN').map((r) => r.generation))
    if (warnGens.size !== 1 || !warnGens.has('unknown')) pBad.push(`WARN 行代际 ${[...warnGens].join(',')} ≠ 恰 unknown（fail-closed）`)
    if ((pReport.errors ?? []).length !== 0) pBad.push('pristine 出现 errors（应零）')
  }
  if (pBad.length === 0) ok('--surfaces 真跑（pristine）：exit 0 ∧ 30 格 = 24 PASS + 6 WARN（WARN 全部集中于 unknown 代——fail-closed，非绿）+ 0 SKIP/FAIL ∧ 零 errors')
  else fail('--surfaces pristine', pBad.join('；'))

  // tamper 负向：证据根副本（四代全量——缺代际会变 SKIP 混淆判读）只篡 decl-0.2.2——抹掉
  // shell.overlay 证据（字符串级替换）⇒ 该代面 2 必 FAIL，其余 29 格不受污染。
  const tamperRoot = mkdtempSync(join(tmpdir(), 'nv-surfaces-tamper-'))
  try {
    for (const gen23 of ['legacy-0.1', 'decl-0.2.0', 'decl-0.2.1', 'decl-0.2.2']) {
      cpSync(join(FIXTURES, gen23, 'surfaces'), join(tamperRoot, gen23, 'surfaces'), { recursive: true })
    }
    const tamperedPath = join(tamperRoot, 'decl-0.2.2', 'surfaces', 'surfaces.json')
    writeFileSync(tamperedPath, readFileSync(tamperedPath, 'utf8').replaceAll('"shell.overlay"', '"shell.tampered-by-test"'))
    const tampered = run(['--surfaces', '--surfaces-evidence-root', tamperRoot, '--json'])
    const tReport = tryJson(tampered.stdout)
    const tBad = []
    if (tampered.status !== 1) tBad.push(`tamper exit ${tampered.status} ≠ 1（篡改证据必须红）`)
    if (tReport === null) tBad.push('输出不是 JSON')
    else {
      if (tReport.ok !== false) tBad.push('ok ≠ false')
      const failRow = tReport.rows.find((r) => r.status === 'FAIL' && r.generation === 'decl-0.2.2' && r.face === 2)
      if (failRow === undefined) tBad.push('decl-0.2.2 面 2 无 FAIL 行')
      else if (failRow.code !== 'SURFACE_EVIDENCE_MISMATCH' || !String(failRow.message).includes('shell.overlay')) tBad.push(`FAIL 行 code/message 未指向 shell.overlay：${failRow.code} ${String(failRow.message).slice(0, 80)}`)
      if (!tReport.errors.some((e) => e.code === 'SURFACE_EVIDENCE_MISMATCH' && e.generation === 'decl-0.2.2' && e.face === 2)) tBad.push('errors 未含 decl-0.2.2 面 2 的 SURFACE_EVIDENCE_MISMATCH')
      if (tReport.summary?.pass !== 23 || tReport.summary?.fail !== 1) tBad.push(`summary ${JSON.stringify(tReport.summary)} ≠ 23 PASS + 1 FAIL（其余 29 格不受污染）`)
    }
    if (tBad.length === 0) ok('--surfaces tamper 负向（缓存副本抹 shell.overlay）：exit 1 ∧ decl-0.2.2 面 2 FAIL（SURFACE_EVIDENCE_MISMATCH，指向 shell.overlay）∧ 其余 29 格不受污染（23 PASS + 6 WARN）')
    else fail('--surfaces tamper 负向', tBad.join('；'))
  } finally {
    rmSync(tamperRoot, { recursive: true, force: true })
  }

  // 缓存缺面：空证据根 ⇒ verified 面（1-3）全部 SKIP ≠ PASS；fixture-record 面（4-6）照常 PASS
  const emptyRoot = mkdtempSync(join(tmpdir(), 'nv-surfaces-empty-'))
  try {
    const missing = run(['--surfaces', '--surfaces-evidence-root', emptyRoot, '--json'])
    const mReport = tryJson(missing.stdout)
    const strictMissing = run(['--surfaces', '--surfaces-evidence-root', emptyRoot, '--strict', '--json'])
    const smReport = tryJson(strictMissing.stdout)
    const eBad = []
    if (missing.status !== 0) eBad.push(`cache-missing exit ${missing.status} ≠ 0（SKIP 不是失败——三态口径）`)
    if (mReport === null) eBad.push('输出不是 JSON')
    else {
      const s = mReport.summary
      if (s?.skip !== 12 || s?.pass !== 12 || s?.warn !== 6) eBad.push(`summary ${JSON.stringify(s)} ≠ 12 SKIP + 12 PASS + 6 WARN（faces1-3 verified × 4 代 = 12 需缓存）`)
      const skipRows = mReport.rows.filter((r) => r.status === 'SKIP')
      if (skipRows.some((r) => r.code !== 'SURFACE_EVIDENCE_CACHE_MISSING')) eBad.push('SKIP 行 code ≠ SURFACE_EVIDENCE_CACHE_MISSING')
      if (skipRows.some((r) => r.face > 3)) eBad.push('face>3（fixture-record）不该 SKIP——它们不依赖缓存')
    }
    if (strictMissing.status !== 1) eBad.push(`--strict cache-missing exit ${strictMissing.status} ≠ 1`)
    if (smReport === null || !smReport.errors.some((e) => e.code === 'STRICT_SURFACE_SKIP')) eBad.push('--strict 未判 STRICT_SURFACE_SKIP')
    if (smReport === null || !smReport.errors.some((e) => e.code === 'STRICT_SURFACE_UNKNOWN')) eBad.push('--strict 未判 STRICT_SURFACE_UNKNOWN（WARN 同场晋升）')
    if (eBad.length === 0) ok('--surfaces 缓存缺面：空证据根 ⇒ 12 SKIP（SURFACE_EVIDENCE_CACHE_MISSING ≠ PASS；faces 4-6 fixture-record 照常 12 PASS）+ 6 WARN ∧ exit 0（三态）；--strict ⇒ exit 1 + STRICT_SURFACE_SKIP ∧ STRICT_SURFACE_UNKNOWN')
    else fail('--surfaces 缓存缺面/--strict', eBad.join('；'))
  } finally {
    rmSync(emptyRoot, { recursive: true, force: true })
  }

  // 用法面：--surfaces 与 --fixture/--profile/--explain 互斥；--surfaces-evidence-root 指向不存在目录
  const u1 = run(['--surfaces', '--fixture', join(FIXTURES, 'decl-0.2.2')])
  const u2 = run(['--surfaces', '--surfaces-evidence-root', join(tmpdir(), 'nv-surfaces-nonexistent-' + Date.now())])
  const uBad = []
  if (u1.status !== 2) uBad.push(`--surfaces --fixture exit ${u1.status} ≠ 2`)
  if (u2.status !== 2) uBad.push(`不存在证据根 exit ${u2.status} ≠ 2`)
  if (uBad.length === 0) ok('--surfaces 用法面：与 --fixture 互斥 exit 2 ∧ --surfaces-evidence-root 指向不存在目录 exit 2')
  else fail('--surfaces 用法面', uBad.join('；'))
}

console.log(`\nPREFLIGHT TEST ${failed === 0 ? 'PASSED' : 'FAILED'} (${passed})`)
process.exit(failed === 0 ? 0 : 1)
