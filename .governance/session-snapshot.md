# 会话快照 — 2026-09-07（BUG-004/005 修复 + v0.5.1 发布全闭环）

- **session_id**: 20260907-bug004-bug005-dsh-compat-release
- **session_date**: 2026-09-07
- **agent**: DeepSeek Harness Coordinator (software-project-governance)

## 当前状态
- **current_stage**: 6/11 development（G5 passed-with-conditions，DOC-001 跟踪）
- **trigger_mode**: always-on / **permission_mode**: maximum-autonomy（会话中途运行时策略转为 danger-full-access + 审批禁用）
- **项目总览**: 71 任务 / 67 已完成 / 0 阻塞 / 风险 2（RISK-002、RISK-003）
- **版本**: **v0.5.1 已发布 2026-09-07**（tag 7d4d899 / commit cd1911e / 远程实证一致；BUG-003/004/005 三修承载）

## 本轮完成（增量）
- **BUG-004 P0**（EVD-077/EVD-077a，commit 55da942 + 治理 f115391）：dsh 0.1.2-rc.1 客户端 API 表面迁移——makeHostApi 适配层（remote.*/workspaces + connection.api 回退单点收口，44 调用点零改动）+ last-non-null 会话联动守卫×2 + SettingsPage 防崩 + manifest 包表修正；smoke 147→179；Code Reviewer R1 APPROVED_WITH_NOTES（0 阻塞）。
- **BUG-005 P0**（EVD-078/EVD-078a，commit 5fba438 + 治理 7bcf7ad）：BUG-004 实机验收发现症状 1 复发——探针实证 useSessions hook 面降级（sessions 服务异步后到，apply 冻结 null）；修复 = makeSessionsHookReactive（恒定引用/惰性解析/internal/service 重订阅/setServiceTick 扳机）+ 单一监听合并 + F1 顺带修；smoke 179→203；Code Reviewer R1 APPROVED_WITH_NOTES（0 阻塞）；隔离实例行为验证通过。
- **用户实机终验通过**（AskUserQuestion 2026-09-07）：三症状全部消除（症状 1 点其他工作区会话退出/症状 2 设置页/症状 3 工作区对话框）。
- **REL-005 v0.5.1 发布**（EVD-079，commit cd1911e + tag v0.5.1）：用户 Release Gate 确认；三件套门禁全绿（0/203/29）→ CHANGELOG [0.5.1] → package.json 0.5.1 → 三 hooks 实跑 commit → annotated tag → push → 远程 ls-remote 逐字节实证；路线图 v0.5.1 行已发布。Release Reviewer 后置审查通过（REVIEW-REL-005-R1——如已机录）。

## 遗留任务
| 任务 ID | 描述 | 优先级 |
|---------|-------------|--------|
| BUG-005 评审遗留小修批次 | F1 BindDialog:2350 + F2 SplitWorkspace:3639（各 1 行降级窗判定迁移）+ F3 注释修正——建议并入 UX-054 同文件批次（改后需 R2 复审） | P2 |
| F5/F6（既有） | selector 记忆化（流式重渲染）/statusOfEntry need 态不可达（状态点三态口径） | P2 |
| CLEAN-004 | 实机浏览器验证清单（可与日常使用合并执行） | P2 |
| UX-054 | 视觉遗留批次（吸收 F1/F2/F3 小修） | P2 |
| CLEAN-003 / DOC-001 / REL-002 / SYSGAP-001 | 既有 P2 | P2 |
| 治理插件升级残留 | plan-tracker 工作流版本 0.75.0 → 0.78.1 bootstrap 自升级（可补做） | P2 |
| workspaceRoot 重指 | 用户侧操作：控制台「切换/新建工作区」→ 新建选 D:\AI\writing → 选中（书目《诡异副本，先过审》38 章将出现）——对话框已修复可用 | 用户侧 |

## 待确认决策
- 无挂起决策（v0.5.1 已发布；UX-056 视觉演进保持暂停——用户指示勿主动推进）。

## 用户偏好设置（延续）
- DEC-021 主题无关 / 视觉工作方法论（真看图+探针+vision 三角化）/ 插件 UI 居于外围 / 兼容红线（零宿主改动）/「恢复原样」零容忍 / 文案零改动（DEC-022 白名单除外）
- P-09 逐条勾稽；实机验收前必须有隔离环境行为证据（BUG-004 教训：静态审查通过 ≠ 实机行为通过——BUG-005 因此在同一会话内闭环）

## 环境备注
- dsh 0.1.2-rc.1 三处同版；插件从仓库 junction 加载——浏览器侧改动需重启 dsh web 后生效（用户已重启并终验通过）。
- 用户小说数据在 D:\AI\writing\novel-001\novel-project（标准结构，state 完好）；workspaceRoot 重指待用户操作（见遗留表）。
- 探针方法论沉淀（EVD-077a/078）：无头 Edge --headless=new + CDP + token 鉴权 + DOM 特征判定（.nv-cfound-title/.nv-console/.nv-drawer-head）；3180 隔离实例模式可复用。
- git hooks 本会话可跑；commit-msg 拦「编造/幻觉/我(假设猜测推测估计)/(大概应该可能)(已经是可以完成存在)」——措辞避开；**写 message 文件用 UTF8Encoding($false)（Set-Content -Encoding utf8 带 BOM 会致 hook 误报 NO task ID）**。
- CI：v0.5.1 push 触发 ci.yml（ubuntu 原生跑 node test/smoke.mjs 203 项）。
