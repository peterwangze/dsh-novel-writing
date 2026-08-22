# dsh-novel-writing

> DSH（DeepSeek Harness）**自动化小说写作发布流水线**插件：把 [claude-writing-workflow](https://github.com/peterwangze/claude-writing-workflow) 的端到端创作质量体系迁移为 **agent 预设**，并用 **宿主插件**补齐项目管理、可视化工作台、多平台发布配置与数据闭环——门禁从「靠 AI 自觉」升级为「代码强制」。

[![dsh-plugin](https://img.shields.io/badge/DSH-plugin-blue)](https://github.com/peterwangze/dsh-novel-writing) [![preset](https://img.shields.io/badge/agent--preset-novel--writing-green)](./agent-presets/novel-writing) [![CI](https://img.shields.io/badge/CI-syntax%20%7C%20deps%20%7C%20preset%20%7C%20smoke-brightgreen)](./.github/workflows/ci.yml) [![license](https://img.shields.io/badge/license-MIT-lightgrey)](#license)

---

## 项目目标

写一部能赚钱的网文，难点从来不是「生成文字」，而是：**选对赛道 → 大纲不崩 → 正文不离纲 → 审查不放水 → 发布不走样 → 数据能反馈到写作方向**。原 claude-writing-workflow 用 26 个 SKILL + 16 个专业 Agent + 零容忍门禁解决了前四件事，但受限于终端形态：门禁靠模型自觉、无界面、无持久数据通道、无法管理多部小说。

本插件在 DSH 上补齐这一层：

| 需求 | 实现 |
|---|---|
| ① 迁移源工作流为 agent 预设 | `agent-presets/novel-writing/`：Coordinator 人设（三层角色模型）+ 29 SKILL（26 个迁移 + 3 个 DSH 原生）+ 16 Agent 参考 |
| ② 小说管理与人机高价值互动 | 宿主 `novel-writing` 服务管理 workspace 多书目（工作台侧栏书目列表切换 + **一键新建小说**）；所有关键决策走 `ask_user_question`；工作台「请求队列」让人在 UI 侧发起优化/审查/发布/数据请求，协调者用 `novel_requests` 接单 |
| ③ 写作过程可视化 + 实时渲染 | 浏览器「小说」工作台（2s 轮询实时渲染正文/进度/门禁）+ workspace 文件树（可折叠、点击预览）+ 「▶ 开始/继续工作流」按键直达对话 + 侧栏「小说 HUD」浮层 |
| ④ 章节编辑保存 + 优化建议 | 工作台章节编辑器：保存即跑看护门禁（不通过即拒绝，人工改稿可强制留痕）；机器审计（字数/段落/开篇钩子/章末钩子/AI 痕迹密度）；一键向协调者发起优化请求 |
| ⑤ 多平台自动化配置发布 + 数据获取 | 每平台可配 `export / command / manual` 三种发布模式与 `fetchCommand` 数据抓取；导出定稿产物 + 发布清单；数据三级降级（API→自动化→手动录入） |
| ⑥ 基于数据动态优化写作方向 | 数据入库即检信号（完读率低/章节流失/追读下降/收藏停滞/收益下滑）→ 建议行动（重审黄金三章/章节重写/节奏调整/书名优化/止损框架），调整分四级（章内→细纲→大纲→题材）且必须用户确认 |

**立场继承（不变）**：人类是创作主体，AI 提供研究/灵感/校对/有限改写；AI 参与度 A/B/C 分级，路径 B/C 阻断上架与变现；审查只有满分（9 维 100 分制）；场景覆盖率=100%、偏离度=0% 零容忍。

## 架构一览

```
DSH Host                                    Browser
├─ bundle 行 novel-writing                  ├─ 「小说」工作台（conversation.view）
│   ├─ novel-writing 服务（项目管理/门禁/    │    章节·工作流·数据·发布·请求 五页签
│   │   审计/发布/数据信号/请求队列）        │    侧栏顶部：工作区根目录（业务配置）
│   ├─ HTTP API /novel-writing/api/*  ◄─────┤    发布页签：⚙ 平台发布配置（业务配置）
│   └─ 预设自动同步到 .agent-presets/        ├─ 「小说 HUD」浮层（sidebar + overlay）
└─ 预设 novel-writing（会话挂载）            └─ 设置 → 小说写作（仅插件级：开关/轮询/同步/LAN）
    ├─ Coordinator persona + 29 SKILL
    └─ tool-novel：novel_* 工具集（门禁代码化）
```

详见 [docs/DESIGN.md](./docs/DESIGN.md)（设计方案）与 [docs/RESEARCH.md](./docs/RESEARCH.md)（市场/源工作流/DSH 生态三路调研）。

## 一键安装

### 方式一（推荐）：`dsh plugin` 标准命令

```sh
dsh plugin --profile web add peterwangze/dsh-novel-writing   # 从 GitHub 安装
dsh plugin --profile web update dsh-novel-writing            # 升级
dsh plugin --profile web remove dsh-novel-writing            # 卸载
```

也支持 npm 包名或本地路径：`add file:/path/to/repo`（内容寻址，升级需 remove+add）、`add link:/path/to/repo`（符号链接，改码即生效，本地开发用）。

安装后：

1. **重启 DSH**（`dsh web`）——bundle 层重启生效；
2. 首次启动会自动把 **「小说写作工作流」预设** 同步到 `$DSH_HOME/.agent-presets/novel-writing/`（预设选择器立即可见，无需手动建目录）；
3. 无需改任何配置文件。

> 升级时预设目录会被新版本覆盖（插件拥有该预设）；若你改过预设想保留，先把它复制成新 id（如 `novel-writing-mine`）。

### 方式二：离线一键脚本（无 pnpm / 内网环境备选）

**Windows（PowerShell 5.1+）**——在线一行：

```powershell
powershell -ExecutionPolicy Bypass -Command "iex (((irm https://raw.githubusercontent.com/peterwangze/dsh-novel-writing/main/install.ps1) -join [Environment]::NewLine).TrimStart([char]0xFEFF))"
```

离线（解压发行包后在包目录内）：`.\install.ps1 -LocalPath .`

**macOS / Linux / Git Bash**——在线一行：

```sh
curl -fsSL https://raw.githubusercontent.com/peterwangze/dsh-novel-writing/main/install.sh | sh
```

离线：`./install.sh --local .`

脚本幂等可重复执行：接入 `profiles/node_modules` → 写入 profile 组合行 → 同步 agent 预设 → 写默认配置。

## 使用指导

### 第一步：准备与启动

1. 安装并重启 DSH 后，**侧栏底部出现「📖 小说」入口**：点击打开「小说工作台」浮层面板——选书目后点「▶ 开始/继续工作流」（或「＋ 新建小说」创建后立即开工），输入框上方随即出现「小说启动指令待发送」小条，点「▶ 发送」即开工——工作流预设自动按需挂载，全程无需手动选择预设（预设是工作台的附属组件，对用户不可见）；
2. 想先看看效果？把 [`examples/demo-novel`](./examples/demo-novel) 整个目录拷到 `~/novels/` 下，工作台即出现《示例小说》（含 1 章 + 看护卡，可体验阅读/编辑/门禁/发布面板）；
3. 小说默认存放在 `~/novels`（每部小说一个子目录；根目录可在**侧栏「📖 小说」面板的「工作区」行** 或 **「小说」工作台侧栏顶部 ✎** 就地修改——首次进入即可在面板内设置）；
4. 也可沿用传统路径：新建会话时在**预设选择器**选择「**小说写作工作流**」，或在对话里输入 **`开始小说创作工作流`**（旧项目输入 `继续小说创作工作流`，从 `workflow-state.json` 断点续传）。

### 第二步：跟着工作流走（你在决策位）

```
作品类型 → 平台调研 → 竞品分析 → 题材选择 → 作品确认 → 创作规划
   → 大纲(三审) → 章节细纲(三审) → 正文(看护) → AI合规 → 质量审查(6审)
   → 上架发布 → 变现 → 数据监控 → 读者互动
```

- 每个阶段切换都有进度面板与结构化选项（继续/回退/查看产出/退出）——**所有关键决策由你确认**；
- 市场/平台数据全部来自实时搜索，无来源的结论会标注「推测」；
- 正文保存被**代码门禁**保护：必写场景缺失或命中禁止项时拒绝保存并给出明细；你在工作台手改的稿子可以「强制保存（人工改稿）」，但会打 `forced` 标记提醒协调者重新审查。

### 第三步：用「小说工作台」看与改

会话顶部「**小说**」标签。顶栏操作条：

- **＋ 新建小说**：填目录名（书目 id）+ 可选书名 → 创建；可一键「**创建并开始工作流**」；
- **▶ 开始工作流 / ▶ 继续工作流**：对当前书目把启动/续传指令注入对话（新书目自动判断为「开始」，有进度的为「继续」）。**预设按需加载**——不改动全局默认预设，只在这一次触发时挂载「小说写作工作流」：会话已在小说预设 → 直接注入；会话还是空白 → 原位切换预设再注入；**会话已开始且是普通会话 → 自动新开一个挂好小说预设的专用会话并转场开工**（不打扰当前会话）。顶栏有预设状态徽标（✓ 已挂载 / ⟳ 原位切换 / ⟳ 新开专用会话）；
- **文件树**：左侧栏上半是 **workspace 全部书目**（点击切换，含阶段/章数/待处理请求角标），下半是当前书目 `novel-project/` 的**完整文件树**（可折叠、点击就地预览，.md 渲染阅读）；侧栏**最顶部是工作区根目录**（✎ 就地修改——它决定书目列表本身，属于业务配置）；

> **配置边界**：业务配置统一在工作台内（工作区根目录 = 侧栏顶部；平台发布模式/命令/数据抓取 = 发布页签「⚙ 平台发布配置」）；**设置 → 小说写作**只保留插件级开关（启用/轮询/预设自动同步/LAN 暴露），与具体小说无关。

| 页签 | 用途 |
|---|---|
| 章节 | 左侧章节列表（字数/已发布/门禁⚠）；中间阅读（场景分隔渲染，含「需求项」提示与机器审计折叠）或编辑（**Ctrl+S 保存**、未保存切换确认、保存跑门禁） |
| 工作流 | 当前阶段（含大纲三审/细纲三审/AI 合规子阶段）、完成清单、发布/变现/AI 路径门禁、请求列表 |
| 数据 | 信号看板（阈值/现值/建议行动）+ **最近 7 天记录表** + 每日指标录入（完读率/读完率/追读/日增收藏/收益） |
| 发布 | 选平台 → 导出 / 导出+命令 / 仅清单（可勾选「含已发布」重发）；发布历史；**⚙ 平台发布配置**（模式/命令/fetchCommand 就地编辑） |
| 请求 | 向协调者提交「优化第 N 章 / 审查 / 发布推进 / 补录数据 / 人工指令」，AI 接单处理 |

侧栏底部「**小说 HUD**」随时浮动查看最新状态（当前书/阶段/字数/门禁）。

### 第四步：发布与数据闭环

1. **「小说」工作台 → 发布页签 → ⚙ 平台发布配置**：给目标平台选模式——`export`（导出定稿产物+发布清单）、`command`（导出后执行你的自动化脚本，可用环境变量 `DSH_NOVEL_DIR/DSH_DIST_DIR/DSH_PLATFORM`）、`manual`（仅清单）；数据抓取 `fetchCommand` 也在此配置；
2. 质量审查与 AI 合规通过（`release_allowed`）后，对话里让协调者发布或在工作台点发布；
3. 每天把后台数据填进「数据」页（或配置 `fetchCommand` 输出 JSON 行 `{"date":"...","完读率":..,"追读":..}` 自动入库）；
4. 信号触发时（如完读率 <10%），协调者按 `data-driven-optimization` 给出「定位→对策→影响→预期」方案，**你确认后**才动稿，改后 7 天观察验证。

### 常用话术

```
开始小说创作工作流 / 继续小说创作工作流
处理工作台请求            # 接单 UI 侧请求
给第 3 章优化建议          # 单章优化
发布最近 5 章到番茄小说
把本周数据入库并分析信号
抓取番茄数据入库          # 执行平台 fetchCommand 适配器（需在设置里配置）
```

## 兼容性与验证

- **依赖架构**：`@deepseek-ai/*` 全部为 `peerDependencies`，运行时解析到宿主闭包（同一实例）——规避「双闭包」导致的 boot 崩溃与版本漂移失效（详见 [docs/RESEARCH.md](./docs/RESEARCH.md) §3.2）。
- **能力降级**：宿主行缺席 `webServer` 仅降级 API；工具行缺席 `novel-writing` 服务时注册 0 工具，预设仍可挂载。
- **兼容矩阵**：实测 DSH `0.1.0-rc.7` 与 `0.1.1-rc.2`；peer 声明为 `*`，向前兼容以实测为准。
- **验证管线**（CI 全量执行 + 发版手动隔离 boot）：

```sh
node --check lib/index.js && node --check lib/tools.js && node --check lib/client.js
node test/validate-preset.mjs   # 预设挂载级校验（loader 同源解析 + 逐行模块解析）
node test/smoke.mjs             # 宿主逻辑 24 项断言（状态/门禁/审计/发布/信号）
# 隔离 boot（最接近真实安装路径）：
$env:DSH_HOME="$env:TEMP\dsh-novel-test"; dsh plugin --profile web add link:<本仓库>
dsh web --port 3100 --no-open   # 另一终端 curl http://127.0.0.1:3100/novel-writing/api/overview → 200
```

## 卸载

```sh
dsh plugin --profile web remove dsh-novel-writing
```

可选清理：删除 `$DSH_HOME/.agent-presets/novel-writing/`（预设）与 `$DSH_HOME/settings.yaml` 的 `novel-writing` 节。小说内容（`~/novels`）不受任何安装/卸载影响。

## 已知限制（诚实边界）

| 限制 | 说明 |
|---|---|
| 平台无公开 API | 13 个主流平台均无官方写作/发布/数据 API；`command` 模式的自动化脚本由用户自担合规与风控风险，默认关闭 |
| 机械门禁的语义盲区 | 场景覆盖用「标题精确 + 关键词滑窗」匹配，可能漏判同义改写——输出明细供 agent/人复核；「不得无铺垫引入」类**条件型**禁止无法机械判定，gate 输出 `conditional` 列表提示人工复核，不计入偏离度；看护卡场景段**格式漂移时门禁 fail-closed（阻断而非静默放行）** |
| 数据口径 | 追读率/跟读率/完读率各平台定义不同，录入时以平台后台口径为准 |
| 客户端热更新 | 浏览器侧（工作台/HUD/设置页）随 DSH 重启生效；宿主侧行为下次 boot 生效 |
| LAN 暴露 | `apiPublic: true` 后同网段可无鉴权读全部书稿——仅在你完全信任内网时开启 |

## 安全模型

- API 默认**仅回环**：以连接来源（socket.remoteAddress）判定，Host 头仅兜底；
- **写方法同源校验**：POST 必须携带与宿主一致的 Origin/Referer 且 content-type 为 application/json（拒绝跨站「简单请求」CSRF，含命令执行端点）；
- 请求体上限 4MB；章号/路径/平台名统一收口校验（拒绝 `../` 注入）；
- 发布命令/fetchCommand 由用户显式配置，异步执行（不冻结宿主），180s/120s 超时；发布前 `release_allowed` 门禁在**服务层**强制（工具与浏览器同一收口）。

## License

MIT
