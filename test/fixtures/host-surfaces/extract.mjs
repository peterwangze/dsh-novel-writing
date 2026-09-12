/**
 * extract.mjs — 宿主表面 fixture 提取器（COMPAT-003）
 *
 * 用途：把三份宿主表面快照（test/fixtures/host-surfaces/*.json）的生成过程变成可重跑、可审计的
 * 只读提取——fixture 是「从真实包提取」还是「证据构造」由 source 字段如实标注，禁止手写表面。
 *
 * 用法（离线，仅读目录；仓库内运行）：
 *   node test/fixtures/host-surfaces/extract.mjs \
 *     --packed .compat003-scratch/packs/0.1.2-rc.1 \        # npm pack + tar 解包布局：<dir>/<pkg>/package/**
 *     --version 0.1.2-rc.1 --source "..." --out test/fixtures/host-surfaces/0.1.2-rc.1.json \
 *     --packages dsh-settings,dsh-api-gateway,...
 *   node test/fixtures/host-surfaces/extract.mjs \
 *     --checkout <宿主闭包 @deepseek-ai 目录> \             # 已安装闭包布局：<dir>/<pkg>/**
 *     --version 0.1.5-rc.2 --source "..." --out test/fixtures/host-surfaces/0.1.5-rc.2.json
 *   （--dump 只打印摘要不写文件；--pretty 缩进 2 空格输出）
 *
 * 复现步骤（COMPAT-003 实际生成三份 fixture 的完整命令；全部只读宿主，产物仅落仓库/temp）：
 *   A) npm 可达性探测（只读元数据）：npm view @deepseek-ai/dsh-settings versions --json
 *   B) 历史版本（真实 tarball，不 install 不执行）：
 *        npm pack @deepseek-ai/<pkg>@<ver> --pack-destination <tmp>/<ver>/<pkg> --json
 *        tar -xzf <tmp>/<ver>/<pkg>/deepseek-ai-<pkg>-<ver>.tgz -C <tmp>/<ver>/<pkg>
 *        # → <tmp>/<ver>/<pkg>/package/**（本脚本 --packed 期望的布局）
 *        node test/fixtures/host-surfaces/extract.mjs --packed <tmp>/<ver> --version <ver> \
 *          --packages dsh-settings,dsh-api-gateway,dsh-client-modules,dsh-client-connection,dsh-home-paths,dsh-tools \
 *          --marker-remoteNamespaceServicePackages <true|false> --source "<来源说明>" \
 *          --out test/fixtures/host-surfaces/<ver>.json
 *      <pkg> 六包同 <ver>；<ver> ∈ {0.1.2-rc.1, 0.1.1-rc.2}。
 *   C) 现行宿主（已安装闭包只读目录）：
 *        node test/fixtures/host-surfaces/extract.mjs --checkout <node_modules/@deepseek-ai> \
 *          --version 0.1.5-rc.2 --packages cordis,schemastery,dsh-settings,dsh-api-gateway,\
 *          dsh-client-modules,dsh-client-connection,dsh-home-paths,dsh-tools \
 *          --marker-remoteNamespaceServicePackages true --source "<来源说明>" \
 *          --out test/fixtures/host-surfaces/0.1.5-rc.2.json
 *   说明：`--marker-remoteNamespaceServicePackages` 为注册表级事实（remote.<ns> 服务声明包族
 *   dsh-api-*-controller 首版 0.1.2-alpha.2），无法从单个 tarball 推出，故由命令行显式给出并写入
 *   fixture.markers[*].origin='registry-metadata' 供复核；其余两个标记均由 tarball 静态提取实测。
 *
 * 只读纪律：本脚本只读宿主文件，零写入宿主目录；不执行宿主代码（静态解析，无动态 import）。
 * 内容安全（BC-05）：产物只含包名/版本/导出名/类继承名/方法名/标记布尔——不含文件路径、token、用户数据。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const DEFAULT_PACKAGES = [
  'cordis',
  'schemastery',
  'dsh-settings',
  'dsh-api-gateway',
  'dsh-client-modules',
  'dsh-client-connection',
  'dsh-home-paths',
  'dsh-tools',
]
const CLIENT_SUBPATH = './client'
const METHOD_CAP_PER_CLASS = 60 // 超出则截断并置 methodNamesTruncated（显式披露，不静默丢失）

// ── 参数解析 ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { pretty: true, dump: false }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--dump') { out.dump = true; continue }
    if (a.startsWith('--')) { out[a.slice(2)] = argv[i + 1]; i += 1 }
  }
  return out
}

// ── 源码工具 ────────────────────────────────────────────────────────────────
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

/** 从 `class X ... {` / `var X = class ... {` 的 `{` 起做花括号配对（跳过字符串/模板串/注释），返回类体。 */
function classBody(src, braceIdx) {
  let depth = 0
  let i = braceIdx
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) return '' ; continue }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i); i = e < 0 ? src.length : e + 2; continue }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c
      i += 1
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue }
        if (src[i] === quote) break
        i += 1
      }
      i += 1
      continue
    }
    if (c === '{') depth += 1
    else if (c === '}') { depth -= 1; if (depth === 0) return src.slice(braceIdx + 1, i) }
    i += 1
  }
  return src.slice(braceIdx + 1)
}

/** 类体 → 方法名集合（含 constructor/static/get/set/async/#private）。 */
function methodsOf(body) {
  const names = []
  const re = /(?:^|\n)[\t ]*(?:(?:static|async|get|set|\*)\s+)*((?:#)?[A-Za-z_$][\w$]*)\s*\(/g
  let m
  while ((m = re.exec(body)) !== null) names.push(m[1])
  return [...new Set(names)]
}

/** 在单文件里定位符号声明：class（含 `var X = class`）/function/const 及其继承与基类来源包。 */
function declOf(src, name) {
  const fileImports = new Map() // localName → 包名（用于 extendsFrom）
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    for (const part of m[1].split(',')) {
      const local = part.trim().split(/\s+as\s+/).pop().trim()
      if (local) fileImports.set(local, m[2])
    }
  }
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`(?:^|\\n)[\\t ]*(?:export\\s+)?class\\s+${esc}(?:\\s+extends\\s+([A-Za-z_$][\\w$.]*))?[^{]*\\{`),
    // 打包产物常见形态：`var X = class` / `var X = class X extends Base {`（类表达式可带自身名）
    new RegExp(`(?:^|\\n)[\\t ]*(?:export\\s+)?(?:var|let|const)\\s+${esc}\\s*=\\s*class(?:\\s+[A-Za-z_$][\\w$]*)?(?:\\s+extends\\s+([A-Za-z_$][\\w$.]*))?\\s*\\{`),
  ]
  for (const re of patterns) {
    const m = re.exec(src)
    if (m === null) continue
    const brace = src.indexOf('{', m.index + m[0].length - 1)
    const body = classBody(src, brace)
    const methods = methodsOf(body)
    const base = m[1] !== undefined ? m[1].split('.').pop() : null
    return {
      kind: 'class',
      extends: base,
      extendsFrom: base !== null ? (fileImports.get(m[1]) ?? (m[1].includes('.') ? m[1].split('.')[0] : null)) : null,
      methodNames: methods.slice(0, METHOD_CAP_PER_CLASS),
      ...(methods.length > METHOD_CAP_PER_CLASS ? { methodNamesTruncated: true } : {}),
      methodCount: methods.length,
    }
  }
  if (new RegExp(`(?:^|\\n)[\\t ]*(?:export\\s+)?(?:async\\s+)?function\\s+${esc}\\s*\\(`).test(src)) return { kind: 'function' }
  if (new RegExp(`(?:^|\\n)[\\t ]*(?:export\\s+)?(?:var|let|const)\\s+${esc}\\s*[:=]`).test(src)) return { kind: 'const' }
  return { kind: 'unknown' }
}

/** 解析一个模块文件的导出面（含 re-export 递归一层）。 */
function parseModule(pkgRoot, relFile, seen = new Set()) {
  const abs = join(pkgRoot, relFile)
  const result = { exports: new Map(), starFrom: [] }
  if (seen.has(abs) || !existsSync(abs)) return result
  seen.add(abs)
  const raw = stripComments(readFileSync(abs, 'utf8'))
  // 归一化 `export { A,\n B };` → 单行，便于统一匹配（导出名列表内不含 `}`）
  const src = raw.replace(/^export\s*\{([\s\S]*?)\}/gm, (full, names) => 'export {' + names.replace(/\s*\n\s*/g, ' ').trim() + '}')

  for (const m of src.matchAll(/^export\s*\*\s*from\s*['"]([^'"]+)['"]/gm)) result.starFrom.push(m[1])

  // 具名导出：带 from 走目标模块递归解析；不带 from 在原地找声明
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}\s*(?:from\s*['"]([^'"]+)['"])?\s*;?\s*$/gm)) {
    const spec = m[2]
    const sub = spec === undefined ? null : (() => {
      const target = resolveSpec(pkgRoot, relFile, spec)
      return target === null ? { exports: new Map() } : parseModule(pkgRoot, target, seen)
    })()
    for (const part of m[1].split(',')) {
      const t = part.trim()
      if (t === '') continue
      const [orig, alias] = t.split(/\s+as\s+/).map((s) => s.trim())
      const exportedAs = alias ?? orig
      const decl = sub === null ? declOf(src, orig) : (sub.exports.get(orig) ?? { kind: 're-export', from: spec })
      result.exports.set(exportedAs, decl)
    }
  }
  // 直接声明式导出
  for (const m of src.matchAll(/^export\s+(?:default\s+)?(?:abstract\s+)?(class|function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
    const isDefault = /^export\s+default\b/.test(m[0])
    const d = declOf(src, m[2])
    result.exports.set(m[2], d)
    if (isDefault) result.exports.set('default', d)
  }
  const dflt = /^export\s+default\s+([A-Za-z_$][\w$]*)\s*$/m.exec(src)
  if (dflt !== null && !result.exports.has('default')) result.exports.set('default', result.exports.get(dflt[1]) ?? { kind: 'unknown' })
  return result
}

function resolveSpec(pkgRoot, fromRel, spec) {
  if (!spec.startsWith('.')) return null // 包外 specifier（不进仓库 fixture）
  const base = resolve(pkgRoot, dirname(fromRel), spec)
  for (const cand of [base, base + '.js', join(base, 'index.js')]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand.slice(pkgRoot.length + 1)
  }
  return null
}

function entryOf(pkgRoot) {
  const pj = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'))
  const pick = (e) => (typeof e === 'string' ? e : e === null || e === undefined ? null : (e.import ?? e.default ?? e.require ?? null))
  const dot = pj.exports === undefined ? null : (typeof pj.exports === 'string' ? pj.exports : (pj.exports['.'] ?? null))
  const rel = pick(dot) ?? pick(pj.module ?? pj.main ?? null) ?? 'index.js'
  return { pj, entryRel: rel.replace(/^\.\//, '') }
}

// ── 标记探针（每条标记记录判定方法，供 smoke 与 Review 复核；不写死结论）──────
const MARKER_PROBES = {
  settingsNamespaceExported: {
    probe: "exportNames(@deepseek-ai/dsh-settings) 含 'settingsNamespace'（npm pack 真实 tarball 静态导出面）",
    eval: (ctx) => (ctx.exportsOf('dsh-settings') ?? []).includes('settingsNamespace'),
  },
  connectionApiDomainField: {
    probe: "regex /(?:^|[\\s;{])this\\.api\\s*=/ 命中 @deepseek-ai/dsh-client-connection 入口+client 源码（旧表面：连接载体上挂 api 域对象）",
    eval: (ctx) => ctx.sourceMatch('dsh-client-connection', /(?:^|[\s;{])this\.api\s*=/m),
  },
  remoteNamespaceServicePackages: {
    probe: "npm view @deepseek-ai/dsh-api-{settings,workspace,session}-controller versions —— 该族为 remote.<ns> 服务声明方，首版 0.1.2-alpha.2；此版本线下方为 false（注册表元数据事实，非 tarball 提取）",
    registry: true,
  },
}

// ── 主流程 ──────────────────────────────────────────────────────────────────
/**
 * 定位包根目录：兼容三种真实布局——①<base>/<bare>（npm/pnpm 闭包）②<base>/@scope/<bare>（npx 闭包）
 * ③再叠加 npm pack 解包后的 `<pkg>/package/` 一级目录。按顺序取第一个含 package.json 者。
 */
function resolvePackageRoot(baseDir, name) {
  const bare = name.startsWith('@') ? name.split('/').pop() : name
  const scoped = name.startsWith('@') ? name : '@deepseek-ai/' + name
  const candidates = []
  for (const d of [join(baseDir, bare), join(baseDir, scoped)]) {
    candidates.push(d, join(d, 'package'))
  }
  return candidates.find((c) => existsSync(join(c, 'package.json'))) ?? null
}

function buildFixture(opts) {
  const baseDir = resolve(opts.packed ?? opts.checkout)
  const wanted = (opts.packages ?? DEFAULT_PACKAGES.join(',')).split(',').map((s) => s.trim()).filter(Boolean)
  const packages = {}
  const missing = []
  for (const name of wanted) {
    const root = resolvePackageRoot(baseDir, name)
    if (root === null) { missing.push(name); continue }
    const { pj, entryRel } = entryOf(root)
    const mod = parseModule(root, entryRel)
    const clientRel = (() => {
      const exp = pj.exports?.[CLIENT_SUBPATH]
      if (exp === undefined) return null
      const rel = typeof exp === 'string' ? exp : (exp.import ?? exp.default ?? null)
      return rel === null ? null : rel.replace(/^\.\//, '')
    })()
    const clientMod = clientRel !== null ? parseModule(root, clientRel) : { exports: new Map(), starFrom: [] }
    const exports = [...mod.exports.keys()].sort()
    const clientExports = clientRel !== null ? [...clientMod.exports.keys()].sort() : null
    const classes = {}
    const classAliases = {}
    const seenDecl = new Map() // decl 对象 → 首个导出名（主名）；`X as default` 归入 aliases，避免同一实现重复计数
    for (const [symbol, d] of [...mod.exports].sort(([a], [b]) => a.localeCompare(b))) {
      if (d.kind !== 'class') continue
      if (seenDecl.has(d)) { classAliases[symbol] = seenDecl.get(d); continue }
      seenDecl.set(d, symbol)
      classes[symbol] = {
        extends: d.extends ?? null,
        extendsFrom: d.extendsFrom ?? null,
        methodNames: d.methodNames ?? [],
        ...(d.methodNamesTruncated === true ? { methodNamesTruncated: true } : {}),
        methodCount: d.methodCount ?? 0,
      }
    }
    const functions = []
    const constants = []
    for (const [symbol, d] of [...mod.exports].sort(([a], [b]) => a.localeCompare(b))) {
      if (d.kind === 'function') functions.push(symbol)
      else if (d.kind === 'const') constants.push(symbol)
    }
    packages[name] = {
      version: pj.version,
      entryExportKey: '.',
      exports,
      exportCount: exports.length,
      starExports: [...new Set(mod.starFrom)].sort(),
      clientExportKey: clientRel !== null ? CLIENT_SUBPATH : null,
      clientExports,
      classes,
      classCount: Object.keys(classes).length,
      classAliases,
      functions,
      constants,
    }
  }
  const ctx = {
    exportsOf: (name) => packages[name]?.exports ?? null,
    sourceMatch: (name, re) => {
      const root = resolvePackageRoot(baseDir, name)
      if (root === null) return false
      const { entryRel, pj } = entryOf(root)
      const files = [entryRel]
      const cexp = pj.exports?.[CLIENT_SUBPATH]
      if (cexp !== undefined) files.push((typeof cexp === 'string' ? cexp : (cexp.import ?? cexp.default)).replace(/^\.\//, ''))
      return files.some((f) => existsSync(join(root, f)) && re.test(readFileSync(join(root, f), 'utf8')))
    },
  }
  const markers = {}
  for (const [id, spec] of Object.entries(MARKER_PROBES)) {
    markers[id] = spec.registry === true
      ? { value: opts[`marker-${id}`] === 'true', probe: spec.probe, origin: 'registry-metadata' }
      : { value: spec.eval(ctx), probe: spec.probe, origin: 'tarball-static-extract' }
  }
  return {
    schemaVersion: 1,
    task: 'COMPAT-003',
    hostVersion: opts.version,
    source: opts.source,
    extraction: {
      kind: 'package-extract（npm pack 真实 tarball 解包闭包 或 已安装宿主闭包只读目录——由 --packed/--checkout 指定）',
      tool: 'test/fixtures/host-surfaces/extract.mjs',
      method: 'static-parse（静态解析，零动态 import、零执行宿主代码）',
      entryResolution: "package.json exports['.'].import|default ← module ← main ← index.js；子面 './client' 同法",
      concerns: ['exportNames', 'classInheritance', 'classMethodNames', 'markers'],
      methodCapPerClass: METHOD_CAP_PER_CLASS,
      packagesRequested: wanted,
      packagesMissing: missing,
    },
    packages,
    markers,
  }
}

const args = parseArgs(process.argv.slice(2))
if (args.packed === undefined && args.checkout === undefined) {
  console.error('usage: extract.mjs --packed <dir> | --checkout <dir> [--version v] [--source s] [--out f] [--packages a,b] [--dump]')
  process.exit(2)
}
const fixture = buildFixture(args)
if (args.dump === true) {
  for (const [name, p] of Object.entries(fixture.packages)) {
    console.log(`${name}@${p.version}  exports=${p.exportCount} ${JSON.stringify(p.exports)}`)
    for (const [sym, c] of Object.entries(p.classes)) {
      console.log(`    class ${sym} extends ${String(c.extends)}(${String(c.extendsFrom)}) methods=${c.methodCount}`)
    }
  }
  console.log('markers: ' + JSON.stringify(Object.fromEntries(Object.entries(fixture.markers).map(([k, v]) => [k, v.value]))))
  console.log('missing: ' + JSON.stringify(fixture.extraction.packagesMissing))
} else if (args.out !== undefined) {
  writeFileSync(args.out, JSON.stringify(fixture, null, args.pretty === false ? 0 : 2) + '\n')
  console.log(`wrote ${args.out}: ${Object.keys(fixture.packages).length} packages`)
}
