# CLEAN-004 — 证据索引（README）

**任务**：CLEAN-004（P2，目标版本 v0.5.3）· **角色**：QA Agent · **日期**：2026-09-14
**仓库**：`D:\AI\agent\deepseek\harness\writing-workflow` · **HEAD**：`21b100ce9ac32e534c6215e507f9835f87e0ff4c`
（`git status --porcelain -- lib/client.js lib/index.js` = 空 ⇒ 断言针对的代码未在工作区被改动）
**状态**：**DONE_WITH_LIMITS**（R2 返工：**D-3 撤回** + `B21a`/`B21b` 前提重设计并实测命中 + 部署谓词与自证**同源**（`PREDICATE_REGISTRY` + 注入式核对）；局限见 §10）
**本目录性质**：CLEAN-004 的持久证据面（`%TEMP%` 已按要求清零，见 §7）。本轮为 **R2 测试审查（`docs/review/CLEAN-004-TEST-R2.md`，NEEDS_CHANGE，5 BLOCKING = N-01~N-05）的返工**。

> **复跑报告归档位置（CLEAN-006 **N-4** 口径）**：**本目录的 `report.json` 仍是 R2 权威记录运行**（`head=21b100ce9ac32e534c6215e507f9835f87e0ff4c`、`headDirty=false`、`tally 49/42/4/3`），**未被后续复跑替换**；后续任何**复跑**报告不再只落 `%TEMP%`（临时目录清理后不可复核）或覆盖本目录，而归档到**冻结资产目录之外**的新目录 **`docs/evidence/CLEAN-004-reruns/<task>-<head 短 sha>/`**（每个子目录内含当轮 `report.json` + `README.md` 一行 provenance；逐轮一子目录、互不覆盖）。**冻结资产边界**：`probe-clean-004.mjs` / `falsifiability-check.mjs` / `gen-defects-evidence.mjs` 属**冻结面**，只运行、不修改（sha256 锚值见 §3）。

---

## 1. 一句话结论

R2 的 5 条 BLOCKING（N-01~N-05）逐条落地，并随附 3 条 P3（N-06~N-08）：

1. **N-01（P1）极性反置的不可失败断言已消除**：`B21a`/`B21b` 原判定值 = `ackComplete === true`（**缺陷态记 PASS、永不可能 FAIL**）⇒ 现**重设计前提**——
   关键词改取「**实际会出现在 `displayTitle ?? id` 的串**」（宿主已认可 id 的 UI 展示串 `session-<uuid>`，`keywordSource: host-approved-ui-id`），
   判定 = 「检索前提在场 ⇒ MUST 渲染 ≥1 行且行标题可核」，**红通道 = 检索 0 行**。本轮实测 **命中**（`foundTitle='找到的会话（1）'`、`rows=[{t:'novels'}]`）⇒ `B21a`/`B21b`/`B22` **全部 PASS**。
2. **N-02（P2）部署断言与自证同源**：新设 `PREDICATE_REGISTRY` 共享登记表，部署侧**唯一**判定入口 `evalPred('<id>', 测量值)` 消费同一函数实例；
   自证方（`falsifiabilityReport()` 与独立脚本 `falsifiability-check.mjs`）对同一实例全量求值（`red*`/`ok*` 通配，`red3`/`red4` 不再被丢弃）。**注入式核对两向皆红**（见 §9）。
3. **N-03（P2）D-3 撤回**：`DEFECTS §3` 改为「**已撤回（依据不足 + 被反驳）**」并逐条写入 R2 的四项反驳；探针/文档不再称其为产品缺陷。
4. **N-04（P2）README §5.3 差异表重写**：删除被自身原件反驳的第 1 项；过程运行归因改为「`E1` 谓词/label 不同 ⇒ **两轮非同源**」。
5. **N-05（P2）跨运行引用逐项标注**：`D4` = **PASS**（记录运行 / `discovery`）/ **FAIL**（`run1`）分列（**R4 NEW-R4-01 订正**：原把 `discovery` 也写成 FAIL——实体为该轮 `D4` PASS @`04:37:28.093Z`）；「长期停『会话失效』」改为实测时限（**≥2′06″ 未收敛、≈2′31.3″ 内收敛**，下界按 R3-05、上界按 R5 NEW-R5-02 订正）。

| 运行 | 报告（入仓名） | 断言 | PASS | FAIL | N-A | 退出码 | 结论 |
|---|---|---|---|---|---|---|---|
| **R1 原记录运行**（返工前） | `report-run1.json`（R1 期独立复跑，保留对照） | 48 | 34 | 6 | 8 | 1（推定，见 §10-④） | 含 2 条空真 PASS + 5 条 N-A |
| R1 返工记录运行（**已被 R2 否证**） | `report-rework-run.json` | 49 | 40 | 6 | 3 | 1 | ❌ 含 `B21a` 伪 PASS（N-01）+ 文档误报 FAIL |
| R1 返工过程运行（非权威） | `report-rework-discovery.json` | 49 | 39 | 7 | 3 | 1 | ⚠️ 与记录运行**非同源**（见 §5.3） |
| **R2 返工记录运行（本轮权威）** | **`report.json` = `report-rework2-run.json`** | **49** | **42** | **4** | **3** | **1**（探针语义：有断言非 PASS） | ✅ 跑完、无 crash、隔离根已清理 |
| 修复前崩溃对照（R1 期） | `report-final4-crash.json` | 30 | 27 | 3 | 0 | — | ❌ `crash=TypeError` 中断 |

> **`FAIL 4` 的归属**：`D2-esc-bind-yield`（缺陷 D-1，P3）×1 + `C3b-binding-convergence`（缺陷 D-2，P2）×1 + `C9`/`C10`（D-2 下游）×2。
> **`N-A 3` 的归属**：`B5`（宿主侧栏会话行 = 0 ⇒ 前置未取得）、`C11`（⇄ 未被点击）、`D6`（宿主无会话行 ⇒ 切换动作不可构造）。
> **口径变化说明（R1 → R2）**：`B21a`/`B21b` 由「伪 PASS / 假阳性 FAIL」→ **实测 PASS**（N-01/N-03 修复）；`B22` 由 N-A → **PASS**（检索命中后有行可点）；`FALSIFIABILITY-PROOF` 由 39 谓词面「平行副本」→ **同源机证**（N-02 修复）。**PASS 42 条中不含任何不可失败项**（逐条见 §4 与 `FALSIFIABILITY-PROOF` 断言）。

---

## 2. 记录运行 provenance（可复现）

| 项 | 值 |
|---|---|
| 命令 | `node docs\evidence\CLEAN-004\probe-clean-004.mjs --out %TEMP%\clean004-final`（cwd = 仓库根；无额外环境变量、未改看门狗默认值 420000 ms） |
| 起 / 止（UTC） | `2026-09-14T05:13:45.162Z` → `2026-09-14T05:16:55.181Z` |
| 起 / 止（本地 UTC+8） | 13:13:45 → 13:16:55 |
| 时长 | **190 s** |
| **退出码** | **1**（pwsh `$LASTEXITCODE` 实测）——探针语义：`report.ok=false` ⇒ 1；`2` = 环境/隔离失败（未发生） |
| stdout 原件 | `record-run-stdout.log`（本目录，逐条断言转录） |
| HEAD / 工作区 | `21b100ce9ac32e534c6215e507f9835f87e0ff4c` / `headDirty=false` |
| 宿主平面（只读 junction） | `C:\Users\peter\AppData\Local\npm-cache\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai` |
| 浏览器 | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`（`--headless=new`，独立 `--user-data-dir`） |
| Node | `C:\Program Files\nodejs\node.exe` v24.13.1 |
| 隔离根 | `C:\Users\peter\AppData\Local\Temp\clean004-probe-WcBMlz`（**已删除**，见 §7；随机端口） |
| 探针修订（记录运行 = 返工终版） | `probe-clean-004.mjs` / `probe-clean-004.final-rev-b1f1c8c0.mjs` = sha256 `de2de511e89a8ccc6d08b29d529e51336079bc3ceab4b937795dad88d9065b65`（**同一文件**，运行后未再编辑 ⇒ 修订与运行一致，R2 N-04 的不可重建缺口本轮**不存在**） |
| 真实 `$DSH_HOME` | `C:\Users\peter\.dsh` **全程只读**（仅 `realFingerprint` 读三类 sha256 + 根目录项面） |

> 用户**正在运行**的 DSH 实例与浏览器未被触碰：探针使用独立 `DSH_HOME` + 独立临时根 + 随机端口 + 独立 headless 浏览器 profile，
> **未**关停/接管任何用户进程；用户实例 `~/.dsh/.agent-presets/novel-writing/.dsh-bundle-version` 运行前/后均 `0.5.2`（未重启、未修改）。
> **完整运行计数（R2 本轮）**：**4 次**（`clean004-r2` → `clean004-r3` → `clean004-final`×2）——超任务时间盒「≤3 次」**1 次**，原因与处置见 §10-⑩（前 3 次为返工调试轮，第 4 次为修正自证断言后重取的权威记录；如实登记，不掩盖）。

---

## 3. 文件清单（大小 + sha256）

| 文件 | 大小 (B) | sha256 | 说明 |
|---|---|---|---|
| `report.json` | 99650 | `a6d8ae0f6117163f79bbc49547d2a2a3eab6a54e5d100060141c01da0481958d` | **R2 返工记录运行**报告（唯一权威 tally 来源；= `report-rework2-run.json`） |
| `report-rework2-run.json` | 99650 | `a6d8ae0f6117163f79bbc49547d2a2a3eab6a54e5d100060141c01da0481958d` | 同上（显式命名副本，供 R3 直读） |
| `report-rework-run.json` | 81451 | `7d576275e51860a6390a275727bb3b3074be7e43901ecf7b913fb6233f98b209` | R1 返工记录运行（**已被 R2 否证**：含 `B21a` 伪 PASS；保留对照） |
| `report-rework-discovery.json` | 78511 | `644e382c61bebc6258f6d56e443c22f32cc8947dc59b312b963fe9bc7c73b2de` | R1 返工过程运行（与上者**非同源**，见 §5.3） |
| `report-run1.json` | 79288 | `1020c902b1d16f27a8b3f14e11ab36d8fcadc1e00ea9ebd53213599f474e742c` | R1 期独立复跑（返工前基线，保留对照） |
| `report-final4-crash.json` | 35136 | `75aabf1c600e4af6f2b8fd223b9669871ab8ae1770aa2f05673ace827538a3b0` | 修复前崩溃对照（`crash` + `splitClosed:true` 原件） |
| `record-run-stdout.log` | 11888 | `9f84c78bd561107c4ddae8100680c6ba0ef97c2303fd630b6397ded8a36a3cb3` | **R2 记录运行** stdout 原件（逐条断言 + 超时/清理行） |
| `rework-discovery-stdout.log` | 11653 | `f08c7f06c319ebb1267e73f2ea18291faac3e8eed8e911dfb702d495c3c5036f` | R1 返工过程运行 stdout 原件（保留对照） |
| `falsifiability-check.mjs` | 5455 | `5afb8663e6a9c25d3d44f2b2d5a2ca6e6bb6b3c282c9da38982a81a26408159a` | **独立**可失败性检查脚本（提取 `PREDICATE_REGISTRY` + **同源绑定检查**；不依赖完整探针运行） |
| `falsifiability-check-stdout.log` | 4215 | `1bdfcce977d6c368366c4c01782f341dcf5bd3cb48ea8ef22a2ed319372b2d01` | 上者的实测输出（9/9 BOUND + 19 red / 11 ok 全过，`CHECK-OK`，exit 0） |
| `probe-clean-004.mjs` | 153390 | `de2de511e89a8ccc6d08b29d529e51336079bc3ceab4b937795dad88d9065b65` | 探针（R2 返工终版；改动清单见 §5） |
| `probe-clean-004.final-rev-b1f1c8c0.mjs` | 153390 | `de2de511e89a8ccc6d08b29d529e51336079bc3ceab4b937795dad88d9065b65` | 探针终版**副本入仓**（R2 §9-2：记录运行修订**逐字可得**） |
| `probe-clean-004.final-rev-e1644ec1.mjs` | 131141 | `e1644ec1e76e4ba5297a5ad3c1fd48504f802a5fc04fb8acfd55d27985ce3b87` | **R1 返工终版**（保留对照，非本轮修订） |
| `01-drawer-idle.png` | 110199 | `82627da232a3201545ee55871c040793d644c3721761b5fd5b5e0f9ddfd85956` | 面 A 基线：侧栏抽屉 10 卡（`A1`/`A2`） |
| `02-long-notice-block.png` | 166347 | `f3cd9caaa931d8f496cd387f3da4a262c3982a8df6eebaa6c7f42951498f25b5` | UX-060 长告警 in-flow 流式面实测取证（`E2`/`E3`） |
| `03-console-final.png` | 199620 | `714b02d1fd0ad424397761f6a48af27183aa1e50ebd6236661c1fd135b8a8586` | 收尾形态：控制台 + 抽屉卡「会话失效」——**原注「D-2 可见形态」已撤下（R3-02）**：R3 放大实读表明，图中带「会话失效」后缀的是 fixture 的失效绑定书目（`nn-stale-bound…`），**被测卡「孤星纪元」无状态后缀（= 已绑定）** ⇒ 本图**不构成 D-2 的视觉取证** |
| `04-bindpanel-after-esc.png` | 193825 | `7b3632408e2e398f1b7aebc1f163fff5dee535bcad67ef922108428c65db30b9` | 缺陷 D-1 取证：按 Esc 后绑定面板仍在 + 控制台仍在 |
| `DEFECTS.md` | 36252 | `ee842b1f0f02237e6bd776d87d2261ea4d730d095e5aa476e0090d441bc645a9` | 缺陷与三态裁定（D-1 / D-2 / **D-3 已撤回** / C5 artifact / **O-1 观察项**）+ R2 订正 + R3 定点返工（§2 证据链机生成 + R3-05/07）+ R4 定点返工（§2 影响表两行 + `discovery` 行）+ **R5 定点返工（NEW-R5-01 `D4` 行谓词口径限定；NEW-R5-02 上界改 `≈2′31.3″`）**（上列为本轮写入后实体读数） |
| `recon-clean-004.mjs` | 28135 | `17b73b30f5384e389d00a4bec6ae4dd7d9289f2917a8a3239dfcf8264dfb907e` | 前任产出（仓内实测锚点探测），未改动 |
| `gen-defects-evidence.mjs` | 8226 | `782560e349728fbfcf024afdf16ae776d3adcba9b4ed0f46d9ac708d3e5fda23` | **R3 定点返工新增**：从 `report.json` **机读抽取**并生成 `DEFECTS §2` 判别证据链块（`--check` 对账 / `--print` 复算）；**R4 NEW-R4-02 订正**：对账前归一 EOL 并 trim（修前恒报 DRIFT）；**R4 NEW-R4-03 登记入册** |
| `scan-i18n-dead-keys.mjs` | 4619 | `e8e5882fe6021d022bf0c6990e73fc15241d9e0fe71977c7b06e870d6a82487c` | 前任产出（i18n 死键扫描），未改动 |
| `README.md` | 40395 | `0a400b59d4bde438eae34ad69ee0526afba3b45dcb545ce6ab9f3a4316832494` | 本证据索引（**自指**：上列 = **写入本行之前**的实体读数（R4 定点返工后）；本行写入后再改即失效 ⇒ R5 复核 MUST 以现场 `Get-FileHash docs\evidence\CLEAN-004\README.md` 为准） |

**清单文件（写锁内第二路径）**：`docs/verification/CLEAN-004-checklist.md` = **42721 B / sha256 `32213dae619a16887db11b4f96126c73d6dacbbff72f55bf05dd54b474240232`**（R5 定点返工后实测值；含 N-07 五处订正 + 新增 `R-16` + §10 计数重生成 + D-07 时限下界按 R3-05、上界按 R5 NEW-R5-02 订正）。
**哈希口径统一（R3-06 订正）**：本表所列为本文件写入前的实体读数；`README.md` 为**自指**（其行内值永远指向上一版），`DEFECTS.md` 在 R3 定点返工中由 `gen-defects-evidence.mjs` 重新生成 §2，两者返工后的最终实体值由 **R4 现场实测**给出（命令：`Get-FileHash docs\evidence\CLEAN-004\*.md -Algorithm SHA256`）。原「35576 B / `d7bd9e17…`」与表内「35858 B / `4a8b4cc2…`」两处互相矛盾的表述**已删除**。

**脱敏声明**：三份新 `report*.json` 内的隔离实例 URL `token` 已逐处替换为 `token=***`（探针侧修复，见 §5）；泄漏点在其它的宿主 stdout 转录字段 `bootTail`。
**截图取证窗口（R3-02 订正，原表述有误）**：四张 PNG 的 `LastWriteTime` 实测为本地 `12:38:44`（01）/ `12:41:08`（02）/ `12:41:20`（03）/ `12:38:53`（04）= UTC `04:38:44` / `04:41:08` / `04:41:20` / `04:38:53`，**均落在 R1 返工运行窗口（本地 12:38–12:41）**，**不在本轮记录运行窗口（本地 13:13:45–13:16:55 = UTC 05:13:45–05:16:55）**；`CreationTime` = 01/03/04 `12:17:04`、02 `12:42:25`。其中 `01-drawer-idle.png` 自 R1 期起未再变更（其 `LastWriteTime` 落在 R1 返工窗口内）；**「与 R1 期 sha256 逐字节相同」这一断言已于 R4 撤下（NEW-R4-04）：R1 期报告未登记该文件哈希，无基线可核，故不再作为断言**。另三张为 **R1 返工运行期间**重新取证（**非本轮**）。原「其余三张为本轮重新取证」**为误，已订正**。⇒ **D-2 无视觉取证**：其证据面仅为 `C3b`/`C9` 断言与 `facts.convergence`（13/13 帧 `dotSt='stale'`、`converged=false`）及同轮 `D4`=PASS 的收敛上界。

**截图路径口径（R1 F-13 修复）**：`report.json.screenshots[]` 现登记**入仓相对路径**（`docs/evidence/CLEAN-004/*.png`，跨运行稳定）；
`%TEMP%` 来源绝对路径另记于 `report.json.screenshotsTmpSource[]` 作为附注（临时目录运行后即清理）。

---

## 4. 裁定与 R2 findings 的处置（摘要）

| # | 断言 | 本轮（R2 记录运行）状态 | 裁定 | 级别 | 关键依据（详见 `DEFECTS.md`） |
|---|---|---|---|---|---|
| 1 | `D2-esc-bind-yield` | FAIL | **产品缺陷 D-1** | **P3** | 实测 `{modal:true,console:true}`；同轮 `B17` PASS 为对照；`lib/client.js:3236-3239` 让位 + `BindDialog` 无 Escape 监听 |
| 2 | `C3b-binding-convergence` | FAIL | **产品缺陷 D-2** | **P2** | 13/13 采样仍「会话失效」，同轮 `D4`=PASS ⇒ **收敛迟滞**：**≥2′06″ 未收敛、≈2′31.3″ 内收敛**（下界 = 首采样 `05:14:05.991Z` → `C9.reopenDiag.drawerSubs[0]` 读取 `05:16:12.460Z` 仍「会话失效」，按 R3-05 订正；上界按 R4 NEW-R4-05 由整秒截断的 `≤2′31″` 改为实测 `≈2′31.3″`；非确定性：`run1` 全程不收敛、`discovery` 同记录运行形态） |
| 3 | `C9-width-memory` / `C10-flip-side` | FAIL ×2 | **D-2 的下游**（非独立缺陷） | — | `settleToBound:false`（20 s 等待收敛超时）⇒ 重开落入失效重绑分支 ⇒ ⇄ 无可点目标 |
| 4 | `C5-split-panels` | PASS（两次干净运行） | **时序 artifact**（已补独立信号） | — | `splitFate` 13/13 帧在场；`C-face-availability` 使「打开后自发关闭」有变红通道（R1 F-06；R2 另订正其 N-A 门控与谓词互斥） |
| 5 | `B21a-search-find-sessions` | **PASS** | **无缺陷**（**D-3 已撤回**） | — | 关键词改取宿主已认可 id 的 UI 展示串 ⇒ 命中（`foundTitle='找到的会话（1）'`、`rows=[{t:'novels'}]`）；原判定为不可失败伪 PASS（N-01）+ 前提不可达（N-03） |
| 6 | `B21b-search-find-sessions-retest` | **PASS** | **无缺陷**（同上） | — | §16 复测命中（`consoleOpen=true`、`attempts=0`） |
| 7 | `B22-session-row-opens` | **PASS** | — | — | 命中后有行可点 ⇒ 点击后控制台关闭（`rowClick.clicked=true ∧ consoleOpen=false`）；R1 期 N-A 前置消失 |
| 8 | `FALSIFIABILITY-PROOF` | **PASS** | 机制面（N-02 修复） | — | 共享登记表 9 谓词 / 19 red + 11 ok 向量 / 9-9 源码绑定；见 §9 |

**R2 findings 处置对照（N-01~N-05 全做 + P3 ×3）**

| Finding | 处置 | 落点 |
|---|---|---|
| **N-01**（P1 `B21a` 极性反置 + 不可失败） | ✅ **已修复（前提重设计，取 (a) 分支）** | ① 关键词 = 宿主已认可 id 的 UI 展示串（`keywordSource: host-approved-ui-id`）；② 判定 = 共享登记表 `B21a-search-find-sessions`（**红通道 = 检索 0 行**）；③ 三文档 7 处 FAIL 误报全部订正为 **PASS**（§4 表 + `DEFECTS §0/§3/§4` + `checklist §10`） |
| **N-02**（P2 自证非同源 + `red3` 丢弃 + 向量计数不实） | ✅ **已修复** | 新增 `PREDICATE_REGISTRY` + `evalPred()`；自证方全量求值（`red*`/`ok*` 通配）；独立脚本加**绑定检查**与**声明数 ≡ 求值数**断言；向量计数订正为 **19 red / 11 ok**（旧称「16 反例向量」不实） |
| **N-03**（P2 D-3 撤回） | ✅ **已撤回** | `DEFECTS §3` 改标题为「**已撤回（依据不足 + 被反驳）**」并逐条写入四项反驳；`§0/§4/§5` 与 `checklist B-07` 同步；探针不再主张「镜像未反映宿主会话」 |
| **N-04**（P2 §5.3 差异表 + 过程运行归因） | ✅ **已修复** | §5.3 两表**重写**：删去被 `report.json.falsifiability.detail` 反驳的第 1 项；过程运行差异改为「`E1` 谓词/label 不同 ⇒ **两轮非同源**」（旧 label 串当前源 0 命中）；过程运行**不得**作重复性证据 |
| **N-05**（P2 跨运行引用 + D-2 措辞） | ⚠ **R2 标已修复；R4 判未彻底（NEW-R4-01）→ 已按 R4 实体值二次订正** | `DEFECTS §2` 跨运行对照表订正为：记录运行 `D4`=**PASS** @`05:16:37.313Z` / `discovery` `D4`=**PASS** @`04:37:28.093Z` / 仅 `run1` `D4`=**FAIL**（逐项标时间戳）；§2 影响表 `D4` 行与 `E1-E4/F1` 行按实体改填（前者原误取 `run1` 值、后者原误写 N-A ×5，实体为 PASS ×5）；「长期停『会话失效』」→ **≥2′06″ 未收敛、≈2′31.3″ 内收敛**（下界按 R3-05 订正、上界按 R5 NEW-R5-02 由整秒截断的 `≤2′31″` 改为实测值）；`§4` D4 行来源标注；D-2 范围收窄（不再含「搜索面恒空」症状） |
| **N-06**（P3 遗留 `.nv-modal` 未披露） | ✅ **已修复（选「修前置」）** | `prepareSplitForNotice()` 开头新增遗留遮罩收敛（等 8 s → 点遮罩 → 校验）；本轮实测 `facts.prepOverlayClean = {initialModal:true, closedBy:'backdrop-click', finalModal:false, ok:true}` ⇒ E/F/D3 观测在**干净 DOM 态**进行 |
| **N-07**（P3 计数与落点残留） | ✅ **已修复** | ① `E-01` 内容面新增 **R-16** + 并入 `U-11` 判据（零落点闭合）；② `checklist B-07` 状态格重写（撤下被否定的两个理由）；③ `D-05` 行注明「记录运行 FAIL（旧谓词）/ 终版 N-A」；④ `README` R 编号统一为 **R-01~R-16**；⑤ 向量计数订正为 19/11 |
| **N-08**（P3 `degradedBranchReachable` 硬编码常量） | ✅ **已修复** | 拆为 `degradedBranchReachable_analytic`（常量 + 来源说明）与 `degradedBranchReachable_measured`（实测：某次运行是否观测到缺席信号）；本轮 `analytic=false`（归口 R-03）/ `measured=false`（无缺席信号） |
| **F-03 / F-12 / F-14**（R2 复核的残留） | ✅ **随本批收口** | F-03：随 N-01/N-03 重设计（伪 PASS 与假阳性 FAIL 同时消失）；F-12：`DEFECTS` 全文跨运行引用逐项标注（§2 表 + §4）；F-14：记录运行修订 = 终版（同 sha256）⇒ **差异集为空**，旧差异表整体作废（见 §5.3） |

---

## 5. 探针改动记录（本任务测试资产，允许修改）

### 5.1 崩溃根因（R1 期已修，保持不变）

**症状**：`%TEMP%\clean004-final4\report.json` → `crash="TypeError: Cannot read properties of undefined (reading 'length')"`（调用点 `C6` 的 `panels.wfButtons.length`），30 条断言后中断。
**最小修复**：① 面板快照在「分栏不在场」分支返回**同形键集**安全默认；② `C5` 后新增 `cFaceRest` 存活闸门（N-A + `break`）；③ `finally` 保证崩溃也落 `report.json`。

### 5.4 本轮（R2 返工）改动清单

| # | Finding | 改动 |
|---|---|---|
| 1 | **N-01** | `B21a`/`B21b` **前提重设计**：关键词改取「实际会出现在 `displayTitle ?? id` 的串」——宿主已认可 id 的 UI 展示串（`session-<uuid>`）为主、镜像 `displayTitle` 为备、完整 id 兜底（`keywordPlan`）；判定改为「前提在场 ⇒ MUST 渲染 ≥1 行且行标题可核」 |
| 2 | **N-02** | 新增 `PREDICATE_REGISTRY`（9 谓词，`red*`/`ok*` 向量随条目登记）+ `evalPred(id, 测量值)` 部署唯一入口；`falsifiabilityReport(deployments, staticSites)` 全量求值 + 逐条函数源指纹 + 静态/运行期消费点分开登记；`FALSIFIABILITY-PROOF` 断言随之收紧（`allPass ∧ 9-9 staticBound ∧ 运行期指纹一致`） |
| 3 | **N-02** | `falsifiability-check.mjs` 重写：① 提取 `PREDICATE_REGISTRY` + `falsifiabilityReport`；② **绑定检查**（登记谓词 MUST 有 `evalPred('<id>'` 消费点，缺失即 `CHECK-FAILED`）；③ 全量向量求值 + `DECLARED-VECTORS ≡ EVALUATED` 断言；④ 输出 `BINDING-OK` / `VECTOR-TALLY` / `CHECK-OK` |
| 4 | **N-03** | `DEFECTS §3` 改写为「D-3 已撤回」+ 四项反驳逐条写入；`§0/§4/§5` 联动；探针注释不再主张「镜像未反映宿主会话」 |
| 5 | **N-04** | `README §5.3` 两表重写（记录运行修订 = 终版 ⇒ 差异集为空；R1 两轮差异按 `E1` 谓词/label 如实归因）；`E1` 谓词由 `h <= 32` 像素阈值改为**测量项**（横向 + 纵向溢出，纵向逐后代取最大值） |
| 6 | **N-05** | `DEFECTS §2` 加跨运行对照表（逐项时间戳与运行来源）+ 收敛时限表述；`§4` 的 `D4` 行标注来源；D-2 范围收窄（撤下「搜索面恒空」症状） |
| 7 | **N-06** | `prepareSplitForNotice()` 开头新增遗留遮罩收敛并落证 `facts.prepOverlayClean`（等 8 s → 点遮罩 → 校验 `finalModal`） |
| 8 | **N-07** | `checklist`：新增 `R-16`（`E-01` 数据面板内容面）+ 并入 `U-11` 判据；`B-07`/`D-05` 状态格订正；`README` R 编号统一 R-01~R-16 |
| 9 | **N-08** | `D5` 的 `degradedBranchReachable` 拆为 `_analytic`（常量 + 来源）与 `_measured`（实测） |
| 10 | **R2 §4.3** | `C-face-availability` 的 N-A 门控与谓词改为**互斥**（异常态绝不被 N-A 吞掉）；与 `evalPred` 同源 |
| 11 | **R2 §4.3** | `D3-mutual-exclusion`、`B5`、`B12b`、`C11`、`D5`、`E1` 六个已修谓词**全部改走** `evalPred`（部署面不再保留表达式副本） |
| 12 | **任务规范 F-03/F-12/F-14** | 随 N-01/N-03/N-05 收口：伪 PASS 与假阳性 FAIL 同时消失；跨运行引用逐项标注；记录运行修订 = 终版 |

### 5.3 探针修订对照（sha256）· R2 口径：**记录运行修订 = 终版（差异集为空）**

| 修订 | sha256 | 说明 |
|---|---|---|
| R1 期记录运行 | `4750dd16…` | 崩溃修复（§5.1）+ 证据增强；**未留存**（R1 F-14 已登记） |
| R1 期终版 | `3dd831fe…` | 差异 = `bootTail` 的 token 脱敏 |
| R1 返工过程运行（`report-rework-discovery.json`） | *未留存* | 第 1 稿；与 R1 返工记录运行**非同源**（`E1` 谓词/label 不同，见下表） |
| R1 返工记录运行（`report-rework-run.json`） | *未留存* | 第 2 稿；**已被 R2 否证**（`B21a` 伪 PASS） |
| **R2 返工记录运行（`report.json`）** | **`de2de511…`** | **= `probe-clean-004.mjs`（运行后未再编辑）** |
| **R2 返工终版（入仓）** | **`de2de511…`** | 与记录运行**同一文件** ⇒ **R2 N-04 的「修订不可重建」缺口本轮不存在**（副本 `probe-clean-004.final-rev-b1f1c8c0.mjs` 同 sha256） |

**R1 返工两轮之间的差异（保留对照；R2 N-04 订正后的如实归因）**

| # | 位置 | 过程运行（discovery） | R1 返工记录运行 | 影响 |
|---|---|---|---|---|
| 1 | `E1-short-notice-compact` 的 **label** 与**谓词语义** | label 含「…紧凑 chip（…**不靠 tooltip 兜底**）」；判定含 `h <= 32` | label 改为「紧凑单行承载…」 | **是**：两轮 `E1` **label 不同、非同源**；过程运行 `E1`=**FAIL**（旧 chip 口径）、记录运行 `E1`=**PASS**。旧 label 串在当前源 **0 命中** ⇒ 两轮 `E1` **不得**作为重复性证据 |
| 2 | `D6-session-switch-close` 前置分类 | 旧分支（不校验 `hostRowsBefore`） | 同旧分支（运行后提交收紧） | 两轮 `D6` 记录状态**均 = FAIL**（旧分支）；终版谓词下 ⇒ N-A |

**R2 返工轮内（探针调试）的修订与「运行计数超标」的如实登记**：本轮共 4 次完整运行（`clean004-r2` / `clean004-r3` / `clean004-final` ×2），
前 3 次用于① 镜像体读数不可得的发现、② 渲染面口径修正、③ 自证断言过严（`C-face-availability` 分支未触发 ⇒ 运行期 0 消费点）的修正；
第 4 次为**修正后重取的权威记录**（`report.json`）。超时间盒 1 次，**如实登记**（详见 §10-⑩），未做更多重跑。

---

## 6. 隔离证明（containment + realEnvVerdict）

| 检查 | 实测（记录运行） |
|---|---|
| 路径包含性校验（prefix + `sep` 且 ≠ 根） | `containment = {home:true,userprofile:true,appdata:true,localappdata:true,edge:true,tmp:true,novels:true}`（全真；任一为假 ⇒ exit 2 不运行） |
| 环境变量重定向 | `DSH_HOME`/`USERPROFILE`/`HOME`/`APPDATA`/`LOCALAPPDATA`/`TEMP` 全部指向 `…\clean004-probe-WcBMlz\*`（报告 `isolation.env` 逐项可查；**R3-04 订正**：原写 `v6c9fI` 系笔误，该串为 R2 前一轮运行的隔离根） |
| 子进程启动前泄漏断言 | `bootChild` 在 `DSH_HOME ∉ 隔离根` 或 `DSH_HOME ≡ 真实 ~/.dsh` 时直接 `exit 2` |
| 真实路径泄漏检测器 | `realEnvVerdict.leakSignature.pointsIntoIsolation = false` |
| 真实 `$DSH_HOME` 零写入 | `realEnvVerdict.ok = **true**`；`strictDeltas = {}`（`settings.yaml` / `profiles\web\package.json` / `.agent-presets\novel-writing\*` sha256 逐项一致）；`inventoryDeltaCount = 0` |
| 宿主平面接入方式 | **只读 junction**（`mklink /J`），无写入 |
| 破坏性红线 | 全程未对 `C:\Users\peter\.dsh` 或任何用户配置目录执行删除/清空/重建/移动；构造场景全部落在临时目录；用户实例与浏览器未被关停/接管 |

---

## 7. 清理状态

| 项 | 结果 |
|---|---|
| 探针自身清理 | `report.json.cleanup.rootRemoved = **true**`（隔离根 `…\clean004-probe-WcBMlz` 及各子目录已删除；`keptEvidence` 仅保留 `--out` 证据目录） |
| 运行期临时证据目录 | `%TEMP%\clean004-final`、`%TEMP%\clean004-r2`、`%TEMP%\clean004-r3`、`%TEMP%\clean004-homology-inject*` 与各 `clean004-*-stdout.log` **已删除**（入仓复制完成后，见下方命令）；`%TEMP%\clean004-*` 计数 **0** |
| 探针子进程 | 运行结束后 `boot`/headless Edge 全部退出（`stopAll()` + `SIGKILL` 兜底）；运行后未见 `clean004` 关联孤儿进程 |
| 非本任务残留 | `%TEMP%\ux060-*` **21 个目录未触碰**（属另一任务；R2 报告记 20，实测 21——非 QA 面，仅如实记录） |
| 清理命令（本轮实测） | `Remove-Item -Recurse -Force $env:TEMP\clean004-final, $env:TEMP\clean004-r2, $env:TEMP\clean004-r3, $env:TEMP\clean004-*.log`；复核 `Get-ChildItem $env:TEMP -Filter 'clean004-*'` ⇒ **空**（含文件，非仅目录） |
| 注 | 清理**先于**写报告（探针 `finally` 内 `cleanup` 早于 `writeFileSync`）；本轮 `cleanup.rootRemoved=true` 为实测读数 |

---

## 8. 回归基线（只跑不改）

| 命令 | 实测输出 | 退出码 | 判定 |
|---|---|---|---|
| `node test/smoke.mjs` | `SMOKE DONE: 291 passed, 0 failed`（末行含 `COMPAT-014 A-F9 README smoke 断言计数同步：声明 291 ≡ 实测 291`） | 0 | ✅ 291 / 0 |
| `node test/validate-preset.mjs` | `PRESET VALIDATION PASSED（schema-face: PASS）`（`skills indexed: 29/29`） | 0 | ✅ PASSED |
| `node --check docs\evidence\CLEAN-004\probe-clean-004.mjs` | 无输出 | 0 | ✅ 语法通过 |
| `node docs\evidence\CLEAN-004\falsifiability-check.mjs` | 9/9 谓词 PASS，`ALL-PASS=true`（输出已入仓 `falsifiability-check-stdout.log`） | 0 | ✅ 反例全红 |

`lib/**`、`agent-presets/**`、`test/**`、`scripts/**`、`package.json`、`README.md`、`CHANGELOG.md`、`.governance/**` **均未修改**；
本任务写面 = `docs/evidence/CLEAN-004/**` + `docs/verification/CLEAN-004-checklist.md`。

---

## 9. 部署谓词与自证**同源**的机证（R2 N-02）

### 9.1 实现方式（三层）

| 层 | 事实 |
|---|---|
| ① 单一来源 | `PREDICATE_REGISTRY`（探针源内**标记块**，见文件头注释）：每条谓词的**全部判定语义**只写在此块的纯函数 `fn` 内；同块登记 `red*`/`ok*` 向量 |
| ② 部署唯一入口 | 部署断言**只能**经 `evalPred('<id>', 测量值)` 判定——函数体内 `PREDICATE_REGISTRY.find(...).fn(measurement)` ⇒ 取到的是**注册的同一函数实例**（非副本、非重写表达式） |
| ③ 自证方消费同一实例 | `falsifiabilityReport()`（探针内）与 `falsifiability-check.mjs`（独立脚本，从源提取该块后 `import`）对**同一实例**求值全部 `red*`（MUST false）/ `ok*`（MUST true），并落证 `fnSha256` |

### 9.2 本轮机证结果（记录运行 + 独立脚本）

- 登记谓词 **9 条**，部署 `evalPred` 调用点 **9 处**（每条恰好 1 处）：
  `B5-found-sessions-area` / `D3-mutual-exclusion` / `C-face-availability` / `B21a-…` / `B21b-…` / `B12b-tile-min-height` / `D5-sessions-present` / `E1-short-notice-compact` / `C11-flip-back`；
  `report.predicateStaticSites` 逐条 = 1（**源码级绑定**）；
- 向量求值：**red 19 / ok 11**，逐条 `redsAllFalse=true ∧ oksAllTrue=true`；
  `DECLARED-VECTORS ≡ EVALUATED`（声明 19/11 ≡ 求值 19/11）⇒ **无静默丢弃**（R2 指出的 `red3` 漏读已消除，`red4` 同样被纳入）；
- 运行期指纹一致性：被走到的 8 条谓词 `fnSha256 ≡ deployment.fnSha256`（`C-face-availability` 本轮闸门未进入 ⇒ 运行期 0 消费，静态绑定 = 1，如实分列）。
- 独立脚本输出（`falsifiability-check-stdout.log`，exit 0）：`BINDING-OK=true` / `ALL-PASS=true` / `CHECK-OK`。
### 9.3 **注入式核对**（证明「改部署谓词 ⇒ 必红」）

| 注入 | 做法 | 结果 |
|---|---|---|
| **A（R2 的攻击向量）** | 把部署面 `const b5Predicate = evalPred('B5-found-sessions-area', {…})` 改为常量 `true`（**只动部署面**，登记块逐字节不变） | `UNBOUND B5-found-sessions-area callSites=0` ⇒ **`BINDING-OK=false` / `CHECK-FAILED` / exit 1**（旧版此注入下 `ALL-PASS=true` 不变 ⇒ R2 指控成立、现已收口） |
| **B（改登记谓词）** | 把 `PREDICATE_REGISTRY` 中 B5 的 `fn` 改为恒真 | 该条 `red red: true` ⇒ `ALL-PASS=false` / `CHECK-FAILED` / exit 1（且 `fnSha256` 随之变化，可核对来源） |

> 注入均在 `%TEMP%\clean004-homology-inject*` 的**副本**上进行，运行后已删除（见 §7）。**结论**：部署面与自证面现在是**同一函数实例 + 源码级绑定计数**双重约束——
> 「改部署谓词」要么被 `UNBOUND` 抓（注入 A），要么必须改登记块而被反例向量抓（注入 B）。

---

## 10. 本任务已知局限（必须随证据一起读）

1. **分栏/E/F 面的可构造性受 D-2 牵制**：`C9`/`C10` 仍因「卡片不收敛 ⇒ 重开落入失效重绑分支」记 **FAIL**（D-2 下游）；
   E/F/D3 面走未绑定卡路径已全部取得观测并 PASS，但「孤星纪元」重开路径在收敛前仍不可用。
2. **镜像体（`sessionsAll` 快照对象）读数不可得（R2 N-03 的补证要求 × 未完全满足）**：部署侧尝试两种采集面（主文档 + 同源 iframe 的**全部节点自有属性**）均未命中——
   本轮实测 `facts.mirrorBodyUnreachable = {reachable:false, reason:'no-mirror-node-found', realms:1, scanned:724}`（单 realm ⇒ 应用在主文档内，非 iframe 隔离；
   724 个节点的自有属性中**无** `{ids, byId}` 形态对象）⇒ 「镜像 `ids` 是否为空」**仍未直接读数**，改以**渲染面**（检索命中行）作为功能判据。
   **残余不确定性**：谓词「检索 0 行 ⇒ FAIL」在本轮未触发（实测命中），故「镜像空但检索有行」这类**不可能组合**无法被本机观测排除；该读数的缺失在本轮**不影响结论方向**（宿主三面认可 + 检索命中 ⇒ 镜像必非空，逻辑上互斥）。
3. **`D6` 的未定性**：本机宿主侧栏 `button[class*="sessionRow"]` 计数 0（`facts.hostSessionRowsAtB21 = {count:0, withText:0, selectorPresent:false, projectRows:1}`），
   仅有「新建会话」入口 ⇒「切换会话」动作不可构造 ⇒ 记 **N-A**（归入 checklist §9 R-04 + U-13）。
   **归因订正（CLEAN-006 **F6**，依据 `docs/review/BUG-009-R1.md` F6 的独立三重取证）**：该 N-A 的**依据不是**「宿主未渲染会话行」，而是**探针选择器失配**——
   `readHostSessionRows` 用 `button[class*="sessionRow"]`，而宿主该类名的**唯一**使用点是 **`div` + `role:"treeitem"`**（`@deepseek-ai/dsh-client-ui-workspace/lib/client.js:966-969`）
   ⇒ 该选择器在本宿主构建下**恒不命中**（不对称对照：同 run 内无限定标签的 `[class*="projectRow"]` 命中 1，宿主 `projectRow` 同为 `div`）。
   **正确选择器形态** = `div[role="treeitem"][class*="sessionRow"], [class*="sessionRow"]`（或按 `role="treeitem"` + 文本提取）；
   且宿主 `sessionVisible` 的**全合取**（`!session.blank || session.id === current` ∧ `session.origin !== "subagent"` ∧ `!archived.has(session.id)`，宿主 `L338-340`；**R2 N-8 与 `CHANGELOG` 对齐**）⇒ **自动链建出的 blank 会话在非 current 时不渲染**，修完选择器仍可能 0 行 ⇒ 须显式构造**非 blank 或 current** 的会话行。
   原「不足以区分『宿主未渲染』与『选择器/形态差异』」的表述**已被上述取证取代**（后者即实况）。
   **界定（本 run 读数不受影响）**：`C3b`/`C9`/`C10`/`C11` 读的是**插件卡面文本/DOM**（`.nv-*`），与宿主会话行选择器无关；`B5`/`D6` 仍为「前置未取得」的如实记录，只是归因改为选择器失配。
4. **`report-run1.json` / `report-rework-run.json` 的退出码为推定值 1**（依据：探针尾部 `process.exitCode = report.ok ? 0 : 1`，且两份报告 `ok=false`）。
5. **`C5` 的落定依赖跨运行对照**：`final4` 的 `splitClosed:true` 属竞态窗口，本轮多次运行均未复现（`splitFate` 13/13 帧在场）⇒ 结论建立在「多次干净运行 + 一次崩溃对照 + 机制代码」之上，未做注入式复现。
6. **真实用户实例未验证**：隔离实例不能代表用户真实工作区/真实会话/真实 API Key 的面；D-1/D-2 的真实实例表现与 U-1~U-14 全部条目仍需用户在**重启 DSH 后**目检（用户实例运行前后 `.dsh-bundle-version=0.5.2`，本任务按红线未触碰）。
7. **`B5` 本轮记 N-A**：**且归因已订正（CLEAN-006 **F6**）**——依据**不是**「宿主真实会话行 = 0」，而是**探针选择器 `button[class*="sessionRow"]` 在本宿主构建下恒不命中**（宿主该类名唯一使用点为 `div` + `role="treeitem"`）；`B5` 的**可失败性**由 §9 的反例向量机证，不依赖本轮是否触达。**界定**：该 N-A 不影响本 run 的 `C3b`/`C9`/`C10`/`C11`（读插件卡面 `.nv-*`）。
   `C-face-availability` 同理（闸门未进入 ⇒ 运行期 0 消费，静态绑定 = 1 已机证）。**豁免台账登记（R3-09）**：该断言在报告 `assertions[]` **无行**（闸门未进入即不产生行）；本轮**不改探针**（保「记录运行修订 = 终版」不变量），故以本局限条 + 建议任务登记，**不在报告中伪列 N-A 行**。
8. **`E1` 的行内像素读数 `h` 已降为非判定项**（R2 N-04 的连带订正）：判定改为「在场 ∧ form=row ∧ 单行 ∧ title 置空 ∧ 无横向/纵向溢出」；纵向溢出逐后代取 `max(scrollHeight)/max(clientHeight)`。
9. **命中行标题的观感口径（新观察项 O-1）**：检索命中的会话行标题显示为 `displayTitleOf` 的结果（本轮为 cwd 目录名 `novels`），**与会话 id 不同形**——
   对「用 id 片段检索」的用户，行标题不便于核对。该项**按观感面登记**（`DEFECTS §6` O-1），**不并入任何缺陷**，交由 Coordinator 决定是否另立任务。
10. **完整运行计数 = 4 次（超时间盒 1 次，如实登记）**：`clean004-r2`（首次带镜像体读数尝试）→ `clean004-r3`（iframe/titleOk 修正）→ `clean004-final`（谓词重设计后）→ `clean004-final`（**自证断言过严修正后**的权威记录运行）。
    第 3 次运行暴露探针**自身**缺陷：`FALSIFIABILITY-PROOF` 要求「每条谓词运行期被消费」，而 `C-face-availability` 的闸门未进入 ⇒ 运行期 0 消费 ⇒ 该自证断言误判 FAIL（**非产品问题**）。
    修正方式：把「源码级静态绑定」（`staticCallSiteCounts()`，逐条 = 1）与「运行期消费」**分列**，断言改为「9/9 静态绑定 ∧ 运行期被走到的谓词指纹一致」⇒ 第 4 次运行取得干净记录。
    探针修复轮次 = 3（≤3 上限内），完整运行超 1 次；**未做第 5 次重跑**（不无限迭代）。
11. **本文件与 `DEFECTS.md` / `checklist` 的一致性**：R3 复审裁定为 **BLOCKED**（2 条 P2 阻断均在「文档自述 ⇄ 所引原件」面：`R3-01` DEFECTS §2 证据链误用上一轮取值、`R3-02` 截图取证窗口与图注不实），**已按用户裁定选项 A 定点返工修正**（R3-01 改由 `gen-defects-evidence.mjs` 机生成；R3-02 见本文件 §3 订正与上文「截图取证窗口」条）；其余 P3（R3-04 隔离根笔误 / R3-05 下界锚点 / R3-06 自指哈希矛盾 / R3-07 跨运行标注 / R3-09 闸门行）一并订正。**R4 复审只核上述各点**。
12. **同源机证的强度上限（R3-03，P2 非阻断，本轮不改探针）**：`staticCallSiteCounts()` 是**源文本计数代理**——R3 的注入④（保留一个**不可达**的 `evalPred` 调用 + 在部署面**就地复制**等价表达式）下 `BINDING-OK=true / CHECK-OK / exit 0`，即「判定不再消费登记表而检查仍绿」在本机**可构造**。当前 9/9 站点经**人工实读**确认同源成立，但**机证强度 < 其声称**。三条硬化选项（**建议任务**，拟并入 CLEAN-006）：① `evalPred` 返回带标记对象且 `assertion()` 只接受该对象（运行期同源）；② AST 断言 `evalPred` 调用**不在不可达分支**；③ 闸门依赖谓词改**显式豁免台账 + 机读对账**。

---

## 11. 复核指引（命令 + 期望输出）

```powershell
# ① 断言与计数（R2 权威记录运行）
$r = Get-Content docs\evidence\CLEAN-004\report.json -Raw | ConvertFrom-Json
$r.tally | ConvertTo-Json -Compress            # => {"total":49,"pass":42,"fail":4,"na":3}
$r.ok; $r.crash; $r.cleanup.rootRemoved        # => False / （空）/ True
$r.realEnvVerdict.ok                           # => True（真实 $DSH_HOME 零写入）
$r.facts.sessionAckIds | ConvertTo-Json        # 宿主三面认可的会话 id（B21a/B21b 前提）
$r.facts.b21Measurement | ConvertTo-Json       # => keyword/eKeyword/rows/titleOk（N-01 重设计后的判定输入）
$r.facts.mirrorBodyUnreachable                 # => {reachable:false,…}（镜像体读数不可得的如实登记）
$r.facts.prepOverlayClean                      # => [{initialModal:true, closedBy:'backdrop-click', finalModal:false}]（N-06）

# ② 谓词同源与可失败性机证（9 谓词 / 19 red + 11 ok）
($r.assertions | Where-Object id -eq 'FALSIFIABILITY-PROOF').status   # => PASS
$r.predicateStaticSites | ConvertTo-Json       # => 9 条全部 = 1（源码级绑定）
$r.falsifiability.rows | ForEach-Object { "$($_.id) static=$($_.deployment.staticCallSites) redsAllFalse=$($_.redsAllFalse) pass=$($_.pass)" }
node docs\evidence\CLEAN-004\falsifiability-check.mjs   # => BINDING-OK=true / ALL-PASS=true / CHECK-OK（exit 0）

# ③ 各改判项
($r.assertions | Where-Object id -eq 'B5-found-sessions-area').status  # => N-A（空真已消除）
($r.assertions | Where-Object id -eq 'D3-mutual-exclusion').detail     # => barOpenBefore:true（前置已补）
($r.assertions | Where-Object id -eq 'B21a-search-find-sessions').status # => PASS（N-01 重设计后实测命中；D-3 已撤回）
($r.assertions | Where-Object id -eq 'B22-session-row-opens').status     # => PASS
($r.assertions | Where-Object id -eq 'E2-long-notice-flow').status      # => PASS
($r.assertions | Where-Object id -eq 'D5-sessions-present').detail      # => degradedBranchReachable_analytic/_measured 分列（N-08）
($r.screenshots)                                                        # => 入仓相对路径
$r.screenshotsTmpSource                                                 # => %TEMP% 来源附注

# ④ 复现（隔离实例；随机端口 + 独立 DSH_HOME + 独立浏览器 profile）
node docs\evidence\CLEAN-004\probe-clean-004.mjs --out $env:TEMP\clean004-verify
# 退出码：0 = 全 PASS；1 = 有断言非 PASS（本 HEAD 期望 1）；2 = 环境/隔离校验失败
```

> **复核注意**：本 HEAD 的期望值是 **`tally = 49 / 42 / 4 / 3`、`exit 1`**（4 条 FAIL = D-1 ×1 + D-2 及其下游 ×3；D-3 已撤回、不再计入）。
> 若复跑得到 `PASS` 更多或 `FAIL` 更少，**先核对 HEAD 与 `lib/client.js` 是否已被改动**（本任务的断言针对 `21b100c`）。
