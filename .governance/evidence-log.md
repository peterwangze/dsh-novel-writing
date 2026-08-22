# 证据记录

用于记录 workflow 执行过程中的关键证据，支撑任务完成与 Gate 通过。

| 编号 | 对应任务 ID | 阶段 | 证据类型 | 证据说明 | 证据位置 | 提交人 | 提交日期 | 关联 Gate | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EVD-001 | ONBOARD-001 | 开发 | 文档 + 命令记录 | 治理接入执行记录：resolve_entry.py --json 返回 resolved_root_ok=true（v0.75.0, scenario_hint=B）；项目探索（11 commits / 3 tags / ci.yml / test/ / docs）；用户经 ask_user_question 确认 阶段=开发(6) + profile=standard + trigger=always-on + permission=maximum-autonomy；创建 .governance 四件套 + AGENTS.md bootstrap（268 行 standard 模板，源 governance-init.md L260-527）+ git hooks 安装（pre-commit/commit-msg/post-commit）；check-governance 首跑 27 issues，其中 25 FAIL 经逐项证据核验判定为插件工具链跨根误报（Check 28c 期望源=插件仓库 dogfood plan-tracker，FIX-082 等已验证存在于 plugin_root/.governance/；Check 18c/18d required=8 含已交付 REQ-001~006 与已完成 ONBOARD-001），处置见 DEC-007/RISK-002；Check 31 经 session-snapshot.md 创建后 PASS | .governance/plan-tracker.md, AGENTS.md, .git/hooks/{pre-commit,commit-msg,post-commit}, .governance/check-baseline.txt, .governance/session-snapshot.md | Coordinator | 2026-08-22 | — | 事实依据：上述命令输出与文件内容均可复核；目标对齐：Scenario B 半途接入全流程（B1-B8）完成；用户影响：项目进入治理工作流，后续任务有入账/证据/审查闭环 |
| EVD-002 | ONBOARD-001 | 开发 | 命令记录 | 完成必推荐契约快照：task-priority-analysis 输出（2026-08-22）——Total 4 tasks: 1 completed / 3 unblocked / 0 blocked；Recommended next: Top pick DEV-001 [P1]（deps=—）；Unblocked: DEV-001 [P1], GATE-005 [P2], SYSGAP-001 [P2 refs: RISK-002]；Completed: ONBOARD-001。首跑返回 total=0（解析器不识别 21 列「当前活跃事项」表），已重构为 canonical `### 优先级一览` 7 列表后解析成功 | .governance/plan-tracker.md 优先级一览表 + 命令输出（terminal） | Coordinator | 2026-08-22 | — | 分析输出即推荐依据（DEC-143 自动推荐 + 用户确认基线） |
| EVD-003 | DEV-001, REL-001 | 开发 | 文档 + 命令记录 | DEV-001 闭环：CHANGELOG/README/git 事实挖掘 → ask_user_question 两问（v0.3.0 范围 + 0.2.2 补录处置）→ 用户确认「发布卫生+质量加固」+「立即补录」（DEC-008）；v0.3.0 路线图行更新（进行中）+ 任务拆解入账（REL-001/QUAL-001/REL-002）。REL-001 同轮完成：git show ef5c073 --stat（5 文件 +113/-45，tag v0.2.2 创建于 2026-08-22 18:01）→ CHANGELOG [0.2.2] 段补写（含补录标记） | CHANGELOG.md [0.2.2] 段, .governance/plan-tracker.md 版本规划节, git show ef5c073 输出 | Coordinator | 2026-08-22 | — | 事实依据：ef5c073 commit message 与 tag 日期可复核；目标对齐：DEC-008 v0.3.0 范围决策；用户影响：发布账本恢复一致性，后续版本有明确范围 |
| EVD-004 | DEV-001 | 开发 | 命令记录 | 完成必推荐契约快照（第二轮，commit 745836d 后）：task-priority-analysis——Total 7 tasks: 3 completed / 4 unblocked / 0 blocked；Recommended next: Top pick QUAL-001 [P1 refs: RISK-001]；Unblocked: QUAL-001 [P1], REL-002 [P2 deps: REL-001✅], GATE-005 [P2], SYSGAP-001 [P2 refs: RISK-002] | .governance/plan-tracker.md + 命令输出（terminal） | Coordinator | 2026-08-22 | — | 第二轮推荐依据（DEC-143） |
| EVD-005 | QUAL-001 | 开发 | CI 记录 | CI 观察收尾：GitHub Actions runs（api.github.com/repos/peterwangze/dsh-novel-writing/actions/runs，匿名只读）——run#1 e89dc90 failure（首跑失败，RISK-001 起因）；run#2 fdf4edd success（修复生效）→ run#7 8c0cb30 连续 6 次 success（含本会话 4 个治理 commit d56f428/c427535/745836d/8c0cb30 全绿）；触发条件「最近 3 次非文档性失败」未出现 → RISK-001 关闭 | GitHub Actions run #1~#7 记录 + .governance/risk-log.md | Coordinator | 2026-08-22 | — | 事实依据：runs API 输出可复核；目标对齐：QUAL-001 验收标准（核验+结论+风险更新）全满足；用户影响：CI 回归信号可信度恢复 |
| EVD-006 | QUAL-001 | 开发 | 命令记录 | 完成必推荐契约快照（第三轮，commit 518e404 后）：task-priority-analysis——Total 7 tasks: 4 completed / 3 unblocked / 0 blocked；Recommended next: Top pick GATE-005 [P2]；Unblocked: GATE-005 [P2], REL-002 [P2 deps: REL-001✅], SYSGAP-001 [P2 refs: RISK-002] | .governance/plan-tracker.md + 命令输出（terminal） | Coordinator | 2026-08-22 | — | 第三轮推荐依据（DEC-143） |
| EVD-007 | GATE-005 | 开发 | 文档审查 | G5 六项自评（对照 stage-gates.md G5 + docs/DESIGN.md 事实）：①非功能需求对应表——⚠️部分（DESIGN 六节覆盖兼容/降级/boot 安全/验证管线，无表格化）；②模块划分职责单一——✅（DESIGN 二节架构图 L20-48 + 平面划分依据 L48；peer-only 依赖 + CI 静态守卫断言防循环依赖 L84）；③关键接口定义——⚠️部分（数据模型节定义状态/事件/文件结构且兼容源 schema L50-55；HTTP API 隔离 boot 验证 L91；字段级契约散落）；④技术评审结论——✅（v0.2.0 双代理审计：8 宿主 P0+3 客户端 P0+17 P1 全量处置，CHANGELOG/commit 272d1e0）；⑤Bar Raiser——✅（双代理审计=两个独立 AI 代理，非项目组无进度压力）；⑥详设覆盖核心模块——✅（服务六职能 L26-31+门禁机制表 L61-69+发布数据通道 L73-78+兼容策略 L82-92）。结论：**passed-with-conditions**（standard 允许），条件关闭项入账 DOC-001；另发现 DESIGN.md Roadmap（L94-99）与实际版本演进偏离（v0.2 计划工作台增强 vs 实际审计修复线；v0.3 计划数据生态 vs DEC-008 发布卫生线） | docs/DESIGN.md, docs/stage-gates 比对, .governance/plan-tracker.md Gate 表 | Coordinator | 2026-08-22 | G5 | 六项逐条有文件行号级事实依据；条件项已转任务 DOC-001 跟踪 |
| EVD-008 | GATE-005 | 开发 | 命令记录 | 完成必推荐契约快照（第四轮，commit 6385b18 后）：task-priority-analysis——Total 8 tasks: 5 completed / 3 unblocked / 0 blocked；Recommended next: Top pick DOC-001 [P2 refs: GATE-005]；Unblocked: DOC-001 [P2], REL-002 [P2 deps: REL-001✅], SYSGAP-001 [P2 refs: RISK-002] | .governance/plan-tracker.md + 命令输出（terminal） | Coordinator | 2026-08-22 | — | 第四轮推荐依据（DEC-143） |
| EVD-009 | UX-001 | 开发 | 代码 + 测试 + 审查 | UX-001 闭环（用户反馈初始窗口无工作台入口 → 定位：DSH 核心 blank 不渲染 conversation.view / composer.dock 仅 !hero，input.dock hero/active 均渲染 → 修复：兜底条迁 input.dock + 新增 blank 入口行；DEC-009 用户确认范围）；验证：node --check lib/client.js=0 / validate-preset 29/29=0 / smoke 受限模式 36 项后 spawn EPERM（沙箱 pipe 边界，非代码缺陷）→ 提权后 60/60=0；Code Reviewer 独立审查 APPROVED（清单 1-7 全过；建议 A-D 低风险继承项入账 CLEAN-001） | lib/client.js（+111 行）, CHANGELOG.md [0.3.0], README.md 使用指导, .governance/plan-tracker.md, .governance/decision-log.md（DEC-009） | Coordinator | 2026-08-22 | — | 结构化事实：{"commands":[{"cmd":"node --check lib/client.js","exit_code":0,"summary":"syntax pass"},{"cmd":"node test/validate-preset.mjs","exit_code":0,"summary":"PRESET VALIDATION PASSED 29/29"},{"cmd":"node test/smoke.mjs","exit_code":1,"summary":"36 项过后 spawn EPERM——受限模式 pipe stdio 文档化边界；提权后 60/60 通过"},{"cmd":"node test/smoke.mjs (danger-full-access)","exit_code":0,"summary":"SMOKE DONE: 60 passed, 0 failed"}],"files_changed":["lib/client.js","CHANGELOG.md","README.md",".governance/plan-tracker.md",".governance/decision-log.md"],"diff_summary":"conversation.composer.dock(novel-launch-bar) → conversation.input.dock(novel-launch-dock)；LaunchBar 扩展 blank 入口行（overview 轮询/开始继续/新建并开工/预设原位 select 后注入）","review":{"conclusion":"APPROVED","reviewer":"Code Reviewer (subagent c66dfc23)"}} | 事实依据：上述命令输出与 DSH 核心行号级证据（ui-conversation L7416/L7243/L7254；runner L2551-2599）均可复核；目标对齐：DEC-009 预设零感知 + 初始窗口入口；用户影响：新会话初始窗口直接出现「📖 小说工作台」入口条，预设自动挂载 |

## 使用规则

- 已完成事项必须至少有一条证据。
- Gate 结论必须可追溯到证据。
- 产品代码交付证据必须包含 `事实依据:`、`目标对齐:`、`用户影响:`。
- 0.38.0+ 当前版本产品代码交付证据还必须包含 `结构化事实:` JSON，最小字段如下：

```json
{
  "commands": [
    {
      "cmd": "python skills/software-project-governance/infra/verify_workflow.py check-governance --fail-on-issues",
      "exit_code": 0,
      "summary": "Governance health passed with zero issues.",
      "log_path": "terminal output"
    }
  ],
  "files_changed": ["skills/software-project-governance/infra/verify_workflow.py"],
  "diff_summary": "Short summary of the relevant diff.",
  "review": {"conclusion": "APPROVED", "reviewer": "Code Reviewer"}
}
```

- `结构化事实:` 不得包含 API key、token、password、secret 等明文敏感值；只记录脱敏摘要或日志路径。
