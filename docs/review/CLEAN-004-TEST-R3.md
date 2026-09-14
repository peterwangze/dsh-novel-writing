# CLEAN-004 测试审查报告 — R3（熔断轮终审）

**ROUND**：**R3**（返工后第 3 轮复审 / 熔断轮）· **REVIEW_TYPE**：**test-review**
**PREV_ROUND_REF**：`docs/review/CLEAN-004-TEST-R2.md`（直接前轮，结论 **NEEDS_CHANGE**，BLOCKING 5 = N-01 P1 + N-02~N-05 P2，另 P3 ×3；`unresolved_blockers = 5`）+ 上下文 `docs/review/CLEAN-004-TEST-R1.md`（R1，BLOCKING 6 = F-01~F-06）
**审查者角色**：Test Reviewer Agent（只读；唯一写入 = 本文件；未修改产品代码 / 测试 / 探针 / 清单 / `.governance/**`）
**审查对象**（R2 返工交付，本轮自述 `DONE_WITH_LIMITS`）：`docs/evidence/CLEAN-004/{README.md, DEFECTS.md, probe-clean-004.mjs, probe-clean-004.final-rev-b1f1c8c0.mjs, falsiability-check*, report.json, report-rework2-run.json, record-run-stdout.log, *.png}` + `docs/verification/CLEAN-004-checklist.md`
**仓库 / HEAD**：`D:\AI\agent\deepseek\harness\writing-workflow` / `21b100ce9ac32e534c6215e507f9835f87e0ff4c`（`report.json.head` 同值，`headDirty=false`；本轮独立 `git status --porcelain -- lib/ test/ scripts/ agent-presets/ package.json README.md CHANGELOG.md` = **空**）
**日期**：2026-09-14 · **机录**：本轮 REVIEW 持久化（`review-record`）由 Coordinator 执行——审查边界禁止本 Agent 写 `.governance/**`。

---

## 0. 结论

**VERDICT: BLOCKED**（**round = 3 ⇒ 熔断达成**；剩余 BLOCKING **2** 条：**R3-01 / R3-02，均 P2**）
**`unresolved_blockers = 2`**（⇒ 不满足 `APPROVED_WITH_NOTES` 的 `unresolved_blockers=0` 条件）
**P0 = 0 · P1 = 0 · P2 = 3（2 条阻断 + 1 条非阻断）· P3 = 6**

> **熔断语义（T2）**：round ≥ 3 且仍有 BLOCKING ⇒ 依 `agents/test-reviewer.md` 与 `skills/test-review/SKILL.md`「超过复审 fuse 的 `NEEDS_CHANGE` 必须升级为 `BLOCKED`」，本轮**不**再输出 NEEDS_CHANGE，改为 **BLOCKED + escalation**（由用户裁定：定点返工 / 冻结点接受风险 / 接受现状）。
> **重要限定**：两条阻断项**均为文档与证据归属面**，**不含**测试机制、谓词设计、隔离/清理/回归/脱敏的任何缺陷 —— 后者本轮**全部独立复核成立**（见 §1/§4/§8）。剩余处置成本 ≈ **4 处文案订正、无需重跑探针**（唯一例外见图注选项 b）。

| 维度 | 结论 | 一句话依据 |
|---|---|---|
| 1. 策略完整性 | **满足** | 三态口径强制、**9 处 N-A 门控与谓词互斥**（逐站点实读）、共享登记表 + `evalPred` 唯一判定入口、隔离/清理/回归/脱敏链齐备；残余：同源**机证**为文本代理（`R3-03`，P2 非阻断） |
| 2. 用例质量 | **满足（本轮首次）** | 49 条无「不可失败断言」；`B21a` 极性反置已修（`rows<1 ⇒ false`，实体代码 + 向量实读）；9 谓词 **19 red / 11 ok 全过**、`DECLARED ≡ EVALUATED`；9/9 部署站点**实读**确认判定值 = `evalPred` 返回值 |
| 3. 覆盖率 | **满足** | `R-01`~`R-16` 齐备（`E-01` 内容面零落点已闭合）、`U-1~U-14` 可判定、6 类零覆盖面登记 |
| 4. 证据充分性 | **不满足** | `DEFECTS §2` 判别证据链 (a)/(c)/(d) 填的是**上一轮运行**的 id/时间戳，却标注「实测值（记录运行）」并自述「本行全部数值取自 `report.json`（记录运行）」（`R3-01`）；4 张 PNG 的最后写入时间落在**上一轮窗口**，README §3 却称「其余三张为本轮重新取证」（`R3-02`） |
| 5. 可复现性 | **基本满足** | 命令/时长/退出码/双运行/哈希/修订=终版（F-14 收口）齐备；回归基线独立复跑一致（`smoke 291/0`、`validate-preset PASSED`、`falsifiability-check CHECK-OK`）；不符处：隔离根笔误（`R3-04`）、自指哈希行内不一致（`R3-06`） |

**一句话总结**：R2 的 5 条 BLOCKING 中 **N-01/N-02/N-03/N-04 已真正修复**（`B21a` 现在**真可失败且前提有效**——关键词取宿主已认可会话的 id 展示串，检索 0 行即 FAIL；`PREDICATE_REGISTRY` + `evalPred` 使部署面与自证面**同源**，我用自做的三组注入复现了「改部署面必红」「改登记表必红」），**N-05 仅部分修复**——跨运行对照表已补，但**同一段落的判别证据链却留着上一轮运行的取值**，且其 (d) 行明写「本值取自 `report.json`（记录运行）」而该值在该文件中**不存在**；同时 4 张截图的 **mtime 落在上一轮运行窗口**，与 README「本轮重新取证」的声明冲突，且被标为「D-2 可见形态」的那张图里，「会话失效」卡是 fixture 的失效绑定书、被测卡在图中已是已绑定态。两条均为「交付文档自述 与 其所引原件 矛盾」——正是 R2 在 N-01/N-04 上定级 BLOCKING 的同一类问题；round=3 且未清零 ⇒ 本轮判 **BLOCKED** 并升级用户裁定。

---

## 1. 独立核验方法（全部只读；本轮**未复跑探针**，见 §9-1）

| 手段 | 命令 / 读取面 | 结果 |
|---|---|---|
| 哈希与体量 | `Get-FileHash` × 20（`docs/evidence/CLEAN-004/*` 全量 + `checklist`） | **20/20 与 `README §3` 逐项一致**（含 4 张 PNG、2 份 stdout、2 份探针副本、4 份 report）；`README.md` 自身为自指（见 `R3-06`） |
| 计数 | `report.json.tally` 实读 | `{total:49, pass:42, fail:4, na:3}` ✓；49 条 `id` **全唯一**（uniq=49）✓ |
| 逐条状态 | 49 条 `id`+`status`+`detail` 实读 | `FAIL 4` = `D2-esc`/`C3b`/`C9`/`C10`；`N-A 3` = `B5`/`C11`/`D6` —— 与 README §1、`checklist §10` **逐项一致** ✓ |
| 实体代码实读 | 探针全文（1925 行）按调用点核对：`PREDICATE_REGISTRY L76-345`、`falsifiabilityReport L467-498`、`staticCallSiteCounts L508-515`、`evalPred L529-534`、`B5 L860-868`、`B12b L931-933`、`C-face L1167-1173`、`C11 L1277-1280`、`prepareSplitForNotice L1295-1357`（含 N-06 遮罩收敛 `L1306-1327`）、`E1 L1428-1430`、`D3 L1545-1548`、`D5 L1605-1606`、`B21a L1653-1711`、`B21b L1779-1856`、`FALSIFIABILITY-PROOF L1870-1883`、`finally 清理/落盘 L1900-1919` | **9/9 部署站点的判定值 = `evalPred(...)` 返回值**（或持有该值的变量），**无就地表达式副本**；N-A 门控与异常态**互斥**（见 §5-2） |
| **自做注入式核对**（隔离副本 `%TEMP%`，用后删除） | ①基线 ②部署面 `evalPred('B5…')` → 常量 `true` ③登记表 `fn` → 恒真 ④**保留不可达 `evalPred` 调用 + 部署面就地复制表达式** | ①`ALL-PASS=true / BINDING-OK=true / CHECK-OK`（exit 0）②`UNBOUND B5 callSites=0` ⇒ `CHECK-FAILED / exit 1` ③`red red: true` ⇒ `ALL-PASS=false / exit 1` ④**`CHECK-OK / exit 0`**（⇒ 机证残余孔洞 `R3-03`） |
| 独立复跑机证脚本 | `node docs\…\falsifiability-check.mjs` | `9/9 BOUND` · `VECTOR-TALLY={"red":19,"ok":11}` · `ALL-PASS=true` · `BINDING-OK=true` · `CHECK-OK`（**exit 0**）；`DECLARED-VECTORS ≡ EVALUATED` ✓（与入仓 `falsifiability-check-stdout.log` 尾部逐字一致） |
| 宿主/插件代码核验 | `lib/client.js` 实读 `L3394-3397`（命中口径 `displayTitle ?? id` ‖ `id`）、`L3427-3439`（行渲染/点击）、`L2823/L3435`（行标题 = `e.displayTitle ?? e.id`） | `B21a` 的关键词**只能经 id 分支命中**（记录运行 `displayTitle='novels'` ⇒ 首析取为假）；前提有效、非恒真（见 §5-1） |
| 跨运行对照 | `report.json` × `report-rework-run.json` × `report-run1.json` × `report-rework-discovery.json` 的 `D4`/`C3b`/`facts.overviewProbe`/`isolatedDisk`/`sessionStore` 逐项读 | **`DEFECTS §2` 的 (a)(c)(d) 取自 `report-rework-run.json`（R1 返工运行）**，与本轮权威 `report.json` 不符（`R3-01`） |
| 时间线重算 | 49 条 `at` 时刻 + `facts.convergence`/`splitFate` 的 `t` + stdout 两条「超时等待」行 | 采样窗 `05:14:05.991→05:14:18.088Z`（12.10 s / 13 帧）；**最后一条「会话失效」直接读数在 `C9.reopenDiag.drawerSubs[0]`（≈`05:16:12.3Z`）** ⇒ 实测未收敛 **≥2′06″**；`D4` 已 bound `05:16:37.313Z` ⇒ **≤2′31″ 收敛** ✓ |
| 文件时间戳取证 | `Get-Item` 的 `CreationTime` / `LastWriteTime`（4 张 PNG） | `LastWrite` = `12:38:44.482 / 12:38:53.213 / 12:41:08.185 / 12:41:20.073`（本地 UTC+8 = `04:38–04:41Z`）⊂ **R1 返工运行窗口 `04:38:34→04:41:26Z`**；记录运行为 `05:13:45→05:16:55Z`（`R3-02`） |
| 图像实读 | `read_image` + 3× 放大裁切抽屉区（`%TEMP%` 中转，用后删除） | 图内「会话失效」卡 = fixture `nn-stale-bound`「失效绑定书」；**被测卡「孤星纪元」无状态后缀（= 已绑定）**，与同轮 `D4`（bound）一致 ⇒ 该图**不是** D-2 症状的视觉取证 |
| 复查回归 | `node test/smoke.mjs` / `node test/validate-preset.mjs` / `node --check probe` | **291 passed / 0 failed（exit 0）**；**PRESET VALIDATION PASSED（exit 0，skills 29/29）**；exit 0 —— 与 QA 声明一致 |
| 脱敏 | 6 份新文件扫 `token=(?!***)…` / `sk-*` / `Bearer` / `apiKey…` | **真 token/密钥命中 0**；`token=***` 共 13 处 ⇒ 脱敏彻底 |
| 隔离与清理 | `report.isolation` / `cleanup` / `realEnvVerdict` / `containment` | `containment` **7/7**；6 项环境变量全部重定向至 `…\clean004-probe-WcBMlz\*`；`realEnvVerdict.ok=true`（`strictDeltas={}` ∧ `inventoryDeltas={}` ∧ `pointsIntoIsolation=false`）；`cleanup.rootRemoved=true`（7 子目录）；`%TEMP%\clean004-*` = **0**（本轮自建的 2 个注入副本已删除后复核） |
| 写面边界 | `git status --porcelain` + mtime | 产品面**无输出**；`AGENTS.md` 的 ` M` 状态存在但 mtime = **09-13 16:00**（早于 QA 交付窗 12:17–13:21，非本轮 QA 面）；`lib/ test/ scripts/ agent-presets/ package.json README.md CHANGELOG.md` 最新 mtime 均 ≤ 09-13 |
| 用户环境 | 只读 `C:\Users\peter\.dsh\.agent-presets\novel-writing\.dsh-bundle-version` | `0.5.2`（mtime **09-12 19:51:40** 未变）⇒ 用户实例与浏览器未被触碰 ✓ |

> **未执行**：整轮复跑探针（时间盒；沿用 R1/R2 口径）⇒ 采用「原件实读 + 源码级核验 + 跨运行对照 + **自做注入式机证** + 宿主/插件代码核验 + 文件时间戳取证」。残余不确定性已在 §9 明示。

---

## 2. 前轮 findings 逐条处置对照表（R2 N-01~N-08 + F-03/F-12/F-14，**100% 有判定**）

> 判据：**以当前文件实体 + 记录运行原件为准**，不采信返工自述。

| # | R2 问题 | 处置判定 | 依据（本轮独立核验） |
|---|---|---|---|
| **N-01**（P1，`B21a` 极性反置 / 不可失败伪 PASS） | ✅ **已修复** | ① 实体代码：`L117` `fn = (v) => v.kwOk && v.rows >= 1 && v.titleOk && v.effectiveKeyword !== null` ⇒ **`rows=0` 即 false ⇒ FAIL**（红通道真实存在）；部署 `L1707-1711` 判定值 = `evalPred` 返回值，N-A 门控仅取 `ackComplete`（与「已认可而 0 行」这一异常**互斥**）；② 前提有效：`effectiveKeyword` 取 `fact.sessionAckIds.boundId`（宿主三面：`overview.bindings` ∧ `hostWorkspaceSessionIds` ∧ `onDiskSessionIds`，与镜像无关）⇒ 若镜像不含该会话则检索 0 行 ⇒ FAIL，**非近恒真**；③ 记录运行实测命中：`effectiveKeyword='session-22721558-…'`、`rows=1`、`rowTitles=['novels']`、`titleOk=true`；④ **R2 点名的 7 处 FAIL 误报逐处订正为 PASS**（README §1/§4 行 5-7/§11③ · DEFECTS §0 行 4-6/§3/§4 行 · checklist §10 行）——本轮逐处 grep 复核，无一处残留 FAIL 表述 |
| **N-02**（P2，部署面与自证**非同源** / `red3` 静默丢弃 / 向量计数不实） | ⚠️ **已修复（机证有残余孔洞 `R3-03`）** | ① `PREDICATE_REGISTRY`（`L76-345`，9 条）真实存在；`evalPred`（`L529-534`）按 id `find().fn(measurement)` ⇒ **同一函数实例**，未登记 id 抛错（fail-closed）；② **自做注入**：改部署面 ⇒ `UNBOUND` → `CHECK-FAILED / exit 1`（R2 的攻击向量已收口）；改登记表 ⇒ `ALL-PASS=false / exit 1`（**两向皆红成立**）；③ `red3`/`red4` 不再丢弃：`DECLARED-VECTORS {red:19,ok:11} ≡ EVALUATED {red:19,ok:11}` ✓，计数声明（19/11）与实测一致；④ 9/9 部署站点**逐站点实读**确认判定值取自 `evalPred`；⑤ **残余**：注入④（保留不可达 `evalPred` 调用 + 就地复制表达式）下机证仍 `CHECK-OK` ⇒ 静态计数是**文本代理**，不能证明「判定消费登记表返回值」（`R3-03`，P2 非阻断，裁定见 §5-2） |
| **N-03**（P2，D-3 撤回） | ✅ **已修复（撤回彻底）** | ① `DEFECTS §3` 标题改为「~~缺陷 D-3~~ **已撤回（依据不足 + 被反驳）**」+ §3.2 **四项反驳**逐条（镜像本体未读 / 与同轮 `D4` 冲突 / 宿主 `projectList` 同循环 ⇒ `byId ⊆ ids` / 关键词与 `displayTitleOf` 无交集）；② `§0/§4/§5`、`checklist B-07`、`plan-tracker BUG-009` 均同步「D-3 已撤回、BUG-009 恢复 D-2 单症状」；③ 全仓检索无「把找到的会话恒空当产品缺陷」的残留表述——仅存的是**假设句/否证记录**（`probe L1105` 假设、`L1616` 显式标注「属前提不可达的假阳性（N-03：D-3 撤回）」、`README L118/142`、`checklist L262` 均为「已撤回」语境）✓ |
| **N-04**（P2，`README §5.3` 差异表被自身原件反驳 + 过程运行归因错误） | ✅ **已修复** | ① 被反驳的第 1 项已删；改为「记录运行修订 = 终版 ⇒ 差异集为空」（`probe-clean-004.mjs` = `probe-clean-004.final-rev-b1f1c8c0.mjs` = `de2de511…`，**闭环**）；② R1 两轮差异如实归因为「`E1` label/谓词语义不同 ⇒ **非同源**」（旧 label 串含「不靠 tooltip 兜底」，当前源该串 0 命中；现存 1 处「紧凑 chip」在 `L1366` 的 N-A 兜底 label，非旧 label 串）✓；③ 过程运行明示「不得作重复性证据」✓ |
| **N-05**（P2，跨运行引用混用 + D-2 措辞） | ❌ **未彻底修复（BLOCKING，见 `R3-01`）** | ① **已做**：`DEFECTS §2` 新增跨运行对照表（记录运行/`run1`/`discovery` 三行，逐项标 `D4` 状态与时间戳）✓；「长期停『会话失效』」→ 实测区间 ✓；`§4` 行 f 撤下「搜索面恒空」症状 ✓；② **未做**：同一节 `§2` 的**判别证据链 (a)(c)(d)** 仍写上一轮运行的取值（`session-3c7518c9…` / `["session-0c256d5a…","session-3c7518c9…"]` / `workspaces["5b14b27d…"]`+`04:11:48.369Z`），而本轮权威 `report.json` 为 `session-22721558…` / `["session-22721558…","session-e8df27a0…"]` / `workspaces["c986fb89…"]`+`05:14:04.079Z` —— 表头「实测值（记录运行）」与 (d) 行「本行全部数值取自 `report.json`（记录运行）」**为假**；③ 下界论证锚点亦不成立（`R3-05`，P3，数值本身保守可支持） |
| **N-06**（P3，`§11` 前置构造期遗留 `.nv-modal` 未披露） | ✅ **已修复** | `prepareSplitForNotice()` 开头新增遗留遮罩收敛（`L1306-1327`：等 8 s → 点遮罩 → 复校），落证 `facts.prepOverlayClean = [{initialModal:true, closedBy:'backdrop-click', finalModal:false, ok:true}]` ⇒ 本轮 E/F/D3 观测**在干净 DOM 态**进行（对照：R1 两轮 `attempts[0].bindPanel=true`）✓ |
| **N-07**（P3，零落点残留 + 状态格 + 计数） | ✅ **已修复** | ① `R-16`（`E-01` 数据面板内容面）已入 `checklist §9.1` 并并入 `U-11` 判据；`R-01`~`R-16` **16 条齐备**（逐条实读）；② `B-07` 状态格重写并**撤下两个被否定的理由**（`L48`）；③ `D-05`/`D-07` 行与本轮 `D6=N-A`/`C3b=FAIL` 一致（`L94`/`L96`）；④ 向量计数订正 19/11 ✓ |
| **N-08**（P3，`degradedBranchReachable` 硬编码常量） | ✅ **已修复** | `D5` detail 拆为 `degradedBranchReachable_analytic`（`false` + 来源说明「隔离平面必然提供 sessions 服务」+ 归口 R-03）与 `degradedBranchReachable_measured`（`false` + 「本运行未观测到缺席信号」）✓ |
| **F-03**（三文档 7 处 FAIL 误报） | ✅ **随 N-01/N-03 收口** | 7 处全部改为 PASS（见 N-01 ④）；`report.json` 实体 = PASS ⇒ 文档与原件一致 ✓ |
| **F-12**（跨运行引用混用） | ⚠️ **部分收口** | 新增对照表与 `§4` 来源标注 ✓，但 `§2` 证据链取值仍错配（同 N-05 ②）⇒ 该项随 `R3-01` 一并处置 |
| **F-14**（记录运行修订未留存） | ✅ **已修复** | 记录运行修订 = 终版（同一文件、同 `de256…`/`de2de511…` sha256；`probe-clean-004.final-rev-b1f1c8c0.mjs` 副本入仓同 sha256）⇒ R2 的「不可逐字重建」缺口**本轮不存在** ✓ |

**统计**：已修复 **7**（N-01/02/03/04/06/07/08，其中 N-02 附残余机证孔洞）+ 部分/未彻底 **2**（N-05、F-12，同根：`R3-01`）· 未修复 **0** · 新引入 **0**（本轮新发现均属「R2 未点到的残留/新取证事实」，非修复引入的新缺陷——唯 `R3-01` 属 N-05 的**修复不彻底**）。

---

## 3. 五维度结论

### 3.1 策略完整性 — 满足
- 三态口径在 `assertion()` 强制（`st = status ?? (ok ? 'PASS':'FAIL')`；`report.ok` 要求全 PASS，N-A 计非 PASS）✓。
- **9 处 N-A 门控逐条实读**：`B5`(host 行数)、`C-face`(splitOpened)、`C11`(flipBackClick)、`D3`(barOpenBefore)、`B21a`/`B21b`(ackComplete / consoleOpen)、`C8`、`B22`、`D5` —— **门控条件均与「异常态」互斥**（异常时门控取 `undefined` ⇒ 由谓词判红），无一条把真缺陷吞成 N-A ✓（R1 F-06 的「闸门偏宽」已结构性解决）。
- 隔离/清理/回归/脱敏策略完整且经独立复核（§1 表）；`cleanup` 在 `finally` 内且先于 `writeFileSync`（`L1900-1915`）✓。
- 残余（不构成缺口）：同源自证的**机证**强度依赖文本计数（`R3-03`）。

### 3.2 用例质量 — 满足（本轮首次）
- 49 条断言无「不可失败断言」：`B21a` 的极性反置已消除（见 §5-1），其余新改谓词逐条可失败（§4）。
- 9 条新/改谓词全部经共享登记表求值：**19 red 全 `false`** ∧ **11 ok 全 `true`**，且 `DECLARED ≡ EVALUATED`（无静默丢弃）✓。
- 9/9 部署站点实读：判定值 = `evalPred(...)` 返回值；`predicateId` 逐条落 detail ⇒ 机读可溯源 ✓。
- E/F/D3 面本轮**首次取得实测观测**且全 PASS（前置由未绑定卡 `mm-third-probe` 构造，`opened=true ∧ bar=true ∧ bindPanel=false`）✓。

### 3.3 覆盖率 — 满足
- `R-01`~`R-16`（含 `E-01` 内容面的 `R-16`）+ `U-1`~`U-14` 齐备；`R-01~R-09` 对应 R1 点名的 9 面，`R-10~R-13` 对应 6 类零覆盖面 ✓。
- `U-11` 已含 `R-16` 判据；`U-2`/`U-4` 覆盖 D-2/D-3 的用户可见症状（D-3 撤回后 `U-2` 仍有效——人读口径）✓。
- 无零落点残留项（R2 的 `E-01` 已闭合）✓。

### 3.4 证据充分性 — **不满足**
- 49/49 有非空 `detail`；20/20 哈希与体量与 README §3 一致；双运行/跨运行对照齐备 ✓。
- **但**：`DEFECTS §2` 判别证据链 (a)/(c)/(d) 的值**不存在于**其所引的 `report.json`（`R3-01`），且该表自述「本行全部数值取自 `report.json`（记录运行）」为假；4 张 PNG 的取证轮次与 README §3 声明冲突、且「D-2 可见形态」的图注与图内实体不符（`R3-02`）。
- ⇒ 作为**交付证据面**，「每条测试结论有证据」不成立（D-2 的结论**可由 `report.json` 重新推导并成立**，但交付文档给出的链与本轮原件不一致）。

### 3.5 可复现性 — 基本满足
- 齐备：命令 + cwd + 起止（`05:13:45.162Z→05:16:55.181Z`，190 s）+ 退出码语义（`ok?0:1`，实测 1）+ stdout 原件 + HEAD/`headDirty=false` + 浏览器/Node/隔离根 + 修订=终版 + `--out` 复现指引 ✓。
- 独立复跑一致：`smoke 291/0`（exit 0）、`validate-preset PASSED`（exit 0）、`node --check`（exit 0）、`falsifiability-check.mjs`（`CHECK-OK`，exit 0）✓。
- 不符：`README §6` 的隔离根写作 `v6c9fI`（`R3-04`）；`§3` 自指哈希两处数值互不一致（`R3-06`）。

---

## 4. 增量空真 / 弱断言普查（42 条 PASS 过筛，重点本轮新改/新增）

> 判据同 R1/R2：**谓词是否具备「在真实缺陷下变红」的能力** ∧ **前置是否在判定时刻真实成立**。

### 4.1 不可采信（**0 条**）
R2 的 `B21a`（不可失败伪 PASS）已消除，其余无新增。逐条实读结论：

| ID | 谓词（当前实体） | 记录值 | 判定 |
|---|---|---|---|
| `B21a` | `kwOk ∧ rows≥1 ∧ titleOk ∧ kw≠null`（`L117`） | `PASS {rows:1, rowTitles:['novels'], titleOk:true, kw:'session-22721558-…'}` | **合格**（红通道 = 检索 0 行；前提取自宿主三面认可、非镜像循环） |
| `B21b` | 同上 + `consoleOpen`（`L129-130`） | `PASS {consoleOpen:true, attempts:0, rows:1}` | **合格**；控制台缺席分支由部署侧显式 N-A（`L1848-1850`），不会伪 FAIL |
| `B22` | `clicked ∧ consoleOpen===false`（`L1722-1723`） | `PASS {clicked:true, consoleOpen:false}` | **合格**（点击行为 = `launcher.open` + 关控制台；有行才执行） |
| `B5` | `hostHasRows ∧ foundTitle≠null ∧ rows≥1`（`L80`） | `N-A {b5HostHasRows:false, rows:0}` | **合格**（宿主 0 行 ⇒ 前置未取得；原恒真析取已删） |
| `D3` | `barOpenBefore ∧ consoleOpen ∧ ¬barOpenAfter`（`L87`） | `PASS {barOpenBefore:true, consoleOpen:true, barOpenAfter:false}` | **合格**（前置真成立；`red` 向量=记录运行旧形态） |
| `C11` | `flipBackClick ∧ chatSide='right' ∧ splitOpen`（登记表） | `N-A {flipBackClick:false}` | **合格**（未点击 ⇒ N-A，不再冒充 PASS） |
| `D5` | `serviceSignal ?（双圆齐备）:（缺席 ∧ consoleDots=0）`（`L148-150`） | `PASS {serviceSignal:true, drawerDots:10, consoleDots:8}` | **合格**（改读产品自身 `degraded` 派生渲染面） |
| `E1` | `present ∧ form='row' ∧ lines=1 ∧ titleAttr='' ∧ 无横向/纵向溢出`（`L168-169`） | `PASS {form:'row', lines:1, overflow:{sw:558,cw:558,sh:72,ch:72}}` | **合格**（像素阈值 `h` 已降为非判定项；溢出为直接测量项） |
| `B12b` | `tileH≠null ∧ round(tileH)=180 ∧ cardHeights.length>0 ∧ min≥180`（`L140`） | `PASS {tileH:180, emptySet:false, 8 项均≥179.5}` | **合格**（空集显式判红） |
| `C-face-availability` | `¬(splitOpened ∧ splitClosed)`（`L96`） | 本轮**未产生**（闸门未进入，`cFaceGate=null`） | **合格但无正例**；仅静态绑定 + 登记表向量背书（R2 §4.3 曾建议登记为固定 N-A/SKIP 行以便审计——**未实现**，见 `R3-09`/P3） |

### 4.2 前提未证（**0 条**）
R2 的 `B21b`（前提未证 ⇒ 假阳性 FAIL）已消除：关键词现取宿主已认可 id 的 UI 展示串，且实读确认其**必然**落在命中口径内（`L3396` 的 id 分支）。

### 4.3 弱断言 / 潜在弱化（**2 条，均 P3，未触发**）
| ID | 现状 | 判定 |
|---|---|---|
| `B21a` 的 `titleOk` | 仅要求「每行标题非空」，不校验标题与所检索会话的对应关系（记录运行行标题为 cwd 名 `novels`） | P3：判据偏弱但非空真；覆盖口径已在 `DEFECTS §6 O-1` + `README §10-9` 如实登记 |
| `FALSIFIABILITY-PROOF` 的「静态绑定」分项 | `staticCallSiteCounts()` 按源文本 `evalPred('<id>'` 计数（`L508-515`） | P3→**P2**（`R3-03`）：文本代理留有「不可达调用仍计绑定」「判定可另取副本」两个盲点（已注入证明） |

### 4.4 其余 39 条 PASS（判定：具体、可失败、前置成立）
- R1/R2 已逐条审过的条目谓词未变（本轮哈希与调用点一致），本轮核对 `detail` 非空且字段与谓词吻合（抽检 `A1/A2/B1/B10/B13/B14/D1/D4/Z1` 全部一致）✓。
- 本轮新增取得观测的 5 条（`E1`~`E4`/`F1`）+ 首次取得观测的 2 条（`B22`/`B21b`）逐条实读：谓词具体、前置实测成立（`prepOverlayClean.ok=true`、`noticeShortTrigger.label='恢复默认布局'`、`injections.count=1`、`claims:['novel-writing']` ∧ `barClosed ∧ reopened`）✓。

**普查结论**：增量空真/弱断言 **= 0**（R2 的 2 条已消除）；新增残余仅为「机证强度」问题（`R3-03`，不产生错误 PASS/FAIL）。

---

## 5. 任务指定高风险主张逐条结论（10 项）

| # | 主张 | 独立结论 | 依据 |
|---|---|---|---|
| 1 | **N-01 判定合法性 / 前提是否有意义** | **判定合格（真可失败）· 前提有效 · 非近恒真** | ① 红通道真实：`fn` 含 `rows >= 1`，`rows=0 ⇒ false ⇒ FAIL`（`L117`；部署侧 `L1707-1711` 判定值直接取自 `evalPred`）；② 关键词 **不来自镜像**（`fact.sessionAckIds.boundId` ← `overview.bindings` ∧ 宿主 `storages/workspace.json` ∧ 隔离盘 `sessions/<ws>/`，`L1653-1660`）⇒ 镜像为空即 0 行 ⇒ FAIL，**不可能因前提恒真而常绿**；③ 实读 `lib/client.js:3396`：命中 = `displayTitle ?? id` ‖ `id`；记录运行 `displayTitle='novels'` 而关键词是会话 id ⇒ 命中**只可能经 id 分支**，故该断言确实覆盖「镜像是否收载该宿主会话 + 检索消费面是否渲染」，即 D-3 主张的反面。**限定**：覆盖口径窄于「找到的会话」全功能面——**未覆盖**按人类标题检索的路径与「镜像 `displayTitle` ≡ 宿主 `displayTitleOf`」的一致性（fixture 下不可构造：`sessions.create` 不传 title），该残余已在 `README §10-9`/`DEFECTS §6 O-1` 登记 |
| 2 | **N-02 同源保证与其自我放宽** | **(a) 部署面无表达式副本（实读 9/9）(b) 两向皆红（自做注入复现）(c) 放宽**正当但**削弱了机证强度，判定为残余 P2（非阻断）** | (a) 全源检索 `evalPred(` 共 9 处（`L864/932/1170/1278/1428/1546/1605/1707/1847`），与登记表 9 条 **一一对应**；逐站点实读确认无第二份等式，且 N-A 门控与异常互斥。(b) 自做注入：改部署面 ⇒ `UNBOUND`/`CHECK-FAILED`/exit 1；改登记表 ⇒ `ALL-PASS=false`/exit 1；基线 `CHECK-OK`/exit 0。(c) **裁定**：「要求每条谓词**运行期**被消费」是**不可满足的假红**——`C-face-availability` 只在闸门进入时才求值，健康运行下运行期恒 0，强制则每次干净运行自证红；故放宽为「静态 9/9 + 运行期被走到者指纹一致」**方向正确**。但替代判据（**源文本计数**）只是代理：注入④（保留**不可达** `evalPred` 调用 + 部署面就地复制表达式）下 `BINDING-OK=true`/`CHECK-OK`/exit 0 ⇒ **「某谓词不再在运行期被真正求值/判定不再取自登记表，而检查仍绿」确可实现**。当前版本因 9/9 站点经**人工实读**确认，同源**事实成立**；缺陷在「机证声称的强度 > 其实际能证明的强度」。**建议替代方案**：① `evalPred` 返回带标记对象、`assertion()` 只接受该对象（把同源搬到**运行期**，非闸门依赖谓词可强制）；② 或对每个 id 用 AST 断言「该 `evalPred` 调用不位于不可达分支」；③ 或对闸门依赖谓词改用**显式豁免台账**（逐条写「仅在 X 闸门进入时求值」）并与登记表机读对账 |
| 3 | **N-01 连带：7 处误报是否逐处订正 / PASS 是否为新空真** | **逐处订正 ✓（8/8 处，含 `checklist §10`）· PASS 非空真** | 逐处 grep：`README §1:17`、`§4:107-110`、`§11③:298`；`DEFECTS §0:33-36`、`§3:163-164`、`§4:216`；`checklist §10:257-262` —— 全部为 PASS，**无一处残留 FAIL**；tally 实体 `{49,42,4,3}` 与三文档逐项一致 ✓；`B21a`/`B21b`/`B22` 的 PASS 均带非空实测 detail 且谓词可失败（§4.1） |
| 4 | **N-03 撤回彻底性** | **彻底（无残留主张）** | 全仓检索「镜像未反映/镜像为空/未进入镜像/恒空/不反映宿主/镜像缺」：命中 13 处**全部**为「已撤回」语境或**假设句/否证记录**（`DEFECTS §3` 标题与四项反驳、`README N-03 行`、`checklist L48/L262`、`probe L1616` 显式标注为假阳性）；`plan-tracker BUG-009` 行已写明「D-3 已撤回 ⇒ 恢复为仅 D-2 单症状」✓（唯措辞陈旧见 `R3-08`/P3） |
| 5 | **N-04/N-05：README §5.3 与 `falsifiability.detail` 一致性 / 跨运行标注 / D-2 收敛区间** | N-04 **一致 ✓**；N-05 **跨运行标注已做、但证据链取值错配（BLOCKING）**；收敛区间**数值成立、论证锚点错** | ① `README §5.3` 声称「记录运行修订 = 终版、差异集为空」⇔ `report.json.falsifiability.detail` 存在且 sha256 闭环 ✓；R1 两轮差异归因与当前源一致（旧 label 串 0 命中）✓；② `DEFECTS §2` 对照表三行标注齐备 ✓，但 (a)(c)(d) 取值 ∉ `report.json`（`R3-01`）；③ 收敛：首采样 `05:14:05.991Z` → **最后一条「会话失效」直接读数 `C9.reopenDiag.drawerSubs[0]`（≈`05:16:12.3Z`）= ≥2′06″** → `D4` bound `05:16:37.313Z` = ≤2′31″ ⇒ **文档的「≥1′46″ / ≤2′31″」数值保守成立**，但其括注「`05:15:52Z` 前后 `C9` 前的 `settleToBound` 20 s 等待仍超时」在时序上**不可能**（该 20 s 窗口实际始于 `C8` 断言 `05:14:20.080Z` 之后、约 `05:14:20→05:14:40`；`C9` 之前还有 90 s 重开等待）⇒ `R3-05`/P3 |
| 6 | **P3 与收口项（N-06/N-07/N-08/F-03/F-12/F-14）** | **N-06/N-07/N-08 真落地 ✓；F-03 ✓；F-14 ✓；F-12 部分** | N-06：`prepOverlayClean` 实测 `{initialModal:true, closedBy:'backdrop-click', finalModal:false, ok:true}` ✓；N-07：`R-16` 存在并映射 `U-11`、`B-07` 旧理由撤下、`D-05` 与本轮 `D6=N-A` 一致、`R-01~R-16` 齐 ✓；N-08：`_analytic`/`_measured` 分列且各带来源 ✓；F-03：7 处订正 ✓；F-14：修订=终版、同 sha256 ✓；F-12：对照表与来源标注已加，唯 `§2` 取值未刷新（随 `R3-01`） |
| 7 | **增量空真普查（新增/新改谓词）** | **无「前置缺失仍 PASS」「恒真析取」「代理替代被测事实」** | §4 逐条：`B21a`/`B21b`/`B22`/`B5`/`D3`/`C11`/`D5`/`E1`/`B12b`/`C-face` 全过筛；登记表向量 19 red 全 `false` ∧ 11 ok 全 `true`（**我独立复跑 + 自做注入**）；唯一残余是机证强度（`R3-03`），不产生错误判定 |
| 8 | **局限项定级** | ① 镜像体不可达 = **P3（可接受）**；② 超时间盒 1 次 = **P3（流程偏离，不影响结论有效性）**；③ O-1 = **P3，建议另立任务** | 见 §7 逐项 |
| 9 | **隔离/清理/回归/脱敏（独立复核）** | **全部成立 ✓** | `containment 7/7`；6 项环境变量重定向；`realEnvVerdict.ok=true`（`strictDeltas={}`/`inventoryDeltas={}`/`pointsIntoIsolation=false`）；`cleanup.rootRemoved=true`；`%TEMP%\clean004-*` = **0**（我自建的 2 个注入副本已清除后复核）；写面无越界（`git status` 对 7 个产品面路径**无输出**）；脱敏 0 泄漏；**独立复跑** `smoke 291/0`（exit 0）、`validate-preset PASSED`（exit 0）、`node --check` exit 0、`falsifiability-check.mjs` `CHECK-OK`（exit 0） |
| 10 | **结论可用性** | **本轮不可作为 CLEAN-004 自动化面的「可交付记录」**（VERDICT=BLOCKED，`unresolved_blockers=2`） | 见 §9。若按 §6 的处置选项 A 完成 4 处定点订正（可选：补取截图），则本文所有**技术**结论即可作为 CLEAN-004 自动化记录使用，前提与残余不确定性同 §9 |

---

## 6. 发现列表（本轮；文件:行号 / P0~P3 / 依据 / 影响 / 建议）

| # | 文件:行号 | 级别 | 依据（事实） | 影响 | 建议 |
|---|---|---|---|---|---|
| **R3-01** | `docs/evidence/CLEAN-004/DEFECTS.md:95,97,98`（`§2` 判别证据链 (a)(c)(d)） | **P2（BLOCKING）** | 表头声明「实测值（**记录运行**）」、行 (d) 自述「本行全部数值取自 `report.json`（记录运行）」，但三行填的**全部**是上一轮（R1 返工运行）的取值：(a) `session-3c7518c9-dbcb-41e4-8d5a-1823b7a4599a`；(c) `["session-0c256d5a-…","session-3c7518c9-…"]`；(d) `tables.workspaces["5b14b27d-…"]`、首项 `session-3c7518c9-…`、`updatedAt=2026-09-14T04:11:48.369Z`。本轮权威 `report.json` 的对应值为：(a) `session-22721558-1eda-4029-bcfc-d2b3c40d7a5e`；(c) `["session-22721558-…","session-e8df27a0-7c7c-46ee-b69c-8db255124998"]`；(d) `workspaces["c986fb89-c663-40c4-bcfa-b954fd02738b"]`、首项 `session-22721558-…`、`updatedAt=2026-09-14T05:14:04.079Z`。而同一文档 `L9` 即写本轮记录运行窗口为 `05:13:45→05:16:55Z` ⇒ `04:11:48Z` 的取值**不可能**来自该文件 | ① 交付文档对自身所引原件作出**假的自述**（「本值取自 report.json」）；② 移交 Developer 的 D-2 定位链给出**不存在**的会话 id / 工作区 id ⇒ 可能误导定位；③ 破坏「每条测试结论有证据 = 100%」硬门槛（文档面）；④ 属 R2 `N-05`/`F-12` 的同类未彻底修复 | ① 把 (a)(c)(d) 三行改填本轮 `report.json` 的实测值（结论不变：四条环在本轮原件下**仍全部成立**，我已逐条复算）；② 更稳做法：由脚本从 `report.json` **抽取生成**该表（含 `facts.overviewProbe.bindings` / `isolatedDisk.sessionStore` / `hostWorkspaceJson`），杜绝对跨运行取值的手工漂移；③ 在 `§2` 明写「本表取值可由 `report.json` 逐项复算」并附复核命令 |
| **R3-02** | `docs/evidence/CLEAN-004/{README.md:92,§3 表,03/02/04.png}`；`README.md:81`（图注） | **P2（BLOCKING）** | ① 4 张 PNG 的 `LastWriteTime` = `12:38:44.482 / 12:38:53.213 / 12:41:08.185 / 12:41:20.073`（本地 UTC+8 = `04:38–04:41Z`）**完全落在 R1 返工运行窗口 `04:38:34→04:41:26Z` 内**，而本轮记录运行为 `05:13:45.162→05:16:55.181Z`（`local 13:13:45→13:16:55`）；`CreationTime` = `12:17:04.05x`（01/03/04，R1 原交付批）与 `12:42:25.940`（02，与 `report-rework-run.json` 同批 `12:42:25.935`）。② 探针 `screenshot()`（`L714-723`）把 PNG 写入 `--out`（本轮 = `%TEMP%\clean004-final`，见 `report.screenshotsTmpSource`），报告仅登记入仓相对路径；QA 交付批的时间戳显示**未发生本轮复制**（`Copy-Item` 保留源 mtime ⇒ 若复制成功应为 `13:13–13:16`）。③ `README §3:92` 却称「其余三张为**本轮重新取证**，sha256 已按上表更新」。④ 图注 `README §3` 称 `03-console-final.png` = 「控制台 + 抽屉卡『会话失效』（**D-2 可见形态**）」，但放大实读：图中「会话失效」卡是 fixture `nn-stale-bound`「失效绑定书」（其绑定值 `session-does-not-exist-clean004` 本就不存在，属设计态），被测卡「孤星纪元」**无状态后缀 = 已绑定**（与同轮 `D4` `05:16:37` bound 一致） | ① 4 张本轮的视觉证据**来源不符声明**，任何以图为据的复核会指向另一轮运行；② D-2（会话失效迟滞）**没有**对应的视觉取证（标注为「可见形态」的图实际展示的是设计内的失效绑定卡）；③ R1 `F-13`（截图路径口径）修复后的「入仓相对路径」声明**不覆盖**「图是否为本轮产出」这一事实。**注**：`E2`/`E3`/`D-1`/`C3b` 的结论各自有 DOM 读数证据（`report.json`），**不依赖**这些图 ⇒ 不影响任何断言结论 | ① 若 `%TEMP%\clean004-final` 已删除，则用一次探针复跑重取图，或在 `README §3` 如实改注「本轮未重新取证；图为 R1 返工运行副本（mtime 04:38–04:41Z）」；② D-2 的可见形态取证改为「`C3b`/`C9` 采样文字 + `03` 图的**被测卡**区域放大」或补一张收敛前截图；③ 在交付自检里加一条「证据文件 mtime ∈ 记录运行窗口」的机检 |
| **R3-03** | `docs/evidence/CLEAN-004/probe-clean-004.mjs:508-515`（`staticCallSiteCounts`）、`falsifiability-check.mjs:32-37`（`deployRegion.matchAll(/evalPred\('…/g)`）、`README §9.2/§9.3`、`checklist L261` | **P2（非阻断）** | 同源**事实**成立（9/9 站点经实读：判定值 = `evalPred` 返回值、无表达式副本），但机证用的是**源文本计数**这一代理。我的注入④（保留 `if (false) { evalPred('B5-found-sessions-area', {}) }` + 部署面就地写回等价表达式）⇒ `BINDING-OK=true / ALL-PASS=true / CHECK-OK / exit 0`：**判定未消费登记表而检查仍绿**。`README §9.1-②`（「部署断言**只能**经 `evalPred` 判定」）与 `§9.3`（「要么被 `UNBOUND` 抓，要么必须改登记块而被反例向量抓」）的表述**强于**该机的实际证明力 | 机证（`FALSIFIABILITY-PROOF` 与 `falsifiability-check.mjs`）对未来**修订**的看护强度低于其文案声称：若有人把判定复制回部署面而保留一处（哪怕不可达）`evalPred` 调用，检查不会红；配合「运行期消费」已放宽，该路径**不需要**通过任何红灯（我未在现行源中发现该形态） | ① 把同源搬到运行期：`evalPred` 返回带标记的对象，`assertion()` 只接受该对象（可对非闸门依赖谓词强制）；② 或对每个 id 增加 AST 断言「该调用不在不可达分支」，并断言「断言 `ok` 实参的表达式标识符与 `evalPred` 返回变量同一」；③ 或对闸门依赖谓词改用**显式豁免台账**（逐条「仅在 X 闸门进入时求值」）+ 台账↔登记表机读对账；④ 在 `README §9`/`checklist L261` 校准措辞（现文案把「源码级绑定计数」表述为同源保证本身） |
| **R3-04** | `docs/evidence/CLEAN-004/README.md:181`（§6 隔离证明） | P3 | 环境变量重定向写作 `…\clean004-probe-**v6c9fI**\*`（该根属 R1 返工运行），本轮记录运行的隔离根为 `…\clean004-probe-**WcBMlz**`（`report.isolation.root` 与 `isolation.env` 六项逐项均为 `WcBMlz`） | 复核者按 §6 的路径核对会指向另一轮的根；`§2:52` 与 `§7:194` 已正确写 `WcBMlz` ⇒ **同一文档内自相矛盾** | 把 `§6` 的根名改为 `WcBMlz`（或在 §6 注明「该列取自 R1 返工运行，本轮见 §2」） |
| **R3-05** | `DEFECTS.md:83`、`DEFECTS.md:88`（D-2 收敛区间论证） | P3 | 括注称「`05:14:05.991Z` 首采样 → **`05:15:52Z` 前后 `C9` 前的 `settleToBound` 20 s 等待仍超时**」，但 `C8` 断言 `05:14:20.080Z` 之后即进入该 20 s 等待（≈`05:14:20→05:14:40Z`），其后还有 90 s「分栏重开」等待（stdout 两条 `!! 超时等待` 行）⇒ `05:15:52Z` 时该 20 s 窗口早已结束、不可能「仍超时」。**数值本身成立且保守**：`C9.reopenDiag.drawerSubs[0]`（≈`05:16:12.3Z`）仍为「…会话失效」⇒ 实测未收敛 **≥2′06″**（> 文档的 ≥1′46″）；`D4`（`05:16:37.313Z`）已 bound ⇒ **≤2′31″** ✓ | 论证锚点错误会被后续复核当作时序矛盾；同时**低估**了未收敛时长（1′46″ vs 实测 ≥2′06″），可能弱化 D-2 的严重度陈述 | 改为「首采样 `05:14:05.991Z` → `C9` 的 `reopenDiag` 末次读数 `≈05:16:12.3Z` 仍为『会话失效』⇒ 未收敛 ≥2′06″；`D4` `05:16:37.313Z` 已 bound ⇒ ≤2′31″」，并保留「探针未记录收敛瞬间精确时刻」的口径声明 |
| **R3-06** | `docs/evidence/CLEAN-004/README.md:86`（自指哈希行）与 `:89`（表下注） | P3 | 表格行写 `README.md` = 35858 B / `4a8b4cc2…`，表下注写 35576 B / `d7bd9e17…`，实测 = **35979 B**；两处自述互不一致且均与实体不符（该行本身已声明「自指哈希仅代表本行写入前的状态」，但两处给出的「写入前状态」互相矛盾） | 复核者无法判断应以哪个自指值对账；不影响其它 20 份文件的哈希核验（20/20 一致） | 删去自指行的哈希/大小（或改为「见 `git hash-object`/外部记录」），保留表下注一处口径 |
| **R3-07** | `DEFECTS.md:155`（§3.2 反驳 #2） | P3 | 该行以「**记录运行** `D4` = PASS（`04:41:17Z`）…」描述 R1 阶段的事实，但「记录运行」在本文档已指本轮 `05:13` 运行 ⇒ 措辞易误读（时间戳可辨，内容无误） | 阅读者可能把 D-3 撤回所依据的读数误认作本轮读数 | 改为「R1 返工记录运行（`04:41Z`）`D4`=PASS…」 |
| **R3-08** | `.governance/plan-tracker.md:164`（BUG-009 行，Coordinator 侧） | P3 | D-3 撤回已正确同步 ✓（「⚠ D-3 已撤回…⇒ BUG-009 恢复为仅 D-2 单症状」），但该行仍保留 R2 返工前的措辞：「卡片**恒**『会话失效』」、「下游牵连 C9/C10/**D4** 三条断言」、「`B21a/B21b` **需按 R2 意见重设计或撤下**」——与本轮实测（非确定性收敛 ≤2′31″、`D4` PASS、`B21a/B21b` PASS）不一致 | 治理记录与 QA 证据面出现新的口径漂移（该行 mtime `09-14 12:55`，早于本轮返工交付） | Coordinator 收口时一并订正三处措辞并把来源指向本轮 `report.json`（属治理记录修改，非 QA 交付面） |
| **R3-09** | `docs/verification/CLEAN-004-checklist.md:261`、`README.md:264`（`C-face-availability` 的登记与可见性） | P3 | `C-face-availability` 只在 `panels.splitClosed === true` 分支内产生断言行（`probe L1157-1173`）⇒ 健康运行下报告内**没有该 id 的任何行**（本轮 `facts.cFaceGate = null`）。R2 §4.3 曾建议「固定登记为一条 N-A/SKIP 行以便审计」——**未实现**（README §10-7 仅以文字披露） | 机读消费需知「未触发即不存在」，审计者可能在 `assertions[]` 里找不到该声明项 | 可选：在 `C5` 之后无条件登记一条 `C-face-availability` 行（异常 ⇒ FAIL；未进入闸门 ⇒ 显式 SKIP/N-A 载荷含 `splitOpened`），使审计面完整 |

**发现计数**：**P0 = 0 · P1 = 0 · P2 = 3（R3-01 / R3-02 为 BLOCKING；R3-03 非阻断）· P3 = 6（R3-04~R3-09）**。

---

## 7. 局限项定级（任务指定 3 项）

| 局限 | 定级 | 依据与理由 | 建议 |
|---|---|---|---|
| ① **镜像体（`sessionsAll` 快照对象）内部读数仍不可得**（`facts.mirrorBodyUnreachable = {reachable:false, reason:'no-mirror-node-found', realms:1, scanned:724}`）⇒ `B21a` 改用**渲染面**判据 | **P3（可接受，不影响结论方向）** | R2 建议①（读镜像本体）**未完全满足**，但替代判据是**功能性**的：检索 0 行 ⇒ FAIL，且关键词取自宿主三面认可（非镜像）⇒ 若镜像不含该会话必然变红；本轮**已取得正向命中**（1 行），与「镜像收载该会话」相容。「镜像空而检索有行」属逻辑互斥组合，本机无需排除。残余：无法直接区分「镜像为空」与「镜像有该 id 但消费面失效」两类根因 | 保留现有渲染面判据 + `README §10-2` 声明；若 Developer 需要根因区分，由 Developer 侧读 `sessions.list` 快照（非本任务面） |
| ② **完整运行 4 次（超时间盒 ≤3 上限 1 次）**，第 3 次暴露探针**自身**「自证断言过严」缺陷（要求每条谓词运行期被消费，而 `C-face-availability` 闸门未进入 ⇒ 误判 FAIL）⇒ 已放宽为「静态绑定 9/9 + 运行期被走到的指纹一致」 | **P3（流程偏离；不影响结论有效性）** | ① 越限**如实登记**（`README §2:58`、`§10-10`），并给出每次的用途（调试 3 + 权威记录 1），**未**无限迭代；② 第 3 次的「过严」判断**经我独立复核成立**（见 §5-2(c)：健康运行下运行期恒 0 ⇒ 强制即假红），故放宽**不是**「为让检查变绿而掩盖缺陷」，而是修正不可满足的判据；③ 探针修复轮次 3 ≤ 3 ✓；④ 该偏离**不影响**记录运行的有效性（第 4 次运行在修正后取得，修订=终版、哈希闭环） | 保留如实登记；若流程要求严格 ≤3，可在下次同类任务中把「自证断言的可用性先做小样本空跑（`--skip-browser` 级别）」写入时间盒计划，避免用整轮运行试错 |
| ③ **新观察项 O-1**（命中行标题用 cwd 名 `novels` 而非会话 id，按 id 检索时难以人工核对） | **P3；建议另立任务（非阻塞）** | 事实成立：命中口径含 id（`lib/client.js:3396`），行标题 = `e.displayTitle ?? e.id`（`L3435`），而 `displayTitleOf` 的兜底为 cwd 名 ⇒ 呈现串与用户的检索串不同形。但：① 属**观感/可核对性**面，无「用户可见契约被破坏」的证据（`B21a`/`B21b`/`B22` 全 PASS）；② 行标题口径由宿主 `displayTitleOf` 决定，**非插件可单方面修正** | 建议由 Coordinator 另立 **UX 观感任务**（如「命中行标题补会话 id 片段 / 二次标识」），在 `DEFECTS §6 O-1` 已登记的基础上补「建议归口 + 判据来源」；本轮**不计缺陷** |

---

## 8. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0**（本轮新发现最高 P2；交付侧 D-1 P3 / D-2 P2 / P0=0） | ✅ **PASS** |
| R2 的 N-01~N-08 逐条有处置判定 | = 100% | **8/8** 有判定（已修复 7 / 未彻底 1[=N-05]；F-03/F-12/F-14 另判） | ✅ **PASS** |
| 每条测试结论有证据 | = 100% | **不成立**：`DEFECTS §2` 证据链 (a)(c)(d) 的取值 ∉ 其所引 `report.json`，且 (d) 自述「取自 report.json」为假（`R3-01`）；4 张 PNG 的取证轮次与 `README §3` 声明不符、图注与图内实体不符（`R3-02`）。**断言本体**（49 条 detail + 双运行 + 哈希）齐备且 D-2 结论可由 `report.json` 重新推导成立 | ❌ **FAIL** |
| 空真/弱断言（含不可失败断言） | = 0 | **0**：`B21a` 极性反置已消（实体代码 + 向量 + 实测三面）；9 谓词 **19 red 全 false / 11 ok 全 true** 且 `DECLARED ≡ EVALUATED`；9/9 部署站点实读同源；无新增「前置缺失仍 PASS / 恒真析取 / 代理替代被测事实」 | ✅ **PASS** |
| 同源保证有效性 | 已独立裁定（含自我放宽步骤的裁定） | **裁定完成**：现状同源**成立**（9/9 站点实读 + 两向注入皆红）；自我放宽步骤**正当**（原判据不可满足 ⇒ 假红），但替代判据为文本代理、留有可被绕过的孔洞 ⇒ `R3-03` P2 **非阻断**（见 §5-2） | ✅ **PASS（附残余 P2）** |
| 每条发现标注 P0~P3 | = 100% | 交付侧（D-1 P3 / D-2 P2 / O-1 观感项 / C5 时序 artifact）逐条带级别 ✓；本轮 `R3-01`~`R3-09` 逐条带级别 ✓ | ✅ **PASS** |

**裁决**：**BLOCKED** —— 1 项硬门槛未通过（「每条测试结论有证据」），`unresolved_blockers = 2`（`R3-01`、`R3-02`，均 P2）。
**熔断判断（T2）**：本轮 **round = 3 ≥ 3 且仍有 BLOCKING** ⇒ **MUST 转 BLOCKED + escalation**，由用户裁定处置（选项见下）。

### 8.1 剩余阻断项 + 建议处置（返工 / 冻结点 / 接受风险）

| 选项 | 内容 | 成本 / 风险 | 适用 |
|---|---|---|---|
| **A. 定点返工（推荐）** | ① `DEFECTS §2` (a)(c)(d) 三行改填本轮 `report.json` 实测值（或改为脚本从 `report.json` 抽取生成）；② `README §3` 截图声明改为与文件实体一致（或补取图 1 次）；③ `README §6` 隔离根笔误；④ `DEFECTS §2` 下界锚点表述（可用更准的 ≥2′06″）；⑤ 可选：`R3-03` 的机证硬化 + 文案校准 | **≈4 处文案、无需重跑探针**（②若选「补取图」则需 1 次复跑）；风险低——四处均为文档面，**不改变任何结论** | 希望保持「文档与原件逐项可对账」的交付标准时 |
| **B. 冻结点 + 接受风险** | 不改文档，把 `R3-01`/`R3-02` 记录为**已知局限**（写入交付说明 + BUG-009 移交单：Developer 以 `report.json` 实测值为准；截图不计入证据面），并由 Coordinator 记 decision/risk | 成本最低；风险：后续机读/人工复核会再次撞上「文档 vs 原件」矛盾，D-2 的视觉取证缺失 | 发布节奏紧、且认可以上均为文档面、结论不变时 |
| **C. 接受现状（不推荐）** | 不处置 | 不建议：`R3-01` 属「自述与所引原件矛盾」，与 R2 在 N-01/N-04 上定级 BLOCKING 的同一类问题；会污染 Developer 定位与后续机读复核 | — |

---

## 9. 结论可用性 + 残余不确定性

### 9.1 结论可用性
- **本轮判定：BLOCKED（`unresolved_blockers = 2`）⇒ 该验证资产**暂不能**作为 CLEAN-004 自动化面的「可交付记录」。**
- **技术面（可复用部分）**：谓词可失败性与同源机制、隔离/清理/真实环境零污染、回归基线、脱敏、双运行/跨运行对照、修订=终版 —— **均经独立复核成立**（§1/§4/§5/§8）。QA 三条上报（D-1 P3 / D-2 P2 / C5 时序 artifact）**未被本报告推翻**，D-3 撤回**成立**。
- **若采用 §8.1 选项 A 完成定点订正**（4 处文案；可选补取截图），则本文全部技术结论即可作为 CLEAN-004 自动化面记录使用；**使用前提**：① `HEAD = 21b100c` ∧ `lib/client.js` 未改动；② 期望值 = `tally 49 / 42 / 4 / 3`、`exit 1`（4 FAIL = D-1 ×1 + D-2 及其下游 ×3）；③ 与证据一起阅读 `README §10` 局限清单。
- **使用时的残余不确定性**（不因订正而消失）：
  1. **未整轮复跑探针**（时间盒）：本轮以「原件实读 + 源码级核验 + 跨运行对照 + 自做注入式机证 + 宿主/插件代码核验 + 文件时间戳取证」替代 ⇒ 「`C3b` 的真实根因」「截图的确切轮次」仍有不可得面。
  2. **镜像体内部读数仍不可得**（`scanned:724`，0 命中）⇒ 以渲染面为功能判据；「镜像空 vs 消费面失效」两类根因不可分（§7-①）。
  3. **D-2 非确定性**：三轮表现不同（记录运行 ≤2′31″ 收敛 / `run1`+`discovery` 不收敛）⇒ 单轮证据不足以断言复现率；根因待 Developer（`lib/client.js:1339-1372` 镜像订阅面）。
  4. **`C-face-availability` 本轮无正例**（闸门未进入）⇒ 其可失败性仅由登记表向量 + 静态绑定背书（§7 与 `R3-09`）。
  5. **`C5` 竞态窗口未注入复现**（沿用 R1/R2 口径：多次干净运行 + 一次崩溃对照 + 机制代码）。
  6. **`B21a` 覆盖口径窄**：仅 id 检索分支；按人类标题检索与「镜像 `displayTitle` ≡ 宿主 `displayTitleOf`」一致性未覆盖（fixture 下不可构造）。
  7. **本轮发现的两条阻断项均为文档/证据归属面**：订正后结论不变，但**必须**完成订正才能支撑「文档 ⇄ 原件」逐项对账的交付标准。

---

**审查者**：Test Reviewer Agent（只读；未修改任何产品代码 / 测试 / 探针 / 清单 / `.governance/**`；唯一写入 = 本文件；本轮在 `%TEMP%` 建过 2 个注入副本目录与 1 个图片裁切中转文件，均已删除并复核 `%TEMP%\clean004-*` = 0）
**本报告路径**：`docs/review/CLEAN-004-TEST-R3.md`
**结论**：**BLOCKED**（round = 3 达熔断；剩余 BLOCKING 2 = `R3-01` + `R3-02`，均 P2，属文档/证据归属面；P0 = 0 / P1 = 0 / P2 = 3 / P3 = 6；`unresolved_blockers = 2`）
