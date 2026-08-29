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
| dsh-novel-writing | development (6/11) | 47 | 42 | 0 | 2 | G5 passed-with-conditions | — |

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
| **P1** | UX-012 | 新建小说弹窗与创建链调整（用户批注）：①弹窗**居中放大**（模态遮罩+居中卡片 min(520px)，替换右侧悬浮面板；Esc/遮罩关闭）；②表单**仅目录名**（书名字段去除——novel-create 仅传 {name}，宿主 title 缺省=name 查证确认，卡片名=目录名）；③按钮**仅「创建」/「取消」**（删自动启动链——创建后所有动作在创作工作台进行；控制台 notice 指引）；④创作工作台（SplitWorkspace）标题栏补**▶ 开始/继续工作流**（accent 实底，三态提示：降级/未绑定弹绑定/失效重绑，复用 promptLaunch，busy 防连点）；i18n 失用键清理；smoke 99→101 | UX-011 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-028；探针 16/17（blocked=宿主旧包 novel-delete 405，待重启清 probe 样本）；修复冒泡自关缺陷；目检通过) |
| **P1** | UX-013 | 创建链与抽屉调整（用户批注 6 点）：①工作区管理去会话创建（WorkspaceDialog 仅切换/创建工作区，删「在此工作区创建小说会话」链+done 态+createdId 幂等）；②首次点卡片自动创建会话并关联（root 匹配 workspaceId 或 cwd 回退 → sessions.create → 预设挂载（失败即停提示）→ bindSession → open，busy 防连点，**无 prompt**）；③后续点击进入已关联会话；④🔗 会话管理=新建关联 or 关联既有（BindDialog 既有能力核验通过未补码）；⑤卡片移除 ➤ 启动工作流按钮（启动已下放创作台标题栏；promptLaunch 保留）；⑥侧栏抽屉对齐（width:100% 修 footerActions 自缩 + 卡左缘=工作区行左缘 0px 实测）+ 调宽 256px + 字体（13px 标题/14px 卡/12.5px sub）+ 层次（sep l2/gap 6）；顺带修复删除链绑定键清理失效（deep-merge 无法键级删 → settings.mutate unset 主路径）；smoke 101→107 | UX-012 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-029；探针 26/27（唯一未过=探针自身基线自证项）；自动链 202ms 实测+无 prompt；mutate 修复实机两验；目检通过；3 个探针空白测试会话待用户清理) |
| **P1** | UX-014 | 创作工作台精修（用户批注 8 点）：①二级台**去掉工作区行+书目列表**（左窗仅文件树）；②标题显示书名（保持核验）；③文件树**目录默认折叠**（collectDirPaths+collapseInitRef，用户展开态不被轮询重置）；④**真 Bug 修复**——⇄ 切换布局会退出（根因：CSSOM 分数像素归一化 vs 引擎原串比较 → sameMargin 数值容差 <0.5px + syncAnchor 重挂让位观察器（N1 落实））；⑤**真 Bug 修复**——拖边线退出（同根因）；⑨截断修复——applyMargin 不再写 marginTop（对话窗保持整高，composer 完全可见实测）；⑥✕/⇄ 28×28 醒目；⑦抽屉卡片**直达创作台**（openCtl 单一事实源收口 NvConsole.openBook/抽屉/DrawerBookCard；发现并修复第二竞态：管理台令牌吞掉分栏豁免 → novelSplit.pluginOpenTokens 独立集）；⑧点其他 session 退出（splitCurrent 联动+脏稿守卫）；smoke 107→113 | UX-013 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-030；探针 28/29（唯一未过=采样元素取错，同断言另轮通过）+10/11（宿主UI残差）；根因实测取证（CSSOM 表/0.6875px 案例/marginTop 30px 取证）；目检通过；新增 5 个探针空白会话待用户清理) |
| **P1** | UX-015 | 创作工作台细节（用户批注 5 点）：①标题栏**加高**（38px）+ 内部图标文字放大（标题 14px/⇄✕ 32×32/徽标 13px）；②章节列表**显示章节名**（meta 无 name 查证 → 宿主 chapterList/readChapter 增量 name 字段：meta 优先进化留口 + 解析首行 `# ` 剥「第N章」前缀，缓存复用 wordsCache 键策略零额外 IO）；③章节列**默认 160px + 可拖宽 120-360 持久化**（dsh.novel.split.v1 增 chapterW；拖拽不触 viewArea 边距实测安全）；④抽屉卡片小一档（13/12px/6/8/gap4，管理台卡片零改动保层级）；⑤聊天正常回归确认；smoke 113→122 | UX-014 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-031；探针 24/26（2 项=宿主旧包无 name 字段，**需重启 DSH 生效**——负回退已实机验证）；拖宽 200px 持久化实测；目检通过) |
| **P1** | UX-016 | 小窗口聊天截断修复（用户实测「首次进入还是截断」；Coordinator 1078×593 复现取证：引擎为保中窗最小 420 把聊天压至 ~223px，hero 折行+输入框裁切）：chat 默认=clamp(round(colW×0.45), 300, max(300, colW−128−320))、chat 最小 300、左窗最小 128、中窗最小 320（共享常量收口，原 0.34 魔法数清除）；存档超界自动收敛；**实测**：1078×593→chatW 350（hero 单行/输入框 right≤1078/composer 可见）、1400×900→504；拖宽/⇄/拖拽退出回归不劣化；smoke 122→123 | UX-015 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-032；探针 24/25（唯一未过=探针会话行采样 CSS hash 未命中，产品无关）；双尺寸实测+目检通过；注：规范初稿「默认 390/480 封顶」为计划性表述，实际公式以本行+代码为准) |
| **P1** | UX-017 | 聊天宽度再调+版本徽标（用户侧仍见窄聊天的定案手段）：①CHAT_DEFAULT_RATIO 0.45→0.5 / CHAT_MIN 300→320 / LEFT_MIN 128→120 / CENTER_MIN 320→300（cap=colW−420 共享常量五处同步；**实测**：1078×593→chatW 378（hero 底部行 4 控件全可见）、1400×900→560；存档 300→320/900→378 收敛）②CLIENT_TAG='v4' 可见徽标（控制台头部+分栏标题栏，判定浏览器包版本；分栏标题栏窄栏下徽标视觉被裁——判定以控制台头部为准）；smoke 123→124 | UX-016 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-033；探针 23/23 全绿+双尺寸目检；发现 probe 环境旧存档 270（收敛验证→新包 320+）；用户浏览器包版本以 v4 徽标定案——徽标为诊断用，确认修复后移除（用户指示不交付）) |
| **P1** | UX-018 | 聊天窗渲染异常真修复（用户重述：「不是截断，是右边对话框渲染异常」「一半首次进入会出现，刷新就好了」→ 根因闭合：**margin 挤压不改 content-box 尺寸→宿主无尺寸事件不重排**——先全宽挂载后挤压=hero 停在旧坐标=右缘碎片；先挤压后挂载=正常；另探针抓住第二缺陷：sessions.open 换目标后宿主重渲染**替换 viewArea 节点**、旧 syncAnchor 卡在旧锚点挤不到活动视图）：修复=**margin+width 双压**（width=chatWpx，open/applyMargin/syncAnchor/close 记录-恢复 savedWidth）+ syncAnchor 重锚定与 open 同口径（ok 根即锚）且快路径以 root/header/viewArea 三元同恒为门槛；smoke 124→128；探针 **47/47**（A 先挂载后挤压=378 完整 / B 先挤压后挂载=378 完整 / E 存档 270→320 完整 / C 关闭 width+margin 全复原往返 / D 拖宽⇄不退出）；目检通过 | UX-017 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-034；**用户实机确认修复生效**（hero 完整截图）；v4 徽标随 UX-019 撤离) |
| **P1** | UX-019 | 收尾三改（用户实机确认后的批注）：①**移除 v4 诊断徽标**（用户确认"去掉临时的修改"——诊断用标记不交付）；②章节列表**仅显示章节号+章节名**（去字数信息——"只需要章节号和章节名称，不需要字数信息"）；③**章节栏可上下滑动**（.nv-chlist 溢出滚动不裁切；UX-015③ 原有 overflow:auto 即满足，不动）；**③' 用户追加修正（"我要的是章节标题栏单独拖动"，且追问"宽度调整边框怎么删了"）**——拖宽条误删需恢复，见 UX-020（恢复为 UX-015③ 原始样式）；smoke/README/CHANGELOG | UX-018 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-035；①②③按批注落实；③' 由 UX-020 修正落地——两任务同轮交付，以代码+实机为准) |
| **P1** | UX-020 | 用户实机修正 UX-019③（拖宽条误删后首版恢复又误做再设计，"误删了，还乱修改"）+ 章节名校准：①**章节列拖宽条恢复为 UX-015③ 原始实现**——.nv-chdiv 4px 实底分隔条（border-radius 2px + hover accent）逐项还原：CSS 两行回退、CHAPTER_W 120/360/160 常量回原位、listRef 命名回退、注释回退；git diff 核对 = 客户端与 HEAD 差异仅剩 UX-019 两合法变更（徽标撤离/去字数）；拖宽（pointer 捕获 120–360px）+ chapterW 持久化 + 直排滚动并存（smoke 断言含 4px 原始样式正断言）；②**章节名校准**——novel-001 真实文件查证：ch-004/005/018 首行带 UTF-8 BOM、ch-018 冒号变体 `# 第18章：老福宾馆` → chapterNameOf 剥 BOM + 前缀正则扩 `第[0-9０-９一二三四五六七八九十百千零万两〇]+[章回][：: 　]*(.*)`，无标题/前缀不匹配→''（禁回退正文行）；smoke 128→129 | UX-019 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-035；node --check ×3 通过；validate-preset 29/29；smoke 129/129；real novel-001 38 章全解析（004→质检员 7 号/005→考勤，还是判决/010→第七号放映厅/018→老福宾馆，空名=0）；novel-001 只读零写；首版 6px 再设计已撤——以 HEAD 2770a04 为基准逐字节核对) |
| **P1** | UX-021 | 用户实机截图批注（1078×593，两项）：①章节行**移除装饰圆点**——UX-019② 我加的「·」分隔符判为异常显示（"包含一个小圆点"），行 = 「第N章 名称」（span gap 4px），空名称回退「第N章」、✓/⚠ 标记不变；②**所有拖动图标（三条可拖分隔线：左窗 .nv-vdiv / 章节列 .nv-chdiv / 对话窗 .nv-chatdiv）默认隐藏**——常驻 border-l2 实线改 background:transparent（4px 几何、col-resize、拖拽行为不变），悬停显 border-l2 定位、拖动（:active）显 accent——"拖动选项卡面的位置时才能显示"；③章节列拖宽单独生效（chapterDividerHandler 只写 chapterW 120–360px，不触内容列/viewArea 边距）——"不要把中间包含章节内容作为一个整体拖动"；④**章节名显示异常根因取证（宿主侧）**：novel-001 38 章只读核对——001-012/018 共 13 章首行带 UTF-8 BOM（旧宿主不剥 BOM → 001-009/011/012/018 共 12 章空名=截图"丢失章节名"）、014+ 共 24 章「第N章：名称」冒号变体（旧正则残留「：」前缀）；UX-020 宿主修复（剥 BOM+变体正则）**重启 DSH 生效**（空名 12→0、「：」前缀 24→0）；smoke 129→130 | UX-020 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-036；node --check 通过；smoke 130/130（新增 UX-021 三线默认透明+hover/active 两态+旧常驻线负断言；sep 正→负）；38 章只读取证；novel-001 零写；README/CHANGELOG 同步)；**注：②「分隔线默认隐藏」系术语误读**——用户红框定案（UX-022）：分隔线=分割条应常驻可见、滚动条=拖动条应隐藏；已修订交付 |
| **P1** | UX-022 | 用户术语定案 + 滚动隔离（红框图两张：「分割条」=点击拖动改页面布局的三条分隔线→**常驻可见**；「拖动条」=拖动滚动窗口内容的滚动条→**默认隐藏**）：①三条「分割条」（.nv-vdiv/.nv-chdiv/.nv-chatdiv）恢复 border-l2 常驻实底+hover accent——UX-021 ② 误透明化撤除；②「拖动条」（滚动条）默认隐藏——.nv-chlist + 三个 .nv-scroll 容器（页签外层/正文列/左窗）webkit track/thumb 透明、容器 hover 显 border-l2、thumb hover 显 accent；③**滚动隔离**——无头探针取证 .nv-chlist 渲染高 1587px（章节页签包装层 display:block 破坏 height:100% 高度链）→ 章节列不自滚、外层页签滚动容器整体带动（滑章节名→正文同滑）；修复=包装层 height:100%+overflow:hidden + 正文列/左窗/页签外层各自 overflow:auto（.nv-scroll）+ 全链 overscroll-behavior:contain；④**CDP 真实滚轮实测**：滚轮在章节列 → .nv-chlist scrollTop 0→618、正文列容器 scrollTop=0 不变；列表内部滚动（scrollH 1091/clientH 473）；目检：4px 常驻分隔线可见、滚动条默认不可见；smoke 130→131 | UX-021 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-037；node --check 通过；smoke 131/131；CDP 滚轮实测+目检通过；novel-001 只读零写；**兼容性声明（用户约束）**：全部改动仅插件自身元素（.nv-*），零宿主选择器依赖/零宿主源码改动——宿主升级无兼容问题) |
| **P1** | UX-023 | UX-022 补充（用户实测「两个滚动条只有一个可以隐藏，而且滚动当前内容页的时候不会自动出现」）：**正文阅读区内部还有一个独立滚动容器**（renderContent 容器，`maxHeight:560 + overflow:auto`——无类名，经典样式滚动条常驻可见、无悬停显示逻辑）未被 UX-022 覆盖；修复=该容器与编辑 textarea（`onKeyDown` Ctrl+S 链）一并加 `className:'nv-scroll'`——滚动条纳入默认隐藏 + 容器 hover/thumb hover 显示；与正文列/左窗/页签外层共 5 个 nv-scroll 容器（smoke 断言 count=5 修正——首版误写 `.className:` 多一个点导致断言假失败，已修正）；smoke（断言修正后）131/131 | UX-022 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-038；node --check 通过；smoke 131/131（断言修正）；纯插件自身元素——零宿主依赖保持) |
| **P1** | UX-024 | 滚动条「滚动中显示、停止后自动隐藏」（用户两次纠正：①鼠标在滚动控制区域滚动时**自动显示**滚动条 ②滚动停止**一段时间后自动隐藏**、不得因解除隐藏后一直出现）：撤除悬停即显规则（`:hover::-webkit-scrollbar-thumb` 删除——悬停常驻违背"停止后隐藏"）；实现=SplitWorkspace 挂 document 捕获 scroll 监听 → 滚动容器（.nv-chlist/.nv-scroll）发生滚动时加 `.nv-scl`（thumb 显现）→ **1.5s 无滚动自动撤除**（初稿 600ms，用户实测后调长；拖动拇指期间 scroll 连续→保持显现；`:active` 高亮保留）；监听/计时器随组件卸载清理；**CDP 实测**：滚动前无类/滚动 120ms 有类/停止 1s 无类/再滚再有类（scrollTop 480 随滚）；smoke 131/131（断言：.nv-scl 规则在位、悬停常驻负断言、add/remove/1500ms/清理链） | UX-023 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-039/040；node --check 通过；smoke 131/131；CDP 滚动显现/自动隐藏实测通过；纯插件自身元素——零宿主依赖保持) |
| **P1** | UX-025 | 界面优化（用户：「三个分割线可以稍微调整的细一些……太突兀了，你可以参考比较成熟的网页端界面设计，对我们当前两级工作台的界面进行一次优化」）：①**三条可拖分割条 4px 实底 → 1px 细线**（VS Code/Linear 式：`width:4px` 透明抓握区保留可拖性 + `border-right:1px solid border-l2` + hover accent——与宿主细分割线协调，`border-radius:2px` 旧实底条移除）；②**章节列表列浅底侧栏感**（`background:fill-l1(rgba(255,255,255,.02))`——成熟 UI 层级靠浅底而非粗线）+ 章节行 hover 过渡 `0.12s`；③页签 hover 浅底 + 背景/字色/border 过渡统一；控制台（玻璃卡片/hover/过渡已成熟化）本轮不动；全部宿主令牌/插件自身元素/零宿主依赖；smoke 131（ux022 常驻断言改写为 ux025 细线断言）+截图目检 | UX-024 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-041；node --check 通过；smoke 131/131；探针 computed 样式实测（1px/border-l2/4px 抓握区/浅底）+目检通过；novel-001 只读零写；零宿主依赖保持) |
| **P1** | UX-026 | 区域分割线提清晰（用户：「各个区域的分割线……其他分割线非常不明显都快看不清」+红框指认标题栏底边线「你能看清吗？」——认领本轮遗漏）：工作台**区域分割线 border-l1(#262b36,近不可见) → border-l2(#3a4150,清晰可见)**——①标题栏底边（`.nv-bar` border-bottom）②左窗右缘（`.nv-left` border-right）③工作台外框（`.nv-split` border）；与三条 1px 细拖线（border-l2+hover accent）同层级，区域分隔一眼可辨；三条拖线保持 UX-025 细线；smoke 131（ux025 检查补三条 border-l2 正断言+外框 border-l1 负断言） | UX-025 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-042；node --check 通过；smoke 131/131；零宿主依赖保持) |
| **P1** | UX-027 | 聊天边界两根线去重（用户放大截图「这里为何是两根线」——UX-026 提亮外框后：工作台外框右缘 `.nv-split` border-right（border-l2 1px）+ 聊天窗拖线 `.nv-chatdiv` border-right（border-l2 1px）相距仅 ~2px，放大成两根线）：修复=外框 `border-right:none`——聊天边界唯一线 = 拖线（1px 细线+hover accent，UX-025 风格保持）；外框左/上/下边线保留（UX-026 提亮不变）；smoke 131（ux025 检查补外框 border-right:none 正断言） | UX-026 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-043；node --check 通过；smoke 131/131；零宿主依赖保持) |
| **P1** | UX-028 | 界面设计规范调研落地（用户：「是不是可以先调研好的 web 开源项目的页面设计，再优化，别自造轮子」——P-08 检视）：调研=①VS Code `sash.css`（开源工作台分割条范本：`--vscode-sash-size:4px` 透明命中区 + 1px 可见线 + hover accent）②参考项目 dsh-worktable styles/split（`DIVIDER=4` 分割条 + 1px 分隔线体系）→ 核验现有实现即该规范（4px 区+1px 线+hover accent＝VS Code sash 语义；滚动条 overlay 行为＝Win11 惯例；层级靠浅底与字重）；落地：**一处边界一条线**——`.nv-left` 右缘线移除（由 vdiv 拖线承担，与 UX-027 聊天边界同原则），消除 树|章节列 双线；分割条 border-l2 为 user-driven 偏差（参考用 border-l1 但用户屏幕近不可见——可见性优先，已记录）；smoke 131（断言 sync） | UX-027 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-044；node --check 通过；smoke 131/131；零宿主依赖保持) |
| **P1** | UX-029 | 连接处直角化（用户放大「这个线的连接处怎么这么奇怪」——单容器共享边线布局下 `border-radius:8px` 是病根：顶部横线在圆角处截断 + 右缘无框线 + 拖线偏 2-3px = 断头连接；参考项目的圆角属独立卡片布局〔每卡独立边框+4px 间隙〕，不适用于共享边线单容器）：修复=外框 `border-radius:0`（直角——VS Code 工作区惯例）+ 聊天拖线定位 `-2→-3`（border 与右缘逼近对齐，顶部与标题栏下边线直角相接）；computed 实测（radius 0 / border-top 1px / border-right 0 / chatdiv top=38 从标题栏底起）+目检通过；smoke 131（断言 sync：radius:0 + -3 正断言） | UX-028 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-045；node --check 通过；smoke 131/131；computed+目检通过；零宿主依赖保持) |
| **P1** | UX-030 | 边界线体系化（用户再次放大指认连接线并批评「没有完整的页面设计逻辑」——根因=拖线自带 1px border 且定位 -2/-3 偏移，边界线永远与面板边缘有 1-2px 台阶）：按 **VS Code sash 语义**重构——**可拖分区=纯透明命中区（vdiv/chdiv/chatdiv：无边框、无 hover 线、4px、col-resize）；可见线=面板/列自身边缘线（.nv-split 恢复全框 1px border-l2 右缘【全高】/ .nv-left border-right / .nv-chlist border-right）——全部边界 0 偏移、标题栏横线/内容线与边缘线 T 型直角相接**；chatdiv 命中区定位 -2 居中；smoke 断言重构（拖区无 border 负断言 + 三边线正断言 + 旧方案无残留）；探针 rect 实测（bar 右缘 757 = split 内容缘、border-right 757-758））+4x 放大目检（全高边线/T 相接/无台阶） | UX-029 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-046；node --check 通过；smoke 131/131；computed+4x 目检通过；零宿主依赖保持) |
| **P1** | UX-031 | 滚动条悬停即显取消（用户「我鼠标放到滚动条上为什么会默认显示且高亮，我只说了滚动内容的时候显示，你这样会导致分割线无法选中啊」——UX-024 的 `::-webkit-scrollbar-thumb:hover` 悬停即显+高亮规则违规【悬停非允许触发】，且 8px 命中区贴着边界分割线，悬停高亮条干扰抓取边界）：修复=删除 hover 规则，仅 `.nv-scl`（滚动事件驱动）显示 thumb、拖动拇指 `:active` 才 accent——鼠标悬停（不滚动）时滚动条保持完全隐形、边界拖区可直接抓取；smoke 断言（:active 正断言 + 无 hover 规则负断言） | UX-030 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-047；node --check 通过；smoke 131/131；零宿主依赖保持) |
| **P1** | UX-032 | 分割线命中区与可见线齐平（用户「分割线无法选中，但是红框的位置才能点击调整页面宽度，这个是啥意思？」——章节面板行 `gap:12px` 使拖拽命中区（chdiv 4px）与可见分割线（chlist 右缘 border-right 1px）隔开 12px：抓"线"命中不了（空档），只有 12px 外侧不可见 4px 区可拖——不可预期的命中区；参照 VS Code sash：命中区紧贴面板边缘）：修复=章节面板行去 `gap:12px`（命中区与列右缘齐平）+ 内容列 `paddingLeft:12px` 保留间距；探针实测 chlistRight=696=chdivLeft（flush:true）、elementFromPoint(线+2px)=nv-chdiv（抓线即命中）；smoke 断言（行无 gap + paddingLeft 正断言） | UX-031 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-048；node --check 通过；smoke 131/131；探针齐平实测+命中验证；零宿主依赖保持) |
| **P1** | UX-033 | 拖线选中高亮（用户「可以拖动调整布局的线不能在选中的时候高亮一下吗？一点都不明显」——VS Code sash hover 反馈〔sash.hoverBorder〕）：三个拖区 vdiv/chdiv/chatdiv 保持纯透明命中区，**悬停/按住（:hover/:active）box-shadow inset 1px 0 0 0 accent** 在边界画 1px 高亮线——选中反馈明显且无布局抖动（content-box 尺寸不变）；默认仍完全干净；smoke 断言（三 hover/active box-shadow 正断言） | UX-032 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-049；node --check 通过；smoke 131/131；零宿主依赖保持) |
| **P1** | UX-034 | 文件显示复用章节界面（用户批注「将文件的显示调整成复用章节显示界面」——左窗下部 FilePreview 小卡片〔300px 截断/嵌卡〕与中窗章节阅读界面割裂）：**fileSel 提升到 SplitWorkspace 受控**——左窗文件树仅选择（不再渲染 FilePreview），中窗**内容列**（与章节共用同一 nv-scroll 阅读区）在 fileSel!==null 时渲染 FilePreview（头部=📄 路径+✕ 关闭；内容整列滚动、无 maxHeight 截断；返回即关闭回章节视图）；切书（selectedId 变化）自动复位 fileSel；smoke 131→132；探针实测：点文件 → 内容列出现「📄 .temp-…」文件头、左窗无预览卡、章节头被替换 | UX-033 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-050；node --check 通过；smoke 132/132；探针实测通过；零宿主依赖保持) |
| **P1** | UX-035 | 文件视图点章节跳转修复（用户「在呈现文件内容的时候，我点击小说某个章节，不会跳到具体章节的显示」——fileSel 优先渲染文件，点章节只改章节状态不生效）：修复=ChapterPanel `select(num)` 与 `startEdit()` 动作内：文件视图打开时调用 `props.onFileClose()`（退出文件视图→章节显示/编辑）；smoke（ux034 检查补两处 onFileClose 计数断言） | UX-034 | v0.4.0 | closed | ✅ 完成 (2026-08-28，EVD-051；node --check 通过；smoke 132/132；零宿主依赖保持) |

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
