# 会话快照 — 2026-10-20（dsh 0.2.1-rc.2 解耦有效性复核：零必改适配，双表面范式首次跨版本实战验证通过）

**session_date**: 2026-10-20
**工作流版本**: 0.81.0（插件已升 0.91.0——**bootstrap 自升级欠账**仍挂）
**会话标识**: dsh-writing-workflow-20261020
**HEAD**: 本轮仅治理记录变更（evidence-log EVD-132 / plan-tracker COMPAT-019 / 本快照）；产品代码零修改
**上一会话**: 2026-10-17 BUG-011 适配 5 commits（`9cb629b..1a27de2`）已推送 GitHub main（SSH over 443）

## 本轮结论（COMPAT-019，EVD-132）

宿主升 0.2.1-rc.2（用户全局已装，dist-tag latest）。三路复核，判定**解耦策略有效、零必改适配**：

1. **8 看护包 API 面零漂移**（extract.mjs 同管线提取 `.scratch-bug011/host-surfaces-0.2.1-rc.2.json` 对 diff）——cordis/schemastery/dsh-settings/dsh-api-gateway/dsh-client-modules/dsh-client-connection/dsh-home-paths/dsh-tools 导出面/类继承/方法名全同（仅版本串变化）
2. **9 未看护包内容级 diff**（0.2.0-rc.2 ↔ 0.2.1-rc.2 双版本 tarball 解包递归 diff）——唯一实质键漂移：`dsh-tool-subagent` Config 移除 `backgroundMode`/`enableRunInBackground`/`persona`/`toolFilter`（新增 agentPreset/allowedAgentPresets，背景委派改运行时统一管理）；`backgroundMode` 属**静默剥离死键**（apply() 仅对 persona/toolFilter 显式拒绝，Config 非 strict）不否决挂载；本插件组合 4 行携带该键实测无害，**保留 = 代际容忍正确选择**（该键在 0.2.0-rc.2 上仍合法且有意义，删除反而回退 0.2.0 行为）。peer 兼容门新增 `engines.dsh` 独裁通道（本插件无 engines.dsh、peers 全 `*` 含 prerelease ⇒ 继续放行）。persona `prefix` / ptc `provider` / customSkillDirs / 会话 current 派生式（retainedBy.mainView 仍为宿主源码同款判据）全稳；base patch 变化（remote-access/working-directory/web-deepseek-api 新行、tool-ralph 行撤出 base）与本插件无关。
3. **隔离实例端到端全链路通过**（`.scratch-bug011/verify-021`；真实 ~/.dsh 零写入，测试进程已清理）：install.ps1 代系分流正确 + **宿主正式通道 `dsh plugin --profile web add <clone>` 首次实跑通过**（profile 模板初始化 + pnpm link + bundles 注册）+ `dsh web` 双轮启动零 fatal 零告警 + dump-config 实证声明行入组合树 + `/novel-writing/api/overview` 200 + 惰性迁移端到端（.imported→profile patch→服务读取→重启持久）+ volatile 二次读取生效 + novel-create 写路径 + 重启持久化（config/小说/绑定）+ skills 29 目录可达。挂载级证据缺口如实披露：nvheadless 试验 profile 因 MISSING_CREDENTIAL 在 preset pending 阶段早夭，未取得代理级挂载实测，否决风险以 tool-subagent apply()/非 strict Config 源码静态判定。

## 跨会话待办（按优先级）

1. **用户重装实机验收**（自 2026-10-17 挂起；安装通道本轮已在 0.2.1-rc.2 隔离环境验证）：`dsh plugin --profile web add <repo>` → 预设选择器选「小说写作工作流」→ 工作台 + 绑定自动恢复（.imported 惰性迁移）+ 会话打开/切换/自动退出联动
2. **RISK-012 Code Review 补审**：`9cb629b..d8d93c2`（配额 2026-10-18 已重置，仍未执行）
3. **COMPAT-018 剩余**：① fixtures 转正（0.2.0-rc.2 与 0.2.1-rc.2 快照可同批入 test/fixtures + smoke 断言集 + CI mock 面对齐）② probe-host 实跑 ③ 宿主正式版发布时复核双表面窗口（0.2.1-rc.2 已提前完成一轮）
4. **bootstrap 自升级欠账**：plan-tracker 工作流版本 0.81.0 → 0.91.0（AGENTS.md Governance Bootstrap 段模板替换 + cleanup.py + 版本 bump）
5. 既有候选池不变：CLEAN-005/008/009、BUG-008、治理五欠债（见 2026-09-16 快照候选池节）；宿主 RISK-011 三缺陷在 0.2.1 仍按绕行口径处理

## 复核方法论（下轮宿主升级直接复用）

提取器同管线快照 → 8 看护包机器 diff → 未看护包双版本 tarball 内容 diff → Config schema 逐包比对（apply() 显式拒绝清单重点看）→ 隔离实例端到端（install.ps1 与 `dsh plugin add` 双通道）。全部产物在 `.scratch-bug011/`（未入跟踪）。
