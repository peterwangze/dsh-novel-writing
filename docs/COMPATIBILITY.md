# DSH 宿主兼容性架构设计（COMPAT-021 设计基线）

- 状态：已实施（待评审）（`COMPAT-021` 代际清单/行投影/行级预检 CLI/离线 fixtures 已落地，见 §12.2 勾选；`COMPAT-020` 产品热修已完成）
- 日期：2026-11-07
- 适用插件：`dsh-novel-writing` 0.6.1（REL-009 已发布）
- 目标宿主：DSH `0.1.x`（最低声明 `0.1.2-rc.1`，完整支持 `0.1.5-rc.2`）、`0.2.0-rc.2`、`0.2.1-rc.2`、`0.2.2-rc.1`
- 关联任务：`COMPAT-018`（升级适配）、`COMPAT-020`（预设加载失败热修）、`COMPAT-021`（本设计 + 契约 + 行级预检）、`COMPAT-022`（运行时自适应预设提供者，另立决策）
- 本文性质：**设计文档**。文中标注“计划新增/目标”的模块与命令尚未全部落地；当前已实现的行为以代码、测试与 `docs/evidence/` 为准。

---

## 1. 文档定位与结论摘要

本文回答四个问题：

1. 插件对 DSH 宿主的依赖到底有哪些、哪些是必需、哪些可以降级；
2. 怎样把这些依赖收敛到单一、可审阅、可版本化的契约层；
3. 怎样在插件激活前发现“宿主代际 × 预设声明行”的不匹配，并把失败限制在最小范围；
4. 后续宿主升级时，怎样用低代价、可观测、可回滚的方式适配。

结论摘要：

- **当前故障不是业务逻辑故障，而是宿主代际差异穿透到了静态 bundle patch**。`0.2.2-rc.1` 把 `@deepseek-ai/dsh-tool-subagent-control/list-agents` 子路径从 `exports` 移除，并把 `list_agents` 并入主包；插件 0.2.x 的 `cordis.patch.yml` 仍声明该子路径，导致整个预设 `agentPresets.register` 激活失败，UI 显示红色“加载失败”。
- **`COMPAT-020` 已完成产品热修**：0.2.x 源删除 legacy 行，0.1.x 源保留；新增 `GENERATION_DROPPED` 披露机制、双源方向性硬不变量、smoke 负向对照，以及 `0.2.2-rc.1`/`0.2.1-rc.2` 预设加载实测。`0.2.0-rc.2`/`0.2.1-rc.2` 上独立 `list_agents` 工具不可用，已如实披露，不在热修中伪装为完整支持。
- **`COMPAT-021` 的交付边界是“设计 + 契约 + 行级预检”**，不直接重写宿主预设注册机制。运行期按宿主代际动态生成插件行属于 `COMPAT-022`，须再次关键决策批准。
- **静态 bundle patch 不能按宿主版本分支**，这是本设计必须正面处理的约束。短期用“代际清单 + 安装/构建期选择 + 预检”降低风险；中期再评估运行期 provider；不采用在运行时读取 `app.asar` 内部实现并临时拼接行的方案。

---

## 2. 事实基线与故障复盘

### 2.1 已确认事实

| 事实 | 证据/位置 |
|---|---|
| `0.2.2-rc.1` 的 `@deepseek-ai/dsh-tool-subagent-control` `exports` 只保留 `"."`、`"./src/*"`、`"./package.json"`、`"./locale/*.json"`；`./list-agents` 已移除 | 只读闭包检查；`docs/evidence/COMPAT-020/` 与 R1 复审记录 |
| `0.2.2-rc.1` 主包 `lib/index.js` 含 `registerListAgents`/`list_agents`，`inject` 含 `tools`/`subagents`/`agents` | 同上 |
| `0.2.0-rc.2`、`0.2.1-rc.2` 的 `exports` 仍含 `"./list-agents"`；主包未注册 `list_agents` | npm 包元数据与闭包只读检查 |
| 0.2.x 预设声明行来自 `cordis.patch.yml` 的 `plugins[]`；0.1.x 来自 `agent-presets/novel-writing/agent.cordis.yml` | 两份源文件；`preset-schema-face` dual 模式 |
| 失败行是 `cordis.patch.yml` 中的 `tool-subagent-list-agents`，包名为 `@deepseek-ai/dsh-tool-subagent-control/list-agents` | 失败日志 `ERR_PACKAGE_PATH_NOT_EXPORTED`；`GENERATION_DROPPED` |
| 该失败发生在 `agentPresets.register` 激活期，异常使整个预设 scope 被销毁，UI 显示“加载失败” | 宿主 registry 行为与桌面端现象；`docs/review/COMPAT-020-R1.md` |
| 0.2.2-rc.1 隔离实例 `agentPresets.list()` 返回 `novel-writing` 且无 `broken` | `docs/evidence/COMPAT-020/diag-preset-0.2.2-rc.1.json` |
| 0.2.1-rc.2 隔离实例同样返回 5 个预设且 `novel-writing` 无 `broken` | `docs/evidence/COMPAT-020/diag-preset-0.2.1-rc.2.json` |
| 0.2.0-rc.2 的预设加载依据 BUG-011 代全链路证据；本轮没有新的 0.2.0 启动探针 | `README.md` 兼容矩阵与 `docs/evidence/COMPAT-020/README.md` |
| `lib/host-contract.mjs` 当前 52 个条目，面分布 `11/14/8/7/7/5`，`revisions[]` 21 条 | `lib/host-contract.mjs` |
| `test/validate-preset.mjs` 当前 PASS；`test/smoke.mjs` 为 `334 passed, 0 failed`；`verify-contract-anchors` FAIL=0、WARN=24 | 本地实跑与 R1/R2 验收命令 |
| `preset-schema-face` 最近真跑为 59 行、47 启用、37 checked、1 dropped、0 findings、22 unverified | R1 真跑记录；汇总口径以当前输出为准 |

### 2.2 根因分层

故障不是单点，而是三层叠加：

1. **宿主契约变化**：子路径 `./list-agents` 被移除，能力迁移到主包。
2. **静态声明滞后**：`cordis.patch.yml` 是随包发布的静态 YAML，不能读取宿主版本后分支；0.2.x 行仍指向旧子路径。
3. **失败粒度放大**：预设注册器以整棵预设为事务；任一行激活失败 → 整个预设 `broken` → UI 红色失败，用户看不到“只是某个可选工具行不兼容”。

因此，修复必须同时做三件事：**移除错误声明、记录代际差异、限制未来失败的爆炸半径**。`COMPAT-020` 完成前两件；`COMPAT-021` 负责第三件的基础设施。

### 2.3 为什么不在热修中做运行时按版本分支

- 插件的 bundle patch 在 profile 组合阶段被宿主加载，**运行期代码尚未获得控制权**；无法在静态 YAML 中 `if (hostVersion)`。
- 直接读取 `app.asar` 内部文件并动态拼行，依赖宿主打包布局，属于更脆弱的耦合，且难以在纯 Node 环境稳定复现。
- 0.2.0/0.2.1 的 `list_agents` 能力差异是**代际能力缺失**，不是插件能凭空补齐的；诚实的降级优于伪造完整支持。
- 运行期 provider 需要新的宿主注册 API 假设、回滚与安全边界，必须先有设计/契约/预检，再单独决策。

---

## 3. 宿主依赖分层

按“缺失时插件是否还能提供核心写作价值”分层，而不是按包名分层。

| 层级 | 依赖面 | 典型对象 | 缺失影响 | 策略 |
|---|---|---|---|---|
| L0 组合/加载 | profile、bundle patch、YAML 方言、插件入口 | `cordis`、`js-yaml`、loader schema | 插件根本无法加载 | 必需；最小化直接引用；由宿主 loader 负责 |
| L1 预设注册 | 预设声明、`agentPresets` 服务、声明行 schema | `@deepseek-ai/dsh-agent-preset`、`agentPresets.register` | 预设不可见/显示失败 | 必需；行级预检 + 代际清单 |
| L2 工具/服务 | 子代理、工作流、Ralph、待办、Web、ask-user 等 | `dsh-tool-subagent-control`、`dsh-tool-workflow`、`dsh-tool-ralph`、`dsh-tool-todo`、`dsh-tool-web`、`dsh-tool-ask-user` | 部分能力缺失；核心写作仍可进行 | 可降级；能力探测 + 可选行 + 明确诊断 |
| L3 客户端/UI | slots、connection、locale、会话/工作区 API、DOM/CSS 令牌 | `lib/client.js`、`lib/host-boundary.js` | **分面**：工作台挂载面（shell.overlay 槽消费 → 控制台/分栏）缺失 = 核心写作价值整体丢失；其余（locale 等）缺失 = 界面局部降级 | **工作台挂载面 = 关键面**（COMPAT-023 订正：BUG-012 实证槽位条目崩溃会被宿主 `SlotErrorBoundary` 整体卸载 ⇒「可降级」定级失实——降级后用户无工作台可用）；其余面可降级：单点适配 + 契约登记 |
| L4 安装/环境 | 安装根、闭包布局、profile 目录、版本号 | `resolveDshHome`、`npm root -g`、profile | 预检/迁移不可用 | 只读探测；不修改宿主 |

设计原则：

- **L0/L1 是硬边界**，必须显式、可诊断、fail-closed；
- **L2 是软边界**，优先通过 `ctx.get`/capability probe 降级，不以硬 `inject` 制造启动失败；**L3 分面**（COMPAT-023 订正，BUG-012 教训）：工作台挂载面（shell.overlay 槽消费链）为**关键面**——槽位条目崩溃会被宿主 `SlotErrorBoundary` 整体卸载（用户「点小说工作台不出现」即此形态），看护优先级等同预设面（`preflight --surfaces` 面 2 对契约槽位做逐代对账，缺证据即 `SURFACE_COVERAGE_GAP` FAIL）；L3 其余面（locale 等）仍为软边界降级；
- **L4 只读**，不在运行时改写宿主安装或 profile；
- 任何新增/修改的宿主耦合字面量或符号，必须按 P-10 登记到 `lib/host-contract.mjs`，并在 `test/smoke.mjs` 做双向对账。

---

## 4. 四个设计目标的落地映射

### 目标 1：尽可能减少对 DSH 宿主的依赖

措施：

1. **只保留两个硬依赖面**：组合加载（L0）与预设注册（L1）。L2 工具行逐步改为可选/能力探测；L3 客户端服务缺席时降级而非崩溃。
2. **单一适配层**：`lib/host-boundary.js` 继续作为服务端宿主调用收口；新增 `lib/host-compat/` 只承载“代际数据与预检逻辑”，不扩散到业务模块。
3. **不直接 import 宿主内部实现**：禁止从 `app.asar` 内部路径、宿主未导出的深路径、私有 DOM 选择器取能力；只使用公开 exports/服务/契约登记面。
4. **静态源按代际拆分，而不是在业务代码里堆 `if`**：代际差异集中在清单与预检，业务模块保持代际无关。
5. **可选项不阻塞主链路**：行级 `disabled`/`optional` 与“已知缺失”分类，避免一个可选工具拖垮整棵预设。

### 目标 2：必需接口/字段依赖解耦、单独维护

措施：

1. **`lib/host-contract.mjs` = 宿主表面清单**：记录 file/line、symbol、kind、necessity、incident、note；`revisions[]` 记录每次变更及其范围。
2. **计划新增 `lib/host-compat/generation-manifest.mjs` = 代际矩阵**（纯数据）：
   - generation id（`legacy-0.1`、`decl-0.2.0`、`decl-0.2.1`、`decl-0.2.2`、`unknown`）；
   - 宿主版本/包存在性判据；
   - 每个 generation 的预设行投影（包含/排除/替换）；
   - 已知变体（`GENERATION_VARIANT`）与已知删除（`GENERATION_DROPPED`）；
   - 失败策略（`fail`/`skip-known`/`degrade`）。
3. **计划新增 `lib/host-compat/preset-projection.mjs` = 投影器**：把“基础行 + 代际差异”投影成某代的 `plugins[]`；输出是纯数据，可被预检、测试和（未来的）provider 复用。
4. **`test/fixtures/host-surfaces/preset-schema-face.mjs` 中的 `GENERATION_VARIANT`/`GENERATION_DROPPED` 改为从 manifest 导入**，消除“测试常量与产品常量各写一份”的漂移风险；迁移完成前保持双写并以 smoke 对账。
5. **契约与代际清单的职责分离**：
   - 契约回答“插件碰了宿主什么”；
   - 清单回答“哪个宿主代际该用哪一行”；
   - 预检回答“当前组合是否自洽”；
   - 三者不得互相复制事实。

### 目标 3：对依赖代码做严格校验和看护

措施：

1. **静态硬不变量**：0.2.x patch 不得含 legacy 子路径；0.1.x 源必须恰 1 行且 `config` 为空；0.2.x patch 必须恰 1 行主包 replacement。违反即 `DUAL_SOURCE_DRIFT`。
2. **行级预检**（见 §7）：每一行在激活前完成“包存在性 → exports 解析 → config schema → inject 依赖 → 代际处置”的检查；未知代际 fail-closed。
3. **契约锚点校验**：`scripts/verify-contract-anchors.mjs` 检查 `lib/host-contract.mjs` 的 file/line/symbol 是否仍能在源码命中；新增/改动必须同步 revisions。
4. **smoke 双向对账**：契约条目 ↔ 源码字面量双向子集；新增正向（主包 `list_agents`）与负向（legacy 子路径禁用）两面。
5. **双源等价**：`preset-schema-face` dual 模式核对 `agent.cordis.yml` 与 `cordis.patch.yml` 的行序/键集/config；只允许一个已知 variant 与一个已知 dropped。
6. **失败可归因**：每个失败带 generation、row id、package、exports 检查点、修复建议；不得只打印“加载失败”。

### 目标 4：依赖边界可调测，问题第一时间发现、低代价适配

措施：

1. **预检可离线运行**：不需要启动 DSH、不需要真实 profile；用 fixture 包元数据模拟各代际。CI 可对 4 个代际 + 1 个负向 fixture 全跑。
2. **预检可解释**：`--explain <row>` 输出该行在各个 generation 的包含/排除/替换原因；`--json` 输出稳定结构，便于 UI/CI 消费。
3. **诊断关联 id**：插件启动/预检生成 `compatRunId`，日志、预检结果、证据文件可关联；不输出 token/密钥。
4. **故障注入**：测试环境可用 `NV_COMPAT_FAKE_GENERATION`、`NV_COMPAT_PLANE` 强制某代际/平面，验证 fail-closed 与降级分支；生产忽略未知值。
5. **真实探针**：`scripts/probe-host.mjs`/隔离 profile 仍作为宿主真实行为的权威证据；预检是快速门禁，不替代真实启动。
6. **低代价适配路径**：新增宿主代际时，只改 manifest + fixture + contract revision，不改业务模块；若必须改 provider，先立任务/决策。

---

## 5. 目标架构

### 5.1 分层视图

```text
宿主 DSH（0.1.x / 0.2.x）
   │  profile 组合、bundle patch、agentPresets
   ▼
[静态声明层]
  cordis.patch.yml（0.2.x 源）
  agent-presets/novel-writing/agent.cordis.yml（0.1.x 源）
   │
   ▼
[代际清单层]  lib/host-compat/generation-manifest.mjs（计划新增，纯数据）
   │  generation 判据、行投影、已知 variant/dropped、失败策略
   ▼
[投影/校验层]  lib/host-compat/preset-projection.mjs（计划新增）
   │  rows = project(manifest, generation, baseRows)
   ▼
[适配层]  lib/host-boundary.js（服务端宿主调用收口）
   │  settings/webServer/logger/lifecycle 等服务
   ▼
[业务层]  lib/index.js / lib/tools.js / lib/client.js（代际无关）
```

关键约束：

- **业务层不读取宿主版本号**；代际判断只在清单/预检/适配层发生。
- **静态 YAML 仍是宿主实际加载的入口**；投影器的输出在构建/安装期生成静态文件，或在 `COMPAT-022` 中由 provider 在注册前生成，二者不混用。
- **预检不修改宿主**，只读元数据与文件。

### 5.2 代际判定

判定输入按可信度排序：

1. **profile 的真实宿主平面**：`<profile>/node_modules/@deepseek-ai/dsh/package.json` 的版本；若不存在，使用 profile 的 bundle 解析结果/宿主安装锚点，但必须标记命中通道。
2. **预设注册面**：`@deepseek-ai/dsh-agent-preset` 是否在同一平面存在（0.2.x 声明代）；**不得仅凭全局 npm 安装的 0.2.1 包判定一个 0.1.x profile 为 0.2.x**。
3. **显式覆盖**：测试/诊断可用 `--generation` 或环境变量覆盖，但输出必须标记 `overridden`；生产默认不覆盖。
4. **unknown**：无法判定时 fail-closed，不默认成任意一代。

输出结构（计划）：

```json
{
  "generation": "decl-0.2.2",
  "confidence": "profile",
  "hostVersion": "0.2.2-rc.1",
  "plane": { "profile": "...", "channel": "profile-resolve|install-anchor|fixture" },
  "mixedPlane": false,
  "overridden": false
}
```

`mixedPlane`：profile 与全局闭包指向不同代际，或同一平面同时出现 0.1/0.2 特征时为 `true`；预检必须 WARN，涉及 legacy-only 行时 fail-closed。

### 5.3 静态构建矩阵（短期主方案）

由于 bundle patch 是静态的，推荐在**构建/安装期**选择代际补丁：

- 源：`compat/generations/<generation>/cordis.patch.yml`（计划新增；由 manifest 投影生成，禁止手改）。
- 包内默认：`cordis.patch.yml` 指向当前主支持代际（0.2.2+）。
- 0.1.x 通道：继续使用 `agent.cordis.yml`，不把 0.1.x 行塞进 0.2.x patch。
- 安装脚本/发布流水线：读取目标宿主代际，选择对应 patch；无法判定时**不静默选择**，输出预检错误。
- 产物校验：每个 generation 目录必须通过预检 fixture；生成文件带 hash/版本，避免“手改生成物”。

注意：该方案要求安装期能判定目标代际；桌面端 profile 可能由宿主管理，安装脚本未必总能写入。因此它**降低**而非消除对运行时的依赖；运行期 provider 仍在 `COMPAT-022` 评估。

### 5.4 运行期 provider（COMPAT-022，另立决策）

仅当静态矩阵无法覆盖真实安装路径时启用。候选接口：

```js
// 计划接口，尚未实现
export interface PresetProvider {
  detect(host): Promise<Generation>
  rowsFor(generation, baseRows): Promise<Row[]>
  preflight(rows, host): Promise<PreflightReport>
  register(registry, rows): Promise<void>
}
```

约束：

- 只使用宿主公开的 registry/loader 能力，不读 `app.asar` 内部文件；
- 注册前必须通过行级预检；
- 失败时回退到静态投影，并输出结构化诊断；
- 有 feature flag、超时、幂等、回滚；
- 需关键决策批准，不能在 `COMPAT-021` 中顺手实现。

---

## 6. 代际矩阵

| 代际 | 宿主特征 | 预设行策略 | `list_agents` | 预设加载 | 证据等级 | surfaceEvidence（六面，COMPAT-023） |
|---|---|---|---|---|---|---|
| legacy-0.1（`0.1.2-rc.1` ~ `0.1.5-rc.2`） | 无 `dsh-agent-preset` 声明代；`.agent-presets` 目录机制 | 使用 `agent.cordis.yml`；保留 legacy 子路径行 | 独立子路径可用 | 完整支持（既有 BUG-006/007 证据） | 隔离实例 + fixture | 面 1-3 verified / 面 4-6 fixture-record（`test/fixtures/host-generations/legacy-0.1/surfaces/surfaces.json`；dsh-* 子包 0.1.5-rc.2 + cordis 4.0.2 / schemastery 3.18.2） |
| decl-0.2.0 | 声明代；有 `./list-agents` 子路径；主包未注册 `list_agents` | patch 不含 legacy 行 | **不可用**（主包未注册） | 可加载（BUG-011 全链路） | 既有全链路；本轮未重启动 | 面 1-3 verified / 面 4-6 fixture-record（`test/fixtures/host-generations/decl-0.2.0/surfaces/surfaces.json`；cordis 4.0.5 / schemastery 3.18.5） |
| decl-0.2.1 | 声明代；有 `./list-agents` 子路径；主包未注册 `list_agents` | patch 不含 legacy 行 | **不可用**（主包未注册） | 已实测（`diag-preset-0.2.1-rc.2.json`） | 预设加载面 | 面 1-3 verified / 面 4-6 fixture-record（`test/fixtures/host-generations/decl-0.2.1/surfaces/surfaces.json`；cordis 4.0.5 / schemastery 3.18.5） |
| decl-0.2.2+ | 声明代；`./list-agents` 已移除；主包注册 `list_agents` | patch 不含 legacy 行；主包行在场 | 主包提供 | 已实测（`diag-preset-0.2.2-rc.1.json`）；工作台挂载真路径已实测（`docs/evidence/COMPAT-023/workbench-mount-report.json`，W1-W6 全绿） | 预设加载面 + 工作台挂载面 | 面 1-3 verified / 面 4-6 fixture-record（`test/fixtures/host-generations/decl-0.2.2/surfaces/surfaces.json`；cordis 4.1.0 / schemastery 3.19.0） |
| unknown | 无法判定 | 不投影；fail-closed | 不承诺 | 阻止并诊断 | 预检 fixture | 六面全 `unknown`（fail-closed 带 reason；`--surfaces` 输出 WARN 非绿，`--strict` 升红） |

说明：

- “完整支持”只在有全链路证据时使用；`0.2.2` 本轮只对**预设加载面**与**工作台挂载面**做了新实测，不能把旧的激活/HTTP/写路径证据平移到新版本。
- `0.2.0`/`0.2.1` 的独立 `list_agents` 缺失是**宿主代际能力差异**，不是插件 bug；UI/文档必须明确“不可用”，不得用“部分支持”掩盖。
- 0.1.x 的 legacy 行必须保留；删除会让 0.1.x 用户失去工具，且违背 README 的完整支持承诺。
- surfaceEvidence 六面 = 服务端 API / client 槽位 / DOM / 安装 / 预设清单 / 版本；登记源 = `lib/host-compat/generation-manifest.mjs` `SURFACE_EVIDENCE`（30 格），对账命令 = `node scripts/preflight-preset-rows.mjs --surfaces`（见 §7.5）。

---

## 7. 行级预检契约（COMPAT-021 核心交付）

### 7.1 命令

计划新增：

```text
node scripts/preflight-preset-rows.mjs [options]
```

选项（计划）：

| 选项 | 作用 | 默认 |
|---|---|---|
| `--patch <path>` | 待检查的 0.2.x patch | `cordis.patch.yml` |
| `--legacy <path>` | 0.1.x 源，用于 dual 对账 | `agent-presets/novel-writing/agent.cordis.yml` |
| `--profile <dir>` | 目标 profile 平面 | 自动探测 |
| `--generation <id>` | 强制代际（测试/诊断） | 自动 |
| `--fixture <dir>` | 离线 fixture 模式 | 无 |
| `--json` | 输出稳定 JSON | 人类可读 |
| `--explain <rowId>` | 解释某行在各代际的处置 | 无 |
| `--strict` | unknown/mixed plane 也视为失败；`--surfaces` 下另升 WARN/SKIP（见 §7.5） | 仅硬错误失败 |
| `--no-color` | 纯文本输出 | 自动 |
| `--surfaces` | 依赖面证据对账模式（COMPAT-023；与 `--fixture`/`--profile`/`--explain` 互斥） | 无 |
| `--surfaces-evidence-root <dir>` | 诊断注入：覆盖离线证据缓存根（须与 `--surfaces` 同用；目录须存在） | `test/fixtures/host-generations/` |

退出码：

- `0`：全部行通过，或仅已知 variant/dropped 披露；
- `1`：硬失败（缺包、exports 不匹配、schema 不合法、未知代际、dual drift）；
- `2`：用法错误；
- `3`：环境不可判定（无 profile 且无 fixture，或权限不足）。

### 7.2 检查顺序（每行）

1. **形状**：`id`/`name` 非空；`disabled` 行跳过模块解析但记录。
2. **代际处置**：是否 `GENERATION_VARIANT`/`GENERATION_DROPPED`；只允许清单中声明的差异。
3. **包存在性**：在同一平面解析包；记录 `profile-resolve`/`install-anchor`/`fixture` 通道。
4. **exports 解析**：若 `name` 含子路径，检查包 `exports` 映射；禁止用 `require.resolve` 的“碰巧成功”代替 exports 检查。
5. **config schema**：与宿主 loader 同源的 `entryListSchema`/`resolveConfig` 核对；无 schema 的模块标 `NO_SCHEMA`，不伪造 PASS。
6. **inject/服务**：声明依赖的服务是否在宿主平面可用；缺失按 manifest 策略 fail/warn。**实现注记（COMPAT-021 R1 F3）**：本步**未实现**——当前预设行（两源的 `plugins[]` 行）不声明 inject/服务字段，检查面为空，硬实现只会制造恒真断言；留待 COMPAT-022 provider 引入服务依赖时一并实现（届时 manifest `failurePolicy` 已就位）。
7. **dual 对账**：0.1.x 源与 0.2.x patch 的行集/顺序/config 差异必须与清单一致；不一致即 `DUAL_SOURCE_DRIFT`。
8. **结果**：`PASS` / `KNOWN_DROP` / `KNOWN_VARIANT` / `WARN` / `FAIL` / `NOT_RUN`；`NOT_RUN` 不得渲染为 PASS。

### 7.3 JSON 输出（稳定契约）

```json
{
  "schemaVersion": 1,
  "ok": false,
  "generation": "decl-0.2.2",
  "confidence": "profile",
  "plane": { "channel": "profile-resolve", "profile": "..." },
  "mixedPlane": false,
  "rows": [
    {
      "id": "tool-subagent-control",
      "name": "@deepseek-ai/dsh-tool-subagent-control",
      "status": "PASS",
      "checks": ["shape", "package", "exports", "config"],
      "evidence": "..."
    }
  ],
  "summary": { "total": 0, "pass": 0, "knownDrop": 0, "knownVariant": 0, "fail": 0, "notRun": 0 },
  "errors": []
}
```

约束：字段名/枚举稳定；错误信息不包含 token；`evidence` 只放路径/包版本/检查点，不放完整宿主 dump。

### 7.4 Fixture 设计

计划新增 `test/fixtures/host-generations/`：

```text
legacy-0.1/
decl-0.2.0/
decl-0.2.1/
decl-0.2.2/
unknown/
negative-missing-export/
```

每个 fixture 至少包含：

- 伪 `package.json`（包名/版本/exports）；
- 行清单（patch + legacy 源）；
- 期望结果（`PASS`/`KNOWN_DROP`/`FAIL` + 错误码）；
- 一个负向用例：0.2.2 fixture 中出现 legacy 子路径 → 必须 `FAIL`，错误含 `ERR_PACKAGE_PATH_NOT_EXPORTED`/等价说明。

Fixture 只读、无网络、无真实宿主；CI 可重复。

### 7.5 依赖面证据对账（COMPAT-023：`--surfaces`）

```text
node scripts/preflight-preset-rows.mjs --surfaces [--strict] [--surfaces-evidence-root <dir>] [--json]
```

语义（与行级预检同一 CLI 的独立模式；与 `--fixture`/`--profile`/`--explain` 互斥，混用 exit 2）：

- **对账对象**：`lib/host-compat/generation-manifest.mjs` 的 `SURFACE_EVIDENCE`（5 代 × 6 面 = 30 格）× 离线证据缓存（`test/fixtures/host-generations/<gen>/surfaces/surfaces.json`）× 仓库文件（面 4/5 锚点、面 6 版本判据回环）。
- **六面**：1 服务端 API（8 看护包 keyExports + BUG-011 settings/sessions 断面）/ 2 client 槽位（shell.overlay 等注册+消费形态——**关键面**）/ 3 DOM 物化锚点 / 4 安装锚点 / 5 预设清单锚点 / 6 版本判据回环（`detectGeneration` 把代表版本判回本代）。
- **状态三态 + fail-closed**：格 status ∈ `verified`（面 1-3，须缓存证据支撑）/ `fixture-record`（面 4-6，源 = 仓库自身文件）/ `unknown`（无据——**不默认绿**，输出 WARN）；`--strict` 把 WARN（`STRICT_SURFACE_UNKNOWN`）与 SKIP（`STRICT_SURFACE_SKIP`）晋升 exit 1。
- **SKIP ≠ PASS（BUG-007 三态口径）**：verified 面但缓存文件缺失 ⇒ `SKIP`（`SURFACE_EVIDENCE_CACHE_MISSING`），exit 仍 0（三态非失败）；`--strict` 下升红。
- **篡改必红（判别力）**：缓存证据与 manifest 声明不符（如抹掉 shell.overlay 的注册/消费命中）⇒ FAIL（`SURFACE_EVIDENCE_MISMATCH`）exit 1，其余格不受污染。
- **契约交叉对账（BUG-012 教训，恒跑全代际）**：契约 `regionLiterals.slotNames` ⊆ 每个已知代际面 2 证据、`requiredExports` 包 ⊆ 面 1 看护包、`requiredExports` 导出名 ⊆ 现行代（`hostSurface.current`）keyExports——缺 ⇒ `SURFACE_COVERAGE_GAP` FAIL（关键面失据不得静默）。
- **离线可跑**：缓存随仓入库（`schemaVersion: 1`，无 token/凭据）；重采 = `node scripts/collect-host-surface-evidence.mjs`（只读 `npm view` + `npm pack --pack-destination` + `tar` 解包，**零 install**——不执行任何宿主代码）。
- 期望基线（当前缓存，`collectedAt: 2026-11-07`）：pristine = 30 格 / 24 PASS + 6 WARN（WARN 全部集中于 unknown 代）/ 0 SKIP / 0 FAIL / exit 0。

---

## 8. 可调测性与诊断设计

### 8.1 诊断面

- `[nv-compat]` 日志统一前缀；字段：`compatRunId`、`generation`、`rowId`、`package`、`status`、`reason`、`plane`。
- 启动时输出一行摘要：`generation=... plane=... rows=... knownDrop=... fail=...`；详细行按需/`DEBUG`。
- 失败时输出**修复建议**：例如“0.2.2 请使用主包行，不要声明 `./list-agents`”。
- 不在日志中输出认证 token、完整 profile 内容、用户路径以外的隐私。

### 8.2 调试命令

```text
node scripts/preflight-preset-rows.mjs --json
node scripts/preflight-preset-rows.mjs --explain tool-subagent-list-agents
node scripts/preflight-preset-rows.mjs --fixture test/fixtures/host-generations/decl-0.2.2
node scripts/preflight-preset-rows.mjs --generation unknown --strict
```

期望：

- 正常：exit 0，`ok:true`，`knownDrop:1`（仅 0.1.x 源 dual 对账时）；
- 负向：exit 1，错误可定位到 row/包/exports；
- unknown：exit 1（fail-closed，与 §7.1 退出码表一致——未知代际列在硬失败；`--strict` 仅为混合平面加判），**不得默认 PASS**。

### 8.3 故障注入

仅测试环境：

- `NV_COMPAT_FAKE_GENERATION=decl-0.2.2`
- `NV_COMPAT_PLANE=fixture|profile|install-anchor`
- `NV_COMPAT_FAIL_ROW=<id>`（模拟单行失败）

生产环境忽略/拒绝未知值；输出标记 `injected: true`，避免被当成真实证据。

---

## 9. 验证与看护体系

### 9.1 分层验证

| 层 | 命令 | 目的 | 当前状态 |
|---|---|---|---|
| 语法 | `node --check lib/host-contract.mjs` 等 | 防止低层语法错误 | 已通过 |
| 契约锚点 | `node scripts/verify-contract-anchors.mjs` | file/line/symbol 不失真 | 已通过（FAIL=0，WARN=24） |
| 预设静态 | `node test/validate-preset.mjs` | 行形状/exports/双源/config | 已通过 |
| 双源 schema | `node test/fixtures/host-surfaces/preset-schema-face.mjs`（由 validate/smoke 调用） | 行 × schema、variant/dropped | 已通过（0 findings） |
| 行为回归 | `node test/smoke.mjs` | 334 项回归 + 负向对照 | 已通过（334/0） |
| 预检 fixture | `node scripts/preflight-preset-rows.mjs --fixture ...` | 4 代际 + 负向 | **待 COMPAT-021 实现** |
| 真实探针 | 隔离 profile 启动 + `agentPresets.list()` | 宿主真实行为 | 0.2.2/0.2.1 已实测；0.2.0 用既有证据 |
| 视觉/几何 | `scripts/verify-visual-geometry.mjs` | UI 边界不漂移 | 既有基线 |

### 9.2 CI 门禁

计划新增两个 job/步骤：

1. **preflight-fixtures**（快速）：对 4 个 generation fixture + 1 个 negative 跑预检；要求 0/0/0/0 与 1 个预期失败。
2. **preflight-real**（环境相关，允许 NOT_RUN 但不得假 PASS）：在可用 profile 上跑真实预检；无 profile 时明确 `NOT_RUN`。

门禁原则：

- `NOT_RUN` 不是 PASS；CI 汇总必须显示 `NOT_RUN` 数量。
- 负向 fixture 必须至少有一个硬失败，防止“全绿空转”。
- 任何新增/修改的宿主字面量必须同时更新 contract + smoke 对账；否则 CI 红。

### 9.3 证据留档

- 预检 JSON 写入 `docs/evidence/COMPAT-021/`（计划），文件名含 generation/时间/hash；
- 真实探针日志与 `agentPresets.list()` 结果分开保存；
- 不提交 token/认证头；日志脱敏后再入库。

---

## 10. 迁移、发布与路线图

### 10.1 分阶段

| 阶段 | 内容 | 风险 | 回滚 |
|---|---|---|---|
| P0（已完成） | `COMPAT-020` 热修：0.2.x 删除 legacy 行、0.1.x 保留、`GENERATION_DROPPED`、双源不变量、0.2.2/0.2.1 证据 | 0.2.0/0.2.1 独立 `list_agents` 不可用（已披露） | 恢复 patch 旧行会重新触发失败，不可取；回滚需同时回滚宿主/文档 |
| P1（COMPAT-021） | manifest + projection + preflight + fixtures + 文档；**不改变现有静态 patch 行为** | 新增模块/命令的维护成本；fixture 与真实宿主漂移 | 删除新增预检/清单；静态 patch 不变 |
| P2（COMPAT-022） | 运行时代际感知 provider（如需） | 宿主 API 假设、注册失败、回滚复杂 | feature flag + 静态投影回退 |
| P3 | UI 标题截断/可访问性等独立问题 | 与兼容性根因无关 | 单独回滚 |

### 10.2 发布号

- 当前 `package.json` 版本为 `0.6.1`；`COMPAT-020`/`COMPAT-021` 已纳入 0.6.x 发布。
- `COMPAT-021` 已随 `0.6.0` 发布（REL-008）；0.6.1 为 BUG-013 prompt 变量修复（REL-009）。
- 发布说明必须包含：修复内容、0.2.0/0.2.1 限制、验证命令与证据路径。

### 10.3 升级检查清单（宿主新版本）

1. 读取新宿主 `exports`/主包注册点/预设 registry 行为；
2. 新增 generation fixture 与 manifest 行；
3. 跑 preflight fixtures + real profile；
4. 更新 `lib/host-contract.mjs` revisions 与 README 矩阵；
5. 在隔离 profile 做真实启动 + `agentPresets.list()`；
6. 更新 CHANGELOG/证据；
7. 若需运行期 provider，另立任务与决策。

---

## 11. 风险与未决项

| ID | 风险 | 影响 | 缓解 | 状态 |
|---|---|---|---|---|
| RISK-C1 | 静态 bundle patch 无法按宿主版本分支 | 旧代际声明可能再次失配 | 静态构建矩阵 + 预检 + 诚实降级；运行期方案另立 | 已知，P1 设计覆盖 |
| RISK-C2 | 0.2.0/0.2.1 独立 `list_agents` 不可用 | 用户少一个工具 | 文档披露；主链路不受影响；等待 COMPAT-022/宿主升级 | 已披露 |
| RISK-C3 | 平面判定受全局 npm 安装影响，可能把 0.1.x profile 误判为 0.2.x | 0.1.x legacy 行被错误跳过 | 代际判定绑定 profile 宿主平面；`mixedPlane` WARN/fail-closed；fixture 覆盖 | **P1 必须修** |
| RISK-C4 | 预检与真实 loader 语义漂移 | 预检 PASS 但实际失败 | 复用 loader schema/`resolveConfig`；真实探针兜底；fixture 与真实双跑 | 设计中 |
| RISK-C5 | UI/客户端 DOM/CSS 耦合随宿主改版漂移 | 界面错位/不可用 | `host-contract` 面 2/3 登记 + 几何校验 + 视觉回归 | 既有看护 |
| RISK-C6 | `app.asar` 不可直接读取/解析 | 诊断困难 | 只读探针、`app.asar.unpacked`、真实启动；不把 asar 内部布局当契约 | 已知 |
| RISK-C7 | 清单/契约/测试三处事实漂移 | 假 PASS | 单一 manifest + 双向 smoke + anchors + 负向 fixture | 设计中 |
| RISK-C8 | 未知代际默认放行 | 升级后静默失败 | unknown fail-closed；`--strict`；CI 负向 | 设计中 |

未决项（需后续决策/验证）：

- `COMPAT-022` 是否值得引入运行期 provider；若引入，宿主公开 API 是否足够稳定；
- 桌面端 profile 由 Electron 管理时，安装期静态矩阵能否可靠落地；
- 0.2.0 是否需要补一次真实启动探针（当前只有 BUG-011 既有证据）；
- README 的“完整支持”口径是否需要在 Release Gate 前进一步收敛（0.2.2 仅预设加载面新实测）。

---

## 12. 验收标准（COMPAT-021）

### 12.1 四目标验收

| 目标 | 可运行信号 | 通过标准 |
|---|---|---|
| 减少依赖 | 契约/源码扫描 | 新增/修改的宿主字面量 100% 登记；L2 工具行有 optional/降级说明；无新增深路径 import |
| 解耦维护 | `lib/host-contract.mjs` + manifest | 契约 52 项不变或按变更登记；manifest 成为代际唯一数据源；revisions 追加 |
| 严格校验 | `preflight-preset-rows.mjs --fixture ...` | 4 代际 fixture 全通过；negative fixture 必失败；unknown exit 1（fail-closed，与 §7.1/§8.2 统一）；真实 profile 预检 PASS 或明确 NOT_RUN |
| 可调测 | `--json`/`--explain`/故障注入 | 输出稳定 schema；单行解释可读；测试可强制代际；诊断不含密钥 |

### 12.2 交付物

- [x] `docs/COMPATIBILITY.md`（本文）
- [x] `lib/host-compat/generation-manifest.mjs`（已实施：五代清单 + `detectGeneration` 纯函数；`GENERATION_VARIANT`/`GENERATION_DROPPED` 单一事实源，preset-schema-face 为兼容 re-export 面）
- [x] `lib/host-compat/preset-projection.mjs`（已实施：`projectRows` 行投影（unknown fail-closed）+ `reconcileDualSources` 双源对账单源化）
- [x] `scripts/preflight-preset-rows.mjs`（已实施：§7 检查顺序/退出码/JSON schema/C3 平面绑定/`--explain`/`--strict`/故障注入）
- [x] `test/fixtures/host-generations/`（已实施：六目录 + 伪 node_modules 平面 + 最小行集 + `expected.json`；negative 复刻原故障必红）
- [x] `test/preflight-preset-rows.test.mjs` 或 smoke 接线（已实施：独立测试，spawn CLI 真跑；smoke 断言数 334 不变）
- [x] `lib/host-contract.mjs` revisions/条目更新（已实施：revisions 追加 COMPAT-021（21→22）；不加 items[] 条目——52 项与面分布 golden 保持，preflight 的宿主 exports 面读取以清单登记（职责三分））
- [x] README/CHANGELOG 说明
- [ ] `docs/evidence/COMPAT-021/` 预检证据（**未交付**：归 Coordinator/评审侧归档——本任务产出以验收命令实跑读数为准，见交付报告）
- [ ] R2+ 独立复审（**未做**：待评审；§9.2 严格校验面已由 `test/preflight-preset-rows.test.mjs` 先行落地）

### 12.3 明确不在本任务范围

- 重写 DSH 宿主 loader / preset registry；
- 运行期动态注册 provider（`COMPAT-022`）——**已决策不实施（DEC-161，2026-11-08 用户确认）**：静态预设行 + COMPAT-023 全依赖面看护（宿主新版本检出日精确报红）+ 已验证热修路径（COMPAT-020 约 2 小时）足够；运行时自适应将新增一类运行期耦合面，复杂度收益比不占优。重评触发条件：宿主正式版发布时预设面再断且热修成本显著上升；
- 0.2.0/0.2.1 上凭空补出 `list_agents`；
- UI 标题截断的视觉修复（独立问题）；
- 发布号 bump / Release Gate 决策。

---

## 13. 与现有代码/文档的对应关系

| 现有对象 | 本设计中的角色 | 后续动作 |
|---|---|---|
| `lib/host-contract.mjs` | 宿主表面清单 + revisions | 保持单一事实源；新增代际条目时追加 |
| `lib/host-boundary.js` | 服务端宿主调用收口 | 不扩散；可选服务降级 |
| `lib/index.js` / `lib/tools.js` / `lib/client.js` | 业务/工具/客户端 | 保持代际无关；不读宿主版本 |
| `test/fixtures/host-surfaces/preset-schema-face.mjs` | 预设行 × schema、variant/dropped | 计划改为从 manifest 导入常量 |
| `test/validate-preset.mjs` | 行形状/exports/双源 | 计划接入预检结果；保留现有 PASS |
| `test/smoke.mjs` | 行为回归 + P-10 对账 | 继续作为最后一道回归 |
| `scripts/verify-contract-anchors.mjs` | 契约锚点 | 新增代际模块后扩展锚点 |
| `cordis.patch.yml` | 0.2.x 静态源 | 短期保持；中期由构建矩阵生成 |
| `agent-presets/novel-writing/agent.cordis.yml` | 0.1.x 静态源 | 保留 legacy 行；不并入 0.2.x |
| `docs/evidence/COMPAT-020/` | 热修证据 | 保留；新证据入 COMPAT-021 |

---

## 14. 关键决策记录（待 Release Gate / 后续任务）

1. **DEC-159（已记录）**：保留 0.1.x legacy 行；0.2.x 删除；新增 `GENERATION_DROPPED`；0.2.0/0.2.1 限制如实披露；运行期重写另立任务。
2. **本设计建议**：`COMPAT-021` 只做 manifest + projection + preflight + fixtures，不改变现有静态 patch 行为；`COMPAT-022` 再评估运行期 provider。
3. **发布号**：不在本文决定；由 Release Gate 用户确认。
4. **风险 C3（平面误判）**：`COMPAT-021` 必须修复或以测试证明不会发生；否则预检的“严格性”不成立。

---

## 15. 一页速查

```text
故障：0.2.2 移除 ./list-agents → 静态 patch 仍声明 → 整个预设 broken
热修：0.2.x 删行 / 0.1.x 保留 / GENERATION_DROPPED / 双源不变量 / 0.2.2+0.2.1 实测
限制：0.2.0/0.2.1 独立 list_agents 不可用（已披露）
设计：契约（碰了什么） + 代际清单（哪代用哪行） + 预检（当前组合是否自洽）
边界：COMPAT-021 只做设计/契约/预检；运行期 provider = COMPAT-022，另立决策
门禁：fixtures 4 代际 + 负向必红；unknown fail-closed；NOT_RUN ≠ PASS
```
