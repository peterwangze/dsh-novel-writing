# v0.6.0 功能开关与默认值

本版不新增“关闭整套重构”的隐藏开关；以下为默认行为与迁移边界。

| 能力 | 默认 | 存储/开关 | 说明 |
|---|---|---|---|
| 主题 | 墨纸 | `dsh.novel.theme.v1` `{id}` | 青简/夜航可切换；跟随宿主明暗；删除键回默认墨纸 |
| 正文排版 | 宋体 / 16 / 1.95 | `dsh.novel.typography.v1` `{font,size}` | 4 字体 × 15/16/17/18；只作用正文/编辑器；删除键回默认 |
| 工作台布局 | rail 展开、抽屉关闭、面板关闭 | `dsh.novel.studio.v2` `{railCollapsed,drawerOpen,panelOpen,panelHeight?}` | v2 首次从 `split.v1.leftCollapsed`/`drawer.v1.open` 迁移；旧像素字段不再写 |
| 下方面板 | 默认 CSS clamp | `studio.v2.panelHeight` | 用户拖拽/键盘后持久化；`null` 回默认 |
| 设置页启用开关 | 启用 | settings `novel-writing.enabled` | 关闭后全部变更/API 拒绝（503）；不改变已有书稿数据 |
| 轮询 | 2000ms | settings `novel-writing.pollMs` | 下限 500ms |
| 预设自动同步 | 开启 | settings `novel-writing.presetAutoSync` | 关闭后保留用户对预设的修改 |
| API LAN 访问 | 关闭 | settings `novel-writing.apiPublic` | 仅可信局域网；默认回环 |

兼容性：0.1.x 使用 legacy 预设源；0.2.0/0.2.1 的独立 `list_agents` 不可用；0.2.2-rc.1 为当前实测推荐。详见 `docs/COMPATIBILITY.md`。
