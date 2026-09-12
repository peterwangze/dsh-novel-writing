# COMPAT-003 代码审查报告（R1）

| 项 | 值 |
|---|---|
| 任务 | COMPAT-003（R1）— fixtures 快照 + 离线对账 + F1~F9 承接 后置代码审查 |
| 审查对象 | **工作区终态 = HEAD `4cf1c6a`**（派发上下文写 `bf29f80`；`git cat-file -t bf29f80` = commit 存在，但与 HEAD 同 message/同 diffstat 形态——按「工作区 = commit 后状态」以工作区为审查对象，边界用 `git diff e7afa80 4cf1c6a` 取得：**9 文件 +2946/−31**，与派发表 9 文件/+2945−30 一致） |
| 审查轮次 | **R1**（首轮——无前轮 COMPAT-003 findings 需比对；承接前轮 = REVIEW-COMPAT-002-R1 F1~F9 与 REVIEW-COMPAT-010-R1 F1 的落地核验） |
| 审查者 | Code Reviewer Agent（角色定义：`<plugin_root>/agents/code-reviewer.md`） |
| 审查依据 | REVIEW-COMPAT-002-R1 F1~F9（原文已读全文）；REVIEW-COMPAT-010-R1 F1（面钉断言）；DEC-025 ADR 决策①②（decision-log.md L34 实读）；BC-05；项目原则 P-01/P-04/P-09/P-10/C-02/C-04 |
| 执行方式 | 只读审查（read/grep/glob + 3 类只读 git 命令定边界）+ 唯一写入本报告；**未执行任何被测代码**（未跑 smoke / node --check / 未执行 extract.mjs——派发红线） |
| 日期 | 未采集（角色定义未授权 Bash 取系统时间；不用推测值代替事实） |

---

## 1. 终态结论

> ## APPROVED_WITH_NOTES（unresolved_blockers = 0）
>
> **P0 阻塞 = 0**；硬门槛 5/5 通过；5 维度 + AI 专项 5 项全覆盖。
> 附 **P1 × 1 / P2 × 1 / P3 × 5 + 备注 × 3**，全部非阻断。
> **F1~F9 承接核验：9/9 落地**（逐条见 §5.2），契约 48 项四处计数同步、F1 item 3.8 与源码一致、F2/F3/F4/F5/F6/F7/F8/F9 均有可执行断言且在册。
> **需跟进（不阻断本 commit，但 MUST 在 COMPAT-004 消费 fixtures 前处理）**：**C1（P1）**——三份 fixtures 的 `methodNames` 混入语句/关键字（`super`/`if`/`for`/`return`），与字段语义「类方法名」不符；candidate 已在 §6 用宿主真实包一手证据证实。

---

## 2. 硬门槛裁决表

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0** | ✅ 通过 |
| 5 维度全覆盖 | = 100% | 正确性/安全性/可维护性/性能/测试覆盖 —— 5/5 有结论（§3） | ✅ 通过 |
| 每条发现标注级别 | = 100% | 7 条发现（C1~C7）+ 3 条备注（N1~N3），全部 P1~P3 标签 | ✅ 通过 |
| 设计一致性（DEC-025 决策①②） | 已完成 | 已比对 decision-log.md L34（§5.1） | ✅ 通过（决策②①「mock 从快照生成」为部分落地，见 C6/N3） |
| AI 代码专项 5 项 | 全部完成 | mock 残留 / 硬编码 / 幻觉条目 / 未实现 TODO / 过度实现 —— 5/5 有结论（§3.6） | ✅ 通过 |

---

## 3. 五维度 + AI 专项逐项结论

### 3.1 正确性 —— 通过（附 C1/C2/C4）

**（a）fixtures `source` 标注诚实性（提取 vs 构造）——✅ 诚实，且 0.1.5-rc.2 已一手证实**
- 三份头部均为真实包提取口径：`0.1.1-rc.2.json` L5「npm pack 真实 tarball（registry 可达…未 install、未执行宿主代码）」、`0.1.2-rc.1.json` L5 同口径、`0.1.5-rc.2.json` L5「host-checkout：npx 缓存闭包…**@deepseek-ai/dsh-* 子包实测版本 0.1.5-rc.2**；cordis 4.0.2 / schemastery 3.18.2 属独立版本族」——**三份无一为「证据构造」降级路径**，且把版本命名分歧写在头部而非藏在文件名里。
- 独立证实（§6-A）：实读 `…\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai\dsh-settings\package.json` L4 = `0.1.5-rc.2` ⇒ 「CLI dsh 0.1.5-rc.1 但闭包子包 0.1.5-rc.2」的关键事实①成立，fixture 按实测命名是诚实选择。
- `extraction.method='static-parse（零动态 import、零执行宿主代码）'` + `concerns` + `methodCapPerClass` + `packagesMissing` 均在 fixture 内机读自述（`0.1.5-rc.2.json` L8-29）。

**（b）契约 48 项计数「四处同步」——✅ 四处齐 + CHANGELOG 同步**
| 计数面 | 位置 | 实测 |
|---|---|---|
| 契约头 | `lib/host-contract.mjs` L7 | 「六面 48 项 = 11+13+**8**+6+5+5」+ L8 注明「§3 底稿 47 项 + F1 补录 1 项（非 §3 溯源）」✅ |
| 面内注释 | 同文件 L104 | 「面 3 — 宿主 DOM/前端约定面（**8 项**）」、面 1 11 项 L76、面 2 13 项 L89、面 4 6 项 L114、面 5 5 项 L122、面 6 5 项 L129 ✅ |
| items 数据 | 同文件 L77-134 | 逐项计数：面1 = 1.1-1.11 = 11；面2 = 2.1-2.13 = 13；面3 = 3.1-3.8 = **8**；面4 = 4.1-4.6 = 6；面5 = 5.1-5.5 = 5；面6 = 6.1-6.5 = 5 ⇒ **48** ✅ |
| smoke 断言① | `test/smoke.mjs` L1798-1800 | `items.length === 48 && faceCount[f] === [11,13,8,6,5,5][f-1]` ✅ |
| CHANGELOG | `CHANGELOG.md` L8 | 「47→48、面 3 分布 7→8」✅ |
- 全仓 grep `47 项|47项|恰 47|=== 47` 仅命中**历史面**（§3 底稿 `docs/research/COMPAT-001-host-compat-analysis.md`、CHANGELOG 旧条目 L9、REVIEW-COMPAT-002-R1）——历史引用不修改是正确的 C-04 行为，非未同步。

**（c）F1 item 3.8 ↔ `lib/client.js` L2394-2404 ——✅ 逐要素命中**
实读 L2394-2405：`findSidebarEl()` = 向上找 `aside`/`nav`（L2399）+ `className` 正则 `/SidebarRoot|sidebar/i`（L2400）+ `document.querySelector('aside, nav, [class*="SidebarRoot"], [class*="sidebar"]')` 兜底（L2403，`?? null` + try/catch）。契约 3.8 的 `symbol`（L112）三要素逐字对应，`file/line='lib/client.js'/'L2394-2404'` 精确；`necessity='required'`、`incident='RISK-003'`、note 声明「§3 底稿未列 → 非 §3 溯源」与契约头 L8 自洽 ✅。note 内降级行号（L2755-2762 / L2770-2771）未独立读取 → 未抽查（§7-8）。

**（d）F2/F9 落点 ——✅ 准确**
- 实读 `lib/client.js` L4119 / L4254 两处含 `var(--dsw-shadow-lv2,0 8px 24px …)`，L4254 另含 `var(--dsw-alias-bg-elevated,…)` ⇒ 契约 3.4 新 line `'L680-693 / L4119 / L4254'`（L108）与 note「TK 表仅含 11 个去重 alias 名，第 12 个 bg-elevated 出自 L4254；shadow 出自 L4119/L4254」**与源码一致** ✅。
- `regionLiterals.cssTokens` 13 项（L153-167）= alias 12 + `--dsw-shadow-lv2` 1，与 smoke ⑩ 的 13/13 双向对账一致（L1770-1774）✅。
- F9 4.5/5.5 的合并来源注记（L119 / L127）为文字澄清，与 §3 原分段口径自洽 ✅。

**（e）版本差异断言 vs fixture 数据 ——✅ 三标记 × 三版本逐格一致**
| 标记 | 0.1.1-rc.2 | 0.1.2-rc.1 | 0.1.5-rc.2 | 契约 golden（L198-202） |
|---|---|---|---|---|
| `settingsNamespaceExported` | true（fixture L582） | false（L658） | false（L907） | true/false/false ✅ |
| `connectionApiDomainField` | true（L587） | false（L663） | false（L912） | true/false/false ✅ |
| `remoteNamespaceServicePackages` | false（L592） | true（L668） | true（L917） | false/true/true ✅ |
- 第三项为**命令行注入的注册表事实**（extract.mjs L34-36 / L209-212 / L299-301，`origin:'registry-metadata'`）而非提取 ⇒ 断言为「fixture ≡ 契约」同源自洽，标签「三版本实测」对该项不成立 → **C4**。
- 0.1.5-rc.2 的 `connectionApiDomainField=false` 已一手证实（§6-B）：闭包内 `dsh-client-connection` 搜 `this.api =` **零命中**。

**（f）数据质量缺陷（新发现）**：fixtures 的 `methodNames` 混入语句/关键字 → **C1（P1）**；`classAliases`/`classCount` 未去重 → **C2（P2）**。

### 3.2 安全性 —— 通过（零发现）

- **fixtures 内容**：仅包名/版本/导出名/类名/继承名/方法名/布尔标记 + `source`·`probe` 说明串。独立 grep（`AppData|npm-cache|/Users/|/home/|Bearer|password|api[_-]?key|token|C:\\`）三份 fixture **零命中**（与 smoke ⑨ 的 BC-05 机检 L1848-1851 同结论，双证一致）。抽读三份头部/多段内容未见路径、凭据、用户数据。
- **extract.mjs 侧信道**：`import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'` + `node:path`（L41-42）——**无网络、无 child_process、无动态 import、无 eval**；写操作仅 `--out` 指定文件（L338-340）；`--dump` 路径零写入（L329-337）。「npm pack / tar」仅存在于文档注释的复现步骤，由人工执行 ⇒ 静态解析、零执行宿主代码，与自述一致 ✅。
- **ci-mock-face.mjs 侧信道**：CLI 路径（L109-129）纯静态（读 ci.yml/fixture/契约）；写操作仅在调用方给出的 `tmpDir` 下（L91-97），smoke 传入的是 `mkdtempSync(tmpdir(),'novel-smoke-')`（smoke L42），并在收尾 `rmSync(root,{recursive:true,force:true})`（L1947）⇒ 无仓库污染、无宿主写入 ✅。`dynamicMockExportKeys` 动态 import 的是 **ci.yml 内联 mock**（仓库受控、非宿主包），符合 F1 面钉设计。
- **路径收敛**：`materials` 落盘按 ci.yml heredoc 目标名 join（L83-97），目标已被 `startsWith('node_modules/@deepseek-ai/')` 过滤（L92）；无 `resolve` 包含性检查 → **C7**（P3，输入为仓库受控文件）。
- **OWASP 关键项**：新增面为离线数据 + 只读断言，无输入通道、无注入面、无凭据；不适用且无新增攻击面。

### 3.3 可维护性 —— 通过（附 C3/C4/C5/C6/N1）

- **可复现性**：extract.mjs 头部给出**三种用法 + 完整复现命令**（L7-36：`npm view` 可达性 → `npm pack --pack-destination` → `tar -xzf` → `--packed/--checkout` 两种布局 + `--marker-*` 注入说明 + `--out`）；`resolvePackageRoot`（L220-228）兼容 npm/pnpm 闭包、npx 闭包、tarball `package/` 三种真实布局 ⇒ 「一条命令重建 fixtures」成立（B/C 两组命令可直接复制）。⚠️ 唯一未闭环的是「三份 fixture 各自的 `--source` 文案与两台命令参数未逐字留档」（复现命令是模板形式）——非阻断。
- **F8 提取口径入契约自述 ✅**：`regionLiterals` 注释 L137-143 五条口径（单引号字面量 / 仅 `querySelector(All)` 首参 / `.nv-` 排除 / 令牌族 alias+shadow / 先剥注释）+ L10-11「新增宿主耦合字面量 MUST 同步契约并补对账断言」纪律 + L13-17 纯数据守卫「能拦/不能拦」如实披露 ⇒ 后续任务不必回读分析文档即可消费（正是 F8 的要求）。与新增项目原则 **P-10**（宿主耦合入契约）方向一致 ✅。
- **ci-mock-face.mjs 与 ci.yml 单源关系 ✅**：mock 面「期望值」单一事实源 = 契约 `hostSurface.ciMock` + `requiredExports`（`mockFaceContext()` L66-77 从契约读取），ci.yml 只提供**被检对象**（heredoc 源码）；smoke 与 CI sanity 共用同一模块 ⇒ 无第二份期望面 ✅。新增 CI 步骤（ci.yml L40-43）位于 sanity job、仅需仓库文件（不需要 `node_modules`）⇒ 与 job 的离线性质兼容 ✅。
- **结构/命名**：契约新增字段 `revisions/kindEnum/hostSurface` 语义清晰（L43-48 成文）；`task` 仍为 'COMPAT-002' 而用 `revisions[]` 记 COMPAT-003 修订——单一文件承载连续修订史，避免了契约分裂，判断为正确取舍 ✅。C-03（host-contract 纯数据/ci-mock-face 单一职责）/C-04（无冗余改动）/C-05（一个 commit 一个任务、产品代码 `lib/client.js` 零改动）均合规。
- **缺口**：① fixtures 数据质量（C1/C2）当前无任何断言看护；② `classCount/classAliases/starExports/constants/functions/clientExports` 等预留字段无消费者（知悉项，非缺陷）；③ mock 面钉覆盖 1/4（C6）；④ `ciMock` 为单对象，扩展到其余 3 个 mock 需先改结构（C6）。

### 3.4 性能 —— 通过（零发现）

- 新增 16 项 check 的成本：3 次 `JSON.parse`（合计 2192 行 JSON ≈ 120KB）+ 1 次 ci.yml 读 + 6 处锚点文件读（`lineCount` Map 缓存去重，L1868-1872）+ 1 次 `mkdtemp` 落 5 个 mock 文件 + 1 次动态 import（本进程内小模块）+ 48 项契约的 O(n) 遍历 ×4 + 原有 `clientSrc` 正则扫描。
- 正则均为线性字符类（`/ctx\.on\('([^']+)'/`、`/--dsw-(?:alias|shadow)-[a-z0-9-]*[a-z0-9]/`、三形态行号白名单）——**无回溯风险、无 O(n²)**；无网络 I/O、无循环内读盘。静态判定量级为数十毫秒，远低于 2s 预算（smoke 230/0 双证无超时报告可佐证）。**未发现性能问题**（未计时——见 §7-9）。

### 3.5 测试覆盖 —— 通过（附 C3/C4/C5/C6/C7）

16 项新 check 强弱评估（③ = 三版本循环展开 3 项）：

| # | 行号 | 断言 | 强度 |
|---|---|---|---|
| ① | L1796-1801 | 三版本齐备 + `schemaVersion/task/hostVersion/source(≥30 字)` + 包键集合 = 契约 | 中（结构/溯源完整；`source` 诚实性不可机检——见 C5 建议） |
| ② | L1803-1810 | `requiredExports`（5 包）⊆ 现行 fixture 实测面 | 中强（单向：只防「真实面缺导出」，不防契约多列） |
| ③ | L1812-1821 | 现行 fixture 无 `settingsNamespace` + item 1.4 `eliminated` 在册 | 强（负向 + 契约口径双约束） |
| ④⑤⑥ | L1823-1829 | 三标记 × 三版本 golden | 强（逐版本相等）；但 1/3 标记为同源注入 → C4 |
| ⑦ | L1831-1837 | **F1 面钉**：mock 动态导出键集 ≡ 契约 `requiredExports[ciMock.pkg]` ≡ fixture 现行真实面（三方） | **强**（真双向：mock 增/删键、契约改期望、fixture 改面任一必红；构造分析见下） |
| ⑧ | L1839-1845 | mock 源码静态导出面 ≡ 动态 import 键集（两法互证） | 强（静态解析 + 运行时真值独立）；`mockSource===undefined` 未判空 → C7 |
| ⑨ | L1847-1851 | fixtures 安全边界（路径/缓存/凭据形态） | 中（正则黑名单，覆盖常见形态） |
| ⑩ | L1853-1865 | F5a：非 null `file` 全为仓库真实文件 + `line` ∈ 三形态白名单 | 强（对「file 指错文件 / line 变成自由文本」必红） |
| ⑪ | L1867-1879 | F5b：每项首个行号 ≤ 目标文件总行数（46 项） | 弱（仅上界；行号漂移仍可全绿，标签已如实说明） |
| ⑫ | L1881-1897 | F5c：每面 1 项 symbol 标识符候选在目标文件命中（6/6） | **弱 → 近恒真**（见 C3） |
| ⑬ | L1899-1906 | F6：necessity 九值 golden（39/1/1/1/2/1/1/1/1 = 48，9 键齐） | 强（分布 + 键数 + 总数三重；我手工重算一致 ✅） |
| ⑭ | L1908-1912 | F7a：kind ∈ 30 值 kindEnum 且无空置值 | 强（双向；我手工核对 48 项 kind 覆盖全部 30 值 ✅） |
| ⑮ | L1914-1919 | F7b：faces 恰 6、id=1..6、name/scope 非空 | 强（id 顺序由 `f.id===i+1` 强约束） |
| ⑯ | L1921-1943 | F4：递归 own-descriptor 纯数据（数据属性 + 类型白名单 + 纯对象原型） | 强（补 F4 缝：函数值/取值器/方法简写 → 非数据属性或 `typeof 'function'` 必红）；**残留缝**：数组元素仅遍历值，不检数组自有附加属性与 `Array.prototype` 原型替换（当前数据不触发，N2） |

**F1 面钉是否真钉（构造分析 + 一手事实）**：🧷 **是**。三方数据已一手核对——contract `requiredExports['@deepseek-ai/dsh-settings']` = `[SettingsConflictError, SettingsProvider, default, redactSecrets]`（L188）；ci.yml mock heredoc（L88-102）`export class SettingsConflictError` / `export class SettingsProvider` / `export default SettingsProvider` / `export function redactSecrets`；宿主真实导出行（实读 `dsh-settings@0.1.5-rc.2 lib/index.js` **L610**）`export { SettingsConflictError, SettingsProvider, SettingsProvider as default, redactSecrets }`。三处 4-key 集合相等 ✅。删除 mock 任一导出 → ⑦（动态键集）与 CI 步骤 `ci-mock-face.mjs`（静态面，L121）双红；mock 复活 `settingsNamespace` → ⑦ + CI 步骤红（COMPAT-010 修复的机器化防复发，正是 F1 的诉求）⇒ 断言活性成立。

**F3 双向是否真双向**：✅ 真双向。实读 `lib/client.js` 全文件 `ctx.on('` **恰 1 处**（L4378 `ctx.on('internal/service', …)`），smoke 提取正则 `ctx\.on\('([^']+)'` 提取面 = `{internal/service}`；断言含反向 ⊆（L1766-1767）⇒ 契约置空 / 删项 / 源码改名任一必红（COMPAT-002-R1 F3 的真空方向已闭合）。

**F4 递归守卫覆盖**：覆盖 method 简写/getter（非数据属性）/函数值（类型白名单外）/非纯原型；**未覆盖** class 声明、`export *`、非行首动态 import、导出后顶层副作用——契约头 L16-17 已**如实披露为「不能拦」** ✅（诚实披露达标，非缺陷）。

**F5 白名单/形态能否被漂移触发**：⑩ 能（我把 46 项非 null line 逐项对照三形态：`'L17'` / `'L18（调用点 L163、L1360）'` / `'原 L18 → 现 L33 字符串常量'` / `'L4403-4435'` / `'L727-729 等'` / `'L532 / … / L629'` 全部命中，无漏网、无错判）✅；⑪ 仅部分（上界）——见上表。

**新真空断言检查**：未发现。①③④⑤⑥⑦⑧⑬⑭⑮⑯ 在两侧都有独立数据源；⑨⑩⑪⑫ 为存在性/形态检查（⑫ 近恒真已列 C3）。计数自洽：新块 `check(` 计数 = **16**（①+②+③+③循环展开 3+⑦+⑧+⑨+⑩+⑪+⑫+⑬+⑭+⑮+⑯），214 + 16 = **230**，与双证一致 ✅。

### 3.6 AI 代码专项 5 项

| 专项 | 结论 | 依据 |
|---|---|---|
| mock 残留 | **无** | fixtures = 数据快照，**不被产品路径 import**（消费方仅 `test/smoke.mjs` L1787 与 CI sanity 步骤）；`lib/` 唯一改动是纯数据契约（`git diff` 确认 `lib/client.js` 零改动）；smoke 对 fixture 只做 JSON 解析 + 集合比较，不做替身注入 |
| 硬编码 | **无劣性** | smoke 内的 `GOLDEN_NEC`（L1900）、`LINE_SHAPES`（L1855-1859）、`SENSITIVE`（L1848）为**期望常量**（断言本质要求写在测试侧），且 `requiredExports/versionFacts/ciMock` 均从契约读取（L1833 / L1825-1826），无第二份事实源；`0.0.0-mock`/行号字符串均为数据 |
| 幻觉条目 | **无** | 6 项一手抽核全部命中真实包（§6）：dsh-settings 4-key 面 + 无 settingsNamespace（L610 实读）、schemastery `default`、dsh-home-paths `resolveDshHome`（L97）、dsh-tools `defineTool`（L3588）、`clientExports: []` 与 `window.__ModuleLoader__.load` 事实相符、`this.api =` 零命中。item 3.8 亦与 `client.js` L2394-2404 逐要素一致 |
| 未实现 TODO | **无** | 三份新文件 + smoke diff 无 `TODO/FIXME/XXX`；`METHOD_CAP_PER_CLASS` 截断有显式 `methodNamesTruncated` 披露机制（L55 / L132-133）；`starExports` 为数据字段非占位 |
| 过度实现 | **无（含 1 处知悉项）** | extract.mjs 341 行全部服务于「可复现 + 可审计」（三种布局兼容、标记探针留档、截断披露）；知悉项 = 预留字段（`classCount/classAliases/starExports/constants/functions/clientExports`）当前无消费者，其中 `classCount/classAliases` 语义当前不正确 → C2 |

---

## 4. 发现列表（P0~P3）

> **P0 阻塞 = 0。** 以下按「文件:行号 / 级别 / 问题 / 建议」给出；全部非阻断。

| ID | 级别 | 位置 | 问题（事实依据） | 建议 |
|---|---|---|---|---|
| **C1** | **P1** | `test/fixtures/host-surfaces/extract.mjs` L97-104（`methodsOf`）；数据面 `0.1.5-rc.2.json` L291-316 / L322-326 / L613-625、`0.1.1-rc.2.json` L49-58、`0.1.2-rc.1.json` 同类段 | **`methodNames` 混入语句与关键字，与「类方法名」语义不符（三份 fixtures 全量污染）**：`SettingsProvider`/`default` 的 24 项含 `super`/`if`/`return`/`for`；`SettingsConflictError` 仅 2 项 = `['constructor','super']`；`HostConnectionService` 含 `super`/`if`/`return`。根因 = `/(?:^|\n)[\t ]*(?:(?:static|async|get|set|\*)\s+)*IDENT\s*\(/` 把**类体内任意语句行首的调用/关键字**当方法名，无关键字黑名单、无类体顶层（depth==1）约束。**一手证实**（§6-C）：宿主 `dsh-settings@0.1.5-rc.2 lib/index.js` 类体内 L105 `super(…)`、L238 `super(ctx,"settings")`、L283/L296/L307/L334/L340/L435-465/L504-505/L522/L534 等 `if (`/`for (`/`return (` 语句行 ⇒ 对应 token 必为误捕。影响：fixture 自述 `concerns` 含 `classMethodNames`、CHANGELOG 宣称「类方法名」；fixtures 将作为 COMPAT-004/005 探测与诊断的校准基线（DEC-025 决策②①），方法面判据被污染，`methodCount` 虚高（24 vs 实约 20） | ① `methodsOf` 加关键字黑名单（`if/for/while/do/switch/catch/return/throw/super/typeof/await/yield/new/delete/void/else/try`）+ 仅在类体顶层（花括号 depth==1）匹配 + 排除 `this.` 前缀；② 修复后重跑 `extract.mjs` 重建三份 fixture（重跑命令已在 L17-36 留档）并把差异记 CHANGELOG；③ 若暂不修，则在 fixture 增 `methodNamesNote:'行首 ident( 启发式（含语句关键字），非精确方法集'` 并同步契约自述——**建议在 COMPAT-004 消费 fixtures 前完成①+②**（修复成本低，晚修则下游 golden 需重做） |
| **C2** | **P2** | `extract.mjs` L251-263（`seenDecl`/`classAliases`）+ L155-169/L177-178（`parseModule` 别名路径）；数据面 `0.1.5-rc.2.json` L287-361 | **`export { X as default }` 形态不去重 → `classCount` 重复计数、`classAliases` 语义失效**：`dsh-settings` 实测 `classes = {default, SettingsConflictError, SettingsProvider}`、`classCount = 3`、`classAliases = {}`，而宿主（实读 L610 + 类声明）只有 **2 个类**（`SettingsConflictError extends Error`、`SettingsProvider extends Service`，后者被 default 别名双计）。根因 = `declOf()` 每次调用新建 decl 对象（L128-135），只有 `/^export\s+default\s+IDENT$/m`（L177-178）复用同一对象；`export { X as default }` 走 L155-169 独立求值，`seenDecl` 无从识别同一实现 | 在 `parseModule` 加按**导出前符号名**的 decl 缓存（`exportedAs` 与 `orig` 双向），或在 L166 后回写 `classAliases[exportedAs] = seenDecl.get(d)`；重建 fixture，并把「classes 主名可能是 `default`」在 _schema 说明中写清（消费方需读 `classAliases` 还原类名） |
| **C3** | P3 | `test/smoke.mjs` L1881-1897（F5c）；措辞面 `CHANGELOG.md` L8 | **F5c「锚点抽核」对 4/6 面近乎恒真，其宣称的「防 file 指错文件」不成立**：候选集 = 带引号片段（引号未剥离，仅当源文件同引号同内容才命中）+ 点号标识符 + **裸标识符 ≥4 字符**（L1888-1893）。实际命中面：face 2 经 `'dsh-novel-writing'`/`window.__ModuleLoader__.load`、face 3 经 `'[data-phase]'` 命中（**有效**）；face 1 经 `deepseek`/`cordis`、face 4 经 `package.json`/`package`、face 5 经 `name`/`preset.yml`、face 6 经 `peerDependencies`（**通用词恒真**——任何 JS/JSON 文件都会命中，指错文件不会被发现） | 候选剥离引号后入集，并分级（引号字面量 > 点号标识符 > 裸词）；排除通用词表（`package.json/name/default/import/class/cordis/…`）；断言改为「至少一个**非通用**候选命中」；否则把 CHANGELOG 的「锚点抽核 6/6」标注为「弱锚点」 |
| **C4** | P3 | `test/smoke.mjs` L1823-1829（④⑤⑥ 标签）；`extract.mjs` L34-36 / L209-212 / L299-301 | **「三版本实测」措辞对 1/3 标记不成立**：`remoteNamespaceServicePackages` 的值来自 `--marker-remoteNamespaceServicePackages <true\|false>` 命令行注入（注册表元数据事实，脚本无法从单个 tarball 推出），fixture 已如实标 `origin:'registry-metadata'` ✅；但 smoke 断言标签写「三版本**实测** ≡ 契约 golden」，且两侧同源 ⇒ 该项是自洽性检查而非独立实测（与 COMPAT-002-R1 F3 同类「宣称超出实现」） | 标签改为「三版本 fixture ≡ 契约 golden（tarball 静态提取 2 项 + 注册表元数据 1 项）」，或在断言中同时校验 `fixtures[v].markers[fact].origin === 'tarball-static-extract'`（把 origin 纳入机检） |
| **C5** | P3 | `test/smoke.mjs` L1796-1801（check ①）；数据面 `fixtures packages[*].version` | **fixtures 内部版本一致性无机检**：已实测当前三份一致（0.1.1-rc.2×6 / 0.1.2-rc.1×6 / 0.1.5-rc.2×6 + cordis 4.0.2 + schemastery 3.18.2），但 ① 只校验 `hostVersion === v` 与包键集合，未校验 `packages[p].version`；本任务恰有「CLI 0.1.5-rc.1 vs 子包 0.1.5-rc.2」的版本分歧教训——若将来重跑 extract.mjs 时 `--version` 与包实测版本不符，fixture 会静默出现「快照版本 ≠ 包版本」 | ① 增断言 `dsh-* 族 packages[p].version === fixtures[v].hostVersion`，cordis/schemastery 列显式例外表（入契约 `hostSurface.versionExceptions`）；② 可选强化溯源：fixture 记 npm tarball `dist.integrity`（`npm pack --json` 已可获得） |
| **C6** | P3 | `lib/host-contract.mjs` L193-197（`ciMock` 单对象）；`ci-mock-face.mjs` L66-77 / L109-129；`smoke.mjs` ⑦⑧ | **mock 面钉只覆盖 4 个 CI mock 中的 1 个（dsh-settings）**：`cordis`（Service）/`dsh-home-paths`（resolveDshHome）/`dsh-tools`（defineTool）的 mock 导出面**无任何断言**——mock 多导出（如给 dsh-tools mock 加键）零信号；漏导出仍由运行时 import 兜底（`lib/tools.js` 等会抛错）。契约 1.1/1.3 仍以人工注释钉行号（L77/L79） | 把 `hostSurface.ciMock` 扩为数组（每 mock：`package` + `heredocTarget` + 期望面），`ci-mock-face.mjs` CLI 与 smoke ⑦⑧ 循环校验；或显式登记为 COMPAT-004 范围（附理由：F1/COMPAT-010 F1 的原始诉求仅指 dsh-settings） |
| **C7** | P3 | `ci-mock-face.mjs` L118（fixture 包访问）；`smoke.mjs` L1841-1842；`ci-mock-face.mjs` L93-97 | **输入校验与路径收敛不一致（健壮性）**：① CLI 对 heredoc 有 `exit 2` 校验（L114-115）但 `fixture.packages[...]` 未判空 → 缺包时抛 TypeError 而非结构化 exit 2；② smoke ⑧ `staticExportKeys(mockSource)` 未判 `undefined` → heredoc 改名时以堆栈中断而非 FAIL 呈现；③ `materializeCiMocks` 对 heredoc 目标无包含性检查（仅前缀过滤 L92） | 三处补判空/`resolve(abs).startsWith(resolve(tmpDir))` 包含性检查；失败路径统一为结构化 FAIL/exit 2 |

**非阻断备注（信息性）**

- **N1**（P3 措辞）：三份 fixture 的 tarball 类标记统一标 `origin:'tarball-static-extract'`，但 **0.1.5-rc.2 实际提取自已安装闭包**（`--checkout`，fixture `source` 已如实写明）⇒ 标签与来源口径不一致。建议 `extract.mjs` L301 按 `--packed/--checkout` 分流取值（`tarball-static-extract` / `checkout-static-extract`）。
- **N2**（P3 缺口）：⑯ 递归守卫对**数组**只遍历元素值，不检数组自有附加属性与 `Array.prototype` 原型替换（对象分支有 `proto` 检查，L1934-1935）。当前数据（全为字符串数组）不触发，属守卫强度残留缝。
- **N3**（知悉）：`classCount/classAliases/starExports/constants/functions/clientExports` 等字段已入库但无消费者；`classes` 的主名可能是 `default`（排序为 ICU 大小写不敏感 → `default` 先于 `SettingsConflictError`），消费方需结合 `classAliases` 还原类名（当前 C2 使其为空）。

---

## 5. 设计一致性与前轮发现承接

### 5.1 DEC-025 ADR（decision-log.md L34 实读）

| ADR 要求 | 实现实测 | 裁决 |
|---|---|---|
| 决策① 三件套之一 = `lib/host-contract.mjs` 声明式契约（六面机读） | 文件在册，48 项（§3.1b），纯数据（⑯ 守卫在位），`revisions[]` 记录 COMPAT-003 吸收项 | ✅ 一致 |
| 决策②① **fixtures 快照地基（mock 从快照生成）** | fixtures 三版本快照入仓 ✅；但 mock 仍是 ci.yml 手写 heredoc，「从快照生成」落地为 **「mock 导出面 ≡ 快照 / 契约断言」**（CI 步骤 + smoke ⑦⑧）——功能上封堵了 BUG-003 类漂移，形态上非生成式；且仅覆盖 1/4 mock（C6） | ✅ 方向一致 / ⚠️ 部分落地（C6、N3） |
| 决策②② CI latest 探测轨（只读元数据） | 本 commit 未涉及（属 COMPAT-004/005）——无越界实现 | ✅ 范围正确 |
| 决策②③ 加载期 `[nv-compat]` 结构化警告 | 本 commit 未涉及——无越界实现 | ✅ 范围正确 |
| 决策① 行为收口（`host-boundary.js` / `#region host-surface`） | `lib/client.js` 零改动（`git diff` 确认 `lib/` 仅 host-contract.mjs）——范围与三件套切分一致 | ✅ 一致 |
| **P-10 宿主耦合入契约（新增项目原则）** | 契约头 L10-11 登记纪律 + regionLiterals 口径自述（F8）+ smoke 对账断言齐备 | ✅ 一致 |

### 5.2 REVIEW-COMPAT-002-R1 F1~F9 承接核验（9/9）

| 前轮发现 | 要求 | 落地实测 | 裁决 |
|---|---|---|---|
| F1（P2） | 补 item 3.8 + 47→48 四份计数 | 契约 L112 item 3.8（与源码 L2394-2404 一致）；48 项四处同步（§3.1b） | ✅ 已落地 |
| F2（P3） | CSS 令牌族放宽 + `--dsw-shadow-lv2` 入册 | 契约 cssTokens 13 项（L166 新增）；item 3.4 symbol/line/note 更新（L108）；smoke ⑩ 正则放宽为 `alias\|shadow` + 13/13 双向 | ✅ 已落地 |
| F3（P2） | 事件名改双向 + 措辞订正 | smoke L1763-1768 真双向（源码恰 1 处 `ctx.on('`）；CHANGELOG 旧条目补「当时为单向断言」说明 | ✅ 已落地 |
| F4（P2） | 递归 own-descriptor 纯数据守卫 + 披露能拦/不能拦 | smoke ⑯（L1921-1943）；契约头 L13-17 双向披露 | ✅ 已落地（残留缝 N2） |
| F5（P2） | file/line 活性校验 | smoke ⑩（file 真实 + 形态白名单）、⑪（首行号上界，46 项）、⑫（锚点抽核） | ✅ 已落地（⑪⑫ 强度弱 → C3） |
| F6（P3） | necessity 九值 golden 分布 | smoke ⑬（L1899-1906）；我手工重算 = 39/1/1/1/2/1/1/1/1 = 48 ✅ | ✅ 已落地 |
| F7（P3） | kind 枚举 + faces 结构断言 | `kindEnum`（30 值，契约 L68-74）+ smoke ⑭⑮；我手工核对 48 项 kind 全在枚举内且 30 值全被使用 ✅ | ✅ 已落地 |
| F8（P3） | 提取口径入契约自述 + 新增依赖纪律 | 契约 L137-143（五条口径）+ L10-11（纪律）+ L13-17（守卫强度） | ✅ 已落地 |
| F9（P3） | 三处 line 精度修正 | 3.4 → `'L680-693 / L4119 / L4254'`；4.5/5.5 合并来源注记（L119/L127） | ✅ 已落地 |
| （前轮 F10 口径） | own=1（3.7）/ eliminated=1（1.4） | ⑬ golden 断言在册 ✅ | ✅ 保持 |
| REVIEW-COMPAT-010-R1 F1 | mock↔宿主导出面机器断言（面钉） | smoke ⑦（三方一致）+ ⑧（静态/动态互证）+ ci.yml L40-43 CI 步骤（独立静态校验，失败 exit 1） | ✅ 已落地（覆盖 1/4 → C6） |

---

## 6. 抽核证据（独立复核，非采纳自述）

**A. 版本命名与 fixtures 诚实性（一手实读宿主闭包）**
| 抽核项 | 契约/fixture 声称 | 一手实测 | 结果 |
|---|---|---|---|
| 闭包子包版本 | fixture `0.1.5-rc.2`（source 注明 CLI 0.1.5-rc.1） | `…\@deepseek-ai\dsh-settings\package.json` L4 = `"version": "0.1.5-rc.2"` | ✅ 一致（关键事实①成立） |
| dsh-settings 导出面 | requiredExports 4 key；`settingsNamespace` 不在现行面 | `dsh-settings\lib\index.js` **L610** `export { SettingsConflictError, SettingsProvider, SettingsProvider as default, redactSecrets }` | ✅ 4-key 集合相等；✅ eliminated 口径成立 |
| `connectionApiDomainField=false` | fixture L912 / 契约 L201 | 闭包内 `dsh-client-connection` 搜 `this\.api\s*=` → **零命中**；`remoteServiceKey` → **零命中** | ✅ 一致（关键事实②③的现版本侧成立） |
| `requiredExports` 其余包 | cordis `Service` / dsh-home-paths `resolveDshHome` / dsh-tools `defineTool` | `dsh-home-paths\lib\index.js` L97 导出含 `resolveDshHome`；`dsh-tools\lib\index.js` L3588 导出含 `defineTool` | ✅ 一致 |
| fixture `clientExports: []`（dsh-client-connection） | 空数组 | 该包 `package.json` L21-24 `exports['./client'] = ./lib/client.js`；`lib/client.js` L1 = `window.__ModuleLoader__.load({`（零 ESM export） | ✅ 准确（非漏提取） |
| 各包 version 一致性 | 三份 fixture 内部一致 | grep `^ {6}"version":` = 0.1.1-rc.2×6 / 0.1.2-rc.1×6 / 0.1.5-rc.2×6 + cordis 4.0.2 + schemastery 3.18.2 | ✅ 一致（但无断言 → C5） |

**B. F1 面钉三方一致性**：契约 L188 ↔ ci.yml L88-102 mock ↔ 宿主 L610（见 §3.5），三方 4-key 集合相等 ✅。

**C. C1 一手证实（methodNames 误捕）**：宿主 `dsh-settings@0.1.5-rc.2 lib\index.js` 类体内语句行 —— L105 `super(...)`、L238 `super(ctx, "settings")`、L283/L296/L307/L334/L340/L435-465/L504-505/L522/L534… `if (`/`for (`/`return (` ⇒ fixture 中的 `super/if/for/return` 必为 `methodsOf` 误捕（该文件类体约 L92-608，L610 为导出行）✅。

**D. 契约行号引用重校准（随 ci.yml 改动，9 处抽核）**：1.1 `L79-82`✅（cordis mock heredoc+printf）、1.2 `L78`✅（schemastery 真包安装）、1.3 `L104-109`✅、4.6 `L52-54`✅（dsh 字段结构检查）、5.1 `L38-39`✅（validate-preset）、5.4 `L59-61`✅（skills≥25）、6.1 `L24-37`✅（依赖架构守卫）、6.4 `L77-113`✅（mock 块）、6.4 note `L40-43`✅（新面钉步骤）——**9/9 命中，无漂移**。

**E. 计数与分布手工重算**：items 48（面分布 11/13/8/6/5/5）；necessity 39/1/1/1/2/1/1/1/1；kindEnum 30 值且 48 项 kind 恰好覆盖 30 值；cssTokens 13；smoke 新块 `check(` = 16（214+16=230）——**全部与声明一致** ✅。

---

## 7. 覆盖披露（未抽查项 —— 如实标注）

1. **历史版本 fixtures（0.1.1-rc.2 / 0.1.2-rc.1）的标记与导出面未独立复核**：需 `npm pack` 网络拉取（角色禁网络/禁执行），本环境仅存 0.1.5-rc.2 闭包。采信 = fixture `source` 标注 + extract.mjs 复现路径 + 契约 golden 自洽；0.1.5-rc.2 侧已一手证实（§6-A）。→ **未抽查（0.1.x 线为推断事实链，非一手）**。
2. `remoteNamespaceServicePackages` 三版本值均为命令行注入（registry-metadata），无任何独立提取证据 → 见 C4。
3. **未复跑 smoke / `node --check` / `validate-preset`**：按派发双证（Developer 真实输出 + Coordinator 独立复跑 230/0、exit 0）采信；本轮为静态审查，断言活性由 §3.5 构造分析 + §6 一手数据核对完成。**未自跑**。
4. **未读 `docs/research/COMPAT-001-host-compat-analysis.md` §3 全表**：面 1/2/4/5/6 与 §3 底稿的逐项对照属 COMPAT-002-R1 已完成的抽核（前轮结论：无失实）；本轮对照对象 = 前轮 F1~F9 定义（REVIEW-COMPAT-002-R1 全文已读）+ 契约实状 + 源码/宿主一手证据。
5. **未加载 `code-review` SKILL**：Coordinator 显式窄化指令（「只加载角色定义，不加载其他 SKILL」）——记录为对角色执行协议 step 1 的**显式偏离**（授权来源 = 派发指令）；本报告按角色定义的输出格式（5 维度 + 发现分级 + 硬门槛裁决 + 三选一）执行。
6. **角色 Bash 禁令的显式偏离**：为确定审查边界使用了 **3 类只读 git 命令**（`git log/status`、`git show --stat`、`git diff`，另 `git cat-file -t` 验证 `bf29f80` 存在）——零执行被测代码、零网络、零写入除本报告。若判定为违规，则「9 文件 +2946/−31」边界结论以派发上下文为准（不影响其余判定，其余结论全部基于工作区一手实读）。
7. item 3.8 note 的降级行号（`L2755-2762` / `L2770-2771`）**未独立读取** → 未抽查。
8. smoke 新增段耗时（<2s 预算）为**静态判定**，未计时。
9. 三份 fixture 的 tarball 内容与 `extract.mjs` 解析算法的一致性，仅对 0.1.5-rc.2 闭包做了有限抽核（§6-A/C）；tarball 原始内容无法离线交叉验证。

---

## 8. 结论与建议动作

- **终态：APPROVED_WITH_NOTES（unresolved_blockers = 0）** —— 硬门槛 5/5 通过、P0 = 0；F1~F9 + COMPAT-010 F1 **9+1/10 全部落地且断言活性成立**；契约 48 项四处计数同步、F1 item 3.8 与源码逐要素一致、F2/F9 落点与源码命中、F3 事件名真双向、F4/F6/F7 断言强度达标、fixtures 诚实地标注真实包提取且关键事实经一手证实；无 mock 残留、无幻觉条目、无 TODO、无过度实现、无安全新增面。
- **建议动作（非阻断）**：
 1. **C1（P1）**：在 COMPAT-004 消费 fixtures 之前修 `methodsOf`（关键字黑名单 + 类体顶层）并重建三份 fixture；若本任务内不修，则 MUST 在 fixture/契约自述中标注 `methodNames` 为启发式（含语句关键字）。
 2. **C2（P2）**：修 `classAliases/classCount` 去重（`export { X as default }` 形态），随 C1 同批重建。
 3. **C3/C4/C5/C6/C7（P3）**：收敛 F5c 锚点候选（C3）、订正「实测」措辞或把 `origin` 纳入机检（C4）、补 fixtures 版本一致性断言（C5）、mock 面钉扩至 4/4 或登记范围（C6）、补齐输入校验/路径包含性（C7）——建议合并入 COMPAT-004（探测）或本任务的收尾补丁。
 4. **N1~N3**：`origin` 值按提取方式分流、数组守卫补原型检查、消费方文档化 `classAliases` 语义。
- **不阻断 commit**：本审查未提出任何 P0；`lib/client.js` 零改动与 C-04/C-05 合规，fixtures 与断言网已实质提升宿主面看护层的可机检性。

---

*Reviewer: Code Reviewer Agent（只读审查——除本报告文件外零写入、零被测代码执行、零网络、零子 agent、零用户交互）。.governance/ 侧 REVIEW 证据由 Coordinator 经 review-record 机录。*
