# UX-066 写作排版配置（正文/编辑器）

状态：用户 2026-11-08 直接要求；AskUserQuestion 已定边界。实现将在 S2 收口后开始。

## 用户选择

- 范围：**正文与编辑器**（不改 topbar、章节栏、状态栏等 UI chrome）。
- 字体：**宋体（默认）/ 黑体 / 楷体 / 系统**；全部本机系统字体栈，不下载外部字体。
- 字号：**15 / 16 / 17 / 18** 四档，默认 **16**；行高保持 **1.95**。
- 持久化：新键 `dsh.novel.typography.v1`，值 `{ font, size }`；缺失/坏档回落 `{font:'serif', size:16}`。

## 入口

1. **纸页头 Aa**：在「编辑」右侧/旁边，按钮文字 `Aa`（aria-label「写作排版」）；打开一个小 popover：
   - 字体：4 行（宋体/黑体/楷体/系统），每行用自身字体栈显示名称；当前项 ✓。
   - 字号：4 个 chip（15/16/17/18）；当前项选中。
   - 预览：一行「正文预览」示例，使用当前字体/字号；不写假章节。
   - 底部「选择即保存 · Esc 关闭」；点击选项即时应用并保持 popover 打开（方便比较），或点击后关闭——实现取“即时应用 + 保持打开”，再次点 Aa/Esc/外部关闭；焦点回 Aa。
2. **设置页「外观 · 主题」下「写作排版」**：
   - 同 4 字体 + 4 字号；当前标记；恢复默认（宋体/16）。
   - 说明「只影响正文与编辑器，不影响界面字号」。
   - 不调用 settings API，不提示重启。

## 令牌与作用域

```css
:root { --nv-prose-family: var(--nv-serif); --nv-prose-size: 16px; --nv-prose-lh: 1.95; }
:root[data-nv-font="sans"] { --nv-prose-family: var(--nv-sans); }
:root[data-nv-font="kai"] { --nv-prose-family: "Kaiti SC",STKaiti,KaiTi,"Noto Serif SC",serif; }
:root[data-nv-font="system"] { --nv-prose-family: system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif; }
:root[data-nv-fs="15"] { --nv-prose-size: 15px; }
:root[data-nv-fs="17"] { --nv-prose-size: 17px; }
:root[data-nv-fs="18"] { --nv-prose-size: 18px; }
```

消费面仅：
- `.nv-prose .nv-content`（阅读）
- `.nv-sheet-edit`（S2 编辑器）
- 旧正文阅读/编辑面的正文选择器（若有）
- 不改 `.nv-bar`、`.nv-status`、`.nv-railbar`、`.nv-theme-*`、设置页 UI。

字体栈：
- serif = `"Noto Serif SC","Source Han Serif SC","Songti SC",STSong,SimSun,serif`
- sans = `"Noto Sans SC","Source Han Sans SC","PingFang SC","Microsoft YaHei",sans-serif`
- kai = `"Kaiti SC",STKaiti,KaiTi,"Noto Serif SC",serif`
- system = `system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif`

行宽仍由稿纸 588 决定；字号变化不改变 sheet 宽度/布局，只重排行数。

## 状态与可访问性

- 共享模块 store：`font` + `fontSize`；启动读 localStorage，写 `<html data-nv-font data-nv-fs>`；订阅/清理；不抛错。
- `Aa` 按钮 `aria-haspopup="dialog"`/`aria-expanded`；字体行/字号 chip `aria-pressed`；当前 ✓。
- Enter/Space 打开；Tab 遍历；Escape 关闭并归还焦点；外部点击关闭。
- 主题 3 套 × 深浅不影响字体选择；字体选择不覆盖主题。

## 验收

- 纯函数：4 合法字体 × 4 合法字号；非法/缺失/坏 JSON → 默认。
- CSS：4 个 `data-nv-font` 块 + 3 个 size 块；只作用于正文/编辑器选择器。
- 渲染：纸页头 Aa 唯一；popover 4+4；设置页 4+4；两处状态同步。
- 持久化：reload 后 html 属性 + localStorage 保持；写失败不抛。
- 真实截图：1680/1152 ×（宋体16/黑体16/楷体17/系统18）× 主题浅/暗抽检；正文行宽/行数/编辑态一致。
- 五门 + anchors（3.7 新键）+ 真实探针；用户目检。
