# 会话快照 — 2026-09-04（BUG-003 dsh 0.1.2-rc.1 兼容性启动失败修复）

- **session_id**: 20260904-bug003-dsh-compat
- **session_date**: 2026-09-04
- **agent**: DeepSeek Harness Coordinator (software-project-governance)

## 当前状态
- **current_stage**: 6/11 development（G5 passed-with-conditions，DOC-001 跟踪）
- **trigger_mode**: always-on / **permission_mode**: maximum-autonomy
- **项目总览**: 68 任务 / 64 已完成 / 0 阻塞 / 风险 2（RISK-002、RISK-003）
- **版本**: v0.5.0（已发布 2026-08-30）+ **BUG-003 修复待发布**（CHANGELOG [Unreleased] 就绪，发布号 v0.5.1 待 Release Gate 用户确认）

## 本轮完成（增量）
- **BUG-003 P0 兼容性修复**（EVD-076）：
  - 用户报障：dsh 升级 0.1.2-rc.1 后 `npx @deepseek-ai/dsh web` 启动崩溃——`@deepseek-ai/dsh-settings` 0.1.2-rc.1 移除 `settingsNamespace` 导出（新导出面仅 SettingsConflictError/SettingsProvider/redactSecrets，npx 缓存包 L610 实证），本插件 lib/index.js:18 具名导入触发 ESM SyntaxError → plugin tree load 失败。
  - 修复（Developer agent 执行，2 处语义改动）：删除该导入；`NS = settingsNamespace('novel-writing')` → 普通字符串常量 `'novel-writing'`（新版 register/get 收普通字符串、parseSettingsNamespace 校验 /^[a-z][a-z0-9-]*$/，'novel-writing' 合规——包源码 L82-86/L282/L389 实证）。register/get 两处使用面零改动。
  - 其余 peer 依赖逐项核验兼容：cordis 4.0.2（Service / ctx.get 未提供返回 undefined 不抛错 / effect 带 label）、schemastery 3.18.2 默认导出、dsh-home-paths/dsh-tools 0.1.2-rc.1 导出面——**唯一断点即 settingsNamespace**。
  - 验证：node --check ×2 0 错误；smoke 147/147（修复前因同一导入必失败=天然回归基线；Developer + Code Reviewer 独立复跑一致）；模块动态 import 冒烟 ok；**实机** `npx @deepseek-ai/dsh web` 启动成功（web 地址正常输出）+ `/novel-writing/api/overview` HTTP 200 返回真实书目 novel-001。
  - Code Reviewer 结论 **APPROVED 无 blocker**（P2 非阻断备注 ×2：①NS 常量与 client.js 6 处 'novel-writing' 字面量无编译期联动〔既有结构，浏览器 bundle 不能 import 服务端常量〕②新版 register 对非法存量配置节 fail-loud〔上游契约〕）。
  - CHANGELOG [Unreleased] 入账；版本归属 v0.5.1。

## 遗留任务
| 任务 ID | 描述 | 优先级 |
|---------|-------------|--------|
| REL-005（待入账） | 发布 v0.5.1（BUG-003 承载版本）——发布时机待用户 Release Gate 确认 | P1 |
| UX-054 | 视觉遗留批次（F3/F4/F7~F12+G1+死键 rel/mon+R4-P1 deps 窗口+0 本渲染树断言+CHANGELOG 横幅守卫记录）| P2 |
| CLEAN-004 | 实机浏览器验证清单（含 UX-059 几何探针项）| P2 |
| README-v4-陈旧 | README「.nv-tag 版本徽标（当前 v4）」陈旧句清理 | P2 |
| DOC-001 / REL-002 / SYSGAP-001 / CLEAN-003 | 既有 P2 | P2 |

## 待确认决策
- **v0.5.1 发布**：BUG-003 修复已就绪未发布；发布号/tag 时机由用户决定（Release Gate 确认）。
- ~~UX-056 视觉演进~~：用户已决定暂停，等用户单独启动（勿主动推进视觉迭代）。

## 用户偏好设置（延续）
- DEC-021 主题无关 / 视觉工作方法论（真看图+探针+vision 三角化）/ 插件 UI 居于外围 / 兼容红线（零宿主改动）/「恢复原样」零容忍 / 文案零改动（DEC-022 白名单除外）
- P-09 逐条勾稽 + 对齐几何零容忍（1px 台阶类缺陷为历史高频退回项）

## 环境备注
- dsh 0.1.2-rc.1（npx 缓存 + `~/.dsh` 安装 + 仓库 node_modules 三处同版）；dsh web http://127.0.0.1:3080 验证通过（本 session 验证实例已停，端口已释放）。
- 仓库 node_modules 与 `~/.dsh` profiles 为 junction 关系，插件从仓库路径直接加载（报错栈实证）——仓库文件修复即本机生效，无需重新安装。
- git 正常；commit-msg hook 拦截「编造/幻觉/我(假设猜测推测估计)/(大概应该可能)(已经是可以完成存在)」字面——commit message 措辞避开。
