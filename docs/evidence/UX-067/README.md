# UX-067 设置页重构 + 原生会话抽屉视觉整合证据

日期：2026-11-09
用户问题：右侧原生会话抽屉渲染不协调/异常；插件配置界面不协调，需要重构设计。

## 截图

- `before-settings-1680-mozhi-light.png`：旧设置页（暖纸卡夹在宿主白框、字体选项只有选中项有边界、顶部密集说明）。
- `before-drawer-1680-mozhi-light.png`：旧抽屉。**注意：本机 before 已经是暖色 `#FBF8F1`，不是用户截图里的纯白；用户白色未能逐像素复现。**
- `ux067-04-settings-1680-mozhi-light.png`：新设置页（宿主中性面、状态 pill、外观/运行/诊断/业务配置）。
- `ux067-06-settings-800-mozhi-light.png`：800 设置页。
- `ux067-09-settings-1680-bottom-light.png`：底部运行 switch/诊断折叠/业务提示，无截断。
- `ux067-10-settings-1680-mozhi-dark.png`：暗色设置页。
- `ux067-01-drawer-1680-mozhi-light.png`：新抽屉 1680 side，paper-3 底、1px 缝、暖墨影。
- `ux067-02-drawer-1152-mozhi-light.png`：1152 overlay，真实宿主内容。
- `ux067-15-drawer-1680-qingjian-light.png`：青简浅色抽检。

## 门禁

- node --check 0；validate-preset PASS
- smoke **366/0**（README 366）
- geometry --strict OK（S2 六档数值不变）
- anchors **78 / FAIL=0 / WARN=19**
- mockups PASS；真实探针 8/8、22 图、realEnvUnchanged=true、pageerror=0

## 设计

- 设置页：宿主中性表面 + `--nv-*` 兜底；外观（3 主题卡 + 4 字体卡/4 字号/预览）/ 运行（4 行 switch/number）/ 诊断（默认折叠）/ 业务配置 info；字体卡全部有边界；状态 pill；宿主对话框自然滚动。
- 抽屉：去掉 `[data-nv-theme]` 依赖；viewArea 内联 11 个宿主 token（18 几何 + 11 token 同点快照/恢复）；纸-3 底 + rule-strong 1px 缝 + 暖墨影；真实宿主内容、顶栏/状态栏/唯一「对话」入口保留。
- R2：设置页选中字号改朱砂软底/文字/内环；composer 输入面 `--dsw-specific-input-major` 从 paper-2 降到 paper-3。

## 未证实/待用户

- **用户截图的纯白抽屉未被本地复现**：本地 before 是 `#FBF8F1` 暖近白（抽屉区 76.3%），after 为 `#EFE7DA` paper-3；正常路径 `data-nv-theme` 始终存在。若用户刷新后仍为纯白，说明宿主使用了 11 token 之外的表面/shadow DOM，需要用户新截图继续定位。
- 抽屉顶部约 210px 空态、宿主 header 视觉不可见；本批未加插件标题带（设计备选）。如需要可在下一批补 40px「协作 · 对话」标题带。
- settings.update 真实写入/loading/error 注入、诊断展开态未在真实探针覆盖。
- 用户目检前不得标记 UX-067 完成。
