# 会话快照 — 2026-08-23（INST-001 安装轮）

- **session_id**: 20260823-inst
- **session_date**: 2026-08-23
- **agent**: DeepSeek Harness Coordinator (software-project-governance v0.75.0)

## 当前状态
- **current_stage**: 6/11 development（开发实现）
- **current_gate**: G5 (passed-with-conditions，条件项 DOC-001 跟踪)
- **trigger_mode**: always-on / **permission_mode**: maximum-autonomy
- **项目总览**: 19 任务 / 13 已完成 / 0 阻塞 / 关键风险 1（RISK-002）

## 本轮完成（增量）
- **INST-001**（EVD-017）：本机 DSH 全新安装 dsh-novel-writing——junction `C:\Users\peter\.dsh\profiles\node_modules\dsh-novel-writing → 本仓库` + 依赖链接（peerDeps 5/5 可达）+ cordis.patch.yml insert 行 + 预设同步（29 SKILL/16 agents，DSH roster 已感知：.dsh-bundle-version 标记出现）+ settings.yaml 默认节；五项落盘逐一验证、git 工作区零污染
- **BUG-001 入账**（新发现）：install.ps1 UTF-8 无 BOM 在 Windows PowerShell 5.1 离线执行通道解析失败（ParserError）；本轮经 %TEMP% BOM 副本执行原脚本绕过（仓库零改动）；在线 iex 通道不受影响；修复归属待用户确认

## 遗留任务
| 任务 ID | 描述 | 完成百分比 | 阻塞原因 | 优先级 |
|---------|-------------|-----------|------------|----------|
| BUG-001 | install.ps1 补 BOM（+双通道回归验证）；版本归属待确认（v0.3.0 范围变更需用户拍板） | 0% | — | P2 |
| CLEAN-002 | ②shell.overlay 面板实机浏览器验证——**环境前置已就绪（INST-001），待用户重启 DSH 后按清单执行**（含 UX-003 工作区行一并复验） | 90% | 需 GUI 重启 | P2 |
| CLEAN-003 | createdId 与 workspaceId 成对存储（评审备注） | 0% | — | P2 |
| DOC-001 | G5 条件关闭：设计文档补强（非功能对应表 + 接口契约 + Roadmap 同步 + 入口演进更新 DESIGN） | 0% | — | P2 |
| REL-002 | 发布一致性自检（tag↔CHANGELOG↔路线图，含 v0.3.0 未发布段） | 0% | — | P2 |
| SYSGAP-001 | 向插件上游报告 check-governance 跨根误报（RISK-002） | 0% | — | P2 |

## 待确认决策
| 决策 ID | 标题 | 上下文 | 截止日期 |
|-------------|-------|---------|----------|
| — | BUG-001 版本归属：纳入 v0.3.0（发布卫生相关）还是延后 v0.3.1 | 范围变更须经用户确认 | — |

## 活跃风险
| 风险 ID | 描述 | 升级截止日期 | 负责人 |
|---------|-------------|---------------------|-------|
| RISK-002 | check-governance 跨根误报（Check 28c/18c/18d，root_divergence 兼容性） | 未定（SYSGAP-001 上游反馈） | Coordinator |

## 下次会话优先级
1. **用户重启 DSH 后实机验证**（统一入口全链路 + CLEAN-002② 面板清单；异常则修复 → CLEAN-003）
2. BUG-001 归属确认后修复（install.ps1 补 BOM，Developer + Code Reviewer 流程）
3. DOC-001：G5 条件关闭（含 DESIGN Roadmap 同步 UX 系列演进）
4. REL-002：发布一致性自检
5. SYSGAP-001：向插件上游反馈 RISK-002

## 用户偏好设置
- profile: standard / trigger_mode: always-on / permission_mode: maximum-autonomy
- 产品立场：插件 UI 居于外围（不喧宾夺主）；预设作为附属组件零感知；原则已入册为强制底线

## 环境备注
- git 命令需 `-c safe.directory=D:/AI/agent/deepseek/harness/writing-workflow`
- **本机 `pwsh` 实为 Windows PowerShell 5.1.26100（无 pwsh 7）**——UTF-8 无 BOM 的 .ps1 离线执行会乱码失败（BUG-001 根因）；会话内 PowerShell 命令避免依赖 PS7 特性
- 本项目与 DSH 为 junction 安装连接（INST-001，EVD-017）：本仓库代码改动**重启 DSH 后生效**（工作台/侧栏入口/HUD）
- junction 前置态为全新（无旧 link: 残留）；安装后 DSH roster 扫描已在预设目录写入 .dsh-bundle-version 标记
