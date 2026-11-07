# COMPAT-021 R1 复审报告（插件兼容性设计系统优化）

- 任务：COMPAT-021「插件兼容性设计系统优化」——代际清单 / 行投影 / 行级预检 CLI / 离线 fixtures / C3 平面误判修复（设计基线 `docs/COMPATIBILITY.md` @ c5442e1）
- 复审人：Reviewer（R1 全量复审，独立于 Developer）
- 复审时间：2026-11-07 13:16–13:27（Asia/Shanghai）
- 工作树基线：HEAD `6eaffb8`，未提交（新增 `lib/host-compat/`、`scripts/preflight-preset-rows.mjs`、`test/fixtures/host-generations/`、`test/preflight-preset-rows.test.mjs`；修改 `preset-schema-face.mjs` / `lib/host-contract.mjs` / `test/smoke.mjs` / `README.md` / `CHANGELOG.md` / `docs/COMPATIBILITY.md`）
- 复审方式：全量源读 + 门禁真跑 + 仓外构造性取证（混合平面端到端、fixture 变异判别力、迁移字节等值）。**未改任何产品代码 / 未写 .governance/ / 未 commit / 未起服务。**

---

## 结论

# APPROVED_WITH_NOTES

**P0 = 0 · P1 = 0 · P2 = 1 · P3 = 7**

- 八项门禁全绿（读数见 §2）；C3 修复经**仓外构造的真实混合平面**端到端实证（不仅判据单元面）；单一事实源迁移与 COMPAT-020 逐字节等值（程序化比对）；fixtures 数据面与 §2.1 事实基线逐项一致；NOT_RUN ≠ PASS 纪律在 CLI/测试/JSON 三面成立；无安全问题。
- 唯一 P2 = 上述 C3 端到端路径**在仓内测试无回归守卫**（判据核心有单测、代码路径经本复审实证正确，但删除 conflict 分支不会让现有 10 项断言变红）。属测试覆盖缺口而非产品缺陷。
- **建议进入提交**（F1 为 test-only 增补，可随本任务并入或作为紧随 fast-follow，由 Coordinator 裁量；不阻断）。

---

## 1. 逐项复审判定（含命令读数）

### 1.1 设计符合性（§5/§6/§7/§8/§12 对照）——通过

**五代际清单数据正确性**（`lib/host-compat/generation-manifest.mjs:112-197`，对照 §2.1 事实基线逐项核）：

| 代际 | manifest 判据 | fixture exports 实测 | 判定 |
|---|---|---|---|
| legacy-0.1 | `[0.1.0,0.2.0) × hasAgentPreset=false`（L116-120） | fixture 无 `dsh-agent-preset` 目录；subagent-control exports 含 `.`/`./list-agents` | ✓ |
| decl-0.2.0 | `[0.2.0,0.2.1) × true`，note「exports 仍含 ./list-agents，主包未注册」（L134-139） | fixture exports 含 `./list-agents`（+ `./src/*`/`./package.json`/`./locale/*.json`/`./list-agents/locale/*.json`） | ✓ |
| decl-0.2.1 | `[0.2.1,0.2.2) × true`，同上（L152-158） | 同 decl-0.2.0 形态 | ✓ |
| decl-0.2.2 | `[0.2.2,0.3.0) × true`，note「exports 仅 . / ./src/* / ./package.json / ./locale/*.json；主包 registerListAgents」（L170-177） | fixture exports 恰 4 键、无 `./list-agents` | ✓ |
| unknown | 区间外 / 不可解析 / 判据双轴矛盾（L189-196） | fixture dsh@0.3.0 ⇒ unknown | ✓ |

`detectGeneration` 双轴矛盾面（0.1.x+声明代在场 / 0.2.x+缺席 / ≥0.3.0 / 不可解析串）恒 unknown，由测试 ④ 单元面钉死（实跑绿）。

**projectRows unknown fail-closed**（`preset-projection.mjs:106-112`）：unknown / 未登记 id → `{error:'unknown-generation'}`，不返回行数组；`dispositionFor` unknown → `{action:'fail-closed'}`（L42-44）。测试 ④ 断言实跑绿。

**CLI 选项/退出码/检查顺序/JSON 字段**（`scripts/preflight-preset-rows.mjs`）：
- 选项面：`--patch/--legacy/--profile/--generation/--fixture/--json/--explain/--strict/--no-color`（parseArgs L69-103）——§7.1 表全部落地，`--help` 额外提供。
- 退出码：`EXIT={OK:0,FAIL:1,USAGE:2,ENV:3}`（L59）；用法错误 die→2（实测 `--bogus`→2、非法 `--generation nope`→2）；环境不可判定→3（实测空 `$DSH_HOME`+`NV_COMPAT_PLANE=profile`→3 + `verdict=NOT_RUN` + `ENV_UNDECIDABLE`）；unknown 代际→1（fixture 实测 exit 1，全行 NOT_RUN）。
- 检查顺序：形状（L599-634）→ 代际处置（L654-677）→ 包存在性（L679-686）→ exports 解析（L688-708，读 package.json exports 映射 `matchExports`，非 require.resolve 碰巧成功）→ config schema（L710-748）→ dual 对账（L501，行枚举后）。与任务口径顺序一致；§7.2 第 6 步「inject/服务」未实现——见 F3（当前预设行无 inject 字段，检查面为空）。
- JSON 字段（L526-555）：`schemaVersion:1 / ok / generation / detectedGeneration / confidence / hostVersion / overridden / plane{channel,profile,via,secondary} / mixedPlane / sources / rows / summary / dual / errors`——§5.2/§7.3 计划字段全在，附加字段为增量、schemaVersion 锚定。
- `--explain`：实跑 `--explain tool-subagent-list-agents` exit 0，五代处置（keep/drop×3/fail-closed）+ listAgents 供给面 + 源在场性，与 §4 目标 4.2 一致。

**§12.1 验收四目标**：减依赖（新宿主字面量登记核过，见 §3.②）；解耦（items 52 不变 + revisions 22 + manifest 单源）；严格校验（4 代际 fixture exit 0 / unknown exit 1 / negative exit 1 必红 / 真实面 PASS）；可调测（--json/--explain/NV_COMPAT_PLANE/NV_COMPAT_FAKE_GENERATION 标 injected；无密钥）。全部满足。

### 1.2 C3 修复正确性（本轮核心）——通过（覆盖裁量见 F1）

- **平面绑定 profile**：`detectPlane`（L208-221）先试 `<profile>/node_modules/@deepseek-ai/dsh/package.json` 精确路径（channel=profile-resolve, via=profile-exact-node_modules），不可达再 profile 锚点上溯（via=profile-anchor-walkup）——与宿主 loader baseUrl=profile 同语义。本机实测真跑命中 `profile-resolve/profile-anchor-walkup`（web profile 经 pnpm junction 落 npm-global 0.2.1-rc.2）。
- **全局闭包仅 fallback 且标注通道**：profile 平面不可达才落 `npm root -g`（L222-229，channel=install-anchor）；主通道命中后全局闭包只作**对照探测**（L232-247，进 `plane.secondary`，不参与 generation 判定）。
- **mixedPlane + legacy-only fail-closed**：`mixedPlane`（L455）= 两平面代际均已知且不同；`droppedDispositionConflicts`（L457-458）= 两代对 legacy-only 行处置相反；`checkRow`（L662-666）在「该行将被跳过（非 keep）」方向上判 `MIXED_PLANE_FAIL_CLOSED` ⇒ FAIL，不静默跳过；反向（detected=legacy ⇒ keep）走完整检查，天然无跳过风险——**恰覆盖危险方向**。
- **仓外端到端实证（本复审构造，%TEMP% 临时件，已清理）**：临时 profile（dsh@0.2.2-rc.1 + 嵌套 dsh-agent-preset ⇒ decl-0.2.2）+ PATH 前置伪 `npm.cmd`（`npm root -g` → 伪根 dsh@0.1.5-rc.2 无 agent-preset ⇒ legacy-0.1）：
  - `--json`：**exit 1**；`generation=decl-0.2.2`；`plane.secondary={install-anchor, 0.1.5-rc.2, legacy-0.1}`；`mixedPlane=true`；`mixedPlaneDetail.droppedDispositionConflicts=true`；legacy 源 `tool-subagent-list-agents` 行 **status=FAIL（MIXED_PLANE_FAIL_CLOSED）**（非 KNOWN_DROP）；`--strict` 再增 `STRICT_MIXED_PLANE`。
  - 即 C3 声称的行为「两平面代际不一致 ⇒ legacy-only 行 fail-closed」在真实 CLI 链路（探测→判定→行检查）上成立，**强于 Developer 披露的仅判据单元面覆盖**。
- 披露裁量：Developer 披露「本机两平面同代（均 0.2.1-rc.2）无端到端混合平面用例」属实；仓内覆盖 = 判据核心单测（legacy keep ≠ decl drop）+ projectRows unknown 不投影 + NV_COMPAT_PLANE exit 3 复现。**判定：代码正确（已实证）但仓内回归守卫不足**——删除 L662-666 conflict 分支或 L455 mixedPlane 计算回归时，现有 10 项断言仍全绿，而那正是 RISK-C3 要关的失效模式（§14.4「必须修复**或以测试证明不会发生**」的后者不满足）。定级 **P2（F1）**，修复成本低（本复审的 10 行构造可直接入仓）。

### 1.3 单一事实源迁移——通过

- **字节等值**：程序化比对 `git show HEAD`（COMPAT-020 后）schema-face 常量 vs manifest 现值——`GENERATION_VARIANT`、`GENERATION_DROPPED` JSON 深比较**均 true**（逐字节同值）；manifest 侧加深冻结（`Object.isFrozen=true`，.mjs 严格模式下篡改即抛，属加固非值变化）。
- **导出面/行为零变化**：`preset-schema-face.mjs:47-48` 导入、`:91`/`:103` re-export（`export const GENERATION_VARIANT = GENERATION_VARIANT_SOURCE`）；smoke 源码字面量断言 `includes('export const GENERATION_VARIANT')`（smoke.mjs:4330/4333）仍真——smoke 334/0 实跑绿；`validate-preset` PASS（59 行/47 启用/37 checked/1 dropped/0 findings/22 unverified，与基线口径一致）。
- **smoke 断言数 334 不变**：实跑 `SMOKE DONE: 334 passed, 0 failed`。
- **DECLARATION_PACKAGE/PATCH_COMPOSITION 字面量重复裁量**：manifest `HOST_PACKAGES.declaration`（generation-manifest.mjs:53）与 schema-face `DECLARATION_PACKAGE`（preset-schema-face.mjs:89）同串、`PATCH_COMPOSITION` 为路径常量 schema-face 独有——两侧均有互指注释披露。判定：**可接受**。理由：① schema-face 的这两个常量消费方（validate-preset/smoke 断言）是测试面，保持其自包含性避免测试模块反向依赖产品层新面；② 值域（宿主包名）极稳定；③ 真正的风险（双源漂移）由 smoke B2 接线断言 + F6 建议的对账断言收口（见 findings）。

### 1.4 NOT_RUN ≠ PASS 纪律——通过

- unknown 代际：两源全部行 `NOT_RUN`（含 dual `NOT_RUN`）+ exit 1；测试断言 unknown fixture **PASS 行计数 = 0**（test.mjs:67-70），实跑绿。
- fixture 平面行：schema 检查不可运行 ⇒ 行 `schemaStatus=NOT_RUN` 且 message 显式「（schema=NOT_RUN）fixture 元数据平面无真实模块——schema 检查未运行（NOT_RUN ≠ PASS）」；行级 `status=PASS` 语义 = 「全部**已执行**检查通过」，且 `summary.notRun` 独立计数（真跑 6 NOT_RUN = 6 条 disabled 平台分行，与 validate-preset DISABLED_INHERITED 面逐行吻合）——**未把 NOT_RUN 计入 pass**（53+1+1+6=61 ✓）。
- 无 schema 模块：`NO_SCHEMA` +「不对加载器随后如何处理它作任何断言」；cordis 不可达：`NOT_RUN` + 明示。三类均不伪装 PASS。
- 边缘观察（不计 finding，随 F4 提及）：行 `checks[]` 在 schema NOT_RUN 时仍含 `'config'` 键（L748 无条件 push）——状态由 `schemaStatus` 分字段承载，JSON 消费方需同时看两字段；建议后续把 NOT_RUN 的检查名标注出来。

### 1.5 安全——通过

- 输出面（真跑 JSON/文本、fixture expected、报文）仅含路径/包名/版本/检查点，无 token/密钥/认证头；用户路径（`C:\Users\...`）按 §8.1 属允许披露。
- fixture 41 文件全为伪元数据（`x-nv-fixture-note` 标注，package.json 无模块文件），**无真实宿主代码**。
- `evaluateJsExpr`（L382-385）以 `new Function` 求值 `!!js` 表达式：输入仅为仓库自控组合文件（与宿主 loader 同信任域，loader 激活期本就求值这些表达式），头注释明示；非新增攻击面。

### 1.6 测试有效性——通过（覆盖缺口见 F1/F2）

- 10 组断言构成：六 fixture 期望全对账（6）+ 真实面真跑（1）+ exit 3 注入复现（1）+ 用法/覆盖语义（1）+ C3 判据核心（1）= 10，实跑 `PREFLIGHT TEST PASSED (10)`。
- **expected.json ↔ CLI 实际输出对账**：测试逐 fixture 比对 exit/generation/ok/逐行 status/mustContain，六绿；本复审另抽 negative 详查（summary fail=2、errors=[DECLARED_DROPPED_ROW, ERR_PACKAGE_PATH_NOT_EXPORTED, DUAL_SOURCE_DRIFT×2]）与期望逐项吻合。
- **负向必红**：negative fixture exit 1 + `ERR_PACKAGE_PATH_NOT_EXPORTED` ✓；unknown 全行 NOT_RUN + 0 PASS ✓。
- **非恒真（变异实测，%TEMP% 临时件）**：复制 decl-0.2.2 fixture 删 `workflow-ptc` 行 ⇒ exit 1 + 2×`DUAL_SOURCE_DRIFT`（「patch MUST 恰 1 行 ptc（实测 0）」）——`reconcileDualSources` 判别力在 shipped negative 之外独立成立。
- 断言为严格相等（exit === / status === / generation ===），无恒真形态。

### 1.7 门禁复跑（真跑取证）——全绿

| # | 命令 | 期望 | 实测读数 |
|---|---|---|---|
| 1 | `node --check` × 7（manifest / projection / preflight / test / schema-face / host-contract / smoke） | 0 错 | 全部 exit 0 |
| 2 | `node test/preflight-preset-rows.test.mjs` | PASSED (10) | `PREFLIGHT TEST PASSED (10)`，exit 0 |
| 3 | `node scripts/preflight-preset-rows.mjs --json` | exit 0 / decl-0.2.1 / mixedPlane=false / 61 行 0 FAIL | exit 0；ok=true；generation=decl-0.2.1（detected 同）；confidence=profile；hostVersion=0.2.1-rc.2；plane=profile-resolve/profile-anchor-walkup；secondary=install-anchor@0.2.1-rc.2→decl-0.2.1；**mixedPlane=false**；summary `{total:61, pass:53, knownDrop:1, knownVariant:1, warn:0, fail:0, notRun:6}`；dual=PASS/0 |
| 4 | `--fixture test/fixtures/host-generations/negative-missing-export --json` | exit 1 + ERR_PACKAGE_PATH_NOT_EXPORTED | exit 1；errors 含 `DECLARED_DROPPED_ROW`+`ERR_PACKAGE_PATH_NOT_EXPORTED`+`DUAL_SOURCE_DRIFT`×2；dropped 行 checks=[shape,generation,package] FAIL |
| 5 | `node test/validate-preset.mjs` | PASS | `PRESET VALIDATION PASSED（schema-face: PASS）`，exit 0 |
| 6 | `node test/smoke.mjs` | 334/0 | `SMOKE DONE: 334 passed, 0 failed`，exit 0（BUG-007 三态自洽项按 HEAD 既有现象本环境判 FAIL 并正确不渲染为 PASS——已知非阻断） |
| 7 | `node scripts/verify-contract-anchors.mjs` | 79 段 FAIL=0 | `共 79 段；FAIL = 0；WARN = 24`，exit 0 |
| 补 | `node scripts/preflight-preset-rows.mjs --explain tool-subagent-list-agents` | 逐代处置 | exit 0，五代处置 + listAgents 供给面 + 源在场性 ✓ |

契约面读数：`items=52`、faces `{1:11, 2:14, 3:8, 4:7, 5:7, 6:5}`、`revisions=22`（末条 task=COMPAT-021）——与交付声明一致。

---

## 2. 偏离裁量（Developer 披露四项 + 证据目录）

**① smoke `LIB_TOOLING_DIRS=['host-compat']` + ⑩b 锚点集补 COMPAT-021 —— 可接受**。
- 判据真不放宽：孤儿守卫仍要求 lib/ 顶层**其余全部条目**被入口闭包消费（smoke.mjs:3337-3343，实跑绿），`files` 覆盖面检查（:3312-3140）不豁免 host-compat——`package.json files=["lib/",…]` 仍须覆盖并随包发布 host-compat。白名单是子目录级、带显式注释的评审点，非静默放宽。
- 隐洞评估：白名单内文件（现 2 个：manifest/projection）无「必须被 scripts/test 消费」断言——未来往 host-compat 塞孤儿文件会静默随包发布。当前两文件均有真实消费方（preflight CLI/test/schema-face）。定级 P3（F8）。
- ⑩b：`CHANGELOG_ENTRY_ANCHORS15` 补 `- **COMPAT-021`（smoke.mjs:4002）——新条目入行号引用对账扫描面，属守卫适配；实跑绿。

**② host-contract 不加 item、改 manifest 登记（职责三分）—— 可接受**。
- items 52 / 面分布 / golden 全保持（实测）；revisions 21→22 追加（实测）；preflight 消费的宿主字面量人工核验**确在册**：`@deepseek-ai/dsh-agent-preset`（4.7 L181 / 5.7 L198）、`dsh-workflow-ptc`（5.7 / 5.2 注记）、`dsh-workflow-worker-thread`（5.2 L185）、`@deepseek-ai/dsh-tool-subagent-control/list-agents`（5.2 L185 + smoke B2 断言 `hcSrc.includes(droppedLiteral)` L4338）、`@deepseek-ai/cordis`（1.1 L116 + regionLiterals L335）。
- P-10「双向 ⊆」字面要求：smoke 现仅对 dropped 字面量做了 contract 侧单向钉住；manifest↔contract 无双向机检断言（F6，P3）。裁量：宿主侧改名会先打红 fixture/validate/dual 对账链（间接看护在），契约侧漂移后果有限，故 P3 而非 P2。

**③ unknown 统一 exit 1 —— 可接受（且更安全）**。§7.1 退出码表本就把「未知代际」列在 1；§8.2 的「exit 3 或 1（--strict）」是设计文内部较松表述。实现取 fail-closed 更强侧（unknown 无条件硬失败），测试钉死（`--strict unknown` exit 1 + `overridden:true`）。建议顺手把 §8.2 行文与 §7.1 对齐（随 F3 一并文档化，不阻断）。

**④ §12.2 勾 8/10 —— 如实**。两项未勾与事实相符：R2+ 未做（本报告即 R1）；证据目录在 Developer 交付时未产出。**补充观察**：`docs/evidence/COMPAT-021/` 现已存在（untracked，7 文件，README 自述「Coordinator 独立复跑，非 Developer 自报」，时间戳 2026-11-07 13:16 = 本复审会话起点）——系 Coordinator 治理侧预置，非 Developer 交付面造假；其 README 读数与本复审独立实测一致（61 行构成、negative 错误码、PASSED(10)、334/0、FAIL=0/WARN=24）。Coordinator 提交时可勾选该项并入该目录。

---

## 3. Findings

| # | 严重度 | 位置 | 问题 | 可操作修复建议 |
|---|---|---|---|---|
| F1 | **P2** | scripts/preflight-preset-rows.mjs:455-458, 662-666；test/preflight-preset-rows.test.mjs:137-156 | 混合平面 fail-closed 的 CLI 接线（mixedPlane 计算 → droppedDispositionConflicts → MIXED_PLANE_FAIL_CLOSED）无仓内回归测试：本机两平面同代，10 项断言不触该路径；删掉 conflict 分支（退回 KNOWN_DROP 静默跳过 = RISK-C3 复活）仍全绿。代码本身经本复审仓外端到端实证正确 | 在测试 ④ 后加端到端用例：`mkdtemp` 伪 profile（dsh@0.2.2+嵌套 dsh-agent-preset）+ 临时目录放伪 `npm.cmd`（`@echo <伪根>`）并把该目录前插 `PATH`（伪根放 dsh@0.1.x 无 agent-preset）spawn CLI——断言 exit 1 ∧ mixedPlane=true ∧ dropped 行 FAIL MIXED_PLANE_FAIL_CLOSED。约 15 行；或给 CLI 加 `--global-root <dir>` 显式注入面替代 PATH hack（更干净，顺带利便诊断） |
| F2 | P3 | test/preflight-preset-rows.test.mjs:90-104 | 真实面断言把 generation/hostVersion 钉死本机（decl-0.2.1 / 0.2.1-rc.2）：其它宿主代际的维护者机器必红（fail-loud 非假绿，但可移植性差） | 改断结构不变量：ok:true ∧ 0 FAIL ∧ dual=PASS ∧ knownDrop=1 ∧ knownVariant=1 ∧ generation ∈ 四已知代际 ∧ confidence ∈ {profile, install-anchor}；或 `NV_PREFLIGHT_EXPECT_GENERATION` 显式钉预期 |
| F3 | P3 | docs/COMPATIBILITY.md:291（§7.2 第 6 步）；scripts/preflight-preset-rows.mjs:15-18 | §7.2 第 6 步「inject/服务」检查未实现（CLI 序列与交付说明均不含）。当前预设行不声明服务依赖，检查面为空——非缺陷，但设计-实现有一处未注明的面差 | 在 §7.2 第 6 步加注「预设行无 inject 字段 ⇒ 本步不适用于行级预检；COMPAT-022 provider 引入服务依赖时一并实现」，顺带把 §8.2 unknown 退出码表述与 §7.1 对齐（见 §2.③） |
| F4 | P3 | scripts/preflight-preset-rows.mjs:426,516；docs/COMPATIBILITY.md:197（§5.2） | `WARN` 行状态枚举从未被赋值（`summary.warn` 恒 0）；§5.2「mixedPlane 预检必须 WARN」按字面无行级/文本 WARN 呈现——实质已满足（JSON mixedPlane/mixedPlaneDetail + 头行披露 + --strict 可红 + 冲突行 fail-closed），但文与码有措辞差 | mixedPlane=true 且非 strict 时在人类可读输出打一行显式 `WARN: mixed plane (profile=… global=…)`；或文档注明 warn 枚举为保留位。另见 §1.4 边缘观察（NOT_RUN 时 checks[] 仍含 'config'）可一并标注 |
| F5 | P3 | scripts/preflight-preset-rows.mjs:551, 183-185 | 死码两处：`...(rest.status === 'FAIL' ? {} : {})` 双空分支 no-op；`autoDetectProfile` 三元两臂同值 | 下次触碰时清理（行为零影响，不必单独返工） |
| F6 | P3 | lib/host-compat/generation-manifest.mjs:51-54, 63-67；test/smoke.mjs:4328-4340 | manifest 宿主耦合字面量（HOST_PACKAGES.host/declaration、variant 双包名）与 host-contract 登记间无 smoke 双向对账（现状人工核验在册 ✓；smoke 仅钉 dropped 字面量单向） | 补一条 smoke 断言：`HOST_PACKAGES` 两值 + `GENERATION_VARIANT` 双 name + `GENERATION_DROPPED` 三字面量 ⊆ `lib/host-contract.mjs` 源文本（与既有 `hcSrc.includes(droppedLiteral11)` 同款模式），满足 P-10「双向 ⊆」的补集方向 |
| F7 | P3 | .github/workflows/ci.yml；docs/COMPATIBILITY.md:398-401（§9.2） | preflight fixtures job 未入 CI（§9.2 为「计划新增」，§12.2 未列为交付物 ⇒ 非本任务缺口；但负向必红面目前只本地/评审跑） | 随 R2 或 COMPAT-022 在 ci.yml 加 `preflight-fixtures` 步骤：`node test/preflight-preset-rows.test.mjs`（六 fixture 离线，CI 无宿主面自动走 exit 3 三态分支，符合「NOT_RUN 允许但不得假 PASS」） |
| F8 | P3 | test/smoke.mjs:3336-3337 | `LIB_TOOLING_DIRS` 白名单无消费断言：host-compat/ 内文件若失去全部 scripts/test 消费方仍随包静默发布（现 2 文件均有消费方，洞为前瞻性） | 加断言：`LIB_TOOLING_DIRS` 各目录内每个 `.mjs` 至少被 `scripts/` 或 `test/` 下文件 import 一次（文本 includes 路径即可），使白名单登记与实际消费互钉 |

---

## 4. 是否建议进入提交

**建议进入提交**（APPROVED_WITH_NOTES）。

- 产品面（manifest / projection / CLI / fixtures / 迁移 / 契约 revisions）无 P0/P1/P2 缺陷；八门禁全绿；C3 核心行为经独立端到端实证。
- F1（P2）为 test-only 增补：建议随本任务一并并入（成本 ~15 行、消除中心声明的守卫缺口）或作为紧随 fast-follow 立项；其余 P3 可归入后续批次（F6/F8 属 P-10 补强，F7 属 CI 接线，F2/F3/F4/F5 属文档/清理）。
- 提交时一并处理：§12.2 证据目录项可勾选并纳入 Coordinator 已预置的 `docs/evidence/COMPAT-021/`（README 与本复审独立读数一致）；`docs/COMPATIBILITY.md` 状态行「已实施（待评审）」按 Coordinator 治理口径收口。

（本报告为 R1 记录；review-record 由 Coordinator 统一执行，本文件不含 .governance/ 写入。）
