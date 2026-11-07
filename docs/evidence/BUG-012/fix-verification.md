# BUG-012 阶段 B：修复验证（0.2.2-rc.1 隔离探针真跑）

- 采集：2026-11-07 20:03–20:09（探针 `dsh --profile probe --no-open --port 3080`，DSH_HOME=`%TEMP%\dsh-O6knv8\dsh-compat-probe`，token 已脱敏；Playwright Chromium 无头 1440×900）
- 被验代码 = 工作树修复版：探针 profile 的 `node_modules\dsh-novel-writing` 为指向本仓库的 **Junction**，其 `lib/client.js` SHA-256 与工作树逐字节一致（即修复版本体在服务，非打包副本）

## 结论一句话

**修复后用户真症状路径（API 建书 → 点书卡 → 分栏工作台）全绿：`.nv-split` 挂载、会话自动创建提示在册、console 0 错误——阶段 A 同路径复现的 `Minified React error #310` 与 `slot entry crashed in 'shell.overlay'` 均未出现。**

## 首跑门处置（如实记录）

本轮遮罩形态与阶段 A 不同：**不是** platform.deepseek.com 登录 iframe，而是宿主首次引导对话框「开始使用」（`[role=dialog][aria-label="开始使用"]` + `_mask_14mp3_*` 遮罩、`J8V0KW_close` 关闭钮带 `data-dsh-automatic-focus`）。诊断脚本 10 轮 × 10s 取样：100s 不自退；整页 reload 后仍在。处置 = 点击对话框**自带关闭钮**（`aria-label="关闭"`——最小干预，零设置变更），遮罩即消失，后续点击全部送达。
附注（如实披露）：截图的视觉二次核验本轮不可用——视觉路由 agent 鉴权过期（两次调用均 `PI_AI_ERROR: authentication token has expired`）；截图内容以下表 DOM 断言读数背书（定位器计数 + 文本内容 + console 捕获同脚本同轮取得）。

## 步骤与读数

| 步骤 | 读数 | 判定 |
|---|---|---|
| 打开 `/?token=<redacted>` | 遮罩处置后 `.nv-drawer-head` 可点（抽屉基线在位） | ✅ |
| ① 点抽屉头 | `.nv-console`=1、`.nv-home`=1、`[data-shell-overlay]`=1 | ✅（截图 `phaseB-console-mounted.png`） |
| ② API `novel-create` `{name:"BUG012阶段B验证书"}` | HTTP 200，返回 `{id:"BUG012阶段B验证书", title, state, path}` | ✅ |
| ② 点该书书卡（`.nv-drawer .nv-card`） | 抽屉提示行 =「已为《BUG012阶段B验证书》创建并关联新会话。」（会话自动创建绑定链在位） | ✅ |
| ② 分栏挂载 | **`.nv-split`=1**（阶段 A 修复前同路径 = 0） | ✅（截图 `phaseB-split-mounted.png`） |
| ② console 汇总 | **error 0 条 / pageerror 0 条**；`Minified React error #310` 0 命中；`slot entry crashed` 0 命中 | ✅ |

对照（阶段 A，修复前，同路径同探针）：`.nv-split`=0，console error `Minified React error #310`，宿主打印 `slot entry crashed in 'shell.overlay'`，SlotErrorBoundary 卸载 novel-split entry（见 [0.2.2-surface-facts.md](0.2.2-surface-facts.md) §2 末行）。

## 门禁（全绿，2026-11-07 本轮实测）

| 命令 | 读数 |
|---|---|
| `node --check lib/client.js`（另核 host-contract.mjs / smoke.mjs） | 0 错 |
| `node test/smoke.mjs` | **336 passed, 0 failed**（新增 BUG-012 Rules-of-Hooks 静态守卫 2 断言：含 hook 函数 23 个全扫 0 违规 + 负例判别力对照；README 计数 334→336 同步） |
| `node test/validate-preset.mjs` | PRESET VALIDATION PASSED（schema-face: PASS），exit 0 |
| `node scripts/verify-contract-anchors.mjs` | 79 段，**FAIL = 0**（2.3/3.4 等重基后；R1 返工后复跑同值，见下方追加段） |

## R1 返工追加（BUG-012-R1 F1/F2，2026-11-07 20:25–20:40）

- **F1 守卫块状早退盲区（修复）**：块头分类改「末行判据」（head 末非空行匹配控制关键字即 block；跨行条件括号回扫）+「块内直层裸 return」内容兜底（回调/方法/函数头三排除门不翻判）。原型校准矩阵 8/8：无块/块状最小违规必检出（含 Reviewer 微测 A 形态〔无分号前置〕与 D 形态〔`}, [deps])` 回调闭合前置〕）、回调内块状 return / 对象方法内 return 零误报、跨行条件与 try 块早退必检出、修复回退（无块版 + 块状版）均检出 SplitWorkspace/WorkspaceDialog。
- **F1 实战产出（重要）**：新判据在真实源码上揪出 **ChapterPanel 预存在同类违规**（空章早退 `if (novel.chapters.length === 0) { return el(…) }` 在 `useRef` 之前——chapters 0→N 翻转即 React #310；阶段 A 无块形态审计与旧扫描器双漏检）。已修：`listRef` 上提至早退之前（净 +2），修复后全文件守卫读数回归 **0 违规 / 23 hook 函数 / 配平 0**。
- **自变异验证（受控，验后还原）**：块状违规临时注入 `lib/client.js`（`launchWfRef` 前置块状早退）→ `node --check` 仍过、`smoke` exit 1 且守卫精确报 `SplitWorkspace earlyReturnLine:4688 → hookLine:4690`（4 failed 含级联）→ 备份还原 **SHA-256 逐字节一致** → smoke 复绿 336/0。
- **F2 行数账（订正）**：revisions 行数改**换行符计数口径**（文件均 LF 结尾）：HEAD 6092 / 本批终态 6109（净 +17 = 修复 +15 + ChapterPanel 上提 +2）；此前 6093→6108 系 split 计数幻影行。历史注记：UX-063③ 记 6068→6090，该 commit（81a2e11，此后无 commit 触碰 client.js）实测 6067→6092——±1~2 残差属当时人工记账误差，历史条目不重写，口径注记入 BUG-012 revision。
- **契约二次重基**：ChapterPanel 上提点（新 L2227-2230）之上区段 Δ0、之下 +2——3.8（L3420-L3431）、3.6②（L3829-L3845）、3.3⑤（L5157-L5169）、3.4 三段（L5473-L5485 / L5479-L5480 / L5519-L5523）、2.3（L5971）、2.12（L6001-L6008）、2.13（L6038-L6070），9/9 整段唯一精确匹配取证；`verify-contract-anchors` 79 段 FAIL=0。
- **门禁复跑（返工后）**：`node --check` 三文件 0 错；`smoke` **336 passed / 0 failed**；`validate-preset` PASSED（schema-face: PASS）；`verify-contract-anchors` 79 段 FAIL=0。

## 收尾纪律

仅杀自启进程树：`taskkill /T /F` 于 PID 30068（本轮 20:03:35 Start-Process 起的 dsh.cmd）及其子进程 32548/33384；3080 端口释放确认；StartTime 早于本轮开工的任何进程零触碰。

## 文件

| 文件 | 内容 |
|---|---|
| `phaseB-console-mounted.png` | 断言①：点抽屉头后控制台浮层 + 首页挂载 |
| `phaseB-split-mounted.png` | 断言②：点书卡后分栏工作台挂载（用户真症状路径的修复证明） |
| `%TEMP%\dsh-O6knv8\bug012-verify.mjs` / `bug012-diag-mask.mjs` | 复现脚本（一次性，未入库；读数 JSON 同目录 `bug012-verify-report.json`） |
