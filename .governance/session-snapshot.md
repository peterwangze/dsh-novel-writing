# 会话快照 — 2026-10-17（dsh 0.2.0-rc.2 适配实现完成，待用户重装实机验收）

**session_date**: 2026-10-17
**工作流版本**: 0.81.0（插件已升 0.91.0——**bootstrap 自升级欠账**，见下）
**会话标识**: dsh-writing-workflow-20261017
**HEAD**: `d8d93c2`（+ 治理收尾 commit）；远端 main 待 push

## 本轮完成（BUG-011 + COMPAT-018 部分；用户诉求 = 0.2.0 适配 + 版本依赖解耦）

- **调查**：两路只读 agent 定案 0.2.0-rc.2 四断裂（settings 范式 / worker-thread→ptc / .agent-presets→声明行 / sessions 三面）；0.2.0 兼容门实证（钉版本被禁载 ⇒ peers 保持 `*`）
- **实现 3 commits**：`9cb629b`（服务端 Config+volatile 活引用 / injectWhenReady 延迟路由 / 声明行 bundle patch / migrateLegacySettings 惰性迁移+手动路由 / install 代系分流撤同 id insert / js-yaml 依赖）+ `970e802`（客户端 sessionsCurrentOf 派生 + launcher.open 双通道）+ `d8d93c2`（契约 hunk 重基 + smoke 307/0 + preset-schema-face dual + CHANGELOG/README）
- **隔离实例八项实证**（EVD-131）：装配/激活/HTTP 200/dump 树/写路径重启持久/数据迁移端到端/撤除双测/skills 可达；真实 ~/.dsh 零写入
- **发现并绕行宿主三缺陷**（RISK-011）：importLegacyDocument inactive-context 丢节 / boot 期 patch 写 HMR fatal 竞态 / 双层同 id 拒写
- **DEC-154**：能力检测双表面范式定案（零版本号分支；0.1.x 回退保留）

## 用户侧验收清单（重装后）

1. `dsh plugin --profile web add <本仓路径>` 或 install.ps1（0.2.0 代自动分流）
2. 重启 dsh ⇒ 预设选择器可选「小说写作工作流」；工作台「小说」页正常
3. **绑定数据自动恢复**：`~/.dsh/settings.yaml.imported` 含 novel-writing 节 ⇒ 首次打开工作台后 ~2s 内绑定恢复（惰性迁移；也可 POST /novel-writing/api/settings-migrate）
4. 打开会话/切换会话/点其他会话自动退出工作台（客户端双表面）

## 欠账（下批）

- **RISK-012**：Code Review 补审 `9cb629b..d8d93c2`（Agent 配额 2026-10-18 08:48 重置后第一件事）
- **COMPAT-018 剩余**：0.2.0-rc.2 fixtures 转正 + CI mock 面对齐 + probe-host 0.2.0 实跑（.scratch-bug011/host-surfaces-0.2.0-rc.2.json 为现成提取产物，勿重提）
- **bootstrap 自升级**：plan-tracker 工作流版本 0.81.0 → 插件 0.91.0（AGENTS.md Governance Bootstrap 段模板替换 + cleanup.py + plan-tracker 版本更新）
- 0.1.x 运行时回归未跑隔离实例（静态保证 + fixtures 断言在位）；宿主 0.2.0 正式版发布时复核 RISK-011 绕行可否简化
- 既有欠账沿用上轮快照：CLEAN-005/008/009、BUG-008、治理欠账五条

## 判断失误与教训（新增两条）

⑨ **重基脚本对单文件多段 line 值只处理首段**——丢失 2.4/3.2/3.3/3.4/3.6 的第 2/3 段并把多段项变成单段范围项（golden 计数 21→25 暴露）；修复=多段结构恢复真值。教训：**批量改写结构化字段先枚举全部段格式**。
⑩ **迁移初版在 boot 期（loader.await 后）写 patch**——隔离实例同代码一成一败（HMR 收尾竞态），第一轮成功造成「已验证」错觉；第二轮 fatal 才暴露。教训：**时序敏感路径的成功一次不等于稳态，至少两轮不同时点复验**。

## 门禁基线

`node --check` 改动文件 0 错 ｜ `validate-preset` PASSED（schema-face dual PASS）｜ `smoke` **307/0** ｜ 隔离实例 0.2.0-rc.2 八项实证（EVD-131）｜ 真实 ~/.dsh 零写入（mtime 复核）
