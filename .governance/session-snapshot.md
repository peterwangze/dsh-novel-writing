# 会话快照（2026-11-07~08 深场：兼容性系统性优化 + BUG-012 + 全量看护 + UX-064 设计评审）

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

## 2026-11-08 追加：UX-064 设计评审（待用户审核，零产品代码）

- **交付**：`docs/design/UX-064-mockups/` 4 页可交互稿（书斋 / 空态 / 写作台 / 组件）+ 9 张 2× 截图 + 九图总览 + 3 张旧版对照；`docs/design/UX-064-redesign-proposal.md`；`verify-mockups.py` 实跑 PASS / exit 0。
- **方向**：墨纸 / 文学编辑体；书斋 = 当前书 + 上次写到 + 续写第 39 章 + 书架；写作台 = 顶栏 + 章节目录 + 588 稿纸 + 300 协作 + 状态栏 + 专注 680；空态 = 一句话 + 一个主按钮 + 开书三步。
- **事实边界**：写作台正文为真实第 38 章《排班表》结尾原文；书架另 3 本 / 对话差异为示意并标注；时间按本地时区：工作流统计状态 9月23日 11:37，本章正文保存 8月25日 22:26（两者不混用）。
- **状态**：DEC-162 待用户审核（plan-tracker UX-064 P0 open；packet UX-064；EVD-150）。审核通过前零产品代码改动；通过后 S1 书斋 → S2 写作台 → S3 收口。旧治理债（31 issues）未因本次设计变绿，不在评审时假装 PASS。
- **审核入口**：`docs/design/UX-064-mockups/shots/00-contact-sheet.png` + proposal §10；四页 HTML 可直接浏览器打开。

## 关键学习（下会话必读）

1. **BUG-012 真根因**：插件自身 Rules-of-Hooks 违规（非宿主槽位变更——那是登录遮罩误诊）；四代宿主同雷；smoke 现有块状早退守卫（判别力 8/8）。
2. **npm tarball = 桌面事实源**；宿主 client 包栈承载槽位消费；探针首跑门（预览版说明对话框 + sign-in 遮罩）必须处置。
3. **probe-host 实跑模式已可用**（hostSpawn ComSpec /d /c 无 /s + assertHostCmdSafe + --stage-plugin 追加式装载）；0.2.0-rc.2 经 npm pack + bin.js 直跑。
4. **治理坑**：refs `k=v`（task-row-update）vs `k:v`（evidence-append）；evidence description 必含「目标对齐：」；状态单元词形敏感；locks-release 仅 --task。

## 待办（优先级序）

1. **UX-064 设计审核（P0，用户 gate）**：九图 + 提案待用户目检；通过后 S1–S3，未通过只改点名屏幕；审核前零产品代码。
2. **CLEAN-015**（P2 已立案，triage 在册）：probe-host 实跑面收尾——①L1 row-2 真空判定修复（payload.probes→report.probes + notOk 细分 + REAL-RUN 标记翻转配套 smoke 守卫）②host-surfaces fixtures 0.2.x 化（契约 current/versionFacts/requiredExports 重基 SettingsProvider→SettingsForms）③ci.yml mock 面 4 处对齐 0.2.x。
3. **COMPAT-021 §12.2 两勾选**：预检证据归档补 [x]（evidence 在 docs/evidence/COMPAT-021/ 已有 7 文件——核对后勾）+ R2+ 复审状态更新（R2 已过，勾选）。
4. COMPAT-021 P3 遗留 F6/F7/F8；CLEAN-010 安装器健壮性；UX-061/UX-062 收口；治理债 18e/18f。
5. **standing triggers**：宿主正式版发布 → ①双表面窗口复核（COMPAT-018③）②预设面若再断且热修成本上升 → 重评 COMPAT-022（DEC-161）③preflight/manifest 证据刷新。
6. 版本仍 0.5.3；发布号待 Release Gate 用户确认。

## 环境事实

- 探针 DSH_HOME `C:\Users\peter\AppData\Local\Temp\dsh-O6knv8\dsh-compat-probe`；桌面 `D:\app\dsh`（0.2.2-rc.1）；npm-global 0.2.1；0.2.0-rc.2 CLI 解包留存 `%TEMP%\c018\`。
- smoke 342；pf test 16；anchors 79 段；preflight --surfaces 30 格（24/6/0/0 pristine）。
- `tpa-last-run.json` 不提交；`plan-tracker.md.lock` 空锁可删（会复现）。
- 桌面进程组勿杀；探针端口 3080-3082/3210-3220 用后确认释放。
