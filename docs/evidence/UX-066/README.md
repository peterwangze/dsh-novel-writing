# UX-066 写作排版证据

日期：2026-11-08
任务：UX-066 正文/编辑器字体与字号配置（用户 AskUserQuestion 边界）。

## 证据

- `ux066-01-1680-aa-entry.png`：1680 纸页头 Aa 入口。
- `ux066-02-1680-aa-menu.png`：Aa popover 4 字体 + 4 字号 + 预览 + 当前标记。
- `ux066-03-1680-sans17.png`：黑体 / 17 即时应用。
- `ux066-04-1680-edit-sans17.png`：编辑态 textarea 同源字体/字号。
- `ux066-05-1152-kai18.png`：1152 楷体 / 18。
- `ux066-05b-1152-sans17.png`：审查者独立补跑 1152 Aa→黑体17。
- `ux066-06-1152-system15.png`：1152 系统 / 15。
- `ux066-06b-800-sans17.png`：审查者独立补跑真实 800 Aa→黑体17（宿主 800 收侧栏，稿纸 674；Aa 命中、菜单在视口内）。
- `ux066-07-reload-system15.png`：刷新后保持。
- `ux066-08-settings-attempt.png` / `ux066-08-settings-system15.png`：真实宿主账号菜单 → 设置 → 小说写作页签；「写作排版」当前 系统/15。
- `ux066-09-settings-reset.png`：设置页恢复默认。
- `ux066-typography-report.json`：9/9 真实探针事实（隔离 DSH_HOME、Edge；realEnvUnchanged；pageerror=0）。

## 门禁

- node --check lib/client.js = 0
- validate-preset PASSED
- smoke **360 passed / 0 failed**（README 360 同步）
- geometry OK：S2 六档数值不变；默认 16/1.95；serif15/sans16/kai17/system18 × 450/680 共 8 组 computed/零溢出；450 稿纸 Aa hit
- anchors **78 段 / FAIL=0 / WARN=23**
- mockups PASS

## 边界/残余

- 只作用 `.nv-prose .nv-content` 与 `.nv-sheet-edit`；UI chrome 字号不消费 `--nv-prose-*`。
- 新键 `dsh.novel.typography.v1` 只存 `{font,size}`；不写宿主 settings/API；缺失/坏档回 serif/16。
- 设置页真实入口 = 左侧栏账号菜单 → 设置 → 小说写作页签；`Ctrl+,` 在 Web 宿主不生效（如实记录）。
- 800 真实视口 Aa/黑体17 已由 R2 审查者补测并截图（`ux066-06b-800-sans17.png`；真实 800 宿主收侧栏后稿纸 674，Aa 命中、菜单在视口内）；450 稿纸仍由 geometry 合成覆盖。
- 主题 3 套未逐套排版截图；令牌对比度由审查者计算（ink-3/paper-2 最低 4.92、cinnabar 最低 5.41）。
- 字体栈为本机系统字体，不下载外部字体；不同机器回退可能不同。
