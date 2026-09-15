# CLEAN-006 代码审查报告 — **R3**（轻量终审）

- **round = R3**（前轮 = `docs/review/CLEAN-006-R2.md`，机录 `REVIEW-CLEAN-006-R2`，结论 **APPROVED_WITH_NOTES** / `unresolved_blockers=0`；P1×1 / P2×2 / P3×6）——本报告为**返工终审**：只核 R2 返工对 **N-1** 的定稿 + **陈述订正** + **契约局部重基** + **不变量**，并逐条留存前轮 findings 的处置判定。
- **审查对象（R2 返工三 commit）**：
  - **`700709e`** `CLEAN-006: R2 返工（N-1 台账运行期判据重构 + N-4 陈述订正 + N-5/N-6/N-7/N-8/N-9）`（8 文件 +139/−60）
  - **`4b70182`** `CLEAN-006: R2 返工（二）— N-1 台账运行期判据定稿（两态同数核验 + 10 例自证）`（2 文件 +102/−41）
  - **`602687c`** `CLEAN-006: R2 返工复跑报告归档（head=4b70182 / headDirty=false / FAIL 0 / tally 49-47-0-2）`（新增 2 文件 +3327）
  - 历史链：`6f65bbe` → `535d798` → `947d642`/`2bf58d2`/`4590579` → 上述三者；**HEAD = `602687c1e63160790f8dbfc2de13d19fb33c075b`**；`main` **ahead 8**（未 push，实核 `git status -sb`）。
- **工作树状态（审查时实测）**：`git status --porcelain` = ` M .governance/{evidence-log,plan-tracker,risk-log}.md`（Coordinator 治理写回）+ `?? .governance/change-triage/CLEAN-008.json` + `?? docs/review/CLEAN-006-{R1,R2}.md`（审查方产物）。**被审面（`lib/**`、`scripts/**`、`test/**`、`docs/evidence/**`、`CHANGELOG.md`、`README.md`、`package.json`）零未提交改动**（实核：`git status --porcelain -- lib scripts test docs README.md CHANGELOG.md package.json` 仅两条 `?? docs/review/**`）；工作树 `lib/client.js` 与 `HEAD` 内容**逐行等价**（LF/CRLF 差异除外，见 §5.1）。
- **审查者**：Code Reviewer Agent（**只读**；唯一写入 = 本报告）。
- **审查方式**：① `git show/diff -U0/cat-file` 逐行读三 commit 全量 diff（探针 255 行、契约 17 行、client.js 10 行、smoke 23 行、CHANGELOG 47 行、docs 6 行 + 归档 3327 行）；② **独立复算**（`node --input-type=module -e` 内存脚本 + `git show` 参数数组；**零写盘、零仓库写入**）：Δ 分段、逐行等价、逐段 Δ、items/不变量、台账例向量、自证例计数、报告 triage；③ **门禁四道独立复跑**（smoke / validate-preset / `node --check` 23 文件 / `--falsifiability`）；④ **归档三方交叉核**（`docs/evidence/**` 归档 ↔ `%TEMP%` 运行产物 ↔ 基线 `report.json`）；⑤ 只读检索 `.governance/**`、`docs/**`、`%TEMP%\clean006-*`。**未执行任何会启动实例的命令**（`--boot` / 探针全量 / 冻结探针全量均不在本轮授权内，且**未需要**——见 §4.3）；**未终止/接管任何进程**（仅只读计数：node 7 / msedge 20）；**未申请沙箱升级**。

## 结论：**APPROVED_WITH_NOTES**（`unresolved_blockers=0`）

> 硬门槛 **5/5 PASS**：**P0 = 0**；R2 的 **N-1（P1）+ N-4/N-5/N-6/N-7/N-8/N-9 逐条有处置判定**（7/7）；5 维度全覆盖且每条发现带级别；设计一致性（P-10 / 契约不变量 / BUG-005 五契约 / BUG-009 收敛语义）已完成；AI 专项 5 项全部完成。
>
> **N-1 已实质闭合**：运行期判据「记录条数」**真进最终谓词**（`countOk` ⊆ `runtime.ok` ⊆ `verdict.ledgerOk`/`report.ok`/退出码，实读 + 实跑双证），健康运行**一次即判对**（无改判路径），**防调参成立**（期望数不随实测数变动 + 两态建模被 10 例双向证伪）；**双层红向量均已复核**（单元层 `--falsifiability` = `RUNTIME-LEDGER-CHECK 10/10` **本审查独立复跑 PASS**；端到端红态报告**实物在盘**并与定稿态逐字段相互印证）。陈述订正 **10 项全部落地**（含两处不可改提交消息的**记录面显式订正**）；契约局部重基**独立重算 11/11 段全等价、零扩展**；三 commit 归档 `head=4b70182` / `headDirty=false` / **FAIL 0** / tally 49-47-0-2 / **与基线 5 条差异全为改善**。
>
> **新发现 P0×0 / P1×0 / P2×0 / P3×3**，全部为记录面/注释面精度，不阻断合并。
>
> **可用性**：**可作为 CLEAN-006 终态**（可 merge + push），附两项非阻塞前提——① 关单前把 `plan-tracker` 的 CLEAN-006 状态由「⏳ 待执行」改为与「已归口（N-2/N-3）」相符的终态；② 记录面三处 P3（探针台账块注释陈旧桶分解串 / 契约 `revisions[]` 一句成因误述 / 自证「记录前」例用 `slice(0,-1)` 代理）随下一批清扫（或显式登记为遗留项，见 §10）。

---

## 0. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 判定 |
|---|---|---|---|
| **P0 阻塞问题数** | = 0 | **0**（本轮新发现最高 P3，3 条） | **PASS** |
| R2 的 N-1（P1）与 N-4~N-9 逐条有处置判定 | = 100% | §7 表：**7/7**（N-1 已修复；N-4/N-5/N-7/N-8/N-9 已修复；N-6 部分修复含 1 条新残差） | **PASS** |
| 5 维度全覆盖 + 每条发现带级别 | = 100% | §12 五维度逐项结论齐全；§11 共 3 条发现，逐条带 P3 | **PASS** |
| 设计一致性（P-10 / 契约不变量 / BUG-005 五契约 / BUG-009 收敛语义） | 已完成 | §9 完成 | **PASS** |
| AI 代码专项 5 项 | 全部完成 | §13 五项逐一有结论 | **PASS** |

---

## 1. N-1 闭合：健康运行真值（核心）—— **成立**

### 1.1 取证源与口径对齐（**重要**：两处 `%TEMP%` 报告不是同一运行）

| 源 | `head` | `headDirty` | 时点（本地） | 性质 | 用途 |
|---|---|---|---|---|---|
| `%TEMP%\clean006-rework2-ux012\report-ux012.json`（78545 B） | `700709e` | false | 13:58:53→**13:59:17** | **700709e 定稿态**的 UX-012 全量运行（未提交工作树） | 健康运行真值（首选取证） |
| `%TEMP%\clean006-redvector\report-ux012.json`（78548 B） | `700709e` | false | 13:59:54→**14:00:22** | **端到端红向量态**（注入「删除本条自身缺席建模」后） | 端到端红向量取证（§4.2） |
| `%TEMP%\clean006-rework2\report.json`（97367 B） | `4b70182` | **false** | 14:01:19→14:02:23 | **冻结探针**复跑，= 归档 `docs/evidence/CLEAN-004-reruns/CLEAN-006-4b70182/report.json`（同长同哈希） | 零回归取证（§6） |

> **如实披露**：`%TEMP%` 中**不存在** `head=4b70182` 的 `report-ux012.json`（4b70182 于 14:01:05 提交，此前无 **UX-012 全量**运行，见 §4.3 口径）；两处现有 UX-012 报告均为 `700709e` 定稿态。**其中代码差 = 仅 N-1 定稿**（`4b70182` 只改 `scripts/probe-nv-ux012.mjs` + `CHANGELOG.md`，零改 `lib/**` ⇒ 健康真值的**产品面**取证不受影响；探针面由 §3 的 10 例自证 + §4 的红态报告覆盖）。

### 1.2 逐字段核对（`700709e` 定稿态报告，实测直读非自述）

| 必核项 | 报告实测值 | 判定 |
|---|---|---|
| `classificationLedger.absentConditional` | **0** | ✅ 与「非 `--keep` 健康运行 = 0 缺席条件记录」一致 |
| `runtime.ok` | **true** | ✅ |
| `runtime.countOk` | **true**，`recordedCount=27` ≡ `expectedRecords=27` ≡ `declaredTotal=27` | ✅ **两态同数核验的「记录后」态成立** |
| `runtime.offLedger` | **`[]`** | ✅ |
| `runtime.naNotDeclared` | **`[]`**（`naIds` = A7b/A1b/A6/A2b，与 `excludedFromNa` 逐项一致） | ✅ |
| `runtime.crashRecorded` | **false**（`UX012-CRASH` 未记录 ⇒ 期望数不加 1） | ✅ |
| `selfRef.ok` | **true**；`countBeforeThisAssertion=26` ≡ `expectedBeforeThisAssertion=26`；`countAfterThisAssertion=27` ≡ `expectedAfterThisAssertion=27` | ✅ **「记录前 / 记录后」两态同数**（N-1 病根的两侧都真核过） |
| `verdict.reclassified` | **false**（`note` 明写「本条延后至 Z2 后记录 ⇒ 记录后即判，无改判路径」） | ✅ |
| `verdict.ledgerOk` / `selfRefOk` | **true / true** | ✅ |
| `report.ok` / `tally` | **true** / `{27, 23, 0, 4}` | ✅ FAIL 0 |
| `report.assertions` 中 `UX012-CLASSIFICATION-LEDGER` | `status='PASS'`，**全报告 `reclassifiedByRuntimeCheck` 出现次数 = 0** | ✅ **PASS 且无改判标记** |
| `ledgerAssertion` | `{id, recordedAfter: 'UX012-Z2-isolation-cleanup', runtimeRecordedAt: 'post-record'}` | ✅ 时序留痕与代码一致 |
| `ledgerAssertionDeferredToPostZ2` | **存在**（= true） | ✅ 中间态字段存在（见 §1.3 说明） |

**判定**：**「无改判路径」主张成立**——本批次**不存在**旧实现那种「先记 FAIL / 再回填改判 PASS」的通道：`reclassified` 由字面常量 `false` 给出且**代码中已无任何写回 `rec.status` 的分支**（实读 `scripts/probe-nv-ux012.mjs:1711-1715`），改判标记在运行产物中**零命中**。

### 1.3 中间态字段的如实说明（非缺陷，但需读者知情）

定稿报告同时含 `ledgerBodyOk` / `bodyPreRunCount=24` / `ledgerAssertionDeferredToPostZ2=true` 与已回填的 `runtime` / `runtimeOk` / `selfRef` / `verdict`。§7 已定位其来源：`700709e` 先落地「延后 + 回填改判」形态，`4b70182` 再定稿为「记录后即判」；`%TEMP%` 现存两报告均取自 `700709e`，故带中间态字段。**字段本身不构成失实**（`ledgerAssertionDeferredToPostZ2=true` 在 `700709e` 语义下为真；`runtimeOk=true` 两版语义一致），但**定稿态的完整字段集（`runtimeSelfTest.pass` + 10 例 + `verdict` 无改判）在 `4b70182` 无 UX-012 报告可比** ⇒ 记为**残余不确定性**（低：谓词链已由本审查实读 + `--falsifiability` 真跑证成）。

---

## 2. N-1 定稿判据的诚实性（防「调参通过」）—— **成立**

### 2.1 建模是否「只是把期望数调成能过」

**结论：不是。** 三条独立依据（全部实读/实跑，不采信自述）：

1. **`countOk` 与谓词链的真接线（实读 `scripts/probe-nv-ux012.mjs`）**：
   - `:457` `const countOk = records.length === expectedRecords`；`:459` `ok: offLedger.length === 0 && naNotDeclared.length === 0 && countOk` ⇒ **`countOk` 是 `ok` 的第三个合取项**（旧实现无此项）。
   - `:1713` `const ledgerOkFinal = ledgerBodyPredicate() && ledRunAfter.ok === true` ⇒ 终态含 `countOk`。
   - `:1694` `const ledgerPredicate = () => ledgerBodyPredicate() && ledRunBeforeSelf.ok === true` ⇒ **记录时谓词**同样含 `countOk`（记录前态）。
   - `:1715` `if (ledgerOkFinal !== true) code = 1`；`:1721` `report.ok = tally.fail === 0 && code === 0 && report.classificationLedger.runtimeOk === true`。
   ⇒ **「记录数不匹配 ⇒ 必红」在两条路径（断言状态 / `report.ok` / 退出码）上都成立**——**不再静默**。
2. **期望数**不**随实测数变动**：`expectedRecords = declaredTotal − absentConditional + extraRecorded`（`:455`），三项均由台账定义与实际记录**投影**而来；`absentConditional` 的唯一来源是 `opts.keep`（`:1682` `const ledZ2Absent = opts.keep === true ? 1 : 0`）与「本条是否已入册」的**常量 1**（`:1685`）——**没有任何一种写法让期望数等于实测数的函数**（若如此则 `countOk` 恒真）。反证：把 `absentConditional` 强行取 1 而记录齐全 ⇒ 期望 26 / 实测 27 ⇒ **`countMismatch`**（自证例⑥，实测输出 `记录数=27/期望=26`）。
3. **判据不能靠「随便声明缺席」通过**：声明缺席是**双向可判**的——① 声明缺席但实际齐全 ⇒ 红（例⑥）；② 记录前**未声明**缺席 ⇒ 期望多 1 ⇒ 红（例⑨）。二者合起来意味着：**任何与真实记录集不符的缺席建模都会被拦**，而不是「调成能过」。

### 2.2 例 ⑥ / 例 ⑨ 是否真能拦住「调参」（独立复算 + 实跑双证）

| 例 | 构造（实读 `:508-511` / `:523-525`） | 独立复算 | 实跑输出（本审查） |
|---|---|---|---|
| **⑥ 声明缺席但实际齐全** | `healthy`（27 条）+ `{absentConditional: 1}` | 期望 `27−1+0=26`，实测 27 ⇒ `countMismatch` | `OK 运行期注入 [条件记录建模红向量（声明缺席 1 但实际齐全 ⇒ 不匹配）] … 记录数=27/期望=26` ✅ 真红 |
| **⑨ 自指记录前但未声明缺席** | `healthy.slice(0,-1)`（26 条）+ `{absentConditional: 0}` | 期望 `27−0+0=27`，实测 26 ⇒ `countMismatch` | `OK 运行期注入 [本条记录前但未声明缺席（期望数多 1 ⇒ 必红）] … 记录数=26/期望=27` ✅ 真红 |

**「真红例」的判据强度（独立评估，如实标注边界）**：单元层红例的命中判据是 `got.countOk === false`（`:510` / `:525`），**非**「`assertionLedgerRuntimeCheck` 的总体 `ok` 翻红」——因为 `offLedger.length > 0` 等也会让总体 `ok=false`，只判总体会掩盖成因。**用 `countOk` 单点判据 ⇒ 例 ⑥/⑨ 的红**只能由记录数不匹配解释**（两例的 id 集均完整在册、N-A 集合法），故**是针对性真红，不是连带红**。✅ 审定：**调参无法通过**。

### 2.3 注释中错误的「声明总数 − 1」是否已按事实改写

| 位置 | 现值（实读） | 判定 |
|---|---|---|
| `scripts/probe-nv-ux012.mjs:447-449`（判据③注释） | 「**健康运行期望记录数 = 声明总数**；发生未捕获异常时该行额外入册 ⇒ 期望数 +1（两态都可判）。**旧注释写「声明总数 −1」是错的**（`UX012-CRASH` 不在 `slots` 里）」 | ✅ 已按 `declaredTotal + extraRecorded`（`:455` / 定稿 `declaredTotal − absentConditional + extraRecorded`）事实改写，且**显式留档错值** |
| 同文件 `:453-454`（统一缺席口径注释） | 「期望数 = 声明数 − 缺席的条件记录数 ＋ 已记录的异常路径记录数」+「旧实现为本条单列一套建模 ⇒ 与缺席建模**重复扣减** ⇒ 期望数偏小 1」 | ✅ 与代码一致 |
| `:512-516`（自指两态注释） | 「记录前…MUST 用 `extraSelfExpectation=0`…记录后…`extraSelfExpectation=1`」 | ⚠️ **过时术语**：定稿已改为 `absentConditional` 建模，而 `extraSelfExpectation` 仅出现于注释（`:475`/`:476`/`:513`/`:514` 共 **4** 处，**实扫**），**不是**任何实参/形参标识符（实参一律为 `{ absentConditional: … }`）⇒ 属**注释术语残留**，不误导结论（同段下文与实参一致），并入 N-3（P3，见 §11）。 |

---

## 3. 双层红向量复核 — **单元层**

**独立复跑（本审查真跑 `node scripts/probe-nv-ux012.mjs --falsifiability`）**：

```
RUNTIME-LEDGER-CHECK PASS：10/10（基线必绿 ∧ 记录数不匹配 / 越册 id / 未登记 N-A 三类必红 ∧ 条件记录缺席建模双向可判）
桶和 27 ≡ 台账条数 27 ≡ 声明总数 27；id 未归桶=0 桶内未知 id=0 闸门 N-A 归属合法=true；源码对账（28 id / 源控制 32 行 1dc74c09c604）与台账一致=true
注入 [8 例]：基线 / 桶和错 / 桶和与总数同步调小 / id 未归桶 / 桶内含未知 id / N-A 闸门成员被点进读数桶 / 源控制哈希不符 / 源控制接线处数不符 ⇒ 8/8
FALSIFIABILITY PASS：向量 red=29 ok=12（每条 MUST ≥1 red 且 red 全 false、≥1 ok 且 ok 全 true）
exit=0
```

### 3.1 10 例定义是否含**真红例**（逐例分类，实读 `:489-526` + 实跑读数）

| # | 例名 | 类型 | 期望命中 | 实测 | 覆盖的缺陷面 |
|---|---|---|---|---|---|
| ① | 基线（健康记录集 = 记录后形态） | 绿 | `okTrue` | ✅ 27/27 | 防空转/防恒红 |
| ② | 记录数不匹配（少 1 条） | **真红** | `countMismatch` | ✅ 26/27 | **数量不匹配（N-1 核心）** |
| ③ | 记录数不匹配（多 1 条越册 id） | **真红** | `countMismatch` + `offLedger` | ✅ 28/27 | 数量 + **越册** |
| ④ | 越册 id（条数相同） | **真红** | `offLedger` | ✅ 27/27 | **越册**（独立于数量） |
| ⑤ | 未登记的 N-A | **真红** | `naNotDeclared` | ✅ 28/27（另含 countMismatch） | **未登记 N-A** |
| ⑥ | 条件记录缺席建模（`--keep`） | 绿 | `okTrue` | ✅ 26/26 | **条件缺席建模绿例** |
| ⑦ | 条件记录建模红向量（声明缺席但齐全） | **真红** | `countMismatch` | ✅ 27/26 | **调参反例** |
| ⑧ | 本条记录前（26 + absent=1） | 绿 | `okTrue` | ✅ 26/26 | **自指记录前（N-1 病根绿侧）** |
| ⑨ | 本条记录前但未声明缺席 | **真红** | `countMismatch` | ✅ 26/27 | **自指未声明缺席（N-1 病根红侧）** |
| ⑩ | 本条记录后（27 + absent=0） | 绿 | `okTrue` | ✅ 27/27 | 记录后态 |

**判定**：任务要求的五类**全部在册且为真红**——数量不匹配（②③）、越册（③④）、未登记 N-A（⑤）、条件缺席建模红例（⑦）、自指未声明缺席红例（⑨）；另有 4 例绿例（①⑥⑧⑩）保证**非恒红**。**10/10 通过**（含例⑤附带 `countMismatch` 属**真实**二次成因，非误报）。

### 3.2 边界（如实标注，P3）

例 ⑧/⑨ 的「记录前」集用 `healthy.slice(0, -1)` 代理（`:518`），而真实记录前集是 `healthy` **去掉 ledger 那一条**——两者**条数相同但 id 集不同**；当前台账未知 id 集为空 ⇒ **无实际影响**。若将来 id 集构造变化，该代理可能给出偏乐观读数。归入 N-3（P3）。

---

## 4. 双层红向量复核 — **端到端层**

### 4.1 红态报告**实物在盘**（本审查直读，非采信自述）

```
%TEMP%\clean006-redvector\report-ux012.json   78548 B
  head=700709ecbb778391f88b97d6b461505f5d39f2ef  headDirty=false
  startedAt=13:59:54 → finishedAt=14:00:22（真实全量运行窗口 ≈28 s 断言段；隔离实例 + 无头 Edge）
  ok=False   tally={total:27, pass:22, fail:1, na:4}
  FAIL 集 = 恰 { UX012-CLASSIFICATION-LEDGER }
  verdict={ledgerOk:true, selfRefOk:false, reclassified:false}
  selfRef.expectedBeforeThisAssertion=27（对照定稿态 = 26）  ⇒ 记录数=26/期望=27 ⇒ countOk=false
  runtimeSelfTest.pass=true（10/10 —— 自证本身不受注入影响，仍是真自证）
```

对照同代码态、无注入的健康运行（§1.2）：`selfRef.ok=true` ∧ `FAIL 0` ∧ `ok=true`。

### 4.2 红向量主张的结构合理性判定 — **成立（并抓到可见红灯，非静默）**

| 主张（`4b70182` commit message / `CHANGELOG.md:199`） | 本审查独立核验 | 判定 |
|---|---|---|
| 删除「本条自身缺席建模」⇒ `UX012-CLASSIFICATION-LEDGER` **FAIL** | 红态报告 `FAIL 集 = {UX012-CLASSIFICATION-LEDGER}`；机制：`ledRunBeforeSelf` 的 `absent` 由 `ledZ2Absent+1` 退化为 `ledZ2Absent` ⇒ 记录前 26 ≠ 27 ⇒ `countOk=false` | ✅ **成立**（这是 `700709e` 记录时谓词含 `countOk` 的直接后果） |
| ⇒ `tally 22/27` | 红态 `tally = {27, 22, 1, 4}`（`pass=22` / `total=27`） | ✅ 成立 |
| ⇒ `PROBE UX-012 FAILED` | 红态 `report.ok=false` ⇒ 尾部输出 `PROBE UX-012 FAILED`（`ok = tally.fail===0 && code===0 && runtimeOk`） | ✅ 成立 |
| **改动前该缺陷静默** | 前态（`2bf58d2`）谓词 = `ledRep.ok ∧ ledSelf.pass` ∧ `offLedger` 空 ∧ `naNotDeclared` 空（`ledgerPredicate` **不含 countOk**）；`selfRef.ok` 只作交叉核对**不进谓词/不进 `report.ok`**（该版 `report.ok = tally.fail===0 && code===0`）⇒ **改判前的记录数失配零红灯** | ✅ 主张成立（**且本审查独立复核了病根代码**：`git show 2bf58d2:scripts/probe-nv-ux012.mjs` 的 `ledgerPredicate` 与 `report.ok` 均不含 count） |
| 「探针字节还原」 | 工作树与 `HEAD` 的 `scripts/**` **零 diff**（`git status --porcelain -- scripts` 空）；`lib/client.js` 内容与 `HEAD` 逐行等价（§5.1） | ✅ 还原成立 |

**判据强度的如实标注（本审查新增，P3，非阻断）**：红态 `verdict.ledgerOk=true` —— 终态台账判定只取 **记录后** 态（`ledRunAfter`），故「记录前」态的失配**不进入终态判定**；它靠**记录时谓词**（`ledgerPredicate()` → 断言 FAIL ⇒ 退出码 1）暴露。**两种半态的不对称**：目标态用记录后 ⇒ 记录前**多**算（记为 0 而实为 1）会红；记录前**少**算（记为 1 而实为 0，即 `--keep` 下的正常形态）**不会**红。⇒ 该不对称**对 R2 有意保留**（`--keep` 下「本条按已入册建模」是刻意口径，删除它会让 `--keep` 健康运行恒红），但**严格说「两态同数核验」只有一态进入终态判定**；另一态是断言谓词 + `selfRef` 交叉核对。**影响**：无（红态已实证可见红灯；且 `selfRef.ok` 提供了第二路可见性）。**记录级别：P3（措辞）**——「两态…均 MUST 为 true」在 `selfRef.note` 中为真，但「两态都进最终判定」若被读者这样理解则不准确；建议在注释/记录面写明「记录前 ⇐ 记录时谓词（必红）；记录后 ⇐ 终态判定（`verdict.ledgerOk`）」。

### 4.3 端到端复跑要求（口径表态，与 CLEAN-007 R2 / BUG-010 R1 一致）

**本轮 REQUIRED = 否（不要求复跑）**，理由三条：

1. **红态实物已在盘且可独立读**（§4.1）：不需重现注入即可核验「注入 ⇒ 恰一条 FAIL + tally 22/27 + `ok=false`」的全链条；且该报告 `head` 与**同代码态**的健康运行一致（`700709e`）⇒ 红/绿两读数为**同一代码的对照对**，无跨版本混淆。
2. **红态注入点在 `700709e` 已存在**（谓词含 `countOk`），本次 |Δ| = 1（`ledRunBeforeSelf` 的 `absent` 参数）⇒ 结论对 `4b70182` 定稿**可迁移**：`4b70182` 相对 `700709e` 把该参数改为 `ledZ2Absent+1`；反事实（改回 `ledZ2Absent`）即在 `700709e` 已实测的红态。**反向亦封闭**：`4b70182` 的健康侧由 §1.2（`absentConditional=0` / 26≡26 / 27≡27）覆盖。
3. **授权边界**：任务明示「探针 `--boot` 与冻结探针全量运行不在本轮授权内」；且复跑会**启动实例 + 无头浏览器**（属「会启动实例的命令」明令禁止）。在证据已实物在盘的前提下，**不构成必须升级授权的理由**。

**与 CLEAN-007 R2 / BUG-010 R1 口径的一致性**：本仓库既有口径为「**已归档的红/绿证据可被独立直读 ⇒ 不必强制复跑；仅当证据缺失或与自述冲突时要求补做**」——本轮满足前者（且**比自述更强**：本审查直读了红态 JSON，而非依赖 commit message）。**唯一保留**：定稿态（`4b70182`）**无 UX-012 全量报告**（§1.3）；若 Coordinator 要求「终态 run 一律有 UX-012 报告存档」，则应在 **CLEAN-005/008 的同批**（或下一次需要全量运行的批次）顺带补一次，而**不应**为纯记录目的在本任务内启动实例。

---

## 5. 陈述订正（10 项）复核 — **全部落地**

| # | 订正项 | 现值（实读） | 与代码事实一致性 | 判定 |
|---|---|---|---|---|
| ① | `lib/client.js` F1 注释删「React 因 `subscribe` 返回的退订/重订而重订阅」 | `:1479-1485`：「**如实陈述（R2 N-4 订正）**：React `useSyncExternalStore` 的订阅 effect 以 `[subscribe]` 为依赖 ⇒ **本通道只在挂载时**按当时 store 订阅一次；引用恒定 ⇒ **换 store 时本通道不重订**（挂载时的退订函数保留至卸载）；挂载时服务缺席则保持 noop；**换 store 后的订阅由 effect 内 `resync` 通道承担**——两者**不可互相替代**」 | ✅ 旧陈述**已删**；新陈述与 React 语义（effect deps = `[subscribe]`）及本仓 harness 口径一致 | **已修复** |
| ② | `CHANGELOG.md` B 段约束②同款订正 | `:55` 末段「**机制订正（R2 N-4）**：该包装的引用恒定 ⇒ React 的订阅 effect 依赖 `[subscribe]` 不变 ⇒ **本通道换 store 时不重订**…；**换 store 后的订阅由 effect 内 `resync()` 通道承担**」 | ✅ | **已修复** |
| ③ | `test/smoke.mjs` F-03(d) 注释反向陈述订正 + 补「挂载后不换订 ⇒ 该面在 mock 下未走到」 | `:2111-2120`：① 「本 harness 的换订判据 = **`subscribe` 引用变化**（`prev.sub !== subscribe`），与真实 React 一致…两者**都不含**「订阅对象 vs 当前 store」这一判据——**原注释的反向陈述有误，已按事实改写**」；② 「因 `subscribeForCurrent` 引用恒定 ⇒ **挂载后不换订** ⇒「渲染期 live 订阅收到 notify」这一面在本 mock 场景下**未被走到**（`reactCallbackForwarded=0` 即其表现）」 | ✅ 「真实 React 还按『订阅对象 vs 当前 store』判断换订」全仓**零命中**（实扫）；新注释与 harness 实现 `prev.sub !== subscribe` 逐字对齐 | **已修复** |
| ④ | 两处**不可改**提交消息（`700709e` / `2bf58d2`）的失实已在记录面显式标注 | `CHANGELOG.md:74`：「**⚠️ 失实自述订正（R2 N-1）**：本条此前称「`report.classificationLedger.runtime.ok=true ∧ selfRef.ok=true`」——该自述**与当时的代码事实矛盾**…；同一失实自述亦出现在 commit **`2bf58d2`** 的提交消息中（**提交消息不可改，以本条记录面订正**）」 | ✅ 明标为**误**并给出真值（旧实现结构性 `runtime.ok=false` + 静默）；`700709e` 自身的同类失实亦在 `CHANGELOG.md:197-199` 以「机制订正 + 最终形态」两段留痕 | **已修复（记录面）** |
| ⑤ | `CHANGELOG` 桶分解串**保留观测值 + 加口径订正标记**（非静默改写） | `:60`：「分类桶 `20+2+1+2+2 ≡ 27` + 注入式反例 8/8（**口径订正（R2 N-7）**：本行原观测值为 `20+2+1+3+2 ≡ 28`；`UX012-CRASH` 于 R1 返工移入 `notRegisteredIds` 后台账条数 28 → 27——**原值保留于本注，未静默改写**）」 | ✅ 原观测值**在注内可查**；`CHANGELOG.md:201` 另有变更留痕条目 | **已修复** |
| ⑥ | F-10 结论收窄为「**探针内**单一事实源；`CHANGELOG` 面为叙述性引用、不参与机检」 | `CHANGELOG.md:67`：「⇒ **探针内**「文档副本 ↔ 台账」两处维护面不复存在（该主张现成立）。**结论收窄（R2 N-9）**：`CHANGELOG` 本批条目仍**叙述性引用**桶分解串（`20+2+1+2+2 ≡ 27`）且**不参与机检**（smoke 的 A-F9/COMPAT-015 只扫断言计数与行号引用）⇒ 该引用**不受机检看护**，属叙述面而非第二事实源」 | ✅ **收窄成立**（独立核：`COMPAT-014 A-F9` 断言对象 = README 计数声明 ≡ 实测数；`COMPAT-015 F3` 断言对象 = `<item> L<n>` 行号引用；**均不扫桶分解串**——实跑中 `A-F9` 末条输出「声明 302 ≡ 实测 302」证实其判据面） | **已修复** |
| ⑦ | N-5 注释段去重（机器计数 2 → 1） | `test/smoke.mjs`：`诊断量（**不作断言` 出现 **1** 次；`本 harness 的换订判据` **1** 次 | ✅ 逐字重复段已删 | **已修复** |
| ⑧ | N-8 `sessionVisible` 全合取引文落到三份源文档 | `docs/evidence/CLEAN-004/README.md:265`、`DEFECTS.md:236`、`docs/verification/CLEAN-004-checklist.md` R-04 —— 三处均含 `!session.blank \|\| session.id === current` ∧ `session.origin !== "subagent"` ∧ `!archived.has(session.id)`（宿主 `L338-340`）+「**R2 N-8 与 `CHANGELOG` 对齐**」标注 | ✅ 三份 diff 均为该单行替换（+1/−1） | **已修复** |
| ⑨ | N-6(b) 契约 Δ 分段改为「改写区」显式 | `lib/host-contract.mjs` `revisions[]`：「Δ 分段（old = `2bf58d2` 坐标）：`≤1478: 0 ｜ 1479-1482: **改写区**（4 行 → 6 行；该区为注释块，无锚点条目落于其中 ⇒ 区间内不谈 Δ）｜ ≥1483: **+2**」 | ✅ 与本审查独立重算**逐点一致**（§5.2） | **已修复** |
| ⑩ | N-6(c) 失败集细分（`298/4` / `300/2` 归因） | `CHANGELOG.md:68`：「**失败集细分（R2 N-6c）**：`298/4` 中除 ①b 外，另 2 条为改动的连带项、1 条为本轮新增的**计数类**断言（末条 `COMPAT-014 A-F9`…）；`300/2` = ①b + A-F9」+ `test/smoke.mjs:2118-2120` 同口径 | ✅ 与 `A-F9` 的 `passed + 1` 机制自洽（`302 − 4 = 298` 中的 4 条＝①b + A-F9 + 2 条连带） | **已修复（措辞面）** |

---

## 6. 契约局部重基 + item 2.10 端点订正 — **独立重算**

### 6.1 Δ 分段与「改写区」判定（独立重算）

```
old = 2bf58d2:lib/client.js（5273 行 / LF）  new = HEAD:lib/client.js（5275 行 / LF）
git diff -U0 2bf58d2 HEAD -- lib/client.js  ⇒ 恰 1 个 hunk：@@ -1479,4 +1479,6 @@（4 → 6，净 +2）
独立逐行等价（内存脚本，逐行比较 old[L] ≡ new[L+Δ(L)]）：
  L1-1478    d=0   比较 1478 行  neq=0
  1479-1482  改写区（old 4 行 → new 6 行）
  L1483-5274 d=+2  比较 3792 行  neq=0
独立重算前缀/后缀：最长公共前缀 = 1478 行；最长公共后缀 = 3791 行（= 5274 − 1483 + 1 + 修正尾行）
⇒ 与契约断言「1478 + 3791 ⇒ 单区间 4 行 → 6 行」逐点一致；总 Δ ≡ 文件行数差 +2
```

**判定**：契约 `revisions[]` 的 `≤1478: 0 ｜ 1479-1482: 改写区 ｜ ≥1483: +2` 与本审查独立重算**逐点吻合**。**行数口径说明**：契约写「5273 → 5275」与本审查的「split 元素 5274 → 5276」差 1，原因是**末行空元素**计法；按内容行（trailing newline 不计行）即为 **5273 → 5275 (+2)** ⇒ **契约口径正确，非失实**（零级差异，见 §11 说明）。

### 6.2 8 项 / 11 段逐段 Δ（独立重算，**逐段各自算 Δ**）

| item | 旧 `line`（`2bf58d2`） | 新 `line`（HEAD） | 逐段 Δ 独立复算 | 判定 |
|---|---|---|---|---|
| 2.10 | `L1449-L1553` | `L1449-1555` | 起点 1449 ≤1478 ⇒ Δ0（1449≡1449）；终点 1553 ≥1483 ⇒ Δ+2（1555） | ✅ **跨改写区条目，起点/终点 Δ 不同，写法正确** |
| 2.11 | `L1581-L1608` | `L1583-L1610` | +2 / +2 | ✅ |
| 2.12 | `L5165-L5172` | `L5167-L5174` | +2 / +2 | ✅ |
| 2.13 | `L5202-L5234` | `L5204-L5236` | +2 / +2 | ✅ |
| 2.3 | `L5135-5137` | `L5137-L5139` | +2 / +2 | ✅ |
| 3.4 | `L925-938 / L4786 / L4929` | `L925-938 / L4788 / L4931` | 首段 Δ0（925-938 未变）/ +2 / +2 | ✅ **多段条目按段算 Δ** |
| 3.6 | `L1164-1188 / L3926` | `L1164-1188 / L3928` | 首段 Δ0 / +2 | ✅ |
| 3.8 | `L3023-L3033` | `L3025-L3035` | +2 / +2 | ✅ |

**独立计数**：`items[]` 变更中**恰 8 项 line-only 变更**、其余 41 项**整行逐字节未变**（非 line 字段差异 **0**）；数值端点 **19 个**（4 个范围段 ×2 + 11 个单点）**neq = 0**。**11 段 = 2.3(1) + 2.10(1) + 2.11(1) + 2.12(1) + 2.13(1) + 3.4(3) + 3.6(2) + 3.8(1)** ✅ 与自述「8 项 / 11 段」一致。

**`revisions[]` 留痕质量（实读）**：R2 条注记含**跨改写区专项说明**——「`2.10`（`L1449-L1553`→`L1449-1555`——**跨改写区，起止 Δ 不同**：起点 1449 < 1479 ⇒ Δ0，终点 1553 > 1482 ⇒ Δ+2；此类条目 MUST 逐段各自算 Δ，不得整串套用）」+ 双取证 + 未变清单 + `revisions[]` 10 → 11 ⇒ **F-01（跨文件误重基）教训已泛化为可复用口径（P-05）**，判定：**留痕充分**。

### 6.3 item 2.10 端点订正 + 「双 L」归一：**判定与级别**

**独立实读（旧坐标文件 `2bf58d2:lib/client.js`）**：

```
L1449  "    function makeSessionsHookReactive(ctx) {"      ← 范围起点（函数声明行本体）
  …（括号深度扫描）…
L1549  "      useSessionsSel.refresh = () => {"            ← 内层 refresh 起点（深度 1→2）
L1551  "      }"                                           ← 内层 refresh 收尾（深度 2→1）
L1553  "    }"                                             ← 函数 makeSessionsHookReactive 收尾（深度 1→0）✅
新坐标：L1555 = "    }"（同一行，Δ+2）
```

**判定**：

1. **「双 L」（混式）写法归一** `L1449-L1553` → `L1449-1555`：**混式（首段单 L / 末段 `L` 前缀）** 在 `lib/host-contract.mjs` 中**仅此一处**（本审查实扫 `L\d+-L\d+` 全量命中 22 处，**其余 21 处均为同形 `L<n>-<n>`**：`L5082-L5084`、`L5095-L5097`、`L1451-L1452`、`L1469-L1500`、`L1581-L1608`、`L1583-L1610`、`L5165-L5172`、`L5167-L5174`、`L5202-L5234`、`L5204-L5236`、`L5137-L5139`、`L3023-L3033`、`L3025-L3035`、`L4804-L4806` 等）；`COMPAT-012 N2 F5d` 的范围正则（`^L\d+-L?\d+$`）**接受两种写法** ⇒ 归一**不改变机检结果**，仅**同形可读性**。**级别 P3（可接受）**——属记录面一致性，非必要但**不越界**（同一 `line` 字段的表述规范化，不引入新事实）。
2. **端点「历史残差」的成因陈述**：契约 `revisions[]` 写「修正 `2.10` 终点在本批前即已偏移 2 行的历史残差（终点由**函数内 `refresh` 收尾 `}`** 校正为**函数收尾 `    }`**）」。**本审查实读证明该句成因不成立**：旧 L1553 的**实际内容**就是 `makeSessionsHookReactive` 的**函数收尾 `}`**（深度 1→0），**内层 `refresh` 的收尾在 L1551**（深度 2→1）。⇒ 旧端点**并未落在「函数内 `refresh` 收尾」**，而是**同一函数尾行**；其值过期**纯粹由本批 +2 引起**（旧 L1553 属 Δ+2 区）。**级别 P3（记录面成因误述）**，见 §11 N-1。**可接受性**：新值 `L1449-1555` **事实正确**（起点 = 函数声明行本体、终点 = 函数收尾行，跨度 107 行含全部 `subscribeForCurrent`/双通道注释），且与 Δ 分段一致 ⇒ **端点订正这一动作是必要的（P-01 口径：仅更新为真值）**；被判 P3 的只是**其附属的成因叙述**。
3. **是否属「范围外改动」（C-04）**：**不属**。理由：(a) 同一 `line` 字段在同一批重基的**必要更新**（不改则该条陈旧 −2）；(b) 未触碰任何非该条范围的面（`kind`/`necessity`/`symbol`/`file`/`face` 零变更，实核）；(c) 归一化与取真值为**同一字段内的等价表述**，无新增维护面。⇒ **裁定：必要的事实订正（P-01）**；附带成因叙述记 P3。

### 6.4 零扩展（不变量，独立实测）

| 项 | 独立实测（`git diff -U0 2bf58d2 HEAD -- lib/host-contract.mjs` = **9 insertions / 8 deletions / 17 changed lines**） | 判定 |
|---|---|---|
| `items[]` 计数 | **49 ↔ 49** | ✅ |
| item id 序列 | 逐项相同（脚本比对 `old.items[i].item === new.items[i].item` 全真） | ✅ |
| 变更行分类 | 17 = **8 条 item 行** + **1 条 revision 行**；`regionLiterals` / `presetRowConfig` / `kindEnum` / `faces` / `ctxGetSemantics` / `hostSurface` **零变更行** | ✅ |
| 非 `line` 字段 | 8 条变更项**仅 `line` 值不同**（`face`/`item`/`kind`/`symbol`/`file`/`necessity` 与其余文本逐字节相同）；其余 41 项**整行未变** | ✅ |
| item 5.3 / 5.4 / 5.6 | `L52 / L56 / L81`、`L77-81`、`L16` **未变** | ✅ |
| `revisions[]` | **10 → 11**（实计 `{ task: '` 出现 11 次；新增 `CLEAN-006（R2 返工）`） | ✅ |
| item 2.10 形态 | `L1449-1555`（**混式「双 L」** `L1449-L1553` 在本仓仅此一处、仅在 `revisions[]` 的**旧值记载**中保留（`:83`），当前 `line` 已归一为同形） | ✅ |
| `kindEnum` / `faces` | 30 值枚举（含 `preset-row-config`）与 6 面定义**零变更** | ✅ |
| 冻结三脚本 sha256 | `de2de511…5b65` / `5afb8663…159a` / `782560e3…da23` —— 与锚值**逐字一致**（本审查重算） | ✅ 未变 |

---

## 7. 门禁（独立复跑）

| 门禁 | 自述 | 独立复跑（本审查真跑） | 判定 |
|---|---|---|---|
| `node test/smoke.mjs` | 302 / 0 | **`SMOKE DONE: 302 passed, 0 failed`**（exit 0）；末条 `COMPAT-014 A-F9 README smoke 断言计数同步：声明 302 ≡ 实测 302` **绿**；`COMPAT-015 F3 行号引用对账…0 处陈旧副本` **绿**（含 631 行 smoke 注释 + CHANGELOG/README/probe 注释各面） | ✅ |
| `node test/validate-preset.mjs` | PASSED | **`PRESET VALIDATION PASSED（schema-face: PASS）`**（exit 0；`skills indexed: 29/29`） | ✅ |
| `node --check` | 23 文件 / 0 失败 | `git ls-files '*.mjs' '*.js'` 全量逐个执行 ⇒ **checked 23 files, failed 0** | ✅ |
| `--falsifiability` | PASS（10/10 + 桶和 + 8/8） | **exit 0**；`RUNTIME-LEDGER-CHECK PASS：10/10`、`桶和 27 ≡ 台账条数 27 ≡ 声明总数 27`、`CLASSIFICATION-LEDGER PASS`（注入 **8/8**）、`FALSIFIABILITY PASS：red=29 ok=12`、源码对账 `32 行 1dc74c09c604` 一致=true | ✅ |

**任务特别要求的两条**：`COMPAT-012 N2 F5d`（范围正则接受两种「L」写法 ⇒ 重基后仍绿）与 `COMPAT-015 F3`（行号引用对账 ⇒ 归一 + 重基后仍绿）——**均在本次 smoke 全绿输出中出现且无 FAIL**。✅

---

## 8. 冻结探针归档复核（`docs/evidence/CLEAN-004-reruns/CLEAN-006-4b70182/`）

| 检查面 | 独立核验 | 判定 |
|---|---|---|
| `report.json` 顶层 `head` | **`4b70182d75731b724c8e7f828266c88ac717a078`** ≡ 被审 commit | ✅ |
| `headDirty` | **false** | ✅ |
| `FAIL` | **0**（`assertions` 中 `status='FAIL'` 计数 = 0；`ok=false` 系 N-A 非 PASS 的设计口径，README 已如实说明） | ✅ |
| `tally` | `{total:49, pass:47, fail:0, na:2}`；N-A 两条 = `B5-found-sessions-area` / `D6-session-switch-close` | ✅ |
| 与基线差异（基线 = `docs/evidence/CLEAN-004/report.json`，`head=21b100ce`、`tally {49,42,4,3}`） | **差异 5 条，全部为改善**：`D2-esc-bind-yield` FAIL→PASS、`C3b-binding-convergence` FAIL→PASS、`C9-width-memory` FAIL→PASS、`C10-flip-side` FAIL→PASS、`C11-flip-back` N-A→PASS；**零 PASS→FAIL、零新增 FAIL、id 集完全相同**（49 条逐项比对） | ✅ |
| README 的 `lib/client.js` 双锚 | blob **`08c03f243c8e121929c89aca60cf51ab3d7f1e07`** ≡ `git rev-parse HEAD:lib/client.js`（实核）；文件 sha256 **`7ecc3e39be919065864563318c0374d983a1054fa74bc43ee992735ae1c541ae`** ≡ 本审查对工作树 `lib/client.js` 重算值（**同字节数 381583 / 5275 行 CRLF**） | ✅ 双锚一致 |
| README 的报告 sha256 | **`8320c96dd9d14e9b16250ac1af4f7ffaade4a88af4a549e4c0c3321487dbf104`**（97367 B）≡ 本审查重算 | ✅ |
| 报告溯源 | `%TEMP%\clean006-rework2\report.json`（97367 B，14:02:23）与归档 **同长同哈希** ⇒ 归档 = 该次运行的**原件副本**，非事后重写 | ✅ |
| 隔离 / 真实环境 | `isolation.dshHome` = `%TEMP%\clean004-probe-E3tyzv\dsh-home`；`containment` 7 项全 `true`（home/userprofile/appdata/localappdata/edge/tmp/novels）；`realEnvVerdict.ok=true`、`strictDeltas={}`、`inventoryDeltas={}`、`inventoryDeltaCount=0`、`leakSignature.pointsIntoIsolation=false`；`cleanup.rootRemoved=true` | ✅ |
| README 其它字段 | `head`/`headDirty`/`tally`/`命令`/`运行窗口`/`sha256`/`冻结资产 sha256` 逐项与 `report.json` 一致 | ✅ 自洽 |
| **冻结三脚本 sha256** | `de2de511…5b65` / `5afb8663…159a` / `782560e3…da23` —— **逐字未变**；`git diff --stat 6f65bbe HEAD -- docs/evidence/CLEAN-004/` 仅 3 个文档行（N-8 三处引文）+ `README.md` 单行 | ✅ |

**判定**：归档**可采信**，`head`/`headDirty`/FAIL/tally/锚 五项齐全且与实体逐字一致，零回归结论成立。

---

## 9. 真实环境纪律 + AI 专项 5 项

### 9.1 真实环境纪律（「临时改 → 跑 → 原地还原」是否真还原）

| 检查 | 实测 | 判定 |
|---|---|---|
| 被审面是否有未提交残留 | `git status --porcelain -- lib scripts test docs README.md CHANGELOG.md package.json` ⇒ **无 `M` 条目**（仅 `?? docs/review/**`） | ✅ |
| `scripts/probe-nv-ux012.mjs` 是否还原 | 工作树 = `HEAD`（无 diff）；`--falsifiability` 行为（10/10 + 32 行源控制哈希 `1dc74c09c604`）为定稿态行为 | ✅ |
| `lib/client.js` 是否还原 | 工作树内容与 `HEAD:lib/client.js` **逐行等价**（唯一差异 = CRLF vs LF，**5276 split 元素 / 5275 内容行两侧相同**）；sha256 = 归档锚 `7ecc3e39…` | ✅（且与 §8 双锚互证） |
| 是否有遗留备份/临时脚本/夹带文件 | `git status --porcelain` 全量 = 3 个治理文件 + 1 个 triage JSON + 2 个审查报告；**无 `.bak`/`.orig`/临时脚本**；`git stash list` **空**；reflog 仅 3 个正常 commit | ✅ |
| 是否有对 `C:\Users\peter\.dsh` 的写入 | R2 批次归档报告 `realEnvVerdict.ok=true` / `strictDeltas={}` / `inventoryDeltas={}`；`.dsh` 字符串仅作为**隔离前的指纹样本**出现在报告 JSON 中（`realEnvBefore.home`），**非写入** | ✅ 零写入 |
| 是否终止/接管进程 | 本审查**未处置任何进程**；进程计数（只读）：node 7 / msedge 20；报告侧 `cleanup.rootRemoved=true` 且无「接管用户实例」痕迹 | ✅ |
| 是否执行会启动实例的命令 | 本审查**未执行** `--boot` / 全量探针 / 冻结探针全量；四道门禁均不启动实例 | ✅ 符合授权边界 |

### 9.2 AI 代码专项 5 项

| # | 专项 | 结论 | 依据 |
|---|---|---|---|
| 1 | **mock 残留** | **无违规** | 本批产品面（`lib/client.js`）改动仅**注释**（10 行全部为 `//` 行，diff 无任何代码语句）；mock 仅在 `test/**` 与探针自证（`assertionLedgerRuntimeSelfTest` 以**构造记录集**喂**同一个生产判据函数** `assertionLedgerRuntimeCheck` ⇒ 属注入式自证，非 mock 替身替换产品逻辑） |
| 2 | **硬编码返回值** | **无违规（且已消除 R2 的 P1 类）** | 台账判据全部数据派生（`countOk` 由 `records.length` vs `expectedRecords` 现算）；`absentConditional` 的来源是 `opts.keep` 的**运行配置**而非常量（`:1682`）；`verdict.reclassified` 为字面 `false`，**但这是「无改判路径」的语义声明**（代码中确无写回分支，实读 `:1711-1715`），且不影响任何判定值 ⇒ 非「恒真伪装判据」 |
| 3 | **幻觉 API 调用** | **无违规** | 本批新增 API 面 = 0（`lib/**` 仅注释；探针仅用既有 `fs`/`url`/`child_process` 面）；无凭空宿主方法/事件；`import.meta.main` 仍为零命中 |
| 4 | **未实现 TODO** | **无违规** | 三 commit diff 无 `TODO`/`FIXME`/`XXX` 新增；R2 的 7 项发现**全部有落地或显式归口**（N-2 → CLEAN-005 补登；N-3 → CLEAN-008 + RISK-010） |
| 5 | **过度实现** | **通过（1 条 P3 可减）** | items 零增删、`regionLiterals`/`presetRowConfig`/`kindEnum`/`faces` 零变更行、非 line 字段仅 8 项 line-only；**轻微**：台账块注释内仍留一份**陈旧桶分解串**（§11 N-1，可减） |

### 9.3 过程上报纪律（真实环境逐条上报的机写核查）

R2 任务书所称「临时改 `scripts/probe-nv-ux012.mjs` / `lib/client.js` → 跑验证 → **原地还原**」——**本审查已以「工作树 ≡ HEAD + 归档 `headDirty=false` + 产物哈希锚」三重独立取证**（§9.1 + §8）。**未发现任何越界写入**（无 `$DSH_HOME` 写入、无进程处置、无仓外散落产物）。✅

---

## 10. 终态可用性 — **可作为 CLEAN-006 终态（可 merge + push）**

### 10.1 判定

**可以。** 依据：硬门槛 5/5 PASS（§0）；P0 = 0；N-1（P1）实质闭合且**双向可判**（§1~§4）；陈述订正 10/10（§5）；契约重基零扩展且逐段等价（§6）；四道门禁独立复跑全绿（§7）；归档零回归且锚齐全（§8）；真实环境纪律无越界（§9）；设计一致性完成（§9 表）；AI 专项 5/5。

### 10.2 使用前提（非阻塞）

| # | 前提 | 类型 | 说明 |
|---|---|---|---|
| P-A | 关单前把 `plan-tracker` 的 **CLEAN-006 行状态**由「⏳ 待执行」改为与「已归口」相符的终态（如「✅ 完成（R3 APPROVED_WITH_NOTES/0）」） | **治理记录一致性** | 实测：`CLEAN-006` 行仍为 `⏳ 待执行`（`repair` 中），而 `CLEAN-005` 行已含 R2 N-2 补登、`RISK-008` 已关闭、`RISK-010` 已登记 ⇒ **任务行状态落后于同批治理写回**（Coordinator 职责，非开发者产出） |
| P-B | 把 §11 的 3 条 P3 记为**遗留项**（登记下一批，或明确接受） | 记录面精度 | 均为注释/注记面，零行为影响 |
| P-C | 若要求「终态 run 必有 UX-012 全量报告」，则在**下一个需要全量运行的批次**顺带补一次 | 证据完备性（可选） | 见 §1.3 / §4.3：定稿态 `4b70182` 的 UX-012 全量报告**在盘无存**（授权面禁止本轮补跑） |

### 10.3 残余不确定性（如实列出，全部低）

| # | 残余 | 影响评估 |
|---|---|---|
| R-a | 定稿态 `4b70182` 无 UX-012 全量报告；现存两报告均取自 `700709e` 定稿态 | **低**：`lib/**` 两 commit 间零改动 ⇒ 产品面读数无差异；探针面差异（`ledRunBeforeSelf` 的 `absent` 参数）已由 10 例自证 + 红态报告 + 实读代码三重覆盖 |
| R-b | 端到端红态报告取自 `700709e`（注入点在该态已存在） | **低**：注入点在定稿态仍存在且被加强；红/绿两读数为**同代码对照对**（§4.3） |
| R-c | 「两态同数核验」只有**记录后**态进终态判定（记录前态经断言谓词暴露） | **低**：红态已实证可见红灯；措辞已在 §4.2 记 P3 建议 |
| R-d | 自证「记录前」例用 `slice(0,-1)` 代理记录前集 | **极低**：无未知 id ⇒ 读数不变（§11 N-3） |

### 10.4 N-2 / N-3 归口落盘核查（只核存在性与一致性，不评内容）

| 归口项 | 要求 | 实测落盘 | 判定 |
|---|---|---|---|
| **N-2** | CLEAN-005 补登 **1.7 / 2.4**；剔除误标 **1.4 / 6.2** | `.governance/plan-tracker.md:160`（CLEAN-005 行）末段「**追加（CLEAN-006 R2 N-2 归口，2026-09-15）**：…① 契约 `:109` item **1.7**（真值 `lib/index.js:89`，契约写 `L88`，陈旧 −1）；② 契约 `:129` item **2.4**（实测 `legacyApi` 回退 **5 处**返回点、行号系统性偏小 **3 行**，契约 6 值中含 `L770` 注释行）…；③ **剔除误标**：**1.4**（`lib/index.js:40 = const NS`）与 **6.2**（`package.json:8-10 = engines`）…**不属陈旧锚点，不得列入本任务范围**」 | ✅ **已落盘且四项齐全**（1.7 / 2.4 补登 + 1.4 / 6.2 剔除 + 「先于本批」证据口径） |
| **N-3** | UX-060 备注项（F-1/F-2/F-3/F-5/F-6）**另立任务承载** | `.governance/change-triage/CLEAN-008.json`（`task_id=CLEAN-008`，`reason` 明写「**CLEAN-006 R2 N-3**：这些项本在 CLEAN-006 登记范围内（plan-tracker:161）但本批零落地 ⇒ **关单前显式转出**」，含 title/priority/target_version/files/五步分析/快照）+ `.governance/evidence-log.md:377`（`TRIAGE-CLEAN-008` 机写条目） | ⚠️ **已落盘但形态为 change-triage 记录，非 `plan-tracker` 任务行**（`plan-tracker.md` 中 `CLEAN-008` **零命中**）；且 CLEAN-006 行内 F-1~F-6 仍逐条保留 ⇒ **建议在 `plan-tracker` CLEAN-006 行加一句「F-1/F-2/F-3/F-5/F-6 已转 CLEAN-008（见 change-triage/CLEAN-008.json）」并新增 CLEAN-008 行**（并入 P-A） |
| **RISK-008** | 关闭 | `.governance/risk-log.md:21` 状态列 =「**已关闭（2026-09-15，经 REVIEW-CLEAN-006-R2 裁定建议关闭）**：…残余面另立 RISK-010」+ 最后更新 2026-09-15 | ✅ **已关闭** |
| **RISK-010** | 登记 | `.governance/risk-log.md:25` 新增行「**F1 通道订阅恒定 ⇒ 换 store 不重订阅**（含…订阅真空）…**来源**：REVIEW-CLEAN-006-R2 对 RISK-008 的窄化建议 + N-4（机制陈述残留失实）」+ 缓解措施「短期：登记并在 CHANGELOG/注释层把机制陈述订正为事实（**N-4 同批**）」 | ✅ **已登记**；其短期措施已在 `700709e` 落地（§5 ①/②） |

---

## 11. 发现列表（P0 → P3）

> 本轮 **P0 = 0 / P1 = 0 / P2 = 0 / P3 = 3**（全部不阻断合并；均为记录面/注释面精度，零行为影响）。

### N-1 [P3] 探针台账块注释仍内嵌**陈旧桶分解串**（与自身台账矛盾，且不被任何机检覆盖）

- **位置**：`scripts/probe-nv-ux012.mjs:287`（`ASSERTION_LEDGER` 块头注释「与历史分类的差异」段）。
- **依据（实读 + 实跑对照）**：该行写「本块按上面单一口径重算 ⇒ **28 条 = 28 条 = 20 条驱动+状态比较 + 2 条单次快照读数 + 1 条结构面 + 3 条探针自证面 + 2 条隔离面**」；而**同一文件的唯一事实源** `ASSERTION_LEDGER.declaredTotal = 27`、`bucket-verify.count = 2`（`:299` / `:294` / `:328`），`--falsifiability` 实测输出**逐项为**「27 条 = 20 + 2 + 1 + **2** + 2」。⇒ 该注释的桶分解（27→28 / 自证面 3→2）**与现台账不符**（它是 R1 返工时点的历史值；`UX012-CRASH` 移入 `notRegisteredIds` 后未同步）。**机检零信号**：源控制锚只对含 `A(/*@assert*/` 的行取哈希（`:267` 行内文字），注释内的数字**不入任何判据**。
- **影响**：P-01 记录面——后续维护者按该注释理解桶结构会得到**过期的两项计数**；与 `CHANGELOG.md:67` 本批「（原 `28 条 = 20+2+1+3+2` 人工副本**已删**）」的表述**口径不一**（被删的是文件头那份，这一份在台账块头）。**无行为/机检影响**。
- **建议**：改为现口径「**27 条** = 20 + 2 + 1 + **2** + 2（N-A 4 条计入；唯一 id 数 **28** = 27 + `UX012-CRASH`）」，或按 F-10 同一思路**彻底去枚举**、改为指向 `ASSERTION_DOC.breakdown`。可选加固：把「块头注释内不得出现桶计数」纳入台账自证（一行级）。

### N-2 [P3] 契约 `revisions[]` 对 item 2.10 端点订正的**成因叙述与实读不符**

- **位置**：`lib/host-contract.mjs` `revisions[]` → `CLEAN-006（R2 返工）`（末句「并修正 `2.10` 终点在本批前即已偏移 2 行的历史残差（终点由**函数内 `refresh` 收尾 `}`** 校正为**函数收尾 `    }`**）」）。
- **依据（独立实读 `2bf58d2:lib/client.js`）**：旧 L1553 = `    }`，括号深度 **1 → 0** = `makeSessionsHookReactive` 的**函数收尾**；内层 `useSessionsSel.refresh` 的收尾在 **L1551**（深度 2 → 1）。⇒ 旧端点**本就在函数尾**，其过期**由本批 +2（Δ 区）引起**，不是「本批前即偏移 2 行的历史残差」，也不存在「由函数内 `refresh` 收尾 → 函数收尾」的位置变化。
- **影响**：P-01 记录面（把一个 Δ 驱动的常规重基描述为「历史残差订正」）⇒ 会误导后续读者对「该条 R1 期是否真的错锚」的判断；**不含任何失实行号**（新值 `L1449-1555` 正确）。
- **建议**：改为「终点随本批 Δ+2 更新为 `L1555`（= 函数收尾行；`2bf58d2` 的同行为 `L1553`）」；若确要记录历史残差，另举实证（当前**无**仓内证据支持「落在 `refresh` 收尾」）。

### N-3 [P3] 运行期自证的「记录前」例用 `slice(0,-1)` 代理 + 注释术语残留

- **位置**：`scripts/probe-nv-ux012.mjs:512-525`（自指两态自证段）。
- **依据**：① 例⑧/⑨ 用 `const preRec = healthy.slice(0, -1)`（`:518`）构造「记录前」集——**条数**对（26），但被删除的是 `idsAll` 的**末项**而非 `UX012-CLASSIFICATION-LEDGER`；真实记录前集 = `healthy` **去掉该 id**。当前无未知 id ⇒ `offLedger`/`naNotDeclared` 读数不变，**无实际影响**。② 同段注释（`:475-476` / `:513-514`，共 **4** 处）仍写 `extraSelfExpectation=0 / 1`，而定稿实现用的实参是 `absentConditional`——该标识符**只出现在注释**（实扫：探针内 `extraSelfExpectation` 4 处全为 `//` 行，无任何形参/实参/字段），属 R2 中途术语残留，**不误导结论**（同段下文与实参一致）。
- **影响**：P-03 级自证保真度——「记录前」例与真实形态**差一个 id 的边界**，未来台账 id 集变化时可能给出偏乐观读数；注释术语可能让读者以为存在另一套建模。
- **建议**：`preRec = healthy.filter((r) => r.id !== 'UX012-CLASSIFICATION-LEDGER')`（更贴近真实），并把注释术语统一为 `absentConditional`。

### 说明（非发现，如实标注）

- **行数口径「5273 → 5275」**：本审查 `split` 计数得 5274 / 5276（末行空元素），**内容行**为 5273 / 5275 ⇒ **契约表述正确**，不入发现。
- **红态 `verdict.ledgerOk=true`（记录前态不进终态判定）**：属**有意非对称**且红态已实证可见红灯，仅作**措辞建议**记入 §4.2，不单列发现（不阻断、不影响任何判定值）。
- **`.governance/plan-tracker.md` CLEAN-006 行状态「⏳ 待执行」**：属 Coordinator 治理写回面（本批被审产物之外），记入 §10.2 前提 P-A，不列为代码发现。
- **`scripts/probe-nv-ux012.mjs` 台账块头「28 条 = 28 条」重复笔误**：与 N-1 同一行、同一处订正覆盖。

---

## 12. 五维度逐项结论

| 维度 | 结论 | 依据（摘要） |
|---|---|---|
| **1 正确性** | **通过** | ① 运行期判据链完整：`countOk` ⊆ `runtime.ok` ⊆ `ledgerPredicate()`/`ledgerOkFinal`/`code`/`report.ok`（实读 `:457/459/1694/1713/1715/1721`）——R2 的 P1（恒假且静默）已实质消解；② 健康运行真值经报告直读核实（`runtime.ok/countOk=true`、`offLedger/naNotDeclared=[]`、`selfRef.ok=true` 26≡26 ∧ 27≡27、`verdict.reclassified=false`、**断言 PASS 且无 `reclassifiedByRuntimeCheck`**）；③ 端到端红态实物在盘，机制与病根代码独立复核一致；④ 契约重基 11/11 段逐行等价、跨改写区条目逐段算 Δ 正确；⑤ 边界：`--keep` 缺席建模、`UX012-CRASH` 异常路径（`extraRecorded`）、`notRegisteredIds` 豁免、`RENDER_CAP`（前任遗留）均处理 ✅。**缺陷**：无行为缺陷；3 条 P3 记录面（§11） |
| **2 安全性** | **通过** | 本批零产品代码改动（`lib/client.js` 10 行全为注释）；无密钥/令牌面改动；隔离面实测 `containment` 7 真 + `realEnvVerdict.ok=true` + `strictDeltas={}` + `inventoryDeltaCount=0` + `rootRemoved=true` ⇒ **真实 `$DSH_HOME` 零写入**（可机核）；本审查未处置进程、未申请沙箱升级、未执行启动实例命令 |
| **3 可维护性** | **通过（含 3 条 P3）** | 命名/函数长度与既有同款（新增自证函数 ~50 行内、无嵌套爆炸）；注释密度高且**本批大幅订正**（N-4 三处对齐、N-5 去重、N-6c 失败集细分、N-9 收窄）；**缺陷**：台账块头陈旧桶分解串（N-1）、契约成因叙述误述（N-2）、自证注释术语残留（N-3） |
| **4 性能** | **通过** | 本批无新增复杂度：`assertionLedgerRuntimeCheck` 为 O(n) 单趟过滤（n = 27 记录），自证 10 例均在**内存构造集**上跑同一函数；`--falsifiability` 面新增 1 次 `readFileSync` + 原生 regex；产品面（渲染/订阅）**代码零改动** ⇒ 零性能影响 |
| **5 测试覆盖** | **通过** | 四道门禁独立复跑全绿（302/0、PASSED、23/0、10/10 + 8/8 + 桶和）；**双层红向量**：单元层 10 例含五类真红（§3.1）、端到端层红态报告实物在盘（§4.1）；覆盖边界**如实标注**（`--keep` 缺席口径、记录前态经谓词暴露、自证「记录前」例代理） |

---

## 13. AI 代码专项 5 项

见 §9.2（mock 残留 / 硬编码返回值 / 幻觉 API / 未实现 TODO / 过度实现——**五项逐一有结论，全部无违规**，另登记 1 条 P3 可减项）。

---

## 14. 设计一致性

| 检查面 | 结论 |
|---|---|
| **P-10 宿主耦合入契约** | **通过**：本批新增宿主耦合面 = **0**（`lib/**` 仅注释；无新宿主导入/API/selector/令牌）；契约改动**仅**为既有 `items[].line` 重基（8 项）+ `revisions[]` 注记（1 条）⇒ 双向 ⊆ 关系不变；重基口径（按目标 `file` 分组、跨改写区逐段算 Δ）**已入 `revisions[]`** |
| **契约不变量** | **通过**：items 49 零增删、id 序列一致、非 line 字段差异 0、`regionLiterals`/`presetRowConfig`/`kindEnum`/`faces`/`ctxGetSemantics`/`hostSurface` 零变更行（17 变更行 = 8 item + 1 revision）、5.3/5.4/5.6 未变、`revisions[]` 10→11、冻结三脚本 sha256 未变 |
| **BUG-005 五契约** | **通过**：五条通道（函数引用恒定 / holder 惰性解析 / 服务增减重订阅 / 派生值不变也强制重渲染 / 卸载退订）本批**零代码改动**；`test/smoke.mjs` 的 BUG-005 组断言在全绿 302 中通过；双通道分工陈述已按事实订正（N-4）后与代码一致 |
| **BUG-009 收敛语义** | **通过**：`selectNow(selector)` 渲染期实时求值未动（本批 `lib/client.js` 零代码改动）；冻结探针收敛面 `C3b`/`C9`/`C10`/`C11` **全 PASS**（归档独立比对，零 PASS→FAIL）；`UX012-C2/C4/C1` 在健康报告中全 PASS |

---

## 15. 结构化结论（交付 Coordinator）

```
TASK: CLEAN-006
ROUND: R3
VERDICT: APPROVED_WITH_NOTES
REPORT: docs/review/CLEAN-006-R3.md
HARD_GATES: P0=0 PASS | N-1+N-4~N-9 逐条处置=7/7 PASS | 5 维度全覆盖+每条带级别 PASS | 设计一致性完成 PASS | AI 专项 5 项完成 PASS（5/5）
CHECKED_ITEMS:
  1 N-1 健康真值 = 通过（absentConditional=0 / runtime.ok=true / countOk=true 27≡27 / offLedger=[] / naNotDeclared=[] / selfRef.ok=true 26≡26∧27≡27 / verdict.reclassified=false；断言 PASS 且全报告 reclassifiedByRuntimeCheck 命中 0）
  2 判据诚实性 = 通过（countOk 真进谓词链，三条独立实读；期望数不随实测数变动；例⑥27/26 与例⑨26/27 真红且判据单点定向；「声明总数 −1」已按事实改写并留档错值）
  3 双层红向量 = 通过（单元层独立复跑 RUNTIME-LEDGER-CHECK 10/10，五类真红齐备；端到端红态报告实物在盘：恰 1 条 FAIL + tally 22/27 + ok=false，与同代码态绿读数互为对照）
  4 陈述订正 10 项 = 通过（①~⑩ 全部落地；四处失实/两者不可改提交消息的失实均在记录面显式标注；桶串保留观测值 + 口径订正标记；F-10 收窄成立且 A-F9/COMPAT-015 确不扫桶串）
  5 契约局部重基 + 2.10 端点 = 通过（5273→5275 Δ+2；≤1478:0 / 1479-1482 改写区 / ≥1483:+2 与独立重算逐点一致；8 项 11 段逐段 Δ 全等价 neq=0；2.10 跨改写区逐段算 Δ 正确；端点订正为必要事实订正（P-01），混式「双 L」归一为 P3 可接受（混式在仓内仅此一处、已归一为同形，仅 `revisions[]` 的旧值记载保留）；零扩展：items 49 / 非 line 字段 0 差异 / regionLiterals·presetRowConfig·kindEnum·faces·5.3·5.4·5.6 零变更 / revisions 10→11）
  6 门禁 = 通过（smoke 302/0 exit 0 含 COMPAT-012 N2 F5d 与 COMPAT-015 F3 绿；validate-preset PASSED；node --check 23/0；--falsifiability exit 0 = 10/10 + 桶和 27≡27≡27 + 注入 8/8）
  7 冻结探针归档 = 通过（head=4b70182 / headDirty=false / FAIL 0 / tally 49-47-0-2；与基线 5 条差异全为改善、零 PASS→FAIL、零新增 FAIL、id 集相同；双锚 blob 08c03f24… ≡ git rev-parse HEAD:lib/client.js、文件 sha256 7ecc3e39… ≡ 工作树、报告 sha256 8320c96d… 97367 B ≡ 归档；冻结三脚本 sha256 de2de511…/5afb8663…/782560e3… 未变）
  8 真实环境纪律 + AI 专项 = 通过（被审面 git status 零 M 条目、scripts/** 零 diff、client.js 工作树 ≡ HEAD 逐行等价、无残留/无 stash ⇒ 原地还原成立；零 $DSH_HOME 写入；未处置进程；未执行启动实例命令；mock/硬编码/幻觉 API/TODO/过度实现 五项均无违规）
  9 终态可用性 + 归口落盘 = 通过（可 merge+push，附 P-A/P-B/P-C 三前提；N-2 已落 plan-tracker:160 四项齐全；N-3 已落 change-triage/CLEAN-008.json + evidence-log:377 但 plan-tracker 无 CLEAN-008 行；RISK-008 已关闭、RISK-010 已登记）
LEDGER_FINAL_VERDICT: 健康运行真值成立——absentConditional=0、runtime.ok=true、countOk=true（recordedCount 27 ≡ expectedRecords 27 ≡ declaredTotal 27）、offLedger=[]、naNotDeclared=[]、selfRef.ok=true（记录前 26≡26 / 记录后 27≡27）、verdict.reclassified=false；UX012-CLASSIFICATION-LEDGER PASS 且 reclassifiedByRuntimeCheck 零命中 ⇒ 无改判路径成立。防调参成立：countOk 为 runtime.ok 与 ledgerOkFinal 的合取项（并合取进 report.ok 与退出码），期望数不随实测数变动，条件缺席建模双向可判（例⑥红 / 例⑨红 / 例⑦⑧⑩绿）。
RED_VECTOR_VERDICT: 单元层 10/10 含真红（数量不匹配②③ / 越册③④ / 未登记 N-A⑤ / 条件缺席建模红例⑦ / 自指未声明缺席红例⑨，另有 4 绿例非恒红），本审查独立复跑 PASS；端到端红向量**不需补做**——红态报告实物在盘（%TEMP%\clean006-redvector，head=700709e、恰 1 条 FAIL、tally 22/27、ok=false），与同代码态绿读数构成对照对，且注入点在定稿态仍存在且被加强；与 CLEAN-007 R2 / BUG-010 R1 的「已归档证据可独立直读 ⇒ 不必强制复跑」口径一致（保留：定稿态 4b70182 无 UX-012 全量报告，记 §10.3 R-a）。
STATEMENT_CORRECTION_VERDICT: 10/10 落地（①client.js 注释②CHANGELOG B 段③smoke F-03(d) 反向陈述订正+补「挂载后不换订⇒该面未走到」④两处不可改提交消息（700709e/2bf58d2）已在 CHANGELOG 明标为误并给真值⑤桶串保留原观测值 20+2+1+3+2≡28 于注内⑥F-10 收窄成立（探针内单一事实源；CHANGELOG 叙述性引用不参与机检，A-F9/COMPAT-015 确不扫桶串）⑦N-5 去重 2→1⑧N-8 三份源文档全合取引文⑨N-6b Δ 分段改写区⑩N-6c 失败集细分）；残余 = N-1（P3 探针台账块头陈旧桶分解串 27→28/自证面 2→3）。
CONTRACT_2_10_VERDICT: 必要的事实订正（P-01），非范围外改动（C-04 不成立）——2.10 起点 L1449 保持不变、终点随本批 Δ+2 更新为 L1555（实读 = makeSessionsHookReactive 函数收尾行，跨度含全部双通道代码）；「双 L」L1449-L1553 → L1449-1555 归一为等价表述规范化（F5d 正则接受两写法）⇒ 级别 P3（可接受）。**唯一 P3**：契约 revisions[] 的附属成因叙述「终点由函数内 refresh 收尾 } 校正为函数收尾」与实读不符（旧 L1553 本即函数收尾，内层 refresh 收尾在 L1551）⇒ 记 N-2（P3，记录面）。
PROBE_TALLY_CHECK: 归档 head=4b70182d75731b724c8e7f828266c88ac717a078 / headDirty=false / FAIL 0 / tally {49,47,0,2} / 与基线 21b100ce 差异 5 条全为改善（D2·C3b·C9·C10 FAIL→PASS、C11 N-A→PASS）/ 零 PASS→FAIL / 零新增 FAIL / id 集相同；锚一致：blob 08c03f24… ≡ HEAD:lib/client.js、文件 sha256 7ecc3e39… ≡ 工作树、报告 sha256 8320c96d…（97367 B）≡ 归档、%TEMP%\clean006-rework2 原件同长同哈希；冻结三脚本 sha256 未变。
HANDOFF_CHECK: N-2 已落盘（plan-tracker:160 补登 1.7 真值 index.js:89 / 2.4 实测 5 处·系统 3 行偏移 + 剔除 1.4/6.2 误标，四项齐全）；N-3 已落盘但形态为 change-triage（CLEAN-008.json + evidence-log:377），plan-tracker 中 CLEAN-008 零命中且 CLEAN-006 行仍保留 F-1~F-6 ⇒ 建议补 plan-tracker 行与「已转 CLEAN-008」标注；RISK-008 已关闭、RISK-010 已登记（缓解措施「N-4 同批订正」已在 700709e 落地）。
FINAL_USABILITY: 可作为 CLEAN-006 终态（可 merge + push）。前提：P-A 关单前把 plan-tracker CLEAN-006 行状态更新为终态（并补 CLEAN-008 行/转出标注）；P-B 3 条 P3 记为遗留项或明确接受；P-C（可选）若要求终态 run 必有 UX-012 全量报告，在下一需要全量运行的批次顺带补。残余不确定性：R-a 定稿态无 UX-012 报告 / R-b 红态报告取自 700709e / R-c 记录前态不进终态判定 / R-d 自证记录前例用代理集（均低）。
NEW_FINDINGS: P0=0 / P1=0 / P2=0 / P3=3 —— N-1 探针台账块头注释遗留陈旧桶分解串（27→28、自证面 2→3，与自身台账矛盾且机检零信号）；N-2 契约 revisions[] 对 2.10 端点订正的成因叙述与实读不符（旧终点本即函数收尾，非「函数内 refresh 收尾」）；N-3 自证「记录前」例用 slice(0,-1) 代理记录前集 + 注释术语 extraSelfExpectation 残留（应为 absentConditional）。
UNRESOLVED_BLOCKERS: 0
```
