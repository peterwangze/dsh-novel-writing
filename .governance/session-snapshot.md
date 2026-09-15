# 会话快照 — 2026-09-15（六项闭环：BUG-007 / UX-060 / BUG-009 / CLEAN-007 / BUG-010 / CLEAN-006）

**session_date**: 2026-09-15（会话自 2026-09-13 起，跨四次）
**工作流版本**: 0.81.0
**会话标识**: dsh-writing-workflow-20260913
**HEAD**: `ec1793c`（治理面）；**远端 main 已同步至 `ec1793c`**（产品提交全部已推送）

## 已完成（按时间序）

| 事项 | 结果 |
|---|---|
| **bootstrap 自升级** | 0.80.0 → **0.81.0** |
| **BUG-007（P0）** | persona 行 `config.text` → `config.prefix` + schema 面看护 + 隔离挂载冒烟 11/11；`355724c`；**R1 APPROVED_WITH_NOTES/0** |
| **UX-060（P1）** | 长告警改走标题栏下方 in-flow 流式面；`21b100c`；**R1 APPROVED_WITH_NOTES/0**；几何交集 2475.75/3901.5 px² → **0** |
| **UX-012 补审** | 回溯补审 APPROVED_WITH_NOTES/0 ⇒ Check 21 复审债务清零 |
| **CLEAN-004（验证资产）** | 审查链 **R1~R6**（2×NEEDS_CHANGE → 2×BLOCKED 熔断 → NEEDS_CHANGE(0) → APPROVED_WITH_NOTES/0）；后经 BUG-009/CLEAN-007/BUG-010 实证 **FAIL 数 4 → 0** |
| **BUG-009（P2）** | 卡片收敛迟滞：机制级 RCA（**证伪三条候选**）+ 渲染期实时求值；`6c434a0`；**R1 APPROVED_WITH_NOTES/0**；探针 `C3b`/`C9`/`C10` FAIL→PASS、`C11` N-A→PASS |
| **CLEAN-007（P2）** | D-1（Esc 只关面板）+ F2 创建链单点收口 + F6 三处模态 ARIA/焦点 + F7 行为探针入仓；`874e5a1`/`addd934`；**R1（含 C-1 P1 新引入）→ 返工 → R2 APPROVED_WITH_NOTES/0** |
| **BUG-010（P2）** | `WorkspaceDialog` 自挂 Esc（同族收口）；`a04ea89`；**R1 APPROVED_WITH_NOTES/0（产品代码零发现）** + 红态证据经裁定充分 |
| **CLEAN-006（P2）** | 验证资产/记录正确性（台账机检化 + F6 归因订正 + N-2~N-9）+ **F1 改走 `useSyncExternalStore`**；8 commit（`6f65bbe`/`535d798`/`947d642`/`2bf58d2`/`4590579`/`700709e`/`4b70182`/`602687c`）；**R1 NEEDS_CHANGE（P0×1 契约跨文件误重基）→ 返工 → R2 APPROVED_WITH_NOTES/0 → 返工 → R3 APPROVED_WITH_NOTES/0（终态）** |
| 新增任务 | **CLEAN-008**（UX-060 R1 备注项，自 CLEAN-006 显式转出）／**CLEAN-009**（CLEAN-006 R3 三条 P3）／BUG-008／BUG-010 |
| 风险 | **RISK-008 已关闭**（读取面 + 通知面均已处置）；窄化另立 **RISK-010**（F1 通道换 store 不重订阅的订阅真空，功能由 effect/resync 兜住）；RISK-009（宿主 `inert` 致焦点不可测）待真实实例核实 |
| 治理健康度 | 12 issues：Check 21/28c/30 全清；剩 **28s**（evidence-log 347 KB 超限）与 **36**（RISK-002 缓解口径过期）——两条均**待用户裁定** |

## 用户侧待办（**一次重启可同时验五项修复**）

1. 重启 DSH ⇒ 客观标志：`%DSH_HOME%\.agent-presets\novel-writing\.dsh-bundle-version` 由 `0.5.2` → **`0.5.3`**
2. **BUG-007**：创作台「继续工作流」/「绑定新会话」/ 宿主预设切换器三处失败消失
3. **UX-060**：长告警在标题栏**下方**整行流式面（可读完 + 关闭钮），横幅/⇄⟳☆ 不被遮挡
4. **BUG-009**：自动链建会话后卡片**不再长时间「会话失效」**（U-4；修复前 ≥2′06″ 未收敛、≈2′31.3″ 内收敛）
5. **CLEAN-007 / D-1**：绑定面板打开时 Esc **只关面板、控制台保持**；分栏态下 Esc **不连关两层**
6. **BUG-010**：工作区对话框（`.nv-modal`）打开时 Esc **只关它自己**
7. 其余按 `docs/verification/CLEAN-004-checklist.md` §8 + §9.2（U-1~U-14）；任一新失败 → 取告警原文回报

## 候选池（`task-priority-analysis`：110 任务 / 98 完成 / **10 unblocked** / 0 blocked）

- **发布 v0.5.3**：**五项修复 + 一条全绿验证资产**已就绪（`package.json` 已 0.5.3，CHANGELOG 在 `[Unreleased]`）⇒ 需你确认**范围 / 号段 / 回滚方案**后走发布链（三件套 + Release Reviewer）
- **CLEAN-008（P2）**：UX-060 R1 备注项（探针清理入 finally + 隔离口径 / smoke 断言改行为面 / 单帧叠字 / 证据固化入仓）
- **CLEAN-009（P2）**：CLEAN-006 R3 三条 P3（台账块头陈旧桶串 / 自证代理集与术语残留 / 契约成因叙述）
- **CLEAN-005（P2）**：BUG-007 R1 备注 + 契约面 3 全量重基 + smoke 判别力加固 + **新登记 1.7/2.4 陈旧锚点**
- **BUG-008（P2）**：`createProject` 失败不回滚 ⇒ 残留空目录
- **COMPAT-017（P9/v0.6.0）**：`probe-host --run` 真机面收口
- **治理 FAIL 处置**：RISK-002 缓解改「替代控制 + 观察日期」（对齐 DEC-027）／evidence-log 347 KB 归档对策（跨根缺陷阻塞自动归档）

## 并行调度条件（用户 2026-09-14 纠偏后固化）

七条必要条件：① 写集不相交 ② 无发生在先约束（审查链天然串行）③ 共享基线冻结 ④ 资源包络互斥 ⑤ **分支可落盘 = 并行单位 = 耐久单位** ⑥ 验证独立 ⑦ 编排容量 2~3 路。
**本会话教训**：CLEAN-004 自 R3 起写集仅 `docs/**`，与 BUG-009 完全不相交 ⇒ 本可并行，我却把产品修复排在整条审查链之后（根因：把「审查链必须串行」外推为「整个会话必须串行」）。
**重启语义**：subagent 是进程内子 agent ⇒ 重启杀死未落盘分支；跨会话续做靠**快照 + `agent-locks.json` + plan-tracker 任务行**外化状态。

## 判断失误与教训（如实，同族六次 + 两次自查抓到）

抄自述行数（EVD-108→109）｜引用失实 + 引用不存在的检查项（EVD-110）｜未验证并入 D-3（EVD-115 撤回）｜把伪 PASS 当结论汇报（R2 N-01）｜定点返工只改点名行 ⇒ 遗留 3 格错值（R4 NEW-R4-01）｜只改点名处 ⇒ 5 处 `≤2′31″` 漏改（R5 NEW-R5-02）；另有两次**我自己**的行内 `||` 把表格列切歪（工具抓出并修）。
**统一教训**：① 子代理给的新事实/新缺陷结论，未独立验证前不得写入治理记录或向你汇报；② 派发稿中的事实引用 MUST 以源文件实读为准；③ **文档订正 MUST 整表/全文逐格比对原件**（含全文档同措辞扫描、读实体谓词而非信 label）；④ **写入表格单元格的文本不得含裸 `|`**；⑤ **契约 `line` 的每个数值 MUST 按目标 file 分组算 Δ**（跨文件引用不得套用本文件 Δ——CLEAN-006 R1 P0 的根因）；⑥ **声称不得超过事实**：测试守卫的「ok/通过」结论必须与代码事实一致（本轮两处失实自述已在记录面订正）。

## 门禁基线（本会话实测）

`node --check` 23 文件 0 failed ｜ `validate-preset` **PASSED**（schema-face PASS）｜ `smoke` **302 passed / 0 failed**（282 → 286 → 291 → 293 → 297 → 301 → 302）｜ 隔离挂载冒烟 11/11 ｜ 几何探针红/绿（2475.75/3901.5 px² → 0）｜ **冻结 CLEAN-004 探针 49 / 47 PASS / 0 FAIL / 2 N-A**（`head=4b70182`、`headDirty=false`，归档 3 份于 `docs/evidence/CLEAN-004-reruns/`）｜ `scripts/probe-nv-ux012.mjs` 全量 27 / 23 PASS / 0 FAIL / 4 N-A（`--falsifiability`：`RUNTIME-LEDGER-CHECK 10/10` + 注入 8/8 + red 29 / ok 12）｜ `falsifiability-check` CHECK-OK ｜ `gen-defects-evidence --check` IN-SYNC ｜ `governance-write-guard` PASS ｜ `check-locks` PASS ｜ `check-review-debt` PASS
