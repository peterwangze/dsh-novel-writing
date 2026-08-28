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
| ② 小说管理与人机高价值互动 | 宿主 `novel-writing` 服务管理 workspace 多书目（工作台控制台书目管理 + **一键新建小说**）；所有关键决策走 `ask_user_question`；工作台「请求队列」让人在 UI 侧发起优化/审查/发布/数据请求，协调者用 `novel_requests` 接单 |
| ③ 写作过程可视化 + 实时渲染 | 侧栏「📖 小说工作台」区块（**纯主入口**：标题行开/关控制台 + 书目卡片）+ **工作台控制台**（shell.overlay 全屏管理界面：搜索小说/会话、新建小说、卡片网格——书名/阶段/状态行/绑定双圆/数据摘要/卡操作）；打开小说后进**分栏工作区**（margin 挤法把官方对话窗挤到右侧，左导航/中五页签/右对话，⇄ 换边、分隔线可拖、宽度记忆）；workspace 文件树（可折叠、点击预览）；2s 轮询实时渲染正文/进度/门禁 |
| ④ 章节编辑保存 + 优化建议 | 工作台章节编辑器：保存即跑看护门禁（不通过即拒绝，人工改稿可强制留痕）；机器审计（字数/段落/开篇钩子/章末钩子/AI 痕迹密度）；一键向协调者发起优化请求 |
| ⑤ 多平台自动化配置发布 + 数据获取 | 每平台可配 `export / command / manual` 三种发布模式与 `fetchCommand` 数据抓取；导出定稿产物 + 发布清单；数据三级降级（API→自动化→手动录入） |
| ⑥ 基于数据动态优化写作方向 | 数据入库即检信号（完读率低/章节流失/追读下降/收藏停滞/收益下滑）→ 建议行动（重审黄金三章/章节重写/节奏调整/书名优化/止损框架），调整分四级（章内→细纲→大纲→题材）且必须用户确认 |

**立场继承（不变）**：人类是创作主体，AI 提供研究/灵感/校对/有限改写；AI 参与度 A/B/C 分级，路径 B/C 阻断上架与变现；审查只有满分（9 维 100 分制）；场景覆盖率=100%、偏离度=0% 零容忍。

## 架构一览

```
DSH Host                                    Browser
├─ bundle 行 novel-writing                  ├─ 侧栏「📖 小说工作台」抽屉（sidebar，纯主入口）
│   ├─ novel-writing 服务（项目管理/门禁/    │    标题行（点击=开/关控制台）· 书目卡片 · 绑定状态点
│   │   审计/发布/数据信号/请求队列/绑定）   ├─ 工作台控制台（shell.overlay nv-console，全屏管理界面）
│   ├─ HTTP API /novel-writing/api/*  ◄─────┤    搜索（小说/会话）· 新建小说 · 卡片网格（状态/数据）
│   └─ 预设自动同步到 .agent-presets/        ├─ 分栏工作区（shell.overlay novel-split，打开小说后的配套形态）
└─ 预设 novel-writing（会话挂载）            │    左：工作区行+书目+文件树 ｜ 中：五页签 ｜ 右：官方对话窗
    ├─ Coordinator persona + 29 SKILL       ├─ 工作区/绑定会话对话框（shell.overlay）
    └─ tool-novel：novel_* 工具集（门禁代码化）└─ 设置 → 小说写作（仅插件级：开关/轮询/同步/LAN）
```

> 每本小说与一个会话 **1:1 绑定**（settings `novel-writing.bindings`，overview 附带下发）：侧栏卡片点击 = 打开控制台并聚焦该书；控制台卡片/▶ 打开 = 切换绑定会话并进分栏（Esc/✕/再次点击标题行关闭控制台并还原布局）。

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

1. 安装并重启 DSH 后，**侧栏底部出现「📖 小说工作台」区块（纯主入口）**：点**标题行**打开/关闭工作台控制台（反选语义），或点**书目卡片**直接打开控制台并聚焦该书；没有书目时显示「打开工作台界面创建第一本小说」；
2. 打开的工作台**控制台**是全屏管理界面（覆盖内容区，不遮侧栏）：顶部栏「**切换 / 新建工作区…**」打开「选择小说创作工作区」对话框——从已配置工作区中选择或新建（可「选择文件夹」或「在其下新建目录」），确认后自动：在新工作区创建小说会话 → 挂载「小说写作工作流」预设 → 发送开始指令 → 打开会话；
3. 控制台点「**＋ 新建小说**」弹出悬浮表单：填目录名（书目 id）+ 可选书名 → 「**创建并开始**」自动完成整链——创建目录与书目 → 以该书目录为 cwd 新建会话 → 挂载预设 → 写入小说↔会话绑定 → 打开会话并进分栏 → 发送「开始小说创作工作流：《书名》（目录 id）」；「**仅创建**」只建书目（不建会话，之后可 🔗 绑定）。想先看看效果，把 [`examples/demo-novel`](./examples/demo-novel) 整个目录拷到工作区目录下，工作台即出现《示例小说》（含 1 章 + 看护卡，可体验阅读/编辑/门禁/发布面板）；
4. 小说创作工作区 = 所选 DSH 工作区目录（其路径自动同步为小说 `workspaceRoot`）；此后可在**分栏工作台左窗顶部 ✎** 就地修改根目录（业务配置收敛于工作台）；
5. 也可沿用传统路径：新建会话时在**预设选择器**选「**小说写作工作流**」，或在对话输入 **`开始小说创作工作流`**（旧项目输入 `继续小说创作工作流`，从 `workflow-state.json` 断点续传），再在控制台卡片上用 🔗 把会话与书绑定。

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

侧栏区块是**纯主入口**：点标题行（或书目卡片 = 直接聚焦该书）打开**工作台控制台**——全屏管理界面（覆盖内容区，不遮侧栏）；标题行再点 / 控制台 ✕ / Esc 关闭：

- **顶部栏**：📖 小说工作台 · 当前工作区名 · 「切换 / 新建工作区…」· ✕；
- **搜索行**：关键词同时过滤①小说卡片（书名/目录 id）②会话快照（标题/id 匹配 →「找到的会话」行，点击 = 打开那个会话并关闭控制台——「关键词找到 session」）；
- **＋ 新建小说**：悬浮表单（目录名必填 / 书名可选默认同目录名）——「创建并开始」走完整新建链（创建→建会话→挂预设→写绑定→打开→开分栏→发启动指令）、「仅创建」只建书目；busy 禁用/错误红字；
- **小说卡片网格**（玻璃拟态，minmax 260px 自适应）：📖 书名 + 阶段徽标；状态行 `N章 · N字 · 发布✓/✗ · 变现✓/✗ · 信号N`；**绑定状态点**（双圆：○○ 空心未绑定 / ●● 实心已绑定 / 工作中=accent 蓝脉冲 / 待决=黄 / 完成=绿 / 会话失效=红）+ 最近更新时间；**数据卡片**：每书卡内一行最近 metrics 摘要（完读率/读完率/追读/日增收藏/收益，无数据显示「暂无数据」）；卡操作（▶ 打开 / 🔗 绑定·重绑 / ➤ 继续工作流）；
- **卡片主体点击 = 打开该书**：切换绑定会话 → 进入**分栏工作区**（控制台自动关闭；未绑定/失效时改为提示绑定）；
- **分栏工作区**（打开小说后的会话配套形态）：左窗（工作区根目录行 + 全部书目 + 当前书目 `novel-project/` 文件树，可「«」折叠）｜中窗（五个内容页签）｜右窗 = 官方对话窗本身（margin 挤法贴右，**⇄ 可换边到左侧**）；两条分隔线可拖拽调宽，宽度与换边记忆在本地（`dsh.novel.split.v1`）；标题栏：📖 书名 · 阶段徽标 · 绑定会话状态点 · ⇄ 换边 · ✕ 关闭（Esc 同）；
- **🔗 绑定会话**：面板按工作区分组列出全部会话，点击即绑定（1:1）并可一键「新建会话并绑定」（新书目录为 cwd + 自动挂预设）；绑定会话失效时卡片标「会话失效」，点击引导重新绑定；
- **文件树**：当前书目 `novel-project/` 的完整文件树（可折叠、点击就地预览，.md 渲染阅读）。

> **配置边界**：业务配置统一在工作台内（工作区根目录 = 分栏左窗顶部；平台发布模式/命令/数据抓取 = 发布页签「⚙ 平台发布配置」；小说↔会话绑定 = 控制台卡片 🔗）；**设置 → 小说写作**只保留插件级开关（启用/轮询/预设自动同步/LAN 暴露），与具体小说无关。

| 页签 | 用途 |
|---|---|
| 章节 | 左侧章节列表（字数/已发布/门禁⚠）；中间阅读（场景分隔渲染，含「需求项」提示与机器审计折叠）或编辑（**Ctrl+S 保存**、未保存切换确认、保存跑门禁） |
| 工作流 | 当前阶段（含大纲三审/细纲三审/AI 合规子阶段）、完成清单、发布/变现/AI 路径门禁、请求列表 |
| 数据 | 信号看板（阈值/现值/建议行动）+ **最近 7 天记录表** + 每日指标录入（完读率/读完率/追读/日增收藏/收益） |
| 发布 | 选平台 → 导出 / 导出+命令 / 仅清单（可勾选「含已发布」重发）；发布历史；**⚙ 平台发布配置**（模式/命令/fetchCommand 就地编辑） |
| 请求 | 向协调者提交「优化第 N 章 / 审查 / 发布推进 / 补录数据 / 人工指令」，AI 接单处理 |

会话运行状态零轮询镜像到抽屉卡片、控制台卡片（双圆状态点）与分栏标题栏（工作中=蓝发光 / 待决=黄 / 完成=绿；绑定会话被删除 → 红点「会话失效」）。会话服务缺席时自动降级：状态点隐藏、打开/绑定禁用并提示。

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
node test/smoke.mjs             # 宿主逻辑 + 挂载契约 86 项断言（状态/门禁/审计/发布/信号/注册面）
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
| 客户端热更新 | 浏览器侧（抽屉/控制台/分栏工作区/对话框/设置页）随 DSH 重启生效；宿主侧行为下次 boot 生效 |
| LAN 暴露 | `apiPublic: true` 后同网段可无鉴权读全部书稿——仅在你完全信任内网时开启 |

## 安全模型

- API 默认**仅回环**：以连接来源（socket.remoteAddress）判定，Host 头仅兜底；
- **写方法同源校验**：POST 必须携带与宿主一致的 Origin/Referer 且 content-type 为 application/json（拒绝跨站「简单请求」CSRF，含命令执行端点）；
- 请求体上限 4MB；章号/路径/平台名统一收口校验（拒绝 `../` 注入）；
- 发布命令/fetchCommand 由用户显式配置，异步执行（不冻结宿主），180s/120s 超时；发布前 `release_allowed` 门禁在**服务层**强制（工具与浏览器同一收口）。

## License

MIT
