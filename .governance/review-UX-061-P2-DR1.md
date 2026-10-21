# REVIEW-UX-061-P2-DR1 — UX-061 阶段 2（方向 B）设计审查

**审查日期**：2026-10-21
**审查对象**：工作区未提交改动 vs HEAD（`lib/client.js` 197 行变更 / `test/smoke.mjs` / `lib/host-contract.mjs` / 迁移表 §7 / 设计文档 §7 / `scripts/verify-visual-geometry.mjs`）
**依据**：`docs/design/UX-061-visual-directions.md` §2.2（方向 B 规格）+ §7（用法说明）· DEC-155（布局授权：显式替换 UX-059 控制条形态）· 迁移表 §7（B-1~B-10）
**前轮**：`REVIEW-UX-061-1B2-DR1/DR2`（A 迭代收口）

**结论：`REVIEW-UX-061-P2-DR1 APPROVED_WITH_NOTES / unresolved_blockers=0`**
（可提交；但**不得**在目检通过前宣称「方向 B 交付完成」——理由见 §三、§六）

---

## 一、我实测的门禁与几何（不采信转述）

| 项 | 我的执行 | 结果 |
|---|---|---|
| `node scripts/verify-visual-geometry.mjs` | 真跑（headless Edge 可用） | **rail 44 / measure 510 / edwrap 510 / chrow 28 / cinput 32**，OK，exit 0 ✅ |
| `node scripts/verify-contrast.mjs` | 真跑 | `FG_MUTED_ROWS=4 V3_BELOW_4.5=0`，exit 0 ✅ |
| `node scripts/verify-contract-anchors.mjs` | 真跑 | 76 段 / FAIL 0 / WARN 24，exit 0 ✅ |
| `node test/smoke.mjs` | 真跑 | **310 passed / 0 failed**，exit 0 ✅（README 同步 310） |
| 尺度令牌消费 | 宽容正则（含 `var(--x,...)` 兜底形态）逐一统计 26 个 | **未消费 = 0** ✅（B-8 断言为真机检：从源码提取定义集与消费集比对，非自证） |
| `@keyframes` / `animation:` / `infinite` | 全文计数 | 真实规则 **0 / 0 / 0**；唯一 `keyframes` 命中是「已删」说明注释（`client.js:5067`）✅ |
| 书卡 | 读规则 | 无 `min-height:180px`；`border-left:3px solid var(--nv-border-strong)` 书脊 + `r-xl` + `--nv-surface` ✅；`min-height:180px` 仅存于 `.nv-cplus`（新建磁贴，符合 B-2 例外） |
| 标题栏 | 读规则 + 常量 | `.nv-bar{height:36px}` + `TITLE_BAR_H = 36` ✅ |
| rail | 读 CSS/JSX | `.nv-rail{width:44px}`、按钮 `32×32`、`role="toolbar"`、`aria-label` ×34、`border-right:1px solid border-strong` ✅ |
| 选中态 | 读规则 | `.nv-chrow[data-sel=true]{background:transparent;color:var(--nv-fg);box-shadow:inset 2px 0 0 0 var(--nv-accent)}` ✅；`.nv-chrow:focus-visible` 仍在（焦点与选中可区分） |
| 数据面板 | 读规则 | 表格 `13px/26px`、信号行 `border-left:2px solid var(--nv-warn)`、`.nv-mono` 数值 ✅ |
| measure | 读规则 | `.nv-content{max-width:var(--nv-measure);margin:0 auto}`；`.nv-edwrap{max-width:var(--nv-measure);…;font-size:var(--nv-fs-body)}` ✅ |

---

## 二、B-1~B-10 逐条裁决（新判据是否等价或更好、有无丢失设计意图）

| # | 裁决 | 说明 |
|---|---|---|
| B-1 控制条等宽→rail 44px + toolbar + title/aria | **更好** | 守卫强度提升（新增 a11y 断言：`role=toolbar`、`title`+`aria-label`），且这是 DEC-155 显式授权的形态替换 ✅。**但** `role="toolbar"` 在 ARIA 里隐含「方向键在按钮间移动」的交互预期，当前是 3 个按钮各自 tab 序（未实现 roving tabindex）⇒ P3：要么实现方向键，要么把 `role` 改为 `group`（语义更诚实） |
| B-2 书卡去 `min-height:180px` | **等价（行内等高仍成立）** | 我核了 `.nv-cgrid{align-content:start}`，`align-items` 默认 `stretch` ⇒ 同一行内卡片仍会被拉齐到最高者，「高度随内容」在**行粒度**成立；`.nv-cplus` 保留 180 以保证新建磁贴的点击面积，合理 ✅ |
| B-3 标题栏 38→36 | **更好** | 纯规格对齐（DEC-155 授权），`TITLE_BAR_H` 常量与 CSS 同步；smoke 断言同时锁常量与规则，防漂移 ✅ |
| B-4 monogram→书脊线 | **等价但需目检**（见 Q5） | 设计意图「去掉彩色块噪声、用左侧线建立扫描基准」达成；代价是失去「首字快速识别」⇒ 多书列表的扫描效率需目检（清单 B11） |
| B-5 选中态去底色块→左 2px 竖线 + 主色文字 | **更好（暗色更清晰）** | 亮色 accent = 近黑 `#0f1115`（2px 竖线对白 18:1）、暗色 = 近白，两主题都强；同时文字由 muted→primary 提供第二信号。风险仅剩「扫视时不如整块底色醒目」⇒ 目检（B10） |
| B-6 书卡 hover 只提边框 | **与 §7.3 一致** | 去底色变化/位移/光晕；亮色下 1px accent 边框是唯一可感知变化 —— 符合我 DR2 定的「可感知性=边框/前景变化」✅；smoke 断言精确到 `border-left-color` ✅ |
| B-7 圆角令牌化（值等价） | **等价** | 值不变、来源唯一化 ✅ |
| B-8 未消费尺度令牌 = 0 | **更好（我 DR1 硬条件已兑现）** | 断言是**真机检**（提取定义集与消费集比对），不是「数字写死」；26/26 全部有消费者，其中 10 个历史未用令牌在阶段 2 落地 ✅ |
| B-9 measure 34em + edwrap 显式 15px | **更好** | `34em` 是**以字数为锚**（≈34 个中文字/行），比 px 更符合阅读排版语义；`.nv-edwrap` 显式 15px 消除 em 的上下文依赖，harness 也标注了等效值口径 ✅（见 Q3） |
| B-10 循环动画清零 | **等价偏保守，但 busy 反馈需补** | `@keyframes`/`animation:`/`infinite` 真值 0 ✅；`title`/`aria` 仍在。**但** claim「busy 用静态点 + 文案进度」在 rail 里只找到**静态 refresh 图标**（`client.js:4327`），没有可见文案；无动画后该图标与「卡住」无法区分 ⇒ P2（见 §三） |

**总评**：B-1~B-10 的迁移方向正确，**没有把设计意图丢掉**（唯一争议点是 B-4 的识别效率与 B-10 的 busy 反馈，均为目检/P2 级）。

---

## 三、必须解决的 2 个设计风险（P2，非提交阻塞，但阻塞「验收通过」）

### P2-1 工作流状态文字消失（图标化过度）
- 现状：rail 状态为**纯图标/圆点**，语义只存在于 `title` 与 `aria-label`（`statusText`）。原设计有可读文字（未绑定/运行中/会话失效）。
- 影响：**无悬停能力或不便悬停的用户**（触屏、快速扫视）无法得知工作流状态；「会话失效/未绑定」是**需要用户介入**的状态，靠 tooltip 承载不可接受。
- 依据：方向 B 参考的 Obsidian 恰恰是「状态提示极简但**是文字**」；Vercel Geist 的「状态色只作点/图标」前提是**别处有文字**。
- 要求（二选一，成本都很低）：① rail 状态图标下加 **10~11px 竖排/两字标签**（44px 可容纳「运行中」3 字竖排）；② 把状态文字常驻到标题栏（`.nv-bar-note` 同区）或章节列表头。**不得**只靠 `title`。
- 若团队坚持纯图标：目检必须专门判定「不看 tooltip 能否知道状态」，判不出即视为不通过。

### P2-2 rail 按钮的焦点样式缺失（a11y）
- 现状：`.nv-wfctl-btn` / `.nv-wfctl-btn2` **没有 `:focus-visible` 规则**（全仓仅 `.nv-ft-row`、`.nv-chrow` 有），rail 主按钮 `border:none` ⇒ 键盘聚焦只剩 UA 默认环，与设计系统统一的「2px bg + 4px accent 60% 双环」不一致；暗色主题下 UA 环观感不可控。
- 要求：给 `.nv-rail .nv-wfctl-btn:focus-visible` / `.nv-rail .nv-wfctl-btn2:focus-visible` 复用既有双环规则（与 `.nv-ccard` 同型），并加 smoke 断言（断言存在即可）。
- 附带：`role="toolbar"` 的方向键导航（见 B-1 的 P3）建议同批处理。

---

## 四、逐问裁决（Q1~Q7）

**Q2（44px rail 是否满足「界面退后」）**：**满足**。原等宽控制条（≈chapterW 级）被 44px rail 取代，正文/章节区获得实质宽度；按钮 32×32 + 8px 间距在 44px 内成立（几何实测 44×152）。**但状态图标化的可读性退化是真实回退**（P2-1），不能以「rail 更精简」掩盖。

**Q3（`--nv-measure:34em` 用 em）**：**接受 em，不要求改 px**。理由：①阅读宽度的正确语义是「每行多少字」，em 随字号自动缩放，正是想要的行为；②改 px 会在用户放大字号/未来调 `--nv-fs-body` 时失效；③依赖已消除（`.nv-edwrap` 显式 15px、`.nv-content` 走 `TYPO.body`→`--nv-fs-body`），且 harness 用 15px 等效值并**如实标注**该口径。**要求**：设计文档 §2.2/§7 补一句「measure 以 em 锚定字数（≈34 中文字/行），不得改成 px」——防后来者"修正"。

**Q4（选中态可辨性）**：**方向正确，需目检确认**（清单 B10）。亮色 2px 近黑竖线 + 文字转 primary，两信号叠加；风险仅在「扫视惯性不如底色块」。若目检判定不醒目，最小补救 = 选中行加 `background:color-mix(fg 3%)`（不恢复整块蓝底）。

**Q5（书脊线替代 monogram 的辨识度）**：**接受，列入目检（B11）**。理由：书名 17/600 本身就是最强识别符；monogram 是把书名首字重复一遍，信息冗余。风险在多书（>6 本）栅格中缺少「色彩锚点」，扫描速度可能下降。**若目检判定下降明显**，建议的补救**不是**恢复色块，而是「书名首字以纯文本大字号呈现（无色块）」——保留 DEC-155 的「去彩色块」意图。

**Q6（阶段 2 是否算方向 B 交付完成）**：**「方向 B 代码面完成，验收待人工目检」**——但附一条：**状态可感知性（P2-1）是唯一可能出现设计回退的点**，目检不通过则需补文字后才算交付。外置项（`--nv-font` serif 阅读模式、命令面板、骨架屏）按 DEC-155 归 UX-062，不构成本阶段缺口。

**Q7（目检清单是否需更新）**：**需要**（清单已有 69 行，但含过期项且缺方向 B 形态）。必须变更见 §五。

---

## 五、目检清单必须增补/修订（`docs/verification/UX-061-visual-inspection-checklist.md`）

**必须删/改（过期项）**：
1. **D2「正文阅读行宽（当前未做 measure，阶段 2 再做）」→ 过期**，改为「measure 34em ≈510px 的阅读舒适度（每行 ≈34 中文字）」。
2. **B5 表单行等高**：现描述「输入 32 / 按钮 28，已知 4px 差」→ 改为「输入 32 / 按钮实测 29（~3px 差），判定是否可接受」。

**必须新增**：
| # | 新增目检项 | 预期与失败判据 |
|---|---|---|
| B7 | **rail 常驻宽度与正文空间** | 44px rail 不挤压正文；按钮图标不裁切；失败 = 正文可用宽度明显变窄/图标溢出 |
| B8 | **measure 阅读行宽** | 正文每行 ≈30–36 中文字，长段不「一行太长/太短」；失败 = 行宽 >40 字或 <25 字 |
| B9 | **状态可感知性（P2-1 专项）** | 不悬停即可知道「运行中/空闲/未绑定/会话失效」；**失败即不通过**（须补文字） |
| B10 | **章节选中态** | 左 2px 主色竖线 + 文字主色，明暗两主题都能一眼定位当前章；失败 = 需找一眼才看出 |
| B11 | **书脊线多书辨识** | 6 本以上卡片栅格中扫视/定位某本书不吃力；失败 = 记录并评估「首字纯文本」补救 |
| B12 | **数据面板表格** | 13px 中文表格可读、行高 26 不拥挤、severity 竖条颜色含义清楚、数值 mono 对齐 |
| B13 | **阶段徽标竖排** | `writing-mode:vertical-rl` 的阶段名可读（2–4 字不扭脖），不截断 |
| B14 | **busy 无动画后的感知（P2-1/B-10 专项）** | 运行中时 static refresh 图标不让人误判「卡住」（需有文字或进度提示）；失败 = 计入 P2-1 |
| A6 | **rail 在明暗主题下的边界/按钮对比** | 44px 栏右缘 1px border 可见；go（accent 实底）/stop（err 实底）在暗色下不糊 |

**口径补充**：几何类（rail 44 / measure 510 / chrow 28 / cinput 32）已被 `verify-visual-geometry.mjs` 机检覆盖，目检清单可注明「几何项已机检，人工只看观感与可辨性」，避免重复劳动。

---

## 六、提交与阶段判断

**可提交**；限定语：
```
UX-061 阶段 2（方向 B 布局节奏）—— 代码面完成，验收待人工目检

1. measure：--nv-measure:34em（≈510px@15px，按字数锚定）；.nv-content/.nv-edwrap 居中；edwrap 显式 15px。
2. 44px 竖向 icon rail（role=toolbar + title/aria-label；32×32 按钮；border-right 1px）；标题栏 38→36；章节行 28。
3. 单色强调 + 循环动画清零（@keyframes/animation/infinite = 0；busy 为静态图标）。
4. 书卡：去 min-height/去 monogram 色块 → 左侧 3px 书脊线；hover 只提边框。
5. 数据面板：表格 13/26、severity 左 2px 竖条、数值 mono。
6. 尺度令牌 26/26 全消费（smoke 机检「未消费 = 0」，我复跑确认）；几何基线（rail 44 / measure 510 / chrow 28 / cinput 32）由 verify-visual-geometry 实测。
7. 待目检（清单已更新 B7~B14 · A6）：重点 = 状态可感知性（纯图标无悬停是否可辨）、rail 按钮焦点样式、书脊线多书辨识、选中态醒目度。
8. 已知待补：rail 按钮 :focus-visible 缺失（P2-2，需复用双环规则）；纯图标状态需补常驻文字（P2-1）。
```

**A+B 合并验收口径**：A 迭代（含 1b-2）与此阶段共用同一份目检清单；**任一项失败 → 不得宣称「视觉验收通过」**，按清单登记修复项。方向 B 的「完成」措辞只能是「代码面完成」，不能是「交付完成」。

---

## 七、备注（P2/P3 汇总）

- **P2-1** 状态文字消失（须补常驻文字或目检判定，见 §三）。
- **P2-2** rail 按钮缺 `:focus-visible` 双环（须复用 `.nv-ccard` 同型规则）。
- **P3-1** `role="toolbar"` 无方向键导航 ⇒ 改 `role="group"` 或实现 roving tabindex。
- **P3-2** 设计文档补「measure 用 em 锚字数，不得改 px」一句。
- **P3-3** 目检清单口径：几何项已机检，人工只判观感/可辨性（避免重复目检）。

**待验证（本审查无真实宿主 UI 互动，不视为通过）**：全部目检项（明/暗/合成主题 × 4 视图 × 七态 + B7~B14/A6）；触屏/无悬停场景的状态可感知性；竖排阶段徽标在真实字体下的字形；Edge 几何值在真实宿主窗口尺寸下的稳定性。
