# COMPAT-001 设计审查报告（R1）

> **Task**: COMPAT-001（P1）— 兼容性设计分析文档后置设计审查 | **Round**: **R1**（首审，无前轮）
> **审查人**: Design Reviewer Agent（独立于 Architect 作者；Bar Raiser 单 agent 最低标准经视角切换满足，见 §6）
> **日期**: 2026-09-12 | **审查对象**: `docs/research/COMPAT-001-host-compat-analysis.md`（318 行，10 节，唯一产出）
> **终态结论**: **APPROVED_WITH_NOTES（unresolved_blockers = 0）** —— 附 2 条 P2（ADR 决策 ID 引用失实，入册前 MUST 修正）+ 8 条 P3；设计实质（六面清单/四轴/边界层架构/任务清单）零阻断缺陷，硬门槛 6/6 全过。

---

## 1. 审查范围与事实源

- **审查对象全文**通读（§1 执行摘要 ~ §10 溯源附录）。
- **治理事实源**：`.governance/decision-log.md`（全文 33 行——DEC-001~024）、`evidence-log.md`（EVD-076/077/077a/078/078a/079/080/081/082 逐条）、`risk-log.md`（L9 = RISK-003 ✓）、`project-principles.md`（P-01/05/08、C-02 逐条）、`plan-tracker.md` L127~139（BUG-003/004/005、REL-005、BUG-006、COMPAT-001 行）、`execution-packets.json` L5-40（COMPAT-001 执行包）。
- **代码抽查基准**（只读）：lib/index.js（1437 行）、lib/client.js（4462 行）、lib/tools.js（405 行）、install.ps1（349 行）、install.sh（244 行）、package.json（48 行）、.github/workflows/ci.yml（91 行）、cordis.patch.yml（12 行）、test/smoke.mjs（1701 行，抽段）、agent-presets/novel-writing/preset.yml、agent.cordis.yml（216 行，抽段）。
- **宿主 checkout 只读核对**（`C:\Users\peter\AppData\Local\npm-cache\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai\`）：dsh-settings@0.1.5-rc.2（package.json L4 版本已核）、dsh-api-gateway、dsh-client-modules。

## 2. 硬门槛裁决表

| # | 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|---|
| 1 | 候选方案数（逐轴） | ≥2 | 轴①3（A1/A2/A3）/轴②3（B1/B2/B3）/轴③3（C1/C2/C3）/轴④3（D1/D2/D3）——文档自称 3/轴属实 | **PASS** |
| 2 | ADR 关键字段完整 | =100% | 标题✓/日期✓（2026-09-11 proposed）/背景✓/决策✓（4 条）/备选方案✓（3 项）/排除理由✓（各项附）/影响范围✓/后续动作✓ + 可逆性标注（额外项） | **PASS** |
| 3 | 蓝军挑战条数（独立 ID） | ≥3 | 5 条（BC-01~05），每条有缓解措施，均非稻草人（逐条评估见 §3-维度2） | **PASS** |
| 4 | 模块无循环依赖 + 职责 ≤3 句 | 0 环 / 各 ≤3 句 | 依赖方向单向无环（产品→边界→契约→宿主镜像；契约纯数据无出边；测试只进不出——§7 详析）；host-contract/host-boundary/client region/install 注释块四件职责各 ≤3 句 ✓；detectHostCapabilities（第五件）无显式 ≤3 句定义块 → P3（F3），非环/非膨胀问题 | **PASS**（附 F3） |
| 5 | 行号引用抽查 | ≥12（每面 ≥2） | **抽核 61 处，失实 0 处**（六面 45 项带行号依赖项全覆盖 + 宿主 checkout 4 处 + smoke 4 处 + 治理行号勾稽 6 处 + 存在性抽验 2 处；明细见 §5） | **PASS** |
| 6 | Bar Raiser（独立评审） | 已执行 | 本 Reviewer 非 Architect 作者、非任务执行者；完成对立面框架切换（攻击者/最愤怒用户/维护者三视角）+ ≥3 核心假设挑战（RB-01~03，§6），结论在切换后独立得出 | **PASS** |

## 3. 六维度逐项结论

### 维度 1 — 方案完整性：**PASS**
- 四轴各 3 候选（硬门槛 1）✓；**评估标准先于结论定义**：每轴「评估标准（方案选择前定义）」小节均位于「取舍」段之前（轴① L145→L147、轴② L166→L168、轴③ L191→L193、轴④ L210→L212）✓。
- 排除理由充分：A2/A3 按维护成本/事故复发概率/断供面量化排除；B3 以**已实证约束**（宿主单 factory，BC-03）+ 过度工程（C-03）双重理由排除；ADR 备选 3 项（维持现状/仅加测试/按面拆四模块）各附排除理由 ✓。
- 每轴附风险与回滚路径（轴① peer 回退+过渡开关；轴② 纯搬运单 commit 逆转；轴③ 三层独立回退；轴④ 三面独立删除）✓。

### 维度 2 — 蓝军挑战：**PASS**
文档自带 5 条独立 ID 挑战，真实性逐条判定（非稻草人）：
- **BC-01**（契约清单自身腐化 → false negative 比无防护更危险）：真实的元防护问题（谁看护看护者）；缓解四层（初版从真实 checkout 提取/快照程序化生成/scheduled 外部对账/修复 PR 强制核对契约）针对性强。**非稻草人**。
- **BC-02**（边界层膨胀为上帝模块）：真实 C-03 风险（client.js 4462 行前车之鉴）；缓解=三职责硬分离+函数粒度保持（只搬运不重写）+region 行数上限断言。**非稻草人**。
- **BC-03**（模块化假设不成立）：已**前置实证**（宿主 dsh-client-modules 单 factory——本轮独立复核成立，见 §5）并预留 region→文件平移迁移路径；实为从约束推导的设计决策。**非稻草人**。
- **BC-04**（A1 断供旧宿主用户）：真实用户风险；缓解=用户决策点（COMPAT-006）+v1.0 major 边界+apiHas 降级底+README/v0.5.x tag 回退。**非稻草人**（但其中「诊断面板显示宿主版本低于最低支持」依赖未证实的 TP-4，见 F6）。
- **BC-05**（诊断面信息泄露/探测轨供应链）：真实安全面；缓解=输出仅布尔/名称/版本（写入 COMPAT-005 验收）+ 探测轨只读元数据不 install 不执行。**非稻草人**。
- Reviewer 蓝军补充 3 条（RB-01~03）见 §6。

### 维度 3 — 模块结构：**PASS**（附 F3）
- 职责 ≤3 句核验：host-contract.mjs（3 句）/host-boundary.js（3 句）/client `#region host-surface`（2 句）/install 注释块（1 句）✓；**detectHostCapabilities** 在 §5 架构图中为边界层第五组件（D1/D2/CI 三消费方），但轴② 模块职责清单无其显式 ≤3 句定义——其职责仅可从 C3/D1 消费描述推导 → **F3（P3）**：建议 COMPAT-004 实现时补显式定义（例：读取 host-contract 声明 → 探测宿主实际表面 → 输出结构化能力报告；纯读取无副作用；单一实现三消费方共用）。
- 依赖方向单向无环（§7 详析）✓。
- 与三处单点的迁移路径清晰：makeHostApi/makeSessionsHookReactive → region「只搬运不重写」（BC-02 明示）；install 双通道 → 注释块+CI 正则对账（COMPAT-009 强等价 diff 验收）；ADR 影响范围逐文件标注改动性质（行为等价重构/纯搬运/零行为变化）✓。

### 维度 4 — 接口契约：**PASS**（附 F4）
- 六面清单 47 项**五要素齐全**（依赖点文件+行号/用途/必要性/现有防护/事故关联；3.7 自有项防护列「—」合理）✓；行号引用抽核 61 处 0 失实（§5）。
- 关键接口形状描述充分：makeHostApi facade 对外约定（`{result:{ok,value,error}}` 包装、单对象入参、44 调用点零改动）、remote.* 位置参数形状（settings 三参含 expectedRevision acceptsUndefined、session.prompt requestId 铸造、directoryPicker string→`{path}`、agentPresets.select 两参位置）——均与代码逐行核对一致 ✓。
- 「调用 ⊆ 契约」对账缺口（现状缺口③）有对应方案（C2 smoke 对账段，COMPAT-003 验收）✓。
- **F4（P3）**：host-contract.mjs 的机读 schema 样例未给出——§3 五要素表格是隐式 schema，建议 COMPAT-002 交付时补一条目样例（字段集如 face/item/kind/symbol/file/line/necessity）过 review。

### 维度 5 — 非功能需求：**PASS**（附 F7）
- **性能**：C3 加载期探测「不阻断加载，降级可见化」有方案 ✓；D1 面板经「诊断入口」触发（隐含惰性）✓。**F7（P3）**：apply 期探测耗时预算未量化，且 apply 期探测项集 ⊆ 快速同步项（服务句柄存在性）与面板期异步项（HTTP 连通/DOM/getComputedStyle）的划分未显式声明——建议 COMPAT-004 验收要点补「apply 期探测项全部同步快速、无网络/布局等待」。
- **安全**：诊断输出边界（仅布尔/名称/版本；不含路径/token/用户数据）写入 BC-05 + COMPAT-005 验收 ✓；C1 供应链防护（只 `npm view`/`npm pack` 读元数据，不 install 不执行，CI 只读命令白名单）✓。
- **可扩展**：新宿主表面入契约流程明确（「更新契约清单 → 边界层单点适配 → fixtures 快照更新 = 显式审阅」§5 + 快照更新 PR=变更审阅点）✓。
- **可维护**：单独维护面正是轴②主诉求（host-boundary 单文件/region 单点/契约纯数据三分离）✓。

### 维度 6 — 实现任务清单可执行性：**PASS**（附 F5）
- COMPAT-002~009 共 8 项，每项有优先级/依赖/验收要点；依赖图无环且可并行（002 → 003/004 并行 → 006 决策 → 005/007 → 008/009）✓；验收要点均可客观判定（清单覆盖/纯数据/smoke 消费/强等价 diff/CI 绿/203 零回归）✓。
- **COMPAT-006 标记为用户决策点恰当**（对照 DEC-024 边界②）：A1 版本矩阵收敛=断供旧宿主=breaking change，恰属 DEC-024 保留的用户确认域；文档同时把 0.x 阶段的 A3（inject 收敛，非 breaking）留在预授权范围自动执行——授权边界划分与 DEC-024 自洽 ✓。
- **F5（P3）**：mock 漂移修正（6.4，执行摘要称「零新设施、立即可做、第一优先」）被绑入依赖 COMPAT-002 的 COMPAT-003——时序自相矛盾；建议拆出为立即可做的独立 hotfix（删 ci.yml L76-78 的 `settingsNamespace` mock 导出行或对齐真实导出面），与 fixtures 生成解耦。

## 4. 特别项审查

- **A. 结论事实可溯源性**：行号类抽核 61 处 / 失实 0 处（§5）。**决策 ID 引用失实 2 处（F1/F2，P2）**：
  - **F1（P2）**：§7 ADR 影响范围「零宿主源码改动（**DEC-080 红线**）」——decision-log 全文仅存在 DEC-001~024，**DEC-080 不存在**，属失实引用；ADR 系「供 Coordinator 提请用户确认后写入 decision-log」的文本，带此错误入册将污染决策记录。**MUST 在 ADR 提请确认/入册前修正**（改为正确表述，见 F2 建议）。
  - **F2（P2）**：文档头部与 §7 背景两处「**DEC-021 兼容红线**（零宿主源码改动）」——decision-log 中 **DEC-021 实为「设计主题自适应原则」（2026-08-29，UX-053 V7）**；「禁宿主源码改动」红线仅以文字形式存在于 DEC-013①/DEC-019 理由栏，**无独立 DEC 条目**。该误指源头在治理层（DEC-024 边界②与 execution-packets.json L10/L23 同样误指），文档为继承者，但按 P-01「证据 ID 可溯源」标准仍须修正。**建议**：文档两处改为「兼容红线（零宿主源码改动，DEC-013/DEC-019 既有口径）」；Coordinator 在 ADR 入册落新 DEC 时**补一条澄清性决策**（为兼容红线正名编号），一并修复治理层同源误指。
  - 两条均为**引用/编辑层缺陷，不改变设计实质**（零宿主源码改动约束本身在全文以文字正确表述且被遵守，见特别项 C）。
- **B. 推测显式标注**：TP-1~5 独立清单 ✓ + 正文内联标注（2.13「待验证 TP-2」、3.4「待验证 TP-3」、轴④「待验证 TP-4」、BC-03「待验证 TP-1」）✓，每项附验证路径建议与归属任务 ✓。**PASS**。
- **C. 违反 DEC-021 红线（实质=零宿主源码改动）的提议**：**无**——B3 排除理由即「违反实证约束 + DEC-021 禁改宿主」；ADR 影响范围全部为本仓库文件（lib/、test/、ci.yml、package.json、README、install 脚本）+「零宿主源码改动」明示；C1 探测轨不 install 不执行宿主代码；COMPAT-008 探针用隔离实例（DSH_HOME 重定向临时目录）。**PASS**。
- **D. 重复造轮子（P-08）**：**无违规**——模式层引用成熟实践（适配器+特性检测渐进增强=Modernizr/caniuse 传统；版本矩阵=VS Code engines.vscode 先例；承诺面最小化=浏览器扩展 host permission 先例）并作为设计依据而非装饰；实现层优先复用既有资产（makeHostApi/makeSessionsHookReactive 只搬运不重写、smoke 源码字符串断言手法复用、install 结构不动）；host-contract 自建轻量契约清单 vs 引入契约测试框架——本插件为零运行时 dependencies 架构（package.json dependencies={}，CI 依赖架构守卫强制 @deepseek-ai/* 不得入 dependencies），引入外部框架违反既定架构，纯数据文件是合理取舍。**PASS**。

## 5. 行号抽查结果与覆盖披露

**总计：抽核 61 处引用，失实 0 处（行号层面）；决策 ID 失实 2 处（F1/F2，另行列缺陷）。** 明细：

| 面 | 抽查项 | 结果 |
|---|---|---|
| 面 1 服务端（11/11 项） | index.js L16/17/18（imports）、L30（inject）、L33（NS 字符串）、L82（super）、L88（settings.get）、L114（logger）、L157-184+L163（ensurePreset/resolveDshHome）、L1229-1289（webServer.register kind:'exact'）、L1358-1361（resolveDshHome 二调）、L1423（settings.register）、L1427-1431（ctx.get webServer+缺席警告）、L1429（ctx.effect label）；tools.js L17/22/46（defineTool/inject/register） | 全部精确命中 |
| 面 2 客户端（13/13 项） | L92-94（__ModuleLoader__.load 单入口）、L97（require('react')）、L4350（inject 三服务）、L532/556/572/581/620/629（connection.api 恰在回退分支——L531-633 makeHostApi 函数体精确）、L547-557（remote.settings 位置参数+第三参 undefined=acceptsUndefined）、L558-573+L489-497（remote.session/requestId 铸造）、L574-601+L499-525（remote.workspace+awaitWorkspacesReady）、L602-621+L610（directoryPicker pick→{path}）、L622-630（agentPresets.select 两参）、L1195-1259+L1201-1204（makeSessionsHookReactive/形状校验）、L1292-1295（apiHas）、L1300-1310（launcher.sessions.open）、L4377-4383（internal/service 单监听双消费）、L4403-4435（slots.inject×6：settings.section+sidebar.footer.action+shell.overlay×4） | 全部精确命中 |
| 面 3 DOM（7/7 项） | L821-829（findConversationRoot data-phase/active 优先/children≥2/排除 TEXTAREA·INPUT）、L891-892（null 降级）、L893-895+L977（children[0]/[1] 结构假设+undefined 检查）、L905-908/L986-997/L1043-1045（margin 双压+saved 恢复，width 显式压=UX-018）、L943-955（让位观察器）、L680-693（TK 令牌表恰 12 个 --dsw-alias-*）、L4304-4327（color-mix 派生区）、L879-890（ta_splitClose+dsh:split-claim）、L4387-4398（claim 监听让位）、L917-940+L2776（Resize/MutationObserver attributeFilter:['data-phase']×2）、L727-729（localStorage 键） | 全部精确命中 |
| 面 4 安装（6/6 项） | install.ps1 L36-88（PS 5.1 自研序列化器）、L123-134（布局特征检测）、L128-177（junction 新旧布局+拷贝回退）、L179-238（dependencies+bundles 幂等三分支）、L240-304（patch 幂等含 `[]` 空根/insert 块/无 insert 三形态）、L306-316+L318-339（预设同步+settings.yaml）；install.sh L47-57/L58-73/L75-186（node→python3→降级三档）/L188-205/L207-216+L218-232；cordis.patch.yml L10-12（dual-face 行）；package.json L17-29（dsh 字段） | 全部精确命中 |
| 面 5 预设（5/5 项） | preset.yml L1-2（name=小说写作工作流）；agent.cordis.yml L16-216（宿主包行区间）、L52/L56（!!js process.platform）、L81（!!js node:url）、L77-81（customSkillDirs+baseUrl）、L88-89（tool-novel 可选行无 disabled） | 全部精确命中 |
| 面 6 版本环境（3/3 项带行号） | package.json L41-47（peer 全 `*`）、L8-10（engines>=20）；ci.yml L21-34（依赖架构守卫）、L35-36/L45-47/L52-54（结构检查）、L70-89（mock 区）含 **L76-78 dsh-settings mock 仍导出 settingsNamespace——文档「活性缺陷」主张属实**、L71（schemastery 真包）；6.3/6.5 为非行号主张，与 EVD-080/081 勾稽一致 | 全部命中 |
| 宿主 checkout（4 处） | dsh-settings/lib/index.js **L610 导出面恰为 `SettingsConflictError, SettingsProvider( as default), redactSecrets`——无 settingsNamespace**（包版本 0.1.5-rc.2 经 package.json L4 核实）；dsh-api-gateway/lib/client.js **L1794-1796 `remoteServiceKey` 返回 `remote.${namespace}`**；dsh-client-modules/lib/index.js **L155 exports 解析仅 string/单层 conditional**（L156-166 实现）；dsh-client-modules/lib/client.js **L248 bundle 未经 __ModuleLoader__.load 注册声明的单 id 即 throw**（BC-03 单 factory 约束实证成立） | 全部精确命中 |
| 治理/smoke 勾稽（11 处） | risk-log L9=RISK-003 ✓；plan-tracker L129/L131/L133/L135/L137=BUG-003/004/005/REL-005/BUG-006 ✓、L139 COMPAT-001 在账（open）✓；execution-packets.json L5-40 执行包 ✓；EVD-076~082 全存在且内容相符（含 EVD-082 回归基线）✓；smoke.mjs L38-62（ctx mock：reflect.provide L57/effect L59）、L432/L436-438（__ModuleLoader__ 捕获断言）、L1477-1478（connection.api 计数=1+makeHostApi 接线断言）✓；apiHas 19 处匹配（1 定义+18 守卫）存在性 ✓ | 全部命中 |

**未抽查项（诚实披露）**：
- smoke.mjs 防护列其余行号（L1319/L1347/L1365/L1379/L1402/L1590-1668/L1663-1668/L6-8）——抽验 4 处均中，其余未逐处核（存在性经 smoke 203/0 基线 EVD-082 旁证）。
- 「44 处 apiHas/api.<domain> 调用点」的精确计数——采信 EVD-077 审查复核记录 + 本轮 apiHas 19 处存在性抽验，未重新全量计数 `api.<domain>`。
- EVD-077a/078a 长文逐字比对（存在性+主题已核）。
- 宿主 dsh-client-modules 其余源码是否存在其他多入口加载路径——未穷尽（以 L155+L248 双点实证为据；前瞻陈述已由文档自标 TP-1）。
- §1「约 15 项已单点适配」逐项重数：按表格「已适配」标注清点=15 项相符 ✓（此项已核）；但发现 **F10（P3）**：§1 称「1 项自有无依赖」、§3 统计行称「含 **2 项**自有」——六面表格中必要性标注为「自有」的仅 3.7 一项，两处计数不一致（另一候选 3.5 标「可选」非「自有」），建议 COMPAT-002 提取契约时统一口径。

## 6. 蓝军补充发现（Reviewer 视角切换记录 + 标准格式）

**视角切换序列（tech-review SKILL 第四步）**：框架从「设计为什么对」切换为「设计最可能在哪里失败」；三个核心假设被挑战——①「CI 探测能在用户受影响前发现宿主变更」②「脚本注释块与契约的对账可靠」③「断供用户能理解发生了什么」。依次以攻击者/最愤怒用户/维护者三角色推演「出问题后第一块多米诺骨牌」：

| ID | 攻击向量 | 影响评估 | 当前缓解 | 残余风险 | 建议增强 |
|---|---|---|---|---|---|
| **RB-01**（攻击者） | rc 版随时打 latest（6.5 实证），C1 探测轨为 scheduled——探测间隔内宿主升级仍先于探测到达用户 | 中：窗口期内断裂仍走「用户报障→事后修复」老路（正是四事故模式） | C3 运行时警告兜底 + apiHas 降级不白屏 + fixtures 快照显式审阅 | 中（频率未定） | COMPAT-007 验收要点补探测频率 SLO（如每日）+ 在 README 记录「探测窗口期」已知残余，避免「有探测=无窗口」错觉 |
| **RB-02**（维护者） | COMPAT-009 用 CI 正则对账 install 脚本注释块 ↔ host-contract——注释块格式被人为编辑后正则失配（false negative，静默失去对账） | 低~中：安装面契约看护退化为无守卫且无告警 | 强等价 diff 验收（脚本行为）+ 注释块零行为变化设计 | 低 | 注释块加固定标记行（如 `# host-contract:v1`）+ CI 对账同时断言标记存在；格式变更即红 |
| **RB-03**（最愤怒用户） | A1 执行后旧宿主用户升级插件：若 TP-4（宿主版本获取路径）不可得，D1 面板无法显示「宿主版本低于最低支持」，用户只见泛化「API 不可用」——「插件坏了」误判与报障转嫁（BC-04 恶化变体） | 中：断供体验依赖未验证前提 | BC-04 其余缓解不依赖 TP-4（用户决策/v1.0 边界/README/v0.5.x tag 回退）；apiHas 降级不崩溃 | 中（TP-4 未证） | 用**代理信号**替代版本号：旧宿主上 `remote.*` 全缺而 `connection.api` 在（makeHostApi 已检测）即可判定「低于最低支持」并出明确文案——不依赖 TP-4，建议写入 COMPAT-005 验收 |

## 7. 依赖方向分析（维度 3/4 支撑）

- 声明方向：`产品代码（UI/业务/安装）→ 宿主边界层（host-boundary.js / client region / install 注释块 / detectHostCapabilities）→ lib/host-contract.mjs（纯数据声明）→〔镜像对照〕宿主实际表面`；测试（smoke/CI）→ contract + 适配导出（只进不出）。
- **无环证明（逐边核验）**：host-contract 纯数据零 import（无出边）；host-boundary（服务端 ESM）import contract 取常量，不 import 产品代码；client.js 为 `__ModuleLoader__` 脚本**非 ESM 不能 import**——region 常量与契约同步改经 smoke 断言（设计已识别该约束并给出同步机制 ✓，但一致性断言未显式入 COMPAT-002/003 验收 → **F8，P3**）；install 脚本无 import 能力——注释块+CI 正则对账替代（RB-02 指出其脆弱性）；detectHostCapabilities 消费 contract、被 D1/D2/CI 消费，不反向依赖 UI。client.js 内部：UI 组件 → region facade → 常量，单向 ✓。
- 三处单点迁移：makeHostApi（L531-633）/makeSessionsHookReactive（L1195-1259）→ region 纯搬运（BC-02：保持粒度不重写）；install 双通道（ps1 L123-346/sh L47-232 实测区间与文档相符）→ 注释块零行为变化 + 强等价 diff 验收。路径具体、可回滚（各轴附回滚段）✓。

## 8. 缺陷与非阻断备注清单

| ID | 级别 | 缺陷 | 建议 | 处置归属 |
|---|---|---|---|---|
| F1 | **P2** | ADR §7 引用「DEC-080 红线」——decision-log 无 DEC-080（仅 DEC-001~024），失实引用将随 ADR 入册污染决策记录 | ADR 提请用户确认/入册前 MUST 修正（改口径见 F2） | Architect/Coordinator 文本修正（非设计变更，无需设计复审；修正动作入 evidence） |
| F2 | **P2** | 头部+§7 背景「DEC-021 兼容红线」——DEC-021 实为主题自适应原则；红线无独立 DEC 条目（仅 DEC-013①/DEC-019 理由栏文字）；误指源自治理层（DEC-024/执行包同源） | 文档两处改为「兼容红线（零宿主源码改动——DEC-013/DEC-019 既有口径）」；ADR 入册落新 DEC 时补澄清性决策条目修复治理层同源误指 | 同上 + Coordinator 治理侧 |
| F3 | P3 | detectHostCapabilities（§5 第五组件）无显式 ≤3 句职责定义 | COMPAT-004 实现时补（建议措辞见 §3-维度3） | COMPAT-004 |
| F4 | P3 | host-contract.mjs 机读 schema 样例未给出 | COMPAT-002 交付一条目样例过 review | COMPAT-002 |
| F5 | P3 | mock 漂移修正自称「零新设施、立即可做、第一优先」却绑入依赖 COMPAT-002 的 COMPAT-003（时序矛盾） | 拆为立即可做独立 hotfix（对齐 ci.yml L76-78 mock 导出面），与 fixtures 生成解耦 | Coordinator 入账时调整 |
| F6 | P3 | BC-04 缓解「面板显示宿主版本低于最低支持」依赖未证实 TP-4，未交叉标注 | BC-04 补注「依赖 TP-4」+ 采纳 RB-03 代理信号方案 | COMPAT-005 |
| F7 | P3 | apply 期探测性能预算未量化；apply 期/面板期探测项集划分未显式 | COMPAT-004 验收补「apply 期探测项全同步快速、无网络/布局等待」 | COMPAT-004 |
| F8 | P3 | region 常量 ↔ host-contract 一致性断言（轴②已设计）未显式列入 COMPAT-002/003 验收要点 | 验收要点补「region 常量 ⊆ contract 且逐项一致（smoke 断言）」 | COMPAT-002/003 |
| F9 | P3 | 事实源清单引 EVD-076~081，遗漏同日 EVD-082（COMPAT-001 回归基线——文档「smoke 203」口径的直接依据） | 文档事实源行补 EVD-082 | 文本修正 |
| F10 | P3 | §1「1 项自有」与 §3「2 项自有」计数不一致（表格实测仅 3.7 一项标自有） | COMPAT-002 提取时统一口径 | COMPAT-002 |

## 9. 终态结论

**APPROVED_WITH_NOTES（unresolved_blockers = 0）**

- 设计实质通过全部硬门槛（6/6）与六维度审查（6/6 PASS）：六面 47 项清单五要素齐全且行号引用经 61 处抽核零失实；四轴各 3 候选+先定标准后取舍+风险回滚齐备；蓝军 5 条真实非稻草；边界层依赖方向单向无环、三处单点迁移路径具体；实现任务清单可执行且 COMPAT-006 用户决策点设置与 DEC-024 边界自洽；无违反零宿主源码改动红线的提议；无 P-08 造轮子违规；推测全部显式标注（TP-1~5）。
- 2 条 P2 均为**决策 ID 引用失实**（编辑层，非设计缺陷，不改变任何设计决策正确性）：**MUST 在 ADR 提请用户确认/入册前修正**——该修正为文本编辑，无需设计复审；建议 Coordinator 将 F1/F2/F9/F10 一并转 Architect/快速通道执行，F5 在实现任务入账时调整，其余 P3 归对应 COMPAT 任务。
- 本报告按 DEC-024 授权路径构成「分析经 Design Reviewer 审查通过」要件；实现任务清单（COMPAT-002~009，经 F5 调整后）视为已获推进授权，可入账执行。

*审查边界声明：本审查为只读审查——未修改分析文档、产品代码与 .governance/ 记录；未抽查项已于 §5 诚实披露；宿主 checkout 核对全程只读。*
