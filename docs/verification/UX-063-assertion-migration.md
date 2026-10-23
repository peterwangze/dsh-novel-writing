# UX-063 断言迁移表（P0-a）

> 依据：`REVIEW-UX-063-SPEC-DR2` D-4（6 行）+ 规格 v3 §5（5 行，其中 2 行合并）。**纪律**：先加新断言（红）→ 改实现（绿）→ 再改旧断言；`lib/client.js` 与 smoke/geometry 同 commit。本表是实现与审查的共同对照物——**实现者每完成一行须在本行末尾标记 `[已迁移]` 并附 commit**。

## A. 必改断言（改实现后必红，须按序迁移）

| # | 旧判据（坐标=事实） | 新判据 | 依据 | 触发条件 | 状态 |
|---|---|---|---|---|---|
| 1 | 正文段距 `1em`：`scripts/verify-visual-geometry.mjs:57`（注入 `.nv-content p{margin:1em 0}`）、`:149`（`paraMarginTop==='15px'`）、`:163`（输出 `para 1em`） | 注入改为 `margin:0 0 0.8em;text-indent:2em`；断言 `paraMarginBottom ≈ 12.8px`（0.8em@16）+ `textIndent` 存在 | 规格 v3 §1C | `.nv-content p` 样式改动 | ⏳ |
| 2 | 段落样式源码断言：`test/smoke.mjs:1453`（`.nv-content p{margin:1em 0;font-size:inherit;line-height:inherit}` 精确串） | 精确串改为 `.nv-content p{text-indent:2em;margin:0 0 .8em;font-size:inherit;line-height:inherit}`（以实现实际写法为准，断言与源码逐字一致） | 规格 v3 §1C | 同上 | ⏳ |
| 3 | 令牌字面量断言：`test/smoke.mjs:1290`（`--nv-fs-display:20px` / `--nv-fs-base:12px` / `--nv-fs-stat:18px` / `--nv-fs-chapter:16px` 等） | **保留全部存量字面量**（白名单冻结：15/13.5/11/17/28 不得变值）；**新增** `--nv-fs-reading:16px`、`--nv-fs-ui:13px` 两条字面量断言 | 规格 v3 §1D（D-3） | `:root` 令牌段改动 | ⏳ |
| 4 | 正文绑定：`lib/client.js:5171`（`'.nv-content{font-size:' + TYPO.body`）；smoke 中 `.nv-content ↔ TYPO.body` 绑定断言 | L5171 改 `font-size:var(--nv-fs-reading)`；绑定断言改 `.nv-content ↔ --nv-fs-reading`；`TYPO.body`（`--nv-fs-body:15px`）**保留**，其余 6 个消费点不动 | 规格 v3 §1C/§1D | 正文/编辑区字号改动 | ⏳ |
| 5 | 行高：`.nv-content` 现随 `TYPO.bodyLh`（`--nv-lh-reading` 语境 1.75，DR2 附录 A） | `.nv-content`/`.nv-edwrap` 行高 1.9（改令牌值或独立规则，**只影响正文/编辑区**）；geometry 若有行高断言同步 | 规格 v3 §1C | 正文行高改动 | ⏳ |
| 6 | measure 几何断言：`verify-visual-geometry.mjs` `measure 510` | `measure 544`（16×34；断言区间 [512,576]） | 规格 v3 §1C / DR1 B-02 | 正文 16px 生效后 | ⏳ |

## B. 核对项（预期不变绿；若红=实现越界）

| # | 断言（坐标=事实） | 预期 | 依据 | 状态 |
|---|---|---|---|---|
| 7 | 消费点字符串：`test/smoke.mjs:892`、`:1339`（`.nv-chrow{…font-size:var(--nv-fs-base)}`） | **不变**（v3 取消 12→13 迁移；chrow 保持 base 12） | 规格 v3 §1D | 未变（绿） |
| 8 | 内联字号基线：`test/smoke.mjs:1396`（`INLINE_FS_BASELINE='11.5px:2,11px:12,12px:18,13px:5,14px:1'`） | **不变**；实现不得触碰任何内联 fontSize | 规格 v3 §1D | 未变（绿） |
| 9 | 控件逐类名 / 零幽灵令牌 / 对比度 / 未消费令牌=0 / anchor FAIL=0 / CSS 字面量白名单 | 全绿；新增 `--nv-fs-reading`/`--nv-fs-ui`/`.nv-home` 系列纳入既有守卫（各自 ≥1 消费者） | 规格 v3 §2 | 未变（绿：anchor 79 段 FAIL=0 / contrast 0 项 <4.5 / 未消费令牌=0） |
| 10 | README smoke 计数 ↔ A-F9 自校 | 计数随新断言增加同步（README + smoke 内自校同 commit） | 规格 v3 §5 | **[已迁移]** 314 → **324**（上轮 +5：UX-063 四条 + P-10 契约对账一条；**返工轮净 +5**：UX-063 断言由 4 条重写为 9 条〔逐路径具名 / 函数体切片 / 三处独立属性集 / 手柄门 / Esc 优先 / contentTop 单点〕；A-F9 实测 324/0 failed）（commit 由 Coordinator 填写） |
| 11 | `lib/host-contract.mjs` item 3.3（layout-technique，margin/width 双压） | **新增登记**：position/zIndex/boxShadow 操纵面 + 48px 唤出条 DOM；smoke 双向对账断言新增 | 规格 v3 §1A（P-6③/P-10） | **[已迁移]** item 3.3 扩为「宿主对话窗全量操纵面」（margin/width 双压 + position/zIndex/boxShadow/borderLeft/background + 15 属性快照/恢复 + 48px 唤出条）；item 3.7 追加 `dsh.novel.drawer.v1`；`regionLiterals.viewAreaProps`（15 属性）为机检对账面；smoke COMPAT-002 ⑫ 双向 ⊆ 对账 + 源码写面提取；**返工轮（CR1 P0-2）**：item 3.3 第 4 段覆盖 `applyDrawer` 全函数（含 position/zIndex/boxShadow/borderLeft/background 五写），不再止于早退行（commit 由 Coordinator 填写） |

## C. 新增断言（先加=红 → 实现后=绿）

| # | 新断言 | 检查什么 | 依据/触发 | 状态 |
|---|---|---|---|---|
| 12 | `.nv-home` 段内 font-size ⊆ {display,stat,reading,ui,base} 5 令牌 | 修改面字号契约（v3 §1D） | 第②步首页改造触发 | ⏳（第②步） |
| 13 | 抽屉 420 / 唤出条 48 / `.nv-home` max-width 880 / CTA 高 36（静态注入量算） | v3 §2 机检 1 | 抽屉/唤出条已实现 | **[已迁移 · 第①步部分]** 抽屉 420 / 唤出条 48 / 正文列六档 1400·1086·1046→544、1000→544、956→512、800→356 已入 `scripts/verify-visual-geometry.mjs`：正文列按**真实左偏移 11**（`.nv-split` border 1 + 上部区 padding 10；rail 属底部工作台）注入，断言 = ①让位公式逐档 ②`drawer ∩ text = ∅`（实测矩形）③手柄渲染档（colW ≥ 1046）`handle ∩ text = ∅` ④非渲染档**手柄不存在** ⑤公式预留 24 与实测余量（425/111/71/25/13/13）**分别输出**（DR1 P1-1/P1-2、P3-3）；**`.nv-home` max-width 880 / CTA 36 属第②步（首页改造），本步未实现、未断言**（commit 由 Coordinator 填写） |
| 14 | 抽屉容器 z-index 920 且 `900 < 920 < 950`（源码断言三值共存） | v3 §1A | 抽屉分层实现触发 | **[已迁移]** smoke UX-063 ② 断言 `zSplit 900 < zDrawer 920 < zConsole 950`（源码三值提取 + 静态序关系）+ geometry 注入实测 `zSplit=900 / zDrawer=920 / zConsole=950`（commit 由 Coordinator 填写） |
| 15 | 全仓唯一精确串 `font-size:var(--nv-fs-body,15px)}`（`test/smoke.mjs:1327`，DR3 N-1 核实） | 精确串改 `font-size:var(--nv-fs-reading,16px)}`（textarea 内联随第③步换绑，DR3 N-1 选 (a)） | 规格 v3 §1C（N-1 裁决） | ⏳（第③步） |
| 16 | edwrap/编辑态字号·行高绑定断言（`test/smoke.mjs:1458` 附近，随 (a) 一并核对） | `.nv-edwrap` + textarea 内联统一 reading 16 / 1.9；阅读↔编辑无跳变 | 规格 v3 §1C（N-1 裁决） | ⏳（第③步） |

## D. 禁改清单（改=越界，Review 直接 FAIL）

- rail / 竖排状态短标签 / 3 页签 / 文件树结构 / 章节行 28px 与选中线 / `✓已发·⚠门禁失败` 标记（`client.js:2055-2056`）/ 门禁卡与机器审计（`:1989-2003`）
- 存量令牌值：`--nv-fs-body:15` / `--nv-fs-card:13.5` / `--nv-fs-caption:11` / `--nv-fs-display-s:17` / `--nv-fs-hero:28` / `--nv-fs-base:12`
- 服务端 `lib/index.js`、API 面、轮询契约、`lib/host-boundary.js`、install 脚本、`package.json`、`cordis.patch.yml`

## E. 真机 CDP 证据（交付前登记；未登记=交付不成立）

| 项 | 口径 | 测值 | 截图路径 | 状态 |
|---|---|---|---|---|
| colW@1680×1050 | ≥1400±2 | — | — | ⏳ |
| colW@1440×900 | ≥1160±2 | — | — | ⏳ |
| 文本列（抽屉关） | 544±2 | — | — | ⏳ |
| 文本列（抽屉开，≥988 档） | 544±2，且与抽屉矩形零相交 | — | — | ⏳ |
| 1366 视口两态 | 文本列 ≥512 | — | — | ⏳ |
| 并排截图（改前/改后，同视口同数据） | 首页/写作/抽屉开 三对 | — | — | ⏳ |

> 证据工具：Coordinator 已建立 CDP 截图/量算通道（headless Edge + remote-debugging），实现完成后由 Coordinator 执行并填表，Developer 不接触真实宿主。

## F. 连带迁移（第①步实现暴露的既有断言口径变化；同 commit 已改，供审查核对）

| # | 既有断言（原口径） | 现口径 | 原因（为什么必须改） |
|---|---|---|---|
| F1 | `test/smoke.mjs` UX-018 双压契约：`savedWidth` 记录 `=== 2` 处、`viewArea.style.width = this.savedWidth` 恢复 `=== 2` 处 | 各 `=== 1` 处（断言名同步「UX-063 单点化后记录/恢复各 1 处」） | 规格 §1A 「五路径共用同一 `restoreViewArea()`」⇒ 记录/恢复单点化；UX-018 的**边界精确串断言**（`this.savedWidth = viewArea.style.width` / `this.viewArea.style.width = this.savedWidth`）保留不动 |
| F2 | `test/smoke.mjs` UX-014⑥ `(className: 'nv-bar-ctl')` 计数 `=== 4` | `=== 5` | 标题栏新增对话抽屉开关（`.nv-bar-ctl[data-on]`，icon + title/aria-label「对话」）；`.nv-bar-ctl` 样式断言（32×32/18px/600）不变 |
| F3 | `test/smoke.mjs` 注释行号副本 6 处（2.3 / 3.1 / 3.5 / 3.8 的 `L` 引用） | 按实测重基（终值：2.3 `L5526-L5528` / 3.1 `L1160` / 3.5 `L1236` / 3.8 `L3276`） | COMPAT-015 F3 行号对账（陈旧副本即红）。**返工轮更正**：上表原「终值 L5493/L1150/L1217/L3265」在返工插入行后再次陈旧——本轮以 `git diff -U0` 逐 hunk 复核 + `verify-contract-anchors.mjs` 复跑重基，并将 3.5 从「快照对象」误锚修正为**真实互操作块**（`.ta_splitClose` 点击 + `dsh:split-claim`），非纯位移 |
| F4 | `lib/host-contract.mjs` 面 2/3 `line` 字段（2.1~2.14、3.1~3.8，含多段形态） | 全部按**当前源码实测行**重基（端点非注释/非空行 ∧ 端点行原文唯一命中） | **如实口径（CR1 要求订正）**：上轮「端点逐行复核」表述**不成立**——本轮返工在 `lib/client.js` 插入约 27 行，上轮登记的 `line` 值随之整体漂移；同时发现 item 3.7 四锚点早在**上轮即已错 3/4（整体 −2）**（`L1015` 是注释、`L1065` 是 `DRAWER_RAIL_W`，真值 `L1017/L1019/L1069/L1127`）。处置：按实测重基 2.3/2.10/2.11/2.12/2.13/3.1/3.2/3.3/3.4/3.5/3.6/3.7/3.8 + item 3.3 段面重组；守卫新增/强化 = `verify-contract-anchors.mjs` 79 段 FAIL=0（起点±2 主构造命中、区间关键词命中）∧ smoke COMPAT-012 N2 F5d（严格面边界非注释）∧ COMPAT-013 F1/F3（构造覆盖 + 注释起段 golden）∧ COMPAT-015 F3（跨面行号副本对账）。`lib/client.js` 5631 → 5658 行（返工净 +27），全仓其余文件未受影响 |
| F5 | `README.md` L171 断言计数 314 | **324** | COMPAT-014 A-F9（README ≡ 实测 `passed+1`）；上轮 +5（UX-063 四条 + P-10 契约对账一条），返工轮净 +5（UX-063 断言 4 → 9 条：逐路径具名 / setBook 切片 / 三处独立属性集 / 手柄门 / Esc 优先 / contentTop 单点；UX-060 ④ 口径同步改写不计增） |
| F6 | `scripts/verify-visual-geometry.mjs` 让位检查（上轮口径：正文列 `left:0` + 同公式生成两矩形 ⇒ `dl − r = 24`） | **真实左偏移 11** 建模 + **正交判据**（drawer ∩ text = ∅；手柄渲染档 handle ∩ text = ∅；非渲染档手柄不存在）+ 六档 colW + 公式预留/实测余量分离输出 | **DR1 P1-2 / CR1 P2 定性**：上轮 `dl − 24` 是**构造恒等式**（两矩形同源公式生成），对真实遮挡零判别力——手柄在 `colW < 1024` 压正文 23–35px 即由此漏过；上轮注释「gutter ≥ 24 不变量」属过度声称（实测真实余量 13） |

| F7 | `lib/client.js` 开启态手柄：规格未列、上轮**无条件渲染**（`colW < 1024` 压正文 23–35px，无提示无断言） | ①仅 `colW ≥ DRAWER_HANDLE_MIN_COLW(1046)` 渲染；②抽屉态 `Esc` **优先 `closeDrawer()`**（窄带唯一出口，且不再「一键关两层」）；③窄窗提示阈值改 `drawerOpen && colW < 1046` 且文案含 Esc 出口（zh「按 Esc 收起对话」/ en 对应）；④**不**靠收窄 `textMax` 腾位（保 §3「956 档 ≥512」） | DR1 P1-1（阻断）；几何下限 = 11 + 544 + 24 + 420 + 48 = 1047 → 取 1046（1046 档实测余量 23px） |
| F8 | 抽屉态既有实现的三处缺陷 | ①`resetSplit()` 抽屉态强制 `chatSide='right'`（P2-1：存档 `'left'` 会把抽屉甩到左缘而手柄仍按右缘定位）；②`setChatSide` 删死分支（P2-5：`closeDrawer` 已置 false，其后 `if (drawerOpen) applyDrawer()` 恒不成立）；③手柄 `top` 与 `bodyH` 计入 in-flow 提示行高度（P2-3：`contentTop` 单点收口，否则提示出现时手柄压提示行）；④`chatdiv` 命中区整体外移到抽屉矩形之外（P3：避免落在宿主抽屉 z 920 之下不可点 + 与手柄 2px 重叠） | DR1 P2-1/P2-3、CR1 P2-5/P3 |

### F.1 红 → 绿证据（真跑留档）

| 阶段 | 命令 | 结果 |
|---|---|---|
| RED（先加断言，实现前） | `node test/smoke.mjs` | **312 passed / 7 failed**（exit 1）：`UX-018 双压注释…（UX-063 单点化后记录/恢复各 1 处） :: ux018 double-squeeze restore missing` / `UX-063 P0-a① 全屏工作台… :: ux063 fullscreen/drawer shell missing` / `UX-063 P0-a① 抽屉 z 三值共存… :: ux063 drawer z / text formula missing` / `UX-063 P0-a① 让位机制… :: ux063 yield/hint missing` / `UX-063 P0-a① 恢复保证… :: ux063 restore guarantee missing` / `P-10 UX-063 契约 item 3.3 双向对账… :: src=[...] decl=[] it33=true it37=true` / `COMPAT-014 A-F9 README smoke 断言计数同步：声明 314 ≡ 实测 313 :: declared=314 actual=313` |
| RED | `node scripts/verify-visual-geometry.mjs` | `FAIL: ux063 抽屉/全屏源面缺失（ux063 source missing: DRAWER_W = 420）——先实现再量算`（exit 1） |
| GREEN | `node test/smoke.mjs` | **319 passed / 0 failed**（exit 0） |
| GREEN | `node scripts/verify-visual-geometry.mjs` | `OK: rail 44 / measure 510 / edwrap 510 / chrow 28+12px / cinput 32 / para 1em / rail-status visible 12px / ux063 drawer 420 + edge 48 + z 900<920<950 + text-col 544/544/512/356 (gutter 24)`（exit 0）；`MEASURE.u63` 实测 `drawer 420 / edge 48(w) / zSplit 900 / zDrawer 920 / zConsole 950 / cols 1400→544, 988→544, 956→512, 800→356` |
| GREEN | `node --check lib/client.js` / `node --check lib/host-contract.mjs` / `node --check test/smoke.mjs` | 0 errors（exit 0） |
| GREEN（回归面） | `node scripts/verify-contract-anchors.mjs` / `node scripts/verify-contrast.mjs` / `node scripts/probe-host.mjs --self-check` | anchors 79 段 FAIL=0；contrast `FG_MUTED_ROWS=4 V3_BELOW_4.5=0`；probe 离线自检 6/6（实机模式仍 UNVERIFIED） |
| **返工轮 GREEN** | `node test/smoke.mjs` | **324 passed / 0 failed**（exit 0） |
| **返工轮 GREEN** | `node scripts/verify-visual-geometry.mjs` | `text-col 1400→544,1086→544,1046→544,1000→544,956→512,800→356 / formula reserve 24 vs measured margin 425,111,71,25,13,13 / handle ≥ 1046: 1400@377,1086@63,1046@23`（exit 0） |
| **返工轮 GREEN** | `node --check lib/client.js` / `lib/host-contract.mjs` / `test/smoke.mjs` / `scripts/verify-visual-geometry.mjs` | 0 errors（exit 0） |
| **返工轮 变异判别力（每条「变异 ⇒ 必红」实测）** | 就地变异 + 哈希还原（restore match=true） | `S1` close() 去 restoreViewArea ⇒ 红（`ux063 restore path missing`）（5 fail）· `S2` setBook 判据反转 ⇒ 红（同断言，2 fail）· `S3` applyDrawer 去 background 写 ⇒ 红（`ux063 property sets missing`，5 fail）· `S4` 手柄阈值 1046→1200 ⇒ 红（`ux063 fullscreen/drawer shell missing`，2 fail）· `S5` 去 Esc 先关抽屉 ⇒ 红（`ux063 esc priority missing`，4 fail）· `S6` resetSplit 去强制右缘 ⇒ 红（`ux063 resetSplit/setChatSide drift`，5 fail）· `S7` bodyH 去 hintH ⇒ 红（`ux063 contentTop single source missing`，3 fail）· `G1` 去手柄渲染门 ⇒ 红（`ux063 handle gating/geometry missing`，2 fail）· `G2` DRAWER_W 420→480 ⇒ geometry 红（`u63Drawer420, u63TextCol`）· `G3` DRAWER_TEXT_MAX 544→500 ⇒ geometry 红（`u63TextCol`） |
