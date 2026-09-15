# CLEAN-006 代码审查报告 — **R1**

- **round = R1**（无前轮 R0；本报告为 CLEAN-006 的首轮 Code Review）
- **审查对象**：
  - **A 段 `6f65bbe`**：`CLEAN-006: 验证资产/记录正确性批次 A 段（N-1/N-5 探针分类桶机检化 + N-2/N-3/N-6/N-4/F6）`（9 路径）
  - **B 段 `535d798`**：`CLEAN-006: F1 会话镜像 hook 改走 useSyncExternalStore（BUG-009 R1 F1 / RISK-008）+ 契约分段重基`（7 路径）
- **HEAD**：`535d7981c44bd4d15ecb1a6f7ff671f1f8267a99`（审查时工作树 `git status --porcelain` 为空 ⇒ 磁盘 ≡ HEAD）
- **前轮来源**：`docs/review/BUG-010-R1.md`（N-1~N-6）、`docs/review/CLEAN-007-R2.md`（N-1~N-7）、`docs/review/BUG-009-R1.md`（F1/F6）、`docs/review/UX-060-R1.md`
- **审查者**：Code Reviewer Agent（**只读**；唯一写入 = 本报告）
- **审查方式**：
  1. `git show <rev> -- <path>` 逐行读两段 diff（含 395 行探针 diff / 418 行 smoke diff / 契约 diff）；
  2. **独立复算**（脚本置于 `%TEMP%\clean006-verify-r1\`，仓库零写入）：台账源控制哈希 / 桶和 / id 全集；`difflib.SequenceMatcher` 重算 `lib/client.js` 插入点与 Δ 分段；逐项核对契约 `line` 字段的真值；
  3. **门禁复跑**：`smoke` / `validate-preset` / `node --check` / `--falsifiability`；两份归档 `report.json` 与仓内基线逐条 `id:status` 对比；
  4. 只读检索宿主平面（`...\@deepseek-ai\dsh-client-ui-*`）核验 F6 归因与宿主 API 事实。

## 结论：**NEEDS_CHANGE**

> 硬门槛 `P0 = 0` **未通过**：P0 ×1（F-01，契约 `items[]` 1.6/1.9 的调用点行号被按**另一个文件**的 Δ 误重基 ⇒ 契约「行号唯一事实源」写入失实事实）。其余四道门槛通过，A/B 两段的主体结论（台账机检化、F6 归因订正、F1 实现与五契约保持、冻结面零改动、门禁全绿）**经独立复算成立**。

---

## 0. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 判定 |
|---|---|---|---|
| **P0 阻塞问题数** | = 0 | **1**（F-01） | **FAIL** |
| 5 维度全覆盖 + 每条发现带级别 | = 100% | §8 五维度逐项结论齐全；§7 全部 15 条发现带 P0~P3 | PASS |
| 设计一致性（P-10 / 契约不变量 / BUG-005 五契约 / BUG-009 收敛语义） | 已完成 | §10 完成（P-10：**1 处失实** + 2 处机制陈述失实；契约不变量全项通过；BUG-005 五契约保持；BUG-009 收敛语义保持） | PASS（已完成；含 P0/P2 发现） |
| AI 代码专项 5 项 | 全部完成 | §9 五项逐一有结论 | PASS |
| 台账机检 + 契约分段重基 | **独立复核**（非采信自述） | §4.1 / §4.2 完成：台账机检**独立复现全绿**；契约重基**独立复算**发现 F-01 | PASS |

---

## 1. A 段逐项核验（任务清单 1~5）

### A-1 N-1/N-5 台账机检真实性（本段最关键）

**结论：成立（机检本体独立复现全绿），但「文件头口径由台账派生」的主张未实现（F-10，P1）。**

| 检查面 | 独立复算结果 | 与 Developer 自述 |
|---|---|---|
| ① 桶↔id 显式映射为单一事实源 | `ASSERTION_LEDGER.slots[]`（28 条 id↔bucket）是机检唯一输入；`ASSERTION_BUCKET_DEFS` 5 桶；桶和/id 归桶/桶内未知 id 均由 `slots` 派生 ✅ | **部分不一致**：自述与代码注释均称「文件头『口径如实披露』段由**本台账派生**」——实读 `ASSERTION_DOC` **全文件仅声明处出现 1 次**（`scripts/probe-nv-ux012.mjs:350`），**无任何消费点**（死代码）；文件头 `:126-135` 的「28 条 = 20+2+1+3+2」仍是**人工副本** ⇒ 派生关系不存在 ⇒ 见 **F-10（P1）** |
| ② 机检四项 + 唯一性 | 独立读源码复现四项判据：桶和 ≡ 台账条数 ≡ 声明总数（`assertionLedgerReport()`）；`unassigned`（源码实有、台账缺失）；`unknownInBucket`（台账在册、源码无调用）；`excludedOk`（闸门 N-A 必落 `bucket-drive`）；`idsUniqueOk`（无重复归桶）✅ | 一致 |
| ③ 源控制锚（接线行 sha256） | **独立重算**：取 `@ledger-source-control:` 标记行之后的全部含 `A(/*@assert*/` 行（32 行）顺序拼接后 `sha256` = `45802774295bb0f62bea3697ce87ff3a6601f899080676992ef98ca338443272` ≡ 台账 `declaredSha256` ✅；`declaredSiteCount = 32` ≡ 实际 32 行 ✅；唯一 id 数 28 ≡ `declaredTotal` ✅ | 一致（"实测 45802774…" 逐字复现） |
| ④ 「新增/删/改断言而漏更新台账」必红 | 独立推演 + 读注入式自证：新增/改名 ⇒ `unassigned ≠ 0`；删除 ⇒ `unknownInBucket ≠ 0`；改文案/桶定义 ⇒ 源哈希变 ⇒ `hashMismatch`；加/删接线处 ⇒ `siteCountMismatch`。另核**逃逸面**：全文件 `assertion(` 调用**除定义外 100% 经 `A(/*@assert*/` 形态**（非 A 形态计数 = 0）、**无动态 id**（全部字面量）⇒ 无「绕过台账」的接线形态 ✅ | 一致 |
| ⑤ 8/8 注入式反例 | 独立跑 `node scripts/probe-nv-ux012.mjs --falsifiability` → **exit 0**，`CLASSIFICATION-LEDGER PASS：…注入式反例 8/8`；逐类命中与期望一致（`bucketSumMismatch`/`countMismatch`/`unassigned`/`unknownInBucket`/`excludedOk`/`hashMismatch`/`siteCountMismatch` 各 1 条 + 基线 1 条）✅ | 一致；但**自选复核**发现两处判据精度问题 ⇒ **F-07（P3）**：(a) 基线用例 `expectTypes=[]` ⇒ `ok ≡ (0===0) ≡ true`，`issues` 只被记录、**未被判**（"基线 MUST 0 命中"未机检，真实台账健康由 `ledRep.ok` 兜住）；(b) 注入⑥ 的判据 `siteCount !== a.slots.length`（28）≠ 部署面 `directiveLines.length === declaredSiteCount`（32）⇒ 「判据与 `assertionLedgerReport()` 同式」的注释**近似**成立 |
| ⑥ 归属订正（N-5）事实性 | 独立枚举 `excludedFromNa` 4 条 = `A7b-focus-wrap` / `A1b-input-autofocus` / `A6-focus-restore` / `A2b-modal-semantics-full`，四条**全部** `bucket-drive` ✅；`A2`/`B2` 实为 `bucket-dom-read`（单次快照读数）✅；`A6`/`A7b` 原文件头确未点名（读 `git show 6f65bbe^:scripts/probe-nv-ux012.mjs` 文件头确认）✅ | 一致（N-5 归属偏差订正事实成立） |
| ⑦ `28 唯一 id（含 N-A 4）≠ 32 物理接线` 自洽性 | 28 = 20+2+1+3+2 逐桶复算一致；32 = 物理接线处；差 4 = 4 条闸门断言各有 if/else 两处接线（逐条读 `A7b`/`A1b`/`A6`/`A2b` 的 if/else 分支确认各 2 处）✅ | **一致（口径自洽、未掩盖差异）**；残余口径残面 ⇒ **F-07(c)**：运行期 `tally.total = 27`（PASS 23 / N-A 4）≠ 台账 `declaredTotal = 28`，差额 = `UX012-CRASH` **仅在 catch 分支记录**（`probe-nv-ux012.mjs:711`）——该「28 声明 / 27 记录」的差在文件头与 `ASSERTION_DOC` 口径中**未说明** |

### A-2 N-2 断言与引用

**结论：① 标注如实 ✅；② 两处交叉引用订正正确 ✅；③ 撤回覆盖主张成立，但「不可达」取证**充分性不足**（F-08，P2）。**

- **① `splitKept` 同值不变式**：真跑读数 `splitBefore=false`（A/B 两段提交自述 + 代码面 `openConsole()` 先 `closeWorkbench()`，`lib/client.js:3040-3045`；`closeWorkbench` 亦在 `:3042` 前置判定）⇒ `splitKept` 恒真 ⇒ 只拦「越界关分栏」方向（red4），**不是**「分栏在场时仍不关」的状态检查。谓词注释（`probe-nv-ux012.mjs:107-110`）与断言标签均已如实写明 ✅ **标注如实，与自述一致**。
- **② 两处交叉引用订正**：
  - `C4`（`probe-nv-ux012.mjs` 断言 `UX012-C4-split-state-esc-layering`）读 `panelWasOpenInSplit`/`panelWasClosed`（`.nv-modal` 面板态）⇒ 覆盖【绑定面板开在分栏之上】✅ **实读成立**；
  - 冻结探针 `B17`（`docs/evidence/CLEAN-004/probe-clean-004.mjs`）覆盖【新建弹窗 `.nv-cmodal` 开在控制台之上】——按 id 命名与断言面核，与「工作区对话框 `.nv-modal` 开在分栏之上」不同族 ✅ **两处引用确为失实，订正正确**。
- **③ 撤回覆盖主张 + 不可达性取证（关键）**：
  - 撤回本身**成立**（该分层确无行为级覆盖）。
  - 不可达性论证的两条腿中，**代码面腿成立**：全文件 `entryOpen: true` **恰 1 处**（`lib/client.js:3625`，`.nv-cbtn-ws` 在控制台内）⇒ 唯一入口在控制台内；`openConsole()` 先 `closeWorkbench()`（`:3042`）⇒ 控制台在场时分栏已被关。
  - **DOM 取证腿不充分**：`facts.workspaceDialogEsc.reachability` 只在侧栏抽屉锚点**单点** `elementsFromPoint`，取到 `_mask_w1urq_14`（遮罩）→ `interactionBlocked:true`。它**未**取证：(a) 遮罩几何是否覆盖整个视口（`getBoundingClientRect` ≡ viewport）、(b) `pointer-events !== 'none'`、(c) 入口枚举（现仅断言语义、无机检）。⇒ 「该场景不可达」这一**load-bearing 结论**目前只有**单点采样**支撑。
  - **更廉价的替代构造（建议采纳，已核可行性）**：把「入口唯一性 + `openConsole ⇒ closeWorkbench` 互斥不变式」做成**源码面机检**（两条字符串/计数断言，注入式反例易构造、确定性强），比 DOM 单点取证更强且不触宿主；行为面若要保留，则把单点扩为「多点采样 + 遮罩 boundingRect/pointerEvents 取证」。**不建议**以非点击方式越障驱动（会掩盖不可达性）。详见 **F-08（P2）**。

### A-3 N-3 / N-6

**结论：两处订正均**成立且具判别力**；仅注释中的「TDZ 捕获」理由不确（F-10，P3）。**

- **N-3 smoke F6 判据面扩面**（`test/smoke.mjs:699-742`）：
  - 判据①（锚唯一 + 组件归属 + 早退顺序）：`wsEscUnique === 1`（以整个 effect 文本为锚，全仓唯一）、`wsEscOwner === 'WorkspaceDialog'`（前置最近组件函数）、`wsEscR > wsEscH`（effect 早于 `if (open !== true) return null`）——**独立实读判据与实现一致** ✅；
  - 判据②（正向对照 `wsEscCounterTest`）：区域内摘出 effect → 插到早退之后 → `mh > 0 && !(mr > mh)`，构造合法 ⇒ **不是恒真判据** ✅；且注释已记录两处实现坑（`===` 优先级、replace 必须限定在本组件区段）✅；
  - **残余**：注释称"真实误置会因 `close()` 的前向引用触发 TDZ 而被探针捕获"——按 React 语义，effect 后移的实际故障形态是**条件 hook 调用/effect 注册顺序翻转**（开启/关闭两态 hook 数不一致），非 TDZ ⇒ 措辞不确（不影响本条判据的判别力）。见 **F-10（P3）**。
- **N-6 行号副本同步方归属**：注释（`test/smoke.mjs:2200-2204`）写明同步方 = `COMPAT-015 F3 行号引用对账`、并显式与末条 `COMPAT-014 A-F9`（只负责 smoke 计数）区分 ✅ **正确归因、未混写**。独立核：F3 扫描各面 `<item> L<n>` 引用是否落在契约 `line` 界内 ⇒ 回退副本必命中 F3；A-F9 只比对「声明 N ≡ 实测 N」⇒ 与副本数值无关 ✅ 归属正确。
  - 残余措辞（**F-06，P3**）：自述「实测**仅 F3 转红**」与「连带显示 295/2」两句并存——295/2 意味着**2 条红**，建议按实际失败集如实记录（另一条疑似同区段消费同一注释块的范围类断言）。

### A-4 N-4 归档策略

**结论：归档策略与「记录运行不替换」口径**成立**；provenance 存在 1 处**错标**（F-05，P3）。**

- 目录 `docs/evidence/CLEAN-004-reruns/CLEAN-006-f7ca27f/`（A）与 `…-b/`（B）均位于冻结资产目录之外、逐轮一子目录、互不覆盖 ✅；
- `docs/evidence/CLEAN-004/README.md` 新增块**明确**「本目录 `report.json` 仍是 R2 权威记录运行（`head=21b100ce…`、`tally 49/42/4/3`）**未被替换**」+「后续复跑归档到 `docs/evidence/CLEAN-004-reruns/<task>-<head 短 sha>/`」+「冻结面三脚本只运行不修改（sha256 锚值见 §3）」✅ **逐条落实**；
- **冻结资产三脚本零改动（独立复算哈希）**：`probe-clean-004.mjs = de2de511e89a…5b65` ✅、`falsifiability-check.mjs = 5afb8663e6a9…159a` ✅、`gen-defects-evidence.mjs = 782560e34972…da23` ✅（与 README §3 锚值逐字一致）；`git diff --stat f7ca27f HEAD -- docs/evidence/CLEAN-004/` 仅 `DEFECTS.md` / `README.md` 两个 md 变更 ✅；
- **错标（F-05）**：两份 README 的 `| 本文件 sha256 |` 行给出的是 **report.json** 的摘要与字节数（A：`5dc9d438…` / 97362 B；B：`83b04594…` / 97372 B），而 README 自身哈希为 `e8c8035c…`(3299 B) / `08a7e945…`(3244 B) ⇒ 字段名与值不符（外部审阅者按名核对会误判「README 被改动」）。

### A-5 F6 归因订正（三份文档）

**结论：归因订正**不越界、独立取证成立**；仅 `sessionVisible` 引文不完整（F-09，P3）。**

- **独立核验三重取证**：
  1. 探针侧：`probe-clean-004.mjs:345-346,356` 用 `button[class*="sessionRow"]`（`:1749,1757` 同款）✅ 与订正记述逐字一致；
  2. 宿主侧：`@deepseek-ai/dsh-client-ui-workspace/lib/client.js` 中 `sessionRow` 类名的**唯一** JS 使用点 = `:968 className: clsx(Rows_module_css_default.sessionRow, …)`，其元素为 **`div` + `role:"treeitem"`**（`:966-969`）；类名映射 `:596 "sessionRow": "YDXeBa_sessionRow"`（哈希化 CSS-module）⇒ `button[class*=…]` **恒不命中** ✅ **归因成立**；
  3. `sessionVisible`：宿主 `:338-340` = `session.origin !== "subagent" && !archived.has(session.id) && (!session.blank || session.id === current)` ✅ 存在，但订正文本只引了 `!blank || id === current` 一支（遗漏 subagent/archived 两个合取项）⇒ **F-09（P3）**（不影响结论，影响「如何正确构造」的指引完整性）；
- **界定「本 run 的 C3b/C9/C10/C11 读插件卡面 `.nv-*`，与选择器无关」**：独立实读冻结探针——`C3b-binding-convergence`（`:1122-1124`）判定输入 = 插件镜像/卡片收敛采样；`C9/C10/C11`（`:1253-1279`）读插件分栏几何与 `dsh.novel.split.v1` 存档；`B21a/B22` 读插件 `.nv-cfound .nv-srow`（`:1686-1726`）⇒ 订正的界定**成立**（宿主会话行读数只影响 `B5`/`D6` 的 N-A 归因）✅；
- **只订正不动冻结探针**：与「记录运行 = 终版」不变量相容，且 `B5`/`D6` 仍为如实 N-A ✅。

---

## 2. B 段逐项核验（任务清单 6~9）

### B-6 F1 实现正确性（核心）

**结论：读取面无 tearing 语义回归、无每渲染新建对象**（①③④成立、②部分成立）；但 ⑤「不稳定风险」判定为**有缺口**：`subscribeForCurrent` 丢弃 React 回调、且注释所述「重订阅」机制不存在（F-04，P2）+ smoke 看护判别力不足（F-03，P2）。**

| 分项 | 独立核验 | 判定 |
|---|---|---|
| ① `getSnapshotForRender` 是否返回快照本体 | `lib/client.js:1486-1488`：`resolveStore()` → `st.getSnapshot()`（宿主快照本体）或工厂级单例 `ABSENT_SNAP` ⇒ **不新建对象** ✅。旁证：宿主自身用法同构（`dsh-client-ui-commands/lib/client.js:937` = `react.useSyncExternalStore((fn) => pop.state.subscribe(fn), () => pop.state.getSnapshot())`，**实读存在**）⇒ 宿主 `createSnapshotStore().getSnapshot()` 为稳定引用 | ✅ 成立 |
| ② `subscribeForCurrent` 工厂作用域创建一次 + 返回退订 | `:1493-1501` 在 `makeSessionsHookReactive` 作用域创建 ✅；返回 `st.subscribe(...)` 的返回函数（类型不符回退 `noop`）✅ | **部分成立**：引用恒定 ✅ 且退订函数 ✅，但**内部另订阅 `noop`、丢弃 React 传入的回调** ⇒ React 的 `handleStoreChange` **永不被调用**；且因 `subscribe` 引用恒定，React `updateSyncExternalStore` 的 effect deps 不变 ⇒ **服务切换后不会重订阅**（注释 `:1489-1492` 与 CHANGELOG:55 所述「换 store 由 resync() 驱动的重渲染再次订阅完成」**与 React 语义不符**）⇒ **F-04（P2）** |
| ③ `ABSENT_SNAP` 单例用途 | `:1451-1452` 工厂级单例，服务缺席时返回同一引用 ⇒ 满足「快照引用稳定」要求；absent→present 时引用变化 ⇒ 提交后检查会触发一次重渲染（正向收益）✅ | ✅ 正当 |
| ④ selector 仍留读取侧 | `selectNow(selector)` 未动（`:1464-1469`、调用点 `:1541`）⇒ BUG-009 的「渲染期实时求值」语义保持 ✅ | ✅ 一致 |
| ⑤ 是否新引入双渲染/重渲染风暴 | 独立推演 React 语义 + 读 harness：**渲染期只读快照**、`getSnapshot` 引用稳定 ⇒ 不触发「持续变化」路径；重渲染仍由既有 `setTick` 扳机驱动（每次 store 通知 1 次，非双通道叠加：usesync 通道为 noop）⇒ **未新引入重渲染风暴**；`ABSENT_SNAP` 单例避免缺席态无限重渲染 ✅ | ✅ 结论成立；**但**判据面（§B-3 的 F-03）**无法观测该风险**：`rendersBounded` 仅在渲染循环**终止后**才可求值 ⇒ 真出现无限重渲染时表现为**挂死**而非红灯；`snapshotIdentityStable` 校验的是 mock store 自身；`subsAfterMount` 计算了却**未断言**；断言②③ 的观测实际由既有 resync 通道满足（F1 通道即使完全失效也仍绿） |

### B-7 BUG-005 五契约保持（MUST 独立复核）

**结论：五契约逐条保持 ✅；「派生值不变也强制重渲染」的说法与代码事实一致 ✅ 且未语义漂移 ✅。**

| 契约 | 独立核验（代码 + smoke 断言） | 判定 |
|---|---|---|
| ① 函数引用恒定 | `useSessionsSel` 由工厂返回、`apply` 单点创建；`refresh` 挂同一函数对象；smoke `test/smoke.mjs` BUG-005 组「缺席→后到全程同一 hook 实例」断言在册且绿 ✅ | 保持 |
| ② holder 惰性解析 | `resolveStore()` 每次 `ctx.get('sessions')` 实读（`client.js:1454-1461`）——**F1 未改动该函数** ✅ | 保持 |
| ③ 服务增减重订阅 | 既有 effect `resync()`：`st !== curStore` ⇒ `detach()` + 新订阅（`:1520-1531`），`refresh()` 遍历 `mounted`（`:1544-1546`）——**F1 未改动该路径** ⇒ 契约由**原通道**承担 ✅（与 F-04 相关：F1 通道**不**承担该契约，故注释关于该通道的表述需订正，但契约本身未破） | 保持 |
| ④ 派生值不变也强制重渲染 | 真读代码：`bump = () => setTick(n => n + 1)`（`:1513`）**每次通知都 +1**，且 `resync()` 尾部**无条件** `bump()`（`:1530`）⇒ 值与引用皆不变时仍推进渲染 ✅；`usesync` 在**无**（已核不可达的）通知路径下不参与该契约，故 `setTick` 保留是**必要**的 ✅（自述"usesync 自带同值 bail-out，单靠它无法表达非 React 面 launcher.sessions 变化"与代码事实**一致**） | 保持，**无语义漂移** |
| ⑤ 卸载退订 | effect cleanup：`disposed=true` + `mounted.delete` + `detach()`（`:1534-1538`）；F1 通道的 cleanup = 挂载期订阅的退订函数 ⇒ 卸载调用同一函数（`:1518` 同族）✅；smoke 断言「卸载清理：解除订阅」在册且绿 ✅ | 保持 |
| **BUG-009 收敛语义** | 冻结探针 A/B 两段复跑 **`C3b-binding-convergence` / `C9-width-memory` / `C10-flip-side` / `C11-flip-back` 全部 PASS**（独立读两份 `report.json` 的 `assertions[]` 逐条确认，非采信自述）✅；UX-012 全量探针 27 条 / FAIL 0（自报，本报告未复跑全量——见 §13 限制） | 保持 |

### B-8 契约分段重基（独立重算）

**结论：4 个插入点与总 Δ 成立；11 处 client.js 引用全部内容等价（覆盖无遗漏）；但 1.6/1.9 两个**非 client.js** 引用被误重基 ⇒ F-01（P0）。详见 §4.2。**

### B-9 门禁与冻结探针（复跑）

**结论：四道门禁复跑全绿 ✅；两份归档 `tally 49/47/0/2`、FAIL 0、零 PASS→FAIL、零新增 FAIL ✅；`headDirty=true` 的**同源主张经机制核验成立** ⇒ 可接受，但归档 README 的 `head` 值失实（F-02，P1）。**

| 项 | 自述 | 独立复跑/复算 | 判定 |
|---|---|---|---|
| `node test/smoke.mjs` | 301 passed / 0 failed | **301 passed / 0 failed**（exit 0），末条 `COMPAT-014 A-F9 README smoke 断言计数同步：声明 301 ≡ 实测 301` 绿 ✅ | 一致 |
| `node test/validate-preset.mjs` | PASSED（schema-face: PASS，skills 29/29） | **PRESET VALIDATION PASSED（schema-face: PASS）** ✅ | 一致 |
| `node --check` | 23 文件 / 0 失败 | **checked 23 files, failed 0** ✅ | 一致 |
| `--falsifiability` | PASS（predicate 12 / red 29 + ok 12 + 台账新机检） | **exit 0**；`FALSIFIABILITY PASS：red=29 ok=12`；`CLASSIFICATION-LEDGER PASS … 桶和 28 ≡ 库存 28 ≡ 声明 28；id 未归桶 0 / 桶内未知 id 0 / 闸门归属合法 true / 源控制 32 行 45802774…`；注入 8/8 ✅ | 一致 |
| 冻结探针 A 段报告 | `headDirty=false`、49/47/0/2 | 报告 `head=f7ca27f…`、`headDirty=false`、`tally {total:49,pass:47,fail:0,na:2}`、`realEnvVerdict.ok=true`、`cleanup.rootRemoved=true`、N-A = `B5-found-sessions-area`/`D6-session-switch-close` ✅ | 一致 |
| 冻结探针 B 段报告 | `headDirty=true`（已应用未提交） | 报告 **`head=6f65bbe9…`（A 段 commit）**、`headDirty=true`、同 tally ✅；**A 报告 vs B 报告逐条断言零差异**（`id:status` 全同） | **判定见下** |
| 与仓内基线 `docs/evidence/CLEAN-004/report.json`（`head=21b100ce`、49/42/4/3）差异 | 5 条全改善 | 独立对比：**恰好 5 条**（`C3b`/`C9`/`C10`/`D2-esc-bind-yield` FAIL→PASS、`C11` N-A→PASS）；**零 PASS→FAIL、零新增 FAIL** ✅ | 一致 |

**`headDirty=true` 可接受性裁定（独立推导，非采信自述）**：

1. `headDirty` 由**冻结探针自身**机算，且**限定范围**：`probe-clean-004.mjs:645-646` = `git status --porcelain -- lib/client.js lib/index.js` 非空 ⇒ 脏面**只可能**是这两个文件；`head=6f65bbe`（A 段）⇒ 脏文件必为 `lib/client.js`（`lib/index.js` 自 `e9d0760` 起未改，且 B 段 commit 未含它）；
2. 探针**加载被测代码的路径**已核：`:199 link(REPO_ROOT, join(nm,'dsh-novel-writing'))` + `:39 CLIENT_SRC = <repo>/lib/client.js` ⇒ 隔离实例加载的是**工作树**的 client.js ⇒ 该 run 确以「A commit + 未提交 F1」为被测面；
3. **时间夹逼**：B 报告窗口 `04:37:12Z → 04:38:15Z`，B commit 时间 `04:38:56Z`（本地 12:38:56）⇒ 报告落盘距 commit 仅 **41 s**，不存在实质性改动窗口；
4. 旁证：CHANGELOG（B 段条目 `:60`）亦将冻结探针 run 记为 `head=6f65bbe`、`headDirty=true`。
⇒ **`headDirty=true` 本身可接受**（同源主张可核，"与 B 段提交的代码面同源"成立），**无需为此强制第 3 次复跑**；但归档 README 的 `head` 值写错（**F-02，P1**），且报告未留代码面内容摘要（建议后续归档加 `lib/client.js` sha256 锚，作为可选增强）。

---

## 3. 独立复核专章

### 3.1 LEDGER_CHECK（N-1/N-5 台账机检独立复核）

**方法**：自写脚本（`%TEMP%\clean006-verify-r1\verify.py`，**不 import 探针模块**）读 `scripts/probe-nv-ux012.mjs` 原文，按台账声明的判据重算。

```
marker line (1-based)      : 381          （@ledger-source-control 所在行）
directive line count       : 32           （标记行之后含自指锚的源码行）
directive sha256 (join \n) : 45802774295bb0f62bea3697ce87ff3a6601f899080676992ef98ca338443272
declaredSha256             : 45802774295bb0f62bea3697ce87ff3a6601f899080676992ef98ca338443272   MATCH=True
unique assert ids          : 28           ≡ declaredTotal 28
A(/*@assert*/ 出现总数      : 33 = 32 接线处 + 1 处注释内证（非逃逸）
非 A 形态 assertion 调用    : 0            ；动态 id：0
bucket counts              : drive 20 / dom-read 2 / structural 1 / verify 3 / isolation 2（和 28）
excludedFromNa             : A7b-focus-wrap / A1b-input-autofocus / A6-focus-restore / A2b-modal-semantics-full
excluded buckets           : ['bucket-drive' ×4]     闸门 N-A 归属合法
```

**自选注入反例复做（3 条，独立构造而非读其脚本）**：把自指针改文案/改桶、把某 id 改名、把接线处增删，分别逐条推演 `assertionLedgerReport()` 的判据取值——分别命中 `hashMismatch` + `bucketSumMismatch`、`unassigned` + `unknownInBucket`、`siteCountMismatch` + `hashMismatch` ⇒ **确认该机检具判别力**（与探针自证的 8/8 一致，但由本审查独立构造）。

**结论：台账机检**成立**（单点事实源正确、源控制锚可复现、注入式可失败性成立）；残余 3 项口径精度问题见 F-07（P3）。**

### 3.2 CONTRACT_SEGMENTED_REBASE_CHECK（契约分段重基独立重算）

**① 4 个插入点的存在性与 Δ 分配（`difflib.SequenceMatcher(old, new, autojunk=False)`，`git show 535d798^:lib/client.js` vs `git show 535d798:lib/client.js`）**

```
old 5233 行 → new 5268 行（Δ +35）
non-equal opcodes = 4（恰 1 replace + 3 insert）
  1. replace  old[L100] → new[L100]       react 解构追加 useSyncExternalStore（Δ0）
  2. insert   before old L1451  (+2)      new L1451-L1452 = ABSENT_SNAP + 注释
  3. insert   before old L1467  (+32)     new L1469-L1500 = getSnapshotForRender/subscribeForCurrent/注释
  4. insert   before old L1506  (+1)      new L1540 = useSyncExternalStore(...) 调用点
真值 Δ 分段（old 坐标）：≤L1450 Δ0 ｜ L1451-1466 Δ+2 ｜ L1467-1505 Δ+34 ｜ ≥L1506 Δ+35
```

| 自述 | 实测 | 判定 |
|---|---|---|
| 「L100 替换，Δ0」 | ✅ | 一致 |
| 「L1451 前 +2」 | ✅（old 坐标） | 一致 |
| 「L1470 前 +32」 | **实测插入块 = new L1469-L1500**（old 坐标 = `old L1467` 前）；「L1470 前」在新/旧坐标都不精确 | 表述偏差（P3，见 F-06） |
| 「L1540 前 +1」 | ✅ 若按**新文件坐标**（插入行本身 = new L1540）；旧坐标为 `old L1506` 前 | **坐标基准未标注**（P3，见 F-06） |
| 「累积 Δ 分段 ≤L100 0 / ≤L1450 +2 / ≤L1466 +34 / ≤L1505 +35」 | **边界值 100/1450/1466/1505 与实测一致**，但字面读「≤L1450 ⇒ +2」不成立（≤L1450 实为 Δ0；+2 始于 L1451）——即「Δ 值」与「上界」**错位一位** | 表述偏差（P3，见 F-06） |
| 总 Δ `+35` ≡ 文件行数差 | ✅ 5233→5268 | 一致 |

**② 覆盖率：10 项 / 11 处（有无遗漏）**

- 独立遍历契约**全部**含 `lib/client.js` 的 items（15 项：2.1~2.13、3.1~3.8），对每个 `line` 数值：**未变更者**逐一验证其处于 Δ0 区（14 项全部落在 ≤L1450 ⇒ 合法不变）；**已变更者**逐一验证 `old[L] + Δ(L) == new[L']` 且**端点行内容逐字节相同**（9 处逐点核过：`2.11`、`2.12`、`2.13`、`3.4`（L925 不变 + L4746/L4889）、`3.6`（L1164-1188 不变 + L3886）、`3.8`）✅。
- **范围整体等价（插入行剔除后逐行比对）**：`2.10`(65 行) / `2.11`(28) / `2.3`(3) / `2.12`(8) / `2.13`(33) / `3.4a`(14) / `3.4b`(1) / `3.4c`(1) / `3.6a`(25) / `3.6b`(1) / `3.8`(11) = **11/11 EQUAL，合计 190 行 0 处不等价**（自述「32/32 等价」为按端点计的更细口径，方向与结论一致）。
- **遗漏项判定：client.js 面零遗漏** ✅；**但 `items[]` 中 2 处非 client.js 引用被误改**（1.6 / 1.9 指向 `lib/index.js`）⇒ **F-01（P0）**——这正是「Δ 分段交界处的 item」以外的**跨文件 Δ 误用**形态。

**③ `old[L−Δ(L)] ≡ new[L]` 逐行等价**：见上（190 行范围级 + 9 处端点级全部等价）。

**④ 不变量（零扩展）**

| 项 | 实测 | 判定 |
|---|---|---|
| `items[]` 计数 | 49 → 49 ✅ | 一致 |
| item id 序列 | 逐项相同 ✅ | 一致 |
| 非 `line` 字段 | 49/49 项**逐项相同**（`kind/necessity/symbol/golden/face/file/note` 无变更）✅ | 一致 |
| `regionLiterals` / `presetRowConfig` / `kindEnum` / `faces` | 块级**逐字节相同**（sha 前缀 `5b7307f6…` / `8b56c61f…` / `0a5a146f…` / `e27dd70c…`）✅；另 `ctxGetSemantics` / `hostSurface` 亦逐字节相同 ✅ | 一致 |
| item 5.3 / 5.4 / 5.6 `line` | `L52 / L56 / L81`、`L77-81`、`L16` **均未变** ✅ | 一致 |
| `revisions[]` | 8 → 9 条，末条 = `CLEAN-006` ✅ | 一致 |
| `items[]` 字节数 | 7743 → 7742（−1 B，来自 2.3 行号串 `L5095-L5097`→`L5130-5132` 去掉第二个 `L`） | 非功能差异，见 F-11（P3） |

---

## 4. 过程事件复核（真实环境）

**事件（Developer 上报）**：`node -e "import('./scripts/probe-nv-ux012.mjs')"` **误触发探针自举路径**（模块顶层副作用）⇒ 产生自建孤立实例进程 + 隔离临时目录；随后 `Stop-Process` 回收**自建** boot 子进程 + 清理临时目录；声称用户 DSH 实例（PID 18660 / 24896）与浏览器全程未被触碰。

**独立核验**：

| 问题 | 结论 | 依据 |
|---|---|---|
| ① 是否影响本轮证据有效性 | **不影响**（隔离口令、`realEnvVerdict`、探针读数仍可信） | (a) 事故发生在**独立的临时进程**，与两份归档 run 的时间窗口（`04:24:31-04:25:34Z` / `04:37:12-04:38:15Z`）不同，归档报告由各自 run 落盘；(b) 两份报告 `realEnvVerdict.ok=true` + `strictDeltas={}`（真实 `$DSH_HOME` 零写入）✅、`containment` 7 项全真 ✅、`cleanup.rootRemoved=true` ✅；(c) 探针的隔离是**构造性**的（`DSH_HOME` 必须位于隔离根内，否则 `exit 2`，`probe-nv-ux012.mjs:384`）⇒ 误触发路径同样受同一隔离约束 |
| ② 是否违反「禁止终止任何进程」红线 | **不构成对**用户**进程的侵害，但 MUST 登记为过程事件；仅收自建进程**可豁免**、**不得**作为先例 | (a) 独立核：用户 DSH 实例 **PID 18660（启动 2026-09-13 15:42:53）/ 24896（16:07:37）仍在运行且启动时间未变**；浏览器进程（msedge）最早启动于 2026-09-11，均未被重启/终结 ⇒ 「未触碰」主张与观测一致；(b) 被回收的是**本事故自建的 boot 子进程**，留在场上会持续占用隔离目录与端口；(c) 但红线语义是「发现孤立进程只上报不处置」⇒ 该动作 MUST 在治理面（evidence-log / 事故记录）**显式登记**，并注明「仅限自建、仅限收尾、不得推广」 |
| ③ 是否应加装结构性防护 | **MUST 加装（F-12，P2）** | 代码面证实根因：`scripts/probe-nv-ux012.mjs:1497-1498` 为**无条件顶层** `const code = await main(); process.exit(code)`，全文件**无入口守卫**（`import.meta.main` / `process.argv[1]` 比对均不存在）⇒ 任何 `import()` 都会执行完整探针（含 `bootChild` 子进程 + 无头浏览器）。**同族同缺陷另有 2 个脚本**：`scripts/probe-nv-bar-geometry.mjs:620`、`scripts/isolated-preset-mount.mjs:282`（均顶层 `await main()`）⇒ 按 P-05「落正确抽象层、同类问题全局排查」MUST **三处一并**加守卫（例：`const isEntry = (() => { try { return process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url) } catch { return false } })(); const code = isEntry ? await main() : 0; if (isEntry) process.exit(code)`）；**归口建议**：并入本轮 A 段返工（该文件已被本批重写），否则须另立任务 + 记 RISK |
| ④ 现场是否有遗留 | **未见遗留**（读-only 观察） | `%TEMP%` 下与本任务相关的仅 `clean006-ux012`/`-b`（探针 `--out` 目录）与 `clean006-verify`/`-b`（冻结探针 `--out`，报告 `cleanup.keptEvidence` 明示）；**无** `clean004-probe-*` 隔离根残留（两份报告 `rootRemoved=true`）；无 12:51 之前的孤儿 node/msedge 进程（除既有用户实例）。注：本审查**未处置**任何进程（遵守只上报不处置） |

---

## 5. 遗留裁定（供 Coordinator 参考）

| # | 事项 | 裁定 |
|---|---|---|
| ① | **RISK-008 关闭判定** | **建议：关闭 RISK-008（原风险面 = 「渲染期读外部可变 store 未走 `useSyncExternalStore`」——本段已确以该 API 读取，且 A/B 两段冻结探针 `C3b/C9/C10/C11` PASS），另立**更窄的新风险**：「服务切换瞬间的订阅真空（`refresh()` 到下一次渲染之间）+ F1 通道订阅恒定不随服务切换重订阅」（见 F-04）」。**依据**：BUG-009-R1 F1 的验收条件 = 「宿主内并发场景无撕裂 **+ smoke 有对应判据（或明确接受风险并留决策记录）」；本条**部分**满足（读面接线 + 实参恒定有判据），**未**满足「订阅/通知面有判据」⇒ 关闭时应如实登记该残余并以决策记录背书 |
| ② | **UX-060 R1 备注项归口** | 属**另一探针资产** `scripts/probe-nv-bar-geometry.mjs`（UX-060 R1 F-2 P2 / F-3 P2 / F-5 P3 / F-6 P3），本批两段**零改动**该文件（已核 commit 路径列表）⇒ 与 CLEAN-006 无交集，**不得**计入本批闭环；建议**另立任务**并在 plan-tracker 显式登记（可复用本批的 `ASSERTION_LEDGER` 机检范式作为其收口手段） |
| ③ | **契约 item 3.7 陈旧锚点** | **确认陈旧**：`lib/host-contract.mjs:149` 的 `line:'L884-886 等'` 实读为 `shouldCloseOnCurrentChange` 的 JSDoc，而三键字面量在 `lib/client.js:975 / 977 / 1042`。**归属**：该锚点位于 Δ0 区、**本批两段均未改动**（非重基引入）⇒ 按契约既有的承接注记归口 **CLEAN-005 全量复核**；本报告记为 F-13（P3，非本批 blocking） |
| ④ | **`test/smoke.mjs` 新增 `dispose()`（测试面 API）** | **无需单独看护**：仅一处消费（`test/smoke.mjs:2066`，用于「卸载后订阅归零」观测），语义已在声明处注释（「只跑 effect 清理、不置 `inst=null`」）；它不进产品面、不影响 smoke 计数（301 已对账）。唯一提示：其与 `unmount()` 语义不同（保留 `inst`）⇒ 后续新测试若误用可能读到陈旧 hook（P3 级提示，不必立任务） |

---

## 6. 发现列表（P0 → P3，逐条含位置 / 依据 / 影响 / 建议）

### F-01 [P0] 契约 1.6 / 1.9 的调用点行号被按 `lib/client.js` 的 Δ 误重基（跨文件 Δ 误用）

- **位置**：`lib/host-contract.mjs:107`（item 1.6：`line: 'L55（调用点 L1459、L95）'`）、`lib/host-contract.mjs:110`（item 1.9：`line: 'L76 / L1465'`）
- **依据（独立实读）**：
  - 两项的调用点指向 **`lib/index.js`**（1.6 的 `note` 自述「apply 期 `registerSettings` / cfg 内 `readSettings`」；`L95` = `index.js:95 const c = readSettings(ctx, NS)` ✅ 佐证）；
  - **B 段 commit 未改 `lib/index.js`**（`git show --stat 535d798` = 7 路径，无 index.js；`lib/index.js` 最后一次变更为 `e9d0760`）；
  - `index.js:1457 = registerSettings(ctx, NS, Config)`、`index.js:1463 = onLifecycle(ctx, …)` —— **真值未变**；新写入的 `L1459 = service.ensurePreset()`、`L1465 = logWarn(ctx, …)` **与语义无关**；
  - 原值 `L1457 / L1463` 由 `e9d0760`（与 index.js 同批）写入 ⇒ 旧值正确、本次改动**新引入**失实；
  - 该项被计入「**重基 10 项**」并声称 `old[L−Δ(L)] ≡ new[L]` 「32/32 等价」——**该取证未覆盖这两项**（它们不在 client.js 面），即证据口径与结论不相称。
- **影响**：契约 `line` 字段在本项目被明文声明为「行号唯一事实源」（1.6/1.9 的 note 亦如此写），写入失实 ⇒ ①契约作为 P-10 治理事实源失真；②`COMPAT-015 F3` 只校验各面注释副本**是否落在契约界内**，**不校验契约值本身真伪** ⇒ 三面（CI/smoke/诊断）**零信号**；③后续每次重基都在错误基线上继续累积。
- **建议**：回滚两项为 `L55（调用点 L1457、L95）` / `L76 / L1463`；并把「`line` 字段按 `file` 分组计算 Δ、跨文件引用不得套用本文件 Δ」写入重基取证口径 + 增加一条「非本文件引用的目标行内容抽查」（本轮即可补，成本 ≈ 2 行脚本）。
- **与自述一致性**：**不一致**（自述「重基 10 项 / 双取证 32/32 等价、0 处不等价」对本项不成立）。

### F-02 [P1] B 段复跑归档 README 的 `head` 值与其自身 `report.json` 矛盾

- **位置**：`docs/evidence/CLEAN-004-reruns/CLEAN-006-f7ca27f-b/README.md:3,9`（写 `head=f7ca27f026ab2cf5ba58fc6a2e6a5a088153a65e`、并注「A 段提交后基点」）；同目录 `report.json` 的 `head = 6f65bbe9cbb1a00b944ad98453456d9d669912cd`
- **依据**：独立读 `report.json` 顶层 `head` 字段比对；CHANGELOG（B 段条目 `:60`）亦记为 `head=6f65bbe` ⇒ README 为**唯一异值**
- **影响**：N-4 的目标是「使外部审阅者可按**仓内路径**复核」；README 的 head 失实会把复核者指向**错误的代码面**（`f7ca27f` = A 段基点）并与同目录证据自相矛盾 ⇒ 证据自洽性破坏（本轮唯一实际成立的 provenance 缺陷）
- **建议**：改为 `head=6f65bbe9cbb1a00b944ad98453456d9d669912cd`、说明「A 段提交后基点 + 已应用 B 段 F1 修复（未提交）」；可选增强：归档时同时落 `lib/client.js` 内容 sha256（消除「同源」对自述的依赖）

### F-03 [P2] smoke F1 四条看护断言的判别力缺口（含「核心风险」不可观测）

- **位置**：`test/smoke.mjs:2030-2078`（尤其 `:2039`、`:2044-2055`、`:2056-2064`）
- **依据（逐条实读）**：
  1. `subsAfterMount`（`:2039`）与 `sB.subscriberCount()`**仅在 `NV_SMOKE_F1_DEBUG=1` 时打印**，**未被任何断言消费** ⇒ 「F1 通道确实建立订阅」无机检（若 `subscribeForCurrent` 永远返回 noop，四条断言仍全绿——除源码字符串断言①）；
  2. `snapshotIdentityStable`（`:2052-2054`）校验的是 **mock store** `sA.svc.list.getSnapshot()` 两次取值同一，与产品 `getSnapshotForRender` 无关 ⇒ 对「产品每渲染新建对象」这一风险**无观测**（产品侧该风险在 harness 中表现为 `prev.snap !== snap ⇒ dirty=true` 的**渲染循环**，而 `drain()` 的 `while (dirty)` 无上限 ⇒ **挂死**）；
  3. `rendersBounded`（`:2045`）**只在渲染循环正常终止后**才被求值 ⇒ 对「无限重渲染」这一被点名保护的风险**不可达**（故障形态是挂死而非红灯）；
  4. 断言②③（`:2064` `swapOk`、`:2067` `cleanupOk`）：`hook3.refresh()` + `sB.push()` 走的是**既有 `resync()`/`setTick` 通道**（`bump → setTick → dirty → drain`），F1 通道（noop）**不参与** ⇒ 断言实际验证的是「BUG-005 既有通道仍工作」，**无法区分** F1 通道在位与完全失效。
- **影响**：P-04 的看护网对 F1 的**行为面**保护薄：F1 通道的建立/通知/换 store 三项均无有效判据（只有源码字符串在位断言 + 实参身份恒定断言）；BUG-009-R1 F1 验收条件中的「smoke 有对应判据」只部分满足
- **建议**：(a) 断言 `subsAfterMount === 2`（或至少 `≥1` 且与 `resync` 通道区分：`sA.subs.length` 在 F1 前 = 1/F1 后 = 2）——**注**：以现实现（noop 订阅）确实会 +1，故该断言可落地；(b) 加渲染次数上限（如 `if (renders > 50) throw`）把「无限重渲染」转为红灯而非挂死；(c) 让 `snapshotIdentityStable` 走产品的 `getSnapshotForRender`（例如通过录制 harness 收到的 `getSnapshot` 实参并对其两次求值比较）；(d) 若要真正覆盖「通知驱动」，MUST 先修 F-04（转发 React 回调），否则无可观测面

### F-04 [P2] `subscribeForCurrent` 丢弃 React 通知回调、注释/CHANGELOG 所述「重订阅」机制不存在

- **位置**：`lib/client.js:1489-1501`（实现）、`:1483-1484`（注释断言「store 通知后亦会比对快照引用并重渲染」）、`:1479-1480`（注释断言「服务切换后由 resync() 触发的重渲染再次订阅 ⇒ 换到新 store」）；`CHANGELOG.md:55`（同款陈述）
- **依据**：`subscribeForCurrent = () => { const noop = () => {}; … st.subscribe(noop) … }` —— **忽略 React 传入的 `handleStoreChange`** 并另订阅 noop ⇒ React 的变更通知链**永不触发**；又因 `subscribe` 引用恒定，`updateSyncExternalStore` 的 `useEffect(subscribeToStore, [subscribe])` deps 不变 ⇒ **服务切换后不会重订阅**（挂载期 store 的退订函数一直持有到卸载）
- **影响**：**无功能性回归**（重渲染仍由既有 `resync()`/`setTick` 承担；React 提交后快照比对仍提供 tearing 防护；卸载退订仍生效、无悬挂订阅）；但 ①注释/CHANGELOG 陈述与 React 语义不符（P-01 事实性）；②形成**潜伏陷阱**：若未来移除/削弱 `resync` 通道，F1 通道既不会收到通知也不会换 store
- **建议（二选一，均低风险）**：(a) 转发回调 —— `const subscribeForCurrent = (onStoreChange) => { const st = resolveStore(); if (st === null) return () => {} ; const off = st.subscribe(onStoreChange); return typeof off === 'function' ? off : () => {} }`（引用仍恒定；换 store 仍由 resync 通道承担，但通知面恢复真实），并把断言同步升级（配合 F-03）；(b) 若刻意保留 noop 通道，MUST 把注释/CHANGELOG 改写为「本通道仅作订阅在位与提交后快照比对；**不**驱动重渲染、**不**随服务切换重订阅」，并说明由 `resync()` 承担全部通知/换 store 语义

### F-05 [P2] N-2 不可达性取证为单点采样，未支撑「入口不可达」的完整结论

- **位置**：`scripts/probe-nv-ux012.mjs:1276-1291`（`wsDialogReachability` 构造）与断言 `UX012-D1-workspace-dialog-esc` 的标签段
- **依据**：取证仅取**侧栏抽屉锚点单点**的 `elementsFromPoint()[0]` 类名；未核遮罩几何（`getBoundingClientRect` ≡ viewport）、未核 `pointer-events`、未机检入口唯一性（本轮由**本审查**以只读 grep 核出：`entryOpen: true` 恰 1 处 = `lib/client.js:3625`）
- **影响**：该结论是「不新增该场景行为断言」的**唯一依据**（选项 b 的 load-bearing 论证）⇒ 论证强度与代价不匹配；若遮罩在某布局态未覆盖抽屉（例如 z-index/层叠上下文变化），结论会静默失效而探针仍绿
- **建议**：把廉价且确定性更强的**源码面机检**补上——①`entryOpen: true` 调用点恰 1 处且位于控制台容器内；②`openConsole()` 必先 `closeWorkbench()`（互斥不变式）；两条均易构造注入式反例（改一处即红）。行为面若保留，扩为多点采样 + 遮罩 boundingRect/pointerEvents 取证

### F-12 [P2] 探针缺入口守卫（import 即执行副作用），且为 3 脚本同族缺陷

- **位置**：`scripts/probe-nv-ux012.mjs:1497-1498`（顶层 `await main()` + `process.exit`）、`scripts/probe-nv-bar-geometry.mjs:620`、`scripts/isolated-preset-mount.mjs:282`（同形态）
- **依据**：三处均无 `import.meta.main` / `process.argv[1]` 入口判定（独立 grep：全仓零命中）；`probe-nv-ux012.mjs` 的 `--boot` 子进程创建位于 `main()` 内（`:384 bootChild` / `main` 流程）⇒ 任何 `import()` 都会自举隔离实例 + 无头浏览器（本批已实际发生一次过程事件，见 §4）
- **影响**：误 import 即产生**真实副作用**（子进程、临时目录、浏览器）；虽受隔离约束（不写真实 `$DSH_HOME`），但需人工回收进程/目录 ⇒ 违反「只上报不处置」纪律的风险面
- **建议**：三脚本一律加入口守卫（见 §4③ 示例代码）；并把「探针仅在被直接执行时自举」写入探针工程规范（P-05 全局排查的落点）

### F-06 [P3] 契约 `revisions[]` 注记与 CHANGELOG 的重基记述偏差

- **位置**：`lib/host-contract.mjs:81`（CLEAN-006 revision 条目）、`CHANGELOG.md:59`
- **依据**：①「重基 **10 项**」后列举 **11 个名目**（含 `2.2.2`、`2.2.10`）；其中 **`2.2.2` 不是契约条目**（items[] 无此项；`2.2.10` 实为 `items[].item === '2.10'`；`L100` 替换属 item 2.2 的**同一行号位替换**，其 `line` 值 `L97` 未变）——实测**变更条目恰 10 项 / 11 处**（`1.6`、`1.9`、`2.10`、`2.11`、`2.12`、`2.13`、`2.3`、`3.4`×2、`3.6`、`3.8`）；②插入点坐标基准混用（③「L1470 前」实测为新文件 `L1469-L1500`；④「L1540 前」为新坐标「插入行自身」）；③「累积 Δ 分段」字面配对错位一位（实测 ≤L1450 = Δ0，+2 始于 L1451）
- **影响**：记录面精度（不影响运行时行为）；同一批已在 N-6/COMPAT 系列反复出现「项数/坐标/口径」类偏差，属复发形态
- **建议**：revision 与 CHANGELOG 的列举改为「**变更条目 10 项 / 受影响引用点 11 处**」并按 `file` 分组；插入点坐标标注基准（`old L<n> 前` / `new L<n>`）；Δ 分段按「区间 → Δ」格式（如 `L1-1450: 0 ｜ L1451-1466: +2 ｜ L1467-1505: +34 ｜ L1506-end: +35`）

### F-07 [P3] 台账口径的 4 处残面（self-test 基线恒真 / 注入⑥ 判据不同式 / 运行期 N-A 集未机检 / 27 vs 28 未说明）

- **位置**：`scripts/probe-nv-ux012.mjs:438-443`（`push('基线…', [], …)`）、`:441-443`（`siteCountMismatch` 用 `slots.length`）、`:1458`（机检断言不含 N-A 集比对）、文件头 `:130-131`
- **依据**：如 A-1 表⑤⑥⑦ 所述（逐条实读 + 运行读数 27/PASS 23/N-A 4）
- **影响**：均在「不影响结论方向」的范围内，但属本项目反复按 P2/P3 收口的口径类缺陷；其中「运行期 N-A 集 ⊄ `excludedFromNa`」缺机检最接近实质（未登记的 N-A 不会被拦）
- **建议**：①基线用例补 `got.issues === 0` 判据；②注入⑥ 与部署面判据对齐（`declaredSiteCount`）；③新增机检：`report.assertions.filter(status==='N-A').map(id)` ⊆ `excludedFromNa` 且计数相符；④文件头/`ASSERTION_DOC` 注明「声明 28 条 vs 健康运行 27 条（`UX012-CRASH` 仅异常路径记录）」

### F-08 [P3] F6 归因订正的记录面两点

- **位置**：`CHANGELOG.md:57`；`docs/evidence/CLEAN-004/README.md` §10-3 / `docs/evidence/CLEAN-004/DEFECTS.md` L226 区间 / `docs/verification/CLEAN-004-checklist.md` R-04
- **依据**：①CHANGELOG:57 称「**UX-012 全量探针**复跑 `C3b`/`C9`/`C10`/`C11`/`C2`/`C4`/`C1` 全部 PASS」——`C3b`/`C9`/`C10`/`C11` 是**冻结探针**（`probe-clean-004.mjs`）的 id，UX-012 探针的 28 个 id 中**无此四项**（其对应回归面为 `C2`/`C4`/`C1`/`A5`/`A11` 等）；B 段归档 README:20 的写法（只列 `C2`/`C4`/`C1`）才是正确归因；②`sessionVisible` 引文只含 `!blank || id === current`，宿主实读还含 `origin !== 'subagent'` 与 `!archived.has(session.id)`（`:338-340`）
- **影响**：记录面归因错位 + 构造指引不完整（未来按此修选择器仍可能 0 行）
- **建议**：CHANGELOG 改为「冻结探针 `C3b`/`C9`/`C10`/`C11` PASS（另段）；UX-012 全量探针 `C2`/`C4`/`C1` PASS」；`sessionVisible` 引文补全三项合取

### F-09 [P3] smoke F6 扩面注释的「TDZ 捕获」理由不确

- **位置**：`test/smoke.mjs:699-701`（新增注释）
- **依据**：`store` 为模块级、effect 回调在提交后执行 ⇒ 后移 effect 的实际故障形态是**条件调用/注册顺序翻转**（开关两态 hook 数不一致），而非 TDZ
- **影响**：仅注释；判据本身（`:726-742` 的文本顺序 + 正向对照）判别力**经独立核成立**
- **建议**：改写为「后移 ⇒ 早退路径不再注册该 effect ⇒ hook 数两态不一致（真实渲染即抛错）/ 文本顺序判据同时转红」

### F-10 [P1] `ASSERTION_DOC` 为死代码 ⇒ 「文件头口径由台账派生」的主张未实现

- **位置**：`scripts/probe-nv-ux012.mjs:350-358`（声明）、`:126-135`（文件头人工副本）、`:243-246`（声称派生的注释）
- **依据**：全文件 `ASSERTION_DOC` 出现次数 = **1**（仅声明行；`breakdown`/`naGated`/`nonNa`/`totalLine` 四个成员零消费、零输出、零报告字段）
- **影响**：A 段的核心叙事之一是「文件头口径改由台账派生（单一口径维护，不存在文档与实现两处维护的漂移面）」——该机制**不存在**：文件头仍是手工枚举文本，台账机检**不覆盖**其一致性 ⇒ N-1 原始病根（自由文本桶 + 零机检）的**同型残面**仍在（只是台账侧补齐了机检）
- **建议（任一，成本都很低）**：①删除文件头的桶枚举，改为「分类口径与桶分解见 `assertionLedger()`（机检：`UX012-CLASSIFICATION-LEDGER`）」并删除死代码；或 ②保留 `ASSERTION_DOC` 但在 `--falsifiability` 输出中**消费**它，并新增一条断言：文件头 `breakdown` 文本 ≡ `ASSERTION_DOC.breakdown`（双向机检，防漂移）

### F-11 [P3] 契约 2.3 行号串格式变更（非必需改动）

- **位置**：`lib/host-contract.mjs:127`（`L5095-L5097` → `L5130-5132`，第二端点去 `L` 前缀）
- **依据**：`items[]` 块字节数 7743 → 7742（−1 B），除行号数值外无字段变化；同批其他条目仍沿用 `Lnnn-Lnnn` 形态（如 2.12 的 `L5160-5167`）
- **影响**：无功能影响；仅形态不统一（下游按 `L(\d+)` 解析的范围仍可解析，但「单段范围」正则口径（`^L\d+-L?\d+$`）在两者间不同形 ⇒ 契约自查类断言需两种都容忍）
- **建议**：恢复 `L5130-L5132` 形态（P-05/C-04：不做与任务无关的格式改动）

### F-13 [P3] 契约 item 3.7 锚点陈旧（**非本轮引入**）

- **位置**：`lib/host-contract.mjs:149`（`line: 'L884-886 等'`）
- **依据**：`lib/client.js:884-886` 实读为 `shouldCloseOnCurrentChange` 的 JSDoc；三键字面量在 `:975`（`SPLIT_PERSIST_KEY`）、`:977`（`DEFAULTS_PERSIST_KEY`）、`:1042`（`ORDER_PERSIST_KEY`）。该锚点位于 Δ0 区、B 段未改动（`git show` 差异中 3.7 不在列）⇒ 陈旧状态**先于本批**存在
- **影响**：P-10 事实源局部失真；契约内已有承接注记（「留 CLEAN-005 承接全量复核」）⇒ 非本批 blocking，但 MUST 保持可见
- **建议**：归口 **CLEAN-005**（与契约既有承接注记一致）；本批两段不应为其背责，也**不应**在无 Δ 依据时顺手改值（本轮 F-01 的教训正在于此——改值必须附「目标行内容实读」证据）

---

## 7. 五维度逐项结论

| 维度 | 结论 | 依据（摘要） |
|---|---|---|
| **1 正确性** | **不通过（F-01 P0；F-02 P1）** | A 段「不改产品行为」成立（9 路径零 client.js/契约改动 ✅）；B 段 F1 读取语义正确（不新建对象、selector 留读取侧、无重渲染风暴 ✅）；但契约 `line` 真值被改错 2 处（F-01）；归档 provenance 与自身报告矛盾（F-02）。边界条件：`ABSENT_SNAP` 缺席→在位、`subscribe` 类型回退、`resolveStore` 形状校验均处理 ✅；并发面：useSyncExternalStore 提交后快照比对在位 ✅（订阅通知面为 noop，见 F-04） |
| **2 安全性** | **通过** | 无密钥/令牌硬编码（报告内 `instanceUrlRedacted` 脱敏、`postData` 脱敏）；无注入面变更（本批未改 I/O/路由/工具）；真实环境隔离核查通过（`realEnvVerdict.ok=true` + `strictDeltas={}` + `containment` 7 真 + 无真实 `$DSH_HOME` 写入）；过程事件为「自建进程回收」，已给登记要求（§4） |
| **3 可维护性** | **通过（含 2 条 P2 + 4 条 P3）** | 命名与既有同款式一致（`ABSENT_SNAP`/`getSnapshotForRender`/`subscribeForCurrent`）；新增函数 ≪ 50 行；注释密度高但 **F-04 存在陈述与语义不符**、**F-10 存在「派生」失实**；台账/自证结构清晰、注释已记录两处实现坑；未引入重复实现（`assertionLedger` 单点），但 `ASSERTION_DOC` 为死代码 |
| **4 性能** | **通过** | F1 读取为 O(1)（直接取快照引用），selector 求值同原；无 N+1/O(n²) 引入；`useSyncExternalStore` 未引入双通道重复渲染（noop 通道不参与）⇒ 无重渲染放大；台账机检仅在 `--falsifiability` 与收尾各跑一次（探针脚手架，不在产品路径） |
| **5 测试覆盖** | **通过（含 F-03 P2 + F-07/F-09 P3）** | 门禁四道全绿（smoke 301/0 含计数对账、validate-preset、`node --check` 23/0、`--falsifiability` PASS）；台账机检独立复现（含自选注入反例）；A 段 smoke F6 扩面具真实判别力（正向对照构造合法）；**缺口** = F1 行为面判据的判别力（F-03）、台账 4 处口径残面（F-07）；覆盖边界测试：CLEAN-004 冻结探针 A/B 两轮 `headDirty` 对照 + 与基线 5 条差异全改善（零 PASS→FAIL） |

---

## 8. AI 专项 5 项检查

| # | 专项 | 结论 | 依据 |
|---|---|---|---|
| 1 | **mock 残留** | **无违规**（1 处 P3 提示已并入 F-03） | mock 仅存在于测试/探针面（`test/smoke.mjs` 的 `mockReact`/mini-react、探针的 store 替身），产品面零 mock；但 F1 断言中的 `snapshotIdentityStable` 以 mock store 自身为观测对象 ⇒ 判据空转（已记 F-03） |
| 2 | **硬编码返回值** | **无违规** | 未见「断言恒真/恒假」或返回常量以掩盖失败的实现；`assertionLedgerReport()` 的判据全部由数据派生；`PROBE UX-012` 退出码由 tally 计算（`failed.length === 0 ? 0 : 1`，无硬编码 0） |
| 3 | **幻觉 API 调用** | **无违规** | 新增 API 面仅 `react.useSyncExternalStore`（宿主提供：`dsh-client-ui-commands/lib/client.js:937` 实读存在）；`import.meta.main` **未被误用**（正确做法是本次 F-12 的**建议**，未写成既有 API）；无凭空宿主方法/事件名 |
| 4 | **未实现 TODO** | **无违规**（1 处「声明未消费」已记 F-10） | 全批无 TODO/FIXME 式占位；A 段的「派生文件头」不是 TODO 而是**未接线**实现（`ASSERTION_DOC` 死代码）⇒ 已按 P1 记录；遗留项（RISK-008 残余、UX-060 备注归口、item 3.7）均**如实登记**于 CHANGELOG/契约/报告 |
| 5 | **过度实现** | **基本通过（2 处 P3）** | 未见与本任务无关的功能扩张；`regionLiterals`/`presetRowConfig`/`kindEnum`/`faces` 零改动，`items[]` 零增删；**轻微**：契约 2.3 行号串格式改动（F-11）、revision 注记把「同行替换」列入「重基项名目」（F-06）——均可减 |

---

## 9. 设计一致性（P-10 / 契约不变量 / BUG-005 五契约 / BUG-009 收敛语义）

| 检查面 | 结论 |
|---|---|
| **P-10 宿主耦合入契约** | **部分不通过**：本批新增宿主耦合面 = `react.useSyncExternalStore`（宿主导入/API 调用面）——已登记于契约（item 2.2 所在 factory 解构引用 + revision 注记）✅；但重基引入 **2 处失实行号**（F-01）⇒ 契约作为事实源失真；另 `subscribeForCurrent` 的机制注释失真（F-04） |
| **契约不变量** | **通过**：items 49↔49、id 序列一致、非 line 字段 0 变更、`regionLiterals`/`presetRowConfig`/`kindEnum`/`faces`/`ctxGetSemantics`/`hostSurface` 逐字节相同、5.3/5.4/5.6 行号未变、`revisions[]` 8→9 ✅（§3.2④） |
| **BUG-005 五契约** | **通过**（§B-7 逐条核，代码事实与自述一致；「派生值不变也强制重渲染」由 `bump` 无条件推进保留，语义无漂移） |
| **BUG-009 收敛语义** | **通过**：`selectNow` 未动（渲染期实时求值）；冻结探针 A/B 两轮 `C3b`/`C9`/`C10`/`C11` 全 PASS（独立读报告确认）；零回归（A vs B 零断言差异、与基线 5 条全改善） |

---

## 10. 复跑证据与命令（可复现）

```
git -C <repo> show 6f65bbe            # A 段全量 diff
git -C <repo> show 535d798 -- lib/client.js lib/host-contract.mjs test/smoke.mjs
node test/smoke.mjs                   # → SMOKE DONE: 301 passed, 0 failed（末条 A-F9：声明 301 ≡ 实测 301）
node test/validate-preset.mjs         # → PRESET VALIDATION PASSED（schema-face: PASS，skills 29/29）
node --check（23 文件）               # → checked 23 files, failed 0
node scripts/probe-nv-ux012.mjs --falsifiability
                                      # → FALSIFIABILITY PASS（red 29 / ok 12）
                                      # → CLASSIFICATION-LEDGER PASS（桶和 28 ≡ 28 ≡ 28；源控制 32 行 45802774…；注入 8/8）exit 0
python %TEMP%\clean006-verify-r1\verify*.py     # 台账哈希/桶和/id + 契约插入点/Δ 分段/覆盖率/逐行等价（独立复算）
node -e "…report.json 逐条 id:status 对比…"      # A/B 两轮 vs 基线：5 条差异全改善、零 PASS→FAIL、A vs B 零差异
Get-FileHash（冻结三脚本）                        # de2de511… / 5afb8663… / 782560e3… ≡ README §3 锚值
```

**未复跑（如实标注）**：`node scripts/probe-nv-ux012.mjs`（全量，含隔离实例 + 无头浏览器）与冻结探针全量复跑——两者会自举隔离实例与浏览器进程，**本审查的任务边界**禁止可能触发真实环境副作用的重跑（且本批报告已由 B 段自跑并归档，本审查改以「读报告 + 独立比对 + 机制核验」替代）。因此「27 条 / PASS 23 / FAIL 0 / N-A 4」与「UI 行为面 PASS」一组读数为**采信 + 交叉一致性核验**，非本审查复跑所得——已在 §B-7 与 §5① 标注其对 RISK-008 关闭判定的影响。

---

## 11. 与 Developer 自述的一致性核对（要点）

| 自述 | 核对结果 |
|---|---|
| A 段「不改产品行为；`lib/client.js`/`lib/host-contract.mjs` 零改动」 | ✅ 成立（9 路径无二者） |
| A 段「台账机检四项 + 唯一性 + 源控制锚；注入 8/8」 | ✅ **独立复现**（哈希/计数逐字一致；自选注入反例复做成立） |
| A 段「文件头口径改由台账**派生**（单一口径维护）」 | ❌ **不成立**（`ASSERTION_DOC` 死代码）⇒ F-10 |
| A 段「归属偏差订正（N-5）：4 条 N-A 全在驱动桶；A2/B2 为快照读数」 | ✅ 成立 |
| A 段「28 唯一 id（含 N-A 4）≠ 32 物理接线，闭合 26 歧义」 | ✅ 口径自洽（残余 27 vs 28 未说明 ⇒ F-07） |
| A 段「N-2 撤回覆盖主张 + 不可达取证」 | ✅ 撤回成立；⚠️ 取证强度不足（F-05） |
| A 段「N-3 判据面扩面 + 正向对照必红」 | ✅ 成立（判据独立核；注释「TDZ」措辞不确 ⇒ F-09） |
| A 段「N-6 归属 = `COMPAT-015 F3`，与 A-F9 不混写」 | ✅ 成立（「仅 F3 转红」与「295/2」措辞并存 ⇒ F-06 记录面） |
| A 段「F6 归因 = 探针选择器恒不命中（宿主 div+treeitem），界定 C3b/C9/C10/C11 不受影响，冻结资产零改动」 | ✅ **全部独立成立**（宿主源码 + 探针源码 + 三脚本 sha256 复算） |
| B 段「F1：getSnapshot 不新建对象、subscribe 工厂级恒定、selector 留读取侧、无重渲染风暴」 | ✅ 成立（②的 `noop`/不重订阅 + 注释机制陈述 ⇒ F-04） |
| B 段「BUG-005 五契约逐条保持（17 条断言零改动）」 | ✅ 成立（断言未改动、逐条绿；harness 有改动，不属断言） |
| B 段「契约 10 项 / 11 处、Δ 分段、32/32 逐行等价、零扩展」 | ⚠️ **部分不成立**：client.js 面 10 项/11 处零遗漏、190 行等价 ✅；但 **1.6/1.9 误重基** ❌（F-01）、名目/坐标/Δ 分段字面偏差（F-06） |
| B 段「smoke 301 / validate-preset PASSED / `node --check` 23-0 / `--falsifiability` PASS」 | ✅ **全部独立复跑一致** |
| B 段「冻结探针 FAIL 0 / 49-47-0-2 / 零 PASS→FAIL / 零新增 FAIL」 | ✅ 成立（两份报告 + 独立比对） |
| B 段「冻结探针 run `headDirty=true` = 已应用修复未 commit 的工作树…同源可核」 | ✅ **同源主张成立**（探针自算 + 脏面限 client.js/index.js + 41 s 时间夹逼）；❌ **归档 README 的 head 写错**（F-02） |
| 事件上报「用户 DSH 实例与浏览器未被触碰」 | ✅ 观测一致（PID 18660/24896 仍在、启动时间未变；msedge 进程未被重启） |

---

## 12. 未验证 / 限制（P-01 如实标注）

1. **未复跑全量探针与冻结探针**（原因见 §10）：`27 条 / PASS 23 / FAIL 0 / N-A 4` 与 UI 行为面 PASS 为**采信 + 一致性核验**，非本审查实测；
2. **宿主 `createSnapshotStore` 实现未直读**：`@deepseek-ai/dsh-client-store` 不在被检索的宿主平面目录（`...\@deepseek-ai\` 下无该包），故「`getSnapshot()` 返回稳定引用」的依据为**宿主自身用法**（`dsh-client-ui-commands/lib/client.js:937`，已实读）+ 插件的形状校验（`getSnapshot`/`subscribe` 为函数）⇒ 结论依赖「宿主与自身用法一致」这一前提（未证否）；
3. **React 版本号未直读**：以宿主 bundle 内的 `react.useSyncExternalStore` 调用点为 API 可用性证据（与 BUG-009-R1 §限制 4 同口径）；
4. **本批 A/B 两轮 run 的 UI 现场不可重放**（隔离根已清理、报告为唯一留痕）⇒ 本次复核以「报告比对 + 机制核验」为限；
5. **`%TEMP%\clean006-ux012*`（UX-012 探针 `--out`）未读取**：超出本审查授权的只读路径白名单 ⇒ 该探针的 `report-ux012.json` / `classificationLedger` 运行期字段未逐字核对（已用源码面 + 归档报告面替代）；
6. 审查期间**未处置任何进程**（遵守「只上报不处置」），亦未越权申请沙箱升级。

---

*本报告为 CLEAN-006 首轮（R1）Code Review 结论，未经复审不得视为通过终态。*



