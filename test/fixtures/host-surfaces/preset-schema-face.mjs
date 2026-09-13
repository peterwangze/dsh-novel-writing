/**
 * preset-schema-face.mjs — 预设组合行 × **已装** dsh 插件 Config schema 机检（BUG-007；Check 28v 同源思路）
 *
 * 动因（一手证据）：宿主 `@deepseek-ai/dsh-persona` 0.1.5-rc.2 把 Config 收紧为 `prefix` 必填，
 * 本仓 `agent-presets/novel-writing/agent.cordis.yml` 的 persona 行仍写 `text` ⇒ 该行 config 校验失败
 * ⇒ **整棵预设挂载被否决**（不是只丢人设）：工作台「继续工作流／绑定新会话」与宿主预设切换器均报
 * `failed to apply loader entry persona (@deepseek-ai/dsh-persona): invalid config: - $.prefix missing
 * required value (at prefix)`。既有验证链（validate-preset 的行形状/模块解析、smoke、CI）**都不比较
 * 组合行与宿主真实 schema**，所以三面全绿而实机不可用。
 *
 * 本模块做什么（**用宿主自己的代码与判定规则，不复制任何 schema**）：
 *   1. 用加载器自己的 YAML 方言解析组合（`@deepseek-ai/cordis-plugin-include` 的 `entryListSchema`）；
 *   2. 用加载器自己的 `evaluate` 求值 `!!js` 节点、自己的 `interpolate` 插值 config（含 `baseUrl` 作用域）；
 *   3. 复现 `Entry._disabled` 的判定：`!!js` 节点求值（**允许抛错**——加载器自身未加保护，抛错即挂载被否决），
 *      其余按真值；group 行自身恒启用，但 group 的 `disabled` 被其子行继承（继承者不启动 ⇒ 不校验）；
 *   4. 每个会启动的行：按加载器同样的规则解析模块（相对 → 组合文件旁；包名 → 已装宿主平面；
 *      `cordis:` → 加载器内建），import 后取该模块导出的 `Config`，运行**解析出的 cordis 自己的**
 *      `resolveConfig({ Config }, config)` —— 正是启动时报错的那次调用；抛错即发现项；
 *   5. group 行经其 `config` 列表递归。
 *
 * 三态判定（fail-closed；P-04）：
 *   PASS    至少 1 个启用行被 schema 校验通过，**且** 每个未能校验的启用行都被逐行披露（coverage）；
 *   FAIL    某行 config 被拒（行 id + 模块 + schema 原文报文）/ 模块不可解析 / import 失败 /
 *           `!!js` 表达式抛错 / 组合不是合法 entry list / group 名不是 `cordis:group`；
 *   NOT_RUN 宿主平面或 oracle API 不可达，或没有任何一行真正与 schema 比对过（`checked === 0`）。
 *           NOT_RUN **不是** PASS：它披露「未验证」这一事实，不invent 一个绿色。
 *
 * 只读纪律：只读组合文件、契约/仓库文件与已装宿主包（静态 import 触发各包自身顶层求值）；**不写**
 * 任何宿主目录，不构造 Context/Fiber，不跑插件生命周期，不调用 `apply`。CLI 退出码：0 PASS / 1 FAIL / 2 NOT_RUN。
 *
 * 用法：
 *   node test/fixtures/host-surfaces/preset-schema-face.mjs                       # 包内预设 + 自动定位宿主平面
 *   node test/fixtures/host-surfaces/preset-schema-face.mjs --composition <path>  # 指定组合（如隔离实例的同步产物）
 *   node test/fixtures/host-surfaces/preset-schema-face.mjs --plane <node_modules> --require-plane
 *   node test/fixtures/host-surfaces/preset-schema-face.mjs --json
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = join(HERE, '..', '..', '..')
/** 包内预设组合（默认校验对象；`--composition` 可指向隔离实例里的同步产物）。 */
export const DEFAULT_COMPOSITION = join(REPO_ROOT, 'agent-presets', 'novel-writing', 'agent.cordis.yml')

export const VERDICT_PASS = 'PASS'
export const VERDICT_FAIL = 'FAIL'
export const VERDICT_NOT_RUN = 'NOT_RUN'
export const EXIT = { PASS: 0, FAIL: 1, NOT_RUN: 2 }

/** 发现项：任一命中 ⇒ 整体 FAIL（行级报文即证据）。 */
export const FINDING_KINDS = [
  'ROW_SHAPE', 'GROUP_NAME_UNRESOLVED', 'DISABLED_EXPR_ERROR', 'CONFIG_EXPR_ERROR',
  'MODULE_UNRESOLVED', 'IMPORT_ERROR', 'CONFIG_INVALID',
]
/** 披露项：不是发现项，**也不能计入「已校验」**（PASS 要求逐行披露它们）。 */
export const UNVERIFIED_KINDS = ['NO_SCHEMA', 'BUILTIN', 'DISABLED_INHERITED', 'DISABLED_INHERITED_UNKNOWN']
const PASS_KIND = 'PASS'

/** 宿主耦合字面量（P-10）：oracle 包与符号名 = 契约 item 5.6 登记面，新增/改名 MUST 同步契约。 */
export const ORACLE = {
  yaml: 'js-yaml',
  include: '@deepseek-ai/cordis-plugin-include',
  includeSymbol: 'entryListSchema',
  loader: '@deepseek-ai/cordis-plugin-loader',
  evaluateSymbol: 'evaluate',
  interpolateSymbol: 'interpolate',
  isJsExprSymbol: 'isJsExpr',
  cordis: '@deepseek-ai/cordis',
  resolveConfigSymbol: 'resolveConfig',
}
/** group 行的内建名（加载器内建；其余形态 = 无法核验 ⇒ 发现项）。 */
export const GROUP_NAME = 'cordis:group'

// ── 宿主平面定位（只读）─────────────────────────────────────────────────────
/**
 * 解析已装宿主平面：`NV_DSH_PLANE` 显式覆盖 → `$DSH_HOME`（隔离实例）→ `~/.dsh` 的 profiles 平面。
 * 与加载器一致地把 `createRequire` 锚在 profile 目录内（Node 的 node_modules 上溯即得真实平面）。
 * @returns {{ nodeModules: string|null, anchor: string|null, source: string, reason: string|null }}
 */
export function resolvePlane(env = process.env) {
  const explicit = (env.NV_DSH_PLANE ?? '').trim()
  if (explicit !== '') {
    const anchor = join(explicit, '__nv_preset_schema_anchor__.js')
    return { nodeModules: explicit, anchor, source: 'NV_DSH_PLANE', reason: null }
  }
  const home = (env.DSH_HOME ?? '').trim() !== '' ? env.DSH_HOME : join(env.USERPROFILE ?? env.HOME ?? '', '.dsh')
  for (const profileDir of [join(home, 'profiles', 'web'), join(home, 'profiles'), home]) {
    if (!existsSync(join(profileDir, 'package.json')) && !existsSync(join(profileDir, 'node_modules'))) continue
    const anchor = join(profileDir, 'index.js')
    try {
      const req = createRequire(anchor)
      req.resolve('@deepseek-ai/cordis/package.json')
      return { nodeModules: null, anchor, source: env.DSH_HOME !== undefined && env.DSH_HOME.trim() !== '' ? 'DSH_HOME' : '~/.dsh', reason: null }
    } catch { /* 该候选平面不含宿主闭包 ⇒ 试下一个 */ }
  }
  return { nodeModules: null, anchor: null, source: 'none', reason: '宿主平面不可达：未找到可解析 @deepseek-ai/cordis 的 profile 目录（$DSH_HOME / ~/.dsh）' }
}

/** 从平面载入 oracle（加载器方言 + 求值 + resolveConfig）——任何一项缺失即 NOT_RUN，不降级成 PASS。 */
export async function loadOracle(plane) {
  let req
  try {
    req = plane.nodeModules === null ? createRequire(plane.anchor) : createRequire(join(plane.nodeModules, '__nv_preset_schema_anchor__.js'))
  } catch (error) {
    return { ok: false, reason: `createRequire 失败：${String(error && error.message)}` }
  }
  const url = (spec) => pathToFileURL(req.resolve(spec)).href
  try {
    const yaml = await import(url(ORACLE.yaml))
    const include = await import(url(ORACLE.include))
    const loader = await import(url(ORACLE.loader))
    const cordis = await import(url(ORACLE.cordis))
    const entryListSchema = include[ORACLE.includeSymbol]
    const evaluate = loader[ORACLE.evaluateSymbol]
    const interpolate = loader[ORACLE.interpolateSymbol]
    const isJsExpr = loader[ORACLE.isJsExprSymbol]
    const resolveConfig = cordis[ORACLE.resolveConfigSymbol]
    for (const [name, value] of [[ORACLE.includeSymbol, entryListSchema], [ORACLE.evaluateSymbol, evaluate],
      [ORACLE.interpolateSymbol, interpolate], [ORACLE.isJsExprSymbol, isJsExpr],
      [ORACLE.resolveConfigSymbol, resolveConfig]]) {
      if (typeof value !== 'function' && typeof value !== 'object') {
        return { ok: false, reason: `已装宿主 API 不可用：${name} 不是可调用/可用的导出（宿主版本可能与工具不匹配）` }
      }
    }
    return {
      ok: true, req, yaml, entryListSchema, evaluate, interpolate, isJsExpr, resolveConfig,
      versions: {
        [ORACLE.cordis]: pkgVersion(req, ORACLE.cordis),
        [ORACLE.include]: pkgVersion(req, ORACLE.include),
        [ORACLE.loader]: pkgVersion(req, ORACLE.loader),
        [ORACLE.yaml]: pkgVersion(req, ORACLE.yaml),
      },
      paths: Object.fromEntries([ORACLE.cordis, ORACLE.include, ORACLE.loader, ORACLE.yaml].map((p) => [p, req.resolve(p)])),
    }
  } catch (error) {
    return { ok: false, reason: `已装宿主 API 不可达：${String((error && error.message) || error).split('\n')[0]}` }
  }
}

function pkgVersion(req, name) {
  try {
    return JSON.parse(readFileSync(req.resolve(name + '/package.json'), 'utf8')).version
  } catch { return null }
}

/** 该行模块是否导出 Config schema；有则记录其声明位置（证据：文件 + 行号）。 */
function locateSchema(modulePath, source) {
  if (typeof source !== 'string') return null
  const lines = source.split('\n')
  for (const [i, line] of lines.entries()) {
    if (/(?:^|\s)(?:const|let|var)\s+Config\s*=|Config\s*=\s*z\.object\(|static\s+Config\s*=/.test(line)) {
      return { file: modulePath, line: i + 1 }
    }
  }
  return { file: modulePath, line: null }
}

const message = (error) => (error === null || error === undefined ? String(error) : String(error.message ?? error).split('\n')[0])

// ── 行遍历（加载器判定规则的忠实复现）──────────────────────────────────────
async function walk(rows, at, ctx, entry, oracle, inheritedBy) {
  for (const [index, row] of rows.entries()) {
    const positional = at === '' ? `row ${index + 1}` : `${at} row ${index + 1}`
    const record = { row: positional, id: null, name: '', kind: '', message: '', detail: null, schema: null, version: null }
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      entry.rows.push({ ...record, kind: 'ROW_SHAPE', message: `${positional} 不是插件行（需要 name 字符串）` })
      continue
    }
    const id = typeof row.id === 'string' && row.id !== '' ? row.id : positional
    record.id = id
    const isGroup = Boolean(row.group)
    if (!isGroup && (typeof row.name !== 'string' || row.name === '')) {
      entry.rows.push({ ...record, kind: 'ROW_SHAPE', message: `${positional} 不是插件行（需要 name 字符串）` })
      continue
    }
    const name = typeof row.name === 'string' ? row.name : ''
    record.name = name
    if (!isGroup && Array.isArray(row.config)) {
      entry.rows.push({ ...record, kind: 'ROW_SHAPE', message: `${positional} 的 config 是列表但不是 group 行；加载器会把该列表当作本行 config` })
      continue
    }
    if (isGroup) {
      if (row.name !== GROUP_NAME) {
        entry.rows.push({ ...record, kind: 'GROUP_NAME_UNRESOLVED', message: `group 名必须是 "${GROUP_NAME}"（加载器内建）；实际为 ${row.name === undefined ? '（无 name）' : JSON.stringify(row.name)}` })
        continue
      }
      if (!Array.isArray(row.config)) {
        entry.rows.push({ ...record, kind: 'ROW_SHAPE', message: `group ${positional} 必须携带插件行列表` })
        continue
      }
      if (inheritedBy !== '') continue
      if (row.config.length === 0) {
        entry.rows.push({ ...record, kind: 'BUILTIN', message: 'group 内建 — 无子行，未枚举任何行' })
        continue
      }
      let groupDisabled
      try {
        groupDisabled = oracle.isJsExpr(row.disabled) ? Boolean(oracle.evaluate(ctx, row.disabled.__jsExpr)) : Boolean(row.disabled)
      } catch (error) {
        entry.rows.push({ ...record, kind: 'DISABLED_EXPR_ERROR', message: `group disabled !!js 表达式抛错：${message(error)}` })
        for (const [child, childRow] of row.config.entries()) {
          const childId = childRow && typeof childRow.id === 'string' && childRow.id !== '' ? childRow.id : `${positional} row ${child + 1}`
          entry.rows.push({ ...record, row: childId, id: childId, name: childRow && typeof childRow.name === 'string' ? childRow.name : '', kind: 'DISABLED_INHERITED_UNKNOWN', message: '无法判定是否启动：祖先 group 的 disabled 表达式抛错，挂载在任何 schema 比对前即被否决' })
        }
        continue
      }
      if (groupDisabled) {
        for (const [child, childRow] of row.config.entries()) {
          const childId = childRow && typeof childRow.id === 'string' && childRow.id !== '' ? childRow.id : `${positional} row ${child + 1}`
          entry.rows.push({ ...record, row: childId, id: childId, name: childRow && typeof childRow.name === 'string' ? childRow.name : '', kind: 'DISABLED_INHERITED', message: `未启动 — 继承祖先 group "${id}" 的 disabled` })
        }
        continue
      }
      await walk(row.config, positional, ctx, entry, oracle, '')
      entry.rows.push({ ...record, kind: 'BUILTIN', message: `group 内建 — 枚举 ${row.config.length} 个子行` })
      continue
    }
    if (inheritedBy !== '') {
      entry.rows.push({ ...record, kind: 'DISABLED_INHERITED', message: `未启动 — 继承祖先 group "${inheritedBy}" 的 disabled` })
      continue
    }
    let disabled
    try {
      disabled = oracle.isJsExpr(row.disabled) ? Boolean(oracle.evaluate(ctx, row.disabled.__jsExpr)) : Boolean(row.disabled)
    } catch (error) {
      entry.rows.push({ ...record, kind: 'DISABLED_EXPR_ERROR', message: `disabled !!js 表达式抛错：${message(error)}` })
      continue
    }
    if (disabled) {
      entry.rows.push({ ...record, kind: 'DISABLED_INHERITED', message: '本行 disabled=true（平台分流），本次核对未启动' })
      continue
    }
    entry.enabled += 1
    let config
    try {
      config = oracle.interpolate(ctx, row.config)
    } catch (error) {
      entry.rows.push({ ...record, kind: 'CONFIG_EXPR_ERROR', message: `config !!js 表达式抛错：${message(error)}` })
      continue
    }
    if (name.startsWith('cordis:')) {
      entry.rows.push({ ...record, kind: 'BUILTIN', message: '加载器内建 — 无模块可 import，无 schema 可比对' })
      continue
    }
    let target
    if (name.startsWith('file:') || isAbsolute(name)) target = name.startsWith('file:') ? name : pathToFileURL(name).href
    else if (name.startsWith('.')) target = new URL(name, ctx.baseUrl).href
    else {
      try { target = pathToFileURL(oracle.req.resolve(name)).href } catch (error) {
        entry.rows.push({ ...record, kind: 'MODULE_UNRESOLVED', message: `无法从已装宿主平面解析：${message(error)}` })
        continue
      }
    }
    let exports
    try { exports = unwrapExports(await import(target)) } catch (error) {
      entry.rows.push({ ...record, kind: 'IMPORT_ERROR', message: `import 失败 ${target}：${message(error)}` })
      continue
    }
    const modulePath = fileURLToPath(target)
    const version = pkgVersionOfFile(oracle.req, target)
    record.version = version
    const schema = exports && exports.Config
    if (!schema) {
      entry.rows.push({ ...record, kind: 'NO_SCHEMA', message: '该模块不导出 Config schema——本工具无法校验此行的 config（不对加载器随后如何处理它作任何断言）' })
      continue
    }
    record.schema = locateSchema(modulePath, readSource(modulePath))
    entry.checked += 1
    try {
      oracle.resolveConfig({ Config: schema }, config)
      entry.rows.push({ ...record, kind: PASS_KIND, message: '' })
    } catch (error) {
      let issues = []
      try {
        const standard = schema['~standard']
        const result = typeof standard?.validate === 'function' ? standard.validate(config) : undefined
        if (result && Array.isArray(result.issues)) issues = result.issues.map((issue) => (issue && issue.message) || String(issue))
      } catch { issues = [] }
      const full = String(error.message ?? error)
      entry.rows.push({ ...record, kind: 'CONFIG_INVALID', message: issues.length > 0 ? issues.join('; ') : full.split('\n').join(' '), detail: full })
    }
  }
}

const unwrapExports = (exports) => {
  if (exports === null || exports === undefined) return exports
  let value = exports.default !== undefined && exports.default !== null ? exports.default : exports
  if (value && value.__esModule) value = value.default !== undefined && value.default !== null ? value.default : value
  return value
}

function pkgVersionOfFile(req, fileUrl) {
  try {
    let dir = dirname(fileURLToPath(fileUrl))
    for (let i = 0; i < 6; i += 1) {
      const candidate = join(dir, 'package.json')
      if (existsSync(candidate)) return JSON.parse(readFileSync(candidate, 'utf8')).version
      dir = dirname(dir)
    }
  } catch { /* 版本仅为证据字段，取不到记 null */ }
  return null
}

const sourceCache = new Map()
function readSource(path) {
  if (!sourceCache.has(path)) {
    try { sourceCache.set(path, readFileSync(path, 'utf8')) } catch { sourceCache.set(path, null) }
  }
  return sourceCache.get(path)
}

/**
 * 校验一个组合文件：解析 → 逐行核对 → 三态判定。
 * @param {{ composition?: string, env?: NodeJS.ProcessEnv }} [options]
 * @returns {Promise<object>} 报告（verdict/rows/coverage/oracle/plane/…）
 */
export async function checkComposition(options = {}) {
  const composition = options.composition ?? DEFAULT_COMPOSITION
  const plane = resolvePlane(options.env ?? process.env)
  const base = { tool: 'preset-schema-face', composition, plane: { source: plane.source, nodeModules: plane.nodeModules, anchor: plane.anchor }, oracle: null, rows: [], coverage: null }
  if (!existsSync(composition)) return { ...base, verdict: VERDICT_NOT_RUN, reason: `组合文件不存在：${composition}` }
  if (plane.reason !== null) return { ...base, verdict: VERDICT_NOT_RUN, reason: plane.reason }
  const oracle = await loadOracle(plane)
  if (oracle.ok !== true) return { ...base, verdict: VERDICT_NOT_RUN, reason: oracle.reason }
  base.oracle = { versions: oracle.versions, paths: oracle.paths }
  let rows
  try {
    rows = oracle.yaml.load(readFileSync(composition, 'utf8'), { schema: oracle.entryListSchema })
  } catch (error) {
    return { ...base, verdict: VERDICT_FAIL, reason: `组合不是合法 entry list（加载器方言）：${message(error)}` }
  }
  if (!Array.isArray(rows)) return { ...base, verdict: VERDICT_FAIL, reason: '组合必须是顶层插件行列表' }
  const entry = { rows: [], enabled: 0, checked: 0 }
  const ctx = { baseUrl: pathToFileURL(composition).href, process, console }
  await walk(rows, '', ctx, entry, oracle, '')
  const findings = entry.rows.filter((row) => FINDING_KINDS.includes(row.kind))
  const unverified = entry.rows.filter((row) => UNVERIFIED_KINDS.includes(row.kind))
  const coverage = {
    total: entry.rows.length,
    enabled: entry.enabled,
    checked: entry.checked,
    findings: findings.length,
    unverified: unverified.length,
  }
  let verdict = VERDICT_PASS
  let reason = null
  if (findings.length > 0) {
    verdict = VERDICT_FAIL
    reason = `${findings.length} 个发现项（首个：行 "${findings[0].id}" ${findings[0].kind}：${findings[0].message}）`
  } else if (entry.checked === 0) {
    verdict = VERDICT_NOT_RUN
    reason = '没有任何启用行与已装宿主 schema 比对过（checked=0）——不能判 PASS'
  }
  return { ...base, verdict, reason, rows: entry.rows, coverage }
}

/** 人读逐行表（行 id / 包名 / 已装版本 / 判定 / 证据）——交付物「逐行核验表」即本函数的输出。 */
export function formatRows(report) {
  const lines = []
  const mark = (kind) => (FINDING_KINDS.includes(kind) ? '✗' : kind === PASS_KIND ? '✓' : '·')
  for (const row of report.rows) {
    const evidence = row.schema !== null && row.schema !== undefined
      ? `evidence=${row.schema.file}${row.schema.line === null ? '' : ':' + row.schema.line}`
      : row.kind === 'CONFIG_INVALID' ? 'evidence=' + (report.oracle?.paths?.[ORACLE.cordis] ?? '?') : 'evidence=-'
    lines.push(`${mark(row.kind)} ${row.kind.padEnd(24)} ${String(row.id).padEnd(24)} ${String(row.name).padEnd(48)} ${row.version ?? '-'} ${row.message}${row.message === '' ? '' : ' | '}${evidence}`)
  }
  return lines
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { composition: DEFAULT_COMPOSITION, json: false, requirePlane: false, table: true }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--json') opts.json = true
    else if (a === '--require-plane') opts.requirePlane = true
    else if (a === '--no-table') opts.table = false
    else if (a === '--companion' || a === '--composition') opts.composition = argv[++i]
    else if (a === '--help' || a === '-h') opts.help = true
    else { console.error('[preset-schema-face] 未知参数：' + a); process.exit(2) }
  }
  return opts
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help === true) {
    console.log('用法：node test/fixtures/host-surfaces/preset-schema-face.mjs [--composition <path>] [--plane <node_modules>] [--json] [--require-plane] [--no-table]')
    process.exit(EXIT.PASS)
  }
  const report = await checkComposition({ composition: opts.composition })
  if (opts.json === true) console.log(JSON.stringify(report, null, 2))
  else {
    console.log(`[preset-schema-face] 组合：${report.composition}`)
    console.log(`  宿主平面：${report.plane.source}${report.plane.nodeModules === null ? '' : ' (' + report.plane.nodeModules + ')'}；oracle 版本：${JSON.stringify(report.oracle?.versions ?? null)}`)
    if (opts.table === true && report.rows.length > 0) {
      console.log('  ── 逐行核验（kind / id / name / 已装版本 / 报文 / 证据）──')
      for (const line of formatRows(report)) console.log('  ' + line)
    }
    console.log(`  判定：${report.verdict}${report.reason === null ? '' : ' — ' + report.reason}`)
    if (report.coverage !== null) {
      console.log(`  coverage：启用行 ${report.coverage.enabled}；与 schema 比对 ${report.coverage.checked}；发现项 ${report.coverage.findings}；未校验（已披露）${report.coverage.unverified}`)
    }
  }
  if (report.verdict === VERDICT_PASS) process.exit(EXIT.PASS)
  if (report.verdict === VERDICT_FAIL) process.exit(EXIT.FAIL)
  // NOT_RUN：默认不阻断（披露为事实，绝不渲染成 PASS）；--require-plane 面（环境保证有宿主平面）fail-closed。
  console.error('[preset-schema-face] NOT_RUN：' + report.reason)
  process.exit(opts.requirePlane ? EXIT.FAIL : EXIT.NOT_RUN)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
