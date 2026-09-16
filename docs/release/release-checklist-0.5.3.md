# 发布检查清单 — v0.5.3（2026-09-15）

- **关联任务**：REL-007（发布 v0.5.3 —— 修复批承载）
- **发布类型**：本地发布（发布提交 + 本地 annotated tag，**未 push**；push 由 Coordinator 在 Release Reviewer 通过后执行）
- **发布提交**：`REL-007: 发布 v0.5.3（CHANGELOG 定稿…）` = **本清单所在提交**（内容含 `CHANGELOG.md` + `docs/release/{release-checklist,feature-flags,rollback-plan}-0.5.3.md`）；**tag** `v0.5.3`（annotated）建立在该提交上
- **自引用说明（P-01 如实）**：提交 SHA 与 tag 对象/peel SHA 由提交本身决定，**无法写入自身**；确切值见 `docs/release/evidence/rel007-drill-20260915/README.md`（证据提交中回填）
- **结论**：**有条件通过（Go —— 本地发布）**；条件 = ①push 未执行（由 Coordinator 按执行序执行）；②**2 项门禁命令不可用**（均 BLOCKED-by-upstream：`check-release` 内含 U1/U2/U3/U4/U6/U7 上游跨根缺陷、`release-ledger` 崩溃 = U5）＋**1 项发布阻断级门禁序 FAIL**（`[G-s2]`，F-01，须用户显式授权）——**均未包装为 PASS**，见 §H

---

## A. 发布准备

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 版本号已定义（semver） | `major.minor.patch` | ✅ `0.5.3` | `package.json` `"version": "0.5.3"`（0.x 阶段：补丁号承载修复——`CHANGELOG.md` 头行口径） |
| 2 | 变更范围已列出 | 任务清单 | ✅ 6 个已闭环任务 | `BUG-007`(P0) / `UX-060`(P1) / `BUG-009`(P2) / `CLEAN-007`(P2) / `BUG-010`(P2) / `CLEAN-006`(P2)；用户 2026-09-15 经 ask_user_question 确认 |
| 3 | 变更类型已标注 | 新功能/修复/优化/破坏性 | ✅ **修复**（PATCH bump，**无 breaking change**） | 本批全为缺陷修复 + 验证资产/记录面收口；`[0.5.3]` 段无 BREAKING 条目标记 |
| 4 | 发布时间窗口 | 明确日期 | ✅ 2026-09-15 | 段头 `## [0.5.3] - 2026-09-15` |
| 5 | **明确不发布什么**（Amazon 口径） | 排除项有记录 | ✅ | **不含** `CLEAN-005` / `CLEAN-008` / `CLEAN-009` / `BUG-008`（未完成）；`COMPAT-017` 属 v0.6.0 线；**5 条 `COMPAT-*` 新增 + 历史 `COMPAT-*` 修复条目全部保留在 `[Unreleased]`**（遵 v0.5.2 先例：`[0.5.2]` 含 BUG-006 且**零** COMPAT-*） |
| 6 | 回滚点已确定 | 明确上一发布版 | ✅ `v0.5.2` | tag `v0.5.2` 对象 `793dde78…` → peel `914725f8…` |

## B. 变更日志

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | CHANGELOG 已定稿 | 覆盖本版全部变更，与 commit 对照一致 | ✅ | 新增 `## [0.5.3] - 2026-09-15` + `### 修复`；**9 条**顶层条目（覆盖 6 任务）自 `[Unreleased]` 移入 |
| 2 | 条目**逐字移动**（非重写） | 与 `git show HEAD:CHANGELOG.md` 逐字节对照 | ✅ | 搬运行 **100 行**与 HEAD 逐字节一致；独立复核脚本 6 判据全绿（V1 无行丢失 / V2 新增行恰为段头+`### 修复`+恢复标题+7 空行 / V3 首尾段不变 / V4 `[0.5.3]` 9 条覆盖 6 任务且零 COMPAT-* / V5 `[Unreleased]` 15 条全 COMPAT-* / V6 9 条正文在 HEAD 连续命中 L33/44/53/64/76/93/102/111/191 且互不重叠） |
| 3 | 破坏性变更已高亮 | breaking 有说明与迁移指引 | ✅ **无 breaking change** | 改动面 = `lib/` 代码 + 预设配置键 + 验证资产 + 文档；**无数据/状态 schema 迁移** |
| 4 | 依赖变更已记录 | 新/升级依赖有版本与原因 | ✅ **无依赖变更** | `package.json` dependencies/peerDependencies 本批未改（仅 version 行） |
| 5 | 已知问题已列出 | 有说明与 workaround | ✅ | 见 §H（2 项上游门禁不可用）+ `docs/review/BUG-007-R1.md` 等审查报告的备注项归口于 `CLEAN-005/008/009`（**未发布**） |
| 6 | **移动纯粹性附带修复已留档** | 非纯移动的改动须显式声明 | ✅ | `CLEAN-007` 条目标题行在 commit `6f65bbe` 被 `CLEAN-006` A 段标题**覆盖丢失**（其子项自该 commit 起悬挂于 CLEAN-006 条目下）。本版按 `a04ea89:CHANGELOG.md` L44 原文**逐字恢复**该标题——V2 中唯一新增的非结构行；**不恢复则 v0.5.3 段无法归因 CLEAN-007（属纳入范围的任务）** |

## C. 回滚方案

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 回滚方案已编写 | 命令级具体步骤 | ✅ | `docs/release/rollback-plan-0.5.3.md`（A/B/C 三路径） |
| 2 | 回滚方案**已实际执行** | 测试环境实跑（非形式化） | ✅ **已执行（隔离环境）** | 2026-09-16 于隔离根 `%TEMP%\rel007-drill-20260915` 实跑「**安装 → 回退 → 再安装**」往返；证据 `docs/release/evidence/rel007-drill-20260915/`（`report.json` / `drill-log.txt` / 快照 ×6 / 前后指纹） |
| 3 | 数据兼容性 | 回滚后数据兼容 | ✅（不涉及） | 本版无 schema/数据迁移；`settings` 命名空间 `novel-writing` 字段未变 |
| 4 | 回滚影响范围已评估 | 不造成额外损失 | ✅ | 影响面 = 版本注册 + 预设内容按版本重写；**回滚残余实测 = 0**（`R0(全新 v0.5.2) vs C3(回滚末端)` diff=0） |

> 措辞纪律（M7.7）：本清单一律使用「**隔离环境安装冒烟（环境变量重定向至临时目录）通过**」，**不主张**任何无限定语的「真实安装/真实环境」验证。

## D. 发布后验证计划

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 核心功能验证清单 | 列出发布后需验证项 | ✅ | ①三件套（§G）；②**隔离环境安装冒烟（环境变量重定向至临时目录）通过**——对 `v0.5.3` **被发布树**执行安装/回退/再安装往返；③用户侧实机验收（重启 DSH 后） |
| 2 | 监控指标基线 | 发布前基线已记录 | N/A | 插件无生产监控面（如实标注，不伪造） |
| 3 | 告警规则就绪 | 告警已配置 | N/A | 同上；既有结构化告警面为加载期 `[nv-compat]`（v0.6.0 线，不在本版范围） |
| 4 | 验证责任人 | 每项有负责人 | ✅ | 执行 = Release Agent；复核/收尾 = Coordinator；后置审查 = Release Reviewer |

## E. 数据验证计划

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 核心指标基线 | 错误率/延迟/活跃度 | N/A（无量化用户指标面） | 替代判定见 #3 |
| 2 | A/B 测试方案 | 如适用 | N/A | 本版为缺陷修复，无实验面 |
| 3 | 成功标准已量化 | 有方向与幅度 | ✅（替代判定） | **门禁零劣化**：`node --check` 23 文件 / **0 失败**；`validate-preset` **PASSED**（29/29）；`smoke` **302 passed / 0 failed**（基线 302） |
| 4 | 观察期 | ≥30 min（hotfix）/ ≥24h（功能） | ✅ 替代口径 | 以「用户侧重启后主链路（继续工作流 / 绑定新会话 / 工作区对话框 Esc / 长告警可读）无异常」为观察面；本版未 push ⇒ 无生产观察窗 |
| 5 | 回滚触发条件 | 指标触发条件 | ✅ | `rollback-plan-0.5.3.md` §1 |

## F. 发布决策

| 决策 | 结论 | 理由 |
| --- | --- | --- |
| 可以发布 / 有条件发布 / 暂缓 | **有条件发布（Go —— 本地）** | 范围分层正确（6 任务入版、4 任务与 COMPAT-* 明确排除）+ 三件套全绿 + 版本三方一致 + 回滚演练实跑通过；条件 = ①push 未执行（待 Coordinator）；②2 项上游门禁不可用已升级（§H） |

## G. 门禁执行记录（真实输出，2026-09-16）

| 门禁 | 命令 | 实测 | 结论 |
| --- | --- | --- | --- |
| 语法 | `node --check`（`git ls-files "*.js" "*.mjs"` 全清单） | `files=23 failed=0` | **PASS** |
| 预设 | `node test/validate-preset.mjs` | `PRESET VALIDATION PASSED（schema-face: PASS）`，skills **29/29**，exit 0（0.37 s） | **PASS** |
| 冒烟 | `node test/smoke.mjs` | `SMOKE DONE: 302 passed, 0 failed`，exit 0（0.77 s；基线 302） | **PASS（零劣化）** |
| 归档触发 | `python "<plugin>/infra/archive.py" migrate --auto --dry-run` | `📦 治理数据归档: 跳过（无可归档数据——已发布版本数不足（0 < 2））`，exit 0 | 不阻断（SYSGAP-001 家族边缘，无数据损失） |
| 发布就绪 | `python "<plugin>/infra/verify_workflow.py" check-release --version 0.5.3 --require-changelog --lineage-mode candidate` | **FAILED / exit 1**，**三时点读数（口径时效订正 F-09）**：发布期（tag 前）**22 issue(s)** / 283.5 s → R1 复审时点（tag 后）**23** / 267.7 s → **本次订正时点（`2026-09-16`）25 issue(s)**。Δ=+3 逐条实测：**+1** `gate sequence for release` 的 `[G-s2]`（**tag 已存在** ⇒ 见 F-01）＋**+2** `loop runtime claim gate` 的 `ACCOUNTING_MARKDOWN_AMBIGUOUS_BOUNDARY` / `IDENTITY_ATTESTATION_FAIL`（同因 `.governance/risk-log.md` 表格行参差，**同期治理记录编辑引入，非本版交付物**） | **不可用（上游跨根缺陷 U1~U7）** + 宿主侧真实缺失（§H.2）逐条列出 —— **未包装为 PASS**；**「22」不得再作现值引用** |
| Release ledger | `python "<plugin>/infra/verify_workflow.py" release-ledger --version 0.5.3 --no-remote` | **未处理异常崩溃**：`ValueError: '…/core/releases/0.5.3.json' is not in the subpath of 'D:\AI\agent\deepseek\harness\writing-workflow'`，exit 1 | **BLOCKED-by-upstream**（工具崩溃，无 JSON 输出，**不得读作 PASS/FAIL**） |
| 回滚演练 | `pwsh -File docs/release/evidence/rel007-drill-20260915/run-drill.ps1 -CandidateRef v0.5.3` | `verdict=PASS`；R0+C1~C5 **全 leg exit 0**；有效版本序列 `0.5.2(R0) → 0.5.3 → 0.5.3 → 0.5.2 → 0.5.3 → 0.5.3`；幂等 diff `C1→C2=0 / C4→C5=0 / C2→C5(闭环)=0 / C3→C4=2 / C1→C3=2 / R0-vs-C3=0`；**回滚安装实测 3.195 s**（tag 权威跑；预跑 0.611 s，**候选树与发布树不同**——见 §H 与 `rollback-plan` §4）；真实 `$DSH_HOME` `strict_deltas=0 ∧ inventory_deltas=0` | **PASS** |

## H. 门禁不可用 / 宿主侧缺失的逐条归因（**不得混入「已通过」**）

### H.1 BLOCKED-by-upstream（插件工具缺陷，宿主侧不可修；按 DEC-027「仅登记、不修插件仓」）

| # | 项 | 实测 | 归因（源码级） |
| --- | --- | --- | --- |
| U1 | `check-release` → `changelog` | `project\CHANGELOG.md: missing changelog entry ## [0.5.3]` | `verify_workflow.py` L7181：`changelog_path = ROOT / "project/CHANGELOG.md"`，而 `ROOT = Path(__file__).resolve().parents[3]` = **插件仓根** ⇒ 该子门禁校验的是**插件自身** 0.81.0 线变更日志（实测其 `project/CHANGELOG.md` 含 `## [0.81.0]`、**不含** `## [0.5.3]`）。**对任何宿主项目必然为红**，与宿主 `CHANGELOG.md` 无关 |
| U2 | `check-release` → `release fact source` 中 `project\references\architecture.md:445` | `architecture overstates pending Gemini/opencode or real-environment E2E status` | 该路径属**插件仓**，非宿主文件 |
| U3 | `check-release` → `loop runtime claim gate` | **清单时点 = 7 条**（3× `AUTHORITY_SOURCE_OCCURRENCE` + 1× `AMBIGUOUS_SUBJECT_RELATION` + 3× `UNSUPPORTED_AFFIRMATIVE` = 7；均点名插件仓 `docs/reviews/review-FIX-300-CODE-R0.md`、`docs/release/release-checklist-0.81.0.md`）；**订正时点 = 9 条**（+1× `ACCOUNTING_MARKDOWN_AMBIGUOUS_BOUNDARY` +1× `IDENTITY_ATTESTATION_FAIL`，二者同因 `.governance/risk-log.md` 表格行参差，**系同期治理记录编辑引入，非本版交付物**） | 复核面为**插件仓文档**（**口径订正**：本行原书写「6 条（3×…1×…3×…）」= 分项之和 7，属**算术不自洽**，现按分项订正为 **7 条**并补现值 9 条；来源 `docs/review/REL-007-R1.md` F-06） |
| U4 | `check-release` → `execution gates` → `unit tests` | `Command 'python -m unittest skills/software-project-governance/infra/tests/test_verify_workflow.py' timed out after 180 seconds` | 运行的是**插件自带测试套件**（路径在插件仓），超时归工具侧 |
| U5 | `release-ledger --version 0.5.3 --no-remote` | **崩溃**：`ValueError: '…/core/releases/0.5.3.json' is not in the subpath of '<宿主根>'`，exit 1 | `verify_workflow.py` L21299：`manifests_dir=PLUGIN_ROOT / "skills/.../core/releases"` 与 `RepositoryContext(HOST_PROJECT_ROOT)` **混用**；`ledger.py` L483 取 `manifests_dir/0.5.3.json`，L307 立即 `path.relative_to(context.root)` ⇒ **插件根 ≠ 宿主根时必然崩溃**（且插件 `core/releases/` 只有 0.62.0~0.81.0，**无** `0.5.3.json`） |
| U6 | `check-release` → `release docs`（3 条） | `docs\release\{release-checklist,feature-flags,rollback-plan}-0.5.3.md: missing …` | `verify_workflow.py` **L6251** `def check_release_docs_coverage(version, root=None):` / **L6253** `root = Path(root) if root is not None else ROOT`，而**调用点 L7047 为 `check_release_docs_coverage(version)`——不传 root** ⇒ `root = ROOT` = **插件仓根**。实测对照：插件仓 `docs/release/` 为其自身 0.31.0~0.81.0 产品线（**无** `*-0.5.3.md`），宿主仓**有**三件 `*-0.5.3.md` ⇒ **该子门禁校验的是插件自身版本线，对任何宿主项目必然为红**。与 U1 同源（跨根期望源） |
| **U7** | **`check-release` → `execution gates` 四门禁全部为「插件自检」**（**归因订正，来源 `docs/review/REL-007-R1.md` F-04**） | `governance health` 汇总报 **88 issue(s)**；实测对照：**插件根 cwd** 直跑 `check-governance --fail-on-issues` = **88 issue(s)**（含 `[FAIL] 427 structural issue(s) (1 blocking)`），**宿主根 cwd** 直跑 = **20 issue(s)**（本清单 §H.2 原记录值 16 / R1 复审时点 17 / 现行 `2026-09-16` 时点 **20** —— 状态漂移如实留档） | `verify_workflow.py` **L5981 `cwd=str(ROOT)`**（= 插件根）为四门禁子进程工作目录；门禁表 **L6020-6024** = `verify` / `check-governance --fail-on-issues` / `e2e-check` / `unittest skills/.../infra/tests/test_verify_workflow.py`；`_resolve_host_root()` 优先级 = 显式 cwd → `os.getcwd()` ⇒ 子进程解析出的 `HOST_PROJECT_ROOT` = **插件仓**。**结论：check-release 的四个 execution gate 对宿主项目零信号**；`88` **不是**宿主读数、**亦不是「口径差异」**（原 H3 归因错误，已订正） |

### H.2 宿主侧真实缺失（逐条列出与处置）

| # | 项 | 实测 | 处置 |
| --- | --- | --- | --- |
| H1 | `check-release` → `release fact source`（**宿主** `.governance/plan-tracker.md`） | 缺 `1.0.0 依赖链` 节、缺 `1.0.0 roadmap row`、需求矩阵缺 `REQ-059`~`REQ-064`（该项 9 条报文中 **8 条**为宿主，另 1 条 `project\references\architecture.md:445` 属插件仓 = U2） | ⚠️ **宿主治理记录结构性缺口**，位于 `.governance/**` = **REL-007 写边界外**（本任务被明确禁止写该目录）⇒ **升级 Coordinator 处置**，本版不修、不掩盖 |
| H2 | **宿主根 cwd 直跑读数**：`check-governance --fail-on-issues`（**非** check-release 内的 gate 输出） | exit 1，**20 issue(s)**（`2026-09-16` 本次实测；**口径订正**：本行原载 **16**（发布期）、R1 复审时点 **17** ⇒ **状态已漂移，按现值订正并保留三时点**）。构成实测：Check **18c/18d/18e/18f/18g/18i 各 1 条** `REL-007: missing execution packet`、Check **30** FAIL 1（closure violation）、Check **37** FAIL 1（`[G-s2]`，见 F-01）、Check **25** WARN 1（3 untracked）、Check **29** WARN 1（M5.4b）、Check **35** WARN 1、Check **36** WARN（RISK-002/RISK-003 引 `REL-007` 未完成）、Check **39** WARN（6 条 R1 evidence）。**如实标注**：工具 issue 计数为**聚合口径**，与逐条 WARN/FAIL 明细之和不一一对应，本行**不强行配平** | ⚠️ `.governance/**` 属写边界外 ⇒ **升级 Coordinator**（`execution-packet --write`、Check 37 已授权披露、RISK 履历）；**不含任何发布工件缺陷** |
| H3 | **插件根 cwd 读数**（check-release 内 `governance health` 的 88 问题数） | **88 issue(s)** = **插件仓**治理读数 | **归因订正（原误记为「口径差异」）**：真因 = **U7**（四门禁以 `cwd=str(ROOT)` 运行 ⇒ 插件自检），**非**宿主计数差异 ⇒ 已并入 §H.1 U7；**不得**与 H2 的宿主读数混列 |

> **宿主侧 `release docs` 需求已满足 ≠ 该门禁转绿**（**不得混淆**）：本版已在宿主仓**写入**三件正典文档
> （`docs/release/{release-checklist,feature-flags,rollback-plan}-0.5.3.md`，与 v0.5.2 三件形态一致、由 Coordinator
> 2026-09-16 扩权授权），但如上 **U6** 所示该子门禁读的是**插件仓** `docs/release/` ⇒ **其 FAIL 读数在任何情况下都不会
> 因宿主侧补文档而改变**。二者分别记录：宿主侧需求 = **已满足**；门禁读数 = **仍 FAIL（上游）**。

### H.3 宿主侧可自证的替代判据集合（**不构成 U1/U5/U6/U7 的替代 PASS**）

> 承 REL-006 `release-checklist-0.5.2.md` §G 先例：门禁不可用期间的过渡判据，**仅用于可复查性**。

| # | 替代判据 | 实测 |
| --- | --- | --- |
| ① | `node --check` 全清单 0 失败 | 23 文件 / 0 失败 |
| ② | `validate-preset` PASSED | schema-face PASS，29/29，exit 0 |
| ③ | `smoke` 零劣化 | 302 passed / 0 failed（基线 302） |
| ④ | **版本三方一致** | `CHANGELOG` 段头 `## [0.5.3] - 2026-09-15` ≡ `package.json` `0.5.3` ≡ tag `v0.5.3` |
| ⑤ | **CHANGELOG 分层机检** | `[0.5.3]` 段 9 条顶层条目 ∧ 零 `COMPAT-*`；`[Unreleased]` 15 条顶层条目**全为** `COMPAT-*` |
| ⑥ | 发布工件齐备 | 三件正典（`docs/release/*-0.5.3.md`）+ 演练证据（`docs/release/evidence/rel007-drill-20260915/`）在仓 |
| ⑦ | 回滚能力已实测 | 隔离往返 PASS + 回滚残余 0 + 真实 `$DSH_HOME` 零写入 |

> **诚实声明**：`stage-release` SKILL 退出条件含「候选态 `check-release` PASS」与「declarative manifest 闭环」——本次**均未满足**（U1~U7 工具缺陷，非本版交付缺陷）。本清单**不主张**该两条通过：状态维持 **`FAILED — 25 issue(s)`（订正时点；见 §G 三时点口径）** 与 **`BLOCKED（崩溃）`**，处置归 Coordinator（RISK/SYSGAP 登记）。
> 其中 **`gate sequence for release` 的 `[G-s2]`（tag 已存在而 G6/G7 pending）= 发布阻断级**（F-01，P1）：其处置为 **push 前由用户显式授权并在 `decision-log` 留痕**（Coordinator 执行），**不得记为 PASS**。
