# CLEAN-004 冻结探针复跑归档 — `CLEAN-006` **R2 返工后** @ `4b70182`

**provenance（一行口径）**：`node docs\evidence\CLEAN-004\probe-clean-004.mjs --out %TEMP%\clean006-rework2` → 本目录 `report.json`（**`head=4b70182d75731b724c8e7f828266c88ac717a078`**、**`headDirty=false`**（在**已提交的干净工作树**上运行）、`tally 49/47/0/2`、**FAIL 0**、退出码 1〔探针设计口径：`ok = 每条断言 PASS`，N-A 计为非 PASS ⇒ 断言级 **FAIL=0** 才是判据〕、真实 `$DSH_HOME` 零写入 `realEnvVerdict.ok=true`、隔离根 `cleanup.rootRemoved=true`）。

| 字段 | 值 |
|---|---|
| 任务 / 来源 | **CLEAN-006 R2 返工后复跑**（`docs/review/CLEAN-006-R2.md` = APPROVED_WITH_NOTES / 0 blockers ⇒ 返工提交 `700709e` + `4b70182`） |
| 命令 | `node docs\evidence\CLEAN-004\probe-clean-004.mjs --out %TEMP%\clean006-rework2`（cwd = 仓库根；随机端口 + 隔离 `DSH_HOME` + 独立 headless Edge profile） |
| HEAD（探针自算） | **`4b70182d75731b724c8e7f828266c88ac717a078`** / **`headDirty=false`** |
| 被测产物锚 | `lib/client.js`：git blob `08c03f243c8e121929c89aca60cf51ab3d7f1e07`；文件 sha256 `7ecc3e39be919065864563318c0374d983a1054fa74bc43ee992735ae1c541ae` |
| 断言汇总 | **49 条 → PASS 47 / FAIL 0 / N-A 2**（N-A = `B5-found-sessions-area`、`D6-session-switch-close`） |
| 运行窗口 | `2026-09-15T06:01:19Z` → `2026-09-15T06:02:23Z`（本地 UTC+8 `14:01:19` → `14:02:23`，约 64 s） |
| 隔离 | `containment` 全真；`realEnvVerdict.ok=true`；`cleanup.rootRemoved=true`；未终止/接管任何用户进程 |
| 本 `report.json` sha256 | `8320c96dd9d14e9b16250ac1af4f7ffaade4a88af4a549e4c0c3321487dbf104`（97367 B） |
| 冻结资产（**只运行不改**） | `probe-clean-004.mjs` sha256 = `de2de511e89a8ccc6d08b29d529e51336079bc3ceab4b937795dad88d9065b65`（= 锚值） |

## 与基线的差异

与 `docs/evidence/CLEAN-004/report.json`（`head=21b100ce`，`tally 49/42/4/3`）逐条 `id:status` 比对：**差异 5 条，全部为改善方向**——`D2-esc-bind-yield` / `C3b-binding-convergence` / `C9-width-memory` / `C10-flip-side` FAIL→PASS、`C11-flip-back` N-A→PASS ⇒ **零 PASS→FAIL、零新增 FAIL；id 集与基线完全相同**（49 条）。

> **归属（R1 F-08 口径）**：`C3b` / `C9` / `C10` / `C11` 是**本冻结探针**的断言 id；UX-012 全量探针的断言 id 以 `UX012-` 为前缀（本批另有其全量复跑：27 条 / PASS 23 / FAIL 0 / N-A 4，`UX012-D1-workspace-dialog-esc` 与 `UX012-CLASSIFICATION-LEDGER` 均 PASS）。
> **N-A 两条**仍为 `B5` / `D6`，归因已按 CLEAN-006 F6 订正为**探针选择器失配**（宿主该类名唯一使用点为 `div` + `role="treeitem"`），非「宿主无会话行」；见 `../CLEAN-004/README.md` §10-3 与 `../CLEAN-004/DEFECTS.md`（`sessionVisible` 全合取引文已按 R2 N-8 在源文档中补齐）。

## 归档口径（CLEAN-006 **N-4**）

- 本目录 = 复跑报告归档位（`docs/evidence/CLEAN-004-reruns/<task>-<head 短 sha>/`），位于**冻结资产目录之外**：每轮复跑一个子目录、**互不覆盖**（`CLEAN-006-f7ca27f` = A 段门禁、`CLEAN-006-f7ca27f-b` = B 段 F1、`CLEAN-006-2bf58d2` = R1 返工后、本目录 = R2 返工后）。
- **记录运行仍为 `docs/evidence/CLEAN-004/report.json`**（`head=21b100ce…` 的 R2 权威记录运行）——本目录**不替换**它。
- 冻结面纪律：`docs/evidence/CLEAN-004/{probe-clean-004.mjs,falsifiability-check.mjs,gen-defects-evidence.mjs}` 各轮 sha256 均与 README §3 登记值逐字一致（本轮未改动、未重写）。
