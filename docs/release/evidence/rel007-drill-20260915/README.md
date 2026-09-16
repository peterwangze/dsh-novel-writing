# REL-007 v0.5.3 隔离回滚演练证据（2026-09-16）

**来源**：REL-007（Release Agent）于隔离根 `%TEMP%\rel007-drill-20260915` 实跑，产物直接写入本目录（无易失副本）。
**性质**：**隔离环境**「安装 → 回退 → 再安装」往返；机制承接 REL-006 `docs/release/evidence/rel006-drill-20260912/`。

## 0. 发布身份（本目录对应的发布事实）

| 项 | 值 |
| --- | --- |
| 发布提交 | `f608c17ad281b072f02aaa17658d509da212f62a`（`REL-007: 发布 v0.5.3（CHANGELOG 定稿 + 三件发布文档）`，4 文件 +385/−85） |
| 发布提交树 | `5aa4da51a0f68c7d37ada27f26555d8c36d7052e` |
| tag | `v0.5.3` —— **annotated**（`refs/tags/v0.5.3`，type=`tag`，对象 `12715e2df51ec35bbe2c3955614e9facd7671dc9` → peel `f608c17…`） |
| 回滚目标 | `v0.5.2` —— 对象 `793dde78…` → peel `914725f8…`（树 `8f7382e4…`） |
| push 状态 | **未 push**（tag/commit 均本地；`main` 领先 `origin/main` 1 提交；`git ls-remote --tags origin v0.5.3` 无返回） |
| 候选 tar 指纹 | `sha256=ACF5E4A12161538AB2FF7844C56C01CE2D6BE5A684FF5F50F41621C8B5486818` |

## 1. 性质与边界（如实声明）

- 本演练为**隔离环境**操作（环境变量重定向至临时目录）：`DSH_HOME` / `USERPROFILE` / `HOME` / `APPDATA` / `LOCALAPPDATA` / **`TEMP`**（＋`TMP` / `XDG_*` / `PNPM_HOME` / `npm_config_*` incl. `ignore_scripts=true`）**全部**指向隔离根；每 leg 输出 6 项 `CONTAINMENT … inside_isolation=True` 证据行。
- 取树方式：`git archive --format=tar <ref> -o <ISO>\*.tar` + `tar -xf`（**未执行 `git checkout`**，工作树未被扰动）。
- **fail-closed 机制（沿用 REL-006 v2 本体）**：`Assert-IsoPath` 路径守卫（任何目标路径不在隔离根内即 `throw` 中止）+ `Test-RealPathLeak` 真实路径泄漏检测器（输出行含真实家目录前缀且不含隔离根 ⇒ 立即中止）。本版**新增**：6 项必备变量逐项包含性断言 + 三项「真实值未残留」断言（`USERPROFILE`/`HOME`/`DSH_HOME`/`TEMP`）。
- **相对 REL-006 的一处安全加固**：REL-006 把 `repo-sim\node_modules` 做成指向**真实仓库** `node_modules` 的 junction；本版改为**隔离根内真实空目录**——效果等价（`install.ps1` 的 `Test-Path $src\node_modules` 判真 ⇒ 不会反向在源码树内再建链接），但**彻底消除**指向真实工作树的 junction。
- **真实环境写入事件：0**。真实 `$DSH_HOME`（`C:\Users\peter\.dsh`）在两次演练前后 `strict_deltas=0 ∧ inventory_deltas=0`；`settings.yaml` sha256 `97B815ED…` 与 mtime `2026-09-16T08:41:07` 在 R1 前后、R2 后**三次读数完全一致**；污染签名 `pointsIntoIsolation=False`。
- 验收措辞（M7.7 纪律）：**「隔离环境安装冒烟（环境变量重定向至临时目录）通过」**——不主张任何无限定语的「真实安装/真实环境」验证。

## 2. 演练设计与实测读数

**legs**：`R0`（参照：全新隔离 DSH_HOME 仅装 v0.5.2）→ `C1` 安装 v0.5.3 → `C2` 重装（幂等）→ **`C3` 回退 v0.5.2** → `C4` 再安装 v0.5.3 → `C5` 重装（幂等）

| 判据 | R1 预跑（候选 = 发布提交树 `T`） | **R2 权威跑（候选 = tag `v0.5.3`）** |
| --- | --- | --- |
| 全部 leg `exit` | 0（6/6） | **0（6/6）** |
| 有效版本序列 | `0.5.2 → 0.5.3 → 0.5.3 → 0.5.2 → 0.5.3 → 0.5.3` | **同左** |
| `C1→C2` 同版本重装幂等 | diff=0 | **diff=0** |
| `C4→C5` 同版本重装幂等（往返后） | diff=0 | **diff=0** |
| **`C2→C5` 往返闭环** | diff=0 | **diff=0** |
| `C3→C4` 回退→再安装 | diff=2（`agent.cordis.yml` 内容随版本） | **diff=2（同）** |
| `C1→C3` 升/回退面差异 | diff=2 | **diff=2** |
| **`R0`（全新 v0.5.2）vs `C3`（回滚末端）= 回滚残余** | **diff=0** | **diff=0** |
| 回滚安装耗时（leg `C3`） | 0.611 s | **3.195 s** |
| 往返合计（C1→C5） | 3.289 s | 13.001 s |
| 真实 `$DSH_HOME` strict / inventory delta | 0 / 0 | **0 / 0** |
| `verdict` | PASS | **PASS** |

- **耗时两次差异归因（如实）**：同机负载波动（预跑紧接首次执行、缓存热；权威跑期间本机另有活动）。**判据（幂等/闭环/残余/零写入）两次完全一致** ⇒ 不影响结论；**对外口径取权威跑 3.195 s**。
- `C3→C4` / `C1→C3` 各 2 项差异**全部**为 `.agent-presets/novel-writing/agent.cordis.yml`（v0.5.2 12677 B ↔ v0.5.3 13256 B，两者内容随版本重写）——**预期行为**（v0.5.3 携带 BUG-007 persona `config.prefix` 修复等预设变更），非缺陷。

## 3. 回滚方案（摘要；正典见 `docs/release/rollback-plan-0.5.3.md`）

**何时应回滚**（判据；须可归因到本版范围）：① 插件树加载失败 / 预设挂载失败（`failed to mount`）；② `dsh web` 启动异常或工作台白屏；③ 主链路失败（继续工作流 / 绑定新会话 / 工作区对话框 / 分栏）；④ 预设行 × 已装宿主 schema 校验失败（`validate-preset` FAIL）；⑤ 新增加载期结构化告警/未捕获异常。
**不应回滚**：与 v0.5.3 无关的宿主升级 / v0.6.0 线工作 / 用户路径变更；**v0.5.2 中同样存在**的现象。

**回滚步骤（命令级）**：

```powershell
# 路径 A（推荐）：回到上一发布版并重跑同目录安装脚本（离线、幂等）
git -C "<repo>" checkout v0.5.2
powershell -ExecutionPolicy Bypass -File "<repo>\install.ps1" -LocalPath "<repo>" -Profile web
# 路径 B（仅撤销发布动作，代码不动）：git reset --soft HEAD~1 + git tag -d v0.5.3（仅未 push 时）
# 路径 C（精确代码回退）：git -C "<repo>" checkout v0.5.2
```

**实测耗时**：**回滚安装 3.195 s**（tag 权威跑；预跑 0.611 s）；含人工步骤应 **≤5 分钟**。
**影响面**：**无数据/状态 schema 迁移**；`install.ps1` 仅写 profile 链接 / profile `package.json` 注册项 / `cordis.patch.yml` 行 / `.agent-presets/novel-writing/` / `settings.yaml` 的 `novel-writing` 节——**从不触碰书目/稿件/会话数据**。
**语义边界**：回滚 = **版本回退**（有效版本正确）∧ 插件管理面按该版本内容重写；**≠ DSH_HOME 全量状态还原**（`sessions`/`storages`/`credentials` 等非插件管理面既不被写入也不被还原）。**回滚残余实测 = 0**（`R0 vs C3` diff=0 ⇒ 本版回滚不遗留 v0.5.3 的注册面/内容残余）。

## 4. 文件清单

| 文件 | 内容 |
| --- | --- |
| `report.json` | 结构化结论（candidate/rollback ref·commit·tree·tar 指纹、legs、幂等、耗时、隔离证据、真实环境判定、`verdict=PASS`） |
| `drill-summary.json` / `version-flip-table.json` | 各 leg 读数 / 版本翻转表 |
| `drill-log.txt` | 命令级全程日志（每 leg 的 `ENV REDIRECT` + 6 项 `CONTAINMENT` + install 输出 + `realPathLeak=0`） |
| `snap-R0/C1/C2/C3/C4/C5*.txt` | 各 leg 的 `DSH_HOME` 文件面快照（相对路径 + 长度 + SHA256 / LINK，不递归 reparse） |
| `pre-dsh-fingerprint.txt` / `post-dsh-fingerprint.txt` | 真实 `$DSH_HOME` 前后只读指纹（STRICT 面 + INVENTORY 面 + LEAK_SIGNATURE） |
| `isolate-env.ps1` / `run-drill.ps1` | 演练脚本本体（fail-closed 守卫 + 泄漏检测器 + 6 项包含性断言 + R0 参照 leg） |
| `pre-tag-run/` | **tag 建立前**的等价候选树（`T = 8fae6881…`）预跑副本，供对照（R1） |
| `README.md` | 本文件 |

## 5. 实现期的一次 fail-closed 拦截（如实留档）

首轮启动即被拦截并**未产生任何真实环境写入**：`Get-RealDshFingerprint -Home <path>` 抛
`无法覆盖变量 Home，因为它是只读变量或常量`（PowerShell **只读自动变量** `$HOME`/`$Home` 与参数名冲突）。
该缺陷与 **REL-006 首轮「误写真实 profile 根 3 项」事件的根因同类**（`$home` 赋值静默失效）；本版以参数改名
`$DshHomePath` 规避，并在脚本内写入 `MUST NOT` 注释。**处置符合 fail-closed 预期**：脚本在任何安装动作之前中止，
且守卫/重定向设计使「即使全跑也不触碰真实环境」——事后真实 `$DSH_HOME` 指纹 `strict_deltas=0` 复核一致。

## 6. 复算方式

```powershell
# 按 tag 权威复跑（隔离环境；判据见 report.json）
pwsh -NoProfile -File "docs\release\evidence\rel007-drill-20260915\run-drill.ps1" -CandidateRef v0.5.3
# 真实环境只读复核（不写入任何东西）
Get-ChildItem "$env:USERPROFILE\.dsh" -Force | Select-Object Name,Length,LastWriteTime
Get-Content "docs\release\evidence\rel007-drill-20260915\report.json" | Select-String 'verdict|strict_delta_count|rollback_seconds'
```
