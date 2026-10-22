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

| # | 断言（坐标=事实） | 预期 | 依据 |
|---|---|---|---|
| 7 | 消费点字符串：`test/smoke.mjs:892`、`:1339`（`.nv-chrow{…font-size:var(--nv-fs-base)}`） | **不变**（v3 取消 12→13 迁移；chrow 保持 base 12） | 规格 v3 §1D |
| 8 | 内联字号基线：`test/smoke.mjs:1396`（`INLINE_FS_BASELINE='11.5px:2,11px:12,12px:18,13px:5,14px:1'`） | **不变**；实现不得触碰任何内联 fontSize | 规格 v3 §1D |
| 9 | 控件逐类名 / 零幽灵令牌 / 对比度 / 未消费令牌=0 / anchor FAIL=0 / CSS 字面量白名单 | 全绿；新增 `--nv-fs-reading`/`--nv-fs-ui`/`.nv-home` 系列纳入既有守卫（各自 ≥1 消费者） | 规格 v3 §2 |
| 10 | README smoke 计数 ↔ A-F9 自校 | 计数随新断言增加同步（README + smoke 内自校同 commit） | 规格 v3 §5 |
| 11 | `lib/host-contract.mjs` item 3.3（layout-technique，margin/width 双压） | **新增登记**：position/zIndex/boxShadow 操纵面 + 48px 唤出条 DOM；smoke 双向对账断言新增 | 规格 v3 §1A（P-6③/P-10） |

## C. 新增断言（先加=红 → 实现后=绿）

| # | 新断言 | 检查什么 |
|---|---|---|
| 12 | `.nv-home` 段内 font-size ⊆ {display,stat,reading,ui,base} 5 令牌 | 修改面字号契约（v3 §1D） |
| 13 | 抽屉 420 / 唤出条 48 / `.nv-home` max-width 880 / CTA 高 36（静态注入量算） | v3 §2 机检 1 |
| 14 | 抽屉容器 z-index 920 且 `900 < 920 < 950`（源码断言三值共存） | v3 §1A |
| 15 | 全仓唯一精确串 `font-size:var(--nv-fs-body,15px)}`（`test/smoke.mjs:1327`，DR3 N-1 核实） | 精确串改 `font-size:var(--nv-fs-reading,16px)}`（textarea 内联随第③步换绑，DR3 N-1 选 (a)） | 规格 v3 §1C（N-1 裁决） | 正文编辑态字号改动 | ⏳ |
| 16 | edwrap/编辑态字号·行高绑定断言（`test/smoke.mjs:1458` 附近，随 (a) 一并核对） | `.nv-edwrap` + textarea 内联统一 reading 16 / 1.9；阅读↔编辑无跳变 | 规格 v3 §1C（N-1 裁决） | 同上 | ⏳ |

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
