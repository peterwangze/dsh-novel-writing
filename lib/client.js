/**
 * dsh-novel-writing 浏览器侧包（`./client`，dual-face 下发）。
 *
 * 界面：
 * - 「小说」视图（conversation.view id=novel-studio）：小说工作台——书目选择、
 *   章节列表、正文阅读/编辑（保存走宿主门禁）、工作流进度与门禁面板、
 *   数据录入与信号看板、发布记录、UI 请求队列；
 * - 「小说工作台」快速面板（sidebar.footer.action 侧栏入口 id=novel-hud +
 *   shell.overlay 浮层 id=novel-hud-panel）：侧栏小入口开合浮层，浮层内做书目
 *   选择 / 开始·继续工作流 / 新建即启动，经 pendingLaunch 通道注入对话；
 *   conversation.input.dock（novel-launch-dock）仅保留 pendingLaunch 瞬时兜底条，
 *   不再常驻整行工作台横幅；
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
        title: '小说工作台', hud: '小说 HUD', hudShort: '小说', settingsTitle: '小说写作',
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
        loading: '加载中…', apiError: 'API 不可用（宿主未挂载 webServer 或插件未运行）',
        gateOk: '门禁通过', gateFail: '门禁未通过', coverage: '覆盖率', drift: '偏离度',
        lightAudit: '机器审计', metrics: '指标数据', ingest: '入库',
        date: '日期', readRate: '完读率', finishRate: '读完率', retention: '追读', collections: '日增收藏', revenue: '收益',
        chapter: '章节', score: '分', noGate: '未生成看护卡（门禁未启用）',
        add: '添加', remove: '删除', saveOk: '已保存', saveFail: '保存失败',
        auto: '自动', closed: '关闭',
      },
      en: {
        title: 'Novel Studio', hud: 'Novel HUD', hudShort: 'Novel', settingsTitle: 'Novel Writing',
        noNovels: 'Workspace is empty.', noNovelsHint: 'Set workspaceRoot in Settings → Novel Writing, then start the writing-workflow preset in a novel directory.',
        picker: 'Select novel', refresh: 'Refresh', save: 'Save', forceSave: 'Force save (manual draft)',
        read: 'Read', edit: 'Edit', saving: 'Saving…', saved: 'Saved', blocked: 'Gate failed',
        chapters: 'Chapters', requests: 'Requests', publish: 'Publish', data: 'Data', workflow: 'Workflow',
        stage: 'Stage', gates: 'Gates', signals: 'Signals', noData: 'No data yet',
        platform: 'Platform', mode: 'Mode', exportOnly: 'Export', command: 'Command', manual: 'Checklist only',
        words: 'w', publishLog: 'Publish log', noPublish: 'No publishes yet',
        submitRequest: 'Submit request', requestKind: 'Kind', note: 'Note', submit: 'Submit',
        requestDone: 'Done', pending: 'Pending', done: 'Done',
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

    // ── 共享状态（模块级 store：HUD 开关 + 工作台选中小说 + 跨会话待发指令）──
    const store = {
      hudOpen: false,
      selected: null,
      pendingLaunch: null,
      chapterDirty: false,
      listeners: new Set(),
      get: () => ({ hudOpen: store.hudOpen, selected: store.selected, pendingLaunch: store.pendingLaunch, chapterDirty: store.chapterDirty }),
      set(patch) {
        if (patch.hudOpen !== undefined) store.hudOpen = patch.hudOpen
        if (patch.selected !== undefined) store.selected = patch.selected
        if (patch.pendingLaunch !== undefined) store.pendingLaunch = patch.pendingLaunch
        if (patch.chapterDirty !== undefined) store.chapterDirty = patch.chapterDirty
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
    /** 并发保护（in-flight 不叠加）、deps 变化清旧数据、出错清数据并保留 message、enabled=false 时停表。 */
    function usePoll(fn, ms, deps, enabled = true) {
      const [data, setData] = useState(null)
      const [error, setError] = useState(null)
      const inflight = useRef(false)
      const fnRef = useRef(fn)
      fnRef.current = fn
      useEffect(() => {
        if (enabled !== true) return undefined
        let alive = true
        setData(null)
        setError(null)
        const tick = async () => {
          if (inflight.current || !alive) return
          inflight.current = true
          try {
            const d = await fnRef.current()
            if (alive) { setData(d); setError(null) }
          } catch (e) {
            if (alive) { setError(e instanceof Error ? e.message : String(e)); setData(null) }
          } finally {
            inflight.current = false
          }
        }
        tick()
        const timer = window.setInterval(tick, ms)
        return () => { alive = false; window.clearInterval(timer) }
      }, [...(deps ?? []), enabled])
      return { data, error }
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
    function ChapterPanel(props) {
      const t = props.t
      const novel = props.novel
      const [mode, setMode] = useState('read')
      const [selected, setSelected] = useState(null)
      const [draft, setDraft] = useState('')
      const [baseDraft, setBaseDraft] = useState('')
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)

      // 切换书目时复位选章与编辑态，避免残留上一本书的章节号/草稿
      useEffect(() => {
        setSelected(null)
        setMode('read')
        setDraft('')
        setBaseDraft('')
        setNotice('')
      }, [props.novelId])

      // selected 入 deps：切章立即重取；响应校验章号防错序串章
      const poll = usePoll(async () => {
        const id = typeof selected === 'number' ? selected : (novel.chapters.length > 0 ? novel.chapters[0].num : null)
        if (id === null) return null
        const q = await apiJson('/novel-writing/api/chapter?novel=' + encodeURIComponent(props.novelId) + '&chapter=' + id)
        return q.num === id ? q : null
      }, Math.max(500, props.pollMs ?? 2000), [props.novelId, props.pollMs, selected])

      const chapter = poll.data !== null ? poll.data : null
      const dirty = mode === 'edit' && draft !== baseDraft

      // 脏稿状态上抛到共享 store：侧栏切书时可拦截确认（须在 early return 之前，hook 顺序恒定）
      useEffect(() => {
        store.set({ chapterDirty: dirty })
        return () => { store.set({ chapterDirty: false }) }
      }, [dirty, props.novelId])

      if (novel.chapters.length === 0) {
        return el('div', { style: hint }, '尚无章节 —— 协调者完成细纲后开始正文生成，或在对话中要求开始写作。')
      }

      const list = novel.chapters
      const active = chapter !== null ? chapter : null

      const confirmLoseDraft = () => dirty !== true || window.confirm('当前章节有未保存的修改，放弃并切换？')

      const select = (num) => {
        if (!confirmLoseDraft()) return
        setSelected(num)
        setMode('read')
        setNotice('')
      }

      const startEdit = () => {
        if (active === null) return
        setDraft(active.content ?? '')
        setBaseDraft(active.content ?? '')
        setMode('edit')
        setNotice('')
      }

      const exitEdit = () => {
        if (!confirmLoseDraft()) return
        setMode('read')
      }

      const save = (force) => {
        if (active === null || draft === '') return
        // 并发冲突检测：编辑期间服务器版本已变（协调者新写）→ 确认后才覆盖
        if (typeof active.content === 'string' && active.content !== baseDraft) {
          const overwrite = window.confirm('该章节在编辑期间已被写入新版本（当前服务器版本 ' + active.words + ' 字）。\n确定用你的修改覆盖？\n（取消后可退出编辑重新进入，载入新版本再改）')
          if (overwrite !== true) return
        }
        setBusy(true)
        setNotice('')
        apiJson('/novel-writing/api/chapter', { novel: props.novelId, chapter: active.num, content: draft, force })
          .then((r) => { setNotice(force ? `已保存（强制）· ${r.words} 字` : `已保存 · ${r.words} 字`); setBaseDraft(draft); setMode('read') })
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
              el('button', { style: btn, onClick: startEdit }, t('edit')),
            ),
            (active.gate !== null && active.gate !== undefined)
              ? el('div', { style: { ...card, padding: '8px', margin: '4px 0 8px' } },
                  el('span', null, `${t('coverage')} ${active.gate.coverage ?? '—'}% · ${t('drift')} ${active.gate.drift ?? '—'}% · `),
                  el('strong', { style: active.gate.passed ? { color: '#2e7d32' } : { color: '#c62828' } }, active.gate.passed ? t('gateOk') : t('gateFail')),
                  (active.gate.requirements ?? []).length > 0
                    ? el('span', { style: hint }, `　需求项（须体现）：${active.gate.requirements.join('、')}`)
                    : null,
                  (active.gate.conditional ?? []).length > 0
                    ? el('span', { style: hint }, `　条件项（人工复核）：${active.gate.conditional.join('、')}`)
                    : null,
                )
              : el('div', { style: hint }, t('noGate')),
            (active.audit !== null && active.audit !== undefined && (active.audit.items ?? []).length > 0)
              ? el('details', { style: { margin: '4px 0 8px', fontSize: '12px' } },
                  el('summary', { style: { cursor: 'pointer', opacity: 0.8 } }, `机器审计（${active.audit.words} 字 · ${active.audit.scenes} 场景）`),
                  el('div', { style: { margin: '4px 0 0 10px' } },
                    active.audit.items.map((i, idx) => el('div', { key: idx, style: { margin: '2px 0', color: i.level === 'ok' ? undefined : '#b26a00' } },
                      `${i.level === 'ok' ? '✓' : '⚠'} ${i.name}：${i.detail}`))),
                )
              : null,
            el('div', { style: { border: '1px solid rgba(128,128,128,0.2)', borderRadius: '8px', padding: '12px', maxHeight: '560px', overflow: 'auto' } },
              renderContent(active.content ?? '')),
          )

      const editView = active === null
        ? null
        : el('div', null,
            el('textarea', {
              value: draft,
              onChange: (e) => setDraft(e.target.value),
              onKeyDown: (e) => {
                if ((e.ctrlKey === true || e.metaKey === true) && e.key === 's') {
                  e.preventDefault()
                  if (busy !== true) save(false)
                }
              },
              style: { width: '100%', minHeight: '420px', padding: '12px', borderRadius: '8px', border: dirty ? '1px solid #b26a00' : '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit', fontSize: '14px', lineHeight: 1.9, fontFamily: 'inherit', boxSizing: 'border-box' },
            }),
            el('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' } },
              el('button', { style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' }, disabled: busy, onClick: () => save(false) }, busy ? t('saving') : t('save') + '（Ctrl+S）'),
              el('button', { style: { ...btn, color: '#b26a00' }, disabled: busy, onClick: () => save(true) }, t('forceSave')),
              el('button', { style: btn, disabled: busy, onClick: exitEdit }, t('closed')),
              dirty ? el('span', { style: { fontSize: '12px', color: '#b26a00' } }, '● 未保存' ) : null,
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
      const stages = [
        ['work_type_selection', '作品类型'], ['platform_research', '平台调研'], ['competitor_analysis', '竞品分析'],
        ['genre_selection', '题材选择'], ['novel_confirmation', '作品确认'], ['creation_planning', '创作规划'],
        ['outline_writing', '大纲生成'], ['outline_review', '大纲三审'], ['chapter_outline', '章节细纲'],
        ['chapter_outline_review', '细纲三审'], ['content_generation', '正文生成'], ['human_ai_collaboration', 'AI 合规'],
        ['quality_review', '质量审查'], ['launch_strategy', '上架发布'], ['monetization_strategy', '变现策略'],
        ['data_monitoring', '数据监控'], ['reader_interaction', '读者互动'],
        ['opening_optimization', '开篇优化（可选）'], ['novel_style_learning', '风格学习（可选）'],
      ]
      const currentStage = state.current_stage ?? null
      const known = stages.some(([id]) => id === currentStage)
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
          (currentStage !== null && known !== true
            ? el('div', { key: '_unknown', style: { fontSize: '12px', margin: '2px 0', fontWeight: 700 } }, `🔄 ${currentStage}（当前）`)
            : null),
          stages.map(([id, name]) => {
            const done = (state.completed_stages ?? []).includes(id)
            const current = currentStage === id
            return el('div', { key: id, style: { fontSize: '12px', margin: '2px 0', opacity: current ? 1 : 0.75, fontWeight: current ? 700 : 400 } },
              `${done ? '✅' : current ? '🔄' : '⬜'} ${name}${current ? '（当前）' : ''}`)
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
      const detail = props.detail
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), 完读率: '', 读完率: '', 追读: '', 日增收藏: '', 收益: '' })

      const ingest = () => {
        if (busy) return
        const rec = { date: form.date }
        for (const k of ['完读率', '读完率', '追读', '日增收藏', '收益']) {
          if (form[k] !== '') {
            const v = Number(form[k])
            if (!Number.isFinite(v) || v < 0) { setNotice(`「${k}」必须是非负数字`); return }
            rec[k] = v
          }
        }
        setBusy(true)
        setNotice('')
        apiJson('/novel-writing/api/data', { novel: novelId, records: [rec] })
          .then((r) => setNotice(`已入库 ${r.stored} 条 · 信号 ${r.signals.length} 条`))
          .catch((e) => setNotice('入库失败：' + e.message))
          .then(() => setBusy(false))
      }

      const signals = detail !== null ? detail.signals ?? [] : []
      const metrics = detail !== null ? detail.metrics ?? [] : []
      const recent = metrics.slice(-7).reverse()

      const cellStyle = { border: '1px solid rgba(128,128,128,0.3)', padding: '3px 6px', fontSize: '11px', textAlign: 'right' }
      const headStyle = { ...cellStyle, textAlign: 'left', opacity: 0.75 }

      return el('div', null,
        el('div', { style: title }, t('data')),
        signals.length > 0
          ? el('div', { style: card },
              signals.map((s, i) => el('div', { key: i, style: { fontSize: '12px', margin: '3px 0' } },
                el('strong', { style: s.severity === 'high' ? { color: '#c62828' } : { color: '#b26a00' } }, `[${s.severity}] ${s.signal} `),
                `（${s.actual} · ${s.threshold}）→ ${s.action}`)))
          : el('div', { style: hint }, '暂无信号（入库后自动检测）'),
        recent.length > 0
          ? el('div', { style: card },
              el('div', { style: { margin: '2px 0 4px', fontSize: '12px', fontWeight: 600 } }, '最近记录（新→旧，最多 7 行）'),
              el('table', { style: { borderCollapse: 'collapse', width: '100%' } },
                el('thead', null, el('tr', null,
                  ['日期', '完读率%', '读完率%', '追读%', '日增收藏', '收益'].map((h) => el('th', { key: h, style: headStyle }, h)))),
                el('tbody', null, recent.map((m, i) => el('tr', { key: i },
                  [m.date, m.完读率 ?? '—', m.读完率 ?? '—', m.追读 ?? '—', m.日增收藏 ?? '—', m.收益 ?? '—'].map((v, j) => el('td', { key: j, style: cellStyle }, String(v))))))),
            )
          : null,
        el('div', { style: card },
          el('div', { style: { margin: '2px 0' } }, `${t('metrics')}（每日一行）`),
          el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } },
            el('span', null, el('input', { style: { ...input, width: '90px' }, type: 'date', 'aria-label': '日期', value: form.date, onChange: (e) => setForm({ ...form, date: e.target.value }) })),
            el('span', null, '完读率% ', el('input', { style: input, type: 'number', inputMode: 'decimal', 'aria-label': '完读率百分比', value: form.完读率, placeholder: '10.5', onChange: (e) => setForm({ ...form, 完读率: e.target.value }) })),
            el('span', null, '读完率% ', el('input', { style: input, type: 'number', inputMode: 'decimal', 'aria-label': '读完率百分比', value: form.读完率, placeholder: '35', onChange: (e) => setForm({ ...form, 读完率: e.target.value }) })),
            el('span', null, '追读% ', el('input', { style: input, type: 'number', inputMode: 'decimal', 'aria-label': '追读百分比', value: form.追读, placeholder: '60', onChange: (e) => setForm({ ...form, 追读: e.target.value }) })),
            el('span', null, '日增收藏 ', el('input', { style: input, type: 'number', inputMode: 'numeric', 'aria-label': '日增收藏数', value: form.日增收藏, placeholder: '12', onChange: (e) => setForm({ ...form, 日增收藏: e.target.value }) })),
            el('span', null, '收益 ', el('input', { style: input, type: 'number', inputMode: 'decimal', 'aria-label': '当日收益', value: form.收益, placeholder: '120', onChange: (e) => setForm({ ...form, 收益: e.target.value }) })),
          ),
          el('div', { style: { marginTop: '8px' } },
            el('button', { style: { ...btn, background: '#1565c0', color: '#fff', border: 'none' }, disabled: busy, onClick: ingest }, busy ? '…' : t('ingest')),
            notice !== '' ? el('span', { style: { ...hint, marginLeft: '8px' } }, notice) : null,
          ),
        ),
        el('div', { style: hint }, '多平台自动化数据抓取：在本页签旁的「发布 → ⚙ 平台发布配置」里给平台配置 fetchCommand（stdout 输出 JSON 行 {date, 完读率, 追读…}），对话中说「抓取番茄数据入库」即可由协调者执行 novel_data_ingest(platform=…) 收口。'),
      )
    }

    // ── 发布面板 ────────────────────────────────────────────────────────
    function PublishPanel(props) {
      const t = props.t
      const api = props.api
      const novelId = props.novelId
      const detail = props.detail
      const platformEntries = props.platforms !== undefined && props.platforms.length > 0
        ? props.platforms
        : [{ name: '番茄小说', config: {} }, { name: '起点中文网', config: {} }, { name: '晋江文学城', config: {} }, { name: '七猫小说', config: {} }]
      const platforms = platformEntries.map((p) => p.name)
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const [platform, setPlatform] = useState(platforms[0])
      const [rescope, setRescope] = useState(false)

      const chaptersAll = detail !== null ? detail.chapters ?? [] : []
      const pending = chaptersAll.filter((c) => c.published !== true)
      const chapters = rescope ? chaptersAll : pending

      const run = (mode) => {
        if (chapters.length === 0) { setNotice(rescope ? '没有章节' : '没有未发布章节（可勾选「含已发布」重发）'); return }
        setBusy(true)
        setNotice('')
        apiJson('/novel-writing/api/publish', { novel: novelId, platform, chapters: chapters.map((c) => c.num), mode })
          .then((r) => setNotice(`发布完成：${r.chapters.length} 章 → ${r.dir}${r.commandResult !== undefined && r.commandResult !== null ? `（命令 exit ${r.commandResult.exitCode}）` : ''}`))
          .catch((e) => setNotice('发布失败：' + e.message))
          .then(() => setBusy(false))
      }

      const log = detail !== null ? detail.publishLog ?? [] : []
      return el('div', null,
        el('div', { style: title }, t('publish')),
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
          el('select', { style: input, value: platform, onChange: (e) => setPlatform(e.target.value) },
            platforms.map((p) => el('option', { key: p, value: p }, p))),
          el('label', { style: { fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' } },
            el('input', { type: 'checkbox', checked: rescope, onChange: (e) => setRescope(e.target.checked) }),
            `含已发布（${chapters.length} 章）`),
          el('button', { style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' }, disabled: busy, onClick: () => run('export') }, busy ? '…' : '导出'),
          el('button', { style: { ...btn, color: '#2e7d32' }, disabled: busy, onClick: () => run('command') }, '导出+命令'),
          el('button', { style: btn, disabled: busy, onClick: () => run('manual') }, '仅清单'),
        ),
        notice !== '' ? el('div', { style: { ...hint, color: notice.startsWith('发布失败') ? '#c62828' : '#2e7d32', marginTop: '6px' } }, notice) : null,
        el('div', { style: card },
          (log.length === 0 ? el('div', { style: hint }, t('noPublish')) : log.slice(0, 6).map((entry, i) => el('div', { key: i, style: { fontSize: '12px', margin: '2px 0' } },
            `${entry.at.slice(0, 19).replace('T', ' ')} · ${entry.platform} · ${entry.mode} · ${(entry.chapters ?? []).length} 章 · ${entry.ok ? '✓' : '✗'}`))),
        ),
        el(PlatformConfigEditor, { api, platformEntries }),
        el('div', { style: hint }, '发布前协调者会校验 release_allowed 门禁；各平台后台无公开 API，导出产物 + 发布清单 + 可配置自动化命令。'),
      )
    }

    /** 业务配置（二）：平台发布配置——就在发布页签使用现场就地编辑。 */
    function PlatformConfigEditor(props) {
      const api = props.api
      const [notice, setNotice] = useState('')
      const savePlatform = (name, cfg, patch) => {
        api.settings.update({ ns: 'novel-writing', patch: { platforms: { [name]: { ...cfg, ...patch } } } })
          .then((response) => {
            setNotice(response.result.ok === true ? `已保存 ${name} 配置` : '保存失败：' + (response.result.error?.message ?? '未知'))
          })
          .catch((e) => setNotice('保存失败：' + (e instanceof Error ? e.message : String(e))))
      }
      return el('details', { style: { ...card, margin: '8px 0' } },
        el('summary', { style: { cursor: 'pointer', fontSize: '13px', fontWeight: 600 } }, '⚙ 平台发布配置（模式 / 自动化命令 / 数据抓取）'),
        notice !== '' ? el('div', { style: { ...hint, margin: '4px 0', color: '#2e7d32' } }, notice) : null,
        props.platformEntries.map(({ name, config: cfg }) => el('div', { key: name, style: { margin: '8px 0 10px', paddingBottom: '8px', borderBottom: '1px dashed rgba(128,128,128,0.25)' } },
          el('div', { style: { fontWeight: 600, fontSize: '12px', marginBottom: '4px' } }, name),
          el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
            el('select', { style: input, value: cfg.mode ?? 'export', onChange: (e) => savePlatform(name, cfg, { mode: e.target.value }) },
              el('option', { value: 'export' }, '导出'),
              el('option', { value: 'command' }, '导出+命令'),
              el('option', { value: 'manual' }, '仅清单')),
            el('input', { key: name + '-cmd', style: { ...input, flex: 1, minWidth: '200px', fontSize: '11px' }, defaultValue: cfg.command ?? '', placeholder: '发布命令（mode=导出+命令时执行；env: DSH_DIST_DIR/DSH_PLATFORM）', onBlur: (e) => { if (e.target.value !== (cfg.command ?? '')) savePlatform(name, cfg, { command: e.target.value }) } }),
          ),
          el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' } },
            el('span', { style: { fontSize: '11px', opacity: 0.7 } }, '数据抓取'),
            el('input', { key: name + '-fetch', style: { ...input, flex: 1, minWidth: '200px', fontSize: '11px' }, defaultValue: cfg.fetchCommand ?? '', placeholder: 'fetchCommand（stdout 输出 JSON 行；对话说「抓取' + name + '数据入库」触发）', onBlur: (e) => { if (e.target.value !== (cfg.fetchCommand ?? '')) savePlatform(name, cfg, { fetchCommand: e.target.value }) } }),
          ),
        )),
        el('div', { style: hint }, '模式：导出（dist 定稿+清单）/ 导出+命令（导出后执行命令，异步+超时保护）/ 仅清单。数据抓取由协调者经 novel_data_ingest(platform=…) 执行入库。'),
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
      const pathPrefix = props.pathPrefix ?? ''
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
        const dirPath = pathPrefix === '' ? d.name : pathPrefix + '/' + d.name
        children.push(row('dir-' + dirPath, collapsed.has(dirPath) ? '▸' : '▾', d.name + '/', () => onToggle(dirPath), false, dirPath))
        if (!collapsed.has(dirPath)) {
          children.push(el(FileTreeNode, { key: 'sub-' + dirPath, node: d, depth: depth + 1, pathPrefix: dirPath, collapsed, onToggle, selected, onSelect }))
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
        el(WorkspaceRootEditor, { api: props.api, root: props.root }),
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

    /** 业务配置（一）：工作区根目录——决定书目列表本身，放在侧栏最上方。 */
    function WorkspaceRootEditor(props) {
      const [editing, setEditing] = useState(false)
      const [value, setValue] = useState('')
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const save = () => {
        if (busy) return
        setBusy(true)
        props.api.settings.update({ ns: 'novel-writing', patch: { workspaceRoot: value.trim() } })
          .then((response) => {
            if (response.result.ok === true) { setEditing(false); setNotice('') }
            else setNotice('保存失败：' + (response.result.error?.message ?? '未知'))
          })
          .catch((e) => setNotice('保存失败：' + (e instanceof Error ? e.message : String(e))))
          .then(() => setBusy(false))
      }
      return el('div', { style: { margin: '0 0 6px' } },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
          el('span', { style: { fontSize: '11px', fontWeight: 700, opacity: 0.65, letterSpacing: '0.05em' } }, '工作区'),
          el('span', { title: props.root, style: { fontSize: '11px', opacity: 0.8, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, props.root),
          editing === false
            ? el('button', { style: { ...btn, fontSize: '10px', padding: '0 5px' }, onClick: () => { setValue(''); setEditing(true) }, 'aria-label': '更改工作区根目录' }, '✎')
            : null,
        ),
        editing === true
          ? el('div', { style: { margin: '4px 0' } },
              el('input', { style: { ...input, width: '100%', boxSizing: 'border-box', fontSize: '11px' }, placeholder: '新根目录（留空 = ~/novels）', value, onChange: (e) => setValue(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') save() } }),
              el('div', { style: { display: 'flex', gap: '6px', marginTop: '4px' } },
                el('button', { style: { ...btn, fontSize: '10px', padding: '1px 6px', background: '#2e7d32', color: '#fff', border: 'none' }, disabled: busy, onClick: save }, busy ? '…' : '保存'),
                el('button', { style: { ...btn, fontSize: '10px', padding: '1px 6px' }, onClick: () => { setEditing(false); setNotice('') } }, '取消'),
                notice !== '' ? el('span', { style: { fontSize: '10px', color: '#c62828' } }, notice) : null,
              ),
            )
          : null,
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
      const [launching, setLaunching] = useState(false)
      const launchingRef = useRef(false)
      const poll = usePoll(() => apiJson('/novel-writing/api/overview'), 2000, [])
      const overview = poll.data
      const novels = overview !== null ? overview.novels ?? [] : []
      const pollMs = overview !== null && typeof overview.pollMs === 'number' ? Math.max(500, overview.pollMs) : 2000

      useEffect(() => {
        if (novels.length > 0 && (store.selected === null || !novels.some((n) => n.id === store.selected))) {
          store.set({ selected: novels[0].id })
        }
      }, [novels.length])

      const selectedId = snap.selected
      const current = novels.find((n) => n.id === selectedId)
      const detailPoll = usePoll(
        selectedId === null ? async () => null : () => apiJson('/novel-writing/api/novel?id=' + encodeURIComponent(selectedId)),
        pollMs,
        [selectedId, pollMs],
      )
      const detail = detailPoll.data

      // 「启动/继续工作流」= 按需挂载预设（不碰全局默认预设）：
      // - 会话已在 novel-writing 预设 → 直接注入；
      // - 会话还是 blank → 原位 select 切到 novel-writing 再注入（宿主仅允许 blank 切换）；
      // - 会话已开始且用其他预设 → 预设锁定；自动新开本工作区的空白会话，挂载
      //   novel-writing 预设，转场过去并自动发送启动指令（pendingLaunch 通道）。
      const sessionEntry = props.useSessions((state) => state.byId[props.sessionId] ?? null)
      const sessionPreset = sessionEntry !== null && sessionEntry !== undefined ? sessionEntry.agentPreset : undefined
      const sessionBlank = sessionEntry !== null && sessionEntry !== undefined && sessionEntry.blank === true
      const inject = (msg) => {
        props.inputActions.setDraft(msg)
        props.inputActions.submit()
        setNotice('已发送到对话（切回「对话」标签查看协调者开工）：' + msg)
      }
      const launchMsg = (id, bookTitle, forceNew) => {
        const n = novels.find((x) => x.id === id)
        const isNew = forceNew === true || (n !== undefined && (n.completedStages ?? []).length === 0 && (n.totalChapters ?? 0) === 0)
        return (isNew ? '开始小说创作工作流' : '继续小说创作工作流') + `：《${bookTitle}》（目录 ${id}）`
      }
      const launch = async (id, bookTitle, forceNew) => {
        if (launchingRef.current) return
        launchingRef.current = true
        setLaunching(true)
        try {
          const msg = launchMsg(id, bookTitle, forceNew)
          const actions = props.inputActions
          if (actions === undefined || typeof actions.setDraft !== 'function' || typeof actions.submit !== 'function') {
            setNotice('请手动发送：' + msg)
            return
          }
          if (sessionPreset === 'novel-writing') {
            inject(msg)
            return
          }
          if (sessionBlank) {
            if (props.api !== null && props.api !== undefined && props.api.agentPresets !== undefined) {
              try {
                const r = await props.api.agentPresets.select({ sessionId: props.sessionId, agentPreset: 'novel-writing' })
                if (r.result.ok === true) {
                  inject(msg)
                  setNotice('已把本会话切换到「小说写作工作流」预设并发送：' + msg)
                } else {
                  setNotice('预设切换失败：' + (r.result.error && r.result.error.message ? r.result.error.message : '未知错误'))
                }
              } catch (e) {
                setNotice('预设切换失败：' + (e instanceof Error ? e.message : String(e)))
              }
            } else {
              // 降级语义（有意差异）：此处有 inputActions，可直接 inject 发送，静态安全；
              // 与 HudPanel 在 api/agentPresets 缺失时的「明确拒绝+指引」不同——面板无
              // inputActions 无法直接注入，故拒绝而非让用户在预设未挂载时被「发送」误导。
              inject(msg)
            }
            return
          }
          // 已开始的普通会话：新开专用小说会话（按需挂载预设，不打扰当前会话）
          try {
            // 注意：useWorkspaces 是 hook，只能渲染期调用；事件回调里改用服务的非 hook 快照面
            let wsId
            try {
              const snapshot = props.workspaces.list.getSnapshot()
              const wsEntry = snapshot.items.find((w) => w.sessionIds.includes(props.sessionId))
              wsId = wsEntry !== undefined ? wsEntry.workspaceId : undefined
            } catch { wsId = undefined }
            if (wsId === undefined) {
              setNotice('未找到当前会话所属工作区，无法自动新开会话。请手动新建会话并在欢迎页选「小说写作工作流」预设，再回工作台点启动。')
              return
            }
            if (props.workspaces === null || props.workspaces === undefined || typeof props.workspaces.connectWorkspace !== 'function'
              || props.sessions === null || props.sessions === undefined || typeof props.sessions.open !== 'function') {
              setNotice('当前环境不支持自动新开会话，请手动新建会话并选「小说写作工作流」预设。')
              return
            }
            const newId = await props.workspaces.connectWorkspace(wsId)
            if (props.api !== null && props.api !== undefined && props.api.agentPresets !== undefined) {
              const r = await props.api.agentPresets.select({ sessionId: newId, agentPreset: 'novel-writing' })
              if (r.result.ok !== true) {
                setNotice('新会话已创建，但预设切换失败：' + (r.result.error && r.result.error.message ? r.result.error.message : '未知'))
                return
              }
            }
            // pendingLaunch 由 conversation.input.dock 的 novel-launch-dock（LaunchBar）消费：
            // blank 会话不渲染会话视图，但 input.dock 常驻挂载——「▶ 发送」按钮在输入框上方直达。
            store.set({ pendingLaunch: { sessionId: newId, msg, novelId: id, createdAt: Date.now() } })
            props.sessions.open(newId)
            setNotice(`已新开小说专用会话（自动挂载「小说写作工作流」预设）。新会话输入框上方会出现「发送小说启动指令」按钮，点击即开工。`)
          } catch (e) {
            setNotice('新开会话失败：' + (e instanceof Error ? e.message : String(e)) + '。可手动新建会话并在欢迎页选「小说写作工作流」预设。')
          }
        } finally {
          launchingRef.current = false
          setLaunching(false)
        }
      }

      // 跨会话待发指令：会话视图挂载（blank 结束）时若仍未发送则自动补发；
      // blank 期的可达入口是 conversation.input.dock 的 novel-launch-dock（LaunchBar）。
      const pending = snap.pendingLaunch
      useEffect(() => {
        if (pending === null || pending === undefined) return
        if (pending.sessionId !== props.sessionId) return
        if (sessionPreset !== 'novel-writing') return
        const actions = props.inputActions
        if (actions === undefined || typeof actions.setDraft !== 'function' || typeof actions.submit !== 'function') return
        store.set({ pendingLaunch: null })
        actions.setDraft(pending.msg)
        actions.submit()
      }, [pending, props.sessionId, sessionPreset])

      if (poll.error !== null) {
        return el('div', { style: { padding: '24px', fontSize: '13px', color: '#c62828' } }, t('apiError') + '（' + String(poll.error).slice(0, 120) + '）')
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
                disabled: launching || creating,
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
          sessionPreset === 'novel-writing'
            ? el('span', { style: { fontSize: '11px', color: '#2e7d32' } }, '✓ 小说预设已挂载')
            : sessionBlank
              ? el('span', { style: { fontSize: '11px', color: '#1565c0' } }, '⟳ 启动时自动切换到小说预设')
              : el('span', { style: { fontSize: '11px', color: '#b26a00' } }, '⟳ 启动时将新开小说专用会话'),
          pending !== null && pending !== undefined && pending.sessionId === props.sessionId
            ? el('button', { style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' }, onClick: () => {
                store.set({ pendingLaunch: null })
                props.inputActions.setDraft(pending.msg)
                props.inputActions.submit()
              } }, '▶ 发送启动指令')
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
                t, api: props.api, novels, selectedId, detail, root: overview !== null ? overview.root ?? '' : '',
                onSelectNovel: (id) => {
                  if (id === selectedId) return
                  if (store.get().chapterDirty === true && window.confirm('当前章节有未保存的修改，放弃并切换书目？') !== true) return
                  store.set({ selected: id })
                },
              })
            : null,
          el('div', { style: { flex: 1, minWidth: 0, overflow: 'auto', paddingLeft: showTree ? '12px' : 0 } },
            novels.length === 0
              ? el('div', { style: { padding: '16px' } },
                  el('div', { style: title }, t('noNovels')),
                  el('div', { style: hint }, t('noNovelsHint') + ' 也可以直接点上方「＋ 新建小说」。'),
                )
              : null,
            // ChapterPanel 保活（display 切换而非卸载）：切页签不丢未保存草稿
            detail !== null
              ? el('div', { style: { display: tab === 'chapters' ? 'block' : 'none' } },
                  el(ChapterPanel, { t, api: props.api, novel: detail, novelId: selectedId, pollMs: overview !== null ? overview.pollMs ?? 2000 : 2000 }))
              : null,
            tab === 'workflow' && detail !== null ? el(WorkflowPanel, { t, novel: detail }) : null,
            tab === 'data' && detail !== null ? el(DataPanel, { t, novelId: selectedId, detail }) : null,
            tab === 'publish' && detail !== null ? el(PublishPanel, { t, api: props.api, novelId: selectedId, detail, platforms: overview !== null ? overview.platforms ?? [] : [] }) : null,
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
      const [busy, setBusy] = useState(false)
      const submit = () => {
        if (busy) return
        const chapterNum = chapter.trim() === '' ? null : Number(chapter)
        if (chapterNum !== null && (!Number.isInteger(chapterNum) || chapterNum < 1)) {
          setNotice('章节号必须是正整数')
          return
        }
        setBusy(true)
        apiJson('/novel-writing/api/request', {
          novel: props.novelId, kind, chapter: chapterNum, note,
        }).then((r) => { setNotice(`已提交 ${r.id}（协调者会在下一步处理）`); setNote(''); setChapter('') })
          .catch((e) => setNotice('提交失败：' + e.message))
          .then(() => setBusy(false))
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
          el('button', { style: { ...btn, background: '#1565c0', color: '#fff', border: 'none' }, disabled: busy, onClick: submit }, busy ? '提交中…' : t('submit')),
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
      const [loadError, setLoadError] = useState(null)
      const [notice, setNotice] = useState('')
      const refresh = () => {
        setLoadError(null)
        api.settings.describe({}).then((response) => {
          if (!response.result.ok) {
            setLoadError('读取设置失败：' + (response.result.error?.message ?? '未知'))
            return
          }
          const namespaces = response.result.value?.namespaces ?? []
          const ns = namespaces.find((entry) => entry.ns === 'novel-writing')
          if (ns === undefined) {
            setLoadError('settings 中没有 novel-writing 命名空间（插件宿主行未挂载？重启 DSH 后重试）')
            return
          }
          setView(ns)
        }).catch((e) => setLoadError('读取设置失败：' + (e instanceof Error ? e.message : String(e))))
      }
      useEffect(() => { refresh() }, [])
      const change = (patch) => {
        api.settings.update({ ns: 'novel-writing', patch }).then((response) => {
          setNotice(response.result.ok ? '已保存，重启后完全生效' : ('保存失败：' + (response.result.error?.message ?? '未知')))
          refresh()
        }).catch(() => setNotice('保存失败'))
      }
      if (loadError !== null) {
        return el('div', { style: { padding: '16px', maxWidth: '760px' } },
          el('div', { style: { ...hint, color: '#c62828', margin: '8px 0' } }, loadError),
          el('button', { style: btn, onClick: refresh }, '重试'),
        )
      }
      if (view === null) return el('div', { style: { padding: '16px', fontSize: '13px', opacity: 0.7 } }, t('loading'))
      const value = view.value ?? {}
      // 本页只放「插件级」设置：与具体小说无关的插件行为开关。
      // 业务配置（工作区根目录、平台发布/数据抓取）统一在「小说工作台」：
      //   工作区根目录 → 工作台侧栏顶部；平台配置 → 工作台「发布」页签内。
      return el('div', { style: { padding: '16px', maxWidth: '760px' } },
        el('div', { style: title }, '小说写作（插件设置）'),
        el('div', { style: hint, margin: '4px 0 10px' },
          '业务相关的配置不在本页：工作区根目录在「小说」工作台侧栏顶部（✎ 编辑），各平台发布模式/命令/数据抓取在工作台「发布」页签的「⚙ 平台发布配置」。'),
        el('div', { style: { margin: '10px 0' } },
          el('label', { style: label }, '启用插件'),
          el('input', { type: 'checkbox', checked: value.enabled !== false, onChange: (e) => change({ enabled: e.target.checked }) }),
          el('span', { style: hint }, '      关闭后拒绝全部变更与 API（503）'),
        ),
        el('div', { style: { margin: '10px 0' } },
          el('label', { style: label }, '工作台轮询（ms，实时生效）'),
          el('input', { key: 'poll-' + (value.pollMs ?? 2000), style: { ...input, width: '120px' }, defaultValue: value.pollMs ?? 2000, onBlur: (e) => { const n = Number(e.target.value) || 2000; if (n !== (value.pollMs ?? 2000)) change({ pollMs: Math.max(500, n) }) } }),
          el('span', { style: hint }, '      下限 500ms'),
        ),
        el('div', { style: { margin: '10px 0' } },
          el('label', { style: label }, '预设自动同步'),
          el('input', { type: 'checkbox', checked: value.presetAutoSync !== false, onChange: (e) => change({ presetAutoSync: e.target.checked }) }),
          el('span', { style: hint }, '      升级时自动更新「小说写作工作流」预设；关闭则保留你手改的预设'),
        ),
        el('div', { style: { margin: '10px 0' } },
          el('label', { style: label }, 'API 允许 LAN 访问'),
          el('input', { type: 'checkbox', checked: value.apiPublic === true, onChange: (e) => change({ apiPublic: e.target.checked }) }),
          el('span', { style: hint }, '      ⚠ 开启后同一局域网内任何设备可无鉴权读取你的全部书稿——仅完全可信内网使用'),
        ),
        notice !== '' ? el('div', { style: { ...hint, color: '#2e7d32', marginTop: '8px' } }, notice) : null,
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
      }, snap.hudOpen ? '✕ ' + t('closed') : '📖 ' + t('hudShort'))
    }

    let localeValue = 'zh'
    function localeSnapshot() { return localeValue }

    /** 输入框上方 slot（conversation.input.dock）——本会话 pendingLaunch 瞬时兜底条。
     *  UX-002 已把常驻工作台入口从中收敛到侧栏「📖 小说」+ 浮层面板；本组件不再常驻
     *  整行工作台横幅，仅当存在本会话未发送的启动指令时渲染一条小绿条。
     *  ▶ 发送 = 清 pending + inputActions.setDraft(msg)+submit()；✕ = 清 pending；
     *  TTL（5 分钟）过期清理保留在 effect（不在渲染期写 store）。
     */
    function LaunchBar(props) {
      const snap = useStore()
      const pending = snap.pendingLaunch
      const pendingMatches = pending !== null && pending !== undefined && pending.sessionId === props.sessionId
      // TTL：5 分钟未发送自动放弃（会话可能已被用户挪作他用）。
      // 渲染期只判读、不写 store；过期清理移到 effect，避免渲染期写 store 同步唤醒全部订阅者。
      const expired = pendingMatches && typeof pending.createdAt === 'number' && Date.now() - pending.createdAt > 5 * 60 * 1000
      const showPending = pendingMatches && !expired
      useEffect(() => {
        if (expired) store.set({ pendingLaunch: null })
      }, [expired])

      if (!showPending) return null

      const send = () => {
        const actions = props.inputActions
        if (actions === undefined || typeof actions.setDraft !== 'function' || typeof actions.submit !== 'function') return
        store.set({ pendingLaunch: null })
        actions.setDraft(pending.msg)
        actions.submit()
      }
      const dismiss = () => store.set({ pendingLaunch: null })

      return el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 10px', border: '1px solid #2e7d32', borderRadius: '8px', background: 'rgba(46,125,50,0.08)', fontSize: '12px', margin: '0 auto 4px', maxWidth: '760px' } },
        el('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, '📖 小说启动指令待发送：' + pending.msg),
        el('button', { type: 'button', style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' }, onClick: send }, '▶ 发送'),
        el('button', { type: 'button', style: btn, onClick: dismiss, 'aria-label': '放弃启动指令' }, '✕'),
      )
    }

    /** shell.overlay 浮层（id novel-hud-panel）：「小说工作台」快速面板。
     *  由侧栏「📖 小说」入口开合；面板内做书目选择、开始/继续工作流、新建即启动，
     *  经 pendingLaunch 通道由 input.dock 兜底条注入（本面板无 inputActions，不自接输入框）。
     *  仅依赖 root 作用域 standardProps（useSessions）与 connection.api。
     *  launch 带 launching+launchingRef 同步重入锁（CLEAN-001 同型）；api/agentPresets
     *  不可用时明确提示并停止入队，不静默发送（避免预设未挂载却引导用户「发送」）。
     */
    function HudPanel(props) {
      const t = makeT(localeValue)
      const snap = useStore()
      const useSessions = props.useSessions
      const api = props.api
      // 关闭时停表（shell.overlay 常驻挂载，不做无谓后台轮询）
      const poll = usePoll(() => apiJson('/novel-writing/api/overview'), 3000, [], snap.hudOpen === true)
      const currentId = useSessions((s) => s.current)
      const currentSession = useSessions((s) => (typeof s.current === 'string' ? s.byId[s.current] : undefined))
      const [selectedId, setSelectedId] = useState(null)
      const [creating, setCreating] = useState(false)
      const [formName, setFormName] = useState('')
      const [formTitle, setFormTitle] = useState('')
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const [launching, setLaunching] = useState(false)
      const launchingRef = useRef(false)

      const novels = poll.data !== null ? poll.data.novels ?? [] : []

      // 书目选择默认第一本；当前选择失效（被删/改名）时回退。
      useEffect(() => {
        if (novels.length > 0 && (selectedId === null || !novels.some((n) => n.id === selectedId))) {
          setSelectedId(novels[0].id)
        }
      }, [novels, selectedId])

      if (!snap.hudOpen) return null

      const current = novels.find((n) => n.id === selectedId) ?? novels[0]
      const isNewNovel = current !== undefined && (current.completedStages ?? []).length === 0 && (current.totalChapters ?? 0) === 0
      const sessionBlank = currentSession !== undefined && currentSession !== null && currentSession.blank === true
      const sessionPreset = currentSession !== undefined && currentSession !== null ? currentSession.agentPreset : undefined

      const launchMsg = (novel, forceNew) => {
        const isNew = forceNew === true || ((novel.completedStages ?? []).length === 0 && (novel.totalChapters ?? 0) === 0)
        return (isNew ? '开始小说创作工作流' : '继续小说创作工作流') + `：《${novel.title}》（目录 ${novel.id}）`
      }
      // 启动/继续（防连点，与 StudioView/旧 LaunchBar 的 launching+launchingRef 同型）：
      // 进入即同步置锁；主体 try/finally 复位（覆盖所有 return）；reentry 在首个 await
      // 前由 launchingRef 拦截重复 selRPC 与重复写 pendingLaunch。
      const launch = async (novel, forceNew) => {
        if (launchingRef.current) return
        launchingRef.current = true
        setLaunching(true)
        try {
          if (typeof currentId !== 'string' || currentId === '') {
            setNotice('请先新建/进入一个会话')
            return
          }
          const sess = currentSession !== undefined && currentSession !== null ? currentSession : undefined
          if (sess === undefined) {
            setNotice('请先新建/进入一个会话')
            return
          }
          if (sess.blank !== true) {
            setNotice('当前会话已开始：请打开会话顶部「小说」标签，用 ▶ 开始/继续')
            return
          }
          const msg = launchMsg(novel, forceNew)
          const selectable = api !== null && api !== undefined && api.agentPresets !== undefined && typeof api.agentPresets.select === 'function'
          if (sess.agentPreset !== 'novel-writing') {
            if (!selectable) {
              // api/agentPresets 缺失：不静默入队（发送时预设未必是 novel-writing，
              // 协调者不按小说工作流路由）——明确告知并停止，避免误导用户「发送」。
              setNotice('当前环境不支持自动挂载小说预设：请手动新建会话并在欢迎页选择「小说写作工作流」预设，或直接在对话框输入指令')
              return
            }
            try {
              const r = await api.agentPresets.select({ sessionId: currentId, agentPreset: 'novel-writing' })
              if (r.result.ok !== true) {
                setNotice('预设切换失败：' + (r.result.error && r.result.error.message ? r.result.error.message : '未知错误'))
                return
              }
            } catch (e) {
              setNotice('预设切换失败：' + (e instanceof Error ? e.message : String(e)))
              return
            }
          }
          setNotice('')
          store.set({ hudOpen: false, pendingLaunch: { sessionId: currentId, msg, novelId: novel.id, createdAt: Date.now() } })
        } finally {
          launchingRef.current = false
          setLaunching(false)
        }
      }
      const createAndLaunch = () => {
        if (busy) return
        if (formName.trim() === '') { setNotice('目录名必填'); return }
        setBusy(true)
        setNotice('')
        apiJson('/novel-writing/api/novel-create', { name: formName.trim(), title: formTitle.trim() })
          .then((r) => {
            setCreating(false)
            setFormName('')
            setFormTitle('')
            launch({ id: r.id, title: r.title }, true)
          })
          .catch((e) => setNotice('创建失败：' + e.message))
          .then(() => setBusy(false))
      }
      const close = () => store.set({ hudOpen: false })

      // 信息性徽标：当前会话预设状态。
      const badge = sessionPreset === 'novel-writing'
        ? el('span', { style: { fontSize: '11px', color: '#2e7d32' } }, '✓ 小说预设')
        : sessionBlank
          ? el('span', { style: { fontSize: '11px', color: '#1565c0' } }, '⟳ 启动时切换')
          : null
      const noticeIsError = notice.startsWith('创建失败') || notice.startsWith('预设切换失败') || notice.startsWith('目录名必填') || notice.startsWith('请先') || notice.startsWith('当前会话已开始') || notice.startsWith('当前环境不支持')

      return el('div', { style: { position: 'fixed', right: '20px', bottom: '20px', width: '320px', zIndex: 999, background: 'rgba(24,26,32,0.96)', color: '#e8e8e8', borderRadius: '12px', padding: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.45)', fontSize: '13px' } },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            el('strong', null, '📖 小说工作台'),
            badge,
          ),
          el('button', { style: { border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer' }, onClick: close }, '✕'),
        ),
        poll.error !== null
          ? el('div', null, t('apiError'))
          : current === undefined
            ? el('div', null, t('noNovels'))
            : el('div', null,
                el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' } },
                  el('select', { style: { ...input, fontSize: '12px', flex: 1, minWidth: '120px' }, value: current.id, onChange: (e) => setSelectedId(e.target.value), 'aria-label': '选择小说' },
                    novels.map((n) => el('option', { key: n.id, value: n.id }, n.title))),
                ),
                el('div', null, `${current.title} · ${current.stage ?? '—'}`),
                el('div', { style: { opacity: 0.8 } }, `${current.totalChapters} 章 · ${current.totalWords} ${t('words')} · ${current.lastUpdated ?? '—'}`),
                el('div', { style: { opacity: 0.8 } }, `发布 ${current.releaseAllowed ? '✓' : '✗'} · 变现 ${current.monetizationAllowed ? '✓' : '✗'}`),
                el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' } },
                  el('button', { type: 'button', style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' }, disabled: busy || launching, onClick: () => launch(current, false) },
                    isNewNovel ? `▶ 开始《${current.title}》工作流` : `▶ 继续《${current.title}》工作流`),
                  el('button', { type: 'button', style: { ...btn, background: '#1565c0', color: '#fff', border: 'none' }, disabled: busy || launching, onClick: () => setCreating(creating ? false : true) }, '＋ 新建小说'),
                ),
                creating
                  ? el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' } },
                      el('input', { style: input, placeholder: '目录名（必填，如 fayi-xiantu）', value: formName, onChange: (e) => setFormName(e.target.value) }),
                      el('input', { style: input, placeholder: '书名（可选，默认同目录名）', value: formTitle, onChange: (e) => setFormTitle(e.target.value) }),
                      el('div', { style: { display: 'flex', gap: '6px' } },
                        el('button', { type: 'button', style: { ...btn, background: '#2e7d32', color: '#fff', border: 'none' }, disabled: busy || launching, onClick: createAndLaunch }, busy ? '…' : '创建并开始工作流'),
                        el('button', { type: 'button', style: btn, disabled: busy || launching, onClick: () => { setCreating(false); setNotice('') } }, '取消'),
                      ),
                    )
                  : null,
                notice !== '' ? el('div', { style: { ...hint, marginTop: '6px', color: noticeIsError ? '#c62828' : '#2e7d32' } }, notice) : null,
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
      const sessionsSvc = ctx.get('sessions')
      const workspacesSvc = ctx.get('workspaces')
      const base = { api: connection !== undefined ? connection.api : null }

      // 设置页
      ctx.slots.inject('settings.section', () => ctx.slots.register(
        { name: 'settings.section', id: 'novel-writing', order: 20, label: () => t('settingsTitle') },
        (props) => el(SettingsPage, { ...base, t }),
      ))

      // 会话视图：「小说」
      ctx.slots.inject('conversation.view', () => ctx.slots.register(
        { name: 'conversation.view', id: 'novel-studio', order: 15, label: () => t('title') },
        (props) => el(StudioView, {
          ...base, t,
          inputActions: props.inputActions,
          useSessions: props.useSessions, useWorkspaces: props.useWorkspaces, sessionId: props.sessionId,
          sessions: sessionsSvc, workspaces: workspacesSvc,
        }),
      ))

      // 本会话 pendingLaunch 瞬时兜底条：常驻挂载（blank/hero 与 active 都渲染），
      // 位于输入框上方，仅当存在待发送启动指令时渲染；常驻工作台入口见侧栏 + 浮层。
      ctx.slots.inject('conversation.input.dock', () => ctx.slots.register(
        { name: 'conversation.input.dock', id: 'novel-launch-dock', order: 15, label: () => t('title') },
        (props) => el(LaunchBar, {
          inputActions: props.inputActions,
          sessionId: props.sessionId,
        }),
      ))

      // 侧栏入口 + 工作台快速面板
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
        { name: 'sidebar.footer.action', id: 'novel-hud', order: 10, label: () => t('hudShort') },
        (props) => el(HudToggle),
      ))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'novel-hud-panel', order: 30, label: () => t('title') },
        (props) => el(HudPanel, { ...base, useSessions: props.useSessions }),
      ))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
