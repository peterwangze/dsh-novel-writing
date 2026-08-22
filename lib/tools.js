/**
 * dsh-novel-writing 工具行（composition：`- id: tool-novel; name: dsh-novel-writing/tools`）。
 *
 * 给「小说写作工作流」预设的协调者 agent 使用的工具集：把源工作流依赖 LLM
 * 自觉执行的质量门禁（场景覆盖率=100%、偏离度=0%、审查必录、数据闭环信号）
 * 收敛为代码强制：save 前跑 gate，不通过即拒绝；审查提交必须带发现；
 * 数据入库即算信号并给出建议行动。
 *
 * 可选依赖：`novel-writing` 服务由宿主 bundle 行提供。未安装 bundle 时
 * 本行静默激活但注册 0 个工具（预设仍可挂载，只是文档/写入走原生 fs 工具）。
 *
 * @module dsh-novel-writing/tools
 */
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-novel-writing/tools'

function text(value) {
  return [{ type: 'text', text: value }]
}

export function apply(ctx) {
  const service = ctx.get('novel-writing')
  if (service === undefined) {
    ctx.logger?.warn('dsh-novel-writing/tools: novel-writing service not mounted; novel tools disabled')
    return
  }
  ctx.logger?.info('dsh-novel-writing/tools: enabled')

  const renderList = (value) => text(
    value.novels.length === 0
      ? `小说工作区为空（${value.root}）。创建方式：在小说目录下由协调者生成 novel-project/workflow-state.json，或在工作台/设置中指定 workspaceRoot。`
      : `小说工作区：${value.root}\n` + value.novels.map((n) => [
        `- ${n.title}（${n.id}）`,
        `  阶段 ${n.stage ?? '?'} · ${n.totalChapters} 章 · ${n.totalWords} 字 · 更新 ${n.lastUpdated ?? '—'}`,
        `  发布 ${n.releaseAllowed ? '✓' : '✗'} · 变现 ${n.monetizationAllowed ? '✓' : '✗'} · 待处理请求 ${n.requests}`,
      ].join('\n')).join('\n'),
  )

  ctx.tools.register(defineTool({
    name: 'novel_list',
    description: '列出小说工作区中的所有小说书目与进度概览（阶段/章节/字数/发布/变现门禁/待处理请求）。',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          root: { type: 'string' },
          pollMs: { type: 'number' },
          novels: {
            type: 'array',
            items: {
              type: 'object', additionalProperties: false,
              properties: {
                id: { type: 'string' }, title: { type: 'string' },
                workType: { type: 'string' }, platform: { type: 'string' }, genre: { type: 'string' },
                stage: { type: 'string' },
                completedStages: { type: 'array', items: { type: 'string' } },
                totalChapters: { type: 'integer' },
                totalWords: { type: 'integer' }, lastUpdated: { type: 'string' },
                releaseAllowed: { type: 'boolean' }, monetizationAllowed: { type: 'boolean' },
                latestDrift: { type: 'number' }, latestAiPath: { type: 'string' },
                requests: { type: 'integer' },
              },
            },
          },
        },
      },
      render(_args, value) { return renderList(value) },
    },
    async execute() {
      const overview = service.listNovels()
      // 剔除 null 字段，保持与声明 schema 严格一致
      return {
        ...overview,
        novels: overview.novels.map((n) => {
          const out = {}
          for (const [k, v] of Object.entries(n)) if (v !== null && v !== undefined) out[k] = v
          return out
        }),
      }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_status',
    description: '读取一部小说的当前工作流状态：阶段、完成阶段、门禁开关（发布/变现/AI路径/最新偏离度）、待处理 UI 请求与数据信号。',
    parameters: {
      novel: { type: 'string', required: true, description: '小说 id（novel_list 返回）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          id: { type: 'string' }, stage: { type: 'string' },
          completedStages: { type: 'array', items: { type: 'string' } },
          releaseAllowed: { type: 'boolean' }, monetizationAllowed: { type: 'boolean' },
          latestAiPath: { type: 'string' }, latestDrift: { type: 'number' },
          requests: { type: 'array', items: { type: 'json' } },
          signals: { type: 'array', items: { type: 'json' } },
        },
      },
      render(_args, value) {
        return text([
          `《${value.id}》 当前阶段：${value.stage ?? '未初始化'}`,
          `已完成：${(value.completedStages ?? []).length} 个阶段`,
          `门禁：发布 ${value.releaseAllowed ? '✓' : '✗'} · 变现 ${value.monetizationAllowed ? '✓' : '✗'} · AI路径 ${value.latestAiPath ?? '未评估'}`,
          value.latestDrift === null || value.latestDrift === undefined ? '偏离度：未记录' : `偏离度：${value.latestDrift}%`,
          value.requests.length > 0 ? `待处理请求 ${value.requests.length} 条（用 novel_requests 查看详情）` : '无待处理请求',
          value.signals.length > 0 ? `数据信号 ${value.signals.length} 条：\n` + value.signals.map((s) => `- [${s.severity}] ${s.signal}：${s.action}`).join('\n') : '暂无数据信号',
        ].join('\n'))
      },
    },
    async execute(args) {
      const detail = service.novelDetail(args.novel)
      const out = {
        id: detail.id,
        stage: detail.state.current_stage ?? null,
        completedStages: detail.state.completed_stages ?? [],
        releaseAllowed: detail.state.guardrails?.release_allowed === true,
        monetizationAllowed: detail.state.guardrails?.monetization_allowed === true,
        requests: detail.requests.filter((r) => r.status !== 'done'),
        signals: detail.signals,
      }
      // 可空字段按声明 schema 裁剪（additionalProperties:false 契约）
      if (detail.state.guardrails?.latest_ai_path != null) out.latestAiPath = detail.state.guardrails.latest_ai_path
      if (detail.state.guardrails?.latest_drift_score != null) out.latestDrift = detail.state.guardrails.latest_drift_score
      return out
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_state_update',
    description: '增量更新工作流状态：推进当前阶段、追加完成阶段、回写门禁（发布/变现/AI路径）。协调者是唯一状态写入者：子代理不得调用。',
    parameters: {
      novel: { type: 'string', required: true },
      currentStage: { type: 'string' },
      completedStage: { type: 'string', description: '追加到完成阶段列表的阶段 id' },
      releaseAllowed: { type: 'boolean', description: '仅 AI 合规阶段可改' },
      monetizationAllowed: { type: 'boolean', description: '仅 AI 合规阶段可改' },
      latestAiPath: { type: 'string', enum: ['A', 'B', 'C', null], description: 'AI 参与路径评级（human-ai-collaboration 阶段产出）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: { stage: { type: 'string' }, completedStages: { type: 'array', items: { type: 'string' } } },
      },
    },
    render(_args, value) { return text(`状态已更新：${value.stage}（已完成 ${value.completedStages.length} 阶段）`) },
    async execute(args) {
      const patch = { statistics: {} }
      if (args.currentStage !== undefined) patch.current_stage = args.currentStage
      if (args.completedStage !== undefined) patch.completed_stages = [args.completedStage]
      const guardrails = {}
      if (args.releaseAllowed !== undefined) guardrails.release_allowed = args.releaseAllowed
      if (args.monetizationAllowed !== undefined) guardrails.monetization_allowed = args.monetizationAllowed
      if (args.latestAiPath !== undefined) guardrails.latest_ai_path = args.latestAiPath
      if (Object.keys(guardrails).length > 0) patch.guardrails = guardrails
      const state = service.updateState(args.novel, patch, { allowCreate: false })
      return { stage: state.current_stage, completedStages: state.completed_stages }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_chapter_read',
    description: '读取章节的看护元数据：字数、场景数、门禁结果（覆盖率/偏离/命中的禁止项）、机器审计项、审查分数；正文请用 read 工具读文件本体的不变事实。',
    parameters: {
      novel: { type: 'string', required: true },
      chapter: { type: 'integer', required: true, description: '章节号（1 起）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          num: { type: 'integer' }, words: { type: 'integer' },
          gate: { type: 'json' }, audit: { type: 'json' },
          reviewScore: { type: 'number' }, published: { type: 'boolean' }, forced: { type: 'boolean' },
        },
      },
    },
    render(_args, value) {
      const gate = value.gate
      const gateLine = gate === null || gate === undefined
        ? '门禁：未运行'
        : `门禁：覆盖率 ${gate.coverage ?? '—'}% / 偏离度 ${gate.drift ?? '—'}% / ${gate.passed ? '通过' : '未通过'}${(gate.missedScenes ?? []).length > 0 ? '（缺失场景：' + gate.missedScenes.join('、') + '）' : ''}${(gate.bannedHits ?? []).length > 0 ? '（命中禁止项：' + gate.bannedHits.join('、') + '）' : ''}`
      const audits = (value.audit?.items ?? []).map((i) => `  ${i.level === 'ok' ? '✓' : '⚠'} ${i.name}: ${i.detail}`).join('\n')
      return text([
        `第${value.num}章 · ${value.words} 字${value.published ? ' · 已发布' : ''}${value.forced ? ' · 含强制保存' : ''}`,
        gateLine,
        `审查分：${value.reviewScore ?? '未审查'}`,
        `审计：\n${audits}`,
      ].join('\n'))
    },
    async execute(args) {
      const data = service.readChapter(args.novel, args.chapter)
      return {
        num: data.num, words: data.words,
        gate: data.gate, audit: data.audit,
        reviewScore: data.reviewScore, published: data.published, forced: data.forced,
      }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_chapter_write',
    description: '保存章节正文（唯一受控写入通道）：保存前强制执行正文看护硬门禁（场景覆盖率必须=100%、禁止项必须零命中）。未通过且未 force 时拒绝保存并返回明细。',
    parameters: {
      novel: { type: 'string', required: true },
      chapter: { type: 'integer', required: true },
      content: { type: 'string', required: true, description: '完整章节内容（场景间用 --- 分隔）' },
      force: { type: 'boolean', description: '仅限人工改稿后的明确指令：强制保存并标记 forced' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          saved: { type: 'boolean' }, words: { type: 'integer' },
          gate: { type: 'json' },
        },
      },
    },
    render(_args, value) {
      const g = value.gate
      if (g === null || g === undefined || g.available !== true) return text(`已保存：${value.words} 字（${g?.note ?? '无看护卡，门禁未启用'}）`)
      return text(`已保存：${value.words} 字 · 门禁 覆盖率 ${g.coverage ?? '—'}% / 偏离度 ${g.drift ?? '—'}% / ${g.passed ? '通过' : '未通过（force）'}`)
    },
    async execute(args) {
      const result = service.saveChapter(args.novel, args.chapter, args.content, { force: args.force === true, source: 'agent' })
      return { saved: true, words: result.words, gate: result.gate }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_gate_check',
    description: '对一章内容运行看护硬门禁（不保存）：解析看护卡的必写场景与禁止偏离项，输出覆盖率/偏离度/缺失场景/命中禁止项。正文生成应逐场景完成后先跑本工具再保存。',
    parameters: {
      novel: { type: 'string', required: true },
      chapter: { type: 'integer', required: true },
      content: { type: 'string', description: '省略时读取已保存的章节文件' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: { available: { type: 'boolean' }, coverage: { type: 'number' }, drift: { type: 'number' }, passed: { type: 'boolean' }, scenes: { type: 'array', items: { type: 'json' } }, bannedHits: { type: 'array', items: { type: 'string' } }, conditional: { type: 'array', items: { type: 'string' } }, requirements: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } },
      },
    },
    render(_args, value) {
      if (value.available !== true) return text('门禁未启用：' + (value.note ?? '无看护卡（context card 尚未生成）'))
      const missed = (value.scenes ?? []).filter((s) => s.matched !== true).map((s) => s.title).join('、')
      return text([
        `覆盖率：${value.coverage}% · 偏离度：${value.drift}% · ${value.passed ? '通过' : '阻断'}`,
        missed !== '' ? `缺失场景：${missed}` : '全部必写场景已覆盖',
        (value.bannedHits ?? []).length > 0 ? `命中禁止项：${value.bannedHits.join('、')}` : '禁止项零命中',
        (value.conditional ?? []).length > 0 ? `条件型（需人工复核，不计入偏离）：${value.conditional.join('、')}` : '',
      ].filter((l) => l !== '').join('\n'))
    },
    async execute(args) {
      const serviceLocal = service
      const content = args.content !== undefined
        ? args.content
        : (() => {
          try {
            const st = serviceLocal.readChapter(args.novel, args.chapter)
            return st.content
          } catch { return '' }
        })()
      if (content === '') throw new Error(`chapter not found: ${args.chapter}（content 未提供且文件不存在）`)
      // 干跑：纯计算，不落盘不污染已保存章节的 gate 记录
      return service.computeGate(args.novel, args.chapter, content)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_review_submit',
    description: '提交一章的审查结论（质量审查阶段）：记录分数、硬门禁判定与发现列表；找到问题必须引用原文。无发现的"通过"视为无效审查；verdict=pass 当且仅当 score=100 且硬门禁全部通过（review 门禁零容忍，服务层强制执行）。',
    parameters: {
      novel: { type: 'string', required: true },
      chapter: { type: 'integer', required: true },
      verdict: { type: 'string', enum: ['pass', 'fail'], required: true },
      score: { type: 'integer', required: true, description: '9 维满分 100 制得分' },
      findings: { type: 'array', items: { type: 'string' }, required: true, description: '每条含章节内引用与严重程度（阻断/警告/建议）；至少 2 条非空发现' },
      hardGates: { type: 'array', items: { type: 'string' }, description: '未通过的硬门禁名称（[] 表示全部通过）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: { ok: { type: 'boolean' }, score: { type: 'integer' }, verdict: { type: 'string' } },
      },
    },
    render(_args, value) {
      return text(`审查已记录：${value.verdict === 'pass' ? '通过' : '未通过'} · ${value.score} 分`)
    },
    async execute(args) {
      return service.recordReview(args.novel, args)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_data_ingest',
    description: '平台数据入库并触发信号检测。两种来源：① records 数组（每项含 date: YYYY-MM-DD 与 完读率/读完率/追读/日增收藏/收益 等指标）；② 只给 platform 名 → 执行该平台配置的 fetchCommand（settings novel-writing.platforms），解析 stdout JSON 行入库。入库即返回数据信号（完读率低/章节流失/追读下降/收藏停滞/收益下滑）与建议行动。',
    parameters: {
      novel: { type: 'string', required: true },
      records: { type: 'array', items: { type: 'json' }, description: '指标记录数组（每项必须含 date: YYYY-MM-DD）；用 platform 适配器时省略' },
      platform: { type: 'string', description: '适配器来源：执行该平台 fetchCommand 抓取数据（与 records 二选一）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: { stored: { type: 'integer' }, total: { type: 'integer' }, signals: { type: 'array', items: { type: 'json' } } },
      },
    },
    render(_args, value) {
      const head = value.signals.length > 0
        ? '数据信号：\n' + value.signals.map((s) => `- [${s.severity}] ${s.signal}：${s.action}`).join('\n')
        : '无异常数据信号'
      return text(`已入库 ${value.stored} 条（共 ${value.total} 条）\n${head}`)
    },
    async execute(args) {
      if (args.platform !== undefined) {
        if (args.records !== undefined) throw new Error('records 与 platform 只能提供其一')
        return service.ingestFromAdapter(args.novel, args.platform)
      }
      if (args.records === undefined) throw new Error('records 或 platform 必须提供其一')
      return service.ingestData(args.novel, args.records)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_publish',
    description: '执行章节发布：按平台配置导出定稿产物（dist/<平台>/）与发布清单；配置了 command 的平台在导出后运行自动化命令；mode=manual 仅生成清单。发布前必须确认 release_allowed=true。',
    parameters: {
      novel: { type: 'string', required: true },
      platform: { type: 'string', required: true, description: '平台名（settings 中 platforms 键）' },
      chapters: { type: 'array', items: { type: 'integer' }, required: true },
      mode: { type: 'string', enum: ['export', 'command', 'manual'] },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          platform: { type: 'string' }, mode: { type: 'string' }, dir: { type: 'string' },
          chapters: { type: 'array', items: { type: 'json' } }, commandResult: { type: 'json' },
        },
      },
    },
    render(_args, value) {
      return text([
        `发布完成（${value.platform} · ${value.mode}）：${value.chapters.length} 章 → ${value.dir}`,
        value.commandResult !== null && value.commandResult !== undefined ? `自动化命令：exit ${value.commandResult.exitCode}` : '未配置自动化命令（人工粘贴或配置 command）',
      ].join('\n'))
    },
    async execute(args) {
      // release_allowed 校验已下沉服务层（与 HTTP 工作台同一收口）
      return service.publish(args.novel, { platform: args.platform, chapters: args.chapters, mode: args.mode })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_requests',
    description: '列出用户从「小说工作台」创建的待处理请求（优化指定章节 / 发布 / 补录数据 / 审查 / 人工指令），完成后用 novel_request_done 标记。',
    parameters: {
      novel: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: { requests: { type: 'array', items: { type: 'json' } } },
      },
    },
    render(_args, value) {
      if (value.requests.length === 0) return text('无待处理请求。')
      return text(value.requests.map((r) => `- [${r.id}] ${r.kind}${r.chapter !== null ? ' 第' + r.chapter + '章' : ''}${r.note !== '' ? '：' + r.note : ''}`).join('\n'))
    },
    async execute(args) {
      return { requests: service.listRequests(args.novel).filter((r) => r.status !== 'done') }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'novel_request_done',
    description: '标记一条工作台请求已完成（状态置 done）。',
    parameters: {
      novel: { type: 'string', required: true },
      id: { type: 'string', required: true, description: '请求 id（novel_requests 返回）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: { id: { type: 'string' }, status: { type: 'string' } },
      },
    },
    render(_args, value) { return text(`请求 ${value.id} → ${value.status}`) },
    async execute(args) {
      const entry = service.completeRequest(args.novel, args.id)
      return { id: entry.id, status: entry.status }
    },
  }))
}
