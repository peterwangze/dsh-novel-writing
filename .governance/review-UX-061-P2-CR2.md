# REVIEW-UX-061-P2-CR2 — UX-061 阶段 2 返工后窄口径复审

```
REVIEW-UX-061-P2-CR2 APPROVED_WITH_NOTES / unresolved_blockers=0
```

- 审查对象：工作区未提交改动 vs HEAD `c078040`（`lib/client.js` **+138/−75（净 +63）**、`lib/host-contract.mjs` 22/21、`test/smoke.mjs` 78/33、`.github/workflows/ci.yml` +5、`README.md` 4/1、设计文档 +4/−2、迁移表 +57/−1、新增 `scripts/verify-visual-geometry.mjs`）
- 审查日期：2026-10-21
- **结论：阶段 2 可提交**（P1 已真闭环；CR1 的 P2×5 / P3 均已处置）。提交前建议顺手订正 1 处文档措辞（§四-1，不阻塞）。
- 本审查独立执行全部门禁 + **headless Edge 复测 4 项** + **新守卫的注入构造验证**；未修改任何产品文件。

---

## 一、原 P1 闭环（我的 headless 复测，非采信自述）

| 项 | 返工前 | 返工后（我实测） | 判定 |
|---|---|---|---|
| `.nv-chrow` 字号 | 13.3333px（UA 默认） | **12px**（`font:inherit;font-size:var(--nv-fs-base)`，L5204） | ✅ R-1 闭环 |
| `.nv-chrow` 行高 | 28 | **28** | ✅ |
| `.nv-content p` 上下边距 | 0 / 20px（被后置规则覆盖） | **15px / 15px**（唯一规则 `margin:1em 0`，L5157；15px 字号下 1em） | ✅ R-2 闭环 |
| `.nv-rail-status` 可见文字 | 无（纯图标） | 文本 **「运行中」** 可见（竖排，L5199-5201 + JSX L4320） | ✅ R-3 闭环 |
| rail 宽 | 44 | **44** | ✅ 无回归 |

## 二、守卫闭环（我用注入构造验证，不是看代码就签字）

删除后置覆盖规则、合并唯一 `.nv-content p` 后：smoke 断言对**生效规则**精确匹配（`'.nv-content p{margin:1em 0;font-size:inherit;line-height:inherit}'`，L1430）✓。

| 新守卫 | 干净源 | 注入故障后 | 判定 |
|---|---|---|---|
| B-9 阅读宽度（`--nv-measure` 定义 + `.nv-content`/`.nv-edwrap` 消费） | pass | 删 `.nv-edwrap` 的 `max-width` ⇒ **false** | ✅ fail-closed |
| B-10 循环动画全零（`@keyframes` / `animation:` / `infinite`） | pass | 注入 `@keyframes` ⇒ **false**；注入 `animation:x 1s infinite` ⇒ **false** | ✅ fail-closed（双形态） |
| CSS 卫生（rail 常驻状态文字 + rail 焦点双环 + 4 类选择器各恰 1 次 + 旧 accent-10% 选中底色串不得存在） | pass | 注入重复 `.nv-chrow{` ⇒ **false**；恢复旧选中底色串 ⇒ **false** | ✅ fail-closed |

实测计数：`.nv-chrow{` / `.nv-chrow[data-sel=true]{` / `.nv-ccard-name{` / `.nv-content p{` 各 **1**；旧 `background:...accent 10%...` 串 **0**；`@keyframes/animation:/infinite = 0/0/0` ✓。

## 三、CR1 的 P2/P3 逐项处置核验

| 项 | 结果 |
|---|---|
| **P2-1 B-9/B-10 断言** | ✅ 已补（smoke L1301/L1308），且构造验证 fail-closed（见 §二） |
| **P2-2 几何脚本接 CI** | ✅ `scripts/verify-visual-geometry.mjs` 增 `--strict`/`CI` 严格模式（缺 Edge ⇒ **exit 1**，L94-99）；`.github/workflows/ci.yml` windows job `install-ps-parse` 增步 `node scripts/verify-visual-geometry.mjs --strict`（checkout 后、无 continue-on-error）⇒ CI 真跑；本地仍 exit 3 跳过并在 README L173-174 注明 |
| **P2-3 迁移表披露** | ✅ §8 R-7 披露：数据表 **13→13.5**（`--nv-fs-card`，设计文档 L214 与契约 revisions 同步订正）、`.nv-dcard-title` 13.5、`.nv-stage-pill` 13.5、rail 状态文字保持可见；三方文本一致 |
| **P2-4 重复 CSS 清理** | ✅ 4 类选择器各 1 次；旧 accent-10% 选中底色串已删（L5138 仅留「已删除」注释）；新选中规则 `background:transparent;box-shadow:inset 2px 0 0 0 accent`；负断言防复活（见 §二） |
| **P2-5 契约 revisions 订正** | ✅ 改为「+138/−75（净 +63）」（与 `git diff --numstat` 一致）、「20 条行引用」（与 `git diff -U0` 的 20 增/20 减 `face:` 行一致）、「表格 13.5px」；anchor 76 段 / **FAIL 0 / WARN 25**（多出的 1 条 WARN = 3.5 空行起段，属**有意恢复**以维持 COMPAT-013 F3 golden=2，probe-face 28/28 通过） |
| **P3 杂项** | ✅ `compactCard` 死变量 **0**、`data-wf-status` 死属性 **0**、令牌名 `--nv-display-s` 误写 **0**（已改 `--nv-fs-display-s`）、重复注释已清；**未消费令牌断言改为排除 `:root` 定义行**（`outside` 计数，比 CR1 更严；当前 26 定义 / 0 未消费） |

## 四、残留（不阻塞提交）

1. **§8 R-1 的「机检断言」措辞与事实不符（P2，建议随提交订正）**：表中写「smoke P2 断言「chrow 字号令牌在位」」，但 smoke 的 P2 卫生检查只断言 `.nv-chrow{` **出现次数 = 1**，并未断言 `font:inherit;font-size:var(--nv-fs-base)`。实际守卫在 **geometry 脚本（CI，`chrowFont === '12px'`）**。修复二选一：①补一行 smoke 断言；②把 R-1 的断言列改为「geometry 脚本 chrowFont=12px（CI --strict）」。
2. **P3 `.nv-rail-status` 用 `--nv-fs-caption`(11px)**：设计文档 §2.2 写 caption「仅时间戳」；状态文字是信息面，11px 略小。若 DR 认为需要，可改 `--nv-fs-base`（一行）。
3. **P3 rail 同时存在 icon chip（`.nv-wfchip`）与状态文字**：视觉冗余但信息不冲突；属设计选择，可留待目检（G-5）判断。
4. **P3 rail 高度/窄列溢出未测**：geometry 只测 rail 宽 44、measure/edwrap 510、chrow 28+12px、cinput 32、p 1em、railStatus 非空；未测「rail 内容在矮中窗是否溢出」「竖排文字在宿字体栈下的字形」——纳入 G-5 目检项。

## 五、门禁真跑（本审查独立执行）
| 命令 | 结果 |
|---|---|
| `node --check lib/client.js lib/host-contract.mjs test/smoke.mjs scripts/verify-visual-geometry.mjs` | 全 exit 0 |
| `node test/smoke.mjs` | **313 passed, 0 failed**（README/A-F9 313 自洽） |
| `node test/validate-preset.mjs` | PRESET VALIDATION PASSED（schema-face PASS） |
| `node test/fixtures/host-surfaces/probe-face.mjs` | **OK：28/28**（含 F3 golden 复核） |
| `node test/fixtures/host-surfaces/ci-mock-face.mjs` | OK：4/4 |
| `node scripts/verify-contract-anchors.mjs` | 76 段 / **FAIL 0** / WARN 25（多出的 3.5 已解释） |
| `node scripts/verify-contrast.mjs` | `FG_MUTED_ROWS=4 V3_BELOW_4.5=0` |
| `node scripts/verify-visual-geometry.mjs --strict` | **OK**：rail 44 / measure 510 / edwrap 510 / chrow 28+12px / cinput 32 / para 1em / rail-status visible（exit 0） |
| 附加：headless 独立复测（我的 harness，规则从源码抽取） | chrowFont **12px** · chrow 高 28 · p margin **15/15px** · railStatus **运行中** · rail 宽 44 |

## 六、待验证（不得视为通过）
- G-5 真机目检：明/暗/合成主题 × 4 视图 × 七态（含 rail 竖排文字、44px 容器内按钮排布、阅读宽度节奏、书脊线、13.5px 数据表观感）。
- 0.1.x 宿主降级；窄中窗（< 400px）下 rail 内容是否溢出；rail 状态文字与 icon 双呈现的可读性。
- CI windows runner 上 geometry 步的实际首跑（本地已验证脚本；CI 首次执行需观察 Edge 可用性与 `node` 步骤顺序）。

## 七、结论
`APPROVED_WITH_NOTES / unresolved_blockers=0` —— **阶段 2 可提交**。条件：
1. 提交说明保留限定语（G-5 目检未做、0.1.x 未验证、rail 溢出/双呈现待目检）；
2. §四-1 的 R-1 措辞订正建议随提交完成（或补一行 smoke 断言）；
3. 若 DR 对 rail 状态字号/双呈现有新意见，可按 P3 起 1b-3/阶段 3 小批处理。
