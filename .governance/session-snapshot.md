# 会话快照 — 2026-11-07（COMPAT-020 热修 + COMPAT-021 设计系统优化 双闭环）

**session_date**: 2026-11-07
**工作流版本**: 0.99.0
**会话标识**: dsh-writing-workflow-20261107-compat020-021
**HEAD**: `2d7d162`（COMPAT-021 落地）← `6eaffb8` ← `9617a44` ← `c5442e1`（设计基线）← `444d18f`（COMPAT-020 热修）；全部已 push origin/main
**上一会话**: 2026-10-25（治理升级 0.99.0 + UX-063 P0-a，EVD-142）

## 一、本轮结论（两任务全闭环）

### 1) COMPAT-020 预设「加载失败」热修 — committed `444d18f`（EVD-143，DEC-159）
根因 0.2.2 移除 `./list-agents` 子路径而静态 patch 仍声明 ⇒ 整棵预设 broken。修复=方向性双源（0.2.x 删行/0.1.x 保留）+ `GENERATION_DROPPED` + 双源硬不变量 + 负向对照。R1 NEEDS_CHANGE（P2×4）→ R2 **APPROVED_WITH_NOTES（0/0/0）**。0.2.2/0.2.1 隔离实例 `agentPresets.list()` 无 broken（docs/evidence/COMPAT-020/）。如实披露：0.2.0/0.2.1 独立 list_agents 不可用。

### 2) COMPAT-021 兼容性设计系统优化 — committed `2d7d162`（EVD-144）
- **设计基线** `c5442e1`：docs/COMPATIBILITY.md（依赖分层 L0-L4 / 代际矩阵 / 预检契约 / RISK-C1~C8）。
- **代码落地**：`lib/host-compat/generation-manifest.mjs`（五代际单一事实源 + detectGeneration）+ `preset-projection.mjs`（projectRows + reconcileDualSources）+ `scripts/preflight-preset-rows.mjs`（行级预检 CLI：exports 映射解析、退出码 0/1/2/3、--json/--explain/--global-root）+ `test/fixtures/host-generations/`（六代际 fixture）+ `test/preflight-preset-rows.test.mjs`（12 组断言）。
- **C3 修复**：平面绑定 profile、npm 全局仅 fallback、**mixedPlane ⇒ legacy-only 行 MIXED_PLANE_FAIL_CLOSED**（端到端用例 + 变异自测双保险；Reviewer 独立变异验证一致）。
- **R1**（AWN，P2×1：混合平面无仓内守卫）返工闭环 → **R2 AWN（P0/P1/P2=0）**；N1-N3（注入可审计性 globalRootOverride 标记/头注释/文档统一）已顺手修。
- 门禁（Coordinator 独立复跑）：preflight PASSED (12)；真实面 exit 0（decl-0.2.1，61 行 0 FAIL）；negative exit 1；validate PASS；smoke **334/0**；anchors 79 段 FAIL=0。证据 docs/evidence/COMPAT-021/。
- 偏离（已裁量接受）：smoke `LIB_TOOLING_DIRS=['host-compat']` 守卫适配（判据不放宽）；host-contract 不加 item（manifest 登记，revisions 21→22）。
- 状态机 dev→review→approved→completed→**committed**；锁已释放。

## 二、跨会话待办（按优先级）

1. **COMPAT-022 立项决策**（运行时自适应预设 provider，接口草案 docs/COMPATIBILITY.md §5.4）：需关键决策批准；根治 0.2.0/0.2.1 独立 list_agents 缺失。
2. **COMPAT-021 遗留 P3**（记录未扩面）：F6 manifest↔contract 双向 smoke 对账；F7 CI preflight fixtures job（§9.2）；F8 LIB_TOOLING_DIRS 消费断言。
3. **COMPAT-018 收口前复核**：0.2.1/0.2.2 闭包含 dsh-app-boot（0.2.1 已 boot 实证），旧结论需改述。
4. 既有债：18e/18f UX-061/UX-062/CLEAN-013（acceptance/quality 未跑）；UX-063 真机验收仍缺。
5. 用户侧：桌面端重启 DSH 验证预设红字消失；标题截断「小...」独立 UI 问题未处理。
6. Release Gate：v0.6.0 发布号待用户确认（本会话未 bump，版本 0.5.3）。

## 三、方法论事实（下轮直接复用）

- task-row-update：approved→completed→committed（无直达）；refs 用 `kind=value`；evidence-append refs 用 `kind:value`；状态单元格里无 🔄 标记时 writer 不识别（先手改标记）。
- `*.log` 全局 gitignore ⇒ 证据日志 `git add -f`。
- pre-commit hook 强制 commit message 带 task ID（session-snapshot 也要带）；`locks-release`（非 agent-locks-release）；空 `plan-tracker.md.lock` 残留可删。
- 子代理空转两次（Developer/Architect）⇒ interrupt + 重派有效；设计/证据文档 Coordinator 可写，产品码必须 Developer。
- 探针 home `%TEMP%\dsh-O6knv8\dsh-compat-probe`；`--global-root` 注入输出带 override 标记（不得冒充真实证据）。
- 变异自测是评审 P2「守卫无判别力」的标准闭环手段（短路接线 → 必红 → 还原 → SHA 一致）。
