# 回滚方案 — v0.5.2（2026-09-12）

- **关联任务**：REL-006（发布 v0.5.2 —— BUG-006 安装通道适配承载）
- **发布记录**：`docs/review/REL-006-release-notes.md`；**检查清单**：`docs/release/release-checklist-0.5.2.md`
- **本版发布事实**：发布提交 `e1f25df84ead0a4d07c655f9afcd379a8a96a2a8`（版本 bump）+ 返工链 `792030c`（R1 补强）→ `6f0027b`（M7.7 事件机写证据）→ `914725f8`（演练工件固化）；tag `v0.5.2` 对象 **`793dde78…` → peel `914725f8…`**（DEC-027 重定后；旧对象 `7ca99d6d…` → peel `e1f25df8…` **已随重定删除**，supersede 留痕）；**未 push**——**push 已授权**（DEC-027，用户已授予 `workflow` scope），按执行序待 R2/R3 审查通过后由 Coordinator 执行
- **上一已发布版本**：v0.5.1（tag target `cd1911e`）
- **回滚对象性质**：本地 tag / 安装产物版本（**非运行态系统**——本插件经 junction 安装，代码生效即时，无服务端状态需回置）

---

## 1. 回滚触发条件

- 装载 v0.5.2 后出现**主链路异常**：安装脚本在新/旧宿主布局下失败、`dsh web` 启动异常、插件挂载失败（`plugin tree failed to load`），**且**定位到本版范围（BUG-006 安装通道适配）。
- 非本版范围的问题（如 v0.6.0 线未发布工作、宿主侧变更）**不触发**本回滚，按各自任务处理。

## 2. 回滚路径（命令级，逐条可执行）

### 路径 A（推荐 —— 用户侧零 git 操作，回到上一已发布版）

```powershell
# Windows
git -C "D:\AI\agent\deepseek\harness\writing-workflow" checkout v0.5.1
powershell -ExecutionPolicy Bypass -File "D:\AI\agent\deepseek\harness\writing-workflow\install.ps1"
```

```bash
# *nix
git -C "<repo>" checkout v0.5.1 && bash "<repo>/install.sh"
```

- 特性：安装脚本**幂等**（重复执行不产生重复行/重复键/不损坏 JSON——BUG-006 交付已验证），故重跑安全。
- 适用：用户侧安装产物异常，需退回上一个已发布版本。

### 路径 B（代码面精确回退 —— 保留 v0.5.x 线、去除 v0.6.0 线工作）

```powershell
git -C "D:\AI\agent\deepseek\harness\writing-workflow" checkout 3442f39
```

- `3442f39` = **v0.5.2 代码基准**（BUG-006 修复 `471ed00` + 治理收尾），**已在远端** `origin/main`。
- 适用：需要「BUG-006-only 代码面」；本版 tag 树含未发布的 COMPAT-002~016（v0.6.0 线）内容，此路径可精确剥离。

### 路径 C（撤销本版发布动作 —— 仅本地未 push 时可用）

```powershell
git -C "D:\AI\agent\deepseek\harness\writing-workflow" tag -d v0.5.2

# 变体 ① reset —— 彻底回到发布前（会丢弃本地此后全部提交；仅本地未 push 且不需保留这些提交时可考虑）
git -C "D:\AI\agent\deepseek\harness\writing-workflow" reset --hard e1f25df8^   # = 发布提交 `e1f25df8` 之前（`dd6b5ef`）

# 变体 ② revert 序列 —— 保留历史（逐个覆盖撤销范围内的全部提交，倒序：新 → 旧）
git -C "D:\AI\agent\deepseek\harness\writing-workflow" revert --no-edit ea56693 8a0448a 66f0213 ef23ed3 914725f8 6f0027b 792030c e1f25df8
```

- **撤销范围（N4 + N6 订正，与当前提交结构对齐）**：撤销本版发布动作须覆盖**两类提交**——
  1. **发布动作链 4 提交**（在 tag 树内）：`e1f25df8`（版本 bump）→ `792030c`（R1 补强）→ `6f0027b`（M7.7 事件机写证据）→ `914725f8`（演练工件固化 = 当前 tag peel）；
  2. **tag peel 之后的治理/审查提交**（**不在 tag 树内**）：`ef23ed3`（R2 复审机录）→ `66f0213`（返工 R2）→ `8a0448a`（tracker 口径清理）→ `ea56693`（R3 终审机录）。
- **两变体的适用面与覆盖差异**：**① `reset` 覆盖完备**——`reset --hard e1f25df8^` 丢弃 `e1f25df8` 的**全部后代**（上列 8 提交 + 发布后治理提交 `e093e72` 发布工件补建 / `6618dde` COMPAT-016 关单 / `5643e7c` R1 机录与 DEC-027 裁定，共 11 提交），无遗漏；代价是这些**未 push 提交一并丢弃**（脱离分支，仅 reflog 可短期寻回）⇒ 仅在「确定不要这些本地提交」时使用。**② `revert` 序列保留历史**（每条各产生一个反向提交，可复查），但**须显式列出**上述 8 提交——单 `revert e1f25df` 或仅 revert tag 树内 4 提交**均已不足以**覆盖 tag peel 之后的治理提交；若需零残留，可用等价值 `git revert --no-edit e1f25df8^..HEAD`（一次覆盖区间**全部**提交，git 按时间倒序处理）。**同一文件被多个提交连续修改时 `revert` 可能需手工解冲突**（治理记录面尤为常见）。
- **读数口径**：上列 SHA 为**落盘时实测**（`git log --oneline --reverse e1f25df8..HEAD` / `914725f8..HEAD`）；该区间随治理提交增长 ⇒ **执行前 MUST 重跑实测**，不得照抄本文数量。
- **演练状态（如实标注，措辞纪律）**：路径 C 两变体**均未演练（仅命令级推演）**——§6/§7 的隔离实测覆盖**路径 A**；本路径的订正为**描述与提交结构对齐**，未对仓库执行任何 `reset`/`revert`/tag 命令。
- 前置事实：发布提交与 tag **均未 push**（远端 `refs/heads/main` = `3442f39…`；`git ls-remote origin refs/tags/v0.5.2` 为空）⇒ **撤销无远端影响、无他人可见面**。
- ⚠️ 一旦 push 完成，本路径失效（届时须走 `revert` + 新版本号，不得改写已发布历史）。

## 3. 影响面与数据兼容性

| 维度 | 评估 |
| --- | --- |
| 数据面 | **不涉及**——本版无 schema/数据迁移；`settings` ns `novel-writing` 字段面未变（`bindings`/`workspaceRoot`/`enabled` 等保持） |
| 书稿数据 | **零影响**——安装脚本只操作 DSH profile 布局（junction + profile `package.json` + `cordis.patch.yml`），不触碰书稿目录 |
| 宿主配置 | 旧布局行为完全不变；新布局新增的注册键可由路径 A 的安装脚本按目标版本状态重建（幂等） |
| 回滚影响范围 | 仅插件代码生效版本回退；已写书稿/设置保留 |

## 4. 预计回滚时间

**< 1 分钟**（git checkout + 幂等安装脚本；无数据迁移、无服务端状态回置；如宿主需重启以生效，另计重启时间）。

## 5. 验证方式（回滚后）

1. `git -C <repo> rev-parse HEAD`（或 `describe --tags`）确认指向目标版本/tag。
2. 重跑发布前三件套：`node --check` ×12 / `node test/validate-preset.mjs` / `node test/smoke.mjs` ⇒ 期望 `0 失败` / `PASSED` / 目标版本对应的 smoke 通过数（v0.5.1 = 203 passed / 0 failed）。
3. 安装面：确认 `install.ps1|install.sh` 对当前宿主布局走对应分支且幂等（重复执行后 diff 为零）。
4. 用户侧：启动 `dsh web`，确认插件挂载与工作台入口可用。

## 6. 状态（如实标注）

| 项 | 状态 |
| --- | --- |
| 方案已定义（A/B/C，命令级） | ✅ |
| 已在测试环境**实际演练** | ✅ **已执行（隔离环境，2026-09-12 返工轮）**——路径 A 往返在隔离根 `%TEMP%\rel006-drill-20260912` 实跑：v0.5.1 安装 → 校验 → v0.5.2 安装 → 校验 → 回滚 v0.5.1 → 校验，逐步 exit 0、有效版本 0.5.1→0.5.2→0.5.1、同版本重装幂等 diff=0。**原始记录见 §7**。先前版本本条为「⚠️ 未执行」——该差距已由 §7 关闭（F1 / 硬门槛 H2）。 |
| 数据兼容性结论 | ✅ 不涉及（§3） |
| 残留项（本次实测发现，如实记录） | ⚠️ 回滚**非 DSH_HOME 状态还原**：v0.5.2 写入的新布局注册项（profile `node_modules` 链接 + `package.json` dependencies/bundles）在回滚到 v0.5.1 后**保留**（v0.5.1 脚本无新布局感知）。**有效版本正确、无功能影响**，但若需「干净回退」，须手工移除该链接与注册键——见 §7.4 |

---

## 7. 演练记录（隔离环境，2026-09-12）

> **验收措辞（M7.7 纪律）**：**隔离环境安装冒烟（环境变量重定向至临时目录）通过**。
> 本记录**不使用**无限定语的「真实安装 / 真实环境 / 已真实验证」；所有动作均在隔离根内完成。

### 7.1 演练设置（隔离边界与取树方式）

| 项 | 值 |
| --- | --- |
| 隔离根 | `C:\Users\peter\AppData\Local\Temp\rel006-drill-20260912`（下称 `<ISO>`） |
| 取树方式（**不用 `git checkout`**） | `git -C <repo> archive --format=tar -o <ISO>\tree-v0.5.1.tar v0.5.1` → `tar -xf <ISO>\tree-v0.5.1.tar -C <ISO>\tree-v0.5.1`；v0.5.2 同法。**当前工作树未被切换、未被修改** |
| 引用确认（演练前 `git rev-parse`） | `v0.5.1` tag = `7d4d89923e4e572d9af0003182a344d0acb0f2e9` → peel `cd1911e9f1e3bbb90b6197fa3cf7a5e95a1ea373`；`v0.5.2` tag **演练时读数为** `7ca99d6d612d90aadeba83d4c7ad40ed61feafa4` → peel `e1f25df84ead0a4d07c655f9afcd379a8a96a2a8`〔**重定前**取值，历史留痕〕——**当前身份（DEC-027 重定后）= 对象 `793dde78…` → peel `914725f8…`**；`7ca99d6d…` 已随删 tag 不再由 `for-each-ref` 返回。**演练代表性不受影响**：`git diff --name-only e1f25df8 914725f8` 实测 `install.ps1`/`install.sh` **0 改动** |
| 环境重定向（全部指向 `<ISO>`） | `DSH_HOME` · `USERPROFILE` · `HOME` · `APPDATA` · `LOCALAPPDATA` · `XDG_CONFIG_HOME` / `XDG_DATA_HOME` / `XDG_CACHE_HOME` / `XDG_STATE_HOME` · `PNPM_HOME` · `npm_config_cache` / `npm_config_userconfig` / `npm_config_globalconfig` / `npm_config_prefix` · `npm_config_ignore_scripts=true` |
| 夹具 | `home-new`（模拟 dsh ≥0.1.5 新布局：`profiles\web\package.json` 存在、未注册本插件）；`home-legacy`（模拟 dsh ≤0.1.2 旧布局：无 profile package.json）。夹具结构按真实 `~/.dsh/profiles/web/package.json` 形态建模（只读取样，未写入） |
| 安装调用 | `powershell.exe -ExecutionPolicy Bypass -NoProfile -File <ISO>\repo-sim\install.ps1 -LocalPath <ISO>\repo-sim -Profile web`（离线 `-LocalPath` 模式；无 git / 无网络 / 无 npm 调用） |

**路径 A 的隔离开等价物**：真实路径 A = `git checkout <tag>`（就地换树，junction 目标路径不变）+ 重跑 `install.ps1`。隔离等价物 = 单一 `repo-sim` 目录**就地换内容**（`node_modules` 常驻 junction → 真实仓库依赖树，只读复用）+ 重跑 `install.ps1`。二者对安装脚本的输入面等价（同一路径、内容换版本），且**无需切换工作树**。

### 7.2 演练往返（路径 A：v0.5.1 → v0.5.2 → 回滚 v0.5.1）

新布局 `home-new`：

| Leg | 换树到 | install exit | 有效版本（profile 链接解析） | 旧路径链接版本 | profile 注册 | 快照行数 |
| --- | --- | :--: | --- | --- | :--: | :--: |
| A1 | v0.5.1 | 0 | （无 profile 链接——v0.5.1 只走旧路径） | 0.5.1 | 未注册 | 87 |
| A2 | v0.5.1（重装） | 0 | （同上） | 0.5.1 | 未注册 | 87 |
| A3 | **v0.5.2** | 0 | **0.5.2** | 0.5.2 | **已注册**（dependencies + bundles） | 89 |
| A4 | v0.5.2（重装） | 0 | 0.5.2 | 0.5.2 | 已注册 | 89 |
| A5 | **回滚 v0.5.1** | 0 | **0.5.1** | 0.5.1 | 已注册（残留） | 89 |

旧布局 `home-legacy`（验证「旧布局行为完全不变」）：

| Leg | 换树到 | install exit | 旧路径链接版本 | profile 注册 | 快照行数 |
| --- | --- | :--: | --- | :--: | :--: |
| B1 | v0.5.1 | 0 | 0.5.1 | 未注册（无 profile package.json） | 86 |
| B2 | v0.5.2 | 0 | 0.5.2 | 未注册 | 86 |

### 7.3 幂等性与闭环判定（文件面 SHA256 快照 diff）

快照口径：隔离 DSH_HOME 全量递归（相对路径 + 长度 + SHA256；junction/reparse 记 `LINK` 且不递归）。

| 判定 | Before → After | diff |
| --- | --- | :--: |
| 同版本重装幂等（v0.5.1） | A1 → A2 | **0（零差异）** |
| 同版本重装幂等（v0.5.2） | A3 → A4 | **0（零差异）** |
| **回滚步**（v0.5.2 → v0.5.1） | A4 → A5 | **0（零差异）** |
| 升版步（v0.5.1 → v0.5.2） | A1 → A3 | 4 项（= v0.5.2 新增的新布局注册面） |
| **版本往返闭环**（原始 v0.5.1 态 → 往返后） | A2 → A5 | **4 项**（残留，见 §7.4） |
| 旧布局版本切换（v0.5.1 → v0.5.2） | B1 → B2 | **0（零差异）** |

**关键结论**：
1. **回滚生效**：A4（有效版本 0.5.2）→ A5（有效版本 0.5.1）成立，且 DSH_HOME 无需任何变更（`diff=0`）——因为路径 A 的版本翻转由「就地换树」完成，重跑安装脚本是幂等空操作。**§4 预计回滚时间 < 1 分钟成立**（安装脚本全程 exit 0，单 leg 亚秒级）。
2. **幂等成立**：同版本重复安装 → 零差异（命令级实证，替代原「BUG-006 交付内宣称」）。
3. **旧布局零回归**：B1 → B2 `diff=0` —— v0.5.2 安装脚本在旧布局下产生的状态与 v0.5.1 **逐字节一致**，实证 CHANGELOG `[0.5.2]` 条目「旧布局行为完全不变」。
4. **版本自适应成立**：A3 起脚本输出 `检测到 dsh 新布局（≥0.1.5 per-profile）` 并写入 profile `dependencies` + `bundles`；A1/A2（v0.5.1）在同为新布局的 HOME 下仍走旧路径、不写注册 —— 版本差异被实测区分。

### 7.4 实测发现的残留（如实记录，不掩盖）

1. **回滚不还原 DSH_HOME 状态**：A2（原始 v0.5.1 态）→ A5（往返后）`diff=4`，恰为 v0.5.2 新增的新布局注册面——`DIR profiles/web/node_modules`、`LINK profiles/web/node_modules/dsh-novel-writing → repo-sim`、`profiles/web/package.json`（280 B → 408 B）。**原因**：v0.5.1 的安装脚本无新布局分支，无法感知/清理该注册。**影响**：有效版本仍正确（链接指向同一代码路径），无功能影响；但口径上 **回滚 = 版本回退，非 DSH_HOME 状态还原**。若要「干净回退」，需手工移除 `profiles/<Profile>/node_modules/dsh-novel-writing` 链接与 profile `package.json` 中的 `dependencies.dsh-novel-writing` / `dsh.profile.bundles` 项。
2. **旧路径链接在升版后不被清理**：A1/A2 在旧路径建了链接，A3（v0.5.2，新布局分支）在新路径另建链接，**两条链接并存**（`legacyLink=True` 且 `newLink=True`）。二者指向同一代码路径 ⇒ 版本一致，无功能影响；列为观察项。

### 7.5 真实环境防护（M7.7）与事件如实披露

**三选一满足项**：采用「**隔离环境（环境变量重定向至临时目录）**」——隔离根 + `DSH_HOME`/`npm_config_*`/`USERPROFILE`/`HOME`/`APPDATA`/`XDG_*`/`PNPM_HOME` 全量重定向；`npm` 操作一律 `--ignore-scripts`（本演练实际未调用 npm：`install.ps1 -LocalPath` 为纯本地文件操作）。

**零真实 `$HOME` 写入的证据**：
- 演练前后对真实 `~/.dsh`（`C:\Users\peter\.dsh`）做逐项 fingerprint（13 个顶层条目的 文件数 / 总字节 / 最大 mtime）→ `Compare-Object` 结果：**`LastWriteTime` 恒为 `2026/9/12 12:05:06` 未变**；唯二差异为 `sessions` / `storages` 两个目录的字节数增长（**本 agent 会话自身**的实时会话日志与存储写入，非演练所致；两者文件数均未变）。
- 每次 `install.ps1` 输出逐行过**真实路径泄漏检测器**：出现 `C:\Users\peter\` 且不含隔离根即判 FAIL 并中止 → **6 次安装全部 `realPathLeak=0`**。

**如实披露：首轮演练发生真实环境写入（已清理，已加防护）**
- **根因**：演练脚本内 `$home = Join-Path $ISO 'home-new'` 赋值失败——PowerShell 中 `$HOME` 是**自动变量且 `Options = ReadOnly, AllScope`**，变量名大小写不敏感 ⇒ 赋值报非终止错误（`无法覆盖变量 HOME，因为它是只读变量或常量`），`$home` 保留真实值 `C:\Users\peter`，导致传入 `-DshHome $home` 的是真实用户目录、`DSH_HOME` 被设为 `C:\Users\peter`。
- **实际副作用（3 项，均为新建，CreationTime 全部 = 演练时刻）**：`C:\Users\peter\profiles\`（含链接与 `web\cordis.patch.yml`）、`C:\Users\peter\.agent-presets\novel-writing\`（47 文件）、`C:\Users\peter\settings.yaml`（85 B）。
- **清理（已完成）**：删除前逐个断言 `CreationTime ∈ [19:05:00, 19:06:30]`（= 演练窗口），**任一不在窗口即 `throw` 中止**（防误删用户既有数据）→ 守卫 PASSED 后先 `.Delete()` 断 junction 链（不触目标）、再删 3 项；删后核验 `exists=False` × 3。真实 `~/.dsh` 全程未被触碰。
- **纠正措施（重跑前生效）**：`$home` → `$dshHomeIso` 重命名；`Assert-IsoPath` fail-closed 守卫（任何目标路径 MUST 以隔离根为前缀，否则 `throw`）；`Set-IsoEnv` 环境变量生效值二次断言；新增真实路径泄漏检测器；调用侧 `$ErrorActionPreference='Stop'`（同类静默赋值失败将直接终止）。§7.2/§7.3 全部结果来自**加守卫之后**的运行。
- **本次演练的工件**（供 R2 复核）：`<ISO>\isolate-env.ps1`（守卫实现）、`<ISO>\run-drill.ps1`（驱动）、`<ISO>\drill-log.txt`（逐 leg 原始输出）、`<ISO>\snap-*.txt`（7 份文件面快照）、`<ISO>\drill-summary.json`、`<ISO>\version-flip-table.json`、`<ISO>\pre-dsh-fingerprint.txt` / `post-dsh-fingerprint.txt`。**存放口径（N3 订正）**：工件**已固化入仓**——`docs/release/evidence/rel006-drill-20260912/`（15 件工件 94.9 KiB + `README.md` 索引；目录实测 16 文件 / 98.4 KiB；随证据固化提交 `914725f8` 入仓，提交面 16 files / +1281）；**原 temp 副本可能被系统清理**，仓内副本为可复查面（存放口径见该目录 `README.md` L3）。本 §7 与 `release-checklist` §C.2/§D.1 为仓库内可读的记录面，与仓内证据目录互为对照。

### 7.6 演练结论

| 项 | 结论 |
| --- | --- |
| 路径 A 命令正确性 | ✅ 命令级可执行、全程 exit 0 |
| 路径 A 幂等性 | ✅ 同版本重装 diff=0；回滚步 diff=0 |
| 回滚生效（版本层面） | ✅ 0.5.2 → 0.5.1 生效，< 1 分钟 |
| 旧布局零回归 | ✅ B1→B2 逐字节一致 |
| 回滚的状态还原完整性 | ⚠️ 部分——新布局注册项残留（§7.4-1），有效版本正确 |
| 真实环境写入 | ✅ 隔离环境内完成；真实 `~/.dsh` 未触碰（§7.5）
