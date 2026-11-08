# 主题系统设计规格（待合并到 UX-065 / v0.6.0）

状态：用户已审核主题方向（2026-11-08，三套都按设计板做）。
基准：`themes.html` / `themes-board.png`（本目录）；当前 `lib/client.js` 的 `--nv-*` 令牌层。
原则：主题只换视觉令牌，不改布局、内容、交互、API、数据与 localStorage 既有 key。当前「墨纸」为默认主题。

## 1. 范围

- 小说管理工作台（`NvConsole`，书斋）：顶栏 + 首页 + 空态 + 书籍页 + 新建/设置等既有浮层。
- 小说工作台（`SplitWorkspace`，写作台）：标题栏 + 章节列 + 正文 + 状态栏 + 原生会话抽屉 chrome。
- 设置页 `settings.section` 的「外观 / 主题」管理区。
- 未来主题只增加注册项，不改版式；首版内置 3 套：墨纸（默认）、青简、夜航。

非目标：
- 不覆盖宿主全局 `--dsw-*`，不改变宿主其他界面。
- 不跟随/伪造 `data-theme`，不写 `color-scheme`；明暗继续由宿主 `light-dark()` 驱动。
- 不改 S1/S2 已批准文案与布局；不新增主题市场/导入导出。

## 2. 数据模型

```js
const DEFAULT_THEME = 'mozhi'
const NV_THEMES = [
  { id: 'mozhi',   key: 'themeMozhi',   moodKey: 'themeMozhiMood',   swatches: ['#F4EEE3', '#211D18', '#9E3B2C'] },
  { id: 'qingjian',key: 'themeQingjian',moodKey: 'themeQingjianMood',swatches: ['#E9EFE3', '#1C2A20', '#8F432D'] },
  { id: 'yehang',  key: 'themeYehang',  moodKey: 'themeYehangMood',  swatches: ['#E9EEF5', '#18232F', '#A04739'] },
]
```

- `normalizeThemeId(id)`：仅接受 `NV_THEMES` 中的 id；其余（含 null/旧值/注入串）→ `DEFAULT_THEME`。
- 持久化：`localStorage` 新键 `dsh.novel.theme.v1`（只存 `{ id }`；读取 try/catch；隐私模式不崩）。
- 共享状态：模块级 `store` 增加 `theme` 字段；`store.get()`、`store.set({ theme })` 同步。
- 不写宿主 settings 的 `novel-writing` 命名空间；不新增 HTTP API。

## 3. 应用方式

- 启动 `apply()` 时读取/规范化主题，写到 `<html data-nv-theme="...">`；模块级 store 订阅主题变化并更新该属性；卸载时移除属性（回到 `:root` 默认）。
- CSS：保留现有 `:root` 默认「墨纸」令牌；新增 `:root[data-nv-theme="qingjian"]` / `:root[data-nv-theme="yehang"]` 覆盖块。
- 所有插件表面（`.nv-console`、`.nv-split`、设置页主题卡）共用这些变量；原生会话抽屉的 `background: var(--nv-bg)` 也经 html 继承自动换色。
- 不把主题变量限定在 `.nv-console` / `.nv-split` 内——宿主抽屉是兄弟节点，限定会漏掉。

## 4. 令牌表

每套主题提供以下语义令牌；`light-dark(light, dark)` 成对：

| token | 用途 |
|---|---|
| `--nv-paper` | 主纸面 / 页面底 |
| `--nv-paper-2` | 抬高纸面 / 卡片 / 抽屉 |
| `--nv-paper-3` | 凹陷纸面 / 工作台底 |
| `--nv-ink` | 主墨 |
| `--nv-ink-2` | 次级墨 |
| `--nv-ink-3` | 弱化墨 / 元信息 |
| `--nv-ink-4` | 极弱墨 / 装饰 |
| `--nv-rule` | 细线 |
| `--nv-rule-strong` | 强分隔线 / 边框 |
| `--nv-cinnabar` | 朱砂强调（当前书/重点） |
| `--nv-seal` | 印章 |
| `--nv-accent` | 焦点/链接 |
| `--nv-on-accent` | accent 上的文字 |
| `--nv-ok` / `--nv-warn` / `--nv-danger` | 状态语义 |

并派生：

```css
--nv-bg: var(--nv-paper-2);
--nv-surface: var(--nv-paper-2);
--nv-surface-hover: color-mix(in srgb, var(--nv-ink) 6%, transparent);
--nv-surface-raised: var(--nv-paper);
--nv-fg: var(--nv-ink);
--nv-fg-muted: var(--nv-ink-2);
--nv-fg-subtle: var(--nv-ink-3);
--nv-border: var(--nv-rule);
--nv-border-strong: var(--nv-rule-strong);
--nv-err: var(--nv-danger);
```

### 墨纸（默认，保持现值）
浅：paper `#F4EEE3` / paper-2 `#FBF8F1` / paper-3 `#EFE7DA`；ink `#211D18` / ink-2 `#4A433A` / ink-3 `#6B6155` / ink-4 `#8D8375`；rule `#DDD3C3` / rule-strong `#C9BCA7`；cinnabar `#9E3B2C` / seal `#A63A2A`；accent `#211D18` / on-accent `#FBF8F1`；ok `#4F6B4A` / warn `#A5762F` / danger `#A33A2E`。
暗：paper `#151310` / paper-2 `#1D1A16` / paper-3 `#12100D`；ink `#EDE6D8` / ink-2 `#C9BFAF` / ink-3 `#A49A8A` / ink-4 `#7D7467`；rule `#302B24` / rule-strong `#463F34`；cinnabar `#D07864` / seal `#B4483A`；accent `#EDE6D8` / on-accent `#151310`；ok `#8FAE86` / warn `#D0A45C` / danger `#D97868`。

### 青简
浅：paper `#E9EFE3` / paper-2 `#F4F8EE` / paper-3 `#E0E8D8`；ink `#1C2A20` / ink-2 `#3A4B3F` / ink-3 `#5C6F60` / ink-4 `#849483`；rule `#C8D4C0` / rule-strong `#B0C1A8`；cinnabar `#8F432D` / seal `#8B4632`；accent `#2F4A38` / on-accent `#F4F8EE`；ok `#4F6B4A` / warn `#967231` / danger `#A33A2E`。
暗：paper `#111713` / paper-2 `#19211B` / paper-3 `#0D120F`；ink `#E4EBDD` / ink-2 `#C1CCB9` / ink-3 `#97A693` / ink-4 `#71806F`；rule `#29332B` / rule-strong `#3E4C41`；cinnabar `#D0876F` / seal `#C06A50`；accent `#9DB8A1` / on-accent `#111713`；ok `#8FAE86` / warn `#D0A45C` / danger `#D97868`。

### 夜航
浅：paper `#E9EEF5` / paper-2 `#F5F8FC` / paper-3 `#DFE7F0`；ink `#18232F` / ink-2 `#354657` / ink-3 `#5D6E80` / ink-4 `#8795A5`；rule `#C7D2DF` / rule-strong `#ADBDCE`；cinnabar `#A04739` / seal `#9A463A`；accent `#2C4A6E` / on-accent `#F5F8FC`；ok `#4B6B5A` / warn `#9D7532` / danger `#A33A3E`。
暗：paper `#0F141B` / paper-2 `#161D26` / paper-3 `#0A0F15`；ink `#E6EBF2` / ink-2 `#BFC9D6` / ink-3 `#95A2B2` / ink-4 `#6E7B8B`；rule `#27313D` / rule-strong `#3A4757`；cinnabar `#D48370` / seal `#C06B5A`；accent `#8FB0D6` / on-accent `#0F141B`；ok `#8FAE9C` / warn `#D0A45C` / danger `#D97868`。

## 5. 交互

### 顶栏快速切换
- 书斋顶栏：在「工作区设置」图标前放 palette 图标按钮（`.nv-iconbtn nv-theme-btn`）。
- 写作台标题栏：在抽屉按钮前放同款 32×32 `.nv-bar-ctl nv-theme-btn`。
- 点击打开 `.nv-theme-menu`（`role="dialog"`，`aria-label` = 主题）：
  - 标题「主题」+ 说明「跟随宿主明暗」；
  - 3 行：色板三点 + 主题名 + 一句气质 + 选中 ✓；
  - 底部「选择即保存」/「Esc 关闭」；
  - 点击行立即应用并关闭；焦点回到按钮；
  - 点击外部关闭；Escape 关闭；Tab 可达；当前项 `aria-pressed="true"`。
- 位置：菜单绝对定位到按钮下方右对齐；z-index 高于当前 surface；不裁切（父级 overflow 不影响菜单自身）。
- 键盘：Enter/Space 打开；Tab/Shift+Tab 在选项间移动；Escape 关闭并归还焦点。

### 设置页管理
- 在 `SettingsPage` 顶部加「外观 / 主题」区（现有「启用插件」之前，视觉上是独立分区）。
- 3 张主题卡（3 列；窄屏 1 列）：纸面预览 + 主题名 + 气质 + 当前标记；点击即应用。
- 底部：当前主题 + 「恢复默认」按钮（回到墨纸）；不写 settings API。
- 提示：「主题只改变视觉，不改变布局、内容与数据；每套主题都跟随宿主明暗。」
- 与顶栏共用同一 store/持久化，任一入口改变，另一入口即时同步。

## 6. 样式与可访问性

- 主题卡/菜单用 `--nv-*` 令牌，不新增宿主 `--dsw-*` 依赖；不写死白/黑 alpha。
- 焦点环沿用现有 `--nv-accent` 双环；菜单项 `focus-visible` 清晰。
- 对比度：主题正文/次要文字以现有墨纸为基线；ink-3 在 paper-2 上 ≥4.5:1（青简 5.0 / 夜航 4.92 / 墨纸 5.71）。
- 不改变 `color-scheme`；暗色由宿主驱动。
- 减少动态：主题切换无动画/仅 120ms 颜色过渡；不新增循环动画。

## 7. 测试与验收

- 纯函数：`normalizeThemeId`（3 个 id + 非法/空/旧值 → 默认）、`NV_THEMES` 唯一性、三套 tokens 完整性。
- 源码/CSS：3 个 `:root[data-nv-theme=...]` 块；每套必含 paper/ink/rule/cinnabar/accent；默认 `:root` 仍为墨纸。
- store：`setTheme` 非法值不写入；合法值写入并触发订阅；持久化读写失败不抛。
- 渲染：书斋顶栏 1 个主题按钮 + 菜单 3 项；写作台标题栏 1 个；设置页 3 张卡；选中态与 store 一致。
- 行为：点击青简 → html 属性变 `qingjian`、菜单关闭、按钮焦点回位；切回墨纸；刷新后保持；Esc/外部点击关闭。
- 真实截图：书斋 + 写作台 × 墨纸/青简/夜航（至少浅色各一张；暗色各一张可选）；不伪造数据。
- 回归：现有 smoke/geometry/anchors/mockups 五门全绿；现有 localStorage key 与 API 零改动；S1/S2 布局几何不变。
