# COMPAT-020 真机验收（桌面 DSH 实例，2026-11-07 14:10 前后）

## 结论

**PASS（人工观测 + 宿主侧事实链）**：设置 → Agent 预设中「小说写作工作流」不再显示
红色「加载失败」，选中后可进入写作会话。观测者 = 用户本人（经 AskUserQuestion 确认）。

## 宿主侧事实链（机器取证）

| 事实 | 取证方式 |
|---|---|
| 桌面实例进程组启动于 11:23:27（五个 `DeepSeek Harness.exe` 进程；desktop-host PID 38612 监听 127.0.0.1:63146/8085） | `Get-Process`/`Get-NetTCPConnection`，晚于修复落盘（cordis.patch.yml 最后修改 ~11:07，commit `444d18f`） |
| 桌面 profile 的 `dsh-novel-writing` 为指向仓库工作树的 **Junction**（`C:\Users\peter\.dsh\profiles\desktop\node_modules\dsh-novel-writing` → `D:\AI\agent\deepseek\harness\writing-workflow`） | `Get-Item .LinkType/.Target` ⇒ 启动即加载修复后的包文件，无需重装 |
| 仓库 `cordis.patch.yml`（已提交 `444d18f`）不含 legacy `./list-agents` 行；0.1.x 源保留该行 | `docs/evidence/COMPAT-020/` + smoke B2 双源断言 |
| 桌面用户 patch（`profiles\desktop\cordis.patch.yml`）不覆盖 `preset-novel-writing` 声明行 ⇒ 预设行来自包内 bundle patch 通道 | 此前只读核验（override 行仅 `novel-writing` 插件行 L569-574） |
| 宿主 = 0.2.2-rc.1（`./list-agents` 已从 exports 移除） | 更新器 pending 包名 `deepseek-harness-0.2.2-rc.1-win-x64.exe` + 根因会话 asar 实测 |
| 同版宿主 + 同 patch 形态的注册结果：`agentPresets.list()` 返回 `novel-writing` 无 `broken` | `diag-preset-0.2.2-rc.1.json`（隔离实例，2026-11-07T02:46:52Z） |

## 人工观测（最终判定依据）

- 2026-11-07 ~14:10，用户在运行中的桌面 DSH 打开 设置 → Agent 预设：
  「小说写作工作流」**无红色「加载失败」**，选中后**能进入写作会话**。
- 证据引用类型：human_observation（经 AskUserQuestion 单选确认，选项
  「已修复，可选入会话」）。

## 方法论记录（如实披露）

- UI 自动化路径受阻（BLOCKED，不作为失败）：63146 主界面需令牌（仅存于
  Electron 主进程内存，磁盘/命令行均无）；8085 经 Playwright（Chromium 156）
  实测为 `dsh-agent-router` OAuth 回调窗，非设置界面。探测脚本与截图留在
  本机临时目录，未入库。
- 验收不覆盖：预设标题截断「小...」（独立 CSS/label 问题，未处理）；
  0.2.0/0.2.1 独立 `list_agents` 不可用（代际限制，见 README 矩阵）。
