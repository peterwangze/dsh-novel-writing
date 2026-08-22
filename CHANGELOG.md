# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式；版本号语义化（0.x 阶段以次要版本承载功能批，补丁号承载修复）。

## [0.3.0] - Unreleased

### 客户端
- **新会话初始窗口工作台入口（UX-001）**：blank/hero 状态下 `conversation.view`（小说工作台标签）与 `composer.dock`（原预设兜底条）均不渲染，初始窗口无任何工作台入口——兜底条迁移至 `conversation.input.dock`（hero/active 均渲染，standardProps 含 inputActions），并新增「📖 小说工作台」入口行：书目列表 + ▶ 开始/继续工作流（`completedStages`/`totalChapters` 判定）+ 一键新建并开工；启动走按需挂载预设（blank 会话原位 select novel-writing 后注入），预设作为工作台附属组件对用户零感知。

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
