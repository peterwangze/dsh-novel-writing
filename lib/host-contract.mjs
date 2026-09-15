/**
 * host-contract.mjs — 宿主依赖面机读声明式契约（COMPAT-002；DEC-025 ADR 决策①落地地基）。
 *
 * 本文件是纯数据清单：零 import（不依赖任何宿主包）、零运行时逻辑（无函数定义/无求值表达式），
 * 供 CI / smoke / 诊断三方直接 import 消费。提取底稿 = COMPAT-001 宿主兼容性分析 §3 六面全量清点
 * （docs/research/COMPAT-001-host-compat-analysis.md，61 处行号抽核 0 失实）；
 * 六面 48 项 = 面1 服务端 11 + 面2 客户端 13 + 面3 DOM·前端约定 8 + 面4 安装注册 6 + 面5 预设 manifest 5 + 面6 版本环境 5
 * （§3 底稿 47 项 + REVIEW-COMPAT-002-R1 F1 补录 1 项〔3.8 findSidebar 侧栏探测〕；补录项以 incident + note 标注出处，非 §3 溯源）。
 *
 * 纪律（REVIEW-COMPAT-002-R1 F8 登记项）：新增任何宿主耦合字面量/符号，MUST 同步本契约（items[] 或 regionLiterals）
 * 并补 smoke 对账断言——漏登记 = 宿主变更时 CI/smoke/诊断三面均零信号（L2400 侧栏类名正则即现成漏项实例）。
 * 契约消费口径（F8）：items[] = 依赖清点（声明式、可诊断）；regionLiterals = 可机检字面量对账面（smoke 双向 ⊆）。
 * 纯数据守卫强度（smoke COMPAT-002 ④ 正则 + COMPAT-003 递归 own-descriptor）——如实披露：
 *   能拦：import 语句 / 箭头语法 / 函数关键字 / 模板串插值 / JSON 往返不等（Date·Map·Set·RegExp·undefined 丢失）/
 *         自有属性非数据属性（取值器·方法简写）/ 值类型越出白名单（string·number·boolean·null·array·plain-object）。
 *   不能拦：class 声明、`export *` 转发、非行首动态 import、导出后的顶层副作用语句——本文件当前为纯数据（逐行确认），
 *         但守卫是回归网，不是「无运行时逻辑」的证明。
 *
 * 条目 schema 样例（一条完整条目，逐字段语义）：
 *   {
 *     face: 2,                                   // 面 1-6：1=服务端 API / 2=客户端 API / 3=宿主 DOM·前端约定 / 4=安装注册机制 / 5=预设与 manifest / 6=版本与环境
 *     item: '2.13',                              // §3 原编号——溯源键，逐项对照分析文档表格行（面内自 1 连续递增）
 *     kind: 'slot',                              // 依赖形态类别（枚举：import / inject / api-call / service-name / remote-namespace / reactive-store / event / slot / module-loader / dom-selector / dom-structure / layout-technique / css-token / dom-interop / dom-observer / storage-key / install-detection / install-link / install-register / install-preset / manifest-field / preset-manifest / preset-packages / preset-yaml-eval / preset-skill-dirs / preset-location / version-policy / version-matrix / ci-mock / env-fact）
 *     symbol: "ctx.slots.inject('settings.section'|'sidebar.footer.action'|'shell.overlay')", // 宿主符号/接口/字面量——人读描述 + grep 语义锚点
 *     file: 'lib/client.js',                     // 仓库相对路径（string 或 string[]；null = 无单一落点〔隐式约定/环境事实〕）
 *     line: 'L4403-4435',                        // 行号或行段（string，以 §3 底稿为准；null 同上）
 *     necessity: 'required',                     // 必要性（九值枚举，见下）
 *     note: '无替代挂载通道',                     // 可选：口径补充/收敛方向/历史勾稽说明
 *     incident: 'TP-2',                          // 可选：事故/风险/待验证关联（BUG-xxx / RISK-xxx / UX-xxx / TP-x）
 *   }
 *
 * necessity 九值口径（§3 判定口径的机读化）：
 *   required        = 必需（功能本质依赖且无替代路径）
 *   consolidatable  = 可收敛（有降级或移除路径，标收敛方向）
 *   adapted         = 已适配（依赖存在但已有单点收口防护）
 *   optional        = 可选（生态约定，非宿主官方）
 *   improvable      = 可改进（口径缺口而非缺陷）
 *   own             = 自有（插件自有点、无宿主耦合；列出为完整性——REVIEW-COMPAT-001-R1 F10 统一口径恰 1 项：3.7）
 *   eliminated      = 已消除（历史依赖退役；保留在册供历史勾稽——恰 1 项：1.4 settingsNamespace）
 *   adapted-drift   = 已适配但存在漂移面（对账时以现文件实状为准）
 *   awareness       = 必需认知（环境事实，无代码落点）
 *
 * 顶层机读字段（COMPAT-003 增补）：
 *   revisions[]     = 契约修订史（任务 + 变更点；本次 COMPAT-003 吸收 REVIEW-COMPAT-002-R1 F1/F2/F9 等）。
 *                     **本数组末项 task 即 `lib/host-boundary.js` `[nv-compat]` 诊断载荷的归因任务名**
 *                     （REVIEW-COMPAT-004-R1 F4：派生值，禁硬编码——宿主耦合变更 MUST 同步本数组，值随任务跟进）
 *   kindEnum[]      = kind 封闭枚举（机检依据：items[].kind MUST ∈ kindEnum，且枚举无空置值）
 *   hostSurface     = 宿主表面 fixtures 离线对账声明（requiredExports/eliminatedExports/versionFacts/ciMock/
 *                     versionExceptions/versionFactOrigins/_schema）——
 *                     供 smoke「契约声明面 ⊆ fixture 实测面」与 ci.yml mock 面钉（F1，COMPAT-011 C6 扩 4/4）消费；
 *                     fixtures 由 test/fixtures/host-surfaces/extract.mjs 从真实包只读提取（禁止手写表面）；
 *                     COMPAT-011 增补：versionExceptions（版本例外表，C5）/ versionFactOrigins（标记来源类别，C4）/
 *                     _schema（fixture 字段语义，含 classAliases，N3）。
 *   boundaryMap     = （本契约**不重复登记**——单一事实源 = lib/host-boundary.js 的 BOUNDARY_MAP）契约面 1 可收口项
 *                     → 边界导出符号名的收口映射，由 smoke 机检「键集 ≡ 面 1 收口项、值全为该模块真实导出且被
 *                     lib/index.js 消费」（COMPAT-004 验收：收口映射表齐备 + 产品代码零直连宿主 API）。
 *   clientProbes[]  = D1 设置页「诊断」区的**客户端侧**探测面声明（COMPAT-005）：只登记**已实现**的探测项
 *                     （面 2 六项 + 面 3 两项），每项 = { item, probe, mode, kind }——probe 键 ≡ lib/client.js
 *                     CLIENT_PROBES 常数键（smoke 双向 ⊆ 机检）；未实现的面/项以 notCovered 数量摘要披露。
 *   presetRowConfig[] = 预设行 config 键声明（BUG-007）：{ row, file, hostPackage, keys, requiredKeys, usedKeys,
 *                     incident, source }——宿主耦合字面量入册（P-10），smoke 与组合文件双向 ⊆ 对账
 *                     （离线文本提取）；权威校验 = test/fixtures/host-surfaces/preset-schema-face.mjs。
 *   ctxGetSemantics.recheck = 复核留痕：记录「本轮为何仍不转 verified」（无新证据则保持诚实状态，P-01）。
 * 判据优先级（COMPAT-004 FIND-3）：`exports`/AST > `methodNames`——methodNames 存在**假阴性**风险
 * （关键字命名或黑名单过筛的真实方法会被误报缺失），消费方做存在性判定时 MUST 以此优先级为准。
 */

export const hostContract = {
  schemaVersion: 1,
  task: 'COMPAT-002',
  source: 'docs/research/COMPAT-001-host-compat-analysis.md#3（宿主依赖面六面全量清点）',
  revisions: [
    { task: 'COMPAT-003', scope: 'F1 补录 item 3.8（47→48）+ 面 3 分布 7→8；F2 cssTokens 族放宽（--dsw-alias-* 12 → +--dsw-shadow-lv2 1 = 13）；F6 necessity 九值 golden 机检；F7 kindEnum/faces 结构机检；F9 三处 line 精度修正 + 4.5·5.5 合并来源注记；F5 file/line 活性由 smoke 校验；hostSurface 离线 fixtures 对账声明 + F1 面钉（ci.yml mock 导出面）' },
    { task: 'COMPAT-011', scope: '承接 REVIEW-COMPAT-003-R1：hostSurface.ciMock 单对象 → 数组（4/4 mock 面钉，C6）；新增 versionExceptions（版本例外表，C5）与 versionFactOrigins（标记来源类别，C4）；新增 _schema（fixture 字段语义，含 classAliases 主名/别名口径，N3）；fixtures 三份重建（methodsOf 关键字零残留 C1 / classCount 去重 C2 / origin 按 layout 分流 N1）——items[] 48 项与 faces/kindEnum 未变' },
    { task: 'COMPAT-004', scope: '宿主边界层落地（DEC-025 轴② B2 + 轴④ D2 + 轴① A3）：面 1 十项 file/line 由 lib/index.js 改指 lib/host-boundary.js（服务端宿主调用收口——产品代码零直连宿主 API）；item 2.3 inject 三服务硬声明 → slots 硬依赖 + connection/locale 可选探测（A3，DEC-026）；regionLiterals.serviceNames.inject 同步为 [\'slots\']；hostSurface._schema 增 classes[].methodNamesExcludedByKeyword（FIND-3 黑名单过筛项如实登记）+ 判据优先级 exports/AST > methodNames；头注释括号清单订正（REVIEW-COMPAT-011-R1 FIND-2）。items[] 48 项计数与 faces/kindEnum/necessity 分布未变（行为等价重构——纯搬运+命名）。**R1 返工（REVIEW-COMPAT-004-R1 F1~F7）**：F1 package.json files 收敛为 lib/（打包面缺 host-boundary/host-contract 致插件无法加载）；F2 A3 后 locale 服务「后到」自愈（复用 internal/service 监听 + 标签渲染期惰性取快照）；F3 新增 ctxGetSemantics（宿主取服务语义入册 + 复核状态 unverified）；F4 [nv-compat] 载荷 task 改由本 revisions 末项派生（去硬编码）；F5 收口判据升级为强口径（零 ctx.<id> 属性访问）；F6 lib/index.js inject 脱离与边界共享的数组引用；F7 收口口径跨文档统一以 lib/index.js 为限（tools 行 1.11 显式排除）' },
    { task: 'COMPAT-005', scope: 'D1 设置页「诊断」区落地（契约运行时投影）：**新增顶层 `clientProbes[]`（8 项客户端探测面声明）+ `clientProbesNote`**——面板不自带状态清单，探测项 ↔ CLIENT_PROBES 常数 ↔ 源码面三向同集机检（COMPAT-014 B-N5 补录，照 COMPAT-011 先例：顶层字段新增入修订史）；item 1.8 路由数 12→13（+`compat` 只读诊断路由）；报告原因字段枚举化（`probes[].code` / `unprobed[].code` / `notCovered[].code` 取代自由文本 reason）+ 新增边界导出 `contractProjection()`（产品代码不再直连契约模块，P-10 依赖方向）；面 2/3 行号重基（面板 +约 350 行，逐项实读复核）。**R1 返工（REVIEW-COMPAT-005-R1 F1~F9）**：F1 探针代际判据下移至原始服务命名空间（`ctx.get` 解析器）+ facade 域第二重肢；F2 载荷 BC-05 整包扫描 + 原因字段枚举码；F5 note 行号解耦；F6/F7/F9 死码与归因订正。**COMPAT-014 同步（B-N4/B-N3）**：clientProbes[].mode 记双判据语义（`runtime-service+raw-ns`）；`report.host` 自由文本 `versionNote` → 枚举码 `versionCode`' },
    { task: 'COMPAT-015', scope: '终批收口（REVIEW-COMPAT-014-R1 F1~F11 + COMPAT-008 + COMPAT-009）：**COMPAT-009 安装面知识规范化**——install.ps1 / install.sh 头部新增「宿主布局契约」单点清单块（固定标记行 `host-contract:v1`，RB-02）并由 probe-face ⑧ 与契约 face 4/5 逐项正则对账；face 4/5 行号 **+13 重基**（两脚本头部插入 13 行纯注释；非注释行逐字节等价 ⇒ 脚本行为零变化，强等价证据见 CHANGELOG）+ item 4.1/4.2/4.3/4.4/5.5 补「单点清单」note（含 4.3 note 内序列化器行段随重基订正）；**COMPAT-008**——新增 `scripts/probe-host.mjs`（隔离实例宿主能力探针固化；离线 `--self-check` 进 CI sanity，实机 `--run` 标注「需运行中宿主环境、本机未验证」）；**REVIEW-COMPAT-014-R1**——probe-face 增四键/接线段绑定/判据①③⑤负例/白名单自指面/timeout/失败态归因，smoke 增「行号引用 ↔ 契约 line 字段」对账与 B-N2 词法正向对照，smoke 注释与 CHANGELOG 的陈旧行号副本按本契约各条 `line` 字段订正（本批 F3）。items[] 48 项计数与 faces / kindEnum / necessity 分布未变（face 4/5 仅行号与 note 变化，kind 未变）' },
    { task: 'BUG-007', scope: '预设 persona 行断裂（config.text → config.prefix）修复的契约面：新增 face 5 item 5.6（kind `preset-row-config`，kindEnum 30→31 值）登记 persona 行的 config 键契约（keys/requiredKeys + 已装 schema 来源与行号 + BUG-007 两条消费路径）；items[] 48→49、面 5 分布 5→6、necessity required 39→40（smoke 三处 golden 同步）。新增看护 `test/fixtures/host-surfaces/preset-schema-face.mjs`（预设组合行 × 已装宿主 Config schema 逐行核对，三态 PASS/FAIL/NOT_RUN，零 schema 复制）接入 validate-preset 第 4 段并随 CI 执行；smoke 增「组合 persona 行键集 ≡ 契约 5.6 keys」双向对账与看护接线自断言' },
    { task: 'CLEAN-007', scope: '**面 2/3 行号重基（UX-012 R1 备注批次 + R1 复审返工；两次机械重基）**：lib/client.js **5018 → 5198 → 5220 行**（首轮 +180：F6 模态可访问性公共件 / F2 `createSessionFor` 收口 / D-1 Esc / F3·F4·F5·F9；返工轮 +22：C-1 分栏态 Esc 让位守卫 / C-9 删死输出 `step` / C-11·C-12·C-13 注释订正）。**18 项 / 29 处** `items[].line` 重基（2.3×1、2.4×6、2.5~2.13×9、3.1×1、3.2×2、3.3×3、3.4×3、3.5×1、3.6×2、3.8×1 = **29**；**2.1/2.2 位于首个插入点之前不变**）。Δ 分段：**首轮** +84（早期段）/ +88（2.11）/ +148（3.8）/ +157（3.4-L4711）/ +165（2.3、2.12、3.4-L4854）/ +168（3.6-L3875）/ +175（2.13）；**返工轮** +4（早期段及 2.5~2.11、3.1~3.6 主段）/ +6（3.8）/ +11（3.6-L3886）/ +22（2.3、2.12、2.13、3.4-L4733/L4876）。**取证口径（逐项，非估计值；两次重基各做满一遍）**：① 范围**内容逐行等价**——旧 [a,b] ≡ 新 [a+Δ,b+Δ] 逐行比对且长度守恒（**29/29 全等价，0 处不等价**）；② 范围首/末**非空行原文**在**最终文件**中**唯一精确命中**（展开窗口 1~3 行，逐项记录新行号）。**未变**：items[] 计数与 face 分布、kind/necessity/symbol/`golden` 面计数、`regionLiterals`、`presetRowConfig[]` 与 item 5.3/5.4/5.6（BUG-007 交付面）**零改动**。伴随订正：`test/smoke.mjs` 注释内 `<item> L<n>` 陈旧副本随两次重基同步为新区间（否则 COMPAT-015 F3 行号引用对账转红）。**口径订正（R1 C-4）**：首轮自述「31 处」有误，实为 **29 处**（本次已按 29 重述）。' },
    { task: 'BUG-010', scope: '**面 2/3 行号重基（WorkspaceDialog 自挂 Esc——CLEAN-007 R1 C-2 的同族收口）**：lib/client.js **5220 → 5233 行**（+13：`WorkspaceDialog` 内新增 `keydown` Esc effect——只关本层 `entryOpen:false`、`busy` 守卫与 `close()` 同判据、卸载移除监听；镜像 CLEAN-007 D-1 的 `BindDialog` 既定模式）。**4 项 / 5 处** `items[].line` 重基（2.3×1、2.12×1、2.13×1、3.4×2〔L4733/L4876〕；**Δ 单段 +13**——插入点唯一、位于面 2/3 全部受影响范围之前；2.1/2.2 及 2.4~2.11、3.1~3.3、3.5~3.8 均位于插入点之前**不变**）。**取证口径（逐项，非估计值）**：① 范围**内容逐行等价**——旧 [a,b] ≡ 新 [a+13,b+13] 逐行比对且长度守恒（**5/5 全等价，0 处不等价**）；② 范围首/末**非空行原文**在**最终文件**中唯一精确命中（2.3/2.12/3.4-L4746 取末行唯一，2.13 取首行唯一，3.4-L4889 取末行唯一）。**未变**：items[] 计数 49 与 face 分布、kind/necessity/symbol/`golden` 面计数、`regionLiterals`、`presetRowConfig[]` 与 item 5.3/5.4/5.6（BUG-007 交付面）**零改动**。伴随订正：`test/smoke.mjs` 注释内 `<item> L<n>` 陈旧副本（`2.3 L5082-L5084`）随本次重基同步为 `L5095-L5097`（否则 COMPAT-015 F3 行号引用对账转红）。' },
    { task: 'CLEAN-006', scope: '**面 2/3 行号重基（F1：会话镜像 hook 改走 `useSyncExternalStore`——BUG-009 R1 / RISK-008）**：lib/client.js **5233 → 5268 行**（+35）。**4 个插入点（实测 ≥2 ⇒ Δ 分段，非单段）**：① L100 **替换**（`const { useState, useEffect, useRef, useMemo } = react` → 追加 `useSyncExternalStore`，Δ0）；② L1451 前 **+2**（工厂级 `ABSENT_SNAP` 单例——`getSnapshot` MUST NOT 每渲染新建对象）；③ L1470 前 **+32**（`getSnapshotForRender` + `subscribeForCurrent` 稳定包装 + 注释块）；④ L1540 前 **+1**（`useSyncExternalStore(subscribeForCurrent, getSnapshotForRender)` 调用点）。**累积 Δ 分段**：≤L100 `0` / ≤L1450 `+2` / ≤L1466 `+34` / ≤L1505 `+35`。**重基 10 项**：2.2.2（L100→L100 替换，逐字复核）、2.2.10（`L1449-1513`→`L1449-1548`）、item `L76 / L1463`→`L76 / L1465`、item `L55（调用点 L1457、L95）`→`L55（调用点 L1459、L95）`、2.3（`L5095-L5097`→`L5130-L5132`）、2.12（`L5125-5132`→`L5160-5167`）、2.13（`L5162-5194`→`L5197-5229`）、item `L1541-1568`→`L1576-1603`、3.4（`L925-938 / L4746 / L4889`→`L925-938 / L4781 / L4924`）、3.6（`L1164-1188 / L3886`→`L1164-1188 / L3921`）、item `L2983-2993`→`L3018-3028`。**取证口径（双取证，逐项非估计值）**：① **逐行等价**——32 段全部满足 `old[L−Δ(L)] ≡ new[L]`（首行 + 范围末行逐字节比对，**32/32 等价、0 处不等价**）；② **插入点独立重算**——以 LCS 差分（`difflib.SequenceMatcher`，`git diff --no-index` 交叉印证）求得**恰好 4 个 opcode**（1 替换 + 3 插入），逐点累积 Δ 与上式一致，且总 Δ `+35` ≡ 文件行数差 `+35`。**未变**：items[] 计数 49 与 face 分布、kind/necessity/symbol/`golden` 面计数、`regionLiterals`、`presetRowConfig[]` 与 item 5.3/5.4/5.6（BUG-007 交付面）**零改动**。伴随订正：`test/smoke.mjs`/`README.md` 内 `<item> L<n>` 陈旧副本随本次重基同步（否则 COMPAT-015 F3 行号引用对账转红）。' },
  ],
  faces: [
    { id: 1, name: '服务端 API 面', scope: 'lib/host-boundary.js（收口层）+ lib/index.js 宿主调用 100% 收口（消费方）+ lib/tools.js（1.11：不在边界层，按轴①独立评估）' },
    { id: 2, name: '客户端 API 面', scope: 'lib/client.js（makeHostApi 覆盖的全部调用点）' },
    { id: 3, name: '宿主 DOM/前端约定面', scope: 'lib/client.js 布局引擎 + 样式' },
    { id: 4, name: '安装与注册机制面', scope: 'install.ps1 / install.sh / cordis.patch.yml / package.json dsh 字段' },
    { id: 5, name: '预设与 manifest 面', scope: 'agent-presets/novel-writing/' },
    { id: 6, name: '版本与环境面', scope: 'package.json / .github/workflows/ci.yml / 宿主分发通道事实' },
  ],
  // kind 封闭枚举（30 值）——机检依据（COMPAT-003 F7）：items[].kind MUST ∈ 本枚举，且枚举无空置值。
  // 新增 kind 必须先入册本数组（否则 smoke F7 红），保证枚举与条目同步演化。
  kindEnum: [
    'import', 'inject', 'api-call', 'service-name', 'remote-namespace', 'reactive-store', 'event', 'slot',
    'module-loader', 'dom-selector', 'dom-structure', 'layout-technique', 'css-token', 'dom-interop',
    'dom-observer', 'storage-key', 'install-detection', 'install-link', 'install-register', 'install-preset',
    'manifest-field', 'preset-manifest', 'preset-packages', 'preset-yaml-eval', 'preset-skill-dirs',
    'preset-location', 'version-policy', 'version-matrix', 'ci-mock', 'env-fact', 'preset-row-config',
  ],
  items: [
    // ── 面 1 — 服务端 API 面（11 项）──
    { face: 1, item: '1.1', kind: 'import', symbol: "@deepseek-ai/cordis 具名导出 Service（服务基类，cordis 插件模型本体）", file: 'lib/host-boundary.js', line: 'L18', necessity: 'required', note: 'COMPAT-004 收口（原 lib/index.js L17）：index.js 经边界 import 消费（extends 基类）；CI mock（ci.yml `host-logic` 步骤的 cordis heredoc）+ BUG-003 后逐项核验（EVD-076）。**note 口径（COMPAT-014 B-N2）**：不内嵌 ci.yml 行号——ci.yml 步骤增删会整体位移其行号（本批 A-F1/A-F2 即实例），故 CI 侧引用一律以**步骤 / job 名**为锚点' },
    { face: 1, item: '1.2', kind: 'import', symbol: '@deepseek-ai/schemastery 默认导出 z（Config schema，settings.register 消费）', file: 'lib/host-boundary.js', line: 'L17', necessity: 'required', note: 'COMPAT-004 收口（原 lib/index.js L16 为收口前历史值）：index.js 经边界 import 后用于 Config 定义（`Config = z.object({…})`，按符号定位）；CI 用真包（ci.yml `host-logic` 步骤经 registry 安装——RISK-001：mock 无法覆盖链式 API）' },
    { face: 1, item: '1.3', kind: 'import', symbol: '@deepseek-ai/dsh-home-paths 具名导出 resolveDshHome（预设同步目标根路径解析，边界 presetRoot/presetDir 包装）', file: 'lib/host-boundary.js', line: 'L19（调用点 L98、L103）', necessity: 'required', note: 'COMPAT-004 收口（原 lib/index.js L18、调用点 L163/L1360 为收口前历史值 → 边界 presetRoot()/presetDir()）；**index.js 侧调用点行号以本项 `line` 字段为唯一事实源**（原 note 内嵌「现调用点 L…」副本已按 COMPAT-014 B-N2 删除——该形态逃过旧守卫；守卫词法/扫描面同批扩宽，见 smoke D1⑩）；与宿主 DSH_HOME 解析逻辑必须一致；CI mock（ci.yml `host-logic` 步骤的 dsh-home-paths heredoc）' },
    { face: 1, item: '1.4', kind: 'import', symbol: 'settingsNamespace 具名导入（已退役：BUG-003 修复改为字符串常量，行号见本项 `line` 字段）', file: 'lib/index.js', line: '原 L18 → 现 L40 字符串常量', necessity: 'eliminated', incident: 'BUG-003', note: '已消除但保留在册供历史勾稽（F10 口径）；CI mock 漂移见 6.4；COMPAT-004 后 NS 常量仍在 index.js（非宿主 API，普通字符串）。**COMPAT-014 B-N2**：symbol 内原内嵌「字符串常量 L39」为**陈旧副本**（`line` 字段真值为 L40），已删除并把行号唯一事实源收敛到 `line` 字段' },
    { face: 1, item: '1.5', kind: 'inject', symbol: "inject = ['settings']（settings 硬依赖声明，cordis inject 机制；声明值来自边界 hostInject）", file: ['lib/index.js', 'lib/host-boundary.js'], line: 'L37 / L51', necessity: 'required', note: 'COMPAT-004 收口：字面量上移至边界 hostInject，index.js 仅 re-export（`export const inject`，行号见本项 `line` 字段）——声明值单一事实源（COMPAT-014 B-N2：删除 note 内嵌行号副本）' },
    { face: 1, item: '1.6', kind: 'api-call', symbol: 'ctx.settings.register(NS, Config) / ctx.settings.get(NS)（边界 registerSettings / readSettings）', file: 'lib/host-boundary.js', line: 'L55（调用点 L1459、L95）', necessity: 'required', incident: 'BUG-003', note: 'COMPAT-004 收口（原 lib/index.js L1423 / L88 为收口前历史值）：NS 形态 symbol→string 事故点；调用点行号见本项 `line` 字段（apply 期 registerSettings / cfg 内 readSettings）；smoke 全量行为测试' },
    { face: 1, item: '1.7', kind: 'service-name', symbol: "super(ctx, SERVICE_NAME)（服务注册名 novel-writing，边界常量）", file: ['lib/index.js', 'lib/host-boundary.js'], line: 'L88 / L45', necessity: 'required', note: 'COMPAT-004 收口（原 lib/index.js L82 字面量）：字面量上移至边界 SERVICE_NAME，index.js 以常量传 super（行号见本项 `line` 字段——COMPAT-014 B-N2 删除内嵌副本）' },
    { face: 1, item: '1.8', kind: 'api-call', symbol: "ctx.get('webServer')（可选，边界 getWebServer）+ webServer.register({kind:'exact', path, handler}) ×13 路由（/novel-writing/api/*，边界 registerRoute）", file: 'lib/host-boundary.js', line: 'L66 / L71', necessity: 'required', note: 'COMPAT-004 收口（原 lib/index.js L1427-1431 / L1229-1289 → 边界 L66/L71，index.js 路由注册段（含 COMPAT-005 D1 的 compat 只读诊断路由））。**路由数复核**：§3 底稿称 13；COMPAT-012 实测为 **12**（overview/novel/chapter/gate/request/novel-create/novel-delete/file/request-done/publish/data/preset-sync）——**COMPAT-005 D1 新增 1 条只读诊断路由 `compat` → 现为 13**，与底稿计数巧合一致（底稿未区分本条，故数值自洽但来源不同；路由数机检随契约本字段）。客户端轮询数据面；webServer 缺席已有降级警告（宿主无 webServer 时的 logWarn 分支）+ [nv-compat] 告警项 1.8。**note 口径（REVIEW-COMPAT-005-R1 F5）**：不内嵌「现 L…」行号（行号以 `line` 字段为唯一事实源——本条原内嵌 index.js 行号与 D1 段行段在重基后已失真，故整段改为符号引用）' },
    { face: 1, item: '1.9', kind: 'api-call', symbol: 'ctx.effect(fn, label)（生命周期清理，cordis 核心；边界 onLifecycle）', file: ['lib/host-boundary.js', 'lib/index.js'], line: 'L76 / L1465', necessity: 'required', note: 'COMPAT-004 收口（原 lib/index.js L1429 为收口前历史值 → 边界 onLifecycle；index.js 调用点行号见本项 `line` 字段 = apply 内 onLifecycle 调用）' },
    { face: 1, item: '1.10', kind: 'api-call', symbol: "ctx.emit('novel-writing/changed')（边界 emitChanged/EVENT_CHANGED）+ ctx.logger（边界 loggerOf/logWarn）", file: ['lib/host-boundary.js', 'lib/index.js'], line: 'L92 / L155 / L122', necessity: 'required', note: 'COMPAT-004 收口（原 lib/index.js L148 / L114 为收口前历史值）：事件名常量 EVENT_CHANGED 与 logger 取值均在边界，index.js 三个调用点（emit / logger / logWarn 在 apply 内缺 webServer 分支）——**行号以本项 `line` 字段为唯一事实源**（原 note 内嵌的 emit/logger 行号副本已按 COMPAT-014 B-N2 删除：该形态**无「现」字**，逃过旧守卫 `/现\\s*L\\d/`，属 B-N2 放宽词法的直接动因）' },
    { face: 1, item: '1.11', kind: 'import', symbol: '@deepseek-ai/dsh-tools 具名导出 defineTool + inject=[\'tools\'] + ctx.tools.register(defineTool(...)) ×11 工具', file: 'lib/tools.js', line: 'L17 / L22 / L46', necessity: 'required', note: '工具行本质依赖；defineTool 为薄包装、可特性检测降级直传（轴①，收益小）。**范围口径（REVIEW-COMPAT-004-R1 F7）**：`lib/index.js` 宿主调用 100% 收口；`lib/tools.js`（即本项）按轴①独立评估，**不在边界层**——任何「100% 收口」表述均以 lib/index.js 为限' },

    // ── 面 2 — 客户端 API 面（13 项）──
    // 行号重基（COMPAT-005 D1）：本文件新增诊断面板（约 +350 行，均落在面 2 段之前）⇒ 面 2/3 全部
    // file/line 由**机械偏移**重基并逐项实读复核（起点/终点 MUST 为真实代码行，面 2 为严格面）。
    // 行号重基（UX-060）：lib/client.js 新增「创作台告警流式可读面」（i18n 键 / NOTICE_INLINE_MAX 常量 /
    // SplitWorkspace 形态裁决与实测升级 / 告警条渲染 / .nv-notice 样式——共 5 段插入）⇒ 面 2 七条范围
    // 锚点由**机械偏移**重基并逐项实读复核：本段之前的插入点净 **+9 行**（2.10 / 2.11），中后段插入点
    // 净 **+82 行**（2.3 / 2.12 / 2.13 ⇒ 与前者合计 +91）。重基判据 = 旧范围首/末**非空行精确文本**在新
    // 文件中定位、首末 Δ 自洽（两侧独立取值一致）后取同一偏移；无 item 增删、无 kind/necessity/symbol
    // 变更、无 face 计数变化、未触碰 item 5.3/5.4/5.6（CLEAN-005 既定范围）。**范围外披露**：面 3 其余
    // 条目（3.2/3.3/3.4/3.6/3.7/3.8）的行段同受上述偏移影响，但不在本次授权范围内 ⇒ 未在本次入册，
    // 留 CLEAN-005 承接全量复核（现状即「未入册的陈旧副本」，不因本次重基而新增失真）。
    { face: 2, item: '2.1', kind: 'module-loader', symbol: "window.__ModuleLoader__.load({id:'dsh-novel-writing', factory})（客户端模块注册约定）", file: 'lib/client.js', line: 'L92-94', necessity: 'required', note: 'dsh-client-modules 强制单 id 注册' },
    { face: 2, item: '2.2', kind: 'import', symbol: "require('react')（factory 内，宿主提供的 react）", file: 'lib/client.js', line: 'L97', necessity: 'required', note: '受宿主「单 factory」约束——react 只能在 factory 内 require（本项无独立范围形态；面 2 范围条目数由 smoke ⑫b golden 锁定为 11——**COMPAT-014 C-F-2 订正**：非单段范围形态者实为 **2.2（本项，`L97` 单行号）与 2.4（多段）**，原记「2.3/2.4」有误：2.3 `L4804-L4806` 命中 `^L\\d+-L?\\d+$` 属**单段范围**条目）' },
    { face: 2, item: '2.3', kind: 'inject', symbol: "inject = ['slots']（硬依赖仅 UI 挂载通道）+ connection/locale 转**可选探测**（apply 期 ctx.get 惰性判定，缺席降级不崩溃）", file: 'lib/client.js', line: 'L5130-5132', necessity: 'consolidatable', incident: 'BUG-004', note: '行号重基（COMPAT-005）。**note 口径（REVIEW-COMPAT-005-R1 F5）**：本 note 不内嵌「现 L…」行号——行号以本项 `line` 字段为唯一事实源（内嵌副本在后续重基后必然残留旧值，3.1/3.6/1.8 即实例）；起点取**声明行本体**（A3 说明注释块为前导，面 2 严格面要求边界为代码行）。COMPAT-004 A3 已执行（DEC-026）：原三服务硬声明使插件在无 connection/locale 的宿主上不挂载——现收敛为 slots 硬依赖 + ctx.get 惰性探测（宿主 cordis get() 对未提供服务返回 undefined，非抛错）；legacyApi 回退分支零改动（见 2.4）；残余收敛方向 = 轴① A1 版本矩阵（COMPAT-006）。**行号重基（UX-060）**：告警流式面新增段落在本项之前 ⇒ 机械偏移 +91，起止逐行实读复核（起点仍为声明行本体）' },
    { face: 2, item: '2.4', kind: 'api-call', symbol: 'connection.api（旧宿主 ≤0.1.x API 回退，全文件唯一特性检测点）', file: 'lib/client.js', line: 'L770 / L801 / L817 / L826 / L865 / L874', necessity: 'adapted', incident: 'BUG-004', note: 'makeHostApi 单点收口；代码级引用恰 1 处（EVD-077 审查复核 + smoke 断言）。行号重基（COMPAT-005；**note 不内嵌行号**——以本项 `line` 字段为唯一事实源；六处 legacyApi 回退返回逐点实读）' },
    { face: 2, item: '2.5', kind: 'remote-namespace', symbol: 'remote.settings（describe/update/mutate；位置参数 + expectedRevision acceptsUndefined 形状）', file: 'lib/client.js', line: 'L792-802', necessity: 'required', incident: 'BUG-004', note: '12 组形状映射之一（makeHostApi）。行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本；终点取闭合 `},` 保持面内无缝隙）' },
    { face: 2, item: '2.6', kind: 'remote-namespace', symbol: 'remote.session（create/prompt/cancel；requestId 必填铸造 mintRequestId）', file: 'lib/client.js', line: 'L803-811', necessity: 'required', incident: 'BUG-004', note: '行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本；起点由 BUG-004 注释块内行修正为 getter 行本体）' },
    { face: 2, item: '2.7', kind: 'remote-namespace', symbol: 'remote.workspace + workspaces 快照服务（list=getSnapshot/subscribe、phase pending→ready、awaitWorkspacesReady 订阅等待）', file: 'lib/client.js', line: 'L819-846', necessity: 'required', incident: 'BUG-004', note: '行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本；终点取 workspace getter 闭合行，不侵入 2.8 的 getter）' },
    { face: 2, item: '2.8', kind: 'remote-namespace', symbol: 'remote.directoryPicker（pick string→{path} 包装 / createDirectory / list）', file: 'lib/client.js', line: 'L847-866', necessity: 'required', incident: 'BUG-004', note: '行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本）' },
    { face: 2, item: '2.9', kind: 'remote-namespace', symbol: 'remote.agentPresets（select 两参位置）', file: 'lib/client.js', line: 'L867-876', necessity: 'required', incident: 'BUG-004', note: '行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本；起点由前项注释尾行修正为 getter 行本体）' },
    { face: 2, item: '2.10', kind: 'reactive-store', symbol: 'sessions.list ObservableSnapshot（getSnapshot/subscribe 形状校验，makeSessionsHookReactive 内前段）', file: 'lib/client.js', line: 'L1449-1548', necessity: 'required', incident: 'BUG-005', note: '会话状态镜像（零轮询）。行号重基（COMPAT-005；整函数跨度不变——行号以本项 `line` 字段为唯一事实源，note 不内嵌副本）。**行号重基（UX-060）**：告警流式面 i18n/常量新增段落在本项之前 ⇒ 机械偏移 +9，整函数跨度不变（逐行实读复核）' },
    { face: 2, item: '2.11', kind: 'api-call', symbol: 'launcher.sessions（sessions.open(sessionId) 打开/切换会话）', file: 'lib/client.js', line: 'L1576-1603', necessity: 'required', note: '行号重基（COMPAT-005；起点回到控制器对象声明行 `const launcher = {`（原值起点落在无关行，⑫b 判据①③自 004-R1 起即报偏移）——终点取 open() 闭合行，⑤b 构造闭合落在范围内；行号以本项 `line` 字段为唯一事实源）。**行号重基（UX-060）**：告警流式面新增段落在本项之前 ⇒ 机械偏移 +9，起点仍为控制器对象声明行、终点仍为 open() 闭合行（逐行实读复核）' },
    { face: 2, item: '2.12', kind: 'event', symbol: "ctx.on('internal/service')（单一监听器三消费：locale 重快照 + launcher 重 setup + hook.refresh）", file: 'lib/client.js', line: 'L5160-5167', necessity: 'required', incident: 'BUG-004+BUG-005', note: 'cordis 4.x 事件（EVD-077 实证）；服务缺席↔到位自愈。**描述订正（COMPAT-013 F-4，只读 client.js 逐行实读）**：原记「单一监听器**双消费**（launcher 重 setup + hook.refresh）」已 stale——REVIEW-COMPAT-004-R1 F2 为 locale「后到」自愈在同一监听器内加了 `locale` 分支（`snapshotLocale(ctx)` + `rerender()`），实为 **3 消费者**（locale 分支 / launcher 重 setup / hook.refresh）。**行号重基（COMPAT-005）**：行号以本项 `line` 字段为唯一事实源（note 不内嵌行号副本）；起点取声明行 `const offServiceEvent = …` 本体（旧值起点落在无关 UX-026 注释行上，⑫b 判据①③自 004-R1 起即报偏移）。**行号重基（UX-060）**：告警流式面新增段落在本项之前 ⇒ 机械偏移 +91，起点仍为 `const offServiceEvent = …` 声明行本体（逐行实读复核）' },
    { face: 2, item: '2.13', kind: 'slot', symbol: "ctx.slots.inject('settings.section'|'sidebar.footer.action'|'shell.overlay') + ctx.slots.register({name,id,order,label}) ×6 注册", file: 'lib/client.js', line: 'L5197-5229', necessity: 'required', note: 'UI 挂载槽位名约定，无替代挂载通道；槽位名稳定性 TP-2 待验证。**行号重基（COMPAT-005）**：行号以本项 `line` 字段为唯一事实源（note 不内嵌行号副本）；6 处 `ctx.slots.inject(...)` 与 6 处 `ctx.slots.register(...)` 全部落在范围内（judge ⑤a 计数 6 ≡ 6），终点取末次 register 的 `))` 闭合行。**N3 行为边界（REVIEW-COMPAT-004-R2，COMPAT-005 登记）**：宿主侧槽位**标签**（本项 label()）的刷新依赖「宿主在 locale 变化后重渲染自身 shell」——本侧已保证**必要条件**（label 为渲染期惰性取值，smoke ④b 实测 zh⇒en），但「宿主会重渲染」这一前提**在本仓无证据（前提未证实）**：若宿主不重渲染 shell，宿主侧标签滞后到下一次自然重渲染（自有 React 组件经 store 空通知已即时刷新）。**N4 已知边界（同轮，COMPAT-005 登记）**：locale 服务**撤离**时保持最后一次快照（不强行回退 zh——避免宿主热重载期间标签抖动），撤离同样触发一次空重渲染（无害）。**行号重基（UX-060）**：告警流式面新增段落在本项之前 ⇒ 机械偏移 +91；6 处 `ctx.slots.inject(...)` / `ctx.slots.register(...)` 仍全部落在范围内（⑤a 计数 6 ≡ 6），终点仍为末次 register 的 `))` 闭合行（逐行实读复核）' },

    // ── 面 3 — 宿主 DOM/前端约定面（8 项）──
    // 行号重基（COMPAT-005 D1，同面 2）：均 +350（面板插入点位于本段之前）。
    // 行号重基（UX-060，同面 2）：3.1 / 3.5 按 +9 重基（插入点位于本段之前）；面 3 其余条目未在本次
    // 授权范围内 ⇒ 保持原值（见上方面 2 重基注记的「范围外披露」）。
    { face: 3, item: '3.1', kind: 'dom-selector', symbol: "document.querySelectorAll('[data-phase]')（findConversationRoot：phase=active 优先 + children≥2 + 排除 TEXTAREA/INPUT）", file: 'lib/client.js', line: 'L1075-1083', necessity: 'required', incident: 'RISK-003', note: '宿主无官方布局 API；dsh-worktable 同款约定；null → 不做布局降级（实读同函数内 null 分支）。行号重基（COMPAT-005）。**note 口径（REVIEW-COMPAT-005-R1 F5）**：不内嵌「现 L…」行号（行号以 `line` 字段为唯一事实源）；起于 JSDoc `/**` ——非严格面合法注释起段，由 smoke ⑫d golden 锁定。**行号重基（UX-060）**：告警流式面新增段落在本项之前 ⇒ 机械偏移 +9，起点仍为 JSDoc `/**` 注释行（非严格面合法注释起段计数 2 不变）（逐行实读复核）' },
    { face: 3, item: '3.2', kind: 'dom-structure', symbol: 'root.children[0]=header / root.children[1]=viewArea 结构假设', file: 'lib/client.js', line: 'L1138-1139 / L1222', necessity: 'required', incident: 'RISK-003', note: 'undefined 检查降级（同函数内早退返回 false）。行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本）' },
    { face: 3, item: '3.3', kind: 'layout-technique', symbol: 'margin 挤压（marginLeft/Right/Top + width 双压——UX-018 修复：margin 不触发宿主响应式重排，需显式 width）', file: 'lib/client.js', line: 'L1150-1153 / L1230-1235 / L1287-1289', necessity: 'required', incident: 'RISK-003 + UX-018', note: 'dsh-worktable 同款；saved* 原值恢复机制完备 + 让位观察器（同文件后段）。行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本）' },
    { face: 3, item: '3.4', kind: 'css-token', symbol: '宿主设计令牌：--dsw-alias-* 族（TK 令牌表 + NV_STYLE 全量 var(--dsw-alias-*, 兜底值) + color-mix 派生）+ --dsw-shadow-lv2（弹窗阴影，带兜底）', file: 'lib/client.js', line: 'L925-938 / L4781 / L4924', necessity: 'required', note: '全文件去重令牌名恰 13 个 = alias 族 12 + shadow 族 1（REVIEW-COMPAT-002-R1 F2 修订：族外盲区关闭，见 regionLiterals.cssTokens）；TK 表（见本项 `line` 字段首段）仅含 11 个去重 alias 名，第 12 个 `--dsw-alias-bg-elevated` 与 `--dsw-shadow-lv2` 出自 NV_STYLE 的 `.nv-cmodal` 段（`--dsw-shadow-lv2` 另见于 `.nv-modal` 段）；兜底取值对齐 dsh-worktable styles.ts；令牌稳定化 TP-3 待验证。**行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本）**：新增 D1 面板样式未引入族外令牌' },
    { face: 3, item: '3.5', kind: 'dom-interop', symbol: ".ta_splitClose 类名点击 + 'dsh:split-claim' CustomEvent（与 dsh-worktable 跨插件分栏互操作）", file: 'lib/client.js', line: 'L1125-1137', necessity: 'optional', note: '生态约定非宿主官方；try/catch 包裹 + claim 监听让位（让位段 = `apply` 内 `claimHandler` 段，与 2.12 的 `offServiceEvent` 同区）。**行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本）**；起于互操作说明前的空行段——非严格面合法起段，由 smoke ⑫d golden 锁定（恰 2 处之一，另一处 = 3.1 的 JSDoc）。**行号重基（UX-060）**：告警流式面新增段落在本项之前 ⇒ 机械偏移 +9，起点仍为空行段、终点仍为 `.ta_splitClose` 点击行（逐行实读复核）' },
    { face: 3, item: '3.6', kind: 'dom-observer', symbol: "ResizeObserver + MutationObserver(attributeFilter:['data-phase'])（DOM/尺寸变化跟随重锚定）", file: 'lib/client.js', line: 'L1164-1188 / L3921', necessity: 'required', incident: 'RISK-003', note: '探测的是变化后的自救，不是宿主约定的变更探测。行号重基（COMPAT-005）。**note 口径（REVIEW-COMPAT-005-R1 F5）**：不内嵌「现 L…」行号（行号以 `line` 字段为唯一事实源——原内嵌副本为字段旧值，残留即成 stale）' },
    { face: 3, item: '3.7', kind: 'storage-key', symbol: "localStorage 键：dsh.novel.split.v1 / dsh.novel.defaults.v1 / dsh.novel.order.v1", file: 'lib/client.js', line: 'L884-886 等', necessity: 'own', note: '自有口径统一=1 项（REVIEW-COMPAT-001-R1 F10）：插件自有点、无宿主耦合，列出为完整性。行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本；本项非范围形态，不入 ⑫b 范围条目计数）' },
    { face: 3, item: '3.8', kind: 'dom-selector', symbol: "findSidebarEl() 侧栏探测：抽屉挂载点向上找 aside/nav 标签 + 宿主类名正则 /SidebarRoot|sidebar/i + document.querySelector('aside, nav, [class*=\"SidebarRoot\"], [class*=\"sidebar\"]') 兜底", file: 'lib/client.js', line: 'L3018-3028', necessity: 'required', incident: 'RISK-003', note: 'REVIEW-COMPAT-002-R1 F1 补录（§3 底稿未列、面 3 分布 7→8）：宿主侧栏类名/结构变更时契约面原为零信号；dsh-worktable 同款 findSidebar 约定；返回 null → 几何回退 left=280 默认值且不监听侧栏尺寸（降级无白屏）。行号重基（COMPAT-005；行号以本项 `line` 字段为唯一事实源，note 不内嵌副本）' },

    // ── 面 4 — 安装与注册机制面（6 项）──
    { face: 4, item: '4.1', kind: 'install-detection', symbol: 'profiles/<Profile>/package.json 存在 = dsh ≥0.1.5 新布局（安装通道分流特征检测）', file: ['install.ps1', 'install.sh'], line: 'L136-147 / L60-70', necessity: 'required', incident: 'BUG-006', note: 'BUG-006 修复引入；隔离演练双布局+变体+降级（EVD-081）。**COMPAT-009 单点清单**：两脚本头部的「宿主布局契约」块（固定标记行 `host-contract:v1`）逐条登记本特征名等约定，由 probe-face ⑧ 在 sanity 内与契约对账（防「脚本知识 vs 契约声明」静默漂移）；行号以本项 `line` 字段为唯一事实源。**行号重基（COMPAT-015）**：两脚本头部各插入 13 行注释（纯注释、无可执行语句）⇒ face 4/5 两处行段 +13' },
    { face: 4, item: '4.2', kind: 'install-link', symbol: 'junction/symlink 接入（新=profile 私有 node_modules；旧=全局；失败回退拷贝）', file: ['install.ps1', 'install.sh'], line: 'L141-190 / L71-86', necessity: 'required', incident: 'BUG-006', note: '幂等二跑字节级零漂移（EVD-081）。**COMPAT-009**：接入通道名（junction/symlink）登记于两脚本头部契约块 [4.2] 并与本项 symbol 对账（probe-face ⑧）；行号重基 +13（COMPAT-015）' },
    { face: 4, item: '4.3', kind: 'install-register', symbol: 'profile package.json dependencies.dsh-novel-writing=file:<src> + dsh.profile.bundles 追加（幂等三分支）', file: ['install.ps1', 'install.sh'], line: 'L192-251 / L88-199', necessity: 'required', incident: 'BUG-006', note: 'PS 5.1 自研 JSON 序列化器（L49-101）；sh 端 node -e→python3→降级三档；三套注册实现维护成本 P2-4。**COMPAT-009**：注册通道名（dependencies.dsh-novel-writing + dsh.profile.bundles）登记于两脚本头部契约块 [4.3] 并逐段对账本项 symbol（probe-face ⑧）；行号重基 +13（COMPAT-015，含 note 内序列化器行段）' },
    { face: 4, item: '4.4', kind: 'install-register', symbol: 'cordis.patch.yml insert 行兜底（[] 空根/已有 insert 块/无 insert 三形态）+ 仓库自带 cordis.patch.yml dual-face 行声明', file: ['install.ps1', 'install.sh', 'cordis.patch.yml'], line: 'L253-317 / L201-218 / L10-12', necessity: 'required', incident: 'BUG-006', note: '注册兜底双保险（EVD-080 实证 B 路径独立有效）。**COMPAT-009**：兜底注册通道名（cordis.patch.yml）登记于两脚本头部契约块 [4.4] 并与本项 symbol 对账（probe-face ⑧）；行号重基 +13（COMPAT-015）' },
    { face: 4, item: '4.5', kind: 'install-preset', symbol: '$DSH_HOME/.agent-presets/novel-writing/ 预设同步 + settings.yaml 默认节写入 + 服务端 ensurePreset（.dsh-bundle-version 标记 + staging 原子换入）', file: ['install.ps1', 'install.sh', 'lib/index.js'], line: 'L319-352 / L220-245 / L163-189', necessity: 'required', incident: 'BUG-006（间接）', note: 'BUG-006 间接触发（EVD-080：宿主 router 掉线致 settings.yaml agent-presets.default 失效——环境侧连锁）；F9 行段合并来源：§3 原分段 install.ps1 L319-329 + L331-352 → 本行 L319-352、install.sh L220-229 + L231-245 → L220-245（中间行属同段功能，非新增落点）、第三段 = lib/index.js ensurePreset（COMPAT-004 后 L163-189，原 L157-184；其中预设根路径构造已移至 lib/host-boundary.js presetRoot/presetDir L98/L103）。行号重基 +13（COMPAT-015：两脚本头部插入 13 行纯注释）' },
    { face: 4, item: '4.6', kind: 'manifest-field', symbol: 'package.json dsh 专有字段（dsh.bundle.patch=./cordis.patch.yml、dsh.client.platform=web、dsh.client.inject=[dsh-client-ui-settings, dsh-client-locale, dsh-api-remotes]）', file: ['package.json'], line: 'L17-29', necessity: 'required', incident: 'BUG-004', note: 'BUG-004 修正过：移除不存在的 dsh-client-runtime；CI 结构检查（ci.yml `sanity` 的包结构检查步骤——不内嵌行号，见 1.1 的 B-N2 口径）。**范围口径**：本项为 JSON 根级构造（`"dsh": {` 起、L29 闭合），首行即构造键行 ⇒ 由 COMPAT-014 C-F-4 判据⑥（范围首行构造闭合行 ≤ 止）持续约束。**⑤b 对本项的覆盖为偶然且不完整（COMPAT-014 实测订正 REVIEW-COMPAT-013-R1 F-4 的静态推演）**：F-4 称「键名 `dsh` 落在 COMMON_WORDS 内被剔除 ⇒ 无候选 ⇒ ⑤b 无 opener」，实测 ⑤b 经裸词候选 `client` 命中内层 `"client": {`（L21）——故止改 L21 时 ⑤b 亦红；但**止改 L28**（外层 `"dsh": {` 缺自身闭合行、内层仍闭合）时 ⑤b **green** 而判据⑥ 红（三例实测表见 CHANGELOG COMPAT-014）' },

    // ── 面 5 — 预设与 manifest 面（5 项）──
    { face: 5, item: '5.1', kind: 'preset-manifest', symbol: 'preset.yml name=小说写作工作流 / description（宿主预设选择器消费的清单格式）', file: 'agent-presets/novel-writing/preset.yml', line: 'L1-2', necessity: 'required', note: 'validate-preset 29 项（ci.yml `sanity` 的 validate-preset 步骤）' },
    { face: 5, item: '5.2', kind: 'preset-packages', symbol: 'agent.cordis.yml 16+ 宿主包行（dsh-persona / dsh-agent-instructions / dsh-tool-bash·pwsh·fs·fs-search·jobs / dsh-skill-filesystem / dsh-tool-skill / dsh-tool-goal / dsh-plan-mode / dsh-compaction×3 / dsh-tool-subagent×5 / dsh-workflow-worker-thread / dsh-tool-workflow / dsh-tool-ralph / dsh-tool-ask-user / dsh-tool-todo / dsh-tool-web）', file: 'agent-presets/novel-writing/agent.cordis.yml', line: 'L16-216', necessity: 'required', note: 'AGENT-PLANE 组合（预设=宿主包组合，本质依赖）；可选依赖设计良好（L88-89 tool-novel 未装静默）；包行名稳定性 TP-2 同类待验证' },
    { face: 5, item: '5.3', kind: 'preset-yaml-eval', symbol: "!!js 表达式（process.platform / process.getBuiltinModule('node:url')——cordis YAML 求值约定，平台分流/skill 目录解析）", file: 'agent-presets/novel-writing/agent.cordis.yml', line: 'L52 / L56 / L81', necessity: 'required' },
    { face: 5, item: '5.4', kind: 'preset-skill-dirs', symbol: 'skill-filesystem customSkillDirs + baseUrl 相对解析（26+ SKILL 目录加载约定）', file: 'agent-presets/novel-writing/agent.cordis.yml', line: 'L77-81', necessity: 'required', note: 'validate-preset + CI skills≥25 检查（ci.yml `sanity` 的包结构检查步骤）' },
    { face: 5, item: '5.5', kind: 'preset-location', symbol: '$DSH_HOME/.agent-presets/<preset-id>/ 预设目录约定（install 同步 + index.js ensurePreset 双端落地）', file: ['install.ps1', 'install.sh', 'lib/index.js'], line: 'L319-329 / L220-229 / L163-189', necessity: 'required', incident: 'BUG-006（环境连锁，见 4.5）', note: '版本标记幂等；F9 来源注记：本行段为 §3 原始分段（仅预设目录同步子面），4.5 因含 settings.yaml 默认节写入而合并为 L319-352 / L220-245——两者并列非重复计数；COMPAT-004 后 lib/index.js 段 = ensurePreset L163-189（原 L157-184），目录路径构造在 lib/host-boundary.js presetRoot/presetDir L98/L103。**COMPAT-009**：预设目录约定（.agent-presets/<preset-id>/）登记于两脚本头部契约块 [5.5] 并与本项 symbol 对账（probe-face ⑧）；行号重基 +13（COMPAT-015）' },
    // BUG-007（2026-09-13）：宿主 @deepseek-ai/dsh-persona 0.1.5-rc.2 把 Config 收紧为 `prefix` 必填，
    // 本仓 persona 行仍写 `text` ⇒ 该行 config 校验失败 ⇒ **整棵预设挂载被否决**（用户两条消费路径同时失败：
    // 工作台「继续工作流／绑定新会话」（agentPresets.select / resume）与宿主预设切换器（读同一份
    // $DSH_HOME/.agent-presets/novel-writing/agent.cordis.yml 后 apply loader entry））。本项把「本行使用的
    // config 键集」登记为宿主耦合字面量（P-10：新增/变更宿主耦合字面量 MUST 入册 + smoke 对账）。
    { face: 5, item: '5.6', kind: 'preset-row-config', symbol: '@deepseek-ai/dsh-persona 行 config 键契约：keys = prefix / suffix / complete / includeRuntimeContext；requiredKeys = prefix（人设正文，渲染为 deployment:persona-prefix 段）；本仓只写 prefix（complete 缺省 = false，人设作为一段参与组装）', file: 'agent-presets/novel-writing/agent.cordis.yml', line: 'L16', necessity: 'required', incident: 'BUG-007', note: '权威判定 = test/fixtures/host-surfaces/preset-schema-face.mjs（用**已装** dsh 插件自身 Config + 解析出的 cordis resolveConfig 逐行核对，零 schema 复制；Check 28v 同源思路），接入 test/validate-preset.mjs 第 4 段（三态 PASS/FAIL/NOT_RUN）与 CI（validate-preset 步骤）。**键集权威来源（只读实测 2026-09-13）**：@deepseek-ai/dsh-persona@0.1.5-rc.2 lib/index.js L23-28（Config = z.object({ prefix: required, suffix: default "", complete: default false, includeRuntimeContext: default true })）+ lib/types/index.d.ts L24-40（prefix = 渲染 deployment:persona-prefix 段；complete = 令 prefix 成为完整 system prompt）。`complete` 取值依据 = schema 默认 false + 同族先例（治理插件 agent-presets/governance/agent.cordis.yml.template L45-48 只写 prefix）。契约本项只登记**本行使用的键集**（不是 schema 副本）——smoke 以「组合文件提取的键集 ⊆/≡ 本项 keys」双向对账（离线可跑，宿主平面缺席的 CI 亦有效）；宿主若再改键名，preset-schema-face 的 CONFIG_INVALID 与 smoke 键集对账分别在本机/CI 报红' },

    // ── 面 6 — 版本与环境面（5 项）──
    { face: 6, item: '6.1', kind: 'version-policy', symbol: 'peerDependencies 全 *（cordis / schemastery / dsh-settings / dsh-home-paths / dsh-tools）', file: 'package.json', line: 'L39-45', necessity: 'improvable', note: '* = 不设限=不设防（无下限=隐式信任任意未来版本）；junction 共享 profile node_modules 保证闭包内一致；CI 依赖架构守卫（ci.yml `sanity` 的依赖架构守卫步骤——不内嵌行号，见 1.1 的 B-N2 口径）；四次事故都在 * 口径下发生。**范围修正（COMPAT-013 F-1，只读 package.json 逐行实读）**：原 `L38-44` 起点为**无关兄弟键** `"dependencies": {},`(L38)、终点漏构造闭合行 `}`(L45) ⇒ 真值 **L39-45**（L39 `"peerDependencies": {` 起、L45 `}` 闭合；L46 `}` 为根对象）。该形态原为 F5d ①②③④ 四项判据共同盲区（②只看范围内是否有候选命中、③不覆盖面 6、④终点非点号调用起行 ⇒ 真空），现由判据⑤b（对象构造块闭合行 ≤ 止）与判据⑥（首行构造闭合，C-F-4）双重持续约束' },
    { face: 6, item: '6.2', kind: 'version-policy', symbol: 'engines.node>=20（运行时下限）', file: 'package.json', line: 'L8-10', necessity: 'required', note: '无 enforcement（npm warn 级）' },
    { face: 6, item: '6.3', kind: 'version-matrix', symbol: '隐式支持版本矩阵：0.1.x 旧表面（connection.api 回退）+ 0.1.2-rc.1（remote.*）+ 0.1.5-rc.1（profile 布局）——双表面×双布局', file: null, line: null, necessity: 'improvable', incident: 'BUG-003/004/005/006', note: '矩阵未显式声明（README 未列）；旧表面支持是隐式承诺——DEC-025 轴③ 落地后由本契约承载显式化' },
    { face: 6, item: '6.4', kind: 'ci-mock', symbol: 'CI 宿主替身表面（cordis Service mock / dsh-settings mock / dsh-home-paths mock / dsh-tools mock + schemastery 真包）', file: '.github/workflows/ci.yml', line: 'L105-146', necessity: 'adapted-drift', incident: 'BUG-003（温床）', note: '§3 记录时 dsh-settings mock 仍导出已删除的 settingsNamespace（≠ 真实 0.1.5-rc.2 导出面）——该漂移已由 COMPAT-010 修正（CHANGELOG [Unreleased]）；对账以 ci.yml 实状为准；COMPAT-003 起 sanity 新增 mock 面钉步骤（ci.yml `sanity` 的 mock 面钉步骤，静态面）与 smoke 动态 import 双法互证（见 hostSurface.ciMock）。**行段重基（COMPAT-014）**：`L77-113` → **`L96-137`**（本批 A-F1/A-F2 在 sanity 头与步骤面插入约 19 行 ⇒ host-logic 段整体位移；新行段 = mock 注释块起至 dsh-tools 包壳 printf 止，覆盖 4/4 mock 定义 + schemastery 真包安装）；**再重基（COMPAT-015）**：sanity 步骤面新增 probe-host 语法检查与离线自检步骤 ⇒ `L96-137` → **`L105-146`**（+9）' },
    { face: 6, item: '6.5', kind: 'env-fact', symbol: '宿主升级通道：npx @deepseek-ai/dsh → npm latest（rc 版直接打 latest tag；0.1.2-rc.1→0.1.5-rc.1 跳变实证 EVD-080；npx 缓存 per-闭包）', file: null, line: null, necessity: 'awareness', incident: 'BUG-006（触发路径）', note: '插件无法控制宿主何时升级——升级不可预测' },
  ],

  // regionLiterals —— 可机检字面量对账面（smoke 双向 ⊆：源码提取面 ≡ 本清单，任一侧增删必红）。
  // 提取口径（REVIEW-COMPAT-002-R1 F8 登记项——口径本身即契约自述，避免「提取面比宣称窄」的静默盲区）：
  //   ① 仅**单引号**字面量入册（双引号/模板串/变量拼接的选择器不在提取面内——新增时 MUST 手动入册并补对账断言）；
  //   ② DOM selector 仅取 querySelector(All) 的**首个单引号实参**（closest / getElementById / matches 均不在面内）；
  //   ③ 自有前缀 `.nv-` 一律排除（插件自有 DOM，非宿主耦合）；
  //   ④ CSS 令牌族 = `--dsw-alias-*` + `--dsw-shadow-*`（其余宿主令牌族未入册；F2 修订：原仅 alias 族 12 项 → 现 13 项）；
  //   ⑤ 提取前先剥注释（codeOnly）——注释中的字面量不算代码级依赖。
  regionLiterals: {
    file: 'lib/client.js',
    slotNames: ['settings.section', 'sidebar.footer.action', 'shell.overlay'],
    serviceNames: {
      // COMPAT-004 A3：inject 只列**硬依赖**（slots）；connection/locale 已降为可选探测 → 提取面落入 ctxGet
      //（提取口径 = 源码 `ctx.get('名')` 字面目标，probeService 包装内同口径；见 2.3 与 smoke ⑥⑦ 双向对账）。
      inject: ['slots'],
      ctxGet: ['connection', 'locale', 'sessions'],
      svcDomains: ['remote.settings', 'remote.session', 'remote.workspace', 'workspaces', 'remote.directoryPicker', 'remote.agentPresets'],
      events: ['internal/service'],
    },
    cssTokens: [
      '--dsw-alias-border-l1',
      '--dsw-alias-border-l2',
      '--dsw-alias-fill-l1',
      '--dsw-alias-label-primary',
      '--dsw-alias-label-secondary',
      '--dsw-alias-label-tertiary',
      '--dsw-alias-state-accent-primary',
      '--dsw-alias-state-success',
      '--dsw-alias-state-danger',
      '--dsw-alias-state-warning',
      '--dsw-alias-bg-base',
      '--dsw-alias-bg-elevated',
      '--dsw-shadow-lv2',
    ],
    domSelectors: ['[data-phase]', '.ta_splitClose', 'aside, nav, [class*="SidebarRoot"], [class*="sidebar"]'],
  },

  // presetRowConfig —— 预设行的 config 键（**宿主耦合字面量入册**，P-10；BUG-007 引入）。
  // 语义：每行 = 一个组合文件行的 config 键声明——
  //   keys         = 宿主插件 Config schema 声明的键全集（只读实测来源见该项 source）
  //   requiredKeys = schema 声明的必填键
  //   usedKeys     = 本仓组合文件**实际写入**的键（P-10 登记面）
  // 消费方：test/smoke.mjs「组合文件提取键集 ≡ usedKeys」双向 ⊆ 对账（离线文本提取 ⇒ 宿主平面/
  // npm 依赖缺席的 CI sanity 亦有效，正是 BUG-007 的 CI 侧回归信号）；权威校验 = 「预设行 × 已装
  // 宿主 Config schema」机检 test/fixtures/host-surfaces/preset-schema-face.mjs（零 schema 复制，
  // 接入 test/validate-preset.mjs 第 4 段，三态 PASS/FAIL/NOT_RUN）。
  // 纪律：**keys 不是 schema 副本**——它只声明本行依赖的键面；宿主若增删键，preset-schema-face
  // 在已装平面下报 CONFIG_INVALID，本表由人工随实测更新（漏更新 = smoke 键集对账仍绿但本机机检红，
  // 两线互不替代）。
  presetRowConfig: [
    {
      row: 'persona',
      file: 'agent-presets/novel-writing/agent.cordis.yml',
      hostPackage: '@deepseek-ai/dsh-persona',
      keys: ['prefix', 'suffix', 'complete', 'includeRuntimeContext'],
      requiredKeys: ['prefix'],
      usedKeys: ['prefix'],
      incident: 'BUG-007',
      source: '@deepseek-ai/dsh-persona@0.1.5-rc.2 lib/index.js L23-28（Config = z.object({ prefix: z.string().required(), suffix/complete/includeRuntimeContext 带默认值 })）+ lib/types/index.d.ts L24-40（prefix = 渲染为 deployment:persona-prefix 段的人设正文；complete = 令 prefix 成为完整 system prompt）；`complete` 不写 = schema 默认 false，另有同族先例（治理插件 agent-presets/governance/agent.cordis.yml.template L45-48 只写 prefix）',
    },
  ],

  // ctxGetSemantics —— 本插件依赖的宿主「取服务」语义（REVIEW-COMPAT-004-R1 F3：语义入**可对账面**，
  // 不让 lib/client.js 的注释成为唯一事实源）。复核状态如实标注：本环境无宿主 cordis 源码可及
  // （审查 A 部分：宿主目录递归 glob 与仓库 node_modules 均无 cordis/lib/index.js）⇒ status=unverified，
  // 仅间接证据；不给虚假安全感（BC-01）。消费方：smoke COMPAT-004 F3 断言 + 宿主升级适配速查。
  ctxGetSemantics: {
    api: 'ctx.get(name[, strict])',
    missingService: 'undefined（不抛错）——A3 inject 收敛（connection/locale 降为可选探测）与本语义绑定：若宿主改为抛错，缺服务的降级路径将变为 apply 抛错',
    propertyAccess: 'ctx.<service> 属性访问在未 inject 时抛「cannot get property/required service ... without inject」（与 ctx.get 形态不同；BUG-003 的实机崩溃形态即此）',
    dependent: ['lib/client.js apply 期 connection/locale/sessions 惰性取值', 'lib/host-boundary.js FACE1_PROBES 1.6 属性访问形态 / 1.8 safeGet 探测'],
    fallback: 'lib/host-boundary.js safeGet（探测期 try/catch）+ lib/client.js snapshotLocale 与 makeSessionsHookReactive（产品期 try/catch）——两种形态下均不崩',
    evidence: 'indirect-only：仓内先例（sessions 自 BUG-005 起即以 ctx.get 取非 inject 服务并在生产运行）+ 边界与客户端双侧 try/catch 兜底',
    status: 'unverified',
    risk: 'lib/index.js apply 期的 getWebServer / registerSettings 为**透传**（不吞错）——宿主若改抛错语义则 apply 抛错、无降级；本项如实记录该依赖，不假装已证实（P-01）',
    verifiedBy: 'test/smoke.mjs「COMPAT-004 F3」构造断言（safeGet 抛错兜底 + 产品路径透传不吞错两向）',
    recheck: 'COMPAT-005 复核（D1 面板落地）：本任务**未取得**宿主 cordis 源码可及性或真机观测这两类新证据——探测数据源仍是既有间接兜底路径（safeGet try/catch 两向构造断言），故 status **保持 unverified**（不因面板落地而虚假转 verified；P-01/BC-01）。转 verified 的判据：取得宿主 cordis `get()` 源码摘录（含 `without inject` 抛错分支与缺服务返回 undefined 分支）或真机观测记录，二者之一入证。',
  },

  // clientProbes —— D1 设置页「诊断」区的**客户端侧**探测面声明（COMPAT-005）。
  // 服务端 `detectHostCapabilities` 只覆盖面 1（apply 期服务端可见面）；面 2/3 属浏览器侧事实，
  // 由面板自己运行期求值。本清单登记「**面板实际探测哪些契约项**」——只登记**已实现**的探测项，
  // 未实现的面 4/5/6 与面 2/3 的其余项以 `notCovered` 数量摘要披露（**不伪造未实现面的状态**）。
  // 每个探测项 = { item（真实契约项）, probe（= lib/client.js CLIENT_PROBES 常数键）, mode, kind, note }；
  // smoke 机检：本表 item 集 ≡ CLIENT_PROBES 键集 ≡ client.js 源码提取面（**双向 ⊆**，任一侧增删必红），
  // 防「面板自列形态」自指（同 REVIEW-COMPAT-004-R1 F5 的强口径思路）。
  // **mode 口径（COMPAT-014 B-N4，收口 REVIEW-COMPAT-005-R2 N4）**：`remote-*` 五项的 mode 为
  // `runtime-service+raw-ns`——实现（COMPAT-005 R1 F1 返工）把代际判据下移到**原始服务命名空间**（`ctx.get`
  // 解析器）∧ facade 域可用（第二重肢，防「装配面失效却报可用」）；原单一值 `runtime-service` 未体现
  // 「原始 ns」肢，与本契约作为登记面事实源的职责不符（纯描述落差，非行为差异）。
  clientProbes: [
    { item: '2.4', probe: 'legacy-connection-api', mode: 'runtime-feature-detect', kind: 'api-call', note: '连接载体 .api 域对象在场性（旧宿主表面）——RB-03 代理信号的一半判据' },
    { item: '2.5', probe: 'remote-settings', mode: 'runtime-service+raw-ns', kind: 'remote-namespace', note: '判据 = 原始服务名 `remote.settings`（`update`）在场 ∧ facade 域 `api.settings`（`describe`）可用——代际判定走**原始命名空间**，facade 肢仅作「装配面可用」第二重展示' },
    { item: '2.6', probe: 'remote-session', mode: 'runtime-service+raw-ns', kind: 'remote-namespace', note: '判据 = 原始服务名 `remote.session`（`create`）在场 ∧ facade 域 `api.sessions`（`create`）可用——同上，代际判定不走 facade 形状' },
    { item: '2.7', probe: 'remote-workspace', mode: 'runtime-service+raw-ns', kind: 'remote-namespace', note: '判据 = 原始服务名 `remote.workspace`（`create`）或 `workspaces` 快照在场 ∧ facade 域 `api.workspace`（`list`）可用' },
    { item: '2.8', probe: 'remote-directory-picker', mode: 'runtime-service+raw-ns', kind: 'remote-namespace', note: '判据 = 原始服务名 `remote.directoryPicker`（`pick`）在场 ∧ facade 域 `api.host`（`pickDirectory`）可用' },
    { item: '2.9', probe: 'remote-agent-presets', mode: 'runtime-service+raw-ns', kind: 'remote-namespace', note: '判据 = 原始服务名 `remote.agentPresets`（`select`）在场 ∧ facade 域 `api.agentPresets`（`select`）可用' },
    { item: '3.1', probe: 'dom-phase', mode: 'runtime-dom', kind: 'dom-selector', note: "document.querySelectorAll('[data-phase]') 命中数——宿主会话根约定；无 DOM 时 ok=null（不判绿也不判红）" },
    { item: '3.6', probe: 'dom-observers', mode: 'runtime-dom', kind: 'dom-observer', note: 'ResizeObserver/MutationObserver 构造子在 browser 环境在场性（DOM 变更自救能力的基础设施）' },
  ],
  clientProbesNote: '本清单 = D1 面板**已实现**的客户端探测项（面 2 六项 + 面 3 两项）。契约 48 项中，服务端面 1 探测 11 项（含未探测项如实披露）、客户端探测 8 项，其余 29 项以 notCovered 数量摘要披露（面 4 六项 / 面 5 五项 / 面 6 五项 / 面 2 余七项 / 面 3 余六项）——不伪造未实现面的状态。服务端报告经既有 webServer 路由 `/novel-writing/api/compat` 单一出口送达面板（lib/index.js，只读、载荷无 file/line/paths）；报告内原因字段（`probes[].code` / `unprobed[].code` / `notCovered[].code`）与 `host` 段（`version: null` + `versionCode` 枚举码）**均已枚举化**——人类可读文案只在客户端 i18n，不出网关（COMPAT-014 B-N3）。',

  // hostSurface —— 宿主表面 fixtures 离线对账声明（COMPAT-003；DEC-025 轴③「固定三版本表面快照入仓」落地）。
  // fixtures 位于 test/fixtures/host-surfaces/*.json，由同目录 extract.mjs 从真实包只读提取
  // （npm pack tarball 解包 / 已安装宿主闭包），每份头部 source 如实标注来源（真实包提取 vs 证据构造）；
  // 本次三份均为真实包提取（registry 可达：npm view 只读元数据成功），未 install、未执行宿主代码、未写宿主目录。
  // 版本命名按实际：CLI dsh 0.1.5-rc.1 的闭包内 @deepseek-ai/dsh-* 子包实测为 0.1.5-rc.2。
  // smoke 断言：requiredExports ⊆ 各 fixture 对应包导出面 + versionFacts 三版本 golden + ciMock 面钉（F1）。
  hostSurface: {
    fixturesDir: 'test/fixtures/host-surfaces',
    current: '0.1.5-rc.2',
    packages: {
      '0.1.1-rc.2': ['dsh-settings', 'dsh-api-gateway', 'dsh-client-modules', 'dsh-client-connection', 'dsh-home-paths', 'dsh-tools'],
      '0.1.2-rc.1': ['dsh-settings', 'dsh-api-gateway', 'dsh-client-modules', 'dsh-client-connection', 'dsh-home-paths', 'dsh-tools'],
      '0.1.5-rc.2': ['cordis', 'schemastery', 'dsh-settings', 'dsh-api-gateway', 'dsh-client-modules', 'dsh-client-connection', 'dsh-home-paths', 'dsh-tools'],
    },
    requiredExports: {
      '@deepseek-ai/cordis': ['Service'],
      '@deepseek-ai/schemastery': ['default'],
      '@deepseek-ai/dsh-settings': ['SettingsConflictError', 'SettingsProvider', 'default', 'redactSecrets'],
      '@deepseek-ai/dsh-home-paths': ['resolveDshHome'],
      '@deepseek-ai/dsh-tools': ['defineTool'],
    },
    eliminatedExports: { '@deepseek-ai/dsh-settings': ['settingsNamespace'] },
    // CI mock 面钉声明（COMPAT-011 C6 扩为 4/4）：每个 mock 的「期望导出面」= requiredExports[package]，
    // 机检不变量（ci-mock-face.mjs CLI 与 smoke ⑦⑧ 循环校验）：
    //   mock 源码静态导出面 ≡ 动态 import 键集 ≡ requiredExports[package]  ⊊  fixture[现行].packages[*].exports
    // 即「mock 既不缺我方所需面，也不导出宿主真实面之外的东西」——后者正是 BUG-003 假绿温床的结构性防线。
    ciMock: [
      { package: '@deepseek-ai/cordis', heredocTarget: 'node_modules/@deepseek-ai/cordis/index.js' },
      { package: '@deepseek-ai/dsh-settings', heredocTarget: 'node_modules/@deepseek-ai/dsh-settings/index.js' },
      { package: '@deepseek-ai/dsh-home-paths', heredocTarget: 'node_modules/@deepseek-ai/dsh-home-paths/index.js' },
      { package: '@deepseek-ai/dsh-tools', heredocTarget: 'node_modules/@deepseek-ai/dsh-tools/index.js' },
    ],
    ciMockNote: 'ci.yml 内宿主替身（mock）的运行时导出键集 MUST 恰等于 requiredExports[本包]（REVIEW-COMPAT-002-R1 F1 面钉；COMPAT-011 C6 由 dsh-settings 单面扩至 4/4）——mock 多导出宿主已删除/不存在的表面 = BUG-003 真绿假绿温床（COMPAT-010 已修正 dsh-settings 实例）。schemastery 无 mock（CI 装真包）。',
    // C5：docs/fixtures 版本一致性断言的显式例外表——这些包属独立版本族，其 version 合法地 ≠ fixture.hostVersion。
    // smoke 双向校验：①非例外包的 version MUST === hostVersion；②例外表中的包在现行 fixture 里 MUST 确实不等（防例外表腐化）。
    versionExceptions: ['cordis', 'schemastery'],
    versionFacts: [
      { version: '0.1.1-rc.2', settingsNamespaceExported: true, connectionApiDomainField: true, remoteNamespaceServicePackages: false },
      { version: '0.1.2-rc.1', settingsNamespaceExported: false, connectionApiDomainField: false, remoteNamespaceServicePackages: true },
      { version: '0.1.5-rc.2', settingsNamespaceExported: false, connectionApiDomainField: false, remoteNamespaceServicePackages: true },
    ],
    versionFactNote: '0.1.x 线（旧表面）→ 0.1.2-rc.1 的两个断点均为实机事故根因：settingsNamespace 从 dsh-settings 导出面消失 = BUG-003（ESM 具名导入 SyntaxError 致宿主启动崩溃）；dsh-client-connection 连接载体的 .api 域对象消失 = BUG-004（44 处 api.<domain> 调用面落空，迁至 remote.<ns> 服务）。remote.<ns> 服务声明包族（dsh-api-*-controller）首版为 0.1.2-alpha.2 ⇒ 0.1.x 线不存在可消费的 remote.* 表面。三标记的判定方法见各 fixture 的 markers[*].probe（静态提取 vs 注册表元数据）。',
    // C4：每个标记的「判定来源类别」——static-extract 表示由 fixture 静态提取实测（具体 origin 取值再由
    // fixture.extraction.layout 决定：packed → 'tarball-static-extract'，checkout → 'checkout-static-extract'）；
    // registry-metadata 表示由命令行注入的注册表事实。smoke ④⑤⑥ 同时校验 value 与 origin，防「注入值伪装成实测」。
    versionFactOrigins: {
      settingsNamespaceExported: 'static-extract',
      connectionApiDomainField: 'static-extract',
      remoteNamespaceServicePackages: 'registry-metadata',
    },
    // N3：fixture 字段语义（消费方口径，避免读错 classes/classAliases —— COMPAT-011 C1/C2 后语义明确化）。
    _schema: {
      'packages[p].exports': '该包入口模块的导出名集合（排序）——真实宿主导出面，非我方需求面',
      'packages[p].classes': '类名 → {extends, extendsFrom, methodNames, methodCount, methodNamesExcludedByKeyword}；methodNames 仅含类体顶层声明（COMPAT-011 C1：排除方法体内语句关键字），故 methodCount 即该类顶层成员数',
      'packages[p].classes[c].methodNamesExcludedByKeyword': "被关键字黑名单过筛的**真实**类体顶层成员（COMPAT-004 FIND-3）：[{name, line, reason:'keyword-blocklist'}]，line = 宿主原始文件行号（与 §3/审查报告口径一致）；恒存在（空数组 = 无过筛）⇒ 消费方可区分「确实不存在」与「被过筛」。**判据优先级：exports/AST > methodNames**——methodNames 有假阴性风险（被过筛的真实方法会被误报缺失）",
      'packages[p].classCount': 'classes 键数 = **导出面上**的类数（≠ 入口文件内 class 声明总数——未导出的内部类不计；同一实现经多导出名出现不重复计数，COMPAT-011 C2）',
      'packages[p].classAliases': '别名导出名 → classes 主名（如 {"default":"SettingsProvider"}）。语义：classes 的主名优先取真实类名；某类若仅以 `default` 导出则主名为 `default`（此时消费方需读 classAliases 反向还原）',
      'packages[p].methodNamesTruncated': '仅当顶层成员数 > extraction.methodCapPerClass 时出现（显式披露截断，不静默丢失）',
      'extraction.layout': "'packed'（npm pack tarball 解包布局）| 'checkout'（已安装闭包只读目录）——决定 markers[*].origin 取值（COMPAT-011 N1）",
      'markers[f].origin': "'tarball-static-extract' | 'checkout-static-extract' | 'registry-metadata'——标记值的判定来源，与 versionFactOrigins 交叉机检（COMPAT-011 C4/N1）",
    },
  },
}
