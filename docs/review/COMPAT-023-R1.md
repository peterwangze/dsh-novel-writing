# COMPAT-023 R1 全量复审报告（全依赖面看护）

- 日期：2026-11-07 · 审查角色：Reviewer（独立会话）· 被审 HEAD：d955c93（工作树未提交）
- 被审物：`docs/evidence/COMPAT-023/implementation.md` + 全部变更文件（见 §1）
- 审查方式：全部命令真跑 + 变异测试（逐字节还原，SHA-256 证明）+ npm tarball 独立对拍 + 探针真跑
- 约束遵守：零产品码残留改动（唯一变异已还原，见 §2.5）；零 `.governance/` 写入；零 commit；未跑 review-record

## 结论

**APPROVED_WITH_NOTES** — P0 = 0 · P1 = 0 · P2 = 3

核心判定：证据真实（10 格抽查全对上，2 包 npm pack 对拍行号级吻合）；fail-closed 三态语义全部独立复现；门禁全绿；五条设计偏差全部成立且如实披露；**C5 裁决 = A（判据过时，非产品回归）**，需另立探针判据刷新任务（F1），不阻塞本交付。

## 1. 门禁复跑读数（全部真跑，独立复现）

| 门禁 | 复审读数 | 开发报告声明 | 判定 |
|---|---|---|---|
| `node --check` × 8（全部改动 js/mjs） | failures=0 | 0 错 | ✅ |
| `node test/smoke.mjs` | **342 passed, 0 failed**（exit 0） | 342/0 | ✅ |
| `node test/preflight-preset-rows.test.mjs` | **PASSED (16)**（①-⑤ 12 + ⑥ 组 4） | 16 | ✅ |
| `node test/validate-preset.mjs` | PASSED（schema-face: PASS） | PASS | ✅ |
| `node scripts/verify-contract-anchors.mjs` | 共 79 段；**FAIL = 0**；WARN = 24 | 79/0/24 | ✅ |
| `node scripts/preflight-preset-rows.mjs --surfaces` | exit 0；30 格 = 24 PASS + 6 WARN + 0 SKIP + 0 FAIL | 同 | ✅ |
| `node scripts/probe-nv-ux012.mjs --falsifiability` | RUNTIME-LEDGER 10/10 PASS（27 ≡ 27）；CLASSIFICATION PASS；exit 0 | 27 条断言 | ✅ |
| `node scripts/probe-nv-bar-geometry.mjs`（真跑） | 7/8 绿，C5 红（exit 1）——读数与裁决见 §3 | 7/8 | ✅（复现一致） |

## 2. 逐项判定

### 2.1 证据真实性抽查（核心项）——抽 10 格，覆盖六面，全部对上

| 格（代际×面） | 声明 | 独立核验 | 判定 |
|---|---|---|---|
| decl-0.2.2 × 面1 (verified) | 8 包 keyExports + 断面（cordis 4.1.0/schemastery 3.19.0/dsh-tools 含 ToolsService） | 证据文件逐项对上：dsh-settings exports 含 SettingsForms 无 SettingsProvider；SettingsProvider 断面 0 命中、sessions.open 0 命中、retainedBy 命中（dsh-client-ui-layout lib/client.js L61） | ✅ |
| decl-0.2.2 × 面2 (verified) | shell.overlay 双注册（object-key + key-field）+ renderSlot/inject 消费 | 证据条目：ui-layout object-key@L725、runner key-field@L5948、renderSlot@L346、injectDoc×2、entryName×4（runner + workspace）；**npm pack 独立对拍**（§2.2）行号级吻合 | ✅ |
| decl-0.2.2 × 面3 (verified) | data-shell-overlay / data-slot 消费包 | 证据：overlayContainer@L403（ui-layout）；slotHost 含 renderer + workspace 两包；tarball 对拍 L403 吻合 | ✅ |
| legacy-0.1 × 面1 (verified) | SettingsProvider 在场/SettingsForms 缺席；sessions.open 在场/retainedBy·mainSessionId 缺席；cordis 4.0.2/schemastery 3.18.2 | 证据文件全部对上；**npm pack 对拍** @deepseek-ai/dsh-settings@0.1.5-rc.2：lib/index.js SettingsProvider×2、SettingsForms×0（§2.2） | ✅ |
| legacy-0.1 × 面3 (verified) | slotHost 消费包仅 renderer | 证据：slotHost 命中仅 dsh-client-ui-renderer（0.2.2 增 workspace 的代际差与声明一致）；shell.overlay 注册 object-key@L540 + key-field@L3948 | ✅ |
| legacy-0.1 × 面4 (fixture-record) | install.ps1/install.sh 含 `dsh.profile.bundles`/`HostGeneration`/`host-generation`/`.agent-presets`/`insert` | 逐字面量 grep 复核：ps1 3/10/10/8/43 hits、sh 5/0(kebab 命中 L27/L44)/7/6/20 hits——manifest 按文件分别登记 `HostGeneration`(ps1)/`host-generation`(sh)，口径正确 | ✅ |
| decl-0.2.0 × 面4 (fixture-record) | 同上（0.2.x 分支三锚点） | 同上复核 | ✅ |
| legacy-0.1 × 面5 (fixture-record) | agent.cordis.yml 含 `tool-subagent-list-agents` | 1 hit | ✅ |
| decl-0.2.x × 面5 (fixture-record) | cordis.patch.yml 含 `preset-novel-writing` + `@deepseek-ai/dsh-agent-preset` | 2/2 hits | ✅ |
| decl-0.2.1 × 面6 (fixture-record) | detectGeneration(0.2.1-rc.2, true) = decl-0.2.1 | preflight 真跑执行（面6 PASS ×4 代，含 hostVersion ≡ representativeVersion 口径检查） | ✅ |

「0.1.x 以 0.1.5-rc.2 为代表」口径核验：manifest `representativeVersion: '0.1.5-rc.2'` 字段 + 面1 note「0.1.5-rc.2 tarball 实测」+ `GENERATIONS['legacy-0.1'].label`「完整支持实测至 0.1.5-rc.2」+ implementation.md §6.5 + README/COMPATIBILITY §6 矩阵行（含 cordis 4.0.2/schemastery 3.18.2 按依赖钉解析注记）——口径如实声明。✅

### 2.2 npm pack 只读对拍（2 包，零 install/零执行）

```
npm pack @deepseek-ai/dsh-client-ui-layout@0.2.2-rc.1 / @deepseek-ai/dsh-settings@0.1.5-rc.2 --pack-destination %TEMP%\c023r1
```
- ui-layout 0.2.2-rc.1 `lib/client.js`（38,872 B）：**L725 = `"shell.overlay": {`**（object-key 注册）、**L346 = `renderSlot("shell.overlay", {})`**、**L403 = `"data-shell-overlay": true,`**——与证据文件记录的三个行号逐条吻合（manifest note「ui-layout 注册 L725 / renderSlot L346」实测成立）。
- dsh-settings 0.1.5-rc.2 `lib/index.js`：SettingsProvider 2 hits / **SettingsForms 0 hits**——BUG-011 断面（0.1.x SettingsProvider ↔ 0.2.x SettingsForms）独立复现。

### 2.3 fail-closed 三态语义（独立真跑）

| 场景 | 命令读数（复审独立构造） | 判定 |
|---|---|---|
| pristine | exit 0；`{total:30, pass:24, warn:6, skip:0, fail:0}`；WARN 全部 = unknown 代（SURFACE_UNKNOWN 带 reason） | ✅ 与声明一致 |
| 缓存缺面（空证据根） | exit 0；12 SKIP（全部 `SURFACE_EVIDENCE_CACHE_MISSING` × 4 代 × 面1-3）+ 12 PASS（面4-6 fixture-record）+ 6 WARN；`--strict` ⇒ exit 1 且 STRICT_SURFACE_SKIP + STRICT_SURFACE_UNKNOWN 双码 | ✅ SKIP ≠ PASS 语义成立 |
| 篡改（副本抹 decl-0.2.2 shell.overlay） | **exit 1**；恰 1 FAIL：`SURFACE_EVIDENCE_MISMATCH [decl-0.2.2 面2] 槽 shell.overlay 无证据条目`；summary `{pass:23, warn:6, fail:1}`（其余 29 格不受污染） | ✅ 报文指向正确格 |
| pristine --strict | exit 1（6 WARN 升红） | ✅ |
| 用法面 | `--surfaces --fixture <dir>` ⇒ exit 2；`--surfaces-evidence-root <不存在目录>` ⇒ exit 2 | ✅ |

（首次两处 exit 读数受 PowerShell 管道伪影干扰，已用文件重定向法复核修正——读数以上表为准。）

### 2.4 探针三件

- **probe-nv-workbench-mount.mjs（新）**：静态审 + 报告/截图一致性核验。报告（docs/evidence/COMPAT-023/workbench-mount-report.json）W1-W6 全 ok、隔离 containment 全 true、真实 $DSH_HOME 前后指纹一致（realEnvUnchanged: true）、port 3080、`token=<redacted>`。截图三张 1410×805 px 独立像素统计：抽样唯一色 514/383/813（01 抽屉/02 控制台/03 分栏）——非空白，03 密度最高，佐证「分栏挂载后内容密度提升」声明。**视觉路由 agent 鉴权过期在本会话原样复现**（PI_AI_ERROR token expired），开发偏差 3 属实。
- **probe-nv-ux012.mjs boot 重写**：旧 `--boot` 代码在 diff 中原样可见（import `dsh-app-boot` + `dsh/lib/profile-boot-*.js` shim）——根因叙述与代码事实吻合：0.2.1 起宿主闭包不装 dsh-app-boot ⇒ 该 import 必 ERR_MODULE_NOT_FOUND。新 boot（官方 CLI + DSH_HOME 隔离 + junction 插件）与 workbench/bar-geometry 同源；**断言区域 diff = 0 行**（27 条全原样，--falsifiability 台账 27≡27 实证）；新增均为环境前置（首跑门多轮 GATE_BTN_RE 处置、home→「全部书籍」导航、icon rail 检索面 textContent ∪ aria-label ∪ title）——偏差 1 成立。
- **probe-nv-bar-geometry.mjs C5**：见 §3 专节。

### 2.5 smoke +6 与 README 342 + 变异验证

- 6 条新断言（①结构完备/②缓存齐备零凭据/③采集只读纪律/④--surfaces 接线/⑤boot 统一零 bootChild/⑥探针资产）内容与计数核实：336 → 342，README L171 计数由 smoke A-F9 机检 ≡ 342（本会话真跑绿）。
- **变异测试**（抽 smoke ②，判别力验证）：
  - 变异：`test/fixtures/host-generations/legacy-0.1/surfaces/surfaces.json` 注入 `"leak": "token=abc123"`（备份后字符串级替换）。
  - 读数：`SMOKE DONE: 340 passed, 2 failed` —— FAIL ① `COMPAT-023 ②… :: caches=legacy-0.1:bad-shape+leak`（精确指认泄漏文件与形态）；FAIL ② = README 计数同步断言 342≠341（级联设计内行为，非缺陷）。
  - 还原证明：SHA-256 还原前后均为 `9B20097C825CBE324B725F189C86BA4FCD98024E629DFC5B1A098857492F526F`，`git diff` 空 = **逐字节还原**。
- 判定：新断言具内容级（非仅在场性）判别力。✅

### 2.6 口径硬化核验

- README 宿主矩阵四代行的 surfaceEvidence 路径 × 4 + 引用的 `docs/evidence/BUG-012/fix-verification.md`、`docs/evidence/COMPAT-020/diag-preset-0.2.{0,1,2}*.json` 全部在场且内容背书（0.2.2 行的 W1-W6 报告 ok:true；legacy 行的 cordis 4.0.2/schemastery 3.18.2 与证据文件一致）。未改动行（0.1.2-rc.1 等）不在本次 diff 面。
- docs/COMPATIBILITY.md：§3 L3 升「工作台挂载面 = 关键面」订正有 BUG-012 实证支撑（SlotErrorBoundary 整体卸载 ⇒「可降级」失实），§6 矩阵 surfaceEvidence 列、§7.1 选项表、§7.5（SKIP ≠ PASS / 篡改必红 / 契约交叉对账 / 离线语义）与实现逐条对应。✅

### 2.7 偏差 5 条裁量（implementation.md §6）

| # | 偏差 | 复审判定 |
|---|---|---|
| 1 | 探针环境前置未放宽断言 | **成立**：断言区 diff 0 行；不加前置断言点不可达（首轮 6/27 实测）；falsifiability 10/10 |
| 2 | C5 红如实上报不裁决 | **成立**：探针判据零改动（git diff 无 C5/MEASURE_JS 触碰）；本报告 §3 补裁决 |
| 3 | 视觉复核受限 | **成立且独立复现**（route_agent 同款 token expired 报错）；像素统计佐证 |
| 4 | 面 4/5/6 fixture-record | **成立**：安装锚点/预设源本就是仓库文件（npm 不可提供独立证据）；版本面 = 纯函数回环真跑；status 枚举如实分档 |
| 5 | 0.1.x 代表版本 0.1.5-rc.2 | **成立**：representativeVersion 字段 + note + §6.5 如实声明（见 §2.1） |

## 3. C5 裁决专节（移交项）

**裁决：A = 判据过时应更新；非产品回归。**

### 3.1 独立实测（本会话真跑，0.2.2-rc.1 桌面 CLI）

```
❌ C5-short-compact … :: 1078x593: h=29 lines=1 w=796 barW=796 form=row sum=0 truncated=false
                        | 1400x900: h=15 lines=null w=77 barW=1118 form=null sum=0 truncated=false
```

逐子谓词拆解：**1078×593 记录通过 C5 全部子谓词**（h=29≤32、lines=1、交集 0、无截断、文本=「已恢复默认布局」逐字匹配）；红**仅由 1400×900 的 `lines=null`** 触发（`noticeTextLine.lines === 1` 对 null 为假）。

### 3.2 机理（代码级）

- 1400×900 时测得元素 = `.nv-bar-note` chip（栏内，h=15）。测量逻辑（scripts/probe-nv-bar-geometry.mjs L237-243）：`span = note.querySelector('.nv-notice-text') ?? note`；chip 无该子元素 ⇒ 测 chip 自身；chip CSS（lib/client.js L5825）**未声明 line-height** ⇒ computed = `'normal'` ⇒ `lh=null ⇒ lines=null`。C5 判据（L618-620）写死 `lines === 1` ⇒ 必红。
- 形态由产品侧设计逻辑决定（lib/client.js L4721）：`noticeStream = 文本 > NOTICE_INLINE_MAX(24) ∨ noticeEscalate`——窄栏下 chip 与横幅占位相交时 SplitWorkspace measure 升级为栏下流式 row（L1143 注释）。**chip 本身就是 UX-060 的设计形态**（commit 21b100c 标题即「短提示保留标题栏紧凑 chip」）。

### 3.3 判据为何过时（设计变更定位）

- **UX-060 验收基线**（EVD-109，绿态实测）：S2-ok 在**两个判据视口均为 row 形态**（`green row/lines=1/sum=0`），chip 仅出现在 1800×900 参考视口——所以 L47/L582「参考视口非判据」与 C5「两视口」当时自洽。
- **UX-061（2026-10-20）icon rail 重设计**（控制条 44px 无文字按钮——probe L511-512 自注）+ **UX-063 全屏工作台**释放了标题栏横向空间 ⇒ 1400×900 下 chip 与横幅不再相交 ⇒ 不升级、chip 留在栏内。**判据视口集因此跨到了 chip 形态，而 `lines===1` 只在 row 形态（.nv-notice-text 有可解析 line-height）可计算。**
- 当前渲染对 UX-060 全部设计意图的符合性：紧凑（h=15/29 ≤ 32 ✓）、单行（chip nowrap 构造性单行；row lines=1 ✓）、零交集（sum=0 ✓）、无截断（✓）、全文在应用内（7 字全量可见，title 属性冗余兜底 ✓）——**无一条设计意图被违反**。

### 3.4 建议新判据形态（供刷新任务）

1. **形态感知谓词**（推荐）：`noticeClass === 'nv-bar-note'`（chip/栏内）⇒ 断 `computed whiteSpace === 'nowrap' ∧ h ≤ 32 ∧ truncated === false ∧ intersectionSum === 0`（单行性由 nowrap 构造背书）；`form === 'row'` ⇒ 维持 `lines === 1 ∧ h ≤ 32 ∧ …`。
2. 或最小测量修复：MEASURE_JS noticeTextLine 在 `lineHeight === 'normal'` 时回退 `Range.getClientRects().length` 或 `height / (fontSize × 1.2)` 估算，C5 谓词不变。
3. 同步重锚 L47/L582 注释与 C5 label「——两视口」：明示 chip/row 分界点归设计所有（NOTICE_INLINE_MAX + SplitWorkspace measure），1800×900 参考位「chip 零变化」断言可保留为观测。

## 4. Findings

| # | 严重度 | 位置 | 问题 | 可操作修复 |
|---|---|---|---|---|
| F1 | **P2** | scripts/probe-nv-bar-geometry.mjs:46-48, 582-588, 617-622 | C5 判据/注释陈旧（§3 裁决 A）：UX-061/063 后 1400×900 判据视口渲染 chip 形态，`lines===1` 不可计算 ⇒ 探针恒红（7/8），「参考视口非判据」与「两视口」表述失真 | 另立探针判据刷新任务（按 §3.4 形态感知谓词或测量回退）；完成后 C5 恢复绿态门禁语义 |
| F2 | **P2** | docs/evidence/COMPAT-023/implementation.md:66 | C5 读数措辞不精确：①「行计数 Range 测量无果」——实际机理是 computed line-height `'normal'` ⇒ null（MEASURE_JS 无 Range 调用）；② 1078×593「form=row w=796=barW 全宽」读作红因之一，实际该记录通过全部子谓词，红仅源自 1400×900 lines=null | 在 C5 刷新任务落地时订正措辞（本文件为证据留档，不要求本任务内改写） |
| F3 | **P2** | scripts/preflight-preset-rows.mjs:118-120 | `--surfaces` 模式仍执行 `--patch/--legacy` 文件存在性校验（surfaces 不消费源文件）；仓内默认路径恒在故无实害，但残缺 checkout 上会误报 usage exit 2 | 将该存在性检查移入非 surfaces 分支（或在 surfaces 早返后再校验） |

P0 = 0 · P1 = 0 · P2 = 3（F1/F2 为 C5 裁决的配套留痕，F3 为低实害接线瑕疵）。

## 5. 提交建议

**建议提交**（APPROVED_WITH_NOTES）。条件：
1. F1 立项跟踪（探针判据刷新，属 UX-060→UX-061 判据演进收口，非 COMPAT-023 缺陷）——避免 bar-geometry 探针长期恒红被误读为产品回归；
2. F3 可随下次触碰 preflight 时顺修或并入 F1 任务；
3. 提交信息建议引用本报告 §3 裁决（C5 红 = 判据陈旧裁定，7/8 如实入账）。

复审全程零产品码残留（唯一变异已 SHA-256 证明逐字节还原；git status 与审查起点完全一致）；零 `.governance/` 写入；未 commit；未跑 review-record。
