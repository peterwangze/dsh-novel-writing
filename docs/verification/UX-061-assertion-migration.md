# UX-061 阶段 1b — 设计断言迁移表（待 Design Reviewer 裁决）

> 本表是 **给 Design Reviewer 的裁决材料**，不是自签结论。状态统一为「待裁决」。
> 依据：`docs/design/UX-061-visual-directions.md` §2.1（方向 A）· §4（验收）· DEC-155（用户裁决：A→B / 布局授权 / 范围边界）。
> 代码侧已由 Code Reviewer 复审（REVIEW-UX-061-R1/R2/R3 链）覆盖「不改行为、守卫不弱化」；**设计层"是否接受新判据"须 Design Review 单独裁决**。

## 1. 被 DEC-155 显式替代 / 改写的既有断言

| # | 旧断言（来源） | 旧判据 | 新判据（1b 实现） | 替代依据 | 状态 |
|---|---|---|---|---|---|
| M-1 | UX-055① 字阶悬崖（smoke `客户端源码面：UX-055①`） | `meta: 11` | `meta: 12`（`TYPO.meta` 单点 + 3 处引用面不变） | DEC-155：可读性下限；11px 中文正文次要信息在 100% 缩放下不足 | 待裁决 |
| M-2 | UX-053 光效收敛（smoke `客户端源码面：UX-053 光效收敛`） | 书卡基态必须有 `linear-gradient(135deg, color-mix(fg 4%) …)` + `box-shadow:0 1px 3px rgba(0,0,0,.15)` | 书卡基态 = `background:var(--nv-surface)` + `box-shadow:none` + `border-radius:var(--nv-r-xl)`；渐变断言改为**负断言**（`!includes('background:linear-gradient(135deg,color-mix(…4%…')`）；glow（data-glow 顶部 2px 条）与 focus 双环断言**原样保留** | DEC-155 方向 A：去渐变/去重阴影，表面层级改由 `--nv-surface` / `--nv-surface-hover` 承担；设计文档 §2.1「书卡」条目 | 待裁决 |
| M-3 | UX-055③ 白 alpha 渐变清零（smoke `客户端源码面：UX-055③`） | hover 必须含 `color-mix(fg 7%)` 渐变 | hover = `border-color:var(--nv-accent)` + `background:var(--nv-surface-hover)`；白 alpha 零残留的**负断言保留** | 同 M-2（渐变整体撤除后，7% tint 不再存在） | 待裁决 |
| M-4 | （新增，无旧断言）状态色文本档 | 现状：`color:var(--nv-ok|warn|err)` 直接用于 11–12px 文本；亮态实测 success 2.28 / warn 2.15 / error 4.50 : 1（均 < 4.5） | 新增 `--nv-ok-text` / `--nv-warn-text` / `--nv-err-text` = `color-mix(in srgb, <state> 62%, var(--nv-fg))`；文本用法全部改引用 `-text` 档；非文本用法（background/border/box-shadow）保持原令牌 | 设计文档 §4 目检#2「正文/次要文本 ≥ 4.5:1」；宿主仅提供 `state-warn-label`，success/error 无 label 档 ⇒ 派生 | 待裁决（对比度数值见 §2） |

## 2. 对比度计算（可复现）

公式：`color-mix(in srgb, S 62%, F)` 按不透明通道线性加权；WCAG 2.x 相对亮度 + `(L1+0.05)/(L2+0.05)`。明态 bg `#ffffff` / fg `#0f1115`；暗态 bg `#0b0e14` / fg `#f9fafb`。

| 主题 | 令牌 | 原始状态色 | 原始对 bg | 派生文本色 | 派生后对 bg |
|---|---|---|---|---|---|
| light | `--nv-ok-text` | `#22c55e` | 2.28 | `#1b8142` | **4.92** ✅ |
| light | `--nv-warn-text` | `#f59e0b` | 2.15 | `#9e680f` | **4.73** ✅ |
| light | `--nv-err-text` | `#ec1313` | 4.50 | `#981214` | **8.64** ✅ |
| dark | `--nv-ok-text` | `#22c55e` | 8.48 | `#74d99a` | **11.16** ✅ |
| dark | `--nv-warn-text` | `#f59e0b` | 8.99 | `#f7c166` | **11.75** ✅ |
| dark | `--nv-err-text` | `#ec1313` | 4.29 | `#f16b6b` | **6.49** ✅ |

复现：`.scratch-ux061b/contrast.mjs`（1b 交付时临时脚本；如需长期保留请移入 `scripts/`——本表给出公式与全部输入值，可独立复算）。

## 3. 未改动、仍需裁决的既有设计断言

| # | 断言 | 为什么没动 | 状态 |
|---|---|---|---|
| N-1 | UX-055② 书卡 monogram 40×40 / 数据 chips 6%/9% | 不在 1b 范围（书卡只做去渐变/去阴影）；保留原断言 | 不动 |
| N-2 | UX-053 焦点双环（2px bg + 4px accent 60%） | 可访问性面，未触碰 | 不动 |
| N-3 | UX-053 glow（data-glow need/done/busy 顶部 2px 条） | 状态语义仍成立，未触碰 | 不动 |
| N-4 | 抽屉/章节/发布等其余设计断言 | 未触碰对应规则 | 不动 |

## 4. 1b 未交付项（不谎报）

| 项 | 状态 | 原因 |
|---|---|---|
| 数据面板标题 14→20px | **已完成（DR2 后订正）**：`lib/client.js:2173` 定向 `{ ...title, fontSize: TYPO.page }` | **理由订正（DR2）**：初始判断「无独立规则、硬改会越界」不成立——`:2173` 的 `style: title` 可用 spread + 显式覆盖定向到 20px，共享 `title` 对象不被污染；`TYPO.page` 走 `--nv-fs-display`=20px 单源 |
| 尺度令牌全量启用 | **1b-2 后：26 定义 / 16 启用 / 10 未启用** | 启用面：`--nv-fs-*` 9 档全部在用（含 caption 承接 10/10.5px）、`--nv-ctl-sm/md` 6/1 处、`--nv-sp-1/2`、`--nv-r-xl`、`--nv-lh-tight/reading`。**未启用 10 个**：`--nv-sp-3..7`（5）/ `--nv-r-sm/md/lg/pill`（4）/ `--nv-lh-normal`（1）——属方向 B（布局节奏：正文 measure、控制条 rail、间距/圆角重构）的直接消费者面，随阶段 2 落地；在阶段 2 前它们**不参与验收**，也不得被新代码引用后无断言。 |
| 浏览器目检（明/暗/合成主题、4 视图） | **未做（待验证）** | 本环境无浏览器；不得据此宣称视觉验收通过 |
| UX-053/055 全套断言重写 | **未做** | 仅迁移 M-1~M-3 三条；其余保持原样 |

---

## 5. 双审返工后的更新（DR1 / CR1 裁决回应）

> §2 的 62% 数值已被本节 58% 复算取代（保留作修订痕迹）。

### 5.1 M-4 复算（58% × 三承载底色；**双声明已废弃，现行机制见 §5.4**）

- 文本令牌：`--nv-ok-text/--nv-warn-text/--nv-err-text`；
- 形态（**修订痕迹**——其中的双声明写法已按 §5.4 删除，现行为单条 `color-mix(58%)`）：~~`--nv-X-text: var(--nv-fg);`~~ → `--nv-X-text: color-mix(in srgb, var(--nv-X) 58%, var(--nv-fg));`；
- 用量：纯文本 `color: var(--nv-X-text)`；**非文本（点/边框/底 tint）一律用状态原令牌** `--nv-X`（CR1 P1-1 回退：`.nv-dot[data-st=*]` border-color ×3、`.nv-cico-del:hover` border-color、`.nv-cdot[data-bound=*]` currentColor）。
- 口径：文本档 = 对比度 ≥4.5:1；非文本 = ≥3:1（UI 组件，与文本档分离）。

| 主题 | 令牌 | 测量底色 surface | tint 8% | tint 12% |
|---|---|---|---|---|
| light | `--nv-ok-text` | 5.45 | 5.08 | **4.92** |
| light | `--nv-warn-text` | 5.18 | 4.87 | **4.72** |
| light | `--nv-err-text` | 9.27 | 8.12 | **7.63** |
| dark | `--nv-ok-text` | 9.34 | 8.19 | **7.65** |
| dark | `--nv-warn-text` | 9.85 | 8.53 | **7.89** |
| dark | `--nv-err-text` | 7.63 | 6.95 | **6.55** |

复现：`node scripts/verify-contrast.mjs`（18 组 / BELOW_4.5=0；输入值内联在脚本头，来源标注同 §5.2）。

### 5.2 基准值来源与待验证

- light：surface `#ffffff` / fg `#0f1115` / state `#22c55e`·`#f59e0b`·`#ec1313`；
- dark：surface `#232324`（宿主 bg-layer-1）/ fg `#f9fafb` / error `#f25a5a`（宿主暗态实值）；
- **已核实（CR2 结论）**：主题包内 `state-success-primary` / `state-warn-primary` 为单一静态 alias 值、无 light/dark 双值 ⇒ 不存在暗态覆盖；暗态比值按同一 state 值计算，低值仍为 6.55。

### 5.3 P1-D2 尺度收敛结果

- `TYPO` 已改为「语义名 → `--nv-fs-*`」唯一映射（JS 侧不持 px）；新增 `--nv-fs-chapter:16px` / `--nv-fs-stat:18px` 两档；
- 消费面：`TYPO.*` 实测 **14 行 / 16 次引用**（原记「15 站点 / 18 次引用」经 DR3/CR3 复核为误，按实测订正）、`--nv-fs-*` 由 `TYPO` 与 `.nv-wfchip` 消费；`--nv-sp-*` 2 处、`--nv-r-*` 1 处、`--nv-lh-*` 2 处、`--nv-ctl-*` **6 处（sm）+ 1 处（md）**（1b-2 启用；CR1 后 `.nv-cinput` 补 `box-sizing:border-box`）；
- **未收敛**：CSS 内仍有 `font-size` 字面量（48 处基线；含 10 / 10.5 / 11.5 等尺度外值）。处置建议：逐条归入尺度或列入豁免清单 → **列入本表待裁决**（DR2 项），不得静默保留。
- **1b-2 已收口（2026-10-21）**：48 处字面量 → **映射 39 处到 `--nv-fs-*`**（caption/base/card/body 四档），**剩 9 处为图标/字形尺寸**（`.nv-drawer-title-ico` / `.nv-console-title-ico` / `.nv-csearch-icon` / `.nv-bar .nv-mini` / `.nv-console-head .nv-mini` / `.nv-ccard-mono` / `.nv-cico` / `.nv-bar-ctl` / `.nv-cplus-icon`），由 smoke 新检查「font-size 字面量 ⊆ 图标白名单」机检；尺度外值去向：10 → caption(11)、10.5 → caption(11)、11.5 → base(12)。

### 5.4 M-4 降级机制（P2-4 选 B）

- 已删除「`--nv-X-text: var(--nv-fg)` + color-mix」的**双声明**：自定义属性后声明恒胜、首声明永不生效（死代码）；
- 选 **B（如实降级）**：不支持 `color-mix` 时，使用点 `var(--nv-X-text)` 代入失败 ⇒ `color` 继承父色（对比安全、状态语义丢失），已在代码注释与本表说明；
- 消费写法已统一为无兜底的 `var(--nv-X-text)`（原先两种形态混用）。

### 5.5 未决 / 待裁决

| # | 项 | 状态 |
|---|---|---|
| V-1 | `--nv-ctl-*` 两档无消费者（DR1 P1-D2 要求必须有真实消费者） | **已完成（1b-2，方案 A 落地）**：`--nv-ctl-sm` 消费者 6 处（`.nv-cbtn` / `.nv-cbtn-accent` / `.nv-cfold` / `.nv-csortbtn` / `.nv-wfctl-btn` / `.nv-wfctl-btn2` 的 `min-height`）+ `--nv-ctl-md` 1 处（`.nv-cinput` 的 min-height）；smoke 断言消费数 ≥3/≥1 |
| V-2 | 尺度外字号 10 / 10.5 / 11.5 与其余 CSS 字面量（实测 48 处） | **已完成（1b-2）**：48 → 39 映射 + 9 图标白名单（见 §5.3）；smoke 新增机检「字面量选择器 ⊆ 图标白名单」；`--nv-fs-caption` 承接 10/10.5、`--nv-fs-base` 承接 11.5 |
| V-3 | `--nv-fg-subtle` 用于 10–11px 信息文本（`client.js:4923` 10px / `:4964` 11px / `:5022` 11px 可点击折叠；亮色 3.71:1） | **已完成（1b-2，含同类泛化 P-05）**：3 处点名 + 8 处同族 `<12px`（`TK.text3` 的 7 个 11/11.5px 内联消费点（L2432/2781/2792/2801/2820/3197/4725）、`.nv-empty` 11px、`.nv-diag-chip[data-tone=none]` 11px）+ 8 处 ≥12px 文本规则（`.nv-card-sub` / `.nv-badge` / `.nv-bgroup-count` / `.nv-csearch input::placeholder` / `.nv-ccard-badge` / `.nv-ccard-status` / `.nv-ccard-data` / `.nv-cmeta`）全部改 `--nv-fg-muted`；**`--nv-fg-subtle` 现仅保留非文本用法**（icon/dot/边框 + `:root` 定义，共 6 处）。对比度：muted 亮 **5.80** / 暗 **10.42**（subtle 亮 3.71 不合规，暗 7.36 合规）；`scripts/verify-contrast.mjs` 增 V-3 段（4 行；改前基线亮 3.71 保留为对照，不计失败） |
| V-4 | `.nv-wfchip` 定义 5 档、消费 3 档 | 已删 `warn`/`ok` 死规则（C6） |
| V-5 | chip `line-height:var(--nv-lh-tight)`(1.45) 属新增视觉值（原继承父行高） | 已披露（C6） |

### 5.6 R3 双审（DR3 / CR3）遗留项 → 1b-2 承接

| # | 项 | 依据 | 验收口径 |
|---|---|---|---|
| G-1 | 守卫形态增强：现负断言只覆盖单引号 `'px`；应扩 `["']` + 模板 `${TYPO.x}px`，并补产出形状断言 `!/var\(--nv-[a-z-]+\)px/` | DR3 P3-③ / CR3 残留缺口（当前源码两者皆 0） | **已完成（1b-2）**：UX-055① 增三条负断言（单/双引号、模板字面量、`var(...)px` 产出形状）；构造证明三形态分别注入 → smoke 均 `FAIL UX-055①` → 还原后 309/0（hash 校验一致） |
| G-2 | `@supports (color: color-mix(...))` 优雅降级 | DR3 接受方案 B 的触发条件（若需支持 Chromium<111） | **决定：不采纳（维持方案 B）**；触发条件已登记：若目标宿主需支持 Chromium<111 则改 `@supports` 并单独登记 |
| G-3 | `wfchip` 三档语义（muted / running / err）写入设计用法说明 | DR3 P3-④ | **已完成（1b-2）**：`docs/design/UX-061-visual-directions.md` §7.1（含「完成/警告」态重新引入的前置条件） |
| G-4 | 设计用法说明 2 条：`border-l1` 禁用于分隔/层级边界（亮色近不可见）；hover 可感知性定义 = 边框/前景变化（tint 单独 1.11:1） | DR2 M-2/M-3 附条件 | **已完成（1b-2）**：设计文档 §7.2（border 令牌边界）与 §7.3（hover 可感知性定义），另增 §7.4（尺度/控件令牌口径） |
| G-5 | 浏览器真机目检（明/暗/合成主题 × 4 视图 × 七态 + 真实取色） | DR3 限定语④ | **未做（待验证）**：本环境无浏览器；目检前不得宣称 A 迭代验收通过 |
---

## 6. 1b-2 收口记录（2026-10-21，Developer 交付 · 待 Code/Design 复审）

**范围**：V-1（控件高度令牌落地）· V-2（尺度字面量归零/白名单）· V-3（浅色小字号信息文本合规）· G-1（守卫形态增强 + 构造证明）· G-3/G-4（设计用法说明）。G-2 决定维持方案 B（不采 `@supports`）。

### 6.1 数字（可复跑）

| 指标 | 1b 基线 | 1b-2 结果 |
|---|---|---|
| CSS `font-size` 字面量 | 48 | **9（全部为图标/字形选择器，smoke 白名单机检）** |
| 映射到 `--nv-fs-*` 的文本字号 | 0 | **39**（10→caption、10.5→caption、11→caption、11.5→base、12→base、13→card、14→body、15→body） |
| `--nv-ctl-sm` / `--nv-ctl-md` 消费者 | 0 / 0 | **6 / 1**（`.nv-cbtn` / `.nv-cbtn-accent` / `.nv-cfold` / `.nv-csortbtn` / `.nv-wfctl-btn` / `.nv-wfctl-btn2`；`.nv-cinput`） |
| `--nv-fg-subtle` 用于文本 | 文本 14 处（总出现 20 处） | **文本 0 处**（14 处改 `--nv-fg-muted`；剩 6 处 = 1 `:root` 定义 + 5 非文本：状态点 / 图标 / 边框） |
| 尺度令牌 | 26 定义 / 13 启用 | **26 定义 / 16 启用 / 10 未启用**（未启用项归方向 B，见 §4） |
| smoke 断言数 | 308 | **309**（新增「UX-061 1b-2 尺度令牌治理」检查；README 同步） |
| **控件实际高度**（headless Edge 实测，环境见 §7.4；HEAD → 1b-2 首轮 → 修复后） | `.nv-cinput` 29 / 模态 37 / `.nv-cfold` 22 | **32 / 32 / 28**（`.nv-cinput` 补 `box-sizing:border-box` + 模态垂直 padding 8→5px；cfold 属有意归一 +6） |
| **内联 `fontSize`（React style 对象）** | 44 处（HEAD 同值） | **44 处冻结基线**（签名 `11.5px:2,11px:12,12px:23,13px:6,14px:1`，smoke ratchet：新增/变更即红；**全量迁移登记 1b-3**，含 11.5×2 与 13/14 归并） |

### 6.2 G-1 守卫构造证明（三形态）

| 注入形态 | 结果 |
|---|---|
| 单引号拼接 `font-size:' + TYPO.meta + 'px;` | smoke **FAIL UX-055①**（ux055 typography missing），exit 1 |
| 双引号拼接 `fontSize: TYPO.chapter + "px"` | smoke **FAIL UX-055①**，exit 1 |
| 模板字面量 `font-size:${TYPO.meta}px;` | smoke **FAIL UX-055①**，exit 1 |

三次注入后均还原，`sha256` 与注入前一致，干净态 smoke **309/0**。

### 6.3 仍未做 / 待人工验证

- **浏览器目检（G-5）**：明/暗/合成主题 × 4 视图 × 七态 + 真实取色 —— 本环境无浏览器，**未做**；A 迭代不得宣称验收通过。
- **0.1.x 宿主令牌回退**：`--nv-*-text` 在无 `color-mix` 的引擎上继承父色（方案 B 已披露），未在 0.1.x 实机验证。
- **10 个未启用尺度令牌**（sp-3..7 / r-sm/md/lg/pill / lh-normal）：归方向 B（阶段 2）落地，阶段 2 前不参与验收。
### 6.4 CR1 返工记录（2026-10-21，`REVIEW-UX-061-1B2-CR1 NEEDS_CHANGE / 1`）

| 项 | 处置 | 证据 |
|---|---|---|
| **P1** `.nv-cinput` content-box 高度回归 | `.nv-cinput` 增 `box-sizing:border-box`（基类，同一元素覆盖 `.nv-cmodal .nv-cinput`）；模态垂直 padding `8px→5px` 对齐 32 档（与基础输入一致） | headless Edge 实测：修复前 `.nv-cinput` **44** / 模态 **50**；修复后 **32 / 32**（`getBoundingClientRect`；`.nv-cfold` 28 不变） |
| P2-1 V-2 口径 + 内联守卫 | ①设计文档 §7.4 限定「只约束 CSS 规则」并登记内联 44 处基线；②smoke 增**内联字号基线冻结**（签名 `11.5px:2,11px:12,12px:23,13px:6,14px:1`，新增/变更即红）；③「内联字号全量迁移」登记为 **1b-3** | smoke 检查 `ux061 scale token governance missing` |
| P2-2 控件断言强度 | 由「≥3/≥1」改为**逐类名对应**（cbtn / cbtn-accent / cfold / csortbtn / wfctl-btn / wfctl-btn2 六项逐一 `includes` + `.nv-cinput` 的 `box-sizing:border-box;min-height:var(--nv-ctl-md)` 精确形态）+ 计数 `=== 6 / === 1` | 少任一处即红 |
| P2-3 §6.1 表述 | 补「控件实际高度」行（29/37/22 → 32/32/28）与内联基线行 | 见 §6.1 |
| P3-1 text3 计数 | 6 → **7**（含行号清单） | §5.5 V-3 行 |
| P3-2 `.nv-cfold` +6 | 在 §7.4 明示为控制高度归一的有意变化 | 设计文档 §7.4 |
| P3-3 日志标签 | `verify-contrast` V-3 段输出改为 `V3_BELOW_4.5=`（与主表 `BELOW_4.5=` 区分） | 脚本末行 |
| P3-4 14→15px | 标注为目检项（G-5），保留尺度收敛口径 | §7.4 |

**门禁（返工后真跑）**：`node --check` 0 · smoke **309/0** · `validate-preset` PASSED · `probe-face` 28/28 · `ci-mock-face` 4/4 · `verify-contract-anchors` 76/FAIL 0 · `verify-contrast` 18/0 + `V3_BELOW_4.5=0`。

**仍未做**：G-5 浏览器目检；1b-3 内联字号全量迁移；0.1.x 宿主降级验证。

---

## 7. 阶段 2（方向 B）断言迁移与机检基线（DEC-155 布局授权）

> 依据：DEC-155（显式替换 UX-059「控制条与章节列等宽」形态）· `REVIEW-UX-061-1B-*`（A 迭代收口）· 设计文档 §2.2/§7。
> 迁移原则：**只改判据、不删守卫**——每条旧判据都换成对方向 B 新形态的精确断言（含负断言残留检查）。

| # | 旧判据（A 迭代及以前） | 新判据（方向 B） | 依据 |
|---|---|---|---|
| B-1 | `.nv-wfctl` 与控制条等宽（`const wfW = resolveChapterW(snap.chapterW)` + `flex: '0 0 ' + wfW + 'px'` + 容器 `paddingLeft: '10px'`） | 控制条 = `.nv-rail{flex:none;width:44px}`；按钮 32×32；`role: 'toolbar'`；每个图标按钮 MUST 有 `title` + `aria-label`（键盘/读屏可达） | DEC-155 显式替换；§2.2 组件级应用 1 |
| B-2 | `.nv-ccard` / `.nv-cplus` / `.nv-cgrid` 均含 `min-height:180px` | 书卡**不再固定高度**（`!card.includes('min-height:180px')`），高度随内容；`.nv-cplus`/`.nv-cgrid` 保持原值 | §2.2 组件级应用 2（卡片高度随内容） |
| B-3 | 标题栏 `height:38px` / `const TITLE_BAR_H = 38` | `height:36px` / `TITLE_BAR_H = 36` | §2.2「标题栏 38→36px」 |
| B-4 | 书卡 monogram 色块（`.nv-ccard-mono` 40×40，accent 14%）+ 首字提取 `const mono = titleStr…` | 撤除彩色块；卡片左侧 3px `border-l2` 书脊线；书名 17px（`--nv-fs-display-s`；CR1 P3 订正令牌名） | §2.2「去 monogram 色块改书脊线」 |
| B-5 | 章节行选中=底色块（`background: rgba(79,142,247,.1)` 派生 10%） | 选中=`background:transparent` + `box-shadow:inset 2px 0 0 0 accent`（左 2px 竖线）+ 文字主色；行高 28px | §2.2「去底色块，只留左 2px 竖线」 |
| B-6 | 书卡 hover=`border-color + background: var(--nv-surface-hover)` | hover **只提边框**（`border-color` + `border-left-color`），无底色变化/无位移/无光晕 | §2.2「hover 只提 border 无位移无光晕」+ §7.3 |
| B-7 | `.nv-bar-ctl` `border-radius:8px` 字面量 | `border-radius:var(--nv-r-md,8px)`（值等价，令牌化） | 阶段 2 令牌硬条件（DR1：10 个未消费令牌必须落地或删除） |
| B-8 | （无） | 新增 smoke「**未消费尺度令牌 = 0**」：26 个 `--nv-{fs,sp,r,ctl,lh}-*` 定义每个至少 1 处 `:root` 外消费者 | DR1 硬条件（未消费即删除）+ 本批全部落地 |
| B-9 | （无） | 新增 `--nv-measure:34em` 令牌；`.nv-content` / `.nv-edwrap` 均 `max-width:var(--nv-measure)` 居中；`.nv-edwrap` 显式 `font-size:var(--nv-fs-body)` 使 `34em` 按 15px 解析（否则按 16px=544px 偏大） | §2.2「阅读宽度 34em ≈ 510px」 |
| B-10 | （无） | 删除全部 `@keyframes` / `animation:` / `infinite`（`keyframes=0 ∧ animation:=0 ∧ infinite=0`）；busy 态改静态点 + 文案 | §2.2「动效：仅 150ms；删循环动画」 |

**headless Edge 量算基线（2026-10-21；规则从 `lib/client.js` 抽取，harness 见下）**

| 目标 | 期望 | 实测 |
|---|---|---|
| `.nv-rail` 宽 | 44px | **44** |
| 正文容器宽（`--nv-measure` @15px） | ≈510px | **510** |
| 编辑区容器宽 | ≈510px | **510** |
| `.nv-chrow` 行高 | 28px | **28** |
| `.nv-cinput` 高度 | 32px（`ctl-md`，border-box） | **32** |

复现：从 `lib/client.js` 抽取 `:root` + 目标规则 → 最小 HTML → `msedge --headless=new --dump-dom` → `getBoundingClientRect()`。
（注意：`.nv-content` 的 `font-size` 在源码内是 `TYPO.body` 拼接串，harness 内以 15px 固定等效值代替。）

---

## 8. 阶段 2 双审返工（CR1 P1/P2 + DR1 P2）处置记录（2026-10-21）

> 依据：`REVIEW-UX-061-P2-CR1`（NEEDS_CHANGE / 2）· `REVIEW-UX-061-P2-DR1`（APPROVED_WITH_NOTES / 0，附 P2-1/P2-2 设计风险）。
> 原则：**返工不删守卫**——每个修复都配了自动断言，且都用 headless 复测证明「实际渲染值」而非仅字符串。

| # | 问题（审查编号） | 修复 | 机检断言 / 复测 |
|---|---|---|---|
| R-1 | **章节行字号丢失**（CR1 P1-1）：删内联 `fontSize:'12px'` 后无替代 ⇒ UA 默认 13.3333px | `.nv-chrow` 增 `font:inherit;font-size:var(--nv-fs-base)`（=12px，与 HEAD 一致） | **smoke P2 检查内已加** `.nv-chrow{box-sizing:border-box;height:28px` + `font:inherit;font-size:var(--nv-fs-base)` 断言（CR2 R-1 措辞已与事实对齐）+ headless 复测 `chrowFont=12px` |
| R-2 | **`.nv-content p` 段距被覆盖**（CR1 P1-2）：旧 `.75em` 规则与新增规则同特异性、后者覆盖 ⇒ 实测 0/20px，旧断言恒绿 | 合并为**唯一**规则 `margin:1em 0`（§2.2 段距 1em）；旧断言改为对生效规则精确断言 | headless 复测 `paraMarginTop/Bottom=15px`；新增「同选择器不得重复定义」负断言 |
| R-3 | **rail 状态纯图标化过度**（DR1 P2-1）：未绑定/失效/不可用靠 tooltip；busy 无可见文案 | rail 增 `.nv-rail-status` **常驻竖排状态文字**（未绑定/会话失效/会话不可用/运行中/空闲；busy → i18n `railBusy`＝处理中/Working） | smoke「rail 常驻状态文字 + `t('railBusy')` 在位」+ headless `railStatus` 非空 |
| R-4 | **rail 按钮焦点环缺失**（DR1 P2-2） | `.nv-rail .nv-wfctl-btn:focus-visible, .nv-rail .nv-wfctl-btn2:focus-visible` 复用设计系统双环（2px bg + 4px accent 60%） | smoke 规则在位断言；UX-053 双环计数 4→**5**（rail 为第 5 个消费者） |
| R-5 | **B-9/B-10 无 smoke 断言**（CR1 P2-1） | 新增「B-9 阅读宽度令牌」与「B-10 循环动画全零」两条静态断言 | smoke（`--nv-measure` 定义+两处消费；`@keyframes`/`animation:`/`infinite` 全零） |
| R-6 | **几何脚本未接 CI**（CR1 P2-2） | `scripts/verify-visual-geometry.mjs` 加 `--strict`/`CI` 严格模式（缺 Edge = 失败）；`.github/workflows/ci.yml` 的 windows job `install-ps-parse` 增步执行 `--strict` | CI 真跑；本地无 Edge 仍可 exit 3 跳过（README/本节注明） |
| R-7 | **迁移表缺披露**（CR1 P2-3） | 披露：数据面板表格 **13→13.5**（`--nv-fs-card`，设计文档与契约 revisions 同步订正）、`.nv-dcard-title` 12→13.5、`.nv-stage-pill` 13→13.5；rail 状态文字**保持可见**（见 R-3，未退化为纯图标） | 三方（设计文档/契约 revisions/迁移表）已一致 |
| R-8 | **重复/冲突 CSS**（CR1 P2-4）：`.nv-chrow{`×2 / `[data-sel=true]`×2（旧 accent 10% 底色靠顺序覆盖）/ `.nv-ccard-name{`×2 | 删除旧规则（transition 并入唯一规则；`.nv-ccard-name` 由基类 `TYPO.cardTitle` 承担 17px），保留单一定义 | smoke 负断言：四类选择器各恰好 1 次 + 旧 accent 10% 选中底色串不得存在 |
| R-9 | **契约 revisions 事实失准**（CR1 P2-5）：+123/−68 实为 +126/−71；「24 条」实为 20 条 | 契约条目改为实测值（终态 +138/−75 净 +63；20 条行引用） | `git diff --numstat` + `git diff -U0` face 行计数 |
| R-10 | **P3 杂项** | 删 `compactCard` 死变量 / `data-wf-status` 死属性；未消费令牌断言口径改为**排除 `:root` 定义行**（更严）；smoke 重复注释清理 | smoke 全绿 + 手工 grep |

**headless 复测（返工后终态）**：`{"rail":{"w":44},"measure":{"w":510},"edwrap":{"w":510},"chrow":{"h":28},"cinput":{"h":32},"chrowFont":"12px","paraMarginTop":"15px","paraMarginBottom":"15px","railStatus":"运行中"}`。
**CI 口径**：windows runner 执行 `node scripts/verify-visual-geometry.mjs --strict`（缺 Edge 即失败）；本地无 Edge 时该脚本 exit 3 跳过，属**已知可选**，不替代 CI 门禁。

### 8.1 DR2 P1 返工（rail 降级态长句撑爆 rail）与设计口径披露

| # | 项 | 处置 | 证据 |
|---|---|---|---|
| S-1 | **rail 降级态长句撑爆 rail**（DR2 P1，唯一阻塞）：`sessionsMissing` 中文 39 字/英文 88 字符经竖排约 542px/880px > rail 194px ⇒ 3 个操作按钮被挤出 | 新增 **rail 专用短标签 `railStatus*`（6 态 × zh/en）**：空闲/运行中/处理中/未绑定/会话失效/服务不可用（英 Idle/Running/Working/Unbound/Stale/Degraded）；**可见文字只允许走 `railStatus*`**，长句保留 `title`/`aria-label` | smoke 新增检查：`railStatus*` 6 键 × 2 locale 成对、zh≤6 字 / en≤14 字符、rail 状态区不得引用长句键；**注入证明**：把 `railStatusDegraded` 改成 39 字长句 ⇒ smoke 转红（见下） |
| S-2 | 任何未预期长文案的兜底 | `.nv-rail-status` 增 `max-height:120px;overflow:hidden` | headless 最坏态（服务不可用 5 字）：状态标签高度 ≤120 且 3 个按钮均完全可见（几何脚本新增断言） |
| S-3 | **rail 错误色口径**（披露） | rail 状态 `data-tone=err` 使用**文本档 `--nv-err-text`**（非 `--nv-err`）——与 §7.5「文本用 muted/err-text 档」一致 | 迁移表本节披露；代码 `.nv-rail-status[data-tone=err]{color:var(--nv-err-text)}` |
| S-4 | **短标签进 rail、长句进 title/aria**（披露） | 机制：`.nv-rail-status` 可见文字 = `railStatus*`；完整语义（如「会话不可用」的处置说明）仍在 `title`/`aria-label`（= `statusText`） | 迁移表 + 设计文档 §2.2 已同步 |
| S-5 | rail 标签档位（CR2 P3 → **DR3 终裁**） | **rail 状态标签 `--nv-rail-status` = `--nv-fs-base`（12px）**——DR3 明确不接受 11px 例外（与 A 迭代「11px 中文可读性下限」矛盾）；**caption 例外仅限阶段徽标 `.nv-rail-stage`**（导航型元信息）；已在设计文档 §2.2 字号条与本表登记 | 设计文档 §2.2 + 本节；headless `statusFont=12px`、`statusRect.h≈87px ≤120` |

**注入证明（S-1，真实注入 → 红 → 还原 → 绿）**：把 `railStatusDegraded: '服务不可用'` 临时改为 39 字长句 ⇒ `node test/smoke.mjs` 报 `FAIL … ux061 rail status labels`；还原后 **314 passed / 0 failed**。
**键长实测表（字符数）**：空闲 2 / 运行中 3 / 处理中 3 / 未绑定 3 / 会话失效 4 / 服务不可用 5；Idle 4 / Running 7 / Working 7 / Unbound 7 / Stale 5 / Degraded 8。

**CR3/DR3 终审收尾（2026-10-21）**
- **审计数字终态**：契约阶段 2 revisions 改为 `+155/−75（净 +80，终态实测）`（`git diff --numstat`）。
- **守卫收紧**：rail 状态段改为「段内全部 `t('…')` 调用 ⊆ 6 键白名单」+ i18n 键扫描正则支持 `["']` 双形态——换名字的长键 / 双引号第 7 键都会转红（注入证明见回报）。
- **rail 可达性**：`.nv-rail{overflow-y:auto;min-height:0}`——面板被拖到最小高度（120px）时按钮可滚动可达；geometry 新增「最小面板 120」断言（按钮 `visible || scrollable`）。
- **状态标签档位**：`--nv-rail-status` 由 caption(11px) → **base(12px)**（DR3 裁决）；stage 徽标保留 caption。
- **P3**：`running`（工作流在跑）/`busy`（操作在途、防连点）语义已写入设计文档 §7.1。
