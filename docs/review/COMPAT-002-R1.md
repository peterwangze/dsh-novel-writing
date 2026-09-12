# COMPAT-002 代码审查报告（R1）

| 项 | 值 |
|---|---|
| 任务 | COMPAT-002 — 宿主契约清单提取（R1 后置代码审查） |
| 审查对象 | commit `80f4a0b`（恰 3 文件 +214/−1，未 push；工作区 = commit 后状态） |
| 审查者 | Code Reviewer Agent（角色定义：`<plugin_root>/agents/code-reviewer.md`） |
| 审查轮次 | **R1**（首轮，无前轮 findings 需比对） |
| 审查依据 | DEC-025 ADR 决策①（decision-log.md L34：六面 47 项机读声明式契约 / 一份契约三方消费）；REVIEW-COMPAT-001-R1 F4（schema 样例）/F8（region 对账断言）/F10（自有口径=1）；项目原则 P-01/P-04/P-09/C-02 |
| 执行方式 | 只读审查（read/grep/glob 定位）+ 唯一写入本报告文件 |
| 日期 | 未采集（审查者角色禁 Bash，未读取系统时间——不用推测值代替事实） |

**变更清单（审查对象）**

| 文件 | 变更 | 审查方式 |
|---|---|---|
| `lib/host-contract.mjs` | 新建 134 行（schemaVersion/task/source/faces(6)/items(47)/regionLiterals） | 全文逐行读取 |
| `test/smoke.mjs` | +78（尾部「COMPAT-002 宿主契约对账」段 11 项 check；头部覆盖说明 +1 行；203→214） | 全文读取断言段 L1702-1773 + 头部 L14-43 + 依赖用字面量源码定位 |
| `CHANGELOG.md` | [Unreleased] 新增「### 新增」节一条（+3） | 读 L1-13 |

---

## 1. 终态结论

> ## APPROVED（unresolved_blockers = 0）
>
> **P0 阻塞 = 0**，硬门槛 5/5 全部通过；5 维度 + AI 专项 5 项全覆盖。
> 附 **P2 × 4 / P3 × 5** 非阻断发现（发现列表 §4），建议由后续任务（003 fixtures / 004 探测 / 005 诊断）吸收，**不阻断 COMPAT-002 完成与 commit**。
> 契约本体（`lib/host-contract.mjs`）内容经全表 47/47 对照 §3 + 14 项源码定位抽核，**无失实条目、无幻觉条目**。

---

## 2. 硬门槛裁决表

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | 0 | ✅ 通过 |
| 5 维度全覆盖 | = 100% | 正确性/安全性/可维护性/性能/测试覆盖 —— 5/5 有结论 | ✅ 通过 |
| 每条发现标注级别 | = 100% | 9 条发现（F1~F9）+ 1 条备注，全部 P0~P3 标签 | ✅ 通过 |
| 设计一致性检查（vs DEC-025 ①） | 已完成 | 已比对 decision-log.md L34（详见 §5） | ✅ 通过 |
| AI 代码专项 5 项 | 全部完成 | mock 残留 / 硬编码 / 幻觉 API / 未实现 TODO / 过度实现 —— 5/5 有结论 | ✅ 通过 |

---

## 3. 五维度 + AI 专项逐项结论

### 3.1 正确性 —— 通过（附 F5/F8/F9）

- **47/47 全表对照 §3**：面 1-6 合计 11+13+7+6+5+5 = 47，item 编号集合与 §3 表格完全一致；逐项 `face/item/file/line/necessity` 与 §3 L48-121 对照**未发现失实或变形条目**（§3 用「必需」而契约用 `required` 属既有口径映射：§3 的「必需（已适配…）」「必需（可收敛…）」括号语义按主判定落 `required`，子面语义入 `note`——2.5-2.12 落 required + 2.4 落 adapted 与 §3 主判定一致，映射规则自洽）。
- **14 项源码定位独立抽核（≥12 达标）**（详见 §6）——全部命中，行号无漂移。
- **necessity 分布**：`required` 38 / `own` 1（3.7）/ `eliminated` 1（1.4）/ `consolidatable` 1（2.3）/ `adapted` 1（2.4）/ `optional` 1（3.5）/ `improvable` 2（6.1、6.3）/ `adapted-drift` 1（6.4）/ `awareness` 1（6.5）= 47，与派发口径及契约头九值枚举一一对应；**`kind` 30 值枚举：47 项全部落在声明枚举内且枚举无空置值**（人工逐项比对，非机检——见 F7）。
- **regionLiterals 字面量一致性**：槽位名 3 / inject 表 3 / ctx.get 目标 3 / svc 域名 6 / 事件 1 / DOM selector 3 / CSS 令牌 12 逐一在 `lib/client.js` 命中，**与源码字面量一致**（§6）。
- **JSON 往返守卫是否真能拦住 import/函数/求值**：**部分能，非全部**（→ F4）。往返比较对 `Date/Map/Set/RegExp/undefined` 有效，但对**函数值天然免疫**（`JSON.stringify` 静默丢弃函数 ⇒ 往返后仍相等）；真正拦住函数的是同 check 内的字符串正则 `=>` / `\bfunction\b`，而 **method 简写 `m(){}`、getter `get x(){}`、`class` 声明、`export * from`、非行首 `await import(...)`、导出后顶层副作用语句**均落在两套守卫的缝里。当前文件实为纯数据（逐行确认零 import 零函数），属**守卫强度不足**，非既存缺陷。

### 3.2 安全性 —— 通过（零发现）

契约内容为静态数据：无 token/凭据/密钥，无用户数据，无绝对用户路径（`$DSH_HOME/.agent-presets/...` 为环境变量**名**约定，非展开后的真实路径），`file` 全部为仓库相对路径；`incident`/`note` 仅含 BUG/RISK/UX/TP 内部 ID。无 `eval`/`new Function`/动态求值面，无网络/文件系统副作用；smoke 对契约只做正则与结构断言、不 eval 其内容。注入面 = 无。OWASP 关键项不适用且无新增面。

### 3.3 可维护性 —— 通过（附 F1/F2/F8）

- **机器可消费性（面向 003/004/005）**：`schemaVersion`/`task`/`source` 溯源头 + `faces[]`（id/name/scope）+ `items[]`（固定七字段 + 可选 note/incident）+ `regionLiterals{file,...}` 的结构**足以**让 fixtures 生成、探测函数与诊断面板按面/按 kind 迭代消费；字段语义与九值 necessity 口径在文件头成文（L9-32），是全仓**唯一事实源**的正确形态。§3 底稿仍为散文表格，契约的可机读化是实质进步。
- **头样例质量**：一条完整七字段（+2 可选）样例 + 逐字段注释 + 九值口径 + 枚举清单，达到「后续任务不必回读分析文档即可消费」的实用线。
- 命名与目录：文件名 `host-contract.mjs` 与 DEC-025 ① 逐字一致，零 import 零函数（逐行确认），C-03 职责单一 ✅，C-04 修改纯粹 ✅（未顺带改动无关内容）。
- **缺口**：①「新增宿主依赖必须入契约」**未见任何文档化的 review 检查项**（契约头、smoke 注释、CHANGELOG 均未声明该纪律）——F8 的对账是**单向发现**（contract ⊆ source 有效，source 新增入册无机制）；② items[] 与 regionLiterals 两份清单口径不一致（F1）；③ 对账提取口径（单引号字面量 / 仅 `querySelector(All)` / `.nv-` 排除）只写在 CHANGELOG，契约自述未声明（F8）。

### 3.4 性能 —— 通过（零发现）

新增 11 项 check 的成本 = 1 次动态 `import`（小模块）+ 1 次 `readFileSync`（~5KB）+ 8 个正则扫描（作用对象 ≈ 200KB 的 `clientSrc`）+ 1 次 47 项对象的 JSON 往返。正则全部为字符类/否定字符类线性模式（`[^']+`、`--dsw-alias-[a-z0-9-]+`），**无回溯风险、无 O(n²)**；无 I/O 循环、无重复读盘。静态判定总耗时远低于 2s 预算（量级 ~10ms；smoke 整体 214/0 无超时报告可佐证）。无性能发现。

### 3.5 测试覆盖 —— 通过（附 F3/F5/F6/F7）

11 项 check 强弱评估（否决性缺陷已在发现列表标注）：

| # | check（行号） | 断言内容 | 强度评估 |
|---|---|---|---|
| ① | L1711 | 47 项 + 面分布 11/13/7/6/5/5 | **强**（数量 + 分布双约束） |
| ② | L1716 | 七字段齐全 + item 编号 face 前缀正确且面内连续 | **中强**（存在性用 `!== undefined`，空串可通过；编号连续性构造正确） |
| ③ | L1726 | `own`=1 且为 3.7 / `eliminated`=1 且为 1.4 | **中**（条目级断言强；但九值分布仅钉 2 值——F6） |
| ④ | L1732 | 零 import/`=>`/`function`/`${` + JSON 往返 | **中**（对既存违规无效力的缝见 F4） |
| ⑤ | L1739 | 槽位名双向 ⊆ + 长度相等 | **强**（构造上等价于集合相等；“移除契约项”方向必红——与演练红绿一致） |
| ⑥ | L1745 | inject 表双向 ⊆ + 长度相等 | **强**（同上；`const inject = [` 全文件唯一，无错配风险） |
| ⑦ | L1750 | ctx.get 目标双向 ⊆ | **强**（源码侧集合 = {connection, locale, sessions}，实取面确认；注释行已被 `codeOnly` 剥离） |
| ⑧ | L1755 | svc 域名双向 ⊆ | **强**（源码侧 = 6 个 `svc('...')` 调用点，逐点核对一致） |
| ⑨ | L1759 | 事件名字面量在源码在册 | **弱 / 单向**（仅 contract ⊆ source；**删契约项或置空数组仍全绿**——F3） |
| ⑩ | L1764 | CSS 令牌双向 ⊆ + 两侧皆 =12 | **强**（数量 + 双向双约束） |
| ⑪ | L1770 | DOM selector 双向 ⊆（`.nv-` 前缀排除） | **强（当前口径内）**（源码侧可提取集合 = 3 项，逐一核对一致；提取口径窄见 F8） |

- **双向性是否真的双向**：⑤⑥⑦⑧⑩⑪ 六项为真双向（集合相等，任一侧增删必红）；**⑨ 为单向**（F3）；③②④ 属结构/字段类，无对账双向语义。
- **边界：契约缺项时 smoke 是否必红** —— items[] 掉项 → ① 必红；region 字面量缺项 → ⑤⑥⑦⑧⑩⑪ 必红（反向 ⊆）；**唯 ⑨ 例外**（F3）。演练红绿（`shell.overlay`→`shell.overlay.DRILL` ⇒ FAIL 213/1 exit=1 ⇒ 恢复 214/0）与⑤的构造分析一致，**断言活性成立**。
- **check 计数自洽**：断言段 grep 得 11 条 `check(`（L1711/1716/1726/1732/1739/1745/1750/1755/1759/1764/1770），203+11=214 与双证一致。
- **未覆盖面**：契约 `file/line` 真实性无活性校验（F5）、`kind` 枚举无断言（F7）、`faces[]` 元数据无断言（F7）。

### 3.6 AI 代码专项 5 项

| 专项 | 结论 | 依据 |
|---|---|---|
| mock 残留 | **无** | smoke 直接 `import('../lib/host-contract.mjs')` + `readFileSync` 真实源码对账，**未 mock 契约或源码**；契约内无测试脚手架、无仅测试分支 |
| 硬编码 | **无风险** | `line:'L4403-4435'` 等为**数据字符串**，全文件零函数零求值（逐行确认），不存在「行号被当运行时值」的路径；无魔法分支常量 |
| 幻觉 API | **无** | 47 项 item 编号集合与 §3 §3 表格**完全一致**，无 §3 之外被「发明」的条目；regionLiterals 全部字面量在 `lib/client.js` 实际命中（§6） |
| 未实现 TODO | **无** | 全文件无 TODO/FIXME/占位符；`regionLiterals` 标注「F8 首批」属**显式范围声明**而非未完成占位（首批范围与 F8 决定一致） |
| 过度实现 | **无** | 134 行 = 头 32 行（schema 样例 + 九值口径，被 003/004/005 消费）+ 6 faces + 47 items + regionLiterals；无推测性字段（无 severity/axis/owner 等本任务外元数据）、无死代码、无冗余抽象，接近最小必要 |

---

## 4. 发现列表（P0~P3）

> **P0 阻塞 = 0。** 以下全部为非阻断项，按「文件:行号 / 级别 / 问题 / 建议」给出。

| ID | 级别 | 位置 | 问题（事实依据） | 建议 |
|---|---|---|---|---|
| **F1** | **P2** | `lib/host-contract.mjs` L76-82（面 3 items）+ L132；事实源 `lib/client.js` L2394-2404 | **依赖面清点与自身 regionLiterals 口径不一致**：同属 `findSidebarEl()` 的宿主耦合点，L2403 的探测串已入 `regionLiterals.domSelectors`，但该函数的 **L2400 宿主类名正则 `/SidebarRoot\|sidebar/i`（宿主侧栏类名耦合）在 items[] 与 regionLiterals 两份清单中均未登记**，且整个 `findSidebarEl`（控制台几何依赖）在面 3 items 无对应条目（§3 底稿亦无）。后果：按 items[] 消费的 005 诊断不会探测/报告该项，宿主改侧栏类名时契约面零信号。 | 补 `item 3.8`（findSidebar 侧栏探测：aside/nav + className 正则 + querySelector 兜底）并同步 47→48 的四份计数声明；或在契约头显式声明「regionLiterals 可先于 items[] 收录耦合点」的例外口径 + 记入后续任务。 |
| **F3** | **P2** | `test/smoke.mjs` L1759-1761；措辞面 `CHANGELOG.md` L8 / `test/smoke.mjs` L26-28 | **事件名对账为单向断言，且文档宣称超出实现**：⑨ 仅断言 `contract ⊆ source`，**从契约删除 `events: ['internal/service']` 或置为空数组，check 仍全绿**（真空方向）；而 CHANGELOG 与 smoke 头均宣称「四类 region 字面量…双向对账（提取面 ⊆ 契约 ∧ 契约 ⊆ 提取面）」。与 REVIEW-BUG-004 F1（真空断言）同类，按该先例定 P2。 | 加反向提取（`codeOnly.matchAll(/ctx\.on\('([^']+)'/g)`）做双向 ⊆；并把文档措辞收敛为「三类双向 + 事件名在册」。 |
| **F4** | **P2** | `test/smoke.mjs` L1732-1735；宣称面 `lib/host-contract.mjs` L2-4 | **纯数据守卫对「零运行时逻辑」覆盖不全（可证）**：JSON 往返对**函数值天然免疫**（method 简写 `{ m(){} }`、getter `get x(){}` 被 `JSON.stringify` 丢弃后往返仍相等 ⇒ 通过），`class` 声明、`export * from`、非行首 `await import('宿主')`、**导出后顶层副作用语句**（`hostContract.x = f()`）同样不被现有正则/往返覆盖。CI 与诊断对「纯数据」的信任缺少对应强度。 | 加递归 own-property 检查（每个自有属性均须为数据属性 + 值类型白名单 string/number/boolean/null/array/plain-object，可配 `Object.freeze`）；并把「守卫能拦什么/不能拦什么」写入契约注释，避免消费者高估保证。 |
| **F5** | **P2** | `test/smoke.mjs` L1711-1735（缺失项）；对象面 `lib/host-contract.mjs` L48-104 | **契约核心资产（file/line 可溯源性）无活性校验**：机检只验证 item 编号/字段存在/F10 口径，**不校验 `file` 是否为仓库真实文件、`line` 是否符合 `^L\d+` 形态、行号是否仍指向对应符号**。「61 处行号抽核 0 失实」是**一次性人工**结论；产品代码增删行后契约行号会静默失效，无任何红色信号——恰是契约存在要防的漂移。 | 加轻量 check：所有非 null `file` ∈ 仓库文件白名单、`line` 匹配 `^L\d+(-L?\d+)?$`（或含「原/现」形态白名单）；可选对每面抽 1 项做 grep 锚点命中。建议排入 003/004。 |
| **F2** | P3 | `lib/host-contract.mjs` L118-131；`lib/client.js` L4119、L4254 | **CSS 对账面族外盲区**：`regionLiterals.cssTokens` 显式限定 `--dsw-alias-*`（去重 12），而同一 `NV_STYLE` 还消费宿主令牌 **`--dsw-shadow-lv2`**（L4119/L4254，带兜底），该字面量不入册、smoke 提取正则也看不到（族限定）。范围已声明故非失实，但宿主换 shadow 令牌名零信号。 | 把提取面放宽为 `--dsw-[a-z-]+` 并将 `--dsw-shadow-lv2` 入册，或在 regionLiterals 注释显式声明「本批仅 alias 族，其余宿主令牌族待 F8 二批」。 |
| **F6** | P3 | `test/smoke.mjs` L1724-1730 | **necessity 九值仅钉 2 值**：只断言 `own`=1、`eliminated`=1；其余 7 值（含 `required`=38）可静默漂移，契约头宣传的九值口径无对应断言。 | 加 golden distribution 断言（9 值全量 + 合计 47）。 |
| **F7** | P3 | `test/smoke.mjs` L1716-1722；枚举声明面 `lib/host-contract.mjs` L13 | **`kind` 枚举与 `faces[]` 元数据无断言**：`kind` 30 值枚举是契约自述的封闭集，但笔误（如 `slott`）不会被任何 check 拦下；`faces[]`（6 项 id 1..6、name/scope 非空）无结构断言，而它是 003/005 的消费入口。（本次已人工核对 47 项 kind 全在枚举内、枚举无空置值——结论成立但非机检保障。） | 加「`kind` ∈ 声明枚举」+「`faces` 恰 6 项、id 1..6、name/scope 非空字符串」两条 check。 |
| **F8** | P3 | `lib/host-contract.mjs` L107-108（regionLiterals 自述）；规则面 `test/smoke.mjs` L1738/1763/1769 | **对账提取口径只在 CHANGELOG/测试代码里，契约自述未声明**：契约注释仅称「源码提取面 ⊆ 本清单」，未写明提取面 = **单引号字面量** + **仅 `querySelector(All)`** + **`.nv-` 前缀排除**。「新增宿主依赖必须入契约」亦无任何文档化 review 检查项。后果：后续用 `closest()`/`getElementById()`/模板串/变量选择器新增宿主选择器时无人察觉（L2400 className 正则即现成实例，见 F1）。 | regionLiterals 注释补口径声明（提取规则、排除规则、四类各自的 API 面）；并在契约头或项目原则处登记「新增宿主耦合字面量必须同步契约 + smoke 对账」的 review 检查项。 |
| **F9** | P3 | `lib/host-contract.mjs` L79（3.4）、L89（4.5）、L97（5.5） | **`line` 字段三处精度损失**：3.4 的 `L680-693` 只覆盖 TK 表（11 个去重令牌），第 12 个 `--dsw-alias-bg-elevated` 实际出自 L4119/L4254（note 已指向 regionLiterals，但按 file/line 定位的消费者会漏 1 个）；4.5 把 §3 的 `L306-316`+`L318-339`、`L207-216`+`L218-232` 合并为 `L306-339`/`L207-232`（含中间行）；5.5 复用 4.5 的行段但未标注来源。 | 3.4 的 line 补第二落点（如 `L680-693 / L4119,L4254`）；4.5/5.5 保留 §3 原始分段或 note 注明合并来源。 |

**非阻断备注（P3，信息性）**

- **N1**：2.4 的 `line: 'L532 / L556 / L572 / L581 / L620 / L629'` 与同条 note「代码级引用恰 1 处（smoke 断言）」并置时易被读成「6 处代码级 `connection.api` 引用」。两处均为 §3 原文（§3 同列 6 点），非契约失真；建议 note 一句澄清「6 点为旧表面域对象消费点，唯一特性检测在 L532」。

---

## 5. 设计一致性（DEC-025 ADR 决策①）—— 一致

| ADR 决策① 要求 | 实现实测 | 裁决 |
|---|---|---|
| 宿主边界层三件套之一 = `lib/host-contract.mjs` **声明式契约（六面 47 项机读）** | 文件名逐字一致；`faces` 恰 6 项、`items` 恰 47 项、纯数据可机读 | ✅ 一致 |
| **纯数据**（无宿主 import / 无运行时逻辑） | 逐行确认零 import、零函数、零求值；smoke ④ 守卫在位（强度缺口见 F4，但当前文件合规） | ✅ 一致 |
| 一份契约**三方消费**（ADR：诊断面板 / 启动警告 / CI；契约头：CI / smoke / 诊断） | 本任务已落地 smoke 消费方；「smoke ⊂ CI」与 ADR 的 CI 面等价，诊断/启动警告属 005 待实现 | ✅ 一致（消费方映射自洽） |
| 契约面 = 依赖**清点**（非行为层收口）；行为收口属同三件套的 `host-boundary.js` / `#region host-surface` | 本 commit 未触碰 `lib/client.js`（零改动）与新增行为层，范围与三件套切分一致，无越界实现 | ✅ 一致 |
| ADR 审查遗留 F4（schema 样例）/ F8（region 对账断言）/ F10（自有口径=1） | 头样例七字段+2 可选且逐字段注释（F4 满足）；regionLiterals 四类 + smoke 双向对账（F8 满足，单向缺口见 F3）；`own` 恰 1 项 3.7 + `eliminated` 恰 1 项 1.4（F10 满足） | ✅ 满足 |

---

## 6. 抽核证据（独立复核，非采纳自述）

**A. regionLiterals ↔ `lib/client.js` 源码定位（逐项命中）**

| 契约条目 | 契约值 | 源码定位（实测） | 结果 |
|---|---|---|---|
| `slotNames` | 3 项 | `slots.inject('settings.section')` L4403、`('sidebar.footer.action')` L4409、`('shell.overlay')` L4420/4424/4428/4432（去重 3） | ✅ 一致 |
| `serviceNames.inject` | slots/connection/locale | `const inject = ['slots', 'connection', 'locale']` L4350（全文件唯一 `const inject = [`） | ✅ 一致 |
| `serviceNames.ctxGet` | connection/locale/sessions | L4353 `ctx.get('connection')`、L4354 `ctx.get('locale')`、L1200/L4380/L4400 `ctx.get('sessions')`（注释 L1186 已被 `codeOnly` 剥离） | ✅ 一致 |
| `serviceNames.svcDomains` | 6 项 | `svc('remote.settings')` L548、`svc('remote.session')` L559、`svc('remote.workspace')` L575、`svc('workspaces')` L576、`svc('remote.directoryPicker')` L603、`svc('remote.agentPresets')` L623 | ✅ 一致（6/6） |
| `serviceNames.events` | internal/service | `ctx.on('internal/service', …)` L4378 | ✅ 一致 |
| `cssTokens` | 12 项 | TK 表 L680-693 = 12 条目含 `fill-l1` ×2 ⇒ 11 个去重名；第 12 个 `--dsw-alias-bg-elevated` 见 L4119/L4254 | ✅ 一致（12 去重名均可定位；精度见 F9、族外盲区见 F2） |
| `domSelectors` | 3 项 | `[data-phase]` L824、`.ta_splitClose` L882、`aside, nav, [class*="SidebarRoot"], [class*="sidebar"]` L2403 | ✅ 一致（漏项见 F1） |

**B. 47/47 全表对照 §3（`docs/research/COMPAT-001-host-compat-analysis.md` L48-121）**

face/item/file/line/necessity 逐项比对：**无失实、无增删、无变形**；面分布 11/13/7/6/5/5 与 §3 标题行一致。

**C. 源码定位抽核（14 项，行号命中）**

2.3→L4350 ✅｜2.5→L547-557（L548 命中）✅｜2.6→L558-573（L559）✅｜2.7→L574-601（L575/576）✅｜2.8→L602-621（L603）✅｜2.9→L622-630（L623）✅｜2.12→L4377-4383（L4378）✅｜2.13→L4403-4435（L4403-4432）✅｜3.1→L821-829（L824）✅｜3.4→L680-693（TK 表全 12 条目）✅｜3.5→L879-890（L882）✅｜3.6→L917-940+L2776（L940/L2776）✅｜3.7→L727-729 等 ✅｜1.11→`lib/tools.js` L17/L22/L46（导入/inject/注册三段各自命中）✅

---

## 7. 覆盖披露（未抽查项 —— 如实标注）

1. **面 4（安装注册 6 项）/ 面 5（预设 manifest 5 项）/ 面 6（版本环境 5 项）的行号未做源码定位复核**：已完成与 §3 表格的逐项文字对照（无失实），但 `install.ps1` / `install.sh` / `agent.cordis.yml` / `package.json` / `ci.yml` 的行号**未独立读取验证**（本次抽核集中在可直接 grep 定位的面 2/面 3 + 1.11，共 14 项 ≥12 达标）。→ 未抽查。
2. **1.1~1.10 的 `lib/index.js` 行号未独立读取验证**（仅与 §3 表格对照一致）。→ 未抽查。
3. **不可独立复跑项（角色禁 Bash）**：① commit `80f4a0b` 的 3 文件 +214/−1 边界与「`lib/client.js` 零改动」**未用 git 复核**，按 Coordinator 双证与派发事实采信；② `node --check` ×4 / `validate-preset` 29/29 / smoke 214/0 **未自跑**（按双证采信：Developer 真实输出 + Coordinator 独立复跑）；③ 演练红绿（`shell.overlay.DRILL` ⇒ 213/1 ⇒ 恢复 214/0）**未自跑**，但其断言活性已由静态构造分析证实（⑤ 双向 ⊆ + 长度相等 ⇒ 该方向必红）。→ 采信，未独立复跑。
4. **角色输出路径偏差（已记录）**：角色定义要求产出 `.governance/review-{task_id}.md`，Coordinator 显式指定并授权写入 `docs/review/COMPAT-002-R1.md`（与本仓既有 `docs/review/*-R1.md` 惯例一致）——按 Coordinator 指令执行，本报告为唯一写入。
5. **未加载 `code-review` SKILL**：Coordinator 显式下达「窄化执行——只加载角色定义，不加载其他 SKILL」。记录为对角色执行协议 step 1 的**显式偏离**（授权来源 = Coordinator 派发指令）；本报告按角色定义的输出格式（5 维度 + 发现分级 + 硬门槛裁决 + 三选一结论）执行。

---

## 8. 结论与建议动作

- **终态：APPROVED（unresolved_blockers = 0）** —— 硬门槛 5/5 通过，P0 = 0；契约本体准确、纯净、可机读，与 DEC-025 ① 设计一致，无幻觉条目、无 mock 残留、无过度实现。
- **非阻断后续（建议入账，不阻断本任务完成）**：F1（补 findSidebar 耦合点条目或声明例外口径）、F5（补 file/line 活性校验）、F3（事件名双向化 + 措辞订正）、F4（纯数据守卫强化）→ 建议合并入 **003 fixtures / 004 探测 / 005 诊断** 任一任务的实现范围；F2/F6/F7/F8/F9 为低成本改进，可随同批落地。
- **不阻断 commit**：本审查不提出任何 P0/P1，`docs/research/COMPAT-001-host-compat-analysis.md` 底稿溯源与 smoke 看护网均已到位。
