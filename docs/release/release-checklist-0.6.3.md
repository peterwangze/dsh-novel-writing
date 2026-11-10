# 发布检查清单 — v0.6.3（2026-11-10）

- **关联任务**：BUG-016（提问弹窗导致工作台渲染异常）、WB-12（下方面板切页签丢未提交输入）
- **版本**：`0.6.3`（patch）
- **发布通道**：GitHub annotated tag `v0.6.3`；该包不在 npm registry，不执行 npm publish
- **上一版本 / 回滚点**：`v0.6.2`（可安全回滚：本版无数据迁移、无新增持久化键）
- **变更类型**：修复 + 看护
- **数据迁移**：无新增迁移；沿用 0.6.0 的 `studio.v2` / `theme.v1` / `typography.v1`。

## 修复（用户可见）

| 缺陷 | 症状（用户视角） | 修复 |
|---|---|---|
| BUG-016 | **对话中出现「向用户提问」的弹窗时**，工作台被压到窗口下半部：稿纸只剩一条窄带、正文区完全空白，页脚却显示 `1 / 469` 这种荒谬页码，左栏章节目录也只露出两行 | 工作台顶边锚定原本扫描**整篇文档**的 `<header>` 并取最靠下的那个，弹窗自己的标题栏被误当成对话页眉（实测把顶边从 40 推到 514，可用高 724→250，正文区压成 0）。现在只认会话区内的页眉，弹窗/浮层内的标题栏一律排除；另外正文区过矮到无法测量时不再显示页码 |
| WB-12 | 数据页签填了一半的完读率/追读/收益、请求页签写了一半的备注、发布页签选好的平台与「含已发布」，切到别的页签再回来全部清空，只能重填 | 未提交的输入由工作台统一保管（不随页签卸载），来回切换页签原样保留；提交成功后才清空 |

## 看护新增

- `test/smoke.mjs`：**377 → 380 项断言**，新增 3 组——
  - BUG-016①工作台顶边只认会话页眉（全文档 `<header>` 扫描已删除 ∧ 只扫会话根内 ∧ 弹窗内 header 被排除）
  - BUG-016②正文区 < `PAGE_MIN_H` 即隐藏页码，且门槛判断前置于页数换算（防止再算出 469 这种总数）
  - WB-12 三面板草稿均由父级持有 ∧ 面板内不得再用本地 `useState` 存表单 ∧ 父级草稿状态与页签同级
- `scripts/probe-ops-matrix.mjs`：新增 **O17b**——真实宿主中在数据页签填数 → 切到发布 → 切回，断言值与位置保持（经历真实卸载，`backToData.rounds=1`）。
- `scripts/probe-paper-render.mjs`（新增，真实宿主）：稿纸渲染几何探针 P1~P7，支持 `--fake-popup-header` 复刻宿主提问弹窗。隔离实例 + 真实 Edge/CDP。

## 发布前核验（本版实跑）

| 命令 | 结果 |
|---|---|
| `node --check lib/client.js` | PASS |
| `node test/validate-preset.mjs` | **PRESET VALIDATION PASSED**（schema-face: PASS） |
| `node test/smoke.mjs` | **SMOKE DONE: 380 passed, 0 failed** |
| `node scripts/verify-contract-anchors.mjs` | 共 78 段；FAIL = 0；WARN = 19 |
| `node scripts/verify-visual-geometry.mjs --strict` | OK（1680/1440/1152/1086/956/800 六档） |
| `node scripts/probe-ops-matrix.mjs` | **19 OK / 3 SKIP / 0 FAIL**（隔离实例；真实 `$DSH_HOME` 指纹未变；3 项 SKIP 为此前既有 O9/O19/O20，非本次引入） |
| `node scripts/probe-paper-render.mjs --fake-popup-header` | **7 OK / 0 FAIL**（弹窗在侧：顶边保持 40、正文区 395） |
| `node scripts/probe-paper-render.mjs --size 2560x1528` | **7 OK / 0 FAIL**（无弹窗回归） |
| `npm pack --dry-run` | PASS（见发布记录） |

### WB-12 反向验证（证明用例非恒真）

临时把 `DataPanel` 还原为本地 `useState` 后重跑操作矩阵探针：O17b 立即 **FAIL**（切回后 `after=["","","","",""]`，输入确实丢失）；恢复修复后再次 **PASS**。用例抓的是真缺陷。

## 已知边界

- 操作矩阵探针的 3 项 SKIP（O9 / O19 / O20）为此前版本既有：新建/删除书目的入口在无头视图内未渲染，如实记 SKIP 且不计入通过面，仍由 smoke 源码面 + 人工路径覆盖。
- 抽屉↔绑定会话切换由 smoke 源码面断言 + 手动实机路径覆盖；宿主原生会话抽屉的内部 DOM 属宿主实现，不纳入探针以免过度耦合。
- BUG-016 的弹窗场景由**注入实验**复刻（页面内注入位置靠下的 `<header>`，top 470/bottom 514），不是真实宿主弹窗的像素级复现——宿主提问弹窗属于会话内容渲染，其内部结构不在公开契约内。作为对照，真实注入前后 `.nv-split` 顶边 40→514 的位移方向与用户截图一致。

## 回滚

见 `docs/release/rollback-plan-0.6.0.md`。本版无新持久化键，回滚只需把插件目录换回 0.6.2（`git checkout v0.6.2` 侧载或重新安装该 tag）。
