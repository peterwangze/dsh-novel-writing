# 会话快照 — 2026-09-11（BUG-006 dsh 0.1.5-rc.1 接入兼容修复 + 用户环境全卸载处置）

- **session_id**: 20260911-bug006-dsh015-install-adapt
- **session_date**: 2026-09-11
- **agent**: DeepSeek Harness Coordinator (software-project-governance)

## 当前状态
- **current_stage**: 6/11 development（G5 passed-with-conditions，DOC-001 跟踪）
- **trigger_mode**: always-on / **permission_mode**: maximum-autonomy
- **项目总览**: 72 任务 / 68 已完成 / 0 阻塞 / 风险 2（RISK-002、RISK-003）
- **版本**: v0.5.1 已发布（2026-09-07）；BUG-006 修复入 CHANGELOG [Unreleased]（归属 v0.5.2，发布时机待 Release Gate 用户确认）

## 本轮完成（增量）
- **BUG-006 P0**（EVD-080/081，REVIEW-BUG-006-R1/R2）：dsh 0.1.5-rc.1 升级后插件无法接入——根因 = profile 机制重构（per-profile 目录 + package.json dependencies/bundles 注册替代 junction+patch 行；升级模板重建重置旧注册）。**本插件 v0.5.1 代码零改动全兼容**（3181 隔离实例全链路实证：overview HTTP 200/客户端 bundle/侧栏/控制台/分栏 38 章）。产品侧修复：install.ps1/install.sh 版本自适应双通道（新布局 profile 私有 node_modules + 幂等注册 dependencies+bundles + patch 行兜底；旧布局整树 diff 零差异）+ README/CHANGELOG；审查链 R1 NEEDS_CHANGE（无 dsh 键分支两层结构缺陷）→ 返工 → R2 APPROVED_WITH_NOTES 0 阻断；回归门禁 node --check/validate-preset/smoke 203-0 全绿。
- **用户环境处置**（用户决策 AskUserQuestion）：全部插件卸载（6 个 junction：novel-writing/reasoning-level/router/@peterwangze gov/@zcode gov——rmdir 仅删链接，目标仓库无损）；回滚 Coordinator 诊断期写入的 web profile 注册；settings.yaml default 预设 governance→standard（备份 settings.yaml.bak-20260911-pre-cleanup）；探针环境全清（3181 实例/Edge 9223/novel-test profile/临时脚本）。
- **顺带发现**：dsh plugin add 在 Windows shell:true 转发下报「'dsh' 不是内部或外部命令」（上游 bug；等价替代 = profile 目录手动 pnpm add + bundles 追加）——SYSGAP-001 家族候选；用户另两插件掉线属 dsh 升级同因（junction 无注册），已按用户决策一并清理。

## 遗留任务
| 任务 ID | 描述 | 优先级 |
|---------|-------------|--------|
| 用户侧安装 | 用户自行重装 dsh-novel-writing：推荐 `cd C:\Users\peter\.dsh\profiles\web && pnpm add "file:D:/AI/agent/deepseek/harness/writing-workflow"`（复制形态）或跑修好的 install.ps1（junction 开发形态）后 `npx @deepseek-ai/dsh web` 验证 | 用户侧 |
| BUG-006 实机验收 | 用户安装后验证：侧栏「📖 小说管理工作台」入口 + 控制台书目 + 分栏打开（隔离环境已全链路实证，实机口径一致） | 用户侧 |
| v0.5.2 发布 | BUG-006 承载版本（CHANGELOG [Unreleased] 已入账；发布时机 Release Gate 用户确认） | P1 待定 |
| BUG-006 审查 P2 遗留 | P2-2 格式归一副作用 / P2-3 升级残留不清理 / P2-4 三套注册实现收敛（PS 通道优先 node -e）——留档发布卫生批次 | P2 |
| Git Bash ln -s 深拷贝 | Developer 备注：Git Bash 无原生 symlink 权限时 ln -s 目录为静默深拷贝，提示语与实际形态不符（平台固有）——可另立 UX 任务 | P2 |
| BUG-005 评审遗留小修批次 | F1 BindDialog:2350 + F2 SplitWorkspace:3639 + F3 注释——并入 UX-054 | P2 |
| CLEAN-004 / UX-054 / CLEAN-003 / DOC-001 / REL-002 / SYSGAP-001 | 既有 P2 | P2 |
| 治理插件升级残留 | plan-tracker 工作流版本 0.75.0 → 0.78.1 bootstrap 自升级（可补做；本机 verify_workflow.py/review-record CLI 不可达已两次手工代录） | P2 |

## 待确认决策
- v0.5.2 发布时机（BUG-006 承载；用户实机安装验收后定）。

## 用户偏好设置（延续）
- DEC-021 主题无关 / 视觉工作方法论 / 兼容红线（零宿主改动）/ 文案零改动（DEC-022 白名单除外）
- P-09 逐条勾稽；实机验收前必须有隔离环境行为证据（本条 BUG-006 已履行——隔离实例全链路后用户实机装）
- 环境=用户自主管理：插件安装/卸载由用户决策执行（本轮 AskUserQuestion 确认）

## 环境备注
- dsh 0.1.5-rc.1（npx 缓存）；用户 ~/.dsh 现为干净状态（无插件注册/junction；settings.yaml default=standard）。
- 修好的安装入口：仓库 install.ps1/install.sh（版本自适应）或 profile 目录手动 pnpm add。
- npm 缓存 dsh 0.1.5-rc.1 的依赖树含全部本插件 peer（cordis 4.0.2/dsh-home-paths/dsh-tools 0.1.5-rc.2 等）。
- git hooks 本会话可跑；commit message 写 message 文件用 UTF8Encoding($false)。
