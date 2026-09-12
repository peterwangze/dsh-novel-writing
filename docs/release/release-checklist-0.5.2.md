# 发布检查清单 — v0.5.2（2026-09-12）

- **关联任务**：REL-006（发布 v0.5.2 —— BUG-006 安装通道适配承载）
- **发布记录（完整叙述/归因/原始报文）**：`docs/review/REL-006-release-notes.md`
- **发布类型**：本地发布（发布提交 + 本地 annotated tag，**未 push** —— RISK-004）
- **发布提交**：`e1f25df84ead0a4d07c655f9afcd379a8a96a2a8`；**tag**：`v0.5.2`（对象 `7ca99d6d…` → peel `e1f25df8…`）
- **结论**：**有条件通过（Go —— 本地发布）**；条件 = push 待用户授权；1 项门禁工具不可用已升级（见 §G）。

---

## A. 发布准备（步骤一）

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 版本号已定义（semver） | `major.minor.patch` | ✅ `0.5.2` | `package.json` L4 = `"0.5.2"`（worktree + `git show HEAD:package.json` 双读一致） |
| 2 | 变更范围已列出 | commit/issue 清单 | ✅ | BUG-006 = `471ed00`（修复）+ `3442f39`（治理收尾）；两提交 `merge-base --is-ancestor <远端 main>` 均 exit 0 |
| 3 | 变更类型已标注 | 新功能/修复/优化/破坏性 | ✅ **修复**（安装通道适配；PATCH bump） | 发布记录 §2 |
| 4 | 发布时间窗口已确定 | 明确日期 | ✅ 2026-09-12（用户定案「先 v0.5.2，v0.6.0 后续再定」） | 任务书 + 发布记录头 |

## B. 变更日志（步骤二）

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | CHANGELOG 已更新 | 覆盖本次全部变更，与 commit 对照一致 | ✅ | `## [0.5.2] - 2026-09-12` + `### 修复` + BUG-006 条目（自 `[Unreleased]` **逐字移动**：diff 仅 4 行插入，BUG-006 条目行无 ± 变化） |
| 2 | 破坏性变更已高亮 | 不兼容变更有说明与迁移指引 | ✅ **无 breaking change** | BUG-006 内已证「旧布局行为完全不变」；条目内含双通道说明 |
| 3 | 依赖变更已记录 | 新/升级依赖有版本与原因 | ✅ **无依赖变更** | `package.json` dependencies / peerDependencies 未改 |
| 4 | 已知问题已列出 | 有说明与 workaround | ✅ | 发布记录 §7（R1~R8）；本版主残余 = RISK-004（push 未执行） |

**分层机检（程序化）**：`[0.5.2]` 段（843 字符）`contains BUG-006: True` ∧ `contains COMPAT-: False`；`[Unreleased]` 段 `COMPAT-` 70 次 ∧ `contains BUG-006: False` ⇒ 满足「v0.5.2 不含 COMPAT-* 条目（属 v0.6.0 线）」硬门槛。

## C. 回滚方案（步骤三）

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 回滚方案已编写 | 具体步骤（非泛化描述） | ✅ | `docs/release/rollback-plan-0.5.2.md`（A/B/C 三路径，命令级） |
| 2 | 回滚方案已验证 | 测试环境实际执行过 | ✅ **已执行（隔离环境）** | 2026-09-12 于隔离根 `%TEMP%\rel006-drill-20260912` 执行 `rollback-plan-0.5.2.md` §3 **路径 A** 往返（隔离等价物：`git archive` 导出 v0.5.1/v0.5.2 树 → 就地换树 → 重跑 `install.ps1`，**不切换当前工作树**）。**隔离环境安装冒烟（环境变量重定向至临时目录）通过**：A1 v0.5.1 → A3 v0.5.2 → A5 回滚 v0.5.1，逐 leg exit 0、有效版本 0.5.1 / 0.5.2 / 0.5.1；同版本重装幂等 diff=0（A1→A2、A3→A4）；回滚 leg A4→A5 diff=0；旧布局 B1→B2 diff=0。**已知残留（如实记录）**：往返闭环 A2→A5 diff=4——v0.5.2 新增的新布局注册（`profiles/web/node_modules` 链接 + `profiles/web/package.json` 280→408 B）回滚到 v0.5.1 后**不被清理**（v0.5.1 脚本无新布局感知），有效版本仍正确 ⇒ 回滚 = 版本回退、非 DSH_HOME 状态还原。逐命令原始记录见 `rollback-plan-0.5.2.md` §7 |
| 3 | 数据兼容性 | 回滚后数据兼容 | ✅（不涉及） | 本版无 schema/数据迁移；`settings` ns `novel-writing` 字段未变 |
| 4 | 回滚影响范围已评估 | 不造成额外损失 | ✅ | 三路径影响面见回滚方案 §3 |

## D. 发布后验证计划（步骤四）

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 核心功能验证清单 | 列出发布后需验证项 | ✅（口径已订正，F5） | 三件套（§G）+ 本版**唯一交付面 = 安装通道**的**被发布树**实测：**隔离环境安装冒烟（环境变量重定向至临时目录）通过**——隔离根 `%TEMP%\rel006-drill-20260912`，对 `git archive v0.5.2` 导出树执行安装/重装/回滚往返，有效版本正确 + 幂等 diff=0（证据 `rollback-plan-0.5.2.md` §7）。**订正说明**：本项原标 ✅ 但**证据面错位**（证据来自 BUG-006 交付内、早于发布树 ⇒ 证据对象 ≠ 被发布树）；现由本次对**被发布树**（隔离环境，非无限定语的「真实安装」）的实测替代 |
| 2 | 监控指标基线 | 发布前基线已记录 | N/A | 插件无生产监控面（如实标注，不伪造） |
| 3 | 告警规则就绪 | 相关告警已配置 | N/A | 同上；既有结构化告警面为 `[nv-compat]` 加载期告警（v0.6.0 线，不在本版范围） |
| 4 | 验证责任人 | 每项有负责人 | ✅ | 执行 = Release Agent；复核/收尾 = Coordinator（EVD-097）；后置审查 = Release Reviewer |

## E. 数据验证计划（步骤五）

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 核心指标基线 | 错误率/延迟/活跃度基线 | N/A（无量化用户指标面） | 替代判定见 #3 |
| 2 | A/B 测试方案 | 如适用 | N/A | 本版为安装脚本适配，无用户可见功能面 |
| 3 | 成功标准已量化 | 有方向与幅度 | ✅（替代判定） | 门禁不劣化：`node --check` 0 错 / `validate-preset` 29/29 / `smoke` **282 passed 0 failed**（基线 282/0） |
| 4 | 观察期已确定 | ≥30 min（hotfix）/ ≥24h（功能） | ✅ 替代口径 | 以「用户侧下一次安装/启动无异常」为观察面；本版无远端发布（未 push）⇒ 无生产观察窗 |
| 5 | 回滚触发条件已明确 | 指标触发条件 | ✅ | 回滚方案 §2（装载后主链路异常且定位到本版范围） |

## F. 发布决策（步骤六）

| 决策 | 结论 | 理由 |
| --- | --- | --- |
| 可以发布 / 有条件发布 / 暂缓 | **有条件发布（Go —— 本地）** | 范围分层正确 + 三件套全绿 + 版本三方一致；条件 = ①push 待用户授权（RISK-004，本机凭证缺 workflow scope）；②`check-release` 门禁不可用（§G）已升级裁定 |

## G. 门禁执行记录（真实输出，2026-09-12）

| 门禁 | 命令 | 实测 | 结论 |
| --- | --- | --- | --- |
| 语法 | `node --check` ×12 文件 | `NODE --CHECK SUMMARY: 12 files, 0 failures` | **PASS** |
| 预设 | `node test/validate-preset.mjs` | `PRESET VALIDATION PASSED`（29/29 ok；exit 0） | **PASS** |
| 冒烟 | `node test/smoke.mjs` | `SMOKE DONE: 282 passed, 0 failed`（exit 0） | **PASS（基线未劣化）** |
| 归档触发 | `python "<plugin>/infra/archive.py" migrate --auto --dry-run` | 跳过（已发布版本数解析 0<2；exit 0） | 不阻断（SYSGAP-001 家族边缘，无数据损失） |
| 发布就绪 | `python "<plugin>/infra/verify_workflow.py" check-release --version 0.5.2 --require-changelog --lineage-mode candidate` | **FAILED — 21 issue(s)**（exit 1） | **不可用（跨根期望源缺陷）** —— 见独立发现 #2；**不包装为 PASS**，已升级 Coordinator 裁定 |

> **诚实声明**：`stage-release` SKILL 退出条件含「候选态 `check-release` PASS」——本次**未满足**（工具缺陷，非本版交付缺陷）；本清单不主张该条通过。**状态维持 `FAILED — 21 issue(s)` / 门禁不可用，不得改写为 PASS**（F3 处置归 Coordinator：SYSGAP 登记 + RISK-002/RISK-005，不属本任务范围）。

> **替代判据集合（F3 修复建议②，本仓发布就绪的可复查替代口径；不替代该门禁的 PASS 结论，仅作为「门禁不可用」期间的过渡判据）**：
> ① `node --check` × 12 文件 **0 错**（§G 行 1）；② `node test/validate-preset.mjs` **PASSED**（29/29，exit 0）；③ `node test/smoke.mjs` **不劣化**（282 passed / 0 failed，与基线一致）；④ **版本三方一致**（`CHANGELOG` 段头 `[0.5.2]` ≡ `package.json` `0.5.2` ≡ tag 名 `v0.5.2`）；⑤ **CHANGELOG 分层机检**（`[0.5.2]` contains BUG-006 ∧ ¬COMPAT-；`[Unreleased]` COMPAT- 70 次 ∧ ¬BUG-006）；⑥ **发布工件齐备**（`docs/release/{release-checklist,feature-flags,rollback-plan}-0.5.2.md` + `docs/review/REL-006-release-notes.md` 四件在仓）。
> 上述 ①③⑤ 已于 2026-09-12 返工轮复跑实测（见 `release-notes` §4 与 §10）；⑥ 为文件存在性核对；④ 见 §B 分层机检行。**该集合不构成 `check-release` 的替代 PASS —— 该门禁仍记 `FAILED`。**
