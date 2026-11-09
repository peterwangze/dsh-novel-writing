# UX-064 S3 收口证据

日期：2026-11-09
任务：S3 收口 + 下方面板拖拽（用户 2026-11-09 选择恢复可拖拽）。
审查：UX-064 S3 R1 = **APPROVED_WITH_NOTES / unresolved_blockers=0**（REVIEW-UX-064-R9）。

## 门禁

- node --check lib/client.js = 0；probe/smoke 脚本 0
- validate-preset PASSED
- smoke **363 passed / 0 failed**（README 363 机检）
- geometry OK：S2 六档不变（680/680/654/588/606/450；focus 680/680/680/680/654/498；side/overlay；0 横向溢出）
- anchors **78 段 / FAIL=0 / WARN=23**
- mockups PASS；git diff --check 0
- 真实宿主：1680 **38/38**、800 **34/34**（Reviewer 独立）；六档 Dev 全绿，`realEnvUnchanged=true`、pageerror=0

## 面板拖拽

- `StudioLayout.panelHeight` 唯一新增像素状态（null=默认 clamp）；`studio.v2` 可选字段，缺失/坏值/<180/>520→null；不读旧 split.v1/midH。
- 4px separator：role/aria-orientation/min/max/now、tabIndex、pointer capture、ArrowUp/Down ±16、Home 默认、End 上限、双击复位、hover/focus 线、touch-action none；Esc 分层单关。
- 真实数值：1680 260→380（+120）；800 211→331；End 519/421；关闭重开/ reload 保持；Reviewer 独立复现。
- `panel-open.png` / `panel-dragged.png` / `reload-panel.png`：1680 与 800。

## 页码/空/错

- 短正文/空章/加载不渲染假 1/1；只有真实可滚正文出现 cur/total（total≥2）。
- `empty-chapter.png`：空章“这一章还没有正文。”，无页码。
- `api-error.png`：API 不可用可读降级，不崩。
- 真实保存/阅读/编辑在 1680 代表档通过。

## 主题 3×2

- 1680 墨纸/青简/夜航 × 浅/暗（`theme-*.png`）；正文对比度 13.51–15.79、状态栏 5.21–6.41；插件面 white/black/hostBlue 计数 0。
- 800 补墨纸浅色；1152/1086 另有补充图（scratch）。
- 设置页/Aa/抽屉主题矩阵在 scratch；未逐套入仓。

## 残余（非阻断）

- P2：面板交互行为仍在 CI 外（smoke 多为源码守卫；真实行为在 scratch probe）；建议下批接 headless CI。
- P3：手柄线 2px vs 注释 1px；pointercancel 坐标边界；Home=默认与 APG 语义不同（按简报）；resize/Aa 外点未真实驱动；页码正例仅截图；1152/1440 探针构建早于 4 页签/save-edit（33 条）；800/956/1086 单主题补充；normalize 先 round 后判界（写盘整数无影响）。
