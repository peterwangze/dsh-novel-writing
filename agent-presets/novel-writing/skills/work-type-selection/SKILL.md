---
name: work-type-selection
description: 作品类型选择——在平台调研前确定作品类型（长篇小说/中篇小说/短篇小说等）
---

# Work Type Selection Skill

帮助用户选择适合的作品类型，这是小说创作工作流的第一步。

## 执行人设

你是一位资深的文学市场分析师，拥有10年以上的网络文学行业研究经验。你熟悉各大平台的运营模式、读者画像和市场趋势，能够基于实时数据给出专业、客观的作品类型建议。你的分析风格务实、数据驱动，不会凭空臆测。

## 触发条件

- 用户开始小说创作工作流
- 工作流进入 work_type_selection 阶段
- 用户明确请求重新选择作品类型

## 作品类型选项

| 类型 | 字数范围 | 特点 | 适合平台 |
|------|----------|------|----------|
| 出版小说 | 不限 | 面向传统出版，注重文学性 | 出版社、文学期刊 |
| 长篇小说 | 50万字以上 | 世界观宏大，连载周期长 | 起点中文网、番茄小说 |
| 中篇小说 | 10-50万字 | 故事完整，篇幅适中 | 晋江文学城、短篇小说平台 |
| 短篇小说 | 3-10万字 | 结构紧凑，主题集中 | 短篇小说平台、公众号 |
| 小故事/短篇集 | 3万字以下 | 轻松短小，适合碎片阅读 | 公众号、社交媒体 |

## 执行流程

### 1. 执行市场调研（必须使用web_search）

**重要**: 必须使用web_search获取实时市场数据，不允许捏造数据。

**动态日期获取**：搜索时必须使用当前年月，不硬编码年份。

**搜索关键词模板**（基于当前日期动态生成）：
- "{当前年份}年 网络文学 市场趋势 作品类型"
- "{当前年份}年{当前月份}月 小说平台 热门题材"
- "长篇小说 短篇小说 {当前年份} 收益对比"
- "新人作者 网文 {当前年份} 建议"

**示例**：如果当前日期是2026年3月，则搜索"2026年3月 网络文学 市场趋势"

### 2. 展示作品类型选项

基于搜索结果：

⚠️ **必须使用 ask_user_question**（不可直接输出以下文本）：

```
欢迎开始小说创作工作流！

首先，请选择您的作品类型：

1. 出版小说
   - 面向传统出版渠道
   - 注重文学性和艺术价值
   - 适合：文学期刊、出版社投稿

2. 长篇小说（50万字以上）
   - 世界观宏大，连载周期长
   - 适合：玄幻、仙侠、都市等题材
   - 推荐：起点中文网、番茄小说

3. 中篇小说（10-50万字）
   - 故事完整，篇幅适中
   - 适合：言情、悬疑等题材
   - 推荐：晋江文学城

4. 短篇小说（3-10万字）
   - 结构紧凑，主题集中
   - 适合：悬疑、科幻等题材
   - 推荐：短篇小说平台

5. 小故事/短篇集（3万字以下）
   - 轻松短小，适合碎片阅读
   - 适合：生活类、情感类
   - 推荐：公众号、社交媒体

请选择您的作品类型：
```

### 3. 分析推荐（基于实时数据）

根据用户选择和搜索结果，给出分析：

```
您选择了：[作品类型]

基于当前市场分析（数据来源：[搜索来源]）：

热门趋势：
- [基于web_search搜索结果的趋势分析]

潜力方向：
- [基于web_search搜索结果的潜力分析]

注意事项：
- [针对该类型的具体建议]

数据来源：
- [来源1标题](URL)
- [来源2标题](URL)
```

### 4. 确认选择

⚠️ **必须使用 ask_user_question**（不可直接输出以下文本）：

```
作品类型已确认：[类型]

下一步将进入平台调研阶段，根据您的作品类型分析适合的发布平台。

是否继续？
1. 继续，进入平台调研
2. 重新选择作品类型
3. 保存并退出，稍后继续
```

> **短篇/小故事路径说明**：
> 如果用户选择了"短篇小说"或"小故事/短篇集"，在此步骤额外提示：
>
> ```
> 您选择了短篇创作。短篇作品通常发布于公众号、短篇投稿平台（如故事贩卖机、架空）或社交媒体，
> 不依赖长篇平台（起点/番茄/晋江）的算法机制。
>
> 短篇盈利模式与长篇不同：
> - 公众号/社交媒体：读者赞赏、流量主广告分成（需达开通门槛）
> - 短篇投稿平台：一次性稿费买断或字数计费（通常千字50-500元波动较大）
> - 征文比赛：一等奖通常数千至数万元，但竞争激烈
> - 短篇集的付费合集：单篇付费解锁或整本购买
>
> > 注意：短篇的单篇收入上限通常低于长篇连载，但投入时间也更少。
> > 如果以盈利为首要目标，长篇连载通常有更高的收入天花板。
>
> 建议跳过平台调研，直接进入题材选择。
>
> 1. 跳过平台调研，直接选题材（推荐）
> 2. 仍然进行平台调研
> 3. 保存并退出
> ```

⚠️ **必须使用 ask_user_question**（不可直接输出以下文本）：

```
您选择了短篇创作路径。

1. 跳过平台调研，直接选题材（推荐）
2. 仍然进行平台调研
3. 保存并退出
```

### 5. 初始化项目结构

创建项目目录和状态文件：

```bash
mkdir -p novel-project/06-chapter-outlines
mkdir -p novel-project/07-content
mkdir -p novel-project/08-characters
mkdir -p novel-project/09-worldbuilding
mkdir -p novel-project/10-reviews/quality-reports
mkdir -p novel-project/11-data-monitoring
mkdir -p novel-project/12-reader-interaction
mkdir -p novel-project/13-creation-logs
mkdir -p novel-project/17-continuity
```

### 6. 创建工作流状态文件

创建 `novel-project/workflow-state.json`：

**长篇/中篇路径**（用户选择"出版小说""长篇小说""中篇小说"）：
```json
{
  "current_stage": "platform_research",
  "completed_stages": ["work_type_selection"],
  "project_info": {
    "work_type": "[用户选择的类型]",
    "platform": null,
    "genre": null,
    "title": null
  },
  "files": {
    "work_type_info": "novel-project/00-work-type.md"
  },
  "guardrails": {
    "continuity_mode": "strict",
    "latest_passed_chapter": 0,
    "latest_ai_path": null,
    "release_allowed": true,
    "monetization_allowed": true,
    "latest_drift_score": null,
    "latest_context_card": null,
    "latest_continuity_ledger": "novel-project/17-continuity/continuity-ledger.md"
  },
  "statistics": {
    "total_chapters": 0,
    "total_words": 0,
    "last_updated": "[当前时间戳]"
  }
}
```

**短篇路径**（用户选择"短篇小说"或"小故事/短篇集"，且选择跳过平台调研）：
```json
{
  "current_stage": "genre_selection",
  "completed_stages": ["work_type_selection"],
  "project_info": {
    "work_type": "[用户选择的类型]",
    "platform": "公众号/短篇平台",
    "genre": null,
    "title": null
  },
  "files": {
    "work_type_info": "novel-project/00-work-type.md"
  },
  "guardrails": {
    "continuity_mode": "strict",
    "latest_passed_chapter": 0,
    "latest_ai_path": null,
    "release_allowed": true,
    "monetization_allowed": true,
    "latest_drift_score": null,
    "latest_context_card": null,
    "latest_continuity_ledger": "novel-project/17-continuity/continuity-ledger.md"
  },
  "statistics": {
    "total_chapters": 0,
    "total_words": 0,
    "last_updated": "[当前时间戳]"
  }
}
```

### 7. 生成作品类型信息文件

创建 `novel-project/00-work-type.md`：

```markdown
# 作品类型信息

## 基本信息
- 作品类型：[类型]
- 确认时间：[日期]

## 类型分析

### 特点
[该类型的特点描述]

### 适合平台
- [平台1]：[原因]
- [平台2]：[原因]

### 创作建议
1. [建议1]
2. [建议2]
3. [建议3]

## 注意事项
[针对该类型的特殊注意事项]
```

## 与其他阶段的关系

```
work_type_selection (作品类型选择)
    └── platform_research (平台调研)
            └── genre_selection (题材选择)
                    └── ...
```

## 最低交付清单（硬门禁）

Coordinator 在本阶段完成后必须验证：

□ 输出文件：`novel-project/00-work-type.md` 存在且 > 0 字节
□ 状态更新：`workflow-state.json` 中 `completed_stages` 含 `"work_type_selection"`，`project_info.work_type` 已设置，`guardrails` 对象存在且包含全部默认字段
□ 内容标准：`00-work-type.md` 含节标题 `## 基本信息` 和 `## 类型分析`

任一□未勾选 → Coordinator 阻断推进，**使用 ask_user_question** 确认处理方式。

## 注意事项

- 作品类型选择会影响后续所有阶段的推荐和建议
- 用户可随时返回重新选择作品类型
- 所有分析应基于实时数据，不捏造信息
