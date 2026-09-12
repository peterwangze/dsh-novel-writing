# COMPAT-004 代码审查报告（R2 · 返工复审）

> **Round**：**R2**（复审；本人为 R1 审查者，按 behavior-protocol M7.4 step 4.6 复审 round=2）
> **前轮引用**：`docs/review/COMPAT-004-R1.md`（REVIEW-COMPAT-004-R1，NEEDS_CHANGE，`unresolved_blockers=2` = F1 P0 + F2 P1；其 §8「R2 复审必查项」为本轮判据）
> **审查对象**：返工 commit `49afd34`（"COMPAT-004: R1 返工修复"，7 文件 **+268/−46**，未 push；工作区 = commit 后状态，`lib/`、`test/`、`package.json` 无未提交改动）
> **审查人**：Code Reviewer Agent（只读；未修改仓库任何文件，唯一写入 = 本报告）
> **审查方式**：前轮报告逐条比对 + 修复实质逐行核验 + 独立复算（不采纳自述）——smoke 独立复跑、**打包面四法实证**（tarball 清单 / 隔离安装 / **加载实测** / **R1 原复现路径 `git+file:` 补跑**）、line 引用抽核 21 处（client.js）+ 10 处（host-boundary.js）、F5 正则行为实测、`store.set({})` 重渲染扳机实证
> **日期**：2026-09-12

---

## 1. 终态结论

**APPROVED_WITH_NOTES** — `unresolved_blockers = 0`。

R1 的 **P0（F1）与 P1（F2）均已修复，且有本人第一手独立证据**（§4 B2~B5b：打包安装通道的插件加载失效已消除，实测 `LOADED name=dsh-novel-writing apply=function inject=["settings"]`）；F3/F4/F6/F7 已修复；F5 已实质修复（强口径落地），仅余 1 处正则覆盖缝（N1，P3）。**本轮无新引入的 P0/P1/P2 缺陷**；4 条 P3 非阻断发现见 §6（其中 N2 为 R1 既有偏移的承继，非本次引入）。

硬门槛全通过（P0 = 0）；round=2 < 3 且无 BLOCKING ⇒ 无需转 BLOCKED。

---

## 2. 硬门槛裁决表

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0**（R1-F1 已修复并经独立实证；§6 最高级别 P3） | ✅ |
| 5 维度全覆盖 | 100% | 5/5 逐项结论（§5.1~§5.5） | ✅ |
| 每条发现标注级别 | 100% | 4/4 本轮发现均带 P3 标签；R1-F1~F7 逐条标注处理状态（§3） | ✅ |
| 设计一致性检查 | 已完成 | DEC-025 ①③ / DEC-026 A3 / P-10 复检（§5.6） | ✅ |
| AI 代码专项 5 项 | 全部完成 | 5/5 逐项结论（§5.7） | ✅ |
| R1 findings 逐条比对 | 100% | F1~F7 **7/7** 全量标注（§3） | ✅ |

---

## 3. R1 发现逐条比对（M7.4 step 4.6 核心）

| R1 ID | 级别 | R1 问题 | 本轮处理 | 独立核验（非自述） | 状态 |
|---|---|---|---|---|---|
| **F1** | P0 | `package.json files` 未含 `lib/host-boundary.js` + `lib/host-contract.mjs` ⇒ 打包安装通道 `ERR_MODULE_NOT_FOUND`、插件完全不加载 | `files` 三条精确条目**收敛为 `"lib/"`**（`package.json:30-31`）；smoke 增 3 段断言（files ⊇ lib/** ∧ ⊇ 入口相对 import 传递闭包 ∧ 条目形态白名单 + lib/ 零孤儿） | **B2** tarball 清单 `package/lib/` = **5 文件**（client/host-boundary/host-contract/index/tools）；**B3** 隔离安装后 `node_modules/dsh-novel-writing/lib/` = 5 文件；**B4** **加载实测 `LOADED name=dsh-novel-writing apply=function inject=["settings"]`**；**B5** R1 原复现路径 `npm install git+file:<repo>` 补跑 → lib/ 5 文件且两文件 `True` | ✅ **已修复（P0 关闭）** |
| **F2** | P1 | A3 后 locale 为 apply 期一次性快照，服务后到 ⇒ 永久降级且无自愈/无重渲染扳机 | 方案 a（与 sessions 同构）：`snapshotLocale(ctx)` 统一 apply 期与时序回调口径（`client.js:143-158`）；**同一** `internal/service` 监听器加 locale 分支（`client.js:4404`）+ `rerender = () => store.set({})`（`client.js:4401`）；槽位标签改**渲染期惰性** `const t = (key, ...args) => makeT(localeSnapshot())(key, ...args)`（`client.js:4381`）；smoke ④b/④c 双构造断言 | **B7 重渲染扳机实证**：`store.set`（`client.js:445-452`）的空 patch 分支**无条件**执行 `for (const fn of store.listeners) fn(store.get())` ⇒ 真通知；`useStore`（`client.js:459-462`）以 `setSnap({ ...store.get() })` 新对象订阅 ⇒ 真重渲染。**B8**：`snapshotLocale` 三处 try/catch/形态守卫（ctx.get 抛错 / 服务缺席 / getSnapshot 抛错 → 保持现值、零抛出，运行于宿主事件派发链安全）；监听器单点（smoke 断言 `lateHandlers.length === 1` + cleanup 后 `off === true`）；标签惰性化后 `label()` 在事件后返回 `Novel Writing`（smoke ④b 实测） | ✅ **已修复（P1 关闭）**（残余披露 → N3/N4） |
| **F3** | P2 | 宿主 `ctx.get` 语义引用不可复核（注释为唯一事实源） | 契约新增 `ctxGetSemantics`（`host-contract.mjs:185-199`：两形态行为 / `dependent` 2 项 / `fallback` / `evidence: indirect-only` / **`status: 'unverified'`** / `risk` 如实披露「产品路径透传不吞错，宿主改语义则 apply 抛错」）；smoke ⑥ 增**两向构造断言** | 读契约：`status==='unverified'` 与 `evidence==='indirect-only'` 均**如实标注**（BC-01，未给虚假安全感）；smoke ⑥ 实测：`ctx.get` 抛错时 `detectHostCapabilities` 不崩且**如实判 1.8 缺面**、告警可发，同时 `getWebServer`（产品路径）**确实抛出**（透传不吞错被两向锁定）。R1 要求「语义入可对账面或补证据」= 已达成（可对账面 + 诚实状态） | ✅ **已修复**（残余：宿主源码/真机对账仍待办，已登记 `unverified`，非阻断） |
| **F4** | P2 | 告警载荷硬编码 `task:'COMPAT-004'` | `CONTRACT_TASK` 由契约 `revisions.at(-1).task` 派生（`host-boundary.js:210-217`），revisions 缺失/空时退回契约自身 task；载荷改 `task: CONTRACT_TASK`（`host-boundary.js:236`）；smoke ③b 断言「值 ≡ 契约末项 ∧ 源码无 `task: 'COMPAT-004'` 字面量 ∧ 派生式在册」 | 读源码：无 `'COMPAT-004'` 载荷字面量；派生式含空数组守卫（不抛错）；smoke ③b 全绿 | ✅ **已修复** |
| **F5** | P3 | 收口① 模式表自指（开发者自列形态），新形态零信号 | 升级为**强口径**：`/(?<![.\w$])ctx\.[A-Za-z_$]/g` 零命中 + 零 `@deepseek-ai/` import（smoke 收口①），原 9 类表降为补充面 ①b | 独立实测：强口径对 bare `ctx.get(...)` 命中、**对 `this.ctx.get(...)` 漏检**（见 N1）；当前 `lib/index.js` 代码面在**两种**口径下均 0 命中（无实害） | ⚠️ **已实质修复，余 1 处覆盖缝（N1，P3）** |
| **F6** | P3 | `inject` 与边界 `hostInject` 共享数组引用 | `export const inject = [...hostInject]`（`lib/index.js:36`）；smoke ⑦ 断言非同一引用 + `push/pop` 改写零泄漏 + 内容等价 | 读源码确认副本；smoke ⑦ 实测 `sameRef=False` 且双向内容等价 `["settings"]` | ✅ **已修复** |
| **F7** | P3 | 「服务端 100% 收口」措辞易被读成含工具行 | 口径统一为「lib/index.js 宿主调用 100% 收口」+ tools 行显式排除，落地 3 处（CHANGELOG / 契约 `faces[0].scope` L71 + item 1.11 / 边界头 L6 + L107-112「范围口径」段）；smoke ⑧ 断言「3 文档含限定短语 ∧ **每一处**『100% 收口』均含 `lib/index.js` ∧ 显式排除 `lib/tools.js`」 | smoke ⑧ 逻辑审读：不止「某处出现过字面」——遍历全部行做限定性检查，能挡住「服务端全域收口」式表述 ✓；边界头插入位置在 `presetDir` 之后（L107+），**未扰动契约面 1 的行号指向** | ✅ **已修复** |

**未修复项：0。新引入 P0/P1/P2：0。**（F5 的残余缝与其级别相同，属 P3；F2 的两条残余为披露项 → N3/N4。）

### 3.1 Developer 披露项 ① 处置：契约 line 引用重基抽核（要求 ≥8，实测 21 + 10）

**抽核方法**：机读契约 → 提取 `file` 含 `lib/client.js` 的 **21 项**，逐项打印其 `line` 首个行号指向的**真实源码内容**，与 `symbol` 语义对照；另核对 `lib/host-boundary.js` 的 **10 处**行号（本次该文件亦有插入）。

| 结果 | 项 |
|---|---|
| **起点精确命中目标构造（19/21）** | 2.1→`window.__ModuleLoader__.load({`；2.2→`require('react')`；2.3→`const inject = ['slots']`；2.4→`const legacyApi = connection…connection.api`（含 L573/589/598/637/646 五域回退逐点核对）；2.5~2.9→`get settings/sessions/workspace/host/agentPresets()`；2.10→`makeSessionsHookReactive`；2.11→`open(sessionId)`；3.1→侧栏容器注释+实现；3.2→`root.children[0]`；3.3→`viewArea.style.marginLeft`；3.4→`const TK = {`；3.5→互操作注释；3.6→`try {`；3.7→`SPLIT_PERSIST_KEY`；3.8→`findSidebarEl` |
| **边界文件 10 处** | L17/18/19（宿主包导入）、L45（`SERVICE_NAME`）、L51（`hostInject`）、L55（`registerSettings`）、L66（`getWebServer`）、L71（`registerRoute`）、L76（`onLifecycle`）、L92（`emitChanged`）——**全部逐字精确** |
| **位移映射自洽性** | 中段统一 **+17**（2.3：4357→4374 ✓；3.4 调用点 4119/4254→4136/4271 ✓）；apply hunk 之后另有净 **−3** ⇒ 与「机械 `git diff -U0` 映射」自述一致 |
| **偏移承继（2 项 → N2）** | 2.12：R1 `L4377-4383` / 真实调用点 R1 `L4385` → R2 `L4391-4397` / 真实 `L4403`（R1 偏差 −2 ⇒ R2 −6，因 F2 在其间插入 4 行）；2.13：R1 `L4403-4435` / R2 `L4422-4454`，真实注册段 R1→R2 = `+19`（4410→4429…4461），偏移 −7 **在 R1 已存在**，本次如实保留未加剧。⇒ **非本次引入**，但与「P-10 file/line 自洽」的精度期望仍有差距（P3） |

---

## 4. 独立复算证据（R2 · 非采纳自述）

| # | 复算项 | 方法 | 实测结果 |
|---|---|---|---|
| B1 | 门禁独立性 | 自行执行 `node test/smoke.mjs` | **258 passed, 0 failed，exit 0**（248→258，+10 新断言；历史 248 项零回归） |
| B2 | tarball 打包面 | 隔离目录 `npm pack <repo>` + `tar -tzf` | `package/lib/` = **5 文件**：client.js / **host-boundary.js** / **host-contract.mjs** / index.js / tools.js |
| B3 | 安装面 | 隔离项目 `npm install <tarball> --legacy-peer-deps --ignore-scripts` | `node_modules/dsh-novel-writing/lib/` = **5 文件**（含两新文件） |
| B4 | **加载实测（R1-F1 失效模式）** | 隔离安装 + 宿主包 stub（chainable `z` / `Service` / `resolveDshHome`）→ `import('dsh-novel-writing')` | **`LOADED name=dsh-novel-writing apply=function inject=["settings"]`** ⇒ 相对 import 全链（`./host-boundary.js` → `./host-contract.mjs`）解析并求值成功，R1 的 `ERR_MODULE_NOT_FOUND` 已消除 |
| B5 | **R1 原复现路径补跑（git 通道）** | 隔离项目 `npm install git+file:///D:/…/writing-workflow`（= README 主通道 `dsh plugin add <git>` 的等价本地形态） | `lib/` = 5 文件；`host-boundary.js: True`、`host-contract.mjs: True`（R1 判据 ① 闭环） |
| B5b | **R1 另一复现通道补跑（pnpm `file:`）** | 隔离项目 `pnpm install file:<repo>`（pnpm 11.22.0，`--offline --config.auto-install-peers=false --store-dir <temp>`） | `node_modules/dsh-novel-writing/lib/` = **5 文件**；`host-boundary.js: True`、`host-contract.mjs: True` ⇒ R1 的两条复现通道**均已闭环**（R1 时两通道均缺文件） |
| B6 | F1 smoke 断言逻辑强度 | 逐行审读新断言实现 | `pkgCovered` 正确处理目录前缀条目；闭包走查 `from '…'`（含 `export … from`）+ 入口 = `main` + `exports` 中实际存在的 3 个 JS 文件 ⇒ 闭包 = 5 = lib 全量；`patternBad` 拦 glob/否定式；孤儿断言反向兜底。残余缝：不覆盖 `import './x.js'` 副作用式导入与双引号书写（项目风格为单引号）——**P3 级，未单列为发现** |
| B7 | F2 重渲染扳机 | 读 `store` 实现（`client.js:436-461`） | `set(patch)` 的字段 `if` 之外**无条件** `for (const fn of store.listeners) fn(store.get())` ⇒ 空 patch 亦通知；`useStore` 每次通知 `setSnap({ ...store.get() })` 新引用 ⇒ React 必然重渲染。**扳机真实存在，F2 闭环成立** |
| B8 | F2 取值路径 | 读 `snapshotLocale`（`client.js:143-158`）+ 监听器（`4401-4409`）+ 惰性 `t`（`4381`） | 三形态兜底（`ctx.get` 非函数/抛错、服务 null/形态不合格、`getSnapshot` 抛错）**一律保持现值、零抛出**；`makeT`（`427-433`）仅一次三元 + 闭包，惰性化无重活 ⇒ 性能可忽略 |
| B9 | line 引用抽核 | 机读契约 + 打印真实行内容（client.js 21 项 / host-boundary.js 10 项） | 29/31 精确命中；2 项范围偏移为先于本轮的承继（§3.1） |
| B10 | F5 强口径行为 | node 实测正则 | bare `ctx.get(1)` → 命中；**`this.ctx.get(1)` → `null`（漏检）**，而 R1 口径 `[^a-zA-Z0-9_$]ctx\.` 命中 ⇒ N1 |
| B11 | F4 派生 | 读 `CONTRACT_TASK` + 契约 `revisions` 末项 | `revisions.at(-1).task === 'COMPAT-004'`；载荷 `task` 与实际取值一致；空数组守卫在册 |
| B12 | F6/F7 断言 | 读 smoke ⑦⑧ + 读 `lib/index.js:36` | `inject` 为副本（非同一引用）；收口口径 3 文档统一且每处「100% 收口」均限定 `lib/index.js` |

> **隔离与真实环境防护留痕**（A8/B2~B5b 打包探测，共 9 条命令，逐轮上报）：全部在 `%TEMP%` 新建目录执行；`npm_config_cache` / `npm_config_userconfig` / `npm_config_globalconfig` / `HOME` / `PNPM_HOME` / `XDG_*` **全部重定向至临时目录**；`--ignore-scripts`（不执行被装包脚本）+ `--legacy-peer-deps`（不拉取 peer）；仓库工作树只读、未写入任何仓库文件；**每轮结束 `Remove-Item` 并实测 `temp removed: True`**。R1 的两条复现通道（npm `git+file:` / pnpm `file:`）本轮**逐条补跑**（B5/B5b）——均从 R1 的「lib/ 仅 3 文件」变为「5 文件齐全」。
> **探针自身缺陷如实记录（P-01）**：第 1 轮 load 测试的 peer stub 被 `npm install` prune（"removed 3 packages"）；第 2 轮 PowerShell 单引号内嵌单引号导致 stub 未写入。两轮失败均为探针缺陷（非产品问题），第 3 轮改用 here-string + 安装后建 stub 后通过（B4）。R1 报告中的 `ERR_MODULE_NOT_FOUND` 结论不受影响（当时为文件缺失，三法一致）。

---

## 5. 审查维度逐项结论（R2）

### 5.1 正确性 — 通过

- **F1 修复正确性**：`"lib/"` 目录前缀是**结构性**修复（新增 lib 文件自动纳入，不再依赖逐文件登记）；实测 tarball / 安装 / 加载 / **git 通道 / pnpm `file:` 通道**五面一致（B2~B5b）。
- **F2 修复正确性**：快照口径统一（apply 期与事件回调同一函数）+ 监听器单点复用（无重复注册）+ 标签渲染期惰性 ⇒ 「后到 ⇒ 永久降级」链路被切断；重渲染扳机经读码证实无条件通知（B7）。
- **无回归**：smoke 248→258 全绿且历史项零回归（B1）；`lib/index.js` 本轮仅 1 行改动（`inject` 副本），未触碰收口路径。
- **契约面 1 行号未被扰动**：F7 的范围口径段插入在 `presetDir` 之后，面 1 十项指向行号（L17~L92）逐字复核仍精确（B9）。

### 5.2 安全性 — 通过

BC-05 边界维持（载荷仍为名称/布尔/版本）；`ctxGetSemantics` 的 `risk` 字段**主动披露**「宿主改语义则 apply 抛错、无降级」而非掩盖（BC-01）；新增代码无外部输入、无路径拼接、无权限变化；`snapshotLocale` 的 try/catch 明确以「不打断宿主事件派发」为目的（不是吞掉产品路径错误——产品路径仍透传，由 smoke ⑥ 双向断言锁定）。

### 5.3 可维护性 — 通过（余 N1/N2）

- F1 的防复发断言把「打包面」纳入机检（此前是四门禁的盲区），且形态白名单把「出现 glob 条目即红」固化为纪律。
- F4 把诊断归因与契约 `revisions` 绑定，消除未来任务的归因污染面；`ctxGetSemantics` 让宿主语义有**可对账面**（不再是注释独占事实源）。
- 残余：F5 强口径正则的覆盖缝（N1）与 2 处范围型 line 精度（N2）——均为可维护性维度的小项，不阻断。

### 5.4 性能 — 通过

apply 期新增 `snapshotLocale` 一次调用（`ctx.get` + 浅取值，O(1)）；`t` 惰性化后每次调用多一次 `makeT`（三元 + 闭包分配，`client.js:427-433`）——字符串查表路径的常量开销，渲染热路径可忽略；`rerender()` 仅在 locale 事件时触发一次空通知（非轮询）。探测仍全同步 O(1)，无网络/布局等待（R1 结论保持）。

### 5.5 测试覆盖 — 通过

- 新增 10 项断言覆盖：打包面 ×2、F4 ×1、F2 后到自愈 ×1、F2 零抛出 ×1、F3 抛错两向 ×1、F3 契约字段 ×1、F6 ×1、F7 ×1、强口径 ×1（B1 全绿）。
- **非真空构造**：F2 ④b 构造「locale 缺席 → 事件注入服务 → 标签 zh⇒en」并要求 `lateHandlers.length === 1` 与 cleanup 生效；④c 构造 `ctx.get` 抛错并要求「不抛 + 保持现值」；F3 ⑥ 构造 `ctx.get` 抛错并要求「探测兜底不崩」**与**「产品路径透传确实抛」——两向锁定，避免「断言只测一件事」的伪强度。
- **打包面断言为结构性**（files ⟷ readdir ⟷ 相对 import 闭包三方对账），不是「某文件存在于清单」的字符串检查。
- 残余建议：N2 的「范围型 line 抽核」与 F1 闭包对双引号/副作用导入的覆盖（P3，见 §6）。

### 5.6 设计一致性 — 通过

| 依据 | 复检结论 |
|---|---|
| DEC-025 决策①（边界层三件套 + 探测三消费） | 维持；D2 已落地，005/CI 消费仍为声明性预留（R1 备注保留） |
| DEC-025 决策③（D2 自检日志） | 维持；F4 使载荷归因随契约修订自动跟进 |
| DEC-026 A3（inject 收敛、非 breaking） | 维持，且 F2 补齐了「后到自愈」这一 A3 的隐含前提；`非 breaking` 的剩余依赖（`ctx.get` 语义）已由契约 `ctxGetSemantics.status='unverified'` 如实标注 |
| P-10（宿主耦合入契约） | 契约同步齐备：F2/F3/F4/F5/F6/F7 均有对应契约或 smoke 断言；面 1 file/line 未受扰动（B9） |
| P-01/P-02/P-04 | P-02 的缺口（打包面）已修复并把断言固化；P-01 体现在 `unverified` + 残余风险如实披露 |

### 5.7 AI 代码专项 5 项 — 全部通过

| 项 | 结论 | 依据 |
|---|---|---|
| mock 残留 | **无** | 生产代码仍无 test double；stub 仅存在于我的临时探针（已删除），未入仓 |
| 硬编码 | **已修复** | F4 去除任务名字面量；F1 去除逐文件清单（改目录前缀）；探测清单仍由契约驱动（R1 结论保持） |
| 幻觉 API | **未发现** | 本轮新增 API 面为 0（`snapshotLocale` 只调用既有的 `ctx.get`/`getSnapshot`；`store.set({})` 为仓内既有 API，语义已读码证实）；F3 的语义依赖已如实登记 `unverified` |
| 未实现 TODO | **无** | 新增代码无 `TODO`/`FIXME`；契约 `ctxGetSemantics` 用显式 `status` 字段承载「待验证」而非 TODO 占位（符合 P-01） |
| 过度实现 | **未发现** | `files` 由 3 条精确条目**收敛**为 1 条目录前缀（净减少）；F2 复用既有监听器与 store（零新机制）；F6 一行；F7 为文档/注释级；smoke 新增断言与修复一一对应 |

---

## 6. 本轮发现（新 ID，全部非阻断）

### N1 — P3｜F5 强口径正则漏 `this.ctx.<标识符>`（覆盖缝）

- **位置**：`test/smoke.mjs` 收口① `/(?<![.\w$])ctx\.[A-Za-z_$]/g`。
- **事实依据**：node 实测——`'ctx.get(1)'` 命中；**`'this.ctx.get(1)'` → `null`**（lookbehind 把前导 `.` 也排除了），而 R1 的独立口径 `[^a-zA-Z0-9_$]ctx\.` 能命中。`lib/index.js` 的类方法**正在使用** `this.ctx`（如 `loggerOf(this.ctx)`、`emitChanged(this.ctx, …)`），故 `this.ctx.get('webServer')` 是现实的未来书写形态；该形态将同时绕过强口径（①）与补充面（①b 仅列 9 类具体名）。
- **影响**：非产品缺陷（当前 index.js 两种口径均 0 命中），但强口径未完整覆盖其设立目的（「一切形态」）。
- **建议**：改为 `/(?<![\w$])ctx\.[A-Za-z_$]/g`（可同时命中 bare `ctx.` 与 `this.ctx.`，仍排除 `myctx.` 一类词内误配）。

### N2 — P3｜契约 2.12 / 2.13 的 `line` 范围偏移（承继 R1，本次未修正）

- **位置**：`lib/host-contract.mjs` item 2.12 `line: 'L4391-4397'`、item 2.13 `line: 'L4422-4454'`。
- **事实依据**：真实构造行 = 2.12 `ctx.on('internal/service')` **L4403-4408**（现范围止于 L4397，指在紧邻注释块，偏差 −6；R1 偏差为 −2）；2.13 槽位注册段 **L4429-4461**（现范围起点 L4422 落在无关行 `window.addEventListener('dsh:split-claim', …)`，终点 L4454 未覆盖第 6 处注册 L4458；偏移 −7 **在 R1 已存在**，本次 +19 机械重基如实保留）。
- **影响**：维护者按行定位会落到注释/无关行；smoke F5 只校验行形态、`≤` 文件总行数与「每面 1 项锚点」（face 2 锚点 = 2.1，起点精确），故未暴露。
- **建议**：精确化为 2.12 → `L4403-4408`、2.13 → `L4429-4461`；并在 smoke F5 增「范围型 line 的起止行内容非纯注释且命中构造」抽核（成本低、可防同类漂移）。

### N3 — P3｜宿主侧槽位标签的刷新依赖「宿主重渲染自身 shell」

- **位置**：`lib/client.js:4381`（惰性 `t`）+ `4404`（`rerender()`）。
- **事实依据**：`rerender()` 经 `store.set({})` 只通知**我们自己**的 store 订阅者（自有 React 组件）；宿主渲染的槽位标签（`settings.section` / `sidebar.footer.action` / `shell.overlay` 的 `label()`）由宿主调用，仅当宿主在 locale 变化后重渲染其 shell 才会刷新。我们已实现**必要条件**（label 渲染期惰性取值，smoke ④b 实测 zh⇒en），但「宿主会重渲染」这一前提在本仓无证据（与 R1-F3 同类：宿主加载器语义不可复核）。
- **影响**：若宿主不重渲染自身 shell，宿主侧标签可能滞后到下一次自然重渲染（自有组件已即时刷新）。属可接受降级，但应如实披露。
- **建议**：在契约 item 2.13 或 `ctxGetSemantics` 邻位补一句「宿主侧标签刷新依赖宿主重渲染；本侧保证 label 为渲染期惰性取值」；如条件允许，005 诊断面板/真机验收时观察一次 locale 切换即可闭环。

### N4 — P3｜locale **撤离**保持最后快照：已披露但未入契约

- **位置**：`lib/client.js:143-158`（注释已如实说明「撤离保持最后快照，避免热重载期间标签抖动」）+ `4404`（撤离事件同样触发一次空重渲染，无害）。
- **事实依据**：代码注释披露完备；契约 `regionLiterals`/item 2.3 未登记该行为边界。
- **建议**：作为「已知边界」登记进契约（与 N3 可合并一条），保持「实现边界 ⟷ 契约声明」一致。

---

## 7. 非阻断备注

1. **门禁复跑范围**：`node test/smoke.mjs` 由本人独立复跑（258/0，B1）；`node --check` / `validate-preset 29/29` / `ci-mock-face 4/4` 未复跑（自述 + Coordinator 复跑覆盖；本轮审查预算优先投入打包面第一手实证与 line 抽核）。
2. **F1 的更强形态（可选）**：`files: ["lib/", …]` 已结构性覆盖，但发布前仍建议一次性 `npm pack --dry-run` 复核（本报告 B2 已并跑等价检查）。
3. **F3 的 `status: 'unverified'`**：属**已接受**的残余（R1 要求「可对账面或补证据」已满足）；若要转为 `verified`，需宿主 cordis 源码摘录或真机观测，建议并入 COMPAT-005 诊断面板任务。
4. **FIND-1~4 未回退**：本轮改动未触碰 fixtures/extract/golden；smoke 全绿且 FIND-1 info 串与 FIND-3 三处过筛点断言仍在册（B1 复跑证据链一致）。
5. **本报告未覆盖**：宿主 client loader 的模块级 `dsh.client.inject` 顺序语义（无源码可及 → N3）；005 诊断面板/CI 轨对 `detectHostCapabilities` 的实际消费（尚未实现）。
6. **Developer 披露项处置汇总**：① 契约 line 重基 → 抽核 31 处，29 精确、2 处为 R1 承继偏移（§3.1 / N2）；② `ctxGetSemantics.status='unverified'` → 接受（F3 已按「可对账面 + 诚实状态」修复）；③ locale 撤离保持最后快照 → 代码已披露、契约未登记（N4）；④ pnpm `file:` / npm `git+file:` 两通道 → **本轮逐条补跑并闭环**（B5/B5b）。

---

## 8. 结论与后续

**APPROVED_WITH_NOTES（`unresolved_blockers = 0`）** — R1 的 P0/P1 阻断项均已修复并经本人第一手独立证据闭环（打包安装通道加载成功；locale 后到自愈链路含真实重渲染扳机）；F3/F4/F6/F7 已修复；F5 已实质修复。本轮 4 条 P3（N1 正则覆盖缝、N2 两处 line 范围偏移、N3/N4 两处行为边界披露）**不阻断**合并，建议随手纳入下一次改动或 COMPAT-005（诊断面板）一并收口。

**门禁建议**：本 commit 可 push/合并（最大风险项已由**四通道实证**排除：tarball 清单 / 隔离安装 / **加载实测** / git 与 pnpm 两通道补跑）；合并前可选执行 N1 一行修正（正则去掉 `\.`）+ N2 两处 line 精确化（纯契约/测试侧，零产品风险）。
