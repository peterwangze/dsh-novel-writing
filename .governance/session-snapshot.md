# 会话快照 — 2026-09-16（**v0.5.3 已发布**；六项修复闭环 + 一条全绿验证资产）

**session_date**: 2026-09-16（会话自 2026-09-13 起，跨五次）
**工作流版本**: 0.81.0
**会话标识**: dsh-writing-workflow-20260913
**HEAD / 远端**: `419c7fa`（远端 `main` 已同步）；**annotated tag `v0.5.3` 对象 `12715e2d…`（peel `f608c17`）已推送，远端对象与本地逐位一致**

## 发布产物（REL-007，2026-09-16）

| 项 | 值 |
|---|---|
| 发布链 | `f608c17`（发布 commit：CHANGELOG 定稿 9 条/100 行逐字 + 三件发布文档）→ `471020c`/`ac12e79`（演练证据固化 + 逐字性校验脚本入仓）→ `9da2276`（R1 后置审查 F-02~F-07 订正，**不重指 tag**）→ `419c7fa`（治理收尾） |
| 审查 | `REVIEW-REL-007-R1` = **APPROVED_WITH_NOTES / unresolved_blockers=0，判 GO** |
| 回滚演练（实跑） | 候选 = tag；安装 `v0.5.3` → 回退 `v0.5.2` **3.195 s** → 再安装；幂等/闭环**残余 0**；真实 `$DSH_HOME` **零写入**（4 份指纹全同）；证据 28 件于 `docs/release/evidence/rel007-drill-20260915/` |
| 三件套 | `node --check` 23/0 ∧ `validate-preset` PASSED(29/29) ∧ `smoke` **302/0** |
| **闸门披露** | 形式上越过 **G6/G7/G8**（pending）⇒ `Check 37 [G-s2]` **持续 FAIL 至 G6/G7 通过**；**用户经 ask_user_question 显式授权 + `DEC-029` 机读留痕**（v0.5.2 同带该状态，DEC-153 ② 定性为历史披露） |
| 两项门禁**不可用** | 上游跨根缺陷（DEC-027 仅登记、不改插件仓）：`check-release --lineage-mode released` 仍 FAILED；`release-ledger --remote` **崩溃**（`ValueError` 实证：插件 `core/releases/0.5.3.json` `relative_to` 宿主根）；`archive --dry-run` = 跳过（exit 0） |
| 收录范围 | 6 任务（BUG-007 / UX-060 / BUG-009 / CLEAN-007 / BUG-010 / CLEAN-006）；**COMPAT-* 留在 `[Unreleased]`**（遵 v0.5.2 先例） |

## 用户侧待办（**一次重启可验五项修复**）

1. 重启 DSH ⇒ 客观标志：`%DSH_HOME%\.agent-presets\novel-writing\.dsh-bundle-version` `0.5.2` → **`0.5.3`**
2. **BUG-007**：创作台「继续工作流」/「绑定新会话」/ 宿主预设切换器三处失败消失
3. **UX-060**：长告警在标题栏**下方**整行流式面（可读完 + 关闭钮），横幅/⇄⟳☆ 不被遮挡
4. **BUG-009**：自动链建会话后卡片**不再长时间「会话失效」**（U-4；修复前 ≥2′06″ 未收敛、≈2′31.3″ 内收敛）
5. **CLEAN-007 / D-1**：绑定面板打开时 Esc **只关面板、控制台保持**；分栏态 Esc **不连关两层**
6. **BUG-010**：工作区对话框（`.nv-modal`）打开时 Esc **只关它自己**
7. 其余按 `docs/verification/CLEAN-004-checklist.md` §8 + §9.2（U-1~U-14）；任一新失败 → 取告警原文回报；**若需回滚**：`docs/release/rollback-plan-0.5.3.md`（A/B/C 三路径，实测 3.195 s、无数据迁移）

## 候选池（`task-priority-analysis` 口径：110+ 任务 / 98+ 完成 / 10 unblocked）

- **CLEAN-008（P2）**：UX-060 R1 备注项（探针清理入 finally + 隔离口径 / smoke 断言改行为面 / 单帧叠字 / 证据固化入仓）
- **CLEAN-009（P2）**：CLEAN-006 R3 三条 P3（台账块头陈旧桶串 / 自证代理集与术语残留 / 契约成因叙述）
- **CLEAN-005（P2）**：BUG-007 R1 备注 + 契约面 3 全量重基 + smoke 判别力加固 + **1.7/2.4 陈旧锚点**
- **BUG-008（P2）**：`createProject` 失败不回滚 ⇒ 残留空目录
- **COMPAT-017（P9/v0.6.0）**：`probe-host --run` 真机面收口
- **治理欠债（我的）**：① plan-tracker 缺 `1.0.0 依赖链`/roadmap row/`REQ-059~064`；② REL-007 执行包部分必填字段不合规（关单后不再适用，若要长期合规需另立任务）；③ `risk-log` RISK-002/RISK-005 两行**表格参差**；④ `evidence-log` 356.7 KB 超限 + RISK-002 缓解口径过期 —— **两条 FAIL 需用户裁定处置方式**；⑤ **待立任务**：CHANGELOG 顶层条目标题唯一性机检（本轮实证过一次静默丢失：CLEAN-007 标题被 CLEAN-006 顶替，已由 Release 角色逐字恢复）
- **上游工具缺陷 U1~U7**（跨根读插件仓 / `release-ledger` 崩溃 / execution gate 以插件根 cwd 运行等）：按 DEC-027 仅登记

## 判断失误与教训（本轮新增两条，累计同族八次）

**新增**：⑦ 追加 `risk-log` 履历时用 `.Replace($old,$new,1)` —— PowerShell 下**命中了两行**（RISK-002 + RISK-003），造成同一段履历被插入到不属于它的风险行（已修正）；⑧ `execution-packet --write` 自动生成的执行包**全是 `TO_BE_DEFINED` 占位**，直接触发了 18d/18f/18i 一批 FAIL（已逐字段填实）。
**另有**：REL-007 取锁/triage 后**漏登记 plan-tracker 行** ⇒ pre-commit hook 正当地拦下了 Release 角色的 commit（该角色拒绝 `--no-verify`，处置正确）。
**既有教训**（沿用）：① 子代理给的新事实/新缺陷结论，未独立验证前不得写入治理记录或向用户汇报；② 派发稿中的事实引用 MUST 以源文件实读为准；③ 文档订正 MUST 整表/全文逐格比对原件；④ 表格单元格文本不得含裸 `|`；⑤ 契约 `line` 每个数值 MUST 按目标 file 分组算 Δ；⑥ **声称不得超过事实**（测试守卫的 ok/结论必须与代码事实一致）；⑦ **批量字符串替换 MUST 先验证命中数**（`.Replace` 无 count 语义时尤其）；⑧ **自动生成的记录 MUST 逐字段复核后再落**（占位符 = 未填）。

## 门禁基线（发布后实测）

`node --check` 23 文件 0 failed ｜ `validate-preset` **PASSED**（schema-face PASS，29/29）｜ `smoke` **302 passed / 0 failed** ｜ 冻结 CLEAN-004 探针 **49 / 47 PASS / 0 FAIL / 2 N-A**（`head=4b70182`、`headDirty=false`；归档 3 份）｜ `scripts/probe-nv-ux012.mjs` 全量 27 / 23 PASS / 0 FAIL / 4 N-A（自证 `RUNTIME-LEDGER-CHECK 10/10` + 注入 8/8）｜ **发布回滚演练实跑**（回滚 3.195 s、残余 0、真实 `$DSH_HOME` 零写入）｜ `governance-write-guard` PASS ｜ `check-review-debt` PASS
