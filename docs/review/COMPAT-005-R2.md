# REVIEW-COMPAT-005-R2 — COMPAT-005（D1 诊断面板）返工复审

> **Round**：**R2**（本任务第二轮；前轮 = 本 Reviewer 同一人，round 号按 M7.4 step 4.6 连续）
> **前轮引用**：`docs/review/COMPAT-005-R1.md`（**NEEDS_CHANGE**，P0=1 / P1=1 / P2=2 / P3=5）——其 **F1~F9** + **§6 非阻断备注（6.1~6.5）** = 本轮判据；本轮**逐条比对**见 §2
> **审查对象**：返工 commit `e9d0760`（`git show --numstat` 本轮实测：`test/smoke.mjs` **+240/−47**、`lib/client.js` **+95/−24**、`lib/host-boundary.js` **+37/−14**、`lib/host-contract.mjs` **+28/−28**、`lib/index.js` **+9/−14**、`CHANGELOG.md` **+13/−1**，合计 **+422/−128**；恰 **6 路径**）
> **审查基线事实**：HEAD = `e9d0760`；**工作区非 clean**（与派发简报「工作区 clean」不符，如实订正）：`git status --porcelain` 实测 `M  .governance/evidence-log.md`、`M  .governance/plan-tracker.md`（**已 staged，未提交**）——**均非本次 6 条审查路径**，不影响本结论；6 条审查路径本体自 `e9d0760` 起未再改动
> **结论**：**APPROVED_WITH_NOTES**，**`unresolved_blockers = 0`**（P0=**0** / P1=**0** / P2=**0** / P3=**5**，全部为非阻断的守卫口径/披露精度/契约注释同步级）。R1 的 **F1（P0）与 F2（P1）经实质验证已修复**，F3~F9 **七条全部修复**；本轮新增 5 条 P3 均为 R2 自身改动的口径精度问题，**无一项回退或新阻塞**

---

## 0. 审查方法与证据边界（如实披露）

- 本轮**只读**：`read` / `grep` + 只读 git（`show --numstat`、`show <file>`、`log`、`status`）。**未执行任何测试或写操作**（角色工具约束）——`smoke 276/0`、`node --check ×9=0`、`validate-preset PASSED`、`ci-mock-face 4/4` **不由本轮独立复跑**，采信 Coordinator 复跑声明；本轮仅做**静态复算**（§4.1 断言计数、§3.1/§3.2 变异路径可复现性推演）。
- 本报告所有行号/文本 = **本轮实读**；不转写 Developer 自述。
- **未核项**：① 面板**真机/浏览器渲染**（环境无运行中宿主，与 Developer 披露③同源）；② 门禁数值（采信复跑）；③ 面板**渲染树**断言（Developer 披露①已自述在 mock 下不可达——**本轮确认为如实披露**，见 §3.3 F4）。
- 破坏性红线：不适用（唯一写入 = 本报告）。

---

## 1. 硬门槛裁决

| 门槛项 | 阈值 | 本轮实测 | 判定 |
|---|---|---|---|
| P0 阻塞问题数 | = 0 | **0**（R1 F1 已实质修复，§3.1） | ✅ |
| 5 维度全覆盖 | = 100% | 5/5 逐项结论（§5） | ✅ |
| 每条发现标注级别 | = 100% | 5/5 均标 P3（§6） | ✅ |
| 设计一致性 | 已完成 | 契约投影方向、BC-05 出网口径、P-10 边界纪律（产品→边界→契约）、DEC-021 令牌派生**逐项实读比对**（§3） | ✅ |
| AI 代码专项 5 项 | 全部完成 | §5.6 五项逐一有结论 | ✅ |

---

## 2. R1 F1~F9 逐条比对（M7.4 step 4.6(1)：已修复 / 未修复 / 新引入）

| R1 项 | 级别 | R1 要求实质 | 本轮实现（实读） | 判定 |
|---|---|---|---|---|
| **F1** | P0 | RB-03 判据不得以求值于 facade 域对象的形状反推（真实旧宿主上恒不触发 + 2.5~2.9 假绿）；须补「真实旧表面（域对象带方法）」构造 | 判据下移**原始服务命名空间**：`hostServiceGet`（`client.js:584-601`）由 `makeHostApi` 于**同点**记录（`:686-689`，与 `hostLegacyApiSurface` 同源同代际），`remoteNsPresent()`（`:603-607`）按 `ctx.get` 求值；五探针改为 **raw ns ∧ facade 可用**（`:2412-2416`）；构造改为**带方法的真实旧表面**（`smoke.mjs:2581-2600`，新增 `oldHostNoGreen5` 断言 2.5~2.9 **MUST NOT 报 ok**）+ 新表面 (e) + 双缺 (f) + apply 直读 D1③b | **已修复（实质）**，§3.1 |
| **F2** | P1 | 出网载荷须无自由文本路径；机检须绑定**真实网关产出**且具备**已证实的判别力**（正向对照） | 源侧枚举码：`FACE1_UNPROBED_CODES`（`host-boundary.js:155-159`）、`FACES_NOT_COVERED_AT_APPLY[].code`（`:162-168`）、`unprobed.push({item, code})`（`:192`）——`reason` 字段**全链消失**；文案移客户端 i18n `diagReason(code)`（`client.js:320-331` / zh、`:494-505` / en，8 码 + 未知码回显）；机检改为**驱动真实路由 handler**（`smoke.mjs:2712-2756`）对**整包**扫描 + **正向对照**（`:2746-2751` 注入 `file` + 自由文本 reason ⇒ 扫描器必红） | **已修复（实质）**，§3.2 |
| **F3** | P2 | `D_PROBE_ITEM` ↔ 契约 `clientProbes[].item` 须等价（非仅「在册」），防同面交换零信号 | 新增 D1④b（`smoke.mjs:2679-2685`）：`D_PROBE_ITEM[p.probe] === p.item` ∧ 目标项 `kind` 对账 ∧ 映射**单射** | **已修复** |
| **F4** | P2 | D1③ 须覆盖 apply 装配路径；路由失败路径须为行为断言 | D1③b（`:2646-2651`）：`runClientApply` 后**先直读** `CLIENT_PROBES[...]`（不新建 facade）；D1⑥ 成功/失败路径均以 fake `webServer`/`req`/`res` **驱动真实 handler**（`:2716-2723`、`:2758-2762`）；D1⑦ 补 `diagStyleProbe()` 真跑；渲染树不可达**如实披露**（`:2693-2697`） | **已修复** |
| **F5** | P3 | note 内嵌「现 L…」旧值须消除（行号以 `line` 字段为唯一事实源）；`line` 须重基 | 2.3 / 3.1 / 3.6 / 1.8 + 面 2/3 其余 note 改**符号引用**；`line` 全量重基（本轮抽验 20+ 锚点全中，§3.3）；新增 D1⑩ 守卫（`:2846-2855`）断言 note 内「现 L…」**0 处** | **已修复**（残余口径见 N2，P3） |
| **F6** | P3 | 死样式 / 死 i18n 键清除；重复展示择一并说明 | `.nv-diag-sub`、`.nv-diag-tbl code` 删除（grep 0 命中）；`diagStOk/diagStMissing/diagStUnprobed/diagNotDetected` 四键（zh/en）删除；重复展示**保留并说明**（汇总行承载原因码文案，rows chip 不含原因——信息不同） | **已修复** |
| **F7** | P3 | 拼写 + 产品代码直连契约 + 派生式两处 | `bindow`→`browser`（D1⑩ 断言 clientProbes note 无 `bindow`）；新增边界导出 `contractProjection()`（`host-boundary.js:226-239`），`index.js` 不再 import 契约（`!/from '.\/host-contract/` ∧ `!/hostContract\./` 双断言）；`revision: CONTRACT_TASK` 复用**单一派生点** | **已修复**（`revisions[]` 登记裁量见 §5） |
| **F8** | P3 | 探针须逐项 try（单点抛错不得全量丢弃） | 逐项 try（`client.js:2428-2443`）：单点失败 ⇒ 该项 `ok:null` + `detail='probe-error: …'`，其余保留；D1⑨ 以临时替换 `dom-phase` 为抛错实现构造（`finally` 复原 + 复原断言，`:2806-2830`） | **已修复** |
| **F9** | P3 | `diagDesc`（zh/en）去仓内路径 | 两处删除 `lib/host-contract.mjs`，改「宿主契约声明面 / the host contract declaration surface」（D1⑩ 断言两行 `diagDesc` 均不含 `lib/`、`.mjs`） | **已修复** |

**结论：F1~F9 九条全部修复，无一条改标签，无「未修复」项。** 新增缺陷 5 条（§6）全部 P3，且均属 R2 自身新增守卫/注释的口径精度问题，非 R1 问题残留。

---

## 3. F1 / F2 实质验证（非改标签；含变异路径可复现性推演）

### 3.1 F1 —— 判据源确为**原始服务命名空间**：**成立**

1. **求值入口 = 原始解析器，非 facade**：`hostServiceGet`（`client.js:584-601`）由 `makeHostApi` 在**同一处**记录（`:686-689`：`hostServiceGet = typeof svcGet === 'function' ? svcGet : null`，紧邻 `hostLegacyApiSurface = legacyApi !== undefined && legacyApi !== null` 的 `:686`），来源 = `apply` 传入的 `(name) => ctx.get(name)`（`:4817`）；`apply` 起始处与标记**同点重置**（`:4804` 标记 / `:4807` 解析器）——TDZ 纪律：`hostServiceGet` 声明（L584）**在** `makeHostApi`（L681）之前 ✓。
2. **存解析器非快照**：`rawService()`（`:596-601`）每次调用实时 `ctx.get`，抛错视为缺席（不判绿）⇒ 服务「后到」自然接上，与 facade 惰性解析同口径 ✓（快照式会把后到服务永久误判为缺席——Developer 选择正确）。
3. **方法面口径与各域 getter 逐项对账**（本轮实读比对，全部一致）：

| 探针 | 原始 ns 判据（R2 新增） | facade getter 实际条件（R1 已实读） | 一致 |
|---|---|---|---|
| `remote-settings` | `remote.settings.update` | `:705` `typeof ns.update === 'function'` | ✅ |
| `remote-session` | `remote.session.create` | `:717` `typeof ns.create === 'function'` | ✅ |
| `remote-workspace` | `remote.workspace.create` ∨ `workspaces` 快照（`getSnapshot`+`subscribe`） | `:735-740` `hasRemote`（`rns.create`）∨ `hasSnap`（`listStore.getSnapshot/subscribe`） | ✅ |
| `remote-directory-picker` | `remote.directoryPicker.pick` | `:763` `typeof ns.pick === 'function'` | ✅ |
| `remote-agent-presets` | `remote.agentPresets.select` | `:783` `typeof ns.select === 'function'` | ✅ |

4. **真实旧宿主推演（R1 复现场景）**：`ctx.get('remote.*')`/`workspaces` 全 `undefined` ⇒ `remoteNsPresent` 五项 false ⇒ `remotePresent = false`；`legacy-connection-api`（标记式，`hostLegacyApiSurface = true`）⇒ **`triggered = true`** ✓ —— R1 的「目标场景不可达」缺陷关闭。同时 facade 仍正常回退（`legacyApi.settings` 等），故 **2.5~2.9 行的 `state` 由 ok 变为 missing**（`facadeDomainUsable` 仍真，但 ∧ 左肢为假）⇒ 假绿消除 ✓（新增 `oldHostNoGreen5` 断言正面锁定）。
5. **新宿主**：五项 raw ns 就位 ∧ facade 域可用 ⇒ 五探针 `ok=true` ⇒ 不触发 ✓（(e) 断言 `newHostAllGreen5`）。
6. **变异路径可复现性（静态推演，逐条对上 Developer 的 8 项变异表）**：
   - ① 探针**改回 facade 形状求值** ⇒ (d) 的 `remoteChecksD.every(c => c.ok === false)` 假（旧宿主上五值皆 `true`）⇒ **D1③ 红**（报文 `Drows=[true,…]`）——**与 R1 发现的假绿逐字对应** ✓；
   - ② 删 `hostLegacyApiSurface` 赋值 ⇒ D1③ 的 `rbD.triggered` 假 **+** D1③b 的 `probeLegacyApplyD.ok === true` 假 ⇒ **两条红** ✓；
   - ③ 删 `hostServiceGet` 记录 ⇒ (e) 的 `remoteProbesE.every(p => p.ok === true)` 假（apply 已置 null 且无处写入 ⇒ 五探针 false）⇒ **D1③ 红** ✓（注：(d) 腿在该变异下**仍绿**——旧宿主腿对「解析器缺失」不敏感，故真正的守护者是 (e) 腿，见 §6 N1′ 说明）。
7. **`legacy-connection-api` 标记式判定按 R1 §6.2 保留** ✓（`:2411` 仍读 `hostLegacyApiSurface`，注释保留）——方向未回退。
8. **R1 附带项（假绿文案）**：`diagRbNone`（zh `:333-334` / en `:507`）由「remote.\* 与旧 .api 至少其一在场」改为「触发条件 = remote.\* 命名空间服务族全缺 ∧ 旧 .api 域对象表面在场；本次未同时满足」✓，D1⑩ 以源码文本断言锁死（`f1TextOk5`：新文案在 ∧ 旧文案不存于源码）。

### 3.2 F2 —— 网关载荷与机检判别力：**成立**

1. **源侧枚举码（载体消除，非「过滤」）**：`FACE1_UNPROBED_CODES = { '1.4': 'retired', '1.11': 'out-of-boundary-scope' }`（`host-boundary.js:155-159`）；五面码 `client-api-surface / host-dom-surface / install-registration / preset-manifest / version-environment`（`:162-168`）；`probes[]` 未探测项字段由 `reason` → `code`（`:191-192`）、`unprobed.push({ item, code })`（`:193`）✓。**grep 全仓**：`FACE1_UNPROBED_REASONS` **0 命中**（已无残留消费者）；`reason` 仅余于 smoke fixture/断言文本与 CHANGELOG/R1 报告叙述，**产品载荷内 0 处** ⇒ R1 指出的「`lib/tools.js` 经 unprobed 出网关」载体被**根除**（不是被遮蔽）。
2. **文案落客户端**：`diagReason(code)` zh/en 成对 8 码 + `?? String(code)` 未知码回显（`:320-331`、`:494-505`）；`makeT` 支持函数值多参调用（`:513-519` 实读）⇒ `t('diagReason', u.code)`（`:2565`）有效 ✓；D1⑩ 断言「生产者已发码 ⊆ 客户端文案表」（实测 7 码 + `no-runtime-predicate`）✓。
3. **机检绑定真实网关产出**：D1⑥ 以 `svc.registerHttp({register})` 捕获真实路由对象（`smoke.mjs:2712-2714`），fake `req/res` 驱动 handler（`:2716-2733`，含回环来源 + JSON content-type + `end` 事件），断言 **200** + `report.probes=11 / summary.ok=9 / unprobed=2（全为 code、`reason===undefined`）/ notCovered=5（同）`+ `contract.items=48 / faces=6 / revision ≡ revisions 末项` + `items.every(四字段齐 ∧ symbol/file/line 全 undefined)`（`:2756-2764`）✓。
4. **整包扫描（R1 盲区闭合）**：`realPayload5 = JSON.stringify(routeOk5.payload)`（真实 handler 产出**整体**，含此前盲区 `unprobed`/`notCovered`）→ `scanBc05(realPayload5) === false` ✓；客户端侧 D1② 亦改为 `JSON.stringify(diag5)` **整包**（`smoke.mjs:2583`）✓ —— 双向都从「字段子集」升级为「整包」。
5. **正向对照 = 已证实的判别力**（R1 的硬要求）：在真实产出的**深拷贝**上注入 `report.probes[0].file = 'lib/client.js'` + `report.unprobed[0].reason = '…（属 lib/tools.js 行）'`（`:2746-2751`），断言 `scanBc05(...) === true` ⇒ **扫描器对 R1 描述的两类泄漏确有判别力**，且断言在真实产出形状上运行（非合成 fixture）✓。R1 的构造分析结论（「给 probe 加 `file` ⇒ 断言不变红」）现已被**反转**为红 ✓。
6. **残留自由文本通道（如实披露，非缺陷）**：载荷内仍有 1 处自由文本 `report.host.versionNote`（`host-boundary.js:200` = 'unprobed（TP-4：宿主版本获取路径未证实）'），当前无路径、且已落入整包扫描面 ⇒ 不构成泄漏；但「载荷内**无自由文本**」的表述宜精确化为「**原因字段**已枚举化」（见 §6 N3）。
7. **未加路由级白名单的取舍**：Developer 理由（源侧无载体 + 整包扫描已使未来未登记字段泄漏在 CI 红 + 白名单二次维护与 C-02 相悖）——本轮**认可**：枚举码是**根因修复**，而正向对照已证明扫描面具备判别力，白名单确属冗余第二清单。

### 3.3 F3~F9 抽验（逐项实读，不采信自述）

- **F3**：`dProbeEquiv5`（逐项 `===`）∧ `dProbeInjective5`（`Set` 尺寸 ≡ 条目数）∧ `kind` 对账（`smoke.mjs:2679-2683`）；推演交换 2.5↔2.7 ⇒ 两项 `===` 均假 ⇒ 红 ✓。
- **F4**：D1③b 先直读（`:2643-2645`）再构 facade（`:2647-2648`）；路由成功/失败双路径行为断言（`:2758-2762`，失败 = `svc.ctx = undefined` ⇒ `{ok:false,error:'probe-unavailable'}` + status 200，**不冒泡 500**）✓；D1⑦ `diagStyleProbe()` 真跑（`:2779-2785`，`ok===true ∧ vars>0 ∧ rules>0`）✓；**渲染树不可达如实披露**（`:2693-2697` 源码注释 + 改用「源码挂载点 + 探针真跑」）——本轮确认该披露**属实**（mock react `useState` setter no-op ⇒ `SettingsPage` 已加载分支不可达），**未以假绿代替** ✓。
- **F5**：note 口径解耦 ✓；`line` 字段抽验 **20+ 锚点全部命中实读真值**：2.3 `L4804`（`const inject = ['slots']` ✓）、2.4 六处回退点 `L682/713/729/738/777/786` ✓（含 `:686` 标记行相邻）、2.5 `L704`（`get settings()`）、2.6 `L715`、2.7 `L731`、2.8 `L759`、2.9 `L779`、2.10 `L1352-1416`（形状校验实读 `:1360` ✓ 在段内）、2.11 `L1440`（`const launcher = {`）、2.12 `L4834`（`const offServiceEvent`）、2.13 `L4861-4893`（6 处 `ctx.slots.register(` 全在段内）、3.1 `L978-986`（`/**` L978 / `function findConversationRoot` L979）、3.2 `L1050-1051 / L1134`（`root.children[1]` L1051 / `next.children[1]` L1134）、3.3 `L1062-1065 / L1142-1147 / L1199-1201`（`savedMarginLeft` L1062 / marginLeft 写 L1143 / L1200）、3.4 `L837-850 / L4554 / L4689`（`const TK = {` L837 / `.nv-modal` 的 `--dsw-shadow-lv2` L4554 / `.nv-cmodal` 的 `--dsw-alias-bg-elevated`+shadow L4689）、3.6 `L1076-1100 / L3707`（`new ResizeObserver` L1076 + MutationObserver 段 / 第二站点 `ro = new ResizeObserver(measure)` **L3707 精确命中**）、3.7 `L884-886 等`（`SPLIT_PERSIST_KEY` L884 / `DEFAULTS_PERSIST_KEY` L886，`ORDER_PERSIST_KEY` L945 属「等」）、3.8 `L2829-2839`（`function findSidebarEl()` L2829）；面 1 指向 `index.js` 的引用**逐点实读订正**：1.3 调用点 `L170`（`presetRoot()`）+ `L1367`（`presetDir(PRESET_ID)`）✓、1.4 `L40`（`const NS`）✓、1.5 `L37`（`export const inject`；L36 为 JSDoc ⇒ 严格面修正）✓、1.6 `L1457`+`L95` ✓、1.9 `L1463` ✓、1.10 `L155`+`L122` ✓。
- **F6**：grep 实读 `.nv-diag-sub` / `.nv-diag-tbl code` / 四死键 **0 命中**；剩余 `.nv-diag*` 规则仍全为 `var(--dsw-alias-*,兜底)` + `color-mix` 双声明（`:4766-4779`）⇒ DEC-021 未被破坏 ✓。
- **F7**：`contractProjection()` 实读（`host-boundary.js:226-239`）只出 `task/schemaVersion/revision/faces(id,name)/items(item,face,kind,necessity)` ✓；`index.js` 顶部改经边界具名导入（`:21-24`）✓；**COMPAT-004 收口断言不受影响**：`smoke.mjs:2245-2252` 的 `mapKeys`/`mapSyms` 由 `BOUNDARY_MAP` **自身**派生（无「模块导出枚举」断言）⇒ 新增导出不破坏 14 符号断言 ✓（本轮实读确认，非依赖「smoke 全绿」推断）。
- **F8**：`client.js:2428-2443` 逐项 try 实读 ✓；D1⑨ 构造（`:2806-2830`）临时替换 `CLIENT_PROBES['dom-phase']` 后 `finally` 复原 + `probeRestored5` 断言 ✓；**顺序安全性**：D1④/④b（读键集/映射）在 ⑨ **之前**、D1⑩ 只读源码文本 ⇒ 临时变异不污染其他断言 ✓。
- **F9**：两行 `diagDesc`（zh `:296` / en `:467`）实读无 `lib/`、`.mjs` ✓。

---

## 4. R1 §6 零回归复核（本轮**独立复核**，不采信对照表）

| R1 §6 | 内容 | 本轮独立复核方式与结果 | 判定 |
|---|---|---|---|
| §6.1 | `smoke 271` 计数口径（262 + 9） | 本轮改为 276 = 271 + **5**：新增条目 = F2 码位（`③b` COMPAT-004 段）、`D1③b`（apply 直读）、`D1④b`、`D1⑨`、`D1⑩`；`D1②/③/⑥/⑦` 为**原位改写**（计数中性）⇒ 静态复算自洽 ✓（数值采信 Coordinator 复跑） | ✅ 预期变化，非回退 |
| §6.2 | `hostLegacyApiSurface` 标记式判定保留 | `:2411` 探针与 `:686` 赋值、`:563-583` 注释均在；D1③b 正面锁定其装配 | ✅ |
| §6.3 | `recheck` / N3 / N4 诚实保持 | 本轮 diff **未触碰** D1⑧/⑧b 段（`smoke.mjs:2787-2805` 原样保留，仍断言 `status==='unverified'` + `recheck` 三要素）；契约 `ctxGetSemantics.recheck` 文本未改 | ✅ |
| §6.4 | `report.contract` 与 `contract` 双份元数据现状 | 路由仍回传 `report`（内含计数）+ `contract: contractProjection()`；面板只消费后者，无冲突 | ✅ 未动（现状保留） |
| §6.5 | `faces[1].probed` 语义（含 ok=null 项） | `buildDiagReport` 计数段（`client.js:2477-2492`）本轮未改 | ✅ 未动 |
| 附加（本轮新增检查） | 跨消费者零回归 | ① `warnCompatReport` 只取 `unprobed[].item`（`host-boundary.js:235`）⇒ `reason→code` 不影响 D2 告警；② `notCovered` 面板只渲染 `.length` ⇒ 码化不影响渲染；③ `diagReason` 缺键回退 zh（`makeT` L516）⇒ 无文案空洞；④ 死样式删除后无引用残留（grep 0） | ✅ |

**结论：R1 §6 五项零回归成立，且本轮以「读源码 + 读断言 + 读消费方」三重方式复核，未发现对照表与实读不符之处。**

---

## 5. 五维度 + AI 专项结论（R2）

### 5.1 正确性 —— **通过**
F1 根因（判据错层）经原始命名空间求值修复（§3.1 表 + 推演）；五探针方法面与 facade getter 逐项一致；三态投影、`checks` 逐项降级、路由成功/失败双路径行为均有断言。附带订正了 R1 指出的 `diagRbNone` 反向文案。无残留逻辑错误。

### 5.2 安全性 —— **通过**
BC-05：出网载体（自由文本 reason）**根除**而非过滤（§3.2）；`contract.items` 仅四字段、`symbol/file/line` 断言级不可出网（`items.every(... === undefined)`）；无 XSS（`el = react.createElement`，文本子节点）、无密钥/token、只读路由 + 既有回环门禁不变。R1 的边界口径缺口已闭合且带正向对照。

### 5.3 可维护性 —— **通过（残余 P3）**
P-10 边界纪律达成（产品→边界→契约，`index.js` 零契约直连且有机检）；派生式收敛单点（`CONTRACT_TASK`）；契约 note 与行号解耦 + 守卫；死码清除。残余：守卫词法/范围精度（N2）、契约 `clientProbes[].note/mode` 未随 F1 双判据同步（N4）。

### 5.4 性能 —— **通过**
F1 修复引入的 `rawService()` 为每探针一次 `ctx.get`（8 次/报告构建，报告仅在面板挂载/刷新时构建）；`remoteNsPresent` 无循环、无 I/O；服务端路由仍全同步零副作用。无 N+1 / O(n²) 级变化。

### 5.5 测试覆盖 —— **通过**
净增 5 条断言，且**三条原弱断言升级为强断言**：D1② 由字段子集扫描 → **整包**；D1⑥ 由源码正则 → **行为驱动 + 正向对照**；D1③ 由「不可达形态」→ **真实旧表面 + 新表面 + 双缺**；D1③b 补 apply 装配直读；D1⑨ 补逐项降级；D1⑩ 补不变量守卫。**唯一未覆盖面** = 面板渲染树（如实披露，且 mock 环境客观不可达——非本任务可闭合项，建议后续以真机/DOM 环境补齐，见 §7）。

### 5.6 AI 代码专项 5 项
| 项 | 结论 |
|---|---|
| mock 残留 | **无**（fixture 仅在 smoke；产品代码 0 mock） |
| 硬编码返回值 | **无**——报告项全为入参投影；`D_PROBE_ITEM` 与契约的等价/单射/kind 已机检（F3 修复） |
| 幻觉 API | **未发现**——本轮抽验 20+ 行号锚点、5 处服务名/方法名口径、`diagReason` 8 码、`CONTRACT_TASK` 派生路径、`contractProjection` 字段面，全部与实读一致 |
| 未实现 TODO | **无**（D1 段 grep 无 TODO/FIXME；未实现面以码 + 数量摘要披露） |
| 过度实现 | **无**——+422/−128 中 −128 为删除（死码 + 旧判据 + 旧断言），净增集中于判据修正与机检强化；无投机抽象 |

---

## 6. 新引入缺陷（5 条，全部 P3，无一条为回退）

### N1 — **P3**｜RB-03 触发判据含 facade 第二重肢，理论上可产出「误报为低于最低支持」
- **位置**：`lib/client.js:2345-2353`（`diagMinSupportSignal` 取 `checks` 的 `ok===true`）+ `:2412-2416`（探针 = raw ∧ facade）
- **事实/推演**：`remotePresent` 现在继承 facade 肢；若某宿主 `connection.api` 在场（⇒ `legacyPresent=true`）而五探针因 **facade 肢**失败 ⇒ `triggered=true`，文案会断言「宿主版本低于最低支持」。**可达性评估：现有宿主形态下不可达**（新宿主无 `connection.api`——BUG-004 §⑦ 用例 `smoke.mjs:1450-1451` 锁定；旧宿主上 facade 原样返回 legacy 域对象，两肢同真）⇒ 仅属**归因稳健性**问题。
- **建议**（非阻断）：把触发判据显式取自 `remote-*` 的**原始肢**（如由 `remoteNsPresent` 派生一个独立布尔），facade 肢仅作为面板第二列展示；或在文案中区分「命名空间缺席」与「装配面不可用」两种失败。

### N2 — **P3**｜D1⑩ 守卫的**词法/范围**窄于其披露措辞：两条 note 仍内嵌「现役」行号
- **位置**：`smoke.mjs:2841-2845`（`staleNoteRefs5` 仅匹配 `/现\s*L\d/`，作用域 = `items[].note` + `clientProbes[].note` + `clientProbesNote`）；存活实例 = `host-contract.mjs:95`（item 1.3 note「index.js **现调用点 L170/L1367**」）与 `:102`（item 1.10 note「emit **L155** / logger **L122**」）
- **事实依据**：两处值**当前均正确**（本轮实读 `index.js:170/1367/155/122` 命中）⇒ **今天不是缺陷**；但「现调用点 L…」「emit L155」形态**逃过** `/现\s*L\d/`（中间有词），且守卫不扫 `faces[].scope`/`revisions[].scope`/`regionLiterals`/`ctxGetSemantics` ⇒ 下次 `index.js` 行位移将**零信号**——正是 F5 要消除的失效模式。
- **建议**：守卫正则放宽（如 `/现[^。；]{0,8}L\d/` 或「note 内 `L\d` 仅在带『原/收口前』限定时可出现」），并把 1.3/1.10 改为指向 `line` 字段（1.6/1.9 已如此）。

### N3 — **P3**｜载荷内仍存 1 处自由文本字段（`host.versionNote`），披露措辞宜精确化
- **位置**：`lib/host-boundary.js:200`（`host: { version: null, versionNote: 'unprobed（TP-4：宿主版本获取路径未证实）' }`）；相关披露 = `CHANGELOG.md`（F2 条目「报告内**不再存在自由文本 reason**」——该措辞精确；但若被读成「报告内无自由文本」则不准确）
- **推演**：该字段当前无路径且已落入整包扫描面（`scanBc05`），故**不构成泄漏**；风险 = 未来若把含路径的说明写进 `versionNote`，仅当命中扫描器 7 类模式才红。
- **建议**：把 `versionNote` 一并枚举化（如 `code: 'tp4-unprobed'`）或在契约/CHANGELOG 明确「枚举化范围 = 原因字段（`probes/unprobed/notCovered`），`host.versionNote` 为受整包扫描约束的既有自由文本」。

### N4 — **P3**｜契约 `clientProbes[]` 的 `note`/`mode` 未随 F1 的「双判据」同步
- **位置**：`lib/host-contract.mjs:212-220`（如 `{ item: '2.5', probe: 'remote-settings', mode: 'runtime-service', note: 'remote.settings.describe/update/mutate 方法面在场性' }`）
- **事实**：实现已改为 **原始命名空间在场 ∧ facade 域可用**（`client.js:2412-2416` 注释明确「代际判据」），但契约登记项的 `note`/`mode` 未提及「原始 ns」肢；`mode` 仍单一值 `runtime-service`。D1④b 只对账 `item`/`kind`，**note 文本无任何机检** ⇒ 契约作为「登记面事实源」与实现存在描述落差（非行为差异）。
- **建议**：在 `clientProbes[].note` 补一句「判据 = 原始服务名 `ctx.get` 在场 ∧ facade 域可用（代际判定不走 facade 形状）」；如需更强，可让 `mode` 取 `runtime-service+raw-ns` 之类并纳入 D1④b 对账。

### N5 — **P3**｜契约 `revisions[]` 未收录 COMPAT-005 的契约结构演进（裁量见 §7.1）
- **位置**：`lib/host-contract.mjs:69-73`（末项仍为 COMPAT-004）
- **事实**：R1 新增顶层字段 `clientProbes[]` + `clientProbesNote`，并改了 item 1.8 路由数（12→13）；R2 新增 `contractProjection()` 边界导出。**先例对照**：COMPAT-011 的 `revisions[].scope` **确实**记录了顶层字段新增（「新增 versionExceptions…与 versionFactOrigins…；新增 _schema」）⇒ 按同一先例，`clientProbes[]` 属同类可记录项。
- **建议**：见 §7.1 裁量（**不阻断本轮**）。

---

## 7. 非阻断备注与裁量

### 7.1 Developer 提问④裁量：`contractProjection()` 是否属「宿主耦合面变更」而需补 `revisions[]` 条目？
**裁定：F7 本身不需要新条目；但同批的 `clientProbes[]` 顶层新增属可记录项（P3 建议，不阻断）。**
- **F7 不需要**的依据：① `revisions[]` 头注释定义为「契约修订史（任务 + 变更点）」（`host-contract.mjs:44`），现有三条记录的 `scope` 均描述**宿主耦合声明面**变化（items/regionLiterals/hostSurface/versionExceptions/顶层结构）；② `contractProjection()` 未新增/修改任何 `items[]`、`regionLiterals`、`hostSurface`、服务名/事件/槽位/选择器/令牌字面量，纯为「产品→边界→契约」依赖方向收敛（P-10 边界纪律），不改变任何宿主面事实；③ 无任何机检或消费方要求条目存在（`smoke.mjs:2336-2340`/`:2762` 均以**末项派生**，与条目数无关）。
- **但**：若追求与 COMPAT-011 先例一致（顶层字段新增入史），**可**在 COMPAT-005 收尾时补一条 `scope`（内容建议：D1 面板 + 顶层 `clientProbes[]`/`clientProbesNote` + item 1.8 路由数 12→13 + 报告原因字段枚举化 + 边界 `contractProjection()`）。**补录的副作用是预期且自洽的**：`CONTRACT_TASK` 随末项变为 `COMPAT-005` ⇒ `[nv-compat]` 告警 `task` 与 `contractProjection().revision` 同步变化，而 `smoke.mjs:2336-2340`/`:2762` 断言以末项派生 ⇒ **无需改测试**——即 Developer 担心的「归因漂移」在本仓机制下**不构成风险**（断言自动跟随），真正影响的只是载荷自述任务名字符串。故「避免漂移」这一理由**部分成立但不充分**；我仍判**不阻断**，交由 Coordinator 决定「补录（更合先例）」或「记入 COMPAT-014（更省事）」——两者均可接受。

### 7.2 其余备注（不构成发现）
1. **披露项②（面 1/4/5/6 历史「原 L…」未改写）裁定：接受。** 这些引用均带「原…为收口前历史值」限定，用途是勾稽历史事故点，**不是**维护期行号副本；面 4/5 的 index.js 段（如 `ensurePreset` 段 `L163-189`，真值 `/**` L163 / 方法体 L164-191）起点精确、终点略短（不含两处闭合花括号），不影响任何机检（F5d 抽核只要求锚点落在范围内 ∧ 边界非注释），且本轮未触碰 install/ci/preset 面 ⇒ 无需改动。
2. **`hostServiceGet` 为模块级可变状态**（与 `hostLegacyApiSurface` 同构）：生产路径仅 `apply` 调用一次 `makeHostApi`（`grep` 全文件仅 `:4817` 一处产品调用点）⇒ 无覆盖风险；测试多次调用会互相覆盖，但 D1③/③b 每次先 `runClientApply` 再读数，口径一致。
3. **探针 `ok:false` 语义合并**（raw 缺席 vs facade 不可用）——`detail` 字符串同时列出两肢（如 `raw remote.settings.update ∧ api.settings.describe`）⇒ 可诊断性保留，仅机器不可区分（与 N1 同源，一并处置更佳）。
4. **`buildDiagReport` 文档称「纯函数」**：实际依赖模块态（`hostLegacyApiSurface`/`hostServiceGet`/`NV_STYLE`）——R1 已按「入参投影 + 模块态读数」理解，非新增问题；如后续要严格纯函数语义，建议改述为「无副作用投影（读模块态）」。
5. **面板反复取数**：挂载一次 + 手动刷新（`useEffect([], ...)` + 刷新钮），无轮询、无父级重渲染重挂载 ⇒ 性能与既有设置页一致。

---

## 8. 结论

**APPROVED_WITH_NOTES**，**`unresolved_blockers = 0`**（P0=0 / P1=0 / P2=0 / P3=5）。

- R1 的 **F1（P0）与 F2（P1）经实质验证已修复**，且修复方式为**根因层**（判据下移到原始服务命名空间；出网自由文本载体枚举化）而非遮蔽；两处均配备「已证实判别力」的构造断言（真实旧表面 fixture / 真实路由产出 + 注入对照）。
- **F3~F9 七条全部修复**，其中 F3/F4/F5 的修复强度高于 R1 要求（等价 + 单射；apply 装配直读 + 路由行为断言；行号解耦 + 不变量守卫）。
- 新增 5 条 **P3**（N1~N5）均为 R2 自身守卫口径/披露精度/契约注释同步问题，**不含安全、数据、逻辑或回归风险**；建议纳入 COMPAT-014 或收尾补录，**不影响本次通过**。
- 遗留（非本任务）**唯一未覆盖面 = 面板真机渲染**（环境无宿主；Developer 已如实披露，本轮同样不可闭合）——建议后续以真机/DOM 环境任务补一条渲染级断言（现以「源码挂载点 + 探针真跑」诚实替代，未以假绿通过）。
