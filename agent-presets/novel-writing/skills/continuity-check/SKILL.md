---
name: continuity-check
description: 连续性硬门禁审查——场景覆盖率/偏离度/Bible合规/伏笔生命周期/时间线一致性。由 continuity-reviewer agent 执行
---

# 连续性审查

对正文执行硬门禁检查（15 项中的 9 项）+ 时间线数值维度评分。任何一项硬门禁不通过 = 本章阻断。

## 执行 Agent

`writing-workflow/agents/continuity-reviewer.md`

## 执行程序

### Step 1：加载文件

- `07-content/chapter-XXX.md`（正文）
- `06-chapter-outlines/chapter-XXX.md`（细纲）
- `17-continuity/story-bible.md`
- `17-continuity/chapter-XXX-context.md`
- `17-continuity/continuity-ledger.md`
- `09-worldbuilding/power-system.md`（数值基准）

### Step 2：执行硬门禁（9 项）

按顺序逐项执行，每项填 `[通过/阻断]`。任一项阻断 → 立即停止，记录阻断项。

```
□ [ 1] 场景覆盖率 = 100%？          值：[___] → [通过/阻断]
□ [ 2] 偏离度 = 0%？                值：[___] → [通过/阻断]
□ [ 3] 滚动10章累积偏离 = 0？       值：[___] → [通过/阻断]
□ [ 4] 字数偏差 ≤ ±30%？            值：[___] → [通过/阻断]
□ [ 5] 时间线/地点/人物硬冲突？      检查结果：[有/无] → [通过/阻断]
□ [ 6] 必写场景缺失？                检查结果：[有/无] → [通过/阻断]
□ [ 7] 结束状态与 context card 一致？ 检查结果：[是/否] → [通过/阻断]
□ [ 8] Bible 不可变更事实被改写？    检查结果：[有/无] → [通过/阻断]
□ [ 9] Bible 改写有正式修订记录？    检查结果：[有/无] → [通过/阻断]

通过/阻断：___/9
```

**零容忍原则**：场景覆盖率 < 100% = 阻断，偏离度 > 0% = 阻断。不存在"可接受偏离"。

### Step 3：维度评分（2 个维度，25 分）

| # | 维度 | 满分 | 得分 | 扣分理由 |
|---|------|------|------|---------|
| 4 | 时间线+数值一致性 | 10 | | |
| 5 | 结构质量 | 15 | | |
| **小计** | | **25** | **[___]/25** | |

**维度 4 细则**：
- 时间线连续（无时间矛盾）
- 人物年龄与时间线同步增长
- 战力/等级数值链稳定（与 power-system 对比）
- 经济数值合理（货币购买力前后一致）
- 时间跨度数值合理

**维度 5 细则**：
- 场景覆盖率 = 100%（已在硬门禁验证）
- 偏离度 = 0%（已在硬门禁验证）
- 信息释放节奏合理（非同一章集中倾倒）
- 章末钩子有效性（与细纲承诺强度对比）
- 多线协调比例合理

### Step 4：输出报告

```markdown
# 连续性审查报告 — 第X章

## 硬门禁结果
通过/阻断：___/9
[如有阻断，列出阻断项和具体位置]

## 维度评分
- 时间线+数值：[X]/10
- 结构质量：[X]/15
- 小计：[X]/25

## 阻断项详情
[逐项说明]
```

## 启动模板

Coordinator 使用以下模板启动本 SKILL 的 subagent：

```
**执行模式**：独立审查，只输出报告，不做创作决策。

你是连续性审查员。请先读取：

角色定义：writing-workflow/agents/continuity-reviewer.md
审查规范：writing-workflow/skills/continuity-check/SKILL.md

工作文件：
- novel-project/06-chapter-outlines/chapter-XXX.md
- novel-project/07-content/chapter-XXX.md
- novel-project/17-continuity/story-bible.md
- novel-project/17-continuity/chapter-XXX-context.md
- novel-project/17-continuity/continuity-ledger.md
- novel-project/09-worldbuilding/power-system.md

任务：按本 SKILL 的 Step 2-4 机械执行——9 项硬门禁 + 时间线数值 + 结构质量维度评分。场景覆盖率必须=100%，偏离度必须=0%。输出结构化审查报告。
```
