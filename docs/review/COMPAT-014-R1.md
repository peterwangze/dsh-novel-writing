# REVIEW-COMPAT-014-R1 — 全量收口批次后置代码审查（三组 20 项）

- **任务**：COMPAT-014（全量收口批次：REVIEW-COMPAT-007-R1 F1~F9 + REVIEW-COMPAT-005-R2 N1~N5 + REVIEW-COMPAT-013-R1 F-1~F-6）
- **审查对象**：commit `b857451`（9 路径 +606/−91，未 push）
- **round**：**R1（本任务首轮）**——COMPAT-014 无前轮审查报告，故本报告不做「已修复/未修复/新引入」比对；前轮引用 = 三组来源报告（`docs/review/COMPAT-007-R1.md` / `COMPAT-005-R2.md` / `COMPAT-013-R1.md`）的逐项要求
- **审查人**：Code Reviewer（只读；未修改任何被审文件）

---

## 0. 审查方法与证据边界（如实披露，P-01）

**做了**：只读实读 9 路径全部相关段落 + 契约/fixtures/package.json/README/RESEARCH/DESIGN 交叉实读；逐行推演 probe-face 315 行与 ci.yml 内联判据；静态复算 smoke 的 golden/范围/计数逻辑；逐项对照三组 20 项要求的落点。

**未做（如实登记）**：
1. **未运行任何命令**（含 `node probe-face.mjs` / `npm` / smoke / validator）——按任务硬约束，且角色定义禁止 Bash。故所有「运行时计数 / 退出码 / CI 复跑」结论**均为 Coordinator 独立复跑结果的转述引用**，本报告不将其作为本人的一手证据。
2. 未取得宿主真实环境证据（无网络、无宿主闭包）——涉及宿主真实行为的判断一律沿用既有披露口径，不新增推断。
3. 未逐行读 `lib/client.js` 全 4927 行（只读 B-N1 相关段 + 为验证行号引用而实读的锚点段）；未逐行读 `test/smoke.mjs` 全 2975 行（读新改段 + 全部相关断言上下文）。

**承接的一手实读证据（本报告所有行号结论均据此，非转述）**：`ci.yml` 全文 368 行、`probe-face.mjs` 全文 315 行、`ci-mock-face.mjs` 全文、`smoke.mjs` L1780-2240 / L2600-2975、`host-contract.mjs` L69-73 / L94-153 / L210-295、`client.js` L90-95 / L976-985 / L1026-1040 / L2340-2479 / L4370-4381 / L4411-4422 / L4800-4811 / L4915-4927、`host-boundary.js` L195-274、`package.json` 全文、`README.md` L158-197、`CHANGELOG.md` L1-61、`docs/RESEARCH.md` L70-83、`docs/DESIGN.md` L80-93。

---

## 1. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0** | ✅ |
| 5 维度全覆盖 | = 100% | §4 正确性/安全性/可维护性/性能/测试覆盖 逐项有结论 | ✅ |
| 每条发现标注级别 | = 100% | §6 全部带 P0~P3（P0=0 / P1=0 / P2=2 / P3=9） | ✅ |
| 设计一致性检查 | 已完成 | §2.2 门禁矩阵 ≡ ci.yml 实状 ≡ README/CHANGELOG 口径；probe-face 判据 ≡ 契约 `hostSurface` 单一事实源；`extractHeredocs` 共用单一口径；**无偏离**（两处「宣称超出实现」见 F1/F2） | ✅ |
| AI 代码专项 5 项 | 全部完成 | §5（mock/硬编码/幻觉/TODO/过度实现 5/5 有结论） | ✅ |
| **三组 20 项逐项落地核验表** | 完整（缺项须列出） | §3：**20/20 已落地，无缺项**；4 项附精度/强度瑕疵（F1/F2/F3/F6 关联） | ✅ |
| 结论终态（三选一 + unresolved_blockers） | 必填 | §8：**APPROVED_WITH_NOTES（unresolved_blockers = 0）** | ✅ |

---

## 2. 重点核验项结论（任务指定的 6 项）

### 2.1 probe-face.mjs 315 行逐段审读 —— 逻辑成立；3 处强度边界 + 2 处健壮性瑕疵

**提取器（L35-46 复用 `extractHeredocs` + L55-59 `probeScriptSource`）**：正则泛化为「引号/未引号 target + 任意 `'[A-Z_]+'` 定界符」，闭定界符按同符号回配（ci-mock-face.mjs L35-46）。**去缩进语义经逐行推演正确**：`m[1]` 捕获 `cat >` 行的缩进（ci.yml 实测 10 空格），body 逐行剥离同量缩进 ⇒ 提取物 ≡ shell 写入 `$RUNNER_TEMP/nv-host-latest-probe.mjs` 的字节内容（YAML 块标量同样剥离同一 10 空格），即「验证产物 ≡ 交付产物」成立；body 行缩进更深时保留额外缩进（正确）。定界符改用非 `'EOF'` 形态或改双引号 `<<\"…\"` 时**不匹配 ⇒ `die(2)` 且报文点名约定**（fail-closed，方向正确）。

**结构工具（L61-107 `jobsStart`/`jobSection`/`jobGates`/`jobPermissions`）**：`jobsStart` 从 `jobs:` 之后起扫（规避 `on:` 子键与 job 键同为 2 空格缩进的歧义，L61-65 注释已说明）；job 键正则 `^  [A-Za-z0-9_-]+:\s*$` 对本文件安全（job 内键均 4 空格、steps 项 6 空格）；`jobPermissions` 只接受 `keys: values` 形态（`write-all` 标量 ⇒ 键集 `[]` ≠ `['contents: read']` ⇒ 红，fail-closed 正确）。

**构造驱动（L226-299）**：`greenLists` 由**仓内 fixtures 实测派生**（非手写），构造 probe JSON 落在 `mkdtempSync` 隔离目录，`--check` 与 7 例子进程输出经**临时文件 fd** 收集（非管道；L119-129）——与受限沙箱约束一致，属正确取舍。7 例的**判别力经静态复算成立**：
- `drift`（dsh-settings 上游 `0.1.5-rc.3` ⇒ 同车更高）⇒ 命中判据④ ⇒ exit 1 + `类别 version-drift`（**删除④即绿 ⇒ 该例对④有判别力**）；
- `cov-missing`（上游列表删 `0.1.1-rc.2` 而 fixtures 覆盖仍在）⇒ 命中判据② ⇒ exit 1 + `类别 coverage`（**恢复 A-F3 的 CLI 豁免于非 CLI 无效：该例非 CLI**）；
- `cli-past`（CLI 上游 `0.1.0-rc.1`/`0.1.4-rc.1`，覆盖 = hostVersion 集）⇒ **exit 0** + 「CLI 覆盖面 = hostVersion 代理（子句②不适用）」——**正是 A-F3 的回归守卫**（若回退为「CLI 也套子句②」则必红）；同时是 README L190「低于最新覆盖车的中间车不判红」的机检实例；
- `empty`（`dsh-settings.versions.json` 置空）⇒ **exit 2** + `探测输入异常` + `dsh-settings：探测输入不可解析` + `退出码 2`（**A-F7 的判别力由此例承担；若无 input 分支，该例本会 exit 0 假绿**）；
- `contract-extra` / `fixtures-4th` ⇒ 契约侧多一个版本键 / 目录多第 4 份快照 ⇒ 判据 ①b `版本维双向对账` ⇒ exit 1（**双向双向**：两侧各一例）。

**真空断言评估**：① 例的 `probe.body.trim().length > 0` 本身近乎恒真，但被 ④ 的 `mustInclude`（`✅ 无新宿主版本` / `detected new host version …` / `类别 …` / `CLI 覆盖面 = hostVersion 代理…` / `版本维双向对账`）反锚定——换一个无关脚本进 heredoc 会因报文不含这些串而红 ⇒ **不构成真空面**。绿例是**构造性同源**（probe JSON 由被比对物 fixtures 派生），故绿例只能验「脚本可跑/结构/退出码」，这正是其定位（工具头 L18-21 的清单与实际 7 例**逐项对应、无过度宣称**）。

**自身是否被 CI 触发**：probe-face 由 `sanity` L61-62 执行（push / PR / dispatch；`schedule` 下 sanity 反向 `if` 跳过 ⇒ **每日面不含它**，与「离线、与宿主发版无关」定位自洽）。工具自身**零网络、零 install、零宿主代码执行**；子进程只执行 ci.yml 提取出的判据脚本（读 tmp/仓内文件）。⚠️ **但「执行 ci.yml 内联脚本」本身是一个新增的仓库代码执行点**（与既有 smoke / ci-mock-face 同性质，非新信任边界；工具头 L18-21 已披露「驱动判据真跑」）——已登记为备注，非发现。

**强度边界/瑕疵**：① ② 记录宣称「`on` 含四类事件」但只检 `schedule`（**F1，P2**）；② 判据 ①/③/⑤ 在构造面零负例（**F4，P3**）；③ `spawnSync` 无 `timeout`（**F7，P3**）；④ `die()` 归类/清理口径不一致（**F8，P3**）；⑤ 白名单自指面（**F6，P3**）。

### 2.2 A-F1 门禁收敛的完整性（push / PR / dispatch 语义）—— 语义正确，dispatch 全量为**有意为之**（评估：合理）

逐事件推演（表达式为企业已审形态，未知形态 ⇒ 红）：
- `if: github.event_name != 'schedule'`（sanity L18 / host-logic L87）⇒ push / pull_request / workflow_dispatch 均**执行**，schedule **跳过**；
- `if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'`（host-latest-probe L146）⇒ schedule / dispatch 执行，push / PR **跳过**；
- 三 job 均 `permissions: contents: read`（L20-21 / L89-90 / L148-149）⇒ 相对默认 token 权限为**严格收窄**，非行为回归。

**dispatch ⇒ 三个 job 全跑**：**有意为之，评估合理**——dispatch 是人工显式动作（发布前随查 / 怀疑宿主发版时随查），A-F1 所规避的风险面是「**每日无人值守**跑未钉版本的第三方安装 + 全量 smoke」，该风险在人工触发场景不成立；且「手动 = 全量随查」使 dispatch 成为唯一能一次覆盖门禁 + 探测的入口。副作用 = 无法只跑探测（需 dispatch input，非必需）。README L190 / ci.yml L15-18 / CHANGELOG L34 三处口径一致。

**残余**：收敛后 R1 F1 曾指出的「副作用收益」——**真实 schemastery 漂移每日可见**——随之消失，而文档只述「每日面 = 仅探测 job」，未显式记该取舍（**F11，P3**）。

### 2.3 A-F7 退出码语义（0/1/2）与文档一致性 —— 一致；一处交互缺口

四处口径**互相一致**：判据脚本头 L184-186（0 绿 / 1 新版本·覆盖失配·口径外形态 / 2 用法或输入缺失·探测输入不可解析）、`die()` L212/L223-225 ⇒ 2、`inputProblems` 分支 L344-350 ⇒ 2、probe-face 头 L31（0 / 1 / 2）、README L190（`input` ⇒ 退出码 2）。**逐包 try（L285-294）** 覆盖空文件、`JSON.parse` 抛错、非字符串数组三形态，均 `inputProblems` 归因后 `continue`（不中断其余包）——A-F7 的双重要求（退出码归位 + 逐包归因）均落地。
**交互缺口**：`inputProblems` 分支 `process.exit(2)` 位于 failures 报告**之前**（L344-350 vs L351-366）⇒ 同一轮若「一包输入异常 + 其它包检出宿主新版本」，**新版本检出被完全吞掉**（报文只有 input；退出码归因于输入）。fail-closed 方向无误（仍红），但会延后宿主发版暴露一轮（**F5，P3**）。

### 2.4 判据⑥（`KEY_OPEN6`）逻辑正确性与误报面 —— 逻辑正确；对 21 项既有条目**零误报**，增量真实

- **实现**（smoke L2154-2178）：不复用 symbol 候选，改按**目标语言**判定「范围首行是否为构造键行」（JSON/JS 同为 `键: {`；YAML 缩进块与 `[` 数组不入面），随后**裸字符配平**求闭合行，要求 `closeLine ≤ end`；项数入 golden `GOLDEN_KEY_OPEN_ITEMS = 3`。
- **对 21 项既有范围条目的误报面 = 0**：本人以正则独立推演——JS `const x = {` 形态不命中（要求 `: {` 而非 `= {`），YAML `- id:`/`name: 值` 不命中；实测命中的恰 3 项可逐点核实：`package.json` L17 `"dsh": {`（闭合 L29）、L39 `"peerDependencies": {`（闭合 L45）、L8 `"engines": {`（闭合 L10）——三者 `closeLine ≤ end` 全部成立 ⇒ 绿。其余 18 项首行为 JS 调用/声明/注释 ⇒ 不适用（与 smoke 注释 L2146-2149 自述一致）。
- **真实增量可静态复现（本人独立复算，非采信自述）**：取 4.6 `L17-29`，
  - 止改 **L21**：⑤b 经候选 `client`（COMMON_WORDS 未含 `client`）命中 L21 `"client": {`，闭合 L28 > 21 ⇒ **⑤b 亦红**；
  - 止改 **L28**：内层 `"client"` 闭合于 L28 ≤ 28 ⇒ **⑤b 绿**；而 ⑥ 取首行 L17 `"dsh": {`，闭合 L29 > 28 ⇒ **⑥ 红**。
  ⇒ ⑥ 的覆盖增量 = 「首行键 ≠ 任何 symbol 候选」∪「外层构造闭合行 > 止而内层 ≤ 止」两类，**成立**；契约 item 4.6 note（L140）与 CHANGELOG L37 的 P-01 实测订正（原静态推演「⑤b 无匹配 opener」部分不成立）与实测一致。
- **口径边界（已披露，接受）**：配平为裸字符计数（不剥字符串/注释中的 `{}`）、只取首行 opener——smoke L2150-2153 已写明理由（JS 范围可为合法语义片段，无差别配平会误报 2.1/2.3/3.8）与代价（未来新增「首行即构造键」的合法部分范围条目须显式改 golden）。

### 2.5 B-N5 `revisions` 补录的副作用（末项 task 变化 ⇒ `[nv-compat]` 载荷与断言跟随）—— **无隐藏耦合，断言全部派生**

- 机制：`CONTRACT_TASK = hostContract.revisions.at(-1).task`（host-boundary.js L226-228）为**单一派生点**，`warnCompatReport` 的 `task`（L255）与 `contractProjection().revision`（L240）均复用；补录后末项 = `COMPAT-005` ⇒ 载荷自述任务名随之变化。
- **逐点核验无硬编码耦合**：smoke D2 载荷断言 = `payload.task === hc4.revisions.at(-1).task` ∧ 源码无 `task: 'COMPAT-004'` 字面量 ∧ `task: CONTRACT_TASK` 在位（L2404-2410）；路由断言 = `rp5.contract.revision === hc5.revisions.at(-1).task`（L2843）；测试内 mock 的 `task: 'COMPAT-002'` 是**输入**而非断言（L2616/L2629）。⇒ 补录后无需改测试、无断言漂移，与 R2 §7.1 裁定「补录的副作用是预期且自洽的」一致。
- 归因后果（非耦合缺陷）：载荷 `task`/`revision` 现报 `COMPAT-005`，而最后改写契约**描述面**的是本批 COMPAT-014（B-N4/B-N3 以「**COMPAT-014 同步**」后缀并入该条目，契约 L73）⇒ 属 R2 已裁量的可接受后果，登记为备注（§7.1）。

### 2.6 B-N1 `raw` 判据与 facade 展示肢的分离是否彻底 —— **触发面已分离；展示面仍为合并读数（已披露的既有设计，非回归）**

- 触发面：`diagMinSupportSignal` 只读 `raw`（client.js L2405-2410：`find(k,'raw')` / `remotePresent`），`legacy-connection-api` 的标记式判定保留（raw 与 ok 同源，L2365）；facade 肢 `ok` **仅**用于 rows/探针展示。
- 构造实证：(g) 形态（原始 ns 在场 ∧ `api: {}` ⇒ `ok=false, raw=true`）断言 `remoteChecksG.every(c => c.ok === false && c.raw === true)` ∧ `rbG.triggered === false`（smoke L2713-2732）——**把「合并读数会误报」固化为反例**。
- 残余（如实登记，非本批引入）：`ok` 仍把「原始 ns 缺席」与「facade 不可用」压成同一读数 ⇒ (g) 形态下 2.5~2.9 行显示 `missing`，机器不可区分两因（`detail` 仍并列两肢可人工分辨）。与 R2 §7.2 备注 3 同源，本轮明确选择「facade 肢仅作展示」故未闭合；**无假绿、无误报**，登记为备注（§7.3）。

---

## 3. 三组 20 项逐项落地核验表

> 判定口径：**已落地** = 有可核验实现落点且逻辑正确；括号内为精度/强度瑕疵（详见 §6 编号）。

### A 组 — `docs/review/COMPAT-007-R1.md` F1~F9

| 项 | 前轮要求（实质） | 落点（实读） | 核验方式 | 判定 |
|---|---|---|---|---|
| F1（P2） | workflow 级 `schedule` 使既有 job 进每日无人值守面 ⇒ 收敛或披露 + 最小 permissions | `ci.yml` L18 / L87（反向 `if`）、L20-21 / L89-90（`contents: read`）、L15-17 / L85-86（理由注释）；机检 = probe-face L149-177；文档 = README L190、CHANGELOG L34 | 逐事件推演 + 门禁矩阵比对（§2.2）；README 披露「每日面 = 仅探测 job」 | **已落地**（取舍披露缺口 → F11） |
| F2（P2） | 判据在 PR/push 面零机检 ⇒ 离线机检 + 提取泛化 | 新增 `probe-face.mjs`（315 行，L1-315）；接线 `ci.yml` L34-35（`--check`）+ L61-62（sanity 步骤）；`ci-mock-face.mjs` L28-46（`extractHeredocs` 泛化）；smoke L1906-1915（⑧b 接线守卫） | 提取去缩进语义推演 + 7 例判别力复算（§2.1） | **已落地**（接线守卫强度 → F2；判据 ①③⑤ 零负例 → F4） |
| F3（P3） | CLI 代理子句②误红 ⇒ ①fixtures 增 cliVersion 或 ②CLI 跳过子句② + 报文限定语 | 判据 L192-194（② 的 CLI 豁免说明）、L283（`isCli`）、L308-309（跳过 ②）、L331（okLine 限定语）；probe-face L271-272（`cli-past` 例）；README L190 | 裁定 = **(b) 跳过 + 限定语**（Coordinator 裁定，CHANGELOG L34 记理由）；`cli-past` 例为回归守卫 | **已落地（按裁定方案）** |
| F4（P3） | 判据仅包名维对账 ⇒ 补版本维双向 | 判据 ①b L190-191 / L273-277；smoke ① 双向 L1807-1817；probe-face L280-290（契约侧 / fixtures 侧各一例） | 两侧构造例均断言 `版本维双向对账` + exit 1 | **已落地** |
| F5（P3） | 白名单与「探测命令 ↔ 探测文件名」绑定无机检 | probe-face ③ L179-224（正向白名单 ×6 条 + 禁词 ×6 类 + stem↔命令恰 1 条 + 越界探测） | 14 条命令逐条比对 ALLOWED（本人静态复核：12 + 2 = 14，全部匹配）；`probedStems` 与 `declared ∪ {dsh}` 双向 | **已落地**（自指面 → F6） |
| F6（P3） | fail 分类处置未分类，与真实关闭路径不符 | 判据 `DISPOSAL` L213-222（5 类）+ 按类打印 L355-365；probe-face ⑤ L292-299（`fail()` 类别 ≡ 表键集双向 + 报文前缀 `── 类别 `） | 5 类键集 = `input/surface/coverage/version-form/version-drift`，与 `fail()` 调用点 + `DISPOSAL.input` 用法一致；README L190 逐类口径一致 | **已落地** |
| F7（P3） | 输入异常退出码与文档不符 + 缺逐包 try | 判据 L185-186（退出码声明）、L264（`inputProblems`）、L285-294（逐包 try）、L344-350（exit 2 + 归因）；probe-face L277-278（空文件例） | 三形态（空文件 / 解析抛错 / 非字符串数组）归因；四份文档口径一致 | **已落地**（同轮并存时掩盖 failures → F5） |
| F8（P3） | README 两处口径（判据④真值 / `0.1.0-rc.7` 依据） | README L190（高于最新覆盖车 ∨ 同车推进才红 + 中间车不判红 + 每日面 + 新增子包盲区）、L185（依据改指 RESEARCH §3.1 / DESIGN） | 与判据④实现逐字对齐；`docs/RESEARCH.md` L76（§3.1「0.1.0-rc.7 实测」）与 `docs/DESIGN.md` L87（兼容矩阵「实测 0.1.0-rc.7 / 0.1.1-rc.2」）**实读存在** ⇒ 依据真实、无幻觉 | **已落地**（L185 残留歧义 → F10） |
| F9（P3） | README smoke 计数陈旧（179）⇒ 更新 + 入机检 | README L168（**279**）；smoke L2962-2969（末条断言 `readmeSmokeDeclared === passed + 1`，含自身；注释要求保持末位） | 机制自洽（自计 + 末位约束）；运行时值 279 由 Coordinator 复跑确认（本人未运行） | **已落地** |

### B 组 — `docs/review/COMPAT-005-R2.md` N1~N5

| 项 | 前轮要求（实质） | 落点（实读） | 核验方式 | 判定 |
|---|---|---|---|---|
| N1（P3） | RB-03 触发判据含 facade 第二重肢 ⇒ 改用原始肢，facade 仅展示 | `client.js` L2359-2363（口径注释）、L2364-2370（六探针显式返回 `raw`）、L2405-2410（触发只读 `raw`）、L2437（`raw` 入 checks）；smoke L2713-2732（(g) 形态反例） | 逐行读触发路径；四形态 (d)(e)(f)(g) 齐全 | **已落地** |
| N2（P3） | D1⑩ 守卫词法/范围窄于披露 ⇒ 放宽词法 + 扩扫描面 + 删两条现役副本 | 契约 L96（1.3 note）、L97（1.4 symbol）、L98（1.5 note）、L100（1.7 note）、L103（1.10 note）；smoke L2914-2931（词法「现…L…」+「emit/logger/logWarn+L…」；扫描面 = items.note/symbol + clientProbes + faces.scope + revisions.scope + regionLiterals + ctxGetSemantics + hostSurface）、L2956-2959（断言） | 两逃逸形态经正则推演均**会被命中**（`现调用点 L170` ✓ / `emit L155` ✓）；`staleNoteRefs5.length === 0` 为最终条件 | **已落地**（缺正向对照 → F9） |
| N3（P3） | 载荷内 `host.versionNote` 自由文本 ⇒ 枚举化 | `host-boundary.js` L206-211（`host: { version: null, versionCode: 'tp4-unprobed' }`）；smoke L2932-2937（`versionNote === undefined` ∧ 码形态 `^[a-z][a-z0-9-]*$`） | 断言对象 = **真实路由产出** `rp5.report.host`（L2824-2843），非 mock 输入 | **已落地** |
| N4（P3） | `clientProbes[]` 的 note/mode 未随双判据同步 | 契约 L217-220（mode 口径注释）+ L223-227（五项 `mode: 'runtime-service+raw-ns'` + note 写明「原始服务名在场 ∧ facade 域可用」） | 逐项读；与 `CLIENT_PROBES` 实现注释（L2359-2363）口径一致 | **已落地** |
| N5（P3） | `revisions[]` 未收录 COMPAT-005 结构演进（裁量 §7.1） | 契约 L73（末项 = COMPAT-005：`clientProbes[]`/`clientProbesNote` + item 1.8 路由数 12→13 + 原因字段枚举化 + `contractProjection()`，并附「**COMPAT-014 同步（B-N4/B-N3）**」后缀） | 断言全派生（§2.5），补录后无漂移 | **已落地（按裁量）** |

### C 组 — `docs/review/COMPAT-013-R1.md` F-1~F-6

| 项 | 前轮要求（实质） | 落点（实读） | 核验方式 | 判定 |
|---|---|---|---|---|
| F-1（P3） | ⑫d 标签「3/5/6」漏面 4 且与自身列举矛盾 ⇒ 动态生成 + 计数入 golden | smoke L2180-2204（`rangeNonStrictFaces` 动态 + `GOLDEN_RANGE_NONSTRICT_ITEMS = 10` + `GOLDEN_RANGE_COMMENT_START = 2` + 消息含实读清单）；CHANGELOG L36 | 面分布动态生成（实测 3/4/5/6）、条目数 golden 双向（漏面即红） | **已落地** |
| F-2（P3） | F-5② golden 的排除项列举失实（2.3 实为单段范围） | smoke L2027-2031（改「2.2（`L97` 单行号）与 2.4（多段）」）；契约 L110（item 2.2 note 同订正） | 契约 `line` 字段实读：2.2 = `L97`（不匹配 `RANGE_LINE`）、2.4 = 六段多段形态、2.3 = 单段范围 ⇒ **结论正确** | **已落地**（所引 2.3 行值陈旧 → F3） |
| F-3（P3） | ⑤a「覆盖 2 对」非同源 ⇒ 精确化 + 写明 golden 独立作用边界 | smoke L2078-2081（两对同行共现 ⇒ 判别力等价单构造计数；golden `=== 2` 的独立作用仅在单 token 计数漂移时显现）+ 断言名 L2134 | 与 COMPAT-013-R1 §3.2 的 6 处同行共现证据一致；披露准确 | **已落地** |
| F-4（P3） | ⑤b 以「候选键名 ≡ 构造键名」为前提 ⇒ 4.6/6.2 终点截断盲区 | smoke L2139-2178（判据⑥ + `GOLDEN_KEY_OPEN_ITEMS = 3`）；契约 L140（item 4.6 note 按实测订正）；CHANGELOG L37（P-01 订正） | 本人独立复算 4.6 止改 L21/L28 两例（§2.4）⇒ 增量真实；对 21 项零误报 | **已落地** |
| F-5（P3） | 判据⑤ 工具口径强度边界未披露 | smoke L2082-2085（`occ5` 纯子串计数 / 配平裸字符计数 / 不剥注释与字符串 / 方向 fail-closed / 不精确定位） | 逐句与实现比对（L2094-2131）一致 | **已落地** |
| F-6（P3） | 「产品代码 diff = 0」不精确 | CHANGELOG L51（改「运行时行为与诊断载荷零变化（`lib/` 内契约文件 3 处描述性字段，numstat +3/−3）」）；L55（F-4 条目行号加「历史锚点」限定） | 措辞与既有 numstat 事实一致 | **已落地** |

**缺项：无**（20/20 已落地）。附**精度瑕疵**（不改变落地事实）：F-2（所引 2.3 行值陈旧 → **F3**）、F2④（接线守卫强度 → **F2**）、F5③（自指面 → **F6**）、F1（取舍披露 → **F11**）。

---

## 4. 五维度结论

### 4.1 正确性 —— **通过**（0 阻塞；2 P2 + 6 P3，无逻辑错误）
逐行推演覆盖：probe-face 提取/结构/白名单/构造/⑤ 五段（§2.1）、判据脚本六子句与退出码（§2.3）、门禁矩阵（§2.2）、判据⑥（§2.4）、B-N1 触发面（§2.6）、B-N5 派生链（§2.5）、⑫b/⑤a/⑤b/⑥/⑫d 的 golden 与范围语义。**未发现条件判断错误、边界遗漏或信号反向**；发现的 2 处 P2 均属「宣称强度 > 实现强度」（F1/F2），6 处 P3 属覆盖/诊断/健壮性/文档精度。行号引用面的**独立实读抽核**：`package.json` L17/L21/L28/L29/L8/L10、`client.js` L978（`/**`）、L1028（空行）、L2829（`findSidebarEl`）、L4804（`const inject = ['slots']`）、L4927（末行）**全部命中**；`ci.yml` L18/L87/L146/L167-176/L180-368 与契约 L242-245 的探测目标集（8 包 ∪ `dsh` = 9）**双向一致**。

### 4.2 安全性 —— **通过（无新攻击面；1 处口径边界）**
- **输入面**：probe-face 读 `ci.yml` / 契约 / fixtures（皆为仓内文件），写面仅 `mkdtempSync(tmpdir())` 隔离目录（probe 构造、契约副本、fixtures 副本、子进程日志、可选 `--json-out`）；**无网络**（唯一网络面是 CI 侧 `npm view`，且其命令集被 ③ 正向白名单钉住）；**不执行宿主代码**（判据脚本只读文件）。
- **注入/越界**：构造目录名全为字面量，无用户输入拼接；`ci-mock-face.mjs` 既有的 `materializeCiMocks` 路径包含性守卫（L113-114）未被本批削弱。
- **真实环境防护（M7.7）**：本批全部验证在隔离环境内（`%TEMP%` / `mkdtemp`），**未触碰 `$HOME` 配置目录、`$DSH_HOME` 或仓外路径**；契约/README 无凭据或绝对路径泄漏（既有 BC-05 机检保持）。
- **权限收窄**：三 job `permissions: contents: read` 为严格收窄（A-F1 附带）。
- **口径边界（F6，P3）**：A-F5 白名单只覆盖 run 块**命令**，不含 heredoc 判据脚本体；且 ALLOWED/FORBIDDEN 与 ci.yml 同批演进（工具与目标同 commit）⇒ 该机检是**变更探测器**而非独立权威——对 F5 的真实失效模式（顺手加 install / 改命令留文件名）有效，对「工具与被测物同向放宽」无信号。
- **新增执行点（登记为备注）**：`sanity` 现在**执行** ci.yml 内联判据脚本体。与既有 smoke/ci-mock-face 执行仓库代码同性质（非新信任边界），且该脚本在探测 job 中本就会执行；工具头已披露。**未发现新增注入/泄漏/提权路径。**

### 4.3 可维护性 —— **通过**（1 P2 + 4 P3）
- **职责单一（C-03）**：probe-face 定位 = 「探测轨判据 + CI 接线的离线机检」，与 `ci-mock-face.mjs`（mock 导出面 × fixtures 对齐）边界清晰；**共用 `extractHeredocs` 单一口径**（ci-mock-face L16-17 头注释明写消费方）⇒ 避免两处各写一份后漂移，属正确抽象选择。
- **注释质量**：315 行中约 1/3 为口径/依据注释，逐条可溯源（动因、边界、反例），符合本仓既有风格；未发现注释与实现相悖之处（**除 F3 的行号副本**）。
- **脆弱点**：A-F4 契约侧构造依赖字面锚点 `"    packages: {\n      '0.1.1-rc.2':"`（命中失败即 `die(2)`，措辞为「输入缺失」——**F8**）；⑤ 的 `indexOf('\n}')` 定位 DISPOSAL 块尾（缩进变化即取整段 ⇒ 断言转红，方向 fail-closed 但脆弱）；② 的期望矩阵与 ci.yml 注释/README 三处平行维护（brittle-by-design，红报文明示）。
- **文档一致性**：README/CHANGELOG 与实现口径逐条对齐（A-F8/F9、C-F-6 已收口）；**未闭合**：本批新写文本内的陈旧行号副本（**F3**）、README L185 歧义（**F10**）。

### 4.4 性能 —— **通过**
离线、零依赖：1 次 `--check` + 7 次判据子进程（每次读 3-4 个小 JSON），`spawnSync` 串行，量级为**秒级**；无 O(n²) 以上算法（配平扫描为文件行数 × 少量构造键）；CI 成本增量 = sanity 内一次秒级步骤，**不引入 install/网络**。唯一风险 = 无 `timeout`（**F7**）。

### 4.5 测试覆盖 —— **通过（附覆盖缺口披露）**
- **本批新增防护**：`probe-face` 14 项机检 + 7 例构造（覆盖判据 ②④ + A-F3/A-F4/A-F7 + A-F6 类别闭包 + 白名单 + 门禁结构）；smoke +3 项（判据⑥ / A-F2 接线守卫 / A-F9 计数机检）并在既有条目上强化（B-N1 (g) 形态、B-N2 词法/扫描面、A-F4 版本维双向、⑫d 动态 golden）。
- **无新真空断言**（逐项核）：⑫e（golden 3 + 零失效）、⑫d（条目数 + 注释起段双 golden）、A-F9（自计 + 末位约束）、smoke ① 版本维（目录 ≡ 契约键集，双向）、A-F4 两例（各断言类别串）——**均非恒真/恒假**。
- **覆盖缺口（如实列出）**：① 判据 ①（面双向）/③（fixtures 自洽）/⑤（受限版本口径）在 probe-face 构造面无负例（**F4**）；② B-N2 扩宽词法无正向对照（**F9**）；③ smoke ⑧b 接线守卫为全文子串匹配（**F2**）；④ probe-face ② 的 `on:` 四类事件无实现（**F1**）；⑤ 面板**渲染树**断言仍不可达（环境无宿主/DOM，沿用 COMPAT-005 的诚实替代，非本批引入）。

---

## 5. AI 代码专项 5 项

| 项 | 结论 | 事实依据 |
|---|---|---|
| mock 残留 | **无** | 无占位实现替换真实被测物；构造用例显式落在 `mkdtemp` 并标注「构造」；判据脚本取自 ci.yml **真身**（无仓内副本可比对漂移）。 |
| 硬编码 | **有意的 golden/期望常量，全部带原址理由 + 漂移即红**：`GATE_BASIC_JOBS`/`expectedByEvent`、`ALLOWED`/`FORBIDDEN`、`['contents: read']`、A-F4 锚点、构造版本串、`GOLDEN_KEY_OPEN_ITEMS=3`/`GOLDEN_RANGE_ITEMS=21`/`GOLDEN_RANGE_STRICT_ITEMS=11`/`GOLDEN_RANGE_NONSTRICT_ITEMS=10`/`GOLDEN_RANGE_COMMENT_START=2`/`GOLDEN_CARDINALITY_PAIRS=2` | `10 与 3 的合理性`：10 = 非严格面（3/4/5/6）范围条目实数、3 = 首行即构造键的范围条目实数——**两者均与实读一致**，且「扩面/删项须显式改 golden」的设计使静默漂移必红（brittle-by-design，本仓既有约定）。唯一无消费者的硬编码 = `--json-out`（§7.2）。 |
| 幻觉 API | **未发现** | `spawnSync(execPath, args, { stdio: ['ignore', fd, fd] })`、`mkdtempSync/readdirSync/rmSync`、`pathToFileURL` 用法均正确；README 依据改指经**实读命中**（`RESEARCH.md` L76 §3.1、`DESIGN.md` L87 兼容矩阵）；契约 4.6/6.1/6.2 的 `package.json` 行值（L17/L39/L8）实读命中。 |
| 未实现 TODO | **无** | 9 路径无 `TODO/FIXME/XXX`（全仓 grep 命中项仅历史评审报告文本与 preset 占位符 `chapter-XXX`，与本批无关）；「未覆盖面」一律以枚举码/数量摘要显式披露（非静默遗留）。 |
| 过度实现 | **总体必要**（+606 行 ↔ 三组 20 项收口面，逐项有落点）；最接近边界的三处：`--json-out`（无消费）、A-F4 契约侧文件手术（必要但依赖字面锚点）、⑤/⑥ 的 golden 常量（约定内）。**无实质过度实现**；建议清理 1 处可选面（§7.2）。 |

---

## 6. 发现列表（P0~P3；file:line + 事实依据 + 影响 + 修复建议）

> P0 = 阻塞（**本批 0 条**）；P1 = 高（**0 条**）；P2 = 警告（2 条，不阻塞，建议合并前决策/随任务收口）；P3 = 建议（9 条）。

### F1 — **P2**（测试覆盖/披露准确性）probe-face ② 宣称「`on` 含四类事件」，实现只检 `schedule` 存在
- **位置**：`test/fixtures/host-surfaces/probe-face.mjs` L13-14（头注释「② …∧ `on` 含四类事件」）与 L173-175（记录名「push/pull_request ⇒ 既有 job；workflow_dispatch ⇒ 全量」）；条件仅 `gateMismatch.length === 0 && gateUnknown.length === 0 && yml.includes('  schedule:')`。
- **依据（实读推演）**：`evaluateGate`（L110-117）与 `jobGates`（L78-92）都是 **`if` 表达式**的纯函数，**与 `on:` 无关** ⇒ 从 `on:` 中删除 `pull_request:` / `push:` / `workflow_dispatch:` 三者，② 记录**仍然全绿**（`yml.includes('  schedule:')` 只需 schedule 存在）。全仓无第二处对 `on:` 键集的机检（smoke 仅 L1907 注释提及 schedule）。
- **影响**：① 记录名/头注释**宣称超出实现**（P-01 意义的事实不实——与 COMPAT-003 F3「四类 region 字面量双向对账宣称超出实现」同类）；② 删 `pull_request:` 会**静默失去 PR 门禁**、删 `workflow_dispatch:` 会静默失去手动随查，两方向零信号（假绿方向）。
- **修复建议（3 行）**：在 ② 条件内加四键断言，例如 `['push','pull_request','schedule','workflow_dispatch'].every((k) => new RegExp('^  ' + k + ':').test(yml))`，并把失败明细并入 `detail`。**不阻塞**（当前 `on:` 四类事件**实读齐全**：ci.yml L4/L6/L9/L11，无现行缺陷）。

### F2 — **P2**（测试覆盖/守卫强度）smoke ⑧b「接线守卫」为全文件子串匹配，未绑定 `sanity` job 段
- **位置**：`test/smoke.mjs` L1906-1915（`ciYmlSrc.includes('node test/fixtures/host-surfaces/probe-face.mjs') && ciYmlSrc.includes('node --check …') && existsSync(…)`）；断言名自称「删除接线 = 判据回到零机检态」。
- **依据**：`ciYmlSrc` = ci.yml **全文**（L1893）。把该步骤从 `sanity` 移入 `host-latest-probe`（或被注释/步骤名提及）后：字符串仍在 ⇒ 守卫**仍绿**，而 PR/push 面**重新变为零机检**——**正是 R1 F2 的失效模式本身**。
- **影响**：守卫的表述强度 > 实现强度；F2 的核心不变量（「离线机检位于 PR 门禁内」）只由字符串存在性近似保证。
- **修复建议**：复用/导出 `jobSection()`（probe-face L68-75 已有），断言该调用行落在 `sanity` 段内；更贴切的做法是**在 probe-face 内部自断言**（工具自己运行于 sanity 中，可校验 `jobSection(yml,'sanity')` 含自身调用行）。**不阻塞**（当前接线正确：`sanity` L61-62，本人实读确认）。

### F3 — **P3**（文档精度，同类未闭合）本批新写文本内的行号副本与契约当前 `line` 字段不一致（4 处）
- **位置**与**事实**（契约字段为唯一事实源，逐点已实读）：
  1. `test/smoke.mjs` L2029（**本批 C-F-2 新写**）：「而 2.3 `L4374-L4377` 命中 RANGE_LINE」——契约 L111 item 2.3 = **`L4804-L4806`**；实测 `client.js:4804 = const inject = ['slots']` ✓，而 L4370-4377 为 BindDialog 渲染段（无关）。
  2. `CHANGELOG.md` L36（**本批 C-F-2 新写**）：同一失实值「（2.3 `L4374-L4377` 属单段范围条目）」。
  3. `test/smoke.mjs` L2183：「3.1 起于 `/**` JSDoc **L838**、3.5 起于 `//` 互操作说明 **L896**」——契约 3.1 = `L978-986`（实测 L978 = `/** 找到会话根容器`）、3.5 = `L1028-1040`（实测 L1028 = **空行**；`//` 互操作说明在范围内 L1036 处，**不在起点**）。
  4. `test/smoke.mjs` L2021 / L2151（⑤/⑥ 口径论证引用）：「2.3 `L4374-L4377` +1 / 3.8 `L2411-2421` +1」——契约 3.8 = **`L2829-2839`**（实测 L2829 = `function findSidebarEl()`）。
- **影响**：① 同一处修复（C-F-2）在**契约 note（用正确值 `L4804-L4806`）与 smoke/CHANGELOG（用陈旧值）之间自相矛盾**；② 与 C-F-1/C-F-2/F-4/C-F-6 所收口的「人工转写漂移」**同类且未闭合**——B-N2 守卫只扫契约自由文本（smoke L2925-2931），**不覆盖 smoke 注释与 CHANGELOG**；③ 注释作为「为什么不做 X」的论证依据时，陈旧数字会误导后续维护者（例：无差别配平的误报面论证）。
- **修复建议**：引用处改为**契约字段引用**（如「2.3 `line` 字段」）或符号化表述；如保留数字，按当前字段逐点更正（2.3 `L4804-L4806` / 3.1 `L978-986` / 3.5 `L1028-1040` / 3.8 `L2829-2839`）。可选：把「注释/CHANGELOG 内行号引用」纳入与 B-N2 同款纪律。**不阻塞**（零功能影响；机检不受影响）。

### F4 — **P3**（测试覆盖）判据 ①/③/⑤ 三段在 probe-face 构造面**零负例**（A-F2 残留面）
- **位置**：`probe-face.mjs` L226-290（7 例）与判据脚本 L269-271（① 面双向）、L311-319（③ fixtures 自洽）、L296-304（⑤ 受限版本口径 / `version-form`）。
- **依据**：7 例覆盖 = 绿 / ④漂移 / A-F3 CLI / ②覆盖 / A-F7 输入 / ①b 契约侧 / ①b fixtures 侧（工具头 L18-21 对 7 例的列举**如实、无过度宣称**）；三段判据无任何构造负例 ⇒ 其**逻辑缺陷仍只能靠人工审查**（`fail('version-form',…)` 与 ③ 的两条覆盖路径从未被任何用例触发）。
- **影响**：A-F2 的动因（判据逻辑缺陷在 PR 面零机检）在这三段残留；不构成假绿（fail-closed 方向未受影响）。
- **修复建议（各 1 例，成本低）**：① 探测目录删一个 stem ⇒ 断言 exit 2 + 归因（注意与 ① 的 `surface` 失败并存时 exit 2 优先，见 F5）；③ 构造第 4 份 fixture 令某非例外包版本 ≠ `hostVersion` ⇒ 断言 exit 1 + `类别 coverage`；⑤ 构造上游版本串 `0.1.5-beta.1` ⇒ 断言 exit 1 + `类别 version-form`（并顺带覆盖「更新 fixtures 关不掉」的处置文案）。

### F5 — **P3**（诊断完整性）`inputProblems` 分支先于 failures 报告 ⇒ 同轮「输入异常 + 宿主新版本」时新版本检出被吞
- **位置**：判据脚本 `ci.yml` L344-350（`if (inputProblems.length > 0) { … process.exit(2) }`）先于 L351-366（`failures` 分类打印）。
- **依据**：逐包循环对输入异常 `continue`（L285-294），此时其它包可能已累计 `version-drift` failures；一旦进入 input 分支即 `exit(2)`，`byClass` 打印永不执行 ⇒ 运维者只看到 input，需先修输入再重跑才能看到宿主发版。
- **影响**：宿主发版暴露延后一轮（不影响 fail-closed 方向与退出码归因正确性）。
- **修复建议**：input 分支内补一行 failures 摘要（如 `failures.size > 0` ⇒ `console.error('  另检出 ' + failures.size + ' 项判据失败（修复输入后重跑可见分类明细）')`），或调整打印顺序（先 failures 再 input 退出）。

### F6 — **P3**（安全性/机检强度）A-F5 白名单机检的自指面：判据脚本体不在禁词扫描面内
- **位置**：`probe-face.mjs` L179-211（`commandLines` 仅来自 run 块；heredoc 体经 L192 显式跳过）与 L206（`FORBIDDEN` 仅施加于 `commandLines`）。
- **依据**：判据脚本本身由 `node` 执行（等效命令面），若未来在其内部加入 `npm`/网络/子进程调用，「白名单/禁词」检查**无信号**；同时 ci.yml L157-163 的**注释声明白名单**与 `ALLOWED` 常量之间的一致性亦无机检。
- **影响**：BC-05 供应链纪律的机检覆盖面**窄于其文字表述**（「探测 job 的 shell 命令」），属声明与实现的精度差；对「顺手加 install」这一真实失效模式仍然有效（run 块新增命令必红）。
- **修复建议**：对 `probe.body` 追加同款 `FORBIDDEN` 扫描（脚本内出现 `npm install`/`npx`/`child_process`/`fetch`/`http` 即红）；或将注释声明的禁用词集合与 `FORBIDDEN` 常量做双向对账（低成本）。

### F7 — **P3**（健壮性）`runNode` 未设 `spawnSync` `timeout`：判据脚本若阻塞，sanity 挂到 job 级超时
- **位置**：`probe-face.mjs` L119-129（`spawnSync(process.execPath, args, { stdio: ['ignore', fd, fd], cwd: REPO_ROOT })`，无 `timeout`）。
- **依据**：判据脚本来自 ci.yml heredoc（同 commit 可变）；若引入死循环、阻塞读或 `readFileSync` 于特殊文件，probe-face 会**同步挂起**，PR 门禁直至 GitHub job 默认超时（360 分钟）才落定——而「首个缺陷应在 PR 面秒级暴露」正是 F2 的价值所在。
- **影响**：极端情形下把「秒级离线机检」退化为「小时级挂起」，且无归因（只看到 CI 超时）。
- **修复建议**：`spawnSync` 加 `timeout: 60000`（并用 `r.error`/`r.signal` 报「超时/异常」类失败项），或按例分别设更短超时。

### F8 — **P3**（可维护性/失败态一致性）probe-face 的失败归因与清理口径与自述不完全一致
- **位置与依据**：① L280-284：A-F4 契约锚点未命中 ⇒ `die('A-F4 构造失败：契约 packages 键锚点未命中（契约结构变更后需同步本工具）')`，但 `die` 统一输出「**输入缺失**」并 exit 2（L51）——实为**工具与契约结构失配**，措辞会把维护者引向「文件不可读」；② L137-139：`hostContract.hostSurface.packages` 形态变化（如改名/置空）会走未捕获 `TypeError`（exit 1 + 栈回溯），未走 `die(2)` 归因；③ 头注释 L25-27 称临时目录「用毕删除」，但 `die()`（L132-136 / L181 / L283）与任何未捕获异常发生在 `mkdtempSync`（L143）之后 ⇒ **不清理**（仅成功路径 L310 `rmSync` 清理）。
- **影响**：失败态的归因可读性与临时目录卫生；方向均为 fail-closed，无假绿。
- **修复建议**：`die(msg, code = 2)` 支持自定义/更精确的前缀（如「工具与契约失配」）；`packages` 取值加结构守卫（缺失/非对象 ⇒ `die`）；用 `try/finally` 或在 `process.on('exit')` 中清理 `tmp`。

### F9 — **P3**（测试覆盖）B-N2 扩宽后的新词法只有负向断言，缺正向对照（与既有先例不一致）
- **位置**：`test/smoke.mjs` L2931（`/现[^。；]{0,10}L\d/` 与 `/(?:emit|logger|logWarn|emitChanged)\s*(?:\/|,|、)?\s*L\d/`）+ L2956-2959（断言条件仅 `staleNoteRefs5.length === 0`）。
- **依据**：词法正确性经本人推演**成立**（`index.js 现调用点 L170/L1367` ✓ 命中；`emit L155` ✓ 命中），但仓库既有先例要求**扩宽能力必须带正向对照**（COMPAT-012 N1 ①a「R1 口径漏检 ∧ 现行口径命中」双向实证；COMPAT-005 F2「注入 file/reason ⇒ 扫描器必红」）。此处无对应正例 ⇒ 若未来正则被误改为更窄形态，仍可能全绿（退化为「零命中 = 无副本」的恒真面）。
- **影响**：守卫的判别力未被机检证明；属强度缺口而非现行缺陷（当前实测 0 处现役副本）。
- **修复建议（2 行）**：`const lexerProbe = ['index.js 现调用点 L170', 'emit L155'].every((s) => /…/.test(s))` 并并入断言条件（或独立 check），零成本把「词法有效」固化为反例。

### F10 — **P3**（文档精度）README L185「该版本无仓内 fixture」歧义，且与同行依据自相矛盾
- **位置**：`README.md` L185（`0.1.0-rc.7` / `0.1.1-rc.2` 矩阵行）。
- **依据**：同行前半句以「fixtures 快照（`0.1.1-rc.2` 为 0.1.x 旧表面线代表…）」为依据，随后括注「——**该版本无仓内 fixture**，勿读作「fixtures 快照」」；「该版本」在句中紧邻 `0.1.1-rc.2`，会被读成「`0.1.1-rc.2` 无 fixture」，而仓内**实存** `test/fixtures/host-surfaces/0.1.1-rc.2.json`（契约 `packages` 键 L243 + smoke ① 目录 ≡ 键集机检）。A-F8 原意（CHANGELOG L34）是 **`0.1.0-rc.7`** 无仓内 fixture。
- **影响**：兼容矩阵是**对外承诺口径**，读者可能据「无 fixture」误判覆盖证据面（属证据链归类偏差，非编造）。
- **修复建议**：改为「（`0.1.0-rc.7` **无仓内 fixture**，勿读作「fixtures 快照」；`0.1.1-rc.2` 有 fixture 快照）」，明确主语。

### F11 — **P3**（披露完整性）A-F1 收敛的取舍未显式留档：每日真实包漂移可见性随之消失
- **位置**：`.github/workflows/ci.yml` L85-86（host-logic 反向 `if` 的理由注释）、`README.md` L190、`CHANGELOG.md` L34。
- **依据**：R1 F1 明确列出反向收益「（真实 schemastery 漂移**每日可见**）」（`COMPAT-007-R1.md` L193③）；采纳方案 (a) 收敛后该收益一并消失，而三处文档只述「每日面 = 仅本探测 job」「避免每日无人值守第三方安装」，**未把「附带收益消失」记为取舍**。
- **影响**：后续维护者可能误以为「每日仍有真实包漂移检测」，或在成本讨论中重复提出同一收敛（P-02 全面分析口径的披露缺口；无功能影响）。
- **修复建议**：在 README L190 或 CHANGELOG L34 补一句「代价：原每日一次的真实 schemastery 漂移可见性随之消失，如需该信号可 dispatch 或另立定时任务」。

---

## 7. 非阻断备注（不改变终态）

1. **B-N5 归因后果（裁量登记）**：`revisions` 末项 = `COMPAT-005` ⇒ `[nv-compat]` 载荷 `task` 与 `contractProjection().revision` 现自述 `COMPAT-005`，而最后改写契约描述面的是本批 COMPAT-014（以「**COMPAT-014 同步（B-N4/B-N3）**」后缀并入同条目，契约 L73）。R2 §7.1 已裁定「补录（更合先例）/记入 COMPAT-014（更省事）」两者均可接受，本轮取「更合先例 + 同条目附注」⇒ **决策留痕充分**；断言全为派生式（§2.5）无漂移。若追求「载荷任务名 ≡ 最后落地批次」，可选增一条 COMPAT-014 `revisions` 条目（非必需）。
2. **`--json-out` 无消费方**：全仓仅 `probe-face.mjs` L30/L306-309 引用（CI 与 README 均未使用）。属可选产出面，建议删除或在 README 登记用途（AI 专项「过度实现」的唯一命中面）。
3. **探针展示肢合并（已知残余）**：(g) 形态（原始 ns 在场 ∧ facade 不可用）下 rows 仍将 2.5~2.9 显示为 `missing`，仅 `detail` 并列两肢可人工分辨（R2 §7.2 备注 3 同源）。本轮明确「facade 肢仅作展示」故未闭合；**无假绿、无误报**，建议后续与「失败原因分域」一并处置。
4. **`raw` 不进载荷**：`checks[].raw` 仅用于 `diagMinSupportSignal`，未进入 rows/payload（无新增出网字段；BC-05 整包扫描断言保持通过）。
5. **`lib/client.js` 等行数改写实证**：文件总行数 **4927**（实读末行 L4927）与 CHANGELOG「行数保持不变（4927 行）」一致；面 2/3 行号零漂移由 smoke ⑫b/⑤a/⑤b/⑥ 机检兜底（Coordinator 复跑 279/0）。
6. **`lib/host-boundary.js` 不在 sanity `node --check` 清单**（L29-35 列 7 文件）：其语法/加载由 smoke 的 import 链实际执行覆盖（`test/smoke.mjs` 经 `lib/index.js` 载入边界），**非缺口**；如追求形式完备可顺手加入清单。
7. **probe-face 在 `sanity` 中执行 ci.yml 内联脚本**（§4.2）：与既有 smoke/ci-mock-face 同性质的仓库自有代码执行，非新信任边界；建议在工具头补一句显式声明（当前 L18-21 已述「驱动判据真跑」，语义等价）。
8. **`GOLDEN_*` 常量的 brittle-by-design**：扩面/删项即红是**期望行为**（本仓先例：`GOLDEN_RANGE_ITEMS`、`GOLDEN_RANGE_STRICT_ITEMS`、`GOLDEN_NEC`、`GOLDEN_KEY_OPEN_ITEMS`），非缺陷；仅提示后续新增范围条目时需同步 golden 与 F3 的引用值。

---

## 8. 结论与终态

**终态：APPROVED_WITH_NOTES — `unresolved_blockers = 0`**（P0 = 0 / P1 = 0 / P2 = 2 / P3 = 9）。

**判定依据**：
- **三组 20 项 100% 落地**（§3，无缺项），且核心修复的**判别力可独立复算**：probe-face 7 例对判据 ②④ + A-F3/A-F4/A-F7 均为「删除即绿」的有效反例；判据⑥ 对 4.6 止改 L28 的真实增量经本人静态复算成立；B-N1 的 (g) 反例、B-N3 的真实路由产出断言、N5 的全派生链均已实读核验。
- **两处 P2 均为「宣称强度 > 实现强度」**（F1 `on:` 四类事件、F2 接线守卫子串匹配），**当前状态均无缺陷**（四类事件实读齐全、接线实读正确、接线位置在 sanity 段内），故不构成阻塞；两者修复成本均 ≤ 3 行，**建议随本批收口或立 P3 后续任务**。
- **P3 九条**集中在：构造覆盖缺口（F4）、诊断完整性（F5）、机检自指面（F6）、健壮性/失败态（F7/F8）、守卫正例（F9）、文档精度（F3/F10/F11）——**不含安全、数据、逻辑或回归风险**。
- **本人未运行任何命令**（§0）；文中「Coordinator 独立复跑」结论（smoke 279/0、probe-face 14+7、ci-mock-face 4/4、validate-preset PASSED、`node --check` 0 错、`yaml.safe_load` 通过）作为**引用事实**记录，供复审时以本人复跑替代。

**给 Coordinator 的三条处置建议（不改变终态）**：
1. **可随本批一并收口（低成本、高一致性收益）**：F3（陈旧行号副本 4 处，其中 2 处为本批新写）、F10（README 歧义一句）、F11（取舍一句话）。
2. **建议立 P3 后续任务**：F1 + F2（守卫强度补强，各 ≤ 3 行）、F4 + F9（构造负例与词法正例，各 ≤ 10 行）、F5/F7/F8（判据与工具健壮性）。
3. **无需动作**：F6（登记为机检声明精度边界）、§7 全部备注。
