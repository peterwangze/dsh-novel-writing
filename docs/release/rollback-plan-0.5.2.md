# 回滚方案 — v0.5.2（2026-09-12）

- **关联任务**：REL-006（发布 v0.5.2 —— BUG-006 安装通道适配承载）
- **发布记录**：`docs/review/REL-006-release-notes.md`；**检查清单**：`docs/release/release-checklist-0.5.2.md`
- **本版发布事实**：发布提交 `e1f25df84ead0a4d07c655f9afcd379a8a96a2a8`；tag `v0.5.2` = `7ca99d6d…` → peel `e1f25df8…`；**未 push**（RISK-004）
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
git -C "D:\AI\agent\deepseek\harness\writing-workflow" revert --no-edit e1f25df   # 或 reset --hard <v0.5.2 之前的提交>
```

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
| 已在测试环境**实际演练** | ⚠️ **未执行** —— 本版回滚对象为本地 tag/安装版本（非运行态系统），且发布未 push（无生产面）；**不主张已验证**。演练窗口建议：push 完成后由用户侧首次安装前执行一次路径 A 往返（install v0.5.2 → checkout v0.5.1 → install → 回 v0.5.2）。 |
| 数据兼容性结论 | ✅ 不涉及（§3） |
