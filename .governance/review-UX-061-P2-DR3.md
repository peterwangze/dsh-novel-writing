# REVIEW-UX-061-P2-DR3 — 阶段 2 收口轮窄口径终审

**审查日期**：2026-10-21
**审查对象**：工作区未提交改动 vs HEAD（`lib/client.js` rail 状态短标签/CSS、`test/smoke.mjs` 新断言、`scripts/verify-visual-geometry.mjs` 最坏态、设计文档 §2.2、迁移表 §8.1）
**前轮**：`REVIEW-UX-061-P2-DR2 NEEDS_CHANGE / 1`（降级态 34 字长句撑爆 rail）
**本轮只核**：P1 闭环 + 两项文档 + 是否引入新问题

**结论：`REVIEW-UX-061-P2-DR3 APPROVED_WITH_NOTES / unresolved_blockers=0`** → **阶段 2 可提交**（限定语见 §六）

---

## 一、门禁（我实跑）

| 项 | 结果 |
|---|---|
| `verify-visual-geometry.mjs --strict` | OK，exit 0：`rail 44 / measure 510 / edwrap 510 / chrow 28+12px / cinput 32 / para 1em / railStatus="服务不可用" / statusRect 16×57 / buttons 3×visible:true`，输出 `worst-case capped, 3 buttons visible` ✅ |
| `verify-contrast.mjs` | `FG_MUTED_ROWS=4 V3_BELOW_4.5=0` ✅ |
| `verify-contract-anchors.mjs` | 76 / FAIL 0 / WARN **22**（上轮 25 → 22，好转）✅ |
| `test/smoke.mjs` | **314 passed / 0 failed** ✅ |

---

## 二、P1 是否真闭环 → **闭环** ✅

**短标签体系**（`lib/client.js:4330-4335` 与 i18n `:275`/`:451`）——我逐键核对：
| 键 | zh（字数） | en（字符） |
|---|---|---|
| railStatusIdle | 空闲（2） | Idle（4） |
| railStatusRunning | 运行中（3） | Running（7） |
| railStatusBusy | 处理中（3） | Working（7） |
| railStatusUnbound | 未绑定（3） | Unbound（7） |
| railStatusStale | 会话失效（4） | Stale（5） |
| railStatusDegraded | **服务不可用（5）** | Degraded（8） |

- 可见文字**只经 `railStatus*`**；长句（`sessionsMissing` 那句 34 字/88 字符）完整保留在 `title` + `aria-label`（= `statusText`）⇒ **信息不丢，只是不进 44px 竖排**，符合我在 DR2 的要求。
- **「需用户介入的状态必须可见且不看 tooltip 可辨」→ 满足**：未绑定 / 会话失效 / 服务不可用 都是常驻可见文字，且 `[data-tone=err]` 用 `--nv-err-text`（亮 8.64 / 暗 6.49）。
- 长句留在 title/aria → **可接受**：rail 上「服务不可用」五个字已足以触发用户介入；处置细节（重启 DSH 等）本就属于需要主动查看的信息，放在 tooltip/读屏是合理分层。

**静态断言**（`smoke.mjs:1301`）——我读了实现，是真守卫而非形式：
- `keys` 6 个、`found.length === 12`（zh 6 + en 6 成对）；
- `zh.every(len ≤ 6)` / `en.every(len ≤ 14)`；
- 取 `.nv-rail-status` 段（slice 起点 +900）要求含 `t('railStatus` 且**不含** banned 键（`sessionsMissing|wfRunning|wfIdle|unbound|stale|railBusy`）⇒ 回退到长句必红。
- 注入证明（39 字 → 红 → 还原 → 314/0）与我的断言逻辑一致，成立。

**CSS 兜底**：`.nv-rail-status{…max-height:120px;overflow:hidden}` ✅；最坏态实测 `statusRect = 16×57`（5 字），远低于 120。

---

## 三、`max-height:120px` 与「永不挤掉按钮」是否自洽 → **不完全自洽（P2，不阻塞提交）**

**实测/代码事实**：
- 底行高度可由用户拖拽，**下限 120px**（`midHpx = clampNum(snap.midH, 120, midMax)`）；默认 30%。
- 最坏态 rail 内容 ≈ **257px**（几何实测），其中状态标签 57px。
- max-height 只**限住状态块**（≤120），不改变「容器可被拖到 120px」这一事实：**面板拖到最小时 rail 内容（257px）> 容器（120px）**，底部按钮仍会被裁切。

**但这不是本批引入的缺陷**：改前 rail 内容约 194px，同样 > 120px ⇒ 面板最小高度下本来就会裁切。**所以我不把它计为阻塞**，只要求把口径写准并给一条低成本防线：
1. **推荐 1 行**：`.nv-rail{overflow-y:auto;min-height:0}`（或 `overflow:hidden` + 滚动兜底）⇒ 面板最小时按钮**可达**（滚动可见），而不是"消失"。
2. 若不做：**「永不挤掉按钮」这句话必须改成**「状态文字不越过 120px 上限；面板 ≥257px 时 3 个按钮完整可见；面板最小时按钮需展开面板可见」——不得宣称永不裁切。
3. 几何脚本建议补一个**容器高度维度**（默认 30% 已在测；再加一档面板最小高度 120 的断言：按钮 `visible || scrollable`）。

---

## 四、S-5（rail 标签用 caption 11px）→ **不接受该例外，建议改 12px；若坚持 11px 则必须由 A7 目检背书**

理由（不是口味问题）：
1. 我们**刚刚**在 A 迭代把 meta 从 11→12 的理由就是「11px 中文可读性下限」（P0-3，DEC-155 授权）。rail 状态是**需要一眼读懂的状态语义**，比 meta 更重要；给新组件开 11px 例外与那次裁决自相矛盾。
2. **12px 在容器里放得下**：5 字竖排 12px × 1.45 ≈ 87px < 120px 上限（实测 11px 为 57px，12px 约 63–87px，仍有余量）。
3. 若原因是「怕 rail 视觉太重」：可用 `letter-spacing:.04em` + muted 色压住视觉权重，不必牺牲字号。
**裁决**：rail **状态**标签改 `--nv-fs-base`（12px）；**阶段徽标**可保留 caption（它是位置上下文、非状态语义），但也在 A7 一并目检。若团队坚持 11px：视为显式例外，A7 必须写明「11px 竖排实测可读」并作为验收证据，否则不通过。

---

## 五、两项文档与清单 → **已到位** ✅

- **设计文档 §2.2 L207**：已含硬约束「`--nv-measure` MUST 保持 `em`——以每行字数为锚；若改 `px`，宿主字号/用户缩放变化时阅读行宽会失真」✅（我 DR2 的要求原样落地）。
- **迁移表 §8.1**：S-1（修复机制 + 字长实测 + 注入证明）/ S-2（CSS 兜底 + 最坏态几何）/ S-3（rail 错误色用文本档 `--nv-err-text`）/ S-4（短标签进 rail、长句进 title/aria）**四条均与实现一致**；S-5（caption 例外）见 §四裁决。
- **目检清单**：`A7`（11px 竖排笔画清晰 + 错误红对比）与 `B15`（降级文案 + 最窄面板 + en locale 不得挤压按钮，标注 DR2 P1 专项）均在位，判据与我要求一致 ✅。

---

## 六、阶段 2 提交 → **可以**；最终限定语

```
UX-061 阶段 2（方向 B 布局节奏）—— 代码面完成，验收待人工目检

1. measure：--nv-measure:34em（硬约束：保持 em 以字数锚定，不得改 px）；.nv-content/.nv-edwrap 居中；edwrap 显式 15px。
2. rail：44px 竖向 icon rail（role=toolbar + title/aria-label；32×32 按钮；border-right 1px）；
   状态为常驻竖排短标签（空闲/运行中/处理中/未绑定/会话失效/服务不可用；en 对应 Idle/Running/Working/Unbound/Stale/Degraded），
   长句仅进 title/aria；`.nv-rail-status` max-height:120px 兜底（最坏态实测 16×57）。
3. 焦点环：rail 按钮复用设计系统双环（2px bg + 4px accent 60%），UX-053 消费者 4→5。
4. 标题栏 36px、章节行 28px + 左 2px 选中线、书脊线 + hover 只提边框、数据面板 13.5/26 + severity 竖条 + mono、循环动画全零。
5. 尺度令牌 26/26 全消费；几何 strict 基线：rail 44 / measure 510 / chrow 28+12px / cinput 32 / para 1em / 最坏态 3 按钮可见。
6. 待人工目检：B7~B15 · A6~A7（重点：B9 状态可感知、B15 降级文案最窄面板、A7 11px 竖排字形、en locale）。
7. 已知口径：面板拖到最小高度（120px）时 rail 内容超出，按钮需展开面板可见（或后续加 overflow 兜底）；
   状态标签当前 11px（DR3 建议改 12px，若不改须由 A7 目检背书）。
```

**阶段 2 措辞**：只能写「代码面完成、验收待人工目检」；**A+B 合并验收**以同一份目检清单（B7~B15 / A6~A7）为准，任一项失败不得宣称视觉验收通过。

---

## 七、P3 备注（不阻塞）

1. **smoke 段定位是启发式**：`.nv-rail-status` 段取 `slice(start, start+900)`——若未来该段被重排到 900 字符外，`onlyShort` 会错误变红/变绿。建议改用「从 `className: 'nv-rail-status'` 到下一个 `titleStageName`」的结构化截取。
2. `railStatusRunning`（运行中）与 `railStatusBusy`（处理中）语义接近，建议设计文档 §7.1 写明二者边界（运行中=工作流在跑；处理中=操作请求进行中）。
3. 建议 `.nv-rail` 加 `overflow-y:auto`（见 §三 推荐 1 行），把「面板最小时按钮可达」变成工程保证。
4. 阶段徽标（`.nv-rail-stage`）与状态标签同为竖排，字号/字重建议在 A7 一并定稿，避免两个 11px 竖排元素叠出视觉噪声。

**待验证（不视为通过）**：B7~B15 / A6~A7 全部目检项；en locale 竖排拉丁字形；面板最小高度下的真实裁切/滚动行为；真实宿主窗口尺寸下的 rail 高度余量。
