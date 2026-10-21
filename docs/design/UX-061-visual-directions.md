# UX-061 工作台 UI 美术重设计 · 设计方向提案

- **角色**：Architect（只读产品代码；本文件是本次唯一写入物）
- **日期**：2026-10-20
- **对象**：`lib/client.js`（383,865 B / 5,316 行，单文件客户端）+ `lib/host-contract.mjs`（宿主耦合契约）
- **前置决策**：DEC-019（统一设计语言范围 + 素材政策）/ DEC-020（视觉方向 = B + A 点缀，图标 Lucide ISC）/ DEC-021（主题自适应：一切视觉值从 `var(--dsw-alias-*)` 派生）/ DEC-022（V2 授权）/ DEC-023（阴影/遮罩语义豁免）
- **本文性质**：给用户做**方向关键决策**的输入；不含实现改动。

---

## 0. 结论先行（TL;DR）

1. **最大问题不是"不够花"，而是令牌桥断了**：插件引用的 13 个宿主设计令牌中有 **6 个在 0.2.x 宿主主题包里根本不存在**（`fill-l1` / `state-accent-primary` / `state-success` / `state-warning` / `state-danger` / `bg-elevated`），合计 **138 处调用点**全部静默回落到暗色兜底值。→ 亮色主题下表面填充不可见、悬停无反馈、强调色与三种状态色永远是"暗色主题色"，DEC-021 的"跟随主题"实际未达成。**这是 P0 缺陷，任何方向都必须先修。**
2. 其次是**尺度系统缺位**：字阶双轨（`TYPO` 13 处 vs 12px 字面量 28 处 / 11px 12 处）、间距 10+ 种取值、圆角 8 档、同一"图标按钮"三种尺寸（20/28/32px）、全文件仅 **3 条** `:focus-visible`、**0 个** `@media` 断点。
3. 推荐路径 **A → B**：先做方向 A（令牌桥 + 尺度系统，S/M，1 个迭代内可交付且可机检），再落方向 B（创作台内容优先，M）。方向 C（SaaS 控制台）的骨架屏 / 命令面板属于 **IA 与交互**，留给 UX-062，不在本次视觉层。

---

## 1. 现状审计

### 1.1 设计语言实现现状（事实基线）

| 维度 | 现状 | 证据 |
|---|---|---|
| 令牌层 | `TK` 13 个语义名 → `var(--dsw-alias-*, 兜底)` | `lib/client.js:944-959` |
| 全量样式 | 单个 `<style id="novel-writing-style">`，NV_STYLE 数组 | `lib/client.js:4796-5315` |
| 字阶 | `TYPO` 9 档（page20/cardTitle17/smallTitle13.5/chapter16/stat18/body15/meta11/empty28） | `lib/client.js:967-981` |
| 图标 | Lucide 内联 path 表（ISC，版本声明） | `lib/client.js:91-129`（NV_ICONS:105） |
| 表面色 | 双声明兼容写法：`background:rgba(...)` → `background:color-mix(令牌)`（另有阴影/遮罩 rgba 属 DEC-023 豁免） | 48 行含非兜底 rgba/hex（如 `:4835`、`:4916`、`:4947`、`:5007`、`:5027`） |
| 状态表达 | `.nv-chip[data-tone=ok/warn/danger/muted]` + `.nv-dot[data-st]` + `BindDualDot` | `:5113-5117`、`:4828-4838`、`:3203` |
| 空态 | 两套：`.nv-empty`（11px 虚线框）与 `.nv-hero`（48px 图标 + 28px 大字） | `:4825`、`:5133-5135`、`:3708-3712` |
| 载入态 | 仅文本「加载中…」，无骨架屏 | `:2391`、`:2529`、`:2766` |
| 布局引擎 | 宿主矩形 + margin/width 双压挤法；`leftW/chatW/chapterW/midH` 持久化 | `:983-1200`、`:4250-4286` |
| 响应式 | **`@media` 出现 0 次**；卡片网格 `minmax(320px,1fr)`、内容列 `min(1200px)` | 全文检索；`:3729`、`:4950` |
| 焦点态 | `:focus-visible` 仅 3 条（文件树行/章节行/模态） | `:5101`、`:5103`、`:5106` |
| 字体 | 无任何 `font-family` 声明（除 `inherit`），正文继承宿主 | `:4915`、`:5125`（全文无字体栈） |
| 宿主耦合登记 | `regionLiterals` 面（`--dsw-alias-*` + `--dsw-shadow-*` 族）+ 面 3.4 | `lib/host-contract.mjs:148`、`:183-210` |

### 1.2 宿主主题事实（约束面，来自本机 0.2.1-rc.2 安装）

来源：`C:\Users\peter\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-client-ui-theme\lib\client.js`（**声明 107 个 `--dsw-alias-*`**，亮/暗双值）+ `dsh-web-frontend/dist/assets/index-*.css`。

| 宿主令牌 | 亮色 | 暗色 | 备注 |
|---|---|---|---|
| `bg-base` | `#fff` | `#151517` | 画布 |
| `bg-layer-1/2/3` | `#fff` / `#fff` / `#fff` | `#232324` / `#2c2c2e` / `#353638` | **亮色三档层全部纯白**——亮色下层次只能靠边框/悬停，不能靠表面差 |
| `bg-overlay` | `#e9ecf2` | `#61666b` | 浮层/遮罩基底 |
| `bg-skeleton` | `#0000000a` | `#ffffff14` | **宿主已有骨架屏色**（插件未用） |
| `border-l1/l2` | `#0000000a` / `#0000001a` | `#ffffff0f` / `#ffffff1f` | 发丝线 |
| `interactive-bg-hover` | `#2631480f` | `#ffffff14` | 悬停填充（插件未用） |
| `brand-primary` | `#0f1115`（近黑） | `#f9fafb`（近白） | **宿主强调色是单色**，不是蓝色 |
| `button-primary-fill/hover` | `= brand-primary` / `#43454a` | — / `#ebeef2` | 主按钮 |
| `label-primary-foreground` | `#fff` | `#0f1115` | **主填充上的文字色**（插件未用） |
| `state-success-primary` | `#22c55e` | 同 | 状态色 |
| `state-warn-primary` | `#f59e0b` | 同 | 状态色 |
| `state-error-primary` | `#ec1313` | `#f25a5a` | 状态色 |
| `shadow-lv1/2/3` | 声明存在 | — | 弹窗阴影令牌 |
| `--dsw-font-family` | `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", …` | 同 | **中文栈可用**；另有 `--dsh-font-family-code-default` |

**主题判定**：暗色需 `body[data-ds-dark-theme]`，默认即亮色；本仓 `profiles/web/cordis.patch.yml` 无 theme 行 → 宿主走默认（亮色）。DEC-021 记载 V7 实测宿主为亮色，与此一致。

### 1.3 令牌对账（机检结果，P0 核心证据）

插件引用 13 个宿主令牌 → 与宿主 107 个声明集求差：

| 插件令牌 | 宿主是否定义 | 调用点数 | 后果 |
|---|---|---|---|
| `--dsw-alias-state-accent-primary` | ❌ **无** | **54** | 全部强调色恒为 `#4f8ef7`（暗色蓝） |
| `--dsw-alias-fill-l1` | ❌ **无** | **31** | 全部表面/悬停恒为 `rgba(255,255,255,.03~.06)` → 亮色下**不可见** |
| `--dsw-alias-state-danger` | ❌ **无** | **19** | 恒 `#e5484d` |
| `--dsw-alias-state-success` | ❌ **无** | **17** | 恒 `#3fb950` |
| `--dsw-alias-state-warning` | ❌ **无** | **16** | 恒 `#d29922` |
| `--dsw-alias-bg-elevated` | ❌ **无** | 1 | 弹窗基色回落 `bg-base` |
| `bg-base` / `border-l1` / `border-l2` / `label-primary` / `label-secondary` / `label-tertiary` | ✅ | — | 正常跟随主题 |
| `--dsw-shadow-lv2` | ✅ | 1 | 正常 |

**合计 138 处调用点落在幽灵令牌上。**（复现命令见 §6）

**亮色主题下的实测对比度**（WCAG 2.1，计算 luminance）：

| 颜色对 | 比值 | 结论 |
|---|---|---|
| 兜底 accent `#4f8ef7` on 白 | **3.21:1** | 图形可过（≥3），12px 文字不过（<4.5）；作按钮底 + 白字只有 3.21 |
| 兜底 success `#3fb950` on 白 | **2.54:1** | 不过（文字/图形均 <3） |
| 兜底 warning `#d29922` on 白 | **2.52:1** | 不过 |
| 兜底 danger `#e5484d` on 白 | **3.91:1** | 图形可过，文字不过 |
| 宿主 label-tertiary（亮 `#81858c`）on 白 | **3.71:1** | 用于 11px meta 时**不过** 4.5 |
| 宿主 label-secondary（亮 `#61666b`）on 白 | **5.80:1** | 达标 |
| 宿主 label-primary（亮 `#0f1115`）on 白 | **18.90:1** | 达标 |

### 1.4 视觉问题分级（现象 + 证据 + 影响）

#### P0（阻塞观感——不修则任何风格都"发灰/错色"）

| # | 现象 | 证据 | 影响 |
|---|---|---|---|
| **P0-1** | 6 个宿主令牌不存在，138 处调用回落暗色兜底 | `lib/client.js:944-959`（TK）+ 使用点如 `:4817`、`:4835`、`:4942`、`:4983`、`:5060`、`:5071`；宿主主题包 107 令牌声明集内无此 6 项 | 亮色下卡片/输入/悬停**看不出表面**；强化色/状态色固定暗色值（对比 2.5~3.9:1），DEC-021 名义达成、实际失效 |
| **P0-2** | 主按钮白字硬编码 11 处 | `:5060`、`:5071`、`:5074` + 内联 `:2016`/`:2200`/`:2246`/`:2472`/`:3038`/`:4703`/`:4709`/`:4766` | 宿主已有 `--dsw-alias-label-primary-foreground`（亮白/暗近黑）；若按 DEC-021 让强调色跟主题变成近白品牌色，白字将不可读 |
| **P0-3** | 元信息（meta）对比不足且字号 11px | `:5009`（`.nv-ccard-status` TYPO.meta）、`:5012`（`.nv-cmeta`）、`:5085`（`.nv-bar-note` 11px） | 亮色 3.71:1 + 11px，章/字/更新时间等关键信息在真实屏幕上难以辨认 |

#### P1（明显缺陷——层级与一致性）

| # | 现象 | 证据 | 影响 |
|---|---|---|---|
| **P1-1** | 页内标题只有一档 14px，与 12px 正文仅差 2px；而工作台标题是 20px | `title` 对象 14px `:965`，被数据/发布/请求/设置/章节/工作流/诊断 7 个面板复用 `:2030`/`:2094`/`:2173`/`:2239`/`:2466`/`:2538`/`:2564`；页级 20px 在 `:4858`/`:4937` | 面板内无层级（标题≈正文），读者靠字重分辨；"扁平"观感主因 |
| **P1-2** | 字阶双轨：TYPO 13 处 vs 字面量 fontSize 11px×12 / 11.5px×2 / 12px×28 / 13px×6 / 14px×1 | `:971-981` 与全文件检索计数 | 同一视觉层出现 11/11.5/12/13 混排；改字阶需全文件搜替 |
| **P1-3** | 间距/圆角无阶梯 | NV_STYLE padding 14 种取值（`6px 8px`×3、`8px 10px`×2、`20px`×2、`16px`×2…）、gap 7 种（4/5/6/8/10/12/20）、radius 8 档（4/5/6/8/10/12/14/999） | 留白不均、节奏忽紧忽松 |
| **P1-4** | 同一"图标按钮"三种尺寸 | `.nv-mini` 20×20 `:4810`；`.nv-console-head .nv-mini` 28×28 `:4942`；`.nv-bar-ctl` 32×32 `:5083` | 头部与控制条按钮手感不一致 |
| **P1-5** | 焦点态覆盖严重不足 | 全文仅 3 条 `:focus-visible`（`:5101`/`:5103`/`:5106`）；按钮/页签/工作流按钮/卡片无显式焦点环；卡片另用 `data-focus` 光晕 `:4986` | 键盘用户无法判断焦点；与 UX-053 研究 P4「焦点环唯一」结论未闭环 |
| **P1-6** | 零响应式断点 | `@media` 0 处；网格 `minmax(320px,1fr)` `:3729`；内容列 `min(1200px)` `:4950`；章节列夹取 120–360px `:1021-1023` | 窄窗/高缩放/多屏下无自适应策略，卡片与表单要么挤要么溢出 |
| **P1-7** | 载入/错误/空态不成体系 | 载入仅文本 `:2391`/`:2529`/`:2766`；控制台数据未到时主体空白（门控 `:3704-3706`）；错误为 11px 文本 `:4972` + 文案 `:3697`；空态两套（`:4825` vs `:5133`） | 首屏 2.5s 轮询窗口内界面像"没加载"；错误不可操作（无重试） |
| **P1-8** | 工作流控制条大量内联样式、状态四分支重复 | `:4287`（内联容器）、`:4290-4297`（四条内联 12px 状态行） | 无法统一改样式；四态视觉不一（图标/圆点/颜色混用） |

#### P2（打磨项）

| # | 现象 | 证据 | 影响 |
|---|---|---|---|
| P2-1 | 卡片 4% 渐变残留（Vercel「no gradients」原则边缘） | `:4983`、`:4984` | 轻装饰仍存在，与"干净分层"取向有摩擦 |
| P2-2 | 48 行含"旧值;color-mix 新值"双声明（另含阴影/遮罩 rgba，DEC-023 豁免） | `:4835`、`:4916`、`:4947`、`:5007`、`:5027` | 可读性差、易漂移（改一处漏一处） |
| P2-3 | 图标尺寸 5 档（12×19、14×8、16×8、24×3、48×1） | nvIcon 调用统计 | 与 UX-053 研究 P6「12/14/16 三档」约定不符（24/48 可在空态豁免） |
| P2-4 | 代码行仍有 40 处全角/emoji 字符作 UI 元素 | i18n 串内 `📖` `:166`/`:186`、`▶` `:265-266`、`🔗` `:228`、`＋` `:256`；`.nv-cplus-icon` `＋` `:3763` | 与 Lucide 体系并存，字重/基线随系统字体漂移 |
| P2-5 | 长读排版无阅读宽度约束 | `.nv-content` 15px/1.75 `:5125`，无 `max-width` | 宽分栏下中文行长达 60+ 字，阅读疲劳 |
| P2-6 | 无 `prefers-reduced-motion` | 循环动画 `.nv-dot[data-st=busy]` 1.2s `:4835`、`.nv-cdot[data-bound=busy]` 双动画 1s `:5039-5040` | 无障碍缺口 |

### 1.5 已落地、方向里必须保留的资产（不推翻）

- Lucide 内联图标体系（ISC 声明 + path 直取）：`lib/client.js:91-129`。
- `TYPO` 单点字阶表：`:967-981`。
- `color-mix(令牌)` 派生表面（DEC-021 的正确做法）：`:4983`、`:5007`、`:5113-5117`。
- 焦点双环范式（2px bg-base 缓冲 + 4px accent）：`:5103`、`:5106`。
- `tabular-nums` 数字对齐（数据页/统计）：`:2166`、`:4390`、`:5012`。
- 空态英雄区：`:3708-3712`。
- 布局几何基线（UX-042~048/059 定案，**视觉层不改几何**）：`:983-1120`。

---

## 2. 三个设计方向

> 三者**不是换色**：A 改"语义与尺度"，B 改"内容与界面比例"，C 改"信息密度与交互范式"。
> 共同前提：先补令牌桥（P0-1/P0-2/P0-3），否则三者在亮色下同样失真。

### 2.1 方向 A — 精修现有语言（DEC-019 延续：只做层级/比例/密度手术）

**定位**：保留现有范式与几何，把"令牌—尺度—状态"三层整理成系统，让界面第一次"分层清楚"。

**参考系统与借鉴点**
- **shadcn/ui 语义令牌分层**（https://ui.shadcn.com/docs/theming）：把"直连宿主令牌"收拢为 8 个语义名（surface/fg/fg-muted/fg-subtle/border/accent/ok/warn/err），底层映射真实宿主令牌——正是修 P0-1 的最小改造范式。
- **Vercel Geist**：状态色只作 ≤12px 点/图标；主按钮走品牌单色；无装饰性渐变。
- **Radix Colors** 的"solid / subtle / border"三用法分层思路（命名学，不引依赖）：为每个状态色定义 `text / bg-tint / border` 三档派生。
- **Tailwind v4** 间距/圆角派生公式（4px 基准，radius sm/md/lg = 6/8/10）。

**令牌规格（新增"语义层"，底层全映射宿主已存在令牌；零新增色板）**

| 语义名 | 映射（宿主真实令牌） | 亮色实测 | 暗色实测 |
|---|---|---|---|
| `--nv-surface` | `var(--dsw-alias-bg-layer-1)` | `#fff` | `#232324` |
| `--nv-surface-hover` | `var(--dsw-alias-interactive-bg-hover)` | `#2631480f` | `#ffffff14` |
| `--nv-surface-raised` | `var(--dsw-alias-bg-overlay)` | `#e9ecf2` | `#61666b` |
| `--nv-fg` | `var(--dsw-alias-label-primary)` | `#0f1115` | `#f9fafb` |
| `--nv-fg-muted` | `var(--dsw-alias-label-secondary)` | `#61666b`（5.80:1） | `#cfd3d6` |
| `--nv-fg-subtle` | `var(--dsw-alias-label-tertiary)` | `#81858c`（**仅 ≥12px 或非信息性**） | `#adb2b8` |
| `--nv-border` | `var(--dsw-alias-border-l1)` | `#0000000a` | `#ffffff0f` |
| `--nv-border-strong` | `var(--dsw-alias-border-l2)` | `#0000001a` | `#ffffff1f` |
| `--nv-accent` | `var(--dsw-alias-brand-primary)` | `#0f1115` | `#f9fafb` |
| `--nv-on-accent` | `var(--dsw-alias-label-primary-foreground)` | `#fff` | `#0f1115` |
| `--nv-ok` / `--nv-warn` / `--nv-err` | `state-success-primary` / `state-warn-primary` / `state-error-primary` | `#22c55e` / `#f59e0b` / `#ec1313` | 同 / 同 / `#f25a5a` |
| `--nv-shadow` | `var(--dsw-shadow-lv2)` | 声明存在 | 同 |
| `--nv-font` | `var(--dsw-font-family)` | 含 PingFang SC / 微软雅黑 | 同 |

**尺度规格**

- 字阶（沿用现有实测值，只做收拢）：`11 caption` / `12 base` / `13.5 cardTitle` / `15 body` / `17 display-s` / `20 display` / `28 hero`；行高令牌 `1.45 / 1.6 / 1.75`。
- 间距（4 基准）：`4 / 6 / 8 / 12 / 16 / 20 / 24`；圆角（研究 P3 派生）：`6 / 8 / 10 / 14 / 999`。
- 控件尺寸两档：`28`（密集区/头部）、`32`（主控制条）；列表行 `32`；卡片 padding `16`。
- 状态色用法三档：`text`（文字/图标）、`tint 8%`（chip 底）、`border 25%`（chip 边）——一律 `color-mix(in srgb, var(--nv-ok) N%, transparent)`。

**组件级应用（3 个视图）**
1. **管理台书卡**（`:3252-3298` + `.nv-ccard` `:4983`）：删 4% 渐变 → `background: var(--nv-surface)`；hover 改 `--nv-surface-hover`（亮色可见）；`data-glow` 顶部 2px 条改 `--nv-ok/--nv-warn/--nv-accent`；meta 11px → 12px `--nv-fg-muted`；monogram 底 `color-mix(accent 12%)`（品牌单色时呈灰阶块，可接受）。
2. **创作台工作流控制条**（`:4287-4317`）：内联样式升级为类（`.nv-wfctl` / `.nv-wfctl-state`）；四态统一为一个 `.nv-chip` + 6px 点（去掉"图标/圆点/颜色"三套表达）；主按钮 `background: var(--nv-accent); color: var(--nv-on-accent)`。
3. **数据面板**（`:2172-2205`）：页标题 14px → 20px（与工作台页级一致）；表格 `12px→13px`、行高 `24px`、数值切 `--dsh-font-family-code-default`；空信号态用统一空态组件（图标 + 文案 + 可选 CTA）。

**优点**：风险最低（语义层是纯映射，可逐条机检）；与 UX-053/055 交付连续；P0 修复后亮色观感立变；Reviewer 有既有基线可对照。
**代价/风险**：不做范式变化 → "设计感"上限有限（用户已两次反馈"变化不大"）；装饰清理需回归目检；`regionLiterals` 需同步登记新令牌（P-10）。
**工作量**：**M**（令牌桥 S + 尺度系统 M + 组件精修 M）。触达：`lib/client.js`（`TK` `:944-965`、`TYPO` `:971`、`NV_STYLE` `:4796-5315`、面板内联 `:2030-2466`、wfctl `:4287-4317`、卡片 `:3252-3298`）、`lib/host-contract.mjs`（regionLiterals）、`test/smoke.mjs`（令牌对账断言）。

---

### 2.2 方向 B — 专业化写作工具风（内容为主、界面退后）

**定位**：正文是主角；界面只留一条发丝线，控制项收进竖向 rail，读者视线不被 chrome 打断。

**参考系统与借鉴点**
- **iA Writer**：编辑区左右留白随视口增长、正文行宽固定 → 中文长文阅读节奏稳定；界面单色化。
- **Obsidian**：侧栏可折叠 + 阅读宽度 clamp（`--file-line-width` 类似做法）+ 主题变量语义化；状态提示极简（单行、无块状色）。
- **Scrivener**：binder 列表 28–32px 行高 + 编辑器 + 检查器三段式；分栏层级只用 1px 线与明度差。
- **Notion**：块级排版节奏（标题上 24 / 下 8，段落 8）与"少色"（全站只在选中/链接用色）。
- 借鉴点取舍：**不引第三方依赖**，全部用现有 CSS 与宿主令牌实现（符合 P-08 与零依赖约束）。

**令牌规格**
- 表面只有 2 档：`bg-base`（画布）+ `bg-layer-1`（栏/卡）；**禁用渐变与辉光**。
- 文本：正体 `label-primary`；次要 `label-secondary`；`label-tertiary` 只用于占位/时间戳且 ≥12px（亮色 3.71:1 不足以承载信息）。
- 强调：`brand-primary`（单色）用于主按钮/选中/焦点；状态色只作 6–8px 点 + 一行文字。
- 字体：`--nv-font: var(--dsw-font-family)`（中文栈：PingFang SC / 微软雅黑）；**阅读模式**可选本机 serif 栈 `"Songti SC","SimSun","Noto Serif CJK SC",serif`（零下载，`待验证` macOS/Windows 实际字形）。
- 字号：正文 15/1.8、标题 17/20/28、meta 12、caption 11（仅时间戳）。
- 阅读宽度：`--nv-measure: 34em`（15px × 34 ≈ 510px ≈ 中文 30–34 字/行）；行高 1.8；段距 1em。
- 间距 8 基准（8/16/24/32/48）；圆角 8/10；阴影仅弹窗 `shadow-lv2`。
- 动效：仅 150ms 淡入淡出；**删循环动画**（busy 用静态点 + 文案进度）。

**组件级应用（3 个视图）**
1. **创作台**（`:4354-4502`）：控制条由"与章节列等宽的竖栏 + 三个整宽按钮"改为 **44px 竖向 icon rail**（开始/停止、压缩上下文、绑定新会话、阶段徽标），hover 才显文字；正文区外套 `max-width: var(--nv-measure); margin: 0 auto`；章节列 28px 行高、选中只留左 2px 竖线 + 文字变 `label-primary`（去底色块）；标题栏 38→36px、徽标去彩色底。
2. **管理台书卡**（`:3252-3298`）：去 monogram 色块改"书脊线"（左侧 3px `border-l2`）；卡片高度随内容（去 `min-height:180px`，`:4983`）；书名 17/600、meta 12 `label-secondary`；hover 只提 `border-l1 → border-l2`（无位移无光晕）。
3. **数据面板**：表格 13px / 行高 26 / 仅横线 `border-l1`；信号列表改"左 2px severity 竖条 + 12px 文本 + 一行建议"；右侧指标改 mono 数字 + 单位小字（`--dsh-font-family-code-default`）。

**优点**：最贴合"中文长文写作"主业（读/写/改）；长期使用视觉疲劳最低；chrome 减少后视觉问题面天然缩小；与亮色白底宿主高度兼容（宿主亮色层本来就是纯白）。
**代价/风险**：视觉"惊艳度"低，用户可能再次判"更素"（需在决策时说明这是有意为之）；阅读宽度与 rail 属于**布局节奏调整**，与 UX-059 定案（控制条与章节列等宽）冲突 → 必须落 DEC 显式替换（关键决策）；
**工作量**：**L**（布局节奏 + 组件重排 + 双主题基线重拍）。触达：`SplitWorkspace` `:3883-4502`、`NV_STYLE` 大半、`ChapterPanel` `:1856-2132`、`ConsoleNovelCard` `:3210-3298`、i18n 双字典（rail 提示文案）。

---

### 2.3 方向 C — 现代 SaaS 控制台风

**定位**：把工作台当"控制台产品"做——高信息密度、键盘优先、状态与动作显式化。

**参考系统与借鉴点**
- **Linear**：列表行 28–32px、行内状态图标 + 短徽标、icon rail 侧栏、⌘K 命令面板。
- **Raycast**：命令面板统一入口（替代散落按钮），每个动作带快捷键提示。
- **Vercel dashboard**：骨架屏 + 空态规范、mono 数字、三档边框、克制的状态色。
- 取舍：命令面板与骨架屏是**交互面新增**，属于 UX-062 范畴（本文只给视觉规格）。

**令牌规格**
- 表面 3 档：`bg-base` / `layer-1`（rail）/ `layer-2`（card）+ `bg-overlay`（浮层）。
- 密度：base 13px（高于现状 12px 的密集感）、title 15/17；行高 28（列表）/32（表单）/36（卡片）。
- 间距 8 基准（8/12/16/24）；圆角 6/8/10/999。
- 强调：`brand-primary` + 状态点 + chip 底 `color-mix(state 8%)`；chip 边 25%。
- 骨架屏：`--dsw-alias-bg-skeleton`（亮 `#0000000a` / 暗 `#ffffff14`）+ 1.4s shimmer。
- 焦点：`0 0 0 2px var(--nv-surface), 0 0 0 4px color-mix(brand 60%)`，全交互面覆盖。
- 数字/ID/时间戳：`--dsh-font-family-code-default` + `tabular-nums`。

**组件级应用（3 个视图）**
1. **管理台**：卡片网格默认改**列表视**（每行 56px：monogram 28 + 书名 + 阶段 chip + 章/字 mono + hover 显形动作）；顶部工具聚合为单行（搜索 + 排序 + 视图切换 + ⌘K 提示）；保留卡片视作可选。
2. **创作台**：顶部加命令条（开始/停止、压缩、绑定、切章）+ 状态胶囊；右侧检查器抽屉化；数据面板表格 + **自绘 SVG sparkline**（`color-mix(brand 20%)` 面积 + 1.5px 线，不引图表库）。
3. **状态体系**：统一 skeleton（列表/卡片/表格三型）+ inline alert（`layer-2` 底 + `--nv-err` 左边 + 重试按钮）+ 空态组件（图标 40 + 标题 17 + 说明 13 + 主按钮）。

**优点**：信息密度与操作效率最高；"现代感"最强（用户对 Linear/Raycast 风格认知度高）；与 UX-062 的 IA/效率目标天然衔接。
**代价/风险**：改动面最大（新增列表视/命令面板/骨架屏 = 交互面，非纯视觉）→ 超出 UX-061「视觉层」范围，需拆票；单文件 384KB 继续膨胀（命令面板约 300–500 行）；CJK 13px 表格在中文下偏小，需实测；快捷键需键盘可达性测试。
**工作量**：**L（≥2 个迭代）**。触达：`NvConsole` `:3312-3800`、`SplitWorkspace` `:3883-4502`、`NV_STYLE`、新增命令面板组件、i18n 双字典 `:160-480`、`test/smoke.mjs`（新交互断言）。

---

## 3. 方向对比与推荐

| 维度 | A 精修 | B 写作工具 | C SaaS 控制台 |
|---|---|---|---|
| 视觉提升可感知度 | 中高（P0 修复后明显） | 中（更"干净"，非"更炫"） | 高（密度/动效/键盘） |
| 实现风险 | **低** | 中（动布局节奏） | 高（新交互面） |
| 工作量 | M | L | L（≥2 迭代） |
| 与单文件 384KB 约束 | 好（原地改造） | 好（原地改造） | 差（新增组件面） |
| 与中文长文场景契合 | 中 | **高** | 中 |
| 与 UX-062 的关系 | 提供基座 | 提供基座 | 会越界到 UX-062 |

**推荐：A（立即做，1 迭代）→ B（紧随其后，1 迭代）；C 仅取"骨架屏 + 命令面板"两点，并入 UX-062。**

**理由（绑真实场景）**
1. **事实先行**：138 处调用落在幽灵令牌上（§1.3）。这不是审美分歧，是缺陷——B/C 的所有色阶规格同样依赖这层映射，所以 A 的令牌桥是三者共同前置，且能单独验收（机检可断）。
2. **场景**：本产品主路径是"长时间读/写/改中文正文"，B 的 measure + 低 chrome 直接改善主路径；C 的高密度更适合"扫数据"，可在**管理台局部**采用（列表视/骨架屏），不必全站。
3. **工程约束**：单文件 384KB + 零 npm 依赖 + `regionLiterals` 机检；A/B 是原地改造，C 要新增组件面与交互断言，回归面最大。
4. **用户反馈史**：UX-053 V7「变化不大」、UX-055 V7 再度反馈——纯装饰微调边际收益已低；A 的"表面/悬停/状态色真正跟随主题" + B 的阅读体验是可被用户直接感知的差异。
5. **决策留痕**：若选 A→B，需显式记录"DEC-019 基线延续（A）+ 创作台内容优先范式替换（B）"，避免 UX-054 遗留清单与新方向冲突。

---

## 4. 验收标准（可机检 / 可目检）

**机检（可进 smoke / CI）**
1. **令牌桥零幽灵**：`client.js` 中每个 `var(--dsw-alias-*)` / `var(--dsw-shadow-*)` 都必须在宿主主题令牌声明集内（脚本比对；当前 6 个幽灵必须是 0）。同时 `host-contract.mjs` 的 `regionLiterals` 与源码双向 ⊆（既有 smoke 机制 `lib/host-contract.mjs:183-210`）。
2. **无裸色值**：NV_STYLE 内 `#hex` / `rgba(` 仅允许出现在 ①`var()` 兜底位 ②阴影/遮罩（DEC-023 豁免）；其余为 0。
3. **尺度白名单**：`fontSize ∈ {11,12,13.5,15,17,20,28}`、padding/gap ∈ `{4,6,8,12,16,20,24}`（4 的倍数，允许 6 作为 8 的密集变体）、radius ∈ `{6,8,10,14,999}`；越界即 FAIL。
4. **焦点覆盖**：所有 `button` / `[role=button]` / `input` / `[tabindex]` 选择器均存在 `:focus-visible` 规则（选择器清单断言）。
5. **动效克制**：无 `animation` 无限循环，或 `@media (prefers-reduced-motion: reduce)` 覆盖全部动画。
6. **字号/字重**：`font-weight` 仅 `400/500/600`（删除 700）。
7. **图案素**：`nvIcon` 调用尺寸 ∈ `{12,14,16}`（空态/正文插图 24/48 白名单）。

**目检（Design Reviewer + 用户）**
1. 双主题（宿主亮/暗）+ **合成主题注入**（按 DEC-021 探针重定义 `--dsw-alias-*` 为怪异值）三组截图，覆盖 4 个关键视图（管理台网格 / 创作台正文 / 数据面板 / 侧栏抽屉）。
2. 对比度：正文与次要文本 ≥ 4.5:1；装饰性 caption ≥ 3:1；图形/焦点环 ≥ 3:1（以宿主令牌实际值为准，不测兜底值）。
3. 视觉基线对比：同 viewport（1280×800 / 1600×1000）改造前后截图，层级差可辨识（标题与正文、卡片与画布、主次按钮）。
4. 交互态：hover / active / focus-visible / disabled / loading / empty / error 七态均有可见且一致的表达。
5. 布局红线段：UX-042~048/059 已定案的几何（分栏/拖拽/持久化）零改动（若选 B 的阅读 measure 与 rail，则须有对应 DEC 授权并在验收项中显式列明变更点）。

**审查项**
- Design Reviewer：DEC-019/021/022/023 延续性；P-08（参考系统出处可核）；无"自造风格"无依据项。
- Code Reviewer：P-10 宿主耦合登记（新增字面量必须进 `host-contract.mjs`）；`smoke` 双向 ⊆；无双声明遗漏导致的覆盖错误。
- 无障碍：焦点顺序、键盘完整路径、`aria-*` 不退化（对比 CLEAN-007 F6 既有基线）。

---

## 5. UX-062 铺垫（≤15 行）

在 A→B 视觉基座上的优先易用性机会（供 UX-062 细化，不在本轮实现）：
1. **主路径收敛**：选书 → 看进度 → 写作 → 发布 → 数据；现状"控制台卡片→自动建会话→分栏→页签"跳转多，目标 3 次点击到"写作"。
2. **状态一致性**：绑定/工作流四态（none/busy/need/done/stale）在卡片、抽屉、工作流条三处表达不一 → 统一"状态胶囊 + 下一步动作"。
3. **长任务反馈**：轮询 2.5s（`:3147`）+ 无骨架 → 骨架屏 + 失败降级提示与重试。
4. **错误可恢复**：`nv-caction-err` 仅显示 `apiError`（`:4972`/`:3697`），缺诊断入口（现成诊断面板 `:2751-2800`）与重试。
5. **键盘可达**：现仅 3 条 focus-visible → 完整键盘路径（选书/切章/发布）+ roving tabindex。
6. **命令面板（C 迁移）**：⌘K 聚合开始/停止/压缩/绑定/切章/切视图，替代散落按钮。

---

## 6. 事实来源与复现命令

```powershell
# 令牌对账（P0-1 复现）
$p='C:\Users\peter\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-client-ui-theme\lib\client.js'
$s=[System.IO.File]::ReadAllText($p,[System.Text.Encoding]::UTF8)
[regex]::Matches($s,'--dsw-alias-[a-z0-9-]+\s*:') | ForEach-Object { $_.Value } | Sort-Object -Unique
# 插件侧引用：grep 'var(--dsw-alias-' lib/client.js → 13 个，其中 6 个不在上式输出中

# 字阶/间距/圆角分布：对 lib/client.js:4796-5315 段落做 padding/border-radius/gap 正则统计
# 焦点态：grep 'focus-visible' lib/client.js → 3 条
# 响应式：grep '@media' lib/client.js → 0
```

**局限与待验证**
- 宿主令牌存在性以本机 `@deepseek-ai/dsh` 0.2.1-rc.2 安装为准；旧版 0.1.x 是否曾定义这 6 个令牌**无法验证**（未安装），本文只断言"当前宿主不定义"。
- 亮/暗主题的实时渲染取值**未做浏览器实测**（无截图采集）；对比度按宿主令牌声明的静态值计算。
- 本机 serif 栈（宋体/Noto Serif CJK）实际可用性 `待验证`（须在目标 OS 实测字形与行高）。
- 用户当前宿主主题为默认亮色的判断依据 = 无 theme 配置行 + 宿主默认态；若用户已切暗色，P0 结论的"亮色下不可见"需改为"跨主题不跟随"表述（结论不变）。

---

## 7. 用法说明（1b-2 落地口径，G-3/G-4）

> 依据：DEC-155（方向 A + 布局授权）· `REVIEW-UX-061-1B-DR2/DR3`（M-2/M-3 附条件与 P3 备注）· `REVIEW-UX-061-1B-CR3`（残留项）。以下三条是实现与后续迭代 MUST 遵守的用法口径。

### 7.1 工作流状态 chip 三档语义（`.nv-wfchip[data-tone]`）

| tone | 语义 | 使用约束 |
|---|---|---|
| `muted` | 待办 / 未开始 / 无动作 | 中性前景色，不得用于「完成」 |
| `running` | 进行中（含轮询中） | 可配动效，但不得只靠动效传达状态 |
| `err` | 阻塞 / 失败 / 需介入 | 必须同时在文案里说明处置动作 |

原 5 档（含 `ok` / `warn`）中这两档**无消费者**，已删除以避免死规则；若要表达「工作流完成」或「警告」态，MUST 先接消费者再以 DEC 重新引入（不得先加规则后找用处）。

### 7.2 边框令牌使用边界（亮色层级）

- `--nv-border`（宿主 `border-l1`，亮色 `#0000000a`）在亮色下**近不可见** ⇒ **禁用于分隔线 / 层级边界**；
- 分隔与边界一律用 `--nv-border-strong`（宿主 `border-l2`）；
- 亮色下卡片与页面底同为 `#fff`，层级只能由 1px `border-strong`（约 1.26:1）+ hover 的 accent 边框承担 ⇒ 属**目检必查项**（G-5）。

### 7.3 hover 可感知性定义

- 可感知性 = **边框或前景变化**；表面 tint 单独**不构成**可感知反馈（亮色 `interactive-bg-hover` 相对页面约 1.11:1）；
- 现行实现：`border-color: var(--nv-accent)` + `background: var(--nv-surface-hover)`（组合反馈）；
- 新增/修改交互组件 MUST 至少包含边框或前景变化，不得只靠 tint（否则 hover 在亮色下等于无反馈）。

### 7.4 尺度与控件令牌（V-1/V-2 收口口径）

- 文本字号**唯一数值来源** = `:root` 的 `--nv-fs-*`；`TYPO` 只做「语义名 → 令牌」映射（JS 侧不持 px）；
- **口径限定（CR1 P2-1）**：以上「唯一数值来源 / 字面量白名单 / 尺度外值归并」三条**只约束 CSS 规则**；React 内联 `fontSize:'Npx'` 现有 **44 处基线**（11px×12 / 12px×23 / 13px×6 / 14px×1 / 11.5px×2），由 smoke 基线冻结守卫（新增/变更即红），**全量迁移登记为 1b-3**（不与 1b-2 混）；
- CSS 内 `font-size` 字面量**只允许**出现在图标/字形尺寸选择器上（smoke 白名单机检，新增文本字面量即红）；
- 控件高度档位 = `--nv-ctl-sm`（28px，`min-height` 下限）/ `--nv-ctl-md`（32px，**输入类目标档**：border-box + 实测），由按钮 / 输入 / 折叠钮等消费者承担；新增控件 MUST 复用两档，不得新造高度；
- **精确高度约束（DR2 P3）**：两档是 `min-height` 下限，不等于精确高度——若某控件需要**精确**高度，MUST 显式用 `height` 并统一 `box-sizing:border-box`，不得依赖 `min-height`；
- **同行同档不变量（DR2 P2）**：**同一表单行内的控件 MUST 取同一档**；当前已知偏差 = 模态行 `.nv-cmodal .nv-cinput`（32，`ctl-md`）与同排 `.nv-cbtn`（实测 29，`ctl-sm`）约 3px 高差。处置：G-5 目检判定可见 ⇒ 按**预批准 1 行修复**（`.nv-cmodal .nv-cbtn{min-height:var(--nv-ctl-md)}`）；不可见 ⇒ 记录为**已知偏差**，不得宣称「高度完全统一」；
- **实测高度表（环境：headless Edge + 规则直接从 `lib/client.js` 抽取；日期 2026-10-21）**：

| 控件 | 档位 | 实测高度 |
|---|---|---|
| `.nv-cinput` | `ctl-md` | **32** |
| `.nv-cmodal .nv-cinput` | `ctl-md` | **32** |
| `.nv-csortbtn` | `ctl-sm` | 32 |
| `.nv-cbtn` | `ctl-sm` | 29 |
| `.nv-cbtn-accent` | `ctl-sm` | 28 |
| `.nv-cfold` | `ctl-sm` | 28 |
| `.nv-wfctl-btn` / `-btn2` | `ctl-sm` | 28 / 28 |

- **盒模型约束（CR1 P1）**：`<button>` UA 默认 border-box，而 `<input>` 是 **content-box** ⇒ 输入类 MUST 显式 `box-sizing:border-box`，否则 `min-height` 落在内容盒（实测 29→44，模态 37→50）。修复后 `.nv-cinput` **32** / `.nv-cmodal .nv-cinput` **32**（模态垂直 padding 8→**5px**、与基础输入一致，以对齐 32 档；**Design 已裁决接受 5px**，理由：档位一致性优先，避免引入第三档 36px）；
- `.nv-cfold` 22→28px（+6）为控制高度归一的**有意的**布局变化（原高由 padding+line-height 自然撑出）；
- 尺度外字号（10 / 10.5 / 11.5px）在 CSS 内一律归入 11（`--nv-fs-caption`）或 12（`--nv-fs-base`）；内联 11.5px×2 待 1b-3；
- 14px→15px 两处（`.nv-content h3` / `.nv-hero-btn`）为尺度收敛的 +1px 变化，属目检项（G-5）。
### 7.5 三级文字色使用边界（1b-2 泛化结论）

- 文本**最低**使用 `--nv-fg-muted`（宿主 `label-secondary`；亮 `#61666b` 5.80:1 / 暗 `#cfd3d6` 10.42:1）；
- `--nv-fg-subtle`（宿主 `label-tertiary`；亮 `#81858c` **3.71:1**）**只允许用于非文本**：图标、状态点、边框、分隔线；
- 依据：WCAG AA 对普通字号文本要求 ≥4.5:1，与字号是否 <12px 无关；1b-2 已把全部 14 处文本用法改为 muted（含 `TK.text3` 的 **7** 个内联小字号消费点），残留 5 处非文本 + 1 处定义；
- 若后续需要更弱的"三级文本"层级，MUST 先由 Design Reviewer 裁决并给出可测的对比度下限（≥4.5:1），不得直接复用 subtle。