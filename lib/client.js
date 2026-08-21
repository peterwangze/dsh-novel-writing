/**
 * dsh-novel-writing 浏览器侧包（`./client`，dual-face 下发）。
 *
 * 界面：
 * - 「小说」视图（conversation.view id=novel-studio）：小说工作台——书目选择、
 *   章节列表、正文阅读/编辑（保存走宿主门禁）、工作流进度与门禁面板、
 *   数据录入与信号看板、发布记录、UI 请求队列；
 * - 「小说 HUD」（sidebar.footer.action + shell.overlay）：实时写作状态浮动面板；
 * - 「设置 → 小说写作」（settings.section）：工作区根目录、平台发布配置、轮询周期。
 *
 * 数据面：直连宿主回环 API /novel-writing/api/*（overview/novel/chapter/request/
 * publish/data），2s 轮询实现实时渲染；设置走标准 api.settings wire。
 */
window.__ModuleLoader__.load({
  id: 'dsh-novel-writing',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    let react = require('react')

    const el = react.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = react

    // ── 轻量 i18n ─────────────────────────────────────────────────────────
    const LANG = {
      zh: {
        title: '小说工作台', hud: '小说 HUD', settingsTitle: '小说写作',
        noNovels: '小说工作区为空。',
        noNovelsHint: '在「设置 → 小说写作」指定 workspaceRoot，然后在小说目录中启动「小说写作工作流」预设；协调者会创建 novel-project/workflow-state.json。',
        picker: '选择小说', refresh: '刷新', save: '保存', forceSave: '强制保存（人工改稿）',
        read: '阅读', edit: '编辑', saving: '保存中…', saved: '已保存', blocked: '门禁未通过',
        chapters: '章节', requests: '请求', publish: '发布', data: '数据', workflow: '工作流',
        stage: '阶段', gates: '门禁', signals: '数据信号', noData: '暂无数据',
        platform: '平台', mode: '模式', exportOnly: '导出', command: '命令', manual: '仅清单',
        words: '字', publishLog: '发布记录', noPublish: '暂无发布记录',
        submitRequest: '提交请求', requestKind: '请求类型', note: '备注', submit: '提交',
        requestDone: '完成', pending: '待处理', done: '已完成',
        openStudio: '打开工作台：点击会话顶部「小说」标签',
        loading: '加载中…', apiError: 'API 不可用（宿主未挂载 webServer 或插件未运行）',
        gateOk: '门禁通过', gateFail: '门禁未通过', coverage: '覆盖率', drift: '偏离度',
        lightAudit: '机器审计', metrics: '指标数据', ingest: '入库',
        date: '日期', readRate: '完读率', finishRate: '读完率', retention: '追读', collections: '日增收藏', revenue: '收益',
        chapter: '章节', score: '分', noGate: '未生成看护卡（门禁未启用）',
        add: '添加', remove: '删除', saveOk: '已保存', saveFail: '保存失败',
        auto: '自动', closed: '关闭',
      },
      en: {
        title: 'Novel Studio', hud: 'Novel HUD', settingsTitle: 'Novel Writing',
        noNovels: 'Workspace is empty.', noNovelsHint: 'Set workspaceRoot in Settings → Novel Writing, then start the writing-workflow preset in a novel directory.',
        picker: 'Select novel', refresh: 'Refresh', save: 'Save', forceSave: 'Force save (manual draft)',
        read: 'Read', edit: 'Edit', saving: 'Saving…', saved: 'Saved', blocked: 'Gate failed',
        chapters: 'Chapters', requests: 'Requests', publish: 'Publish', data: 'Data', workflow: 'Workflow',
        stage: 'Stage', gates: 'Gates', signals: 'Signals', noData: 'No data yet',
        platform: 'Platform', mode: 'Mode', exportOnly: 'Export', command: 'Command', manual: 'Checklist only',
        words: 'w', publishLog: 'Publish log', noPublish: 'No publishes yet',
        submitRequest: 'Submit request', requestKind: 'Kind', note: 'Note', submit: 'Submit',
        requestDone: 'Done', pending: 'Pending', done: 'Done',
        openStudio: 'Open the studio via the "Novel" tab above',
        loading: 'Loading…', apiError: 'API unavailable',
        gateOk: 'Gate passed', gateFail: 'Gate failed', coverage: 'Coverage', drift: 'Drift',
        lightAudit: 'Audit', metrics: 'Metrics', ingest: 'Ingest',
        date: 'Date', readRate: 'Read rate', finishRate: 'Finish rate', retention: 'Retention', collections: 'Daily adds', revenue: 'Revenue',
        chapter: 'Chapter', score: 'pts', noGate: 'No context card (gate off)',
        add: 'Add', remove: 'Remove', saveOk: 'Saved', saveFail: 'Save failed',
        auto: 'Auto', closed: 'Closed',
      },
    }
    function makeT(locale) {
      const dict = locale === 'en' ? LANG.en : LANG.zh
      return (key, ...args) => {
        const v = dict[key] !== undefined ? dict[key] : LANG.zh[key]
        return typeof v === 'function' ? v(...args) : v
      }
    }

    // ── 共享状态（模块级 store：HUD 开关 + 工作台选中小说）──────────────
    const store = {
      hudOpen: false,
      selected: null,
      listeners: new Set(),
      get: () => ({ hudOpen: store.hudOpen, selected: store.selected }),
      set(patch) {
        if (patch.hudOpen !== undefined) store.hudOpen = patch.hudOpen
        if (patch.selected !== undefined) store.selected = patch.selected
        for (const fn of store.listeners) fn(store.get())
      },
      subscribe(fn) {
        store.listeners.add(fn)
        return () => store.listeners.delete(fn)
      },
    }
    function useStore() {
      const snap = useSyncExternalStoreSafe()
      return snap
    }
    function useSyncExternalStoreSafe() {
      const [snap, setSnap] = useState(store.get())
      useEffect(() => store.subscribe(() => setSnap({ ...store.get() })), [])
      return snap
    }

    // ── API 客户端 ───────────────────────────────────────────────────────
    async function apiJson(path, body) {
      const res = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
      })
      if (!res.ok) {
        let msg = 'http ' + res.status
        try { const j = await res.json(); if (j.error !== undefined) msg = j.error } catch { /* keep */ }
        throw new Error(msg)
      }
      return res.json()
    }

    // ── 轮询钩子 ─────────────────────────────────────────────────────────
    function usePoll(fn, ms, deps) {
      const [data, setData] = useState(null)
      const [error, setError] = useState(null)
      const timer = useRef(null)
      const fnRef = useRef(fn)
      fnRef.current = fn
      useEffect(() => {
        let alive = true
        const tick = () => {
          fnRef.current()
            .then((d) => { if (alive) { setData(d); setError(null) } })
            .catch(() => { if (alive) setError('api') })
        }
        tick()
        timer.current = window.setInterval(tick, ms)
        return () => { alive = false; if (timer.current !== null) window.clearInterval(timer.current) }
      }, deps ?? [])
      return { data, error, reload: () => { /* 由 tick 驱动 */ } }
    }

    const card = { border: '1px solid rgba(128,128,128,0.28)', borderRadius: '8px', padding: '10px', margin: '8px 0', background: 'rgba(128,128,128,0.04)' }
    const btn = { padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', cursor: 'pointer', fontSize: '12px' }
    const input = { padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', fontSize: '12px', color: 'inherit' }
    const label = { fontSize: '12px', opacity: 0.75, minWidth: '120px', display: 'inline-block' }
    const hint = { fontSize: '12px', opacity: 0.65, lineHeight: 1.6 }
    const title = { fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }

    // ── 简易 Markdown 渲染（章节预览）────────────────────────────────────
    function renderInline(text) {
      const parts = []
      let rest = text
      const boldRe = /\*\*([^*]+)\*\*/
      while (rest.length > 0) {
        const m = rest.match(boldRe)
        if (m === null) { parts.push(rest); break }
        const before = rest.slice(0, m.index)
        if (before !== '') parts.push(before)
        parts.push(el('strong', { key: parts.length }, m[1]))
        rest = rest.slice(m.index + m[0].length)
      }
      return parts
    }

    function renderContent(content) {
      const scenes = content.split(/^\s*---\s*$/m).filter((s) => s.trim() !== '')
      return el('div', null, scenes.map((scene, si) => {
        const paras = scene.trim().split('\n').map((p) => p.trim()).filter((p) => p !== '')
        const blocks = paras.map((p, pi) => {
          if (p.startsWith('# ')) return el('h2', { key: pi, style: { fontSize: '15px', margin: '14px 0 6px' } }, renderInline(p.slice(2)))
          if (p.startsWith('## ')) return el('h3', { key: pi, style: { fontSize: '14px', margin: '12px 0 4px' } }, renderInline(p.slice(3)))
          return el('p', { key: pi, style: { margin: '8px 0', lineHeight: 1.9, fontSize: '14px' } }, renderInline(p))
        })
        return el('div', { key: si, style: si > 0 ? { marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(128,128,128,0.3)' } : {} }, blocks)
      }))
    }

    // ── 章节阅读/编辑 ───────────────────────────────────────────────────
    function readerOf(overview, novelId) {
      return overview !== null && overview !== undefined
        ? (overview.novels ?? []).find((n) => n.id === novelId)
        : null
    }

    function ChapterPanel(props) {
      const t = props.t
      const novel = props.novel
      const api = props.api
      const [mode, setMode] = useState('read')
      const [selected, setSelected] = useState(null)
      const [draft, setDraft] = useState('')
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const reloadKey = useRef(0)

      const poll = usePoll(async () => {
        const id = typeof selected === 'number' ? selected : (novel.chapters.length > 0 ? novel.chapters[0].num : null)
        if (id === null) return null
        const q = (await apiJson('/novel-writing/api/chapter?novel=' + encodeURIComponent(props.novelId) + '&chapter=' + id))
        return q
      }, 2000, [props.novelId])

      const chapter = poll.data !== null ? poll.data : null

      if (novel.chapters.length === 0) {
        return el('div', { style: hint }, '尚无章节 —— 协调者完成细纲后开始正文生成，或在对话中要求开始写作。')
      }

      const list = novel.chapters
      const active = chapter !== null ? chapter : null

      const select = (num) => { setSelected(num); setMode('read'); setNotice('') }

      const save = (force) => {
        if (active === null || draft === '') return
        setBusy(true)
        setNotice('')
        apiJson('/novel-writing/api/chapter', { novel: props.novelId, chapter: active.num, content: draft, force })
          .then((r) => { setNotice(force ? `已保存（强制）· ${r.words} 字` : `已保存 · ${r.words} 字`); setMode('read') })
          .catch((e) => setNotice('保存失败：' + e.message))
          .then(() => setBusy(false))
      }

      const readView = active === null
        ? null
        : el('div', null,
            el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0 8px' } },
              el('strong', null, `第${active.num}章 · ${active.words} ${t('words')}`),
              active.published ? el('span', { style: hint }, '已发布') : null,
              active.forced ? el('span', { style: { ...hint, color: '#b26a00' } }, '强制保存') : null,
              el('button', { style: btn, onClick: () => { setDraft(active.content ?? ''); setMode('edit') } }, t('edit')),
            ),
            (active.gate !== null && active.gate !== undefined)
              ? el('div', { style: { ...card, padding: '8px', margin: '4px 0 8px' } },
                  el('span', null, `${t('coverage')} ${active.gate.coverage ?? '—'}% · ${t('drift')} ${active.gate.drift ?? '—'}% · `),
                  el('strong', { style: active.gate.passed ? { color: '#2e7d32' } : { color: '#c62828' } }, active.gate.passed ? t('gateOk') : t('gateFail')),
                )
              : el('div', { style: hint }, t('noGate')),
            el('div', { style: { border: '1px solid rgba(128,128,128,0.2)', borderRadius: '8px', padding: '12px', maxHeight: '560px', overflow: 'auto' } },
              renderContent(active.content ?? '')),
          )

      const editView = active === null
        ? null
        : el('div', null,
            el('textarea', {
              value: draft,
              onChange: (e) => setDraft(e.target.value),
              style: { width: '100%', minHeight: '420px', padding: '12px', borderRadius: '8px', border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit', fontSize: '14px', lineHeight: 1.9, fontFamily: 'inherit' },
            }),
            el('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' } },
              el('button', { style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' }, disabled: busy, onClick: () => save(false) }, busy ? t('saving') : t('save')),
              el('button', { style: { ...btn, color: '#b26a00' }, disabled: busy, onClick: () => save(true) }, t('forceSave')),
              el('button', { style: btn, disabled: busy, onClick: () => setMode('read') }, t('closed')),
              notice !== '' ? el('span', { style: { ...hint, color: notice.startsWith('保存失败') ? '#c62828' : '#2e7d32' } }, notice) : null,
            ),
          )

      return el('div', { style: { display: 'flex', gap: '12px', height: '100%' } },
        el('div', { style: { width: '180px', flexShrink: 0, overflow: 'auto' } },
          el('div', { style: title }, t('chapters')),
          list.map((c) => el('button', {
            key: c.num,
            onClick: () => select(c.num),
            style: {
              display: 'block', width: '100%', textAlign: 'left', margin: '2px 0', padding: '4px 8px',
              borderRadius: '6px', border: '1px solid rgba(128,128,128,0.2)', background: selected === c.num || (selected === null && c.num === list[0].num) ? 'rgba(128,128,128,0.15)' : 'transparent',
              cursor: 'pointer', fontSize: '12px', color: 'inherit',
            },
          }, `第${c.num}章 ${c.words}${c.published ? ' ✓' : ''}${c.gate !== null && c.gate.passed === false ? ' ⚠' : ''}`)),
        ),
        el('div', { style: { flex: 1, minWidth: 0 } }, mode === 'read' ? readView : editView),
      )
    }

    // ── 工作流右侧面板 ──────────────────────────────────────────────────
    function WorkflowPanel(props) {
      const t = props.t
      const novel = props.novel
      const state = novel.state ?? {}
      const info = state.project_info ?? {}
      const guardrails = state.guardrails ?? {}
      const stats = state.statistics ?? {}
      const stages = ['work_type_selection', 'platform_research', 'competitor_analysis', 'genre_selection', 'novel_confirmation', 'creation_planning', 'outline_writing', 'chapter_outline', 'content_generation', 'quality_review', 'launch_strategy', 'monetization_strategy', 'data_monitoring', 'reader_interaction']
      const stageNames = {
        work_type_selection: '作品类型', platform_research: '平台调研', competitor_analysis: '竞品分析',
        genre_selection: '题材选择', novel_confirmation: '作品确认', creation_planning: '创作规划',
        outline_writing: '大纲生成', chapter_outline: '章节细纲', content_generation: '正文生成',
        quality_review: '质量审查', launch_strategy: '上架发布', monetization_strategy: '变现策略',
        data_monitoring: '数据监控', reader_interaction: '读者互动',
      }
      return el('div', null,
        el('div', { style: title }, t('workflow')),
        el('div', { style: card },
          el('div', null, `${t('stage')}：${state.current_stage ?? '—'}`),
          el('div', { style: hint }, `《${info.title ?? props.novelId}》 · ${info.work_type ?? '?'} · ${info.platform ?? '?'} · ${info.genre ?? '?'}`),
          el('div', { style: hint }, `${stats.total_chapters ?? 0} 章 · ${stats.total_words ?? 0} ${t('words')}`),
        ),
        el('div', { style: card },
          el('div', { style: { margin: '2px 0' } }, `${t('gates')}：`),
          el('div', { style: hint }, `发布 ${guardrails.release_allowed ? '✓' : '✗'} · 变现 ${guardrails.monetization_allowed ? '✓' : '✗'}`),
          el('div', { style: hint }, `AI路径 ${guardrails.latest_ai_path ?? '未评估'} · 偏离度 ${guardrails.latest_drift_score ?? '—'}`),
        ),
        el('div', { style: card, maxHeight: '220px', overflow: 'auto' },
          stages.map((s) => {
            const done = (state.completed_stages ?? []).includes(s)
            const current = state.current_stage === s
            return el('div', { key: s, style: { fontSize: '12px', margin: '2px 0', opacity: current ? 1 : 0.75, fontWeight: current ? 700 : 400 } },
              `${done ? '✅' : current ? '🔄' : '⬜'} ${stageNames[s] ?? s}${current ? '（当前）' : ''}`)
          }),
        ),
        el('div', { style: card },
          el('div', { style: { margin: '2px 0' } }, `${t('requests')}：`),
          (novel.requests ?? []).length === 0
            ? el('div', { style: hint }, '无待处理')
            : novel.requests.map((r) => el('div', { key: r.id, style: { fontSize: '12px', margin: '2px 0' } },
                `[${r.status}] ${r.kind}${r.chapter !== null && r.chapter !== undefined ? ' 第' + r.chapter + '章' : ''}${r.note !== '' ? '：' + r.note : ''}`)),
        ),
      )
    }

    // ── 数据面板 ────────────────────────────────────────────────────────
    function DataPanel(props) {
      const t = props.t
      const novelId = props.novelId
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), 完读率: '', 读完率: '', 追读: '', 日增收藏: '', 收益: '' })
      const poll = usePoll(() => apiJson('/novel-writing/api/novel?id=' + encodeURIComponent(novelId)), 5000, [novelId])
      const detail = poll.data

      const ingest = () => {
        const rec = { date: form.date }
        for (const k of ['完读率', '读完率', '追读', '日增收藏', '收益']) {
          if (form[k] !== '') rec[k] = Number(form[k])
        }
        setBusy(true)
        setNotice('')
        apiJson('/novel-writing/api/data', { novel: novelId, records: [rec] })
          .then((r) => setNotice(`已入库 ${r.stored} 条 · 信号 ${r.signals.length} 条`))
          .catch((e) => setNotice('入库失败：' + e.message))
          .then(() => setBusy(false))
      }

      const signals = detail !== null ? detail.signals ?? [] : []

      const spark = (values, color) => {
        if (values.length < 2) return null
        const max = Math.max(...values, 1)
        return el('div', { style: { display: 'flex', gap: '2px', alignItems: 'flex-end', height: '40px', margin: '4px 0' } },
          values.map((v, i) => el('div', { key: i, style: { flex: 1, height: Math.max(2, Math.round((v / max) * 36)) + 'px', background: color, borderRadius: '2px', opacity: 0.8 } })))
      }

      return el('div', null,
        el('div', { style: title }, t('data')),
        signals.length > 0
          ? el('div', { style: card },
              signals.map((s, i) => el('div', { key: i, style: { fontSize: '12px', margin: '3px 0' } },
                el('strong', { style: s.severity === 'high' ? { color: '#c62828' } : { color: '#b26a00' } }, `[${s.severity}] ${s.signal} `),
                `（${s.actual} · ${s.threshold}）→ ${s.action}`)))
          : el('div', { style: hint }, '暂无信号（入库后自动检测）'),
        el('div', { style: card },
          el('div', { style: { margin: '2px 0' } }, `${t('metrics')}（每日一行）`),
          el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } },
            el('span', null, el('input', { style: { ...input, width: '90px' }, type: 'date', value: form.date, onChange: (e) => setForm({ ...form, date: e.target.value }) })),
            el('span', null, '完读率% ' + el('input', { style: input, value: form.完读率, placeholder: '10.5', onChange: (e) => setForm({ ...form, 完读率: e.target.value }) })),
            el('span', null, '读完率% ' + el('input', { style: input, value: form.读完率, placeholder: '35', onChange: (e) => setForm({ ...form, 读完率: e.target.value }) })),
            el('span', null, '追读% ' + el('input', { style: input, value: form.追读, placeholder: '60', onChange: (e) => setForm({ ...form, 追读: e.target.value }) })),
            el('span', null, '日增收藏 ' + el('input', { style: input, value: form.日增收藏, placeholder: '12', onChange: (e) => setForm({ ...form, 日增收藏: e.target.value }) })),
            el('span', null, '收益 ' + el('input', { style: input, value: form.收益, placeholder: '120', onChange: (e) => setForm({ ...form, 收益: e.target.value }) })),
          ),
          el('div', { style: { marginTop: '8px' } },
            el('button', { style: { ...btn, background: '#1565c0', color: '#fff', border: 'none' }, disabled: busy, onClick: ingest }, busy ? '…' : t('ingest')),
            notice !== '' ? el('span', { style: { ...hint, marginLeft: '8px' } }, notice) : null,
          ),
        ),
        el('div', { style: hint }, '多平台自动化数据抓取：在设置里给平台配置 fetchCommand（stdout 输出 JSON 行 {date, 完读率, 追读…}），由协调者用 novel_data_ingest 收口入库。'),
      )
    }

    // ── 发布面板 ────────────────────────────────────────────────────────
    function PublishPanel(props) {
      const t = props.t
      const novelId = props.novelId
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const [platform, setPlatform] = useState('番茄小说')
      const poll = usePoll(() => apiJson('/novel-writing/api/novel?id=' + encodeURIComponent(novelId)), 5000, [novelId])
      const detail = poll.data

      const run = (mode) => {
        const chapters = (detail?.chapters ?? []).filter((c) => c.published !== true).map((c) => c.num)
        if (chapters.length === 0) { setNotice('没有未发布章节'); return }
        setBusy(true)
        setNotice('')
        apiJson('/novel-writing/api/publish', { novel: novelId, platform, chapters, mode })
          .then((r) => setNotice(`发布完成：${r.chapters.length} 章 → ${r.dir}${r.commandResult !== undefined && r.commandResult !== null ? `（命令 exit ${r.commandResult.exitCode}）` : ''}`))
          .catch((e) => setNotice('发布失败：' + e.message))
          .then(() => setBusy(false))
      }

      const log = detail !== null ? detail.publishLog ?? [] : []
      return el('div', null,
        el('div', { style: title }, t('publish')),
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          el('select', { style: input, value: platform, onChange: (e) => setPlatform(e.target.value) },
            ['番茄小说', '起点中文网', '晋江文学城', '七猫小说'].map((p) => el('option', { key: p, value: p }, p))),
          el('button', { style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' }, disabled: busy, onClick: () => run('export') }, busy ? '…' : '导出'),
          el('button', { style: { ...btn, color: '#2e7d32' }, disabled: busy, onClick: () => run('command') }, '导出+命令'),
          el('button', { style: btn, disabled: busy, onClick: () => run('manual') }, '仅清单'),
        ),
        notice !== '' ? el('div', { style: { ...hint, color: notice.startsWith('发布失败') ? '#c62828' : '#2e7d32', marginTop: '6px' } }, notice) : null,
        el('div', { style: card },
          (log.length === 0 ? el('div', { style: hint }, t('noPublish')) : log.slice(0, 6).map((entry, i) => el('div', { key: i, style: { fontSize: '12px', margin: '2px 0' } },
            `${entry.at.slice(0, 19).replace('T', ' ')} · ${entry.platform} · ${entry.mode} · ${(entry.chapters ?? []).length} 章 · ${entry.ok ? '✓' : '✗'}`))),
        ),
        el('div', { style: hint }, '发布前协调者会校验 release_allowed 门禁；各平台后台无公开 API，导出产物 + 发布清单 + 可配置自动化命令。'),
      )
    }

    // ── 文件树（workspace → 当前书目 novel-project）─────────────────────
    function buildTree(files) {
      const root = { name: '', dirs: {}, files: [] }
      for (const f of files) {
        const segs = String(f.path).split('/')
        let node = root
        for (let i = 0; i < segs.length - 1; i++) {
          if (node.dirs[segs[i]] === undefined) node.dirs[segs[i]] = { name: segs[i], dirs: {}, files: [] }
          node = node.dirs[segs[i]]
        }
        node.files.push(f)
      }
      return root
    }

    function FileTreeNode(props) {
      const node = props.node
      const depth = props.depth ?? 0
      const collapsed = props.collapsed
      const onToggle = props.onToggle
      const selected = props.selected
      const onSelect = props.onSelect
      const pad = { paddingLeft: (depth * 12 + 6) + 'px' }
      const dirEntries = Object.values(node.dirs).sort((a, b) => a.name.localeCompare(b.name))
      const fileEntries = node.files.slice().sort((a, b) => a.path.localeCompare(b.path))
      const row = (key, glyph, text, onClick, isSel, extra) => el('button', {
        key,
        onClick,
        title: extra ?? '',
        style: {
          display: 'block', width: '100%', textAlign: 'left', padding: '2px 6px', margin: 0,
          border: 'none', background: isSel ? 'rgba(128,128,128,0.2)' : 'transparent',
          color: 'inherit', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          ...pad,
        },
      }, glyph + ' ' + text)
      const children = []
      for (const d of dirEntries) {
        children.push(row('dir-' + d.name, collapsed.has(d.name) ? '▸' : '▾', d.name + '/', () => onToggle(d.name)))
        if (!collapsed.has(d.name)) {
          children.push(el(FileTreeNode, { key: 'sub-' + d.name, node: d, depth: depth + 1, collapsed, onToggle, selected, onSelect }))
        }
      }
      for (const f of fileEntries) {
        children.push(row('file-' + f.path, '📄', f.path.split('/').pop(), () => onSelect(f.path), selected === f.path, `${f.path} · ${f.size}B`))
      }
      return el('div', null, children)
    }

    function FilePreview(props) {
      const [state, setState] = useState({ loading: true, data: null, error: null })
      useEffect(() => {
        let alive = true
        setState({ loading: true, data: null, error: null })
        apiJson('/novel-writing/api/file?novel=' + encodeURIComponent(props.novelId) + '&path=' + encodeURIComponent(props.path))
          .then((data) => { if (alive) setState({ loading: false, data, error: null }) })
          .catch((e) => { if (alive) setState({ loading: false, data: null, error: e.message }) })
        return () => { alive = false }
      }, [props.novelId, props.path])
      const close = () => props.onClose()
      return el('div', { style: { borderTop: '1px solid rgba(128,128,128,0.25)', marginTop: '8px', paddingTop: '8px' } },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
          el('span', { style: { fontSize: '12px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, '📄 ' + props.path),
          el('button', { style: { ...btn, fontSize: '11px', padding: '1px 6px' }, onClick: close }, '✕'),
        ),
        state.loading ? el('div', { style: hint }, '加载中…')
          : state.error !== null ? el('div', { style: { ...hint, color: '#c62828' } }, state.error)
          : state.data.tooLarge === true ? el('div', { style: hint }, `文件过大（${state.data.size}B），请用编辑器打开`)
          : /\.md$/.test(props.path)
            ? el('div', { style: { maxHeight: '300px', overflow: 'auto', fontSize: '12px', lineHeight: 1.8 } }, renderContent(state.data.content ?? ''))
            : el('pre', { style: { maxHeight: '300px', overflow: 'auto', fontSize: '11px', margin: 0, whiteSpace: 'pre-wrap' } }, state.data.content ?? ''),
      )
    }

    function Sidebar(props) {
      const t = props.t
      const novels = props.novels
      const selectedId = props.selectedId
      const detail = props.detail
      const onSelectNovel = props.onSelectNovel
      const [collapsed, setCollapsed] = useState(() => new Set())
      const [fileSel, setFileSel] = useState(null)
      const toggle = (name) => setCollapsed((prev) => {
        const next = new Set(prev)
        if (next.has(name)) next.delete(name)
        else next.add(name)
        return next
      })
      const tree = useMemo(() => buildTree(detail !== null ? detail.files ?? [] : []), [detail])
      const head = (text) => el('div', { style: { fontSize: '11px', fontWeight: 700, opacity: 0.65, margin: '8px 0 4px', letterSpacing: '0.05em' } }, text)
      return el('div', { style: { width: '220px', flexShrink: 0, borderRight: '1px solid rgba(128,128,128,0.2)', paddingRight: '10px', overflow: 'auto' } },
        head('书目（' + novels.length + '）'),
        novels.map((n) => el('button', {
          key: n.id,
          onClick: () => { onSelectNovel(n.id); setFileSel(null) },
          style: {
            display: 'block', width: '100%', textAlign: 'left', padding: '4px 6px', marginBottom: '2px',
            borderRadius: '6px', border: '1px solid ' + (n.id === selectedId ? 'rgba(128,128,128,0.45)' : 'transparent'),
            background: n.id === selectedId ? 'rgba(128,128,128,0.15)' : 'transparent',
            cursor: 'pointer', fontSize: '12px', color: 'inherit',
          },
        },
          el('div', { style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (n.id === selectedId ? '📖 ' : '') + n.title),
          el('div', { style: { fontSize: '11px', opacity: 0.65 } }, `${n.stage ?? '未开始'} · ${n.totalChapters}章${n.requests > 0 ? ' · ⚠' + n.requests : ''}`),
        )),
        head('文件（novel-project）'),
        el(FileTreeNode, { node: tree, depth: 0, collapsed, onToggle: toggle, selected: fileSel, onSelect: setFileSel }),
        fileSel !== null ? el(FilePreview, { novelId: selectedId, path: fileSel, onClose: () => setFileSel(null) }) : null,
      )
    }

    function CreateBar(props) {
      const t = props.t
      const [name, setName] = useState('')
      const [bookTitle, setBookTitle] = useState('')
      const [busy, setBusy] = useState(false)
      const [notice, setNotice] = useState('')
      const close = props.onClose
      const create = (andLaunch) => {
        if (name.trim() === '') { setNotice('目录名必填'); return }
        setBusy(true)
        apiJson('/novel-writing/api/novel-create', { name: name.trim(), title: bookTitle.trim() })
          .then((r) => {
            props.onCreated(r.id)
            if (andLaunch) props.onLaunch(r.id, r.title, true)
            close()
          })
          .catch((e) => setNotice('创建失败：' + e.message))
          .then(() => setBusy(false))
      }
      return el('div', { style: { ...card, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', margin: '0 0 8px' } },
        el('input', { style: { ...input, width: '150px' }, placeholder: '目录名（必填，如 fayi-xiantu）', value: name, onChange: (e) => setName(e.target.value) }),
        el('input', { style: { ...input, width: '150px' }, placeholder: '书名（可选，默认同目录名）', value: bookTitle, onChange: (e) => setBookTitle(e.target.value) }),
        el('button', { style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' }, disabled: busy, onClick: () => create(true) }, busy ? '…' : '创建并开始工作流' ),
        el('button', { style: btn, disabled: busy, onClick: () => create(false) }, '仅创建'),
        el('button', { style: btn, onClick: close }, '取消'),
        notice !== '' ? el('span', { style: { ...hint, color: '#c62828' } }, notice) : null,
      )
    }

    // ── 工作台主视图 ─────────────────────────────────────────────────────
    function StudioView(props) {
      const t = props.t
      const snap = useStore()
      const [tab, setTab] = useState('chapters')
      const [notice, setNotice] = useState('')
      const [creating, setCreating] = useState(false)
      const [showTree, setShowTree] = useState(true)
      const poll = usePoll(() => apiJson('/novel-writing/api/overview'), 2000, [])
      const overview = poll.data
      const novels = overview !== null ? overview.novels ?? [] : []

      useEffect(() => {
        if (novels.length > 0 && (store.selected === null || !novels.some((n) => n.id === store.selected))) {
          store.set({ selected: novels[0].id })
        }
      }, [novels.length])

      const selectedId = snap.selected
      const current = novels.find((n) => n.id === selectedId)
      const detailPoll = usePoll(
        selectedId === null ? async () => null : () => apiJson('/novel-writing/api/novel?id=' + encodeURIComponent(selectedId)),
        2000,
        [selectedId],
      )
      const detail = detailPoll.data

      // 「启动/继续工作流」：把指令注入当前会话的输入框并提交（conversation.view 标准面 inputActions）
      const launch = (id, bookTitle, forceNew) => {
        const n = novels.find((x) => x.id === id)
        const isNew = forceNew === true || (n !== undefined && (n.completedStages ?? []).length === 0 && (n.totalChapters ?? 0) === 0)
        const msg = (isNew ? '开始小说创作工作流' : '继续小说创作工作流') + `：《${bookTitle}》（目录 ${id}）`
        const actions = props.inputActions
        if (actions !== undefined && typeof actions.setDraft === 'function' && typeof actions.submit === 'function') {
          actions.setDraft(msg)
          actions.submit()
          setNotice('已发送到对话：' + msg + '（切回「对话」标签查看协调者开工）')
        } else {
          setNotice('请手动发送：' + msg)
        }
      }

      if (poll.error === 'api') {
        return el('div', { style: { padding: '24px', fontSize: '13px', color: '#c62828' } }, t('apiError'))
      }

      const tabs = [
        ['chapters', t('chapters')], ['workflow', t('workflow')], ['data', t('data')], ['publish', t('publish')], ['requests', t('requests')],
      ]
      const isNewNovel = current !== undefined && (current.completedStages ?? []).length === 0 && (current.totalChapters ?? 0) === 0

      return el('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', boxSizing: 'border-box' } },
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' } },
          el('button', { style: { ...btn, background: '#1565c0', color: '#fff', border: 'none' }, onClick: () => setCreating(creating ? false : true) }, '＋ 新建小说'),
          current !== undefined
            ? el('button', {
                style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' },
                onClick: () => launch(current.id, current.title),
              }, isNewNovel ? '▶ 开始工作流' : '▶ 继续工作流')
            : null,
          el('button', { style: btn, onClick: () => setShowTree(showTree ? false : true) }, showTree ? '隐藏文件树' : '文件树'),
          tabs.map(([id, name]) => el('button', {
            key: id,
            onClick: () => setTab(id),
            style: { ...btn, background: tab === id ? 'rgba(128,128,128,0.18)' : 'transparent', fontWeight: tab === id ? 700 : 400 },
          }, name)),
          detail !== null && detail.signals.length > 0
            ? el('span', { style: { fontSize: '12px', color: '#b26a00' } }, `⚠ ${detail.signals.length} 个数据信号`)
            : null,
          notice !== '' ? el('span', { style: { fontSize: '12px', color: '#2e7d32', flexBasis: '100%' } }, notice) : null,
        ),
        creating
          ? el(CreateBar, {
              t,
              onClose: () => setCreating(false),
              onCreated: (id) => { store.set({ selected: id }); setTab('workflow') },
              onLaunch: launch,
            })
          : null,
        el('div', { style: { display: 'flex', flex: 1, minHeight: 0 } },
          showTree
            ? el(Sidebar, {
                t, novels, selectedId, detail,
                onSelectNovel: (id) => store.set({ selected: id }),
              })
            : null,
          el('div', { style: { flex: 1, minWidth: 0, overflow: 'auto', paddingLeft: showTree ? '12px' : 0 } },
            novels.length === 0
              ? el('div', { style: { padding: '16px' } },
                  el('div', { style: title }, t('noNovels')),
                  el('div', { style: hint }, t('noNovelsHint') + ' 也可以直接点上方「＋ 新建小说」。'),
                )
              : null,
            tab === 'chapters' && detail !== null
              ? el(ChapterPanel, { t, api: props.api, novel: detail, novelId: selectedId })
              : null,
            tab === 'workflow' && detail !== null ? el(WorkflowPanel, { t, novel: detail }) : null,
            tab === 'data' && detail !== null ? el(DataPanel, { t, novelId: selectedId }) : null,
            tab === 'publish' && detail !== null ? el(PublishPanel, { t, novelId: selectedId }) : null,
            tab === 'requests' && detail !== null
              ? el(RequestPanel, { t, novelId: selectedId, requests: detail.requests ?? [] })
              : null,
          ),
        ),
      )
    }

    // ── 请求面板 ────────────────────────────────────────────────────────
    function RequestPanel(props) {
      const t = props.t
      const [kind, setKind] = useState('optimize')
      const [note, setNote] = useState('')
      const [chapter, setChapter] = useState('')
      const [notice, setNotice] = useState('')
      const submit = () => {
        apiJson('/novel-writing/api/request', {
          novel: props.novelId, kind, chapter: chapter === '' ? null : Number(chapter), note,
        }).then((r) => { setNotice(`已提交 ${r.id}（协调者会在下一步处理）`); setNote(''); setChapter('') })
          .catch((e) => setNotice('提交失败：' + e.message))
      }
      const done = (id) => {
        apiJson('/novel-writing/api/request-done', { novel: props.novelId, id }).catch(() => setNotice('标记失败'))
      }
      return el('div', null,
        el('div', { style: title }, '向协调者提交请求（人工↔AI 高价值互动）'),
        el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          el('select', { style: input, value: kind, onChange: (e) => setKind(e.target.value) },
            [['optimize', '优化指定章节'], ['review', '审查指定章节'], ['publish', '发布推进'], ['data', '补录数据'], ['manual', '人工指令']].map(([v, l]) => el('option', { key: v, value: v }, l))),
          el('input', { style: { ...input, width: '80px' }, placeholder: '章节号', value: chapter, onChange: (e) => setChapter(e.target.value) }),
          el('input', { style: { ...input, flex: 1, minWidth: '160px' }, placeholder: '备注（希望 AI 关注什么）', value: note, onChange: (e) => setNote(e.target.value) }),
          el('button', { style: { ...btn, background: '#1565c0', color: '#fff', border: 'none' }, onClick: submit }, t('submit')),
        ),
        notice !== '' ? el('div', { style: { ...hint, marginTop: '6px' } }, notice) : null,
        el('div', { style: card },
          props.requests.length === 0
            ? el('div', { style: hint }, '无请求')
            : props.requests.map((r) => el('div', { key: r.id, style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', margin: '4px 0' } },
              el('span', null, `[${r.kind}]${r.chapter !== null && r.chapter !== undefined ? ' 第' + r.chapter + '章' : ''}${r.note !== '' ? '：' + r.note : ''}`),
              r.status === 'pending' ? el('button', { style: { ...btn, fontSize: '11px' }, onClick: () => done(r.id) }, t('requestDone')) : el('span', { style: hint }, '已完成'),
            )),
        ),
        el('div', { style: hint }, '提交后无需切回对话——下一轮或你直接说「处理工作台请求」时，协调者会用 novel_requests 看到并处理。'),
      )
    }

    // ── 设置页 ──────────────────────────────────────────────────────────
    function SettingsPage(props) {
      const t = props.t
      const api = props.api
      const [view, setView] = useState(null)
      const [notice, setNotice] = useState('')
      const refresh = () => {
        api.settings.describe({}).then((response) => {
          if (!response.result.ok) return
          const ns = (response.result.value?.namespaces ?? []).find((entry) => entry.ns === 'novel-writing')
          setView(ns ?? null)
        }).catch(() => setNotice('读取设置失败'))
      }
      useEffect(() => { refresh() }, [])
      const change = (patch) => {
        api.settings.update({ ns: 'novel-writing', patch }).then((response) => {
          setNotice(response.result.ok ? '已保存，重启后完全生效' : ('保存失败：' + (response.result.error?.message ?? '未知')))
          refresh()
        }).catch(() => setNotice('保存失败'))
      }
      if (view === null) return el('div', { style: { padding: '16px', fontSize: '13px', opacity: 0.7 } }, t('loading'))
      const value = view.value ?? {}
      const fields = (v) => Object.entries(value.platforms ?? {}).map(([name, cfg]) => ({
        name, cfg,
      }))
      return el('div', { style: { padding: '16px', maxWidth: '760px' } },
        el('div', { style: title }, '小说写作工作流'),
        el('div', { style: { margin: '10px 0' } },
          el('label', { style: label }, '工作区根目录（留空 = ~/novels）'),
          el('input', { style: { ...input, width: '380px' }, value: value.workspaceRoot ?? '', placeholder: 'C:\\novels 或 /home/me/novels', onChange: (e) => change({ workspaceRoot: e.target.value }) }),
        ),
        el('div', { style: { margin: '10px 0' } },
          el('label', { style: label }, '工作台轮询（ms）'),
          el('input', { style: { ...input, width: '120px' }, value: value.pollMs ?? 2000, onChange: (e) => change({ pollMs: Number(e.target.value) || 2000 }) }),
        ),
        el('div', { style: { margin: '10px 0' } },
          el('label', { style: label }, 'API 允许 LAN 访问'),
          el('input', { type: 'checkbox', checked: value.apiPublic === true, onChange: (e) => change({ apiPublic: e.target.checked }) }),
          el('span', { style: hint }, '      默认仅回环（127.0.0.1）',
          ),
        ),
        el('div', { style: title }, '多平台发布配置'),
        fields(value).map(({ name, cfg }) => el('div', { key: name, style: { ...card, margin: '6px 0' } },
          el('div', { style: { fontWeight: 600, fontSize: '13px' } }, name),
          el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' } },
            el('select', { style: input, value: cfg.mode ?? 'export', onChange: (e) => change({ platforms: { [name]: { ...cfg, mode: e.target.value } } }) },
              el('option', { value: 'export' }, '导出'),
              el('option', { value: 'command' }, '导出+命令'),
              el('option', { value: 'manual' }, '仅清单')),
            el('input', { style: { ...input, flex: 1, minWidth: '240px' }, value: cfg.command ?? '', placeholder: '数据/发布命令（可选）：node publish.js --platform ' + name, onChange: (e) => change({ platforms: { [name]: { ...cfg, command: e.target.value } } }) }),
          ),
        )),
        notice !== '' ? el('div', { style: { ...hint, color: '#2e7d32', marginTop: '8px' } }, notice) : null,
        el('div', { style: { ...hint, marginTop: '12px' } },
          '发布模式：导出（dist/<平台>/ 定稿产物 + 发布清单）；命令（导出后执行 command，环境变量 DSH_NOVEL_DIR/DSH_DIST_DIR/DSH_PLATFORM）；仅清单（人工粘贴）。',
          '数据回流：平台 fetchCommand 输出 JSON 行 {date, 完读率, 追读…}，或用「小说工作台 → 数据」手动入库。'),
      )
    }

    // ── HUD：侧栏按钮 + 浮动面板 ────────────────────────────────────────
    function HudToggle() {
      const t = makeT(localeSnapshot())
      const snap = useStore()
      return el('button', {
        type: 'button',
        onClick: () => store.set({ hudOpen: !snap.hudOpen }),
        style: { border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '12px', padding: '6px 10px' },
      }, snap.hudOpen ? '✕ ' + t('closed') : '📖 ' + t('hud'))
    }

    let localeValue = 'zh'
    function localeSnapshot() { return localeValue }

    function HudPanel() {
      const t = makeT(localeValue)
      const snap = useStore()
      const poll = usePoll(() => apiJson('/novel-writing/api/overview'), 3000, [])
      if (!snap.hudOpen) return null
      const novels = poll.data !== null ? poll.data.novels ?? [] : []
      const current = novels[0]
      return el('div', { style: { position: 'fixed', right: '20px', bottom: '20px', width: '320px', zIndex: 999, background: 'rgba(24,26,32,0.96)', color: '#e8e8e8', borderRadius: '12px', padding: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.45)', fontSize: '13px' } },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
          el('strong', null, '📖 ' + t('hud')),
          el('button', { style: { border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer' }, onClick: () => store.set({ hudOpen: false }) }, '✕'),
        ),
        poll.error === 'api'
          ? el('div', null, t('apiError'))
          : current === undefined
            ? el('div', null, t('noNovels'))
            : el('div', null,
                el('div', null, `${current.title} · ${current.stage ?? '—'}`),
                el('div', { style: { opacity: 0.8 } }, `${current.totalChapters} 章 · ${current.totalWords} ${t('words')} · ${current.lastUpdated ?? '—'}`),
                el('div', { style: { opacity: 0.8 } }, `发布 ${current.releaseAllowed ? '✓' : '✗'} · 变现 ${current.monetizationAllowed ? '✓' : '✗'}`),
                el('div', { style: { marginTop: '6px', opacity: 0.7, fontSize: '12px' } }, t('openStudio')),
              ),
      )
    }

    // ── 插件入口 ────────────────────────────────────────────────────────
    const inject = ['slots', 'connection', 'locale']

    function apply(ctx) {
      const connection = ctx.get('connection')
      const localeSvc = ctx.get('locale')
      if (localeSvc !== undefined && typeof localeSvc.getSnapshot === 'function') {
        try {
          const snap = localeSvc.getSnapshot()
          if (snap !== undefined && snap.active !== undefined) localeValue = snap.active
        } catch { /* keep zh */ }
      }
      const t = makeT(localeValue)
      const base = { api: connection !== undefined ? connection.api : null }

      // 设置页
      ctx.slots.inject('settings.section', () => ctx.slots.register(
        { name: 'settings.section', id: 'novel-writing', order: 20, label: () => t('settingsTitle') },
        (props) => el(SettingsPage, { ...base, t }),
      ))

      // 会话视图：「小说」
      ctx.slots.inject('conversation.view', () => ctx.slots.register(
        { name: 'conversation.view', id: 'novel-studio', order: 15, label: () => t('title') },
        (props) => el(StudioView, { ...base, t, inputActions: props.inputActions }),
      ))

      // 侧栏动作 + HUD 浮层
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
        { name: 'sidebar.footer.action', id: 'novel-hud', order: 10, label: () => t('hud') },
        (props) => el(HudToggle),
      ))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'novel-hud-panel', order: 30, label: () => t('hud') },
        (props) => el(HudPanel),
      ))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
