# COMPAT-021 R2 复审报告（R1 返工增量复审）

- 任务：COMPAT-021 R1 返工核验（R1 基线：`docs/review/COMPAT-021-R1.md`，APPROVED_WITH_NOTES，P2×1 F1 + P3×7）
- 复审人：Reviewer（R2 delta 复审，独立于 Developer）
- 复审时间：2026-11-07 13:38–13:52（Asia/Shanghai）
- 工作树基线：HEAD `6eaffb8` 未变；返工面 = `scripts/preflight-preset-rows.mjs`（795→806 行）、`test/preflight-preset-rows.test.mjs`（159→220 行）、`docs/COMPATIBILITY.md`（§7.2/§8.2 注记）、`CHANGELOG.md`（COMPAT-021 条目验证段 + R1 返工句）、`lib/host-contract.mjs`（revisions 22 文本同步；items 52 不变）
- 复审方式：源读 + 八门禁真跑 + `--global-root` 行为三探（防呆/fixture 忽略/混合平面）+ **独立变异验证**（Coordinator 授权：临时短路 conflict 接线 → 测试必红 → 还原 → SHA256 核验无残留）。**未改产品代码（终态）、未写 .governance/、未 commit。**

---

## 结论

# APPROVED_WITH_NOTES

**P0 = 0 · P1 = 0 · P2 = 0 · P3 = 3（本轮新观察，均不阻断）**

- R1 五项返工（F1/F2/F3/F4/F5）**全部 CLOSED**（逐项证据见 §2）；F6/F7/F8 维持 R1 记录在案口径（见 §4 裁量③）。
- 唯一实质残留 = N1（P3）：`--global-root` 注入在 JSON 报告中**未标注 override**（`secondary.via='global-root-override'` 已计算但未上报告——Developer 声明「报告新增 …secondary.via=global-root-override」只兑现了一半，`plane.globalRoot` 已兑现）；证据卫生小缺口，一行可修。
- **建议提交**（N1–N3 可随本 commit 顺手修或归后续批次，由 Coordinator 裁量）。

---

## 1. 门禁复跑（真跑取证）——全绿

| # | 命令 | 期望 | 实测读数 |
|---|---|---|---|
| 1 | `node --check` ×2（CLI / test） | 0 错 | exit 0 |
| 2 | `node test/preflight-preset-rows.test.mjs` | PASSED (11) | `PREFLIGHT TEST PASSED (11)`，exit 0（末组 = 端到端混合平面 fail-closed ✓） |
| 3 | `node scripts/preflight-preset-rows.mjs --json`（真实面） | exit 0 / decl-0.2.1 / mixedPlane=false / 0 FAIL | exit 0；ok=true；generation=decl-0.2.1；confidence=profile；mixedPlane=false；summary `{total:61, pass:53, knownDrop:1, knownVariant:1, warn:0, fail:0, notRun:6}`；dual=PASS；`plane.globalRoot=C:\Users\peter\AppData\Roaming\npm\node_modules`（自然根，默认行为不变） |
| 4 | `--fixture …/negative-missing-export --json` | exit 1 + ERR_PACKAGE_PATH_NOT_EXPORTED | exit 1；errors `[DECLARED_DROPPED_ROW, ERR_PACKAGE_PATH_NOT_EXPORTED, DUAL_SOURCE_DRIFT, DUAL_SOURCE_DRIFT]` |
| 5 | `node test/validate-preset.mjs` | PASS | `PRESET VALIDATION PASSED（schema-face: PASS）`，exit 0 |
| 6 | `node test/smoke.mjs` | 334/0 | `SMOKE DONE: 334 passed, 0 failed`，exit 0 |
| 7 | `node scripts/verify-contract-anchors.mjs` | 79 段 FAIL=0 | `共 79 段；FAIL = 0；WARN = 24`，exit 0 |
| 8 | 契约读数 | items 52 / revisions 22 | 实测 `items=52`、`revisions=22`（末条 COMPAT-021，含 R1 返工同步句） |

`git status` 终态：仅预期改动/新增文件，**无变异残留**（见 §3 哈希核验）。

---

## 2. R1 findings 逐项判定

### F1（P2，混合平面 fail-closed 仓内守卫缺位）——**CLOSED**

**① `--global-root` 诊断注入**（`scripts/preflight-preset-rows.mjs`）：
- 解析 `:80`；**防呆**：目录无 `@deepseek-ai` 子目录 → die **exit 2**（`:94-95`；实测空目录 → `[nv-compat] 用法错误（exit 2）：--global-root 目录缺少 @deepseek-ai 闭包`）——校验在参数层，fixture 模式同样先拦（对无效目录不「忽略」而是拒绝，fail-fast 合理）。
- usage `:111` + 头注释 `:35` 同步 ✓；`resolveGlobalRoot` 覆盖优先 `:153-156`（默认无 flag = `npm root -g`，真实面读数证实默认行为不变）。
- **fixture 模式忽略**（有效目录）：实测 `--fixture decl-0.2.2 --global-root <有效根>` → exit 0、`plane.channel=fixture`、`plane.globalRoot=null`、`secondary=null`——`detectPlane` fixture 早退（`:208-213`）先于全局根解析，注入不进 fixture 面 ✓。
- 全局根消费：fallback 主平面 `:232-237` 与混合平面对照探测 `:243-252` 均走覆盖值；secondary 内部 `via='global-root-override'`（`:249`）；报告新增 `plane.globalRoot`（`:553`，自然运行时如实披露真实 npm 根）。
- 通道语义无退化：主判定仍绑 profile 平面（`:217-231` 原样）；全局闭包仍仅 fallback/对照。

**② 第 11 组端到端混合平面守卫**（`test/preflight-preset-rows.test.mjs:159-217`）：
- 构造：`mkdtemp` 伪 profile（decl-0.2.2 fixture `node_modules` 副本 + 就地补 `./package.json` exports 与空 CJS stub——**不动 shipped fixtures**，副本写完即弃）× 伪全局闭包（legacy-0.1 fixture `@deepseek-ai` 副本）经 `--global-root` 注入；`finally` 清理（实测无临时残留）。
- 断言面（`:193-209`）：exit 1 ∧ generation=decl-0.2.2 ∧ `secondary.generation=legacy-0.1` ∧ mixedPlane=true ∧ droppedDispositionConflicts=true ∧ legacy-only 行 **FAIL 且双断言非 KNOWN_DROP** ∧ 行报文含 MIXED_PLANE_FAIL_CLOSED ∧ errors 按 rowId 命中 ∧ `--strict` 加判 STRICT_MIXED_PLANE。实跑绿（第 11 行 ok）。
- **独立复现**（本复审自构造，非复用测试代码）：临时 profile（dsh@0.2.2-rc.1+嵌套 agent-preset）+ `--global-root` 伪根（dsh@0.1.5-rc.2）→ exit 1、`plane.secondary={install-anchor, 0.1.5-rc.2, legacy-0.1}`、mixedPlane=true、conflicts=true、legacy-only 行 FAIL、MIXED_PLANE_FAIL_CLOSED×1——与 R1 的 PATH 伪 npm 构造读数一致，注入面行为正确。

**判定**：RISK-C3 复活路径现已被仓内 11 组断言中的第 ⑤ 组钉死；变异判别力见 §3。CLOSED。

### F2（真实面断言钉死本机）——**CLOSED**

`test/preflight-preset-rows.test.mjs:75-107`：改为结构不变量——`generation ∈ {decl-0.2.0, decl-0.2.1, decl-0.2.2}`（fail-loud：环境代际未知即红，`:97-98`）∧ `confidence ∈ {profile, install-anchor}`（`:99`）∧ exit 0/ok:true/0 FAIL/dual=PASS/knownDrop=1/knownVariant=1；`hostVersion`/`confidence` 只入 ok 报文（`:106`）不入断言。实跑绿（本机 decl-0.2.1/profile 命中结构断言）。可移植性达成。CLOSED。
（小残留见 N2：文件头注释 `:8-13` 仍述旧钉死口径且未列第 ⑤ 组。）

### F3（§7.2 第 6 步未实现无注记 + §8.2 退出码表述分裂）——**CLOSED**

`docs/COMPATIBILITY.md:291`：§7.2 第 6 步补「**实现注记（COMPAT-021 R1 F3）**：本步未实现——当前预设行不声明 inject/服务字段，检查面为空，硬实现只会制造恒真断言；留待 COMPAT-022…」；`:367`：§8.2 unknown 统一为「exit 1（fail-closed，与 §7.1 退出码表一致……）」。设计-实现面差已注记。CLOSED。
（小残留见 N3：§12.1 验收表 `:476` 仍留「unknown exit 1/3」旧措辞。）

### F4（WARN 枚举从未赋值，§5.2「必须 WARN」文码差）——**CLOSED（口径注释方案）**

`scripts/preflight-preset-rows.mjs:529-530`：hardFail 处注明「WARN 为保留枚举（R1 F4 口径）：mixedPlane 不落行级 WARN——非 strict 下经 mixedPlane/mixedPlaneDetail 字段与人类可读头行披露；涉 legacy-only 行时已 fail-closed……」。与 R1 裁定一致（实质披露 + strict 可红 + 冲突行 FAIL 即满足 §5.2 实质；文档侧 §8.2 已同步）。CLOSED。

### F5（两处死码）——**CLOSED**

`autoDetectProfile` 同值三元 → 直接候选数组（`:193-194`）；rows JSON no-op 三元 → 纯 rest 展开 `rows.map(({ errors: _rowErrors, ...rest }) => rest)`（`:562`）。行为零变化（真实面 JSON 结构与 R1 读数逐字段一致，仅新增 `plane.globalRoot`）。CLOSED。

### 附带同步核验

- CHANGELOG（`CHANGELOG.md:15`）：验证段更新为「新测试 11/11 通过（含……端到端混合平面 fail-closed 守卫〔R1 F1 返工……变异自测……〕）」+ R1 返工句（F1–F5 已修 / F6/F7/F8 记录在案）✓。
- host-contract revisions 22 文本同步：实测含「R1 返工增 `--global-root` 诊断注入……与端到端混合平面守卫……变异自测短路 conflict 接线必红……清理死码两处……WARN 保留枚举口径注释」「独立测试 11 组……可移植结构不变量断言」；items 52 / 面分布不变 ✓（anchors 79 段 FAIL=0 佐证）。

---

## 3. 变异验证记录（本复审独立执行）

**授权**：Coordinator R2 请求明示「请你自己再做一次变异验证（临时短路 scripts/preflight-preset-rows.mjs 的 droppedDispositionConflicts 判定 → 跑测试必红 → 还原；确认工作树无残留）」。

| 步骤 | 操作 | 读数 |
|---|---|---|
| 0 | 变异前基线备份 + 哈希 | `scripts/preflight-preset-rows.mjs` SHA256 = `A08FE5B493403EB5996E7A529B7CD4A4501315D561F252DF53BA12CB7D34C789`（与 R2 开场记录一致） |
| 1 | 变异：`:465` `const droppedDispositionConflicts = mixedPlane` → `= false && mixedPlane`（短路 conflict 接线 = 模拟 RISK-C3 复活回归） | — |
| 2 | `node test/preflight-preset-rows.test.mjs` | **FAILED (10)**，exit 1；第 ⑤ 组红且症状完整：`exit 0 ≠ 1；droppedDispositionConflicts ≠ true；legacy-only 行 status KNOWN_DROP ≠ FAIL（静默跳过 = RISK-C3 复活）；…被披露为 KNOWN_DROP…；行报文未含 MIXED_PLANE_FAIL_CLOSED；errors 未含 rowId 命中的 MIXED_PLANE_FAIL_CLOSED`——**双断言（FAIL ∧ 非 KNOWN_DROP）均触发**，其余 10 组不受影响 |
| 3 | 还原（备份覆盖回写）+ 哈希核验 | SHA256 = `A08FE5B4…C789`，**与基线逐字节一致**；`git status` 该文件仍为原 `??` 未跟踪态（无残留） |
| 4 | 复跑测试 | `PREFLIGHT TEST PASSED (11)`，exit 0 |

**结论**：第 ⑤ 组对 C3 接线回归**真有判别力**（短路 ⇒ 必红，症状即 RISK-C3 复活全貌）；Developer 自述的变异自测可信，且由本复审独立复现。变异过程未触碰 shipped fixtures / 其它文件，临时件（备份 + 探测构造）已清理。

---

## 4. 裁量点

**① `--global-root` 诊断注入面（误用/安全）——可接受，余一小披露缺口（N1）**
- 防呆：无效目录（无 `@deepseek-ai` 闭包）exit 2 fail-fast（实测）；默认行为不变（无 flag = `npm root -g`，真实面读数同 R1）；fixture 模式忽略有效注入（实测 `globalRoot=null`/`secondary=null`）；通道标注 `install-anchor` 不变。
- 安全：只读给定目录的 package.json 元数据，零写、零网络、不起进程面变化（相比 R1 前仅少一次 `npm root -g` 子进程）；无 token/密钥面。
- 误用：注入构造的「证据」在 JSON 中有 `plane.globalRoot` 披露实际根，但**无显式 override 标记**——见 N1（P3）：`secondary.via='global-root-override'` 已在 `:249` 计算却未进报告（`:554` 的 secondary 仅 channel/hostVersion/generation；人类可读头行 `:574` 亦未显示）；且 fallback 主平面在覆盖时 via 仍标 `npm-root-g`（`:235`）。建议：report.plane.secondary 增 `via`，或 `opts.globalRoot !== null` 时输出 `globalRootOverride: true`（与 §8.3 `injected` 标记同纪律）。

**② 变异自测可信度——已独立复现，可信**（§3 全记录：症状完整、双断言触发、还原哈希核验一致）。

**③ F6/F7/F8 记录在案不扩面——可接受**。R1 定级即 P3 且有间接看护链（F6：宿主字面量人工核验在册 + fixture/validate/dual 链会红；F7：§9.2 本为计划项；F8：白名单现 2 文件均有真实消费方）。本轮返工未触碰这三面（smoke 334/0、anchors 79 段 FAIL=0、LIB_TOOLING_DIRS 原样），维持记录在案、随后续批次（建议与 COMPAT-022 或 CI 接线一并）是合理排程，不构成本轮阻断。

---

## 5. Residual（本轮新观察，均 P3）

| # | 严重度 | 位置 | 问题 | 建议 |
|---|---|---|---|---|
| N1 | P3 | scripts/preflight-preset-rows.mjs:249 vs :554（`:574`）、:235 | `--global-root` 注入在 JSON 报告无 override 标记：`secondary.via='global-root-override'` 已计算未上报（Developer 声明的「报告新增 …secondary.via」只兑现 `plane.globalRoot` 一半）；fallback 主平面覆盖时 via 仍标 `npm-root-g`。审计者无法从 JSON 区分「注入根」与「自然 npm 根」 | report.plane.secondary 加 `via` 字段；或 `opts.globalRoot !== null` 时报告增 `globalRootOverride: true`（与 §8.3 injected 纪律对齐）；顺带修 `:235` fallback via 标签 |
| N2 | P3 | test/preflight-preset-rows.test.mjs:8-13 | 文件头注释陈旧：仍描述 ② 的旧「断言 generation=decl-0.2.1」钉死口径（代码已改结构不变量），且未列第 ⑤ 组（11 组实况） | 头注释同步为可移植口径 + ⑤ 组覆盖描述（两行文字） |
| N3 | P3 | docs/COMPATIBILITY.md:476（§12.1 表） | §8.2 已统一 unknown exit 1，但 §12.1 验收表仍留「unknown exit 1/3」旧措辞 | 同批把该格改为「unknown exit 1」 |
| F6/F7/F8 | P3（记录在案） | 见 R1 报告 | 未扩面（裁量③可接受） | 随 COMPAT-022 / CI 接线批次处理 |

---

## 6. 是否建议提交

**建议提交**（APPROVED_WITH_NOTES，P0/P1/P2 = 0）。

- R1 全部 P2/P3 返工项按声明兑现并经独立验证（含变异判别力复现）；八门禁全绿；默认行为零变化（真实面读数与 R1 逐字段一致 + 新增 `plane.globalRoot` 披露）。
- N1–N3 均为披露/文档级小项：N1 一行可修且直接关系「注入不得冒充真实证据」纪律——建议随本 commit 顺手修（Developer 改动 ≤3 行 + 测试不动）；若 Coordinator 判定不再触碰交付面，归入后续批次亦不阻断。
- F6/F7/F8 维持记录在案（§4 裁量③）。

（本报告为 R2 记录；review-record 由 Coordinator 统一执行，本文件不含 .governance/ 写入。）
