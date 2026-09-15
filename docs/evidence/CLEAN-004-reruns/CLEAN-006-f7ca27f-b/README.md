# CLEAN-004 冻结探针复跑归档 — `CLEAN-006` **B 段（F1）** @ `6f65bbe`

**provenance（一行口径）**：`node docs\evidence\CLEAN-004\probe-clean-004.mjs --out %TEMP%\clean006-verify-b` → 本目录 `report.json`（**`head=6f65bbe9cbb1a00b944ad98453456d9d669912cd`**、**`headDirty=true`**（= 已应用 F1 修复、尚未 commit 的工作树——修复产物同源可核）、`tally 49/47/0/2`、**FAIL 0**、退出码 1〔探针设计口径：`ok = 每条断言 PASS`，N-A 计为非 PASS ⇒ 断言级 **FAIL=0** 才是判据〕、真实 `$DSH_HOME` 零写入 `realEnvVerdict.ok=true`、隔离根 `cleanup.rootRemoved=true`）。

> **⚠️ R1 F-02 订正**：本文件首版把该行写成 `head=f7ca27f`，与本目录 `report.json` 的 `head=6f65bbe…` **矛盾**（`f7ca27f` 是**运行时的仓库基点**：A 段提交尚未落地时的工作树基线；探针自算的 `head` 取的是**运行时 `git rev-parse HEAD`**，故为 `6f65bbe`）。现按报告实值订正，并**补 `lib/client.js` 锚**（下表）——对外部核验者不再只依赖自述。

| 字段 | 值 |
|---|---|
| 任务 / 来源 | **CLEAN-006 B 段（F1：会话镜像 hook 改走 `useSyncExternalStore`；BUG-009 R1 F1 / RISK-008）** |
| 命令 | `node docs\evidence\CLEAN-004\probe-clean-004.mjs --out %TEMP%\clean006-verify-b`（cwd = 仓库根；随机端口 + 隔离 `DSH_HOME` + 独立 headless Edge profile） |
| HEAD（探针自算） | **`6f65bbe9cbb1a00b944ad98453456d9d669912cd`**（A 段提交；本次运行发生在该 HEAD 之上） / **`headDirty=true`**（`lib/client.js` 已含 F1 修复、未 commit） |
| 被测产物锚 | `lib/client.js`（含 F1 修复、未 commit 时的同一内容）：git blob `8a7e1784070418963d1e3a542842d6ea532ee278`；文件 sha256 `54a4cf4ac9d1a99253eef2ffbd13cbfdcc8a14189e8adc2cee24b7e0ac1de10c`（R1 F-02 补充） |
| 断言汇总 | **49 条 → PASS 47 / FAIL 0 / N-A 2**（N-A = `B5-found-sessions-area`、`D6-session-switch-close`） |
| 运行窗口 | `2026-09-15T04:37:12Z` → `2026-09-15T04:38:15Z`（本地 UTC+8 `12:37:12` → `12:38:15`，约 63 s） |
| 隔离 | `containment` 全真；`realEnvVerdict.ok=true`；`cleanup.rootRemoved=true`；未终止/接管任何用户进程 |
| 本 `report.json` sha256 | `83b04594852f855dbfbcc09f2a80024e8695e072c775df31ffae1ba00be1b902`（97372 B） |
| 冻结资产（**只运行不改**） | `probe-clean-004.mjs` sha256 = `de2de511e89a8ccc6d08b29d529e51336079bc3ceab4b937795dad88d9065b65`（= 锚值） |

## 与基线的差异（F1 的回归面判据）

与 `docs/evidence/CLEAN-004/report.json`（`head=21b100ce`，`tally 49/42/4/3`）逐条 `id:status` 比对：**差异 5 条，全部为改善方向**——`D2-esc-bind-yield` / `C3b-binding-convergence` / `C9-width-memory` / `C10-flip-side` FAIL→PASS、`C11-flip-back` N-A→PASS ⇒ **零 PASS→FAIL、零新增 FAIL**。

> **F1 关键面（本段最关心）**：`C3b-binding-convergence`（自动链绑定在会话镜像中收敛——**BUG-009 收敛语义**的冻结探针判据）与 `C9`/`C10`/`C11`（D-2 下游）**全部 PASS**；`B21a`/`B21b`（守卫在 usesync 之外者）亦 PASS ⇒ F1 未回归 BUG-009 / BUG-005 任何行为面。UX-012 侧另有同批全量复跑（27 条 / PASS 23 / FAIL 0 / N-A 4，`C2`/`C4`/`C1` 均 PASS）交叉印证。

## 归档口径（CLEAN-006 **N-4**）

- 本目录 = 复跑报告归档位（`docs/evidence/CLEAN-004-reruns/<task>-<head 短 sha>[-段]>/`），位于**冻结资产目录之外**：每轮复跑一个子目录、**互不覆盖**（A 段 = `CLEAN-006-f7ca27f/`，B 段 = 本目录）。
- **记录运行仍为 `docs/evidence/CLEAN-004/report.json`**（`head=21b100ce…` 的 R2 权威记录运行）——本目录**不替换**它。
- 冻结面纪律：`docs/evidence/CLEAN-004/{probe-clean-004.mjs,falsifiability-check.mjs,gen-defects-evidence.mjs}` 三轮 sha256 均与 README §3 登记值逐字一致（本轮未改动、未重写）。
