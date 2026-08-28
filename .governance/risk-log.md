# 风险记录

用于记录 workflow 执行过程中的风险、阻塞和缓解动作。

| 编号 | 识别日期 | 风险描述 | 影响 | 概率 | 等级 | 缓解措施 | 触发条件 | 责任人 | 状态 | 最后更新 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RISK-001 | 2026-08-22 | CI 首跑曾失败（schemastery mock 无法覆盖 .default()/.union 链式 API），修复刚合入（fdf4edd），CI 稳定性待观察 | 后续提交的回归信号可信度下降；若 CI 再失败可能掩盖真实回归 | 中 | 中 | 观察最近 3 次 CI 运行结果；若再次失败，升级为 P0 任务根因分析 | 最近 3 次 CI 运行中出现非文档性失败 | Coordinator | 已关闭 | 2026-08-22 |
| RISK-002 | 2026-08-22 | check-governance 在 root_divergence=true 部署形态下存在跨根误报（Check 28c 以插件仓库 dogfood 数据为期望；Check 18c/18d 把需求矩阵行与已完成任务误判为活跃 P0/P1）+ 部分扫描路径指向宿主不存在的位置（project\e2e-test-project、docs\release） | 宿主项目治理健康信号失真（27 issues 中 25 个 FAIL 均为误报）；每次运行 check-governance 需人工甄别，长期可能掩盖真实问题 | 高（确定复现） | 中 | 短期：误报清单固化于 DEC-007/EVD-001，check 结果解读时对照豁免；中期：向插件仓库（project_management_workflow）报告 issue 并跟踪修复；修复后重跑基线复核 | 每次运行 check-governance 产生同类 FAIL | Coordinator | 打开 | 2026-08-22 |
| RISK-003 | 2026-08-28 | UX-006 挤法布局引擎依赖宿主 DOM 约定：`[data-phase]` 会话根探测 + viewArea=children[1] 结构假设 + margin 挤压——DSH web 前端升级可能改变 DOM 结构使分栏失效（参考项目 dsh-worktable 同款依赖，其 README 亦记载宿主升级致插件失效先例） | 宿主升级后小说工作台分栏布局失效（打开无布局调整或错位）；不影响书目数据与绑定数据（文件系统+settings 持久） | 中 | 中 | 探测失败降级：findConversationRoot 返回 null 时不做布局调整，抽屉卡片仍可切换绑定会话（sessions.open 独立于布局）+ 友好提示；互斥协议 dsh:split-claim 兼容 dsh-worktable 共存；实机验证清单覆盖开/关/切会话/多书切换回归 | 宿主升级后打开工作台无布局变化或渲染错位 | Coordinator | 打开（UX-006 实机验证后复核） | 2026-08-28 |

## 使用规则

- 阻塞项必须同步登记为风险。
- 风险变化应同步回写主计划。
- 风险关闭前必须明确缓解结果。
