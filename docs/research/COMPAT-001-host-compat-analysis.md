# COMPAT-001 — dsh 宿主兼容性设计系统性分析（依赖面清点 + 四轴设计 + proposed ADR）

> **Task**: COMPAT-001（P1）| **日期**: 2026-09-11 | **作者**: Architect Agent | **状态**: 待 Design Reviewer 审查 + 用户确认设计方向
> **约束**: 兼容红线（零宿主源码改动——DEC-019 理由栏 + EVD-037 用户约束声明既有口径；2026-09-12 按 REVIEW-COMPAT-001-R1 F2 修正原「DEC-021 兼容红线」误指）；本任务只分析不实现——唯一产出即本文档；实现任务经用户确认另行入账。
> **事实源**: 本仓库代码（行号以 2026-09-11 工作区为准）+ `.governance/` 治理记录（EVD-076~082 / BUG-003~006 / RISK-003；EVD-082=回归基线）+ DSH 宿主 checkout（`C:\Users\peter\AppData\Local\npm-cache\_npx\1e7f6d9597241db0\`，dsh 0.1.5-rc.1 闭包，只读核对）。
> **原则对照**: P-01（全部结论文件+行号/证据 ID 可溯源；推测显式标注「待验证」）/ P-02（六面穷尽）/ P-05（落正确抽象层）/ P-08（引用成熟实践）/ C-02（分层与依赖方向）。

---

## 1. 执行摘要

**为什么做**：dsh 0.1.x 系列四次升级（0.1.2-rc.1 ×3 + 0.1.5-rc.1 ×1）四次打断本插件（BUG-003 服务端具名导入崩溃 / BUG-004 客户端 API 表面迁移 / BUG-005 hook 面服务后到 / BUG-006 profile 注册机制重构），另有 RISK-003（宿主 DOM 约定依赖）尚未爆发但无变更探测。四次事故的共同模式：**宿主表面变更 → 插件散落在产品代码中的依赖点逐个断裂 → 用户报障驱动 → 事后修复**。现有防护（三处单点适配 + smoke 203 项）全部是**事后回归**，无事前探测、无统一契约、无诊断面。

**核心结论**（详见 §3/§4/§5）：

1. **依赖面全量 = 6 面 47 项**（§3：服务端 11 + 客户端 API 13 + DOM 约定 7 + 安装注册 6 + 预设 manifest 5 + 版本环境 5），其中绝大多数为必需（插件本质是宿主生态公民）、约 15 项已单点适配（makeHostApi 12 组形状映射 / install 双通道等）、4 项可消除或收敛（connection·locale inject / defineTool 薄包装 / peer 版口 / 隐式版本矩阵）、1 项已消除（settingsNamespace，BUG-003）、1 项自有无依赖。真正高风险的不是数量，而是**宿主表面知识散落在 4462 行的 client.js 单文件与两份安装脚本中，无声明式契约**。
2. **四轴统一解**：一个「宿主边界层」概念收敛四轴——**契约声明**（轴③消费）+ **运行时适配**（轴①②产出）+ **能力探测**（轴④消费，同一函数同时服务启动警告/诊断面板/CI 断言）。这是浏览器生态特性检测渐进增强（Modernizr/caniuse 模式）与 VS Code 扩展 API 兼容策略的成熟实践，非新发明（P-08）。
3. **一个已实证的硬约束**：客户端包经 `window.__ModuleLoader__.load({id, factory})` 单入口单 factory 加载（宿主 dsh-client-modules `lib/index.js` L155 exports 解析仅接受 string/单层 conditional、L248 强制单 id 注册）——**客户端边界层不能拆分多文件**，只能「同文件 region 收口 + CI 边界断言」。服务端（ESM）与安装脚本无此约束。
4. **一处已发现的活性缺陷**：CI 的 dsh-settings mock 仍导出 `settingsNamespace`（`.github/workflows/ci.yml` L76-78），而真实 0.1.5-rc.2 已无此导出（宿主 checkout 权威复核，`dsh-settings/lib/index.js` L610：导出面仅 `SettingsConflictError, SettingsProvider, redactSecrets`）——**mock 契约漂移的现存实例**，正是 BUG-003 类事故的温床，轴③第一优先修正项。
5. **最优先动作**：COMPAT-006 版本矩阵决策（用户决策点——是否继续双表面支持 0.1.x 旧宿主）+ COMPAT-002 契约清单提取（其余任务的地基）。

---

## 2. 事实基础：事故 → 依赖面 → 现有防护映射

四次事故 + 一项风险，按「断裂的宿主表面 → 插件依赖点 → 修复机制 → 修复位置」勾稽：

| 事故 | 宿主侧变更（证据） | 插件断裂点（修复前） | 修复机制（修复后位置） | 修复性质 |
|---|---|---|---|---|
| **BUG-003**（EVD-076） | dsh-settings 0.1.2-rc.1 移除 `settingsNamespace` 导出（本次宿主 checkout 复核 0.1.5-rc.2 仍无：`dsh-settings/lib/index.js` L610） | `lib/index.js` 原 L18 ESM 具名导入 → SyntaxError → 宿主启动崩溃 | 删导入，NS 改普通字符串 `'novel-writing'`（`lib/index.js` L33） | 单点修复（依赖消除） |
| **BUG-004**（EVD-077/077a） | 客户端 `connection.api` 表面迁移至 `remote.<ns>` 服务 + `workspaces`/`sessions` 快照（宿主 dsh-api-gateway `lib/client.js` L1794-1796 `remoteServiceKey` 返回 `remote.${ns}`，本次复核确认） | `lib/client.js` 44 处 `apiHas`/`api.<domain>` 调用全断 | **makeHostApi 适配层**（`lib/client.js` L476-633）：新旧双表面特性检测、按域 getter 惰性解析、单点收口（`connection.api` 全文件仅 1 处引用在回退分支） | 单点适配层 |
| **BUG-005**（EVD-078/078a） | sessions 服务经 dsh-api-remotes 异步 `$mount` 链后到（apply 只等同步依赖 → `ctx.get('sessions')` 捕获 undefined） | `lib/client.js` 原 makeSessionsHook 冻结 null → hook 面永久降级 | **makeSessionsHookReactive**（`lib/client.js` L1174-1259）：恒定函数引用 + holder 惰性解析 + `internal/service` 事件重订阅（apply 单一监听 L4377-4383） | 单点适配层 |
| **BUG-006**（EVD-080/081） | dsh 0.1.5-rc.1 profile 机制重构：注册从「junction+patch 行」迁移为「profile package.json dependencies + dsh.profile.bundles」；升级模板重建重置旧注册 | 插件掉出加载树（dump-config 实证）；插件代码本身零改动兼容 | **install 双通道**（`install.ps1` L123-346 / `install.sh` L47-232）：布局特征检测分流 + profile 注册（dependencies+bundles）+ patch 行兜底双保险 | 单点适配层（安装面） |
| **RISK-003**（risk-log L9） | 宿主 web 前端 DOM 结构变更（未发生，参考项目 dsh-worktable 有先例） | `[data-phase]` 探测 + `children[1]` 结构假设 + margin 挤压 | **仅降级兜底**（findConversationRoot 返回 null 不布局，`lib/client.js` L891-892），**无变更探测** | 未设防（开放风险） |

**模式总结**：每次宿主升级断裂的是**不同平面**（服务端导入面 → 客户端 RPC 面 → 客户端服务生命周期面 → 安装注册面），下一平面大概率是 DOM 面（RISK-003）或 manifest/预设面。防御不能只针对已爆发平面——需要**全平面契约化**。

---

## 3. 宿主依赖面六面全量清点

必要性判定口径：**必需** = 功能本质依赖且无替代路径；**可消除/收敛** = 有降级或移除路径（标收敛方向）；**已适配** = 依赖存在但已有单点收口防护；**自有** = 插件自有点、无宿主耦合（列出为完整性）。

### 面 1 — 服务端 API 面（lib/index.js 1437 行 + lib/tools.js 405 行）：11 项

| # | 依赖点（文件+行号） | 用途 | 必要性 | 现有防护 | 事故关联 |
|---|---|---|---|---|---|
| 1.1 | `lib/index.js` L17 `import { Service } from '@deepseek-ai/cordis'` | 服务基类（cordis 插件模型本体） | **必需** | CI mock（ci.yml L72-75）+ BUG-003 后逐项核验（EVD-076） | 无（稳定） |
| 1.2 | `lib/index.js` L16 `import z from '@deepseek-ai/schemastery'`（默认导出） | Config schema（settings.register 消费） | **必需** | CI **真包**（ci.yml L71，registry 安装——mock 无法覆盖链式 API 的教训，RISK-001） | 无 |
| 1.3 | `lib/index.js` L18 `import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'`（调用点 L163、L1360） | 预设同步目标根路径解析 | **必需**（预设同步功能核心；与宿主 DSH_HOME 解析逻辑必须一致） | CI mock（ci.yml L80-85） | 无 |
| 1.4 | ~~`lib/index.js` 原 L18 `settingsNamespace` 具名导入~~ | （原）设置命名空间 symbol | **已消除**（BUG-003 修复=改字符串常量 L33） | 修复本身即防护；**但 CI mock 仍提供该导出——漂移，见 6.4** | **BUG-003** |
| 1.5 | `lib/index.js` L30 `export const inject = ['settings']` | settings 硬依赖声明 | **必需**（cordis inject 机制） | smoke ctx mock（smoke.mjs L38-62） | 无 |
| 1.6 | `lib/index.js` L1423 `ctx.settings.register(NS, Config)` / L88 `ctx.settings.get(NS)` | 配置注册与读取 | **必需** | smoke 全量行为测试 | **BUG-003**（NS 形态 symbol→string） |
| 1.7 | `lib/index.js` L82 `super(ctx, 'novel-writing')` | 服务注册名 | **必需** | smoke（reflect.provide mock L57） | 无 |
| 1.8 | `lib/index.js` L1427-1431 `ctx.get('webServer')`（可选）+ L1229-1289 `webServer.register({kind:'exact', path, handler})` | 回环 HTTP API 挂载（`/novel-writing/api/*` 13 路由） | **必需**（客户端轮询数据面；webServer 缺席已有降级警告 L1431） | smoke HTTP handler 行为测试（经 mock） | 无 |
| 1.9 | `lib/index.js` L1429 `ctx.effect(fn, label)` | 生命周期清理 | **必需**（cordis 核心） | smoke（ctx.effect mock L59） | 无 |
| 1.10 | `lib/index.js` L148 `ctx.emit('novel-writing/changed')` / L114 `ctx.logger` | 变更事件 + 日志 | **必需**（cordis 核心） | smoke（mock） | 无 |
| 1.11 | `lib/tools.js` L17 `import { defineTool } from '@deepseek-ai/dsh-tools'` + L22 `inject=['tools']` + L46 `ctx.tools.register(defineTool(...))` ×11 工具 | 模型工具注册（门禁代码化） | **必需**（工具行本质；`defineTool` 为薄包装，**可收敛**：特性检测降级为直传定义对象——收益小，见轴①） | CI mock（L86-89）+ smoke 11 工具挂载契约（L6） | 无 |

### 面 2 — 客户端 API 面（lib/client.js，makeHostApi 覆盖的全部调用点）：13 项

| # | 依赖点（文件+行号） | 用途 | 必要性 | 现有防护 | 事故关联 |
|---|---|---|---|---|---|
| 2.1 | `lib/client.js` L92-94 `window.__ModuleLoader__.load({id:'dsh-novel-writing', factory})` | 客户端模块注册约定 | **必需**（宿主加载契约：dsh-client-modules L248 强制单 id 注册） | smoke L436-438（捕获注册断言） | 无 |
| 2.2 | `lib/client.js` L97 `require('react')`（factory 内） | 宿主提供的 react | **必需** | smoke 最小 react mock（L432 注释） | 无 |
| 2.3 | `lib/client.js` L4350 `inject = ['slots','connection','locale']` | 三服务硬依赖声明 | **可收敛**：`connection` 在 BUG-004 后仅剩回退用途（L532 legacyApi）、`locale` 仅读 i18n 快照（L4354-4359）——两者均可降级为可选探测（轴① A1/A3） | inject 表经 BUG-004 修正（移除不存在的 dsh-client-runtime，EVD-077 ④） | **BUG-004**（manifest 面） |
| 2.4 | `lib/client.js` L532/L556/L572/L581/L620/L629 `connection.api`（旧表面回退，全文件唯一特性检测点） | 旧宿主（≤0.1.x）API 回退 | **已适配**（makeHostApi 单点收口；代码级引用恰 1 处，EVD-077 审查复核 + smoke L1478 断言） | smoke 源码字符串断言 + mock 直测 | **BUG-004** |
| 2.5 | `lib/client.js` L547-557 `remote.settings`（describe/update/mutate；位置参数 + expectedRevision acceptsUndefined 形状） | 设置读写（新表面） | **必需**（已适配：12 组形状映射之一） | smoke L1319 mock 直测 | **BUG-004** |
| 2.6 | `lib/client.js` L558-573 `remote.session`（create/prompt〔requestId 必填铸造 L489-497〕/cancel） | 会话创建与指令发送 | **必需**（已适配） | smoke L1347 | **BUG-004** |
| 2.7 | `lib/client.js` L574-601 `remote.workspace` + `workspaces` 快照服务（list=getSnapshot/subscribe、phase pending→ready、L499-525 awaitWorkspacesReady 订阅等待） | 工作区列表/创建 | **必需**（已适配） | smoke L1402 | **BUG-004** |
| 2.8 | `lib/client.js` L602-621 `remote.directoryPicker`（pick string→`{path}` 包装 L610/createDirectory/list） | 目录选择（工作区对话框） | **必需**（已适配） | smoke L1379 | **BUG-004** |
| 2.9 | `lib/client.js` L622-630 `remote.agentPresets`（select 两参位置） | 会话挂预设 | **必需**（已适配） | smoke L1365 | **BUG-004** |
| 2.10 | `lib/client.js` L1195-1259 `makeSessionsHookReactive`：`sessions.list` ObservableSnapshot（getSnapshot/subscribe 形状校验 L1201-1204） | 会话状态镜像（零轮询） | **必需**（已适配） | smoke L1590-1668（react mock 生命周期直测 + 接线断言） | **BUG-005** |
| 2.11 | `lib/client.js` L1300-1310 `launcher.sessions`（`sessions.open(sessionId)`） | 打开/切换会话 | **必需** | smoke（注册面） | 无 |
| 2.12 | `lib/client.js` L4377-4383 `ctx.on('internal/service')`（单一监听器双消费：launcher 重 setup + hook.refresh） | 服务生命周期事件（缺席↔到位自愈） | **必需**（已适配；cordis 4.x 事件，EVD-077 实证 L848） | smoke 接线断言 | **BUG-004+005** |
| 2.13 | `lib/client.js` L4403-4435 `ctx.slots.inject('settings.section'|'sidebar.footer.action'|'shell.overlay')` + `ctx.slots.register({name,id,order,label})` ×6 注册 | UI 挂载（槽位名约定） | **必需**（无替代挂载通道） | smoke 注册面/退役面断言（L7-8） | 无（槽位名未变过——**待验证** TP-2） |

附：44 处 `apiHas`/`api.<domain>` 调用点分布（grep 实证 48 处匹配含 2 处注释）：settings（update×6/mutate×1/describe×2）、sessions（create×3/prompt×3/cancel×1）、workspace（list×6/create×2）、host（pickDirectory×1/createDirectory×1/listDirectory×1）、agentPresets（select×3）+ apiHas 守卫若干（L1292-1295 定义）。全部经 `launcher.api`/props `api` 消费 makeHostApi facade——**调用面已单点化，但契约面（期望哪些域方法存在）是隐式的**。

### 面 3 — 宿主 DOM/前端约定面（lib/client.js 布局引擎 + 样式）：7 项

| # | 依赖点（文件+行号） | 用途 | 必要性 | 现有防护 | 事故关联 |
|---|---|---|---|---|---|
| 3.1 | `lib/client.js` L821-829 `findConversationRoot`：`document.querySelectorAll('[data-phase]')` + phase=active 优先 + children≥2 + 排除 TEXTAREA/INPUT | 会话根容器探测（挤法布局锚点） | **必需**（宿主无官方布局 API；dsh-worktable 同款约定） | 降级兜底：null → 不做布局（L891-892），抽屉/控制台功能独立于布局 | **RISK-003**（开放） |
| 3.2 | `lib/client.js` L893-894、L977 `root.children[0]`=header / `root.children[1]`=viewArea 结构假设 | 布局结构定位 | **必需**（同上） | undefined 检查降级（L895 return false） | **RISK-003** |
| 3.3 | `lib/client.js` L905-908/L986-997/L1043-1045 margin 挤压（marginLeft/Right/Top + width 双压——UX-018 修复：margin 不触发宿主响应式重排，需显式 width） | 对话窗让位（布局手段=生态约定） | **必需**（dsh-worktable 同款；saved* 原值恢复机制完备） | 让位观察器（L943-955 外部改写 margin 时关闭自身）+ saved 原值恢复 | **RISK-003** + UX-018（宿主响应式时序事故，已修） |
| 3.4 | `lib/client.js` L680-693 TK 令牌表（12 个 `--dsw-alias-*`）+ NV_STYLE 全量 `var(--dsw-alias-*, 兜底值)` + color-mix 派生（L4304-4327） | 视觉令牌消费（主题自适应） | **必需**（已带兜底值=渐进增强；兜底取值对齐 dsh-worktable styles.ts） | 每个 var() 均有字面兜底——令牌缺席不破版 | 无（令牌稳定——**待验证** TP-3 官方稳定化状态） |
| 3.5 | `lib/client.js` L879-890 `.ta_splitClose` 类名点击 + `dsh:split-claim` CustomEvent | 跨插件分栏互操作（与 dsh-worktable 共存协议） | **可选**（生态约定，非宿主官方） | try/catch 包裹 + claim 监听让位（L4387-4398） | 无 |
| 3.6 | `lib/client.js` L917-940 ResizeObserver + MutationObserver(`attributeFilter:['data-phase']`)、L2776 同款 | DOM/尺寸变化跟随重锚定 | **必需**（跟随机制本体） | 断连检查 + 重锚定口径同 open() | **RISK-003**（探测的是变化后的自救，不是宿主约定的变更探测） |
| 3.7 | localStorage 键 `dsh.novel.split.v1`/`dsh.novel.defaults.v1`/`dsh.novel.order.v1`（L727-729 等） | 布局/排序持久化 | **自有**（无宿主耦合） | — | 无 |

### 面 4 — 安装与注册机制面（install.ps1 349 行 / install.sh 244 行 / cordis.patch.yml / package.json dsh 字段）：6 项

| # | 依赖点（文件+行号） | 用途 | 必要性 | 现有防护 | 事故关联 |
|---|---|---|---|---|---|
| 4.1 | `install.ps1` L123-134 / `install.sh` L47-57 布局特征检测：`profiles/<Profile>/package.json` 存在 = dsh ≥0.1.5 新布局 | 安装通道分流 | **必需**（已适配） | BUG-006 修复引入；隔离演练双布局+变体+降级（EVD-081） | **BUG-006** |
| 4.2 | `install.ps1` L128-177 / `install.sh` L58-73 junction/symlink 接入（新=profile 私有 node_modules；旧=全局；失败回退拷贝） | 包链接 | **必需**（已适配） | 同上演练（幂等二跑字节级零漂移） | **BUG-006**（旧注册被升级模板重置是本项引入的动因） |
| 4.3 | `install.ps1` L179-238（PS 5.1 自研 JSON 序列化器 L36-88）/ `install.sh` L75-186（node -e → python3 → 降级三档）：profile package.json `dependencies.dsh-novel-writing=file:<src>` + `dsh.profile.bundles` 追加（幂等三分支） | 官方注册通道（dsh ≥0.1.5） | **必需**（已适配；**已知遗留**：三套注册实现维护成本 P2-4，EVD-081） | 幂等 + 变体演练（无 dependencies 键/无 dsh 键/畸形并存——R1 NEEDS_CHANGE 返工项） | **BUG-006** |
| 4.4 | `install.ps1` L240-304 / `install.sh` L188-205 cordis.patch.yml insert 行兜底（含 `[]` 空根/已有 insert 块/无 insert 三形态处理）+ 仓库自带 `cordis.patch.yml`（L10-12 dual-face 行声明） | 注册兜底双保险（两布局通用） | **必需**（已适配；EVD-080 实证 B 路径独立有效） | 幂等（`name: dsh-novel-writing` 已含跳过） | **BUG-006** |
| 4.5 | `install.ps1` L306-316 / `install.sh` L207-216 预设同步 `$DSH_HOME/.agent-presets/novel-writing/` + L318-339/L218-232 settings.yaml 默认节写入；服务端对应 `lib/index.js` L157-184 ensurePreset（`.dsh-bundle-version` 标记 + staging 原子换入） | 预设与默认配置落地 | **必需**（已适配） | 幂等标记 + 原子换入 + 双端同步（install 立即 + 服务端启动校验） | BUG-006 间接触发（EVD-080：宿主 router 掉线致 settings.yaml agent-presets.default 失效——环境侧连锁） |
| 4.6 | `package.json` L17-29 `dsh` 专有字段：`dsh.bundle.patch=./cordis.patch.yml`、`dsh.client.platform=web`、`dsh.client.inject` = [dsh-client-ui-settings, dsh-client-locale, dsh-api-remotes] | dsh 客户端打包指令 | **必需**（已适配；BUG-004 修正过：移除不存在的 dsh-client-runtime） | CI 结构检查（ci.yml L45-47） | **BUG-004**（manifest 面） |

### 面 5 — 预设与 manifest 面（agent-presets/novel-writing/）：5 项

| # | 依赖点（文件+行号） | 用途 | 必要性 | 现有防护 | 事故关联 |
|---|---|---|---|---|---|
| 5.1 | `agent-presets/novel-writing/preset.yml` L1-2（name=小说写作工作流/description） | 宿主预设选择器消费的清单格式 | **必需** | validate-preset 29 项（CI L35-36） | 无 |
| 5.2 | `agent.cordis.yml` 16+ 宿主包行（L16-216：dsh-persona/dsh-agent-instructions/dsh-tool-bash·pwsh·fs·fs-search·jobs/dsh-skill-filesystem/dsh-tool-skill/dsh-tool-goal/dsh-plan-mode/dsh-compaction×3/dsh-tool-subagent×5+dsh-workflow-worker-thread+dsh-tool-workflow+dsh-tool-ralph/dsh-tool-ask-user/dsh-tool-todo/dsh-tool-web） | AGENT-PLANE 组合（预设=宿主包组合，本质依赖） | **必需**（预设的功能本体；可选依赖设计已良好——L88-89 tool-novel 行未装静默） | validate-preset（loader 同源逐行解析）+ CI 结构检查 | 无直接事故（宿主包行名稳定性——**待验证** TP-2 同类） |
| 5.3 | `agent.cordis.yml` L52/L56/L81 `!!js` 表达式（`process.platform`/`process.getBuiltinModule('node:url')`） | cordis YAML 求值约定（平台分流/skill 目录解析） | **必需** | validate-preset 逐行解析 | 无 |
| 5.4 | `agent.cordis.yml` L77-81 skill-filesystem `customSkillDirs` + `baseUrl` 相对解析 | 26+ SKILL 目录加载约定 | **必需** | validate-preset + CI skills≥25 检查（ci.yml L52-54） | 无 |
| 5.5 | 预设目录约定 `$DSH_HOME/.agent-presets/<preset-id>/`（install 4.5 + index.js ensurePreset 同步） | 预设落地点 | **必需**（已适配） | 版本标记幂等 | BUG-006 环境连锁（见 4.5） |

### 面 6 — 版本与环境面：5 项

| # | 依赖点（文件+行号） | 用途 | 必要性 | 现有防护 | 事故关联 |
|---|---|---|---|---|---|
| 6.1 | `package.json` L41-47 peerDependencies 全 `*`（cordis/schemastery/dsh-settings/dsh-home-paths/dsh-tools） | peer 版口策略 | **可改进**：`*` = 不设限=不设防（依赖宿主闭包内版本一致性——junction 接入共享 profile node_modules 恰好保证这一点）；但无下限意味着隐式信任任意未来版本 | CI 依赖架构守卫（ci.yml L21-34：@deepseek-ai/* 必须 peer 防「双闭包陷阱」+ 三必备 peer 存在性） | 间接（四次事故都在 `*` 口径下发生） |
| 6.2 | `package.json` L8-10 `engines.node>=20` | 运行时下限 | **必需** | 无 enforcement（npm warn 级） | 无 |
| 6.3 | 支持版本矩阵（**隐式、未声明**）：0.1.x 旧表面（connection.api 回退）+ 0.1.2-rc.1（remote.*）+ 0.1.5-rc.1（profile 布局）——双表面×双布局 | 兼容范围事实 | **可改进**：矩阵未显式声明（README 未列），旧表面支持是隐式承诺 | makeHostApi 双表面 + install 双通道（隐式覆盖） | **BUG-003/004/005/006 全部** |
| 6.4 | CI mock 表面（ci.yml L70-89）：cordis Service mock/dsh-settings mock（**仍导出 settingsNamespace L76-78**）/dsh-home-paths mock/dsh-tools mock + schemastery 真包 | 宿主替身 | **已适配但漂移**：dsh-settings mock 导出面 ≠ 真实 0.1.5-rc.2 导出面（真实仅 `SettingsConflictError, SettingsProvider, redactSecrets`——宿主 checkout `dsh-settings/lib/index.js` L610 权威复核）。mock 让已删除的表面「复活」= smoke 在假绿环境跑 | 依赖架构守卫（不覆盖导出面正确性） | **BUG-003 温床**（无事故但同类根因） |
| 6.5 | 宿主升级通道：用户 `npx @deepseek-ai/dsh` → npm latest（0.1.2-rc.1→0.1.5-rc.1 跳变实证 EVD-080；npx 缓存 `_npx/<hash>` per-闭包） | 分发通道事实 | **必需认知**（插件无法控制宿主何时升级；rc 版直接打 latest tag=升级不可预测） | 无 | **BUG-006 触发路径** |

**六面统计**：11+13+7+6+5+5 = **47 项**（含 1 项自有/1 项已消除——2026-09-12 按 REVIEW-COMPAT-001-R1 F10 统一口径，表格实测仅 3.7 标「自有」），事故关联勾稽：BUG-003 → 1.4/1.6/6.4；BUG-004 → 2.3/2.4~2.9/2.12/4.6；BUG-005 → 2.10/2.12；BUG-006 → 4.1~4.5/5.5/6.5；RISK-003 → 3.1~3.3/3.6。**全部五类事故/风险均挂接到具体依赖项，无遗漏、无空挂**。

---

## 4. 四轴设计

> 每轴：用户目标原文 → 现状缺口 → 候选方案（≥2）→ 评估标准（先定义）→ 取舍与推荐 → 风险与回滚。
> 成熟实践引用（P-08）：适配器+特性检测渐进增强（浏览器生态 Modernizr/caniuse 模式）、VS Code 扩展 proposed API 检测与 `engines.vscode` 版本矩阵策略、浏览器扩展 host permission 最小化声明。

### 轴① 依赖最小化（用户原文：「尽可能减少对DSH宿主的依赖」）

**现状缺口**：47 项中必需项占绝大多数（插件本质是宿主生态公民），真正可动的是：2.3 connection/locale inject 收敛、1.11 defineTool 薄包装、2.4 旧表面回退、6.1 peer 版口。**依赖最小化的正确目标不是砍数量，而是砍「不必要的承诺」**——每一项硬 inject/每一份双表面支持都是对宿主的承诺，承诺越多未来断裂面越大。

**候选方案**：

| | A1 版本矩阵收敛 + 表面瘦身 | A2 全表面保留 + 特性检测全覆盖 | A3 仅 inject 表分级（最小改动） |
|---|---|---|---|
| 内容 | 宣布最低支持 0.1.2-rc.1：移除 `connection` inject + connection.api 回退（保留一个版本期的 `__NV_LEGACY_API__` 开关）；locale 移出 inject 改可选探测；peer 加下限（如 `>=0.1.2-rc.1`）；README 版本矩阵声明 | 不收敛矩阵：connection/locale 留 inject；所有依赖点（含 1.11 defineTool）补特性检测与降级路径 | 仅把 connection/locale 从 inject 挪到可选探测（ctx.get 探测），双表面与 peer 口不动 |
| 断供面 | 0.1.x 旧宿主用户（升级插件后客户端 API 不可用——降级提示而非白屏，BUG-004 后 UI 已有守卫） | 零断供 | 零断供 |
| 维护成本 | 低（砍掉 12 组形状映射中的旧表面分支） | 高（双表面永久维护——BUG-004 修复时 12 组映射逐组核验的成本每次宿主升级重来一遍） | 中（改动小但双表面成本仍在） |
| 事故复发概率 | 低（依赖面单调收缩） | 中（回退分支本身也会腐化——无真实宿主 exercised） | 中 |

**评估标准**（方案选择前定义）：①旧宿主用户断供数（越少越好）；②每次宿主升级的适配成本（人日）；③隐式承诺数（inject 表长度+双表面分支数）。

**取舍**：推荐 **A1 为主 + 过渡期开关**（0.x 阶段先 A3 止血，v1.0 边界执行 A1）。理由：BUG-004 的 12 组形状映射证明双表面维护成本真实且高；EVD-080 实证 npm latest 已到 0.1.5-rc.1，0.1.x 旧表面存量用户随 npx 缓存更新自然消亡；VS Code 扩展生态先例（engines.vscode 下限声明）表明显式矩阵优于无限兼容。**A1 是决策型变更（断供旧版本）→ MUST 用户确认（COMPAT-006）**。
**风险**：断供用户的降级体验——缓解：客户端已全面 apiHas 守卫（缺失显示「API 不可用」而非崩溃，BUG-004 修复实证）；README 标注旧版用 v0.5.x tag。
**回滚**：peer 下限回退为 `*` + 恢复 connection inject = 单 commit 逆转；过渡开关让回滚更细粒度。

### 轴② 必需依赖解耦（用户原文：「对于必须的接口和字段依赖，尽量将依赖逻辑解耦，单独维护」）

**现状缺口**：三处单点适配（makeHostApi L531-633 / makeSessionsHookReactive L1195-1259 / install 双通道）彼此独立、内嵌于产品大文件（client.js 4462 行 = UI+适配+DOM+业务混合）、**契约是隐式的**（适配层代码即契约的唯一表达，无声明式清单）；服务端宿主调用（settings.register/webServer.register/Service）散布 index.js；DOM 探测知识散布布局引擎；槽位名/令牌名/服务名以字面量散布全文件。

**硬约束（已实证）**：客户端包经 `__ModuleLoader__` 单入口单 factory 加载（宿主 dsh-client-modules `lib/index.js` L155 exports 解析仅 string/单层 conditional、L248 单 id 强制注册）→ **客户端不能拆多文件模块**。服务端 index.js/tools.js 是标准 ESM 可自由拆分；安装脚本独立文件天然解耦。

**候选方案**：

| | B1 单边界文件（服务端）+ 同文件 region（客户端） | B2 双层：契约数据 + 适配实现 | B3 按面拆四模块（client-host/server-host/install/dom） |
|---|---|---|---|
| 内容 | 服务端新建 `lib/host-boundary.js` 收口全部宿主调用（settings/webServer/Service/resolveDshHome 包装）；client.js 头部固定 `#region host-surface` 收口 makeHostApi/makeSessionsHookReactive/DOM 探测/槽位与令牌常量，CI 断言 region 边界；install 脚本加「布局特征清单」注释块 | 在 B1 之上多一层：`lib/host-contract.mjs`（或 .json）**纯声明式契约**——六面依赖的机读清单（服务名/方法名/DOM selector/槽位名/令牌名/manifest 字段/布局特征），零运行时依赖，CI 与 smoke 直接 import 消费做对账；适配层运行时从契约取常量 | 每面一个模块文件 |
| 契约可机读 | 否（契约仍以代码表达） | **是**（轴③的地基——CI 对账/诊断报告/快照断言共用） | 否 |
| 客户端适配 | region 模式（绕开单 factory 约束） | region 模式 + 契约文件被 smoke 侧消费后**生成/校验** region 内常量 | 违反单 factory 约束（不可行，除非宿主改多入口——兼容红线禁改宿主，见头部约束口径） |
| 复杂度 | 低 | 中（多一文件一层间接） | 高（过度工程化——插件规模不需要，C-03 反例） |

**评估标准**：①宿主表面知识是否单一事实源（C-02）；②新宿主升级时的适配改动是否收敛到一层；③可测试性（契约可否被 CI/诊断独立消费）；④改动半径（对现有 4462 行文件的侵入度）。

**取舍**：推荐 **B2**（B1 是 B2 的子集，可分两步走：先 B1 收口、后提取契约）。理由：轴③④都依赖「契约可机读」这一地基——没有 B2 的契约文件，CI 对账只能 grep 源码（脆弱），诊断报告只能硬编码检测项（与代码漂移）。B3 违反实证约束排除。
**模块职责**（各 ≤3 句）：
- `lib/host-contract.mjs`：六面宿主依赖的声明式清单（纯数据，无 import 宿主包）。供 CI 对账、smoke 断言、诊断报告生成消费。零运行时逻辑。
- `lib/host-boundary.js`（服务端）：包装全部服务端宿主调用（settings 注册读取/webServer 路由挂载/resolveDshHome/Service 构造参数）。产品代码只 import 本模块，不直接触碰宿主 API。宿主升级时服务端适配只改本文件。
- client.js `#region host-surface`（客户端）：含 makeHostApi/makeSessionsHookReactive/findConversationRoot + 槽位/令牌/服务名常量（常量从 host-contract 同步，smoke 断言一致性）。产品 UI 代码只消费 region 导出的 facade 与常量。
- install.ps1/install.sh 头部「宿主布局契约」注释块：布局特征/注册通道/目录约定的单点清单（脚本无法 import，用注释块 + CI 正则对账 host-contract）。
**依赖方向**（单向无环）：`产品代码（UI/业务）→ host-boundary（适配）→ host-contract（声明）→〔镜像〕宿主`；测试（smoke/CI）→ host-contract + 适配导出。client.js 内部：UI 组件 → region facade → 常量。
**风险**：region 边界靠 CI 断言维护（无编译期隔离）——缓解：smoke 已有源码字符串断言先例（L1478/L1663-1668），同一手法断言 region 标记唯一性 + 禁止 region 外出现宿主服务名字面量（grep 白名单）。
**回滚**：host-boundary 包装函数与直接调用等价（纯搬运+命名），revert 单 commit；契约文件独立新增，删除无影响。

### 轴③ 严格校验与看护（用户原文：「对于依赖的代码进行严格的依赖性校验和看护」）

**现状缺口**：①mock 与真实宿主表面无对账（6.4 漂移实例——CI 让已删除的 settingsNamespace「复活」）；②无宿主版本变更早期探测（四次事故全靠用户报障）；③44 处调用面无「调用 ⊆ 契约」对账；④DOM 约定零探测（RISK-003）；⑤smoke 203 项是行为回归（修复驱动），非表面契约断言。

**候选方案**：

| | C1 真实包 CI 对账（latest 探测轨） | C2 mock 生成自真实快照（fixtures） | C3 加载期能力检测 + fail-loud 日志 |
|---|---|---|---|
| 内容 | CI 新增 job：`npm install @deepseek-ai/dsh@latest` + 关键子包 → import 探测断言「真实导出面 ⊇ host-contract 声明面」→ 宿主发版即红 | 固定三版本（0.1.x/0.1.2-rc.1/0.1.5-rc.1）表面快照入仓 `test/fixtures/host-surfaces/*.json`（从真实包提取）→ smoke 离线对照 fixtures 跑「适配层期望 ⊇ 快照实际」；CI mock 的导出面直接从 fixtures 生成（消灭手写 mock） | apply 早期 `detectHostCapabilities()` 对照 contract → 缺面 `console.warn('[nv-compat]', JSON.stringify(...))` 结构化警告（不阻断加载，降级可见化） |
| 早期探测 | **强**（宿主发版 → CI 红 → 修复在用户升级前） | 中（新版本发布后需人工更新快照——但更新动作本身=显式审阅变更面） | 无（用户运行时才暴露——但是**最后一道可见化防线**） |
| 离线可跑 | 否（网络依赖） | **是** | 是（运行时） |
| 成本 | CI 时长 +（宿主闭包 200+ 包，只装探测所需子集） | 快照维护（每版本一次，机械） | 低 |

**评估标准**：①宿主升级到用户报障的时间差（探测提前量）；②误报率（false positive/negative）；③运行成本；④离线可跑性（CI 稳定性——RISK-001 教训）。

**取舍**：推荐 **C2 为地基 + C1 为预警（可选 scheduled）+ C3 为兜底** 三层组合，全部消费同一 host-contract（轴② B2）。理由：C2 离线稳定且把「支持新版本」变成显式动作（快照更新 PR=变更审阅点）；C1 把探测提前到宿主发版时（需权衡 CI 网络依赖——设为 scheduled/手动触发轨，不阻断 PR）；C3 成本最低且直接服务轴④。**第一优先修正**：6.4 的 mock 漂移（dsh-settings mock 改为对齐真实导出面）——零新设施、立即可做、直接消灭 BUG-003 温床。
**风险**：fixtures 快照过期（宿主小版本未快照）——缓解：CI matrix 含 `@latest` 探测轨兜底 + README 记录快照覆盖版本；C1 的 npm 供应链（rc 版直接打 latest 的通道风险 6.5）——探测轨只读元数据不执行宿主代码。
**回滚**：三层各自独立可回退（CI job 移除/smoke 断言段删除/警告行移除），无运行时耦合。

### 轴④ 边界可调测性（用户原文：「对于依赖边界的代码增加可调测性设计，后续有问题能第一时间发现并保证低代价适配」）

**现状缺口**：出问题时定位靠维护者无头 Edge+CDP 探针（EVD-078a 记录的高成本路径——本分析无法要求用户执行）；降级是静默的（apiHas false → 通用「API 不可用」文案，不报哪层断）；无宿主版本可见性；无自检入口。

**候选方案**：

| | D1 诊断面板（设置页内置） | D2 启动期结构化自检日志 | D3 探针脚本固化（维护者面） |
|---|---|---|---|
| 内容 | 设置页/控制台加「诊断」入口：运行 `detectHostCapabilities()`（轴③ C3 同一函数）渲染结构化报告——remote.* 五域可用性 + sessions 服务状态 + internal/service 事件计数 + DOM 探测（[data-phase] 命中/children[1] 结构）+ CSS 令牌解析（getComputedStyle 验证 12 令牌）+ HTTP 面连通（/api/overview）+ 布局引擎状态 | apply 时探测 → `console.warn('[nv-compat] ...')`（开发者工具直接可读，含域名/方法名/缺失面） | 把 BUG-004/005 的探针方法论固化为 `scripts/probe-host.mjs`：隔离实例起宿主 → 无头浏览器跑能力探测 → 输出与 host-contract 的 diff 报告（维护者一条命令复现「断在哪层」） |
| 用户第一时间发现 | **强**（用户截图即可定位断点层，报障信息从「不好用了」变成「诊断第 3 项红」） | 弱（需开 devtools） | 无（维护者工具） |
| 低代价适配 | 中（定位层→改边界层单点） | 中 | **强**（维护者复现→适配→验证闭环） |
| 成本 | UI 面板开发 | 极低（数行） | 中（一次性固化） |

**评估标准**：①报障信息质量（用户侧可自助定位的层数）；②维护者定位耗时（从报障到锁定断裂面的时间）；③适配改动收敛度（是否只动边界层）。

**取舍**：推荐 **D2 立即做（成本极低）+ D1 跟随 host-contract 落地（P2）+ D3 固化（P3）**，三面共享 detectHostCapabilities()。理由：D1 的报告项=host-contract 清单的运行时投影（没有契约文件则报告项硬编码必漂移——轴间依赖）；D2/D3 无前置依赖可先行。诊断报告输出仅含布尔/名称/版本，不含用户数据（安全边界）。
**风险**：诊断面板被误当「宿主调试器」预期过载——缓解：文案明确「兼容性自检」范围；宿主版本获取路径未证实（**待验证** TP-4——remote.* 元数据或 settings describe 是否携带版本）。
**回滚**：三面独立删除无耦合。

---

## 5. 统一架构：宿主边界层总览（四轴收敛）

```
┌─────────────────────────────────────────────────────────────┐
│  产品代码（UI 组件 / 业务逻辑 / 安装脚本）                       │
│    client.js UI 区 │ index.js 业务区 │ install.ps1/sh 通道区    │
└──────────┬──────────────────┬──────────────────┬────────────┘
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│  宿主边界层（轴②解耦 / 轴①适配 / 轴④探测同一层）                  │
│  · lib/host-boundary.js（服务端包装——ESM 可拆）                 │
│  · client.js #region host-surface（客户端 region——单 factory 约束）│
│  · install 脚本「布局契约」注释块（脚本无 import 能力）             │
│  · detectHostCapabilities()（探测函数：D1 面板/D2 警告/CI 共用）   │
└──────────┬───────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────────────────┐
│  lib/host-contract.mjs（轴③地基：六面依赖声明式清单——纯数据）      │
│    消费方：CI 对账轨 / smoke fixtures 断言 / 诊断报告生成          │
└──────────┬───────────────────────────────────────────────────┘
           ▼ 〔镜像关系：contract ⊆ 实际宿主表面〕
┌─────────────────────────────────────────────────────────────┐
│  DSH 宿主（cordis / remote.* / services / DOM / profile 布局）   │
└─────────────────────────────────────────────────────────────┘
```

依赖方向单向（产品→边界→契约→宿主镜像），无循环（契约纯数据无出边；边界不 import 产品；测试只进不出）。每次宿主升级的适配动作收敛为：**更新契约清单 → 边界层单点适配 → fixtures 快照更新 = 显式审阅**。

---

## 6. 蓝军挑战（5 条，独立 ID + 缓解措施）

| ID | 挑战（如果…会怎样） | 缓解措施 |
|---|---|---|
| **BC-01** | 如果 host-contract 契约清单自身腐化——宿主表面已变但清单未更新，CI/fixtures 全绿而线上断裂（false negative——比无防护更危险，因为制造了虚假安全感） | 契约不手写臆造：初版从真实宿主 checkout 逐项提取（本文档 §3 即提取底稿）；fixtures 快照从真实包程序化生成（提取脚本入库）；scheduled latest 探测轨（C1）作为清单腐化的外部对账方；每次 BUG 修复 PR 强制核对契约是否需更新（进 review 清单） |
| **BC-02** | 如果宿主边界层膨胀为新上帝模块——所有宿主知识涌入一个文件，client.js 之外再造 3000 行巨石（违反 C-03，且「单点收口」变成「单点拥塞」，适配时要理解全文件） | 三职责硬分离：契约=纯数据（host-contract）、适配=纯函数（host-boundary/region）、诊断=纯读取（detectHostCapabilities）；每模块职责 ≤3 句话（§4 轴②已定义）；region 内函数保持现有粒度（makeHostApi 等已存在，只搬运不重写）；smoke 断言 region 行数上限（超过即提示拆分评审） |
| **BC-03** | 如果客户端模块化假设不成立导致轴②返工——设计按「可拆多文件」展开，实现时才发现 `__ModuleLoader__` 单 factory 约束 | 已前置实证（本分析阶段）：宿主 dsh-client-modules `lib/index.js` L155（exports 解析仅 string/单层 conditional）+ L248（bundle 单 id 注册强制）→ 设计直接采用「同文件 region + CI 边界断言」模式，不假设可拆分；若未来宿主开放多入口（**待验证** TP-1），region 可平移为独立文件（迁移路径已预留：region 边界即文件边界） |
| **BC-04** | 如果执行 A1 版本矩阵收敛，旧宿主（0.1.x）用户升级插件后功能断供——用户视角是「插件坏了」而非「宿主太旧」，报障转向本仓库 | 收敛决策 MUST 经用户确认（COMPAT-006，关键决策）；执行绑定 v1.0 major 边界（语义化版本先例——VS Code 扩展 breaking change 只在 major）；降级体验已有底（apiHas 守卫显示「API 不可用」不白屏，BUG-004 实证）；诊断面板（D1）可显示「宿主版本低于最低支持」的明确文案；README 版本矩阵 + 旧版用户指向 v0.5.x tag 回退路径 |
| **BC-05** | 如果诊断/探测面引入新风险——D1 面板暴露宿主内部结构信息（服务名/DOM 约定）被截图外传引发安全顾虑；C1 探测轨安装 rc 版 npm 包引入供应链风险 | 诊断输出仅含：布尔可用性/名称/版本号——不含路径、token、用户数据、宿主配置值（安全边界写入 COMPAT-004 验收项）；C1 探测轨只 `npm view`/`npm pack` 读元数据与 tarball 内文件 grep，**不 install 不执行**宿主代码（CI yml 中以只读命令白名单实现） |

---

## 7. proposed ADR（供 Coordinator 提请用户确认后写入 decision-log；本任务不写 decision-log）

> **ADR-DEC-候选-C1**：dsh 宿主依赖统一边界层（契约声明 + 运行时适配 + 能力探测）与版本矩阵显式化

- **标题**: 建立 dsh 宿主依赖统一边界层——host-contract 声明式契约 / host-boundary 适配收口 / detectHostCapabilities 能力探测三件套，并显式声明支持的宿主版本矩阵
- **日期**: 2026-09-11（proposed——待用户确认）
- **背景**: dsh 0.1.x 系列四次升级（BUG-003/004/005/006）在四个不同平面（服务端导入面/客户端 RPC 面/客户端服务生命周期面/安装注册面）打断本插件，RISK-003（DOM 面）开放未爆发。根因模式一致：宿主表面知识散落于产品代码（client.js 4462 行单文件混合 UI/适配/DOM/业务；install 双脚本；index.js 服务端调用），无声明式契约、无事前探测、无诊断面——四次事故均由用户报障驱动、事后修复。现有三处单点适配（makeHostApi/makeSessionsHookReactive/install 双通道）证明「适配层」方向正确，但彼此孤立且契约隐式。用户 2026-09-11 要求四轴系统性设计（减少依赖/解耦必需依赖/严格校验看护/边界可调测）。硬约束：客户端包经 `__ModuleLoader__` 单 factory 加载（宿主实证），不可拆多文件；兼容红线禁止改宿主源码（DEC-019 理由栏 + EVD-037 既有口径）。
- **决策**:
  1. 建立三件套宿主边界层（轴② B2）：`lib/host-contract.mjs`（六面 47 项依赖的机读声明——本分析 §3 为提取底稿）+ `lib/host-boundary.js`（服务端宿主调用收口）+ client.js `#region host-surface`（客户端适配与常量收口，region 边界即未来多文件化的文件边界）；产品代码依赖方向单向：产品→边界→契约→宿主镜像。
  2. 校验看护三层（轴③ C2+C1+C3）：宿主表面 fixtures 快照（固定三版本，mock 从快照生成消灭手写漂移——立即修正 CI dsh-settings mock 活性缺陷）→ smoke 离线契约对账；CI scheduled latest 探测轨（只读元数据）；加载期 detectHostCapabilities + `[nv-compat]` 结构化警告。
  3. 可调测性三面（轴④ D2→D1→D3）：启动自检日志立即落地；设置页诊断面板（能力报告=契约清单运行时投影）随契约文件落地；探针脚本固化（BUG-004/005 方法论）。
  4. 依赖最小化（轴① A3→A1）：0.x 阶段先将 connection/locale 降级为可选探测（inject 收敛）；v1.0 边界经用户决策（COMPAT-006）后执行版本矩阵收敛（最低 0.1.2-rc.1 + README 矩阵声明 + peer 下限）。
- **备选方案**:
  - 维持现状（散点适配 + 事后回归）：零改造成本，但四次事故已证明每次宿主升级的断裂面不可预测、定位高成本（无头 Edge+CDP 探针）、修复驱动被动——排除理由：与用户四轴目标全部相悖。
  - 仅加测试不改结构（把宿主表面断言塞进现有 smoke/CI，不建边界层）：改造成本低一半，但契约仍以断言代码散布表达——轴④诊断无投影源、轴②适配改动仍需翻 4462 行找点、新平面的依赖项无登记处——排除理由：治标不治本，§3 清单无处安放。
  - 按面拆四模块（B3）：结构最清晰，但违反客户端单 factory 实证约束（BC-03）且对插件规模属过度工程化（C-03）——排除理由：不可行 + 过度设计。
- **排除理由**: 见上（各备选附）。
- **影响范围**: lib/index.js（宿主调用改经 host-boundary——行为等价重构）、lib/client.js（头部 region 化——纯搬运）、install.ps1/install.sh（注释块——零行为变化）、test/smoke.mjs（新增契约对账段）、.github/workflows/ci.yml（mock 对齐 + 探测 job）、package.json（peer 下限——A1 执行时）、README（版本矩阵）。**零宿主源码改动**（兼容红线——DEC-019 理由栏 + EVD-037 既有口径；2026-09-12 按 REVIEW-COMPAT-001-R1 F1 修正原「DEC-080 红线」失实引用）；用户数据面（书目/稿件/设置）零触碰（P-07）。
- **后续动作**: §8 实现任务清单（COMPAT-002~009）经用户确认入账后分批执行；COMPAT-006（版本矩阵）为独立用户决策点；每任务完成走 Developer+Code Reviewer 标准链。
- **可逆性标注**: **可逆**（架构内重组：纯搬运+新增文件，无数据迁移、无接口 breaking；各组件独立 revert 单 commit 逆转——§4 各轴已附回滚路径）。版本矩阵收敛（A1）单独标注：**半可逆**（代码可逆，但已发布版本的断供声明不可撤回——故绑定 major 边界执行）。

---

## 8. 实现任务建议清单（从本分析导出——供用户确认入账，本轮不执行）

| ID 建议 | 优先级 | 内容 | 依赖 | 验收要点 |
|---|---|---|---|---|
| **COMPAT-002** | P1 | 宿主契约清单提取：`lib/host-contract.mjs`（六面 47 项机读化——本文档 §3 为底稿） | 无（本文档即输入） | 清单覆盖六面全项；纯数据零 import；smoke 能消费；§3 每项可溯源 |
| **COMPAT-003** | P1 | 宿主表面 fixtures 快照 + smoke/CI 契约对账；**顺带修正 CI dsh-settings mock 漂移**（导出面对齐真实 0.1.5-rc.2） | COMPAT-002 | 三版本快照入仓；mock 从快照生成或对齐断言；smoke 新增契约对账段；CI 全绿 |
| **COMPAT-004** | P1 | detectHostCapabilities 探测函数 + 启动 `[nv-compat]` 结构化警告（D2）+ 服务端 host-boundary 收口（B1 服务端部分） | COMPAT-002 | 探测项=契约清单投影；缺面警告可复制可检索；index.js 宿主调用全部经 boundary（行为等价——smoke 203 项零回归） |
| **COMPAT-006** | **P0（决策型）** | 版本矩阵决策（用户决策点）：最低支持版本/是否执行 A1 收敛/时点（0.x vs v1.0） | 本文档（用户确认） | decision-log 落决策；README 矩阵声明；peer 口与 connection inject 处置方案定案 |
| **COMPAT-005** | P2 | 设置页诊断面板（D1——能力报告 UI，只读布尔/名称/版本） | COMPAT-004 | 报告项与契约同步生成；无用户数据输出；宿主版本显示（若 TP-4 证实可行） |
| **COMPAT-007** | P2 | CI scheduled latest 探测轨（C1——只读元数据，不 install 不执行） | COMPAT-002 | scheduled 触发；宿主发版探测红；供应链白名单（只读命令） |
| **COMPAT-008** | P3 | 探针脚本固化 `scripts/probe-host.mjs`（D3——BUG-004/005 方法论：隔离实例+无头浏览器+能力 diff 报告） | COMPAT-002 | 一条命令复现断裂层定位；隔离环境（DSH_HOME 重定向临时目录——真实环境防护三选一之「隔离环境」）；README 维护者文档 |
| **COMPAT-009** | P3 | install 注册知识规范化：两脚本头部「宿主布局契约」注释块 + CI 正则对账 host-contract（轴②安装面） | COMPAT-002 | 注释块与 contract 对账通过；脚本行为零变化（强等价 diff） |

排序建议：COMPAT-002 → 003/004（可并行）→ 006 决策 → 005/007 → 008/009。

---

## 9. 待验证项清单（本分析无法在只读边界内证实，显式标注）

| ID | 待验证内容 | 验证路径建议 | 归属任务 |
|---|---|---|---|
| **TP-1** | 宿主客户端加载器未来是否开放包内多入口（当前 0.1.5-rc.1 实证=单 factory；多入口开放将放宽 region 约束为文件拆分） | 跟踪宿主 dsh-client-modules changelog；诊断面板可显示加载器能力 | COMPAT-005/后续 |
| **TP-2** | 槽位名（settings.section/sidebar.footer.action/shell.overlay）与 agent.cordis.yml 宿主包行名的官方稳定性承诺（无变更历史≠承诺不变） | 宿主文档/changelog 检索；fixtures 快照天然覆盖（变更即红） | COMPAT-003 |
| **TP-3** | `--dsw-alias-*` CSS 令牌官方稳定化状态（当前带兜底值=安全，但主题升级可能改语义而非仅改名） | 宿主前端主题包检索；诊断面板令牌解析项做运行时验证 | COMPAT-004/005 |
| **TP-4** | 客户端获取宿主版本号的官方路径（诊断报告需要；remote.* 元数据/settings describe 是否携带版本——未证实） | 宿主 API 表面检索；不可得则诊断面板省略该项并标注 | COMPAT-005 |
| **TP-5** | `dsh plugin add` Windows shell 转发 bug 上游修复状态（EVD-080 记载——影响安装通道 A 体验但不影响本插件双通道） | 跟踪宿主 issue；README 已有手动 pnpm add 等价提示 | 无需新任务（README 维护） |

---

## 10. 附录：证据与溯源对照

- **治理记录**：BUG-003（plan-tracker L129 / EVD-076）；BUG-004（L131 / EVD-077/077a）；BUG-005（L133 / EVD-078/078a）；BUG-006（L137 / EVD-080/081）；REL-005（L135 / EVD-079）；RISK-003（risk-log L9）；COMPAT-001 执行包（execution-packets.json L5-36）。
- **代码行号**：全部引自 2026-09-11 工作区（lib/index.js 1437 行 / lib/tools.js 405 行 / lib/client.js 4462 行 / install.ps1 349 行 / install.sh 244 行 / ci.yml 91 行 / smoke.mjs 1701 行）。
- **宿主权威核对**（只读 checkout，dsh 0.1.5-rc.1 闭包）：`dsh-settings` 0.1.5-rc.2 `lib/index.js` L610 导出面（无 settingsNamespace——BUG-003 根因独立复核）；`dsh-api-gateway/lib/client.js` L1794-1796 `remoteServiceKey = remote.${ns}`（BUG-004 表面命名权威确认）；`dsh-client-modules/lib/index.js` L155 + `lib/client.js` L248（单入口单 factory 约束——BC-03 实证）。
- **成熟实践引用**（P-08）：适配器模式+特性检测渐进增强（浏览器生态 Modernizr/caniuse 传统）；VS Code 扩展 `engines.vscode` 版本矩阵与 proposed API 检测策略（major 边界断供先例）；浏览器扩展 host permission 最小化声明（承诺面最小化先例）。
- **本文档自检**（硬门槛对照）：六面清单 47 项全覆盖、五要素齐全（§3）；四轴各 ≥2 候选（§4：轴①3/轴②3/轴③3/轴④3）+ 评估标准 + 取舍 + 风险 + 回滚路径；蓝军挑战 5 条 ≥3（§6，独立 ID BC-01~05 + 缓解）；ADR 字段完整（§7：标题/日期/背景/决策/备选/排除理由/影响范围/后续动作 + 可逆性标注）；实现任务清单 8 项（§8）；推测全部标注「待验证」（TP-1~5）；零实现代码、零宿主源码改动提议、模块职责各 ≤3 句（§4 轴②）、依赖方向单向无环（§5）。
