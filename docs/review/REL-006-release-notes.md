# REL-006 发布记录 — v0.5.2（BUG-006 安装通道适配承载）

- **发布日期**：2026-09-12
- **版本号**：`0.5.1` → `0.5.2`（CHANGELOG `[0.5.2] - 2026-09-12`；package.json `"version": "0.5.2"`）
- **发布类型**：**本地发布**（CHANGELOG + package.json + 治理记录 commit + 本地 annotated tag）——**push 未执行**（RISK-004）
- **执行**：Release Agent（REL-006 派发）；用户定案：2026-09-12「先 v0.5.2，v0.6.0 后续再定」
- **绑定 SKILL**：`stage-release`（版本发布）+ `release-checklist`（发布前验证/回滚确认）

---

## 1. 发布范围（含「本次不发布什么」）

### 1.1 本版承载（唯一一项）

| 项 | 内容 | 代码基准 |
| --- | --- | --- |
| BUG-006 | 兼容 dsh 0.1.5 布局重构——安装脚本版本自适应（install.ps1 / install.sh 双通道：per-profile `node_modules` junction + profile `package.json` 的 `dependencies`/`dsh.profile.bundles` 幂等注册 + `cordis.patch.yml` insert 行兜底；旧布局行为零变化；插件代码本身对 0.1.5 零改动兼容） | `471ed00`（BUG-006 修复提交）+ `3442f39`（BUG-006 治理收尾提交）——**两者均已在远端** `origin/main`（实测远端 `refs/heads/main` = `3442f396ff2914dd3549983448cca667d14acd78`，且 `git merge-base --is-ancestor 471ed00/3442f39 <remote-main>` 均 exit 0） |

### 1.2 本次明确不发布（保留在 `[Unreleased]`）

- **COMPAT-002 ~ COMPAT-016 兼容性架构演进**——宿主契约 `lib/host-contract.mjs` / 宿主边界层 `lib/host-boundary.js` / fixtures 快照与离线对账 / CI latest 探测轨 / 探测脚本 / 诊断面板 / A3 inject 收敛 / CI mock 修正等。该线属**未发布的 v0.6.0 线**，发布时机待用户确认。
- 全局前置研究线 **COMPAT-001**（分析稿）与已闭环决策 **DEC-025/DEC-026** 亦不随本版发布（无 tag 语义变化）。

**分层机检证据**（`CHANGELOG.md`）：

- `[0.5.2]` 段恰含 1 条条目（BUG-006），条目文本与迁移前的 `[Unreleased]` 原文逐字一致（纯移动，无改写）。
- COMPAT-005/007~016 等全部 COMPAT-* 条目仍位于 `[Unreleased]`（`### 新增` / `### 修复`），`[0.5.2]` 段内**无任何 COMPAT-* 条目**。

---

## 2. 版本号决策（semver）

| 项 | 结论 | 依据 |
| --- | --- | --- |
| 变更类型 | 修复 / 安装通道适配（无新功能、无 breaking change） | BUG-006 修复的是「新宿主（dsh 0.1.5-rc.1 per-profile 布局）下安装链不可用」；旧布局**行为完全不变**（BUG-006 交付内含强等价证据） |
| bump 级别 | **PATCH**（0.5.1 → 0.5.2） | 仓库自述口径：0.x 阶段「次要版本承载功能批，补丁号承载修复」（`CHANGELOG.md` L3）；不跳号 |
| 版本一致性 | CHANGELOG 段头 / package.json version / tag 名 = `0.5.2` 三处一致 | 逐项实测（见 §4/§5） |

---

## 3. tag 基准选择与理由（方案 A / 方案 B 取舍留痕）

**选择：方案 A —— tag 指向本发布提交**（CHANGELOG `[0.5.2]` + package.json `0.5.2` + 治理记录），并**在本记录与 plan-tracker 路线图行显式声明**「v0.5.2 的代码范围仅 = BUG-006 安装通道适配；COMPAT-* 属未发布的 v0.6.0 线」。

### 3.1 理由

1. **与仓库既有发布惯例一致**：v0.3.0（target `06c7737`）、v0.4.0（`fbff776`）、v0.5.0（`ce047d0`）、v0.5.1（`cd1911e`）四个 annotated tag 均 peel 到**各自的发布提交**（含 CHANGELOG 段 + package.json bump）。方案 B（tag → `3442f39`）会成为唯一例外。
2. **tag ↔ CHANGELOG ↔ package.json 三方一致性**（REL-002 关注面）：方案 B 下 tag 树内 package.json 仍为 `0.5.1`、CHANGELOG 中 BUG-006 仍处 `[Unreleased]` ⇒ 任何「tag 内容 ≡ 版本声明」的自动/人工核对都需豁免，发布卫生面倒退。
3. **发布提交可推送性**：方案 A 的 tag target 位于本地 main 线性历史内，RISK-004 解阻后可随 `main` 一并推送（无额外合并/切分动作）；方案 B 的 target 已在远端，但发布记录本身仍滞留本地，一致性由本次范围声明承担。
4. **回滚语义不受影响**：需要「BUG-006-only 代码面」时直接 `checkout 3442f39`（§6 路径 B）——方案 A 不封闭该路径。

### 3.1.1 push 范围声明（F2 补强 —— 可见面变化与授权状态）

> **`git push origin main v0.5.2` 将同时把本机领先远端的 44 commits（含 COMPAT-002~016 的 v0.6.0 线工作树内容）推送至远端主线。**
>
> - **可见面变化**：远端主线将**公开未发布的 v0.6.0 线内容**（含 `.github/workflows/ci.yml` 探测轨、宿主契约层 `lib/host-contract.mjs` / 边界层 `lib/host-boundary.js`、fixtures 快照与探测脚本、诊断面板等）。
> - **动作性质**：该动作属**发布决策**（关键决策，非普通 git 操作）——**须用户授权**。
> - **授权状态**：**已授权（DEC-027，2026-09-12；用户已授予 `workflow` scope）**——由 Coordinator 按执行序（补齐审查项 → 重定 tag → R2/R3 审查 → push → `--lineage-mode released` 核验）执行；本 Release Agent **不执行 push**（硬边界）。
> - **若不接受公开 v0.6.0 线**：须先切分主线（在 `3442f39` 之上重建发布提交后重打 tag）——与 §7 R8 的 tag 边界三选一**合并决策**。
>
> **发布纪律（一句）**：**先补齐审查项、后 push** —— 在 R1 复审列出的补强项（回滚演练 / tag 边界处置 / push 范围声明 / `check-release` 替代口径裁定）全部闭合**之前**，不得执行 push；因为一旦 push，F2/F4 的不一致将固化为不可逆事实（此后修正须走 revert + 新版本号）。

### 3.2 残余风险（如实标注，不掩盖）

- **tag 树 ⊃ 本版代码范围**：本机 `HEAD` 领先 `origin/main` **44 commits**（含 COMPAT-002~016 全部工作）。方案 A 的 `v0.5.2` tag 树因此包含 v0.6.0 线内容——即 **「v0.5.2 tag 的代码范围声明」与「tag 树实际内容」不严格相等**。
  - 口径：本版范围以**本记录 §1.1 + CHANGELOG `[0.5.2]` 段 + 路线图行**为准；下游若以「tag 树 = 本版代码面」为判据，应改用 `3442f39`。
  - 时效：以上内容**均未 push**，tag 亦未 push ⇒ 复议零成本（`git tag -d v0.5.2` 后可无副作用改用方案 B）。
- **方案 B 的代价（未采用原因补充）**：tag 内容不含 `[0.5.2]` CHANGELOG 段与 package.json bump ⇒ 「用户 checkout v0.5.2 看到的版本号 = 0.5.1」的直接误导，比方案 A 的「范围需以记录声明为准」更易触发误判。

---

## 4. 发布前三件套（真实输出，2026-09-12 实测）

执行环境：`D:\AI\agent\deepseek\harness\writing-workflow`，node `v24.13.1`；**在本次发布改动落盘后运行**（验证对象 = 发布提交树）。

| # | 命令 | 实测输出 | 结论 |
| --- | --- | --- | --- |
| 1 | `node --check` × 12 文件（`lib/` 5 + `scripts/probe-host.mjs` + `test/fixtures/host-surfaces/` 4 + `test/smoke.mjs` + `test/validate-preset.mjs`） | `=== NODE --CHECK SUMMARY: 12 files, 0 failures ===` | **PASS（0 错）** |
| 2 | `node test/validate-preset.mjs` | `mode: full (profile dir available)` … `PRESET VALIDATION PASSED` / `validate-preset exit=0`（29/29 ok，含 skills 索引 29/29） | **PASS** |
| 3 | `node test/smoke.mjs` | `SMOKE DONE: 282 passed, 0 failed` / `smoke exit=0`（末条断言：README 声明 282 ≡ 实测 282） | **PASS（基线 282/0 未劣化）** |

### 4.1 验证执行状态（诚实披露；本返工轮补执行了原「未执行」的两项）

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 安装冒烟（**对被发布树**，隔离环境） | **已执行（2026-09-12 返工轮）** | 按 `docs/release/rollback-plan-0.5.2.md` §7 在隔离根 `%TEMP%\rel006-drill-20260912` 实跑：对 `git archive v0.5.2` **导出树**（= 被发布树内容）执行安装 → 重装 → 回滚往返 ⇒ **隔离环境安装冒烟（环境变量重定向至临时目录）通过**（逐 leg exit 0、有效版本 0.5.1→0.5.2→0.5.1、同版本重装幂等 diff=0）。**F5 口径订正**：原记载的安装通道证据来自 BUG-006 交付内、早于发布树（证据对象 ≠ 被发布树）；现由对**被发布树**的隔离实测替代。措辞边界：**不写**「真实安装通过」——口径恒为「隔离环境（临时根 + 环境变量重定向）」。**真实 `~/.dsh` 未触碰**（§10 返工轮 fingerprint 对照）。 |
| `check-release --version 0.5.2 --require-changelog --lineage-mode candidate` | **FAILED（21 issues，exit 1）——跨根期望源缺陷** | 已实际执行并**如实记录为 FAIL，不包装为 PASS**；归因见 §7 R5：该 CLI 对本仓结构性不可用（`changelog` 检查读插件仓自身 `project/CHANGELOG.md`、期望 `REQ-059~064`/`1.0.0 依赖链`、执行插件自家测试路径），与本项目 REL-003/REL-004 记载的 SYSGAP-001 家族一致。**未以三件套或其它检查替代其结论**——该门禁状态为「不可用」，需 Coordinator/Release Reviewer 裁定（替代判据集合见 `release-checklist` §G 说明，**不构成该门禁的替代 PASS**） |
| 回滚演练（release-checklist 要求「已在测试环境实际执行」） | **已执行（隔离环境，2026-09-12 返工轮）** | 路径 A 往返在隔离根实跑（A1 v0.5.1 → A3 v0.5.2 → A5 回滚 v0.5.1），另跑旧布局分支（B1→B2 `diff=0`，实证「旧布局行为完全不变」）。逐步命令级记录 + 快照 diff 见 `docs/release/rollback-plan-0.5.2.md` §7。**已知残留（如实记录）**：回滚不还原 DSH_HOME 状态——v0.5.2 新增的新布局注册项在回滚后保留（有效版本仍正确）；详见该 §7.4 |
| 监控/发布后观察期 | 不适用 | 本插件无生产监控面；发布后验证以三件套 + 用户侧实机使用为准 |
| `.github/workflows/ci.yml` 相关 CI | **未运行/未触碰** | 本任务明确不触碰 CI 配置；且 push 尚未执行（**已授权 DEC-027**，按执行序待 R2/R3 审查通过后由 Coordinator 执行）⇒ 无远端 CI 触发 |

---

## 5. 变更清单（与发布提交对照）

| 文件 | 变更 |
| --- | --- |
| `CHANGELOG.md` | 新增 `## [0.5.2] - 2026-09-12` + `### 修复`；BUG-006 条目自 `[Unreleased]` **逐字移入**（无改写）；COMPAT-* 条目全部留在 `[Unreleased]` |
| `package.json` | `"version": "0.5.1"` → `"0.5.2"`（**仅版本行**） |
| `.governance/plan-tracker.md` | 路线图 v0.5.2 行：`未发布` → `已发布`、日期 `2026-09-12`、交付物列（`git tag v0.5.2` + `CHANGELOG [0.5.2]`）、范围声明（COMPAT-* 属 v0.6.0 线）；版本里程碑新增 `v0.5.2 发布` 行。**仅路线图/里程碑节**，任务行由 Coordinator 维护 |
| `docs/review/REL-006-release-notes.md` | 本记录（新增） |
| `docs/release/release-checklist-0.5.2.md` · `docs/release/feature-flags-0.5.2.md` · `docs/release/rollback-plan-0.5.2.md` | 三件发布工件（**REL-006 补充提交**新增；Coordinator 授权补建；内容 = 本记录 §6/§8 等价抽取 + 逐项门禁实测 + feature flag 取证「不适用」） |

**未触碰**：`.github/workflows/ci.yml`、`lib/**`、`test/**`、`install.ps1`、`install.sh`、`README.md`（本次发布动作 = 纯元数据 + 治理记录，不改代码）。

> **口径精度补充（返工轮实测发现，P-01）**：上句的判据面 = **发布提交 `e1f25df8` 相对其父 `dd6b5ef` 的 diff**（即「本次发布动作」的改动面），**不等于**「v0.5.2 相对 v0.5.1 的代码面」。后者实测为 **48 commits**，含 `install.ps1` / `install.sh`（**+304/−10**：BUG-006 版本自适应 + COMPAT-015 布局契约注释块）、`lib/**`（含 `host-contract.mjs` / `host-boundary.js` / `index.js` / `client.js`）、`test/**`、`.github/workflows/ci.yml` 等——即 §1.2 所列未发布 v0.6.0 线内容随本机线性历史一并落在 tag 树内，**正是 §3.2 / §7 R8 的范围口径问题**。**本版的实际交付面 = BUG-006 安装通道适配**（安装脚本版本自适应双通道）；本次发布的**动作**不改代码，但**版本区间**含代码改动——两者判据面不同，勿混用。

---

## 6. 回滚方案（v0.5.2 → 回退）

| 路径 | 命令（逐条可执行） | 适用场景 | 影响面 |
| --- | --- | --- | --- |
| **A（推荐）** | `git -C "D:\AI\agent\deepseek\harness\writing-workflow" checkout v0.5.1`，随后重跑 `install.ps1`（Windows）/ `bash install.sh`（*nix）——安装脚本幂等，重复执行不产生重复行/键 | 用户侧安装产物出现异常，需回到上一个已发布版本 | 插件代码面回退到 v0.5.1（`cd1911e`） |
| **B（代码面精确回退 BUG-006-only）** | `git checkout 3442f39`（v0.5.2 代码基准，远端同源） | 需保留 v0.5.x 线但去除 COMPAT 工作 | 代码面 = BUG-006 修复 + 治理收尾 |
| **C（撤销本版发布动作，仅本地）** | `git tag -d v0.5.2` + `git reset --hard e1f25df8^`（或 `git revert`，重定后发布动作链 = 4 提交——见 `rollback-plan` §2 路径 C 补注） | 发布提交本身有误 | 本版提交/tag **均未 push** ⇒ 无远端影响、无他人可见面 |

- **数据兼容性**：本版无 schema/数据迁移、无宿主配置结构变更 ⇒ 回滚不涉及数据面（`settings` ns `novel-writing` 字段不变）。
- **独立工件**：`docs/release/rollback-plan-0.5.2.md`（触发条件 + 三路径 + 验证方式 + 演练状态）。
- **预计回滚时间**：< 1 分钟（git checkout + 幂等安装脚本；无服务重启以外动作）。
- **状态**：**已定义、已演练（隔离环境）**——2026-09-12 返工轮于隔离根 `%TEMP%\rel006-drill-20260912` 实跑路径 A 往返（v0.5.1 → v0.5.2 → 回滚 v0.5.1），逐步 exit 0、有效版本正确、同版本重装幂等 diff=0；原始记录见 `docs/release/rollback-plan-0.5.2.md` §7。**已知残留**：回滚不还原 DSH_HOME 状态（新布局注册项保留，有效版本仍正确）。

---

## 7. 残余风险与遗留

| # | 项 | 事实与影响 | 处置 |
| --- | --- | --- | --- |
| **R1** | **RISK-004：push 未执行（本版主要残余风险）** | 本机 git 凭证（OAuth App）**原缺** `workflow scope`（含 `.github/workflows/ci.yml` 变更的本地提交无法推送）——**该阻塞已解除**：用户 2026-09-12 已授予 `workflow` scope 并授权 Coordinator 重试（DEC-027 ② / RISK-004 进入「待执行」）。发布提交与 `v0.5.2` annotated tag **仅存在于本地**；远端 `origin/main` 仍 = `3442f39`，远端无 `v0.5.2`（本任务用 `git ls-remote` 只读核验）。 | **Release Agent 硬边界不执行 push**。**push 已授权（DEC-027）**，由 Coordinator 按执行序在 R2/R3 审查通过后执行 `git push origin main v0.5.2`；推送后须补 `check-release --lineage-mode released --release-commit 914725f8`（**须用重定后 tag target**；fail-closed 的发布完成态证据）。 |
| **R2** | `v0.5.2` tag 树含 v0.6.0 线内容（方案 A 固有） | 见 §3.2——范围以声明口径为准 | 范围声明已入 CHANGELOG 段外记录 + 路线图行；tag 未 push ⇒ 可复议/重做 |
| **R3** | 版本里程碑表缺 `v0.5.1 发布` 行（历史遗留） | 里程碑表在 `v0.5.0 发布` 后直接接本次新增的 `v0.5.2 发布`，v0.5.1（2026-09-07 已发布）无对应行——REL-005 时遗漏 | 本次按任务边界**只新增 v0.5.2 行**；v0.5.1 缺口如实上报，补录由 Coordinator 裁量（治理记录，非产品代码） |
| **R4** | `archive.py migrate --auto --dry-run` 解析边缘 | 实测输出：`📦 治理数据归档: 跳过（无可归档数据——已发布版本数不足（0 < 2），跳过归档）`，exit 0。仓库实有 8 个 tag（v0.2.0~v0.5.1），工具解析到 0 个已发布版本——与 REL-003/REL-004 同款家族边缘（SYSGAP-001 家族），**无数据损失、不阻断** | 记录留痕，不阻断发布（沿用 REL-003/REL-004 先例） |
| **R5** | `check-release` 候选态 CLI **FAILED（21 issues）——工具跨根期望源缺陷，非本版交付缺陷** | 实测 `check-release --version 0.5.2 --require-changelog --lineage-mode candidate` ⇒ `Result: FAILED - 21 issue(s).`（exit 1）。归因（逐条可复核）：①`changelog` FAIL 读的是**插件仓自身** `project/CHANGELOG.md`（`verify_workflow.py` L7181 `ROOT / "project/CHANGELOG.md"`，且 check-release 无 `--changelog` 参数）⇒ 对宿主仓 CHANGELOG 的检查**结构性不可达**（本仓 `CHANGELOG.md` 实测含 `## [0.5.2] - 2026-09-12`）；②`release fact source` 期望 `1.0.0 依赖链` / `1.0.0 roadmap row` / `REQ-059~064` = **插件仓**自身需求编号；③`execution gates` 的 governance health（73 issues）与 unit tests（180s 超时）执行的是**插件自家测试路径**（`skills/software-project-governance/infra/tests/…`）。通过项（真实）：`version consistency` / `hot fact source` / `runtime readiness matrix` / `first session measurement` / `governance pack status` / `agent adapters` / `projection sync` / `cross references` / `archive integrity` / `release lineage`（candidate 口径）/ `gate sequence for release` / `one dot zero blockers`。 | 与本项目 REL-003/REL-004 记载的「check-release CLI 不可用（SYSGAP-001 家族）」一致 ⇒ **不作为本版门禁 PASS 依据，也不以三件套替代其结论**（状态 = 不可用）。建议：Coordinator 登记 SYSGAP + 裁定替代口径（§9-5）。**可操作子项（已关闭）**：`release docs` FAIL 指向 `docs/release/{release-checklist,feature-flags,rollback-plan}-0.5.2.md`（本仓原先无 `docs/release/`）——**已由 Coordinator 授权补建**，随 REL-006 补充提交入仓（内容 = 本记录 §6/§8 的等价抽取 + 逐项门禁实测记录 + feature flag 取证）；`check-release` 其余失败项仍为跨根期望源缺陷（见独立发现 #2），**本门禁整体状态仍记 FAIL/不可用，不主张通过** |
| **R6** | Release Reviewer 后置审查 | 任务书要求「Release Reviewer 后置审查（自动）」 | 待 Coordinator 派发（本记录作为审查输入） |
| **R7** | EVD-097 与 tag/commit SHA 补录 | 本记录与路线图行**先于 tag 创建落盘**，无法自引用发布提交 SHA 与 tag 对象 SHA | Coordinator 收尾提交（EVD-097）补录：发布提交 `e1f25df84ead0a4d07c655f9afcd379a8a96a2a8`（版本 bump）+ 返工链 `792030c`/`6f0027b`/`914725f8`；**tag `v0.5.2` 对象 `793dde78…` → peel `914725f8…`**（DEC-027 重定后，= 返工链末端证据固化提交）。**supersede 留痕**：EVD-097 原记旧对象 `7ca99d6d612d90aadeba83d4c7ad40ed61feafa4` → peel `e1f25df8…`——该 tag 对象**已随重定删除**（`for-each-ref` 不再返回）⇒ 记录值以本行新身份为准；EVD 侧 supersede 行由 Coordinator 追加（`.governance/evidence-log.md`，本 Agent 不改该文件） |
| **R8** | **tag 提交边界：发布工件位于发布提交之后的补充提交** | `v0.5.2` tag 指向**发布提交** `e1f25df`（CHANGELOG `[0.5.2]` + package.json `0.5.2` + 治理记录——与任务书「方案 A：tag 指向 CHANGELOG/package.json 修订的提交」一致）；本次按 Coordinator 授权补建的 `docs/release/*` 三件发布工件落在**其后的 REL-006 补充提交**（SHA 见 EVD-097），故 **tag 树不含这三份文件**。（早于本次补建，本版 tag 树含 COMPAT-002~016（v0.6.0 线）的工作树内容——R2。） | 若要求「tag 树 ⊇ 全部发布工件 / 代码面仅在 BUG-006」，本地 tag 未 push ⇒ 可零成本重定：`git tag -d v0.5.2 && git tag -a v0.5.2 -m "…" <目标提交>`（目标候选 = 补充提交，或 `3442f39`）。**本记录不擅自重定 tag**（tag 指错/变更属治理敏感动作，需 Coordinator/用户确认）；`check-release --lineage-mode released --release-commit <SHA>` 须使用最终确认的 tag target |

**R5 补记（check-release candidate 原始报文节选）**：

```
=== Release Readiness Check ===
  Version: 0.5.2   Execution gates: enabled   Lineage mode: candidate
  [PASS] version consistency
  [FAIL] release fact source   (missing 1.0.0 dependency chain section / 1.0.0 roadmap row / REQ-059~064)
  [FAIL] release docs          (docs\release\{release-checklist,feature-flags,rollback-plan}-0.5.2.md 缺失)
  [PASS] release lineage       (candidate 模式不要求 tag 先于发布提交存在)
  [FAIL] execution gates       (verify PASS / governance health exit=1, 73 issues / e2e PASS / unit tests 180s 超时)
  [FAIL] changelog             (project\CHANGELOG.md: missing changelog entry ## [0.5.2])
  [FAIL] loop runtime claim gate (semantic_verdict=BLOCKED；指向插件仓 docs/reviews/… 文本)
  Result: FAILED - 21 issue(s).        (exit 1)
```

**R8 补记（R1 Release Reviewer 对 tag 边界的专门裁决 —— 四条，2026-09-12）**：

> 来源：`.governance/review-REL-006.md` §4「tag 边界与范围口径判断（专门裁决）」。**以下为 Reviewer 裁决的原文要点转录，非本 Agent 的处置结论**；**处置状态 = 已裁决（DEC-027 ①：重定至含全部发布工件的提交）**——重定由 Coordinator 执行（旧对象 `7ca99d6d…` 删除 → 新对象 `793dde78…` → peel `914725f8…`）；**重定前**本 Release Agent 未执行任何 tag 命令（未重定、未删除、未创建、未 push）。

| # | Reviewer 裁决 | 要点 |
| --- | --- | --- |
| ① | **边界方向可接受，状态不可接受（须处置）** | 「tag 指向发布提交（含版本 bump）」是仓库**既定惯例**（v0.3.0/v0.4.0/v0.5.0/v0.5.1 四个历史 tag 同构）⇒ 方案 A 的选择**有据、非失误** |
| ② | **不建议重定到 `3442f39`** | 「范围 = BUG-006 代码面」与「tag 树内 version = 0.5.2」在当前线性历史上**不可兼得**；重定到 `3442f39` 会以牺牲版本一致性换取范围精确性——**以更严重的错误替换较轻的错误，不采纳** |
| ③ | **三选一必须留痕** | 可行选项按优先级：**① 重定至 `e093e72`**（消除「发布工件不在 tag 树内」这一可机器观测的不一致，成本为零）／**② 在 `3442f39` 之上重建发布提交后重打 tag**（同时满足范围与版本一致性，需改写本地未推送历史 + 重新生成记录 SHA）／**③ 保持现状 + 用户显式确认**。**三选一必须留痕**，且须与 `check-release --lineage-mode released --release-commit <SHA>` 的最终取值一致 |
| ④ | **未 push 使一切可逆** | tag 与发布提交**均未 push**（远端 main = `3442f396`、远端无该 tag）⇒ 复议、重定、甚至整体重做**零远端副作用**。这**降低**了该边界项的紧迫度（故判 P1 而非 P0），但**不消除**——一旦按现状 push，边界即固化，此后修正须走 `revert` + 新版本号 |

**补充（Reviewer 对口径效力的判断）**：现口径「v0.5.2 代码范围 = BUG-006 安装通道适配；COMPAT-* 属未发布 v0.6.0 线」**仅存在于声明面**（本记录 §1.1 + §3.2 + 路线图行 + `checklist` §B 分层机检），**声明面不可机检**——任何下游消费者若改用 tag 树/工作树作判据即会偏离。因此口径**有效但不自证**。

**处置状态：已裁决（DEC-027，2026-09-12）**——三选一取 **① 重定至含全部发布工件的提交**（已完成：tag 对象 `793dde78…` → peel `914725f8…`）；push **已授权**（用户已授予 `workflow` scope），按执行序待 R2/R3 审查通过后由 Coordinator 执行。本记录与 `docs/release/release-checklist-0.5.2.md` 为仓库内可读的留痕面。**Release Agent 硬边界：不重定 tag、不删除 tag、不 push**（本 Agent 在返工 R2 轮亦**未执行任何 tag/push 命令**）。

**结论**：该 CLI 的失败项全部可由「跨根期望源 / 插件自家路径」解释，与本版交付内容无关；但**本记录不主张该门禁通过**——状态记 `FAIL（不可用）`，升级裁定见 §9-5。

---

## 8. 发布检查清单（release-checklist 六步，逐项）

| 步骤 | 检查项 | 结论 | 依据 |
| --- | --- | --- | --- |
| 一 | 版本号已定义（semver） | ✅ | `0.5.2`（§2） |
| 一 | 变更范围已列出（commit/issue 清单） | ✅ | §1.1 + §5（BUG-006 = `471ed00`/`3442f39`） |
| 一 | 变更类型已标注 | ✅ | 修复（PATCH） |
| 一 | 发布时间窗口已确定 | ✅ | 2026-09-12（用户定案日） |
| 二 | CHANGELOG 覆盖本次全部变更 | ✅ | `[0.5.2]` 段（逐字移动，无改写、无遗漏） |
| 二 | breaking change 已高亮 | ✅（无 breaking） | 旧布局行为零变化；条目内含兼容性说明 |
| 二 | 依赖变更已记录 | ✅（无依赖变更） | `package.json` dependencies/peerDependencies 未改 |
| 二 | 已知问题已列出 | ✅ | §7（R1~R8） |
| 三 | 回滚方案已编写（具体步骤） | ✅ | §6（A/B/C 三路径，命令级） |
| 三 | 回滚方案已验证（测试环境执行） | ✅ **已执行（隔离环境，2026-09-12 返工轮）** | §4.1 + §6「已定义、已演练（隔离环境）」+ `docs/release/rollback-plan-0.5.2.md` §7（路径 A 往返 A1 v0.5.1 → A3 v0.5.2 → A5 回滚 v0.5.1；6 次 install `exit=0`；幂等 A1→A2 / A3→A4 / 回滚 A4→A5 / B1→B2 均 `diff=0`；闭环 A2→A5 `diff=4` 残留如实登记）。**N2 订正**：本行原记「⚠️ 未执行」，与同文件 §4.1 / §6 自相矛盾，已同步 |
| 三 | 数据兼容性 | ✅（不涉及） | §6 |
| 三 | 回滚影响范围已评估 | ✅ | §6 影响面列 |
| 四 | 发布后验证清单 | ✅ | 三件套（§4）+ 本版**唯一交付面（安装通道）的被发布树隔离实测**——**隔离环境安装冒烟（环境变量重定向至临时目录）通过**（对 `git archive v0.5.2` 导出树执行安装/重装/回滚往返，有效版本正确 + 幂等 diff=0；口径订正说明见 `release-checklist` §D.1，逐命令记录见 `rollback-plan` §7）。**N2 订正**：本行原记「BUG-006 既有隔离实例实证」（证据对象 ≠ 被发布树），已同步 §D.1 口径 |
| 四 | 监控基线/告警 | N/A | 插件无生产监控面（如实标注，不伪造） |
| 五 | 核心指标基线 | N/A（无量化指标面） | 替代判定：三件套 282/0 不劣化 + 结构断言（smoke 机检） |
| 五 | 回滚触发条件 | ✅ | §6 触发条件（装载后主链路异常且定位到本版范围） |
| 六 | 发布决策 | ✅ **Go（本地发布）／push 已授权（DEC-027）** | 三件套全绿 + 范围分层正确 + RISK-004 阻塞已解除（用户已授予 `workflow` scope，状态进入「待执行」）；`check-release` 候选态**不可用（FAIL，跨根缺陷）**——见 §4.1 / §7 R5，本决策**不以该门禁为 PASS 依据** |

> **门禁诚实声明**：`stage-release` SKILL 的退出条件含「候选态 `check-release` PASS」。本次该门禁实测 **FAIL**（原因 = 工具跨根期望源缺陷，非本版交付缺陷）⇒ 该退出条件**未满足**，如实标注并升级 Coordinator 裁定（§9-5）；本记录**不主张**该条通过。

---

## 9. 发布后待办（移交 Coordinator）

1. **push（已授权 DEC-027，待执行）**：`git push origin main v0.5.2`；随后 `check-release --version 0.5.2 --require-changelog --lineage-mode released --release-commit 914725f8`（**必须使用重定后 tag target `914725f8`——不得使用旧值 `e1f25df8`**；fail-closed，禁止以候选态 PASS 代替）。
   - **⚠️ 可见面声明（F2 补强）**：`git push origin main v0.5.2` 将**同时把本机领先远端的 44 commits（含 COMPAT-002~016 的 v0.6.0 线工作树内容）**推送至远端主线——即可见面变化：**远端主线将公开未发布的 v0.6.0 线内容**。该动作属**发布决策**；**授权状态：已授权（DEC-027，2026-09-12；用户已授予 `workflow` scope）**（执行 = Coordinator，按执行序在 R2/R3 审查通过后）。
   - **发布纪律**：**先补齐审查项、后 push** —— 补强项（回滚演练 / tag 边界三选一 / push 范围声明 / `check-release` 替代口径裁定）未全部闭合前不得 push；push 后边界不可逆。
   - **执行序（DEC-027 后的实际序列）**：① tag 边界三选一留痕 + **重定（已完成：对象 `793dde78` → peel `914725f8`）** → ② R2/R3 审查通过 + 留痕同步（返工 R2 轮）→ ③ Coordinator 执行 push → ④ `check-release --lineage-mode released --release-commit 914725f8` 完成态证据。
2. **EVD-097**：证据行写入（含三件套输出、分层 diff、tag 基准选择、push 未执行说明、SHA 补录）。
3. **Release Reviewer 后置审查**（R6）。
4. 可选：里程碑表 `v0.5.1 发布` 行补录（R3）。
5. **裁定 `check-release` 跨根缺陷**（R5）：①登记 SYSGAP（SYSGAP-001 家族——跨根期望源）；②**已闭合**——Coordinator 授权补建 `docs/release/{release-checklist,feature-flags,rollback-plan}-0.5.2.md`（随 REL-006 补充提交入仓）；③裁定 stage-release「check-release PASS」退出条件在本仓的替代口径。

---

## 10. 执行日志（命令级，供复核）

| 时间 | 命令 | 结果 |
| --- | --- | --- |
| 2026-09-12 | `git status --porcelain` / `git log --oneline` / `git tag -l` / `git for-each-ref refs/tags` | 工作树 clean；本地 main 领先 origin/main 44 commits；已有 tag v0.2.0~v0.5.1；分析 `git ls-remote origin refs/heads/main` ⇒ `3442f39…` |
| 2026-09-12 | `git merge-base --is-ancestor 471ed00/3442f39 <remote main>` | exit 0 / exit 0（两提交均在远端） |
| 2026-09-12 | `node --check` ×12 | 0 失败（§4） |
| 2026-09-12 | `node test/validate-preset.mjs` | PASSED（exit 0） |
| 2026-09-12 | `node test/smoke.mjs` | 282 passed / 0 failed（exit 0） |
| 2026-09-12 | `python "<plugin>/infra/archive.py" migrate --auto --dry-run` | 跳过（无可归档数据；已发布版本数解析 0 < 2）；exit 0（R4） |
| 2026-09-12 | `python "<plugin>/infra/verify_workflow.py" check-release --version 0.5.2 --require-changelog --lineage-mode candidate` | **FAILED — 21 issue(s)**，exit 1（跨根期望源缺陷；原始报文节选见 R5 补记） |
| 2026-09-12 | `git add CHANGELOG.md package.json .governance/plan-tracker.md docs/review/REL-006-release-notes.md` + `git commit -F <msg>`（引用 REL-006） | 本地发布提交（**未 push**）；工作树中并发的 COMPAT-016 审查产物（`docs/review/COMPAT-016-R1.md` 等）**未纳入本次提交** |
| 2026-09-12 | `git tag -a v0.5.2 -m "…"` | 本地 annotated tag（**未 push**）；`git tag -l v0.5.2` 可查 |
| 2026-09-12 | 补建 `docs/release/{release-checklist,feature-flags,rollback-plan}-0.5.2.md`（Coordinator 授权）+ `git commit`（REL-006 补充提交） | 发布工件入仓（**未 push**）；tag 仍指向发布提交 `e1f25df`（见 R8） |
| 2026-09-12 | 补充提交后复跑三件套 | 见 §4（复跑结果不劣化） |

**返工轮（R1 复审 `NEEDS_CHANGE` → 补强）命令级日志**：

| 时间 | 命令 | 结果 |
| --- | --- | --- |
| 2026-09-12（返工轮） | `git -C <repo> rev-parse v0.5.2` / `'v0.5.2^{commit}'` / `v0.5.1` / `'v0.5.1^{commit}'`；`git for-each-ref refs/tags` | `v0.5.2` tag=`7ca99d6d612d90aadeba83d4c7ad40ed61feafa4` → peel `e1f25df84ead0a4d07c655f9afcd379a8a96a2a8`；`v0.5.1` tag=`7d4d89923e4e572d9af0003182a344d0acb0f2e9` → peel `cd1911e9f1e3bbb90b6197fa3cf7a5e95a1ea373`（与 `.governance/review-REL-006.md` 头部一致）。**〔历史留痕〕该读数为 DEC-027 重定前取值**——按命令级日志纪律**保留原始读数、不抹除**；重定后当前身份 = 对象 `793dde78…` → peel `914725f8…`（见本表后「返工 R2 轮」日志行） |
| 2026-09-12（返工轮） | `git -C <repo> archive --format=tar -o <ISO>\tree-v0.5.1.tar v0.5.1` + `tar -xf <ISO>\tree-v0.5.1.tar -C <ISO>\tree-v0.5.1`（v0.5.2 同法） | 两树导出至隔离根（v0.5.1 = 114 文件 / `install.ps1` 10745 B；v0.5.2 = 177 文件 / `install.ps1` 19166 B）；**未使用 `git checkout`**，当前工作树未被切换 |
| 2026-09-12（返工轮） | 只读取样：`Get-Content C:\Users\peter\.dsh\profiles\web\package.json` | 用于按真实形态建模隔离夹具（**只读**，未写入） |
| 2026-09-12（返工轮） | `<ISO>\run-drill.ps1`（= `. <ISO>\isolate-env.ps1` + 6 次 `Invoke-IsoInstall` + 7 次文件面快照 + `Compare-Object`） | 见 §4.1 与 `rollback-plan-0.5.2.md` §7.2/§7.3：A1→A2 `diff=0`、A3→A4 `diff=0`、A4→A5（回滚）`diff=0`、A2→A5（闭环）`diff=4`、A1→A3 `diff=4`、B1→B2 `diff=0`；6 次安装全部 `exit=0`、`realPathLeak=0` |
| 2026-09-12（返工轮） | `Compare-Object`（真实 `~/.dsh` 演练前/后 fingerprint） | `LastWriteTime` 恒为 `2026/9/12 12:05:06` 未变；唯一差异 = `sessions`/`storages` 字节增长（**本 agent 会话自身**的实时写入，非演练所致）⇒ 真实 `~/.dsh` 未被触碰 |
| 2026-09-12（返工轮） | **如实记录**：首轮演练（守卫加入前）因 `$home` 与 PowerShell 只读自动变量 `$HOME` 冲突，误将 `DSH_HOME` 解析为真实 `C:\Users\peter`，在真实用户目录写入 3 项（`profiles/`、`.agent-presets/`、`settings.yaml`，均新建） | **已清理**：删除前断言 `CreationTime ∈ 演练窗口`（否则 `throw`）→ 断 junction → 删 3 项 → 核验 `exists=False` × 3；真实 `~/.dsh` 全程未触碰。**纠正措施**：变量重命名 + `Assert-IsoPath` fail-closed 守卫 + 环境生效值二次断言 + 真实路径泄漏检测器 + 调用侧 `$ErrorActionPreference='Stop'`；§7.2/§7.3 结果全部来自加守卫之后的运行。详见 `rollback-plan-0.5.2.md` §7.5 |
| 2026-09-12（返工轮） | `git diff e1f25df8^ e1f25df8 --name-only`（F9 绝对 SHA 复算） | 恰 4 文件：`.governance/plan-tracker.md` / `CHANGELOG.md` / `docs/review/REL-006-release-notes.md` / `package.json`（0 个 `lib/**`）——满足 F9 复审验证点 |
| 2026-09-12（返工轮） | `git diff HEAD~1 HEAD --name-only`（原相对引用，**已废弃**） | 6 文件（治理记录面）——与发布提交的 4 文件集合不同 ⇒ **实证原取证命令事后不可复算**（F9 现象成立） |
| 2026-09-12（返工轮） | 三件套复跑：`node --check` × 12 文件 / `node test/validate-preset.mjs` / `node test/smoke.mjs` | `NODE --CHECK SUMMARY: 12 files, 0 failures` / `PRESET VALIDATION PASSED`（29/29，exit 0）/ `SMOKE DONE: 282 passed, 0 failed`（exit 0）——**基线 282/0 未劣化** |
| 2026-09-12（返工轮） | tag 相关命令 | **本行 = R1 返工轮内（重定前）事实：该轮未执行任何 tag 命令**（无 `tag -d` / `tag -a` / `push`）——当时 F4 处置属用户裁决，Release Agent 硬边界。**其后 DEC-027 已由 Coordinator 执行 tag 重定**（旧对象 `7ca99d6d…` 删除 → 新对象 `793dde78…` → peel `914725f8…`）⇒ 现状以本表后「返工 R2 轮」日志为准（N1） |

**返工 R2 轮（REVIEW-REL-006-R2 四条留痕订正 N1~N4）命令级日志**：

| 时间 | 命令 | 结果 |
| --- | --- | --- |
| 2026-09-12（返工 R2） | `git rev-parse v0.5.2` / `'v0.5.2^{commit}'` / `git for-each-ref refs/tags/v0.5.2` | **重定后 tag 身份 = 对象 `793dde787c6320ea7ad2e482e37322dea75d1b3d` → peel `914725f86b61c8f57522f4d240925086f120fff8`**（= 返工链末端「演练工件固化」提交）；旧对象 `7ca99d6d…` 已随重定删除（`for-each-ref` 不再返回） |
| 2026-09-12（返工 R2） | `git log --oneline --reverse e1f25df8..HEAD` | 发布动作链实测 = **4 提交**：`e1f25df8`（版本 bump）→ `792030c`（R1 补强）→ `6f0027b`（M7.7 事件机写证据）→ `914725f8`（演练工件固化）；其后 `ef23ed3`（R2 复审机录）等提交**不在 tag 树内** ⇒ 订正文案一律写「peel `914725f8` = 返工链末端」而**不写**「= 当前 HEAD」（报告出具时 HEAD = `914725f8`，其后已前移） |
| 2026-09-12（返工 R2） | `git diff --name-only e1f25df8 914725f8 -- install.ps1 install.sh` | **0 文件** ⇒ 演练取树与被发布树在**安装面**等价（H2 代表性依据，本轮独立复验） |
| 2026-09-12（返工 R2） | 三件套复跑：`node --check` × 12 文件 / `node test/validate-preset.mjs` / `node test/smoke.mjs` | `NODE --CHECK SUMMARY: 12 files, 0 failures, 0 missing` / `PRESET VALIDATION PASSED`（29/29，exit 0）/ `SMOKE DONE: 282 passed, 0 failed`（exit 0）——**基线 282/0 未劣化**（纯文档改动） |
| 2026-09-12（返工 R2） | tag / push 相关命令 | **本轮未执行任何 tag 命令、未执行任何 push**（Release Agent 硬边界；tag 重定已由 Coordinator 按 DEC-027 完成） |

> **真实性声明**：本记录所有数值均来自上表命令的真实输出（本次执行）；未执行项一律标 `未执行`/`N/A`，不以推测填充。本文件随发布提交入仓；其自身提交 SHA 与 tag SHA 由 §7 R7 补录承载（EVD-097；重定后身份见本 §10「返工 R2 轮」）。
