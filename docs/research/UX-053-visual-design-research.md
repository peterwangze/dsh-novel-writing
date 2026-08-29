# UX-053 工作台视觉设计调研（开源模式 + 图标选型）

> - **Task ID**: UX-053（P1，入账 v0.4.0）
> - **产出物**: 本文件（`docs/research/UX-053-visual-design-research.md`，唯一修改文件）
> - **执行角色**: Analyst Agent（软件项目治理 workflow, v0.75.0 开发阶段 / G5 passed-with-conditions）
> - **调研日期**: 2026-08（本会话）
> - **用户诉求**: 管理台 NvConsole + 创作台 SplitWorkspace「简陋、缺乏设计感」→ 保持布局不变，只优化视觉呈现层；素材与思路来自开源社区（P-08 禁止自造轮子）
> - **已定案**: DEC-019（统一设计语言）；内联 MIT 系开源 SVG 图标（零 npm 依赖、零运行时网络加载）
> - **本次修正（事实核查）**: Lucide 现行许可为 **ISC**（非任务描述中的 MIT）——见 §3.1。ISC 与 MIT 同为 OSI 宽松许可，内联可行性不受影响；建议知悉后确认（Coordinator/用户）。

---

## 0. 调研基线

### 0.1 调研问题（用户需要知道什么）

1. 开源社区在"暗色、文本密集、高密度工作台"上如何做视觉层次（配色层次/字体梯度/圆角/阴影/过渡/焦点环/空态/微交互）？
2. 哪些视觉模式可以直接落到现有 `.nv-*` 类上（给出可直接使用的 CSS 声明）？
3. 图标用什么：图标库选型事实（许可/URL/source 数据）+ 具体位置映射表？
4. 有哪些"成熟项目刻意不做"的反面模式（避免我们踩坑）？
5. 一套贯穿管理台 + 创作台的统一设计语言，含 2~3 个可选方向及差异点？

### 0.2 范围 / 非范围

| 覆盖 | 不覆盖 |
|---|---|
| 视觉层（配色层次/字阶/圆角/阴影/过渡/焦点环/图标/空态/微交互） | 分区结构、尺寸体系（180px 卡高/38px 标题栏/48px 搜索等） |
| 可复用的开源 CSS 模式值（可验证） | 分隔条（sash）与滚动条行为（已定案勿动） |
| 图标选型建议与事实 | 技术选型决策（图标库仅给建议，最终由 Coordinator/用户定） |
| 统一设计语言提案（含 3 方向） | 产品代码修改、`.governance/` 治理记录修改 |

### 0.3 本地参考可达性声明（必须诚实记录）

- **`D:\AI\agent\...\Temp\dsh-worktable-research` 克隆在本机不存在**：已穷尽搜索 `D:\AI\agent` 全树（`*worktable*` 目录名、`dsh-worktable|dsh-novel|dsh-writing` 模式，深度 4+、超时 120s 全量递归），**0 命中**。本报告无法引用该克隆的具体样式行号。
- 本仓库 `lib/client.js` 中多处注释引用"对照 dsh-worktable …"（如 L72 `dsh-worktable styles.ts`、L3428 `dsh-wt_sortBtn`、L3443 `对照 dsh-worktable 控制室卡片`、L3476 `对照 dsh-worktable 对话绑定钮`）——这些比对结论**只能作为代码注释事实引用，无法独立核验**，统一标注【待验证：需克隆路径】。
- 替代基线：本仓库实际实现 `lib/client.js` 的 `.nv-*` 样式段（L3288-L3521）已逐行通读，以下所有"现状值"均来自该文件（含行号），可复查。

### 0.4 当前实现基线（组件清单 → 类名 → 现状值 → 行号）

**管理工作台 NvConsole**（shell.overlay 全屏控制台）

| 组件 | 类名（行号 @lib/client.js） | 现状关键值 |
|---|---|---|
| 控制台容器 | `.nv-console` L3399 | bg-base、左 1px border-l1、zIndex 950 |
| 头部 | `.nv-console-head` L3400 | padding 10 16、底 l1 线、fill L1 alpha .02 |
| 标题 | `.nv-console-title` L3403 + `.nv-console-title-ico` L3404 | 16px/600；📖 18px emoji |
| 工作区路径 | `.nv-console-ws` L3405 | 13px secondary、max-width 46% |
| 切换/新建按钮 | `.nv-cbtn.nv-cbtn-ws` L3412-3413 | accent 边 600、bg rgba(79,142,247,.12)（**硬编码 alpha**） |
| 关闭钮 | `.nv-console-head .nv-mini` L3408-3409 | 28×28、radius 8、l2 边、✕ 16px |
| 排序 pills | `.nv-csortbtn` L3432-3434 | 13px、padding 7 14、radius 999、选中 accent 边+字 |
| 卡片网格 | `.nv-cgrid` L3438 | minmax(320px,1fr)、gap 20 |
| 小说卡片 | `.nv-ccard` L3440-3442 | min-height 180、radius 14、padding 16、玻璃渐变 `linear-gradient(135deg,rgba(255,255,255,.07),…)` + shadow `0 1px 6px rgba(0,0,0,.08)`、hover border accent + 提亮、focus `0 0 0 1px accent,0 0 16px rgba(79,142,247,.25)` |
| 状态光效 | `.nv-ccard[data-glow=*]` L3444-3446 | **整卡彩色边框 + 多档彩色辉光**（need/done/busy 三色 8px/22-24px 辉光 + inset） |
| 扫光动画 | `.nv-csweep` L3450-3451 | 3.2s 循环流光，峰值 alpha .14 |
| 书名/徽标 | `.nv-ccard-name` L3455 / `.nv-ccard-badge` L3456 | 16px/600；12px pill radius 8 fill .06 |
| 状态行 | `.nv-ccard-status` L3457 + `.nv-cdot` L3477-3493 | 13px；双圆绑定点（CSS ::before/::after） |
| 数据/meta | `.nv-ccard-data` L3459 / `.nv-cmeta` L3460 | 13px/12px tertiary，line-height 1.6 |
| 操作钮 | `.nv-cico` L3465-3467（🔗/🗑 emoji） | 22×22、radius 6、l1 边；del hover danger |
| 折叠行 | `.nv-cfold` L3469-3470 | 11px tertiary 下划线 |
| ＋磁贴 | `.nv-cplus` L3473-3475 | 1.5px dashed accent、radius 14、＋ 26px、hover 亮度+缩放 1.02 |
| 搜索药丸 | `.nv-csearch` L3419-3425 | 48px 高、min(640px)、radius 999、focus `0 0 0 3px rgba(79,142,247,.25)`、🔍 16px emoji、占位 15px、输入 15px |
| 命中列表 | `.nv-cfound` L3426-3427 | 11px/600 title、letter-spacing .05em |
| 弹窗 | `.nv-cmodal` L3497-3500 | min(520px)、radius 14、shadow-lv2、elevated bg |
| 表单/按钮 | `.nv-cinput` L3501-3502（12px、focus 仅 border） / `.nv-cbtn` L3506-3507 / `.nv-cbtn-accent` L3504-3505 | 12px、radius 6；accent 实底白字、hover brightness 1.08 |

**侧栏抽屉 Drawer**（256px 列）

| 组件 | 类名（行号） | 现状关键值 |
|---|---|---|
| 标题行 | `.nv-drawer-head` L3296-3297 + `.nv-drawer-title` L3300-3301 | 13px/600、letter-spacing .06em、📖 16px emoji、hover fill |
| 折叠钮 | `.nv-drawer-caret` L3298 | ▾ 9px tertiary |
| 书目卡 | `.nv-card` L3308-3310 + title L3311 + sub L3312 | 13px/600 + 12px、padding 6 8、radius 10、l1 边、hover/data-on accent 边 |
| 状态点 | `.nv-dot` L3317-3326（卡内 8px L3320） | 9px 圆点、busy 脉冲 1.2s、need/done 发光、stale 空心红 |
| 分隔线 | `.nv-sep` L3295 | 1px l2、margin 4 0 |
| 空态 | `.nv-empty` L3314 | 1px dashed l1、11px、radius 8 |

**创作工作台 SplitWorkspace**（挤法三栏）

| 组件 | 类名/位置（行号） | 现状关键值 |
|---|---|---|
| 外框 | `.nv-split` L3340 | 直角（radius 0，UX-029 定案）、border-l2、bg-base |
| 标题栏 | `.nv-bar` L3344 + `.nv-bar-title` L3345 + `.nv-badge` L3346 | 38px、14px/600、底 l2 线；居中横幅为**内联样式** L2911-2921（绝定位 50%、13px） |
| 开始/继续钮 | `.nv-bar-launch` L3511-3513 | accent 实底 13px/600、radius 6、hover brightness |
| 控制钮 | `.nv-bar-ctl` L3516-3517（⇄ ⟳ ☆ ✕ 4 个，**emoji**） | 32×32、radius 8、l2 边、fill .05 |
| 左窗 | `.nv-left` L3362 | 文件树（**内联样式**行 L1577-1587，无独立类）+ 状态面板 `.nv-scroll` L2966 |
| 文件树 | 内联（FileTreeNode L1566-1600） | **无 .nv-ft 类**；`▸/▾/📄` emoji、12px、行高 padding 2 6、选中仅背景 fillHover |
| 状态面板 | 内联（WorkflowPanel L1339-1377） | `✅🔄⬜` emoji、12px、卡式（内联 card 样式） |
| 章节列 | `.nv-chlist` L3366-3367 | 浅底 fill .02、行**内联**（L1300-1315）`第N章` + `✓/⚠` 文本标记、radius 6 |
| 内容列 | `.nv-scroll`（L1319） | 阅读 13px；预览头内联（L1616-1619 `📄`+✕） |
| 页签 | `.nv-tabs` L3386 / `.nv-tab` L3387-3389 | 12px、radius 6、l1 边、选中 accent 边+字 |
| 拖区 | `.nv-vdiv/.nv-chatdiv/.nv-chdiv/.nv-middiv` L3356-3384 | 4px 透明命中区 + hover/active `inset 1px accent` 高亮线（VS Code sash 语义，已定案勿动） |
| 滚动条 | `.nv-scl` L3380-3381（scroll 驱动 1.5s 隐藏） | thumb l2、active accent（已定案勿动） |
| 弹窗/分组 | `.nv-modal` L3392（480px radius 12）/ `.nv-group` L3393 | 左 2px accent 边、fill .04 |

> 关键观察（事实）：**当前"简陋感"的来源集中在三处**——① 图标全部为 emoji/文本字符（非同一视觉体系，粗细、基线、风格随系统字体漂移）；② 卡片层用"玻璃渐变+彩色辉光+扫光"三重装饰但信息层次（标题/状态/数据/meta 的对比度阶梯）反而被削弱；③ 焦点态/悬停态/空态不统一（search 3px 光环、卡片 16px 光晕、input 仅变边、树行无 focus 态）。

---

## 1. 开源参考系深度分析（5 个参考系）

### 1.1 shadcn/ui 组件模式（一手来源核验）

**来源**：
- 主题文档（一手）：https://ui.shadcn.com/docs/theming
- 组件定制 skill（一手，官方仓库）：https://github.com/shadcn-ui/ui/blob/main/skills/shadcn/customization.md
- 组件 registry（一手，实测 200）：https://ui.shadcn.com/r/styles/new-york/button.json
- Tailwind v4 主题变量（一手，实测 200）：https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/theme.css

**核验事实**（均为文档/源码原文）：
- 圆角体系：`--radius: 0.625rem`（10px）为基，派生 `--radius-sm: calc(var(--radius)*0.6)`（6px）`--radius-md: calc(var(--radius)*0.8)`（8px）`--radius-lg: var(--radius)`（10px）`--radius-xl: calc(var(--radius)*1.4)`（14px）`--radius-2xl: calc(var(--radius)*1.8)`（18px）…——**与现状 6/8/10/14 恰好一一对应**（见 §2 应用）。
- 语义色令牌仅 ~10 个角色（background/foreground/primary/primary-foreground/muted/muted-foreground/accent/accent-foreground/destructive/border/input/ring），颜色用 OKLCH 表达；`--color-ring: var(--ring)` 统一焦点环色。
- Button（registry JSON 原文）：base = `rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0`；variant outline = `border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`；variant ghost = `hover:bg-accent`；default = `bg-primary text-primary-foreground shadow hover:bg-primary/90`。
  → **可复用模式**：①过渡只转 `transition-colors`（不转 transform/box-shadow 等全部）；②焦点环 = 1px `ring` 色 + outline-none；③禁用 = `opacity:.5` + 无指针事件；④内嵌 SVG 统一 `size-4`（16px）；⑤hover 用 `bg-accent`（语义色 4~6% alpha 提亮）而非换边。
- Tailwind v4 默认过渡（theme.css 原文）：`--default-transition-duration: 150ms; --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)`；`--ease-in-out` 同曲线。
  → **可复用模式**：统一过渡曲线 `cubic-bezier(0.4,0,0.2,1)`（现状是 CSS 关键字 `ease`=`cubic-bezier(0.25,.1,.25,1)`，偏"甩尾"；换成标准曲线 + 150ms 会明显更"现代、可控"）。

### 1.2 Vercel Geist 设计系统（vercel.com 源码规范；一手爬取 + 二手整理并标注）

**来源**：
- Vercel 官方设计系统站点（一手）：https://vercel.com/design（308 重定向未跟随成功，**待验证**）；https://geist.vercel.app/ 现为 "Coming Soon"（实测）——官方站点当前不可用。
- vercel.com 源码规范整理（**二手**，但直接爬自 vercel.com 前端源码，可核对）：https://github.com/educlopez/design-bites/blob/main/design-mds/vercel.com/DESIGN.md

**核验事实**（DESIGN.md 原文摘录，二手标注）：
- 无彩色设计（achromatic）：近白画布 #FAFAFA → #F2F2F2 → #EBEBEB → #171717 四档灰阶；交互蓝 `rgb(0,114,245)` **仅用于链接/焦点环**，其他色彩只作 ≤10px 状态点（`div.size-2.5`），**绝不作背景填充或大片色块**。
- "Shadows replace borders. Weight replaces size. Spacing replaces dividers."——边框用阴影模拟：`--ds-shadow-border-base: 0 0 0 1px #00000014`，组合 `--ds-shadow-border: var(--ds-shadow-border-base), var(--ds-shadow-background-border)`（背景感知的 1px 描边层）。
- 焦点环 = **双环**：`0 0 0 2px var(--ds-background-100), 0 0 0 4px var(--ds-focus-color)`——内环 2px 用页面背景色做"缓冲带"，外环 4px 蓝色，保证在任何底色上可见（含本身是蓝色的元素）。
- hover 交互：灰色微填充（#EBEBEB）+ 文字从 secondary 提级 primary；**无 transform/opacity/transition 变化**——纯颜色交互。
- 字体：Geist 字体 + `font-feature-settings:"liga"`；**恰好三种字重且刻意不用 700 bold**；标题负字距 h1 -4.75%、h3 -4%、h2(14px) -2%。
- 圆角体系：6px（组件默认 `--geist-radius`）/ 8px（营销层）/ 12px（卡片、浮层）/ `12px 12px 0 0`（顶部锚定抽屉）/ 9999px（pill）。
- 表单高度档位：32 / 40 / 48px（与我们 48px 搜索药丸同档）。
- 间距：4px 基数（`--geist-space` 4px、2x 8px、3x 12px…）。
- **哲学句（直接引用）**："no gradients, no decorative borders, no color for color's sake"。

### 1.3 VS Code workbench（一手来源核验）

**来源**（官方主题色 API，实测抓取）：
- https://code.visualstudio.com/api/references/theme-color

**核验事实**（官方文档原文摘录）：
- `sash.hoverBorder`：可拖分区（sash）的 hover 边框色——**现状 `.nv-*div:hover` 的 `inset 1px accent` 高亮线在语义上与之完全对齐**（UX-030 定案正确）。
- `focusBorder`：元素聚焦总边框色（"only used if not overridden by a component"）——与 shadcn 的 `ring` 同一「总控焦点环」思想。
- `list.hoverBackground` / `list.activeSelectionBackground`、`sideBar.border`、`panel.border`、`editorGroup.border`、`widget.shadow`（Find/Replace 等 widget 阴影）、`button.background/foreground/border`、`input.border/foreground/placeholderForeground`——**VS Code 的分层词表**：视图自身 1px 边框（l2 级）+ 列表 hover/selected 背景档 + widget 浮层阴影。现状 `.nv-chlist` 浅底 + `.nv-left` border-right 已是该语义。
- 工作区规范：面板呈直角、1px 边框分层、高密度（12-13px 主文本）——与 UX-029 定案的 radius 0 一致。
- 可复用模式：**以"面板边框 + 列表背景档"建立三档表面**（base / 浅fill / hover-fill），浮层用 shadow-lv2 抬升，而非玻璃/渐变。

### 1.4 Linear 公开模式（二手来源标注）

**来源**（均为二手，二次整理）：
- https://sspai.com/post/79347 《什么是 Linear 设计风格？》（少数派，2023-04，中文——满足"≥1 非英语信息源"）
- https://www.uisdc.com/linear 《万字干货！帮你完整掌握爆红的 Linear 风设计风格》（中文）

**核验事实**（二手叙述，非一手 token 值——**凡涉及具体数值均为待验证**）：
- Linear 风格定义（sspai 原文）："大面积暗色背景下，使用**渐变、模糊、动态流光、极细描边、微噪点、外发光**以及庄重的无衬线字体，外加**流畅克制的微动效**"——注意这套工具箱我们**已经超量使用**（渐变✓ 流光✓ 外发光✓），缺的是"克制"：Linear 的装饰是低密度、低频率、服务于分区层次，而非每卡一套光效。
- Karri Saarinen（Linear CEO，前 Airbnb 首席设计师）访谈引用：为软件工程师的"专业感"设计；黑底 + 灰色无衬线字体，减少能耗与视觉疲劳。
- 产品特性（客观事实）：键盘优先（多数操作快捷键）+ 全局命令菜单 + 50ms 同步；应用内置 ≥8 款主题皮肤，社区主题站 linear.style（开源）。
- 实现手法：官网 CSS 以代码实现渐变/发光/噪点（`mask-image`、`radial-gradient`、`linear-gradient`），矢量用 SVG；**浮层弹窗背景做了半透明模糊**（blur 仅用于弹层之上，正文文本区无玻璃）。
- **我们的参考点**：Linear 的"深浅层次"主要靠**明度渐变 + 1px 细描边 + 微噪点**，玻璃模糊只出现在浮层；正文/列表区保持纯色表面。这为方向 A 提供依据（见 §5）。

### 1.5 Feather / Lucide 图标体系（一手核验）

**来源**：
- Lucide 执照页（一手，实测抓取）：https://lucide.dev/license —— 页面明确 **ISC License**（原文 "Lucide License ISC License Copyright…"），**不是 MIT**。
- Lucide 静态包（一手，实测抓取）：`https://unpkg.com/lucide-static@latest/icons/search.svg` 返回 200，注释 `<!-- @license lucide-static v1.37.0 - ISC -->`。
- Feather LICENSE（一手，实测抓取）：https://github.com/feathericons/feather/blob/main/LICENSE —— **MIT**。

**核验事实**：
- Lucide 图标规范（实抓 search.svg）：`viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`——**stroke 用 currentColor**，内联后颜色自动跟随宿主 `color`（字体颜色即图标色），天然适配 `var(--dsw-alias-*)` 颜色体系。
- URL 模式实测有效：`https://unpkg.com/lucide-static@latest/icons/<name>.svg`（全部候选 42/42 返回 200，见附录 A）。
- **推荐固定版本**：`lucide-static@1.37.0`（本次实抓版本），避免 @latest 未来改名/变体（Lucide 近年发生过 `alert-triangle→triangle-alert`、`check-circle→circle-check` 式改名）。
- 许可结论：**内联 SVG 源码 = 复制 MIT/ISC 开源代码进入项目**。MIT 与 ISC 均要求**保留版权与许可声明**——建议在插件头注释或 `<style>` 相邻注释写入 `Icons from Lucide (https://lucide.dev), ISC License © Lucide contributors` / `Feather (https://feathericons.com), MIT License © Cole Bemis` 一行声明即可，满足许可义务（这是许可核验结论，非法务意见）。

---

## 2. 组件级模式目录（推荐视觉模式 → 具体 CSS 声明）

> 约定：所有值均为"可直接落地"的声明；颜色以 `var(--dsw-alias-*)` 为唯一主路径（兜底值可微调）。新增派生 alpha 一律用 `color-mix(in srgb, var(--dsw-alias-…), transparent N%)` 替代现状硬编码 `rgba(79,142,247,.x)`（现状 L3412/L3442/L3444-3446 等已有多处硬编码——属于改进点）。color-mix 需 Chromium ≥ 111（2023-03）；**宿主 Chromium 版本待验证**（若宿主过旧，回落为"固定 rgba 兜底值"策略，两种都零依赖）。
> 圆角派生统一采用 shadcn 公式（§1.1）：`--nv-radius:10px`（基）→ sm 6 / md 8 / lg 10 / xl 14 / full 999。

### 2.1 全局（统一设计语言落地）

| 模式项 | 推荐值（来源） | 声明 |
|---|---|---|
| 过渡曲线 | 150ms `cubic-bezier(0.4,0,0.2,1)`（Tailwind v4 默认，一手） | `transition: border-color .15s cubic-bezier(.4,0,.2,1), background-color .15s cubic-bezier(.4,0,.2,1), color .15s cubic-bezier(.4,0,.2,1), box-shadow .15s cubic-bezier(.4,0,.2,1), transform .15s cubic-bezier(.4,0,.2,1)`——交互元素统一；**未动布局属性**（不转 padding/margin/width/height） |
| 焦点环统一 | Vercel 双环 + shadcn ring 语义（§1.1/§1.2） | `outline:none; box-shadow: 0 0 0 2px var(--dsw-alias-bg-base,#0b0e14), 0 0 0 4px color-mix(in srgb, var(--dsw-alias-state-accent-primary,#4f8ef7) 60%, transparent)`——**仅自定义焦点环替换现有分散模式**：.nv-cinput:focus（仅变边）、.nv-csearch:focus-within（3px 光圈）、.nv-ccard[data-focus]（16px 光晕）、树行（无） |
| 字重 | 只 400/500/600 三档，删 700（Vercel 刻意不用 bold，§1.2） | 现状 700 仅 `LeftNav head`（L1660 内联 fontWeight 700）→ 降 600；其余现状均为 400/600 已合规 |
| 表面三档 | base / fill / elevated（VS Code 词表 + Vercel 灰阶，§1.2/1.3） | base=`var(--dsw-alias-bg-base,#0b0e14)`；fill=`var(--dsw-alias-fill-l1,rgba(255,255,255,.03))`；fill-hover=`rgba(255,255,255,.06)`；elevated=现有 `var(--dsw-alias-bg-elevated,…,shadow-lv2)`——**全部走现有令牌，不新增色板** |

### 2.2 管理工作台 NvConsole

| 组件 | 现状（行号） | 推荐视觉模式（可直接落地） | 来源 |
|---|---|---|---|
| `.nv-console-head` | L3400 | 表面从 fill .02 提为 `rgba(255,255,255,.03)` 并保留 1px l1 底线——头部分层更清晰 | Vercel 表面梯（§1.2） |
| `.nv-console-title-ico` | L3404（📖 emoji 18px） | **替换为 Lucide `book-open` 内联 SVG 16px**（见 §3.4 行 1），`currentColor` 继承 tertiary→hover 转 primary | Lucide §1.5 |
| `.nv-console-head .nv-mini`（✕） | L3408-3409 | emoji ✕ 16px → Lucide `x` 16px 内联；hover 保持 accent 边+字 | Lucide |
| `.nv-cbtn.nv-cbtn-ws` | L3412-3413 | ①硬编码 `rgba(79,142,247,.12)` → `color-mix(in srgb, var(--dsw-alias-state-accent-primary,#4f8ef7) 12%, transparent)`；②加 `transition-colors .15s`（现无过渡）；③hover 底色 22% → 20% 且**只变化底色**，保留现行"accent 边+字" | shadcn 按钮 hover 语义（§1.1） |
| `.nv-csortbtn` | L3432-3434 | 选中态加"accent 底 alpha 5% + accent 边 + accent 字"（现状无底色）→ `background: color-mix(in srgb, var(--dsw-alias-state-accent-primary,#4f8ef7) 8%, transparent)`；未选中 hover 仅文字提级（Vercel"纯颜色交互"） | shadcn outline（§1.1）/Vercel（§1.2） |
| `.nv-ccard` | L3440-3442 | **玻璃渐变保留但收敛**：`linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.02) 45%, rgba(0,0,0,.05))` → 降为 `linear-gradient(135deg, rgba(255,255,255,.05), rgba(255,255,255,.02) 55%, rgba(0,0,0,.03))`（峰值 .07→.05，阴影层 .05→.03）；hover 提亮对应下调；shadow `0 1px 6px rgba(0,0,0,.08)` → `0 1px 3px rgba(0,0,0,.15)`（更"收"，减少浮空感） | Linear 克制原则（§1.4）+ 反面证据（§4） |
| `.nv-ccard[data-focus=true]` | L3442 | 16px 光晕收敛为**统一双环**：`0 0 0 2px var(--dsw-alias-bg-base,#0b0e14), 0 0 0 4px color-mix(in srgb, var(--dsw-alias-state-accent-primary,#4f8ef7) 60%, transparent)`——与全局焦点环一致 | Vercel 双环（§1.2） |
| `.nv-ccard[data-glow=*]` | L3444-3446 | 整卡彩色边框 + 8/22/24px 辉光 → **收敛为「中性边框 + 门内状态点 + 可选 2px 顶部状态条」**：`border-color: var(--dsw-alias-border-l2,#3a4150)`；顶部条 `box-shadow: inset 0 2px 0 0 color-mix(in srgb, var(--dsw-alias-state-*,#…) 70%, transparent)`；状态点沿用 `.nv-cdot` 现语义。删 22-24px 大辉光 | Vercel：状态色只作 ≤10px 点（§1.2）+ §4 反面证据 |
| `.nv-csweep` | L3450-3451 | **建议删除或降强度**：峰值 alpha .14 → .08，周期 3.2s→4.5s；或仅 busy 卡保留（其余卡静止）。若方向 C（§5）则整体删除 | Vercel"no gradients…no color for color's sake"（§1.2） |
| `.nv-ccard-name` L3455 / `.nv-ccard-badge` L3456 | 维持 16px/600；徽标：`letter-spacing .02em` + `font-weight 500` + radius 999（现状 radius 8 方角）→ 更"徽章感" | Vercel 9999px pill（§1.2） |
| `.nv-ccard-status` | L3457 | 13px 维持；绑定点与状态色继续用 `.nv-cdot`（**图标化替代 emoji 不在此处——点语义用 CSS 已足够，勿改为图标**） | 现状语义已定（UX 系列） |
| `.nv-cico`（🔗/🗑） | L3465-3467 | emoji → Lucide `link` 14px / `trash-2` 14px 内联（22×22 钮内居中）；hover 色态与 del danger 保持 | Lucide |
| `.nv-cfold` | L3469-3470 | 11px 下划线维持；可加 `chevron-down` 12px 前缀图标（可选） | Lucide |
| `.nv-cplus` | L3473-3475 | ＋ 26px → Lucide `plus` 20px 内联（视觉更干净；或保留文本 ＋ 但 font-weight 600→400）；hover 缩放 1.02 保留 | Lucide |
| `.nv-csearch-icon` | L3421（🔍 emoji） | → Lucide `search` 16px；**加大拍点**：`color: var(--dsw-alias-label-secondary,#9aa4b2)`（现状 tertiary——放大后再降一等） | Lucide |
| `.nv-csearch:focus-within` | L3420 | `0 0 0 3px rgba(79,142,247,.25)` → 统一双环：`0 0 0 2px var(--dsw-alias-bg-base,#0b0e14), 0 0 0 4px color-mix(in srgb, var(--dsw-alias-state-accent-primary,#4f8ef7) 45%, transparent)`（搜索框"软焦点"比卡片低 15% 强度） | Vercel 双环变体（§1.2） |
| `.nv-cinput` / `.nv-cinput:focus` | L3501-3502 | 12px→13px（cmodal 内已 13px，统一为 13px 输入——**不改几何只改字号**，需确认 cmodal 作用域外输入密集处）；focus 加双环替单边 | shadcn input/ring（§1.1） |
| `.nv-cbtn-accent` / `.nv-cbtn` | L3504-3507 | accent:hover 由 `brightness(1.08)` 改为 `color-mix(in srgb, var(--dsw-alias-state-accent-primary,#4f8ef7) 88%, black)` 底色（更可控的提亮）；普通钮加 `transition-colors` | shadcn default hover:bg-primary/90（§1.1） |

### 2.3 侧栏抽屉 Drawer

| 组件 | 现状（行号） | 推荐视觉模式 | 来源 |
|---|---|---|---|
| `.nv-drawer-title-ico` | L3301（📖 16px emoji） | → Lucide `book-open` 14px 内联 | Lucide |
| `.nv-drawer-caret` | L3298（▾ 9px 文本） | → Lucide `chevron-down` 10px 内联（与树目录 ▸/▾ 图标化方向一致） | Lucide |
| `.nv-card` | L3308-3310 | radius 10 维持；默认底 `.02`→`.03`（与全局 fill 对齐）；hover 保持 accent 边——**不引入玻璃/渐变/发光**（树小卡信息密度高，装饰最小化） | shadcn ghost/outline 语义（§1.1） |
| `.nv-dot` | L3317-3326 | 保持 CSS 圆点（含 busy 脉冲、need/done 微发光、stale 空心）——**不再图标化**；发光 `0 0 6px` → `0 0 0 3px color-mix(… 25%, transparent)`（"收光效、不加噪声"） | Linear 克制（§1.4） |
| `.nv-empty` | L3314 | 空态升级：中央对齐 + 一个 24px 淡图标（如 `folder-open`/`inbox`/`search` 按上下文）+ 文字；dashed 边框保留 | shadcn empty-state 惯例 + Lucide |

### 2.4 创作工作台 SplitWorkspace

| 组件 | 现状（行号） | 推荐视觉模式 | 来源 |
|---|---|---|---|
| `.nv-bar` | L3344 | 背景从 bg-base 提为 `bg-elevated` 或加 `background: linear-gradient(180deg, rgba(255,255,255,.02), transparent)` 顶光——标题栏与内容区分离感（**不改 38px 高/几何**） | Linear 明度层次（§1.4） |
| `.nv-bar-title` | L3345 | 14px/600 维持；标题前可加 `book-open` 12px 图标（与抽屉/控制台一致） | Lucide |
| 居中横幅（内联 L2911-2921） | — | 内联样式建议**类化** `.nv-bar-banner`：`position:absolute;left:50%;transform:translateX(-50%)` 保留（几何不动），视觉上：阶段徽标 radius 8→999、`font-weight 500`、统计文字 tertiary 维持 | Vercel pill（§1.2） |
| `.nv-bar-launch` | L3511-3513 | ▶ 文本 → Lucide `play` 14px + 文本（`display:inline-flex;align-items:center;gap:6px`）；hover `brightness(1.08)` → `color-mix(… 88%, black)` 底色 | shadcn default（§1.1） |
| `.nv-bar-ctl`（⇄ ⟳ ☆ ✕） | L3516-3517 | emoji → Lucide `arrow-left-right`/`rotate-ccw`/`star`/`x` 16px 内联（32×32 钮内）；hover 保持 accent 边+字 | Lucide |
| 文件树行（内联 L1577-1587） | 无类 | **建议类化** `.nv-ft-row`/`.nv-ft-row[data-sel]`：`padding:3px 6px;border-radius:6px;transition:background-color .12s`；选中 `background: color-mix(in srgb, var(--dsw-alias-state-accent-primary,#4f8ef7) 12%, transparent)`（现状 fillHover 白 .06——accent 12% 更"选中感"且与 focus 体系一致）；目录 glyph ▸/▾ → `chevron-right` 12px（展开时 rotate 90°，CSS `transform` + `transition .15s`）；📄 → `file-text` 12px。**仅类化+视觉，不改行高/缩进几何** | shadcn tree/list 选中（§1.1）+ VS Code list.activeSelectionBackground（§1.3） |
| 文件树区标题（`head()` L1660） | 11px/700 `TK.text3` | 700→600（Vercel 三字重）；可加 `letter-spacing:.05em`（现状已有） | Vercel（§1.2） |
| 工作流状态清单（L1366 emoji） | `✅🔄⬜` | → Lucide `circle-check`/`refresh-cw`(或 `loader`) /`circle` 12px 内联行内图标（状态色点语义保留——done 绿/current accent/待办 tertiary）；行选中态（当前阶段）加 `background: color-mix(accent 8%)` | Linear 清单风格（§1.4）+ Lucide |
| 门禁卡（L1354-1356） | 内联 | 类化 `.nv-gate-card`：`border-left:2px` 语义沿用 `.nv-group`（accent 边）；`发布/变现 ✓/✗` → `circle-check`/`x` 12px | 现状 `.nv-group` 模式扩展 |
| 章节列行（内联 L1300-1315） | 无类 | **类化** `.nv-chrow`/`[data-sel]`：radius 6 保留；选中 `background: color-mix(accent 10%)`+左边 2px accent 竖条（`box-shadow: inset 2px 0 0`）；`✓/⚠` → `check` 12px（绿）/`triangle-alert` 12px（黄）内联 | VS Code 列表选中（§1.3）+ shadcn 语义色（§1.1） |
| `.nv-tab` | L3387-3389 | 现状 pill 形态维持（方向 B）；hover `background .05` 保留；**加图标**：数据 `database` / 发布 `cloud-upload` / 请求 `inbox` 各 12px（与 12px 文本同行）+ 信号角标 ⚠→`bell` 12px warn（L2841 内联 ⚠ 文本） | shadcn tabs + Lucide |
| `.nv-modal`/`.nv-cmodal` | L3392/L3497 | radius 统一：modal 12 / cmodal 14 维持（几何已定）；**shadow-lv2 双层** `var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.4)), 0 0 0 1px rgba(0,0,0,.25)`（1px 深色描边替代边框与背景的糊边感——Vercel shadow-as-border 的暗色变体） | Vercel（§1.2） |
| `.nv-group` | L3393 | 左 2px accent 边保留；底色 .04→.03 + 13px（现状 12px 偏小，若行高允许） | 维持+微调 |
| 弹窗遮罩 | `.nv-modal-backdrop` L3391 / `.nv-cmodal-backdrop` L3496 | rgba(0,0,0,.45) 维持（Linear 弹层才 blur——**正文区不用玻璃**） | Linear（§1.4） |
| `.nv-bar-note` | L3518-3520 | 添加对应图标前缀（ok=`circle-check`/err=`circle-alert`/info=`info` 12px） | Lucide |

> **已定案勿动**（本次明确排除在视觉重构之外）：`.nv-vdiv/.nv-chatdiv/.nv-chdiv/.nv-middiv` 4px hit 区 + hover/active inset accent 线（L3356-3384）、`.nv-scl` 滚动事件驱动 1.5s 隐藏（L3374-3381）、`.nv-split` radius 0（L3340）、38px 标题栏、48px 搜索、180px 卡高、minmax(320px,1fr) 网格。

---

## 3. 图标选型表

### 3.1 许可核验结论（事实）

| 库 | 许可（实测） | 核验来源 | 内联可行性 |
|---|---|---|---|
| **Lucide**（首选） | **ISC**（非 MIT——修正任务描述；ISC 为 OSI 宽松许可，与 MIT 兼容性等效） | https://lucide.dev/license（页面 "Lucide License ISC License"）；unpkg 包头 `@license lucide-static v1.37.0 - ISC` | ✅ 24×24、stroke=currentColor、stroke-width=2；内联后颜色随宿主令牌 |
| **Feather**（备选） | MIT | https://github.com/feathericons/feather/blob/main/LICENSE | ✅ 同 24×24 单色线描风格；但图标集较小（284 个，部分状态类图标缺，维护趋于停滞） |
| 建议 | **Lucide 为主**（图标量大、持续维护、命名现代），Feather 仅作个别图标备选 | — | — |

许可义务：内联时保留一行来源注释（如 `/* Icons: Lucide, ISC License, https://lucide.dev */`）。**非法务意见，仅为常见实践结论。**

### 3.2 使用位置映射表（30 个核心图标 + 备选）

> URL 模式（已实测 200）：`https://unpkg.com/lucide-static@latest/icons/<name>.svg`
> 推荐固定 `@1.37.0`（本次实抓版本）。全部图标源码实抓于附录 A（真实数据，非编造）。

| # | 位置 | 组件/类 | 图标名（Lucide） | URL | 备选（Feather 名） |
|---|---|---|---|---|---|
| 1 | 控制台标题 📖 | `.nv-console-title-ico` | `book-open` | …/icons/book-open.svg | book-open |
| 2 | 抽屉标题 📖 | `.nv-drawer-title-ico` | `book-open`（14px） | 同上 | book-open |
| 3 | 卡片图标 📖 | `.nv-ccard-icon`（L2146） | `book-open`（16px） | 同上 | book-open |
| 4 | 搜索 🔍 | `.nv-csearch-icon` | `search` | …/icons/search.svg | search |
| 5 | ＋ 新建磁贴 | `.nv-cplus` | `plus`（20px） | …/icons/plus.svg | plus |
| 6 | 关闭 ✕（控制台头/标题栏/弹窗/预览头） | `.nv-console-head .nv-mini` / `.nv-bar-ctl` / modal / FilePreview | `x` | …/icons/x.svg | x |
| 7 | 删除 🗑 | `.nv-cico-del` | `trash-2` | …/icons/trash-2.svg | trash-2 |
| 8 | 绑定 🔗 | `.nv-cico` | `link` | …/icons/link.svg | link |
| 9 | 绑定备选（更"链"感） | — | `link-2` | …/icons/link-2.svg | — |
| 10 | ▶ 开始/继续工作流 | `.nv-bar-launch` | `play` | …/icons/play.svg | play |
| 11 | ⇄ 换边 | `.nv-bar-ctl` | `arrow-left-right` | …/icons/arrow-left-right.svg | repeat |
| 12 | ⟳ 恢复默认布局 | `.nv-bar-ctl` | `rotate-ccw` | …/icons/rotate-ccw.svg | rotate-ccw |
| 13 | ☆ 固化为默认 | `.nv-bar-ctl` | `star` | …/icons/star.svg | star |
| 14 | « 折叠左窗 | `.nv-bar .nv-mini` | `chevrons-left`（14px） | …/icons/chevrons-left.svg | chevrons-left |
| 15 | ▾ 抽屉折叠 | `.nv-drawer-caret` | `chevron-down`（10px) | …/icons/chevron-down.svg | chevron-down |
| 16 | ▸ 目录折叠箭头 | 文件树行 | `chevron-right`（12px，展开 rotate90） | …/icons/chevron-right.svg | chevron-right |
| 17 | 目录（文件夹） | 文件树行 | `folder`（12px） | …/icons/folder.svg | folder |
| 18 | 目录展开态 | 文件树行 | `folder-open`（12px） | …/icons/folder-open.svg | folder-plus |
| 19 | 📄 文件 | 文件树行 / `.nv-file-preview-head` | `file-text`（12px） | …/icons/file-text.svg | file-text |
| 20 | 数据页签 | `.nv-tab`（data） | `database`（12px） | …/icons/database.svg | database |
| 21 | 发布页签 | `.nv-tab`（publish） | `cloud-upload`（12px） | …/icons/cloud-upload.svg | upload-cloud |
| 22 | 请求页签/提交 | `.nv-tab`（requests）/ RequestPanel | `inbox` 或 `send`（12px） | …/icons/inbox.svg | inbox |
| 23 | 请求列表行 | RequestPanel 行 | `clipboard-list`（12px） | …/icons/clipboard-list.svg | clipboard |
| 24 | 工作流清单 | WorkflowPanel 标题/阶段行 | `list-checks`（12px） | …/icons/list-checks.svg | list |
| 25 | 工作流状态面板标题 | WorkflowPanel | `workflow`（14px） | …/icons/workflow.svg | git-branch |
| 26 | 工作流备选 | — | `git-branch`（14px） | …/icons/git-branch.svg | git-branch |
| 27 | 平台配置 ⚙ | PublishPanel | `settings`（12px） | …/icons/settings.svg | settings |
| 28 | 阶段完成 ✅ → 清单 | WorkflowPanel 行 | `circle-check`（12px，success 色） | …/icons/circle-check.svg | check-circle |
| 29 | 章节 ✓ / 完成标记 | `.nv-chrow` | `check`（12px，success 色） | …/icons/check.svg | check |
| 30 | 门禁/信号 ⚠ | `.nv-chrow` / 页签角标 / 门禁卡 | `triangle-alert`（12px，warning 色） | …/icons/triangle-alert.svg | alert-triangle |
| 31 | 刷新 | DataPanel | `refresh-cw`（12px） | …/icons/refresh-cw.svg | refresh-cw |
| 32 | 编辑（阅读区编辑钮） | 编辑器行 | `pencil-line`（12px） | …/icons/pencil-line.svg | edit-3 |
| 33 | 信号/数据面板 | DataPanel | `chart-line`（12px） | …/icons/chart-line.svg | trending-up |
| 34 | 请求通知 ⚠ 计数 | `.nv-tabs` 角标 | `bell`（12px，warning 色） | …/icons/bell.svg | bell |
| 35 | info 提示条 | `.nv-bar-note[data-kind=info]` | `info`（12px） | …/icons/info.svg | info |
| 36 | 阅读模式 | 内容列工具栏 | `eye`（14px） | …/icons/eye.svg | eye |
| 37 | 收益数据 | DataPanel | `wallet`（12px） | …/icons/wallet.svg | credit-card |
| 38 | 读者互动 | DataPanel/工作流 | `users`（12px） | …/icons/users.svg | users |
| 39 | 保存（预警/设置保存） | SettingsPage/DataPanel | `save`（12px） | …/icons/save.svg | save |
| 40 | 状态点（保持 CSS，不图标化） | `.nv-dot`/`.nv-cdot` | —（circle 参考） | …/icons/circle.svg | circle |

> 注：表内 1-30 + 备选即满足 25~35 个核心图标要求；31-40 为延伸（同一 URL 模式，均已实抓验证）。**图标尺寸建议**：应用内一律 12/14/16px 三档（对应 22×22 钮 14px、32×32 钮 16px、行内 12px——shadcn 惯例 `[&_svg]:size-4` 为 16px，小行内用 12px 折半）。
> **CSS 禁止事项**：Lucide 图标**不要**用 `filter`/内联 fill 改色——stroke=currentColor 已继承；彩色语义（success/warning/danger）用外层 `color:` 令牌设置（如 `color:var(--dsw-alias-state-success,#3fb950)`）。

### 3.3 内联实现建议（供 Developer 参考，非决策）

- 建一个 `const ICONS = { name: '<svg …>' }` 映射（无 React 依赖，`el('span',{innerHTML?})` 或 vnode 直插 `dangerouslySetInnerHTML` 等价物——以本仓库既有 `el()` 风格为准，**这是实现层选择**）。
- 每图标 SVG 固定：`width/height=尺寸, viewBox 0 0 24 24, fill=none, stroke=currentColor, stroke-width=2, stroke-linecap=round, stroke-linejoin=round`（附录 A 原样）。
- 若宿主环境不支持直接注入 SVG 字符串（XSS 面小且图标为常量字符串），用 `innerHTML` 安全（内容自控）。

---

## 4. 反面证据（成熟开源项目刻意不做 / 我们也不该做）

### 4.1 Vercel：明言"无渐变、无装饰性边框、色彩不因色彩本身存在"+ 状态色只许 ≤10px 点（一手规范，**直接对立于现状**）

来源：https://github.com/educlopez/design-bites/blob/main/design-mds/vercel.com/DESIGN.md（爬自 vercel.com 源码）
- 原文："no gradients, no decorative borders, no color for color's sake"；状态色"exist in small dot-sized badges (`div.size-2.5`)，**never as background fills or large swaths**"。
- **与现状的正面冲突**：`.nv-ccard[data-glow=need/done/busy]`（L3444-3446）是"整卡彩色边框 + 22-24px 多档辉光 + inset 亮区"，`.nv-csweep`（L3450）是持续的装饰性渐变扫光——**恰是 Vercel 明令禁止的两类**。结论：现状的"装饰过度"不是量少，而是**方向性偏差**——用户感到"简陋"的对症药不是更多光效，而是层次与秩序（Vercel 用无彩色层阶 + 单一 accent + 状态点换来"engineered"感）。

### 4.2 玻璃拟态（Glassmorphism）与文本可读性的真实冲突

来源（二手，为多角度引用）：
- New Target：Glassmorphism with Website Accessibility in Mind（https://www.newtarget.com/web-insights-blog/glassmorphism/）——半透明+模糊背景与下方内容对比度不可控，小号/正文文本易跌破 WCAG 对比度要求。
- 真实项目审计案例：https://github.com/jukasdrj/books-v3/issues/89（WCAG accessibility audit for glassmorphism design language）——某开源图书项目因玻璃拟态设计语言被开出 WCAG 审计 issue。
- **我们自己的场景**：创作台正文区 13px 正文（L1319 阅读区）、章节列 12px（L1307）、文件树 12px——**高密度小字界面**恰是玻璃拟态的禁忌区（§0.4 已列事实）。结论：**玻璃/模糊只允许出现在卡片层的轻渐变与弹窗遮罩，绝不允许进入阅读区/列表/树**；现状 `.nv-ccard` 渐变只作用于卡片可保留但须降强度（§2.2 已给值）。

### 4.3 装饰性动画的重负荷风险（Linear 的"克制"对照）

来源：https://sspai.com/post/79347（二手）
- Linear 风格的描述原文含"动态流光、微动效"，但落点是 **"流畅克制"**：动效服务分区与状态，而非持续演出。我们现状 `.nv-csweep` 为**常驻 3.2s 无限循环**（L3450-3451）——同类界面（Linear/shazam/杂项）无此"常驻装饰"。结论：**常驻循环装饰 = 噪声**，减为 busy 态专属或将强度减半（§2.2 已给值；方向 C 则删除）。

> **反确认偏差声明**（stage-research 强制项）：本调研也存在"支持假设"的发现（如方向 B 的现代感提升是假设不是实测），已在 §5.3 中列出每方向的可验证差异，未做任何实证对照实验——**全部视觉建议为"参考+演绎"级别，最终请以用户实地 A/B 反馈定案**（属于待验证项）。

---

## 5. 统一设计语言提案（贯穿管理台 + 创作台）

### 5.1 设计原则（8 条，全部可在现有令牌体系中表达）

| # | 原则 | 落地规则 | 来源 |
|---|---|---|---|
| P1 | 层次用"明度阶梯"而非装饰 | base → fill(.03) → fill-hover(.06) → elevated 四档表面；每档只差 2~3% 白 | Vercel 灰阶（§1.2）/VS Code（§1.3） |
| P2 | 颜色矜持 | accent 只用于：可交互、焦点环、选中态；状态色（success/warning/danger）只作 **≤12px 点/图标色**，不作大面填充 | Vercel（§1.2） |
| P3 | 圆角统一派生 | `--nv-radius:10px`（=shadcn 0.625rem），派生 6/8/10/14/999——现状全部圆角已在集合内（4/5 微小项并入 6） | shadcn（§1.1） |
| P4 | 焦点环唯一 | 双环 `0 0 0 2px bg-base + 0 0 0 4px accent@60%`；卡片/搜索允许降强度变体；**消灭"无焦点态"（树行/章节行）** | Vercel 双环 + shadcn ring（§1.1/1.2） |
| P5 | 过渡唯一 | 150ms `cubic-bezier(.4,0,.2,1)`；只转（border/background/color/box-shadow/transform）；**禁用 duration>250ms 的 UI 过渡与常驻循环装饰** | Tailwind v4（§1.1） |
| P6 | 图标唯一 | 全部 Lucide 24×24 stroke=2 内联，只 12/14/16px 三档，色随 currentColor+令牌；**禁止 emoji 作 UI 图标**（仅正文/装饰场景可保留） | Lucide（§1.5） |
| P7 | 字重三档 | 400/500/600；删除 700（现状仅 1 处 L1660）；标题负字距可选 | Vercel（§1.2） |
| P8 | 玻璃只许两个位置 | ①卡片轻渐变（降强度，§2.2）②弹窗遮罩（现有 45% 黑）；**阅读区/列表/树永不玻璃** | §4 反面证据 |

### 5.2 令牌现状与派生（零新增色板）

- 保持 `var(--dsw-alias-*)` 主路径与兜底值；**只派生 alpha**（`color-mix(in srgb, var(--dsw-alias-state-*,…) N%, transparent)`）——替代现状 5 处硬编码 `rgba(79,142,247,…)`（L3412/3413/3420/3442/3474；另有 glow 段 L3444-3446 的三组状态色硬编码 `rgba(210,153,34,*)`/`rgba(63,185,80,*)`/`rgba(94,160,255,*)` 可用同法令牌化）。
- 如需"卡片 hover 提亮态"，用 `--dsw-alias-fill-l1` 两档（.03/.06）即可，不新增令牌。

### 5.3 三个可选设计方向（差异点 + 证据 + 推荐序，**最终由 Coordinator/用户定**）

**方向 A —— Linear 式冷静专业**（现状母体，做"收敛"）
- 保留/强化：暗底明度层次、卡片轻渐变（降为 .05 峰值）、1px 细描边（l1/l2 两档）、可选微噪点、弹窗遮罩 blur（可选）、重点卡 modest 光效（仅 busy）。
- 删减/收敛：常驻扫光（减半或摘除）、大辉光状态（→顶部 2px 状态条）、emoji 感（全部换 Lucide）。
- 字阶：13-16px、Inter 式；动效 150ms 以内。
- 来源：§1.4 + §1.2。**推荐序：②（与现状血缘最近，实施风险最小，但"设计感提升"上限中等）**——适合"快改、风险低"。

**方向 B —— shadcn 式轻快现代**（推荐首选）
- 保持：现有全部几何。改造：卡片/面板走纯 fill alpha 表面（**去玻璃渐变，只留 1px l2 边框 + hover 提亮**）；focus 环统一 ring；控件按 shadcn 变体语义（outline/ghost/default）；图标 12/14/16 统一 Lucide；圆角派生公式（6/8/10/14，与现状一致零冲突）；按钮 shadow-sm。
- 差异点：相比 A 更"扁平、干净、分层清晰"，装饰为零；相比 C 更"轻快"（半径保留、hover 用 accent 提亮而非白提亮）。
- 来源：§1.1（registry 一手值全部可用）+ §1.2（双环/颜色矜持）。**推荐序：①（最高"设计感提升/风险"比；shadcn 生态文档最全、值体系可查询验证）**。

**方向 C —— 编辑器式高密度朴素**（VS Code 血统，极简备选）
- 与现状血缘：直角工作台已定（UX-029）、sash 语义已定（UX-030）——**C 是与现有"已定案"最一致的方向**。
- 改造：删除 `.nv-csweep`、删 `.nv-ccard` 渐变与辉光；圆角收敛 ≤8px（卡片 10→8？**布局红线：圆角不算几何，可动，但需与 UX-029 论证一致性**——标注待定）；字阶整体 11-14px 高密度；状态仅圆点；无装饰动画。
- 取舍：观感最"工具化、专业"但可能被用户判为"更素、更简陋"——**高风险低回报**。推荐序：③（仅当用户明确要"编辑器感"时选）。

**决策建议**（不强推，供 Coordinator 转呈）：**B 为主轴 + A 的"卡片轻渐变"点缀**（即 B 方向上允许 .nv-ccard 保留 1 层 5% 渐变作"唯一装饰许可"），C 不作默认。视觉方向属关键决策，最终由用户选择（本调研只出事实与差异）。

---

## 6. 关键发现（7 条，均带来源）

1. **"简陋"的根因不是缺少装饰，而是方向性偏差**：现状装饰（玻璃渐变+三色辉光+常驻扫光）恰是 Vercel 规范明令禁止的三类（"no gradients, no decorative borders, no color for color's sake"；状态色不得作大面填充），而层次秩序（明度阶梯/焦点环/统一图标）反而缺失。【§4.1：design-bites/vercel.com DESIGN.md】
2. **图标体系是最大、最便宜的设计感杠杆**：全 UI 现用 emoji/文本字符（📖🔍🔗🗑⇄⟳☆✕▸▾✅🔄⬜✓⚠），风格随系统字体漂移；换 Lucide 内联（ISC 许可；42 个图标 path 已实抓，附录 A）可一刀统一。【§1.5, §3；https://lucide.dev/license】
3. **许可事实修正**：Lucide 现行许可是 **ISC**（不是任务描述的 MIT）；Feather 为 MIT。ISC 与 MIT 同属 OSI 宽松许可，内联可行，仅需保留一行来源声明。【§3.1】
4. **焦点态严重不统一**：`.nv-csearch` 3px 光圈 / `.nv-ccard` 16px 光晕 / `.nv-cinput` 仅变边 / 文件树与章节行**无焦点态**——统一为 Vercel 双环（2px bg 缓冲 + 4px accent）可显著提升"设计感"。【§1.2；L3420/3442/3502/1577/1300】
5. **现有圆角体系与 shadcn 派生公式完全同构**（6/8/10/14 ≡ sm/md/lg/xl，基 10px）——方向 B 不改变任何现有半径，回归风险为零。【§1.1：ui.shadcn.com/docs/theming】
6. **过渡曲线不一致**：现状 `ease`（cubic-bezier(.25,.1,.25,1)）+ 120/150ms 混用；统一为 150ms `cubic-bezier(.4,0,.2,1)`（Tailwind v4 默认，一手）后微交互观感即上台阶。【§1.1：tailwindcss theme.css】
7. **状态光效应"点化/条化"而非"整卡化"**：`data-glow` 整卡彩色边框+辉光 → 中性边框+顶部 2px 状态条+既有状态点，是与 Vercel/Linear 策略一致的收敛方向，同时保持状态辨识度（点色不变）。【§1.2/§1.4/§4.1】

---

## 7. 待验证项

| # | 项 | 状态 | 备注 |
|---|---|---|---|
| V1 | `dsh-worktable-research` 克隆路径 | **本机不存在**（全树搜索 0 命中） | 请求 Coordinator 提供路径；"对照 dsh-worktable"的注释结论暂无法独立核验 |
| V2 | 宿主 Chromium/Electron 版本是否支持 `color-mix()`（需 ≥111） | 待验证 | 不支持则回落固定 rgba 兜底值（两案均零依赖） |
| V3 | Lucide `@1.37.0` 版本固定后是否长期维护（unpkg resolve） | 已实抓 v1.37.0 | 建议 lock 版本；官方 CDN `lucide.dev` 有 loader（不采用——约束零网络） |
| V4 | Vercel 官方 Geist 设计系统站点（vercel.com/design, geist.vercel.app）不可达 | 待验证 | 本报告 Geist 数值取自爬自源码的 DESIGN.md（二手） |
| V5 | Linear 具体 token 值（背景明度、渐变 stop、噪点实现） | 待验证 | 官方未公开；Linear 主题社区（linear.style）未深入 |
| V6 | `.nv-cmodal .nv-cinput` 12→13px 统一的密集性影响 | 待验证 | 需 Developer 确认所有输入上下文（工作区名/章节号等） |
| V7 | 各方向（A/B/C）的实测评价 | 待验证 | 建议实现后由用户实地打分（本报告无实证） |
| V8 | 方向 C 中"圆角收敛 ≤8px"与 UX-029（radius 0 论证）的关系 | 待验证 | 卡片圆角与工作台直角是不同层级，需 Architect 确认 |
| V9 | `data-glow` 收敛后对"门禁/绑定状态"辨识度的实测影响 | 待验证 | 状态点已有；顶部条为新方案 |

---

## 8. 来源索引（关键；全部可点击复核）

| 来源 | URL | 一手/二手 |
|---|---|---|
| shadcn 主题文档（radius 派生、令牌架构） | https://ui.shadcn.com/docs/theming | 一手 |
| shadcn 定制 skill（令牌角色、--radius 全局控制） | https://github.com/shadcn-ui/ui/blob/main/skills/shadcn/customization.md | 一手 |
| shadcn Button registry（变体/焦点环/禁用/SVG 尺寸） | https://ui.shadcn.com/r/styles/new-york/button.json | 一手（实测 200） |
| Tailwind v4 theme.css（150ms + cubic-bezier(.4,0,.2,1)） | https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/theme.css | 一手（实测 200） |
| Vercel 设计规范（vercel.com 源码） | https://github.com/educlopez/design-bites/blob/main/design-mds/vercel.com/DESIGN.md | 二手（爬取源码） |
| VS Code 主题色 API（sash.hoverBorder/focusBorder/list.*/widget.shadow） | https://code.visualstudio.com/api/references/theme-color | 一手 |
| Lucide 许可页（ISC） | https://lucide.dev/license | 一手（实测抓取） |
| Lucide 图标源（URL 模式实测） | https://unpkg.com/lucide-static@latest/icons/search.svg（+附录 A 42 个） | 一手（实测 200） |
| Feather LICENSE（MIT） | https://github.com/feathericons/feather/blob/main/LICENSE | 一手 |
| Linear 风格分析（中文） | https://sspai.com/post/79347 | 二手 |
| Linear 风格详解（中文） | https://www.uisdc.com/linear | 二手 |
| 玻璃拟态可读性（New Target） | https://www.newtarget.com/web-insights-blog/glassmorphism/ | 二手 |
| 玻璃拟态 WCAG 审计案例 | https://github.com/jukasdrj/books-v3/issues/89 | 二手（真实 issue） |
| 现状全部类/值/行号 | `lib\client.js` L3288-L3521（NV_STYLE）及正文引用行 | 一手（本仓库） |

---

## 附录 A：Lucide 图标 SVG 实抓数据（真实网络获取，2026-08 会话）

> 获取方式：`https://unpkg.com/lucide-static@latest/icons/<name>.svg`（42/42 返回 200）。以下为各图标 `<svg>` 内 `<g>` 级源码（**均含共同常量**：`viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`，内联时附加 width/height 尺寸三档 12/14/16）。版权：Lucide **ISC**（© Lucide contributors）。

```
search: <path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>
plus: <path d="M5 12h14"/><path d="M12 5v14"/>
x: <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
trash-2: <path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
link: <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
link-2: <path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>
play: <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>
arrow-left-right: <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>
rotate-ccw: <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
star: <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
folder: <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
folder-open: <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>
file-text: <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
file: <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/>
check: <path d="M20 6 9 17l-5-5"/>
circle-check: <circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>
circle-check-big: <path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>
triangle-alert: <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>
alert-circle: <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
refresh-cw: <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
database: <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
cloud-upload: <path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>
send: <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>
inbox: <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
clipboard-list: <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
list-checks: <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/>
workflow: <rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>
git-branch: <path d="M15 6a9 9 0 0 0-9 9V3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
settings: <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>
save: <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>
chevron-down: <path d="m6 9 6 6 6-6"/>
chevron-right: <path d="m9 18 6-6-6-6"/>
chevrons-left: <path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>
book-open: <path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>
circle: <circle cx="12" cy="12" r="10"/>
pencil-line: <path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
chart-line: <path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>
bell: <path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
info: <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
eye: <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>
wallet: <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
users: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>
```

---

*（本文件为 UX-053 唯一修改文件；未修改产品代码与 `.governance/` 治理记录。完成状态：调研完成，可进入方案评审。）*

---

## Coordinator 补记（2026-08-29，V1 事实核验）

- **V1 已解决**：`dsh-worktable-research` 克隆实际位于 `C:\Users\peter\AppData\Local\Temp\dsh-worktable-research`（%TEMP% 下，非 D 盘——Analyst 搜索范围限于 D:\AI\agent 故 0 命中）。本会话 Coordinator 已实测列目录确认存在（00_index / 01_content / 02_process / 04_test / docs 五个子目录，含 01_content\lib 与 01_content\src）。§0.3 的「本机不存在」结论作废；client.js 中「对照 dsh-worktable」注释可按该克隆核验。克隆为临时目录（TEMP），重启后可能被清理——如需长期核验需重新克隆 Aisland-SJL/dsh-worktable。
- 调研结论不受 V1 影响（本报告全部推荐值的来源为 shadcn/Vercel/VS Code/Tailwind/Lucide 一手或已标注二手来源，未依赖该克隆）。
