# COMPAT-023 R2 复审报告（返工增量）

- 日期：2026-11-07 · 审查角色：Reviewer（同 R1 独立会话）· 被审 HEAD：d955c93（工作树未提交）
- 范围：仅 R1 三条 P2 的返工增量（F2 订正文本 / F3 守卫 / F1 CLEAN-014 立项核验）；约束遵守同 R1（零产品码改动、零 `.governance/` 写入、零 commit、未跑 review-record）
- 前置：R1 报告 = docs/review/COMPAT-023-R1.md（APPROVED_WITH_NOTES，P0=0/P1=0/P2=3）

## 结论

**APPROVED — P0 = 0 · P1 = 0 · P2 = 0**（返工增量零缺陷；R1 findings F1/F2/F3 全部闭合）

## 1. F2 订正文本核验（docs/evidence/COMPAT-023/implementation.md §4.4 L66 + §6.项2 L86）

逐点对照 R1 §3 机理与本会话真跑读数：

| 订正后表述 | 复核依据 | 判定 |
|---|---|---|
| 「1078×593 实际通过 C5 全部子谓词（h=29≤32、lines=1、交集 0、无截断、文本逐字匹配）」 | R2 会话 bar-geometry 真跑 verdict 详情（1078x593: h=29 lines=1 form=row sum=0 truncated=false） | ✅ |
| 「红仅源自 1400×900 的 lines=null」 | 同上（1400x900: h=15 lines=null，其余子谓词全过） | ✅ |
| 「测得元素 = .nv-bar-note chip（栏内 h=15；UX-060 设计形态）；chip 无 .nv-notice-text 子元素 ⇒ 测 chip 自身；chip CSS 未声明 line-height ⇒ computed 'normal' ⇒ lines=null」 | MEASURE_JS L237-243（`querySelector('.nv-notice-text') ?? note` + `lineHeight==='normal'→null`）+ lib/client.js L5825（chip CSS 无 line-height）——与 R1 §3.2 逐字一致，「Range 测量无果」错述已订正 | ✅ |
| 「裁决 A：UX-061 icon rail + UX-063 全屏工作台释放标题栏空间 ⇒ 判据视口跨入 chip 形态，lines===1 仅 row 可计算；UX-060 设计意图无一条被违反」 | R1 §3.3 裁决原文 + EVD-109 历史基线 | ✅ |
| 「已按裁决 A 立项 CLEAN-014；探针断言零改动、未静默改判」 | CLEAN-014 triage 在场（§3）；断言区 diff 0 行（R1 已验） | ✅ |

**裁量点判定：未引入新不准确**。两处订正（机理归因 + 1078×593 全过）与事实、代码、R1 裁决三方一致。

## 2. F3 守卫核验（scripts/preflight-preset-rows.mjs L118-125）

**代码读**：`--patch/--legacy/--profile` 三项存在性校验整体并入 `if (opts.surfaces !== true)`；L106-111（fixture node_modules / globalRoot 闭包）与 L114-117（fixture 默认源路径赋值）位置未动。

- 行级模式（surfaces=false）：守卫体 = 原三检查原序执行 ⇒ **行为逐分支不变**（fixture 模式下 patch/legacy 常被重指到 fixture 行集且必在 ⇒ 校验照旧；显式坏路径照旧 usage exit 2）。
- surfaces 模式：parseArgs 直接放行 ⇒ main() 在源加载前分发 surfacesMode ⇒ 坏路径参数全程不被读取。

**双向独立复跑**：

| 命令 | 读数 | 声明 | 判定 |
|---|---|---|---|
| `--surfaces --patch Z:\no-such-file.yml --legacy Z:\also-missing.yml` | **exit 0**，30 格跑满 `24 pass + 6 warn + 0 skip + 0 fail` | 正常跑完 exit 0 | ✅ |
| `--patch Z:\no-such-file.yml`（行级） | **exit 2** `用法错误：--patch 文件不存在：Z:\no-such-file.yml` | usage exit 2 | ✅ |
| `--legacy Z:\missing.yml`（行级） | **exit 2** | 同 | ✅ |
| `--profile Z:\missing-dir`（行级） | **exit 2** | 同（profile 检查移入守卫后行级仍生效） | ✅ |
| `--surfaces --profile Z:\missing-dir` | **exit 2**（L97 互斥，先于守卫——既有语义未变） | — | ✅ |

## 3. F1 立项核验

`.governance/change-triage/CLEAN-014.json` 在场，title =「bar-geometry C5 判据形态感知刷新（COMPAT-023 R1-F1 移交）」——按裁决 A 立项，R1 收单条件满足。（只读核验，未写。）

## 4. 门禁复跑（返工后全量，全部真跑）

| 门禁 | 读数 |
|---|---|
| `node --check` × 8 | failures = 0 |
| `node test/smoke.mjs` | **342 passed, 0 failed**（exit 0） |
| `node test/preflight-preset-rows.test.mjs` | **PASSED (16)**（exit 0） |
| `node test/validate-preset.mjs` | PASSED（exit 0） |
| `node scripts/verify-contract-anchors.mjs` | 共 79 段；FAIL = 0；WARN = 24 |
| `node scripts/preflight-preset-rows.mjs --surfaces` | exit 0（24 PASS + 6 WARN + 0 SKIP + 0 FAIL） |

## 5. 工作树核验与观察项

- 产品码增量自 R1 = preflight-preset-rows.mjs 恰 +5 净行（守卫 + 注释；304 vs 299 insertions），与申报一致；implementation.md 位于未跟踪证据目录（内容订正已直读核验）。`.governance/` 侧改动（authority-ledger / evidence-log / plan-tracker / CLEAN-014 / review-COMPAT-023-R1.md 归档）为 Coordinator 动作，非本审查会话所为。
- **N1（观察，不计级）**：`--surfaces --global-root <坏路径>` 仍会触发 L109-111 的 globalRoot 闭包校验（该参数在 surfaces 模式同样无意义）。与 F3 同族但触发面更窄（需显式传入诊断参数），且对无意义输入 fail-fast 可辩护——建议 CLEAN-014 或下次触碰 preflight 时顺带统一，不构成本轮 finding。

## 6. 提交建议

**建议提交**（R1 + R2 增量一并）。R1 三条 P2 全闭合：F1 → CLEAN-014 立项、F2 → 订正如实、F3 → 守卫落地且双向验证通过；门禁全绿。
