# 决策记录

用于记录 workflow 运行中的关键决策和取舍原因。

| 编号 | 日期 | 决策标题 | 上下文 | 可选方案 | 决策结论 | 理由 | 影响范围 | 相关任务 | 状态 | 复核日期 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | 2026-08-22 | 中途接入声明 + 阶段判定 | 项目已运行至功能迭代期（git 11 commits / 3 tags / CHANGELOG / ci.yml），.governance 不存在 | 从立项开始 / 中途接入 | 中途接入——前置阶段 G1~G4 标记 passed-on-entry；当前阶段采用「开发 (6/11)」（用户将场景推断的「发布 (9)」下调为「开发 (6)」，理由：项目仍以功能迭代为主） | 补齐全部历史记录成本过高；阶段判定尊重用户判断 | G1~G4 状态、plan-tracker 基线 | ONBOARD-001 | 已执行 | — |
| DEC-002 | 2026-08-22 | 立项定位：门禁代码化（接入补录） | claude-writing-workflow 门禁靠模型自觉、无界面、无持久数据通道 | 终端工作流继续演进 / 迁移为 DSH 插件 | 以 DSH 宿主插件形态重建：项目管理 + 工作台 + 发布配置 + 数据闭环 | README 项目目标段 + 初始 commit 11b6d56 | 产品定位 | — | 接入补录（基于 README/git 历史推断） | — |
| DEC-003 | 2026-08-22 | 三路调研确定迁移可行性（接入补录） | 迁移前需验证市场、源工作流、DSH 生态 | 直接迁移 / 先调研 | 先三路调研（市场/源工作流/DSH 生态）再设计 | docs/RESEARCH.md 存在 | 设计输入 | — | 接入补录 | — |
| DEC-004 | 2026-08-22 | 技术选型：Node.js ≥20 ESM + DSH 插件体系（接入补录） | 宿主为 DSH（cordis 架构） | 其他语言/运行时 / DSH 原生插件体系 | Node.js ≥20 ESM；peerDeps：cordis/schemastery/dsh-settings/dsh-home-paths/dsh-tools；零运行时 dependencies | package.json 事实；与宿主同生态降低适配成本 | 全部代码 | — | 接入补录 | — |
| DEC-005 | 2026-08-22 | 基础设施：GitHub CI + 双通道安装（接入补录） | 安装与质量守护通道选择 | 单通道 / 双通道 | dsh plugin 标准命令 + install.ps1/install.sh 双通道；CI=.github/workflows/ci.yml（syntax/deps/preset/smoke） | install.* + ci.yml 存在；双通道经 v0.2.1 验证 | 安装/CI | — | 接入补录 | — |
| DEC-006 | 2026-08-22 | 架构：bundle 服务 + HTTP API + 预设同步 + 工作台四层（接入补录） | 项目管理/可视化/发布/数据闭环的承载方式 | 纯预设 / 预设+宿主插件 | bundle 行 novel-writing 服务（项目管理/门禁/审计/发布/数据信号/请求队列）+ HTTP API + 预设自动同步 .agent-presets/ + 浏览器工作台 | docs/DESIGN.md + README 架构一览 | 系统结构 | — | 接入补录 | — |
| DEC-007 | 2026-08-22 | check-governance 误报判定与处置（root_divergence 兼容性） | 首跑 check-governance 报 27 issues；经证据核验分两类非本项目缺陷：(a) Check 28c 的 18 个 FAIL——期望源为插件仓库自身 dogfood plan-tracker（FIX-082~087/REL-013/REQ-070~074/0.37.0~0.38.0 roadmap/1.0.0 依赖链，已逐项验证存在于 plugin_root/.governance/plan-tracker.md），跨根投射到宿主；(b) Check 18c/18d 的 7 个 FAIL——execution-packet 解析器把需求跟踪矩阵 REQ-001~006（已交付历史）与已完成 ONBOARD-001 误判为活跃 P0/P1（required=8，实验证明改状态词无效） | 伪造期望数据凑检查 / 删除治理文件回避 / 判定误报并记录 + 向插件上游反馈 | 判定为工具链兼容性误报：不伪造 dogfood 数据（违反事实依据铁律）、不删除已创建的合法治理结构；删除 TO_BE_DEFINED 占位 execution-packets.json（占位包使校验问题 30→61）；误报清单与证据固化于 EVD-001 与 check-baseline.txt；上游修复追踪入 RISK-002 | 检查器在 root_divergence=true 部署形态（插件仓库与宿主项目分离）下未隔离期望源；这是插件产品代码问题，修复属插件仓库变更流程 | 治理健康信号可信度、后续 check-governance 输出解读 | ONBOARD-001 | 已执行 | 待插件上游修复后复核 |
| DEC-008 | 2026-08-22 | v0.3.0 版本范围：发布卫生 + 质量加固 | README 需求①~⑥均标记已交付（无未交付功能项可循）；CHANGELOG 缺 [0.2.2] 段（tag v0.2.2 已发布，发布一致性缺口）；RISK-001 CI 首跑修复观察期未收尾；test/ 以冒烟 60 项为主 | 发布卫生+质量加固 / 测试深化 / 新功能批次 | 用户经 ask_user_question 确认「发布卫生+质量加固」；CHANGELOG [0.2.2] 立即补录（不并入版本） | 小而硬的加固版快速发版，先修复发布纪律缺口再扩功能；测试深化与新功能可作后续版本主题 | v0.3.0 版本范围（REL-001/QUAL-001/REL-002） | DEV-001 | 已执行 | v0.3.0 发布时复核 |

## 使用规则

- 方案变更、范围变更、门禁变化都应进入决策记录。
- 决策记录应与计划和风险记录形成引用关系。
