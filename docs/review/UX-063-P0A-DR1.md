# REVIEW-UX-063-P0A-DR1 — UX-063 P0-a 第①步 设计符合性审查（第 1 轮）

- **审查对象**：工作树未提交改动（HEAD = `70223f3`）——`lib/client.js`（+271/−47，5407→5631）、`lib/host-contract.mjs`、`test/smoke.mjs`、`scripts/verify-visual-geometry.mjs`、`README.md`、`docs/verification/UX-063-assertion-migration.md`
- **审查者**：Design Reviewer（独立子代理，只读产品代码）
- **依据**：`docs/design/UX-063-redesign-spec.md`（v3）、`docs/verification/UX-063-assertion-migration.md`、`docs/research/UX-063-writing-app-layouts.md`、实际源码
- **结论**：**NEEDS_CHANGE**　**unresolved_blockers = 2**（P1×2；P2×3；P3×4）

> 判定口径：P0/P1 计为 unresolved_blockers；P2/P3 为备注（本轮不阻断，但须登记）。
> 本轮**未**使用「审查通过」措辞：§E 真机 CDP 与用户目检均未执行。

---

## 1. §1A 交付完整性逐项核对

| # | 规格要求 | 实现事实 | 判定 |
|---|---|---|---|
| 1 | `.nv-split` 覆盖「宿主会话区左缘 → 视口右缘」（colW 全宽）+ resize 重算 + 复用 `findConversationRoot()` 不硬编码侧栏 | `style.left = g.left`、`width = colW`（client.js L4579-4582）；RO 回调 `refreshGeom()` → 抽屉态 `applyDrawer()`（L1273-1281）；沿用 `findConversationRoot()`（L1150-1158，契约 3.1） | **PASS** |
| 2 | 抽屉 420 / 唤出条 48 / z 920（900<920<950）/ localStorage 持久化 / 默认收起 | 常量 L1051-1067；`loadDrawerOpen`/`persistDrawerOpen` try-catch（隐私模式降级收起）；`applyDrawer` 写 z 920（L1446-1455）；CSS `.nv-split` 900（L5102）/ `.nv-console` 950（L5196） | **PASS**（跨子树层叠见 P2-2） |
| 3 | 让位：收文件树 + 章节列（保留 rail 44），文本列 `min(544, colW−44−376−24)` | `.nv-left`/`.nv-vdiv` 抽屉态不渲染（L4678/L4693）；`navCollapsed` 收起 `.nv-chlist`/`.nv-chdiv`（L2220/L2251）；`maxWidth = drawerTextMax`（L2253） | **PASS** |
| 4 | 五路径恢复（关抽屉/切书/关工作台/Esc/刷新）共用同一还原函数；宿主组件零改动 | `snapshotViewArea`/`restoreViewArea` 15 属性单点（L1400-1442）；调用点 5 处（L1268/1342/1360/1489/1583）；`persistDrawerOpen` 供刷新复原；无 `innerHTML`/`replaceChildren` | **PASS** |
| 5 | 降级：<956 提示「不承诺零遮挡」，<740 提示「建议全屏」，不抛错 | L4313 `drawerHintText`；in-flow `.nv-drawer-hint`（L4674-4676） | **PASS**（口径偏差见 P3-2） |
| 6 | host-contract item 3.3 登记 position/zIndex/boxShadow + 48px 唤出条 DOM | item 3.3 扩为全量操纵面（L158）；item 3.7 追加 `dsh.novel.drawer.v1`；`regionLiterals.viewAreaProps` 15 属性；smoke ⑫ 双向 ⊆ | **PASS** |
| 7 | 顶栏新增控件 ≤2 | 新增 1 个（抽屉开关 `.nv-bar-ctl[data-on]`，L4625-4631） | **PASS** |

**禁改清单**：`git diff --stat` 仅 6 个产品/文档文件 + 3 个治理文件；rail / 竖排短标签 / 3 页签 / 文件树结构 / 章节行 28px 与选中线 / `✓已发·⚠门禁失败` / 门禁卡与机器审计 / 6 项存量令牌 / `lib/index.js` / API 面 / 轮询 / `lib/host-boundary.js` / install 脚本 / `package.json` / `cordis.patch.yml` **零 diff**（逐项核对通过）。

**独立复跑（本人实跑，非采信交付报告）**：`node --check lib/client.js` 0 错；`node test/smoke.mjs` **319 passed / 0 failed**；`node scripts/verify-visual-geometry.mjs` **OK**（exit 0）。

---

## 2. §3 真值表算术复核（本轮最重要项）

### 2.1 真实左 chrome 的确定（代码事实，非估计）

抽屉态渲染链（抽屉开启 → `navCollapsed = true`）：

```
.nv-split  border:1px（border-box, L5102）                    → 内缘 +1
.nv-main   无 padding（L5112）                                 → +0
中窗列     无 padding（L4694）                                 → +0
上部区     padding:'10px 10px 0'（L4705）                      → +10
ChapterPanel 根 div 无 padding（L2219）                        → +0
正文列     无 padding（L2253）                                  → 列盒左缘 = **11**
（内层 .nv-scroll paddingLeft:12 只影响文字内缩，不改列盒右缘）
```

⇒ **正文列盒左偏移 = 11px**（split border 1 + 区域 padding 10）。

Developer 报告 §4(b) 称「实测左侧 chrome 58px（rail 44 + padding 12 + border 2）⇒ 956–1022 档最多相交 ~34px」。**该前提不成立**：

- rail（`.nv-rail`，44px）唯一渲染点在 `midFooter`（L4485-4497），属**底部工作台**，**不在**上部内容区；抽屉态正文列左缘与之无关。
- 交付报告另称「本机 CDP 探针均报隔离实例未启动（ERR_MODULE_NOT_FOUND）」⇒ 其「实测」**无测量支撑**（P-01：不得以推演冒充实测）。

### 2.2 复算表（真实 chrome 11px；drawerTextW = max(160, min(544, colW−444))）

| colW | 视口 | 文本列宽 | 抽屉左缘−文本右缘 | 抽屉∩文本 | 开启态手柄区间 | 手柄∩文本 |
|---|---|---|---|---|---|---|
| 1400 | 1680 | 544 | 425 | 0 | 932..980 | 0 |
| 1160 | 1440 | 544 | 185 | 0 | 692..740 | 0 |
| 1086 | 1366 | 544 | 111 | 0 | 618..666 | 0 |
| 1046 | 1326 | 544 | 71 | 0 | 578..626 | 0 |
| 1023 | 1303 | 544 | 48 | 0 | 555..603 | 0（相切） |
| **1000** | **1280** | 544 | 25 | 0 | 532..580 | **23** |
| 988 | 1268 | 544 | 13 | 0 | 520..568 | **35** |
| 956 | 1236 | 512 | 13 | 0 | 488..536 | **35** |
| 800 | 1080 | 356 | 13 | 0 | 332..380 | **35** |

**结论（对 (b) 的裁决）**：

1. **抽屉本体零遮挡成立**：真实 gutter ≥ 13px（≥956 档），实现与 §3 表「988–1008=544 / 956–988=512–544 / 零遮挡」**一致**，**不需要重推公式**，更不得据 58px 误前提修订真值表。
2. **但 §3 未覆盖的新增元素引入了新遮挡**：Developer 自加的「开启态关闭手柄」（偏差 (d)）位于 `g.right−468..g.right−420`，在 **colW < 1024（视口 < 1304，含 1280×800 常见笔记本）** 时覆盖正文列右缘 **23–35px**，且该档 **不显示任何提示**（提示阈值 `<956` 为开区间）⇒ 见 **P1-1**。
3. §3 的「gutter 24」在真实布局中为 **13px**（公式按 44 预留、真实 chrome 仅 11）⇒ 余量口径偏差属 P3，不影响零遮挡结论。

---

## 3. Findings

### P1-1（阻断）开启态手柄在 colW ∈ [956, 1024) 静默覆盖正文列右缘 23–35px

- **事实**：`lib/client.js` L4735-4739 开启态手柄 `left = g.right − DRAWER_W − DRAWER_EDGE_W = g.right − 468`、宽 48、`zIndex 921`（压在正文与抽屉之上）；正文列盒右缘 = `g.left + 11 + textMax`。二者在 colW < 1024 时相交（1280 视口 → 23px；1236–1268 → 35px）。
- **为何是 P1**：1280×800 是常见真实窗口；遮挡**无提示**（`drawerNarrowHint` 仅在 `colW < 956` 触发）、**无断言**（geometry 探针不含手柄与正文列的正交判据）、只在用户肉眼可见时才会发现。
- **建议修法（择一，推荐 A）**：
  - **A（推荐，无几何 churn）**：仅当 `colW ≥ 1046`（= 11 + 24 + 544 + 420 + 48 的不相交下限）渲染开启态手柄；更窄时改为 **Esc 先关抽屉**（抽屉开启时 `Escape` → `closeDrawer()` 并 return，不关整台工作台），同时把窄窗提示阈值改为「`drawerOpen && colW < 1046`」以如实披露。
  - B：把手柄移入抽屉内缘（覆盖会话内容左侧，需宿主对话自身 padding 足够，风险不可静态确认）。
  - C：窄带把 `textMax` 再减 48 ⇒ 956 档掉到 464，违背 §3「≥512」，**不建议**。
- **验收**：修复后 geometry 必须新增 `handle ∩ text = ∅`（手柄渲染时）判据，且在 1280/1268/1236 三档由红转绿。

### P1-2（阻断）geometry「零遮挡/gutter 24」断言自证，无真实判别力

- **事实**：`scripts/verify-visual-geometry.mjs` 的 `u63StageHtml` 把正文列注入为 `position:absolute; left:0`，宽度直接取**同一公式**；实测 `r = 552` 实为 `544 + body 默认 8px margin`。⇒ 断言内容等价于「代码里的公式等于代码里的公式」，`dl − r = 24` 为**构造恒等式**，既非布局真值（真实 13），也无法捕获真实 chrome 变化或手柄遮挡（P1-1 即由此漏过）。
- **为何是 P1**：本步唯一新增的几何守卫在此口径下对本步最关键的风险（遮挡）零信号，与仓库既有处置口径（「守卫强度 < 声称」类 FAIL）一致；迁移表 F6 亦把该断言当作「判别力修正」记录，属**过度声称**。
- **建议修法**：注入真实左偏移（`11 = split border 1 + 区域 padding 10`，常量从源码抽取而非硬编码），断言 `drawerLeft − textRight ≥ 0` 且（手柄渲染时）`handle ∩ text = ∅`；输出文案改为「公式余量 / 实测余量」双值，不得以单一「gutter 24」冒充实测。

### P2-1 抽屉开启时 `resetSplit()` 可把抽屉甩到左侧

- **事实**：L1552-1568 `resetSplit()` 无条件 `this.chatSide = s.chatSide`（可含 `'left'`，来自存档或默认槽），随后 `if (drawerOpen) { chatW = DRAWER_W; applyDrawer() }`；`applyDrawer → applyMargin` 依据 `chatSide` 决定 margin 方向 ⇒ 抽屉出现在**左缘**，而手柄坐标仍按右缘计算（L4737），手柄与抽屉脱节。
- **触发**：抽屉开启 → 点标题栏 ⟳「恢复默认布局」（且默认槽/存档 `chatSide='left'`，`chatSide` 支持左置）。
- **修法**：`resetSplit` 内抽屉态强制 `chatSide = 'right'`（保存 `drawerSideSaved`），或在 `applyDrawer` 前统一收敛右缘（单一事实源）。

### P2-2 跨子树 z-order 仅静态值验证

抽屉是**宿主 viewArea**（会话区子树）内联 z 920，`.nv-split` 在 `shell.overlay` 槽子树 z 900。二者若分属不同 stacking context（祖先含 transform/filter/contain/z-index），数值序不必然等于绘制序。当前仅断言「三值共存」，未验证「抽屉确实压在分栏之上、手柄确实可命中」。**归 Coordinator 真机 CDP**（并纳入迁移表 §E），本条不阻塞代码修改，但**在 §E 完成前不得宣称交付完成**。

### P2-3 `.nv-drawer-hint`（in-flow）未计入手柄 top

两处手柄 `top = g.top + TITLE_BAR_H + noticeBoxH`（L4732/L4737），只扣告警条高度；`.nv-drawer-hint` 为 in-flow 行（约 3+16+3+1 ≈ 23px，L5134）会把 `.nv-main` 整体下移，但手柄不下移 ⇒ 提示行出现时手柄顶边压住提示行右端约 23px（与 P1-1 同域，窄窗更乱）。修法：`noticeBoxH` 同口径并入 `hintH`。

### P3-1 规格 §1A「脚手架已原型 `restoreViewArea()`」不成立

`git show HEAD:lib/client.js` 检索 `restoreViewArea|snapshotViewArea` **零命中**（本人复核）⇒ 偏差 (a) 事实成立，属**规格缺陷**（非实现缺陷）。规格需 v3.1 更正为「新实现快照/恢复单点」。

### P3-2 规格 §3「740–956 抽屉半透明覆盖」实现为不透明覆盖

实现用 `background: var(--nv-bg)`（L1453-1462）不透明 + 提示文案。不透明更利于正文可读性，建议**采纳实现口径并修订规格**（把「半透明」改为「不透明覆盖 + 降级提示」）。

### P3-3 gutter 口径偏差

规格公式预留言 44（rail），真实 chrome 11 ⇒ 真实 gutter 13（非 24）。零遮挡结论不受影响；§3 表与迁移表 F6 的「gutter 24」应标注为**公式余量**，实测余量以真机 CDP 数值为准。

### P3-4 抽屉态工作流面板信息不可见

抽屉态收起 `.nv-left`，rail 保留但**阶段/门禁/请求列表**随左窗消失；规格 §1A 只写「收起文件树 240 + 章节列 160」，未说明工作流面板同去。可接受（属导航收起的自然结果），但应在 §1A 明写，避免后续误判为回归。

---

## 4. 偏差裁决（对应交付报告 §4）

| 偏差 | 裁决 | 依据 |
|---|---|---|
| (a) `restoreViewArea()` 实际不存在，按意图新实现 | **接受**；规格措辞更正（P3-1） | HEAD 检索零命中，实现为最小必要新增 |
| (b) 58px chrome ⇒ 956–1022 相交 34px，请裁决「接受 / 重推公式」 | **两条都不接受**：前提错误（真实 chrome 11，rails 在底部）；抽屉零遮挡成立，**不重推公式**。但由此暴露的真问题是「开启态手柄遮挡」（P1-1）与「断言自证」（P1-2），须修 | 本文 §2 复算表 |
| (c) `drawerTextW` 160px 下限 | **接受** | 防正文列不可见的落地保护；<740 已降级提示 |
| (d) 新增开启态关闭手柄 | **方向接受**（抽屉盖住标题栏开关，必须有出口），**形态需改**：窄带藏 + Esc 先关抽屉（P1-1） | 1280 视口静默遮挡 23px |
| (e) 关抽屉/关台/切书落「收起」 | **接受** | 与「默认收起 + 持久化」意图一致，避免「上次开过 ⇒ 每次重开都开」 |
| (g) 抽屉态 ⇄ = 先收起再翻转 | **接受** | 无几何残留；建议文案/提示无需改 |
| (f) 3 处未列迁移表的历史连带迁移 | **接受**（已入迁移表 F1/F2/F3） | 口径变化可追溯，断言未退化 |

---

## 5. 可感知性预判（本任务的存在理由）

**第①步独立可达的「肉眼可见」差异（并排截图口径）≈ 3–4 处**：

1. 工作台由 700px（占屏 42%）变为**全宽**；
2. 对话窗默认**消失**，改为右缘 48px 唤出条 + 420 抽屉（结构级差异）；
3. 正文阅读行宽 236px → **510px**（≈2.16×；注意：行宽受 `--nv-measure:34em` 封顶 510，**544 要等第③步**字号 16 才成立——交付报告 (i) 已如实区分列宽/行宽，此处复核一致）；
4. 窄窗降级提示行（仅窄窗出现，不计入常规对照）。

**不足 5 处** ⇒ 剩余差异依赖第②步（任务流首页 / 唯一主 CTA / 待办三项 / 最近章节 / 紧凑换书，+3~4 处）与第③步（16px + 首行缩进 + 段距 0.8em，+2~3 处）。

**红线（措辞纪律 N-4）**：任何证据/commit/汇报只能写「**P0-a 第①步已交付**」；**禁止**写「P0-a 已交付」「视觉验收通过」「感知提升达标」。用户复检不得提前到第①步单独进行（会重演 UX-061「变化不大」的判定）。

---

## 6. 措辞与可追溯性核对

- 迁移表 **#13 标注为「[已迁移 · 第①步部分]」并显式写明 `.nv-home` 880 / CTA 36 属第②步未实现** ⇒ **无越界声称**（本项为正面结论，非缺陷）。
- 迁移表 F.1 的 RED→GREEN 留档与独立复跑一致（本人实跑 319/0、geometry OK）；RED 留档在盘（`.scratch-ux063/red-smoke.txt` 40KB / `red-geometry.txt` 130B，`.scratch*/` 已被 `.gitignore:15` 忽略，无未跟踪垃圾）。
- 契约面行号：面 2/3 共 18 项重基，`verify-contract-anchors.mjs` 79 段 FAIL=0（本人未见新增 anchor 告警）。
- i18n 3 键 zh/en 成对（L243-248 / L426-434）；手柄 `title` + `aria-label` 双属性在场；焦点样式用 `:focus-visible` 双环，未改几何 ⇒ 无布局抖动。

---

## 7. 最小放行清单（修完即可转 APPROVED_WITH_NOTES / 0）

1. **P1-1**：开启态手柄在 `colW < 1046` 不渲染（或等效不遮挡方案）+ 抽屉态 `Esc` 先关抽屉 + 窄窗提示阈值改 `drawerOpen && colW < 1046`。
2. **P1-2**：geometry 按真实左偏移 11 建模，新增 `drawer∩text=∅` 与 `handle∩text=∅`（手柄渲染时）判据，并区分「公式余量 / 实测余量」文案。
3. **P2-1**：`resetSplit()` 抽屉态强制右缘（一行）。
4. **P2-3**：两处手柄 `top` 计入 `hint` 高度（一行）。
5. 规格 v3.1 注记：P3-1（restoreViewArea 措辞）/ P3-2（不透明覆盖）/ P3-3（gutter 口径）/ P3-4（抽屉态工作流面板）——由 Coordinator 在交付后补，非代码阻塞。

> **P2-2（真机 CDP：层叠/命中/双视口量测 + 并排截图）** 归 Coordinator，必须在用户目检前完成并登记迁移表 §E；本审查**不构成**第①步之外的任何验收。

---

**审查结论**：**NEEDS_CHANGE**　**unresolved_blockers = 2**（P1-1 开启态手柄静默遮挡正文；P1-2 几何断言自证无判别力）
**审查日期**：2026-10-23　**审查者**：Design Reviewer(subagent)　**审查轮次**：P0A-DR1
