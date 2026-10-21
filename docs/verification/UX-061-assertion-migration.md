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