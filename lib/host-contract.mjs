/**
 * host-contract.mjs — 宿主依赖面机读声明式契约（COMPAT-002；DEC-025 ADR 决策①落地地基）。
 *
 * 本文件是纯数据清单：零 import（不依赖任何宿主包）、零运行时逻辑（无函数定义/无求值表达式），
 * 供 CI / smoke / 诊断三方直接 import 消费。提取底稿 = COMPAT-001 宿主兼容性分析 §3 六面全量清点
 * （docs/research/COMPAT-001-host-compat-analysis.md，61 处行号抽核 0 失实）；
 * 六面 47 项 = 面1 服务端 11 + 面2 客户端 13 + 面3 DOM·前端约定 7 + 面4 安装注册 6 + 面5 预设 manifest 5 + 面6 版本环境 5。
 *
 * 条目 schema 样例（一条完整条目，逐字段语义）：
 *   {
 *     face: 2,                                   // 面 1-6：1=服务端 API / 2=客户端 API / 3=宿主 DOM·前端约定 / 4=安装注册机制 / 5=预设与 manifest / 6=版本与环境
 *     item: '2.13',                              // §3 原编号——溯源键，逐项对照分析文档表格行（面内自 1 连续递增）
 *     kind: 'slot',                              // 依赖形态类别（枚举：import / inject / api-call / service-name / remote-namespace / reactive-store / event / slot / module-loader / dom-selector / dom-structure / layout-technique / css-token / dom-interop / dom-observer / storage-key / install-detection / install-link / install-register / install-preset / manifest-field / preset-manifest / preset-packages / preset-yaml-eval / preset-skill-dirs / preset-location / version-policy / version-matrix / ci-mock / env-fact）
 *     symbol: "ctx.slots.inject('settings.section'|'sidebar.footer.action'|'shell.overlay')", // 宿主符号/接口/字面量——人读描述 + grep 语义锚点
 *     file: 'lib/client.js',                     // 仓库相对路径（string 或 string[]；null = 无单一落点〔隐式约定/环境事实〕）
 *     line: 'L4403-4435',                        // 行号或行段（string，以 §3 底稿为准；null 同上）
 *     necessity: 'required',                     // 必要性（九值枚举，见下）
 *     note: '无替代挂载通道',                     // 可选：口径补充/收敛方向/历史勾稽说明
 *     incident: 'TP-2',                          // 可选：事故/风险/待验证关联（BUG-xxx / RISK-xxx / UX-xxx / TP-x）
 *   }
 *
 * necessity 九值口径（§3 判定口径的机读化）：
 *   required        = 必需（功能本质依赖且无替代路径）
 *   consolidatable  = 可收敛（有降级或移除路径，标收敛方向）
 *   adapted         = 已适配（依赖存在但已有单点收口防护）
 *   optional        = 可选（生态约定，非宿主官方）
 *   improvable      = 可改进（口径缺口而非缺陷）
 *   own             = 自有（插件自有点、无宿主耦合；列出为完整性——REVIEW-COMPAT-001-R1 F10 统一口径恰 1 项：3.7）
 *   eliminated      = 已消除（历史依赖退役；保留在册供历史勾稽——恰 1 项：1.4 settingsNamespace）
 *   adapted-drift   = 已适配但存在漂移面（对账时以现文件实状为准）
 *   awareness       = 必需认知（环境事实，无代码落点）
 */

export const hostContract = {
  schemaVersion: 1,
  task: 'COMPAT-002',
  source: 'docs/research/COMPAT-001-host-compat-analysis.md#3（宿主依赖面六面全量清点）',
  faces: [
    { id: 1, name: '服务端 API 面', scope: 'lib/index.js + lib/tools.js' },
    { id: 2, name: '客户端 API 面', scope: 'lib/client.js（makeHostApi 覆盖的全部调用点）' },
    { id: 3, name: '宿主 DOM/前端约定面', scope: 'lib/client.js 布局引擎 + 样式' },
    { id: 4, name: '安装与注册机制面', scope: 'install.ps1 / install.sh / cordis.patch.yml / package.json dsh 字段' },
    { id: 5, name: '预设与 manifest 面', scope: 'agent-presets/novel-writing/' },
    { id: 6, name: '版本与环境面', scope: 'package.json / .github/workflows/ci.yml / 宿主分发通道事实' },
  ],
  items: [
    // ── 面 1 — 服务端 API 面（11 项）──
    { face: 1, item: '1.1', kind: 'import', symbol: "@deepseek-ai/cordis 具名导出 Service（服务基类，cordis 插件模型本体）", file: 'lib/index.js', line: 'L17', necessity: 'required', note: 'CI mock（ci.yml L72-75）+ BUG-003 后逐项核验（EVD-076）' },
    { face: 1, item: '1.2', kind: 'import', symbol: '@deepseek-ai/schemastery 默认导出 z（Config schema，settings.register 消费）', file: 'lib/index.js', line: 'L16', necessity: 'required', note: 'CI 用真包（ci.yml L71，registry 安装——RISK-001：mock 无法覆盖链式 API）' },
    { face: 1, item: '1.3', kind: 'import', symbol: '@deepseek-ai/dsh-home-paths 具名导出 resolveDshHome（预设同步目标根路径解析）', file: 'lib/index.js', line: 'L18（调用点 L163、L1360）', necessity: 'required', note: '与宿主 DSH_HOME 解析逻辑必须一致；CI mock（ci.yml L80-85）' },
    { face: 1, item: '1.4', kind: 'import', symbol: 'settingsNamespace 具名导入（已退役：BUG-003 修复改为字符串常量 L33）', file: 'lib/index.js', line: '原 L18 → 现 L33 字符串常量', necessity: 'eliminated', incident: 'BUG-003', note: '已消除但保留在册供历史勾稽（F10 口径）；CI mock 漂移见 6.4' },
    { face: 1, item: '1.5', kind: 'inject', symbol: "inject = ['settings']（settings 硬依赖声明，cordis inject 机制）", file: 'lib/index.js', line: 'L30', necessity: 'required' },
    { face: 1, item: '1.6', kind: 'api-call', symbol: 'ctx.settings.register(NS, Config) / ctx.settings.get(NS)', file: 'lib/index.js', line: 'L1423 / L88', necessity: 'required', incident: 'BUG-003', note: 'NS 形态 symbol→string 事故点；smoke 全量行为测试' },
    { face: 1, item: '1.7', kind: 'service-name', symbol: "super(ctx, 'novel-writing')（服务注册名）", file: 'lib/index.js', line: 'L82', necessity: 'required' },
    { face: 1, item: '1.8', kind: 'api-call', symbol: "ctx.get('webServer')（可选）+ webServer.register({kind:'exact', path, handler}) ×13 路由（/novel-writing/api/*）", file: 'lib/index.js', line: 'L1427-1431 / L1229-1289', necessity: 'required', note: '客户端轮询数据面；webServer 缺席已有降级警告（L1431）' },
    { face: 1, item: '1.9', kind: 'api-call', symbol: 'ctx.effect(fn, label)（生命周期清理，cordis 核心）', file: 'lib/index.js', line: 'L1429', necessity: 'required' },
    { face: 1, item: '1.10', kind: 'api-call', symbol: "ctx.emit('novel-writing/changed') / ctx.logger（变更事件 + 日志）", file: 'lib/index.js', line: 'L148 / L114', necessity: 'required' },
    { face: 1, item: '1.11', kind: 'import', symbol: '@deepseek-ai/dsh-tools 具名导出 defineTool + inject=[\'tools\'] + ctx.tools.register(defineTool(...)) ×11 工具', file: 'lib/tools.js', line: 'L17 / L22 / L46', necessity: 'required', note: '工具行本质依赖；defineTool 为薄包装、可特性检测降级直传（轴①，收益小）' },

    // ── 面 2 — 客户端 API 面（13 项）──
    { face: 2, item: '2.1', kind: 'module-loader', symbol: "window.__ModuleLoader__.load({id:'dsh-novel-writing', factory})（客户端模块注册约定）", file: 'lib/client.js', line: 'L92-94', necessity: 'required', note: 'dsh-client-modules 强制单 id 注册' },
    { face: 2, item: '2.2', kind: 'import', symbol: "require('react')（factory 内，宿主提供的 react）", file: 'lib/client.js', line: 'L97', necessity: 'required' },
    { face: 2, item: '2.3', kind: 'inject', symbol: "inject = ['slots','connection','locale']（三服务硬依赖声明）", file: 'lib/client.js', line: 'L4350', necessity: 'consolidatable', incident: 'BUG-004', note: 'connection 仅剩回退用途（L532 legacyApi）、locale 仅读 i18n 快照——均可降级为可选探测（轴① A1/A3）' },
    { face: 2, item: '2.4', kind: 'api-call', symbol: 'connection.api（旧宿主 ≤0.1.x API 回退，全文件唯一特性检测点）', file: 'lib/client.js', line: 'L532 / L556 / L572 / L581 / L620 / L629', necessity: 'adapted', incident: 'BUG-004', note: 'makeHostApi 单点收口；代码级引用恰 1 处（EVD-077 审查复核 + smoke 断言）' },
    { face: 2, item: '2.5', kind: 'remote-namespace', symbol: 'remote.settings（describe/update/mutate；位置参数 + expectedRevision acceptsUndefined 形状）', file: 'lib/client.js', line: 'L547-557', necessity: 'required', incident: 'BUG-004', note: '12 组形状映射之一（makeHostApi）' },
    { face: 2, item: '2.6', kind: 'remote-namespace', symbol: 'remote.session（create/prompt/cancel；requestId 必填铸造 L489-497）', file: 'lib/client.js', line: 'L558-573', necessity: 'required', incident: 'BUG-004' },
    { face: 2, item: '2.7', kind: 'remote-namespace', symbol: 'remote.workspace + workspaces 快照服务（list=getSnapshot/subscribe、phase pending→ready、awaitWorkspacesReady 订阅等待 L499-525）', file: 'lib/client.js', line: 'L574-601', necessity: 'required', incident: 'BUG-004' },
    { face: 2, item: '2.8', kind: 'remote-namespace', symbol: 'remote.directoryPicker（pick string→{path} 包装 L610 / createDirectory / list）', file: 'lib/client.js', line: 'L602-621', necessity: 'required', incident: 'BUG-004' },
    { face: 2, item: '2.9', kind: 'remote-namespace', symbol: 'remote.agentPresets（select 两参位置）', file: 'lib/client.js', line: 'L622-630', necessity: 'required', incident: 'BUG-004' },
    { face: 2, item: '2.10', kind: 'reactive-store', symbol: 'sessions.list ObservableSnapshot（getSnapshot/subscribe 形状校验 L1201-1204，makeSessionsHookReactive）', file: 'lib/client.js', line: 'L1195-1259', necessity: 'required', incident: 'BUG-005', note: '会话状态镜像（零轮询）' },
    { face: 2, item: '2.11', kind: 'api-call', symbol: 'launcher.sessions（sessions.open(sessionId) 打开/切换会话）', file: 'lib/client.js', line: 'L1300-1310', necessity: 'required' },
    { face: 2, item: '2.12', kind: 'event', symbol: "ctx.on('internal/service')（单一监听器双消费：launcher 重 setup + hook.refresh）", file: 'lib/client.js', line: 'L4377-4383', necessity: 'required', incident: 'BUG-004+BUG-005', note: 'cordis 4.x 事件（EVD-077 实证）；服务缺席↔到位自愈' },
    { face: 2, item: '2.13', kind: 'slot', symbol: "ctx.slots.inject('settings.section'|'sidebar.footer.action'|'shell.overlay') + ctx.slots.register({name,id,order,label}) ×6 注册", file: 'lib/client.js', line: 'L4403-4435', necessity: 'required', note: 'UI 挂载槽位名约定，无替代挂载通道；槽位名稳定性 TP-2 待验证' },

    // ── 面 3 — 宿主 DOM/前端约定面（7 项）──
    { face: 3, item: '3.1', kind: 'dom-selector', symbol: "document.querySelectorAll('[data-phase]')（findConversationRoot：phase=active 优先 + children≥2 + 排除 TEXTAREA/INPUT）", file: 'lib/client.js', line: 'L821-829', necessity: 'required', incident: 'RISK-003', note: '宿主无官方布局 API；dsh-worktable 同款约定；null → 不做布局降级（L891-892）' },
    { face: 3, item: '3.2', kind: 'dom-structure', symbol: 'root.children[0]=header / root.children[1]=viewArea 结构假设', file: 'lib/client.js', line: 'L893-894 / L977', necessity: 'required', incident: 'RISK-003', note: 'undefined 检查降级（L895 return false）' },
    { face: 3, item: '3.3', kind: 'layout-technique', symbol: 'margin 挤压（marginLeft/Right/Top + width 双压——UX-018 修复：margin 不触发宿主响应式重排，需显式 width）', file: 'lib/client.js', line: 'L905-908 / L986-997 / L1043-1045', necessity: 'required', incident: 'RISK-003 + UX-018', note: 'dsh-worktable 同款；saved* 原值恢复机制完备 + 让位观察器（L943-955）' },
    { face: 3, item: '3.4', kind: 'css-token', symbol: '--dsw-alias-* 令牌族（TK 令牌表 + NV_STYLE 全量 var(--dsw-alias-*, 兜底值) + color-mix 派生 L4304-4327）', file: 'lib/client.js', line: 'L680-693', necessity: 'required', note: '§3 计 12 项=TK 表条目（fill-l1 ×2）；全文件去重令牌名恰 12 个（见 regionLiterals.cssTokens）；兜底取值对齐 dsh-worktable styles.ts；令牌稳定化 TP-3 待验证' },
    { face: 3, item: '3.5', kind: 'dom-interop', symbol: ".ta_splitClose 类名点击 + 'dsh:split-claim' CustomEvent（与 dsh-worktable 跨插件分栏互操作）", file: 'lib/client.js', line: 'L879-890', necessity: 'optional', note: '生态约定非宿主官方；try/catch 包裹 + claim 监听让位（L4387-4398）' },
    { face: 3, item: '3.6', kind: 'dom-observer', symbol: "ResizeObserver + MutationObserver(attributeFilter:['data-phase'])（DOM/尺寸变化跟随重锚定）", file: 'lib/client.js', line: 'L917-940 / L2776', necessity: 'required', incident: 'RISK-003', note: '探测的是变化后的自救，不是宿主约定的变更探测' },
    { face: 3, item: '3.7', kind: 'storage-key', symbol: "localStorage 键：dsh.novel.split.v1 / dsh.novel.defaults.v1 / dsh.novel.order.v1", file: 'lib/client.js', line: 'L727-729 等', necessity: 'own', note: '自有口径统一=1 项（REVIEW-COMPAT-001-R1 F10）：插件自有点、无宿主耦合，列出为完整性' },

    // ── 面 4 — 安装与注册机制面（6 项）──
    { face: 4, item: '4.1', kind: 'install-detection', symbol: 'profiles/<Profile>/package.json 存在 = dsh ≥0.1.5 新布局（安装通道分流特征检测）', file: ['install.ps1', 'install.sh'], line: 'L123-134 / L47-57', necessity: 'required', incident: 'BUG-006', note: 'BUG-006 修复引入；隔离演练双布局+变体+降级（EVD-081）' },
    { face: 4, item: '4.2', kind: 'install-link', symbol: 'junction/symlink 接入（新=profile 私有 node_modules；旧=全局；失败回退拷贝）', file: ['install.ps1', 'install.sh'], line: 'L128-177 / L58-73', necessity: 'required', incident: 'BUG-006', note: '幂等二跑字节级零漂移（EVD-081）' },
    { face: 4, item: '4.3', kind: 'install-register', symbol: 'profile package.json dependencies.dsh-novel-writing=file:<src> + dsh.profile.bundles 追加（幂等三分支）', file: ['install.ps1', 'install.sh'], line: 'L179-238 / L75-186', necessity: 'required', incident: 'BUG-006', note: 'PS 5.1 自研 JSON 序列化器（L36-88）；sh 端 node -e→python3→降级三档；三套注册实现维护成本 P2-4' },
    { face: 4, item: '4.4', kind: 'install-register', symbol: 'cordis.patch.yml insert 行兜底（[] 空根/已有 insert 块/无 insert 三形态）+ 仓库自带 cordis.patch.yml dual-face 行声明', file: ['install.ps1', 'install.sh', 'cordis.patch.yml'], line: 'L240-304 / L188-205 / L10-12', necessity: 'required', incident: 'BUG-006', note: '注册兜底双保险（EVD-080 实证 B 路径独立有效）' },
    { face: 4, item: '4.5', kind: 'install-preset', symbol: '$DSH_HOME/.agent-presets/novel-writing/ 预设同步 + settings.yaml 默认节写入 + 服务端 ensurePreset（.dsh-bundle-version 标记 + staging 原子换入）', file: ['install.ps1', 'install.sh', 'lib/index.js'], line: 'L306-339 / L207-232 / L157-184', necessity: 'required', incident: 'BUG-006（间接）', note: 'BUG-006 间接触发（EVD-080：宿主 router 掉线致 settings.yaml agent-presets.default 失效——环境侧连锁）' },
    { face: 4, item: '4.6', kind: 'manifest-field', symbol: 'package.json dsh 专有字段（dsh.bundle.patch=./cordis.patch.yml、dsh.client.platform=web、dsh.client.inject=[dsh-client-ui-settings, dsh-client-locale, dsh-api-remotes]）', file: ['package.json'], line: 'L17-29', necessity: 'required', incident: 'BUG-004', note: 'BUG-004 修正过：移除不存在的 dsh-client-runtime；CI 结构检查（ci.yml L45-47）' },

    // ── 面 5 — 预设与 manifest 面（5 项）──
    { face: 5, item: '5.1', kind: 'preset-manifest', symbol: 'preset.yml name=小说写作工作流 / description（宿主预设选择器消费的清单格式）', file: 'agent-presets/novel-writing/preset.yml', line: 'L1-2', necessity: 'required', note: 'validate-preset 29 项（CI L35-36）' },
    { face: 5, item: '5.2', kind: 'preset-packages', symbol: 'agent.cordis.yml 16+ 宿主包行（dsh-persona / dsh-agent-instructions / dsh-tool-bash·pwsh·fs·fs-search·jobs / dsh-skill-filesystem / dsh-tool-skill / dsh-tool-goal / dsh-plan-mode / dsh-compaction×3 / dsh-tool-subagent×5 / dsh-workflow-worker-thread / dsh-tool-workflow / dsh-tool-ralph / dsh-tool-ask-user / dsh-tool-todo / dsh-tool-web）', file: 'agent-presets/novel-writing/agent.cordis.yml', line: 'L16-216', necessity: 'required', note: 'AGENT-PLANE 组合（预设=宿主包组合，本质依赖）；可选依赖设计良好（L88-89 tool-novel 未装静默）；包行名稳定性 TP-2 同类待验证' },
    { face: 5, item: '5.3', kind: 'preset-yaml-eval', symbol: "!!js 表达式（process.platform / process.getBuiltinModule('node:url')——cordis YAML 求值约定，平台分流/skill 目录解析）", file: 'agent-presets/novel-writing/agent.cordis.yml', line: 'L52 / L56 / L81', necessity: 'required' },
    { face: 5, item: '5.4', kind: 'preset-skill-dirs', symbol: 'skill-filesystem customSkillDirs + baseUrl 相对解析（26+ SKILL 目录加载约定）', file: 'agent-presets/novel-writing/agent.cordis.yml', line: 'L77-81', necessity: 'required', note: 'validate-preset + CI skills≥25 检查（ci.yml L52-54）' },
    { face: 5, item: '5.5', kind: 'preset-location', symbol: '$DSH_HOME/.agent-presets/<preset-id>/ 预设目录约定（install 同步 + index.js ensurePreset 双端落地）', file: ['install.ps1', 'install.sh', 'lib/index.js'], line: 'L306-316 / L207-216 / L157-184', necessity: 'required', incident: 'BUG-006（环境连锁，见 4.5）', note: '版本标记幂等' },

    // ── 面 6 — 版本与环境面（5 项）──
    { face: 6, item: '6.1', kind: 'version-policy', symbol: 'peerDependencies 全 *（cordis / schemastery / dsh-settings / dsh-home-paths / dsh-tools）', file: 'package.json', line: 'L41-47', necessity: 'improvable', note: '* = 不设限=不设防（无下限=隐式信任任意未来版本）；junction 共享 profile node_modules 保证闭包内一致；CI 依赖架构守卫（ci.yml L21-34）；四次事故都在 * 口径下发生' },
    { face: 6, item: '6.2', kind: 'version-policy', symbol: 'engines.node>=20（运行时下限）', file: 'package.json', line: 'L8-10', necessity: 'required', note: '无 enforcement（npm warn 级）' },
    { face: 6, item: '6.3', kind: 'version-matrix', symbol: '隐式支持版本矩阵：0.1.x 旧表面（connection.api 回退）+ 0.1.2-rc.1（remote.*）+ 0.1.5-rc.1（profile 布局）——双表面×双布局', file: null, line: null, necessity: 'improvable', incident: 'BUG-003/004/005/006', note: '矩阵未显式声明（README 未列）；旧表面支持是隐式承诺——DEC-025 轴③ 落地后由本契约承载显式化' },
    { face: 6, item: '6.4', kind: 'ci-mock', symbol: 'CI 宿主替身表面（cordis Service mock / dsh-settings mock / dsh-home-paths mock / dsh-tools mock + schemastery 真包）', file: '.github/workflows/ci.yml', line: 'L70-89', necessity: 'adapted-drift', incident: 'BUG-003（温床）', note: '§3 记录时 dsh-settings mock 仍导出已删除的 settingsNamespace（≠ 真实 0.1.5-rc.2 导出面）——该漂移已由 COMPAT-010 修正（CHANGELOG [Unreleased]）；对账以 ci.yml 实状为准' },
    { face: 6, item: '6.5', kind: 'env-fact', symbol: '宿主升级通道：npx @deepseek-ai/dsh → npm latest（rc 版直接打 latest tag；0.1.2-rc.1→0.1.5-rc.1 跳变实证 EVD-080；npx 缓存 per-闭包）', file: null, line: null, necessity: 'awareness', incident: 'BUG-006（触发路径）', note: '插件无法控制宿主何时升级——升级不可预测' },
  ],

  // F8 首批 region 字面量对账清单——lib/client.js 现有四类宿主耦合字面量。
  // smoke 逐项断言：每个字面量存在于 client.js 源码（grep 语义）且源码提取面 ⊆ 本清单（双向对账）。
  regionLiterals: {
    file: 'lib/client.js',
    slotNames: ['settings.section', 'sidebar.footer.action', 'shell.overlay'],
    serviceNames: {
      inject: ['slots', 'connection', 'locale'],
      ctxGet: ['connection', 'locale', 'sessions'],
      svcDomains: ['remote.settings', 'remote.session', 'remote.workspace', 'workspaces', 'remote.directoryPicker', 'remote.agentPresets'],
      events: ['internal/service'],
    },
    cssTokens: [
      '--dsw-alias-border-l1',
      '--dsw-alias-border-l2',
      '--dsw-alias-fill-l1',
      '--dsw-alias-label-primary',
      '--dsw-alias-label-secondary',
      '--dsw-alias-label-tertiary',
      '--dsw-alias-state-accent-primary',
      '--dsw-alias-state-success',
      '--dsw-alias-state-danger',
      '--dsw-alias-state-warning',
      '--dsw-alias-bg-base',
      '--dsw-alias-bg-elevated',
    ],
    domSelectors: ['[data-phase]', '.ta_splitClose', 'aside, nav, [class*="SidebarRoot"], [class*="sidebar"]'],
  },
}
