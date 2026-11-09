# 发布检查清单 — v0.6.0（2026-11-09）

- **关联任务**：REL-008（发布承载 UX-064 S1–S3 + UX-065 + UX-066 + UX-067 + COMPAT 的版本）
- **版本**：`0.6.0`（minor；0.x 阶段功能批）
- **发布通道**：GitHub annotated tag `v0.6.0`；**该包不在 npm registry，不执行 npm publish**
- **上一版本 / 回滚点**：`v0.5.3`
- **变更类型**：功能 + 视觉重构 + 兼容性架构；**无正文/书目数据 schema 破坏**
- **数据迁移**：新增 `dsh.novel.studio.v2`、`dsh.novel.theme.v1`、`dsh.novel.typography.v1`；`studio.v2` 首次经一次性迁移读取旧 `split.v1.leftCollapsed`/`drawer.v1.open`，旧像素字段不再写回。旧版本回退时新键被忽略；布局/主题/排版偏好可能重置，**书稿/章节/发布/数据不迁移、不删除**。
- **用户确认**：用户 2026-11-09 要求「发布版本承载这次重构修改」。

## 发布范围

- UX-064：S1 书斋、S2 写作台布局架构替换、S3 收口、窄窗/抽屉/rail、panelHeight、页码/焦点。
- UX-065：墨纸/青简/夜航主题，明暗跟随宿主，设置页+顶栏入口。
- UX-066：正文/编辑器 4 字体 × 4 字号，Aa + 设置页。
- UX-067：设置页重构（墨纸暖面）、原生模型对话纸色作用域、跨会话 CSS 泄漏修复（R7）。
- COMPAT：0.1.x/0.2.x 兼容性架构与代际预检。

## 发布前核验

| 检查 | 结果 |
|---|---|
| `package.json` version | `0.6.0` |
| `CHANGELOG` 段落 | `[0.6.0] - 2026-11-09` |
| `node --check lib/client.js` | PASS |
| `node test/validate-preset.mjs` | PASS |
| `node test/smoke.mjs` | **366 passed / 0 failed**（README 计数同步） |
| `node scripts/verify-visual-geometry.mjs --strict` | OK；S2 六档数值不变、0 横向溢出 |
| `node scripts/verify-contract-anchors.mjs` | 78 段 / FAIL=0 / WARN=19 |
| `python docs/design/UX-064-mockups/verify-mockups.py` | PASS |
| 真实宿主探针 | 1680/800/… 工作台与隔离会话通过；抽屉样式不外溢（R7） |
| `npm pack --dry-run` | PASS；59 entries，无未预期大文件 |

## 已知问题（不阻断发布，需在发布说明保留）

- DSH `0.2.0-rc.2` / `0.2.1-rc.2`：预设可加载，但宿主未在主包提供独立 `list_agents`；这是宿主能力差异，不是插件补齐。
- UX-067 的子智能体列表截断在隔离环境**未复现**；插件全局选择器/普通会话残留已排除，待用户真实宿主复核。
- 普通会话/抽屉的交互行为证据主要在真实探针，CI 仍以 smoke/geometry/anchors 为主。
- 治理仍有既有遗留问题；本版不声称治理全绿。

## 发布后

- push `main` + annotated tag `v0.6.0`；
- 远程核对 `git ls-remote` tag/commit；
- 在发布说明中引用本清单、`docs/release/feature-flags-0.6.0.md`、`docs/release/rollback-plan-0.6.0.md`。
