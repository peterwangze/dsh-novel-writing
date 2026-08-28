# 会话快照 — 2026-08-28（UX-006 + UX-007 工作台重构轮：调研→定案→实现→审查→收尾）

- **session_id**: 20260828-ux006-007
- **session_date**: 2026-08-28
- **agent**: DeepSeek Harness Coordinator (software-project-governance v0.75.0)
- **工作流版本**: 0.75.0（plan-tracker 声明值；本机钩子已自升级至 0.78.0——其新增检查已甄别：可修项已修，其余属 DEC-007/RISK-002 记录的跨根误报家族）

## 当前状态
- **current_stage**: 6/11 development（开发实现）
- **current_gate**: G5 (passed-with-conditions，条件项 DOC-001 跟踪)
- **trigger_mode**: always-on / **permission_mode**: maximum-autonomy
- **项目总览**: 23 任务 / 17 已完成 / 0 阻塞 / 关键风险 2（RISK-002、RISK-003）
- **版本**: v0.3.0（发布卫生线，进行中）+ v0.4.0（工作台重构线，进行中——UX-006/UX-007 代码完成待实机验证；用户正在实机迭代）

## 本轮完成（增量）
- **调研（UX-006 前置）**：克隆 Aisland-SJL/dsh-worktable 至 %TEMP%\dsh-worktable-research——源码级研读 split.tsx（挤法引擎：[data-phase] 探测/margin 挤压/重锚定/让位/互斥协议）、styles.ts（--dsw-alias-* 令牌=美观实质，零自生成素材）、PRD.md（绑定/抽屉/控制室设计）、sessions.open/list 用法实证（L807/L3045）
- **DEC-013 五项定案**（ask_user_question，用户全选推荐项）：①退役 conversation.view 标签页（统一走侧栏分栏模式，指令改 sessions.prompt）②固定三栏可调（左导航可折叠｜中五页签｜右对话窗，不做多拓扑）③绑定存宿主 settings（novel-writing ns bindings）④视觉全量宿主设计令牌 ⑤新开 v0.4.0
- **UX-006**（EVD-020）：Developer 子代理 9c9b6f52 三轮交付（主实现 + N6/N4 定点修复 + CHANGELOG [0.4.0]）+ Code Reviewer 子代理 ca212a5e 独立审查 APPROVED-WITH-NOTES（清单 A-I 全 PASS；N6 高优先文案/行为对齐已修，N1/N3/N5/N7 非阻断备注）。交付物：lib/index.js（+11 纯加法：bindings 字段/overview 附带/createProject 返 path）、lib/client.js（1728→2433：挤法分栏+侧栏抽屉 novel-drawer+绑定面板+新建全链+退役四通道+.nv- 令牌化+可逆清理）、test/smoke.mjs（67→83）、README.md、CHANGELOG.md。验证三度独立复跑全绿（node --check ×3 / validate-preset 29/29 / smoke 83/0）
- **UX-007**（EVD-021，DEC-014→DEC-015 两次实机反馈修正）：用户二次截图批注「整个工作台的界面。不涵盖对话框…」「不要按钮」→ 修定为侧栏**纯主入口**（标题行可点开/关，无 🔍⚙＋）+ **全屏管理控制台** nv-console（几何降级/与分栏互斥/搜索滤小说+找 session/新建表单复用 launcher 链/玻璃拟态卡片+状态光效+绑定双圆+数据卡片）。Developer 子代理 08b0e04b（第 0 步回退 DEC-014 半成品 + 3 轮：实现 + G-1 陈旧文案修复；期间子代理通道 2 次中断换新实例） + Code Reviewer 子代理 bf2e7c08 独立审查 APPROVED-WITH-NOTES（A-H 全 PASS；G-1 已修，A-1/B-1/C-1~C-3/F-1~F-3/H-1/H-2 备注归 CLEAN-004/发布卫生）。交付物：lib/client.js（2433→2868）、test/smoke.mjs（83→86，mock React 升级逐层执行）、README.md、CHANGELOG.md。验证三度独立复跑全绿（node --check ×3 / validate-preset 29/29 / smoke 86/0）
- **治理**：RISK-003 入册（挤法 DOM 耦合，含降级防护——控制台几何同族）；CLEAN-002② 被 UX-006 取代；DEC-013/014/015 三决策链记录**

## 遗留任务
| 任务 ID | 描述 | 完成百分比 | 阻塞原因 | 优先级 |
|---------|-------------|-----------|------------|----------|
| CLEAN-004 | UX-006/UX-007 实机浏览器验证清单（重启 DSH 后）：控制台全链路（开/关反选、搜索滤小说+找 session、＋新建表单、状态光效/数据卡片、▶打开=切会话+进分栏【口径确认：是否要自动进分栏】、🔗绑定/失效重绑、➤继续）+ 分栏（分隔线拖拽/宽度记忆/⇄/Esc/脏稿守卫）+ 降级（sessions 缺席/挤法失败/无会话根）+ 与 dsh-worktable 互斥 + 评审备注处置（A-1 抽 createAndStart/B-1 对话框 Esc/C-1~C-3/F-1~F-3/H-2） | 0% | 需 GUI 重启 | P2 |
| CLEAN-003 | createdId 与 workspaceId 成对存储（评审备注；WorkspaceDialog 仍复用，适用性保持） | 0% | — | P2 |
| DOC-001 | G5 条件关闭：设计文档补强（非功能对应表 + 接口契约 + Roadmap 同步——含 UX-006/007 入口演进） | 0% | — | P2 |
| REL-002 | 发布一致性自检（tag↔CHANGELOG↔路线图，含 v0.3.0/v0.4.0 未发布段） | 0% | — | P2 |
| SYSGAP-001 | 向插件上游报告 check-governance 跨根误报（RISK-002） | 0% | — | P2 |
| BUG-003（候选） | CI 恒等 mock 无 schema 校验（latestAiPath enum 回归仅本机真包拦截）；未正式入账 | 0% | — | P3 候选 |
| BUG-004（候选） | install.ps1 无显式 exit 0 + 步骤4文案恒报已同步；未正式入账 | 0% | — | P3 候选 |

## 待确认决策
| 决策 ID | 标题 | 上下文 | 截止日期 |
|-------------|-------|---------|----------|
| — | ✅ 卡片「▶ 打开」=切会话+自动进分栏（已确认 2026-08-28） | DEC-015⑤ 实现与用户确认一致，本轮无需改动 | 已确认 |
| — | v0.4.0 发布时点 | 待 CLEAN-004 实机验证后定 | — |

## 活跃风险
| 风险 ID | 描述 | 升级截止日期 | 负责人 |
|---------|-------------|---------------------|-------|
| RISK-002 | check-governance 跨根误报（Check 28c/18c/18d，root_divergence 兼容性） | 未定（SYSGAP-001 上游反馈） | Coordinator |
| RISK-003 | UX-006 挤法布局依赖宿主 DOM 约定（[data-phase]/children[1]/margin），DSH web 升级可能失效；已实现降级（不动布局+提示+抽屉仍可切会话） | CLEAN-004 实机验证后复核 | Coordinator |

## 下次会话优先级
1. **用户重启 DSH 后实机复验**（CLEAN-004 清单——UX-006 全链路 + N6 定案；异常则修复）——junction 连接下本仓库改动重启即生效
2. DOC-001：G5 条件关闭（含 DESIGN Roadmap 同步 UX-006 演进）
3. REL-002：发布一致性自检（v0.3.0 按原范围收尾发布；v0.4.0 待实机验证后发布）
4. SYSGAP-001：向插件上游反馈 RISK-002

## 用户偏好设置
- profile: standard / trigger_mode: always-on / permission_mode: maximum-autonomy
- 产品立场：插件 UI 居于外围（不喧宾夺主）；预设作为附属组件零感知；原则已入册为强制底线
- 设计口径：工作台走侧栏分栏模式（挤法），素材只用宿主设计令牌/emoji/CSS，不引入外部素材与图标库

## 环境备注
- git 命令需 `-c safe.directory=D:/AI/agent/deepseek/harness/writing-workflow`
- **本机 `pwsh` 实为 Windows PowerShell 5.1.26100（无 pwsh 7）**——读 UTF-8 文件用 read 工具（PS 5.1 Get-Content 无 -Encoding UTF8 时乱码）
- 本项目与 DSH 为 junction 安装连接（INST-001，EVD-017）：本仓库代码改动**重启 DSH 后生效**（侧栏抽屉/分栏工作台/绑定/预设工具行）
- 调研克隆在 %TEMP%\dsh-worktable-research（本会话有效；重启后如需可重新克隆）
- 参考项目共存：dsh-worktable 与本插件经 dsh:split-claim 互斥协议兼容（同一时刻仅一个分栏工作区）
