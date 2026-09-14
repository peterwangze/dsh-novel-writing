# CLEAN-004 测试审查报告 — R1

**ROUND**：**R1**（首轮，无前轮引用）· **REVIEW_TYPE**：**test-review**（测试策略 / 用例质量 / 覆盖率 / 证据充分性 / 可复现性）
**审查者角色**：Test Reviewer Agent（只读；唯一写入 = 本文件）
**审查对象**：CLEAN-004 QA 交付（`docs/verification/CLEAN-004-checklist.md`、`docs/evidence/CLEAN-004/**`）
**仓库 / HEAD**：`D:\AI\agent\deepseek\harness\writing-workflow` / `21b100ce9ac32e534c6215e507f9835f87e0ff4c`（`git status --porcelain -- lib/client.js lib/index.js` = 空，实读确认）
**日期**：2026-09-14 · **机录**：本轮的 REVIEW 持久化（`review-record`）由 Coordinator 执行——审查边界禁止本 Agent 写 `.governance/**`。

---

## 0. 结论

**VERDICT: NEEDS_CHANGE**（BLOCKING 6 条，均为 P2；无 P0 / 无 P1）

| 维度 | 结论 | 一句话依据 |
|---|---|---|
| 1. 测试策略 | **部分满足** | 三态口径（PASS/FAIL/N-A）在探针内**强制**、隔离与清理顺序正确、真实环境只读；但缺「回归失败 vs 环境不可构造」的独立信号（F-06），且清单自引用的「未覆盖风险」小节不存在（F-05） |
| 2. 用例质量 | **不满足** | 48 条断言中 34 PASS：31 条谓词具体可失败；**2 条空真**（B5 / D3，QA 仅自曝 C11）+ 2 条弱断言（D5 / B12b）+ 1 条断言 ID 重复（B21×2） |
| 3. 覆盖率 | **不满足** | 主路径（A/B/C/D）覆盖较好；但**缺口未列明**：9 个清单自标「待目检」的面在用户侧清单 §8 无落点，空书目/窄窗口/sessions 缺席/无会话根/「绑定新会话」动作面无任何断言或用户项 |
| 4. 证据充分性 | **基本满足（1 项不符）** | sha256 全对、双运行逐条一致、D-1/D-2/C5 证据链可逐环复核、脱敏彻底；但 **3 条结论的归因依据与同记录字段自相矛盾/不成立**（F-03） |
| 5. 可复现性 | **部分满足** | 命令+退出码+stdout 原件+HEAD+浏览器/Node/端口齐备、两次完整运行逐条一致；但记录运行所用探针修订未留存（F-14） |

**一句话总结**：QA 三条 FAIL 的三态裁定（D-1 产品缺陷 P3 / D-2 产品缺陷 P2 / C5 时序 artifact）经独立复核**成立**，隔离与清理证据链**成立**，回归基线**独立复跑一致**；但**空真 PASS 普查不完整**（实际 3 条，非 1 条）、**部分 N-A 理由与其自身证据矛盾**、**覆盖缺口未列明**——即「覆盖假象」这一首要质量风险未被穷尽，故本轮判 **NEEDS_CHANGE**（返工后须 R2 复审）。

---

## 1. 独立核验方法（全部只读）

| 手段 | 命令 / 读取面 | 结果 |
|---|---|---|
| 哈希与体量 | `Get-FileHash` × 11 文件 + `(Get-Item).Length` | **逐项与 README §3 完全一致**（11/11） |
| 计数 | `report.json` / `report-run1.json` / `report-final4-crash.json` 的 `tally` 实读 | 48/34/6/8、48/34/6/8、30/27/3/0 —— **与清单 §9 一致** |
| 逐条比对 | 48 条 `assertions` 的 `id`+`status` 双运行对照 | **0 差异**（README §1「逐条一致」成立） |
| 断言语义 | 探针全文实读（1285 行，按 `assertion()` 调用点逐条核对谓词） | 见 §3 普查表 |
| 源码链 | `lib/client.js` 实读 L795-804 / L1428-1434 / L2870-2882 / L3232-3249 + `Select-String Escape` | D-1、D-2、C5 三条链接**逐行成立** |
| 脱敏 | `Select-String -Pattern 'token=[A-Za-z0-9_-]{6,}'` + 密钥类模式扫描 | 真 token 命中 **0**；6 处 `token=` 后接空 ⇒ 已就地脱敏；无 `sk-*`/`Bearer`/API Key 明文 |
| 回归基线 | `node test/smoke.mjs` / `node test/validate-preset.mjs` | **291 passed / 0 failed（exit 0）**；**PRESET VALIDATION PASSED（exit 0，skills 29/29）** —— 与 QA 声明一致 |
| 写面边界 | 全仓 `LastWriteTime ≥ 2026-09-14` 清单 | QA 写面 = `docs/evidence/CLEAN-004/**` + `docs/verification/CLEAN-004-checklist.md`；`lib/ test/ scripts/ agent-presets/ package.json README.md CHANGELOG.md` 最新 mtime 均为 09-13 ⇒ **未越界** |
| 用户环境 | 只读 `C:\Users\peter\.dsh\.agent-presets\novel-writing\.dsh-bundle-version` | `0.5.2`（mtime 09-12 19:51）⇒ README §2「未重启未修改」**成立** |
| 语法 | `node --check probe-clean-004.mjs` | exit 0 |

**未执行**：完整复跑探针（时间盒代价高；改用「产物字段实读 + 源码级核验 + 双运行对照」），残余不确定性已在 §5-⑤/§7 明示。

---

## 2. 高风险主张逐条结论（任务指定 10 项）

| # | 主张 | 独立结论 | 依据 |
|---|---|---|---|
| 1 | 空真/弱断言普查 | **不成立（普查不完整）** | 除 C11 外**另发现 2 条空真 PASS**：`B5-found-sessions-area`（谓词含 `\|\| foundTitle===null` 恒真分支）、`D3-mutual-exclusion`（记录值 `barOpenBefore:false` ⇒ 后件必然成立）。详见 §3 |
| 2 | 8 条 N-A 合法性 | **部分不成立** | E1~E4/F1 的 N-A 本身诚实，但「本实例无法构造」过强（存在未尝试的可构造路径）；B21×2 的 N-A 理由与同记录字段**互相矛盾**。详见 §4 |
| 3 | D-2 三态裁定可信度 | **成立**（证据链 a~e 逐环可复核；1 环为间接推断，已如实定位） | (a) `facts.overviewProbe.bindings['zz-first-probe']=session-3c7518c9…` 且 `status:200` ✓；(b) `facts.isolatedDisk.boundIdOnDisk=true` + `sessionStore` 列出该 id ✓；(c) `hostWorkspaceJson.tables.workspaces[5b14b27d…].sessionIds` **首项即该会话** ✓（run1 独立自洽：`session-52f36262…` 同样在首位）；(d) 13/13 采样 `dotSt=stale` ✓，且**崩溃对照运行另证状态跃迁**（final4 首帧 `未绑定`→次帧起 `会话失效`，只能由「绑定已写入 ∧ 镜像查不到」产生）；(e) 代码链实读成立：`L2874-2877`/`L2981`/`L4240`（三处 `s.byId[id] ?? null`）→ `L1428-1429`（`undefined ⇒ 'stale'`）→ `L2880`（副文案落 `stale`）。**间接环**：探针从未读取镜像本体（`sessions.list` 载荷），「镜像缺该 id」系由渲染态反推 ⇒ 「链路断在镜像」成立，但**镜像为何缺该 id 仍未定位**（QA 已如实声明，归 Developer）。 |
| 4 | C5 时序 artifact 判定 | **成立（版本前提已核实）** | 三次运行 `head` 全为 `21b100c…`（实读三份报告）⇒ **同代码版本**，判定前提成立；机制链实读成立：`L3814-3833`（`current` 变化 → `closeWorkbench`）+ `L800-804`（`shouldCloseOnCurrentChange`：新非空 ≠ 上一非空）+ 一次性豁免令牌（`L3827-3828`）；final4 为**单点快照**且旧修订无 `splitFate` 时间线（实读 final4 `facts` 键面确认）⇒ 「无稳定等待 + 不同果」⇒ 时序 artifact 判定合理。残余：**未做注入式复现**，「竞态窗口」仍是机制推断（README §9-4 已自曝）。 |
| 5 | 探针工程质量 | **基本达标，3 项待改** | 隔离**真重定向**（`isolation.env` 六项指针均落隔离根 + `containment` 7 项全真 + `bootChild` 前置断言 L64-65 + `childEnv` 越界守卫 L353-357）；`realEnvVerdict` 是**实测**（`realFingerprint` 前后各读一次真实 `settings.yaml`/`profile package.json`/preset 目录 sha256 + 根目录项面，L172-215），非「未检查即声明」（本 run `strictDeltas={}` ∧ `inventoryDeltas={}` 皆空）；清理**确在 finally 且在写报告之前**（L1240-1275，注释与代码一致）；同形安全默认**未引入新的伪 PASS**（分栏在场但局部节点缺失时 C5/C6 仍会 FAIL）——但闸门把「分栏消失」整体转 N-A（F-06）。**待改**：看门狗注释与行为相反（F-09）、与同族探针逐函数重复且 1285 行单文件（F-10）。 |
| 6 | 回归基线 | **成立** | 独立复跑 `smoke` = 291/0（exit 0，末行 `COMPAT-014 A-F9 README smoke 断言计数同步：声明 291 ≡ 实测 291`）、`validate-preset` = PASSED（exit 0，29/29）。退出码语义与 stdout 一致：`L1279 process.exitCode = report.ok ? 0 : 1`，`report.ok` = 全 PASS ⇒ N-A 亦计非 PASS；stdout 末行「红态（**14** 条非 PASS）」= 6 FAIL + 8 N-A ✓。README §9-③「推定值 1」**诚实且充分**（声明口径不同 + 给出推定依据，且依据经实读核实）。 |
| 7 | 覆盖缺口 | **不成立（缺口未列明）** | 见 §5 |
| 8 | 安全与数据面 | **成立** | 探针无任何指向真实 `~/.dsh` 的写入路径：写面 = 隔离根（`dirs.*`）+ `--out` 证据目录（L332/L336-339/L406 后各写入均落 `dirs.*`）；对真实环境仅 `readFileSync`/`statSync`（`realFingerprint`）+ `resolvePlane()` 只读探测；`C:\Users\peter\.dsh` 的 bundle-version 实读仍为 0.5.2 未变。脱敏彻底（见 §1）。`.governance/**` 无 QA 写入（mtime 12:21:15–12:21:58，晚于 QA 交付 12:20:40，属 Coordinator 侧 change-triage/BUG-009 入账）。 |
| 9 | 证据链完整性 | **成立（1 处引用混用）** | 11 份文件 sha256 全对；双运行同 tally 且逐条 status/id **0 差异**；`DEFECTS.md` 的 P0=0/P1=0 与该文 P0~P3 口径自洽（D-2 有绕行 ⇒ P2、D-1 有鼠标绕行 ⇒ P3）。混用：`DEFECTS.md:76` 的「该文件由宿主在 04:06 更新」实为 **run1** 的时间戳（run1 `updatedAt=04:06:02.503Z`），而同句 `sessionIds` 取自记录运行（`updatedAt=04:11:48.369Z`）⇒ 引用混用（**实质主张 c 反因双运行各自自洽而更强**）。 |
| 10 | 时间盒与流程纪律 | **成立** | 「探针修复 1 次」= §7.1 的一轮最小修复（3 处），另 §7.3 记录 1 次输出卫生订正（脱敏）⇒ 计 1 次修复成立；「完整运行 2 次（上限 2）」= 记录运行 + 独立复跑（两隔离根 `lx8VHc` / `akIW2i` 实读互异）✅ 未超。写面边界无越界（§1 表）；`.governance` 侧改动晚于 QA 交接且可归因 Coordinator。 |

---

## 3. 空真 / 弱断言 PASS 普查表（34 条 PASS 逐条过筛）

> 判据：**谓词是否具备「在真实缺陷下变红」的能力** ∧ **前置是否在判定时刻真实成立**。`report.json` 记录运行 detail 为实读值。

### 3.1 不可采信（空真，3 条）

| ID | 谓词（源码位置） | 记录值 | 为何空真 | QA 是否自曝 |
|---|---|---|---|---|
| `C11-flip-back` | `sideBack !== null && sideBack.chatSide === 'right'`（probe L972） | `{chatSide:'right',…}` | 分栏未重开 ⇒ `clickByLabel('换边')` 无可点目标 ⇒ **⇄ 从未被点击**，`chatSide` 取自初始存档；`facts.flip.sideBefore.chatSide='right'` ⇒ 前后同值，条件平凡成立 | ✅ 已自曝（清单 L78 + DEFECTS §4） |
| `B5-found-sessions-area` | `(A && B) \|\| (C && D) \|\| foundTitle === null`（probe **L599-602**） | `{kw:'新会话', foundTitle:null, rows:[], cards:0, hostSidebar:'sessions-present'}` | **第三析取 `\|\| foundTitle === null` 使「未渲染找到的会话区」这一分支恒为真**——label 声称的判据「宿主侧栏有无会话 ∧ 本区存在性一致」被自身谓词豁免：`sessions-present`（宿主非空态）∧ 命中会话标题关键词 ∧ `rows=[]` —— 正是 label 规定「应渲染却未渲染」的形态，却仍记 **PASS**。该谓词只在「渲染了区但行数 0」时才可能红，与受测性质无关 | ❌ **未自曝** |
| `D3-mutual-exclusion` | `exclusivity.consoleOpen === true && exclusivity.barOpenAfter === false`（probe **L1122-1123**） | `{barOpenBefore:false, consoleOpen:true, barOpenAfter:false}` | 受测前提是「先开分栏 → 开控制台 → 分栏应被关」。记录值 **`barOpenBefore:false`**（分栏彼时已因 C8 关闭且 C9 重开失败）⇒ 后件在开控制台之前就已成立，**断言无失败能力**。同一记录把 `barOpenBefore` 写入 detail，说明判空数据在场但未被用作前置 | ❌ **未自曝**（清单 L62 记 PASS） |

> 传播影响：清单 §9「PASS 34」与 `report.json.tally.pass=34` **均含 B5、D3 两条不可采信项**（C11 已被 QA 单列，未从计数中剔除）⇒ 有效 PASS = **31**，非 34。这正属任务定义的「**空真 = 覆盖假象**」风险，且 B5 落在与 D-2 同族的「会话镜像」面上（谓词弱化使该面的真缺陷形态无法变红）。

### 3.2 弱断言 / 潜在空真（2 条，本次未触发）

| ID | 问题 | 记录值 | 评级 |
|---|---|---|---|
| `D5-sessions-present` | label 为「会话服务可用（非降级）…」，谓词仅 `gridState.counts.cdot >= 1`（probe L1145-1146）——**从未读取产品自身的 `degraded` 判定**（`client.js:L3148`），以「双圆渲染」代理「服务可用」 | `{cdot:8}` | P3：与清单 D-03 的期望文字一致 ⇒ 可接受，但 label 语义强于谓词 |
| `B12b-tile-min-height` | `Math.min(...gridState.cardHeights) >= 180`（L665-667）：**空数组时 `Math.min()===Infinity` 恒真** | `cardHeights` 8 项、最小 211.4 ⇒ 未触发 | P3：潜在空真，需 `cardHeights.length > 0` 前置 |

### 3.3 其余 29 条（判定：具体、可失败、前置成立）

| ID | 谓词要点（实读） | 判定 |
|---|---|---|
| `A1-drawer-cards` | 卡数 `===10` ∧ `headLabel === i18n.entryLabel` ∧ `caret===1` | 具体 ✓ |
| `A2-stale-binding-visible` | `subs.some(含「会话失效」)` ∧ `titles` 含「失效绑定书」 | 具体 ✓ |
| `A3-console-opens` | `consoleOpened===true` ∧ `.nv-console !== null` | 具体 ✓ |
| `B1-console-geometry-root` | 四边偏差 `≤1.5px`（实测 0/0/0/0） | 具体 ✓ |
| `B2-console-head` | 标题/工作区路径/切换钮 mini=`关闭` 四项 | 具体 ✓ |
| `B3-console-grid-present` | `gridReady` ∧ `search===1` | 具体 ✓ |
| `B4-search-filter-novels` | 卡数 1 ∧ id=`zz-first-probe` ∧ 磁贴 1 ∧ 折叠 0 ∧ 清除钮 1 | 具体 ✓ |
| `B6-search-no-match` | 卡 0 ∧ 空态 1 ∧ 文案含「没有匹配」 | 具体 ✓ |
| `B7-search-clear` | 值空 ∧ 恢复 8 卡 | 具体 ✓ |
| `B8-grid-fold` | 8 卡 ∧ 「展开全部（2）」∧ 磁贴非空 | 具体 ✓ |
| `B9-grid-3col` | 同行 3 卡 ∧ 三轨等宽 `≤0.1px` | 具体 ✓ |
| `B10-card-anatomy` | 8 项计数精确值（mono/badge/chips/cdot/ico/del/data/meta）+ 3 类 chip 文案 | 具体 ✓ |
| `B11-no-legacy-actions` | 负断言 `legacyOpen===0 ∧ legacyLaunch===0` | 具体 ✓ |
| `B12-icon-btn-22` | 全部图标钮取整 22×22 | 具体 ✓ |
| `B13-stale-card-dot` | `data-bound === 'stale'` | 具体 ✓ |
| `B14-sort-two-state` | 两态 `data-on` 互斥 ∧ `draggable===8` | 具体 ✓ |
| `B15-create-modal` | 居中 `≤2px` ∧ 单输入 ∧ autoFocus ∧ 两钮 | 具体 ✓ |
| `B16-create-empty-name` | 错误文案 + 弹窗不关 | 具体 ✓ |
| `B17-esc-layer-yield` | `modal:false ∧ console:true`（D-1 的同轮对照，前置成立） | 具体 ✓ |
| `D1-stale-rebind-panel` | 三面文案齐备 ∧ 控制台仍在 | 具体 ✓ |
| `C1-open-from-card` | `splitOpened` ∧ `.nv-split` 非空 ∧ 控制台关 | 具体 ✓ |
| `C2-split-title` | 标题含「小说创作工作台」+「孤星纪元」 | 具体 ✓ |
| `C3-squeeze` | `ml`/`width` 均非空 ∧ 分栏右缘 ≡ viewArea 左缘 `≤2px` | 具体 ✓ |
| `C4-bar-ctls` | 4 控件 ∧ 含「换边」「关闭」 | 具体 ✓ |
| `C5-split-panels` | 6 个几何非空 ∧ `wfrows≥17` ∧ `wfCur===1` ∧ `ftrows≥1` ∧ `tabs===3` | 具体 ✓（前置由 C1/C2/C3 证成） |
| `C6-wfctl-bar` | `wfButtons.length≥3` ∧ 含 `mode=go/stop` ∧ 两类按钮 | 具体 ✓ |
| `C7-divider-drag-persist` | 拖后 > 拖前 +20px ∧ 存档 `leftW` 与实测 `≤2px` | 具体 ✓ |
| `C8-close-x` | 关闭前分栏在场 ∧ 关闭后两者皆无 ∧ 挤法还原（附 N-A 守卫） | 具体 ✓ |
| `Z1-real-env-untouched` | `verdict.ok===true`，其中 ok 由**前后实读指纹**计算（strict 三项 sha256 全等 ∧ 无隔离根污染签名） | 实测 ✓ |

---

## 4. N-A 合法性表（8 条，按 `report.json` 顺序）

| # | 断言 | 记录理由 | 独立判定 | 依据 |
|---|---|---|---|---|
| 1-4 | `E1-short-notice-compact` / `E2-long-notice-flow` / `E3-long-notice-geometry` / `E4-notice-close` | 前置条件不成立：分栏未打开 | **应补前置**（当前 N-A 不构成伪 PASS，但「本实例无法构造」过强） | 探针在 C8 关闭后**只用 `孤星纪元` 一张卡**做重开（L933-940、L984-990）——该卡此时已有绑定记录且镜像不收敛 ⇒ 点击必入「失效重绑」分支。而 **C1 已证明**「未绑定卡 → 自动链 → 分栏打开」路径可用，fixture 尚有 9 张未绑定卡（`aa-second-probe` 等）从未被尝试 ⇒ 前置存在可构造路径。「分栏未打开」是**探针未取路径**的结果，非环境封闭。 |
| 5 | `F1-split-claim-event` | 同上 | **应补前置** | 同 1-4；`dsh:split-claim` 派发点在分栏打开路径（`client.js:L1045-1056`），用另一张未绑定卡即可触发。 |
| 6 | `B21-search-find-sessions`（第 1 条） | 「插件链建的会话未进入宿主会话列表/侧栏」+ note「宿主侧栏『暂无会话』」 | **应改判定依据（理由与自身证据矛盾）** | 同一 detail 内 `hostSidebar.noSessions = **false**`，且 `facts.convergence.samples[*].hostNoSessions = false`（13/13，两轮运行皆然）⇒ 记录明确表示「暂无会话」空态**未出现**；`C9` 的 `hostSidebarSlice` 亦含工作区下的会话条目文本。真正被观测到的是：**用宿主会话自有标题「新会话」检索，`foundTitle=null`、`rows=[]`**（`facts.sessionSearchPreliminary`）——即镜像/「找到的会话」未反映宿主会话，**与 D-2 同族的候选缺陷形态**，却被记作「环境无法构造」。（heuristic `body.innerText.indexOf('暂无会话')<0 ⇒ 'sessions-present'`（L596）本身也不是确定性口径 ⇒ 结论双向不成立，需改用 `sessions.current`/侧栏行数等确定性判据。） |
| 7 | `B22-session-row-opens` | 同 6 | **应改判定依据（同 6）** | 同上；`rows=[]` 使点击分支未执行，但 N-A 的**理由**同样与 `noSessions:false` 矛盾。 |
| 8 | `B21-search-find-sessions`（第 2 条，§16 复测） | 「插件链建的会话未进入宿主会话镜像/侧栏」 | **应改判定依据（理由被证据直接否定）** | 该条 detail = **`{consoleOpen:false}`**：§16 先点抽屉标题行（L1207-1211），而 A-03 语义为**反选切换**；§15 结束时控制台仍开（`facts.sessionSwitch.after.consoleOpen=true`）⇒ **是探针自己的点击把控制台关掉**，导致「控制台未打开」早退到 N-A。label 所述理由（会话未进入镜像）与本条证据无关。 |

**总结**：8 条 N-A 中 **0 条被伪造成 PASS/FAIL**（诚实性成立），但 **0 条属于「前置在当前环境无法构造」的严格意义**——5 条为**未取路径**（应补前置），3 条（B21×2/B22）为**理由与其自身证据矛盾**（应重定依据）。**「C 面存活闸门把 C5~C11 整体 N-A」的宽窄**：作为「无观测可判 ⇒ 不伪造 PASS/FAIL」是正确方向；但闸门把「C1 之后分栏消失」这一**异常事件**整体吸收为 N-A，使「分栏打开后自发关闭」这一潜在回归**没有任何变红通道**（`splitFate` 只作为 detail 附带）⇒ **偏宽，应补 1 条独立信号**（见 F-06）。

---

## 5. 覆盖缺口清单

### 5.1 清单自标「待目检/用户目检」但在 §8 用户侧清单**无落点**（9 面）

| 清单行 | 面 | §8 是否有对应 U 项 |
|---|---|---|
| `A-05` L36 | 图标栏模式（侧栏折叠）下抽屉退化为单 📖 入口 | ❌ 无 |
| `B-02` L43 | 控制台几何**降级分支**（无会话根 → 侧栏右缘/280px） | ❌ 无 |
| `D-04` L93 | `sessions` 服务整体缺席（双圆隐藏/禁用/提示） | ❌ 无 |
| `D-05` L94 | 分栏/控制台打开期间切换宿主会话 → 自动关闭 | ❌ 无（与 D-6 同族，且是 BUG-004/UX-014⑧ 契约面） |
| `D-06` L95 | 挤法失败（无会话根）保持现状 + 提示 | ❌ 无 |
| `E-02` L103 | 发布面板（平台配置/发布记录/状态点） | ❌ 无 |
| `E-03` L104 | 请求面板（清单 + 提交表单） | ❌ 无 |
| `F-01` L111 | 设置页「小说写作」区 | ❌ 无 |
| `F-02` L112 | 设置页「诊断」区 | ❌ 无 |

> 清单 §0 自定口径：N-A/目检项「**转入用户侧清单或未覆盖风险**」（L22）；④（L151）与 `C-17`（L84）两处**引用「未覆盖风险」小节**——但清单**九个章节中没有该小节**（标题实读：§0~§9，无「未覆盖风险」）⇒ 悬空引用 + 9 面无验证路径。

### 5.2 无任何断言、也无用户项的行为面（含任务指定边界）

| 面 | 现状 | 边界类型 |
|---|---|---|
| 「绑定新会话」按钮的**动作行为** | `C-06` 只断言按钮**存在**（文案/mode/disabled）；无点击→绑定→面板收敛断言，无 U 项 | **BUG-007 三处失败面之一未被行为覆盖**（另两处：继续工作流→U-9 ✓、persona 挂载→U-9 ✓） |
| 空书目（0 本） | fixture 恒 10 本；`client.js:L3456-3478` 的 hero/空态/网格三分支中，空态分支**零断言** | 边界：空书目 |
| 多书 >8 的分页/折叠二次展开 | 仅断言折叠行文案存在，未点「展开全部」验证 10 卡与落位 | 边界：多书（部分） |
| 窄窗口 / 视口变化 | 视口恒 `1400×900`；无窄栏、无 resize 后几何/挤法复算 | 边界：窄窗口 |
| 无会话根 | `B-02` 转目检且无 U 项（见 5.1） | 边界：无会话根 |
| `sessions` 服务缺席 | `D-04` 转目检且无 U 项；`D5` 只用双圆渲染代理「非降级」 | 边界：服务缺席 |
| 脏稿守卫的**取消分支** | `C-12` 转目检 → `U-7` 覆盖「取消则分栏仍在」✓（**唯一**有落点的目检项之一） | 已覆盖 |
| `C-17` dsh-worktable 双向互斥 | N-A + `U-10` ✓ | 已覆盖 |

### 5.3 用户侧清单 U-1~U-10 可判定性

| 项 | 可判定性 | 备注 |
|---|---|---|
| U-1/U-2/U-3/U-5/U-6/U-7/U-8/U-10 | ✅ 有明确「看什么/量什么」 | U-2 含会话行渲染与点击后控制台消失；U-5 含 `localStorage['dsh.novel.split.v1'].leftW` 与实测比对 |
| U-4 | ✅ **覆盖 BUG-009 症状** | 明写「卡片状态由『未绑定』转为已绑定（**不应长期停在『会话失效』**）」+ 判据「侧栏抽屉该卡副文案不含『会话失效』」⇒ D-2 的用户可见症状**已覆盖** |
| U-9 | ✅ 覆盖 UX-060 长/短双形态 + persona 报错面 | 判据「长错误不被截断、不压在标题栏/横幅上；短提示保持单行 chip」 |
| U-3 | ⚠️ 含一条**与现状不符的期望** | 「成功即关窗 + 顶部提示 + **新卡聚焦**」——「新卡聚焦」在 UX-012 后是否仍成立无判据来源（清单其余行均给 `client.js:Lxxxx` 判据来源，此条未给）；建议标注或补来源 |

> 结论：U-1~U-10 **基本可判定且 U-4 已覆盖 BUG-009 症状**；缺口在 5.1/5.2（9 面 + 4 类边界 + 1 个动作面），且清单**未把缺口列明**（`CLEAN-004-checklist.md` 无「覆盖缺口/未覆盖风险」章节）。

---

## 6. 发现列表

> 级别口径（本轮）：**P0** 阻塞/致命 · **P1** 关键（主功能缺陷且无绕行）· **P2** 重要（影响证据可信度/覆盖完整性，有替代路径）· **P3** 一般（文档/可维护性/卫生）。

| # | 文件:行号 | 级别 | 依据（事实） | 影响 | 修复建议 |
|---|---|---|---|---|---|
| **F-01** | `docs/evidence/CLEAN-004/probe-clean-004.mjs:599-602`（记录值 `report.json` `assertions[B5-found-sessions-area]`） | **P2**（BLOCKING） | 谓词第三析取 `\|\| foundState.foundTitle === null` 使「未渲染」分支恒真；记录值 `sessions-present ∧ rows=[]` 恰为 label 定义的反例，仍记 PASS（清单 `§9` 与 `tally.pass` 均计入 34） | 「找到的会话」面的真缺陷形态**无法变红**；PASS 计数含不可采信项 ⇒ 覆盖假象 | 删去恒真析取；前置改为确定性口径（如 `sessions.current` / 侧栏会话行数）；未取得前置时记 N-A 而非 PASS |
| **F-02** | `probe-clean-004.mjs:1122-1123`（`report.json` `assertions[D3-mutual-exclusion]`，`facts.exclusivity`） | **P2**（BLOCKING） | 记录值 `barOpenBefore:false` ⇒ 后件先于动作成立；断言在判定时刻**无失败能力**；且与 E1~E4/F1 对同一前置缺失的处理（N-A）**口径不一致** | 互斥面（UX-010④/DEC-015）在本轮实际**零覆盖**，却计入 PASS 34 | 加前置：`barOpenBefore===true` 才判 PASS，否则 N-A（与 E 面一致）；并解释同一前置为何两处口径不同 |
| **F-03** | `probe-clean-004.mjs:1175-1181`、`L1226-1233`（`report.json` `assertions[B21]×2`、`[B22]`） | **P2**（BLOCKING） | 三条 N-A 的理由均称「宿主侧栏『暂无会话』/会话未进入镜像」，而同记录字段 `hostSidebar.noSessions=false`、`convergence.samples[*].hostNoSessions=false`（13/13）**反向**；第 2 条 B21 的 detail 为 `{consoleOpen:false}`，系探针自己的反选点击所致 | N-A 归因失真；「镜像不反映宿主会话」这一候选缺陷被记成环境限制 ⇒ 与 D-2 同族风险被掩盖 | ①改用确定性判据（读 `sessions.current` / 侧栏 DOM 行数）；②第 2 条 B21 修复探针状态机（§16 前显式确认控制台态，勿依赖反选）；③统一 N-A 文案与证据字段，禁止出现与自身字段矛盾的措辞 |
| **F-04** | `probe-clean-004.mjs:933-940`、`L976-1002`、`L1188-1204`；`README.md:180`（§9-1） | **P2**（BLOCKING） | E1~E4/F1 记 N-A 的理由为「分栏未打开 ⇒ 本实例无法构造」，但探针**只用 `孤星纪元` 一张卡**重开；C1 已证「未绑定卡 → 自动链 → 分栏打开」可用，fixture 尚有 9 张未绑定卡未尝试 | UX-060 告警面（v0.5.3 的同类回归面）在本轮**零自动化覆盖**；「无法构造」的表述会阻止后续尝试 | 恢复阶段改用**另一张未绑定卡**（C1 已验证路径）；E/F 面未取得前置时，N-A 文案改为「本次未取得（路径未尝试）」 |
| **F-05** | `docs/verification/CLEAN-004-checklist.md:22,84,151`（引用不存在的「未覆盖风险」）、`§8 L177-188`（U-1~U-10）、`§1-§6` 各「待目检」行 | **P2**（BLOCKING） | 清单 §0 自定「N-A/目检项转入用户侧清单**或未覆盖风险**」，但全文无该小节（标题实读仅 §0~§9）；9 个自标「待目检」面在 U-1~U-10 无落点；「绑定新会话」动作面/空书目/窄窗口/sessions 缺席/无会话根无任何断言或用户项 | 交付物**无法关闭其自己声明的验证面**；用户按 §8 执行后仍有 9 面未被验证且无记录 | 新增「未覆盖风险」一节：逐面写明「面 / 为何未覆盖 / 归口任务或用户项 / 残余风险」；或补 U 项（可突破 ≤10 上限并说明） |
| **F-06** | `probe-clean-004.mjs:868-885`（闸门）、`L864-867`（C5 N-A 覆盖） | **P2**（BLOCKING） | `panels.splitClosed===true` ⇒ C5 + C6~C11 全记 N-A 并 `break`；`splitFate` 仅作 detail 附带。C1 已 PASS（分栏曾打开）⇒ 「打开后消失」是**异常事件**，但该异常**无任何断言变红**（首次 C5 的 FAIL 恰由该闸门在修复后转为 N-A） | 结构性掩盖：若产品回归为「分栏打开后立即/随机关闭」，该轮将呈现「N-A ×7 的干净运行」而非回归信号 | 闸门内**追加一条独立断言**（如 `C-face-availability`：C1 曾 PASS 而 C5 时分栏不在场 ⇒ **FAIL**，附 `splitFate`）；N-A 保留给「从未打开过」的情形 |
| F-07 | `docs/verification/CLEAN-004-checklist.md:136,137,151` | P3 | §7 与 §3/§9 订正后的状态矛盾：L136「C-07/**C-09** PASS」（C-09 实为 FAIL）、L137「**C-10**/C-11 PASS」（C-10 实为 FAIL）、L151「**C-16 PASS**（声明面）」（C-16 实为 N-A） | 原始条目追溯表（①~⑤）与状态表口径不一，读者可能误判已覆盖 | 同步 §7 的三处状态引用（README §9-7 已列订正表，§7 漏改） |
| F-08 | `probe-clean-004.mjs:1178,1231`（`report.json` 两条 `B21-search-find-sessions`） | P3 | 同一 `id` 在 48 条中出现两次（3 条 call site 中 2 条执行） | 机读消费歧义（含 `README.md:212` 的复核命令 `Where-Object id -eq …` 对 B21 返回 2 条） | 分支/复测用不同 id（如 `B21a`/`B21b`），或在报告中显式声明同名允许多条 |
| F-09 | `probe-clean-004.mjs:390`（注释）vs `L391-396`（实现）；`README.md:197`（§9-8） | P3 | 注释称看门狗「也能收敛并走 finally 清理」，实现只 `console.error` + 记 `Z0` 断言，**无法中断挂起的 `await`** | 注释与行为相反，易误导后续维护者（README 已如实披露） | 注释改为与实现一致（或按 §9-8 登记项实现强制收敛） |
| F-10 | `docs/evidence/CLEAN-004/probe-clean-004.mjs`（1285 行）vs `scripts/probe-nv-bar-geometry.mjs`（590 行） | P3 | `class Cdp` / `bootChild` / `resolvePlane` / `realFingerprint` / `containment` **逐函数各存一份**（grep 计数 1:1）；同族 UX-060 R1 F-6 已登记同类问题（CLEAN-006 承接） | 隔离装配双份维护，漂移风险（本次两处已知坑已在新副本修正，但两份将各自演化） | 抽共享模块（隔离装配/驱动/CDP），两探针共用；或明确把本项并入 CLEAN-006 F-6 范围 |
| F-11 | `probe-clean-004.mjs:1145-1146`（D5）、`L665-667`（B12b） | P3 | D5 以 `cdot>=1` 代理「服务可用」而从不读 `degraded`（`client.js:L3148`）；B12b 的 `Math.min(...cardHeights)` 在空数组下为 `Infinity` 恒真 | 弱断言/潜在空真（本轮未触发） | D5 补读降级标志；B12b 前置 `cardHeights.length>0` |
| F-12 | `docs/evidence/CLEAN-004/DEFECTS.md:76` | P3 | 「该文件由宿主在 04:06 更新」取自 **run1**（`updatedAt=04:06:02.503Z`），同句 `sessionIds` 取自记录运行（`updatedAt=04:11:48.369Z`） | 引用混用（实质主张 c 因两轮各自自洽而更强，非错误结论） | 标注数据来源运行；或直接给两轮各自的 `sessionIds` |
| F-13 | `report.json#screenshots`（3 条为 `%TEMP%\clean004-rec\*.png`） | P3 | 报告登记的是**已被清理**的临时绝对路径；入仓副本路径（`docs/evidence/CLEAN-004/*.png`）未登记 | 证据追溯需人工映射（PNG 本体与 sha256 已在 README §3 对齐，影响有限） | 报告内同时登记入仓相对路径 |
| F-14 | `README.md:162-163`（§7.3） | P3 | 记录运行修订 `4750dd16…` 未留存，仓内仅当前修订 `3dd831fe…`；「唯一差异 = token 脱敏」无 diff 可机证 | 复现命令跑的是**当前修订**，与产出报告所用修订不同（断言/tally 一致性由 `report.json` 自身内容支持：`bootTail` 已为 `token=***`，与 §3「已逐处替换」+ §7.3 的时间线自洽） | 保留运行所用修订副本或给出可核对的差异说明 |
| F-15 | `docs/verification/CLEAN-004-checklist.md:181`（U-3） | P3 | 「新卡聚焦」无判据来源（清单其余行均附 `client.js:Lxxxx`），且 UX-012 后该行为未见出处 | 用户目检项可能误报 | 补判据来源或从期望中删除 |

**核对**：QA 自身上报的缺陷（D-1 P3 / D-2 P2 / C5 时序 artifact）**未被本报告推翻**；F-01~F-15 均为**追加**发现，无 P0/P1。

---

## 7. 硬门槛裁决

| 门槛 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0**（QA：D-2=P2、D-1=P3；本轮追加 F-01~F-15 最高 P2，无 P0/P1） | ✅ **PASS** |
| 每条测试结论有证据 | = 100% | 48/48 附证据载荷；但 **5 条结论的归因依据不成立或与自身证据矛盾**（`B5`、`D3` 的 PASS，`B21`×2、`B22` 的 N-A 理由）⇒ 43/48 = **89.6%** | ❌ **FAIL** |
| 每条发现标注 P0~P3 | = 100% | QA 侧：D-1/D-2/C5 与 §4 补充披露逐条带级别 ✅；本轮：F-01~F-15 逐条带级别 ✅ | ✅ **PASS** |
| 覆盖缺口已列明 | 已完成（不得笼统写「覆盖较全面」） | 清单**无**覆盖缺口/未覆盖风险章节；9 个自标「待目检」面无落点；「未覆盖风险」为悬空引用 | ❌ **FAIL** |
| 空真/弱断言普查 | 已完成（逐条 PASS 过筛） | QA 自曝 1 条（C11）；实读谓词后**另有 2 条空真**（B5、D3）+ 2 条弱/潜在空真（D5、B12b） | ❌ **FAIL** |

**裁决**：**NEEDS_CHANGE** —— 3 项硬门槛未通过（`unresolved_blockers = 6`：F-01~F-06）。返工后须由**同一 Test Reviewer** 发起 R2 复审（round=2，逐条比对本轮 findings 的「已修复/未修复/新引入」）。

---

## 8. 已独立复核并确认成立的事项（供 R2 免重复核验）

1. **计数与哈希**：11 份文件 sha256/大小与 README §3 逐项一致；三份报告 tally 与清单 §9 一致；`report.json` 与 `report-run1.json` 的 48 条 `id`+`status` **0 差异**（独立复跑隔离根 `akIW2i` ≠ 记录运行 `lx8VHc`，非同一目录复用）。
2. **D-1（Esc 静默失效，P3）**：`grep Escape lib/client.js` 全文仅 `L3237`/`L3772`；`L3236-3239` 在 `s.bind !== null` 时 `return`（让位）而 `BindDialog` 无 Escape 监听 ⇒ 让位后无人接手。结论成立。
3. **D-2（绑定不收敛，P2）**：证据链 a~d 逐环实读成立（见 §2-#3）；代码链 `L2874-2877`/`L2981`/`L4240` → `L1428-1429` → `L2880` 逐行实读成立；崩溃对照运行独立佐证状态跃迁（`未绑定` → `会话失效`）。
4. **C5 时序 artifact**：三次运行同 `head`（版本前提成立）；机制链 `L3814-3833` + `L800-804` 实读成立；两次干净运行 `splitFate` 13/13 帧分栏在场且 `consoleEl=false`（排除控制台互斥）。
5. **隔离与清理**：六项环境变量全部重定向 + `containment` 7/7 + 启动前越界守卫（L64-65、L353-357）；`realEnvVerdict` 为前后**实测**指纹（非声明）；清理在 `finally` 内且**先于** `writeFileSync`（L1262-1275）；两轮运行 `cleanup.rootRemoved=true`、`realEnvVerdict.ok=true`、`strictDeltas={}`、`inventoryDeltas={}`。
6. **脱敏**：真实 token 命中 0，无凭据/密钥明文；`.governance/**` 无 QA 写入；`lib/test/scripts/agent-presets/package.json/README/CHANGELOG` 最新 mtime 均 09-13（未改）。
7. **回归基线**：`node test/smoke.mjs` = **291 passed / 0 failed（exit 0）**；`node test/validate-preset.mjs` = **PRESET VALIDATION PASSED（exit 0，skills 29/29）**。
8. **退出码语义**：`process.exitCode = ok ? 0 : 1`（`ok` = 全 PASS，N-A 计入非 PASS）与 stdout「红态（14 条非 PASS）」一致；README §9-③ 的「推定值 1」声明诚实且依据可核。
9. **用户实例未被触碰**：真实 `~/.dsh/.agent-presets/novel-writing/.dsh-bundle-version` = `0.5.2`（mtime 09-12 19:51），只读复核未见变更。

---

## 9. 残留不确定性（R2 应一并处理）

1. **未复跑探针**：本轮以「产物实读 + 源码级核验 + 双运行对照」替代整轮复跑（时间盒）。因此 **F-01/F-02 的「空真」结论**基于谓词语义与记录值的静态分析（判据充分：谓词结构与 `barOpenBefore:false` 实读值），但**未通过注入式实验反证**。
2. **D-2 的镜像内部原因未定位**：探针未读取镜像本体（`sessions.list` 载荷），「链路断在镜像」由渲染态反推（QA 已如实声明归 Developer）。
3. **B21/B22 的替代解释未排除**：`hostNoSessions` 取自 `innerText` heuristic，其 `false` 只证明「暂无会话」文案未出现，不足以严格证明宿主侧栏存在可点击会话行（`facts.sessionSwitch.cand=1` 恰说明文本「新会话」的按钮**只有一个**）⇒ F-03 的结论是「N-A 理由不成立/需重定依据」，**不是**「已证实产品缺陷」。
4. **C5 的竞态窗口未注入复现**：判定建立在两轮干净运行 + 崩溃对照 + 机制代码三者合力（README §9-4 已披露）。
5. **探针修订差异未机证**（F-14）。

---

**审查者**：Test Reviewer Agent（只读；未修改任何产品代码/测试/探针/清单/治理文件）
**本报告路径**：`docs/review/CLEAN-004-TEST-R1.md`
**结论**：**NEEDS_CHANGE**（BLOCKING 6：F-01~F-06，全部 P2；`unresolved_blockers = 6`）
