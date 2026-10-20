# BUG-011 代码审查报告 R3（独立 Code Reviewer，最终自动轮）

- **任务**: BUG-011 —— dsh 0.2.0-rc.2 升级适配实现批（RISK-012 欠账补审）
- **轮次**: R3（R2 = NEEDS_CHANGE / unresolved_blockers=1 后的强制复审；T1 round=3）
- **审查日期**: 2026-10-20
- **审查者**: Code-Reviewer（独立；只读）
- **前轮报告**: `.governance/review-BUG-011-R1.md`、`.governance/review-BUG-011-R2.md`（已重读）
- **审查对象**: 工作区未提交改动 vs `d8d93c2`（R1+R2+R3 累积；产品面 11 文件：`.github/workflows/ci.yml`、`.gitignore`、`CHANGELOG.md`、`README.md`、`install.ps1`、`install.sh`、`lib/host-boundary.js`、`lib/host-contract.mjs`、`lib/index.js`、`test/fixtures/host-surfaces/probe-face.mjs`、`test/smoke.mjs`）；治理面（`.governance/**`、`docs/**`）不在审查范围
- **审查方式**: 只读（`git diff/status/show`、文件读取、`node --check`、`node test/smoke.mjs`、`node test/fixtures/host-surfaces/probe-face.mjs`、`node test/validate-preset.mjs`、`node test/fixtures/host-surfaces/ci-mock-face.mjs`、`bash -n install.sh`、Windows PowerShell 5.1 / pwsh 7 Parser、受控参数失败路径、对真实 `C:\Users\peter` 与 `~/.dsh` 的只读核验）；未修改产品代码/配置/其他治理文件；唯一写入 = 本文件

- **结论行（机读）**:

```
REVIEW-BUG-011-R3 APPROVED_WITH_NOTES / unresolved_blockers=0
```

> `unresolved_blockers` = 未闭环 P0（0）+ P1（0）。R2 的唯一阻塞项 P0-3 已真闭环；P2-13/P2-14/P2-20 已闭环；R1 五项在 R2 口径下仍闭环且无回归；M7.7 真实环境误写事件无未清理残留、无披露失实、真实 `~/.dsh` 用户数据完好 ⇒ 不阻塞。剩余为 P2/P3（按 code-review 分级不计数），见 §4/§5。

---

## 1. 结论摘要

- **P0-3 真闭环**：`install.ps1` 首 3 字节 = `239 187 191`（UTF-8 BOM），全文 0 处 `||`，Windows PowerShell **5.1.26100.9711** `Parser::ParseFile` = **0 errors**，pwsh 7 = **0 errors**；新增 CI job `install-ps-parse` 在 windows-latest 上用 `shell: powershell`（PS 5.1）断言 BOM + 0 ParserError，并用 pwsh 7 对照；`probe-face` 的 `GATE_BASIC_JOBS` 登记新 job 后，② 的**逐事件精确集合对账未被放宽**（实跑 probe-face 28/28）。
- **P2-13/14/20 真闭环**：sh 非法 `--host-generation` 值在参数解析处 `exit 2`（实测 `bogus` → exit 2，未进入任何安装写路径）；PS `[ValidateSet]` 已纳入 `unknown`（实测 `bogus` → 参数绑定 exit 1，报错列出 `auto,decl,legacy,unknown`）；`.scratch*/` 已入 `.gitignore`（`git check-ignore` 命中，`git status` 不再列出 `.scratch`）。
- **R1 五项仍闭环**：P0-1 契约 4.7（probe-face 28/28、items 52）；P0-2 async 写入（`settingsFormsUpdate` await/catch、`runLegacyMigrationOnce` 捕获 + warn、smoke ①d 通过）；P1-3 契约登记/重基（1.6/1.10 行号已修正、1.8 symbol 补 `ctx.inject`）；P1-4/P1-5 按 R2 口径仍成立且未被本轮改坏；`smoke 308/0`、`validate-preset PASS`、`ci-mock-face 4/4`、`bash -n 0`。
- **M7.7 事件处置**：独立只读核验确认 `C:\Users\peter\profiles`、`C:\Users\peter\.agent-presets`、`C:\Users\peter\settings.yaml` 均不存在；`C:\Users\peter` 顶层无 20:25 之后新增残留；真实 `~/.dsh` 的 novel-writing 配置/旧档/注册包完好（详见 §3）。未发现未清理残留或披露失实 ⇒ **不阻塞合并**。残余为证据可审计性（P2-22）与矩阵防复发脚本未入仓/未独立核验（P2-23，待验证），不升级为 P0/P1。
- 无新 P0/P1。R3 按 T1 终态通过（`unresolved_blockers=0`），无需 R4；P2 留票与 P3 记录见 §4/§5。

---

## 2. R2 阻塞项 → 闭环证据

### P0-3（install.ps1 在 Windows PowerShell 5.1 下不可解析）→ **闭环**

| 判据 | 实测 |
|---|---|
| UTF-8 BOM | 首 3 字节 `239 187 191`（文件大小 32432，558 行） |
| `||` 消除 | `Select-String install.ps1 -Pattern '\|\|'` = **0** 处（`-or` 10 处） |
| PS 5.1 Parser | **0 errors**（`powershell.exe` 版本 **5.1.26100.9711**，与 CHANGELOG 自述一致） |
| pwsh 7 对照 | **0 errors** |
| PS 5.1 失败路径 | 非法 `-HostGeneration bogus` → 参数绑定 exit 1，报错列出 `auto,decl,legacy,unknown`（未执行脚本体） |
| 回归门禁 | 新增 `.github/workflows/ci.yml:402` `install-ps-parse`；`shell: powershell`（Windows PowerShell 5.1）；BOM 三字节断言 + `Parser::ParseFile` 0 errors；`shell: pwsh` 对照；`if: github.event_name != 'schedule'`（push/PR/dispatch 执行） |

**CI 守卫有效性（重点核验）**：`probe-face.mjs:90` 将 `install-ps-parse` 加入 `GATE_BASIC_JOBS`；`expectedByEvent` 仍为 `push/PR = GATE_BASIC_JOBS`、`schedule = [host-latest-probe]`、`dispatch = [...GATE_BASIC_JOBS, host-latest-probe]`；`gateMismatch` 对**所有 job** 求每事件真值集合并与 `expectedByEvent` 精确比较，`gateUnknown` 对无法求值的 `if` 记红。新增 job 的 `if != schedule` 恰好落在这三类事件集合内 ⇒ **只是合法登记，不是放宽**；若新 job 的 `if` 写错，② 会红（实跑 probe-face 28/28 通过）。

### P2-13（sh 非法覆盖值落回 legacy）→ **闭环**

- `install.sh:44`：`--host-generation) case "$2" in auto|decl|legacy|unknown) HOST_GEN_OVERRIDE="$2" ;; *) echo "错误：--host-generation 的值非法：'$2'（合法值：auto|decl|legacy|unknown）" >&2; exit 2 ;; esac; shift 2 ;;`
- 实测：`bash install.sh --host-generation bogus --local .` → **exit 2**，仅错误行；参数解析发生在 `DSH_HOME`/`SRC` 解析与任何写操作之前 ⇒ **零写入**。不再可能因 typo 落回 legacy insert/预设同步。

### P2-14（PS `-HostGeneration unknown` 不可达）→ **闭环**

- `install.ps1:58`：`[ValidateSet('auto', 'decl', 'legacy', 'unknown')]`；`:211` 的 unknown 覆盖分支由死代码变为可达；unknown 分支与 sh 对称：跳过 insert/撤除、settings.yaml、`.agent-presets` 同步，仅保留链接/注册（安装必需）并提示。
- 实测非法值 `bogus` → 参数绑定 exit 1，错误列出四个合法值；未执行脚本体（零写入）。

### P2-20（`.scratch*` 未忽略）→ **闭环**

- `.gitignore:15` 新增 `.scratch*/`；`git check-ignore -v .scratch-bug011/` → `.gitignore:15:.scratch*/`；`git status` 不再列出 `.scratch-bug011`（剩余未跟踪项为 `.governance/**`，属治理面，不在本次审查范围）。

---

## 3. M7.7 真实环境误写事件（独立只读核验）

**事件事实（RISK-013 / CHANGELOG / EVD-136）**：R2 返工期间安装器隔离矩阵脚本误用 `$home`（PowerShell 变量名大小写不敏感，与只读自动变量 `$HOME` 同名）⇒ `DSH_HOME` 回落实值 `C:\Users\peter`，在用户主目录新建 4 项：`profiles/nvtest/cordis.patch.yml`、`profiles/node_modules/dsh-novel-writing`（4366 文件）、`.agent-presets/novel-writing`（78 文件）、`settings.yaml`（86 B）。Developer 按 CreationTime 取证→逐项删除；Coordinator 独立核实；RISK-013 已登记。

### ① 处置过程是否足以支撑「用户数据未损坏」

独立只读核验（本审查执行）：

| 路径/面 | 结果 |
|---|---|
| `C:\Users\peter\profiles` | **False**（不存在） |
| `C:\Users\peter\.agent-presets` | **False** |
| `C:\Users\peter\settings.yaml` | **False** |
| `C:\Users\peter` 顶层 CreationTime > 20:25 的条目 | **0** |
| `C:\Users\peter\.dsh\profiles\nvtest` | **False** |
| `C:\Users\peter\.dsh\profiles\node_modules\dsh-novel-writing` | **False**（事件误写的是 `C:\Users\peter\profiles`，非 `.dsh`） |
| 真实 `~/.dsh/profiles/web/cordis.patch.yml` | 存在，含 `- id: novel-writing`（442-443）、`workspaceRoot: D:\AI\writing`（445）、`bindings: novel-001: session-afdf4990-…`（446-447）；mtime 2026-10-20 20:29:18（**早于事件窗口 20:33**） |
| 真实 `~/.dsh/settings.yaml.imported` | 存在，23096 B，mtime 2026-10-16 10:49:50；含 `novel-writing:`（961）+ 同一 workspaceRoot/bindings（962-964）以及 router/agent-presets 等节 ⇒ 旧档完好 |
| 真实 `~/.dsh/profiles/web/package.json` | 存在，bundles 含 `dsh-novel-writing`（L11），dependencies `link:D:/AI/agent/deepseek/harness/writing-workflow`（L22） |
| 真实 `~/.dsh/.agent-presets/novel-writing` | 存在，mtime 2026-09-16 07:27:46（旧 0.1.x 遗留，非本次事件） |
| `C:\Users\peter\.dsh` 顶层 CreationTime/LastWriteTime > 20:25 | **0** |

**判断**：对**真实 DSH 用户数据**（profile patch / 旧档 / 注册包 / 预设）**未损坏**有直接证据；4 项误写均为插件安装面、且 `settings.yaml` 86 B 与安装器默认配置规模一致；顶层无残留。**处置过程（取证→删除→复核）总体足以支撑「无当前残留、真实 `.dsh` 用户数据未损坏」**。**残余证据缺口（P2-22）**：删除后无法独立证明 `C:\Users\peter\profiles`（用户主目录下的通用名目录）在事件前不存在；RISK-013 称「均为新建、可逆」，但 CreationTime 取证记录未入仓/未固化。建议：将事件窗口的 CreationTime 快照、删除前清单/哈希写入 evidence，或今后删除前先移入受控回收目录再复核；这不改变「当前无残留、用户数据完好」的结论。

### ② 防复发守卫是否真的在矩阵脚本里生效

- CHANGELOG `:48` / RISK-013 / EVD-136 均描述：矩阵脚本改用 `$isoRoot` / `$isoHome`，并在每次安装器执行前断言 `DSH_HOME` **MUST** 以 `%TEMP%` 为前缀（否则 throw），重跑通过、真实 `$HOME` 零残留。
- 本审查的**可核验范围**：在仓库（`*.ps1`/`*.mjs`，含 `.scratch-bug011` 顶层与 `scripts/`）、`%TEMP%` 顶层近期文件中**未找到该矩阵脚本本体**；无法直接读取其 `$isoRoot`/`$isoHome` 变量与 `DSH_HOME` 前缀断言代码，也未见其入仓/入 CI。因而该守卫的**代码级生效**标 `待验证`（P2-23），只能核验其**结果面**（无残留、真实 `.dsh` 数据完好）。
- 结论：不因「脚本未入仓」判 P0/P1（事件已登记、结果可核、无残留/无披露失实，符合 R3 请求的判定口径）；但建议把矩阵脚本/其哈希与运行输出入 evidence 或仓内测试资产，否则「防复发」只依赖人工记忆，下一次矩阵重写可能再次遗漏。

### ③ CHANGELOG「过程披露」与事实一致性

- `CHANGELOG.md:48` 如实写出：`$home`/`$HOME` 大小写不敏感同名根因、`DSH_HOME` 回落实值、在 `C:\Users\peter` 下产生 **4 项**（逐项列名：`profiles\nvtest`、`profiles\node_modules` 插件拷贝、`.agent-presets\novel-writing`、`settings.yaml`）、按创建时间取证并逐项清除、复核真实 `~/.dsh` 未被触碰、以 `$isoRoot`/`$isoHome` 重写矩阵并加 `%TEMP%` 前缀守卫、重跑通过且真实 `$HOME` 零残留。未发现美化、删项或与事实相反之处；`settings.yaml` 86 B / 4366 / 78 文件等细项在 RISK-013，未在 CHANGELOG 重复。
- 独立核验支持其关键事实（§3①：4 项路径均不存在、顶层无新增残留、真实 `.dsh` 数据完好）；矩阵守卫本体**待验证**（§3②）。
- **披露结论**：**可接受，不构成 P0**。P3 记录：CHANGELOG 未写「删除前这些顶层目录是否可能已存在」的证据口径；建议随 P2-22 一并补齐。

### ④ 是否阻塞

**不阻塞**。依据：无未清理残留（三条路径 + 顶层均无）、真实 `.dsh` 用户数据完好、CHANGELOG 未发现失实；事件已入 RISK-013 并明确「清理已独立核实」。P2-22/P2-23 为证据可审计性缺口，不属「未清理残留或披露失实」，按 R3 请求不升级为 P0。

---

## 4. 回归面与 R1 五项

| R1 项 | R3 状态 | 证据 |
|---|---|---|
| P0-1 契约 4.7 | **仍闭环** | `probe-face` 28/28；`smoke` items 52/面分布通过；4.7 line `L160-219 / L84-146` 实测一致 |
| P0-2 async 写入 | **仍闭环** | `host-boundary.js` `settingsFormsUpdate` async await/catch（属性访问已移入 try）；`index.js` `await` + `runLegacyMigrationOnce` 捕获；smoke ①d 通过；`smoke 308/0` |
| P1-3 契约登记/重基 | **仍闭环** | 1.6 `L111（调用点 L1600、L119）` 实测；1.10 `L189 / L179 / L146` 实测；1.8 symbol 已补 `ctx.inject(['webServer'])`；2.14/4.7/5.7 与 revisions BUG-011 在场；`smoke`/`probe-face` 通过 |
| P1-4 js-yaml | **按 R2 口径仍闭环（根因 P2-15）** | 失败语义：`yaml-parser-unavailable` + auto warn + 手动路由结构化错误；根因（离线通道缺依赖）未变，仍为 P2 |
| P1-5 三态 fail-safe | **仍闭环（边界 P2-13/14/20 已修）** | `install.ps1`/`install.sh` unknown 四类跳过；P2-13/14 闭环；旧 0.1.x 不撤除；sh unknown 分支在 R2 已观察 skip（见 R2 §7 环境口径） |

**回归门禁（R3 真跑）**：
- `node --check`（`lib/index.js` / `lib/host-boundary.js` / `lib/host-contract.mjs` / `lib/client.js` / `test/smoke.mjs`）= 0 错；
- `node test/smoke.mjs` = **308 passed / 0 failed**（README `:171` 声明 308 ≡ 实测）；
- `node test/fixtures/host-surfaces/probe-face.mjs` = **28/28 OK**；
- `node test/validate-preset.mjs` = **PASSED**（schema-face PASS、skills 29/29）；
- `node test/fixtures/host-surfaces/ci-mock-face.mjs` = **4/4**；
- `bash -n install.sh` = 0；
- PS 5.1 Parser = 0 errors；pwsh 7 = 0 errors。

**未改坏的 R2 P2 留票（仍成立、本轮未修）**：P2-15（P1-4 根因：离线/junction 通道缺 `js-yaml`，installer 不装依赖，手动路由对同一失败无效）、P2-16（迁移级看护仍缺，①d 只覆盖 `settingsFormsUpdate`）、P2-17（Face1 1.8 探针仍可假绿 + `logWarn` 死分支）、P2-18（install 写 profile patch 仍非原子）、P2-19（迁移仍只在首个 HTTP 请求触发）、P2-21（stale npm root 仍可能误判 legacy）。这些是 P2（不计数），不因本轮改动恶化；建议后续批次处理。

---

## 5. 新发现（均 P2/P3，不阻塞）

### P2-22 — M7.7 清理证据的后验可审计性

- 事实：4 项路径当前均不存在、真实 `.dsh` 数据完好（§3①）；但删除后无法独立证明 `C:\Users\peter\profiles`（用户主目录通用名目录）在事件前不存在，RISK-013 的「均为新建」依赖 CreationTime 取证记录，该记录未入仓/未固化。
- 影响：用户数据未损坏的**结论**有直接数据面支撑（`.dsh` 完好、4 项为插件面、86 B 默认配置），但「未删除任何既有用户内容」的后验证据不足。
- 最小修复方向：把事件窗口 CreationTime 快照、删除前清单/哈希、删除命令输出写入 evidence；今后对真实主目录删除一律先 move 到回收目录并保留哈希，再复核。

### P2-23 — 矩阵防复发脚本未入仓/守卫不可独立核验

- 事实：CHANGELOG/RISK-013/EVD-136 自述 `$isoRoot`/`$isoHome` + `DSH_HOME` 必须 `%TEMP%` 前缀断言；本审查在仓库（含 `.scratch-bug011` 顶层、`scripts/`）与 `%TEMP%` 顶层近期文件中未找到该矩阵脚本本体，无法读取其守卫代码，也无法复跑四态矩阵（decl/legacy/unknown/非法值）。
- 影响：本轮只能核验「结果面」（未知/非法值 fail-closed、无残留、真实 `.dsh` 完好）；「以后不再复发」目前依赖人工纪律，不是可审计资产。
- 最小修复方向：把矩阵脚本作为测试资产入仓（或至少把脚本、sha256、运行输出、四态结果入 evidence）；对 `DSH_HOME` 前缀断言加一条**负例**（故意传 `C:\Users\peter` 必须 throw）以证明守卫非恒真。

### P3 级（记录，不计数）

- **P3-24**：`CHANGELOG.md:40` 写「R1 五项已闭环」；R2 报告对 P1-4 的口径是「失败语义闭环、根因 P2-15」。建议措辞改为「R1 五项按 R2 口径闭环（P1-4 根因 P2-15 留票）」，避免读者把 P1-4 根因读成已修。
- **P3-25**：新增 CI job `install-ps-parse` 未显式断言 `$PSVersionTable.PSVersion.Major -eq 5`；当前 GitHub `windows-latest` 的 `shell: powershell` 是 5.1，若未来 shell 映射变化，PS 5.1 判据可能退化为 pwsh 7 重复。建议加一行版本断言。
- **P3-26**：`lib/index.js` `runLegacyMigrationOnce` 的 `this.logger()?.warn?.(...)` 仍在 try 之外，自动路径 `void` 无最终 `.catch`（R2 P3-25 未变）；正常宿主不触发，防御性建议包一层 try 或最终 `.catch`。
- **P3-27**：`probe-face.mjs` ② 的断言文案仍写「sanity/host-logic 反向 if」，未列 `install-ps-parse`；断言逻辑已覆盖（28/28），仅文案陈旧。
- **P3-28**：`.scratch-bug011/` 目录仍存在（已被 ignore，git status 不列）；内含合成 `.credentials.yaml` 与旧验证树，建议随工作区清理归档，避免长期占用/误用。
- **P3-29**：`CHANGELOG.md:40` 写「P2-13/14/20/27」；其中「27」对应 R2 的 P3-27（sh unknown 完成语文案），编号口径应统一为 P3-27。

---

## 6. CHANGELOG/README 事实性核对

| 声明 | 核验 |
|---|---|
| `install.ps1` BOM = `239 187 191` | ✅ 实测首 3 字节 |
| `||` 改 `-or`，PS 5.1 `Parser` 0 errors（5.1.26100.9711） | ✅ 实测 PS 版本与 0 errors；0 处 `||` |
| pwsh 7 对照 0 errors | ✅ |
| `smoke 308/0`；`probe-face 28/28`；`validate-preset PASS`；`ci-mock-face 4/4`；`bash -n 0`；`node --check` 全过 | ✅ 全部真跑复现 |
| P2-13 `bogus` ⇒ exit 2、零写入 | ✅ 实测 exit 2；参数解析先于写路径 |
| P2-14 非法值 exit 1 并列出 `auto,decl,legacy,unknown` | ✅ 实测 |
| `.scratch*` 已 ignore | ✅ `git check-ignore` 命中；`git status` 不列 `.scratch` |
| 安装器 decl/legacy/unknown/非法值 四态矩阵在隔离 DSH_HOME 下逐项复跑、真实 `$HOME` 零残留 | ⚠️ 结果面（无残留、未知/非法值 fail-closed）已核；四态矩阵脚本本体未找到，**待验证**（P2-23）；不作为「已独立复跑」采信 |
| M7.7 过程披露（4 项、根因、清理、`~/.dsh` 未被触碰、守卫重跑） | ✅ 关键事实独立核验一致（§3）；守卫本体待验证；无失实 |
| README `smoke 308` 与实测一致 | ✅ `README.md:171`；smoke 末条断言自校 308 |

---

## 7. 无法核验的面（`待验证`，不视为通过）

- **T-1** 0.2.0-rc.2 浏览器级客户端行为（打开会话/current 联动/自动关闭/分栏）——无浏览器；0.2.0 client 包源码未留存；仅 0.2.1-rc.2 源码 + 文本断言。
- **T-2** 0.1.x 运行时回归——未安装 0.1.5 宿主；`ctx.inject` 时序/Config 在 cordis 4.0.2 下为静态推理（schemastery 3.18.2 面已实测）。
- **T-3** install.ps1/install.sh 完整端到端安装与四态矩阵——本轮只做参数失败路径与 PS5.1 解析；`decl/legacy/unknown` 的完整写行为未在隔离 DSH_HOME 重跑（避免真实环境写入）；矩阵脚本未找到（P2-23）。
- **T-4** 0.2.0-rc.2 精确宿主包内容（`SettingsForms.update` async 细节依据 0.2.1 实装 + EVD-132 同源声明）。
- **T-5** 离线发行包真实依赖布局（若内置 `node_modules` 则不触发 P2-15）。
- **T-6** `dsh plugin add` 在 0.2.0-rc.2 的实跑（EVD-132 为实现者证据）。
- **T-7** M7.7 矩阵脚本的 `$isoRoot`/`$isoHome` + `DSH_HOME` 前缀断言代码级生效（脚本未在仓/临时顶层找到；仅结果面可核）。
- **T-8** M7.7 删除前 `C:\Users\peter\profiles` 等顶层路径是否存在过（删除后无法后验；CreationTime 证据未入仓）。

---

## 8. 结论与建议

**REVIEW-BUG-011-R3 APPROVED_WITH_NOTES / unresolved_blockers=0**。R2 唯一阻塞项 P0-3 已真闭环，P2-13/14/20 闭环，CI 守卫有效且未放宽事件门禁，R1 五项与回归门禁保持，M7.7 事件无未清理残留/无披露失实/真实 `.dsh` 数据完好 ⇒ 不阻塞。

建议（均不影响本轮通过）：
1. 把 P2-22（事件证据固化：CreationTime 清单/哈希/删除前快照）与 P2-23（矩阵脚本入仓或 sha256+输出入 evidence，并加 `DSH_HOME` 前缀守卫负例）作为 R3 后续收尾；两者是**可审计性**补强，不是功能阻塞。
2. P2-15/16/17/18/19/21 留票继续跟踪（离线依赖、迁移级看护、1.8 假绿、原子写、headless 触发、stale-root 探测）。
3. P3-24/25/26/27/29 为文案/防御性/编号记录项，可随手修。
4. 本报告入 `.governance/review-BUG-011-R3.md`；按流程由 Coordinator 机录 review 结论（本审查只写此文件、未改产品代码）。

---

*报告结束。REVIEW-BUG-011-R3 / APPROVED_WITH_NOTES / unresolved_blockers=0 / 2026-10-20*
