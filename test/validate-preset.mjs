/**
 * 预设挂载级静态校验（与加载器同源）：
 * 1) 用 dsh-agent-presets 的 scanRoot（discovery 的真实健康检查）解析 agent.cordis.yml
 *    —— 覆盖：YAML 方言（entryListSchema）、行形状（name 必填、group 递归）；
 * 2) 逐行校验组合里每个插件的 name 能否从 profile 目录解析（与 loader baseUrl 一致）；
 * 3) preset.yml 显示元数据存在；
 * 4) **预设行 × 已装宿主插件 Config schema**（BUG-007；preset-schema-face.mjs，Check 28v 同源思路）：
 *    用加载器自己的方言/求值/interpolate 与解析出的 cordis `resolveConfig` 逐行核对 config，
 *    三态判定 PASS / FAIL / NOT_RUN（宿主平面不可达时**披露为 NOT_RUN，绝不当 PASS**）。
 * 运行：node test/validate-preset.mjs [--require-schema-plane] [--no-schema-table]
 *   --require-schema-plane：把第 4 段的 NOT_RUN 视为失败（环境保证有宿主平面时的 fail-closed 面）。
 *   --no-schema-table：只打印第 4 段摘要，不打印逐行表。
 */
import { createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const presetDir = join(root, 'agent-presets', 'novel-writing')
const profileDir = join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh', 'profiles', 'web')
const profileAvailable = existsSync(join(profileDir, 'package.json'))
const require = profileAvailable ? createRequire(join(profileDir, 'index.js')) : null

const argv = process.argv.slice(2)
const requireSchemaPlane = argv.includes('--require-schema-plane')
const schemaTable = !argv.includes('--no-schema-table')

let failed = 0
const fail = (msg) => { failed += 1; console.error('FAIL ' + msg) }
const ok = (msg) => console.log('ok   ' + msg)
console.log(profileAvailable ? 'mode: full (profile dir available)' : 'mode: degraded (no profile dir; @deepseek-ai resolution skipped, novel rows checked via package exports)')

// ── 0. 预设行 × 已装宿主 Config schema（BUG-007；三态：PASS / FAIL / NOT_RUN）────
// 本段与下面的形状/解析段**相互独立**：形状合法（行有 name、模块可解析）并不保证 config 合法——
// 正是 BUG-007 的失效模式（persona 行 `text` 键让整棵预设挂载被否决，而形状检查全绿）。
// BUG-011 起 dual 模式：同时核对两源（agent.cordis.yml = 0.1.x 真源 / cordis.patch.yml 声明行
// plugins = 0.2.0 真源），已知代际变体（worker-thread ↔ ptc）按平面代系披露并对侧互钉。
let schemaVerdict = 'NOT_RUN'
async function schemaFace(compositionPath) {
  const { checkComposition, formatRows, VERDICT_PASS, VERDICT_FAIL } = await import('./fixtures/host-surfaces/preset-schema-face.mjs')
  const report = await checkComposition({ composition: compositionPath, dual: true })
  schemaVerdict = report.verdict
  console.log('  schema-face host-plane: ' + report.plane.source + (report.plane.nodeModules === null ? '' : ' (' + report.plane.nodeModules + ')')
    + ' | oracle: ' + JSON.stringify(report.oracle?.versions ?? null))
  if (schemaTable && report.rows.length > 0) for (const line of formatRows(report)) console.log('    ' + line)
  if (report.verdict === VERDICT_PASS) {
    ok(`schema-face: 预设行 × 已装宿主 Config schema PASS（启用行 ${report.coverage.enabled}；与 schema 比对 ${report.coverage.checked}；未校验 ${report.coverage.unverified} 项已逐行披露）`)
  } else if (report.verdict === VERDICT_FAIL) {
    fail('schema-face: ' + report.reason)
    for (const row of report.rows.filter((r) => r.kind === 'CONFIG_INVALID')) {
      console.error('      行 "' + row.id + '" (' + row.name + ' ' + (row.version ?? '?') + '): ' + (row.detail ?? row.message).split('\n').join('\n      '))
    }
  } else {
    const line = 'schema-face: NOT_RUN（未验证 —— 不是通过）：' + report.reason
    if (requireSchemaPlane) fail(line)
    else console.warn('WARN ' + line)
  }
}

// ── 1. composition 文件与 loader 同源解析 ────────────────────────────────
const compositionPath = join(presetDir, 'agent.cordis.yml')
if (!existsSync(compositionPath)) {
  fail('agent.cordis.yml missing')
  process.exit(1)
}
await schemaFace(compositionPath)
let yamlLoad = null
try {
  yamlLoad = (await import('js-yaml')).load
} catch {
  yamlLoad = null
}
let rows
if (yamlLoad !== null) {
  try {
    rows = yamlLoad(readFileSync(compositionPath, 'utf8'), { schema: entryListSchemaCompat() })
    ok('agent.cordis.yml parses with loader dialect (js-yaml + entryListSchema)')
  } catch (error) {
    fail('agent.cordis.yml YAML error: ' + error.message)
    process.exit(1)
  }
} else {
  // 降级模式（无 js-yaml / 无 profile）：行级形状检查 + 元数据 + 技能检查后直接收尾。
  // 不构造占位行（会被行级解析判为未知插件），也不做行级模块解析。
  const lines = readFileSync(compositionPath, 'utf8').split('\n')
  const named = lines.filter((l) => /^\s*-\s*id:\s*\S+/.test(l)).length
  const names = lines.filter((l) => /^\s{0,8}name:\s*\S+/.test(l)).length
  if (named < 15 || names < 15) { fail(`degraded shape check: rows=${named} names=${names}`); }
  else ok(`degraded mode: composition shape plausible (${named} rows, ${names} names; install js-yaml for full parse)`)
  if (!existsSync(join(presetDir, 'preset.yml'))) fail('preset.yml missing')
  else {
    ok('preset.yml exists')
    const metaText = readFileSync(join(presetDir, 'preset.yml'), 'utf8')
    if (!/name:/.test(metaText) || !/description:/.test(metaText)) fail('preset.yml lacks name/description')
    else ok('preset.yml carries name/description')
  }
  const fs2 = await import('node:fs')
  const skillsDir2 = join(presetDir, 'skills')
  const skillDirs2 = fs2.readdirSync(skillsDir2, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  let skillOk2 = 0
  for (const s of skillDirs2) {
    const p = join(skillsDir2, s, 'SKILL.md')
    if (!existsSync(p)) { fail(`skill ${s} missing SKILL.md`); continue }
    const head = readFileSync(p, 'utf8').slice(0, 400)
    if (!/^---\s*\nname:\s*\S+/m.test(head) || !/description:/.test(head)) { fail(`skill ${s} frontmatter incomplete`); continue }
    skillOk2 += 1
  }
  ok(`skills indexed: ${skillOk2}/${skillDirs2.length}`)
  if (skillDirs2.length < 25) fail('expected >= 25 skills')
  const compositionText = readFileSync(compositionPath, 'utf8')
  if (!/customSkillDirs:/.test(compositionText) || !/new URL\('skills\/', baseUrl\)/.test(compositionText)) {
    fail('skill-filesystem row lacks customSkillDirs baseUrl expression')
  } else ok('customSkillDirs expression present')
  console.log(failed === 0 ? `\nPRESET VALIDATION PASSED (degraded；schema-face: ${schemaVerdict})` : `\nPRESET VALIDATION FAILED (${failed})`)
  process.exit(failed === 0 ? 0 : 1)
}
if (!Array.isArray(rows)) { fail('composition must be a top-level list'); process.exit(1) }

function entryListSchemaCompat() {
  // 与 dsh-agent-presets discovery 相同的 schema：直接从包里取，保证同源
  try {
    const mod = require('@deepseek-ai/cordis-plugin-include')
    return mod.entryListSchema
  } catch {
    return undefined
  }
}

// ── 2. 行形状与模块解析（与 discovery.entryListProblem 相同的规则）────────
// BUG-011 代际变体容忍口径（与 preset-schema-face GENERATION_VARIANT 同源常量）：本源是 0.1.x
// 真源（agent.cordis.yml 保留 worker-thread 行），在 0.2.0 平面上必然 MODULE_NOT_FOUND——对侧包
// 在场即判「已知代际变体」披露通过（双源等价由 schema-face dual 模式互钉）；对侧也不在 ⇒ 真缺包仍 FAIL。
const { GENERATION_VARIANT, GENERATION_DROPPED } = await import('./fixtures/host-surfaces/preset-schema-face.mjs')
const generationCounterpart = (name) => name === GENERATION_VARIANT.legacy.name ? GENERATION_VARIANT.current.name
  : name === GENERATION_VARIANT.current.name ? GENERATION_VARIANT.legacy.name : null
// 平面探测双通道（BUG-011）：①profile 目录 require.resolve（经典通道——但 profiles/node_modules
// 符号链接农场是环境投影，可能对新包滞后/对已删包悬空）；②全局安装闭包直查（<npm root -g>/
// @deepseek-ai/dsh/node_modules/@deepseek-ai/<pkg>——宿主 app-boot collectInstallationScopePackages
// 的安装锚点真相，与运行时 loader 解析同源）。两通道任一命中即「包在场」，输出标注命中通道。
import { execFileSync } from 'node:child_process'
const globalClosureDir = (() => {
  try {
    const npmRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim()
    return npmRoot === '' ? null : join(npmRoot, '@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai')
  } catch { return null }
})()
function packageOnPlane(name) {
  if (require !== null) { try { return { hit: 'profile-resolve', path: require.resolve(name) } } catch { /* 落全局闭包通道 */ } }
  // 闭包目录已停在 @deepseek-ai 作用域层 ⇒ 相对它只用裸包名（scoped 名去作用域段），防双重拼接
  if (globalClosureDir !== null) {
    const relParts = name.startsWith('@') ? name.split('/').slice(1) : name.split('/')
    if (existsSync(join(globalClosureDir, ...relParts, 'package.json'))) {
      return { hit: 'install-anchor', path: join(globalClosureDir, ...relParts) }
    }
  }
  return null
}
// 声明代平面（0.2.x）：`@deepseek-ai/dsh-agent-preset` 在场 ⇒ 0.2.x 源为事实源（与 install 脚本 /
// preset-schema-face 同口径的能力检测）。为 null 时按 profile 在场与否分流：**有 profile** 的 0.1.x
// 平面下 legacy-only 行走下方原始解析路径（缺失即真故障）；**无 profile** 的降级面属预存在的解析期
// fail-closed（loader schema 不可得 ⇒ YAML `!!js` 标签解析即失败），不对模块解析作保证。
const declarationPlane = packageOnPlane('@deepseek-ai/dsh-agent-preset')
function checkRows(list, at) {
  for (const [index, row] of list.entries()) {
    const label = `${at}row ${index + 1}`
    if (typeof row !== 'object' || row === null || Array.isArray(row)) { fail(`${label} is not a plugin row`); continue }
    if (typeof row.name !== 'string' || row.name === '') { fail(`${label} names no plugin`); continue }
    if (row.disabled === true) { ok(`${label} (${row.id ?? '?'} → ${row.name}) [disabled]`); continue }
    if (row.name === 'cordis:group') {
      if (!Array.isArray(row.config)) { fail(`${label} group without config list`); continue }
      checkRows(row.config, label + ' / ')
      continue
    }
    // 本包自身的子路径行：按 exports 映射直查文件（无 profile 环境也可验证）
    if (row.name.startsWith('dsh-novel-writing')) {
      const subpath = row.name === 'dsh-novel-writing' ? '.' : './' + row.name.slice('dsh-novel-writing/'.length)
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      const target = pkg.exports?.[subpath]
      if (typeof target !== 'string' || !existsSync(join(root, target))) {
        fail(`${label} (${row.id ?? '?'} → ${row.name}) exports target missing: ${String(target)}`)
      } else {
        ok(`${label} (${row.id ?? '?'} → ${row.name}) exports → ${target}`)
      }
      continue
    }
    if (!profileAvailable) {
      // COMPAT-020 legacy-only 行：无 profile ⇒ 无法判定声明代平面，显式 fail-closed（非静默跳过）。
      // 注：当前降级运行在更早的 YAML 解析期即失败（loader schema 不可得），本分支是防御性兜底。
      if (row.name === GENERATION_DROPPED.name) {
        fail(`${label} (${row.id ?? '?'} → ${row.name}) legacy-only 行在无 profile 降级面无法判定声明代平面：fail-closed`)
        continue
      }
      if (row.name.startsWith('@deepseek-ai/')) { ok(`${label} (${row.id ?? '?'} → ${row.name}) [resolution skipped: no profile]`); continue }
      fail(`${label} (${row.id ?? '?'} → ${row.name}) unknown plugin without profile to resolve`)
      continue
    }
    // 包在场探测（loader 以 profile 目录为 baseUrl；BUG-011 起叠加安装锚点直查通道）
    // COMPAT-020：legacy-only 行（0.2.x 源已整行移除）——声明代平面（0.2.x）不解析该子路径（0.2.2 起
    // 已从 exports 移除），`list_agents` 改由主包注册；此处**显式披露并跳过**（非静默）。**有 profile**
    // 且声明面为 null（0.1.x）时不跳过，保留下面的原始解析/fail 路径（0.1.x 上该行 MUST 可解析，缺失仍
    // 是真故障）。**无 profile** 的降级面在到达本函数前即已在 YAML 解析期 fail-closed；若未来可达，
    // 上面的无 profile 分支对该行显式 fail-closed，本工具不对其宣称模块解析保证（REVIEW-COMPAT-020-R1 F4）。
    if (row.name === GENERATION_DROPPED.name && declarationPlane !== null) {
      ok(`${label} (${row.id ?? '?'} → ${row.name}) [generation-dropped：0.2.x 源已移除本行；0.2.2 由主包提供 list_agents；本工具跳过 legacy-only 行]`)
      continue
    }
    const present = packageOnPlane(row.name)
    if (present !== null) {
      ok(`${label} (${row.id ?? '?'} → ${row.name}) resolves[${present.hit}] → ${present.path.replace(process.env.USERPROFILE ?? '', '~')}`)
      continue
    }
    const counterpart = generationCounterpart(row.name)
    if (counterpart !== null && packageOnPlane(counterpart) !== null) {
      ok(`${label} (${row.id ?? '?'} → ${row.name}) [generation-variant：本平面已无此包；对侧 ${counterpart} 在场，双源核对覆盖]`)
      continue
    }
    fail(`${label} (${row.id ?? '?'} → ${row.name}) cannot resolve from profile dir: MODULE_NOT_FOUND`)
  }
}
checkRows(rows, '')

// ── 2b. COMPAT-020 代际删除行静态硬不变量（源侧；与 preset-schema-face dual 双保险）──
// ① cordis.patch.yml MUST NOT 再声明 legacy-only 行（0.2.2 起该子路径已从 exports 移除——残留即整棵
//   预设激活抛 ERR_PACKAGE_PATH_NOT_EXPORTED）；② agent.cordis.yml MUST 恰 1 行（0 行 = 0.1.x 丢工具）；
// ③ 该 legacy 行 config 空/未声明（删除行不得「借壳」承载配置）。
const flattenRows = (list, out = []) => {
  for (const row of list) {
    if (row === null || typeof row !== 'object') continue
    out.push(row)
    if (row.group === true && Array.isArray(row.config)) flattenRows(row.config, out)
  }
  return out
}
const droppedName = GENERATION_DROPPED.name
const patchText = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
if (patchText.includes(droppedName)) fail(`cordis.patch.yml MUST NOT 声明 legacy-only 行：${droppedName}（0.2.2 起该子路径已移除）`)
else ok('cordis.patch.yml 未声明 legacy-only list-agents 行（0.2.x 源正确）')
const droppedRows = flattenRows(rows).filter((row) => row.name === droppedName)
if (droppedRows.length !== 1) fail(`agent.cordis.yml MUST 恰 1 行 legacy-only list-agents（实测 ${droppedRows.length}）`)
else {
  ok('agent.cordis.yml 保留恰 1 行 legacy-only list-agents（0.1.x 源）')
  const cfg = droppedRows[0].config
  const empty = cfg === undefined || cfg === null || (typeof cfg === 'object' && !Array.isArray(cfg) && Object.keys(cfg).length === 0)
  if (empty) ok('legacy-only list-agents 行 config 为空/未声明')
  else fail(`legacy-only list-agents 行 config MUST 空/未声明（实测 ${JSON.stringify(cfg).slice(0, 120)}）`)
}

// ── 3. 元数据与技能目录 ──────────────────────────────────────────────────
if (!existsSync(join(presetDir, 'preset.yml'))) fail('preset.yml missing')
else ok('preset.yml exists')
const meta = readFileSync(join(presetDir, 'preset.yml'), 'utf8')
if (!/name:/.test(meta) || !/description:/.test(meta)) fail('preset.yml lacks name/description')
else ok('preset.yml carries name/description')

const skillsDir = join(presetDir, 'skills')
const fs = await import('node:fs')
const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
let skillOk = 0
for (const s of skillDirs) {
  const p = join(skillsDir, s, 'SKILL.md')
  if (!existsSync(p)) { fail(`skill ${s} missing SKILL.md`); continue }
  const head = readFileSync(p, 'utf8').slice(0, 400)
  if (!/^---\s*\nname:\s*\S+/m.test(head) || !/description:/.test(head)) { fail(`skill ${s} frontmatter incomplete`); continue }
  skillOk += 1
}
ok(`skills indexed: ${skillOk}/${skillDirs.length}`)
if (skillDirs.length < 25) fail('expected >= 25 skills')

// customSkillDirs 表达式存在于 skill-filesystem 行
const composition = readFileSync(compositionPath, 'utf8')
if (!/customSkillDirs:/.test(composition) || !/new URL\('skills\/', baseUrl\)/.test(composition)) {
  fail('skill-filesystem row lacks customSkillDirs baseUrl expression')
} else ok('customSkillDirs expression present')

console.log(failed === 0 ? `\nPRESET VALIDATION PASSED（schema-face: ${schemaVerdict}）` : `\nPRESET VALIDATION FAILED (${failed})`)
process.exit(failed === 0 ? 0 : 1)
