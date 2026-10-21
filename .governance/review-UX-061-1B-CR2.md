# REVIEW-UX-061-1B-CR2 — UX-061 阶段 1b 双审返工后复审（窄口径）

```
REVIEW-UX-061-1B-CR2 NEEDS_CHANGE / unresolved_blockers=2
```

- 审查对象：工作区未提交改动 vs HEAD `c8c28c1`（`lib/client.js` **56 增/46 删**、`lib/host-contract.mjs` 4/3、`test/smoke.mjs` 11/8、`docs/verification/UX-061-assertion-migration.md`、新增 `scripts/verify-contrast.mjs`）
- 审查日期：2026-10-21
- **结论：不可提交**（P0=1，P1=1）。**且门禁全绿仍无法发现 P0** —— 原因是 smoke 只做源码字符串断言，不验证拼接后的 CSS 合法性（见 P1-1）。
- CR1 两项 P1 已实质闭环（B4 回退 5 类 → 实测回退 4 类 + 1 类残留，见 P2-2；B5 基准已改宿主实值且可复现 ✓）

---

## 一、P0（阻塞，必须先修）

### P0-1 `TYPO` 改为 CSS var 字符串后，**13 处消费点仍拼接 `'px'`** ⇒ 字阶全体失效
- 事实：`TYPO` 现在全部是字符串（`lib/client.js:967-979`），例如 `page: 'var(--nv-fs-display)'`、`meta: 'var(--nv-fs-base)'`、`chapter: 'var(--nv-fs-chapter)'`、`stat: 'var(--nv-fs-stat)'`。
- 但 13 处消费点仍是 `TYPO.<name> + 'px'`，拼接结果为 **`font-size:var(--nv-fs-base)px`** —— 语法非法（var 代入后成 `12pxpx`），声明在 computed-value 阶段失效 ⇒ `font-size` 回落继承值。
- 影响面（全部字号声明失效）：
  - CSS 规则 10 处：`.nv-card-title`(L4822)、`.nv-bar-title`(L4859)、`.nv-console-title`(L4938)、`.nv-ccard-name`(L5003)、`.nv-ccard-status`(L5010)、`.nv-cmeta`(L5013)、`.nv-chip`(L5120)、`.nv-content`(L5132)、`.nv-content h2`(L5134)、`.nv-hero-title`(L5141)；
  - 内联样式 3 处：章节标题 strong(L1968)、统计数字(L4390)、正文编辑器 textarea(L2013)。
- 影响性质：这是本批（DR1 P1-D2 尺度单源改造）**新引入的回归**，恰好落在「视觉呈现」这个本任务的核心目标上——正文、章节标题、书卡标题、统计数字、空态大字会全部变成父级字号。
- 反例佐证：同一批里数据面板标题写法是 `{...title, fontSize: TYPO.page}`（**不拼 px**，L2173）⇒ 合法；说明漏改集中在旧 `+ 'px'` 站点。
- 最小修复：把 13 处 `TYPO.<name> + 'px'` 改为 `TYPO.<name>`（TYPO 值已带单位）；或把 TYPO 退回数值并在使用侧统一 `calc()`/令牌化，二选一，不得混用。

## 二、P1（阻塞本轮通过）

### P1-1 守卫盲区：UX-055① 的「等价替换」在**消费面**失效却无法被检出
- smoke diff：旧断言 `clientSrc.includes('page: 20') && … meta: 11 …` 改为「TYPO 映射字符串 + `:root` 令牌值」双端锁定（`--nv-fs-display:20px` / `--nv-fs-base:12px` / `--nv-fs-stat:18px` / `--nv-fs-chapter:16px`）。
- 判断：**方向上是等价替换甚至更强**（单源双端钉住，JS 侧不再持 px），**但覆盖缺口致命**：它只验证「定义端」与「令牌值端」，完全不验证「消费端是否合法引用」。因此 P0-1 可以在 308/0 全绿的情况下合入。
- 最小修复：在 UX-055① 或新 check 中加**负断言** `!/TYPO\.[a-zA-Z]+ \+ 'px/.test(clientSrc)`（CSS 串与内联同覆盖）；并对 `font-size:' + TYPO.` 形态加正断言。这样「定义/令牌/消费」三端闭合。

---

## 三、CR1 两项 P1 的闭环核验（我逐点实测，不采信自述）

### B4（CR1 P1-1）非文本用途回退 —— 4/5 类已回退，1 类残留
| 站点 | 现状 | 判定 |
|---|---|---|
| `.nv-dot[data-st=need/done/stale]` border-color（L4837-4839） | `var(--nv-warn)` / `var(--nv-ok)` / `var(--nv-err)` | ✅ 已回退 |
| `.nv-cico-del:hover` border-color（L5020） | `border-color:var(--nv-err)`（color 仍 `-text`，属文本正确） | ✅ 已回退 |
| `.nv-cdot[data-bound=need/done]` color（L5042/5044） | `var(--nv-warn)` / `var(--nv-ok)` | ✅ 已回退 |
| **`.nv-cdot[data-bound=stale]` color（L5046）** | **`var(--nv-err-text,var(--nv-fg))`**，经 L5047 `::before/::after{border-color:currentColor}` 注入**环形边框**（非文本） | ❌ **未回退**（P2-2） |

### B5（CR1 P1-2）对比度基准 —— 已修且可复现
- 脚本 `scripts/verify-contrast.mjs` 入仓，输入内联、来源标注；我实跑：**18 组 / BELOW_4.5=0**（exit 0）。
- 我**独立复算**（不跑它的脚本，用同公式自算 58% 混合）：light ok `#1a793f` 5.45 / warn `#94630f` 5.18 / err `#8f1214` 9.27；dark ok `#7cdba0` 9.34 / warn `#f7c570` 9.85 / err `#f59d9e` 7.63 —— **与脚本输出逐位一致** ✓；暗态基准已改为宿主实值 surface `#232324` / error `#f25a5a` ✓。
- 「暗态 success/warn 是否被宿主暗块覆盖」：宿主主题包中 `--dsw-alias-state-success-primary` / `-warn-primary` 均映射单一静态值（`--dsw-static-green-500` / `amber-500`，**无 light|dark 双值**）⇒ 该「待验证」可在本轮直接消除，不必挂账（P2-5）。

### C7 `revisions[]` 批次拆分
- 1b 独立条目已在 `lib/host-contract.mjs:87`（1a 在 `:86`，1a 条目**已不再夹带 1b**）✓
- 净行数：`+10`（56 增/46 删）≡ 实测 `client.js` **5317 → 5327** ✓
- 但条目内「双声明降级」表述与 CSS 语义不符（P2-3）。

### 契约重基
- `node scripts/verify-contract-anchors.mjs` → **76 段 / FAIL 0 / WARN 24** ✓
- 手工复读：`2.3` L5189 = `const inject = ['slots']`、L5191 = `function apply(ctx) {`；`2.12` L5219 = `const offServiceEvent = …`、L5226 = `: null`；`2.13` L5256 = 首个 `ctx.slots.inject('settings.section'…)`、L5288 = `))` ✓ 全部落在声明构造上。

### 数据面板标题（DR1 P1-D3）
- 已实现：`lib/client.js:2173` `el('div', { style: { ...title, fontSize: TYPO.page } }, t('data'))`；`title` 为模块级共享对象（L965，`fontSize:'14px'`），**spread 后显式覆盖** ⇒ 不共享变异、其余复用点（数十处）不受影响 ✓；`TYPO.page` = `var(--nv-fs-display)` = 20px ✓（此处不拼 px 正是合法写法）。

---

## 四、P2（不阻塞，但需处置；3/4 项是「文档与实现再次不一致」）

- **P2-2 `.nv-cdot[data-bound=stale]` 非文本仍用文本档**（L5046-5047，环形边框）。迁移表 §5.1 声称「非文本（点/边框/底 tint）一律用状态原令牌 … `.nv-cdot[data-bound=*]` currentColor」⇒ 表述与实现不符（need/done 已回退，stale 未回退）。修复：回退为 `var(--nv-err)`，或在 §5.1 显式说明「空心环用文本档以保证亮底可见」并单列为裁决项。
- **P2-3 「双声明降级」技术不成立**：`:root` 先 `--nv-X-text:var(--nv-fg)` 后 `--nv-X-text:color-mix(...)`（同一规则、同特异性、后者胜）。自定义属性接受任意 token 序列且**不做值校验**，故不支持 `color-mix` 的引擎里后者仍生效，失效发生在**代入时**（invalid at computed-value time），不会回落到第一条声明；消费侧的 `var(--nv-X-text,var(--nv-fg))` 也无济于事（属性已定义）。正确做法：`@supports (color: color-mix(in srgb,red,blue)) { :root { --nv-X-text: color-mix(...) } }`，基线声明保留 `var(--nv-fg)`。请修表述或改实现（我无法浏览器实测，但该语义有规范依据；当前 `@supports` 全文件 0 处）。
- **P2-4 迁移表 §4 已过期**：仍写「数据面板标题 14→20px **未做**」，而实现已做（L2173）⇒ §4 与 §5.3/契约条目互相矛盾。
- **P2-5 「暗态 success/warn 被暗块覆盖」可消除**（宿主主题包已证无 dark 双值）；另 **§5.3 称 `TYPO.*` 引用 15 处**，实测 15 行 / 18 个引用（含同行多引用），建议口径写清「15 个站点 / 18 次引用」。
- **P2-6 `--nv-ctl-*` 两档仍 0 消费者**（V-1 已披露）——需 Coordinator 明确接受 1b 部分交付或转 1b-2；`--nv-fs-*` 真实消费者已从 5 增至 8（fs-base/fs-chapter/fs-stat/fs-body/fs-card/fs-display/fs-display-s/fs-hero 中由 TYPO 消费）但「24 令牌全启用」仍未达成。

## 五、P3
- P3-1 `.nv-wfchip[data-tone=ok]` 仍存在（L5083），消费点 0；迁移表 V-4 称「已删 warn/ok 死规则」⇒ 实际只删了 warn（文档/实现不符）。
- P3-2 `-text` 消费写法不统一：部分 `var(--nv-x-text,var(--nv-fg))`、部分 `var(--nv-x-text)`（wfchip L5082-5083）。
- P3-3 `.nv-dot[data-st=need/done/stale]` border 现为 `var(--nv-warn)` 等**无兜底**形态，与同文件其余令牌写法不一致（功能无碍，因 `:root` 有定义）。

---

## 六、门禁真跑（本审查独立执行）
| 命令 | 结果 |
|---|---|
| `node --check lib/client.js lib/host-contract.mjs test/smoke.mjs scripts/verify-contrast.mjs` | 全 exit 0 |
| `node test/smoke.mjs` | **SMOKE DONE: 308 passed, 0 failed** |
| `node test/validate-preset.mjs` | PRESET VALIDATION PASSED（schema-face: PASS） |
| `node test/fixtures/host-surfaces/probe-face.mjs` | **OK：28/28** |
| `node test/fixtures/host-surfaces/ci-mock-face.mjs` | OK：4/4 |
| `node scripts/verify-contract-anchors.mjs` | 76 段 / **FAIL 0** / WARN 24 |
| `node scripts/verify-contrast.mjs` | 18 组 / **BELOW_4.5=0** |

> 说明：上表全绿仍漏过 P0-1 —— 这不是本次审查的「运气」，而是 smoke 断言语义为源码字符串匹配、**不执行 CSS 解析**。P1-1 的负断言补上后即可闭合该盲区。

## 七、待验证（无浏览器，不得视为通过）
- 明/暗/合成主题目检、4 视图、七态、真实取色；`color-mix` 在不支持引擎上的实际降级行为（与 P2-3 相关）。
- 0.1.x 宿主上 `-text` 兜底表现（宿主令牌缺失时 `:root` 兜底为亮色值）。

## 八、结论与后续
`NEEDS_CHANGE / unresolved_blockers=2`（P0-1 必须修；P1-1 守卫盲区必须补，否则同类回归还会发生）。
修复后按 T1 由本 Reviewer 做 CR3 窄口径确认：①13 处 `+ 'px'` 清零（含内联）②UX-055① 负断言在位且能抓住该形态（可用「故意保留一处 + 'px' ⇒ 断言转红」构造证明）③P2-2/P2-3/P2-4 三项文档/实现一致性订正。
**在 P0-1 修复前，1b 不得提交、不得宣称视觉交付完成；Design 裁决（M-1~M-4、V-1/V-2/V-3）仍需 DR2。**
