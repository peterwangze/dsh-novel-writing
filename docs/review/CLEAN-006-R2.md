# CLEAN-006 代码审查报告 — **R2**

- **round = R2**（前轮 = `docs/review/CLEAN-006-R1.md`，机录 `REVIEW-CLEAN-006-R1`，结论 **NEEDS_CHANGE**，硬门槛 4 PASS / 1 FAIL，P0×1 / P1×2 / P2×4 / P3×8）——本报告为**返工复审**，逐条比对前轮 findings（已修复 / 部分修复 / 未修复 / 新引入）。
- **审查对象（返工三 commit）**：
  - **`947d642`** `CLEAN-006: R1 返工（P0 契约误重基回滚 + F-02/F-10/F-03/F-04/F-05/F-12 + P3）`（10 文件 +293/−94）
  - **`2bf58d2`** `CLEAN-006: R1 返工（二）— 台账记账口径订正 + F-05/F-07 实测修复`（2 文件 +55/−18）
  - **`4590579`** `CLEAN-006: R1 返工复跑报告归档（head=2bf58d2 / headDirty=false / FAIL 0 / tally 49-47-0-2）`（新增 2 文件 +3327）
  - 历史：`6f65bbe`（A 段）→ `535d798`（B 段）→ 上述三者；HEAD = `45905793998bbbdd56ac66d460f68ff2b8ee33ef`；`main` **ahead 5**（未 push）。
- **工作树状态（审查时实测）**：`git status --porcelain` = ` M .governance/evidence-log.md`（Coordinator 治理写回）+ `?? docs/review/CLEAN-006-R1.md`（R1 报告未入册）。二者均非被审产物 ⇒ 被审面（`lib/**`、`scripts/**`、`test/**`、`docs/evidence/**`）与 HEAD **逐字节一致**（实核：工作树 `lib/client.js` ≡ `HEAD:lib/client.js`；`git status` 中无其它路径）。
- **审查者**：Code Reviewer Agent（**只读**；唯一写入 = 本报告）。
- **审查方式**：① `git diff/show/cat-file` 逐行读三 commit 全量 diff（含 179+68 行探针 diff / 95 行 smoke diff / 23 行契约 diff）；② **独立复算**（内联 `node -e` 脚本，**零写盘、零仓库写入**；避坑：`git show <rev>^:path` 在 `child_process` 经 cmd.exe 时 `^` 会被吞 ⇒ 全程用 `execFileSync` 参数数组）；③ **门禁四道独立复跑**（smoke / validate-preset / `node --check` / `--falsifiability`）；④ **实测**（三脚本 `import()` 入口守卫 + `%TEMP%`/进程指纹前后对照）；⑤ 只读检索 `.governance/**`、`docs/**`、`%TEMP%`。

## 结论：**APPROVED_WITH_NOTES**（`unresolved_blockers=0`）

> 硬门槛 **5/5 PASS**：**P0 = 0**；R1 的 7 项指定项（F-01/F-02/F-10/F-03/F-04/F-05/F-12）逐条有处置判定；5 维度全覆盖且每条发现带级别；设计一致性（P-10 / 契约不变量 / BUG-005 五契约 / BUG-009 收敛语义）已完成；AI 专项 5 项全部完成。
>
> **F-01（P0）闭合经独立实读 + 独立重做确证**（回滚为真值、无第二处跨文件误重基）；F-02 / F-10 / F-03 / F-05 / F-12 已闭合；**F-04 功能面已闭合**（回调原样转交，实读 + 取直判据双证），**陈述面残留 1 处失实（N-4，P3）**。新发现 **P0×0 / P1×1 / P2×2 / P3×6**，全部不阻断合并。
>
> **可用性**：**可作为 CLEAN-006 终态**，附两项条件——① **N-1（P1）** 须登记为后续修复项（F-07(c) 第三条判据恒假且静默 + 自述失实）；② **N-2 / N-3** 须在关单前落实归口（CLEAN-005 缺项、UX-060 备注项无承载）。

---

## 0. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 判定 |
|---|---|---|---|
| **P0 阻塞问题数** | = 0 | **0**（R1 的 F-01 已闭合；本轮新发现最高为 P1） | **PASS** |
| R1 的 F-01/F-02/F-10/F-03/F-04/F-05/F-12 逐条有处置判定 | = 100% | §1 表：7/7 有判定（5 项已修复、1 项部分修复、1 项已修复含残余） | **PASS** |
| 5 维度全覆盖 + 每条发现带级别 | = 100% | §12 五维度逐项结论齐全；§16 共 9 条发现，逐条带 P1~P3 | **PASS** |
| 设计一致性（P-10 / 契约不变量 / BUG-005 五契约 / BUG-009 收敛语义） | 已完成 | §14 完成（P-10：误重基已回滚、口径入册；契约不变量全项通过；BUG-005 五契约通道未动；BUG-009 收敛语义保持 + 冻结探针 C3b/C9/C10/C11 PASS） | **PASS** |
| AI 代码专项 5 项 | 全部完成 | §13 五项逐一有结论 | **PASS** |

---

## 1. R1 逐条处置判定（复审必达项）

| R1 finding | 级别 | 处置判定 | 独立依据（要点） |
|---|---|---|---|
| **F-01** 契约 1.6/1.9 跨文件误重基 | P0 | **已修复** | §2：`lib/index.js:1457/1463/95` 独立实读为真值；契约现值 = 真值；「按 file 分组」矩阵独立重做，本批对非 client.js 面**净改动 0** |
| **F-02** B 段归档 README `head` 与报告矛盾 | P1 | **已修复** | §3：README `head=6f65bbe…` ≡ 同目录 `report.json`；`lib/client.js` 双锚（blob `8a7e1784…` ≡ `git rev-parse 535d798:lib/client.js`；文件 sha256 `54a4cf4a…` ≡ CRLF 重建内容，**逐字节命中**）；A 段 README 字段名订正为「本 `report.json` sha256」 |
| **F-10** `ASSERTION_DOC` 死代码 ⇒「文件头由台账派生」不成立 | P1 | **已修复** | §4：文件头**已零桶计数/枚举**；`ASSERTION_DOC` 有 2 处真实消费（`--falsifiability` 实测输出 `桶分解：…`；`report.classificationLedger.doc`）。残余 = N-9（P3，结论面过宽） |
| **F-03** F1 四条断言判别力缺口 | P2 | **已修复（结构性）** | §5：① 新增直取判据 ①b（对「不订阅」「传 noop」两种变异静态可判必红）；② `snapshotIdentityStable` 改判产品 `getSnapshot` 实参自身返回值；③ `drain()` 渲染上限 50（挂死 → 红灯）；④ 覆盖边界如实标注。残余 = N-6(c)（构造性反例失败集未细分） |
| **F-04** `subscribeForCurrent` 丢弃 React 回调 | P2 | **功能面已修复 / 陈述面部分残留** | §6：`onStoreChange` **原样转交**（`lib/client.js:1502-1503` 实读）+ 直取判据 `handlerCalls>=1` 在册；无功能回归。**但**「换 store 后重订阅」机制陈述仍与 React 语义不符 ⇒ **N-4（P3）** |
| **F-05** 不可达性取证单点采样 | P2 | **已修复** | §7：源码面机检（入口恰 1 处 ∧ `openConsole` 体内 `closeWorkbench(` ∧ 正向对照）× 独立实测复核；返工首版「锚恒红」缺陷已由 `2bf58d2` 订正，**最终版本不再恒红**；DOM 五点采样 + 遮罩几何/`pointer-events` + `degenerate` 标注齐备 |
| **F-12** 探针缺入口守卫（3 脚本同族） | P2 | **已修复** | §8：三脚本均为 `process.argv[1]` + `pathToFileURL` + `realpathSync` 比对、**未用** `import.meta.main`；**独立实测**三脚本 `import()` ⇒ exit 0 / 65~79 ms / 仅 `IMPORT-OK` / `%TEMP%` **零新增** / node·msedge 进程数不变 |
| F-06 重基记述偏差 | P3 | **已修复**（措辞残余见 N-6） | 契约 `revisions[]` 按真值重写（`CLEAN-006` / `CLEAN-006（R1 返工）` 两条，`:81-82`）；「同行替换」不再计为重基项；坐标基准标注；Δ 分段纠正 |
| F-07 台账 4 处口径残面 | P3 | **部分修复** | (a) 基线用例并入 `issues === 0` ✓（`--falsifiability` 实跑通过）；(b) 注入⑥ 改用 `declaredSiteCount(32)` ✓；(d) `runtimeNote` 说明 28→27 差额来源 ✓；**(c) 新增运行期核对但第三条判据结构性恒假 ⇒ N-1（P1）** |
| F-08 归因订正（C3b/C9/C10/C11；`sessionVisible` 引文） | P3 | **部分修复** | ① CHANGELOG:57 + 三份归档 README 已分区（冻结探针 vs `UX012-*`）✓；② `sessionVisible` 全合取**仅写进 CHANGELOG**，三份源文档仍为单支引文 ⇒ **N-8（P3）** |
| F-09 smoke 注释「TDZ」措辞不确 | P3 | **已修复** | `test/smoke.mjs:700-704` 改写为「运行期崩溃 vs 源码面静态判据」并加 F-09 标记（实读） |
| F-11 契约 2.3 行号串格式 | P3 | **已修复** | `lib/host-contract.mjs:128` = `L5135-5137`（与同批其余条目同形，实读） |
| F-13 契约 item 3.7 陈旧锚点 | P3 | **处置成立、归口不完整** | 本批确实未动其值（BASE↔HEAD 逐字未变，实核）；但「10 项 → CLEAN-005」的归口缺 2 项、误标 2 项 ⇒ **N-2（P2）** |

---

## 2. F-01（P0）闭合独立复核 —— 本轮最关键

### 2.1 回滚真值（独立实读 `lib/index.js`，不采信自述原文）

| 断言点 | 独立实读结果 | 契约现值（`lib/host-contract.mjs`） | 判定 |
|---|---|---|---|
| `L1457` | `registerSettings(ctx, NS, Config)` | item 1.6 `line: 'L55（调用点 L1457、L95）'`（`:108`） | ✅ 真值 |
| `L1463` | `onLifecycle(ctx, () => service.registerHttp(webServer), 'dsh-novel-writing: http routes')` | item 1.9 `line: 'L76 / L1463'`（`:111`） | ✅ 真值 |
| `L95` | `const c = readSettings(ctx, NS)` | 同上（1.6） | ✅ 真值 |
| 误值 `L1459` / `L1465`（R1 时点的 B 段值） | `service.ensurePreset()` / `logWarn(ctx, 'dsh-novel-writing: no webServer mounted; …')`，**与两项语义无关** | 已被回滚、现值不再出现 | ✅ 误值已清除 |

### 2.2 「按 file 分组」核验表独立重做（独立重算，非采信）

方法：`execFileSync('git', ['show', '<rev>:lib/host-contract.mjs'])` 取 4 个版本原文（`535d798^`=6f65bbe 好态 / `535d798` B 段 / `947d642` 返工首提交 / 工作树），逐 item 提取 `file` 与全部 `line` 值做集合比对。

```
items 计数 base/bad/rw/wt = 49 / 49 / 49 / 49    id 序列 base==wt: true   base==bad: true
(2) 6f65bbe → 535d798（B 段改了谁）：10 项 = 1.6、1.9（跨文件）+ 2.3 / 2.10 / 2.11 / 2.12 / 2.13 / 3.4 / 3.6 / 3.8（client.js）
(3) 535d798 → 947d642（返工改了谁）：同样 10 项 —— 1.6/1.9 回滚 + 8 项 client.js 增量重基
(4) 947d642 → 工作树（2bf58d2）：0 项
(5) 6f65bbe → 工作树（净效果）：8 项（全部 client.js） ⇒ **非 client.js 面净改动 = 0**
```

**判定**：Developer 的「本批对**非 client.js 段**的改动恰为此 2 处」主张 **成立**——27 个非 client.js 条目（面 1 的 1.1~1.11、面 4 的 4.1~4.6、面 5 的 5.1~5.6、面 6 的 6.1~6.5、面 3 无）逐项对照后，**仅 1.6 / 1.9 被本批触碰，且均已回滚为 6f65bbe 的取值**；**不存在第二处跨文件误重基**。

### 2.3 其它跨文件条目抽查（≥3 项，逐项实读）

| 条目 | 契约 `line` | 目标行实读（工作树） | 陈否 | 本批是否变更 |
|---|---|---|---|---|
| 1.4（`lib/index.js`） | `原 L18 → 现 L40 字符串常量` | `index.js:40` = `const NS = 'novel-writing'` | **命中正确**（非陈旧） | 未变 |
| 1.7（`lib/index.js` + `host-boundary.js`） | `L88 / L45` | `index.js:88` = `constructor(ctx) {`（真值 `super(ctx, SERVICE_NAME)` 在 **`:89`**）；`host-boundary.js:45` = `export const SERVICE_NAME = 'novel-writing'` ✅ | **陈旧（index.js 段 −1）** | 未变（先于本批） |
| 2.4（`lib/client.js`） | `L770 / L801 / L817 / L826 / L865 / L874` | 实测 `legacyApi` 回退返回点 = `:804 / :820 / :829 / :868 / :877`（**5 处**，契约值相对实测**系统性偏小 3 行**）；`L770` 为注释行（非代码点） | **陈旧（系统偏移 + 计数口径差）** | 未变（先于本批） |
| 3.7（`lib/client.js`） | `L884-886 等` | `:884-886` = `shouldCloseOnCurrentChange` 的 JSDoc；三键字面量在 `:975`（`SPLIT_PERSIST_KEY`）/`:977`/`:1042` | **陈旧**（R1 F-13 已定性） | 未变 |
| 5.3（`agent.cordis.yml`） | `L52 / L56 / L81` | 实测 `!!js` 表达式在 `:58` / `:62`，`getBuiltinModule('node:url')` 表达式在 `:87`（契约值统一 −6） | **陈旧** | 未变（先于本批） |
| 6.2（`package.json`） | `L8-10` | `:8-10` = `"engines": { "node": ">=20" },` | **命中正确**（非陈旧） | 未变 |
| 4.1~4.6（`install.ps1`/`install.sh`/`package.json`/`cordis.patch.yml`） | 13 处 | 未变；本批零改动两安装脚本 | — | 未变 |
| 1.1~1.3、1.5、1.8、1.10、1.11（`host-boundary.js`/`tools.js`） | 11 处 | 未变；本批零改动 `host-boundary.js` | — | 未变 |

### 2.4 10 项「先于本批陈旧锚点」BASE↔HEAD 逐段对照（抽查 ≥3）

方法：对 `535d798^` 与工作树的 `line` 值做**段级**（按 `/` 切分）比对。

```
1.4   1 段  wholeIdentical=true   无段变化
1.7   2 段  wholeIdentical=true   无段变化
2.4   6 段  wholeIdentical=true   无段变化
3.2   2 段  wholeIdentical=true   无段变化
3.3   3 段  wholeIdentical=true   无段变化
3.4   3 段  CHANGED: seg2 "L4746"→"L4786"  seg3 "L4889"→"L4929"   （client.js 段，机械重基 +40，正确）
3.6   2 段  CHANGED: seg2 "L3886"→"L3926"                          （client.js 段，+40，正确）
3.7   1 段  wholeIdentical=true   无段变化
5.3   3 段  wholeIdentical=true   无段变化
6.2   1 段  wholeIdentical=true   无段变化
```

**判定**：⑧ 项**逐字未变**（含 1.7/2.4/3.2/3.7/5.3 等确为陈旧者）；**3.4/3.6 的 `line` 全串确已变化**——变的是其 `lib/client.js` 段（机械重基，正确），**陈旧段本身未变**。故「陈旧状态先于本批存在」的**实质主张成立**，但提交消息「…的 line 值在两版之间**逐字未变**」对 3.4/3.6 **字面不成立** ⇒ 记为 **N-6(a)（P3 措辞）**。

独立实读抽查 3 项（1.7 / 2.4 / 5.3，见 §2.3）：均确为陈旧，且其锚点位置在 Δ0 区（本批插入点在 1451+/1480+，均在其后）⇒ **陈旧非本批引入**。另抽查 1.4 / 6.2：实读**命中正确** ⇒ 不应列入「陈旧」名单 ⇒ **N-2(b)**。

### 2.5 `revisions[]` 取证口径入册

`lib/host-contract.mjs:81`（`task: 'CLEAN-006'`）已含：**「跨文件引用不得套用本文件的 Δ（1.6/1.9 的调用点段指向 `lib/index.js`，该文件本批零改动 ⇒ 其真值不变；R1 发现的误加 +2 已回滚）」**、多段条目「第 i 段 → `file[i]`」定位规则、1.6「单元素 file + 调用点异文件已在 note 显式标注」。1.6/1.9 的 `note` 亦各自显式标注「调用点位于 `lib/index.js`（≠ 本项主 file）」⇒ **口径表述无歧义**。

**F-01 判决：已闭合（阻断解除）**；残余归口问题见 N-2。

---

## 3. F-02 独立复核（归档 provenance）

| 检查面 | 独立核验 | 判定 |
|---|---|---|
| B 段 README `head` | README = `6f65bbe9cbb1a00b944ad98453456d9d669912cd`；同目录 `report.json` 顶层 `head` = `6f65bbe9cbb1…`（逐字一致） | ✅ 已订正 |
| 补的 `lib/client.js` 锚（blob） | README 主张 `8a7e1784070418963d1e3a542842d6ea532ee278` ≡ `git rev-parse 535d798:lib/client.js`（**独立复算命中**） | ✅ 成立 |
| 补的 `lib/client.js` 锚（文件 sha256） | README 主张 `54a4cf4ac9d1a99253eef2ffbd13cbfdcc8a14189e8adc2cee24b7e0ac1de10c`；由 `git cat-file -p 535d798:lib/client.js` 做 LF→CRLF 重建后 sha256 = **同一值**（逐字节命中） | ✅ 成立（且解释了「git 内部 blob 与工作树文件哈希不同」的原因 = 行尾符） |
| A 段 README 字段名订正 | 表头已为「本 `report.json` sha256」、值 = 报告哈希（`5dc9d4389c33cb35…` / 97362 B） | ✅ 已订正 |
| 三份 README 的 `report.json` sha256 | A = `5dc9d4389c33cb35…`、B = `83b04594852f855d…`、C(2bf58d2) = `5dbf487344b8ca8c…` —— **均与实测一致**（97362 / 97372 / 97362 B） | ✅ 一致 |

---

## 4. F-10 独立复核（文件头由台账派生 + 单一事实源压力测试）

### 4.1 文件头已零人工副本

`scripts/probe-nv-ux012.mjs:15-26`（文件头）实读：原「28 条 = 20 条驱动+…」人工枚举**已删**，改写为指向唯一事实源 `ASSERTION_LEDGER`，并声明「实际取值请以 `--falsifiability` 输出或 `report.classificationLedger.buckets` 为准」。**全文件再无第二处桶计数/枚举**（grep `20+2+1`、`28 条`、`27 条` 在探针内仅见派生文本）。

### 4.2 `ASSERTION_DOC` 真被消费（2 处，实测）

- `:767-768`：`console.log('  桶分解：' + ASSERTION_DOC.breakdown)` / `闸门 N-A：… ⇒ …；` + `runtimeNote` ⇒ **实测输出**（本审查 `--falsifiability` 真跑捕获，见 §11）。
- `:1568`：`report.classificationLedger.doc = { breakdown, naGated, totalLine }`。
⇒ 由「死代码」变为**有消费者的渲染面**，F-10 主张成立。

### 4.3 单一事实源压力测试（只读文本推演：改台账一个桶计数会怎样）

| 改法 | 是否静默过期 | 机检信号 |
|---|---|---|
| 改 `ASSERTION_BUCKET_DEFS[].count` | 否 | `assertionLedgerReport()`：`bucketSumOk`（桶和 ≡ `declaredTotal`）/`slotLenOk` 立即红；`--falsifiability` 输出 `桶分解` 同步变化（派生，无副本） |
| 改 `slots[]` 归桶 | 否 | 桶和 / `unassigned` / `unknownInBucket` 三向红 |
| 改 `declaredTotal` | 否 | `countMismatch`（台账条数 ≠ 声明总数）/源码对账（28 ≡ declaredTotal + 名单数）红 |
| 改 `notRegisteredIds` | 否 | 源码对账（`actualIds ≡ declaredTotal + 名单数`）红 |
| **改 CHANGELOG 内嵌的桶分解串** | **是（无信号）** | `CHANGELOG.md:60` / `:73` 仍以文字内嵌 `20+2+1+2+2 ≡ 27`；无任何机检消费 CHANGELOG prose ⇒ **改台账后这两处静默过期** |

**判定**：F-10 的**目标面**（探针文件头）闭合 ✅；但 CHANGELOG 结论句「⇒ 不存在「文档副本 ↔ 台账」两处维护面」**过宽**（CHANGELOG 本批条目仍是人工副本）⇒ **N-9（P3）**。

---

## 5. F-03 独立复核（判别力 + 构造性反例 + 渲染上限）

### 5.1 四条断言已改为**只对 F1 通道敏感**（逐段实读 `test/smoke.mjs:1895-2130`）

| 断言 | 观测对象（改后） | 与 F1 通道的关系 |
|---|---|---|
| F1 读面接线 | 剥注释后的产品源码串 `useSyncExternalStore(subscribeForCurrent, getSnapshotForRender)` | 源码在位置（不受运行面变异影响） |
| 约束① | `subArgs`/`snapshotArgs` 跨渲染身份恒定 ∧ **产品 `getSnapshot` 实参自身**两次取值引用稳定（`:2090-2093`，已删「以 mock store 自身为观测对象」的旧判据）∧ `rendersBounded` | 观测面为**产品实参**，非 mock 自身 ✅ |
| **约束①b（新）** | `f1Direct`（`:2068-2087`）：把 `useSyncExternalStore` 收到的 `subscribe` **实参直取调用** ⇒ 订阅 +1 ∧ 返回函数可用 ∧ 退订后回零 ∧ **notify 时回调被调到** | **只对 F1 通道敏感** ✅（`during===before+1`、`after===before`、`handlerCalls>=1`，`:2125-2129`） |
| 约束②/③ | 换 store 后新 store 通知驱动重渲染取到新数据 / 卸载后两 store 订阅为 0 | 由 effect（resync）通道满足，**不区分** F1 通道（覆盖边界如实标注） |

### 5.2 构造性反例的**独立复核（静态重算，未改仓库）**

| 变异 | ①b 判据取值 | 是否必红 | 其余 F1 断言 |
|---|---|---|---|
| `subscribeForCurrent` 不订阅（保留 effect 通道） | `during === before` ⇒ 第一项假 | **必红** | 接线（源码串仍在）✓ / ①（实参身份恒 + 产品快照稳定 + 有界）✓ / ②（effect 通道）✓ / ③（两 store 归零）✓ |
| 订阅但传 `noop`（回调转发丢失） | `handlerCalls === 0` ⇒ 最后一项假 | **必红** | 同上 ✓ |

⇒ 「只对 F1 通道敏感」的**判据结构成立**。**但自述的两个读数（298/4、300/2）在本轮只读边界内无法独立复现**（复现需临时改 `lib/client.js`，本任务禁止改仓库任何文件），且 302−4=298 ⇒ 4 条失败中至少 1 条为 **A-F9 连带**（`test/smoke.mjs:3658-3659`：`readmeSmokeDeclared === passed + 1` ⇒ 任何失败都会连带 A-F9 红）；`300/2` 恰可解释为「①b + A-F9」，「298/4」尚余 **2 条未归因** ⇒ 记为 **N-6(c)（P3：失败集未细分，与前轮 F-06 同族）**。

### 5.3 `drain()` 渲染上限

`:1901` `const RENDER_CAP = 50`；`:1937` `if (renders > RENDER_CAP) throw new Error('render cap exceeded: …')`——位于 `drain()` 内、被外层 `catch (e) { f1Err = … }` 捕获 ⇒ **「无限重渲染」由挂死变为红灯** ✅（实测 smoke 302/0 未被误触发）。

### 5.4 覆盖边界如实标注

`:2112-2117` 明确写「本 harness **仅**在 `subscribe` 引用变化时换订；『渲染期 live 订阅收到 notify』这一面在 mock 下**不可复现**，回调转发判据由 ①b 直取探针承担」⇒ **如实标注成立**（但该段**逐字重复两次** ⇒ N-5；且其对「真实 React 还按『订阅对象 vs 当前 store』判断换订」的描述**与 React 语义不符** ⇒ N-4）。

---

## 6. F-04 独立复核

### 6.1 回调已原样转交（实读）

```js
// lib/client.js:1497-1506
const subscribeForCurrent = (onStoreChange) => {
  const noop = () => { }
  try {
    const st = resolveStore()
    if (st === null) return noop
    const listener = typeof onStoreChange === 'function' ? onStoreChange : noop
    const off = st.subscribe(listener)          // ← F-04 修复点：原为 st.subscribe(noop)
    return typeof off === 'function' ? off : noop
  } catch { return noop }
}
```

✅ 转交 + 形状回退保留 + 引用恒定保留。直取判据 ①b 以 `handlerCalls >= 1` 锁定该行为（F-04 的直接机检）。

### 6.2 服务切换后**仍不重订阅**（事实认定）

`useSyncExternalStore(subscribeForCurrent, getSnapshotForRender)`（`:1545`）——`subscribeForCurrent` 为**工厂级恒定引用**，React 的订阅 effect deps = `[subscribe]` 不变 ⇒ **effect 不重跑 ⇒ 不重订阅**；挂载期 store 的退订函数一直持有到卸载（无泄漏，卸载仍退订）。换 store 的**订阅**由 effect 内的 `resync()`（`:1525-1536`，`st !== curStore ⇒ detach() + 重新 `st.subscribe(bump)`）承担；**通知**由两条通道共存（F1 通道 → React 快照比对；effect 通道 → `setTick` 强制重渲染）。旁证：本仓 harness 自身口径 = 「`subscribe` 引用变化即重订阅」（`CHANGELOG.md:58`）。

### 6.3 功能回归核查

| 面 | 独立核验 | 判定 |
|---|---|---|
| BUG-005 契约① 函数引用恒定 | `useSessionsSel` 工厂返回、`apply` 单点创建（本批未动） | 保持 |
| 契约② holder 惰性解析 | `resolveStore()` 每渲染 `ctx.get('sessions')`（`:1454-1461`，本批未动） | 保持 |
| 契约③ 服务增减重订阅 | effect `resync()`（本批未动） | 保持 |
| 契约④ 派生值不变也强制重渲染 | `bump = () => setTick(n => n+1)`（`:1518`）+ `resync()` 尾部无条件 `bump()`（`:1535`） | 保持 |
| 契约⑤ 卸载退订 | `disposed`+`mounted.delete`+`detach()`（`:1539-1543`）+ usesync cleanup | 保持 |
| BUG-009 收敛语义 | `selectNow(selector)` 未动（`:1464-1469`、`:1546`） | 保持 |
| 冻结探针回归 | `2bf58d2` 归档：49/47/0/2、FAIL 0、与基线 5 条差异**全为改善**、零 PASS→FAIL（本审查独立比对，见 §11） | 保持 |

### 6.4 残余（⇒ N-4，P3）

`lib/client.js:1479-1481` 仍写「换 store 后的**再订阅**由「订阅生命周期的重建」承担（store 变化 ⇒ `resync()` 触发的重渲染 ⇒ **React 因 `subscribe` 返回的退订/重订而重订阅**）」——**与 React 语义不符**（引用恒定 ⇒ effect 不重跑）；`CHANGELOG.md:55`（B 段条目）保留同款旧陈述（与同文件 `:62` 的「订阅真空」登记半矛盾）；`test/smoke.mjs:2113-2114` 的「真实 React 按『订阅对象 vs 当前 store』换订」亦与 React 及本仓 harness 口径不符。

---

## 7. F-05 独立复核（源码面机检 + 正向对照 + DOM 退化标注）

### 7.1 最终版本不再恒红/恒真（返工踩坑已订正）

| 项 | 独立实测（工作树实读 + 正则重算） | 判定 |
|---|---|---|
| 旧坏锚 `openConsole()` | `lib/client.js.indexOf('openConsole()')` = **−1**（字面量确实不存在）⇒ 返工首版会取空切片、判据恒红（自述属实） | 坑真实 |
| 新锚 `function openConsole(` | 命中（char 166763 = **`:3046`**）；其后 900 字符窗内 `closeWorkbench(` 命中 **恰 1 处**（`:3047`，距锚 **76** 字符；全部 6 处 `closeWorkbench(` 的其余命中距锚 ≥ 51717） | **判别力成立**：若删掉 `openConsole` 体内那次互斥调用，窗内无命中 ⇒ 必红（**非恒红**） |
| 入口唯一性 | `store.set({ entryOpen: true })` 全文件 **恰 1 处** | 成立 |
| 正向对照 | 追加一处入口后计数 = **2** ⇒ `counterOk` 成立（防空转） | 成立 |
| 进断言 | `UX012-D1-workspace-dialog-esc` 谓词追加 `entryUniqueOk ∧ openConsoleClosesWorkbench ∧ counterOk`（`:1400-1404`）⇒ 源码面**进断言**，不再只是 facts | 成立 |

残余（P3 提示，不单列发现）：900 字符为魔法窗；若函数体前段增长 >900 字符会出现**假红**（fail-closed 方向，非静默）。

### 7.2 DOM 取证与退化标注

`facts.workspaceDialogEsc.reachability = { source, dom }`：`dom` = 抽屉**五点采样**（四角内缩 4px + 中心，`:1370-1386`）+ 遮罩 `getBoundingClientRect`（`coversViewport`）+ `pointer-events`/`position`/`z-index` 计算值 + `drawerRect`/`drawerHasArea`/`effectivePoints`（零尺寸 ⇒ `degenerate（抽屉零尺寸 ⇒ 五点为同一点，不作为不可达依据）`，`:1367-1378`）。`interactionBlocked` 由「单点」改为「五点全被占」，且断言**不依赖**该字段（如实标注）⇒ 论证主承重面已从单点 DOM 采样迁移到**源码面机检**，符合 R1 建议。

---

## 8. F-12 独立复核（入口守卫 + 实测零副作用）

三脚本守卫形态一致（实读）：

```js
const isDirectEntry = (() => {
  try {
    if (process.argv[1] === undefined || process.argv[1] === null) return false
    const self = realpathSync(fileURLToPath(import.meta.url))
    const arg = pathToFileURL(process.argv[1])
    return arg.protocol === 'file:' && realpathSync(fileURLToPath(arg)) === self
  } catch { return false }
})()
// probe-nv-ux012.mjs: const code = isDirectEntry ? await main() : 0; if (isDirectEntry) process.exit(code)
// 另两脚本:      if (isDirectEntry) await main()
```

**未使用 `import.meta.main`** ✅（三文件零命中）；`pathToFileURL`/`fileURLToPath`/`realpathSync` 均已导入 ✅。

**独立实测（本审查真跑）**：

```
argv 形态          : node --input-type=module -e … ⇒ argv=["…\\node.exe"]，argv[1]=undefined
probe-nv-ux012.mjs        : exit=0  79ms  输出 IMPORT-OK
probe-nv-bar-geometry.mjs : exit=0  74ms  输出 IMPORT-OK
isolated-preset-mount.mjs : exit=0  65ms  输出 IMPORT-OK
%TEMP% 条目数              : 48900 → 48900（NEW: <none>）
进程数                    : node 7 → 7 ；msedge 20 → 20
```

⇒ **import ⇒ 零副作用**成立（无实例、无临时目录、无子进程、无浏览器）。本审查**未处置任何进程**（只读观察）。

---

## 9. 台账记账变更复核（`UX012-CRASH` 28→27）：**订正，不是掩盖**

### 9.1 「异常路径专用」的理由是否成立

`scripts/probe-nv-ux012.mjs:1522`（`catch (e)` 分支内）为 **唯一** `UX012-CRASH` 记录点 ⇒ 健康运行**不产生**该记录行 ✅。据此，把它列在 `slots` 会使「记录条数 ≡ 声明条数」在任何健康运行恒不成立（把必然偏差写进判据）⇒ **移入 `notRegisteredIds` 是记账口径订正**，且未削弱其看护：物理接线处仍在（源控制锚 32 行不变）、异常即记录且 `ok=false`（必红）。

### 9.2 一致性（改动面是否自洽）

| 面 | 值 | 判定 |
|---|---|---|
| `declaredTotal` | 28 → **27** | ✅ |
| 桶 `ASSERTION_BUCKET_DEFS` | `20 + 2 + 1 + 2 + 2 ≡ 27`（`--falsifiability` 实测输出逐项一致） | ✅ |
| 源码对账式 | `actualIds(28) ≡ declaredTotal(27) + notRegisteredIds(1)`（`:420`） | ✅ 实测「源码对账（28 id / 源控制 32 行 9266378abcad）与台账一致=true」 |
| `unassigned` 豁免 | `!L.notRegisteredIds.includes(id)`（`:407`） | ✅ |
| 源控制哈希 | `declaredSha256` 随源码集更新（`9266378abcad…`），实测匹配 | ✅ |
| 运行期期望记录数 | 健康 = 27 = 声明数；异常 = 28 且该行必红（`runtimeNote` 已改写） | ✅ 语义正确 |

### 9.3 新不变量是否真进运行期断言

`assertionLedgerRuntimeCheck()`（`:438-455`）三条：① 每条记录 id 在册；② **判 N-A 的 id 集 ⊆ `excludedFromNa`**；③ 记录条数 ≡ 声明数（+异常路径）。`ledgerPredicate()`（`:1554-1556`）= `ledRep.ok ∧ ledSelf.pass ∧ offLedger 空 ∧ naNotDeclared 空`，作为 `A('UX012-CLASSIFICATION-LEDGER', …)` 的谓词 ⇒ **①② 真进运行期断言** ✅；**③ 不在谓词内**（自指理由充分：本条自身尚未入册）——但其**记录值**经复算**结构性为 false** ⇒ **N-1（P1）**。

### 9.4 `selfRef` 是否诚实

未用「预测集」掩盖 ✅（如实标注「谓词只取不受自指影响的两条 + 台账本体 + 注入式自证」，并把 `selfRef` 作为交叉核对显式落报告）——**口径诚实**；但 `selfRef.ok` 的计算在当前调用时序下恒 false（N-1）。

---

## 10. 契约重基与不变量（独立复算）

### 10.1 `lib/client.js` 行数变化后的增量重基

`old = 947d642^`（= 535d798，5268 行内容）→ `new = HEAD`（5273 行内容；工作树 ≡ HEAD 实核）。

```
git diff -U0 947d642^ HEAD -- lib/client.js   ⇒ 恰 3 个 hunk，全部落在 old L1480-1498：
  @@ -1480,5 +1480,10 @@   （5→10，净 +5）
  @@ -1490,4 +1495,3  @@   （4→3，净 −1）
  @@ -1498   +1502,2  @@   （1→2，净 +1）
⇒ 净 +5；Δ（old 坐标）：≤1479 = 0 ｜ 改写区 1480-1498 ｜ ≥1499 = +5
```

**8 项 / 11 段逐行等价独立复算（`old[L−Δ(L)] ≡ new[L]`，逐字节）**：`2.10`（L1449 不变 / 1548→1553）、`2.11`、`2.12`、`2.13`、`2.3`、`3.4`（首段不变 / L4781→4786、L4924→4929）、`3.6`（首段不变 / L3921→3926）、`3.8` —— **11/11 全等价，0 处不等价** ✅。

### 10.2 不变量（零扩展）

| 项 | 独立实测 | 判定 |
|---|---|---|
| `items[]` 计数 | 49 ↔ 49 | ✅ |
| item id 序列 | 逐项相同 | ✅ |
| 变更行分类 | `git diff -U0 535d798 -- lib/host-contract.mjs` = 23 变更行（+12/−11），**全部**为 item 行（20）或 revision 行（3），**other = 0** ⇒ `regionLiterals` / `presetRowConfig` / `kindEnum` / `faces` / `ctxGetSemantics` / `hostSurface` **零变更行** | ✅ 逐字节相同 |
| 非 `line` 字段 | 49 项中**仅 1.6 / 1.9** 有非 line 变更（= F-01 的 note 标注，已披露）；39/49 项整行逐字节相同（其余 10 = 变更条目的 `line` 值） | ✅ 与自述口径一致（「零变更」限于重基范围） |
| item 5.3/5.4/5.6 | `L52 / L56 / L81`、`L77-81`、`L16` 未变 | ✅ |
| `revisions[]` | 8 → 9 → **10**；新增 `CLEAN-006（R1 返工）`（`:82`）技术要点（3 个替换段坐标 `new L1480-1489 / L1495-1497 / L1502-1503` 与实测 hunk **逐点一致**） | ✅ 更新且准确 |
| item 2.3 形态 | `L5135-5137`（F-11 已还原） | ✅ |
| **冻结三脚本 sha256** | `de2de511e89a…5b65` / `5afb8663e6a9…159a` / `782560e34972…da23` —— 与锚值**逐字一致**；`git diff --stat 535d798^ HEAD -- docs/evidence/CLEAN-004/` = **无 diff** | ✅ 未变 |

---

## 11. 门禁与归档（本审查独立复跑）

| 门禁 | 自述 | 独立复跑（本审查） | 判定 |
|---|---|---|---|
| `node test/smoke.mjs` | 302/0 | **SMOKE DONE: 302 passed, 0 failed**（exit 0），末条 `COMPAT-014 A-F9 README smoke 断言计数同步：声明 302 ≡ 实测 302`（`README.md:169` 计数行 = 302，双向机检） | ✅ 一致 |
| `node test/validate-preset.mjs` | PASSED | **PRESET VALIDATION PASSED（schema-face: PASS，skills 29/29）**（exit 0） | ✅ 一致 |
| `node --check` | 23 文件 / 0 失败 | 对 `git ls-files '*.mjs' '*.js'` 全量 **23 文件**逐个执行 ⇒ **checked 23 files, failed 0** | ✅ 一致 |
| `--falsifiability` | PASS（含新派生输出） | **exit 0**；`FALSIFIABILITY PASS：red=29 ok=12`；新增 `桶分解：27 条 = 20+2+1+2+2 …`、`闸门 N-A：A7b/A1b/A6/A2b ⇒ 27，其中 N-A 4、其余 23`、`runtimeNote`（28→27 差额说明）**实测输出**；`桶和 27 ≡ 台账条数 27 ≡ 声明总数 27`、`源码对账（28 id / 源控制 32 行 9266378abcad）与台账一致=true`、注入式反例 **8/8**（含基线 `issues===0` 新判据） | ✅ 一致 |
| `docs/evidence/CLEAN-004-reruns/CLEAN-006-2bf58d2/report.json` | head=2bf58d2 / headDirty=false / FAIL 0 / tally 49-47-0-2 | **head=`2bf58d25afab…`、headDirty=false、tally {49,47,0,2}、FAIL ids=[]、realEnvVerdict.ok=true、cleanup.rootRemoved=true**；报告 sha256 `5dbf487344b8ca8c…`（97362 B）≡ README；`lib/client.js` 锚 blob `ce75cc14…` ≡ `HEAD:lib/client.js`、文件 sha256 `4bda446a…` ≡ 工作树文件**逐字节**；与仓内基线逐条比对 = **5 条差异全为改善**（`D2`/`C3b`/`C9`/`C10` FAIL→PASS、`C11` N-A→PASS）、**零 PASS→FAIL、零新增 FAIL、id 集相同** | ✅ 一致 |
| README 锚自洽性 | — | 三份 README 的 `head`/`headDirty`/`tally`/sha256/字节数**逐项与各自 `report.json` 一致** | ✅ 自洽 |

---

## 12. 五维度逐项结论

| 维度 | 结论 | 依据（摘要） |
|---|---|---|
| **1 正确性** | **基本通过（P1×1 为备注级）** | F-01 回滚真值独立实读 ✅；F-04 回调转交 ✅；F-05 最终判据不恒红 ✅；F-12 守卫实测 ✅；契约增量重基 11/11 段等价 ✅。**缺陷**：运行期台账第三条判据结构性恒假（N-1）。边界条件：`subscribeForCurrent` 形状回退、`resolveStore` 形状校验、抽屉零尺寸 `degenerate` 标注、渲染上限抛错均处理 ✅；并发面：F1 通道快照比对 + effect 通道双保险在位 |
| **2 安全性** | **通过** | 无密钥/令牌硬编码（归档报告 `instanceUrlRedacted`/`postData` 脱敏未变）；本批未改 I/O/路由/工具面；真实环境隔离面 `realEnvVerdict.ok=true`、`cleanup.rootRemoved=true`、`containment` 全真（2bf58d2 报告独立核）；入口守卫消除「误 import 即自举实例」的越界副作用面（负向安全改善）；本审查未处置任何进程、未申请沙箱升级 |
| **3 可维护性** | **通过（含 1 条 P3 重复代码 + 陈述类 P3）** | 命名与既有同款；新增函数均 ≪50 行；台账单点事实源且 `ASSERTION_DOC` 有消费；注释密度高且本轮大幅订正（F-09/F-10/F-05 均留档踩坑）；**缺陷**：`test/smoke.mjs:2112-2117` 注释段逐字重复（N-5）；`lib/client.js:1479-1481` 机制陈述残留失实（N-4） |
| **4 性能** | **通过** | 本批无新增复杂度：`subscribeForCurrent` 为 O(1) 包装；`F1` 通道不新建对象（快照本体/单例）；`resync` 单点 `bump`（每次通知 ≤2 次渲染，既有语义）；访存面无 N+1/O(n²) 引入；探针侧仅新增一次 `readFileSync` 与原生 regex（`--falsifiability` 面） |
| **5 测试覆盖** | **通过（含 P3 覆盖边界说明）** | 四道门禁全绿（独立复跑）；F-03 判别力重构（①b 直取 + 产品实参稳定 + 渲染上限）；F-05 源码面机检进断言 + DOM 取证升级；F-12 三脚本守卫实测；归档复跑零回归。**覆盖边界（已如实标注）**：渲染期 live 订阅在 mock 下不可复现；构造性反例读数未细分（N-6c） |

---

## 13. AI 代码专项 5 项

| # | 专项 | 结论 | 依据 |
|---|---|---|---|
| 1 | **mock 残留** | **无违规** | mock 仅在测试/探针面；F-03 已把观测对象从 mock store 改为**产品 `getSnapshot` 实参**（`:2090-2093`）；产品面零 mock |
| 2 | **硬编码返回值** | **无违规（1 条 P1 属「判据恒假」而非硬编码）** | 未见恒真/恒假返回值；台账判据全部数据派生；探针退出码由 tally 计算；**但** `assertionLedgerRuntimeCheck` 的 count 判据在当前调用时序下**恒假**（N-1，非硬编码，属时序/期望建模错误） |
| 3 | **幻觉 API 调用** | **无违规** | 新增 API 面仅 `useSyncExternalStore`（宿主 `dsh-client-ui-commands/lib/client.js:937` 在用）；`import.meta.main` **未被误用**（三脚本改用手写守卫）；无凭空宿主方法/事件 |
| 4 | **未实现 TODO** | **无违规** | 全批无 TODO/FIXME；遗留项（10 项陈旧锚点、UX-060 备注、RISK-008 残余）均按要求归口/登记（归口完整性见 N-2/N-3） |
| 5 | **过度实现** | **通过（2 处 P3 可减）** | `regionLiterals`/`presetRowConfig`/`kindEnum`/`faces` 零变更、items 零增删、非 line 字段仅 1.6/1.9（F-01 必需）；**轻微**：smoke 重复注释段（N-5）、F-10 结论句过宽（N-9） |

---

## 14. 设计一致性

| 检查面 | 结论 |
|---|---|
| **P-10 宿主耦合入契约** | **通过**：本批新增宿主耦合面 = `react.useSyncExternalStore`（调用面 + 解构），已登记（item 2.2 所在 factory 解构 + `revisions[]` 两条注记）；**误重基的 2 处失实行号已回滚为真值**（F-01 闭合）；重基口径「按 `file` 分组算 Δ」已入册（`:81`） |
| **契约不变量** | **通过**：items 49 零增删、id 序列一致、非 line 字段仅 1.6/1.9（已披露）、`regionLiterals`/`presetRowConfig`/`kindEnum`/`faces`/`ctxGetSemantics`/`hostSurface` 零变更行（23 变更行全在 items/revisions）、5.3/5.4/5.6 未变、`revisions[]` 8→10 |
| **BUG-005 五契约** | **通过**：五条通道本批未动（§6.3 逐条实读）；F-04 修复只补回通知面，不替代 effect 通道（CHANGELOG:69 的分工陈述与代码事实一致） |
| **BUG-009 收敛语义** | **通过**：`selectNow` 渲染期实时求值未动；冻结探针 `C3b`/`C9`/`C10`/`C11` 全 PASS（2bf58d2 归档独立比对）、`UX012-C2/C4/C1`（UX-012 侧，自报）未与本批修复面耦合 |

---

## 15. 遗留与归口裁定

| # | 事项 | 本审查裁定 |
|---|---|---|
| ① | **10 项「先于本批陈旧锚点」→ CLEAN-005** | **部分成立**：`3.2/3.3/3.4/3.6/3.7/3.8` 在 CLEAN-005 **F-8**（`plan-tracker.md:160` 明写「契约面 3 的 3.2/3.3/3.4/3.6/3.7/3.8 行段随 UX-060 的 +9/+91 偏移陈旧……本任务同批重基」）✅；`5.3/5.4/5.6` 在 CLEAN-005 **F-2** ✅（其真值 `!!js L58·L62 / URL 表达式 L87` 与本审查实测**逐字一致**）；**但** `1.7`（真值 `index.js:89`）与 `2.4`（系统性 3 行偏移 + 6 锚点 vs 5 处代码点）**未见于 CLEAN-005 任何栏目** ⇒ 归口落空；`1.4`/`6.2` 实读**命中正确**、不应列入「陈旧」。⇒ **N-2（P2）**：建议把 1.7/2.4 补登 CLEAN-005（并入 F-2 或新增 F-9），并从陈旧名单剔除 1.4/6.2；2.4 的「实测 −3 / 5 处 vs 6 处」目前**无仓内留痕**（仅 commit message 的 10 项清单，无该细节），建议随登记补一行实测表 |
| ② | **UX-060 R1 备注项（属另一探针）** | **归口不完整**：`docs/review/UX-060-R1.md` F-1（探针清理入 finally）/F-2（5 条 smoke 断言全为源码字符串直查）/F-3（`noticeKey` 复位→测量置真的**单帧** chip∩banner 窗口）/F-5（注释未覆盖横幅宽 0 退化态）/F-6（探针单体 620 行，与 `isolated-preset-mount.mjs` 重复）**均登记在 CLEAN-006 的 plan-tracker 行内**（`:161`），而本批**零落地**（`scripts/probe-nv-bar-geometry.mjs` 的最后一次变更 = `947d642` 的**入口守卫**；该文件仍无 `finally` 清理；`test/smoke.mjs:3549-3557` 的 UX-060 断言仍为 `clientSrc.includes(...)`）。⇒ **N-3（P2）**：若以 CLEAN-006 关单，MUST 在 plan-tracker 显式移出/另立任务（R1 已建议另立任务，但目前**无承载行**） |
| ③ | **RISK-008 关闭判定** | **建议：关闭**。理由：原风险面（渲染期读外部可变 store 未走 `useSyncExternalStore`）已**实质处置**——读取面走该 API（`getSnapshotForRender` 稳定引用、不新建对象）、**通知面回调已原样转交**（F-04 修复 + ①b 直取判据在册）、冻结探针收敛面 `C3b`/`C9`/`C10`/`C11` 全 PASS、`2bf58d2` 归档 `headDirty=false` 且零回归。**关闭同时 MUST 另立一条更窄的登记**：「F1 通道订阅恒定 ⇒ 换 store 不重订阅（含『挂载时服务缺席 ⇒ 该通道永不订阅』）的订阅真空」——现状由 CHANGELOG:62 承认为已知边界、由 effect/resync 通道兜住功能，但**注释陈述仍失实**（N-4），须与 N-4 一并订正后关闭 |
| ④ | **B 段归档 `headDirty=true`** | **可接受（历史留档）**。且本轮给出比 R1 更强的独立取证：`535d798:lib/client.js` 的 blob `8a7e1784…` 与**工作树含 F1 修复内容**的文件 sha256 `54a4cf4a…`（CRLF 重建后逐字节命中）双锚一致 ⇒「该 run 的被测面 ≡ B 段提交内容」成立，无需强制第 3 次复跑；最终态已由 `2bf58d2`（`headDirty=false`）归档覆盖 |

---

## 16. 发现列表（P0 → P3）

### N-1 [P1] 运行期台账核对的「记录条数」判据结构性恒假且静默，自述与代码事实矛盾

- **位置**：`scripts/probe-nv-ux012.mjs:438-455`（`assertionLedgerRuntimeCheck`，尤其 `:446-449`）、`:1554-1556`（`ledgerPredicate`，**只取两条判据**）、`:1557` / `:1570-1571` / `:1573-1579`（调用时序与自指回填）；`CHANGELOG.md:74`；commit `2bf58d2` message。
- **依据（独立复算，读源码逐条枚举 `A(/*@assert*/` 站点顺序）**：健康运行记录顺序 = 行为面/FALSIFIABILITY（`:1026`…`:1537`，共 **24** 条）→ 本条 `UX012-CLASSIFICATION-LEDGER`（`:1570`，第 25）→ `Z1`（`:1587`，26）→ `Z2`（`:1599`，27）。而 `:447` `expectedRecords = L.declaredTotal + extraRecorded` = **27 + 0 = 27**（注释却写「期望记录数 = 声明总数 −1」）⇒
  - `ledRunBefore`（`:1557`）：`recordedCount=24` ≠ 27 ⇒ `countOk=false` ⇒ `ok=false`；
  - `report.classificationLedger.runtime`（`:1573`）：`recordedCount=25` ≠ 27 ⇒ `ok=false`；
  - `selfRef`（`:1575-1579`）：`ok = ledRunAfter.ok && (afterCount(25) === expectedRecords+1(28))` ⇒ **false**。
  - 由于 `ledgerPredicate()` **不含** `countOk`，无人变红（静默）；而 `CHANGELOG.md:74` 与提交自述称「`report.classificationLedger.runtime.ok=true` ∧ `selfRef.ok=true`」⇒ **与代码事实矛盾**（P-01 失实）。
- **影响**：F-07(c) 的第三条判据**既不被执行也不正确**（对外报告字段 `runtime`/`selfRef` 会被外部审阅者读成失败，且掩盖了「判据从未真正核过」这一事实）；不影响探针退出码/断言结论与产品行为。
- **建议（二选一，均小改）**：① 把运行期核对移到 `Z2` 之后（`:1599` 之后、`:1602` 之前）重算并**把 `countOk` 纳入**最终谓词（此时记录集完整：健康 27 ≡ 27）；或 ② 若必须前置，则显式建模「待记录数」：`expectedRecords = declaredTotal − (本条未记录 ? 1 : 0) − (Z1/Z2 未记录数)`，并把 `selfRef.expectedAfterRecord` 同步修正。无论哪种，**同步订正 CHANGELOG/提交文本**，不得保留未经观测的 `ok=true` 断言。

### N-2 [P2] 「10 项陈旧锚点 → CLEAN-005」归口缺项 + 误标 + 细节无仓内留痕

- **位置**：`lib/host-contract.mjs:109`（1.7）、`:129`（2.4）、`:106`（1.4）、`:176`（6.2）；`.governance/plan-tracker.md:160`（CLEAN-005 的 F-2 / F-8 范围）；`947d642` commit message（10 项清单）。
- **依据**：① 1.7 独立实读 —— `lib/index.js:88` = `constructor(ctx) {`，真值 `super(ctx, SERVICE_NAME)` 在 **`:89`**（契约值 −1）；② 2.4 独立实读 —— `legacyApi` 回退返回点 = `:804/:820/:829/:868/:877`（**5 处**）而契约为 **6 个**数值且**系统性偏小 3 行**（契约 `L770` 还是注释行）；③ 二者**不在** CLEAN-005 的 F-2（5.3/5.4/5.6）或 F-8（3.2~3.8）范围内；④ 1.4（`index.js:40 = const NS = 'novel-writing'`）与 6.2（`package.json:8-10 = "engines"`）经实读**命中正确**，被列入「陈旧」属误标；⑤ 2.4 的「−3 / 5 处 vs 6 处」在 CHANGELOG / evidence-log / plan-tracker 中**零命中**。
- **影响**：两条真实陈旧锚点**无任务承载**（将长期不被收口）；误标项若照单「按陈旧重写」会引入**新的失实行号**（正是 F-01 的教训）；细节未留痕使他人无法复核。
- **建议**：在 CLEAN-005 行补登「1.7（`index.js` 段真值 L89）/ 2.4（实测 5 处 + 系统 3 行偏移）」并把 1.4/6.2 从陈旧名单移出（标注「非纯 `L<n>` 形态，实读命中」）；顺带把 2.4 实测表（6 契约值 ↔ 5 实测行）写入 CLEAN-005 备注。

### N-3 [P2] CLEAN-006 登记范围内的 UX-060 R1 备注项在本批零落地（关单口径）

- **位置**：`.governance/plan-tracker.md:161`（CLEAN-006 行含 F-1 / F-2 / F-3 / F-5 / F-6）；`scripts/probe-nv-bar-geometry.mjs`（本批唯一改动 = 入口守卫，`:620-632`；**无 `finally` 清理**）；`test/smoke.mjs:3549-3557`（UX-060 断言仍为 `clientSrc.includes(...)` 源码字符串直查）。
- **依据**：`git log --oneline -3 -- scripts/probe-nv-bar-geometry.mjs` = `947d642`（守卫）/ `21b100c`（原始 UX-060 交付）；F-3 属**产品行为**面（单帧叠字窗口）在 `lib/client.js` 中无对应修复（本批 `lib/client.js` 仅动 F1 hook 区）。
- **影响**：若 Coordinator 以「CLEAN-006 完成」关单，将出现**任务清单与实际交付不符**（用户可见的 F-3 单帧叠字仍在、F-2 断言仍无行为判别力）。
- **建议**：关单前二选一并在 plan-tracker 显式落字——(a) 另立任务承载 F-1/F-2/F-3/F-5/F-6（沿用 R1 建议，并把「面 3 全量重基」的 done_definition 与 CLEAN-005 F-8 合流）；(b) 若判定其已由其他任务覆盖，则在 CLEAN-006 行标注「已转 <task>」并给出证据路径。

### N-4 [P3] F-04 机制陈述残留失实（代码注释 / CHANGELOG / harness 注释）

- **位置**：`lib/client.js:1479-1481`、`CHANGELOG.md:55`、`test/smoke.mjs:2113-2114`。
- **依据**：`subscribeForCurrent` 引用恒定 ⇒ React `useSyncExternalStore` 的订阅 effect deps `[subscribe]` 不变 ⇒ **不重订阅**（本仓 harness 自述口径亦为「`subscribe` 引用变化即重订阅」，`CHANGELOG.md:58`）；注释却称「React 因 `subscribe` 返回的退订/重订而重订阅」、并称「真实 React 还按『订阅对象 vs 当前 store』判断换订」（后者与 React 语义不符）。
- **影响**：仅影响事实陈述（P-01），不影响行为；但会误导后续维护者移除 `resync` 通道（R1 F-04 的「潜伏陷阱」原话）。
- **建议**：统一改为——「F1 通道在**挂载时**按当时 store 订阅一次；因引用恒定，**换 store 不重订**（旧 store 退订函数保留至卸载）；换 store 的订阅由 effect/`resync` 通道承担；挂载时服务缺席 ⇒ 该通道保持 noop（订阅真空，见 `CHANGELOG.md:62`）」；三处措辞对齐。

### N-5 [P3] `test/smoke.mjs` 注释段落逐字重复

- **位置**：`test/smoke.mjs:2112-2114` 与 `:2115-2117`（同一段「F-03(d) 诊断量（**不作断言**，如实标注覆盖边界）…」出现 **2** 次，实测 `occurrences = 2`）。
- **依据**：机器计数（正则匹配计数 = 2）；`947d642` diff 中即可见两段连续 `+` 行。
- **影响**：可维护性（复制粘贴残留，重复占 6 行；无功能影响）。
- **建议**：删去重复段（保留一份），并在其中补一句「失败集在构造性反例下未细分（N-6c）」的口径说明（可选）。

### N-6 [P3] 措辞/取证精度三处

- **位置**：(a) `947d642` commit message（「1.4/1.7/2.4/3.2/3.3/3.4/3.6/3.7/5.3/6.2 的 line 值在两版之间逐字未变」）；(b) `lib/host-contract.mjs:82`（`≤1498: 0 ｜ ≥1499: +5`）；(c) `947d642`/`CHANGELOG.md:68`（「恰 ①b 转红」与「298/4 failed」并存）。
- **依据**：(a) 3.4/3.6 的 `line` 全串**确已变化**（其 client.js 段 +40）；成立的只是「陈旧段未变」。(b) 实测改写区 = old **L1480-1498**（3 hunk），该区内容行号映射无意义（「≤1498: 0」应写为「≤1479: 0 ｜ 1480-1498: 改写区（无锚点）｜ ≥1499: +5」）。(c) `302 − 4 = 298` ⇒ 4 条失败中至少 1 条是 **A-F9 连带**（`test/smoke.mjs:3658-3659` 用 `passed + 1`），`300/2` 可解释（①b + A-F9），但 `298/4` 另 **2 条**未在自述中归因。
- **影响**：记录面精度（与前轮 F-06 同族）；(c) 使「只对 F1 通道敏感」的量化支撑不完整。
- **建议**：(a) 改为「其**陈旧段**在两版之间逐字未变；client.js 段按 Δ 正确重基」；(b) 按上格式标注改写区；(c) 在 CHANGELOG/commit 中列出 4 条失败的完整清单（或注明其中 2 条的成因）。

### N-7 [P3] CHANGELOG（Unreleased）内静默改写 B 段条目观测值

- **位置**：`CHANGELOG.md:60`（B 段验证行）；`2bf58d2` diff（`分类桶 20+2+1+3+2 ≡ 28` → `20+2+1+2+2 ≡ 27`）；同提交对 R1 返工条目（`:73`）同款改写。
- **依据**：`535d798` 时点的台账确实为 `28 / 20+2+1+3+2`（本审查对 `535d798` 原文复算），该观测值在 B 段落地时**真实存在**；改后条目描述的是返工后的数值，但**无「口径订正」标记**。
- **影响**：记录面（历史条目被静默改写；与同仓既有做法——如「⚠️ 口径订正（R1 C-4）」显式标注——不一致）。
- **建议**：在该条目追加「（台账口径后由 R1 返工订正为 27；原观测值为 28/20+2+1+3+2，见 §R1 返工）」一行，或在文首加口径订正标记；不改回原值亦可（同属 Unreleased 批），但**必须留痕**。

### N-8 [P3] F-08② `sessionVisible` 引文补全未落到源文档

- **位置**：`docs/evidence/CLEAN-004/README.md:265`、`docs/evidence/CLEAN-004/DEFECTS.md:236`、`docs/verification/CLEAN-004-checklist.md` R-04（`:215` 区间）；对照 `CHANGELOG.md:72` 已声明「引文补全」。
- **依据**：三份源文档仍只引 `!blank || id === current`（缺 `origin !== "subagent"` 与 `!archived.has(session.id)`，宿主 `:338-340`）；`CHANGELOG.md:72` 已写全合取 ⇒ 声明与产物不一致。
- **影响**：R1 F-08 的②只落在 CHANGELOG；未来按源文档构造会话行仍会 0 行（归因指引不完整）。
- **建议**：三处源文档同步为全合取（`!session.blank || session.id === current` ∧ `session.origin !== "subagent"` ∧ `!archived.has(session.id)`）。

### N-9 [P3] F-10 的「不存在两处维护面」为过宽结论

- **位置**：`CHANGELOG.md:67`（「⇒「文档副本 ↔ 台账」两处维护面不复存在（该主张现成立）」）；反例位置 `CHANGELOG.md:60`、`:73`（仍内嵌 `20+2+1+2+2 ≡ 27`）。
- **依据**：§4.3 压力测试——探针文件头 ✅ 已零副本；CHANGELOG 本批条目仍是人工副本且**无任何机检消费**（smoke 的 ⑩b/A-F9 只扫行号引用与计数，不扫桶分解串）⇒ 改台账桶计数后这两处**静默过期**。
- **影响**：记录面（结论句强于事实；外部审阅者可能据此放弃核对）。
- **建议**：把结论限定为「**探针内**不存在文档副本 ↔ 台账的两处维护面（文件头已指向唯一事实源）」；如需彻底，可让 `--falsifiability` 输出与 CHANGELOG 的桶分解串做一次机检（成本高，不建议本轮做）。

---

## 17. 未验证 / 限制（P-01 如实标注）

1. **F-03 构造性反例的读数未独立复现**：`298/4` / `300/2` 需要临时改动 `lib/client.js`（本任务**禁止改仓库任何文件**）⇒ 本轮以「断言结构静态重算 + A-F9 连带机制」替代，见 N-6(c)。
2. **全量探针未复跑**：`node scripts/probe-nv-ux012.mjs`（含 `--boot`/隔离实例/无头 Edge）**不在本轮授权**（禁止执行会启动实例的命令）⇒ 「27 条 / PASS 23 / FAIL 0 / N-A 4」与 `report.classificationLedger.runtime/selfRef` 的**运行期实际值**为 **采信 + 源码面复算**：其中 N-1 的取值由源码面/记录顺序**推演**得出（推演链已在 §16 N-1 给出），未能以运行产物直读；`%TEMP%\clean006-*` 下的探针报告**未读取**（越权只读面）。
3. **React 语义依据**：以 React `useSyncExternalStore` 的公开契约（`subscribe` 引用变化才重订）+ 本仓 harness 自述口径（`CHANGELOG.md:58`）为据；宿主 bundle 内的 React 版本与实现未直读（同 BUG-009-R1 §限制 4 口径）。
4. **2.4 的「5 处 vs 6 处」口径**：本审查以「`legacyApi` 回退**返回点**」计数得 5 处（另有声明行 `:773` 与代际标记 `:777`）；若按「含声明/标记」计数则为 7 处 ⇒ 与自述的「5 处」一致性取决于计数定义，本报告按返回点口径记录（并建议随 N-2 一并固化口径）。
5. **未处置任何进程**（遵守「只上报不处置」；`%TEMP%` 观察到的 `clean006-*` 脚手架与 `ux012` 报告目录均为既有留痕，本审查未删改）；**未申请沙箱升级**。

---

## 18. 复现命令（本审查实跑）

```sh
# 修订解析（避开 cmd 的 ^ 转义：用参数数组 execFileSync，或加引号）
git -C <repo> show 535d798^:lib/host-contract.mjs   # 好态
git -C <repo> show 535d798:lib/host-contract.mjs    # B 段（含误重基）
git -C <repo> diff -U0 947d642^ HEAD -- lib/client.js            # 3 hunk，净 +5
git -C <repo> diff -U0 535d798 -- lib/host-contract.mjs          # 23 变更行全在 items/revisions
git -C <repo> rev-parse 535d798:lib/client.js                    # 8a7e1784…（归档 blob 锚）
node test/smoke.mjs                                              # → SMOKE DONE: 302 passed, 0 failed
node test/validate-preset.mjs                                    # → PRESET VALIDATION PASSED（schema-face: PASS，29/29）
git ls-files '*.mjs' '*.js' | while read f; do node --check "$f"; done   # → checked 23 files, failed 0
node scripts/probe-nv-ux012.mjs --falsifiability                  # → PASS（red 29 / ok 12）+ 桶分解/闸门 N-A/runtimeNote；桶和 27≡27≡27
node --input-type=module -e "await import('file:///…/scripts/probe-nv-ux012.mjs')"        # → exit 0 / 79ms / IMPORT-OK
（另两脚本同法：probe-nv-bar-geometry.mjs 74ms / isolated-preset-mount.mjs 65ms；%TEMP% 与进程数不变）
# 归档比对：docs/evidence/CLEAN-004-reruns/CLEAN-006-2bf58d2/report.json vs docs/evidence/CLEAN-004/report.json
#   → 5 条差异全为改善、零 PASS→FAIL、零新增 FAIL、id 集相同
# sha256：CRLF 重建 535d798:lib/client.js ≡ 54a4cf4a…；工作树 lib/client.js ≡ 4bda446a…；冻结三脚本 ≡ de2de511…/5afb8663…/782560e3…
```

---

*本报告为 CLEAN-006 **第 2 轮（R2）** Code Review 复审结论：`APPROVED_WITH_NOTES`（`unresolved_blockers=0`），未经 Coordinator 复核不得视为最终处置。*
