/**
 * dsh-novel-writing 浏览器侧包（`./client`，dual-face 下发）。
 *
 * 界面（UX-007 / DEC-015 修正后 + UX-008 / DEC-017 控制台迭代 + UX-011 两级工作台）：
 * - 两级工作台（UX-011）：**小说管理工作台** = 侧栏抽屉 + 全屏控制台（仅管理工作区的
 *   创建/切换 + 小说的创建（＋磁贴）/删除（🗑 卡片钮→宿主 novel-delete）与卡片化呈现）；
 *   **小说创作工作台** = 既有分栏工作区（管理小说本身的创作与内容/状态/数据，职责不变）。
 * - 侧栏抽屉（sidebar.footer.action id=novel-drawer，order 9）= 管理工作台主入口：
 *   分隔线 + 「📖 小说管理工作台」标题行（**整体可点击** = 开/关控制台，反选语义，
 *   无任何按钮组）+ 书目卡片列表（书名 / 阶段·章数·字数 / 绑定状态点；
 *   UX-014⑦ 点击 = **直接进入创作工作台**（跳过管理控制台）——未绑定走开卡自动建会话
 *   链、已绑定直接打开，与控制台卡片共用 openCtl 单链）；空态 = 虚线框「打开工作台
 *   界面创建第一本小说」；
 * - 管理工作台控制台（shell.overlay id=nv-console，order 25，zIndex 950）：
 *   全屏管理浮层（覆盖「内容区」不遮侧栏；与 novel-split 互斥；打开期间用户
 *   点侧栏其他会话自动关——UX-010④ 会话联动）——顶部栏
 *   （📖 标题 + 当前工作区名 + **紧邻路径**的「切换/新建工作区…」=
 *   WorkspaceDialog + 醒目 ✕/Esc）、网格上方排序控制（默认 / 手动
 *   两态 pill——手动态卡片 HTML5 拖拽换位，顺序持久化 localStorage
 *   `dsh.novel.order.v1`，参照 dsh-worktable sortBtn + 管理模式拖拽）、
 *   小说卡片网格（UX-010③：minmax(320px,1fr) gap 20px 宽容器恰 3 列、
 *   卡片与磁贴统一 min-height 180px；玻璃拟态 + 状态行
 *   `N章·N字·发布✓/✗·变现✓/✗·信号N` + 绑定双圆 ○○/●● + 最近更新 +
 *   **数据卡片**（最近 metrics 摘要）+ 卡操作 🔗 绑定/重绑・🗑 删除
 *   （UX-011：confirm 显式确认 → 宿主 novel-delete → 清绑定键；不依赖
 *   会话服务）22×22 图标钮；**无 ▶ 打开**——卡片主体点击即打开（UX-013
 *   批注②：首次点击未绑定书 = 自动创建会话并关联，后续点击 = 直接进原会话；
 *   ➤ 启动钮已删——启动归创作台标题栏）、>8 本折叠为前 8 +
 *   展开全部/折叠行、网格末尾「＋」**虚线磁贴**（UX-012：打开**居中模态**新建
 *   对话框——全屏遮罩（点击/Esc 关，busy 禁关）+ 居中卡片 min(520px,100%)；
 *   表单**仅目录名**（书名由工作流后续确定，确定前卡片名=目录名——宿主
 *   createProject 对缺省 title 默认 title=name）；按钮仅「创建/取消」——
 *   **不再自动启动工作流**（自动建会话/挂预设/绑定/发指令链整体退役），
 *   创建成功即关窗、notice 提示点卡片进创作台）、**底部居中大药丸搜索行**
 *   （999px 圆角 + 🔍 + 大占位字；关键词同滤小说卡片与会话快照 →「找到的
 *   会话」点击打开并关控制台）；
 * - 小说创作工作台（shell.overlay id=novel-split）：保留为「打开小说后」的会话
 *   配套形态（UX-006 挤法三栏全部逻辑不变，不再作为主入口载体）；标题栏
 *   「📖 小说创作工作台 ·《书名》」+ 阶段徽标（UX-011）+ **「▶ 开始/继续
 *   工作流」accent 实底钮**（UX-012：创建后所有启动动作归位于此——降级
 *   提示不执行 / 未绑定→提示并弹绑定面板 / 会话失效→提示重绑 / 已绑定→
 *   复用 promptLaunch 发开始·继续指令；busy 防连点）；UX-014：左窗收敛为
 *   当前书目 novel-project 文件树（①无工作区行/书目列表，③目录默认折叠）、
 *   标题栏 ⇄/✕ 28×28 醒目化（⑥）、打开期间点侧栏其他会话自动关闭（⑧）、
 *   挤法不再推下对话窗（⑨首入截断修复）；UX-015：标题栏加高放大（①
 *   30→38px/标题 14px/⇄✕ 32×32）、章节列表行显示章节名（②）；UX-019：
 *   章节行仅章节号+章节名（去字数，③）、章节列直排滚动；UX-020（用户
 *   实机反馈修正 UX-019③）：章节列右缘拖宽条恢复为 UX-015③ 原始样式
 *   （4px 分隔条；120–360px + chapterW 持久化）；UX-021：章节行去装饰
 *   圆点；UX-022（用户术语定案：「分割条」=拖了改布局的三条分隔线→常驻
 *   可见；「拖动条」=拖了滚内容的滚动条→默认隐藏、悬停才显；并修滚动
 *   隔离——章节列/左窗/正文各滚各自）；其打开时经互斥关闭控制台；
 * - 小说↔会话 1:1 绑定：settings ns novel-writing 的 bindings 字段
 *   （宿主 Config z.dict；overview 附带下发）；绑定面板（shell.overlay
 *   id=novel-bind-dialog）按工作区分组列出会话（workspace.list + sessions
 *   镜像），选择后合并语义写入；
 * - 工作区对话框（shell.overlay id=novel-workspace-dialog，UX-005 保留 +
 *   UX-013 批注①简化）：入口收敛为控制台顶部「切换 / 新建工作区…」——仅支持
 *   切换（选中 → settings.update workspaceRoot=path）与新建工作区；
 *   「在此工作区创建小说会话」链与 done 态整体退役（会话创建归卡片首次点击）；
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
        // UX-011 两级工作台：管理工作台（侧栏入口/控制台）管工作区+书目创建删除；
        // 创作工作台（分栏）管内容/状态/数据——creationLabel/creationTitle 即其标题。
        creationLabel: '小说创作工作台',
        creationTitle: (book) => `📖 小说创作工作台 · 《${book}》`,
        settingsTitle: '小说写作',
        noNovels: '小说工作区为空。',
        noNovelsHint: '打开工作台控制台（点侧栏标题行）→「切换 / 新建工作区…」或点卡片网格末尾的「＋」磁贴。',
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
        // ── 工作区对话框（UX-005，入口 = 控制台顶部「切换/新建工作区…」）──
        entryLabel: '📖 小说管理工作台',
        dialogTitle: '选择 / 新建小说创作工作区',
        listErrorPrefix: '加载工作区列表失败：',
        retry: '重试',
        unknownErr: '未知错误',
        noWorkspace: '尚未配置小说创作工作区。',
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
        // UX-013（批注①）：工作区对话框仅「切换 / 新建」——会话创建不再由此触发。
        // 提示行保留为信息性展示（不再暗示会新建会话）。
        hasSessionsHint: (n) => `该工作区已有 ${n} 个会话。`,
        switchHint: '切换后管理工作台显示该工作区书目。',
        switchFailPrefix: '切换工作区失败：',
        sessionCreatePrefix: '创建会话失败：',
        presetFailPrefix: '会话已创建，但「小说写作工作流」预设挂载失败：',
        presetFailHint: '请打开该会话手动选择预设后，再发送启动指令。',
        promptFailPrefix: '会话已就绪，但启动指令发送失败：',
        promptFailHint: '请打开该会话手动发送启动指令。',
        // ── 抽屉（UX-006）──
        bindBtn: '绑定会话',
        unbound: '未绑定', stale: '会话失效',
        dirtyConfirm: '当前章节有未保存的修改，放弃并切换？',
        dirtyCloseConfirm: '当前章节有未保存的修改，关闭工作台将丢失，确定？',
        nameRequired: '目录名必填',
        dirPlaceholder: '目录名（必填，如 fayi-xiantu）',
        createFailPrefix: '创建失败：',
        bindFailPrefix: '绑定失败：',
        bindLoadFailPrefix: '加载会话列表失败：',
        bindTitle: (book) => `🔗 绑定会话：《${book}》`,
        bindPick: '为本书选择一个会话（1:1 绑定；点击即绑定并打开）：',
        bindNew: '新建会话并绑定',
        bindNone: '暂无会话',
        bindOther: '其他（未入工作区）',
        bindStaleHint: '该书绑定的会话已不存在，请重新绑定。',
        openFailHint: '未找到当前会话视图，暂未开启分栏；已切换到绑定会话，可稍后重试打开。',
        sessionsMissing: '会话服务不可用：状态点已隐藏，打开/绑定功能暂不可用（重启 DSH 后重试）。',
        launchSentPrefix: '已发送指令：',
        collapseLeft: '折叠左栏', expandLeft: '展开左栏',
        flipChat: '对话窗换边（左/右）', closeSplit: '关闭分栏（Esc）',
        resizeChlist: '拖拽调整章节列宽',
        // ── 工作台控制台（UX-007 / DEC-015 + UX-008 / DEC-017）──
        drawerEmpty: '打开工作台界面创建第一本小说',
        wsSwitch: '切换 / 新建工作区…',
        wsUnset: '未设置工作区 — 点击选择/新建',
        searchPh: '搜索小说 / 会话…',
        searchClear: '清除搜索',
        foundSessions: (n) => `找到的会话（${n}）`,
        noMatch: '没有匹配的小说或会话',
        newNovelBtn: '＋ 新建小说',
        sortDefault: '默认', sortManual: '手动',
        expandAll: (n) => `展开全部（${n}）`,
        collapse: '折叠',
        plusTitle: '新建小说',
        // UX-013（批注②）：首次点卡片 = 自动创建会话并关联（create→预设→绑定→打开）；
        // 卡片 ➤ 启动钮已退役——启动归创作台标题栏「▶ 开始/继续工作流」（UX-012）。
        autoBindDone: (title) => `已为《${title}》创建并关联新会话。`,
        // ── UX-012：新建弹窗（居中模态，仅目录名+创建/取消）+ 创作台标题栏启动钮 ──
        startWorkflow: '▶ 开始工作流',
        continueWorkflow: '▶ 继续工作流',
        bindFirstHint: '尚未绑定会话——请先绑定，再开始工作流',
        // ── UX-011：卡片删除（管理工作台职责；仅用户显式确认后触发）──
        delBtn: '删除',
        delConfirm: (title, id) => `确定删除《${title}》（目录 ${id}）？将删除整个书稿目录，不可恢复。`,
        delDone: (title) => `已删除《${title}》（书目列表稍后自动刷新）`,
        delFailPrefix: '删除失败：',
        delBindFailPrefix: '绑定清理失败：',
        cancel: '取消',
        createBtn: '创建',
        createDoneHint: (title) => `已创建《${title}》——点击卡片进入小说创作工作台，再点「▶ 开始工作流」启动创作`,
        updatedAt: '最近更新',
        rel: '发布', mon: '变现', sig: '信号',
      },
      en: {
        // UX-011 two-level workbench: management (sidebar/console) vs creation (split).
        creationLabel: 'Novel Creation Workbench',
        creationTitle: (book) => `📖 Novel Creation Workbench · “${book}”`,
        settingsTitle: 'Novel Writing',
        noNovels: 'Workspace is empty.',
        noNovelsHint: 'Open the workbench console (click the sidebar title) → "Switch / create workspace…" or the trailing "＋" tile.',
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
        // ── Workspace dialog (UX-005; entry = console top bar) ──
        entryLabel: '📖 Novel Management Workbench',
        dialogTitle: 'Choose / Create Novel Writing Workspace',
        listErrorPrefix: 'Failed to load workspaces: ',
        retry: 'Retry',
        unknownErr: 'Unknown error',
        noWorkspace: 'No novel writing workspace configured yet.',
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
        // UX-013 (①): workspace dialog only switches/creates — session creation no longer starts here.
        hasSessionsHint: (n) => `This workspace already has ${n} sessions.`,
        switchHint: 'After switching, the management workbench shows this workspace\'s novels.',
        switchFailPrefix: 'Switch workspace failed: ',
        sessionCreatePrefix: 'Create session failed: ',
        presetFailPrefix: 'Session created, but mounting the "Novel Writing Workflow" preset failed: ',
        presetFailHint: 'Mount that preset inside the session, then send the start instruction.',
        promptFailPrefix: 'Session ready, but sending the start instruction failed: ',
        promptFailHint: 'Open the session and send the start instruction manually.',
        // ── Drawer (UX-006) ──
        bindBtn: 'Bind session',
        unbound: 'unbound', stale: 'session gone',
        dirtyConfirm: 'The current chapter has unsaved edits. Discard and switch?',
        dirtyCloseConfirm: 'The current chapter has unsaved edits. Close the workbench and lose them?',
        nameRequired: 'Directory name required',
        dirPlaceholder: 'Directory name (required, e.g. fayi-xiantu)',
        createFailPrefix: 'Create failed: ',
        bindFailPrefix: 'Bind failed: ',
        bindLoadFailPrefix: 'Failed to load sessions: ',
        bindTitle: (book) => `🔗 Bind session: "${book}"`,
        bindPick: 'Pick a session for this book (1:1 binding; click binds and opens):',
        bindNew: 'Create session & bind',
        bindNone: 'No sessions',
        bindOther: 'Others (not in a workspace)',
        bindStaleHint: 'The bound session no longer exists; rebind it.',
        openFailHint: 'Conversation view not found; split layout not opened. The bound session was opened — retry later.',
        sessionsMissing: 'Sessions service unavailable: status dots hidden, open/bind disabled (restart DSH to restore).',
        launchSentPrefix: 'Instruction sent: ',
        collapseLeft: 'Collapse left pane', expandLeft: 'Expand left pane',
        flipChat: 'Flip chat side (left/right)', closeSplit: 'Close split (Esc)',
        resizeChlist: 'Drag to resize chapter column',
        // ── Workbench console (UX-007 / DEC-015 + UX-008 / DEC-017) ──
        drawerEmpty: 'Open the workbench to create your first novel.',
        wsSwitch: 'Switch / create workspace…',
        wsUnset: 'No workspace set — click to select/create',
        searchPh: 'Search novels / sessions…',
        searchClear: 'Clear search',
        foundSessions: (n) => `Found sessions (${n})`,
        noMatch: 'No matching novels or sessions',
        newNovelBtn: '＋ New novel',
        sortDefault: 'Default', sortManual: 'Manual',
        expandAll: (n) => `Expand all (${n})`,
        collapse: 'Collapse',
        plusTitle: 'New novel',
        // UX-013 (②): first card click = auto-create + bind session; card ➤ launch retired
        // (launch moved to the split title bar "▶ Start/Continue workflow", UX-012).
        autoBindDone: (title) => `Created and bound a new session for "${title}".`,
        // ── UX-012: create modal (centered, dir-name only + create/cancel) + split-bar launch button ──
        startWorkflow: '▶ Start workflow',
        continueWorkflow: '▶ Continue workflow',
        bindFirstHint: 'No session bound yet — bind one before starting the workflow',
        // ── UX-011: card delete (management workbench; explicit user confirm only) ──
        delBtn: 'Delete',
        delConfirm: (title, id) => `Delete "${title}" (directory ${id})? The entire manuscript directory will be removed and cannot be undone.`,
        delDone: (title) => `Deleted "${title}" (the list refreshes shortly)`,
        delFailPrefix: 'Delete failed: ',
        delBindFailPrefix: 'Failed to clear binding: ',
        cancel: 'Cancel',
        createBtn: 'Create',
        createDoneHint: (title) => `Created "${title}" — click its card to open the creation workbench, then press "▶ Start workflow"`,
        updatedAt: 'Updated',
        rel: 'Publish', mon: 'Monetize', sig: 'Signals',
      },
    }
    function makeT(locale) {
      const dict = locale === 'en' ? LANG.en : LANG.zh
      return (key, ...args) => {
        const v = dict[key] !== undefined ? dict[key] : LANG.zh[key]
        return typeof v === 'function' ? v(...args) : v
      }
    }

    // ── 共享状态（模块级 store：工作区对话框开关 + 工作台选中小说 + 绑定面板目标 + 章节脏稿 + 控制台开关/聚焦）──
    const store = {
      entryOpen: false,
      selected: null,
      bind: null,          // { novelId, stale } — 绑定面板目标（null = 关闭）
      chapterDirty: false,
      consoleOpen: false,  // UX-007：全屏控制台开关
      consoleFocus: null,  // UX-007：控制台打开时聚焦的书目 id（滚动+高亮）
      listeners: new Set(),
      get: () => ({ entryOpen: store.entryOpen, selected: store.selected, bind: store.bind ? { ...store.bind } : null, chapterDirty: store.chapterDirty, consoleOpen: store.consoleOpen, consoleFocus: store.consoleFocus }),
      set(patch) {
        if (patch.entryOpen !== undefined) store.entryOpen = patch.entryOpen
        if (patch.selected !== undefined) store.selected = patch.selected
        if (patch.bind !== undefined) store.bind = patch.bind
        if (patch.chapterDirty !== undefined) store.chapterDirty = patch.chapterDirty
        if (patch.consoleOpen !== undefined) store.consoleOpen = patch.consoleOpen
        if (patch.consoleFocus !== undefined) store.consoleFocus = patch.consoleFocus
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

    // ── 路径拼接（浏览器侧，UX-013）──────────────────────────────────────
    /** root + '/' + novelId：与 BindDialog 既有 cwd 构造一致（node/宿主对 '/' 与 '\\' 均接受）；
     *  novelId 来自宿主 listNovels（服务端已 sanitize），无注入面。 */
    function joinNovelRoot(root, id) {
      return String(root).replace(/[\\/]+$/, '') + '/' + id
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
    // 布局模型：标题栏(38px) + 主行[左窗 leftW | 中窗(余量)]；官方对话窗 = 会话根的
    // viewArea，靠 marginLeft/marginRight 挤到右侧（可 ⇄ 换边到左侧）。
    // 宽度与换边持久化 dsh.novel.split.v1 = {leftW, chatW, chapterW, chatSide}。
    // UX-018 根因：margin 不改变元素 content-box 尺寸——宿主响应式布局（hero「探索未至
    // 之境」居中定位）靠自身尺寸变化（ResizeObserver/宽度重算）触发重排；用户真实时序
    // 「先全宽挂载、后加 margin」无尺寸事件 → 不重排 → hero 保持全宽坐标（输入框中心
    // ~667），挤压后仅露右缘碎片 =「渲染异常」。修复 = 双压：margin 之外显式
    // width=clamp 后 chatW → border-box 真变小 → 宿主必然重排，两种挂载时序统一；
    // 视图区原 width 记 savedWidth，close/换根恢复（原值可能为 ''）。
    const SPLIT_PERSIST_KEY = 'dsh.novel.split.v1'
    const TITLE_BAR_H = 38
    // UX-016：小窗口聊天优先（Coordinator 1078×593 复现取证）——原钳制
    // hi = colW − 160 − 420，1078 窗口（colW=798）下 hi=218 把聊天压到 240px 下限：
    // hero 折行 + 输入框裁切（「截断」）。重分配 = 左窗下限 160→128、中窗下限
    // 420→320、对话窗最小 240→300——三常量同源共享（setChatW/applyMargin/渲染
    // 钳制/无存档默认全走同一组，不散落字面量）。
    // UX-017：再宽一档定案（服务端新版 300 下用户强刷仍见窄聊天——旧包或 300 下
    // hero 输入行临界溢出未分辨）：对话优先再让步 = CHAT_MIN 300→320、
    // LEFT_MIN 128→120、CENTER_MIN 320→300（钳制上限随共享常量 = colW−120−300）。
    const LEFT_MIN = 120
    const LEFT_MAX = 420
    const LEFT_DEFAULT = 240
    const CHAT_MIN = 320
    const CENTER_MIN = 300
    // 无存档默认对话窗宽 = colW 的 50%（UX-016 的 45% 在 1078 窗口给出 350 仍偏窄），
    // 钳到 [320, max(320, colW−120−300)]：上限 = colW−420 保证左 120 + 中 300 预留；
    // colW<740 时上下限收敛为 320（下限一致）。存档超界收敛同钳。
    const CHAT_DEFAULT_RATIO = 0.50
    // UX-015③：章节列表列宽（ChapterPanel 左列）——默认略窄 + 手动拖宽（120–360px）
    const CHAPTER_W_MIN = 120
    const CHAPTER_W_MAX = 360
    const CHAPTER_W_DEFAULT = 160

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
          chapterW: Number.isFinite(s.chapterW) ? s.chapterW : null,
          chatSide: s.chatSide === 'left' ? 'left' : s.chatSide === 'right' ? 'right' : null,
        }
      } catch { return null }
    }
    function persistSplit(state) {
      try {
        localStorage.setItem(SPLIT_PERSIST_KEY, JSON.stringify({ leftW: state.leftW, chatW: state.chatW, chapterW: state.chapterW, chatSide: state.chatSide }))
      } catch { /* 隐私模式/序列化失败：本次不持久化 */ }
    }

    // ── 控制台手动排序持久化（UX-008 / DEC-017⑤）dsh.novel.order.v1 = [novelId,…] ──
    // 读写只在事件回调（切手动态 / 拖拽换位）中发生——渲染期零副作用；异常忽略回退默认顺序。
    const ORDER_PERSIST_KEY = 'dsh.novel.order.v1'
    const CONSOLE_COLLAPSE_N = 8
    function loadOrderSaved() {
      try {
        const raw = localStorage.getItem(ORDER_PERSIST_KEY)
        if (raw === null) return null
        const arr = JSON.parse(raw)
        if (!Array.isArray(arr)) return null
        const ids = arr.filter((x) => typeof x === 'string' && x !== '')
        return ids.length > 0 ? ids : null
      } catch { return null }
    }
    function persistOrder(ids) {
      try { localStorage.setItem(ORDER_PERSIST_KEY, JSON.stringify(ids)) } catch { /* 隐私模式等：本次不持久化 */ }
    }

    /** 边距容差相等（UX-014④⑤ 真 Bug 修复核心）：CSSOM 把长度值写回时按 ≤6 位
     *  有效数字序列化——实测 '1066.6875px' 写入后读回 '1066.69px'。让位观察器
     *  原按字符串全等比较，本引擎自身的 applyMargin（⇄ 换边 / 聊天分隔线拖拽触发）
     *  在分数几何（colW 非整数）下写入分数边距，读回归一化值 ≠ 引擎记录的原始串 →
     *  观察器把自伤误判为「外部接管」→ close()。数值容差比较：'' 与 '' 相等；
     *  可解析数字差 < 0.5px 视为同一（外部接管为面板宽度级差异，远超 0.5px）。 */
    function sameMargin(a, b) {
      if (a === b) return true
      const ea = a === '' || a === null || a === undefined
      const eb = b === '' || b === null || b === undefined
      if (ea || eb) return ea && eb
      const pa = parseFloat(a)
      const pb = parseFloat(b)
      if (Number.isNaN(pa) || Number.isNaN(pb)) return false
      return Math.abs(pa - pb) < 0.5
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
      chapterW: CHAPTER_W_DEFAULT,
      chatSide: 'right',
      root: null,
      header: null,
      viewArea: null,
      savedMarginLeft: '',
      savedMarginRight: '',
      savedMarginTop: '',
      savedWidth: '',
      observer: null,
      fallback: null,
      yieldObserver: null,
      lastMarginLeft: '',
      lastMarginRight: '',
      lastMarginTop: '',
      // UX-014⑧：分栏侧独立「本插件自发切换」豁免令牌——与管理台 ⑩ 效应共用
      // pluginOpened 集合会互相吞令牌（两个组件同一 current 变更都要判断，先执行
      // 的效应消费后后执行的失效），实测自动链「开→即关」；各自独立令牌互不干扰。
      pluginOpenTokens: new Set(),
      listeners: new Set(),

      snapshot() {
        return {
          active: this.active,
          novelId: this.novelId,
          geom: this.geom === null ? null : { ...this.geom },
          leftW: this.leftW,
          chatW: this.chatW,
          chapterW: this.chapterW,
          chatSide: this.chatSide,
        }
      },

      /** 打开（novelId 用于反选：同一本再点 = 关闭）。找不到会话根返回 false（不动布局）。
       *  与全屏控制台互斥（DEC-015）：仅在打开成功路径关控制台（见下方 store.set）。 */
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
        this.chapterW = saved !== null && saved.chapterW !== null ? clampNum(saved.chapterW, CHAPTER_W_MIN, CHAPTER_W_MAX) : CHAPTER_W_DEFAULT
        this.chatSide = saved !== null && saved.chatSide !== null ? saved.chatSide : 'right'
        this.root = root
        this.header = header
        this.viewArea = viewArea
        this.savedMarginLeft = viewArea.style.marginLeft
        this.savedMarginRight = viewArea.style.marginRight
        this.savedMarginTop = viewArea.style.marginTop
        this.savedWidth = viewArea.style.width
        this.refreshGeom()
        const g0 = this.geom
        const colW0 = g0 === null ? 0 : g0.right - g0.left
        this.chatW = saved !== null && saved.chatW !== null
          ? clampNum(saved.chatW, CHAT_MIN, Math.max(CHAT_MIN, colW0 - LEFT_MIN - CENTER_MIN))
          : clampNum(Math.round(colW0 * CHAT_DEFAULT_RATIO), CHAT_MIN, Math.max(CHAT_MIN, colW0 - LEFT_MIN - CENTER_MIN))
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
        // 让位观察器：viewArea 的 margin 被外部改写（其他分栏引擎接管）时关闭自身。
        // UX-014④⑤：比较经 sameMargin 数值容差——分数几何下本引擎自己的写回会被
        // CSSOM 归一化（≤6 位有效数字），原字符串全等比较误判自伤（⇄/拖拽即关）。
        try {
          if (typeof MutationObserver === 'function') {
            this.yieldObserver = new MutationObserver(() => {
              if (this.active !== true || this.viewArea === null) return
              if (!sameMargin(this.viewArea.style.marginLeft, this.lastMarginLeft)
                || !sameMargin(this.viewArea.style.marginRight, this.lastMarginRight)) {
                this.close()
              }
            })
            this.yieldObserver.observe(viewArea, { attributes: true, attributeFilter: ['style'] })
          }
        } catch { /* ignore */ }
        // 互斥（DEC-015）：分栏真正打开（会话根就绪）时才关控制台——挤法失败路径
        // 控制台保持打开并显示降级提示（反之：打开控制台先关分栏 closeWorkbench）。
        store.set({ consoleOpen: false, consoleFocus: null })
        this.active = true
        this.notify()
        return true
      },

      /** 会话根失效（切换会话）时重锚定：内容保持不关闭；无会话才关闭。 */
      syncAnchor() {
        if (this.active !== true) return
        const next = findConversationRoot()
        if (next === null) { this.close(); return }
        // UX-018 探针取证修正：会话切换（卡片打开链 sessions.open 换到目标会话）后目标
        // 视图以 phase='hero'（初始/空会话）稳定挂载——原「仅接受 active」的过渡态等待
        // 会把引擎永久卡在旧锚点（重挂载后 live viewArea 永不接受挤压）。重锚定与
        // open() 同口径：有 ok() 根即锚（findConversationRoot 已优先 active；极短过渡
        // 残留根会随下一次 MO 事件重锚自愈）；无会话（next===null）才关闭。
        const header = next.children[0]
        const viewArea = next.children[1]
        if (header === undefined || viewArea === undefined) { this.close(); return }
        if (next === this.root && header === this.header && viewArea === this.viewArea) {
          this.refreshGeom()
          this.applyMargin()
          this.notify()
          return
        }
        if (this.viewArea !== null && this.viewArea.isConnected && this.viewArea !== viewArea) {
          this.viewArea.style.marginLeft = this.savedMarginLeft
          this.viewArea.style.marginRight = this.savedMarginRight
          this.viewArea.style.marginTop = this.savedMarginTop
          this.viewArea.style.width = this.savedWidth
        }
        this.root = next
        this.header = header
        this.viewArea = viewArea
        this.savedMarginLeft = viewArea.style.marginLeft
        this.savedMarginRight = viewArea.style.marginRight
        this.savedMarginTop = viewArea.style.marginTop
        this.savedWidth = viewArea.style.width
        try { if (this.observer !== null) { this.observer.disconnect(); this.observer.observe(next) } } catch { /* ignore */ }
        // UX-014④⑤（N1 备注落实）：让位观察器重挂到新 viewArea——否则重锚定后观察器
        // 仍看旧节点（已卸挂），此后外部 margin 改写不再被检出；也避免旧节点在
        // 复用/重排中被浏览器合并写回时触发误比较。
        try {
          if (this.yieldObserver !== null) {
            this.yieldObserver.disconnect()
            this.yieldObserver.observe(viewArea, { attributes: true, attributeFilter: ['style'] })
          }
        } catch { /* ignore */ }
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

      /** 挤法：chatSide='right' → marginLeft=内容区宽（对话窗贴右）；'left' → 反之。
       *  UX-014⑨（实测取证修正）：不再写 marginTop(TITLE_BAR_H)——本插件浮动标题栏只
       *  覆盖 .nv-split 自身区域（宽 = contentW），与对话窗横向不重叠；推下对话窗在
       *  视口锚定的聊天布局下会把底部/composer 挤出台面（首入截断）。参照
       *  dsh-worktable：其对话窗保持整高，顶部仅与 pane 区重叠。
       *  UX-018 双压：margin 不改变元素 content-box 尺寸——宿主响应式布局（hero
       *  「探索未至之境」居中定位）靠自身尺寸变化（ResizeObserver/宽度重算）触发重排，
       *  用户真实时序「先全宽挂载、后加 margin」无尺寸事件 → 不重排 → hero 保持全宽
       *  坐标（输入框中心 ~667），挤压后仅露右缘碎片 =「渲染异常」。显式 width = 当前
       *  clamp 后 chatW → border-box 真变小 → 宿主必然重排，两种挂载时序统一；
       *  视图区原有内联 width 以本值覆盖（savedWidth 由 open/syncAnchor 记录，
       *  close/换根恢复）；无根/降级分支（geom===null）不写。 */
      applyMargin() {
        const viewArea = this.viewArea
        const g = this.geom
        if (viewArea === null || g === null) return
        const colW = g.right - g.left
        this.chatW = clampNum(this.chatW, CHAT_MIN, Math.max(CHAT_MIN, colW - LEFT_MIN - CENTER_MIN))
        const contentW = Math.max(0, colW - this.chatW)
        this.lastMarginLeft = this.chatSide === 'left' ? '' : contentW + 'px'
        this.lastMarginRight = this.chatSide === 'left' ? contentW + 'px' : ''
        viewArea.style.marginLeft = this.lastMarginLeft
        viewArea.style.marginRight = this.lastMarginRight
        viewArea.style.width = this.chatW + 'px'
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

      /** UX-015③：章节列表列宽（120–360px，持久化 chapterW）。 */
      setChapterW(w) {
        this.chapterW = clampNum(Math.round(w), CHAPTER_W_MIN, CHAPTER_W_MAX)
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
          this.viewArea.style.width = this.savedWidth
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

    /** 关闭工作台（带章节脏稿守卫）：Esc / ✕ / 打开控制台前共用；成功关闭返回 true（用户取消 = false）。 */
    function closeWorkbench(t) {
      if (store.get().chapterDirty === true) {
        try {
          if (typeof window !== 'undefined' && typeof window.confirm === 'function'
            && window.confirm(t !== undefined ? t('dirtyCloseConfirm') : '当前章节有未保存的修改，关闭工作台将丢失，确定？') !== true) return false
        } catch { /* confirm 不可用：继续关闭 */ }
      }
      novelSplit.close()
      return true
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
    function launchMsgOf(novels, id, title, forceNew) {
      const n = novels.find((x) => x.id === id)
      const isNew = forceNew === true || (n !== undefined && (n.completedStages ?? []).length === 0 && (n.totalChapters ?? 0) === 0)
      return (isNew ? '开始小说创作工作流' : '继续小说创作工作流') + `：《${title}》（目录 ${id}）`
    }

    // ── 动作控制器（模块级；apply 时注入 api / sessions 服务）──────────────
    const launcher = {
      api: null,
      sessions: null,
      seq: 0,
      pluginOpened: new Set(),
      setup(opts) {
        launcher.api = opts.api
        launcher.sessions = opts.sessions
      },
      apiHas(domain, method) {
        return launcher.api !== null && launcher.api !== undefined && launcher.api[domain] !== undefined
          && typeof launcher.api[domain][method] === 'function'
      },
      /** sessions.open（服务面）；服务缺席返回 false。
       *  UX-010④：自发切换的目标会话记入 pluginOpened（一次性豁免）——控制台的
       *  current 联动只关「用户点侧栏其他会话」，本插件路径（卡片打开/找到会话/
       *  新建/绑定链）各自显式关控制台或走挤法降级保持打开，不因 current 变化误关。 */
      open(sessionId) {
        const s = launcher.sessions
        if (s === null || s === undefined || typeof s.open !== 'function') return false
        try {
          s.open(sessionId)
          launcher.pluginOpened.add(sessionId)
          // UX-014⑧：分栏侧独立豁免令牌（见 novelSplit.pluginOpenTokens 注释）
          try { novelSplit.pluginOpenTokens.add(sessionId) } catch { /* ignore */ }
          return true
        } catch { return false }
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

    // ── 打开创作工作台共享链（UX-014⑦）────────────────────────────────────
    /** 控制台卡片与侧栏抽屉卡片共用的「打开某书到创作工作台」控制器（单一事实源——
     *  与 NvConsole 旧 openBook 同一逻辑，不复制第三份）：已绑定 → 切会话+开分栏；
     *  未绑定 → 开卡自动链（workspace 定位 → 建会话 → 挂预设 → 写绑定 → 打开）；
     *  会话失效 → 引导重绑；降级 → 提示。ctx = { t, bindings, degraded, wsRoot,
     *  notice(msg), setBusy(bool) }——UI 消费点各自提供提示面与忙碌态。 */
    const openCtl = {
      busy: false,
      async open(novel, st, ctx) {
        if (openCtl.busy === true) return
        if (ctx.degraded === true) { ctx.notice(ctx.t('sessionsMissing')); return }
        if (st === 'stale') { store.set({ bind: { novelId: novel.id, stale: true } }); return }
        if (st === 'none') { await openCtl.autoCreate(novel, ctx); return }
        if (confirmSwitchSelect(novel.id, ctx.t) !== true) return
        ctx.notice('')
        launcher.open(ctx.bindings[novel.id])
        // 分栏打开时互斥自动关控制台；挤法失败（无会话根）降级 = 保持现状 + 提示
        launcher.ensureSplit(novel.id, () => ctx.notice(ctx.t('openFailHint')))
      },
      /** 未绑定书目首次点击：自动创建会话并关联（UX-013 链；无 prompt——启动归创作台 ▶）。 */
      async autoCreate(novel, ctx) {
        if (!launcher.apiHas('sessions', 'create')) { ctx.notice(ctx.t('apiError')); return }
        openCtl.busy = true
        if (typeof ctx.setBusy === 'function') ctx.setBusy(true)
        try {
          // a) 优先 workspaceId（会话进入工作区组）；workspace.list 不可用/未命中 → root+id 构造 cwd
          let createArg = ctx.wsRoot !== '' ? { cwd: joinNovelRoot(ctx.wsRoot, novel.id) } : { cwd: novel.id }
          try {
            if (launcher.apiHas('workspace', 'list')) {
              const wr = await launcher.api.workspace.list({})
              if (wr.result.ok === true && Array.isArray(wr.result.value?.items)) {
                const hit = wr.result.value.items.find((w) => w.path === ctx.wsRoot)
                if (hit !== undefined && hit !== null) createArg = { workspaceId: hit.workspaceId }
              }
            }
          } catch { /* workspace.list 失败 → 回退 cwd 构造 */ }
          const r1 = await launcher.api.sessions.create(createArg)
          if (r1.result.ok !== true) { ctx.notice(ctx.t('sessionCreatePrefix') + rpcErr(r1.result)); return }
          const sessionId = r1.result.value !== null && r1.result.value !== undefined ? r1.result.value.sessionId : undefined
          if (typeof sessionId !== 'string' || sessionId === '') { ctx.notice(ctx.t('sessionCreatePrefix') + ctx.t('unknownErr')); return }
          // b) 预设挂载：失败 → 明确告知（会话已建）并停止——未挂预设不绑定不打开（可手动重试）
          try {
            if (launcher.apiHas('agentPresets', 'select')) {
              const r2 = await launcher.api.agentPresets.select({ sessionId, agentPreset: 'novel-writing' })
              if (r2.result.ok !== true) throw new Error(rpcErr(r2.result))
            }
          } catch (e) {
            ctx.notice(ctx.t('presetFailPrefix') + errOf(e) + ctx.t('presetFailHint'))
            return
          }
          // c) 绑定：失败仅提示，不阻断打开
          const b = await launcher.bindSession(novel.id, sessionId)
          if (b.ok !== true) ctx.notice(ctx.t('bindFailPrefix') + (b.error === 'api' ? ctx.t('apiError') : b.error))
          if (confirmSwitchSelect(novel.id, ctx.t) !== true) return
          // d) 打开 + 分栏（挤法失败降级 = 保持现状 + 提示）
          launcher.open(sessionId)
          launcher.ensureSplit(novel.id, () => ctx.notice(ctx.t('openFailHint')))
          if (b.ok === true) ctx.notice(ctx.t('autoBindDone', novel.title))
        } catch (e) {
          ctx.notice(ctx.t('sessionCreatePrefix') + errOf(e))
        } finally {
          openCtl.busy = false
          if (typeof ctx.setBusy === 'function') ctx.setBusy(false)
        }
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
      // UX-015③：章节列表列宽（默认 160px，可拖拽 120–360px；拖拽只改组件内列宽，
      // 不触 viewArea 边距——让位观察器/几何引擎不受影响）
      const chapterW = typeof props.chapterW === 'number' && Number.isFinite(props.chapterW) ? props.chapterW : CHAPTER_W_DEFAULT
      const listRef = useRef(null)
      const chapterDividerHandler = (e) => {
        e.preventDefault()
        const target = e.currentTarget
        try { target.setPointerCapture(e.pointerId) } catch { /* ignore */ }
        // 基准 = 拖拽起始列宽 + 位移（列左缘/分隔线间距无关；指针捕获下事件连续）
        const init = { x: e.clientX, w: chapterW }
        const onMove = (ev) => {
          if (typeof props.onChapterW !== 'function') return
          props.onChapterW(init.w + (ev.clientX - init.x))
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

      const confirmLoseDraft = () => dirty !== true || window.confirm('当前章节有未保存的修改，放弃并切换？')

      const select = (num) => {
        if (!confirmLoseDraft()) return
        setSelected(num)
        setMode('read')
        setNotice('')
        // UX-035：文件视图打开时点章节 → 退出文件视图，跳到该章节显示
        if (props.fileSel !== null && typeof props.onFileClose === 'function') props.onFileClose()
      }

      const startEdit = () => {
        if (active === null) return
        setDraft(active.content ?? '')
        setBaseDraft(active.content ?? '')
        setMode('edit')
        setNotice('')
        // UX-035：文件视图打开时点「编辑」→ 退出文件视图进入该章节编辑
        if (props.fileSel !== null && typeof props.onFileClose === 'function') props.onFileClose()
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
            el('div', { className: 'nv-scroll', style: { border: '1px solid ' + TK.line, borderRadius: '8px', padding: '12px', maxHeight: '560px', overflow: 'auto' } },
              renderContent(active.content ?? '')),
          )

      const editView = active === null
        ? null
        : el('div', null,
            el('textarea', {
              className: 'nv-scroll',
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

      // UX-032（用户「分割线无法选中，只有红框位置才能点击调整」——行 gap:12px 使拖拽命中区
      // 与可见分割线（chlist 右缘线）隔开 12px：抓线命中不了，只有 12px 外的隐藏 4px 区可拖）：
      // 移除行 gap——chdiv 命中区与列右缘齐平；内容列 paddingLeft 12px 保留间距（VS Code sash：
      // 命中区紧贴面板边缘）
      return el('div', { style: { display: 'flex', height: '100%' } },
        el('div', { ref: listRef, className: 'nv-chlist', style: { width: chapterW + 'px' } },
          el('div', { style: title }, t('chapters')),
          // UX-019②+UX-021：行 = 「第N章 名称」——无装饰圆点（用户批注「不要圆点」），
          // 名称独立 span 截断 ellipsis；空名称回退仅「第N章」（不再显示字数；
          // published ✓ / 门禁 ⚠ 标记沿用）
          list.map((c) => {
            const cName = typeof c.name === 'string' ? c.name : ''
            const marks = `${c.published ? ' ✓' : ''}${c.gate !== null && c.gate.passed === false ? ' ⚠' : ''}`
            return el('button', {
              key: c.num,
              onClick: () => select(c.num),
              style: {
                display: 'flex', alignItems: 'center', gap: '4px', width: '100%', boxSizing: 'border-box',
                textAlign: 'left', margin: '2px 0', padding: '4px 8px',
                borderRadius: '6px', border: '1px solid ' + TK.line, background: selected === c.num || (selected === null && c.num === list[0].num) ? TK.fillHover : 'transparent',
                cursor: 'pointer', fontSize: '12px', color: TK.text,
              },
            }, cName === ''
              ? el('span', { style: { flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `第${c.num}章${marks}`)
              : [
                  el('span', { key: 'no', style: { flex: 'none' } }, `第${c.num}章`),
                  el('span', { key: 'nm', style: { flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TK.text2 } }, cName),
                  marks === '' ? null : el('span', { key: 'mk', style: { flex: 'none' } }, marks),
                ])
          }),
        ),
        el('div', { className: 'nv-chdiv', role: 'separator', title: t('resizeChlist'), 'aria-label': t('resizeChlist'), onPointerDown: chapterDividerHandler }),
        el('div', { className: 'nv-scroll', style: { flex: 1, minWidth: 0, overflow: 'auto', paddingLeft: '12px' } },
          // UX-034：文件选中 → 内容列复用章节显示界面渲染文件（关闭回章节视图）
          props.fileSel !== null
            ? el(FilePreview, { novelId: props.novelId, path: props.fileSel, onClose: () => props.onFileClose() })
            : (mode === 'read' ? readView : editView)),
      )
    }

    // ── 工作流右侧面板 ──────────────────────────────────────────────────
      // ── 工作流阶段定义（UX-041：标题栏居中统计横幅与左窗清单共用）──
      const NOVEL_STAGES = [
        ['work_type_selection', '作品类型'], ['platform_research', '平台调研'], ['competitor_analysis', '竞品分析'],
        ['genre_selection', '题材选择'], ['novel_confirmation', '作品确认'], ['creation_planning', '创作规划'],
        ['outline_writing', '大纲生成'], ['outline_review', '大纲三审'], ['chapter_outline', '章节细纲'],
        ['chapter_outline_review', '细纲三审'], ['content_generation', '正文生成'], ['human_ai_collaboration', 'AI 合规'],
        ['quality_review', '质量审查'], ['launch_strategy', '上架发布'], ['monetization_strategy', '变现策略'],
        ['data_monitoring', '数据监控'], ['reader_interaction', '读者互动'],
        ['opening_optimization', '开篇优化（可选）'], ['novel_style_learning', '风格学习（可选）'],
      ]

    function WorkflowPanel(props) {
      const t = props.t
      const novel = props.novel
      const state = novel.state ?? {}
      const info = state.project_info ?? {}
      const guardrails = state.guardrails ?? {}
      const stats = state.statistics ?? {}
      const stages = NOVEL_STAGES
      const currentStage = state.current_stage ?? null
      const known = stages.some(([id]) => id === currentStage)
      const stageName = (stages.find(([id]) => id === currentStage) ?? [])[1] ?? currentStage ?? '—'
      return el('div', null,
        el('div', { style: title }, t('workflow')),
        // UX-041：阶段+统计回到标题栏居中展示——左窗工作流面板不重复（门禁/清单/请求）
        el('div', { style: card },
          el('div', { style: { margin: '2px 0', color: TK.text } }, `${t('gates')}：`),
          el('div', { style: hint }, `发布 ${guardrails.release_allowed ? '✓' : '✗'} · 变现 ${guardrails.monetization_allowed ? '✓' : '✗'}`),
          el('div', { style: hint }, `AI路径 ${guardrails.latest_ai_path ?? '未评估'} · 偏离度 ${guardrails.latest_drift_score ?? '—'}`),
        ),
        el('div', { style: card },
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

    /** 收集目录全部路径（'a' / 'a/b' 形式，与 FileTreeNode 路径构造一致）——
     *  文件树默认折叠集初始化（UX-014③）。 */
    function collectDirPaths(root) {
      const out = []
      const walk = (node, prefix) => {
        for (const d of Object.values(node.dirs)) {
          const p = prefix === '' ? d.name : prefix + '/' + d.name
          out.push(p)
          walk(d, p)
        }
      }
      walk(root, '')
      return out
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
      // UX-034：复用章节显示界面——文件视图渲染于中窗内容列（外层 nv-scroll 滚动，
      // 无 maxHeight 截断/无上边线嵌卡样式；头部 = 文件路径 + 关闭）
      return el('div', null,
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' } },
          el('span', { style: { fontSize: '13px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TK.text } }, '📄 ' + props.path),
          el('button', { style: { ...btn, fontSize: '11px', padding: '1px 6px' }, onClick: close }, '✕'),
        ),
        state.loading ? el('div', { style: hint }, '加载中…')
          : state.error !== null ? el('div', { style: { ...hint, color: TK.danger } }, state.error)
          : state.data.tooLarge === true ? el('div', { style: hint }, `文件过大（${state.data.size}B），请用编辑器打开`)
          : /\.md$/.test(props.path)
            ? el('div', { style: { fontSize: '12px', lineHeight: 1.8 } }, renderContent(state.data.content ?? ''))
            : el('pre', { style: { fontSize: '11px', margin: 0, whiteSpace: 'pre-wrap' } }, state.data.content ?? ''),
      )
    }

    /** 左窗文件树（UX-014①③）+UX-034：创作工作台关联具体小说——左窗只保留当前书目的
     *  novel-project 文件树（目录**默认全部折叠**）；折叠态内部自持，文件选中态由
     *  SplitWorkspace 持有（fileSel 受控）——文件内容显示在中窗内容列（复用章节显示
     *  界面），左窗不再渲染 FilePreview 小卡片。 */
    function LeftNav(props) {
      const t = props.t
      const detail = props.detail
      const selectedId = props.selectedId
      const [collapsed, setCollapsed] = useState(() => new Set())
      const fileSel = props.fileSel
      const onFileSel = props.onFileSel
      const collapseInitRef = useRef(false)
      const toggle = (name) => setCollapsed((prev) => {
        const next = new Set(prev)
        if (next.has(name)) next.delete(name)
        else next.add(name)
        return next
      })
      const tree = useMemo(() => buildTree(detail !== null ? detail.files ?? [] : []), [detail])
      // UX-014③：首次拿到书目文件树时把全部目录路径置入折叠集（默认全部收起）；
      // detail 未到或树无目录时等待下轮。之后用户展开优先（不被刷新重置）。
      useEffect(() => {
        if (collapseInitRef.current === true) return undefined
        if (detail === null || detail === undefined) return undefined
        const dirs = collectDirPaths(tree)
        if (dirs.length === 0) return undefined
        collapseInitRef.current = true
        setCollapsed(new Set(dirs))
        return undefined
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [detail])
      const head = (text) => el('div', { style: { fontSize: '11px', fontWeight: 700, color: TK.text3, margin: '8px 0 4px', letterSpacing: '0.05em' } }, text)
      return el('div', { className: 'nv-scroll', style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'auto' } },
        head('文件'),
        el(FileTreeNode, { node: tree, depth: 0, collapsed, onToggle: toggle, selected: fileSel, onSelect: onFileSel }),
        // UX-034：文件内容不再内嵌左窗——由中窗内容列复用章节显示界面渲染
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
      // 业务配置（工作区根目录、平台发布/数据抓取、小说↔会话绑定）统一在两级工作台
      // （UX-011：小说管理工作台 = 侧栏抽屉+控制台；小说创作工作台 = 分栏工作区）：
      //   工作区根目录 → 管理控制台顶部「切换 / 新建工作区…」对话框（UX-014①：
      //   创作工作台左窗已收敛为当前书目文件树，不再放工作区行）；
      //   平台配置 → 分栏「发布」页签；绑定/删除 → 控制台卡片 🔗/🗑。
      return el('div', { style: { padding: '16px', maxWidth: '760px' } },
        el('div', { style: title }, '小说写作（插件设置）'),
        el('div', { style: { ...hint, margin: '4px 0 10px' } },
          '业务相关的配置不在本页：工作区根目录在小说管理工作台控制台顶部「切换 / 新建工作区…」对话框（选中即切换；UX-014 起创作工作台左窗仅展示当前书目文件树），各平台发布模式/命令/数据抓取在工作台「发布」页签的「⚙ 平台发布配置」，小说与会话的绑定及删除经小说管理工作台控制台卡片上的 🔗/🗑 管理。'),
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
          const cwd = meta.root !== '' ? joinNovelRoot(meta.root, target.novelId) : target.novelId
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

    // ── 工作台控制台（UX-007 / DEC-015）：几何与互斥辅助 ─────────────────
    /** 侧栏容器探测（参照 dsh-worktable findSidebar）：从抽屉挂载点向上找 sidebar（aside/nav 或 className 含 sidebar）。 */
    let nvDrawerEl = null
    function setNvDrawerEl(el) { nvDrawerEl = el }
    function findSidebarEl() {
      if (typeof document === 'undefined' || document === null) return null
      let el = nvDrawerEl
      while (el !== null && el !== undefined && el !== document.body) {
        const tag = typeof el.tagName === 'string' ? el.tagName.toLowerCase() : ''
        if (tag === 'aside' || tag === 'nav') return el
        if (typeof el.className === 'string' && /SidebarRoot|sidebar/i.test(el.className)) return el
        el = el.parentElement
      }
      try { return document.querySelector('aside, nav, [class*="SidebarRoot"], [class*="sidebar"]') ?? null } catch { /* ignore */ }
      return null
    }

    /** 打开控制台（同源互斥：分栏先关——脏稿确认失败则不打开）。 */
    function openConsole(t, focusId) {
      if (novelSplit.active === true && closeWorkbench(t) !== true) return false
      store.set({ consoleOpen: true, consoleFocus: focusId === undefined || focusId === null ? null : focusId })
      return true
    }
    /** 标题行反选语义：开/关控制台。 */
    function toggleConsole(t) {
      if (store.get().consoleOpen === true) { store.set({ consoleOpen: false, consoleFocus: null }); return true }
      return openConsole(t, null)
    }

    // ── 侧栏抽屉（sidebar.footer.action novel-drawer）──────────────────
    /** 抽屉书目卡片（纯主入口）：书名 / 阶段·章数·字数 / 绑定状态点；
     *  UX-014⑦ 点击 = **直接进入创作工作台**（跳过管理控制台）——未绑定走开卡自动建
     *  会话链（openCtl.autoCreate），已绑定直接 open（与控制台卡片同一条链）。 */
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
      const open = () => props.onOpen(novel.id, st)
      return el('div', {
        className: 'nv-card',
        'data-on': props.active === true ? 'true' : undefined,
        role: 'button',
        tabIndex: 0,
        onClick: open,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } },
      },
        el('div', { className: 'nv-row' },
          degraded === true ? null : el(BindDot, { st, title: st === 'stale' ? t('stale') : st === 'none' ? t('unbound') : '' }),
          el('span', { className: 'nv-card-title' }, novel.title),
        ),
        el('div', { className: 'nv-card-sub' }, subBits.join(' · ')),
      )
    }

    /** 侧栏抽屉（纯主入口，无按钮组）：标题行（整体可点 = 开/关控制台，反选语义）+
     *  书目卡片列表（UX-014⑦：点击 = 直接进入创作工作台，不再打开管理控制台）。 */
    function NovelDrawer(props) {
      const t = makeT(localeSnapshot())
      const wide = props.wide !== false
      const splitSnap = useSplitSnap()
      const appSnap = useStore()
      // UX-014⑦：直达链的提示面（自动建会话/挤法失败/降级等反馈行）
      const [openNotice, setOpenNotice] = useState('')
      // 图标栏模式（wide=false）停表：不渲染书目，不做后台轮询
      const poll = usePoll(() => apiJson('/novel-writing/api/overview'), 2500, [], wide === true)
      const overview = poll.data
      const novels = overview !== null ? overview.novels ?? [] : []
      const bindings = overview !== null && overview.bindings !== null && typeof overview.bindings === 'object' ? overview.bindings : {}
      const degraded = props.useSessions === null || launcher.sessions === null || launcher.sessions === undefined
      // UX-013（批注③）：entryLabel 拆 emoji/文字（📖 16px + 文字 13px 分节点渲染；无空格整体回退）
      const drawerTitle = /^(\S+)\s+(.*)$/.exec(t('entryLabel'))

      // 侧栏折叠为图标栏（wide=false）：仅渲染一个 📖 图标入口（开/关控制台）
      if (wide !== true) {
        return el('button', {
          type: 'button', className: 'nv-mini', ref: setNvDrawerEl, title: t('entryLabel'), 'aria-label': t('entryLabel'),
          onClick: () => toggleConsole(t),
          style: { width: 'auto', height: 'auto', padding: '6px', fontSize: '14px', margin: '2px auto', display: 'flex' },
        }, '📖')
      }

      return el('div', { className: 'nv-drawer', ref: setNvDrawerEl },
        el('div', { className: 'nv-sep' }),
        el('button', {
          type: 'button', className: 'nv-drawer-head', title: t('entryLabel'), 'aria-label': t('entryLabel'),
          onClick: () => toggleConsole(t),
        },
          // UX-013（批注③）：标题行字大一档（13px/600），📖 拆出独立 16px 节点（与控制台标题同型）
          el('span', { className: 'nv-drawer-title' },
            drawerTitle !== null ? el('span', { className: 'nv-drawer-title-ico', 'aria-hidden': true }, drawerTitle[1]) : null,
            drawerTitle !== null ? drawerTitle[2] : t('entryLabel')),
          el('span', { className: 'nv-drawer-caret', 'aria-hidden': true }, appSnap.consoleOpen === true ? '▾' : '▸'),
        ),
        poll.error !== null
          ? el('div', { style: { ...hint, color: TK.danger } }, t('apiError'))
          : novels.length === 0
            ? el('div', { className: 'nv-empty', style: { margin: '3px 0' } }, t('drawerEmpty'))
            : novels.map((n) => el(DrawerBookCard, {
                key: n.id, t, novel: n,
                active: (splitSnap.active === true && splitSnap.novelId === n.id) || (appSnap.consoleOpen === true && appSnap.consoleFocus === n.id),
                boundId: bindings[n.id] ?? null, useSessions: props.useSessions, degraded,
                // UX-014⑦：点击 = 直接进入创作工作台（通过 openCtl 单链——与控制台卡片同一函数）
                onOpen: (id, st) => {
                  const novel = novels.find((x) => x.id === id)
                  if (novel === undefined) return
                  openCtl.open(novel, st, {
                    t, bindings, degraded,
                    wsRoot: overview !== null && typeof overview.root === 'string' ? overview.root : '',
                    notice: (msg) => setOpenNotice(msg),
                    setBusy: () => {},
                  })
                },
              })),
        openNotice !== '' ? el('div', { className: 'nv-drawer-notice', style: { margin: '3px 0 4px', fontSize: '11px', color: TK.text3, whiteSpace: 'normal', wordBreak: 'break-all' } }, openNotice) : null,
      )
    }

    // ── 工作台控制台（shell.overlay nv-console）──────────────────────────
    /** 绑定状态双圆点：○○ 空心（未绑定）/ ●● 实心（已绑定 idle）／busy=accent 蓝双闪 / need=黄 / done=绿 / stale=红空心。 */
    function BindDualDot(props) {
      const st = props.st ?? 'none'
      return el('span', { className: 'nv-cdot', 'data-bound': st, title: props.title ?? '', 'aria-hidden': true })
    }

    /** 控制台小说卡片：玻璃拟态 + 状态行（章/字/发布/变现/信号）+ 绑定双圆 + 最近更新 + 数据摘要 + 图标操作
     *  （UX-008④：无 ▶ 打开——主体点击即打开；手动态可拖拽换位；UX-013 批注②.4：➤ 启动钮已删——仅剩 🔗/🗑）。 */
    function ConsoleNovelCard(props) {
      const t = props.t
      const novel = props.novel
      const degraded = props.degraded
      const boundId = props.boundId
      const useSessions = props.useSessions
      // hook 恒定调用（boundId 判空移入 selector）：绑定写入后 boundId 从 null 变值不会改变 hook 数
      const entry = useSessions !== null
        ? useSessions((s) => (boundId !== null && boundId !== undefined ? s.byId[boundId] ?? null : null))
        : null
      const st = boundId === null || boundId === undefined ? 'none' : statusOfEntry(entry)
      const glow = st === 'busy' ? 'busy' : st === 'need' ? 'need' : st === 'done' ? 'done' : null

      const metrics = props.detail !== null && props.detail !== undefined && Array.isArray(props.detail.metrics) ? props.detail.metrics : []
      const metric = metrics.length > 0 ? metrics[metrics.length - 1] : null
      const signalsN = props.detail !== null && props.detail !== undefined && Array.isArray(props.detail.signals) ? props.detail.signals.length : 0
      const relFlag = novel.releaseAllowed === true ? '✓' : '✗'
      const monFlag = novel.monetizationAllowed === true ? '✓' : '✗'
      const fmtAt = (iso) => {
        if (typeof iso !== 'string' || iso === '') return '—'
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return '—'
        const p = (n) => String(n).padStart(2, '0')
        return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
      }
      const metricBits = metric === null ? [] : [
        metric.完读率 !== undefined && metric.完读率 !== null ? `${t('readRate')} ${metric.完读率}%` : null,
        metric.读完率 !== undefined && metric.读完率 !== null ? `${t('finishRate')} ${metric.读完率}%` : null,
        metric.追读 !== undefined && metric.追读 !== null ? `${t('retention')} ${metric.追读}%` : null,
        metric.日增收藏 !== undefined && metric.日增收藏 !== null ? `${t('collections')} ${metric.日增收藏}` : null,
        metric.收益 !== undefined && metric.收益 !== null ? `${t('revenue')} ${metric.收益}` : null,
      ].filter((b) => b !== null)
      const dataText = metricBits.length > 0
        ? metricBits.join(' · ') + (typeof metric.date === 'string' ? ' · ' + metric.date : '')
        : t('noData')

      const open = () => props.onOpen(novel, st)
      return el('div', {
        className: 'nv-ccard',
        'data-nv-id': novel.id,
        'data-glow': glow !== null ? glow : undefined,
        'data-focus': props.focused === true ? 'true' : undefined,
        'data-dragging': props.dragging === true ? 'true' : undefined,
        'data-dragover': props.dragOver === true ? 'true' : undefined,
        draggable: props.draggable === true ? true : undefined,
        role: 'button',
        tabIndex: 0,
        title: novel.title,
        onClick: open,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } },
        onDragStart: props.onDragStart !== undefined ? (e) => props.onDragStart(novel.id, e) : undefined,
        onDragOver: props.onDragOver !== undefined ? (e) => props.onDragOver(novel.id, e) : undefined,
        onDrop: props.onDrop !== undefined ? (e) => props.onDrop(novel.id, e) : undefined,
        onDragEnd: props.onDragEnd,
      },
        st === 'busy' ? el('span', { className: 'nv-csweep', 'aria-hidden': true }) : null,
        el('div', { className: 'nv-ccard-head' },
          el('span', { className: 'nv-ccard-icon', 'aria-hidden': true }, '📖'),
          el('span', { className: 'nv-ccard-name' }, novel.title),
          el('span', { className: 'nv-ccard-badge' }, novel.stage ?? t('notStarted')),
        ),
        el('div', { className: 'nv-ccard-status' },
          degraded === true ? null : el(BindDualDot, { st, title: st === 'stale' ? t('stale') : st === 'none' ? t('unbound') : '' }),
          el('span', { className: 'nv-ccard-sub' }, `${novel.totalChapters}章 · ${novel.totalWords}${t('words')} · ${t('rel')}${relFlag} · ${t('mon')}${monFlag} · ${t('sig')}${signalsN}`),
        ),
        el('div', { className: 'nv-ccard-data' }, dataText),
        el('div', { className: 'nv-cmeta' }, `${t('updatedAt')} ${fmtAt(novel.lastUpdated)}`),
        el('div', { className: 'nv-ccard-actions' },
          el('button', { type: 'button', className: 'nv-cico', title: st === 'stale' ? t('bindStaleHint') : t('bindBtn'), 'aria-label': t('bindBtn'), onClick: (e) => { e.stopPropagation(); props.onBind(novel.id, st) } }, '🔗'),
          // UX-011：🗑 删除（与 🔗 平级 22×22；不依赖会话服务——降级态仍可用；P-07 仅显式确认后触发）
          // UX-013（批注②.4）：➤ 启动工作流钮已删——启动动作下放创作台标题栏「▶ 开始/继续工作流」
          el('button', { type: 'button', className: 'nv-cico nv-cico-del', title: t('delBtn'), 'aria-label': t('delBtn'), onClick: (e) => { e.stopPropagation(); props.onDelete(novel) } }, '🗑'),
        ),
      )
    }

    /**
     * 工作台控制台（UX-007 / DEC-015 + UX-008 / DEC-017 + UX-009 视觉精修 + UX-010 批注 4 点）：全屏管理浮层
     * （覆盖「内容区」不遮侧栏；与 novel-split 互斥）。几何 = findConversationRoot
     * bounding rect（视口绝对边缘）；无会话根/失效降级 = 左侧取侧栏右缘（探测失败
     * 280px 兜底），top=0、右/下=视口边缘（渲染层换算显式宽高，不用 inset 拉伸）；
     * ResizeObserver + body MutationObserver(data-phase) 跟随重定位（无会话保持降级
     * 定位）。内容布局（DEC-017）：头部（标题/路径/紧邻路径的切换工作区钮/✕）→
     * 网格上方排序控制 → 卡片网格（+ 折叠行 + ＋ 磁贴）→ 底部居中大药丸搜索行。
     * UX-010④：打开期间用户点侧栏其他会话（sessions.list current 变化）自动关控制台
     * （见组件内 sessionsCurrent 联动 effect）。
     */
    function NvConsole(props) {
      const t = makeT(localeSnapshot())
      const api = props.api
      const snap = useStore()
      const open = snap.consoleOpen === true
      const [geom, setGeom] = useState(null)
      const [kw, setKw] = useState('')
      const [creating, setCreating] = useState(false)
      const [dirName, setDirName] = useState('')
      const [createBusy, setCreateBusy] = useState(false)
      const [createNotice, setCreateNotice] = useState('')
      const [busy, setBusy] = useState(false)
      const [notice, setNotice] = useState('')
      // UX-008⑤：排序（'default' = overview 顺序 / 'manual' = 拖拽顺序）+ 折叠 + 拖拽视觉
      const [sortMode, setSortMode] = useState('default')
      const [manualOrder, setManualOrder] = useState(null) // novelId[]；null = 未初始化（切手动态时才读持久，渲染期零副作用）
      const [expanded, setExpanded] = useState(false)      // >8 本折叠态（false = 仅渲染前 8）
      const dragIdRef = useRef(null)                       // 拖拽中卡片 id（dragover 连续换位用，不驱动渲染）
      const [dragId, setDragId] = useState(null)           // 拖拽中卡片 id（半透明视觉）
      const [overId, setOverId] = useState(null)           // 拖拽落点卡片 id（accent 虚线框视觉）

      // 会话快照（「找到的会话」搜索 + 卡片状态点）；服务缺席 = 降级（双圆隐藏、打开/绑定禁用）
      const sessionsAll = props.useSessions !== null
        ? (props.useSessions((s) => ({ ids: Array.isArray(s.ids) ? s.ids : [], byId: s.byId ?? {} })) ?? null)
        : null

      // ── UX-010④ 会话联动：控制台打开期间用户点侧栏其他会话（sessions.list current
      // 变化）→ 自动退出工作台界面（参照 dsh-worktable「项目打开期间切会话→自动关项目」）。
      // 守卫：ref 首次快照只记基准不关（防挂载初始 current 误关）；prev 为 null 的变化
      // （新页 sessions 快照异步就位 null→X）只刷新基准不关——仅「有前值的真实切换」
      // X→Y 才关；插件自发切换（launcher.pluginOpened 一次性豁免）不走此关闭——那些
      // 路径已显式关控制台或走挤法降级保持打开。useSessions 为 null（服务缺席）=
      // 无此联动（降级）。
      const sessionsCurrent = props.useSessions !== null
        ? (props.useSessions((s) => (typeof s.current === 'string' ? s.current : null)) ?? null)
        : null
      const prevCurrentRef = useRef(null)
      const currentSeededRef = useRef(false)
      useEffect(() => {
        if (currentSeededRef.current !== true) {
          currentSeededRef.current = true
          prevCurrentRef.current = sessionsCurrent
          return undefined
        }
        if (prevCurrentRef.current === sessionsCurrent) return undefined
        const prev = prevCurrentRef.current
        prevCurrentRef.current = sessionsCurrent
        if (sessionsCurrent === null || prev === null) return undefined // 就位/失联：仅刷新基准
        if (launcher.pluginOpened.has(sessionsCurrent)) {
          launcher.pluginOpened.delete(sessionsCurrent)
          return undefined
        }
        if (store.get().consoleOpen === true) store.set({ consoleOpen: false, consoleFocus: null })
        return undefined
      }, [sessionsCurrent])

      // 数据面：overview + 每本书 detail（信号/metrics）一次拉齐；仅控制台打开时轮询
      const poll = usePoll(async () => {
        const ov = await apiJson('/novel-writing/api/overview')
        const novels = ov !== null && Array.isArray(ov.novels) ? ov.novels : []
        const details = {}
        await Promise.all(novels.map(async (n) => {
          try { details[n.id] = await apiJson('/novel-writing/api/novel?id=' + encodeURIComponent(n.id)) } catch { details[n.id] = null }
        }))
        return { overview: ov, details }
      }, 2500, [open], open)

      const overview = poll.data !== null ? poll.data.overview : null
      const details = poll.data !== null ? poll.data.details : null
      const novels = overview !== null && Array.isArray(overview.novels) ? overview.novels : []
      const bindings = overview !== null && overview.bindings !== null && typeof overview.bindings === 'object' ? overview.bindings : {}
      const degraded = props.useSessions === null || launcher.sessions === null || launcher.sessions === undefined

      // ── UX-008⑤ 顺序化 + 过滤 + 折叠（派生数据，effects 与渲染共用）──
      // 顺序：默认 = overview 顺序；手动 = 持久顺序 + 未见过的书尾插（参照 dsh-worktable effectiveOrder）。
      const knownIds = novels.map((n) => n.id)
      const orderedNovels = sortMode !== 'manual' ? novels : (() => {
        const known = new Set(knownIds)
        const stored = (manualOrder ?? []).filter((id) => known.has(id))
        const seen = new Set(stored)
        const byId = new Map(novels.map((n) => [n.id, n]))
        return [...stored, ...knownIds.filter((id) => !seen.has(id))].map((id) => byId.get(id))
      })()
      const kwL = kw.trim().toLowerCase()
      const visibleNovels = kwL === ''
        ? orderedNovels
        : orderedNovels.filter((n) => String(n.title ?? '').toLowerCase().includes(kwL) || String(n.id).toLowerCase().includes(kwL))
      // 折叠：顺序化+过滤后可见数 > 8 时仅渲染前 8 + 展开/折叠行（磁贴前）
      const overLimit = visibleNovels.length > CONSOLE_COLLAPSE_N
      const shownNovels = overLimit !== true || expanded === true ? visibleNovels : visibleNovels.slice(0, CONSOLE_COLLAPSE_N)
      const hiddenCount = visibleNovels.length - shownNovels.length

      // 几何：会话根 rect 覆盖内容区（视口绝对边缘）；无会话/失效 → 降级（左侧=侧栏右缘；top=0；右/下=视口边缘）
      useEffect(() => {
        if (open !== true) return undefined
        let ro = null
        let roRoot = null
        let sro = null
        let mo = null
        let lastGeomKey = ''
        const applyGeom = (g) => {
          const key = `${g.mode}|${g.left}|${g.top}|${g.right}|${g.bottom}`
          if (key === lastGeomKey) return
          lastGeomKey = key
          setGeom(g)
        }
        const measure = () => {
          const root = findConversationRoot()
          if (root !== null && typeof root.getBoundingClientRect === 'function') {
            const r = root.getBoundingClientRect()
            if (r.width > 0 && r.height > 0) {
              if (roRoot !== root) {
                roRoot = root
                try { if (ro !== null) ro.disconnect() } catch { /* ignore */ }
                try {
                  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(measure); ro.observe(root) }
                } catch { /* ignore */ }
              }
              applyGeom({ mode: 'root', left: r.left, top: r.top, right: r.right, bottom: r.bottom })
              return
            }
          }
          const sb = findSidebarEl()
          let left = 280
          if (sb !== null) {
            try {
              const r = sb.getBoundingClientRect()
              if (r.width > 0 && r.height > 0) left = r.right
            } catch { /* ignore */ }
          }
          // 降级几何统一用视口绝对边缘（right/bottom=视口右/下缘），渲染层换算显式宽高——渲染期不读 window
          const vw = typeof window === 'undefined' ? 0 : window.innerWidth
          const vh = typeof window === 'undefined' ? 0 : window.innerHeight
          applyGeom({ mode: 'fallback', left, top: 0, right: vw, bottom: vh })
        }
        measure()
        try {
          const sb = findSidebarEl()
          if (sb !== null && typeof ResizeObserver === 'function') { sro = new ResizeObserver(measure); sro.observe(sb) }
        } catch { /* ignore */ }
        try {
          if (typeof MutationObserver === 'function' && typeof document !== 'undefined' && document.body !== null) {
            mo = new MutationObserver(measure)
            mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase'] })
          }
        } catch { /* ignore */ }
        try { if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('resize', measure) } catch { /* ignore */ }
        return () => {
          try { if (ro !== null) ro.disconnect() } catch { /* ignore */ }
          try { if (sro !== null) sro.disconnect() } catch { /* ignore */ }
          try { if (mo !== null) mo.disconnect() } catch { /* ignore */ }
          try { if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('resize', measure) } catch { /* ignore */ }
        }
      }, [open])

      // Esc：先关新建弹窗，再关控制台（绑定/工作区对话框开在其上时让位）。
      // UX-012：新建弹窗 busy 中（创建请求在飞）不关——避免请求完成后无处落 notice。
      useEffect(() => {
        if (open !== true) return undefined
        const onKey = (e) => {
          if (e.key !== 'Escape') return
          const s = store.get()
          if (s.bind !== null || s.entryOpen === true) return
          if (creating === true) {
            if (createBusy !== true) { setCreating(false); setCreateNotice('') }
            return
          }
          store.set({ consoleOpen: false, consoleFocus: null })
        }
        try { if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('keydown', onKey) } catch { /* ignore */ }
        return () => { try { if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('keydown', onKey) } catch { /* ignore */ } }
      }, [open, creating, createBusy])

      // 聚焦书目：数据到达后滚动到卡片并保持高亮（[data-focus]）；聚焦书落在折叠尾部时先展开再滚。
      // UX-012：novels.length 入 deps——创建成功即置 consoleFocus，但新卡片要等下一轮
      // 轮询（≤2.5s）才进树；列表长度变化时补一次滚动（dataLoaded 布尔不随刷新翻转）。
      const dataLoaded = poll.data !== null
      useEffect(() => {
        if (open !== true || snap.consoleFocus === null || snap.consoleFocus === undefined) return undefined
        if (typeof document === 'undefined' || document === null) return undefined
        const node = document.querySelector('.nv-ccard[data-nv-id="' + snap.consoleFocus + '"]')
        if (node !== null) {
          try { if (typeof node.scrollIntoView === 'function') node.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) } catch { /* ignore */ }
        } else if (expanded !== true && visibleNovels.some((n) => n.id === snap.consoleFocus)) {
          setExpanded(true) // 折叠态隐藏了聚焦书：先展开（deps 含 expanded，下轮再滚动）
        }
        return undefined
      }, [open, snap.consoleFocus, dataLoaded, expanded, kwL, novels.length])

      if (open !== true) return null

      const closeConsole = () => { if (busy !== true) store.set({ consoleOpen: false, consoleFocus: null }) }
      // UX-012：新建弹窗关闭（遮罩点击/✕/取消共用）；busy（创建请求在飞）禁关
      const closeCreate = () => { if (createBusy !== true) { setCreating(false); setCreateNotice('') } }

      // ── UX-014⑦：打开创作工作台共享单链（openCtl，单一事实源）──
      // 原 UX-013 开卡自动链（workspace.list 命中 root → workspaceId/cwd 回退 →
      // sessions.create → agentPresets.select → bindSession → confirmSwitchSelect →
      // launcher.open + ensureSplit；busy 防连点；自动链无 prompt——启动归创作台 ▶）
      // 与控制台 openBook 分支整体收口到 openCtl——侧栏抽屉卡片直接复用同一函数。
      const openBook = (novel, st) => openCtl.open(novel, st, {
        t, bindings, degraded, wsRoot,
        notice: (msg) => setNotice(msg),
        setBusy,
      })

      // UX-013（批注②.4）：卡片 ➤ 启动工作流函数已删（launch/promptLaunch 的卡片消费点退役）；
      // promptLaunch 保留——创作台标题栏「▶ 开始/继续工作流」（SplitWorkspace）仍复用。

      // ── UX-011：删除小说（小说管理工作台职责）。P-07：仅用户在 confirm 弹窗显式
      // 确认后触发，无任何自动删除路径；confirm 不可用 = fail-closed 不删除。
      // 不依赖会话服务（degraded 降级态仍可用）；绑定键删除走 settings.mutate unset
      // （UX-013 探针实测：deep-merge 的 settings.update 无法表达键级删除，
      // 读-合并-整表写会使残留键保留——旧宿主无 mutate 时回退，失败仅提示不阻断）；
      // 删除成功后轮询自然刷新书目列表（≤2.5s）。
      const removeBook = async (novel) => {
        let confirmed = false
        try {
          if (typeof window === 'undefined' || typeof window.confirm !== 'function') return
          confirmed = window.confirm(t('delConfirm', novel.title, novel.id)) === true
        } catch { return }
        if (confirmed !== true) return
        try {
          const r = await apiJson('/novel-writing/api/novel-delete', { novel: novel.id })
          if (r.ok !== true) { setNotice(t('delFailPrefix') + (typeof r.error === 'string' ? r.error : 'unknown')); return }
        } catch (e) {
          setNotice(t('delFailPrefix') + errOf(e))
          return
        }
        // UX-013（探针实测修复）：绑定键删除必须走 settings.mutate 的 unset 路径操作——
        // settings.update 是 deep-merge patch（dsh-settings mergeLayers），键级删除无法表达：
        // 读-合并-整表写会把「缺键的整表」再并入旧表，键实际保留（probe 实测 binding 残留）。
        // mutate 不可用时回退旧读-合并-整表写（仅尽力而为，并提示失败）。
        if (launcher.apiHas('settings', 'mutate')) {
          try {
            const m = await launcher.api.settings.mutate({ ns: 'novel-writing', ops: [{ op: 'unset', path: ['bindings', novel.id] }] })
            if (m.result.ok !== true) setNotice(t('delBindFailPrefix') + rpcErr(m.result))
          } catch (e) { setNotice(t('delBindFailPrefix') + errOf(e)) }
        } else if (launcher.apiHas('settings', 'update')) {
          try {
            const fresh = await apiJson('/novel-writing/api/overview')
            const cur = fresh !== null && typeof fresh === 'object' && fresh.bindings !== null && typeof fresh.bindings === 'object' ? fresh.bindings : {}
            if (cur[novel.id] !== undefined) {
              const next = { ...cur }
              delete next[novel.id]
              const b = await launcher.api.settings.update({ ns: 'novel-writing', patch: { bindings: next } })
              if (b.result.ok !== true) setNotice(t('delBindFailPrefix') + rpcErr(b.result))
            }
          } catch (e) { setNotice(t('delBindFailPrefix') + errOf(e)) }
        }
        // 删除的是当前聚焦书时清 consoleFocus（焦点指向已不存在的卡片）
        if (store.get().consoleFocus === novel.id) store.set({ consoleFocus: null })
        setNotice(t('delDone', novel.title))
      }

      // ── UX-012：新建 = 仅创建。自动启动链（sessions.create→预设挂载→绑定→
      // 打开分栏→发指令）整体退役——创建之后所有动作点卡片进创作工作台进行
      // （启动归「▶ 开始工作流」钮，绑定归卡片 🔗 / 绑定面板）。表单仅目录名：
      // novel-create 只传 { name }——宿主 createProject 对缺省 title 默认
      // title=name（lib/index.js createProject），卡片名=目录名直到工作流定书名。
      const runCreate = async () => {
        if (createBusy) return
        const name = dirName.trim()
        if (name === '') { setCreateNotice(t('nameRequired')); return }
        setCreateBusy(true)
        setCreateNotice('')
        try {
          const r = await apiJson('/novel-writing/api/novel-create', { name })
          // 成功：关弹窗 + 控制台 notice 指引下一步 + selected/consoleFocus 就位新书
          // （点击卡片即进创作台；卡片本体要等下一轮 overview 轮询 ≤2.5s 后出现）
          setCreating(false)
          setDirName('')
          setCreateNotice('')
          store.set({ selected: r.id, consoleFocus: r.id })
          setNotice(t('createDoneHint', r.title ?? r.id))
        } catch (e) {
          setCreateNotice(t('createFailPrefix') + errOf(e))
        } finally {
          setCreateBusy(false)
        }
      }

      // ── UX-008⑤ 排序控制 + 拖拽换位（参照 dsh-worktable sortBtn 两态 + 管理模式 HTML5 拖拽）──
      // 切手动态：首次进入读持久顺序（事件回调内读 localStorage，渲染期零副作用）；无持久/失效回退 overview 顺序。
      const enterManual = () => {
        setSortMode('manual')
        if (manualOrder === null) {
          const saved = loadOrderSaved()
          setManualOrder(saved !== null ? saved : knownIds.slice())
        }
      }
      // dragover 落点换位（与参考实现同型：splice 移除再插入，实时重排 + 持久化）
      const moveManual = (id, targetId) => {
        if (id === targetId) return
        const list = orderedNovels.map((n) => n.id)
        const from = list.indexOf(id)
        const to = list.indexOf(targetId)
        if (from < 0 || to < 0) return
        list.splice(from, 1)
        list.splice(to, 0, id)
        setManualOrder(list)
        persistOrder(list)
      }
      const onCardDragStart = (id, e) => {
        dragIdRef.current = id
        setDragId(id)
        try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id) } catch { /* ignore */ }
      }
      const onCardDragOver = (id, e) => {
        e.preventDefault()
        if (overId !== id) setOverId(id)
        const d = dragIdRef.current
        if (d !== null && d !== id) moveManual(d, id)
      }
      const onCardDrop = (id, e) => { try { e.preventDefault() } catch { /* ignore */ } }
      const onCardDragEnd = () => { dragIdRef.current = null; setDragId(null); setOverId(null) }

      const foundSessions = kwL !== '' && sessionsAll !== null
        ? sessionsAll.ids.map((id) => sessionsAll.byId[id]).filter((e) => e !== null && e !== undefined
            && (String(e.displayTitle ?? e.id).toLowerCase().includes(kwL) || String(e.id).toLowerCase().includes(kwL)))
        : []
      const wsRoot = overview !== null && typeof overview.root === 'string' ? overview.root : ''
      // UX-009①：entryLabel 拆首 emoji（'📖 小说管理工作台' → 📖 18px + 文字 16px/600 分节点渲染；无空格整体回退）
      const entryTitle = /^(\S+)\s+(.*)$/.exec(t('entryLabel'))

      const g = geom !== null ? geom : { mode: 'fallback', left: 280, top: 0, right: 0, bottom: 0 }
      return el('div', {
        className: 'nv-console',
        // g 为视口绝对坐标（right/bottom 是矩形边缘位置，非 inset 偏移）——必须换算显式宽高：
        // CSS right/bottom 从视口右/下缘向内量，直接填绝对坐标会使宽高 ≈ 0（实测 w=1px/h=0 不可见）
        style: {
          left: g.left + 'px',
          top: g.top + 'px',
          width: Math.max(0, g.right - g.left) + 'px',
          height: Math.max(0, g.bottom - g.top) + 'px',
        },
      },
        el('div', { className: 'nv-console-head' },
          // UX-009①：标题+路径+切换钮 = 左对齐组（头部 gap 8px）；✕ margin-left:auto 保持最右（去掉 headflex 弹性留白）
          el('span', { className: 'nv-console-title', title: t('entryLabel') },
            entryTitle !== null ? el('span', { className: 'nv-console-title-ico', 'aria-hidden': true }, entryTitle[1]) : null,
            entryTitle !== null ? entryTitle[2] : t('entryLabel'),
          ),
          // UX-009①：路径 13px secondary；未设置工作区由裸「—」改为行动指引文案（i18n wsUnset）
          el('span', { className: 'nv-console-ws', title: wsRoot }, wsRoot !== '' ? wsRoot : t('wsUnset')),
          el('button', { type: 'button', className: 'nv-cbtn nv-cbtn-ws', onClick: () => store.set({ entryOpen: true }) }, t('wsSwitch')),
          el('button', { type: 'button', className: 'nv-mini', onClick: closeConsole, 'aria-label': t('closed') }, '✕'),
        ),
        el('div', { className: 'nv-cbody' },
          el('div', { className: 'nv-cinner' },
            foundSessions.length > 0
              ? el('div', { className: 'nv-cfound' },
                  el('div', { className: 'nv-cfound-title' }, t('foundSessions', foundSessions.length)),
                  foundSessions.slice(0, 30).map((e) => el('button', {
                    key: e.id, type: 'button', className: 'nv-srow',
                    onClick: () => { launcher.open(e.id); store.set({ consoleOpen: false, consoleFocus: null }) },
                  },
                    el(BindDot, { st: statusOfEntry(e), title: '' }),
                    el('span', { className: 'nv-srow-title' }, e.displayTitle ?? e.id),
                    el('span', { className: 'nv-srow-sub' }, e.agentPreset === 'novel-writing' ? '✓ ' + e.agentPreset : (e.agentPreset ?? '')),
                  )),
                )
              : null,
            // 工具行：排序控制（UX-008⑤，仅手动态可拖拽）+ 错误/操作提示
            el('div', { className: 'nv-cactions' },
              el('div', { className: 'nv-csort' },
                el('button', { type: 'button', className: 'nv-csortbtn', 'data-on': sortMode === 'default' ? 'true' : undefined, onClick: () => setSortMode('default') }, t('sortDefault')),
                el('button', { type: 'button', className: 'nv-csortbtn', 'data-on': sortMode === 'manual' ? 'true' : undefined, onClick: enterManual }, t('sortManual')),
              ),
              poll.error !== null ? el('span', { className: 'nv-caction-err' }, t('apiError')) : null,
              notice !== '' ? el('span', { className: 'nv-caction-msg' }, notice) : null,
            ),
            visibleNovels.length === 0
              ? el('div', { className: 'nv-empty', style: { margin: '4px 0' } }, novels.length === 0 ? t('drawerEmpty') : t('noMatch'))
              : null,
            el('div', { className: 'nv-cgrid' },
              shownNovels.map((n) => el(ConsoleNovelCard, {
                key: n.id, t, novel: n,
                detail: details !== null ? (details[n.id] ?? null) : null,
                boundId: bindings[n.id] ?? null,
                useSessions: props.useSessions,
                degraded,
                focused: snap.consoleFocus === n.id,
                draggable: sortMode === 'manual',
                dragging: dragId === n.id,
                dragOver: dragId !== null && dragId !== n.id && overId === n.id,
                onDragStart: onCardDragStart,
                onDragOver: onCardDragOver,
                onDrop: onCardDrop,
                onDragEnd: onCardDragEnd,
                onOpen: openBook,
                onDelete: removeBook,
                onBind: (id, st) => {
                  if (degraded) { setNotice(t('sessionsMissing')); return }
                  store.set({ bind: { novelId: id, stale: st === 'stale' } })
                },
              })),
              overLimit === true
                ? el('button', {
                    key: 'nv-cfold', type: 'button', className: 'nv-cfold',
                    onClick: () => setExpanded(expanded ? false : true),
                  }, expanded === true ? t('collapse') : t('expandAll', hiddenCount))
                : null,
              // ＋ 新建虚线磁贴（UX-008③，对照 dsh-wt_presetAdd）：网格末尾、不参与排序/拖动、过滤时始终显示
              el('button', {
                key: 'nv-cplus', type: 'button', className: 'nv-cplus',
                title: t('plusTitle'), 'aria-label': t('plusTitle'),
                onClick: () => { setCreating(true); setCreateNotice('') },
              },
                el('span', { className: 'nv-cplus-icon', 'aria-hidden': true }, '＋')),
            ),
          ),
        ),
        // 底部居中大药丸搜索行（UX-008②：搜索引擎风格；行为不变——同滤小说卡片与「找到的会话」）
        el('div', { className: 'nv-cfoot' },
          el('div', { className: 'nv-csearch' },
            el('span', { className: 'nv-csearch-icon', 'aria-hidden': true }, '🔍'),
            el('input', { type: 'text', value: kw, placeholder: t('searchPh'), 'aria-label': t('searchPh'), onChange: (e) => setKw(e.target.value) }),
            kw !== ''
              ? el('button', { type: 'button', className: 'nv-csearch-clear', 'aria-label': t('searchClear'), title: t('searchClear'), onClick: () => setKw('') }, '✕')
              : null,
          ),
        ),
        // 新建小说居中模态（UX-012：全屏遮罩 + 居中卡片，几何复用 WorkspaceDialog 视觉
        // 模式；开合仍由 creating 驱动）。表单仅目录名；按钮仅「创建/取消」——创建
        // 成功即关窗（runCreate 内），不自动启动工作流。
        creating === true
          ? el('div', { className: 'nv-cmodal-backdrop', onClick: closeCreate },
              el('div', {
                className: 'nv-cmodal',
                // 卡片内点击不冒泡到遮罩（否则点「创建」会随即触发 closeCreate 关窗——探针实测）
                onClick: (e) => e.stopPropagation(),
              },
                el('div', { className: 'nv-cmodal-head' },
                  el('span', { className: 'nv-cmodal-title' }, t('newNovelBtn')),
                  el('button', { type: 'button', className: 'nv-mini', onClick: closeCreate, 'aria-label': t('closed') }, '✕'),
                ),
                el('input', {
                  className: 'nv-cinput', placeholder: t('dirPlaceholder'), value: dirName, disabled: createBusy,
                  autoFocus: true, 'aria-label': t('dirPlaceholder'),
                  onChange: (e) => setDirName(e.target.value),
                  onKeyDown: (e) => { if (e.key === 'Enter') runCreate() },
                }),
                el('div', { className: 'nv-cbtns' },
                  el('button', { type: 'button', className: 'nv-cbtn-accent', disabled: createBusy, onClick: () => runCreate() }, createBusy ? '…' : t('createBtn')),
                  el('button', { type: 'button', className: 'nv-cbtn', disabled: createBusy, onClick: closeCreate }, t('cancel')),
                ),
                createNotice !== '' ? el('div', { className: 'nv-cform-err' }, createNotice) : null,
              ),
            )
          : null,
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
     * （📖 书名 · 阶段徽标 · 状态点 · ▶ 开始/继续工作流（UX-012）· ⇄ 换边 · ✕）
     * + 主行 [左窗 | 竖分隔线 | 中窗]。UX-014：左窗仅当前书目 novel-project 文件树
     * （①工作区行/书目列表已移除；③目录默认折叠）；⇄/✕ 28×28 醒目钮（⑥）；
     * 打开期间点侧栏其他会话 → 关闭分栏（⑧）。UX-015：标题栏加高放大（①）、
     * 中窗章节页签章节列名 + 可拖宽（②③）。
     */
    function SplitWorkspace(props) {
      const t = makeT(localeSnapshot())
      const snap = useSplitSnap()
      const appSnap = useStore()
      const [tab, setTab] = useState('data')
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

      // ── UX-034：左窗文件选中态提升到 SplitWorkspace——文件内容在**中窗内容列**复用
      // 章节显示界面（同一 nv-scroll 阅读区），不再在左窗小卡片挤压；切书复位
      const [fileSel, setFileSel] = useState(null)
      useEffect(() => { setFileSel(null) }, [selectedId])

      // ── UX-012④：标题栏「▶ 开始/继续工作流」（创建后所有启动动作归位创作台）──
      const [launchBusy, setLaunchBusy] = useState(false)
      const [barNotice, setBarNotice] = useState(null) // { kind: 'ok'|'err'|'info', text }
      // hook 恒定调用（服务缺席判空在外层 JS；绑定条目在渲染层按 boundId 查表）
      const sessionsById = props.useSessions !== null
        ? (props.useSessions((s) => (s.byId !== null && typeof s.byId === 'object' ? s.byId : {})) ?? {})
        : null

      // Esc 全局关闭（仅 active 时挂监听）
      useEffect(() => {
        if (snap.active !== true) return undefined
        const onKey = (e) => { if (e.key === 'Escape') closeWorkbench(t) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [snap.active])

      // ── UX-024：滚动条「滚动中显示、停止后自动隐藏」——滚动容器（.nv-chlist / .nv-scroll）
      // 发生 scroll 时加 .nv-scl（thumb 显现），1.5s 无滚动自动撤除（用户实测后将初始
      // 600ms 延长；不做悬停常驻显影；拖动拇指期间 scroll 事件连续 → 保持显现；
      // :active 高亮见样式）。捕获监听覆盖滚轮/拖动/程序性滚动；卸载时清全部计时器。
      useEffect(() => {
        const timers = new Map()
        const revive = (el) => {
          if (!(el instanceof Element)) return
          el.classList.add('nv-scl')
          const prev = timers.get(el)
          if (prev !== undefined) clearTimeout(prev)
          timers.set(el, setTimeout(() => { el.classList.remove('nv-scl'); timers.delete(el) }, 1500))
        }
        const onScroll = (e) => {
          const el = e.target
          if (el instanceof Element && (el.classList.contains('nv-chlist') || el.classList.contains('nv-scroll'))) revive(el)
        }
        document.addEventListener('scroll', onScroll, true)
        return () => {
          document.removeEventListener('scroll', onScroll, true)
          for (const t of timers.values()) clearTimeout(t)
          timers.clear()
        }
      }, [])

      // ── UX-014⑧ 会话联动：创作工作台打开期间用户点侧栏其他会话（sessions.list
      // current 变化）→ 关闭分栏（对齐管理台 UX-010④ 行为；经 closeWorkbench 带章节
      // 脏稿守卫）。守卫与 NvConsole 同款：首次快照只记基准不关（防挂载误关）；
      // prev 为 null 的变化（新页 sessions 快照异步就位 null→X）只刷新基准不关；
      // 本插件自发切换（novelSplit.pluginOpenTokens 独立豁免令牌——卡片打开/自动建
      // 会话链/找到会话/绑定链）不因 current 变化误关；useSessions 为 null 无此联动。
      const splitCurrent = props.useSessions !== null
        ? (props.useSessions((s) => (typeof s.current === 'string' ? s.current : null)) ?? null)
        : null
      const splitPrevRef = useRef(null)
      const splitSeededRef = useRef(false)
      useEffect(() => {
        if (splitSeededRef.current !== true) {
          splitSeededRef.current = true
          splitPrevRef.current = splitCurrent
          return undefined
        }
        if (splitPrevRef.current === splitCurrent) return undefined
        const prev = splitPrevRef.current
        splitPrevRef.current = splitCurrent
        if (splitCurrent === null || prev === null) return undefined // 就位/失联：仅刷新基准
        // 本插件自发切换：用分栏侧独立令牌（不与管理台 ⑩ 效应共用消费集——共用
        // 先执行者吞令牌，分栏 ⑧ 效应拿不到豁免会把自动链开出的分栏立即关掉）
        if (novelSplit.pluginOpenTokens.has(splitCurrent)) {
          novelSplit.pluginOpenTokens.delete(splitCurrent)
          return undefined
        }
        if (snap.active === true) closeWorkbench(t)
        return undefined
      }, [splitCurrent, snap.active])

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
        // UX-036/042：工作流状态已迁左窗；数据/发布/请求页签迁入中窗下半区工作台（章节区常驻上半区）
        ['data', t('data')], ['publish', t('publish')], ['requests', t('requests')],
      ]

      const boundId = current !== undefined ? bindings[current.id] ?? null : null

      // UX-041：标题栏居中「阶段+统计」横幅数据（阶段本地化名 / 章数·字数整体统计）
      const curStage = current !== undefined ? (current.stage ?? null) : null
      const titleStageName = (NOVEL_STAGES.find(([id]) => id === curStage) ?? [])[1] ?? curStage
      const detailStats = detail !== null && detail !== undefined
        ? `${detail.state?.statistics?.total_chapters ?? 0} 章 · ${detail.state?.statistics?.total_words ?? 0} ${t('words')}`
        : ''

      // 启动钮三态判定：降级（会话服务缺席）/ 未绑定 / 会话失效（绑定 id 不在 sessions 快照）
      const degraded = props.useSessions === null || launcher.sessions === null || launcher.sessions === undefined
      const boundEntry = boundId !== null && sessionsById !== null ? (sessionsById[boundId] ?? null) : null
      // 新书（completedStages 空且 0 章）=「开始」；旧书 =「继续」（与 launchMsgOf 同判据）
      const isNewBook = current !== undefined && (current.completedStages ?? []).length === 0 && (current.totalChapters ?? 0) === 0

      // ▶ 开始/继续工作流：降级提示不执行；未绑定→提示并弹绑定面板（同卡片 🔗 路径）；
      // 会话失效→提示重绑（stale 标记）；已绑定→复用 promptLaunch 发开始/继续指令（busy 防连点）。
      const launchWorkflow = async () => {
        if (launchBusy) return
        if (current === undefined) return
        if (degraded) { setBarNotice({ kind: 'err', text: t('sessionsMissing') }); return }
        const sid = bindings[current.id]
        if (sid === undefined || sid === null) {
          setBarNotice({ kind: 'info', text: t('bindFirstHint') })
          store.set({ bind: { novelId: current.id, stale: false } })
          return
        }
        if (boundEntry === null) {
          setBarNotice({ kind: 'err', text: t('bindStaleHint') })
          store.set({ bind: { novelId: current.id, stale: true } })
          return
        }
        setLaunchBusy(true)
        setBarNotice(null)
        const r = await launcher.promptLaunch(sid, current, novels)
        setLaunchBusy(false)
        setBarNotice(r.ok === true
          ? { kind: 'ok', text: t('launchSentPrefix') + r.msg }
          : { kind: 'err', text: t('promptFailPrefix') + (r.error === 'api' ? t('apiError') : r.error) + t('promptFailHint') })
      }

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
              // UX-011 两级工作台：分栏 = 小说创作工作台（标题 ·《书名》）
              t('creationTitle', current !== undefined ? current.title : (snap.novelId ?? '')),
            ),
            // UX-041：标题栏居中「阶段+统计」横幅（用户箭头指定：标题栏内挪动居中位置，
            // 配整体统计信息、优化呈现）——阶段名徽标 + 绑定状态点 ○ + 章·字数统计
            el('div', { style: { position: 'absolute', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', lineHeight: '18px', color: 'var(--dsw-alias-label-secondary,#9aa4b2)', whiteSpace: 'nowrap' } },
              titleStageName !== null
                ? el('span', { style: { fontSize: '13px', fontWeight: 600, padding: '0 7px', borderRadius: '8px', background: 'var(--dsw-alias-fill-l1,rgba(255,255,255,.06))', color: 'var(--dsw-alias-label-secondary,#9aa4b2)' } }, `${t('stage')}：${titleStageName}`)
                : null,
              props.useSessions !== null && boundId !== null
                ? el(TitleDot, { useSessions: props.useSessions, boundId, t })
                : null,
              detailStats !== ''
                ? el('span', { style: { color: 'var(--dsw-alias-label-tertiary,#6e7683)' } }, detailStats)
                : null,
            ),
            // UX-012④：启动/绑定提示条（三态可操作反馈；ok=绿 err=红 info=次级灰）
            barNotice !== null
              ? el('span', { className: 'nv-bar-note', 'data-kind': barNotice.kind, title: barNotice.text }, barNotice.text)
              : null,
            // UX-012④：▶ 开始/继续工作流（accent 实底；新书「开始」/旧书「继续」；busy 防连点）
            current !== undefined
              ? el('button', {
                  type: 'button', className: 'nv-bar-launch',
                  title: isNewBook === true ? t('startWorkflow') : t('continueWorkflow'),
                  disabled: launchBusy,
                  onClick: launchWorkflow,
                }, launchBusy ? '…' : (isNewBook === true ? t('startWorkflow') : t('continueWorkflow')))
              : null,
            el('button', {
              // UX-014⑥：⇄ 醒目化（28×28 带边框变体，与管理台头部 ✕ 统一）
              type: 'button', className: 'nv-bar-ctl', title: t('flipChat'), 'aria-label': t('flipChat'),
              onClick: () => novelSplit.setChatSide(snap.chatSide === 'left' ? 'right' : 'left'),
            }, '⇄'),
            el('button', {
              // UX-014⑥：✕ 醒目化（28×28 带边框变体，与管理台头部 ✕ 统一）
              type: 'button', className: 'nv-bar-ctl', title: t('closeSplit'), 'aria-label': t('closeSplit'),
              onClick: () => closeWorkbench(t),
            }, '✕'),
          ),
          el('div', { className: 'nv-main' },
            collapsedLeft === true ? null : el('div', { className: 'nv-left', style: { width: leftW + 'px' } },
              // UX-036：左窗一分为二——上=文件树（可滚），下=工作流状态（阶段/门禁/请求列表）
              el(LeftNav, {
                // key=selectedId：切书时强制重挂——文件树默认折叠初始化按书独立（UX-014③）
                key: selectedId, t, detail, selectedId,
                // UX-034：文件选中态提升（左窗仅树；文件内容在中窗内容列复用章节界面）
                fileSel, onFileSel: setFileSel,
              }),
              detail !== null
                ? el('div', { className: 'nv-scroll', style: { flex: '0 0 auto', maxHeight: '78%', minHeight: 0, overflow: 'auto', borderTop: '1px solid var(--dsw-alias-border-l2,#3a4150)', paddingTop: '8px', boxSizing: 'border-box' } },
                    el(WorkflowPanel, { t, novel: detail }))
                : null,
            ),
            collapsedLeft === true ? null : el('div', { className: 'nv-vdiv', role: 'separator', title: t('collapseLeft'), onPointerDown: leftDividerHandler }),
            el('div', { style: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box', overflow: 'hidden' } },
              // UX-042：中窗=上下两个工作台——上部：章节工作台（常驻，章节区不再做页签）；
              // 下部：数据/发布/请求 工作台（页签从顶部迁移至此红框区）
              el('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden' } },
                novels.length === 0
                  ? el('div', { style: { padding: '16px' } },
                      el('div', { style: title }, t('noNovels')),
                      el('div', { style: hint }, t('noNovelsHint')),
                    )
                  : null,
                detail !== null
                  ? el('div', { style: { height: '100%', overflow: 'hidden' } },
                      el(ChapterPanel, { t, api: props.api, novel: detail, novelId: selectedId, pollMs, chapterW: snap.chapterW, onChapterW: (w) => novelSplit.setChapterW(w), fileSel, onFileClose: () => setFileSel(null) }))
                  : null,
              ),
              el('div', { style: { flex: '0 0 46%', minHeight: 0, display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--dsw-alias-border-l2,#3a4150)', paddingTop: '8px', boxSizing: 'border-box' } },
                el('div', { className: 'nv-tabs' },
                  tabs.map(([id, name]) => el('button', {
                    key: id, type: 'button', className: 'nv-tab', 'data-on': tab === id ? 'true' : undefined, onClick: () => setTab(id),
                  }, name)),
                  detail !== null && detail.signals.length > 0
                    ? el('span', { style: { fontSize: '12px', color: TK.warn, alignSelf: 'center' } }, `⚠ ${detail.signals.length}`)
                    : null,
                ),
                el('div', { className: 'nv-scroll', style: { flex: 1, minHeight: 0, overflow: 'auto' } },
                  // UX-042：数据/发布/请求 迁入下半区工作台（章节/工作流不再页签）
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
            // UX-030：命中区居中于面板右缘（-2）、纯透明——可见边界线为 .nv-split 全高右边线
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

    // ── 工作区对话框（UX-005 保留 + UX-013 批注①：仅切换 / 新建——会话创建不再由此触发）──
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

      // UX-013（批注①）：工作区对话框仅「切换 / 新建」——会话创建不再由此触发。
      // 选中某项 = 切换工作区：settings.update workspaceRoot=path（服务端下次 listNovels/
      // overview 即按新根返回书目，控制台 ≤2.5s 轮询自动刷新）；成功关窗，失败提示不关。
      const pickWorkspace = async (w) => {
        if (busy) return
        if (w === undefined || w === null) return
        setSelectedId(w.workspaceId)
        if (!apiHas('settings', 'update')) { setNotice({ kind: 'error', text: t('apiError') }); return }
        setBusy(true)
        setNotice({ kind: 'none', text: '' })
        try {
          const r = await api.settings.update({ ns: 'novel-writing', patch: { workspaceRoot: w.path } })
          if (r.result.ok !== true) { setNotice({ kind: 'error', text: t('switchFailPrefix') + rpcErr(r.result) }); return }
          store.set({ entryOpen: false })
        } catch (e) {
          setNotice({ kind: 'error', text: t('switchFailPrefix') + errOf(e) })
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
                    onClick: () => pickWorkspace(w),
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
          phase === 'new'
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
                          el('button', { type: 'button', style: btn, disabled: busy, onClick: () => setPhase('new') }, t('newWorkspaceBtn')),
                        ),
                        // UX-013（批注①）：选中项提示 = 信息性（切换语义 + 已有会话数），仅展示不动作
                        selected !== undefined
                          ? el('div', { style: { ...hint, marginTop: '6px' } }, t('switchHint'))
                          : null,
                        selected !== undefined && (selected.sessionIds ?? []).length > 0
                          ? el('div', { style: { ...hint, marginTop: '2px' } }, t('hasSessionsHint', (selected.sessionIds ?? []).length))
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
      // 侧栏抽屉（纯主入口：标题行可点 = 开/关控制台；UX-013 批注③ 对齐+调宽+字大）
      // 对齐：抽屉是 footerActions flex 子项（slot 包装 display:contents）——flex 项默认为内容宽度
      // （实测 207px vs 工作区列表行 256px），width:100% 使抽屉与侧栏「工作区」列表行同宽同位（左缘均为 12px）。
      '.nv-drawer{margin:2px 0 8px;width:100%;box-sizing:border-box}',
      // 层次：分隔线 l1→l2 加粗；区块底部留白经 .nv-drawer margin-bottom 8px
      '.nv-sep{height:1px;background:var(--dsw-alias-border-l2,#3a4150);margin:4px 0}',
      '.nv-drawer-head{display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;padding:6px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#9aa4b2);font:inherit;cursor:pointer;text-align:left}',
      '.nv-drawer-head:hover{color:var(--dsw-alias-label-primary,#e6e8eb);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      '.nv-drawer-caret{flex:none;font-size:9px;line-height:1;color:var(--dsw-alias-label-tertiary,#6e7683)}',
      // 标题行 11→13px（600，letter-spacing .06em 保持）；📖 拆独立 16px 节点
      '.nv-drawer-title{flex:1;min-width:0;display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:600;letter-spacing:.06em;color:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-drawer-title-ico{flex:none;font-size:16px;line-height:1;font-weight:400}',
      '.nv-mini{flex:none;display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:none;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary,#9aa4b2);font-size:12px;line-height:1;cursor:pointer}',
      '.nv-mini:hover{color:var(--dsw-alias-label-primary,#e6e8eb);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.06))}',
      // UX-013（批注③）字大一档后，UX-015（批注④）再小一档以保持与管理台（nv-console
      // 卡片不动）的层级感：title 14→13px/600、sub 12.5→12px、内边距 8/10→6/8px、
      // 卡间 gap 6→4px（margin 4px 0 相邻塌缩）、状态点 9→8px（仅抽屉卡作用域，
      // 标题栏状态点 .nv-dot 基型保持 9px）、空态随动；圆角 10px 保持
      '.nv-card{display:block;width:100%;box-sizing:border-box;text-align:left;padding:6px 8px;margin:4px 0;border:1px solid var(--dsw-alias-border-l1,#262b36);border-radius:10px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.02));color:var(--dsw-alias-label-primary,#e6e8eb);font:inherit;cursor:pointer}',
      '.nv-card:hover{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      '.nv-card[data-on=true]{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      '.nv-card-title{flex:1;min-width:0;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-card-sub{font-size:12px;color:var(--dsw-alias-label-tertiary,#6e7683);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-row{display:flex;align-items:center;gap:6px;min-width:0}',
      '.nv-empty{padding:8px 10px;border:1px dashed var(--dsw-alias-border-l1,#262b36);border-radius:8px;color:var(--dsw-alias-label-tertiary,#6e7683);font-size:11px;text-align:center}',
      // 状态点（工作中=accent 蓝发光脉冲 / 待决=黄 / 完成=绿 / 会话失效=红 / 未绑定=空心灰）
      // UX-013（批注③）：单点尺寸 8→9px（随卡片字大 +1px）
      '.nv-dot{flex:none;display:inline-block;width:9px;height:9px;border-radius:50%;box-sizing:border-box;border:1.2px solid var(--dsw-alias-label-tertiary,#6e7683);background:transparent}',
      // UX-015（批注④）：状态点 9→8px（仅抽屉卡作用域，标题栏状态点保持 9px 基型；
      // 作用域规则置于基型之后——基型仍可被源码面断言与后续层级规则复用）
      '.nv-card .nv-dot{width:8px;height:8px}',
      // UX-015（批注④）：抽屉空态随卡片小一档（作用域限定，控制台空态不动）
      '.nv-drawer .nv-empty{padding:6px 8px}',
      '.nv-dot[data-st=busy]{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-state-accent-primary,#4f8ef7);box-shadow:0 0 6px var(--dsw-alias-state-accent-primary,#4f8ef7);animation:nv-busy 1.2s ease-in-out infinite}',
      '.nv-dot[data-st=need]{border-color:var(--dsw-alias-state-warning,#d29922);background:var(--dsw-alias-state-warning,#d29922);box-shadow:0 0 6px var(--dsw-alias-state-warning,#d29922)}',
      '.nv-dot[data-st=done]{border-color:var(--dsw-alias-state-success,#3fb950);background:var(--dsw-alias-state-success,#3fb950);box-shadow:0 0 6px var(--dsw-alias-state-success,#3fb950)}',
      '.nv-dot[data-st=stale]{border-color:var(--dsw-alias-state-danger,#e5484d);background:transparent}',
      '@keyframes nv-busy{0%,100%{opacity:1}50%{opacity:.35}}',
      // 分栏工作区（容器 zIndex 900 < 对话框 1000；对话分隔线 901）
      // UX-026（用户「各个区域的分割线……其他分割线非常不明显都快看不清」）：区域分割线
      // 从 border-l1（#262b36 近不可见）提升到 border-l2（#3a4150 清晰可见）——工作台外框/
      // 标题栏底边/左窗右缘，与三条 1px 细拖线同层级，区域分隔清晰。
      // UX-027（用户放大「这里为何是两根线」）：外框右缘与聊天窗拖线重复（相距仅 ~2px，
      // 放大成两根线）→ 外框 border-right:none——聊天边界唯一线 = .nv-chatdiv 拖线
      // UX-029（用户放大「这个线的连接处怎么这么奇怪」）：单容器共享边线布局下圆角是病根——
      // 顶部横线在圆角处截断 + 右缘无框线 + 拖线偏 2px = 断头连接；修复：外框 border-radius:0
      // （直角——VS Code 工作区惯例；参考项目的圆角属独立卡片布局，不适用于共享边线单容器）
      // UX-030（用户放大指认连接线；体系化修正——VS Code sash 语义：可拖分区=纯透明命中区，
      // 可见线=面板边框自身）：外框右缘线恢复（全高 1px border-l2——标题栏横线/内容线在右缘
      // T 型相接，无台阶）；聊天拖线改为透明命中区（无可见线——边界唯一线=外框右缘线）
      '.nv-split{position:fixed;display:flex;flex-direction:column;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,#3a4150);border-radius:0;background:var(--dsw-alias-bg-base,#0b0e14);overflow:hidden;z-index:900}',
      // UX-015（批注①）：标题栏加高放大——高 30→38px、内边距 10→14px、标题 12→14px、
      // 徽标 10→13px（line-height 18px）、«折叠钮 20→24px、栏内边距随之增大；
      // 标题栏纯样式增高（TITLE_BAR_H=38 同步），不触几何引擎——UX-014 已去 marginTop 推下
      '.nv-bar{flex:none;position:relative;display:flex;align-items:center;gap:8px;height:38px;padding:0 14px;box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2,#3a4150);background:var(--dsw-alias-bg-base,#0b0e14)}',
      '.nv-bar-title{flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,#e6e8eb);overflow:hidden;white-space:nowrap}',
      '.nv-badge{flex:none;font-size:13px;line-height:18px;padding:0 6px;border-radius:8px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.06));color:var(--dsw-alias-label-tertiary,#6e7683);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      // UX-015（批注①）：栏内 « 折叠钮随栏放大（作用域限定，全局 .nv-mini 20px 不动）
      '.nv-bar .nv-mini{width:24px;height:24px;font-size:14px;border-radius:6px}',
      '.nv-main{flex:1;min-height:0;display:flex}',
      '.nv-left{flex:none;min-height:0;overflow:auto;padding:8px;box-sizing:border-box}',   // 右缘线由 .nv-vdiv 拖线承担（UX-028：一处边界一条线，避免与拖线双线——调研 VS Code sash/参考项目得）
      // UX-030 体系化（VS Code sash 语义：可拖=透明命中区；可见线=面板边缘线）
      // UX-033（用户「可以拖动调整布局的线不能在选中的时候高亮一下吗？一点都不明显」）：
      // 拖区悬停/按住（hover/active）时 box-shadow 画 1px accent 高亮线（紧贴边界、无布局抖动，
      // 默认不可见保持干净）——选中反馈明显
      '.nv-vdiv{flex:none;width:4px;cursor:col-resize;background:transparent;touch-action:none}',
      '.nv-vdiv:hover,.nv-vdiv:active{box-shadow:inset 1px 0 0 0 var(--dsw-alias-state-accent-primary,#4f8ef7)}',
      '.nv-chatdiv{position:fixed;width:4px;cursor:col-resize;background:transparent;touch-action:none;z-index:901}',
      '.nv-chatdiv:hover,.nv-chatdiv:active{box-shadow:inset 1px 0 0 0 var(--dsw-alias-state-accent-primary,#4f8ef7)}',
      // 树窗右缘线 = .nv-left 自身 border-right（边界线 0 偏移；vdiv 为透明命中区）
      // UX-036：左窗=纵向分栏容器（上=文件树 flex:1 / 下=工作流状态 46%+内部滚动）
      '.nv-left{flex:none;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:8px;box-sizing:border-box;border-right:1px solid var(--dsw-alias-border-l2,#3a4150)}',
      // UX-015（批注③）+UX-022（术语定案：分割条常驻/拖动条滚动中显）+UX-025（细分隔线）+
      // UX-030（体系化）：章节列表列（宽度经 snap.chapterW 内联）+ **右缘线下移为列自身
      // border-right**（0 偏移；.nv-chdiv = 透明命中区——pointer 拖拽 120–360px）+ 浅底侧栏感
      '.nv-chlist{flex:none;min-height:0;overflow-y:auto;overscroll-behavior:contain;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.02));border-right:1px solid var(--dsw-alias-border-l2,#3a4150)}',
      '.nv-chlist button{transition:background .12s ease}',
      '.nv-chdiv{flex:none;width:4px;align-self:stretch;cursor:col-resize;background:transparent;touch-action:none}',
      '.nv-chdiv:hover,.nv-chdiv:active{box-shadow:inset 1px 0 0 0 var(--dsw-alias-state-accent-primary,#4f8ef7)}',
      // UX-022：滚动容器（.nv-chlist / .nv-scroll）滚动条默认隐藏（track/thumb 透明），
      // 容器 hover + thumb hover 才显——「拖动条默认隐藏、拖动/悬停才显示」；
      // overscroll-behavior:contain 防止滚离隔断（章节列/左窗/正文各滚各自的）
      '.nv-scroll{overscroll-behavior:contain}',
      '.nv-chlist::-webkit-scrollbar,.nv-scroll::-webkit-scrollbar{width:8px;background:transparent}',
      '.nv-chlist::-webkit-scrollbar-thumb,.nv-scroll::-webkit-scrollbar-thumb{background:transparent}',
      // UX-024：滚动条「滚动中显示、停止后自动隐藏」——thumb 仅在滚动事件驱动的
      // .nv-scl 显现、空闲 1.5s 撤除（用户实测调长）；拖动拇指（:active）时高亮；
      // UX-031：删除 :hover 悬停即显规则（用户只允许滚动时才显示——悬停显示且高亮会
      // 干扰边界拖区的抓取/视觉，滚动条命中区紧邻边界分割线）
      '.nv-scl::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2,#3a4150)}',
      '.nv-scl::-webkit-scrollbar-thumb:active{background:var(--dsw-alias-state-accent-primary,#4f8ef7)}',
      // 中窗页签
      '.nv-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 8px}',
      '.nv-tab{padding:3px 10px;border:1px solid var(--dsw-alias-border-l1,#262b36);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#9aa4b2);font:inherit;font-size:12px;cursor:pointer;transition:background .12s ease,color .12s ease,border-color .12s ease}',
      '.nv-tab:hover{color:var(--dsw-alias-label-primary,#e6e8eb);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      '.nv-tab[data-on=true]{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      // 对话框（工作区 UX-005 / 绑定面板）
      '.nv-modal-backdrop{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:20px}',
      '.nv-modal{width:480px;max-width:100%;max-height:85vh;overflow:auto;box-sizing:border-box;background:var(--dsw-alias-bg-base,#0b0e14);color:var(--dsw-alias-label-primary,#e6e8eb);border:1px solid var(--dsw-alias-border-l2,#3a4150);border-radius:12px;padding:14px;box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.4));font-size:13px}',
      '.nv-group{margin:6px 0;padding:4px 8px;border-left:2px solid var(--dsw-alias-state-accent-primary,#4f8ef7);border-radius:4px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.04));font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#9aa4b2)}',
      '.nv-srow{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:5px 8px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#e6e8eb);font:inherit;font-size:12px;cursor:pointer;text-align:left}',
      '.nv-srow:hover{background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05));border-color:var(--dsw-alias-border-l2,#3a4150)}',
      '.nv-srow-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-srow-sub{flex:none;font-size:10px;color:var(--dsw-alias-label-tertiary,#6e7683);max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      // 工作台控制台（nv-console，zIndex 950：低于对话框 1000、高于分栏 900；覆盖内容区不遮侧栏）
      '.nv-console{position:fixed;display:flex;flex-direction:column;box-sizing:border-box;background:var(--dsw-alias-bg-base,#0b0e14);border-left:1px solid var(--dsw-alias-border-l1,#262b36);z-index:950;overflow:hidden}',
      '.nv-console-head{flex:none;display:flex;align-items:center;gap:8px;padding:10px 16px;box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l1,#262b36);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.02))}',
      // UX-009①：标题 = 📖 18px + 文字 16px/600；路径 13px；「切换/新建工作区…」accent 边框次填充紧邻路径右侧
      // （头部 gap 8px）；去掉弹性留白 headflex——✕ 经 margin-left:auto 保持最右（标题+路径+按钮左对齐组）
      '.nv-console-title{flex:none;display:inline-flex;align-items:center;gap:6px;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#e6e8eb);white-space:nowrap}',
      '.nv-console-title-ico{flex:none;font-size:18px;line-height:1;font-weight:400}',
      '.nv-console-ws{flex:0 1 auto;min-width:0;max-width:46%;font-size:13px;color:var(--dsw-alias-label-secondary,#9aa4b2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      // UX-010①：头部 ✕ = 菜单级醒目钮（28×28 有边框变体，覆盖裸 .nv-mini 20px 无边框基型；
      // 特异性 (0,2,0) 晚于基型生效，hover 变体 (0,3,0) 再压过基型 hover）；margin-left:auto 保持最右
      '.nv-console-head .nv-mini{margin-left:auto;box-sizing:border-box;width:28px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-l2,#3a4150);border-radius:8px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05));color:var(--dsw-alias-label-secondary,#9aa4b2);font-size:16px;font-weight:600;line-height:1;cursor:pointer}',
      '.nv-console-head .nv-mini:hover{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.1))}',
      // 注意：变体必须用双类选择器（.nv-cbtn.nv-cbtn-ws）——单类与 .nv-cbtn 同特异性且源码序在前，
      // 其 font:inherit/border/background 简写会把 weight/accent 边/次填充整体覆盖回去
      '.nv-cbtn.nv-cbtn-ws{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);color:var(--dsw-alias-state-accent-primary,#4f8ef7);font-weight:600;background:rgba(79,142,247,.12)}',
      '.nv-cbtn.nv-cbtn-ws:hover{color:var(--dsw-alias-label-primary,#e6e8eb);background:rgba(79,142,247,.22)}',
      '.nv-cbody{flex:1;min-height:0;overflow:auto;padding:16px}',
      '.nv-cinner{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:12px}',
      // 底部居中大药丸搜索行（UX-009③ 现代搜索引擎式：48px 高 + 999px 圆角 + bg-base 底 + 投影提容器感 +
      // focus accent 边 + 3px 光环 + 🔍 16px + 输入/占位 15px + width min(640px,100%) 居中）
      '.nv-cfoot{flex:none;display:flex;justify-content:center;padding:14px 24px 18px;box-sizing:border-box;border-top:1px solid var(--dsw-alias-border-l1,#262b36);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.02))}',
      '.nv-csearch{display:flex;align-items:center;gap:10px;width:min(640px,100%);margin:0 auto;height:48px;box-sizing:border-box;padding:0 20px;border:1.5px solid var(--dsw-alias-border-l2,#3a4150);border-radius:999px;background:var(--dsw-alias-bg-base,#0b0e14);box-shadow:0 2px 10px rgba(0,0,0,.12);transition:border-color .15s ease,box-shadow .15s ease}',
      '.nv-csearch:focus-within{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);box-shadow:0 0 0 3px rgba(79,142,247,.25)}',
      '.nv-csearch-icon{flex:none;font-size:16px;line-height:1;color:var(--dsw-alias-label-tertiary,#6e7683)}',
      '.nv-csearch input{flex:1;min-width:0;background:transparent;border:none;outline:none;color:var(--dsw-alias-label-primary,#e6e8eb);font:inherit;font-size:15px;line-height:22px}',
      '.nv-csearch input::placeholder{color:var(--dsw-alias-label-tertiary,#6e7683);font-size:15px}',
      '.nv-csearch-clear{flex:none;display:flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:none;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary,#6e7683);font-size:12px;cursor:pointer}',
      '.nv-csearch-clear:hover{color:var(--dsw-alias-label-primary,#e6e8eb);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.06))}',
      '.nv-cfound{display:flex;flex-direction:column;gap:4px}',
      '.nv-cfound-title{font-size:11px;font-weight:600;letter-spacing:.05em;color:var(--dsw-alias-label-tertiary,#6e7683);padding:0 2px}',
      // 工具行 = 排序控制（UX-008⑤，对照 dsh-wt_sortBtn：等分 pill，选中 accent 边+accent 字）+ 错误/操作提示
      // UX-009④：pill 11→12px；UX-010②：12→13px + padding 7px 14px + 两钮 gap 6→8px（选中态样式不变）
      '.nv-cactions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:-2px}',
      '.nv-csort{display:inline-flex;gap:8px}',
      '.nv-csortbtn{display:flex;align-items:center;justify-content:center;padding:7px 14px;border:1px solid var(--dsw-alias-border-l1,#262b36);border-radius:999px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.02));color:var(--dsw-alias-label-secondary,#9aa4b2);font:inherit;font-size:13px;line-height:16px;cursor:pointer}',
      '.nv-csortbtn:hover{color:var(--dsw-alias-label-primary,#e6e8eb);border-color:var(--dsw-alias-border-l2,#3a4150)}',
      '.nv-csortbtn[data-on=true]{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      '.nv-caction-err{font-size:11px;color:var(--dsw-alias-state-danger,#e5484d)}',
      '.nv-caction-msg{font-size:11px;color:var(--dsw-alias-label-secondary,#9aa4b2)}',
      // 小说卡片网格（UX-009②：minmax(320px,1fr)；UX-010③：gap 16→20px——1120px 控制台宽 − 2×20 gap 后 3 列仍 ≥320px；玻璃拟态 + hover 提亮 + 状态光效）
      '.nv-cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;align-content:start}',
      // UX-010③：卡片 min-height 200→180px（与＋磁贴统一）、padding 16px、圆角 14px（玻璃拟态渐变保留）
      '.nv-ccard{position:relative;display:flex;flex-direction:column;gap:6px;box-sizing:border-box;min-height:180px;padding:16px;border:1px solid var(--dsw-alias-border-l2,#3a4150);border-radius:14px;box-shadow:0 1px 6px rgba(0,0,0,.08);background:linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.02) 45%,rgba(0,0,0,.05)),var(--dsw-alias-fill-l1,rgba(255,255,255,.02));cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease;overflow:hidden}',
      '.nv-ccard:hover{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:linear-gradient(135deg,rgba(255,255,255,.10),rgba(255,255,255,.04) 45%,rgba(0,0,0,.04)),var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}',
      '.nv-ccard[data-focus=true]{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);box-shadow:0 0 0 1px var(--dsw-alias-state-accent-primary,#4f8ef7),0 0 16px rgba(79,142,247,.25)}',
      // 状态光效（对照 dsh-worktable 控制室卡片）：need=黄 / done=绿 / busy=蓝 + 流光扫过
      '.nv-ccard[data-glow=need]{border-color:rgba(210,153,34,.9);box-shadow:0 0 8px rgba(210,153,34,.45),0 0 22px rgba(210,153,34,.25),inset 0 0 14px rgba(210,153,34,.07)}',
      '.nv-ccard[data-glow=done]{border-color:rgba(63,185,80,.9);box-shadow:0 0 8px rgba(63,185,80,.45),0 0 22px rgba(63,185,80,.25),inset 0 0 14px rgba(63,185,80,.07)}',
      '.nv-ccard[data-glow=busy]{border-color:rgba(94,160,255,.9);box-shadow:0 0 8px rgba(94,160,255,.5),0 0 24px rgba(79,142,247,.35)}',
      // 拖拽视觉（UX-008⑤）：拖动中卡片半透明 / 落点 accent 虚线框
      '.nv-ccard[data-dragging=true]{opacity:.45}',
      '.nv-ccard[data-dragover=true]{outline:1.5px dashed var(--dsw-alias-state-accent-primary,#4f8ef7);outline-offset:3px}',
      '.nv-csweep{position:absolute;inset:-30%;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,.01) 0%,rgba(255,255,255,.05) 30%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.05) 70%,rgba(255,255,255,.01) 100%);opacity:0;animation:nv-sweep 3.2s ease-in-out infinite}',
      '@keyframes nv-sweep{0%{opacity:0;transform:translate(-12%,-12%)}35%{opacity:1}55%{opacity:1}92%,100%{opacity:0;transform:translate(12%,12%)}}',
      '.nv-ccard-head{display:flex;align-items:center;gap:8px;min-width:0}',
      '.nv-ccard-icon{flex:none;font-size:16px;line-height:1}',
      // UX-010③：信息行距整体上调一档——标题 15→16px/600、状态行 12.5→13px、数据卡片 12→13px、meta 11.5→12px（行高 1.6 保持；操作钮 22px 保持）
      '.nv-ccard-name{flex:1;min-width:0;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#e6e8eb);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-ccard-badge{flex:none;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:16px;padding:0 7px;border-radius:8px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.06));color:var(--dsw-alias-label-tertiary,#6e7683)}',
      '.nv-ccard-status{display:flex;align-items:center;gap:6px;min-width:0;font-size:13px;color:var(--dsw-alias-label-secondary,#9aa4b2)}',
      '.nv-ccard-sub{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-ccard-data{font-size:13px;line-height:1.6;color:var(--dsw-alias-label-tertiary,#6e7683);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nv-cmeta{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-tertiary,#6e7683)}',
      // UX-008④：卡操作收敛为右下角 22×22 图标钮（hover title 提示；stopPropagation）；
      // UX-011：第二个 🗑 删除钮（danger hover 变体，与 🔗 平级）；
      // UX-013（批注②.4）：➤ 启动钮已删，操作行仅 🔗/🗑
      '.nv-ccard-actions{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:auto;padding-top:4px}',
      '.nv-cico{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:1px solid var(--dsw-alias-border-l1,#262b36);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#9aa4b2);font:inherit;font-size:13px;line-height:1;cursor:pointer}',
      '.nv-cico:hover{color:var(--dsw-alias-label-primary,#e6e8eb);border-color:var(--dsw-alias-border-l2,#3a4150);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.06))}',
      '.nv-cico-del:hover{color:var(--dsw-alias-state-danger,#e5484d);border-color:var(--dsw-alias-state-danger,#e5484d)}',
      // 展开全部/折叠行（UX-008⑤：磁贴前一行，11px tertiary 链接式，跨全部列居中）
      '.nv-cfold{grid-column:1 / -1;justify-self:center;padding:2px 10px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary,#6e7683);font:inherit;font-size:11px;line-height:18px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}',
      '.nv-cfold:hover{color:var(--dsw-alias-label-secondary,#9aa4b2)}',
      // ＋ 新建虚线磁贴（UX-008③ 起；UX-010③ 与卡片统一尺寸：min-height 180px + 1.5px dashed accent +
      // 中央 26px ＋ + hover accent 提亮 + 轻缩放；不参与排序/拖动，过滤时始终显示）
      '.nv-cplus{display:flex;align-items:center;justify-content:center;min-height:180px;box-sizing:border-box;border:1.5px dashed var(--dsw-alias-state-accent-primary,#4f8ef7);border-radius:14px;background:transparent;color:var(--dsw-alias-state-accent-primary,#4f8ef7);font:inherit;cursor:pointer;transition:background .15s ease,filter .15s ease,transform .15s ease}',
      '.nv-cplus:hover{background:rgba(79,142,247,.08);filter:brightness(1.15);transform:scale(1.02)}',
      '.nv-cplus-icon{font-size:26px;line-height:1;font-weight:600}',
      // 绑定双圆（对照 dsh-worktable 对话绑定钮：○○ 空心未绑定 / ●● 实心已绑定；busy=accent 蓝双闪 / need=黄 / done=绿 / stale=红空心）
      '.nv-cdot{position:relative;display:inline-flex;flex:none;width:17px;height:7px}',
      '.nv-cdot::before,.nv-cdot::after{content:"";position:absolute;top:50%;margin-top:-3px;width:6px;height:6px;border-radius:50%;box-sizing:border-box;border:1.2px solid var(--dsw-alias-label-tertiary,#6e7683);background:transparent}',
      '.nv-cdot::before{left:0}',
      '.nv-cdot::after{left:10px}',
      '.nv-cdot[data-bound=idle]{color:var(--dsw-alias-label-primary,#e6e8eb)}',
      '.nv-cdot[data-bound=idle]::before,.nv-cdot[data-bound=idle]::after{background:currentColor;border-color:currentColor}',
      '.nv-cdot[data-bound=busy]{color:var(--dsw-alias-state-accent-primary,#4f8ef7)}',
      '.nv-cdot[data-bound=busy]::before{background:currentColor;border-color:currentColor;animation:nv-dotA 1s ease-in-out infinite}',
      '.nv-cdot[data-bound=busy]::after{background:currentColor;border-color:currentColor;animation:nv-dotB 1s ease-in-out infinite}',
      '.nv-cdot[data-bound=need]{color:var(--dsw-alias-state-warning,#d29922)}',
      '.nv-cdot[data-bound=need]::before,.nv-cdot[data-bound=need]::after{background:currentColor;border-color:currentColor;filter:drop-shadow(0 0 3px currentColor)}',
      '.nv-cdot[data-bound=done]{color:var(--dsw-alias-state-success,#3fb950)}',
      '.nv-cdot[data-bound=done]::before,.nv-cdot[data-bound=done]::after{background:currentColor;border-color:currentColor;filter:drop-shadow(0 0 3px currentColor)}',
      '.nv-cdot[data-bound=stale]{color:var(--dsw-alias-state-danger,#e5484d)}',
      '.nv-cdot[data-bound=stale]::before,.nv-cdot[data-bound=stale]::after{border-color:currentColor}',
      '@keyframes nv-dotA{0%,44%{opacity:1}50%,94%{opacity:.15}100%{opacity:1}}',
      '@keyframes nv-dotB{0%,44%{opacity:.15}50%,94%{opacity:1}100%{opacity:.15}}',
      // 新建小说居中模态（UX-012：全屏遮罩 rgba(0,0,0,.45) 点击关（busy 禁关）+
      // 居中卡片 min(520px,100%)/maxHeight 85vh/radius 14px——几何复用 WorkspaceDialog 视觉模式）
      '.nv-cmodal-backdrop{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:20px}',
      '.nv-cmodal{width:min(520px,100%);max-height:85vh;overflow:auto;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;padding:18px 20px;border:1px solid var(--dsw-alias-border-l2,#3a4150);border-radius:14px;background:var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#0b0e14));color:var(--dsw-alias-label-primary,#e6e8eb);box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.4));font-size:13px}',
      '.nv-cmodal-head{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.nv-cmodal-title{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary,#e6e8eb)}',
      '.nv-cmodal .nv-cinput{padding:8px 10px;font-size:13px}',
      '.nv-cinput{padding:5px 8px;border:1px solid var(--dsw-alias-border-l1,#262b36);border-radius:6px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.03));color:var(--dsw-alias-label-primary,#e6e8eb);font:inherit;font-size:12px;outline:none}',
      '.nv-cinput:focus{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7)}',
      '.nv-cbtns{display:flex;gap:6px;flex-wrap:wrap}',
      '.nv-cbtn-accent{padding:5px 10px;border:none;border-radius:6px;background:var(--dsw-alias-state-accent-primary,#4f8ef7);color:#fff;font:inherit;font-size:12px;cursor:pointer}',
      '.nv-cbtn-accent:hover{filter:brightness(1.08)}',
      '.nv-cbtn{padding:5px 10px;border:1px solid var(--dsw-alias-border-l1,#262b36);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#9aa4b2);font:inherit;font-size:12px;cursor:pointer}',
      '.nv-cbtn:hover{color:var(--dsw-alias-label-primary,#e6e8eb);border-color:var(--dsw-alias-border-l2,#3a4150)}',
      '.nv-cbtn:disabled,.nv-cbtn-accent:disabled{opacity:.55;cursor:default}',
      '.nv-cform-err{font-size:11px;color:var(--dsw-alias-state-danger,#e5484d);word-break:break-all}',
      // 分栏标题栏 ▶ 开始/继续工作流（UX-012④：accent 实底 13px/600）+ 三态提示条
      '.nv-bar-launch{flex:none;padding:5px 14px;border:none;border-radius:6px;background:var(--dsw-alias-state-accent-primary,#4f8ef7);color:#fff;font:inherit;font-size:13px;font-weight:600;line-height:18px;cursor:pointer;white-space:nowrap}',
      '.nv-bar-launch:hover{filter:brightness(1.08)}',
      '.nv-bar-launch:disabled{opacity:.55;cursor:default}',
      // UX-014⑥：标题栏 ⇄/✕ 醒目化——28×28 带边框变体（尺寸/边框/圆角/hover 与管理台
      // 头部 ✕ .nv-console-head .nv-mini 同型，font 16px/600；UX-015（批注①）：28×28→32×32、16→18px
      '.nv-bar-ctl{flex:none;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:32px;height:32px;padding:0;border:1px solid var(--dsw-alias-border-l2,#3a4150);border-radius:8px;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05));color:var(--dsw-alias-label-secondary,#9aa4b2);font-size:18px;font-weight:600;line-height:1;cursor:pointer}',
      '.nv-bar-ctl:hover{border-color:var(--dsw-alias-state-accent-primary,#4f8ef7);color:var(--dsw-alias-state-accent-primary,#4f8ef7);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.1))}',
      '.nv-bar-note{flex:0 1 auto;min-width:0;max-width:46%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--dsw-alias-label-secondary,#9aa4b2)}',
      '.nv-bar-note[data-kind=ok]{color:var(--dsw-alias-state-success,#3fb950)}',
      '.nv-bar-note[data-kind=err]{color:var(--dsw-alias-state-danger,#e5484d)}',
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
      // 控制台与分栏互斥（DEC-015）：他引擎分栏接管时同时关控制台。
      let claimHandler = null
      try {
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          claimHandler = (e) => {
            const id = e !== null && e !== undefined && e.detail !== null && e.detail !== undefined ? e.detail.id : null
            if (id === null || id === 'novel-writing') return
            if (novelSplit.active) novelSplit.close()
            if (store.get().consoleOpen === true) store.set({ consoleOpen: false, consoleFocus: null })
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

      // 侧栏抽屉（纯主入口 UX-007）：标题行（开/关控制台）+ 书目卡片列表（点击 = 聚焦打开控制台）
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
        { name: 'sidebar.footer.action', id: 'novel-drawer', order: 9, label: () => t('entryLabel') },
        (props) => el(NovelDrawer, {
          api: base.api,
          useSessions: useSessionsH,
          wide: props !== undefined && props !== null ? props.wide : true,
        }),
      ))

      // 浮层：工作台控制台（UX-007，order 25，zIndex 950）+ 工作区对话框（UX-005 保留；入口 = 控制台顶部）
      //       + 分栏工作区 + 绑定面板
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'nv-console', order: 25, label: () => t('entryLabel') },
        (props) => el(NvConsole, { api: base.api, useSessions: useSessionsH }),
      ))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'novel-workspace-dialog', order: 20, label: () => t('entryLabel') },
        () => el(WorkspaceDialog, { ...base }),
      ))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'novel-split', order: 25, label: () => t('creationLabel') },
        (props) => el(SplitWorkspace, { api: base.api, useSessions: useSessionsH }),
      ))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'novel-bind-dialog', order: 40, label: () => t('bindBtn') },
        (props) => el(BindDialog, { api: base.api, useSessions: useSessionsH }),
      ))

      // 可逆性：清理 = 控制台状态复位 + 引擎关闭 + claim 监听移除 + style 标签移除
      return () => {
        try { store.set({ consoleOpen: false, consoleFocus: null }) } catch { /* ignore */ }
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
