# 证据记录

用于记录 workflow 执行过程中的关键证据，支撑任务完成与 Gate 通过。

| 编号 | 对应任务 ID | 阶段 | 证据类型 | 证据说明 | 证据位置 | 提交人 | 提交日期 | 关联 Gate | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EVD-001 | ONBOARD-001 | 开发 | 文档 + 命令记录 | 治理接入执行记录：resolve_entry.py --json 返回 resolved_root_ok=true（v0.75.0, scenario_hint=B）；项目探索（11 commits / 3 tags / ci.yml / test/ / docs）；用户经 ask_user_question 确认 阶段=开发(6) + profile=standard + trigger=always-on + permission=maximum-autonomy；创建 .governance 四件套 + AGENTS.md bootstrap（268 行 standard 模板，源 governance-init.md L260-527）+ git hooks 安装（pre-commit/commit-msg/post-commit）；check-governance 首跑 27 issues，其中 25 FAIL 经逐项证据核验判定为插件工具链跨根误报（Check 28c 期望源=插件仓库 dogfood plan-tracker，FIX-082 等已验证存在于 plugin_root/.governance/；Check 18c/18d required=8 含已交付 REQ-001~006 与已完成 ONBOARD-001），处置见 DEC-007/RISK-002；Check 31 经 session-snapshot.md 创建后 PASS | .governance/plan-tracker.md, AGENTS.md, .git/hooks/{pre-commit,commit-msg,post-commit}, .governance/check-baseline.txt, .governance/session-snapshot.md | Coordinator | 2026-08-22 | — | 事实依据：上述命令输出与文件内容均可复核；目标对齐：Scenario B 半途接入全流程（B1-B8）完成；用户影响：项目进入治理工作流，后续任务有入账/证据/审查闭环 |

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
