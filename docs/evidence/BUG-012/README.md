# BUG-012 证据：0.2.2 工作台不出现（初判误诊 + 阶段 A 订正）

> ## ⚠️ 根因订正（2026-11-07 阶段 A，见 [0.2.2-surface-facts.md](0.2.2-surface-facts.md)）
> 本文档初版结论「0.2.2 宿主不再消费 `shell.overlay` 槽」**是误诊**：探针首跑存在
> sign-in 登录遮罩拦截点击，「点击抽屉头无反应」实际是点击从未送达。阶段 A 经
> npm tarball（0.2.1-rc.5 ↔ 0.2.2-rc.1 逐版比对）+ 桌面 app.asar 只读解包证明
> `shell.overlay` 协议四代未变、宿主照常消费（走掉登录门后 `.nv-console`/`.nv-home`
> 真实挂载）。**真根因 = 插件自身 `lib/client.js` SplitWorkspace Rules-of-Hooks
> 违规**（条件早退在 `useEffect` 之前，UX-063 P0-a② commit 370a100 引入）：
> 点书卡 active 翻转 → React #310 → 宿主 SlotErrorBoundary 卸载 novel-split
> entry =「点小说，工作台不在」。与宿主代际无关，0.1.x~0.2.2 同雷。
> **阶段 B 修复验证已通过（2026-11-07，见 [fix-verification.md](fix-verification.md)）**：
> 0.2.2 探针真跑点书卡 → `.nv-split` 挂载、console 0 错误（无 #310 / 无槽位崩溃）。
> 以下初版内容按原样保留作为调查过程记录（其中「bundle 字面量 0 命中」的解释
> 见 facts 文档 §1 末段：宿主 client 包经批量 URL 加载，不走 index/vendor）。

- 采集：2026-11-07 14:10–14:20（0.2.2-rc.1 隔离实例，probe profile，端口 3080，Playwright Chromium 156）
- 报告人：用户（真机桌面，「我点击小说，工作台还是不在」）

## 现象矩阵（隔离 0.2.2 实测）

| 面 | 状态 | 证据 |
|---|---|---|
| 预设注册 | ✅ | diag-preset-0.2.2-rc.1.json（COMPAT-020，无 broken）；真机用户确认可选入会话 |
| 服务器 HTTP API | ✅ | `/novel-writing/api/settings-migrate` GET → 200；抽屉 overview 轮询成功（空书目 = 探针工作区无小说，`poll.error===null` 走 `drawerEmpty` 分支而非 `apiError`） |
| 客户端注入本体 | ✅ | `.nv-*` 元素 7 个；抽屉（含标题/空态文案）渲染正常 |
| 侧栏槽 `sidebar.footer.action` | ✅ | 抽屉在侧栏渲染（`button.nv-drawer-head`，DOM 已 dump） |
| **浮层槽 `shell.overlay` × 4** | ❌ **静默不挂载** | 点击抽屉头（`toggleConsole` → `openConsole` → `store.set({consoleOpen:true})`）后 7s：`.nv-home`=0、`.nv-*` 仍 7、body 无变化、**console 零错误**。四个注册（nv-console/novel-workspace-dialog/novel-split/novel-bind-dialog，lib/client.js L6038-6053）全部无渲染 |
| 用户真机症状 | ❌ | 点书卡（`openCtl.open` → novel-split 浮层）→ 工作台不出现——同根因 |

## 根因定位（事实链）

1. 浮层不渲染且**无任何 console 错误** ⇒ 注册成功但宿主不消费该槽（非 JS 异常）。
2. 0.2.2 web 应用资源扫描（index-BgUyXZcc.js 952KB + vendor-BUMdD3V7.js）：
   `shell.overlay` / `sidebar.footer.action` / `settings.section` / `slots.get` / `slots.inject` / `worktable` 字面量 **0 命中** ⇒ 0.2.2 的槽位查询/渲染机制与 0.1.x–0.2.1 不同（注入的客户端包 `@deepseek-ai/dsh-client-ui-settings` 等另成资源面，主包不再内联槽名）。
3. 对照：0.2.0/0.2.1 上浮层面工作（BUG-011 全链路 + UX-012 隔离实例无头浏览器证据）；0.2.2 仅预设面被 COMPAT-020 验证过，README 矩阵已如实标注。

## 结论

`shell.overlay` 槽在 0.2.2 宿主 shell 中不再被渲染（更名/换机制/迁移到新挂载协议），
插件四个浮层（工作台控制台/分栏工作区/工作区对话框/绑定面板）全部静默失效。
修复 = 按 0.2.2 新客户端面做双表面适配（参照 BUG-011 sessions 双表面先例），
需要 0.2.2 web 端槽位/浮层协议的事实源（宿主 client 包源码）。

## 文件

| 文件 | 内容 |
|---|---|
| `0.2.2-surface-facts.md` | 阶段 A 事实源（真根因 + 误诊订正 + 双版比对证据链） |
| `fix-verification.md` | 阶段 B 修复验证（0.2.2 探针真跑：分栏挂载 + console 0 错误 + 门禁读数） |
| `phaseB-console-mounted.png` | 阶段 B 断言①：点抽屉头后控制台浮层 + 首页挂载 |
| `phaseB-split-mounted.png` | 阶段 B 断言②：点书卡后分栏工作台挂载 |
| `probe-0.2.2-main-view.png` | 主视图：抽屉入口 + 空态文案可见 |
| `probe-0.2.2-after-cta.png` | 点击后：无任何浮层挂载（与主视图一致） |
| `probe-0.2.2-boot.log` | 探针启动日志（token 已脱敏） |

> 复现脚本（Playwright）在本机 `%TEMP%\workbench-open*.cjs` / `slot-scan*.cjs`，一次性用品未入库。
