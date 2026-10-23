# UX-063 P0-a 第①步 · Code Review CR2（delta 复审）

- 日期：2026-10-23
- 审查者：Code-Reviewer(subagent)｜独立执行，未采信交付自述
- 复审对象：CR1（`docs/review/UX-063-P0A-CR1.md`，NEEDS_CHANGE / 1 阻断）findings 的返工结果
- 口径：M7.4 T1 delta 面 —— 只审「上轮 findings 是否真修 + 返工是否引入新回归」
- 变异测试环境：`%TEMP%\cr2-base`（仓库副本；`node_modules` 为只读 junction；**未修改工作树产品文件**）

## 结论

**APPROVED_WITH_NOTES**　`unresolved_blockers = 0`（P0=0，P1=0，P2=2，P3=3）

上一轮唯一阻断项（契约面事实错误 + 陈述不实）**已真修并可核**；三条「无判别力断言」经变异实测**已恢复判别力**；几何守卫已由「公式自证」升级为**矩形级正交判据**并有变异实证。剩余 5 项均为断言强度/账目精度类备注，不构成产品缺陷与阻断。

## 一、门禁实测（本审查者独立复跑）

| 门禁 | 命令 | 结果 |
|---|---|---|
| 语法 | `node --check` ×4（client / contract / smoke / geometry 脚本） | 0 errors（exit 0） |
| 冒烟 | `node test/smoke.mjs` | **324 passed / 0 failed**（exit 0） |
| 几何 | `node scripts/verify-visual-geometry.mjs` | **OK**（exit 0）；`u63.cols` 六档：1400/1086/1046 手柄在场（余量 377/63/23），1000/956/800 手柄 `null`；正文列 `l=11`；抽屉↔正文实测余量 1000→25px、956→13px |
| 契约锚点 | `node scripts/verify-contract-anchors.mjs` | 79 段 **FAIL=0**（WARN 29） |
| 对比度 | `node scripts/verify-contrast.mjs` | `FG_MUTED_ROWS=4 V3_BELOW_4.5=0` |
| 预设 | `node test/validate-preset.mjs` | PRESET VALIDATION PASSED |

## 二、CR1 findings 逐条复核

| # | CR1 finding | 判定 | 证据 |
|---|---|---|---|
| 1 | **P1** item 3.7 四锚点错位（3/4 错、整体 −2） | **FIXED** | `lib/host-contract.mjs:163` 现写 `L1017 / L1019 / L1069 / L1127`；实读源码 `const SPLIT/DEFAULTS/DRAWER/ORDER_PERSIST_KEY` 行号 = **1017 / 1019 / 1069 / 1127**，逐一吻合。并以 `git show HEAD:lib/host-contract.mjs` 复核：HEAD 为 1007/1009/1074（对应 HEAD 源码同值）⇒ 上轮确有 −2 漂移，本轮已重基 |
| 2 | **P1** item 3.3 未覆盖 `applyDrawer` 五写面 | **FIXED** | 段面现为 `L1398-L1413 / L1417-L1434 / L1439-L1458 / L1463-L1479 / L4761-L4772`；第 4 段含 `applyDrawer(){`（L1463）与五写 `position/zIndex/boxShadow/borderLeft/background`（L1467-L1471）。次要瑕疵见 P3-2 |
| 3 | **P1** 迁移表 F4「端点逐行复核」陈述不实 | **FIXED** | F4 现明写「上轮『端点逐行复核』表述**不成立**」，并记录 3.7 上轮即已错 −2、返工 +27 行导致的整体漂移、以及本轮重基范围 |
| 4 | **P2** 三条断言变异后仍全绿 | **FIXED**（3/3 必红） | 见下节 M1/M2/M3；另发现同族残余 M4（P2-1） |
| 5 | **P2-4** geometry「零遮挡」公式自证 | **FIXED** | `U63_TEXT_LEFT = 11` 按真实左偏移建模；判据改为矩形级 `drawer.l − text.r ≥ 0`、`handle.l − text.r ≥ 0`、非渲染档 `handle === null`；输出分离「公式预留 24 / 实测余量 425,111,71,25,13,13」；M5 变异实证判别力 |
| 6 | **P2-5** `setChatSide` 死分支 | **FIXED** | L1530-1538 已删死分支，注释如实记录删除原因 |
| 7 | **P3** 2.14 陈旧行号 / 手柄 zIndex 说明 / chatdiv 与手柄 2px 重叠 | **FIXED** | 2.14 note 无 `L899-910` 残留；L4756 增「同层叠上下文内兄弟」澄清；chatdiv 改 `left = x + contentW − 4`、`z 922 > 手柄 921`（边界抓取优先，手柄仍余 44px 可点） |

## 三、变异判别力实测（副本内执行，基线 324/0 已先复现）

| 变异 | 期望 | 实测 | 判定 |
|---|---|---|---|
| M1 `close()` 内删除 `this.restoreViewArea()` | 红 | **红**：`SMOKE 322/2` → `ux063 restore path missing` | ✅ |
| M2 `setBook` 切书判据 `=== true → === false` | 红 | **红**：`322/2` → 同上断言 | ✅ |
| M3 `applyDrawer` 删除 `background` 写 | 红 | **红**：`322/2` → `ux063 property sets missing` | ✅ |
| M4（自选）`syncAnchor()` 内删除**首个** `restoreViewArea()`（L1352，还原旧节点） | 红 | **绿：324/0** | ❌ **新发现 P2-1** |
| M5 `DRAWER_HANDLE_MIN_COLW 1046 → 800`（窄带手柄进入正文区） | 红 | **红**：`geometry FAIL: u63TextCol` | ✅ |

（M1/M2/M3 同时触发 `A-F9 declared=324 actual=323`，属计数自校连带红，非主判据。）

## 四、新发现问题

### P2-1 五路径断言「路径级具名」但**调用级 multiplicity 盲**（不阻断）
`syncAnchor()` 内有两处还原：L1352 在换根前还原**旧 viewArea**（语义关键），L1370 else 分支还原新节点。smoke 断言仅要求 `syncB.includes('this.restoreViewArea()')`，删掉 L1352 后 L1370 仍满足 ⇒ **判据存活**（M4 实测全绿 324/0）。产品行为本身正确，故非阻断；建议把断言收紧为带前置条件的具体调用（如 `syncB.includes('isConnected && this.viewArea !== viewArea) this.restoreViewArea()')`），或对「旧节点还原」单独具名断言。

### P2-2 单行型 item `line` **仍无机器守卫**，F4「守卫新增/强化」措辞偏宽（不阻断）
`scripts/verify-contract-anchors.mjs` 本轮**未改动**（`git diff --name-only` 无该文件），79 段检查仍为形态/关键词级；`smoke` ⑫ 对 3.7 只查 token、⑫b 明文排除该形态 ⇒ **3.7 这类单行锚点写错仍零信号**（CR1 指出的失效模式未闭环，只是本次值改对了）。F4 中「守卫新增/强化 = …」列举的均为既有守卫。建议：为单行 item 增「value ≡ 源码该键定义行」机检，或至少对 3.7 四键加精确行号断言；并把 F4 措辞改为「守卫现状（未新增）」。

### P3-1 行数账漂移（文档精度）
F4 记 `lib/client.js 5631 → 5658（返工净 +27）`，实测当前 **5664 行**；契约 `revisions` UX-063 条目记 `5407 → 5631（净 +224）`，实测 **+257**。锚点值本身已复核正确（1017/1019/1069/1127），仅账目陈旧；建议随交付 commit 一并订正或注明「以实测为准」。

### P3-2 item 3.3 第 4 段越界 7 行
`L1463-L1479` 覆盖 `applyDrawer`（1463-1472）后延伸进 `toggleDrawer`（1475-1479）。不影响正确性，但段界与函数界不一致易在下次重基时误导；建议收至 `L1463-L1472`。

### P3-3 geometry 判据 ①/④ 仍属公式一致性
`x.text.w === u63TextW(x.c)` 与四档宽度值属「实现公式一致性」；判别力来自 ②③ 矩形正交判据（已由 M5 证实）。报告口径已披露「formula reserve vs measured margin」，可接受；后续若接入真机 CDP，应以实测矩形替换 ①。

## 五、禁改清单与越界核查

- `git diff --name-only` 改动面：`README.md` / `docs/design/UX-063-redesign-spec.md` / `docs/verification/UX-063-assertion-migration.md` / `lib/client.js` / `lib/host-contract.mjs` / `scripts/verify-visual-geometry.mjs` / `test/smoke.mjs`（+ `.governance/**` 治理面，非本任务产品改动）。
- **零触碰**：`lib/index.js`、`lib/host-boundary.js`、`install.ps1`/`install.sh`、`package.json`、`cordis.patch.yml`、`agent-presets/**`；无新增 npm 依赖。
- 禁改清单（rail / 页签 / 文件树结构 / chrow 28px / 存量令牌值）经 diff 与 geometry 复测无变化（rail 44、chrow 28+12px、cstat 12px、para 1em、measure 510 均不变）。
- 措辞：README / 迁移表 / 规格 v3.1 中**无**「P0-a 已交付 / 视觉验收通过」类表述；规格新增 §8 v3.1 更正段落，如实记录 `restoreViewArea` 原不存在、开启态手柄新增、正文左偏移 11px、§3 半透明/遮挡表述更正，并引用 `REVIEW-UX-063-R4/R5`。

## 六、结论与放行意见

- 阻断项（CR1 P1×1，含 3 个子项）**全部 FIXED**，且有源码行号/HEAD 对照/F4 文本三重复核。
- 三条无判别力断言**全部恢复判别力**（M1/M2/M3 实测必红），几何守卫**由自证升级为矩形正交判据**（M5 实测必红）。
- 残余 P2×2（syncAnchor 调用级盲区、单行锚点无机器守卫）与 P3×3（行数账、段界越界、判据①口径）均为**非阻断**，建议在下批（UX-063 第②步同批或独立 CLEAN 项）收口。

**终态：APPROVED_WITH_NOTES / unresolved_blockers = 0 —— 通过。**
