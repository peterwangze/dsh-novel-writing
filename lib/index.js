/**
 * dsh-novel-writing 宿主行（composition：`- id: novel-writing; name: dsh-novel-writing`）。
 *
 * 职责：
 * - 小说项目管理服务 `novel-writing`：workspace 扫描、workflow-state 增量读写、
 *   正文看护硬门禁（场景覆盖率 / 偏离度 / bible 事实）、章节元数据、发布适配器、
 *   平台数据回流与信号检测、UI 请求队列；
 * - 首次启动把包内 agent 预设同步到 `$DSH_HOME/.agent-presets/novel-writing/`
 *   （`dsh plugin add` 安装 + 重启后自动注册「小说写作工作流」预设，无需手建目录）；
 * - 通过 webServer 暴露回环 HTTP API（/novel-writing/api/*），供浏览器侧
 *   「小说工作台」轮询：overview / novel / chapter / request / publish / data；
 * - 每次写入递增 `version` 并 emit `novel-writing/changed`，实现实时渲染。
 *
 * @module dsh-novel-writing
 */
import z from '@deepseek-ai/schemastery'
import { Service } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { fileURLToPath } from 'node:url'
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync, rmSync, statSync,
} from 'node:fs'
import { join, dirname, resolve as pathResolve, sep } from 'node:path'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'

export const name = 'dsh-novel-writing'

/** 硬依赖：settings（配置节）。webServer / timer 可选。 */
export const inject = ['settings']

const NS = settingsNamespace('novel-writing')
const Config = z.object({
  enabled: z.boolean().default(true),
  /** 小说工作区根目录；'' 表示默认 <HOME>/novels。 */
  workspaceRoot: z.string().default(''),
  /** 浏览器工作台轮询周期（ms）。 */
  pollMs: z.number().default(2000),
  /** 允许 LAN 访问 HTTP API（默认仅回环）。 */
  apiPublic: z.boolean().default(false),
  /** 安装时自动同步 agent 预设到 $DSH_HOME/.agent-presets/novel-writing。 */
  presetAutoSync: z.boolean().default(true),
  /** 平台发布配置。键：平台名（番茄小说/起点中文网/晋江文学城/七猫小说/公众号/…）。 */
  platforms: z.dict(z.object({
    enabled: z.boolean().default(false),
    /** export = 导出定稿产物 + 发布清单；command = 导出后执行用户命令（脚本自动化）；manual = 仅清单。 */
    mode: z.union(['export', 'command', 'manual']).default('export'),
    /** mode=command 时，导出后执行的命令（可用环境变量：DSH_NOVEL_DIR/DSH_DIST_DIR/DSH_PLATFORM）。 */
    command: z.string().default(''),
    /** 数据抓取命令；stdout 需输出 JSON 行（见 novel_data_ingest）。 */
    fetchCommand: z.string().default(''),
  }), z.string()).default({
    番茄小说: { enabled: false, mode: 'export', command: '', fetchCommand: '' },
    起点中文网: { enabled: false, mode: 'export', command: '', fetchCommand: '' },
    晋江文学城: { enabled: false, mode: 'export', command: '', fetchCommand: '' },
    七猫小说: { enabled: false, mode: 'export', command: '', fetchCommand: '' },
  }),
  /** 小说↔会话 1:1 绑定（UX-006）：键 = 小说目录 id，值 = 会话 id；随 overview 下发，浏览器侧合并语义写入。 */
  bindings: z.dict(z.string(), z.string()).default({}),
})

const PROJECT_DIR = 'novel-project'
const META_DIR = '.dsh-plugin'
const STATE_FILE = 'workflow-state.json'
const CHAPTER_DIR = '07-content'
const OUTLINE_DIR = '06-chapter-outlines'
const CONTINUITY_DIR = '17-continuity'
const CONTEXT_PREFIX = 'chapter-'
const CONTEXT_SUFFIX = '-context.md'
// 看护资产 story-bible / continuity-ledger 由协调者经 fs 维护（17-continuity/）；
// 门禁当前消费 context card，bible 事实校验在路线图（v0.3）。
const DATA_DIR = '11-data-monitoring'
const METRICS_FILE = 'metrics.json'
const REQUEST_DIR = '18-requests'
const DIST_DIR = 'dist'
const PRESET_ID = 'novel-writing'
const PRESET_MARKER = '.dsh-bundle-version'

class NovelWritingService extends Service {
  constructor(ctx) {
    super(ctx, 'novel-writing')
    this.ctx = ctx
    this.version = 0
    this.wordsCache = new Map()
    this.nameCache = new Map()
    this.cfg = () => {
      const c = ctx.settings.get(NS)
      return c === undefined ? Config({}) : c
    }
    // 注意：不在构造器里 ensurePreset——settings 命名空间由 apply() 注册，
    // 构造期读到的是默认配置（用户关闭 presetAutoSync 也会同步一次）。
  }

  /** 总开关：enabled=false 时拒绝全部变更操作与 HTTP API（读配置即时生效）。 */
  assertEnabled() {
    if (this.cfg().enabled === false) throw new Error('novel-writing disabled（settings novel-writing.enabled=false）')
  }

  /** 原子写：tmp（随机后缀防并发互踩）+ rename；失败清理残留 tmp。 */
  atomicWrite(path, data) {
    const tmp = `${path}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      writeFileSync(tmp, data, 'utf8')
      renameSync(tmp, path)
    } catch (error) {
      try { rmSync(tmp, { force: true }) } catch { /* ignore */ }
      throw error
    }
  }

  // ── 基础工具 ────────────────────────────────────────────────────────────

  logger() {
    return this.ctx.logger
  }

  workspaceRoot() {
    const cfg = this.cfg()
    if (cfg.workspaceRoot !== undefined && cfg.workspaceRoot !== '') return pathResolve(cfg.workspaceRoot)
    return join(homedir(), 'novels')
  }

  novelDir(novelId) {
    if (typeof novelId !== 'string' || novelId === '' || novelId.includes('/') || novelId.includes('\\') || novelId === '.' || novelId === '..') {
      throw new Error(`invalid novel id: ${String(novelId)}`)
    }
    return join(this.workspaceRoot(), novelId)
  }

  projectDir(novelId) {
    return join(this.novelDir(novelId), PROJECT_DIR)
  }

  metaDir(novelId) {
    const dir = join(this.projectDir(novelId), META_DIR)
    mkdirSync(dir, { recursive: true })
    return dir
  }

  statePath(novelId) {
    return join(this.projectDir(novelId), STATE_FILE)
  }

  pushVersion(detail) {
    this.version += 1
    try {
      this.ctx.emit('novel-writing/changed', { version: this.version, detail: detail ?? null })
    } catch (error) {
      this.logger()?.warn(`dsh-novel-writing: emit failed: ${String(error)}`)
    }
  }

  // ── 预设同步 ────────────────────────────────────────────────────────────

  /** 把包内 agent-presets/novel-writing 同步到用户预设根（幂等，按版本标记；升级时整目录重建，避免改名后的旧 SKILL 残留）。 */
  ensurePreset() {
    try {
      const cfg = this.cfg()
      if (cfg.enabled === false || cfg.presetAutoSync === false) return
      const pkgDir = fileURLToPath(new URL('../agent-presets/novel-writing/', import.meta.url))
      if (!existsSync(join(pkgDir, 'agent.cordis.yml'))) return
      const userRoot = join(resolveDshHome(), '.agent-presets')
      const userDir = join(userRoot, PRESET_ID)
      const markerPath = join(userDir, PRESET_MARKER)
      const version = this.packageVersion()
      let current = ''
      try {
        current = readFileSync(markerPath, 'utf8').trim()
      } catch { /* 无标记 = 首次 */ }
      if (existsSync(userDir) && current === version) return
      mkdirSync(userRoot, { recursive: true })
      // 原子换入：先拷到 staging 并写版本标记，再整体替换——升级中途崩溃不会留下半套预设
      const staging = `${userDir}.staging-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      rmSync(staging, { recursive: true, force: true })
      cpSync(pkgDir, staging, { recursive: true })
      writeFileSync(join(staging, PRESET_MARKER), version, 'utf8')
      if (existsSync(userDir)) rmSync(userDir, { recursive: true, force: true })
      renameSync(staging, userDir)
      this.logger()?.info(`dsh-novel-writing: agent preset synced to ${userDir} (v${version})`)
    } catch (error) {
      this.logger()?.warn(`dsh-novel-writing: preset sync failed: ${String(error)}`)
    }
  }

  packageVersion() {
    try {
      const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))
      return typeof pkg.version === 'string' ? pkg.version : '0'
    } catch {
      return '0'
    }
  }

  // ── 工作区与状态 ───────────────────────────────────────────────────────

  readState(novelId) {
    const p = this.statePath(novelId)
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, 'utf8'))
  }

  writeState(novelId, state) {
    this.atomicWrite(this.statePath(novelId), JSON.stringify(state, null, 2) + '\n')
  }

  /**
   * 增量更新工作流状态：追加完成阶段、深合并 project_info、回写 guardrails/statistics。
   * 默认允许创建（createProject 初始化用）；工具 novel_state_update 传 allowCreate:false
   * 防止打错书目 id 生成幽灵项目。
   */
  updateState(novelId, patch, opts = {}) {
    this.assertEnabled()
    if (opts.allowCreate === false && !existsSync(this.statePath(novelId))) {
      throw new Error(`novel not found: ${novelId}（状态更新不允许隐式创建项目）`)
    }
    const current = this.readState(novelId) ?? {
      current_stage: 'work_type_selection',
      completed_stages: [],
      project_info: {},
      files: {},
      guardrails: {
        continuity_mode: 'strict',
        latest_passed_chapter: 0,
        latest_ai_path: null,
        release_allowed: false,
        monetization_allowed: false,
        latest_drift_score: null,
      },
      statistics: { total_chapters: 0, total_words: 0, last_updated: null },
    }
    if (patch === undefined || patch === null) {
      mkdirSync(dirname(this.statePath(novelId)), { recursive: true })
      this.writeState(novelId, current)
      this.pushVersion(`state:${novelId}`)
      return current
    }
    const next = JSON.parse(JSON.stringify(current))
    if (typeof patch.current_stage === 'string') next.current_stage = patch.current_stage
    if (Array.isArray(patch.completed_stages)) {
      for (const s of patch.completed_stages) {
        if (!next.completed_stages.includes(s)) next.completed_stages.push(s)
      }
    }
    for (const key of ['project_info', 'files', 'guardrails', 'statistics']) {
      if (patch[key] !== undefined && typeof patch[key] === 'object' && patch[key] !== null) {
        next[key] = { ...(next[key] ?? {}), ...patch[key] }
      }
    }
    if (patch.statistics?.last_updated === undefined) {
      next.statistics = { ...(next.statistics ?? {}), last_updated: new Date().toISOString() }
    } else {
      next.statistics = { ...(next.statistics ?? {}), last_updated: patch.statistics.last_updated }
    }
    mkdirSync(dirname(this.statePath(novelId)), { recursive: true })
    this.writeState(novelId, next)
    this.pushVersion(`state:${novelId}`)
    return next
  }

  listNovels() {
    const root = this.workspaceRoot()
    let entries = []
    try {
      entries = readdirSync(root, { withFileTypes: true })
    } catch {
      return { root, novels: [], pollMs: this.cfg().pollMs ?? 2000, bindings: { ...(this.cfg().bindings ?? {}) } }
    }
    const novels = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const id = entry.name
      let state
      try {
        state = JSON.parse(readFileSync(join(root, id, PROJECT_DIR, STATE_FILE), 'utf8'))
      } catch {
        continue
      }
      const info = state.project_info ?? {}
      const stats = state.statistics ?? {}
      novels.push({
        id,
        title: typeof info.title === 'string' && info.title !== '' ? info.title : id,
        workType: info.work_type ?? null,
        platform: info.platform ?? null,
        genre: info.genre ?? null,
        stage: state.current_stage ?? null,
        completedStages: state.completed_stages ?? [],
        totalChapters: stats.total_chapters ?? 0,
        totalWords: stats.total_words ?? 0,
        lastUpdated: stats.last_updated ?? null,
        releaseAllowed: state.guardrails?.release_allowed === true,
        monetizationAllowed: state.guardrails?.monetization_allowed === true,
        latestDrift: state.guardrails?.latest_drift_score ?? null,
        latestAiPath: state.guardrails?.latest_ai_path ?? null,
        // ⚠ 角标只统计待处理请求（done 的不再计）
        requests: this.listRequests(id).filter((r) => r.status !== 'done').length,
      })
    }
    novels.sort((a, b) => String(b.lastUpdated ?? '').localeCompare(String(a.lastUpdated ?? '')))
    // 平台配置与小说↔会话绑定随 overview 下发（回环面）：工作台发布页签就地编辑、抽屉/绑定面板单次轮询即得
    const platforms = Object.entries(this.cfg().platforms ?? {}).map(([name, config]) => ({ name, config }))
    return { root, novels, pollMs: this.cfg().pollMs ?? 2000, platforms, bindings: { ...(this.cfg().bindings ?? {}) } }
  }

  novelDetail(novelId) {
    const state = this.readState(novelId)
    if (state === null) throw new Error(`novel not found: ${novelId}`)
    const chapters = this.chapterList(novelId)
    const requests = this.listRequests(novelId)
    const signals = this.computeSignals(novelId)
    const meta = this.readMeta(novelId)
    const metrics = this.readMetrics(novelId)
    return {
      id: novelId,
      state,
      chapters,
      requests,
      signals,
      meta,
      metrics: metrics.slice(-14),
      publishLog: this.readPublishLog(novelId),
      files: this.fileIndex(novelId),
    }
  }

  /**
   * 小说目录 id 清洗（createProject / deleteProject 共用校验链，UX-011 抽出复用）：
   * trim 后非空、长度 ≤ 60、无路径分隔符与 Windows 非法字符、非 `.`/`..`/点开头、
   * 非保留设备名。返回清洗后的 id；非法即抛错（P-07：写入与删除同一安全标准）。
   */
  sanitizeNovelId(name) {
    const clean = typeof name === 'string' ? name.trim() : ''
    if (clean === '') throw new Error('name required')
    if (clean.length > 60) throw new Error('name too long (max 60)')
    if (/[<>:"|?*\\/]/.test(clean) || clean === '.' || clean === '..') throw new Error(`invalid novel name: ${clean}`)
    if (clean.startsWith('.')) throw new Error('novel name must not start with a dot')
    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
    if (reserved.test(clean)) throw new Error(`reserved device name: ${clean}`)
    return clean
  }

  /** 工作台「新建小说」：创建 <workspaceRoot>/<name>/novel-project/ + 初始状态。 */
  createProject(name, title) {
    this.assertEnabled()
    const clean = this.sanitizeNovelId(name)
    const dir = this.novelDir(clean)
    if (existsSync(dir)) throw new Error(`novel already exists: ${clean}`)
    mkdirSync(join(dir, PROJECT_DIR), { recursive: true })
    const state = this.updateState(clean, { project_info: { title: typeof title === 'string' && title.trim() !== '' ? title.trim() : clean } })
    this.pushVersion(`create:${clean}`)
    // path = 小说目录绝对路径：浏览器侧新建链用它作为 sessions.create({cwd}) 的工作目录（UX-006）
    return { id: clean, title: state.project_info.title, state, path: dir }
  }

  /**
   * 工作台「删除小说」（UX-011 两级工作台：小说管理工作台卡片 🗑）：删除整个
   * <workspaceRoot>/<novel> 目录（书稿 + 状态 + 元数据一并移除）。
   * 校验链（P-07）：① sanitizeNovelId 与 createProject 同规（空/超长/路径分隔符/
   * `.`/`..`/保留名一律拒绝）；② resolve 后必须仍在工作区根目录之下（路径穿越防护）；
   * ③ 目录不存在返回 not found（不误报、也绝不触碰根目录本身）。
   * 删除仅由客户端用户显式确认后触发——服务层不提供任何自动删除路径。
   */
  deleteProject(novelId) {
    this.assertEnabled()
    const id = this.sanitizeNovelId(novelId)
    const root = pathResolve(this.workspaceRoot())
    const dir = pathResolve(join(root, id))
    if (!dir.startsWith(root + sep)) throw new Error(`invalid novel id: ${id}`)
    if (!existsSync(dir)) return { ok: false, error: 'not found' }
    rmSync(dir, { recursive: true, force: true })
    this.pushVersion(`delete:${id}`)
    return { ok: true, id }
  }

  /** 工作台文件树的安全读取：路径必须停留在 novel-project 内且拒绝插件私有/产物目录。 */
  readProjectFile(novelId, relPath) {
    const project = this.projectDir(novelId)
    const rel = String(relPath ?? '').replace(/\\/g, '/')
    if (rel === '' || rel.startsWith('/') || rel.split('/').some((seg) => seg === '' || seg === '.' || seg === '..')) {
      throw new Error('invalid path')
    }
    if (rel.split('/')[0] === META_DIR || rel.split('/')[0] === DIST_DIR) {
      throw new Error('plugin-managed path not readable from the tree')
    }
    const full = join(project, rel)
    if (!full.startsWith(project + sep)) throw new Error('path escapes project')
    let st
    try {
      st = statSync(full)
    } catch {
      throw new Error(`file not found: ${rel}`)
    }
    if (!st.isFile()) throw new Error(`not a file: ${rel}`)
    const base = { path: rel, size: st.size, updatedAt: Math.round(st.mtimeMs) }
    if (st.size > 512 * 1024) return { ...base, tooLarge: true, content: null }
    return { ...base, tooLarge: false, content: readFileSync(full, 'utf8') }
  }

  /** 扫描项目文件树（相对路径 + 大小 + 修改时间），供工作台展示。 */
  fileIndex(novelId) {
    const dir = this.projectDir(novelId)
    if (!existsSync(dir)) return []
    const out = []
    const walk = (relative) => {
      let items = []
      try {
        items = readdirSync(join(dir, relative), { withFileTypes: true })
      } catch {
        return
      }
      for (const item of items) {
        const rel = relative === '' ? item.name : `${relative}/${item.name}`
        if (item.name === META_DIR || item.name === DIST_DIR) continue
        const full = join(dir, rel)
        if (item.isDirectory()) walk(rel)
        else if (item.isFile()) {
          let size = 0; let mtime = 0
          try {
            const st = statSync(full)
            size = st.size; mtime = st.mtimeMs
          } catch { /* skip */ }
          out.push({ path: rel, size, updatedAt: Math.round(mtime) })
        }
      }
    }
    walk('')
    return out
  }

  // ── 章节 ───────────────────────────────────────────────────────────────

  /** 章号统一收口校验：只接受纯数字（可补零）且整数在 [1,9999]，拒绝路径注入/小数/科学计数。 */
  normalizeChapterNum(num) {
    const raw = typeof num === 'string' ? num.trim() : num
    if (typeof raw === 'string' &&/^\d+$/.test(raw)) {
      const n = Number(raw)
      if (n >= 1 && n <= 9999) return String(n).padStart(3, '0')
    }
    if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 9999) {
      return String(raw).padStart(3, '0')
    }
    throw new Error(`invalid chapter number: ${String(num)}`)
  }

  /** meta 键统一收口（与写入方一致，杜绝 "1" vs "001" 键漂移）。 */
  chapterKey(num) {
    return this.normalizeChapterNum(num)
  }

  chapterFile(novelId, num, dir = CHAPTER_DIR) {
    const numStr = this.normalizeChapterNum(num)
    return join(this.projectDir(novelId), dir, `chapter-${numStr}.md`)
  }

  outlineFile(novelId, num) {
    return this.chapterFile(novelId, num, OUTLINE_DIR)
  }

  contextCardFile(novelId, num) {
    const numStr = this.normalizeChapterNum(num)
    return join(this.projectDir(novelId), CONTINUITY_DIR, `${CONTEXT_PREFIX}${numStr}${CONTEXT_SUFFIX}`)
  }

  chapterList(novelId) {
    const dir = join(this.projectDir(novelId), CHAPTER_DIR)
    let files = []
    try {
      // 兼容 3 位及以上的章号（长篇可达 1000+ 章）
      files = readdirSync(dir).filter((f) => /^chapter-\d{3,}\.md$/.test(f)).sort((a, b) => {
        const na = Number(a.slice(8, -3)); const nb = Number(b.slice(8, -3))
        return na - nb
      })
    } catch {
      return []
    }
    const meta = this.readMeta(novelId)
    return files.map((f) => {
      const num = Number(f.slice(8, -3))
      const full = join(dir, f)
      let size = 0; let mtime = 0
      try {
        const st = statSync(full)
        size = st.size; mtime = st.mtimeMs
      } catch { /* skip */ }
      const entry = meta.chapters?.[String(num).padStart(3, '0')] ?? {}
      const words = this.cachedWords(full, size, Math.round(mtime))
      return {
        num,
        // UX-015②：章节名——meta.chapters[*].name 增量字段优先（契约保留），
        // 无则解析章节文件首个 `# ` 标题行（缓存键同 wordsCache：轮询零额外 IO）。
        name: typeof entry.name === 'string' ? entry.name : this.cachedChapterName(full, size, Math.round(mtime)),
        words,
        size,
        updatedAt: Math.round(mtime),
        gate: entry.gate ?? null,
        reviewScore: entry.reviewScore ?? null,
        published: entry.published === true,
        forced: entry.forced === true,
      }
    })
  }

  /** 字数缓存：浏览器每 2s 轮询 chapterList，避免每次都读全文（500 章 × 轮询会放大为 IO 风暴）。 */
  cachedWords(file, size, mtime) {
    const key = `${file}\u0000${size}\u0000${mtime}`
    const hit = this.wordsCache.get(file)
    if (hit !== undefined && hit.key === key) return hit.words
    let words = 0
    try {
      words = this.countWords(readFileSync(file, 'utf8'))
    } catch { /* skip */ }
    if (this.wordsCache.size > 2000) this.wordsCache.clear()
    this.wordsCache.set(file, { key, words })
    return words
  }

  /**
   * 章节名提取（UX-015② + UX-020 校准）：取章节文件首个 `# ` 标题行（容忍文件起始
   * UTF-8 BOM——novel-001 的 004/005/018 均带 BOM，不剥则标题行识别失败 → 名为空），
   * 剥掉「第N章/第N回」前缀（覆盖中文/阿拉伯/全角数码 + 「章」「回」 + 半角/全角冒号
   * 与全角空格分隔：「# 第18章：老福宾馆」→「老福宾馆」）；无标题行 / 前缀不匹配 /
   * 剥后为空 → ''（禁止回退取正文非标题行）。
   */
  chapterNameOf(content) {
    const first = content.split('\n').find((l) => l.replace(/^\uFEFF/, '').startsWith('# '))
    if (first === undefined) return ''
    const m = first.replace(/^\uFEFF/, '').slice(2).trim()
      .match(/^第[0-9０-９一二三四五六七八九十百千零万两〇]+[章回][：: 　]*(.*)$/)
    return m === null ? '' : m[1].trim()
  }

  /** 章节名缓存（同 wordsCache 键策略：文件+大小+mtime 不变则零额外 IO——2s 轮询不放大读盘）。 */
  cachedChapterName(file, size, mtime) {
    const key = `${file}\u0000${size}\u0000${mtime}`
    const hit = this.nameCache.get(file)
    if (hit !== undefined && hit.key === key) return hit.name
    let name = ''
    try {
      name = this.chapterNameOf(readFileSync(file, 'utf8'))
    } catch { /* skip */ }
    if (this.nameCache.size > 2000) this.nameCache.clear()
    this.nameCache.set(file, { key, name })
    return name
  }

  countWords(text) {
    // 中文：汉字 + CJK 标点分隔；英文：按空白。统一近似：汉字数 + 英文词数。
    const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length
    const latin = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length
    return cjk + latin
  }

  readChapter(novelId, num) {
    const numStr = String(num).padStart(3, '0')
    const file = this.chapterFile(novelId, numStr)
    if (!existsSync(file)) throw new Error(`chapter not found: ${num}`)
    const content = readFileSync(file, 'utf8')
    const outline = existsSync(this.outlineFile(novelId, numStr)) ? readFileSync(this.outlineFile(novelId, numStr), 'utf8') : null
    const contextCard = existsSync(this.contextCardFile(novelId, numStr)) ? readFileSync(this.contextCardFile(novelId, numStr), 'utf8') : null
    const meta = this.readMeta(novelId)
    const entry = meta.chapters?.[numStr] ?? {}
    const platform = this.stateOf(novelId)?.project_info?.platform ?? null
    return {
      novel: novelId,
      num: Number(numStr),
      content,
      words: this.countWords(content),
      // UX-015②：章节名（meta 增量字段优先，无则解析首行 # 标题）
      name: typeof entry.name === 'string' ? entry.name : this.chapterNameOf(content),
      outline,
      contextCard,
      gate: entry.gate ?? null,
      reviewScore: entry.reviewScore ?? null,
      published: entry.published === true,
      forced: entry.forced === true,
      updatedAt: entry.updatedAt ?? null,
      audit: this.lightAudit(content, { platform, contextCard }),
    }
  }

  stateOf(novelId) {
    return this.readState(novelId)
  }

  /**
   * 正文看护硬门禁（持久化：写 meta + version）。saveChapter 调用；
   * 干跑（工具 novel_gate_check / HTTP /api/gate）请用 computeGate，不落盘。
   */
  gateCheck(novelId, num, content) {
    const numStr = this.normalizeChapterNum(num)
    const result = this.computeGate(novelId, numStr, content)
    const meta = this.readMeta(novelId)
    meta.chapters = meta.chapters ?? {}
    meta.chapters[numStr] = {
      ...(meta.chapters[numStr] ?? {}),
      gate: {
        at: new Date().toISOString(),
        coverage: result.coverage, drift: result.drift,
        missedScenes: result.missedScenes,
        bannedHits: result.bannedHits,
        conditional: result.conditional,
        requirements: result.requirements,
        passed: result.passed,
      },
    }
    this.writeMeta(novelId, meta)
    this.pushVersion(`gate:${novelId}:${numStr}`)
    return result
  }

  /** 纯计算门禁（不落盘）。 */
  computeGate(novelId, num, content) {
    const numStr = this.normalizeChapterNum(num)
    let contextText = ''
    try {
      contextText = readFileSync(this.contextCardFile(novelId, numStr), 'utf8')
    } catch {
      return { available: false, coverage: null, drift: null, scenes: [], bannedHits: [], conditional: [], requirements: [], passed: null, note: 'no context card' }
    }
    const scenes = this.parseScenes(contextText)
    const sectionExists = this.sectionOf(contextText, '本章必写场景') !== null
    // 场景段存在却解析不出任何场景 = 看护卡格式漂移 → 门禁 fail-closed（阻断而非静默放行）
    if (sectionExists && scenes.length === 0) {
      return { available: false, coverage: null, drift: null, scenes: [], bannedHits: [], conditional: [], requirements: [], passed: null, note: 'context card 场景段存在但无法解析（格式漂移），门禁 fail-closed：请修正看护卡的「本章必写场景」编号列表格式' }
    }
    if (!sectionExists) {
      return { available: false, coverage: null, drift: null, scenes: [], bannedHits: [], conditional: [], requirements: [], passed: null, note: 'no context card scene section' }
    }
    const { banned, requirements, conditional } = this.parseBanRules(contextText)
    // 场景豁免：必写场景标题/描述中出现的术语不可能是禁词（同卡自相矛盾时以场景为准）
    const sceneTerms = new Set()
    for (const s of scenes) {
      if (s.title !== '') sceneTerms.add(s.title)
      for (const w of this.keywordsOf(s.desc)) sceneTerms.add(w)
    }
    const effectiveBanned = banned.filter((t) => !sceneTerms.has(t))
    const covered = scenes.map((scene) => {
      const matched = this.sceneMatched(content, scene)
      return { ...scene, matched }
    })
    const coverage = scenes.length === 0 ? null : Math.round((covered.filter((s) => s.matched).length / scenes.length) * 1000) / 10
    const hits = effectiveBanned.filter((term) => term !== '' && content.includes(term))
    // 偏离度：命中禁止项条数 / 禁止项总数（0 表示零偏离）
    const drift = effectiveBanned.length === 0 ? null : Math.round((hits.length / effectiveBanned.length) * 1000) / 10
    const passed = coverage === 100 && (drift === null || drift === 0)
    return {
      available: true,
      coverage, drift,
      scenes: covered,
      missedScenes: covered.filter((s) => !s.matched).map((s) => s.title),
      bannedHits: hits,
      conditional,
      requirements,
      passed,
      note: null,
    }
  }

  /** 场景解析：兼容全角数字/全角句点/冒号/全角括号/无加粗等 LLM 格式漂移。 */
  parseScenes(contextText) {
    const section = this.sectionOf(contextText, '本章必写场景')
    if (section === null) return []
    const scenes = []
    for (const line of section.split('\n')) {
      // 前缀：可选全角/半角括号 + 全角/半角数字 + 分隔（. ． 、 ： : ）) 空白）
      const m = line.match(/^\s*[（(]?[0-9０-９]+[\.．、:：）)\s]*\s*(?:(?:\*\*)([^*]{2,40})(?:\*\*)|([^：:*]{2,30})\s*[：:]\s*(.+))\s*[:：]?\s*(.*)$/)
      if (m === null) continue
      if (m[1] !== undefined && m[1] !== '') {
        // 加粗标题形式：**标题**：描述
        const rest = line.slice(line.indexOf('**' + m[1] + '**') + m[1].length + 4)
        scenes.push({ title: m[1].trim(), desc: rest.replace(/^\s*[:：]?\s*/, '').trim() })
      } else if (m[2] !== undefined && m[2] !== '') {
        // 无加粗形式：标题：描述
        scenes.push({ title: m[2].trim(), desc: (m[3] ?? '').trim() })
      }
    }
    return scenes
  }

  /**
   * 解析「本章禁止偏离项」，按否定句式分三类，避免把需求误判为禁词：
   * - 排除型 banned（计入 drift）：不得让X出场/出现、X一概/不得/禁止/不能/不可出现、
   *   禁止使用X、不得提及X、不得提前X；
   * - 条件型 conditional（不计 drift，仅提示人工复核）：不得(无铺垫/直接/贸然/提前)引入X、
   *   「有铺垫地使用」不是机械可判的——同卡必写场景常要求该术语出现（如被动触发遗识即铺垫）；
   * - 需求型 requirements（出现在正文是正确行为）：不得跳过/缺少/省略/遗漏/必须X。
   */
  parseBanRules(contextText) {
    const section = this.sectionOf(contextText, '本章禁止偏离项')
    if (section === null) return { banned: [], requirements: [], conditional: [] }
    const banned = []
    const requirements = []
    const conditional = []
    const REQUIREMENT_RE = /不得(跳过|缺少|省略|遗漏|删去|忽略)|必须/
    const CONDITIONAL_RE = /不得[^（）()，。；]*引入|有铺垫/
    const EXCLUDE_RE = /一概不出现|不出现|不得出现|不得让|禁止出现|不能出现|不可出现|禁止使用|不得使用|不得提及|不得提前/
    for (const raw of section.split('\n')) {
      const line = raw.replace(/^\s*-\s*/, '').trim()
      if (line === '') continue
      const isRequirement = REQUIREMENT_RE.test(line)
      const isConditional = CONDITIONAL_RE.test(line) && !isRequirement
      const isExclusion = EXCLUDE_RE.test(line) && !isRequirement && !isConditional
      if (isExclusion) {
        // 「不得让 X 出场/出现/…」→ X（懒匹配到谓词为止）
        const named = line.match(/(?:不得让|禁止让)\s*([\u4e00-\u9fffA-Za-z]{1,8}?)(?=[出场现身登场参与介入知道发现提到说见在本章于本章，。；、：！？】）]|$)/)
        if (named !== null && named[1] !== '') banned.push(named[1])
        // 「X 一概不出现 / 不得出现」→ X
        const subj = line.match(/^([\u4e00-\u9fffA-Za-z]{1,8}?)(?:一概|不得|不能|不可|禁止)?不?(?:出现|登场)/)
        if (subj !== null && subj[1] !== '' && subj[1].length >= 2) banned.push(subj[1])
        // 「禁止使用 X / 不得提及 X」
        const verb = line.match(/(?:禁止使用|不得使用|不得提及|禁止提及)\s*[「"']?([\u4e00-\u9fffA-Za-z]{1,10})/)
        if (verb !== null && verb[1] !== '') banned.push(verb[1])
      }
      // 引号/括号内术语按句式归类
      for (const q of line.matchAll(/[「《"'（(]([^」》"'）)]{2,16})[」》"'）)]/g)) {
        const term = q[1].trim()
        if (term === '') continue
        if (isExclusion) banned.push(term)
        else if (isConditional) conditional.push(term)
        else if (isRequirement) requirements.push(term)
      }
    }
    return {
      banned: [...new Set(banned)].filter((t) => t.length >= 2 && t.length <= 16),
      requirements: [...new Set(requirements)].filter((t) => t.length >= 2 && t.length <= 32),
      conditional: [...new Set(conditional)].filter((t) => t.length >= 2 && t.length <= 16),
    }
  }

  parseBanned(contextText) {
    return this.parseBanRules(contextText).banned
  }

  /** 场景是否命中：标题精确出现，或描述关键词按 4 字滑窗模糊命中达到阈值。
   * 阈值 = max(2, 关键词数×40%)；单个关键词也要求 ≥2 个不同滑窗（或精确包含），
   * 降低高频 4 字串巧合造成的假阳性覆盖。 */
  sceneMatched(content, scene) {
    if (scene.title !== '' && content.includes(scene.title)) return true
    const words = this.keywordsOf(scene.desc)
    if (words.length === 0) return false
    const hits = words.filter((w) => this.fuzzyHitCount(content, w) >= 2).length
    const threshold = Math.max(2, Math.ceil(words.length * 0.4))
    return hits >= Math.min(threshold, words.length)
  }

  /** 关键词的模糊命中强度：精确包含 = 99；否则计命中的 4 字滑窗数（不同窗口分别计数）。 */
  fuzzyHitCount(content, token) {
    if (token.length < 4) return content.includes(token) ? 99 : 0
    if (content.includes(token)) return 99
    let count = 0
    for (let i = 0; i + 4 <= token.length; i++) {
      if (content.includes(token.slice(i, i + 4))) count += 1
    }
    return count
  }

  keywordsOf(text) {
    const tokens = text
      .split(/[\s，。；、：！？（）()【】\[\]"'“”]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3)
    const dedup = [...new Set(tokens)]
    dedup.sort((a, b) => b.length - a.length)
    return dedup.slice(0, 5)
  }

  sectionOf(text, heading) {
    const lines = text.split('\n')
    const hit = lines.findIndex((l) => /^#{1,6}\s/.test(l.trim() === '' ? '' : l) && l.includes(heading))
    if (hit < 0) return null
    const block = []
    for (let i = hit + 1; i < lines.length; i++) {
      if (/^#{1,6}\s/.test(lines[i])) break
      block.push(lines[i])
    }
    return block.join('\n')
  }

  /** 机械轻检查（只报事实，不做判定；硬门禁 = gateCheck）。 */
  lightAudit(content, opts = {}) {
    const platform = opts.platform ?? null
    const items = []
    const words = this.countWords(content)
    const scenes = content.split(/^\s*---\s*$/m).filter((s) => s.trim() !== '').length
    const t = (id, name, level, detail) => items.push({ id, name, level, detail })
    // 字数：目标 2000-2500 为通用区间；平台定制按需（番茄 2000-2500 / 起点 2500-3200）
    const range = platform === '番茄小说' ? [1500, 3000] : [1500, 4200]
    if (words < range[0]) t('words', '字数', 'warn', `约 ${words} 字，低于建议下限 ${range[0]}`)
    else if (words > range[1]) t('words', '字数', 'warn', `约 ${words} 字，超过建议上限 ${range[1]}`)
    else t('words', '字数', 'ok', `约 ${words} 字（${scenes} 个场景）`)
    // 长段检测：>500 字段落
    const paras = content.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0)
    const longParas = paras.filter((p) => p.length > 500)
    if (longParas.length > 0) t('paragraph', '长段落', 'warn', `${longParas.length} 段超过 500 字：${longParas[0].slice(0, 24)}…`)
    else t('paragraph', '段落', 'ok', `平均 ${Math.round(paras.reduce((a, p) => a + p.length, 0) / Math.max(paras.length, 1))} 字/段`)
    // 开篇钩子：前 300 字出现冲突/疑问线索
    const head = content.slice(0, 300)
    const hookWords = ['但是', '却', '突然', '发现', '异常', '死', '血', '为什么', '竟然', '不对', '站住', '敲门', '电话', '失踪', '？']
    const headHits = hookWords.filter((w) => head.includes(w)).length
    if (headHits >= 2) t('opening', '开篇钩子', 'ok', '前 300 字存在冲突/疑问线索')
    else t('opening', '开篇钩子', 'warn', `前 300 字张力线索偏少（命中 ${headHits} 项）`)
    // 章末钩子：末段含问号/悬念词
    const tail = content.trim().slice(-200)
    const tailHook = /[？?]|为什么|难道|竟然|到底|怎么回事|会是|难道说|等着|即将|必须/.test(tail)
    if (tailHook) t('ending', '章末钩子', 'ok', '末段含悬念/推进信号')
    else t('ending', '章末钩子', 'warn', '末段未检测到明显悬念信号')
    // AI 痕迹密度（低置信提示项）
    const density = this.aiTraceDensity(content)
    if (density > 0.03) t('ai-trace', 'AI 痕迹', 'warn', `疑似模板词密度 ${(density * 100).toFixed(1)}%（阈值 3%）`)
    else t('ai-trace', 'AI 痕迹', 'ok', `疑似模板词密度 ${(density * 100).toFixed(1)}%`)
    return { words, scenes, items }
  }

  aiTraceDensity(content) {
    const patterns = [
      '宛如', '仿佛', '如同', '不由得', '眸子', '眸中', '轻声', '淡淡道', '微微一顿', '顿了顿',
      '心中一凛', '脸色微变', '嘴角勾起', '意味深长', '沉声道', '缓缓开口', '一抹' , '思绪万千',
      '时间仿佛', '空气仿佛', '时光荏苒', '岁月如梭', '深吸一口气',
    ]
    const cnt = patterns.reduce((a, p) => a + (content.includes(p) ? 1 : 0), 0)
    const words = Math.max(this.countWords(content), 1)
    return cnt / (words / 1000) / 100
  }

  // ── 元数据（.dsh-plugin/meta.json）────────────────────────────────────

  readMeta(novelId) {
    const p = join(this.metaDir(novelId), 'meta.json')
    try {
      return JSON.parse(readFileSync(p, 'utf8'))
    } catch (error) {
      // 损坏保护：把坏文件改名隔离（而非静默当 {}），避免「读损坏→写回」级联抹掉全部章节记录
      if (error instanceof SyntaxError || (error.code !== 'ENOENT' && error.code !== undefined)) {
        try {
          renameSync(p, `${p}.corrupt-${Date.now()}`)
          this.logger()?.warn(`dsh-novel-writing: meta.json 损坏已隔离（${p}.corrupt-*），章节元数据从头累计`)
        } catch { /* 隔离失败则按空处理 */ }
      }
      return {}
    }
  }

  writeMeta(novelId, meta) {
    this.atomicWrite(join(this.metaDir(novelId), 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
  }

  /** 保存章节（UI 编辑或强制写入）：通过门禁或 force；记录审计；更新统计。 */
  saveChapter(novelId, num, content, opts = {}) {
    this.assertEnabled()
    const numStr = this.normalizeChapterNum(num)
    const file = this.chapterFile(novelId, numStr)
    mkdirSync(dirname(file), { recursive: true })
    const gate = this.gateCheck(novelId, numStr, content)
    const force = opts.force === true || opts.force === 'true'
    if (gate.available && gate.passed === false && !force) {
      throw new Error(`门禁未通过：场景覆盖率 ${gate.coverage}%，命中禁止项 ${(gate.bannedHits ?? []).join('、') || '无'}。请修正后保存（人工改稿可强制）`)
    }
    this.atomicWrite(file, content)
    const words = this.countWords(content)
    const meta = this.readMeta(novelId)
    meta.chapters = meta.chapters ?? {}
    meta.chapters[numStr] = {
      ...(meta.chapters[numStr] ?? {}),
      words,
      updatedAt: new Date().toISOString(),
      gate: { ...(gate ?? {}), at: new Date().toISOString() },
      forced: force ? true : (meta.chapters[numStr]?.forced === true),
      lastEditSource: opts.source ?? 'studio',
    }
    this.writeMeta(novelId, meta)
    // 统计按实际文件重算（total_chapters = 章节文件数，total_words = meta 各章字数汇总），
    // 杜绝「保存后总字数归零」与删章/跳章错计。
    const chapters = this.chapterList(novelId)
    const totalWords = chapters.reduce((acc, c) => acc + (typeof c.words === 'number' ? c.words : 0), 0)
    this.updateState(novelId, { statistics: { total_chapters: chapters.length, total_words: totalWords } })
    this.pushVersion(`chapter:${novelId}:${numStr}`)
    return { file, gate, words }
  }

  /** 审查结论落盘（服务层收口）：结构化 meta + 报告文件，零容忍规则在此执行。 */
  recordReview(novelId, review) {
    this.assertEnabled()
    const numStr = this.normalizeChapterNum(review.chapter)
    const verdict = review.verdict === 'pass' ? 'pass' : 'fail'
    const score = Number(review.score)
    if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error('score must be an integer in [0,100]')
    const findings = Array.isArray(review.findings) ? review.findings.map((f) => String(f).trim()).filter((f) => f !== '') : []
    if (findings.length < 2) throw new Error('review invalid: 至少 2 条非空具体发现（无发现的"通过"视为无效审查）')
    // 零容忍：verdict=pass 当且仅当满分 100 且无未通过硬门禁
    if (verdict === 'pass' && (score < 100 || (Array.isArray(review.hardGates) && review.hardGates.length > 0))) {
      throw new Error('review invalid: 100 分是唯一通过标准——score<100 或存在未通过硬门禁时 verdict 必须为 fail')
    }
    const meta = this.readMeta(novelId)
    meta.chapters = meta.chapters ?? {}
    meta.chapters[numStr] = {
      ...(meta.chapters[numStr] ?? {}),
      reviewScore: score,
      reviewVerdict: verdict,
      reviewFindings: findings,
      reviewHardGates: Array.isArray(review.hardGates) ? review.hardGates.map(String) : [],
      reviewAt: new Date().toISOString(),
    }
    this.writeMeta(novelId, meta)
    const report = {
      chapter: Number(numStr), verdict, score,
      findings, hardGates: Array.isArray(review.hardGates) ? review.hardGates.map(String) : [],
      at: new Date().toISOString(),
    }
    const dir = join(this.projectDir(novelId), '10-reviews', 'quality-reports')
    mkdirSync(dir, { recursive: true })
    this.atomicWrite(join(dir, `chapter-${numStr}-review.json`), JSON.stringify(report, null, 2) + '\n')
    this.pushVersion(`review:${novelId}:${numStr}`)
    return { ok: true, score, verdict }
  }

  // ── UI 请求（用户从工作台提交的优化/发布/数据请求）───────────────────
  listRequests(novelId) {
    const dir = join(this.projectDir(novelId), REQUEST_DIR)
    let files = []
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    } catch {
      return []
    }
    const out = []
    for (const f of files) {
      try {
        out.push(JSON.parse(readFileSync(join(dir, f), 'utf8')))
      } catch { /* skip broken */ }
    }
    return out
  }

  createRequest(novelId, req) {
    this.assertEnabled()
    const dir = join(this.projectDir(novelId), REQUEST_DIR)
    mkdirSync(dir, { recursive: true })
    const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const entry = {
      id,
      kind: typeof req.kind === 'string' ? req.kind : 'manual',
      chapter: req.chapter ?? null,
      note: typeof req.note === 'string' ? req.note : '',
      createdAt: new Date().toISOString(),
      status: 'pending',
    }
    this.atomicWrite(join(dir, id + '.json'), JSON.stringify(entry, null, 2) + '\n')
    this.pushVersion(`request:${novelId}:${id}`)
    return entry
  }

  completeRequest(novelId, id) {
    const dir = join(this.projectDir(novelId), REQUEST_DIR)
    const file = join(dir, id.replace(/[^A-Za-z0-9_.-]/g, '') + '.json')
    if (!existsSync(file)) throw new Error(`request not found: ${id}`)
    let entry
    try {
      entry = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      throw new Error(`request file corrupted: ${id}（请手工清理 ${file}）`)
    }
    entry.status = 'done'
    entry.doneAt = new Date().toISOString()
    this.atomicWrite(file, JSON.stringify(entry, null, 2) + '\n')
    this.pushVersion(`request-done:${novelId}:${id}`)
    return entry
  }

  // ── 发布 ─────────────────────────────────────────────────────────────

  readPublishLog(novelId) {
    const p = join(this.metaDir(novelId), 'publish-log.json')
    try {
      return JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      return []
    }
  }

  appendPublishLog(novelId, entry) {
    const log = this.readPublishLog(novelId)
    log.unshift({ ...entry, at: new Date().toISOString() })
    this.atomicWrite(join(this.metaDir(novelId), 'publish-log.json'), JSON.stringify(log.slice(0, 100), null, 2) + '\n')
  }

  /** 异步执行用户配置命令（spawn + 超时 kill + 输出上限），绝不阻塞宿主事件循环。 */
  runCommand(command, env, timeoutMs = 180000) {
    return new Promise((resolve) => {
      const child = spawn(command, [], {
        shell: true,
        env: { ...process.env, ...env },
        windowsHide: true,
      })
      let stdout = ''
      let stderr = ''
      let killed = false
      const timer = setTimeout(() => {
        killed = true
        try { child.kill() } catch { /* already gone */ }
      }, timeoutMs)
      child.stdout?.on('data', (c) => { if (stdout.length < 65536) stdout += String(c) })
      child.stderr?.on('data', (c) => { if (stderr.length < 16384) stderr += String(c) })
      child.on('error', (error) => {
        clearTimeout(timer)
        resolve({ ok: false, exitCode: null, stdout, stderr: (stderr + '\n' + String(error.message ?? error)).trim(), timedOut: false })
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        resolve({ ok: code === 0 && !killed, exitCode: code, stdout: stdout.slice(0, 4000), stderr: stderr.slice(0, 2000), timedOut: killed })
      })
    })
  }

  /** 平台名清洗：去非法文件字符后不得为空/含 .. 段，否则回退「默认」。 */
  sanitizePlatform(name) {
    const clean = String(name ?? '').replace(/[\\/:*?"<>|]/g, '-').trim()
    if (clean === '' || clean === '.' || clean === '..' || clean.split(/[\\/]/).some((seg) => seg === '..')) return '默认'
    return clean
  }

  async publish(novelId, opts) {
    this.assertEnabled()
    // 发布合规门禁在服务层收口：工具（novel_publish）与 HTTP（工作台发布按钮）同一约束
    const state = this.readState(novelId)
    if (state === null) throw new Error(`novel not found: ${novelId}`)
    if (state.guardrails?.release_allowed !== true) {
      throw new Error('release_allowed=false：AI 合规门禁未通过，禁止进入发布流程（先完成 human_ai_collaboration 评估）')
    }
    const platform = this.sanitizePlatform(typeof opts.platform === 'string' ? opts.platform : '默认')
    const chapters = Array.isArray(opts.chapters)
      ? opts.chapters.map((n) => this.normalizeChapterNum(n))
      : null
    const cfg = this.cfg()
    const pcfg = cfg.platforms?.[platform] ?? { mode: 'export', command: '', enabled: false }
    const mode = opts.mode ?? pcfg.mode ?? 'export'
    const dir = join(this.projectDir(novelId), DIST_DIR, platform)
    mkdirSync(dir, { recursive: true })

    const list = this.chapterList(novelId)
    const selected = chapters === null ? list : list.filter((c) => chapters.includes(String(c.num).padStart(3, '0')))
    if (selected.length === 0) throw new Error('no chapters selected for publish')

    const report = []
    const meta = mode === 'manual' ? null : this.readMeta(novelId)
    if (meta !== null) meta.chapters = meta.chapters ?? {}
    for (const ch of selected) {
      const data = this.readChapter(novelId, ch.num)
      const key = String(ch.num).padStart(3, '0')
      if (mode !== 'manual') {
        // export/command：产出定稿文件并标记 published；manual 仅出清单，不动产物与标记
        const body = `# 第${ch.num}章 ${this.chapterTitle(data.content)}\n\n${data.content}\n\n---\n本章字数：${data.words}`
        this.atomicWrite(join(dir, `chapter-${key}.md`), body)
        this.atomicWrite(join(dir, `chapter-${key}.txt`), data.content)
        meta.chapters[key] = { ...(meta.chapters[key] ?? {}), published: true, publishedAt: new Date().toISOString() }
      }
      report.push({ num: ch.num, words: data.words, file: `chapter-${key}.md` })
    }
    if (meta !== null) this.writeMeta(novelId, meta)

    // 发布清单：逐章人工步骤 + 配置的自动化命令
    const checklist = [`# ${platform} 发布清单（${new Date().toISOString().slice(0, 10)}）`, '',
      '> 各平台编辑后台无公开 API，发布依靠导出的定稿产物 + 人工粘贴或配置的自动化脚本。', '',
      `## 本次发布章节（${selected.length} 章）`, ...report.map((r) => `- [ ] 第${r.num}章（${r.words} 字）→ chapter-${String(r.num).padStart(3, '0')}.md`), '',
      '## 标准流程', '1. 校对 exported 章节（先行 AI 痕迹/敏感词自检）',
      '2. 平台后台逐章粘贴（或运行配置的 command 自动化）',
      '3. 设定章节发布顺序与定时（如每日 12:00 / 18:00 双更）',
      '4. 记录发布回执到 11-data-monitoring/',
    ]
    this.atomicWrite(join(dir, '发布清单.md'), checklist.join('\n'))

    let commandResult = null
    if (mode === 'command' && typeof pcfg.command === 'string' && pcfg.command !== '') {
      commandResult = await this.runCommand(pcfg.command, {
        DSH_NOVEL_DIR: this.novelDir(novelId),
        DSH_PROJECT_DIR: this.projectDir(novelId),
        DSH_DIST_DIR: dir,
        DSH_PLATFORM: platform,
      })
      if (commandResult.ok !== true) {
        const reason = commandResult.timedOut ? `timed out（>${180000 / 1000}s）` : `exit ${commandResult.exitCode ?? 'spawn error'}`
        this.appendPublishLog(novelId, { platform, mode, chapters: report.map((r) => r.num), ok: false, error: commandResult.stderr || reason, dir })
        this.pushVersion(`publish:${novelId}`)
        throw new Error(`platform command failed (${reason}): ${commandResult.stderr.slice(0, 500)}`)
      }
    }

    this.appendPublishLog(novelId, { platform, mode, chapters: report.map((r) => r.num), ok: true, dir })
    this.pushVersion(`publish:${novelId}`)
    return { platform, mode, dir, chapters: report, checklist: join(dir, '发布清单.md'), commandResult }
  }

  chapterTitle(content) {
    const first = content.split('\n').find((l) => l.startsWith('# '))
    if (first !== undefined) return first.slice(2).trim()
    const m = content.match(/第[一二三四五六七八九十百千0-9]+章[^\n]{0,30}/)
    return m !== null ? m[0] : ''
  }

  // ── 数据回流与信号 ───────────────────────────────────────────────────

  dataFilePath(novelId) {
    return join(this.projectDir(novelId), DATA_DIR, METRICS_FILE)
  }

  readMetrics(novelId) {
    try {
      return JSON.parse(readFileSync(this.dataFilePath(novelId), 'utf8'))
    } catch {
      return []
    }
  }

  /** 平台数据入库：{date?, chapter?, 完读率?/readRate, 读完率?/finishRate, 追读?/retention, 收藏?/collections, 日增?/dailyCollections, 推荐票?/votes, 评论数?/comments, 收益?/revenue} 或数组。 */
  ingestData(novelId, records) {
    this.assertEnabled()
    const list = Array.isArray(records) ? records : [records]
    if (list.length === 0 || list.some((r) => r === null || typeof r !== 'object')) {
      throw new Error('data records must be an object or array of objects')
    }
    for (const r of list) {
      if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) throw new Error('each record needs a date (YYYY-MM-DD)')
    }
    // 按 date 去重（同日重复录入后到覆盖先到）+ 滚动裁剪（保留最近 730 条，约两年）
    const existing = this.readMetrics(novelId)
    const byDate = new Map()
    for (const r of existing) byDate.set(String(r.date), r)
    for (const r of list) byDate.set(String(r.date), { ...r, createdAt: new Date().toISOString() })
    let merged = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
    if (merged.length > 730) merged = merged.slice(-730)
    mkdirSync(dirname(this.dataFilePath(novelId)), { recursive: true })
    this.atomicWrite(this.dataFilePath(novelId), JSON.stringify(merged, null, 2) + '\n')
    this.pushVersion(`data:${novelId}`)
    return { stored: list.length, total: merged.length, signals: this.computeSignals(novelId) }
  }

  /**
   * 数据适配器入库：执行平台配置的 fetchCommand（异步，不阻塞宿主），解析 stdout 的
   * JSON 行（每行 {"date":"YYYY-MM-DD","完读率":…,"追读":…}）并入库。
   */
  async ingestFromAdapter(novelId, platform) {
    this.assertEnabled()
    const pcfg = this.cfg().platforms?.[platform]
    if (pcfg === undefined || typeof pcfg.fetchCommand !== 'string' || pcfg.fetchCommand === '') {
      throw new Error(`platform "${platform}" has no fetchCommand configured (settings novel-writing.platforms)`)
    }
    const res = await this.runCommand(pcfg.fetchCommand, {
      DSH_NOVEL_DIR: this.novelDir(novelId),
      DSH_PROJECT_DIR: this.projectDir(novelId),
      DSH_PLATFORM: platform,
    }, 120000)
    if (!res.ok) {
      const reason = res.timedOut ? 'timed out（>120s）' : `exit ${res.exitCode ?? 'spawn error'}`
      throw new Error(`fetchCommand failed (${reason}): ${String(res.stderr ?? '').slice(0, 400)}`)
    }
    const lines = String(res.stdout ?? '').split('\n').map((l) => l.trim()).filter((l) => l !== '' && !l.startsWith('#'))
    const records = []
    for (const line of lines) {
      const first = line[0]
      if (first !== '{' && first !== '[') continue
      try {
        const parsed = JSON.parse(line)
        if (Array.isArray(parsed)) records.push(...parsed)
        else records.push(parsed)
      } catch { /* 跳过非 JSON 行 */ }
    }
    if (records.length === 0) throw new Error('fetchCommand produced no JSON records on stdout')
    return this.ingestData(novelId, records)
  }

  /** 信号检测（阈值表来自源工作流 v4.x 数据监控 skill，硬编码为参考值）。 */
  computeSignals(novelId) {
    const metrics = this.readMetrics(novelId)
    if (metrics.length === 0) return []
    const out = []
    const sorted = [...metrics].sort((a, b) => String(a.date).localeCompare(String(b.date)))
    const last = sorted[sorted.length - 1]
    const readRate = this.firstNumberSafe(last, ['完读率', 'readRate'])
    if (readRate !== null && readRate < 10) {
      out.push({ signal: '完读率低', severity: 'high', actual: readRate, threshold: '<10%（10万字节点）', action: '触发开篇优化：重审前3章（opening-optimization）' })
    }
    if (this.firstNumberSafe(last, ['读完率', 'finishRate']) !== null && this.firstNumberSafe(last, ['读完率', 'finishRate']) < 30) {
      out.push({ signal: '章节流失', severity: 'high', actual: this.firstNumberSafe(last, ['读完率', 'finishRate']), threshold: '<30%', action: '定位流失章节 → 生成章节诊断与重写建议' })
    }
    // 追读连续 3 天下降 >10%
    const retention = sorted.map((r) => this.firstNumberSafe(r, ['追读', 'retention'])).filter((v) => v !== null).slice(-4)
    if (retention.length >= 4) {
      const [a, b, c, d] = retention.slice(-4)
      if (d < c * 0.9 && c < b * 0.9 && b < a * 0.9) {
        out.push({ signal: '追读下降', severity: 'high', actual: `${d}（${a}→${d}）`, threshold: '连续3天降幅>10%', action: '触发最近3章节奏/爽点分析' })
      } else if (d < c * 0.9) {
        out.push({ signal: '追读单日下降', severity: 'medium', actual: `${d}（前值 ${c}）`, threshold: '>10%/天', action: '关注最新章节节奏，3天连续则触发分析' })
      }
    }
    // 收藏停滞：连续 7 天日增 < 10
    const daily = sorted.map((r) => this.firstNumberSafe(r, ['日增收藏', 'dailyCollections', '日增'])).filter((v) => v !== null).slice(-7)
    if (daily.length >= 7 && daily.every((v) => v < 10)) {
      out.push({ signal: '收藏停滞', severity: 'medium', actual: Math.min(...daily), threshold: '连续7天日增<10', action: '书名/简介/封面优化建议' })
    }
    // 差评集中：comments 文本关键词（可选；类型守卫防非字符串打崩 novelDetail）
    const issueCount = typeof last.commentsText === 'string' && last.commentsText !== ''
      ? Object.values(simpleTally(sectionKeywords(last.commentsText))).some((n) => n >= 3)
      : false
    if (issueCount) {
      out.push({ signal: '差评集中', severity: 'medium', actual: '≥3条同类差评', threshold: '同一问题≥3条', action: '提取关键词 → 修改方案 → 回归验证' })
    }
    // 财务止损（可选数据）：收益连续4周降>20%
    const revenue = sorted.map((r) => this.firstNumberSafe(r, ['收益', 'revenue', 'sales'])).filter((v) => v !== null).slice(-5)
    if (revenue.length >= 5) {
      const [a, b, c, d, e] = revenue.slice(-5)
      if (e < d * 0.8 && d < c * 0.8 && c < b * 0.8 && b < a * 0.8) {
        out.push({ signal: '收益持续下滑', severity: 'high', actual: `${a}→${e}`, threshold: '连续4周降幅>20%', action: '止损决策框架：评估停更/改向/完结' })
      }
    }
    return out
  }

  firstNumberSafe(record, keys) {
    for (const k of keys) {
      const v = record?.[k]
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
    }
    return null
  }

  // ── HTTP API（webServer，默认回环）────────────────────────────────────

  registerHttp(webServer) {
    const api = (path, handler) => {
      const FULL = '/novel-writing/api/' + path
      webServer.register({
        kind: 'exact',
        path: FULL,
        handler: (req, res) => {
          if (this.cfg().enabled === false) {
            res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'novel-writing disabled (novel-writing.enabled=false)' }))
            return
          }
          const ok = this.isLocalRequest(req) || this.cfg().apiPublic === true
          if (!ok) {
            res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
            res.end('forbidden: novel-writing api is loopback-only (set novel-writing.apiPublic: true to expose)')
            return
          }
          // CSRF 防护：写方法必须携带同源 Origin/Referer（跨站简单请求不带同源 Origin），
          // 且 content-type 必须是 application/json（text/plain 简单请求直接拒绝）。
          if (req.method === 'POST' && this.cfg().apiPublic !== true && !this.sameOriginPost(req)) {
            res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'cross-origin POST rejected (Origin/Referer must match the harness origin; content-type must be application/json)' }))
            return
          }
          const send = (status, body) => {
            res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            res.end(JSON.stringify(body))
          }
          const readBody = () => new Promise((resolveBody) => {
            let raw = ''
            let tooLarge = false
            req.on('data', (c) => {
              raw += c
              if (raw.length > 4 * 1024 * 1024) { // 4MB 上限，超出即断开
                tooLarge = true
                try { req.destroy() } catch { /* ignore */ }
                resolveBody({ __error: 'payload too large (max 4MB)' })
              }
            })
            req.on('end', () => {
              if (tooLarge) return
              try { resolveBody(raw === '' ? {} : JSON.parse(raw)) } catch { resolveBody(raw === '' ? {} : { __raw: raw }) }
            })
          })
          Promise.resolve()
            .then(async () => {
              const arg = readBody()
              const body = await arg
              if (body !== null && typeof body === 'object' && body.__error !== undefined) {
                if (!res.writableEnded) send(413, { error: body.__error })
                return
              }
              const result = await handler(req, res, send, body)
              if (result !== undefined && !res.writableEnded) send(200, result)
            })
            .catch((error) => {
              if (!res.writableEnded) send(400, { error: error instanceof Error ? error.message : String(error) })
            })
        },
      })
    }

    api('overview', async () => this.listNovels())

    api('novel', (req, res, send, arg) => {
      const id = this.queryOf(req.url, 'id')
      if (id === null || id === '') throw new Error('id query required')
      return this.novelDetail(id)
    })

    api('chapter', async (req, res, send, arg) => {
      const q = this.queryOf(req.url, '')
      if (req.method === 'POST') {
        const novel = arg.novel
        if (novel === undefined || arg.chapter === undefined || typeof arg.content !== 'string') throw new Error('novel/chapter/content required')
        const saved = this.saveChapter(novel, arg.chapter, arg.content, { force: arg.force === true })
        return { ok: true, ...saved }
      }
      const novel = q.get('novel')
      const chapter = q.get('chapter')
      if (novel === null || chapter === null) throw new Error('novel/chapter query required')
      return this.readChapter(novel, chapter)
    })

    api('gate', async (req, res, send, arg) => {
      const novel = arg.novel
      const chapter = arg.chapter
      if (novel === undefined || chapter === undefined || typeof arg.content !== 'string') throw new Error('novel/chapter/content required')
      return this.computeGate(novel, chapter, arg.content)
    })

    api('request', async (req, res, send, arg) => {
      if (arg.novel === undefined) throw new Error('novel required')
      return this.createRequest(arg.novel, arg)
    })

    api('novel-create', async (req, res, send, arg) => {
      return this.createProject(arg.name, arg.title)
    })

    // UX-011：删除小说（body { novel }；id 校验/路径穿越防护/not found 语义见 deleteProject）
    api('novel-delete', async (req, res, send, arg) => {
      if (arg.novel === undefined) throw new Error('novel required')
      return this.deleteProject(arg.novel)
    })

    api('file', (req, res, send, arg) => {
      const novel = this.queryOf(req.url, 'novel')
      const path = this.queryOf(req.url, 'path')
      if (novel === null || path === null) throw new Error('novel/path query required')
      return this.readProjectFile(novel, path)
    })

    api('request-done', async (req, res, send, arg) => {
      if (arg.novel === undefined || arg.id === undefined) throw new Error('novel/id required')
      return this.completeRequest(arg.novel, arg.id)
    })

    api('publish', async (req, res, send, arg) => {
      if (arg.novel === undefined) throw new Error('novel required')
      return this.publish(arg.novel, arg)
    })

    api('data', async (req, res, send, arg) => {
      if (arg.novel === undefined || arg.records === undefined) throw new Error('novel/records required')
      return this.ingestData(arg.novel, arg.records)
    })

    api('preset-sync', async () => {
      this.ensurePreset()
      return { ok: true, dir: join(resolveDshHome(), '.agent-presets', PRESET_ID) }
    })
  }

  queryOf(url, key) {
    const idx = url.indexOf('?')
    if (idx < 0) return key === '' ? new Map() : null
    const params = new URLSearchParams(url.slice(idx + 1))
    return key === '' ? params : params.get(key)
  }

  /** 回环判定：以连接来源（socket.remoteAddress）为准，Host 头仅兜底（可伪造）。 */
  isLocalRequest(req) {
    const addr = String(req.socket?.remoteAddress ?? '').replace(/^::ffff:/, '').toLowerCase()
    if (addr === '127.0.0.1' || addr === '::1' || addr === 'localhost') return true
    const host = String(req.headers?.host ?? '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  }

  /**
   * 写方法同源校验：apiPublic=false（默认回环）时，POST 必须来自本宿主页面——
   * Origin/Referer 至少一个存在且 host 与请求 Host 一致，且 content-type 为 JSON。
   * 拒绝跨站「简单请求」CSRF（text/plain 表单可绕预检但绕不过这里）。
   */
  sameOriginPost(req) {
    const host = String(req.headers?.host ?? '').toLowerCase()
    if (host === '') return false
    const ctype = String(req.headers?.['content-type'] ?? '').toLowerCase()
    if (!ctype.includes('application/json')) return false
    const origin = req.headers?.origin
    const referer = req.headers?.referer
    const candidates = []
    if (typeof origin === 'string' && origin !== '') {
      try { candidates.push(new URL(origin).host.toLowerCase()) } catch { return false }
    }
    if (typeof referer === 'string' && referer !== '') {
      try { candidates.push(new URL(referer).host.toLowerCase()) } catch { return false }
    }
    if (candidates.length === 0) return false
    return candidates.every((c) => c === host)
  }
}

// #region 数据工具（导出供测试复用）
function sectionKeywords(text) {
  const out = {}
  for (const m of text.matchAll(/[\u4e00-\u9fff]{2,8}/g)) {
    out[m[0]] = (out[m[0]] ?? 0) + 1
  }
  return out
}

function simpleTally(map) {
  const out = {}
  for (const [k, v] of Object.entries(map)) if (v >= 3) out[k] = v
  return out
}
// #endregion

export function apply(ctx) {
  const service = new NovelWritingService(ctx)

  // 注册设置节：小说工作区根目录、平台发布配置、轮询周期等。
  ctx.settings.register(NS, Config)

  service.ensurePreset()

  const webServer = ctx.get('webServer')
  if (webServer !== undefined) {
    ctx.effect(() => service.registerHttp(webServer), 'dsh-novel-writing: http routes')
  } else {
    ctx.logger?.warn('dsh-novel-writing: no webServer mounted; browser studio API unavailable')
  }
  service.ctx = ctx
  return service
}

export { NovelWritingService }
