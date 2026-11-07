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

/**
 * ── 消费方存在性证据（COMPAT-023；BUG-012 教训的落地）──────────────────────────
 *
 * 回答的问题：**契约 items[] 登记的耦合面，在「这个宿主代际」上有谁真的在消费？**——COMPAT-021 的
 * preflight 只看护「预设行单格」，BUG-012 暴露客户端面断裂由用户先用出；本表把四类消费方证据按
 * 「代际 × 面」登记，由 `scripts/preflight-preset-rows.mjs --surfaces` 逐格对账（有据 ⇒ PASS；
 * 无据 ⇒ 显式 unknown（fail-closed，**不得默认绿**）；缓存证据缺失 ⇒ SKIP ≠ PASS）。
 *
 * 证据来源三档（`status`，枚举 = SURFACE_EVIDENCE_STATUSES）：
 *   'verified'       = npm tarball 只读扫描实测（`scripts/collect-host-surface-evidence.mjs` 产物
 *                      `evidenceFile`；npm tarball = 桌面实装事实源——BUG-012 阶段 A 实证 app.asar 内
 *                      client 包与 npm 0.2.2-rc.1 tarball 逐字节等价）；
 *   'fixture-record' = 仓库自身事实 / 既有 fixtures·契约记录（安装锚点、预设机制、版本判据——npm
 *                      不可推导；对账 = preflight 直接核仓库文件或跑 manifest 内不变量）；
 *   'unknown'        = 无证据（fail-closed：`--surfaces` 判 WARN（非绿）、`--strict` 判红）。
 *
 * 面分工（与契约六面对齐）：
 *   面 1  = 8 看护包（契约 hostSurface.packages 现行清单 = COMPAT-018/019 看护面）入口导出面
 *           `packages.<pkg>.keyExports`（⊆ 证据文件实测导出名）+ BUG-011 settings/sessions 断面
 *           `crossSections`（present/absent 双向断言——legacy `sessions.open`+`SettingsProvider` ↔
 *           0.2.x `openSession`/`retainedBy`/`mainSessionId`+`SettingsForms`，采集器实测复现）；
 *   面 2  = 槽位消费证据：`slots.<name>` = 注册声明形态（ui-layout 对象键形 `"slot":{kind:…}` /
 *           runner 键字段形 `key: "slot"`）+ 消费形态（`renderSlot` / `slots.inject`）与消费包名
 *           （**消费证据在宿主 client 包栈，不在 web index/vendor bundle**——BUG-012 阶段 A 判定；
 *           行号在证据文件内，不入本表——行号随版漂移，形态与包名才是契约）；
 *   面 3  = 槽位 DOM 物化锚点（`data-shell-overlay` / `data-slot`——宿主把已注册槽位物化成 DOM 的形态）；
 *   面 4  = 安装锚点（install 脚本机制名 + 仓库文件字面量核验，fixture-record）；
 *   面 5  = 预设机制真源（legacy `.agent-presets/` 目录 ↔ decl 声明行，fixture-record）；
 *   面 6  = 版本探测断言（代表版本 × 声明代在场 ⇒ detectGeneration 判回本代际——preflight 真跑的
 *           manifest 内不变量；registry 在场性由采集时的 npm view 实证）。
 *
 * 再生成（改扫描口径/新增代际时）：`node scripts/collect-host-surface-evidence.mjs`（只读 npm view/pack）
 * → 按产物更新本表（0.1.x 代际 npm 上若出现版本缺口：从既有 fixtures/契约记录取证据标 fixture-record，
 * 无据面显式 unknown——绝不默认绿）。unknown 代际六面恒 unknown（不投影、不承诺）。
 *
 * 纯度契约不变：本表是纯数据（零 IO）；证据文件的读取与对账归 preflight CLI。
 */
export const SURFACE_EVIDENCE_STATUSES = deepFreeze(['verified', 'fixture-record', 'unknown'])

const UNKNOWN_FACE = (reason) => ({ status: 'unknown', reason })

export const SURFACE_EVIDENCE = deepFreeze({
  'legacy-0.1': {
    representativeVersion: '0.1.5-rc.2',
    evidenceSource: 'tarball-scan',
    evidenceFile: 'test/fixtures/host-generations/legacy-0.1/surfaces/surfaces.json',
    collectedAt: '2026-11-07',
    regenerate: 'node scripts/collect-host-surface-evidence.mjs --gens legacy-0.1',
    faces: {
      1: {
        status: 'verified',
        note: '8 看护包入口导出面 + BUG-011 settings/sessions 断面（0.1.5-rc.2 tarball 实测；cordis/schemastery 版本按 @deepseek-ai/dsh 主包依赖钉解析 = 契约 versionExceptions 口径）',
        packages: {
          cordis: { version: '4.0.2', keyExports: ['Service', 'resolveConfig'] },
          schemastery: { version: '3.18.2', keyExports: ['default'] },
          'dsh-settings': { version: '0.1.5-rc.2', keyExports: ['SettingsConflictError', 'SettingsProvider', 'default', 'redactSecrets'] },
          'dsh-api-gateway': { version: '0.1.5-rc.2', keyExports: ['TypertGatewayError', 'TypertGatewayService', 'default'] },
          'dsh-client-modules': { version: '0.1.5-rc.2', keyExports: ['ClientModuleRegistry', 'bootInjections', 'default'] },
          'dsh-client-connection': { version: '0.1.5-rc.2', keyExports: ['HostConnectionService', 'Config', 'apply', 'inject', 'name'] },
          'dsh-home-paths': { version: '0.1.5-rc.2', keyExports: ['resolveDshHome', 'dshHomePath', 'expandHomePath'] },
          'dsh-tools': { version: '0.1.5-rc.2', keyExports: ['defineTool', 'ToolRuntime', 'default'] },
        },
        crossSections: {
          settings: { present: ['SettingsProvider'], absent: ['SettingsForms'], source: 'BUG-011 断面：0.1.x 由 settings.register 消费 SettingsProvider' },
          sessions: { present: ['sessions.open'], absent: ['retainedBy', 'mainSessionId'], source: 'BUG-011 断面：0.1.x sessions.open + 快照 current/completed（openSession 两侧都在场 = uiWorkspace 方法，判别键 = sessions.open / retainedBy / mainSessionId）' },
        },
      },
      2: {
        status: 'verified',
        note: '槽位消费证据（0.1.5-rc.2 tarball 实测）：shell.overlay 双注册（ui-layout 对象键 + runner 键字段）+ renderSlot 消费；侧栏/设置槽由 runner 注册——消费证据位置在宿主 client 包栈，非 web index/vendor bundle',
        slots: {
          'shell.overlay': {
            consumers: ['dsh-client-ui-layout', 'dsh-cordis-client-runner'],
            registrationForms: ['object-key', 'key-field'],
            consumptionForms: ['renderSlot', 'slots.inject'],
          },
          'sidebar.footer.action': {
            consumers: ['dsh-cordis-client-runner'],
            registrationForms: ['key-field'],
            consumptionForms: ['slots.inject'],
          },
          'settings.section': {
            consumers: ['dsh-cordis-client-runner'],
            registrationForms: ['key-field'],
            consumptionForms: ['slots.inject'],
          },
        },
      },
      3: {
        status: 'verified',
        note: '槽位 DOM 物化锚点（0.1.5-rc.2 tarball 实测）',
        domAnchors: {
          overlayContainer: { literal: 'data-shell-overlay', consumers: ['dsh-client-ui-layout'] },
          slotHost: { literal: 'data-slot', consumers: ['dsh-client-ui-renderer'] },
        },
      },
      4: {
        status: 'fixture-record',
        note: '安装锚点（0.1.x 分支：保留 insert 双保险 + .agent-presets 目录同步；仓库文件字面量由 preflight 核验）',
        anchors: [
          { mechanism: 'per-profile bundles 注册（profile package.json 的 dsh.profile.bundles）', checks: [{ file: 'install.ps1', literal: 'dsh.profile.bundles' }, { file: 'install.sh', literal: 'dsh.profile.bundles' }] },
          { mechanism: '宿主代系三态探测（decl/legacy/unknown；unknown fail-safe 不插行不写设置）', checks: [{ file: 'install.ps1', literal: 'HostGeneration' }, { file: 'install.sh', literal: 'host-generation' }] },
          { mechanism: '.agent-presets 预设目录同步（0.1.x 通道）', checks: [{ file: 'install.ps1', literal: '.agent-presets' }, { file: 'install.sh', literal: '.agent-presets' }] },
          { mechanism: 'profile insert 行双保险（0.1.x 分支保留 insert）', checks: [{ file: 'install.ps1', literal: 'insert' }, { file: 'install.sh', literal: 'insert' }] },
        ],
      },
      5: {
        status: 'fixture-record',
        note: '预设机制 = `.agent-presets/<id>/` 目录机制（0.1.x 通道真源；宿主官方已废弃但 0.1.x 仍消费）——legacy-only list-agents 行在场是该通道的形状证据',
        checks: [{ file: 'agent-presets/novel-writing/agent.cordis.yml', literal: 'tool-subagent-list-agents' }],
      },
      6: {
        status: 'fixture-record',
        note: '版本探测断言：代表版本 × 无声明代包 ⇒ detectGeneration 判回 legacy-0.1（preflight 真跑的不变量；registry 在场性由采集时 npm view 实证）',
        detectRoundTrip: { hostVersion: '0.1.5-rc.2', hasAgentPreset: false, expect: 'legacy-0.1' },
      },
    },
  },
  'decl-0.2.0': {
    representativeVersion: '0.2.0-rc.2',
    evidenceSource: 'tarball-scan',
    evidenceFile: 'test/fixtures/host-generations/decl-0.2.0/surfaces/surfaces.json',
    collectedAt: '2026-11-07',
    regenerate: 'node scripts/collect-host-surface-evidence.mjs --gens decl-0.2.0',
    faces: {
      1: {
        status: 'verified',
        note: '8 看护包入口导出面 + BUG-011 settings/sessions 断面（0.2.0-rc.2 tarball 实测；cordis 4.0.5 / schemastery 3.18.5——与 CHANGELOG BUG-011 记载的闭包实测一致）',
        packages: {
          cordis: { version: '4.0.5', keyExports: ['Service', 'resolveConfig'] },
          schemastery: { version: '3.18.5', keyExports: ['default'] },
          'dsh-settings': { version: '0.2.0-rc.2', keyExports: ['SettingsConflictError', 'SettingsForms', 'default', 'redactSecrets'] },
          'dsh-api-gateway': { version: '0.2.0-rc.2', keyExports: ['TypertGatewayError', 'TypertGatewayService', 'default'] },
          'dsh-client-modules': { version: '0.2.0-rc.2', keyExports: ['ClientModuleRegistry', 'bootInjections', 'default'] },
          'dsh-client-connection': { version: '0.2.0-rc.2', keyExports: ['HostConnectionService', 'Config', 'apply', 'inject', 'name', 'OperatorPeer'] },
          'dsh-home-paths': { version: '0.2.0-rc.2', keyExports: ['resolveDshHome', 'dshHomePath', 'dshCachePath'] },
          'dsh-tools': { version: '0.2.0-rc.2', keyExports: ['defineTool', 'ToolRuntime', 'default'] },
        },
        crossSections: {
          settings: { present: ['SettingsForms'], absent: ['SettingsProvider'], source: 'BUG-011 断面：0.2.0 SettingsProvider→SettingsForms（register/get 消失，宿主 loader 消费插件 Config）' },
          sessions: { present: ['openSession', 'retainedBy', 'mainSessionId'], absent: ['sessions.open'], source: 'BUG-011 断面：0.2.0 sessions.open 消失，openSession + retainedBy.mainView 推导当前会话' },
        },
      },
      2: {
        status: 'verified',
        note: '槽位消费证据（0.2.0-rc.2 tarball 实测）：形态与 0.1.5 一致（槽协议未变——BUG-012 阶段 A 逐版比对的机械复现）',
        slots: {
          'shell.overlay': {
            consumers: ['dsh-client-ui-layout', 'dsh-cordis-client-runner'],
            registrationForms: ['object-key', 'key-field'],
            consumptionForms: ['renderSlot', 'slots.inject'],
          },
          'sidebar.footer.action': {
            consumers: ['dsh-cordis-client-runner'],
            registrationForms: ['key-field'],
            consumptionForms: ['slots.inject'],
          },
          'settings.section': {
            consumers: ['dsh-cordis-client-runner'],
            registrationForms: ['key-field'],
            consumptionForms: ['slots.inject'],
          },
        },
      },
      3: {
        status: 'verified',
        note: '槽位 DOM 物化锚点（0.2.0-rc.2 tarball 实测）',
        domAnchors: {
          overlayContainer: { literal: 'data-shell-overlay', consumers: ['dsh-client-ui-layout'] },
          slotHost: { literal: 'data-slot', consumers: ['dsh-client-ui-renderer'] },
        },
      },
      4: {
        status: 'fixture-record',
        note: '安装锚点（0.2.x 分支：不插 insert + 同 id 双通道冲突幂等撤除；仓库文件字面量由 preflight 核验）',
        anchors: [
          { mechanism: 'per-profile bundles 注册（profile package.json 的 dsh.profile.bundles）', checks: [{ file: 'install.ps1', literal: 'dsh.profile.bundles' }, { file: 'install.sh', literal: 'dsh.profile.bundles' }] },
          { mechanism: '宿主代系三态探测（decl/legacy/unknown；unknown fail-safe 不插行不写设置）', checks: [{ file: 'install.ps1', literal: 'HostGeneration' }, { file: 'install.sh', literal: 'host-generation' }] },
          { mechanism: '同 id 双通道冲突幂等撤除（0.2.x 分支撤历史 insert 行，防 SettingsForms 双层同 id fatal）', checks: [{ file: 'install.ps1', literal: '撤除' }, { file: 'install.sh', literal: '撤除' }] },
        ],
      },
      5: {
        status: 'fixture-record',
        note: '预设机制 = agentPresets.register 声明行（bundle patch 承载，替代 .agent-presets 目录机制）',
        checks: [
          { file: 'cordis.patch.yml', literal: 'preset-novel-writing' },
          { file: 'cordis.patch.yml', literal: '@deepseek-ai/dsh-agent-preset' },
        ],
      },
      6: {
        status: 'fixture-record',
        note: '版本探测断言：代表版本 × 声明代在场 ⇒ detectGeneration 判回 decl-0.2.0',
        detectRoundTrip: { hostVersion: '0.2.0-rc.2', hasAgentPreset: true, expect: 'decl-0.2.0' },
      },
    },
  },
  'decl-0.2.1': {
    representativeVersion: '0.2.1-rc.2',
    evidenceSource: 'tarball-scan',
    evidenceFile: 'test/fixtures/host-generations/decl-0.2.1/surfaces/surfaces.json',
    collectedAt: '2026-11-07',
    regenerate: 'node scripts/collect-host-surface-evidence.mjs --gens decl-0.2.1',
    faces: {
      1: {
        status: 'verified',
        note: '8 看护包入口导出面 + BUG-011 settings/sessions 断面（0.2.1-rc.2 tarball 实测）',
        packages: {
          cordis: { version: '4.0.5', keyExports: ['Service', 'resolveConfig'] },
          schemastery: { version: '3.18.5', keyExports: ['default'] },
          'dsh-settings': { version: '0.2.1-rc.2', keyExports: ['SettingsConflictError', 'SettingsForms', 'default', 'redactSecrets'] },
          'dsh-api-gateway': { version: '0.2.1-rc.2', keyExports: ['TypertGatewayError', 'TypertGatewayService', 'default'] },
          'dsh-client-modules': { version: '0.2.1-rc.2', keyExports: ['ClientModuleRegistry', 'bootInjections', 'default'] },
          'dsh-client-connection': { version: '0.2.1-rc.2', keyExports: ['HostConnectionService', 'Config', 'apply', 'inject', 'name', 'Peer', 'CONNECT_PATH'] },
          'dsh-home-paths': { version: '0.2.1-rc.2', keyExports: ['resolveDshHome', 'dshHomePath', 'resolveAgentsHome'] },
          'dsh-tools': { version: '0.2.1-rc.2', keyExports: ['defineTool', 'ToolRuntime', 'default'] },
        },
        crossSections: {
          settings: { present: ['SettingsForms'], absent: ['SettingsProvider'], source: 'BUG-011 断面（同 decl-0.2.0）' },
          sessions: { present: ['openSession', 'retainedBy', 'mainSessionId'], absent: ['sessions.open'], source: 'BUG-011 断面（同 decl-0.2.0）' },
        },
      },
      2: {
        status: 'verified',
        note: '槽位消费证据（0.2.1-rc.2 tarball 实测）：形态与 0.1.5 一致（槽协议未变）',
        slots: {
          'shell.overlay': {
            consumers: ['dsh-client-ui-layout', 'dsh-cordis-client-runner'],
            registrationForms: ['object-key', 'key-field'],
            consumptionForms: ['renderSlot', 'slots.inject'],
          },
          'sidebar.footer.action': {
            consumers: ['dsh-cordis-client-runner'],
            registrationForms: ['key-field'],
            consumptionForms: ['slots.inject'],
          },
          'settings.section': {
            consumers: ['dsh-cordis-client-runner'],
            registrationForms: ['key-field'],
            consumptionForms: ['slots.inject'],
          },
        },
      },
      3: {
        status: 'verified',
        note: '槽位 DOM 物化锚点（0.2.1-rc.2 tarball 实测）',
        domAnchors: {
          overlayContainer: { literal: 'data-shell-overlay', consumers: ['dsh-client-ui-layout'] },
          slotHost: { literal: 'data-slot', consumers: ['dsh-client-ui-renderer'] },
        },
      },
      4: {
        status: 'fixture-record',
        note: '安装锚点（0.2.x 分支：同 decl-0.2.0）',
        anchors: [
          { mechanism: 'per-profile bundles 注册（profile package.json 的 dsh.profile.bundles）', checks: [{ file: 'install.ps1', literal: 'dsh.profile.bundles' }, { file: 'install.sh', literal: 'dsh.profile.bundles' }] },
          { mechanism: '宿主代系三态探测（decl/legacy/unknown；unknown fail-safe 不插行不写设置）', checks: [{ file: 'install.ps1', literal: 'HostGeneration' }, { file: 'install.sh', literal: 'host-generation' }] },
          { mechanism: '同 id 双通道冲突幂等撤除（0.2.x 分支撤历史 insert 行，防 SettingsForms 双层同 id fatal）', checks: [{ file: 'install.ps1', literal: '撤除' }, { file: 'install.sh', literal: '撤除' }] },
        ],
      },
      5: {
        status: 'fixture-record',
        note: '预设机制 = agentPresets.register 声明行（同 decl-0.2.0）',
        checks: [
          { file: 'cordis.patch.yml', literal: 'preset-novel-writing' },
          { file: 'cordis.patch.yml', literal: '@deepseek-ai/dsh-agent-preset' },
        ],
      },
      6: {
        status: 'fixture-record',
        note: '版本探测断言：代表版本 × 声明代在场 ⇒ detectGeneration 判回 decl-0.2.1',
        detectRoundTrip: { hostVersion: '0.2.1-rc.2', hasAgentPreset: true, expect: 'decl-0.2.1' },
      },
    },
  },
  'decl-0.2.2': {
    representativeVersion: '0.2.2-rc.1',
    evidenceSource: 'tarball-scan',
    evidenceFile: 'test/fixtures/host-generations/decl-0.2.2/surfaces/surfaces.json',
    collectedAt: '2026-11-07',
    regenerate: 'node scripts/collect-host-surface-evidence.mjs --gens decl-0.2.2',
    faces: {
      1: {
        status: 'verified',
        note: '8 看护包入口导出面 + BUG-011 settings/sessions 断面（0.2.2-rc.1 tarball 实测；cordis 4.1.0 / schemastery 3.19.0）',
        packages: {
          cordis: { version: '4.1.0', keyExports: ['Service', 'resolveConfig'] },
          schemastery: { version: '3.19.0', keyExports: ['default'] },
          'dsh-settings': { version: '0.2.2-rc.1', keyExports: ['SettingsConflictError', 'SettingsForms', 'default', 'redactSecrets'] },
          'dsh-api-gateway': { version: '0.2.2-rc.1', keyExports: ['TypertGatewayError', 'TypertGatewayService', 'default'] },
          'dsh-client-modules': { version: '0.2.2-rc.1', keyExports: ['ClientModuleRegistry', 'bootInjections', 'default'] },
          'dsh-client-connection': { version: '0.2.2-rc.1', keyExports: ['HostConnectionService', 'Config', 'apply', 'inject', 'name', 'Peer', 'CONNECT_PATH'] },
          'dsh-home-paths': { version: '0.2.2-rc.1', keyExports: ['resolveDshHome', 'dshHomePath', 'resolveAgentsHome'] },
          'dsh-tools': { version: '0.2.2-rc.1', keyExports: ['defineTool', 'ToolRuntime', 'ToolsService', 'default'] },
        },
        crossSections: {
          settings: { present: ['SettingsForms'], absent: ['SettingsProvider'], source: 'BUG-011 断面（同 decl-0.2.0）' },
          sessions: { present: ['openSession', 'retainedBy', 'mainSessionId'], absent: ['sessions.open'], source: 'BUG-011 断面（同 decl-0.2.0）' },
        },
      },
      2: {
        status: 'verified',
        note: '槽位消费证据（0.2.2-rc.1 tarball 实测）：形态与 0.1.5 逐版一致——BUG-012 阶段 A「槽协议未变」结论的机械复现（ui-layout 注册 L725 / renderSlot L346，行号在证据文件）',
        slots: {
          'shell.overlay': {
            consumers: ['dsh-client-ui-layout', 'dsh-cordis-client-runner'],
            registrationForms: ['object-key', 'key-field'],
            consumptionForms: ['renderSlot', 'slots.inject'],
          },
          'sidebar.footer.action': {
            consumers: ['dsh-cordis-client-runner'],
            registrationForms: ['key-field'],
            consumptionForms: ['slots.inject'],
          },
          'settings.section': {
            consumers: ['dsh-cordis-client-runner'],
            registrationForms: ['key-field'],
            consumptionForms: ['slots.inject'],
          },
        },
      },
      3: {
        status: 'verified',
        note: '槽位 DOM 物化锚点（0.2.2-rc.1 tarball 实测）',
        domAnchors: {
          overlayContainer: { literal: 'data-shell-overlay', consumers: ['dsh-client-ui-layout'] },
          slotHost: { literal: 'data-slot', consumers: ['dsh-client-ui-renderer', 'dsh-client-ui-workspace'] },
        },
      },
      4: {
        status: 'fixture-record',
        note: '安装锚点（0.2.x 分支：同 decl-0.2.0）',
        anchors: [
          { mechanism: 'per-profile bundles 注册（profile package.json 的 dsh.profile.bundles）', checks: [{ file: 'install.ps1', literal: 'dsh.profile.bundles' }, { file: 'install.sh', literal: 'dsh.profile.bundles' }] },
          { mechanism: '宿主代系三态探测（decl/legacy/unknown；unknown fail-safe 不插行不写设置）', checks: [{ file: 'install.ps1', literal: 'HostGeneration' }, { file: 'install.sh', literal: 'host-generation' }] },
          { mechanism: '同 id 双通道冲突幂等撤除（0.2.x 分支撤历史 insert 行，防 SettingsForms 双层同 id fatal）', checks: [{ file: 'install.ps1', literal: '撤除' }, { file: 'install.sh', literal: '撤除' }] },
        ],
      },
      5: {
        status: 'fixture-record',
        note: '预设机制 = agentPresets.register 声明行（同 decl-0.2.0；0.2.2 源 0 行 legacy-only list-agents 由 GENERATION_DROPPED 双源不变量另守）',
        checks: [
          { file: 'cordis.patch.yml', literal: 'preset-novel-writing' },
          { file: 'cordis.patch.yml', literal: '@deepseek-ai/dsh-agent-preset' },
        ],
      },
      6: {
        status: 'fixture-record',
        note: '版本探测断言：代表版本 × 声明代在场 ⇒ detectGeneration 判回 decl-0.2.2',
        detectRoundTrip: { hostVersion: '0.2.2-rc.1', hasAgentPreset: true, expect: 'decl-0.2.2' },
      },
    },
  },
  unknown: {
    representativeVersion: null,
    evidenceSource: 'unknown',
    evidenceFile: null,
    collectedAt: null,
    regenerate: null,
    faces: {
      1: UNKNOWN_FACE('unknown 代际 fail-closed：无消费方证据、不承诺（RISK-C8）'),
      2: UNKNOWN_FACE('unknown 代际 fail-closed：无槽位消费证据、不承诺（RISK-C8）'),
      3: UNKNOWN_FACE('unknown 代际 fail-closed：无 DOM 物化锚点证据、不承诺（RISK-C8）'),
      4: UNKNOWN_FACE('unknown 代际 fail-closed：无安装锚点证据、不承诺（RISK-C8）'),
      5: UNKNOWN_FACE('unknown 代际 fail-closed：无预设机制证据、不承诺（RISK-C8）'),
      6: UNKNOWN_FACE('unknown 代际 fail-closed：无版本探测断言、不承诺（RISK-C8）'),
    },
  },
})

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
