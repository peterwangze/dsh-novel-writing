# COMPAT-004 代码审查报告（R1）

> **Round**：R1（本任务首轮代码审查；非前轮复审）
> **前轮引用**：`docs/review/COMPAT-011-R1.md`（REVIEW-COMPAT-011-R1，其 FIND-1~4 为本次被修项的定义源）；`docs/review/COMPAT-001-R1.md`（F3/F7 口径源）
> **审查对象**：commit `932adf5`（"COMPAT-004: 宿主边界层"，10 文件 +625/−99，未 push；工作区 = commit 后状态，`git status --porcelain` 仅 `.governance/` 两文件被 Coordinator 改动，`lib/`、`test/`、`package.json` 均无未提交改动）
> **审查人**：Code Reviewer Agent（只读；未修改任何仓库文件，唯一写入 = 本报告）
> **审查方式**：diff 逐行读 + 独立复算（不采纳自述）——边界层 231 行全文逐行、index.js/client.js diff 逐点比对、独立 grep 全量枚举（非复用自述模式表）、独立重跑 smoke、**打包通道三法实证**（npm pack / pnpm file: / npm git+file:，全部在临时目录 + 环境变量重定向隔离执行，脚本 `--ignore-scripts`，未触碰仓库与 $HOME 配置）
> **日期**：2026-09-12

---

## 1. 终态结论

**NEEDS_CHANGE** — `unresolved_blockers = 2`（**P0 × 1** + P1 × 1；硬门槛「P0 阻塞 = 0」不通过 ⇒ 结论必为 NEEDS_CHANGE）。

**P0 一句话**：新增的 `lib/host-boundary.js` 与它运行时依赖的 `lib/host-contract.mjs` **未登记进 `package.json` 的 `files`**，导致**打包安装通道（README 主通道 = `dsh plugin add <git>`，以及 npm 包名 / `file:` 通道）装出来的插件缺 `lib/host-boundary.js`，`lib/index.js` 静态 import 直接 `ERR_MODULE_NOT_FOUND`——插件在用户侧完全无法加载**；而本次全部门禁（`node --check` / `validate-preset` / `ci-mock-face` / `smoke 248/0`）都在**源码工作区**执行，对打包面零信号，故四门禁全绿仍掩盖该缺陷。

本轮审查**未发现** index.js 行为等价性、收口完整性（含独立更强口径复核）、探测同步性、BC-05 安全边界、契约同步（P-10）方面的问题——这些维度全部独立复算通过（§3）。P0 与 P1 之外的发现见 §6。

---

## 2. 硬门槛裁决表

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **1**（F1 打包面缺失，§6） | ❌ |
| 5 维度全覆盖 | 100% | 5/5 逐项结论（§4.1~§4.5） | ✅ |
| 每条发现标注级别 | 100% | 7/7 发现均带 P0~P3 标签 | ✅ |
| 设计一致性检查 | 已完成 | DEC-025 决策①③ + DEC-026 A3 + P-10（§5） | ✅ |
| AI 代码专项 5 项 | 全部完成 | 5/5 逐项结论（§4.6） | ✅ |

---

## 3. 独立复算证据（非采纳自述）

| # | 复算项 | 方法（只读/隔离） | 实测结果 | 与自述一致？ |
|---|---|---|---|---|
| A1 | 「宿主调用 100% 收口」独立性 | **不复用自述 9 类模式表**，独立枚举 `lib/index.js` 代码面全部 `ctx.<prop>` 属性访问 + `@deepseek-ai/` import + 宿主字面量 | 代码面 `ctx.<prop>` = **0 命中**（比 9 类模式**更强**：9 类模式只覆盖已列举形态，本口径覆盖一切形态）；`@deepseek-ai/` = 0；`resolveDshHome`/`.agent-presets` 仅 **2 处**（L8 文件头、L48 JSDoc，均注释） | ✅（自述「9 类 0 命中 + 2 处注释」成立且被更强口径证实） |
| A2 | `BOUNDARY_MAP` 键集 ≡ 契约面 1 可收口项 | 机读 `items[]` face===1 逐项比对 + 读边界全文核对 14 符号是否真实导出 | 面 1 共 11 项；可收口 = 1.1/1.2/1.3/**1.5**/1.6/1.7/1.8/1.9/1.10（1.4 `eliminated`、1.11 `lib/tools.js` 行）——**与 `BOUNDARY_MAP` 9 键逐项一致**；14 符号（`Service`,`z`,`presetRoot`,`presetDir`,`hostInject`,`registerSettings`,`readSettings`,`SERVICE_NAME`,`getWebServer`,`registerRoute`,`onLifecycle`,`loggerOf`,`logWarn`,`emitChanged`）**全部真实导出**（L24/L32/L45/L48/L51/L55/L60/L66/L71/L76/L82/L87/L92/L98/L103 逐行核对） | ✅ |
| A3 | index.js 行为等价性（重点①） | diff 逐行读 + 13 处调用点逐点语义比对 | 13 处**全部为纯搬运/改名**：`super(ctx,SERVICE_NAME)`≡`'novel-writing'`（L45 常量值核对）、`readSettings`≡`ctx.settings.get`、`loggerOf`≡`ctx.logger`、`emitChanged`≡`ctx.emit('novel-writing/changed')`（`EVENT_CHANGED` L48 字面量核对）、`presetRoot/presetDir`≡`join(resolveDshHome(),'.agent-presets'[,id])`、`registerRoute`≡`webServer.register`、`registerSettings`≡`ctx.settings.register`、`getWebServer`≡`ctx.get('webServer')`、`onLifecycle`≡`ctx.effect`、`logWarn`≡`ctx.logger?.warn`。**无参数序变化、无错误处理变更、无返回值语义变化**（`registerRoute` 返回值原为丢弃、现仍丢弃）；唯一新增 = `selfCheckHost(ctx)`（L1442，位于 `service.ctx = ctx` 之后、`return service` 之前） | ✅ 行为等价重构成立 |
| A4 | 探测同步性（F7 / 重点③） | 边界全文正则复核 `await`/`import(`/`fetch(`/`document.`/`window.`/`setTimeout` + 逐行读判据表 | **0 命中**（唯一命中 L169 为注释文本）；判据实现仅 `typeof`/`ctx.get`/`ctx.settings` 属性访问/数组字面量，全部 O(1) 同步；`safeGet`（L109-115）try/catch 仅探测期 | ✅ 零 await / 零动态 import / 零网络 / 零 DOM |
| A5 | 探测项 ≡ 契约 face 1 投影 | 机读 `hostContract.items` + 读 `detectHostCapabilities` 循环（L175-188 遍历契约而非硬编码清单） | 循环 `for (const it of hostContract.items) { if (it.face !== 1) continue }` ⇒ 清单**来源即契约**（非硬编码枚举）；11 项同序；未列判据项落 `unprobed`（`ok:null` + 原因），**不静默判绿**；`1.4`/`1.11` 原因字符串与契约 necessity 口径一致 | ✅（AI 专项「硬编码」项的关键反证） |
| A6 | 契约 item 1.8 路由数订正 13→12 | 独立计数 `registerHttp`（L1235）至 `api('preset-sync'`（L1364）内 `api('...')` 注册点 | **恰 12**：overview/novel/chapter/gate/request/novel-create/novel-delete/file/request-done/publish/data/preset-sync | ✅ 订正属实（原 13 为底稿计数错误） |
| A7 | 门禁独立性（smoke） | 自行执行 `node test/smoke.mjs` | **248 passed, 0 failed，exit 0**；含 17 项 COMPAT-004 新断言全绿；FIND-1 info 实测串 `1.1✓T3 / 2.1✓T1 / 3.1✓T1 / 4.1✓T1 / 5.1✓T1 / 6.1✓T3 ⇒ T3/T1/T1/T1/T1/T3` | ✅（与 Coordinator 复跑一致；历史 231 项零回归成立） |
| A8 | **打包通道完整性（P0 来源）** | 三法隔离实证（临时目录 + `npm_config_cache`/`userconfig`/`PNPM_HOME`/`XDG_*` 全部重定向至临时目录，`--ignore-scripts`）：① `npm pack --dry-run` ② `pnpm install file:<repo>`（pnpm 11.22.0）③ `npm install git+file:///<repo>`（= README 主通道 `dsh plugin add <git>` 的等价本地形态） | 三法**一致缺文件**：tarball 的 `lib/` 仅 `client.js`/`index.js`/`tools.js`；pnpm 安装后 `node_modules/dsh-novel-writing/lib/` 仅这 3 个文件；npm git 安装同；随后加载实测 → **`ERR_MODULE_NOT_FOUND: Cannot find module ...\lib\host-boundary.js imported from ...\lib\index.js`** | ❌ **P0（新建：F1）** |
| A9 | A3 双路径断言强度（是否真空） | 读 smoke 新段构造 + 读 client.js 消费点 | 两路径**构造不同 ctx**（路径 B `get: () => undefined`；路径 A `locale→{getSnapshot:()=>({active:'en'})}`、`connection→{api:legacyApiStub}`）并断言**不同标签**（`小说写作` vs `Novel Writing`）+ 6 席注册 + `cleanup` 为函数 ⇒ 非真空；且先跑「缺」路径（`localeValue` 模块级初始态）再跑「在」路径，规避跨用例状态污染 | ✅ 断言有实义 |
| A10 | BC-05 安全边界（重点②） | 读 `warnCompatReport` L208-224 逐字段核对 + smoke 敏感正则交叉 | 载荷字段 = `task`/`stage`/`host(=null)`/`domains`/`services`/`methods`/`items`/`unprobed`/`counts`——全部为**名称字符串 / 布尔 / 数字 / null**；无路径、无 token、无宿主配置值、无用户数据；`detail` 仅在报告内部（未进告警） | ✅ |
| A11 | 单次性（不刷屏） | 读调用链 `apply → selfCheckHost → warnCompatReport`（index.js L1442 单点；`selfCheckHost` 每次调用恰一次 + 无缺面 `return false` 不输出） | 每次 apply 恰一次 `console.warn`；满面 0 次（smoke 告警③ 断言 `warnEmpty.length === 0`） | ✅（附 F-备注：无跨 apply 去重，见 §7） |
| A12 | 「恰一 hunk」声明（client.js） | `git show 932adf5 -- lib/client.js` | **恰 1 个 hunk（@@ -4347,7 +4347,14 @@）**：+7/−1（6 行注释 + 1 行 `inject` 变更）；`makeHostApi`/legacyApi 分支（L531-532）**零改动** | ✅ |

> A8 的隔离声明：三个探测全部在 `%TEMP%` 新建目录内进行，仓库工作树只读；`npm_config_cache` / `npm_config_userconfig` / `PNPM_HOME` / `XDG_DATA_HOME` / `XDG_CACHE_HOME` / `XDG_CONFIG_HOME` 均重定向至临时目录；`--ignore-scripts` 确保未执行被装包脚本；探测产物已删除。**未触碰 `$HOME` 配置目录、未修改仓库任何文件**（每命令逐条留痕于本报告）。

---

## 4. 审查维度逐项结论

### 4.1 正确性（重点）

| 子项 | 结论 | 依据 |
|---|---|---|
| ① index.js 行为等价性 | **通过** | A3：13 处调用点纯搬运；无逻辑改写/参数序变化/错误处理变更 |
| ② BOUNDARY_MAP 完整性 & 无绕过路径 | **通过（强口径）** | A1：独立枚举确认 index.js 代码面 **零 `ctx.<prop>` 属性访问、零宿主包 import**；A2：映射键 ≡ 契约可收口 9 项、14 符号全真实存在且被消费 |
| ③ detectHostCapabilities 同步性 + 投影一致性 | **通过** | A4（零 await/import()/网络/DOM，O(1) 判据）+ A5（清单来自契约而非硬编码，11 项同序，未探测项如实入 `unprobed`） |
| ④ A3 安全性（降级路径真实性） | **通过 + 保留项（F2）** | `connection === undefined` → `makeHostApi` 第二参 undefined（L4371）→ `legacyApi = undefined`（L532）→ 各域回退返回 undefined → `apiHas` false → 既有 degraded/「API 不可用」路径（L1292/L1316/L3747 等）；slot 硬依赖 **恰当**（UI 挂载通道无替代路径，`ctx.slots.inject/register` L4410-4419 必需）。**保留项**：locale/connection 为 apply 期**一次性快照**且无自愈（F2） |
| ⑤ 契约面 1 file/line 改指边界后自洽（P-10） | **通过** | 面 1 十项 file 改指 `lib/host-boundary.js` 且行号逐一核对命中（1.1→L18、1.2→L17、1.3→L19 调用点 L98/L103、1.5→L51、1.6→L55、1.7→L45、1.8→L66/L71、1.9→L76、1.10→L92）；index.js 侧行号随 +6 位移同步（1.6 L1429、1.9 L1435、1.10 L154/L121、4.5/5.5 L163-189）；smoke F5 活性 + 锚点（T3/T1/T1/T1/T1/T3 golden）全绿 |

### 4.2 安全性 — **通过**

BC-05 机检成立（A10）：告警载荷仅名称/布尔/数字/null；无路径、token、宿主配置值、用户数据。单次输出不刷屏（A11）。探测期 `safeGet` 吞错**仅限探测**，产品路径一律透传（不静默吞错）——口径清晰且有注释声明（L108）。无注入面、无新增外部输入通道、无权限边界变化（探测为纯读取，零副作用）。

### 4.3 可维护性 — **通过（附 F3/F4/F5）**

- **单点收口达成度：高**。边界文件头（L11-15）显式写入收口纪律（「新增任何宿主耦合字面量/符号 MUST 同步契约 + smoke 对账」），且 smoke ① ② 以**结构性断言**兜底（`@deepseek-ai/` 零 import + 映射符号真实导出且被消费），非仅文档承诺。
- **双事实源风险：已设计性规避**。契约头注释 L52-54 明确「本契约**不重复登记** boundaryMap，单一事实源 = `BOUNDARY_MAP`」，smoke 断言「键集 ≡ 契约面 1 收口项 + file 全指边界」形成双向锚，漂移会立即变红 ⇒ 无「契约声明 vs 边界实现」双源漂移面。残余缝 = 收口① 断言的自指性（F5）。
- 命名/注释质量：`z`/`Service` re-export 与 `EVENT_CHANGED`/`SERVICE_NAME` 常量消除魔术字符串，职责单一。`@responsibility` 恰 3 句（L4/L7/L9）符合 F3。

### 4.4 性能 — **通过**

apply 期探测 = 11 项模块表面 `typeof` 检查（编译期已解析）+ 2 次 `ctx.get`（对象属性查找）+ 1 次 `ctx.settings` 属性访问 + 若干 `Array.isArray/includes` ⇒ **全部 O(1)**，合计 < 0.1 ms 级；无网络、无布局等待、无轮询、无 promise（A4）。报告对象为每次 apply 一次性分配 11 个小对象，无常驻开销。`lineAtIdx`（extract.mjs）属离线工具，不在运行时路径。

### 4.5 测试覆盖 — **通过（附 F5 强化建议）**

- **+17 断言非真空（构造分析 2 项）**：① A3 双路径用**不同 ctx 构造 + 不同断言值**（A9）；② D2 告警用注入 sink 捕获调用序列，断言**恰 1 次 + 首参 `'[nv-compat]'` + JSON 载荷字段逐项**（`items === '1.6,1.8,1.9,1.10'`），并提供满面零输出的反向断言（A11）。
- **行为等价证据**：248/0 独立复跑（A7），其中历史 231 项零回归——这是行为等价重构最有力的实证（覆盖全量行为测试）。
- **收口断言**：① 9 类模式 grep + ② 零宿主 import + ③ 映射键集/符号双向——三层互补。
- **弱项**：收口① 的模式表**由开发者自列**（自指），对**新形态**直连零信号（F5）；且**无任何断言覆盖打包面**——这正是 F1 未被门禁拦截的机制性原因（建议随 F1 一并补断言）。

### 4.6 AI 代码专项 5 项

| 项 | 结论 | 依据 |
|---|---|---|
| mock 残留 | **无** | 生产代码零 test double；`sink = console` 为依赖注入默认参（L208/L227），测试侧注入伪 sink 属正当 DI；无 `stub`/`fake`/`spy` 残留 |
| 硬编码 | **通过 + 1 项（F4）** | 探测清单**非硬编码**（循环契约 `items`，A5）；`FACE1_PROBES` 的判据是必要代码（谓词无法数据化）；宿主耦合字面量（`'settings'`/`'webServer'`/`'novel-writing/changed'`/`.agent-presets`/三个宿主包名/`'slots'`/`'connection'`/`'locale'`）**全部在契约登记面内**（items 1.1-1.3/1.5/1.6/1.8/1.10、2.3、regionLiterals、5.5）；**瑕疵**：载荷 `task: 'COMPAT-004'` 硬编码任务名（F4） |
| 幻觉 API | **未发现（附 F3 证据缺口）** | 边界调用的 7 类宿主 API 全部**搬迁自既有可用调用点**（`ctx.settings.register/get`、`ctx.get`、`webServer.register`、`ctx.effect`、`ctx.logger?.warn`、`ctx.emit`、`resolveDshHome`）——非新引入；常量值逐一核对（`SERVICE_NAME='novel-writing'`、`EVENT_CHANGED='novel-writing/changed'`）。抽验 3 项：`resolveDshHome`（在契约 `requiredExports` + CI mock 面内）、`webServer.register`（既有降级分支共存）、`ctx.effect(fn,label)`（调用形参逐字一致）。**`ctx.get(...)` 对未注入服务「返回 undefined 而非抛错」的宿主语义引用（client.js L4352-4354）未能在本环境复核**（F3） |
| 未实现 TODO | **无** | `lib/host-boundary.js` 全文 `TODO`/`FIXME`/`XXX` = 0；`unprobed`/`notCovered`/`host.version=null` 均带原因字符串（如实披露，非 TODO 占位） |
| 过度实现 | **未发现** | 231 行 = 文件头 25 + 14 符号包装 ~85 + 探测 ~77 + 告警/自检 ~24；`BOUNDARY_MAP` 为验收项「收口映射表齐备」要求且被 smoke 消费；`FACES_NOT_COVERED_AT_APPLY`/`versionNote` 为 BC-01「反虚假安全感」要求。唯一预置性导出 = `EVENT_CHANGED`（§7 备注） |

---

## 5. 设计一致性检查

| 依据 | 要求 | 实现 | 裁决 |
|---|---|---|---|
| DEC-025 决策①（边界层三件套） | 契约声明（`host-contract.mjs`）/ boundary·region 适配（`host-boundary.js`）/ `detectHostCapabilities` 三消费 | 契约 ✓ 既有；边界层 ✓ 新建且依赖方向 = 产品 → 边界 → 契约（L21）；探测 ✓ 全同步。**三消费**：D2 启动警告 ✓ 已落地；005 诊断面板 / CI 轨 = 接口就绪**待消费**（边界头注释 L8 如实标注「单一实现三消费方」） | ✅ 一致（两消费方为后续任务，属声明性预留） |
| DEC-025 决策③（D2 自检日志） | apply 期结构化自检告警 | `apply` L1442 `selfCheckHost(ctx)` → 缺面单次 `[nv-compat]` + JSON；无缺面静默；不阻断加载 | ✅ |
| DEC-026 A3 | inject 收敛立即执行、**非 breaking** | `inject=['slots']`（L4357）恰一 hunk；legacyApi 回退零改动；双路径不崩溃 | ✅ 已执行（「非 breaking」结论见 F2/F3 保留项） |
| P-10（宿主耦合入契约） | 新增/修改宿主耦合字面量 MUST 同步契约 + smoke 对账 | 面 1 十项 file/line 改指边界；2.3 inject 同步；`regionLiterals.serviceNames.inject=['slots']` + `ctxGet` 保留 connection/locale；`revisions` 入册 COMPAT-004；line 改指后索引活性由 smoke F5 + 锚点 golden 看护 | ✅ |
| P-01/P-04/P-09 | 事实驱动 / 测试看护 / 不偷工减料 | 门禁四件套齐备且本轮独立复跑通过；`unprobed`/`notCovered`/`host.version=null` 如实披露不猜（TP-4） | ✅（P-02 有缺口 → F1，见 §6） |

---

## 6. 发现列表

### F1 — P0（阻塞）｜打包面缺文件：插件在打包安装通道**完全无法加载**

- **位置**：`package.json:30-39`（`files` 数组）；未登记文件：`lib/host-boundary.js`（新增，231 行）、`lib/host-contract.mjs`（既有，本次**首次成为运行时依赖**）；触发点：`lib/index.js:20-24`（静态 import `./host-boundary.js`）→ `lib/host-boundary.js:21`（静态 import `./host-contract.mjs`）。
- **事实依据（三法实证，A8）**：
  1. `npm pack --dry-run` → tarball 内 `lib/` 仅 `client.js`（315.5 kB）/`index.js`（68.2 kB）/`tools.js`（21.2 kB）；
  2. `pnpm install file:<repo>`（pnpm 11.22.0，隔离目录）→ `node_modules/dsh-novel-writing/lib/` 仅上述 3 文件；
  3. `npm install git+file:///<repo>`（= README §45-55 主通道 `dsh plugin add peterwangze/dsh-novel-writing`「从 GitHub 安装」的等价形态）→ 同上，且**加载实测**：`ERR_MODULE_NOT_FOUND: Cannot find module ...\lib\host-boundary.js imported from ...\lib\index.js`。
- **影响**：任何走 npm/pnpm 打包语义的安装通道（README **推荐**的 GitHub 安装、npm 包名安装、`file:` 内容寻址安装；以及未来的 `npm publish`）装出的插件**无法加载**——不是降级、是整插件失效（服务端 `apply` 根本不执行：无设置节、无路由、无预设同步）。当前 `install.ps1`/`install.sh` 的 junction/拷贝通道（拷贝源码目录）**不受影响**——这也是本缺陷至今未被本地实机发现的原因。
- **机制性原因（为何四门禁全绿）**：`node --check`/`validate-preset`/`ci-mock-face`/`smoke` 全部在**源码工作区**执行，测试目录不在 `files` 语义内 ⇒ 门禁对打包面零覆盖。`git status` clean + 未 push，缺陷尚未流入用户侧。
- **建议修复**（最小必要 + 泛化防护，P-05）：
  1. `package.json` `files` 增 `"lib/host-boundary.js"`、`"lib/host-contract.mjs"`（或直接收敛为 `"lib/"`，避免同类遗漏复发）；
  2. **补 smoke 断言（防复发，泛化口径）**：解析 `lib/` 下所有相对 import（`from './x'`）⇒ 断言其目标文件均被 `files` 覆盖；并断言 `npm pack` 清单 ⊇ 运行时闭包（可用 `npm-packlist` 或对 `files` 做静态核对，避免引入新依赖）；
  3. 修复后复跑 `npm pack --dry-run` 确认 `lib/` 四文件齐全（≥4），并复跑 smoke 全绿；
  4. **发布前门禁**：把「打包面断言」纳入发布检查清单（P-03 发布通道回归项）。

### F2 — P1（警告）｜A3 后 locale/connection 为 apply 期一次性快照，服务后到时**永久降级且无自愈路径**

- **位置**：`lib/client.js:4361-4367`（apply 内 `ctx.get('locale')` → `localeValue = snap.active`，唯一写入点）、`lib/client.js:140`（模块级 `localeValue = 'zh'`）、`lib/client.js:4360` + `4371`（`connection` 同为止快照，仅用于 legacy 面）；对照 `lib/client.js:4384-4390`（`internal/service` 监听器**只处理 `sessions`**）。
- **事实依据**：本文件自身已记录该宿主的「服务后到」事实——L4376-4378（BUG-005）：**「旧绑定在服务后到的宿主上恒为 null = 永久降级」**，故 `sessions` 改为 `ctx.get` 惰性 + `internal/service` 重解析 + `refresh()`。A3 使 `locale`/`connection` 与 `sessions` 进入**同一类别**（三者均不在 `inject` 内），但 `locale` 仍为 apply 期快照：若宿主在模块 `apply` 之后才注册 `locale`，渲染期 `makeT(localeSnapshot())`（L2183/L2459/L3187/L3733 等）将**永久使用 zh**，且无重渲染扳机（`degraded` 派生自 `launcher.sessions`，不含 locale）。
- **影响**：宿主有 locale 服务却显示中文标签（静默降级，非崩溃、无数据风险）；`connection` 同类问题只影响旧宿主 legacy 回退面（影响较小）。
- **说明（可能的降级依据，未有证据）**：`package.json:21-28` 的 bundle 级 `dsh.client.inject` 含 `@deepseek-ai/dsh-client-locale`，**若**该字段保证依赖模块的**服务**在依赖方 `apply` 前注册，则本项风险仅为理论值——但该语义在本仓/本环境**无证据**（client.js L4352-4354 的引用只涉及 `get()` 抛错语义，不涉及注册顺序）。
- **建议修复**（择一）：① 复用既有 `internal/service` 监听器（`name === 'locale'` → 重快照 `localeValue` + 触发重渲染），与 `sessions` 处理同构（最小改动、零新机制）；② 改为渲染期惰性取值（`makeT` 内按需 `ctx.get('locale')?.getSnapshot()`，注意保持纯渲染），则 `localeValue` 只作兜底；③ 若维持快照语义，MUST 补证据（宿主 loader 顺序的源码/fixture 级引用）并在契约 `regionLiterals`/item 2.3 注记「locale 为 apply 期快照，后到不生效」的**已知边界**。

### F3 — P2（警告）｜探测/降级依据的宿主语义引用不可复核（注释为唯一事实源）

- **位置**：`lib/host-boundary.js:132-133`（1.6 探测形态依据「属性访问必可用」）、`lib/client.js:4352-4354`（「宿主只读闭包 `cordis/lib/index.js` L762-771：`get(name, strict)` 对未提供/未注入服务返回 undefined 而非抛错」）。
- **事实依据**：本环境**未能取得**宿主 cordis 源码（`C:\Users\peter\.dsh` 递归 glob + 仓库 `node_modules` 均无 `cordis/lib/index.js`）；三份 fixtures 只记录导出名/类继承/方法名，**不含** `get()` 的抛错语义；仓库内无该语义的对账断言。A3「非 breaking」的**主要**支撑因此是（a）代码注释级引用 +（b）仓内先例：`sessions` 自 BUG-005 起即以 `ctx.get` 取非 inject 服务且在生产运行（L1200/L4371/L4387/L4407）。
- **影响**：未来若宿主改变 `get()` 语义（改为抛错），A3 会从「降级」变为「客户端 apply 抛错 → 插件不挂载」，且**无任何门禁信号**。
- **建议修复**：把该语义纳入可对账证据面——在 fixtures/契约增加形状标记（如 cordis 侧 `ctxGetMissingService` 语义）或把宿主源码该片段摘录入 EVD 证据；并在 smoke 增「边界探测对 `ctx.get` 抛错场景不崩」的构造断言（`get: () => { throw ... }` → `safeGet` 兜底，该路径目前**未被测试覆盖**）。

### F4 — P2（警告）｜告警载荷硬编码任务名 `task: 'COMPAT-004'`

- **位置**：`lib/host-boundary.js:212`。
- **事实依据**：`task` 为字面量 `'COMPAT-004'`，而 `stage: 'server-apply'` 亦为字面量；该载荷是长期运行的诊断输出（005/CI 消费方将解析它）。
- **影响**：后续 compat 任务（COMPAT-005/006…）沿用本层时，日志会把一切缺面误标为 `COMPAT-004`，污染诊断归因（用户侧排障时误判为已知旧任务问题）。
- **建议修复**：改为从 `package.json` 版本/契约 `task` 字段派生（如 `hostContract.revisions.at(-1).task`），或删除 `task` 字段改由日志前缀承载。

### F5 — P3（建议）｜收口①断言自指：模式表由开发者自列，对新形态直连零信号

- **位置**：`test/smoke.mjs`（COMPAT-004 段 `DIRECT_HOST` 九项模式表）；对照：本次复审的更强口径（A1：index.js 代码面 **零 `ctx.<prop>` 属性访问**）。
- **事实依据**：9 类模式只能命中「已列举形态」；例如未来新增 `ctx.on(...)`/`ctx.inject(...)`/`ctx.provide(...)`/`this.ctx.tools` 等**未列举**形态，收口① 仍全绿（收口② 的「零 `@deepseek-ai/` import」可兜住需宿主包导入的情形，但挡不住 `ctx.*` 类）。
- **建议修复**：把断言口径升级为「`lib/index.js` 代码面（剥注释）不存在任何 `ctx.<标识符>` 属性访问 + 不存在 `@deepseek-ai/` import」——本次已实证该口径在现状下成立（0 命中），可直接固化，使一切新形态自动暴露。

### F6 — P3（建议）｜`inject` 与边界共享同一数组引用

- **位置**：`lib/index.js:36`（`export const inject = hostInject`）← `lib/host-boundary.js:51`。
- **事实依据**：`hostInject` 同时被探测判据 1.5 读取（L129）。宿主加载器/任何消费方若**就地修改**该数组（`push/splice`），边界模块状态与探测结果会被静默污染。
- **建议修复**：`export const inject = [...hostInject]`（冻结亦可：`Object.freeze(hostInject)`）。

### F7 — P3（建议）｜`lib/tools.js` 不在边界范围，宜显式防误读

- **位置**：`lib/host-boundary.js:4-6`（`@responsibility 1` 已限定「收口 `lib/index.js`」）+ 契约 face 1 `scope`（已含 `lib/tools.js`）。
- **事实依据**：`lib/tools.js:17/22/46` 仍直连 `@deepseek-ai/dsh-tools` + `ctx.tools`（契约 1.11 `out-of-boundary-scope`）。当前表述准确；但「服务端调用 100% 收口」的措辞在跨文档引用（CHANGELOG/契约 note）时有被读成「全服务端」的余地。
- **建议修复**：在 CHANGELOG/契约 1.11 note 处统一写「`lib/index.js` 宿主调用 100% 收口；`lib/tools.js`（1.11）按轴①独立评估，不在本层」。

---

## 7. 非阻断备注

1. **门禁独立复跑**：smoke 248/0（exit 0）由本人独立执行确认；`node --check`/`validate-preset`/`ci-mock-face` 未复跑（自述 + Coordinator 复跑已覆盖；本轮审查重点不在此，且预算内优先投入独立枚举与打包实证）。
2. **单次告警的边界**：`selfCheckHost` 每次 `apply` 恰一次；宿主若因配置热重载多次 `apply`，则每次一条告警——文件头「每次 apply 恰一次」表述**准确**，非缺陷；如需全局仅一次，可加模块级 flag（当前无必要）。
3. **`EVENT_CHANGED` 为预置导出**：仅边界内部使用（L93），导出服务于 005 诊断/未来消费方；非过度实现，登记备查。
4. **DEC-025 决策① 的「三消费方」**：只有 D2 已落地，005 诊断面板 / CI 轨为**声明性预留**（边界头注释已如实标注），建议在 COMPAT-005 立项时把「消费 `detectHostCapabilities` 输出」写成验收项，避免接口长期空转。
5. **FIND-1~4 落地核验**（前轮承接项）：FIND-1 golden 实测 `T3/T1/T1/T1/T1/T3` ✓（A7 独立复跑输出）；FIND-2 头注释清单订正 ✓（diff L43-56）；FIND-3 `methodNamesExcludedByKeyword` 恒存在 + 三处过筛点 `DisposableList.delete@L17`/`Fiber.await@L1398`/`RegistryService.delete@L1564` ✓（smoke 断言 + 读 diff 确认 `methodsOf` 传 `baseIdx`/`lineAt` 且 `lineAtIdx` 按 1 基行号换算、`stripComments` 改等量空白替换保行结构）；FIND-4 已知边界披露（正则字面量/嵌套模板串 + 「当前未触发」+ 根治路径）✓。**FIND-3 附带风险提示**：`stripComments` 的块注释替换为等量空白（保长度）与行注释整行删除并存——行号语义正确（块注释保换行、行注释不删换行），但**外提到「每行长度不变」的假设不成立**，后续若有人依赖列偏移需注意（当前无消费方）。
6. **未采纳的自述项（无独立证据，故不计入对本任务的判定）**：`ci-mock-face 4/4 exit 0`、`validate-preset 29/29`（读代码层未发现与本次改动耦合，风险低）。
7. **本报告未覆盖**：005 诊断面板/CI 轨消费实现（尚未存在）、宿主 client loader 顺序语义（无源码可及，见 F3）。

---

## 8. R2 复审必查项（供 Coordinator 派发）

| # | 复审项 | 通过判据 |
|---|---|---|
| 1 | F1 修复 | `package.json files` 含 `lib/host-boundary.js` + `lib/host-contract.mjs`（或 `lib/`）；`npm pack --dry-run` 显示 `lib/` ≥ 4 文件；smoke 新增「相对 import ⊆ files」断言且全绿；隔离环境实测（临时目录）安装后 `import('dsh-novel-writing')` 成功 |
| 2 | F2 修复 | `locale` 具备后到自愈（`internal/service` 重快照或渲染期惰性）**或**契约/item 2.3 明示「apply 期快照，后到不生效」的已披露边界 + 证据；smoke 增「locale 后到」构造断言 |
| 3 | F3 修复或降级 | `ctx.get` 抛错路径有构造断言（`safeGet` 兜底）且不崩；宿主语义引用有可对账证据（fixture/契约字段或 EVD 摘录） |
| 4 | F4 修复 | 载荷不再硬编码 `COMPAT-004` |
| 5 | 回归 | `node --check` ×N / `validate-preset` / `ci-mock-face` / smoke 全绿；`lib/` 其余行为零回归；未引入新的打包面遗漏 |
| 6 | 前轮一致性 | 本报告 F1~F7 逐条标注「已修复/未修复/新引入」；FIND-1~4 保持落地（不得回退） |

---

**审查结论**：**NEEDS_CHANGE**（`unresolved_blockers = 2`：F1 P0 + F2 P1）。F1 为**发布前必须修复**项（插件在打包安装通道整插件失效），修复面极小（`package.json` 两行 + 一条防复发断言）；F2 建议同轮修复（与既有 `sessions` 处理同构，改动小）。其余 5 条为非阻断改进项。
