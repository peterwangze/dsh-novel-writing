# UX-063 P0-a 第①步 · Design Review DR2（delta 复审）

- **审查对象**：UX-063 P0-a 第①步 返工轮（respond `REVIEW-UX-063-P0A-DR1` NEEDS_CHANGE / 2 + `REVIEW-UX-063-P0A-CR1` NEEDS_CHANGE / 1）
- **审查面**：delta（上一轮 findings 是否真修 + 返工是否引入新回归），对照 HEAD `70223f3` 工作树未提交改动
- **审查者**：Design-Reviewer（subagent），独立执行；未采信 Developer 自述
- **日期**：2026-10-23

## 0. 结论

**APPROVED_WITH_NOTES　unresolved_blockers = 0**（P0=0，P1=0；P2=1，P3=7）

DR1 的两个阻断项均已实质修复（非纸面修复）：手柄窄带遮挡被消除、geometry 零遮挡断言从「同公式自证」改为「真实左偏移 + 正交矩形判据」，且新增断言本身具备判别力路径。返工未引入产品行为回归，门禁全绿，文档无越界声称。

放行边界（**必须随交付披露**）：第①步**独立**可感知差异仍为 3~4 处（工作台全宽 / 对话窗改抽屉 / 阅读行宽 236→510 / 窄窗提示），**不足**「并排截图 ≥5 处差异」的用户硬闸门；`P2-2`（跨子树 z-order 真实绘制序）仍只有静态值验证，其真机 CDP 证据因探针 boot 阻塞尚未取得。因此本次可声明的是「**P0-a 第①步已交付**」，**不得**声明「P0-a 已交付」或「视觉验收通过」，用户复检**不得**提前到本步单独进行。

## 1. 独立复跑（本人实跑，非采信）

| 命令 | 实测 |
|---|---|
| `node --check lib/client.js` | exit 0（0 错） |
| `node --check lib/host-contract.mjs` / `test/smoke.mjs` | exit 0 / exit 0 |
| `node test/smoke.mjs` | **324 passed / 0 failed**（exit 0） |
| `node scripts/verify-visual-geometry.mjs` | **OK**（exit 0），见下 MEASURE |
| `node scripts/verify-contract-anchors.mjs` | **79 段 / FAIL = 0**（WARN 29） |

geometry `u63` 实测（逐档矩形，单位 px）：

| colW | 正文列 | 抽屉 | 手柄 | drawer−text | handle−text |
|---|---|---|---|---|---|
| 1400 | l11 r555 w544 | l980 r1400 | l932 r980 | 425 | 377 |
| 1086 | l11 r555 w544 | l666 r1086 | l618 r666 | 111 | 63 |
| 1046 | l11 r555 w544 | l626 r1046 | l578 r626 | 71 | **23** |
| 1000 | l11 r555 w544 | l580 r1000 | **null** | 25 | — |
| 956 | l11 r523 w512 | l536 r956 | **null** | 13 | — |
| 800 | l11 r367 w356 | l380 r800 | **null** | 13 | — |

z 三值 coexistence 实测：`.nv-split 900 < drawer 920 < .nv-console 950`；`drawer 420 / edge 48` 不变。

## 2. 上轮 findings 逐条复核

### P1-1 开启态手柄静默遮挡正文 → **FIXED**

| 子项 | 判定 | 证据（文件:行号 / 实读） |
|---|---|---|
| ① `colW < 1046` 不渲染开启态手柄 | FIXED | `lib/client.js:1074` 常量 `DRAWER_HANDLE_MIN_COLW = 1046`；渲染门 `:4766` `: (colW >= DRAWER_HANDLE_MIN_COLW ? … : null)`；geometry 实测 1000/956/800 三档 `handle = null`；smoke `test/smoke.mjs:1279` |
| ② 抽屉态 `Esc` 优先只关抽屉 | FIXED | `lib/client.js:4250` `if (novelSplit.drawerOpen === true) { novelSplit.closeDrawer(); return }`——位于 `closeWorkbench(t)`（`:4251`）之前且带 `return`；smoke `:1285-1292` 断言「先 closeDrawer 后 closeWorkbench」次序 |
| ③ 提示阈值改 1046 且文案说明 Esc | FIXED | `:4335` `snap.drawerOpen === true && colW < DRAWER_HANDLE_MIN_COLW ? t('drawerNarrowHint')`；zh `:247`「视口较窄，建议全屏（按 Esc 收起对话）」，en `:433` 同义；smoke `:1268-1270`，并对旧阈值 `<956` 设负断言 `:1273` |
| ④ 不收窄 textMax | FIXED | `drawerTextW`（`:1082-1084`）与 `DRAWER_TEXT_MAX = 544`（`:1066`）未改；1046 档实测正文仍 544 |

**顺带验证**：1046 档 handle−text = **23px**（非 24）——由 `555 + 24 ≤ colW − 468 ⇒ colW ≥ 1047` 可知 1046 少 1px，但**不构成遮挡**（≥0），且实现与规格 §8 item 2 已如实披露该 1px 取整余量。**安全**。

### P1-2 geometry「零遮挡 / gutter 24」自证、无判别力 → **FIXED**

| 子项 | 判定 | 证据 |
|---|---|---|
| ① 正文列按真实左偏移 11 建模 | FIXED | `scripts/verify-visual-geometry.mjs:80` `U63_TEXT_LEFT = 11`，注释 `:45-50` 给出源码依据；**我独立核对**：`.nv-split` `border:1px`（`client.js:5135`）+ 上部区内联 `padding:'10px 10px 0'`（`:4731`）= 11；44px rail 渲染点确在 `midFooter`（`:4497` ⊂ `:4485`），不属上部内容区 |
| ② 正交判据 | FIXED | `:241` `drawer.l − text.r >= 0`（**DOM 实测矩形**，非公式对消）；`:243` 渲染档 `handle.l − text.r >= 0`；`:244` 非渲染档 `handle === null` |
| ③ 公式预留 vs 实测余量分离 | FIXED | `:260-271` 输出 `formula reserve 24 vs measured margin 425,111,71,25,13,13` 与 `handle >= 1046: 1400@377,1086@63,1046@23` |
| ④ 覆盖阈值两侧 + 验收视口 | FIXED | `:81` 六档 `1400 / 1086 / 1046 / 1000 / 956 / 800` |

**判别力复核**：手柄阈值若被改小（如 800），geometry 会在 1000 档构造手柄并算出 `532 − 555 < 0` ⇒ 必红；若删掉渲染门，smoke `:1279` 必红。两条守卫互补成立。**残余限制（非阻断）**：正文列宽仍由同一让位公式生成（`:239`），故「仅调公式且矩形仍不相交」的情形不被 ①/② 捕获——但该类改动会被 ④ 的逐档固定值（544/544/544/512/356）拦住。

### P2-1 `resetSplit` 抽屉态强制右缘 → **FIXED**
`lib/client.js:1573-1580`：`if (this.active === true && this.drawerOpen === true) { this.chatSide = 'right'; this.chatW = DRAWER_W; this.applyDrawer() }`，且注释说明「换边偏好已在 openDrawer 存入 drawerSideSaved，此处只收敛当前态、不改偏好」。smoke `:1320-1328` 用 `fnBody('resetSplit() {')` 切片断言（非全文件 includes）。

### P2-3 手柄/拖线 top 未扣提示行 → **FIXED**
`lib/client.js:4345-4347` 单点：`hintH = drawerHintText !== null ? DRAWER_HINT_H : 0`、`bodyH = … − noticeBoxH − hintH`、`contentTop = g.top + TITLE_BAR_H + noticeBoxH + hintH`；手柄两态（`:4763` / `:4769`）与拖线均用 `top: contentTop`、`height: bodyH`；smoke `:1329-1335` 断言单点并负断言旧式表达式。`DRAWER_HINT_H = 23` 与 CSS 相符（`.nv-drawer-hint`：line-height 16 + padding 3×2 + border-bottom 1 = 23，`client.js:5167`）。

### P2-2 跨子树 z-order（仅静态值）→ **OPEN（外部依赖，非代码缺陷）**
`.nv-split{z-index:900}` 自成层叠上下文，宿主 viewArea 的 inline `z-index:920` 属不同上下文 ⇒ 数值序不等于绘制序，真实绘制序需真机 CDP 实测。本机 CDP 通道当前不可用（宿主 0.2.1-rc.2 闭包无 `dsh-app-boot`，探针 boot 即 `ERR_MODULE_NOT_FOUND`），该项**归 Coordinator**，交付前不得以此为「已验证」。非本轮返工引入。

### P3 规格注记（DR1 P3-1~P3-4）→ **已落规格 §8（内容属实，见 §5 追认建议）**

## 3. 返工是否引入新回归

| 对照面（DR1 已认可部分） | 判定 | 证据 |
|---|---|---|
| 全屏几何（左缘→colW、resize 重算） | 无回归 | `client.js:4607` inline `left: g.left / top: g.top / width: colW / height: g.bottom−g.top` 在位；smoke 全绿 |
| 恢复保证五路径（open / syncAnchor / closeDrawer / close / setBook） | 无回归 | `restoreViewArea()` 调用点实测 **5 处**：`1278 / 1352 / 1370 / 1499 / 1597`；`setBook` 内 `if (this.drawerOpen === true) this.closeDrawer()`（`:1597` 区段）在位；smoke `:1293-1305` 逐路径具名（切函数体后断言） |
| 让位（收文件树/章节列 + 正文 maxWidth） | 无回归 | 公式与 `navCollapsed/textMax` 未改；六档实测与 §3 真值表一致（988 档已由 1046 档覆盖，实测余量 71/25/13） |
| 降级提示 | 增强 | 阈值 956→1046、文案补 Esc 出口；`<740` 保留「建议全屏」 |
| 契约登记（P-10） | 修复且无新增漂移 | `item 3.3` 五段 `L1398-L1413 / L1417-L1434 / L1439-L1458 / L1463-L1479 / L4761-L4772`——第 4 段已覆盖 `applyDrawer`（`:1463-1472`）；`item 3.7` 锚点 `L1017 / L1019 / L1069 / L1127` 与源码逐行吻合（`SPLIT/DEFAULTS/DRAWER/ORDER` 四键）；`regionLiterals.viewAreaProps` 15 属性双向对账由 smoke ⑫ 覆盖并通过 |
| 改动范围 | 无越界 | `git diff --name-only` = 6 个产品/文档文件（`lib/client.js`、`lib/host-contract.mjs`、`test/smoke.mjs`、`scripts/verify-visual-geometry.mjs`、`README.md`、两份 UX-063 文档）；`lib/index.js` / `lib/host-boundary.js` / `install.*` / `package.json` / `cordis.patch.yml` / `agent-presets/**` **零触及** |
| 禁改清单（迁移表 D 段） | 无越界 | rail / 3 页签 / 文件树结构 / chrow 28px / 6 项存量令牌值 / 门禁卡与机器审计：diff 零涉及；geometry 复测 rail 44、chrow 28+12px、para 1em 不变 |

## 4. 本轮新发现

### P2-1（非阻断）`colW < 740` 档：手柄隐藏但提示未给 Esc 出口
`drawerHintText` 分支（`client.js:4333-4335`）在 `colW < 740` 时**优先**取 `drawerTinyHint`（「视口过窄，建议全屏」，`:248` / `:434`，**不含 Esc**）；而该档手柄同样因 `colW < 1046` 不渲染。⇒ 抽屉在该档打开时，唯一关闭通道是 Esc，但唯一提示没说 Esc（**发现性缺口**；Esc 本身可用，不构成死路）。
**影响面**：视口 < 1020（`colW = 视口 − 280`），低于验收视口 1366/1440/1680，且规格 §3 已明示该档为降级带。
**建议**：`drawerTinyHint` 文案补「按 Esc 收起对话」，或抽屉开启时改渲染 `drawerNarrowHint`（两者择一，1 行级）。

### P3-1 `U63_TEXT_LEFT = 11` 为脚本内硬编码常量
来源已在注释（`:45-50`）写明并被我核实，但若 `padding`/`border` 改动，脚本模型会静默漂移。**建议**：断言源码存在 `.nv-split` `border:1px` 与 `padding: '10px 10px 0'` 两个字面量（或直接抽取），使 11 的来源可机检。

### P3-2 `DRAWER_HINT_H = 23` 手工推导常量
当前与 CSS 一致（16+6+1），但无守卫绑定。**建议**：geometry 增加「提示行实测高度 ≡ `DRAWER_HINT_H`」断言（提示行可静态注入量算），防 CSS 改动后手柄/拖线 top 静默偏移 1~N px。

### P3-3 阈值 1046 的 1px 取整余量
严格 24px 呼吸间距需 `colW ≥ 1047`；现取 1046（实测 23px，不遮挡）。规格 §8 item 2 已如实披露。**建议**：或改 1047 与 `DRAWER_GUTTER` 口径统一，或保留 1046 并在 DEC/证据中显式接受——两法皆可，但必须留痕其一。

### P3-4 规格 §8 item 4 的「覆盖」措辞与实测不符（仅措辞）
实测 `740–956` 档 `drawer−text ≥ 13px`（不遮挡）；真实遮挡只出现在约 `colW < 591`（公式 160px 下限生效后抽屉左缘越过正文右缘）。§8 item 4 仍写「改为不透明覆盖」，易被读成该档存在遮挡。**建议**：改为「该档为收窄 + 提示（无遮挡）；不透明抽屉仅在极窄档（≈colW<591）覆盖正文」。

### P3-5 规格 §8 由 Developer 落笔（流程）
DR1 曾将 P3 规格注记归 Coordinator；返工轮由 Developer 直接写入 `docs/design/UX-063-redesign-spec.md`（+11 行）。**内容经我逐条核实为真**（见 §5），建议 Coordinator 追认（记 DEC-157 或证据），并在后续批次约定「设计文档修订由 Coordinator 落笔、Developer 只提供事实」。

### P3-6 `fnBody()` 括号匹配不跳过字符串/注释
`test/smoke.mjs:1217-1230` 以 `{`/`}` 计数切函数体；若函数体内字符串字面量含花括号会误切。当前 5 个目标函数不含此类字面量，可用。**建议**：注释标注该前提，或改用轻量词法跳过字符串。

### P3-7 拖线 z 922 覆盖手柄右缘 4px
`nv-chatdiv` 现 `left = x + contentW − 4`、`zIndex: 922`（`client.js:4735-4740` 区段），手柄开启态 `z 921` 且右缘同为 `colW−420` ⇒ 手柄右 4px 被拖线接管（点击起拖动而非关闭）。可点区仍为 44px，**非阻断**。**建议**：注释说明该取舍，或将拖线改到手柄左侧（`−52`）以免遮挡关闭钮热区。

## 5. 规格 v3.1 注记要点（供 Coordinator 采纳/追认）

Developer 已写入 `docs/design/UX-063-redesign-spec.md` §8（6 条）。我逐条核实：

1. 「§1A 脚手架已原型 `restoreViewArea()` 不成立」——**属实**（HEAD 检索零命中，本步新实现）；建议补一句「规格原假设由本注记废止」。
2. 「开启态手柄补登记 + 1046 阈值 + 1047 推导」——**属实且算术正确**（555+24 ≤ colW−468 ⇒ 1047；取 1046 余 23px 已披露）。
3. 「真实左偏移 11px、rail 在 midFooter、抽屉本体零遮挡成立」——**属实**（`.nv-split` border 1 + padding 10；rail `:4497` ⊂ `:4485`）。**并应显式写「v3 草案『chrome 58px ⇒ 相交 34px』推断作废」**（§8 已含）。
4. 「740–956 改为不透明覆盖」——**建议按 P3-4 改写**（该档实测无遮挡；「覆盖」仅极窄档成立）。
5. 「抽屉态可见面：左窗（文件树 + 工作流状态面板）一并不可见，保留底部工作台」——**属实**（`.nv-left` 含 `LeftNav` + `WorkflowPanel`，`:4705-4711`；`midFooter` 保留 `:4710` 区段）。
6. 「口径标注：公式预留 24 vs 实测余量 13 起」——**属实**（geometry 输出已分离）。

## 6. 措辞纪律复核（N-4）

- `README.md` / `docs/verification/UX-063-assertion-migration.md` / `docs/design/UX-063-redesign-spec.md` 全文**无**「P0-a 已交付」「视觉验收通过」等越界表述（grep 零命中）。
- 迁移表 #13 标注 **[已迁移 · 第①步部分]**，并明写「`.nv-home` 880 / CTA 36 属第②步、未实现未断言」——诚实口径成立。
- README 断言计数 **324** 与 smoke 实测 324 一致（A-F9 自证断言在位）。
- 可感知性：第①步独立差异 **3~4 处**（工作台全宽 / 对话窗→抽屉 / 阅读行宽 236→510〔`--nv-measure` 36em 封顶，544 需第③步 16px〕/ 窄窗提示），**不足 ≥5 硬闸门**。放行边界重申：不得提前请用户目检、不得称 P0-a 已交付。

## 7. 放行清单

**可放行（本步）**：产品行为面无 P0/P1 缺陷；DR1 两项阻断已修；返工无回归；文档无越界。

**随交付必须保留的披露**：
- 第①步 ≠ P0-a 完成；差异数 3~4 < 5。
- `P2-2` 跨子树 z-order 真机证据缺失（CDP 探针被 `dsh-app-boot` 缺失阻塞，归 COMPAT-018）。
- 规格 §8 待 Coordinator 追认；P3-4 措辞待下一版规格修订。

**建议下一批（第②步前）一并处理**：P2-1（Esc 提示文案）、P3-1/P3-2（守卫绑定）、P3-4（规格措辞）、P3-7（拖线热区注释）。
