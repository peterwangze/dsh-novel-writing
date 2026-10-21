# REVIEW-UX-061-P2-CR1 — UX-061 阶段 2（方向 B）Code Review

```
REVIEW-UX-061-P2-CR1 NEEDS_CHANGE / unresolved_blockers=2
```

- 审查对象：工作区未提交改动 vs HEAD `0974d62`（`lib/client.js` **+126/−71（净 +55）**、`lib/host-contract.mjs` 22/21、`test/smoke.mjs` 53/32、`README.md` 1/1、设计文档 +2、迁移表 +34/−1、新增 `scripts/verify-visual-geometry.mjs`）
- 审查日期：2026-10-21
- **结论：不可提交**（P1×2：章节行字号被删成 UA 默认值；`.nv-content p` 段距被后置规则静默覆盖、旧断言仍在但已失效）。
- 本审查除静态核验外，用 **headless Edge 实测**（规则从 `lib/client.js` 抽取）+ **标识符声明顺序扫描** + **令牌消费严格口径重算**，未修改任何产品文件。

---

## 一、P1（阻塞）

### P1-1 章节行字号：内联 `fontSize:'12px'` 被删但**没有替代** ⇒ 实测变为 UA 默认 13.3333px
- 证据：`lib/client.js:2048-2057` 章节行内联样式被裁为只剩 `display/alignItems/gap/width/boxSizing/textAlign/cursor`，**`fontSize:'12px'` 消失**；新类规则 `.nv-chrow{box-sizing:border-box;height:28px;margin:0;padding:0 var(--nv-sp-3,8px);border:none;border-radius:0;background:transparent;color:var(--nv-fg-muted)}`（L5195）**没有 `font-size`，也没有 `font:inherit`**。
- headless Edge 实测（插件 CSS + `<button class="nv-chrow">`，无宿主干扰）：`getComputedStyle().fontSize = 13.3333px`（Chromium 对 `<button>` 的 UA `font` 默认值），`height=28`；旧版（HEAD）同节点为 **12px**。
- 影响：章节列表是核心阅读/操作面，字号从 12 → 13.33px（+11%），且**不再受设计令牌控制**（设计文档 §2.2 字号规格：meta 12）；「内联字号基线 23→18」中这一处属**删除而非迁移**，与迁移表自述「随类化迁移」不符。
- 最小修复：`.nv-chrow` 增加 `font:inherit;font-size:var(--nv-fs-base)`（若 Design 定为别的档位则用对应令牌），并在 smoke 断言 `.nv-chrow{` 段内含 `font-size:var(--nv-fs-base)`；修后 headless 复测应为 12px。

### P1-2 `.nv-content p` 段距被后置规则覆盖，旧断言仍在但**已失效**
- 现状：旧规则 `L5151 '.nv-content p{margin:.75em 0;font-size:inherit;line-height:inherit}'`；本批在 L5180 追加 `'.nv-content p{margin:0 0 var(--nv-sp-6,20px)}'`（同一样式表更靠后）⇒ 同特异性后者胜。
- headless Edge 实测：`p margin-top = 0px`、`margin-bottom = 20px`（旧值 `.75em`≈11.25px 双向）；`p font-size=15px / line-height=26.25px` 未变。
- 双重问题：①**设计口径偏离**——设计文档 §2.2 令牌规格写「段距 1em」，实现是 20px 且上边距归零；②**断言失效**——`test/smoke.mjs:1406` 仍断言旧串 `.nv-content p{margin:.75em 0` 存在而**恒绿**，但生效规则已是后置那条 ⇒ 这正是「只改判据、不删守卫」原则被绕过（测试证明不了实际渲染）。
- 最小修复：合并为**单一** `.nv-content p` 规则（把 margin 写进旧规则并删除后置那条），按 Design 口径定值（1em≈15px 或显式批准 20px 并登记）；断言改为对**生效规则**的精确串（或至少断言后置规则不存在）。

## 二、P2（不阻塞，但需处置）

1. **B-9 / B-10 没有 smoke 断言**：迁移表 §7 写「只改判据、不删守卫」，但 B-9（`--nv-measure`/`.nv-content`/`.nv-edwrap`）与 B-10（`@keyframes`/`animation:`/`infinite` 全零）**没有任何 smoke 断言**；B-9 只靠 `scripts/verify-visual-geometry.mjs`（未接 CI），B-10 只靠 Coordinator 手工计数。建议补两条廉价断言：`!/@keyframes|animation:|infinite/` 与 `.nv-content{max-width:var(--nv-measure` + `.nv-edwrap{max-width:var(--nv-measure` 存在。
2. **几何脚本未接入 CI / package scripts**：`.github/workflows/ci.yml` 只跑 `node test/smoke.mjs`；Edge 缺失时脚本 `exit 3`（跳过）。因此它**不是 CI 门禁**，而是本地手跑工具——「会不会在 CI 里永远跳过」的答案是「根本不会在 CI 跑」。建议接入 windows runner（Edge 自带）并在 README/迁移表注明「本地无 Edge 时 exit 3 为跳过、CI 必须真跑」。
3. **迁移表缺 3 项披露**：①数据面板表格字号 12→**13.5**（`.nv-dtbl{font-size:var(--nv-fs-card)}`）、`.nv-dcard-title` 12→13.5（设计文档与契约 revisions 文本都写「表格 13px」——**三方不一致**）；②阶段 pill 13→13.5（`.nv-stage-pill`）；③rail 的状态由**可见文字**（未绑定/会话失效/运行中）改为**纯图标 + title/aria-label**——可访问名仍在，但可见状态文案消失，迁移表 B-1 未披露，需 Design 确认这是否为方向 B 的预期。
4. **重复/冲突 CSS 未清理**：`.nv-chrow{` 出现 **2 次**（L5130 旧 + L5195 新）、`.nv-chrow[data-sel=true]` 出现 **2 次**（旧 L5132 仍含 accent 10% 底色，仅因顺序被新规则覆盖——顺序一变即复活）、`.nv-ccard-name{` 出现 **2 次**（L5022 已含 17px，L5199 冗余）。建议删除旧规则并加负断言（如 `!includes('background:rgba(79,142,247,.1)')`）防复活。
5. **契约 revisions 事实失准**：声称「`lib/client.js` 本批 +123/−68」→ 实际 **+126/−71**（净 +55 一致）；声称「24 条 lib/client.js 行引用按实测重基」→ diff 实测 **20 条**（`{ face:` 行 20 增 20 减）＋ revisions 1 条。请按实测订正文案（不影响 anchor FAIL=0）。

## 三、P3
- `compactCard` 已成为死变量（`L2171` 定义，本批删除了它的消费者，无其它引用）。
- `data-wf-status` 属性（`L4305`）无任何 CSS/JS 消费者（死属性）。
- 迁移表 B-4 写 `--nv-display-s`，实际令牌名 `--nv-fs-display-s`。
- smoke B-1 替换处有重复注释残留（`// …工具栏 // 底行容器左缘 10px…`）。
- 新「未消费尺度令牌 = 0」断言按全文件计数（`:root` 内互相引用也算消费）；我按**更严口径**（排除 `:root` 行）复核：26 个定义 **全部有外部消费（0 例外）** ✓ —— 结论成立，但断言方法学偏弱，建议排除 `:root` 行计数。

## 四、逐项核验结论（通过项）

| 核验项 | 结果 |
|---|---|
| **rail 行为零变更** | ✅ 三个按钮 `onClick`（launchWorkflow / compactWf / bindNewSessionCtl）、`disabled: wfBusy \|\| degraded`、`data-mode` 三元、`title` 语义与旧版逐项一致；新增 `role="toolbar"`、`aria-label`、每钮 `title`；未引入 `outline:none`，`.nv-chrow/.nv-ft-row` 的 focus-visible 双环保留 |
| **TDZ 修复彻底** | ✅ rail 位于 L4302；其引用标识符声明均在其前：`wfBusy` L3918（useState）、`current` L3903、`boundId` L3921、`degraded` L4143、`boundEntry` L4146、`wfRunning` L4154、`launchWorkflow` L4159、`compactWf` L4207、`bindNewSessionCtl` L4245、`mainLabel` L4276、`statusText` L4279、`curStage` L4288、`titleStageName` L4289；`curStage/titleStageName` 旧声明已删除（各仅 1 处定义）。其它新增 JSX（edwrap / 数据面板 / stage-pill）无同类前向引用 |
| **数据面板类化只动呈现** | ✅ `th/td` 顺序与取值映射不变、`onChange/setForm/disabled` 未动、`data-sev` 仅映射颜色（high→err / 其余→warn，与旧 ternary 一致）；`<strong>`→`<b>` 语义等价 |
| **守卫替换** | 8/10 有自动替代（B-1 rail 宽/role/aria/title；B-2 负断言 + ccard padding；B-3 TITLE_BAR_H/36px；B-4 负断言 + 书脊线 + 书名令牌；B-5 选中态新精确串；B-6 hover 只提边框；B-7 radius 令牌；B-8 未消费令牌检查）；**B-9/B-10 见 P2-1**。smoke 309→310 与迁移表一致 ✓ |
| **内联字号基线变更** | 6 处移除中 **5 处有令牌/类替代**（cellStyle→`.nv-dtbl`、sigRowStyle→`.nv-dsig`、2×dcard title→`.nv-dcard-title`、stage pill→`.nv-stage-pill`），**1 处（章节行）无替代 → P1-1**；签名 `12px:23→18 / 13px:6→5` 与移除数吻合 |
| **几何脚本可信度** | ✅ 规则由 `rule()` 从 `lib/client.js` 抽取（非内置期望自证）；`:root` 亦从源码抽取；`.nv-content` 15px 等效值已在文件头如实披露；我实跑得到 `rail 44 / measure 510 / edwrap 510 / chrow 28 / cinput 32`（与自述一致）；缺口见 P2-2 |
| **契约重基** | ✅ `node scripts/verify-contract-anchors.mjs` → **76 段 / FAIL 0 / WARN 24**；行数净 +55 与 anchor 一致；文案数字见 P2-5 |
| **令牌零未消费** | ✅ 严格口径复核：26 定义、排除 `:root` 行后 **0 个无消费者** |
| **循环动画清零** | ✅ `@keyframes=0 / animation:=0 / infinite=0`（无自动断言，见 P2-1） |

## 五、门禁真跑（本审查独立执行）
| 命令 | 结果 |
|---|---|
| `node --check lib/client.js lib/host-contract.mjs test/smoke.mjs scripts/verify-visual-geometry.mjs` | 全 exit 0 |
| `node test/smoke.mjs` | **310 passed, 0 failed**（README/A-F9 310 自洽） |
| `node test/validate-preset.mjs` | PRESET VALIDATION PASSED |
| `node test/fixtures/host-surfaces/probe-face.mjs` | **OK：28/28** |
| `node test/fixtures/host-surfaces/ci-mock-face.mjs` | OK：4/4 |
| `node scripts/verify-contract-anchors.mjs` | **76 段 / FAIL 0 / WARN 24** |
| `node scripts/verify-contrast.mjs` | `FG_MUTED_ROWS=4 V3_BELOW_4.5=0` |
| `node scripts/verify-visual-geometry.mjs` | **OK**：rail 44 / measure 510 / edwrap 510 / chrow 28 / cinput 32 |
| 附加：headless 实测 `.nv-chrow` 字号 / `.nv-content p` 边距 | **13.3333px（旧 12）** / **0px + 20px（旧 .75em 双向）** |

## 六、待验证（不得视为通过）
- G-5 明/暗/合成主题 × 4 视图 × 七态真实目检（含 rail 可用性、阅读宽度节奏、书脊线观感）。
- 0.1.x 宿主降级；rail 在窄中窗（< 400px）下的表现；`writing-mode:vertical-rl` 阶段文字在宿主题字体栈下的表现。
- 可见状态文案→图标（title/aria-label）对可发现性的影响（需用户/Design 判断）。

## 七、结论
`NEEDS_CHANGE / unresolved_blockers=2`（P1-1 章节行字号无替代；P1-2 `.nv-content p` 段距被覆盖且旧断言失效）。
修 P1 后发本 Reviewer 窄口径 CR2：只需 ①headless 复测 `.nv-chrow` 字号=12、`.nv-content p` margin 与所批准口径一致 ②smoke/anchor 双绿 ③P2-1 的两条断言若顺手补上请一并说明。其余 P2/P3 可随提交说明登记（不阻塞）。
