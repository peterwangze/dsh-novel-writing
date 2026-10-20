# BUG-011 实机验收清单（真实宿主）

**任务**：BUG-011 — dsh 0.2.0-rc.2 升级适配（四周断裂修复 + legacy 数据迁移）
**验收日期**：2026-10-20（机器面首检）
**证据基线**：EVD-131（隔离实例十项实证）、EVD-132（0.2.1-rc.2 解耦复核）、EVD-134（本清单机器面）
**约束**：真实环境（`$HOME/.dsh`）只读核验；任何写入动作只由用户在真实宿主上按其自身流程触发。

---

## A. 机器面（已核验，可复核）

| # | 验收项 | 结果 | 复核方式（只读） |
|---|--------|------|------------------|
| A1 | 插件已注册进 real profile | ✅ `profiles/web/package.json` 的 `dsh.profile.bundles` 与 `dependencies` 均含 `dsh-novel-writing` → `link:D:/AI/agent/deepseek/harness/writing-workflow`（版本 0.5.3） | `Read $HOME/.dsh/profiles/web/package.json` |
| A2 | 组合树含插件三条行 | ✅ `dsh --profile web --dump-config`（1982 行，exit 0）含 `id: novel-writing`（服务）/ `id: preset-novel-writing`（`@deepseek-ai/dsh-agent-preset` 声明行）/ `id: tool-novel`（工具） | `dsh --profile web --dump-config` → grep 三 id |
| A3 | 预设 skills 锚点可达 | ✅ profile 侧 `node_modules/dsh-novel-writing/agent-presets/novel-writing/skills` 解析成功（link → 仓库），子目录 29 个 | `Test-Path <profile>/node_modules/.../skills` |
| A4 | legacy 数据迁移已落 profile patch | ✅ `cordis.patch.yml` 的 `novel-writing` 节含 `workspaceRoot: D:\AI\writing` + `bindings: novel-001: session-afdf4990-bbf7-443f-9e98-e5f6941a0582`（即 `settings.yaml.imported` → profile patch 惰性迁移已生效且持久） | 读 `$HOME/.dsh/profiles/web/cordis.patch.yml` |
| A5 | 服务端整链路可用 | ✅ `GET http://127.0.0.1:3080/novel-writing/api/overview` → **200**，返回 `root=D:\AI\writing`、`novel-001`（38 章 / 89,232 字 / stage=quality_review） | 浏览器或 `Invoke-WebRequest` |
| A6 | 宿主契约探针 | ✅ `GET /novel-writing/api/compat` → **200**，11 探针 9 ok / 0 missing / 2 unprobed（1.4 `retired`、1.11 `out-of-boundary-scope`）；面 2~6（客户端/宿主 DOM/安装注册/预设清单/版本环境）不在该端点覆盖范围 | 同上 |
| A7 | 用户工作区可读 | ✅ `D:\AI\writing\novel-001` 存在（mtime 2026-08-25） | `Test-Path` / 资源管理器 |

> 机器面结论：**服务端 + 注册 + 迁移 + 数据读取四类已实证通过**；剩余为 UI 交互面。

---

## B. UI 交互面（需用户操作，逐项打勾）

> 前置：DSH Web 已在 `http://127.0.0.1:3080` 运行（当前会话即该宿主）。若曾改动插件代码，先重启宿主进程再验。

| # | 步骤 | 预期现象 | 失败判据 |
|---|------|----------|----------|
| B1 | 新建会话 → 打开「预设选择器」 | 列表出现 **「小说写作工作流」**（id `novel-writing`） | 列表无该项 = 预设声明未注册（回报：选择器截图/可见项名称） |
| B2 | 选中「小说写作工作流」→ 开始 | 会话正常创建，无 fatal 报错；输入区可用 | 报错 / 会话空白 = 预设挂载失败（回报：浏览器 Console 第一条红字） |
| B3 | 观察左侧栏 | 出现 **「📖 小说」** 入口（常驻入口） | 无入口 = 客户端渲染面未加载 |
| B4 | 点「📖 小说」→ 选择 `novel-001` → 打开工作台 | 工作台渲染：章节列表 / 工作流控制条 / 数据面板 / 发布面板；书名「诡异副本，先过审」 | 空白 / 无分栏 / 提示「会话失效」 |
| B5 | 工作台绑定恢复 | 绑定指向既有会话 `session-afdf4990…`（迁移值），点「绑定会话」能看到该会话且可切换 | 绑定为空或指向不存在会话 |
| B6 | 会话打开/切换/自动退出联动 | 打开会话 → 工作台跟随；切到别的会话 → 工作台不串台；会话结束后工作台回到空态/提示 | 串台、残余卡片、「会话失效」无限期 |
| B7 | 宿主控制台 | 无 `HMR is disposed` / `cannot get required service ... in inactive context` / `SettingsForms` fatal | 出现以上任一 = RISK-011 绕行失效，立即回报原文 |

---

## C. 回报模板（复制填写）

```
B1: 预设选择器可见「小说写作工作流」 [是/否]
B2: 选中后会话创建 [正常/报错: <首条错误>]
B3: 侧栏「📖 小说」入口 [可见/不可见]
B4: 工作台渲染 [完整/缺哪些面]
B5: 绑定恢复 [恢复 session-afdf4990…/为空/会话不存在]
B6: 会话联动 [正常/异常现象]
B7: 宿主控制台 [干净/错误原文]
其他观感问题: <补充>
```

## D. 失败时最小定位材料

1. 浏览器 Console 全部红字（首条 + 堆栈）。
2. 宿主终端输出（若从终端启动）错误段。
3. `GET /novel-writing/api/overview` 原文（判断是服务面还是客户端面）。
4. 失败步骤编号 + 截图（如可）。

> 判定口径：B1~B7 全通过 = BUG-011 实机验收 PASS，可关闭该任务并关闭 RISK-011 绕行复核项；任一项失败 = 保留 open，按 D 组材料定位。
