# 会话快照（2026-11-07 深场：COMPAT-020/021 收尾 + BUG-012 + COMPAT-023）

## 本会话交付（全部 committed + pushed）

| 任务 | commit | 结论 |
|---|---|---|
| COMPAT-020 预设热修 | `444d18f` + 真机验收 `2fd2446` | 用户确认预设可选入会话 |
| COMPAT-021 设计系统 | `c5442e1`/`2d7d162` | 五代际清单 + 行级预检 + 12 组断言 |
| BUG-012 工作台消失 | `f2d9ab8` + `817f990` | hooks 双违规修复 + 守卫；R2 AWN |
| COMPAT-023 全依赖面看护 | `3d12ccb` + `004626b` | surfaceEvidence 30 格 + 探针三件修复；R2 APPROVED 0/0/0 |

## 关键学习（下会话必读）

1. **BUG-012 真根因**：不是宿主槽位变更——是插件自身 Rules-of-Hooks 违规（SplitWorkspace effect 在早退后 + ChapterPanel listRef 在早退后），点书卡 → React #310 → SlotErrorBoundary 卸载。四代宿主同雷。初判「宿主不再消费 shell.overlay」是**登录遮罩误诊**（点击从未送达）——探针必须处置首跑门（预览版说明对话框 + sign-in 遮罩）。
2. **npm tarball = 桌面事实源**（app.asar 与 npm 包逐字节等价已证）；宿主 client 包栈（dsh-client-ui-layout/runner/modules/renderer）承载槽位消费，web index/vendor 无槽名字面量是正常的。
3. **探针可行模式**：`$env:DSH_HOME=<隔离>` + 官方 CLI `--profile probe --no-open --port 3080` + token 取 stdout；Playwright 工具链 `D:\AI\dev_toolchain\browser_test_tool_list\node-with-playwright.cmd`；浏览器进程必须系统 env 原样（重定向 APPDATA ⇒ Edge 即退）；只杀自启进程树。
4. **治理坑**：refs 格式 task-row-update 用 `k=v`、evidence-append 用 `k:v`；evidence description 必须含「目标对齐：」；状态单元标记词形敏感（`✅完成` 后不得残留歧义词形）；locks-release 无 --session/--reason 参数。

## 待办（优先级序）

1. **用户真机复验 BUG-012**：重启 DSH 桌面 → 点小说书卡 → 工作台应出现（待用户反馈）。
2. **CLEAN-014**（P2 已立案）：bar-geometry C5 判据形态感知刷新（chip/row 分形判据或 Range 回退）+ 顺带 R2-N1（--surfaces --global-root 坏路径 fail-fast 统一）。
3. **COMPAT-018 收口复核**：探针通道已修好（本会话产物），其遗留②「probe-host 对 0.2.0 实跑」可执行了。
4. **COMPAT-022**（运行时自适应预设提供器）提案——需用户关键决策，尚未立项。
5. COMPAT-021 P3 遗留 F6/F7/F8；CLEAN-010 安装器健壮性；UX-061/UX-062；治理债 18e/18f。
6. 版本仍 0.5.3；发布号待 Release Gate 用户确认。

## 环境事实

- 探针 DSH_HOME：`C:\Users\peter\AppData\Local\Temp\dsh-O6knv8\dsh-compat-probe`（profile probe，含 diag-preset 定时器——无害）；桌面 host closure `D:\app\dsh`（0.2.2-rc.1）；npm-global dsh 0.2.1 对照。
- 桌面进程组（11:23:27 起）勿杀；探针进程已全部清理（3080/3081 释放）。
- smoke 计数 342；preflight test 16 组；anchors 79 段。
- `.governance/tpa-last-run.json` 维持不提交模式；`plan-tracker.md.lock` 空锁文件可删（会复现，无害）。
