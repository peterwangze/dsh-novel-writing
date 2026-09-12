# REVIEW-COMPAT-015-R1 — 终批收口后置代码审查（REVIEW-COMPAT-014-R1 F1~F11 + COMPAT-008 + COMPAT-009）

- **任务**：COMPAT-015（终批收口：F1~F11 全量 + COMPAT-008 探针固化 + COMPAT-009 install 头部布局契约）
- **审查对象**：commit `1c3f7b1`（9 路径 +861/−69，**未 push**）
- **round**：**R1（本任务首轮）**——COMPAT-015 无前轮审查报告，故不做「已修复/未修复/新引入」逐条比对；前轮引用 = `docs/review/COMPAT-014-R1.md`（F1~F11 的来源报告）的逐项要求
- **审查人**：Code Reviewer（只读；除本报告外未写入任何文件）

---

## 0. 审查方法与证据边界（如实披露，P-01）

**做了**：只读实读 commit 涉及面的**全部**相关文本——`scripts/probe-host.mjs` 全文 348 行、`test/fixtures/host-surfaces/probe-face.mjs` 全文 573 行、`.github/workflows/ci.yml` 全文 393 行（含内联判据 heredoc）、`install.ps1` 头 70 行 + L118-162 + L316-355、`install.sh` 头 70 行 + L55-94 + L216-255、`lib/host-contract.mjs` 全文 296 行（含 face 4/5 行号与 note）、`test/smoke.mjs` L1880-1979 / L2990-3079（本批新增与改写段）、`README.md` L158-236、`CHANGELOG.md` L25-64、`test/fixtures/host-surfaces/ci-mock-face.mjs` 全文、三份 fixtures 的 `hostVersion`/`packages`/`markers`、`docs/research/COMPAT-001-host-compat-analysis.md` §3（4.1~4.5 底稿行号）、`docs/review/COMPAT-001-R1.md` L112、`docs/review/COMPAT-014-R1.md`（格式与终态口径先例）、`.governance/{plan-tracker.md,evidence-log.md}` 中 COMPAT-015/EVD-095 条目。

**未做（如实登记）**：
1. **未运行任何命令**（未执行 probe-host / probe-face / smoke / npm / install / node / git / python）——按任务硬约束，角色定义亦禁止 Bash。故本报告**不含**任何由本人实测的动态证据；文中所有「Coordinator 独立复跑 / Developer 构造实证」结论一律标注为**引用**，并尽量给出**可静态复算**的旁证（§4/§5）。
2. **未能取得 diff 本体**（无 git 调用）⇒ 「非注释行逐字节等价」不能由本人重算；§5 以**结构性核验 + 多点位独立来源**替代，并明确残余边界。
3. 未逐行读 `lib/client.js` 全 4927 行（只读 CLIENT_PROBES 段 L2360-2389、findSidebar L2829-2839、槽位注册 L4861-4893、`.ta_splitClose` L1039 等**为验证 probe-host 断言而必需的锚点段**）；未逐行读 `test/smoke.mjs` 全 3079 行（读本批新增/改写段及其上下文）。

**核对纪律**：本报告对 Developer 声称的构造实证**不采纳自述**——§4 以静态复算独立重演构造逻辑（含变异体的副作用面），§5 以三个互相独立的历史来源交叉验证 +13 重基。

---

## 1. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0** | ✅ |
| 5 维度全覆盖 | = 100% | §7 正确性 / 安全性 / 可维护性 / 性能 / 测试覆盖 逐项有结论 | ✅ |
| 每条发现标注级别 | = 100% | §9 全部带 P0~P3（**P0=0 / P1=0 / P2=4 / P3=12**） | ✅ |
| 设计一致性检查 | 已完成 | §2.2/§2.6/§9-P3-9：判据 ≡ ci.yml 实状 ≡ 契约单一事实源；`extractHeredocs` 共用口径；install 头部块 ↔ 契约 face 4/5 逐项对账成立；**无 ADR/契约偏离**（新增「宿主 CLI 命令面未登记」登记面缺口 P3-9，非偏离） | ✅ |
| AI 代码专项 5 项 | 全部完成 | §8 mock/硬编码/幻觉 API/未实现 TODO/过度实现 5/5 有结论 | ✅ |
| **13 项逐项落地核验表** | 完整（缺项须列出） | §3：**13/13 已落地，无缺项**；5 项附强度/精度瑕疵（F1→P3-1、F2→P3-4、F3→P3-5/P3-6、F9→P2-2、008→P2-1/P2-3/P2-4、009→P3-11） | ✅ |
| **install 强等价核验**（≥2 处非注释段抽验） | 必填 | §5：**22 个端点全部 +13 一致**（3 个独立来源）+ 3 处代码段内容抽验一致；残余边界如实披露 | ✅ |
| 结论终态（三选一 + unresolved_blockers） | 必填 | §11：**APPROVED_WITH_NOTES（unresolved_blockers = 0）** | ✅ |

---

## 2. 重点核验项结论（任务指定 6 项）

### 2.1 ①`scripts/probe-host.mjs` 348 行逐段审读 —— 离线面逻辑成立；`--run` 面 3 处实质缺陷（P2）+ 3 处小瑕（P3）

**参数与宿主解析（L56-82）**：`parseArgs` 缺值不校验（`--port` 无值 ⇒ `Number(undefined)`=NaN；`--host-cmd` 无值 ⇒ `undefined` 被 L75 视为「未显式」而静默回退 PATH）——**P3-7②**。`resolveHostCommand` 的 PATH 扫描含 `dsh.cmd/.exe/.ps1`，只读、无副作用 ✓。

**隔离方案（L84-104）**：`isolationPlan(root)` 把 `DSH_HOME`/`npm_config_cache`/`npm_config_userconfig`/`npm_config_globalconfig` 全部派生自 `root` ✓；`printPlan` 逐条打印命令 + 环境变量 + 影响路径（L98-104）✓，符合 M7.7「逐条上报」的形式要求。

**离线自检（L197-227 + `layerChecks` L130-194）**：6 层逻辑与仓内实状**逐层实证成立**（本人静态核对，非转述）——
- L1①：`requiredExports`（cordis `Service` / schemastery `default` / dsh-settings 四名 / dsh-home-paths `resolveDshHome` / dsh-tools `defineTool`）⊆ `0.1.5-rc.2.json` 导出面（fixtures L33+/L249+）✓；L1②：`settingsNamespace` 出现在**非现行** fixture（0.1.1-rc.2），不在现行面 ✓；L1③：`lib/host-boundary.js` L236 `export function contractProjection()` 在场 ✓（`lib/index.js` L24 消费）。
- L2：`objectBlock(clientSrc,'const CLIENT_PROBES = {')` 锚点唯一命中 `lib/client.js` L2364，块体 L2364-2382 配平 ✓；契约 8 项 probe 键均为单引号键（L2365-2381）✓。
- L3：3 个 DOM selector（`[data-phase]` L2374 / `.ta_splitClose` L1039 / `aside, nav, [class*="SidebarRoot"], [class*="sidebar"]` L2838）与 3 个槽位名（L4861/4867/4878）在 `lib/client.js` 内可提取 ✓（口径强度见 P3-2）。
- L4：`host-contract:v1` 与三条约定字面量在两脚本内均在位（`install.ps1` L24/L25/L27/L29、`install.sh` L13/L14/L16/L18）✓。
- L5：`preset.yml` + `agent.cordis.yml` 在场、SKILL 计数 ≥25（与 ci.yml 包结构检查 L87-89 同口径）✓。
- L6：三版本标记 golden ≡ fixtures 实测（0.1.1-rc.2 true/true/false、0.1.5-rc.2 false/false/true，contract L270-274 ≡ fixtures L701-717 / L427-443）✓。
  ⇒ 「`--self-check` 6/6 exit 0」**可由静态复核得到支持**（口径级成立，运行期确认仍以 Coordinator 复跑为准）。

**`--run` 路径（L251-337）**：三处实质缺陷 —— **P2-3**（浏览器层判据结构性不可达 + 宿主正常时仍恒 exit 1 且 verdict 恒报 L2）、**P2-4**（隔离硬校验恒真 + 真实 `$HOME` 继承未重定向，与 README「硬约束」表述不符）、**P3-8**（`spawn`/轮询在 `try/finally` 之外，失败路径 fd 与临时根不清理）、**P3-7③**（已找到宿主但 liveness 超时走 `exit 1`，与头注释 L28「2 = …含宿主不可用」的归类不一致）。`die()` 前置性（L254-257 在 `mkdtempSync` 之前）✓ —— 「无宿主命令 ⇒ exit 2 且未执行任何操作」的声称**代码级成立**。

**`REAL-RUN: UNVERIFIED` 防伪性 —— 不成立（P2-1）**：脚本侧标记本身是单点常量（L49）+ 5 处输出一致引用 ✓，但 smoke 侧守卫是**全文子串**断言，而脚本**头注释 L13 也含同一串** ⇒ 只改常量即可在守卫全绿的情况下把实机模式自述改为「已验证」。详见 P2-1。

### 2.2 ②F2 段绑定实现（probe-face `wiringInSanity` ↔ smoke 本地 `jobSection` 镜像）—— 语义等价成立；镜像无交叉机检（P3-4）

- **实现等价性（本人推演）**：`probe-face.jobsStart`（L119-122）返回 `jobs: 行号 + 1`，`jobSection`（L125-132）判据 `i >= jobsStart`；`smoke.ciJobSection`（L1914-1922）取 `j = jobs: 行号`，判据 `i > j`——**两者恒等**；退化情形（文件无 `jobs:`）亦同（`i >= 0` ≡ `i > -1`）；段尾判据（`^  [A-Za-z0-9_-]+:\s*$`）与 `cmdOf`（trim + 剥 `run:`）逐字相同。
- **当前判别力成立**：ci.yml L66（`run: node test/fixtures/host-surfaces/probe-face.mjs`）与 L35（块标量内的 `node --check …probe-face.mjs`）均在 `sanity` 段内（sanity 段 = L14-92）；`wiringInSanity` 额外要求 `node scripts/probe-host.mjs --self-check`（L71）同在段内 ⇒ probe-face ② 会在「probe-host 接线被移出 sanity」时同时变红 ✓。
- **漂移风险（P3-4）**：两处实现**无任何机检比对**。smoke 注释（L1911-1913）以「probe-face 是顶层脚本，import 即执行全量机检」为由选择镜像——理由成立，但仓内已有更稳先例：`ci-mock-face.mjs` 把 `extractHeredocs` 抽为**共享模块导出**，使 probe-face 与 smoke 共用「唯一提取口径」（该文件头 L16-17 明示此设计目的）。建议把「job 段切分」同法抽为纯函数模块，smoke 直接 import 纯函数（不 import 顶层脚本），彻底消镜像。

### 2.3 ③F3 ⑩b 对账扫描面（smoke 注释行 + CHANGELOG 当前条目）—— 边界选择合理，两处粒度/覆盖瑕疵（P3-5 / P3-6）

- **成立面**：扫描面与判定（`ITEM_LINE_REF5` L3009 / `HIST_MARK5` L3010 / `itemLineRange5` L3013-3019 / 双面扫描 L3041）实现正确；`injectedStaleRef15` 用字符串拼装（L3042）避免守卫自身入扫描面——**这是正确的自指规避**（同批同类问题的反面案例见 P2-1/P2-2，实现得更细）；`smokeCommentCount15 >= 400` 与 `injectedHit > 0` 构成防空转闸 ✓；CHANGELOG 历史条目豁免的理由（不改写历史记录，同 C-F-6「历史锚点」纪律）**正当**。
- **口径边界 1（P3-5）**：豁免粒度 = **整行**（`HIST_MARK5.test(l)` 命中即整行 `return`，L3026），而豁免词含 `原实现`/`原注释`/`原记` 等在本仓**说明性注释中高频出现**的词——同行内的现役陈旧引用会被一并豁免；且未知 item（`itemLineRange5` 返回 null，L3015 分支）**静默跳过** ⇒ 指向已删除/改号 item 的引用零信号。
- **口径边界 2（P3-6）**：扫描面不含 README / probe-face / probe-host / install 头部块——本批新增文本约 +800 行中的大部分（probe-face 头注释 63 行、probe-host 头注释 34 行、README 维护者节、install 头部块）在扫描面外。作为「防陈旧行号副本复发」的守卫，建议按本批**改动文件**动态定扫（README 已是机检对象，纳入成本低）。

### 2.4 ④F5 并报逻辑（退出码仍取 2）—— **恰当**，无须修改

`ci.yml` 判据 L353-383：`groupFailures`/`printFailureClasses` 抽为单点（L354-368）供两条退出路径共用（消除「两处各写一份后漂移」）✓；input 分支在 `process.exit(2)` 前并报已累计 failures（L378-381）并**明示**「退出码仍取 2 = 输入类优先——修复输入后重跑，同一结论会以退出码 1 复现」✓。判定：CI 对任一非零退出码均为红 ⇒ 退出码语义（A-F7 的「2 = 输入类」）保持不变**不损失任何检测力**，而 drift 明细不再被吞 —— 取舍正确、披露充分。唯一观察（不构成发现）：退出码维度**无法**表达「输入异常 ∧ 版本漂移」的合取，若未来有自动化消费该码需另立码位；当前 CI/人工消费面无需。

### 2.5 ⑤F9 ⑩c 双向断言强度 —— 三例方向正确，但**测的是副本不是部署体（P2-2）**

`smoke.mjs` L3049-3063：两历史逃逸形态（`现…L…` 带间隔词 / `emit|logger…L…` 无「现」字）MUST 命中、历史锚点形态（`原…L…`）MUST NOT 命中，3 例 `hits` 逐一入断言条件 ⇒ **双向**（词法改窄或改宽均红）✓，构造样本用字符串拼装避免自命中 ✓。**但**：`LEXER_NOW15`/`LEXER_EMIT15`（L3053-3054）是**重新声明**的正则副本，与 D1⑩ 实际部署词法（L2967，同文本）**不是同一对象**——部署体被改窄不会使 ⑩c 变红，F9 声称关闭的缝隙只被「看似」关闭。详见 P2-2。

### 2.6 ⑥⑧ install 对账（字面量片段 ∈ 契约 `item.symbol`）—— 5 项逐条**非偶然命中**；一处 golden 强度缺口（P3-11）

本人逐条静态复核（`probe-face` L236-274 的解析 + 契约 `items[]`）：

| 块内项 | 字面量（合取片段） | 契约对应 item.symbol 实读 | 判定 |
|---|---|---|---|
| `[4.1]` | `profiles/<Profile>/package.json` | 4.1 symbol 首句 `profiles/<Profile>/package.json 存在 = dsh ≥0.1.5 新布局…` | 命中且语义同位 ✓ |
| `[4.2]` | `junction/symlink` | 4.2 symbol `junction/symlink 接入（…）` | 命中且语义同位 ✓ |
| `[4.3]` | `dependencies.dsh-novel-writing` + `dsh.profile.bundles` | 4.3 symbol `profile package.json dependencies.dsh-novel-writing=file:<src> + dsh.profile.bundles 追加…` | 两片段均命中 ✓ |
| `[4.4]` | `cordis.patch.yml` | 4.4 symbol `cordis.patch.yml insert 行兜底（…）` | 命中 ✓ |
| `[5.5]` | `.agent-presets/<preset-id>/` | 5.5 symbol `$DSH_HOME/.agent-presets/<preset-id>/ 预设目录约定（…）` | 命中 ✓ |

- 解析面健壮性 ✓：`INSTALL_KEY_RE`（L237）容忍 CRLF（`\s*$` 吸收 `\r`）、`parseInstallContract` 先剥 BOM（L241，install.ps1 带 BOM）；`INSTALL_MARKER_LINE_RE`（L239）要求**整行**恰为标记 ⇒ 正文提及该串不算标记（RB-02 的失效模式被正面关闭）✓；负例三例（删标记/改字面量/删项）本人逐例复算：分别产生「缺少固定标记行」/「未出现在契约该项 symbol 内」/「键集不一致」+ 计数 4 ≠ 5 ⇒ 断言条件可满足 ✓。
- **强度缺口（P3-11）**：`INSTALL_GOLDEN_ENTRIES = 5`（L90/L270-272）只锁**数量**。两脚本同步把 `[4.2]` 改成 `[4.6]` 并写一个 ∈ 4.6 symbol 的字面量，仍可全绿（面 4/5 覆盖面脱靶而无信号）。建议 golden 改为**有序 id 集**（`4.1,4.2,4.3,4.4,5.5`）。

---

## 3. 13 项逐项落地核验表（F1~F11 + COMPAT-008 + COMPAT-009）

| # | 项 | 声称 | 本人核验（文件:行） | 判定 |
|---|---|---|---|---|
| 1 | **F1** `on` 四键 | ② 四键正则断言 + ⑦ 删键负例 | `probe-face` L80 `EVENT_KEYS`、L177 `eventKeysMissing`、L333-335 独立 record、L180-188 `deleteOnChild`、L530-532 负例；ci.yml L4-11 四键实读齐全 | ✅ 落地（负例强度见 **P3-1**） |
| 2 | **F2** 接线段绑定 | probe-face `wiringInSanity` + smoke ⑧b 段绑定 | `probe-face` L190-214（含 `moveWiringOutOfSanity` 变异体）、L337-339 record、L533-537「旧守卫仍绿 ∧ 段绑定必红」负例；`smoke` L1906-1941；ci.yml L66/L35/L71 均在 sanity 段 L14-92 内 | ✅ 落地（镜像见 **P3-4**） |
| 3 | **F3** 陈旧行号 4 处 + ⑩b | 订正 + 新增对账 | 订正后值实读在位：`smoke` L2057/L2065（2.3 `L4804-L4806`）、L2219（3.1 `L978`、3.5 `L1028` 起于空行）、L2187（3.8 `L2829-2839`）；⑩b 本体 L2997-3047 | ✅ 落地（口径见 **P3-5/P3-6**） |
| 4 | **F4** 判据①③⑤ 三负例 | 各 1 例，构造 7→11 | `probe-face` L466-470（① 删 stem ⇒ exit 2 + 面/输入双归因）、L417-427+L472-474（③ 非例外包 `dsh-tools` 版本 ≠ hostVersion ⇒ exit 1 coverage）、L476-477（⑤ `0.1.5-beta.1` ⇒ exit 1 version-form + 「重建 fixtures 关不掉」）；`expectCase` 共 **11** 例（L439/442/445/448/451/459/463/469/473/477/480） | ✅ 落地 11/11 |
| 5 | **F5** input×drift 同轮并报 | ci.yml 并报 + 构造例 | ci.yml L353-368（单点 `printFailureClasses`）、L374-383（并报 + 明示退出码）；`probe-face` L479-481（断言 5 串含 `同轮另检出`/`类别 version-drift`） | ✅ 落地（取舍判定见 §2.4：恰当） |
| 6 | **F6** 白名单自指面 | 脚本本体 6 类禁词 + 声明面双向对账 | `probe-face` L495-505（6 类禁词作用于 heredoc 本体）、L507-527（ci.yml 探测 job 注释块 L166-172 ↔ `ALLOWED`/`FORBIDDEN` 四向对账：声明白名单项在场 ∧ 声明禁用项可被拦截 ∧ 每条常量有声明来源 ∧ 允许样本 ∈ ALLOWED） | ✅ 落地 |
| 7 | **F7** `spawnSync` timeout | 60s + 超时归类 + 真跑 | `probe-face` L84-85 `RUN_TIMEOUT_MS`、L218-234（`timedOut` 由 `err.code/message` 双路判定）、L538-540（1.2s 阻塞脚本真跑，断言 `timedOut && status===null`；API 语义正确） | ✅ 落地（累积成本见 **P3-12**） |
| 8 | **F8** 失败态归因 + 清理 | `die(kind)` 分型 / 结构守卫 / `exit` 兜底 | `probe-face` L98-100（两类归因）、L103-108（`process.on('exit')` 清理）、L276-279（输入缺失）、L282/L287/L343（工具与契约失配）、L284-288（`hostSurface.packages` 结构守卫）+ L456（构造锚点未命中归因） | ✅ 落地 |
| 9 | **F9** ⑩c 词法正向对照 | 2 正例 + 1 负例 | `smoke` L3049-3063（3 例 `hits` 入断言） | ✅ 落地（绑定强度见 **P2-2**） |
| 10 | **F10** README 矩阵歧义 | 主语精确化 | `README.md` L186：明写「`0.1.0-rc.7` **无**仓内 fixture…`0.1.1-rc.2` **有**仓内 fixture 快照（…0.1.1-rc.2.json）」 | ✅ 落地 |
| 11 | **F11** A-F1 取舍留档 | README 补「代价」 | `README.md` L192：「**代价（A-F1 收敛的取舍，如实留档）**…每日一次的真实 schemastery 漂移可见性…一并消失…用 `workflow_dispatch` 或另立定时任务」 | ✅ 落地 |
| 12 | **COMPAT-008** 探针固化 | 新脚本 + CI 接线 + 标记 + README 节 | `scripts/probe-host.mjs`（348 行，`--self-check` L197-227 / `--run` L251-337）；ci.yml L36（`node --check`）+ L70-71（离线自检步骤）；`smoke` L1943-1951 接线守卫；`README.md` L195-206 维护者节 | ✅ 落地（缺陷 **P2-1/P2-3/P2-4**、**P3-2/P3-7/P3-8/P3-9**） |
| 13 | **COMPAT-009** install 头部契约 | 两脚本 +13 行纯注释块 + 标记 + ⑧ 对账 + 负例 + 契约重基 | `install.ps1` L22-33（标记 L24）/`install.sh` L11-22（标记 L13），**全部行为 `#` 注释**；`probe-face` L86-90 + L236-274 + L542-557（⑧ 对账 + 三负例）；契约 L136-140/L148（face 4/5 +13 + note）；CHANGELOG L45 | ✅ 落地（golden 见 **P3-11**；强等价见 §5） |

**缺项：无（13/13）**。附：13 项中 **5 项**带强度/精度瑕疵（均已单列 P2/P3），**无一项为「未落地」或「表述与实现相反」的假绿方向缺陷**。

---

## 4. 构造实证抽验（任务要求抽 2 项；本报告抽 3 项并交叉印证）

### 4.1 抽验 1 — F2「接线移出 sanity ⇒ probe-face + smoke 双红，而旧全文子串守卫仍绿」

**静态重演**（`probe-face` L203-214 + `smoke` L1929-1938）：
- 变异体构造：过滤全部接线行（probe-face 两行 + probe-host 一行），再把三行以 `run:` 形态插到 `  host-latest-probe:` 之后 ⇒ 文本**仍在文件中**（`oldSubstringGreen = true` ✓）但不在 sanity 段内。
- probe-face 侧：`wiringInSanity(moved)`（L337-339）⇒ `run=false` ⇒ ② 记录红 ⇒ 脚本 exit 1 ✓；⑦（L533-537）在**真仓**上断言「旧守卫仍绿 ∧ 段绑定必红」，变异体上两项均为真 ⇒ ⑦ 不误红 ✓。
- smoke 侧：`sectionBoundRed = true`（L1938）⇒ ⑧b 红 ✓；且因 `passed+1` 联动，末条 README 计数断言（L3070-3073）也会变红（见 4.3）。
- **结论：Developer 的声称成立**（「双红 + 旧守卫仍绿」），且失效模式本身被固化为负例——这是本批质量最高的一处修复。

### 4.2 抽验 2 — F1「删 `workflow_dispatch` ⇒ probe-face exit 1 点名」

**静态重演**：`eventKeysMissing`（L177）在新文本上正则 `^  workflow_dispatch:` 无命中 ⇒ `missing=['workflow_dispatch']` ⇒ ② 四键记录红（detail 点名缺键，L334-335）⇒ exit 1 ✓ —— **声称成立**。
**但**：`deleteOnChild`（L180-188）的跳过状态只在遇到**下一个** `^  [A-Za-z_]+:` 行时复位；`workflow_dispatch` 是 `on:` 的**最后一个**子键，其后（空行、`jobs:`）均不匹配复位正则 ⇒ 变异体连带**吞掉 `jobs:` 行**。后果：`jobGates`/`jobPermissions` 在无 `jobs:` 的文件上会把 `  pull_request:` 误当 job 键 ⇒ ② 的门禁与权限两条记录**也**变红，红点不可单独归因到四键断言；F1 的「四键逐一删除的变异负例」因此**判别力成立但非最小变异**（P3-1）。若后续有人据该负例做二分定位，会被误导。

### 4.3 抽验 3（附加）— F3「注入陈旧行号对 ⇒ smoke 280/2」

静态复核计数联动：smoke 末条断言为 `readmeSmokeDeclared === passed + 1`（L3072），而 `passed` 只统计通过项。注入 1 处陈旧引用 ⇒ ⑩b 红（`passed` −1）⇒ 末条断言 `282 !== 281` 亦红 ⇒ 失败数恰 2、通过数 281（对 282 基线即 280/2）✓ —— **构造实证与实现逻辑在算术上自洽**，且说明 ⑩b 的判别力可被独立复算。

---

## 5. install 强等价核验（行为零变化）

**约束披露**：无 git/diff 可用 ⇒ 不能重算「非注释行逐字节等价」。本报告以**回归来源交叉验证**替代，结论 = **强等价的声称达到可静态验证的最高置信度**。

### 5.1 全部端点 +13 一致性（3 个独立历史来源）

`docs/research/COMPAT-001-host-compat-analysis.md` §3 是被审文件**改写前**的实测底稿（该文件未被本 commit 触碰 ⇒ 值保持旧基线），其 face 4 底稿行号与契约现值逐项比对：

| 契约 item | §3 底稿（旧） | 契约现值 | Δ |
|---|---|---|---|
| 4.1 | ps1 `L123-134` / sh `L47-57`（底稿 L96） | `L136-147` / `L60-70` | **+13 / +13** |
| 4.2 | ps1 `L128-177` / sh `L58-73`（L97） | `L141-190` / `L71-86` | **+13 / +13** |
| 4.3 | ps1 `L179-238` / sh `L75-186`（L98） | `L192-251` / `L88-199` | **+13 / +13** |
| 4.3 note 内序列化器 | ps1 `L36-88`（L98） | `L49-101`（契约 4.3 note） | **+13 / +13** |
| 4.4 | ps1 `L240-304` / sh `L188-205`（L99） | `L253-317` / `L201-218` | **+13 / +13** |
| 4.5 | ps1 `L306-316` + `L318-339` / sh `L207-216` + `L218-232`（L100） | `L319-352` / `L220-245` | **+13 / +13**（起止两端各 +13） |

= **22 个端点无一例外 +13**。第二来源：`docs/review/COMPAT-001-R1.md` L112 记「install 双通道（ps1 L123-346 / sh L47-232）实测区间」——与 4.1 起点及 4.5 终点（sh 232→245）同基线一致 ✓。第三来源：diffstat 算术自洽——`probe-face` 315→573、`smoke` 2975→3079、`ci.yml` 368→393、契约 295→296 均被 `docs/review/COMPAT-014-R1.md` §0 的一手行数**逐项证实**（L12/L17/L19/L19），故 +861/−69 的分配可信；install 两脚本合计 +26 且**零删除**（总删除 69 = probe-face 28 + smoke 17 + ci.yml 13 + 契约 7 + README/CHANGELOG 4），install 行为面无「删一行补一行」的改写空间。

### 5.2 非注释段抽验（≥2 处要求 → 实际 3 处）

1. **`install.sh` 4.2 段 `L71-86`**：L71 `DST="$NM/$PLUGIN"`、L76 `ln -s`、L82 `cp -R` 回退、L86 `fi` —— 与 4.2 symbol「junction/symlink 接入（新=profile 私有；旧=全局；失败回退拷贝）」逐语义相符 ✓。
2. **`install.ps1` 4.5 段 `L319-352`**：L319 段注释「4. 同步 agent 预设」、L322-329 robocopy 预设同步、L331-352 settings.yaml 默认节幂等写入 —— 与 4.5 symbol 相符，且**止行恰为 `}`**（L352）✓。
3. **`install.sh` 4.5 段 `L220-245`**：L220 预设同步、L231-245 settings.yaml 幂等写入、L245 `fi` ✓。
另：新增块**逐行皆注释**（`install.ps1` L22-33 / `install.sh` L11-22，首字符均为 `#`），插入点位于头部注释区（ps1 的 `param(` 之前 / sh 的 `set -e` 之前），**不侵入任何可执行语句**；两块的 5 条约定项与标记行跨脚本一致 ✓。

### 5.3 残余边界与一处记录差（P3-10①）

- **残余**：若有人**同时**改动某非注释行与另一处做补偿（例如改一行加一行），本核验方法无法察觉——该情形需 diff 本体才能排除。据 CRLF/BOM 事实（`parseInstallContract` 先剥 BOM；CHANGELOG 称 BOM 保持）与「删除行数 0」的 diffstat 自洽，本人判定该残余**概率极低且不影响本批通过结论**，但如实登记为方法边界（不据「identical=True」的自述作结）。
- **记录差**：CHANGELOG L45 记「非注释行 install.ps1 **295** 行 / install.sh **221** 行」，任务摘要记 install.ps1 **296** —— 差 1，且仓内未记录「非注释行」的计数口径（是否含空行）。

---

## 6. 新真空断言检查（本批新增机检的自指/恒真面）

| 检查面 | 结果 |
|---|---|
| ⑩b「注入 ⇒ 必命中」正控 + `smokeCommentCount>=400` 下限 | ✅ **有**防空转闸（L3042-3046），是合格范式 |
| ⑦「旧守卫仍绿 ∧ 段绑定必红」双值入断言 | ✅ 有判别力（非恒真） |
| ⑦ 阻塞脚本真跑（`timedOut && status===null`） | ✅ 真跑实测，非模拟 |
| ⑧ 三负例（`some(p => p.includes(...))`） | ✅ 逐例可满足（§2.6 复算） |
| probe-host L3 `!includes("'"+s+"'") && !includes(s)` | ❌ **第一谓词被第二谓词蕴含（死谓词）**，退化为裸子串匹配（**P3-2**） |
| ⑩c 三例正控 | ⚠️ **测副本非部署体**（**P2-2**） |
| smoke ⑧c `REAL-RUN` 防伪 | ⚠️ **全文子串**（头注释同串）⇒ 可绕过（**P2-1**） |
| probe-host `layerChecks` L4 三字面量 | ⚠️ 裸子串且为**第三份**契约知识副本（**P3-3**） |
| probe-host L5 `skillCount >= 25` | ✅ 与 ci.yml L89 同口径（非恒真；两处阈值重复维护，见 §8 硬编码） |
| ⑧ golden 计数 = 5 | ⚠️ 只锁数量不锁 id 集（**P3-11**） |
| ⑩b 未知 item 引用 | ⚠️ 静默跳过（**P3-5**） |

---

## 7. 5 维度结论

| 维度 | 结论 |
|---|---|
| **正确性** | **离线面成立**（probe-face 27 项机检逻辑、probe-host 6 层断言、⑧ 对账均经静态复核可成立）；**`--run` 面 3 处实质缺陷**（P2-3 浏览器层不可达 + 恒红 + 断点层误归因；P2-4 隔离校验恒真 + `$HOME` 未重定向；P3-8 失败路径清理）；两处**守卫强度 < 声称**（P2-1 / P2-2）；F1 负例非最小变异（P3-1）。F5 取舍正确（§2.4）。无逻辑错误、无边界/资源管理缺陷传导至 CI 常态面。 |
| **安全性** | **无新增攻击面**：probe-host 离线模式零网络零写盘（除可选 `--json-out`）；`--run` 仅 `GET` 回环地址（L276/291）；ci.yml 无新增 secret、`permissions: contents: read` 保持（L20-21/98-99/157-158）；probe-face/probe-host 的写入全部落在 `mkdtempSync` 隔离目录 ✓；fixtures 无路径/凭据（既有 BC-05 扫描未变）。**但** `--run` 的「隔离硬校验」恒真 + 真实 `HOME`/`USERPROFILE`/`XDG_*` 未重定向，与 README L206 的**硬约束**表述不符（P2-4，需在首次真机使用前处置）。 |
| **可维护性** | probe-face 573 行、**三面职责**（判据机检 / 接线自断言 / install 契约对账）——头注释已明示边界，当前**仍可用**，但第四类关注点到来时应拆（建议：install 对账独立成 `install-contract-face.mjs`，与 `ci-mock-face.mjs` 同构）。probe-host 348 行职责单一（离线自检 + 实机探针）✓；三脚本边界清晰（`ci-mock-face` = mock 面钉、`probe-face` = 探测轨判据 + install 块、`probe-host` = 能力面探针）✓。**重复知识**：install 契约知识现存在 4 份（两脚本块 + 契约 items + probe-host L4 字面量列表），其中 probe-host 那份最弱（P3-3）；`jobSection` 镜像（P3-4）。README 维护者节（L195-206）**可操作**：两条命令 + 已验证/未验证分野 + 安全口径，逐句可执行 ✓。 |
| **性能** | 新增 sanity 成本可忽略：`probe-host --self-check` 为 1 个 node 进程、离线、读 ~6 个仓内文件（最大 `lib/client.js` 4927 行）⇒ 亚秒级 ✓；probe-face 的 11 例构造 + 3 次工具调用为既有成本（本批 +4 例）。**边界**：`RUN_TIMEOUT_MS` 是**每例**上限（L85/L218），最坏累积 ~14 min（有界但远超常态；P3-12）。无 O(n²)/N+1 类问题（`layerChecks` 全为线性扫描 + Set 查找 ✓）。 |
| **测试覆盖** | 13 项落地核验 13/13（§3）；构造用例 7→11 例，覆盖判据 ①②③⑤ + CLI 代理 + 输入异常 + 同轮并报 + 契约/fixtures 版本维双向 ✓；三条守卫（四键 / 接线 / REAL-RUN）均有负例或正控（**REAL-RUN 那条被绕过，P2-1**）；probe-host 的 `--run` 面**无任何机检**（CI 只跑 `--self-check`，且模式自述未验证）——与本批的诚实披露一致，但 P2-3/P2-4 的两处缺陷正因「无测试触达」而留存，建议在真机使用前先补 1 个「`--host-cmd` 指向无害假宿主 ⇒ 断言 exit 2 / 不落盘」的构造例（零真实环境影响）。 |

---

## 8. AI 代码专项 5 项

1. **mock/硬编码残留**：无非法 mock。probe-face 的构造 probe JSON（L396-427）是**判据的输入夹具**（且由 fixtures 实测派生 `greenLists`，L390-394，非手写），驱动的是**真判据脚本**⇒ 不构成「mock 掉被测对象」✓。硬编码项为**有意的 golden/白名单**：`ALLOWED`（6 条）/`FORBIDDEN`（6 条）/`EVENT_KEYS`/`INSTALL_GOLDEN_ENTRIES=5`/`DECL_ALLOWED`/`DECL_FORBIDDEN`/`RUN_TIMEOUT_MS`/`PROBE_HOST_INVOCATION`（probe-face L80-93）、`LAYER_NAMES`/`SELF_CHECK_STATE`/`REAL_RUN_STATE`（probe-host L49-51、`skillCount>=25` L181、`ISTALL_HEAD_LIMIT=60` L89）——均属机检锚点，符合仓内 golden 先例；**两处可收敛**：probe-host L172 的 install 字面量列表（P3-3）与 L181 的 `>=25`（与 ci.yml L89 重复）。
2. **幻觉 API 调用**：**零命中**。逐一核对所用 API 与 Node 语义一致：`spawnSync(...,{timeout})` 超时后 `error.code='ETIMEDOUT'`/`signal='SIGTERM'`/`status=null`（probe-face L222-233 的判定与 F7 断言一致）✓；`http.get(url,{timeout},cb)` + `req.on('timeout',()=>req.destroy(err))` + `'error'` 兜底（probe-host L230-241，Promise 恒 resolve、无未处理 `'error'`）✓；`createRequire`/`pathToFileURL`/`mkdtempSync`/`openSync`+stdio fd（规避受限沙箱管道）✓；`process.on('exit')` 同步清理（probe-face L104-108）✓。
3. **未实现 TODO**：全仓 `.mjs` **无 TODO/FIXME/XXX/HACK**（grep 0 命中）✓。唯一「未实现面」是 probe-host 的浏览器层——**显式标注**为 `browser-probe-unavailable`（L314-315）而非静默通过 ✓（诚实披露成立；其 verdict/退出码语义问题见 P2-3）。
4. **过度实现**：+861 行中，probe-host 348 行为**新能力**（COMPAT-008，任务明确要求）；probe-face +286 行 = 11 例构造 + 三个新断言族 + 归因分型，**逐项可追溯到 F1~F9**（非泛化发散）；smoke/probe-face 的注释行占比高但均承载「口径与边界披露」，符合本仓 P-01 风格。**唯一可疑面**：probe-host `--run` 中「浏览器层已装配但未验证」分支（L317-318）是硬编码 `ok:false` 的死分支（P2-3），属**未完成即声明**的过度声明面，建议随 P2-3 一并收敛为三值语义。
5. **规则/契约同步（P-10 纪律）**：install 头部块 + 契约 face 4/5 同步 ✓、probe-face ⑧ 对账 ✓、契约 `revisions` 补 COMPAT-015 ✓；**缺口**：probe-host 新依赖的宿主 CLI 命令面（`dsh web --port/--no-open`）无契约条目（P3-9）。

---

## 9. 发现列表（P0~P3 全覆盖）

### P0（阻塞）— **0 项**

### P1（高）— **0 项**

### P2（中）

#### P2-1 — smoke ⑧c 的 `REAL-RUN: UNVERIFIED` 防伪断言是全文子串，可被「只改常量、留注释」绕过
- **位置**：`test/smoke.mjs` L1950-1951（`probeHostSrc.includes('REAL-RUN: UNVERIFIED')`）；`scripts/probe-host.mjs` L13（**头注释内含同串**）、L49（常量定义）、L221/L225/L252/L332/L344（输出引用）。
- **依据**：守卫取的是整文件子串存在性；L13 的说明段与 L49 的常量同文本 ⇒ 把 L49 改为 `'REAL-RUN: VERIFIED'` 后，5 处输出全部变成「已验证」语义，而守卫因注释仍在而**继续绿**。
- **影响**：本批新增的核心安全承诺（README L205「不得静默转已验证」+ CHANGELOG L46「防静默转『已验证』」）实际可被一行改动解除——与本批修掉的 F2（守卫表述强度 > 实现强度）**同类**，属方向性假绿风险（无人工审阅时不可发现）。
- **修复建议（≤3 行）**：把断言绑定到**定义行**并加反向排除：`/const REAL_RUN_STATE = 'REAL-RUN: UNVERIFIED'/.test(probeHostSrc) && !/REAL-RUN: VERIFIED/.test(probeHostSrc)`；更稳的做法是 smoke 以子进程执行 `node scripts/probe-host.mjs --help`（离线、无副作用）并断言输出含该标记（**运行期值**而非文本值，同 ⑧b 段绑定的思路）。

#### P2-2 — smoke ⑩c 的正向对照测的是**词法副本**，不是 D1⑩ 实际部署的词法
- **位置**：部署体 `test/smoke.mjs` L2967（`/现[^。；]{0,10}L\d/` 与 `/(?:emit|logger|logWarn|emitChanged)\s*(?:\/|,|、)?\s*L\d/`）；副本 L3053-3054（同文本重新声明的 `LEXER_NOW15`/`LEXER_EMIT15`）。
- **依据**：⑩c 的 3 例只对副本取样。若有人把 L2967 的正则改窄（如 `{0,10}` → `{0,3}`、或删掉 emit 分支），⑩c 仍全绿 ⇒ 「词法被改窄仍会绿」的缝隙**未被真正关闭**（当前两处文本相同，故属**强度缺口**而非现存缺陷）。
- **影响**：F9 的修复目标（把词法有效性固化为反例）只在副本上成立；副本与部署体一旦分叉，正控失去意义（同样的「两处各写一份」问题，正是本批 `printFailureClasses` 抽取所要消除的）。
- **修复建议（≤5 行）**：提为模块级常量并共用——`const STALE_RE_NOW = /…/`、`const STALE_RE_EMIT = /…/`；L2967 与 ⑩c 均引用该常量（共用对象即天然同一），断言不必再自证同一性。

#### P2-3 — probe-host `--run` 的浏览器层判据结构性不可达，且**必然**把「探针未实现」误报为「断点层 = L2」
- **位置**：`scripts/probe-host.mjs` L306-319（`createRequire(join(tmpRoot,'package.json')).resolve('playwright')`；恒抛 ⇒ L313-315 `unavailable` 分支；L317-318 即便可解析也是硬编码 `ok:false`）、L324-325（`firstBad` ⇒ verdict）、L336（`process.exit(rows.every(...) ? 0 : 1)`）。
- **依据**：`tmpRoot` 由 `mkdtempSync(tmpdir())` 新建（L260），目录内无 `node_modules`、父目录为系统临时目录 ⇒ `resolve('playwright')` **在真实使用场景下不可能命中**（宿主闭包位于 `dsh` 的安装位置，不在 tmp）；两条分支都产生 `ok:false` 行 ⇒ **宿主健康时 `--run` 也恒 `exit 1`**，且 `firstBad` 恒为首个失败行 L2 ⇒ 报文结论固定为「断点层 = L2 客户端 API 面 / DOM 前端约定面」。
- **影响**：与脚本自身存在意义（「一条命令定位断在哪一层」）正面冲突——维护者在一台完全健康的宿主上会得到**错误的断点层归因**；同时「六层无缺面」（L325 的三元分支 + L336 的 exit 0 路径）成为**不可达死代码**，头注释 L28「0 = 无缺面」对 `--run` 永不成立。
- **修复建议**：① 采用本仓既有**三值语义**（契约 `clientProbes` 的 `dom-phase` 无 DOM 时 `ok=null`「不判绿也不判红」，contract L229）：未实现层记 `state:'unavailable'` 并**不计入** verdict 与退出码；② 若确要探测宿主闭包，应从 `hostCmd` 的安装目录解析（`createRequire(join(dirname(hostCmd),'package.json'))`），而非 tmp；③ 在 `--run` 未实现浏览器层期间，把该层的定性从「缺面」改为「未覆盖（probe 未实现）」并在 verdict 中单列。

#### P2-4 — `--run` 的「隔离硬校验」恒真（无判别力）；「不触碰真实 `$HOME`」未被实现保证（与 README 硬约束表述不符）
- **位置**：`scripts/probe-host.mjs` L85-95（`isolationPlan` 把 `DSH_HOME` 定义为 `join(root,'dsh-home')`）、L260-261、L269-270（`plan.env.DSH_HOME.startsWith(tmpRoot)`）、L272（`env = { ...process.env, ...plan.env }`）；`README.md` L206（「…**不触碰真实 `$HOME` / `$DSH_HOME`**」列为**硬约束**）；同仓容差先例 `test/fixtures/host-surfaces/ci-mock-face.mjs` L113-114（`resolve` + `sep` 路径包含性）。
- **依据**：① L270 的判据比较的是**同一表达式的两个派生值**（`root` 与 `join(root,'dsh-home')`），按构造恒为真 ⇒ 该「fail-closed 硬校验」在运行期不可能触发（只对「未来把 `isolationPlan` 改坏」起偏置作用）；且 `startsWith` 是**字符串前缀**而非路径包含性（`tmpRoot + '-x'` 形态可通过）。② `${...process.env}` 会把真实 `HOME`/`USERPROFILE`/`APPDATA`/`XDG_CONFIG_HOME`/`PLAYWRIGHT_BROWSERS_PATH` **继承并导出**给被 spawn 的宿主进程 ⇒ 宿主或依赖（npm 缓存、浏览器缓存）在这些变量下的写入不受本脚本约束；头注释 L22「本进程不使用、不导出」与 README 的硬约束口径**强于实现**。
- **影响**：维护者据 README 在真实机上运行 `--run` 时，隔离保证低于文档所述（M7.7「隔离环境」的举证基础被削弱）；本批的隔离声明属**表述强度 > 实现强度**类（同 P2-1/P2-2 家族）。
- **修复建议**：① 硬校验改为路径包含性：`const abs = resolve(plan.env.DSH_HOME); if (abs !== resolve(root) && !abs.startsWith(resolve(root) + sep)) { …die }`，并**额外**断言 `plan.env.DSH_HOME !== process.env.DSH_HOME`（真实验证「已重定向」）；② 显式覆盖 `HOME`/`USERPROFILE`/`APPDATA`/`XDG_CONFIG_HOME`/`PLAYWRIGHT_BROWSERS_PATH` 到隔离根（一行一个，成本极低）；③ 否则把 README/头注释的表述降级为「本进程不写入 `$HOME`；子进程继承的 `HOME` 未重定向（残余面如实披露）」。

### P3（建议）

#### P3-1 — `deleteOnChild` 的变异会连带吞掉 `on:` 之后的行（F1 负例非最小变异）
- **位置**：`test/fixtures/host-surfaces/probe-face.mjs` L180-188（跳过状态只在遇 `^  [A-Za-z_]+:` 时复位）、L530-532（负例用法）。
- **依据**：`workflow_dispatch` 是 `on:` 最后一个子键，其后空行与 `jobs:`（0 缩进）均不匹配复位正则 ⇒ 一并被删；变异体失去 `jobs:` ⇒ ② 的门禁记录（L326-328）与权限记录（L329-330）**同时**变红，红点不可单独归因四键断言。
- **修复建议**：遇 0 缩进行或非 2 空格缩进行即结束跳过（`if (l !== '' && !/^ {2}/.test(l)) skipping = false`），使变异体仅删除目标键及其子行。

#### P3-2 — `layerChecks` L3 存在死谓词，实际退化为裸子串匹配
- **位置**：`scripts/probe-host.mjs` L161-162（`!clientSrc.includes("'"+s+"'") && !clientSrc.includes(s)`）。
- **依据**：第一个谓词被第二个**蕴含**（含 `'x'` ⇒ 必含 `x`）⇒ 短路后等价于单一子串搜索：注释、i18n 文案或任意字符串中出现 selector/槽位名即算「可提取」。
- **修复建议**：删首谓词并显式登记口径，或对齐 probe-face ⑧ 的做法（从源码中**结构化提取**目标字面量后与 `regionLiterals` 对账）。

#### P3-3 — probe-host L4 hard-code 了第三份 install 契约知识
- **位置**：`scripts/probe-host.mjs` L166-176（字面量数组 + `src.includes(lit)`）。
- **依据**：install 契约知识现存在于 4 处（两脚本头部块、契约 items[].symbol、probe-host L4、probe-face ⑧ 的解析面）；其中 probe-face ⑧ 的口径最稳（解析脚本 → 对账契约 symbol），probe-host 的裸子串最弱，二者不一致时会出现「⑧ 红而 L4 绿」的分歧面。
- **修复建议**：`layerChecks` L4 直接消费契约 `items[]` 的 4.1/4.2/4.3/4.4/5.5（symbol 片段 ⊆ 脚本文本），消除硬编码列表。

#### P3-4 — `jobSection` 镜像无交叉机检
- **位置**：`probe-face.mjs` L118-132 ↔ `smoke.mjs` L1914-1922（语义等价，已复核）；`smoke.mjs` L1911-1913 披露镜像理由。
- **依据**：两处独立实现，无任何断言比对二者行为；未来 ci.yml 结构演化（如引入 `  job:` 带引号/嵌套）时可能一侧红一侧绿，而「红的一侧」是否正确地指示问题无法由机检判定。
- **修复建议**：照 `ci-mock-face.mjs` `extractHeredocs` 的先例，把 job 段切分抽为**纯函数模块**（如 `test/fixtures/host-surfaces/yml-jobs.mjs`），probe-face 与 smoke 共用（smoke 导入纯函数即可，无需导入顶层脚本）。

#### P3-5 — ⑩b 的豁免粒度是整行，且未知 item 引用静默通过
- **位置**：`test/smoke.mjs` L3010（`HIST_MARK5` 含 `原实现`/`原注释`/`原记`）、L3026（整行豁免）、L3013-3019（`itemLineRange5` 找不到 item ⇒ null）、L3029（仅 `r !== null` 才判定）。
- **依据**：豁免词在本仓说明性注释中高频出现（本批新增注释即大量使用「原实现」）；同行若同时含现役陈旧引用，因整行豁免而漏检。指向不存在 item 的引用（如「4.9 L520」）零信号。
- **修复建议**：以 `m.index` 前后 ±N 字符窗口判定历史词（而非整行）；未知 item 引用记为待核项（或至少计入 detail 计数）。

#### P3-6 — ⑩b 扫描面未覆盖本批新增的主要文本载体
- **位置**：`test/smoke.mjs` L3000-3007（口径声明）、L3034-3041（仅 smoke 自身注释 + CHANGELOG 当前条目）。
- **依据**：本批新增文本 ~+800 行中的大部分（probe-face 头注释 63 行、probe-host 头注释 34 行、README 维护者节 + 矩阵行、install 头部块 26 行）不在扫描面；而 F3 的复发载体正是「新写文本」。
- **修复建议**：扫描面按「本批改动文件」动态化（至少纳入 README——其 L168 已是机检对象，纳入无新依赖）。

#### P3-7 — probe-host 三处输出/入参/退出码小瑕
- **位置/依据**：① L212/L224 用 `problems.length`（**行**计数）报「N **层**缺面」——L1 有 3 行，单层双缺面会报「2 层」；② L56-71 `--port`/`--timeout` 不校验数值（`Number(undefined)`→NaN）、`--host-cmd` 无值时被 L75 静默当作「未指定」而回退 PATH（用户以为已指定）；③ L28 头注释称退出码「2 = 用法或环境错误（含「宿主不可用」）」，但「宿主命令存在而 liveness 超时」走 L336 的 `exit 1`（被归为「检出缺面」），与头注释语义不一致。
- **修复建议**：① 报「N 项缺面（覆盖 M 层）」；② `parseArgs` 加非空/有限数值校验并 `die`；`--host-cmd` 显式区分「未给」与「给了空值」；③ liveness 超时改 `die`（exit 2）或修正头注释口径。

#### P3-8 — `spawn`/liveness 轮询位于 `try/finally` 之外，失败路径不清理
- **位置**：`scripts/probe-host.mjs` L273-285（`openSync` + `spawn` + 轮询）vs L286-331（`try … finally { stopHost; closeSync; rmSync }`）。
- **依据**：若 `spawn` 同步抛错或轮询期异常，`finally` 不执行 ⇒ 日志 fd 与临时根泄漏（`--keep` 语义被外部化），且已起的子进程无人回收。
- **修复建议**：把 `try` 上移覆盖 L271-285（`logFd`/`child` 以 `let` 声明、`finally` 内判空），与 probe-face 的 F8 清理口径对齐。

#### P3-9 — 新增的宿主 CLI 命令面未入契约（P-10 登记面）
- **位置**：`scripts/probe-host.mjs` L264/L274（`' web --port N --no-open'`）、L74-82（`dsh` 在 PATH 的解析）；契约 `lib/host-contract.mjs` 面 6 无对应条目（1.8 只登记 `/novel-writing/api/compat` 路由；6.5 只述 `npx @deepseek-ai/dsh` 升级通道）。
- **依据**：本批新增脚本对「宿主 CLI 子命令与开关」形成**运行期依赖**（探测入口），按本仓 P-10「新增宿主耦合字面量 MUST 同步契约 + smoke 对账」的纪律，宜登记（该纪律的枚举含「宿主导入/API/服务名/事件名/槽位/DOM/CSS 令牌族」，CLI 开关未在枚举内 ⇒ 属**口径空白**，非违规）。
- **修复建议**：在面 6 补一条 `kind: 'env-fact'`（或新增 `cli-surface`）登记 `dsh web --port <n> --no-open` 与本仓对它的依赖点；若判定不在登记范围，则在契约头注明明示排除口径（避免后续同类判断反复）。

#### P3-10 — 两处记录精度差（不影响代码）
- ① `CHANGELOG.md` L45「非注释行 install.ps1 **295** / install.sh **221**」vs 任务摘要「**296**」——差 1，且「非注释行」是否含空行的计数口径在仓内无记录；② 任务表称 probe-face「**416**→?」，实测当前 **573** 行、基线 **315**（`docs/review/COMPAT-014-R1.md` L12/L19 一手实读为「probe-face.mjs 全文 315 行」，与本批 +286/−28 的算术一致）——「416」无仓内依据，系任务描述笔误。
- **修复建议**：CHANGELOG 补一句计数口径（如「非注释行 = 去首尾空行后不以 `#` 起首的行数」）。

#### P3-11 — ⑧ 的 golden 只锁约定项**数量**，未锁 **id 集**
- **位置**：`probe-face.mjs` L90（`INSTALL_GOLDEN_ENTRIES = 5`）、L270-272。
- **依据**：两脚本同步把 `[4.2]` 换成 `[4.6]` 并写入 ∈ 4.6 symbol 的字面量即可全绿——面 4/5 的**覆盖面**脱靶而无信号（`keysA === keysB` 只保证两脚本自洽）。
- **修复建议**：golden 改为有序 id 集 `['4.1','4.2','4.3','4.4','5.5']` 并逐项比对（扩/删项须显式改 golden，与仓内 golden 先例一致）。

#### P3-12 — `RUN_TIMEOUT_MS` 为**每例**上限，最坏累积 ~14 min
- **位置**：`probe-face.mjs` L85 + L218（默认参数）、11 例（L439-480）+ 3 次工具调用（L298/L538）。
- **依据**：单例 60s 的合理上限在 14 次调用上累积过高（虽仍由 job 级超时兜底，且失败时逐例报文可定位）。
- **修复建议**：加共享截止时间（`overallDeadline`，超时后剩余用例直接记红）或对构造用例用更短上限（例：10s）。

---

## 10. 非阻断备注（不改变终态）

1. **`--run` 的两处 P2（P2-3/P2-4）不阻塞本批**：该模式在 CI 与仓内**从未执行**（模式自述 `REAL-RUN: UNVERIFIED`），故不影响本批「install 零行为变化 + 离线面全绿」的结论；但**首次真机使用前**必须先处置（否则会向维护者给出错误的断点层归因与偏弱的隔离保证）。
2. **probe-face 的三面职责（C-03）**：当前仍在「单一工具、三类机检」的合理范围内（文件头 L2-6 已声明三面），本人不判违规；建议在**下一次新增第 4 类职责**时拆分 install 对账面（与 `ci-mock-face.mjs` 同构）。
3. **`--json-out` 仍无消费方**（`probe-face` L30/L564-567、`probe-host` L223/L335）：与 COMPAT-014-R1 §7-2 同一观察延续；本批未扩大该无消费面（probe-host 也提供该选项）。建议在 README 登记用途或移除。
4. **README 已知限制表（L216-224）未收录 probe-host `--run` 未验证**：维护者节（L205）已充分披露，故仅提示可选补一行，避免读者只读限制表。
5. **`smoke` 的 README 计数联动是有价值的副作用**：任一新断言失败会使末条计数断言同时红（失败数 +1），故「构造注入 ⇒ 失败数恰 2」是**预期行为**而非缺陷（§4.3 已作为判别力旁证使用）；维护者无需误判为「两处坏了」。
6. **fixtures 的 `origin` 与标记值**（`checkout-static-extract` vs `tarball-static-extract`）在 0.1.1/0.1.5 两份间不同属**来源如实登记**，非漂移；`layerChecks` L6 只比 `value` 未比 `origin`（契约 `versionFactOrigins` 由 smoke 校验）⇒ 分工无重叠，无重复断言。
7. **本批 CI 常态面零新增网络面**：`--self-check` 与 probe-face 全程离线；ci.yml 探测 job 命令面（`npm view` 只读）**未被本批修改**（F5 只改判据脚本内部逻辑），故 A-F5 白名单与供应链口径保持 ✓。

---

## 11. 结论与终态

**终态：APPROVED_WITH_NOTES — `unresolved_blockers = 0`**（P0 = 0 / P1 = 0 / P2 = 4 / P3 = 12）。

**判定依据**：
- **13 项（F1~F11 + COMPAT-008 + COMPAT-009）100% 落地**，无缺项（§3）；核心修复的判别力可**独立静态复算**：F2 的双红负例成立且「旧全文守卫仍绿」被固化为断言、F1 四键负例有效（但触发面过宽，P3-1）、F4 三负例与 F7 真跑断言均可复算、F5 并报逻辑与退出码取舍正确（§2.4）、⑧ 的五个字面量与契约 `symbol` 逐条**语义同位命中**（非偶然子串，§2.6）。
- **install 强等价声称成立**：**22/22 端点 +13** 由三个互相独立的历史来源交叉证实（`docs/research/COMPAT-001-host-compat-analysis.md` §3 底稿 + `docs/review/COMPAT-001-R1.md` L112 + diffstat 算术与 COMPAT-014-R1 的一手行数），并附 3 处非注释代码段内容抽验一致、插入块逐行皆注释（§5）。字节级同一性因「未运行命令」不可重算，已如实登记为方法边界（不影响结论：行为面无可执行语句变更）。
- **4 项 P2 均属「声称强度 / 隔离口径 > 实现」类**（P2-1 marker 防伪子串、P2-2 ⑩c 测副本、P2-3 `--run` 浏览器层不可达 + 断点层误归因、P2-4 隔离校验恒真 + `$HOME` 未重定向），**均不触及本批的 CI 常态执行面与 install 零行为变化结论**，故不构成阻塞；其中 P2-1/P2-2 的修复成本各 ≤5 行且与本批 F2 的教训同源，**建议随本批或紧接的收口一并处理**；P2-3/P2-4 属 `--run` 真机面，**建议在首次真机使用前**处理或把 README 表述降级为与实现一致。
- **12 项 P3** 集中在：守卫粒度/覆盖面（F1/F3/F9/⑧）、工具输出与健壮性（probe-host）、知识重复（install 契约第 4 份副本、`jobSection` 镜像、CLI 命令面未登记）、记录精度（295/296、416/315）——**不含安全、数据、逻辑或回归风险，且无一项为假绿方向**。
- **本人未运行任何命令**（§0）；文中「Coordinator 独立复跑」结论（smoke 282/0、probe-face 27+11、probe-host `--self-check` 6/6 与 `--run` 无宿主 exit 2、ci-mock-face 4/4、validate-preset PASSED、`node --check` ×11 = 0、YAML 有效）作为**引用事实**记录，供复审或发布门禁以复跑替代；本报告的独立性建立在**静态可复算**部分（§2.1/§2.6/§4/§5）。

**给 Coordinator 的三条处置建议（不改变终态）**：
1. **建议随本批收口（低成本、同一失效模式家族）**：P2-1（marker 断言绑定定义行/运行期值，≤3 行）、P2-2（⑩c 与部署词法共用同一常量，≤5 行）。二者若随批修完，本批的「防伪/正控」承诺才与其表述等强。
2. **建议立后续任务（`--run` 真机面，需真机/宿主环境）**：P2-3（三值语义 + 从宿主安装目录解析 + verdict 单列「未覆盖」）、P2-4（路径包含性硬校验 + `HOME` 族重定向或表述降级）、P3-7②/③、P3-8、P3-9。
3. **无需动作（登记即可）**：P3-1/P3-2/P3-3/P3-4/P3-5/P3-6/P3-10/P3-11/P3-12——建议登记为 P3 待办，随下一次同类触及（如 probe-face 再扩面、或 install 契约块扩项）一并收敛；§10 全部备注无需动作。
