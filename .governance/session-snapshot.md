# 会话快照 — 2026-08-23（INST-001 + BUG-001 + BUG-002 三连闭环轮；含 UX-005 实机验证首击）

- **session_id**: 20260823-inst
- **session_date**: 2026-08-23
- **agent**: DeepSeek Harness Coordinator (software-project-governance v0.75.0)

## 当前状态
- **current_stage**: 6/11 development（开发实现）
- **current_gate**: G5 (passed-with-conditions，条件项 DOC-001 跟踪)
- **trigger_mode**: always-on / **permission_mode**: maximum-autonomy
- **项目总览**: 20 任务 / 15 已完成 / 0 阻塞 / 关键风险 1（RISK-002）

## 本轮完成（增量）
- **INST-001**（EVD-017）：本机 DSH 全新安装 dsh-novel-writing——junction `C:\Users\peter\.dsh\profiles\node_modules\dsh-novel-writing → 本仓库` + 依赖链接（peerDeps 5/5 可达）+ cordis.patch.yml insert 行 + 预设同步（29 SKILL/16 agents，DSH roster 已感知：.dsh-bundle-version 标记出现）+ settings.yaml 默认节；五项落盘逐一验证、git 工作区零污染
- **BUG-001**（EVD-018，DEC-012 用户确认纳入 v0.3.0）：install.ps1 补 UTF-8 BOM（除 3 字节外逐字节不变，SHA-1 全等核验）+ CHANGELOG [0.3.0] 修复条目；Developer（子代理 61af2a22）+ Code Reviewer 独立审查 APPROVED 7/7；四项验证全过（PS5.1 解析 errors=0 含修复前 errors=4 复现对照 / 幂等安装原故障通道恢复 / 在线通道 TrimStart 安全 / npm pack 原样打包）
- **BUG-002**（EVD-019）：UX-005 实机验证发现的阻断缺陷修复——lib/tools.js 补 `inject=['tools']`（L22）+ 第二个潜伏阻断清除（L148 latestAiPath enum 去 null，真 dsh-tools defineTool 拒绝）+ smoke 挂载契约 7 断言（60→67 项，红 62/5→绿 67/0，本地真包+CI mock 双路径）；Developer（b6244f50）+ Code Reviewer 独立审查 APPROVED-WITH-NOTES（N1 CI 恒等 mock 无 schema 校验、N2 注释措辞——候选后续项）；审核期间子代理通道 3 次故障后第 4 次成功（EVD-013 同型）

## 遗留任务
| 任务 ID | 描述 | 完成百分比 | 阻塞原因 | 优先级 |
|---------|-------------|-----------|------------|----------|
| CLEAN-002 | ②shell.overlay 面板实机浏览器验证——**修复已就绪（BUG-002 覆盖挂载阻断），待用户重启 DSH 后复验**（预设挂载 + 11 工具 + 统一入口全链路 + 面板清单，含 UX-003 工作区行） | 90% | 需 GUI 重启 | P2 |
| CLEAN-003 | createdId 与 workspaceId 成对存储（评审备注；可并入复验异常修复轮） | 0% | — | P2 |
| BUG-003（候选） | BUG-002 评审 N1：CI 的 dsh-tools 为恒等替身（defineTool=(def)=>def，ci.yml L86-88），schema 校验（enum 类）在 CI 不执行——建议 latestAiPath enum 抽断言常量或 CI mock 加最小校验；N2：lib/tools.js L21 注释措辞收敛——低优先，未正式入账 | 0% | — | P3 候选 |
| BUG-004（候选） | BUG-001 评审非阻断备注：install.ps1 无显式 exit 0（$LASTEXITCODE 残留 robocopy 码，调用方按码判成败会误判）+ 步骤4文案恒报「已同步」——低优先卫生项，未正式入账 | 0% | — | P3 候选 |
| DOC-001 | G5 条件关闭：设计文档补强（非功能对应表 + 接口契约 + Roadmap 同步 + 入口演进更新 DESIGN） | 0% | — | P2 |
| REL-002 | 发布一致性自检（tag↔CHANGELOG↔路线图，含 v0.3.0 未发布段） | 0% | — | P2 |
| SYSGAP-001 | 向插件上游报告 check-governance 跨根误报（RISK-002） | 0% | — | P2 |

## 待确认决策
| 决策 ID | 标题 | 上下文 | 截止日期 |
|-------------|-------|---------|----------|
| — | （无） | BUG-001/BUG-002 均已完成版本归属（DEC-012 确认 v0.3.0；BUG-002 为 UX-005 验证闭环阻断、v0.3.0 范围） | — |

## 活跃风险
| 风险 ID | 描述 | 升级截止日期 | 负责人 |
|---------|-------------|---------------------|-------|
| RISK-002 | check-governance 跨根误报（Check 28c/18c/18d，root_divergence 兼容性） | 未定（SYSGAP-001 上游反馈） | Coordinator |
| RISK-003（实时性备注） | 子代理通道反复故障（本会话 BUG-002 审查期间 3 连败 + EVD-013 先例）——影响评审/开发 spawn 可靠性 | 未定 | Coordinator |

## 下次会话优先级
1. **用户重启 DSH 后实机复验**（BUG-002 修复验证 + 统一入口全链路 + CLEAN-002② 面板清单；异常则修复 → CLEAN-003）——用户已确认此为下一优先级
2. DOC-001：G5 条件关闭（含 DESIGN Roadmap 同步 UX 系列演进）
3. REL-002：发布一致性自检
4. SYSGAP-001：向插件上游反馈 RISK-002

## 用户偏好设置
- profile: standard / trigger_mode: always-on / permission_mode: maximum-autonomy
- 产品立场：插件 UI 居于外围（不喧宾夺主）；预设作为附属组件零感知；原则已入册为强制底线

## 环境备注
- git 命令需 `-c safe.directory=D:/AI/agent/deepseek/harness/writing-workflow`
- **本机 `pwsh` 实为 Windows PowerShell 5.1.26100（无 pwsh 7）**——UTF-8 无 BOM 的 .ps1 离线执行会乱码失败（BUG-001 根因）；会话内 PowerShell 命令避免依赖 PS7 特性
- 本项目与 DSH 为 junction 安装连接（INST-001，EVD-017）：本仓库代码改动**重启 DSH 后生效**（工作台/侧栏入口/HUD/预设工具行）
- junction 前置态为全新（无旧 link: 残留）；安装后 DSH roster 扫描已在预设目录写入 .dsh-bundle-version 标记
- 预设工具行解析路径：`.agent-presets\novel-writing\agent.cordis.yml` 的 tool-novel 行 → `dsh-novel-writing/tools` → node_modules junction → 本仓库 lib/tools.js（修复无需重装/重同步预设）
- 用户实机状态：UX-005 统一入口已建会话成功（置入最近一次会话），但预设挂载失败（BUG-002 已修）；重启后该会话可手动选预设或重新走统一入口
