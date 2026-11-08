# 主题系统实现简报（Developer）

前提：`.scratch-ux064/theme-design/theme-spec.md` 是语义与令牌的权威；`themes.html` / `themes-board.png` 是视觉基线。用户 2026-11-08 已批准三套方向（墨纸 / 青简 / 夜航），明暗跟随宿主。

## 1. 边界

- 只改视觉层 + 主题选择/持久化；不改任何业务数据、API、轮询、会话绑定、章节保存逻辑、S1/S2 已批准文案与布局。
- 不覆盖宿主 `--dsw-*` 全局令牌；不写 `color-scheme`；不伪造 `data-theme`。
- 主题变量只使用插件自有 `--nv-*`；宿主 DOM 只读，不新增对 `.an3WzG_*` 等哈希类名的依赖。
- 新增 localStorage 键 `dsh.novel.theme.v1`（显式披露，不修改既有 4 个键）。

## 2. 文件

- `lib/client.js`
  - `NV_THEMES`（3 项：id / i18n label + mood key / swatches / light/dark token pairs）
  - `normalizeThemeId(id)`、`readTheme()`、`writeTheme(id)`、`setTheme(id)`
  - `nvThemeCss()`：生成 `:root[data-nv-theme="<id>"]{...}`，含全部 `--nv-*` 与派生映射；默认墨纸也生成（覆盖 `:root` 的宿主映射，统一为纸色）
  - `store` 增加 `theme` 字段（默认 `"mozhi"`）；`apply` 启动时读主题、写 `<html data-nv-theme>`、订阅 store 更新、卸载清理
  - `ThemePicker`：顶栏按钮 + 弹层（书斋 `.nv-iconbtn` / 写作台 `.nv-bar-ctl` 两种 variant）
  - `ThemeSettings`：设置页「外观 · 主题」3 卡 + 恢复默认
  - `NV_STYLE` 追加主题 CSS 与 `.nv-theme-*` 菜单/设置样式
- `lib/host-contract.mjs`
  - item 3.7 增加 `dsh.novel.theme.v1` 锚点（注意行号随插入重基）
  - 若新增 `data-nv-theme` / `data-nv-drawer` 等 DOM 钩子，按 P-10 登记到 `regionLiterals` 并补 smoke 双向对账
- `test/smoke.mjs`
  - 纯函数：normalizeThemeId 的 3 合法 + null/空/旧值/注入串 → 默认；三主题 id 唯一；每套 token 完整
  - 源码/CSS：三个 `:root[data-nv-theme=...]` 块；每块含 paper/ink/rule/cinnabar/accent；默认块存在
  - UI 渲染：书斋顶栏 1 个主题按钮；写作台栏 1 个；设置页 3 卡；选中态；点击后 store/属性变化
  - 持久化：读写失败不抛；非法值不写入；刷新读取默认/合法值
  - 回归：既有 smoke 计数/断言不得删除或放宽；新增断言不得折叠到已有 check 而不改描述
- `README.md` / `CHANGELOG.md`（若任务要求；主题是用户可见功能）
- `docs/design/UX-065-theme/`（设计板 + spec + 截图）

## 3. 交互细节

### 顶栏按钮

- 书斋：搜索/新建书后、设置前；`.nv-iconbtn nv-theme-btn`；`aria-label="主题"`、`aria-haspopup="dialog"`、`aria-expanded`。
- 写作台：抽屉按钮前；`nv-bar-ctl` 32×32；同样 aria。
- 图标：Lucide palette（内联 path；不引入 emoji）。
- 点击/Enter/Space 打开菜单；打开后焦点到当前主题选项；Tab 循环；Escape 关闭并焦点回按钮；外部 pointerdown 关闭。

### 菜单

- `role="dialog"` + `aria-label` 主题；标题「主题」+「跟随宿主明暗」。
- 3 行：三点色板（主题 swatches）+ 名称 + mood + 选中 ✓；`aria-pressed`。
- 点击行：`setTheme(id)` → 立即应用（html 属性 + store）→ 关闭 → 按钮聚焦。
- 底部「选择即保存 · Esc 关闭」。
- 弹层不得被父级 overflow 裁切；打开时 z-index 高于当前 surface。

### 设置页

- `SettingsPage` 顶部加「外观 · 主题」区（在「启用插件」前）；3 张卡横排，760px 内可 3 列；窄屏 1 列。
- 每卡：预览纸面（用主题 paper/paper-2/ink 色块，不渲染假正文）+ 名称 + mood；当前卡 `data-on` 朱砂边框 + ✓。
- 底部「当前：<名称>」+「恢复默认」；点击立即生效；不调用 settings API、不显示「重启后生效」。
- 说明文案：「主题只改变视觉，不改变布局、内容与数据；每套主题都跟随宿主明暗。」

## 4. 令牌落地

- 以 `theme-spec.md` §4 的 3 套 light/dark 值为准；不要把颜色散落到组件里。
- 生成的 CSS 必须包含派生映射：
  ```css
  --nv-bg:var(--nv-paper-2);
  --nv-surface:var(--nv-paper-2);
  --nv-surface-hover:color-mix(in srgb,var(--nv-ink) 6%,transparent);
  --nv-surface-raised:var(--nv-paper);
  --nv-fg:var(--nv-ink);
  --nv-fg-muted:var(--nv-ink-2);
  --nv-fg-subtle:var(--nv-ink-3);
  --nv-border:var(--nv-rule);
  --nv-border-strong:var(--nv-rule-strong);
  --nv-err:var(--nv-danger);
  ```
- 默认墨纸也必须生成 `:root[data-nv-theme="mozhi"]` 块，使写作台/抽屉从宿主白底统一到纸色；`apply` 必须在首次渲染前写入属性。
- 暗色由宿主 `light-dark()` 解析；不写 `color-scheme`。

## 5. 原生会话抽屉

- 现有 `applyDrawer` 已对宿主 `[data-conversation-content]` 写 background/border/shadow；主题下该元素的 `var(--nv-bg)` 会自动变成主题纸色。
- 不新增对原生 header/composer 的哈希类名依赖；如需统一 header/composer，只使用 `data-conversation-*` 稳定钩子 + scoped `html[data-nv-drawer]`，并登记 P-10。
- 不伪造对话/差异/消息；主题只改变外观。

## 6. 验证

- `node --check lib/client.js`
- `node test/smoke.mjs`（记录 count）
- `node scripts/verify-visual-geometry.mjs`
- `node scripts/verify-contract-anchors.mjs`（必须 FAIL=0；行号重基要逐段）
- `python docs/design/UX-064-mockups/verify-mockups.py`（若不动 UX-064 设计包）
- 真实宿主：书斋 + 写作台（抽屉开/关）× 墨纸/青简/夜航，至少浅色各一张；暗色抽检。截图存 `docs/evidence/UX-065/`。
- 证据：刷新后主题保持；Esc/外部点击；键盘可达；控制台零 pageerror；无 API 调用。
