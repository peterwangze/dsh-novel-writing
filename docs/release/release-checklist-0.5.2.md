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
| 4 | 已知问题已列出 | 有说明与 workaround | ✅ | 发布记录 §7（R1~R7）；本版主残余 = RISK-004（push 未执行） |

**分层机检（程序化）**：`[0.5.2]` 段（843 字符）`contains BUG-006: True` ∧ `contains COMPAT-: False`；`[Unreleased]` 段 `COMPAT-` 70 次 ∧ `contains BUG-006: False` ⇒ 满足「v0.5.2 不含 COMPAT-* 条目（属 v0.6.0 线）」硬门槛。

## C. 回滚方案（步骤三）

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 回滚方案已编写 | 具体步骤（非泛化描述） | ✅ | `docs/release/rollback-plan-0.5.2.md`（A/B/C 三路径，命令级） |
| 2 | 回滚方案已验证 | 测试环境实际执行过 | ⚠️ **未执行**（如实标注） | 回滚对象为本地 tag / 安装版本（非运行态系统）；步骤为确定性 git/安装操作。**不主张已验证** |
| 3 | 数据兼容性 | 回滚后数据兼容 | ✅（不涉及） | 本版无 schema/数据迁移；`settings` ns `novel-writing` 字段未变 |
| 4 | 回滚影响范围已评估 | 不造成额外损失 | ✅ | 三路径影响面见回滚方案 §3 |

## D. 发布后验证计划（步骤四）

| # | 检查项 | 通过标准 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 核心功能验证清单 | 列出发布后需验证项 | ✅ | 三件套（§G）+ 用户侧实机使用（BUG-006 安装通道证据来自其交付内**隔离实例**实测，本版不新增安装验证） |
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

> **诚实声明**：`stage-release` SKILL 退出条件含「候选态 `check-release` PASS」——本次**未满足**（工具缺陷，非本版交付缺陷）；本清单不主张该条通过。
