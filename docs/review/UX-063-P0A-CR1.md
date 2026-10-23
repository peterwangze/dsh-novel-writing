# UX-063 P0-a 第①步 · 独立代码审查（CR1）

- **审查对象**：工作树未提交改动（HEAD `70223f3`）：`lib/client.js` +271/−47、`lib/host-contract.mjs` +27/−20、`test/smoke.mjs` +111/−9、`scripts/verify-visual-geometry.mjs` +76/−1、`docs/verification/UX-063-assertion-migration.md` +36/−14、`README.md` +1/−1
- **日志/包/执行包改动**（`.governance/**`）属治理面，不在本审查范围
- **审查者**：独立 Code Reviewer（未参与实现；未修改产品代码；未 commit/push）
- **日期**：2026-10-23
- **依据**：`docs/design/UX-063-redesign-spec.md` v3（DR3 APPROVED_WITH_NOTES/0）、`docs/verification/UX-063-assertion-migration.md`（A/B/C/D/F 段）、`lib/host-contract.mjs`（P-10）、项目原则 P-01/P-02/P-03/P-05/P-06/P-09/P-10

## 结论

**NEEDS_CHANGE**　`unresolved_blockers=1`（P0=0）

阻断项（P1，1 项）：
- **CR1-P1-1 契约面（P-10）事实错误（本批新引入 + 声称不实）**：`lib/host-contract.mjs` item **3.7** 四个存储键锚点 3/4 指向非键行、整体 −2 偏移；item **3.3** 的 5 段 `line` 未覆盖它自己声称登记的 `applyDrawer` chrome 写面（`position/zIndex/boxShadow/borderLeft/background`）。两者都是本步「⑥ 契约 P-10 登记」这一交付物本身的正确性问题，且现有两道守卫（`scripts/verify-contract-anchors.mjs`、smoke ⑫）均无法捕获 → 修好后再复审。

非阻断项：P2 ×4、P3 ×5（见下）。产品行为面未发现 P0/P1 缺陷（三条关键行为经变异测试确认实现正确，但**断言未覆盖**，见 CR1-P2-1/2/3）。

---

## 一、门禁实测（本审查者独立复跑，未采信自述）

| 命令 | 结果 | 与自述一致 |
|---|---|---|
| `node --check lib/client.js` / `lib/host-contract.mjs` / `test/smoke.mjs` | 0 errors（exit 0） | ✅ |
| `node test/smoke.mjs` | **319 passed, 0 failed**（exit 0） | ✅ |
| `node scripts/verify-visual-geometry.mjs` | **OK**（exit 0）：`u63 drawer 420 / edge 48 / z 900<920<950 / text-col 544·544·512·356` | ✅ |
| `node scripts/verify-contract-anchors.mjs` | 共 79 段；**FAIL=0**；WARN=25 | ✅ |
| `node scripts/verify-contrast.mjs` | `FG_MUTED_ROWS=4 V3_BELOW_4.5=0`（exit 0） | ✅ |

基线与回归：改动前（HEAD）smoke 314/0；本批 +5 条断言；既有 rail 44 / measure 510 / chrow 28+12px / para 1em 全部未变（geometry MEASURE 逐项一致）。

## 二、Finding 明细

### CR1-P1-1（P1，阻断）契约面事实错误 —— 本批新引入 + 「逐行复核」陈述不实

**(a) item 3.7 存储键锚点 3/4 错误、整体 −2**

| 契约声明 | 实际（`lib/client.js` 实读） | 判定 |
|---|---|---|
| `L1015` | 注释行 `// width=clamp 后 chatW → …`（split 键在 **L1017**） | ❌ 非键行 |
| `L1017` | `const SPLIT_PERSIST_KEY = 'dsh.novel.split.v1'` | ⚠️ 值对但归属错位（实际是 defaults 的应位） |
| `L1065` | `const DRAWER_RAIL_W = 44` | ❌ 非键行 |
| `L1115` | 注释行（order 键在 **L1117**） | ❌ 非键行 |

实测真值：**split L1017 / defaults L1019 / drawer L1067 / order L1117**——契约四值 **全部 −2**。

关键事实：**HEAD 时该字段是准确的**（`git show HEAD:lib/client.js`：1007 / 1009 / 1074 与键位逐一吻合）⇒ 本批把它从「准确」改成了「错误」，属**回归**，非既存债。

**(b) item 3.3 的 5 段未覆盖 applyDrawer 写面**

声明段：`L1381-L1396 / L1400-L1417 / L1422-L1442 / L1446-L1455 / L4731-L4739`；符号声称登记「抽屉态 position:relative / zIndex 920 / boxShadow / borderLeft / background 覆盖」。实读：
- `L1457-1461`（`viewArea.style.{position,zIndex,boxShadow,borderLeft,background} = …`，即 `applyDrawer` 的全部 chrome 写面）**不在任何声明段内**——第 4 段止于 `L1455`（`if (viewArea === null) return`）。
- 第 2/3/4 段均**起止于函数中部**（1417 止于 snapshot 半途；1422 起于 snapshot 半途；1446 起于 restore 注释行），与「按段登记」的语义自述不符。

**(c) 为什么两道守卫都没红（守卫强度 < 声称）**
- `verify-contract-anchors.mjs` 对 3.7 报 OK（该脚本只做形态/非空/唯一性类判据）。
- smoke ⑫ 对 3.7 只断 `it37.symbol.includes('dsh.novel.drawer.v1')`，**不校验 line**；⑫b 范围判据明确排除 3.7（「本项非范围形态，不入 ⑫b 范围条目计数」）。
- 结论：契约 `line` 字段是「唯一事实源」，但它错了却零信号——与本仓 COMPAT-005/012/014 反复处置的同一失效模式。

**(d) 陈述不实**：迁移表 **F4** 写「面 2/3 共 18 项 `line`… 全部按 `git diff -U0` hunk 累计位移重基（**端点逐行复核**）」。若真做端点逐行复核，3.7 的 −2 与 3.3 的段末截断均会被发现。该陈述不可信。

**修复建议（最小）**：3.7 → `L1017 / L1019 / L1067 / L1117`；3.3 第 4 段改为覆盖 `L1446-L1462`（restore 尾 + `applyDrawer` 全体）或新增第 6 段 `L1453-1462`；F4 陈述改为如实口径。修后重跑 anchors + smoke。

---

### CR1-P2-1（P2）「五路径」不可守卫：删掉「关闭工作台」还原调用仍全绿

同行数变异（不改行号，排除 COMPAT-012/013 行号判定器干扰）：
- **M3b**：`close()` 内 `this.restoreViewArea()` → `// removed` ⇒ smoke **319 passed / 0 failed**。
- 原因：smoke ④ 只断 `restoreCalls >= 4`，5 个调用点丢 1 个仍达标；`close()` 是规格五路径中的「关闭工作台」，其还原一旦丢失，宿主对话窗会残留抽屉态的 5 个内联样式（用户可见污染）。
- **修复**：按路径逐个结构性断言（如 `close()` 体内含 `this.restoreViewArea()`），或把 `>= 4` 收紧为「5 个具名调用点各自上下文命中」。

### CR1-P2-2（P2）「切书」路径断言被另一处同名行满足

- **M5b**：`setBook` 内 `if (this.drawerOpen === true) this.closeDrawer()` → `!==`（语义反转）⇒ smoke **319/0 全绿**。
- 原因：smoke ④ 用全文 `includes('if (this.drawerOpen === true) this.closeDrawer()')`，而 `setChatSide` 内有**逐字相同**的一行 ⇒ 判据被旁路。
- **修复**：改为「`setBook` 函数体内命中」的局部范围断言。

### CR1-P2-3（P2）`applyDrawer` 的 background 写删除仍全绿（P-10 集合级对账不可分辨）

- **M4b**：`applyDrawer` 内 `viewArea.style.background = 'var(--nv-bg,#0b0e14)'` → `// removed` ⇒ smoke **319/0**。
- 原因：`restoreViewArea` 同样写 `background`，⑫ 的 `SRC_PROPS` 取的是全文件去重集合 ⇒ 集合相等仍成立。抽屉丢失背景属**用户可见回归**（抽屉透明叠在正文上）。
- **修复**：⑫ 增加「applyDrawer 函数体内写面 ⊇ {position,zIndex,boxShadow,borderLeft,background}」的局部断言，或 geometry 增抽屉背景实测。

### CR1-P2-4（P2）零遮挡「实测」实为公式自证；真实左 chrome 未建模

- `scripts/verify-visual-geometry.mjs` 中正文列 div 以 `left:0; width:u63TextW(colW)` 注入，`u63TextW` 与源码 `drawerTextW` **同一公式**；抽屉 div 左缘 `colW−420`。故 `dl − r ≥ 23` 是 `colW−420−(colW−444) = 24` 的**代数恒等**，只能发现「常量互不一致」，不能发现真实遮挡。
- 真实布局：正文列左缘含 rail 44 + 内边距/边框（Developer 自述 58）⇒ 正文右缘 ≈ `58 + textW`，抽屉左缘 `colW − 420` ⇒ 相交条件 **colW < ~1070（视口 < ~1350）**；规格 §3 声称 `≥956` 零遮挡、迁移表 #13 记「gutter 24」。Developer 自述 (b) 仅承认「956–1022 最多 34px」，**低于真实推演**。
- 现状并非隐藏（迁移表 §E 仍 ⏳，CDP 归 Coordinator），但 geometry 的 OK 文案与本条 #13 的「实测/gutter 24」措辞**高估了验证强度**。
- **修复**：把该断言/文案降级为「公式一致性（非几何实测）」，并在 §E/CDP 补齐前不得据此宣称零遮挡；或补 CDP 真机量测后再写「实测」。

### CR1-P2-5（P2）`setChatSide` 死代码

```js
setChatSide(side) {
  if (this.drawerOpen === true) this.closeDrawer()   // closeDrawer() 已把 drawerOpen 置 false
  this.chatSide = side === 'left' ? 'left' : 'right'
  if (this.drawerOpen === true) this.applyDrawer()   // ← 永假：死代码
```
行为与偏差说明 (g) 一致（抽屉态点 ⇄ = 先收起再翻转），但第二处 `if` 读起来像「换边后重开抽屉」，属误导性残留，应删除或补注释说明其不可达。

### CR1-P3-1（P3）item 2.14 note 内嵌陈旧行号

note 仍写「行号 = `sessionsCurrentOf` 函数范围（**L899-910**）」，而同条 `line` 字段为 `L923-934`——与 COMPAT-005 R1 F5 确立的「note 不内嵌行号副本」口径直接冲突（实测 HEAD 时该 note 已是陈旧副本，本批未修）。

### CR1-P3-2（P3）item 2.5 / 2.6 锚点与符号不符（HEAD 既存，本批机械继承）

- 2.5 `L815-825`（应为 settings getter `L819-828`）：起点落在 `wrapRemote` 的 catch 返回。
- 2.6 `L816-824`（应为 sessions getter `L830-845`）：整段落在 settings 区。
- `git show HEAD` 证实两值在改动前即错（809-819 / 819-825），本批按 +10 机械平移 ⇒ 错误被保留。**不属本批引入**，但 F4「逐行复核」的表述使读者会误以为该面已被核过。

### CR1-P3-3（P3）开启态手柄 `zIndex: 921` 是 inert 保证

`.nv-split` 为 `position:fixed; z-index:900` ⇒ **独立层叠上下文**；其子元素（手柄）即使 `z-index:921` 也无法压过外部 `z-index:920` 的抽屉。真实浏览器实测（headless Edge + `elementFromPoint`，探针见下）：

| 采样点 | 命中元素 |
|---|---|
| 手柄区 x=540 | `edge`（手柄） |
| 抽屉区 x=700 | `drawer`（z 920 压过 split 900） |
| 工作台区 x=100 | `split` |

即：手柄**可点**纯粹因为它与抽屉矩形**不重叠**（手柄 `[g.right−468, g.right−420]` vs 抽屉 `[g.right−420, g.right]`），而不是因为 z 921。smoke 断言 `clientSrc.includes('zIndex: 921')` 会给未来「把抽屉改宽/把手柄内移」的变更**虚假安全感**。建议注释澄清 + 断言改为「手柄矩形与抽屉矩形不相交」。

### CR1-P3-4（P3）chatdiv 与开启态手柄重叠 2px

`chatdiv` 左缘 = `x + contentW − 2 = g.right − 422`，手柄右缘 = `g.right − 420` ⇒ 重叠 2px；两者同 z 921 且手柄后渲染 ⇒ 拖拽命中区被吃掉一半（4px 命中区只剩 2px）。建议手柄宽度改 `DRAWER_EDGE_W` 内缩或 chatdiv 左移 2px。

### CR1-P3-5（P3）交付报告与落盘不一致

报告称 item 3.3 五段为「L1381-1396 / L1407-1427 / L1429-1451 / L1453-1462 / L4731-4739」、i18n「3 键」；落盘实为 `L1400-1417 / L1422-1442 / L1446-1455`、i18n **4 键**（`chatDrawer`/`chatDrawerClose`/`drawerNarrowHint`/`drawerTinyHint`）。报告行号未随最终重基同步，可作为修复轮顺带订正。

## 三、变异测试（判别力实证，全部在 `%TEMP%` 副本执行，工作区零改动）

方法：复制仓库到 `%TEMP%\ux063-cr1-mut`（junction `node_modules`），每例施加单点变异 → `node test/smoke.mjs` → 还原。**同行数变异**用于排除 COMPAT-012/013 行号判定器的连带失败。

| 变异 | 行数 | smoke | 判定 |
|---|---|---|---|
| M1 `DRAWER_W 420→400` | 同 | 316/3 failed（`ux063 fullscreen/drawer shell`, `ux063 drawer z / text formula`） | ✅ 有判别力 |
| M2 `DRAWER_Z 920→930` | 同 | 317/2 failed（`ux063 drawer z / text formula`） | ✅ |
| M6b `restore` 去 `height` 写 | 同 | 316/3 failed（`ux063 restore guarantee`、P-10 ⑫、计数自校） | ✅ |
| M7b `drawerTextMax` 计算取消 | 同 | 317/2 failed（`ux063 yield/hint`） | ✅ |
| **M3b** `close()` 去 `restoreViewArea()` | 同 | **319/0 全绿** | ❌ 无判别力（CR1-P2-1） |
| **M4b** `applyDrawer` 去 `background` 写 | 同 | **319/0 全绿** | ❌ 无判别力（CR1-P2-3） |
| **M5b** `setBook` 切书判据反转 | 同 | **319/0 全绿** | ❌ 无判别力（CR1-P2-2） |

## 四、禁改清单（迁移表 D 段）与边界核对

- `git diff --name-only` = 6 个产品/文档文件 + 3 个 `.governance/**`；**无** `lib/index.js`、`lib/host-boundary.js`、`install.ps1/sh`、`package.json`、`cordis.patch.yml`、`agent-presets/**`、`.github/**`。
- rail 44 / 竖排状态短标签 / 3 页签 / 文件树结构 / 章节行 28px+12px / 选中线 / `✓已发·⚠门禁失败` / 门禁卡与机器审计：diff 零涉及；geometry 复测同值。
- 6 项存量令牌值（15 / 13.5 / 11 / 17 / 28 / 12）：零 diff。
- 零新增 npm 依赖；`package.json` 未动（`git show` 对照）；无 `viewArea.innerHTML` / `replaceChildren`（smoke ④ 已断言）。
- 真实环境：本审查只读仓库内文件；变异仅在 `%TEMP%` 副本（`ux063-cr1-mut`）执行；未写 `$HOME`/`$DSH_HOME`。

## 五、产品行为面复核（本审查者独立结论）

- 快照/恢复 15 属性**逐项对齐**（源码 15 读 / 15 写，集合一致，`sameSet` 断言成立）；`lastMargin*` 同步防自伤逻辑正确（`restoreViewArea` 末尾）。
- 五路径接线位置正确（open 收起分支 / syncAnchor 换根 / syncAnchor 早退分支 / closeDrawer / close），`setBook`→closeDrawer、Esc→closeWorkbench→close 均在位；**问题只在断言强度**（P2），非实现缺失。
- 抽屉几何自洽：手柄矩形与抽屉矩形不相交（48px 条 + 420 抽屉），抽屉 920 > 工作台 900、< 控制台 950；`localStorage` 读写在 try/catch 内，坏档/隐私模式降级为收起（不抛）。
- 收起态不写宿主、开启态写 5 个 chrome 属性 + margin/width 双压；`snapshotViewArea` 先于任何写（刷新路径正确）；`drawerSideSaved` 暂存/还原自洽，`open()` 不调 `persist()` ⇒ 不覆盖用户 `chatSide` 偏好（已核）。
- 降级提示 `<740` / `<956` 分支与规格 §3 表一致；in-flow 渲染不覆盖标题栏。

## 六、结论与要求

**NEEDS_CHANGE（unresolved_blockers=1）**

修复轮必须完成：
1. **CR1-P1-1**：item 3.7 四锚点改真值（1017/1019/1067/1117）；item 3.3 段覆盖 `applyDrawer` 全体写面；F4「逐行复核」表述改为如实口径；重跑 `verify-contract-anchors.mjs` + `smoke`。
2. 建议同轮一并处理（非阻断，但成本极低且直击守卫弱点）：CR1-P2-1/2/3 三条断言收紧（五路径具名断言、setBook 局部命中、applyDrawer 局部写面）；CR1-P2-4 文案降级；CR1-P2-5 死代码清除；CR1-P3-1 陈旧行号；CR1-P3-5 报告订正。

复审（R2）将以「修复 diff + 本轮报告 + 验收判据」为注入面，重点验证：3.7/3.3 锚点与源码逐行吻合、三条收紧断言在新变异下**必红**、其余禁改面零回归。
