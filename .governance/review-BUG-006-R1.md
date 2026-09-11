# BUG-006 产品侧修复审查报告（REVIEW-BUG-006-R1）

- **审查对象**：BUG-006 dsh 0.1.5-rc.1 安装机制适配（install.ps1 / install.sh / README.md / CHANGELOG.md）
- **审查人**：Code Reviewer（sub-agent，独立于 Developer）
- **日期**：2026-09-11
- **结论**：**NEEDS_CHANGE**（unresolved_blockers = 1，P1 ×2 同根；无 P0）

审查方式：git diff 逐行 + 两个脚本全文通读 + Reviewer 独立抽查演练（P-09 要求）——5 个隔离 DSH_HOME 变体（`%TEMP%\bug006-rev\homeA-E`，全程未触碰真实 `~/.dsh`，演练后已清理，仓库产品代码零修改）。独立演练覆盖 Developer 证据未覆盖的分支变体，其中「无 dsh 键」分支暴露出实现缺陷。

---

## P1（应修，合入前解决）

### P1-1 无 `dsh` 键分支注册结构错误：写出 `dsh.bundles`，缺 `profile` 层
- **位置**：`install.ps1` L207-210
- **证据**：homeA 演练（模板仅 name/private/dependencies:{}，无 dsh 键）产物经 `node -e JSON.parse` 复核：`dsh={"bundles":["dsh-novel-writing"]}`——dsh 0.1.5 期望 `dsh.profile.bundles` 三层结构，此产物官方通道**静默注册失效**（仅剩 patch 行兜底）。变量命名 `$prof` 印证意图是三层，实现少包了一层。
- **对照**：install.sh 同分支正确——node 版 L113 `pkg.dsh = { profile: { bundles: [name] } }`、python3 版 L157 `pkg["dsh"] = {"profile": {"bundles": [name]}}`（homeC 实测 node 分支三层正确）。**PS 版为独有偏差**。
- **影响面**：真实 dsh 0.1.5 模板必含 `dsh` 键，主用户路径不受影响——Developer 证据 3a/3b 模板均含 dsh 键，故四项自检未暴露。但该分支的存在意义即处理键缺失场景，自宣称的边界处理写了错误结构。
- **修复**：L207-210 改为三层（bundles 数组 → profile 对象 → dsh 键），约 3 行。

### P1-2（与 P1-1 同根）该分支幂等宣称不成立，二跑产生畸形并存结构
- **位置**：install.ps1 L207-210 + L212-217 组合效应
- **证据**：homeA 二跑实测产物：`dsh={"bundles":["dsh-novel-writing"],"profile":{"bundles":["dsh-novel-writing"]}}`——首跑写错单层后，二跑走「dsh 存在无 profile 键」分支再补 `dsh.profile`，两层 bundles 并存。与 CHANGELOG [Unreleased] 宣称「幂等可重复执行，不产生重复行/重复键/损坏 JSON」直接矛盾。
- **修复 P1-1 后此问题自动消失**（二跑时三层结构齐全 → 全分支跳过 → 不写文件）。

## P2（建议，非阻断）

1. **降级场景收尾输出失实**（install.sh L233-234）：node/python3 双缺降级（未注册 package.json）时，尾行仍打印「已注册 profile dependencies + bundles（dsh >=0.1.5）+ patch 行兜底双保险」。homeE 实测：`dsh-key-present=false deps-present=false` 但输出宣称已注册，误导用户。建议按降级状态区分文案。
2. **文件格式归一副作用**：install.ps1 L184/L231 读入剥 BOM、写回强制无 BOM——原文件带 BOM 时注册后被移除；python3 回退路径（install.sh L173-175）Windows 下 `open(w)` 默认换行翻译产生 CRLF（node 路径为 LF）。均合法 JSON 无功能影响，仅格式副作用，可接受。
3. **升级残留**：旧 dsh → 0.1.5 升级用户的全局 `profiles/node_modules/dsh-novel-writing` 不清理（新布局用 profile 私有路径）。无害，仅磁盘残留，建议作为已知行为记录。

## 逐项核对通过项（审查清单 1-6）

1. **正确性**：布局检测特征（`profiles/<Profile>/package.json` 存在）两脚本同构、与 Coordinator 实证的 0.1.5 特征一致；`Add-PropertyBefore` 键序插入实测正确（homeB：name,private,dependencies,dsh）；中文路径转义正确（homeA：`file:C:/.../src-中文目录测试` 原样 UTF-8，JSON.parse 复核通过）；`@()` 包裹防御 PS 5.1 单元素数组坍缩到位；file: 正斜杠形态 `D:/...` 双通道实测产出正确（homeC 复验 cygpath -m 归一生效）。**唯无 dsh 键分支见 P1-1**。
2. **回归**：diff 层面独立核对——旧布局 `$nodeModules` 同值分流、`$profileDir`/`PDIR` 仅提前定义（值不变）、patch 写入逻辑（New-PatchTemplate/insert 块解析）零改动、junction 非链接守卫（L139-144）/dangling 仅删链接自身（L160）/拷贝中止守卫（L172）/robocopy/cp 范围全保留；与 Developer 证据 4c 整树 diff 零差异互为印证。
3. **安全**：`$src` 经 GetFullPath/pwd 规范化，来源仅本地参数/git clone 固定路径（URL 不直接进路径）；写入经 ConvertTo-JsonText/JSON.stringify 转义（`\"`/`\\`/`\u00xx`），无 JSON 注入面。`-Profile` 路径穿越为 HEAD 既有固有行为，本次未扩大攻击面。
4. **健壮性**：PS 5.1 无 PS7+ 语法（AST 0 错 + BOM `ef bb bf` 保留）；sh 无 bashism（sh -n 0 错）；node -e 单引号包裹内全双引号无冲突、`-e` 模式 argv[1] 起参数正确；heredoc `<<'PYEOF'` 无展开、`sys.argv[1..3]` 偏移正确（本机无 python3，该分支以代码审查确认与 node 版逐行同构）；解析失败路径均安全终止（PS `Write-Error`×`Stop` 偏好不写损坏文件；node `exit(1)`/python traceback × `set -e`）；降级链 homeE 实测 EXIT=0 + stderr 提示 + patch 行兜底在位。
5. **文档一致性**：README 与脚本行为一致，无残留旧布局矛盾描述；CHANGELOG [Unreleased] 对「零改动兼容 vs 安装通道适配」区分准确——**唯幂等宣称因 P1-2 不成立**（修复 P1-1 后宣称恢复成立，无需改文档）。
6. **P-08/P-09**：PS 自研序列化器理由**成立**——PS 5.1 `ConvertTo-Json` 默认 Depth=2 会把 `dsh.profile.bundles`（深度 3）截断损坏、缩进格式不可控、非 ASCII 强转 `\uXXXX`，自研 ~55 行换确定性与零外部依赖是合理选择。P-09：Developer 四项证据可信且逐项复现通过，但未覆盖无 dsh 键变体——独立抽查暴露 P1-1，抽查义务已履行。

## 备注（非阻断观察）

- **三套注册实现的对称维护成本**：PS 自研序列化器 / node -e / python3 三套逻辑，本次 P1-1 正是 PS 版独有偏差的实例佐证。后续可考虑 install.ps1 亦优先 `node -e`（dsh 宿主必有 node）+ PS 自研兜底，收敛实现数。非本次范围。
- README「升级 dsh 后若插件消失 = profile 模板重建重置了注册」为推断性指引（未单测），表述谨慎（「重跑安装脚本即恢复」），可接受。

**处置建议**：Developer 修复 install.ps1 L207-210 三层结构（+ 补该变体演练证据），P2-1 降级文案可顺手修。修复后复核该单点即可闭环，无需全量重审。
