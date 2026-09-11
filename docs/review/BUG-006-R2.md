# BUG-006 审查复核报告（REVIEW-BUG-006-R2 定稿）

- **审查对象**：BUG-006 返工单点复核（install.ps1 三层结构 + install.sh 降级文案）
- **审查人**：Code Reviewer（sub-agent，独立复验）
- **日期**：2026-09-11
- **结论**：**APPROVED_WITH_NOTES**（unresolved_blockers = 0）

R1 全部阻断项（P1-1 / P1-2 同根）与 P2-1 均已修复并经本次独立复验通过；返工范围与声明一致（仅 install.ps1 L207-211 与 install.sh PKG_REG 跟踪+尾部文案两处，其余代码未触碰，R1 通过项不受影响）。

## 复核① install.ps1 三层结构与幂等 —— 通过

- **代码**：install.ps1 L207-211 现为 `$bundles0`(bundles 数组) → `$prof`(profile=$bundles0) → `dsh=$prof` 三层创建，与 L216-218（dsh 存在无 profile 键分支）结构对称，与 install.sh node/python3 版语义对齐。
- **独立演练**（复跑 R1 homeA 同款变体：无 dsh 键模板 + 中文源路径，隔离 DSH_HOME）：
  - 首跑 EXIT=0，产物 `dsh={"profile":{"bundles":["dsh-novel-writing"]}}` **三层正确**，`dep=file:C:/.../src-中文目录测试`（中文转义正确），键序 name,private,dependencies,dsh 保留——**P1-1 解除**；
  - 二跑 EXIT=0，run1/run2 产物 `cmp` 字节级 **PKG-IDENTICAL 零漂移**，结构复验无并列 bundles 畸形——**P1-2 解除**。

## 复核② install.sh PKG_REG 分支逻辑与文案 —— 通过

- **代码**：L76 `PKG_REG=0` 全路径初始化；L128/L182 置 1 位于 node/python3 调用后——若注册脚本失败（node `exit(1)` / python traceback），`set -e` 先行终止、不会到达收尾输出，状态语义安全；L236-242 收尾三分支（新布局+注册 / 新布局+降级 / 旧布局）互斥完备。
- **独立演练**：
  - 降级（PATH=/usr/bin 剥离 node/python3）EXIT=0，尾行 = 「仅写入 patch 行（未注册 profile package.json——node/python3 均不可用）；建议可用后重跑…」，package.json 与模板 `cmp` **PKG-UNTOUCHED 字节零改动**——文案与实际状态一致，**P2-1 解除**；
  - 正常路径（node 可用，真实 0.1.5 模板）尾行 = 注册成功文案，`bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-novel-writing"]` 追加正确、`patchReload=live` 无损——PKG_REG=1 分支未写反。
- AST 0 错 / sh -n 0 错与 Developer 自检一致；返工证据（`.governance/change-triage/BUG-006-dev-evidence.txt`「返工记录」节）与独立演练结果互相印证。

## 遗留备注（非阻断，沿袭 R1，留档发布卫生批次）

1. **P2-2 格式归一副作用**：PS 通道读入剥 BOM、写回无 BOM；python3 回退路径 Windows 下 CRLF——均合法 JSON 无功能影响。
2. **P2-3 升级残留**：旧 dsh → 0.1.5 升级后全局 `profiles/node_modules/dsh-novel-writing` 不清理，无害磁盘残留。
3. **P2-4 三套注册实现维护成本**：PS 自研序列化器理由成立（PS 5.1 ConvertTo-Json Depth=2 截断/缩进不可控），但 R1 的 P1 正是 PS 版独有偏差的实例——后续可考虑 PS 通道优先 `node -e`（dsh 宿主必有 node）收敛实现数。

**处置**：可进入交付流程（commit + CHANGELOG [Unreleased] 宣称现已与实现一致）。
