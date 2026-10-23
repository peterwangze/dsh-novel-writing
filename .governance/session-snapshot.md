# 会话快照 — 2026-10-23（UX-063 P0-a 第①步交付 + 治理健康债清偿）

**session_date**: 2026-10-23
**工作流版本**: 0.98.0（Scenario F；always-on × maximum-autonomy；behavior modern）
**会话标识**: dsh-writing-workflow-20261023-ux063-p0a-step1
**HEAD**: `UX-063: P0-a 第①步交付…`（22 文件，含 4 份审查报告与 4 条机录 REVIEW 行）
**上一会话**: 2026-10-22 UX-063 规格 v3 评审通过后中断（该步零代码落盘、锁过期）

## 一、本轮结论（EVD-139）

1. **UX-063 P0-a 第①步已交付**：全屏工作台（`.nv-split` 左缘=g.left、宽=colW）+ 420px 对话抽屉（48px 唤出条、z920、localStorage `dsh.novel.drawer.v1`）+ 开启态手柄门 `colW≥1046`（窄带不渲染、Esc 优先关抽屉、提示含 Esc 出口）+ 让位（收文件树 240/章节列 160，正文列 `min(544, colW−44−376−24)`）+ 五路径 `restoreViewArea`（15 属性单点、5 调用点）+ `host-contract` item 3.3（覆盖 `applyDrawer` 五写）/ 3.7 锚点（1017/1019/1069/1127 逐行吻合）。
2. **门禁**：`node --check` ×4 = 0；`smoke` **324/0**；`geometry` OK（真实左偏移 11 + 抽屉∩正文 / 手柄∩正文正交判据 + 六档）；`anchors` 79 段 FAIL=0；`contrast` 0 项 <4.5；`validate-preset` PASSED。
3. **审查链**：R4 DR1 NEEDS_CHANGE/2 → 返工 → **R6 DR2 APPROVED_WITH_NOTES/0**；R5 CR1 NEEDS_CHANGE/1 → 返工 → **R7 CR2 APPROVED_WITH_NOTES/0**。变异判别力 M1/M2/M3/M5 必红，M4 揭示 `syncAnchor` 调用级断言缺口（转第②步首批）。
4. **治理健康**：check-governance **73 → 30 issues**（锁清零、18c 执行包补齐、16/17 证据字段回填、18/18b 结构化事实补齐、EVD-137 表格错列修复）。

## 二、关键事实与裁决（DEC-157）

- **几何裁决**：开发者「左侧 chrome 58px ⇒ 抽屉遮挡 34px」的推断**作废**——44px rail 渲染点在底部工作台 `midFooter`（`client.js:4497 ⊂ 4485`），上部正文区真实左偏移 = **11px**（`.nv-split` border 1 + padding 10）⇒ **抽屉本体零遮挡成立**（988 档实测余量 13px），规格 §3 真值表不修订。
- **真实缺陷**是自加的开启态手柄：`colW<1046` 时覆盖正文右缘（1280×800 → 23px、1268/1236 → 35px）——已修（手柄门 + Esc 优先级 + 提示阈值）。
- **规格 v3.1（§8）**：6 条事实回填（`restoreViewArea` 为新实现、手柄门 1046、真实偏移 11、740–956 实测无遮挡 / 真实遮挡仅 `colW<591`、抽屉态可见面、公式预留 vs 实测余量口径）。
- **措辞边界（重要）**：第①步独立可感知差异仅 **3~4 处**（全宽 / 对话→抽屉 / 行宽 236→**510** / 窄窗提示），**不足 ≥5 硬闸门** ⇒ 只能称「P0-a 第①步已交付」，**不得**称「P0-a 已交付 / 视觉验收通过」，**不得**提前请用户目检（否则重演 UX-061「变化不大」）。544 行宽要等第③步（16px reading）。

## 三、跨会话待办（按优先级）

1. **UX-063 第②步（任务流首页：`.nv-home` 880 / CTA 36 / 双源 overview+detail / 紧凑换书 / 待办点击目标）**——首批并入本步审查备注 7 项：CR2 P2-1（`syncAnchor` 旧节点还原调用级断言）、P2-2（单行 item `line` 机检 + F4 措辞改「守卫现状」）、P3-1（行数账 5658→5664、契约 +224→+257）、P3-2（3.3 第 4 段越界 7 行进 `toggleDrawer`）；DR2 P2-1（<740 提示补 Esc）、P3-1/P3-2（硬编码 11/23 守卫）、P3-7（拖线与手柄 4px 热区）。第③步 = 正文 16/1.9 + 中文排版 + N-1(a)。
2. **UX-062**（P1，user-named）——优先级分析 top pick；范围含骨架屏 + ⌘K。
3. **CLEAN-013**（P1，machine-signal）——隔离矩阵可审计化；同时是 RISK-013 缓解引用项。
4. **真机 CDP 通道修复**（归 COMPAT-018）：宿主 **0.2.1-rc.2** 的 `@deepseek-ai` 闭包**已无 `dsh-app-boot`**，`probe-nv-bar-geometry.mjs` / `probe-nv-ux012.mjs` boot 即 `ERR_MODULE_NOT_FOUND` ⇒ 迁移表 §E 真机证据与跨子树 z-order 均不可得（**不得**称「已验证」）。
5. 既有债：Check 30（UX-061/UX-063 复审轮缺 R0——历史编号从 R1 起的约定漂移；后续任务首轮应从 R0 记）、Check 36（RISK-002/013 缓解引用未完成任务）、Check 37（G8 vs G6/G7，DEC-029 留痕）、Check 18e/18f/18g 对未交付任务的生命周期闸门（随各自交付翻绿）。

## 四、环境与方法事实（下轮复用）

- 治理健康检查 `Check 5` 的「G5 条件通过无纠正任务」为**上游误报**：判据只解析 `## 样例跟踪表` 段（本仓用 `## 当前活跃事项`）⇒ `task_rows` 恒空；已挂 SYSGAP-001。
- 证据行若含**未转义 `|`**（如 `||` 运算符）会破坏列对齐 → 表现为「证据位置为空」类假故障；修复 = 转义为 `\|\|`。
- `plan-tracker` 状态单元格**行首标记决定机器分类**：`✅` = 已完成（会从候选池消失）、`🔄` = 在途；跨步交付的任务 MUST 用 `🔄` 并写明「第 N 步已交付，后续未开工」。
- 审查报告走 `review-record`（机录 + sha256 钉住 + `next_round`/`revisit_required` 义务链）；`NEEDS_CHANGE` 自动登记复审义务，复审通过即 `cleared`。
- 变异测试（判别力）一律在 `%TEMP%` 副本执行；就地变异必须哈希还原并复跑门禁。
