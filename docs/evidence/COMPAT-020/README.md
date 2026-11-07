# COMPAT-020 真机证据：预设加载面（0.2.1 / 0.2.2）

目标：验证 `cordis.patch.yml` 删除 0.2.x 不存在的 `tool-subagent-list-agents` 子路径行后，
`@deepseek-ai/dsh-agent-preset` 声明行能在 0.2.x 宿主上正常 `agentPresets.register`，
且 `agentPresets.list()` 返回的 `novel-writing` 行不带 `broken` 字段。

## 证据文件

| 文件 | 宿主 | 说明 |
|---|---|---|
| `diag-preset-0.2.2-rc.1.json` | dsh `0.2.2-rc.1`（桌面运行时 CLI） | `agentPresets.list()` 诊断输出 |
| `probe-0.2.2-rc.1.out.log` / `.err.log` | dsh `0.2.2-rc.1` | 启动输出（token 已脱敏）/ 诊断 stderr |
| `diag-preset-0.2.1-rc.2.json` | dsh `0.2.1-rc.2`（npm-global） | `agentPresets.list()` 诊断输出 |
| `probe-0.2.1-rc.2.out.log` / `.err.log` | dsh `0.2.1-rc.2` | 启动输出（token 已脱敏）/ 诊断 stderr |

## 复现方式

1. 临时 `DSH_HOME`：`%TEMP%\dsh-O6knv8\dsh-compat-probe`；profile `probe`。
2. profile `cordis.patch.yml` 插入 `diag-preset`（`inject: ['agentPresets']`，12 s 后
   `await ctx.agentPresets.list()`，写 `DIAG_PRESET_OUT`）。
3. `profiles\probe\node_modules\dsh-novel-writing` 为仓库 junction，
   `profiles\probe\node_modules\diag-preset` 为诊断插件 junction。
4. 启动：
   - 0.2.2：桌面运行时 `dsh.cmd --profile probe --no-open --port 3080`
   - 0.2.1：npm-global `dsh.cmd --profile probe --no-open --port 3081`
5. 诊断输出中的 `novel-writing` 行均含 `name` / `description` / `order: 2`，**无 `broken`**；
   `ok: true`。

## 时间与结果

- 0.2.2：`2026-11-07T02:46:52.169Z`
- 0.2.1：`2026-11-07T02:55:17.416Z`
- 两代均返回 5 个预设：`standard` / `novel-writing` / `ptc` / `minimal` / `cordis`。
- `list_agents` 工具在 0.2.1 不可用（主包未注册、legacy 子路径行已按代际删除）；
  该限制已在 README / CHANGELOG / 契约中如实披露。0.2.2 由主包
  `@deepseek-ai/dsh-tool-subagent-control` 注册 `list_agents`。

> 本目录只存证据，不参与运行时解析；启动日志中的 `token=` 已替换为 `<redacted>`。
