# CLEAN-004 测试审查报告 — R2

**ROUND**：**R2**（返工后复审）· **REVIEW_TYPE**：**test-review**
**PREV_ROUND_REF**：`docs/review/CLEAN-004-TEST-R1.md`（结论 **NEEDS_CHANGE**，BLOCKING 6 条 = F-01~F-06，另 F-07~F-15 为 P3；`unresolved_blockers = 6`）
**审查者角色**：Test Reviewer Agent（只读；唯一写入 = 本文件）
**审查对象**（返工交付，本轮自述 `DONE_WITH_LIMITS`）：`docs/evidence/CLEAN-004/{README.md, DEFECTS.md, probe-clean-004.mjs, probe-clean-004.final-rev-e1644ec1.mjs, falsifiability-check.mjs, falsifiability-check-stdout.log, report.json, report-rework-run.json, report-rework-discovery.json, report-run1.json, report-final4-crash.json, record-run-stdout.log, rework-discovery-stdout.log, *.png}` + `docs/verification/CLEAN-004-checklist.md`
**仓库 / HEAD**：`D:\AI\agent\deepseek\harness\writing-workflow` / `21b100ce9ac32e534c6215e507f9835f87e0ff4c`（`git status --porcelain -- lib/ test/ scripts/ agent-presets/ package.json README.md CHANGELOG.md` = **空**，实跑确认）
**日期**：2026-09-14 · **机录**：本轮 REVIEW 持久化（`review-record`）由 Coordinator 执行——审查边界禁止本 Agent 写 `.governance/**`。

---

## 0. 结论

**VERDICT: NEEDS_CHANGE**（BLOCKING **5** 条：N-01 P1 + N-02/N-03/N-04/N-05 P2；另有 P3 ×3）
**`unresolved_blockers = 5`**（R2 为 round=2 < 3 ⇒ **尚不到熔断**，不建议本轮转 BLOCKED；若 R3 仍存 BLOCKING ⇒ MUST 转 BLOCKED + escalation）

| 维度 | 结论 | 一句话依据 |
|---|---|---|
| 1. 策略完整性 | **基本满足** | F-01/F-02/F-04/F-05/F-06 的策略缺口均已落地（可失败谓词 + 未覆盖风险节 + 独立存活信号 + 未绑定卡前置）；但新增的「可失败性机证」机制**与部署谓词不同源**（§3.4），策略自证链断 |
| 2. 用例质量 | **不满足** | 新/改谓词中 **1 条极性反置且完全不可失败**（`B21a`：值表达式 = `ackComplete === true`，在缺陷态记 **PASS**）；1 条前提未证即判 FAIL（`B21b`）⇒ 增量空真普查**未归零** |
| 3. 覆盖率 | **基本满足（1 处零落点残留）** | R1 点名的 **9 个待目检面**逐面落点（R-01~R-09）✓、**6 类零覆盖面**全部登记（R-10~R-13、R-02/R-03、R-05）✓；残余：`E-01`「数据面板内容面待目检」仍无 R 项/无 U 项（P3） |
| 4. 证据充分性 | **不满足** | 三份权威文档（`README §1/§4/§11③`、`DEFECTS §0/§3/§4`、`checklist §10`）一致声称 `B21a` = **FAIL**，而**记录运行原件**（`report.json` + `record-run-stdout.log`）均记 **PASS**；D-3 的判定依据被同轮证据 + 宿主代码反驳（§5-5） |
| 5. 可复现性 | **部分满足** | 命令/退出码/双运行/哈希/隔离链齐备，回归基线独立复跑一致；但 `§5.3` 的「记录运行修订 → 终版」差异表**第 1 项被记录运行自身反驳**（§5-6），且过程运行与记录运行的差异被**错误归因**（§3.5） |

**一句话总结**：返工把 R1 的 F-01/F-02/F-04/F-05/F-06 真正修好了（`B5`/`C11` 空真消除、`D3` 真前置 PASS、E/F 面**首次实测**且前置经独立证实为真、清单补 `§9`），**D-3 却不成立**——`B21a` 的部署谓词写成了「前提成立即绿」（缺陷态记 PASS、永不可能 FAIL），而「镜像 `sessionsAll.ids` 为空」这一核心事实**未读镜像本体**，并与同轮 `D4`（04:41:17，`byId` 命中 ⇒ 镜像含该会话）+ 宿主 `projectList`（`ids`/`byId` 同循环构建 ⇒ `byId ⊆ ids`）**直接冲突**；关键词 `孤星` 与宿主 `displayTitleOf`（title→cwd 名→id）无交集 ⇒「找到的会话」空是**预期行为而非缺陷**。同一批交付物内另有三处「与自身原件矛盾」的表述（`B21a` 状态、`§5.3` E1 差异项、过程运行差异归因），故本轮判 **NEEDS_CHANGE**。

---

## 1. 独立核验方法（全部只读；本轮**未复跑探针**，见 §9-1）

| 手段 | 命令 / 读取面 | 结果 |
|---|---|---|
| 哈希与体量 | `Get-FileHash` × 19（`docs/evidence/CLEAN-004/*` 全量 + `checklist`；`README` 自身不加哈希） | **19/19 与 `README §3` 逐项一致**（含 4 张 PNG、2 份 stdout、2 份探针副本） |
| 计数 | `report.json.tally` 实读 | `{total:49, pass:40, fail:6, na:3}` ✓ 与 README §1/清单 §10 一致 |
| 逐条状态 | 49 条 `id`+`status` 实读 | **id 全唯一**（F-08 的机读歧义已消除）；`B21a` = **PASS**（与文档声明相反） |
| 双运行对照 | `report-rework-discovery.json` × `report.json` 逐条 diff | **唯一状态差异 = `E1` FAIL→PASS**（非 README 所称的 D6 分类） |
| 历史对照 | `report-run1.json`（R1 期复跑）逐条比对 | `D4` = **FAIL**（run1）/ **PASS**（记录运行）⇒ 定位到 DEFECTS 的跨运行引用 |
| 谓词实读 | 探针全文实读（1656 行）按调用点核对：`B5` L765-771、`B12b` L834-837、`C11` L1176-1182、`C-face` L1071-1075、`E1` L1285-1288、`E2` L1341-1347、`E3` L1348-1350、`E4` L1354-1357、`F1` L1382-1383、`D3` L1395-1406、`D5` L1444-1453、`B21a` L1478-1513、`B21b` L1590-1599、`D6` L1552-1558、`assertion()` L515-521 | 逐条结论见 §3、§4 |
| 同源性 | `Select-String -Pattern 'PREDICATES'` / `'\.fn\('` | **`PREDICATES` 仅出现 2 处**（L342 定义、L425-429 报告函数）⇒ **无任何部署断言消费该表** |
| 注入式核对 | `%TEMP%` 临时脚本（运行后已删除）：①基线 ②回退 B5 为旧恒真析取 ③去 B12b 空集前置 ④仅改**部署面** B5 谓词 | ①`ALL-PASS=true` ②③`ALL-PASS=false, exit=1, FAILED_ROWS=[B5] / [B12b]` ④**`ALL-PASS=true` 不变**（PREDICATES 块逐字节相同） |
| 宿主契约 | 只读 `…\@deepseek-ai\dsh-api-session-controller\lib\client.js`（`projectList` L3355-3415、`displayTitleOf` L2996-3004） | `ids.push(x); byId[x] = {displayTitle…}` **同循环**；`displayTitleOf` = `title ?? cwd 名 ?? id` |
| 源码链 | `lib/client.js` 实读 L1339-1425、L1427-1433、L1544-1584、L2866-2895、L3096-3099、L3394-3397、L3966-3995 | D-2/D-3 的消费链逐行成立（**结论方向见 §5-5**） |
| 复查回归 | `node test/smoke.mjs` / `node test/validate-preset.mjs` / `node --check probe` / `node falsifiability-check.mjs` | **291 passed / 0 failed（exit 0）**；**PRESET VALIDATION PASSED（exit 0，skills 29/29）**；exit 0；**ALL-PASS=true（exit 0）** |
| 脱敏 | 9 份新文件扫 `token=(?!***)…` / `sk-*` / `Bearer` / `apiKey` | **真 token 命中 0**；`token=***` 出现在 4 份（report ×3 + README）⇒ 脱敏彻底 |
| 隔离与清理 | `report.isolation` / `cleanup` / `realEnvVerdict` / `Z1` | `containment` **7/7**、6 项环境变量全部重定向、`realEnvVerdict.ok=true`（`strictDeltas={}` ∧ `inventoryDeltas={}` ∧ `pointsIntoIsolation=false`）、`cleanup.rootRemoved=true`（7 子目录）、`%TEMP%\clean004-*` = **0** |
| 写面边界 | 全仓 mtime + `git status` | `lib/test/scripts/agent-presets/package.json/README.md/CHANGELOG.md/AGENTS.md` 最新 mtime 均为 **09-13 16:56 前**；QA 交付窗口 12:37–12:45:45 内 `.governance/**` **无写入**（`.governance` 写入 12:21–12:46 = Coordinator 侧 R1 记录与返工派发） |
| 用户环境 | 只读 `.dsh-bundle-version` | `0.5.2`（mtime **09-12 19:51:40** 未变）⇒ 用户实例未被触碰 |

> **未执行**：完整复跑探针（时间盒代价高，与 R1 同口径）⇒ 采用「原件实读 + 源码级核验 + 双运行对照 + 注入式机证 + 宿主代码核验」。残余不确定性已在 §9 明示。

---

## 2. 前轮 findings 逐条处置对照表（F-01~F-15，100% 有判定）

> 判据：**以当前文件实体 + 记录运行原件为准**，不采信返工自述。

| # | 前轮问题 | 处置判定 | 依据（本轮独立核验） |
|---|---|---|---|
| **F-01** | `B5` 谓词含恒真析取（空真 PASS） | ✅ **已修复** | `probe L765-771`：重写为 `b5HostHasRows && (foundTitle!==null && rows≥1)`，宿主 0 行 ⇒ 强制 N-A；记录运行 `N-A {b5HostHasRows:false,b5MirrorRendered:false}` ✓；**注入式核对**：回退为旧形态 ⇒ `ALL-PASS=false`（B5 行变红）⇒ 新表对旧形态具备变红能力 |
| **F-02** | `D3` 无前置（`barOpenBefore:false` 空真 PASS） | ✅ **已修复** | `probe L1403-1406` 加 `barOpenBefore===true` 前置 + N-A 门控；记录运行 `PASS {barOpenBefore:true, consoleOpen:true, barOpenAfter:false, d3Prep:{ok:true,reason:'already-open'}}` ⇒ **前置真成立**（分栏由 §11 未绑定卡构造，实测在场）；反例 `barOpenAfter:true` ⇒ 谓词 false ⇒ 可失败 |
| **F-03** | `B21×2`/`B22` 的 N-A 理由与自身字段矛盾 | ❌ **未修复（并新引入 2 条 BLOCKING）** | ①`B21a` 判定依据虽改写，但**部署谓词写反**：`L1507-1510` 断言值 = `ackComplete === true`（去掉 N-A 通道后**永不可能 FAIL**）⇒ 缺陷态记 **PASS**（`report.json` #44 = PASS、`record-run-stdout.log` = `OK B21a…`），而 `README §1（F-03 处置行）/§4 行4/§11③`、`DEFECTS §0 行4/§3/§4（影响表）`、`checklist §10` **共 7 处 / 3 份文档**一致声称 FAIL；②「镜像 `sessionsAll.ids` 为空」未读镜像本体，且与同轮 `D4`（`byId` 命中）+ 宿主 `projectList`（`byId ⊆ ids`）冲突；③关键词与 `displayTitleOf` 口径不匹配（详见 **N-01/N-03**）；④`B21b` 极性正确（`false` → FAIL）但前提未证 ⇒ 假阳性（**N-03**） |
| **F-04** | E/F 面前置「本实例无法构造」过强（仅用 `孤星纪元`） | ✅ **已修复（本轮最关键项，判定为真）** | `probe L1197-1228` 新增 `prepareSplitForNotice()`（未绑定卡候选 `mm-third-probe` 优先）；记录运行 `facts.splitReadyForNotice = {ok:true, attempts:[{cardId:'mm-third-probe', clicked:{clicked:true,source:'drawer'}, opened:true, bar:true, bindPanel:true}], reason:'unbound-card-reopen'}` ⇒ **前置真成立**；**卡片确为未绑定**（交叉证据：`report-run1.json` 中 `mm-third-probe` 显示「未绑定」，记录运行 §11 后被绑定 ⇒ 绑定系本次点击的结果）；`E1`~`E4`/`F1` **全 PASS** 且谓词逐条可失败（见 §3.3） |
| **F-05** | 清单缺「未覆盖风险」+ 9 面无落点 | ✅ **已修复** | `checklist §9.1` R-01~R-09 **逐一对应 R1 点名的 9 面**（A-05/B-02/D-04/D-05/D-06/E-02/E-03/F-01/F-02），每条含「面/判据来源/为何未覆盖/归口/残余风险」；R-10~R-13 **补齐 6 类零覆盖面**（绑定新会话动作面/空书目/窄窗口/多书>8/无会话根/服务缺席）；`§9.2` 缺口→U-11~U-14 映射 ✓；`§9.3` 建议任务 5 项 ✓；悬空引用（§0 L22 / ④ / `C-17`）已闭合 ✓ |
| **F-06** | C 面闸门偏宽（打开后自发关闭无变红通道） | ✅ **已修复** | `probe L1071-1075` 新增 `C-face-availability`：`cFaceAnomaly = splitOpened===true` ⇒ 断言值 `false` + `FAIL`；`splitOpened!==true` ⇒ N-A。极性/门控实读正确；注入式反例（`{splitOpened:true, splitClosed:true}`）⇒ 谓词 false ✓。**说明**：记录运行 `C5` PASS ⇒ 闸门未进入、该断言未产生（`facts.cFaceGate = null`）⇒ 本轮无正例触发证据，但有代码级 + 机证（**N-02** 的「机证非同源」不适用于该条的**极性**，仅影响自证效力） |
| F-07 | 清单 §7 三处状态与 §3 矛盾 | ✅ **已修复** | `checklist L136`（C-07 PASS / **C-09 FAIL**）、`L137`（**C-10 FAIL** / **C-11 N-A**）、`L151`（**C-16 N-A**）三处已同步并标注 R1 订正 ✓ |
| F-08 | 同一 `id` 在同份报告出现两次 | ✅ **已修复（报告面）** | 记录运行 49 条 `id` **全唯一**（`B21a-search-find-sessions` / `B21b-search-find-sessions-retest`）✓；残余：同一 id 在互斥分支仍各有一处 call site（`E1`×2、`B21a`×2、`B21b`×3、`B22`×2、`D6`×2、`F1`×2），同轮不会同时执行 ⇒ 机读无歧义（P3 可选优化） |
| F-09 | 看门狗注释与实现相反 | ✅ **已修复** | `probe L534-539` 注释已改为「只 `console.error` + 记 `Z0` FAIL，**不能中断挂起 `await`**」并给出 CI 外部超时建议——与 `L541-544` 实现一致 ✓ |
| F-10 | 装配逐函数重复（1285→1656 行） | ❌ **未修复（如实声明 + 已登记建议任务）** | `checklist §9.3` 第 5 项已将本项并入 `CLEAN-006` F-6 范围（`scripts/**` 在写锁外）⇒ 依 R1 的 P3 定级与任务边界，**不构成 BLOCKING** |
| F-11 | `D5` 代理「服务可用」/`B12b` 空集恒真 | ✅ **已修复** | `B12b L835` 加 `cardHeights.length > 0`（记录运行 `{tileH:180, cardHeights:8 项均≥179.5, emptySet:false}`）；`D5 L1444-1453` 改读 `degraded` 派生渲染面两态 + `serviceSignal===true` 之外强制 N-A；注入式核对：去空集前置 ⇒ `ALL-PASS=false` ✓。残余：`degradedBranchReachable:false` 为**硬编码常量**（非实测）置于 detail 中（**N-08**） |
| F-12 | `DEFECTS` 跨运行引用混用（04:06 时间戳） | ⚠️ **部分修复（同类残留未穷尽）** | 证据行 (d) 已逐项标注「记录运行 `04:11:48.369Z` / 复跑 `04:06:02.503Z`」✓；但 **`DEFECTS L73` 与 `L110`** 仍称「同轮 `D4` 亦因 `bound=false` FAIL」——记录运行 `D4` = **PASS**（`bound:true`），`FAIL` 实为 **run1** ⇒ 同类混用；且「卡片**长期**停『会话失效』」的表述与记录运行不符（**N-05**） |
| F-13 | 报告登记已清理的临时绝对路径 | ✅ **已修复** | `report.json.screenshots[]` = `docs/evidence/CLEAN-004/*.png`（入仓相对路径）✓；`screenshotsTmpSource[]` 另记 `%TEMP%` 来源 ✓ |
| F-14 | 记录运行修订未留存 | ❌ **未修复（部分修复 + 差异说明本身不实）** | 终版副本 `probe-clean-004.final-rev-e1644ec1.mjs` 入仓 ✓（且与 `probe-clean-004.mjs` 同 sha256 ✓）；但 `§5.3` 差异表**第 1 项**称「记录运行修订**不存在** E1 的 PREDICATES 条目」——被记录运行自身的 `report.json.falsifiability.detail`（含 `E1-short-notice-compact` 行，`finding` 文案与终版逐字一致）**直接反驳**；第 2 项（D6 分类）经核验为真。⇒ 差异清单不可采信（**N-04**） |
| F-15 | `U-3`「新卡聚焦」无判据来源 | ✅ **已修复** | `checklist L181` 已从期望中删除并注明理由（UX-012/UX-055 后无判据来源，如需保留须给出 `lib/client.js` 判据行）✓ |

**统计**：已修复 **10**（F-01/02/04/05/06/07/08/09/11/13/15 = 11 项，其中 F-08 为报告面修复）· 部分修复 **1**（F-12）· 未修复 **3**（F-03 / F-14 / F-10[已声明+已登记]）· **新引入 3**（见 §6 N-01/N-02/N-03，其中 N-01 与 F-03 同根）。
> 精确计数：**已修复 11**（F-01、F-02、F-04、F-05、F-06、F-07、F-08、F-09、F-11、F-13、F-15）· **部分修复/未彻底 2**（F-12、F-14）· **未修复 2**（F-03、F-10）· **新引入 2**（N-01、N-02；N-03 为 F-03 的延伸判定）。

---

## 3. 五维度结论

### 3.1 策略完整性 — 基本满足
- 三态口径（PASS/FAIL/N-A）在 `assertion()`（`L515-521`）**强制**：`st = status ?? (ok ? 'PASS' : 'FAIL')`；N-A 不计 PASS（`report.ok` 全 PASS 才 true）✓。
- **9 处「前置门控」**（`? undefined : 'N-A'` 形态）逐条实读：`B5` L771、`C5` L1057、`C-face` L1075、`C8` L1112、`C11` L1182、`D3` L1406、`D5` L1453、`B21a` L1510 —— **8 条门控与断言值同向（前置不成立 ⇒ N-A）**，**唯 `B21a` 反置**（`N-01`）。
- 隔离/清理/回归/脱敏策略**完整且经独立复核**（§1 表、§8）。
- **缺口**：新增的「可失败性自证」被当作策略级保证，但它验证的是**平行副本**（§3.4/`N-02`）。

### 3.2 用例质量 — 不满足
- 新/改 11 处谓词中 **9 条**具名可失败（`B5`/`D3`/`C-face`/`B12b`/`D5`/`C11`/`E1`/`E2`/`E3`/`E4`/`F1` 语义实读见 §4）；**1 条不可失败**（`B21a`），**1 条前提未证**（`B21b`）。
- 记录运行 49 条**全部**带非空 `detail`（0 条空载荷）✓；每条断言有 1 份 stdout 原件 ✓。
- 缺陷质量：`DEFECTS` 每条含级别 + 复现步骤 + 影响 + 代码判据 + 归因边界 ✓，但 **D-3 的级别/结论建立在不成立的依据上**（§5-5）。

### 3.3 覆盖率 — 基本满足（1 处零落点）
- 主路径（A/B/C/D 共 28 条）+ 回归（`Z1`）+ 机证（`FALSIFIABILITY-PROOF`）齐备；`E`/`F` 面由 N-A ×5 → **实测 ×5 全 PASS**（真前置，§2 F-04）。
- R1 的 9 面 + 6 类零覆盖面 **全部有落点**（§2 F-05）；用户项 U-1~U-14（新增 4 条并说明突破 ≤10 上限的理由）✓；`U-2`/`U-4` **覆盖 D-2/D-3 的用户可见症状** ✓（U-2 由用户输入真实会话标题片段，不含本轮的探针关键词缺陷）。
- **零落点残留**：`checklist L102 E-01`「**内容面待目检**」（数据面板真实信号内容）既无 R 项亦无 U 项 ⇒ `N-07`。

### 3.4 证据充分性 — 不满足（**本轮首要问题**）
- 49/49 有证据载荷、哈希 17/17 一致、双运行对照齐备 ✓。
- **但**：`B21a` 的**记录运行状态（PASS）与三份文档的声明（FAIL）不一致**，且其部署谓词在缺陷态记绿（`N-01`）；「镜像 ids 为空」这一事实**没有读数支撑**（无镜像本体载荷），并被同轮 `D4` + 宿主 `projectList` 反驳（`N-03`）。
- **机证机制（`FALSIFIABILITY-PROOF`）与部署谓词非同源**：静态（`PREDICATES` 仅 2 处引用，无部署消费点）+ 经验（`B21a` 部署谓词与登记谓词语义相反，`ALL-PASS` 仍为 true）⇒ 自证不能为部署面背书（`N-02`）。

### 3.5 可复现性 — 部分满足
- 齐备：命令 + cwd + 起止时刻 + 时长 173 s + 退出码语义（`process.exitCode = ok?0:1`）+ stdout 原件 + HEAD/`headDirty=false` + 浏览器/Node/端口 + 隔离根 + `--out` 复现指引 ✓；两次完整运行隔离根互异（`lAYxGJ` ≠ `v6c9fI`）✓。
- **不符**：`§5.3` 差异表第 1 项与记录运行自证矛盾（`N-04`）；`§1` 把过程运行与记录运行的差异说成「同源码差 1 处**分类描述（D6）**」，而实测**唯一状态差异是 `E1` FAIL→PASS**，且两轮 `E1` 的 `label` **不同**（过程运行 label 含「不靠 tooltip 兜底」，在当前源中 **0 命中**）⇒ **两轮并非同源**，该归因错误（`N-04`）。
- `report-run1.json` 退出码仍为推定值 1（README §10-④ 如实声明 ✓，可由代码推得 ✓）。

---

## 4. 增量空真 / 弱断言普查（40 条 PASS 过筛，重点本轮新改/新增）

> 判据同 R1：**谓词是否具备「在真实缺陷下变红」的能力** ∧ **前置是否在判定时刻真实成立**。

### 4.1 不可采信（**1 条**，新引入）

| ID | 谓词（源码） | 记录值 | 为何不可采信 |
|---|---|---|---|
| `B21a-search-find-sessions` | `probe L1507-1510`：断言值 = **`ackComplete === true`**，门控 `ackComplete===true ? undefined : 'N-A'` | `PASS`，detail `{sessionRows:{foundTitle:null,rows:[]}, acked:{boundId:'session-c0cf54dd-…'}, ackComplete:true}` | 断言值 = **前提本身**（宿主三面认可），与 label 声明的受测性质（「镜像未反映宿主会话 ⇒ 真实缺陷」）**方向相反**；无 FAIL 通道（只能 PASS 或 N-A）⇒ **在缺陷态恰好记绿**。同批文档称其 FAIL，实为 PASS（§5-5）。注入式旁证：`PREDICATES` 中登记的 B21a 谓词对该向量求值为 `false`，而部署面记 PASS ⇒ 二者**不同源** |

### 4.2 前提未证（**1 条**，新引入）

| ID | 问题 | 记录值 | 评级 |
|---|---|---|---|
| `B21b-search-find-sessions-retest` | 极性正确（`consoleOpen ∧ rows<1 ⇒ FAIL`），但**未证「关键词应命中该会话」**：`sessions.create` 不传 title（`lib/client.js:1550/1560`），`displayTitleOf` = `title ?? cwd 名 ?? id`（宿主 `lib/client.js:2996`），实测 id = `session-c0cf54dd-…`（随机 UUID）⇒ `孤星` 与之无交集 ⇒ 空结果为**预期行为** | `FAIL {mirrorProbe:{consoleOpen:true,attempts:0,found:null,rows:[]}}` | **P2**（`N-03`）：假阳性缺陷主张 |

### 4.3 弱断言 / 潜在弱化（**2 条**，未触发；R1 同类项已明显改善）

| ID | 现状 | 判定 |
|---|---|---|
| `D5-sessions-present` | 已改读 `degraded` 派生渲染面两态，并保留 `legacyPredicate` 作对照；降级分支不可达 ⇒ N-A 门控 ✓ | P3：`degradedBranchReachable:false` 为**硬编码常量**（`L1452`）置于 detail | 
| `C-face-availability` | 极性正确、可失败；但仅在闸门内产生 ⇒ 本轮未进入闸门（`cFaceGate=null`），**报告内无该 id** | P3：机读消费需知「未触发即不存在」；建议固定登记为一条 N-A/SKIP 行以便审计 |

### 4.4 其余 36 条 PASS（判定：具体、可失败、前置成立）
- **R1 已逐条审过的 29 条**：谓词未变（本轮哈希与调用点标签一致），本轮另核对 `detail` 非空且与谓词字段一致（抽检 `A1`/`B10`/`B12b`/`C7`/`C8`/`D4`/`Z1` 全部吻合）✓。
- **本轮新增取得观测的 5 条**（`E1`/`E2`/`E3`/`E4`/`F1`）逐条实读：
  - `E1` `L1285-1288`：`present ∧ form==='row' ∧ lines===1 ∧ h≤32 ∧ titleAttr==='' ∧ sw≤cw+1`；实测 `{cls:'nv-notice',form:'row',lines:1,h:29,titleAttr:'',overflow:{sw:558,cw:558}}` ∧ 前置 `waitFor(已恢复默认布局)` + `restoreClicked.clicked=true` ⇒ **可失败**（block/多行/溢出任一即红）。
  - `E2` `L1341-1347`：`waitFor(promptFailPrefix)` ∧ `form==='block' ∧ insideBar===false ∧ lines≥2 ∧ 无截断 ∧ close===1 ∧ titleAttr==='' ∧ whiteSpace==='pre-wrap' ∧ 首尾文案逐字`；实测 `{form:'block',lines:4,close:1,whiteSpace:'pre-wrap',len:259,prefixOk:true,suffixOk:true}` ∧ **故障注入真发生**（`injections.count=1`）⇒ 强。
  - `E3` `L1348-1350`：`interTitle===0 ∧ interCtlMax===0 ∧ y≥barBottom-0.5 ∧ belowContent!==false`；实测 `{interTitle:0,interCtlMax:0,y:39,barBottom:39,belowContent:true}` ⇒ 具体几何可失败。
  - `E4` `L1354-1357`：关闭钮点击后 `.nv-notice` 消失；实测 `{notice:false}` ⇒ 可失败。
  - `F1` `L1382-1383`：监听 `dsh:split-claim` 后在「关 → 等消失 → 开」窗口内捕获；实测 `{claims:['novel-writing'],barClosed:true,reopened:true}` ⇒ 前置真成立、可失败。
- `FALSIFIABILITY-PROOF`（`L1612-1614`）：其**自身**断言可失败（任一行 `pass=false` 即红），但**背书对象错位**（`N-02`）。

**普查结论**：增量空真/弱断言 **未归零** —— 新增 1 条**不可失败伪 PASS**（`B21a`）+ 1 条**前提未证的假阳性 FAIL**（`B21b`）；`B5`/`D3`/`C11`/`B12b`/`D5` 的空真/弱化已确认消除（含注入式核对）。

---

## 5. 高风险主张逐条结论（任务指定 10 项）

| # | 主张 | 独立结论 | 依据 |
|---|---|---|---|
| 1 | F-01~F-15 逐条比对 | **已完成**（§2，15/15 有判定） | 见 §2；三处未修复/部分修复：F-03（未修复+新引入）、F-12（部分）、F-14（不实的差异说明）；F-10 为已声明的 P3 遗留 |
| 2 | **F-04 的 PASS 是否真实**（本轮最关键） | **真实**（前置真成立、谓词可失败） | `facts.splitReadyForNotice.attempts[0] = {cardId:'mm-third-probe', clicked:{clicked:true,source:'drawer'}, opened:true, bar:true}`；**卡片确为未绑定**（run1 中该卡显示「未绑定」；记录运行 §11 后方被绑定）；`E1`~`E4` 触发链独立可证（`noticeShortTrigger.label='恢复默认布局'` ∧ `injections.count=1`）；`F1` 抓到 `claims:['novel-writing']` 且 `barClosed ∧ reopened` ⇒ **非空真**。残余：构造时遗留 `.nv-modal`（`bindPanel:true`，两轮皆然）未披露（`N-06`） |
| 3 | 反证自证的可信度 | **机制不成立（非同源），脚本本身不恒真** | 静态：`PREDICATES` 只有定义 + 报告函数两处引用 ⇒ 部署断言**不消费**该表；经验：`B21a` 部署谓词与登记谓词语义相反而 `ALL-PASS=true` ⇒ 无法为部署面背书。注入式核对（`%TEMP%` 临时脚本，用后删除）：①基线 `ALL-PASS=true`；②回退 `B5` 旧恒真析取 ⇒ `ALL-PASS=false, exit=1, FAILED_ROWS=[B5]`；③去 `B12b` 空集前置 ⇒ `ALL-PASS=false, FAILED_ROWS=[B12b]`；④**只改部署面** `B5` 谓词 ⇒ 抽取块**逐字节相同** ⇒ `ALL-PASS=true`。另：`falsifiabilityReport()` 仅读 `red`/`red2`（`L426-427`）⇒ **`E1` 的 `red3`（`L410`）被静默丢弃**，README §1「16 个反例向量」/§9「E1 = 3」与实际（**13 red / 13 ok = 26 个向量求值**；表内声明 14 red / 27）**不符**（`N-02`/`N-07`） |
| 4 | 是否引入新的空真/弱断言 | **是（2 条）** | §4.1 `B21a`（不可失败伪 PASS）· §4.2 `B21b`（前提未证的假阳性 FAIL）；其余新改项（`B5`/`D3`/`C-face`/`B12b`/`D5`/`C11`/`E1~E4`/`F1`）经逐条实读 + 注入核对**无**「前置缺失仍 PASS」「恒真析取」「代理替代被测事实」 |
| 5 | **D-3 判定的独立复核** | ❌ **不成立（证据不足 + 被同轮证据与宿主代码反驳）** | ①**镜像本体从未读取**：`B21a`/`B21b` 只有 DOM 读数，无 `sessionsAll.ids`/`byId` 载荷（D-3 的「`ids` 为空」是**反推**）；②**与同轮 `D4` 冲突**：`D4` = **PASS**（04:41:17，搜索前 2 s）`{cards:8, id 含 zz-first-probe, drawerCards:10, autoCreateBound:{sub:'outline_writing · 3章 · 1200字', bound:true}}`，而 `bound` 取自 `useSessions(s => s.byId[boundId])`（`lib/client.js:2874-2877` + `L2877-2881`）⇒ **镜像 `byId` 内含该会话**；③**宿主代码反证**：`dsh-api-session-controller\lib\client.js:3355-3415` `projectList()` 在**同一循环**里 `ids.push(entry.sessionId)` 与 `byId[entry.sessionId]=…` ⇒ **`byId ⊆ ids`** ⇒ 「`ids` 为空」与 ②直接矛盾；④**观测本身属预期**：搜索谓词匹配 `e.displayTitle ?? e.id`（`lib/client.js:3396`），而宿主 `displayTitleOf = title ?? cwd 名 ?? id`（宿主 `L2996-3004`）、插件 `sessions.create` **不传 title**（`lib/client.js:1550/1560`）、实测 id = `session-c0cf54dd-…` ⇒ 关键词 `孤星` 与二者**无交集**，「找到的会话」空是**正确行为**；⑤探针注释「同键同时命中…会话 id（zz-first-probe 派生）」与实测 id 冲突。⇒ 结论：**D-3 应撤回为「未定性」或先补证**（缺环：镜像本体读数 + 该会话 `displayTitle` + 与 `D4` 矛盾的解释），**不得据此并入 BUG-009 作为同源第二症状**。QA 自述的**归因残余**（`button[class*=sessionRow]` 计数 0 不足以区分「宿主未渲染」与「选择器差异」）**已如实写入** `DEFECTS §3 归因边界` ✓（该部分诚实，但残余指向的是「宿主侧栏是否渲染」，而真正未证的环是「插件镜像是否为空」） |
| 6 | F-14 部分修复是否可接受 | **不可接受（结论可复现性仍有实质缺口，且差异说明本身不实）** | 终版副本入仓 ✓ 且「未以错版冒充」✓（`README §5.3` 诚实边界）；**但**差异表第 1 项被记录运行 `report.json.falsifiability.detail`（含 `E1` 行）反驳 ⇒ 读者无法据此判定「记录运行修订 vs 终版」的真实差异。**影响级别**：差异清单失真 = **P3**；「运行修订无法逐字重建」本身 = **P3**（因 `report.json` + stdout 原件已固化运行**产出**，仅修订源不可得）；二者叠加使任何「以终版复跑得到同结论」的推断缺少依据 ⇒ 定级 **P3，但必须订正表述**（不得保留与自证矛盾的差异项） |
| 7 | N-A 合法性（本轮 3 条 + `B5`/`C11`/`B22`） | **合法**（无伪造 PASS/FAIL） | `B5` N-A（宿主会话行 = 0 ⇒ 前置未取得，且原为空真 PASS）✓；`C11` N-A（`flipBackClick=false` ⇒ ⇄ 未被点击）✓；`B22` N-A（镜像无行可点）✓；`D6` 由 FAIL → 未定性 N-A **正当**（`hostRowsBefore=0`，探针只点到「新建会话」入口——**新建**不改 `sessions.current` ⇒ 原 FAIL 属依据不足）——但记录运行仍是 FAIL（旧分支），文档需与之对齐（`N-07`）。**注**：`B21a` 的问题**不是** N-A 合法性而是**伪 PASS** |
| 8 | 覆盖缺口复评 | **达标（1 处零落点残留）** | `R-01`~`R-09` 对应 R1 的 9 面（A-05/B-02/D-04/D-05/D-06/E-02/E-03/F-01/F-02）✓；6 类零覆盖面（绑定新会话动作面 R-10 / 空书目 R-11 / 窄窗口 R-12 / 多书>8 R-13 / 无会话根 R-02+R-05 / 服务缺席 R-03）✓；`U-1~U-14` 可判定性复核：U-2/U-4 覆盖 D-2/D-3 症状 ✓、U-3 已删无来源期望 ✓、U-11~U-14 判据具体 ✓；**残余**：`E-01` 内容面「待目检」无落点（`N-07`） |
| 9 | 隔离/清理/回归/脱敏 | **成立** | `containment` 7/7（任一假即 exit 2）；6 项环境变量全落隔离根；`realEnvVerdict.ok=true` 为**前后实读指纹**（`strictDeltas={}` ∧ `inventoryDeltas={}` ∧ `pointsIntoIsolation=false`）；清理在 `finally` 内且**先于**写报告（`L1606-1629`）；`rootRemoved=true`；`%TEMP%\clean004-*` = 0（`ux060-*` 21 项属他任务，README 写 20——非 QA 面，不计）；写面无越界（§1 表）；脱敏 0 泄漏；**独立复跑** `smoke` = 291/0（exit 0）、`validate-preset` = PASSED（exit 0）、`node --check` = exit 0、`falsifiability-check.mjs` = `ALL-PASS=true`（exit 0） |
| 10 | 时间盒与流程纪律 | **基本成立（1 项与证据不符）** | 本轮完整运行 **2 次**（过程运行 `lAYxGJ` 04:34:54→04:37:37 + 记录运行 `v6c9fI` 04:38:34→04:41:26）≤ 3 ✓；探针修复轮次自述 ≤3——**不可完全机证**（记录运行修订未留存），仅可证修订**至少**经历 2 次变化（过程运行 `E1` 谓词/label 与记录运行不同、记录运行与终版另 2 处）⇒ 仍 ≤3 但披露不准确（`N-04`）；`DONE_WITH_LIMITS` 两项局限（F-14 修订未留存、D6 未定性）**已如实登记**，且**未影响 P1 项完成度**（P0/P1 缺陷仍为 0）✓ |

---

## 6. 发现列表（本轮新增；文件:行号 / P0~P3 / 依据 / 影响 / 建议）

| # | 文件:行号 | 级别 | 依据（事实） | 影响 | 修复建议 |
|---|---|---|---|---|---|
| **N-01** | `docs/evidence/CLEAN-004/probe-clean-004.mjs:1507-1510`（记录值 `report.json` #44、`record-run-stdout.log`） | **P1**（BLOCKING） | 断言值 = `ackComplete === true`，门控 `ackComplete===true ? undefined : 'N-A'` ⇒ **永不可能 FAIL**；记录运行实测 `ackComplete:true ∧ foundTitle:null ∧ rows:[]` ⇒ `status=PASS`（stdout `OK B21a…`）。而 `README §1/§4/§11③`、`DEFECTS §0 行4/§3「FAIL ×2」/§4`、`checklist §10「FAIL 归属… ×2（B21a/B21b）」` **一致声称 FAIL** | 主链断言在缺陷态记绿（比 R1 的空真更严重：**方向相反**）；`PASS 40` 含此条 ⇒ 正确 tally 应为 **39 PASS / 7 FAIL / 3 N-A**；`清单 §10「空真/弱断言 = 0」`不成立；三份证据文档与原件冲突 ⇒ 下游 `BUG-009` 入账会被污染 | ①谓词改为含红通道的合取（如 `ackComplete === true && rows >= 1`，并对 `ackComplete ∧ rows<1` 显式记 FAIL）；②**先**按 `report.json`/stdout 事实订正 README/DEFECTS/checklist 三处状态（不得保留 FAIL 表述）；③`D-3` 的主张见 N-03，改判前不得并入 BUG-009 |
| **N-02** | `probe-clean-004.mjs:342,425-429`（自证机制）、`falsifiability-check.mjs:8-13`、`README §1/§9`、`checklist §10` | **P2**（BLOCKING） | `PREDICATES` 全源仅 2 处引用（定义 + `falsifiabilityReport()`），**无部署断言消费**；注入式核对：只改**部署面** `B5` 谓词 ⇒ 抽取块逐字节相同 ⇒ `ALL-PASS=true`；`B21a` 部署/登记谓词语义相反而 `ALL-PASS=true`。`falsifiabilityReport()` 只读 `red`/`red2` ⇒ `E1` 的 `red3`（`L410`）被静默丢弃；实测 **13 red / 13 ok**，而 README「16 个反例向量」/§9「E1=3」不实 | 「谓词无恒真分支」被**平行副本**背书 ⇒ 自证效力覆盖不到真正断言的代码；向量计数失真使读者高估覆盖率 | ①让部署调用点**消费** `PREDICATES[i].fn`（同一函数实例），或以 AST/正则提取部署表达式再求值；②`falsifiabilityReport()` 支持任意 `redN`/`okN` 或 `reds:[]` 数组；③按实测订正向量计数，并加断言「声明数 ≡ 求值数」 |
| **N-03** | `probe-clean-004.mjs:1457-1513,1565-1599`（判定依据）、`DEFECTS §3`、`checklist L48 B-07 / L258` | **P2**（BLOCKING） | 「镜像 `sessionsAll.ids` 为空」**无镜像本体读数**；同轮 `D4` = PASS（04:41:17，搜索前 2 s，`byId` 命中 ⇒ 镜像含 `session-c0cf54dd`）；宿主 `dsh-api-session-controller\lib\client.js:3355-3415` 同循环构建 `ids`/`byId` ⇒ `byId ⊆ ids`；搜索按 `displayTitle ?? id` 匹配（`lib/client.js:3396`），`displayTitleOf = title ?? cwd 名 ?? id`（宿主 `L2996`）且 `sessions.create` 不传 title（`lib/client.js:1550/1560`）、id 为随机 UUID ⇒ `孤星` 无交集 ⇒「找到的会话」空为**预期行为** | **D-3（P2 产品缺陷）不成立/证据不足**：`B21b` 的 FAIL 为假阳性，`B21a` 的 PASS 为伪绿；若并入 `BUG-009` 将造成**无根据的产品缺陷主张**，浪费 Developer 定位成本并污染缺陷台账 | ①判定前**先读镜像本体**（`sessions.list` 快照的 `ids`/`byId` 载荷）并落证；②记录被测会话的 `displayTitle`，用**该标题**（或 id 片段）作关键词；③把「宿主行数 0」与「镜像为空」两环分离取证；④在 `DEFECTS` 明确 D-3 改判为「未定性（探针依据不足）」，并撤回「同源第二症状」表述 |
| **N-04** | `README §5.3 差异表第 1 项`、`README §1 表注/§10-②`；`probe-clean-004.mjs:404-412,1287` | **P2**（BLOCKING） | ①记录运行 `report.json.falsifiability.detail` **含** `E1-short-notice-compact` 行（`finding` 文案与终版逐字一致）⇒「记录运行修订**不存在**该条目」被自身原件反驳；②过程运行与记录运行的**唯一状态差异是 `E1` FAIL→PASS**，且两轮 `E1` 的 `label` 不同（过程运行 label「…不靠 tooltip 兜底」在当前源 **0 命中**）⇒ **两轮并非同源**，而 README 归因为「同源码差 1 处分类描述（D6）」（`D6` 两轮均 FAIL，记录运行 `D6` 分支 detail 为旧分支形态） | 「记录运行修订 vs 终版」的差异清单**不可采信**；「同源码」前提错误 ⇒ 报告与源码的对应关系无法闭合；复现者按此表推演会得出错误结论 | ①删去/重写差异表第 1 项，据原件如实陈述「差异无法逐字重建且已列项有误」；②把过程运行说明改为「E1 谓词曾按『标题栏 chip』判定 ⇒ FAIL；记录运行改用单行紧凑语义 ⇒ PASS，两轮非同源」；③登记该 E1 谓词订正于 §5.2 变更清单 |
| **N-05** | `DEFECTS.md:73`、`DEFECTS.md:110`（D-2 证据链与影响表） | **P2** | 记录运行 `D4` = **PASS**（`autoCreateBound:{sub:'outline_writing · 3章 · 1200字', bound:true}`，04:41:17）；`D4` = FAIL 且 `sub` 含「会话失效」者为 **`report-run1.json`**（R1 期复跑）⇒ 同句「同轮」为跨运行引用（F-12 同类未穷尽）；且「卡片**长期**停『会话失效』」与记录运行不符（C3b 采样窗 04:38:55–04:39:07 恒 stale，至 `settleToBound` 20 s 等待在 04:39:29 前后仍超时 ⇒ ≥36 s 未收敛，而 04:41:17 的 `D4` 已收敛 ⇒ 应为「**数十秒内不收敛（≤2′24″）**」而非「恒/长期」） | D-2 的严重度与"确定性"被高估；「同轮」引用使读者误判两个运行一致 | ①`L73`/`L110` 标注数据来源运行（记录运行 `D4=PASS`；run1 `D4=FAIL`），或直接给两轮 `D4` 各自读数；②把「长期」改为实测时限（≥36 s 未收敛、≤2′24″ 内收敛），并注明 `run1` 与记录运行表现不同（非确定性）；③复核 D-2 是否仍满足 P2 定级或应降级 |
| **N-06** | `report.json.facts.splitReadyForNotice.attempts[0].bindPanel`（两轮皆 `true`）、`probe-clean-004.mjs:1136-1152,1197-1233` | **P3** | `E`/`F`/`D3` 的前置构造（§11）在上述时刻 `document.querySelector('.nv-modal') !== null`——系 §10 `C9` 失败重开所遗留的绑定面板（`probe L1134-1142` 关闭的是**上一次**的遮罩，本次点击又打开一个）⇒ 观测发生在**非干净 DOM 态**（存在遗留模态）。`README §5.2/§10`、`DEFECTS` 未披露 | 读者无法得知 E 面观测的现场态；虽 `E1~E4/F1` 的谓词与前置各自独立可证（结论仍成立），但「首次实测」的现场描述不完整 | ①§11 前置构造前显式关闭遗留 `.nv-modal`（`backdrop.click()` + 等待消失）并断言 `bindPanel===false`；②或在 `E1~E4/F1` 的 detail 中登记「构造期存在的模态」 |
| **N-07** | `checklist L102（E-01）`、`L48（B-07）`、`L94（D-05）`、`README §1/§4（R-16）`、`README §1/§9（16/3 向量）` | **P3** | ①`E-01` 标注「**内容面待目检**」但 `§9` 无对应 R 项、`U-11` 未涵盖数据面板内容 ⇒ **零落点面残留**；②`B-07` 状态格仍以「隔离实例的会话镜像未回收自建会话 ⇒**本环境无法构造**」为解释——这正是 R1 F-03 判定「理由与自身证据矛盾」的旧口径，与 D-3 重定冲突（同格已写「自动化 FAIL（缺陷 D-3）」）；③`D-05` 行称「自动化 `D6` 因宿主侧栏无会话行记 **N-A**」，而记录运行 `D6` = **FAIL**（终版谓词下才是 N-A）；④`README §1` 称「15 面」而 `§4` 称「R-01~**R-16**」（实数 **R-01~R-15**）；⑤「16 个反例向量」/`§9`「E1=3」与实测（13 red / 13 ok；`red3` 未求值）不符（与 N-02 同源） | 零落点面使 F-05 的「缺口已列明」存在遗漏；状态引用不一致会误导机读与人工复核 | ①为 `E-01` 内容面补 R 项（或并入 `R-06/R-07` 并写进 `U-11` 判据）；②`B-07` 状态格改写为「自动化判据不成立（探针缺陷）⇒ 见 N-03；缺陷主张待补证」；③`D-05` 行注明「记录运行 FAIL（旧谓词）/ 终版谓词 N-A」；④统一 R 编号计数；⑤按实测订正向量的计数 |
| **N-08** | `probe-clean-004.mjs:1452`（`degradedBranchReachable: false`） | **P3** | 该字段为**硬编码常量**（非测量值）却与 `consoleDots/drawerDots/legacyPredicate` 等实测字段并列写入 `detail` | 读者可能误认为「已实测确认降级分支不可达」 | 改名为 `degradedBranchReachable_analytic` 并在 `README §10` 说明其来源（隔离实例必提供 `sessions` 服务），或改为由 `useSessions !== null` 的实测读数推导 |

**发现计数**：**P0 = 0 · P1 = 1 · P2 = 4 · P3 = 3**（BLOCKING = N-01~N-05 共 5 条）。

---

## 7. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0**（最高为 N-01/P1；`DEFECTS` 侧 P0 = 0 亦成立） | ✅ **PASS** |
| 前轮 findings 逐条有处置判定 | = 100%（F-01~F-15） | **15/15** 有判定（已修复 11 / 部分修复 2 / 未修复 2；其中 F-03、F-14 同时伴随新引入） | ✅ **PASS** |
| 每条测试结论有证据 | = 100% | **47/49 = 95.9%**：`B21a`（判定依据反置，且文档状态误报）与 `B21b`（前提未证）2 条结论的依据**不成立**；另有 3 处文档级状态与原件冲突（N-01/N-04/N-07） | ❌ **FAIL** |
| 空真/弱断言 | = 0（增量普查后） | **1 条不可失败伪 PASS**（`B21a`）+ 1 条前提未证的假阳性 FAIL（`B21b`）+ 自证机制**非同源**（`red3` 未求值）⇒ 未归零 | ❌ **FAIL** |
| 覆盖缺口已列明 | 已完成（含零落点面判定） | `§9` R-01~R-15 覆盖 R1 的 9 面 + 6 类零覆盖面 + 缺口→用户项映射 ✓；**残余 1 处零落点**（`E-01` 内容面，N-07） | ✅ **PASS（附 P3 残余）** |
| 每条发现标注 P0~P3 | = 100% | QA 侧（D-1 P3 / D-2 P2 / D-3 P2 / C5 artifact）逐条带级别 ✓；本轮 N-01~N-08 逐条带级别 ✓ | ✅ **PASS** |

**裁决**：**NEEDS_CHANGE** —— 2 项硬门槛未通过（`unresolved_blockers = 5`：N-01~N-05）。
**熔断判断**：本轮 **round = 2 < 3** ⇒ 尚不到熔断，**不建议**本轮转 BLOCKED；但若 R3 复审仍有 BLOCKING，**MUST** 转 BLOCKED 并 escalation。

---

## 8. 已独立复核并确认成立的事项（供 R3 免重复核验）

1. **哈希/计数**：17 份文件 sha256 与体量与 `README §3` 逐项一致；`report.json` = `report-rework-run.json`（同 sha256 `7d576275…`）✓；`probe-clean-004.mjs` = `probe-clean-004.final-rev-e1644ec1.mjs`（`e1644ec1…`）✓。
2. **双运行**：隔离根互异（`lAYxGJ` / `v6c9fI`），49 条 id 全唯一，**唯一状态差异 = `E1` FAIL→PASS**（见 N-04）。
3. **F-01/F-02/F-06/F-11 的谓词修复**：实读 + 注入式核对（回退即红）✓。
4. **F-04 前置真实性**：`mm-third-probe` 确为未绑定卡（run1 未绑定 → 记录运行点击后绑定），`opened:true` ✓；E1~E4/F1 全套实测（含故障注入 `count=1`、事件 `dsh:split-claim` 捕获）✓。
5. **N-A 合法性**：`B5`/`C11`/`B22` 三条 N-A + `D6` 改判依据正当，无伪造 PASS/FAIL ✓。
6. **隔离/清理/脱敏/写面**：§1 表逐项 ✓；用户实例 `~/.dsh` 只读且 `0.5.2`（09-12 19:51）未变 ✓；`.governance/**` 无 QA 写入 ✓。
7. **回归基线**：`smoke` 291/0（exit 0）、`validate-preset` PASSED（exit 0）、`node --check` exit 0、`falsifiability-check.mjs` 复跑 `ALL-PASS=true`（exit 0）✓。
8. **文档同步（F-07/F-15）**：`checklist §7` 三处状态、`U-3` 期望、`screenshots` 相对路径（F-13）均已按 R1 订正 ✓。

---

## 9. 残留不确定性（R3 应一并处理）

1. **未复跑探针**：本轮以「原件实读 + 源码级核验 + 双运行对照 + 注入式机证 + 宿主代码核验」替代整轮复跑（时间盒）。因此 §5-5 的 D-3 判定基于**静态与交叉证据**（`D4` 读数、宿主 `projectList` 代码、搜索匹配口径）——判据充分，但**未做「读镜像本体」的注入式实证**（该实证正是建议 R3/返工时补做的动作）。
2. **记录运行修订不可得**（F-14/N-04）：终版源码无法与运行修订逐字对齐；差异清单第 1 项已证伪，第 2 项已证真 ⇒ 真实差异集仍未知。
3. **`E1` 两轮判定口径不同**（N-04）：过程运行的 `E1` FAIL 属旧谓词（「标题栏 chip」），记录运行 PASS 属新谓词；两轮的 `E1` 一致性**不可作为重复性证据**。
4. **C5 竞态窗口未注入复现**（沿用 R1 §9-4）：结论仍建立于「两次干净运行 + 崩溃对照 + 机制代码」三者合力，`C-face-availability` 本轮**未触发**（无正例证据，仅代码级 + 机证）。
5. **D-2 的收敛时限未定**：记录运行显示卡片在 ≥36 s 后收敛（`D4` PASS），`run1` 则不收敛 ⇒ 非确定性，需 Developer 定位（不影响本轮测试审查结论，但影响 D-2 的定级与措辞）。

---

**审查者**：Test Reviewer Agent（只读；未修改任何产品代码/测试/探针/清单/`.governance/**`；唯一写入 = 本文件）
**本报告路径**：`docs/review/CLEAN-004-TEST-R2.md`
**结论**：**NEEDS_CHANGE**（BLOCKING 5：N-01 P1 + N-02~N-05 P2；`unresolved_blockers = 5`；round = 2 < 3 ⇒ 未达熔断）
