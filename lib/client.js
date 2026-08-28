/**
 * dsh-novel-writing 浏览器侧包（`./client`，dual-face 下发）。
 *
 * 界面（UX-006 / DEC-013 重构后）：
 * - 侧栏抽屉（sidebar.footer.action id=novel-drawer，order 9）：分隔线 +
 *   「📖 小说工作台」标题 + ⚙ 工作区 / ＋ 新建 小按钮 + 书目卡片列表
 *   （书名 / 阶段·章数·字数 / 绑定状态点；点击 = 打开该书进分栏，再次点击 = 关闭；
 *   🔗 绑定会话；▶ 发送开始/继续指令）；
 * - 分栏工作区（shell.overlay id=novel-split）：margin 挤法把官方对话窗挤到
 *   右侧（可 ⇄ 换边），内容区固定三栏——左窗（工作区行 + 书目 + 文件树，可折叠）
 *   ｜竖分隔线｜中窗（章节/工作流/请求/数据/发布 五页签，复用既有 Panel）；
 *   标题栏 + 两条可拖拽分隔线，宽度/换边 localStorage 持久化
 *   （dsh.novel.split.v1 = {leftW, chatW, chatSide}）；Esc/✕/再次点击抽屉卡片关闭；
 * - 小说↔会话 1:1 绑定：settings ns novel-writing 的 bindings 字段
 *   （宿主 Config z.dict；overview 附带下发）；绑定面板（shell.overlay
 *   id=novel-bind-dialog）按工作区分组列出会话（workspace.list + sessions
 *   镜像），选择后合并语义写入；
 * - 工作区对话框（shell.overlay id=novel-workspace-dialog，UX-005 保留）：
 *   入口收敛为抽屉 ⚙；
 * - 「设置 → 小说写作」（settings.section）：插件级开关。
 *
 * 已退役（DEC-013①）：conversation.view「小说」标签页、conversation.input.dock
 * 兜底条（LaunchBar）、侧栏 novel-hud 按钮 + novel-hud-panel 浮层、store 的
 * pendingLaunch/launchHint/hudOpen。指令发送全面改用
 * api.sessions.prompt({sessionId, mode:'queue', content:[{type:'text',text}]})。
 *
 * 数据面：直连宿主回环 API /novel-writing/api/*（overview/novel/chapter/request/
 * publish/data）轮询实时渲染；设置走标准 api.settings wire；会话状态经
 * ctx.sessions.list（ObservableSnapshot）订阅叶子字段镜像，零轮询。
 * 视觉：单个 <style id="novel-writing-style">，类名前缀 .nv-，颜色/边框/背景
 * 全量 var(--dsw-alias-*, 兜底值)（兜底取值对齐 dsh-worktable styles.ts）。
 */
window.__ModuleLoader__.load({
  id: 'dsh-novel-writing',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    let react = require('react')

    const el = react.createElement
    const { useState, useEffect, useRef, useMemo } = react

    let localeValue = 'zh'
    function localeSnapshot() { return localeValue }

    // ── 轻量 i18n ─────────────────────────────────────────────────────────
    const LANG = {
      zh: {
        title: '小说工作台', settingsTitle: '小说写作',
        noNovels: '小说工作区为空。',
        noNovelsHint: '点右上 ⚙ 选择/新建工作区（其路径即书目根目录），或点 ＋ 新建第一本小说。',
        refresh: '刷新', save: '保存', forceSave: '强制保存（人工改稿）',
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
        auto: '自动', closed: '关闭', notStarted: '未开始',
        // ── 工作区对话框（UX-005，入口 = 抽屉 ⚙）──
        entryLabel: '📖 小说工作台',
        dialogTitle: '选择 / 新建小说创作工作区',
        listErrorPrefix: '加载工作区列表失败：',
        retry: '重试',
        unknownErr: '未知错误',
        noWorkspace: '尚未配置小说创作工作区。',
        createSessionBtn: '在此工作区创建小说会话',
        newWorkspaceBtn: '新建工作区',
        backToList: '返回列表',
        pickFolder: '选择文件夹',
        pickFail: '选择文件夹失败：',
        pickCancel: '已取消选择文件夹（未做更改）。',
        pickedPrefix: '已选：',
        noParentHint: '未选文件夹时，「新建目录」的父目录为默认家目录。',
        subDirTitle: '在其下新建目录：',
        dirNamePlaceholder: '目录名（非空，不含 / 或 \\）',
        createDirBtn: '新建目录',
        dirNameInvalid: '目录名必须非空，且不能包含 / 或 \\。',
        createDirFail: '新建目录失败：',
        homeParentBroken: '无法确定默认目录：请先用「选择文件夹」选择父目录。',
        adoptBtn: '创建并采用',
        adoptPrefix: '采用失败：',
        sessionCount: (n) => n + ' 个会话',
        hasSessionsHint: (n) => `该工作区已有 ${n} 个会话；确认将新建一个小说会话。`,
        sessionCreatePrefix: '创建会话失败：',
        presetFailPrefix: '会话已创建，但「小说写作工作流」预设挂载失败：',
        presetFailHint: '请打开该会话手动选择预设后，再发送启动指令。',
        syncFailPrefix: '工作区目录同步失败：',
        syncFailSuffix: '（不影响本次会话）',
        promptFailPrefix: '会话已就绪，但启动指令发送失败：',
        promptFailHint: '请打开该会话手动发送启动指令。',
        doneTitle: '✅ 已在工作区创建小说会话',
        doneMsg: (title) => `已在工作区《${title}》创建小说会话并挂载「小说写作工作流」预设（启动指令已发送）。会话已打开——点侧栏抽屉「📖 小说工作台」里的书目卡片可进入分栏工作台。`,
        doneClose: '知道了',
        // ── 抽屉（UX-006）──
        wsBtn: '选择 / 新建工作区', newBtn: '新建小说',
        bindBtn: '绑定会话', launchBtn: '发送开始/继续工作流指令',
        unbound: '未绑定', stale: '会话失效',
        dirtyConfirm: '当前章节有未保存的修改，放弃并切换？',
        dirtyCloseConfirm: '当前章节有未保存的修改，关闭工作台将丢失，确定？',
        nameRequired: '目录名必填',
        dirPlaceholder: '目录名（必填，如 fayi-xiantu）',
        bookPlaceholder: '书名（可选，默认同目录名）',
        createGo: '创建并开始',
        createFailPrefix: '创建失败：',
        bindFailPrefix: '绑定失败：',
        bindLoadFailPrefix: '加载会话列表失败：',
        bindTitle: (book) => `🔗 绑定会话：《${book}》`,
        bindPick: '为本书选择一个会话（1:1 绑定；点击即绑定并打开）：',
        bindNew: '新建会话并绑定',
        bindNone: '暂无会话',
        bindOther: '其他（未入工作区）',
        bindStaleHint: '该书绑定的会话已不存在，请重新绑定。',
        noBindYet: '本书尚未绑定会话，请先在绑定面板选择或新建。',
        openFailHint: '未找到当前会话视图，暂未开启分栏；已切换到绑定会话，可稍后重试打开。',
        sessionsMissing: '会话服务不可用：状态点已隐藏，打开/绑定功能暂不可用（重启 DSH 后重试）。',
        launchSentPrefix: '已发送指令：',
        collapseLeft: '折叠左栏', expandLeft: '展开左栏',
        flipChat: '对话窗换边（左/右）', closeSplit: '关闭分栏（Esc）',
      },
      en: {
        title: 'Novel Studio', settingsTitle: 'Novel Writing',
        noNovels: 'Workspace is empty.',
        noNovelsHint: 'Use ⚙ above to choose/create a workspace (its path becomes the novels root), or ＋ to create your first novel.',
        refresh: 'Refresh', save: 'Save', forceSave: 'Force save (manual draft)',
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
        auto: 'Auto', closed: 'Close', notStarted: 'not started',
        // ── Workspace dialog (UX-005; entry = drawer ⚙) ──
        entryLabel: '📖 Novel Workspace',
        dialogTitle: 'Choose / Create Novel Writing Workspace',
        listErrorPrefix: 'Failed to load workspaces: ',
        retry: 'Retry',
        unknownErr: 'Unknown error',
        noWorkspace: 'No novel writing workspace configured yet.',
        createSessionBtn: 'Create novel session in this workspace',
        newWorkspaceBtn: 'New workspace',
        backToList: 'Back to list',
        pickFolder: 'Choose folder…',
        pickFail: 'Folder picking failed: ',
        pickCancel: 'Folder picking cancelled (no change).',
        pickedPrefix: 'Picked: ',
        noParentHint: 'When no folder is picked, "Create directory" targets the home folder.',
        subDirTitle: 'Or create a directory under it:',
        dirNamePlaceholder: 'Directory name (non-empty, no / or \\)',
        createDirBtn: 'Create directory',
        dirNameInvalid: 'Directory name must be non-empty and contain no / or \\.',
        createDirFail: 'Create directory failed: ',
        homeParentBroken: 'Cannot determine the default directory: pick a parent folder first.',
        adoptBtn: 'Create & adopt',
        adoptPrefix: 'Adopt failed: ',
        sessionCount: (n) => n + ' sessions',
        hasSessionsHint: (n) => `This workspace already has ${n} sessions; confirming will create a new novel session.`,
        sessionCreatePrefix: 'Create session failed: ',
        presetFailPrefix: 'Session created, but mounting the "Novel Writing Workflow" preset failed: ',
        presetFailHint: 'Mount that preset inside the session, then send the start instruction.',
        syncFailPrefix: 'Workspace directory sync failed: ',
        syncFailSuffix: ' (does not affect this session)',
        promptFailPrefix: 'Session ready, but sending the start instruction failed: ',
        promptFailHint: 'Open the session and send the start instruction manually.',
        doneTitle: '✅ Novel session created',
        doneMsg: (title) => `Created a novel session in workspace "${title}" with the "Novel Writing Workflow" preset mounted (start instruction sent). The session is open — click the book card in the sidebar "📖 Novel Workspace" drawer to enter the split workbench.`,
        doneClose: 'Got it',
        // ── Drawer (UX-006) ──
        wsBtn: 'Choose / create workspace', newBtn: 'New novel',
        bindBtn: 'Bind session', launchBtn: 'Send start/continue instruction',
        unbound: 'unbound', stale: 'session gone',
        dirtyConfirm: 'The current chapter has unsaved edits. Discard and switch?',
        dirtyCloseConfirm: 'The current chapter has unsaved edits. Close the workbench and lose them?',
        nameRequired: 'Directory name required',
        dirPlaceholder: 'Directory name (required, e.g. fayi-xiantu)',
        bookPlaceholder: 'Book title (optional; defaults to directory name)',
        createGo: 'Create & start',
        createFailPrefix: 'Create failed: ',
        bindFailPrefix: 'Bind failed: ',
        bindLoadFailPrefix: 'Failed to load sessions: ',
        bindTitle: (book) => `🔗 Bind session: "${book}"`,
        bindPick: 'Pick a session for this book (1:1 binding; click binds and opens):',
        bindNew: 'Create session & bind',
        bindNone: 'No sessions',
        bindOther: 'Others (not in a workspace)',
        bindStaleHint: 'The bound session no longer exists; rebind it.',
        noBindYet: 'This book has no bound session yet — pick or create one first.',
        openFailHint: 'Conversation view not found; split layout not opened. The bound session was opened — retry later.',
        sessionsMissing: 'Sessions service unavailable: status dots hidden, open/bind disabled (restart DSH to restore).',
        launchSentPrefix: 'Instruction sent: ',
        collapseLeft: 'Collapse left pane', expandLeft: 'Expand left pane',
        flipChat: 'Flip chat side (left/right)', closeSplit: 'Close split (Esc)',
      },
    }
    function makeT(locale) {
      const dict = locale === 'en' ? LANG.en : LANG.zh
      return (key, ...args) => {
        const v = dict[key] !== undefined ? dict[key] : LANG.zh[key]
        return typeof v === 'function' ? v(...args) : v
      }
    }

    // ── 共享状态（模块级 store：工作区对话框开关 + 工作台选中小说 + 绑定面板目标 + 章节脏稿）──
    const store = {
      entryOpen: false,
      selected: null,
      bind: null,          // { novelId, stale } — 绑定面板目标（null = 关闭）
      chapterDirty: false,
      listeners: new Set(),
      get: () => ({ entryOpen: store.entryOpen, selected: store.selected, bind: store.bind ? { ...store.bind } : null, chapterDirty: store.chapterDirty }),
      set(patch) {
        if (patch.entryOpen !== undefined) store.entryOpen = patch.entryOpen
        if (patch.selected !== undefined) store.selected = patch.selected
        if (patch.bind !== undefined) store.bind = patch.bind
        if (patch.chapterDirty !== undefined) store.chapterDirty = patch.chapterDirty
        for (const fn of store.listeners) fn(store.get())
      },
      subscribe(fn) {
        store.listeners.add(fn)
        return () => store.listeners.delete(fn)
      },
    }
    function useStore() {
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
    function rpcErr(result) {
      return result !== undefined && result !== null && result.error !== undefined && result.error !== null
        && result.error.message !== undefined ? result.error.message : ''
    }
    function errOf(e) { return e instanceof Error ? e.message : String(e) }

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

    // ── 宿主设计令牌映射（UX-006④：颜色/边框/背景全量 var(--dsw-alias-*, 兜底)）──
    // 兜底值对齐 dsh-worktable styles.ts 的取值；组件结构不动，只换视觉表达。
    const TK = {
      line: 'var(--dsw-alias-border-l1,#262b36)',
      line2: 'var(--dsw-alias-border-l2,#3a4150)',
      fill: 'var(--dsw-alias-fill-l1,rgba(255,255,255,.03))',
      fillHover: 'var(--dsw-alias-fill-l1,rgba(255,255,255,.06))',
      text: 'var(--dsw-alias-label-primary,#e6e8eb)',
      text2: 'var(--dsw-alias-label-secondary,#9aa4b2)',
      text3: 'var(--dsw-alias-label-tertiary,#6e7683)',
      accent: 'var(--dsw-alias-state-accent-primary,#4f8ef7)',
      success: 'var(--dsw-alias-state-success,#3fb950)',
      danger: 'var(--dsw-alias-state-danger,#e5484d)',
      warn: 'var(--dsw-alias-state-warning,#d29922)',
      bg: 'var(--dsw-alias-bg-base,#0b0e14)',
    }
    const card = { border: '1px solid ' + TK.line, borderRadius: '8px', padding: '10px', margin: '8px 0', background: TK.fill }
    const btn = { padding: '4px 10px', borderRadius: '6px', border: '1px solid ' + TK.line, background: 'transparent', color: TK.text, cursor: 'pointer', fontSize: '12px' }
    const input = { padding: '4px 8px', borderRadius: '6px', border: '1px solid ' + TK.line, background: TK.fill, fontSize: '12px', color: TK.text }
    const label = { fontSize: '12px', color: TK.text2, minWidth: '120px', display: 'inline-block' }
    const hint = { fontSize: '12px', color: TK.text2, lineHeight: 1.6 }
    const title = { fontSize: '14px', fontWeight: 600, margin: '0 0 8px', color: TK.text }

    // ── 分栏布局引擎（模块级 store；参照 dsh-worktable 挤法精简为固定三栏）──
    // 布局模型：标题栏(30px) + 主行[左窗 leftW | 中窗(余量)]；官方对话窗 = 会话根的
    // viewArea，靠 marginLeft/marginRight + marginTop 挤到右侧（可 ⇄ 换边到左侧）。
    // 宽度与换边持久化 dsh.novel.split.v1 = {leftW, chatW, chatSide}。
    const SPLIT_PERSIST_KEY = 'dsh.novel.split.v1'
    const TITLE_BAR_H = 30
    const LEFT_MIN = 160
    const LEFT_MAX = 420
    const LEFT_DEFAULT = 240
    const CHAT_MIN = 240
    const CENTER_MIN = 420

    const clampNum = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

    function loadSplitSaved() {
      try {
        const raw = localStorage.getItem(SPLIT_PERSIST_KEY)
        if (raw === null) return null
        const s = JSON.parse(raw)
        if (s === null || typeof s !== 'object') return null
        return {
          leftW: Number.isFinite(s.leftW) ? s.leftW : null,
          chatW: Number.isFinite(s.chatW) ? s.chatW : null,
          chatSide: s.chatSide === 'left' ? 'left' : s.chatSide === 'right' ? 'right' : null,
        }
      } catch { return null }
    }
    function persistSplit(state) {
      try {
        localStorage.setItem(SPLIT_PERSIST_KEY, JSON.stringify({ leftW: state.leftW, chatW: state.chatW, chatSide: state.chatSide }))
      } catch { /* 隐私模式/序列化失败：本次不持久化 */ }
    }

    /** 找到会话根容器：data-phase 元素中排除输入框、取含子元素者；优先 phase=active；无会话返回 null。 */
    function findConversationRoot() {
      if (typeof document === 'undefined' || document === null || typeof document.querySelectorAll !== 'function') return null
      const candidates = Array.from(document.querySelectorAll('[data-phase]'))
      const ok = (node) => node.tagName !== 'TEXTAREA' && node.tagName !== 'INPUT' && node.children.length >= 2
      return candidates.find((node) => ok(node) && node.dataset.phase === 'active')
        ?? candidates.find(ok)
        ?? null
    }

    const novelSplit = {
      active: false,
      novelId: null,
      geom: null,          // {left, top, right, bottom}（会话根内容区几何）
      leftW: LEFT_DEFAULT,
      chatW: 360,
      chatSide: 'right',
      root: null,
      header: null,
      viewArea: null,
      savedMarginLeft: '',
      savedMarginRight: '',
      savedMarginTop: '',
      observer: null,
      fallback: null,
      yieldObserver: null,
      lastMarginLeft: '',
      lastMarginRight: '',
      lastMarginTop: '',
      listeners: new Set(),

      snapshot() {
        return {
          active: this.active,
          novelId: this.novelId,
          geom: this.geom === null ? null : { ...this.geom },
          leftW: this.leftW,
          chatW: this.chatW,
          chatSide: this.chatSide,
        }
      },

      /** 打开（novelId 用于反选：同一本再点 = 关闭）。找不到会话根返回 false（不动布局）。 */
      open(novelId) {
        if (this.active) {
          if (this.novelId === novelId) { this.close(); return true }
          this.close()
        }
        // 跨插件互操作：非协议引擎的关闭按钮让位 + 共享占用声明（dsh-worktable 兼容）
        try {
          if (typeof document !== 'undefined') {
            const taClose = document.querySelector('.ta_splitClose')
            if (taClose !== null) taClose.click()
          }
        } catch { /* ignore */ }
        try {
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('dsh:split-claim', { detail: { id: 'novel-writing' } }))
          }
        } catch { /* ignore */ }
        const root = findConversationRoot()
        if (root === null) return false
        const header = root.children[0]
        const viewArea = root.children[1]
        if (header === undefined || viewArea === undefined) return false
        this.novelId = novelId
        const saved = loadSplitSaved()
        this.leftW = saved !== null && saved.leftW !== null ? clampNum(saved.leftW, LEFT_MIN, LEFT_MAX) : LEFT_DEFAULT
        this.chatSide = saved !== null && saved.chatSide !== null ? saved.chatSide : 'right'
        this.root = root
        this.header = header
        this.viewArea = viewArea
        this.savedMarginLeft = viewArea.style.marginLeft
        this.savedMarginRight = viewArea.style.marginRight
        this.savedMarginTop = viewArea.style.marginTop
        this.refreshGeom()
        const g0 = this.geom
        const colW0 = g0 === null ? 0 : g0.right - g0.left
        this.chatW = saved !== null && saved.chatW !== null
          ? clampNum(saved.chatW, CHAT_MIN, Math.max(CHAT_MIN, colW0 - LEFT_MIN - CENTER_MIN))
          : Math.max(CHAT_MIN, Math.round(colW0 * 0.34))
        this.applyMargin()
        // 根尺寸变化 → 重算几何 + 重新挤
        try {
          if (typeof ResizeObserver === 'function') {
            this.observer = new ResizeObserver(() => {
              const r = this.root
              if (!(r !== null && r.isConnected && r.dataset.phase === 'active')) {
                this.syncAnchor()
                return
              }
              this.refreshGeom()
              this.applyMargin()
              this.notify()
            })
            this.observer.observe(root)
          }
        } catch { /* RO 不可用：几何只在开/锚定时计算 */ }
        // 兜底：会话根被替换/phase 变化时 RO 可能不再回调，body 级 MO 驱动重锚定
        try {
          if (typeof MutationObserver === 'function' && typeof document !== 'undefined' && document.body !== null) {
            this.fallback = new MutationObserver(() => {
              const r = this.root
              if (r !== null && r.isConnected && r.dataset.phase === 'active') return
              this.syncAnchor()
            })
            this.fallback.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase'] })
          }
        } catch { /* ignore */ }
        // 让位观察器：viewArea 的 margin 被外部改写（其他分栏引擎接管）时关闭自身
        try {
          if (typeof MutationObserver === 'function') {
            this.yieldObserver = new MutationObserver(() => {
              if (this.active !== true || this.viewArea === null) return
              if (this.viewArea.style.marginLeft !== this.lastMarginLeft
                || this.viewArea.style.marginRight !== this.lastMarginRight
                || this.viewArea.style.marginTop !== this.lastMarginTop) {
                this.close()
              }
            })
            this.yieldObserver.observe(viewArea, { attributes: true, attributeFilter: ['style'] })
          }
        } catch { /* ignore */ }
        this.active = true
        this.notify()
        return true
      },

      /** 会话根失效（切换会话）时重锚定：内容保持不关闭；无会话才关闭。 */
      syncAnchor() {
        if (this.active !== true) return
        const next = findConversationRoot()
        if (next === null) { this.close(); return }
        if (next.dataset.phase !== 'active') return // 过渡态：保持等待
        if (next === this.root) {
          this.refreshGeom()
          this.applyMargin()
          this.notify()
          return
        }
        const header = next.children[0]
        const viewArea = next.children[1]
        if (header === undefined || viewArea === undefined) { this.close(); return }
        if (this.viewArea !== null && this.viewArea.isConnected && this.viewArea !== viewArea) {
          this.viewArea.style.marginLeft = this.savedMarginLeft
          this.viewArea.style.marginRight = this.savedMarginRight
          this.viewArea.style.marginTop = this.savedMarginTop
        }
        this.root = next
        this.header = header
        this.viewArea = viewArea
        this.savedMarginLeft = viewArea.style.marginLeft
        this.savedMarginRight = viewArea.style.marginRight
        this.savedMarginTop = viewArea.style.marginTop
        try { if (this.observer !== null) { this.observer.disconnect(); this.observer.observe(next) } } catch { /* ignore */ }
        this.refreshGeom()
        this.applyMargin()
        this.notify()
      },

      refreshGeom() {
        const root = this.root
        const header = this.header
        if (root === null || header === null) return
        const rr = root.getBoundingClientRect()
        const hr = header.getBoundingClientRect()
        this.geom = { left: rr.left, top: hr.bottom, right: rr.right, bottom: rr.bottom }
      },

      /** 挤法：chatSide='right' → marginLeft=内容区宽（对话窗贴右）；'left' → 反之；marginTop=标题栏高。 */
      applyMargin() {
        const viewArea = this.viewArea
        const g = this.geom
        if (viewArea === null || g === null) return
        const colW = g.right - g.left
        this.chatW = clampNum(this.chatW, CHAT_MIN, Math.max(CHAT_MIN, colW - LEFT_MIN - CENTER_MIN))
        const contentW = Math.max(0, colW - this.chatW)
        this.lastMarginLeft = this.chatSide === 'left' ? '' : contentW + 'px'
        this.lastMarginRight = this.chatSide === 'left' ? contentW + 'px' : ''
        this.lastMarginTop = TITLE_BAR_H + 'px'
        viewArea.style.marginLeft = this.lastMarginLeft
        viewArea.style.marginRight = this.lastMarginRight
        viewArea.style.marginTop = this.lastMarginTop
      },

      /** 内容区左缘（渲染几何与左分隔线拖拽基准）。 */
      contentLeft() {
        const g = this.geom
        if (g === null) return 0
        return this.chatSide === 'left' ? g.left + this.chatW : g.left
      },

      setLeftW(w) {
        this.leftW = clampNum(Math.round(w), LEFT_MIN, LEFT_MAX)
        this.persist()
        this.notify()
      },

      setChatW(w) {
        const g = this.geom
        if (g === null) return
        const colW = g.right - g.left
        this.chatW = clampNum(Math.round(w), CHAT_MIN, Math.max(CHAT_MIN, colW - LEFT_MIN - CENTER_MIN))
        this.applyMargin()
        this.persist()
        this.notify()
      },

      setChatSide(side) {
        this.chatSide = side === 'left' ? 'left' : 'right'
        this.applyMargin()
        this.persist()
        this.notify()
      },

      /** 工作台内切换书目（浏览）：只换标题/反选标识，不动布局。 */
      setBook(novelId) {
        if (this.novelId === novelId) return
        this.novelId = novelId
        this.notify()
      },

      persist() { persistSplit(this) },

      close() {
        if (this.viewArea !== null) {
          this.viewArea.style.marginLeft = this.savedMarginLeft
          this.viewArea.style.marginRight = this.savedMarginRight
          this.viewArea.style.marginTop = this.savedMarginTop
        }
        try { if (this.observer !== null) this.observer.disconnect() } catch { /* ignore */ }
        this.observer = null
        try { if (this.fallback !== null) this.fallback.disconnect() } catch { /* ignore */ }
        this.fallback = null
        try { if (this.yieldObserver !== null) this.yieldObserver.disconnect() } catch { /* ignore */ }
        this.yieldObserver = null
        this.root = null
        this.header = null
        this.viewArea = null
        this.geom = null
        this.novelId = null
        this.active = false
        this.notify()
      },

      subscribe(fn) {
        this.listeners.add(fn)
        return () => this.listeners.delete(fn)
      },
      notify() {
        for (const fn of this.listeners) fn()
      },
    }

    function useSplitSnap() {
      const [snap, setSnap] = useState(() => novelSplit.snapshot())
      useEffect(() => novelSplit.subscribe(() => setSnap(novelSplit.snapshot())), [])
      return snap
    }

    /** 关闭工作台（带章节脏稿守卫）：Esc / ✕ / 抽屉反选共用。 */
    function closeWorkbench(t) {
      if (store.get().chapterDirty === true) {
        try {
          if (typeof window !== 'undefined' && typeof window.confirm === 'function'
            && window.confirm(t !== undefined ? t('dirtyCloseConfirm') : '当前章节有未保存的修改，关闭工作台将丢失，确定？') !== true) return
        } catch { /* confirm 不可用：继续关闭 */ }
      }
      novelSplit.close()
    }

    // ── 会话状态镜像（零轮询：sessions.list ObservableSnapshot 订阅叶子字段）──
    /** 由 ctx.sessions 服务派生 selector hook；服务缺席返回 null（降级：无状态点、绑定/打开禁用）。 */
    function makeSessionsHook(svc) {
      if (svc === null || svc === undefined) return null
      const listStore = svc.list
      if (listStore === null || listStore === undefined
        || typeof listStore.getSnapshot !== 'function' || typeof listStore.subscribe !== 'function') return null
      return function useSessionsSel(selector) {
        const [value, setValue] = useState(() => {
          try { return selector(listStore.getSnapshot()) } catch { return undefined }
        })
        const selRef = useRef(selector)
        selRef.current = selector
        useEffect(() => {
          const read = () => {
            try { setValue(selRef.current(listStore.getSnapshot())) } catch { /* keep */ }
          }
          read()
          return listStore.subscribe(read)
        }, [])
        return value
      }
    }

    /** 会话条目 → 状态点四态（待决 > 完成 > 工作中 > 空闲）；entry 缺席 = stale（会话失效）。 */
    function statusOfEntry(entry) {
      if (entry === null || entry === undefined) return 'stale'
      if (entry.pendingInteraction !== undefined && entry.pendingInteraction !== null) return 'need'
      if (entry.completed === true) return 'done'
      if (entry.running === true) return 'busy'
      return 'idle'
    }

    function BindDot(props) {
      const st = props.st ?? 'none'
      return el('span', { className: 'nv-dot', 'data-st': st, title: props.title ?? '', style: { display: 'inline-block' } })
    }

    // ── 启动指令文案（沿用 launchMsg 逻辑：新书「开始」/旧书「继续」）────────
    function launchMsgOf(novels, id, bookTitle, forceNew) {
      const n = novels.find((x) => x.id === id)
      const isNew = forceNew === true || (n !== undefined && (n.completedStages ?? []).length === 0 && (n.totalChapters ?? 0) === 0)
      return (isNew ? '开始小说创作工作流' : '继续小说创作工作流') + `：《${bookTitle}》（目录 ${id}）`
    }

    /** 启动指令固定文案（工作区对话框 UX-005 链使用——不对已有项目做探测）。 */
    const START_MSG = '开始小说创作工作流'

    // ── 动作控制器（模块级；apply 时注入 api / sessions 服务）──────────────
    const launcher = {
      api: null,
      sessions: null,
      seq: 0,
      setup(opts) {
        launcher.api = opts.api
        launcher.sessions = opts.sessions
      },
      apiHas(domain, method) {
        return launcher.api !== null && launcher.api !== undefined && launcher.api[domain] !== undefined
          && typeof launcher.api[domain][method] === 'function'
      },
      /** sessions.open（服务面）；服务缺席返回 false。 */
      open(sessionId) {
        const s = launcher.sessions
        if (s === null || s === undefined || typeof s.open !== 'function') return false
        try { s.open(sessionId); return true } catch { return false }
      },
      /** 绑定写入：先读现值（overview.bindings）再合并——不整表覆盖。
       *  N4：读-合并-写非原子——毫秒级间隙内另一绑定写入会丢对方刚写的键（last-write-wins
       *  整表覆盖）。已知可接受取舍：单用户同时绑多本书的概率极低，且回环单连接顺序化；
       *  后续若需强一致，走宿主原子 patch（settings 增 merge 语义或专用 API），客户端仅发增量。 */
      async bindSession(novelId, sessionId) {
        if (!(launcher.apiHas('settings', 'update'))) return { ok: false, error: 'api' }
        try {
          const fresh = await apiJson('/novel-writing/api/overview')
          const cur = fresh !== null && typeof fresh === 'object' && fresh.bindings !== null && typeof fresh.bindings === 'object' ? fresh.bindings : {}
          const r = await launcher.api.settings.update({ ns: 'novel-writing', patch: { bindings: { ...cur, [novelId]: sessionId } } })
          if (r.result.ok !== true) return { ok: false, error: rpcErr(r.result) }
          return { ok: true }
        } catch (e) {
          return { ok: false, error: errOf(e) }
        }
      },
      /** 向绑定会话发送开始/继续指令（queue 模式）。 */
      async promptLaunch(sessionId, novel, novels) {
        if (!(launcher.apiHas('sessions', 'prompt'))) return { ok: false, error: 'api', msg: null }
        const msg = launchMsgOf(novels, novel.id, novel.title)
        try {
          const r = await launcher.api.sessions.prompt({ sessionId: sessionId, mode: 'queue', content: [{ type: 'text', text: msg }] })
          if (r.result.ok !== true) return { ok: false, error: rpcErr(r.result), msg }
          return { ok: true, msg }
        } catch (e) {
          return { ok: false, error: errOf(e), msg }
        }
      },
      /** 打开分栏（挤法）：sessions.open 后会话根未就绪时短重试；失败回调 onFail（不调布局）。 */
      ensureSplit(novelId, onFail) {
        const seq = ++launcher.seq
        const attempt = (n) => {
          if (seq !== launcher.seq) return
          if (novelSplit.active && novelSplit.novelId === novelId) return
          if (novelSplit.open(novelId)) return
          if (n >= 12) {
            if (typeof onFail === 'function') onFail()
            return
          }
          try {
            if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') window.setTimeout(() => attempt(n + 1), 250)
          } catch { /* 无定时器：放弃重试 */ }
        }
        attempt(0)
      },
    }

    /** 切书守卫（chapterDirty 确认）；返回 true = 可以切换。 */
    function confirmSwitchSelect(novelId, t) {
      if (novelId === store.get().selected) return true
      if (store.get().chapterDirty === true) {
        try {
          if (typeof window !== 'undefined' && typeof window.confirm === 'function'
            && window.confirm(t !== undefined ? t('dirtyConfirm') : '当前章节有未保存的修改，放弃并切换？') !== true) return false
        } catch { /* confirm 不可用：放行 */ }
      }
      store.set({ selected: novelId })
      if (novelSplit.active) novelSplit.setBook(novelId)
      return true
    }

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
          if (p.startsWith('# ')) return el('h2', { key: pi, style: { fontSize: '15px', margin: '14px 0 6px', color: TK.text } }, renderInline(p.slice(2)))
          if (p.startsWith('## ')) return el('h3', { key: pi, style: { fontSize: '14px', margin: '12px 0 4px', color: TK.text } }, renderInline(p.slice(3)))
          return el('p', { key: pi, style: { margin: '8px 0', lineHeight: 1.9, fontSize: '14px' } }, renderInline(p))
        })
        return el('div', { key: si, style: si > 0 ? { marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed ' + TK.line } : {} }, blocks)
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

      // 脏稿状态上抛到共享 store：关闭工作台/切书时可拦截确认（须在 early return 之前，hook 顺序恒定）
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
              el('strong', { style: { color: TK.text } }, `第${active.num}章 · ${active.words} ${t('words')}`),
              active.published ? el('span', { style: hint }, '已发布') : null,
              active.forced ? el('span', { style: { ...hint, color: TK.warn } }, '强制保存') : null,
              el('button', { style: btn, onClick: startEdit }, t('edit')),
            ),
            (active.gate !== null && active.gate !== undefined)
              ? el('div', { style: { ...card, padding: '8px', margin: '4px 0 8px' } },
                  el('span', null, `${t('coverage')} ${active.gate.coverage ?? '—'}% · ${t('drift')} ${active.gate.drift ?? '—'}% · `),
                  el('strong', { style: active.gate.passed ? { color: TK.success } : { color: TK.danger } }, active.gate.passed ? t('gateOk') : t('gateFail')),
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
                  el('summary', { style: { cursor: 'pointer', color: TK.text2 } }, `机器审计（${active.audit.words} 字 · ${active.audit.scenes} 场景）`),
                  el('div', { style: { margin: '4px 0 0 10px' } },
                    active.audit.items.map((i, idx) => el('div', { key: idx, style: { margin: '2px 0', color: i.level === 'ok' ? undefined : TK.warn } },
                      `${i.level === 'ok' ? '✓' : '⚠'} ${i.name}：${i.detail}`))),
                )
              : null,
            el('div', { style: { border: '1px solid ' + TK.line, borderRadius: '8px', padding: '12px', maxHeight: '560px', overflow: 'auto' } },
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
              style: { width: '100%', minHeight: '420px', padding: '12px', borderRadius: '8px', border: dirty ? '1px solid ' + TK.warn : '1px solid ' + TK.line, background: 'transparent', color: TK.text, fontSize: '14px', lineHeight: 1.9, fontFamily: 'inherit', boxSizing: 'border-box' },
            }),
            el('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' } },
              el('button', { style: { ...btn, background: TK.success, color: '#fff', border: 'none' }, disabled: busy, onClick: () => save(false) }, busy ? t('saving') : t('save') + '（Ctrl+S）'),
              el('button', { style: { ...btn, color: TK.warn }, disabled: busy, onClick: () => save(true) }, t('forceSave')),
              el('button', { style: btn, disabled: busy, onClick: exitEdit }, t('closed')),
              dirty ? el('span', { style: { fontSize: '12px', color: TK.warn } }, '● 未保存' ) : null,
              notice !== '' ? el('span', { style: { ...hint, color: notice.startsWith('保存失败') ? TK.danger : TK.success } }, notice) : null,
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
              borderRadius: '6px', border: '1px solid ' + TK.line, background: selected === c.num || (selected === null && c.num === list[0].num) ? TK.fillHover : 'transparent',
              cursor: 'pointer', fontSize: '12px', color: TK.text,
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
          el('div', { style: { color: TK.text } }, `${t('stage')}：${state.current_stage ?? '—'}`),
          el('div', { style: hint }, `《${info.title ?? props.novelId}》 · ${info.work_type ?? '?'} · ${info.platform ?? '?'} · ${info.genre ?? '?'}`),
          el('div', { style: hint }, `${stats.total_chapters ?? 0} 章 · ${stats.total_words ?? 0} ${t('words')}`),
        ),
        el('div', { style: card },
          el('div', { style: { margin: '2px 0', color: TK.text } }, `${t('gates')}：`),
          el('div', { style: hint }, `发布 ${guardrails.release_allowed ? '✓' : '✗'} · 变现 ${guardrails.monetization_allowed ? '✓' : '✗'}`),
          el('div', { style: hint }, `AI路径 ${guardrails.latest_ai_path ?? '未评估'} · 偏离度 ${guardrails.latest_drift_score ?? '—'}`),
        ),
        el('div', { style: { ...card, maxHeight: '220px', overflow: 'auto' } },
          (currentStage !== null && known !== true
            ? el('div', { key: '_unknown', style: { fontSize: '12px', margin: '2px 0', fontWeight: 700, color: TK.accent } }, `🔄 ${currentStage}（当前）`)
            : null),
          stages.map(([id, name]) => {
            const done = (state.completed_stages ?? []).includes(id)
            const current = currentStage === id
            return el('div', { key: id, style: { fontSize: '12px', margin: '2px 0', color: current ? TK.text : TK.text2, fontWeight: current ? 700 : 400 } },
              `${done ? '✅' : current ? '🔄' : '⬜'} ${name}${current ? '（当前）' : ''}`)
          }),
        ),
        el('div', { style: card },
          el('div', { style: { margin: '2px 0', color: TK.text } }, `${t('requests')}：`),
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

      const cellStyle = { border: '1px solid ' + TK.line, padding: '3px 6px', fontSize: '11px', textAlign: 'right' }
      const headStyle = { ...cellStyle, textAlign: 'left', color: TK.text2 }

      return el('div', null,
        el('div', { style: title }, t('data')),
        signals.length > 0
          ? el('div', { style: card },
              signals.map((s, i) => el('div', { key: i, style: { fontSize: '12px', margin: '3px 0' } },
                el('strong', { style: s.severity === 'high' ? { color: TK.danger } : { color: TK.warn } }, `[${s.severity}] ${s.signal} `),
                `（${s.actual} · ${s.threshold}）→ ${s.action}`)))
          : el('div', { style: hint }, '暂无信号（入库后自动检测）'),
        recent.length > 0
          ? el('div', { style: card },
              el('div', { style: { margin: '2px 0 4px', fontSize: '12px', fontWeight: 600, color: TK.text } }, '最近记录（新→旧，最多 7 行）'),
              el('table', { style: { borderCollapse: 'collapse', width: '100%' } },
                el('thead', null, el('tr', null,
                  ['日期', '完读率%', '读完率%', '追读%', '日增收藏', '收益'].map((h) => el('th', { key: h, style: headStyle }, h)))),
                el('tbody', null, recent.map((m, i) => el('tr', { key: i },
                  [m.date, m.完读率 ?? '—', m.读完率 ?? '—', m.追读 ?? '—', m.日增收藏 ?? '—', m.收益 ?? '—'].map((v, j) => el('td', { key: j, style: cellStyle }, String(v))))))),
            )
          : null,
        el('div', { style: card },
          el('div', { style: { margin: '2px 0', color: TK.text } }, `${t('metrics')}（每日一行）`),
          el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } },
            el('span', null, el('input', { style: { ...input, width: '90px' }, type: 'date', 'aria-label': '日期', value: form.date, onChange: (e) => setForm({ ...form, date: e.target.value }) })),
            el('span', null, '完读率% ', el('input', { style: input, type: 'number', inputMode: 'decimal', 'aria-label': '完读率百分比', value: form.完读率, placeholder: '10.5', onChange: (e) => setForm({ ...form, 完读率: e.target.value }) })),
            el('span', null, '读完率% ', el('input', { style: input, type: 'number', inputMode: 'decimal', 'aria-label': '读完率百分比', value: form.读完率, placeholder: '35', onChange: (e) => setForm({ ...form, 读完率: e.target.value }) })),
            el('span', null, '追读% ', el('input', { style: input, type: 'number', inputMode: 'decimal', 'aria-label': '追读百分比', value: form.追读, placeholder: '60', onChange: (e) => setForm({ ...form, 追读: e.target.value }) })),
            el('span', null, '日增收藏 ', el('input', { style: input, type: 'number', inputMode: 'numeric', 'aria-label': '日增收藏数', value: form.日增收藏, placeholder: '12', onChange: (e) => setForm({ ...form, 日增收藏: e.target.value }) })),
            el('span', null, '收益 ', el('input', { style: input, type: 'number', inputMode: 'decimal', 'aria-label': '当日收益', value: form.收益, placeholder: '120', onChange: (e) => setForm({ ...form, 收益: e.target.value }) })),
          ),
          el('div', { style: { marginTop: '8px' } },
            el('button', { style: { ...btn, background: TK.accent, color: '#fff', border: 'none' }, disabled: busy, onClick: ingest }, busy ? '…' : t('ingest')),
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
          el('button', { style: { ...btn, background: TK.success, color: '#fff', border: 'none' }, disabled: busy, onClick: () => run('export') }, busy ? '…' : '导出'),
          el('button', { style: { ...btn, color: TK.success }, disabled: busy, onClick: () => run('command') }, '导出+命令'),
          el('button', { style: btn, disabled: busy, onClick: () => run('manual') }, '仅清单'),
        ),
        notice !== '' ? el('div', { style: { ...hint, color: notice.startsWith('发布失败') ? TK.danger : TK.success, marginTop: '6px' } }, notice) : null,
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
        el('summary', { style: { cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: TK.text } }, '⚙ 平台发布配置（模式 / 自动化命令 / 数据抓取）'),
        notice !== '' ? el('div', { style: { ...hint, margin: '4px 0', color: TK.success } }, notice) : null,
        props.platformEntries.map(({ name, config: cfg }) => el('div', { key: name, style: { margin: '8px 0 10px', paddingBottom: '8px', borderBottom: '1px dashed ' + TK.line } },
          el('div', { style: { fontWeight: 600, fontSize: '12px', marginBottom: '4px', color: TK.text } }, name),
          el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
            el('select', { style: input, value: cfg.mode ?? 'export', onChange: (e) => savePlatform(name, cfg, { mode: e.target.value }) },
              el('option', { value: 'export' }, '导出'),
              el('option', { value: 'command' }, '导出+命令'),
              el('option', { value: 'manual' }, '仅清单')),
            el('input', { key: name + '-cmd', style: { ...input, flex: 1, minWidth: '200px', fontSize: '11px' }, defaultValue: cfg.command ?? '', placeholder: '发布命令（mode=导出+命令时执行；env: DSH_DIST_DIR/DSH_PLATFORM）', onBlur: (e) => { if (e.target.value !== (cfg.command ?? '')) savePlatform(name, cfg, { command: e.target.value }) } }),
          ),
          el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' } },
            el('span', { style: { fontSize: '11px', color: TK.text2 } }, '数据抓取'),
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
          border: 'none', background: isSel ? TK.fillHover : 'transparent',
          color: TK.text, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
      return el('div', { style: { borderTop: '1px solid ' + TK.line, marginTop: '8px', paddingTop: '8px' } },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
          el('span', { style: { fontSize: '12px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TK.text } }, '📄 ' + props.path),
          el('button', { style: { ...btn, fontSize: '11px', padding: '1px 6px' }, onClick: close }, '✕'),
        ),
        state.loading ? el('div', { style: hint }, '加载中…')
          : state.error !== null ? el('div', { style: { ...hint, color: TK.danger } }, state.error)
          : state.data.tooLarge === true ? el('div', { style: hint }, `文件过大（${state.data.size}B），请用编辑器打开`)
          : /\.md$/.test(props.path)
            ? el('div', { style: { maxHeight: '300px', overflow: 'auto', fontSize: '12px', lineHeight: 1.8 } }, renderContent(state.data.content ?? ''))
            : el('pre', { style: { maxHeight: '300px', overflow: 'auto', fontSize: '11px', margin: 0, whiteSpace: 'pre-wrap' } }, state.data.content ?? ''),
      )
    }

    /** 业务配置（一）：工作区根目录——决定书目列表本身，放在工作台左窗最上方。 */
    function WorkspaceRootEditor(props) {
      const [editing, setEditing] = useState(false)
      const [value, setValue] = useState('')
      const [notice, setNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const save = () => {
        if (busy) return
        // 空守卫：宿主 API 不可用时不置忙、不发请求，直接提示。
        if (props.api === null || props.api === undefined || props.api.settings === undefined || typeof props.api.settings.update !== 'function') {
          setNotice('保存失败：API 不可用，请重启 DSH 后重试')
          return
        }
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
          el('span', { style: { fontSize: '11px', fontWeight: 700, color: TK.text3, letterSpacing: '0.05em' } }, '工作区'),
          el('span', { title: props.root, style: { fontSize: '11px', color: TK.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, props.root),
          editing === false
            ? el('button', { style: { ...btn, fontSize: '10px', padding: '0 5px' }, onClick: () => { setValue(''); setEditing(true) }, 'aria-label': '更改工作区根目录' }, '✎')
            : null,
        ),
        editing === true
          ? el('div', { style: { margin: '4px 0' } },
              el('input', { style: { ...input, width: '100%', boxSizing: 'border-box', fontSize: '11px' }, placeholder: '新根目录（留空 = ~/novels）', value, onChange: (e) => setValue(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') save() } }),
              el('div', { style: { display: 'flex', gap: '6px', marginTop: '4px' } },
                el('button', { style: { ...btn, fontSize: '10px', padding: '1px 6px', background: TK.success, color: '#fff', border: 'none' }, disabled: busy, onClick: save }, busy ? '…' : '保存'),
                el('button', { style: { ...btn, fontSize: '10px', padding: '1px 6px' }, onClick: () => { setEditing(false); setNotice('') } }, '取消'),
                notice !== '' ? el('span', { style: { fontSize: '10px', color: TK.danger } }, notice) : null,
              ),
            )
          : null,
      )
    }

    /** 左窗书目行（含绑定状态点 + 🔗 绑定入口）：点击主体 = 浏览切换（脏稿守卫）。 */
    function LeftNavBookRow(props) {
      const t = props.t
      const novel = props.novel
      const useSessions = props.useSessions
      const boundId = props.boundId
      // hook 恒定调用（boundId 判空移入 selector）：绑定写入后 boundId 从 null 变值不会改变 hook 数
      const entry = useSessions !== null
        ? useSessions((s) => (boundId !== null && boundId !== undefined ? s.byId[boundId] ?? null : null))
        : null
      const st = boundId === null || boundId === undefined ? 'none' : statusOfEntry(entry)
      return el('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: '4px', margin: '2px 0', padding: '3px 4px',
          borderRadius: '6px', border: '1px solid ' + (novel.id === props.selectedId ? TK.line2 : 'transparent'),
          background: novel.id === props.selectedId ? TK.fillHover : 'transparent',
        },
      },
        el('button', {
          onClick: () => props.onSelectNovel(novel.id),
          title: novel.title,
          style: { flex: 1, minWidth: 0, display: 'block', textAlign: 'left', padding: '2px 4px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: TK.text },
        },
          el('div', { style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (novel.id === props.selectedId ? '📖 ' : '') + novel.title),
          el('div', { style: { fontSize: '11px', color: TK.text3 } }, `${novel.stage ?? t('notStarted')} · ${novel.totalChapters}章 · ${novel.totalWords}${t('words')}${novel.requests > 0 ? ' · ⚠' + novel.requests : ''}`),
        ),
        useSessions !== null ? el(BindDot, { st, title: st === 'stale' ? t('stale') : boundId === null ? t('unbound') : '' }) : null,
        el('button', {
          onClick: () => props.onBind(novel.id),
          title: t('bindBtn'), 'aria-label': t('bindBtn'),
          style: { flex: 'none', width: '20px', height: '20px', padding: 0, border: 'none', borderRadius: '4px', background: 'transparent', color: TK.text2, cursor: 'pointer', fontSize: '11px' },
        }, '🔗'),
      )
    }

    /** 工作台左窗：工作区行 + 书目导航（状态点/绑定入口）+ 当前书目文件树。 */
    function LeftNav(props) {
      const t = props.t
      const novels = props.novels
      const selectedId = props.selectedId
      const detail = props.detail
      const [collapsed, setCollapsed] = useState(() => new Set())
      const [fileSel, setFileSel] = useState(null)
      const toggle = (name) => setCollapsed((prev) => {
        const next = new Set(prev)
        if (next.has(name)) next.delete(name)
        else next.add(name)
        return next
      })
      const tree = useMemo(() => buildTree(detail !== null ? detail.files ?? [] : []), [detail])
      const head = (text) => el('div', { style: { fontSize: '11px', fontWeight: 700, color: TK.text3, margin: '8px 0 4px', letterSpacing: '0.05em' } }, text)
      return el('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' } },
        el(WorkspaceRootEditor, { api: props.api, root: props.root }),
        head('书目（' + novels.length + '）'),
        novels.map((n) => el(LeftNavBookRow, {
          key: n.id, t, novel: n, selectedId, useSessions: props.useSessions, boundId: props.bindings !== null && props.bindings !== undefined ? props.bindings[n.id] ?? null : null,
          onSelectNovel: props.onSelectNovel, onBind: props.onBind,
        })),
        head('文件（novel-project）'),
        el(FileTreeNode, { node: tree, depth: 0, collapsed, onToggle: toggle, selected: fileSel, onSelect: setFileSel }),
        fileSel !== null ? el(FilePreview, { novelId: selectedId, path: fileSel, onClose: () => setFileSel(null) }) : null,
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
          el('button', { style: { ...btn, background: TK.accent, color: '#fff', border: 'none' }, disabled: busy, onClick: submit }, busy ? '提交中…' : t('submit')),
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
          el('div', { style: { ...hint, color: TK.danger, margin: '8px 0' } }, loadError),
          el('button', { style: btn, onClick: refresh }, '重试'),
        )
      }
      if (view === null) return el('div', { style: { padding: '16px', fontSize: '13px', color: TK.text2 } }, t('loading'))
      const value = view.value ?? {}
      // 本页只放「插件级」设置：与具体小说无关的插件行为开关。
      // 业务配置（工作区根目录、平台发布/数据抓取、小说↔会话绑定）统一在「小说工作台」：
      //   工作区根目录 → 工作台左窗顶部；平台配置 → 工作台「发布」页签；绑定 → 抽屉/左窗 🔗。
      return el('div', { style: { padding: '16px', maxWidth: '760px' } },
        el('div', { style: title }, '小说写作（插件设置）'),
        el('div', { style: { ...hint, margin: '4px 0 10px' } },
          '业务相关的配置不在本页：工作区根目录在小说工作台左窗顶部（✎ 编辑），各平台发布模式/命令/数据抓取在工作台「发布」页签的「⚙ 平台发布配置」，小说与会话的绑定经抽屉/左窗的 🔗 管理。'),
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
        notice !== '' ? el('div', { style: { ...hint, color: TK.success, marginTop: '8px' } }, notice) : null,
      )
    }

    // ── 绑定面板（shell.overlay novel-bind-dialog）──────────────────────
    /** 按 workspace.list 分组列出会话（sessions 镜像 byId 叶子字段）；点击 = 合并写入绑定并打开。 */
    function BindDialog(props) {
      const t = makeT(localeSnapshot())
      const snap = useStore()
      const api = props.api
      const useSessions = props.useSessions
      const target = snap.bind
      const open = target !== null
      const [wsList, setWsList] = useState({ loading: true, error: null, items: [] })
      const [meta, setMeta] = useState({ loading: true, novel: null, root: '' })
      const [busy, setBusy] = useState(false)
      const [notice, setNotice] = useState({ kind: 'none', text: '' })

      // hook 恒定调用（open 判空移入渲染）：面板开合不改变 hook 数；selector 对非数组 ids 容错
      const entries = useSessions !== null
        ? (useSessions((s) => (Array.isArray(s.ids) ? s.ids : []).map((id) => s.byId[id])) ?? [])
        : []

      useEffect(() => {
        if (open !== true) return undefined
        let alive = true
        setWsList({ loading: true, error: null, items: [] })
        setMeta({ loading: true, novel: null, root: '' })
        setNotice({ kind: 'none', text: '' })
        setBusy(false)
        apiJson('/novel-writing/api/overview')
          .then((ov) => {
            if (!alive) return
            const novels = ov !== null && Array.isArray(ov.novels) ? ov.novels : []
            setMeta({ loading: false, novel: novels.find((n) => n.id === target.novelId) ?? null, root: ov !== null && typeof ov.root === 'string' ? ov.root : '' })
          })
          .catch(() => { if (alive) setMeta({ loading: false, novel: null, root: '' }) })
        if (api === null || api === undefined || api.workspace === undefined || typeof api.workspace.list !== 'function') {
          setWsList({ loading: false, error: t('apiError'), items: [] })
          return () => { alive = false }
        }
        api.workspace.list({})
          .then((r) => {
            if (!alive) return
            if (r.result.ok !== true) { setWsList({ loading: false, error: t('bindLoadFailPrefix') + rpcErr(r.result), items: [] }); return }
            setWsList({ loading: false, error: null, items: Array.isArray(r.result.value?.items) ? r.result.value.items : [] })
          })
          .catch((e) => { if (alive) setWsList({ loading: false, error: t('bindLoadFailPrefix') + errOf(e), items: [] }) })
        return () => { alive = false }
      }, [open, target !== null ? target.novelId : null])

      if (open !== true) return null

      const close = () => { if (busy !== true) store.set({ bind: null }) }
      const displayTitle = (w) => (w.title !== undefined && w.title !== '' ? w.title : (String(w.path).split(/[\\/]/).pop() || String(w.path)))

      const finishBind = async (sessionId, withLaunch) => {
        if (busy) return
        setBusy(true)
        setNotice({ kind: 'none', text: '' })
        const b = await launcher.bindSession(target.novelId, sessionId)
        if (b.ok !== true) {
          setNotice({ kind: 'error', text: t('bindFailPrefix') + (b.error === 'api' ? t('apiError') : b.error) })
          setBusy(false)
          return
        }
        // 绑定新会话且要求启动指令：预设挂载 + 继续/开始指令（失败仅提示，不回滚绑定）
        if (withLaunch === true) {
          if (launcher.apiHas('agentPresets', 'select')) {
            try {
              const r = await api.agentPresets.select({ sessionId, agentPreset: 'novel-writing' })
              if (r.result.ok !== true) throw new Error(rpcErr(r.result))
            } catch (e) {
              setNotice({ kind: 'error', text: t('presetFailPrefix') + errOf(e) + t('presetFailHint') })
              setBusy(false)
              return
            }
          }
          const novel = meta.novel !== null ? meta.novel : { id: target.novelId, title: target.novelId }
          const pl = await launcher.promptLaunch(sessionId, novel, meta.novel !== null ? [meta.novel] : [])
          if (pl.ok !== true) {
            setNotice({ kind: 'error', text: t('promptFailPrefix') + (pl.error === 'api' ? t('apiError') : pl.error) + t('promptFailHint') })
            setBusy(false)
            return
          }
        }
        store.set({ bind: null })
        if (confirmSwitchSelect(target.novelId, t) !== true) { setBusy(false); return }
        launcher.open(sessionId)
        launcher.ensureSplit(target.novelId, undefined)
        setBusy(false)
      }

      const createAndBind = async () => {
        if (busy) return
        if (meta.loading === true) return
        if (!(launcher.apiHas('sessions', 'create'))) { setNotice({ kind: 'error', text: t('apiError') }); return }
        setBusy(true)
        setNotice({ kind: 'none', text: '' })
        try {
          const cwd = meta.root !== '' ? (meta.root.replace(/[\\/]+$/, '') + '/' + target.novelId) : target.novelId
          const r1 = await api.sessions.create({ cwd })
          if (r1.result.ok !== true) { setNotice({ kind: 'error', text: t('sessionCreatePrefix') + rpcErr(r1.result) }); return }
          const sessionId = r1.result.value !== null && r1.result.value !== undefined ? r1.result.value.sessionId : undefined
          if (typeof sessionId !== 'string' || sessionId === '') { setNotice({ kind: 'error', text: t('sessionCreatePrefix') + t('unknownErr') }); return }
          await finishBind(sessionId, true)
        } catch (e) {
          setNotice({ kind: 'error', text: t('sessionCreatePrefix') + errOf(e) })
        } finally {
          setBusy(false)
        }
      }

      const pick = (sessionId) => finishBind(sessionId, false)

      const groups = []
      if (wsList.loading !== true && wsList.error === null) {
        const inWs = new Set()
        for (const w of wsList.items) {
          const ids = w.sessionIds ?? []
          for (const id of ids) inWs.add(id)
          groups.push({ title: displayTitle(w), sessions: entries.filter((e) => ids.includes(e.id)) })
        }
        const others = entries.filter((e) => !inWs.has(e.id))
        if (others.length > 0) groups.push({ title: t('bindOther'), sessions: others })
      }

      const noticeEl = notice.kind !== 'none'
        ? el('div', { style: { ...hint, margin: '8px 0 0', color: notice.kind === 'error' ? TK.danger : TK.warn } }, notice.text)
        : null

      return el('div', {
        className: 'nv-modal-backdrop',
        onClick: close,
      },
        el('div', { className: 'nv-modal', onClick: (e) => e.stopPropagation() },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
            el('strong', null, t('bindTitle', meta.novel !== null ? meta.novel.title : target.novelId)),
            el('button', { type: 'button', className: 'nv-mini', onClick: close, 'aria-label': t('closed') }, '✕'),
          ),
          target.stale === true ? el('div', { style: { ...hint, color: TK.danger, margin: '0 0 6px' } }, t('bindStaleHint')) : null,
          useSessions === null
            ? el('div', { style: { ...hint, color: TK.warn } }, t('sessionsMissing'))
            : el('div', null,
                el('div', { style: hint }, t('bindPick')),
                wsList.loading ? el('div', { style: hint }, t('loading'))
                  : wsList.error !== null ? el('div', { style: { color: TK.danger } }, wsList.error)
                  : entries.length === 0 ? el('div', { className: 'nv-empty', style: { margin: '8px 0' } }, t('bindNone'))
                  : groups.map((g, gi) => el('div', { key: 'g' + gi, style: { margin: '6px 0' } },
                      el('div', { className: 'nv-group' }, g.title),
                      g.sessions.length === 0 ? el('div', { style: { ...hint, padding: '2px 8px' } }, '—') :
                        g.sessions.map((e) => el('button', {
                          key: e.id, type: 'button', className: 'nv-srow', disabled: busy, onClick: () => pick(e.id),
                        },
                          el(BindDot, { st: statusOfEntry(e), title: '' }),
                          el('span', { className: 'nv-srow-title' }, e.displayTitle ?? e.id),
                          el('span', { className: 'nv-srow-sub' }, e.agentPreset === 'novel-writing' ? '✓ ' + e.agentPreset : (e.agentPreset ?? '')),
                        )),
                    )),
                el('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } },
                  el('button', { type: 'button', style: { ...btn, background: TK.accent, color: '#fff', border: 'none' }, disabled: busy || meta.loading === true, onClick: createAndBind }, busy ? '…' : t('bindNew')),
                ),
              ),
          noticeEl,
        ),
      )
    }

    // ── 侧栏抽屉（sidebar.footer.action novel-drawer）──────────────────
    /** 抽屉书目卡片：书名 / 阶段·章数·字数 / 绑定状态点；点击 = 打开（再次点击 = 关闭）；🔗 绑定；▶ 启动指令。 */
    function DrawerBookCard(props) {
      const t = props.t
      const novel = props.novel
      const useSessions = props.useSessions
      const boundId = props.boundId
      const degraded = props.degraded
      // hook 恒定调用（boundId 判空移入 selector）：绑定写入后 boundId 从 null 变值不会改变 hook 数
      const entry = useSessions !== null
        ? useSessions((s) => (boundId !== null && boundId !== undefined ? s.byId[boundId] ?? null : null))
        : null
      const st = boundId === null || boundId === undefined ? 'none' : statusOfEntry(entry)
      const subBits = [`${novel.stage ?? t('notStarted')} · ${novel.totalChapters}章 · ${novel.totalWords}${t('words')}`]
      if (degraded !== true) {
        if (st === 'stale') subBits.push(t('stale'))
        else if (st === 'none') subBits.push(t('unbound'))
      }
      return el('div', {
        className: 'nv-card',
        'data-on': props.active === true ? 'true' : undefined,
        role: 'button',
        tabIndex: 0,
        onClick: () => props.onOpen(novel, st),
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); props.onOpen(novel, st) } },
        style: { margin: '3px 0' },
      },
        el('div', { className: 'nv-row' },
          degraded === true ? null : el(BindDot, { st, title: st === 'stale' ? t('stale') : st === 'none' ? t('unbound') : '' }),
          el('span', { className: 'nv-card-title' }, novel.title),
          degraded === true || st === 'none' || st === 'stale' ? null : el('button', {
            type: 'button', className: 'nv-mini', title: t('launchBtn'), 'aria-label': t('launchBtn'),
            onClick: (e) => { e.stopPropagation(); props.onLaunch(novel) },
          }, '▶'),
          el('button', {
            type: 'button', className: 'nv-mini', title: t('bindBtn'), 'aria-label': t('bindBtn'),
            onClick: (e) => { e.stopPropagation(); props.onBind(novel.id) },
          }, '🔗'),
        ),
        el('div', { className: 'nv-card-sub' }, subBits.join(' · ')),
      )
    }

    /** 侧栏抽屉：分隔线 + 标题（⚙ 工作区 / ＋ 新建）+ 书目卡片列表 + 新建内联表单。 */
    function NovelDrawer(props) {
      const t = makeT(localeSnapshot())
      const wide = props.wide !== false
      const splitSnap = useSplitSnap()
      // 图标栏模式（wide=false）停表：不渲染书目，不做后台轮询
      const poll = usePoll(() => apiJson('/novel-writing/api/overview'), 2500, [], wide === true)
      const overview = poll.data
      const novels = overview !== null ? overview.novels ?? [] : []
      const bindings = overview !== null && overview.bindings !== null && typeof overview.bindings === 'object' ? overview.bindings : {}
      const degraded = props.useSessions === null || launcher.sessions === null || launcher.sessions === undefined
      const [creating, setCreating] = useState(false)
      const [name, setName] = useState('')
      const [bookTitle, setBookTitle] = useState('')
      const [busy, setBusy] = useState(false)
      const [notice, setNotice] = useState('')

      // 侧栏折叠为图标栏（wide=false）：仅渲染一个 📖 图标入口（打开工作区对话框）
      if (wide !== true) {
        return el('button', {
          type: 'button', className: 'nv-mini', title: t('wsBtn'), 'aria-label': t('entryLabel'),
          onClick: () => store.set({ entryOpen: true }),
          style: { width: 'auto', height: 'auto', padding: '6px', fontSize: '14px', margin: '2px auto', display: 'flex' },
        }, '📖')
      }

      const openBook = (novel, st) => {
        if (degraded) { setNotice(t('sessionsMissing')); return }
        if (splitSnap.active && splitSnap.novelId === novel.id) { closeWorkbench(t); return }
        if (st === 'none') { store.set({ bind: { novelId: novel.id, stale: false } }); setNotice(t('noBindYet')); return }
        if (st === 'stale') { store.set({ bind: { novelId: novel.id, stale: true } }); setNotice(t('bindStaleHint')); return }
        if (confirmSwitchSelect(novel.id, t) !== true) return
        setNotice('')
        const sid = bindings[novel.id]
        launcher.open(sid)
        launcher.ensureSplit(novel.id, () => setNotice(t('openFailHint')))
      }

      const launch = async (novel) => {
        if (degraded) { setNotice(t('sessionsMissing')); return }
        const sid = bindings[novel.id]
        if (sid === undefined || sid === null) { store.set({ bind: { novelId: novel.id, stale: false } }); setNotice(t('noBindYet')); return }
        setBusy(true)
        setNotice('')
        const r = await launcher.promptLaunch(sid, novel, novels)
        setBusy(false)
        setNotice(r.ok === true ? t('launchSentPrefix') + r.msg : t('promptFailPrefix') + (r.error === 'api' ? t('apiError') : r.error) + t('promptFailHint'))
      }

      const createNovel = async () => {
        if (busy) return
        if (name.trim() === '') { setNotice(t('nameRequired')); return }
        setBusy(true)
        setNotice('')
        try {
          const r = await apiJson('/novel-writing/api/novel-create', { name: name.trim(), title: bookTitle.trim() })
          if (!(launcher.apiHas('sessions', 'create') && launcher.apiHas('agentPresets', 'select') && launcher.apiHas('sessions', 'prompt'))
            || launcher.sessions === null || launcher.sessions === undefined) {
            setNotice(t('apiError'))
            return
          }
          const r1 = await launcher.api.sessions.create({ cwd: r.path })
          if (r1.result.ok !== true) { setNotice(t('sessionCreatePrefix') + rpcErr(r1.result)); return }
          const sessionId = r1.result.value !== null && r1.result.value !== undefined ? r1.result.value.sessionId : undefined
          if (typeof sessionId !== 'string' || sessionId === '') { setNotice(t('sessionCreatePrefix') + t('unknownErr')); return }
          try {
            const r2 = await launcher.api.agentPresets.select({ sessionId, agentPreset: 'novel-writing' })
            if (r2.result.ok !== true) throw new Error(rpcErr(r2.result))
          } catch (e) {
            setNotice(t('presetFailPrefix') + errOf(e) + t('presetFailHint'))
            return
          }
          // 绑定写入（合并语义）：失败非阻断——会话已建，卡片 🔗 可重试
          const b = await launcher.bindSession(r.id, sessionId)
          if (b.ok !== true) setNotice(t('bindFailPrefix') + (b.error === 'api' ? t('apiError') : b.error))
          store.set({ selected: r.id })
          launcher.open(sessionId)
          launcher.ensureSplit(r.id, () => setNotice(t('openFailHint')))
          try {
            const r4 = await launcher.api.sessions.prompt({ sessionId, mode: 'queue', content: [{ type: 'text', text: launchMsgOf(novels, r.id, r.title, true) }] })
            if (r4.result.ok !== true) throw new Error(rpcErr(r4.result))
          } catch (e) {
            setNotice(t('promptFailPrefix') + errOf(e) + t('promptFailHint'))
            return
          }
          setCreating(false)
          setName('')
          setBookTitle('')
        } catch (e) {
          setNotice(t('createFailPrefix') + errOf(e))
        } finally {
          setBusy(false)
        }
      }

      return el('div', { className: 'nv-drawer' },
        el('div', { className: 'nv-sep' }),
        el('div', { className: 'nv-drawer-head' },
          el('span', { className: 'nv-drawer-title' }, t('entryLabel')),
          el('button', { type: 'button', className: 'nv-mini', title: t('wsBtn'), 'aria-label': t('wsBtn'), onClick: () => store.set({ entryOpen: true }) }, '⚙'),
          el('button', { type: 'button', className: 'nv-mini', title: t('newBtn'), 'aria-label': t('newBtn'), onClick: () => setCreating(creating ? false : true) }, '＋'),
        ),
        creating === true
          ? el('div', { style: { ...card, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', margin: '4px 0' } },
              el('input', { style: { ...input, width: '120px' }, placeholder: t('dirPlaceholder'), value: name, disabled: busy, onChange: (e) => setName(e.target.value) }),
              el('input', { style: { ...input, width: '120px' }, placeholder: t('bookPlaceholder'), value: bookTitle, disabled: busy, onChange: (e) => setBookTitle(e.target.value) }),
              el('button', { type: 'button', style: { ...btn, background: TK.success, color: '#fff', border: 'none' }, disabled: busy, onClick: createNovel }, busy ? '…' : t('createGo')),
              el('button', { type: 'button', style: btn, disabled: busy, onClick: () => { setCreating(false); setNotice('') } }, t('closed')),
            )
          : null,
        poll.error !== null
          ? el('div', { style: { ...hint, color: TK.danger } }, t('apiError'))
          : novels.length === 0 && creating !== true
            ? el('div', { className: 'nv-empty' }, t('noNovels') + ' ' + t('noNovelsHint'))
            : null,
        novels.map((n) => el(DrawerBookCard, {
          key: n.id, t, novel: n, active: splitSnap.active && splitSnap.novelId === n.id,
          boundId: bindings[n.id] ?? null, useSessions: props.useSessions, degraded,
          onOpen: openBook, onLaunch: launch, onBind: (id) => { if (degraded) { setNotice(t('sessionsMissing')); return } store.set({ bind: { novelId: id, stale: false } }) },
        })),
        notice !== '' ? el('div', { style: { ...hint, color: TK.text2, margin: '4px 0 0' } }, notice) : null,
      )
    }

    // ── 分栏工作区浮层（shell.overlay novel-split）──────────────────────
    /** 竖分隔线拖拽（左窗宽）。 */
    function leftDividerHandler(e) {
      e.preventDefault()
      const target = e.currentTarget
      try { target.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      const onMove = (ev) => {
        if (novelSplit.geom === null) return
        novelSplit.setLeftW(ev.clientX - novelSplit.contentLeft())
      }
      const onUp = () => {
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
        target.removeEventListener('pointercancel', onUp)
      }
      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
      target.addEventListener('pointercancel', onUp)
    }

    /** 对话窗宽分隔线拖拽（chatSide 感知方向）。 */
    function chatDividerHandler(e) {
      e.preventDefault()
      const target = e.currentTarget
      try { target.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      const onMove = (ev) => {
        const g = novelSplit.geom
        if (g === null) return
        novelSplit.setChatW(novelSplit.chatSide === 'left' ? (ev.clientX - g.left) : (g.right - ev.clientX))
      }
      const onUp = () => {
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
        target.removeEventListener('pointercancel', onUp)
      }
      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
      target.addEventListener('pointercancel', onUp)
    }

    /**
     * 分栏工作区（UX-006）：active 时输出 fixed 容器（zIndex 900，低于对话框层
     * 1000）；几何 = 会话根内容区（左/顶 到 右/底−对话宽）。容器内：标题栏
     * （📖 书名 · 阶段徽标 · 状态点 · ⇄ 换边 · ✕）+ 主行 [左窗 | 竖分隔线 | 中窗]。
     */
    function SplitWorkspace(props) {
      const t = makeT(localeSnapshot())
      const snap = useSplitSnap()
      const appSnap = useStore()
      const [tab, setTab] = useState('chapters')
      const [collapsedLeft, setCollapsedLeft] = useState(false)
      const poll = usePoll(() => apiJson('/novel-writing/api/overview'), 2000, [], snap.active)
      const overview = poll.data
      const novels = overview !== null ? overview.novels ?? [] : []
      const bindings = overview !== null && overview.bindings !== null && typeof overview.bindings === 'object' ? overview.bindings : {}
      const pollMs = overview !== null && typeof overview.pollMs === 'number' ? Math.max(500, overview.pollMs) : 2000

      useEffect(() => {
        if (novels.length > 0 && (store.selected === null || !novels.some((n) => n.id === store.selected))) {
          store.set({ selected: novels[0].id })
        }
      }, [novels.length])

      const selectedId = appSnap.selected
      const current = novels.find((n) => n.id === selectedId)
      const detailPoll = usePoll(
        selectedId === null || snap.active !== true ? async () => null : () => apiJson('/novel-writing/api/novel?id=' + encodeURIComponent(selectedId)),
        pollMs,
        [selectedId, pollMs],
        snap.active,
      )
      const detail = detailPoll.data

      // Esc 全局关闭（仅 active 时挂监听）
      useEffect(() => {
        if (snap.active !== true) return undefined
        const onKey = (e) => { if (e.key === 'Escape') closeWorkbench(t) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [snap.active])

      if (snap.active !== true) return null
      if (poll.error !== null) {
        return el('div', { className: 'nv-split', style: { left: (snap.geom !== null ? snap.geom.left : 0) + 'px', top: (snap.geom !== null ? snap.geom.top : 0) + 'px', width: '420px', height: '160px', padding: '12px', fontSize: '13px', color: TK.danger } }, t('apiError'))
      }

      const g = snap.geom !== null ? snap.geom : { left: 0, top: 0, right: 0, bottom: 0 }
      const colW = g.right - g.left
      const chatW = Math.max(CHAT_MIN, Math.min(snap.chatW, Math.max(CHAT_MIN, colW - LEFT_MIN - CENTER_MIN)))
      const contentW = Math.max(0, colW - chatW)
      const x = snap.chatSide === 'left' ? g.left + chatW : g.left
      const leftW = clampNum(snap.leftW, LEFT_MIN, LEFT_MAX)
      const bodyH = g.bottom - g.top - TITLE_BAR_H

      const tabs = [
        ['chapters', t('chapters')], ['workflow', t('workflow')], ['data', t('data')], ['publish', t('publish')], ['requests', t('requests')],
      ]

      const boundId = current !== undefined ? bindings[current.id] ?? null : null

      return el('div', null,
        el('div', {
          className: 'nv-split',
          style: { left: x + 'px', top: g.top + 'px', width: contentW + 'px', height: (g.bottom - g.top) + 'px' },
        },
          el('div', { className: 'nv-bar' },
            el('button', {
              type: 'button', className: 'nv-mini', title: collapsedLeft === true ? t('expandLeft') : t('collapseLeft'),
              onClick: () => setCollapsedLeft(collapsedLeft ? false : true),
            }, collapsedLeft === true ? '»' : '«'),
            el('span', { className: 'nv-bar-title' },
              '📖 ' + (current !== undefined ? current.title : (snap.novelId ?? '')),
              el('span', { className: 'nv-badge' }, current !== undefined ? (current.stage ?? t('notStarted')) : t('notStarted')),
              props.useSessions !== null && boundId !== null
                ? el(TitleDot, { useSessions: props.useSessions, boundId, t })
                : null,
            ),
            el('button', {
              type: 'button', className: 'nv-mini', title: t('flipChat'), 'aria-label': t('flipChat'),
              onClick: () => novelSplit.setChatSide(snap.chatSide === 'left' ? 'right' : 'left'),
            }, '⇄'),
            el('button', {
              type: 'button', className: 'nv-mini', title: t('closeSplit'), 'aria-label': t('closeSplit'),
              onClick: () => closeWorkbench(t),
            }, '✕'),
          ),
          el('div', { className: 'nv-main' },
            collapsedLeft === true ? null : el('div', { className: 'nv-left', style: { width: leftW + 'px' } },
              el(LeftNav, {
                t, api: props.api, novels, selectedId, detail, root: overview !== null ? overview.root ?? '' : '',
                bindings, useSessions: props.useSessions,
                onSelectNovel: (id) => { confirmSwitchSelect(id, t) },
                onBind: (id) => store.set({ bind: { novelId: id, stale: false } }),
              }),
            ),
            collapsedLeft === true ? null : el('div', { className: 'nv-vdiv', role: 'separator', title: t('collapseLeft'), onPointerDown: leftDividerHandler }),
            el('div', { style: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box', overflow: 'hidden' } },
              el('div', { className: 'nv-tabs' },
                tabs.map(([id, name]) => el('button', {
                  key: id, type: 'button', className: 'nv-tab', 'data-on': tab === id ? 'true' : undefined, onClick: () => setTab(id),
                }, name)),
                detail !== null && detail.signals.length > 0
                  ? el('span', { style: { fontSize: '12px', color: TK.warn, alignSelf: 'center' } }, `⚠ ${detail.signals.length}`)
                  : null,
              ),
              el('div', { style: { flex: 1, minHeight: 0, display: 'flex' } },
                el('div', { style: { flex: 1, minWidth: 0, overflow: 'auto' } },
                  novels.length === 0
                    ? el('div', { style: { padding: '16px' } },
                        el('div', { style: title }, t('noNovels')),
                        el('div', { style: hint }, t('noNovelsHint')),
                      )
                    : null,
                  // ChapterPanel 保活（display 切换而非卸载）：切页签不丢未保存草稿
                  detail !== null
                    ? el('div', { style: { display: tab === 'chapters' ? 'block' : 'none' } },
                        el(ChapterPanel, { t, api: props.api, novel: detail, novelId: selectedId, pollMs }))
                    : null,
                  tab === 'workflow' && detail !== null ? el(WorkflowPanel, { t, novel: detail }) : null,
                  tab === 'data' && detail !== null ? el(DataPanel, { t, novelId: selectedId, detail }) : null,
                  tab === 'publish' && detail !== null ? el(PublishPanel, { t, api: props.api, novelId: selectedId, detail, platforms: overview !== null ? overview.platforms ?? [] : [] }) : null,
                  tab === 'requests' && detail !== null
                    ? el(RequestPanel, { t, novelId: selectedId, requests: detail.requests ?? [] })
                    : null,
                ),
              ),
            ),
          ),
        ),
        el('div', {
          className: 'nv-chatdiv', role: 'separator', title: t('flipChat'),
          style: {
            left: ((snap.chatSide === 'left' ? g.left : x + contentW) - 2) + 'px',
            top: (g.top + TITLE_BAR_H) + 'px',
            height: Math.max(0, bodyH) + 'px',
          },
          onPointerDown: chatDividerHandler,
        }),
      )
    }

    /** 标题栏状态点（绑定会话四态镜像）。 */
    function TitleDot(props) {
      const entry = props.useSessions((s) => (props.boundId !== null ? s.byId[props.boundId] ?? null : null))
      const st = statusOfEntry(entry)
      const label = st === 'need' ? props.t('pending') : st === 'done' ? props.t('done') : st === 'busy' ? '…' : ''
      return el(BindDot, { st, title: label })
    }

    // ── 统一入口：选择/新建工作区对话框（UX-005；入口 = 抽屉 ⚙）────────
    function WorkspaceDialog(props) {
      const t = makeT(localeSnapshot())
      const snap = useStore()
      const api = props.api
      const [phase, setPhase] = useState('list')            // list | new | done
      const [list, setList] = useState({ loading: true, error: null, items: [] })
      const [selectedId, setSelectedId] = useState(null)
      const [customParent, setCustomParent] = useState(null) // 「选择文件夹」结果（兼子目录父路径）
      const [newPath, setNewPath] = useState(null)           // 待采用（未 workspace.create 前）的目录
      const [newName, setNewName] = useState('')
      const [notice, setNotice] = useState({ kind: 'none', text: '' })
      const [busy, setBusy] = useState(false)
      const [doneTitle, setDoneTitle] = useState('')
      const [createdId, setCreatedId] = useState(null)  // W1 幂等：本次链已创建成功的会话 id（重试不再二次 create）
      const [loadAttempt, setLoadAttempt] = useState(0)

      const open = snap.entryOpen === true
      const apiHas = (domain, method) => api !== null && api !== undefined && api[domain] !== undefined
        && typeof api[domain][method] === 'function'

      // 打开/重载：重置全部对话框状态并拉取工作区列表；列表为空 → 强制进「新建」区。
      useEffect(() => {
        if (open !== true) return undefined
        let alive = true
        setPhase('list')
        setSelectedId(null)
        setCustomParent(null)
        setNewPath(null)
        setNewName('')
        setNotice({ kind: 'none', text: '' })
        setBusy(false)
        setDoneTitle('')
        setCreatedId(null)
        if (!apiHas('workspace', 'list')) {
          setList({ loading: false, error: t('apiError'), items: [] })
          return () => { alive = false }
        }
        setList({ loading: true, error: null, items: [] })
        api.workspace.list({})
          .then((r) => {
            if (!alive) return
            if (r.result.ok !== true) {
              setList({ loading: false, error: t('listErrorPrefix') + rpcErr(r.result), items: [] })
              return
            }
            const items = Array.isArray(r.result.value?.items) ? r.result.value.items : []
            setList({ loading: false, error: null, items })
            if (items.length === 0) {
              // 空列表：显示提示并强制进入「新建」区
              setNotice({ kind: 'info', text: t('noWorkspace') })
              setPhase('new')
            } else {
              setSelectedId(items[0].workspaceId)
            }
          })
          .catch((e) => { if (alive) setList({ loading: false, error: t('listErrorPrefix') + errOf(e), items: [] }) })
        return () => { alive = false }
      }, [open, loadAttempt])

      // 所有 hook 结束后的早退（hook 顺序恒定）
      if (open !== true) return null

      const close = () => { if (!busy) store.set({ entryOpen: false }) }
      const items = list.items
      const selected = items.find((w) => w.workspaceId === selectedId)
      const displayTitle = (w) => (w.title !== undefined && w.title !== '' ? w.title : (String(w.path).split(/[\\/]/).pop() || String(w.path)))

      const pickFolder = () => {
        if (busy) return
        if (!apiHas('host', 'pickDirectory')) { setNotice({ kind: 'error', text: t('apiError') }); return }
        setBusy(true)
        setNotice({ kind: 'none', text: '' })
        api.host.pickDirectory({})
          .then((r) => {
            if (r.result.ok !== true) { setNotice({ kind: 'error', text: t('pickFail') + rpcErr(r.result) }); return }
            const p = r.result.value !== null && r.result.value !== undefined ? (r.result.value.path ?? null) : null
            if (p === null || p === '') {
              setNotice({ kind: 'info', text: t('pickCancel') })
              return
            }
            // 选中的文件夹既作为待采用路径，也作为「在其下新建目录」的父目录
            setCustomParent(p)
            setNewPath(p)
          })
          .catch((e) => setNotice({ kind: 'error', text: t('pickFail') + errOf(e) }))
          .then(() => setBusy(false))
      }

      const createDir = async () => {
        if (busy) return
        const name = newName.trim()
        if (name === '' || name === '.' || name === '..' || /[/\\]/.test(name)) {
          setNotice({ kind: 'error', text: t('dirNameInvalid') })
          return
        }
        if (!apiHas('host', 'createDirectory') || !apiHas('host', 'listDirectory')) {
          setNotice({ kind: 'error', text: t('apiError') })
          return
        }
        setBusy(true)
        setNotice({ kind: 'none', text: '' })
        try {
          let parent = customParent !== null ? customParent : null
          if (parent === null) {
            // 未选文件夹：父目录 = 默认家目录（host.listDirectory 的 home）
            const lr = await api.host.listDirectory({})
            if (lr.result.ok !== true) { setNotice({ kind: 'error', text: t('homeParentBroken') }); return }
            const home = lr.result.value !== null && lr.result.value !== undefined
              ? (lr.result.value.home ?? lr.result.value.path ?? null) : null
            if (home === null || home === '') { setNotice({ kind: 'error', text: t('homeParentBroken') }); return }
            parent = home
          }
          const r = await api.host.createDirectory({ path: parent, name: name })
          if (r.result.ok !== true) { setNotice({ kind: 'error', text: t('createDirFail') + rpcErr(r.result) }); return }
          const p = r.result.value !== null && r.result.value !== undefined ? (r.result.value.path ?? null) : null
          if (p === null || p === '') { setNotice({ kind: 'error', text: t('createDirFail') + t('unknownErr') }); return }
          setNewPath(p)
          setNewName('')
        } catch (e) {
          setNotice({ kind: 'error', text: t('createDirFail') + errOf(e) })
        } finally {
          setBusy(false)
        }
      }

      // 「创建并采用」：workspace.create（path 必须已存在）→ 入本地列表并选中，回列表视图
      const adopt = async () => {
        if (busy) return
        if (newPath === null || newPath === '') return
        if (!apiHas('workspace', 'create')) { setNotice({ kind: 'error', text: t('apiError') }); return }
        setBusy(true)
        setNotice({ kind: 'none', text: '' })
        try {
          const r = await api.workspace.create({ path: newPath })
          if (r.result.ok !== true) { setNotice({ kind: 'error', text: t('adoptPrefix') + rpcErr(r.result) }); return }
          const ws = r.result.value !== null && r.result.value !== undefined ? r.result.value.workspace : undefined
          if (ws === undefined || ws === null || ws.workspaceId === undefined) {
            setNotice({ kind: 'error', text: t('adoptPrefix') + t('unknownErr') })
            return
          }
          setPhase('list')
          setCustomParent(null)
          setNewPath(null)
          setNewName('')
          setSelectedId(ws.workspaceId)
          // 采用成功：已有列表 + 新条目本地并入（工作区列表无并发写入面，无需重拉）
          setList({ loading: false, error: null, items: [ws].concat(items.filter((w) => w.workspaceId !== ws.workspaceId)) })
        } catch (e) {
          setNotice({ kind: 'error', text: t('adoptPrefix') + errOf(e) })
        } finally {
          setBusy(false)
        }
      }

      // 确认动作：创建会话 → 挂载预设 → 同步工作区根目录（非阻断）→ 发送启动指令
      const confirmCreate = async () => {
        if (busy) return
        if (selected === undefined) return
        if (!apiHas('sessions', 'create') || !apiHas('agentPresets', 'select') || !apiHas('sessions', 'prompt')) {
          setNotice({ kind: 'error', text: t('apiError') })
          return
        }
        setBusy(true)
        setNotice({ kind: 'none', text: '' })
        try {
          // W1 幂等去重：本次链已创建过会话（预设/指令步骤失败后重试）→ 不再
          // session.create，直接续走预设挂载 → 工作区同步 → 指令发送。
          let sessionId = createdId !== null && createdId !== '' ? createdId : null
          if (sessionId === null) {
            const r1 = await api.sessions.create({ workspaceId: selected.workspaceId })
            if (r1.result.ok !== true) {
              setNotice({ kind: 'error', text: t('sessionCreatePrefix') + rpcErr(r1.result) })
              return
            }
            const v1 = r1.result.value
            sessionId = v1 !== null && v1 !== undefined ? v1.sessionId : undefined
            if (typeof sessionId !== 'string' || sessionId === '') {
              setNotice({ kind: 'error', text: t('sessionCreatePrefix') + t('unknownErr') })
              return
            }
            setCreatedId(sessionId)
          }
          // b) 挂载预设：新会话为 blank（尚无 turn，宿主仅允许 blank 切换）→ select 合法；
          //    失败则明确告知（会话已建）并停止——预设未挂载时不发送启动指令，避免误导。
          try {
            const r2 = await api.agentPresets.select({ sessionId: sessionId, agentPreset: 'novel-writing' })
            if (r2.result.ok !== true) throw new Error(rpcErr(r2.result))
          } catch (e) {
            setNotice({ kind: 'error', text: t('presetFailPrefix') + errOf(e) + t('presetFailHint') })
            return
          }
          // c) 工作区根目录同步：失败仅记 notice，不阻断后续（会话创建/启动不受影响）。
          const syncFail = (m) => setNotice({ kind: 'info', text: t('syncFailPrefix') + m + t('syncFailSuffix') })
          try {
            const r3 = await api.settings.update({ ns: 'novel-writing', patch: { workspaceRoot: selected.path } })
            if (r3.result.ok !== true) syncFail(rpcErr(r3.result))
          } catch (e) {
            syncFail(errOf(e))
          }
          // d) 启动指令：载荷按 sessionPromptRequestSchema（sessionId + mode + content[text]）
          try {
            const r4 = await api.sessions.prompt({ sessionId: sessionId, mode: 'queue', content: [{ type: 'text', text: START_MSG }] })
            if (r4.result.ok !== true) throw new Error(rpcErr(r4.result))
          } catch (e) {
            setNotice({ kind: 'error', text: t('promptFailPrefix') + errOf(e) + t('promptFailHint') })
            return
          }
          // e) 转场到新会话（N6）：与抽屉新建链/绑定链/卡片打开一致；幂等安全——
          //    sessions.open 对已选中会话为 no-op（宿主 open 语义幂等），服务缺席时静默跳过。
          launcher.open(sessionId)
          setPhase('done')
          setDoneTitle(displayTitle(selected))
        } catch (e) {
          setNotice({ kind: 'error', text: t('sessionCreatePrefix') + errOf(e) })
        } finally {
          setBusy(false)
        }
      }

      const noticeEl = notice.kind !== 'none'
        ? el('div', { style: { ...hint, margin: '8px 0 0', color: notice.kind === 'error' ? TK.danger : notice.kind === 'success' ? TK.success : TK.warn } }, notice.text)
        : null

      const listBody = list.loading
        ? el('div', { style: hint }, t('loading'))
        : list.error !== null
          ? el('div', null,
              el('div', { style: { color: TK.danger, margin: '4px 0' } }, list.error),
              // S1 逃生口：列表加载失败仍可进「新建工作区」（不依赖列表可用）
              el('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } },
                el('button', { type: 'button', style: btn, disabled: busy, onClick: () => setLoadAttempt((n) => n + 1) }, t('retry')),
                el('button', { type: 'button', style: { ...btn, background: TK.accent, color: '#fff', border: 'none' }, disabled: busy, onClick: () => { setPhase('new'); setNotice({ kind: 'none', text: '' }) } }, t('newWorkspaceBtn')),
              ),
            )
          : items.length === 0
            ? el('div', null,
                el('div', { style: { ...hint, margin: '4px 0 8px' } }, t('noWorkspace')),
                el('button', { type: 'button', style: { ...btn, background: TK.accent, color: '#fff', border: 'none' }, onClick: () => setPhase('new') }, t('newWorkspaceBtn')),
              )
            : el('div', null,
                items.map((w) => {
                  const sel = w.workspaceId === selectedId
                  return el('button', {
                    key: w.workspaceId,
                    type: 'button',
                    onClick: () => setSelectedId(w.workspaceId),
                    style: {
                      display: 'block', width: '100%', textAlign: 'left', margin: '3px 0', padding: '6px 8px',
                      borderRadius: '6px', border: '1px solid ' + (sel ? TK.line2 : TK.line),
                      background: sel ? TK.fillHover : 'transparent', color: TK.text, cursor: 'pointer', fontSize: '12px',
                    },
                  },
                    el('div', { style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (sel ? '◉ ' : '○ ') + displayTitle(w)),
                    el('div', { style: { fontSize: '11px', color: TK.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, w.path + ' · ' + t('sessionCount', (w.sessionIds ?? []).length)),
                  )
                }),
              )

      return el('div', {
        className: 'nv-modal-backdrop',
        onClick: close,
      },
        el('div', {
          className: 'nv-modal',
          style: { width: '520px' },
          onClick: (e) => e.stopPropagation(),
        },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
            el('strong', null, '📖 ' + t('dialogTitle')),
            el('button', { type: 'button', className: 'nv-mini', onClick: close, 'aria-label': t('closed') }, '✕'),
          ),
          phase === 'done'
            ? el('div', null,
                el('div', { style: { fontWeight: 600, color: TK.success, margin: '0 0 6px' } }, t('doneTitle')),
                el('div', { style: { color: TK.success, lineHeight: 1.7, margin: '0 0 10px' } }, t('doneMsg', doneTitle)),
                el('button', { type: 'button', style: { ...btn, background: TK.success, color: '#fff', border: 'none' }, onClick: close }, t('doneClose')),
              )
            : phase === 'new'
              ? el('div', null,
                  el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' } },
                    el('button', { type: 'button', style: btn, disabled: busy, onClick: pickFolder }, t('pickFolder')),
                    customParent !== null
                      ? el('span', { style: { ...hint, flex: 1, minWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('pickedPrefix') + customParent)
                      : el('span', { style: hint }, t('noParentHint')),
                  ),
                  el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' } },
                    el('span', { style: { fontSize: '12px', color: TK.text2 } }, t('subDirTitle')),
                    el('input', {
                      style: { ...input, width: '180px' }, placeholder: t('dirNamePlaceholder'),
                      value: newName, disabled: busy,
                      onChange: (e) => setNewName(e.target.value),
                      onKeyDown: (e) => { if (e.key === 'Enter') createDir() },
                    }),
                    el('button', { type: 'button', style: btn, disabled: busy, onClick: createDir }, t('createDirBtn')),
                  ),
                  newPath !== null && newPath !== ''
                    ? el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '6px 8px', border: '1px solid ' + TK.success, borderRadius: '8px', background: TK.fill, marginBottom: '8px' } },
                        el('span', { style: { flex: 1, minWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TK.text } }, '📁 ' + newPath),
                        el('button', { type: 'button', style: { ...btn, background: TK.success, color: '#fff', border: 'none' }, disabled: busy, onClick: adopt }, t('adoptBtn')),
                      )
                    : null,
                  el('div', null,
                    el('button', { type: 'button', style: btn, disabled: busy, onClick: () => { setPhase('list'); setNotice({ kind: 'none', text: '' }) } }, t('backToList')),
                  ),
                )
              : el('div', null,
                  listBody,
                  !list.loading && list.error === null && items.length > 0
                    ? el('div', { style: { marginTop: '10px' } },
                        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                          el('button', { type: 'button', style: { ...btn, background: TK.success, color: '#fff', border: 'none' }, disabled: busy || selected === undefined, onClick: confirmCreate }, busy ? '…' : t('createSessionBtn')),
                          el('button', { type: 'button', style: btn, disabled: busy, onClick: () => setPhase('new') }, t('newWorkspaceBtn')),
                        ),
                        // S3：所选工作区已有会话时点确认会再新建一个——信息性提示，不阻断
                        selected !== undefined && (selected.sessionIds ?? []).length > 0
                          ? el('div', { style: { ...hint, marginTop: '6px' } }, t('hasSessionsHint', (selected.sessionIds ?? []).length))
                          : null,
                      )
                    : null,
                ),
          noticeEl,
        ),
      )
    }

    // ── 视觉：单 <style id="novel-writing-style">（.nv-* 类；全量 --dsw-alias-* 令牌）──
    const NV_STYLE = [
      // 侧栏抽屉
      '.nv-drawer{margin:2px 0 6px}',
      '.nv-sep{height:1px;background:var(--dsw-alias-border-l1,#262b36);margin:4px 0}',
      '.nv-drawer-head{display:flex;align-items:center;gap:6px;padding:4px 6px}',
      '.nv-drawer-title{flex:1;min-width:0;font-size:11px;font-weight:600;letter-spacing:.05em;color:var(--dsw-alias-label-secondary,#9aa4b2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-mini{flex:none;display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:none;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary,#9aa4b2);font-size:12px;line-height:1;cursor:pointer}',
      '.nv-mini:hover{color:var(--dsw-alias-label-primary,#e6e8eb);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.06))}',
      '.nv-card{display:block;width:100%;box-sizing:border-box;text-align:left;padding:5px 8px;margin:3px 0;border:1px solid var(--dsw-alias-border-l1,#262b36);border-radius:8px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.02));color:var(--dsw-alias-label-primary,#e6e8eb);font:inherit;cursor:pointer}',
      '.nv-card:hover{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      '.nv-card[data-on=true]{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      '.nv-card-title{flex:1;min-width:0;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-card-sub{font-size:11px;color:var(--dsw-alias-label-tertiary,#6e7683);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-row{display:flex;align-items:center;gap:6px;min-width:0}',
      '.nv-empty{padding:8px 10px;border:1px dashed var(--dsw-alias-border-l1,#262b36);border-radius:8px;color:var(--dsw-alias-label-tertiary,#6e7683);font-size:11px;text-align:center}',
      // 状态点（工作中=accent 蓝发光脉冲 / 待决=黄 / 完成=绿 / 会话失效=红 / 未绑定=空心灰）
      '.nv-dot{flex:none;display:inline-block;width:8px;height:8px;border-radius:50%;box-sizing:border-box;border:1.2px solid var(--dsw-alias-label-tertiary,#6e7683);background:transparent}',
      '.nv-dot[data-st=busy]{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-state-accent-primary,#4f8ef7);box-shadow:0 0 6px var(--dsw-alias-state-accent-primary,#4f8ef7);animation:nv-busy 1.2s ease-in-out infinite}',
      '.nv-dot[data-st=need]{border-color:var(--dsw-alias-state-warning,#d29922);background:var(--dsw-alias-state-warning,#d29922);box-shadow:0 0 6px var(--dsw-alias-state-warning,#d29922)}',
      '.nv-dot[data-st=done]{border-color:var(--dsw-alias-state-success,#3fb950);background:var(--dsw-alias-state-success,#3fb950);box-shadow:0 0 6px var(--dsw-alias-state-success,#3fb950)}',
      '.nv-dot[data-st=stale]{border-color:var(--dsw-alias-state-danger,#e5484d);background:transparent}',
      '@keyframes nv-busy{0%,100%{opacity:1}50%{opacity:.35}}',
      // 分栏工作区（容器 zIndex 900 < 对话框 1000；对话分隔线 901）
      '.nv-split{position:fixed;display:flex;flex-direction:column;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,#262b36);border-radius:8px;background:var(--dsw-alias-bg-base,#0b0e14);overflow:hidden;z-index:900}',
      '.nv-bar{flex:none;display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l1,#262b36);background:var(--dsw-alias-bg-base,#0b0e14)}',
      '.nv-bar-title{flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#e6e8eb);overflow:hidden;white-space:nowrap}',
      '.nv-badge{flex:none;font-size:10px;line-height:14px;padding:0 6px;border-radius:8px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.06));color:var(--dsw-alias-label-tertiary,#6e7683);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-main{flex:1;min-height:0;display:flex}',
      '.nv-left{flex:none;min-height:0;overflow:auto;padding:8px;box-sizing:border-box;border-right:1px solid var(--dsw-alias-border-l1,#262b36)}',
      '.nv-vdiv{flex:none;width:4px;cursor:col-resize;background:var(--dsw-alias-border-l2,#3a4150);touch-action:none}',
      '.nv-vdiv:hover{background:var(--dsw-alias-state-accent-primary,#4f8ef7)}',
      '.nv-chatdiv{position:fixed;width:4px;cursor:col-resize;background:var(--dsw-alias-border-l2,#3a4150);touch-action:none;z-index:901}',
      '.nv-chatdiv:hover{background:var(--dsw-alias-state-accent-primary,#4f8ef7)}',
      // 中窗页签
      '.nv-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 8px}',
      '.nv-tab{padding:3px 10px;border:1px solid var(--dsw-alias-border-l1,#262b36);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#9aa4b2);font:inherit;font-size:12px;cursor:pointer}',
      '.nv-tab:hover{color:var(--dsw-alias-label-primary,#e6e8eb)}',
      '.nv-tab[data-on=true]{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      // 对话框（工作区 UX-005 / 绑定面板）
      '.nv-modal-backdrop{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:20px}',
      '.nv-modal{width:480px;max-width:100%;max-height:85vh;overflow:auto;box-sizing:border-box;background:var(--dsw-alias-bg-base,#0b0e14);color:var(--dsw-alias-label-primary,#e6e8eb);border:1px solid var(--dsw-alias-border-l2,#3a4150);border-radius:12px;padding:14px;box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.4));font-size:13px}',
      '.nv-group{margin:6px 0;padding:4px 8px;border-left:2px solid var(--dsw-alias-state-accent-primary,#4f8ef7);border-radius:4px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.04));font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#9aa4b2)}',
      '.nv-srow{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:5px 8px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#e6e8eb);font:inherit;font-size:12px;cursor:pointer;text-align:left}',
      '.nv-srow:hover{background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05));border-color:var(--dsw-alias-border-l2,#3a4150)}',
      '.nv-srow-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-srow-sub{flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary,#6e7683);max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    ].join('')

    /** 注入单个 <style id="novel-writing-style">；返回清理函数（幂等：已存在时不重复注入、不误删）。 */
    function ensureStyle() {
      try {
        if (typeof document === 'undefined' || document === null || document.head === null) return () => {}
        let tag = document.getElementById('novel-writing-style')
        if (tag !== null) return () => {}
        tag = document.createElement('style')
        tag.id = 'novel-writing-style'
        tag.textContent = NV_STYLE
        document.head.appendChild(tag)
        return () => { try { tag.remove() } catch { /* ignore */ } }
      } catch {
        return () => {}
      }
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
      const base = { api: connection !== undefined ? connection.api : null }

      // 视觉令牌（单 style 标签；清理时移除）
      const removeStyle = ensureStyle()

      // 会话状态镜像 hook（服务缺席 → null = 降级）
      const useSessionsH = makeSessionsHook(sessionsSvc)

      // 共享互斥：其他接入 dsh:split-claim 协议的引擎声明占用时让位（与 dsh-worktable 共存）
      let claimHandler = null
      try {
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          claimHandler = (e) => {
            const id = e !== null && e !== undefined && e.detail !== null && e.detail !== undefined ? e.detail.id : null
            if (novelSplit.active && id !== null && id !== 'novel-writing') novelSplit.close()
          }
          window.addEventListener('dsh:split-claim', claimHandler)
        }
      } catch { /* ignore */ }

      launcher.setup({ api: base.api, sessions: sessionsSvc })

      // 设置页
      ctx.slots.inject('settings.section', () => ctx.slots.register(
        { name: 'settings.section', id: 'novel-writing', order: 20, label: () => t('settingsTitle') },
        (props) => el(SettingsPage, { ...base, t }),
      ))

      // 侧栏抽屉：书目卡片 + 绑定状态点 + 工作区（⚙）/ 新建（＋）入口
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
        { name: 'sidebar.footer.action', id: 'novel-drawer', order: 9, label: () => t('entryLabel') },
        (props) => el(NovelDrawer, {
          api: base.api,
          useSessions: useSessionsH,
          wide: props !== undefined && props !== null ? props.wide : true,
        }),
      ))

      // 浮层：工作区对话框（UX-005 保留；入口 = 抽屉 ⚙）+ 分栏工作区 + 绑定面板
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'novel-workspace-dialog', order: 20, label: () => t('entryLabel') },
        () => el(WorkspaceDialog, { ...base }),
      ))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'novel-split', order: 25, label: () => t('title') },
        (props) => el(SplitWorkspace, { api: base.api, useSessions: useSessionsH }),
      ))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'novel-bind-dialog', order: 40, label: () => t('bindBtn') },
        (props) => el(BindDialog, { api: base.api, useSessions: useSessionsH }),
      ))

      // 可逆性：清理 = 引擎关闭 + claim 监听移除 + style 标签移除
      return () => {
        try { novelSplit.close() } catch { /* ignore */ }
        try {
          if (claimHandler !== null && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
            window.removeEventListener('dsh:split-claim', claimHandler)
          }
        } catch { /* ignore */ }
        removeStyle()
      }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
