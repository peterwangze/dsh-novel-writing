/**
 * generation-manifest.mjs — DSH 宿主代际清单（COMPAT-021 单一事实源）
 *
 * 职责（docs/COMPATIBILITY.md §5/§6/§7 设计基线的落地）：回答「哪个宿主代际该用哪一行预设声明」——
 *   · GENERATIONS：五个代际（legacy-0.1 / decl-0.2.0 / decl-0.2.1 / decl-0.2.2 / unknown）各含
 *     宿主判据（host package version 区间 + `@deepseek-ai/dsh-agent-preset` 是否在宿主闭包）、
 *     预设行策略（`use` = 真源文件；`rows` = 包含/排除/替换说明）、`listAgents` 供给面、失败策略；
 *   · GENERATION_VARIANT / GENERATION_DROPPED：双源代际差异的机读常量
 *     （`test/fixtures/host-surfaces/preset-schema-face.mjs` 自本文件导入并 re-export——该模块是
 *      **兼容 re-export 面**：validate-preset / smoke 的既有 import 与源码字面量断言不变）；
 *   · detectGeneration()：纯函数判定——输入宿主版本串 + 声明代在场布尔，输出代际 id；
 *     无法判定 → `'unknown'`（fail-closed，**绝不默认成任意一代**）。
 *
 * 纯度契约：本文件 = 纯数据 + 纯函数，**零环境 IO**（不读文件 / 不探测进程 / 不发网络 / 零 import）；
 * 平面探测（哪个闭包在场、版本从哪条通道读到）归 `scripts/preflight-preset-rows.mjs`，判定只吃探测结果。
 *
 * P-10（宿主耦合入契约）：本清单是「宿主代际 × 预设行」耦合面的机读登记（HOST_PACKAGES 包名、
 * 各代 exports 面、代际区间）。职责三分（§4 目标 2.5）：契约（lib/host-contract.mjs）回答
 * 「插件碰了宿主什么」；本清单回答「哪个宿主代际该用哪一行」；预检回答「当前组合是否自洽」——
 * 三者不得互相复制事实。新增宿主代际只改本文件 + `test/fixtures/host-generations/` +
 * 契约 revisions（§4 目标 4.6 低代价适配路径），不改业务模块。
 *
 * 枚举口径（稳定契约，消费方按字面断言）：
 *   listAgents   = 'legacy-subpath'（0.1.x 独立子路径行注册）
 *                | 'unavailable'（0.2.0/0.2.1 子路径仍 exports 但主包未注册——预设可加载、
 *                  独立 list_agents 不可用，**如实降级披露**，不得伪装成完整支持）
 *                | 'main-package'（0.2.2+ 主包注册，替代被删子路径行）
 *                | null（unknown：不承诺）
 *   failurePolicy = 'fail'      （无可跳过/降级项；声明与平面不符即硬失败。decl-0.2.2 的
 *                  legacy 子路径行残留 = ERR_PACKAGE_PATH_NOT_EXPORTED 整棵预设失败，即 COMPAT-020 故障）
 *                | 'skip-known' （双源对账时对侧源的已知代际差异行按清单披露跳过，不判 FAIL）
 *                | 'degrade'    （已知宿主能力缺失按降级披露，主链路不阻断）
 *   unknown 代际恒 fail-closed：不投影、不默放（RISK-C8）。
 */

/** 深冻结纯数据（数组/普通对象/基元；遇函数/循环直接返回原值——本文件不含此类值）。 */
function deepFreeze(value) {
  if (Object.isFrozen(value)) return value
  if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
    Object.freeze(value)
    for (const key of Object.keys(value)) deepFreeze(value[key])
  }
  return value
}

/**
 * 宿主耦合包名（P-10 登记面；探测/预检消费，业务模块不得散抄）：
 *   host        = 宿主 CLI 主包（版本 = 代际判据主输入）
 *   declaration = 预设声明代标记包（0.1.x 闭包无此包；首版 0.1.7-alpha.1，2026-09-22）
 */
export const HOST_PACKAGES = deepFreeze({
  host: '@deepseek-ai/dsh',
  declaration: '@deepseek-ai/dsh-agent-preset',
})

/**
 * 已知代际变体行（**唯一允许的双源「同行换包名」差异**）：
 * 0.1.x `dsh-workflow-worker-thread`（0.2.x 闭包已不存在）↔ 0.2.x `dsh-workflow-ptc`
 * （provider:spawn，宿主 standard.patch.yml 同款官方用法）。与 GENERATION_DROPPED 的区别：
 * 变体 =「同行换包名」，删除 =「整行代际消失」；二者都是**源代际差异**（非宿主能力探测——不读
 * app.asar）：只披露、不计发现项。preset-schema-face 为兼容 re-export 面（值零变化）。
 */
export const GENERATION_VARIANT = deepFreeze({
  legacy: { id: 'workflow-worker-thread', name: '@deepseek-ai/dsh-workflow-worker-thread' },
  current: { id: 'workflow-ptc', name: '@deepseek-ai/dsh-workflow-ptc' },
  config: { provider: 'spawn' },
})

/**
 * 已知整行代际删除（legacy-only 行，COMPAT-020）：0.1.x 源保留独立 `list-agents` 子路径行；
 * 0.2.2 起该子路径从包 exports 移除、`list_agents` 并入主包（`replacementName`）⇒ 0.2.x 源
 * （bundle patch）**MUST NOT** 再声明该行（残留 = 宿主 agentPresets.register 激活期抛
 * ERR_PACKAGE_PATH_NOT_EXPORTED，整棵预设「加载失败」）。preset-schema-face 为兼容 re-export
 * 面（值零变化）；双源方向性硬不变量（yml 恰 1 行且 config 空 / patch 恰 0 行 / patch 主包行
 * 在场）由 preset-projection.reconcileDualSources 与 smoke B2 双面看护。
 */
export const GENERATION_DROPPED = deepFreeze({
  rowId: 'tool-subagent-list-agents',
  name: '@deepseek-ai/dsh-tool-subagent-control/list-agents',
  replacementName: '@deepseek-ai/dsh-tool-subagent-control',
})

/**
 * 共享行的**源通道差异**白名单（双源对账时唯一允许的 config 级差异；非代际差异，故不入各代
 * presetRowPolicy，而在此单点登记）：skill-filesystem 的 customSkillDirs 相对路径解析基随通道
 * 变化——0.1.x baseUrl = 预设目录（`skills/`）；0.2.x baseUrl = profile 目录（宿主根 include
 * 锚点），故解析安装包内路径（官方指引 "Resolve assets from installed packages rather than a
 * preset directory"）。对账时该行此键差异放行，但两侧表达式 MUST 各自命中登记片段（防「借壳」漂移）。
 */
export const SOURCE_CHANNEL_DIFFERENCES = deepFreeze([
  {
    rowId: 'skill-filesystem',
    name: '@deepseek-ai/dsh-skill-filesystem',
    key: ['config', 'customSkillDirs'],
    legacyExprIncludes: "new URL('skills/', baseUrl)",
    patchExprIncludes: "new URL('node_modules/dsh-novel-writing/agent-presets/novel-writing/skills/', baseUrl)",
    reason: '0.1.x 通道 baseUrl=预设目录；0.2.x 通道 baseUrl=profile 目录 ⇒ 解析安装包内 skills 路径',
  },
])

/**
 * 代际清单（不可变数据）。hostCriteria 口径：
 *   versionMinInclusive / versionMaxExclusive —— host 主包 semver 核心段（X.Y.Z）区间，
 *     预发布后缀（-rc.N 等）不参与分桶（0.2.2-rc.1 属 decl-0.2.2）；
 *   hasAgentPreset —— 声明代标记包是否在宿主闭包（能力检测，非版本号字符串）；
 *   判据双轴必须**同时**满足（detectGeneration 逐代试匹配）：
 *     · 0.1.x 版本 + 声明代在场 ⇒ unknown（未分类混合形态，fail-closed——0.1.7-alpha.1 起曾出现
 *       声明代包，该线未按 legacy-0.1 投影验证过，不冒认）；
 *     · 0.2.x 版本 + 声明代缺席 ⇒ unknown（0.2.x 闭包必有该包；缺失 = 平面不完整或混合平面）；
 *     · ≥0.3.0 ⇒ unknown（尚未审阅的未来代际；升级检查清单见 docs/COMPATIBILITY.md §10.3）。
 */
export const GENERATIONS = deepFreeze({
  'legacy-0.1': {
    id: 'legacy-0.1',
    label: 'DSH 0.1.x（最低声明 0.1.2-rc.1；完整支持实测至 0.1.5-rc.2）',
    hostCriteria: {
      versionMinInclusive: '0.1.0',
      versionMaxExclusive: '0.2.0',
      hasAgentPreset: false,
      note: '0.1.x 闭包无 @deepseek-ai/dsh-agent-preset；`.agent-presets/<id>/` 目录机制（宿主官方已废弃）',
    },
    presetRowPolicy: {
      use: 'agent-presets/novel-writing/agent.cordis.yml（0.1.x 目录机制真源）',
      rows: [
        { kind: 'include', row: 'GENERATION_DROPPED', reason: '0.1.x 的 list_agents 由独立子路径行注册（legacy-only 行：0.1.x 源 MUST 恰 1 行且 config 空；删除会让 0.1.x 用户失去工具）' },
        { kind: 'variant', side: 'legacy', reason: 'workflow 行用 0.1.x 包 dsh-workflow-worker-thread（0.2.x 闭包已不存在）' },
      ],
    },
    listAgents: 'legacy-subpath',
    failurePolicy: 'skip-known',
  },
  'decl-0.2.0': {
    id: 'decl-0.2.0',
    label: 'DSH 0.2.0（声明代；BUG-011 全链路实测 0.2.0-rc.2）',
    hostCriteria: {
      versionMinInclusive: '0.2.0',
      versionMaxExclusive: '0.2.1',
      hasAgentPreset: true,
      note: 'exports 仍含 ./list-agents 子路径，但主包未注册 list_agents',
    },
    presetRowPolicy: {
      use: 'cordis.patch.yml（0.2.x bundle patch 声明行真源）',
      rows: [
        { kind: 'drop', row: 'GENERATION_DROPPED', reason: '0.2.x 源 MUST 0 行 legacy 子路径（0.2.2 起从 exports 移除；残留 = ERR_PACKAGE_PATH_NOT_EXPORTED 整棵预设失败）。0.2.2+ 由主包 replacementName 行注册 list_agents' },
        { kind: 'variant', side: 'current', reason: 'workflow 行用 0.2.x 包 dsh-workflow-ptc（provider:spawn，宿主 standard.patch.yml 同款）' },
      ],
    },
    listAgents: 'unavailable',
    failurePolicy: 'degrade',
  },
  'decl-0.2.1': {
    id: 'decl-0.2.1',
    label: 'DSH 0.2.1（声明代；预设加载面实测 0.2.1-rc.2）',
    hostCriteria: {
      versionMinInclusive: '0.2.1',
      versionMaxExclusive: '0.2.2',
      hasAgentPreset: true,
      note: 'exports 仍含 ./list-agents 子路径，但主包未注册 list_agents',
    },
    presetRowPolicy: {
      use: 'cordis.patch.yml（0.2.x bundle patch 声明行真源）',
      rows: [
        { kind: 'drop', row: 'GENERATION_DROPPED', reason: '同 decl-0.2.0：0.2.x 源 MUST 0 行 legacy 子路径' },
        { kind: 'variant', side: 'current', reason: 'workflow 行用 dsh-workflow-ptc（provider:spawn）' },
      ],
    },
    listAgents: 'unavailable',
    failurePolicy: 'degrade',
  },
  'decl-0.2.2': {
    id: 'decl-0.2.2',
    label: 'DSH 0.2.2+（声明代；`./list-agents` 已移除、主包注册；预设加载面实测 0.2.2-rc.1）',
    hostCriteria: {
      versionMinInclusive: '0.2.2',
      versionMaxExclusive: '0.3.0',
      hasAgentPreset: true,
      note: 'exports 仅 "." / "./src/*" / "./package.json" / "./locale/*.json"；主包 lib/index.js 注册 list_agents（registerListAgents）',
    },
    presetRowPolicy: {
      use: 'cordis.patch.yml（0.2.x bundle patch 声明行真源）',
      rows: [
        { kind: 'drop', row: 'GENERATION_DROPPED', reason: '0.2.2 起子路径已从 exports 移除——0.2.x 源 MUST 0 行（残留 = COMPAT-020 修复的那个故障）；0.2.2 请使用主包行，勿声明 ./list-agents' },
        { kind: 'variant', side: 'current', reason: 'workflow 行用 dsh-workflow-ptc（provider:spawn）' },
      ],
    },
    listAgents: 'main-package',
    failurePolicy: 'fail',
  },
  unknown: {
    id: 'unknown',
    label: '无法判定（版本不可解析 / 区间外（含 ≥0.3.0 未审阅代际）/ 判据双轴矛盾）',
    hostCriteria: null,
    presetRowPolicy: { use: null, rows: [] },
    listAgents: null,
    failurePolicy: 'fail',
  },
})

/** 代际 id 列表（声明序；消费方做 `--explain` 逐代输出与参数校验）。 */
export const GENERATION_IDS = deepFreeze(['legacy-0.1', 'decl-0.2.0', 'decl-0.2.1', 'decl-0.2.2', 'unknown'])

/** 解析 semver 核心段（X.Y.Z；容忍 v 前缀与预发布后缀）；不可解析 → null（fail-closed）。 */
export function parseCoreVersion(text) {
  if (typeof text !== 'string') return null
  const m = /^\s*v?(\d+)\.(\d+)\.(\d+)\b/.exec(text)
  if (m === null) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function compareCore(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return 0
}

/**
 * 纯函数代际判定（§5.2 判定输入的**机读轴**；平面探测归预检 CLI）。
 * @param {{ hostVersion?: string, hasAgentPreset?: boolean }} input
 *   hostVersion   宿主主包（@deepseek-ai/dsh）版本串（含预发布后缀亦可）
 *   hasAgentPreset `@deepseek-ai/dsh-agent-preset` 是否在**同一平面**的宿主闭包
 * @returns {string} GENERATIONS 的某个 id；无法判定 → 'unknown'（绝不默认成任意一代）
 */
export function detectGeneration(input = {}) {
  const { hostVersion, hasAgentPreset } = input ?? {}
  if (typeof hostVersion !== 'string' || typeof hasAgentPreset !== 'boolean') return 'unknown'
  const core = parseCoreVersion(hostVersion)
  if (core === null) return 'unknown'
  for (const id of GENERATION_IDS) {
    if (id === 'unknown') continue
    const criteria = GENERATIONS[id].hostCriteria
    if (criteria.hasAgentPreset !== hasAgentPreset) continue
    const lo = parseCoreVersion(criteria.versionMinInclusive)
    const hi = parseCoreVersion(criteria.versionMaxExclusive)
    if (lo === null || hi === null) continue
    if (compareCore(core, lo) >= 0 && compareCore(core, hi) < 0) return id
  }
  return 'unknown'
}
