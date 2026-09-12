# REVIEW-COMPAT-005-R1 — COMPAT-005（D1 设置页诊断面板）后置代码审查

> **Round**：R1（本任务首轮）
> **前轮引用**：无同任务前轮；相关前置 = `docs/review/COMPAT-004-R2.md`（N1/N2/N3/N4 来源）与 REVIEW-COMPAT-004-R1 F5/F7（探测清单强口径 / 收口范围口径）
> **审查对象**：commit `dca8add`（`git show --numstat` 本轮实测：`lib/client.js` **+371/−3**、`test/smoke.mjs` **+164/−0**、`lib/host-contract.mjs` **+48/−21**、`lib/index.js` **+34/−1**、`CHANGELOG.md` **+10/−0**，合计 **+627/−25**；恰 **5 路径**）
> **审查基线事实**：审查时 HEAD 已前移 `d2fbcc9`（`--numstat` 实测仅 `.governance/evidence-log.md` +1、`.governance/plan-tracker.md` +2/−2）——**未触碰 5 条审查路径**，故本轮结论对当前 HEAD 有效；`git status --porcelain` 为空
> **简报基线订正（P-01）**：任务简报表格记 `lib/client.js +374` / `lib/host-contract.mjs +69/−25`，与 `--numstat` 实测（`+371/−3` / `+48/−21`）不一致——合计 `+627/−25` 与简报一致，差异在**分文件归集**，不影响任何结论（不作为发现项）
> **结论**：**NEEDS_CHANGE**（P0=**1** / P1=**1** / P2=**2** / P3=**5**）。P0 阻塞 > 0 ⇒ 硬门槛未通过。`unresolved_blockers` 字段 **n/a**——该字段仅 `APPROVED_WITH_NOTES`（通过终态）需要；本结论为**非终态**，Coordinator 收到后 MUST 退回 Developer 修复并重 spawn 本 Reviewer 复审（R2，round<3）

---

## 0. 审查方法与证据边界（如实披露）

- 本轮**只读**：`read` / `grep` + 只读 git（`show --numstat`、`log`、`status`）。**未执行任何测试或写操作**（角色工具约束禁命令执行）——`smoke 271/0`、`node --check ×7=0`、`validate-preset 29/29` **不由本轮独立复跑**，采信 Coordinator 复跑声明。
- 本报告全部行号/文本均为**本轮实读**所得，不转写 Developer 自述。凡未读到的标「未核」。
- **未核项（本轮无法验证，与 Developer 遗留②同源）**：面板**真机/浏览器渲染**结果（环境无运行中宿主）——本轮只核到源码结构与纯函数投影；`.nv-diag*` 实际视觉呈现、`data-phase` 实际命中数均**未核**。
- 破坏性红线：不适用（唯一写入 = 本报告）。

---

## 1. 硬门槛裁决

| 门槛项 | 阈值 | 本轮实测 | 判定 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **1**（F1，§5） | ❌ |
| 5 维度全覆盖 | = 100% | 5/5 逐项结论（§4.1~§4.5） | ✅ |
| 每条发现标注级别 | = 100% | 9/9 均标 P0~P3（§5） | ✅ |
| 设计一致性 | 已完成 | 契约投影方向、BC-05 口径、DEC-021 令牌派生、P-10 登记面**逐项实读比对**（§3） | ✅（偏差见 F1/F2/F3） |
| AI 代码专项 5 项 | 全部完成 | §4.6 五项逐一有结论 | ✅ |

---

## 2. 行政核验：路径与授权范围（承接节点）

| 项 | 内容 | 本轮核验 | 判定 |
|---|---|---|---|
| 路径数 5（简报写「恰四路径」） | `lib/client.js` / `lib/index.js` / `lib/host-contract.mjs` / `test/smoke.mjs` / `CHANGELOG.md` | `--numstat` 恰 5 路径 ✓；CHANGELOG 属验收⑥「CHANGELOG 留档」要求 | **裁量认可** |
| `lib/index.js` 超出「恰四路径」 | 范围①「若需新增字段走既有 webServer 路由模式」授权 | 实读 `lib/index.js:1237-1297`（`api()` 辅助）与 `:1376-1400`（新路由）——**完全落在既有 `registerHttp` 路由模式内**，只读、无新机制、无新依赖注入 | **授权内，认可**（附带架构观察 F7b） |
| C-05 commit 原子性 | 一个 commit 一个问题 | 5 路径同属 D1（代码+测试+契约+留档+CHANGELOG），无跨任务夹带 ✓ | ✅ |

---

## 3. 重点核验项（BC-05 + 契约投影）逐项推演

### 3.1 契约投影真实性（非硬编码第二事实源）—— **主体成立，一处等价关系缺口**
- `buildDiagReport`（`lib/client.js:2358-2446`）实读：`rows` 全部来自入参 `server.report.probes`（`:2388-2392`）与 `CLIENT_PROBES` 运行期求值（`:2366-2369`）；`faces` 由入参 `server.contract.faces` + `itemMeta`（`:2377-2380`、`:2417-2424`）计算；**无任何硬编码状态清单 / 无硬编码绿**。面板侧只做展示（`:2479-2528`）✓。
- 面 4/5/6「零探测仅摘要」**属实且诚实**：`probed=0`、`notCovered = inFace − probed`，未覆盖格渲染为 `未覆盖` chip（`:2417-2424`、`:2517`），未伪造任何 ok/missing——`未覆盖 29 = 48 − 19` 的算术本轮独立复算成立（面 1 十一项 + 客户端八项 = 19；6+5+5+7+6 = 29）✓。
- **缺口**：`D_PROBE_ITEM`（`:2290-2299`，client.js 侧 item 映射）与契约 `clientProbes[].item`/`kind`（`host-contract.mjs:212-220` 实读：契约侧**同时登记**了 `item`、`probe`、`mode`、`kind`）**无等价断言**——见 **F3**。

### 3.2 BC-05 载荷边界 —— **机检覆盖面不足，且实测载荷已含仓内相对路径**
- 路由对 `report` **原样透传**（`lib/index.js:1385-1387`：`return { ok: true, report, contract: {...} }`）；客户端亦原样透传 `unprobed`（`lib/client.js:2437`）并**渲染其 `reason`**（`:2495-2496`）。当前运行期该字段内容为 `host-boundary.js:155-159` 的 `FACE1_UNPROBED_REASONS['1.11']` = 「out-of-boundary-scope（dsh-tools/ctx.tools 属 **lib/tools.js** 行，边界静态面不含该包）」——**含仓内相对源文件路径与 `.js` 后缀，确实出网关**。
- `contract.items` 侧收紧**属实**（`lib/index.js:1397` 只取 `item/face/kind/necessity`）✓；`symbol` 不出网关 ✓（本轮实读确认）。
- 机检只覆盖**客户端投影子集**：`smoke.mjs:2562` 的 `payload5` 仅 `{ rows, faces, checks, style, notCovered, minSupport.text }`，**不含 `unprobed`**（正是承载上述路径的字段）；`hasFileLine5`（`:2564`）含 `.js` 模式但作用域不含该字段；`smoke.mjs:2530-2550` 的 fixture 把 `unprobed[].reason` 构造为 `'retired'`（真实运行期值含 `lib/tools.js`）⇒ fixture 掩盖真实形态。D1⑥（`:2635-2640`）只对**源码文本**做 `it.file|it.line` 正则 + `items:` 映射行匹配，**不约束 `report` 出网内容**。
- **构造分析（简报要求的「加到 `file` 字段断言是否变红」）**：给 `report.probes[i]` 增加 `file: 'lib/client.js'` ⇒ `rows` 投影显式挑选字段（`:2391` 只取 `mode/domain/service/method/detail`）**丢弃该字段** ⇒ D1② 仍**绿**；而真网关载荷（`report` 原样）**会**泄漏 ⇒ **该断言不绑定网关边界**。见 **F2**。

### 3.3 RB-03 代理信号（验收③）—— **真实旧宿主上恒不触发（F1，P0）**
- `diagMinSupportSignal`（`lib/client.js:2340-2350`）判据 = `remoteIds.some(`probe ok===true`)` 为假 **且** `legacy-connection-api` ok 为真。
- 但五个 `remote-*` 探针（`:2304-2308`）求值对象是 **makeHostApi 的 facade**，而 facade 在 remote.\* 缺席时**原样返回旧表面域对象**（`:655` settings / `:671` sessions / `:680` workspace / `:719` host / `:728` agentPresets）——探针测的正是**这些旧对象的方法面**。
- 本仓**自证**：`test/smoke.mjs:1436-1441`（BUG-004 旧宿主回退用例）构造的真实旧表面 = `legacySettings {describe,update,mutate}` / `legacySessions {create,prompt,cancel}` / `legacyWorkspace {list,create}` / `legacyHost {pickDirectory,…}` / `legacyPresets {select}` —— **五个探针谓词在其上全部为 true**（`:1443` 还断言了「五域对象原样透传」）。`lib/client.js:2212` 亦以 `api.settings.describe` 是否存在作为可用性判据，佐证旧宿主该面在场。
- ⇒ 在真实 ≤0.1.x 宿主上 `remotePresent = true` ⇒ **`triggered` 恒 false**，文案永不出现；同时面板会把契约 **2.5/2.6/2.7/2.8/2.9（kind=remote-namespace）五行报成「可用」**，并在 `diagRbNone` 文案（zh `:325` / en `:491`）中宣称「remote.\* 与旧连接载体 .api 至少其一在场」——与事实相反（**假绿**）。
- 该信号只在「connection 载体在 **且** 五个域对象方法全缺」这一**不自洽形态**下触发——恰是 `smoke.mjs:2578` 的构造（`{settings:{}, sessions:{}, workspace:{}, host:{}, agentPresets:{}}` 空域对象）。**构造不可复现于真实宿主边界**（旧宿主域对象非空壳），故 D1③「触发」分句是**不可达场景的绿灯**。

### 3.4 N3/N4 / `recheck` 契约登记 —— **准确**
- item `2.13` note 实读：N3 = 宿主侧标签刷新依赖「宿主在 locale 变化后重渲染自身 shell」+「前提未证实」+ 本侧仅保证必要条件（`label` 渲染期惰性，`client.js:4741-4743` 实读一致）；N4 = locale 撤离保持最后一次快照。与 `smoke.mjs:2656-2664` 断言一致 ✓，与实现一致（`internal/service` 监听器 `:4763-4770`：`locale` 分支 `snapshotLocale + rerender`，撤离不回退 zh）✓。
- `ctxGetSemantics.recheck` 实读存在且**诚实**：status 仍 `unverified`，写明「本轮未取得新证据」+ 转 verified 判据（宿主源码摘录或真机观测二者之一）；`smoke.mjs:2665-2670` 有 GUARD 防虚假转 verified ✓。
- 契约 `clientProbes[]` 8 项与 `clientProbesNote`（面 2 六项 + 面 3 两项；48 项分解 11/13/8/6/5/5）本轮复算自洽 ✓；1.8「路由数 12→13」本轮独立清点 `api(` 注册点 = 12 + `compat` = **13** ✓。

---

## 4. 五维度 + AI 专项结论

### 4.1 正确性 —— **不通过（F1 P0 + F3 P2 + F7 P3）**
三态投影、边界（null/undefined/数组守卫）、失败路径（探测抛错 → `checks=[]` + `checkErr` 展示；路由 `{ok:false}` 不冒泡 500，`lib/index.js:1378-1384` + 框架 `:1292-1294`）均正确。**但 RB-03 判据在真实场景恒假**（§3.3），构成核心验收项的逻辑错误。路由与 `[nv-compat]` 告警「同源同函数」**属实**（同调 `detectHostCapabilities`，`lib/index.js:1381` vs `host-boundary.js:244`；调用点非同一实例但同一函数体）✓。

### 4.2 安全性 —— **通过（无安全漏洞；边界口径缺口记 F2 P1）**
- 无 XSS 面：`el = react.createElement`（`client.js:99`）为文本子节点渲染，全文件无 `innerHTML`/`dangerouslySetInnerHTML`（grep 0 命中）✓；报告字段全部以文本渲染。
- 无密钥/token/用户数据硬编码；路由沿用既有回环门禁 + `apiPublic` 语义 + 只读（无写入路径、无按钮除刷新）✓；CSRF/POST 门禁未变 ✓。
- 载荷无用户数据 → 非安全事件；但**「路径不出网关」的验收口径与机检不符**（F2），属**验收证据强度**问题而非漏洞。

### 4.3 可维护性 —— **基本通过（F5/F6/F7 为 P3）**
面板复用既有 `title/hint/btn/TK` 与新增 `diagTable` 共用渲染器（`:2532-2541`），与设置页既有 section 模式一致（`title` 头 + `borderTop` 分隔，`:2276-2280`），**未特设第二套范式** ✓。样式为令牌派生 + `color-mix` 兜底双声明（`:4693-4704`，DEC-021）✓。瑕疵：死样式/死 i18n 键、契约 note 内行号残留、契约拼写、index.js 直接 import 契约模块（F5/F6/F7）。

### 4.4 性能 —— **通过**
`buildDiagReport` 为 O(契约项 + 探针) 线性投影，无嵌套扫描；`diagStyleProbe` 为两次正则 `match`（`:2324-2332`）；服务端 `detectHostCapabilities` 全同步、零 I/O（`host-boundary.js:178-208`）；路由无缓存但成本恒定；面板 `useEffect(..., [])` 仅挂载时取一次 + 手动刷新（`:2464`、`:2485`），父级重渲染不重挂载（元素类型/位置稳定，无 key 抖动）✓。无 N+1 / O(n²)。

### 4.5 测试覆盖 —— **不通过（F2/F3/F4）**
9 条断言（`smoke.mjs:2514-2671`）中：D1①（可达性）、D1④ 的**契约↔运行期键集为真双向集相等**（`:2613-2614` sorted JSON 比对）、D1④ 的**源码提取面**（`:2601-2602`，`length===8` + 子集 ⇒ 鸽笼等价）、D1⑤ 算术、D1⑧b 诚实 GUARD 均**有效**。不足：D1② 扫描子集不含 `unprobed` 且 fixture 用净化 reason（F2）；D_PROBE_ITEM ↔ 契约 `item`/`kind` 无等价断言（F3）；D1③ 三形态读数实际由测试**自身的 `makeHostApi` 调用**决定，**未覆盖 apply 装配路径**（F4）；D1⑥/⑦ 为**源码文本匹配**而非行为断言（路由失败路径未以行为方式驱动，F4 附注）。**回归防护**：Developer 自述缺陷②（域对象 vs 连接服务）由 `:2576-2577` 注释 + 构造形态守护；缺陷①（TDZ 类）**无回归断言**（见 F4）。

### 4.6 AI 代码专项 5 项
| 项 | 结论 |
|---|---|
| mock 残留 | **无**——产品代码（client.js/index.js）零 mock；fixture 仅在 smoke ✓ |
| 硬编码返回值 | **§ 报告项无硬编码状态清单**（§3.1 实读成立）；但 `D_PROBE_ITEM` 为客户端侧 item 清单，与契约 `clientProbes[].item` 无等价断言（F3）；`diagDesc` 文案硬编码 `lib/host-contract.mjs`（用户可见文案内的仓内路径引用，P3 备注） |
| 幻觉 API | **未发现**——本轮抽验的契约/宿主要素全部真实：`clientProbes[]` ✓、`ctxGetSemantics.recheck` ✓、item 2.13 N3/N4 ✓、1.8 路由数 13 ✓、`detectHostCapabilities` 存在且被两处消费 ✓、`makeHostApi` legacy 回退六处行号 ✓（`:627/655/671/680/719/728` 逐点实读准确） |
| 未实现 TODO | **无**——D1 段内 grep 无 TODO/FIXME；面 4/5/6 未实现面以**数量摘要 + 未覆盖 chip** 显式披露，非静默 ✓ |
| 过度实现 | **+371 行分布合理**（i18n 70 / 面板+投影 264 / 样式 14 / 导出 7 / 早段标记 8+4+1），无投机抽象；但有可裁剪冗余（F6：死样式 2 条、死 i18n 键 4×2、unprobed 行重复展示） |

---

## 5. 发现列表（9 条，全部含文件:行号）

### F1 — **P0 阻塞**｜RB-03 代理信号在真实旧宿主上恒不触发，且面板对契约 2.5~2.9 报假绿
- **位置**：`lib/client.js:2340-2350`（`diagMinSupportSignal`）、`:2304-2308`（五个 `remote-*` 探针谓词）、`:655`/`:671`/`:680`/`:719`/`:728`（facade 旧表面回退）
- **事实依据**：探针求值对象 = facade 域对象；facade 在 remote.\* 缺席时返回**旧宿主域对象本身**。本仓自己的真实旧表面 fixture（`test/smoke.mjs:1436-1441`，并被 `:1443` 断言「五域原样透传」）在五个谓词上**全部为 true**；故 `remotePresent === true` ⇒ `triggered === false`。D1③ 的触发分句依赖 `:2578` 的**空壳域对象**构造，真实旧宿主不可能出现该形态。
- **影响**：① 验收③（RB-03 代理信号）在目标场景**不可达**，CHANGELOG/契约/面板文案均宣称有效；② 面板客户端自检段把契约 **2.5/2.6/2.7/2.8/2.9（remote-namespace）报成「可用」**，并在 `diagRbNone` 宣称「remote.\* 在场」——**诊断面板自身产出假绿**，与 BC-01/BC-05 的反虚假安全感口径相悖。
- **修复建议**（二选一，均需补构造 (d)）：① 让面板拿到**原始服务面**：apply 侧把 `ctx.get` 解析器随 `SettingsPage` 传下（`base` 增字段），`remote-*` 探针改为对 `remote.settings|remote.session|remote.workspace|workspaces|remote.directoryPicker|remote.agentPresets` 的**原始在场性**求值；② 在 `makeHostApi` 同点（`:626-631`）同时记录 `hostRemoteNamespace`（remote.\* / workspaces 命中与否，与 `hostLegacyApiSurface` 对称），探针改读该标记。facade 可用性可另设独立探针（如 `api-settings-usable`）以免与代际判定混淆。
- **必备补充断言**：(d) 真实旧表面 fixture（域对象**带方法**）→ MUST `triggered === true`；(e) 新宿主（remote.\* 就位）→ MUST false。现 D1③ 的 (a) 应改造或替换为 (d)。

### F2 — **P1 关键**｜BC-05 载荷机检不绑定网关边界，且实测网关载荷已含仓内相对源路径
- **位置**：`lib/index.js:1385-1387`（`report` 原样出网）、`lib/host-boundary.js:155-159`（`'1.11'` reason 含 `lib/tools.js`）、`lib/client.js:2437` + `:2495-2496`（`unprobed` 透传并渲染）、`test/smoke.mjs:2562`/`:2564`/`:2541`/`:2635-2640`
- **事实依据**：① `payload5` 扫描字段集**不含 `unprobed`**（承载真实路径的字段）；② fixture 把 `unprobed[].reason` 净化为 `'retired'`；③ 构造分析：给 `report.probes[i]` 加 `file` 字段 → rows 投影丢弃 → D1② 仍绿，而真载荷泄漏（路由不裁剪 `report`）；④ D1⑥ 只做源码文本正则。
- **影响**：验收②「仅布尔/名称/版本——无路径/file/line 泄漏」被认证的范围**小于**其宣称范围；面板实际渲染仓内相对路径片段。敏感度低（非用户数据/非绝对路径/非宿主路径），故非 P0。
- **修复建议**：① 出网侧裁剪：`report.unprobed[].reason` 改为枚举码（`retired` / `out-of-boundary-scope` / `no-runtime-predicate`，`notCovered` 同理）或将 `reason` 移出载荷；或 ② 机检侧改为对**真实路由产出**（handler 返回值）整体扫描，并新增**正向对照断言**（在 fixture 的 `probes[]`/`unprobed[]` 注入 `file:'x.js'` ⇒ 断言 MUST 变红），使该检查具备已证实的判别力。

### F3 — **P2 建议**｜`D_PROBE_ITEM` 与契约 `clientProbes[].item` 无等价断言（双事实源残余）
- **位置**：`lib/client.js:2290-2299`（映射）/ `lib/host-contract.mjs:212-220`（契约 `clientProbes[].item`+`kind`）/ `test/smoke.mjs:2606-2617`（仅存在性）
- **事实依据**：D1④ 只断言 `D_PROBE_ITEM[k]` 是字符串且该 item **在册**（`:2616`），未断言 **等于** `clientProbes` 中同 `probe` 的 `item`/`kind`。
- **构造分析**：交换同面两项（如 `remote-settings` ↔ `remote-workspace` 的 `'2.5'`/`'2.7'`）⇒ 面 2 计数、`faces` 算术、`rows` 长度、`checks` 长度**全部不变** ⇒ D1①~⑧b **全绿**，但面板把探针结果归因到错误的契约项（诊断误导）。契约侧 `mode` 字段亦无任何对账。
- **修复建议**：D1④ 增 1 行等价断言：`hc5.clientProbes.every(p => clientExports.D_PROBE_ITEM[p.probe] === p.item && itemById[p.item].kind === p.kind)`。

### F4 — **P2 建议**｜D1③ 未覆盖 apply 装配路径；路由失败路径仅源码文本断言
- **位置**：`test/smoke.mjs:2582-2589`（三形态）、`:2635-2642`（D1⑥）
- **事实依据**：rbA/rbB/rbC 三读数均在调用 `clientExports.makeHostApi(...)` **之后**取值，而该调用本身即会写入模块标记（`lib/client.js:631`）——`runClientApply` 的装配结果**不参与**断言。⇒ Developer 自述缺陷①（标记误置导致探针恒读 false）**无回归断言**：把 `:631` 删除后三条断言仍绿（因测试自建 facade 会补写标记）。
- **修复建议**：(a) 在 `runClientApply(...)` 之后**先**直接读 `clientExports.CLIENT_PROBES['legacy-connection-api']()`（不新建 facade）断言 ok=true，再继续原流程；(b) 路由失败路径改写为行为断言——以 `ctx = undefined` 直接调用 `api('compat')` 的 handler（或经 `registerRoute` 捕获的 handler）并断言 `{ok:false,error:'probe-unavailable'}`。

### F5 — **P3 讨论**｜契约重基后 note 内嵌行号残留旧值（字段值经抽验正确）
- **位置**：`lib/host-contract.mjs` item `2.3` note（「现 L4723-L4725」）vs 字段 `L4734-L4736`；item `3.1` note（「现 L908-916」）vs 字段 `L920-928`；item `3.6` note（「现 L1004-1027 / L3360」）vs 字段 `L1018-1042 / L3635`（且「L1004-1027」与 3.3 字段撞车）；item `1.8` note（本 commit 新写）内 `index.js L1437` 实际 `logWarn` 在 **L1470**、「D1 段 → L1368-1400」实际路由段 **L1369-1401**（`api('compat')` 在 L1376）
- **事实依据**：字段值抽验**正确**（3.1 真值 `client.js:920` `/**` → `:928` `}` ✓；3.4 `L779-792` = TK 表 ✓；2.4 `L627/655/671/680/719/728` 六处 ✓；2.13 `L4790-4822` 六 inject/六 register ✓）⇒ 属**注释内部**不一致（非机检面）。note 内「现 L…」值系统性偏向 +70 偏移（少计 `:560`/`:621` 两处早段 hunk 的 +8/+4）。
- **修复建议**：归入 COMPAT-014 同一批次订正（Developer 已声明 index.js 旧行号类遗留；本条把 note 内嵌 client.js 引用一并纳入），避免「已重基」表述被读成 note 亦已重基。

### F6 — **P3 讨论**｜死样式 / 死 i18n 键 / 重复展示（冗余，非缺陷）
- **位置**：`.nv-diag-sub`（`lib/client.js:4703`）无引用；`.nv-diag-tbl code`（`:4697`）无引用（全文件无 `el('code'`）；i18n `diagStOk`/`diagStMissing`/`diagStUnprobed`/`diagNotDetected`（zh `:319-322` / en `:485-489`）无引用；`diagUnprobedRow` 汇总行（`:2495-2496`）与 rows 中已标 `unprobed` chip 的行**重复展示**同一事实
- **修复建议**：整批删除死样式/死键（-10 行），或补用其一处；重复展示可保留（诊断冗余阅读友好），但建议二者选一以省垂直空间。`el` 为 `createElement`，删除不影响渲染安全。

### F7 — **P3 讨论**｜契约拼写 + index.js 直接 import 契约 + 同一派生式两处重复
- **位置**：`lib/host-contract.mjs`（`clientProbes` 中 `dom-observers` note「**bindow** 环境」→ 应为 `browser`）；`lib/index.js:23`（新增 `import { hostContract } from './host-contract.mjs'`）；`lib/index.js:1393-1395` 与 `lib/host-boundary.js:215-217`（同一「revisions 末项 → task」派生式两份）
- **说明与建议**：契约模块现被**边界层与产品代码双重导入**——不违反 COMPAT-004 的 9 类宿主直连口径（契约非宿主包），但与「index.js 唯一依赖 = 边界层」的收敛方向略有出入（C-01/C-02）；建议后续在边界导出投影函数（如 `contractProjection()`）并复用 `CONTRACT_TASK`，同时消除重复派生式。拼写 `bindow` 建议顺手订正。

### F8 — **P3 讨论**｜探针单点抛错时全量丢弃已完成结果（健壮性）
- **位置**：`lib/client.js:2364-2370`（`try { checks = Object.keys(...).map(...) } catch { checkErr = ... }`）
- **事实依据**：任一探针抛错 ⇒ `checks = []` ⇒ 面 2/3 全部退化为「未覆盖」，而错误原因仅显示在客户端段 11px 尾行（`:2501-2504`）。
- **修复建议**：逐项 try（保留已完成项 + 该项 `ok:null`），使降级更精确、错误可见性与其影响相称。

### F9 — **P3 讨论**｜`diagDesc` 用户可见文案内硬编码仓内路径
- **位置**：`lib/client.js:296`（zh）/ `:462`（en）——文案含 `lib/host-contract.mjs`
- **说明**：非载荷字段、非用户数据，安全无碍；但与「载荷不含路径」的对外口径并列时易被误读，且仓内路径改名即文案失真。建议改为「宿主契约声明面」等不含路径的表述。

---

## 6. 非阻断备注（不构成发现）

1. **`smoke 271/0` 数值自洽性**：历史 262 + 本批 9 = 271 与本轮清点的 9 条 D1 断言（①/②/③/④/⑤/⑥/⑦/⑧/⑧b）一致 ✓（采信 Coordinator 复跑，未独立执行）。
2. **`hostLegacyApiSurface` 设计取向**：以 apply 期一次性快照判定连接载体**代际**（而非 `api.*` 形状反推）**方向正确**——`:563-569` 的注释理由成立（新表面 facade 同样填 `api.settings` 等域，形状反推会把新宿主误判为旧表面）；问题（F1）**仅**出在另一半判据（remote.\* 由 facade 形状求值），不是方向错误。修复时请保留 `legacy-connection-api` 的标记式判定。
3. **`recheck` / N3 / N4 的诚实度值得保留**：本轮未取得新证据即维持 `unverified` 并写明转 verified 判据，符合 P-01；`smoke:2665-2670` 的 GUARD 是有效防回退设计，同类「不允许虚假升级」断言建议在后续任务沿用。
4. **`report` 与 `contract` 双份契约元数据**：路由同时回传 `report.contract`（计数）与 `contract`（投影），面板只消费后者；无冲突（`itemMeta` 以 `contract.items` 为准，`:2377-2380`），仅冗余。
5. **`face1` unprobed 行的 `probed` 计数语义**：`faces[1].probed`（`:2419`）含 `ok=null` 的未探测项，故 `notCovered` 对未探测项不计——面板以独立 `未探测` 列如实呈现（`:2423`、`:2516`），不构成误导；若后续要「覆盖率」语义，建议单列 `unprobed` 与 `notCovered` 的口径说明。

---

## 7. 复审（R2）检查清单（供 Coordinator 回派）

1. **F1**：真实旧表面 fixture（域对象**带方法**）→ `triggered === true`；新宿主 → false；D1③ 构造改造后三点全绿；面板 2.5~2.9 行在旧宿主上 MUST NOT 报「可用」。
2. **F2**：出网载荷裁剪后，对**真实路由产出**整包扫描 + 正向对照断言（注入 `file` ⇒ 红）已入 smoke。
3. **F3**：`D_PROBE_ITEM[p.probe] === p.item` 且 `kind` 对账断言入 D1④。
4. **F4**：`runClientApply` 后直接读 `CLIENT_PROBES['legacy-connection-api']()` 的装配断言；路由失败路径行为断言。
5. **F5~F9**：P3，可遗留（须入 COMPAT-014 或新任务并在 CHANGELOG/契约按同一话术登记），但若 F1/F2 修复触及同文件同段，建议顺手清理 F6/F9。
6. 全量门禁重跑（`node --check` / `validate-preset` / `smoke`）并复跑历史断言零回归。

---

## 8. 结论

**NEEDS_CHANGE**（P0=1 / P1=1 / P2=2 / P3=5）。核心交付物（契约运行时投影、只读路由、三态如实、面 4/5/6 不伪造、N3/N4/recheck 登记、BC-05 的 `contract.items` 收紧）**主体成立且诚实度高**；阻塞项集中于 **RB-03 代理信号在真实旧宿主上不可达并产出假绿（F1）**，以及 **BC-05 机检范围小于其宣称范围且实测载荷已含仓内相对路径（F2）**。二者均在同两处文件内可修，且修复同时能补齐现缺失的构造断言（真实旧表面 fixture / 载荷正向对照）。

`unresolved_blockers` = **n/a**（非通过终态；该字段仅 `APPROVED_WITH_NOTES` 需要）→ Coordinator MUST 退回 Developer 并重 spawn 本 Reviewer 复审（R2）。
