# CLEAN-004 — 缺陷与三态裁定（DEFECTS）

**任务**：CLEAN-004（P2）· **作者**：QA Agent · **日期**：2026-09-14 · **仓库**：`D:\AI\agent\deepseek\harness\writing-workflow`
**HEAD**：`21b100ce9ac32e534c6215e507f9835f87e0ff4c`（`lib/client.js` / `lib/index.js` 工作区干净）
**证据源**（全部在本目录，可复核）：

| 证据 | 文件 | 说明 |
|---|---|---|
| **R2 返工记录运行（本轮权威）** | `report.json`（= `report-rework2-run.json`，sha256 `a6d8ae0f…`，`tally 49 / PASS 42 / FAIL 4 / N-A 3`，`05:13:45→05:16:55Z`，exit 1） | 隔离实例 + 无头 Edge 全量探针，`cleanup.rootRemoved=true`，无 crash；探针 `de2de511…`（= 终版，运行后未再编辑） |
| R1 返工记录运行（**已被 R2 否证**） | `report-rework-run.json`（`tally 49 / 40 / 6 / 3`） | 含 `B21a` 伪 PASS（R2 N-01）与 D-3 假阳性（R2 N-03）；保留供对照 |
| 返工过程运行（非权威） | `report-rework-discovery.json`（`tally 49 / 39 / 7 / 3`） | 与上者**非同源**（`E1` 谓词/label 不同，见 README §5.3）；保留供对照 |
| R1 期独立复跑 | `report-run1.json`（`tally 48 / 34 / 6 / 8`） | 返工前基线，保留对照 |
| 修复前崩溃运行 | `report-final4-crash.json`（`%TEMP%\clean004-final4` 的原件已随残留清理，本目录副本即原件，仅脱敏实例 token） | `tally 30 / 27 / 3 / 0`、`crash=TypeError@851`、`cleanup` 未落盘 |
| 探针源码 | `probe-clean-004.mjs` + `probe-clean-004.final-rev-b1f1c8c0.mjs`（同 sha256） | 本任务的测试资产（允许修改；修订记录见 README §5.3） |
| 谓词可失败性 + 同源机证 | `falsifiability-check.mjs` / `falsifiability-check-stdout.log` | 提取共享登记表 `PREDICATE_REGISTRY` 独立求值：**9/9 BOUND**、19 red / 11 ok 全过、`BINDING-OK=true`、`CHECK-OK`（exit 0） |

> **R2 处置**：`docs/review/CLEAN-004-TEST-R2.md` 的 N-01~N-05（BLOCKING）与 N-06~N-08（P3）**逐条落地**；本文档相对 R1 版的关键变化：
> ① **D-3 撤回**（§3）；② `D-2` 跨运行引用逐项标注 + 收敛时限改实测口径（§2）；③ `§0/§4/§5` 状态与计数按 R2 记录运行重生成；④ 新增 **§6 观察项 O-1**。
> **只报不改**：本文档不含任何 `lib/**` 变更。修复动作归属 Developer。
> **级别口径**（本任务自述，避免与 Code Review 的 P0~P3 混淆）：
> **P0 阻塞** = 崩溃/数据丢失/安全/主流程不可用（=0 即满足硬门槛）；**P1 关键** = 主功能缺陷且无合理绕行；
> **P2 重要** = 功能缺陷但有绕行；**P3 一般** = 交互/易用性/观感缺陷。

---

## 0. 裁定总表

| # | 断言 ID | 本次记录运行状态 | 三态裁定 | 级别 | 一句话依据 |
|---|---|---|---|---|---|
| 1 | `D2-esc-bind-yield`（Esc 在绑定面板态只关面板） | **FAIL** | **产品缺陷** D-1 | **P3** | 让位契约成立但无人接手：`client.js:3236-3239` 在 `s.bind !== null` 时 `return`，`BindDialog` 全文无 Escape 监听（`grep -n Escape lib/client.js` 仅 `L3237` / `L3772`）⇒ Esc 静默失效；同轮 `B17`（新建弹窗态）PASS 为对照 |
| 2 | `C3b-binding-convergence`（自动链绑定在会话镜像收敛） | **FAIL** | **产品缺陷** D-2 | **P2** | 绑定已写入、会话已落盘、**宿主工作区表已挂该会话** ⇒ 不是「建会话失败」也不是「隔离 fixture 取景」；卡片仍按 `s.byId[boundId]` 查镜像落空 ⇒ `statusOfEntry(undefined)='stale'` ⇒ 显示「会话失效」 |
| 3 | `C5-split-panels`（分栏三面齐备） | **PASS**（两次干净运行） | **时序 artifact**（R2 已加独立信号 `C-face-availability`，见 §3） | — | final4 该点读到 `splitClosed=true`（单次快照，无「分栏稳定」等待、无关闭事件记录）；两次干净运行 `splitFate` 13/13 采样 `split=true, bar=true, consoleEl=false` ⇒ 分栏并未自发消失；触发面（`sessions.current` 变化）属 UX-014⑧ 设计契约，其上游竞态即 D-2。**R1 F-06 订正**：闸门原会把「C1 已打开而 C5 不在场」整体吸收为 N-A ⇒ 现追加 `C-face-availability` 独立断言（`splitOpened ∧ splitClosed ⇒ FAIL`），使该类回归**有变红通道** |
| 4 | `B21a-search-find-sessions`（关键词命中会话 → 「找到的会话」行） | **PASS**（R2 返工后） | **无缺陷**（R2 N-03：原判定的 D-3 **已撤回**，见 §3） | — | 检索前提改为「宿主已认可会话的 UI 展示串 `session-<uuid>`」⇒ **命中**：`foundTitle='找到的会话（1）'`、`rows=[{t:'novels'}]`（`facts.b21Measurement`）。原 FAIL 系**关键词与 `displayTitleOf` 口径无交集**造成的假阳性；原谓词 `ackComplete === true` 无 FAIL 通道（R2 N-01 P1）已由共享登记表 `B21a-search-find-sessions` 取代（有红通道） |
| 5 | `B21b-search-find-sessions-retest`（收尾复测） | **PASS**（R2 返工后） | **无缺陷**（同上；D-3 撤回后不再主张「镜像未反映宿主会话」） | — | §16 同关键词复测命中；`mirrorProbe.consoleOpen=true`（`attempts=0`，非探针早退） |
| 6 | `B22-session-row-opens`（点会话行 → 打开会话并关控制台） | **PASS**（R2 返工后首次取得） | — | — | 检索命中后有行可点 ⇒ 点击后控制台关闭（`rowClick.clicked=true ∧ consoleOpen=false`）；R1 期的 N-A 前置（无行可点）消失 |
| 7 | `FALSIFIABILITY-PROOF`（谓词可失败性机证 + 同源） | **PASS**（R2 返工后） | — | — | 共享登记表 9 谓词 / 19 反例向量全红 / 11 正例向量全真；9/9 有源码级 `evalPred` 消费点（`report.predicateStaticSites`）；见 §5 与 README §9 |
**阻塞缺陷数 = 0（P0 = 0，P1 = 0）**；P2 ×1（**D-2** 绑定收敛）、P3 ×1（D-1）；**D-3 已撤回**（探针缺陷 + 假阳性，非产品缺陷，见 §3）⇒ 无「把探针缺陷算作产品缺陷」项。
**R2 N-03 撤回影响**：原「D-3 与 D-2 同族、建议合并 Developer 定位」的建议**同步撤回**——`B21a`/`B21b` 已实测命中，不构成第二症状。
**R1 findings 对 DEFECTS 的影响**：F-03（B21×2/B22 重定判定依据）已落实为本表第 4/5/6 行；F-06（C5 闸门偏宽）已在 §3 落实。

---

## 1. 缺陷 D-1（产品缺陷，P3）— Esc 在绑定面板态静默失效

**断言**：`D2-esc-bind-yield` — Esc 在绑定面板态只关面板（控制台保持打开）——B-1 让位写实态
**实测（记录运行，exit 1）**：`{"modal":true,"console":true}`（`.nv-modal` 仍在场、控制台仍在场）
**对照（同轮 PASS）**：`B17-esc-layer-yield` = `{"modal":false,"console":true}`（新建弹窗 `.nv-cmodal` 态下 Esc 正常）
**取证截图**：`04-bindpanel-after-esc.png`（按 Esc 之后：绑定面板 + 控制台同时在场，`docs/evidence/CLEAN-004/`）

**复现步骤**
1. 打开控制台（点侧栏「📖 小说管理工作台」标题行）。
2. 在控制台网格或侧栏抽屉里点一本**失效绑定**书的 🔗（fixture `nn-stale-bound`「失效绑定书」）。
3. 绑定面板 `.nv-modal` 打开（标题「绑定会话」/「为本书选择一个会话」/「新建会话并绑定」三面齐备 —— `D1` PASS）。
4. 按 <kbd>Esc</kbd>。
5. **期望**：面板关闭、控制台保持打开（让位层级 B-1）。**实测**：面板不关、控制台也不关——Esc 无任何可见效果。
6. 补充观测：面板可用「点遮罩」关闭（探针恢复路径即用 `backdrop.click()`，`facts.reopenDiag.bindPanel` 前后变化可查）；键盘路径无绕行。

**代码位置（判据来源）**

| 位置 | 事实 |
|---|---|
| `lib/client.js:3236-3239` | `NvConsole` 的 Esc 处理器：`if (s.bind !== null \|\| s.entryOpen === true) return` —— **让位**给绑定面板/工作区浮层 |
| `lib/client.js:2626+`（`BindDialog`） | 全文**没有** Escape 监听 ⇒ 让位之后无人接手 |
| `grep -n "Escape" lib/client.js` | 仅两处：`L3237`（控制台 Esc，即上表让位点）、`L3772`（创作台 `onKey` → `closeWorkbench`） |
| `lib/client.js:241` | 文案契约：`closeSplit: '关闭分栏（Esc）'` —— Esc 是**对外承诺**的关闭键，静默失效与该承诺冲突 |

**影响**：键盘/无障碍路径下无法关闭绑定面板；用户按 Esc 后无反馈（面板仍在），易误判为界面卡死。非数据面问题，有鼠标绕行（点遮罩 / 取消钮）。
**级别**：**P3**（交互缺陷，有绕行）
**建议修复方向（不属本任务范围）**：`BindDialog` 自挂 Esc 监听（与 `NvConsole` 让位契约配对）；注意 `client.js:2660+` 注释的「hook 恒定调用」契约，改动不得破坏 hook 计数。
**用户侧复核项**：`docs/verification/CLEAN-004-checklist.md` §8 `U-8`。

---

## 2. 缺陷 D-2（产品缺陷，P2）— 自动链绑定后卡片长期停「会话失效」（会话镜像未收敛）

**断言**：`C3b-binding-convergence` — 自动链写入的绑定在会话镜像中收敛（卡片脱离「未绑定/会话失效」）
**实测（**权威记录运行** `report.json`，R2 返工，`05:13:45.162Z→05:16:55.181Z`）**：`converged=false`；13 次采样（1 s 粒度，`05:14:05.991Z→05:14:18.088Z`）**13/13** 为「会话失效」（`dotSt=stale`）；
**同轮 `D4`（`05:16:37Z` 断言、`autoCreateBound` 读数）= PASS**（`bound=true`、`sub='outline_writing · 3章 · 1200字'`）——**其谓词只读 `cards`/`id`/`drawerCards`/`bound`，不读 `sub`/`dotSt`** ⇒ PASS 仅证明「绑定已写入 ∧ 卡片计数达标」；同轮抽屉卡在 `05:14:05.991Z→05:14:18.088Z` 的 **13/13 帧仍为「会话失效」**，**卡片状态的收敛时点无直接读数**（仅以 `D4` 的 `bound=true` 作为上界佐证）。**R5 NEW-R5-01 订正**：原写「同一运行内卡片先 `stale` 后收敛」属陈旧自述（谓词不读该状态）。
**跨运行对照（R2 N-05 订正：逐项标注运行来源，禁止跨运行混引）**：

| 运行 | `D4` 状态 | `D4` 读数 | 卡片收敛情况（含时限） |
|---|---|---|---|
| **权威记录运行**（`report.json`，`05:13:45→05:16:55Z`） | **PASS**（`D4` 断言时刻 `05:16:37.313Z`） | `autoCreateBound = {sub:'outline_writing · 3章 · 1200字', bound:true}` | **`stale` ≥ 2′06″**（首采样 `05:14:05.991Z` 起 13/13 帧「会话失效」；`C9.reopenDiag.drawerSubs[0]` 于断言时刻 `05:16:12.460Z` 仍为「…会话失效」⇒ 末次直接读数跨 `05:14:05.991Z → 05:16:12.460Z` = **2′06.5″**）；**上界 ≈ 2′31.3″**（`D4` 于 `05:16:37.313Z` 已 bound ⇒ `05:14:05.991Z → 05:16:37.313Z` = **2′31.3″**；**R5 NEW-R5-02 订正**：原写 `≤ 2′31″` 比实测紧 0.322 s） |
| `report-run1.json`（R1 期独立复跑） | **FAIL** | `autoCreateBound = {sub:'…会话失效', bound:false}` | **不收敛**（同窗口恒 `stale`，`D4` 时刻仍未 bound） |
| `report-rework-discovery.json`（R2 过程运行） | **PASS**（`D4` 断言时刻 `04:37:28.093Z`） | `autoCreateBound = {sub:'outline_writing · 3章 · 1200字', bound:true}`（该轮 stdout `L49` = `OK D4-auto-create-book-persisted`） | 先 `stale` 后收敛：同轮 `C3b`=FAIL（`converged=false`，采样窗 `04:35:05.402→04:35:17.459Z` 13/13 `stale`）⇒ 自首采样起 **≤ 2′22.7″** 收敛。**R4 NEW-R4-01 订正**：原写「FAIL / `bound=false` / 不收敛」三格均系跨运行混引，与实体矛盾 |

⇒ **R2 N-05 订正**：① 原 §2 行 (d) 与本节旧文把「同轮 `D4` 亦因 `bound=false` FAIL」并列，实为**跨运行混引**（`D4`=FAIL 出自 `run1`；记录运行 `D4`=**PASS**）——已按上表逐项标注来源；
② 「卡片**长期**停『会话失效』」的措辞改为**实测时限**口径：**≥ 2′06″ 未收敛、≈ 2′31.3″ 内收敛**（下界 = 记录运行内的**末次直接读数**：首采样 `05:14:05.991Z` → `C9.reopenDiag.drawerSubs[0]` 读取时刻 `05:16:12.460Z` 仍为「会话失效」；上界 = 同轮 `D4`（`05:16:37.313Z`）已 bound 的时刻；探针**未**记录收敛瞬间的精确时刻 ⇒ 区间内取值不做更细主张。**R3-05 订正**：原括注「`05:15:52Z` 前后 `C9` 前的 `settleToBound` 20 s 等待仍超时」在时序上**不可能**——该 20 s 窗口实际位于 `C8` 断言（`05:14:20.080Z`）之后、约 `05:14:20→05:14:40Z`；且原下界 `1′46″` **低估**了实测未收敛时长，现改用 R3 审查者核定的保守值 **≥2′06″**）；
③ 三轮表现**不同**（记录运行：先 `stale` 后收敛（≤2′31.3″）；`run1`：**全程不收敛**；`discovery`：先 `stale` 后收敛（≤2′22.7″）——**R4 NEW-R4-01 订正**：原写「`run1`+`discovery` 不收敛」对 `discovery` 不成立）⇒ 该现象**非确定性**；D-2 定级仍为 **P2**（用户可见契约「建会话并绑定 ⇒ 卡片转已绑定」在 ≥2′06″ 内未兑现；`run1` 全程未兑现），但「确定性失效」的表述**已撤下**。

**判别证据链（为什么不是「建会话失败」/「隔离取景差异」/「环境问题」）**

| # | 观测面 | 实测值（记录运行 = 权威 `report.json`） | 推论 |
|---|---|---|---|
<!-- BEGIN: DEFECTS-EVIDENCE-CHAIN (generated by gen-defects-evidence.mjs) -->
| a | 插件 overview API（`GET /api/overview`） | `bindings.zz-first-probe = session-22721558-1eda-4029-bcfc-d2b3c40d7a5e`（HTTP 200） | 自动链**已写入绑定** |
| b | 隔离实例 `settings.yaml` | `novel-writing.bindings.zz-first-probe = session-22721558-1eda-4029-bcfc-d2b3c40d7a5e`、`boundIdOnDisk = true`（`facts.isolatedDisk.settingsYaml` 含该 id = true） | 持久化面成功 |
| c | 隔离实例会话存储 `$DSH_HOME/sessions/<ws-dir>/`（`<ws-dir> = --…-novels--`，全名见 `report.json.facts.isolatedDisk.sessionDirs[0]`） | ["session-22721558-1eda-4029-bcfc-d2b3c40d7a5e","session-e8df27a0-7c7c-46ee-b69c-8db255124998"]（去重后 ["session-22721558-1eda-4029-bcfc-d2b3c40d7a5e","session-e8df27a0-7c7c-46ee-b69c-8db255124998"]，共 2 项；`boundIdOnDisk = true`） | 会话**确实建出来了**（与宿主默认会话同目录同级） |
| d | 宿主工作区表 `$DSH_HOME/storages/workspace.json` | `tables.workspaces["c986fb89-c663-40c4-bcfa-b954fd02738b"].sessionIds` **首项即该会话**（["session-22721558-1eda-4029-bcfc-d2b3c40d7a5e","session-e8df27a0-7c7c-46ee-b69c-8db255124998"]），`updatedAt = 2026-09-14T05:14:04.079Z`、`createdAt = 2026-09-14T05:13:45.146Z`——**取值口径**：本行全部数值由 `report.json`（权威记录运行）经 `gen-defects-evidence.mjs` **逐格机读抽取**（无手工转录）；`workspace.createdAt` 是宿主工作区表条目的创建时刻（≠ 会话创建时刻），两者相差 19 s；独立复跑 `report-run1.json` 自洽给出另一组（`workspaces["5a763818-…"]`，`session-52f36262-…`，`updatedAt = 04:06:02.503Z`）⇒ 跨运行**不得混引** | **宿主自己把该会话挂进了 fixture 工作区** |
| a′ | 插件宿主面 `overview.bindings` + `storages/workspace.json` + `sessions/<ws>/` | `facts.sessionAckIds.hostWorkspaceSessionIds = ["session-22721558-1eda-4029-bcfc-d2b3c40d7a5e","session-e8df27a0-7c7c-46ee-b69c-8db255124998"]`（`boundId = session-22721558-1eda-4029-bcfc-d2b3c40d7a5e`；`source = overview.bindings + storages/workspace.json + sessions/<ws>/`） | (a)(c)/(d) 中**另一条** id `session-e8df27a0-7c7c-46ee…` 是宿主默认会话，非本场景产物 |
<!-- END: DEFECTS-EVIDENCE-CHAIN -->
| e | 插件会话镜像消费面（卡片/抽屉卡） | R2 权威记录运行：13 s 内恒「会话失效」（`dotSt=stale`），其后收敛（同轮 `D4`=PASS @`05:16:37.313Z`）；`run1` **全程**不收敛；`discovery` 与记录运行同形态（先 `stale`、`D4`@`04:37:28.093Z` 已 bound） | 卡片状态判定在收敛前恒 `stale` ⇒ 用户在此期间看到「会话失效」（**非确定性**，见上表；**R4 NEW-R4-01 订正**：原写「`run1`/`discovery` 两轮则不收敛」对 `discovery` 不成立） |
| f | 插件「找到的会话」搜索面 | R2 权威记录运行：以 `session-<uuid>` 为关键词 **命中**（`foundTitle='找到的会话（1）'`、`rows=[{t:'novels'}]`），`B22` 点击行为 **PASS** | **不属 D-2 症状**：搜索面对该会话**可见**（`run1` 的「恒空」系关键词口径错误 ⇒ 该「症状」随 D-3 撤回一并撤销） |

⇒ a~d 成立而 e（收敛前）不成立：缺陷在**「宿主已认可的会话 → 插件镜像 → 卡片状态」这一段链的收敛时延**，与创建/绑定/工作区注册均无关。
**范围收窄（R2 N-03/D-3 撤回的连带订正）**：D-2 **不再**包含「搜索消费面恒空」这一症状——该症状已被证否（行 f）。

**代码位置（判据来源）**

| 位置 | 事实 |
|---|---|
| `lib/client.js:2874-2877`（抽屉卡）、`L2978-2981`（控制台卡）、`L4240`（工作台控制条） | 三处同款消费：`useSessions((s) => s.byId[boundId] ?? null)` |
| `lib/client.js:1428-1434` | `statusOfEntry(entry)`：`entry == null` ⇒ `'stale'` |
| `lib/client.js:2877-2881` | `st === 'stale'` ⇒ 副文案追加 i18n `stale`（「会话失效」） |
| `lib/client.js:1575` | 写入侧：`launcher.bindSession(novel.id, sessionId)`（写入成功，见证据 a/b） |
| `lib/client.js:1339-1372` | 镜像来源：`ctx.get('sessions').list` ObservableSnapshot 订阅（`makeSessionsHookReactive`）——**镜像为何缺该 id**（快照未刷新 / `byId` 键口径与 `sessions.create` 返回的 `sessionId` 不一致 / 服务实例不同）需 Developer 定位 |

**复现步骤**
1. 隔离实例（`node docs/evidence/CLEAN-004/probe-clean-004.mjs --out <dir>`）或真实实例中打开控制台。
2. 点一张**未绑定**卡（fixture `zz-first-probe`「孤星纪元」）。
3. 自动链执行：`sessions.create` → `agentPresets.select` → `bindSession` → `open` → `ensureSplit` ⇒ 分栏打开（`C1` PASS）、标题正确（`C2` PASS）、挤法生效（`C3` PASS）。
4. 观察侧栏抽屉卡副文案 / 控制台卡片双圆：**恒为「会话失效」**（≥13 s 无收敛）。
5. 关闭分栏（✕）后从卡片重开（`C9`）⇒ 点击落入**失效重绑分支**（`facts.reopenDiag.bindPanel=true`：绑定面板被打开），分栏重开失败。

**影响**（同源下游，均已在记录运行中体现）

| 断言 | 状态 | 与 D-2 的关系 |
|---|---|---|
| `C9-width-memory` | FAIL `{reason:'分栏重开失败', settleToBound:false, reopenAttempt.subBefore:'…会话失效', reopenDiag.bindPanel:true}` | 20 s 等待「卡状态收敛」超时 ⇒ 点击走失效重绑 ⇒ 分栏无法重开 |
| `C10-flip-side` | FAIL `{sideAfter.splitOpen:false, chatSide:'right'}` | 分栏未重开 ⇒ 无 ⇄ 可点，`chatSide` 不变 |
| `D4-auto-create-book-persisted` | **PASS** `{autoCreateBound:{sub:'outline_writing · 3章 · 1200字', bound:true}}`（断言时刻 `05:16:37.313Z`） | 判据末项与 C3b 同源：`D4` 谓词 = `cards===8 ∧ id 含 zz-first-probe ∧ drawerCards≥10 ∧ autoCreateBound.bound===true`（**不读** `sub`/`dotSt`）⇒ PASS **仅**表示「绑定已写入 ∧ 卡片计数达标」，**不得**读作「卡片状态已收敛」（同格 `detail.afterCreate.drawerSubs[0]` 在该时刻仍为 `'…会话失效'`、`dotSt='stale'`）。**R5 NEW-R5-01 订正**：原括注「同轮已收敛」与实体矛盾（另注：该断言文案里的「总 11 本」是陈旧期望——自动链建**会话**不建**书**，fixture 仍 10 本；文字问题，不改判定）。**R4 NEW-R4-01 订正**：原写 FAIL `{bound:false}` 系误取 `report-run1.json` 的 `D4`（FAIL @`04:10:28.407Z`）——属 R2 N-05/F-12 未彻底闭合 |
| `E1-E4` / `F1` | **PASS ×5**（`E1` @`05:16:26.733Z`、`E2` @`05:16:27.922Z`、`E3-long-notice-geometry`、`E4-notice-close`、`F1-split-claim-event`） | 本运行 N-A 仅 3 条（`B5`/`C11`/`D6`）——notice 面与 `dsh:split-claim` 面**均已取得观测**（R2 返工用未绑定卡 `mm-third-probe` 构造前置，见 README §4 与 checklist C-13~C-16）。**R4 NEW-R4-01 订正**：原写「N-A ×5」与实体及各文档矛盾 |

**级别**：**P2**（自动链的用户可见契约「建会话并绑定 ⇒ 卡片转为已绑定」未兑现；分栏当下仍可用，属有绕行但会误导用户以为会话已失效）。
**未定性边界（诚实声明）**：真实用户实例上的表现需 `U-4` 目检（本任务**不得**触碰用户正在运行的 DSH 实例）。但**本结论的归属已由 a~d 锁定**——不得表述为「环境问题」或「隔离 fixture 取景差异」。
**建议**：另立缺陷任务（Developer），输入 = 本节证据 + `report.json` 的 `facts.isolatedDisk` / `facts.convergence`。

---

## 3. ~~缺陷 D-3~~ **已撤回（依据不足 + 被反驳）** — 插件会话镜像未反映宿主以认可会话（原判定）

> **状态：WITHDRAWN（R2 裁决）— 探针/清单/README 均不得再将其表述为产品缺陷。**
> **撤回人**：QA Agent（R2 返工）· **裁定来源**：`docs/review/CLEAN-004-TEST-R2.md` N-03 / §5-5（Test Reviewer 独立复核）
> · **Coordinator 同步**：`plan-tracker` 中「D-3 并入 BUG-009」的裁定已同步撤回（派发单原文）。

### 3.1 原主张（R1 返工时的判定，已被否证）

R1 返工曾把 `B21a`/`B21b` 的形态判定为 **P2 产品缺陷 D-3**：「宿主三面认可该会话（`overview.bindings` ∧
`storages/workspace.json` 的 `sessionIds` ∧ `$DSH_HOME/sessions/<ws>/`），而插件镜像 `sessionsAll.ids` 为空
⇒ 『找到的会话』区不渲染 ⇒ 镜像未反映宿主会话」。
**该主张的两个支点均被证否**：① 「镜像 `ids` 为空」是**反推**而非实测；② 关键词与 `displayTitleOf` 口径**无交集** ⇒ 空结果属预期行为。

### 3.2 四项反驳（逐条写入，R2 §5-5）

| # | 反驳（事实 + 依据） | 对被否命题的作用 |
|---|---|---|
| 1 | **镜像本体从未读取**：`B21a`/`B21b` 只有 DOM 读数（`foundTitle`/`rows`），**无** `sessionsAll.ids`/`byId` 载荷 ⇒ 「`ids` 为空」是**反推**，不构成证据 | 核心事实无读数支撑 |
| 2 | **与同轮 `D4` 冲突**：**R1 返工运行** `D4` = **PASS**（`04:41:17Z`，`byId` 命中 ⇒ 镜像含 `session-c0cf54dd`），而 `B21a`（`04:41:19Z`）声称镜像为空 —— **R3-07 订正：该 04:41 时刻属 R1 返工运行；本轮权威记录运行的 `D4` = PASS 于 `05:16:37.313Z`，两者分属不同运行，引用时不得混写** | 同轮（R1 返工运行）证据自相矛盾 |
| 3 | **宿主代码反证**：`dsh-api-session-controller\lib\client.js:3355-3415` 的 `projectList()` 在**同一循环**里 `ids.push(...)` 与 `byId[...]=…` ⇒ **`byId ⊆ ids`** ⇒ 「`ids` 为空」与反驳 2 直接矛盾 | 结构性不可能 |
| 4 | **观测本身属预期行为**：搜索谓词匹配 `String(e.displayTitle ?? e.id).toLowerCase().includes(kwL) || String(e.id).includes(kwL)`（`lib/client.js:3396`），而宿主 `displayTitleOf = title ?? cwd 名 ?? id`（宿主 `L2996-3004`）、插件 `sessions.create` **不传 title**（`lib/client.js:1550/1560`）、实测 id 为随机 UUID ⇒ 关键词 `孤星` 与 `displayTitle ?? id` **无交集**，「找到的会话」为空是**正确行为** | 原 FAIL 为假阳性 |

### 3.3 撤回后的正确口径与本轮实证

| 项 | R1 口径（已废） | R2/本轮口径 |
|---|---|---|
| `B21a`/`B21b` 判据 | 「宿主三面认可 ∧ 镜像空 ⇒ 真实缺陷」 | 「**以实际会出现在 `displayTitle ?? id` 的串**为关键词检索（宿主已认可 id 的 UI 展示串 `session-<uuid>`）⇒ MUST 命中并渲染 ≥1 行」 |
| 谓词可否失败 | ❌ 无 FAIL 通道（`ackComplete === true` 恒真）⇒ 缺陷态记 PASS | ✅ 有红通道：检索 0 行 ⇒ **FAIL**（见 R2 N-01 的处置与共享登记表 `B21a-search-find-sessions`） |
| 本轮实测（权威记录运行） | — | 关键词 `session-<uuid>`（`keywordSource: host-approved-ui-id`）⇒ **命中**：`foundTitle='找到的会话（1）'`、`rows=[{t:'novels'}]`；`B22`（点行 → 开会话并关控制台）**PASS** |

⇒ **撤回后的结论**：插件搜索**能在宿主已认可的会话上命中**（无 D-3 类缺陷）；同时暴露一个**用户可见观感口径**：命中行的标题取 `displayTitleOf` 的 cwd 名（如 `novels`），与用户输入的关键词（会话 id 片段）**不同形** ⇒ 用户难以核对「命中的是哪一个会话」。**该项按观感面登记，不并入任何缺陷**（见 §6 观察项 O-1）。

**证据源**：`report.json` 的 `facts.b21Measurement` / `facts.sessionSearchAuthoritative` / `facts.sessionAckIds` /
`facts.hostSessionRowsAtB21` / `facts.sessionRowsProbe` / `facts.mirrorBodyUnreachable`；
探针源码 `probe-clean-004.mjs` 的 §14 / §16 与 `PREDICATE_REGISTRY`。
**用户侧复核项**：`docs/verification/CLEAN-004-checklist.md` §8 `U-2`（保留；真实实例的人读口径）。

---

**断言**：`C5-split-panels` — 分栏三面齐备：左窗（文件树 + 17 阶段工作流清单）+ 中窗（章节列/正文/数据·发布·请求页签）+ 三条常驻分隔线（`.nv-vdiv`/`.nv-middiv`/`.nv-chdiv`）

**两次运行的实测对照**

| 运行 | 时刻 | C5 前状态 | C5 读数 | 结果 |
|---|---|---|---|---|
| `final4`（修复前探针，2026-09-14 09:00，原件见 `report-final4-crash.json`） | C1 后 ≈41 s | `C1` PASS（`split !== null`，`consoleOpen=false`） | `{"splitClosed":true}` —— `.nv-split` 不在场 | 断言记为 FAIL；下一条 `C6` 在 `panels.wfButtons` 上取 `.length` ⇒ **崩溃**，运行中断 |
| 记录运行（本次） | — | `C1`/`C2`/`C3` PASS | `C5` **PASS**（三面齐备，`panels.left/vdiv/middiv/chdiv/chatdiv` 全在场） | `C6`/`C7`/`C8` 亦 **PASS** |
| 独立复跑 `report-run1.json`（本次） | — | 同上 | `C5` **PASS** | `C6`/`C7`/`C8` **PASS**，tally 与记录运行一致 |

**等待/事件缺失证据（为何裁定为时序 artifact）**
1. **探针侧缺口**：`C1` 之后只有 `sleep(1500)` + **单次快照**，既没有「分栏稳定」等待条件，也没有记录分栏消失的时刻/事件；`final4` 因此把「某一瞬间不在场」直接当成「三面不齐」并导致崩溃。
2. **时间线补测（本次新增）**：`facts.splitFate`（收敛窗内 1 s 采样 13 帧）= `firstBarGoneIndex:-1` ⇒ 13/13 帧 `split=true, bar=true, consoleEl=false`。即：**分栏在收敛窗内始终在场，且控制台从未打开**（⇒ 排除 DEC-015「打开控制台互斥」触发）。
3. **机制与代码**：分栏自发关闭的唯一在场路径 = 宿主 `sessions.current` 变化触发 UX-014⑧ 联动 —— `lib/client.js:3809-3833`（effect）+ 判据 `lib/client.js:800-804`（`shouldCloseOnCurrentChange`：新非空 current ≠ 上一非空 ⇒ 关闭）；插件自发切换靠一次性豁免令牌（写入 `L1473`，消费 `L3827-3828`）。`C3b` 已证明镜像在整个窗口内**不收敛**（D-2）⇒ 若期间发生第二次/迟到的 `current` 变化，令牌已消费 ⇒ 分栏被关。
4. **两次运行同码不同果**（`final4` 关 / 本次两次运行不关）⇒ 属竞态窗口，不是确定性产品行为。

**结论**：`C5` 在 `final4` 的 FAIL **不是**「分栏三面缺失」的产品缺陷，而是**探针单点快照撞上竞态窗口**造成的时序 artifact；其上游触发面（`current` 变化）归入 **D-2**（镜像不收敛）的后续任务，**不单独记产品缺陷**。
**探针侧处置（已实施，见 README §7）**：新增 `C` 面存活闸门 —— 若 `panels.splitClosed === true`，则 `C5` 记 **N-A**，`C6`~`C11` 一并记 N-A（附 `splitFate` 时间线），**不再崩溃、不再伪造 PASS/FAIL**。

**R1 F-06 订正（闸门偏宽的修复）**：R1 指出该闸门把「C1 已 PASS（分栏曾打开）而 C5 时分栏不在场」这一**异常事件**整体吸收为 N-A，
使「分栏打开后自发关闭」这一潜在回归**没有任何变红通道**（会呈现为「N-A ×7 的干净运行」）。返工已在闸门内追加**独立信号**：

| 新增断言 | 谓词（可失败） | 语义 |
|---|---|---|
| `C-face-availability` | `!(splitOpened === true && panels.splitClosed === true)` | `splitOpened`（C1 曾观测 `.nv-bar` 在场）∧ C5 时刻不在场 ⇒ **FAIL**（回归信号）；`splitOpened` 亦为 false（从未打开）⇒ N-A（不以 N-A 冒充实测） |

机证：`FALSIFIABILITY-PROOF` 断言对 `{splitOpened:true, splitClosed:true}` 求值为 false（红）、对 `{true,false}` 与 `{false,true}` 求值为 true。
本次记录运行 `panels.splitClosed === false` ⇒ 该闸门未进入（`facts.cFaceGate` 未写入），`C-face-availability` 未触发（正常路径）。

---

## 4. 记录运行中另见的 FAIL / N-A（超出指定 3 条范围的补充披露）

> 权威记录运行 `report.json` 的 tally 是 `PASS 42 / FAIL 4 / N-A 3`（R2 返工后重生成）。为避免「报告只讲指定条目」的不完整披露，逐条给出归属。

| 断言 | 状态 | 归属 | 依据 |
|---|---|---|---|
| `C9-width-memory` | FAIL | 缺陷 **D-2** 的下游（非独立缺陷） | `reason:'分栏重开失败'`、`settleToBound:false`（20 s 等待卡状态收敛超时）、`reopenAttempt.subBefore='…会话失效'`、`reopenDiag.bindPanel:true` |
| `C10-flip-side` | FAIL | 缺陷 **D-2** 的下游（非独立缺陷） | 分栏未重开 ⇒ `clickByLabel('换边')` 无可点目标，`sideAfter.splitOpen:false` |
| `C3b-binding-convergence` | FAIL | 缺陷 **D-2** 本身 | `converged:false`；13/13 采样 `sub` 含「会话失效」、`dotSt:'stale'`（会话已落盘、宿主已挂工作区）；同轮 `D4`=`PASS` ⇒ **收敛迟滞**（≥2′06″ 未收敛，见 §2 上表；R3-05 订正原写值 1′46″） |
| ~~`B21a` / `B21b`~~ | **PASS**（R2 返工后） | **无缺陷**——原判定的 **D-3 已撤回**（§3） | 检索前提改为宿主已认可会话的 UI 展示串 ⇒ **命中**：`foundTitle='找到的会话（1）'`、`rows=[{t:'novels'}]`；`B22` 亦 PASS |
| `C11-flip-back` | PASS（**空真**）→ **N-A（R1 返工改判）** | 探针判定口径问题（R1 §3.1「空真追加项」） | 分栏未重开 ⇒ ⇄ 从未被点击，`chatSide` 本就为 `right` ⇒ 断言条件平凡成立。**已修**：谓词加 `flipBackClick === true` 前置 ⇒ 未点击时记 N-A，不再冒充 PASS；并纳入 `FALSIFIABILITY-PROOF` 机证 |
| `B5-found-sessions-area` | PASS（**空真**）→ **N-A（R1 返工改判）** | 探针判定口径问题（R1 F-01） | 原谓词第三析取 `|| foundTitle === null` **恒真**。**已修**：谓词取自共享登记表（可失败合取：宿主会话行 ≥1 ⇒ 本区必渲染）；本运行宿主真实会话行 = 0 ⇒ 前置未取得 ⇒ N-A |
| `B22-session-row-opens` | **PASS**（R2 返工后首次取得） | — | 检索命中后有行可点 ⇒ 点击后控制台关闭（`rowClick.clicked=true ∧ consoleOpen=false`） |
| `FALSIFIABILITY-PROOF` | **PASS**（R2 返工后） | 机制面（R2 N-02 修复后） | 共享登记表 9 谓词：19 反例向量全红 / 11 正例向量全真；9/9 源码级 `evalPred` 消费点；`CHECK-OK`（独立脚本 `falsifiability-check-stdout.log`） |
**其余 N-A ×3**（`B5` 宿主无会话行 / `C11` ⇄ 未被点击 / `D6` 无宿主会话行）均为「前置不成立」的如实记录，非 PASS、非缺陷；E/F 面（`E1`~`E4`/`F1`）本轮**全部实测 PASS**。
> **R1 返工复审后的状态订正（2026-09-14 R2 前一版）**：
> 1. **`E1`~`E4` / `F1` 已从 N-A 转为实测**（R1 F-04 修复：前置改用 fixture 中从未绑定的卡 `mm-third-probe` 触发 `openCtl` 自动链，
>    见 `report.json.facts.splitReadyForNotice = {ok:true, attempts:[{cardId:'mm-third-probe', clicked:true, opened:true}], reason:'unbound-card-reopen'}`）：
>    **`E1`/`E2`/`E3`/`E4`/`F1` 全部 PASS** ⇒ UX-060 长短双形态 + `dsh:split-claim` 协议面**首次获得自动化覆盖**（此前为零覆盖）。
> 2. **`C11` 不再计入 PASS**（R1 §3.1 空真追加项）：加「⇄ 确被点击」前置后记 **N-A**。
> 3. **`D6-session-switch-close`** 由 FAIL 改判 **未定性（N-A）**（同本表末行依据：本机宿主侧栏**无会话行**（`hostRowsBefore=0`，
>    仅有「新建会话」按钮）⇒「切换会话」动作不可构造；原实现以「新建」按钮为代理判 FAIL 属**依据不足**）。
>    该面归入 `CLEAN-004-checklist.md` §9 R-04 未覆盖风险 + 用户项 U-13。
> 4. **`D5`** 判据改为读 `degraded` 派生渲染面（L3148/L2893/L4034），并把「降级分支在本实例不可达」如实暴露（不再用 `cdot>=1` 代理）。
> 5. **`B5`** 由空真 PASS 改判 **N-A**（谓词重写为可失败合取；宿主侧栏真实会话行 = 0 ⇒ 前置未取得，**不再冒充 PASS 计数**）。

---

## 5. 硬门槛对账

| 门槛 | 阈值 | 实测 | 判定 |
|---|---|---|---|
| 阻塞缺陷数（P0） | = 0 | **0** | ✅ 无 P0 上报项（P1 亦 = 0；P2 ×1 = D-2，P3 ×1 = D-1；**D-3 已撤回** ⇒ 不再计入） |
| 回归基线 `node test/smoke.mjs` | 291 passed / 0 failed | **291 passed, 0 failed**（exit 0，R2 实测复跑） | ✅ |
| 回归基线 `node test/validate-preset.mjs` | PASSED | **PRESET VALIDATION PASSED（schema-face: PASS）**（exit 0） | ✅ |
| 隔离零写入（真实 `$DSH_HOME`） | 指纹 before ≡ after | `realEnvVerdict.ok = true`、`strictDeltas = {}`、`inventoryDeltas = {}`、`leakSignature.pointsIntoIsolation = false` | ✅ |
| 证据可复核 | 每条结论附命令 + 退出码 + 输出摘要 | 见 README §2/§3/§6（含 exit 1 的记录运行与 stdout 原件） | ✅ |

---

## 6. 观察项（**非缺陷**，如实登记，供 Coordinator 决定是否另立任务）

### O-1（观感面）命中行的标题与会话 id **不同形** ⇒ 用 id 检索时难以核对

**来源**：R2 返工对 `B21a`/`B21b` 的前提重设计（N-01）过程中实测到的现象。
**事实**：以「宿主已认可会话的 UI 展示串」`session-<uuid>` 为关键词检索时，命中行**渲染**（`foundTitle='找到的会话（1）'`），
但行标题显示为 `displayTitleOf` 的结果 —— 本轮为工作区目录名 **`novels`**（`facts.b21Measurement.rowTitles = ['novels']`）。
**代码判据**：`lib/client.js:3435`（行标题 = `e.displayTitle ?? e.id`）；宿主 `displayTitleOf = title ?? cwd 名 ?? id`（宿主 `lib/client.js:2996-3004`）；
插件 `sessions.create` **不传 title**（`lib/client.js:1550/1560`）⇒ 对插件链建出的会话，`displayTitle` 必然是 cwd 名或 id。
**影响**：① 用户按 id 片段检索时，命中行的标题不含该 id ⇒ **不易核对「命中的是哪一个会话」**；② 多个会话若共享同一 cwd，则行标题**互相不可区分**（同一目录下的两个会话都显示 `novels`）。
**不判缺陷的理由**：① 搜索谓词确实包含 `String(e.id).includes(kwL)`（`lib/client.js:3396`）⇒ 按 id 检索是**被设计的**能力；② 行标题口径由宿主 `displayTitleOf` 决定，**非插件可单方面修正**；③ 本轮无「用户可见契约被破坏」的证据（`B21a`/`B21b`/`B22` 全 PASS）。
**建议**（不在本任务写锁内）：由 Coordinator 评估是否另立**观感改进**任务（例如：行标题在 `displayTitle !== id` 时附 id 片段作副标题，或在 `sub` 中显示 `agentPreset`/id 摘要）。
**用户侧复核项**：`docs/verification/CLEAN-004-checklist.md` §8 `U-2`（真实实例中用户可自行观察该口径是否影响使用）。