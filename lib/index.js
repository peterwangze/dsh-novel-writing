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
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync,
} from 'node:fs'
import { join, dirname, basename, extname, resolve as pathResolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
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
})

const PROJECT_DIR = 'novel-project'
const META_DIR = '.dsh-plugin'
const STATE_FILE = 'workflow-state.json'
const CHAPTER_DIR = '07-content'
const OUTLINE_DIR = '06-chapter-outlines'
const CONTINUITY_DIR = '17-continuity'
const CONTEXT_PREFIX = 'chapter-'
const CONTEXT_SUFFIX = '-context.md'
const BIBLE_FILE = 'story-bible.md'
const LEDGER_FILE = 'continuity-ledger.md'
const DATA_DIR = '11-data-monitoring'
const METRICS_FILE = 'metrics.json'
const REQUEST_DIR = '18-requests'
const DIST_DIR = 'dist'
const PRESET_ID = 'novel-writing'
const PRESET_MARKER = '.dsh-bundle-version'

const AUTH_PATHS = ['novel-writing']

class NovelWritingService extends Service {
  constructor(ctx) {
    super(ctx, 'novel-writing')
    this.ctx = ctx
    this.version = 0
    this.cfg = () => {
      const c = ctx.settings.get(NS)
      return c === undefined ? Config({}) : c
    }
    this.ensurePreset()
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

  /** 把包内 agent-presets/novel-writing 同步到用户预设根（幂等，按版本标记）。 */
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
      mkdirSync(userDir, { recursive: true })
      cpSync(pkgDir, userDir, { recursive: true, force: true })
      writeFileSync(markerPath, version, 'utf8')
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
    const p = this.statePath(novelId)
    const tmp = p + '.tmp'
    writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8')
    rmSync(p, { force: true })
    writeFileSync(p, JSON.stringify(state, null, 2) + '\n', 'utf8')
  }

  /** 增量更新工作流状态：追加完成阶段、深合并 project_info、回写 guardrails/statistics。 */
  updateState(novelId, patch) {
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
      return { root, novels: [] }
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
        requests: this.listRequests(id).length,
      })
    }
    novels.sort((a, b) => String(b.lastUpdated ?? '').localeCompare(String(a.lastUpdated ?? '')))
    return { root, novels }
  }

  novelDetail(novelId) {
    const state = this.readState(novelId)
    if (state === null) throw new Error(`novel not found: ${novelId}`)
    const chapters = this.chapterList(novelId)
    const requests = this.listRequests(novelId)
    const signals = this.computeSignals(novelId)
    const meta = this.readMeta(novelId)
    return {
      id: novelId,
      state,
      chapters,
      requests,
      signals,
      meta,
      publishLog: this.readPublishLog(novelId),
      files: this.fileIndex(novelId),
    }
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

  chapterFile(novelId, num, dir = CHAPTER_DIR) {
    return join(this.projectDir(novelId), dir, `chapter-${String(num).padStart(3, '0')}.md`)
  }

  outlineFile(novelId, num) {
    return this.chapterFile(novelId, num, OUTLINE_DIR)
  }

  contextCardFile(novelId, num) {
    return join(this.projectDir(novelId), CONTINUITY_DIR, `${CONTEXT_PREFIX}${String(num).padStart(3, '0')}${CONTEXT_SUFFIX}`)
  }

  chapterList(novelId) {
    const dir = join(this.projectDir(novelId), CHAPTER_DIR)
    let files = []
    try {
      files = readdirSync(dir).filter((f) => /^chapter-\d{3}\.md$/.test(f)).sort()
    } catch {
      return []
    }
    const meta = this.readMeta(novelId)
    return files.map((f) => {
      const num = Number(f.slice(8, 11))
      const full = join(dir, f)
      let size = 0; let mtime = 0
      try {
        const st = statSync(full)
        size = st.size; mtime = st.mtimeMs
      } catch { /* skip */ }
      const entry = meta.chapters?.[String(num)] ?? {}
      let words = 0
      try {
        words = this.countWords(readFileSync(full, 'utf8'))
      } catch { /* skip */ }
      return {
        num,
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

  /** 正文看护硬门禁：场景覆盖率 + 禁止项（偏离度）+ 元数据。机械规则，零容忍。 */
  gateCheck(novelId, num, content) {
    const numStr = String(num).padStart(3, '0')
    let contextText = ''
    try {
      contextText = readFileSync(this.contextCardFile(novelId, numStr), 'utf8')
    } catch {
      return { available: false, coverage: null, drift: null, scenes: [], banned: [], passed: null, note: 'no context card' }
    }
    const scenes = this.parseScenes(contextText)
    const banned = this.parseBanned(contextText)
    const covered = scenes.map((scene) => {
      const matched = this.sceneMatched(content, scene)
      return { ...scene, matched }
    })
    const coverage = scenes.length === 0 ? null : Math.round((covered.filter((s) => s.matched).length / scenes.length) * 1000) / 10
    const hits = banned.filter((term) => term !== '' && content.includes(term))
    // 偏离度：命中禁止项条数 / 禁止项总数（0 表示零偏离）
    const drift = banned.length === 0 ? null : Math.round((hits.length / banned.length) * 1000) / 10
    const passed = coverage === null || (coverage === 100 && (drift === null || drift === 0))
    const meta = this.readMeta(novelId)
    meta.chapters = meta.chapters ?? {}
    meta.chapters[numStr] = {
      ...(meta.chapters[numStr] ?? {}),
      gate: {
        at: new Date().toISOString(),
        coverage, drift,
        missedScenes: covered.filter((s) => !s.matched).map((s) => s.title),
        bannedHits: hits,
        passed,
      },
    }
    this.writeMeta(novelId, meta)
    this.pushVersion(`gate:${novelId}:${numStr}`)
    return { available: true, coverage, drift, scenes: covered, bannedHits: hits, passed, note: null }
  }

  parseScenes(contextText) {
    const section = this.sectionOf(contextText, '本章必写场景')
    if (section === null) return []
    const scenes = []
    for (const line of section.split('\n')) {
      const m = line.match(/^\s*\d+[\.、）)\s]\s*\*\*(.+?)\*\*\s*[:：]?\s*(.*)$/)
      if (m !== null) scenes.push({ title: m[1].trim(), desc: (m[2] ?? '').trim() })
    }
    return scenes
  }

  parseBanned(contextText) {
    const section = this.sectionOf(contextText, '本章禁止偏离项')
    if (section === null) return []
    const terms = []
    for (const raw of section.split('\n')) {
      const line = raw.replace(/^\s*-\s*/, '').trim()
      if (line === '') continue
      // 「不得让 X …」→ 提取 X（人名/对象；懒匹配到「在/是/的/和/被」等后置词为止）
      const named = line.match(/不得让\s*([\u4e00-\u9fffA-Za-z]{1,8}?)(?=[在是的和与被，。；、：！？】）)]|$)/)
      if (named !== null && named[1] !== '') terms.push(named[1])
      // 引号/括号内术语：中文书名号「」" “ ” （） ()
      for (const q of line.matchAll(/[「「""《（(]([^」」""》）)]{2,16})[」」""》）)]/g)) {
        terms.push(q[1])
      }
      // “不得跳过 … ” 与 “不得无铺垫引入” 等整句降级为短语
    }
    return [...new Set(terms)].filter((t) => t.length <= 16)
  }

  /** 场景是否命中：标题词出现，或描述关键词按 4 字滑窗模糊命中 ≥2 个。 */
  sceneMatched(content, scene) {
    if (scene.title !== '' && content.includes(scene.title)) return true
    const words = this.keywordsOf(scene.desc)
    if (words.length === 0) return false
    const hit = words.filter((w) => this.contentContainsFuzzy(content, w)).length
    return hit >= Math.min(2, words.length)
  }

  /** 内容是否包含关键词：精确包含，或关键词 4 字滑窗中的任一个在内容中出现（长短语局部匹配）。 */
  contentContainsFuzzy(content, token) {
    if (token.length < 4) return content.includes(token)
    if (content.includes(token)) return true
    for (let i = 0; i + 4 <= token.length; i++) {
      if (content.includes(token.slice(i, i + 4))) return true
    }
    return false
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
    const hit = lines.findIndex((l) => l.trim().startsWith('##') && l.includes(heading))
    if (hit < 0) return null
    const block = []
    for (let i = hit + 1; i < lines.length; i++) {
      if (/^#{1,3}\s/.test(lines[i])) break
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
    const hookWords = ['了', '但是', '却', '突然', '发现', '异常', '死', '血', '为什么', '竟然', '不对', '站住', '敲门', '电话', '失踪', '？']
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
    } catch {
      return {}
    }
  }

  writeMeta(novelId, meta) {
    const p = join(this.metaDir(novelId), 'meta.json')
    writeFileSync(p, JSON.stringify(meta, null, 2) + '\n', 'utf8')
  }

  /** 保存章节（UI 编辑或强制写入）：通过门禁或 force；记录审计；更新统计。 */
  saveChapter(novelId, num, content, opts = {}) {
    const numStr = String(num).padStart(3, '0')
    const file = this.chapterFile(novelId, numStr)
    mkdirSync(dirname(file), { recursive: true })
    const gate = this.gateCheck(novelId, numStr, content)
    const force = opts.force === true || opts.force === 'true'
    if (gate.available && gate.passed === false && !force) {
      throw new Error(`门禁未通过：场景覆盖率 ${gate.coverage}%，命中禁止项 ${(gate.bannedHits ?? []).join('、') || '无'}。请修正后保存（人工改稿可强制）`)
    }
    writeFileSync(file, content, 'utf8')
    const meta = this.readMeta(novelId)
    meta.chapters = meta.chapters ?? {}
    meta.chapters[numStr] = {
      ...(meta.chapters[numStr] ?? {}),
      words: this.countWords(content),
      updatedAt: new Date().toISOString(),
      gate: { ...(gate ?? {}), at: new Date().toISOString() },
      forced: force ? true : (meta.chapters[numStr]?.forced === true),
      lastEditSource: opts.source ?? 'studio',
    }
    this.writeMeta(novelId, meta)
    const state = this.readState(novelId)
    const stats = { total_chapters: Math.max(state?.statistics?.total_chapters ?? 0, Number(numStr)), total_words: 0 }
    this.updateState(novelId, { statistics: stats })
    this.pushVersion(`chapter:${novelId}:${numStr}`)
    return { file, gate, words: this.countWords(content) }
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
    writeFileSync(join(dir, id + '.json'), JSON.stringify(entry, null, 2) + '\n', 'utf8')
    this.pushVersion(`request:${novelId}:${id}`)
    return entry
  }

  completeRequest(novelId, id) {
    const dir = join(this.projectDir(novelId), REQUEST_DIR)
    const file = join(dir, id.replace(/[^A-Za-z0-9_.-]/g, '') + '.json')
    if (!existsSync(file)) throw new Error(`request not found: ${id}`)
    const entry = JSON.parse(readFileSync(file, 'utf8'))
    entry.status = 'done'
    entry.doneAt = new Date().toISOString()
    writeFileSync(file, JSON.stringify(entry, null, 2) + '\n', 'utf8')
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
    writeFileSync(join(this.metaDir(novelId), 'publish-log.json'), JSON.stringify(log.slice(0, 100), null, 2) + '\n', 'utf8')
  }

  publish(novelId, opts) {
    const platform = typeof opts.platform === 'string' ? opts.platform : '默认'
    const chapters = Array.isArray(opts.chapters) ? opts.chapters.map((n) => String(n).padStart(3, '0')) : null
    const cfg = this.cfg()
    const pcfg = cfg.platforms?.[platform] ?? { mode: 'export', command: '', enabled: false }
    const mode = opts.mode ?? pcfg.mode ?? 'export'
    const dir = join(this.projectDir(novelId), DIST_DIR, platform.replace(/[\\/:*?"<>|]/g, '-'))
    mkdirSync(dir, { recursive: true })

    const list = this.chapterList(novelId)
    const selected = chapters === null ? list : list.filter((c) => chapters.includes(String(c.num).padStart(3, '0')))
    if (selected.length === 0) throw new Error('no chapters selected for publish')

    const report = []
    for (const ch of selected) {
      const data = this.readChapter(novelId, ch.num)
      const body = `# 第${ch.num}章 ${this.chapterTitle(data.content)}\n\n${data.content}\n\n---\n本章字数：${data.words}`
      writeFileSync(join(dir, `chapter-${String(ch.num).padStart(3, '0')}.md`), body, 'utf8')
      writeFileSync(join(dir, `chapter-${String(ch.num).padStart(3, '0')}.txt`), data.content, 'utf8')
      report.push({ num: ch.num, words: data.words, file: `chapter-${String(ch.num).padStart(3, '0')}.md` })
      const meta = this.readMeta(novelId)
      meta.chapters = meta.chapters ?? {}
      meta.chapters[String(ch.num).padStart(3, '0')] = { ...(meta.chapters[String(ch.num).padStart(3, '0')] ?? {}), published: true, publishedAt: new Date().toISOString() }
      this.writeMeta(novelId, meta)
    }

    // 发布清单：逐章人工步骤 + 配置的自动化命令
    const checklist = [`# ${platform} 发布清单（${new Date().toISOString().slice(0, 10)}）`, '',
      '> 各平台编辑后台无公开 API，发布依靠导出的定稿产物 + 人工粘贴或配置的自动化脚本。', '',
      `## 本次发布章节（${selected.length} 章）`, ...report.map((r) => `- [ ] 第${r.num}章（${r.words} 字）→ chapter-${String(r.num).padStart(3, '0')}.md`), '',
      '## 标准流程', '1. 校对 exported 章节（先行 AI 痕迹/敏感词自检）',
      '2. 平台后台逐章粘贴（或运行配置的 command 自动化）',
      '3. 设定章节发布顺序与定时（如每日 12:00 / 18:00 双更）',
      '4. 记录发布回执到 11-data-monitoring/',
    ]
    writeFileSync(join(dir, '发布清单.md'), checklist.join('\n'), 'utf8')

    let commandResult = null
    if (mode === 'command' && typeof pcfg.command === 'string' && pcfg.command !== '') {
      const res = spawnSync(pcfg.command, [], {
        shell: process.platform === 'win32',
        env: {
          ...process.env,
          DSH_NOVEL_DIR: this.novelDir(novelId),
          DSH_PROJECT_DIR: this.projectDir(novelId),
          DSH_DIST_DIR: dir,
          DSH_PLATFORM: platform,
        },
        encoding: 'utf8',
        stdio: 'pipe',
      })
      commandResult = {
        ok: res.status === 0,
        exitCode: res.status,
        stdout: String(res.stdout ?? '').slice(0, 4000),
        stderr: String(res.stderr ?? '').slice(0, 2000),
      }
      if (commandResult.ok !== true) {
        this.appendPublishLog(novelId, { platform, mode, chapters: report.map((r) => r.num), ok: false, error: commandResult.stderr, dir })
        this.pushVersion(`publish:${novelId}`)
        throw new Error(`platform command failed: ${commandResult.stderr.slice(0, 500)}`)
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
    const list = Array.isArray(records) ? records : [records]
    if (list.length === 0 || list.some((r) => r === null || typeof r !== 'object')) {
      throw new Error('data records must be an object or array of objects')
    }
    for (const r of list) {
      if (typeof r.date !== 'string') throw new Error('each record needs a date (YYYY-MM-DD)')
    }
    const existing = this.readMetrics(novelId)
    for (const r of list) existing.push({ ...r, createdAt: new Date().toISOString() })
    mkdirSync(dirname(this.dataFilePath(novelId)), { recursive: true })
    writeFileSync(this.dataFilePath(novelId), JSON.stringify(existing, null, 2) + '\n', 'utf8')
    this.pushVersion(`data:${novelId}`)
    return { stored: list.length, total: existing.length, signals: this.computeSignals(novelId) }
  }

  /** 信号检测（阈值表来自源工作流 v4.x 数据监控 skill，硬编码为参考值）。 */
  computeSignals(novelId) {
    const metrics = this.readMetrics(novelId)
    if (metrics.length === 0) return []
    const out = []
    const sorted = [...metrics].sort((a, b) => String(a.date).localeCompare(String(b.date)))
    const last = sorted[sorted.length - 1]
    const readRate = firstNumber(last, ['完读率', 'readRate'])
    if (readRate !== null && readRate < 10) {
      out.push({ signal: '完读率低', severity: 'high', actual: readRate, threshold: '<10%（10万字节点）', action: '触发开篇优化：重审前3章（opening-optimization）' })
    }
    if (firstNumber(last, ['读完率', 'finishRate']) !== null && firstNumber(last, ['读完率', 'finishRate']) < 30) {
      out.push({ signal: '章节流失', severity: 'high', actual: firstNumber(last, ['读完率', 'finishRate']), threshold: '<30%', action: '定位流失章节 → 生成章节诊断与重写建议' })
    }
    // 追读连续 3 天下降 >10%
    const retention = sorted.map((r) => firstNumber(r, ['追读', 'retention'])).filter((v) => v !== null).slice(-4)
    if (retention.length >= 4) {
      const [a, b, c, d] = retention.slice(-4)
      if (d < c * 0.9 && c < b * 0.9 && b < a * 0.9) {
        out.push({ signal: '追读下降', severity: 'high', actual: `${d}（${a}→${d}）`, threshold: '连续3天降幅>10%', action: '触发最近3章节奏/爽点分析' })
      } else if (d < c * 0.9) {
        out.push({ signal: '追读单日下降', severity: 'medium', actual: `${d}（前值 ${c}）`, threshold: '>10%/天', action: '关注最新章节节奏，3天连续则触发分析' })
      }
    }
    // 收藏停滞：连续 7 天日增 < 10
    const daily = sorted.map((r) => firstNumber(r, ['日增收藏', 'dailyCollections', '日增'])).filter((v) => v !== null).slice(-7)
    if (daily.length >= 7 && daily.every((v) => v < 10)) {
      out.push({ signal: '收藏停滞', severity: 'medium', actual: Math.min(...daily), threshold: '连续7天日增<10', action: '书名/简介/封面优化建议' })
    }
    // 差评集中：comments 文本关键词（可选）
    const issueCount = last.commentsText
      ? Object.values(simpleTally(sectionKeywords(last.commentsText))).some((n) => n >= 3)
      : false
    if (issueCount) {
      out.push({ signal: '差评集中', severity: 'medium', actual: '≥3条同类差评', threshold: '同一问题≥3条', action: '提取关键词 → 修改方案 → 回归验证' })
    }
    // 财务止损（可选数据）：收益连续4周降>20%
    const revenue = sorted.map((r) => firstNumber(r, ['收益', 'revenue', 'sales'])).filter((v) => v !== null).slice(-5)
    if (revenue.length >= 5) {
      const [a, b, c, d, e] = revenue.slice(-5)
      if (e < d * 0.8 && d < c * 0.8 && c < b * 0.8 && b < a * 0.8) {
        out.push({ signal: '收益持续下滑', severity: 'high', actual: `${a}→${e}`, threshold: '连续4周降幅>20%', action: '止损决策框架：评估停更/改向/完结' })
      }
    }
    return out
  }

  // ── HTTP API（webServer，默认回环）────────────────────────────────────

  registerHttp(webServer) {
    const api = (path, handler) => {
      const FULL = '/novel-writing/api/' + path
      webServer.register({
        kind: 'exact',
        path: FULL,
        handler: (req, res) => {
          const ok = this.isLoopback(req) || this.cfg().apiPublic === true
          if (!ok) {
            res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
            res.end('forbidden: novel-writing api is loopback-only (set novel-writing.apiPublic: true to expose)')
            return
          }
          const send = (status, body) => {
            res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
            res.end(JSON.stringify(body))
          }
          const readBody = () => new Promise((resolveBody) => {
            let raw = ''
            req.on('data', (c) => { raw += c })
            req.on('end', () => {
              try { resolveBody(raw === '' ? {} : JSON.parse(raw)) } catch { resolveBody(raw === '' ? {} : { __raw: raw }) }
            })
          })
          Promise.resolve()
            .then(async () => {
              const arg = readBody()
              const result = await handler(req, res, send, await arg)
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
      const id = req.url.split('?')[0] === '/novel-writing/api/novel' ? this.queryOf(req.url, 'id') : arg.id
      if (id === undefined || id === '') throw new Error('id required')
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
      return this.gateCheck(novel, chapter, arg.content)
    })

    api('request', async (req, res, send, arg) => {
      if (arg.novel === undefined) throw new Error('novel required')
      return this.createRequest(arg.novel, arg)
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

  isLoopback(req) {
    const host = (req.headers?.host ?? '').toLowerCase()
    if (host === '' || host === 'localhost') return true
    const name = host.split(':')[0]
    return name === '127.0.0.1' || name === '::1' || name === '[::1]' || name === 'localhost'
  }
}

// #region 数据工具（导出供测试复用）
function firstNumber(record, keys) {
  for (const k of keys) {
    const v = record?.[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

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
