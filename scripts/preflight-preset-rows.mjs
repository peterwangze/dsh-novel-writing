#!/usr/bin/env node
/**
 * scripts/preflight-preset-rows.mjs — 预设声明行级预检 CLI（COMPAT-021 核心交付；docs/COMPATIBILITY.md §7）
 *
 * 回答一个问题：**当前「宿主平面 × 预设声明源」组合是否自洽**——在宿主 agentPresets.register
 * 激活之前，把会让整棵预设挂载被否决的行（缺包 / exports 不匹配 / config schema 不合法 /
 * 双源漂移 / 未知代际）逐行找出来，带 row id / 包名 / 检查点 / 修复建议（§4 目标 3.6 失败可归因）。
 *
 * 数据与判定分层：
 *   · 代际清单（单一事实源）= lib/host-compat/generation-manifest.mjs（GENERATIONS /
 *     GENERATION_VARIANT / GENERATION_DROPPED / detectGeneration——纯数据 + 纯函数）；
 *   · 行投影 / 双源对账 = lib/host-compat/preset-projection.mjs（projectRows / reconcileDualSources）；
 *   · 本脚本只做**平面探测**（哪个宿主闭包在场）+ 检查编排 + 输出。
 *
 * 每行检查顺序（§7.2，顺序即语义）：形状 → 代际处置（只允许清单声明的差异）→ 包存在性（记录
 * 命中通道 profile-resolve / install-anchor / fixture / repo-local）→ **exports 解析**（读包
 * package.json 的 exports 映射判定，不靠 require.resolve「碰巧成功」）→ config schema（无 schema
 * 标 NO_SCHEMA，不伪造 PASS）→ dual 对账（0.1.x 源与 0.2.x patch 行差必须与 manifest 一致）。
 * 行状态 PASS / KNOWN_DROP / KNOWN_VARIANT / WARN / FAIL / NOT_RUN——**NOT_RUN 绝不渲染成 PASS**
 * （BUG-007 三态自洽口径）。
 *
 * C3 修复（平面误判，RISK-C3）：平面判定绑定 **profile 宿主平面**——先解析
 * `<profile>/node_modules/@deepseek-ai/dsh/package.json`（精确路径 → profile 锚点 node_modules
 * 上溯，与宿主 loader baseUrl=profile 同语义）；全局 npm 闭包（`npm root -g`）只作 **fallback**
 * 且标注通道。两平面指向不同代际 ⇒ `mixedPlane:true` ⇒ WARN；涉及 legacy-only 行时 **fail-closed**
 * （该行判 FAIL，不许静默跳过）——「不得仅凭全局 npm 安装的 0.2.1 包把 0.1.x profile 误判为 0.2.x」。
 *
 * 退出码：0 = 全过或仅已知 variant/dropped 披露；1 = 硬失败（缺包 / exports 不匹配 / schema 不合法 /
 * 未知代际 / dual drift / mixed-plane fail-closed；`--strict` 下 mixedPlane 亦失败）；2 = 用法错误；
 * 3 = 环境不可判定（无 profile 且无 fixture）。unknown 代际恒 fail-closed（不投影、不默放）。
 *
 * 用法：
 *   node scripts/preflight-preset-rows.mjs [--patch <path>] [--legacy <path>] [--profile <dir>]
 *     [--generation <id>] [--fixture <dir>] [--json] [--explain <rowId>] [--strict] [--no-color]
 *     [--global-root <dir>]（诊断注入：覆盖 npm root -g 全局闭包；测试/混合平面排查用）
 * 示例（§8.2）：
 *   node scripts/preflight-preset-rows.mjs --json
 *   node scripts/preflight-preset-rows.mjs --explain tool-subagent-list-agents
 *   node scripts/preflight-preset-rows.mjs --fixture test/fixtures/host-generations/decl-0.2.2
 *   node scripts/preflight-preset-rows.mjs --fixture test/fixtures/host-generations/decl-0.2.2 --generation unknown --strict
 *
 * 只读纪律：只读组合文件、仓库文件与已装宿主包元数据/入口模块（静态 import 触发各包自身顶层求值，
 * 与 preset-schema-face 同口径）；不写任何宿主目录、不启动服务、不触碰端口。输出不含 token/密钥
 * （BC-05：evidence 只放路径 / 包版本 / 检查点）。日志前缀 `[nv-compat]`。
 */
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import yamlMod from 'js-yaml'
import {
  GENERATIONS, GENERATION_IDS, GENERATION_VARIANT, GENERATION_DROPPED, HOST_PACKAGES, detectGeneration,
} from '../lib/host-compat/generation-manifest.mjs'
import { dispositionFor, reconcileDualSources } from '../lib/host-compat/preset-projection.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PATCH_DEFAULT = join(REPO_ROOT, 'cordis.patch.yml')
const LEGACY_DEFAULT = join(REPO_ROOT, 'agent-presets', 'novel-writing', 'agent.cordis.yml')
const EXIT = { OK: 0, FAIL: 1, USAGE: 2, ENV: 3 }
const GROUP_NAME = 'cordis:group' // 加载器内建 group 名（与 preset-schema-face 同字面量）
const SCHEMA_VERSION = 1

const yaml = yamlMod.default ?? yamlMod
/** 加载器方言（离线可构造）：`!!js` 标签按 preset-schema-face/smoke 同款降为 `{ __jsExpr }` 数据。 */
const JS_EXPR_TYPE = new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: (data) => ({ __jsExpr: data }) })
const ENTRY_SCHEMA = yaml.DEFAULT_SCHEMA.extend([JS_EXPR_TYPE])

// ── 用法与参数 ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { patch: PATCH_DEFAULT, legacy: LEGACY_DEFAULT, profile: null, generation: null, fixture: null, globalRoot: null, json: false, explain: null, strict: false, color: true, patchExplicit: false, legacyExplicit: false }
  const need = (flag) => { const v = argv.shift(); if (v === undefined || v.startsWith('--')) die(`${flag} 需要一个值`); return v }
  let a
  while ((a = argv.shift()) !== undefined) {
    if (a === '--patch') { opts.patch = resolve(need('--patch')); opts.patchExplicit = true }
    else if (a === '--legacy') { opts.legacy = resolve(need('--legacy')); opts.legacyExplicit = true }
    else if (a === '--profile') opts.profile = resolve(need('--profile'))
    else if (a === '--generation') opts.generation = need('--generation')
    else if (a === '--fixture') opts.fixture = resolve(need('--fixture'))
    else if (a === '--global-root') opts.globalRoot = resolve(need('--global-root'))
    else if (a === '--json') opts.json = true
    else if (a === '--explain') opts.explain = need('--explain')
    else if (a === '--strict') opts.strict = true
    else if (a === '--no-color') opts.color = false
    else if (a === '--help' || a === '-h') { usage(); process.exit(EXIT.OK) }
    else die(`未知参数：${a}`)
  }
  if (opts.generation !== null && !GENERATION_IDS.includes(opts.generation)) {
    die(`--generation 非法：${opts.generation}（合法值：${GENERATION_IDS.join(', ')}）`)
  }
  if (opts.fixture !== null && !existsSync(join(opts.fixture, 'node_modules'))) {
    die(`--fixture 目录缺少伪 node_modules 平面：${opts.fixture}`)
  }
  if (opts.globalRoot !== null && !existsSync(join(opts.globalRoot, '@deepseek-ai'))) {
    die(`--global-root 目录缺少 @deepseek-ai 闭包：${opts.globalRoot}`)
  }
  // 离线模式：fixture 自带最小行集（rows.patch.yml / rows.legacy.yml）；显式 --patch/--legacy 仍可覆盖
  // （negative 变体构造用）。真实仓内源 + fixture 平面的组合对诊断也有意义（平面与源解耦）。
  if (opts.fixture !== null) {
    if (!opts.patchExplicit) opts.patch = join(opts.fixture, 'rows.patch.yml')
    if (!opts.legacyExplicit) opts.legacy = join(opts.fixture, 'rows.legacy.yml')
  }
  for (const [flag, path] of [['--patch', opts.patch], ['--legacy', opts.legacy]]) {
    if (!existsSync(path)) die(`${flag} 文件不存在：${path}`)
  }
  if (opts.profile !== null && !existsSync(opts.profile)) die(`--profile 目录不存在：${opts.profile}`)
  return opts
}
function usage() {
  console.log('用法：node scripts/preflight-preset-rows.mjs [--patch <path>] [--legacy <path>] [--profile <dir>] [--generation <id>] [--fixture <dir>] [--json] [--explain <rowId>] [--strict] [--no-color]')
  console.log('  诊断注入（R1 F1，测试/排查用）：[--global-root <dir>]——覆盖 npm root -g 全局闭包（真平面模式生效；报告 plane.globalRoot 披露实际根）')
}
function die(message) {
  console.error(`[nv-compat] 用法错误（exit 2）：${message}`)
  usage()
  process.exit(EXIT.USAGE)
}

const note = (message) => `[nv-compat] ${message}`

// ── 源加载（bundle patch（真 0.2.x 形态）或行列表（fixture 形态））────────────
function loadSource(path) {
  let parsed
  try {
    parsed = yaml.load(readFileSync(path, 'utf8'), { schema: ENTRY_SCHEMA })
  } catch (error) {
    die(`源文件不是合法 YAML（加载器方言）：${path}（${String(error.message).split('\n')[0]}）`)
  }
  if (!Array.isArray(parsed)) die(`源文件必须是顶层行列表 / patch 行列表：${path}`)
  const isPatchEnvelope = parsed.some((row) => row !== null && typeof row === 'object' && Array.isArray(row.insert))
  if (isPatchEnvelope) {
    const rows = parsed.flatMap((patch) => (patch && Array.isArray(patch.insert)) ? patch.insert : [])
    const declaration = rows.find((row) => row && row.name === HOST_PACKAGES.declaration)
    if (declaration === undefined) die(`bundle patch 内未找到声明行（name: ${HOST_PACKAGES.declaration}）：${path}`)
    if (!Array.isArray(declaration.config?.plugins)) die(`声明行 config.plugins 不是行列表：${path}`)
    return { path, shape: 'bundle-patch', structuralRows: rows.filter((row) => row !== declaration), plugins: declaration.config.plugins, declaration }
  }
  return { path, shape: 'row-list', structuralRows: [], plugins: parsed, declaration: null }
}

// ── 宿主平面探测（只读；C3 绑定 profile 平面，全局闭包仅 fallback）────────────
function readPkgJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

function npmGlobalRoot() {
  try {
    const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim()
    return root === '' ? null : root
  } catch { return null }
}

/** 全局闭包根：--global-root 覆盖优先（诊断/测试注入——R1 F1；输出经 plane.globalRoot 披露），默认 `npm root -g`。 */
function resolveGlobalRoot(opts) {
  return opts.globalRoot !== null ? opts.globalRoot : npmGlobalRoot()
}

/** 声明代标记包是否在**给定 dsh 包闭包**内（嵌套 node_modules / 平面锚点；绝不跨平面借证——C3）。 */
function probeAgentPreset(dshDir, extraAnchorDir = null) {
  const nested = join(dshDir, 'node_modules', '@deepseek-ai', 'dsh-agent-preset', 'package.json')
  if (existsSync(nested)) return true
  try {
    createRequire(join(dshDir, 'node_modules', '__nv_preflight_anchor__.js')).resolve(HOST_PACKAGES.declaration + '/package.json')
    return true
  } catch { /* 嵌套闭包不可达 → 平面锚点 */ }
  if (extraAnchorDir !== null) {
    try {
      createRequire(join(extraAnchorDir, '__nv_preflight_anchor__.js')).resolve(HOST_PACKAGES.declaration + '/package.json')
      return true
    } catch { /* 平面直连亦不可达 */ }
  }
  return false
}

function planeFromDshPackageJson(pkgJsonPath, channel, via, profileDir) {
  const pkg = readPkgJson(pkgJsonPath)
  if (pkg === null || typeof pkg.version !== 'string') return null
  const dshDir = dirname(pkgJsonPath)
  // fixture 伪平面：@deepseek-ai/* 全部是 dsh 的**同层兄弟**（无嵌套闭包）⇒ 探同层；
  // 真平面：探 dsh 嵌套闭包（安装锚点真相）+ 平面锚点（C3：绝不跨平面借证）。
  const hasAgentPreset = channel === 'fixture'
    ? existsSync(join(dirname(dshDir), 'dsh-agent-preset', 'package.json'))
    : probeAgentPreset(dshDir, channel === 'profile-resolve' ? profileDir : null)
  return {
    channel, via, profile: profileDir ?? null,
    dshDir, hostVersion: pkg.version,
    hasAgentPreset,
  }
}

/** profile 自动探测（--profile 显式优先；$DSH_HOME → ~/.dsh 的候选序，与 preset-schema-face 同源）。 */
function autoDetectProfile() {
  const home = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  const candidates = [join(home, 'profiles', 'web'), join(home, 'profiles'), home]
  for (const dir of candidates) {
    if (existsSync(join(dir, 'package.json')) || existsSync(join(dir, 'node_modules'))) return dir
  }
  return null
}

function detectPlane(opts) {
  // §8.3 故障注入（仅测试环境）：NV_COMPAT_PLANE=fixture|profile|install-anchor 约束可用通道；
  // 未知值忽略（生产安全）；生效时输出标注 injected（不得当成真实证据）。
  const planeEnv = typeof process.env.NV_COMPAT_PLANE === 'string' ? process.env.NV_COMPAT_PLANE.trim() : ''
  const channelConstraint = ['fixture', 'profile', 'install-anchor'].includes(planeEnv) ? planeEnv : null
  opts.channelConstraint = channelConstraint
  opts.injected = channelConstraint !== null
  if (opts.fixture !== null) {
    const pkgPath = join(opts.fixture, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
    const plane = planeFromDshPackageJson(pkgPath, 'fixture', 'fixture-pseudo-node-modules', opts.fixture)
    if (plane === null) die(`fixture 缺少伪宿主包：${pkgPath}`)
    return { primary: plane, secondary: null, globalRoot: null, profileProbe: opts.fixture }
  }
  const profileDir = opts.profile ?? autoDetectProfile()
  const globalRoot = resolveGlobalRoot(opts) // --global-root 覆盖优先（诊断注入；报告经 plane.globalRoot 披露实际根）
  const probes = []
  if (profileDir !== null && channelConstraint !== 'install-anchor') {
    // ① C3 主通道：profile 宿主平面（精确路径 → profile 锚点上溯，= 宿主 loader 的解析语义）
    const exact = join(profileDir, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
    if (existsSync(exact)) {
      const plane = planeFromDshPackageJson(exact, 'profile-resolve', 'profile-exact-node-modules', profileDir)
      if (plane !== null) probes.push(plane)
    }
    if (probes.length === 0) {
      try {
        const resolved = createRequire(join(profileDir, '__nv_preflight_anchor__.js')).resolve('@deepseek-ai/dsh/package.json')
        const plane = planeFromDshPackageJson(resolved, 'profile-resolve', 'profile-anchor-walkup', profileDir)
        if (plane !== null) probes.push(plane)
      } catch { /* profile 平面不可达 → 落安装锚点 fallback（标注通道） */ }
    }
  }
  if (probes.length === 0 && channelConstraint !== 'profile') {
    // ② fallback：npm 全局安装闭包（仅当 profile 平面不可达；通道必须标注 install-anchor；
    //    注入根成为主平面时 via 同样标 global-root-override——注入不得冒充自然根，R2 N1）
    if (globalRoot !== null) {
      const plane = planeFromDshPackageJson(join(globalRoot, '@deepseek-ai', 'dsh', 'package.json'), 'install-anchor', opts.globalRoot !== null ? 'global-root-override' : 'npm-root-g', null)
      if (plane !== null) probes.push(plane)
    }
  }
  if (probes.length === 0) return { primary: null, secondary: null, globalRoot, profileProbe: profileDir }
  const primary = probes[0]
  // 混合平面探测（C3）：主通道为 profile 时，独立探测全局闭包代际作对照（只读、只作 WARN/fail-closed 依据）
  let secondary = null
  if (primary.channel === 'profile-resolve' && channelConstraint === null && globalRoot !== null) {
    const globalPkg = join(globalRoot, '@deepseek-ai', 'dsh', 'package.json')
    if (existsSync(globalPkg)) {
      const pkg = readPkgJson(globalPkg)
      if (pkg !== null && typeof pkg.version === 'string') {
        secondary = {
          channel: 'install-anchor', via: opts.globalRoot !== null ? 'global-root-override' : 'npm-root-g', profile: null,
          dshDir: dirname(globalPkg), hostVersion: pkg.version,
          hasAgentPreset: probeAgentPreset(dirname(globalPkg), null),
        }
      }
    }
  }
  return { primary, secondary, globalRoot, profileProbe: profileDir }
}

// ── 包存在性 + exports 解析（读 package.json exports 映射，不靠 require.resolve 碰巧成功）──
function splitSpec(name) {
  const parts = name.split('/')
  if (name.startsWith('@')) return [parts.slice(0, 2).join('/'), parts.slice(2).join('/') || null]
  return [parts[0], parts.slice(1).join('/') || null]
}

/** 条件对象取值（Node exports 条件解析的检查用子集：import → require → node → default）。 */
function pickCondition(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) { const hit = pickCondition(item); if (hit !== null) return hit }
    return null
  }
  if (value !== null && typeof value === 'object') {
    for (const key of ['import', 'require', 'node', 'default']) {
      if (value[key] !== undefined) { const hit = pickCondition(value[key]); if (hit !== null) return hit }
    }
  }
  return null
}

/**
 * exports 映射匹配（检查用子集：精确键 + 单 `*` 模式最长前缀；非完整 Node 解析器——足够回答
 * 「该子路径是否被 exports 允许」，这正是 ERR_PACKAGE_PATH_NOT_EXPORTED 的判定面）。
 * @returns {{ ok: true, target: string|null, via: string } | { ok: false, code: 'ERR_PACKAGE_PATH_NOT_EXPORTED', exportsKeys: string[] }}
 */
function matchExports(pkgJson, subpath) {
  const exportsMap = pkgJson.exports
  if (exportsMap === undefined || exportsMap === null) {
    return { ok: true, target: subpath === '.' ? (pkgJson.main ?? 'index.js') : null, via: 'no-exports-legacy' }
  }
  if (typeof exportsMap === 'string') {
    if (subpath === '.') return { ok: true, target: exportsMap, via: 'exports-string' }
    return { ok: false, code: 'ERR_PACKAGE_PATH_NOT_EXPORTED', exportsKeys: ['.'] }
  }
  const keys = Object.keys(exportsMap)
  const isSubpathMap = keys.includes('.') || keys.some((k) => k.startsWith('./'))
  if (!isSubpathMap) {
    if (subpath === '.') {
      const target = pickCondition(exportsMap)
      if (target !== null) return { ok: true, target, via: 'root-conditions' }
    }
    return { ok: false, code: 'ERR_PACKAGE_PATH_NOT_EXPORTED', exportsKeys: keys }
  }
  if (exportsMap[subpath] !== undefined) {
    const target = pickCondition(exportsMap[subpath])
    if (target !== null) return { ok: true, target, via: 'exact' }
    return { ok: false, code: 'ERR_PACKAGE_PATH_NOT_EXPORTED', exportsKeys: keys }
  }
  let best = null
  for (const key of keys) {
    const star = key.indexOf('*')
    if (star < 0) continue
    const prefix = key.slice(0, star)
    const suffix = key.slice(star + 1)
    if (subpath.startsWith(prefix) && subpath.endsWith(suffix) && subpath.length >= prefix.length + suffix.length) {
      if (best === null || prefix.length > best.prefix.length) best = { key, prefix, suffix }
    }
  }
  if (best !== null) {
    const matched = pickCondition(exportsMap[best.key])
    if (matched !== null) {
      const remainder = subpath.slice(best.prefix.length, subpath.length - best.suffix.length)
      return { ok: true, target: matched.replace('*', remainder), via: `pattern:${best.key}` }
    }
  }
  return { ok: false, code: 'ERR_PACKAGE_PATH_NOT_EXPORTED', exportsKeys: keys }
}

/** 解析行包根目录（fixture 直查伪 node_modules；真平面按嵌套闭包 → 平面锚点 → 全局闭包 fallback）。 */
function resolvePackage(name, ctx) {
  const [pkgName] = splitSpec(name)
  if (pkgName === 'dsh-novel-writing') {
    const pkg = readPkgJson(join(REPO_ROOT, 'package.json'))
    return { channel: 'repo-local', pkgDir: REPO_ROOT, pkg, via: 'repo-root' }
  }
  if (ctx.fixture !== null) {
    const pkgPathParts = splitSpec(name)[0].split('/')
    const pkgDir = join(ctx.fixture, 'node_modules', ...pkgPathParts)
    const pkg = readPkgJson(join(pkgDir, 'package.json'))
    return pkg === null ? null : { channel: 'fixture', pkgDir, pkg, via: 'fixture-pseudo-node-modules' }
  }
  const plane = ctx.plane
  const attempts = []
  attempts.push(['plane-closure', () => {
    const resolved = createRequire(join(plane.dshDir, 'node_modules', '__nv_preflight_row_anchor__.js')).resolve(pkgName + '/package.json')
    return { pkgDir: dirname(resolved), via: 'plane-closure-resolve' }
  }])
  attempts.push(['plane-closure-entry', () => {
    const entry = createRequire(join(plane.dshDir, 'node_modules', '__nv_preflight_row_anchor__.js')).resolve(pkgName)
    return { pkgDir: findPkgDirOf(dirname(entry), pkgName), via: 'plane-closure-entry-walkup' }
  }])
  if (plane.profile !== null) {
    attempts.push(['profile-anchor', () => {
      const resolved = createRequire(join(plane.profile, '__nv_preflight_row_anchor__.js')).resolve(pkgName + '/package.json')
      return { pkgDir: dirname(resolved), via: 'profile-anchor-resolve' }
    }])
  }
  if (ctx.globalRoot !== null) {
    attempts.push(['install-anchor', () => {
      const parts = pkgName.startsWith('@') ? pkgName.split('/').slice(1) : pkgName.split('/')
      const pkgDir = join(ctx.globalRoot, '@deepseek-ai', 'dsh', 'node_modules', ...parts)
      if (!existsSync(join(pkgDir, 'package.json'))) throw new Error('not found')
      return { pkgDir, via: 'npm-root-g-closure' }
    }])
  }
  for (const [label, attempt] of attempts) {
    try {
      const hit = attempt()
      if (hit === null || hit.pkgDir === null) continue
      const pkg = readPkgJson(join(hit.pkgDir, 'package.json'))
      if (pkg !== null) return { channel: label === 'install-anchor' ? 'install-anchor' : plane.channel, pkgDir: hit.pkgDir, pkg, via: hit.via }
    } catch { /* 该通道不可达 → 下一通道 */ }
  }
  return null
}

function findPkgDirOf(dir, pkgName) {
  let cur = dir
  for (let i = 0; i < 8; i += 1) {
    const pkg = readPkgJson(join(cur, 'package.json'))
    if (pkg !== null && pkg.name === pkgName) return cur
    const parent = dirname(cur)
    if (parent === cur) return null
    cur = parent
  }
  return null
}

// ── !!js 求值（仓库自控文件；与宿主 loader 同信任域——loader 自身就求值这些表达式）──
function evaluateJsExpr(expr, baseUrl) {
  const fn = new Function('process', 'console', 'baseUrl', `"use strict"; return (${expr})`)
  return fn(process, console, baseUrl)
}
function interpolateConfig(value, baseUrl) {
  if (value !== null && typeof value === 'object') {
    if (!Array.isArray(value) && typeof value.__jsExpr === 'string') return evaluateJsExpr(value.__jsExpr, baseUrl)
    if (Array.isArray(value)) return value.map((v) => interpolateConfig(v, baseUrl))
    const out = {}
    for (const key of Object.keys(value)) out[key] = interpolateConfig(value[key], baseUrl)
    return out
  }
  return value
}

// ── schema 检查（真平面：import 入口模块取 Config + 平面 cordis resolveConfig；fixture → NOT_RUN）──
const moduleCache = new Map()
async function importModuleOnce(fileUrl) {
  if (!moduleCache.has(fileUrl)) {
    moduleCache.set(fileUrl, await import(fileUrl).then((m) => m, (error) => ({ __error: error })))
  }
  return moduleCache.get(fileUrl)
}
let resolveConfigFn
async function loadResolveConfig(ctx) {
  if (ctx.fixture !== null) return null
  if (resolveConfigFn !== undefined) return resolveConfigFn
  try {
    const req = createRequire(join(ctx.plane.dshDir, 'node_modules', '__nv_preflight_cordis_anchor__.js'))
    const mod = await import(pathToFileURL(req.resolve('@deepseek-ai/cordis')).href)
    resolveConfigFn = typeof mod.resolveConfig === 'function' ? mod.resolveConfig : null
  } catch { resolveConfigFn = null }
  return resolveConfigFn
}
const unwrapExports = (exports) => {
  if (exports === null || exports === undefined) return exports
  let value = exports.default !== undefined && exports.default !== null ? exports.default : exports
  if (value && value.__esModule) value = value.default !== undefined && value.default !== null ? value.default : value
  return value
}

// ── 主流程 ───────────────────────────────────────────────────────────────────
const colorOf = (status, use) => {
  if (!use) return (s) => s
  const map = { PASS: '\x1b[32m', FAIL: '\x1b[31m', WARN: '\x1b[33m', KNOWN_DROP: '\x1b[36m', KNOWN_VARIANT: '\x1b[36m', NOT_RUN: '\x1b[90m' }
  return (s) => (map[status] ?? '') + s + '\x1b[0m'
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const useColor = opts.color === true && opts.json !== true && process.stdout.isTTY === true
  const compatRunId = 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
  const patchSource = loadSource(opts.patch)
  const legacySource = loadSource(opts.legacy)

  // ── --explain：<rowId> 在各代际的处置（纯 manifest + 源在场性；无需平面）─────
  if (opts.explain !== null) {
    return explainMode(opts, { patchSource, legacySource, compatRunId, useColor })
  }

  const { primary, secondary, globalRoot, profileProbe } = detectPlane(opts)
  if (primary === null) {
    const reason = opts.fixture === null
      ? `环境不可判定：未找到可用宿主平面（profile 探测=${profileProbe ?? '无'}；npm 全局闭包=${globalRoot ?? '无'}）。提供 --profile <dir> 或 --fixture <dir>，或设置 $DSH_HOME`
      : '环境不可判定（fixture 平面缺宿主包）'
    const report = { schemaVersion: SCHEMA_VERSION, compatRunId, ok: false, verdict: 'NOT_RUN', reason, rows: [], summary: { total: 0, pass: 0, knownDrop: 0, knownVariant: 0, warn: 0, fail: 0, notRun: 0 }, dual: { status: 'NOT_RUN', problems: 0 }, errors: [{ code: 'ENV_UNDECIDABLE', message: reason, fix: '用 --fixture <dir> 离线跑代际 fixture，或 --profile 指向含宿主闭包的 profile 目录' }] }
    if (opts.json) console.log(JSON.stringify(report, null, 2))
    else console.error(note(`NOT_RUN（exit 3）：${reason}`))
    process.exit(EXIT.ENV)
  }

  const detected = detectGeneration({ hostVersion: primary.hostVersion, hasAgentPreset: primary.hasAgentPreset })
  const secondaryGeneration = secondary === null ? null : detectGeneration({ hostVersion: secondary.hostVersion, hasAgentPreset: secondary.hasAgentPreset })
  const mixedPlane = secondaryGeneration !== null && secondaryGeneration !== detected && detected !== 'unknown' && secondaryGeneration !== 'unknown'
  // mixedPlane 且两代对 legacy-only 行处置相反 ⇒ 该行 fail-closed（不许静默跳过——C3）
  const droppedDispositionConflicts = mixedPlane
    && (dispositionFor(detected, GENERATION_DROPPED.name).action !== dispositionFor(secondaryGeneration, GENERATION_DROPPED.name).action)

  let generation = detected
  let overridden = false
  let injected = false
  if (opts.generation !== null) { generation = opts.generation; overridden = true }
  else if (typeof process.env.NV_COMPAT_FAKE_GENERATION === 'string' && GENERATION_IDS.includes(process.env.NV_COMPAT_FAKE_GENERATION)) {
    generation = process.env.NV_COMPAT_FAKE_GENERATION
    overridden = true
    injected = true // 故障注入（§8.3）：输出必须标记，避免被当成真实证据；生产对未知值忽略
  }
  const confidence = opts.fixture !== null ? 'fixture' : overridden ? 'override' : primary.channel === 'profile-resolve' ? 'profile' : 'install-anchor'
  const generationUnknown = generation === 'unknown' || GENERATIONS[generation] === undefined

  const ctx = { opts, fixture: opts.fixture, plane: primary, globalRoot, generation, mixedPlane, droppedDispositionConflicts, secondaryGeneration }
  const rows = []
  const errors = []

  const pushRow = (row) => { rows.push(row); if (row.status === 'FAIL') errors.push(...row.errors) }

  const enumerate = async (list, source, at) => {
    for (const [index, row] of list.entries()) {
      const positional = at === '' ? `row ${index + 1}` : `${at} row ${index + 1}`
      await checkRow(row, source, positional, ctx, pushRow, { legacySource, patchSource })
    }
  }

  if (generationUnknown) {
    const reason = `代际不可判定（hostVersion=${primary.hostVersion} / hasAgentPreset=${primary.hasAgentPreset}${overridden ? ' / 已被覆盖为 unknown' : ''}）——fail-closed：不投影、不逐行检查（绝不默认成任意一代）`
    for (const source of [patchSource, legacySource]) {
      const flat = flatten(source.plugins)
      for (const row of flat) {
        pushRow({ id: typeof row.id === 'string' && row.id !== '' ? row.id : '(shape)', name: typeof row.name === 'string' ? row.name : '', source: source === patchSource ? 'patch' : 'legacy', status: 'NOT_RUN', checks: [], schemaStatus: 'NOT_RUN', message: '代际 unknown——本行未做任何检查（NOT_RUN ≠ PASS）', errors: [] })
      }
    }
    errors.push({ code: 'UNKNOWN_GENERATION', message: reason, rowId: null, package: HOST_PACKAGES.host, check: 'generation', fix: '按 docs/COMPATIBILITY.md §10.3 升级检查清单补 manifest/fixture；或用 --generation <id> 显式覆盖做诊断（输出会标 overridden:true）' })
  } else {
    // 0.2.x 源：bundle 形态时先检查结构行（插件 bundle 行等），再递归声明行 plugins
    await enumerate(patchSource.structuralRows, 'patch', '')
    await enumerate(patchSource.plugins, 'patch', '')
    // 0.1.x 源
    await enumerate(legacySource.plugins, 'legacy', '')
    // dual 对账（manifest 单源化；§7.2 第 7 步）
    const dual = reconcileDualSources(patchSource.plugins, legacySource.plugins)
    for (const problem of dual.problems) {
      errors.push({ code: problem.code, rowId: problem.rowId ?? null, package: problem.name ?? null, check: 'dual', message: problem.message, fix: '行差只允许 GENERATION_VARIANT（同行换包名）/ GENERATION_DROPPED（legacy-only 整行）——见 lib/host-compat/generation-manifest.mjs' })
    }
    rows.push({ id: 'dual', name: `${opts.patch} ↔ ${opts.legacy}`, source: 'dual', status: dual.ok ? 'PASS' : 'FAIL', checks: ['dual'], schemaStatus: 'NOT_RUN', message: dual.ok ? '双源行差与 manifest 一致（dropped/variant 成对，行序一致）' : `${dual.problems.length} 项 DUAL_SOURCE_DRIFT`, errors: [] })
    ctx.dualStatus = dual.ok ? 'PASS' : 'FAIL'
    ctx.dualProblems = dual.problems.length
  }

  // 汇总与判定
  const summary = { total: rows.length, pass: 0, knownDrop: 0, knownVariant: 0, warn: 0, fail: 0, notRun: 0 }
  for (const row of rows) {
    if (row.status === 'PASS') summary.pass += 1
    else if (row.status === 'KNOWN_DROP') summary.knownDrop += 1
    else if (row.status === 'KNOWN_VARIANT') summary.knownVariant += 1
    else if (row.status === 'WARN') summary.warn += 1
    else if (row.status === 'FAIL') summary.fail += 1
    else summary.notRun += 1
  }
  let hardFail = errors.length > 0 || generationUnknown
  // WARN 为保留枚举（R1 F4 口径）：mixedPlane 不落行级 WARN——非 strict 下经 mixedPlane/mixedPlaneDetail
  // 字段与人类可读头行披露；涉 legacy-only 行时已 fail-closed（该行 FAIL），--strict 再判 STRICT_MIXED_PLANE。
  if (opts.strict === true && mixedPlane === true) {
    hardFail = true
    errors.push({ code: 'STRICT_MIXED_PLANE', message: `--strict：混合平面（profile 平面=${detected} / 全局闭包=${secondaryGeneration}）`, rowId: null, package: null, check: 'plane', fix: '先对齐两平面（升级 profile 或全局 dsh），或用 --fixture/--generation 显式圈定诊断面' })
  }
  const ok = !hardFail
  const report = {
    schemaVersion: SCHEMA_VERSION,
    compatRunId,
    ok,
    generation,
    detectedGeneration: detected,
    confidence,
    hostVersion: primary.hostVersion,
    hasAgentPreset: primary.hasAgentPreset,
    overridden,
    ...((injected || opts.injected === true) ? { injected: true } : {}),
    ...(opts.channelConstraint !== null && opts.channelConstraint !== undefined ? { channelConstraint: opts.channelConstraint } : {}),
    plane: {
      channel: primary.channel,
      profile: primary.profile,
      via: primary.via,
      dshPackage: join(primary.dshDir, 'package.json'),
      globalRoot,
      ...(opts.globalRoot !== null ? { globalRootOverride: true } : {}), // R2 N1：注入可审计——仅注入时出现，无注入不得有此标记
      ...(secondary !== null ? { secondary: { channel: secondary.channel, via: secondary.via, hostVersion: secondary.hostVersion, generation: secondaryGeneration } } : {}),
    },
    mixedPlane,
    ...(mixedPlane ? { mixedPlaneDetail: { primaryGeneration: detected, secondaryGeneration, droppedDispositionConflicts: droppedDispositionConflicts } } : {}),
    sources: {
      patch: { path: opts.patch, shape: patchSource.shape, rows: patchSource.plugins.length },
      legacy: { path: opts.legacy, shape: legacySource.shape, rows: legacySource.plugins.length },
    },
    rows: rows.map(({ errors: _rowErrors, ...rest }) => rest),
    summary,
    dual: { status: generationUnknown ? 'NOT_RUN' : (ctx.dualStatus ?? 'PASS'), problems: generationUnknown ? 0 : (ctx.dualProblems ?? 0) },
    errors,
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    const c = (status) => colorOf(status, useColor)
    console.log(note(`preflight-preset-rows compatRunId=${compatRunId} schema=v${SCHEMA_VERSION}`))
    console.log(note(`patch=${opts.patch}（${patchSource.shape}，声明 plugins ${patchSource.plugins.length} 行）legacy=${opts.legacy}（${legacySource.shape}，${legacySource.plugins.length} 行）`))
    console.log(note(`plane: channel=${primary.channel}（${primary.via}）profile=${primary.profile ?? '-'} dsh=${primary.hostVersion} agentPreset=${primary.hasAgentPreset}` + (secondary !== null ? ` | 全局闭包对照: dsh=${secondary.hostVersion} → ${secondaryGeneration}` : '') + (opts.globalRoot !== null ? ` | globalRootOverride=true（--global-root 注入，非自然根——不得当成真实证据）` : '')))
    console.log(note(`generation=${generation} confidence=${confidence} mixedPlane=${mixedPlane} overridden=${overridden}${injected ? ' injected=true' : ''}（代际清单 lib/host-compat/generation-manifest.mjs）`))
    if (generationUnknown) console.error(note(`UNKNOWN_GENERATION：${errors.find((e) => e.code === 'UNKNOWN_GENERATION')?.message ?? ''}`))
    console.log('  ── 行状态（source / status / id / name / 版本 / 报文）──')
    const mark = { PASS: '✓', FAIL: '✗', WARN: '!', KNOWN_DROP: '·', KNOWN_VARIANT: '·', NOT_RUN: '○' }
    for (const row of rows) {
      console.log('  ' + c(row.status)(mark[row.status] ?? '?') + ` ${row.status.padEnd(13)} ${String(row.source).padEnd(6)} ${String(row.id).padEnd(26)} ${String(row.name).padEnd(52)} ${row.version ?? '-'} ${row.message}`)
    }
    console.log(`  dual 对账：${report.dual.status}${report.dual.status === 'PASS' ? '' : '（' + report.dual.problems + ' 项 DUAL_SOURCE_DRIFT）'}`)
    console.log(`  汇总：total ${summary.total} | pass ${summary.pass} | knownDrop ${summary.knownDrop} | knownVariant ${summary.knownVariant} | warn ${summary.warn} | fail ${summary.fail} | notRun ${summary.notRun}（NOT_RUN ≠ PASS）`)
    for (const error of errors) {
      console.error(c('FAIL')(note(`FAIL [${error.code}]${error.rowId !== null && error.rowId !== undefined ? ' 行 ' + error.rowId : ''}${error.package ? '（' + error.package + '）' : ''} @${error.check ?? '?'}：${error.message}`)))
      if (error.fix !== undefined) console.error(note(`  修复建议：${error.fix}`))
    }
    console.log(note(ok ? `判定：OK（exit 0）` : `判定：FAIL（exit 1，${errors.length} 项硬错误）`))
  }
  process.exit(ok ? EXIT.OK : EXIT.FAIL)
}

function flatten(rows, out = []) {
  for (const row of rows ?? []) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) continue
    out.push(row)
    if (row.group === true && Array.isArray(row.config)) flatten(row.config, out)
  }
  return out
}

/** 单行检查（§7.2 顺序：形状 → 代际处置 → 包存在性 → exports → config schema）。 */
async function checkRow(row, source, positional, ctx, pushRow, sources) {
  const record = (overrides) => pushRow({
    id: null, name: '', source, status: 'PASS', checks: [], schemaStatus: 'NOT_RUN', message: '', version: null, channel: null, evidence: '', errors: [], ...overrides,
  })
  const isPatchSource = source === 'patch'
  const baseUrl = pathToFileURL(isPatchSource ? sources.patchSource.path : sources.legacySource.path).href

  // 1. 形状
  if (row === null || typeof row !== 'object' || Array.isArray(row)) {
    return record({ id: positional, status: 'FAIL', checks: ['shape'], message: '不是插件行（需要 name 字符串）', errors: [{ code: 'ROW_SHAPE', rowId: positional, check: 'shape', message: `${positional} 不是插件行（需要 name 字符串）`, fix: '行必须是带 name 的映射；group 行 name=cordis:group 且 config=子行列表' }] })
  }
  const id = typeof row.id === 'string' && row.id !== '' ? row.id : null
  const name = typeof row.name === 'string' ? row.name : ''
  const isGroup = Boolean(row.group)
  if (!isGroup && name === '') {
    return record({ id: id ?? positional, status: 'FAIL', checks: ['shape'], message: '不是插件行（name 非空必填）', errors: [{ code: 'ROW_SHAPE', rowId: id ?? positional, check: 'shape', message: `${positional} 缺 name（id/name 非空是形状硬要求）`, fix: '补齐行 name（包名或 cordis:group）' }] })
  }
  if (id === null && !isGroup) {
    return record({ id: positional, status: 'FAIL', checks: ['shape'], message: '缺 id（id/name 非空是形状硬要求）', errors: [{ code: 'ROW_SHAPE', rowId: positional, check: 'shape', message: `${positional} 缺 id`, fix: '补齐行 id（行身份键，双源对账按 id:name 比较）' }] })
  }
  if (isGroup) {
    const groupErrors = []
    if (row.name !== GROUP_NAME) groupErrors.push({ code: 'GROUP_NAME_UNRESOLVED', rowId: id, check: 'shape', message: `group 名必须是 "${GROUP_NAME}"（加载器内建）；实际 ${JSON.stringify(row.name)}`, fix: `group 行 name 固定为 ${GROUP_NAME}` })
    if (!Array.isArray(row.config)) groupErrors.push({ code: 'ROW_SHAPE', rowId: id, check: 'shape', message: `group ${id} 必须携带插件行列表（config 数组）`, fix: 'config: [ …子行 ]' })
    if (groupErrors.length > 0) return record({ id, name, status: 'FAIL', checks: ['shape'], message: groupErrors[0].message, errors: groupErrors })
    let groupDisabled
    try { groupDisabled = row.disabled !== undefined && row.disabled !== null ? Boolean(interpolateConfig(row.disabled, baseUrl)) : false } catch (error) {
      return record({ id, name, status: 'FAIL', checks: ['shape'], message: `group disabled !!js 表达式抛错：${String(error.message).split('\n')[0]}`, errors: [{ code: 'DISABLED_EXPR_ERROR', rowId: id, check: 'shape', message: String(error.message).split('\n')[0], fix: 'disabled 表达式必须可求值（加载器在挂载期同样会抛）' }] })
    }
    record({ id, name, status: 'PASS', checks: ['shape'], message: groupDisabled ? 'group disabled——子行继承跳过（逐行披露为 NOT_RUN）' : `group 内建——枚举 ${row.config.length} 个子行` })
    for (const [child, childRow] of row.config.entries()) {
      if (groupDisabled) {
        const childId = childRow && typeof childRow.id === 'string' && childRow.id !== '' ? childRow.id : `${id} row ${child + 1}`
        record({ id: childId, name: childRow && typeof childRow.name === 'string' ? childRow.name : '', status: 'NOT_RUN', checks: ['shape'], message: `未启动——继承祖先 group "${id}" 的 disabled（本行未做模块/exports/schema 检查）` })
      } else {
        await checkRow(childRow, source, `${id} row ${child + 1}`, ctx, pushRow, sources)
      }
    }
    return undefined
  }
  if (Array.isArray(row.config)) {
    return record({ id, name, status: 'FAIL', checks: ['shape'], message: 'config 是列表但不是 group 行（加载器会把该列表当作本行 config）', errors: [{ code: 'ROW_SHAPE', rowId: id, check: 'shape', message: `${id} 的 config 是列表但行未标 group:true`, fix: 'group 行需 group: true；普通行 config 是映射' }] })
  }

  // 2. disabled（跳过模块解析但记录——NOT_RUN 绝不渲染成 PASS）
  let disabled = false
  if (row.disabled !== undefined && row.disabled !== null) {
    try { disabled = Boolean(interpolateConfig(row.disabled, baseUrl)) } catch (error) {
      return record({ id, name, status: 'FAIL', checks: ['shape'], message: `disabled !!js 表达式抛错：${String(error.message).split('\n')[0]}`, errors: [{ code: 'DISABLED_EXPR_ERROR', rowId: id, check: 'shape', message: String(error.message).split('\n')[0], fix: 'disabled 表达式必须可求值' }] })
    }
    if (disabled) return record({ id, name, status: 'NOT_RUN', checks: ['shape'], message: '本行 disabled（平台分流）——跳过模块解析，仅记录（NOT_RUN ≠ PASS）' })
  }

  // 加载器内建行：无模块可解析
  if (name.startsWith('cordis:')) {
    return record({ id, name, status: 'PASS', checks: ['shape'], message: '加载器内建——无模块可 import，无 schema 可比对' })
  }

  const checks = ['shape']
  const rowErrors = []
  const failRow = (code, check, message, fix, extra = {}) => rowErrors.push({ code, rowId: id, package: name, check, message, fix, ...extra })

  // 3. 代际处置（在包存在性**之前**——§7.2 顺序；只允许清单声明的差异）
  const disposition = dispositionFor(ctx.generation, name)
  checks.push('generation')
  const variantRow = name === GENERATION_VARIANT.legacy.name || name === GENERATION_VARIANT.current.name
  if (name === GENERATION_DROPPED.name && !isPatchSource) {
    if (disposition.action === 'keep') {
      // legacy-0.1 平面：原生行，继续完整检查（缺包/exports 失配仍是真故障）
    } else {
      const conflict = ctx.droppedDispositionConflicts === true
      if (conflict) {
        failRow('MIXED_PLANE_FAIL_CLOSED', 'generation', `混合平面（profile 平面=${ctx.generation} / 全局闭包=${ctx.secondaryGeneration}）且两代对本 legacy-only 行处置相反——fail-closed，不许静默跳过（RISK-C3）`, '先对齐两平面（升级 profile 或全局 dsh）后重跑预检')
        return record({ id, name, status: 'FAIL', checks, message: 'MIXED_PLANE_FAIL_CLOSED：legacy-only 行在混合平面下无法安全处置', errors: rowErrors })
      }
      return record({ id, name, status: 'KNOWN_DROP', checks, schemaStatus: 'SKIPPED', message: `已知代际删除行（${disposition.reason}）——0.2.x 平面不解析该行模块（单独披露，不计 PASS）`, evidence: `manifest GENERATION_DROPPED；listAgents=${GENERATIONS[ctx.generation]?.listAgents ?? '?'}` })
    }
  }
  if (name === GENERATION_DROPPED.name && isPatchSource) {
    failRow('DECLARED_DROPPED_ROW', 'generation', `0.2.x 源声明了 legacy-only 行 ${name}（${disposition.reason}）`, `0.2.2 请使用主包行 ${GENERATION_DROPPED.replacementName}，勿声明 ./list-agents`)
    // 不 return：继续包存在性/exports 检查——在 exports 已移除的平面上同时给出 ERR_PACKAGE_PATH_NOT_EXPORTED（= 宿主真实失败面）
  }
  if (variantRow && disposition.action === 'replace') {
    // 变体行在「对侧代际」平面：按清单披露为 KNOWN_VARIANT（对侧行由 dual 对账互钉）
    return record({ id, name, status: 'KNOWN_VARIANT', checks, schemaStatus: 'SKIPPED', message: `已知代际变体行（${disposition.reason}）——本平面按清单不解析，对侧行由 dual 对账钉住（单独披露，不计 PASS）`, evidence: `manifest GENERATION_VARIANT → ${disposition.replacementName}` })
  }

  // 4. 包存在性
  const hit = resolvePackage(name, ctx)
  if (hit === null) {
    failRow('MODULE_NOT_FOUND', 'package', `无法从宿主平面解析：${name}（plane-closure / profile-anchor / install-anchor 均不可达）`, `确认包在当前代际平面在场（${ctx.fixture !== null ? 'fixture 伪 node_modules' : 'profile / 全局安装闭包'}）；若属代际差异行，登记进 lib/host-compat/generation-manifest.mjs 而非删行`)
    return record({ id, name, status: 'FAIL', checks, message: `MODULE_NOT_FOUND：${name}`, errors: rowErrors })
  }
  checks.push('package')
  const channel = hit.channel

  // 5. exports 解析（读 exports 映射；不靠 require.resolve 碰巧成功）
  const [, subpathRaw] = splitSpec(name)
  const subpath = subpathRaw === null ? '.' : './' + subpathRaw
  const matched = matchExports(hit.pkg, subpath)
  if (matched.ok !== true) {
    failRow('ERR_PACKAGE_PATH_NOT_EXPORTED', 'exports', `包 ${splitSpec(name)[0]} 的 exports 不允许子路径 ${subpath}（exports keys：${matched.exportsKeys.join(', ')}）——宿主 agentPresets.register 激活期将抛 ERR_PACKAGE_PATH_NOT_EXPORTED，整棵预设挂载被否决`, `0.2.2 请使用主包行，勿声明 ./list-agents；或升级行声明到当前代际的 exports 面（见 lib/host-compat/generation-manifest.mjs）`)
    return record({ id, name, status: 'FAIL', checks, version: hit.pkg.version ?? null, channel, message: `ERR_PACKAGE_PATH_NOT_EXPORTED：${subpath} 不在 ${splitSpec(name)[0]} exports 面`, evidence: `exports=[${matched.exportsKeys.join(', ')}]`, errors: rowErrors })
  }
  checks.push('exports')
  let entryFile = null
  if (matched.target !== null) {
    const target = join(hit.pkgDir, matched.target)
    const candidates = matched.via === 'no-exports-legacy' && subpathRaw !== null
      ? [target, target + '.js', target + '.cjs', join(target, 'index.js')]
      : [target]
    entryFile = candidates.find((p) => ctx.fixture !== null ? matched.via !== 'no-exports-legacy' : existsSync(p)) ?? null
    if (entryFile === null && ctx.fixture === null) {
      failRow('EXPORTS_TARGET_MISSING', 'exports', `exports 目标文件不存在：${matched.target}（包目录 ${hit.pkgDir}）`, '包安装可能不完整——重装该包或修正 exports 映射')
      return record({ id, name, status: 'FAIL', checks, version: hit.pkg.version ?? null, channel, message: `exports 目标缺失：${matched.target}`, errors: rowErrors })
    }
  }

  // 6. config schema（fixture 元数据平面无真实模块 → NOT_RUN；无 Config 导出 → NO_SCHEMA 不伪造 PASS）
  let schemaStatus = 'NOT_RUN'
  let schemaNote = ctx.fixture !== null ? 'fixture 元数据平面无真实模块——schema 检查未运行（NOT_RUN ≠ PASS）' : ''
  if (ctx.fixture === null && entryFile !== null) {
    const mod = await importModuleOnce(pathToFileURL(entryFile).href)
    if (mod !== null && mod.__error !== undefined) {
      failRow('IMPORT_ERROR', 'config', `import 失败 ${entryFile}：${String(mod.__error.message).split('\n')[0]}`, '检查包安装完整性与 Node 版本（engines.node>=20）')
    } else {
      const unwrapped = unwrapExports(mod)
      const Config = unwrapped && unwrapped.Config
      if (!Config) {
        schemaStatus = 'NO_SCHEMA'
        schemaNote = '该模块不导出 Config schema——本工具无法校验此行 config（不对加载器随后如何处理它作任何断言）'
      } else {
        const resolveConfig = await loadResolveConfig(ctx)
        if (resolveConfig === null) {
          schemaStatus = 'NOT_RUN'
          schemaNote = '平面 cordis resolveConfig 不可达——config 未与 schema 比对（NOT_RUN ≠ PASS）'
        } else {
          let config
          try {
            config = interpolateConfig(row.config, baseUrl)
          } catch (error) {
            failRow('CONFIG_EXPR_ERROR', 'config', `config !!js 表达式抛错：${String(error.message).split('\n')[0]}`, '修正组合文件里的 !!js 表达式（加载器在挂载期同样会抛）')
          }
          if (rowErrors.length === 0) {
            try {
              resolveConfig({ Config }, config)
              schemaStatus = 'PASS'
            } catch (error) {
              schemaStatus = 'FAIL'
              failRow('CONFIG_INVALID', 'config', String(error.message).split('\n').join(' ').slice(0, 300), '对照宿主插件 Config schema 修正该行 config（键名/必填/类型）——正是启动时报错的那次调用')
            }
          }
        }
      }
    }
  }
  checks.push('config')

  const status = rowErrors.length > 0 ? 'FAIL' : 'PASS'
  return record({
    id, name, status, checks, schemaStatus, version: hit.pkg.version ?? null, channel,
    message: status === 'FAIL' ? rowErrors[0].message : (schemaNote !== '' ? `（schema=${schemaStatus}）${schemaNote}` : '全部已执行检查通过'),
    evidence: `channel=${channel} via=${hit.via} exports=${matched.via}${matched.target !== null ? `→${matched.target}` : ''}${entryFile !== null ? '' : '（fixture：不核目标文件）'}`,
    errors: rowErrors,
  })
}

// ── --explain：单行逐代际解释（§4 目标 4.2 可解释）────────────────────────────
function explainMode(opts, { patchSource, legacySource, compatRunId, useColor }) {
  const rowId = opts.explain
  const patchFlat = flatten(patchSource.plugins)
  const legacyFlat = flatten(legacySource.plugins)
  const byId = (list) => list.find((row) => row && row.id === rowId)
  const patchRow = byId(patchFlat)
  const legacyRow = byId(legacyFlat)
  const nameOf = patchRow?.name ?? legacyRow?.name ?? null
  if (nameOf === null) {
    die(`--explain ${rowId}：该行 id 既不在 ${opts.patch} 也不在 ${opts.legacy}（也无 manifest 特判登记）`)
  }
  const dispositions = GENERATION_IDS.map((id) => ({ generation: id, ...dispositionFor(id, nameOf) }))
  const payload = {
    schemaVersion: SCHEMA_VERSION, compatRunId, rowId, name: nameOf,
    sources: { patch: patchRow !== undefined, legacy: legacyRow !== undefined },
    listAgents: Object.fromEntries(GENERATION_IDS.filter((id) => id !== 'unknown').map((id) => [id, GENERATIONS[id].listAgents])),
    dispositions,
  }
  if (opts.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    const c = colorOf('KNOWN_VARIANT', useColor)
    console.log(note(`行 ${rowId}（${nameOf}）在各代际的处置（清单 = lib/host-compat/generation-manifest.mjs）：`))
    for (const d of dispositions) {
      console.log(c(`  - ${d.generation.padEnd(10)} ${d.action.padEnd(12)} ${d.reason}${d.replacementName !== undefined ? `（替换为 ${d.replacementName}）` : ''}`))
    }
    console.log(note(`  list_agents 供给面：${Object.entries(payload.listAgents).map(([g, v]) => `${g}=${v}`).join('；')}`))
    console.log(note(`  源在场性：cordis.patch.yml=${payload.sources.patch ? '在场' : '不在场'}；agent.cordis.yml=${payload.sources.legacy ? '在场' : '不在场'}`))
  }
  process.exit(EXIT.OK)
}

main().catch((error) => {
  console.error(note(`内部错误（exit 1）：${String((error && error.stack) || error).split('\n').slice(0, 4).join('\n')}`))
  process.exit(EXIT.FAIL)
})
