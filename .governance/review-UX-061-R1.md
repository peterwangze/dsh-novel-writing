# REVIEW-UX-061-R1 — 工作台 UI 视觉重设计 · 阶段 1a（令牌桥批次）

```
REVIEW-UX-061-R1 NEEDS_CHANGE / unresolved_blockers=2
```

- **审查对象**：工作区未提交改动 vs HEAD `4ad3450`（3 文件：`lib/client.js` +174/−173、`lib/host-contract.mjs` +15/−10、`test/smoke.mjs` +53/−49）
- **判据来源**：`docs/design/UX-061-visual-directions.md` §1.3 / §2.1 / §4；DEC-155；项目原则 P-01/P-06/P-10
- **宿主令牌声明源（只读）**：`C:\Users\peter\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-client-ui-theme\lib\client.js`
- **审查日期**：2026-10-21
- **审查者**：Code Reviewer（独立，未参与实现；未修改任何产品代码，唯一写入 = 本报告）

---

## 一、独立核验（全部真跑，不采信实现者转述）

| # | 核验项 | 方法与结果 |
|---|--------|-----------|
| 1 | 宿主令牌声明集 | 自己 grep：`--dsw-(alias|shadow)-*` 去重 **111 项**（与实现者「107 项」不同——我按 alias+shadow 两族统计；差异不影响结论） |
| 2 | client.js 令牌集 | 去重 **15 项**：`bg-base` / `bg-layer-1` / `bg-overlay` / `border-l1` / `border-l2` / `brand-primary` / `interactive-bg-hover` / `label-primary` / `label-primary-foreground` / `label-secondary` / `label-tertiary` / `state-error-primary` / `state-success-primary` / `state-warn-primary` / `shadow-lv2` |
| 3 | **零幽灵** | 15/15 均在宿主声明集内；按令牌边界搜索 6 个旧幽灵（`fill-l1`/`state-accent-primary`/`state-success`/`state-warning`/`state-danger`/`bg-elevated`）在 `lib/client.js` 中引用数 **0/0/0/0/0/0**（`state-success` 的子串命中仅出现在合法的 `--dsw-alias-state-success-primary` 内） |
| 4 | 语义层单点性 | `--dsw-*` 在非注释代码中仅出现 2 处：`lib/client.js:4797`（唯一 `:root{}` 语义层定义）与 `:2616`（诊断探针的**正则字面量**）。其余 292 处调用点全部为 `var(--nv-*)` |
| 5 | 调用点规模 | `var(--nv-*)` 共 **292** 处；15 个语义色令牌全部有使用（accent 54 / fg 37 / fg-muted 29 / border-strong 25 / err 19 / fg-subtle 19 / bg 17 / ok 17 / surface 16 / warn 16 / surface-hover 15 / border 14 / on-accent 11 / shadow 2 / surface-raised 1） |
| 6 | 主按钮文字 | `color:'#fff'` 当前 **0** 处（HEAD 为 8 处）；`var(--nv-on-accent` **11** 处（L2016/2200/2246/2472/3038/4703/4709/4766 + L5061/5072/5075 规则） |
| 7 | 行为零变更 | `git diff` 中**新增行不含 `--nv-` 的行数 = 0** ⇒ 本批全部改动为样式/令牌替换，未动事件、轮询、数据流、渲染分支 |
| 8 | 门禁 | `node --check` ×3 = 0；`smoke` = **308 passed / 0 failed**；`validate-preset` = **PASSED**；`probe-face` = **28/28 OK**；`ci-mock-face` = **4/4 OK** |

## 二、阻塞项（P1 ×2）

### P1-1 契约 `revisions[]` 未追加本批修订 → `[nv-compat]` 诊断归因失真

- 证据：`lib/host-contract.mjs:85` 末项仍为 `{ task: 'BUG-011', … }`；全文件 `UX-061` 仅出现在 `:146`（2.14 note）、`:155`（3.4）、`:216`（注释），**`revisions[]` 无 UX-061 条目**。
- 机制（非风格问题）：`lib/host-boundary.js:347-348` `CONTRACT_TASK = hostContract.revisions.at(-1).task`，`lib/host-boundary.js:386` 的 `[nv-compat]` 告警与 index.js 诊断载荷的 `task` 均由该派生值生成。
- 契约自述义务：`lib/host-contract.mjs:45-46`「宿主耦合变更 MUST 同步本数组，值随任务跟进」；smoke 亦有 `COMPAT-004 F4` 断言该值为**派生而非硬编码**（`test/smoke.mjs:2906-2908`）——本批改了 3.4/cssTokens/2.3/2.13（均为宿主耦合面），却未同步派生源。
- 后果：本批合入后，缺面告警与诊断面板仍把宿主耦合问题归因到 `BUG-011`，污染排障归因（与该 F4 机制的设立目的正好相反）。
- 最小修复：追加一条 `revisions[]`（`task: 'UX-061'`，scope 含：cssTokens 13→15、面 3.4 重写为 `--nv-*` 语义层、2.3/2.13 行号 +1 重基、`lib/client.js` 净 +1 行）。若 1b 继续改动 `lib/client.js` 行数，需再次同步本条。

### P1-2 契约 item 2.12 行号未随本批 +1 漂移重基（漏项）

- 契约现状：`lib/host-contract.mjs:140` `line: 'L5208-5215'`（face 2，strict 面）。
- 实测：本批在 `lib/client.js:4797` 插入 `:root` 一行 ⇒ 其后整体 +1。HEAD 的 `const offServiceEvent = …` 在 L5208，现为 **L5209**；HEAD 的 `: null` 在 L5215，现为 **L5216**。当前 L5208 已是无关语句 `const rerender = () => store.set({})`，L5215 是 `})`。
- 同类处理对照：本批已正确重基 2.3（L5178-5180→L5179-5181）与 2.13（L5245-5277→L5246-5278）——**2.12 是同类漏项**，不是口径分歧。
- 最小修复：`line: 'L5209-5216'`。
- 为何未红（并据此提 P2-4）：`test/smoke.mjs` ⑫b（L2527-2549）判据②只要求「范围内至少一个候选命中」——起点漂到无关代码行但只要候选仍在范围内即绿；判据③只拒绝注释/空行边界；判据④只查终点截断。本批漏项正是从该缝逃逸。

## 三、P2（非阻塞，但需在 1b 或提交说明中显式处置）

1. **亮态状态色文本对比度（设计裁决项，需 Design Reviewer）**：按设计文档记录的宿主亮态值（§2.1 L166：success `#22c55e` / warn `#f59e0b` / error `#ec1313`），以 WCAG 相对亮度计算对白底（`bg-layer-1` 亮态 `#fff`）对比为 **2.28:1 / 2.15:1 / 4.50:1**；而 `color:var(--nv-ok|warn|err)` 作为**文本色**被使用 **21 处**（如 `lib/client.js:4973/5020/5042/5044/5046/5068/5087/5088/5096/5097/5145/5146/5147/5149`，11–12px）。设计文档 §4 目检#2 要求「正文与次要文本 ≥4.5:1、装饰性 caption ≥3:1」⇒ 该项在现状下不可通过。**本批不构成新回归**（改前亮态整体落在暗色兜底面上，文本对比更差），但 **A 迭代不得在该项未裁决前宣称验收通过**。方向：文本档单列 `--nv-ok-text/--nv-warn-text/--nv-err-text`（宿主已有 `--dsw-alias-state-warn-label` 等 label 档，采用前须逐主题实测取值），或 `color-mix` 与 `--nv-fg` 混合压暗；图形/色点档另行核对 ≥3:1。
2. **24 个尺度令牌已定义未使用**：`--nv-fs-*`×7、`--nv-sp-*`×7、`--nv-r-*`×5、`--nv-ctl-*`×2、`--nv-lh-*`×3 全部只在 `:root`（L4797）定义、零引用。作为 1b 前置脚手架可接受，但：①验收标准 §4-3「尺度白名单」**未达成**；②提交/CHANGELOG 必须标明「已定义未启用」，避免被读作已交付。
3. **F8 丢失数量 tripwire**：原断言为 `srcTokens.length === 13 && rl.cssTokens.length === 13`（硬 golden），现改为 `srcTokens.length === rl.cssTokens.length && rl.cssTokens.length > 0`。双向相等仍保留，但「两侧同时删除一项」将由红变绿。建议补 `rl.cssTokens.length === 15` 或等价 golden。
4. **契约清单无宿主声明核验面**：F8 只对 `lib/client.js ↔ 契约`，契约清单是人工事实源；若把不存在的令牌**同时**加进两侧，当前仍绿。建议仿 `host-surfaces` fixtures 增一份宿主主题令牌声明快照并在 CI 对账（或在 compat 探针加一项）。
5. **设计规范的 `--nv-font` 未落地**：设计文档 §2.1 L168 要求 `--nv-font: var(--dsw-font-family)`；实现未定义（`--nv-font` 0 处），契约 3.4 note 已披露「`--dsw-font-family` 暂未引用，提取正则扩展留 UX-062」——披露可接受，但属 A 未完成项，须列入 1b 或显式变更设计范围。
6. **`ensureStyle()` 存量标签 no-op**：`lib/client.js:5159-5160` 对已存在的 `#novel-writing-style` 直接返回空清理函数、不刷新 `textContent`；HMR/升级残留旧标签时新 `:root` 语义层缺失 ⇒ 全部 `var(--nv-*, 暗色兜底)` 静默落回暗色（亮态下静默变形）。属既有形态，但令牌层放大了后果。最小修复：命中已有标签时仍重写 `textContent = NV_STYLE`（幂等且消除陈旧面）。

## 四、P3

- 注释失准：`lib/client.js:89` / `:944` / `:4795` 仍称「全量 `var(--dsw-alias-*, 兜底)`」，现实现为 `--nv-*` 语义层。
- `diagStyleProbe()`（`lib/client.js:2616`）仍以 `var(--dsw-` 计数判 `ok: vars > 0`：语义已漂移（现仅 `:root` 15 处），若日后映射移出 `NV_STYLE` 会误报 0（不静默但误判）。
- 规则内二级兜底仍为旧暗色值（如 `#3a4150`、`rgba(255,255,255,.05)`）：现仅在 `:root` 缺失时生效，与亮态语义相反；建议 1b 统一。
- 验收 §4-2「无裸色值」口径：当前直接 hex 属性值 **0 处**；仍有 24 处 `background:rgba(...);background:color-mix(...)` 双声明（UX-053 既有兜底形态）与 2 处遮罩 `rgba(0,0,0,.45)`（DEC-023 豁免）。建议设计文档把「双声明兜底」写入豁免口径，否则字面判据读作未达成。
- `GHOST_TOKENS` 为硬编码文档清单；实际守卫力来自双向相等，保持即可（勿把清单当唯一防线）。

## 五、守卫强度专项（负例推演）

- **真实负例**：在 `lib/client.js` 新增一个宿主不存在的令牌（如 `--dsw-alias-nope`）⇒ `srcTokens`=16 vs 契约 15 ⇒ 双向相等失败 ⇒ **必红** ✓
- **提取面真实性**：`test/smoke.mjs:2156` `codeOnly` 剥离块注释与整行 `//` 后，`:2216` 从 `clientSrc` 正则提取 —— 是**源码提取**而非契约自证 ✓
- **残余缝**：契约侧无宿主声明核验（P2-4）；两侧同改可绕过（P2-3）。

## 六、守卫是否被放宽

逐条比对 `test/smoke.mjs` diff：除令牌名替换外，仅删除 4 行（旧 F8 硬计数 `=== 13`、对应断言尾、一行 stale 行号注释）；新增 ghost 断言与 15 项语义。**未发现既有守卫被削弱或删除**；唯一强度损失见 P2-3。

## 七、契约登记正确性

| 契约项 | 判定 |
|---|---|
| 3.4 改写（语义层 + 15 令牌） | ✅ 与实现一致；anchors `L946-958 / L4797 / L4910 / L5053` 逐行实测相符 |
| `cssTokens` 15 项 ↔ client.js | ✅ 双向相等（我独立计算，非转述） |
| 2.3 `L5179-5181` | ✅ 实测相符（+1 重基正确） |
| 2.13 `L5246-5278` | ✅ 实测相符（终点仍为末次 register 的 `))`） |
| 2.12 `L5208-5215` | ❌ 漂移（P1-2） |
| `revisions[]` | ❌ 未同步（P1-1） |

## 八、`待验证`（不视为通过）

- **浏览器目检**：明/暗双主题 + 合成主题注入、4 关键视图（管理台网格 / 创作台正文 / 数据面板 / 侧栏抽屉）、七态（hover/active/focus-visible/disabled/loading/empty/error）——本审查无浏览器与截图，全部 **`待验证`**。
- **对比度实测**：P2-1 的数值按设计文档记录的亮态取值计算；若宿主实际亮态取值不同，结论需重算（须在真实主题下取 `getComputedStyle` 值复核）。
- **1a 交付并未带来「重设计观感」**：验收 §4-3/4/5/6/7 与 §2.1 的组件级改法（书卡去渐变、数据面板标题、控制流条类化、尺度白名单落地）均**不在本批**；本批只解决「令牌桥 + on-accent」。因此 **A 迭代整体验收未达成**，不得据此宣称视觉重设计完成。

## 九、1b 前置条件（供 Coordinator/Design Reviewer 使用）

1. 修复 P1-1（追加 revisions 条目）与 P1-2（2.12 行号）；
2. **Design Reviewer 裁决** P2-1（状态色文本档）与 P2-5（`--nv-font` 归属 1b 还是 UX-062）；
3. 尺度系统应用与组件级重做时，**同步重基全部 `lib/client.js` 行区间**（本批 2.12 漏项证明该风险真实，建议以脚本枚举契约内全部 `L####-L####` 并逐项核对）；
4. 建议 1b 增强 ⑫b：增加「起点行须属于所声明构造（或命中声明的合法前导注释形态）」判据，堵住 P1-2 的逃逸缝。

---

**结论**：`REVIEW-UX-061-R1 NEEDS_CHANGE / unresolved_blockers=2`（P1-1、P1-2 均为一行级修复；P2/P3 记录不阻塞）。修复后请发 R2 复审（delta：本报告 §二 两项 + 新增改动），并保持同一 Reviewer。
