#!/usr/bin/env node
/**
 * probe-host.mjs — 宿主能力探针固化（COMPAT-008 / DEC-025 轴④ D3；方法论来源 = BUG-004/005 的实机排查）。
 *
 * 目标（一条命令复现「断在哪一层」）：隔离实例（`DSH_HOME` 重定向到 `os.tmpdir()` 下的临时目录）→ 起宿主 →
 * 无头浏览器能力探测 → 输出**与契约（lib/host-contract.mjs）的能力 diff 报告**（逐层：服务端 API / 客户端 API /
 * DOM 前端约定 / 安装注册 / 预设 manifest / 版本环境），第一处缺面的层即「断点层」。
 *
 * 两种模式（**能力边界必须分清**）：
 *   `--self-check`（默认；**离线**）——不启宿主、不联网、不起浏览器：用契约 × fixtures 做**能力面双向差集自检**，
 *       并打印实机模式将要执行的**命令计划 + 隔离方案**（含每条命令与其环境变量重定向）。可在任意开发机 / CI
 *       sanity 内运行（ci.yml 步骤「宿主能力探针离线自检」）。**本条模式已在本仓验证**。
 *   `--run`（实机）——隔离实例起宿主 + 无头浏览器探测 + 真实能力 diff。**REAL-RUN: UNVERIFIED**：需**运行中的宿主
 *       环境**（`dsh` CLI 在 PATH、可用的浏览器自动化依赖或宿主的 DOM）；本仓开发环境与 CI **均未执行过**本模式，
 *       其输出 MUST 经人工确认后才可作为宿主兼容性证据（**禁止**据此宣称「实机已验证」）。首次使用见 README
 *       「维护者：一条命令定位断在哪一层」节。
 *
 * 隔离与安全纪律（M7.7「隔离环境」三选一之第一项；硬约束）：
 *   · 全部写入落在 `mkdtempSync(tmpdir())` 隔离目录内：`DSH_HOME=<tmp>/dsh-home`（插件的 profiles / .agent-presets /
 *     settings.yaml 写入面全部由它派生）＋ `npm_config_cache` / `npm_config_userconfig` / `npm_config_globalconfig`
 *     三重定向（COMPAT-007 隔离验证同款口径）；
 *   · **不触碰真实 `$HOME` / `$DSH_HOME`**：本进程不使用、不导出、不写入它们；实机模式下若 `DSH_HOME` 解析结果不在
 *     临时根内，脚本 **拒绝执行**（fail-closed）；
 *   · 只读探测：仅 `GET`（liveness + `/novel-writing/api/compat` 只读诊断路由），不调用任何写路由、不 install、
 *     不改宿主目录；浏览器侧只做 DOM/能力探测（无点击、无表单提交、无写操作）；
 *   · 逐条上报：实机模式**先打印命令计划**（命令 + 环境变量 + 影响路径）再执行，便于逐条留痕（团队纪律）。
 *
 * 退出码：0 = 无缺面（或离线自检通过）；1 = 检出缺面 / diff 非空；2 = 用法或环境错误（含「宿主不可用」）。
 *
 * 用法：
 *   node scripts/probe-host.mjs                  # = --self-check
 *   node scripts/probe-host.mjs --self-check [--json-out <path>]
 *   node scripts/probe-host.mjs --run [--port 3210] [--timeout 90] [--host-cmd <path>] [--stage-plugin] [--keep] [--json-out <path>]
 *     （--stage-plugin = 先把本仓插件接入隔离 DSH_HOME 再读数——不传则空 home 起宿主，面 1 只能读到「插件未装载」缺面）
 */
import { existsSync, readFileSync, readdirSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, openSync, closeSync, symlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import http from 'node:http'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const CONTRACT = join(REPO_ROOT, 'lib', 'host-contract.mjs')
const FIXTURES_DIR = join(REPO_ROOT, 'test', 'fixtures', 'host-surfaces')
const PRESET_DIR = join(REPO_ROOT, 'agent-presets', 'novel-writing')
const COMPAT_ROUTE = '/novel-writing/api/compat'
const REAL_RUN_STATE = 'REAL-RUN: UNVERIFIED'   // 固定标记：实机模式未验证（smoke 接线守卫断言其存在，防「静默转已验证」）
const SELF_CHECK_STATE = 'SELF-CHECK: VERIFIED-IN-REPO'
const LAYER_NAMES = { 1: '服务端 API 面', 2: '客户端 API 面', 3: '宿主 DOM·前端约定面', 4: '安装与注册机制面', 5: '预设与 manifest 面', 6: '版本与环境面' }

const die = (msg) => { console.error('[probe-host] 用法/环境错误：' + msg); process.exit(2) }
const line = (s) => console.log(s)

function parseArgs(argv) {
  const opts = { mode: 'self-check', port: 3210, timeoutSec: 90, keep: false, jsonOut: null, hostCmd: null, stagePlugin: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--run') opts.mode = 'run'
    else if (a === '--self-check') opts.mode = 'self-check'
    else if (a === '--keep') opts.keep = true
    else if (a === '--port') opts.port = Number(argv[++i])
    else if (a === '--timeout') opts.timeoutSec = Number(argv[++i])
    else if (a === '--json-out') opts.jsonOut = argv[++i]
    else if (a === '--host-cmd') opts.hostCmd = argv[++i]
    else if (a === '--stage-plugin') opts.stagePlugin = true
    else if (a === '--help' || a === '-h') opts.mode = 'help'
    else die('未知参数 ' + a + '（--help 查看用法）')
  }
  return opts
}

/** 宿主命令解析：显式 `--host-cmd` 优先，否则在 PATH 中查 dsh（Windows 兼容 .cmd/.exe/.ps1）。 */
function resolveHostCommand(explicit) {
  if (explicit !== null && explicit !== undefined) return existsSync(explicit) ? explicit : null
  const names = process.platform === 'win32' ? ['dsh.cmd', 'dsh.exe', 'dsh.ps1', 'dsh'] : ['dsh']
  for (const dir of String(process.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':')) {
    if (dir === '') continue
    for (const n of names) if (existsSync(join(dir, n))) return join(dir, n)
  }
  return null
}

/** 隔离方案（两种模式共用同一口径；实机模式据此建目录并校验）。 */
function isolationPlan(root) {
  return {
    root,
    env: {
      DSH_HOME: join(root, 'dsh-home'),
      npm_config_cache: join(root, 'npm-cache'),
      npm_config_userconfig: join(root, 'npmrc'),
      npm_config_globalconfig: join(root, 'npmrc-global'),
    },
  }
}

/** 打印命令计划（逐条上报：命令 + 环境变量 + 影响路径）。 */
function printPlan(plan, commands) {
  line('[probe-host] 隔离方案（写入面全部落在临时根内；真实 $HOME / $DSH_HOME 不被使用）')
  line('  临时根 = ' + plan.root)
  for (const [k, v] of Object.entries(plan.env)) line('  env ' + k + ' = ' + v)
  line('[probe-host] 命令计划（逐条；实机模式按此执行）')
  for (const c of commands) line('  $ ' + c)
}

// ── 能力面载入（契约 + fixtures，只读）────────────────────────────────────────
function loadSurface() {
  if (!existsSync(CONTRACT)) die('契约不存在：' + CONTRACT)
  if (!existsSync(FIXTURES_DIR)) die('fixtures 目录不存在：' + FIXTURES_DIR)
  const fixtures = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json')).sort()
    .map((f) => ({ file: f, data: JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf8')) }))
  if (fixtures.length === 0) die('fixtures 目录无 *.json：' + FIXTURES_DIR)
  return { fixtures }
}

/** 取源码中某个 `const X = { … }` 字面量的**完整块**（花括号配平；避免 indexOf('}') 被行内 `({ … })` 提前截断）。 */
function objectBlock(src, marker) {
  const lines = src.split('\n')
  const start = lines.findIndex((l) => l.includes(marker))
  if (start < 0) return ''
  let depth = 0
  for (let i = start; i < lines.length; i++) {
    depth += (lines[i].match(/\{/g) ?? []).length - (lines[i].match(/\}/g) ?? []).length
    if (i > start && depth <= 0) return lines.slice(start, i + 1).join('\n')
  }
  return lines.slice(start).join('\n')
}

/** 逐层能力面自检（离线）：契约声明 × 仓内实证（fixtures / 源码 / 安装脚本 / 预设）。 */
function layerChecks(hc, fixtures) {
  const rows = []
  const current = fixtures.find((f) => f.data.hostVersion === hc.hostSurface.current) ?? fixtures[fixtures.length - 1]
  const push = (layer, name, ok, detail) => rows.push({ layer, name, ok, detail })

  // L1 服务端 API 面：契约 requiredExports ⊆ 现行 fixture 实测导出面；eliminatedExports 不在现行面内
  const reqBad = []
  for (const [pkg, names] of Object.entries(hc.hostSurface.requiredExports)) {
    const face = current.data.packages[pkg.replace('@deepseek-ai/', '')]
    if (face === undefined) { reqBad.push(pkg + ':fixture 无该包'); continue }
    for (const n of names) if (!face.exports.includes(n)) reqBad.push(pkg + ':' + n)
  }
  push(1, 'requiredExports ⊆ 现行 fixture 导出面（' + Object.keys(hc.hostSurface.requiredExports).length + ' 包）', reqBad.length === 0, 'missing=' + JSON.stringify(reqBad))
  const elimBad = []
  for (const [pkg, names] of Object.entries(hc.hostSurface.eliminatedExports)) {
    const face = current.data.packages[pkg.replace('@deepseek-ai/', '')]
    if (face !== undefined) for (const n of names) if (face.exports.includes(n)) elimBad.push(pkg + ':' + n)
  }
  push(1, 'eliminatedExports 不在现行 fixture 导出面内（消除口径可核）', elimBad.length === 0, 'unexpected=' + JSON.stringify(elimBad))
  // 服务端边界导出（收口层）存在性：面 1 的收口承诺以 lib/host-boundary.js 为唯一落点
  const boundary = existsSync(join(REPO_ROOT, 'lib', 'host-boundary.js')) ? readFileSync(join(REPO_ROOT, 'lib', 'host-boundary.js'), 'utf8') : ''
  push(1, '服务端收口层 lib/host-boundary.js 在场且导出 contractProjection()（探针消费的契约投影出口）',
    boundary.includes('export function contractProjection()'), 'len=' + boundary.length)

  // L2 客户端 API 面：契约 clientProbes[] 的 probe 键 ⊆ lib/client.js CLIENT_PROBES 常数键
  const clientSrc = existsSync(join(REPO_ROOT, 'lib', 'client.js')) ? readFileSync(join(REPO_ROOT, 'lib', 'client.js'), 'utf8') : ''
  const probesBlock = objectBlock(clientSrc, 'const CLIENT_PROBES = {')
  const probeBad = hc.clientProbes.filter((p) => !probesBlock.includes("'" + p.probe + "'")).map((p) => p.probe)
  push(2, '契约 clientProbes[]（' + hc.clientProbes.length + ' 项）probe 键 ⊆ 客户端 CLIENT_PROBES 常数（浏览器层探测面的机读来源）', probeBad.length === 0, 'missing=' + JSON.stringify(probeBad))

  // L3 DOM·前端约定面：regionLiterals.domSelectors / slotNames 在客户端源码内可提取
  const domMissing = hc.regionLiterals.domSelectors.filter((s) => !clientSrc.includes("'" + s + "'") && !clientSrc.includes(s))
  const slotMissing = hc.regionLiterals.slotNames.filter((s) => !clientSrc.includes("'" + s + "'"))
  push(3, 'regionLiterals（DOM selector ' + hc.regionLiterals.domSelectors.length + ' / 槽位名 ' + hc.regionLiterals.slotNames.length + '）在 lib/client.js 内可提取',
    domMissing.length === 0 && slotMissing.length === 0, 'dom=' + JSON.stringify(domMissing) + ' slot=' + JSON.stringify(slotMissing))

  // L4 安装与注册机制面：两脚本头部布局契约块（COMPAT-009 单点清单）与关键约定在场
  const installSrcs = ['install.ps1', 'install.sh'].map((f) => (existsSync(join(REPO_ROOT, f)) ? readFileSync(join(REPO_ROOT, f), 'utf8') : ''))
  const installBad = []
  for (const [i, src] of installSrcs.entries()) {
    const f = ['install.ps1', 'install.sh'][i]
    if (!src.includes('host-contract:v1')) installBad.push(f + ':缺布局契约标记块')
    for (const lit of ['profiles/<Profile>/package.json', 'dsh.profile.bundles', '.agent-presets/<preset-id>/']) {
      if (!src.includes(lit)) installBad.push(f + ':缺约定字面量 ' + lit)
    }
  }
  push(4, 'install 脚本（2 份）头部布局契约块 + 关键约定字面量在场（与契约 face 4/5 对账的下游消费面）', installBad.length === 0, 'bad=' + JSON.stringify(installBad))

  // L5 预设与 manifest 面：预设目录 + 清单文件在场（宿主预设选择器消费）
  const presetBad = ['preset.yml', 'agent.cordis.yml'].filter((f) => !existsSync(join(PRESET_DIR, f)))
  const skillCount = existsSync(join(PRESET_DIR, 'skills')) ? readdirSync(join(PRESET_DIR, 'skills')).filter((d) => existsSync(join(PRESET_DIR, 'skills', d, 'SKILL.md'))).length : 0
  push(5, '预设目录 agent-presets/novel-writing/（preset.yml + agent.cordis.yml + SKILL ' + skillCount + ' 项）在场', presetBad.length === 0 && skillCount >= 25, 'missing=' + JSON.stringify(presetBad) + ' skills=' + skillCount)

  // L6 版本与环境面：契约 current ∈ fixtures hostVersion 集 ∧ 三版本标记 golden 一致
  const coveredHost = fixtures.map((f) => f.data.hostVersion).sort()
  const factBad = hc.hostSurface.versionFacts.filter((vf) => {
    const fx = fixtures.find((f) => f.data.hostVersion === vf.version)
    if (fx === undefined) return true
    const m = Object.fromEntries(Object.entries(fx.data.markers ?? {}).map(([k, v]) => [k, v.value]))
    return ['settingsNamespaceExported', 'connectionApiDomainField', 'remoteNamespaceServicePackages'].some((k) => m[k] !== vf[k])
  }).map((vf) => vf.version)
  push(6, '契约 current=' + hc.hostSurface.current + ' ∈ fixtures 覆盖集（' + coveredHost.join(' / ') + '）∧ 三版本标记 golden 与 fixtures 实测一致',
    coveredHost.includes(hc.hostSurface.current) && factBad.length === 0, 'covered=' + JSON.stringify(coveredHost) + ' factBad=' + JSON.stringify(factBad))
  return rows
}

// ── 离线自检（--self-check）──────────────────────────────────────────────────
function selfCheck(opts) {
  const started = Date.now()
  const { fixtures } = loadSurface()
  const root = join(tmpdir(), 'nv-probe-host-<random>')
  const plan = isolationPlan(root)
  // 环境重定向是「实机模式」的前置条件：离线自检**不读取**外部 DSH_HOME 内容，仅如实披露其存在
  const externalDshHome = (process.env.DSH_HOME ?? '') === '' ? null : process.env.DSH_HOME
  return import(pathToFileURL(CONTRACT).href).then(({ hostContract }) => {
    const rows = layerChecks(hostContract, fixtures)
    const problems = rows.filter((r) => !r.ok)
    line('[probe-host] ' + SELF_CHECK_STATE + ' — 离线能力面自检（零网络 / 零宿主进程 / 零浏览器）')
    line('  契约：' + CONTRACT + '（schemaVersion=' + hostContract.schemaVersion + '，items=' + hostContract.items.length + '）')
    line('  fixtures：' + fixtures.map((f) => f.file).join(', '))
    for (const r of rows) line('  ' + (r.ok ? '✅' : '❌') + ' [L' + r.layer + ' ' + LAYER_NAMES[r.layer] + '] ' + r.name + (r.ok ? '' : ' :: ' + r.detail))
    const firstBad = rows.find((r) => !r.ok)
    line('  断点层（离线面）：' + (firstBad === undefined ? '无缺面（6/6 层自检通过）' : 'L' + firstBad.layer + ' ' + LAYER_NAMES[firstBad.layer]))
    line('  隔离状态：离线自检**不落盘任何宿主/配置路径**（只读仓内文件）；' + (externalDshHome === null ? '外部 DSH_HOME 未设置' : '检测到外部 DSH_HOME=' + externalDshHome + ' —— 不读取其内容，实机模式强制重定向到隔离根'))
    printPlan(plan, [
      plan.env.DSH_HOME + ' 下 mkdir -p dsh-home（隔离实例根）',
      '<host-cmd> web --port ' + opts.port + ' --no-open   （env 见上；stdio 落 <tmp>/host.log）',
      'GET http://127.0.0.1:' + opts.port + '/            （liveness 轮询，只读）',
      'GET http://127.0.0.1:' + opts.port + COMPAT_ROUTE + '   （只读诊断路由 ⇒ 服务端能力报告）',
      '<browser> headless → DOM/槽位/会话根能力探测       （无浏览器自动化依赖 ⇒ 该层标注 unavailable，不伪造）',
    ])
    line('[probe-host] 实机模式状态：' + REAL_RUN_STATE + '（需运行中宿主环境 —— 本仓开发环境与 CI 均未执行；输出须人工确认）')
    const report = { mode: 'self-check', state: SELF_CHECK_STATE, ok: problems.length === 0, durationMs: Date.now() - started, rows, externalDshHome, isolation: 'offline：零落盘；run：写入面全部重定向至临时根（真实 $HOME/$DSH_HOME 不写入）', realRunState: REAL_RUN_STATE }
    if (opts.jsonOut !== null) { writeFileSync(opts.jsonOut, JSON.stringify(report, null, 2) + '\n'); line('  报告已写入：' + opts.jsonOut) }
    if (problems.length > 0) { console.error('[probe-host] FAIL：' + problems.length + ' 层缺面'); process.exit(1) }
    line('[probe-host] OK：离线自检 6/6 层通过（实机模式仍为 ' + REAL_RUN_STATE + '）')
  })
}

// ── 实机探针（--run；未验证）─────────────────────────────────────────────────
function httpGet(url, timeoutMs) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { body += c })
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('timeout', () => { req.destroy(new Error('timeout')) })
    req.on('error', (e) => resolve({ status: null, body: '', error: String(e.message ?? e) }))
  })
}

function stopHost(child) {
  if (child === null || child.pid === undefined) return
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else process.kill(-child.pid, 'SIGTERM')
  } catch { /* 进程可能已退出 */ }
}

/** 宿主进程 spawn 适配（COMPAT-018 实跑取证修复；R1 F1/F2 返工 2026-11-08）：
 *  Node ≥ 20.12（CVE-2024-27980，本机 v24）在 win32 上禁止无 `shell` 直接 spawn `.cmd`/`.bat`
 *  （spawn EINVAL）——改为显式经 `process.env.ComSpec` 包装：`cmd.exe /d /c <hostCmd> <args…>`。
 *  选 ComSpec 显式包装而非 `{shell:true}`：参数按数组逐元素传递、由 Node/libuv 标准规则转义（仅含空白元素加引号），
 *  比 shell:true 的整串拼接更可控。
 *  **不用 `/s`（R1 F1 返工）**：libuv 对含空格路径只包**一对**引号，而 `/s` 强制 cmd 剥首+末引号——含空格的
 *  hostCmd 被拆成裸路径（R1 T1 实证 `'…\my' is not recognized`）；无 `/s` 时 cmd 默认引号规则对「恰两引号 +
 *  内部空白 + 可执行文件名」**保留整对引号**，空格路径按原语义执行（R1 复现集微测通过，见 COMPAT-018 证据 §7）。
 *  转义边界（R1 F2：代码强制，非仅注释声明）：固定子参数（'web'/'--port'/'--no-open'）与 port/timeout（内部数字）
 *  不含引号或 cmd 元字符；win32 `.cmd`/`.bat` 形态的 hostCmd 含 `"`/`&`/`|`/`<`/`>`/`^`/`%` 会被 cmd 拆分命令/
 *  展开变量（R1 T2 实证 `&` 路径被误执行）⇒ realRun 解析后即 `assertHostCmdSafe` die 拒绝（空格/括号允许——括号
 *  仅影响 cmd 引号保留启发式，其失败形态是响亮报错非静默误执行）。
 *  `.js`/`.mjs`/`.cjs` 宿主命令（如 npm tarball 解包后的 bin 入口，绕开 .cmd 层）统一由 `process.execPath`
 *  （node 本体）承载，避免依赖 PATHEXT/文件关联；其余（非 win32 / `.exe`）保持原直跑路径不变。
 *  收尾杀树：win32 下 stopHost 的 `taskkill /pid <cmd包装pid> /T /F` 按进程树终止——包装 cmd 与宿主 node 孙进程一并回收。 */
function hostSpawn(file, args, spawnOpts) {
  const lower = String(file).toLowerCase()
  if (process.platform === 'win32' && (lower.endsWith('.cmd') || lower.endsWith('.bat'))) {
    const comspec = process.env.ComSpec ?? 'cmd.exe'
    return spawn(comspec, ['/d', '/c', file, ...args], spawnOpts)
  }
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return spawn(process.execPath, [file, ...args], spawnOpts)
  }
  return spawn(file, args, spawnOpts)
}

/** R1 F2（代码强制）：win32 `.cmd`/`.bat` 宿主命令的 cmd 元字符拒绝——该形态经 ComSpec 包装执行，路径中的
 *  `"`/`&`/`|`/`<`/`>`/`^`/`%` 会被 cmd 拆分命令/展开变量（注入面；R1 T2 实证 `&` 路径过 existsSync 后仍被
 *  拆分误执行）。空格/括号放行。在 realRun 解析出 hostCmd 后、任何 spawn/staging 前调用（die = 退出码 2 用法错误）。 */
function assertHostCmdSafe(hostCmd) {
  if (process.platform !== 'win32') return
  const lower = hostCmd.toLowerCase()
  if (!lower.endsWith('.cmd') && !lower.endsWith('.bat')) return
  const bad = [...new Set([...hostCmd].filter((ch) => '"&|<>^%'.includes(ch)))]
  if (bad.length > 0) die('hostCmd（.cmd/.bat）含 cmd 元字符 ' + bad.map((c) => `'${c}'`).join(' ') + ' ——经 cmd.exe 包装执行会被拆分/展开（注入面），拒绝执行（空格/括号允许）')
}

/** `--stage-plugin`（COMPAT-018 实跑取证新增；可选开关，默认关闭 = 原 --run 行为不变）：把**本仓插件**接入隔离
 *  DSH_HOME，使宿主装载它（否则空 home 起来的宿主没有任何插件 ⇒ `/novel-writing/api/compat` 404 ⇒ 面 1 只能报
 *  「插件未装载」层缺面）。通道 = install.ps1 新布局同款官方注册路径的探针内最小实现，两段式：
 *    第一段：空 home 起一次宿主（同端口）让它物化默认 profile（profiles/web/package.json 的 dsh.profile.bundles
 *      由宿主自选——@deepseek-ai/dsh-base / dsh-web-app 等；不硬编码，跨 0.2.0/0.2.2 形状漂移安全），liveness 即杀树；
 *    第二段（staging 本体，幂等）：junction 接入 profiles/web/node_modules/dsh-novel-writing → REPO_ROOT
 *      （win32 junction / posix symlink）+ profile package.json 幂等注册（dependencies.dsh-novel-writing =
 *      file:<repo> + dsh.profile.bundles **追加**，绝不替换既有 bundles——首批实验证实：替换掉 dsh-base/dsh-web-app
 *      会让宿主自身服务（settings/agentPresets）永不起来，插件全部 pending、路由 404）。
 *  读数仍由 --run 主流程的正式启动取得（staging 不改隔离纪律：全部写入落在临时根内）。 */
async function stagePluginIntoIsolatedHome(opts, hostCmd, plan, tmpRoot) {
  const bootLog = join(tmpRoot, 'boot1.log')
  line('[probe-host] --stage-plugin 第一段：空隔离 home 起宿主物化默认 profile（日志 ' + bootLog + '）…')
  const bootFd = openSync(bootLog, 'w')
  const env = { ...process.env, ...plan.env }
  let child = null
  let fatal = null
  let live = null
  try {
    child = hostSpawn(hostCmd, ['web', '--port', String(opts.port), '--no-open'], { cwd: tmpRoot, env, stdio: ['ignore', bootFd, bootFd], detached: process.platform !== 'win32' })
    const base = 'http://127.0.0.1:' + opts.port
    const budget = Math.min(opts.timeoutSec, 90) * 1000
    const deadline = Date.now() + budget
    while (Date.now() < deadline) {
      const r = await httpGet(base + '/', 3000)
      if (r.status !== null && r.status < 500) { live = r; break }
      await new Promise((res) => setTimeout(res, 1500))
    }
    if (live !== null) line('  默认 profile 已物化（liveness http ' + live.status + '）')
    else fatal = '--stage-plugin 第一段失败：宿主在 ' + Math.round(budget / 1000) + 's 内未达 liveness（boot1.log 见临时根）——隔离 home 未物化默认 profile，拒绝继续'
  } finally {
    if (child !== null) stopHost(child)
    closeSync(bootFd)
  }
  if (fatal !== null) die(fatal)
  await new Promise((res) => setTimeout(res, 1500))
  const profileDir = join(plan.env.DSH_HOME, 'profiles', 'web')
  const pkgFile = join(profileDir, 'package.json')
  if (!existsSync(pkgFile)) die('--stage-plugin 失败：' + pkgFile + ' 不在（第一段未物化默认 profile）——如实终止，不伪造装载')
  const dst = join(profileDir, 'node_modules', 'dsh-novel-writing')
  mkdirSync(dirname(dst), { recursive: true })
  if (existsSync(dst)) line('  junction 已存在，跳过：' + dst)
  else {
    try { symlinkSync(REPO_ROOT, dst, process.platform === 'win32' ? 'junction' : 'dir') } catch (e) { die('--stage-plugin 失败：junction/symlink 创建失败（' + String(e.message ?? e) + '）——如实终止') }
    line('  已创建 junction：' + dst + ' -> ' + REPO_ROOT)
  }
  let pkg
  try { pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) } catch (e) { die('--stage-plugin 失败：解析 ' + pkgFile + ' 出错（' + String(e.message ?? e) + '）') }
  const repoFwd = String(REPO_ROOT).replaceAll('\\', '/')
  pkg.dependencies = pkg.dependencies ?? {}
  if (pkg.dependencies['dsh-novel-writing'] === undefined) { pkg.dependencies['dsh-novel-writing'] = 'file:' + repoFwd; line('  已写入 dependencies.dsh-novel-writing = file:' + repoFwd) }
  else line('  dependencies.dsh-novel-writing 已注册，跳过')
  pkg.dsh = pkg.dsh ?? {}
  pkg.dsh.profile = pkg.dsh.profile ?? {}
  const bundles = Array.isArray(pkg.dsh.profile.bundles) ? pkg.dsh.profile.bundles : []
  if (!bundles.includes('dsh-novel-writing')) { pkg.dsh.profile.bundles = [...bundles, 'dsh-novel-writing']; line('  已追加 dsh.profile.bundles += dsh-novel-writing（保留既有 ' + bundles.length + ' 项）') }
  else line('  dsh.profile.bundles 已含 dsh-novel-writing，跳过')
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n')
  line('[probe-host] --stage-plugin 完成：插件已按官方通道接入隔离 profile（正式读数见下一段启动）')
}

async function realRun(opts) {
  line('[probe-host] ⚠️ ' + REAL_RUN_STATE + ' —— 实机模式：需运行中的宿主环境（dsh CLI + 浏览器/DOM）。')
  line('  本仓开发环境与 CI 均未执行过本模式；下列输出 MUST 经人工确认后才可作为宿主兼容性证据（不得据此宣称「实机已验证」）。')
  const hostCmd = resolveHostCommand(opts.hostCmd)
  if (hostCmd === null) {
    die((opts.hostCmd === null || opts.hostCmd === undefined ? '未在 PATH 找到宿主命令 `dsh`（可用 --host-cmd <path> 显式指定）' : '指定的 --host-cmd 路径不存在：' + opts.hostCmd) + '——实机模式不可用，未执行任何操作')
  }
  assertHostCmdSafe(hostCmd)
  const { fixtures } = loadSurface()
  const { hostContract } = await import(pathToFileURL(CONTRACT).href)
  const tmpRoot = mkdtempSync(join(tmpdir(), 'nv-probe-host-'))
  const plan = isolationPlan(tmpRoot)
  const commands = [
    'mkdir -p ' + plan.env.DSH_HOME,
    ...(opts.stagePlugin ? [
      '(stage) <host-cmd> web --port ' + opts.port + ' --no-open   (第一段：空 home 物化宿主默认 profile；杀树后停)',
      '(stage) junction ' + join(plan.env.DSH_HOME, 'profiles', 'web', 'node_modules', 'dsh-novel-writing') + ' -> ' + REPO_ROOT + ' + profile package.json 幂等注册（dependencies + dsh.profile.bundles 追加）',
    ] : []),
    hostCmd + ' web --port ' + opts.port + ' --no-open   (cwd=' + tmpRoot + '；stdio → ' + join(tmpRoot, 'host.log') + ')',
    'GET http://127.0.0.1:' + opts.port + '/   (liveness，只读)',
    'GET http://127.0.0.1:' + opts.port + COMPAT_ROUTE + '   (只读诊断路由)',
  ]
  printPlan(plan, commands)
  // 隔离硬校验（fail-closed）：插件的全部写入面由 DSH_HOME 派生 ⇒ 它 MUST 在临时根内
  if (!plan.env.DSH_HOME.startsWith(tmpRoot)) { rmSync(tmpRoot, { recursive: true, force: true }); die('隔离校验失败：DSH_HOME 不在临时根内（拒绝执行）') }
  mkdirSync(plan.env.DSH_HOME, { recursive: true })
  if (opts.stagePlugin) await stagePluginIntoIsolatedHome(opts, hostCmd, plan, tmpRoot)
  const env = { ...process.env, ...plan.env }
  const logFd = openSync(join(tmpRoot, 'host.log'), 'w')
  const child = hostSpawn(hostCmd, ['web', '--port', String(opts.port), '--no-open'], { cwd: tmpRoot, env, stdio: ['ignore', logFd, logFd], detached: process.platform !== 'win32' })
  line('[probe-host] 宿主已启动（pid=' + String(child.pid) + '）；等待 liveness（上限 ' + opts.timeoutSec + 's）…')
  const base = 'http://127.0.0.1:' + opts.port
  const deadline = Date.now() + opts.timeoutSec * 1000
  let live = null
  while (Date.now() < deadline) {
    const r = await httpGet(base + '/', 3000)
    if (r.status !== null && r.status < 500) { live = r; break }
    await new Promise((res) => setTimeout(res, 1500))
  }
  const rows = []
  const report = { mode: 'run', state: REAL_RUN_STATE, dshHome: plan.env.DSH_HOME, hostCmd, stagePlugin: opts.stagePlugin, port: opts.port, hostLog: join(tmpRoot, 'host.log'), live: live === null ? null : live.status, server: null, browser: null, rows, verdict: null }
  try {
    if (live === null) {
      report.verdict = '宿主未就绪：liveness 超时（日志：' + report.hostLog + '）——探针未取得任何能力读数'
      rows.push({ layer: 1, name: '宿主 liveness', ok: false, detail: 'timeout' })
    } else {
      const compat = await httpGet(base + COMPAT_ROUTE, 8000)
      let payload = null
      try { payload = compat.status === 200 ? JSON.parse(compat.body) : null } catch { payload = null }
      report.server = payload === null ? { status: compat.status, parseError: true } : payload
      const face1 = hostContract.items.filter((it) => it.face === 1)
      const probes = payload?.contract?.items ?? payload?.items ?? null
      if (probes === null) {
        rows.push({ layer: 1, name: COMPAT_ROUTE + ' 只读诊断载荷', ok: false, detail: '未取得可解析载荷（status=' + String(compat.status) + '）' })
      } else {
        const items = new Set(probes.map((p) => p.item))
        const missing = face1.filter((it) => !items.has(it.item)).map((it) => it.item)
        const unprobed = (payload.probes ?? []).filter((p) => p.ok !== true).map((p) => p.item ?? p.probe)
        rows.push({ layer: 1, name: '契约面 1 全 ' + face1.length + ' 项在诊断载荷内（缺项 = 服务端断点）', ok: missing.length === 0, detail: 'missing=' + JSON.stringify(missing) })
        rows.push({ layer: 1, name: '服务端探测项 ok 读数（未 ok 项即宿主缺面）', ok: unprobed.length === 0, detail: 'notOk=' + JSON.stringify(unprobed) })
      }
      // 浏览器层：仅在宿主闭包内可解析到自动化依赖时才执行；否则显式标注 unavailable（**不伪造**）
      let browser = null
      try {
        const req = createRequire(join(tmpRoot, 'package.json'))
        const mod = req.resolve('playwright')
        browser = { module: 'playwright', path: mod }
      } catch { browser = null }
      if (browser === null) {
        report.browser = { available: false, reason: '未在宿主闭包内解析到 playwright —— 浏览器层（面 2/3 运行期读数）未探测；不使用其他方式伪造该层结论' }
        rows.push({ layer: 2, name: '客户端 API 面 / DOM 前端约定面（浏览器层）', ok: false, detail: 'browser-probe-unavailable（未装配自动化依赖）' })
      } else {
        report.browser = { available: true, module: browser.module }
        rows.push({ layer: 2, name: '客户端 API 面（浏览器层）', ok: false, detail: '浏览器已装配但本仓未验证该探测路径（' + REAL_RUN_STATE + '）——须人工确认' })
      }
      const files = { installScripts: ['install.ps1', 'install.sh'].filter((f) => existsSync(join(REPO_ROOT, f))).length, preset: existsSync(PRESET_DIR) }
      rows.push({ layer: 4, name: '安装注册面（仓侧脚本在场 ' + files.installScripts + '/2）', ok: files.installScripts === 2, detail: 'isolatedHome=' + plan.env.DSH_HOME })
      rows.push({ layer: 5, name: '预设 manifest 面（仓侧预设目录在场）', ok: files.preset, detail: String(PRESET_DIR) })
      rows.push({ layer: 6, name: '版本环境面（契约 current=' + hostContract.hostSurface.current + '；fixtures ' + fixtures.length + ' 份）', ok: true, detail: 'see --self-check for offline reconciliation' })
      const firstBad = rows.find((r) => !r.ok)
      report.verdict = firstBad === undefined ? '六层无缺面' : '断点层 = L' + firstBad.layer + ' ' + LAYER_NAMES[firstBad.layer] + '（' + firstBad.name + '）'
    }
  } finally {
    stopHost(child)
    closeSync(logFd)
    if (!opts.keep) rmSync(tmpRoot, { recursive: true, force: true })
  }
  line('[probe-host] 能力 diff 报告（' + REAL_RUN_STATE + '）')
  for (const r of rows) line('  ' + (r.ok ? '✅' : '❌') + ' [L' + r.layer + ' ' + LAYER_NAMES[r.layer] + '] ' + r.name + (r.ok ? '' : ' :: ' + r.detail))
  line('  结论：' + report.verdict)
  if (opts.jsonOut !== null) { writeFileSync(opts.jsonOut, JSON.stringify(report, null, 2) + '\n'); line('  报告已写入：' + opts.jsonOut) }
  process.exit(rows.every((r) => r.ok) ? 0 : 1)
}

// ── 入口 ────────────────────────────────────────────────────────────────────
const opts = parseArgs(process.argv.slice(2))
if (opts.mode === 'help') {
  line('用法：node scripts/probe-host.mjs [--self-check | --run] [--port N] [--timeout S] [--host-cmd PATH] [--stage-plugin] [--keep] [--json-out PATH]')
  line('  --self-check   离线自检（默认；' + SELF_CHECK_STATE + '）')
  line('  --run          实机探针（' + REAL_RUN_STATE + '；隔离实例 + 无头浏览器；需运行中宿主环境）')
  line('  --stage-plugin 实机探针前置装载：把本仓插件按官方通道接入隔离 DSH_HOME（junction + profile 注册；默认关闭）')
  process.exit(0)
}
if (opts.mode === 'run') await realRun(opts)
else await selfCheck(opts)
