# COMPAT-018 R2 delta 复审报告（R1 F1/F2 返工确认）

- 日期：2026-11-08 · 审查角色：Reviewer（独立会话，同 R1）· 被审 HEAD：6758391（工作树未提交）
- 被审物：`scripts/probe-host.mjs` 返工增量（相对 R1 审查态：`hostSpawn` 去 `/s` + `assertHostCmdSafe` 新增 + 注释/证据同步改写）+ `docs/evidence/COMPAT-018/probe-host-real-run.md` §1 改写与 §7 返工记录
- 范围：仅 F1/F2 返工；R1 F3（L1 row-2 真空通过）与两缺口（host-surfaces fixtures 0.1.x-only / CI mock 面对齐）已立项 CLEAN-015，不在本轮
- 审查方式：diff/代码全读 + **微测 4 例全部独立重建复现**（自建 fake host，端口 3217/3218/3220 避开既有取证）+ 真宿主 0.2.2-rc.1 独立快跑（port 3219）+ 三轮 JSON 零差集对拍 + 门禁四项独立复跑
- 约束遵守：零产品码改动（微测全部落 `%TEMP%\c018r2*` 自建临时目录）；零 `.governance/` 写入；零 commit；未跑 review-record

## 结论

**APPROVED** — 新增 P0 = 0 · P1 = 0 · P2 = 0 · P3 = 0；**R1 F1/F2 关闭确认**。

核心判定：两处返工均按裁选方案落地且实证有效——F1 去 `/s` 后空格路径端到端打通（本会话独立复现：spawn + liveness + 诚实 L1 判，无 `'…\my' is not recognized`）；F2 代码强制在 tmpRoot/staging/spawn 之前精确拒绝（exit 2 + canary 零执行 + 零副作用）；真宿主快跑与首轮**逐项零差集**（开发者 r1 与本会话 r2 双重复核）；门禁全绿。开发者微测声明 (a)(b)(c) 全部独立复现一致，且本会话加测的括号路径变体也通过。

## 1. 门禁复跑读数（本会话独立真跑；Coordinator 复跑全绿声明同时得到印证）

| 门禁 | 复审读数 | 开发报告声明（§7） | 判定 |
|---|---|---|---|
| `node --check scripts/probe-host.mjs` | exit 0（0 错） | OK | ✅ |
| `node scripts/probe-host.mjs --self-check` | **6/6 层通过**，exit 0 | 6/6，exit 0 | ✅ |
| `node test/smoke.mjs` | **SMOKE DONE: 342 passed, 0 failed**，exit 0 | 342/0 | ✅ |
| `node scripts/verify-contract-anchors.mjs` | 79 段，**FAIL = 0**，WARN = 24，exit 0 | 79/0/24 | ✅ |

## 2. 返工逐项判定

### 2.1 F1：ComSpec 包装去 `/s`（L268-278 + 注释 L253-267）

- **代码核**：win32 `.cmd/.bat` 分支现为 `spawn(ComSpec ?? 'cmd.exe', ['/d','/c', file, ...args])`——`/s` 已移除、`/d` 保留；`.js→execPath` 与默认直跑分支未动；注释改写为「**不用 `/s`**」并说明 libuv 单对引号与 `/s` 剥引号的冲突机理（引用 R1 T1 实证）——与 R1 F1 修复建议一致。证据 §1（L15-16）同步改写，无陈旧 `/s` 论述残留。
- **微测 (a) 独立复现**（自建 fake host：cmd 起节点 HTTP 服务，`/`→401、其余→404；路径 `…\c018r2\fake dir\my fake host.cmd`，port 3217）：宿主正常 spawn（pid 打印）→ liveness 达成 → **诚实 L1 判**（`未取得可解析载荷（status=404）`❌ + L2 unavailable❌ + L4/5/6✅）→ exit 1 → 端口 3217 回收 NONE。全程无 `'…\my' is not recognized`——开发者声明 (a) 逐项复现 ✅。
- **加测 (a2) 空格+括号路径**（`…\fake dir (x86)\my host.cmd`，port 3218）：**实测同样正常工作**（host.log = `fake host on 3218`、liveness 达成、诚实 L1 判、exit 1、端口回收）——`Program Files (x86)` 形态路径经现行包装可执行，注释中「括号仅影响 cmd 引号保留启发式、失败形态为响亮报错」的最坏情形兜底表述保守但无害（实测未触发失败）。
- **回归 (c)**：见 §2.3——真宿主 `.cmd`（无空格路径）经 `/d /c` 包装照常启动，读数与首轮零差集。

### 2.2 F2：`assertHostCmdSafe` 代码强制（L283-289，调用点 L359）

- **代码核**：win32-only（非 win32 直接返回）；仅 `.cmd`/`.bat` 后缀形态；字符集 **`"&|<>^%`**（与声明七字符逐一吻合）；`die`（exit 2）报文逐字符列名违规字符并注明「空格/括号允许」。调用点 = realRun L359，位于 `mkdtempSync`（L362）/`printPlan`（L374）/staging（L378）/主 spawn（L381）**全部之前**——拒绝时零文件系统副作用。
- **微测 (b) 独立复现**（真实文件 `…\c018r2\bad&name.cmd`，内含写 canary 载荷；port 3220）：**exit 2**；stderr 报文 `hostCmd（.cmd/.bat）含 cmd 元字符 '&' ——经 cmd.exe 包装执行会被拆分/展开（注入面），拒绝执行（空格/括号允许）`（与证据 §7 (b) 声明同形）；输出仅两行 REAL-RUN 头注即终止（隔离方案未打印 = 拒绝先于一切写面）；**canary 未产生**（零误执行）✅。
- 覆盖面：显式 `--host-cmd` 与 PATH 解析两种来源均经同一 hostCmd 值收口；staging 第一段的 hostSpawn 同受此门保护。

### 2.3 (c) 0.2.2-rc.1 快跑对拍（开发者 r1 + 本会话 r2 双重复核）

本会话独立快跑（port 3219，`--stage-plugin`，无 `--keep`）：staging 两段全绿（物化 liveness 404 → junction → deps → **bundles 追加保留既有 2 项**）→ 面工 1 载荷 11 项全在 → **唯一红 = L2 browser-unavailable** → exit 1 → 端口 3219 回收 NONE。JSON 三轮对拍（首轮 base = 返工前取证 / 开发者 r1 / 本会话 r2）：

| 读数 | base | 开发者 r1 | 本会话 r2 |
|---|---|---|---|
| port / live / stagePlugin | 3211 / 401 / true | 3211 / 401 / true | 3219 / 401 / true |
| verdict | L2（浏览器层） | 同 | 同 |
| server.ok / scope / host | true / 11·9·2 / {null, tp4-unprobed} | 同 | 同 |
| probes（11 项 × item/ok/mode/service/method/code） | — | **vs base：DIFF = NONE** | **vs base：DIFF = NONE** |
| rows 层面 | — | — | **vs base：DIFF = NONE** |
| notOk（人工读数） | 1.4 retired / 1.11 oobs（ok:null） | 同 | 同（实测复核） |
| token 泄漏 | 无 | 无 | 无（唯一 "token" 命中 = 契约 kind `css-token`） |

开发者声明 (c)「与 §3.1 Run 1 完全一致」成立；返工对真宿主读数**零扰动**。

### 2.4 裁量点

1. **去 `/s` 后其余引号场景的边界 = closed（现行调用形态下）**：`hostSpawn` 的 args 仅由固定字面量（`'web'`/`'--port'`/`'--no-open'`）+ `String(Number(port))` / `String(Number(timeoutSec))` 构成——`parseArgs` 对 `--port`/`--timeout` 先经 `Number()` 强转，任意自由字符串无法进入 spawn 参数（最坏退化为 `'NaN'`，不含引号/元字符）；`--host-cmd`/`--json-out` 不进 spawn 参数面。注释已如实把转义边界限定为「固定子参数 + 内部数字」；若未来新增携带自由文本的子参数，`/c` 尾部需重新审计（注释的边界声明即是该契约的守卫）。**判定：边界闭合，无需进一步改动。**
2. **`%` 拒绝对 `%TEMP%` 风格路径零误伤**：shell 调用时 `$env:TEMP`/`%TEMP%` 在进入 argv 前已展开——node 收到的是展开后的实际路径，不含 `%`。本会话全部微测与快跑的 hostCmd 均为 `%TEMP%` 派生路径，**零误拒**（(a)/(a2)/(c) 全部通过该门）。NTFS 上真实含 `%` 的路径（罕见）会被 exit 2 响亮拒绝——保守但 fail-loud，且与 cmd 变量展开风险一致；`.js`/`.exe` 形态不受此门约束（不经 cmd.exe 解析，设计自洽）。**判定：无误伤。**

## 3. Findings

无新增（P0 = 0 · P1 = 0 · P2 = 0 · P3 = 0）。R1 F1/F2 关闭；R1 F3 与两缺口已在 CLEAN-015 立项（`.governance/change-triage/CLEAN-015.json` 在场，本轮不审）。

## 4. 提交建议

**建议提交**（APPROVED）。R1 报告的提交条件 1（「probe-host 实跑面收尾」任务）中 F1/F2 部分已随本轮返工关闭，任务剩余面收敛为 F3（L1 row-2 键修正 + notOk 细分 + REAL-RUN 标记翻转配套）；条件 2（两缺口）维持 CLEAN-015。提交信息可引用：F1/F2 返工经 R2 独立微测复现（空格/括号路径 + 元字符拒绝 + 真宿主零差集快跑）。

复审全程零产品码改动（微测全部落 `%TEMP%\c018r2*` 与探针自建 `%TEMP%\nv-probe-host-*` 临时根，后者由探针自回收；`--keep` 留存的一份 host.log 已随核验后清理）；零 `.governance/` 写入；零 commit；未跑 review-record。
