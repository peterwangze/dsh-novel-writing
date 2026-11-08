# UX-064 写作台布局审计与架构替换

日期：2026-11-08
触发：用户指出“稿纸横向滚动 / 大留白”，随后要求“完整替换旧逻辑，可以渐进演进，但不能保留腐化架构”。

## 1. 结论

当前不是单个尺寸问题，而是三套模型并存：

1. **旧分栏引擎**：`leftW/chatW/chapterW/midH/chatSide`、`LEFT_MIN/LEFT_MAX/LEFT_DEFAULT`、`CHAT_MIN/CENTER_MIN/CHAT_DEFAULT_RATIO`、`DRAWER_HANDLE_MIN_COLW=1046`，以及旧 `.nv-left/.nv-vdiv/.nv-chlist/.nv-chdiv/.nv-chatdiv/.nv-drawer-edge` CSS。
2. **S2 新 studio**：顶栏 56、左栏 196↔48、稿纸 588、专注 680、状态栏 40、抽屉 420，均以 px 字面量出现。
3. **视口媒体查询**：`1400/1100/1080/1046/960/900/800/760` 分散在 JS/CSS；宿主左栏折叠后容器变了，媒体查询不跟着变。

因此会出现：

- 稿纸 588 内宽 512，正文 `--nv-measure:34em`=544 + 垂直滚动条占宽 → 横向滚动；
- 固定 588 居中在全宽稿纸区 → 两侧大留白；移除 300 协作栏后没有重新分配；
- 1400 隐藏统计、1100 改 padding、960 改 rail、800 改 status，产生中间态不一致；
- 旧 `leftW/chapterW` 仍持久化/拖拽，但 S2 已不消费；
- JS/CSS 重复高度宽度，改一处容易漂移；
- 小字阶 8.5/9/9.5/10/10.5 等混用，状态/保存态偏小。

## 2. 合理不变量 vs 不合理硬编码

合理：
- 中文正文约 34em（32–36 字/行）的阅读 measure；
- 顶栏 56、状态栏 40、左栏收起 48、专注 680、宽屏抽屉 420，作为设计基线；
- 稿纸 588–680 的视觉范围；
- 宿主 app 顶栏/左栏/会话 header 不得被覆盖。

不合理：
- 把这些值同时写死在 JS、CSS、media query、测试四处；
- 固定 588 塞进弹性容器，正文 measure 大于内宽；
- 用 viewport 断点判断工作台容器（宿主左栏折叠会改变容器）；
- 保留旧 `leftW/chatW/chapterW/midH` 和旧 CSS，即使已无消费；
- 用“另一个固定值”修补上一个固定值；
- 用 8.5/9/9.5px 承载状态信息。

## 3. 目标架构

- **单一 StudioLayout 状态**：`railCollapsed/drawerOpen/focus/panelOpen`；没有像素宽/高/边/侧状态。
- **单一尺寸源**：`.nv-split` 上定义 CSS 变量 `--nv-bar-h/--nv-status-h/--nv-rail-w/--nv-rail-collapsed-w/--nv-sheet-min/--nv-sheet-max/--nv-focus-w/--nv-drawer-w/--nv-sheet-gap`；JS 读 DOM rect，不复制常量。
- **容器查询**：`.nv-split{container-type:inline-size}`；rail/topbar/status/sheet 按真实容器宽度响应。
- **弹性稿纸**：`width:100%; max-width:var(--nv-sheet-max)`；正文 `width:100%; max-width:34em; min-width:0`；`scrollWidth<=clientWidth`，无横向滚动。
- **DrawerHostAdapter**：只负责宿主 chat 的 top/height/margin/snapshot/restore（topbar 底到 status 顶），不参与左/中窗几何。
- **持久化 v2**：`dsh.novel.studio.v2` = `{railCollapsed,drawerOpen,panelOpen?}`；一次性从 v1 `leftCollapsed` 迁移；旧像素字段不再读/写。
- **删除门禁**：grep 断言旧符号/旧 CSS 零残留（v1→v2 迁移白名单除外）。
- **字号配置**：UX-066 的正文/编辑器字体字号使用独立 `--nv-prose-*`；不改变 UI chrome；字号变化不得破坏 measure。

## 4. 迁移顺序（渐进但不双模型）

1. 新 StudioLayout + CSS 变量/容器查询 + 弹性稿纸。
2. 接 DrawerHostAdapter（host chat 边界/快照）。
3. 删除旧状态/常量/setter/handler/CSS/旧 key 读取；保留迁移函数。
4. 恢复 S1 `focusChapter` intent，修 focus/drawer 互斥。
5. 真实 1680/1440/1152/1086/956/800 探针，浅/暗/抽屉/专注/章节跳转。
6. UX-066 Aa 字体字号。

## 5. 验收

- 旧符号零残留（grep gate）。
- 任意容器宽度 `scrollWidth <= clientWidth`；无硬预留空列；稿纸无横滑。
- 1680/1152/1086/956/800 真实窗口：无重叠、无覆盖宿主 chrome、无抽屉盖 topbar/status、无中间态。
- focus 与 drawer 互斥；章节 intent 打开第 N 章；页码只在真实内容时出现。
- 五门 + anchors + 真实截图；用户目检。
- 不以“再加一个固定值/再加一个媒体查询”作为修复。
