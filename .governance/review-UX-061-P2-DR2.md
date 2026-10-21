# REVIEW-UX-061-P2-DR2 — 阶段 2 返工复审（P2-1 / P2-2 / §8 披露）

**审查日期**：2026-10-21
**审查对象**：工作区未提交改动 vs HEAD（`lib/client.js` rail 状态文字与焦点环、迁移表 §8、设计文档 §2.2、目检清单）
**前轮**：`REVIEW-UX-061-P2-DR1 APPROVED_WITH_NOTES / 0`（附 P2-1 状态文字消失、P2-2 焦点环缺失）

**结论：`REVIEW-UX-061-P2-DR2 NEEDS_CHANGE / unresolved_blockers=1`**

> 先说结论：**P2-2 已真闭环；P2-1 的机制做对了，但标签内容用错了 i18n 键**——降级态会把一整句话塞进 44px 竖排栏，导致按钮被挤出/裁切。这是错误态下的硬布局缺陷，必须修。

---

## 一、我实测的门禁

| 项 | 结果 |
|---|---|
| `node scripts/verify-visual-geometry.mjs --strict` | OK：**rail 44 / measure 510 / edwrap 510 / chrow 28+12px / cinput 32 / para 1em / railStatus = "运行中"**，exit 0 ✅ |
| `node scripts/verify-contrast.mjs` | `FG_MUTED_ROWS=4 V3_BELOW_4.5=0` ✅ |
| `node scripts/verify-contract-anchors.mjs` | 76 段 / FAIL 0 / **WARN 25**（较上轮 24 增 1：`2.6/2.7/2.9` 类「起点无声明式主构造，仅提示」的 WARN，非设计问题，归 CLEAN-011 口径统一） |
| `node test/smoke.mjs` | **313 passed / 0 failed** ✅ |

---

## 二、阻塞项：P2-1 修法在「降级态」自毁（P1）

### 事实
```js
// lib/client.js:4320（rail 常驻状态文字）
wfBusy === true ? t('railBusy')
 : degraded === true ? t('sessionsMissing')      // ← 问题在这里
 : boundId === null ? t('unbound')
 : boundEntry === null ? t('stale')
 : wfRunning === true ? t('wfRunning') : t('wfIdle')
```
而 i18n 里这些键的真实值（`lib/client.js:275` 中文 / `:451` 英文）：
| 键 | 中文值 | 字数 | 英文值 | 字符数 |
|---|---|---|---|---|
| `railBusy` | 处理中 | 3 | Working | 7 |
| `unbound` | 未绑定 | 3 | unbound | 7 |
| `stale` | 会话失效 | 4 | session gone | 12 |
| `wfRunning` | 运行中… | 4 | Running… | 8 |
| `wfIdle` | 空闲 | 2 | Idle | 4 |
| **`sessionsMissing`** | **"会话服务不可用：状态点已隐藏，打开/绑定功能暂不可用（重启 DSH 后重试）。"** | **34** | **"Sessions service unavailable: status dots hidden, open/bind disabled (restart DSH to restore)."** | **88** |

### 为什么是缺陷
1. `.nv-rail-status` 是 **`writing-mode:vertical-rl` + 11px + lh 1.45**，且**没有** `max-height` / `overflow` / 截断规则；`.nv-rail` 也没有 overflow 兜底。
2. 34 个中文字的竖排高度 ≈ 34 × 11 × 1.45 ≈ **542px**；英文 88 字符旋转后 ≈ **880px**。
3. 而 rail 实测总高 **194px**（默认窗口，`运行中` 态），容器是 `overflow:hidden` 的底行 flex 子项 ⇒ **降级态下状态文字会把 3 个操作按钮挤出可视区或直接裁切**——恰恰是最需要用户看到「服务不可用」的时候，按钮反而消失。
4. headless 几何脚本只测了 `运行中` 态（`railStatus:"运行中"`），**没有覆盖降级态**，所以全绿也发现不了。

### 最小修复（3 小步）
1. **新增 rail 专用短标签**（2 locale × 6 状态），例如：
   `railStatusIdle: 空闲/Idle · railStatusRunning: 运行中/Running · railStatusBusy: 处理中/Working · railStatusUnbound: 未绑定/Unbound · railStatusStale: 会话失效/Session gone · railStatusDegraded: 服务不可用/Unavailable`
   可见文字只允许用 `railStatus*`；长句（`sessionsMissing`）继续留在 `title` / `aria-label`（**信息不丢，只是不进 44px 竖排**）。
2. **加静态断言**：smoke 断言「`.nv-rail-status` 的取值只经 `railStatus*` 键」+「`railStatus*` 中文 ≤6 字 / 英文 ≤14 字符」；并把最坏情况（降级态）纳入 `verify-visual-geometry --strict`（可用无头渲染或静态长度断言两种之一）。
3. **加一条 CSS 兜底**：`.nv-rail-status{max-height:…;overflow:hidden}`（或允许 `text-overflow` 截断），保证**任何未预期的长文案都不会挤掉按钮**——这是防御性措施，不能替代第 1 步。

---

## 三、P2-2 焦点环 → **已真闭环** ✅

```css
.nv-rail .nv-wfctl-btn:focus-visible,
.nv-rail .nv-wfctl-btn2:focus-visible{outline:none;
  box-shadow:0 0 0 2px var(--nv-bg,#0b0e14),0 0 0 4px color-mix(in srgb,var(--nv-accent,#4f8ef7) 60%,transparent)}
```
- 与设计系统「2px bg 缓冲 + 4px accent 60%」**完全同型**（与 `.nv-ccard` 一致），rgba 兜底 + color-mix 双声明保留 ✅；
- smoke 断言在位、UX-053 双环消费者计数 4→5 ✅；
- 我额外确认：`.nv-chrow:focus-visible` 仍在，选中态与焦点态可区分（未互相覆盖）。

---

## 四、P2-1 其余两个子问题（裁决）

1. **「busy 必须有可见文案」→ 满足**：`wfBusy → t('railBusy')` = "处理中"/"Working"，常驻可见、不依赖悬停 ✅。
2. **44px 内 10–11px 竖排中文可读性** → **需目检，但方向可接受**：中文竖排是本地排版习惯，11px 竖排在 44px 宽度下字面完整（无旋转）；风险在**小字号 + 竖排的笔画清晰度**与 **en locale 的拉丁字母旋转观感**（`text-orientation:mixed` 会把 Latin 旋转 90°）。
   → 目检必须新增两项：`B15 rail 状态文字（最长文案/最窄面板/英文 locale）`、`A7 rail 状态文字明暗对比与竖排字形`。
3. **「未绑定/会话失效」是否够醒目** → **当前足够，不要求升级为角标**：`.nv-rail-status[data-tone=err]{color:var(--nv-err-text)}` 已用文本档错误色（亮 8.64 / 暗 6.49，均 ≥4.5），配合 rail 内唯一的警示位置与 `title` 全文，足够；**但前提是**先把 P1 的长句问题修掉（否则连文字都显示不全）。

---

## 五、§8（R-7）披露核对

| 披露项 | 我的核对 |
|---|---|
| 数据表 13→13.5（`--nv-fs-card`） | 代码 `font-size:var(--nv-fs-card)` 共 **12 处**，表格规则包含在内 ✅；设计文档与契约 revisions 同步改 13.5（我未逐字比对契约文本，但 anchors 76/FAIL 0 说明行引用一致）|
| `.nv-dcard-title` 13.5 | 类名在代码中存在（3 处引用）✅ |
| `.nv-stage-pill` 13.5 | 类名存在（2 处）✅ |
| rail 状态常驻文字（未退化为纯图标） | ✅ 但**披露口径不完整**——只说了「保持可见」，没写「降级态复用了 34 字长句」这一事实；修完后请把「rail 用短标签、长句只进 title/aria」写进 §8 |
| **遗漏建议补** | ①rail 状态错误色用的是**文本档** `--nv-err-text`（不是原 `--nv-err`），属设计口径决策，应披露；②13.5 档用的是**角色名令牌** `--nv-fs-card`（我 DR1 已提，仍未改命名或加注） |

---

## 六、设计文档 measure em 说明 → **仍未加（P3，本次一并补）**

我在 DR1 Q3 明确要求「设计文档补一句：measure 用 em 锚字数，不得改 px」。当前文档 §2.2 只有 `--nv-measure: 34em（15px × 34 ≈ 510px ≈ 中文 30–34 字/行）` 的**规格描述**，没有「不得改 px」的约束句。请补一句：
> `--nv-measure` MUST 保持 em（以字数为锚）；改为 px 会使行宽在字号变化时失真。

---

## 七、目检清单（已按 DR1 Q7 重写，B7~B14/A6、B9 失败即不通过 — 我核对到位）→ 还需加 2 项

已确认清单含 A6、B7~B14、D2 已改写、B5 已改为实测 3px、B9 标注「失败即不通过」✅。**需新增**：
| # | 新增项 | 判据 |
|---|---|---|
| **B15** | **rail 状态文字最长态**（覆盖降级/失效文案 + 最窄面板高度 + 英文 locale） | 状态文字完整可读**且不挤压/裁切** rail 按钮；英文竖排不出现无法阅读的旋转堆叠 |
| **A7** | **rail 状态文字明暗对比与竖排字形** | 11px 竖排中文在明暗两态笔画清晰；错误态红色与背景对比足够 |

（修 P1 后 B15 的「最长态」应自然通过；保留它是为了防回归。）

---

## 八、阶段 2 提交判断

**当前不可提交**（1 个 P1）。最小修复 = §二 的 3 小步（新增 6 个短标签 + 静态断言/最坏态覆盖 + CSS 兜底）+ §六 一句文档 + §七 两项目检项。

修完后发 **DR3**（同一 Design Reviewer，窄口径：只核 P1 修复 + 是否引入新问题 + 上述文档/清单两项）。

**阶段 2 口径**：**待 DR3 通过 + 人工目检**，仍不得宣称「方向 B 交付完成」；当前 A+B 合并状态 = 「代码面接近完成，卡在 rail 状态文案的降级态布局缺陷」。

**提交限定语（DR3 通过后适用，届时按实际微调）**：
```
UX-061 阶段 2（方向 B 布局节奏）—— 代码面完成，验收待人工目检
1. measure 34em（em 锚字数，文档已注明不得改 px）；rail 44px；标题栏 36；章节行 28。
2. rail 状态：常驻竖排短标签（空闲/运行中/处理中/未绑定/会话失效/服务不可用）+ title/aria 全文；
   长句不进 44px 竖排；CSS 有 max-height 兜底。
3. rail 焦点环复用设计系统双环（2px bg + 4px accent 60%），UX-053 消费者 4→5。
4. 数据面板 13.5px/26px、severity 左 2px、mono 数值；书脊线 + hover 只提边框；循环动画全零。
5. 尺度令牌 26/26 全消费（smoke + strict geometry 复跑，含降级态覆盖）。
6. 待目检：B7~B15 / A6~A7（含 rail 状态可感知、最长态、竖排字形、英文 locale）。
```

---

## 九、备注（P3）

1. `.nv-rail-status` 缺 `max-height`/`overflow` 兜底（P1 修复第 3 步会补）。
2. `--nv-fs-card` 角色名当字号档用的命名漂移仍未处理（DR1 P3 遗留）。
3. anchors WARN 24→25：`2.6/2.7/2.9` 一类「起点无声明式主构造」的提示性 WARN，建议并入 CLEAN-011 的判据增强，不在设计审查范围。
4. `railBusy` 与既有 `wfRunning` 文案并存（"处理中" vs "运行中…"），两者语义边界建议在设计文档 §7.1 里写明（busy=操作进行中，running=工作流运行中），避免后期混用。

**待验证（不视为通过）**：B15/A7 目检；降级态下 rail 的真实渲染高度（headless 只测了正常运行态）；英文 locale 竖排字形；真实宿主窗口最窄高度下的 rail 溢出行为。
