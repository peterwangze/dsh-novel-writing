# 会话快照 — 2026-11-07（COMPAT-020 预设热修闭环 + COMPAT-021 设计基线）

**session_date**: 2026-11-07
**工作流版本**: 0.99.0
**会话标识**: dsh-writing-workflow-20261107-compat020-hotfix
**HEAD**: `c5442e1`（COMPAT-021 设计基线）← `444d18f`（COMPAT-020 热修）；已 push origin/main
**上一会话**: 2026-10-25（治理升级 0.99.0 + UX-063 P0-a 三步代码面完成，EVD-142）

## 一、本轮结论

### 1) COMPAT-020：dsh 0.2.2-rc.1 预设「加载失败」热修 — **committed**（commit `444d18f`，EVD-143，DEC-159）
- **根因**（0.2.2 闭包只读实测）：`@deepseek-ai/dsh-tool-subagent-control` exports 移除 `./list-agents`，`list_agents` 并入主包（`registerListAgents`）；静态 `cordis.patch.yml` 仍声明该行 ⇒ `ERR_PACKAGE_PATH_NOT_EXPORTED` ⇒ 整棵预设 `agentPresets.register` broken。
- **修复**（方向性双源）：0.2.x patch 删行 / 0.1.x `agent.cordis.yml` 保留；`GENERATION_DROPPED` 披露类 + dual 四条硬不变量（patch 0 行 / yml 恰 1 行 / config 空 / 主包行在场）+ smoke 负向对照④（塞回 legacy 行 = 原故障形态必红）。
- **评审链**：R1 NEEDS_CHANGE（P2×4：host-contract revisions 数、README 过度声称+缺 0.2.1 行、5.2 行段漏 dsh-tool-web、no-profile 跳过面陈述不实）→ Developer 返工 → **R2 APPROVED_WITH_NOTES（P0/P1/P2=0/0/0）**。
- **验证**：smoke 334/0；validate-preset PASS；anchors FAIL=0/WARN24；schema-face findings=0（checked 37 + unverified 22 = 59，dropped 是 unverified 子集）；**0.2.2 与 0.2.1 隔离实例 `agentPresets.list()` novel-writing 无 broken**（docs/evidence/COMPAT-020/）。
- **如实披露**：0.2.0/0.2.1 独立 `list_agents` 不可用（静态 patch 无法按版本分流）；README 矩阵 0.2.2 只背书预设加载面、0.2.1 新行、0.2.0 降「部分支持」。
- 状态机：dev→review→approved→completed→committed（receipts 见 plan-tracker.md.ops.jsonl）；锁已释放。

### 2) COMPAT-021：兼容性架构**设计基线**已交付（commit `c5442e1`，docs/COMPATIBILITY.md，537 行）
- 宿主依赖分层 L0-L4（组合加载/预设注册=硬边界；工具/客户端=软边界可降级；安装/环境只读）。
- 代际矩阵 legacy-0.1 / decl-0.2.0 / 0.2.1 / 0.2.2+ / **unknown fail-closed**。
- 行级预检契约：`scripts/preflight-preset-rows.mjs`（--fixture/--json/--explain，退出码 0/1/2/3，NOT_RUN≠PASS）+ `test/fixtures/host-generations/` 五代际 fixture（含 negative-missing-export）。
- 风险 RISK-C1~C8；**C3 = declarationPlane 全局安装通道可能掩盖 profile 代际差异**（与 R2 P3 note 同源，实施时必须修）。
- 边界：不做运行时预设注册重写（**COMPAT-022 另立决策**）；不 bump 版本。
- 两个 Architect 子代理空转被中止，设计文档由 Coordinator 直接撰写（设计文档非产品码）。

## 二、跨会话待办（按优先级）

1. **COMPAT-021 实施**（P1，pending→dev）：manifest + projection + preflight 脚本 + fixtures + 契约/测试接线 + 证据 `docs/evidence/COMPAT-021/`；执行包已就绪（acceptance = `node scripts/preflight-preset-rows.mjs`）。**必须含 C3 修复**（平面判定绑定 profile，mixedPlane WARN）。
2. **COMPAT-022 立项**（运行时自适应预设 provider）：需关键决策批准；接口草案见设计文档 §5.4。
3. **COMPAT-018 收口前复核**：0.2.1/0.2.2 闭包均含 `dsh-app-boot`（0.2.1 探针已 boot），旧「缺 dsh-app-boot」结论已证伪，改述后才能关。
4. 既有债（勿伪装 PASS）：18e/18f UX-061、UX-062、CLEAN-013 acceptance/quality 未跑；UX-063 真机验收仍缺（UX-062 与 UX-063 同文件需串行）。
5. 桌面端生效：用户需重启 DSH 桌面端加载新 bundle patch（junction/安装通道以用户实际安装方式为准），预设红字应消失；标题截断「小...」是独立 CSS/label 问题，未在本轮处理。

## 三、方法论事实（下轮直接复用，勿重踩）

- **task-row-update 状态机**：approved→**completed**→committed（无 approved→committed 直达）；refs 格式 `kind=value`（等号），evidence-append 的 refs 用 `kind:value`（冒号）。
- **`*.log` 被 .gitignore L8 全局忽略**：证据日志需 `git add -f`（本轮 4 个 probe log 已强制入库）。
- **`locks-release`**（非 agent-locks-release）；残留空 `.governance/plan-tracker.md.lock` 可安全删除。
- **evidence-append** description 必须含「目标对齐：」且其后 ≥30 字；10 个单元格全非空。
- 子代理空转模式：Developer/Architect 长时无产出 → interrupt + 重派或 Coordinator 兜底（设计/证据文档允许 Coordinator 写，产品码不允许）。
- 探针 home = `%TEMP%\dsh-O6knv8\dsh-compat-probe`（非 `%TEMP%\dsh-compat-probe`）；端口 3080/3081；桌面 PID 1784/19316/19332 勿杀。
- `Measure-Object -Line` 不计空行；行数用 `(Get-Content).Count` 或 split 计数。
- 探针 stdout 含 web auth token，入库前必须替换 `<redacted>`。
