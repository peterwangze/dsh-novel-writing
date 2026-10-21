# REVIEW-UX-061-1B2-CR2 — UX-061 阶段 1b-2 窄口径收口复审（P1 + P2-1/P2-2 + P3 确认）

```
REVIEW-UX-061-1B2-CR2 APPROVED_WITH_NOTES / unresolved_blockers=0
```

- 审查对象：工作区未提交改动 vs HEAD `04b1269`（`lib/client.js` 44/44、`test/smoke.mjs` 41/6、`scripts/verify-contrast.mjs` 20/1、`README.md` 1/1、设计文档 +45、迁移表 59/10）
- 审查日期：2026-10-21
- **结论：1b-2 可提交**（P1 已真闭环，P2-1/P2-2 守卫构造验证成立）。提交前需顺手完成 3 处文档订正（§3 条件，非阻塞）。
- 本审查独立复跑 **headless Edge 三态量算**（HEAD / 首轮 / 修复后，同一 HTML+从 `lib/client.js` 抽取的 CSS），并对三项守卫做了注入构造验证；未修改任何产品文件。

---

## 一、P1 闭环验证（我自己的 headless 量算，未采信自述）

| 控件 | 选择器 | HEAD（1b 基线） | 首轮（CR1 抓到） | **修复后（本轮实测）** | 判定 |
|---|---|---|---|---|---|
| 基础输入 | `.nv-cinput` | 29 | 44 | **32** ✅ | 对齐 `--nv-ctl-md` 32 档 |
| 模态输入 | `.nv-cmodal .nv-cinput` | 37 | 50 | **32** ✅（padding 8→5 生效） | 对齐 32 档 |
| 折叠钮 | `.nv-cfold` | 22 | 28 | **28** ✅ | 有意归一（§7.4 已披露 +6） |
| 排序 pill | `.nv-csortbtn` | 32 | 32 | 32 | 无变化 |
| 普通按钮 | `.nv-cbtn` | 29 | 29 | 29 | 无变化 |
| 主按钮 | `.nv-cbtn-accent` | 27 | 28 | 28 | +1（min-height 下限） |
| 工作流主/次按钮 | `.nv-wfctl-btn` / `-btn2` | 28/28 | 28/28 | 28/28 | 无变化 |

- 盒模型确认：`.nv-cinput` 现 `box-sizing=border-box`、`min-height=32px`；`.nv-cmodal .nv-cinput` 同为 border-box（基类覆盖同一元素）⇒ 高度 32 ✓。
- **无连带影响**：8 个控件逐一量算，仅 cinput/模态 cinput/cfold/cbtn-accent 有变化且均为预期；`--nv-ctl-md` 全文件仅 1 处消费（无其他 input 被误扩）。
- 设计文档 §7.4 现与实测一致：写明 `<input>` content-box 陷阱、MUST 显式 border-box、修复后 32/32/28、模态 padding 8→5 的理由与「若保留 8px 则为 36px 需登记例外」的边界 ✓。

## 二、P2-1（内联字号守卫）构造验证

守卫实现：`fontSize:\s*'([0-9.]+)px'` 直方图签名冻结 = `11.5px:2,11px:12,12px:23,13px:6,14px:1`（合计 44）。

| 注入形态 | 我的实测结果 | 判定 |
|---|---|---|
| 干净源码 | pass（sig 与基线一致；ctlSm=6、ctlMd=1） | ✅ |
| 内联单引号 `fontSize:'13px'` | **红**（sig 变化） | ✅ 满足「新增/变更即红」 |
| 内联双引号 `fontSize:"13px"` | **绿（漏过）** | ⚠️ 残留缺口（源码当前 0 处） |
| 数字形态 `fontSize: 13` | **绿（漏过）** | ⚠️ 残留缺口（源码当前 0 处） |
| 补偿交换（一处 13px→12px + 一处 12px→13px） | **绿（漏过）** | ⚠️ 聚合签名固有边界 |

结论：**对「新增/删除某一字号的用法」有效**，符合本轮要防的主形态（也是 1b-3 迁移时最可能发生的）；双引号/数字形态与补偿交换是聚合签名固有边界，当前源码无前两种形态。建议（不阻塞）：把正则扩为 `fontSize:\s*["']?([0-9.]+)(?:px)?["']?`，或对 44 处建立「站点清单哈希」；文档已如实写「基线冻结 + 新增/变更即红」，未夸大。

## 三、P2-2（控件断言逐类名 + 精确计数）构造验证

守卫实现：6 条 `.{class}{min-height:var(--nv-ctl-sm)` 逐类名 `every` + `ctlSm === 6 && ctlMd === 1` + `.nv-cinput{box-sizing:border-box;min-height:var(--nv-ctl-md)` 精确形态。

| 注入 | 我的实测结果 | 判定 |
|---|---|---|
| 干净源码 | pass（ctlSm=6、ctlMd=1） | ✅ |
| 删 `.nv-cbtn` 的 `min-height:var(--nv-ctl-sm)` | **红**（every 失败 + ctlSm=5） | ✅ |
| 删 `.nv-cinput` 的 `box-sizing:border-box;min-height:var(--nv-ctl-md)` | **红**（精确形态不再命中） | ✅ |

结论：**逐类名 + 精确计数成立**，删任一消费者必红 ✓（优于上轮 ≥3/≥1）。

## 四、P3 确认

| 项 | 状态 |
|---|---|
| P3-1 `TK.text3` 6→7 | 迁移表 §5.5 已改 **7 个**（含行号 L2432/2781/2792/2801/2820/3197/4725）✅；**但设计文档 §7.5 第 3 条仍写「6 个」** ❌（见 §五-3） |
| P3-2 `.nv-cfold` 22→28 | 设计文档 §7.4 已明示为「控制高度归一的有意布局变化」✅ |
| P3-3 对比度日志标签 | 实跑输出 **`FG_MUTED_ROWS=4 V3_BELOW_4.5=0`** ✅ 已区分 |

## 五、提交前需完成的文档订正（非阻塞，但涉及「文档自述真实性」）

1. **P2-3 未真正完成**：迁移表 §6.1「数字（可复跑）」表**没有**加入「控件实际高度 29/37/22 → 32/32/28」与「内联 fontSize 基线」两行；而响应表 P2-3 行写「见 §6.1」——该交叉引用目前指向不存在的内容。请补两行到 §6.1（数值用我上面的实测值），否则表内引用失实。
2. **设计文档 §7.5 仍写 `TK.text3` 的「6 个」**（实际 7 个，迁移表已改）——两文档互相矛盾，请同步。
3. **README 守卫描述过期**：仍写「`--nv-ctl-*` 真实消费 ≥3/≥1」，而断言已是逐类名精确 6/1；建议改为「逐类名 6/1 精确对应」。

## 六、门禁真跑（本审查独立执行）
| 命令 | 结果 |
|---|---|
| `node --check lib/client.js test/smoke.mjs scripts/verify-contrast.mjs` | 全 exit 0 |
| `node test/smoke.mjs` | **309 passed, 0 failed**（README/A-F9 309 自洽） |
| `node test/validate-preset.mjs` | PRESET VALIDATION PASSED（schema-face: PASS） |
| `node test/fixtures/host-surfaces/probe-face.mjs` | **OK：28/28** |
| `node test/fixtures/host-surfaces/ci-mock-face.mjs` | OK：4/4 |
| `node scripts/verify-contract-anchors.mjs` | **76 段 / FAIL 0 / WARN 24**（`client.js` 5327 行未变） |
| `node scripts/verify-contrast.mjs` | `FG_MUTED_ROWS=4 V3_BELOW_4.5=0`（exit 0） |
| 附加：headless Edge 三态量算 | 见 §一（HEAD 29/37/22 → 修复后 32/32/28） |
| 附加：守卫注入构造（5 形态 + 2 删除） | 见 §二/§三 |

## 七、待验证（不得视为通过）
- G-5 明/暗/合成主题 × 4 视图 × 七态目检 + 真实取色（含本次 32/32/28 与 cfold +6 的实机观感）。
- 0.1.x 宿主 `--nv-*-text` 缺失时继承父色表现。
- 内联 44 处字号的视觉一致性（登记 1b-3）。

## 八、结论
`APPROVED_WITH_NOTES / unresolved_blockers=0` —— **1b-2 可提交**。条件：完成 §五 三处文档订正（与产品代码同 commit 即可，无需再审）；提交说明保留既有限定语（A 迭代未完成、G-5 目检未做、1b-3 内联字号迁移待办、10 个尺度令牌随阶段 2 落地）。
