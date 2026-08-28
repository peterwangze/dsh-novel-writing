# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式；版本号语义化（0.x 阶段以次要版本承载功能批，补丁号承载修复）。

## [0.4.0] - Unreleased

### 工作台重构（UX-006，DEC-013 五项定案）
- **挤法分栏工作区 + 小说↔会话绑定（dsh-worktable 思路，DEC-013①–⑤）**：参照 dsh-worktable 的 `[data-phase]` 会话根探测 + margin 挤压实现**固定三栏可调布局**（`shell.overlay` id=novel-split，zIndex 900 低于对话框层）——左窗（工作区行 + 书目 + 文件树，可「«」折叠）｜竖分隔线｜中窗（章节/工作流/请求/数据/发布五页签，既有 Panel 复用+切页签草稿保活）｜右窗 = 官方对话窗本体（marginLeft/marginRight+marginTop 挤法贴右，**⇄ 可换边**），两条分隔线 pointer 拖拽调宽（左窗 160–420px、对话宽 240px–余量钳制），宽度与换边 localStorage 持久化（`dsh.novel.split.v1`={leftW,chatW,chatSide}）；ResizeObserver + body 级 MutationObserver(data-phase) 重锚定（过渡态等待、无会话才关）、让位观察器（viewArea margin 被外部改写即关）、`dsh:split-claim` 共享互斥协议（与 dsh-worktable 共存兼容）、Esc/✕/再次点击关闭（过 chapterDirty 脏稿守卫）；挤法探测失败降级为不动布局+明确提示（抽屉卡片仍可切会话）。**侧栏抽屉**（`sidebar.footer.action` id=novel-drawer，order 9）：分隔线 +「📖 小说工作台」标题（⚙ 工作区=UX-005 对话框入口 / ＋ 新建）+ 书目卡片（书名/阶段·章数·字数/**绑定状态点**：工作中=accent 蓝发光/待决=黄/完成=绿/失效=红/未绑定=空心，经 `ctx.sessions.list` ObservableSnapshot 订阅叶子字段零轮询镜像；会话服务缺席降级：状态点隐藏、打开/绑定禁用并提示）。**小说↔会话 1:1 绑定**：存宿主 settings ns novel-writing 新字段 `bindings`（`z.dict(z.string(),z.string())`，overview 附带下发，客户端读现值合并写入不整表覆盖）；绑定面板按 workspace.list 分组列会话（+「新建会话并绑定」：书目录为 cwd + 预设挂载 + 启动指令）；绑定会话失效（byId 无此 id）卡片标「会话失效」引导重绑（不静默清除）；抽屉 ＋ 新建全链 = novel-create（宿主响应补 `path` 字段——本次唯一宿主契约加法）→ `sessions.create({cwd})` → `agentPresets.select('novel-writing')` → 写绑定 → `sessions.open` → 开分栏 → 发启动指令。**退役**（DEC-013①）：conversation.view「小说」标签页、conversation.input.dock LaunchBar 兜底条、sidebar novel-hud 按钮 + novel-hud-panel 浮层、store 的 pendingLaunch/launchHint/hudOpen；指令发送全面改 `api.sessions.prompt({sessionId, mode:'queue', content:[{type:'text',text}]})`（launchMsg 文案沿用：新书「开始…《书名》（目录 id）」/旧书「继续…」）。**视觉全量宿主设计令牌**（DEC-013④）：单 `<style id="novel-writing-style">` 注入、类名前缀 `.nv-`，颜色/边框/背景全 `var(--dsw-alias-*, 兜底值)`（兜底对齐 dsh-worktable styles.ts 取值），图标 emoji、状态点纯 CSS，apply 返回可逆清理（引擎关闭+监听移除+style 移除），零新依赖。smoke 67 → **83 项**（新增宿主 bindings/path 3 项 + 客户端挂载契约 13 项：ModuleLoader 注册/无 DOM 降级求值/注册面恰 5 席/退役面负断言/render 可调用/可逆清理）。

- **工作台入口重构为全屏管理控制台（UX-007，DEC-015 修正版）**：侧栏「📖 小说工作台」区块 = **纯主入口**——标题行整体可点（开/关控制台，反选语义；**移除 🔍⚙＋ 按钮组**）、书目卡片点击 = 打开控制台并聚焦该书（空态改为虚线框「打开工作台界面创建第一本小说」）；新增 **工作台控制台**（shell.overlay id=nv-console，order 25，zIndex 950，覆盖内容区不遮侧栏）：几何 = findConversationRoot bounding rect，无会话根/失效降级 = 左侧取侧栏右缘（findSidebar 向上探测，280px 兜底）+ top/right/bottom=0；ResizeObserver + body MutationObserver(data-phase) 跟随重定位（会话切换不关闭、无会话保持降级定位）；与 novel-split 互斥（开控制台先关分栏——脏稿守卫；开分栏或他引擎 dsh:split-claim 关控制台）。内容：顶部栏（📖 标题/当前工作区名/「切换 · 新建工作区…」复用 WorkspaceDialog/✕/Esc）＋ 搜索行（12px 输入 + ✕ 清除；关键词同滤小说卡片（书名/目录 id）与会话快照标题/id →「找到的会话」行，点击 = 打开会话并关控制台）＋「＋ 新建小说」右侧 fixed 320px 悬浮表单（目录名必填/书名可选默认同目录名/「创建并开始」走 launcher 既有新建链：novel-create→sessions.create({cwd})→agentPresets.select→bindings 写→sessions.open→开分栏→sessions.prompt／「仅创建」/取消；busy 禁用、错误红字）＋ 小说卡片网格（grid minmax 260px 自适应列；玻璃拟态 bg fill-l1 半透明 + border l1 + radius 10 + hover border accent/提亮 + **状态光效**：need 黄 / done 绿整卡霓虹光效、busy 蓝光 + 流光扫过；卡内 📖 书名 14px/600 + 阶段徽标 12px + 状态行 `N章 · N字 · 发布✓/✗ · 变现✓/✗ · 信号N`（11px secondary）+ **绑定状态双圆**（○○ 空心未绑定 / ●● 实心已绑定；busy = accent 蓝双圆交替脉冲 / need 黄 / done 绿 / stale 红，drop-shadow 发光）+ 最近更新时间（11px tertiary）+ **数据卡片**（卡内底部一行最近 metrics 摘要：完读率/读完率/追读/日增收藏/收益，无数据「暂无数据」）+ 卡操作（▶ 打开 = sessions.open 绑定会话+关控制台、🔗 绑定/重绑 = 既有 BindDialog（失效引导重绑）、➤ 继续工作流 = sessions.prompt 复用）；**卡片主体点击 = 切绑定会话并关控制台**（无绑定/失效 → 打开 BindDialog 提示绑定）。视觉对照 dsh-worktable 控制室卡片（玻璃渐变、状态霓虹/流光、双圆绑定），全量 --dsw-alias-* 令牌、.nv- 样式并入既有 `<style id="novel-writing-style">`（幂等+清理），数据面零新增 HTTP API（信号/metrics 经既有 overview + /api/novel 组合拉取）；smoke 83 → **86 项**（新增 nv-console 注册面 6 席 / order=25 / z-index 950 样式注入 / 抽屉无按钮组 + 标题行按钮树断言；mock react 升级为逐层执行函数组件以便组件树级断言）。

## [0.3.0] - Unreleased

### 客户端
- **新会话初始窗口工作台入口（UX-001）**：blank/hero 状态下 `conversation.view`（小说工作台标签）与 `composer.dock`（原预设兜底条）均不渲染，初始窗口无任何工作台入口——兜底条迁移至 `conversation.input.dock`（hero/active 均渲染，standardProps 含 inputActions），并新增「📖 小说工作台」入口行：书目列表 + ▶ 开始/继续工作流（`completedStages`/`totalChapters` 判定）+ 一键新建并开工；启动走按需挂载预设（blank 会话原位 select novel-writing 后注入），预设作为工作台附属组件对用户零感知。
- **工作台入口收敛为侧栏 + 浮层面板（UX-002）**：整行 input.dock 横幅（用户反馈喧宾夺主）移除——常驻入口改为侧栏底部「📖 小说」+ 浮层面板（书目选择/启动·继续/新建即启动，经 pendingLaunch 通道注入，输入框上方仅瞬时出现「启动指令待发送」小条）；`conversation.input.dock` 仅保留 pendingLaunch 兜底条；StudioView 主按钮防连点补全（`disabled: launching || creating`）。
- **浮层面板首次进入支持设置 workspace（UX-003）**：快速面板新增「工作区」根目录行（复用 WorkspaceRootEditor / `api.settings.update`），空态提示更新为面板内指引；WorkspaceRootEditor 补齐 API 不可用守卫（面板与工作台侧栏两消费点同受益）；陈旧 `noNovelsHint` 文案（原指向设置页）更新。
- **统一入口：选择/新建工作区 → 自动建会话（UX-005）**：侧栏「📖 小说工作台」→ 对话框（`workspace.list` 单选 + 新建：`host.pickDirectory` 选择文件夹 / `host.createDirectory` 新建子目录 + `workspace.create`）→ 确认后 `session.create(workspaceId)` → `agentPresets.select('novel-writing')` → `settings.update(workspaceRoot=工作区目录)` → `session.prompt('开始小说创作工作流')` 自动启动；成功后明确提醒进入「小说工作台」标签（宿主无视图切换 API）；失败重试**幂等**（缓存本次链 createdId，不再二次建会话）；浮层面板退位为纯状态 HUD（移除书目选择/启动/新建/工作区行）；`workspaceRoot` 与所选工作区目录一致，业务配置收敛于工作台。

### 修复
- **install.ps1 补 UTF-8 BOM（BUG-001）**：脚本原为 UTF-8 无 BOM，Windows PowerShell 5.1 对无 BOM 的 .ps1 按 ANSI(GBK) 解码，中文注释/字符串乱码触发 ParserError（The string is missing the terminator），离线通道 `.\install.ps1 -LocalPath .` 完全不可用；现于文件头补 3 字节 BOM（EF BB BF，其余字节逐字节不变），PS 5.1 解析通过、离线安装恢复；在线通道（irm + iex）头部命令已含 `.TrimStart([char]0xFEFF)`，不受 BOM 影响。
- **lib/tools.js 补 inject 声明修复预设挂载失败（BUG-002）**：UX-005 实机验证——统一入口建会话成功但「小说写作工作流」预设挂载失败，宿主报 `agent-presets: preset "novel-writing" failed to mount: failed to apply loader entry tool-novel (dsh-novel-writing/tools): cannot get property "tools" without inject`；根因是工具行模块在 apply 内 11 处 `ctx.tools.register(...)` 但未声明 inject（Cordis 强制：ctx 服务属性访问必须先在插件声明 inject）。现补 `export const inject = ['tools']`（tools 硬依赖；novel-writing 服务保持可选经 ctx.get 探测、不进 inject——未装 bundle 时本行静默激活注册 0 个工具，预设仍可挂载），并清除挂载路径上第二个潜伏阻断：`novel_state_update` 的 `latestAiPath` 参数 enum 含 null，真 dsh-tools 的 defineTool 校验拒绝（string enum 必须全字符串值），修为 `['A','B','C']`——此前被 inject 错误掩盖、从未在挂载中执行到；smoke 新增 tool 行挂载契约断言（inject 声明含 tools 且不含 novel-writing / apply 挂载注册恰好 11 个工具且名字集合精确匹配 / 可选服务缺席时静默 0 注册三路径；mock ctx 以 getter 复刻 Cordis inject 门控，本地真包与 CI 恒等 mock 两条路径均通过），堵住 CI 四道检查（语法/依赖架构/静态校验/smoke）均不经过 apply 挂载路径的防护网缺口（冒烟 60 → 67 项）。

## [0.2.2] - 2026-08-22

> 补录（2026-08-22，REL-001）：tag `v0.2.2` 发布时本段缺失，现从 commit `ef5c073` 提炼补写。

### 配置边界重构
- **业务配置归一工作台**：工作区根目录 → 工作台侧栏顶部（✎ 就地编辑——它决定书目列表本身）；平台发布模式/命令/fetchCommand → 发布页签「⚙ 平台发布配置」折叠区（使用现场就地编辑；overview 下发平台配置）。
- **设置页只留插件级开关**：启用开关 / 轮询（下限 500ms）/ 预设自动同步 / LAN 暴露（含风险警示）；页首指引业务配置位置。
- 数据页抓取指引同步改指发布页签；README/SKILL 同步配置边界说明。

## [0.2.1] - 2026-05

### 修复与加固（审计 P1 收尾）
- **宿主**：metrics 按 date 去重（同日后到覆盖）+ 滚动保留 730 条；`ensurePreset` 原子换入（staging→rename，升级中途崩溃不留半套预设）；`updateState` 增加 `allowCreate:false` 防幽灵书目（`novel_state_update` 已启用）；`sceneMatched` 阈值收紧（`max(2, 40%)`，单关键词需 ≥2 滑窗，降假阳性）；`novel_status` 可空字段按 schema 裁剪；overview 透出 `platforms` 键。
- **客户端**：设置页失败态 + 重试（不再永久「加载中」）；发布平台下拉读配置键（settings 自定义平台可见）；机器审计（字数/场景/段落/双钩子/AI 痕迹）在章节阅读页折叠展示。
- **测试**：冒烟 60 项（新增 metrics 去重、fetchCommand 适配器真实子进程、幽灵书目拒绝）。

## [0.2.0] - 2026-05

### 安全（双代理审计 P0）
- HTTP 章号收口校验（杜绝 `../` 路径穿越任意 `.md` 写入与门禁绕过）；回环判定改 `socket.remoteAddress`；POST 同源校验（Origin/Referer + JSON content-type）拒绝跨站 CSRF（隔离实测 text/plain → 403）；请求体 4MB 上限；platform 清洗；`runCommand` 异步执行（超时 kill，修 spawnSync 冻结宿主与 POSIX shell 缺失）。

### 数据正确性
- chapterList meta 键补零（已发布/门禁/审查标记恢复可见）；`total_words` 按 meta 汇总（不再恒 0）；`total_chapters`=章节文件数；第 1000+ 章进入列表；meta.json 损坏隔离改名；全部落盘原子化（tmp 随机后缀 + rename）。

### 门禁语义
- 否定句式三分类：排除型（计 drift）/ 条件型（`不得无铺垫引入` → conditional 人工复核，不计 drift）/ 需求型（requirements）；场景术语豁免（同卡必写场景要求的术语不可能是禁词）；场景解析兼容全角/无加粗漂移，格式无法解析时 **fail-closed**；`computeGate` 干跑不落盘；review 零容忍服务层强制（pass⟺100 分且无硬门禁失败）；`release_allowed` 校验下沉服务层（工具/HTTP 同一收口）；manual 模式不再标记 published。

### 客户端
- 数据录入表单 `[object Object]` 渲染修复；事件回调 hook 误用修复（新开专用会话分支恢复可用）；pendingLaunch 改 composer.dock 兜底条 + TTL + 双通道；章节轮询竞态修复（selected 入 deps、错序响应丢弃、出错清数据）；人机并发覆盖确认；脏稿三重保护（切章/切书/切页签）；HUD 关闭停轮询；pollMs 下限 500ms；文件树折叠键全路径；请求/数据面板防重复提交与数值校验；阶段清单补三审/AI 合规/可选阶段。

## [0.1.3] - 2026-05

- 预设改为**按需加载**：撤销「默认预设」设置；启动按钮三段式（已在小说预设→注入；blank 会话→原位切换；已开始的普通会话→自动新开专用会话 + 兜底发送）。

## [0.1.2] - 2026-05

- 启动按钮预设三段式与预设状态徽标（后于 0.1.3 调整为按需语义）。

## [0.1.1] - 2026-05

- 工作台四项管理能力：多书目侧栏、workspace 文件树（折叠+就地预览）、一键新建小说、一键启动/继续工作流（`inputActions` 注入）；安全文件读取（路径逃逸/私有目录/大小上限）。

## [0.1.0] - 2026-05

- 首个可用版本：宿主 `novel-writing` 服务（项目管理/看护门禁/机器审计/发布适配/数据信号/请求队列）+ 回环 HTTP API + 预设自动同步；agent 预设（Coordinator persona + 29 SKILL + 16 Agent 参考 + `novel_*` 工具行）；浏览器工作台（五页签）+ HUD + 设置页；多平台发布三级降级 + fetchCommand；依赖架构（peer-only 防双闭包）与验证管线（CI 守卫/预设校验/宿主冒烟/隔离 boot）。
