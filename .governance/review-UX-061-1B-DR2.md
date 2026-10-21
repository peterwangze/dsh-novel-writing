# REVIEW-UX-061-1B-DR2 — UX-061 阶段 1b 设计复审（Design Reviewer，R2）

**审查日期**：2026-10-21
**审查对象**：工作区未提交改动 vs HEAD `2379687`（`lib/client.js` / `lib/host-contract.mjs` / `test/smoke.mjs` / `scripts/verify-contrast.mjs` / `docs/verification/UX-061-assertion-migration.md`）
**前轮**：`REVIEW-UX-061-1B-DR1 NEEDS_CHANGE / unresolved_blockers=3`（`.governance/review-UX-061-1B-DR1.md`）
**依据**：设计规格 `docs/design/UX-061-visual-directions.md` §2.1/§4 · DEC-155 · 迁移表

**结论：`REVIEW-UX-061-1B-DR2 NEEDS_CHANGE / unresolved_blockers=1`**

---

## 一、返工核验（本审查自己跑的）

| 核验 | 结果 |
|---|---|
| `node scripts/verify-contrast.mjs` | **TEXT_TOKENS=18 / BELOW_4.5=0**；我独立复算其中 4 组：light tint12% ok `#1a793f`=**4.92**、warn `#94630f`=**4.72**、light surface ok=**5.45**、dark tint12% warn=**7.89** —— 与脚本一致，58% 口径在三类承载底色上均达标 ✅ |
| `node scripts/verify-contract-anchors.mjs` | 76 段 / FAIL 0 / WARN 24 ✅ |
| `node test/smoke.mjs` | **308 passed / 0 failed** ✅ |
| `node test/validate-preset.mjs` / `probe-face` / `ci-mock-face` | PASSED / 28/28 OK / 4/4 OK ✅ |
| 数据面板标题（P1-D3） | `lib/client.js:2173` → `{...title, fontSize: TYPO.page}`，且 `TYPO.page='var(--nv-fs-display)'` ⇒ 输出 `font-size:var(--nv-fs-display)` = 20px 走单源 ✅ |
| TYPO 单源化（P1-D2 部分） | `TYPO` 全部改为语义名 → `--nv-fs-*` 字符串；`--nv-fs-chapter/-stat` 已新增并被消费；`--nv-fs-*` 消费点 1→**9** ✅（改善） |
| `.nv-wfchip` 死档清理 | `warn` 已删，但 **`data-tone=ok` 仍无消费者**（5 处 wfchip 实例只用 err/muted/running）⇒ 残留死规则（P3） |
| 尺度字面量 | **48 处**（10×1 / 10.5×1 / 11×9 / 11.5×1 / 12×13 / 13×10 / 14×3 / 15×3 / 16×3 / 18×3 / 20×1）—— 与我 DR1 写的「45 处」有出入，**以 48 为准**（DR1 该数字为我的统计口径笔误，在此更正；返工并未减少字面量） |
| `--nv-ctl-*` 消费者 | **0**（V-1 成立） |
| `--nv-fg-subtle` <12px | 3 处仍在：`lib/client.js:4923`（10px）、`:4964`（11px）、`:5022`（11px 可点击折叠）（V-3 成立） |

---

## 二、阻塞发现（必须本轮修）

### P0-D1 — TYPO 单源化引入 **inline 样式的非法 font-size**（三个站点，含正文编辑区）
`TYPO` 值已变为字符串（`'var(--nv-fs-*)'`），但 3 处仍按数值拼接 `+ 'px'`：

| 位置 | 代码 | 实际产出的 CSS | 后果 |
|---|---|---|---|
| `lib/client.js:1968` | `fontSize: TYPO.chapter + 'px'` | `font-size:var(--nv-fs-chapter)px`（**非法**） | 章节标题字号失效 → 继承父级（约 12–13px），应为 16px |
| `lib/client.js:2013` | `fontSize: TYPO.body + 'px'` | `font-size:var(--nv-fs-body)px`（**非法**） | **正文编辑区（textarea）** 回落到 UA 默认（Chromium ≈13.33px），应为 15px ⇒ **写作主业可见回归** |
| `lib/client.js:4390` | `fontSize: TYPO.stat + 'px'` | `font-size:var(--nv-fs-stat)px`（**非法**） | 统计数字失效 → 继承父级，应为 18px |

**为什么 smoke 没拦住**：现有断言是源码字符串包含式（`clientSrc.includes(...)`），不解析「拼接后是否合法 CSS」。**修复要求**：①删除这三处 `+ 'px'`（改为直接传 `TYPO.x`）；②补一条**负断言**：`!/TYPO\.\w+ \+ 'px'/`，防止同型回归；③修完须给三处代码的最终产出字符串证据。

---

## 三、V 项逐条裁决（含收敛路径与验收条件）

| # | 项 | 裁决 | 依据与验收条件 |
|---|---|---|---|
| **V-1** | `--nv-ctl-*` 零消费者（控件两档 28/32 未落地） | **1b-2 必须收敛，二选一，不接受中间态** | 设计 §2.1「控件尺寸两档」是明列承诺。①**落地**：至少 3 类控件（`.nv-cbtn` / `.nv-cico` / `.nv-wfctl-btn`）落 `min-height:var(--nv-ctl-sm|md)`，并加 smoke 断言「`--nv-ctl-*` 至少 N 处被消费」；或②**撤除**：从 `:root` 与设计文档同步删除该承诺（留「已定义未使用」＝设计系统自欺）。验收口径：令牌消费者数 ≥ 声明档数，或令牌不存在 |
| **V-2** | 48 处 `font-size` 字面量 + 10/10.5/11.5 未归类 | **可拆 1b-2，但必须带机器验收口径，不得无限挂账** | 现状：CSS 侧仍以字面量为主，单源化只完成「JS 侧」。要求 1b-2：①48 处 → 全量映射 `--nv-fs-*`；②10 / 10.5 / 11.5 三值**归类**（新增 `--nv-fs-caption-dense` 档并登记进设计尺度表，或改到 11/12）；③机检：smoke 增加「字面量 font-size 集合 ⊆ 白名单」断言。目标批次：与 UX-062 同批，不晚于 v0.6.0 发布前 |
| **V-3** | `--nv-fg-subtle`（亮色 3.71:1）用于 10–11px 信息/可点击文本 | **1b-2 必须修，不归 UX-062** | 3 处（`:4923` 10px 副标题、`:4964` 11px 分组标题、`:5022` 11px 可点击折叠）。设计文档 §1.2 自记该令牌「仅 ≥12px 或非信息性」，实现从未遵守。口径：信息性/可交互文本 ≥4.5:1 ⇒ 改 `--nv-fg-muted`（亮 5.80）或抬到 12px。UX-062 是 IA/交互面，不承担色彩合规 |

---

## 四、M-4 裁决（新口径是否达标）

- **达标**：58% + 三承载底色（surface / tint8% / tint12%）× 2 主题 = 18 组全部 ≥4.5（实测最低 light tint12% warn 4.72），我独立复算一致。**M-4 派生口径接受**。
- **但机制描述不实（P1-D2'，需在 1b-2 一并纠正，非提交阻塞）**：
  ```css
  --nv-ok-text: var(--nv-fg);                          /* 死代码：被下一行恒覆盖 */
  --nv-ok-text: color-mix(in srgb, var(--nv-ok) 58%, var(--nv-fg));
  ```
  自定义属性按「后声明胜出」解析，**首条永远不会生效**；而使用点的 `var(--nv-*-text, var(--nv-fg))` 兜底参数也**不会触发**（令牌已定义，只是计算值非法）。浏览器不支持 `color-mix` 时，真实行为是：该声明 **invalid at computed-value time** → 属性变 `unset` → `color` **继承父级色**（对比安全，但状态语义丢失）。
  要求：①迁移表把降级行为改为如实描述（「继承父色」）；②二选一实现：`@supports (color: color-mix(in srgb, red 50%, blue))` 内覆盖（真正双声明降级）或删除死代码只留一条并披露降级语义。
- 暗态测量底色用 `#232324`（卡片层）而非 `bg-base #0b0e14`：若 chip 直接落在页面底色上，对比只会更高，不构成反向风险 ✅。

---

## 五、M-2 / M-3 附条件（返工后仍成立）

- **M-2 仍成立**：亮色卡片与页面同为 `#fff`，层级仅靠 1px `border-strong`（合成 ≈`#e5e5e5`，对白 ≈1.26:1）⇒ 必须真机目检确认可辨。
- **M-3 仍成立**：hover 表面 tint 单独对白 ≈1.11:1，可感知性来自 `border-color→accent`。
- **需要写入设计用法说明（2 条，随 A 验收落地）**：
  1. `border-l1`（亮色 #f5f5f5）**禁用于分隔/层级边界**，分隔一律 `border-strong`；
  2. hover 可感知性定义 = 「边框/前景变化」，表面 tint 仅为辅助（避免后来者删掉边框变化导致 hover 失效）。

---

## 六、1b 能否「部分交付」提交

**否** —— 最小补齐集合（很小）：P0-D1 三处删除 `+ 'px'` + 建议同批补负断言。修完即可提交，V-1/V-2/V-3 与 M-4 机制纠正按 1b-2 收敛（已给验收口径）。

**提交说明必须写入的限定语**（建议逐字）：
1. 本批 = 方向 A 的「令牌桥 + 书卡/chip/标题三项组件级修订」；**A 迭代未完成**（尺度字面量 48 处、`--nv-ctl-*` 零消费者、`--nv-fg-subtle` 小字号用法仍待 1b-2）。
2. `TYPO` 已收敛为语义名 → `--nv-fs-*` 唯一映射（JS 侧零 px），但 CSS 侧 48 处字面量仍在，单源化**只完成一半**。
3. `--nv-*-text` 58% + 三承载底色 18 组 ≥4.5（最低 4.72）；不支持 `color-mix` 时降级 = **继承父色**（非 `var(--nv-fg)`），待 1b-2 改为 `@supports` 或如实披露。
4. 数据面板标题已走 `TYPO.page`（20px）；亮色卡片层级依赖 1px `border-strong`，hover 依赖 accent 边框——**未做浏览器目检**，不得宣称视觉验收通过。
5. 1b-2 承接：V-1 / V-2 / V-3 + M-4 机制纠正 + `.nv-wfchip[data-tone=ok]` 死规则 + 两项设计用法说明。

---

## 七、结论

**`REVIEW-UX-061-1B-DR2 NEEDS_CHANGE / unresolved_blockers=1`**（P0-D1）。
修复后发 **DR3**（同一 Design Reviewer，注入本报告；窄口径：只核 P0-D1 + 是否引入新问题）。

**A 迭代还缺什么（最终清单）**：
① **删除三处 `+ 'px'` 并补负断言**（本轮）② 尺度字面量 48 处归零/白名单化 + 10/10.5/11.5 归类（1b-2，机器断言）③ `--nv-ctl-*` 落地或撤除（1b-2，二选一）④ `--nv-fg-subtle` 三处小字号合规（1b-2）⑤ M-4 降级机制纠正（`@supports` 或如实披露）⑥ 设计用法说明 2 条（`border-l1` 禁分隔 / hover 定义）⑦ 明暗与合成主题真机目检（4 视图 × 7 态）⑧ `--nv-font` + regionLiterals 提取面（可归 UX-062）。

**待验证（不视为通过）**：浏览器目检、真实宿主取色（本审查用设计文档 §1.2 宿主实测值 + WCAG 静态计算）、0.1.x 宿主令牌可用性、CJK 字形、暗态 chip 落在 `bg-base` 上的实际观感。
