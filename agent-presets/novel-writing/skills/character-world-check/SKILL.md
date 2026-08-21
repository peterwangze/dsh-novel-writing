---
name: character-world-check
description: 人物一致性与世界观合规审查——行为/对话/关系/成长弧 + 世界规则/力量体系。由 character-world-reviewer agent 执行
---

# 人物与世界观审查

独立审查正文中的人物行为一致性和世界观规则遵守情况。OOC 零容忍。

## 执行 Agent

`writing-workflow/agents/character-world-reviewer.md`

## 执行程序

### Step 1：加载文件

- `07-content/chapter-XXX.md`（正文）
- `08-characters/main-characters.md`
- `08-characters/character-relationships.md`
- `09-worldbuilding/world-settings.md`
- `09-worldbuilding/power-system.md`
- `17-continuity/continuity-ledger.md`（上一章人物状态基线）

### Step 2：逐人物审查

对本章出场的每个人物，逐项对照设定：

| 人物 | 行为符合人设 | 对话风格匹配 | 身份/地位连续 | 关系状态一致 | 成长弧推进 |
|------|------------|------------|-------------|------------|----------|
| [人物A] | [是/否] | [是/否] | [是/否] | [是/否] | [是/否] |
| [人物B] | [是/否] | [是/否] | [是/否] | [是/否] | [是/否] |

**OOC 零容忍**：任何人物出现 OOC（Out Of Character）行为且无铺垫 → 直接记录为严重问题。

### Step 3：世界观合规审查

逐项检查正文是否遵守世界规则：

```
□ 世界规则遵守：正文是否违反 world-settings 中的规则？[是/否]
□ 力量体系一致：力量使用是否符合 power-system 的等级和晋升条件？[是/否]
□ 临时追加规则：正文中是否出现了大纲中未定义的设定？[有/无]
□ 设定利用率：大纲中的设定元素是否在正文中被有效利用？[利用率评估]
```

### Step 4：维度评分（2 个维度，25 分）

| # | 维度 | 满分 | 得分 | 扣分理由 |
|---|------|------|------|---------|
| 1 | 设定逻辑性 | 10 | | |
| 2 | 人物一致性 | 15 | | |
| **小计** | | **25** | **[___]/25** | |

**维度 1 细则**：世界规则自洽、力量体系使用一致、无废设定、无临时追加规则

**维度 2 细则**：行为符合人设、对话风格匹配、身份/地位连续、关系状态一致、成长弧按规划推进

### Step 5：输出报告

```markdown
# 人物与世界观审查报告 — 第X章

## 人物一致性
- 出场人物：[N]人
- OOC 问题：[X]处
- [逐人物说明问题]

## 世界观合规
- 规则违反：[X]处
- 临时追加规则：[X]处
- [逐项说明]

## 维度评分
- 设定逻辑性：[X]/10
- 人物一致性：[X]/15
- 小计：[X]/25
```

## 启动模板

Coordinator 使用以下模板启动本 SKILL 的 subagent：

````
**执行模式**：独立审查，只输出报告。

你是人物世界观审查员。请先读取：

角色定义：writing-workflow/agents/character-world-reviewer.md
审查规范：writing-workflow/skills/character-world-check/SKILL.md

工作文件：
- novel-project/07-content/chapter-XXX.md
- novel-project/08-characters/main-characters.md
- novel-project/08-characters/character-relationships.md
- novel-project/09-worldbuilding/world-settings.md
- novel-project/09-worldbuilding/power-system.md
- novel-project/17-continuity/continuity-ledger.md

任务：按本 SKILL 机械执行——逐人物审查行为/对话/关系/成长弧，审查世界观合规。OOC 零容忍。输出结构化审查报告。
````
