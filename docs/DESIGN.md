# 设计方案：dsh-novel-writing（自动化小说写作发布流水线）

> 目标读者：维护者/贡献者。安装与使用见根 README。

---

## 一、设计目标

基于 [peterwangze/claude-writing-workflow](https://github.com/peterwangze/claude-writing-workflow)（原项目不动），在 DeepSeek Harness（DSH）上构建**自动化小说写作发布流水线**：

1. 迁移源工作流为 DSH **agent 预设**（Coordinator 人设 + 29 SKILL + 16 Agent 参考）；
2. 小说**项目管理**与**人与 AI 高价值互动**（决策确认、请求队列、门禁确认）；
3. **写作过程可视化 + 内容实时渲染**（工作台视图、2s 轮询、HUD）;
4. 章节内容**编辑保存与优化建议**（门禁化保存 + 机器审计 + AI 优化请求闭环）；
5. **多平台自动化配置发布与数据获取**（export/command/manual 三模式 + fetchCommand 适配器）；
6. **基于数据的动态优化**（信号检测 → 调整优先级 → 用户确认 → 执行 → 验证闭环）。

非目标：绕过平台风控的无人值守发布；AI 完整代写（源工作流的 A/B/C 合规立场保留：人类是创作主体）。

## 二、总体架构

```
┌───────────────────────────── DSH Host ──────────────────────────────┐
│  bundle 行 novel-writing (dsh-novel-writing)                        │
│  ├─ novel-writing 服务（Service 子类）                               │
│  │   ├─ workspace 扫描 / workflow-state 增量读写（兼容源 schema）     │
│  │   ├─ 看护门禁引擎（context card 解析：必写场景/禁止项；覆盖率/偏离）│
│  │   ├─ 机器审计（字数/段落/钩子/AI 痕迹）                            │
│  │   ├─ 发布适配（dist 导出 + 发布清单 + command 执行 + 发布日志）     │
│  │   ├─ 数据入库与信号检测（5 类信号阈值表）                          │
│  │   └─ 请求队列（18-requests/，UI→agent 协作通道）                   │
│  ├─ webServer 路由 /novel-writing/api/*（默认回环，settings 可开 LAN）│
│  └─ 预设同步：包内 agent-presets/novel-writing → $DSH_HOME/.agent-presets │
│                                                                      │
│  preset novel-writing（agent 平面，会话挂载）                         │
│  ├─ standard 全量工具行 + Coordinator persona（三层角色模型）          │
│  ├─ skill-filesystem.customSkillDirs → 预设自带 skills/（29 个）      │
│  └─ tool-novel → dsh-novel-writing/tools（10 个 novel_* 工具）        │
└──────────────────────────────────────────────────────────────────────┘
┌──────────────────────────── Browser ────────────────────────────────┐
│  conversation.view「小说」工作台：书目/章节/工作流/数据/发布/请求      │
│  sidebar.footer.action「小说 HUD」+ shell.overlay 浮层（3s 轮询）     │
│  settings.section「小说写作」：workspaceRoot/平台配置/轮询/访问控制    │
│  数据面：fetch /novel-writing/api/*（2s 轮询实时渲染）                │
└──────────────────────────────────────────────────────────────────────┘
```

**平面划分依据**（cordis 组合规范）：`novel-writing` 服务被浏览器与任意会话读取 → 宿主 bundle 行；novel 工具只服务写作会话 → 预设行（`dsh-novel-writing/tools` 可选依赖宿主服务，缺席时注册 0 工具，预设仍可挂载）；skills 随预设目录走（`baseUrl` 相对解析，预设拷到哪都能用）。

## 三、数据模型

- **工作区**：`workspaceRoot`（settings `novel-writing.workspaceRoot`，默认 `~/novels`）下每部小说一个目录，内含 `novel-project/`（与源工作流 00-17 结构完全兼容，旧项目直接续用）。
- **状态**：`novel-project/workflow-state.json`（源 schema + 增量更新语义；guardrails 只由 AI 合规/正文阶段写）。
- **插件私有**：`novel-project/.dsh-plugin/`（meta.json 章节元数据/门禁结果/审查分数、publish-log.json）；`18-requests/`（UI 请求）；`11-data-monitoring/metrics.json`（数据）；`dist/<平台>/`（发布产物）。
- **事件**：每次变更 `version+1` 并 emit `novel-writing/changed`；浏览器靠轮询 overview 感知（版本号 + 全量小响应）。

## 四、质量门禁：从「约定」到「代码」

源工作流的最大弱点是门禁依赖 LLM 自觉。本设计把**机械可判**的部分下沉为代码（保存即强制），语义部分保留 subagent 审查：

| 门禁 | 执行者 | 机制 |
|---|---|---|
| 场景覆盖率=100% | **代码**（gateCheck） | 解析 context card「本章必写场景」→ 标题精确命中或描述关键词 4 字滑窗模糊命中 ≥2 |
| 偏离度=0% | **代码**（gateCheck） | 解析「禁止偏离项」→ 「不得让 X」懒提取人名 + 引号术语提取 → 正文零命中 |
| 保存阻断 | **代码**（saveChapter） | 未通过且非 force → 拒绝写盘并返回明细；force 留痕（forced 标记，协调者须重审） |
| 审查有效性 | **代码**（novel_review_submit） | <2 条发现即拒绝；分数/发现/硬门禁结构化落盘 |
| 发布合规 | **代码**（novel_publish） | release_allowed=false 直接拒绝 |
| 数据信号 | **代码**（ingestData） | 入库即检 5 类阈值信号并给行动建议 |
| 语义审查（OOC/逻辑/商业/体验/AI 痕迹密度） | **subagent**（预设 skills） | 6 审查员并行 + 防放水 + 9 维 100 分制（源规范全量保留在 SKILL） |

## 五、发布与数据通道（三级降级，诚实边界）

```
发布：export（dist 产物 + 发布清单）→ command（导出后执行用户配置的自动化命令，
      env: DSH_NOVEL_DIR/DSH_PROJECT_DIR/DSH_DIST_DIR/DSH_PLATFORM）→ manual（仅清单）
数据：官方 API（各平台均无）→ fetchCommand（用户自建浏览器自动化，stdout JSON 行）
     → 工作台手动录入（保底，每日一行）
```

不做：无人值守绕过平台风控；对封号风险的自动化默认关闭且需用户显式配置。

## 六、兼容性与版本策略（针对两个真实故障的设计）

1. **依赖架构**：`@deepseek-ai/*` 全部 `peerDependencies`（`*`），`dependencies: {}`。解析路径：插件真实路径向上查找 → profile node_modules（无）→ `$DSH_HOME/profiles/node_modules`（宿主闭包，与宿主同实例）。杜绝双闭包（thinking-level 故障根因）。CI 有静态守卫断言。
2. **能力探测 + 优雅降级**：宿主行对 `webServer` 用 `ctx.get` 可选注入（缺席仅告警，服务仍可用）；工具行对 `novel-writing` 与 `tools` 均可选（缺席注册 0 工具，预设照常挂载）；所有 settings 读取有默认值兜底。API 漂移（router 故障模式）时插件退化为「无 UI 的项目管理」，不崩 boot。
3. **boot 安全**：宿主行 apply 内所有 I/O 包 try/catch；ensurePreset 失败只告警不阻断；任何异常不得向加载器抛出致命错误。
4. **兼容矩阵**（README 维护）：实测 0.1.0-rc.7 / 0.1.1-rc.2；peer `*` 理论上向前兼容，破坏性变更以「实测版本」为准。
5. **验证管线**（每次发版必跑，命令见 README）：
   - `node --check`×3 + `node test/validate-preset.mjs`（loader 同源解析 + 逐行模块解析）
   - `node test/smoke.mjs`（24 项宿主逻辑断言，mock ctx）
   - **隔离 boot**：全新 `$DSH_HOME` → `dsh plugin --profile X add link:<repo>` → `dsh --profile X --dump-config`（组合含 novel-writing 行）→ `dsh web --port 3100` → `curl /novel-writing/api/overview == 200`
   - 动态探针铁律：不触碰沙箱未暴露的 ctx 属性（logger 等），验证代码不常驻。

## 七、路径规划（Roadmap）

- **v0.1（当前）**：迁移 + 门禁代码化 + 工作台（阅读/编辑/工作流/数据/发布/请求）+ HUD + 设置页 + 三级发布/数据通道 + 验证管线。
- **v0.2**：工作台增强——章节对比视图（修订前后 diff）、审查面板聚合展示、信号趋势图；发布命令模板库（Playwright 番茄/起点示例脚本，默认关闭）。
- **v0.3**：数据适配生态——CSV/截图 OCR 导入向导；多书看板；数据→细纲自动修订建议（仍需用户确认）。
- **v0.4**：协作增强——多 session 同书协调（写锁）、黄金三章专项模式、读者评论关键词回流。

## 八、风险与对策

| 风险 | 对策 |
|---|---|
| DSH 大版本破坏 seam | peer `*` + 探测降级 + 隔离 boot 验证随版本重跑；兼容矩阵明示实测版本 |
| 平台风控/合规 | A/B/C 分级保留；自动化默认关闭；发布前 web_search 复核平台政策写进 SKILL |
| 机械门禁误判（关键词歧义） | 门禁输出明细（缺哪些场景/命中哪些禁词）供 agent 与人复核；force 通道留痕 |
| 数据指标口径差异（追读 vs 完读） | 数据面板标注口径；信号表内嵌定义（来自平台公开口径核实） |
| 预设升级覆盖用户改动 | 预设目录由插件拥有（版本标记同步）；用户 fork 到新 id 可保留自定义 |
