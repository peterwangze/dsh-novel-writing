# CLEAN-007 R1 代码审查报告（Code Reviewer）

- **task**: CLEAN-007 ｜ **round**: **R1** ｜ **date**: 2026-09-15 ｜ **reviewer**: Code-Reviewer
- **审查对象**: commit **`874e5a1`**（`CLEAN-007: UX-012 R1 备注批次…`；`git show --stat` = 6 文件 **+1351/−102**：`lib/client.js`（5018→5198，+180 行）、`lib/host-contract.mjs`（37 行改动）、`test/smoke.mjs`（+79）、`scripts/probe-nv-ux012.mjs`（新增 989 行）、`CHANGELOG.md`（+11）、`README.md`（5））
- **前轮引用（本批承接）**: `docs/review/UX-012-R1.md`（`APPROVED_WITH_NOTES` / `unresolved_blockers=0`）的 F2/F3/F4/F5/F6/F7/F9 + `docs/evidence/CLEAN-004/DEFECTS.md` §1 缺陷 **D-1**（P3，用户可见）
- **工作树一致性**: `git status --porcelain` = 仅 `.governance/**`（父级在途治理写入）⇒ **产品面干净**；`git log origin/main..HEAD` = **恰 1 条**（`874e5a1`，未 push）
- **只读边界（实读声明）**: 本次审查**只读**，唯一写入 = 本报告。执行的命令：`git show/--stat/status/log/diff`、`node --check`（18 文件）、`node test/smoke.mjs`、`node test/validate-preset.mjs`、`node scripts/probe-nv-ux012.mjs --falsifiability`、`node -e`（契约重算/锚点唯一性/报告机读比对）、读 `%TEMP%\clean007-verify\**`。**未**改仓库任何文件（除本报告）、**未** `git commit`、**未**对 `C:\Users\peter\.dsh` 写入、**未**关停/接管任何进程、**未**创建子 agent、**未**申请沙箱升级。为对比历史版本，曾把 `git show` 的两个 blob 落在 `%TEMP%\clean007-verify\`（仓库外临时目录，非产品面）。
- **前轮 findings 处置对照（复审本质 = 验证修复，逐条给出独立判定）**

| 前轮项 | 本批声明 | 本次独立判定 | 依据 |
|---|---|---|---|
| UX-012-R1 **F2**（创建链双事实源，P2） | 抽 `launcher.createSessionFor` 收口 | **已修复（等价性成立）** | `lib/client.js:1586-1646`（唯一实现）+ `1703`（消费点①）+ `4150`（消费点②）；`let createArg = ` 全仓恰 1 处；逐分支比对见 §1-项 2 |
| UX-012-R1 **F3**（取消后残留 dirName，P3） | `closeCreate` 一并复位 `dirName` | **已修复** | `3430`（`setCreating(false); setCreateNotice(''); setDirName('')`）+ Esc 分支改经 `closeCreate()`（`3393`）⇒ 五条关闭路径同点复位；探针 A8 实测 `reopenedValue=''`（`report-ux012.json`） |
| UX-012-R1 **F4**（`sessionsById` 订阅面偏宽，P3） | 收窄为绑定叶 | **已修复（等价 + 更简），但自述的性能理由不成立** | `3835-3837`（叶选择）+ `4040`（`boundEntry = sessionsById`，全仓唯一消费点）；见发现 **C-13**（P3） |
| UX-012-R1 **F5**（`.nv-console` 隐式前提，P3） | CSS 行就地固化前提 | **已修复** | `lib/client.js:4806-4813`（注释块紧贴 `.nv-console{…}` 行，写明禁止 `transform/filter/contain/will-change` 与 z-index 栈上下文） |
| UX-012-R1 **F6**（模态语义/焦点陷阱/归还，P3） | 三处模态补 role/aria-modal + 陷阱 + 归还 | **代码已修复；行为面证据部分无效** | 实现 `587-664`；三处接线 `2821`/`3421`/`4455` 均在各自早退之前；但焦点移动类在宿主 `inert` 下不可测，A6「归还」断言为**真空 PASS** ⇒ 见 **C-3**（P2） |
| UX-012-R1 **F7**（行为级验收未入仓，P3） | 新增 `scripts/probe-nv-ux012.mjs` | **已修复（资产入仓且真行为级为主）**；有 4 项强度/措辞缺口 | 见 §5 与 **C-5/C-6/C-7/C-8**（P3） |
| UX-012-R1 **F9**（`launchMsgOf` 死参，P3） | 删 4 参与其短路分支 | **已修复** | `1530-1533`（3 参签名 + 单判据）；smoke 负断言 `!clientSrc.includes('forceNew')` 且实跑绿 |
| CLEAN-004 **D-1**（绑定面板 Esc 静默失效，P3） | BindDialog 自挂 Esc（只关面板） | **在控制台语境已修复；在分栏语境引入新的「一键关两层」** | 冻结探针 `D2-esc-bind-yield` FAIL→PASS（控制器语境，`{modal:false,console:true}`）；分栏语境见 **C-1**（P1） |

---

## 0. 独立复跑的门禁读数（本次实跑，非转述）

| 门禁 | 命令与结果（本次实跑） | 判定 |
|---|---|---|
| 冒烟 | `node test/smoke.mjs` → `SMOKE DONE: 297 passed, 0 failed`，exit 0；末条 `COMPAT-014 A-F9 README smoke 断言计数同步：声明 297 ≡ 实测 297` 绿 | **PASS**（与任务书期望 297/0 一致） |
| 预设 | `node test/validate-preset.mjs` → `PRESET VALIDATION PASSED（schema-face: PASS）`，exit 0 | **PASS** |
| 语法 | 自写枚举（仓库全部 `.js`/`.mjs`，排除 `node_modules` 与易断 junction）= **18 文件 / 0 failed**（含 6 个改动/新增文件；`ci.yml` 显式列出的 8 个文件全在面内） | **PASS**（自述「14 文件」为子集口径，不矛盾） |
| 可失败性自证 | `node scripts/probe-nv-ux012.mjs --falsifiability` → `FALSIFIABILITY PASS：向量 red=18 ok=8`，8 条谓词 `redsAllFalse=true / oksAllTrue=true / 部署消费点=1`，exit 0 | **PASS** |
| 契约对账 | 随 smoke 的 F8/⑫ 双向 ⊆ 断言（297/0 绿）；另见 §4 独立重算 | **PASS** |

**冻结探针复核（`%TEMP%\clean007-verify\clean004-final\report.json`，只读机读）**：

| 检查项 | 期望 | 实测 | 判定 |
|---|---|---|---|
| `head` | `874e5a1` | `874e5a1cc7d35218fcb241b6d77623c9f7ab716a` | ✅ |
| `headDirty` | false | `false` | ✅ |
| FAIL 计数 | 0 | `tally = {total:49, pass:47, fail:0, na:2}` ⇒ **fail = 0** | ✅ |
| tally | 49 / 47 / 0 / 2 | 49 / 47 / 0 / 2 | ✅ |
| `D2-esc-bind-yield` | `{modal:false, console:true}` | `status=PASS, detail={modal:false,console:true}`（`2026-09-15T00:03:21Z`） | ✅ |
| `B17-esc-layer-yield` | 仍 PASS | `PASS`，detail `{modal:false,console:true}` | ✅ |
| `realEnvVerdict.ok` | true | `true`（`strictDeltas` 空） | ✅ |
| `cleanup.rootRemoved` | true | `true`（隔离根 `clean004-probe-UbjNO9` 已删，证据目录保留） | ✅ |
| 回归面 | 无 PASS→FAIL、无新增 FAIL | 与 CLEAN-004 冻结基线 `docs/evidence/CLEAN-004/report.json`（49/42/4/3）逐条比对：**PASS→非 PASS 回归 0 条**；`FAIL→PASS` 5 条（`D2-esc-bind-yield`/`C3b`/`C9`/`C10` + `C11` N-A→PASS）；断言集无增无删（49 ↔ 49） | ✅ |

> **口径说明（如实标注）**：该报告 `ok=false`。这不是失败信号——CLEAN-004 探针自身定义 `report.ok = 所有断言均为 PASS`（`probe-clean-004.mjs:1893`）且 `exitCode = ok ? 0 : 1`（`:1919`），而本轮 2 条 N-A（`B5` 宿主无会话行 / `D6` 无法构造「切换会话」）按「前置不成立」如实记 N-A ⇒ `ok` 必为 false。任务书判据（FAIL 计数 0 / tally 49/47/0/2）**逐项成立**。

---

## 1. 必核 10 项逐条结论

### 1-1. D-1 修复正确性（本批首要）——**部分通过：控制台语境正确，分栏语境破缺（C-1）**

| 判据 | 结论 | 事实依据 |
|---|---|---|
| 只关面板、控制台保持 | **通过（控制台语境）** | `lib/client.js:2813` `if (e.key === 'Escape' && busy !== true) store.set({ bind: null })`——不触碰 `consoleOpen`；探针 `D2-esc-bind-yield` 实测 `{modal:false,console:true}`；smoke 负断言 `!bindSrc.includes('consoleOpen: false')` |
| `busy` 守卫与既有 `close()` 一致 | **通过** | `close()`（`2825`）= `if (busy !== true) store.set({ bind: null })`，与 `2813` 同一判据同一动作；effect deps `[open, busy]`（`2816`）⇒ `busy` 翻转即重注册，闭包内 `busy` 为**最新值**（无陈旧闭包） |
| 监听器卸载清理 | **通过** | `2815`：cleanup `window.removeEventListener('keydown', onKey)`，与注册同引用同一 `onKey`；`open !== true` 时 effect 早退不注册 |
| hook 恒定调用契约 | **通过** | `const panelRef = useRef(null)`（`2820`）+ `useModalFocus(open, panelRef)`（`2821`）**均位于** `if (open !== true) return null`（`2823`）之前；未对本仓 `props.useSessions` 条件调用形态作任何改动 |
| `L241` aria 承诺与实现一致 | **一致（分层语义成立）** | `closeSplit: '关闭分栏（Esc）'`（`L241`）→ 用作分栏关闭钮 `title`+`aria-label`（`4311`）；非面板态由 `SplitWorkspace` 的全局 Esc（`3937-3943`）兑现，面板态由面板自挂兑现——**但两者叠加时一个 Esc 关两层**（C-1） |
| **未覆盖的让位分支** | **不通过** | 让位条件含 `s.entryOpen === true`（`3389`），而 `WorkspaceDialog` 无自挂 Esc ⇒ 该分支仍「无人接手」（C-2） |

**C-1 事实链（代码级）**：`SplitWorkspace` 的 Esc 监听（`3937-3943`，`if (e.key === 'Escape') closeWorkbench(t)`）**无让位守卫**，且它在分栏激活时即注册；而绑定面板可在**分栏激活**时打开：`launchWorkflow`（控制条主按钮，`4060`/`4065`）与 `compactWf`（`4108`/`4113`）都执行 `store.set({ bind: { novelId, stale } })`，`openCtl.open` 的 stale 分支同样如此（`1686`），侧栏抽屉卡点击亦经同一链（`3031`→`3655`）。三个 window `keydown`（非捕获）监听按**注册顺序**派发 ⇒ 分栏先激活先注册 ⇒ 按 Esc：`closeWorkbench()` 先执行（关掉整个创作台），随后面板监听再执行（关掉面板）⇒ 一次 Esc 连关两层，与 D-1 目标「只关面板」及 B-1 让位层级相悖。**探针未覆盖该语境**：`report-ux012.json` 的 B 段（面板 Esc）在 C 段（开分栏）**之前**执行，故断言时 `.nv-bar` 尚未出现。

### 1-2. F2 收口的行为保持（风险最高项）——**通过（逐分支等价，0 处丢失）**

被替换的两条原路径（`git show 874e5a1^:lib/client.js` 实读 `1543-1588` = `openCtl.autoCreate`；`3965-4008` = `bindNewSessionCtl`）与抽取后的 `launcher.createSessionFor`（`1586-1646`）+ 两消费点（`1703-1712` / `4149-4159`）逐分支比对：

| 分支 | 原路径 | 新实现 | 等价性 |
|---|---|---|---|
| a) 落点 | `ctx.wsRoot`/`root` 非空 → `joinNovelRoot(...,novel.id)` 为 cwd 兜底；`workspace.list` 命中同 path ⇒ `{workspaceId}`；`list` 不可用/异常/未命中 ⇒ 回退 cwd | `rootBasis`（调用方传同一表达式）+ 同一 `find(w => w.path === rootBasis)` + 同款 try/catch 回退 | **逐字等价**（`1565-1575`） |
| b) create | `r1.result.ok !== true` ⇒ `sessionCreatePrefix + rpcErr`；形状不合格 ⇒ `sessionCreatePrefix + unknownErr` | 同文案（`1625-1628`），返回值 `step:'create'` | **逐字等价** |
| c) 预设 | ①`autoCreate`：`apiHas` 守卫，缺域则**跳过**；失败 ⇒ `presetFailPrefix+err+presetFailHint` 且**即停**（不绑定不开）②`bindNewSessionCtl`：无守卫直接调用（前置检查已保证域存在） | `needPreset=false` ⇒ 同①；`needPreset=true` ⇒ 前置检查保证域存在，守卫恒真 ⇒ 同②；失败文案同上且返回 `ok:false`（`1630-1636`） | **等价**（唯一差异=缺域时文案由 `apiError` 参数化为 `sessionsMissing`，与②的既有前置检查同文案：`4143-4146`） |
| d) 绑定 | 失败**不阻断**：`autoCreate` 提示后继续 open+split；`bindNewSessionCtl` 提示 `bindFailPrefix…` | 返回 `{ok:true, bound:false, errorText}`，两个调用方各自决定（`1705` 提示后继续；`4157-4159` 单列 ok/err 且不打开） | **等价** |
| 返回值/顺序 | bind 提示 → `confirmSwitchSelect` → `open` → `ensureSplit` → `autoBindDone` | `1705` → `1706` → `1707` → `1708` → `1710`，**顺序与条件未变** | **等价** |
| 异常面 | 两处外层 `catch` 均为 `sessionCreatePrefix + errOf(e)`；`workspace.list` 单点 try/catch 不吞 create/bind 异常 | `createSessionFor` 只包 `workspace.list`，`create`/`bindSession` 异常上抛至调用方 catch（`1711` / `4160`） | **等价** |
| 两消费点是否真走共享实现 | 卡片自动链 = `openCtl.autoCreate`；控制条 = `bindNewSessionCtl` | 两处均只调 `launcher.createSessionFor(...)`；`launcher.createSessionFor(` 全仓恰 **2** 处、`async createSessionFor(novel, opts)` 恰 **1** 处、`let createArg` 恰 **1** 处（smoke + 探针 C3 双面断言） | **成立** |

**残留（非等价性问题）**：共享实现返回的 `step` 字段两处调用方**均未消费**（`client.js` 内无 `.step` 读取）⇒ 死输出面（C-9，P3）。第三处 `sessions.create`（`2873`，绑定面板「新建会话并绑定」，用户选定 workspace 且带启动选项）与 `agentPresets.select`（`2842`）属**另一语义**，不属 F2 收口面——不计为双事实源。

### 1-3. F6 可访问性件的正确性——**实现正确；证据面有 1 处真空 PASS（C-3）**

| 判据 | 结论 | 依据 |
|---|---|---|
| `modalDialogProps` | 正确 | `587-589`：`{role:'dialog','aria-modal':'true','aria-label':label}`；三处消费（`2935`/`3694`/`4620`），label 分别 = `bindTitleText`/`t('newNovelBtn')`/`t('dialogTitle')`（均非空，i18n 实读：`250`/`256`/`187`） |
| 焦点陷阱候选集 | 正确、无 P-10/性能问题 | `modalFocusables`（`596-611`）用 `getElementsByTagName('*')`+标签/属性过滤：含 `tabindex` 自定义可聚焦、排除 `disabled`/`tabindex=-1`/`aria-hidden=true`/零 `getClientRects`（不可见）；**仅在 Tab 键按下时求值**（每次一次 O(n) 遍历，模态内 n 为个位到数十）⇒ 无性能风险。`regionLiterals.domSelectors` 只对账「非 `.nv-` 前缀的 `querySelector(All)` 字面量」，本处为通用 HTML 可聚焦判定 ⇒ **不新增遗漏登记**，且注释已说明该口径选择（`590-595`） |
| 陷阱逻辑 | 正确 | `640-652`：末位 Tab/首位 Shift+Tab/焦点在模态外 ⇒ `preventDefault` 并聚焦对端；`items.length===0` 或容器缺失 ⇒ 直接放行（不吞键） |
| 焦点归还机制 | **设计正确** | `lastOutsideFocus`（`616`）+ `noteFocusOutside`（`617-625`）由 `apply` 期捕获相位 `focusin` 跟踪器维护（`5114-5121`），清理时移除（`5170-5176`）；注释给出的理由（React `autoFocus` 在 commitMount、先于 `useEffect`）**经本次实读复核成立**（探针实测模态输入框 `focus()` 在宿主 `inert` 下为空操作，`facts.focusTrap.envFocus.modalInputFocus.moved=false`）。归还前 `document.contains(back)` 守卫（`659-660`）避免归还给已 detach 节点 |
| 边界①无历史焦点 | 安全 | `back === null` ⇒ 不归还（无异常），焦点留在原地 |
| 边界②多层模态叠加 | 安全（当前不可达） | `lastOutsideFocus` 为**模块级单变量**，被上层模态吞掉的焦点不会记录；若两模态同时打开，B 的归还目标可能是 A 内部元素。三处模态互斥（遮罩 `position:fixed`+`z-index:1000` 全屏，`4789`/`4933`）⇒ 记录性风险（C-12，P3） |
| 边界③卸载竞态 | 安全 | 归还发生在 effect cleanup（DOM 变更之后），`document.contains` 双保险；`ref.current` 在事件期实时读取 |
| 三处接线一致性 | 通过 | `2821`/`3421`/`4455` 三处调用，均在各自 `return null` 之前；`.nv-cmodal`（`3694`）/`.nv-modal`×2（`2935`/`4620`）语义齐备；smoke 机检「3 处 props + 3 处 hook + 3 处早退顺序」 |

### 1-4. F7 新探针的真实判别力——**通过（真行为级为主），4 项强度/措辞缺口 + 1 处真空 PASS**

- **23 条断言构成（本次逐条读源核验）**：A 面 12 条（几何/语义/卡片点击不自关/重开复位/遮罩关/Esc 分层/焦点归还/焦点陷阱接线+回绕/请求体仅 `{name}`/busy 禁关/创建成功链）、B 面 2 条（面板语义 + D-1）、C 面 3 条（两消费点端到端 + 单点收口结构面）、自证 1 条、隔离 2 条、准备 1 条 = 23 ✓（探针报告 `tally.total=23`）。
- **驱动手段真实**：真 CDP `Input.dispatchKeyEvent`（Esc/Tab/Shift+Tab，`608-616`）、真 `.click()`（`572`）、真 **CDP Fetch 域**挂起/放行真实 `POST /novel-writing/api/novel-create` 并读 `postData`（`830-866`）、真宿主 RPC/HTTP（`fetch('/novel-writing/api/overview')` 读绑定键 `892`、`.nv-ccard` 点击驱动 `openCtl.autoCreate`、`.nv-wfctl-btn2` 驱动第二消费点）。
- **非行为级项（须如实披露）**：`UX012-C3-single-source` 用**正则读 `lib/client.js` 源码**计数（`925-930`）；`readI18n()`（`341-370`）同样读产品源码取期望文案。二者用途正当（结构面 + 文案同源，避免复制字面量），但文件头「断言面**全部**走真实 UI 代码路径…**不做源码字符串直查**」（`L10-11`）与 CHANGELOG 的「断言**全部行为级**」措辞**不准确** ⇒ C-5（P3）。
- **`--falsifiability` 机制成立**：`PREDICATE_REGISTRY`（`75-145`）8 谓词 × **18 red + 8 ok** 向量，`falsifiabilityReport()` 用正则通配 `^red\d*$`/`^ok\d*$` 收集（防静默丢向量），要求每条 ≥1 red 且全 false、≥1 ok 且全 true（`165-170`），并另要求每条 ≥1 处静态部署消费点（`177-182`/`948`）。**本次实跑**：8/8 OK，red=18 ok=8，部署消费点各 1，exit 0。**真空 PASS 复核**：red 向量为「修复前实况」的可构造反例（如 D-1 = `{opened:true,modal:true,console:true}`、F2 = `{defs:0,calls:0,inlineCopies:2}` 与修复前源码实况一致），非恒真；`A9`/`F3`/`C2`/`C1`/`D1-esc` 谓词均含**前置合取**（防空真）。**本次独立发现残留 1 处真空 PASS：`UX012-A6-focus-restore`**（见 C-3）——它**不在**谓词登记表内（直写断言、无 red 向量），故自证机制不覆盖它。
- **2 条 N-A 的归因与标注**：`A1b`（autoFocus 焦点落点）与 `A7b`（Tab 回绕）记 `status='N-A'`（不计 PASS、不计 FAIL，tally 单列 `na:2`）；归因证据 = `facts.focusTrap.envFocus` 的祖先链逐级取证（`.nv-cmodal`→`…→DIV(inert:true)`→`BODY`）+ `modalInputFocus.moved=false` + `triggerFocus.inertAncestor=true` ⇒ **归因成立、标注恰当**（未冒充 PASS）。
- **A7「接线」断言的强度边界**：`tabObserved.prevented===true` 为真实冒泡相位读数（探针在 window 注册非捕获 spy，插件捕获监听先执行）⇒ 证明模态确实吞掉 Tab；但本次实测 `trapProbe.focusMovedToLast=false`（inert 导致无法把焦点移到末位）⇒ 实际走的是「焦点在模态外」分支，而标签写「**末位元素**上真实 Tab」⇒ 标签与实测分支不符（C-8，P3）。

### 1-5. 契约重基（31 处声明）——**通过（29/29 全等价），仅计数声明有误（C-4）**

- **结构面零改动（机读证明）**：`lib/host-contract.mjs` 的 `git diff --unified=0` = **4 hunks / −18 行 / +19 行**；−18 行**全部**含 `line: 'L…'`（18 项 item 行），+18 行同 +**1 行** `revisions[]` 新增（`task: 'CLEAN-007'`）⇒ 文件其余部分逐字节未动。
- **逐项核验**：49 项 ↔ 49 项；`line` 字段变化者**恰 18 项**（2.3、2.4、2.5~2.13、3.1~3.6、3.8），其余 **31 项 byte-identical**（含 2.1/2.2/3.7/4.x/5.3/5.4/5.6/6.x）；18 项的 `kind`/`necessity`/`symbol` 与去掉 `line` 字段后的整块文本**逐字节相同**（0 项有 note/其它字段漂移）；`regionLiterals`（1147 字符）与 `presetRowConfig`（721 字符）**完全相同**；`revisions[]` 6→7 条且含 `CLEAN-007`。
- **独立重算（≥6 处抽核 → 本次做满 18 项 / 29 处）**："范围首/末锚点原文在新文件中唯一命中"法 + 逐行等价：
  - **content 逐行等价 29/29**（旧 `[a,b]` ≡ 新 `[a+Δ,b+Δ]`，长度守恒，**0 处不等价**）；
  - **Δ 分段实测** = +84（早期段）/ +88（2.11）/ +148（3.8）/ +157（3.4-L4711）/ +165（2.3、2.12、3.4-L4854）/ +168（3.6-L3875）/ +175（2.13）——与 `revisions[]` 自述**逐项一致**；
  - **锚点唯一性 29/29**：每处范围存在 ≤3 行**连续**窗口（正/反向）在最终文件唯一命中（含任务书点名的边界：**2.12** `L5090-L5097`、**2.13** `L5127-L5159` 首窗即唯一；**3.4** `L921-L934` 需正向 2 行、**3.5** `L1121-L1133` 需 2 行（首行**是空行**段）、**2.5** 正向 3 行、**3.2** `L1134-1135` 反向 3 行、**3.6** `L3875` 正向 2 行、**3.8** 末行唯一）；
  - **范围处数 = 29**（逐项：2.3×1、2.4×6、2.5~2.13×9、3.1×1、3.2×2、3.3×3、3.4×3、3.5×1、3.6×2、3.8×1 = 29）⇒ 三处文字所写「**31 处**」与实际不符（其自述括号内逐项相加亦为 29）⇒ C-4。
- **伴随订正**：`test/smoke.mjs` 注释内陈旧副本已同步（`L4895-L4897`→`L5060-L5062`、`L2829-2839`→`L2977-L2987` 等 3 行 6 处）；仍有 2 处**叙述性**旧值（`2167`/`2289` 的 `2.3 L4804-L4806`，前者带「原注释/订正」历史限定词属 F3 扫描面豁免、后者因换行断开逃过行内匹配）——不影响任何机检，属 CLEAN-005 已登记的「陈旧副本」残余（P3 观察，不单列发现）。

### 1-6. 回归与门禁（独立复跑）——**全部通过**

见 §0：`smoke 297/0`（含 `声明 297 ≡ 实测 297`）、`validate-preset PASSED（schema-face: PASS）`、`node --check 18 文件 0 failed`、`--falsifiability PASS`。**与 Developer 自述一致**（自述「14 文件」= 其口径子集，本次面更宽仍 0 failed）。

### 1-7. 探针读数复核——**全部通过**（见 §0 冻结探针表）

`head=874e5a1` ✅、`headDirty=false` ✅、`FAIL=0` ✅、`tally 49/47/0/2` ✅、`D2-esc-bind-yield detail={modal:false,console:true}` ✅、`B17 PASS` ✅、`realEnvVerdict.ok=true` ✅、`cleanup.rootRemoved=true` ✅、**无 PASS→FAIL / 无新增 FAIL**（对 CLEAN-004 冻结基线逐条比对）✅。新探针报告（`%TEMP%\clean007-verify\ux012-probe\report-ux012.json`）`tally 23/21/0/2`、`head=d562247`、`headDirty=true`（= **提交前工作树运行**，与 CHANGELOG 自述 `head=d562247` 一致；`headDirty=true` 说明该读数取自未提交工作树，本次已在 `874e5a1` 上独立复跑 `--falsifiability` 与全部门禁）。

### 1-8. P-10 与项目原则——**P-10 通过；P-04/P-05 有 1 项缺口**

| 原则 | 判定 | 依据 |
|---|---|---|
| **P-10 宿主耦合入契约** | **通过** | 本批新增字面量仅：ARIA 属性名（`role`/`aria-modal`/`aria-label`/`aria-hidden`/`tabindex`）、标准 DOM API（`getElementsByTagName`/`closest`/`getClientRects`/`contains`/`focusin`）、自有前缀选择器 `.nv-cmodal, .nv-modal`（契约规则③「自有 `.nv-` 前缀一律排除」）。**无**新宿主导入/API/事件名/槽位名/CSS 令牌。`regionLiterals` 双向 ⊆ 随 smoke 297/0 绿；本次独立复核 `regionLiterals`/`presetRowConfig` 逐字节未改 ⇒ **契约零扩展**成立 |
| **P-04 测试看护** | **部分通过** | 正面：新增 989 行真行为级探针 + smoke 4 条源码面断言 + 历史断言零删除（`check(` 149→153，标签集无删除）。缺口：F6「焦点归还」面呈现真空 PASS（C-3）、分栏语境 Esc 分层零覆盖（C-1 无对应断言）、绑定面板 busy 守卫无行为级覆盖（C-7） |
| **P-05 泛化性** | **不通过（1 处）** | F2 的抽象层选择**正确**（抽共享实现而非单点改）；但 D-1 的「让位后无人接手」**同类只修了一半**——`entryOpen` 分支的 `WorkspaceDialog` 仍旧无 Esc（C-2） |
| **C-02 防架构腐化** | **通过** | 唯一事实源方向：创建链 2 份→1 份；模态语义/焦点逻辑 3 份→公共件；`sessionsById` 收窄与三处同型点对齐；无新增分层倒置或跨层直连 |
| **C-04 修改纯粹性** | **通过** | 6 文件全部服务于本批声明范围；F1（半成品目录回滚，引擎侧既有边界）与 F8（口径订正）**明确排除**并写入 CHANGELOG；契约行号重基系本批落地导致的行号漂移的**必需**伴随订正（授权 A），非顺带改动 |
| **C-05 commit 原子性** | **通过** | 单 commit 承载本批一个整体问题集（含其必需的契约/README/smoke 同步）；未混入其它任务 |

### 1-9. 遗留与坏味道定级

| 项 | 定级 | 结论 |
|---|---|---|
| ① `closeCreate` 在 Esc 回调中被**前向引用**（`3393`，注释 `3391-3392`） | **P3（C-11）** | **无 TDZ 风险**（回调在渲染完成后触发）；更进一步，**守卫实时性成立**：该 effect 的 deps 为 `[open, creating, createBusy]`（`3400`），**与改动前逐字相同**（`git show 874e5a1^` 实读）⇒ `createBusy` 翻转会重注册 effect，闭包内不残留旧 `createBusy`。自述「无 TDZ 风险」**成立**；建议注释补一句「deps 含 createBusy ⇒ 守卫读值实时」以消除后继读者疑虑 |
| ② F6 是否把函数推过既有阈值 | **P3（通过）** | 新增公共件均为小函数（`modalDialogProps` 3 行 / `modalFocusables` ≈16 / `noteFocusOutside` ≈9 / `useModalFocus` ≈28 / `createSessionFor` ≈36 含注释），**均 < 50 行**；组件体量（`NvConsole`/`SplitWorkspace` 数百行）为既有形态，本批**净减**重复逻辑（3 份模态逻辑→1 份） |
| ③ 三处模态是否应进一步抽公共组件（C-03） | **P3（不阻塞）** | 当前粒度（共享 props + hook，保留各自布局/内容）**恰当**：三处模态结构差异大（居中弹窗/绑定面板/工作区对话框），再抽 `<Modal>` 收益有限、形态耦合风险上升。建议留作可选重构，不要求本批 |

### 1-10. AI 专项 5 项 + 真实环境纪律——**通过**（逐项见 §6）

---

## 2. 五维度逐项结论

| 维度 | 结论 | 事实依据 |
|---|---|---|
| **1 正确性** | **PASS（1 处 P1 新引入缺陷）** | D-1 控制台语境行为正确、F2 逐分支等价（§1-2）、F3/F4/F9 语义等价（F4 仅收窄订阅面且唯一消费点等价）；边界：`workspace.list` 异常回退、`create` 异常上抛、`busy` 重入守卫、effect deps 完整（`[open, busy]`/`[open, creating, createBusy]` 均含全部闭包易变量）。**缺陷**：分栏语境 Esc 分层（C-1） |
| **2 安全性** | **PASS** | 无新增输入面：新代码不新增宿主写调用（F2 仅**搬迁**既有调用）；新 DOM 接口均为只读查询（`getElementsByTagName`/`getClientRects`/`contains`/`closest`）；`focusin` 跟踪器只写模块级内存变量；无 `innerHTML`/密钥/外部资源；焦点陷阱不吞 Esc（不阻断用户退出模态） |
| **3 可维护性** | **PASS（3 处 P3）** | 命名达意（`createSessionFor`/`modalFocusables`/`noteFocusOutside`）；注释解释「为何」且与实现一致（含 P-10 口径、autoFocus 时序理由、F5 隐式前提）；重复代码**净减**；`step` 死输出（C-9）、探针死数据（C-10）、`lastOutsideFocus` 边界（C-12） |
| **4 性能** | **PASS** | 陷阱候选集仅在 Tab 键按下时枚举、模态内节点数十级；`sessionsById` 叶选择不增加订阅数（订阅扳机仍为粗粒度 `bump`）；无新增循环/轮询/O(n²)；**注**：F4 自述「任一会话条目变化不再触发创作台子树重渲染」**不成立**（见 C-13） |
| **5 测试覆盖** | **PASS（2 处 P2/P3 缺口）** | 核心路径：C1/C2 两消费点端到端行为级 + A/B 面弹窗与绑定面板行为级 + smoke 4 条源码面 + 契约对账；边界/错误路径：busy 禁关（真实挂起请求）、重开复位、Esc 分层、请求体契约、隔离零写入。缺口：F6 归还面真空 PASS（C-3）、分栏语境 Esc 无覆盖（C-1）、绑定面板 busy 无行为级覆盖（C-7） |

---

## 3. 发现列表（每条含 文件:行号 / 级别 / 事实依据 / 影响 / 建议）

> **P0 = 0**；P1 = 1；P2 = 2；P3 = 9（合计 12 条，**每条均带级别**）。**P0 计数 0 ⇒ 硬门槛第 1 项通过**；**C-1 为本报告建议合并前处理项**（详见 §7）。

| # | 位置（文件:行） | 级别 | 事实依据 | 影响 | 修复建议 |
|---|---|---|---|---|---|
| **C-1** | `lib/client.js:3937-3943`（SplitWorkspace Esc，无让位守卫）vs `:2811-2816`（BindDialog Esc）；触发面 `:4060`/`:4065`（`launchWorkflow`）、`:4108`/`:4113`（`compactWf`）、`:1686`（`openCtl.open` stale 分支）、`:3031`+`:3655`（抽屉卡） | **P1** | 分栏激活即注册分栏 Esc（`if (snap.active !== true) return undefined`）；面板可在分栏激活时打开（控制条主/次按钮与抽屉卡路径**均在分栏内/侧栏**，遮罩 `fixed;inset:0` 只挡鼠标不挡已开分栏）；两监听同为 window 非捕获 ⇒ 按注册顺序派发，分栏先注册先执行且**无 `store.get().bind/entryOpen` 守卫**（对照 NvConsole `:3389` 有守卫）⇒ 一次 Esc 先 `closeWorkbench()` 再关面板。探针 `report-ux012.json` 的 B 段（面板 Esc）在 C 段（开分栏）之前执行 ⇒ 该语境零覆盖 | 分栏态按 Esc 会**连关两层**：用户只想关对话框，却把整个创作台（分栏）一起关掉；与 D-1「只关面板」目标及 B-1 让位层级相悖（脏稿有 `confirm` 兜底，无数据丢失） | ①给分栏 Esc 加同款让位守卫：`const s = store.get(); if (s.bind !== null \|\| s.entryOpen === true) return`；②探针补一条「分栏态 Esc 分层」行为断言（red 向量 = 关两层，ok = `{split:true, modal:false}`）；③CHANGELOG/代码注释中「双层次序无『一个 Esc 连关两层』路径」的断言改为「控制台语境成立，分栏语境由守卫保证」（现措辞只论证了控制台） |
| **C-2** | `lib/client.js:3389`（让位）↔ `WorkspaceDialog`（`:4409-4700`，**无 Esc 监听**）；面板打开点 `:3582` | **P2** | 让位条件含 `s.entryOpen === true`，而全文件仅 3 处 Esc 监听（`2813` 面板 / `3387` 控制台 / `3940` 分栏），`WorkspaceDialog` 无自挂 Esc；`:3582` 控制台「切换 / 新建工作区…」按钮 `store.set({ entryOpen: true })` 可达；`:4460` 已存在 `close()`（含 `busy` 守卫）可复用 | 控制台语境下打开工作区对话框后按 Esc **静默无反应**——与 CLEAN-004 D-1 **同缺陷同根因**（让位后无人接手），D-1 只收口了 `bind` 分支；违反 P-05「同类问题全局排查后统一处理」 | 把 BindDialog 的 Esc effect 原样镜像到 `WorkspaceDialog`（守卫用其 `busy`），或把 Esc 分层收敛为单一派发器（按 `entryOpen > bind > creating > consoleOpen > split` 优先级只处理一层）。修完同步 `:3380-3383` 注释措辞 |
| **C-3** | `scripts/probe-nv-ux012.mjs:806-822`（A6） | **P2** | 本机运行时插件子树祖先链含 `inert`（`facts.focusTrap.envFocus.modalChain` 第 8 级 `inert:true`；`modalInputFocus.moved=false`；`triggerFocus.afterFocus=false`）⇒ 焦点**从未**进入模态，打开前/关闭后 `document.activeElement` 恒为宿主输入框（`facts.escCreate.preActive === active === 'zGbnIq_input'`）⇒ `returnedToPreFocus = (triggerFocused!==true && active===preActive && active!=='body')` **在不执行归还逻辑时同样为真**；另 `escState.active !== 'body'` 为大小写失效（`tagName` 取值为 `'BODY'`，与 `'body'` 比较恒真）⇒「不落 body」判据无效 | A6 呈现 **PASS** 但对该环境**无判别力**（删除 `back.focus()` 亦 PASS）⇒ CHANGELOG「焦点**归还**类断言（A6…）均为 PASS」构成**高估验收面**；与已如实记 N-A 的 A1b/A7b 同一环境根因，漏了 A6 这一条 | ①把 A6 纳入同一 `focusMovable` 闸门（不可移 ⇒ 记 **N-A**，与 A1b/A7b 同口径）；②或改判据为「归还目标 === 记录到的模态外焦点元素」并在 `PREDICATE_REGISTRY` 补 `A6-focus-restore` 谓词 + red 向量（**删除归还逻辑 ⇒ 必红**）；③修正 `!== 'body'` 的大小写口径（`/^BODY$/i` 或直接用 `document.body` 身份比较） |
| **C-4** | `lib/host-contract.mjs`（`revisions[]` CLEAN-007 注记）+ `CHANGELOG.md`（CLEAN-007 条目两处）+ commit message | **P3** | 三处均写「**18 项 / 31 处** `items[].line` 重基」；独立重算 = **29 处**（2.3×1+2.4×6+2.5~2.13×9+3.1×1+3.2×2+3.3×3+3.4×3+3.5×1+3.6×2+3.8×1）；其自述括号内逐项相加亦为 29。**其余数值全部相符**（18 项、Δ 分段、逐行等价、锚点唯一） | 记录性失真：后续按「31 处」核对会对不上（`revisions[]` 是持久化记录）；不影响任何机检 | 三处文字改「29 处」，或改成「18 项 / 29 处范围锚点（含多段条目共 29 处）」以免与 smoke 的「范围条目 21 项」口径混淆 |
| **C-5** | `scripts/probe-nv-ux012.mjs:10-11`（文件头）+ CHANGELOG「断言**全部行为级**…**不做**源码字符串直查」 | **P3** | `UX012-C3-single-source`（`:925-930`）读 `lib/client.js` 做 3 个正则计数；`readI18n()`（`:341-370`）读产品源码取期望文案 | 措辞夸大验收面；与本仓既有纪律（同族 CLEAN-006 F-2 / UX-060 R1 F-2「源码字符串直查不算行为级」）张力 | 改为「21/23 条行为级（真点击/真按键/真 HTTP 拦截/真宿主 RPC）+ 1 条结构面（C3 计数）+ 1 条文案同源读取」；或把 C3 显式标注为结构面断言 |
| **C-6** | `scripts/probe-nv-ux012.mjs:674-677`（`UX012-A1-create-modal`） | **P3** | 文案称「恰「创建/取消」**两钮**」，实现仅 `btns.indexOf(cancel)>=0 && btns.indexOf(createBtn)>=0`，**未断言 `btns.length === 2`** | 三钮形态（如旧自动链按钮复活）不会变红——而 UX-012 的核心契约之一正是「按钮仅创建/取消」 | 补 `modal.btns.length === 2`（smoke 侧已有同类源码面断言，探针补行为面计数即可） |
| **C-7** | `scripts/probe-nv-ux012.mjs:862`（A10 借用 `D1-busy-keeps-panel`） | **P3** | 谓词 `D1-busy-keeps-panel` 登记 `finding='CLEAN-007 D-1（busy 守卫）'`，实际部署在**新建弹窗** busy 场景（`D1-busy-keeps-panel` × A10）；`BindDialog` 的 `busy` 守卫（`2813`）**无行为级断言**，仅 smoke 源码面（`e.key === 'Escape' && busy !== true`） | 谓词 id/finding 与部署面错配；D-1 的另一半（busy 中不关面板）无行为级看护 | 拆成两条登记项（`A10-busy-create-modal` / `D1-busy-bind-panel`）并各配 red 向量；或用 Fetch 域挂起真实绑定请求补一条绑定面板 busy 断言 |
| **C-8** | `scripts/probe-nv-ux012.mjs:757-758`（A7 标签） | **P3** | 标签称「**末位元素**上真实 Tab」，实测 `trapProbe.focusMovedToLast=false`（inert）⇒ 实际触发的是「焦点在模态外」分支（`inside !== true`，`client.js:649`），与标签描述的分支不同（detail 已如实记录 trapProbe） | 标签误导读者以为「末位回绕」已被验证 | 按实测分支措辞：「焦点不在模态内时真实 Tab 被模态吞掉（防止焦点逸出）」；末位/首位回绕留待可移焦环境或记 N-A |
| **C-9** | `lib/client.js:1586-1646`（`createSessionFor` 返回值 `step`） | **P3** | 返回 `step: 'api'\|'create'\|'preset'`，但 `client.js` 全文件无 `.step` 读取（`1703`/`4150` 两消费点只用 `ok`/`errorText`/`sessionId`/`bound`）；探针亦无消费 | 死输出面（过度实现的小尾巴）：后续读者以为存在「按步分类」语义 | 删除 `step`，或由消费点消费（例如按 `step` 决定提示面），二选一 |
| **C-10** | `scripts/probe-nv-ux012.mjs:358-368`（i18n 读数）+ `:55`/`:60`/`:542`（`--no-browser-head`） | **P3** | `i18n.dirPlaceholder` / `nameRequired` / `unbound` / `stale` / `closed` 在探针内使用 **0 次**；`--no-browser-head` 使 `browser=null` ⇒ 恒走 `:542` `return 2`（不可用开关） | 死数据/死开关，削弱读者对探针清单的可信度 | 删除未用读数与死开关，或实现 `--no-browser-head` 的用途（如仅跑几何/DOM 面） |
| **C-11** | `lib/client.js:3391-3393`（`closeCreate` 前向引用） | **P3** | 无 TDZ 风险（回调在渲染完成后触发）；Esc effect deps `[open, creating, createBusy]`（`:3400`）与改动前**逐字相同** ⇒ `createBusy` 守卫实时（无陈旧闭包） | 仅可读性/静态检查友好度；无功能影响（自述「无 TDZ 风险」成立） | 注释补「deps 含 createBusy ⇒ 守卫读值实时」；或把 `closeCreate` 上移到 effect 之前（纯重排，零行为变化） |
| **C-12** | `lib/client.js:616-625`（`lastOutsideFocus` 模块级单变量） | **P3** | 归还目标为全局单变量，`closest('.nv-cmodal, .nv-modal')` 仅过滤模态自身；多层模态叠加时后开模态的归还目标可能落在先开模态内部 | 当前三处模态互斥（遮罩全屏 `:4789`/`:4933`）⇒ **不可达**；属记录性风险 | 若要面向未来：改为栈式记录（打开时 push 当前 `lastOutsideFocus`），或归还前再校验 `closest` 命中的是**本模态**节点 |
| **C-13** | `lib/client.js:3830-3834`（F4 注释）与 `CHANGELOG` 同款表述 | **P3** | `useSessionsSel` 的订阅回调为 `bump = () => setTick(n => n+1)`（`:1475`），**任一会话条目变化都会强制重渲染**（`resubscribe` 不按 selector 去重）⇒ 叶选择**不会**减少渲染次数；F4 实际收益 = 返回值语义收窄（`boundEntry` 直接取用，与同型点对齐），不是「任一会话条目变化不再触发子树重渲染」 | 注释/CHANGELOG 的性能理由**不成立**（代码本身无害且更简；性能收益不可证） | 订正表述为「返回值收窄 + 与同型点对齐；订阅扳机仍为粗粒度 store 通知（渲染去重需 hook 层 selector 比较，属另一任务）」按 P-01 事实口径改写 |

**级别计数**：P0 = **0** ｜ P1 = **1**（C-1）｜ P2 = **2**（C-2、C-3）｜ P3 = **9**（C-4~C-13 中除 C-1~C-3 外共 9 条）｜ 合计 **12 条**，每条带级别（硬门槛第 3 项达标）。

---

## 4. 契约重基独立重算（汇总）

| 检查 | 结果 |
|---|---|
| items[] 计数 / face 分布 | 49 ↔ 49；`{1:11, 2:13, 3:8, 4:6, 5:6, 6:5}`（随 smoke golden 校验，297/0 绿 ⇒ 未动） |
| 变更面 | **恰 18 项** `line` 字段变化；其余 31 项 byte-identical；18 项除 `line` 外**零差异**（kind/necessity/symbol/note 全同） |
| `regionLiterals` / `presetRowConfig` | 逐字节相同（1147 / 721 字符） |
| item 5.3 / 5.4 / 5.6（BUG-007 面） | byte-identical |
| `revisions[]` | 6 → 7 条，新增 `task:'CLEAN-007'`（含何处/因何/Δ 分段/取证口径/未动面） |
| 逐行等价 | **29/29 范围**：旧 `[a,b]` ≡ 新 `[a+Δ,b+Δ]`，长度守恒，0 处不等价 |
| Δ 分段 | +84 / +88 / +148 / +157 / +165 / +168 / +175 —— 与自述逐项一致 |
| 锚点唯一命中（≤3 行连续窗口） | **29/29 唯一**（含 2.12/2.13 短形态、3.4/3.5 前导空行边界） |
| 抽核处数 | 任务书要求 ≥6 处 → **本次做满 18 项 / 29 处**（未只看自述表） |
| 处数声明 | 自述「31 处」与实际 29 处不符 ⇒ C-4（P3） |

---

## 5. 探针复核（新探针 + 冻结探针）

- **新探针 `scripts/probe-nv-ux012.mjs`**：23 条 / PASS 21 / FAIL 0 / N-A 2（与 CHANGELOG 自述一致）；**真驱动**（见 §1-4）；隔离纪律 = R1 三选一之**第一项**（环境变量重定向至临时目录）：`DSH_HOME/USERPROFILE/HOME/APPDATA/LOCALAPPDATA/TEMP/TMP` 全部指向 `mkdtempSync` 根 + `containment` 5 项全真 + 实例子进程内二次包含性校验（`:477-481`）+ 真实 `$DSH_HOME` 只读前后指纹（`realEnvVerdict.ok=true`、`strictDeltas={}`、`leakSignature.pointsIntoIsolation=false`）+ 宿主平面只读 junction + 随机端口 + 不终止用户进程 + 收尾清理（`cleanup.rootRemoved=true`）。**偏差项**：A6 真空 PASS（C-3）、C3 结构面（C-5）、A1 计数（C-6）、A10 谓词错配（C-7）、A7 标签（C-8）、死数据（C-10）。
- **冻结探针（CLEAN-004）**：见 §0 表——本批对 `docs/evidence/CLEAN-004/**` **零改动**（`git show --stat` 无该路径），仅以当前 HEAD 复跑取得 `D-1 FAIL→PASS`；复跑读数与本批自述**逐项一致**。
- **两探针互补性**：冻结探针覆盖「控制台/分栏/绑定收敛」旧面（49 条），新探针覆盖「新建链/模态/a11y/创建链两消费点」新面（23 条）；**唯一重叠盲区 = 分栏语境的面板 Esc**（C-1）。

---

## 6. AI 代码专项 5 项（逐项结论）

| # | 专项 | 结论 | 事实依据 |
|---|---|---|---|
| 1 | **mock 残留** | **0（PASS）** | 本批 diff 内 `mock` 仅 2 处**注释**（探针说明「不 mock 产品代码」与引用 `ci-mock-face.mjs` 口径）；`stub`/`fake`/`jest`/`sinon` 0 命中；产品面新代码全部走真实 `launcher.api.*` / 真实 DOM / 真实 `store`；探针 fixture（书目 + `storages/workspace.json`）落在隔离根内，属测试夹具而非产品桩 |
| 2 | **硬编码返回值** | **0（PASS）** | `createSessionFor` 的 ok/errorText 全部派生自真实 `r1.result.ok` / `r2.result.ok` / `bindSession` 返回；`modalDialogProps` 返回静态 props（非结果伪造）；`closeWorktree`/`closeCreate` 无返回值伪造；探针无「写死绿」的断言（红/绿由真实读数喂入 `evalPred`） |
| 3 | **幻觉 API** | **0（PASS）** | 新代码使用的宿主面（`sessions.create`/`agentPresets.select`/`bindSession`/`workspace.list`）全部为**既有**调用（F2 仅搬迁），无新宿主方法名；新 DOM/Web API（`getElementsByTagName`/`getClientRects`/`closest`/`contains`/`focusin`/`role`/`aria-*`）均为标准且真实存在（探针实跑验证）；`regionLiterals` 双向 ⊆ 随 smoke 绿 |
| 4 | **未实现 TODO** | **0（PASS）** | diff 内 `TODO`/`FIXME`/`XXX` **0 命中**；无空实现函数、无「暂未实现」文案、无占位分支（`--no-browser-head` 属**未使用的开关**而非未实现功能，已计 C-10，P3） |
| 5 | **过度实现** | **0（PASS；2 条 P3 尾巴）** | 无投机抽象：F2 抽公共实现的**两个消费点都真实存在**；`modalDialogProps`/`useModalFocus` 三处消费（非单点抽象）；`requirePreset` 两态均由真实消费点使用。尾巴：`createSessionFor.step` 死输出（C-9）、探针未用读数（C-10）；989 行探针体量与 F7 目标（23 条行为断言 + 自证 + 隔离）匹配，**非**过度实现 |

**真实环境纪律核对**：diff 内**无**对 `C:\Users\peter\.dsh` 或仓库外路径的写入（探针只 `readFileSync`/`statSync`/`createRequire.resolve` 该目录）；隔离实例的写面全部在临时根内；任务书三选一之**第一项**（环境变量重定向）满足且留痕（`report-ux012.json.isolation`）。

---

## 7. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 判定 |
|---|---|---|---|
| **P0 阻塞问题数** | = 0 | **0**（P1×1 / P2×2 / P3×9） | **PASS** |
| **5 维度全覆盖** | = 100% | **5/5**（§2 正确性/安全性/可维护性/性能/测试覆盖逐维度有结论 + 事实依据） | **PASS** |
| **每条发现标注 P0~P3** | = 100% | **12/12**（C-1~C-13 中每条含级别 + 文件:行 + 事实依据 + 影响 + 建议） | **PASS** |
| **设计一致性检查** | 已完成 | **已完成**：P-10（新增宿主耦合字面量 0；`regionLiterals`/`presetRowConfig` 逐字节未改；双向 ⊆ 随 smoke 绿）+ P-04（看护网新增且真行为级，缺口记 C-1/C-3/C-7）+ **P-05 未通过 → C-2** + C-02 通过 + C-04 通过 + **契约零扩展成立** | **PASS**（检查已完成；发现的 P1/P2 不构成 P0） |
| **AI 代码专项 5 项** | 全部完成 | **5/5**（§6 逐项结论） | **PASS** |

### 结论：**APPROVED_WITH_NOTES**

- **依据**：硬门槛 **5/5 全通过**、**P0 = 0**；F2 收口的逐分支等价性经独立重算**成立**（0 处行为丢失）；契约重基 **29/29 逐行等价 + 锚点唯一**且**契约零扩展**；四道门禁独立复跑全绿；冻结探针 `D-1` FAIL→PASS 且**无 PASS→FAIL 回归**。
- **本批承接的 8 项前置 findings 中 6 项功能面已修复**（F2/F3/F5/F9/D-1-控制台语境/F7-资产入仓），F4/F6 见 C-13/C-3（证据面 / 表述面问题）。
- **建议合并前处理 §3 的 C-1（P1）**：分栏态 Esc「一键关两层」系本批新引入、且可达（控制条主/次按钮与抽屉卡路径），与 D-1「只关面板」目标及 B-1 让位层级相悖；若不本批修，**MUST** 登记为遗留项并另立任务（附探针断言补充要求）。**该项按级别定义不构成 P0，故不改变本结论**。
- **P2 两项**（C-2 同类未收口 / C-3 真空 PASS）建议本批或紧随其后修复（均属 P-05/P-04 面）。
- **非阻塞遗留（P3 ×9）**：C-4（计数文字 31→29）、C-5（探针「全部行为级」措辞）、C-6（A1 恰两钮）、C-7（A10 谓词错配 + 绑定面板 busy 无行为面）、C-8（A7 标签分支）、C-9（`step` 死输出）、C-10（探针死数据/死开关）、C-11（前向引用注释）、C-12（`lastOutsideFocus` 边界）、C-13（F4 性能理由订正）。
- **重复造轮子核对（P-08）**：F6 公共件复用 React 既有能力与仓库既有 store/slot 范式，未自研渲染/焦点库；F2 直接复用既有 `launchSession`/`bindSession` 原语；探针复用既有 CDP 客户端形态与 `probe-nv-bar-geometry.mjs` 隔离范式 ⇒ **未重复造轮子**。

```
unresolved_blockers=0
```

> 结构化事实源：本节 `unresolved_blockers=0` 为**独立字段**（非自然语言推断），对应本报告结论 `APPROVED_WITH_NOTES`；全文不含未解决的 BLOCKING finding（P0 = 0）。C-1（P1）为**建议合并前处理项**，按本仓 `skills/code-review/SKILL.md` 的分级与关闭规则（P0=0 且 P1>0 且有遗留计划 ⇒ 有条件合并）不影响本结论。
