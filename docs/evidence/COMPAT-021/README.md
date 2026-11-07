# COMPAT-021 证据：行级预检交付（真跑输出）

目标：验证代际清单 + 行投影 + `scripts/preflight-preset-rows.mjs` 行级预检 + 六代际离线
fixtures 按设计基线 `docs/COMPATIBILITY.md` 交付，且全部既有门禁不回归。

## 证据文件

| 文件 | 内容 |
|---|---|
| `preflight-real.decl-0.2.1.json` | 真实仓内 `node scripts/preflight-preset-rows.mjs --json`：exit 0，`generation=decl-0.2.1`（本机 npm-global 0.2.1-rc.2，channel=profile-resolve），`mixedPlane=false`，61 行 0 FAIL（53 PASS + 1 KNOWN_DROP + 1 KNOWN_VARIANT + 6 NOT_RUN），dual=PASS |
| `preflight-negative-missing-export.json` | `--fixture test/fixtures/host-generations/negative-missing-export --json`：exit 1，含 `ERR_PACKAGE_PATH_NOT_EXPORTED` + `DECLARED_DROPPED_ROW` + `DUAL_SOURCE_DRIFT`（负向必红） |
| `preflight-test.out.txt` | `node test/preflight-preset-rows.test.mjs`：`PREFLIGHT TEST PASSED (11)`，exit 0——第 11 组为 R1 返工新增的**端到端混合平面 fail-closed**（伪 profile decl-0.2.2 × 伪全局闭包 legacy-0.1，经 `--global-root` 注入：exit 1 ∧ mixedPlane=true ∧ droppedDispositionConflicts=true ∧ legacy-only 行 FAIL MIXED_PLANE_FAIL_CLOSED 非 KNOWN_DROP ∧ --strict 加 STRICT_MIXED_PLANE）；变异自测：短路 conflict 接线后该组必红（RISK-C3 复活症状） |
| `validate-preset.out.txt` | `node test/validate-preset.mjs`：`PRESET VALIDATION PASSED（schema-face: PASS）`，exit 0 |
| `smoke.summary.txt` | `node test/smoke.mjs`：`SMOKE DONE: 334 passed, 0 failed`，exit 0 |
| `verify-contract-anchors.out.txt` | `node scripts/verify-contract-anchors.mjs`：共 79 段；FAIL = 0；WARN = 24 |

## 复现方式

```sh
node --check lib/host-compat/generation-manifest.mjs   # ×7 文件全 0 错
node test/preflight-preset-rows.test.mjs              # PASSED (10)
node scripts/preflight-preset-rows.mjs --json         # exit 0, decl-0.2.1
node scripts/preflight-preset-rows.mjs --fixture test/fixtures/host-generations/negative-missing-export --json  # exit 1
node test/validate-preset.mjs                         # PASSED
node test/smoke.mjs                                   # 334/0
node scripts/verify-contract-anchors.mjs              # FAIL=0
```

## 时间与环境

- 采集时间：2026-11-07（Coordinator 独立复跑，非 Developer 自报；R1 返工后终态——测试 10→11 组）
- 本机宿主平面：web profile `node_modules/@deepseek-ai` 为空，宿主闭包经 pnpm
  junction 实路径落在 npm-global `@deepseek-ai/dsh@0.2.1-rc.2`（decl-0.2.1）。
- 已知披露：本机两平面同代（均 0.2.1-rc.2），mixedPlane 端到端路径无自然用例，
  由 `NV_COMPAT_PLANE` 注入（exit 3）+ 判据核心单元面覆盖。

> 本目录只存证据；输出不含 token/密钥（CLI 设计即禁）。
