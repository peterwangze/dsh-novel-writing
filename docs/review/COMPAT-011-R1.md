# COMPAT-011 代码审查报告（R1）

> **Round**：R1（本任务首轮代码审查；非前轮复审）
> **前轮引用**：`docs/review/COMPAT-003-R1.md`（REVIEW-COMPAT-003-R1，其 C1~C7 + N1~N3 为本次被修项的定义源）
> **审查对象**：commit `adfd0d1`（"COMPAT-011: fixtures 数据质量与断言强化"，8 文件 +463/−833，未 push；工作区 = commit 后状态，`git status --porcelain` 为空）
> **审查人**：Code Reviewer Agent（只读；未运行 extract.mjs、未写任何文件，唯一写入 = 本报告）
> **审查方式**：diff 逐行读 + 独立复算（不采纳自述）——契约/三份 fixtures 机读复算、宿主只读闭包一手对照（npx 闭包 `@deepseek-ai@0.1.5-rc.2`）、smoke C3/C5/C6 断言逻辑在 node 中逐条复现
> **日期**：2026-09-12

---

## 1. 终态结论

**APPROVED** — `unresolved_blockers = 0`（P0 阻塞 = 0；硬门槛 5/5 通过；C1~C7 与 N1~N3 逐项落地核验 10/10 已落地，附 6 条 P3 非阻断发现）。

前轮 P1（C1）+ P2（C2）均已修复且有独立证据；本任务无新引入的 P0/P1/P2 问题。P3 发现全部为非阻断文档/口径/残余缝项（见 §6）。

---

## 2. 硬门槛裁决表

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0**（§6 发现列表最高级别 P3） | ✅ |
| 5 维度全覆盖 | 100% | 5/5 逐项结论（§4） | ✅ |
| 每条发现标注级别 | 100% | 6/6 发现均带 P0~P3 标签 | ✅ |
| 设计一致性检查 | 已完成 | DEC-025 ADR 四项 + P-10 宿主耦合入契约（§5） | ✅ |
| AI 代码专项 5 项 | 全部完成 | 5/5 逐项结论（§4.6） | ✅ |

---

## 3. 独立复算证据（非采纳自述）

| # | 复算项 | 方法（只读） | 实测结果 | 与自述一致？ |
|---|---|---|---|---|
| A1 | 三份 fixtures 关键字残留 | node 只读复算：遍历 `packages[*].classes[*].methodNames` × 17 词黑名单 | **0/0/0**（顶层成员总数 94 / 124 / 184） | ✅（自述 42/46/74 → 0/0/0，项数 94/124/184 逐一对上） |
| A2 | C1 是否引入漏检（真实方法被误排除） | 在 node 中**独立重实现** classBody+mask+methodsOf 三层逻辑，跑宿主 `dsh-settings/lib/index.js` | `SettingsProvider` = **20 名，与 fixture 逐名逐序完全一致**；`blocked=[]`；`SettingsConflictError` = `['constructor']`（宿主 decl 形态 `var X = class`） | ✅（初版 24 → 20 的修复与宿主一手对照成立） |
| A3 | C1 黑名单过筛代价披露是否属实 | 宿主 `cordis/lib/index.js` 行扫描 + 类体复算 | `L17 delete(value) {`（`var DisposableList = class` @L4）、`L1398 async await() {`（`var Fiber = class` @L1007）、`L1564 delete(plugin) {`（`var RegistryService = class` @L1507）——三处**行号与 CHANGELOG 留档逐字一致**，且复算确认这三者确实先被提取、再被黑名单滤除 | ✅ 属实且精确 |
| A4 | C2 去重正确性（抽 dsh-settings） | fixtures 机读 | 三版本均 `classes = {SettingsConflictError, SettingsProvider}`、`classAliases = {"default":"SettingsProvider"}`、`classCount = 2`；宿主 `lib/index.js` **L610** `export { SettingsConflictError, SettingsProvider, SettingsProvider as default, redactSecrets };` = 2 类 4 键 ⇒ 主名可还原、无重复计数 | ✅ |
| A5 | C5 版本一致性 + 例外表 | 三份 fixtures 机读 | 非例外包 `version ≡ hostVersion` 违例 **0**；例外表实据：0.1.5-rc.2 内 `cordis@4.0.2` / `schemastery@3.18.2` ≠ `0.1.5-rc.2` ⇒ `staleExceptions = []` | ✅（双向校验有实据，未腐化成万能豁免） |
| A6 | N1 origin 分流 | 三份 fixtures 机读 | 0.1.1/0.1.2 = `layout:'packed'` → `origin:'tarball-static-extract'`；0.1.5 = `layout:'checkout'` → `origin:'checkout-static-extract'`；注入标记 = `registry-metadata` | ✅ |
| A7 | C6 4/4 面钉可执行性 | 只读 import `ci-mock-face.mjs` 的纯函数（`extractHeredocs`/`staticExportKeys`/`mockFaces`）+ 读 `.github/workflows/ci.yml`；**未调用会落盘的 `materializeCiMocks`** | 4 个 heredoc 目标全部命中；静态导出面 ≡ 契约 `requiredExports`：cordis `[Service]` / dsh-settings `[SettingsConflictError, SettingsProvider, default, redactSecrets]` / dsh-home-paths `[resolveDshHome]` / dsh-tools `[defineTool]`；且逐面 `expected ⊆ fixture 现行宿主真实面` = true（4/4） | ✅ 可执行断言（非仅改标签） |
| A8 | C3 F5c 强化是否真能捕获失配 | 从 smoke.mjs 源码**提取** `COMMON_WORDS`（解析得 **49 词**，与宣称一致）并复现分级/过滤/命中逻辑 | 6/6 命中，非通用候选为内容专用：face1 `Service`、face2 `dsh-novel-writing`+`window.__ModuleLoader__.load`、face3 `[data-phase]`、face4 `新布局`、face5 `小说写作工作流`、face6 `peerDependencies`/`schemastery`；最好层级实测 **T3/T1/T1/T1/T1/T3** | ⚠️ 6/6 一致；**tier 枚举一处偏差 → FIND-1** |
| A9 | 契约 48 项计数是否被本任务扰动 | 只读 import `lib/host-contract.mjs` | `items = 48`、`faces = 6`、`kindEnum = 30`（**与 COMPAT-003 一致，未变**）；`hostSurface` 新增 4 个顶层字段（`ciMock` 数组=4 / `versionExceptions` / `versionFactOrigins` / `_schema`） | ✅ 无计数漂移 |
| A10 | 安全边界（fixtures 无敏感数据） | node 只读复算 `[A-Za-z]:\\|\/Users\/|\/home\/|AppData|npm-cache|Bearer|password|api[_-]?key` 于三份原始 JSON | 三份均 **null（零命中）**；`source` 字段如实区分「npm pack tarball 解包 / host-checkout 闭包」 | ✅ |
| A11 | 抽核 hallucination（schemastery `classCount=0` 是否漏报） | 宿主 `schemastery/lib/index.mjs` | L596 `export { Schema as default };`，`Schema` 声明在 **L24 `const Schema = function(options) {`** ⇒ default 实为**函数非类**，`classCount=0` **正确**（非漏提取） | ✅ |

> A2/A3/A8 为本人独立重实现的对照实验（复制 extract.mjs 的 classBody/mask/methodsOf 三层逻辑到一次性 node 进程内执行，不改动仓库任何文件）；A7 只 import 纯函数，未触发 `main()`、未落盘。

---

## 4. 五维度 + AI 专项逐项结论

### 4.1 正确性 —— 通过（附 FIND-1/3/4）

- **C1 解析逻辑**：三层约束（`depth===1` 顶层 + 17 词黑名单 + 点号前缀排除）在宿主上复算成立；`SettingsConflictError` 由 `['constructor','super']` 修正为 `['constructor']`（+1/−1 干净收敛）；`SettingsProvider` 20 名与宿主类体逐名一致 ⇒ **未引入漏检**（唯一新增漏检面 = 关键字命名方法，已披露，见 FIND-3）。黑名单 17 词覆盖全部可作方法名的 JS 关键字/保留字形态（`delete/await/new/typeof/void/yield/do/else/try/switch/catch/while/for/if/return/throw/super`），无遗漏项可致关键字回流。
- **C2 去重**：`declCache`（按导出前符号名）+ 声明对象同一性归并 → 主名优先真实类名、别名入 `classAliases`，可还原；`classCount` 与宿主导出面一致（A4）。同实现多导出名不重复计数，`default`-only 情形有文档口径（`_schema`）。
- **C5 断言正确性**：非例外包逐版本逐包比对 + 例外表双向（存在性 + 必须确实不等）——两个方向都可被漂移触发（构造分析：改 fixture `hostVersion` → 红；把 `cordis` 从例外表删掉 → 该包 `4.0.2 ≠ 0.1.5-rc.2` → 红；把非例外包塞进例外表 → 其 version 恰等 hostVersion → `staleExceptions` 非空 → 红）。
- **C3/C4 断言是否真能捕获失配**：C3 候选剥离引号 + 分级 + 通用词表（49 词）后，6/6 面均以**内容专用**候选命中（A8）；把某项 `file` 改成同面另一文件后，通用词不再兜底（原 4/6 恒真的路径已封堵）。C4 把 `origin` 纳入机检且 `expectedOrigin` 由 `versionFactOrigins × extraction.layout` 推导（未知 layout → `null` → 必红）：篡改 fixture 任一 `origin` 值即红（构造分析 + Developer 红绿演练一致）。**限定**：C4 只能证明「fixture 自述来源 ≡ 契约声明类别」，不能独立复算注入的注册表值本身（见 FIND-5）。
- **契约 48 项**：`items/faces/kindEnum` 均未变（A9）⇒ 本任务未新增/修改宿主耦合字面量，未触发 P-10 的 items[] 变更义务（`lib/client.js`、`lib/index.js` 零改动，见 §5）。

### 4.2 安全性 —— 通过（零发现）

- fixtures 敏感形态零命中（A10）；`source` 如实标注提取通道，产物仅含包名/版本/导出名/继承名/方法名/布尔标记（不含路径、token、用户数据）。
- 写面收敛：`extract.mjs` 仅写 `--out`（默认 `--dump` 不写盘）；`ci-mock-face.mjs` 仅写调用方给出的临时目录（smoke 用 `mkdtemp`），且新增 `abs === base || abs.startsWith(base + sep)` 包含性检查（`ci-mock-face.mjs:105`）——`../` 越界写被拦。
- 本任务 diff 无网络/无宿主写入：8 文件全在仓库内（`git show --stat` 复核），未触碰 `node_modules` 或宿主目录。

### 4.3 可维护性 —— 通过（附 FIND-2）

- `extract.mjs` 头部新增字段语义（L56-62）+ 复现命令 D 组（L39-54）+ 「已知边界」如实披露黑名单过筛代价（L167-170）⇒ 能力边界自述可消费。
- **C6 采用「扩面」而非「登记」路径**：契约 `ciMock` 由单对象扩为数组 + `mockFaces()` 作为**单一事实源**，未遗留「仅登记、无机检」的分支 ⇒ 无需再在契约显式声明登记项（C6 原始诉求已闭环）。
- N3：`_schema` 7 条字段口径（含 `classAliases` 主名/别名与消费方读法）落契约，可被 COMPAT-004 直接消费。
- 唯一瑕疵 = 契约头注释 typo（FIND-2）。

### 4.4 性能 —— 通过（零发现）

无运行时面（fixtures/契约/测试均为离线静态物）。smoke 净 +1 项 = 版本一致性断言（3 版本 × 6/6/8 包的一次遍历，O(项数)）；C3 强化仅增加字符串集合运算；C6 由 1 面循环至 4 面（每面一次 heredoc 静态解析 + 一次动态 import，与 mock 数量线性）。无 N+1/O(n²) 级退化。

### 4.5 测试覆盖 —— 通过（附 FIND-1/5）

- 新增/强化断言强度：① **C3**：非通用候选命中（不再恒真）；② **C5**：版本一致性 + 例外表双向；③ **C7**：失败路径结构化（`ci-mock-face.mjs` fixture 缺包/`exports` 非数组 → `exit 2`（L140-143）；smoke ⑧ heredoc 缺失 → `staticBad` 记录后继续，不再 TypeError 中断）；④ **N2**：数组分支补自有附加属性 + `Array.prototype` 原型校验，与对象分支对齐（smoke L1987-1995）。
- **无新真空断言**（构造分析）：每条新断言两侧均有独立数据源——C5 两侧 = fixture `packages[*].version` × `hostVersion`/例外表；C4 两侧 = fixture `markers[*].origin` × 契约 `versionFactOrigins` + `extraction.layout`；C6 三方 = ci.yml heredoc 源码 / 契约 requiredExports / fixture 宿主真实面。
- 演练活性：Developer 自报「改 fixture 版本号 / origin / layout / 契约例外面 → 变红 → 复原全绿（字节一致）」；我在 A5/A6/A8 的静态复算与该结论自洽（三处漂移点在复算中均可分辨）。
- 计数：本任务断言净 +1（230 → 231），无断言被静默删除（diff 中 ⑦⑧ 由单面改 4 面循环、⑫ 整体替换，均为强化而非削弱）。

### 4.6 AI 代码专项 5 项

| 专项 | 结论 | 依据 |
|---|---|---|
| mock 残留 | **无** | fixtures 不被产品路径 import（消费方仅 `test/smoke.mjs` 与 CI sanity 步骤）；`lib/` 唯一改动 = 纯数据契约；diff 无替身注入逻辑 |
| 硬编码 | **无劣性** | `COMMON_WORDS`(49)/`GOLDEN`/`LAYOUT_ORIGIN` 均为断言期望常量（测试侧本质要求）；期望面均从契约读取（`requiredExports/versionFacts/versionExceptions/versionFactOrigins/ciMock`），无第二份事实源 |
| 幻觉条目 | **无** | 6 项抽核全部命中真实事实：dsh-settings 宿主 L610 导出面 ≡ fixture 0.1.5 `exports`（4 键）；`SettingsProvider` 20 名逐名一致；`SettingsConflictError=['constructor']`；cordis 三处行号 L17/L1398/L1564 精确；schemastery `classCount=0` 正确（default 实为 `const Schema = function`）；0.1.1-rc.2 `exports` 含 `settingsNamespace/deepEqualJson/installSettingsSection` 与「0.1.x 旧表面」断点叙事自洽 |
| 未实现 TODO | **无** | 8 文件 diff 无 `TODO/FIXME/XXX`；`methodNamesTruncated` 截断披露机制保留（未因重建而丢失） |
| 过度实现 | **无** | extract.mjs +131 行全部服务于 C1/C2/N1/字段语义；`ciMock` 数组化复用了既有动态 import 能力；无预留空壳、无越界实现（相邻任务 COMPAT-004/005 的内容未被提前实现） |

---

## 5. 设计一致性与前轮承接

### 5.1 前轮发现（REVIEW-COMPAT-003-R1）逐条比对

| 前轮 | 要求 | 本轮落地实测 | 裁决 |
|---|---|---|---|
| C1（P1） | 黑名单 + 顶层 depth 约束 + 排除 `this.`，并重建 fixtures | 三层约束齐备（`extract.mjs` L124-185）；三份 fixtures 重建，关键字命中 0/0/0（A1）；宿主逐名对照一致（A2） | ✅ **已修复** |
| C2（P2） | decl 缓存去重 + 重建 + `_schema` 说明 | `declCache` + 声明对象归并（L237-241 / L343-364）；`classCount` 16/16/26 → 12/12/22，`classAliases` 4 项/份（A4） | ✅ **已修复** |
| C3（P3） | 候选剥离引号 + 分级 + 通用词表 + 「至少一个非通用候选」 | 全部落地（smoke ⑫）；独立复现 6/6 非通用命中（A8） | ✅ **已落地**（文档 tier 枚举偏差 → FIND-1） |
| C4（P3） | 措辞订正 **或** origin 纳机检（二选一） | **选后者的完整实现**：`versionFactOrigins` + `LAYOUT_ORIGIN` 派生期望 + 逐版本校验（smoke ④⑤⑥）；标签措辞同步改为「来源：注册表元数据注入 / 静态提取实测」 | ✅ **已落地**（限定见 FIND-5） |
| C5（P3） | 版本一致性断言 + 契约例外表（建议双向） | 断言 + `versionExceptions` + `staleExceptions` 反向校验齐备；实测违例 0、stale 0（A5） | ✅ **已落地（超出建议：双向）** |
| C6（P3） | 扩数组循环校验 **或** 登记为 COMPAT-004 范围 | 选**扩面**：`ciMock` 4 项 + `mockFaces()` 单一事实源 + CLI/smoke 双向循环；独立静态复核 4/4 ≡ 契约 ⊆ 宿主真实面（A7） | ✅ **已落地** |
| C7（P3） | ①fixture 缺包判空结构化 ②`mockSource` 判空 ③路径包含性 | ①`ci-mock-face.mjs` L140-143 `exit 2` ②smoke ⑧ `mockSource === undefined` → 结构化 FAIL 不中断 ③L105 `base + sep` 包含性检查 | ✅ **已落地（3/3）** |
| N1 | origin 按 packed/checkout 分流 | `staticExtractOrigin` 三元分流 + `extraction.layout` 落盘；三份 fixtures 实测分流正确（A6） | ✅ **已落地** |
| N2 | 数组分支补自有属性 + 原型校验 | smoke L1987-1995：跳过 `length`/索引后逐描述符校验 + `Object.getPrototypeOf(v) !== Array.prototype` 判定 | ✅ **已落地** |
| N3 | `classes` 主名/别名语义文档化 | 契约 `_schema` 7 条（含 `classAliases` 消费方读法） | ✅ **已落地** |

### 5.2 DEC-025 ADR 与项目原则

| 要求 | 实测 | 裁决 |
|---|---|---|
| 决策②① fixtures 快照地基（校准基线） | 三份 fixtures 重建且数据质量修复完成，方法面可作 COMPAT-004 校准基线 | ✅ 一致（基线可用；字面量过筛风险见 FIND-3） |
| 决策① 声明式契约 | `items[]` 48 项未变，`hostSurface` 增补 4 字段（C4/C5/C6/N3 机检所需） | ✅ 一致 |
| 决策②②/②③（CI 探测轨、加载期警告） | 本 commit 未涉及——无越界实现 | ✅ 范围正确 |
| **P-10 宿主耦合入契约** | 本任务**未新增宿主耦合字面量**（`lib/client.js`/`lib/index.js` 零改动）⇒ items[] 无需变更；但契约 `hostSurface` 与其对账断言的「声明—机检」配对同步强化 | ✅ 一致 |
| P-01/P-04/P-09 | 证据链完整（本报告的 A1~A11 为独立复算而非采纳自述）；配套验证 `smoke`/`node --check`/`validate-preset` 齐备 | ✅ 一致 |

---

## 6. 发现列表（P0~P3）

> **P0 = 0。** 以下 6 条全部为 P3（非阻断），无 P1/P2。

| ID | 级别 | 位置 | 问题（事实依据） | 建议 |
|---|---|---|---|---|
| **FIND-1** | P3（文档事实性） | `CHANGELOG.md`（COMPAT-011 条目下 C3 子条） | **tier 枚举与实际机检不符**：CHANGELOG 称锚点「分别落在 T3/T1/T1/T3/T1/T3」，我按 smoke 提交态逻辑独立复现得 **T3/T1/T1/T1/T1/T3**——face 4（item 4.1 / `install.ps1`）的最优层级实为 **T1**（中文名 `新布局` 命中，非 T3 裸词）。证据：`COMMON_WORDS` 解析=49 词；face4 cands = `[1:新布局, 1:安装通道分流特征检测, 3:profiles, 3:Profile]`，命中 `新布局` ⇒ `min(tier)=1` | 订正 CHANGELOG 该处为 `T3/T1/T1/T1/T1/T3`（或直接粘贴 smoke 实测输出串，避免人工转写） |
| **FIND-2** | P3（文档瑕疵） | `lib/host-contract.mjs:46` | 头注释括号列表出现多余斜杠：`（requiredExports/eliminatedExports/versionFacts/ciMock/）`；且该列表未含本任务新增的 `versionExceptions`/`versionFactOrigins`/`_schema`（下一行文字有述，但括号内易被读作完整清单） | 删除多余 `/`，并把 3 个新字段纳入括号列表 |
| **FIND-3** | P3（承继风险 / COMPAT-004 遗留） | `extract.mjs` L167-170（披露）+ L124-127（黑名单）；数据面影响 cordis `methodNames` | **黑名单过筛真实方法，属「宁缺勿污染」硬口径的已知代价**：宿主实有 `DisposableList.delete`（L17）、`RegistryService.delete`（L1564）、`Fiber.await`（L1398，`async await()`），三者被滤除（A3 已独立核实行号与滤除行为）。披露属实且位置正确。**风险方向需注意**：`methodNames` 的消费语义是「探测我方调用的方法是否仍存在」，被滤除的**真实**方法会产生**误报缺失**（与 C1 消除的「伪名误报」是相反方向的误差）——COMPAT-004 若直接以 `methodNames` 作存在性判据，可能给出假阴性 | ①短期（低成本）：重建时同时落 `methodNamesExcludedByKeyword`（顶层名 + 行号 + 原因），消费方可区分「确实不存在」与「被过筛」；②中期：以**语法位置判别**替代关键字表（类体顶层 `ident(` 且前无 `.`/无赋值或控制流形态），或复用现成 AST 解析器（acorn/meriyah，P-08）做提取；③COMPAT-004 接线前明确判据优先级（`exports`/AST > `methodNames`） |
| **FIND-4** | P3（残余缝，未触发） | `extract.mjs` L98-121（`classBody`）+ L134-161（`maskToClassBodyTopLevel`） | 两函数仅处理注释与 `' " \`` 字符串，**不识别正则字面量、不处理嵌套模板串**：类体/方法体内出现含 `{`/`}` 的正则（如 `/^\s*\{/`）或嵌套反引号时，花括号配平可能失真 → 后续顶层成员被误掩（漏检）或语句行首被误捕（回流污染）。**当前未触发**：三份 fixtures 关键字命中 0，`SettingsProvider` 20 名与宿主一致（A1/A2） | 在 `extract.mjs` 头部「已知边界」补一行如实披露（与 L167-170 同层），或在 COMPAT-004 消费前评估是否引入 AST 提取 |
| **FIND-5** | P3（机检边界，信息性） | `test/smoke.mjs` ④⑤⑥ / `lib/host-contract.mjs` `versionFactOrigins` | C4 的 origin 机检能证明「fixture 自述来源 ≡ 契约声明类别」，但**不能独立复算注册表事实本身**（`remoteNamespaceServicePackages` 的 `true/false` 仍由命令行注入）——离线环境下无更强手段，属固有限制 | 无需改动（当前 `probe` + `origin` + 断言标签三处口径一致，已达诚实披露标准）；COMPAT-004 如需独立证据，可用 `npm view` 只读元数据在 CI 侧另行核对 |
| **FIND-6** | P3（信息性，非本任务引入） | `extract.mjs` L219 / L365-370 | `declOf` 对 `const X = function(...) {}` 归 `kind:'const'`（非 `function`）：宿主 `schemastery` 的 `default`（L24 `const Schema = function`）因此不计入 `functions` 而按常量归类。当前 `functions/constants` 字段无消费者，不影响任何断言 | 备记（若 COMPAT-004 消费 `functions/constants`，需先统一「函数表达式 vs 常量」口径） |

**非阻断备注（信息性，非缺陷）**

- C5 的例外表反向校验只在**现行 fixture**（0.1.5-rc.2）上取实据——这是正确的（仅现行 fixture 含 `cordis`/`schemastery`）；历史两份 fixture 的 C5 覆盖为 6 包/份，属预期而非缺口。
- `ci.yml` 中 `schemastery` 无 mock（CI 装真包），`ciMockNote` 已如实说明 ⇒ C6 的「4/4」口径与 CI 实状一致。

---

## 7. 覆盖披露（未抽查项 / 审查边界 —— 如实标注）

1. **运行面未由我复跑**：`node test/smoke.mjs`、`ci-mock-face.mjs` CLI、`validate-preset` 由 Coordinator/Developer 双证（231/0、exit 0、PASSED）；我的独立证据为**静态复算 + 纯函数 import 复核**（A1~A11）。我未运行 CLI/CI 步骤，以避免任何落盘副作用（`materializeCiMocks` 会写临时目录）。
2. **未执行 `extract.mjs`**（按其只读纪律与派发红线：该脚本读宿主文件并写 `--out`；本报告的全部解析结论来自独立重实现，非运行原脚本）。
3. **tarball 未逐字节比对**（承继 Developer 如实标注）：0.1.1-rc.2 / 0.1.2-rc.1 两份 fixtures 未与 `npm pack` tarball 逐字节核对；其可信度建立在 `source` 字段自述 + smoke 结构断言 + 我抽核的版本/导出面一致性（A4/A10/A11）之上。
4. **methodNames 未逐类对照**：我抽核了 `dsh-settings` 2 类（宿主一手逐名对照）+ `cordis` 4 类（`DisposableList`/`RegistryService`/`Fiber`/`Service`，用于黑名单代价核验）；`cordis` 其余类、`dsh-tools`（6 类）、`dsh-api-gateway`（2 类）、`dsh-client-modules`（1 类）、`dsh-client-connection`（1 类）的 `methodNames` 未逐条与宿主对照。
5. **本机 `node_modules` 为断链软链**（承继 Developer 标注）：本报告全部宿主检查使用 **npx 闭包** `…\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai`（`dsh-settings@0.1.5-rc.2` / `cordis@4.0.2` / `schemastery@3.18.2`），与 fixture 自述通道一致；仓库内 `node_modules` 未参与核验。
6. **流程偏差如实披露**：按 Coordinator 派发指令「窄化执行（固定三步：读角色定义 + 审查对象 → 写报告 → 返回），不加载其他 SKILL」，本轮**未加载 `skills/code-review/SKILL.md`**；其检查项已由派发指令等价枚举（5 维度 + AI 5 项 + P0~P3 + 三选一终态 + 硬门槛），报告结构与 `docs/review/COMPAT-003-R1.md` 前例对齐。若治理要求逐字执行该 SKILL 步骤，请在复审时明确。
7. 未做动态注入演练的**独立**复跑（Developer 已演练红→绿并留档）；我对演练结论的核验方式是静态构造分析（A5/A6/A8）。

---

## 8. 结论与建议动作

- **裁决**：**APPROVED**（P0 = 0，`unresolved_blockers = 0`）。本任务可作为 fixtures 数据质量的合格交付；无返工要求。
- **建议（均非阻断，可随下个任务一并处理）**：FIND-1/2 为文档订正（建议在 COMPAT-004 任务提交时顺手带上，避免证据文本与实状偏离）；FIND-3/4 建议在 COMPAT-004 消费 fixtures 前各花 ≤1 步收口（补 `methodNamesExcludedByKeyword` 披露 / 补一行能力边界说明）。
- **放行后置条件（供 Coordinator 留痕）**：若后续任何任务重跑 `extract.mjs` 重建 fixtures，须同时复核 FIND-3 的三个过筛点是否仍被滤除，并同步更新 `docs/review` 记录。

---

**审查人**：Code Reviewer Agent（只读；本报告为本次审查唯一写入物）
**证据原始命令**：见 §3 A1~A11 各行「方法」列（node 只读复算 / grep / read；均可原样重跑）
