# 会话快照 — 2026-08-28（UX-019~022 收尾轮：书名校准 + 拖宽条还原 + 术语定案 + 滚动隔离）

- **session_id**: 20260828-ux019-020
- **session_date**: 2026-08-28
- **agent**: DeepSeek Harness Coordinator (software-project-governance v0.75.0)
- **工作流版本**: 0.75.0（plan-tracker 声明值；本机钩子已自升级至 0.78.0——其新增检查已甄别：可修项已修，其余属 DEC-007/RISK-002 记录的跨根误报家族）

## 当前状态
- **current_stage**: 6/11 development（开发实现）
- **current_gate**: G5 (passed-with-conditions，条件项 DOC-001 跟踪)
- **trigger_mode**: always-on / **permission_mode**: maximum-autonomy
- **项目总览**: 38 任务 / 33 已完成 / 0 阻塞 / 关键风险 2（RISK-002、RISK-003）
- **版本**: v0.3.0（发布卫生线，进行中）+ v0.4.0（工作台重构线，进行中——UX-011~022 代码完成；UX-018 用户实机确认修复生效；UX-019/020/021/022 本轮交付待实机复验）

## 本轮完成（增量）
- **UX-019 收尾三改 + UX-020 用户修正**（EVD-035）：
  - ① v4 诊断徽标净除（CLIENT_TAG/.nv-tag 双挂载点/样式全撤；smoke 负断言）
  - ② 章节行仅「第N章 · 名称」（去字数；空名称回退第N章+标记；ellipsis 沿用）
  - ③ 章节栏直排滚动（.nv-chlist overflow:auto —— UX-015③ 原有即满足）
  - **UX-020（用户两问「章节标题栏单独拖动」「宽度调整边框怎么删了」）**：上轮误删 .nv-chdiv，首版恢复又误做再设计（6px+1px 线）→ 用户反馈「误删了，还乱修改」→ **统一还原 UX-015③ 原始样式**（4px 实底 border-l2 + radius 2px + hover accent；常量/ref/注释全部回退）；git diff HEAD 逐字节核对：lib/client.js 与 HEAD 差异仅剩 UX-019 两合法变更
  - **章节名校准**：novel-001 ch-004/005/018 首行带 BOM + ch-018 冒号变体 → chapterNameOf 剥 BOM + 前缀正则扩（章/回/全角冒号/全角空格；无标题/不匹配→''，禁回退正文行）
  - 验证：node --check ×3 通过；validate-preset 29/29；smoke **129/129**（128→129）；real novel-001 38 章直测 004→质检员 7 号 / 005→考勤，还是判决 / 010→第七号放映厅 / 018→老福宾馆，空名=0，只读零写；清理临时文件 .tmp-check-name.mjs / .tmp-ux015-client.patch
- **UX-021 创作台双批注（EVD-036）**：①章节行去「·」装饰圆点（行=「第N章 名称」）；②三条可拖分隔线（vdiv/chdiv/chatdiv）默认透明、悬停显 border-l2、拖动 :active accent；③章节列拖宽单独生效；④**章节名异常根因取证**：novel-001 38 章只读核对=13 章 BOM（001-012/018）+24 章冒号变体（014+）→ 旧宿主模拟=12 空名+24「：」前缀，与截图逐行吻合——修复在 ba38681 宿主代码（剥 BOM+变体正则），**重启 DSH 生效**；smoke 130/130
- **UX-022 术语定案 + 滚动隔离（EVD-037）**：用户红框两张定案——「分割条」（三条可拖分隔线）=拖了改布局→**常驻可见**（撤 UX-021 ② 误透明化）；「拖动条」（滚动条）=拖了滚内容→**默认隐藏**（webkit track/thumb 透明 + 容器 hover/thumb hover 显）；**滚动隔离**：探针取证 .nv-chlist 高 1587px（章节页签包装层 display:block 破坏高度链）→ 外层页签容器整体滚动带正文（滑章节名→正文上滑）；修复=包装层 height:100%+overflow:hidden + 正文列/左窗/页签外层独立 overflow:auto（.nv-scroll）+ overscroll-behavior:contain；CDP 真实滚轮实测：列表 st 0→618、正文 0 不变；smoke 131/131；**用户约束入册：全部改动限插件自身元素，零宿主选择器依赖/零宿主源码改动**
- **UX-023 补充（EVD-038）**：正文阅读区 `renderContent` 容器（maxHeight 560 + overflow auto）与编辑 textarea 纳入 `.nv-scroll`——共 5 个滚动容器全部默认隐藏+悬停显示（用户实测「两个滚动条只有一个能隐藏/滚动时不自动出现」的根因）；smoke 断言修正（`.className:` 多圆点假失败→逐段插桩定位）；**UX-024 待用户实机复验**（三分割线常驻/滑章节名不带正文/滚动条滚动中显现、停止后自动隐藏）
- **UX-024（EVD-039/040）**：滚动条行为定案——撤悬停常驻规则，改滚动事件驱动 `.nv-scl`（scroll 捕获监听 + **1.5s** 空闲撤除〔用户调长〕）；CDP 实测四态（前隐藏/中显现/停后隐藏/再滚再显）；smoke 131/131；零宿主依赖
- **UX-025（EVD-041）**：界面优化——三分隔线 4px 实底→1px 细线（4px 抓握区保留/hover accent）+ 章节列浅底侧栏感 + 章节行/页签 hover 过渡统一（参照 VS Code/Linear 成熟惯例；控制台保持既有成熟形态）；computed 实测+目检通过；smoke 131/131
- **UX-026（EVD-042）**：区域分割线提清晰——标题栏底边/左窗右缘/外框 border-l1→border-l2（用户红框指认「你能看清吗」——上轮"其他分割线不明显"遗漏认领）；与 1px 细拖线同层级；smoke 131/131
- **git 状态**：HEAD=524ae72（UX-021，已推送 origin/main）；本轮 UX-022 待提交推送

## 遗留任务
| 任务 ID | 描述 | 完成百分比 | 阻塞原因 | 优先级 |
|---------|-------------|-----------|------------|----------|
| CLEAN-004 | 实机浏览器验证清单（UX-006~020 收尾轮）：控制台全链路 + 分栏（分隔线拖拽/宽度记忆/⇄/Esc/脏稿守卫）+ 章节列拖宽条恢复外观 + 章节名实际显示（**需重启 DSH 后 004/005/018 正确显示**——BOM/冒号变体为宿主代码）+ 降级 + 与 dsh-worktable 互斥 | 0% | 需 GUI 重启 | P2 |
| CLEAN-003 | createdId 与 workspaceId 成对存储（评审备注；WorkspaceDialog 仍复用，适用性保持） | 0% | — | P2 |
| DOC-001 | G5 条件关闭：设计文档补强（非功能对应表 + 接口契约 + Roadmap 同步——含 UX-006~020 入口演进） | 0% | — | P2 |
| REL-002 | 发布一致性自检（tag↔CHANGELOG↔路线图，含 v0.3.0/v0.4.0 未发布段） | 0% | — | P2 |
| SYSGAP-001 | 向插件上游报告 check-governance 跨根误报（RISK-002） | 0% | — | P2 |
| BUG-003（候选） | CI 恒等 mock 无 schema 校验（latestAiPath enum 回归仅本机真包拦截）；未正式入账 | 0% | — | P3 候选 |
| BUG-004（候选） | install.ps1 无显式 exit 0 + 步骤4文案恒报已同步；未正式入账 | 0% | — | P3 候选 |

## 待确认决策
| 决策 ID | 标题 | 上下文 | 截止日期 |
|---------|-------|---------|----------|
| — | ✅ 卡片「▶ 打开」=切会话+自动进分栏（已确认 2026-08-28） | DEC-015⑤ 实现与用户确认一致，无需改动 | 已确认 |
| — | v0.4.0 发布时点 | 待 CLEAN-004 实机验证后定 | — |

## 活跃风险
| 风险 ID | 描述 | 升级截止日期 | 负责人 |
|---------|-------------|---------------------|-------|
| RISK-002 | check-governance 跨根误报（Check 28c/18c/18d，root_divergence 兼容性） | 未定（SYSGAP-001 上游反馈） | Coordinator |
| RISK-003 | UX-006 挤法布局依赖宿主 DOM 约定（[data-phase]/children[1]/margin），DSH web 升级可能失效；已实现降级（不动布局+提示+抽屉仍可切会话） | CLEAN-004 实机验证后复核 | Coordinator |

## 下次会话优先级
1. **用户重启 DSH 后实机复验**（CLEAN-004——章节名 004/005/018 应显示「质检员 7 号/考勤，还是判决/老福宾馆」，拖宽条 4px 原样 + 拖拽持久化；异常则修复）
2. DOC-001：G5 条件关闭（含 DESIGN Roadmap 同步 UX-006~020 演进）
3. REL-002：发布一致性自检（v0.3.0 按原范围收尾发布；v0.4.0 待实机验证后发布）
4. SYSGAP-001：向插件上游反馈 RISK-002

## 用户偏好设置
- profile: standard / trigger_mode: always-on / permission_mode: maximum-autonomy
- 产品立场：插件 UI 居于外围（不喧宾夺主）；预设作为附属组件零感知；原则已入册为强制底线
- 设计口径：工作台走侧栏分栏模式（挤法），素材只用宿主设计令牌/emoji/CSS，不引入外部素材与图标库；**用户对「恢复原样」零容忍再设计——恢复请求=逐字节还原，不做创意性改动**；**兼容性红线（用户 2026-08-28 明示）：所有修改不得修改 DSH 源码，只能作为独立插件逻辑——不影响宿主、不被宿主升级导致兼容性问题（禁宿主选择器依赖）**

## 环境备注
- git 命令需 `-c safe.directory=D:/AI/agent/deepseek/harness/writing-workflow`
- **本机 `pwsh` 实为 Windows PowerShell 5.1.26100（无 pwsh 7）**——读 UTF-8 文件用 read 工具（PS 5.1 Get-Content 无 -Encoding UTF8 时乱码）
- 本项目与 DSH 为 junction 安装连接（INST-001，EVD-017）：**lib/client.js 改动刷新即生效（per-request no-cache）；lib/index.js 宿主改动需重启 DSH 生效**
- 调研克隆在 %TEMP%\dsh-worktable-research（本会话有效；重启后如需可重新克隆）
- 参考项目共存：dsh-worktable 与本插件经 dsh:split-claim 互斥协议兼容（同一时刻仅一个分栏工作区）
- 远端推送：origin/main=524ae72（UX-021）；本轮 UX-022 提交后需推送
