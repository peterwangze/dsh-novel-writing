# 会话快照 — 2026-09-15（BUG-007／UX-060／BUG-009／CLEAN-007 四项闭环；CLEAN-004 资产全绿）

**session_date**: 2026-09-15（会话自 2026-09-13 起，跨三次）
**工作流版本**: 0.81.0
**会话标识**: dsh-writing-workflow-20260913
**HEAD**: `addd934`（产品）｜远端 `main` 已推至 `d562247`（CLEAN-007 两个 commit **未 push**）

## 已完成（按时间序）

| 事项 | 结果 |
|---|---|
| **bootstrap 自升级** | 0.80.0 → **0.81.0**（`AGENTS.md` 标记面 + plan-tracker 版本行；EVD-104） |
| **BUG-007（P0）** | `config.text` → `config.prefix`（dsh-persona rc.2 必填键）+ schema 面看护 + 隔离挂载冒烟 11/11；**`355724c`**；**R1 APPROVED_WITH_NOTES/0** |
| **UX-060（P1）** | 长告警改走标题栏下方 in-flow 流式面；**`21b100c`**；**R1 APPROVED_WITH_NOTES/0**；红/绿几何交集 2475.75/3901.5 px² → **0** |
| **UX-012 补审** | 回溯补审 APPROVED_WITH_NOTES/0 ⇒ **Check 21 复审债务清零** |
| **CLEAN-004（验证资产）** | 审查链 **R1~R6**（2×NEEDS_CHANGE → 2×BLOCKED 熔断 → NEEDS_CHANGE(0) → **APPROVED_WITH_NOTES/0**）⇒ 判可交付；**R6 后经 BUG-009/CLEAN-007 实证其 FAIL 数 4 → 0**（`49 / 47 PASS / 0 FAIL / 2 N-A`，2 条 N-A = 宿主前置不可得） |
| **BUG-009（P2 产品缺陷）** | 卡片收敛迟滞：机制级 RCA（**证伪三条候选**）+ 渲染期实时求值（净增 0 行 / 契约零漂移）；**`6c434a0`**；**R1 APPROVED_WITH_NOTES/0**；探针 `C3b`/`C9`/`C10` FAIL→PASS、`C11` N-A→PASS |
| **CLEAN-007（P2 备注批次 + D-1）** | **`874e5a1`**（6 文件 +1351/−102）+ **`addd934`**（返工 5 文件 +257/−87）；**R1 = APPROVED_WITH_NOTES/0**（C-1 P1 / C-2 P2 / C-3 P2 / C-4~C-13 P3）→ 定点返工 → **R2 = APPROVED_WITH_NOTES/0（可 merge + push）**；D-1（Esc 只关面板）已修 + 本轮新引入的 **C-1 P1（分栏态 Esc 关两层）** 已修且红/绿双态可结构判定；**契约两次重基**（18 项 / 29 处） |
| 新增任务/风险 | **BUG-010**（`WorkspaceDialog` 无自挂 Esc，与 D-1 同族）／**RISK-008**（渲染期读可变 store 未走 `useSyncExternalStore`）／**RISK-009**（宿主 `inert` 致插件子树焦点不可测）／CLEAN-006 扩展（BUG-009 F1·F6 + CLEAN-007 N-1~N-7） |
| 治理健康度 | `11 → 9 issues`：Check 21/28c/30（R4 漏机录）已清；剩 **28s**（evidence-log 331 KB 超限）与 **36**（RISK-002 缓解口径过期）——两条均待你裁定 |

## 用户侧待办（重启一次可同时验证四项）

1. 重启 DSH ⇒ `ensurePreset()` 重同步；客观标志 = `%DSH_HOME%\.agent-presets\novel-writing\.dsh-bundle-version` 由 `0.5.2` → **`0.5.3`**
2. **BUG-007**：创作台「继续工作流」/「绑定新会话」/ 宿主预设切换器三处失败消失
3. **UX-060**：长告警在标题栏**下方**整行流式面（可读完 + 关闭钮），标题栏横幅/⇄⟳☆ 不被遮挡
4. **BUG-009**：自动链建会话后卡片**不再长时间显示「会话失效」**（U-4；实测口径 = 修复前 ≥2′06″ 未收敛、≈2′31.3″ 内收敛）
5. **CLEAN-007 / D-1**：绑定面板打开时按 **Esc 应只关面板、控制台保持**（U-8）；且分栏态下 Esc **不应连关两层**
6. 其余按 `docs/verification/CLEAN-004-checklist.md` §8 + §9.2 的 U-1~U-14；任一新失败 → 取告警原文回报，按新根因另立缺陷

## 候选池（`task-priority-analysis` 口径：107 任务 / 95 完成 / 10 unblocked / 0 blocked）

- **CLEAN-006（P2，现为最大宗资产债）**：UX-060 R1 备注 + 探针装配去重（F-10）+ R3-03 机证硬化 + R3-09 闸门行 + **BUG-009 F1（`useSyncExternalStore`，与 RISK-008 同源）/ F6（探针宿主会话行选择器缺口 + 归因订正）** + **CLEAN-007 N-1~N-7**（N-1 = 计数失真 P2，其余 P3）
- **BUG-010（P2）**：`WorkspaceDialog` 无自挂 Esc（同 D-1 根因）；修复 = 自挂 Esc（只关本层）+ 断言
- **BUG-008（P2）**：`createProject` 失败不回滚 ⇒ 残留空目录（UI 不可见、重名被拒、无自愈）
- **CLEAN-005（P2）**：BUG-007 R1 备注（契约 5 行号 + 面 3 全量重基 + smoke「≤ 文件长度漂移」判别力）
- **COMPAT-017（P9/v0.6.0）**：`probe-host --run` 真机面收口（P2-3 三值语义 / P2-4 隔离硬校验 + 016-R1 P3×7）
- **发布 v0.5.3**：三项修复 + CLEAN-007 已就绪（`package.json` 已 0.5.3，CHANGELOG 在 `[Unreleased]`）；**属关键决策，需你确认范围/号段/回滚方案**
- **治理 FAIL 处置**：RISK-002 缓解改「替代控制 + 观察日期」（对齐 DEC-027）／evidence-log 331 KB 归档对策（跨根缺陷阻塞自动归档）

## 并行调度条件（用户 2026-09-14 纠偏后固化；下批直接用）

七条必要条件：① 写集不相交（`file_locks` 重叠 ⇒ 串行或 worktree 隔离）② 无发生在先约束（审查链天然串行，并行度 0）③ 共享基线冻结（要改则作为第一个串行分支）④ 资源包络互斥（端口/profile/DSH 实例/TEMP）⑤ **分支可落盘 = 并行单位 = 耐久单位** ⑥ 验证独立（并行分支不得互审）⑦ 编排容量 2~3 路。
**本会话教训**：CLEAN-004 自 R3 起写集仅 `docs/**`，与 BUG-009 完全不相交 ⇒ **本可并行**，我却把产品修复排在整条审查链之后 —— 根因是把「审查链必须串行」（条件②）错误外推为「整个会话必须串行」。
**重启语义**：subagent 是进程内子 agent（无独立服务）⇒ 重启杀死未落盘分支；跨会话续做靠**快照 + `agent-locks.json` + plan-tracker 任务行**外化状态。

## 判断失误与教训（如实，同族已六次）

抄自述行数（EVD-108→109）｜引用失实 + 引用不存在的检查项（EVD-110）｜未验证并入 D-3（EVD-115 撤回）｜把伪 PASS 当结论汇报（R2 N-01）｜定点返工只改点名行 ⇒ 遗留 3 格错值（R4 NEW-R4-01）｜只改点名处 ⇒ 5 处 `≤2′31″` 漏改（R5 NEW-R5-02）；另有两次**我自己**的行内 `||` 把表格列切歪（evidence-log 两条 + plan-tracker CLEAN-006 行，工具已抓出并修）。
**统一教训**：① 子代理给的新事实/新缺陷结论，未独立验证前不得写入治理记录或向你汇报；② 派发稿中的事实引用 MUST 以源文件实读为准；③ **文档订正 MUST 整表/全文逐格比对原件**（含全文档同措辞扫描、读实体谓词而非信 label）——只改被点名的行 = 必然复发；④ **写入表格单元格的文本不得含裸 `|`**（逻辑或用 `∨`）。

## 门禁基线（本会话实测）

`node --check` 23 文件 0 failed ｜ `validate-preset` **PASSED**（schema-face PASS）｜ `smoke` **297 passed / 0 failed**（282 → 286 → 291 → 293 → 297）｜ 隔离挂载冒烟 11/11 ｜ 几何探针红/绿（2475.75/3901.5 px² → 0）｜ **冻结 CLEAN-004 探针 49 / 47 PASS / 0 FAIL / 2 N-A**（`head=addd934`、`headDirty=false`）｜ `falsifiability-check` CHECK-OK ｜ `scripts/probe-nv-ux012.mjs --falsifiability` PASS（11 谓词 / 25 red + 11 ok）｜ `gen-defects-evidence --check` IN-SYNC ｜ `governance-write-guard` PASS ｜ `check-locks` PASS ｜ `check-review-debt` PASS
