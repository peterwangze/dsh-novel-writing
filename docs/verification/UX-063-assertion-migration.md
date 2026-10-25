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

## G. 第②步（任务流首页）迁移与新增

| # | 判据（新） | 落点 | 状态 |
|---|---|---|---|
| 12 | `.nv-home` 段内 `font-size` **只允许 5 档令牌**（display 20 / stat 18 / reading 16 / ui 13 / base 12），无字面量 | smoke `ux063 home font-scale violation` | **[已迁移]**（步骤③ 接管正文/编辑区消费方） |
| 13 | `.nv-home` max-width **880** / 主 CTA 高 **36**（静态注入量算，非公式复算） | geometry `u63Home880` / `u63Cta36`（实测 home.w=880、cta.h=36） | **[已迁移·第②步部分]**（CTA 唯一主按钮见 #19） |
| 17 | 默认入口 = 首页（`.nv-home` 渲染；`.nv-cgrid` / `.nv-cfoot` 不在首页）；二级页可直入 `initialView:'books'` | smoke `ux063 home default entry mismatch` | 新增 |
| 18 | 首页四区结构（当前书卡 / 今天写什么 / 待办 / 最近章节） | smoke `ux063 home sections missing` | 新增 |
| 19 | 主 CTA 唯一（`className: 'nv-home-cta'` 计数 = 1）+ 次按钮 `.nv-home-sub` 存在 | smoke `ux063 home sections missing` | 新增 |
| 20 | 待办点击目标：请求 → `{tab:'requests'}`；发布 → `{tab:'publish'}`；门禁 → 首个失败章 `homeGateFails[0].num`，无失败章 `disabled` | smoke `ux063 home sections missing` | 新增 |
| 21 | 最近章节 = `chapters` 按 num 倒序取 **5** 条 | smoke `ux063 home sections missing` | 新增 |
| 22 | 紧凑换书：顶栏书名下拉（`nv-homebook-btn` + `nv-bookmenu` + `role=option`）+ 全部书籍/返回首页往返 | smoke `ux063 compact book switcher missing` | 新增 |
| 23 | ~~首页 → 创作台意图单次消费（tab/chapter/newChapter）+ 新建章「保存即创建」~~ → **已由返工轮 #23~#25 取代**（用户 2026-10-25 裁决：新建章 = 触发工作流，不建空章节文件） | 旧断言 `ux063 home intent/new-chapter missing` 已删除；新判据见下 | 返工轮 H1~H4 |

### 连带迁移（第②步）

| # | 既有断言（原口径） | 现口径 | 原因 |
|---|---|---|---|
| F9 | 控制台树断言（`con.render({})` 期望底部搜索行 + 空主体） | 原断言改走 **`con.render({ initialView: 'books' })`**（二级页语义不变）；**新增**首页默认入口渲染断言（`con.render({})` → `.nv-home` 1 / `.nv-cgrid` 0 / `.nv-cfoot` 0） | 默认入口改为首页；为保证原断言强度不降级，控制台注册**透传 `props.initialView`**（宿主不传 ⇒ 默认首页），避免把树级断言退化为源码字符串 |
| F10 | `lib/host-contract.mjs` 面 2/3 `line` 字段 | 按**内容锚定**重基 24 项 / 59 段（`git show HEAD` 旧行文本在现文件唯一命中）；2.3 边界取声明行本体 `L5811-L5813`、2.13 取首个 inject→末个 register 收尾 `L5878-L5910`、3.4 四段 `L1018-L1030 / L5322 / L5409-L5410 / L5445`；另订正 6 处 smoke 注释内陈旧行号副本 | 本步在 `lib/client.js` 插入 +284 行（5664→5948）⇒ 全部 client 锚点整体漂移；`verify-contract-anchors.mjs` 79 段 FAIL=0 复验 |
| F11 | 字号令牌集 | 新增 `--nv-fs-reading:16px` / `--nv-fs-ui:13px`（`:root` 单点），本步仅 `.nv-home` 消费；**正文/编辑区消费方仍属第③步**（`--nv-fs-body` 15 保持） | §1D「修改面允许字号集 = 5 档」；提前落地令牌避免 `.nv-home` 用字面量违规 |
| F12 | 规格 §1B 显式移出本批 | **未实现（如实登记）**：断更/存稿预警、首页数据信号入口（P1）；本步不声称覆盖 | 防静默丢失 |

### G.1 判别力证据（真跑留档）

> **如实披露**：本步断言与实现同批落地，**未留「实现前基线 RED」快照**；判别力以变异实测为准（每条「变异 ⇒ 必红」+ 哈希还原校验 restore=true）。

| 变异 | 命令 | 结果 |
|---|---|---|
| M1 `.nv-home-cta{height:36px` → `30px` | `node scripts/verify-visual-geometry.mjs` | **红**（exit 1，`u63Cta36` 失败） |
| M2 `.nv-home{...max-width:880px` → `720px` | 同上 | **红**（exit 1，`u63Home880` 失败） |
| M3 删 `disabled: homeGateFails.length === 0` | `node test/smoke.mjs` | **红**（exit 1，`ux063 home sections missing`） |
| M4 删 `if (typeof it.tab === 'string') setTab(it.tab)` | 同上 | **红**（exit 1，`ux063 home intent/new-chapter missing`） |

### H. 返工轮（用户 2026-10-25 裁决：新建章 = 触发工作流；CTA 所见即所得）

| # | 变更 | 判据 / 证据 |
|---|---|---|
| H1 | **「新建章」= 触发 AI 工作流生章**，不再在客户端建空章节文件；编辑面（`newOpen/newDraft/newNotice/saveNewChapter/closeNewChapter` + `.nv-newch*` 样式 + 4 个 i18n 键）整体移除 | smoke #24 负断言；既有编辑保存通道 `POST /api/chapter`（写作视图内 `active.num`）保留并断言 |
| H2 | **CTA 所见即所得**：按钮文案 `继续写第 N 章` 与实际发送指令同源（`launchMsgOf` 同一 `launchOpts.chapter`），点击即经 `launchWorkflow({mode:'continue',chapter}) → promptLaunch → sessions.prompt` 真触发；N = `max(现存章号)+1` | smoke #23 + #25；`launchWorkflow` 新增 `allowStop` 参数——首页发起不抢停运行中的轮次（rail 主按钮 `launchWorkflow(null,true)` 仍承担停止） |
| H3 | **失败可见 / 状态可见**：未绑定 → `bindFirstHint` + 弹绑定面板；失效 → `bindStaleHint` + 重绑；降级 → `sessionsMissing`；失败 → `promptFailPrefix`；运行中 → `wfRunning`；成功 → `launchSentPrefix + msg`（消息内含第 N 章） | 复用既有三态文案与 rail 状态（零新增发送逻辑，P-08） |
| H4 | **口径统一**：`homeChapterTotal` = detail 章数（未就绪回退 overview.totalChapters），卡片/待办/最近章节同源 | smoke #25 |
| H5 | **契约行号重基（返工轮）**：**行号权威源 = 契约 `items[].line` 本身 + `verify-contract-anchors.mjs` 机检**——迁移表不再复制整张行号表（重复维护必然漂移：本行原记 2.3 `L5783` / 3.7 `L1057·L1059·L1167·L1109` / 3.8 `L3335-L3349` 等，均已过时）。**微收口轮抽核生效值（2026-10-25，实现 6067 行）**：2.3 `L5929`、3.7 `L1130 / L1132 / L1240 / L1182`、3.8 `L3411-L3425`、3.3 五段 `L1511-L1525 / L1576-L1585 / L1529-L1546 / L1552-L1568 / L5123-L5135` | `verify-contract-anchors.mjs` **79 段 FAIL=0**（WARN 24 为启发式提示，需人读）；smoke 范围抽核 bad=[] |
| H6 | **golden 显式更新**：`GOLDEN_RANGE_ITEMS` 23→**22**、`GOLDEN_RANGE_STRICT_ITEMS` 12→**11**（2.3 由三行范围收敛为单行，微收口后为 `L5929`）；`GOLDEN_RANGE_COMMENT_START` 保持 2（3.1 / 3.8 起点经重基后仍为 JSDoc 注释起段） | 契约注释「扩面/删项须显式改 golden」；断言消息实读值为准 |
| H7 | **README 计数**：329 → **331**（+3 新断言 −1 旧断言）；A-F9 自校 `declared ≡ passed+1` 绿 | `node test/smoke.mjs` → **331 passed / 0 failed** |

### H.1 返工轮判别力（真跑留档，就地变异 + 哈希还原）

| 变异 | 结果 |
|---|---|
| M1 指令丢章号（`：继续写第 ${num} 章` → `：继续写作`） | **红**（`ux063 home workflow trigger missing`） |
| M2 新建章退回不触发工作流（`{workflow:'new'}` → `{chapter}`） | **红**（同断言） |
| M3 重建空章节文件通道（注入 `saveNewChapter`） | **红**（`ux063 new-chapter editor still present`） |
| M4 CTA 章号 off-by-one（`homeNextNum = homeMaxNum`） | **红**（`ux063 WYSIWYG mismatch`） |

> 还原校验：四次变异后 `lib/client.js` sha256 与变异前一致（restore match = true）。**真机 CDP 仍不可得**（宿主 0.2.1-rc.2 缺 `dsh-app-boot`）⇒ 行为面为源码/渲染树断言，**未经真机验证**。

### H.2 新断言表（返工轮落地，取代旧 #23）

| # | 断言 | 机检名 | 来源 |
|---|---|---|---|
| 23' | 首页 CTA / 新建章 = **真触发工作流**：CTA `enterWriting({ workflow:'continue', chapter: homeNextNum })`、新建章 `{ workflow:'new', chapter: homeNextNum }`；`launchMsgOf` 产出「继续写第 N 章」/「请新建并撰写第 N 章」；`promptLaunch` 透传 `launchOpts` | smoke `ux063 home workflow trigger missing` | 返工轮（用户裁决） |
| 24 | **新建章编辑面已移除**（负断言：`saveNewChapter`/`closeNewChapter`/`newChapterNum`/`newDraft`/`nv-newch`/`homeNewChapter*` 零命中；既有章节编辑保存通道 `POST /api/chapter`（`active.num`）保留并断言） | smoke `ux063 new-chapter editor still present` | 返工轮（不建空章节文件） |
| 25 | **WYSIWYG 一致性**：`homeNextNum = max(章号)+1` / 章数单一口径 `homeChapterTotal`（detail 优先、未就绪回退 overview）/ 待办取自 detail / 最近 5 章 / 换书集合 = `orderedNovels` | smoke `ux063 WYSIWYG mismatch` | 返工轮（展示值 = 真值） |


### I. 复审返工（`REVIEW-UX-063-S2-DR1` P1-1 + `REVIEW-UX-063-S2-CR1` P1-1/P1-2）

| # | 变更 | 判据 / 证据 |
|---|---|---|
| I1 | **detail 未就绪 ≠ 无章节**（DR1 P1-1 / CR1 P1-1）：判定式 = `homeNextNum === null`（`deriveHomeNextNum(detail)` 未就绪返回 `null`，等价于「该书 detail 未到手」；原 `homeDataReady` 变量已在微收口轮删除，语义由本判定式承载）；CTA 与「新建章」`disabled: homeNextNum === null` + 文案「数据加载中…」+ `title=homeDataStale`；待办未知显示 `—`（不是 0）；最近章节未就绪显示加载态（不是「尚无章节」）；**三态分离** `homeLoading`（首轮未回）/ `homeEmpty`（已回 0 本）/ 有书四区——加载中不得渲染「无书目」假空态 | smoke `ux063 home default entry mismatch`（加载态 .nv-home-loading=1 / .nv-home-empty=0 / CTA=0）+ `ux063 WYSIWYG mismatch` |
| I2 | **章号派生提为纯函数**：`deriveHomeNextNum(detail)` = detail 未就绪 → `null`（未知，禁止猜测）；空章节 → 1；有章 → `max(章号)+1`（稀疏章号按 max，不是 count）。**否决** CR1 建议的 `overview.totalChapters+1` 回退——计数 ≠ 最大章号，稀疏章节会推出不存在的章号 | smoke `ux063 home model cases failed`（null/undefined/空/38 章/稀疏 1·5·9/非数字 num） |
| I3 | **意图通道可靠化**（CR1 P1-2）：模块级 `homeIntentSink`（SplitWorkspace 挂载期注册的同步消费）+ `pendingHomeIntent`（未挂载兜底）；`enterWriting` **同步投递**（同书二次点击也生效）+ 意图带 `novelId`；`applyHomeIntent` 经 `homeIntentConsumable` 校验，**跨书一律丢弃**；打开失败/不匹配路径清 `pendingHomeIntent`；旧消费 effect（依赖 `[snap.active, selectedId]`、同书不重跑）**退役** | smoke `ux063 WYSIWYG mismatch`（含 `!clientSrc.includes('}, [snap.active, selectedId])')` 与投递/校验/清理三处结构断言）+ `ux063 home model cases failed`（跨书 false / 同书 true / 空 intent false） |
| I4 | **未知态文案**：`homeDataLoading` / `homeDataStale` / `homeRetry` / `homeRecentLoading` / `wfBusyHint`（zh/en 成对）；`homeStageChip` 接入阶段 chip（原零引用键）；`launchWorkflow` 忙碌时给 `wfBusyHint` 提示（原静默 return） | smoke i18n 成对断言 + `ux063 WYSIWYG mismatch` |
| I5 | **契约行号重基（本轮）**：行号权威源 = 契约 `items[].line`；本轮实现累计 **5921 → 6067 行**（含微收口轮删死变量 `homeDataReady` −1）。**微收口轮变更项（生效值）**：2.3 `L5929`、2.12 `L5959-L5966`、2.13 `L5996-L6028`、3.3 五段 `L1511-L1525 / L1576-L1585 / L1529-L1546 / L1552-L1568 / L5123-L5135`、3.4（四段，机械 −1）、3.6 `L1404-L1428 / L3859-L3865`（**段 2 起点为空行属既有问题**，待下轮改指 SplitWorkspace RO/MO 观测块 `L3796-L3824`）。其余条目以契约为准（迁移表不再复制整表）。 | `node scripts/verify-contract-anchors.mjs` → **79 段 FAIL=0**（WARN 24 启发式需人读）；smoke F5d/F5d′ 范围抽核 bad=[]；smoke 注释 `<item> L<n>` 副本同步 |
| I6 | **断言记账**：旧 #25 的「实现字面量绑定」判据（`const homeNextNum = homeMaxNum + 1` 等）**删除并重写为**纯函数用例 + 行为/结构判据；并新增 #29 单行型 line 守卫（见 I8）。净计数 = **331**（README 331 ≡ 实测 331） | README 计数 + A-F9 自校 `declared ≡ passed+1`（331 ≡ 331） |
| I8 | **单行型 line 机检**（CR1 P2-2）：新增 smoke `F5d′`——6 条单行形态条目（1.1/1.2/2.2/2.3/2.4/5.6）的声明行 MUST 命中该条 symbol 候选，golden 6；原 F5c 只抽每面 1 项、F5d 只覆盖范围型 ⇒ 单行写错零信号（本轮 3.7 四键曾整体 −2 全错） | smoke `COMPAT-012 N2 F5d′`（变异：2.3 `L5930`→`L5931` ⇒ **必红**） |
| I7 | **陈旧注释订正**：`enterWriting` 头部原描述「`{ newChapter: n }` 打开编辑面」改为当前语义（`{ workflow: 'continue'|'new', chapter }`） | 源码实读 |

### I.1 返工判别力（真跑留档：就地变异 + sha256 还原校验 restore=true）

| 变异 | 结果 |
|---|---|
| M1 detail 未就绪仍放行（`disabled: homeNextNum === null` → `disabled: false`） | **红**（`ux063 WYSIWYG mismatch`） |
| M2 意图跨书不校验（`homeIntentConsumable(...)` 守卫 → `if (false)`） | **红**（`ux063 home model cases failed`） |
| M3 CTA 章号 off-by-one（`return max + 1` → `return max`） | **红**（`ux063 WYSIWYG mismatch`） |
| M4 未知态显示 0（`todoUnknown ? '—'` → `'0'`） | **红**（`ux063 WYSIWYG mismatch`） |

> 本轮为**返工轮**，未保留「实现前 RED」快照（如实披露）；判别力以变异实测为准。**真机 CDP 仍不可得**（宿主 0.2.1-rc.2 缺 `dsh-app-boot`，归 COMPAT-018）⇒ 行为面为源码/渲染树/纯函数断言，**未经真机验证**。

### I.2 新断言表（返工轮）

| # | 断言 | 机检名 | 来源 |
|---|---|---|---|
| 26 | **首页纯派生用例**（`#region home-model` 区段提取 + `new Function` 真跑）：章号 null/1/39/稀疏 10；待办 null 与计数/首失败章；最近 null 与倒序 5 条；章数展示口径 detail→overview；意图同书 true / 跨书 false / 空 false | smoke `ux063 home model cases failed` | CR1 P1-1 加重项 / DR1 P2-1 |
| 27 | **意图通道结构**：`enterWriting` 同步投递 `homeIntentSink(full)` + `novelId` 绑定 + 失败清 `pendingHomeIntent`；`applyHomeIntent` 经 `homeIntentConsumable`；旧 `[snap.active, selectedId]` 消费 effect 零命中 | smoke `ux063 WYSIWYG mismatch` | CR1 P1-2 |
| 28 | **加载/空/未就绪三态分离**（渲染树）：默认 mock（poll.data=null）⇒ `.nv-home-loading`=1、`.nv-home-empty`=0、CTA=0、重试入口 ≥1 | smoke `ux063 home default entry mismatch` | DR1 P1-1 / CR1 P2-1 |
