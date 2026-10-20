# 会话快照 — 2026-10-20（治理工作流升级 0.81.0 → 0.98.0：Scenario C A~E 完成，归档迁移因上游缺陷未执行）

**session_date**: 2026-10-20
**工作流版本**: 0.98.0（本轮升级完成；快照写入时 plan-tracker 已同步）
**会话标识**: dsh-writing-workflow-20261020-governance
**HEAD**: 本轮仅治理记录 + AGENTS.md bootstrap 段变更（EVD-133 / plan-tracker GOV-004 / 本快照 / AGENTS.md 段替换）；产品代码零修改
**上一会话**: 2026-10-20 COMPAT-019 解耦复核（EVD-132，零必改适配）

## 本轮结论（GOV-004，EVD-133）

`/governance` 命中 Scenario C（plan 0.81.0 < active 0.98.0，跨 18 个发布），用户经 AskUserQuestion 确认执行升级：

1. **深检（full 面）**：`check-governance --summary-only` = **39 issues（18 FAIL / 21 WARN）**，逐条归因：全部为 0.81-era 存量，非本轮引入——Check 16/17（EVD-073/074/080/081/094/099 缺 `目标对齐`/`用户影响` 字段，12 FAIL）/ 18c·18d·18f·18i（BUG-011 缺 execution packet，5 FAIL）/ 30c（2 处 machine-provenance 违规）/ 36（RISK-002 缓解引用未完成任务且逾期）/ 37（G-s2 发布 Gate 序列：v0.5.3 越 G6/G7 已由 DEC-029 留痕）。
2. **A 入口 bootstrap**：`sync_entry_projection --primary AGENTS.md --write` → 10686 bytes 段写入，复核 `[PASS] synchronized`（10685 B / 68 行，契约 v2），`git diff` = +35 / −234。
3. **B 结构核验**：plan-tracker 8 节齐（项目配置/Gate/总览/活跃事项/版本规划/需求跟踪矩阵/变更控制/使用规则），无缺节。
4. **C hooks**：pre-commit / commit-msg / post-commit 三件存活。
5. **C-2 清理**：`cleanup.py --dry-run` = `[CLEANUP-ERR-002] No redundant files found` → 免删。
6. **D 版本字段**：`工作流版本` 0.81.0 → 0.98.0。
7. **E 归档**：`migrate --auto --dry-run` = 跳过（解析已发布版本数 0 < 2）；显式区间 `migrate 0.1.0 0.5.1 --dry-run` = 0 task / 0 evidence，而本仓实有 tag 9 个（v0.2.0~v0.5.3）⇒ **RISK-002 同族上游缺陷复现**（archive.py 跨根解析已发布版本=0），本轮**不执行归档迁移**，如实登记。

**环境事实**：本轮前半段 pwsh confined 运行下无法修改既有文件（仅可新建），已按需以一次性放宽权限执行 A 步；随后会话切换为 danger-full-access。这不影响产品代码，仅为工具执行面事实披露。

## 跨会话待办（按优先级）

1. **BUG-011 实机验收**（用户点名，P0，自 2026-10-17 挂起）：`dsh plugin --profile web add <repo>` → 预设选择器选「小说写作工作流」→ 工作台 + 绑定自动恢复（.imported 惰性迁移）+ 会话打开/切换/自动退出联动；RISK-012 的独立 Code Review 补审（`9cb629b..d8d93c2`）同批可做。
2. **健康债清偿（39 issues）**：记录级 12 FAIL（EVD 字段补齐，需逐条事实推导）/ BUG-011 执行包（生成器只产出 TO_BE_DEFINED 占位，需开发者填报）/ 30c provenance / 36 RISK-002 / 37 Gate 序列。
3. **归档工具缺陷**：archive.py 在「插件根 ≠ 宿主根」形态下解析已发布版本=0（RISK-002 家族）；本仓归档以人工判据替代，缺陷并入 SYSGAP-001 上游报告。
4. **COMPAT-018 剩余**：① fixtures 转正（0.2.0-rc.2 / 0.2.1-rc.2 快照入 test/fixtures + smoke 断言 + CI mock 面对齐）② probe-host 实跑 ③ 宿主正式版发布时复核双表面窗口。
5. 既有候选池不变：CLEAN-005/008/009、BUG-008、UX-054、DOC-001/REL-002/SYSGAP-001（治理五欠债）；宿主 RISK-011 三缺陷按绕行口径处理。

## 复核方法论（下轮宿主升级直接复用）

提取器同管线快照 → 8 看护包机器 diff → 未看护包双版本 tarball 内容 diff → Config schema 逐包比对（apply() 显式拒绝清单重点看）→ 隔离实例端到端（install.ps1 与 `dsh plugin add` 双通道）。全部产物在 `.scratch-bug011/`（未入跟踪）。
