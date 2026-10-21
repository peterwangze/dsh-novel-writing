# REVIEW-UX-061-R3 — 工作台 UI 视觉重设计 · 阶段 1a（R3 窄口径收口确认）

```
REVIEW-UX-061-R3 APPROVED_WITH_NOTES / unresolved_blockers=0
```

- **审查对象**：工作区未提交改动 vs HEAD `4ad3450`（`lib/client.js` +174/−173、`lib/host-contract.mjs` +21/−15、`test/smoke.mjs` +55/−51、新增 `scripts/verify-contract-anchors.mjs`）
- **上轮**：`REVIEW-UX-061-R2 NEEDS_CHANGE / unresolved_blockers=1`（P1-3 3.8 漂移 + P2-N1 行数陈述）
- **审查范围**：窄口径单点确认（三项 delta + 4 处锚点修复 + 脚本判据），未全量重审
- **审查日期**：2026-10-21 · **审查者**：Code Reviewer（独立；只读产品代码，唯一写入 = 本报告）

---

## 一、逐项证伪结果（全部由我对源码复读/实跑，不看转述）

| # | Developer 声称 | 我的核验 | 判定 |
|---|---|---|---|
| 1 | 3.8 `L3066-3076` → `L3075-3086` | 契约 `:160` 现为 `L3075-3086`；`lib/client.js:3075` = `function findSidebarEl() {`、`L3081` = `if (typeof el.className === 'string' && /SidebarRoot\|sidebar/i.test(el.className)) return el`、`L3084` = `try { return document.querySelector('aside, nav, [class*="SidebarRoot"], [class*="sidebar"]') ?? null }`、`L3086` = `}`。**声明的两类证据（宿主类名正则 / selector 兜底）都已在区间内** | ✅ 闭环 |
| 2 | revisions 行数改 `5316 → 5317` + 披露 | 契约 `:86` 现为「`lib/client.js` **5316 → 5317 行**（本批唯一净增行 = `NV_STYLE` 首条 `:root` …；**行数账口径披露**：上一次记账为 CLEAN-006 R2 的 5275，此后 …）」；我实测 HEAD `5316` → 当前 `5317`（`ReadAllLines`），与唯一净增 hunk `@@ -4796,0 +4797 @@` 一致 | ✅ 闭环 |
| 3 | 新增只读脚本，判据 F1/F2/F3，输 76/0/24 | 实跑 `node scripts/verify-contract-anchors.mjs` = **共 76 段；FAIL = 0；WARN = 24**，exit 0；`--json` 可复现；`grep verify-contract-anchors` 于 `.github/workflows/ci.yml` 与 `test/smoke.mjs` **零命中** ⇒ 确未接 CI、未改 smoke 判据 | ✅ 与声称一致 |
| 4a | 3.7 → `L993/L995/L1060` | 三行分别是 `const SPLIT_PERSIST_KEY = 'dsh.novel.split.v1'` / `const DEFAULTS_PERSIST_KEY = 'dsh.novel.defaults.v1'` / `const ORDER_PERSIST_KEY = 'dsh.novel.order.v1'` —— 与 3.7 symbol 的三个 storage key 逐字一致 | ✅ |
| 4b | 5.3 → `L58/L62/L87` | `agent.cordis.yml`：`L58` = `disabled: !!js process.platform === 'win32'`、`L62` = `disabled: !!js process.platform !== 'win32'`、`L87` = `- !!js "process.getBuiltinModule('node:url').fileURLToPath(new URL('skills/', baseUrl))"` —— 与 5.3 symbol（平台分流 / skill 目录解析）逐项对应 | ✅ |
| 4c | 1.10 → `L194/L199/L204` | `lib/host-boundary.js`：`L194` = `export function loggerOf(ctx) {`、`L199` = `export function logWarn(ctx, message) {`、`L204` = `export function emitChanged(ctx, payload) {` —— 与 1.10 symbol（`ctx.emit('novel-writing/changed')` + `ctx.logger` 的边界收口）对应；原始 `ctx.logger`/`ctx.emit` 调用分别在 L195/L200/L205（紧邻区间内），无证据缺口 | ✅ |
| 5 | 撤回「30 段无漂移」声明；1.4 `line` 为散文形态、脚本不判 | 契约 `:110` 1.4 `line: '原 L19 → 现 L45 字符串常量'`（散文形态，非 `L<起>-L<止>`）；脚本 `parseItems` 的段过滤只接受纯区间形态 ⇒ 1.4 **不出现在 76 段内**（我在 `--json` 输出中确认无 1.4 行）——即「checked 76」是**排除 1.4 之后**的覆盖数，披露属实 | ✅ 披露准确 |

**关于「30 段」撤回**：Developer 已撤回并改为「全量结论附脚本输出」，我接受该纠正；本轮 76 段复跑结果与其声称一致。该数字口径（76 segments vs 契约条目数）在脚本输出中自明，不再构成歧义。

## 二、脚本判据 F1 对「3.8 形态」的防护力评估（对应请求 b）

**结论：F1 足以防住 3.8 这一形态的复发；但有 5 条已知缝，均属「更好」而非「必须」，交由 1b/CLEAN-011，不阻塞 1a。**

- **能防住**：F1 要求「起点 ±2 行命中主构造（symbol 的首个声明式标识符/函数名）」。3.8 的旧起点 `L3066`（`noticeEl,`）±2 窗口为 L3064–L3068，无 `findSidebarEl`，且该行非注释/空行 ⇒ 走 `fails` 分支 ⇒ **FAIL**。同理 R1 的 2.12 旧起点（`const rerender = …`）也会被 F1 抓住。这条判据正面堵住了 ⑫b 的缝。
- **缝 1（起点为调用点）**：若有人把起点设在 `const sb = findSidebarEl()` 这类**调用行**，±2 窗口命中主构造 ⇒ F1 判 OK。建议 1b 增加「主构造上下文须为声明形态（`function X(` / `const X` / JSDoc 前导），排除 `X()` 调用行」。
- **缝 2（终点截断）**：F3 对终点只做「空行/注释 → WARN」，不校验「终点须闭合所声明构造」。例如 3.8 若把终点设在 `L3080` 仍会 PASS。建议补「终点不得早于主构造的闭合行」或用符号级配平（仅对声明式构造，避免误报 2.1/2.3 类非配平片段）。
- **缝 3（无声明式主构造的条目）**：24 条 WARN 均来自 `primary === null`，F1 对它们只降级为提示 ⇒ 这批条目仍无「起点相关」机检力。
- **缝 4（1.4 散文形态被静默排除）**：脚本对不可解析的 `line` 形态既不计数也不报 WARN ⇒ 覆盖缺口不可见。建议：`parseItems` 对「含 `L\d+` 但不匹配区间形态」的条目输出 `SKIP` 行并计入汇总（或直接列 FAIL-SKIP），把 1.4 显式化。
- **缝 5（工具不入 CI 会腐烂）**：脚本未接 CI/未加 `package.json` scripts，属手工工具；建议 1b 把 `node scripts/verify-contract-anchors.mjs` 加入 sanity job 与 `npm` script（脚本已 exit 非零 on FAIL，接入成本低）。

以上 5 条均**不影响本轮 1a 的正确性**（当前 76/0/24 可复现、4 处锚点逐一落地），是否必须在 1b 修由 Coordinator 决定；我的建议是至少接入 CI（缝 5）与 1.4 显式化（缝 4），其余随 ⑫b 增强一并做。

## 三、门禁真跑（当前工作区）

| 命令 | 结果 |
|---|---|
| `node scripts/verify-contract-anchors.mjs` | **共 76 段；FAIL = 0；WARN = 24**，exit 0 |
| `node --check lib/host-contract.mjs` / `test/smoke.mjs` / `scripts/verify-contract-anchors.mjs` | 全 0 |
| `node test/smoke.mjs` | **SMOKE DONE: 308 passed, 0 failed** |
| `node test/validate-preset.mjs` | **PASSED**（schema-face PASS） |
| `node test/fixtures/host-surfaces/probe-face.mjs` | **28/28 OK** |
| `node test/fixtures/host-surfaces/ci-mock-face.mjs` | **4/4 OK** |

smoke 本轮 +2/−2 全部是 **⑫b 注释内契约行号副本的同步**（`2.3 L5179-L5181` / `3.8 L3075-L3086`，COMPAT-015 F3 要求同源），**无断言新增/删除/放宽**；产品行为面（1a 的 292 处 `var(--nv-*)`、0 处 `color:'#fff'`）未变。

## 四、新 P0/P1

**无**。本轮所有改动均为契约锚点/修订史文本/smoke 注释同步 + 新增只读脚本；未触碰产品运行逻辑（`lib/client.js` numstat 仍 +174/−173，与 R1/R2 一致）。

## 五、结论：1a 可提交（APPROVED_WITH_NOTES / 0 阻塞）

### 提交说明**必须**写入的限定语（定稿）

```
UX-061 阶段 1a（令牌桥）—— A 迭代未完成，不得据本提交宣称视觉重设计完成
1. 范围：仅修复「6 个幽灵宿主令牌 × 138 调用点」与「11 处主按钮硬编码白字 → --nv-on-accent」；
   引入 --nv-* 语义层单点映射（:root，15 个宿主真实令牌，已逐一对照 0.2.1-rc.2 主题包声明集）。
   未做：尺度系统应用、书卡去渐变、数据面板标题、控制流条类化、--nv-font（A 迭代其余部分）。
2. 24 个尺度令牌（--nv-fs-*/sp-*/r-*/ctl-*/lh-*）已定义未启用。
3. 状态色文本档对比度未裁决：亮态 success 2.28:1 / warn 2.15:1 / error 4.50:1（21 处 11–12px 文本用法），
   需 Design Reviewer 裁决（文本档令牌或 color-mix 压暗）；图形/色点档同样待核对 ≥3:1。
4. 浏览器目检未验证：明/暗双主题、合成主题注入、4 关键视图、七态、视觉基线 —— 待 Design Reviewer + 用户。
5. 契约：3.8 继承漂移（BUG-011 rebase 残留）已修；3.7/5.3/1.10 三处继承漂移一并修复；
   revisions 行数账改为 5316 → 5317 并披露历史断链（是否继续承担行数账由 1b 决定）。
   新增只读工具 scripts/verify-contract-anchors.mjs（未接 CI；当前 76/0/24，启发式判据见文件头）。
6. 1b 必须承接：P2-1（状态色文本档）/ P2-2（尺度令牌启用）/ P2-4（契约清单宿主声明对账）/
   P2-5（--nv-font）/ P2-6（ensureStyle 存量标签 no-op）/ P3 三处注释失准（client.js:89/944/4795）/
   P2-N2 + R3 五条缝（F1 调用点起点、终点截断、无主构造条目、1.4 散文形态显式化、脚本接 CI）。
```

### 提交前无需再改代码

本轮 4 处锚点 + 2 条 P2 均已按 R2 报告落地并复核；无未闭环阻塞项。**建议提交后由 Coordinator 机录 `review-record`（R3 APPROVED_WITH_NOTES / unresolved_blockers=0，报告路径 `.governance/review-UX-061-R3.md`）**，并按 §五 限定语写入 commit message。

## 六、`待验证`（不视为通过）

- 明/暗双主题与合成主题注入目检、4 关键视图、七态、真实主题取色对比度、视觉基线 —— 无浏览器，全部 `待验证`。
- 0.1.x 宿主上 `--nv-*` 底层令牌可用性：仅实测 0.2.1-rc.2 主题包；若旧宿主缺同名令牌会落 `:root` 内亮色兜底，兼容矩阵待补（1b）。
- 脚本启发式判据的误报/漏报边界：当前 76 段零 FAIL 不等于全量语义正确（WARN 24 条需人读）；本报告只确认「F1 能防 3.8 形态」，未宣称脚本等价 AST 级校验。
