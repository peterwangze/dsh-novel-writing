# 调研报告（dsh-novel-writing 立项依据）

> 三路调研的结论汇总：① 中文/英文小说 AI 写作工作流市场；② 源工作流 claude-writing-workflow v4.2 深度分析；③ DSH 插件生态与机制。调研时间：2026-05。

---

## 一、市场调研：AI 小说写作工作流现状

### 1.1 三类玩家

| 类型 | 代表 | 特征 |
|---|---|---|
| 平台官方工具 | 阅文妙笔/作家助手、番茄作家助手、七猫、晋江 | 绑定自家平台；提供灵感/校对/数据看板；不提供跨平台与自动化发布 |
| 独立 AI 写作软件 | Novelcrafter、Sudowrite（Story Bible）、橙瓜码字、笔灵AI、秘塔写作猫 | 单机创作辅助（大纲/人设/续写/校对）；无网文平台数据闭环 |
| 开源 Agent 流水线 | claude-writing-workflow、novel-builder 类仓库、各类 "write-a-novel" prompt 集 | 以 prompt/skill 资产编排多角色协作；普遍缺 UI、缺持久状态、缺数据回流 |

### 1.2 平台发布与数据能力（关键结论）

- **13 个主流平台（番茄/起点/晋江/七猫/番茄海外/Webnovel/RoyalRoad/AO3/Wattpad/Tapas/KDP 等）均无官方公开写作/发布 API**。
- 现实自动化路径只有三种：浏览器自动化（Playwright 操作作家台，如 fanqie-publish、amazon-kdp-skill）；逆向内部接口（qi-re、FQWeb 等，高风险易碎）；HTML 爬虫（royalroad-api、ao3-api 等，多为只读）。
- **追读率/完读率/阅读深度是平台作家后台的内部指标**：无接口、无导出 → 只能「后台人工抄录 / 截图 OCR / 自建浏览器自动化」三级降级。
- 真正开放的发布例外：WordPress REST API、WriteFreely。
- 番茄口径已核实：7 日追读率（约 25% 安全线）与跟读率 ≠ 完读率——指标定义必须写进数据闭环，避免误判。

### 1.3 数据-写作闭环的行业做法

| 指标 | 常见阈值 | 行动 |
|---|---|---|
| 完读率低 | 10 万字 <10% | 重审前 3 章（黄金三章） |
| 章节流失 | 某章读完率 <30% | 章节诊断 + 重写 |
| 追读下降 | 连续 3 天 >10% | 最近 3 章节奏/爽点分析 |
| 收藏停滞 | 连续 7 天日增 <10 | 书名/简介/封面优化 |
| 收益下滑 | 连续 4 周 >20% | 止损决策（完结/停更/改向） |

设计含义：**数据通道按「官方 API（无）→ 浏览器自动化（高风险）→ 手动录入/CSV（保底）」三级降级**；观测周期半自动（作者每日粘贴/截图 → 插件解析 → 生成建议单），不追求无人值守抓取。

### 1.4 对本插件的 Gap 结论

现有工具没有一个同时具备：**Agent 编排的创作质量门禁 + 可视化实时工作台 + 多平台发布配置 + 数据驱动动态调整**。这四件事正是 dsh-novel-writing 的定位。

---

## 二、源工作流分析（claude-writing-workflow v4.2）

### 2.1 全貌

- **26 个 SKILL + 16 个专业 Agent（5 团队）**，覆盖：作品类型 → 平台调研 → 竞品分析 → 题材选择 → 作品确认 → 创作规划 → 大纲（三审）→ 章节细纲（三审）→ 正文（看护+四层看护流程）→ AI 合规分级 → 质量审查（6 Agent 并行）→ 上架发布 → 变现 → 数据监控 → 读者互动。
- **三层角色模型**：用户（决策者，AskUserQuestion 唯一通道）↔ Coordinator（唯一写 workflow-state 者）↔ Subagent×16（生产者：不交互/不改状态/不做决策/不互通）。
- **两阶段执行协议**：决策型阶段（方案→用户确认）与执行型阶段（执行→门禁→展示）；40 个交互检查点。
- **F1-F4 四级门禁 + 15 项正文硬门禁 + 9 维 100 分制**（=100 才通过，零容忍）；防放水机制（审查必须 ≥2 条含原文引用的具体发现）。
- **三层看护资产**：story-bible（不可变更事实/伏笔清单）→ context card（必写场景/禁止偏离项/结束状态）→ continuity-ledger（逐角色状态/承接点）；「场景覆盖率=100%、偏离度=0%」零容忍。
- **AI 合规 A/B/C 分级**：人类原创为主体；路径 B/C 阻断 release_allowed/monetization_allowed。
- **数据闭环触发表**（同 1.3）+ 止损框架。
- 项目文件结构：`novel-project/00-17` 编号目录 + `workflow-state.json`（增量更新）。

### 2.2 迁移资产清单（已全部迁移）

高价值平台无关资产（prompt 级）：三层角色模型与 Subagent 硬边界、两阶段执行协议与 40 检查点、F1-F4 门禁规则、15 硬门禁 + 9 维评分、大纲 18 步/细纲 12 步机械审查程序、防放水机制、A/B/C 合规路径与证据链、CCC 黄金三章与四平台写法适配、三层看护资产模板、情感签名与回报分级、Bible 修订流程、数据闭环触发表、合同陷阱 11 条与题材避坑、Agent 三层角色定位模板。

需适配的 Claude Code 机制（已替换为 DSH 等价物）：AskUserQuestion→`ask_user_question`；WebSearch→`web_search`；Agent 工具→`subagent`/`subagent_fork`（spawn/fork，continuable）；SessionStart Hook→预设 + 工作台；plugin 清单→DSH bundle + agent preset。

### 2.3 源工作流的已知限制（本插件的升级点）

| 源工作流限制 | dsh-novel-writing 对策 |
|---|---|
| 门禁依赖 LLM 自觉遵循 SKILL | 看护硬门禁**代码化**：`novel_chapter_write` 保存前强制场景覆盖率/禁止项检查，不通过即拒绝 |
| 数据依赖用户手动提供 | 数据入库 API + 工作台录入表单 + 信号自动检测 + 可配置 fetchCommand 适配器 |
| 无 UI，全部对话驱动 | 浏览器「小说工作台」：实时渲染、章节编辑保存、进度/门禁/数据/发布面板、请求队列 |
| 审查结论散落在报告文件 | `novel_review_submit` 结构化落盘（分数/发现/硬门禁）+ 工作台可视化 |
| 无法管理多部小说 | workspace 扫描 + 多书目管理 + 每书独立状态 |

---

## 三、DSH 插件生态调研

### 3.1 机制要点（0.1.0-rc.7 实测）

- `dsh plugin --profile <name> <args...>` 是 **pnpm 转发器**；安装后 `reconcilePlugins` 按「依赖是否声明 `dsh.bundle.patch`」维护 `dsh.profile.bundles` 层栈；**重启生效**。
- 插件来源支持：npm 包名 / GitHub 简写 `owner/repo#ref` / git+https / `file:`（内容寻址，更新需 remove+add）/ `link:`（符号链接，本地开发）。
- 模块解析双锚点：bundle 包先由 dsh 自身 node_modules 解析（in-box 包），再从 profile 目录解析；**第三方包的 `@deepseek-ai/*` 依赖由平坦 fallback `$DSH_HOME/profiles/node_modules`（dsh 全依赖闭包）解析**。
- 浏览器面（dual-face）：`dsh.client.platform/inject` + `exports["./client"]`；client 模块经 `/plugins/<id>/client.js` 下发；插件集变更需重启。
- agent preset 与插件是两个平面：preset 目录（agent.cordis.yml + preset.yml + skills/）由文件系统发现（shipped root + `$DSH_HOME/.agent-presets`），**插件包无法通过组合机制注册 preset** → 由安装脚本/宿主行同步到用户 preset 根是标准做法。

### 3.2 已踩过的两个陷阱（本设计的直接输入）

**陷阱一：依赖双闭包（thinking-level 插件 boot 失败）**
`@deepseek-ai/*` 声明为 `dependencies` 时，`dsh plugin add` 会让 pnpm 在 profile 内物化**第二份闭包副本**（与宿主 fallback 闭包并存）。两份 `dsh-settings`/`cordis` 实例的 Symbol/类身份错位（如 `settings/updated` 事件的 ns 比较永远为 false），叠加版本漂移即 boot 崩溃。
**对策**：`@deepseek-ai/*` 一律 `peerDependencies`（且 `autoInstallPeers:false` 不安装 peers），解析自然落到宿主闭包——同一实例；CI 加「依赖架构守卫」静态断言。

**陷阱二：宿主版本漂移（router 插件失效）**
插件按某个 rc 的 API 写死，DSH 升级后完全失效且无人发现。
**对策**：① 只使用稳定 seam（settings/Service/defineTool/webServer）+ `ctx.get` 可选探测 + 缺席优雅降级（如 tools 行在 `novel-writing` 服务缺席时静默注册 0 工具）；② `peerDependencies: "*"` 不与宿主版本锁死；③ README 兼容矩阵（实测版本 vs 理论范围）；④ 验证管线（见 3.3）在**隔离 profile** 里做全量 boot 验证，随版本更新重跑。

**陷阱三（本会话亲历）：动态探针沙箱违规导致宿主 boot 崩溃**
动态 Cordis 插件的沙箱 ctx 只暴露 `ctx.get/on/provide`、inject 声明的服务、`ctx.tools.register` 与 timer；访问 `ctx.logger` 等框架内部属性会被 Guard 拒绝并可能fatal。
**对策**：任何探针/验证代码不得触碰沙箱未暴露的属性；验证一律走「测试脚本 + 隔离 profile boot」这类受控通道，而不是把验证逻辑常驻进会被重启恢复的动态插件。

### 3.3 验证管线（本仓库落地）

| 层级 | 命令 | 覆盖 |
|---|---|---|
| 语法 | `node --check lib/*.js` | 三方模块可解析 |
| 依赖架构 | CI 依赖守卫 | `@deepseek-ai/*` 只允许出现在 peerDependencies |
| 预设挂载级 | `node test/validate-preset.mjs` | loader 同源 YAML 解析 + 逐行模块解析（从 profile baseUrl）+ 技能 frontmatter |
| 宿主逻辑 | `node test/smoke.mjs` | 24 项断言：状态增量/门禁/审计/请求/发布/数据信号（mock ctx） |
| 启动级 | 隔离 profile boot（见 README「验证」节） | 全新 DSH_HOME → `dsh plugin add` → `dsh web` → `/novel-writing/api/overview` 200 |
| 运行级 | 主实例 API 探活 | 宿主行真实挂载、路由可答 |

---

## 四、结论：产品定位

**dsh-novel-writing = 源工作流的质量体系（prompt 资产全量迁移 + 门禁代码化） × DSH 的插件/预设双平面 × 可视化工作台 × 三级降级的发布与数据通道。**

六个能力需求（用户原始需求）的落点：

1. 迁移源工作流为 agent 预设 → `agent-presets/novel-writing/`（29 SKILL + 16 Agent 参考 + Coordinator persona）
2. 小说管理与人与 AI 高价值互动 → workspace 管理 + `novel_*` 工具集 + 工作台请求队列（优化/审查/发布/数据/人工）
3. 写作过程可视化与实时渲染 → conversation.view「小说」工作台 + 2s 轮询 + 章节阅读渲染 + HUD 浮层
4. 章节编辑保存与优化建议 → 工作台编辑器（门禁化保存）+ 机器审计项（字数/段落/钩子/AI 痕迹）+ optimize 请求闭环
5. 多平台自动化配置发布与数据获取 → 平台配置（export/command/manual 三模式 + fetchCommand）+ 发布清单 + 数据三级降级
6. 基于数据动态优化写作方向 → `data-driven-optimization` SKILL + 信号检测 + 调整优先级（章内→细纲→大纲→题材，均需用户确认）
