# 回滚方案 — v0.5.3（2026-09-15）

- **关联任务**：REL-007（发布 v0.5.3 —— 修复批承载）
- **检查清单**：`docs/release/release-checklist-0.5.3.md`；**Feature Flag**：`docs/release/feature-flags-0.5.3.md`（本版无 flag，回滚不依赖关 flag）
- **本版发布事实**：发布提交 = `REL-007: 发布 v0.5.3（CHANGELOG 定稿…）`（含 `CHANGELOG.md` + 本三件发布文档）；**tag** `v0.5.3`（annotated，建立在该提交上）；**未 push**（push 由 Coordinator 在 Release Reviewer 通过后执行）
- **上一已发布版本（回滚目标）**：`v0.5.2` —— tag 对象 `793dde78…` → peel `914725f8…`
- **回滚对象性质**：本地 tag / 安装产物版本（**非运行态系统**）——本插件经 junction 安装，代码生效即时（重启 DSH 后加载），**无服务端状态需回置**
- **本版改动面**：`lib/` 代码 + 预设配置键 + 验证资产 + 文档；**无数据/状态 schema 迁移**

---

## 1. 何时应当回滚（触发判据）

**应回滚**（装载 v0.5.3 后出现下列任一，**且**可归因到本版范围）：
1. 插件树加载失败：`plugin tree failed to load` / 预设挂载失败（如 `agent-presets: preset "novel-writing" failed to mount`）。
2. `dsh web` 启动异常或工作台白屏；设置页异常。
3. 主链路不可用：**继续工作流** / **绑定新会话** / 打开工作区对话框 / 分栏切换 失败或静默无响应（本版 4 项用户可见修复的反向回归）。
4. 预设行 × 已装宿主 schema 校验在新宿主上失败（`BUG-007` 面反向回归：`validate-preset` 报 FAIL）。
5. 加载期出现新的结构化告警/未捕获异常，且 `git diff v0.5.2..v0.5.3` 范围内可定位。

**不应回滚**（如实界定边界）：
- 与 v0.5.3 无关的问题：宿主自身升级、v0.6.0 线未发布工作（`COMPAT-*`）、用户书目/工作区路径变更。
- **v0.5.2 中同样存在**的现象（回滚不会改善，须另立缺陷）。
- 仅涉及 4 项修复覆盖面外的新需求（属功能演进，走版本规划而非回滚）。

**回滚时限**：从判定到「版本回退完成（重启 DSH 后生效）」应在 **≤5 分钟**内完成；实测安装脚本单次耗时 **≈0.61 s**（见 §5），人工确认占主要时间。

## 2. 回滚路径（命令级，逐条可执行）

### 路径 A（推荐 —— 回到上一已发布版，用户侧零 git 知识）

```powershell
# Windows：切到 v0.5.2 树，再跑同目录安装脚本（离线、幂等）
git -C "D:\AI\agent\deepseek\harness\writing-workflow" checkout v0.5.2
powershell -ExecutionPolicy Bypass -File "D:\AI\agent\deepseek\harness\writing-workflow\install.ps1" `
  -LocalPath "D:\AI\agent\deepseek\harness\writing-workflow" -Profile web
```

```bash
# *nix
git -C "<repo>" checkout v0.5.2 && bash "<repo>/install.sh" --local "<repo>" --profile web
```

- **幂等**：安装脚本可重复执行（本版演练实测同版本重装 diff=0），重跑安全。
- **生效**：重启 DSH 后加载回退版本。

### 路径 B（仅撤销「发布动作」—— 代码面保持不动）

适用于：仅发布工件（CHANGELOG 段 / 发布文档 / tag）有问题，而**代码无需回退**。

```powershell
# 撤销发布提交（仅本地、未 push 时）：soft 复位保留改动
git -C "<repo>" reset --soft HEAD~1
# 删除本地 tag（annotated）：仅当该 tag 尚未 push
git -C "<repo>" tag -d v0.5.3
```

### 路径 C（精确代码回退到 v0.5.2 基准）

```powershell
git -C "<repo>" checkout v0.5.2        # v0.5.2 代码基准 = tag peel 914725f8
```

- 适用：需要「v0.5.2 基准代码面」而不引入后续批次（本批 6 任务的修复也随之回退）。
- 注意：本版**无**数据/状态迁移，因此路径 C 不需要任何数据回置步骤。

> **禁止**：`git tag --force` / 删除已 push 的 tag / 改写已 push 的提交（破坏发布不可变性）。已 push 后的回退一律以**新版本号**（如 `v0.5.4`）承载。

## 3. 影响面评估

| 面 | 回滚影响 | 依据 |
| --- | --- | --- |
| 数据 / 状态 schema | **无迁移、无回置** | 本版改动面不含 schema/数据格式变更；`settings` 命名空间 `novel-writing` 字段未变 |
| 用户书目 / 稿件 / 工作区数据 | **零影响** | `install.ps1` 只写：profile `node_modules` 链接、profile `package.json` 注册项、`cordis.patch.yml` 行、`.agent-presets/novel-writing/`、`settings.yaml` 的 `novel-writing` 节——**从不触碰书目/稿件/会话数据** |
| 插件注册面 | 版本回退到 v0.5.2（实测有效版本 = `0.5.2`） | 演练 leg `C3` |
| 预设内容 | 按 v0.5.2 内容重写（`agent.cordis.yml` 12677 B ← v0.5.3 13256 B） | 演练 diff `C1→C3`（恰 2 项，均为该文件） |
| **回滚残余** | **0**（回滚末端 ≡ 全新 v0.5.2 安装） | 演练 diff `R0(全新 v0.5.2) vs C3(回滚末端)` = **0** |
| 其它 DSH 状态（sessions / storages / credentials） | **不在作用域**：既不写入也不还原 | 指纹面 `strict`/`inventory` 全等 |

## 4. 实测回滚耗时（隔离环境演练，2026-09-16）

| 步骤 | leg | 实测耗时 |
| --- | --- | --- |
| 安装 v0.5.3（候选） | C1 | **0.585 s** |
| 同版本重装（幂等校验） | C2 | 0.510 s |
| **回滚：安装 v0.5.2** | C3 | **0.611 s** ← **实测回滚耗时** |
| 再安装 v0.5.3 | C4 | 0.485 s |
| 同版本重装（幂等校验） | C5 | 0.477 s |
| （参照）全新 v0.5.2 安装 | R0 | 0.62 s |
| **往返合计（C1→C5）** | — | **3.289 s** |

- **结论**：回滚耗时 **≈0.61 s**（脚本执行），远优于 ≤5 分钟窗口；`exit=0` 全部 leg。
- **口径**：以上为**隔离环境**（`DSH_HOME`/`USERPROFILE`/`HOME`/`APPDATA`/`LOCALAPPDATA`/`TEMP` 全重定向至 `%TEMP%\rel007-drill-20260915`）实测值；**不主张**任何无限定语的「真实环境」耗时。

## 5. 回滚语义边界（实测结论，非沿用历史措辞）

- **回滚 = 版本回退**：有效版本正确回退到 `0.5.2`（实测 leg C3 = `0.5.2`），且**再次安装 v0.5.3 后往返完全闭合**（`C2→C5` 闭环 diff = **0**）。
- **≠「DSH_HOME 全量状态还原」**：install 脚本的作用域仅为**插件管理面**（链接 / 注册项 / patch 行 / 预设 / settings 节）。插件管理面之外的 DSH 状态（`sessions/`、`storages/`、`credentials`、用户书目与工作区数据）**既不被写入、也不被还原**——本版**无**数据/状态 schema 迁移，故无需回置。
- **残余实测 = 0**：回滚末端与「全新 v0.5.2 安装」逐字节一致（`R0 vs C3` diff=0）⇒ 本版回滚**不遗留** v0.5.3 引入的注册面/内容残余。
  （对照：REL-006 的 v0.5.1 回滚曾遗留 4 项——因两版布局注册机制不同；**本版两版机制相同，故无此类残余**。）

## 6. 演练证据指针与复现命令

**证据目录**：`docs/release/evidence/rel007-drill-20260915/`

| 文件 | 内容 |
| --- | --- |
| `report.json` | 结构化结论（candidate/rollback ref·commit·tree、legs、幂等、耗时、隔离证据、真实环境判定、verdict） |
| `drill-summary.json` / `version-flip-table.json` | 各 leg 读数与版本翻转表 |
| `drill-log.txt` | 命令级全程日志（含每 leg 的 `ENV REDIRECT` 与 6 项 `CONTAINMENT … inside_isolation=True`） |
| `snap-R0/C1…C5*.txt` | 各 leg 的 `DSH_HOME` 文件面快照（相对路径 + 长度 + SHA256 / LINK） |
| `pre-dsh-fingerprint.txt` / `post-dsh-fingerprint.txt` | 真实 `$DSH_HOME` 前后只读指纹（strict + inventory 两面） |
| `isolate-env.ps1` / `run-drill.ps1` | 演练脚本本体（fail-closed 路径守卫 + 真实路径泄漏检测器 + 6 项包含性断言） |
| `pre-tag-run/` | 发布 tag 建立前的等价候选树预跑副本（供对照） |
| `README.md` | 演练复算方式 + 回滚方案摘要 |

**复现（隔离环境，只读真实环境）**：

```powershell
pwsh -NoProfile -File "docs\release\evidence\rel007-drill-20260915\run-drill.ps1" -CandidateRef v0.5.3
# 判据：report.json 的 verdict=PASS ∧ all_legs_exit_zero=true ∧ real_env_verdict.strict_delta_count=0
```

**真实环境只读复核（不改动任何东西）**：

```powershell
Get-ChildItem "$env:USERPROFILE\.dsh" -Force | Select-Object Name,Length,LastWriteTime
Get-Content "docs\release\evidence\rel007-drill-20260915\report.json" | Select-String 'verdict|strict_delta_count'
```
