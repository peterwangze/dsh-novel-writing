# REVIEW-UX-061-1B2-CR1 — UX-061 阶段 1b-2 Code Review

```
REVIEW-UX-061-1B2-CR1 NEEDS_CHANGE / unresolved_blockers=1
```

- 审查对象：工作区未提交改动 vs HEAD `4a86ab7`（`lib/client.js` 44/44、`test/smoke.mjs` 22/6、`scripts/verify-contrast.mjs` 20/1、`README.md` 1/1、`docs/design/UX-061-visual-directions.md` +41、`docs/verification/UX-061-assertion-migration.md` 42/9）
- 审查日期：2026-10-21
- **结论：不可提交**（P1=1：输入控件高度回归，实测 +13~15px）。其余 V-1/V-2/V-3/G-1/G-2/G-3/G-4 的实现在代码层自洽，残留为文档口径与守卫覆盖面（P2/P3）。
- 本审查用 **headless Edge 真机量算**（`--dump-dom` + `getBoundingClientRect`）做了前后对照，不是纸面推演；另做了守卫逻辑的注入构造验证。未修改任何产品文件（仅临时 HTML/CSS 在 `%TEMP%`）。

---

## 一、P1（阻塞）：`.nv-cinput` 的 `min-height` 落在 content-box ⇒ 输入框高度 29→44（模态 37→50）

**机理**：`<input>` 的 UA 默认 `box-sizing: content-box`（`<button>` 是 border-box）。因此 `min-height: var(--nv-ctl-md)`（32px）约束的是**内容盒**，总高 = 32 + padding(5+5) + border(2) = **44px**；模态内 `.nv-cmodal .nv-cinput{padding:8px 10px}` ⇒ 32+16+2 = **50px**。

**headless Edge 实测（同一 HTML/CSS，HEAD vs 工作区）**：

| 控件 | 选择器 | box-sizing | HEAD 高 | 1b-2 高 | Δ |
|---|---|---|---|---|---|
| 搜索/列表输入 | `.nv-cinput` | **content-box** | **29** | **44** | **+15** |
| 模态输入 | `.nv-cmodal .nv-cinput` | **content-box** | **37** | **50** | **+13** |
| 折叠钮 | `.nv-cfold` | border-box | 22 | 28 | +6 |
| 排序 pill | `.nv-csortbtn` | border-box | 32 | 32 | 0 |
| 普通按钮 | `.nv-cbtn` | border-box | 29 | 29 | 0 |
| 主按钮 | `.nv-cbtn-accent` | border-box | 27 | 28 | +1 |
| 工作流主/次按钮 | `.nv-wfctl-btn` / `-btn2` | border-box | 28/28 | 28/28 | 0 |

**影响**：这是纯视觉任务里的尺寸回归——表单/搜索/模态输入框在密集控制台里突然变成 44/50px，且与设计口径「控件 28/32 两档」（设计文档 §7.4）直接冲突；`.nv-cfold` 的 +6 若属有意（控制高度归一）应明示。
**最小修复**（二选一，修后请用同样的 headless 量算复验 28/32）：
1. `.nv-cinput{box-sizing:border-box}`（与按钮族一致；`.nv-cmodal .nv-cinput` 的 padding 覆盖仍在，最终 32px）；
2. 或改为 `height:var(--nv-ctl-md);box-sizing:border-box`（固定档位），并同步 `.nv-cmodal .nv-cinput` 的高度口径。
**同时**：设计文档 §7.4 的「控件高度 = 28/32 两档」应改写为「min-height 下限 28 / 输入 32；按钮为 border-box，输入 MUST 显式 border-box」——否则文档与实现仍不一致（本审查实测 `cbtn` 29、`csortbtn` 32 也不是精确两档）。

## 二、V-1/V-2/V-3/G-1/G-2 的核验结果（代码层自洽，逐项有据）

| 项 | 声称 | 我的实测 | 判定 |
|---|---|---|---|
| V-1 消费数 | ctl-sm 6 / ctl-md 1 | `var(--nv-ctl-sm)` 引用 **6**、`var(--nv-ctl-md)` **1**（另有 1 处 `:root` 定义）✓ | 数量真，**布局有回归**（见 P1） |
| V-2 字面量 | CSS `font-size` 48→9 | 实测 **9** 处，选择器 = `.nv-drawer-title-ico`/`.nv-console-title-ico`/`.nv-csearch-icon`/`.nv-bar .nv-mini`/`.nv-console-head .nv-mini`/`.nv-ccard-mono`/`.nv-cico`/`.nv-bar-ctl`/`.nv-cplus-icon`，均为图标/字形（`.nv-ccard-mono` 为 monogram 字形，可接受） | ✅ 属实 |
| V-2 映射 | 39 处映射 | 48−9=39，映射去向（10/10.5→caption、11/11.5→base、12→base、13→card、14/15→body）与 diff 一致；`14→15` 两处（`.nv-content h3`、`.nv-hero-btn`）属 +1px 变化，属设计取舍（P3 目检项） | ✅ 与自述一致 |
| V-3 subtle | 文本 14 处→0，剩 6（1 定义 + 5 非文本） | `nv-fg-subtle` 引用 HEAD **20** → 现在 **6**（14 处迁出）；剩余 5 非文本 = `stColor` 状态点 / `drawer-caret` 图标 / `.nv-dot` 边框 / `.nv-csearch-clear` 字形 / `.nv-cdot` 伪元素 | ✅ 属实（仅颜色改动，无结构变更） |
| V-3 text3 | 「TK.text3 的 6 个内联消费点」 | 实际 `TK.text3` 消费点 **7 处**（L2432/2781/2792/2801/2820/3197/4725，均 11/11.5px），定义 `TK.text3` 1 处 | ⚠️ 文档少计 1（P3） |
| V-3 对比度 | muted 亮 5.80 / 暗 10.42，FG_MUTED_ROWS=4 BELOW_4.5=0 | 实跑 `verify-contrast.mjs`：`FG_MUTED_ROWS=4 BELOW_4.5=0`，exit 0；V-3 段用改后值计算，subtle 基线仅作对照不计失败 ✓ | ✅ 属实 |
| G-1 守卫 | 三条负断言 + 三形态构造证明 | 断言在位（单/双引号、模板、`var(--nv-…)px` 产出形状）；我用同正则对 4 种故障串注入：全部 caught（allowed=false）；2 种干净串 allowed=true ✓ | ✅ 逻辑成立（未复跑整轮，不改产品文件） |
| G-2 | 维持方案 B | `:root` 单声明 color-mix；消费统一裸 `var(--nv-*-text)`；迁移表 §5.4 已写明「继承父色」；无 `@supports` 半实现 ✓ | ✅ 一致 |
| G-3/G-4 文档 | §7.1~§7.5 | §7.1 wfchip 三档与代码一致（muted/running/err）✓；§7.2 `.nv-sep` 用 `border-strong` ✓；§7.3 ccard hover = accent 边框 + surface-hover ✓；**§7.4 控件两档与实测冲突（P1）**；§7.5 除 text3 计数外与代码一致 | ⚠️ 见 P1/P3 |

## 三、P2（不阻塞，但需处置）

1. **V-2 的覆盖范围未写清，且守卫看不见内联字号**：CSS 字面量确实 48→9，但 **React 内联 `fontSize` 数字字面量仍有 44 处**（HEAD 亦 44，本批未动；其中 `fontSize:'11.5px'` **2 处**仍未归入尺度）。我构造验证：往真实源码注入内联 `fontSize:'13px'` ⇒ 新白名单检查**仍绿**（`literalFsLines` 只匹配 kebab `font-size:`）；注入 CSS 文本规则 ⇒ 转红 ✓。因此：设计文档 §7.4「文本字号唯一数值来源 = `:root`」与「尺度外字号一律归入 11/12」**只对 CSS 规则成立**，对 44 处内联不成立。
   建议：①文档限定口径为「CSS 规则内」；②守卫加一条 `!/fontSize:\s*'?[0-9]/`（或把 44 处列入显式豁免清单并声明归属 1b-3/UX-062）；③内联字号迁移单列批次（不与 1b-2 混）。
2. **迁移表 §6.1「尺度令牌 26 定义 / 16 启用 / 10 未启用」**：核算成立（fs 9 + ctl 2 + sp 2 + r 1 + lh 2 = 16；未启用 sp-3..7、r-sm/md/lg/pill、lh-normal = 10）✓；但同一表把 `--nv-ctl-*` 的「已完成」与实测 44/50px 并列，读者会误以为控件尺寸达标 → 随 P1 一并订正。
3. **新 smoke 检查的强度弱于声称**：`ctlSm >= 3 && ctlMd >= 1`，而自述是 6/1 消费者；未来少到 3 处也不会红。建议改为 `>= 6`/`>= 1` 或与「控件类名清单」逐一对应（0 成本）。

## 四、P3
- P3-1 迁移表 §6.1 与 §5.5 V-3：`TK.text3` 消费点写 6，实为 7。
- P3-2 `.nv-cfold` 22→28px（+6）：若为控制高度归一的预期行为，请在 §7.4 明示；否则属未披露的布局变化。
- P3-3 `verify-contrast.mjs` 的 V-3 段复用 `BELOW_4.5=` 标签输出（主表与 V-3 表各一行），建议改为 `V3_BELOW_4.5=` 以免日志混淆。
- P3-4 `14→15`（`.nv-content h3` / `.nv-hero-btn`）为 +1px 字号变化，属目检项（G-5）验证范围。

## 五、门禁真跑（本审查独立执行）
| 命令 | 结果 |
|---|---|
| `node --check lib/client.js test/smoke.mjs scripts/verify-contrast.mjs` | 全 exit 0 |
| `node test/smoke.mjs` | **309 passed, 0 failed**（README/A-F9 计数 309 自洽） |
| `node test/validate-preset.mjs` | PRESET VALIDATION PASSED（schema-face: PASS） |
| `node test/fixtures/host-surfaces/probe-face.mjs` | **OK：28/28** |
| `node test/fixtures/host-surfaces/ci-mock-face.mjs` | OK：4/4 |
| `node scripts/verify-contract-anchors.mjs` | **76 段 / FAIL 0 / WARN 24**（`client.js` 行数 5327 未变，无需重基 ✓） |
| `node scripts/verify-contrast.mjs` | FG_MUTED_ROWS=4 / BELOW_4.5=0（exit 0） |
| 附加：headless Edge 量算（HEAD vs 工作区，同一 HTML） | 见 §一 表；`.nv-cinput` 29→44、模态 37→50 |

## 六、待验证（本审查无真实宿主，不得视为通过）
- 明/暗/合成主题 × 4 视图 × 七态目检（G-5）；`14→15` 与 `.nv-cfold` +6 的实机观感。
- 0.1.x 宿主 `--nv-*-text` 缺失时继承父色的实际表现。
- 内联 44 处字号的视觉一致性（属 1b-3/UX-062 面）。

## 七、结论
`NEEDS_CHANGE / unresolved_blockers=1`（P1：`.nv-cinput` content-box 高度回归）。
修复 P1（加 `box-sizing:border-box` 或改固定 height）+ 同步设计文档 §7.4 口径 + 顺手修 P3-1/P3-3 后，可发本 Reviewer 窄口径 CR2 确认：只需复跑 headless 量算（期望 `.nv-cinput` 32、模态 32）+ smoke/anchor 双绿。
