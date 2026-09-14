# CLEAN-004 测试审查报告 — R5（轻量终审：R4 阻断项二次返工核查 + 整表逐格普查）

**ROUND**：**R5** · **REVIEW_TYPE**：**test-review（light / 定点终审）**
**PREV_ROUND_REF**：`docs/review/CLEAN-004-TEST-R4.md`（**BLOCKED**，唯一 P2 阻断 = `NEW-R4-01` + P3 `NEW-R4-02~05`；`unresolved_blockers = 1`）＋上下文 `docs/review/CLEAN-004-TEST-R3.md` / `-R2.md`
**审查范围（用户已裁定，不扩范围重审整份资产）**：只核 ① `NEW-R4-01`①②③＋传播点 ④ ② 整表逐格普查 ⑤ ③ `NEW-R4-02`④ `NEW-R4-03`⑤ `NEW-R4-04`⑥ `NEW-R4-05`⑦ 不变量 ⑧ 可用性终局裁定
**审查姿态（重要背景）**：本轮返工**仍由 Coordinator 直写**（`docs/**` 属治理记录面）⇒ **作者与被审对象同源**。本报告**不采信任何「已声明订正」**：表中每一格均由我方以实体读数（原件字段 / 文件系统 / 哈希 / 脚本输出）逐格复核，并额外做「订正说明以外的残留值」反向检索。
**审查者角色**：Test Reviewer Agent（只读；**唯一写入 = 本文件**；未修改任何被审文件 / 探针 / 清单 / `.governance/**`；未创建子 agent；未与用户交互）
**仓库 / HEAD**：`D:\AI\agent\deepseek\harness\writing-workflow` / `21b100ce9ac32e534c6215e507f9835f87e0ff4c`
**日期**：2026-09-14 · **机录**：本轮 REVIEW 持久化（`review-record`）由 Coordinator 执行（审查边界禁止本 Agent 写 `.governance/**`）

---

## 0. 结论

**VERDICT: NEEDS_CHANGE**
**发现计数：P0 = 0 · P1 = 0 · P2 = 0 · P3 = 2**（`NEW-R5-01` / `NEW-R5-02`，均为**文本/标注面**，不涉及脚本、探针、断言语义与 tally）
**`unresolved_blockers`（BLOCKING 含义）= 0**：R4 的唯一阻断项 `NEW-R4-01` **已实质闭合**（3 处错值格 + 4 处传播点全部改到实体值，且「旧值只允许出现在订正说明内」的形式要求**逐条成立**）。

**一句话**：R4 阻断项的三处错值格（`D4` 行 / `discovery` 行 / `E1-E4·F1` 行）与四处传播点**全部按实体订正、逐格可对账**；`NEW-R4-02`（`--check` 入口）**已修为 IN-SYNC / exit 0**；`NEW-R4-03`（生成器入册：22 行 ≡ 22 文件、大小/哈希逐项一致）、`NEW-R4-04`（无基线断言已撤下）**均已落地**；不变量全绿（两脚本 sha256 未变、本轮 **0 次完整运行**、`tally 49/42/4/3` 与「D-3 已撤回」口径未破坏、产品面 `git status` 空）。
**但两项未达标**：① `NEW-R4-05` 的订正**未按用户清单落地**——上界仍写整秒截断的 `≤2′31″`（三文档四处：`DEFECTS:83`/`DEFECTS:88`/`README:22`/`checklist:96`），`≈2′31.3″` **仅出现在 `README:105` 的订正过程说明里**；② 整表普查新发现 `D4` 断言 label 自述「抽屉卡状态收敛为非『未绑定/会话失效』」，而该断言 detail 的抽屉读数**正是 `…· 会话失效`**（`dotSt='stale'`），且其谓词**根本不读该状态** ⇒ 文档列出的「通过」判据在被引实体中**不成立**（`DEFECTS:131` 自称「同轮已收敛」仅以 `bound:true` 为据）。

> **成本提示（给裁定者）**：两项残余都是**纯文本订正**（`DEFECTS` 2~3 行 + `README` 2 行 + `checklist` 1 行；`NEW-R5-01` 另需探针 label 的一句限定，但**不必改探针**——可在 `DEFECTS`/`README` 就地注明 label 为陈旧自述）。**无需重跑探针**，不改变任何断言状态与 `tally`。
> **与 R4 的差别（降级理由，必须写明）**：R4 的 `NEW-R4-01` 是**表格数据格本身填错值**（`FAIL`/`N-A ×5` 与实体相反、跨运行误植）⇒ 机读/人工复核一律撞上，故判 P2 阻断；本轮两处**数据格全部与实体一致**，残余仅存在于**表外标注与摘要措辞**（label 自述、上界舍入写法），故按既有标尺（`R3-04`/`R3-06` 内部不一致、`NEW-R4-05` 舍入同类）判 **P3**、不阻断。
> **诚实边界**：本轮**不是**硬门槛全绿 ⇒ 本报告**不出具 `APPROVED`/`APPROVED_WITH_NOTES`**（后者要求 `unresolved_blockers=0` 且无未解决 finding，本 Agent 认为两处残余虽非阻断、但确属「文档 ⇄ 实体」未达标面，交由 Coordinator/用户裁定是「再一轮文本订正」还是「记为已知局限」）。

| 维度 | 结论 | 一句话依据 |
|---|---|---|
| 1. 策略完整性 | **满足**（沿用 R1~R4 独立复核，本轮未重审） | 三态口径、9 处 N-A 门控与谓词互斥、共享登记表 + `evalPred` 唯一判定入口 —— 探针/自证脚本 sha256 未变即等价「未受影响」 |
| 2. 用例质量 | **满足**（本项本轮未重审） | 49 条断言、9 谓词 19 red / 11 ok 实体未变（`falsifiability-check.mjs` 复跑 `ALL-PASS=true`/`BINDING-OK=true`/`CHECK-OK`，exit 0） |
| 3. 覆盖率 | **满足**（本项本轮未重审） | `checklist` 未被本轮触碰（大小/哈希 = R3 期实测值） |
| 4. 证据充分性 | **基本满足（附 2 条 P3）** | R4 三处错值格 + 四处传播点全部订正 ✓；残余 = `D4` label 自述与被引实体矛盾（`NEW-R5-01`）+ 上界舍入未归一（`NEW-R5-02`） |
| 5. 可复现性 | **满足** | `--check` **IN-SYNC / exit 0**（R4 的 DRIFT 已消除）；`--print` 与仓内标记块 **5/5 行逐字符相同**；生成器已入册且哈希可核 |

---

## 1. 核验方法（全部只读；**本轮 0 次探针运行**）

| 手段 | 命令 / 读取面 | 结果摘要 |
|---|---|---|
| 实体哈希普查 | `Get-ChildItem docs\evidence\CLEAN-004 -File` + `Get-FileHash -Algorithm SHA256` | **22 个文件**逐项（大小 + sha256 + mtime）已取；探针 `DE2DE511…9065B65`、自证脚本 `5AFB8663…408159A`（未变）；`DEFECTS.md` `DFF76EB4…C3BD3C2`/35385 B；`README.md` `BF761D5C…114DA93`/40550 B；`gen-defects-evidence.mjs` `782560E3…E5FDA23`/8226 B |
| `README §3` 全表对账 | 22 行 ×（大小 + sha256）逐项重算比对 | **21/22 逐项一致**；唯一不一致 = `README.md` 自指行（该行按定义=「写入本行之前」的读数，非矛盾；见 §2-5） |
| `report.json` 实体读数 | `ConvertFrom-Json` 逐字段 | `tally {49,42,4,3}`、`ok=false`、`crash=[]`、`head=21b100c…`、`headDirty=false`、`05:13:45.162Z→05:16:55.181Z`（**190.019 s**）、`rootRemoved=true`、`realEnvVerdict.ok=true` |
| 断言逐条读数 | 对 5 份 report 逐断言取 `status` / `at` / `detail` | `D4`/`E1`/`E2`/`E3`/`E4`/`F1` 的 status 与 `at` 全部取到实体值；`run1` 的 `D4` = FAIL @`04:10:28.407Z`（与 `DEFECTS:131` 订正说明一致） |
| 时间跨度复算 | `convergence.samples[0].t`（epoch ms）→ UTC；与断言 `at` 相减 | 记录运行下界 `05:14:05.991Z→05:16:12.460Z` = **126.469 s**；上界同起点 →`05:16:37.313Z` = **151.322 s**；discovery 同起点 →`04:37:28.093Z` = **142.691 s** |
| 机生成复算 | `node gen-defects-evidence.mjs --print`（只读）＋逐行 `[string]::Equals(..., Ordinal)` | 仓内标记块 `L96-100` **5/5 行逐字符相同**（144/197/383/604/427 字符） |
| 机生成自校验 | `node gen-defects-evidence.mjs --check`（只读） | **`DEFECTS-EVIDENCE-CHAIN IN-SYNC (EOL-normalized)` / exit 0**（`rows=5 bytes=1759`） |
| 残留值反向检索 | `[regex]::Matches` 统计 `N-A ×5` / `bound:false` / `≤2′31″` / `2′31.3″` / `不收敛` 在两文档的**每一出现处** | `N-A ×5` 各 1 处、**均落在订正说明内**；`bound:false` 仅 `C9`/`C10` 的 `settleToBound:false`（真实读数） |
| 文件时间戳取证 | 4 张 PNG `CreationTime` / `LastWriteTime` | `CreationTime` = 01/03/04 `12:17:04`、02 `12:42:25`；`LastWriteTime` = `12:38:44`/`12:41:08`/`12:41:20`/`12:38:53` —— 与 `README:93` 逐项一致 |
| 交叉文档参照 | `report-run1.json` 的 `hostWorkspaceJson` 原始文本 | `workspaces["5a763818-0397-475b-940e-2bc6302ea268"]` 首项 `session-52f36262-4f02-4956-a979-d5efaa3a6d2e`、`updatedAt=2026-09-14T04:06:02.503Z` —— 与 `DEFECTS:99` 逐字一致 |
| 扫描面 | 全仓 `docs/**` + `.governance/**` 检索 `N-A ×5` / `2′31″` 命中文件清单 | 用于确认「残留值未被其它被审文档二次引用」（`.governance/**` 属治理记录面，**不在本报告定级范围**，见 §6-9） |
| 回归/自证复跑 | `node falsifiability-check.mjs`；`node --check probe-clean-004.mjs` | `VECTOR-TALLY={red:19,ok:11}` / `ALL-PASS=true` / `BINDING-OK=true` / `CHECK-OK`（exit **0**）；探针语法 exit 0（**未运行探针**） |
| 仓库写面 | `git status --porcelain`（全量 + 产品面）· `git rev-parse HEAD` | 产品面（`lib/ test/ scripts/ agent-presets/ package.json README.md CHANGELOG.md`）**空**；`HEAD=21b100c…` |
| 残留 | `%TEMP%\clean004-*` 计数 | **0** |
| 用户环境 | 只读 `~/.dsh/.../.dsh-bundle-version` | `0.5.2`，mtime **09-12 19:51:40**（未变）⇒ 用户实例/浏览器未被触碰 |

---

## 2. 逐条核对表（用户清单 1~10 · 100% 有判定）

### 2-1 `NEW-R4-01`① 影响表 `D4` 行 — **通过**

| 核对点 | 实体读数（本轮实测） | 判定 |
|---|---|---|
| `DEFECTS.md:131` 状态 + 读数 | 现文 `**PASS** \`{autoCreateBound:{sub:'outline_writing · 3章 · 1200字', bound:true}}\`（断言时刻 \`05:16:37.313Z\`）`；与 `report.json` 的 `D4-auto-create-book-persisted`（`status=PASS`、`at=2026-09-14T05:16:37.313Z`、`detail.autoCreateBound={"sub":"outline_writing · 3章 · 1200字","bound":true}`）**逐字一致** | ✓ |
| 旧值位置 | `FAIL \`{bound:false}\`` 在 `:131` **仅出现于订正说明**（「原写 FAIL `{bound:false}` 系误取 `report-run1.json` 的 `D4`（FAIL @`04:10:28.407Z`）」）；全文 `bound:false` 字面出现 **2 处，且均为 `C9` 行**（`:129`/`:216` 的 `settleToBound:false` 真实读数） | ✓ |
| 跨运行归属 | 所述 `run1` 取值可核：`report-run1.json` 的 `D4` = **FAIL** @ **`04:10:28.407Z`** ⇒ 订正说明里的归因**为真** | ✓ |
| 同表其余格（`C9`/`C10`） | `:129` `C9` = FAIL `{reason:'分栏重开失败', settleToBound:false, reopenAttempt.subBefore:'…会话失效', reopenDiag.bindPanel:true}` ↔ 实体同值同键；`:130` `C10` = FAIL `{sideAfter.splitOpen:false, chatSide:'right'}` ↔ 实体同值 | ✓ |

**判定：通过**（唯一格值问题已消除；`D4` 行不含「跨运行混引」。附 `NEW-R5-01` 属 label 层面，见 §3）

### 2-2 `NEW-R4-01`② 跨运行对照表 `discovery` 行 — **通过**

| 核对点 | 实体读数 | 判定 |
|---|---|---|
| 状态 / 时刻 | `DEFECTS.md:85` 现文 `**PASS**（\`D4\` 断言时刻 \`04:37:28.093Z\`）` ↔ `report-rework-discovery.json`：`D4` `status=PASS`、`at=2026-09-14T04:37:28.093Z` | ✓ |
| 读数 | `autoCreateBound = {sub:'outline_writing · 3章 · 1200字', bound:true}` ↔ 实体 `detail.autoCreateBound={"sub":"outline_writing · 3章 · 1200字","bound":true}` | ✓ |
| 形态描述 | 「先 `stale` 后收敛：同轮 `C3b`=FAIL（`converged=false`，采样窗 `04:35:05.402→04:35:17.459Z` 13/13 `stale`）」↔ 实体：`converged=false`、`samples=13`、`samples[0].t`→`04:35:05.402Z`、`samples[12].t`→`04:35:17.459Z`、13 帧全 `dotSt='stale'` | ✓ |
| ≤2′22.7″ | 复算 `04:35:05.402Z → 04:37:28.093Z` = **142.691 s = 2′22.7″**（四舍五入 1 位小数**精确成立**） | ✓ |
| stdout `L49` | `rework-discovery-stdout.log` 第 49 行 = `  OK   D4-auto-create-book-persisted […]`（JSON 与转录一致，互为反证） | ✓ |

**判定：通过**（R4 所指「三格全错」已三格全对）

### 2-3 `NEW-R4-01`③ 影响表 `E1-E4` / `F1` 行 — **通过**

| 核对点 | 实体读数 | 判定 |
|---|---|---|
| 状态 | `DEFECTS.md:132` 现文 `**PASS ×5**` | ✓ |
| 逐条时刻（**逐断言对上**） | `E1-short-notice-compact` `PASS` @`05:16:26.733Z`、`E2-long-notice-flow` `PASS` @`05:16:27.922Z`、`E3-long-notice-geometry` `PASS` @`05:16:27.922Z`、`E4-notice-close` `PASS` @`05:16:28.711Z`、`F1-split-claim-event` `PASS` @`05:16:32.488Z` —— 5 条 **status 与 `at` 均与 `report.json` 逐条一致** | ✓ |
| 与 `N-A=3` 一致 | `report.json` 的 N-A = `B5-found-sessions-area`/`C11-flip-back`/`D6-session-switch-close` **恰 3 条**；FAIL 4 = `D2-esc-bind-yield`/`C3b`/`C9`/`C10` ⇒ 文档「本运行 N-A 仅 3 条」为真 | ✓ |
| 前置构造依据 | 「R2 返工用未绑定卡 `mm-third-probe` 构造前置」↔ `facts.splitReadyForNotice = {ok:true, attempts:[{cardId:'mm-third-probe', clicked:{clicked:true,source:'drawer'}, opened:true, bar:true, bindPanel:false}], reason:'unbound-card-reopen'}` | ✓ |
| ⚠ 任务书里的「`E3` @`05:16:27.922Z`、`E4` @`05:16:28.711Z`」 | 文档 `:132` **未**给 `E3`/`E4` 时刻（只给 `E1`/`E2`），**属任务书写法**；实体值如上，`E3`=`E2` 时刻、`E4`=`05:16:28.711Z` | — （不影响文档判定） |

**判定：通过**

### 2-4 `NEW-R4-01` 传播点 — **通过**

| 传播点 | 实体文本（本轮实读） | 判定 |
|---|---|---|
| `DEFECTS:89`③ | 「…`run1`：**全程不收敛**；`discovery`：先 `stale` 后收敛（≤2′22.7″）——**R4 NEW-R4-01 订正**：原写「`run1`+`discovery` 不收敛」对 `discovery` 不成立」 | ✓ 已订正 |
| `DEFECTS:102`(e) | 「…`discovery` 与记录运行同形态（先 `stale`、`D4`@`04:37:28.093Z` 已 bound）…**R4 NEW-R4-01 订正**：原写「`run1`/`discovery` 两轮则不收敛」对 `discovery` 不成立」 | ✓ 已订正 |
| `README:22`（N-05 摘要第 5 条） | 「`D4` = **PASS**（记录运行 / `discovery`）/ **FAIL**（`run1`）分列（**R4 NEW-R4-01 订正**：原把 `discovery` 也写成 FAIL——实体为该轮 `D4` PASS @`04:37:28.093Z`）」 | ✓ 已订正 |
| `README:121`（`N-05` 处置行，R4 报告标注为 `:120`） | 「⚠ **R2 标已修复；R4 判未彻底（NEW-R4-01）→ 已按 R4 实体值二次订正**」+ 逐项列出 `discovery` `D4`=**PASS** @`04:37:28.093Z`、仅 `run1`=**FAIL** ⇒ **不再无条件标「✅ 已修复」** | ✓ 已订正 |

**判定：通过**（四处传播点均改为实体口径，且「未彻底」如实留痕）

### 2-5 `NEW-R4-02` `--check` 入口 + EOL 归一不改生成内容 — **通过**

| 核对点 | 实体读数 | 判定 |
|---|---|---|
| `--check` 结果 | `node docs\evidence\CLEAN-004\gen-defects-evidence.mjs --check` ⇒ **`DEFECTS-EVIDENCE-CHAIN IN-SYNC (EOL-normalized)`**、`rows=5 bytes=1759`、**exit 0**（R4 期为 `DRIFT`/exit 3） | ✓ **已修** |
| 归一仅影响对账 | `gen-defects-evidence.mjs:121-122`：`norm = s.replace(/\r\n/g,'\n').replace(/\r/g,'\n')`，比较式 = `norm(sec.body).trim() === norm(generated).trim()`；**除比较式外无任何使用 `norm` 的写路径** | ✓ |
| 生成内容未被改动 | `--print` 输出（`buildRows()` 返回值）与仓内标记块 `L96-100` **5/5 行 `Ordinal` 逐字符相同**（144/197/383/604/427）；`rows=5` 与块体行数一致 | ✓ |
| `--write` 面 | 写路径仍为 `sec.src.slice(0,i+BEGIN.length) + '\n' + generated + '\n' + sec.src.slice(j)`（`L134`），**未新增任何内容层变换**；文档 CRLF=261 / bare-LF=0，生成体为 LF ⇒ 若执行 `--write` 仍会产生混合 EOL（R4 的次级建议未采纳，**非本轮范围、不计发现**） | ✓（信息） |

**判定：通过**

### 2-6 `NEW-R4-03` 生成器登记入册 — **通过**

| 核对点 | 实体读数 | 判定 |
|---|---|---|
| 登记行 | `README.md:85` = `| \`gen-defects-evidence.mjs\` | 8226 | \`782560e349728fbfcf024afdf16ae776d3adcba9b4ed0f46d9ac708d3e5fda23\` | **R3 定点返工新增**…` | ✓ 已入册 |
| 大小 / 哈希 | 实体 = **8226 B / `782560E349728FBFCF024AFDF16AE776D3ADCBA9B4ED0F46D9AC708D3E5FDA23`** ↔ 表内值**逐项一致** | ✓ |
| 表行数 ≡ 文件数 | `README §3` 表 **22 行**（含 `README.md` 自指行）↔ 目录实体 **22 个文件** | ✓ |
| 其余 21 行 | 逐项重算：**21/21 与实体一致**（唯一「不一致」= 自指行，见下条） | ✓ |

**判定：通过**

### 2-7 `NEW-R4-04` 无基线断言 — **通过**

- `README.md:93` 现文：「其中 `01-drawer-idle.png` 自 R1 期起未再变更（其 `LastWriteTime` 落在 R1 返工窗口内）；**「与 R1 期 sha256 逐字节相同」这一断言已于 R4 撤下（NEW-R4-04）：R1 期报告未登记该文件哈希，无基线可核，故不再作为断言**」。
- 全仓计数：`逐字节相同` 在 `README.md` **仅 1 处**且在**撤下声明**内；`DEFECTS.md` **0 处**。
- 时间戳实体自洽：01 的 `LastWriteTime=12:38:44`（≡ UTC `04:38:44`，落在 R1 返工窗口 `04:38:34.920Z→04:41:27.904Z`）；01/03/04 的 `CreationTime=12:17:04`、02 = `12:42:25` ↔ 文档逐项一致。
- **判定：通过**（断言已撤下并写明「无基线可核」理由；未以改述方式复活同类主张）

### 2-8 `NEW-R4-05` D-2 上界归一 — **不通过**（详见 §3 `NEW-R5-02`）

| 口径落点 | 实体文本（本轮实读） | 判定 |
|---|---|---|
| `README:105`（§4 表 D-2 行） | 「**≥2′06″ 未收敛、≈2′31.3″ 内收敛**（…上界按 R4 NEW-R4-05 由整秒截断的 `≤2′31″` 改为实测 `≈2′31.3″`…）」 | ✓ **唯一采纳** |
| `README:22`（N-05 摘要 #5） | 「…「长期停『会话失效』」改为实测时限（**≥2′06″ 未收敛、≤2′31″ 内收敛**，按 R3-05 订正；原写 1′46″ 系下界锚点取错）」 | ❌ 仍为 `≤2′31″` |
| `README:121`（N-05 处置行） | 同口径 `≤2′31″` | ❌ 仍为 `≤2′31″` |
| `DEFECTS:83`（跨运行表记录运行行） | 「**收敛于 ≤ 2′31″**（`D4` 于 `05:16:37.313Z` 已 bound ⇒ `05:14:05.991Z → 05:16:37.313Z` = **2′31.3″**）」 | ❌ 缩略与实测混写（同格内并存） |
| `DEFECTS:88`②（订正说明） | 「…**≥ 2′06″ 未收敛、≤ 2′31″ 内收敛**（…上界 = 同轮 `D4`（`05:16:37.313Z`）已 bound 的时刻…）」 | ❌ 仍为 `≤2′31″` |
| `DEFECTS:89`③ | 「记录运行：先 `stale` 后收敛（≤2′31.3″）」 | ✓（该处为实测口径） |
| `DEFECTS:218`（§4 表） | 「（≥2′06″ 未收敛，见 §2 上表；R3-05 订正原写值 1′46″）」 | ✓（未复写上界） |
| `checklist:96`（`D-07`） | 「**FAIL**（见缺陷 **D-2**；实测时限 **≥2′06″ 未收敛、≤2′31″ 内收敛**，按 R3-05 订正——原写 1′46″ 系下界锚点取错；非确定性）」 | ❌ 仍为 `≤2′31″`（该文件大小/哈希仍 = R3 期实测 `42669 B`/`c6fccb03…`，**本轮未触碰**） |

**判定：不通过** —— 用户清单第 9 条要求「已由 `≤2′31″` 改为实测口径（`≈2′31.3″`），三文档一致」；实体为**三文档不一致**（`≤2′31″` 仍在 `README`×2 + `DEFECTS`×2 + `checklist`×1 处作**当前口径**，`≈2′31.3″` 仅 `README:105` 一处 + `DEFECTS:83` 同格并存）。数值本身自洽（`151.322 s = 2′31.3″` 可复算），故定级 **P3**。

### 2-9 不变量（硬核） — **通过**

| 不变量 | 实测 | 判定 |
|---|---|---|
| 探针 sha256 | `probe-clean-004.mjs` = `DE2DE511E89A8CCC6D08B29D529E51336079BC3CEAB4B937795DAD88D9065B65` = `de2de511…9065b65`；副本 `…final-rev-b1f1c8c0.mjs` 同值；mtime `13:13:36`（早于返工窗） | ✓ **未变** |
| 自证脚本 sha256 | `falsifiability-check.mjs` = `5AFB8663E6A9C25D3D44F2B2D5A2CA6E6BB6B3C282C9DA38982A81A26408159A` = `5afb8663…408159a`；mtime `13:01:25` | ✓ **未变** |
| 本轮完整运行次数 | `report.json` 仍 `05:13:45.162Z→05:16:55.181Z`（`ok=false`、`crash=[]`、`headDirty=false`）、sha256 `A6D8AE0F…0481958D`、mtime `13:16:55`；`report-rework2-run.json` 同 hash 同 mtime；`%TEMP%\clean004-*` = **0**；目录 = 22 文件（= R4 期 22，**未新增 report/stdout**；本轮返工窗变更仅 `DEFECTS.md`(17:45:17) / `README.md`(17:46:20) / `gen-defects-evidence.mjs`(17:46:00) 三个**已入册**文件） | ✓ **0 次** |
| `tally` | `{"total":49,"pass":42,"fail":4,"na":3}`；FAIL = `D2-esc-bind-yield`/`C3b`/`C9`/`C10`，N-A = `B5`/`C11`/`D6`（实体逐条核对）；三文档口径一致（`DEFECTS:9/37/212/224`、`README:29/32/33/312`、`checklist`） | ✓ **未破坏** |
| 「D-3 已撤回」 | `DEFECTS:140` 标题删除线 + 已撤回、`:37/:38/:242`、`README:6/20/108/119` 等 —— 未见任何将其表述为产品缺陷者 | ✓ **未破坏** |
| 产品写面 | `git status --porcelain -- lib/ test/ scripts/ agent-presets/ package.json README.md CHANGELOG.md` = **空**；`HEAD=21b100ce9ac32e534c6215e507f9835f87e0ff4c` | ✓ |
| 用户环境 | `~/.dsh/.agent-presets/novel-writing/.dsh-bundle-version` = `0.5.2`，mtime `09-12 19:51:40`（未变） | ✓ |

### 2-10 可用性终局裁定 — 见 §5

---

## 3. 整表逐格抽查表（**32 格**；含 ≥20 要求）

> 口径：**不一致 = 文档所引数值/状态/时刻与「文档自己指明的原件」实体矛盾**（自指行按定义排除；订正说明内的旧值按用户规则不计为不一致）。逐格以「文件:行号 → 实体来源 → 实体读数 → 判定」给出。

| # | 文档格（文件:行） | 文档写 | 实体来源 | 实体读数 | 判定 |
|---|---|---|---|---|---|
| 1 | `DEFECTS.md:9` | `report.json` sha256 `a6d8ae0f…`、`tally 49/42/4/3`、`05:13:45→05:16:55Z`、exit 1 | `report.json` 现场哈希 + 字段 | `A6D8AE0F…`、`{49,42,4,3}`、`05:13:45.162Z→05:16:55.181Z` | ✓ |
| 2 | `DEFECTS.md:37` | P0=0 / P1=0 / P2×1（D-2）/ P3×1（D-1）/ D-3 已撤回 | 报告 FAIL 集合 + 文档裁定 | `D2-esc`(P3,D-1) + `C3b`(P2,D-2) + `C9`/`C10`(D-2 下游) | ✓ |
| 3 | `DEFECTS.md:77` | `converged=false`；13 次采样 `05:14:05.991Z→05:14:18.088Z`；13/13 `stale` | `facts.convergence` | `samples=13`、`converged=false`、首 `05:14:05.991Z`、末 `05:14:18.088Z`、13 帧 `stale` | ✓ |
| 4 | `DEFECTS.md:78` | 同轮 `D4`（`05:16:37Z` 断言）PASS、`bound=true`、`sub='outline_writing · 3章 · 1200字'` | `D4` 断言 | `PASS` @`05:16:37.313Z`、`bound:true`、`sub` 同值 | ✓ |
| 5 | `DEFECTS.md:83` ① | 权威记录运行 `PASS`（`D4` 断言时刻 `05:16:37.313Z`） | `D4` 断言 | `PASS` @`05:16:37.313Z` | ✓ |
| 6 | `DEFECTS.md:83` ② | 读数 `{sub:'…1200字', bound:true}` | `D4.detail.autoCreateBound` | `{"sub":"outline_writing · 3章 · 1200字","bound":true}` | ✓ |
| 7 | `DEFECTS.md:83` ③ | 末次直接读数跨 `05:14:05.991Z → 05:16:12.460Z` = `2′06.5″` | `samples[0].t` ↔ `C9.at` | `126.469 s` = **2′06.5″** | ✓ |
| 8 | `DEFECTS.md:83` ④ | 收敛于 `≤ 2′31″`（同格又写 `2′31.3″`） | `samples[0].t` ↔ `D4.at` | `151.322 s` = **2′31.3″** ⇒ 缩略值比实测**紧 0.322 s** | ❌（`NEW-R5-02`） |
| 9 | `DEFECTS.md:84` | `run1`：`FAIL`、`{sub:'…会话失效', bound:false}`、不收敛 | `report-run1.json` `D4` | `FAIL` @`04:10:28.407Z`、`bound:false`、`sub` 含「会话失效」 | ✓ |
| 10 | `DEFECTS.md:85` ① | discovery `PASS` @`04:37:28.093Z` | `report-rework-discovery.json` `D4` | `PASS` @`04:37:28.093Z` | ✓ |
| 11 | `DEFECTS.md:85` ② | 采样窗 `04:35:05.402→04:35:17.459Z` 13/13 `stale` | 该轮 `C3b`/`convergence` | 首 `04:35:05.402Z`、末 `04:35:17.459Z`、13/13 `stale`、`converged=false` | ✓ |
| 12 | `DEFECTS.md:85` ③ | 自首采样起 `≤ 2′22.7″` 收敛 | 该轮 `samples[0].t` ↔ `D4.at` | `142.691 s` = **2′22.7″** | ✓ |
| 13 | `DEFECTS.md:85` ④ | 同轮 stdout `L49` = `OK D4-auto-create-book-persisted` | `rework-discovery-stdout.log` L49 | `  OK   D4-auto-create-book-persisted […]` | ✓ |
| 14 | `DEFECTS.md:99` | `run1` 副证：`workspaces["5a763818-…"]`、首项 `session-52f36262-…`、`updatedAt=04:06:02.503Z` | `report-run1.json.facts.isolatedDisk.hostWorkspaceJson`（原始文本） | `5a763818-0397-475b-940e-2bc6302ea268` / `session-52f36262-4f02-4956-a979-d5efaa3a6d2e` / `2026-09-14T04:06:02.503Z` | ✓ |
| 15 | `DEFECTS.md:99`（(d) 机生成格） | `updatedAt=05:14:04.079Z`、`createdAt=05:13:45.146Z`、差 19 s | `report.json.facts.isolatedDisk.hostWorkspaceJson` | 同值；`20.933 s→18.933 s` 差 = **18.933 s**（文档「19 s」= 取整） | ✓ |
| 16 | `DEFECTS.md:100`（a′ 机生成格） | `hostWorkspaceSessionIds` 2 项、`boundId=session-22721558-…`、`source` 三面串 | `report.json.facts.sessionAckIds` | 逐字一致（2 项 / 同 id / 同 `source`） | ✓ |
| 17 | `DEFECTS.md:131` ① | `D4` = `PASS` + `{sub:'outline_writing · 3章 · 1200字', bound:true}` @`05:16:37.313Z` | `D4` 断言 | 逐字一致 | ✓ |
| 18 | `DEFECTS.md:131` ② | 「fixture 仍 10 本」 | `D4.detail.afterCreate.drawerCards` | `10` | ✓ |
| 19 | `DEFECTS.md:131` ③ | 「同轮已收敛」 | `D4.detail.afterCreate.drawerSubs[0]` + `dotSt` | `outline_writing · 3章 · 1200字 · 会话失效`（`dotSt='stale'`）⇒ **该主张与被引实体相反** | ❌（`NEW-R5-01`） |
| 20 | `DEFECTS.md:132` | `E1-E4`/`F1` = `PASS ×5`、`E1 @05:16:26.733Z`、`E2 @05:16:27.922Z` | 5 条断言 | 逐条 `PASS`；`at` 与实体一致（`E3`=`E2` 时刻、`E4`=`05:16:28.711Z`、`F1`=`05:16:32.488Z`） | ✓ |
| 21 | `DEFECTS.md:212` | 权威 tally `PASS 42 / FAIL 4 / N-A 3` | `report.json.tally` | `{49,42,4,3}` | ✓ |
| 22 | `DEFECTS.md:218` | `C3b` FAIL、`converged:false`、13/13、`D4`=PASS、下界 `≥2′06″` | `C3b` + `convergence` + `D4` | 全项一致 | ✓ |
| 23 | `DEFECTS.md:224` | N-A ×3 = `B5`/`C11`/`D6`；E/F 本轮**全部实测 PASS** | N-A 集合 + E/F 5 条 | 一致 | ✓ |
| 24 | `README.md:6` | 状态 `DONE_WITH_LIMITS`（D-3 撤回 + 前提重设计 + 同源机证） | `DEFECTS §3` + 报告 `FALSIFIABILITY-PROOF` | PASS、9 谓词、19/11 向量 | ✓ |
| 25 | `README.md:9` | `tally 49/42/4/3`、`05:13:45→05:16:55Z` | `report.json` | 一致 | ✓ |
| 26 | `README.md:22` | `discovery` `D4` PASS @`04:37:28.093Z`；上界 `≤2′31″` | 该轮 `D4`；本轮 `D4.at` | 时刻 ✓；上界 ❌（`NEW-R5-02`） | 部分 ❌ |
| 27 | `README.md:29` | `report.json`=权威 49/42/4/3、exit 1 | `report.json` | 一致 | ✓ |
| 28 | `README.md:32` 「FAIL 4」归属 | `D2-esc`×1 + `C3b`×1 + `C9`/`C10`×2 | FAIL 集合 | 一致 | ✓ |
| 29 | `README.md:33` 「N-A 3」归属 | `B5` / `C11` / `D6` | N-A 集合 | 一致 | ✓ |
| 30 | `README.md:89` | `checklist` = `42669 B` / `c6fccb03…4d` | 现场 `Get-FileHash` | `42669 B` / `C6FCCB03…E41650CB4D` | ✓ |
| 31 | `README.md:93` | 4 图 `LastWriteTime` `12:38:44`/`12:41:08`/`12:41:20`/`12:38:53`；`CreationTime` `12:17:04`×3/`12:42:25`；均落在 R1 返工窗、不在本轮记录运行窗 | 4 张 PNG 文件系统 + `report.json` 窗口 | 逐项一致；R1 窗 `04:38:34.920Z→04:41:27.904Z`、本轮 `05:13:45.162Z→05:16:55.181Z` | ✓ |
| 32 | `README.md:93` 末（D-2 无视觉取证） | `facts.convergence` 13/13 `dotSt='stale'`、`converged=false`；同轮 `D4`=PASS | `facts.convergence` + `D4` | 一致 | ✓ |
| 33 | `README.md:105` | `C3b` FAIL、13/13、`D4`=PASS、`≥2′06″`/`≈2′31.3″`、`run1` 全程不收敛、`discovery` 同记录运行形态 | 三份 report | **全部一致**（唯一按 R4 建议订正到位处） | ✓ |
| 34 | `README.md:121` | `discovery` PASS @`04:37:28.093Z`、仅 `run1` FAIL、上界 `≤2′31″` | 三份 report | 时刻/归属 ✓；上界 ❌（同上） | 部分 ❌ |
| 35 | `README.md:283` | `$r.tally` ⇒ `{"total":49,"pass":42,"fail":4,"na":3}` | `report.json` | 一致 | ✓ |
| 36 | `README.md:85` | `gen-defects-evidence.mjs` = `8226 B` / `782560e3…` | 现场 `Get-FileHash` | `8226 B` / `782560E3…E5FDA23` | ✓ |
| 37 | `README.md:87`（自指行） | `README.md` = `40395 B` / `0a400b59…`（= **写入本行之前**的读数） | 现场 `Get-FileHash` | `40550 B` / `BF761D5C…114DA93`（**自指定义内**，行内已注明 R5 以现场为准） | ✓（非矛盾） |
| 38 | `README.md:29` 命令 | `--out %TEMP%\clean004-final`；`watchdog 420000 ms` | `report.json.screenshotsTmpSource` | 四个来源路径**全部** = `%TEMP%\clean004-final\*` | ✓ |
| 39 | `checklist:96`（`D-07`） | `≥2′06″` / `≤2′31″` | 本轮 `D4.at` | 下界 ✓；上界 ❌（`NEW-R5-02`） | 部分 ❌ |
| 40 | `checklist:115`（`C-15`） | `E3` 实测 `{interTitle:0, interCtlMax:0, y:39, barBottom:39, belowContent:true}` | `E3` 断言 detail | 逐字一致 | ✓ |

**统计：抽查 40 格（含 5 个「部分」格）⇒ 完全不一致格 = 3（#8 `DEFECTS:83` 上界、#19 `DEFECTS:131` 「同轮已收敛」自述、#39 `checklist:96`）／部分不一致格 = 2（#26 `README:22`、#34 `README:121`，均为上界口径）⇒ 不一致合计 5 格 / 40 = 12.5%。**
**结论：** 表格数据格（状态 / 时刻 / 计数 / 哈希 / 大小 / 路径）**与实体 100% 一致**；全部不一致项集中在**上界舍入写法**（4 格，同一个源 `NEW-R4-05` 复发）与 **`D4` label 自述**（1 格，新发现）。⇒ 「整表逐格 100% 一致」硬门槛 **FAIL**（2 条 P3），但**无 P0/P1/P2**。

---

## 4. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0**（本轮新发现最高 P3；交付侧 D-1 P3 / D-2 P2 / P0=0 未变） | ✅ **PASS** |
| R4 阻断项 + 4 条 P3 逐条有处置判定 | = 100% | **5/5 有判定**：`NEW-R4-01`（①②③＋4 传播点）＝**通过**；`NEW-R4-02`＝**通过**（IN-SYNC/exit 0）；`NEW-R4-03`＝**通过**（入册一致）；`NEW-R4-04`＝**通过**（已撤下）；`NEW-R4-05`＝**不通过**（仅 1/6 处采纳，见 §2-8） | ✅ **PASS**（判定齐备） |
| 整表逐格抽查（≥20 格）与实体一致 | = 100% | **40 格抽查 ⇒ 3 格完全不一致 + 2 格部分不一致**（`NEW-R5-01`×1 + `NEW-R5-02`×4） | ❌ **FAIL** |
| 不变量 | 两脚本 sha256 未变 + 本轮 0 运行 + tally/口径未破坏 | **PASS**：`de2de511…` / `5afb8663…` 未变；`report.json` 仍 `05:13:45.162Z→05:16:55.181Z`、无新增 report/stdout、`%TEMP%\clean004-*`=0；`tally 49/42/4/3` 与「D-3 已撤回」口径未破坏；产品面 `git status` 空、`HEAD=21b100c` | ✅ **PASS** |
| 每条发现标注 P0~P3 | = 100% | **2/2**（`NEW-R5-01` P3 + `NEW-R5-02` P3，逐条带级别 + 文件:行号 + 实体读数 + 建议） | ✅ **PASS** |

**裁决：NEEDS_CHANGE** —— 1 项硬门槛未通过（「整表逐格一致」）；**BLOCKING（P0/P1/P2）= 0** ⇒ `unresolved_blockers = 0`（按 `test-review` 术语的口径：不存在未解决的 BLOCKING finding；本 Agent 仍不出具 APPROVED 类终态，理由见 §0 与 §5）。
**熔断判断**：round = 5 ≥ 3，但**无 BLOCKING** ⇒ 不触发「转 BLOCKED + escalation」的 T2 条件；R4 的 BLOCKED 已由本轮实质解除。

---

## 5. 可用性终局裁定

### 5.1 裁定

**该验证资产「可用于 CLEAN-004 自动化面记录」的条件已基本满足 —— 就 R4 阻断项而言：可**。但**在两项残留文字未订正前，本报告不把整份资产标为「无条件可交付记录」**：

- **可以（且本轮已成立）的部分**：`DEFECTS.md` / `README.md` 的**全部运行读数格**（`D4`/`discovery`/`E1-E4`/`F1`/`C3b`/`C9`/`C10`/`B21*`/`B22`/`B5`/`C11`/`D6`/`tally`/时间戳/哈希/大小/隔离根/清理读数）**与四份原件逐格一致**；`DEFECTS §2` 证据链块由 `gen-defects-evidence.mjs` 从 `report.json` **机读生成**且 `--check` **IN-SYNC/exit 0**；生成器已入册并可哈希校验；探针与自证脚本在整轮返工中**零改动**（sha256 未变）、本轮 **0 次完整运行**。⇒ **作为「自动化面（探针断言 + 计数 + 隔离/清理 + 同源机证）的记录」是可用的**，其**机器可验证骨架**不依赖任何残留文字。
- **不成立的部分（2 项 P3）**：① `NEW-R5-01` `D4` label 的自述状态未经验证且与被引实体相反 —— 取用该行时必须**只认 `bound:true` + `at`**，不得引用「卡片状态收敛」这一自述；② `NEW-R5-02` 上界 `≤2′31″` 较实测紧 0.322 s —— 取用 D-2 时限时以 **`≈2′31.3″`** 为准。

### 5.2 使用前提（必须与证据同读）

1. **`HEAD = 21b100ce9ac32e534c6215e507f9835f87e0ff4c` ∧ `lib/client.js` 未改动**（`report.json.headDirty=false`；现场 `git status` 产品面为空）。
2. **期望值 = `tally 49 / 42 / 4 / 3`、`exit 1`**（FAIL 4 = D-1 ×1 + D-2 及其下游 ×3；N-A 3 = `B5`/`C11`/`D6`）。
3. **D-2 的时限口径以 `≈2′31.3″`（上界）/`≥2′06″`（下界）为准**，`≤2′31″` 视为整秒截断的旧写法；**D-2 的 P2 定级不受影响**（契约在 ≥2′06″ 内未兑现）。
4. **D-2 的「频次」以订正后口径为准**：仅 `run1` 全程不收敛；记录运行与 discovery 为「窗口内 `stale` → 其后 bound」（上界 `≈2′31.3″` / `≤2′22.7″`）。
5. **必须与 `README §10` 的 12 条局限同读**（尤其 §10-2 镜像体读数不可得、§10-12 同源机证强度上限）。
6. `D4` 行只能作为「绑定已写入（`bound:true`）@ 该时刻」的证据，**不得**作为「卡片状态已收敛」的证据（`NEW-R5-01`）。

### 5.3 残余不确定性（不因本轮订正而消失）

1. **两处 P3 属文字面**：`NEW-R5-01` 的根治需探查针 label（本轮禁改，保「记录运行修订 = 终版」不变量）或在文档内就地注明；`NEW-R5-02` 需 5 处文本归一。二者**均不影响任何断言状态、计数与机读对账骨架**。
2. **`screenshotsTmpSource` 与 PNG 实测时间戳不同源**（信息项，未定级）：`report.json.screenshotsTmpSource` 把 4 张 PNG 的来源记为 `%TEMP%\clean004-final\*`（即记录运行输出目录），而 4 张 PNG 的 `LastWriteTime` 为 **`12:38–12:41`（R1 返工窗）**，**不在**记录运行窗 `13:13:45–13:16:55`。`README:93` 的轮次归属（「R1 返工运行期间取证，非本轮」）与文件系统一致，故 `DEFECTS`/`README` 的**文字引用无误**，差异存在于**原件自身字段**；本轮未在本报告定级（会落入「改被审文件」面）。
3. **`D4` label 的陈旧期望不止「总 11 本」**：「总 11 本」文档已如实注明；「抽屉卡状态收敛为非『未绑定/会话失效』」**未**注明（`NEW-R5-01`）；该 label 是**探针源文本**，报告与文档均如实转录。
4. **未整轮复跑探针**（时间盒）：本轮以「原件逐字段实读 + 机生成复算 + 跨运行对照 + 文件时间戳 + 脚本只读复跑 + 写面/哈希不变量」替代 ⇒ 「`C3b` 真实根因」「各图确切轮次」仍有不可得面。
5. **镜像体内部读数仍不可得**（`facts.mirrorBodyUnreachable = {reachable:false, reason:'no-mirror-node-found', realms:1, scanned:724}`）⇒ 以渲染面为功能判据。
6. **`C-face-availability` 本轮无正例**（闸门未进入 ⇒ `assertions[]` 无行）⇒ 可失败性仅由登记表向量 + 静态绑定背书。
7. **`C5` 竞态窗口未注入复现**；**`B21a` 覆盖口径窄**（仅 id 检索分支）；**`D6` 未定性**（`hostRowsBefore=0`）—— 同 `README §10` 各项，本轮未重审。
8. **`README.md` 自指行不可独立复核**：现场实测值（供对账）= **`40550 B` / `BF761D5C2A7BB3D5FAF351630656FF9789BA7CB577578C59219375E5114DA93`**。
9. **`.governance/**` 不在本报告定级范围**（治理记录面）：全仓检索显示 `.governance/evidence-log.md` / `plan-tracker.md` / `session-snapshot.md` 仍含 `N-A ×5` 或 `≤2′31″` 口径（`R3-08` 同类）。**仅作信息记录，未定级、未纳入裁决**，由 Coordinator 处置。
10. **审查只读性**：唯一写入 = 本文件；未改任何被审文件、未执行 `--write`、未运行探针、未对 `C:\Users\peter\.dsh` 写入、未关停/干扰用户 DSH 与浏览器、未创建子 agent、未与用户交互。

---

## 6. 本轮发现列表（P0~P3）

| # | 文件:行号 | 级别 | 依据（实体事实） | 影响 | 建议 |
|---|---|---|---|---|---|
| **NEW-R5-01** | `DEFECTS.md:131`（连带 `DEFECTS:78`、`README:105` 的同类自述；根在探针 label = `report.json.assertions[].label` 与 `DEFECTS:132` 同源的 `E1-E4/F1` 面不涉） | **P3** | `D4` 行的「一句话依据」现写「判据末项与 C3b 同源：**同轮已收敛**」，而**同格 detail 的抽屉读数**为 `afterCreate.drawerSubs[0] = 'outline_writing · 3章 · 1200字 · 会话失效'` ⇒ **正是 label 所否定的「会话失效」态**；且该断言的**谓词源码**为 `afterCreate.cards === 8 && Array.isArray(afterCreate.id) && afterCreate.id.indexOf('zz-first-probe') >= 0 && afterCreate.drawerCards >= 10 && autoCreateBound.bound === true`（探针 `assertion('D4-…')` 处）—— **完全不读** `sub`/`dotSt` ⇒ label 自述「抽屉卡状态收敛为非『未绑定/会话失效』」**不被任何判据验证**，且在**本记录运行**中被自身读数证否（该轮 `D4`=`PASS` 仅说明 `autoCreateBound.bound === true`、`cards===8`、`drawerCards>=10`）。文档已如实注明 label 中「总 11 本」为陈旧期望，**未**注明状态自述同样陈旧 | ① 向 Developer 移交 / 任何读者按 `DEFECTS:131`「同轮已收敛」理解时，会得到与所引原件**相反**的行为认知（记录运行该时刻卡片**仍是**「会话失效」）；② 同 `DEFECTS:78`「⇒ 同一运行内卡片先 `stale` 后收敛」与 `README:105`「同轮 `D4`=PASS ⇒ 收敛迟滞」措辞均**以该 label 为据**，属同一处的三次转写；③ **不构成**跨运行混引或计数错误，故不阻断 | **A（推荐，零风险）**在 `DEFECTS:131` 括注内补一句：「label 中『抽屉卡状态收敛为非「未绑定/会话失效」』系**陈旧自述**（探针谓词不读该状态；本运行该时刻抽屉读数为『…会话失效』）——`PASS` 仅表示 `autoCreateBound.bound === true ∧ cards===8 ∧ drawerCards≥10`」，并在 `DEFECTS:78`/`README:105` 同口径限定；**B** 根治：改探针 label 或加状态断言（**须重跑并产生新记录运行**，与本轮「不扫尾改探针」裁量冲突，不建议此刻做）；**C** 记为已知局限（`README §10` 追加一条） |
| **NEW-R5-02** | `DEFECTS.md:83`、`DEFECTS.md:88`②、`README.md:22`、`README.md:121`、`checklist:96`（口径承接 `DEFECTS:89`③ / `README:105` 的实测值） | **P3** | `NEW-R4-05` 的订正**未按清单落地**：上界仍作整秒截断的 **`≤2′31″`**（作**当前口径**出现于上述 5 处），而 `≈2′31.3″` **仅**出现于 `README:105`（订正过程说明）与 `DEFECTS:89`③；`DEFECTS:83` 同一格内**并存** `≤ 2′31″` 与 `= 2′31.3″`。实体复算：`samples[0].t = 05:14:05.991Z` → `D4.at = 05:16:37.313Z` = **151.322 s = 2′31.3″** ⇒ 旧写法比实测**紧 0.322 s**（严格复核会显示「越界」）。`checklist` 本轮**未被触碰**（`42669 B` / `c6fccb03…` 与 R3 期实测值逐字相同） | 三文档**未归一**（用户清单第 9 条要求「三文档一致」）；阅读者若采用「窗口上界 = 2′31″」会在任何独立复算中先撞「越界 0.3 s」；与 R4 已定级的同类舍入问题**同源复发** | 统一改为实测口径 **`≈2′31.3″`**（或保守 **`≤2′32″`**）：`DEFECTS:83`（删去与实测并存的 `≤ 2′31″`）、`DEFECTS:88`②、`README:22`、`README:121`、`checklist:96`（`docs/verification/CLEAN-004-checklist.md`）—— 纯文本，**无需重跑探针**，不改变任何状态与计数 |

**汇总**：`NEW-R5-01` = 1 条 P3（label 自述与被引实体矛盾，未验证）；`NEW-R5-02` = 1 条 P3（`NEW-R4-05` 订正未落地 / 三文档未归一）。**P0 = 0 · P1 = 0 · P2 = 0**。
**定级说明**：两条均判 **P3**，与既有标尺一致 —— R4 对 `NEW-R4-05`（同类舍入）判 P3；R3 对 `R3-04`/`R3-06`（文档内部/自指不一致）判 P3。与 `NEW-R4-01`（判 P2）的界分在于：**`NEW-R4-01` 是「表中数据格填了与原件相反的取值/计数」**（`FAIL` vs `PASS`、`N-A ×5` vs `PASS ×5`、跨运行误植），直接污染机读与人工对账；**本轮两处残余**所在的**数据格全部正确**，问题位于**表外标注与摘要措辞**，且**不改变任何断定结论**。

---

**审查者**：Test Reviewer Agent（只读；未修改任何被审文件 / 探针 / 清单 / `.governance/**`；未创建子 agent；唯一写入 = 本文件）
**本报告路径**：`docs/review/CLEAN-004-TEST-R5.md`
**结论**：**NEEDS_CHANGE**（round = 5；`NEW-R4-01`①②③＋4 传播点 = **全部通过**、`NEW-R4-02`/`-03`/`-04` = **通过**、`NEW-R4-05` = **不通过**；整表 40 格抽查 ⇒ 不一致 5 格；P0=0 / P1=0 / P2=0 / P3=2；**BLOCKING = 0 ⇒ `unresolved_blockers = 0`**）
