# AI 辅助小说写作与发布流水线 · 市场调研报告

> 调研范围：中文网文/英文小说 AI 写作工具、平台官方工具、开源 Agent 流水线、发布 API 与数据回流、数据驱动的写作优化。检索时点 2026-08，价格与政策以各官网最新为准。

## 一、市场概览

### 1. 平台官方工具（与发布、变现、数据强绑定）

| 产品 | 厂商/URL | 核心特征 |
|---|---|---|
| 阅文作家助手 + 妙笔 | 阅文集团 [write.qq.com](https://write.qq.com/) | 国内首个网文行业大模型"阅文妙笔"（2023-07）；2025-02 部署 DeepSeek-R1（智能问答/灵感/润色）；2025-10 发布"妙笔通鉴"——千万字级网文深度理解，实时细节回顾、剧情总结，已向全行业作家开放（[湖北日报](http://m.cnhubei.com/content/2025-10/16/content_19581770.html)）。支持角色/世界观/描写生成、一键+定时发布、订阅/追读/收藏/打赏/稿酬看板 |
| 番茄作家助手 | 字节跳动 [fanqienovel.com](https://fanqienovel.com/) | 错字检测（专利 AI）、定时发布、移动+网页多端同步；数据看板最细：点击率、7 日追读率、阅读深度（广告解锁）、完读率/跟读率、章节留存曲线、集团渠道收益率（[数据解读](https://global.php.cn/zh/faq/1796975690.html)）。2024 年内测 AI 起名/灵感/扩写（[钛媒体](https://www.tmtpost.com/6922114.html)）；2026-06 严打 AI 水文（见 §3/§5 合规） |
| 七猫作者中心 | 七猫 [zuozhe.qimao.com](https://zuozhe.qimao.com/) | 七猫+纵横双平台一体化分发；免费/付费双端数据、章节留存流失、书评/章评/段评互动同步；2023 年曾提供基于文心一言的"AI 助理" |
| 起点作家专区 | 阅文（与作家助手同源） | 主线同阅文；**本章说**互动密度最高，读者会主动分析剧情、玩梗；起点作者有本章说管理权限 |

共性：**发布、数据、互动、稿酬四合一**，AI 只做辅助（设定/灵感/润色/查错/排版）。

### 2. 独立 AI 写作软件（第三方）

| 产品 | URL | 特点 |
|---|---|---|
| 马良写作 | [maliangwriter.com](https://maliangwriter.com/) | 中文长篇定位，宣传 7 个 Agent（写作/检索/校验/节奏/一致性）+ 节奏分析曲线 + 公共知识库；自建 6 维评测框架对照 18 款工具（大纲层级/多智能体/一致性/节奏分析/多模型/公共库，[对比页](https://maliangwriter.com/compare/)），是本文市场竞争分析的主要参照 |
| 笔灵 AI 写作 | [ibiling.cn](https://ibiling.cn/) | 网文向产品矩阵最全的第三方：大纲（编辑认证）、AI 写全篇小说、改写润色、"去 AI 味"、30s 预审核、拆书、投稿攻略；无发布/数据回流 |
| 橙瓜码字 | [App Store](https://apps.apple.com/cn/app/id1042545642)（[官网](https://www.chenggua.com/) 抓取异常） | 老牌码字软件：大纲助手、起名、时光机、拼字、双备份、30+ 网站驻站征稿入口；AI 能力弱，无自动发布 |
| 秘塔写作猫 | [xiezuocat.com](https://xiezuocat.com/) | 中文纠错/改写/续写/翻译口碑产品，面向论文公文；**非网文向**，无平台回流 |
| 火龙果写作 | [mypitaya.com](https://www.mypitaya.com/) | 校对/改写/扩写/降重/查重/灵感，Word 插件；标准版 168 元/年 |
| 其他 | — | 蛙蛙写作（AI 辅助码字代表）；吉吉写作（纯码字、无 AI、疑停更）；万能AI写作（"伪原创"通用 App）；**大师码/墨墨写作：未查证到**（仅近似名的安卓码字工具）；爱创作 = ZAKER 的新闻/营销内容生成工具，非网文 |

### 3. 开源 Agent 流水线 / 编程 Agent 写小说

- **Skill 化路线（最贴近"Agent 预设"设计）**：[网文工坊 WebNovel Studio](https://github.com/tance-mang/chinese-webnovel-skills)（Claude Code 插件，33 skills，选题→大纲→黄金开篇→爽点→追读诊断→去 AI 味→敏感词校对→平台趋势，自带 CLI 与多模型导出）；[xindoo/sumeru 须弥写作](https://github.com/xindoo/sumeru)（7 skills，含多平台格式导出）。
- **多 Agent 流水线路线**：[zxerai/novelix](https://github.com/zxerai/novelix)（每章 10 Agent + 33 维连续性审计）、[mrigankad/Novel-OS](https://github.com/mrigankad/Novel-OS)（Architect→Scribe→Editor→Guardian→Curator）、[Cppys/OpenNovel](https://github.com/Cppys/OpenNovel)（含 PublisherAgent 发番茄）、[Lanerra/saga](https://github.com/Lanerra/saga)（LangGraph+Neo4j 正典图谱）。
- **数据侧基建**：[d3nnywong/qidian-mcp-server](https://github.com/d3nnywong/qidian-mcp-server)（Playwright 采集起点榜单/书评/拆书，MCP 协议接入 Claude Code）。
- 详见 §四。

### 4. 英文工具：写作软件 + 编程 Agent 工作流

| 产品 | URL | 特性/定价 |
|---|---|---|
| Sudowrite | [sudowrite.com](https://www.sudowrite.com/) | Brainstorm/Write/Describe/Rewrite/Expand/Canvas/First Draft；**Story Bible**（Braindump→Genre/Style/Synopsis/Characters/Worldbuilding/Outline/Scenes&Draft 结构化设定库）；Story Smarts（POV/时态/章节连续性/Saliency Engine）；Muse；插件系统；$10/$22/$44 月（credits 计费，[定价](https://www.sudowrite.com/pricing)） |
| Novelcrafter | [novelcrafter.com](https://www.novelcrafter.com/) | 章节/场景 + **Codex AI 知识库**（条目自动提及/别名/关系/递进，写作时注入）；AI 内联改写、场景节拍、角色提取；BYOK 多模型（本地模型亦可）；$4–$20/月，21 天试用（[定价](https://novelcrafter.com/pricing)） |
| Squibler | [squibler.io](https://squibler.io/) | AI 写书/剧本生成 + 项目管理（章节卡、目标追踪、整本书 200–300 页生成）；免费 1k credits/月，Plus $29.99、Pro $89.99 |
| NovelAI | [novelai.net](https://novelai.net/) | AI 讲故事（Storyteller + 文字冒险 + **Lorebook 关键词触发记忆**）+ 动漫插图；Tablet $10/Scroll $15/Opus $25 月 |
| JotterPad | [jotterpad.app](https://jotterpad.app/) | Markdown/Fountain 写作，导出 docx/pdf/epub，**可发布到 Ghost/WordPress/Tumblr**；AI 仅为 GPT-3 "Wizard" 插件 |
| ProWritingAid | [prowritingaid.com](https://prowritingaid.com/pricing) | 语法/风格 20+ 报告 + **小说向：章节批评、情节/角色分析、虚拟 Beta 读者、市场性分析**；免费版 500 词上限；Premium $10/月（年付）或 $399 终身 |
| Grammarly | [grammarly.com](https://www.grammarly.com/pricing) | 通用语法/语气/清晰度/AI Humanizer；Pro $12/月；非小说工作区 |
| Campfire | [campfirewriting.com](https://www.campfirewriting.com/pricing) | 模块化世界观+手稿平台：角色/地图/时间线/日历/魔法/语言/关系等 16+ 模块、协作、具备**公开阅读端**；**无第一方 AI**（campfire.ai 是无关公司）；Standard $12/月年付 |
| LivingWriter | [livingwriter.com](https://www.livingwriter.com/) | 故事圣经"元素"自动补全进手稿 + 全管线 AI（大纲/元素生成/改写/手稿聊天/分析/剧本转换）；$14.99/月或 $12/月年付 |
| Fable | [fable.la](https://www.fable.la/)（AI 文档编辑器）/ [thefableapp.com](https://thefableapp.com)（AI 故事生成 App）/ [fable.app](https://fable.app)（社交读书俱乐部，非写作工具） | "Fable"这个名字对应三个不同产品，**没有一个完整的小说工作区** |
| yWriter | [spacejock.com/yWriter.html](https://www.spacejock.com/yWriter.html) | 免费非 AI 基线：章节/场景分文件、每场景视角/目标/冲突/结局、角色/物品/地点清单、每日进度、自动备份 |
| Scrivener | [literatureandlatte.com](https://www.literatureandlatte.com/scrivener/overview) | 非 AI 行业标杆：binder、大纲/软木板、快照版本、编译 docx/epub；macOS $59.99、iOS $23.99 买断——**作品管理/编译层最值得借鉴** |
| Claude Code/Cursor/Codex 工作流 | 见 §四 | 编程 Agent 直接当"写书 Agent"：Claude Code 插件市场（网文工坊、须弥写作、cc-novel-writer、fanqie-publisher-skill）、[Cursor 长篇写作 IDE](https://forum.cursor.com/t/built-for-cursor-turning-cursor-into-a-local-first-agentic-ide-for-long-form-writing-novels-buckram-studio/166057)、Codex 原生 skills——可控、便宜，但缺产品化 UI 与数据闭环 |

**英/中差异小结**：英文工具围绕"写完一本书"（小说圣经、连续性、导出出版），**没有连载运营层**——无追读/完读率、无多平台发布、无读者互动经济学（最接近的只是 Campfire 公开阅读端与 ProWritingAid"市场性分析"）；中文官方工具则围绕"平台运营"（发布、数据、稿酬、本章说），但 AI 能力受限；而 Agentic 生态（英文侧 vibe-noveling、InkOS 等）已把"连载流水线"做进本地文件层，恰恰缺中文平台的发布与数据。二者的空白正是本插件的目标空间。

## 二、功能能力图谱（合并 feature inventory）

| 能力 | 现状（谁最强） | 说明 |
|---|---|---|
| 大纲规划 | 平台: 大纲提取；独立: 马良（卷/章/节三级）；开源: sumeru-outline、novelix | 三级大纲（卷/章/节）+ 反向编辑 + 大纲级联更新是稀缺能力 |
| 人设卡 | 阅文妙笔"角色设定"；开源: ai-fiction-writer 角色弧线/关系图谱 | 需含状态追踪（当前状态/记忆），而非静态卡 |
| 世界观 | 马良、妙笔、sumeru-worldbuilder | 冲突/势力/地图/历法/力量体系的"可查询"化是难点 |
| 章节生成 | 笔灵（整篇）、novelix（10-Agent/章） | ⚠️ 中文平台普遍严禁 AI 正文（§5 合规） |
| 质量校验/一致性 | novelix 33 维、Novel-OS 确定性引擎、网文工坊 continuity | 伏笔回收、时间线、OOC、战力/伤势状态 |
| 润色 | 妙笔、写作猫、笔灵 | 上下文感知的扩写/改写仍是 AI 短板（番茄内测作者反馈"扩写不看上下文、主角人格不连贯"） |
| 去 AI 味/AI 指纹 | novelix"anti-detect"22 条规则、网文工坊 aidetect 12 项量化、novel-writing-framework 13 项硬指标（如"不是X而是Y"≤2/万字、"仿佛/不禁"高频词表） | 已从"感觉"演进为**可量化的规则集**；但平台检测（困惑度+突发性，番茄准确率 95%+）意味着去 AI 味 ≠ 绝对安全 |
| 敏感词/违禁词 | 平台发审（风险段落提示/预审）；网文工坊"错别字与敏感词过审" | 平台规则各不同且动态变化，需配置化词库+人工复核 |
| 排版 | 作家助手/起点一键排版；sumeru finalize 多平台格式导出 | 平台差异（两空格/章节标题/字数上限）需要格式适配层 |
| 多平台发布 | 实为空白：官方工具仅自家平台；开源仅番茄（Playwright 自动化）；无起点/七猫/RoyalRoad 自动化 | 详见 §三 |
| 数据回流 | 仅官方后台（番茄/七猫最全）；开源无回流；qidian-mcp-server 只能采榜单/书评（**月票/推荐票被字体加密**） | 最大缺口 |
| 读者互动 | 起点本章说、番茄章说、晋江段评、七猫段评；无工具化分析 | 评论是低成本数据源（§三） |
| 竞品分析 | 扫榜（起点 14 榜×15 品类 via MCP）+ 拆书（qidian_deconstruct、novel-analyze"扫榜与拆文"） | 已有成熟方法论，缺自动化 |
| 风格学习 | sumeru 风格适配/文风仿写；novelix 仿写；马良公共知识库 | 多为 prompt 级，缺少稳定"语言指纹"建模 |
| 章节存档/版本管理 | Scrivener/yWriter/橙瓜 本地文件；开源 Git 化（ai-fiction-writer"文件即数据"） | 版本化+可追踪是 Agent 流水线的正确地基 |
| 可视化 | novelix Studio（审计通过率环形图、Token 趋势、字符数柱状图、关系图谱）；马良节奏曲线 | web/桌面端居多，缺"实时渲染+数据看板"一体 |

## 三、数据-写作闭环

### 3.1 各平台可获取数据与获取路径

| 平台 | 公开 API | 可用数据 | 典型获取路径 |
|---|---|---|---|
| 番茄 | 无公开 API（App 内部接口被逆向：[FQWeb](https://github.com/zack-sys/FQWeb)，只读） | 作家后台：点击率（<5% 需优化）、**7 日追读率**（>25% 算安全线）、阅读深度（广告解锁）、章节"读完率 vs 跟读率"、章节留存曲线、新增/累计书架、礼物/广告收益；官方福利：保底千字 15–3000 元、礼物收益作者拿 70%（扣除渠道费，[官方福利页](https://fanqienovel.com/welfare)） | 作家后台人工查看或 UI 自动化+截图/OCR；追读/完读率为字节内部指标，无接口、无导出 |
| 起点/阅文 | 无公开 API（App 接口被逆向：[qi-re](https://github.com/kuwoyuki/qi-re)，含签名/解密，读侧） | 作家助手"作品日报"：累计/新增收藏、推荐票、评论；另订阅、月票、打赏、本章说；**月票/推荐票数值被字体加密，采集器读不到**；榜单（14 榜×15 品类）、书评、免费章节内容 | [qidian-mcp-server](https://github.com/d3nnywong/qidian-mcp-server)：Playwright + 2.5–4.5s 随机延迟；付费章节不可得 |
| 七猫 | 无公开 API | 免费/付费双端数据、章节留存流失、流量构成、书评/章评/段评；保底+分成收入 | 七猫作家助手 App/作者中心人工 |
| 晋江 | 无公开 API | 点击、收藏、评论、**积分/营养液/霸王票**、订阅；反爬强 | 作者后台自动化（风险高） |
| 纵横/飞卢 | 无公开 API | 订阅/收藏/月票/打赏 | 作者中心/作家助手自动化 |
| AO3 | 无官方 API（社区库：[ao3-api](https://github.com/ArmindoFlores/ao3_api)、[artefact](https://github.com/edelooff/artefact)、[ao3-toolkit](https://github.com/lucaengelhard/ao3-toolkit)） | hits、kudos、comments、bookmarks、subscriptions；发布仅网页编辑器（无 API 途径） | 社区库/爬虫；已有 [ao3-mcp](https://lobehub.com/zh/mcp/arturlys-ao3-mcp) 接入 Claude |
| Wattpad | 官方 v2 开发者 API 曾存在，现状未验证（developers.wattpad.com 已重定向回主站）；社区文档 [Archive-WP/WattpadAPIDocumentation](https://github.com/Archive-WP/WattpadAPIDocumentation) + [wattpad-rs](https://docs.rs/wattpad-rs/latest/wattpad_rs/) | reads、votes、comments、followers；发布经公开 API **未验证/未文档化** | v3 端点只读抓取；发布用 Playwright |
| RoyalRoad | 无公开 API（[fs-c/royalroad-api](https://github.com/fs-c/royalroad-api) 自述"no official public API，直接抓 HTML"） | follows、favorites、ratings、views（含章节级视图）、reviews | 爬虫库可读可发章（[@fsoc/royalroadl-api](https://www.npmjs.com/package/@fsoc/royalroadl-api) 带 CSRF 处理）；无官方口径 |
| Webnovel（起点国际） | 无公开 API；App 接口被逆向 [qi-re](https://github.com/kuwoyuki/qi-re)（默认指向 webnovel.com） | 阅读、加入书架、评论、Power Stones/Golden Tickets、付费章节 | 读=qi-re/爬虫；写=作家专区 Playwright |
| 开放发布渠道（真正的例外） | **WordPress REST API**（连载站事实标准，[文档](https://developer.wordpress.org/rest-api/)）、**WriteFreely**（[go-writefreely](https://github.com/writefreely/go-writefreely)） | 完整发布+统计 | 官方 API；KDP 无公开 API，仅浏览器自动化技能（[amazon-kdp-skill](https://github.com/joshyattridge/amazon-kdp-skill)） |

**发布自动化现状**：13 个主流平台均**无官方公开发布 API**，现实是"浏览器自动化 / 逆向内部接口 / HTML 爬虫"三选一。开源社区唯一的成熟自动发布 = 番茄：[hchcx/fanqie_auto_publish](https://github.com/hchcx/fanqie_auto_publish)（240★，Playwright 无人值守上传 .txt、断点续传、弹窗斩杀、自动勾选"是否使用 AI"、按每日上限分批）；[amm10090/fanqie-publisher-skill](https://github.com/amm10090/fanqie-publisher-skill)（Playwright+CDP，为 Claude Code/Codex/Cline 等提供薄适配层 + 分阶段安全模式）；[aresbit/claude-skills 的 fanqie-publish](https://github.com/aresbit/claude-skills)（ProseMirror 编辑器注入、弹窗处理、自动归档）。起点/七猫/晋江/RoyalRoad 无可信开源自动化——**真实空白**；RoyalRoad 仅第三方爬虫库能发章（CSRF 处理，风险自负）。真正"开放"的发布渠道只有 WordPress REST API 与 WriteFreely。注意：浏览器自动化受平台条款/反爬/登录态限制，且违规自动发布 AI 正文会直接触发封号。

### 3.2 指标 → 行动映射表

| 指标信号 | 判读 | 对应行动 |
|---|---|---|
| 点击率 < 5% | 标题/封面/导语失败 | 换标题、重做封面、改前三句，A/B 测试 3 版再比数据（[番茄数据解读](https://global.php.cn/zh/faq/1796975690.html)） |
| 7 日追读率 < 25% | 算法推流生死线 | 查第 3–5 章信息断层/情绪断档/冲突铺慢 |
| 第 2–3 章断崖下滑 | 开篇钩子"孤立"，第 2 章平铺设定 | 第 2-3 章接住钩子并升级（黄金三章一条线层层加码）（[六种掉读信号](https://www.wangwen666.com/post/227.html)） |
| 第 5–10 章持续阴跌 | 开始铺设定/支线写早 | 设定"碎着写"，前 10 章只服务一条主线 |
| 单章突兀暴跌 10 点+ | 剧情硬转/人设崩/强行爽点 | 关键转折前 1–2 章铺细节；回扫定位"黄金断崖点"（[数据复盘方法论](https://www.xs91.com/archives/5176.html)） |
| 阅读深度低 | 解锁前的卡点不够"痛" | 悬念提前 200 字，关键反转挪到解锁前最后一句 |
| 完读率低（如 18%） | 读者走不到后面 | 计算**安全字数 = 总字数 × 完读率**，在核心展示区内每 3000 字一小高潮、每 1.5 万字一大转折；删开篇世界观"说明书"；结尾"后果预告"；"获得型"改"损失型"描写（同源案例：三改 5000 字，完读率 18%→32%） |
| 渠道收益率 >15% 但番茄收益低 | 文本适合听书/短剧 | 同步投畅听/短剧渠道 |
| 评论（起点/番茄/晋江） | 分三类信号：追读断层区评论、反复出现的槽点、期待值落差（"我以为 X 结果是 Y"） | 断层区 3–5 条评论即定位问题段；3 个独立读者同说一件事 = 结构问题，按"传达失败"处理；**章内小改（3–5 天窗口，做增补不做重写），大改留到下一卷伏笔**（[评论改稿方法论](https://www.wangwen666.com/post/236.html)） |
| 必须忽略的评论 | 违反主线设定、替作者规划剧情、纯情绪输出 | 评论区是"诊断室"不是"需求池" |

### 3.3 竞品/市场观察

- **扫榜**：起点 14 个榜单 × 15 品类（月票/畅销/阅读指数/书友/推荐/收藏/更新/VIP 收藏/新书四榜/女生两榜），品类趋势分析——[qidian-mcp-server](https://github.com/d3nnywong/qidian-mcp-server) 已 MCP 化。
- **拆书**：AI 辅助拆解对标书前 N 章（qidian_deconstruct / novel-analyze skill），输出"市场趋势报告→对标书拆文→模块库"。
- **平台×类型匹配**：番茄=3 章一爽、主角全程碾压、广告分成+全勤；起点=可 10 章铺垫、群像展开、章节订阅——直播拆解见 [novel-writing-framework](https://github.com/LAY-lgtm/novel-writing-framework)。

## 四、开源项目参考

| 项目 | URL/星 | 架构 | 可借鉴 |
|---|---|---|---|
| 网文工坊 WebNovel Studio | [github.com/tance-mang/chinese-webnovel-skills](https://github.com/tance-mang/chinese-webnovel-skills) | **Claude Code 插件**：33 个技能（选题/灵感/大纲/开篇/金手指/人设/扩写/爽点打脸/节奏标注/追读诊断/去 AI 味/敏感词校对/平台趋势）；配套 CLI（接任意 API）与多模型导出；长期记忆系统（势力/战力/时间线/语言指纹/情绪轨迹/世界状态）；适配起点/番茄/晋江/UC/知乎盐选/Webnovel | ① 与目标插件形态最接近：skill 化 + 插件市场分发；② 平台调性知识库（platform-profiles）；③ 追读诊断=“从读者留存视角审稿”的明确方法论文档（review skill） |
| 网文写作方法论框架 | [LAY-lgtm/novel-writing-framework](https://github.com/LAY-lgtm/novel-writing-framework) | 纯 Markdown skills：writing-novel 基础层 + piqie/qidian 平台层 + 类型层 + novel-improver 改良层；10 维评分/13 项硬性指标/读者模拟评审 | ① 平台×类型决策表；② **三章一轮自检**制度；③ “不是 X 而是 Y”等 AI 指纹量化清洗（663→31 次案例） |
| AI 小说创作助手（十大 Skill） | [Wooooooooood/ai-fiction-writer](https://github.com/Wooooooooood/ai-fiction-writer) | 10 个 skill：扫榜拆文/大纲/角色/知识库/世界构建/逻辑预防/进度/写作/去 AI 味/多视角审稿；PDF 级“逻辑矩阵”“知情边界”“冻结状态”；**Markdown 人审 + HTML/JSON 机器消费双格式** | ① “文件即数据、100% Git 可追踪”的本地优先存储；② 微逻辑卡/动作前四问等**确定性规则**；③ 修改模式（<500 字跳过全流程省 token） |
| 须弥写作 sumeru | [xindoo/sumeru](https://github.com/xindoo/sumeru) | 7 个 Claude Code skill：worldbuilder→topic→outline→write→review→polish→finalize（合规+多平台格式导出）；数据持久化断点续传 | skill 与斜杠命令一一对应、每阶段可跳过/恢复（人工介入） |
| novelix | [zxerai/novelix](https://github.com/zxerai/novelix) | TS CLI/TUI/Studio：每章 10-Agent（规划→编排→写作→审计→修订）；7 个**事实真相文件**×33 维审计；anti-detect 模式 22 条规则+15 题材疲劳词表；审计数据可视化 | ① 真相文件+固定维度清单 = 确定性审计层；② 反机检规则后处理；③ “审计结果反哺系统提示” |
| Novel-OS | [mrigankad/Novel-OS](https://github.com/mrigankad/Novel-OS) | 5 Agent 接力（Architect→Scribe→Editor→Guardian→Curator）；**确定性连续性引擎先行、LLM Guardian 后行**；中央状态文件按章累积 | ① 规则先行/LLM 后行的校验顺序；② 中央状态文件 = 单一真相源 |
| OpenNovel | [Cppys/OpenNovel](https://github.com/Cppys/OpenNovel) | LangGraph：Planner→Writer→Editor→Reviewer→MemoryManager→**PublisherAgent（浏览器自动化发番茄）**；ChromaDB 存章节摘要+角色状态 | ① Publisher 作为流水线一环；② 记忆=摘要+角色状态而非原文 |
| SAGA | [Lanerra/saga](https://github.com/Lanerra/saga) | LangGraph + Neo4j 正典图谱 + YAML/md 产物 + SQLite checkpoint（自我声明非生产可用） | 图谱检索 + 文件人审分离、全流程 checkpoint |
| gpt-author | [mshumer/gpt-author](https://github.com/mshumer/gpt-author) 2,529★ | 线性链：情节候选→大纲→逐章→EPUB（无记忆/无批评环） | 历史基线；证明需求，但架构已过时 |
| qidian-mcp-server | [d3nnywong/qidian-mcp-server](https://github.com/d3nnywong/qidian-mcp-server) | Playwright MCP：榜单×品类、书详情、章节结构、书评、品类趋势、AI 拆书 | **数据侧参考**：MCP 化、反爬限频、已知限制透明化 |
| 发布自动化（番茄） | [fanqie_auto_publish](https://github.com/hchcx/fanqie_auto_publish) 240★ / [fanqie-publisher-skill](https://github.com/amm10090/fanqie-publisher-skill) | Playwright/CDP 上传作者后台：断点续传、弹窗斩杀、AI 复选框自动勾选、分阶段安全模式（预览→填写→提交→验证） | ① 分阶段可验证的发布状态机；② 多 Agent 复用同一 SKILL.md；③ 合规红线警示（封号风险） |

**编程 Agent 写作生态（英文侧，与本节互补）**：Anthropic 官方 [skills 仓库](https://github.com/anthropics/skills) 确立了 SKILL.md 标准；[vibe-noveling](https://github.com/wwt87/vibe-noveling)（Claude Code 13 skills + 4 子 Agent，Save-the-Cat 15 节拍、设定知识图谱、AI 味检查、快照回滚，含 Codex 适配）；[DankerMu/novel-writer-plugin](https://github.com/DankerMu/novel-writer-plugin)（插件市场分发，5 个 Agent + L1–L3 规格契约 + 8 维质量门）；[narrative_workbench](https://github.com/Kerlewor/narrative_workbench)（31 个确定性检查脚本、**伏笔生命周期（开局/推进/升级/回收）+ 半衰期**、性格锁定、共写模式）；[codex-webnovel-writer](https://github.com/EvilSaraphine/codex-webnovel-writer)（Codex 原生 CLI：init/plan/chapter/write/review/doctor）；[InkOS](https://github.com/Narcooo/inkos)（15 个 SKILL 模块 + 本地 SQLite FTS5 检索）；[awesome-llm-story-generation](https://github.com/Picrew/awesome-llm-story-generation)（288 条目索引）。**次要提及**（各 10–40★，人机协作工作台类）：[WinkNovel](https://github.com/winkxiaoxing/WinkNovel)（FastAPI+React 本地工作台，问卷立项→多智能体写作→世界状态维护）、[novel-studio-copilot-cli](https://github.com/tiny-flowlab/novel-studio-copilot-cli)（13 Agent 原生跑在 Copilot CLI，AGENTS.md+hooks 自动质检）、[NovelForger](https://github.com/cedrusdang/NovelForger)（Gemini+LangGraph，英越双语）、[ElyHa](https://github.com/ShadowLoveElysia/ElyHa)（Tauri+ReactFlow 节点式分支剧情）；另见 [Chapter Drafter](https://claudskills.com/skills/chapter-drafter/)（社区 skill，从大纲自动多轮打磨章节）、[ai-novel-writer](https://github.com/mingxiangai81/ai-novel-writer)（13 步流程+去 AI 味）、[AI-Practical-Lab/novel-writer](https://github.com/AI-Practical-Lab/novel-writer)（YAML 角色卡/伏笔追踪/快照回滚，明确非全自动）、[Book OS](https://github.com/forsonny/book-os)（给 Claude Code/Cursor 的结构化上下文）；模型运行时层可参考 SillyTavern/KoboldAI（无 agent 流水线）。更多项目索引：[ecosyste.ms novel-writing 主题](https://repos.ecosyste.ms/topics/novel-writing)。**常见误解澄清**：Typedream 是无代码建站工具（非小说工具）；"Fable"对应三个不同产品（语音文档编辑器 / AI 故事 App / 读书俱乐部 App）；[campfire.ai](https://campfire.ai/) 是无关的 AI 财税公司。

## 五、对"自动化小说写作发布流水线"插件设计的启示

### 5.1 Gap analysis：现有工具缺什么

1. **无全自动闭环**：官方工具锁死单平台、AI 仅辅助；第三方工具无发布无数据；开源项目无数据回流。"创作→发布→数据→调整方向"链条从未跑通。
2. **跨平台统一作品层缺失**：一本小说要按平台调性分叉（番茄快节奏/起点慢热），需要"一套作品 + 多平台影像"的版本化模型，现有工具都假设单一作品。
3. **数据→大纲的自动化建议引擎不存在**：方法论文章很丰富（掉读信号→改法、安全字数、评论三类信号），但没有工具把"后台曲线+评论"自动翻译成"下一卷大纲修改建议"。
4. **实时渲染编辑器缺席**：编辑/预览/数据看板分离在桌面 App 与手机 App 中，缺一个"边写边渲染 + 建议 diff + 曲线"的一体化 Web 界面（这正是本插件要补的）。
5. **合规是硬约束而非可选项**：中文平台政策矩阵（大纲/人设可用 AI、正文严禁；晋江连细纲都禁止；番茄 95%+ 检测准确率、2026-06 处置 15 万本）意味着**全自动代笔=自杀**，必须人机协作 + 创作过程留痕。
6. **发布自动化脆弱且高风险**：无公开 API、登录态/反爬/字体加密/人脸识别提现；需做成"半自动 + 人工确认"而非全面无人值守。

### 5.2 10 条具体设计建议

1. **作品文件即数据（Git 化）**：`novels/<book>/` 下 Markdown 章节 + YAML 设定（角色/世界/时间线/伏笔），全局统一 ID，章级版本化；这是所有 skill/工具共享的唯一真相源（借鉴 ai-fiction-writer 与 SAGA）。
2. **流水线 = 顺序 skill 集**：`选题扫榜→立项→卷纲→细纲→章节卡→草稿→质量门→发布→数据回流→方向建议`，每个 skill 可独立调用、可跳过、可人工接管；预设提供"人机协作模式"开关。
3. **章节卡驱动写作**：每章开写前锁定目标（本章钩子/爽点/出场人物/字数/信息增量/需回收伏笔），写作时强制注入——避免"AI 写飞"与前后不接（番茄内测的核心槽点）。
4. **确定性校验层先行**：规则引擎检查伏笔回收、时间线、战力/伤势/资源状态、OOC、大纲偏离；LLM 评审后置（借鉴 Novel-OS 顺序与 novelix 33 维清单），省 token 且可解释。
5. **平台画像 & 政策矩阵进知识库**：为番茄/起点/七猫/晋江各建 profile（爽点密度、节奏、字数上限、AI 政策、检测要点），发布前合规 gate 自动核对（敏感词预检 + 允许/禁止清单 + AI 声明）。
6. **PlatformAdapter 适配器接口**：`fetchMetrics(book)`/`publish(chapter)`/`fetchComments(book)` 抽象；实现 = 官方 API（如有）→ Playwright 自动化（登录态池、限频、断点）→ 手动 CSV 导入降级；先只做"数据导入+人工确认"的半自动发布。
7. **指标→行动规则引擎 + LLM 报告**：把 §3.2 映射表做成规则（追读<25%→断崖点定位；点击率<5%→标题 A/B；完读率→安全字数内加密），LLM 输出"改稿建议单"进下一轮大纲修订——这是"数据改变写作方向"的自动化落点。
8. **评论哨兵**：定期抓取本章说/段评/书评（注意平台条款），按三类信号自动聚类（轮廓异常/高频槽点/期待落差/必须忽略），生成评论周报并入卷纲评审。
9. **创作留痕 & 反误伤**：自动保存大纲稿、灵感笔记、编辑历史（对平台申诉可自证），可选"AI 指纹评分"（借用 13 项硬指标）帮助作者自查，但定位为**风险管理工具**而非"欺骗检测"。
10. **Web 插件承载"实时渲染 + 建议 + 数据"三合一**：章节实时预览（仿平台排版）、AI 建议以 diff 展示、追读曲线/断崖点标注/评论关键词可视化；发布前显示"最终确认清单"（合规/格式/字数/AI 声明），发布后自动进入数据观察周期并触发前述"指标→行动建议引擎"。

---
*主要信源：各产品官网、[马良写作 18 款工具横评](https://maliangwriter.com/compare/)、[番茄 AI 政策](https://maliangwriter.com/blog/fanqie-ai-crackdown-2026-guide/)、[番茄数据解读](https://global.php.cn/zh/faq/1796975690.html)、[数据复盘方法论](https://www.xs91.com/archives/5176.html)、[六种掉读信号](https://www.wangwen666.com/post/227.html)、[评论改稿](https://www.wangwen666.com/post/236.html)、[阅文创作大会](http://m.cnhubei.com/content/2025-10/16/content_19581770.html)、[钛媒体](https://www.tmtpost.com/6922114.html) 及上述 GitHub 仓库 README。*
