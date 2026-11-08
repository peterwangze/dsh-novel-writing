# UX-065 主题系统证据

来源：隔离 DSH_HOME（`nvwb-probe-*`）真宿主 + Edge headless CDP；真实环境指纹前后一致；token 已脱敏。
探针：`.scratch-ux064/probe-theme-ux065.mjs`（工作副本；结果报告见本目录）。

## 截图

- `theme-01-console-menu-light.png`：书斋顶栏主题菜单（3 行、当前 ✓、跟随宿主说明）
- `theme-02-console-qingjian-light.png`：书斋切到青简（顶栏纸色 `rgb(233,239,227)`）
- `theme-03-split-menu-qingjian-light.png`：写作台顶栏主题菜单（青简当前）
- `theme-04-split-yehang-light.png`：写作台夜航（浅色）
- `theme-05-split-drawer-menu-light.png`：抽屉开启时菜单完整落在抽屉左侧（实测右缘 974 ≤ 抽屉左缘 990）
- `theme-06-split-yehang-dark.png`：夜航暗色（`.nv-split` `rgb(22,29,38)`）
- `theme-07-console-reload-yehang.png`：真实 reload 后主题仍 `yehang`，控制台可重新打开（T5）

`workbench-*.png` 是同一路径的基线截图（S1 书斋 / 工作台挂载），用于证明主题改动未改变布局/挂载。

## 报告

- `workbench-mount-report.json`：11/11 断言 OK；console/pageerror 0；`#310` 0；drawer-avoid 实测；dark-follow 实测。
- `theme-facts-default.json` / `theme-facts-emulated-dark.json`：主题/明暗事实采样（注意：`resolved` 字段是 fallback 变量解析的辅助值，不是主题令牌断言；以 `NV_THEMES`/`theme-spec.md` 与报告为准）。

## 已知边界（不阻断 R1，S2 收口）

- 宿主原生会话抽屉的 **composer 卡**仍是宿主默认色（浅色 `#FFFFFF` / 暗色 `#2C2C2E`）；抽屉主体已主题化。S2 用 `data-conversation-*` scoped 映射按 P-10 登记后收口，或在用户可见说明中披露“输入区沿用宿主主题”。
- 刷新持久化已由 T5 真 reload 覆盖（`theme-07` + report `steps.t5`）。
- 设置页「外观 · 主题」仍无真实宿主截图：隔离实例未找到宿主设置入口（`Ctrl+,` 未打开设置）；组件布局/顺序由 smoke 渲染断言与设置页代码覆盖，最终由用户在实际宿主设置页目检。不把组件源码镜像冒充真实截图。
- 主题菜单脚注在 R1 使用 `--nv-ink-4`（低对比）；R2 改为 `--nv-ink-3`。
