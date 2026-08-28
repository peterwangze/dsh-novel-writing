# dsh-novel-writing

本项目使用 `software-project-governance` workflow 管理项目治理。

## 项目配置

- **Profile**: standard — 项目已有 CI + 发布实践（11 commits / 3 tags / CHANGELOG / ci.yml），standard 的证据与 Gate 强度与之匹配
- **触发模式**: always-on
- **操作权限模式**: maximum-autonomy
- **工作流版本**: 0.75.0
- **当前阶段**: development（开发实现，6/11）
- **接入方式**: 中途接入（2026-08-22，用户确认阶段=开发）
- **项目目标**: DSH（DeepSeek Harness）自动化小说写作发布流水线插件——把 claude-writing-workflow 的端到端创作质量体系迁移为 agent 预设，用宿主插件补齐项目管理、可视化工作台、多平台发布配置与数据闭环；门禁从「靠 AI 自觉」升级为「代码强制」

## Onboarding 声明（中途接入）

- **前置阶段 Gate**: G1~G4 全部标记为 `passed-on-entry`（接入前已完成，不补齐全部细节）
- **当前阶段 Gate**: G5 `pending`
- **已补齐的前置阶段关键决策**: DEC-002 ~ DEC-006（立项/调研/选型/基础设施/架构各 1 条，见 decision-log，标注「接入补录」）
- **阶段判定依据**: resolve_entry 场景推断为「发布 (9)」，用户调整为「开发 (6)」——项目仍以功能迭代为主（DEC-001）

## Gate 状态跟踪

| Gate | 阶段转换 | 状态 | 通过日期 | 关键证据 |
| --- | --- | --- | --- | --- |
| G1 | → 调研 | passed-on-entry | 2026-08-22 | docs/RESEARCH.md（市场/源工作流/DSH 生态三路调研） |
| G2 | → 技术选型 | passed-on-entry | 2026-08-22 | Node.js ≥20 ESM + DSH 插件体系（cordis/schemastery peerDeps） |
| G3 | → 环境搭建 | passed-on-entry | 2026-08-22 | install.ps1 / install.sh 双通道安装 + .github/workflows/ci.yml |
| G4 | → 架构设计 | passed-on-entry | 2026-08-22 | docs/DESIGN.md（novel-writing 服务 / HTTP API / 预设同步 / 工作台） |
| G5 | → 开发实现 | passed-with-conditions | 2026-08-22 | EVD-007（条件：非功能对应表未表格化/接口字段级契约不全/DESIGN roadmap 待同步——DOC-001 跟踪） |
| G6 | → 测试 | pending | | |
| G7 | → 防护网与CI/CD | pending | | |
| G8 | → 版本发布 | pending | | |
| G9 | → 运营 | pending | | |
| G10 | → 维护 | pending | | |
| G11 | → 下一轮 | pending | | |

## 项目总览

| 项目 | 当前阶段 | 总任务数 | 已完成 | 阻塞中 | 关键风险数 | 最近 Gate 结论 | 最近复盘日期 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dsh-novel-writing | development (6/11) | 25 | 19 | 0 | 2 | G5 passed-with-conditions | — |

## 当前活跃事项

### 优先级一览

| 优先级 | ID | 事项 | 依赖 | 目标版本 | 闭环路径 | 状态 |
|--------|----|------|------|---------|---------|------|
| **P1** | ONBOARD-001 | 治理接入与基线记录：.governance 四件套 + AGENTS.md bootstrap + git hooks + 会话快照（详情见 EVD-001） | — | v0.2.2 | closed | ✅ 完成 (2026-08-22) |
| **P1** | DEV-001 | 明确 v0.3.0 版本范围并任务入账：用户确认范围 → 版本路线图 v0.3.0 行 + 拆解任务 | — | v0.3.0 | closed | ✅ 完成 (2026-08-22) |
| **P1** | REL-001 | CHANGELOG [0.2.2] 补录：tag 已发布但变更未入账（发布一致性缺口），从 ef5c073 提炼补写 | — | v0.3.0 | closed | ✅ 完成 (2026-08-22) |
| **P1** | QUAL-001 | RISK-001 CI 观察收尾：核验最近 3 次 CI 运行结果（ci.yml 首跑修复 fdf4edd 后），产出观察结论并更新风险状态 | RISK-001 | v0.3.0 | closed | ✅ 完成 (2026-08-22) |
| **P2** | REL-002 | 发布一致性自检：建立 tag↔CHANGELOG↔路线图三方核对（脚本或 CI 检查项），防再发版本漏账（产品代码，Developer+Code Reviewer） | REL-001✅ | v0.3.0 | open | ⏳ 待执行 |
| **P2** | GATE-005 | G5 开发实现阶段 Gate 自评：对照 stage-gates.md G5 检查项逐项评估并显式声明结论 | — | v0.3.0 | closed | ✅ 完成 (2026-08-22) |
| **P2** | DOC-001 | G5 条件关闭：设计文档补强——非功能需求对应表表格化 + 接口字段级契约补全 + DESIGN.md Roadmap 与实际版本演进同步（v0.2 实际=审计修复线；v0.3.0 用户确认=发布卫生线 DEC-008） | GATE-005 | v0.3.0 | open | ⏳ 待执行 |
| **P2** | SYSGAP-001 | 向插件上游报告 check-governance root_divergence 误报（Check 28c 跨根期望源 / Check 18c·18d 活跃任务误解析），issue 链接回 RISK-002 | RISK-002 | v0.3.0 | open | ⏳ 待执行 |
| **P1** | UX-001 | 新会话初始窗口工作台入口（预设零感知定位修复）：blank/hero 状态 conversation.view 与 composer.dock 均不渲染 → 入口条迁移至 conversation.input.dock（hero/active 均渲染），点击 ▶ 开始/继续工作流自动按需挂载小说预设（DEC-009） | — | v0.3.0 | closed | ✅ 完成 (2026-08-22) |
| **P2** | CLEAN-001 | UX-001 评审卫生项收尾（Code Reviewer 建议 A-D）：守卫式 hook 调用改无条件、TTL 渲染期 store 写移入 effect、launch 加 busy/防连点、StudioView L833/L844 陈旧注释更新 | UX-001 | v0.3.0 | closed | ✅ 完成 (2026-08-22) |
| **P1** | UX-002 | 工作台入口收敛（用户反馈 UX-001 整行横幅喧宾夺主）：删除 input.dock 常驻工作台行（仅留 pendingLaunch 瞬时兜底条），常驻入口改侧栏「📖 小说」+ 浮层面板（书目选择/开始继续/新建即启动，经 pendingLaunch 通道注入；DEC-010）| UX-001, CLEAN-001 | v0.3.0 | closed | ✅ 完成 (2026-08-22) |
| **P2** | CLEAN-002 | UX-002 遗留项：①pendingLaunch 兜底条「小说已创建未启动」弱提示/补发（评审 S1）——✅ 完成 2026-08-23（launchHint + createdNew + W1 清 hint 全覆盖，EVD-015）；②shell.overlay 面板实机浏览器验证——⛔ ②被 UX-006 取代（2026-08-28）：原浮层面板/HUD 面已随工作台重构整体退役，实机验证面转入 CLEAN-004 | UX-002 | v0.3.0 | closed | ✅ ①完成 · ②被取代 (2026-08-28) |
| **P2** | GOV-001 | 项目原则入册：12 条（P-01 事实驱动/P-02 全面分析/P-03 回归意识/P-04 测试看护/P-05 泛化性/P-06 质量优先/P-07 安全数据 + C-01 可扩展/C-02 防腐化/C-03 职责单一/C-04 无冗余/C-05 commit 原子）写入 .governance/project-principles.md（权威源）+ AGENTS.md 项目级节（会话强制注入，Bootstrap 段不动）；DEC-011 | — | v0.3.0 | closed | ✅ 完成 (2026-08-22) |
| **P2** | GOV-002 | 原则追加 P-08 禁止自造轮子（用户直接要求）：有开源参考与免费资源优先使用，严禁自己造轮子（时间/token 浪费）；权威源 + AGENTS.md 注入面 + Code Review 核对项；DEC-016 | — | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-022) |
| **P2** | GOV-003 | 原则追加 P-09 禁止偷懒/偷工减料（用户直接要求）：一切偷懒与偷工减料视为失败——规格逐条勾稽/调研真做/验证独立抽查/交付齐备/偏差明说/收工前全量核对；权威源 + AGENTS.md 注入面；DEC-018 | — | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-024) |
| **P1** | UX-003 | 浮层面板首次进入支持设置 workspace（用户实机验证反馈：快速面板仅显示「小说工作区为空」，无根目录设置入口——WorkspaceRootEditor 仅在工作台侧栏，初始窗口不可达）：面板内接入工作区根目录行（复用 WorkspaceRootEditor/api.settings.update）+ 空态提示指引 | UX-002 | v0.3.0 | closed | ✅ 完成 (2026-08-23) |
| **P1** | UX-004 | 面板空态行动入口可见性（用户实机反馈「看不清怎么选择工作区或者创建新小说」）| UX-003 | v0.3.0 | closed | ⛔ 被 UX-005 取代（2026-08-23）：统一入口方案落地后面板退位纯状态 HUD，未提交改动已回退（git checkout lib/client.js 至 b31e367），方向词修正同废 |
| **P1** | UX-005 | 统一入口：侧栏「📖 小说工作台」→ 选择/新建工作区（workspace.list + host.pickDirectory + host.createDirectory + workspace.create；无已配置工作区则强制新建）→ api.sessions.create(workspaceId) → agentPresets.select(novel-writing) → session.prompt(开始指令) → 打开会话；无视图切换 API → 明确提醒用户点「小说」标签进工作台；浮层面板退位纯状态 HUD（去启动/新建/工作区编辑）；workspaceRoot 同步为选定工作区目录 | UX-002, UX-003 | v0.3.0 | closed | ✅ 完成 (2026-08-23) |
| **P2** | CLEAN-003 | UX-005 评审非阻断备注：createdId 与 workspaceId 成对存储（切换选中工作区即清，避免失败重试时复用旧会话）；及统一入口实机验证后按需的小修 | UX-005 | v0.3.0 | open | ⏳ 待执行 |
| **P1** | INST-001 | 本机 DSH 安装 dsh-novel-writing（离线通道）：junction 接入 profiles\node_modules + cordis.patch.yml 插行 + agent 预设同步（29 SKILL/16 agents）+ settings.yaml 默认节；install.ps1 在本机 PS 5.1 下因 UTF-8 无 BOM 解析失败，经临时 BOM 副本执行原脚本内容（仓库零改动） | — | v0.3.0 | closed | ✅ 完成 (2026-08-23) |
| **P2** | BUG-001 | install.ps1 离线执行缺陷：UTF-8 无 BOM 在 Windows PowerShell 5.1 下按 ANSI 解码，中文注释/字符串乱码致 ParserError（宣称支持 5.1+ 但离线 .ps1 通道不可用；在线 iex 通道不受影响）；修复 = 文件补 BOM + 双通道回归验证；版本归属待用户确认（范围变更） | INST-001 | v0.3.0 | closed | ✅ 完成 (2026-08-23，DEC-012 用户确认纳入 v0.3.0) |
| **P1** | BUG-002 | UX-005 实机验证阻断缺陷：lib/tools.js 未声明 inject 即访问 ctx.tools（Cordis 强制：属性访问须先声明），预设挂载失败「cannot get property "tools" without inject」；修复 = 补 `export const inject = ['tools']`（范本：包内 index.js L31 / 官方 dsh-tool-todo L12）+ 清除第二个潜伏阻断（latestAiPath enum 去 null，真 dsh-tools defineTool 拒绝）+ smoke 增挂载契约断言堵防护网缺口（60→67 项） | UX-005 | v0.3.0 | closed | ✅ 完成 (2026-08-23，EVD-019；评审 APPROVED-WITH-NOTES——N1 CI 恒等 mock 无 schema 校验建议后补，N2 注释措辞) |
| **P1** | UX-006 | 工作台重构（dsh-worktable 思路，DEC-013 五项定案）：侧栏「小说工作台」抽屉（书目卡片+绑定状态点+工作区管理）+ 挤法分栏工作区（左导航可折叠｜中内容页签｜右官方对话窗，分隔线可拖+宽度记忆+⇄换边）+ 小说↔会话 1:1 绑定（settings ns 存储，sessions.open 切换，sessions.list 订阅状态镜像）+ 视觉全量 --dsw-alias-* 令牌化；退役 conversation.view 标签页 / input.dock LaunchBar / HUD（DEC-013①⑤）；宿主 Config 增 bindings 字段 + overview 携带；smoke/README/CHANGELOG 同步 | UX-005 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-020；评审 APPROVED-WITH-NOTES——N6 已修·N4 注释已补·N1/N3/N5/N7 非阻断备注；实机验证转 CLEAN-004) |
| **P2** | CLEAN-004 | UX-006/UX-007 实机浏览器验证清单（重启 DSH 后执行）：①控制台全链路——侧栏标题行开/关（反选）、搜索滤小说+找 session、＋新建表单（创建并开始/仅创建）、卡片状态光效/数据卡片、▶打开=切绑定会话+进分栏（**口径确认**：卡片打开是否要自动进分栏，或仅切会话）、🔗绑定/失效重绑、➤继续工作流；②分栏——分隔线拖拽+宽度记忆（dsh.novel.split.v1）、⇄换边、Esc/✕/反选、脏稿守卫；③降级——sessions 缺席/挤法失败/控制台几何无会话根；④与 dsh-worktable 共存互斥；⑤评审备注处置评估：A-1 抽 launcher.createAndStart 收口三份拷贝、B-1 对话框 Esc 让位、C-1 守卫式 hook 注释/stub、C-2 selector 重建噪音、C-3 聚焦选择器单引号、F-1/F-2/F-3 smoke 断言收紧（z-index 类归属/null 白名单/卡片路径树断言）、H-1 实机行为面清单、H-2 未用 i18n 键清理 | UX-006, UX-007 | v0.4.0 | open | ⏳ 待执行（用户重启后） |
| **P1** | UX-007 | 工作台入口与工作台界面重构（用户两次实机反馈修正 DEC-014→DEC-015）：侧栏「小说工作台」区块=纯主入口（标题+书目卡片列表，**无 🔍⚙＋ 按钮组**），点击进入**完整工作台界面**（shell.overlay 全屏控制台，**不涵盖对话框**——仅小说工作区创建、小说管理：创建/关键词找 session/小说状态/数据卡片），管理全部界面化卡片按钮；卡片视觉按 dsh-worktable 控制室卡片（状态光效/数据卡片）；点击卡片=切绑定会话并关控制台；冒烟/README/CHANGELOG 同步 | UX-006 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-021；评审 APPROVED-WITH-NOTES——G-1 已修，A-1/F-1~F-3/H-2 归 CLEAN-004/发布卫生；实机验证转 CLEAN-004) |
| **P1** | UX-008 | 控制台 UI 迭代（用户实机批注 5 点）：①切换/新建工作区按钮移近工作区路径、标题图标加大；②搜索栏改浏览器引擎风格（大药丸输入框+🔍图标+大占位字+清晰边框）**移到底部居中**；③「新建小说」改为卡片网格末尾的**＋ 虚线磁贴**（与卡片同尺寸）；④移除卡片「▶ 打开」按钮（卡片点击即打开，已确认口径），卡片布局更宽松（3 列 9 宫格）；⑤排序（默认/手动拖拽）+ 仅显示前 8 + 展开/折叠。样式/拖拽参照 dsh-worktable（dashed 磁贴/管理拖拽/排序），冒烟/README/CHANGELOG 同步 | UX-007 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-023；探针 6 项全绿；折叠/拖拽实机场景转 CLEAN-004) |
| **P1** | UX-009 | 控制台视觉精修（实机目检诊断——建立视觉闭环：read_image 实测可用+无头截图目检+探针量化）：①工作区切换钮**紧邻路径**（删除 headflex 间隔）、标题 16px+📖18px、路径 13px、无工作区行动文案；②网格 minmax(320px,1fr) gap16 3 列均分、卡与＋磁贴统一 min-height 200px、卡 padding16/radius14/字号梯度；③搜索药丸 48px/min(640px)/999px/🔍16/占位15/focus 3px 光环/投影；④卡片浅色主题洗白修复（border l1→l2 + 投影）；排序 pill 12px；smoke 88→89；探针 8 项测量全绿 + 目检通过 | UX-008 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-025；目检+探针双验收；多书等高场景转 CLEAN-004) |
| **P1** | UX-010 | 控制台四调整（用户批注）：①退出 ✕ 显眼化（28×28 带边框按钮/hover accent）；②排序 pill 字体 12→13px；③卡片字体调大一档（16/13/13/12）、卡与磁贴 200→180px、网格 gap 16→20px；④行为——点击其他工作区 session 自动退出工作台界面（sessions.current 变化联动关闭，三重守卫：首次快照只记基准/prev null 不关/pluginOpened 一次性豁免集防降级态误关）；smoke 89→91；探针 8 项全绿含真鼠标行为断言 + 目检通过 | UX-009 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-026；探针行为断言真点击侧栏会话→控制台关闭+current 恢复；修复 sessions 快照异步免关缺陷) |
| **P1** | UX-011 | 两级工作台架构（用户截图批注）：①标题改名——侧栏入口/管理控制台标题改「小说管理工作台」，打开小说后的分栏标题改「小说创作工作台 ·《书名》」；②管理台职责收敛=工作区创建/切换 + 小说创建（＋磁贴）/删除（新卡片 🗑 删除钮 + 宿主 novel-delete 接口：id 校验/路径穿越防护/仅删项目目录/前确认风控）+ 卡片化呈现；③创作台=既有分栏（内容/状态/数据）不改职责；smoke/README/CHANGELOG 同步 | UX-010 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-027；本地 HTTP E2E 17/17 + smoke 99/0 + 目检通过；novel-delete 宿主路由需重启 DSH 生效——实机验证转 CLEAN-004) |

> **说明**：本表为 canonical 7 列优先级一览（`task-priority-analysis` 权威解析源）；任务详情（输入/输出/验收标准/审查状态）由 evidence-log / decision-log / risk-log 关联承载。RISK-002 为 cross-entity 引用（上下文，不阻塞执行）。

## 版本规划

### 版本路线图

| 版本 | 状态 | 预计日期 | 核心范围 | 包含任务 | 关键交付物 |
| --- | --- | --- | --- | --- | --- |
| v0.1.0 | 已发布 | — | dsh-novel-writing 初始发布：预设迁移 + 安装通道 | —（接入补录，未入账） | git tag v0.1.0 |
| v0.1.1 | 已发布 | — | 工作台四项管理能力 | —（接入补录，未入账） | git tag v0.1.1 |
| v0.1.2 / v0.1.3 | 已发布 | — | 预设按需加载与自动保证 | —（接入补录，未入账） | git tag v0.1.2 / v0.1.3 |
| v0.2.0 | 已发布 | — | 双代理审计修复（8 宿主 P0 + 3 客户端 P0 + 17 P1） | —（接入补录，未入账） | git tag v0.2.0 |
| v0.2.1 | 已发布 | — | 审计 P1 收尾 + 仓库卫生 + 双通道安装验证 | —（接入补录，未入账） | git tag v0.2.1 |
| v0.2.2 | 已发布 | 2026-08-22 | 配置边界重构：业务配置归一工作台，设置页只留插件级开关 | REL-001（补录） | git tag v0.2.2 + CHANGELOG [0.2.2]（补录） |
| v0.3.0 | 进行中 | 待定 | 发布卫生 + 质量加固（DEC-008 + DEC-012 追加）：CHANGELOG 0.2.2 补录 / CI 观察收尾 / 发布一致性自检 / 初始窗口工作台入口（UX-001，DEC-009）/ install.ps1 BOM 修复（BUG-001） | REL-001, QUAL-001, REL-002, UX-001, UX-002, BUG-001 | — |
| v0.4.0 | 进行中 | 待定 | 工作台重构（DEC-013）：分栏工作区 + 小说绑定会话 + 侧栏抽屉 + 设计令牌迁移（UX-006） | UX-006, UX-007 | — |

### 版本里程碑

| 里程碑 | 目标版本 | 预计日期 | 状态 |
| --- | --- | --- | --- |
| 治理接入完成 | — | 2026-08-22 | 达成（ONBOARD-001） |
| v0.3.0 范围确认 | v0.3.0 | 2026-08-22 | 达成（DEV-001，DEC-008） |
| v0.3.0 发布 | v0.3.0 | 待定 | 未开始 |
| v0.4.0 范围确认 | v0.4.0 | 2026-08-28 | 达成（DEC-013，UX-006 入账） |
| v0.4.0 发布 | v0.4.0 | 待定 | 未开始 |

### 版本 Gate 检查项

- 发布前：范围一致性（CHANGELOG ↔ tag ↔ 路线图）+ 回滚方案存在 + 检查清单逐项 PASS
- 版本收尾：归档触发检测（archive.py migrate --auto --dry-run）

### 版本规划纪律

- 新任务先入账再动手（M7.5）；临时任务走变更控制流程
- 已发布版本只补录不重写；进行中版本范围变更须经用户确认（关键决策）

## 需求跟踪矩阵

| 需求ID | 描述 | 来源 | 优先级 | 关联任务 | 当前状态 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | 迁移源工作流为 agent 预设（Coordinator 人设 + 29 SKILL + 16 Agent 参考） | README 需求表 ① | P0 | —（v0.1.x 已交付） | 已完成 | agent-presets/novel-writing/ 存在性 + CI preset 校验 |
| REQ-002 | 小说管理与人机高价值互动（多书目、ask_user_question、请求队列） | README 需求表 ② | P0 | —（v0.1.1 已交付） | 已完成 | 工作台侧栏 + novel_requests 接单 |
| REQ-003 | 写作过程可视化 + 实时渲染（2s 轮询、文件树、HUD） | README 需求表 ③ | P0 | —（v0.1.x 已交付） | 已完成 | 工作台渲染 |
| REQ-004 | 章节编辑保存 + 优化建议（保存即跑门禁、机器审计） | README 需求表 ④ | P0 | —（v0.1.x 已交付） | 已完成 | 编辑器门禁拒绝路径 |
| REQ-005 | 多平台自动化配置发布 + 数据获取（三模式发布 + fetchCommand + 数据三级降级） | README 需求表 ⑤ | P0 | —（v0.2.x 已交付） | 已完成 | 发布页签配置 + 导出产物 |
| REQ-006 | 基于数据动态优化写作方向（信号检测 → 建议行动 → 四级调整需用户确认） | README 需求表 ⑥ | P0 | —（v0.2.x 已交付） | 已完成 | 数据信号→建议行动链路 |

> v0.1.x ~ v0.2.2 交付状态为接入补录（基于 git tag 与 README 声明），逐项验证方式待 GATE-005 / 后续任务复核。

## 变更控制

临时任务纳入机制：

1. **优先级判定**：P0（阻断交付/安全）/ P1（版本目标内）/ P2（改进项）
2. **版本适配**：判断归属当前进行中版本或下一版本
3. **冲突检查**：与现有任务/需求矩阵冲突 → 记录决策
4. **版本范围更新**：入账 plan-tracker + 更新版本路线图

快速通道（仅限治理记录）：仅修改 `.governance/**` 治理记录时 MAY 跳过 Agent Team spawn（M1.2）；产品代码变更 MUST 走 change-triage 四步入账门禁。

## 使用规则

- 所有 agent 必须复用同一份主计划。
- 已完成任务必须补齐证据。
- 发生偏差时必须更新风险或决策记录。
- 阶段切换前必须先检查 Gate。
