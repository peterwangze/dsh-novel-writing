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
  '1.2': ['z', 'markVolatile'],
  '1.3': ['presetRoot', 'presetDir'],
  '1.5': ['hostInject'],
  '1.6': ['registerSettings', 'readLiveConfig', 'legacySettingsSurface', 'configSnapshot', 'legacySettingsImportPath', 'settingsFormsUpdate'],
  '1.7': ['SERVICE_NAME'],
  '1.8': ['getWebServer', 'injectWhenReady', 'registerRoute'],
  '1.9': ['onLifecycle'],
  '1.10': ['loggerOf', 'logWarn', 'emitChanged'],
}

/** 宿主服务注册名（契约 1.7：super(ctx, 本值)）。 */
export const SERVICE_NAME = 'novel-writing'

/** 宿主变更事件名（契约 1.10：ctx.emit 在宿主事件总线上的对外名字）。 */
export const EVENT_CHANGED = 'novel-writing/changed'

/** 插件行 inject 声明（契约 1.5）：settings 为硬依赖，webServer / timer 走可选探测。
 *  BUG-011 判定：0.2.0 仍提供名为 `settings` 的服务（SettingsForms——dsh-base patch 行，缺 profileContext 时禁用），
 *  inject 合法且必要（0.1.x 读路径 `ctx.settings.get` 是属性访问，去 inject 即抛 BUG-003 形态错误）。 */
export const hostInject = ['settings']

// ── ② 配置面（契约 1.6 双表面：0.1.x ctx.settings.register/get ／ 0.2.0 Config+volatile fiber config）──
// BUG-011：dsh 0.2.0-rc.2 把 dsh-settings 的 SettingsProvider 重做为 SettingsForms——`register`/`get`
// 消失，持久层 = profile cordis.patch.yml；新范式（官方口径）= 插件导出 Config schema（schemastery），
// 宿主 loader 以 `resolveConfig(runtime, config)` 校验后把 **volatile 字段包成活引用**（cosmokit
// `createVolatile`：冻结对象 + `.get()`）传进 `apply(ctx, config)`；SettingsForms 写路径（update/replace/
// mutate）落 profile patch → loader `_commitVolatile` 在**不重启 fiber** 的前提下 `updateVolatile`
// 原地刷新引用（宿主源码 cordis-plugin-loader `_commitVolatile` / cosmokit `updateVolatile`，实读定案）。
// 因此「持有 apply 注入的 config 引用、每次 `.get()`」与 0.1.x「每次 ctx.settings.get(ns)」语义等价：
// 用户改 workspaceRoot/bindings 后服务端下一次读取即见新值。

/**
 * 能力检测：宿主是否仍提供 0.1.x settings 读表面（`get`）。
 * 0.2.0 SettingsForms 仅有 configure/invalidate/describe/update/replace/mutate/write/schema——无 `get`，
 * 故 `typeof ctx.settings?.get === 'function'` 即两代系的可靠判别（零版本号字符串）。
 * 探测形态与产品调用同形（属性访问 ctx.settings——BUG-003 崩溃形态），try/catch 兜底。
 */
export function legacySettingsSurface(ctx) {
  const s = (() => { try { return ctx.settings } catch { return undefined } })()
  return s !== undefined && s !== null && typeof s.get === 'function'
}

/** 值是否为 cordis/schemastery 的 volatile 活引用（duck 判定：冻结对象仅有 `.get()`——宿主闭包的 cosmokit 未入本包依赖面，P-08）。 */
export function isVolatileRef(value) {
  return value !== null && value !== undefined && typeof value === 'object' && typeof value.get === 'function'
}

/** volatile 活引用 → 普通快照（非引用值原样返回；0.1.x 宿主 schemastery 3.18.2 无 volatile 分支，apply 收到的本就是普通对象）。 */
export function configSnapshot(config) {
  return isVolatileRef(config) ? config.get() : config
}

/**
 * 把 Config schema 的**根**标记为 volatile（BUG-011）：整节配置「活可编辑、免重启生效」——
 * 对齐 0.1.x settings 语义与 dsh-settings `volatileForm`/`isVolatilePath` 的可写面判定
 * （SettingsForms.write 只接受 volatile 路径；legacy `importLegacyDocument` 逐节 update 同样如此）。
 * 代系兼容：schemastery 3.18.5+ 有 `.volatile()`；0.1.x 闭包的 3.18.2 没有——退回 `.extra('volatile', true)`
 * （3.18.5 的 `.volatile()` 即 `this.extra("volatile", true)`，同一 meta 键；3.18.2 的 resolve 无 volatile
 * 分支，该 meta 惰性无害，0.1.x 注册/读取路径零变化）。
 */
export function markVolatile(schema) {
  return typeof schema.volatile === 'function' ? schema.volatile() : schema.extra('volatile', true)
}

/**
 * 读取当前生效配置（双表面收口，BUG-011 A3）：
 * - 0.1.x（settings 服务有 `get`）：`ctx.settings.get(ns)`——写入后即时生效的既有语义；
 * - 0.2.0：apply 注入的 fiber config（volatile 根引用）→ `.get()` 实时快照——
 *   SettingsForms 写路径落 profile patch 后 loader 原地刷新同一引用，无需重启。
 * 读取值缺席时返回 undefined（默认值语义由调用方决定）。
 */
export function readLiveConfig(ctx, ns, runtimeConfig) {
  if (legacySettingsSurface(ctx)) return readSettings(ctx, ns)
  return configSnapshot(runtimeConfig)
}

/** 注册设置节（双表面，BUG-011）：0.1.x 透传 `ctx.settings.register`（inject 未声明时与直连同源抛错）；0.2.0 无该表面 → 不注册（Config 声明范式由宿主 loader 消费，返回 false 如实告知）。 */
export function registerSettings(ctx, ns, schema) {
  const s = (() => { try { return ctx.settings } catch { return undefined } })()
  if (s !== undefined && s !== null && typeof s.register === 'function') {
    s.register(ns, schema)
    return true
  }
  return false
}

/** 读取设置节（0.1.x 透传：值缺席时返回 undefined，由调用方决定默认值语义；0.2.0 下 MUST NOT 调用——无 `get` 表面）。 */
export function readSettings(ctx, ns) {
  return ctx.settings.get(ns)
}

// ── ②b legacy settings.yaml 迁移面（BUG-011；0.2.0 SettingsForms 消费，读写面均在插件侧主动权内）──
/**
 * 旧全局 settings 文档一次性迁移后的存档路径：`<DSH_HOME>/settings.yaml.imported`。
 * 0.2.0 宿主把旧 `settings.yaml` rename 为该名并逐节导入（`importLegacyDocument`）；0.1.x 宿主
 * settings.yaml 本身就是活存储（无 .imported 概念）⇒ 本路径不存在，读取方按「无存档」处理。
 */
export function legacySettingsImportPath() {
  return join(resolveDshHome(), 'settings.yaml.imported')
}

/**
 * SettingsForms 写路径透传（BUG-011 迁移面）：`ctx.settings.update(ns, patch)`——0.2.0 在场
 * （describe/update 方法对）；0.1.x 无此形状（register/get 代）⇒ 返回 false 由调用方决定降级。
 * 写入落 profile patch 的同 id 行（volatile 路径），loader `_commitVolatile` 免重启刷新本插件
 * apply 收到的 fiber config 活引用 ⇒ 写后 `readLiveConfig` 立即可见新值。
 */
export function settingsFormsUpdate(ctx, ns, patch) {
  const s = (() => { try { return ctx.settings } catch { return undefined } })()
  if (s === undefined || s === null || typeof s.update !== 'function') return false
  s.update(ns, patch)
  return true
}

// ── ③ HTTP 路由面（契约 1.8 / 1.9：ctx.get('webServer') + ctx.inject(['webServer']) + webServer.register + ctx.effect）──
/** 探测 webServer 服务（透传 ctx.get：缺席返回 undefined，零改写）。 */
export function getWebServer(ctx) {
  return ctx.get('webServer')
}

/**
 * 服务就绪即回调（BUG-011 双表面）：透传 cordis `ctx.inject(names, callback)`——服务在场立即执行、
 * 后到（0.2.0 代序：webServer 等宿主服务常在本插件 apply 之后才挂载）则到场时执行；返回 fiber
 * （生命周期随本插件 ctx，父 dispose 自动清理，无需手动拆卸）。宿主无 `ctx.inject` 表面（两代 cordis
 * 4.0.x 均在——fixtures methodNames 的假阴性由本判据吸收）⇒ 返回 null，调用方回退 eager 探测
 * （0.1.x 已证路径：apply 期 webServer 已在场）。
 */
export function injectWhenReady(ctx, names, callback) {
  const c = (() => { try { return ctx.inject } catch { return undefined } })()
  if (typeof c !== 'function') return null
  return c.call(ctx, names, callback)
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
    // BUG-011 双表面：配置面按代系二选一判绿——0.1.x `register/get`（SettingsProvider）或
    // 0.2.0 `describe/update` SettingsForms + Config 声明范式（读走 apply 注入的 fiber config，
    // 见 readLiveConfig）。两表面皆无 ⇒ 真实缺面（apply 期 registerSettings 抛错 / cfg 无读取路径）。
    const s = (() => { try { return ctx.settings } catch { return undefined } })()
    const has = s !== undefined && s !== null
    const legacy = has && typeof s.register === 'function' && typeof s.get === 'function'
    const forms = has && typeof s.describe === 'function' && typeof s.update === 'function'
    return { ok: legacy || forms, mode: 'runtime-service', domain: 'service', service: 'settings', method: legacy ? 'register/get' : 'forms-describe/update', detail: legacy ? 'legacy-surface' : forms ? 'config-paradigm' : 'absent' }
  },
  '1.7': () => ({ ok: typeof SERVICE_NAME === 'string' && SERVICE_NAME !== '', mode: 'static-declaration', domain: 'service', service: SERVICE_NAME, method: 'super(ctx, name)', detail: 'declaration' }),
  '1.8': (ctx) => {
    const ws = safeGet(ctx, 'webServer')
    const hasApi = ws !== undefined && ws !== null && typeof ws.register === 'function'
    // BUG-011 双表面：0.2.0 代序 webServer 常在 apply 之后才挂载——路由注册走 ctx.inject 延迟注入
    // （见 injectWhenReady）⇒ 「webServer 已在场」或「ctx.inject 可用」任一成立即路由可达；两者皆无才缺面。
    const injectFn = (() => { try { return ctx.inject } catch { return undefined } })()
    const ok = hasApi || typeof injectFn === 'function'
    return { ok, mode: 'runtime-service', domain: 'service', service: 'webServer', method: hasApi ? 'register' : 'inject-deferred', detail: hasApi ? typeof ws.register : typeof injectFn === 'function' ? 'deferred-inject' : 'absent' }
  },
  '1.9': (ctx) => ({ ok: typeof ctx.effect === 'function', mode: 'runtime-api', domain: 'ctx', service: null, method: 'effect', detail: typeof ctx.effect }),
  '1.10': (ctx) => ({ ok: typeof ctx.emit === 'function' && ctx.logger !== undefined && ctx.logger !== null, mode: 'runtime-api', domain: 'ctx', service: null, method: 'emit/logger', detail: typeof ctx.emit + '/' + typeof ctx.logger }),
}

/** 面 1 未探测项的如实原因——**枚举码**（无判据≠可用，不静默判绿；BC-01 反虚假安全感）。
 *  **BC-05 出网纪律（REVIEW-COMPAT-005-R1 F2）**：本表是网关载荷字段的直接来源，故只出**枚举码**、
 *  不出自由文本——自由文本会把**仓内相对源文件路径**带出网关（真实运行期即 `1.11` 的说明含
 *  「lib/tools.js」）。人类可读解释在**消费端**（客户端 i18n `diagReason`，见 lib/client.js）——
 *  文案不进网关。机检：smoke 对**真实路由产出**整包扫描 + 正向对照（注入 `file` ⇒ 必红）。 */
const FACE1_UNPROBED_CODES = {
  '1.4': 'retired',                // BUG-003 后 settingsNamespace 具名导入已退役（无运行时表面）
  '1.11': 'out-of-boundary-scope', // dsh-tools/ctx.tools 属 lib/tools.js 行（服务端边界层不含该包）
}

/** 面 2~6 的探测归属（apply 期服务端不可见——如实披露，不做假绿）。
 *  **枚举码口径同上**（BC-05：自由文本/仓内路径不出网关；解释文案在客户端 i18n）。 */
const FACES_NOT_COVERED_AT_APPLY = [
  { face: 2, code: 'client-api-surface' },   // 客户端 API 面——宿主单 factory 约束，探测在浏览器侧（D1 面板 / 005 诊断）
  { face: 3, code: 'host-dom-surface' },     // 宿主 DOM/前端约定面——需真实 DOM（D1 面板 / D3 探针脚本）
  { face: 4, code: 'install-registration' }, // 安装与注册机制面——install 脚本期（非运行时）
  { face: 5, code: 'preset-manifest' },      // 预设与 manifest 面——validate-preset / CI sanity 静态检查
  { face: 6, code: 'version-environment' },  // 版本与环境面——CI fixtures 快照 + 探测轨（离线/CI 期）
]

/**
 * 宿主能力探测（纯读取、零副作用、全同步）：契约 face 1 逐项投影到宿主实际表面。
 * 返回结构：{ contract, host, probes[], missing[], unprobed[], notCovered[], summary }——
 * 每条 probe = { item, face, kind, sync, ok, mode, domain, service, method, detail }（未探测项为
 * { item, face, kind, sync, ok:null, mode:'unprobed', code }，`code` = 枚举码，非自由文本，见 BC-05）；
 * ok=true 可用 / false 缺面（进 missing）/ null 未探测（进 unprobed，带枚举码原因）。
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
      const code = FACE1_UNPROBED_CODES[it.item] ?? 'no-runtime-predicate'
      const entry = { item: it.item, face: 1, kind: it.kind, sync: true, ok: null, mode: 'unprobed', code }
      probes.push(entry)
      unprobed.push({ item: it.item, code })
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
    // **枚举化（COMPAT-014 B-N3，收口 REVIEW-COMPAT-005-R2 N3）**：原 `versionNote` 自由文本是载荷内**最后一处**
    // 自由文本载体（F2 已枚举化 `probes/unprobed/notCovered` 的 reason 字段）——改为封闭码 `versionCode`，
    // 使「报告内无自由文本」成为可机检事实（smoke D1⑩ 断言 host 段仅 null + 枚举码）；人类可读文案留在
    // 客户端 i18n（`diagRbNone` 等），**不出网关**。
    host: { version: null, versionCode: 'tp4-unprobed' },
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
 * 契约声明面的**网关投影**（D1 诊断路由的出口；REVIEW-COMPAT-005-R1 F2/F7）：
 * 只出 `item/face/kind/necessity`——`symbol` / `file` / `line` **一律不出网关**（宿主/仓库路径零泄漏，
 * BC-05）。修订号复用 `CONTRACT_TASK`（= revisions 末项，**单一派生点**——原 index.js 内联派生式随之
 * 消除，两处同式不同步的余地关闭）；产品代码不再直接 import 契约模块（依赖方向 = 产品 → 边界 → 契约）。
 */
export function contractProjection() {
  return {
    task: hostContract.task,
    schemaVersion: hostContract.schemaVersion,
    revision: CONTRACT_TASK,
    faces: hostContract.faces.map((f) => ({ id: f.id, name: f.name })),
    items: hostContract.items.map((it) => ({ item: it.item, face: it.face, kind: it.kind, necessity: it.necessity })),
  }
}

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
