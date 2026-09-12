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

### 4.1 本次未执行的验证（诚实披露）

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 安装冒烟（真实/隔离安装） | **未执行** | 本次发布不含安装动作，也未为发布单独安装；BUG-006 安装通道证据来自其交付内的**隔离实例实测**（见 `CHANGELOG [0.5.2]` 条目与 BUG-006 EVD），本记录**不主张**新增安装验证。措辞边界：不写「真实安装通过」；BUG-006 的实测口径为隔离实例（`DSH_HOME`/`npm_config_*` 重定向）。 |
| `check-release --version 0.5.2 --require-changelog --lineage-mode candidate` | **FAILED（21 issues，exit 1）——跨根期望源缺陷** | 已实际执行并**如实记录为 FAIL，不包装为 PASS**；归因见 §7 R5：该 CLI 对本仓结构性不可用（`changelog` 检查读插件仓自身 `project/CHANGELOG.md`、期望 `REQ-059~064`/`1.0.0 依赖链`、执行插件自家测试路径），与本项目 REL-003/REL-004 记载的 SYSGAP-001 家族一致。**未以三件套或其它检查替代其结论**——该门禁状态为「不可用」，需 Coordinator/Release Reviewer 裁定 |
| 回滚演练（release-checklist 要求「已在测试环境实际执行」） | **未执行** | 回滚对象为本地 tag/安装版本（非运行态系统），方案见 §6；此项差距如实标注：**回滚方案已定义、步骤确定性可执行，但未演练** |
| 监控/发布后观察期 | 不适用 | 本插件无生产监控面；发布后验证以三件套 + 用户侧实机使用为准 |
| `.github/workflows/ci.yml` 相关 CI | **未运行/未触碰** | 本任务明确不触碰 CI 配置；且 RISK-004 约束下不做任何推送（无远端 CI 触发） |

---

## 5. 变更清单（与发布提交对照）

| 文件 | 变更 |
| --- | --- |
| `CHANGELOG.md` | 新增 `## [0.5.2] - 2026-09-12` + `### 修复`；BUG-006 条目自 `[Unreleased]` **逐字移入**（无改写）；COMPAT-* 条目全部留在 `[Unreleased]` |
| `package.json` | `"version": "0.5.1"` → `"0.5.2"`（**仅版本行**） |
| `.governance/plan-tracker.md` | 路线图 v0.5.2 行：`未发布` → `已发布`、日期 `2026-09-12`、交付物列（`git tag v0.5.2` + `CHANGELOG [0.5.2]`）、范围声明（COMPAT-* 属 v0.6.0 线）；版本里程碑新增 `v0.5.2 发布` 行。**仅路线图/里程碑节**，任务行由 Coordinator 维护 |
| `docs/review/REL-006-release-notes.md` | 本记录（新增） |
| `docs/release/release-checklist-0.5.2.md` · `docs/release/feature-flags-0.5.2.md` · `docs/release/rollback-plan-0.5.2.md` | 三件发布工件（**REL-006 补充提交**新增；Coordinator 授权补建；内容 = 本记录 §6/§8 等价抽取 + 逐项门禁实测 + feature flag 取证「不适用」） |

**未触碰**：`.github/workflows/ci.yml`、`lib/**`、`test/**`、`install.ps1`、`install.sh`、`README.md`（本版代码面零改动——发布为纯元数据 + 治理记录动作）。

---

## 6. 回滚方案（v0.5.2 → 回退）

| 路径 | 命令（逐条可执行） | 适用场景 | 影响面 |
| --- | --- | --- | --- |
| **A（推荐）** | `git -C "D:\AI\agent\deepseek\harness\writing-workflow" checkout v0.5.1`，随后重跑 `install.ps1`（Windows）/ `bash install.sh`（*nix）——安装脚本幂等，重复执行不产生重复行/键 | 用户侧安装产物出现异常，需回到上一个已发布版本 | 插件代码面回退到 v0.5.1（`cd1911e`） |
| **B（代码面精确回退 BUG-006-only）** | `git checkout 3442f39`（v0.5.2 代码基准，远端同源） | 需保留 v0.5.x 线但去除 COMPAT 工作 | 代码面 = BUG-006 修复 + 治理收尾 |
| **C（撤销本版发布动作，仅本地）** | `git tag -d v0.5.2` + `git reset --hard <v0.5.2 之前的提交>`（或 `git revert`） | 发布提交本身有误 | 本版提交/tag **均未 push** ⇒ 无远端影响、无他人可见面 |

- **数据兼容性**：本版无 schema/数据迁移、无宿主配置结构变更 ⇒ 回滚不涉及数据面（`settings` ns `novel-writing` 字段不变）。
- **独立工件**：`docs/release/rollback-plan-0.5.2.md`（触发条件 + 三路径 + 验证方式 + 演练状态）。
- **预计回滚时间**：< 1 分钟（git checkout + 幂等安装脚本；无服务重启以外动作）。
- **状态**：**已定义、未演练**（§4.1 如实标注）。

---

## 7. 残余风险与遗留

| # | 项 | 事实与影响 | 处置 |
| --- | --- | --- | --- |
| **R1** | **RISK-004：push 未执行（本版主要残余风险）** | 本机 git 凭证（OAuth App）缺 `workflow scope`，含 `.github/workflows/ci.yml` 变更的本地提交无法推送。发布提交与 `v0.5.2` annotated tag **仅存在于本地**；远端 `origin/main` 仍 = `3442f39`，远端无 `v0.5.2`（本任务用 `git ls-remote` 只读核验）。 | **按任务约束未执行 push**（禁止项）。由 Coordinator 在用户授权后执行 `git push origin main v0.5.2`；推送后须补 `check-release --lineage-mode released --release-commit <SHA>`（fail-closed 的发布完成态证据）。 |
| **R2** | `v0.5.2` tag 树含 v0.6.0 线内容（方案 A 固有） | 见 §3.2——范围以声明口径为准 | 范围声明已入 CHANGELOG 段外记录 + 路线图行；tag 未 push ⇒ 可复议/重做 |
| **R3** | 版本里程碑表缺 `v0.5.1 发布` 行（历史遗留） | 里程碑表在 `v0.5.0 发布` 后直接接本次新增的 `v0.5.2 发布`，v0.5.1（2026-09-07 已发布）无对应行——REL-005 时遗漏 | 本次按任务边界**只新增 v0.5.2 行**；v0.5.1 缺口如实上报，补录由 Coordinator 裁量（治理记录，非产品代码） |
| **R4** | `archive.py migrate --auto --dry-run` 解析边缘 | 实测输出：`📦 治理数据归档: 跳过（无可归档数据——已发布版本数不足（0 < 2），跳过归档）`，exit 0。仓库实有 8 个 tag（v0.2.0~v0.5.1），工具解析到 0 个已发布版本——与 REL-003/REL-004 同款家族边缘（SYSGAP-001 家族），**无数据损失、不阻断** | 记录留痕，不阻断发布（沿用 REL-003/REL-004 先例） |
| **R5** | `check-release` 候选态 CLI **FAILED（21 issues）——工具跨根期望源缺陷，非本版交付缺陷** | 实测 `check-release --version 0.5.2 --require-changelog --lineage-mode candidate` ⇒ `Result: FAILED - 21 issue(s).`（exit 1）。归因（逐条可复核）：①`changelog` FAIL 读的是**插件仓自身** `project/CHANGELOG.md`（`verify_workflow.py` L7181 `ROOT / "project/CHANGELOG.md"`，且 check-release 无 `--changelog` 参数）⇒ 对宿主仓 CHANGELOG 的检查**结构性不可达**（本仓 `CHANGELOG.md` 实测含 `## [0.5.2] - 2026-09-12`）；②`release fact source` 期望 `1.0.0 依赖链` / `1.0.0 roadmap row` / `REQ-059~064` = **插件仓**自身需求编号；③`execution gates` 的 governance health（73 issues）与 unit tests（180s 超时）执行的是**插件自家测试路径**（`skills/software-project-governance/infra/tests/…`）。通过项（真实）：`version consistency` / `hot fact source` / `runtime readiness matrix` / `first session measurement` / `governance pack status` / `agent adapters` / `projection sync` / `cross references` / `archive integrity` / `release lineage`（candidate 口径）/ `gate sequence for release` / `one dot zero blockers`。 | 与本项目 REL-003/REL-004 记载的「check-release CLI 不可用（SYSGAP-001 家族）」一致 ⇒ **不作为本版门禁 PASS 依据，也不以三件套替代其结论**（状态 = 不可用）。建议：Coordinator 登记 SYSGAP + 裁定替代口径（§9-5）。**可操作子项（已关闭）**：`release docs` FAIL 指向 `docs/release/{release-checklist,feature-flags,rollback-plan}-0.5.2.md`（本仓原先无 `docs/release/`）——**已由 Coordinator 授权补建**，随 REL-006 补充提交入仓（内容 = 本记录 §6/§8 的等价抽取 + 逐项门禁实测记录 + feature flag 取证）；`check-release` 其余失败项仍为跨根期望源缺陷（见独立发现 #2），**本门禁整体状态仍记 FAIL/不可用，不主张通过** |
| **R6** | Release Reviewer 后置审查 | 任务书要求「Release Reviewer 后置审查（自动）」 | 待 Coordinator 派发（本记录作为审查输入） |
| **R7** | EVD-097 与 tag/commit SHA 补录 | 本记录与路线图行**先于 tag 创建落盘**，无法自引用发布提交 SHA 与 tag 对象 SHA | Coordinator 收尾提交（EVD-097）补录：发布提交 `e1f25df84ead0a4d07c655f9afcd379a8a96a2a8`、tag 对象 `7ca99d6d612d90aadeba83d4c7ad40ed61feafa4` → peel `e1f25df8…` |
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
| 二 | 已知问题已列出 | ✅ | §7（R1~R7） |
| 三 | 回滚方案已编写（具体步骤） | ✅ | §6（A/B/C 三路径，命令级） |
| 三 | 回滚方案已验证（测试环境执行） | ⚠️ **未执行** | §4.1 如实标注（非运行态系统；步骤确定性） |
| 三 | 数据兼容性 | ✅（不涉及） | §6 |
| 三 | 回滚影响范围已评估 | ✅ | §6 影响面列 |
| 四 | 发布后验证清单 | ✅ | 三件套（§4）+ 用户侧实机使用（BUG-006 既有隔离实例实证） |
| 四 | 监控基线/告警 | N/A | 插件无生产监控面（如实标注，不伪造） |
| 五 | 核心指标基线 | N/A（无量化指标面） | 替代判定：三件套 282/0 不劣化 + 结构断言（smoke 机检） |
| 五 | 回滚触发条件 | ✅ | §6 触发条件（装载后主链路异常且定位到本版范围） |
| 六 | 发布决策 | ✅ **Go（本地发布）／push 待授权** | 三件套全绿 + 范围分层正确 + RISK-004 为已知外部约束；`check-release` 候选态**不可用（FAIL，跨根缺陷）**——见 §4.1 / §7 R5，本决策**不以该门禁为 PASS 依据** |

> **门禁诚实声明**：`stage-release` SKILL 的退出条件含「候选态 `check-release` PASS」。本次该门禁实测 **FAIL**（原因 = 工具跨根期望源缺陷，非本版交付缺陷）⇒ 该退出条件**未满足**，如实标注并升级 Coordinator 裁定（§9-5）；本记录**不主张**该条通过。

---

## 9. 发布后待办（移交 Coordinator）

1. **push（用户授权后）**：`git push origin main v0.5.2`；随后 `check-release --version 0.5.2 --require-changelog --lineage-mode released --release-commit <发布提交 SHA>`（fail-closed，禁止以候选态 PASS 代替）。
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

> **真实性声明**：本记录所有数值均来自上表命令的真实输出（本次执行）；未执行项一律标 `未执行`/`N/A`，不以推测填充。本文件随发布提交入仓，故不包含其自身提交 SHA 与 tag SHA（§7 R7）。
