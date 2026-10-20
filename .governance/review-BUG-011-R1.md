# BUG-011 代码审查报告 R1（独立 Code Reviewer）

- **任务**: BUG-011 —— dsh 0.2.0-rc.2 升级适配实现批（RISK-012 欠账补审）
- **轮次**: R1（本任务首轮独立审查）
- **审查日期**: 2026-10-20
- **审查者**: Code-Reviewer（独立；只读）
- **审查范围**: commits `9cb629b..d8d93c2`（含 `9cb629b` / `970e802` / `d8d93c2` 三者）与工作区当前状态的一致性；基线 = `9cb629b^`，终点 = `d8d93c2`
- **审查方式**: 只读（`git show/diff/log/rev-parse`、文件读取、`node --check`、只读复跑 `test/smoke.mjs` / `test/validate-preset.mjs` / `test/fixtures/host-surfaces/preset-schema-face.mjs` / `test/fixtures/host-surfaces/probe-face.mjs` / `scripts/probe-host.mjs --self-check`、只读读取已装宿主源码与 `.scratch-bug011` 证据）；未修改任何产品代码/配置/其他治理文件；唯一写入 = 本文件
- **结论行（机读）**:

```
REVIEW-BUG-011-R1 NEEDS_CHANGE / unresolved_blockers=5
```

> `unresolved_blockers` = 未闭环 P0（2）+ P1（3）= 5。P2/P3 不阻塞合并（按 `code-review` SKILL 分级），但其中 P2-9/P2-10 建议随返工一并处理。

---

## 1. 结论摘要

**NEEDS_CHANGE**。本批四面适配的**方向与主要实现判断成立**：Config/volatile 双表面、`ctx.inject` 延迟路由、`dsh-agent-preset` 声明行 + `dsh-workflow-ptc`、客户端 `retainedBy.mainView`/`uiWorkspace.openSession` 双表面、install 代系分流——逐项已用宿主源码（0.2.1-rc.2 实装；0.2.0-rc.2 表面快照）与本地门禁交叉核验，`smoke 307/0`、`validate-preset PASS`、`preset-schema-face PASS`、`probe-host --self-check 6/6` 均可复现。

但存在 **2 个 P0、3 个 P1**，其中两个可直接导致**合并门禁红**与**宿主进程 fatal 退出**：

1. **P0-1**：install 双脚本头部新增 `[4.7]` 约定项、`probe-face` golden 同步为 6 项，但 `lib/host-contract.mjs` **没有 item 4.7** ⇒ CI `sanity` 的 probe-face 步骤确定红（本地实跑 `[probe-face] FAIL：1 项失败 / 28 项`，exit 1）。
2. **P0-2**：`settingsFormsUpdate()` 调用 **async** 的 `SettingsForms.update()` 后**不 await、不 catch**，`migrateLegacySettings()` 在写入落定前就记录「migrated」并返回 ok；写入 rejection 成为 **unhandledRejection**，在 dsh 的 fail-loud 处理器下会 `proc.exit(1)`。触发面包括宿主自身已实证的「同 id 双层」状态（RISK-011③；`verify-020/host-out5.log` 原文 "Configuration for novel-writing is overridden by a home patch or command-line overlay" ⇒ fatal load failure）、非法 legacy 配置值、I/O 失败。
3. **P1**：host-contract 未登记本批新增的宿主耦合（`@deepseek-ai/dsh-agent-preset` 声明行 / `dsh-workflow-ptc` / Config+volatile / SettingsForms 迁移面 / `uiWorkspace`+`retainedBy` / install 声代号探测），`revisions[]` 未追加 BUG-011 ⇒ `[nv-compat]` 归因任务仍为 `CLEAN-006（R2 返工）`（verify-020 host-out 日志直接可见）。
4. **P1**：新增运行时依赖 `js-yaml` 在**离线/无 pnpm 安装通道**（README 明示的 install.ps1/install.sh 通道）不可解析 ⇒ legacy 数据迁移（bindings/workspaceRoot 恢复）静默失效。
5. **P1**：install 代系探测失败时「保守走 0.1.x」的回退方向是**反的**：在 0.2.x 宿主上会重新写入 insert 行 + settings.yaml，恰好制造 RISK-011③ 的双层同 id fatal 状态；`install.ps1:154` 的「多做无害动作」注释与实证不符。

---

## 2. 审查范围与基线事实

| 项 | 值（可复查） |
|---|---|
| 审查范围 | `9cb629b..d8d93c2`（含三者） |
| `9cb629b` | 6 文件 +761/−87：`cordis.patch.yml` +227、`install.ps1` +184、`install.sh` +140、`lib/host-boundary.js` +130、`lib/index.js` +157、`package.json` +10 |
| `970e802` | `lib/client.js` +52/−11 |
| `d8d93c2` | 8 文件 +348/−56：`host-contract.mjs`、`smoke.mjs`（+139）、`preset-schema-face.mjs`（+146）、`validate-preset.mjs`（+49）、`probe-face.mjs`（2 行）、`ci.yml`、`CHANGELOG.md`、`README.md` |
| 终点后产品改动 | `git diff --stat d8d93c2..HEAD -- lib test cordis.patch.yml install.ps1 install.sh package.json agent-presets` ⇒ **仅新增 `docs/verification/BUG-011-real-machine-acceptance.md`**；产品代码零改动 ⇒ 工作区产品面与 `d8d93c2` 一致 |
| 工作区状态 | `git status --porcelain`：`?? .scratch-bug011/`、`?? .governance/governance-store-ops.json`、`?? docs/design/`（后两者为审查期间其他会话产物，不属本批；见 P2-8/P2-9） |
| 宿主核验面 | 已装 `@deepseek-ai/dsh@0.2.1-rc.2`（源码实读）；0.2.0-rc.2 仅存 8 包表面快照 + `verify-020` 隔离实例日志/组合树；0.1.5-rc.2 宿主**未安装**（仅 fixtures 静态面） |

---

## 3. 四面核验结论

### ① 服务端 Config 声明 + volatile（settings 面迁移）

**成立，但写入路径有 P0 缺陷。** 事实链：

- `lib/index.js:57` `export const Config = markVolatile(z.object({...}))`；`lib/host-boundary.js:94-96` 的 `markVolatile` 在 3.18.5 走 `.volatile()`、在 3.18.2 走 `.extra('volatile', true)`。
- 宿主 loader 确实消费插件模块导出：`@deepseek-ai/cordis/lib/index.js:1619-1631`（`runtime = { Config: plugin.Config }`）、`:956-962`（`resolveConfig` 用 `Config["~standard"]`）。
- 根级 volatile 的宿主语义：`schemastery 3.18.5` `lib/index.mjs:235-237`（`.volatile()` = `.extra("volatile",true)`）、`:265-276`（root meta.volatile ⇒ `createVolatile(value)`）；`cordis-plugin-loader` `:395-427` `_commitVolatile()` 免重启刷引用；`dsh-settings` `:122-131` `volatileForm`、`:153-158` `isVolatilePath`、`:470-537` `update/write`。
- `readLiveConfig` / `configSnapshot`：`lib/host-boundary.js:105-108`、`:82-84`；0.1.x 仍走 `ctx.settings.get`（`:121-123`）。
- 0.1.x 静态兼容：从 npm 缓存解出 `schemastery@3.18.2` 实测 **有 `~standard`（L52）与 `.extra`（L128）、无 volatile refs** ⇒ `markVolatile` 回退路径与 Config 声明不会打断 0.1.x 的 standard-schema 校验（**运行时未跑 0.1.5，待验证**）。
- **缺陷**：`settingsFormsUpdate`（`lib/host-boundary.js:141-146`）丢弃 `s.update()` 的 Promise；`migrateLegacySettings`（`lib/index.js:279-283`）据此提前返回 `{ok:true, migrated}` 并写成功日志。宿主 `SettingsForms.update` 是 async（0.2.1 `dsh-settings/lib/index.js:470-472`），写入可因 `dsh-config-editor/lib/index.js:122`（双层/覆盖）、`resolveConfig` 校验（非法 legacy 值）、I/O 失败而 reject。详见 **P0-2**。

### ② 预设机制：`.agent-presets/<id>/` → bundle patch 内 `dsh-agent-preset` 声明行

**成立。** 事实链：

- `cordis.patch.yml:24-35` 插入 `novel-writing` 宿主行 + `preset-novel-writing`（`name: @deepseek-ai/dsh-agent-preset`，config `id/name/description/order/plugins`）；`plugins` 行集与 `agent-presets/novel-writing/agent.cordis.yml` 逐行等价（smoke B2 双源断言独立复跑通过；唯一白名单差异 = `workflow-worker-thread`↔`workflow-ptc`、skills 相对路径两式）。
- 宿主侧机制实读：`dsh-agent-preset@0.2.0-rc.2`/`0.2.1-rc.2` 的 `lib/index.js` 逐字节相同（`.scratch-bug011/diff021/dsh-agent-preset/*`），Config = `id/name/description/order/plugins`（`plugins: z.array(z.any()).required()`）；`dsh-agent-preset-registry` `mountPreset()` 以 `record.context.baseUrl` 为子行解析基（`lib/index.js` 中 `scope.ctx.extend({ baseUrl: record.context.baseUrl })`）。
- `baseUrl` 语义验证：`dsh-app-boot/lib/index.js:4525` 根配置 baseUrl = `dirname(profile/cordis.yml)/` ⇒ 声明行 ctx.baseUrl = **profile 目录**，故 `cordis.patch.yml:96` 的 `node_modules/dsh-novel-writing/agent-presets/novel-writing/skills/` 解析式与声明/安装通道一致（真实机 A3 = 29 目录可达，EVD-134）。
- 0.1.x 通道保留：`lib/index.js:193-224` `ensurePreset()` 以 `legacySettingsSurface`（`host-boundary.js:71-74`）分流；0.2.x 跳过 `.agent-presets` 死通道；install 步骤 4 同分流。
- 风险点（不阻塞）：`dsh-agent-preset` 行依赖宿主 `agentPresets` 服务；0.2.x web profile 由 `@deepseek-ai/dsh-web-app/cordis.patch.yml:586-589` 提供 registry（0.2.1 实读；0.2.0 由 EVD-131 组合树实证）——若宿主未来移除该行，声明行会静默 pending（仅启动审计可见）。已登记为 **P2-11（观察项）**。

### ③ 客户端会话面：`sessions.open()`→`uiWorkspace.openSession(id)`、`current/completed`→`retainedBy.mainView>0`

**源码级成立；浏览器级未由本审查实测（待验证）。** 事实链：

- `lib/client.js:899-912` `sessionsCurrentOf`：0.1.x `s.current` 优先，否则遍历 `byId` 取 `retainedBy.mainView > 0` 首项；与宿主 `dsh-client-ui-workspace/lib/client.js:866-868` 的 `mainSessionId` **同判据同顺序**（`:89`、`:3027`、`:3367`、`:3543` 同式）。
- `lib/client.js:1626-1649` `launcher.open`：`sessions.open` 在 0.2.x 已不存在（宿主 `dsh-api-session-controller/lib/client.js:3840-3895` 的 sessions 服务仅 `retain/using/retainInfo/...`，无 `open`）；回退 `resolveSvc('uiWorkspace').openSession(id)`——宿主 `dsh-client-ui-workspace/lib/client.js:1360-1371`（`super(ctx,"uiWorkspace")`）、`:1470-1471`（`openSession(target)`）实读存在。
- `ctx.get(name, strict=true)` 对未激活服务返回 undefined 而非抛错（cordis `lib/index.js:763-772`），配合 try/catch 的惰性探测成立；`uiWorkspace` 不在 `dsh.client.inject` 内属于有意降级（不扩 inject，避免旧宿主被硬依赖打崩）。
- 两消费面（控制台/分栏）均改走 helper：`lib/client.js:3343`、`:4080`；`smoke` 文本断言独立复跑通过。
- **未验证面**：真实浏览器中的打开会话/自动关闭联动/分栏联动（无浏览器执行；0.2.0-rc.2 的 client 包源码未留存，只有 0.2.1-rc.2 实装源码）；见 §6 待验证 T-1/T-4。

### ④ install.ps1/install.sh 代系分流与 0.1.x 兼容

**分流主体成立；探测回退与依赖面有 P1/P2。** 事实链：

- 探测：`install.ps1:152-164`、`install.sh:79-88`，以「dsh 安装闭包含 `@deepseek-ai/dsh-agent-preset`」判 0.2.0+（非版本号字符串），符合 DEC-154。
- 0.2.0+ 分支：跳过 insert（`install.ps1:294-368`、`install.sh:223-281`）、跳过 `.agent-presets` 同步（`install.ps1:417-427`、`install.sh:303-310`）、不写 `settings.yaml` 并提示 `.imported` 迁移（`install.ps1:449-464`、`install.sh:320-335`）；撤除范围限定 `insert` 块内本安装器同 id 条目，顶层 id-targeted 覆盖行不动（局部逻辑核读成立）。
- 0.1.x 分支：原有插入/预设同步/settings.yaml 默认节行为保留（`install.ps1:369-415`、`install.sh:282-294`、`:336-350`）。
- 语法：`install.ps1` PowerShell Parser 通过；`install.sh` `bash -n` 通过。
- **P1-4/P1-5/P2-9/P2-10** 见下。

---

## 4. 逐条发现（P0 → P3）

### P0-1 — CI `sanity` 的 install 头部契约对账确定红：`[4.7]` 无契约 item

- **位置**：`install.ps1:37`（`#   [4.7] 0.2.0 声明代探测 = @deepseek-ai/dsh-agent-preset`）；`install.sh:21`（同项）；`test/fixtures/host-surfaces/probe-face.mjs:102`（`INSTALL_GOLDEN_ENTRIES = ['4.1','4.2','4.3','4.4','4.7','5.5']`，`d8d93c2` 本次改动）；`lib/host-contract.mjs:154-160`（面 4 仅 4.1~4.6，无 4.7）；CI 接线 = `.github/workflows/ci.yml:65-66`。
- **证据（本审查实跑，只读）**：

```
node test/fixtures/host-surfaces/probe-face.mjs
❌ ⑧ COMPAT-009 install 头部布局契约对账：... :: problems=["install.ps1：约定项 [4.7] 不在契约 items[] 内（面 4/5 安装注册项）","install.sh：约定项 [4.7] 不在契约 items[] 内（面 4/5 安装注册项）"]
[probe-face] FAIL：1 项失败 / 28 项   (exit=1)
```

- **为什么是 P0**：CI `sanity` 步骤直接执行 probe-face（`ci.yml:66`），当前提交状态必然红 ⇒ 合并/发布门禁不通过；且违反 `install.ps1:42-44` 自己写明的「改动任一约定字面量 MUST 同步本块 + lib/host-contract.mjs 对应条目——三者不一致即 CI 红」。
- **最小修复方向**：在 `lib/host-contract.mjs` 面 4 新增 item 4.7（`kind: install-detection`，symbol 含 `@deepseek-ai/dsh-agent-preset`、两脚本对应 `line`、`necessity: required`），并同步所有计数/golden：`items.length 49→50`、面分布 `11/13/8/7/6/5`、necessity 计数、smoke `COMPAT-002` 断言（`test/smoke.mjs:2162/2178`）、`README` 相关计数；或（不推荐）从两脚本+golden 撤回 4.7——但该探测是真实宿主耦合，按 P-10 应入册。

### P0-2 — legacy settings 迁移的写入 rejection 未被捕获，可致宿主 fail-loud 进程退出

- **位置**：
  - `lib/host-boundary.js:141-146` `settingsFormsUpdate()`：`s.update(ns, patch); return true` —— **未 await、未 catch**；
  - `lib/index.js:279-283` `migrateLegacySettings()`：`settingsFormsUpdate(...) !== true` 判定后即 `logger.info('... migrated ...')` + `return {ok:true, migrated}`；
  - `lib/index.js:1369-1372` 自动触发：`this.migrateLegacySettings().catch(() => {})` —— 外层已 catch，**内层 `update` Promise 仍是 detached rejection**。
- **宿主事实链（0.2.1-rc.2 实装源码；0.2.0 同表面见下）**：
  - `dsh-settings/lib/index.js:470-472`：`async update(ns, patch) { const input = cloneJsonShaped(patch); await this.write(...) }`；
  - `dsh-settings/lib/index.js:501-537`：`write()` 内 `await this.ownerContext.configEditor.edit(...)`；
  - `dsh-config-editor/lib/index.js:122`：`throw new Error('Configuration for "..." is overridden by a home patch or command-line overlay')`（双层同 id / 覆盖场景）；`:83` `resolveConfig(...)` 对非法 legacy 值抛 ValidationError；
  - `dsh-app-boot/lib/index.js:4240-4246` + `:4216-4238`：`unhandledRejection` → `report(err,'fatal load failure')` → `proc.exit(1)`（web profile 由 `profile-boot` 安装 `installFailLoud`）。
  - 0.2.0-rc.2 直接证据：`.scratch-bug011/verify-020/host-out5.log` —— `dsh: fatal load failure: Error: Configuration for "novel-writing" is overridden by a home patch or command-line overlay`（`dsh-config-editor/lib/index.js:122`）；RISK-011③ 已登记该双层状态与 fatal。
- **为什么是 P0**：这是**进程级 fatal**（不是局部失败）；触发面包括本批自己识别并尝试绕行的「同 id 双层」状态、`.imported` 中非法/过期配置值（`resolveConfig` 校验失败）、磁盘/权限 I/O 失败。且当前代码在写入落定前就打印「migrated」，即使进程被全局 handler 拦下也是**假成功**（数据未迁移、用户无感）。
- **最小修复方向**：`settingsFormsUpdate` 返回 `s.update(...)` 的 Promise（或内部 `.catch` 后返回结构化结果）；`migrateLegacySettings` `await` 它，rejection → `{ok:false,error}` + `logger.warn`；自动触发路径检查非 ok 并至少 warn（不得空 `.catch`）；写后成功日志移到 `await` 之后。建议同时为「双层同 id」状态增加保护（`describe()` 同 id 条目数 >1 时拒绝迁移并明确提示重跑安装器）。

### P1-3 — host-contract 未登记本批新增宿主耦合；`revisions[]` 未追加 BUG-011；行号/路由数部分失真

- **位置与证据**：
  - **缺失项**：`@deepseek-ai/dsh-agent-preset` 声明行（面 5 无条目，`lib/host-contract.mjs:162-173` 仅 5.1~5.6）；`dsh-workflow-ptc`（5.2 仍写 `dsh-workflow-worker-thread`，`:164`）；Config/volatile/standard-schema/SettingsForms/`settings.yaml.imported`（1.2 `:105` 仍写 "settings.register 消费"；1.6 `:109` 仍写 register/get，未登记 update/describe/迁移面）；客户端 `uiWorkspace.openSession` / `retainedBy.mainView` / sessions 快照 `current` 消失（面 2 无新条目；2.11 `:137` 仍只写 sessions.open）；install `[4.7]`（见 P0-1）。
  - **`revisions[]` 未追加**：`:72-83` 末项仍为 `CLEAN-006（R2 返工）`（`:83`）；`host-boundary.js:332-334` 的 `CONTRACT_TASK` 派生由此得旧任务名。实机证据：`.scratch-bug011/verify-020/host-out*.log` 的 `[nv-compat] {"task":"CLEAN-006（R2 返工）",...}`。契约头注释 `:44-47` 明确要求宿主耦合变更 MUST 同步 revisions。
  - **行号失真（本批 host-boundary 新增 ~100 行后未随动）**：1.3 `:106` `L19（调用点 L98、L103）` → 实际 `resolveDshHome` 调用点 `host-boundary.js:132`、`:196`；1.5 `:108` `L40 / L51` → `hostInject` 实际 `:53`；1.6 `:109` `L55（调用点 L1457、L95）` → 实际 `registerSettings:111` / `readSettings:121`，index 调用点 `index.js:1560`（L1457 已是 preset-sync 返回行）；1.7 `:110` `L104` → 实际 `super(ctx, SERVICE_NAME)` 在 `index.js:105`；1.9 `:112` `L76 / L1566` → 实际 `onLifecycle:173` / `index.js:1581`。
  - **路由数**：1.8 `:111` 仍写「×13 路由」，实际 `registerHttp` 注册 **14** 条（新增 `api('settings-migrate')`，`lib/index.js:1462`）。
  - **预存在项（非本批引入，披露）**：3.8 `:146` `L3066-3076`，实际 `findSidebarEl()` 起于 `client.js:3075`（区间起点落在无关 `noticeEl,`）；本批按旧值机械 +41 平移，未修正语义。
- **为什么是 P1**：P-10 明确要求宿主耦合字面量/符号入册 + smoke 对账；当前 CI 只抓到 4.7 一处（P0-1），其余新耦合在宿主导线变化时是**零信号**；诊断归因任务名对用户/维护者错误。
- **最小修复方向**：按 P0-1 同一轮补充契约 items（建议：4.7、5.7 声明行/代际变体、2.14 客户端会话双表面、1.12 Config+volatile+SettingsForms 迁移面或重写 1.2/1.6/1.8），追加 `revisions[]` BUG-011 条目，重算 `line` 字段，更新 smoke 的 items 计数/面分布/necessity golden，并保留 3.8 的语义行段校正。

### P1-4 — `js-yaml` 运行时依赖在离线/无 pnpm 安装通道不可解析；迁移失败静默

- **位置**：`package.json:38-39`（新增 `"dependencies": {"js-yaml": "^4.3.2"}`）；`lib/index.js:259`（`await import('js-yaml')`）；安装通道 `install.ps1:194-208`（仅把 `$src/node_modules` junction 到 profile `node_modules`，不装依赖）、`install.sh:97-98`（同义 `ln -s`）；README `:67-75` 明示 install.ps1/install.sh 为「无 pnpm / 内网环境备选」。
- **证据**：
  - ESM 对 junction/symlink 默认解析 **realpath**（本审查最小实验：`modules/linked` junction → `realpkg`，`import "dep"` 从 realpath 解析 ⇒ `ERR_MODULE_NOT_FOUND`，即使 link 父目录有 `node_modules/dep`）。因此插件从 `$src`（发行包解压目录）解析 `js-yaml`，只能在 `$src/node_modules` 或祖先链中找到；installer 只创建 `$src/node_modules → profile/node_modules` 链接，**profile 没有 js-yaml 时仍失败**。
  - `dsh plugin add` 通道由 pnpm 安装 dependencies（可解析）；但纯离线 `install.ps1 -LocalPath .` 首装不跑 pnpm，profile 平坦树无 js-yaml。
  - 失败路径静默：`lib/index.js:1371` 的外层 `.catch(() => {})` 不检查 `migrateLegacySettings` 返回的 `{ok:false,error}`；`lib/index.js:259-263` 的 import/parse 失败只返回错误，自动路径不落日志/不提示 ⇒ 用户 bindings/workspaceRoot 仍留在 `.imported`，工作台以默认 `~/novels` 呈现「书不见了」。
- **为什么是 P1**：这是本批最核心的「用户数据恢复」面；数据未删除，但**静默不迁移**在发布通道上是实质功能缺失（P-07/P-01）。
- **最小修复方向**：三选一或组合——① install 脚本在链接后确保运行依赖（`npm install --omit=dev` / `pnpm install`，或把 `js-yaml` 随发行包内置）；② 解析失败时从 dsh 安装闭包回退读取（`createRequire` 以 dsh 安装锚点为 base，读取其嵌套 `js-yaml`）；③ 自动迁移路径记录成功/失败结果（至少 `logger.warn`），并在失败时通过 `compat`/诊断面暴露。

### P1-5 — install 代系探测失败时的「0.1.x 回退」方向错误：会制造已知 fatal 的双层同 id 状态

- **位置**：`install.ps1:152-164`（`npm root -g` 探测；`:154` 注释「探测失败（npm 不在 PATH / 非全局 npm 安装）⇒ 保守走 0.1.x 分支：步骤 3/4 多做无害动作、不少做关键动作」）；`install.sh:79-88`（同义）；后续 legacy 插入分支 `install.ps1:369-415`、`install.sh:282-294`；settings.yaml 写入 `install.ps1:449-464`、`install.sh:336-350`。
- **证据/推理**：探测只查 `npm root -g/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent-preset`；对 **pnpm/yarn 全局安装、源码 checkout 运行、npx、非 npm 前缀、npm 不在 PATH** 等场景会判 0.1.x。此时在 0.2.x 宿主上会：① 向 profile patch 插入 `- insert: novel-writing`（与 bundle 行同 id）→ RISK-011③ 的 fatal 状态；② 写 `settings.yaml` 触发宿主一次性 rename/import 副作用。注释「多做无害动作」与实证直接矛盾（`verify-020/host-out5.log` / RISK-011③）。
- **为什么是 P1**：错误回退不是「降级」，而是**主动制造已知 fatal**；目标用户正是从 0.1.x 升级的人（其旧 profile patch 可能已有 insert 行，且当前 DSH 可能非 npm-global 安装）。
- **最小修复方向**：探测改为「实际运行 dsh 的安装根」（`Get-Command dsh` → 解析符号链接 → package 目录；或 `dsh --version` + 其 module 路径），并叠加 profile 侧信号（profile `package.json` 是否已有 bundle/依赖、`cordis.patch.yml` 是否已有 insert）；探测不确定时采用**fail-safe**：不写 insert（依赖 bundles 通道），明确警告并要求用户确认，而不是落回 0.1.x。

### P2-6 — Face1 `1.8` 探针对 webServer 假绿；`logWarn` 降级分支实际不可达

- **位置**：`lib/host-boundary.js:248-256`（`ok = hasApi || typeof injectFn === 'function'`）；`lib/index.js:1574-1584`（`mounted === null` 才走 eager + `logWarn`）。
- **问题**：cordis 4.x（0.1.5 起）普遍有 `ctx.inject` ⇒ 即使 webServer 永久缺席，1.8 也报 `ok:true`（`deferred-inject`），缺面告警/诊断面板不再报告；`mounted` 恒非 null ⇒ `logWarn('no webServer mounted...')` 分支成为死代码。BC-01「不伪造安全感」被削弱。
- **修复方向**：将「inject 能力」与「webServer 实际到场」分开：`ok` 仅在实测到场时为 true；deferred 记为 `ok:null`/`pending` 并在超时或首次请求前未到场时 warn；或保留 `logWarn` 的启动后延迟检查。

### P2-7 — 新增服务端双表面/迁移路径无自动化回归看护

- **位置/证据**：`test/smoke.mjs` 对 `markVolatile` / `readLiveConfig` / `legacySettingsSurface` / `settingsFormsUpdate` / `migrateLegacySettings` / `injectWhenReady` **零引用**（grep 结果仅 client text 断言 `sessionsCurrentOf`/open）；`test/validate-preset.mjs` 只覆盖预设；`probe-face` 覆盖 install 头部。迁移（数据恢复/进程 fatal 风险最高）仅由实现者隔离实例 EVD-131 与用户实机确认 EVD-134 覆盖，无 CI 防回归。
- **修复方向**：smoke 增加宿主替身用例：mock SettingsForms（async update 成功/拒绝）、`.imported` fixture、`Config` snapshot、`markVolatile` 在 3.18.2 形状的 fallback；断言失败不产生 unhandled rejection 且返回 `{ok:false}`。

### P2-8 — 工作区 hygiene：`.scratch-bug011/`（15.9 MB）未被 gitignore，内含 dsh-home 凭据/状态

- **位置**：`.gitignore:1-14` 无 `.scratch*`；`git status` `?? .scratch-bug011/`；内含 `verify-020/dsh-home/.credentials.yaml`、`verify-021/...`（各 161 B；SHA256 与真实 `~/.dsh/.credentials.yaml` 不同 ⇒ 合成测试凭据，但仍不应裸露）、`settings.yaml.imported`、sessions/storages、完整插件副本（含 `.git`）。
- **风险**：一次 `git add -A` 即把测试宿主状态/凭据纳入版本库；也污染审查/归档。
- **修复方向**：`.gitignore` 增 `.scratch*/`（或把证据目录移出仓库/归档到受控位置），并在收尾清理/确认无敏感值。

### P2-9 — install 撤除逻辑非原子写 + sh 端失败被当成「跳过」

- **位置**：`install.sh:230`（`REMOVED=$(node -e '...' 2>/dev/null)`）、`:272`（`fs.writeFileSync(p, ...)` 直接覆盖 profile patch）、`:275-278`（`case` 的 `*)` 分支把 node 报错/写入失败也输出为「跳过 insert」）；`install.ps1:358`（`[System.IO.File]::WriteAllText($patch, $body, ...)` 直接覆盖）。
- **问题**：用户 profile patch 被就地重写，无 temp+rename 原子性；sh 端 `2>/dev/null` + 通配分支把**撤除失败**伪装成「无需撤除」，而失败恰好留下 P0-2 的双层状态。
- **修复方向**：写临时文件 + 原子 rename；`REMOVED` 输出中加入失败码（非 0 / `ERROR`）并让脚本以非零退出或明确警告；PS 端同样使用临时文件。

### P2-10 — 契约行号/证据陈述失实（本批自述「47 项行值系统化重基」不成立）

- **位置**：`CHANGELOG.md`（`d8d93c2` 新条目「契约 47 项行值按 git diff hunk 系统化重基」）；`lib/host-contract.mjs` face 1 的 1.3/1.5/1.6/1.7/1.9（见 P1-3）；`docs`/EVD 面：EVD-131 的门禁清单只列 `node --check`/`validate-preset`/`smoke 307/0`，**未列 probe-face**（该门禁当前红），与「三件套全绿」的自述不一致。
- **说明**：不改变行为，但审查入口依赖证据准确性（P-01）；建议订正 commit/CHANGELOG/EVD 措辞，补跑并记录 probe-face。
- **修复方向**：随 P0-1/P1-3 修复后重跑全量 CI 门禁，更新 CHANGELOG 与 EVD-131/复审记录。

### P2-11 — 预设声明行依赖 `agentPresets` 服务的隐式前提（观察项）

- **位置**：`cordis.patch.yml:28-35`；宿主 `dsh-agent-preset` `static inject = ["agentPresets"]`（0.2.0/0.2.1 同源），registry 行在 `@deepseek-ai/dsh-web-app/cordis.patch.yml:586-589`（0.2.1 实装；0.2.0 由 EVD-131 组合树佐证）。
- **说明**：若未来宿主 profile 不装 registry，声明行会 pending（预设选择器无此项）而插件无告警。当前不改代码，建议入契约/README 的「宿主侧前提」并在启动审计中可见（宿主已会打印 waiting for services）。

### P2-12 — legacy 迁移只在「首个 HTTP 请求」触发；纯 headless / 纯工具调用路径永不迁移

- **位置**：`lib/index.js:1369-1372`（迁移触发点嵌在 `registerHttp` 的 `api()` 分发闭包内）；`lib/index.js:253-284`（`migrateLegacySettings` 无其它调用点）。
- **说明**：若用户升级后不打开工作台（HTTP 轮询），只用 `novel_*` 工具/headless 会话，则 `.imported` 的 `workspaceRoot`/`bindings` 不会被迁移，工具按默认 `~/novels` 与空绑定点运行；数据仍在 `.imported`（非丢失），但「自动恢复」承诺不成立。安装脚本只打印迁移提示，不触发迁移。
- **修复方向**：在工具入口（`lib/tools.js` 的 `novel_*` 调用或服务首次 `cfg()` 需要 `bindings/workspaceRoot` 时）也触发一次带幂等标志的迁移，或 boot 完成后以延迟/空闲回调触发（避开已实证的 boot 期 HMR 竞态，并遵守 P0-2 的 await/catch 修复）。

### P3 级（不阻塞；建议记录）

- **P3-1**：`lib/client.js:1626-1649` —— `sessions.open` 存在但抛错时直接 `return false`，不再尝试 `uiWorkspace` 回退；0.2.x 无 `sessions.open` 故实际影响低，但「双通道」语义不完全对称。
- **P3-2**：`lib/index.js:1321-1325` —— `registerRoute()` 返回的 disposer 被丢弃（预存在，非本批引入）；宿主 `dsh-host-webserver/lib/index.js:328` 对重复 `(kind,path)` 抛错，插件热重载后再次注册可能冲突。建议本批顺手收口（`api()` 收集 disposer 并 `onLifecycle`）。
- **P3-3**：`lib/client.js:5212`、`:5242` —— 新增的 `resolveService: (n) => ctx.get(n)` 绕过既有 `makeHostApi` 单点收口，成为第二条宿主访问缝；建议由 `makeHostApi` 适配器暴露 `resolveService` 或在契约面 2 登记。注意：任务书「makeHostApi 收口」的表述与实现不完全一致。
- **P3-4**：`lib/index.js:66` / `:193-198` —— 0.2.x 下 `presetAutoSync` 设置项与 `preset-sync` 路由（`:1455-1457`）为**死配置/死路由**（路由仍返回 `{ok:true,dir:...}`）；建议在 0.2.x 分支返回明确 `skipped` 语义或从设置面隐藏。
- **P3-5**：`lib/index.js:1560` —— `registerSettings()` 的 false 返回值被忽略（0.2.x 预期 false；0.1.x 若表面缺失则静默不注册）；建议至少 `logger.warn` 一次。
- **P3-6**：`lib/index.js:253-284` —— `force:true` 写入无 `expectedRevision`（`SettingsForms.update` 支持 revision 冲突保护），手动强制迁移与设置面并发编辑存在丢失更新窗口；手动路径可接受，建议文档标注。

---

## 5. 已执行核验命令与结果摘要

> 全部只读；无产品/配置/治理写入（除本报告文件）。

| # | 命令 | 结果 |
|---|---|---|
| 1 | `git log --oneline`、`git show --stat 9cb629b/970e802/d8d93c2`、`git show 9cb629b^:...` | 范围/基线/文件集核对完成；本报告 §2 |
| 2 | `git diff --stat d8d93c2..HEAD -- lib test cordis.patch.yml install.ps1 install.sh package.json agent-presets` | 仅 `docs/verification/BUG-011-real-machine-acceptance.md`；产品代码零改动 |
| 3 | `node --check lib/index.js lib/host-boundary.js lib/client.js lib/host-contract.mjs test/smoke.mjs test/validate-preset.mjs test/fixtures/host-surfaces/preset-schema-face.mjs` | 全部通过（0 输出） |
| 4 | `node test/smoke.mjs` | **`SMOKE DONE: 307 passed, 0 failed`**（含 BUG-011 双源等价/判别力/看护接线/客户端双表面断言） |
| 5 | `node test/validate-preset.mjs` | **`PRESET VALIDATION PASSED（schema-face: PASS）`**；patch/yml 双源行解析通过；skills 29/29 |
| 6 | `node test/fixtures/host-surfaces/preset-schema-face.mjs` | **PASS**（启用行 48、比对 37、发现项 0、未校验 23 披露） |
| 7 | `node test/fixtures/host-surfaces/probe-face.mjs` | **FAIL：1 失败 / 28**（P0-1：两脚本 `[4.7]` 不在契约 items）Exit 1 |
| 8 | `node scripts/probe-host.mjs --self-check` | OK：离线自检 6/6 层通过（实机模式 REAL-RUN: UNVERIFIED） |
| 9 | `node test/fixtures/host-surfaces/ci-mock-face.mjs` | OK：4/4 mock 面 ≡ 契约声明面 ⊆ 0.1.5 fixture |
| 10 | PowerShell `Parser::ParseFile install.ps1` / `bash -n install.sh` | 均通过 |
| 11 | 宿主源码实读（0.2.1-rc.2 已装）：`cordis` `resolveConfig`/`ctx.inject`/`get`、`cordis-plugin-loader` `_commitVolatile`、`schemastery` `volatile`/`~standard`、`dsh-settings` `SettingsForms.update/write/importLegacyDocument`、`dsh-config-editor:122`、`dsh-app-boot` fail-loud、`dsh-client-ui-workspace` `uiWorkspace/openSession/mainSessionId`、`dsh-api-session-controller` sessions 无 `open` | 见 §3 各行号引用 |
| 12 | 从 npm cache 解出 `schemastery@3.18.2` 实读 | **有 `~standard`（L52）、有 `.extra`（L128）、无 `.volatile`/volatile refs** ⇒ 0.1.x 静态兼容判断成立 |
| 13 | ESM junction 依赖解析最小实验（临时目录，用毕删除） | 从 realpath 解析：`ERR_MODULE_NOT_FOUND`（支撑 P1-4） |
| 14 | 只读读取 `.scratch-bug011/verify-020`（profile patch、startup 日志、`host-out5/8/9.log`、`dump.txt`）与 `host-surfaces-0.2.0-rc.2.json` | 0.2.0 的 `SettingsForms` 方法面（含 update）确认；双层 fatal/HMR disposed 日志与 RISK-011 一致；`[nv-compat] task` 仍为 `CLEAN-006（R2 返工）` |

---

## 6. 无法核验的面（`待验证`，禁止视为通过）

- **T-1 客户端浏览器级行为（0.2.0-rc.2）**：打开会话（`uiWorkspace.openSession`）、控制台/分栏 current 联动、自动关闭、`retainedBy.mainView` 实际快照更新——本审查无浏览器控件，且 0.2.0-rc.2 的 client 包源码未留存；仅以 0.2.1-rc.2 已装宿主源码与文本断言交叉验证。用户实机确认（EVD-135）不构成本审查的机器复现。
- **T-2 0.1.x 运行时回归**：未安装 0.1.5-rc.2 宿主；`ctx.inject` 回调时序、`Config` 导出在 cordis 4.0.2 loader 下的实际行为、`settings.register(Config)` 行为均为静态推理（schemastery 3.18.2 面已实测）。实现者 EVD-131 也自述「0.1.x 未跑隔离实例」。
- **T-3 install.ps1/install.sh 的端到端实跑**：仅在解析/语法层验证；实际代系探测（`npm root -g`）、撤除、写入行为未在隔离 DSH_HOME 中执行（避免写真实/宿主目录）。EVD-131 的隔离实例证据为实现者自证。
- **T-4 0.2.0-rc.2 的精确宿主包内容**：`dsh-settings`/`dsh-client-ui-workspace` 等仅有方法名快照或 0.2.1 实装；`SettingsForms.update` 的 async 细节在 0.2.0 的同源性依赖 EVD-132 的内容 diff 声明，未独立复现（但 0.2.0 的 fatal 日志已直接证明该写入路径可致进程退出）。
- **T-5 离线/发行包通道的真实依赖布局**：未执行真实 install.ps1 首装 + `dsh web` + 首次请求迁移；P1-4 为静态解析链 + 最小 ESM 实验的结论，发行包是否内置 `node_modules` 未核实（若内置则不触发）。
- **T-6 `dsh plugin add` 在 0.2.0-rc.2 的实跑**：EVD-132 的 0.2.1 首跑为实现者证据；本审查未重复。

---

## 7. 返工与复审建议

- 按 **P0-1 → P0-2 → P1-3/P1-4/P1-5** 顺序修复；P0-1 修复后重跑 `probe-face` + 全量 CI sanity，P0-2 修复须补 mock SettingsForms 的 rejection 用例（P2-7），P1-4 须覆盖离线通道的失败/成功双路径。
- 修复后请发起 **R2 复审**（同一 Reviewer，输入本报告路径；P-10/证据面须逐项回填：host-contract 新条目、revisions、EVD/CHANGELOG 门禁记录、0.1.x/浏览器面的待验证结论是否变化）。
- 本审查不修改任何代码；P2/P3 可作为返工伴随项或后续任务（P2-8 hygiene 建议立即处理）。

---

*报告结束。REVIEW-BUG-011-R1 / NEEDS_CHANGE / unresolved_blockers=5 / 2026-10-20*
