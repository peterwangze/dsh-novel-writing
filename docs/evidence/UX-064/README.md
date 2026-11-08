# UX-064 S2 写作台重构证据

日期：2026-11-08
任务：UX-064 S2（布局架构替换后的最终态）
审查：R1 NEEDS_CHANGE → R2 NEEDS_CHANGE（1 P1）→ R3 APPROVED_WITH_NOTES（0 blockers）→ R4 死变量清理 delta。

## 截图

- `s2-1680-closed.png` / `s2-1680-dark.png`：1680 浅/暗，宿主左栏 + 插件左栏 + 稿纸 680 + 状态栏。
- `s2-1680-drawer-open.png`：1680 side-by-side，稿纸 680，抽屉 420，`sheet.right <= drawer.left`。
- `s2-1680-focus.png`：专注 680，隐藏 rail/抽屉/状态栏；宿主 chrome 保留。
- `s2-1152-closed/dark/drawer-open/focus.png`：1152 side rail 196、稿纸 654；抽屉 overlay 全幅（容器不足同时容纳 588+420）。
- `s2-956-closed/drawer-open/rail-overlay.png`：956 左栏 48 + 196 absolute peek；稿纸 606；抽屉 overlay。
- `s2-800-closed/drawer-open/rail-overlay/dark.png`：800 宿主侧栏展开；稿纸 450（≥420）；抽屉 overlay，不再压成 212/81% 覆盖；窄栏 peek 不挤压稿纸。

## 门禁（R3/R4）

- `node --check` ×5：0
- `validate-preset`：PASS
- smoke：**351 passed / 0 failed**（R4 后；README 同步）
- `scripts/verify-visual-geometry.mjs`：OK；真实容器六档稿纸 680/680/654/588/606/450；专注 680/680/680/680/654/498；横向溢出 0；side/overlay 分档 1280。
- `scripts/verify-contract-anchors.mjs`：77 段 FAIL=0 / WARN=23（3.3 5→3、3.4 4→3 合并）。
- `docs/design/UX-064-mockups/verify-mockups.py`：PASS。
- 真实宿主探针：1680/1440/1152/1086/956/800 各 20/20（R3；120/120），`realEnvUnchanged=true`，`pageerror=0`；R3 Reviewer 独立重跑 800/956 各 20/20。

## 架构

- `StudioLayout` 四状态（railCollapsed/drawerOpen/focus/panelOpen）为唯一布局状态；旧 `leftW/chatW/chapterW/midH/chatSide`、旧 setter/handler/CSS/像素持久化已删除，仅 v1→v2 迁移白名单。
- `DrawerHostAdapter` 单点负责宿主 chat 的 top/height/margin/snapshot/restore。
- `.nv-split` CSS 变量单源；容器查询为主断点；`dsh.novel.studio.v2` 持久化；旧 `dsh.novel.split.v1` 仅一次性迁移 `leftCollapsed`。
- 稿纸 `--nv-sheet-min` 真实消费（588/窄 420）；正文 `100%/max34em/min0`，无横向滚动。
- focus × drawer 互斥；S1 首页章节 intent 恢复；P1-1/P1-2 行为级通过。

## 残余（非阻断）

- `midH` 下方面板拖拽（UX-047）未恢复为旧像素模型；面板仍由状态栏打开/关闭，高度 CSS clamp；如需要可另立单一 `panelHeight` 状态。
- S2 行为测试主证据在真实 probe，CI 未接线 geometry/probe；smoke 含源码/守卫断言。
- hostHeaderBottom 兜底仍无水平覆盖判据（R2 P2-3）。
- 1086 稿纸 588 零余量；800 窄栏 peek 可发现性、1680 250px 纸色桌边为 P3/视觉判断。
