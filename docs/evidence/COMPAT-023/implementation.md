# COMPAT-023 实施证据（全依赖面看护）

- 日期：2026-11-07 · 执行角色：Developer（triage = `.governance/change-triage/COMPAT-023.json`；范围升级 DEC-160）
- 本文件 = 实施与验证证据；token 一律 `<redacted>`；宿主包交互全程只读（`npm view` / `npm pack --pack-destination` + `tar` 解包；零 install / 零执行 tarball 内容）
- 约束遵守：零 commit；零 `.governance/` 写入（工作区出现的 `.governance/tpa-last-run.json` 改动与 `plan-tracker.md.lock` 非本会话所为）；零 `package.json` 改动；`lib/client.js` / `lib/index.js` / `lib/tools.js` / `agent.cordis.yml` / `cordis.patch.yml` 零改动（git status 佐证）；探针端口纪律 3080/3081；只杀自启进程（PID/StartTime 判定，taskkill /T /F）

## 1. 变更文件清单

| 文件 | 类型 | 内容 |
|---|---|---|
| `lib/host-compat/generation-manifest.mjs` | 修改 | 新增 `SURFACE_EVIDENCE_STATUSES` / `UNKNOWN_FACE` / `SURFACE_EVIDENCE`（5 代 × 6 面 = 30 格，deepFrozen）；纯数据零 IO；`detectGeneration` 回环经面 6 断言看护 |
| `scripts/collect-host-surface-evidence.mjs` | 新增 | 只读采集器（npm view + npm pack + tar 解包）；导出 GENERATION_TARGETS / CLIENT_STACK / SERVER_WATCHED / SLOT_NAMES / DOM_ANCHORS / CROSS_SECTION_KEYS |
| `test/fixtures/host-generations/{legacy-0.1,decl-0.2.0,decl-0.2.1,decl-0.2.2}/surfaces/surfaces.json` | 新增 | 四代离线证据缓存（collectedAt 2026-11-07；schemaVersion 1；无 token/凭据） |
| `scripts/preflight-preset-rows.mjs` | 修改 | `--surfaces` / `--surfaces-evidence-root` 参数 + `surfacesMode()`（30 格对账 + 契约交叉对账 + --strict 晋升 + SKIP 三态） |
| `scripts/probe-nv-ux012.mjs` | 修改 | boot 段重写（官方 CLI + DSH_HOME；`resolveHostCli`/`prepareIsolatedProfile`/`spawnHostCli`/`killTree`；`--dsh` 参数）+ 首跑门多轮处置 + 「全部书籍」视图导航（UX-063 控制台默认 home 视图）；断言集零改动（27 条全原样） |
| `scripts/probe-nv-bar-geometry.mjs` | 修改 | 同上 boot 统一 + 首跑门多轮处置 + 工作流控制条按钮检索面扩为 textContent ∪ aria-label ∪ title（UX-061 起 icon rail 无文字内容） |
| `scripts/probe-nv-workbench-mount.mjs` | 新增 | 工作台挂载真路径探针 W1-W6（BUG-012 阶段 B 验证脚本模式固化） |
| `test/smoke.mjs` | 修改 | +6 断言（COMPAT-023 ①-⑥：结构完备/缓存齐备/只读纪律/接线/boot 统一/探针资产）；总 336 → 342 |
| `test/preflight-preset-rows.test.mjs` | 修改 | +⑥组 4 断言（pristine/tamper 负向/缓存缺面 + --strict/用法面）；12 → 16 |
| `README.md` | 修改 | smoke 计数 342 同步；宿主矩阵每行补 surfaceEvidence 证据路径；验证管线补三命令 |
| `docs/COMPATIBILITY.md` | 修改 | §3 L3 定级订正（工作台挂载面 = 关键面，引 BUG-012）；§6 矩阵增 surfaceEvidence 列；§7.1 选项表；新增 §7.5 |
| `CHANGELOG.md` | 修改 | [Unreleased] COMPAT-023 条目 |
| `docs/evidence/COMPAT-023/` | 新增 | 本文件 + workbench-mount-report.json + 三截图 |

## 2. surfaceEvidence 覆盖矩阵（5 代 × 6 面）

| 代际 | 面1 服务端 API | 面2 client 槽位 | 面3 DOM | 面4 安装 | 面5 预设清单 | 面6 版本 |
|---|---|---|---|---|---|---|
| legacy-0.1（0.1.5-rc.2） | verified | verified | verified | fixture-record | fixture-record | fixture-record |
| decl-0.2.0（0.2.0-rc.2） | verified | verified | verified | fixture-record | fixture-record | fixture-record |
| decl-0.2.1（0.2.1-rc.2） | verified | verified | verified | fixture-record | fixture-record | fixture-record |
| decl-0.2.2（0.2.2-rc.1） | verified | verified | verified | fixture-record | fixture-record | fixture-record |
| unknown | unknown | unknown | unknown | unknown | unknown | unknown |

- verified = tarball 实测（`npm pack` 解包扫描：包导出面、槽位注册/消费形态、DOM 锚点消费方）；fixture-record = 仓库文件逐字面量核对（install 脚本锚点 / 预设源锚点 / 版本判据回环）；unknown = fail-closed 带 reason（不默认绿）。
- 面 1 关键读数（BUG-011 断面机械复现）：dsh-settings 0.1.x exports = `[SettingsConflictError, SettingsProvider, default, redactSecrets]` → 0.2.x `SettingsForms` 替换 `SettingsProvider`；0.1.x 有 `sessions.open` 无 `retainedBy/mainSessionId`，0.2.x 反之。cordis 4.0.2/4.0.5/4.0.5/4.1.0；schemastery 3.18.2/3.18.5/3.18.5/3.19.0（按主包依赖钉解析 = 契约 versionExceptions 口径）。dsh-client-modules 四代 exports 恒等（与 COMPAT-003 fixture 一致）。
- 面 2 关键读数：shell.overlay 注册形态 = ui-layout 对象键（多行 `"shell.overlay": {⏎ kind: "list"`）+ runner 键字段（`key: "shell.overlay"`）；消费 = `renderSlot("shell.overlay")` + `slots.inject("slot"`；sidebar.footer.action / settings.section 仅 runner 注册。消费证据位置 = 宿主 client 包栈（非 web index/vendor bundle）——与 BUG-012 阶段 A 结论一致。

## 3. 负向判别力读数（--surfaces，全部真跑）

| 场景 | 命令 | 退出码 | 读数 |
|---|---|---|---|
| pristine | `node scripts/preflight-preset-rows.mjs --surfaces` | 0 | 30 格 = 24 PASS + 6 WARN + 0 SKIP + 0 FAIL；WARN 全部集中于 unknown 代（fail-closed） |
| tamper（证据根四代全量副本，decl-0.2.2 抹 `"shell.overlay"` → `"shell.tampered-by-test"`） | `--surfaces --surfaces-evidence-root <tmp>` | 1 | decl-0.2.2 面 2 FAIL（SURFACE_EVIDENCE_MISMATCH，报文指向 shell.overlay 注册/消费 0 命中）；其余 29 格不受污染（23 PASS + 6 WARN） |
| 缓存缺面（空证据根） | `--surfaces --surfaces-evidence-root <空目录>` | 0 | 12 SKIP（SURFACE_EVIDENCE_CACHE_MISSING ≠ PASS；面 1-3 verified 依赖缓存）+ 12 PASS（面 4-6 fixture-record 只看仓库文件）+ 6 WARN；三态口径 |
| --strict（真跑） | `--surfaces --strict` | 1 | STRICT_SURFACE_UNKNOWN（6 WARN 升红）；缺缓存时另加 STRICT_SURFACE_SKIP |
| 用法面 | `--surfaces --fixture <dir>`；`--surfaces-evidence-root <不存在目录>` | 2 | 互斥参数与不存在目录均 usage 错误 |

以上由 `test/preflight-preset-rows.test.mjs` ⑥组固化（spawn CLI 真跑，16 断言全绿）。

## 4. 探针实跑读数（boot 统一修复 + 工作台真路径）

### 4.1 boot 根因与修法
旧 `--boot` 子进程自举 import 宿主平面 `dsh-app-boot` + `dsh/lib/profile-boot-*.js` shim——0.2.1 起宿主闭包不再装 `dsh-app-boot` ⇒ boot 即 ERR_MODULE_NOT_FOUND（三支真机探针自 0.2.1 全部断裂）。新统一模式（COMPAT-020/BUG-011/BUG-012 三轮验证）：官方 CLI + DSH_HOME 隔离——parent 装配 profile（junction 插件 + bundles 声明 + 空 patch；**不挂 @deepseek-ai junction** = 验证模式实测形态），spawn `<dsh.cmd> --profile <name> --no-open --port <n>`，token 从 stdout 捕获（入库前 `<redacted>`）。实测订正两处：① 浏览器进程必须系统 env 原样（重定向 APPDATA/LOCALAPPDATA 会让当前 Edge 启动即退 `Unable to get local app data path`、CDP 端口不开；隔离边界 = `--user-data-dir` 落临时根）；② 首跑门（「预览版说明」对话框——唯一钮「继续」+ `_mask_` 遮罩）需多轮处置，关不掉 = envBlocked（exit 2，环境门 ≠ 产品缺陷）。

### 4.2 probe-nv-workbench-mount（0.2.2-rc.1 桌面 CLI，真跑）
- 实例 URL：`http://127.0.0.1:3080/?token=<redacted>`；宿主 CLI = `D:\app\dsh\resources\runtime\cli\bin\dsh.cmd`（桌面运行时 0.2.2-rc.1）
- **6/6 全绿（exit 0）**：W1 抽屉渲染（书卡基线 0）→ W2 点抽屉头 `.nv-console`=1 ∧ `.nv-home`=1（shell.overlay 槽消费实证）→ W3 页内 POST `/novel-writing/api/novel-create` {name} ⇒ HTTP 200 + 书卡出现 → W4 点书卡 `.nv-split` ≥ 1 → W5 抽屉提示含「已为《COMPAT023工作台挂载验证书》创建并关联新会话。」（autoBindDone 模板自 lib/client.js 现读同源）→ W6 console 0 × React #310 / 0 × slot entry crashed / 0 pageerror
- 隔离收尾：真实 `$DSH_HOME` 前后指纹一致（零写入）；自启进程树 taskkill /T /F 收口
- 截图（同目录）：workbench-01-drawer.png（81 唯一色/43KB）、workbench-02-console.png（79/36KB）、workbench-03-split.png（143/93KB；分栏挂载后内容密度近 3×——像素统计佐证非空白）。视觉复核受限：视觉路由 agent 鉴权过期（与 BUG-012 阶段 B 同一限制）——截图内容以 DOM 断言读数背书 + 像素统计佐证，如实留档。

### 4.3 probe-nv-ux012（0.2.2-rc.1 桌面 CLI，真跑）
**27/27 全绿（exit 0）**；可失败性自证 PASS（red 29 / ok 12）。修复过程如实留痕：boot 修复后首轮 6/27（首跑门遮罩拦截 + UX-063 控制台默认 home 视图导致网格不可达——两处均为环境/导航前提失真，非断言集变化）；补首跑门多轮处置 + 「全部书籍」导航（i18n homeAllBooks 现读 + 在场等待防竞态）后全绿。

### 4.4 probe-nv-bar-geometry（0.2.2-rc.1 桌面 CLI，真跑）
boot 修复 + 首跑门 + 按钮检索面订正后全场景贯通：**7/8 判据绿（exit 1）**——C1/C2/C3/C4/C6/C7 全绿（两视口 1078x593 / 1400x900 + 参考视口 1800x900）；**C5-short-compact 红**。读数与机理（R1 复现订正，措辞按 docs/review/COMPAT-023-R1.md §3）：**1078×593 实际通过 C5 全部子谓词**（h=29≤32、lines=1、交集 0、无截断、文本「已恢复默认布局」逐字匹配）；红**仅源自 1400×900 的 `lines=null`**——该视口下测得元素 = `.nv-bar-note` chip（栏内，h=15；UX-060 设计形态「短提示保留标题栏紧凑 chip」），chip 无 `.nv-notice-text` 子元素 ⇒ 测 chip 自身，而 chip CSS 未声明 line-height ⇒ computed `'normal'` ⇒ `lh=null ⇒ lines=null`，C5 判据写死 `lines === 1` ⇒ 必红。**R1 裁决 = A（判据过时，非产品回归）**：UX-061 icon rail + UX-063 全屏工作台释放标题栏横向空间 ⇒ 判据视口 1400×900 跨入 chip 形态，而 `lines===1` 只在 row 形态可计算；UX-060 全部设计意图（紧凑 ≤32 / 构造性单行 / 零交集 / 无截断 / 全文可见）无一条被违反。判据形态感知刷新**已按裁决 A 立项 CLEAN-014**（移交闭环）；本探针断言零改动、未静默改判。

### 4.5 进程卫生（如实留档）
taskkill /T 按自启 PID 收口在 cmd 包装器 → Electron 重父转移场景下偶有残留（本轮三次：PID 14848/27508/21336，StartTime 均晚于本会话起点 = 自启判定成立后逐个 taskkill /T /F）；工作台探针自带端口占用检测（3080 占 ⇒ 3081，双占 ⇒ exit 2 不抢占）。

## 5. 门禁读数（全部真跑）

| 门禁 | 结果 |
|---|---|
| `node --check` × 8（全部改动 js/mjs） | 0 错 |
| `node test/smoke.mjs` | **342 passed, 0 failed**（README L171 计数机检同步 ≡ 342） |
| `node test/preflight-preset-rows.test.mjs` | **PASSED (16)**（①-⑤ 12 + ⑥ surfaces 组 4） |
| `node test/validate-preset.mjs` | PASSED（schema-face: PASS） |
| `node scripts/verify-contract-anchors.mjs` | 79 段；FAIL = 0（WARN 24 与基线同） |
| `node scripts/preflight-preset-rows.mjs --surfaces` | exit 0；24 PASS + 6 WARN + 0 SKIP + 0 FAIL |
| 采集（本会话早段实跑） | 四代 surfaces.json 全部落仓（`%TEMP%\compat023-final` scratch；只读 npm view/pack） |

## 6. 设计偏差（相对任务书的如实清单）

1. **探针首跑门处置与视图导航**（ux012/bar-geometry 补处置代码）：任务书要求「断言逻辑保留」——27/8 条断言本体零改动；新增的是环境前置（首跑门多轮关闭 + 控制台 home→books 导航 + icon rail 按钮 aria-label 检索面），不新增/不放宽任何判据。不加这些前置则 0.2.2 上探针无法到达断言点（首轮 6/27 实测证明）。
2. **bar-geometry C5 红**：如实上报不裁决（探针判据零改动）；任务书「断言跑通或如实记录剩余阻塞」口径下已跑通 7/8。**R1 裁决已下（COMPAT-023-R1 §3）= A：判据过时，非产品回归**——1400×900 判据视口跨入 chip 形态（UX-061/063 释放标题栏空间）而 `lines===1` 仅 row 形态可测（chip 未声明 line-height ⇒ computed 'normal' ⇒ lines=null）；1078×593 实际全过。判据刷新已立项 **CLEAN-014**（F1 移交）。
3. **视觉复核受限**：视觉路由 agent 鉴权过期（`PI_AI_ERROR ... token has expired`），截图以 DOM 断言 + 像素统计背书（BUG-012 阶段 B 同款如实留档）。
4. **面 4/5/6 用 fixture-record 而非 verified**：安装面/预设清单面的「宿主侧证据」本仓不可独立采（install 脚本是本仓文件、预设源是本仓文件——证据源就是仓库自身）；版本面证据 = manifest 判据回环（纯函数）。已在 manifest note 与 §7.5 写明口径。
5. **0.1.x 采集代表版本**：任务书写「+0.1.x」——以 legacy-0.1 = 0.1.5-rc.2（契约 hostSurface.current 口径）为该代代表完成采集；未逐个小版本采（面内版本差异不在六面证据维度内）。
