/**
 * dsh-novel-writing 宿主服务冒烟测试（不依赖运行中的 DSH，mock ctx 直测核心逻辑）。
 * 运行：node test/smoke.mjs
 * 覆盖：listNovels / updateState / gateCheck / saveChapter / lightAudit /
 *       requests / publish(export) / ingestData / computeSignals +
 *       lib/tools.js 挂载契约（inject 声明 / 11 工具注册 / 可选服务静默）+
 *       lib/client.js 挂载契约（UX-006 注册面/退役面/可逆清理 + UX-007 控制台
 *       注册与抽屉无按钮组，无 DOM 降级 + UX-008 控制台树：底部搜索行/＋ 磁贴/
 *       排序钮/无「▶ 打开」）。
 */
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const mod = await import('../lib/index.js')

const root = mkdtempSync(join(tmpdir(), 'novel-smoke-'))
const workspace = join(root, 'novels')
mkdirSync(workspace, { recursive: true })

const settings = {
  get() {
    return {
      enabled: true,
      workspaceRoot: workspace,
      pollMs: 2000,
      apiPublic: false,
      presetAutoSync: false,
      platforms: {
        番茄小说: { enabled: false, mode: 'export', command: '', fetchCommand: '' },
        起点中文网: { enabled: false, mode: 'export', command: '', fetchCommand: '' },
        晋江文学城: { enabled: false, mode: 'export', command: '', fetchCommand: '' },
        七猫小说: { enabled: false, mode: 'export', command: '', fetchCommand: '' },
      },
    }
  },
}
const ctx = {
  settings,
  reflect: { provide: () => {}, check: () => false },
  emit: () => {},
  effect: () => {},
  logger: { info: () => {}, warn: () => {}, error: () => {} },
  get: () => undefined,
}

const svc = new mod.NovelWritingService(ctx)
let passed = 0
let failed = 0
function check(label, ok, extra) {
  if (ok) { passed += 1; console.log('  ok  ' + label) }
  else { failed += 1; console.error('  FAIL ' + label + (extra !== undefined ? ' :: ' + extra : '')) }
}

// ── 建项目：法医仙途（测试项目结构复刻）──────────────────────────────────
const novel = 'test-novel'
const proj = join(workspace, novel, 'novel-project')
mkdirSync(join(proj, '07-content'), { recursive: true })
mkdirSync(join(proj, '06-chapter-outlines'), { recursive: true })
mkdirSync(join(proj, '17-continuity'), { recursive: true })
mkdirSync(join(proj, '11-data-monitoring'), { recursive: true })

const state = svc.updateState(novel, {
  current_stage: 'content_generation',
  completed_stages: ['work_type_selection', 'platform_research', 'genre_selection', 'novel_confirmation', 'creation_planning', 'outline_writing', 'chapter_outline'],
  project_info: { title: '法医仙途', work_type: '长篇小说', platform: '起点中文网', genre: '都市修真', target_words: 2000000 },
  guardrails: { release_allowed: false },
  statistics: { total_chapters: 0, total_words: 0 },
})
check('updateState 初始状态', state.current_stage === 'content_generation' && state.completed_stages.length === 7)

const state2 = svc.updateState(novel, { completed_stages: ['content_generation'], guardrails: { latest_ai_path: 'B' } })
check('updateState 增量追加（不覆盖）', state2.completed_stages.length === 8 && state2.guardrails.latest_ai_path === 'B')
check('updateState guardrails 保留', state2.guardrails.release_allowed === false)

const list = svc.listNovels()
check('listNovels 发现项目', list.novels.length === 1 && list.novels[0].title === '法医仙途')

// ── 看护卡解析与门禁 ───────────────────────────────────────────────────
const contextCard = `# 第1章 正文看护卡
## 本章必写场景
1. **深夜送骨**：老马将无名骸骨送至解剖室，交接过程中给出第一个异常暗示
2. **骨骼的沉默**：宋辞进行法医骨骼检验，发现三处异常
3. **遗识——死者的最后三分钟**：宋辞触碰颅骨蝶骨区域，被动触发遗识，接收碎片化画面
## 本章禁止偏离项
- 不得跳过"三处骨骼异常"的递进发现
- 不得让沈归澜在本章出场
- 不得无铺垫引入任何修真术语（"灵骨"、"遗识"）
## 本章结束状态
- 宋辞走出法医中心大楼，准备回家
`
writeFileSync(join(proj, '17-continuity/chapter-001-context.md'), contextCard, 'utf8')

const goodContent = `# 第1章 无名骸骨

深夜送骨。老马将无名骸骨送至解剖室，交接过程中给出第一个异常暗示。

---

骨骼的沉默。宋辞进行法医骨骼检验，发现三处异常——骨小梁排列异常、骨密度异常偏高、骨髓腔内壁金色光泽残留物。

---

宋辞触碰颅骨蝶骨区域，被动触发碎片化画面——月色小巷中被追杀的片段。

---

宋辞走出法医中心大楼，准备回家。
`
const gateGood = svc.gateCheck(novel, 1, goodContent)
check('gate 全场景覆盖', gateGood.coverage === 100 && gateGood.passed === true, JSON.stringify(gateGood))

const badContent = `# 第1章 无名骸骨

深夜送骨。老马将无名骸骨送至解剖室，交接过程中给出第一个异常暗示。

---

骨骼的沉默。宋辞进行法医骨骼检验，发现三处异常——骨小梁排列异常、骨密度异常偏高、骨髓腔内壁金色光泽残留物。

---

宋辞走出法医中心大楼，准备回家。
`
const gateBad = svc.gateCheck(novel, 1, badContent)
check('gate 缺场景=阻断', gateBad.coverage < 100 && gateBad.passed === false, 'coverage=' + gateBad.coverage)

const bannedContent = goodContent.replace('宋辞走出法医中心大楼', '沈归澜在走廊出现，宋辞走出法医中心大楼')
const gateBanned = svc.gateCheck(novel, 1, bannedContent)
check('gate 命中禁止项=偏离', gateBanned.bannedHits.includes('沈归澜') && gateBanned.passed === false, JSON.stringify(gateBanned.bannedHits))

// 禁止项覆盖：- 不得让沈归澜在本章出场 → 提取 沈归澜；「"灵骨"、"遗识"」→ 提取 灵骨/遗识
check('gate 禁止项提取', gateBanned.bannedHits.length >= 1 && gateBad.bannedHits.length === 0)

// P0 回归：「不得跳过"三处骨骼异常"」是需求型否定——术语出现在正文是正确行为，不得判为偏离
const rules = svc.parseBanRules(contextCard)
check('需求型否定不进禁词', rules.banned.includes('三处骨骼异常') === false, JSON.stringify(rules))
check('排除型否定进禁词', rules.banned.includes('沈归澜'), JSON.stringify(rules))
check('条件型（不得无铺垫引入）归 conditional 不计偏离', rules.conditional.includes('灵骨') && rules.conditional.includes('遗识'), JSON.stringify(rules))
check('需求术语进 requirements', rules.requirements.includes('三处骨骼异常'), JSON.stringify(rules))
const regressionContent = goodContent.replace('发现三处异常', '发现"三处骨骼异常"的递进痕迹')
const gateRegression = svc.gateCheck(novel, 1, regressionContent)
check('含需求术语不阻断（回归）', gateRegression.bannedHits.includes('三处骨骼异常') === false, JSON.stringify(gateRegression.bannedHits))

// P0-7 回归：正文含条件型术语（遗识）不应被硬阻断（场景本身要求它出现）
const withTerm = goodContent.replace('被动触发碎片化画面', '被动触发遗识，接收碎片化画面')
const gateTerm = svc.gateCheck(novel, 1, withTerm)
check('条件型术语不阻断（遗识）', gateTerm.bannedHits.includes('遗识') === false, JSON.stringify(gateTerm.bannedHits))

// P1-10 回归：「X 一概不出现」句式提取
const card2 = contextCard.replace('- 不得让沈归澜在本章出场', '- 沈归澜一概不出现')
const rules2 = svc.parseBanRules(card2)
check('一概不出现提取', rules2.banned.includes('沈归澜'), JSON.stringify(rules2))

// P0-8 回归：场景段存在但格式无法解析 → fail-closed（available:false 而非静默通过）
const card3 = contextCard.replace(/1\. \*\*深夜送骨\*\*：.*/, '1. 深夜送骨：老马送骨至解剖室')
writeFileSync(join(proj, '17-continuity/chapter-002-context.md'), card3, 'utf8')
// （上行为宽松格式——新解析器应能解析；再测完全无法解析的极端格式）
const card4 = `# 第3章 看护卡\n## 本章必写场景\n场景A\n场景B\n## 本章禁止偏离项\n- 不得让沈归澜出场\n`
writeFileSync(join(proj, '17-continuity/chapter-003-context.md'), card4, 'utf8')
const gateLoose = svc.computeGate(novel, 2, '深夜送骨，老马将骸骨送至解剖室。')
check('宽松场景格式可解析（无加粗/冒号）', gateLoose.available === true && gateLoose.scenes.length >= 1, JSON.stringify(gateLoose).slice(0, 200))
const gateFail = svc.computeGate(novel, 3, '任意正文')
check('格式漂移 fail-closed', gateFail.available === false && gateFail.note !== null, JSON.stringify(gateFail).slice(0, 200))

// ── 保存：门禁强制 ─────────────────────────────────────────────────────
let blocked = false
try {
  svc.saveChapter(novel, 1, badContent)
} catch (e) {
  blocked = true
  check('saveChapter 门禁未通过=拒绝', e.message.includes('门禁未通过'))
}
if (!blocked) check('saveChapter 门禁未通过=拒绝', false, '未被拒绝')

const saved = svc.saveChapter(novel, 1, goodContent)
check('saveChapter 通过门禁写入', saved.words > 0 && saved.gate.passed === true)

const forced = svc.saveChapter(novel, 1, badContent, { force: true, source: 'studio' })
check('saveChapter force 人工改稿', forced.gate.passed === false)

const ch = svc.readChapter(novel, 1)
check('readChapter 带审计', ch.audit.items.length >= 4 && ch.words > 0)
check('readChapter 字数统计', ch.words > 50)

// 看护卡存在但内容无缺：lightAudit 字数告警（内容很短）
const audit = svc.lightAudit(badContent, { platform: '番茄小说' })
check('lightAudit 有字数/段落项', audit.items.some((i) => i.id === 'words'))

// ── 请求队列 ──────────────────────────────────────────────────────────
const req = svc.createRequest(novel, { kind: 'optimize', chapter: 1, note: '节奏前移' })
const reqDone = svc.completeRequest(novel, req.id)
check('request 生命周期', reqDone.status === 'done' && svc.listRequests(novel)[0].status === 'done')

// ── 发布（export 模式；服务层强制 release_allowed 门禁）────────────────
let publishBlocked = false
try { await svc.publish(novel, { platform: '起点中文网', chapters: [1], mode: 'export' }) } catch (e) { publishBlocked = e.message.includes('release_allowed') }
check('publish 服务层校验 release_allowed', publishBlocked)
svc.updateState(novel, { guardrails: { release_allowed: true } })
const pub = await svc.publish(novel, { platform: '起点中文网', chapters: [1], mode: 'export' })
check('publish export 生成产物', pub.chapters.length === 1 && pub.dir.includes('起点中文网'))
check('publish 产物文件存在', (() => {
  try { return readFileSync(join(pub.dir, 'chapter-001.md'), 'utf8').includes('本章字数') } catch { return false }
})())
check('publish log 记录', svc.readPublishLog(novel)[0].platform === '起点中文网')
// P0-1 回归：发布后 chapterList 的 meta 键补零对齐 → published 标记可见
const publishedList = svc.chapterList(novel)
check('chapterList 读到 published 标记（键补零回归）', publishedList.length >= 1 && publishedList.some((c) => c.published === true), JSON.stringify(publishedList.map((c) => [c.num, c.published, c.gate !== null])))
check('chapterList 读到 gate 记录（键补零回归）', publishedList.some((c) => c.gate !== null))
// P1-16 回归：platform 穿越被清洗
const pubBad = await svc.publish(novel, { platform: '..', chapters: [1], mode: 'manual' })
check('platform .. 被清洗回退', !pubBad.dir.endsWith('novel-project') && pubBad.dir.includes('默认'), pubBad.dir)

// ── 数据信号 ───────────────────────────────────────────────────────────
const ing = svc.ingestData(novel, [
  { date: '2026-05-01', 完读率: 4.2, 追读: 60, 日增收藏: 3, 收益: 100 },
  { date: '2026-05-02', 完读率: 4.0, 追读: 50, 日增收藏: 2, 收益: 75 },
  { date: '2026-05-03', 完读率: 3.8, 追读: 41, 日增收藏: 2, 收益: 58 },
  { date: '2026-05-04', 完读率: 3.5, 追读: 33, 日增收藏: 1, 收益: 44 },
  { date: '2026-05-05', 完读率: 3.2, 追读: 26, 日增收藏: 1, 收益: 33 },
])
check('ingestData 入库计数', ing.stored === 5 && ing.total === 5)
check('信号：完读率低', ing.signals.some((s) => s.signal === '完读率低'))
check('信号：追读下降', ing.signals.some((s) => s.signal === '追读下降'))
check('信号：收益持续下滑', ing.signals.some((s) => s.signal === '收益持续下滑'))

// P1 回归：同日重复入库按 date 去重（后到覆盖先到）
const ing2 = svc.ingestData(novel, [{ date: '2026-05-05', 完读率: 2.8, 追读: 20, 日增收藏: 1, 收益: 30 }])
check('metrics 同日去重', ing2.total === 5 && svc.readMetrics(novel).find((m) => m.date === '2026-05-05').完读率 === 2.8, JSON.stringify(ing2))

// P1 回归：fetchCommand 适配器（真实子进程，跨平台 node）
ctx.settings.get = () => ({
  enabled: true, workspaceRoot: workspace, pollMs: 2000, apiPublic: false, presetAutoSync: false,
  platforms: { 测试平台: { enabled: false, mode: 'export', command: '', fetchCommand: 'node -e "console.log(JSON.stringify({date:\'2026-05-06\',完读率:8.5,追读:55}))"' } },
})
const adapter = await svc.ingestFromAdapter(novel, '测试平台')
check('fetchCommand 适配器入库', adapter.stored >= 1 && svc.readMetrics(novel).some((m) => m.date === '2026-05-06' && m.完读率 === 8.5), JSON.stringify(adapter).slice(0, 200))
let adapterFail = false
try { await svc.ingestFromAdapter(novel, '未配置平台') } catch (e) { adapterFail = e.message.includes('fetchCommand') }
check('适配器未配置报错', adapterFail)

// P1 回归：updateState allowCreate:false 防幽灵书目
let ghost = false
try { svc.updateState('幽灵书目', { current_stage: 'x' }, { allowCreate: false }) } catch (e) { ghost = e.message.includes('novel not found') }
check('幽灵书目拒绝', ghost && svc.readState('幽灵书目') === null)

// ── 目录索引 ───────────────────────────────────────────────────────────
const detail = svc.novelDetail(novel)
check('novelDetail 组织完整', detail.chapters.length === 1 && detail.state.statistics.total_chapters === 1)
check('fileIndex 列出工作文件', detail.files.length >= 3)

// P0-2 回归：保存后总字数 > 0（按 meta 各章字数汇总）
check('total_words 汇总非零（回归）', detail.state.statistics.total_words > 0, JSON.stringify(detail.state.statistics))

// P0-3 回归：章号路径注入拒绝
let badChapter = false
try { svc.saveChapter(novel, '../escape', '# x') } catch (e) { badChapter = e.message.includes('invalid chapter number') }
check('章号路径注入拒绝', badChapter)
let badChapter2 = false
try { svc.computeGate(novel, '1.5', 'x') } catch (e) { badChapter2 = e.message.includes('invalid chapter number') }
check('小数章号拒绝', badChapter2)

// P1-11 回归：1000+ 章可见
writeFileSync(join(proj, '07-content', 'chapter-1000.md'), '# 第1000章 终章\n\n正文。\n', 'utf8')
const thousandList = svc.chapterList(novel)
check('第 1000 章进入章节列表', thousandList.some((c) => c.num === 1000), JSON.stringify(thousandList.map((c) => c.num)))
svc.updateState(novel, { guardrails: { release_allowed: true } })
await svc.saveChapter(novel, 1000, '# 第1000章 终章\n\n正文结尾钩子？\n')
const statsAfter = svc.readState(novel).statistics
check('千章保存后计数=文件数', statsAfter.total_chapters === thousandList.length && statsAfter.total_words > 0, JSON.stringify(statsAfter))
rmSync(join(proj, '07-content', 'chapter-1000.md'), { force: true })

// review 规则回归（服务层零容忍）
let reviewRejected = false
try { svc.recordReview(novel, { chapter: 1, verdict: 'pass', score: 95, findings: ['问题A：引用…', '问题B：引用…'] }) } catch (e) { reviewRejected = e.message.includes('100 分') }
check('review pass+95 拒绝', reviewRejected)
let reviewFindings = false
try { svc.recordReview(novel, { chapter: 1, verdict: 'pass', score: 100, findings: ['  ', '一条'] }) } catch { reviewFindings = true }
check('review 空发现拒绝', reviewFindings)
const reviewOk = svc.recordReview(novel, { chapter: 1, verdict: 'pass', score: 100, findings: ['发现A（引用原文）', '发现B（引用原文）'], hardGates: [] })
check('review 合法提交', reviewOk.ok === true && reviewOk.score === 100)
const failRec = svc.recordReview(novel, { chapter: 1, verdict: 'fail', score: 72, findings: ['阻断项（引用）', '警告项（引用）'], hardGates: ['场景覆盖'] })
check('review fail 记录', failRec.verdict === 'fail')

// ── 工作台：新建小说 + 安全文件读取 ────────────────────────────────────
const created = svc.createProject('新书测试', '我的新书')
check('createProject 初始状态', created.state.current_stage === 'work_type_selection' && created.title === '我的新书')
check('createProject 进入书目列表', svc.listNovels().novels.some((n) => n.id === '新书测试'))
let dup = false
try { svc.createProject('新书测试') } catch { dup = true }
check('createProject 重名拒绝', dup)
let badName = false
try { svc.createProject('a/b') } catch { badName = true }
check('createProject 非法名拒绝', badName)

// ── UX-006：overview 附带 bindings + novel-create 返回 path ─────────────
check('createProject 返回目录路径 path（sessions.create cwd 用）', typeof created.path === 'string' && created.path.includes(join(workspace, '新书测试')), String(created.path))
check('listNovels 无配置时附带空 bindings', (() => { const b = svc.listNovels().bindings; return b !== null && typeof b === 'object' && Object.keys(b).length === 0 })(), JSON.stringify(svc.listNovels().bindings))
ctx.settings.get = () => ({ enabled: true, workspaceRoot: workspace, pollMs: 2000, apiPublic: false, presetAutoSync: false, platforms: {}, bindings: { 'test-novel': 'sess-1' } })
check('listNovels 透传已配置 bindings', svc.listNovels().bindings['test-novel'] === 'sess-1', JSON.stringify(svc.listNovels().bindings))

writeFileSync(join(workspace, '新书测试', 'novel-project', '00-work-type.md'), '# 作品类型\n\n长篇小说\n', 'utf8')
const readFile = svc.readProjectFile('新书测试', '00-work-type.md')
check('readProjectFile 读取', readFile.content !== null && readFile.content.includes('长篇小说'))
let esc = false
try { svc.readProjectFile('新书测试', '../test-novel/novel-project/workflow-state.json') } catch { esc = true }
check('readProjectFile 路径逃逸拒绝', esc)
let priv = false
try { svc.readProjectFile('新书测试', '.dsh-plugin/meta.json') } catch { priv = true }
check('readProjectFile 私有目录拒绝', priv)
let missing = false
try { svc.readProjectFile('新书测试', 'no-such.md') } catch { missing = true }
check('readProjectFile 缺失报错', missing)

// ── enabled=false 总开关 ────────────────────────────────────────────────
let disabled = false
ctx.settings.get = () => ({ enabled: false, workspaceRoot: workspace, pollMs: 2000, apiPublic: false, presetAutoSync: false, platforms: {} })
try { svc.createProject('不该出现') } catch (e) { disabled = e.message.includes('disabled') }
check('enabled=false 拒绝变更', disabled)
check('enabled=false 不落盘', svc.listNovels().novels.every((n) => n.id !== '不该出现'))
ctx.settings.get = () => ({ enabled: true, workspaceRoot: workspace, pollMs: 2000, apiPublic: false, presetAutoSync: false, platforms: {} })

// ── tool 行挂载契约（BUG-002 回归）───────────────────────────────────────
// 缺陷：lib/tools.js 曾未声明 inject 即在 apply 内访问 ctx.tools，实机预设
// 挂载即抛 `cannot get property "tools" without inject`；CI 四道检查均不经
// 过 apply 挂载路径（本文件此前只直测 NovelWritingService，从不 import
// lib/tools.js），缺陷因此逃逸。此处直接驱动挂载路径补防护网。
// mock ctx 以 getter 复刻 Cordis 最低门控契约：未声明 inject 的服务属性访问
// 即抛同源错误；novel-writing 保持可选（ctx.get 探测，缺席时静默 0 注册）。
const toolsMod = await import('../lib/tools.js')
const EXPECTED_TOOL_NAMES = ['novel_list', 'novel_status', 'novel_state_update', 'novel_chapter_read', 'novel_chapter_write', 'novel_gate_check', 'novel_review_submit', 'novel_data_ingest', 'novel_publish', 'novel_requests', 'novel_request_done']

check('tool行 inject 声明 tools 硬依赖', Array.isArray(toolsMod.inject) && toolsMod.inject.includes('tools'), 'inject=' + JSON.stringify(toolsMod.inject))
check('tool行可选服务 novel-writing 不进 inject', Array.isArray(toolsMod.inject) && !toolsMod.inject.includes('novel-writing'), 'inject=' + JSON.stringify(toolsMod.inject))

function mountCtx(service) {
  const declared = Array.isArray(toolsMod.inject) ? toolsMod.inject : []
  const registered = []
  const ctx = {
    get: (name) => (name === 'novel-writing' ? service : undefined),
    logger: { info() {}, warn() {} },
    get tools() {
      if (!declared.includes('tools')) throw new Error('cannot get property "tools" without inject')
      return { register: (tool) => registered.push(tool) }
    },
  }
  return { ctx, registered }
}

const mounted = mountCtx({})
let mountError = ''
try { toolsMod.apply(mounted.ctx) } catch (e) { mountError = e.message }
check('tool行 apply 挂载成功（服务在位）', mountError === '', mountError)
const registeredNames = mounted.registered.map((t) => t?.name).sort().join(',')
check('tool行注册恰好 11 个工具', mounted.registered.length === 11, 'count=' + mounted.registered.length)
check('tool行注册名集合精确匹配', registeredNames === [...EXPECTED_TOOL_NAMES].sort().join(','), registeredNames)

const silent = mountCtx(undefined)
let silentError = ''
try { toolsMod.apply(silent.ctx) } catch (e) { silentError = e.message }
check('tool行无服务静默挂载不抛错', silentError === '', silentError)
check('tool行无服务 0 注册（未装 bundle 预设仍可挂载）', silent.registered.length === 0, 'count=' + silent.registered.length)

// ── 客户端行挂载契约（UX-006：新注册面 + 退役面 + 可逆清理）──────────────
// lib/client.js 是 window.__ModuleLoader__ 脚本（非 ESM）：读源码经 new Function 在
// mock window 下执行捕获模块定义；factory 仅依赖 require('react')（最小 mock，组件
// 体不执行）。mock 环境无 window/localStorage/document——客户端加载路径须可降级。
const clientSrc = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
let capturedDef = null
globalThis.window = { __ModuleLoader__: { load(def) { capturedDef = def } } }
try { new Function(clientSrc)() } finally { delete globalThis.window }
check('客户端模块经 __ModuleLoader__ 注册', capturedDef !== null && capturedDef.id === 'dsh-novel-writing')
const mockReact = (() => {
  // 逐层执行函数组件的最小 React mock：createElement 对函数类型直接调用（hooks 按帧实现：
  // useState 一帧一值 / useEffect 只收集不执行 / useRef·useMemo 一次求值）——
  // 供 UX-007 抽屉树结构断言取到组件体真实产出（仅单次渲染，不做更新调度）。
  let frames = []
  const useHook = (init) => {
    const f = frames[frames.length - 1]
    const i = f.i
    f.i += 1
    if (f.hooks[i] === undefined) f.hooks[i] = typeof init === 'function' ? init() : init
    return f.hooks[i]
  }
  return {
    createElement: (type, props, ...children) => {
      if (typeof type === 'function') {
        frames.push({ i: 0, hooks: [] })
        try { return type({ ...(props ?? {}), children }) } finally { frames.pop() }
      }
      return { __nvEl: true, type, props: props ?? {}, children }
    },
    useState: (v) => { const s = useHook(v); return [s, () => {}] },
    useEffect: () => {},
    useRef: (v) => ({ current: v }),
    useMemo: (fn) => fn(),
  }
})()
let clientExports = null
let clientFactoryErr = ''
try {
  clientExports = capturedDef.factory((id) => { if (id === 'react') return mockReact; throw new Error('unexpected require: ' + id) })
} catch (e) { clientFactoryErr = e.message }
check('客户端 factory 无 DOM 环境可求值', clientFactoryErr === '' && clientExports !== null, clientFactoryErr)
check('客户端 exports.apply 为函数', clientExports !== null && typeof clientExports.apply === 'function')
check('客户端 inject 声明 slots/connection/locale', clientExports !== null && Array.isArray(clientExports.inject)
  && ['slots', 'connection', 'locale'].every((x) => clientExports.inject.includes(x)), 'inject=' + JSON.stringify(clientExports !== null ? clientExports.inject : null))

const slotRegs = []
let pendingSlotName = ''
const clientCtx = {
  get: () => undefined,
  slots: {
    inject(slotName, fn) { pendingSlotName = slotName; fn() },
    register(def, render) { slotRegs.push({ slot: pendingSlotName, id: def.id, order: def.order, render }) },
  },
}
let clientCleanup = null
let clientApplyErr = ''
try { clientCleanup = clientExports.apply(clientCtx) } catch (e) { clientApplyErr = e.message }
check('客户端 apply 无 DOM 环境可挂载（降级路径）', clientApplyErr === '', clientApplyErr)
const EXPECTED_SLOTS = 'settings.section:novel-writing sidebar.footer.action:novel-drawer shell.overlay:nv-console shell.overlay:novel-workspace-dialog shell.overlay:novel-split shell.overlay:novel-bind-dialog'.split(' ')
const gotSlots = slotRegs.map((r) => r.slot + ':' + r.id)
check('注册面 = 设置页+抽屉+四浮层（恰好 6 席）', gotSlots.length === EXPECTED_SLOTS.length && EXPECTED_SLOTS.every((k) => gotSlots.includes(k)), gotSlots.join(','))
check('控制台 nv-console order=25', (() => { const r = slotRegs.find((x) => x.id === 'nv-console'); return r !== undefined && r.order === 25 })(), 'order=' + JSON.stringify(slotRegs.find((x) => x.id === 'nv-console')))
check('控制台 z-index 950 随样式注入', clientSrc.includes("className: 'nv-console'") && clientSrc.includes('z-index:950'))
check('退役：conversation.view「小说」标签页不再注册', !slotRegs.some((r) => r.slot === 'conversation.view'))
check('退役：conversation.input.dock 兜底条不再注册', !slotRegs.some((r) => r.slot === 'conversation.input.dock'))
check('退役：novel-studio/novel-launch-dock/novel-hud/novel-hud-panel/novel-entry 不再出现', !slotRegs.some((r) => ['novel-studio', 'novel-launch-dock', 'novel-hud', 'novel-hud-panel', 'novel-entry'].includes(r.id)), gotSlots.join(','))
check('抽屉 novel-drawer order=9', (() => { const r = slotRegs.find((x) => x.id === 'novel-drawer'); return r !== undefined && r.order === 9 })(), 'order=' + JSON.stringify(slotRegs.find((x) => x.id === 'novel-drawer')))
// UX-007（DEC-015）：抽屉 = 纯主入口——无 ⚙/＋/🔗/▶ 按钮组，标题行整体为可点按钮（nv-drawer-head）
check('抽屉无按钮组（⚙/＋/🔗/▶ 文本缺席）', (() => {
  const dr = slotRegs.find((r) => r.id === 'novel-drawer')
  if (dr === undefined) return false
  const root = dr.render({ wide: true })
  const texts = []
  let hasHeadBtn = false
  const walk = (n) => {
    if (n === null || n === undefined) return
    if (typeof n === 'string') { texts.push(n); return }
    if (typeof n !== 'object') return
    if (Array.isArray(n.children)) for (const c of n.children) walk(c)
    if (n.props !== null && n.props !== undefined && n.props.className === 'nv-drawer-head') hasHeadBtn = true
  }
  walk(root)
  const joined = texts.join('')
  return hasHeadBtn && !joined.includes('⚙') && !joined.includes('＋') && !joined.includes('🔗') && !joined.includes('▶')
})(), 'head=' + 'n/a')
// UX-008（DEC-017）：控制台树断言——经抽屉标题行 onClick 置 store.consoleOpen，再渲染 nv-console 取组件树
check('控制台树：底部搜索行 + ＋ 磁贴居末 + 排序两态钮 + 无「▶ 打开」', (() => {
  const dr = slotRegs.find((r) => r.id === 'novel-drawer')
  const con = slotRegs.find((r) => r.id === 'nv-console')
  if (dr === undefined || con === undefined) return false
  // 1) 点抽屉标题行（真实入口路径）打开控制台
  let headBtn = null
  const findHead = (n) => {
    if (n === null || n === undefined || typeof n !== 'object') return
    if (Array.isArray(n)) { for (const c of n) findHead(c); return }
    if (n.props !== undefined && n.props.className === 'nv-drawer-head') { headBtn = n; return }
    if (Array.isArray(n.children)) for (const c of n.children) findHead(c)
  }
  findHead(dr.render({ wide: true }))
  if (headBtn === null || typeof headBtn.props.onClick !== 'function') return false
  headBtn.props.onClick() // toggleConsole → store.set({consoleOpen:true})
  // 2) 渲染控制台取树（open 态全量输出）
  const root = con.render({})
  if (root === null || typeof root !== 'object') return false
  const clsCount = {}
  const texts = []
  let gridKids = null
  let footHasSearch = false
  const walk = (n, inFoot) => {
    if (n === null || n === undefined) return
    if (typeof n === 'string') { texts.push(n); return }
    if (typeof n !== 'object') return
    if (Array.isArray(n)) { for (const c of n) walk(c, inFoot); return }
    const cn = n.props !== undefined && typeof n.props.className === 'string' ? n.props.className : ''
    if (cn === 'nv-cfoot') inFoot = true
    if (cn === 'nv-csearch' && inFoot === true) footHasSearch = true
    if (cn === 'nv-cgrid') gridKids = Array.isArray(n.children) ? n.children.flat(2).filter((c) => c !== null && c !== undefined && typeof c === 'object' && c.__nvEl === true) : []
    if (cn !== '') clsCount[cn] = (clsCount[cn] ?? 0) + 1
    if (Array.isArray(n.children)) for (const c of n.children) walk(c, inFoot)
  }
  walk(root, false)
  const lastCn = gridKids !== null && gridKids.length > 0 && gridKids[gridKids.length - 1].props !== undefined ? gridKids[gridKids.length - 1].props.className : ''
  return footHasSearch === true                     // ② 搜索行移到容器底部（nv-cfoot 内）
    && lastCn === 'nv-cplus'                        // ③ ＋ 虚线磁贴在网格末尾
    && (clsCount['nv-csortbtn'] ?? 0) === 2         // ④ 排序 默认/手动 两态钮
    && (clsCount['nv-cact'] ?? 0) === 0             // ③ 卡内「▶ 打开」文本钮消失（类整体移除）
    && !texts.join('').includes('▶ 打开')
    && !clientSrc.includes('openBtn')               // i18n 键同步清理
})(), 'console tree mismatch')
check('控制台源码面：拖拽排序持久化 + 3 列网格 + 药丸搜索样式', clientSrc.includes('dsh.novel.order.v1')
  && clientSrc.includes('draggable: props.draggable') && clientSrc.includes('minmax(300px,1fr)')
  && clientSrc.includes('nv-cplus{') && clientSrc.includes('border-radius:999px'), 'order-persist/drag/grid/pill missing')
let renderErr = ''
check('各注册面 render 可调用（组件体可求值；关闭态浮层输出 null 合法）', (() => {
  for (const r of slotRegs) {
    try {
      const out = r.render({ wide: true })
      if (out === null) continue // 控制台/分栏/对话框 = 门控浮层：关闭态 null（与真实 React 一致）
      if (out === undefined) { renderErr = r.id + ':undefined'; return false }
    }
    catch (e) { renderErr = r.id + ':' + e.message; return false }
  }
  return true
})(), renderErr)
check('apply 返回清理函数（可逆性）', typeof clientCleanup === 'function')
let clientCleanupErr = ''
try { if (typeof clientCleanup === 'function') clientCleanup() } catch (e) { clientCleanupErr = e.message }
check('客户端清理可执行（引擎/监听/style 降级移除）', clientCleanupErr === '', clientCleanupErr)

console.log(`\nSMOKE DONE: ${passed} passed, ${failed} failed`)
rmSync(root, { recursive: true, force: true })
process.exit(failed === 0 ? 0 : 1)
