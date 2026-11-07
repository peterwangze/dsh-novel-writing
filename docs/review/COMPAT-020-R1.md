# COMPAT-020 独立复审报告 R1

- **审查对象**：COMPAT-020 —— 0.2.2-rc.1 预设兼容热修 + 代际差异看护
- **基线**：`81a2e11`；工作树 diff 中 **8 个产品/文档文件**（`.governance/*` 另有改动，按任务边界不在本次审查范围）
- **审查方式**：只读。复跑 `validate-preset` / `preset-schema-face` / `smoke` / `verify-contract-anchors` / `node --check`，读取现有证据 JSON 与日志；未修改被审文件、未 commit、未写 `.governance`、未启动或停止任何服务/探针，未触碰 3080 端口
- **唯一产出**：本文件

## 结论

**NEEDS_CHANGE**

- **P0 = 0，P1 = 0，P2 = 4**。
- 修复本身正确：`cordis.patch.yml` 已无 legacy 行，`agent.cordis.yml` 恰 1 行，主包 replacement 行在场；smoke 334/0、`validate-preset` PASS、`preset-schema-face` PASS（`dropped=1, findings=0`）。没有发现会重新导致预设加载失败的功能性缺陷。
- 但验收项 **e（契约 5.2/5.7/revisions 准确）** 与 **f（README 不夸大）** 未完全满足：契约 revisions 计数失实、5.2 行范围仍漏掉 `dsh-tool-web`，README 把仅验证到预设加载面的 0.2.2 标为“完整支持”，并与 0.2.0 的 `list_agents` 限制自相矛盾。`validate-preset` 还有一处降级路径声明与代码不符。上述均为 P2 记录/校验面问题，不改变“核心修复方向正确”的判断，但按本轮验收口径不能判 PASS。

## Findings

| ID | 严重度 | 位置 | 问题 | 证据 | 建议修复 |
|---|---|---|---|---|---|
| F1 | P2 | `lib/host-contract.mjs:94` | COMPAT-020 revision 的 `scope` 末句写“revisions 12→13”，与实际数组长度不符 | `git show HEAD:lib/host-contract.mjs` 中 revision 条目 **20** 条；当前工作树 **21** 条；`hostContract.revisions.length === 21`。本条本身是新增 revision，正确跨度是 **20→21** | 改为 `revisions 20→21`；或删除易漂移的硬编码计数，只保留 revision 数组 |
| F2 | P2 | `README.md:195-196`（关联 `README.md:202`、`README.md:193-200`） | 宿主矩阵把 0.2.2 与 0.2.0 都标为 `✅ 完整支持`，证据强度不足且与限制段冲突；0.2.1 有实测却未入矩阵 | `docs/evidence/COMPAT-020/README.md:26-36` 与两份 `diag-preset-*.json` 只证明 `agentPresets.list()` 返回 5 个预设、`novel-writing` 无 `broken`、`ok:true`，即**预设加载面**；0.2.0 本轮未重新 boot（依赖 BUG-011 旧证据）；`README.md:196` 自身括注与 `README.md:202` 明说 0.2.0/0.2.1 独立 `list_agents` 不可用；矩阵没有 0.2.1 行 | 0.2.2 改为“✅ 预设加载面已实测（完整支持范围见验证管线）”或补全链路证据；0.2.0 改 `⚠️ 部分支持`/明确例外；把 0.2.1-rc.2 补入矩阵（可与 0.2.0 合并说明）并引用同一探针 |
| F3 | P2 | `lib/host-contract.mjs:184` | 5.2 的 `line: 'L16-220'` 不覆盖 symbol 中列出的 `dsh-tool-web` | `agent-presets/novel-writing/agent.cordis.yml:222-226` 是 `dsh-tool-web` 行；5.2 symbol 明确包含 `dsh-tool-web`。HEAD 的 `L16-216` 也同样漏掉旧版 `dsh-tool-web`（L218-222），属既有偏差，但本任务正在重基 5.2，验收 e 要求准确 | 将 `line` 改为 `L16-226`；或把 symbol 收窄到 `L16-220` 实际覆盖的行。推荐前者，保持 symbol 完整 |
| F4 | P2 | `test/validate-preset.mjs:160,191-193`；`CHANGELOG.md:42` | 注释/变更日志称“0.1.x / 降级平面不跳过，保留原始解析/fail 路径”，但**无 profile 的 degraded 分支**先对所有 `@deepseek-ai/*` 行 `resolution skipped` 并 `continue`，新增 skip 块不可达 | `test/validate-preset.mjs:185-187` 在 `profileAvailable === false` 时直接 `ok(... [resolution skipped: no profile]); continue`；`GENERATION_DROPPED` 的 `declarationPlane !== null` skip 在 `:194`，此前已被绕过。实际 degraded 运行虽以 exit 1 结束，但停在前置 YAML `unknown tag !<tag:yaml.org,2002:js> (58:46)`，不是被宣称的模块解析失败路径；因此该保证在当前代码中不成立 | 要么把“0.1.x / 声明面不可判定”限定为“有 profile 时”，并明确 no-profile degraded 为预存在跳过；要么把 legacy 行判定移到 no-profile 分支之前，用全局闭包通道检查并在缺失时 `fail`，再补 no-profile 回归用例 |
| — | — | — | **无 P0/P1** | 核心故障链已闭合；上述问题不会导致 0.2.2 预设再次加载失败 | — |

## 验收项逐条

| 验收项 | 结果 | 依据 |
|---|---|---|
| a. 0.2.x patch 0 条 legacy 行；0.1.x yml 恰 1 条；注释准确；无意外改动 | **PASS** | `cordis.patch.yml:160-165`：主包行保留、3 行注释；yml `:156-164`：主包行 + 恰 1 条 legacy 行 + 4 行注释。`git diff` 仅 8 个产品/文档文件，运行时逻辑未改。 |
| b. `GENERATION_DROPPED` 仅披露，仅在 `legacy-on-current` 跳过，不进入 `checked`/`variants`；4 条硬不变量真实并产出 `DUAL_SOURCE_DRIFT` | **PASS** | `preset-schema-face.mjs:338-342` 仅在 `tolerance === 'legacy-on-current'` 且名字匹配时 `entry.dropped += 1` 后 `continue`，不触碰 `checked`/`variants`；4 条不变量在 `:506-512`，均由 `:493` 的 `drift(...)` 产出 `DUAL_SOURCE_DRIFT`，并在 `:527-529` 参与 FAIL。动态结果 `dropped=1, findings=0, verdict=PASS`。注释 `:337` 的“不计入 unverified”措辞不准，见残余风险。 |
| c. `validate-preset` 仅在声明代平面在场时跳过；0.1.x/降级仍 loud fail；静态检查有意义 | **PARTIAL（F4）** | 有 profile 时：`declarationPlane` 由 `:161` 计算，`:194` 条件正确；0.1.x（null）走 `:198-208` 原始解析；0.2.x 但声明包缺失时 `packageOnPlane` 为空，最终 `MODULE_NOT_FOUND`，不会静默。静态三检 `:227`（patch 原文无 legacy）、`:229-230`（yml 恰 1）、`:233-236`（config 空）实跑通过。**但 no-profile degraded 路径与注释声明不符（F4）**。 |
| d. smoke B2 等价、负控 ④、接线断言非空；334/0；README 计数最后 | **PASS** | `smoke.mjs:4232` patch 0、`:4233` yml 1、`:4234-4237` config 空、`:4239` 主包行、`:4240-4248` 剔除 legacy 后逐行等价且恰 1 个 variant；负控 ④ `:4294-4300` 把 legacy 行塞回 patch 后 `neg4.length > 0`；接线 `:4304-4334` 使用块级提取，`:4321`/`:4329` 自证“walk 分支不会误命中”，`:4333` 检查原文方向；末条 `:4339-4342` 校验 README 334。实跑 `SMOKE DONE: 334 passed, 0 failed`。 |
| e. 契约 `items[]=52`、纯数据、无 schema/kind 变更；5.2/5.7/revisions 准确 | **FAIL（F1/F3）** | `items[] = 52`、faces 分布与 kind 枚举未变，只有 5 行数据修改；5.7 `L28-35` 与 yml L28-35 对齐，准确。但 `:94` 的 revision 计数错（F1），5.2 的 `L16-220` 漏 `dsh-tool-web`（F3）。 |
| f. README/CHANGELOG 有证据支撑，不夸大 | **FAIL（F2）** | CHANGELOG 的修复/验证/限制描述总体与实跑一致（`revisions` 计数问题只在契约）；README 的 0.2.2/0.2.0 “完整支持”超出证据，且与 `:202` 的限制冲突；0.2.1 实测未入矩阵。 |

## 对抗性检查（实际执行/实际推导）

### A. 从 `UNVERIFIED_KINDS` 移除 `'GENERATION_DROPPED'`，smoke 会不会红？

**会红；精确路径在 smoke 的接线断言，而不是 `preset-schema-face` 的 verdict。**

- `preset-schema-face.mjs:58` 的 `UNVERIFIED_KINDS` 只影响 `:516` 的 `unverified` 过滤，不决定是否 PASS；`:515` 的 `findings` 只筛 `FINDING_KINDS`。
- 删除该枚举项后，`walk` 仍在 `:338-342` 把行标为 `GENERATION_DROPPED`、`entry.dropped += 1` 后 `continue`；该 kind 不在 `FINDING_KINDS`，所以 `findings` 仍为 0，`checked`/`variants` 不变；`unverified` 由 22 降到 21，`coverage` 仍为 `dropped=1`，schema-face 仍 `PASS`。
- `validate-preset` 不读取该枚举，仍 `PASS`。
- `smoke.mjs:4328` 的 `unverifiedKinds11.includes("'GENERATION_DROPPED'")` 变为 false，`:4322` 的那条 check 失败，smoke 红。`:4321`/`:4329` 的 `strayKinds11 === ''` 自证只能防止“walk 分支被全文误命中”，不能替代数组块断言。
- 结论：该变异**只有 smoke 的源码块级断言能抓住**；schema-face 与 validate-preset 都不会红。这是可接受的接线看护，但属于“单点源码字面量”而非行为级判据（见残余风险）。

### B. 把 legacy 行重新加回 patch，哪些检查会响？彼此独立吗？

**三条独立机制都会响：**

1. `test/validate-preset.mjs:227`：`patchText.includes(droppedName)` 为 true，直接 `fail`，最终 exit 1。它不依赖 yml 的 `checkRows`，是原文扫描。
2. `preset-schema-face.mjs:507`：`patchDropped.length !== 0` 触发 `drift(...)`，产生 `DUAL_SOURCE_DRIFT`；`:527-529` 将 verdict 置 `FAIL`。
3. `test/smoke.mjs:4232`：`aDropped.length !== 0` 进入 `problems`，B2 红；`:4294-4300` 的负控 ④ 正是用同一形态证明 `dualProblems11` 判别力，实跑 `neg4.length > 0`。

三条机制的数据源/比较代码相互独立：validate-preset 是原文 `includes`；schema-face 是独立 YAML 抽取 + 4 条 dual 不变量；smoke 是自己的 `flatRows11`/`DROPPED_LEGACY_11`/`dualProblems11`。`preset-schema-face` 和 smoke 都解析 YAML，但断言代码不共享，因此不是同一断言重复计数。另需注意：当前 patch 注释刻意不写完整 legacy 子路径字面量，避免 `includes` 被注释误命中；这也说明检查是 fail-closed 的原文守卫（见残余风险）。

### C. 0.2.0 / 0.2.1 的“preset 可加载但独立 list_agents 不可用”证据与措辞

- **0.2.1**：`diag-preset-0.2.1-rc.2.json` 的 `ok:true`、5 个预设、`novel-writing` 含 `name`/`description`/`order`、无 `broken`，直接支持“预设可加载”。`list_agents` 不可用这一半来自主包未注册 `list_agents` 的包面检查/既有 BUG-011 结论，**不是这次 `agentPresets.list()` 探针直接测到的**；README 的限制段把它与探针结果写在一起，容易被读成同一探针结论。
- **0.2.0**：本轮没有重新 boot 0.2.0；现有依据是 BUG-011 的隔离实例全链路证据。把它写成“完整支持”超出了本轮可复核范围，且与 `README.md:202` 的独立工具限制直接冲突。
- **0.2.2**：探针同样只证明 `agentPresets.list()` 正常、无 `broken`；`list_agents` 由主包注册是包面结论。`✅ 完整支持` 的证据面大于探针面（F2）。

### D. 原文 `.includes(droppedName)` 的误报风险

- `validate-preset.mjs:227` 与 `smoke.mjs:4308/4333` 都是原文/字面量检查。**当前** patch 注释（`:163-165`）没有完整 legacy 子路径字面量，所以没有误报；但未来若有人在注释/说明中引用完整子路径，即使没有声明行，`validate-preset` 和 smoke 也会红。这是 fail-closed 的虚假红，不是漏报，但会制造维护噪音。
- 更稳的做法是：validate-preset 对 patch 做 YAML 抽取后按 `row.name` 判断；smoke 已有 `flatRows11`，可直接用行对象而不是原文（同时保留一条原文方向断言作为双保险）。

### E. 声明代平面检测：`@deepseek-ai/dsh-agent-preset` 缺失时

- **有 profile、0.2.x、声明包缺失**：`declarationPlane === null`，`:194` 的 skip 不触发；`:198` 的 `packageOnPlane(legacy)` 为空；`:203` 的 `generationCounterpart` 对 legacy 名返回 null；`:208` 走 `MODULE_NOT_FOUND` 失败。**安全，不会静默跳过。**
- **无 profile 的 degraded**：`:185-187` 先跳过所有 `@deepseek-ai/*`，与 F4 是同一问题。
- **反向理论风险**：检测依据是“声明包是否在场”，不是宿主代际。若一个 0.1.x profile 意外安装了 `@deepseek-ai/dsh-agent-preset`，`declarationPlane` 会非空，legacy 行会被跳过；当前正常布局未观察到该组合，列为残余风险。

### F. README 0.2.2 “✅ 完整支持”

见 F2。`docs/evidence/COMPAT-020/README.md:31-36` 的探针证据只能支撑“预设可加载、无 broken”；不能单独支撑“完整支持”。应降级措辞或补齐全链路证据。

## 实际复跑读数

| 命令 | 读数 |
|---|---|
| `node test/validate-preset.mjs` | `PRESET VALIDATION PASSED（schema-face: PASS）`；静态三检均通过；skills 29/29 |
| `node test/fixtures/host-surfaces/preset-schema-face.mjs --json` | verdict `PASS`；coverage `{total:59, enabled:47, checked:37, dropped:1, findings:0, unverified:22}` |
| `node test/smoke.mjs` | `SMOKE DONE: 334 passed, 0 failed`；B2、负控 ④、接线断言、README 计数末检均通过 |
| `node scripts/verify-contract-anchors.mjs` | 79 segments，`FAIL=0`，`WARN=24`；5.2 报 `L16-220`，5.7 报 `L28-35` |
| `node --check`（4 个 JS/MJS 文件） | 全部 exit 0 |
| `git show HEAD:lib/host-contract.mjs` / 当前计数 | revisions 条目 HEAD **20**、当前 **21**；`items[] = 52` |
| `git diff --name-only` | 8 个产品/文档文件 + 6 个 `.governance/*`（后者不在本次范围） |
| 现有 0.2.1/0.2.2 证据 | 两份 JSON 均 `ok:true`、5 预设、`novel-writing` 无 `broken`；时间与 `docs/evidence/COMPAT-020/README.md` 一致 |

## 残余风险与限制

- **P3 — `preset-schema-face.mjs:337` 注释与 `:516` 实现不一致**：注释说 dropped 不计入 `unverified`，但 `UNVERIFIED_KINDS` 含 `GENERATION_DROPPED`，实际会计入；coverage 的 `checked 37 + unverified 22 + dropped 1 = 60`，而 `total 59`，存在 dropped 重复计数。它不影响 `findings`/verdict（dropped 不是 finding），但披露口径应改为“不计入 checked / variants，但计入 unverified 披露计数”，或从 `unverified` 过滤中排除。
- **P3 — 原文守卫的脆弱性**：`validate-preset.mjs:227` 与 `smoke.mjs:4308/4333` 的 `.includes` 在注释引用完整子路径时会虚假红；当前注释已规避，但未来改动容易踩到。
- **P3 — `smoke.mjs:4236` 的 `config: null` 判定**：smoke 把 `null` 视为非空并报错；`validate-preset.mjs:234` 和 `preset-schema-face.mjs:511` 都把 `null` 视为空。当前 legacy 行没有 `config`，无实际影响；三处口径应统一。
- **P3 — 0.2.1 矩阵缺行**：已有 0.2.1-rc.2 探针证据，但矩阵未列；已在 F2 一并建议补入。
- **P3 — 代际检测依据是能力（声明包在场），不是宿主版本**：正常的 0.1.x/0.2.x 布局下结论正确；混合 profile 的理论误判见 E，未观察到，但值得在契约/测试注释中说明。
- **P3 — 5.2 行范围是既有偏差**：HEAD 的 `L16-216` 也未覆盖当时的 `dsh-tool-web` L218-222；不是 COMPAT-020 引入，但本次重基未修正，按验收 e 仍应在本轮收口。
- **审查方法限制**：对抗性检查 A/B 采用代码路径/内存分析 + 既有负控，**没有**为变异复制临时仓库做完整 smoke 红态复跑；0.2.0 未重新 boot，0.2.1/0.2.2 探针为既有证据读取，未新起服务。`verify-contract-anchors` 的 24 条 WARN 是既有告警面，未逐条证明与本任务无关；5.2 的 `L16-220` 也不代表行范围本身通过。
- `.governance/*` 的改动（decision/evidence/plan-tracker/execution packet 等）按任务边界**未审查、未修改**；本报告只评价 8 个产品/文档文件。

## 审查结论

**NEEDS_CHANGE**：修复方向与核心行为正确，测试证据足以证明“0.2.2 预设不再因 legacy 子路径行整棵加载失败”；但 F1/F3 使契约数据不准确，F2 使 README 的用户可见支持声明超出证据并与限制段冲突，F4 使 `validate-preset` 的降级保证声明不成立。建议按 F1→F3→F2→F4 收口后重跑 `validate-preset` + `smoke` + `verify-contract-anchors`，即可进入 PASS 复核。
