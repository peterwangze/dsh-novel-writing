# REVIEW-UX-061-1B-CR1 — UX-061 阶段 1b（视觉重设计批次）Code Review

```
REVIEW-UX-061-1B-CR1 NEEDS_CHANGE / unresolved_blockers=2
```

- 审查对象：工作区未提交改动 vs HEAD `2379687`（`lib/client.js` +47/−36、`lib/host-contract.mjs` +4/−4、`test/smoke.mjs` +7/−6、`docs/verification/UX-061-assertion-migration.md` 新增）
- 审查日期：2026-10-21
- 审查方式：只读产品代码；所有数字/行号均由本审查独立实测复算（不采信 Developer 自述）
- 结论性质：**P0=0 / P1=2**；两项 P1 均为「设计裁决材料的事实性错误」（非功能性缺陷），最小修复为文档订正或 5 处非文本用法回退

---

## 一、逐项核验（对审查任务 7 项）

### 1) 状态色文本档派生口径（P1-2 见下）
- 实现：`:root` 新增 `--nv-ok-text/--nv-warn-text/--nv-err-text` = `color-mix(in srgb, var(--nv-<state>) 62%, var(--nv-fg))`（`lib/client.js:4797` 单行）。
- 我独立复算（WCAG 2.x 相对亮度 + `(L1+.05)/(L2+.05)`；color-mix in srgb 按 gamma 编码通道线性加权）：
  | 主题 | 基准 | ok | warn | err |
  |---|---|---|---|---|
  | light | bg `#ffffff`，fg `#0f1115`，raw ok `#22c55e` / warn `#f59e0b` / err `#ec1313` | raw 2.28 → **派生 4.92** | raw 2.15 → **派生 4.73** | raw 4.50 → **派生 8.64** |
  | dark | **宿主实值** bg-layer-1 `#232324`，fg `#f9fafb`，err `#f25a5a` | raw 6.89 → **派生 9.07** | raw 7.31 → **派生 9.55** | raw 4.77 → **派生 7.30** |
  | dark | 宿主实值 bg-base `#151517` | 派生 10.54 | 派生 11.09 | 派生 8.47 |
  - 亮态三项与 Developer 报告数字**逐位一致**（4.92/4.73/8.64）✓
  - 暗态数字**不一致**（报告 11.16/11.75/6.49）：我按报告的基准（bg `#0b0e14` + err `#ec1313`）可精确复现其数字 ⇒ 其暗态基准是**1a 之前的暗色兜底值**，不是宿主真实令牌值（详见 P1-2）。结论（≥4.5:1）在真实基准下仍成立，但证据基准失真。
- 文本/非文本用法：**「非文本用法保持原令牌」不成立**（详见 P1-1）：`.nv-dot[data-st=*]` border-color ×3、`.nv-cico-del:hover` border-color、`.nv-cdot[data-bound=*]` color（经 `currentColor` 注入 `::before/::after` 背景）共 5 类站点切到 `-text` 档。
- 62% 系数的依据：文档只给结论（"派生"），**无推导过程**（为何 62% 而非 55%/70%，是否存在最小可读约束反解）⇒ 设计裁决时应要求给出选择依据，或改用宿主 label 档令牌（宿主仅 `state-warn-label` 存在，success/error 无 label 档——此边界文档已披露 ✓）。
- `color-mix` 兼容性：新增 `-text` 令牌**只有单声明**，无既有「先 rgba 兜底后 color-mix」双声明形态；不支持 color-mix 的运行时该 custom property 存在但值非法 ⇒ 声明在 computed-value 阶段失效、`color` 继承父色（**不会**落到 `var()` 的 fallback）。宿主 Chromium 是否 ≥111 **未验证**（待验证）。

### 2) chip 类化零行为变更 ✓（P2-5 附注）
- 5 处状态 span（`lib/client.js:4290/4292/4294/4296/4297`）由内联 `style` 改为 `className:'nv-wfchip'` + `data-tone`；DOM 元素/子节点/`title`/条件分支/事件**零变化**（diff 逐 hunk 核对）。
- 样式等价性：`display:inline-flex` / `align-items:center` / `gap:4px`=`--nv-sp-1` / `font-size:12px`=`--nv-fs-base` 全等价；**新增** `line-height:var(--nv-lh-tight)`（1.45）——原内联形态继承父行高，属未披露的微小视觉变更（P2-5）。
- `data-tone` 取值：实际使用 `err`/`muted`/`running` 3 档（5 分支映射），CSS 另定义 `warn`/`ok` 两档**无消费者**（P2-3）；「四态统一 chip」表述与实现不完全对应（P3-2）。

### 3) `ensureStyle()` HMR 重写 ✓ 安全
- `lib/client.js:5163-5180`：命中既有 tag 时 `if (tag.textContent !== NV_STYLE) tag.textContent = NV_STYLE`。
- 关键校验：`NV_STYLE` 是 `.join('')` 的**字符串**（`lib/client.js:5160`），比对与赋值同型 ⇒ 无 array→"a,b,c" 拼接陷阱（本审查专项排查）。
- 风险面：①内容相同不重写 ⇒ 无无谓重解析；②首次挂载路径未变（不存在时 create+append）；③用户/他插件改写该 tag 会被覆盖（插件自有 id，可接受）；④cleanup 仍为 no-op（既有语义，HMR 卸载不清理 style）——不因本批引入新问题。

### 4) 契约行号重基 ✓
- `node scripts/verify-contract-anchors.mjs`（我实跑）→ **共 76 段 / FAIL 0 / WARN 24**，与声称一致。
- 手工复读：`2.3` `L5190-5192` = `const inject = ['slots']` / 空行 / `function apply(ctx) {` ✓；`2.12` `L5220-5227` = `const offServiceEvent = …` / `: null` ✓；`2.13` `L5257-5289` = 首个 `ctx.slots.inject('settings.section'…)` / 末个 inject / `))` ✓。
- 行数账：HEAD 5317 → 当前 **5328（+11 = +7 chip CSS + +4 ensureStyle）**；插入点均在 5078 之后 ⇒ 仅 2.3/2.12/2.13 需 +11，其余条目不漂移（与 patch 事实一致）。
- `revisions[]`：1b 内容**并入 1a 条目**，未记 1b 净行数（P2-4）；「暗/亮均 ≥4.5:1」结论为真（真实基准下成立），但「既有规则行漂移复基」表述准确、脚本可复现 ✓。

### 5) 守卫是否被放宽 —— 未放宽，但有 1 处 tripwire 形态变化
`test/smoke.mjs` diff 只动 3 条设计断言 + 1 处行号副本注释：
- UX-053 光效收敛：`linear-gradient` 正断言 → **精确类串正断言 + 负断言**（`!includes('…4%…')`），并**删除**独立 `box-shadow:0 1px 3px` 断言（新精确串内含 `box-shadow:none` 覆盖，P3-3）。
- UX-055①：`meta: 11` → `meta: 12`（M-1 授权变更）。
- UX-055③：hover 7% 渐变断言 → 新 hover 精确串（M-3 授权变更）；白 alpha 负断言保留。
- 未发现「只删不加」或放宽判据；glow/focus 双环断言原样保留 ✓。
- **注**：以上三条属 DEC-155 授权的设计契约变更，但断言随实现同步改写 ⇒ 权威须由 Design Reviewer 裁决（M-1~M-3 已标「待裁决」，未自签 ✓）。

### 6) 诚实性核验（关键）
| 声称 | 实测 | 判定 |
|---|---|---|
| 数据面板标题 14→20 未做 | 全文 `fontSize: 14` = **0 处**；`DataPanel` 无独立标题规则（`lib/client.js:2132` 仅注释分节）；`fontSize: 20` 字面量 0 处（`TYPO.page` 承担 20px） | **属实**；且暴露**设计文档 §2.1 该项前提与代码不符**（P2-1） |
| 24 个尺度令牌仅启用 5 个 | 定义 24 个（`fs×7`/`sp×7`/`r×5`/`ctl×2`/`lh×3`）；真实消费者 = `fs-base`/`sp-1`/`sp-2`/`r-xl`/`lh-tight` = **5 个**（其余计数 1 = 仅 `:root` 定义） | **属实** |
| `font-size:` 字面量仍 48 处 | `font-size:` 字面量 = **48**（另 `fontSize:` 字面量 44） | **属实** |
- 结论：该 Developer 的三项负面自述**全部属实**，可托付度高（无美化）。

### 7) 迁移表质量
- M-1~M-4「旧判据 → 新判据 → 依据 → 状态」四列完整，状态统一「待裁决」，**未自签** ✓；§4「1b 未交付项」如实列出（数据面板/19 令牌/浏览器目检/全套断言）✓。
- 缺陷：M-4 的「非文本用法保持原令牌」与实现不符（P1-1）；§2 暗态基准失真（P1-2）；复现脚本在 `.scratch-ux061b/contrast.mjs`（**不在仓**，且该目录已被 gitignore）⇒ 可复现性依赖文档内联输入值，而输入值有误。

---

## 二、发现清单

### P1（阻塞本轮通过）
- **P1-1 迁移表 M-4 与实现不符（非文本用法切到文本档）**
  位置：`lib/client.js:4839` `.nv-dot[data-st=need]{border-color:var(--nv-warn-text…)}`、`:4840`（done→ok-text）、`:4841`（stale→err-text）、`:5022` `.nv-cico-del:hover{…border-color:var(--nv-err-text)}`、`:5044-5046` `.nv-cdot[data-bound=*]{color:var(--nv-*-text)}`（经 `currentColor` 进入 `::before/::after` 背景）。
  影响：Design Reviewer 将以「非文本保持原令牌」为前提裁决 M-4，而实现并非如此；状态点的边框/填充实际使用更暗（亮态）/更亮（暗态）的文本档色，形成「亮边+暗底」混合层级，且该选择无设计依据落档。
  最小修复（二选一）：(a) 订正 M-4 与设计文档：明确「状态点边框/图标填充亦使用文本档以提高亮底可见性」，并作为 M-4b 独立交 Design 裁决；(b) 将上述 5 类站点回退 `--nv-ok/--nv-warn/--nv-err`，使实现与声明一致（仅文本用法用 `-text`）。

- **P1-2 对比度表暗态基准失效（结论仍成立，证据不可复现）**
  文档 `docs/verification/UX-061-assertion-migration.md:18,25-27`：暗态 bg 用 `#0b0e14`（1a 之前的暗色兜底；1a 后 `:root` 兜底已改亮色，宿主实值 = bg-layer-1 `#232324` / bg-base `#151517`），err 用 `#ec1313`（宿主暗态 error = `#f25a5a`）。
  我的复算：按文档基准可精确复现其 11.16/11.75/6.49；按宿主实值为 9.07/9.55/7.30（layer-1）或 10.54/11.09/8.47（bg-base）。
  影响：结论（≥4.5:1）不变，但「可复现」不成立、裁决依据失真；且暗态原始状态色本已 ≥4.5（ok 6.89 / warn 7.31 / err 4.77），暗态是否需要派生文本档本身是设计取舍，需 Design 明确。
  最小修复：表体改用宿主真实令牌值并注明基准（bg-layer-1 与 bg-base 两行、暗态 err `#f25a5a`）；复现脚本移入 `scripts/` 或把输入值全部内联（含取色来源路径）。

### P2（不阻塞合并，需处置/移交）
- **P2-1 交付缺口（Coordinator + Design 决策）**：①数据面板标题 20px 未做——且代码中**不存在该 14px 标题规则**，说明设计文档 §2.1 该项前提有误，应订正设计文档或并入 UX-062 数据面 IA；②24 个尺度令牌仅启用 5 个，与 1b 范围「尺度令牌启用（24）」不符，建议拆 1b-2（逐规则迁移 + 逐条断言迁移），并同步验收口径。
- **P2-2 新 `-text` 令牌缺旧浏览器降级形态**：既有色值写法均为「先 rgba 兜底后 color-mix 双声明」，本批 `-text` 仅单声明 color-mix；不支持时 `color` 继承而非回落状态色。建议补 `@supports` 或双声明兜底。
- **P2-3 `.nv-wfchip` 死规则**：定义 muted/running/err/warn/ok 5 档，实际消费 3 档（warn/ok 无引用）。
- **P2-4 `revisions[]` 批次粒度**：1b 内容并入 1a 条目，且未记 1b 净行数（5317 → 5328 / +11）；建议 1b 独立条目（审计可追溯），或在 1a 条目内补 1b 票据与行数事实。
- **P2-5 未披露的微小视觉变更**：`.nv-wfchip` 新增 `line-height:1.45`（原继承父行高）。

### P3
- P3-1 `marksEls` 内联兜底 `#19763d` 与其他站点 `#3fb950` 不一致（当前不生效，易误导）。
- P3-2 「四态统一 chip」表述与「5 分支 → 3 tone」实现不对应，建议措辞收敛。
- P3-3 M-2/M-3 移除了独立 `box-shadow:0 1px 3px` 断言，改由整条 `.nv-ccard{…}` 精确串覆盖 `box-shadow:none` ⇒ 可接受，但独立 tripwire 消失（Design 裁决时知悉）。
- P3-4 `ensureStyle` 命中即重写时 cleanup 仍为 no-op（既有语义，本批未引入）。

---

## 三、明确移交 Design Reviewer（我不代裁）
1. M-1（meta 11→12）、M-2（书卡去渐变）、M-3（hover 去 7% tint）、M-4（状态色文本档）四条新判据是否接受。
2. 状态色文本档策略：62% 系数的依据；是否改用宿主 label 档（宿主仅 `state-warn-label` 可用）；暗态是否仍需派生（原始色已 ≥4.5）。
3. 状态点/图标边框是否允许使用文本档（P1-1 的 (a)/(b) 取舍）。
4. 设计文档 §2.1「数据面板标题 14→20」前提失实（代码无该规则），需订正或改派 UX-062。

## 四、门禁真跑（本审查独立执行）
| 命令 | 结果 |
|---|---|
| `node --check lib/client.js lib/host-contract.mjs test/smoke.mjs` | 全 exit 0 |
| `node test/smoke.mjs` | **SMOKE DONE: 308 passed, 0 failed** |
| `node test/validate-preset.mjs` | PRESET VALIDATION PASSED（schema-face: PASS） |
| `node test/fixtures/host-surfaces/probe-face.mjs` | **OK：28/28** |
| `node test/fixtures/host-surfaces/ci-mock-face.mjs` | OK：4/4 |
| `node scripts/verify-contract-anchors.mjs` | 76 段 / **FAIL 0** / WARN 24（exit 0） |

## 五、待验证（本审查无浏览器，不得视为通过）
- 明/暗/合成主题目检、4 视图、七态、真实取色对比度（尤其 chip/dot 在 tint 背景上的表现）。
- 宿主 Chromium 对 `color-mix` 的支持版本（`-text` 单声明无降级）。
- 0.1.x 宿主上 `-text` 底层令牌缺失时的 `:root` 兜底表现（现兜底为亮色值，旧暗主题下可能偏高）。

## 六、结论与后续
`NEEDS_CHANGE / unresolved_blockers=2`（P1-1、P1-2 均为**材料/文档事实性**修复，不要求改动已交付的视觉逻辑）。
修复后按 T1 由本 Reviewer 复审 R2（窄口径：M-4 口径一致性 + 暗态对比度表复算 + `-text` 降级形态 P2 是否采纳）。
1b 的「未交付项」（P2-1）**不是**本轮代码阻塞，但需 Coordinator 明确接受「部分交付」或拆分 1b-2，并由 Design Reviewer 对 M-1~M-4 出裁决；在 Design 裁决前，1b 不得宣称 A 迭代验收通过。
