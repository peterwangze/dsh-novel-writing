# CLEAN-007 代码审查报告 R2（Code Reviewer，返工复审）

- **任务**: CLEAN-007 —— Code Review **round = R2**（轻量返工复审：只核 R1 的 C-1/C-3/C-4/C-5 + 廉价 P3 收口 + 二次契约重基 + 不变量）
- **前轮引用**: `docs/review/CLEAN-007-R1.md`（`APPROVED_WITH_NOTES` / `unresolved_blockers=0`；P0=0、P1=1(C-1)、P2=2(C-2/C-3)、P3=9(C-4~C-13)）
- **审查对象**: 返工提交 `addd934`（`git show addd934`；5 文件 +257/−87：`lib/client.js` +36/−14、`lib/host-contract.mjs`、`scripts/probe-nv-ux012.mjs`、`test/smoke.mjs`、`CHANGELOG.md`）；历史 `874e5a1` → `addd934`；`main` ahead **2**、**未 push**
- **审查方式**: 只读（`git show/diff/log/rev-parse/worktree`、只读取文件、只读复跑 `node --check` / `test/smoke.mjs` / `test/validate-preset.mjs` / `probe-nv-ux012.mjs --falsifiability`、只读检索 `%TEMP%\clean007-verify\**`）；**未修改任何被审文件**、未 commit、未写入 `C:\Users\peter\.dsh`、未终止/接管任何进程、未创建子 agent
- **唯一产出**: 本文件

## 结论

**APPROVED_WITH_NOTES** —— R1 的 C-1（P1）/C-3（P2）/C-4（P3）/C-5（P3）四项**均已处置**且**独立复核成立**；二次契约重基经**全量 29 处独立重算**（逐行等价 29/29、Δ 分段与自述逐项一致、items[] 49 与 kind/necessity/symbol/golden/`regionLiterals`/`presetRowConfig[]`/5.3·5.4·5.6 零改动）；四道门禁独立复跑全绿；冻结探针 `head=addd934 / headDirty=false / FAIL 0 / tally 49-47-0-2`，与基线**逐条状态零差异**。新发现 **P0=0、P1=0、P2=1、P3=6**（均非阻塞，见 §11）。

```
unresolved_blockers=0
```

> 结构化事实源：本字段为**独立字段**（非自然语言推断），对应本报告结论 `APPROVED_WITH_NOTES`；全文不含未解决的 BLOCKING finding（P0 = 0、P1 = 0）。N-1（P2）为**建议本批或紧随其后订正**的记录口径项，按 `skills/code-review/SKILL.md` 分级（P0=0 ⇒ 可合并；P2 可遗留）不改变本结论。

---

## 0. 独立复跑的门禁读数（本次实跑，非转述）

| 门禁 | R2 独立复跑读数（命令/证据） | 与自述一致 |
|---|---|---|
| `node test/smoke.mjs` | **297 passed / 0 failed**（exit 0，本轮新跑） | ✅ |
| `node test/validate-preset.mjs` | **PASSED**（`schema-face: PASS`；skills 29/29） | ✅ |
| `node --check` 全清单 | `git ls-files "*.js" "*.mjs"` = **23 文件 / 0 失败**（自述「14 文件」为子集） | ✅ |
| `node scripts/probe-nv-ux012.mjs --falsifiability` | **PASS**：谓词 **11** 条、向量 **red=25 / ok=11**、每条 `部署消费点=1`（≥1 达标） | ✅ |
| 冻结探针（CLEAN-004）复跑报告 | `%TEMP%\clean007-verify\clean004-rework\report.json`：`head=addd934…`、`headDirty=false`、**FAIL 0**、`tally {49,47,0,2}`、`D2-esc-bind-yield=PASS {modal:false,console:true}`、`envErrors=[]`、`realEnvVerdict.ok=true`、`cleanup.rootRemoved=true` | ✅ |
| 冻结探针**无回归** | 与 `clean004-final`（R1 时点）逐条断言状态比对：**差异 0 条**（同为 47 PASS / 0 FAIL / 2 N-A：`B5-found-sessions-area`、`D6-session-switch-close`） | ✅ |
| 冻结资产不变量 | `docs/evidence/CLEAN-004/probe-clean-004.mjs` sha256 = `DE2DE511E89A8CCC6D08B29D529E51336079BC3CEAB4B937795DAD88D9065B65` = 任务书锚值（大小写无关） | ✅ |
| UX-012 探针绿态 | `ux012-green/report-ux012.json`（8:21:41→8:22:03）：25 条 / PASS 21 / FAIL **0** / N-A 4；`C4=PASS`、`B3=PASS` | ✅ |
| UX-012 探针红态 | `ux012-redproof/report-ux012.json`（8:22:03→8:23:27）：25 条 / PASS 19 / FAIL **2**；`C4=FAIL`、`C1=FAIL`（连带） | ✅（双向留痕，见 §2） |

> `report.ok=false`（冻结探针）系该探针**设计口径**（`ok = every(status==='PASS')`，N-A 计为非 PASS，`probe-clean-004.mjs:1893`），基线 `clean004-final` 同样为 `false` ⇒ **非回归**、断言级 **FAIL=0** 才是判据。

---

## 1. 必核 10 项逐条结论

| # | 必核项 | 结论 | 事实依据（可复查） |
|---|---|---|---|
| 1 | C-1 修复正确性（P1 重点） | **通过** | `lib/client.js:3955-3965`；读实时值 / 分层语义 / 原路径保留逐项见 §2 |
| 2 | C-1 红/绿双态证据复核 | **通过（含 1 条留痕限制）** | `ux012-redproof` FAIL 向量 = 任务书向量；`ux012-green` PASS；构造性推演成立；限制见 §2.4 |
| 3 | C-3 闸门化正确性 | **通过** | 闸门只读（无 `focus()`）；A1b/A6/A7b/A2b 同闸门记 N-A；A6 谓词 red 可辨；「落 body」前侧已改元素身份（后侧身份读数未入谓词 ⇒ N-4 P3） |
| 4 | C-4/C-5 事实订正 | **部分通过** | 29 处口径三处文字已改并复核成立；**分类计数「24 条」与实际 25 条不自洽 ⇒ N-1（P2）** |
| 5 | 廉价 P3 收口复核 | **通过** | C-6/C-7/C-8/C-9/C-10/C-11/C-12/C-13 逐条见 §4，全部落实且零残留 |
| 6 | 二次契约重基（抽 ≥6 处） | **通过** | 抽核做满 **18 项 / 29 处**（含指定的 2.3 / 2.13 / 3.6 / 3.4）：逐行等价 29/29、Δ 分段一致、零扩展；锚点唯一性 2 处口径偏差 ⇒ N-2（P3） |
| 7 | 回归（独立复跑） | **通过** | smoke 297/0、validate-preset PASSED、`node --check` 23/0、`--falsifiability` PASS（red 25 / ok 11 / 谓词 11） |
| 8 | 冻结探针读数复核 | **通过** | §0 表：head/headDirty/FAIL/tally/D2 全对，且无 PASS→FAIL、无新增 FAIL |
| 9 | 探针自身两处缺陷修复恰当性 | **通过** | 未降低故障可见性（异常仍判 FAIL 并入 `report.crash`）；同形空值/重试均不产生新真空 PASS；2 条留痕建议 ⇒ N-5/N-7（P3） |
| 10 | 不变量 + AI 专项 5 项 + 真实环境纪律 | **通过** | §9：冻结 sha256 未变、隔离零写入、未终止进程、diff 内零 `.dsh` 写入；5 项逐一为 0 |

---

## 2. C-1（P1）修复正确性 + 红/绿双态独立核验

### 2.1 代码事实（`git show addd934 -- lib/client.js`，最终文件行号）

- **SplitWorkspace Esc（新增守卫）** `lib/client.js:3955-3965`：
  ```js
  useEffect(() => {
    if (snap.active !== true) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      const s = store.get()
      if (s.bind !== null || s.entryOpen === true) return // 让位：面板/对话框自挂 Esc 接手
      closeWorkbench(t)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [snap.active])
  ```
- **控制台 Esc（R1 时点已有，本批未改）** `lib/client.js:3390-3408`：`const s = store.get(); if (s.bind !== null || s.entryOpen === true) return`（`:3394-3395`）；deps = `[open, creating, createBusy]`（`:3408`）。
- **面板 Esc** `lib/client.js:2819`：`if (e.key === 'Escape' && busy !== true) store.set({ bind: null })`。

### 2.2 四条子问题逐项

1. **读实时值（不入 deps、无陈旧闭包）**：**成立**。两处守卫均在 `keydown` 回调内实时 `store.get()`（`:3394`、`:3959`），非渲染期快照；SplitWorkspace 的 deps 仍为 `[snap.active]`（`:3965`，未改），语义不受 deps 是否含 `bind` 影响；控制台侧 deps 与改动前逐字相同且含 `createBusy`（`:3408`，C-11 注释所述成立）。
2. **分层语义（面板态 Esc 只关面板 → 面板关后再 Esc 才关分栏/创作台）**：**成立（代码级 + 行为级）**。面板态：三个 window（非捕获）监听按注册顺序派发，分栏监听先注册（分栏先激活）、读 `store.get()` 命中 `bind !== null` ⇒ 直接 return，随后面板自挂监听关面板、控制台监听同样让位 ⇒ 仅关一层。行为级证据 = `ux012-green`：`splitEsc {splitBeforeEscPanel:true, panelWasOpenInSplit:true, split:true, modal:false}` ⇒ `C4=PASS`。第二拍（面板关后再 Esc）由守卫的 else 分支保证 `closeWorkbench(t)`；**该拍无行为级断言 ⇒ N-5（P3）**。
3. **不破坏原有「非面板态 Esc 关创作台/分栏」路径**：**成立（代码级）**。新守卫只在 `bind !== null ∨ entryOpen === true` 时提前 return，其余情况下 `closeWorkbench(t)` 调用点、监听注册/卸载与改动前一致（`:3957-3964` 对照 diff 前的 `if (e.key === 'Escape') closeWorkbench(t)`）。注释层同源（`:3948-3954`）。
4. **有无**新**的同类缺口**：**无新增**。全文件 `addEventListener('keydown')` 仅 **4 处**：`:657`（`useModalFocus`，捕获相位、仅处理 `Tab`，不涉 Esc）、`:2820`（BindDialog Esc，含 `busy` 守卫）、`:3406`（NvConsole Esc，含 `bind/entryOpen` 让位）、`:3963`（SplitWorkspace Esc，本批加守卫）；`'Escape'` 字面量仅 **3 处**（`:2819`/`:3393`/`:3958`）⇒ 无「未登记的第 4 条 Esc 路径」。既有缺口 = `WorkspaceDialog`（`entryOpen`）无自挂 Esc（R1 C-2），本批按「明示不做」另立 **BUG-010**（`.governance/change-triage/BUG-010.json` 实际存在，P2/0.5.3）⇒ 处置符合 R1 建议。

### 2.3 「回退守卫 ⇒ 必红」的构造性判定（**可仅凭断言结构判定**）

- 断言形态（`probe-nv-ux012.mjs:1001-1004`）：`splitBeforeEscPanel === true && evalPred('C4-split-state-esc-layering', {panelWasOpen, panelClosed, splitStillOpen})`；谓词（`:123`）`= panelWasOpen && panelClosed && splitStillOpen`。
- 无守卫时的确定性推演：分栏监听先注册 ⇒ 同一次 Esc 先执行 `closeWorkbench(t)`（`snap.active=false` ⇒ `SplitWorkspace` 返回 `null` ⇒ `.nv-bar` 从 DOM 消失，**与面板监听无关**），随后面板监听关面板 ⇒ 终态 `{split:false, modal:false}` ⇒ `splitStillOpen=false` ⇒ 谓词 **false** ⇒ 断言 **FAIL**。前置两读（`splitBeforeEscPanel`、`panelWasOpenInSplit`）在 C4 场景可达且为真（先点失效卡开分栏、再点抽屉卡开面板），故**不存在「前置不成立 ⇒ 因 red3 空真而绿」的退路**。
- ⇒ **结论：回退守卫必然使 C4 变红（结构可判定）**；红态实跑证据与推演一致（见 2.4）。

### 2.4 红/绿双态留痕核对（报告字段级）

| 项 | 绿态（`ux012-green`） | 红态（`ux012-redproof`） |
|---|---|---|
| 报告时间 / head | 8:21:41→8:22:03；`874e5a1`、`headDirty=true` | 8:22:03→8:23:27；`874e5a1`、`headDirty=true` |
| tally | 25 / 21 / 0 / 4 | 25 / 19 / **2** / 4 |
| `facts.splitEsc` | `{splitBeforeEscPanel:true, staleCardClickedSplit:true, panelWasOpenInSplit:true, split:true, modal:false, console:false}` | `{…, split:false, modal:false, console:false}` |
| C4 | **PASS** | **FAIL**（FAIL 向量 = 任务书所述 `{split:false,modal:false}`「一键关两层」） |
| 其它 FAIL | 无 | `UX012-C1-bindnew-consumer`（`bindBtnClicked:false`、`splitStillThere:false`）——**因果一致**：创作台被同一次 Esc 关掉 ⇒ 控制条按钮不存在。该连带失败构成红态的**独立交叉印证**（绿态同一断言 PASS） |

- 日志留痕：`%TEMP%\clean007-verify\red.log`（尾行 `tally = 25 条 / PASS 19 / FAIL 2 / N-A 4`、`PROBE UX-012 FAILED：19/25`）、`green.log`（`ALL PASS：21/25`）。
- **留痕限制（如实披露）**：红态工件本身（含被临时回退守卫的 `client.js`，自述 worktree sha256 `0854e37a…`）**未随证据保留**，`git worktree list` 仅剩主工作树 ⇒ 我**无法独立重算该 sha256**，也**不能在只读边界内自建红态复跑**（需改产品文件）。可复核的是：报告与日志是**真实探针运行产物**（同一探针、head=874e5a1、dirty=true）、FAIL 向量与「守卫缺席」语义严格一致、且 C1 连带失败与绿态互为反向对照。

---

## 3. C-3 / C-4 / C-5 处置判定

### 3.1 C-3（P2，A6 真空 PASS）——**已闭合**

| 要求（R1） | 落实 | 独立复核 |
|---|---|---|
| ① A6 纳入 `focusMovable` 闸门（不可移 ⇒ N-A） | `probe-nv-ux012.mjs:888-896`；`semantics.restored` 仅在可移时求值 | ✅ `ux012-green`：A6=N-A；A1b/A7b/A2b 同闸门 N-A ⇒ **N-A 4 条**与自述一致 |
| ② 改判据 + 补 `A6-focus-restore` 谓词与 red 向量 | `:113`：`focusMovable===true && preFocusIsBody!==true && postFocus===preFocus`；red/red2/red3/ok 四向量 | ✅ `--falsifiability`：`red=3 ok=1 redsAllFalse=true oksAllTrue=true 部署消费点=1`；「删除归还逻辑 ⇒ 焦点落 body（`postFocus='BODY'`）≠ 打开前元素 ⇒ false」**结构成立**；且「前置丢失（`preFocusIsBody=true`）」同样为红 ⇒ **判据双向 fail-closed，无真空 PASS 残留** |
| ③ 「落 body」改元素身份比较 | **前侧**：`preActive.isBody = document.activeElement === document.body`（`:875`，**已入谓词**）；**后侧**：`escState.activeIsBody`（`:881`）同法计算并入 `facts`/detail，但**未参与谓词**（判别力不受影响：守卫缺席时 `'BODY' ≠ preFocus` 已足以为红） | ✅ 恒真失效已解除（原 `!== 'body'` 的大小写失配不再存在）；后侧未入谓词 ⇒ **N-4（P3，改进建议）** |
| ④ 闸门**只读**、不污染 A5/A6 的「打开前焦点」读数 | `:723-731` 只做 `hasAttribute('inert')` 祖先链遍历 + `document.hasFocus()`；**无任何 `focus()` 调用**；闸门计算点（A1 后）早于 A6 的前置焦点读取（`:875`） | ✅ 逐行实读：闸门块内 0 个 `focus(` 调用 |

### 3.2 C-4（P3，31 → 29 处）——**已闭合**

- 三处文字均已改：契约 `revisions[]`（`lib/host-contract.mjs:79`「**18 项 / 29 处**…**口径订正（R1 C-4）**」）、`CHANGELOG.md:41`（同款订正说明「首版自述 31 处有误（括号内逐项相加即为 29），已按 29 处重述」）、`CHANGELOG.md:46`（C-4 处置条目）。残留的「31 处」字样**仅存在于订正说明的引号内**（指名被订正的历史值），非陈旧副本。
- 我按 `2.3×1 + 2.4×6 + 2.5~2.13×9 + 3.1×1 + 3.2×2 + 3.3×3 + 3.4×3 + 3.5×1 + 3.6×2 + 3.8×1` 独立相加 = **29**，与逐项解析结果（我实测的变化范围总数 = **29**）一致 ⇒ **订正正确**。

### 3.3 C-5（P3，探针断言口径）——**部分闭合（计数不自洽）**

- 已落实：文件头 `:10-16` 与 `CHANGELOG.md:46` 均改为「**以真驱动为主**」并列出五类桶：真驱动 / DOM 属性读数 / 结构面（`C3-single-source` 正则计数）/ 自证面（`FALSIFIABILITY`）/ 隔离面（Z1/Z2）；两处源码读取面（C3 与 `readI18n()`）已在标签内标注。**「全部行为级」的夸大措辞已消除**。
- **不自洽（⇒ N-1，P2）**：自述 **「24 条断言」= 17+3+1+1+2 = 24**，但探针**实际 25 条**（我独立枚举：断言调用点 30 处 / 唯一 id **26** 个，其中 `UX012-CRASH` 仅异常路径触发 ⇒ 正常路径 **25** 条；`ux012-green`/`ux012-redproof` tally `total=25` 亦证）。差额 1 条无法归入自述任一桶（A6 / B2 / A0 三者之一未被点名）。

---

## 4. 廉价 P3 收口复核（C-6~C-13）

| # | 收口要求 | 复核结论 | 依据 |
|---|---|---|---|
| C-6 | A1 补「动作行恰两钮」 | **已落实** | `:673` 新增 `formBtns`（`.nv-cbtns button`）；`:739` 断言 `formBtns.length === 2` + 文案「创建/取消」；`.nv-cbtns` 仅一处（`lib/client.js:3716`），头部 ✕ 图标钮在该行之外 ⇒ 三钮复活必红 |
| C-7 | 谓词按部署面拆分 + 补绑定面板 busy 行为面 | **已落实** | `:94-106` 拆为 `A10-busy-create-modal` / `D1-busy-bind-panel`（各带 red 向量）；A10 部署点改指新 id（`:942`）；**新增 `UX012-B3-bind-busy-guard`（`:1052-1056`）**：CDP Fetch 真挂起 `*/novel-writing/api/overview*`，判据 = `rowClicked ∧ heldCount ≥1 ∧ busyProof.rowsDisabled ≥1 ∧ 谓词 ∧ panelClosedAfterRelease`。**观测判据可靠**：`lib/client.js:2974` 会话行 `disabled: busy` ⇒「行 disabled」⇔ busy 置位（非同因双关）；`ux012-green` 实测 `{rowCount:3, rowClicked:true, heldCount:2, rowsDisabled:3, panelAfterEscBusy:true, panelClosedAfterRelease:true, splitAfterBindBusy:true}` ⇒ busy 中 Esc 不关面板、放行后自关，**真行为级** |
| C-8 | A7 标签按实测分支订正 | **已落实且与实测一致** | `:821` 标签注明本环境 `focusMovedToLast=false`（inert）⇒ 触发「焦点不在模态内」分支（`client.js:653`：`inside !== true ⇒ preventDefault + focus 首位`），防逸出语义成立；回绕归 A7b（闸门约束） |
| C-9 | 删 `createSessionFor` 死输出 `step` | **已落实，全仓零残留** | `git grep "\.step"` 仅命中 `lib/client.js:1611` 的**解释性注释**；JSDoc 返回值签名同步（`{ok,sessionId,bound,errorText}`）；两消费点（`:1709`、`:4172`）只读 `ok/errorText/sessionId/bound`；smoke 无 `step` 断言 |
| C-10 | 删探针死数据与死开关 | **已落实** | 5 个未用 i18n 读数（`dirPlaceholder/nameRequired/closed/unbound/stale`）已删且**全仓零引用**（仅产品 i18n 表自身定义存在）；`--no-browser-head` 全仓零引用（残留仅冻结资产 `docs/evidence/CLEAN-004/**`——**冻结面本就不该改**——与历史审查报告，`scripts/probe-nv-bar-geometry.mjs` 的同名开关属另一探针、未在本批范围）；`browser===null` 仍 `return 2`（`:465-466`），无死分支 |
| C-11 | `closeCreate` 前向引用注释补实时性 | **已落实且事实正确** | `:3399-3400` 注释称 deps 含 `createBusy`；实测 deps = `[open, creating, createBusy]`（`:3408`） |
| C-12 | `lastOutsideFocus` 补边界说明 | **已落实且前提为真** | `:616-619`；前提实测：`.nv-modal-backdrop`（`:4811`）与 `.nv-cmodal-backdrop`（`:4955`）均 `position:fixed; inset 0; z-index:1000` ⇒ 三处模态互斥成立 |
| C-13 | F4 性能理由订正 | **已落实且事实正确** | `lib/client.js:3841-3846`：明确「不宣称减少重渲染」+ 归因 `bump=setTick`；实测 `:1479` `const bump = () => { if (!disposed) setTick((n) => n + 1) }`（对任一条目变化强制重渲染）⇒ 订正成立；`CHANGELOG.md:36` 同款订正已落；全仓无残留「不再触发创作台子树重渲染」表述 |

---

## 5. 二次契约重基独立重算（做满 18 项 / 29 处）

方法（独立于自述）：`git show 874e5a1:lib/host-contract.mjs` 与工作树契约**分别动态导入**（模块为纯数据），逐项取旧/新 `line` 字段解析 `L<n>` / `L<n>-L<m>` 段，逐段取 `git show <rev>:<file>` 原文做**逐行等价**与长度守恒校验；再对最终文件做锚点检查。

| 检查项 | R2 独立重算结果 |
|---|---|
| `items[]` 计数 / face 分布 | **49**（旧 49、新 49）；`{1:11, 2:13, 3:8, 4:6, 5:6, 6:5}` 两次**完全一致** |
| `line` 变化项数 | **恰 18 项**（2.3、2.4、2.5~2.13、3.1、3.2、3.3、3.4、3.5、3.6、3.8） |
| 其余字段（kind/necessity/symbol/note/face/file） | **零差异**（对 49 项做 `line` 剥离后的深比较 = `true`） |
| `regionLiterals` / `presetRowConfig` / `golden` | **逐字节相同**（`true`/`true`/`true`）；item 5.3/5.4/5.6 随深比较零差异 |
| 顶层键差异 | **仅 `revisions`** 一个键不同（其余 12 键全同） |
| `revisions[]` | 7 条，末条 `task:'CLEAN-007'`；文本含「**两次机械重基**」「`5018 → 5198 → 5220`」「**18 项 / 29 处**」+ 首轮/返工轮 Δ 分段 + 双取证口径 + 未动面 + C-4 订正说明 ⇒ **两次重基均有留痕** |
| 逐行等价（全 29 处） | **29/29 等价、0 处不等价**；长度守恒全通过 |
| 指定抽查（任务书 ≥6 处） | **2.3 `L5060-L5062 → L5082-L5084`（Δ+22）**✅；**2.13 `L5127-L5159 → L5149-L5181`（Δ+22）**✅；**3.6 `L1160-1184 → L1164-1188`（Δ+4）+ `L3875 → L3886`（Δ+11）**✅；**3.4 `L921-934 → L925-938`（Δ+4）+ `L4711 → L4733`（Δ+22）+ `L4854 → L4876`（Δ+22）**✅ |
| Δ 分段（实测集合） | `{+4, +6, +11, +22}`：2.4×6/+4、2.5~2.11/+4、2.3·2.12·2.13/+22、3.1~3.5/+4、3.6/(+4,+11)、3.8/+6、3.4/(+4,+22,+22) —— 与自述**逐项一致** |
| 锚点唯一命中（首非空行起、≤3 行窗口、全文精确匹配计数 = 1） | **27/29 成立**；`3.2 L1138`（需 4 行窗口）、`3.8 L2983`（需 6 行窗口）⇒ 与「展开窗口 1~3 行」的声明口径有偏差 ⇒ **N-2（P3）**；**主判据（逐行等价 + 新行号定位）不受影响** |
| 伴随订正 | `test/smoke.mjs` 两条注释内陈旧行号（`L5060-L5062`、`L2977-L2987` 各 2 处）已同步为新区间；`COMPAT-015 F3` 行号引用对账随 smoke 绿（297/0） |

---

## 6. 回归（独立复跑，非转述）

- `node test/smoke.mjs` → **297 passed / 0 failed**（含 `COMPAT-015 F3` 行号对账、`COMPAT-012 F5d`、`COMPAT-013 F1⑤`、`COMPAT-014 A-F9` README 计数 ≡ 297）。smoke 的 diff 为**注释行号副本同步**（4 行改动，零断言增删/放宽）。
- `node test/validate-preset.mjs` → **PASSED**（`schema-face: PASS`；`presetRowConfig` 双向 ⊆ 随绿）。
- `node --check` × 23 文件 → **0 失败**。
- `node scripts/probe-nv-ux012.mjs --falsifiability` → **PASS**（谓词 11、red 25 / ok 11、每谓词 ≥1 静态部署消费点）。
- 时间线自洽（防「测了非提交物」）：`lib/client.js` mtime **8:14:46**、`scripts/probe-nv-ux012.mjs` **8:21:22**（均早于绿态起跑 8:21:41）→ 提交 `addd934` 8:24:07 → 冻结探针复跑 8:24:18（`headDirty=false`）。⇒ **被跑的代码 = 被提交的代码**；提交后唯一改动为文档（`CHANGELOG.md` 8:23:50，在提交前）。

---

## 7. 冻结探针（CLEAN-004）读数复核

见 §0 表。补充结论：

- **无 PASS→FAIL / 无新增 FAIL**：与 `clean004-final`（R1 时点、head=874e5a1）逐条 `id:status` 序列**完全相同**（差异 0）。
- `D2-esc-bind-yield = PASS {modal:false, console:true}`（D-1 的冻结面判据仍成立）。
- 隔离与纪律：`realEnvVerdict.ok=true`、`strictDeltas={}`、`inventoryDeltaCount=0`、`leakSignature.pointsIntoIsolation=false`、`cleanup.rootRemoved=true`、`envErrors=[]`；探针自证 `falsifiability.allPass=true`（red 19 / ok 11）。
- `docs/evidence/CLEAN-004/**` 本批**零改动**（`git show --stat addd934` 无该路径；sha256 锚值未变）。

---

## 8. 探针自身两处缺陷的修复是否恰当（不掩盖）

| 修复 | 判定 | 依据 |
|---|---|---|
| ① 模板字面量注释内反引号「禁用」告警 + 未捕获异常入 `report.crash` | **恰当，提升了可见性** | `:1070-1075` catch 新增 `report.crash{message,stack,at}` + `assertion('UX012-CRASH', …, false)` ⇒ **异常仍为 FAIL ⇒ exit 1**，且错误原文/堆栈入报告（不再「只剩 3~4 条断言」）。`:661` 就地标注「注释内禁用反引号」。**实证**：`ux012-dbg/report-ux012.json`（8:20:54）`crash=true`、`UX012-CRASH=FAIL`、tally 5 条、`ok=false`、退出码非 0 ⇒ 该机制真被触发并如实留痕 |
| ② 模态缺席分支改「同形空值」+ 打开前置「只重试一次」并记 `modalOpenAttempts` | **恰当，未引入新真空 PASS** | 同形空值（`:662`）使消费端 `formBtns.length` 等不再抛错；且缺席时 `present:false`、`formBtns:[]`、`role:null` ⇒ A1/A2 直接**红**（非绿）。重试上限恒为 1 次（`:708-714`），重试后仍要求 `modalOpened===true` 及全部属性 ⇒ 不构成「重试到绿」；痕迹入 `facts.modalOpenAttempts`（绿态 = 1）。**遗留**：该字段未进 A1 断言 `detail` ⇒ **N-7（P3，留痕可见性建议）** |

---

## 9. 不变量 + AI 专项 5 项 + 真实环境纪律

**不变量**：`docs/evidence/CLEAN-004/probe-clean-004.mjs` sha256 = `de2de511…5b65`（**未变**）；`items[]` 49 / `regionLiterals` / `presetRowConfig` / `golden` 未变（§5）；`lib/client.js` 会话行 `disabled: busy`、`.nv-cbtns`、模态遮罩等被引用的既有事实与断言前提一致；产品树除 `.governance/**` 与 `docs/review/**`（治理/审查记录）外**无未提交改动**（`git status --porcelain`）。

**AI 代码专项 5 项（本批 diff 逐项）**

| # | 专项 | 结论 | 事实依据 |
|---|---|---|---|
| 1 | mock 残留 | **0** | diff 内 `mock` 仅 1 处**注释**（探针说明「不 mock 产品代码」）；产品面新代码零桩；探针 fixture（5 部书目 + `storages/workspace.json`）在隔离根内，属夹具非产品桩；HTTP 面用 CDP Fetch **真拦截/真放行**，非 mock |
| 2 | 硬编码返回值 | **0** | 新增产品代码仅「Esc 让位守卫」+ 注释；探针 red/ok 向量中的字面量（`'zGbnIq_input'`/`'BODY'`/`'nv-cplus'`）是**登记表向量**（CLEAN-004 R2 N-02 同源口径），部署侧一律 `evalPred(id, 测量值)`，无「写死绿」 |
| 3 | 幻觉 API | **0** | 新用 API 全部标准/真实：`store.get()`（模块函数）、`document.activeElement === document.body`、`hasAttribute('inert')`、`document.hasFocus()`；CDP 面 `Fetch.enable/requestPaused/continueRequest/disable`、`Input.dispatchKeyEvent`、`Emulation.setDeviceMetricsOverride` 均为真实域（本轮 `--falsifiability` 与既有 25 条运行报告互证） |
| 4 | 未实现 TODO | **0** | diff 内 `TODO/FIXME/XXX` 0 命中；无空实现、无占位分支；`--no-browser-head` 死开关已彻底删除（非「未实现」） |
| 5 | 过度实现 | **0** | 新增断言/谓词逐条可追溯到 R1 finding（C-1→C4 断言、C-3→`A6-focus-restore`、C-7→B3 + 谓词拆分、C-6→`formBtns`）；`retry-once`/`crash`/反引号告警均有实测动因（`ux012-dbg` 留痕）且已在注释披露 ⇒ 属**加固**而非投机抽象 |

**真实环境纪律**：diff 内**零**对 `C:\Users\peter\.dsh` 或仓库外路径的写入（`git show addd934 | grep '.dsh'` 无命中；探针仅 `readFileSync/statSync/createRequire.resolve` 真实 `$DSH_HOME`）；隔离方式 = 三选一之**第一项**（环境变量重定向至临时目录），`isolation.containment` 全真 + 子进程二次包含性校验 + 真实根只读前后指纹（`strictDeltas={}`）；隔离根收尾清理（`cleanup.rootRemoved=true`，两探针一致）；未终止任何用户进程（探针仅回收自身 spawn 的 `boot`/`edge`，`stopAll` 只对自有句柄 `kill`）。验收措辞按隔离口径（「隔离环境安装冒烟（环境变量重定向至临时目录）通过」语义），**未出现无限定语的「真实安装」类表述**。

---

## 10. 五维度逐项结论

| 维度 | 结论 | 事实依据 |
|---|---|---|
| **1 正确性** | **PASS** | C-1 守卫读实时值、分层语义可达且与 D-1/B-1 层级一致、原非面板路径保留（§2.2）；C-3 闸门只读、N-A 与红判据双向 fail-closed（§3.1）；C-9 删死输出后两消费点字段面自洽；边界：`busy` 守卫、`entryOpen` 让位、`store.get()` 空值语义（`bind !== null`、`entryOpen === true`）逐条实读 |
| **2 安全性** | **PASS** | 本批新增产品代码仅「早退守卫 + 注释」，**不新增宿主写调用**、不新增输入面/选择器字面量（P-10 面零扩展）；探针新增只读 DOM 读（`hasAttribute`/`document.hasFocus`/元素身份比较）；无 `innerHTML`/密钥/外部资源；未削弱 Esc 的可退出性 |
| **3 可维护性** | **PASS（P3 若干）** | C-11/C-12/C-13 三处「为何」注释与实现一致且事实可核；C-9/C-10 净删死代码；探针谓词 id 与部署面命名对齐（C-7）；残余：N-3/N-4/N-7 建议 |
| **4 性能** | **PASS** | 新增守卫为常数时间 `store.get()` 读（每按键 1 次，无循环/无订阅变更）；无新增轮询/监听（Esc 监听数量不变：4 条 keydown 全量核定 §2.2-4）；C-13 已消除不成立的性能宣称 |
| **5 测试覆盖** | **PASS（P3 缺口）** | 新增 C4（分栏态 Esc 分层）+ B3（绑定面板 busy）**真行为级**断言，且 C4 有红/绿双态实跑留痕（§2.4）；A6 由真空 PASS 转为「闸门 + 谓词」双保险；缺口：分层第二拍（非面板态 Esc 关分栏）无断言（N-5）、重试痕迹未入 detail（N-7） |

---

## 11. 新发现列表（每条含文件:行号 / 级别 / 事实依据 / 影响 / 建议）

> **P0 = 0**（硬门槛第 1 项通过）；**P1 = 0**；**P2 = 1**；**P3 = 6**；合计 7 条，每条带级别。

| # | 位置 | 级别 | 事实依据 | 影响 | 建议 |
|---|---|---|---|---|---|
| **N-1** | `scripts/probe-nv-ux012.mjs:11`（文件头）+ `CHANGELOG.md:46`（C-5 条目） | **P2** | 自述「**24 条断言** = 17 真驱动 + 3 DOM 读数 + 1 结构面 + 1 自证 + 2 隔离」；实测断言数 **25**（断言调用点 30 / 唯一 id 26，`UX012-CRASH` 仅异常路径 ⇒ 正常路径 25；`ux012-green` 与 `ux012-redproof` 的 `tally.total` 均为 **25**）。差额 1 条（A6/B2/A0 之一）未点名归属 | 记录性失真（与 R1 C-4 同类，落在两处**持久化**记录）：后续按「24 条」核对会对不上；「如实分类」的订正本身不自洽 | 两处改为 **25 条**并逐条点名归类（如把 `A2/B2` 的 DOM 属性读数口径写清、`A6` 归「真驱动（受闸门约束）」）；更进一步：在探针内加一条自检断言「分类桶计数之和 ≡ 断言条数」，把该口径纳入机检 |
| **N-2** | `lib/host-contract.mjs:79`（`revisions[]`）+ `CHANGELOG.md:48` | **P3** | 声明「范围首/末**非空行原文**在最终文件中**唯一精确命中**（展开窗口 **1~3 行**）」；我按「首非空行起、窗口不裁到范围末、全文精确匹配计数 = 1」重算：**27/29** 在 ≤3 行窗口内唯一，`3.2 L1138` 需 **4** 行、`3.8 L2983` 需 **6** 行（两处首非空行为 `}` / `noticeEl,` 之类高频行）⇒ 声明口径偏强 | 后续按该口径复算会得到 2 处「不唯一」而误判为漂移 | 把口径写明为「窗口扩展至唯一为止（本例最多 6 行）」或把这两处锚点换成更独特的内容行；主判据（29/29 逐行等价 + 新行号定位）无需改动 |
| **N-3** | `lib/client.js:3948-3965`（SplitWorkspace 守卫） | **P3** | 守卫语义 =「**本次派发时** `store.get()` 仍有面板 ⇒ 让位」；同一次 keydown 中若**面板监听先注册**（其后才开分栏），则面板监听先清 `bind`、随后分栏监听读到已清状态 ⇒ `closeWorkbench()` 仍会执行 = 反向序下「一键关两层」。可达性核查：面板遮罩 `.nv-modal-backdrop` 为 `position:fixed;inset:0;z-index:1000`（`:4811`）⇒ 面板在场时无法再点控制台/抽屉卡片开分栏 ⇒ **当前不可达** | 记录性边界：分层正确性当前**依赖注册顺序**这一隐式耦合；未来若新增「面板在场时也能开分栏」的入口即会复发 | 注释补一句反向序边界（与 C-12 同型处置）；或加固为「事件起点快照」（如 `keydown` 首次派发前统一裁决一层） |
| **N-4** | `scripts/probe-nv-ux012.mjs:888-896`（A6 测量/判定）+ `:113`（谓词） | **P3** | 后侧「落 body」读数 `escState.activeIsBody` 用**元素身份**（`:881`）但只入 `facts`/`detail`，谓词仍以字符串 `postFocus === preFocus` 判定（前侧 `preFocusIsBody` 已入谓词） | 判别力不受影响（守卫缺席 ⇒ `'BODY' ≠ preFocus` 必红），但「元素身份比较」在后侧未成为**判定事实源**，与 R1 C-3 ③ 的措辞存在细微落差 | 谓词补 `v.postIsBody !== true`（或把后侧身份读数纳入 `a6Measured` 并给出对应 red 向量），使身份口径前后对称 |
| **N-5** | `scripts/probe-nv-ux012.mjs`（C 段；`ux012-green` 断言集） | **P3** | 分层语义的第二拍「面板关后**再**按 Esc ⇒ 关分栏/创作台」及原路径「非面板态 Esc 关分栏」在**两套探针中均无行为级断言**（新探针 C4 只按 1 次 Esc；冻结探针仅以 ✕ 关分栏 `C8-close-x`）⇒ 该路径目前只靠 §2.2-3 的代码阅读保证 | 若日后守卫被误改为「永远 return」，现有断言集**不会变红**（覆盖盲区） | 补一条 `UX012-C4b`（红向量 = 守卫过宽/守卫缺席两态中「面板已关仍不关分栏」的形态），成本极低、与 C4 同场景续拍 |
| **N-6** | `lib/host-contract.mjs:147`（item `3.7` 的 `line: 'L884-886 等'`） | **P3** | 该字段两次重基均**未改动**（我独立深比较 = byte-identical）；但 `localStorage` 键实测在最终文件 **L968 / L975**（`874e5a1` 时点为 L964 / L971），L884-886 落在 `shouldCloseOnCurrentChange` 的注释块内 ⇒ 字段已不指向所声明符号（末尾「等」+ note「本项非范围形态，不入 ⑫b 范围条目计数」为其既有免责口径） | 记录性陈旧锚点（本 commit **未引入**，属重基范围外既有状态；`necessity: 'own'`，不影响任何机检） | 二选一：按机械法重基到 `L968 / L975`；或显式把该字段标注为「描述性、非锚点」（与 note 口径一致），避免读者按 L884-886 定位落空 |
| **N-7** | `scripts/probe-nv-ux012.mjs:708-714`（重试）+ `:738-741`（A1 detail） | **P3** | `modalOpenAttempts` 已如实入 `facts`（绿态 = 1），但 A1 断言 `detail` 未含该字段 ⇒ 若某次「首次点击未开窗、重试才开」被容忍，断言 detail 面上看不出 | 留痕可见性：审查者需下钻 `facts` 才知是否发生过重试（重试恒 ≤1 次，不构成「重试到绿」） | 把 `modalOpenAttempts` 并入 A1 `detail`（一行改动），使「是否依赖重试」在断言行即见 |

---

## 12. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 判定 |
|---|---|---|---|
| **P0 阻塞问题数** | = 0 | **0**（新发现 P2×1 / P3×6；R1 的 P1 已闭合） | **PASS** |
| **R1 的 C-1/C-3/C-4/C-5 逐条有处置判定** | = 100% | **4/4**（C-1 已修复且红/绿双态可核；C-3 已闭合（闸门 + 谓词 + 身份）；C-4 已闭合（29 处，三处文字）；C-5 **部分闭合**——措辞已改但计数不自洽 ⇒ N-1） | **PASS**（逐条有判定；C-5 残项以 N-1 记账） |
| **5 维度全覆盖 + 每条发现带级别** | = 100% | **5/5**（§10 逐维度有结论 + 事实依据）；**7/7** 新发现带 P0~P3 级别 + 文件:行 + 依据 + 影响 + 建议 | **PASS** |
| **设计一致性（P-10 / 契约零扩展 / 不变量）** | 已完成 | **已完成**：P-10 面本批零新增宿主耦合字面量（产品 diff 仅守卫 + 注释；`regionLiterals`/`presetRowConfig`/`golden` 逐字节未改；双向 ⊆ 随 smoke 绿）；契约**零扩展**（49 项、18 项 line 变化、其余字段零差异）；不变量（冻结 sha256 / items / 治理记录）全部未变 | **PASS** |
| **AI 专项 5 项** | 全部完成 | **5/5**（§9：0 / 0 / 0 / 0 / 0，逐项含依据） | **PASS** |

### 可用性结论（能否作为 CLEAN-007 终态）

- **可作为 CLEAN-007 的 R2 终态：`APPROVED_WITH_NOTES` / `unresolved_blockers=0`**。硬门槛 5/5 通过、P0 = 0、P1 = 0；R1 唯一的 P1（C-1）已修复并有红/绿双态留痕与本轮构造性推演互证；C-3 的真空 PASS 已转为「闸门 + 谓词」双向 fail-closed；二次契约重基经全量独立重算成立（29/29 逐行等价、Δ 分段一致、零扩展）；四道门禁与冻结探针独立复跑全绿且**无 PASS→FAIL**。
- **合并（rel-006/0.5.3 流程）建议**：可就地合并并 push（本批未 push，`main` ahead 2）。N-1（P2）建议**同批或紧随其后**订正两处文字（一行级改动，无需重跑探针）；N-2~N-7 为 P3，可登记为遗留项（建议随下次探针/契约维护批一次收口）。
- **不建议**再开新一轮返工：无 P0/P1，且所有残项均为**记录口径/留痕可见性/覆盖补强**类，改动不触及产品行为，可由下一次维护批或 CLEAN-008 类任务吸收。

---

## 13. 复核限制（如实披露，P-01）

1. **未独立复跑 UX-012 全量探针**（25 条）与红/绿双态：红态复跑必须临时修改 `lib/client.js`，超出本次只读边界（禁止改仓库任何文件）；本报告对「回退 ⇒ 必红」的判定 = **构造性推演（结构可判定）+ 留存报告/日志字段级核对**，非我本人实跑。
2. **红态工件（`0854e37a…` 的临时回退文件）未随证据保留**，无法独立重算该 sha256；`git worktree list` 仅剩主工作树。可核部分见 §2.4。
3. `node --check` 覆盖面 = 仓库内全部 `*.js`/`*.mjs`（23 个，为自述「14 文件」的**超集**），未逐个核对自述清单本身。
4. 本报告未审查治理记录（`.governance/plan-tracker.md`、`evidence-log.md`、`risk-log.md`、`review-CLEAN-007-R1.md`）的未提交改动内容——属 Coordinator 职责面，非代码审查范围。
5. 审阅过程未在被审仓库留下任何新增/修改文件；唯一写入 = 本报告。（审查期间在 `%TEMP%\clean007-verify\` 生成的临时 diff 转储已删除，证据目录状态与阅前一致。）

---

**证据索引（可复查路径）**：`git show addd934`、`git show 874e5a1:lib/client.js`、`lib/client.js:612-668 / 1606-1646 / 3390-3408 / 3837-3846 / 3948-3965`、`lib/host-contract.mjs:79 / 125 / 147 / 148`、`scripts/probe-nv-ux012.mjs:10-16 / 60-182 / 656-741 / 800-905 / 985-1056 / 1070-1126`、`test/smoke.mjs`（diff 4 行）、`CHANGELOG.md:34 / 36 / 41 / 46 / 48`、`docs/evidence/CLEAN-004/probe-clean-004.mjs`（sha256 锚）、`%TEMP%\clean007-verify\{clean004-final,clean004-rework}\report.json`、`%TEMP%\clean007-verify\{ux012-green,ux012-redproof,ux012-dbg,ux012-rework}\report-ux012.json`、`%TEMP%\clean007-verify\{green.log,red.log}`、`docs/review/CLEAN-007-R1.md`、`.governance/change-triage/BUG-010.json`、`.governance/review-CLEAN-007-R1.md`。
