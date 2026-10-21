# REVIEW-UX-061-P2-CR3 — UX-061 阶段 2 收口轮窄口径终审

```
REVIEW-UX-061-P2-CR3 APPROVED_WITH_NOTES / unresolved_blockers=0
```

- 审查对象：工作区未提交改动 vs HEAD `4318968`（`lib/client.js` **+155/−75（净 +80）**、`lib/host-contract.mjs` 22/21、`test/smoke.mjs` 97/33、`.github/workflows/ci.yml` +5、`README.md` +4/−1、设计文档 +6/−4、迁移表 +70/−1、新增 `scripts/verify-visual-geometry.mjs`）
- 审查日期：2026-10-21
- **结论：阶段 2 可提交**（CR3 五项 a~e 全部核验通过；残留 1 处审计数字需订正 + 1 处守卫可增强，均非阻塞）。
- 本审查独立执行全部门禁 + **headless 复测（含我自己的最坏态与受约束行高仿真）** + **守卫注入绕过测试**；未修改任何产品文件。

---

## a) rail 短标签机制：真的消除了「长句撑爆 rail」

| 核验点 | 证据 |
|---|---|
| 6 态 × zh/en 成对 | `railStatusIdle/Running/Busy/Unbound/Stale/Degraded` 各 2 locale（zh L275-280 / en L456-461），共 12 条 |
| 可见文字只走短标签 | JSX L4333-4338：`t('railStatusBusy') … t('railStatusIdle')` 六分支；**不含**任何长句键 |
| 长句仍保留完整信息 | 同一 span 的 `title: statusText, 'aria-label': statusText`（L4290 `statusText` 由 `sessionsMissing/stale/...` 长句构成）✓ |
| 旧长键不再出现在 rail 状态段 | 我按 JSX 段核对：`sessionsMissing / wfRunning / wfIdle / unbound / stale / railBusy` 在该段 0 引用 ✓ |
| 视觉兜底 | `.nv-rail-status{…max-height:120px;overflow:hidden}`（L5216）；`data-tone=err` 用 `--nv-err-text`（S-3 披露一致）✓ |
| 长度实测 | zh 最大 5（服务不可用）/ en 最大 8（Degraded），均在 zh≤6 / en≤14 内 ✓ |

结论：机制有效——可见文字不再引用长句，长句经 title/aria 保留，最坏态不再把 3 个按钮挤出 rail。

## b) 长度断言 fail-closed 性 + 可绕过面

断言实现（smoke L1305-1317）：6 键白名单 + 全源 `railStatusXxx: '…'` 收集（要求恰 12 条）+ zh（CJK）≤6 字 / en ≤14 字符 + 可见段 900 字符窗口内不得出现 6 个旧长键。

**注入测试（我独立执行）**：

| 注入 | 结果 | 判定 |
|---|---|---|
| 新增第 7 个 i18n 短键（单引号） | **红**（found=14 ≠ 12） | ✅ fail-closed |
| 可见分支改用被禁长键 `t('wfRunning')` | **红** | ✅ |
| 把 `railStatusDegraded` 改成长句 | 红（round 内 Developer 已证明；与我的构造一致） | ✅ |
| **可见分支改用「另一个名字的长键」`t('statusLongSentence')`**（保留 6 个原键） | **绿（绕过）** | ⚠️ 残留缺口 |
| **第 7 个 i18n 键用双引号** `railStatusExtra: "…"` | **绿（绕过）** | ⚠️ 残留缺口 |

结论：对「6 键本身超长 / 新增单引号键」是 fail-closed 的；但 `onlyShort` 只检查「段内含 `t('railStatus` 且无 6 个旧长键」，**不要求段内所有 `t('…')` 都属于 6 键**，且 i18n 收集正则只认单引号。建议（非阻塞，1 行级）：段内提取全部 `t\('([A-Za-z]+)'\)` 并断言 ⊆ 6 键白名单；i18n 正则改 `["']`。当前源码 0 处双引号条目、无未知名长键 ⇒ 现状正确，只是守卫可再收紧。

## c) `max-height:120px` 与 rail 实际高度自洽性（我的实测）

**未受约束（内容驱动，与 geometry 同构）**：
- 我的 harness：rail **265px**（status「服务不可用」57px + stage + 3×32 按钮 + gaps + padding 24）
- geometry 脚本：rail **257px**（同上结构；±8px 差异来自行盒/字体度量，**不影响任何断言**）
- `statusRect.h = 57 ≤ 120` ✓；3 按钮 `visible=true` ✓

**受约束（模拟真实 mid 行：`flex:0 0 30%` + 父级 `overflow:hidden`，rail 作为 flex item stretch）**：

| 行高 | rail 实际高 | 3 按钮是否在行内 | 说明 |
|---|---|---|---|
| 180 | 180 | **是/是/是** | 列内 flex-shrink 压缩状态与 stage，按钮 `min-height:32` 不缩 |
| 210 | 210 | **是/是/是** | 同上 |
| 240 | 240 | **是/是/是** | 同上 |
| 270 / 300 | 270 / 300 | 是/是/是 | 内容完整 |

结论：`max-height:120` 与 rail 自洽——最坏状态标签 57px 远低于 120px，该上限是**安全网而非绑定约束**；真实短行下由 flex-shrink 吸收（优先保住按钮），**未发现按钮被裁剪**。代价：极短行时状态文字会被 `overflow:hidden` 截断（按钮仍可见）——属可接受的降级，纳入 G-5 目检项。

## d) R-1 措辞一致性：✅ 已对齐

- smoke P2 卫生检查现**真正包含** `.nv-chrow{box-sizing:border-box;height:28px` + `font:inherit;font-size:var(--nv-fs-base)` 两条断言（L1335 附近）✓
- 迁移表 §8 R-1「smoke P2 检查内已加…（CR2 R-1 措辞已与事实对齐）」与代码一致 ✓
- 我的 headless 复测：`.nv-chrow` 字号 **12px**、行高 **28** ✓

## e) 契约与门禁

- `revisions[]`：阶段 2 条目存在；「20 条行引用」与我按 `git diff -U0` 的 `{ face:` 行 20 增/20 减一致 ✓（本轮 17 条重基 + 前轮 3 条 = 20）
- **1 处审计数字过期（P2）**：revisions 写「`lib/client.js` 本批 **+138/−75（净 +63）**」，但工作区终态实测 **+155/−75（净 +80）**（本轮 rail 短标签/i18n/CSS 追加所致）。建议提交前改为终态数字或注明「+138/−75 为 R2 时点值，收口轮后 +155/−75」。
- WARN 25 → **22**：rebase 后部分条目起点回到声明行，WARN 减少；**FAIL 0**，且 COMPAT-013 F3 golden=2 未破（smoke 314/0 + probe-face 28/28 双绿）✓

## 门禁真跑（本审查独立执行）
| 命令 | 结果 |
|---|---|
| `node --check lib/client.js lib/host-contract.mjs test/smoke.mjs scripts/verify-visual-geometry.mjs` | 全 exit 0 |
| `node test/smoke.mjs` | **314 passed, 0 failed**（README 314 / A-F9 自洽） |
| `node test/validate-preset.mjs` | PASSED（schema-face PASS） |
| `node test/fixtures/host-surfaces/probe-face.mjs` | **OK：28/28** |
| `node test/fixtures/host-surfaces/ci-mock-face.mjs` | OK：4/4 |
| `node scripts/verify-contract-anchors.mjs` | 76 段 / **FAIL 0** / WARN 22 |
| `node scripts/verify-contrast.mjs` | `FG_MUTED_ROWS=4 V3_BELOW_4.5=0` |
| `node scripts/verify-visual-geometry.mjs --strict` | **OK**：rail 44 / measure 510 / edwrap 510 / chrow 28+12px / cinput 32 / para 1em / rail-status visible（statusRect 57、3 按钮可见），exit 0 |
| 附加：我的 headless（未受约束 + 受约束 180~300 行高） | rail 265/257；status 57；3 按钮全程可见（详见 §c） |

## 待验证（不得视为通过）
- G-5 真机目检（明/暗/合成主题 × 4 视图 × 七态）：rail 竖排短标签在 44px 内可读性、短行时状态截断的可接受性、阅读宽度节奏、书脊线、13.5px 数据表。
- 0.1.x 宿主降级；CI windows runner 上 geometry 步首跑（Edge 可用性/步骤顺序）。
- 1b-3 内联字号（44→38）全量迁移仍待办（本批只迁移了 6 处并重冻基线）。

## 提交建议限定语
> UX-061 阶段 2（方向 B：44px rail / 34em measure / 28px 章节行 / 13.5 数据表 / 循环动画清零 / rail 6 态短标签）——**A 迭代与 G-5 真机目检未完成，不得宣称视觉验收通过**；1b-3 内联字号迁移、0.1.x 降级、CI geometry 首跑待验证；契约 revisions 行数账见 P2 订正。

**结论**：`APPROVED_WITH_NOTES / unresolved_blockers=0` —— 阶段 2 可提交；提交前顺手完成 §e 的 revisions 数字订正（1 处文本），其余为可选守卫增强与 G-5 目检项。
