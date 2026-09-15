# CLEAN-004 冻结探针复跑归档 — `CLEAN-006 @ f7ca27f`

**provenance（一行口径）**：`node docs\evidence\CLEAN-004\probe-clean-004.mjs --out %TEMP%\clean006-verify` → 本目录 `report.json`（`head=f7ca27f026ab2cf5ba58fc6a2e6a5a088153a65e`、`headDirty=false`、`tally 49/47/0/2`、**FAIL 0**、退出码 1〔探针设计口径：`ok = 每条断言 PASS`，N-A 计为非 PASS ⇒ 断言级 FAIL=0 才是判据〕、真实 `$DSH_HOME` 零写入 `realEnvVerdict.ok=true`、隔离根 `cleanup.rootRemoved=true`）。

| 字段 | 值 |
|---|---|
| 任务 / 来源 | **CLEAN-006**（A 段：记录面正确性批次；本复跑为该批的门禁面之一） |
| 命令 | `node docs\evidence\CLEAN-004\probe-clean-004.mjs --out %TEMP%\clean006-verify`（cwd = 仓库根；随机端口 + 隔离 `DSH_HOME` + 独立 headless Edge profile） |
| HEAD / 工作区 | `f7ca27f026ab2cf5ba58fc6a2e6a5a088153a65e`（CLEAN-006 提交前基点） / `headDirty=false` |
| 断言汇总 | **49 条 → PASS 47 / FAIL 0 / N-A 2**（N-A = `B5-found-sessions-area`、`D6-session-switch-close`） |
| 运行窗口 | `2026-09-15T04:24:31Z` → `2026-09-15T04:25:34Z`（本地 UTC+8 `12:24:31` → `12:25:34`，约 63 s） |
| 隔离 | `containment` 全真；`realEnvVerdict.ok=true` + `strictDeltas={}`；`envErrors=[]`；未终止/接管任何用户进程 |
| 本 `report.json` sha256 | `5dc9d4389c33cb359e753e68e9cc042e7bc5b7c0059bd8ee285e631143ccd540`（97362 B）——**R1 F-02 订正**：原表头写「本文件 sha256」，实为该报告文件的哈希 |
| 冻结资产（**只运行不改**） | `probe-clean-004.mjs` sha256 = `de2de511e89a8ccc6d08b29d529e51336079bc3ceab4b937795dad88d9065b65`（= 锚值） |

## 归档口径（CLEAN-006 **N-4**）

- **本目录 = 复跑报告归档位**（`docs/evidence/CLEAN-004-reruns/<task>-<head 短 sha>/`），位于**冻结资产目录之外**：每轮复跑一个子目录，**互不覆盖**。
- **记录运行仍为 `docs/evidence/CLEAN-004/report.json`**（`head=21b100ce…`、`tally 49/42/4/3` 的 R2 权威记录运行）——本目录**不替换**它，只承载「后续复跑」的证据。
- 归档动因（实录）：此前复跑报告只落 `%TEMP%`（如 `%TEMP%\clean007-verify\*`），临时目录清理后**外部审阅者无法按仓内路径复核**（`docs/review/BUG-010-R1.md` §6.2 已实证该限制）。
- **冻结面纪律**：`docs/evidence/CLEAN-004/{probe-clean-004.mjs,falsifiability-check.mjs,gen-defects-evidence.mjs}` 三轮 sha256 均与 README §3 登记值逐字一致（本轮未改动、未重写）；本目录新增不影响其不变量。

## 与基线的差异

与 `docs/evidence/CLEAN-004/report.json`（`head=21b100ce`，`tally 49/42/4/3`）逐条 `id:status` 比对：差异 5 条，**全部为改善方向**（`C3b-binding-convergence`/`C9-width-memory`/`C10-flip-side`/`D2-esc-bind-yield` FAIL→PASS；`C11-flip-back` N-A→PASS）⇒ **零 PASS→FAIL、零新增 FAIL**（差异与 CLEAN-005~CLEAN-007 已落地修复自洽；`docs/review/BUG-010-R1.md` §6.3 有同向比对）。N-A 集仍为 `B5-found-sessions-area` / `D6-session-switch-close`——其**归因已按 CLEAN-006 F6 订正**（成因 = 探针宿主会话行选择器 `button[class*="sessionRow"]` 对该宿主构建恒不命中，非「宿主无会话行」；见 `../CLEAN-004/README.md` §10-3 与 `../CLEAN-004/DEFECTS.md`）。
