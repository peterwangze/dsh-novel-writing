# 会话快照（2026-11-07~08 深场：兼容性系统性优化 + BUG-012 + 全量看护）

## 本会话交付（全部 committed + pushed）

| 任务 | commit | 结论 |
|---|---|---|
| COMPAT-020 预设热修 | `444d18f`/`2fd2446` | 真机验收 PASS（用户确认） |
| COMPAT-021 设计系统 | `c5442e1`/`2d7d162` | 五代际清单 + 行级预检（R2 AWN） |
| BUG-012 工作台消失 | `f2d9ab8`/`817f990`/`6acf5b7` | hooks 双违规修复；**真机验收 PASS（2026-11-08「已经可用」，EVD-147）** |
| COMPAT-023 全依赖面看护 | `3d12ccb`/`004626b` | surfaceEvidence 30 格 + 探针三件修复（R2 APPROVED 0/0/0，EVD-146） |
| CLEAN-014 探针判据刷新 | `6e0b4ba` | C5 双臂判据 8/8 绿（R1 AWN P2=0） |
| COMPAT-018 收口复核 | `30efb92`/`fce9251` | probe-host 实跑通道修复 + 0.2.2/0.2.0 双代实跑（R2 APPROVED 0/0/0，EVD-149） |
| COMPAT-022 提案 | — | **关闭（DEC-161 用户决策：维持静态行 + 看护）** |

## 关键学习（下会话必读）

1. **BUG-012 真根因**：插件自身 Rules-of-Hooks 违规（非宿主槽位变更——那是登录遮罩误诊）；四代宿主同雷；smoke 现有块状早退守卫（判别力 8/8）。
2. **npm tarball = 桌面事实源**；宿主 client 包栈承载槽位消费；探针首跑门（预览版说明对话框 + sign-in 遮罩）必须处置。
3. **probe-host 实跑模式已可用**（hostSpawn ComSpec /d /c 无 /s + assertHostCmdSafe + --stage-plugin 追加式装载）；0.2.0-rc.2 经 npm pack + bin.js 直跑。
4. **治理坑**：refs `k=v`（task-row-update）vs `k:v`（evidence-append）；evidence description 必含「目标对齐：」；状态单元词形敏感；locks-release 仅 --task。

## 待办（优先级序）

1. **CLEAN-015**（P2 已立案，triage 在册）：probe-host 实跑面收尾——①L1 row-2 真空判定修复（payload.probes→report.probes + notOk 细分 + REAL-RUN 标记翻转配套 smoke 守卫）②host-surfaces fixtures 0.2.x 化（契约 current/versionFacts/requiredExports 重基 SettingsProvider→SettingsForms）③ci.yml mock 面 4 处对齐 0.2.x。
2. **COMPAT-021 §12.2 两勾选**：预检证据归档补 [x]（evidence 在 docs/evidence/COMPAT-021/ 已有 7 文件——核对后勾）+ R2+ 复审状态更新（R2 已过，勾选）。
3. COMPAT-021 P3 遗留 F6/F7/F8；CLEAN-010 安装器健壮性；UX-061/UX-062；治理债 18e/18f。
4. **standing triggers**：宿主正式版发布 → ①双表面窗口复核（COMPAT-018③）②预设面若再断且热修成本上升 → 重评 COMPAT-022（DEC-161）③preflight/manifest 证据刷新。
5. 版本仍 0.5.3；发布号待 Release Gate 用户确认。

## 环境事实

- 探针 DSH_HOME `C:\Users\peter\AppData\Local\Temp\dsh-O6knv8\dsh-compat-probe`；桌面 `D:\app\dsh`（0.2.2-rc.1）；npm-global 0.2.1；0.2.0-rc.2 CLI 解包留存 `%TEMP%\c018\`。
- smoke 342；pf test 16；anchors 79 段；preflight --surfaces 30 格（24/6/0/0 pristine）。
- `tpa-last-run.json` 不提交；`plan-tracker.md.lock` 空锁可删（会复现）。
- 桌面进程组勿杀；探针端口 3080-3082/3210-3220 用后确认释放。
