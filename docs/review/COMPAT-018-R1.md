# COMPAT-018 R1 轻量复审报告（收口复核开发面：probe-host spawn 修复 + --stage-plugin + 双跑取证）

- 日期：2026-11-08 · 审查角色：Reviewer（独立会话）· 被审 HEAD：6758391（工作树未提交）
- 被审物：`scripts/probe-host.mjs` 未提交改动（+108/−9）+ `docs/evidence/COMPAT-018/probe-host-real-run.md`（双跑证据）
- 审查方式：diff 全读 + 双跑 JSON 独立解析与零差集复算 + **实证微测 4 例**（空格路径 / `&` 元字符 / 旧路径 EINVAL / 去 `/s` 对照；全部落 `%TEMP%\c018r1*` 自建临时目录）+ `%TEMP%\c018` 留存物核验 + 门禁全复跑 + 双宿主版本独立复核
- 约束遵守：零产品码改动（微测未触工作树）；零 `.governance/` 写入；零 commit；未跑 review-record

## 结论

**APPROVED_WITH_NOTES** — P0 = 0 · P1 = 0 · P2 = 2 · P3 = 1

核心判定：spawn 修复真实有效（旧路径 `.cmd` 直跑 = **同步 throw `spawn EINVAL`** 独立复现，errno −4071 / Node v24.13.1；双宿主版本读数独立复核一致）；`--stage-plugin` 追加式幂等装载与代码、实验残留物（stage-exp 替换式失败 err.log 逐字在场）三方吻合；双跑证据逐读数对上（**零差集复算成立**、token 零泄漏、exit 1 = L2 预期红非崩溃）；L1 row-2 真空通过缺陷**真实且定性准确**；映射表五项仓内事实全部核对。新发现：ComSpec 包装对**含空格的 .cmd 路径**实际失效（F1·P2——任务点名核验的「空格路径应允许」**核现未达成**；双跑路径均无空格故交付读数不受影响）；元字符「拒绝」仅为注释声明、无代码强制（F2·P3）。两项均在探针工具面、不动摇本交付读数有效性，与已披露的 F3 同批另立任务即可。

## 1. 门禁复跑读数（全部真跑，独立复现）

| 门禁 | 复审读数 | 开发报告声明 | 判定 |
|---|---|---|---|
| `node --check scripts/probe-host.mjs` | exit 0（0 错） | OK | ✅ |
| `node scripts/probe-host.mjs --self-check` | **6/6 层通过**，exit 0（fixtures = 0.1.1-rc.2 / 0.1.2-rc.1 / 0.1.5-rc.2；外部 DSH_HOME 在场但不读取） | 6/6，exit 0 | ✅ |
| `node test/smoke.mjs` | **SMOKE DONE: 342 passed, 0 failed**，exit 0（含 COMPAT-008 探针接线守卫 + README 342≡342 同步断言双绿） | 342/0 | ✅ |
| `node scripts/verify-contract-anchors.mjs` | 共 79 段；**FAIL = 0**；WARN = 24（既有），exit 0 | 79/0/24 | ✅ |

## 2. 逐项判定

### 2.1 spawn 修复安全与正确性（复审项 1）

- **修法核（diff 全读）**：`hostSpawn` 三分支（win32 `.cmd/.bat` → ComSpec 数组包装；`.js/.mjs/.cjs` → `process.execPath`；其余直跑）+ 唯一调用点替换（realRun L365）；`--self-check` 路径零改动（diff 不触 layerChecks/selfCheck——「离线面与修复前一致」成立）。
- **根因独立复现（T3）**：直跑 `spawn('<spacey>.cmd', …)` ⇒ **同步 throw `Error: spawn EINVAL`**（errno −4071）——Coordinator 预检「修复前 L274 spawn EINVAL」与 CVE-2024-27980 叙述吻合。
- **`.js`→execPath 分支实证**：tarball 解包 `package.json` `bin = lib/bin.js` 核对；`node …\dsh-0.2.0-rc.2\package\lib\bin.js --version` = **0.2.0-rc.2**（exit 0）。桌面 CLI `cmd /d /s /c D:\app\dsh\resources\runtime\cli\bin\dsh.cmd --version` = **0.2.2-rc.1**（exit 0）——双跑宿主身份独立复核一致。
- ❌ **空格路径实证失效（→F1）**：T1 `hostSpawn`（`/d /s /c`）+ `…\my tools\host.cmd` ⇒ `'…\my' is not recognized`（exit 1）——libuv 对含空格 arg 加**单对**引号，`/s` 语义 = 剥首/尾引号 ⇒ 裸空格路径被 cmd 拆分。对照 T1b 同参数**去掉 `/s`** ⇒ `SPACEY_OK argv1=web`（cmd 规则 1 对「两引号 + 可执行名」保引号）。代码注释「`/s` 使 cmd 剥首/尾引号后按原语义执行——更可控」的论证恰好破坏空格路径；默认 npm 全局 bin（`C:\Program Files\…`）即现实触发场景。**双跑两条 hostCmd 路径均无空格 ⇒ 交付读数不受影响。**
- ⚠️ **元字符拒绝未实现（→F2）**：全文件无任何 hostCmd 元字符校验；`&`（NTFS 合法文件名字符）路径通过 `existsSync` 后被 cmd 拆分误执行（T2 实证：首段 `'…\a' is not recognized` + 二段路径执行）；仅 `| < > "` 因 NTFS 非法文件名字符被 existsSync **隐式**拒绝。输入是操作者显式传入的可信路径 ⇒ 无外部注入面，但注释宣称「不接受此类 hostCmd」的边界与实现不符（父任务摘要「含 cmd 元字符拒绝」同此出入）。
- **默认关 = 原行为不变**：核 diff——`stagePlugin: false` 默认；不传时探查行为 / rows / verdict / 退出码零变化，仅报告 JSON 恒增 `stagePlugin: false` 一键 + help/头注释文案（纯增量，无消费方依赖）。CI sanity 步骤走 `--self-check`，不受影响。

### 2.2 `--stage-plugin` 装载纪律（复审项 2）

- **追加式幂等（代码 L322-333）**：deps 仅未注册时写；`bundles = […bundles, 'dsh-novel-writing']` **保留既有项**；junction 已存在即跳过——三处幂等全在。
- **替换式失败实验残留物实证**（`%TEMP%\c018\stage-exp`/`stage-exp2`）：stage-exp profile `bundles=["dsh-novel-writing"]`（替换式、手写 `name:"web"`）+ `host.err.log` 逐字 = `dsh: warning: 2 entries did not activate` / `novel-writing: pending (waiting for service: settings)` / `preset-novel-writing: pending (waiting for service: agentPresets)`；stage-exp2（宿主物化 `name:"dsh-profile-web"` + 追加式 bundles 含 `@deepseek-ai/dsh-base`/`dsh-web-app`）为修正形态——证据 §2「关键实证」与代码、残留物三方吻合。
- **junction 指向仓库工作区**：`symlinkSync(REPO_ROOT, dst, 'junction')`（代码）+ stage-exp2 deps `file:D:/AI/agent/deepseek/harness/writing-workflow`（残留物）双证。
- **真实 `~/.dsh` 零读写**：隔离 fail-closed 校验（DSH_HOME ⊆ 临时根）先于 staging；宿主两段 env 均 `DSH_HOME→临时根` + npm 三重定向；**旁证**：真实 `C:\Users\peter\.dsh\profiles\web\package.json` mtime = **2026-10-20 19:37**（双跑前 19 天未被触碰；真实 home 下近期写入均为本会话桌面宿主自身的 router-stats/sessions，与探针无关）。
- 小 nit（不计 finding）：已物化 home 上重复传 `--stage-plugin` 时第一段仍会起一次宿主等 liveness 再杀（幂等但多一轮启动）。

### 2.3 证据核验（复审项 3）

双跑 JSON（`%TEMP%\c018\probe-0.2.2.json` 13,898 B / `probe-0.2.0.json` 13,929 B）逐读数对上：

| 读数 | 证据声明 | JSON 实测 | 判定 |
|---|---|---|---|
| 0.2.2：port/live/stage/verdict | 3211 / 401 / on / L2 | port=3211 live=401 stagePlugin=true verdict=断点层 L2（browser） | ✅ |
| 0.2.2：诊断路由 | 200 `ok:true` 载荷 6304B | `server.ok=true`；scope `{face:1, declared:11, covered:9, unprobed:2}` | ✅ |
| 0.2.2：host 段 | version=null / tp4-unprobed | `{"version":null,"versionCode":"tp4-unprobed"}` | ✅ |
| 探测明细 | ok 9/11 + `1.4:retired` + `1.11:out-of-boundary-scope`；1.6 settings forms-describe/update ok:true | probes=11；1.4/1.11 `ok:null` mode=unprobed code=retired / out-of-boundary-scope；1.6 ok=true method=forms-describe/update | ✅ |
| 0.2.0：调用/读数 | js 入口 3212 端口，读数与 0.2.2 逐项一致 | hostCmd=`…c018\dsh-0.2.0-rc.2\package\lib\bin.js` port=3212 live=401；scope/host 同 | ✅ |
| **Compare-Object 零差集** | 逐探测项完全一致 | **复算 DIFF = NONE**（11 项 × item/ok/mode/service/method/code；rows 层面亦 NONE） | ✅ |
| token 脱敏 | host.log `token=<redacted>` | 两 JSON 全文无 `?token=`（唯一 "token" 命中 = 契约 kind 字符串 `css-token`）；残留 `nv-probe-host-Z11hyZ\host.log` 为 0 字节；host.log 原文已随临时根清理（偏离 1 如实）——无泄漏面 | ✅ |
| exit 1 语义 | 检出缺面非崩溃 | rows 唯一红 = L2 `browser-probe-unavailable`（`report.browser.available=false` + 不伪造理由）；代码 L427 `rows.every(ok)→exit 1`，verdict 完整、流程走完 | ✅ |
| 进程回收 | 端口 000 / 残留 NONE | 现时 netstat 3211/3212 无监听无连接（与杀树声明一致）；本会话未复跑双跑故以旁证计 | ✅（旁证） |
| 551 包 | npm install 551 包 | 目录面实测 181 顶层（30 个 @scope）/ 531 展开包目录——npm「added 551」为依赖树计数口径，非矛盾（如实记） | ✅（口径注记） |

### 2.4 L1 row-2 真空通过缺陷（复审项 4）

- **载荷实证**：`server` 顶层键 = **`ok` / `report` / `contract`** ⇒ `payload.probes` 不存在 ⇒ L393 `(payload.probes ?? [])` 恒 `[]` ⇒ row-2 恒 ✅——**缺陷真实，「payload.probes vs report.probes」定性准确**（真身 = `report.probes`）。
- row-1 非真空：读 `payload?.contract?.items ?? payload?.items`，`contract.items` 在场（11 项）——仅 row-2 错键。
- **后果核对**：1.4/1.11 为 `ok:null`（非 false）——修复键后按现行过滤 `p.ok !== true` 确会计入 notOk ⇒ verdict L2→L1；且该两项是路由**自声明未探测**（枚举码 retired / out-of-boundary-scope，非宿主断裂），naive 修复会把「设计内未探测」升格为断点层 ⇒ 修复需连带 notOk 细分口径——「属退出码/结论语义变更、留待后续任务」的判断正确（→F3 确认）。
- 证据 §3.1/3.2 的「ok 9/11 + 2 未探测」为 `report.probes` 人工直读——本会话独立复算一致（真实读数，非真空产物）。

### 2.5 遗留映射表逐行（复审项 5）

| 子项 | 声明 | 独立核验 | 判定 |
|---|---|---|---|
| decl-0.2.0 fixtures 转正（替代形态） | `test/fixtures/host-generations/decl-0.2.0/`（expected.json + surfaces/surfaces.json，tarball-scan，2026-11-07）+ manifest 登记 | 目录/文件在场；manifest L320-324 `representativeVersion:'0.2.0-rc.2'` / `evidenceSource:'tarball-scan'` / `collectedAt:'2026-11-07'` | ✅ |
| surfaceEvidence 面 1 断面 | settings/sessions 双向断面 verified | L327-343 `faces[1].status='verified'` + `settings{present:[SettingsForms], absent:[SettingsProvider]}` + `sessions{present:[openSession,retainedBy,mainSessionId], absent:[sessions.open]}`；decl-0.2.1/0.2.2 同款（L399+/L477+） | ✅ |
| probe-host fixtures 0.1.x-only（缺口如实） | host-surfaces 家族 + 契约 current/versionFacts/requiredExports 仍 0.1.x | self-check 实跑 fixtures = 0.1.1-rc.2/0.1.2-rc.1/0.1.5-rc.2；契约 L327-361 `current:'0.1.5-rc.2'` + versionFacts 三条全 0.1.x + `requiredExports['@deepseek-ai/dsh-settings']` 含 `SettingsProvider` | ✅ |
| CI mock 面未对齐（开口） | ci.yml L105-146 4/4 mock 钉 0.1.x 面（dsh-settings mock 含 SettingsProvider）；ci-mock-face 口径不变 | ci.yml L115/L136/L142/L146 四 mock 在场，L132-133 mock 导出 `SettingsProvider`（= 0.1.x requiredExports 面）；`ci-mock-face.mjs` 在仓 + sanity 接线 L34/L56 | ✅ |
| 遗留② = 本文件交付 / 遗留③ standing | ②spawn 修复 + 装载 + 双跑；③三代均 -rc 保持待触发 | ②见 §2.1-2.3；③无正式版发布事实（manifest 三代 representativeVersion 均 -rc） | ✅ |
| REAL-RUN 标记未翻 | smoke 接线守卫断言常量存在，翻转需配套改 smoke | smoke L3055-3073 常量赋值行锚定守卫 + 判别力对照（伪造常量 ⇒ 新守卫红）在位；probe-host L50 常量未动 | ✅ |

### 2.6 裁量点

1. **exit 1 收口可接受为「预期语义下的通过」**——判据满足：两跑唯一红面 = L2 浏览器依赖缺失（宿主闭包未解析到 playwright，如实降级、不伪造）；服务端面 1 无断裂（11/11 在载荷、9/11 ok、2 项为路由枚举声明的未探测、1.6 SettingsForms 范式 ok:true = BUG-011 断面运行期实读）；liveness 401 = auth fence 存活语义（status<500=live 既有口径）。**附带条件**：「唯一红面」的表述依赖 L1 row-2 真空（修复后 verdict 将改判 L1）——接受以 F3 另立任务为前提，且在 F3 落地前引用本证据时应同时引用 §3.3 披露。
2. **双跑零差集对 COMPAT-018② 的证明力成立且边界准确**：复算零差集（11 项 × 6 字段 + rows）+ 同一插件构建（junction 同指本仓工作区）+ 双代宿主身份独立复核（`--version` 双双实证）⇒「服务端面 1 运行期读数两代逐项相同」成立。边界如实：仅覆盖面 1 运行期（L2/L3 双跑均 unavailable、L4/L5 为仓侧事实、L6 离线对账）——证据措辞已自限「服务端面 1」，无过度声明。
3. **两缺口另立任务必要**：缺口 A（host-surfaces fixtures 家族 + 契约 current/requiredExports 升 0.2.x）牵一发动全身（契约重基 → ci-mock-face 对账口径 → smoke 断言 → README），与本会话锁「最小面 + 零语义改动」冲突；缺口 B（CI mock 面 0.2.x 化）与之同根同修（映射表判断正确）。现实风险已由 host-generations 证据面 + smoke COMPAT-023 ①②④ 间接看护承接 ⇒ 非阻塞性开口；但「mock 运行时面仍钉 0.1.x 表面」意味着 **CI 绿 ≠ 0.2.x settings 表面运行时验证**——该差距应随任务落地消除。F3 与 F1/F2 同文件同工具面，同批立项更优。

## 3. Findings

| # | 严重度 | 位置 | 问题 | 可操作修复 |
|---|---|---|---|---|
| F1 | **P2** | scripts/probe-host.mjs:264-269（hostSpawn win32 `.cmd/.bat` 分支） | `/d /s /c` 数组式包装对**含空格的 .cmd 路径**失效：libuv 单对引号被 `/s` 剥除 ⇒ cmd 拆裸路径（实证 `'…\my' is not recognized`，exit 1）；注释「`/s` …更可控」论证反致破坏；默认 npm 全局 bin（`C:\Program Files\…`）即触发场景 | 去掉 `/s`（同参实证通过：cmd 规则 1 保引号）或改显式整串包装；补空格路径回归微测（复用本报告 T1/T1b 形态） |
| F2 | P3 | scripts/probe-host.mjs:258-260（注释）+ resolveHostCommand | 元字符「不接受」仅注释声明、零代码强制：`&` 等 NTFS 合法字符路径过 existsSync 后被 cmd 拆分误执行（实证）；仅 NTFS 非法字符（`\|<>"`）被隐式拒绝。可信输入 ⇒ 无注入面，属文档-实现不符 + 健壮性缺口 | hostSpawn 显式校验元字符集（`& % ^ ! ( )`）→ `die`（exit 2）；或注释改口「NTFS 非法字符天然不可达，其余元字符未防护」 |
| F3 | **P2**（developer 已披露，本会话确认定性） | scripts/probe-host.mjs:393 | L1 row-2 真空通过（`payload.probes` vs `report.probes`）：缺陷真实、定性准确；修复将使 verdict L2→L1 且需 notOk 细分（`ok:null` + 枚举码 ≠ 宿主断裂），naive 修复会误报断点层 | 另立任务：键修正 + unprobed 口径细分 + `REAL-RUN: UNVERIFIED` 标记翻转配套（smoke 守卫同步）一并设计 |

P0 = 0 · P1 = 0 · P2 = 2 · P3 = 1

## 4. 提交建议

**建议提交**（APPROVED_WITH_NOTES）。条件：

1. **F1/F2/F3 合并另立一个「probe-host 实跑面收尾」任务**（同文件同工具面：F1/F2 是 hostSpawn 小修，F3 需语义设计与 smoke 守卫配套）——避免探针「实跑可用但边界带刺」状态长期存续；
2. 两缺口（host-surfaces fixtures 家族 0.2.x 化 + CI mock 面对齐）按映射表既有判断另行立项（同根同修，非本交付阻塞项）；
3. 提交信息可引用本报告裁量判定：exit 1 = L2 预期红（§2.6①）；双跑零差集独立复算成立（§2.3）。

复审全程零产品码改动（实证微测全部落 `%TEMP%\c018r1*` 与 `%TEMP%\c018r1-spawn-*` 自建临时目录）；零 `.governance/` 写入；零 commit；未跑 review-record。工作树除本报告外与审查起点一致。
