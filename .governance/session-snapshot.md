# 会话快照 — 2026-09-12（REL-006 v0.5.2 发布完成 + COMPAT-016 关单）

## 本会话完成

| 事项 | 结果 |
|---|---|
| **REL-006 发布 v0.5.2** | **完成并已推送远端**：`3442f39..3aedd74`（56+ commits）+ tag `v0.5.2`（对象 `793dde78` → peel `914725f8`）；通道 = **SSH over 443**（HTTPS/gh 令牌路径被 workflow-scope 拒 4 次，已留痕 EVD-100） |
| 发布审查链 | R1 `NEEDS_CHANGE`（3P/2F）→ 返工 `792030c` → R2 `NEEDS_CHANGE`（4P/1F，N1~N4）→ 返工 `66f0213` → **R3 `APPROVED_WITH_NOTES`（`unresolved_blockers=0`；5 PASS / 0 FAIL）**；N6 收尾 `872c9c7` |
| 隔离演练 | `drill=PASS`（路径 A 往返；6×`exit=0`；幂等 diff 全 0；`realPathLeak=0`）；证据 15 件入仓 `docs/release/evidence/rel006-drill-20260912/` |
| **COMPAT-016** | **关单**（REVIEW-COMPAT-016-R1 `APPROVED_WITH_NOTES` 0 阻断）；新 P3×7 → COMPAT-017 |
| 治理记录 | EVD-097~100；REVIEW-REL-006-R1/R2/R3 机录；DEC-027（tag 重定+push 授权+上游仅登记）、DEC-028（替代判据集合） |
| 风险 | RISK-002/003/005/006/**007** 打开；**RISK-004 已解除**；SYSGAP-001 家族 3 项待上游 |

## M7.7 事件（已闭合留痕）

隔离演练首轮因 PowerShell `$HOME` 只读自动变量冲突，`DSH_HOME` 被设为真实用户目录 ⇒ 在 `C:\Users\peter` 根写入 3 项（均新建：`profiles/`、`.agent-presets\novel-writing\`、`settings.yaml`）⇒ **已按 CreationTime 守卫清理 + 独立核验不存在 + `~/.dsh` 13 项指纹未变**；已加 fail-closed 路径断言 + 真实路径泄漏检测器。机写 **EVD-098**、登记 **RISK-006**。另：SSH 探测使 `~/.ssh/known_hosts` 由无到有（103 B，指纹与 GitHub 官方值一致）——如实留痕于 RISK-004。

## 门禁基线（本会话实测）

`node --check` 12 files / 0 failures ｜ `validate-preset` PASSED 29/29 ｜ `smoke` **282 passed / 0 failed** ｜ `probe-face` 28 项 + 11 例构造 ｜ `probe-host --self-check` 6/6 ｜ `check-release` **不可用**（跨根缺陷，DEC-028 替代判据）｜ `archive.py migrate --dry-run` 解析已发布版本 0 个（同族）

## 待办（下会话）

1. **released 模式机检**：`check-release --version 0.5.2 --require-changelog --lineage-mode released --release-commit 914725f8`（后台任务 `pwsh-71` 运行中，输出需入证）
2. **COMPAT-017（P3）**：`probe-host --run` 真机面（P2-3 浏览器层三值语义 / P2-4 隔离硬校验与 `$HOME` 重定向——**首次真机使用前 MUST**）+ 016-R1 P3×7（⑩c 真空子条件 / 部署式消费维正控 / ⑩b 三面零匹配与锚点派生 / `yml-jobs.mjs` 入 ci.yml 清单+契约 6.4 重基 / realRunGuard 三残余 / 两处读数精度）+ EVD-096 遗留
3. **用户侧实机验证**（RISK-003 关闭条件）：诊断面板真实渲染、`probe-host --run`、旧宿主实机
4. **CI 首次定时探测观测**（`cron: 17 3 * * *`，host-latest-probe 仅 schedule 触发）
5. 上游 SYSGAP-001 家族（**用户裁定仅登记不改插件仓**，DEC-027 ③）：`check-release` 跨根 / `archive.py` 解析 0 / post-commit hook `python3` 静默 no-op

## 本会话判断失误（如实）

git 授权排查**不够变通**：HTTPS/gh 令牌路径被拒后重复重试、且误用 `git push --dry-run` 作为 scope 探针（GitHub 在 ref 更新阶段才拒），直到后才试 SSH——应第一时间探测 SSH。已留痕 EVD-100。
