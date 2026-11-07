# COMPAT-018 遗留②「probe-host 实跑」开发面收口证据（spawn 修复 + 0.2.2/0.2.0 双跑）

- 会话锁：`compat018-dev`（改动面 = `scripts/probe-host.mjs` + 本文件；未 commit、未写 `.governance/`、未动 `package.json`）
- 时间：2026-11-08（Asia/Shanghai）；操作机：Windows，Node `v24.13.1`
- 结论一句话：probe-host `--run` 的潜伏缺陷（win32 `.cmd` spawn EINVAL）已修；隔离实例双跑完成——宿主 `0.2.2-rc.1`（桌面运行时 CLI）与 `0.2.0-rc.2`（npm tarball 解包直跑）均：插件装载成功、liveness/compat 路由 200、面 1 探测 **9/11 ok + 2 项路由自声明未探测**、逐探测项两代**完全同读数**；退出码 1 的唯一红面 = L2 浏览器层 unavailable（未装配自动化依赖，不伪造）。

---

## 1. spawn 修复点（最小面）

**缺陷**：`scripts/probe-host.mjs` 原 L274 `spawn(hostCmd, …)` 在 Windows 上对 `.cmd` 宿主命令（`--host-cmd D:\app\dsh\resources\runtime\cli\bin\dsh.cmd` 或 PATH 解析出的 `dsh.cmd`）直接 spawn——Node ≥ 20.12（CVE-2024-27980，本机 v24.13.1）禁止无 `shell` spawn `.cmd/.bat` ⇒ 立即 `spawn EINVAL`。这就是 REAL-RUN 从未被执行成功的潜伏根因。

**修法（选 ComSpec 显式包装，弃 `{shell:true}`）**：新增 `hostSpawn(file, args, spawnOpts)`：

- win32 ∧ `.cmd/.bat` → `spawn(process.env.ComSpec ?? 'cmd.exe', ['/d','/c', file, ...args], …)`。
  选数组式 ComSpec 包装而非 `{shell:true}` 整串拼接：参数逐元素传递、由 Node 标准规则转义（仅含空白元素加引号），更可控。**不用 `/s`**（R1 F1 返工，详见 §7）：libuv 对含空格路径只包一对引号，`/s` 强制 cmd 剥首+末引号 ⇒ 空格路径被拆成裸路径；无 `/s` 时 cmd 默认引号规则对「恰两引号 + 内部空白 + 可执行文件名」保留整对引号。
- `.js/.mjs/.cjs` → `spawn(process.execPath, [file, ...args], …)`（node 本体承载，绕开 PATHEXT/文件关联；本次 0.2.0-rc.2 tarball 入口 `lib/bin.js` 即走此分支）。
- 其余（非 win32 / `.exe`）保持原直跑路径。

**转义边界（R1 F2 返工：代码强制，非仅注释声明）**：固定子参数（`web` / `--port` / `--no-open`）与 port/timeout（内部数字）不含引号或 cmd 元字符；win32 `.cmd/.bat` 形态的 `hostCmd` 含 `"`/`&`/`|`/`<`/`>`/`^`/`%` 即 `assertHostCmdSafe` **die 拒绝**（exit 2，注入面防误执行；空格/括号允许——括号失败形态是响亮报错非静默误执行）。

**杀进程路径核实**：win32 收尾沿用既有 `taskkill /pid <pid> /T /F`——`.cmd` 场景下 `child.pid` = cmd 包装进程，`/T` 按树终止，宿主 node 孙进程一并回收。**实证**：两跑结束后 3211/3212 端口 curl 均 `000`（连接拒绝、无监听），`Win32_Process` 扫描命令行含 `nv-probe-host`/`c018` 的 `node.exe` 残留 = **NONE**。无需改收尾逻辑。

**零改动承诺兑现**：命令计划打印、隔离纪律（临时根 + npm 三重定向 + fail-closed 校验）、退出码语义（0/1/2）均未动；`REAL-RUN: UNVERIFIED` 标记未翻（smoke 接线守卫断言该字面量存在，翻标记需配套改 smoke——超出本会话锁，见 §5 偏离 4）。

**新增 `--stage-plugin`（可选开关，默认关 = 原 `--run` 行为不变）**：把本仓插件接入隔离 DSH_HOME 的官方通道最小实现（详见 §2），报告 JSON 增 `stagePlugin` 字段。

## 2. 实跑取证协议（隔离纪律）

- 端口 3211（0.2.2-rc.1）/ 3212（0.2.0-rc.2）；临时根 `%TEMP%\nv-probe-host-*`（探针自建），npm `cache/userconfig/globalconfig` 三重定向落临时根；**真实 `C:\Users\peter\.dsh` 零读写**；只杀探针自启进程树（上节已核实回收）；token 一律 `<redacted>`。
- **插件装载（`--stage-plugin` 两段式，install.ps1 新布局同款官方注册通道）**：
  1. 空 home 起一次宿主（同端口）让它**自物化**默认 profile（`profiles/web/package.json` 的 `dsh.profile.bundles` 由宿主自选——不硬编码，跨代形状漂移安全），liveness 即杀树；
  2. junction `profiles/web/node_modules/dsh-novel-writing` → 仓库工作区 + profile package.json 幂等注册（`dependencies.dsh-novel-writing = file:<repo>` + `dsh.profile.bundles` **追加**，绝不替换既有项）。
- **关键实证（首批试验失败，如实记录）**：手写 profile 把 `bundles` **替换**为仅 `dsh-novel-writing`（丢 `@deepseek-ai/dsh-base`/`dsh-web-app`）⇒ 宿主自身服务永不起来（stderr：`novel-writing: pending (waiting for service: settings)` / `preset-novel-writing: pending (waiting for service: agentPresets)` / `warning: 2 entries did not activate`，路由不通）。改为**追加式**注册后即正常——`--stage-plugin` 按追加式实现。
- 预检实测：`npm view @deepseek-ai/dsh@0.2.0-rc.2` 在场（tarball `dsh-0.2.0-rc.2.tgz`）⇒ **0.2.1 退路未启用**，按任务口径直跑 0.2.0-rc.2。

## 3. 双跑读数

### 3.1 Run 1 — 宿主 0.2.2-rc.1（桌面运行时 CLI）

| 项 | 读数 |
|---|---|
| 调用 | `node scripts/probe-host.mjs --run --host-cmd 'D:\app\dsh\resources\runtime\cli\bin\dsh.cmd' --port 3211 --timeout 90 --stage-plugin --keep --json-out %TEMP%\c018\probe-0.2.2.json` |
| 宿主版本 | CLI `--version` = **0.2.2-rc.1**（诊断载荷 `host.versionCode=tp4-unprobed`，`version=null` 系 COMPAT-014 B-N3 枚举化设计，非缺读） |
| 插件 | 仓库工作区 v0.5.3（junction 接入）；staging 两步全绿（junction + deps + bundles 追加，保留既有 2 项 base bundles） |
| 退出码 | **1**（唯一红面 = L2） |
| liveness | `/` → HTTP **401**（auth fence；探词语义 status<500 = live）；boot1 物化段 404 |
| 诊断路由 | `/novel-writing/api/compat` → HTTP **200**，`ok:true`，载荷 6304 B |
| L1 服务端 API 面 | 契约面 1 全 11 项在载荷内（缺项无）✅；路由自报 scope = 11 声明 / 9 覆盖 / 2 未探测 |
| L1 探测明细 | ok 9/11；未 ok 两项 = `1.4:retired`、`1.11:out-of-boundary-scope`（**路由自身枚举声明的未探测项**，非宿主能力断裂；含 1.6 `settings forms-describe/update → config-paradigm ok:true`） |
| L2/L3 客户端·DOM | ❌ `browser-probe-unavailable`（宿主闭包未解析到 playwright——如实标注，不伪造） |
| L4 安装注册面 | ✅ 仓侧脚本在场 2/2 |
| L5 预设 manifest 面 | ✅ 仓侧预设目录在场（preset.yml + agent.cordis.yml + SKILL 29） |
| L6 版本环境面 | ✅（契约 current=0.1.5-rc.2 × fixtures 3 份离线对账；见 §4 缺口 1） |
| 结论行 | 断点层 = L2 客户端 API 面（浏览器层 unavailable） |
| host.log 关键行 | `dsh web: http://127.0.0.1:3211/?token=<redacted>`（仅此一行；pid 18128） |
| 进程回收 | 端口 3211 → `000`；残留 node 扫描 NONE |

### 3.2 Run 2 — 宿主 0.2.0-rc.2（npm tarball 解包直跑）

| 项 | 读数 |
|---|---|
| 取材 | `npm pack @deepseek-ai/dsh@0.2.0-rc.2 --pack-destination %TEMP%\c018`（只读下载）→ 解包 `%TEMP%\c018\dsh-0.2.0-rc.2\package`；`package.json` `bin` = **`lib/bin.js`**；tarball **无 bundled node_modules** ⇒ 在解包目录内 `npm install`（551 包，落 `%TEMP%`，见 §5 偏离 3） |
| 调用 | `node scripts/probe-host.mjs --run --host-cmd %TEMP%\c018\dsh-0.2.0-rc.2\package\lib\bin.js --port 3212 --timeout 90 --stage-plugin --keep --json-out %TEMP%\c018\probe-0.2.0.json`（`.js → process.execPath` 分支承载，绕开 .cmd 层） |
| 宿主版本 | `node lib\bin.js --version` = **0.2.0-rc.2**（exit 0） |
| 插件 | 同一仓库工作区 v0.5.3（junction）；staging 两步全绿（同款追加式） |
| 退出码 | **1**（唯一红面 = L2，同 Run 1） |
| liveness | `/` → HTTP **401**；boot1 物化段 401 |
| 诊断路由 | `/novel-writing/api/compat` → HTTP **200**，`ok:true` |
| L1 服务端 API 面 | 与 Run 1 同形：11 项全在载荷；**逐探测项（item/ok/mode/service/method/code）与 0.2.2-rc.1 完全一致**（Compare-Object 零差集）——ok 9/11 + `1.4:retired` + `1.11:out-of-boundary-scope`；**0.2.0 关键断面 1.6 `settings forms-describe/update`（SettingsForms 范式）ok:true** ——BUG-011 断面在 0.2.0 代宿主的运行期实读 |
| L2~L6 | 与 Run 1 逐行同读数（L2 ❌ unavailable / L4 ✅ / L5 ✅ / L6 ✅） |
| host.log 关键行 | `dsh web: http://127.0.0.1:3212/?token=<redacted>`（pid 14592） |
| 进程回收 | 端口 3212 → `000`；残留 node 扫描 NONE |

**双跑总结**：DEC-154 双表面适配在 0.2.0-rc.2 与 0.2.2-rc.1 两代隔离实例上取得**逐项相同**的服务端面 1 运行期读数（同一插件构建 v0.5.3）；退出码 1 均来自 L2 浏览器层如实降级，非宿主能力断裂。

### 3.3 探针自身缺陷如实披露（发现未修，本锁面内零语义改动）

- **L1 第 2 行「服务端探测项 ok 读数」为真空通过**：探针读 `payload.probes`（顶层），而路由载荷把 probes 放在 `report.probes`（顶层键 = `contract`/`ok`/`report`）⇒ 过滤源为空数组恒 ✅。本文件 §3.1/3.2 的「ok 9/11 + 2 未探测」为人工从 `report.probes` 直读的**真实读数**。修它会把 verdict 从 L2 改判 L1（1.4/1.11 计入 notOk）——属退出码/结论语义变更，超出本会话「零改动」边界，留待后续任务。
- `REAL-RUN: UNVERIFIED` 标记未翻转为已验证：smoke 接线守卫断言该标记存在（防静默转正）；翻转需配套 smoke 断言改动 + 人工确认流程，超出本锁。本证据文件即「实跑输出已经人工确认」的落点。

## 4. COMPAT-018 遗留项映射表（plan-tracker 2026-10-23 口径逐项）

遗留①「0.2.0-rc.2 fixtures 转正 + smoke fixture 断言集扩 + CI mock 面对齐〔SettingsProvider→SettingsForms〕」：

| 子项 | 现状 | 满足度 | 依据 |
|---|---|---|---|
| 0.2.0-rc.2 fixtures 转正 | `test/fixtures/host-generations/decl-0.2.0/`（`expected.json` + `surfaces/surfaces.json`，evidenceSource=tarball-scan，collectedAt=2026-11-07）+ `lib/host-compat/generation-manifest.mjs` 登记（representativeVersion `0.2.0-rc.2`） | **满足（替代形态，COMPAT-021/023）**。**缺口如实**：probe-host 自身的 `test/fixtures/host-surfaces/` 家族（`--self-check` L1/L6 消费面）仍 0.1.x-only——契约 `hostSurface.current='0.1.5-rc.2'`、`versionFacts` 三条全 0.1.x、`requiredExports['@deepseek-ai/dsh-settings']` 仍含 `SettingsProvider`；原文设想的「第四份 host-surfaces fixture + 契约重基」未做 | 目录在场实读；`lib/host-contract.mjs` L327-361 |
| smoke fixture 断言集扩 | smoke 336→**342**（COMPAT-023：①30 格结构 fail-closed ②四代离线缓存零凭据 ③采集脚本只读纪律 ④preflight `--surfaces` 接线 ⑤三探针 boot 统一 ⑥W1-W6）+ BUG-011 B2 双源判据（COMPAT-020 起） | **满足（替代形态）**——断言组挂在 host-generations/surfaces.json 证据面，非原文设想的 host-surfaces fixtures 面 | `test/smoke.mjs` L4562+；本会话实跑 342/0 |
| CI mock 面对齐（SettingsProvider→SettingsForms） | ci.yml `L105-146` 4/4 mock（cordis/dsh-settings/dsh-home-paths/dsh-tools）仍钉 **0.1.5 面**（= 契约 `requiredExports[0.1.x]`，dsh-settings mock 含 `SettingsProvider`；`ci-mock-face.mjs` 对账口径不变） | **未做（开口）**。CI 对 0.2.x 面的覆盖目前经 smoke（四代缓存 + `--surfaces` 接线断言）间接承担；mock 面 0.2.0 化与「fixtures 家族升 0.2.x」同根同修（见上行缺口） | ci.yml 实读；`ci-mock-face.mjs`；smoke COMPAT-023 ①②④ |
| generation-manifest surfaceEvidence 面 1 SettingsProvider↔SettingsForms 断面 | `SURFACE_EVIDENCE['decl-0.2.0'].faces[1].crossSections` = `settings{present:[SettingsForms], absent:[SettingsProvider]}` + `sessions{present:[openSession,retainedBy,mainSessionId], absent:[sessions.open]}`，status=`verified`（tarball 实测），decl-0.2.1/0.2.2 同款 | **满足（COMPAT-023）**，smoke ① 看护 30 格 | `generation-manifest.mjs` L320-344 |

遗留②「probe-host 对 0.2.0 实跑〔承接 COMPAT-017 P2-3/P2-4〕」：**本文件交付**——spawn 修复 + `--stage-plugin` 装载通道 + 0.2.0-rc.2/0.2.2-rc.1 双跑读数（§1-§3）。plan-tracker 2026-10-23 记录的阻塞事实（宿主 0.2.1 闭包无 `dsh-app-boot` ⇒ CDP 探针 boot `ERR_MODULE_NOT_FOUND`）系 UI 探针（probe-nv-*）通道问题，已由 COMPAT-023「三探针 boot 统一（官方 CLI + DSH_HOME）」修复并有 smoke ⑤ 看护；probe-host 通道则经本次修复后可用。

遗留③「宿主正式版发布时复核双表面窗口」：**standing trigger，保持待触发**——三代宿主（0.2.0-rc.2 / 0.2.1-rc.2 / 0.2.2-rc.1）均处 -rc，无正式版；正式版发布时按 DEC-154 代价栏执行双表面复核（本任务不关闭该项）。

## 5. 门禁读数（全部实跑）

| 门禁 | 读数 |
|---|---|
| `node --check scripts/probe-host.mjs` | OK（0 错） |
| `node scripts/probe-host.mjs --self-check` | **6/6 层通过**，exit 0（离线面与修复前一致——修复零侵入） |
| `node test/smoke.mjs` | **342 passed / 0 failed**，exit 0（smoke 未动，计数含 342≡342 同步断言） |
| `node scripts/verify-contract-anchors.mjs` | 79 段，**FAIL = 0**（WARN=24 为既有），exit 0 |

## 6. 偏离说明（与任务原话逐条对照）

1. **新增 `--stage-plugin` 开关**（任务允许「junction/复制装载」；脚本内原无装载约定）。默认关闭，原 `--run` 行为/输出/退出码不变；两跑调用在任务给定的命令上仅追加 `--stage-plugin --keep`（`--keep` 用于留存 host.log 取证；读数完成、自建临时根 `%TEMP%\nv-probe-host-*` 已清理）。
2. **0.2.0-rc.2 调用形态**：tarball `bin=lib/bin.js` 且无 bundled 依赖 ⇒ `--host-cmd` 传 js 入口（探针 `.js→process.execPath` 分支承载）+ 解包目录内 `npm install` 551 包（全部落 `%TEMP%\c018`）。任务预判「多半是 js → 直接 node」成立一半：入口确是 js，但需先补依赖安装。
3. **0.2.1 退路未启用**：`npm view` 实证 0.2.0-rc.2 在场，按首选口径直跑；0.2.1-rc.2 面本会话未跑（非任务要求；COMPAT-020 已有 0.2.1 预设面证据，且 smoke/manifest 已覆盖其六面证据格）。
4. **探针两处缺陷发现未修**（§3.3）：L1 row-2 真空通过（payload 路径 `probes`→`report.probes`）；`REAL-RUN: UNVERIFIED` 标记未翻（smoke 守卫依赖）。二者修复都会改变结论/语义或扩面（动 smoke），超出本锁「最小面 + 零语义改动」——如实登记，建议另立任务。
5. 未 commit、未写 `.governance/`、未动 `package.json`（门禁命令全部直跑 `node <script>`，无需 scripts 登记）；未动其它文件。

## 7. R1 返工记录（2026-11-08，评审 docs/review/COMPAT-018-R1.md：APPROVED_WITH_NOTES，锁面内 F1/F2）

- **F1（P2）已修**：`hostSpawn` 的 ComSpec 包装去掉 `/s`（`/d` 保留）——`/s` 强制 cmd 剥首+末引号，与 libuv 对含空格参数的单对引号包裹语义冲突 ⇒ 含空格 `.cmd` 路径被拆成裸路径（R1 T1 实证 `'…\my' is not recognized`）；无 `/s` 时 cmd 默认引号规则保留整对引号。注释已同步改写（说明为何**不用** `/s`）。
- **F2（P3，选「代码强制」）已修**：新增 `assertHostCmdSafe(hostCmd)`——win32 `.cmd/.bat` 形态含 `"`/`&`/`|`/`<`/`>`/`^`/`%` 即 die（exit 2），在 realRun 解析出 hostCmd 后、任何 spawn/staging 之前调用；空格/括号放行。
- **微测读数（R1 复现集，全部经 probe-host 本体端到端真跑）**：
  - (a) 空格路径 `%TEMP%\c018 r1\fake dir\my fake host.cmd`（fake host = cmd 起节点 HTTP 服务监听 3215）：`--run --port 3215 --timeout 20` → 宿主正常 spawn（pid 3860）、liveness 达成、诚实判 L1（fake host 无 compat 路由：`未取得可解析载荷（status=200）`）+ L2 unavailable，**exit 1**，端口回收 `000`——**无** `'…\my' is not recognized`（修复前 `/s` 形态必现）。
  - (b) 元字符路径 `…\bad&name.cmd`（真实文件，existsSync 通过；内含写 canary 的载荷）：`--run --port 3216` → **exit 2**，报文 `hostCmd（.cmd/.bat）含 cmd 元字符 '&' ——…拒绝执行（空格/括号允许）`；**canary 未产生**（无误执行）、无监听。
  - (c) 正常路径：见下条快跑。
- **0.2.2-rc.1 快跑（R1 修复后回归）**：`--run --host-cmd D:\app\dsh\resources\runtime\cli\bin\dsh.cmd --port 3211 --timeout 90 --stage-plugin` → **exit 1**（唯一红面 L2 unavailable）、liveness 401、诊断载荷 200、面 1 载荷 11 项全在、真实探测 **ok 9/11 + `1.4:retired` + `1.11:out-of-boundary-scope`**（与 §3.1 Run 1 完全一致）、端口回收 `000`。报告存 `%TEMP%\c018\probe-0.2.2-r1.json`。
- **门禁（R1 返工后全量重跑）**：`node --check` OK；`--self-check` **6/6** exit 0；smoke **342/0** exit 0；anchors **79 段 FAIL=0**（WARN=24 既有）exit 0。
- 微测临时目录 `%TEMP%\c018 r1\` 已清理；本节改动仍只落在 `scripts/probe-host.mjs` + 本文件。
