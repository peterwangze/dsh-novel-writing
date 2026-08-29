/**
 * dsh-novel-writing 宿主服务冒烟测试（不依赖运行中的 DSH，mock ctx 直测核心逻辑）。
 * 运行：node test/smoke.mjs
 * 覆盖：listNovels / updateState / gateCheck / saveChapter / lightAudit /
 *       requests / publish(export) / ingestData / computeSignals +
 *       lib/tools.js 挂载契约（inject 声明 / 11 工具注册 / 可选服务静默）+
 *       lib/client.js 挂载契约（UX-006 注册面/退役面/可逆清理 + UX-007 控制台
 *       注册与抽屉无按钮组，无 DOM 降级 + UX-008 控制台树：底部搜索行/＋ 磁贴/
 *       排序钮/无「▶ 打开」+ UX-013 工作区对话框去会话创建/卡片两钮/首次开卡
 *       自动链/抽屉字形/BindDialog 既有能力/删除链绑定清理 mutate unset +
 *       UX-015 章节名数据链（宿主解析/meta 优先/缓存失效）与客户端标题栏
 *       放大/章节名渲染/抽屉小档 四源码面 + UX-016 小窗聊天
 *       优先钳制重分配 + UX-017 再宽一档（120/300/320/0.50 公式）+
 *       UX-018 双压修复（applyMargin margin+width=chatW / savedWidth
 *       记录·恢复 / 双压根因注释在位）+ UX-019 收尾（版本徽标撤离负断言 /
 *       章节行仅号+名去字数 / 列表 overflow:auto）+ UX-020 用户修正
 *       （章节名校准：中文数字/冒号/BOM 容错/无标题负回退；客户端章节列
 *       拖宽条恢复：.nv-chdiv + pointer 拖拽 + chapterW 持久化 120–360px）+
 *       UX-021 行去装饰圆点 + UX-022 用户术语定案（「分割条」=三条分隔线
 *       常驻可见；「拖动条」=滚动条默认隐藏；滚动隔离=章节列/左窗/正文
 *       独立滚动——高度链修复）。
 */
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs'
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

// ── UX-015（批注②）：章节名数据链——查证：meta.json chapters 条目无 name 字段
// （gate/words/updatedAt/reviewScore/published/forced…），宿主从章节文件首个
// `# ` 标题行解析（剥「第N章」前缀）；meta.chapters[*].name 为纯增量优先字段。──────
check('UX-015 章节名提取（首行 # 剥「第N章」前缀 / 无标题行 / 剥后为空 负回退）', (() => {
  return svc.chapterNameOf('# 第1章 关于你明天的死亡，规则如下\n\n正文') === '关于你明天的死亡，规则如下'
    && svc.chapterNameOf('没有标题行\n正文随便写。') === ''
    && svc.chapterNameOf('# 第1章\n正文随便写。') === ''
    && svc.chapterNameOf('# 第12章 终局之战') === '终局之战'
})(), 'ux015 chapterNameOf missing')
check('UX-020 章节名校准（中文数字「第十章 第七号放映厅」/ 冒号变体「第18章：老福宾馆」/ 无标题行→空串 / BOM 标题容错）', (() => {
  return svc.chapterNameOf('# 第十章 第七号放映厅') === '第七号放映厅'
    && svc.chapterNameOf('# 第18章：老福宾馆') === '老福宾馆'
    && svc.chapterNameOf('这里没有标题行\n正文随便写。') === ''
    && svc.chapterNameOf('\uFEFF# 第12章 终局之战') === '终局之战'
})(), 'ux020 chapterNameOf calibrated')
writeFileSync(join(proj, '07-content', 'chapter-002.md'), '无标题行正文。\n', 'utf8')
const clName = svc.chapterList(novel)
check('UX-015 chapterList 每项补 name（第1章=无名骸骨；无标题行=空串回退）', (() => {
  const c1 = clName.find((c) => c.num === 1)
  const c2 = clName.find((c) => c.num === 2)
  return c1 !== undefined && c1.name === '无名骸骨' && c2 !== undefined && c2.name === ''
})(), JSON.stringify(clName.map((c) => [c.num, c.name])))
check('UX-015 readChapter 补 name（与列表一致；API 契约纯增量）', svc.readChapter(novel, 1).name === '无名骸骨')
writeFileSync(join(proj, '07-content', 'chapter-002.md'), '# 第2章 更名重写\n正文。\n', 'utf8')
check('UX-015 章节名缓存按 size/mtime 失效（改文件后重新解析）', svc.chapterList(novel).find((c) => c.num === 2)?.name === '更名重写')
svc.writeMeta(novel, { chapters: { '001': { name: '元数据优先名' } } })
check('UX-015 meta.chapters[*].name 增量字段优先（不存在才回退解析）', (() => {
  const c1 = svc.chapterList(novel).find((c) => c.num === 1)
  return c1 !== undefined && c1.name === '元数据优先名'
})(), 'meta name precedence')

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

// ── UX-011：删除小说（novel-delete 服务 + API 注册 + id 校验链）──────────
check('deleteProject id 校验与 createProject 同规（../x / .. / 空串 / null / a\\b / con / 点开头）', (() => {
  let n = 0
  for (const bad of ['../x', '..', '', null, 'a/b', 'con', '.hidden']) {
    try { svc.deleteProject(bad) } catch { n += 1 }
  }
  return n === 7
})(), 'rejected=' + 'expect 7')
check('deleteProject 校验拒绝后原书目不受影响', svc.listNovels().novels.some((n) => n.id === novel) && svc.listNovels().novels.some((n) => n.id === '新书测试'))
const notFound = svc.deleteProject('不存在的书目id')
check('deleteProject 不存在返回 ok:false not found', notFound.ok === false && notFound.error === 'not found', JSON.stringify(notFound))
svc.createProject('probe-del-book', '删除演练')
const delRes = svc.deleteProject('probe-del-book')
check('deleteProject 删除成功返回 { ok:true, id }', delRes.ok === true && delRes.id === 'probe-del-book', JSON.stringify(delRes))
check('deleteProject 后书目列表消失且目录移除', !svc.listNovels().novels.some((n) => n.id === 'probe-del-book') && !existsSync(join(workspace, 'probe-del-book')))
const hostSrc = readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
check('novel-delete API 注册 + 校验链抽出复用（sanitizeNovelId）', hostSrc.includes("api('novel-delete'") && hostSrc.includes('sanitizeNovelId'), 'novel-delete route missing')

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
  && clientSrc.includes('draggable: props.draggable') && clientSrc.includes('minmax(320px,1fr)')
  && clientSrc.includes('nv-cplus{') && clientSrc.includes('border-radius:999px'), 'order-persist/drag/grid/pill missing')
// UX-009（视觉精修）：头部左对齐组（无 headflex + accent 变体钮 + 未设置工作区文案）、48px 药丸
check('控制台源码面：UX-009 视觉精修令牌（头部组/48px 药丸/无 headflex）', clientSrc.includes('nv-cbtn-ws')
  && clientSrc.includes('height:48px')
  && !clientSrc.includes('nv-console-headflex') && clientSrc.includes('wsUnset'), 'ux009 visual tokens missing')
// UX-010（用户批注 4 点）：①头部 ✕ 28×28 有边框醒目变体 ②排序 pill 13px/7px 14px/两钮 gap 8px
// ③卡片/磁贴统一 180px + 网格 gap 20px + 字号上调一档 ④current 联动（s.current 订阅 + 插件切换豁免）
check('控制台源码面：UX-010 批注（✕ 醒目变体/排序 pill 13px/180px 卡片磁贴/gap 20/字号一档）', (() => {
  const css = (cls) => {
    const m = new RegExp(cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}').exec(clientSrc)
    return m !== null ? m[1] : ''
  }
  const xBtn = css('.nv-console-head .nv-mini')
  const card = css('.nv-ccard')
  const tile = css('.nv-cplus')
  const grid = css('.nv-cgrid')
  const sort = css('.nv-csortbtn')
  return xBtn.includes('width:28px') && xBtn.includes('height:28px') && xBtn.includes('border:1px solid')
    && sort.includes('font-size:13px') && sort.includes('padding:7px 14px')
    && css('.nv-csort').includes('gap:8px')
    && card.includes('min-height:180px') && tile.includes('min-height:180px') && grid.includes('gap:20px')
    && css('.nv-ccard-name').includes('font-size:16px') && css('.nv-ccard-status').includes('font-size:13px')
    && css('.nv-ccard-data').includes('font-size:13px') && css('.nv-cmeta').includes('font-size:12px')
})(), 'ux010 tokens missing')
check('控制台源码面：UX-010④ current 联动（s.current 订阅 + ref 基准守卫 + 插件切换豁免）',
  clientSrc.includes('s.current') && clientSrc.includes('currentSeededRef') && clientSrc.includes('prevCurrentRef')
    && clientSrc.includes('pluginOpened') && clientSrc.includes('launcher.pluginOpened.add'), 'ux010 linkage missing')
// UX-011（两级工作台）：①改名 entryLabel/creationLabel/creationTitle ②卡片 🗑 删除钮 +
// novel-delete 对接（confirm 显式确认 fail-closed / stopPropagation / 绑定键清理 / consoleFocus 清理）
check('客户端源码面：UX-011 删除钮（🗑 22×22 平级钮 + novel-delete POST + confirm 前置 + 绑定键清理）', (() => {
  return clientSrc.includes("className: 'nv-cico nv-cico-del'") && clientSrc.includes("'🗑'")
    && clientSrc.includes("apiJson('/novel-writing/api/novel-delete', { novel: novel.id })")
    && clientSrc.includes('delConfirm') && clientSrc.includes('window.confirm')
    && clientSrc.includes('props.onDelete(novel)') && clientSrc.includes('delete next[novel.id]')
    && clientSrc.includes('consoleFocus === novel.id')
})(), 'ux011 delete flow missing')
check('客户端源码面：UX-011 两级命名（entryLabel=小说管理工作台 / creationLabel=小说创作工作台 分栏标题）', (() => {
  return clientSrc.includes("entryLabel: '📖 小说管理工作台'") && clientSrc.includes("entryLabel: '📖 Novel Management Workbench'")
    && clientSrc.includes("creationLabel: '小说创作工作台'") && clientSrc.includes('小说创作工作台 · 《')
    && clientSrc.includes("t('creationTitle'") && clientSrc.includes("t('creationLabel')")
    && !clientSrc.includes("title: '小说工作台'") && !clientSrc.includes('📖 小说工作台')
})(), 'ux011 naming missing')
// UX-012（新建弹窗与创建链调整）：①新建 = 居中模态（遮罩类 + 居中卡片 520/85vh/14px）
// ②表单仅目录名（书名字段/状态整体退役）③按钮仅「创建/取消」④自动启动链退役
// （不再 sessions.create/挂预设/绑定/发指令）⑤分栏标题栏 ▶ 开始/继续工作流。
check('客户端源码面：UX-012 新建 = 居中模态 + 仅目录名 + 创建/取消两钮（「创建并开始」链整体退役）', (() => {
  return clientSrc.includes('nv-cmodal-backdrop') && clientSrc.includes('.nv-cmodal{')
    && clientSrc.includes('width:min(520px,100%)') && clientSrc.includes('max-height:85vh')
    && clientSrc.includes("apiJson('/novel-writing/api/novel-create', { name })")
    && clientSrc.includes("t('createBtn')") && clientSrc.includes("t('cancel')")
    && !/\b(createGo|createOnly|bookPlaceholder|bookTitle|createDone)\b/.test(clientSrc)
    && !clientSrc.includes('sessions.create({ cwd: r.path })')   // go 分支自动建会话链已删
    && !clientSrc.includes('bindSession(r.id')                   // 创建即绑定已删（绑定归 🔗/绑定面板）
})(), 'ux012 create modal missing')
check('客户端源码面：UX-012 分栏标题栏 ▶ 开始/继续工作流（accent 实底钮 + 三态提示 + busy 防连点 + promptLaunch 复用）', (() => {
  return clientSrc.includes("className: 'nv-bar-launch'") && clientSrc.includes('.nv-bar-launch{')
    && clientSrc.includes("t('startWorkflow')") && clientSrc.includes("t('continueWorkflow')")
    && clientSrc.includes('bindFirstHint') && clientSrc.includes('setLaunchBusy')
    && clientSrc.includes('launcher.promptLaunch(sid, current, novels)')
    && clientSrc.includes('.nv-bar-note')                       // 三态提示条（ok/err/info）
})(), 'ux012 split launch missing')
// UX-013（用户批注 6 点）：
//  ①工作区对话框去会话创建（createSessionBtn/done 态/sync 键随链退役；switchHint + 信息性 hasSessionsHint 在位）
//  ②首次点卡片自动建会话并关联（openBookCreate 链：workspace.list 命中 root→workspaceId / cwd 回退 → create →
//    预设挂载 → bindSession → open+ensureSplit；自动链无 prompt——启动归创作台标题栏）
//  ②.4 卡片 ➤ 启动钮退役（onLaunch/continueBtn/launch 卡片消费点删除；promptLaunch 保留给创作台）
//  ③侧栏抽屉对齐+调宽+字大（.nv-drawer width:100% 与工作区列表行同宽 / 标题 13px+📖16px / 卡 14px/12.5px /
//    点 9px / 分隔线 l2 / 区块底部留白 8px）
//  ④BindDialog 既有能力（新建关联 & 关联既有）核验入断言：新建会话并绑定（bindNew/createAndBind/
//    sessions.create cwd）+ 既有会话行按 workspace.list 分组（workspace.list + nv-srow + finishBind）
check('客户端源码面：UX-013 工作区对话框去会话创建（createSessionBtn/done 态/sync 键退役 + switchHint 在位）', (() => {
  return clientSrc.includes("switchHint: '切换后管理工作台显示该工作区书目。'")
    && clientSrc.includes("switchFailPrefix: '切换工作区失败：'")
    && clientSrc.includes("hasSessionsHint: (n) => `该工作区已有 ${n} 个会话。`")
    && clientSrc.includes('pickWorkspace') && clientSrc.includes("patch: { workspaceRoot: w.path }")
    && !/[\u3000-\u303F]?createSessionBtn/.test(clientSrc) && !clientSrc.includes('createSessionBtn')
    && !clientSrc.includes('doneTitle') && !clientSrc.includes('doneMsg') && !clientSrc.includes('doneClose')
    && !clientSrc.includes('syncFailPrefix') && !clientSrc.includes('syncFailSuffix')
    && !clientSrc.includes('confirmCreate') && !clientSrc.includes('START_MSG')
    && !clientSrc.includes('确认将新建一个小说会话')
})(), 'ux013 ws dialog missing')
check('客户端源码面：UX-013 卡片两钮（➤ 启动钮退役：onLaunch/continueBtn/launch 卡片点删除；🔗/🗑 保留）', (() => {
  return !clientSrc.includes('onLaunch') && !clientSrc.includes('continueBtn')
    && !clientSrc.includes('const launch = async')
    && clientSrc.includes("className: 'nv-cico'")
    && clientSrc.includes("title: st === 'stale' ? t('bindStaleHint') : t('bindBtn')")
    && clientSrc.includes("className: 'nv-cico nv-cico-del'")
    && clientSrc.includes("launcher.promptLaunch(sid, current, novels)") // promptLaunch 保留（创作台 ▶）
    && clientSrc.includes("t('autoBindDone'")
})(), 'ux013 card buttons missing')
check('客户端源码面：UX-013 首次开卡自动链（workspaceId/cwd → create → 预设 → bind → open；无 prompt）', (() => {
  // UX-014⑦：链收口为 openCtl.autoCreate 单一事实源（控制台卡片与抽屉卡片共用）
  return clientSrc.includes('openCtl')
    && clientSrc.includes('autoCreate(novel, ctx)')
    && clientSrc.includes("if (st === 'none') { await openCtl.autoCreate(novel, ctx); return }")
    && clientSrc.includes('hit.workspaceId') && clientSrc.includes('joinNovelRoot(ctx.wsRoot, novel.id)')
    && clientSrc.includes("api.agentPresets.select({ sessionId, agentPreset: 'novel-writing' })")
    && clientSrc.includes('launcher.bindSession(novel.id, sessionId)')
    && clientSrc.includes('launcher.open(sessionId)')
    && !clientSrc.includes("content: [{ type: 'text', text: START_MSG }]")
})(), 'ux013 auto chain missing')
check('客户端源码面：UX-013 抽屉字形（width 100% 对齐 + 13px/📖16px/14px/12.5px/9px 点/l2 分隔线/8px 留白）', (() => {
  // UX-015（批注④）调整：卡片 title 14→13px、sub 12.5→12px、padding 8/10→6/8px、
  // 卡间 gap 6→4px（margin 4px 0）、状态点 9→8px（.nv-card .nv-dot 作用域）、空态随动、
  // 提示行 margin 随动；抽屉标题行 13px 不动（与管理台层级区分）；控制台卡片不动
  const css = (cls) => {
    const m = new RegExp(cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}').exec(clientSrc)
    return m !== null ? m[1] : ''
  }
  const drawer = css('.nv-drawer')
  const title = css('.nv-drawer-title')
  const ico = css('.nv-drawer-title-ico')
  const card = css('.nv-card')
  const ct = css('.nv-card-title')
  const cs = css('.nv-card-sub')
  const dot = css('.nv-dot')
  const cardDot = css('.nv-card .nv-dot')
  const sep = css('.nv-sep')
  return drawer.includes('width:100%') && drawer.includes('margin:2px 0 8px')
    && title.includes('font-size:13px') && title.includes('font-weight:600') && title.includes('letter-spacing:.06em')
    && ico.includes('font-size:16px')
    && card.includes('padding:6px 8px') && card.includes('border-radius:10px') && card.includes('margin:4px 0')
    && ct.includes('font-size:13px') && ct.includes('font-weight:600')
    && cs.includes('font-size:12px')
    && dot.includes('width:9px') && dot.includes('height:9px')      // 基型 9px（标题栏状态点）
    && cardDot.includes('width:8px') && cardDot.includes('height:8px') // 抽屉卡小一档 8px
    && sep.includes('--dsw-alias-border-l2')
})(), 'ux013 drawer typography missing')
check('客户端源码面：UX-013 BindDialog 既有能力核验（新建会话并绑定 + 按工作区分组关联既有）', (() => {
  return clientSrc.includes("t('bindNew')") && clientSrc.includes('createAndBind')
    && clientSrc.includes("api.sessions.create({ cwd })") && clientSrc.includes('joinNovelRoot(meta.root, target.novelId)')
    && clientSrc.includes('api.workspace.list({})') && clientSrc.includes("className: 'nv-srow'")
    && clientSrc.includes('finishBind(sessionId') && clientSrc.includes('groups.push')
    && clientSrc.includes("t('bindPick')")
})(), 'ux013 binddialog capability missing')
check('客户端源码面：UX-013 删除链绑定清理走 settings.mutate unset（deep-merge update 无法键级删除——探针实测）', (() => {
  return clientSrc.includes("api.settings.mutate({ ns: 'novel-writing', ops: [{ op: 'unset', path: ['bindings', novel.id] }] })")
    && clientSrc.includes("launcher.apiHas('settings', 'mutate')")
    && clientSrc.includes('delete next[novel.id]')         // 回退路径保留（旧宿主）
})(), 'ux013 delete binding mutate missing')
// UX-014（用户实机批注 8 点 + 2 真 Bug）：
//  ①左窗去工作区行（WorkspaceRootEditor 退役）与书目列表（LeftNavBookRow 退役），仅文件树 + 树头「文件」
//  ③目录默认折叠（collectDirPaths 全目录集初始化 + 切书 key 重挂独立初始化）
//  ④⑤真 Bug：让位观察器 CSSOM 归一化自伤修复（sameMargin 容差）+ 重锚定重挂观察器（N1）
//  ⑥⇄/✕ 28×28 醒目钮（.nv-bar-ctl 同管理台 ✕ 变体）；⑦抽屉卡片直达创作台（openCtl 单链）
//  ⑧SplitWorkspace 会话 current 联动关闭（对齐管理台；脏稿守卫）；⑨applyMargin 去 marginTop 推下
check('客户端源码面：UX-014 左窗仅文件树（无工作区行/书目列表 + 「文件」树头 + 目录默认折叠）', (() => {
  return clientSrc.includes('function LeftNav(props)')
    && clientSrc.includes("head('文件')")
    && !clientSrc.includes('LeftNavBookRow') && !clientSrc.includes('WorkspaceRootEditor')
    && !clientSrc.includes("head('书目（'") && !clientSrc.includes("head('文件（novel-project）')")
    && !clientSrc.includes('更改工作区根目录')
    && clientSrc.includes('collectDirPaths') && clientSrc.includes('collapseInitRef')
    && clientSrc.includes('setCollapsed(new Set(dirs))')
    && clientSrc.includes('key: selectedId, t, detail, selectedId')
})(), 'ux014 left pane missing')
check('客户端源码面：UX-014④⑤ 让位观察器容差比较 + 重锚定重挂（CSSOM ≤6 位有效数字归一化自伤修复）', (() => {
  const disconnects = (clientSrc.match(/this\.yieldObserver\.disconnect\(\)/g) ?? []).length
  return clientSrc.includes('function sameMargin') && clientSrc.includes('Math.abs(pa - pb) < 0.5')
    && clientSrc.includes('sameMargin(this.viewArea.style.marginLeft, this.lastMarginLeft)')
    && clientSrc.includes('sameMargin(this.viewArea.style.marginRight, this.lastMarginRight)')
    && disconnects >= 2 && clientSrc.includes('this.yieldObserver.observe(viewArea, { attributes: true, attributeFilter: [\'style\'] })')
})(), 'ux014 yield fix missing')
check('客户端源码面：UX-014⑨ 挤法不再推下对话窗（applyMargin 不写 marginTop；对话窗保持整高）', (() => {
  return clientSrc.includes('viewArea.style.marginRight = this.lastMarginRight')
    && !clientSrc.includes('viewArea.style.marginTop = this.lastMarginTop')
    && !clientSrc.includes('this.lastMarginTop = TITLE_BAR_H')
    && clientSrc.includes("this.lastMarginRight = this.chatSide === 'left' ? contentW + 'px' : ''")
})(), 'ux014 marginTop fix missing')
check('客户端源码面：UX-014⑥ 标题栏 ⇄/✕ 28×28 醒目钮（.nv-bar-ctl 与管理台 ✕ 同型；UX-015① 放大 32×32/18px/600）', (() => {
  const css = (cls) => {
    const m = new RegExp(cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}').exec(clientSrc)
    return m !== null ? m[1] : ''
  }
  const ctl = css('.nv-bar-ctl')
  const count = (clientSrc.match(/className: 'nv-bar-ctl'/g) ?? []).length
  return ctl.includes('width:32px') && ctl.includes('height:32px') && ctl.includes('border:1px solid')
    && ctl.includes('border-radius:8px') && ctl.includes('font-size:18px') && ctl.includes('font-weight:600')
    && count === 2
})(), 'ux014 bar ctl missing')
check('客户端源码面：UX-014⑦ 抽屉卡片直达创作工作台（openCtl 单链；不再打开控制台聚焦）', (() => {
  return clientSrc.includes('const openCtl = {')
    && clientSrc.includes('onOpen: (id, st) => {')
    && clientSrc.includes('openCtl.open(novel, st, {')
    && clientSrc.includes('const openBook = (novel, st) => openCtl.open(novel, st, {')
    && !clientSrc.includes('onOpen: (id) => openConsole(t, id)')
    && !clientSrc.includes('点击 = 打开控制台并聚焦该书')
})(), 'ux014 drawer direct missing')
check('客户端源码面：UX-014⑧ 创作台会话联动关闭分栏（splitCurrent + 基准守卫 + 独立豁免令牌 + closeWorkbench 脏稿守卫）', (() => {
  return clientSrc.includes('splitCurrent') && clientSrc.includes('splitSeededRef') && clientSrc.includes('splitPrevRef')
    && clientSrc.includes('novelSplit.pluginOpenTokens.has(splitCurrent)')
    && clientSrc.includes('novelSplit.pluginOpenTokens.add(sessionId)')
    && clientSrc.includes('if (snap.active === true) closeWorkbench(t)')
})(), 'ux014 split linkage missing')
// UX-015（用户实机批注 5 点）：
//  ①标题栏加高放大（.nv-bar 30→38px / padding 0 14px / .nv-bar-title 14px / .nv-badge 13px /
//    .nv-bar .nv-mini 24px / .nv-bar-ctl 32×32·18px·600 / TITLE_BAR_H=38 / ▶ 启动钮 padding 5px 14px）
//  ②章节列表行显示章节名（中窗左列；UX-019 定案 = 仅「第N章 · 名称」/空名称「第N章」，无字数）
//  ③章节列 160px + 直排滚动（.nv-chlist overflow:auto）；UX-020（用户实机反馈修正
//    UX-019③）恢复 UX-015③ 拖宽条：.nv-chdiv pointer 拖拽 120–360px + chapterW 持久化
//  ④抽屉小一档（.nv-card 13/12px、6·8px padding、4px 间隙、点 8px、空态随动；控制台卡片不动）
//  ⑤聊天区正常 = UX-014⑨ 回归（marginTop 不写断言在位）
check('客户端源码面：UX-015① 标题栏加高放大（38px 高 / 14px 标题 / 13px 徽标 / 32×32·18px / 14px 内边距 / TITLE_BAR_H=38）', (() => {
  const css = (cls) => {
    const m = new RegExp(cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}').exec(clientSrc)
    return m !== null ? m[1] : ''
  }
  const bar = css('.nv-bar')
  const bt = css('.nv-bar-title')
  const badge = css('.nv-badge')
  const ctl = css('.nv-bar-ctl')
  const barMini = css('.nv-bar .nv-mini')
  const launch = css('.nv-bar-launch')
  return clientSrc.includes('const TITLE_BAR_H = 38')
    && bar.includes('height:38px') && bar.includes('padding:0 14px')
    && bt.includes('font-size:14px') && bt.includes('font-weight:600')
    && badge.includes('font-size:13px')
    && ctl.includes('width:32px') && ctl.includes('height:32px') && ctl.includes('font-size:18px') && ctl.includes('font-weight:600')
    && barMini.includes('width:24px') && barMini.includes('height:24px')
    && launch.includes('padding:5px 14px')
})(), 'ux015 bar missing')
check('客户端源码面：UX-019② 章节行仅「第N章 + 名称」（去字数+去装饰圆点〔UX-021〕；有名称「第N章 名称」/空名称回退「第N章」；ellipsis 沿用）', (() => {
  return clientSrc.includes("const cName = typeof c.name === 'string' ? c.name : ''")
    && clientSrc.includes('`第${c.num}章${marks}`')        // 无名称回退格式（第N章 + 标记）
    && clientSrc.includes("el('span', { key: 'no'")       // 有名称：第N章 span
    && !clientSrc.includes("key: 'sep'")                  // 无装饰圆点「·」（UX-021 负断言）
    && clientSrc.includes("el('span', { key: 'nm'")       // 有名称：名称 ellipsis span
    && !clientSrc.includes('${c.words}')                  // 章节行无任何字数渲染（去字数）
    && !clientSrc.includes('`· ${c.words}${marks}`')
    && !clientSrc.includes('`第${c.num}章 ${c.words}${marks}`')
    && clientSrc.includes("textOverflow: 'ellipsis'")
    && clientSrc.includes("className: 'nv-chlist'")
})(), 'ux019 chapter name row missing')
check('客户端源码面：UX-020 章节列拖宽条（.nv-chdiv 元素+pointer 拖拽 / CHAPTER_W 120–360 常量 / chapterW 持久化读写 / 列宽随 snap.chapterW / .nv-chlist overflow:auto 滚动 / i18n 键恢复 / 4px 几何保持〔UX-021 默认透明三态〕）', (() => {
  return clientSrc.includes("className: 'nv-chdiv'")                                    // 正：拖宽条元素
    && clientSrc.includes("onPointerDown: chapterDividerHandler")                       // 正：pointer 拖拽入口
    && clientSrc.includes('target.setPointerCapture(e.pointerId)')
    && clientSrc.includes('const CHAPTER_W_MIN = 120') && clientSrc.includes('const CHAPTER_W_MAX = 360')
    && clientSrc.includes('const CHAPTER_W_DEFAULT = 160')
    && clientSrc.includes('chapterW: Number.isFinite(s.chapterW) ? s.chapterW : null')  // 读存档
    && clientSrc.includes('chapterW: state.chapterW')                                   // 写存档
    && clientSrc.includes('setChapterW(w)') && clientSrc.includes('onChapterW: (w) => novelSplit.setChapterW(w)')
    && clientSrc.includes('this.chapterW = clampNum(Math.round(w), CHAPTER_W_MIN, CHAPTER_W_MAX)')
    && clientSrc.includes('clampNum(saved.chapterW, CHAPTER_W_MIN, CHAPTER_W_MAX)')
    && clientSrc.includes("width: chapterW + 'px'")                                     // 列宽随章列状态
    && clientSrc.includes('title: t(\'resizeChlist\')') && clientSrc.includes('resizeChlist:')
    && clientSrc.includes('.nv-chlist{flex:none;min-height:0;overflow-y:auto;overscroll-behavior:contain;background:var(--dsw-alias-fill-l1,rgba(255,255,255,.02))}')           // 独立滚动+浅底侧栏（UX-022/025）
    && clientSrc.includes('.nv-chdiv{flex:none;width:4px;align-self:stretch;cursor:col-resize;background:transparent;border-right:1px solid var(--dsw-alias-border-l2,#3a4150);touch-action:none}')  // 1px 细分隔线（UX-025；4px 抓握区保留）
    && clientSrc.includes('.nv-chdiv:hover{border-right-color:var(--dsw-alias-state-accent-primary,#4f8ef7)}')
})(), 'ux020 chapter drag restored')
check('客户端源码面：UX-025 三分隔线 1px 细线（vdiv/chdiv/chatdiv——4px 抓握区 + border-right 1px border-l2 + hover accent；与宿主细分割线协调；无 4px 实底残留）', (() => {
  const divider = (cls) => {
    const m = new RegExp('\\.' + cls + '\\{([^}]*)\\}').exec(clientSrc)
    return m !== null ? m[1] : ''
  }
  return divider('nv-vdiv').includes('border-right:1px solid var(--dsw-alias-border-l2')
    && divider('nv-chatdiv').includes('border-right:1px solid var(--dsw-alias-border-l2')
    && divider('nv-chdiv').includes('border-right:1px solid var(--dsw-alias-border-l2')
    && divider('nv-vdiv').includes('background:transparent') && divider('nv-chatdiv').includes('background:transparent') && divider('nv-chdiv').includes('background:transparent')
    && clientSrc.includes('.nv-vdiv:hover{border-right-color:var(--dsw-alias-state-accent-primary,#4f8ef7)}')
    && clientSrc.includes('.nv-chatdiv:hover{border-right-color:var(--dsw-alias-state-accent-primary,#4f8ef7)}')
    && clientSrc.includes('.nv-chdiv:hover{border-right-color:var(--dsw-alias-state-accent-primary,#4f8ef7)}')
    && !divider('nv-vdiv').includes('background:var(--dsw-alias-border-l2') && !divider('nv-chdiv').includes('background:var(--dsw-alias-border-l2') && !divider('nv-chatdiv').includes('background:var(--dsw-alias-border-l2')
    && !clientSrc.includes('border-radius:2px;touch-action:none')                                                       // 旧 4px 实底圆角条无残留
    && clientSrc.includes('.nv-chlist button{transition:background .12s ease}')                                          // 交互过渡统一（成熟 UI）
    && clientSrc.includes('transition:background .12s ease,color .12s ease,border-color .12s ease')                     // 页签过渡
    && clientSrc.includes('.nv-tab:hover{color:var(--dsw-alias-label-primary,#e6e8eb);background:var(--dsw-alias-fill-l1,rgba(255,255,255,.05))}')
    && clientSrc.includes('.nv-bar{flex:none;display:flex;align-items:center;gap:8px;height:38px;padding:0 14px;box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2,#3a4150)')  // UX-026 标题栏底边线清晰
    && clientSrc.includes('.nv-left{flex:none;min-height:0;overflow:auto;padding:8px;box-sizing:border-box}')                                                 // UX-028 树窗右缘线由 vdiv 拖线承担（免双线）
    && clientSrc.includes('.nv-split{position:fixed;display:flex;flex-direction:column;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,#3a4150);border-right:none;border-radius:0;')      // UX-026/027/029：外框 border-l2+右缘去重+直角（连接处线线相接）
    && clientSrc.includes("(snap.chatSide === 'left' ? g.left : x + contentW) - 3) + 'px'")                            // UX-029：拖线右缘对齐（水平线顶到边/拖线从边起）
    && clientSrc.match(/\.nv-split\{[^}]*border:1px solid var\(--dsw-alias-border-l1,/) === null  // 无 border-l1 残留
})(), 'ux025 thin dividers + polish + ux026 visible area dividers + ux027 single chat edge + ux029 square junction')
check('客户端源码面：UX-022 两个「拖动条」（滚动条）默认隐藏 + 滚动隔离（-webkit-scrollbar track/thumb 透明；UX-024 滚动中显示/停止 600ms 自动隐藏——.nv-scl 滚动事件驱动、无悬停常驻；.nv-chlist/.nv-scroll 带 overscroll-behavior:contain；高度链=章节页签包装层 height:100%+overflow:hidden、正文列/左窗/页签外层均为 nv-scroll 独立滚动容器——章节列 1587px 撑开整体联动问题修复；正文阅读区容器与编辑 textarea 亦纳入 UX-023 补充；共 5 个 nv-scroll）', (() => {
  return clientSrc.includes('.nv-chlist::-webkit-scrollbar,.nv-scroll::-webkit-scrollbar{width:8px;background:transparent}')
    && clientSrc.includes('.nv-chlist::-webkit-scrollbar-thumb,.nv-scroll::-webkit-scrollbar-thumb{background:transparent}')
    && clientSrc.includes('.nv-scl::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2,#3a4150)}')   // UX-024 滚动触发显现
    && clientSrc.includes('.nv-chlist::-webkit-scrollbar-thumb:hover,.nv-scroll::-webkit-scrollbar-thumb:hover,.nv-scl::-webkit-scrollbar-thumb:active{background:var(--dsw-alias-state-accent-primary,#4f8ef7)}')
    && !clientSrc.includes('.nv-scroll:hover::-webkit-scrollbar-thumb')                                          // 无悬停常驻（UX-024 撤除）
    && !clientSrc.includes('.nv-chlist:hover::-webkit-scrollbar-thumb')
    && clientSrc.includes("el.classList.add('nv-scl')") && clientSrc.includes("el.classList.remove('nv-scl')")   // 滚动显示/空闲撤除
    && clientSrc.includes('document.addEventListener(\'scroll\', onScroll, true)')
    && clientSrc.includes('document.removeEventListener(\'scroll\', onScroll, true)')
    && clientSrc.includes('setTimeout(() => { el.classList.remove(\'nv-scl\'); timers.delete(el) }, 1500)')        // 1.5s 自动隐藏（用户调长）
    && clientSrc.includes('for (const t of timers.values()) clearTimeout(t)')                                     // 卸载清理
    && clientSrc.includes('.nv-scroll{overscroll-behavior:contain}')
    && clientSrc.includes("className: 'nv-scroll'")                                    // 五个滚动容器（正文阅读区/编辑 textarea/正文列/左窗/页签外层）
    && (clientSrc.match(/className: 'nv-scroll'/g) ?? []).length === 5
    && clientSrc.includes("className: 'nv-scroll', style: { border: '1px solid ' + TK.line")   // 正文阅读区容器纳入（UX-023）
    && clientSrc.includes('value: draft') && clientSrc.includes('onKeyDown: (e) =>')           // 编辑 textarea 同链（类在五项计数内）
    && clientSrc.includes("{ display: tab === 'chapters' ? 'block' : 'none', height: '100%', overflow: 'hidden' }")  // 高度链修复
    && clientSrc.includes("className: 'nv-scroll', style: { flex: 1, minWidth: 0, overflow: 'auto' }")
})(), 'ux022 scrollbars hidden + scroll isolated + ux024 auto reveal')
check('客户端源码面：UX-015④ 抽屉小一档（13/12px + 6·8px + 4px 间隙 + 8px 点 + 空态随动；控制台卡片不动）', (() => {
  const css = (cls) => {
    const m = new RegExp(cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}').exec(clientSrc)
    return m !== null ? m[1] : ''
  }
  const card = css('.nv-card')
  const ct = css('.nv-card-title')
  const cs = css('.nv-card-sub')
  const cardDot = css('.nv-card .nv-dot')
  const empty = css('.nv-drawer .nv-empty')
  const ccard = css('.nv-ccard')
  return card.includes('padding:6px 8px') && card.includes('margin:4px 0')
    && ct.includes('font-size:13px') && cs.includes('font-size:12px')
    && cardDot.includes('width:8px') && cardDot.includes('height:8px')
    && empty.includes('padding:6px 8px')
    && ccard.includes('min-height:180px') && ccard.includes('padding:16px') // 管理层卡片不动（层级感=抽屉小于控制台）
})(), 'ux015 drawer small missing')
// UX-016（用户实机「首次进入还是截断」；Coordinator 1078×593 复现取证）：
//  原钳制 hi = colW − 160 − 420，1078 窗口（colW=798）下 hi=218 → 聊天被压到 240 下限：
//  hero 折行 + 输入框裁切。修复 = 最小预留重分配——左 160→128、中 420→320、聊天 240→300；
//  无存档默认 = clamp(round(colW*0.45), 300, max(300, colW−128−320))（聊天优先 45%，
//  上限 colW−448 保证左 128+中 320 预留；colW<748 上下限收敛 300）；存档超界收敛同钳。
// UX-017（用户强刷后仍见窄聊天——旧包或 300 下 hero 输入行临界溢出未分辨；Coordinator 定案）：
//  宽度再让一档——CHAT_MIN 300→320、LEFT_MIN 128→120、CENTER_MIN 320→300（cap=colW−420）；
//  默认比例 0.45→0.50；存档收敛同按新上下限。常量新值正/负断言都在（旧值不得残留）。
check('客户端源码面：UX-016/017 小窗聊天钳制重分配（LEFT_MIN=120 / CENTER_MIN=300 / CHAT_MIN=320 / 0.50 默认公式 / 存档钳制共享）', (() => {
  return clientSrc.includes('const LEFT_MIN = 120') && clientSrc.includes('const CENTER_MIN = 300')
    && clientSrc.includes('const CHAT_MIN = 320') && clientSrc.includes('CHAT_DEFAULT_RATIO = 0.50')
    && clientSrc.includes('Math.round(colW0 * CHAT_DEFAULT_RATIO)')
    && clientSrc.includes('clampNum(saved.chatW, CHAT_MIN, Math.max(CHAT_MIN, colW0 - LEFT_MIN - CENTER_MIN))')
    && !clientSrc.includes('Math.round(colW0 * 0.34)')
    && !clientSrc.includes('const LEFT_MIN = 128') && !clientSrc.includes('const CENTER_MIN = 320')
    && !clientSrc.includes('const CHAT_MIN = 300') && !clientSrc.includes('CHAT_DEFAULT_RATIO = 0.45')
})(), 'ux016/017 chat min reassign missing')
check('客户端源码面：UX-019① 可见版本徽标撤离（无 CLIENT_TAG 常量 / 无 .nv-tag 渲染与样式 / 无 nv-tag 字符串残留）', (() => {
  return !clientSrc.includes('CLIENT_TAG')
    && !clientSrc.includes('nv-tag')
    && !clientSrc.includes('.nv-tag{')
    && (clientSrc.match(/className: 'nv-console-title'/g) ?? []).length === 1   // 标题节点仍在（仅徽标撤离）
    && (clientSrc.match(/className: 'nv-bar-title'/g) ?? []).length === 1
})(), 'ux019 client tag removed')
// UX-018（用户实机截图「聊天窗渲染异常」——根因已闭合：margin 不改变元素 content-box
//  尺寸，宿主响应式布局（hero「探索未至之境」居中定位）靠自身尺寸变化（ResizeObserver/
//  宽度重算）触发重排；真实时序「先全宽挂载、后加 margin」无尺寸事件 → 不重排 → hero
//  保持全宽坐标（输入框中心 ~667），挤压后仅露右缘碎片 =「渲染异常」；反之时序
//  「先挤压后挂载」（无头复现/刷新重开）页面以窄宽挂载 → 容器居中 → 正常）。修复 =
//  双压：applyMargin 在 marginLeft/marginRight 之外显式 width=clamp 后 chatW →
//  border-box 真变小 → 宿主必然重排，两种时序统一；原 width 记 savedWidth，
//  恢复点 = close + syncAnchor 换根（各一处）；marginTop 仍不写（UX-014⑨）。
check('客户端源码面：UX-018 双压注释（根因 margin 不改 content-box + 显式 width 触发宿主重排 + savedWidth 记录恢复点）', (() => {
  const recordWidth = (clientSrc.match(/this\.savedWidth = viewArea\.style\.width/g) ?? []).length
  const restoreWidth = (clientSrc.match(/this\.viewArea\.style\.width = this\.savedWidth/g) ?? []).length
  return clientSrc.includes('UX-018 双压')
    && clientSrc.includes('content-box')
    && clientSrc.includes('两种挂载时序统一')
    && recordWidth === 2   // open + syncAnchor 换根
    && restoreWidth === 2  // close + syncAnchor 换根
})(), 'ux018 double-squeeze restore missing')
check('客户端源码面：UX-018 applyMargin 写 width = clamp 后 chatW（margin+width 双压；marginTop 仍不写）', (() => {
  const writes = (clientSrc.match(/viewArea\.style\.width = this\.chatW \+ 'px'/g) ?? []).length
  return writes === 1
    && clientSrc.includes('viewArea.style.marginLeft = this.lastMarginLeft')
    && clientSrc.includes('viewArea.style.marginRight = this.lastMarginRight')
    && !clientSrc.includes('viewArea.style.marginTop = this.lastMarginTop')
})(), 'ux018 applyMargin width write missing')
check('客户端源码面：UX-018 边界（无根/几何缺失不写 width；视图区内联 width 覆盖后关闭恢复）', (() => {
  return clientSrc.includes('if (viewArea === null || g === null) return')
    && clientSrc.includes('this.savedWidth = viewArea.style.width')
    && clientSrc.includes('this.viewArea.style.width = this.savedWidth')
    && clientSrc.includes('this.savedMarginLeft = viewArea.style.marginLeft')
})(), 'ux018 boundary missing')
// UX-018 探针驱动的引擎健壮性修正：会话切换（卡片打开链 sessions.open）后目标视图以
//  phase='hero' 稳定挂载、宿主重渲染可能替换 viewArea 子节点——原「仅接受 active + 根同
//  即快路径」把引擎永久卡在旧锚点（live viewArea 永不接受挤压）。修正 = 与 open() 同口径
//  有根即锚 + 快路径以 header/viewArea 三元同恒为门槛（子节点被替换走完整重锚定）。
check('客户端源码面：UX-018 syncAnchor 重锚定修正（hero 相位接受 + 根同但子节点替换走完整重锚）', (() => {
  return clientSrc.includes("phase='hero'")
    && clientSrc.includes('next === this.root && header === this.header && viewArea === this.viewArea')
    && !clientSrc.includes("next.dataset.phase !== 'active'")
})(), 'ux018 syncAnchor re-anchor missing')
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
