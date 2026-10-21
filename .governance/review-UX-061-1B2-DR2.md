# REVIEW-UX-061-1B2-DR2 — 1b-2 窄口径设计复审（模态输入 padding + §7.4 修订）

**审查日期**：2026-10-21
**审查对象**：工作区未提交改动（`lib/client.js` 的 `.nv-cinput` / `.nv-cmodal .nv-cinput` 规则、`docs/design/UX-061-visual-directions.md` §7.4、`test/smoke.mjs` 基线守卫）
**前轮**：`REVIEW-UX-061-1B2-DR1 APPROVED_WITH_NOTES / 0`
**本轮范围（窄）**：① 模态输入垂直 padding 8→5 的取舍裁决；② §7.4 修订准确性；③ 内联 44 处顺序延后确认

**结论：`REVIEW-UX-061-1B2-DR2 APPROVED_WITH_NOTES / unresolved_blockers=0`**

---

## 一、模态输入垂直 padding 8→5px → **接受 5px（两档统一为 32）**

### 事实（我读到的实现）
```css
.nv-cinput{box-sizing:border-box;min-height:var(--nv-ctl-md);padding:5px 8px;…}
.nv-cmodal .nv-cinput{padding:5px 10px;font-size:var(--nv-fs-card)}   /* 垂直 5 / 水平 10 */
```
- `box-sizing:border-box` **已在位**（这就是 CR1 那个 content-box P1 的根修）——先把根因修掉，再谈 padding，顺序正确。
- 模态输入字号 13.5px（`--nv-fs-card`），垂直 padding 若要落在 32 档，5px 是可用区间；8px 会把它推到 34~36px（Code 报 36）。

### 裁决：**接受 5px**，理由
1. **档位一致性优先**：设计系统只有 28/32 两档；为模态单独留 36px 等于引入**第三档**，以后每个新控件都要问「我在模态里还是页面里」，规则会腐化。
2. **5px 垂直 / 10px 水平不违反设计规格**：规格只定义高度档（28/32），未规定 padding 比例；13.5px 字 + 5px 垂直 ≈ 32px 的紧凑输入，与 Linear/GitHub 一类的紧凑控制密度同级，中文行高下仍可读。
3. **8px + 36px 的方案代价更高**：需要「模态例外」登记，且例外天然扩散（下一个模态控件也会要求 8px）。

### 但它**不是同一类问题的彻底解法**（必须讲清）
- 本次修的是**盒模型错位**（content-box 使 min-height 变成内容高）——已根治。
- 我 DR1 提的「同排 3~4px 高差」**仍然存在**：模态里 `.nv-cinput` 32 vs `.nv-cbtn` 29（`.nv-cbtn` 仍取 `--nv-ctl-sm`）。5px padding 解决的是「输入自身落档」，不是「同行同级」。
- **处置**：把「**同一表单行内控件 MUST 同档**」写成 §7.4 规则（见下）；G-5 目检若判定这 3px 可见 ⇒ 预批准的 1 行修复：`.nv-cmodal .nv-cbtn{min-height:var(--nv-ctl-md)}`。若目检判定不可见 ⇒ 作为**已知偏差**记录在 §7.4，不得宣称「高度完全统一」。

---

## 二、§7.4 修订 → **基本准确，但缺两处（P2 + P3）**

### 已核实为真
- 口径限定「唯一数值来源 / 字面量白名单 / 尺度外值归并**只约束 CSS 规则**」——与我的 V-2 裁决边界一致 ✅；
- 内联基线 **44 处（11px×12 / 12px×23 / 13px×6 / 14px×1 / 11.5px×2）**——我独立统计**逐项一致**（合计 12+23+6+1+2=44）✅；
- 盒模型约束（`<button>` 默认 border-box、`<input>` 默认 content-box ⇒ 输入类 MUST 显式 border-box）✅；
- `.nv-cfold` 22→28（+6）标注为「有意布局变化」✅；
- 14→15 两处实测落位：`lib/client.js:5135`（`.nv-content h3`）/ `:5143`（`.nv-hero-btn`）均已是 `var(--nv-fs-body)` ✅；
- 「内联 11.5×2 待 1b-3」与基线守卫生效（`INLINE_FS_BASELINE='11.5px:2,11px:12,12px:23,13px:6,14px:1'`，新增/变更即红）✅。

### 缺的两处（需补，非阻塞）
1. **P2：缺「同排同档」不变量 + 缺按钮实测值**。§7.4 现写 `ctl-sm = min-height 下限 / ctl-md = 输入类固定档`，但没有说「同一表单行控件 MUST 同档」，也**没有列出 `.nv-cbtn` 29 / `.nv-csortbtn` 32 / `.nv-cinput` 32 的实测并排事实**（协调者转述里有这几个数，文档里没有）。后果：后来者会以为「都用了两档 ⇒ 高度必然一致」，而事实是 28 的下限常被内容撑到 29~32。**要求**：§7.4 增加一段「实测高度表（环境= headless Edge + 规则直接抽取 + 日期）」并把按钮 29/32 如实写进去。
2. **P3：「输入类固定档」措辞**。建议改为「输入类**目标档 32**（border-box + 实测 32）」并补一句「若需**精确**高度 MUST 用 `height` 并统一 `border-box`，不得依赖 `min-height`」。

**结论**：现在这版**足以阻止「28/32 是精确高度」的误读**（因为写了 min-height 下限 + 盒模型约束 + 实测 32），但**不足以阻止「同档即等高的误读」**，补上第 1 点即可。

---

## 三、内联 44 处顺延 1b-3 → **接受，附两个条件**

- 我的 V-2 验收口径原文是「CSS 侧收敛」，内联 `fontSize` 是**新发现的覆盖面**（我 DR1/DR2 的统计正则只覆盖 `font-size:` CSS 规则，漏了 JS 内联样式对象）——属我口径不足，不计 Developer 欠账。
- **接受顺延，条件**：
  1. **ratchet 已生效**（我核实 `INLINE_FS_BASELINE` 冻结 + 新增/变更即红）——不允许在顺延期间新增或变更内联字号；`11.5px×2` 必须在 1b-3 内降到 0 或归类；
  2. **1b-3 的验收口径写死**：44 → 0 文本内联字号（或显式白名单：仅图标/字形），smoke 断言从「基线冻结」升级为「归零/白名单」；同时把 CSS 侧的「图标白名单」口径合并为同一条规则，避免两套。
- 单独提示：内联 13px×6 与 14px×1 也是尺度外值（7 档为 11/12/13.5/15/17/20/28），1b-3 迁移时按就近档归并（13→13.5、14→15）。

---

## 四、门禁（我实跑）

`node scripts/verify-contrast.mjs` → **FG_MUTED_ROWS=4 / V3_BELOW_4.5=0**，exit 0；`node scripts/verify-contract-anchors.mjs` → **76 段 / FAIL 0 / WARN 24**，exit 0；`node test/smoke.mjs` → **309 passed / 0 failed**，exit 0。

**待验证（本审查无浏览器，不冒充实测）**：`.nv-cinput` 32 / `.nv-cmodal .nv-cinput` 32 / `.nv-cbtn` 29 等高度为 **Code 侧 headless Edge 实测值**，我仅核实了 CSS 声明（border-box 在位、padding 5px 10px、min-height 32）与之自洽；实际渲染高度需 G-5 或 Code 复测。

---

## 五、1b-2 提交限定语 —— 需增补 3 条（其余沿用 DR1 定稿）

在 DR1 的限定语基础上追加：
```
8. 盒模型修复（CR1 P1）：.nv-cinput 已显式 box-sizing:border-box；模态输入垂直 padding 8→5px（水平 10px），
   目标是让输入类统一落在 32 档——这是把「第三档 36px」排除在外的设计取舍（Design 已裁决接受 5px）。
9. 已知偏差：同一表单行内 .nv-cinput(32) 与 .nv-cbtn(实测 29) 仍有 ~3px 高差（min-height 是下限不是精确值）；
   G-5 目检判定可见时按预批准 1 行修复（.nv-cmodal .nv-cbtn → var(--nv-ctl-md)），不可见则作为已知偏差记录。
10. 内联字号：44 处基线已冻结（新增/变更即红），全量迁移登记 1b-3（含 11.5px×2 与 13/14px 尺度外值）。
```

---

## 六、备注与后续

- P2：§7.4 补「同排同档」不变量 + 实测高度表（含按钮 29/32）。
- P3：§7.4「输入类固定档」措辞 → 「目标档 32（border-box + 实测）」+「精确高度用 height」。
- 相关但不在本轮：`.nv-cmodal .nv-cinput` 用 13.5px 字号、基础 `.nv-cinput` 用 `font:inherit`——两处字号来源不同，1b-3 迁移内联字号时一并统一。
- 阶段 2 启动判断不变（DR1 已给：可以启动；10 个未启用令牌归阶段 2，未消费即删）。

**待验证**：实际渲染高度（Code 实测值待 G-5 复测或多环境复现）；明暗主题下模态输入的视觉密度（5px 垂直 padding 的观感）。
