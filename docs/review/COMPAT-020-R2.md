# COMPAT-020 R2 — Delta Re-review

- 复审对象：R1 `NEEDS_CHANGE`（P2×4）后的未提交返工；HEAD 仍 `81a2e11`
- 复审范围：仅 R1 F1–F4 四项 P2 的闭合，以及两条 P3；产品热修文件与 `docs/COMPATIBILITY.md` 不纳入本次判定
- 复审方式：只读代码/文档核对 + 独立真跑测试；未修改产品代码、未写 `.governance/`、未 commit、未调用 review-record

## 结论

**APPROVED_WITH_NOTES**

- P0 = 0
- P1 = 0
- P2 = 0
- 遗留 P3 notes = 1 个理论性代际检测边界 + 2 条文档措辞备注（均不阻断提交）
- 建议：可以进入提交；由 Coordinator 统一记录。提交前无需再改产品代码。

## F1–F4 逐项闭合

| ID | R1 问题 | 状态 | R2 证据（file:line） |
|---|---|---|---|
| F1 | `lib/host-contract.mjs:94` revision 写“12→13”，实际 20→21 | **CLOSED** | `lib/host-contract.mjs:94` 末尾已是 `revisions 20→21。`；Node 实测 `revisions.length=21`、`items=52`、末条 `task='COMPAT-020'`；全文件 `includes('revisions 12') === false`。 |
| F2 | README 0.2.2/0.2.0 过度声称“完整支持”，且缺 0.2.1 行 | **CLOSED** | `README.md:195` 0.2.2 状态为“✅ 预设加载面已实测（完整支持范围见验证管线）”，正文明确“本行只背书预设加载面”，并声明本轮未在 0.2.2 重跑全链路；`README.md:196` 新增 0.2.1-rc.2 “⚠️ 部分支持（预设加载面已实测；独立 list_agents 不可用）”，引用 `docs/evidence/COMPAT-020/diag-preset-0.2.1-rc.2.json`；`README.md:197` 0.2.0 改为“⚠️ 部分支持（预设可加载；独立 list_agents 不可用）”；`README.md:198` 0.1.5 未被本次 diff 触碰；`README.md:203` 代际限制段同步 0.2.0/0.2.1 的“可加载但独立 list_agents 不可用”。证据核验：0.2.1 与 0.2.2 JSON 均 `ok:true`、5 个 preset、`novel-writing` 行含 `name`/`description`/`order`，且无 `broken` 字段。 |
| F3 | item 5.2 `L16-220` 漏 `dsh-tool-web` | **CLOSED** | `lib/host-contract.mjs:184` item 5.2 `line` 已为 `L16-226`；`agent-presets/novel-writing/agent.cordis.yml` 共 226 行，`dsh-tool-web` 位于 `:222-226`；`verify-contract-anchors.mjs` 第 67 段 5.2 读数为 `L16-226 … OK`；全文件 `includes('L16-220') === false`。5.7 `L28-35` 亦为 `OK`。 |
| F4 | no-profile/0.1.x 跳过面陈述不实，宣称了不存在的模块解析保证 | **CLOSED** | `test/validate-preset.mjs:159-163` 注释明确分流；`:187-196` 无 profile 分支对 legacy-only 行显式 `fail`（fail-closed），并注明当前更早的 YAML `!!js` 解析失败使其不可达；`:204-206` 仅在 `declarationPlane !== null` 时跳过；`:208-218` 在 0.1.x（声明面 null、有 profile）继续走 `packageOnPlane`→`MODULE_NOT_FOUND` 原解析/fail 路径。`CHANGELOG.md:42` 与 `lib/host-contract.mjs:94` 已同步限定为“无 profile 属预存在解析期 fail-closed，不宣称模块解析保证”。 |

## P3 状态

| P3 | 状态 | 证据 |
|---|---|---|
| `preset-schema-face.mjs:337-338` dropped 与 unverified 口径 | **CLOSED** | 注释已改为“dropped 是 unverified 的子集，汇总时勿重复相加”；`:516-524` 中 `unverified` 过滤 `UNVERIFIED_KINDS`（含 `GENERATION_DROPPED`），`dropped` 单独计数但不参与 `checked`。实测 coverage `total=59, enabled=47, checked=37, dropped=1, findings=0, unverified=22`，`37+22=59`；dropped 1 已含在 unverified 22 内，不再相加。 |
| `smoke.mjs:4236` config:null 判空 | **CLOSED** | 条件为 `droppedCfg === undefined || droppedCfg === null || (object && keys=0)`，与 `validate-preset.mjs:244` / `preset-schema-face.mjs:512` 口径一致。smoke 未新增断言，仍为 334。 |

## 独立实测命令与读数

| 命令 | 读数 |
|---|---|
| `node --check lib/host-contract.mjs && node --check test/validate-preset.mjs && node --check test/smoke.mjs && node --check test/fixtures/host-surfaces/preset-schema-face.mjs` | 4 文件全部通过；`CHECK_BAD=0`，exit 0 |
| `node test/validate-preset.mjs` | `PRESET VALIDATION PASSED（schema-face: PASS）`，exit 0；含 `generation-dropped` 披露；静态不变量 `cordis.patch.yml` 零命中、yml 恰 1 行、config 空均 OK |
| `node test/smoke.mjs` | `SMOKE DONE: 334 passed, 0 failed`，exit 0；末条 README 计数断言 `declared=334 actual=334` |
| `node scripts/verify-contract-anchors.mjs` | `共 79 段；FAIL = 0；WARN = 24`，exit 0；5.2 `L16-226 … OK`；5.7 `L28-35 … OK` |
| `node test/fixtures/host-surfaces/preset-schema-face.mjs --json` | `verdict=PASS`；coverage `{total:59, enabled:47, checked:37, dropped:1, findings:0, unverified:22}`；`GENERATION_DROPPED` 行恰 1；无 finding-kind 行；exit 0 |
| Node 契约内省 | `items=52`；`revisions=21`；末条 `task=COMPAT-020`；无 `revisions 12`、无 `L16-220` |

## 残余 notes（不阻断）

1. **P3（理论性，未复现）— `declarationPlane` 的全局安装通道可能掩盖 profile 代际差异**：`test/validate-preset.mjs:148-157` 的 `packageOnPlane` 在 profile `require.resolve` 失败后会回退到 npm-global 闭包；`:163` 因此在“0.1.x profile + 全局 0.2.x 安装”混合环境中也可能把 `declarationPlane` 判为非 null；`:204` 随即跳过 legacy-only 行，可能漏掉 0.1.x profile 内真实缺包。当前未观察到复现，属理论边界；建议后续区分 `profile-resolve` 与 `install-anchor` 命中来源（仅 profile 命中才作为跳过依据，或显式记录 plane source 并对 install-anchor-only 走保守判定），并补一条混合平面负控。该 P3 不影响本轮 APPROVED_WITH_NOTES。
2. **文档措辞备注（不构成 P2）**：`README.md:195` 的“完整支持范围见验证管线”仍可读作泛指完整支持；同句已明确“本行只背书预设加载面”且说明未重跑全链路，故不判过度声称。若后续编辑，建议改为“其它支持面见验证管线”。
3. **证据口径备注**：0.2.1 行明确写了“本轮未重跑全链路，链路基线沿用 BUG-011 的 0.2.0 代证据”，未把 0.2.0 证据冒充 0.2.1 实测；0.2.0 本轮也未新 boot。此点符合“如实披露”，无需改。
4. **范围声明**：`cordis.patch.yml` / `agent-presets/novel-writing/agent.cordis.yml` 的既有 COMPAT-020 修复仍按原任务保留，本轮未把它们当作 R2 delta 重新判定；`docs/COMPATIBILITY.md` 按指示不纳入。`.governance/` 未被本次复审写入。

## 提交建议

**建议进入提交。** 四项 R1 P2 均已闭合，P3 两条已闭合；无 P0/P1/P2 阻断项。上述第 1 条 P3 可作为后续加固项，不应阻塞本轮提交。
