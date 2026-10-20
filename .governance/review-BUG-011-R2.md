# BUG-011 代码审查报告 R2（独立 Code Reviewer）

- **任务**: BUG-011 —— dsh 0.2.0-rc.2 升级适配实现批（RISK-012 欠账补审）
- **轮次**: R2（R1 = NEEDS_CHANGE 后的强制复审，T1）
- **审查日期**: 2026-10-20
- **审查者**: Code-Reviewer（独立；只读）
- **上一轮**: `.governance/review-BUG-011-R1.md`（`REVIEW-BUG-011-R1 NEEDS_CHANGE / unresolved_blockers=5`）
- **审查对象**: 工作区未提交改动 vs `d8d93c2`（8 文件 +309/−84：`lib/host-boundary.js` / `lib/index.js` / `lib/host-contract.mjs` / `install.ps1` / `install.sh` / `test/smoke.mjs` / `README.md` / `CHANGELOG.md`）；治理面改动（`.governance/**`、`docs/**`）不在审查范围
- **审查方式**: 只读（`git diff/status/show`、文件读取、`node --check`、`node test/smoke.mjs`、`node test/fixtures/host-surfaces/probe-face.mjs`、`node test/validate-preset.mjs`、`node test/fixtures/host-surfaces/ci-mock-face.mjs`、`bash -n install.sh`、PowerShell 7 / Windows PowerShell 5.1 Parser、受控的 install.sh `--host-generation unknown` 分支复跑）；未修改产品代码/配置/其他治理文件；唯一写入 = 本文件

- **结论行（机读）**:

```
REVIEW-BUG-011-R2 NEEDS_CHANGE / unresolved_blockers=1
```

> `unresolved_blockers` = 未闭环 P0（1）= P0-3（`install.ps1` 在 Windows PowerShell 5.1 下不可解析）。R1 的 P0-1 / P0-2 / P1-3 / P1-5 已闭环；P1-4 按本轮约定的「失败语义」口径闭环、根因降级为 P2-15（不计数）；其余 P2/P3 不阻塞但需记录。**R2 仍为 NEEDS_CHANGE，按 T1 应进入 R3（round=2 < 3）。**

---

## 1. 结论摘要

返工主体质量明显提升：R1 两个 P0 均按事实链修复，契约补录 3 项并重基，install 代系探测改为「多候选安装根 + 三态 + unknown fail-safe」，新增 `settingsFormsUpdate` 的 await/catch 回归测试，`smoke 308/0`、`probe-face 28/28`、`validate-preset PASS`、`ci-mock-face 4/4`、`bash -n` 均可复现。

但本轮**引入了一个新的 P0 回归**：

- **P0-3**：`install.ps1` 的 UTF-8 BOM 被移除（首 3 字节 `23 20 64`，原 `EF BB BF`），且新增的 `install.ps1:198` 使用了 PowerShell 7 专属的 `||` 运算符。Windows PowerShell 5.1（脚本头部声明的支持环境）解析该文件**失败**：无 BOM 时 17 条 ParserError；补回 BOM 后仍有 1 条 `The token '||' is not a valid statement separator in this version. @L198`；补回 BOM 并把 `||` 换为 `-or` 后解析通过。这是 **BUG-001 的复发**（`CHANGELOG.md:326` 明确记载「无 BOM 的 .ps1 按 ANSI/GBK 解码 ⇒ 中文乱码触发 ParserError」），且 `install.ps1` 的离线安装路径与在线 `iex` 路径在 PS 5.1 上都会失败。R2 的「install.ps1 Parser」门禁若只跑 pwsh 7，无法发现此问题（pwsh 7 对无 BOM 默认 UTF-8 且支持 `||`）。

R1 五项逐项状态见 §3；本轮新发现与 P2 残余见 §4。

---

## 2. 已执行门禁与结果（R2 真跑）

| # | 命令 | 结果 |
|---|---|---|
| 1 | `node --check`（`lib/index.js` / `lib/host-boundary.js` / `lib/host-contract.mjs` / `lib/client.js` / `test/smoke.mjs`） | 全部通过 |
| 2 | `node test/smoke.mjs` | **308 passed, 0 failed**（含新增 BUG-011 P0-2 回归；README 计数 308 与末条断言一致） |
| 3 | `node test/fixtures/host-surfaces/probe-face.mjs` | **28 项机检全通过，exit 0**（含 `⑧` 契约对账 `[4.7]` 绿；R1 P0-1 闭环） |
| 4 | `node test/validate-preset.mjs` | **PASSED**（schema-face PASS；patch/yml 双源解析通过；skills 29/29） |
| 5 | `node test/fixtures/host-surfaces/ci-mock-face.mjs` | **4/4 OK** |
| 6 | `bash -n install.sh` | exit 0 |
| 7 | PowerShell 7 `Parser::ParseFile install.ps1` | OK |
| 8 | **Windows PowerShell 5.1（`C:\windows\System32\WindowsPowerShell\v1.0\powershell.exe`）`Parser::ParseFile install.ps1`** | **FAIL**：无 BOM 时 17 条 ParserError；补回 BOM 后 1 条 `The token '||' is not a valid statement separator in this version. @L198`；补回 BOM + `||`→`-or` 后 OK；原 `d8d93c2`（BOM）OK |
| 9 | `git diff --stat d8d93c2 -- lib install.ps1 install.sh test README.md CHANGELOG.md` | 8 文件 +309/−84（与 R2 请求一致） |
| 10 | 受控 `bash install.sh --local . --profile nvtest --host-generation unknown`（见 §7 口径说明） | exit 0；分支输出显示跳过 insert/settings/预设目录；未观察到 patch/settings/预设写入 |

---

## 3. R1 五项 → 闭环/未闭环（逐项 + 证据）

### P0-1 契约补 4.7 → **闭环**

- `lib/host-contract.mjs:171` 新增 `item: '4.7'`（`install-detection`，`line: 'L160-219 / L84-146'`），面 4 计数 7；头部面分布改为 `11/14/8/7/7/5`、items 52。
- `probe-face.mjs` 的 `⑧` 对账**实跑全绿**（28/28）：`[4.7]` 在两脚本头部、literal ∈ 4.7 symbol。
- `smoke` 的 `COMPAT-002` 52 项/面分布断言、`COMPAT-003 F6` necessity 43、range golden 等同步通过（308/0）。
- 行段实测：`4.7` = `install.ps1:160-219`（探测注释起至 `}`）/ `install.sh:84-146`（探测注释起至 `fi`），与当前源码一致。

### P0-2 async 写入 → **闭环（主路径；P3 残余）**

- `lib/host-boundary.js:150-164`：`settingsFormsUpdate` 改为 `async`，`try { await s.update(...) } catch` 返回 `{ok:true}` / `{ok:false,error}`，**不再丢弃 Promise**。
- `lib/index.js:291`：`const written = await settingsFormsUpdate(...)`；`:292-296` 失败返回结构化错误、成功日志后移到 `await` 之后。
- `lib/index.js:308-323`：`runLegacyMigrationOnce` 捕获 `migrateLegacySettings` 的任何抛出并结构化；失败 `logger.warn`；`:1411` 自动路径改 `void this.runLegacyMigrationOnce()`。
- `test/smoke.mjs` 新增 ①d：成功 / 拒绝 / 缺面 / 无 settings 四形态，实跑通过（`settingsFormsUpdate` 拒绝被捕获、不抛）。
- **残余 P3-25**：`runLegacyMigrationOnce` 的 `this.logger()?.warn?.(...)` 在 try/catch 之外；若 `ctx.logger` getter 抛错（inactive context / 异常 mock），该 async 函数仍会 reject，而 `void` 无最终 `.catch` ⇒ 理论上仍可 unhandledRejection。主写入路径已闭环，此项为防御性加固（P3，不阻塞）。

### P1-3 契约登记/重基 → **闭环（核心；P3 残余）**

- 新增：`2.14`（`lib/host-contract.mjs:146`，`uiWorkspace.openSession` + `retainedBy.mainView`；`line: 'L899-910'`，实测与 `lib/client.js:899-910` 函数范围完全一致）、`4.7`（`:171`）、`5.7`（`:188`，声明行 `cordis.patch.yml:28-35`，实测一致）。
- 改写：`1.2`（Config 由宿主 loader 消费）、`1.6`（0.1.x register/get ｜0.2.0 SettingsForms describe/update + `settings.yaml.imported` + P0-2 await/catch）、`1.8`（路由 13→14，含 `settings-migrate`）、`5.2`（worker-thread 保留 + 注记 0.2.0 对应行 ptc）。
- `revisions[]` 追加 BUG-011（`lib/host-contract.mjs:83` 前新增条目）；`contractProjection().revision` / `[nv-compat]` 归因任务现为 BUG-011（smoke 断言 `rp5.contract.revision === hc5.revisions.at(-1).task` 通过）。
- **残余 P3-22**：`1.6` 的 `line: 'L111（调用点 L1600、L117）'` —— `L111`/`L1600` 实测正确，但 `L117` 是 `this.cfg = () => {` 声明行，`readLiveConfig` 实际在 `lib/index.js:119`；`1.10` 的 `line: 'L189 / L177 / L144'` —— 边界 `L189` 正确，但 index 侧 `emitChanged` 实际 `:179`（非 177）、`logger` 实际 `:146`（非 144），本批新增的 2 行 constructor 位移未重基。
- **残余 P3-23**：`1.8` 的 `symbol` 仍只写 `ctx.get('webServer') + webServer.register`，未把本批新增的 `ctx.inject(['webServer'])` 宿主耦合写入该 item（仅 `BOUNDARY_MAP['1.8']` 增加了 `injectWhenReady`，见 `lib/host-boundary.js:32-42`）；契约面 1 的宿主耦合清单仍不完整（低风险）。

### P1-4 js-yaml → **部分闭环（失败语义闭环；根因 P2-15）**

- 已修：`lib/index.js:266` 动态 import 失败时返回 `{ok:false,error:'yaml-parser-unavailable: ...'}`（`:268`）；自动路径经 `runLegacyMigrationOnce` 显式 `logger.warn`（`:318`），不再静默；手动路由 `settings-migrate` 可返回结构化错误。
- **未修（根因）**：离线/junction 通道仍不装 `js-yaml`（`install.ps1:194-208`、`install.sh:97-98` 只建依赖链接，不执行 npm/pnpm install）；自动 warn 只能提示用户「确认 js-yaml 已随 profile 安装」，**手动路由对同一 `yaml-parser-unavailable` 也会失败**（它走同一 `migrateLegacySettings` 路径）。用户 bindings/workspaceRoot 在纯离线首装 + 0.2.x 升级场景仍未自动恢复。
- **判定口径**：R2 请求把 P1-4 的验收描述为「失败语义是否可被自动路径消费（warn 是否真的到 logger，手动路由是否真实可达）」——就此口径**闭环**；就 R1 原文「不可解析」的根因**未闭环**，保留为 **P2-15**（不计数，但建议下批修：installer 安装依赖，或从 dsh 安装闭包回退解析；并在 warn 中给出可执行的补救命令，而不是只提示）。

### P1-5 install 三态 + fail-safe → **闭环（核心；P2 边界残余）**

- `install.ps1:170-219` / `install.sh:82-146`：多候选安装根（`Get-Command dsh` / `command -v dsh` → npm 全局根 / `npm_config_prefix`），三态 decl/legacy/unknown；decl 优先。
- `install.ps1:424-427` / `install.sh:339-342`：unknown **不插 insert、不撤除**；`install.ps1:486-488` / `install.sh:368-370`：unknown **不同步预设目录**；`install.ps1:554-555` / `install.sh:429-430`：unknown **不写 settings.yaml**。
- 旧 0.1.x 不撤除：legacy 分支无撤除逻辑；unknown 分支显式跳过撤除（正确）。
- 受控 `install.sh --host-generation unknown` 复跑：输出确认跳过 insert/settings/预设，exit 0；`set -e` 未中断（见 §7 环境口径）。
- **P2 残余**：`P2-13` sh 非法 override 值（`--host-generation bogus`）不被校验，会**落回 legacy 分支**（`install.sh:44` 解析、`:130-140` 覆盖、`:346-357` insert、`:371-374` 预设同步）⇒ 一个 typo 可重新制造双层同 id fatal；`P2-14` `install.ps1:58` 的 `[ValidateSet('auto','decl','legacy')]` 不允许 `unknown`，`:211` 的 `-HostGeneration unknown` 分支不可达（与 sh 不一致）；`P2-21` 若运行中的 0.2.x 安装根不在候选内、而 `npm root -g` 存在旧的 0.1.x，仍可能误判 legacy（建议「候选无 decl 且无运行根证据 ⇒ unknown」）。

---

## 4. 本轮发现

### P0-3（新，阻塞）— `install.ps1` 在 Windows PowerShell 5.1 下不可解析（BUG-001 复发）

- **位置**：`install.ps1:1`（UTF-8 BOM 被移除；当前首 3 字节 `23 20 64`，`d8d93c2` 为 `EF BB BF`）；`install.ps1:198`（`if (-not $candRoot || -not (Test-Path ...))`，`||` 是 PowerShell 7 语法）。
- **证据（本审查实跑，只读）**：
  - Windows PowerShell 5.1 `Parser::ParseFile` 当前文件：**17 条 ParserError**（含 `The ampersand (&) character is not allowed` / `Unexpected token ...`——BOM 缺失导致中文按 ANSI/GBK 解码的连锁解析错）。
  - 当前文件**补回 BOM** 后：仍 **1 条** `The token '||' is not a valid statement separator in this version. @L198`。
  - 当前文件**补回 BOM + `||`→`-or`**：**OK**。
  - `d8d93c2` 原文件（BOM）在 PS 5.1：**OK**。
  - `CHANGELOG.md:326` 已记载 BUG-001：「脚本原为 UTF-8 无 BOM，Windows PowerShell 5.1 对无 BOM 的 .ps1 按 ANSI(GBK) 解码，中文注释/字符串乱码触发 ParserError」——本批改动精确复发了该缺陷。
- **影响**：`install.ps1` 头部声明「Windows / PowerShell 5.1+」；离线 `.\install.ps1` 与在线 `iex` 路径在 PS 5.1 上均无法解析；R2 的「install.ps1 Parser」门禁若只跑 pwsh 7 不会发现（pwsh 7 无 BOM 默认 UTF-8 且支持 `||`）。
- **最小修复方向**：① 将 `install.ps1` 以 **UTF-8 with BOM** 保存（`EF BB BF`）；② `install.ps1:198` 的 `||` 改为 `-or`（或加括号 `(-not $candRoot) -or (-not (...))`）；③ 把 **PowerShell 5.1 Parser** 加入验证清单（Windows runner 上 `powershell.exe -NoProfile -Command "[Parser]::ParseFile(...)"`），防止再次回归。
- **严重度理由**：这不是文档问题，而是**用户安装入口在受支持平台上的直接失败**；且 BUG-001 已有明确历史与 CHANGELOG 记载，属于可预防回归 ⇒ P0。

### P2-13 — sh 非法 `--host-generation` 值落回 legacy（可否定 P1-5 的 fail-safe）

- 位置：`install.sh:44`（`--host-generation) HOST_GEN_OVERRIDE="$2"; shift 2`，无值域校验）；`:130-140`（`HOST_GEN="$HOST_GEN_OVERRIDE"`，任意值接受）；`:280`/`:339`/`:346-357`（非 decl、非 unknown ⇒ 走 legacy insert）；`:364`/`:368`/`:371-374`（legacy 预设同步）。
- 影响：`--host-generation decll`（typo）在 0.2.x 上会插 insert 行并同步预设 ⇒ 与 RISK-011③ 同形的双层同 id fatal（插件侧 P0-2 已不再崩溃，但设置写仍失败）。**修复**：`case` 值域校验（auto/decl/legacy/unknown），非法值按 unknown fail-safe 处理或直接报错退出。
- 定级 P2（需要用户输入非法值；不属自动探测路径），但**建议随 P0-3 一并修**，否则 fail-safe 的承诺在 typo 下不成立。

### P2-14 — PS `-HostGeneration unknown` 不可达（与 sh 不一致）

- `install.ps1:58` `[ValidateSet('auto','decl','legacy')]` 拒绝 `unknown`；`:211` 的 `if ($hostGen -eq 'unknown')` 覆盖分支不可达，`:211` 的提示文案与实际参数能力矛盾。sh 端接受 `--host-generation unknown`。**修复**：ValidateSet 增加 `unknown`（或删除该分支与文案），并统一两脚本的取值说明。

### P2-15 — P1-4 根因残留：离线通道仍缺 `js-yaml`

- `lib/index.js:266` 动态 import；`install.ps1:194-208` / `install.sh:97-98` 不安装依赖；`:318` 的 warn 只提示「确认 js-yaml 已随 profile 安装」；手动路由对同一失败仍返回 `yaml-parser-unavailable`。**影响**：纯离线首装 + 0.2.x 升级用户的 bindings/workspaceRoot 仍无法自动恢复。**修复**：installer 安装运行依赖 / 从 dsh 安装闭包回退解析 / 在 warn 中给出可执行补救（如具体 `npm install js-yaml --prefix <profile>` 命令）。

### P2-16 — P2-7 看护仍不完整

- `test/smoke.mjs` 新增 ①d 只覆盖 `settingsFormsUpdate` 的成功/拒绝/缺面；**未覆盖** `migrateLegacySettings` 的 `.imported` 读取/parsed/guard/写入链路、`runLegacyMigrationOnce` 的 warn 消费、`yaml-parser-unavailable` 的自动路径。**修复**：加 mock `SettingsForms` + 临时 `.imported` fixture 的迁移级用例，至少断言 `{ok:false}` 不逃逸为 unhandledRejection 且 auto 包装有 warn。

### P2-17 — P2-6 未修：Face1 1.8 探针仍可假绿；`logWarn` 分支仍死

- `lib/host-boundary.js:263-271`：`ok = hasApi || typeof injectFn === 'function'`，cordis 4 宿主恒有 `inject` ⇒ 1.8 永不报告 webServer 缺失；`lib/index.js:1618-1623` 的 `logWarn('no webServer mounted...')` 在 `mounted !== null` 时不可达。**影响**：诊断面板「9 ok / 0 missing」可能是假绿。**修复**：deferred 状态记为 `ok:null` / `pending` 并保留超时告警。

### P2-18 — P2-9 未修：install 写 profile patch 仍非原子

- `install.ps1:413`、`install.sh:329` 直接 `WriteAllText` / `writeFileSync` 覆盖用户 profile patch；sh 端 `REMOVED=$(node ... 2>/dev/null)` + 通配分支仍可能把失败当「跳过」。**修复**：temp + rename 原子写；失败显式非零退出/警告。

### P2-19 — P2-12 未修：迁移仍只在首个 HTTP 请求触发

- `lib/index.js:1403-1411` 是唯一自动触发点；headless / 仅 `novel_*` 工具调用不会迁移（`.imported` 仍在，数据非丢失但恢复不发生）。**修复**：工具首次需要 `bindings/workspaceRoot` 时也触发一次幂等迁移（避开 boot 期 HMR 竞态）。

### P2-20 — P2-8 未修：`.scratch-bug011/` 仍未 gitignore

- `git status` 仍 `?? .scratch-bug011/`；内含 dsh-home 状态与合成 `.credentials.yaml`；`.gitignore` 无 `.scratch*`。**修复**：加入 `.gitignore` 或移出仓库。

### P2-21 — 探测仍可能误判 legacy（stale npm root）

- `install.ps1:197-203` / `install.sh:124-130`：首个有 `package.json` 的候选（无 `dsh-agent-preset`）即置 legacy；若运行中的 0.2.x 安装根不在候选内、而 `npm root -g` 指向旧 0.1.x，则误判 legacy 并插行。**修复**：只有「运行 dsh 的候选本身缺 dsh-agent-preset」才判 legacy；多候选无 decl 且无运行根证据 ⇒ unknown。

### P3 级（记录，不阻塞）

- **P3-22**：`lib/host-contract.mjs:111` 1.6 `L117` 应为 `L119`；`:115` 1.10 `L177 / L144` 应为 `L179 / L146`（本批 constructor +2 未重基）。
- **P3-23**：1.8 item 的 symbol 未登记 `ctx.inject(['webServer'])`（仅 `BOUNDARY_MAP` 的 `injectWhenReady`），P-10 面 1 仍留一条未入册宿主耦合。
- **P3-24**：`CHANGELOG.md:61` 仍称「install.ps1 的 UTF-8 BOM 保持」，与 P0-3 的当前文件不符；该历史条目的「历史锚点」限定语本身可接受，但 BOM 陈述需随 P0-3 修复恢复真实。
- **P3-25**：`runLegacyMigrationOnce` 的 `this.logger()?.warn?.(...)` 在 try 之外；`void` 无最终 `.catch`（见 P0-2 残余）。
- **P3-26**：`settingsFormsUpdate` 的 `typeof s.update` 属性访问在 try 之外（`lib/host-boundary.js:151-152`）；正常宿主无影响，异常 getter 时会被 `runLegacyMigrationOnce` 捕获，手动路由由 HTTP handler 捕获。
- **P3-27**：`install.sh:425` 在 unknown 分支仍打印「已接入 global profiles/node_modules + patch 行」；`install.ps1:211` 的 unknown 提示不可达（同 P2-14）。建议文案与分支对齐。

---

## 5. Developer 三处「如实披露」评估

1. **5.2 保留 `workflow-worker-thread`、不替换为 ptc** —— **可接受**。5.2 的 `file` 明确是 `agent-presets/novel-writing/agent.cordis.yml`（0.1.x 通道真源），该文件确实仍是 worker-thread；若替换为 ptc 反而使 0.1.x 通道陈述失真。5.7 已登记 0.2.0 声明行及 `dsh-workflow-ptc`，smoke B2 双源等价断言覆盖行集差异。任务书的「替换 5.2」要求基于错误前提，保留加注记是事实正确做法（P3 记录口径即可）。
2. **CHANGELOG 仅在 COMPAT-009 历史条目末补「历史锚点」限定语** —— **可接受但附 P3 口径**。该限定语事实为真（4.x/5.5 行号是该批落地坐标），F3 守卫的 `HIST_MARK5` 词法本就允许历史限定词豁免；它不是伪造。但需注意：a) 这是**测试输入适配**（为让 F3 绿），不是代码修复；b) 同一行内「install.ps1 的 UTF-8 BOM 保持」已被 P0-3 打破，P0-3 修复后该陈述自然恢复，否则应订正。
3. **P2-6/P2-7/P2-9/P2-12 未修（各有理由，见 Developer 回报）** —— **理由未随 R2 输入提供，无法核验其充分性（待验证）**。按代码事实：P2-6（1.8 假绿）、P2-9（非原子写）、P2-12（headless 不迁移）**仍然成立**；P2-7 仅被 ①d 部分覆盖（`settingsFormsUpdate` 单点），迁移级看护仍缺。作为 P2 遗留可接受（不阻塞合并），但 MUST 在 plan-tracker/risk 中登记并把理由补齐；不能以「有理由」替代可复查依据。

---

## 6. 无法核验的面（`待验证`，不视为通过）

- **T-1** 0.2.0-rc.2 浏览器级客户端行为（打开会话/current 联动/自动关闭/分栏）——无浏览器；0.2.0 client 包源码未留存；仅 0.2.1-rc.2 宿主源码 + 文本断言。
- **T-2** 0.1.x 运行时回归——未安装 0.1.5 宿主；`ctx.inject` 回调时序、Config 在 cordis 4.0.2 下的实际行为为静态推理（schemastery 3.18.2 面已实测）。
- **T-3** install.ps1/install.sh 真实端到端安装——PS 5.1 已证明**不可解析**，故其执行面不可能通过；PS 7 未做完整安装；sh 的 unknown 分支受控复跑见 §7 的环境口径，不作为隔离实证。
- **T-4** 0.2.0-rc.2 精确宿主包内容（`SettingsForms.update` async 细节依据 0.2.1 实装 + EVD-132 同源声明）。
- **T-5** 离线发行包真实依赖布局（若发行包内置 `node_modules` 则不触发 P2-15）。
- **T-6** `dsh plugin add` 在 0.2.0-rc.2 的实跑（EVD-132 为实现者证据）。
- **T-7** Developer 对 P2-6/P2-7/P2-9/P2-12 的未修理由——**R2 输入未附原文**，无法核验。

---

## 7. 受控命令的环境口径（如实披露）

- `bash install.sh --local . --profile nvtest --host-generation unknown` 的复跑：命令设置了 `$env:DSH_HOME` 为临时目录，但 Git Bash 子进程最终按 `$HOME/.dsh`（`/home/ai/.dsh`）解析（未映射到临时根），属**环境重定向失败**；观察到的输出显示 unknown 分支跳过 insert/settings/预设目录，exit 0，未观察到 patch/settings/预设写入，临时根为空。该次运行**不作为隔离安装证据**；P1-5 的 unknown fail-safe 结论以**静态控制流**为准，sh 的 `set -e` 路径未在本轮触发失败。
- 未执行任何会写产品仓、真实 `$HOME`/真实 `DSH_HOME` 的安装动作；唯一写入 = 本报告文件。

---

## 8. 返工/复审建议

- **必须先修 P0-3**：恢复 `install.ps1` 的 UTF-8 BOM；`install.ps1:198` 的 `||` 改 `-or`；用 **PowerShell 5.1 Parser** 复验（并建议入 CI/验证清单）。
- 建议随轮修 P2-13/14（override 值域与 unknown 一致性）、P2-15（离线依赖/可执行补救）、P2-17（1.8 假绿）、P2-18（原子写）、P2-19（headless 触发）、P2-20（.gitignore）；P2-16 补迁移级看护。
- P3-22/23/24/25/26/27 可随修或记录；P3-22 的契约行号请按当前源码重基（1.6 L119 / 1.10 L179,L146）。
- 修复后按 T1 进入 **R3**（round=2 < 3）；若 R3 仍 NEEDS_CHANGE，按 T2 升级 BLOCKED/escalation。

---

*报告结束。REVIEW-BUG-011-R2 / NEEDS_CHANGE / unresolved_blockers=1 / 2026-10-20*
