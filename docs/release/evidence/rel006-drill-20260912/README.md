# REL-006 v0.5.2 隔离回滚演练证据（2026-09-12）

**来源**：`%TEMP%\rel006-drill-20260912`（Release 返工 agent 执行，加守卫后重跑产物），由 Coordinator 于 2026-09-12 **固化入仓**——原 temp 副本可能被系统清理，而 REVIEW-REL-006-R2 的必查项要求「补强证据在仓内可读」。

## 性质与边界（如实声明）

- 本演练为**隔离环境**操作（环境变量重定向至临时目录）：`DSH_HOME` / `USERPROFILE` / `HOME` / `APPDATA` / `LOCALAPPDATA` / `XDG_*` / `PNPM_HOME` / `npm_config_*` 全部指向隔离根；npm 操作 `--ignore-scripts`。
- 取树方式：`git archive --format=tar v0.5.x` + `tar -xf`（**未执行 `git checkout`**，工作树未被扰动）。
- **唯一真实环境写入事件**：首轮演练因 PowerShell `$HOME` 只读自动变量冲突（`$home = ...` 赋值静默失效），`DSH_HOME` 被设为真实用户目录，写入 3 项（均已断言 `CreationTime ∈ [19:05:00, 19:06:30]` 后清理并核验不存在）。见 `.governance/evidence-log.md` **EVD-098** 与 `.governance/risk-log.md` **RISK-006**（含 fail-closed 守卫与泄漏检测器说明）。**生产结果全部来自加守卫之后的运行**（`realPathLeak=0`）。
- 验收措辞（M7.7 纪律）：**「隔离环境安装冒烟（环境变量重定向至临时目录）通过」**——不主张任何无限定语的「真实安装/真实环境」验证。

## 文件清单

| 文件 | 内容 |
|---|---|
| `drill-log.txt` | 演练全程命令级日志（4496 B） |
| `drill-summary.json` | 结构化结论（往返/幂等/版本翻转） |
| `version-flip-table.json` | 版本翻转表（各步有效版本读数） |
| `pre-dsh-fingerprint.txt` / `post-dsh-fingerprint.txt` | 真实 `~/.dsh` 演练前/后指纹（各 13 项，逐项对照） |
| `snap-A1-v051.txt` … `snap-A5-v051-back.txt` | 路径 A 五步快照（A1 v0.5.1 → A2 重装 → A3 v0.5.2 → A4 重装 → **A5 回滚 v0.5.1**） |
| `snap-B1-legacy-v051.txt` / `snap-B2-legacy-v052.txt` | 旧布局对照（B1→B2） |
| `snap-leg1-v051.txt` | 旧布局首轮快照 |
| `isolate-env.ps1` / `run-drill.ps1` | 演练脚本（含 **fail-closed 隔离断言** + **真实路径泄漏检测器**，首轮事故的纠正措施本体） |

## 结论摘要

- **6 次 `install.ps1` 全部 `exit=0`**；有效版本序列 `0.5.1 → 0.5.1 → 0.5.2 → 0.5.2 → 0.5.1`（**回滚生效**）。
- **幂等 diff = 0**：A1→A2、A3→A4、回滚 A4→A5、旧布局 B1→B2 均为 0。
- **闭环 A2→A5 diff = 4**（**如实**）：v0.5.2 新增的新布局注册项（`profiles/web/node_modules` 链接 + profile `package.json` 280→408 B）**不被 v0.5.1 清理** ⇒ **回滚 = 版本回退（有效版本正确），非 DSH_HOME 状态还原**。该语义边界已写入 `docs/release/rollback-plan-0.5.2.md`。
- `realPathLeak=0`：守卫后所有安装的真实路径泄漏检测均为零。
- 真实 `~/.dsh` 未被触碰：`settings.yaml` 的 `LastWriteTime` 演练前后恒为 `2026/9/12 12:05:06`；前后指纹仅 `sessions`/`storages` 因**本会话自身**增长。

## 复算方式

```powershell
# 真实环境未被触碰（只读）
Get-ChildItem "$env:USERPROFILE\.dsh" -Force | Select-Object Name,LastWriteTime
# 三项事故残留应不存在（只读）
Test-Path "$env:USERPROFILE\profiles"; Test-Path "$env:USERPROFILE\.agent-presets\novel-writing"; Test-Path "$env:USERPROFILE\settings.yaml"
# 工件与结论对照
Get-Content docs/release/evidence/rel006-drill-20260912/drill-summary.json
```
