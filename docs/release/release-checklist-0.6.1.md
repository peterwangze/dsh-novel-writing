# 发布检查清单 — v0.6.1（2026-11-09）

- **关联任务**：BUG-013（P0 基础启动回归）、REL-009（发布）
- **版本**：`0.6.1`（patch）
- **发布通道**：GitHub annotated tag `v0.6.1`；该包不在 npm registry，不执行 npm publish
- **上一版本 / 回滚点**：`v0.5.3`（`v0.6.0` 含 BUG-013，不建议作为回滚点）
- **变更类型**：修复 + 文档
- **数据迁移**：无新增数据迁移；沿用 0.6.0 的 `studio.v2` / `theme.v1` / `typography.v1`。

## 修复

- 启动/继续工作流时宿主报 `unknown prompt variable "{{cwd}}"`（section `deployment:persona-prefix`；registered variables: provider, model）。
- 两处 persona prefix 删除 `{{cwd}}`，保留 `{{model}}`。
- 新增 `validate-preset` prompt 变量白名单 + smoke 断言；README smoke 计数 366→367。

## 发布前核验

| 检查 | 结果 |
|---|---|
| `package.json` version | `0.6.1` |
| `CHANGELOG` | `[0.6.1] - 2026-11-09` |
| `node --check lib/client.js` | PASS |
| `node test/validate-preset.mjs` | PASS；prompt 白名单 PASS |
| `node test/smoke.mjs` | **367 passed / 0 failed** |
| `node scripts/verify-visual-geometry.mjs --strict` | OK |
| `node scripts/verify-contract-anchors.mjs` | 78 段 / FAIL=0 / WARN=19 |
| 负向注入 `{{cwd}}` | validate-preset exit=1（看护有效） |
| `npm pack --dry-run` | PASS；0.6.1，59 entries |

## 已知边界

- 0.2.0/0.2.1 的独立 `list_agents` 仍不可用（宿主能力差异）。
- 真实宿主“继续工作流”需用户升级并重启后确认；静态/负向看护已完成。
- README 使用裁掉宿主侧栏的当前截图；v0.6.0 tag 内旧图不可改写。

## 发布后

- push main + annotated tag `v0.6.1`；
- 远程核对 tag/main；
- 用户升级并重启 DSH 后，重新打开书目 → 继续工作流，确认不再出现 `unknown prompt variable`。
