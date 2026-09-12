/**
 * host-boundary.js — 服务端宿主边界层（COMPAT-004；COMPAT-001 §4 轴② B1/B2 + 轴④ D2 落地）。
 *
 * @responsibility 1 收口 lib/index.js 对 DSH 宿主的全部服务端调用面（宿主包具名导入 / settings 注册与读取 /
 *   webServer 路由挂载 / $DSH_HOME 预设路径解析 / Service 基类与服务注册名 / 日志·事件·清理生命周期入口）——
 *   产品代码只 import 本模块，不直接触碰宿主 API（收口范围与 tools 行排除见文末「范围口径」段，REVIEW-COMPAT-004-R1 F7）。
 * @responsibility 2 探测宿主**实际**能力面并产出结构化能力报告（detectHostCapabilities：纯读取、零副作用、
 *   全同步——apply 期可直接调用；单一实现三消费方：D2 启动警告 / 005 诊断面板 / CI 轨）。
 * @responsibility 3 宿主升级时服务端适配只改本文件（声明式契约见 lib/host-contract.mjs，本文件依赖方向 = 边界 → 契约）。
 *
 * 收口纪律（P-10 / BC-02）：
 *   · 边界只做「包装 + 命名」，不改逻辑——index.js 侧调用与搬迁前逐点等价（COMPAT-004 行为等价重构）。
 *   · 新增任何宿主耦合字面量/符号 MUST 同步 lib/host-contract.mjs（items[] 或 regionLiterals）并补 smoke 对账断言。
 *   · 探测输出安全边界（BC-05）：仅布尔/名称/版本——不含路径、token、用户数据、宿主配置值；
 *     缺面告警单次输出（每次 apply 恰一次 console.warn），不刷屏、不阻断加载。
 */
import z from '@deepseek-ai/schemastery'
import { Service } from '@deepseek-ai/cordis'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { join } from 'node:path'
import { hostContract } from './host-contract.mjs'

// ── ① 宿主包具名导入面（契约 1.1 / 1.2 / 1.3 的收口点）────────────────────────
export { z, Service }

/**
 * 收口映射表（验收机检项「boundary 收口映射表齐备」）——键 = 契约 items[].item（面 1 可收口项；
 * 1.4 已退役 / 1.11 属 lib/tools.js 行，均不在边界范围），值 = 本文件导出符号名。
 * 消费方：smoke 结构断言（键集 ≡ 契约面 1 收口项；值全为真实导出且被 lib/index.js 消费）/
 * 005 诊断报告 / 维护者适配速查（宿主升级时「改哪个符号」一目了然）。
 */
export const BOUNDARY_MAP = {
  '1.1': ['Service'],
  '1.2': ['z'],
  '1.3': ['presetRoot', 'presetDir'],
  '1.5': ['hostInject'],
  '1.6': ['registerSettings', 'readSettings'],
  '1.7': ['SERVICE_NAME'],
  '1.8': ['getWebServer', 'registerRoute'],
  '1.9': ['onLifecycle'],
  '1.10': ['loggerOf', 'logWarn', 'emitChanged'],
}

/** 宿主服务注册名（契约 1.7：super(ctx, 本值)）。 */
export const SERVICE_NAME = 'novel-writing'

/** 宿主变更事件名（契约 1.10：ctx.emit 在宿主事件总线上的对外名字）。 */
export const EVENT_CHANGED = 'novel-writing/changed'

/** 插件行 inject 声明（契约 1.5）：settings 为硬依赖，webServer / timer 走可选探测。 */
export const hostInject = ['settings']

// ── ② 配置面（契约 1.6：ctx.settings.register / get）─────────────────────────
/** 注册设置节（透传，零改写——inject 未声明时与直连同源抛错）。 */
export function registerSettings(ctx, ns, schema) {
  ctx.settings.register(ns, schema)
}

/** 读取设置节（透传：值缺席时返回 undefined，由调用方决定默认值语义）。 */
export function readSettings(ctx, ns) {
  return ctx.settings.get(ns)
}

// ── ③ HTTP 路由面（契约 1.8 / 1.9：ctx.get('webServer') + webServer.register + ctx.effect）──
/** 探测 webServer 服务（透传 ctx.get：缺席返回 undefined，零改写）。 */
export function getWebServer(ctx) {
  return ctx.get('webServer')
}

/** 挂载一条宿主 HTTP 路由（webServer.register 透传）。 */
export function registerRoute(webServer, route) {
  return webServer.register(route)
}

/** 注册生命周期清理（ctx.effect 透传，返回 dispose 句柄）。 */
export function onLifecycle(ctx, fn, label) {
  return ctx.effect(fn, label)
}

// ── ④ 日志与事件面（契约 1.10）──────────────────────────────────────────────
/** 宿主 logger 取值（透传；宿主未挂 logger 时为 undefined，调用方沿用 `?.` 语义）。 */
export function loggerOf(ctx) {
  return ctx.logger
}

/** 结构化告警（语义等价于 `ctx.logger?.warn(...)`）。 */
export function logWarn(ctx, message) {
  ctx.logger?.warn(message)
}

/** 广播插件变更事件（透传 ctx.emit；事件名见 EVENT_CHANGED）。 */
export function emitChanged(ctx, payload) {
  ctx.emit(EVENT_CHANGED, payload)
}

// ── ⑤ $DSH_HOME 预设路径面（契约 1.3 调用点 / 5.5 预设目录约定）───────────────
/** 预设根目录 = `$DSH_HOME/.agent-presets`。 */
export function presetRoot() {
  return join(resolveDshHome(), '.agent-presets')
}

/** 指定预设目录 = `$DSH_HOME/.agent-presets/<id>`。 */
export function presetDir(id) {
  return join(presetRoot(), id)
}

// ── 范围口径（REVIEW-COMPAT-004-R1 F7 统一，置于此处以免改动上方契约 file/line 指向）──────────────
// 本层收口范围 = **lib/index.js 宿主调用 100% 收口**；`lib/tools.js` 工具行**不在本层**——契约 1.11 标
// `out-of-boundary-scope`，按轴①独立评估。本文件一切「100% 收口」表述均以 lib/index.js 为限，
// 避免被读成「全服务端（含工具行）」。契约同步：item 1.11 note + faces[0].scope（smoke F7 断言对账）。

// ── ⑥ 能力探测（轴④ D2：apply 期结构化自检）────────────────────────────────
/** 探测期安全取值：ctx.get 抛错视为缺席（仅探测使用——产品路径一律走透传包装，不静默吞错）。
 *  本插件依赖的 `ctx.get` 宿主语义（缺服务 → undefined；属性访问 ctx.xxx 才抛 err）与其**复核状态**
 *  登记于契约 `ctxGetSemantics`（REVIEW-COMPAT-004-R1 F3：语义入可对账面，不靠注释口头承诺）。 */
function safeGet(ctx, name) {
  try {
    return ctx.get(name)
  } catch {
    return undefined
  }
}

/**
 * 面 1（服务端 API 面）逐项运行时判据表——键 = 契约 items[].item，值 = 同步判据。
 * mode 口径：'module-surface' = 边界静态导入面的导出名（同步可见，无需动态 import）；
 *            'runtime-service' = ctx.get 惰性服务可用性 + 方法面；'runtime-api' = ctx 上的生命周期/日志方法；
 *            'static-declaration' = 声明一致性（无宿主往返）。
 * 未列入本表的契约项由 detectHostCapabilities 归入 unprobed（ok=null + 原因），不静默判绿。
 * F7 硬约束：本表全部判据同步、无网络、无布局等待——apply 期可直接调用。
 */
const FACE1_PROBES = {
  '1.1': () => ({ ok: typeof Service === 'function', mode: 'module-surface', domain: '@deepseek-ai/cordis', service: null, method: 'Service', detail: typeof Service }),
  '1.2': () => ({ ok: typeof z === 'function' && typeof z.object === 'function', mode: 'module-surface', domain: '@deepseek-ai/schemastery', service: null, method: 'default', detail: typeof z }),
  '1.3': () => ({ ok: typeof resolveDshHome === 'function', mode: 'module-surface', domain: '@deepseek-ai/dsh-home-paths', service: null, method: 'resolveDshHome', detail: typeof resolveDshHome }),
  '1.5': () => ({ ok: Array.isArray(hostInject) && hostInject.includes('settings'), mode: 'static-declaration', domain: 'plugin-row', service: 'settings', method: 'inject', detail: 'declaration' }),
  '1.6': (ctx) => {
    // 探测形态与产品调用**同形**（属性访问 ctx.settings）——BUG-003 的实机崩溃形态正是此处抛
    // 「cannot get property/required service ... without inject」；改用 ctx.get 会漏掉该形态（且对
    // 未注入服务假报缺失）。inject=['settings'] 的宿主上该访问必可用，抛错即真实缺面。
    const s = (() => { try { return ctx.settings } catch { return undefined } })()
    const hasApi = s !== undefined && s !== null && typeof s.register === 'function' && typeof s.get === 'function'
    return { ok: hasApi, mode: 'runtime-service', domain: 'service', service: 'settings', method: 'register/get', detail: hasApi ? 'present' : 'absent' }
  },
  '1.7': () => ({ ok: typeof SERVICE_NAME === 'string' && SERVICE_NAME !== '', mode: 'static-declaration', domain: 'service', service: SERVICE_NAME, method: 'super(ctx, name)', detail: 'declaration' }),
  '1.8': (ctx) => {
    const ws = safeGet(ctx, 'webServer')
    const hasApi = ws !== undefined && ws !== null && typeof ws.register === 'function'
    return { ok: hasApi, mode: 'runtime-service', domain: 'service', service: 'webServer', method: 'register', detail: ws === undefined || ws === null ? 'absent' : typeof ws.register }
  },
  '1.9': (ctx) => ({ ok: typeof ctx.effect === 'function', mode: 'runtime-api', domain: 'ctx', service: null, method: 'effect', detail: typeof ctx.effect }),
  '1.10': (ctx) => ({ ok: typeof ctx.emit === 'function' && ctx.logger !== undefined && ctx.logger !== null, mode: 'runtime-api', domain: 'ctx', service: null, method: 'emit/logger', detail: typeof ctx.emit + '/' + typeof ctx.logger }),
}

/** 面 1 未探测项的如实原因（无判据≠可用——不静默判绿；BC-01 反虚假安全感）。 */
const FACE1_UNPROBED_REASONS = {
  '1.4': 'retired（BUG-003 后 settingsNamespace 具名导入已退役，无运行时表面）',
  '1.11': 'out-of-boundary-scope（dsh-tools/ctx.tools 属 lib/tools.js 行，边界静态面不含该包）',
}

/** 面 2~6 的探测归属（apply 期服务端不可见——如实披露，不做假绿）。 */
const FACES_NOT_COVERED_AT_APPLY = [
  { face: 2, reason: '客户端 API 面——宿主单 factory 约束，探测在浏览器侧（D1 面板 / 005 诊断）' },
  { face: 3, reason: '宿主 DOM/前端约定面——需真实 DOM（D1 面板 / D3 探针脚本）' },
  { face: 4, reason: '安装与注册机制面——install 脚本期（非运行时）' },
  { face: 5, reason: '预设与 manifest 面——validate-preset / CI sanity 静态检查' },
  { face: 6, reason: '版本与环境面——CI fixtures 快照 + 探测轨（离线/CI 期）' },
]

/**
 * 宿主能力探测（纯读取、零副作用、全同步）：契约 face 1 逐项投影到宿主实际表面。
 * 返回结构：{ contract, host, probes[], missing[], unprobed[], notCovered[], summary }——
 * 每条 probe = { item, face, kind, sync, ok, mode, domain, service, method, detail }；
 * ok=true 可用 / false 缺面（进 missing）/ null 未探测（进 unprobed，带原因）。
 * 探测项清单（含同步性标注）即返回到 probes[]——apply 期调用 MUST 全同步（F7）：
 * 本函数零 await、零 import()、零网络、零 DOM/布局读取。
 */
export function detectHostCapabilities(ctx) {
  const probes = []
  const missing = []
  const unprobed = []
  for (const it of hostContract.items) {
    if (it.face !== 1) continue
    const predicate = FACE1_PROBES[it.item]
    if (predicate === undefined) {
      const entry = { item: it.item, face: 1, kind: it.kind, sync: true, ok: null, mode: 'unprobed', reason: FACE1_UNPROBED_REASONS[it.item] ?? 'no-runtime-predicate' }
      probes.push(entry)
      unprobed.push({ item: it.item, reason: entry.reason })
      continue
    }
    const r = predicate(ctx)
    const entry = { item: it.item, face: 1, kind: it.kind, sync: true, ok: r.ok === true, mode: r.mode, domain: r.domain, service: r.service, method: r.method, detail: r.detail }
    probes.push(entry)
    if (entry.ok !== true) missing.push({ item: it.item, face: 1, domain: r.domain, service: r.service, method: r.method })
  }
  const covered = probes.filter((p) => p.ok !== null).length
  return {
    contract: { task: hostContract.task, schemaVersion: hostContract.schemaVersion, items: hostContract.items.length, faces: hostContract.faces.length },
    // TP-4 待验证：宿主版本获取路径未证实（remote.* 元数据 / settings describe 是否携带版本）——如实置 null，不猜。
    host: { version: null, versionNote: 'unprobed（TP-4：宿主版本获取路径未证实）' },
    scope: { face: 1, probesDeclared: probes.length, probesCovered: covered, probesUnprobed: unprobed.length },
    probes,
    missing,
    unprobed,
    notCovered: FACES_NOT_COVERED_AT_APPLY,
    summary: { total: probes.length, ok: probes.filter((p) => p.ok === true).length, missing: missing.length, unprobed: unprobed.length },
  }
}

/**
 * 诊断归因任务名（REVIEW-COMPAT-004-R1 F4）：取**契约修订史末项** task，不硬编码——P-10 纪律要求宿主耦合
 * 变更 MUST 同步契约 `revisions[]`，故本值随本层最新修订任务自动跟进（后续 COMPAT-005/006 沿用本层时，
 * 日志不会把缺面误标为旧任务、污染诊断归因）。契约 revisions 缺失/为空（异常）→ 退回契约自身 task，不抛错。
 */
const CONTRACT_TASK = Array.isArray(hostContract.revisions) && hostContract.revisions.length > 0
  ? hostContract.revisions.at(-1).task
  : hostContract.task

/**
 * 缺面结构化告警（D2）：**单次** console.warn，签名固定 `'[nv-compat]'` + JSON 摘要
 * （缺面域名/方法名/服务名 + 计数 + 宿主版本）。无缺面 → 不输出（返回 false）。
 * 安全边界（BC-05）：摘要只含布尔/名称/版本——不含路径、token、宿主配置值、用户数据。
 */
export function warnCompatReport(report, sink = console) {
  const missing = report?.missing ?? []
  if (missing.length === 0) return false
  const summary = {
    task: CONTRACT_TASK,
    stage: 'server-apply',
    host: report.host.version,
    domains: [...new Set(missing.map((m) => m.domain))],
    services: [...new Set(missing.map((m) => m.service).filter((s) => s !== null && s !== undefined))],
    methods: [...new Set(missing.map((m) => m.method).filter((m) => m !== null && m !== undefined))],
    items: missing.map((m) => m.item),
    unprobed: report.unprobed.map((u) => u.item),
    counts: report.summary,
  }
  sink.warn('[nv-compat]', JSON.stringify(summary))
  return true
}

/** apply 期自检入口（D2）：探测 + 缺面单次告警，返回完整报告（不阻断加载）。 */
export function selfCheckHost(ctx, sink = console) {
  const report = detectHostCapabilities(ctx)
  warnCompatReport(report, sink)
  return report
}
