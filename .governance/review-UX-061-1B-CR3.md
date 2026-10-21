# REVIEW-UX-061-1B-CR3 — UX-061 阶段 1b 窄口径收口复审（P0-1/P1-1/P2 三项 + 事故恢复完整性）

```
REVIEW-UX-061-1B-CR3 APPROVED_WITH_NOTES / unresolved_blockers=0
```

- 审查对象：工作区未提交改动 vs HEAD `ac3aeff`（`lib/client.js` 69/59、`lib/host-contract.mjs` 4/3、`test/smoke.mjs` 17/11、`docs/verification/UX-061-assertion-migration.md`、`scripts/verify-contrast.mjs`）
- 审查日期：2026-10-21
- **结论：可提交**（P0=0/P1=0；残留均为文档一致性与可选增强，见 §五）
- 本审查独立执行全部门禁并做了两项构造式验证（CSS 真值求值、守卫负例注入），未修改任何产品文件。

---

## 一、P0-1（TYPO 拼 `'px'`）→ 已闭环（我做了真值求值）

- 静态核对：`TYPO.<x> + 'px'`（单引号闭合 / `'px;` 两形态） = **0**；模板 `${TYPO.x}px` = **0**；`TYPO.<x> + "px"`（双引号）= **0**。
- **动态求值**：我抽取源码中 `TYPO` 对象字面量 + `NV_STYLE` 数组字面量，在 Node 内 `new Function` 求值出**真实 CSS 串**（35,630 字节），结果：
  - `--nv-fs-*)px` 残留 = **0**；
  - `font-size:` 声明 **60 条**，非法值（含 `var(--nv-fs-*)px` 或 `)px` 结尾）= **0**；
  - 其中 **11 条**为 `var(--nv-fs-*)` 令牌形态（10 条 CSS 规则 + `.nv-wfchip`）。
- 内联 3 处（章节标题 L1968 / 正文 textarea L2013 / 统计数字 L4390）+ 数据面板标题 L2173 均为 `fontSize: TYPO.x`（不带 px）⇒ 合法（CSS var 在内联样式中可解析）。
- 结论：**P0 真闭环**。这批改动后字阶由 `:root` 令牌单点驱动，不再有 `var(...)px` 失效值。

## 二、P1-1（守卫盲区）→ 已补，逻辑构造验证成立

- 断言在位（`test/smoke.mjs:1284-1286`）：
  - 负断言 `!/TYPO\.[A-Za-z]+\s*\+\s*'px/.test(clientSrc)`；
  - 正断言 `/font-size:' \+ TYPO\./`（CSS 内 font-size 走 TYPO 单源）；
  - 断言数不变（308），未新增 check。
- **我的构造验证**（不改产品文件，在内存注入故障后求值该负断言）：
  - 干净源：negative = true（通过）；
  - 注入 `font-size:' + TYPO.meta + 'px;` ⇒ negative = **false**（断言必红）✓；
  - 注入 `fontSize: TYPO.chapter + 'px'` ⇒ negative = **false** ✓。
- **覆盖缺口（不阻塞）**：双引号形态 `TYPO.x + "px"` 与模板字面量 `${TYPO.x}px` 不被该正则覆盖；当前源码中两种形态均为 **0** 处（仓库风格为单引号）。可选 1 行增强：`/TYPO\.[A-Za-z]+\s*\+\s*['"]px/` 并另加 `/[\$\{]TYPO\.[A-Za-z]+\}px/`；建议并入 1b-2，不必本轮阻塞。

## 三、P2 三项核验

| # | 声称 | 我的实测 | 判定 |
|---|---|---|---|
| 1 | `.nv-cdot[data-bound=*]` color 回退状态原令牌 | L5037-5047：idle `--nv-fg` / busy `--nv-accent` / need `--nv-warn` / done `--nv-ok` / **stale `--nv-err`**（均非 `-text`） | ✅ 真闭环（非文本不再用文本档） |
| 2 | 双声明改方案 B：删死声明、17 处消费统一无兜底 | `:root` 仅 3 条 `color-mix(...,58%,fg)` 声明，无 `var(--nv-fg)` 首声明；消费点 `var(--nv-*-text)` = **17**、带 `,var(--nv-fg)` 兜底 = **0**；`scripts/verify-contrast.mjs` 18 组 / BELOW_4.5=0（我复跑） | ✅ 技术自洽（B 方案：不支持时 `color` invalid-at-computed-value ⇒ 继承父色，已在 §5.4 如实披露）。`@supports` 非必需；若要「优雅降级」可并入 1b-2（不阻塞） |
| 3 | `.nv-wfchip[data-tone=ok]` 死规则移除（等行数注释防锚点漂移） | L5083 已替换为注释「data-tone=ok 无消费者，死规则已移除（行数不变…）」；`client.js` 行数仍 **5327**；wfchip 消费面 = muted/running/err 3 档 | ✅ 真闭环 |
| 4 | 迁移表 §4 / §5.3 / §5.2 与实现一致 | §5.2 已改「已核实（CR2 结论）…单值静态 alias」✅；§5.3 已改「15 站点/18 次引用」✅；**§4 仍有问题**：数据面板标题行状态已改「已完成」，但同行「原因」列仍写旧的「未找到独立规则…建议 1b-2/UX-062」；「24 个尺度令牌仅启用 5 个」已过期（见 §五-2） | ⚠️ 部分（见 §五，文档一致性，非代码问题） |

## 四、事故恢复完整性（本轮唯一完整性风险点）→ 无静默丢失

Developer 披露：`node -e` 误用 `fs.writeFileSync(path,'utf8')` 把 `lib/host-contract.mjs` 截断为 4 字节，随后 `git checkout --` 回 HEAD 并重建本轮契约改动。我的独立验证：

1. **改动形状一致**：当前 `git diff lib/host-contract.mjs` = **3 个 hunk / +4 行 / −3 行**，与 CR2 审查时（事故前）记录的 diff 形状**完全一致**（1 个 `revisions[]` 新增条目 + 2.3 行号 + 2.12/2.13 行号两行改写）⇒ 1b 应有的契约改动全部在位，无静默丢失。
2. **关键结构完好**：`cssTokens` = **15**；`revisions` 总数 **14**，其中 `task: 'UX-061'` 恰 **2 条**（1a + 1b，1a 条目未夹带 1b）；`node --check` 通过；anchor 脚本 **76 段 / FAIL 0**。
3. **1b 条目文字无夸大**：已改为「单一 `color-mix(state 58%, fg)`，不支持时继承父色」「P0：13 处 `+ px` 清零…smoke 增负/正断言 + 构造证明」「stalled 3 档」「净 +10 行」——逐项与实测一致；**旧的「双声明降级」表述已不存在于该条目**。
4. **无连带损伤**：`git status` 仅 3 个产品文件被修改（client.js / host-contract.mjs / smoke.mjs），`lib/index.js`、`lib/host-boundary.js`、`package.json`、`cordis.patch.yml` 均未变更；无 0 字节/截断文件特征。

**结论：重建完整，可信任；RISK-014（误写事件）应保持登记并在提交说明中保留一句事实披露。**

## 五、残留（不阻塞提交，需处置）

1. **迁移表 §5.1 与 §5.4 自相矛盾**：§5.1 标题与正文仍把「双声明 + 安全兜底」写成现行机制，而 §5.4 已裁「删死声明、选 B、继承父色」且代码只保留单声明。修复：给 §5.1 加「（本小节为修订痕迹，现行机制见 §5.4）」标记，或改写正文。**这是设计裁决材料，DR2 会读，建议提交前顺手订正。**
2. **迁移表 §4 两处过期**：①数据面板标题行「原因」列仍是「未找到独立规则/建议 1b-2」；②「24 个尺度令牌仅启用 5 个」已过期——实测：**定义 26 个**（新增 fs-chapter/fs-stat），**有真实消费者 13 个**（fs×8：base/card/body/display/display-s/hero/chapter/stat；sp×2；r×1(r-xl)；lh×2），**未启用 13 个**（fs-caption、sp-3~7、r-sm/md/lg/pill、lh-normal、ctl-sm/md）。建议同步为「26 定义 / 13 启用 / 13 未启用；`--nv-ctl-*` 仍 0（V-1）」。这会影响 Design 对「尺度收敛是否达成」的判断。
3. **守卫可选增强**（同 §二）：双引号 / 模板字面量形态并入 1b-2。
4. **`--nv-ctl-*` 仍 0 消费者**（V-1 已披露）：需 Coordinator 明确「接受 1b 部分交付 + 1b-2 承接」的口径；提交说明应保留限定语（A 迭代未完成、部分令牌未启用、浏览器目检未验证）。
5. **浏览器目检与真实取色未做**：仍为 `待验证`；0.1.x 宿主 `-text` 缺失时的继承父色行为亦未验证。

## 六、门禁真跑（本审查独立执行）
| 命令 | 结果 |
|---|---|
| `node --check lib/client.js lib/host-contract.mjs test/smoke.mjs scripts/verify-contrast.mjs` | 全 exit 0 |
| `node test/smoke.mjs` | **SMOKE DONE: 308 passed, 0 failed** |
| `node test/validate-preset.mjs` | PRESET VALIDATION PASSED（schema-face: PASS） |
| `node test/fixtures/host-surfaces/probe-face.mjs` | **OK：28/28** |
| `node test/fixtures/host-surfaces/ci-mock-face.mjs` | OK：4/4 |
| `node scripts/verify-contract-anchors.mjs` | 76 段 / **FAIL 0** / WARN 24 |
| `node scripts/verify-contrast.mjs` | 18 组 / **BELOW_4.5=0** |
| 附加：`NV_STYLE` 真值求值 | 60 条 font-size / **非法 0** / 令牌 11 条 |
| 附加：守卫负例注入（内存） | 两种故障形态均使负断言转 false |

## 七、结论
`APPROVED_WITH_NOTES / unresolved_blockers=0` —— **1b 可提交**，条件：
1. 提交说明保留限定语（仅 1b 视觉批次、A 迭代未完成、13 个尺度令牌未启用、`--nv-ctl-*` 0 消费者、浏览器目检未验证、M-1~M-4 待 DR2 裁决）；
2. 迁移表 §5.1/§4 两处订正（可在提交前顺手完成，不要求再审）；
3. RISK-014（误写截断）事实在提交说明中保留一句披露；
4. 1b-2 承接：V-1/V-2/V-3、守卫形态增强（双引号/模板）、`@supports` 优雅降级（可选）。
