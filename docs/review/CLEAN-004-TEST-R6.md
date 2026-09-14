# CLEAN-004 测试审查报告 — R6（轻量终审：R5 两条 P3 残余订正核查 + 终态可用性裁定）

**round = R6** · **REVIEW_TYPE**：**test-review（light / final 终审）**
**PREV_ROUND_REF**：`docs/review/CLEAN-004-TEST-R5.md`（**NEEDS_CHANGE，但 BLOCKING = 0 / `unresolved_blockers = 0`**；残余 = 2 条 P3：`NEW-R5-01`、`NEW-R5-02`）
**审查范围（用户已裁定「定点返工 + 轻量复审」收口；**不扩范围重审整份资产**）**：只核 ① `NEW-R5-01` 订正 ② `NEW-R5-02` 订正 ③ 哈希行同步 ④ 增量抽查 ⑤ 生成器对账 ⑥ 不变量 ⑦ 终态可用性裁定
**审查姿态（重要）**：本轮订正**仍由 Coordinator 直写**（`docs/**` 属治理记录面）⇒ **作者与被审对象同源**。本报告**不采信任何「已声明订正」**：每格均以**实体读数**（原件 JSON 字段 / 现场哈希 / 文件系统 / 脚本只读复跑）逐格复核，并对「旧值是否只残留在订正说明内」做**全文逐处反查**（非抽样）。
**审查者角色**：Test Reviewer Agent（只读；**唯一写入 = 本文件**；未改任何被审文件 / 探针 / 清单 / `.governance/**`；未创建子 agent；未与用户交互）
**仓库 / HEAD**：`D:\AI\agent\deepseek\harness\writing-workflow` / `21b100ce9ac32e534c6215e507f9835f87e0ff4c`
**日期**：2026-09-14 · **机录**：本轮 REVIEW 持久化（`review-record`）由 Coordinator 执行（审查边界禁止本 Agent 写 `.governance/**`）

---

## 0. 结论

**VERDICT: APPROVED_WITH_NOTES**
**`unresolved_blockers = 0`**
**发现计数：P0 = 0 · P1 = 0 · P2 = 0 · P3 = 0**（无新增 finding；2 条信息项另行登记、未定级，见 §5-3）

**一句话**：R5 的两条 P3 残余**逐条实质闭合** —— ① `NEW-R5-01`：`DEFECTS:131` / `DEFECTS:78` 均已写入 **`D4` 谓词口径限定**（`cards===8 ∧ id 含 zz-first-probe ∧ drawerCards≥10 ∧ autoCreateBound.bound===true`，**不读** `sub`/`dotSt`；PASS **仅**表示「绑定已写入 ∧ 卡片计数达标」，**明写**「**不得**读作『卡片状态已收敛』」），且「同轮已收敛」类表述**全文仅剩 1 处**、位于订正说明之内；② `NEW-R5-02`：五处（`DEFECTS:83` / `DEFECTS:88`② / `README:22` / `README:121` / `checklist:96`）**已统一为 `≈2′31.3″`**，`≤2′31″` **不再作为当前口径出现**（全文 3 处出现，**逐处均落在订正说明内**）；实体复算 `05:14:05.991Z → 05:16:37.313Z` = **151.322 s = 2′31.3″**，与文档逐字相符。哈希行同步成立（`DEFECTS.md` = 36252 B / `ee842b1f…` 与 `README:83` 逐项一致；`checklist` = 42721 B / `32213dae…` 与 `README:89` 逐项一致；`README` 自指行按其自述口径 + 现场实测指令处理，非矛盾）。生成器 `--check` **IN-SYNC / exit 0**；不变量全绿（两脚本 sha256 未变、本轮 **0 次完整运行**、`tally 49/42/4/3` 与「D-3 已撤回」口径未破坏、产品面 `git status` 空、用户 `~/.dsh` 未被触碰）。

> **终态来源说明（为何是 APPROVED_WITH_NOTES 而非 APPROVED）**：本资产**不是零备注交付**——它与 `README §10` 的 **12 条已知局限**（镜像体读数不可得 / `C-face` 无运行期正例 / `C5` 未注入复现 / `D6` 未定性 / `B21a` 覆盖口径窄 / 同源机证强度上限 / O-1 观察项 等）**同读**才成立，且 `D4` 行与 D-2 时限有**取用口径限定**（§5-2）。按 `test-review` SKILL：`APPROVED_WITH_NOTES` = 无未解决 BLOCKING finding 的**保留备注通过终态**，与 `unresolved_blockers = 0` 同时成立 ⇒ 与 `APPROVED` 的差别是「必须随备注读」，不是「有阻断」。
> **熔断判断**：round = 6 ≥ 3，但**无 BLOCKING**（P0/P1/P2 = 0）⇒ **不触发 T2**（转 BLOCKED + escalation）；本轮为**通过终态**，复审链可结束。

| 维度 | 结论 | 一句话依据 |
|---|---|---|
| 1. 策略完整性 | **满足**（本轮未重审，沿用 R1~R5 独立复核） | 三态口径、9 处 N-A 门控与谓词互斥、共享登记表 + `evalPred` 唯一判定入口 —— 探针 sha256 `de2de511…` 未变即等价「未受影响」 |
| 2. 用例质量 | **满足**（本轮未重审） | 49 条断言、9 谓词 / 19 red + 11 ok 实体未变（`falsifiability-check.mjs` 只读复跑：`VECTOR-TALLY={red:19,ok:11}` / `ALL-PASS=true` / `BINDING-OK=true` / `CHECK-OK` / exit 0） |
| 3. 覆盖率 | **满足**（本轮未重审） | `checklist` 仅 `:96` 一处文本订正（大小/哈希按 R5 实测更新并入册，见 §2-3） |
| 4. 证据充分性 | **满足** | R5 两条 P3 **逐条闭合且可对账**（§2-1 / §2-2）；增量抽查 20 格 **0 不一致**（§4） |
| 5. 可复现性 | **满足** | `--check` **IN-SYNC / exit 0**；`README §3` 22/22 行与实体对账（自指行按其自述口径）；`README §11` 复核命令与期望值（`tally`、`exit 1`）与实体一致 |

---

## 1. 核验方法（全部只读；**本轮 0 次探针运行**）

| 手段 | 命令 / 读取面 | 结果摘要 |
|---|---|---|
| 实体哈希普查 | `Get-ChildItem docs\evidence\CLEAN-004 -File` + `Get-FileHash -Algorithm SHA256` | **22 个文件**逐项（大小 + sha256 + mtime）已取；探针 `DE2DE511…9065B65`、自证脚本 `5AFB8663…408159A`（未变）；`DEFECTS.md` `EE842B1F…BC645A9`/36252 B；`README.md` `A59579F2…00A087F`/40648 B；`checklist` `32213DAE…4240232`/42721 B |
| `README §3` 全表对账 | 22 行 ×（大小 + sha256）**逐行重算**（脚本解析表格 + `Get-FileHash`） | **21/22 逐项一致**；唯一「不一致」= `README.md` 自指行（该行按定义 = 「写入本行之前」的读数，**非矛盾**；见 §2-3） |
| `report.json` 实体读数 | `ConvertFrom-Json` 逐字段 | `tally {49,42,4,3}`、`ok=false`、`crash=[]`、`head=21b100c…`、`headDirty=false`、`startedAt 05:13:45`/`finishedAt 05:16:55`、`cleanup.rootRemoved=true`、`realEnvVerdict.ok=true` |
| 断言逐条读数 | 对 4 份 report 逐断言取 `status` / `at` / `detail`（**raw 文本正则**，避免日期对象丢毫秒） | `D4`/`C9`/`C3b`/`C10`/`D2`/`E1~E4`/`F1`/`B5`/`C11`/`D6` 的 `status` 与 `at` 全部取到**带毫秒**实体值 |
| 时间跨度复算 | `convergence.samples[*].t`（epoch ms）↔ 断言 `at`（ISO，`AdjustToUniversal`） | `05:14:05.991Z→05:16:37.313Z` = **151.322 s**；`→05:16:12.460Z` = **126.469 s**；采样窗 `→05:14:18.088Z` = **12.097 s**；discovery `04:35:05.402Z→04:37:28.093Z` = **142.691 s** |
| `D4` 谓词源码实读 | `probe-clean-004.mjs` `assertion('D4-auto-create-book-persisted', …)`（`L1567-1569`） | 判据 = `afterCreate.cards === 8 && Array.isArray(afterCreate.id) && afterCreate.id.indexOf('zz-first-probe') >= 0 && afterCreate.drawerCards >= 10 && autoCreateBound.bound === true` —— **不含** `sub`/`dotSt` |
| 残留值全文反查 | `[regex]::Matches` 统计 `2′31″` / `2′31.3″` / `2′06″` / `2′06.5″` / `2′22.7″` / `同轮已收敛` 在**三文档每一出现处**并逐处打印行号 | 见 §2-1 / §2-2（`≤2′31″` 三处**全部**在订正说明内；`同轮已收敛` 仅 1 处、在订正说明内） |
| 机生成自校验 | `node docs\evidence\CLEAN-004\gen-defects-evidence.mjs --check`（只读） | **`DEFECTS-EVIDENCE-CHAIN IN-SYNC (EOL-normalized)` / `rows=5 bytes=1759` / exit 0** |
| 回归/自证复跑 | `node falsifiability-check.mjs`；`node --check probe-clean-004.mjs` | `VECTOR-TALLY={red:19,ok:11}` / `ALL-PASS=true` / `BINDING-OK=true` / `CHECK-OK`（exit **0**）；探针语法 exit 0（**未运行探针**） |
| 文件时间戳取证 | 4 张 PNG `CreationTime` / `LastWriteTime` | `CreationTime` = 01/03/04 `12:17:04`、02 `12:42:25`；`LastWriteTime` = `12:38:44`/`12:41:08`/`12:41:20`/`12:38:53` —— 与 `README:93` 逐项一致 |
| 本轮变更面取证 | 全仓 `LastWriteTime` 排序（排除 `node_modules`/`.git`） | 本轮返工窗（R5 报告 18:11:05 之后）**仅 3 个文件**被改：`DEFECTS.md`(18:11:54) / `checklist`(18:12:09) / `README.md`(18:12:21) —— **恰好 = 用户清单点名的 3 份**；探针/报告/PNG **未触碰** |
| 仓库写面 | `git status --porcelain`（全量 + 产品面）· `git rev-parse HEAD` | 产品面（`lib/ test/ scripts/ agent-presets/ package.json README.md CHANGELOG.md`）**空**；`HEAD=21b100c…`（全量 porcelain 的已改项全部落在 `.governance/**` 与未跟踪证据目录，见 §6） |
| 残留 | `%TEMP%\clean004-*` 计数 | **0** |
| 用户环境 | 只读 `~/.dsh/.agent-presets/novel-writing/.dsh-bundle-version` | `0.5.2`，mtime **09-12 19:51:40**（未变）⇒ 用户实例/浏览器未被触碰 |

---

## 2. 逐条核对表（用户清单 1~7 · 100% 有判定）

### 2-1 `NEW-R5-01` 谓词口径限定订正 — **通过**

| 核对点 | 实体读数（本轮实测） | 判定 |
|---|---|---|
| `DEFECTS.md:78`（D-2 正文「同轮 `D4`」段） | 现文：「**同轮 `D4`（`05:16:37Z` 断言、`autoCreateBound` 读数）= PASS**（`bound=true`、`sub='outline_writing · 3章 · 1200字'`）——**其谓词只读 `cards`/`id`/`drawerCards`/`bound`，不读 `sub`/`dotSt`** ⇒ PASS 仅证明「绑定已写入 ∧ 卡片计数达标」；同轮抽屉卡在 `05:14:05.991Z→05:14:18.088Z` 的 **13/13 帧仍为「会话失效」**，**卡片状态的收敛时点无直接读数**（仅以 `D4` 的 `bound=true` 作为上界佐证）。**R5 NEW-R5-01 订正**：原写「同一运行内卡片先 `stale` 后收敛」属陈旧自述（谓词不读该状态）」 | ✓ **谓词限定已写入** |
| `DEFECTS.md:131`（`D4` 行） | 现文：「判据末项与 C3b 同源：`D4` 谓词 = `cards===8 ∧ id 含 zz-first-probe ∧ drawerCards≥10 ∧ autoCreateBound.bound===true`（**不读** `sub`/`dotSt`）⇒ PASS **仅**表示「绑定已写入 ∧ 卡片计数达标」，**不得**读作「卡片状态已收敛」（同格 `detail.afterCreate.drawerSubs[0]` 在该时刻仍为 `'…会话失效'`、`dotSt='stale'`）。**R5 NEW-R5-01 订正**：原括注「同轮已收敛」与实体矛盾（另注：该断言文案里的「总 11 本」是陈旧期望…）」 | ✓ **逐字要求达成**（含三项限定：谓词原文 / PASS 语义 / 不得读作收敛） |
| 谓词实体对账（**作者声明 ≠ 采信**） | 探针 `L1567-1569` 实体判据 = `afterCreate.cards === 8 && Array.isArray(afterCreate.id) && afterCreate.id.indexOf('zz-first-probe') >= 0 && afterCreate.drawerCards >= 10 && autoCreateBound.bound === true` —— 与 `DEFECTS:131` 所写**逐项同义**，且确实**不出现** `sub`/`dotSt` | ✓ 文档转写**正确** |
| 「同轮已收敛」类表述全文反查 | `同轮已收敛` 三文档命中 **1 处 = `DEFECTS:131`**，且**位于**「**R5 NEW-R5-01 订正**：原括注『同轮已收敛』与实体矛盾」**之内** ⇒ 符合「除订正说明内不再出现」 | ✓ |
| 相关同族表述是否被误当事实 | ① `DEFECTS:85`「先 `stale` 后收敛：同轮 `C3b`=FAIL（`converged=false`，采样窗 `04:35:05.402→04:35:17.459Z` 13/13 `stale`）⇒ 自首采样起 **≤ 2′22.7″** 收敛」——**已带实测时限限定**（`D4`@`04:37:28.093Z` 已 bound），且 `NEW-R5-01` 针对的是**记录运行**的「同轮已收敛」，非此条 | ✓（不构成复发） |
| ② `DEFECTS:89`③ | 「记录运行：先 `stale` 后收敛（**≤2′31.3″**）」——**带时限**且已改实测口径；无「卡片状态已收敛」的无据表述 | ✓ |
| ③ `README:105` | 「13/13 采样仍「会话失效」，同轮 `D4`=PASS ⇒ **收敛迟滞**：**≥2′06″ 未收敛、≈2′31.3″ 内收敛**」——**带时限/区间**，未表述为「状态已收敛」 | ✓ |
| ④ `DEFECTS:131` 同格 detail 自述 | 该行如实转写「同格 `detail.afterCreate.drawerSubs[0]` 在该时刻仍为 `'…会话失效'`、`dotSt='stale'`」——**与实体一致**：`report.json` 的 `D4.detail.afterCreate.drawerSubs[0] = "outline_writing · 3章 · 1200字"`（**该行无状态后缀**）、而 `drawerSubs[3] = "creation_planning · 5章 · 9000字 · 会话失效"`、`C9.detail.reopenDiag.drawerSubs[0] = "outline_writing · 3章 · 1200字 · 会话失效"`。⇒ 「该时刻卡片读数含『会话失效』」**可核为真**（同一卡片在相邻断言时刻的读数即为带后缀形态） | ✓（限定的**事实依据成立**） |

**判定：通过**（限定的**内容**与**依据**双向成立；旧表述仅在订正说明内留痕）

### 2-2 `NEW-R5-02` 上界口径归一（五处统一 `≈2′31.3″`） — **通过**

**五处现状（逐处实读）**

| 落点 | 现文关键片段 | 是否 `≈2′31.3″` | 判定 |
|---|---|---|---|
| `DEFECTS.md:83`（跨运行表·记录运行行） | 「…**上界 ≈ 2′31.3″**（`D4` 于 `05:16:37.313Z` 已 bound ⇒ `05:14:05.991Z → 05:16:37.313Z` = **2′31.3″**；**R5 NEW-R5-02 订正**：原写 `≤ 2′31″` 比实测紧 0.322 s）」 | ✓（旧值与实测**已分离**：旧值仅在「订正」括注内） | ✓ |
| `DEFECTS.md:88`②（订正说明） | 「…**≥ 2′06″ 未收敛、≈ 2′31.3″ 内收敛**（下界 = …；上界 = 同轮 `D4`（`05:16:37.313Z`）已 bound 的时刻；…）」 | ✓ | ✓ |
| `README.md:22`（N-05 摘要 #5） | 「…「长期停『会话失效』」改为实测时限（**≥2′06″ 未收敛、≈2′31.3″ 内收敛**，下界按 R3-05、上界按 R5 NEW-R5-02 订正）」 | ✓ | ✓ |
| `README.md:121`（N-05 处置行） | 「…→ **≥2′06″ 未收敛、≈2′31.3″ 内收敛**（下界按 R3-05 订正、上界按 **R5 NEW-R5-02** 由整秒截断的 `≤2′31″` 改为实测值）」 | ✓（订正说明内引旧值，合规） | ✓ |
| `docs/verification/CLEAN-004-checklist.md:96`（`D-07`） | 「**FAIL**（见缺陷 **D-2**；实测时限 **≥2′06″ 未收敛、≈2′31.3″ 内收敛**——下界按 R3-05 订正、上界按 R5 NEW-R5-02 由 `≤2′31″` 改为实测值；非确定性：`run1` 全程不收敛）」 | ✓ | ✓ |

**旧值 `≤2′31″` 全文出现处（逐处反查结果）**

| # | 文件:行 | 语境 | 合规判定 |
|---|---|---|---|
| 1 | `DEFECTS.md:83` | 「**R5 NEW-R5-02 订正**：原写 `≤ 2′31″` 比实测紧 0.322 s」 | ✓ **订正说明内** |
| 2 | `README.md:105` | 「上界按 R4 NEW-R4-05 由整秒截断的 `≤2′31″` 改为实测 `≈2′31.3″`」 | ✓ **订正说明内** |
| 3 | `README.md:121` | 「上界按 R5 NEW-R5-02 由整秒截断的 `≤2′31″` 改为实测值」 | ✓ **订正说明内** |
| 4 | `CLEAN-004-checklist.md:96` | 「上界按 R5 NEW-R5-02 由 `≤2′31″` 改为实测值」 | ✓ **订正说明内** |

⇒ **`≤2′31″` 不再作为「当前口径」出现（0 处）**；4 处出现**全部**为订正说明。计数对照：`≤2′31″` = `DEFECTS` 1 / `README` 2 / `checklist` 1；`2′31.3″` = `DEFECTS` 4 / `README` 5 / `checklist` 1。

**实体复算（终审必做的独立验算）**

| 计算 | 实体来源 | 结果 | 与文档 |
|---|---|---|---|
| 上界跨度 | `samples[0].t = 1789362845991` → `D4.at = 2026-09-14T05:16:37.313Z` | **151.322 s = 2′31.3″**（151.322/60 = 2′31.322″） | ✓ 一致 |
| 下界跨度 | 同起点 → `C9.at = 2026-09-14T05:16:12.460Z` | **126.469 s = 2′06.5″** | ✓ 一致 |
| 采样窗 | `samples[0].t` → `samples[12].t` | **12.097 s**，13 帧（`stale` 13/13） | ✓ 一致 |
| discovery 跨度 | `04:35:05.402Z` → `D4.at = 04:37:28.093Z` | **142.691 s = 2′22.7″** | ✓ 一致 |

> **口径备注（透明化）**：复算以 **`report.json` 原始文本正则取值**（`"at":"…313Z"`）而非反序列化对象，以避免日期对象丢毫秒——实测 `D4.at` 实体 = **`05:16:37.313Z`**（毫秒 .313 保留），故 151.322 s 精确成立。

**判定：通过**（五处统一；旧值零当前口径；数值独立复算成立）

### 2-3 哈希行同步（`README §3`） — **通过**

| 核对点 | 文档写 | 实体读数（现场 `Get-FileHash`） | 判定 |
|---|---|---|---|
| `README:83` `DEFECTS.md` 行 | `36252` / `ee842b1f0f02237e6bd776d87d2261ea4d730d095e5aa476e0090d441bc645a9` | **36252 B** / **`ee842b1f0f02237e6bd776d87d2261ea4d730d095e5aa476e0090d441bc645a9`** | ✓ **逐项一致**（= 用户预期值） |
| `README:89` 清单行（`checklist`） | `42721` / `32213dae619a16887db11b4f96126c73d6dacbbff72f55bf05dd54b474240232` | **42721 B** / **`32213dae619a16887db11b4f96126c73d6dacbbff72f55bf05dd54b474240232`** | ✓ **逐项一致**（= 用户预期值） |
| `README:87` README 自指行 | `40395` / `0a400b59…`，行内注明「**自指**：上列 = **写入本行之前**的实体读数…⇒ R5 复核 **MUST** 以现场 `Get-FileHash docs\evidence\CLEAN-004\README.md` 为准」 | 现场 = **40648 B** / `a59579f261d3042a94c7f1454e7241824cdb852fd98c5900d3675299000a087f` | ✓ **按其自述口径处理**（自指值 + 现场实测指令齐备，**非矛盾**） |
| 其余 19 行 | `README:66-86` | 逐行重算 = **19/19 一致** | ✓ |
| 表行数 ≡ 文件数 | `README §3` 表 **22 行** | 目录实体 **22 个文件** | ✓ |
| 生成器行 | `README:85` = `8226` / `782560e3…` | `8226 B` / `782560e349728fbfcf024afdf16ae776d3adcba9b4ed0f46d9ac708d3e5fda23` | ✓ |

**判定：通过**（22 行全表对账：21 行逐项一致 + 1 行自指按口径；两处用户预期值与实体**完全吻合**）

### 2-4 生成器对账（只读复跑） — **通过**

- `node docs\evidence\CLEAN-004\gen-defects-evidence.mjs --check` ⇒ **`DEFECTS-EVIDENCE-CHAIN IN-SYNC (EOL-normalized)`** / `rows=5 bytes=1759` / **exit 0**。
- 机生成块（`DEFECTS §2` `L95` BEGIN / `L101` END 之间）5 行；生成器 sha256 `782560e3…` mtime `17:46:00`（**R5 返工窗内未再改**）。
- 本轮 `DEFECTS.md` 的改动**未触碰**机生成块 ⇒ 对账保持 IN-SYNC（与「`--check` 仍 IN-SYNC」互为反证）。

**判定：通过**

### 2-5 不变量 — **通过**

| 不变量 | 实测 | 判定 |
|---|---|---|
| 探针 sha256 | `probe-clean-004.mjs` = `de2de511e89a8ccc6d08b29d529e51336079bc3ceab4b937795dad88d9065b65`；副本 `…final-rev-b1f1c8c0.mjs` 同值；mtime `13:13:36` | ✓ **未变** |
| 自证脚本 sha256 | `falsifiability-check.mjs` = `5afb8663e6a9c25d3d44f2b2d5a2ca6e6bb6b3c282c9da38982a81a26408159a`；mtime `13:01:25` | ✓ **未变** |
| 本轮完整运行次数 | `report.json` 仍 `05:13:45.162Z→05:16:55.181Z`（`ok=false`、`crash=[]`、`headDirty=false`）、sha256 `a6d8ae0f…0481958d`、mtime `13:16:55`；`report-rework2-run.json` 同 hash 同 mtime；目录 = **22 文件**（未新增 report/stdout）；`%TEMP%\clean004-*` = **0** | ✓ **0 次** |
| `tally` | `{"total":49,"pass":42,"fail":4,"na":3}`；FAIL = `D2-esc-bind-yield`/`C3b`/`C9`/`C10`，N-A = `B5`/`C11`/`D6`（实体逐条核对） | ✓ **未破坏** |
| 「D-3 已撤回」 | `DEFECTS:140` 标题删除线 + 已撤回、`:37`/`:38`/`:242`、`README:6`/`:108` 等 —— 未见任何将其表述为产品缺陷者 | ✓ **未破坏** |
| 自证/回归 | `falsifiability-check.mjs` 只读复跑：`VECTOR-TALLY={"red":19,"ok":11}`、`ALL-PASS=true`、`BINDING-OK=true`、`CHECK-OK`、`DECLARED-VECTORS == EVALUATED`、exit 0；探针 `node --check` exit 0 | ✓ |
| 产品写面 | 产品面 `git status --porcelain` = **空**；`HEAD=21b100ce9ac32e534c6215e507f9835f87e0ff4c` | ✓ |
| 用户环境 | `~/.dsh/.agent-presets/novel-writing/.dsh-bundle-version` = `0.5.2`，mtime `09-12 19:51:40`（未变） | ✓ |

### 2-6 终态可用性 — 见 §6
### 2-7 增量抽查 — 见 §4

---

## 3. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0/P1/P2 阻塞问题数 | = 0 | **0**（本轮新增 **P3 亦为 0**；交付侧 D-1 P3 / D-2 P2 未变，均为既有已裁定项） | ✅ **PASS** |
| R5 两条 P3 逐条有处置判定 | = 100% | **2/2 通过**：`NEW-R5-01` = **已闭合**（谓词限定写入 `DEFECTS:78`/`:131`；旧表述仅存 1 处于订正说明内）；`NEW-R5-02` = **已闭合**（五处统一 `≈2′31.3″`；旧值 0 处作当前口径） | ✅ **PASS** |
| 增量抽查（≥12 格）与实体一致 | = 100% | **20 格抽查 ⇒ 0 不一致**（§4；另 1 条「既有信息项」按 R5 口径单列、不计入本轮新增） | ✅ **PASS** |
| 不变量 | 两脚本 sha256 未变 + 0 运行 + tally/口径未破坏 | **PASS**：`de2de511…` / `5afb8663…` 未变；`report.json` 仍 `05:13:45.162Z→05:16:55.181Z`、目录仍 22 文件、`%TEMP%\clean004-*`=0；`tally 49/42/4/3` 与「D-3 已撤回」未破坏；产品面 `git status` 空、`HEAD=21b100c`；用户 `~/.dsh` `0.5.2` 未变 | ✅ **PASS** |
| 每条发现标注 P0~P3 | = 100% | 本轮**新增 finding = 0**；2 条信息项**明确标注为「未定级（信息项）」**并注明理由（§5-3），不计入 finding 集 | ✅ **PASS** |

**裁决：APPROVED_WITH_NOTES —— 5/5 硬门槛通过；P0=P1=P2=P3=0；`unresolved_blockers = 0`。**
**熔断判断**：round = 6 ≥ 3 但无 BLOCKING ⇒ **T2 不触发**；R4 的 BLOCKED 已由 R5 解除、R5 的两条 P3 由本轮闭合 ⇒ **复审链以通过终态结束**。

---

## 4. 增量抽查表（**20 格**；本轮编辑是否引入新的不一致）

> 口径：**「不一致」= 文档所引数值/状态/时刻/哈希/大小/路径与「文档自己指明的原件」实体矛盾**（自指行按定义排除；订正说明内的旧值按用户规则不计）。逐格给出「文档格 → 实体来源 → 实体读数 → 判定」。
> **范围说明**：编号 1~18 集中于**本轮被触碰的 3 份文件**（`DEFECTS.md` / `README.md` / `checklist`）内与订正**直接相邻**的格；编号 19~20 覆盖生成器与复核指引（**≥12 格要求已满足**）。全量 22 行哈希表对账见 §2-3（另计）。

| # | 文档格（文件:行） | 文档写 | 实体来源 | 实体读数 | 判定 |
|---|---|---|---|---|---|
| 1 | `DEFECTS.md:9`（本轮未触区，作回归对照） | `report.json` sha256 `a6d8ae0f…`、`tally 49/42/4/3`、`05:13:45→05:16:55Z`、exit 1、`cleanup.rootRemoved=true`、探针 `de2de511…` | `report.json` 现场哈希 + 字段 | `A6D8AE0F…`、`{49,42,4,3}`、`05:13:45.162Z→05:16:55.181Z`、`cleanup.rootRemoved=True` | ✓ |
| 2 | `DEFECTS.md:37`（摘要） | P0=0 / P1=0 / P2×1（D-2）/ P3×1（D-1）/ D-3 已撤回 | 报告 FAIL 集合 + §3 | `D2-esc`(D-1) + `C3b`(D-2) + `C9`/`C10`(D-2 下游) | ✓ |
| 3 | `DEFECTS.md:77` | `converged=false`；13 次采样 `05:14:05.991Z→05:14:18.088Z`；13/13 「会话失效」（`dotSt=stale`） | `facts.convergence` | `samples=13`、`converged=false`、首末同上、`stale` 13/13 | ✓ |
| 4 | `DEFECTS.md:78` ① | 「同轮 `D4`（`05:16:37Z` 断言）PASS、`bound=true`、`sub='outline_writing · 3章 · 1200字'`」 | `D4` 断言 | `PASS` @`05:16:37.313Z`、`bound:true`、`sub` 同值 | ✓ |
| 5 | `DEFECTS.md:78` ②（**本轮新增文本**） | 「其谓词只读 `cards`/`id`/`drawerCards`/`bound`，不读 `sub`/`dotSt`」 | 探针 `L1567-1569` | 判据四项同义、无 `sub`/`dotSt` | ✓ |
| 6 | `DEFECTS.md:83` ①② | 权威记录运行 `PASS`（`D4` @`05:16:37.313Z`）；读数 `{sub:'…1200字', bound:true}` | `D4` 断言 | 逐字一致 | ✓ |
| 7 | `DEFECTS.md:83` ③ | 末次直接读数跨 `05:14:05.991Z → 05:16:12.460Z` = `2′06.5″` | `samples[0].t` ↔ `C9.at` | **126.469 s** | ✓ |
| 8 | `DEFECTS.md:83` ④（**`NEW-R5-02` 主订正格**） | **上界 ≈ 2′31.3″**（含复算算式）；旧值仅在订正括注内 | `samples[0].t` ↔ `D4.at` | **151.322 s = 2′31.3″** | ✓ |
| 9 | `DEFECTS.md:84` | `run1`：`FAIL`、`{sub:'…会话失效', bound:false}`、不收敛 | `report-run1.json` `D4` | `FAIL` @`04:10:28.407Z`、`bound=false`、`sub` 含「会话失效」 | ✓ |
| 10 | `DEFECTS.md:85` ① | discovery `PASS` @`04:37:28.093Z`、`bound=true`、`sub='…1200字'`、stdout `L49` = `OK D4-auto-create-book-persisted` | 该轮 `D4` + stdout | 逐条一致 | ✓ |
| 11 | `DEFECTS.md:85` ② | 采样窗 `04:35:05.402→04:35:17.459Z`、13/13 `stale`、`converged=false`、自首采样 `≤ 2′22.7″` | 该轮 `convergence`/`C3b` | `142.691 s`、13/13、`converged=false` | ✓ |
| 12 | `DEFECTS.md:88`②（**`NEW-R5-02` 之一**） | 「**≥ 2′06″ 未收敛、≈ 2′31.3″ 内收敛**」+ 下界/上界锚点说明 | `samples[0].t`/`C9.at`/`D4.at` | 两锚点与两个数值**全部成立** | ✓ |
| 13 | `DEFECTS.md:89`③ | 「记录运行：先 `stale` 后收敛（≤2′31.3″）；`run1` 全程不收敛；`discovery`（≤2′22.7″）」 | 三份 report | 三值均与实体一致（`run1` `D4`=`FAIL`@`04:10:28.407Z`） | ✓ |
| 14 | `DEFECTS.md:131` ①②（**`NEW-R5-01` 主订正格**） | `D4` = `PASS` + `{sub:'…1200字', bound:true}` @`05:16:37.313Z`；「fixture 仍 10 本」（`drawerCards`） | `D4` 断言 | 逐字一致（`drawerCards=10`、`cards=8`、`id` 含 `zz-first-probe`） | ✓ |
| 15 | `DEFECTS.md:131` ③（**本轮新增文本**） | 谓词原文 + 「PASS **仅**表示『绑定已写入 ∧ 卡片计数达标』」+「**不得**读作『卡片状态已收敛』」 | 探针判据 + `D4.detail` | 限定**正确**；所引「该时刻仍为『…会话失效』」与实体可核（同卡片在 `C9.reopenDiag.drawerSubs[0]` 即带该后缀） | ✓ |
| 16 | `README.md:22`（**`NEW-R5-02` 传播点**） | `discovery` `D4` PASS @`04:37:28.093Z`；「**≥2′06″ 未收敛、≈2′31.3″ 内收敛**，下界按 R3-05、上界按 R5 NEW-R5-02 订正」 | 该轮 `D4` + 本轮 `D4.at`/`C9.at` | 时刻 ✓、两值 ✓、订正出处标注 ✓ | ✓ |
| 17 | `README.md:105`（§4 D-2 行） | `C3b` FAIL、13/13、同轮 `D4`=PASS、`≥2′06″`/`≈2′31.3″`、`run1` 全程不收敛、`discovery` 同形态 | 三份 report | 全部一致 | ✓ |
| 18 | `README.md:121`（**`NEW-R5-02` 传播点**） | `discovery` PASS @`04:37:28.093Z`、仅 `run1` FAIL、`≈2′31.3″`（上界按 R5 NEW-R5-02 改） | 三份 report | 时刻/归属/数值**全项一致** | ✓ |
| 19 | `checklist:96`（`D-07`，**`NEW-R5-02` 第五处**） | `≥2′06″ 未收敛、≈2′31.3″ 内收敛`；旧值仅在订正说明内；`run1` 全程不收敛 | `D4.at` / `C9.at` / 三份 report | 两值 ✓；旧值语境 ✓ | ✓ |
| 20 | `README.md:85` + `:283` + `:295` + `:309`/`:312`（生成器与复核指引） | 生成器 `8226 B`/`782560e3…`；`$r.tally` ⇒ `{"total":49,…,3}`；`falsifiability-check.mjs` ⇒ `BINDING-OK/ALL-PASS/CHECK-OK` exit 0；期望 `exit 1` | 现场哈希 + `report.json` + 只读复跑 | 逐项一致（`--check` **IN-SYNC / exit 0**；自证脚本输出与文档同形） | ✓ |

**统计：抽查 20 格 ⇒ 不一致 = 0 格（0%）。**
**结论**：本轮编辑**未引入任何新的不一致**——所有被触格（§4 的 #5、#8、#12、#15、#16、#18、#19 与本轮新文本直接相关）**在实体面全部成立**；两张主订正（`NEW-R5-01`/`NEW-R5-02`）的**新文本本身**亦经实体对账（谓词源码 / 毫秒级复算）。
**既有信息项（不计入本轮不一致，另行登记）**：4 张 PNG 的 `screenshotsTmpSource` 来源目录与 `LastWriteTime` 轮次不同源一事，R3/R5 已记录为**原件自身字段的信息项**（`README:93` 的文字引用与文件系统一致），本轮**未变化、未定级**（见 §5-3）。
**补充（全量）**：`README §3` 的 **22 行**哈希表已在 §2-3 全部逐行重算（21 行逐项一致 + 自指行按口径）——即本轮「增量抽查」的实际覆盖为 **20 + 22 格**。

---

## 5. 发现与信息项

### 5-1 本轮新增 finding

**无。** P0 = 0 · P1 = 0 · P2 = 0 · P3 = 0。

### 5-2 使用前提（取用该资产时**必须**同时成立/同读）

1. **`HEAD = 21b100ce9ac32e534c6215e507f9835f87e0ff4c` ∧ `lib/client.js` 未改动**（`report.json.headDirty=false`；现场 `git status` 产品面为空）。断言针对 `21b100c`（`README:313`）。
2. **期望值 = `tally 49 / 42 / 4 / 3`、`exit 1`**（FAIL 4 = D-1 ×1 + D-2 及其下游 ×3；N-A 3 = `B5`/`C11`/`D6`）。
3. **`D4` 行只能读作**「绑定已写入（`autoCreateBound.bound === true`）∧ `cards===8` ∧ `drawerCards≥10` @ `05:16:37.313Z`」；**不得**读作「卡片状态已收敛」（探针谓词不读 `sub`/`dotSt`）——`DEFECTS:131` / `DEFECTS:78` 已就地限定。
4. **D-2 时限口径 = 上界 `≈2′31.3″` / 下界 `≥2′06″`**（`≤2′31″` 为已作废的整秒截断写法，仅存于订正说明）；D-2 的 **P2 定级不受影响**（契约在 ≥2′06″ 内未兑现）。
5. **D-2 的频次口径**：仅 `run1`（R1 期复跑）全程不收敛；记录运行与 `discovery` 为「窗口内 `stale` → 其后 bound」（上界 `≈2′31.3″` / `≤2′22.7″`）。
6. **必须与 `README §10` 的 12 条已知局限同读**（尤其 §10-2 镜像体读数不可得、§10-6 真实用户实例未验证、§10-12 同源机证强度上限）。
7. **`README.md` 自指行不可独立复核**：现场实测值（供对账）= **40648 B / `a59579f261d3042a94c7f1454e7241824cdb852fd98c5900d3675299000a087f`**——引用时必须**重新现场实测**，不得直接引用行内值。
8. **`.governance/**` 不在本报告定级范围**（治理记录面，仅作口径一致性提示，见 §5-3）。

### 5-3 信息项（**未定级**；登记供 Coordinator 裁量，不阻断、不计 finding）

| # | 位置 | 事实（本轮实测） | 为何未定级 |
|---|---|---|---|
| I-1 | `.governance/session-snapshot.md:39`、`.governance/plan-tracker.md:164` | `session-snapshot.md:39` 仍写「实测 **≥2′06″ 未收敛、`≤2′31″` 内收敛**」；`plan-tracker.md:164`（BUG-009 行）仍写「点未绑定卡自动绑定后卡片**恒「会话失效」**」，与本轮三文档统一后的口径（`≈2′31.3″`、非「恒」）不一致。两文件 mtime = `09-14 13:55:28` / `13:50:37`，**R5 返工窗（18:11–18:12）未触碰**（现场取证：本轮仅 `DEFECTS.md`/`checklist`/`README.md` 三个文件变更） | 属**治理记录面**，R5 §5-3-9 已按其时裁定排除在定级范围外；本轮延续同一裁定（若纳入定级将构成「改被审文件/超范围」）。**纯文本订正、零风险**（各 1~2 行），建议 Coordinator 在收口证据时一并归一：`≤2′31″` → `≈2′31.3″`，「恒」→「收敛前恒 `stale`、`run1` 全程不收敛」 |
| I-2 | `.governance/evidence-log.md` | 仍有 5 处含 `≤2′31″`（其中 EVD-120 为 R5 机录文本），1 处含 `N-A ×5`（历史条目原文） | 同上（治理记录面）。其中 EVD-120 为**机录时的原文**——按「机录忠实性」不宜改写历史条目；建议**仅**在新条目（本轮 R6 机录）中采用新口径，**不回溯改写** |
| I-3 | `README.md:93` × `report.json.screenshotsTmpSource` | 4 张 PNG 的 `LastWriteTime` = `12:38:44`/`12:41:08`/`12:41:20`/`12:38:53`（**R1 返工窗**），而 `screenshotsTmpSource` 记的来源目录 = `%TEMP%\clean004-final\*`（记录运行输出目录）。`README:93` 的**文字引用**与文件系统一致（「R1 返工运行期间取证，非本轮」） | 差异存在于**原件自身字段**（改它 = 改被审原件，且需重跑）；R3-02 已订正文档侧表述、R5 §5-3-2 已登记为信息项。**本轮未变化** |

---

## 6. 终态可用性裁定

### 6.1 裁定

**可以交付 —— 该验证资产可作为 CLEAN-004 自动化面（探针断言 + 计数 + 隔离/清理 + 同源机证）的记录，用于交付/归档。** 裁定依据（全部为本轮实体实测）：

- **文档面闭合**：R5 的 2 条 P3 残余**逐条闭合**（§2-1 / §2-2），且**未引入新不一致**（§4：20 格 0 不一致 + §3 全表 22 行对账）。
- **机器可验证骨架不依赖任何文字**：`DEFECTS §2` 证据链块由 `gen-defects-evidence.mjs` 从 `report.json` **机读生成**，`--check` **IN-SYNC / exit 0**；生成器已入册（`README:85`，8226 B / `782560e3…`）。
- **不变量保持**：两脚本 sha256 未变、本轮 **0 次完整运行**、`report.json` 与 `report-rework2-run.json` 同 hash 同 mtime、目录仍 22 文件、`%TEMP%\clean004-*` = 0、`tally` 与「D-3 已撤回」口径未破坏、产品面 `git status` 空、用户 `~/.dsh` `0.5.2` 未被触碰。
- **可失败性机制独立性成立**：`falsifiability-check.mjs` 只读复跑 `ALL-PASS=true` / `BINDING-OK=true` / `CHECK-OK` / 声明向量 ≡ 求值向量（19/11）/ exit 0。

### 6.2 使用前提

见 §5-2（8 条）。核心三条：**`HEAD=21b100c` 且产品面未改** / **期望 `tally 49/42/4/3` + `exit 1`** / **`D4` 行与 D-2 时限按限定口径取用**。

### 6.3 残余不确定性（**不因本轮订正而消失**，须随证据同读）

1. **镜像体读数不可得**：`facts.mirrorBodyUnreachable = {reachable:false, reason:'no-mirror-node-found', realms:1, scanned:724}` ⇒ 功能判据改以**渲染面**为准；「镜像空但检索有行」这类组合**无法被本机观测排除**（`README §10-2`）。
2. **`C-face-availability` 本轮无正例**：闸门未进入 ⇒ `assertions[]` 无行（`README §10-7`）；可失败性仅由登记表向量（1 red / 2 ok）与静态绑定背书；**本轮不改探针**以保「记录运行修订 = 终版」不变量。
3. **`C5` 竞态窗口未注入复现**：结论建立在「多次干净运行 + 一次崩溃对照（`report-final4-crash.json` 的 `splitClosed:true`）+ 机制代码」之上（`README §10-5`）。
4. **`D6` 未定性**：宿主侧栏会话行计数 0（`hostSessionRowsAtB21 = {count:0, withText:0, selectorPresent:false, projectRows:1}`）⇒ 记 N-A；「宿主未渲染」与「选择器/形态差异」**不可区分**，后者需宿主前端内部知识（`README §10-3`）。
5. **`B21a` 覆盖口径窄**：仅「关键词检索」分支取得观测（`README §10-7` 同族）。
6. **同源机证强度有上限**：`staticCallSiteCounts()` 是**源文本计数代理**——R3 注入④证明「判定不再消费登记表而检查仍绿」在本机**可构造**；当前 9/9 站点经人工实读确认同源，但机证强度 < 其声称（`README §10-12`，硬化并入 CLEAN-006）。
7. **O-1 观察项未裁**：命中行标题显示为 `displayTitleOf`（本轮 = cwd 目录名 `novels`），与 session id 不同形，对「用 id 片段检索」的用户不便——**按观感面登记**（`DEFECTS §6`，`README §10-9`），交 Coordinator 决定是否另立任务。
8. **真实用户实例未验证**：D-1/D-2 的真实实例表现与 `U-1~U-14` 全部条目仍需用户**重启 DSH 后**目检；本任务按红线未触碰用户实例（`README §10-6`；用户实例 `.dsh-bundle-version` 全程 `0.5.2`）。
9. **完整运行计数 = 4 次**（超时间盒 1 次，如实登记；探针修复轮次 3 ≤ 3 上限）——`README §10-10`。
10. **`report-run1.json` / `report-rework-run.json` 退出码为推定值 1**（探针尾部 `process.exitCode = report.ok ? 0 : 1` + `ok=false`）——`README §10-4`。
11. **治理记录面口径残留（I-1/I-2）**：不影响本资产的技术可用性，但会让「同一事实的两个口径」在治理记录与 QA 交付物间同时存在；**建议 Coordinator 在新条目采用新口径**（不回溯改写历史机录）。
12. **审查只读性**：唯一写入 = 本文件；未改任何被审文件、未执行 `--write`、未运行探针、未对 `C:\Users\peter\.dsh` 写入、未关停/干扰用户 DSH 与浏览器、未创建子 agent、未与用户交互。

---

## 7. 与 R5 的对照（复审本质 = 验证修复）

| R5 finding | R5 判定 | R6 实体复核 | 状态 |
|---|---|---|---|
| **NEW-R5-01** `D4` label 自述「抽屉卡状态收敛为非『未绑定/会话失效』」未被谓词验证、在被引实体中不成立 | P3（不阻断） | `DEFECTS:131` 写入谓词原文 + 「PASS 仅表示…∧…」+「**不得**读作『卡片状态已收敛』」；`DEFECTS:78` 同口径；「同轮已收敛」全文仅存 1 处（订正说明内）；谓词源码实读**不含** `sub`/`dotSt` | **已修复（闭合）** |
| **NEW-R5-02** 上界 `≤2′31″` 作当前口径出现于 5 处，`NEW-R4-05` 订正未落地 | P3（不阻断） | 5 处（`DEFECTS:83`/`:88`②/`README:22`/`:121`/`checklist:96`）**全部统一 `≈2′31.3″`**；`≤2′31″` **0 处**作当前口径（4 处全在订正说明内）；实体复算 **151.322 s** 精确支持 | **已修复（闭合）** |
| `NEW-R4-01`①②③＋4 传播点 | R5 判通过 | 本轮回归复核：`D4` 行 / `discovery` 行 / `E1-E4·F1` 行 / 4 传播点 实体值**未变且仍一致**（§4 #6~#13、#16~#18） | **保持通过** |
| `NEW-R4-02` `--check` 入口 | R5 判通过 | 本轮只读复跑 = **IN-SYNC / exit 0** | **保持通过** |
| `NEW-R4-03` 生成器入册 | R5 判通过 | `README:85` ↔ 实体**逐项一致**（8226 B / `782560e3…`） | **保持通过** |
| `NEW-R4-04` 无基线断言已撤下 | R5 判通过 | `README:93` 撤下声明仍在；`DEFECTS.md` 无「逐字节相同」主张 | **保持通过** |

---

**审查者**：Test Reviewer Agent（只读；未修改任何被审文件 / 探针 / 清单 / `.governance/**`；未创建子 agent；唯一写入 = 本文件）
**本报告路径**：`docs/review/CLEAN-004-TEST-R6.md`
**结论**：**APPROVED_WITH_NOTES**（round = R6；硬门槛 **5/5 PASS**；`NEW-R5-01` / `NEW-R5-02` **双闭合**；增量抽查 20 格 **0 不一致** + `README §3` 22 行全表对账；P0=P1=P2=P3=0；**`unresolved_blockers = 0`**；T2 熔断不触发，复审链以通过终态结束）
