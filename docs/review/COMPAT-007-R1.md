# REVIEW-COMPAT-007-R1 — CI 宿主发版探测轨（后置代码审查）

| 项 | 值 |
|---|---|
| 任务 | COMPAT-007（轴③ C1 探测轨；DEC-025 ADR 决策②② + RB-01） |
| 审查轮次 | **R1（首轮）**；前轮引用：无（本任务首次审查） |
| 审查对象 | commit `c7203f9`（未 push，declared 恰 3 路径 +207/−1） |
| Reviewer | Code Reviewer Agent（只读；本轮**零命令执行**、零测试运行、零产品代码改动） |
| 报告路径 | `docs/review/COMPAT-007-R1.md`（本任务唯一写入路径） |
| 硬门槛 | P0 阻塞 = **0** ✅ ／ 5 维度全覆盖 ✅ ／ 发现全标注 P0~P3 ✅ ／ AI 专项 5 项 ✅ |
| 终态 | **APPROVED_WITH_NOTES（unresolved_blockers = 0）** |

---

## 0. 审查范围与事实源（逐项实读，非转述）

| 事实源 | 读取范围 | 用途 |
|---|---|---|
| `D:/AI/agent/claude/coding/project_management_workflow/agents/code-reviewer.md` | 全文 106 行 | 角色定义/维度/硬门槛/终态 |
| `.github/workflows/ci.yml` | 全文 298 行（含 L161→L297 内联判据 heredoc 逐行） | 主审查对象 |
| `README.md` | 全文 220 行（重点 L156-190） | 审查对象 |
| `CHANGELOG.md` | L1-60（COMPAT-007 条目 L7-12） | 审查对象 |
| `lib/host-contract.mjs`（只读对照） | L228-290（`hostSurface` 全段）+ L149/L151/L152/L153（item 6.1/6.3/6.4/6.5） | 判据的契约面真一致性 |
| `test/fixtures/host-surfaces/*.json` | 3 份文件头（L1-20）+ `"version":` 全量抽读 | 判据输入真值 |
| `test/smoke.mjs` | L1790-1834（COMPAT-003/011 fixtures 对账段） | 判「版本维」守卫覆盖到什么 |
| `test/fixtures/host-surfaces/ci-mock-face.mjs` | L1-55（`extractHeredocs`/`staticExportKeys`） | 评「PR 面能否机检新判据」 |
| `package.json` | 全文 46 行 | README 矩阵口径（`*`）真值 |
| `docs/DESIGN.md` L87 / `docs/RESEARCH.md` L76 | 按需抽读 | `0.1.0-rc.7` 依据溯源 |

**未执行**：ci.yml 内任何命令（含 `npm view`）；测试（角色约束）；任何 hash 计算/命令。**未复核**：见 §6「非阻断备注」。

---

## 1. 重点核验项结论（Coordinator 指定）

### 1.1 供应链白名单 —— ✅ 通过（逐行核验）

逐行读 `host-latest-probe` job（ci.yml L126-298），本 job 内**全部命令面**：

| 位置 | 命令 | 白名单判定 |
|---|---|---|
| L147 | `mkdir -p "$PROBE_DIR"` | 本地目录操作（runner temp 内）✅ |
| L148-157 | `npm view <9 目标> versions\|dist-tags --json > $PROBE_DIR/*.json`（10 行） | **白名单内**（只读注册表元数据）✅ |
| L161 | `cat > "$RUNNER_TEMP/nv-host-latest-probe.mjs" <<'PROBE_EOF'` | 写 runner temp ✅ |
| L298 | `node "$RUNNER_TEMP/nv-host-latest-probe.mjs" ...` | 运行**仓内自研判据脚本**（非宿主代码）✅ |

- **零 `npm install` / `npm ci` / `npx` / `npm pack` / 解包 tarball 后 import 或执行 / `actions/cache`**：全 job 对禁止词 grep 仅命中**注释行**（L140-141、L144），无命令命中 ✅（`npm install` 唯一实存位置 = **既有** `host-logic` job L83，非本 commit 引入）。
- **零执行宿主代码**：判据脚本只 `import { hostContract } from './lib/host-contract.mjs'`（L193）——该文件为仓内**纯数据契约**（零宿主 import、零运行时逻辑，由 smoke 纯数据守卫约束，contract L1-17/L13-17 自述）；`npm view` 不执行被查包代码 ✅。
- **无 secret 使用**：job 内无 `secrets.*`、无 `env` 注入 token（L131-132 仅 `PROBE_DIR`）✅。
- **无不可信输入插值**：全 ci.yml 唯一 `${{ }}` = `${{ runner.temp }}`（L132，可信常量）；`run` 块无 `github.event.*`/`inputs.*` 插值 ⇒ 无脚本注入面 ✅（grep 实证）。
- **写入面**：仅 `$PROBE_DIR`（`${{ runner.temp }}/nv-host-probe`）与 `$RUNNER_TEMP/…mjs`，零仓库写入、零宿主目录写入 ✅；`dist-tags` 仅作上下文报告（L288），非判据 ✅。
- **heredoc 引号正确性（关键陷阱）**：`<<'PROBE_EOF'` 为**引号定界符** ⇒ 判据体内模板串 `${...}`（L233/L238/L264/L277/L279 等）不被 shell 展开 ✅（若写成 `<<PROBE_EOF` 会破坏判据——作者正确规避）。

> 残余（非本 job 缺陷，见 F1）：workflow 级 `on.schedule` 使**本 job 之外**的 `sanity`/`host-logic` 亦进入每日执行面。

### 1.2 不进 PR 门禁 —— ✅ 通过

- `host-latest-probe` 带 `if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'`（L127）⇒ push/pull_request 事件下 job 为 skipped，**宿主 rc 版误红不阻断开发**（陈述与实现一致）✅。
- `permissions: contents: read`（L129-130）为**job 级最小权限** ✅（优于同 workflow 其余 job——见 F1）。
- `on` 面（L3-11）经 Coordinator 独立 `yaml.safe_load` 复核：`push/pull_request/schedule/workflow_dispatch`、`schedule=[{cron:'17 3 * * *'}]`、jobs = sanity/host-logic/host-latest-probe ✅（与 CHANGELOG L8/L11 陈述一致）。
- 触发面与文档一致：CHANGELOG L8「`if` 限定仅这两类事件（只读网络探测不进 PR 门禁）」✅。

### 1.3 判据四子句 —— 逻辑与真值一致（逐子句核验）

判据脚本内联于 ci.yml L162-296。逐子句对照契约/ fixtures 真值：

| 子句 | 实现位置 | 核验结论 |
|---|---|---|
| ① 探测面 ≡ 契约 `hostSurface.packages` 并集（双向） | L194-195、L229-234 | ✅ **真一致**：契约并集 = `{cordis, schemastery, dsh-settings, dsh-api-gateway, dsh-client-modules, dsh-client-connection, dsh-home-paths, dsh-tools}`（contract L237-241 三版本 flat+Set）＝ **8 包**，∪`dsh` = **9 目标** ＝ ci.yml L148-157 的 **9 探测行**（+`dsh.dist-tags.json` 不匹配 `*.versions.json` 后缀，L230 过滤正确，不误判越界）；漏探（L233）/越界探（L234）双向均判红 ✅ |
| ② 覆盖版本仍在上游已发布列表 | L256-257 | ✅ 对**非 CLI 包**语义正确（比较对象 = 各 fixture 中该包 `version`）。**CLI 例外见 F3** |
| ③ fixtures 自洽 + 例外表不腐化 | L259-267 | ✅ **真值核验**：3 份 fixture `hostVersion` = `0.1.1-rc.2`/`0.1.2-rc.1`/`0.1.5-rc.2` ≡ 契约 `packages` 键（smoke L1807-1812 亦以 `sameSet` 双向锁定）；0.1.5 fixture 的 6 个 host 族包 version 全 = `0.1.5-rc.2`（fixture L268/329/393/451/514/549），`cordis=4.0.2`（L34）/`schemastery=3.18.2`（L250）≠ hostVersion ⇒ 非例外包「≡」与例外包「≠」两向判定均与实状一致 ✅ |
| ④ 版本车判据（同车最大 ≡ 覆盖最大；无更高车） | L269-277 | ✅ 实现与 CHANGELOG L8 / ci.yml L171-172 表述**逐字一致**：同车 `maxPub>maxCov` 判红 + `train > newestCov.train` 判红。语义边界（rc/alpha 排序）正确：`TRACK={alpha:0,rc:1,stable:2}`（L199）使 `-alpha.N < -rc.N < 稳定版`，`pre` 仅在**同轨**内比较（L206/L209），跨轨由 `track` 支配 ⇒ 与 semver 一致；`0.1.5`（stable）> `0.1.5-rc.2` 亦正确判红 ✅ |

**fail-closed 完整性（穷举未知分支，逐支路验证）**：

| 未知/异常分支 | 实现行为 | 判定 |
|---|---|---|
| 探测面缺声明包 / 含未声明包 | L233/L234 → red | ✅ |
| 探测文件缺失 | L238 → red（且①已先报） | ✅ |
| 探测 JSON 非法/空（`npm view` 失败残留空文件） | L241 `JSON.parse` **未捕获抛错 → node 退出码 1 → red** | ✅ 方向正确（**不误绿**）；诊断/退出码语义见 F7 |
| 覆盖版本不在受限口径（非 `X.Y.Z` / `-{alpha\|rc}.N`） | L246 → red + `continue` | ✅ |
| 契约声明包在 fixtures 零覆盖 | L247 → red | ✅ |
| 上游已发布列表含口径外形态（beta/nightly/构建元数据…） | L252 → red（同时 `pubOk` 过滤后继续比对） | ✅ 不静默跳过 |
| 上游列表为空 `[]` | L257 → red（覆盖版本不在空列表） | ✅ |
| 契约 `versionExceptions` 缺失 | 空集 ⇒ 例外包被判「host 族 ≠ hostVersion」→ red | ✅ fail-closed（宁红不绿） |
| 契约 `packages` 缺失 | `Object.values(undefined)` 抛错 → exit 1 → red | ✅ |

**语义边界（如实记录，非缺陷）**：判据只覆盖「**高于最新覆盖车**」与「**已覆盖车内推进**」两类；**低于最新覆盖车的中间车**新版本（如覆盖 `0.1.5-rc.2` 时上游出现 `0.1.3-rc.9`）**不判红**（L276 条件为 `> newestCov.train`）。该边界与 CHANGELOG L8 的表述一致（「上游 MUST NOT 出现**更高车**」）——文档未失真；但 README L189 的概括与之不完全一致（见 F8①）。

### 1.4 P-01 订正的必要性 —— ✅ 证据链成立，且订正方向为「减少依赖」

任务书设想的 `latest` tag 直比判据（`npm view <pkg> version` vs fixtures `hostVersion`）被实测推翻为恒红假阳，证据链**四点在仓内可交叉印证**：

1. **CLI 与子包版本号本就会分歧**（与 P-01 订正同一性质的事实）：fixture `0.1.5-rc.2.json` L5 自述「`@deepseek-ai/dsh` **0.1.5-rc.1** 的安装闭包，`@deepseek-ai/dsh-*` 子包实测版本 **0.1.5-rc.2**」；README L182 同口径 ✅ ⇒「子包/CLI 的版本语义不可互推」在仓内有独立证据。
2. **宿主升级通道「rc 直接打 latest tag」已成契约事实**：contract item 6.5（L153，`env-fact`，incident = BUG-006 触发路径）✅ ⇒ 用 `latest` 做判据与「rc 领先发版」的现实相冲突，订正动机成立。
3. **订正留档具体且可追溯**：ci.yml L176-181（代码注释）+ CHANGELOG L9 记录 `dsh-settings latest=0.0.1-rc.1` / `dsh-home-paths latest=0.0.1-rc.3`、CLI dist-tags `{latest: 0.1.5-rc.1, next: 0.1.5-rc.2, alpha: 0.1.5-alpha.2}`——**同一数值在 ci.yml 与 CHANGELOG 两处一致**，非事后合理化。
4. **订正后的判据与 dist-tag 完全解耦**（`dist-tags` 仅 L288 作上下文打印）：即令「子包 latest 停在 0.0.1-rc.X」这一 registry 实测值将来失真，**判据正确性不受影响**——订正是把判据从「依赖 tag 命名」改为「依赖已发布列表 + 版本车」，属**减依赖**而非新增假设 ✅。

**结论**：P-01 订正必要性**成立**，留档口径诚实（标注为「实测订正」，未包装成设计演进）。唯一不可离线复核项 = registry 侧数值本身（见 §6）。

### 1.5 CLI 代理口径 —— 结论：**可接受（不阻塞）；建议另立 P3 后续任务**

- **事实基础核验**：fixtures **确无 CLI 版本机读位** ✅——3 份 fixture 顶层键 = `schemaVersion/task/hostVersion/source/extraction/packages`（L1-6 实读），`hostVersion` 由 `extract.mjs` 的 `--version` 参数写入（extract.mjs L443）即**调用方标签**（0.1.5 份填的是子包版本），全仓 grep 无 `cliVersion` 类字段 ⇒ 代理口径的**前提陈述真实**（非杜撰）。
- **方向正确性（可否假绿）**——逐情形推演：CLI **仅自身**发新版时，代理 `covered` = `{0.1.1-rc.2, 0.1.2-rc.1, 0.1.5-rc.2}`，新 CLI 版本若同车更高（`0.1.5-rc.3`）由子句④同车分支判红、若更高车（`0.1.6-rc.1`）由更高车分支判红 ⇒ **前向发版无假绿路径** ✅（CHANGELOG L9 的「代理只会更早判红，不掩盖更新版本」经推演成立）。
- **残余（不阻塞，登记为 F3）**：子句②把「覆盖版本必须仍在上游列表」套用于 **CLI**，而 covering 串是**子包闭包版本**——CLI 自身发版号与之不保证逐一对应（fixture L5 即现存分歧实例）。若未来 fixture 标签对应的 CLI 版本尚未发布，探测轨会因**非宿主原因**判红，且报文归因为「覆盖声明陈旧或被撤回」，使判据自述的处置路径（「更新 fixtures 即关红」）失效。当前**实测绿**（Developer 真绿 exit 0 + Coordinator 独立复核 YAML/契约面），故非现行缺陷。
- **建议（另立 P3 任务，两选一）**：① fixtures 增 `cliVersion` 机读位（extract.mjs L443 处已有 `--version` 通道，成本低），判据优先用真值、缺位时回退代理；② 或 CLI 单列时**跳过子句②**、仅保留版本车判据。

### 1.6 判据内联 heredoc 的取舍 —— Evaluation：**保留内联（本任务内不建议迁移 `scripts/`）**

| 维度 | 内联（现状） | 抽 `scripts/` 文件 |
|---|---|---|
| 与探测行/白名单的单一事实源 | ✅ 同文件逐行对应（探测行 L148-157 ↔ 判据对账锚点），审计一个文件即可 | ✗ 命令面与判据分处两地，白名单「逐行审计」成本上升 |
| 机检覆盖（`node --check`/smoke 可判） | ✗ 无（→ F2） | ✅ 可入 sanity/`node --check` |
| 改动面纪律 | ✅ commit 恰 3 路径、零新增仓库路径 | ✗ 需新增路径（超本任务 declared 面） |
| 可读性/可测性 | △ 135 行代码嵌在 YAML 里（缩进剥离后正常） | ✅ 常规 JS 文件 |

**结论**：现阶段**保留内联**。理由：内联换取的「探测面与判据同文件、可逐行审计」正是白名单纪律的核心；抽文件的主要收益（可机检）**不必**通过迁移路径获得——用「PR 面机检」即可拿到大部分（F2）。若判据继续增长（例如引入 dist-tag 语义或 CLI 真值），届时再迁移更合适（届时新增路径也是自然扩容而非本次夹带）。

### 1.7 README 矩阵与 DEC-026 一致性 —— ✅ 通过（两处口径瑕疵见 F8）

- `peerDependencies` 真值 = 全 `*`（package.json L39-45）＝ README L178「当前仍为 `*`（A1 收敛未生效）」✅；与 contract item 6.1（L149，necessity=`improvable`，「* = 不设限=不设防」）同口径 ✅。
- 行 2「`0.1.2-rc.1` = **最低支持线**，v1.0 起为声明下限（A1 绑定 v1.0 major 边界），**当前 A3 阶段尚未生效**」✅ 与 DEC-026/CHANGELOG L10 一致，且与 contract 6.3（L151，隐式矩阵→显式化）方向一致。
- 行 1「`0.1.5-rc.2`（现行闭包内子包实测版本；CLI `0.1.5-rc.1` = registry `latest`）」✅ 与 fixture L5 + CHANGELOG L9 dist-tags 三方一致。
- 行 4「未列版本（含 `next`/`alpha` tag 上预发布）未验证」✅ 与 `*` 无下限的事实自洽。

---

## 2. 五维度结论

### 2.1 正确性 —— ⚠️ 通过（0 阻塞；2 项非阻塞逻辑/口径发现）

- 四子句与契约/fixtures 真值逐项一致（§1.3 表）；无假绿路径（穷举 9 类未知/异常分支，全部 fail-closed）。
- 版本排序语义正确（`alpha<rc<stable`、同轨比 pre、跨轨比 track；`0.1.5` > `0.1.5-rc.2`）。
- 去重/归因正确：`found` 以 `新版本|覆盖版本` 为键去重（L274/L276），`okLines` 以 `failures.size === before` 逐包归因（L239/L279），不误报「✅」。
- 已核对的**无缺陷点**：`readJson` 的 `Array.isArray(raw) ? raw : [raw]`（L242）正确覆盖「单版本时 npm 输出标量」形态；`dist-tags` 文件不污染探测面（L230）；`exceptions` 缺失时反向判红（fail-closed）。
- 发现：F3（CLI 代理子句②）、F4（版本维未对账）、F7（异常输入退出码/诊断）。

### 2.2 安全性 —— ✅ 通过（重点核验项全部通过；1 项非阻塞）

- §1.1 白名单逐行核验通过；§1.2 `if` 门禁 + 最小权限通过；无 secret、无可信输入之外插值、零仓库/宿主写入。
- 供应链面：`npm view` 不执行被查包代码、不落盘包体；判据脚本只消费 runner temp 内 JSON + 仓内 fixtures/契约。
- 发现：F1（workflow 级 `schedule` 的**副作用面**：既有 `host-logic` 的 `npm install --no-save @deepseek-ai/schemastery`（L83，未钉版本）与 `sanity` 亦被每日触发，且这两个 job **未收敛 `permissions`**、文档未披露）——判为 P2 建议项（含安全姿态与成本，非本 job 违规）。
- 发现：F5（白名单的**持续机检**缺席——现为注释纪律 + 人工审查）。

### 2.3 可维护性 —— ✅ 通过（1 项发现）

- §1.6 内联 heredoc 取舍已评估：保留内联；附带指出 ci.yml 现存在**两种 heredoc 约定**（既有 mock `<<'EOF'` ↔ 新 `<<'PROBE_EOF'`），既有 `extractHeredocs`（ci-mock-face.mjs L27-37，正则硬编码 `<<'EOF'` + 未引号 target）**不匹配**新约定 ⇒ 新判据天然落在既有提取能力之外（并入 F2）。
- 注释质量：判据头（L162-181）逐条自述判据、退出码、为何不复用 latest、受限口径与 fail-closed 立场——对后续修改者友好；`P-01` 订正留档在**代码内**（不只在 CHANGELOG）✅。
- README 探测轨节（L187-190）把「探测轨 / 窗口期 / 本地等效命令」集中成节，命名与 CHANGELOG 可互引 ✅。
- 发现：F9（README L168 陈旧断言计数 179 vs 实际 276，pre-existing）。

### 2.4 性能 —— ✅ 通过

- 成本面 = **10 次固定 `npm view`**（L148-157）+ 1 次本地 node 判据（读 3 份 fixture + 契约，`O(n log n)` 于**极小**数组：`versions` 数量级 ~10¹）。
- 每日 1 次 + 手动 dispatch；无 install、无 cache 拉取、无并行度问题；无 N+1/网络循环（网络仅探测步骤，判据内零网络）✅。
- 说明：本轮**未实测**（角色约束：不执行命令）；以上为按代码结构的推断，非测量值。

### 2.5 测试覆盖 —— △ 通过（0 阻塞；覆盖度与披露评估如下）

Developer 证据：真绿 exit 0（真实 registry 只读）+ **构造红 ×9 exit 1** + 隔离 12 组命令逐条上报 + 验证产物 ≡ 交付产物（heredoc 提取物 135 行 sha256 `43B0FD2B…`）+ 回归 smoke 276/0、validate-preset 29/29（Coordinator 独立复跑一致）。

- **9 例覆盖度（对照我核出的失效模式清单）**：同车新 rc ✅、新车 ✅、CLI 单独发版 ✅、覆盖版本上游消失（子句②）✅、漏探 ✅、越界探 ✅、未知版本形态 ✅、例外表腐化 ✅、host 族不自洽 ✅ —— 覆盖了 4 个子句 + 双向探测面的**全部判红入口**，构造面扎实。
- **判定为「不适用/无需覆盖」**：`dist-tag` 漂移——判据**已与 dist-tag 解耦**，漂移不再构成失效模式（仅作上下文打印）✅ 这是 P-01 订正带来的覆盖面收缩，合理。
- **覆盖缺口（如实列出，均非阻塞）**：
  1. **整包下架**（`npm view` 非零退出 → 空文件 → `JSON.parse` 抛错路径）未构造（F7）；
  2. **版本维失配**（新增第 4 份 fixture 文件而契约 `packages` 版本键未更新）未覆盖且判据不检（F4）；
  3. **判据脚本自身的 PR 面机检**为零（F2）——语法/逻辑缺陷只能在首次 schedule/dispatch 暴露；
  4. 上游**新增包**（契约未声明的新子包）不在判据范围（设计边界：契约 = 探测目标集单一事实源），未在文档中显式披露该盲区（弱披露项，并入 F8 语境）。
- **本地等效 vs CI 真跑的差距——披露诚实** ✅：CHANGELOG L11 明示「本地无法真跑 GitHub scheduled ⇒ 以隔离等效命令验证探测逻辑，CI 侧首次定时执行仍需观测确认」；任务遗留项同口径。等效性评估：**产物同源**（同一 heredoc 提取物，内容哈希留痕）⇒ 判据逻辑等效性高；**不等效面** = 事件门禁（`if`）、runner 环境（`$RUNNER_TEMP`/bash `-e`/npm 版本）、多 job 交互（F1）——后三者本地未覆盖，属已知残差。

---

## 3. AI 专项 5 项检查

| 项 | 结论 | 依据 |
|---|---|---|
| mock 残留 | ✅ 无 | 新 job 判据消费**真实 registry 元数据**；无任何替身/mock 进入探测轨（对照：既有 mock 仅存在于 `host-logic` job 的宿主替身，与本 job 无关）。构造用例落在 `%TEMP%` 隔离根，未入仓 |
| 硬编码 | △ 可接受（1 处必要硬编码 + 机检闭环） | ci.yml L148-157 的 9 行探测目标**必须**硬编码（要发命令），但判据子句①（L233-234）对其做**双向**对账 ⇒ 硬编码清单被契约机检钉住，漂移必红（这正是「单一事实源」的落地形态）。版本清单/fixtures **非硬编码**：判据从 `lib/host-contract.mjs`（L194-196）与 fixtures 目录（L214-225）读取；README L182/L189 的版本数值均可在仓内溯源 |
| 幻觉（包名/版本真实性） | ✅ 通过（仓内可溯源） | 9 个包名全部在契约 `hostSurface.packages`（L237-241）/`requiredExports`（L242-248）/ci.yml `host-logic`（L83 真包）中出现；版本数值 `0.1.1-rc.2`/`0.1.2-rc.1`/`0.1.5-rc.2` 与 3 份 fixture 头部逐字一致（fixture L4），`cordis 4.0.2`/`schemastery 3.18.2` 与 fixture 内 `version` 字段一致。**registry 侧实测值**（`0.0.1-rc.1`/`0.0.1-rc.3`、dist-tags）属外部事实，本轮离线**未独立复核**（§6），但承 §1.4：判据不依赖之 |
| 未实现 TODO | ✅ 无 | ci.yml 全文件无 `TODO/FIXME/XXX`（grep 实证）；`workflow_dispatch`/`schedule` 均已实现；无占位分支、无死代码（`TRACK/cmpTrain/cmpVersion/sameTrain/trainKey/okLines/die/readJson` 全部有消费者） |
| 过度实现 | ✅ 判定合理 | +183 行中判据逻辑 ~90 行 + 白名单/订正/口径注释 ~45 行 + workflow/README/CHANGELOG。注释占比高但**必要**：白名单纪律、P-01 订正留档、受限口径与 fail-closed 立场正是后续维护者最需要的上下文；判据本身无投机性扩展（未引入 dist-tag 语义、未引入 CLI 真值获取、未引入 fixture 重建） |

---

## 4. 发现列表（P0~P3；file:line + 事实依据 + 影响 + 修复建议）

> P0 = 阻塞（本次 **0 条**）；P2 = 警告（建议合并前决策/随任务收口）；P3 = 建议（可另立任务）。

### F1 — P2（安全性/披露）：workflow 级 `on.schedule` 使**既有两个 job** 亦进入每日无人值守执行面（含未钉版本的真实包安装）

- **位置**：`.github/workflows/ci.yml` L9-10（`schedule`）+ L13-14（`sanity:` 无 `if`）+ L70-71（`host-logic:` 无 `if`）+ **L83**（`npm install --no-save @deepseek-ai/schemastery >/dev/null 2>&1`）。
- **依据**：新增 `on.schedule` 作用于整个 workflow；`sanity`/`host-logic` **无事件 `if` 限定**（逐行实读），故每日 cron 会一并执行它们，包括一次**未钉版本**的真实包安装与 `node test/smoke.mjs`。而交付文档只把每日一次描述为**探测轨**的频率（README L189、CHANGELOG L8），未披露该副作用面；同 workflow 内两个 job 也**未收敛 `permissions`**（对比新 job L129-130 的 `contents: read`）。
- **影响**：①每日无人值守的第三方安装（浮动版本 → 注册表新版本即进入执行面）与既有 job 持有默认 token 权限，构成 CI 安全姿态的**未披露变更**；②若意图是「只有探测轨每日跑」，现状与之不符；③反向看有**副作用收益**（真实 schemastery 漂移每日可见）。
- **建议（二选一，属 Coordinator/Developer 决策）**：a) 给 `sanity`/`host-logic` 加反向 `if`（`github.event_name != 'schedule'`）使每日面收敛为探测轨；或 b) 明示「每日全量运行」并在 README/CHANGELOG 披露，同时给这两个 job 补 `permissions: contents: read`、考虑将 schemastery 安装钉到一个版本。**不阻塞合并**（非本 job 白名单违规；属行为面/披露面）。

### F2 — P2（测试覆盖/可维护性）：新判据脚本在 PR/push 面**零机检**，缺陷只能等首次 schedule/dispatch 暴露

- **位置**：`.github/workflows/ci.yml` L127（`if` 排除 PR/push）→ L161-298（内联判据）；对照既有能力 `test/fixtures/host-surfaces/ci-mock-face.mjs` L27-37（`extractHeredocs`）。
- **依据**：判据 job 被 `if` 排除于 PR/push ⇒ 其中的 JS（135 行）在合并前**没有任何自动化消费**：`sanity` 的 `node --check` 清单（L22-28）不含它，`ci-mock-face.mjs` 的 `extractHeredocs` 正则硬编码 `<<'EOF'` 且 target 为未引号 `\S+` ⇒ **不匹配**新约定 `cat > "$RUNNER_TEMP/…" <<'PROBE_EOF'`（逐行实读）。因此「判据语法/逻辑缺陷」与「首次真跑」耦合，风险集中在上线首日。
- **影响**：探测轨的**首跑失败**（语法错、缩进剥离错、路径错）不会被任何 PR 检查拦住；同时也使「验证产物 ≡ 交付产物」只能靠人工纪律维持。
- **建议**：`sanity` 增一个**离线**步骤（与既有 `ci-mock-face.mjs` 同风格：无网络、无 install）：先泛化/新增提取（`<<'PROBE_EOF'` + 引号 target），再 `node --check` 提取物 + 用**构造的 probe JSON + fixtures 目录**驱动判据（既不触网、也不会因宿主发版误红，因而不违反「只读网络探测不进 PR 门禁」的原意）。可从 F2 起步再评估是否迁移 `scripts/`（§1.6）。

### F3 — P3（正确性/CLI 代理）：子句②对 CLI 代理套用「覆盖版本仍在上游列表」，可能因**非宿主原因**判红且报文误归因

- **位置**：`.github/workflows/ci.yml` L240/L243（`isCli ? coveredHost`）、L256-257（子句②）。
- **依据**：CLI 的 `covered` 是 **hostVersion 集合**（子包闭包版本），而 CLI 自身发版号与之不保证一致——仓内现存分歧实例：`test/fixtures/host-surfaces/0.1.5-rc.2.json` L5「CLI `0.1.5-rc.1` / 子包 `0.1.5-rc.2`」；fixtures 确无 CLI 版本机读位（顶层键实读 + `extract.mjs` L443 `hostVersion: opts.version` 由调用方传入）。
- **影响**：若未来 fixture 标签对应的 CLI 版本尚未发布，探测轨会对 `dsh` 判红并输出「fixtures 覆盖版本 X 不在上游已发布列表 ⇒ 覆盖声明陈旧或被撤回」，而真实原因是**代理映射失配** ⇒ 误归因 + 判据自述的「更新 fixtures 即关红」路径可能失效（直到 CLI 发布同名版本）。**当前实测绿**，故非现行缺陷；结论 = 代理**可接受**（§1.5 无前向假绿）。
- **建议**：另立 P3 任务，二选一：① fixtures 增 `cliVersion` 机读位（`extract.mjs` 已有 `--version` 通道）并优先用真值；② CLI 单列时跳过子句②、保留版本车判据。另建议 CLI 分支的报文加「（CLI 覆盖面 = hostVersion 代理）」限定语，避免把子包版本读成 CLI 版本。

### F4 — P3（正确性/单一事实源）：判据只对**包名维**双向对账，未对**版本维**（契约 `packages` 键集 ↔ fixtures `hostVersion` 集）对账

- **位置**：`.github/workflows/ci.yml` L194-195（只用 `Object.values(...).flat()`）、L217-225（`coveredHost` 仅用于 CLI）、L233-234（双向仅覆盖包名 stem）；对照 `lib/host-contract.mjs` L236-241（`current` + 三版本键）。
- **依据**：判据从不读契约的 `hostSurface.current` 或 `packages` 的**键集**；而 `test/smoke.mjs` L1801-1812 的版本维守卫以**契约键集**为循环源（`versions = Object.keys(hs.packages)`）⇒ **新增第 4 份 fixture 文件对 smoke ① 与判据均不可见**。于是「重建 fixtures 关红」的处置路径存在缝隙：只增 fixture、不更新契约 `packages`/`current` 即可让探测轨变绿，而契约声明版本面保持陈旧。
- **影响**：契约与 fixtures 的版本维可静默解耦（限「手工重建 fixtures 时漏更新契约」这一现实路径）；不影响对宿主发版的检测力（主威胁面仍 fail-closed）。
- **建议**：判据补一条廉价双向断言（3 行）：`coveredHost` ≡ `Object.keys(surface.packages)`（含 `surface.current ∈ coveredHost`）；或把 smoke ① 改为同时枚举 fixtures 目录（双向）。

### F5 — P3（安全性/持续机检）：白名单与「探测命令 ↔ 探测文件名」绑定均**无机检**

- **位置**：`.github/workflows/ci.yml` L138-144（白名单注释）、L145-157（探测行）、L229-230（`probedStems` = 文件名 stem）、L233-234（对账锚点）。
- **依据**：判据只校验**文件名 stem** 是否等同契约包名；**不校验**该文件由对应的 `npm view @deepseek-ai/<pkg>` 命令生成（命令↔文件为隐式约定）。白名单（禁 `install/ci/npx/pack/解包执行/cache`）仅以注释纪律 + 「新增白名单外命令 MUST 经独立审查」（L144）表达，无 CI 守卫（对照：契约字面量纪律有 smoke 双向对账兜底）。
- **影响**：本项目最强的两条约束依赖人工审查延续；一次「改命令留文件名」或「顺手加 install」的编辑不会触发任何红色。
- **建议**：另立 P3（需新增/改测试路径，超本 commit declared 面）：`sanity` 增离线守卫——提取 `host-latest-probe` job 段并对命令白名单（`npm view … versions|dist-tags --json`、`mkdir`、`cat > $RUNNER_TEMP`、`node $RUNNER_TEMP`）做正向白名单机检，同时校验「每个 stem 恰有 1 条对应 `npm view @deepseek-ai/<stem>` 行」。

### F6 — P3（可用性/fail-closed 语义）：fail-closed 判红后的**处置指引未分类**，与真实关闭路径不符

- **位置**：`.github/workflows/ci.yml` L246、L252（口径外形态判红）、L277（「⇒ 需审阅 + 更新 fixtures」）、L295（末行统一处置文案）。
- **依据**：口径外形态（如未来上游出现 `-beta.N` / 构建元数据 / `-dev.N`）的红**无法**通过「更新 fixtures」关闭——必须扩 `parseVersion` 的受限口径（L202）与 `TRACK`（L199）表；子句①的红则需改探测行或契约。三类红（口径类 / 面类 / 版本推进类）共用同一句处置文案。
- **影响**：未知形态（本项目明确选择 fail-closed 的场景）出现时，运维者按报文行动会走错路径，延长红的存续期。
- **建议**：按失败类别给差异化处置行（口径类 → 「扩受限版本口径或人工审阅该形态」；① → 「同步探测行/契约声明面」；②③④ → 「审阅 + 以 extract.mjs 重建 fixtures」）。文案改动，零语义风险。

### F7 — P3（诊断/接口一致性）：输入异常路径的退出码与文档不符，且缺逐包 try/catch

- **位置**：`.github/workflows/ci.yml` L165（退出码声明 0/1/2）、L187-190（`die` → 2）、L241（`readJson(probeFile)` 未捕获）。
- **依据**：`npm view` 失败会留下**空文件**（shell 重定向已建文件），`JSON.parse('')` 抛 `SyntaxError` → node 未捕获异常退出 **1**，与「1 = 检测到新版本 / 覆盖失配」「2 = 用法或输入缺失」的声明不符；且单包输入损坏会使整脚本以栈回溯终止（无逐包归因），其余包的结果一并丢失（对照 COMPAT-005 R1 F8 对「逐项 try」的既有选择）。
- **影响**：fail-closed **方向正确**（不误绿），但红的原因不可归因、退出码语义漂移；若上游出现瞬时注册表错误，日报文形态与「检测到新版本」混淆。
- **建议**：把探测 JSON 解析纳入 `die(2)`（或逐包 try 记一条可归因 failure 后继续），并在报文里区分「输入/探测失败」与「检测到新版本」。

### F8 — P3（文档口径）：README 两处与实现/事实不完全一致

- **位置**：`README.md` L189、L184。
- **依据**：（①）L189「**出现新版本即 job 红**」宽于实现——判据只对「高于最新覆盖车」与「已覆盖车内推进」判红（ci.yml L269-277），**低于最新覆盖车的中间车**新版本不判红；CHANGELOG L8 的表述（「已覆盖车内上游最大 MUST ≡ 已覆盖版本，且上游 MUST NOT 出现更高车」）与实现逐字一致 ⇒ 建议 README 对齐 CHANGELOG 口径，避免用户按其字面期待「任何新版本都红」。（②）L184 矩阵行把 `0.1.0-rc.7` 的依据记为「**fixtures 快照**」，但仓内 fixtures 仅 3 份（`0.1.1-rc.2`/`0.1.2-rc.1`/`0.1.5-rc.2`，无 `0.1.0-rc.7`）；该版本的真实依据在 `docs/RESEARCH.md` L76（§3.1「0.1.0-rc.7 实测」）与 `docs/DESIGN.md` L87（矩阵「实测 0.1.0-rc.7 / 0.1.1-rc.2」）⇒ 依据栏应改写为「RESEARCH/DESIGN 实测 + `0.1.1-rc.2` fixture 代表 0.1.x 旧表面线」，或补一份 fixture。
- **影响**：①会让用户/后续维护者误判探测覆盖面；②属证据链归类偏差（非编造——证据真实存在，仅位置写错），但矩阵是兼容承诺的对外口径，应精确。
- **建议**：两处文字订正（1 行级），可随本任务收口或另立文档任务。

### F9 — P3（文档陈旧，pre-existing）：README 验证管线的 smoke 断言计数已过期，且正落在本次修改的区块内

- **位置**：`README.md` L168（「`node test/smoke.mjs` … **179 项断言**」）——本次改动在同一代码块内插入探测轨命令（L169-170）。
- **依据**：CHANGELOG 记载 smoke 已至 **276 项**（L44「271 → 276」；L34 等同源），README 仍写 179 ⇒ 至少 4 个任务周期未同步。
- **影响**：对外验证文档的断言规模失真（不影响功能）；因本 commit 恰好编辑该区块，顺手对齐成本最低。
- **建议**：按当前实测计数更新（并将「随 smoke 计数变更同步」纳入文档纪律）；**本项非本 commit 引入，不构成对本任务的扣分项**。

---

## 5. 硬门槛裁决

| 门槛项 | 阈值 | 实测 | 裁决 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0** | ✅ |
| 5 维度全覆盖 | = 100% | 正确性/安全性/可维护性/性能/测试覆盖 逐项有结论（§2） | ✅ |
| 每条发现标注级别 | = 100% | F1~F9 全部带 P0~P3 标签 | ✅ |
| 设计一致性检查 | 已完成 | 判据 ≡ 契约 `hostSurface`（§1.3）、README 矩阵 ≡ DEC-026/契约 6.1·6.3（§1.7）、白名单 ≡ 本 job 实状（§1.1）；**无偏离** | ✅ |
| AI 代码专项 5 项 | 全部完成 | §3（mock/硬编码/幻觉/TODO/过度实现） | ✅ |
| 重点核验项：白名单 | 逐行通过 | §1.1：新 job 零 install/零宿主执行/零 cache；命中仅在注释 | ✅ |
| 重点核验项：不进 PR 门禁 | 实现与陈述一致 | §1.2：`if` 限定 + `permissions: contents: read`；副作用面另记 F1（P2） | ✅ |

**发现分布**：P0 = 0 ／ P1 = 0 ／ P2 = 2（F1、F2）／ P3 = 7（F3~F9）。

---

## 6. 终态与要求

### 终态：**APPROVED_WITH_NOTES（unresolved_blockers = 0）**

- P0 阻塞 = 0；硬门槛全通过；白名单与「不进 PR 门禁」两项重点核验**均通过**；P-01 订正必要性成立且留档诚实；四子句与契约/fixtures 真值一致、无假绿路径；CLI 代理口径判定为**可接受**。
- **unresolved_blockers = 0** 的口径：P2 两项为**警告级建议**（F1 行为面/披露 + F2 机检覆盖），均**不构成本任务的合并阻塞**（角色口径：NEEDS_CHANGE 仅当 P0 > 0 或硬门槛未通过）；但 **F1 含安全姿态与文档披露成分，建议 Coordinator 明确决策后再宣告任务完成**（收敛 or 披露二选一，二者工作量均小）。
- **合并前建议（非强制）**：F1 决策留痕（收敛/披露）；F8①② 文字订正（1 行级，可与 F1 一并收口）；F3~F7、F9 建议登记为后续 P3 任务（其中 F3 已含「另立任务」结论、F2 为推荐入场项）。

### 本轮**未独立复核**项（如实登记，P-01）

1. registry 侧实测数值（`dsh-settings latest=0.0.1-rc.1`、`dsh-home-paths latest=0.0.1-rc.3`、CLI dist-tags）——离线不可复核，采信 Developer 上报（判据不依赖之，§1.4-4）。
2. heredoc 提取物 sha256 `43B0FD2B…` 与「验证产物 ≡ 交付产物」——**未复核哈希**（角色约束：不执行命令）；**已独立复核的行号算术**：L162→L296 = **135 行**，与声明一致 ✅。
3. smoke 276/0、validate-preset 29/29、`yaml.safe_load` 通过——采信 Coordinator 独立复跑结论（本轮未复跑）。
4. 性能数字（§2.4）为**结构推断**，非测量值。

### 非阻断备注（供 Coordinator 处置，不改变终态）

- N1：本 job 判据运行时 `import lib/host-contract.mjs`（L193）意味着**契约语法错误 = 探测轨红**（fail-closed）；契约的纯数据守卫在 smoke 侧，属可接受的双层关系。
- N2：`okLines` 的「✅」行抑制条件（L239/L279）会把**面级**失败（子句①）传播为「所有包都不打印 ✅」，属展示层保守化，非缺陷。
- N3：判据对上游客包**新增包**（契约未声明的新子包）零信号——设计边界（契约 = 探测目标集单一事实源），建议在 README 探测轨节一句披露（并入 F8 语境）。
- N4：R1 无前轮 → 「已修复/未修复/新引入」三态比对**不适用**；若本轮判定为 NEEDS_CHANGE 而进入 R2，将逐条比对 F1~F9。
