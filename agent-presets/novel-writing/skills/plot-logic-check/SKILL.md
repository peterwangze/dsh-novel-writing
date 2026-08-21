---
name: plot-logic-check
description: 情节逻辑审查——因果链/伏笔生命周期/冲突升级/主角能动性 + 中段防崩检测。由 plot-logic-reviewer agent 执行
---

# 情节逻辑审查

独立审查正文的情节因果链完整性和伏笔生命周期管理。

## 执行 Agent

`writing-workflow/agents/plot-logic-reviewer.md`

## 执行程序

### Step 1：加载文件

- `07-content/chapter-XXX.md`（正文）
- `06-chapter-outlines/chapter-XXX.md`（细纲）
- `05-outline.md`（伏笔设计表）
- `17-continuity/story-bible.md`（关键伏笔清单）
- `17-continuity/continuity-ledger.md`（前章伏笔状态）

### Step 2：执行硬门禁（2 项）

```
□ [10] 关键伏笔逾期未回收？          检查结果：[有/无] → [通过/阻断]
□ [13] 中段主角被动+无新变量？      检查结果：[是/否/N/A] → [通过/阻断]

通过/阻断：___/2
```

**中段防崩激活条件**：仅当本章进度在 40%-60% 区间时激活 [13]。

### Step 3：因果链检查

逐事件检查本章的情节因果：

| 事件 | 前因是否成立 | 后果是否推进 | 是否有"剧情需要"式跳跃 |
|------|------------|------------|---------------------|
| [事件1] | [是/否] | [是/否] | [有/无] |
| [事件2] | [是/否] | [是/否] | [有/无] |

### Step 4：伏笔生命周期检查

| 伏笔编号 | 本章操作 | 逾期检测 | 状态更新 |
|---------|---------|---------|---------|
| [伏笔X] | 埋设/推进/回收/无 | 是否超过最迟回收章 | [新状态] |

### Step 5：冲突升级与主角能动性

```
□ 冲突是否在升级（非降级/平缓）？[是/否]
□ 主角是否在主动推动剧情（非被动应对）？[是/否]
  - 连续被动超过 3 章 → 强制扣分
□ 是否有巧合事件？如有，是否有铺垫？[有铺垫/无铺垫/无巧合]
  - 无铺垫巧合 → 扣分
```

### Step 6：维度评分（1 个维度，15 分）

| # | 维度 | 满分 | 得分 | 扣分理由 |
|---|------|------|------|---------|
| 3 | 情节逻辑性 | 15 | | |
| **小计** | | **15** | **[___]/15** | |

**维度 3 细则**：因果链完整、伏笔有推进/回收、冲突升级曲线合理、主角能动性达标

### Step 7：输出报告

```markdown
# 情节逻辑审查报告 — 第X章

## 硬门禁结果
- 伏笔逾期：[有/无]
- 中段防崩：[是/否/N/A]

## 因果链
- 事件数：[N]
- 因果断裂：[X]处

## 伏笔状态
- 本章操作：埋设[X] / 推进[X] / 回收[X]

## 维度评分
- 情节逻辑性：[X]/15
```

## 启动模板

Coordinator 使用以下模板启动本 SKILL 的 subagent：

````
**执行模式**：独立审查，只输出报告。

你是情节逻辑审查员。请先读取：

角色定义：writing-workflow/agents/plot-logic-reviewer.md
审查规范：writing-workflow/skills/plot-logic-check/SKILL.md

工作文件：
- novel-project/07-content/chapter-XXX.md
- novel-project/06-chapter-outlines/chapter-XXX.md
- novel-project/05-outline.md
- novel-project/17-continuity/story-bible.md
- novel-project/17-continuity/continuity-ledger.md

任务：按本 SKILL 机械执行——2 项硬门禁 + 因果链 + 伏笔生命周期 + 冲突升级 + 主角能动性 + 情节逻辑性维度评分。输出结构化审查报告。
````
