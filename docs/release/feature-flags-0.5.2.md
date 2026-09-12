# Feature Flag 状态 — v0.5.2（2026-09-12）

- **关联任务**：REL-006（发布 v0.5.2 —— BUG-006 安装通道适配承载）
- **发布记录**：`docs/review/REL-006-release-notes.md`；**检查清单**：`docs/release/release-checklist-0.5.2.md`

## 1. 本版 Feature Flag 清单

| # | Flag | 类型 | 默认值 | 本版状态 | 说明 |
| --- | --- | --- | --- | --- | --- |
| — | （无） | — | — | **不适用** | 本版**未引入任何 feature flag**（纯安装脚本适配 + 元数据/治理记录变更，零产品代码改动） |

## 2. 「不适用」的事实依据（P-01 取证，非推断）

| 取证项 | 命令/位置 | 实测结果 |
| --- | --- | --- |
| 产品代码无 feature flag 机制 | grep `featureFlag\|feature_flag\|FEATURE_FLAG\|flagEnabled` 于 `lib/*.js` `lib/*.mjs` | **0 命中** |
| 本版改动面不含代码 | `git diff e1f25df8^ e1f25df8 --name-only`（**绝对 SHA**；`e1f25df8` = v0.5.2 发布提交） | 恰 4 文件：`CHANGELOG.md` / `package.json` / `.governance/plan-tracker.md` / `docs/review/REL-006-release-notes.md` —— **零 `lib/**` 改动** |

> **取证时点（F9 订正）**：上表取证命令原为相对引用 `git diff HEAD~1 HEAD --name-only`——当时 HEAD = `e1f25df8`，此后 HEAD 前进（`e093e72` 及后续治理提交）⇒ 原命令**事后不可复算**。现改为**绝对 SHA** `git diff e1f25df8^ e1f25df8 --name-only`，任何时点复跑结果恒为上述 4 文件。**原始取证时点 = 2026-09-12**（REL-006 发布提交落盘后、本工件补建时）；**订正时点 = 2026-09-12 返工轮**（REL-006 R1 复审 F9）。

## 3. 既有等效控制面（本版行为零变化，仅登记）

本插件无 flag 框架，但存在**既有的运行时控制面**，本次发布**未修改其行为**：

| 控制面 | 位置 | 语义 |
| --- | --- | --- |
| 插件级总开关（等效 kill switch） | `lib/index.js` L42 `enabled: z.boolean().default(true)`；L102-103 注释 + `assertEnabled()` | `enabled=false` ⇒ **拒绝全部变更操作与 HTTP API**（读配置即时生效；`enabled=false 拒绝变更/不落盘` 由 smoke 断言看护） |
| 逐平台发布开关 | `lib/index.js` L53（平台 schema `enabled`）、L61-64（番茄/起点/晋江/七猫默认 `enabled: false`, `mode: 'export'`） | 控制各平台发布通道是否启用 |

> 结论：本版**无 flag 需启用/关闭**，**无 flag 债务**，**无需 flag 清理计划**（N/A）。回滚不依赖关 flag——见 `docs/release/rollback-plan-0.5.2.md`（改写安装通道版本即回退）。
