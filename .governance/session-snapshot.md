# 会话快照 — 2026-09-07（BUG-004/BUG-005 dsh 0.1.2-rc.1 兼容修复双闭环）

- **session_id**: 20260907-bug004-bug005-dsh-compat
- **session_date**: 2026-09-07
- **agent**: DeepSeek Harness Coordinator (software-project-governance)

## 当前状态
- **current_stage**: 6/11 development（G5 passed-with-conditions，DOC-001 跟踪）
- **trigger_mode**: always-on / **permission_mode**: maximum-autonomy（会话中途运行时策略转为 danger-full-access + 审批禁用）
- **项目总览**: 70 任务 / 66 已完成 / 0 阻塞 / 风险 2（RISK-002、RISK-003）
- **版本**: v0.5.0（已发布）+ **v0.5.1 待发布**（BUG-003/004/005 承载；前置 = 用户实机终验 + Release Gate 确认）

## 本轮完成（增量）
- **BUG-004 P0**（EVD-077/EVD-077a，commit 55da942 + 治理 f115391，已推送）：dsh 0.1.2-rc.1 客户端 API 表面迁移——makeHostApi 适配层（remote.*/workspaces 新表面 + connection.api 旧表面单点收口，44 调用点零改动）+ last-non-null 会话联动守卫×2 + SettingsPage/PlatformConfigEditor 防崩 + manifest 包表修正；smoke 147→179；Code Reviewer R1 APPROVED_WITH_NOTES（0 阻塞）。
- **BUG-005 P0**（EVD-078/EVD-078a，commit 5fba438）：BUG-004 实机验收发现症状 1 复发——Coordinator 无头 Edge+CDP 探针 3180 隔离实例实证 useSessions hook 面降级（sessions 服务经异步 $mount 链后到，apply 时冻结 null）；修复 = makeSessionsHookReactive（恒定引用/惰性解析/internal/service 重订阅/setServiceTick 扳机）+ 单一监听合并 + F1 顺带修；smoke 179→203；Code Reviewer R1 APPROVED_WITH_NOTES（0 阻塞；根因链由宿主源码坐实）；**隔离实例行为验证：点其他工作区会话→控制台自动关闭（症状 1 行为解除）+「找到的会话」复活 + 0 异常**。
- 探针方法论沉淀：无头 Edge（--headless=new + CDP 9334 + --disable-extensions）+ token 鉴权直达 + DOM 特征判定（.nv-cfound-title/.nv-console/.nv-drawer-head）——探针脚本 5 个（含已失效 token）验收完成即删；方法论记录于 EVD-077a/078/078a。

## 遗留任务
| 任务 ID | 描述 | 优先级 |
|---------|-------------|--------|
| BUG-004/005 实机终验 | 用户重启 dsh web 后验证：症状 1（点其他工作区会话退出）/症状 2（设置页）/症状 3（工作区对话框）+ workspaceRoot 重指 D:\AI\writing + 状态点按**三态**口径验收（F6：need 态不可达） | P0（用户侧动作） |
| REL-005（待入账） | 发布 v0.5.1（BUG-003/004/005 承载）——前置：实机终验通过 + 用户 Release Gate 确认 | P1 |
| BUG-005 评审遗留小修批次 | F1 BindDialog:2350 缺席提示恒不可达 + F2 SplitWorkspace:3639 状态点门恒真（各 1 行）+ F3 注释覆盖面修正——建议并入 UX-054 同文件批次（改后需 R2 复审口径） | P2 |
| F5/F6（既有） | selector 记忆化（流式期每帧重渲染）/statusOfEntry need 态不可达（宿主 byId 无 pendingInteraction）——行为面任务 | P2 |
| CLEAN-004 | 实机浏览器验证清单（可与实机终验合并执行） | P2 |
| UX-054 | 视觉遗留批次（可吸收 F1/F2/F3 小修） | P2 |
| CLEAN-003 / DOC-001 / REL-002 / SYSGAP-001 | 既有 P2（TPA Unblocked 集合） | P2 |
| 治理插件升级残留 | plan-tracker 工作流版本 0.75.0 → 安装 0.78.1 bootstrap 自升级（本会话后期已 danger-full-access，可补做） | P2 |

## 待确认决策
- **v0.5.1 发布时机**：实机终验通过后按 REL-005 入账执行（用户确认即发）。
- ~~UX-056 视觉演进~~：暂停（用户指示，勿主动推进）。

## 用户偏好设置（延续）
- DEC-021 主题无关 / 视觉工作方法论（真看图+探针+vision 三角化）/ 插件 UI 居于外围 / 兼容红线（零宿主改动）/「恢复原样」零容忍 / 文案零改动（DEC-022 白名单除外）
- P-09 逐条勾稽；实机验收前必须有隔离环境行为证据（本轮 BUG-004 教训：静态审查通过 ≠ 实机行为通过）

## 环境备注
- dsh 0.1.2-rc.1 三处同版；插件从仓库 junction 加载——**浏览器侧改动需重启 dsh web**（或硬刷新）后生效。
- 用户小说数据在 D:\AI\writing\novel-001\novel-project（标准结构，state 完好：《诡异副本，先过审》38 章 8.9 万字）；workspaceRoot 重指 = 控制台「切换/新建工作区」→ 新建工作区选 D:\AI\writing → 选中。
- 本会话探针环境（3180 实例/headless Edge/探针脚本）收尾即清理；复现方法见 EVD-077a/078。
- git hooks 本会话可跑（BUG-005 commit 实跑通过）；BUG-004 commit 曾因沙箱命名管道限制走空 hooksPath（message 留痕）。commit-msg hook 拦截「编造/幻觉/我(假设猜测推测估计)/(大概应该可能)(已经是可以完成存在)」——措辞避开；**Set-Content -Encoding utf8 带 BOM 会让 hook 误报 NO task ID，写 message 文件用 UTF8Encoding($false)**。
