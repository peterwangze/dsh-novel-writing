# CLEAN-014 R1 复审报告（bar-geometry C5 形态感知刷新 + N1 顺修）

- 日期：2026-11-08 · 审查角色：Reviewer（独立会话）· 被审 HEAD：6acf5b7（工作树未提交）· triage = `.governance/change-triage/CLEAN-014.json`
- 范围：`scripts/probe-nv-bar-geometry.mjs`（+65/−14）+ `scripts/preflight-preset-rows.mjs`（+5/−1）+ 证据 `docs/evidence/CLEAN-014/`（README + report.json + 5 截图）
- 复审约束遵守：零产品码改动（SHA 前后一致证明，见 §8）、零 `.governance/` 写入、零 commit、未跑 review-record

## 结论

**APPROVED_WITH_NOTES — P0 = 0 · P1 = 0 · P2 = 0 · P3 = 1（文档措辞）**

判据刷新非弱化（row 臂逐谓词保留 + chip 臂等效强度 + ambiguous 真 fail-closed）；其余判据零改动；证据读数与开发者申报逐项一致，且复审**独立复跑探针全绿**（7/7 判据 ✅、exit 0、隔离纪律内建全真）；N1 双向读数符合申报；四门禁全过。建议提交（P3 可随提交顺手订正，非阻断）。

## 1. 判据强度非弱化 — PASS（代码读）

旧 C5 谓词（HEAD L618-621）：`notice≠null ∧ h≤32 ∧ noticeTextLine≠null ∧ lines===1 ∧ sum===0 ∧ truncated===false ∧ textMatches===true`，`every` 全量记录。

新双臂（工作树 L653-656）：

- **row 臂**（`c5Row` L655）：`shape==='row' ∧ noticeTextLine≠null ∧ lines===1 ∧ c5Common`，其中 `c5Common`（L653）= `notice≠null ∧ h≤32 ∧ sum===0 ∧ truncated===false ∧ textMatches===true`——旧谓词 **7 项逐一保留**，另加形态闸门（收紧非放松）。
- **chip 臂**（`c5Chip` L654）：`shape==='chip' ∧ noticeTextLine≠null ∧ whiteSpace==='nowrap' ∧ c5Common`。旧 `lines===1` 对 chip **不可满足**（chip CSS 未声明 line-height ⇒ computed 'normal' ⇒ lh/lines=null，R1 F1 移交根因），替换为 `nowrap` = CSS **构造性单行**（换行被样式禁止，强度不低于实测单行）；`h≤32 ∧ 交集∅ ∧ 无截断 ∧ 文本匹配` 全保留。两轮实测（证据跑 + 本复审复跑）chip `ws=nowrap ∧ truncated=false`（scrollWidth=clientWidth=77 ⇒ 无裁切溢出，截断守卫覆盖 nowrap 溢出风险）。
- **ambiguous fail-closed 属实**：`noticeShape`（MEASURE_JS L248-255）= 类名 `nv-bar-note` ∧ 无 `.nv-notice-text` → 'chip'；类名 `nv-notice` ∧ 有子元素 → `data-form`（缺省 'row'）；其余组合（双真/双假）→ 'ambiguous'。`c5Pass`（L656）按 `shape==='chip'` 分派，否则走 row 臂；'ambiguous'/'block'/null 形态在 `c5Row` 的 `shape==='row'` 严格等值处失败 ⇒ **双臂均不过**（结构性 fail-closed，非约定式）。

## 2. 其余判据零改动 — PASS（git diff 逐 hunk + HEAD 对照）

探针 diff 共 6 处 hunk，全部落在申报面：①WIDE_VIEWPORT 头注（纯注释）②MEASURE_JS `noticeShape` 新块 + `noticeTextLine` 补 `whiteSpace` 键（additive）+ 注释 ③记录层 rec 补 `noticeShape` 字段（additive）④参考视口注释 ⑤C5 verdict 双臂替换 ⑥控制台读数行（证据可读性）。C1/C2/C3/C4/C6/C7 的 verdict 行 HEAD ↔ 工作树**逐字节相同**（verdict('C…' 全行对照）；C6 消费的 `noticeTextLine.lines` 语义不变（新键 additive）；`truncated`/`textOk`/`overflow` 计算不在任何 hunk 内。preflight diff 仅 1 处 hunk（§4）。

## 3. 真跑证据核验 — PASS（report.json + 独立复跑双跑一致）

**证据 report.json**（docs/evidence/CLEAN-014/probe/report.json）C5 detail 与申报逐字一致：

```
1078x593: form=row h=29 w=796 lh=16 lines=1 ws=pre-wrap barW=796 dataForm=row sum=0 truncated=false
1400x900: form=chip h=15 w=77 lh=null lines=null ws=nowrap barW=1118 dataForm=null sum=0 truncated=false｜臂统计：chip 1 / row 1（共 2）
```

7 verdicts 全 ok、`report.ok=true`（「8/8」= 6 判据 + C5×2 视口记录单元口径）；参考位 1800×900 记录在场（chip w=110 h=15 lh=null ws=nowrap 交集=0 栏内=true，零变化观测）；C6 lines=3/2、C1 len=259 clip 栏外、C2 双视口 sum=0、C3 y=37≥bottom=37、C7 指纹一致；`instanceUrlRedacted` = `token=***`，全文仅此一处 token 字样（无裸 token）。

**复审独立复跑**（`node scripts/probe-nv-bar-geometry.mjs`，默认 out=%TEMP%\ux060-probe，仓外零污染）：隔离纪律为脚本内建且本 diff 未触碰该区——官方桌面 CLI（0.2.2-rc.1）+ mkdtemp 临时根（containment 六项全真）+ 随机端口 64158 + token=*** + C7 真实 $DSH_HOME 指纹前后一致 + 收尾只杀自启树。结果 **7/7 判据 ✅、exit 0**，全部几何读数与证据跑逐项一致（row h=29 w=796 lines=1 ws=pre-wrap；chip h=15 w=77 lh=null ws=nowrap 栏内=true；S1 block lines=3/2 len=259；参考位 chip w=110）。两轮确定性读数完全重合 ⇒ 证据可信。

**裁量披露**：vision 视觉通道两次鉴权失败（上游 token 过期），截图目检未执行；以「双跑几何读数逐项一致 + 5 张 PNG 在场且非空（81–118 KB）+ report.json screenshot 字段一一对应」裁量通过（任务书允许 report.json + 截图一致性裁量）。

## 4. N1 顺修 — PASS（代码读 + 双向复跑）

代码读（preflight L109-114）：守卫条件 `opts.surfaces !== true && opts.globalRoot !== null && !existsSync(...)`——行级（surfaces=false）时首操作数为 true，**条件语义与 die 文案、校验位置逐字节不变**；surfaces 模式跳过。`main()` L741-743 先分发 `surfacesMode`，`detectPlane`（L753，globalRoot 首次被读在 L241）仅行级可达 ⇒ surfaces 模式 globalRoot 全程不被读取，跳过校验与执行路径自洽，与 R2-F3（`--patch/--legacy/--profile` 守卫 L123-128）同族。

复跑读数（无早停管道方式取 exit code）：

| 命令 | 退出码 | 读数 |
|---|---|---|
| `--surfaces --global-root Z:\no-such-414` | **0** | 30 格跑满：24 PASS + 6 WARN（全 unknown 代 fail-closed）+ 0 SKIP + 0 FAIL |
| `--global-root Z:\no-such-414`（行级） | **2** | `[nv-compat] 用法错误（exit 2）：--global-root 目录缺少 @deepseek-ai 闭包`——行级行为不变 |
| `--surfaces`（pristine） | **0** | 汇总 total 30 \| pass 24 \| warn 6 \| skip 0 \| fail 0 |

## 5. 门禁复跑（全部真跑）— PASS

| 门禁 | 本复审读数 | 申报 |
|---|---|---|
| `node --check` probe / preflight | 0 错（×2） | 同 |
| `node test/smoke.mjs` | **SMOKE DONE: 342 passed, 0 failed**（exit 0） | 同 |
| `node test/preflight-preset-rows.test.mjs` | **PREFLIGHT TEST PASSED (16)**（exit 0；含 ⑥ surfaces 组与 R2 N1 注入可审计断言） | 同 |
| `node scripts/verify-contract-anchors.mjs` | 共 79 段；**FAIL = 0**；WARN = 24 | 同 |

## 6. 偏离 3 条裁量 — 均可接受

1. **隔离方式等效性**：内建隔离（官方 CLI + mkdtemp + CDP + C7 零写入判据）≥ 任务书手动配方纪律，且本复审复跑实证 containment/token 脱敏/指纹复核/只杀自启树全真。接受。
2. **长告警 shape='block'**：noticeShape 返回 data-form 事实值（'row'/'block'）而非任务书二值字面——C5 消费面（shortRecs）实测只有 chip/row，block 落 longRecs 且在双臂下必不过（fail-closed 不变）；如实记录优于失真。接受。
3. **「8/8」口径**：延续 R1「6 判据 + C5×2 视口记录」单元口径，报告 verdict 对象 7 条全绿已明示。接受（与 F1 措辞问题相邻，见下）。

## 7. Findings

- **F1（P3 · 文档措辞 · docs/evidence/CLEAN-014/README.md:21）**：「其余 7 判据（C1-C4/C6/C7）与其测量零改动」——所列判据 ID 为 **6** 个（判据总数 7 含 C5），与 §3 自述「6 条判据 + C5 两条视口记录」口径不一致。修复：改为「其余 6 判据」。非阻断，建议提交前顺手订正。

观察项（不计级）：

- `.governance/tpa-last-run.json` 工作树修改 = 治理缓存 `plan_tracker_mtime` 刷新（1792918062→1792934040），开发者申报非其会话所为；归属无法从工作树复核，非产品码，不影响本审查结论。`.governance/plan-tracker.md.lock` 同属未跟踪既有态。
- chip 臂 `textOverflow=ellipsis` 是 chip CSS 属性值，C5 不断言之（旧判据同样不断言）；裁切风险已由 `truncated`（scrollWidth/clientWidth）守卫覆盖，非弱化。

## 8. 复审自身约束证明

- 零产品码/证据码改动：两脚本 SHA256 复审前后一致——`probe-nv-bar-geometry.mjs` = `2F81FC0790C1055DF3E7C36026F76DB8428799AA21D7111D45F2B14890FDE3A7`；`preflight-preset-rows.mjs` = `9CFC60DD0EC5CF5AEAECE10F1DF51D09F912F86F62E9DACB584367AF7E8B08B6`；`git status` 集合复审前后不变（本报告为唯一新增文件）。
- 未写 `.governance/`、未 commit、未跑 review-record；探针复跑产物全部落 `%TEMP%\ux060-probe-*`（仓外）。

## 9. 提交建议

**建议提交**：C5 形态感知双臂实现对旧判据的非弱化刷新（裁决 A 落地），N1 与 R2-F3 守卫族一致，四门禁 + 探针双跑全绿；唯一 finding 为 P3 文档措辞，随提交订正 README:21 后即可收口。
