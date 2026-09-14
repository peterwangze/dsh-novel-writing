# 会话快照 — 2026-09-14（BUG-007/UX-060 闭环 + UX-012 补审清零 + CLEAN-004 自动化面终审通过）

**session_date**: 2026-09-14
**工作流版本**: 0.81.0
**会话标识**: dsh-writing-workflow-20260913（2026-09-13 起，跨夜两次）
**HEAD**: `21b100c`（产品）｜工作树另含 `.governance/**`、`AGENTS.md`、`docs/**` 未提交改动

## 本会话完成

| 事项 | 结果 |
|---|---|
| **bootstrap 自升级** | 0.80.0 → **0.81.0**（`AGENTS.md` 标记面 + plan-tracker 版本行；模板体差分核验零改动）；EVD-104 |
| **BUG-007（P0）闭环** | `config.text` → `config.prefix`（dsh-persona rc.2 必填键）+ 全预设行 schema 核验 + 新看护 `test/fixtures/host-surfaces/preset-schema-face.mjs` + 隔离挂载冒烟 11/11；**commit `355724c`**（9 文件 +862/−21）；smoke 282→286；**R1 APPROVED_WITH_NOTES/0**（`REVIEW-BUG-007-R1`） |
| **UX-060（P1）闭环** | 长告警改走标题栏下方 **in-flow 流式面**（全文可读可关闭），短提示保留 chip；几何判据 = 长度 24 字 + 实测兜底；**commit `21b100c`**（6 文件 +801/−13）；smoke 291/0；**R1 APPROVED_WITH_NOTES/0**（`REVIEW-UX-060-R1`；残余重叠路径判定=不可达） |
| **UX-012 补审** | 回溯补审 `APPROVED_WITH_NOTES/0`（`REVIEW-UX-012-R1`；基线 `f0a45a4` → HEAD）⇒ **Check 21 复审债务清零** |
| **CLEAN-004（QA 验证资产）** | 首轮 QA 跑 16 h 失败（探针自身崩溃 + 孤儿进程树）→ 抢救 → 二次 QA 失败 → Coordinator 接手 → 审查链 **R1~R6**（NEEDS_CHANGE→NEEDS_CHANGE→BLOCKED→BLOCKED→NEEDS_CHANGE(0)→**APPROVED_WITH_NOTES/0**）⇒ **自动化面判可交付**（`docs/verification/CLEAN-004-checklist.md` + `docs/evidence/CLEAN-004/`17 件 + 6 份审查报告） |
| 新增任务 | BUG-008 / BUG-009（P2 产品缺陷）、CLEAN-005/006/007（备注批次）、BUG-010 并入 CLEAN-007、CLEAN-004 范围扩展（面 3 全量重基 + UX-012 备注 + D-1） |
| 治理健康度 | `11 → 10 issues`：Check 21（复审债务）清、28c（快照版本行）清；剩 **28s**（evidence-log 320 KB 超限）与 **36**（RISK-002 缓解口径过期，需用户裁定） |

## 用户侧待办（重启验收，DSH 尚未重启）

1. 重启 DSH ⇒ `ensurePreset()` 重同步；客观标志 = `%DSH_HOME%\.agent-presets\novel-writing\.dsh-bundle-version` 由 `0.5.2` → **`0.5.3`**
2. 三处失败应消失：创作台「继续工作流」/「绑定新会话」/ 宿主预设切换器
3. 长告警应在标题栏**下方**整行流式区（全文可读 + 关闭钮），标题栏横幅/⇄⟳☆ 不被遮挡；短提示仍为紧凑 chip
4. 诚实预期：窄窗口下标题栏居中横幅**本就可能 `data-hidden`**（UX-055 既有逻辑，非本次改动）
5. 按 `docs/verification/CLEAN-004-checklist.md` §8 + §9.2 执行 **U-1~U-14**；重点 **U-4**（卡片不应长期停「会话失效」= BUG-009）、**U-8**（Esc 关绑定面板 = D-1）、**U-2**（搜索找会话）
6. 任一失败 → 取新告警原文回报，按新根因另立缺陷

## 候选池（下次推荐用；`task-priority-analysis` 2026-09-14：107 任务 / 94 完成 / **11 unblocked** / 0 blocked）

- **BUG-009（P2，首要产品缺陷）**：自动绑定后卡片**收敛迟滞**——实测 **≥2′06″ 未收敛、≈2′31.3″ 内收敛**（`D4` 谓词只读 `cards`/`id`/`drawerCards`/`bound`，其 PASS **不得**读作「卡片状态已收敛」；`run1` 全程不收敛）；修复 = 定位收敛延迟根因（绑定写入与 `byId` 刷新时序 / 快照订阅）
- **CLEAN-007（P2）**：UX-012 R1 备注（create 链双事实源收口 + **D-1 Esc 缺陷** + 模态 ARIA/焦点 + 行为探针入仓）
- **CLEAN-005（P2）**：BUG-007 R1 备注（契约面 5 行号重基 + 面 3 全量重基 + smoke 对「≤ 文件长度漂移」判别力加固）
- **CLEAN-006（P2）**：UX-060 R1 备注 + 证据固化 + **CLEAN-004 探针装配去重（F-10）+ R3-03 机证硬化 + R3-09 闸门行**
- **BUG-008（P2）**：createProject 失败不回滚 ⇒ 残留空目录（UI 不可见 + 重名被拒）
- **COMPAT-017**（P9/v0.6.0）：`probe-host --run` 真机面收口（含 F-4 归口）
- **发布 v0.5.3**：`package.json` 已 0.5.3、CHANGELOG 在 `[Unreleased]`；发布属关键决策，需用户确认范围/号段
- **治理 FAIL 处置**：RISK-002 缓解改「替代控制 + 观察日期」（DEC-027 上游仅登记）／evidence-log 320 KB 超限（归档受跨根缺陷阻塞）
- **信息项**：O-1（检索命中行标题用 cwd 名而非 id，P3 观感候选）

## 本会话判断失误（如实，同族六次）

1. `EVD-108` 抄执行者自述行数（「3/2 行」）→ 产物实为 **5/3**（EVD-109 订正）
2. UX-012 派发稿转述「EVD-028 17/17」（实为无头探针 16/17，17/17 属 EVD-027）+ 引用了不存在的检查项 `KEYS-NOT-PAIRED`（EVD-110）
3. 未经验证把 QA 报的 D-3 并入 BUG-009（R2 驳回 → EVD-115 撤回）
4. 把 `B21a` 伪 PASS / 7 处 FAIL 误报当既成结论汇报（R2 N-01 纠正）
5. 定点返工只改 R3 点名行、未整表逐格比对 ⇒ 遗留 3 格错值（R4 NEW-R4-01）
6. 同上：`≤2′31″` 只改被点名处 ⇒ 5 处漏改（R5 NEW-R5-02）

**统一教训（带进下批自查清单）**：① **子代理给的新事实/新缺陷结论，未独立验证前不得写入治理记录或向用户汇报**；② **派发稿中的事实引用 MUST 以源文件实读为准**，禁止凭记忆或转述；③ **文档订正 MUST 整表/全文逐格比对原件**（含「全文档扫描同一措辞」与「读实体谓词而非信 label」），只改被点名的行 = 必然复发。

## 门禁基线（本会话实测）

`node --check` ×14/×9 = 0 failed ｜ `validate-preset` **PASSED**（schema-face PASS）｜ `smoke` **291 passed / 0 failed**（282 → 286 → 291）｜ 隔离挂载冒烟 11/11 ｜ 几何探针红/绿（红 2475.75/3901.5 px² → 绿 0）｜ CLEAN-004 记录运行 **49/42/4/3**（exit 1）｜ `falsifiability-check` CHECK-OK（19 red / 11 ok）｜ `gen-defects-evidence --check` IN-SYNC ｜ `governance-write-guard` PASS ｜ `check-locks` PASS ｜ `check-review-debt` PASS
