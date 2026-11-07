#!/usr/bin/env node
/**
 * scripts/collect-host-surface-evidence.mjs — 宿主依赖面消费证据采集器（COMPAT-023）
 *
 * 目的：把「宿主代际 × 依赖面」的**消费方存在性证据**从「散落的人工结论」变成可再生的只读扫描产物——
 * BUG-012 教训：客户端面断裂由用户先用出，因为看护只覆盖预设行单格。本脚本对每个代际的代表版本，
 * 用 npm tarball（= 桌面实装事实源，BUG-012 阶段 A 实证 app.asar 内 client 包与 npm tarball 逐字节等价）
 * 只读扫描四类证据，落盘为小体量证据 JSON（扫描摘要，**非整包入库**）：
 *
 *   · 面 2/3 客户端：槽位（shell.overlay / sidebar.footer.action / settings.section）在宿主 client 包栈
 *     （dsh-client-ui-layout / dsh-cordis-client-runner / dsh-client-modules / dsh-client-ui-renderer /
 *      dsh-client-ui-workspace）的证据链四形态——**注册声明**（ui-layout 对象键形 `"slot": {kind:…}` /
 *      runner 键字段形 `key: "slot"` + `kind:`）、**消费调用**（`renderSlot("slot"`）、**注入 API 文档**
 *     （`slots.inject("slot"`——宿主 runner 自带的官方注入示例）与**条目名注册**（`name: "slot"`）+
 *     槽位 DOM 物化锚点（data-shell-overlay / data-slot / [data-phase]）；
 *   · 面 1 服务端：COMPAT-018/019 的 8 看护包（= 契约 hostSurface.packages 现行清单：cordis /
 *     schemastery / dsh-settings / dsh-api-gateway / dsh-client-modules / dsh-client-connection /
 *     dsh-home-paths / dsh-tools；cordis/schemastery 版本按 @deepseek-ai/dsh 主包依赖钉解析——契约
 *     versionExceptions 口径：两者是独立版本族，version ≠ hostVersion 合法）在代际代表版本上的
 *     **入口导出名集合** + BUG-011 的 settings/sessions 断面关键词命中
 *     （SettingsForms ↔ SettingsProvider；openSession / retainedBy / mainSessionId ↔ sessions.open）；
 *   · 面 4/6 安装/版本：记录 @deepseek-ai/dsh 主包对 8 看护包 + client 包栈的**依赖钉**（closurePins，
 *     版本环境面的机读事实）；安装锚点是仓库自身事实，由 manifest SURFACE_EVIDENCE 以 fixture-record
 *     登记并由 preflight --surfaces 对仓库文件核验——采集脚本只管 npm 可推导的面。
 *
 * 只读纪律（硬约束）：对宿主包交互**只允许** `npm view <pkg>@<range> version --json`（只读注册表元数据）与
 * `npm pack <pkg>@<ver> --pack-destination <临时目录>`（只读下载 tarball）+ `tar -xzf`（解包到临时目录）。
 * **绝不 install、绝不执行 tarball 内代码、绝不写宿主目录**；产物只落
 * `test/fixtures/host-generations/<gen>/surfaces/surfaces.json`（包名/版本/包内相对路径/行号/短片段——
 * 不含 token、不含用户路径，BC-05）。
 *
 * 产物与消费方（单一判定归 preflight，本脚本只采集不判定——职责三分，与 extract.mjs 同式）：
 *   · 产物：`test/fixtures/host-generations/<gen>/surfaces/surfaces.json`（schemaVersion 1，键排序稳定）；
 *   · manifest：`lib/host-compat/generation-manifest.mjs` 的 SURFACE_EVIDENCE（纯数据）引用本产物，
 *     声明「哪代哪面有什么证据」；
 *   · 校验：`scripts/preflight-preset-rows.mjs --surfaces` 对账 manifest 声明 × 缓存证据（离线可跑；
 *     缓存缺失 ⇒ 显式 SKIP ≠ PASS；篡改 ⇒ 必红）。
 *
 * 再生成（manifest SURFACE_EVIDENCE 声明的再生命令，改扫描口径须同步 manifest 注释）：
 *   node scripts/collect-host-surface-evidence.mjs            # 四代际全量（~48 个 tarball，只读）
 *   node scripts/preflight-preset-rows.mjs --surfaces         # 随后对账
 *
 * 用法：
 *   node scripts/collect-host-surface-evidence.mjs                       # 四个已知代际全量（0.1.5-rc.2 / 0.2.0-rc.2 / 0.2.1-rc.2 / 0.2.2-rc.1）
 *   node scripts/collect-host-surface-evidence.mjs --gens decl-0.2.2     # 单代际
 *   node scripts/collect-host-surface-evidence.mjs --scratch <dir>       # 换解包暂存（默认 %TEMP%\compat023-scratch；已有解包则跳过下载）
 *   node scripts/collect-host-surface-evidence.mjs --force               # 清掉暂存重新下载
 * 退出码：0 = 全部目标代际采集完成并落盘；1 = 有代际采集失败（包不可达/版本不存在——如实红，不静默跳过）；
 *         2 = 用法错误。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_ROOT_DEFAULT = join(REPO_ROOT, 'test', 'fixtures', 'host-generations')
const SCRATCH_DEFAULT = join(tmpdir(), 'compat023-scratch')

/** 代际 → npm 代表版本（与 manifest SURFACE_EVIDENCE.representativeVersion 同源；改这里必须同步 manifest）。 */
export const GENERATION_TARGETS = {
  'legacy-0.1': '0.1.5-rc.2',
  'decl-0.2.0': '0.2.0-rc.2',
  'decl-0.2.1': '0.2.1-rc.2',
  'decl-0.2.2': '0.2.2-rc.1',
}

/** 面 2/3 客户端包栈（BUG-012 阶段 A 判定的槽位消费证据位置——宿主 client 包栈，非 web index/vendor bundle）。 */
export const CLIENT_STACK = [
  'dsh-client-ui-layout',
  'dsh-cordis-client-runner',
  'dsh-client-modules',
  'dsh-client-ui-renderer',
  'dsh-client-ui-workspace',
]

/** 面 1 服务端 8 看护包（契约 hostSurface.packages 现行清单 = COMPAT-018/019 看护面；dsh-client-modules 双面承载——client 入口在包栈扫描、服务端入口导出面亦入册）。 */
export const SERVER_WATCHED = [
  'cordis',
  'schemastery',
  'dsh-settings',
  'dsh-api-gateway',
  'dsh-client-modules',
  'dsh-client-connection',
  'dsh-home-paths',
  'dsh-tools',
]

/** 面 2 槽位名（契约 regionLiterals 登记面 = 插件注册的全部宿主槽位）。 */
export const SLOT_NAMES = ['shell.overlay', 'sidebar.footer.action', 'settings.section']

/** 面 3 DOM 物化锚点（宿主把已注册槽位物化成 DOM 的属性形态 + 会话根约定）。 */
export const DOM_ANCHORS = [
  { key: 'overlayContainer', literal: 'data-shell-overlay' },
  { key: 'slotHost', literal: 'data-slot' },
  { key: 'phaseRoot', literal: 'data-phase' },
]

/** BUG-011 settings/sessions 断面关键词（跨代际形态差异的事实锚点）。 */
export const CROSS_SECTION_KEYS = ['SettingsForms', 'SettingsProvider', 'openSession', 'retainedBy', 'mainSessionId', 'sessions.open']

const NPM_SHELL = process.platform === 'win32'

// ── 参数 ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { gens: Object.keys(GENERATION_TARGETS), scratch: SCRATCH_DEFAULT, outRoot: OUT_ROOT_DEFAULT, force: false }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--gens') {
      const raw = String(argv[++i] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '')
      for (const g of raw) {
        if (!(g in GENERATION_TARGETS)) { console.error(`[collect] 用法错误：未知代际 ${g}（合法：${Object.keys(GENERATION_TARGETS).join(', ')}）`); process.exit(2) }
      }
      opts.gens = raw
    } else if (a === '--scratch') opts.scratch = resolve(String(argv[++i]))
    else if (a === '--out-root') opts.outRoot = resolve(String(argv[++i]))
    else if (a === '--force') opts.force = true
    else if (a === '--help' || a === '-h') {
      console.log('用法：node scripts/collect-host-surface-evidence.mjs [--gens <id,...>] [--scratch <dir>] [--out-root <dir>] [--force]')
      process.exit(0)
    } else { console.error(`[collect] 用法错误：未知参数 ${a}`); process.exit(2) }
  }
  return opts
}

// ── 只读下载与解包 ────────────────────────────────────────────────────────────
function npmViewVersion(pkg, range) {
  const r = spawnSync('npm', ['view', `${pkg}@${range}`, 'version', '--json'], { encoding: 'utf8', shell: NPM_SHELL })
  if (r.status !== 0) return null
  try {
    const parsed = JSON.parse(String(r.stdout).trim())
    // range 多命中（如 ~4.0.4 命中 4.0.4+4.0.5）⇒ 取最高版（与 npm 安装语义一致：range 内最高可满足版）
    if (typeof parsed === 'string') return parsed
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((v) => typeof v === 'string')) {
      return [...parsed].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[parsed.length - 1]
    }
    return null
  } catch { return null }
}

const pkgDirName = (shortName) => shortName.replace(/^dsh-/, 'dsh-') // 目录名 = 短名原样（作用域已剥）

function npmPackExtract(pkg, version, destDir) {
  const pkgDir = join(destDir, pkgDirName(pkg.replace(/^@deepseek-ai\//, '')))
  const extracted = join(pkgDir, 'package')
  if (existsSync(join(extracted, 'package.json'))) return { pkgDir, extracted, cached: true }
  mkdirSync(pkgDir, { recursive: true })
  const pack = spawnSync('npm', ['pack', `${pkg}@${version}`, '--pack-destination', pkgDir, '--json'], { encoding: 'utf8', shell: NPM_SHELL })
  if (pack.status !== 0) return { error: `npm pack ${pkg}@${version} 失败：${String(pack.stderr || pack.stdout).split('\n')[0]}` }
  let tarball = null
  try {
    const meta = JSON.parse(String(pack.stdout).trim())
    const first = Array.isArray(meta) ? meta[0] : meta
    if (first && typeof first.filename === 'string') tarball = join(pkgDir, first.filename)
  } catch { /* --json 解析失败 → 按目录内唯一 .tgz 兜底 */ }
  if (tarball === null || !existsSync(tarball)) {
    const tgz = readdirSync(pkgDir).filter((f) => f.endsWith('.tgz'))
    if (tgz.length !== 1) return { error: `npm pack 产物不唯一：${tgz.join(', ')}` }
    tarball = join(pkgDir, tgz[0])
  }
  const untar = spawnSync('tar', ['-xzf', tarball, '-C', pkgDir], { encoding: 'utf8' })
  if (untar.status !== 0) return { error: `tar 解包失败：${String(untar.stderr || '').split('\n')[0]}` }
  if (!existsSync(join(extracted, 'package.json'))) return { error: '解包后缺 package/package.json' }
  return { pkgDir, extracted, cached: false }
}

// ── 扫描原语（文本级正则 + 行号换算；多行注册形态由 [^{}]{0,160}? 窗口跨行匹配）──
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 文本级命中：[{ index, line, snippet }]（行号 = 命中点所在行；snippet = 命中点起 ≤160 字符、换行折叠）。 */
function findTextHits(text, lineStarts, regex) {
  const hits = []
  regex.lastIndex = 0
  for (let guard = 0; guard < 24; guard += 1) {
    const m = regex.exec(text)
    if (m === null) break
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= m.index) lo = mid; else hi = mid - 1 }
    hits.push({
      line: lo + 1,
      snippet: text.slice(m.index, m.index + 160).replace(/\r?\n/g, '⏎'),
    })
  }
  return hits
}

function lineStartsOf(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1)
  return starts
}

/** 在包内可扫描 js 文件（lib/dist/顶层顶层 *.js，排除 .min.js 与 types 目录）里建扫描面。 */
function scanTargets(extracted) {
  const out = []
  const seen = new Set()
  const add = (abs, rel) => {
    if (seen.has(rel) || !existsSync(abs) || !statSync(abs).isFile()) return
    seen.add(rel)
    out.push({ rel, text: readFileSync(abs, 'utf8') })
  }
  for (const sub of ['lib', 'dist', '.']) {
    const dir = join(extracted, sub)
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
      add(join(dir, f), sub === '.' ? f : `${sub}/${f}`)
    }
  }
  return out
}

/** 面 2：槽位证据链四形态（注册 A 对象键 / 注册 B 键字段 / renderSlot 消费 / slots.inject 注入 API / name 条目注册）。 */
function scanSlots(targets) {
  const slots = {}
  for (const slot of SLOT_NAMES) {
    const cell = { registration: [], renderSlot: [], injectDoc: [], entryName: [] }
    for (const t of targets) {
      const starts = lineStartsOf(t.text)
      const push = (kind, hits, form) => { for (const h of hits) cell[kind].push({ package: null, file: t.rel, form, ...h }) }
      push('registration', findTextHits(t.text, starts, new RegExp(`["']${escapeRe(slot)}["']\\s*:\\s*\\{[^{}]{0,160}?kind\\s*:`, 'g')), 'object-key')
      push('registration', findTextHits(t.text, starts, new RegExp(`key\\s*:\\s*["']${escapeRe(slot)}["'][^{}]{0,160}?kind\\s*:`, 'g')), 'key-field')
      push('renderSlot', findTextHits(t.text, starts, new RegExp(`renderSlot\\s*\\(\\s*["']${escapeRe(slot)}["']`, 'g')), 'renderSlot')
      push('injectDoc', findTextHits(t.text, starts, new RegExp(`slots\\.inject\\s*\\(\\s*["']${escapeRe(slot)}["']`, 'g')), 'slots.inject')
      push('entryName', findTextHits(t.text, starts, new RegExp(`name\\s*:\\s*["']${escapeRe(slot)}["']`, 'g')), 'entry-name')
    }
    slots[slot] = cell
  }
  return slots
}

/** 面 3 + 断面：DOM 物化锚点与 settings/sessions 关键词命中。 */
function scanDomAndCrossSection(targets) {
  const domAnchors = {}
  for (const anchor of DOM_ANCHORS) {
    domAnchors[anchor.key] = []
    for (const t of targets) {
      for (const h of findTextHits(t.text, lineStartsOf(t.text), new RegExp(escapeRe(anchor.literal), 'g'))) {
        domAnchors[anchor.key].push({ package: null, file: t.rel, ...h })
      }
    }
  }
  const crossSection = {}
  for (const key of CROSS_SECTION_KEYS) {
    crossSection[key] = []
    for (const t of targets) {
      for (const h of findTextHits(t.text, lineStartsOf(t.text), new RegExp(escapeRe(key), 'g'))) {
        crossSection[key].push({ package: null, file: t.rel, ...h })
      }
    }
  }
  return { domAnchors, crossSection }
}

/** 面 1：服务端包入口导出名集合（静态提取：export 声明/列表/default/exports.* ——与 host-surfaces extract.mjs 同口径的子集）。 */
function extractExportNames(entryText) {
  const names = new Set()
  for (const m of entryText.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const seg = part.trim()
      if (seg === '') continue
      const asMatch = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(seg)
      names.add(asMatch !== null ? asMatch[2] : seg.split(/\s+/)[0])
    }
  }
  for (const m of entryText.matchAll(/export\s+(?:const|let|var|function|class|async\s+function)\s+([\w$]+)/g)) names.add(m[1])
  if (/export\s+default/.test(entryText)) names.add('default')
  for (const m of entryText.matchAll(/(?:module\.)?exports\.([\w$]+)\s*=/g)) names.add(m[1])
  // CJS 兜底：`module.exports = X`（schemastery 形态——整个模块导出一个 Schema 函数）⇒ 与既有
  // host-surfaces fixture 口径一致记为 'default'（契约 requiredExports['@deepseek-ai/schemastery'] = ['default']）。
  if (/module\.exports\s*=/.test(entryText) && !/module\.exports\s*=\s*\{/.test(entryText)) names.add('default')
  return [...names].filter((n) => /^[\w$]+$/.test(n)).sort()
}

function serverPackageEntry(extracted, pkgJson) {
  if (typeof pkgJson.main === 'string') {
    const p = join(extracted, pkgJson.main)
    if (existsSync(p)) return p
    for (const cand of [p + '.js', join(p, 'index.js')]) if (existsSync(cand)) return cand
  }
  if (pkgJson.exports) {
    const pick = (value) => {
      if (typeof value === 'string') return value
      if (Array.isArray(value)) { for (const v of value) { const r = pick(v); if (r !== null) return r }; return null }
      if (value !== null && typeof value === 'object') { for (const key of ['require', 'node', 'default', 'import']) if (value[key] !== undefined) { const r = pick(value[key]); if (r !== null) return r } }
      return null
    }
    const target = pkgJson.exports['.'] !== undefined ? pick(pkgJson.exports['.']) : pick(pkgJson.exports)
    if (typeof target === 'string') {
      const p = join(extracted, target)
      if (existsSync(p)) return p
    }
  }
  const fallback = join(extracted, 'index.js')
  return existsSync(fallback) ? fallback : null
}

// ── 主流程 ───────────────────────────────────────────────────────────────────
const opts = parseArgs(process.argv.slice(2))
if (opts.force === true && opts.scratch === SCRATCH_DEFAULT) rmSync(SCRATCH_DEFAULT, { recursive: true, force: true })
mkdirSync(opts.scratch, { recursive: true })
let failed = 0
const summary = []

for (const gen of opts.gens) {
  const genVersion = GENERATION_TARGETS[gen]
  const genScratch = join(opts.scratch, gen)
  mkdirSync(genScratch, { recursive: true })
  console.log(`\n[collect] 代际 ${gen} @ ${genVersion}`)

  const errors = []
  let cachedCount = 0

  // ① dsh 主包：解析闭包依赖钉（cordis/schemastery 等独立版本族的真源 = 主包 dependencies）
  const dshMain = npmPackExtract('@deepseek-ai/dsh', genVersion, genScratch)
  if (dshMain.error !== undefined) { console.error(`  [red] ${dshMain.error}`); failed += 1; continue }
  if (dshMain.cached === true) cachedCount += 1
  const dshPkgJson = JSON.parse(readFileSync(join(dshMain.extracted, 'package.json'), 'utf8'))
  const deps = dshPkgJson.dependencies ?? {}

  /** 每个目标包的采集版本：优先主包依赖钉；range 钉 → npm view 唯一解析；无钉 → 代际版本兜底（dsh-client-ui-workspace 等未钉包）。 */
  const resolveVersion = (shortName) => {
    const pinned = deps[`@deepseek-ai/${shortName}`]
    if (pinned === undefined) return { version: genVersion, pin: null, via: 'generation-version' }
    if (/^[\w.-]+$/.test(pinned)) return { version: pinned, pin: pinned, via: 'dsh-exact-pin' }
    const resolved = npmViewVersion(`@deepseek-ai/${shortName}`, pinned)
    if (resolved === null) return { version: genVersion, pin: pinned, via: 'range-unresolved→generation-version' }
    return { version: resolved, pin: pinned, via: 'npm-view-resolve' }
  }

  const closurePins = {}
  const clientEvidence = { packages: {}, slots: {}, domAnchors: {}, crossSection: {} }
  const serverEvidence = {}

  const allPackages = [...new Set([...CLIENT_STACK, ...SERVER_WATCHED])]
  for (const shortName of allPackages) {
    const pkg = `@deepseek-ai/${shortName}`
    const { version, pin, via } = resolveVersion(shortName)
    const r = npmPackExtract(pkg, version, genScratch)
    if (r.error !== undefined) { errors.push(`${pkg}: ${r.error}`); continue }
    if (r.cached === true) cachedCount += 1
    const pkgJson = JSON.parse(readFileSync(join(r.extracted, 'package.json'), 'utf8'))
    closurePins[shortName] = { collectedVersion: pkgJson.version, pin: pin ?? genVersion, via }
    const isClient = CLIENT_STACK.includes(shortName)
    if (isClient) {
      const targets = scanTargets(r.extracted)
      clientEvidence.packages[shortName] = { version: pkgJson.version, scannedFiles: targets.map((t) => t.rel) }
      const slots = scanSlots(targets)
      for (const [slot, kinds] of Object.entries(slots)) {
        clientEvidence.slots[slot] ??= { registration: [], renderSlot: [], injectDoc: [], entryName: [] }
        for (const [kind, hits] of Object.entries(kinds)) {
          for (const hit of hits) clientEvidence.slots[slot][kind].push({ ...hit, package: shortName })
        }
      }
      const { domAnchors, crossSection } = scanDomAndCrossSection(targets)
      for (const [key, hits] of Object.entries(domAnchors)) {
        clientEvidence.domAnchors[key] ??= []
        for (const hit of hits) clientEvidence.domAnchors[key].push({ ...hit, package: shortName })
      }
      for (const [key, hits] of Object.entries(crossSection)) {
        clientEvidence.crossSection[key] ??= []
        for (const hit of hits) clientEvidence.crossSection[key].push({ ...hit, package: shortName })
      }
    } else {
      const entry = serverPackageEntry(r.extracted, pkgJson)
      const exports = entry === null ? [] : extractExportNames(readFileSync(entry, 'utf8'))
      const entryRel = entry === null ? null : entry.slice(r.extracted.length + 1).replace(/\\/g, '/')
      serverEvidence[shortName] = { version: pkgJson.version, entry: entryRel, exports }
    }
    // 8 看护包中归属 client 栈的包（dsh-client-modules）：其**服务端入口导出面**同样入册（面 1 的
    // 看护清单按包名对账，不因包同时承载 client 入口而缺面）。
    if (isClient && SERVER_WATCHED.includes(shortName)) {
      const entry = serverPackageEntry(r.extracted, pkgJson)
      const exports = entry === null ? [] : extractExportNames(readFileSync(entry, 'utf8'))
      const entryRel = entry === null ? null : entry.slice(r.extracted.length + 1).replace(/\\/g, '/')
      serverEvidence[shortName] = { version: pkgJson.version, entry: entryRel, exports }
    }
  }

  // settings/sessions 断面的 settings 侧：证据在 dsh-settings 服务端包导出面（SettingsForms ↔ SettingsProvider）
  const settingsPkg = serverEvidence['dsh-settings']
  if (settingsPkg !== undefined) {
    for (const key of ['SettingsForms', 'SettingsProvider']) {
      clientEvidence.crossSection[key] ??= []
      if (settingsPkg.exports.includes(key)) {
        clientEvidence.crossSection[key].push({ package: 'dsh-settings', file: settingsPkg.entry, line: null, snippet: `entry export face contains "${key}"` })
      }
    }
  }

  const outDir = join(opts.outRoot, gen, 'surfaces')
  const evidence = {
    schemaVersion: 1,
    generation: gen,
    hostVersion: genVersion,
    collectedAt: new Date().toISOString().slice(0, 10),
    source: 'npm-tarball-scan',
    sourceNote: 'npm view（只读元数据）+ npm pack（只读下载）+ tar 解包扫描；不 install、不执行包内代码。npm tarball = 桌面实装事实源（BUG-012 阶段 A 实证）。',
    slotNames: SLOT_NAMES,
    closurePins,
    client: clientEvidence,
    server: serverEvidence,
    errors,
  }
  const sortDeep = (value) => {
    if (Array.isArray(value)) return value.map(sortDeep)
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortDeep(value[k])]))
    }
    return value
  }
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'surfaces.json'), JSON.stringify(sortDeep(evidence), null, 2) + '\n')

  const slotStat = Object.fromEntries(SLOT_NAMES.map((slot) => {
    const s = clientEvidence.slots[slot] ?? { registration: [], renderSlot: [], injectDoc: [], entryName: [] }
    return [slot, `reg:${s.registration.length} call:${s.renderSlot.length} inject:${s.injectDoc.length} name:${s.entryName.length}`]
  }))
  console.log(`  产物 = ${join(outDir, 'surfaces.json')}（缓存命中 ${cachedCount}/${allPackages.length + 1} 包）`)
  console.log(`  槽位证据：${JSON.stringify(slotStat)}`)
  console.log(`  服务端导出面：${Object.entries(serverEvidence).map(([k, v]) => `${k}@${v.version}=${v.exports.length}导出`).join(' / ')}`)
  if (errors.length > 0) { console.error(`  采集错误 ${errors.length} 项：${errors.join(' | ')}`); failed += 1 }
  summary.push({ generation: gen, hostVersion: genVersion, slots: slotStat, serverPackages: Object.keys(serverEvidence).length, errors: errors.length })
}

console.log(`\n[collect] 汇总：${summary.map((s) => `${s.generation}@${s.hostVersion}(${s.errors === 0 ? 'OK' : s.errors + ' 项错误'})`).join('；')}`)
console.log('[collect] 下一步：node scripts/preflight-preset-rows.mjs --surfaces（manifest 声明 × 本证据对账）')
process.exit(failed === 0 ? 0 : 1)
