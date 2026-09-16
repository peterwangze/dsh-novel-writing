# Feature Flag 状态 — v0.5.3（2026-09-15）

- **关联任务**：REL-007（发布 v0.5.3 —— 修复批承载）
- **检查清单**：`docs/release/release-checklist-0.5.3.md`；**回滚方案**：`docs/release/rollback-plan-0.5.3.md`
- **版本性质**：补丁号承载修复批（0.x 阶段口径），**无 breaking change**

## 1. 本版 Feature Flag 清单

| # | Flag | 类型 | 默认值 | 本版状态 | 说明 |
| --- | --- | --- | --- | --- | --- |
| — | （无） | — | — | **不适用** | **本版无新增/变更 feature flag**（本批为纯缺陷修复 + 验证资产/记录面收口；无渐进放量、无需 flag 灰度、无 flag 债务） |

> **显式声明（非留空）**：本版既**未新增**、也**未变更**任何 feature flag；**无 flag 启用/关闭流程**、**无 flag 清理计划**（N/A）。回滚**不依赖**关 flag——回滚即版本回退（见 `rollback-plan-0.5.3.md`）。

## 2. 「不适用」的事实依据（P-01 取证，非推断）

| 取证项 | 命令/位置 | 实测结果 |
| --- | --- | --- |
| 产品代码无 feature flag 机制 | `Select-String -Path lib\*.js,lib\*.mjs -Pattern 'featureFlag\|feature_flag\|FEATURE_FLAG\|flagEnabled'` | **0 命中** |
| 本批产品代码改动面 = **3 路径**（**2 个 `lib/` 文件 + 1 个预设文件**） | `git diff --stat v0.5.2..HEAD -- lib/ agent-presets/` | `lib/client.js`（+558/−…）、`lib/host-contract.mjs`（+92/−…）、`agent-presets/novel-writing/agent.cordis.yml`（8 行）= `3 files changed, 531 insertions(+), 127 deletions(-)`；`lib/index.js`、`lib/tools.js`、`lib/host-boundary.js` **零改动**（**口径订正**：本行原标「= **2 文件**」，与同格列举的 **3 路径**自相矛盾；来源 `docs/review/REL-007-R1.md` F-05） |
| 本批未引入 flag 载体 | 上述 diff 内容面 | 两处改动分别为：客户端 UI 行为修复（Esc 让位链 / 告警流式面 / 会话镜像 hook / 模态 ARIA 与焦点）+ 契约行号重基与 `revisions[]` 注记；**无开关分支、无灰度分支** |

> 取证时点 = 2026-09-16（REL-007 发布准备期）。`v0.5.2` = 上一发布 tag（对象 `793dde78…` → peel `914725f8…`）；范围下界用**绝对 ref**（`v0.5.2`），任何时点复跑结果一致。

## 3. 既有等效控制面（本版行为零变化，仅登记）

本插件无 flag 框架，但存在**既有的运行时控制面**，本批**未修改其行为**（`lib/index.js` 未进入本批 diff）：

| 控制面 | 位置 | 语义 |
| --- | --- | --- |
| 插件级总开关（等效 kill switch） | `lib/index.js` L42 `enabled: z.boolean().default(true)`（注释 + `assertEnabled()`） | `enabled=false` ⇒ 拒绝全部变更操作与 HTTP API（读配置即时生效）；smoke 断言看护「`enabled=false 拒绝变更/不落盘`」 |
| 逐平台发布开关 | `lib/index.js` L53（平台 schema `enabled`）+ L61-64（番茄/起点/晋江/七猫默认 `enabled: false`, `mode: 'export'`） | 控制各平台发布通道是否启用 |

## 4. 本版「发布与启用解耦」评估

| 判据 | 结论 |
| --- | --- |
| 是否存在「已 deploy 但未 release」的功能面？ | **否**——本批全为既有功能面内的缺陷修复，**不新增功能**，无需按 flag 控制可见性 |
| 发布后是否需要按 flag 灰度放量？ | **否**——无用户基数敏感的接口/数据面变更；风险面为 UI 行为与预设挂载（`BUG-007` 为 P0 但已闭环：隔离实例 11/11 + `validate-preset` 行 × 已装宿主 schema 机检） |
| 回滚是否依赖 flag 关闭？ | **否**——回滚 = 版本回退（`v0.5.2`），实测残余 0（`R0(全新 v0.5.2) vs C3(回滚末端)` diff=0） |
