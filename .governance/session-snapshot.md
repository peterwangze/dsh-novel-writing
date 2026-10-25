# 会话快照 — 2026-10-25（治理升级 0.99.0 + UX-063 第②步交付）

**session_date**: 2026-10-25
**工作流版本**: **0.99.0**（本轮由 0.98.0 升级；Scenario C A~E 完成）
**会话标识**: dsh-writing-workflow-20261025-ux063-p0a-step2
**HEAD**: `UX-063: P0-a 第②步交付（任务流首页 + 用户两条裁决落地）`
**上一会话**: 2026-10-23 第①步交付（EVD-139）后，第②步首个 Developer 子代理 3h 空转被中止、零代码落盘

## 一、本轮结论

### 1) 治理升级 0.98.0 → 0.99.0（EVD-140，commit `5400814`）
A 入口 bootstrap 段替换（`sync_entry_projection --write` → `[PASS] synchronized`）；B plan-tracker 9 节核验；C hooks 三件存活；C-2 `cleanup --dry-run` = 无冗余文件；D `工作流版本` → 0.99.0；E `archive --auto --dry-run` 跳过（已发布版本解析 0 < 2，RISK-002 同族上游缺陷，如实登记不迁移）。复核 = scenario F / migration up_to_date。

### 2) UX-063 P0-a 第②步：任务流首页（EVD-141，commit `370a100`）
- 默认入口 `.nv-home`；书卡网格降为「全部书籍」二级页（原代码保留）
- 四区：当前书卡 / 今天写什么（唯一主 CTA 36px）/ 待办三项（点击直达、无失败章置灰）/ 最近 5 章；紧凑换书（listbox，1 次点击）；字号只用 5 档令牌
- **用户 2026-10-25 两条裁决**：①「新建章」= 触发 AI 工作流生章（编辑面整体移除，零空章节文件路径）；②「继续写第 N 章」**所见即所得**（发送指令含第 N 章，N = max+1，与文案同源）
- **DEC-158**：动作口径**禁止用 `overview.totalChapters` 计数推章号**（计数 ≠ 最大章号，稀疏章节会推出已存在章号）⇒ detail 未就绪时 CTA/新建章**禁用** + 加载态/真空态分离 + 待办显示 `—`；`homeChapterTotal` 的 overview 回退**仅用于展示**
- 意图通道：`homeIntentSink` 同步投递 + `novelId` 绑定 + 跨书丢弃 + 失败清理（旧 `[snap.active, selectedId]` effect 退役）
- 门禁：`node --check` ×4 = 0；smoke **331/0**；geometry OK（home 880 / CTA 36 / u63 六档不回退）；anchors **79 段 FAIL=0**；contrast 0 项 <4.5；validate-preset PASSED；变异判别力 M1~M6 全红
- 审查链：`R8` DR1 NEEDS_CHANGE/1 + `R9` CR1 NEEDS_CHANGE/2 → 返工 → **`R10` DR2 / `R11` CR2 = APPROVED_WITH_NOTES/0**；微收口轮修契约 3.3 段端点（`L1576-L1585` / `L5123-L5135`）、行数账（**6067**）、死变量 `homeDataReady`、陈旧注释

## 二、跨会话待办（按优先级）

1. **UX-063 第③步（本任务最后一步）**：正文 `--nv-fs-reading` 16 / `line-height 1.9` + 中文排版（`p{text-indent:2em;margin:0 0 .8em}`）+ textarea 内联随 N-1(a) 统一 reading；迁移表 #15/#16 与既有 `measure 510→544` 断言。**首批并入 8 项遗留**：DR2（第②步）P2-4 detail 失败态无重试入口（最高优先）/ P2-5 禁用标签把「失败」说成「加载中」/ P2-1 有数据态渲染树断言 / P2-3 字数与章数两源标注；DR2（第①步）P2-1 <740 提示补 Esc / P3-1·P3-2 硬编码 11/23 补守卫 / P3-7 拖线与手柄 4px 热区；CR2（第①步）P2-1 `syncAnchor` 旧节点还原调用级断言。
2. **UX-062**（P1，user-named，分析器 top pick）——需与 UX-063 串行（共用 `lib/client.js`）。
3. **CLEAN-013**（P1，machine-signal）——隔离矩阵可审计化；RISK-013 缓解引用项。
4. **真机 CDP 通道**（归 COMPAT-018）：宿主 **0.2.1-rc.2** 闭包无 `dsh-app-boot` ⇒ 两个 CDP 探针 boot 即 `ERR_MODULE_NOT_FOUND`；UX-063 第①②步的**交互面均未经真机验证**，措辞必须保持「已交付（待真机复验）」，并排截图 ≥5 差异闸门留到第③步合并后。
5. 既有债：Check 30（UX-061/UX-063 复审轮从 R1 起编号、缺 R0——历史约定漂移；新任务首轮应从 R0 记）、Check 36（RISK-002/013 缓解引用未完成任务）、Check 37（G8 vs G6/G7，DEC-029 留痕）、Check 18e/18f/18g 对未交付任务的生命周期闸门（随交付翻绿）。

## 三、方法论事实（下轮直接复用，勿重踩）

- **`Measure-Object -Line` 不计空行** ⇒ 行数会偏小（本例 5841 vs 真实 6067）。行数口径统一用 `readFileSync(...).split('\n').length - 1`（与 git diff 行号一致），或 `(Get-Content -Encoding UTF8).Count`。
- **迁移表不要复制契约行号全表**：重复维护必然漂移（H5/I5 两行已实证过时）。权威源 = 契约 `items[].line` + `verify-contract-anchors.mjs`；迁移表只记「本轮抽核生效值」。
- **契约段端点必须落真实代码行**：起止落在空行或下一函数起始行会被 CR 判为越界（本轮 3.3 第 4/5 段即如此）。`3.6` 段 2 起点为空行属**既有**问题，待下轮改指 SplitWorkspace RO/MO 观测块 `L3796-L3824`。
- **断言禁止以源码字面量冻结实现**：`smoke:1396` 曾把缺陷写死（修缺陷必红）⇒ 已改「`#region` 提取 + 真跑纯函数用例」；纯函数测试须能证明「区段缺失/提取失败 ⇒ 红」。
- **意图/异步消费类改动必须验「默认路径」**：本轮 CR1 抓到「分栏已开且同书」时首页动作全静默（这正是默认路径），并会残留意图跨书误触发。
- 变异测试一律 `%TEMP%` 副本；就地变异必须 sha256 还原并复跑门禁。
