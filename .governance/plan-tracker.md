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
| dsh-novel-writing | development (6/11) | 10 | 6 | 0 | 1 | G5 passed-with-conditions | — |

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
| **P2** | CLEAN-001 | UX-001 评审卫生项收尾（Code Reviewer 建议 A-D）：守卫式 hook 调用改无条件、TTL 渲染期 store 写移入 effect、launch 加 busy/防连点、StudioView L833/L844 陈旧注释更新 | UX-001 | v0.3.0 | open | ⏳ 待执行 |

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
| v0.3.0 | 进行中 | 待定 | 发布卫生 + 质量加固（DEC-008）：CHANGELOG 0.2.2 补录 / CI 观察收尾 / 发布一致性自检 / 初始窗口工作台入口（UX-001，DEC-009） | REL-001, QUAL-001, REL-002, UX-001 | — |

### 版本里程碑

| 里程碑 | 目标版本 | 预计日期 | 状态 |
| --- | --- | --- | --- |
| 治理接入完成 | — | 2026-08-22 | 达成（ONBOARD-001） |
| v0.3.0 范围确认 | v0.3.0 | 2026-08-22 | 达成（DEV-001，DEC-008） |
| v0.3.0 发布 | v0.3.0 | 待定 | 未开始 |

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
