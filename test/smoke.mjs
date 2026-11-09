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
 *       独立滚动——高度链修复）+ UX-053 工作台视觉重构（Lucide 内联图标
 *       体系 NV_ICONS/nvIcon + 焦点双环统一 + 光效收敛〔扫光删除〕+
 *       color-mix 令牌化兜底 + 选中态类化 + 空态 24px 图标）+
 *       UX-059 工作流控制条（标题栏启动钮迁移 / 停止·继续合并主按钮
 *       形态切换 / 压缩上下文 /compact / 绑定新会话——不自动打开）+
 *       COMPAT-003 宿主表面 fixtures 快照与离线契约对账（test/fixtures/host-surfaces/ 三版本真实包
 *       只读提取快照〔0.1.1-rc.2 / 0.1.2-rc.1 / 0.1.5-rc.2〕/ 契约声明面 ⊆ fixture 实测面 /
 *       三版本差异 golden〔settingsNamespace·connection.api 两个断点 = BUG-003·BUG-004〕/
 *       ci.yml dsh-settings mock 导出面面钉〔F1：静态解析 + 动态 import 两法互证〕/
 *       契约 file·line 活性与每面锚点抽核 / 递归 own-descriptor 纯数据强化）。
 *       COMPAT-002 宿主契约对账（lib/host-contract.mjs 六面 52 项结构 / F10 口径 /
 *       纯数据守卫 + 槽位名·CSS 令牌·DOM selector 三类 region 字面量双向对账 + 服务名
 *       与事件名双向对账）。
 *       COMPAT-004 宿主边界层（lib/host-boundary.js 收口 lib/index.js 宿主调用——9 类直连模式 grep
 *       零命中 + 收口映射表键集 ≡ 契约面 1 可收口项 + 映射符号真实导出且被消费 / detectHostCapabilities
 *       探测项 = 契约 face 1 全 11 项投影且全同步〔F7〕+ 未探测项如实披露 / 缺面单次 [nv-compat] 结构化
 *       告警〔含安全边界 BC-05 机检〕/ A3 inject 收敛双路径〔service 在 → locale 生效；service 缺 →
 *       仍挂载 + 降级默认 zh 不崩溃〕+ legacyApi 回退分支零改动 / FIND-1 tier golden + FIND-3 fixtures
 *       过筛项登记 + FIND-4 extract.mjs 边界披露）。
 */
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
// COMPAT-016 P3-4：job 段切分 / run 行归一由**共享纯函数模块**提供（与 probe-face.mjs ②/⑦ 消费同一对象；
// 原为本文件内镜像一份 `ciJobSection`/`ciCmdOf`、无交叉机检 ⇒ R1 P3-4）。
import { jobSection, jobCmd } from './fixtures/host-surfaces/yml-jobs.mjs'

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
  // BUG-004：useEffect 支持可选收集器（__effectSink.list 非 null 时收集 effect 回调）——
  // 默认 null = 既有 no-op 行为（147 项断言语义不变）；测试手动 flush 驱动 effect 体。
  let frames = []
  const effectSink = { list: null }
  const useHook = (init) => {
    const f = frames[frames.length - 1]
    const i = f.i
    f.i += 1
    if (f.hooks[i] === undefined) f.hooks[i] = typeof init === 'function' ? init() : init
    return f.hooks[i]
  }
  const react = {
    createElement: (type, props, ...children) => {
      if (typeof type === 'function') {
        frames.push({ i: 0, hooks: [] })
        try { return type({ ...(props ?? {}), children }) } finally { frames.pop() }
      }
      return { __nvEl: true, type, props: props ?? {}, children }
    },
    useState: (v) => { const s = useHook(v); return [s, () => {}] },
    useEffect: (fn) => { if (effectSink.list !== null) effectSink.list.push(fn) },
    useRef: (v) => ({ current: v }),
    useMemo: (fn) => fn(),
    // F1（BUG-009 R1）：本 harness 只做**单次渲染**的结构断言，无更新调度 ⇒ `useSyncExternalStore`
    // 按 React 的「读快照」语义求值即可（订阅生命周期由 BUG-005 段的 mini-react harness 真驱动）
    useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
  }
  react.__effectSink = {
    setList(list) { effectSink.list = list },
  }
  return react
})()
let clientExports = null
let clientFactoryErr = ''
try {
  clientExports = capturedDef.factory((id) => { if (id === 'react') return mockReact; throw new Error('unexpected require: ' + id) })
} catch (e) { clientFactoryErr = e.message }
check('客户端 factory 无 DOM 环境可求值', clientFactoryErr === '' && clientExports !== null, clientFactoryErr)
check('客户端 exports.apply 为函数', clientExports !== null && typeof clientExports.apply === 'function')
// COMPAT-004 A3（DEC-026）：inject 由三服务硬声明收敛为 slots 单硬依赖 —— connection/locale 降为可选探测
// （ctx.get 惰性判定；双路径实证见文末 COMPAT-004 段：服务在 → locale 生效；服务缺 → 降级默认 zh 不崩溃）
check('COMPAT-004 A3：客户端 inject 收敛为 slots 单硬依赖（connection/locale 不再进 inject）',
  clientExports !== null && Array.isArray(clientExports.inject)
    && clientExports.inject.length === 1 && clientExports.inject.includes('slots')
    && !clientExports.inject.includes('connection') && !clientExports.inject.includes('locale'),
  'inject=' + JSON.stringify(clientExports !== null ? clientExports.inject : null))

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
//  UX-055③+ P1-2（R1 修复）：mock 渲染为加载中初始态（poll.data=null）→ **主体留白**（无英雄/无空态/无网格
//  ——不闪现误导性空态），工具行/搜索行维持；hero 门控为源码级断言（poll.data !== null && novels.length === 0）；
//  P1-1（R1 修复）：稀疏居中条件模板与 ≥3 本类模板差异为源码级断言（两分支模板）。
let ux008diag = ''
check('控制台树：底部搜索行 + 加载中主体留白（无 hero/无空态/无网格——P1-2 门控）+ 无「▶ 打开」', (() => {
  const dr = slotRegs.find((r) => r.id === 'novel-drawer')
  const con = slotRegs.find((r) => r.id === 'nv-console')
  if (dr === undefined || con === undefined) return false  // 1) 点抽屉标题行（真实入口路径）打开控制台
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
  // 2) 渲染控制台取树（open 态全量输出；mock usePoll 初始 data=null = 加载中态）
  // UX-063 P0-a②：默认入口已改为首页 → 本断言显式走「全部书籍」二级页（initialView）
  const root = con.render({ initialView: 'books' })
  if (root === null || typeof root !== 'object') return false
  const clsCount = {}
  const texts = []
  let footHasSearch = false
  let gridKids = null
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
  const joined = texts.join('')
  // 源码级（P1-1/P1-2）：hero 门控 = poll.data !== null && novels.length === 0；
  // 稀疏居中 = ≤2 本模板 repeat(auto-fit,minmax(320px,420px)) + justify-content:center；
  // ≥3 本恢复类模板 repeat(auto-fill,minmax(320px,1fr))——两分支模板差异断言。
  const heroGateIdx = clientSrc.indexOf('poll.data !== null && novels.length === 0')
  const sparseIdx = clientSrc.indexOf("style: novels.length >= 1 && novels.length <= 2 ? { gridTemplateColumns: 'repeat(auto-fit,minmax(320px,420px))', justifyContent: 'center' } : undefined")
  const gridGateIdx = clientSrc.indexOf("poll.data === null || novels.length === 0")
  ux008diag = JSON.stringify({ hero: clsCount['nv-hero'] ?? 0, empty: clsCount['nv-empty'] ?? 0, grid: clsCount['nv-cgrid'] ?? 0, sort: clsCount['nv-csortbtn'] ?? 0, joined: texts.join('').slice(0, 120), heroGateIdx, sparseIdx, gridGateIdx })
  return footHasSearch === true                     // ② 搜索行移到容器底部（nv-cfoot 内）
    && (clsCount['nv-hero'] ?? 0) === 0             // P1-2：加载中（poll.data=null）不渲染英雄区
    && (clsCount['nv-empty'] ?? 0) === 0            // P1-2：加载中不渲染空态框（noMatch/加载空态）
    && (clsCount['nv-cgrid'] ?? 0) === 0            // P1-2：加载中不渲染网格（不闪现空网格+磁贴）
    && (clsCount['nv-csortbtn'] ?? 0) === 2          // ④ 排序 默认/手动 两态钮（与书量/加载态无关）
    && !joined.includes('从第一本书开始')            // 加载中无英雄文案
    && heroGateIdx > -1                              // P1-2：hero 门控源码在位
    && gridGateIdx > -1                              // P0-0（R2）：grid 双门控源码在位（加载中/0 本均不渲染网格）
    && gridGateIdx < sparseIdx                       // P0-0：grid 双门控在稀疏分支之前（同分支同门控）
    && sparseIdx > -1                                // P1-1：稀疏居中条件模板+justify-content 在位
    && clientSrc.indexOf("key: 'nv-cplus'") > sparseIdx // 磁贴居末（cplus 在网格声明之后；源码级——0 本树无网格可验）
    && clientSrc.includes('.nv-cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))') // ≥3 本类模板不变（两分支差异）
    && (clsCount['nv-cact'] ?? 0) === 0              // ③ 卡内「▶ 打开」文本钮消失（类整体移除）
    && !joined.includes('▶ 打开')
    && !clientSrc.includes('openBtn')               // i18n 键同步清理
})(), 'console tree mismatch :: ' + ux008diag)
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
    && sort.includes('font-size:var(--nv-fs-card)') && sort.includes('padding:7px 14px')
    && css('.nv-csort').includes('gap:8px')
    && !card.includes('min-height:180px') && tile.includes('min-height:180px') && grid.includes('gap:20px')
    // UX-055①：字号随字阶常量演进——书卡标题 17px（TYPO.cardTitle）、状态行/meta 11px（TYPO.meta）
    && css('.nv-ccard-name').includes('TYPO.cardTitle') && css('.nv-ccard-status').includes('TYPO.meta')
    && css('.nv-ccard-data').includes('font-size:var(--nv-fs-card)') && css('.nv-cmeta').includes('TYPO.meta')
})(), 'ux010 tokens missing')
check('控制台源码面：UX-010④ current 联动（s.current 订阅 + ref 基准守卫 + 插件切换豁免）',
  clientSrc.includes('s.current') && clientSrc.includes('currentSeededRef') && clientSrc.includes('prevCurrentRef')
    && clientSrc.includes('pluginOpened') && clientSrc.includes('launcher.pluginOpened.add'), 'ux010 linkage missing')
// UX-011（两级工作台）：①改名 entryLabel/creationLabel/creationTitle ②卡片 🗑 删除钮 +
// novel-delete 对接（confirm 显式确认 fail-closed / stopPropagation / 绑定键清理 / consoleFocus 清理）
check('客户端源码面：UX-011 删除钮（🗑 22×22 平级钮 + novel-delete POST + confirm 前置 + 绑定键清理）', (() => {
  return clientSrc.includes("className: 'nv-cico nv-cico-del'") && clientSrc.includes("nvIcon('trash2', 14)")
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
// ── CLEAN-007（承接 UX-012-R1 备注批次：D-1 / F2 / F3 / F4 / F6 / F9）──────────────────────
// ①D-1 绑定面板自挂 Esc（让位后有人接手）②F6 三处模态可访问性 + 焦点陷阱/归还公共件
// ③F9 死参残留 / F3 关窗复位 / F4 订阅叶选择 ④F2 创建链单点收口（单一实现 + 两消费点）
check('客户端源码面：CLEAN-007 D-1 绑定面板自挂 Esc（NvConsole 让位后由面板接手——只关面板、控制台保持打开；busy 中不关；监听随卸载移除）', (() => {
  // 组件切片：自组件声明起至**下一个顶层 function**（4 空格缩进）——不用「到下一个组件名」的宽切片
  // （中间会混入同名组件：切片混入后 'consoleOpen: false' 负断言会被邻近组件污染）
  const compSrc = (name) => {
    const i = clientSrc.indexOf('function ' + name + '(')
    if (i < 0) return ''
    const j = clientSrc.indexOf('\n    function ', i + 10)
    return j > i ? clientSrc.slice(i, j) : clientSrc.slice(i)
  }
  const bindSrc = compSrc('BindDialog')
  return bindSrc.includes("e.key === 'Escape' && busy !== true")          // busy 守卫（与 close() 同口径）
    && bindSrc.includes("window.addEventListener('keydown', onKey)")
    && bindSrc.includes("window.removeEventListener('keydown', onKey)")   // 清理（无监听泄漏）
    && bindSrc.includes('store.set({ bind: null })')                      // 只关面板
    && !bindSrc.includes('consoleOpen: false')                            // 负断言：不关控制台
    && clientSrc.includes('if (s.bind !== null || s.entryOpen === true) return') // NvConsole 让位分支仍在
})(), 'clean007 d1 binddialog esc missing')
check('客户端源码面：CLEAN-007 F6 模态可访问性（三处模态 role=dialog + aria-modal + 焦点陷阱/焦点归还公共件；`useModalFocus` 三处调用 + BUG-010 的 `WorkspaceDialog` 自挂 Esc effect 均位于组件早退之前 = hook 恒定调用契约）', (() => {
  const compSrc = (name) => {
    const i = clientSrc.indexOf('function ' + name + '(')
    if (i < 0) return ''
    const j = clientSrc.indexOf('\n    function ', i + 10)
    return j > i ? clientSrc.slice(i, j) : clientSrc.slice(i)
  }
  // 逐组件：hook 调用点 MUST 早于该组件的早退 return null（hook 恒定调用契约）
  const ordered = (src, hook) => {
    const h = src.indexOf(hook); const r = src.indexOf('if (open !== true) return null')
    return h >= 0 && r > h
  }
  const bindOk = ordered(compSrc('BindDialog'), 'useModalFocus(open, panelRef)')
  const cmodOk = ordered(compSrc('NvConsole'), 'useModalFocus(creating, cmodalRef)')
  const wsOk = ordered(compSrc('WorkspaceDialog'), 'useModalFocus(open, wsdlgRef)')
  // BUG-010（CLEAN-006 N-3 扩面）：**WorkspaceDialog 自挂 Esc effect** 的早退顺序亦入机检
  // （原检查只覆盖 `useModalFocus` ⇒ 本 effect 误置此前只在运行期因 `close()` 前向引用的 TDZ
  //  **间接**暴露——那是**运行期崩溃**而非静态判据；本条补上源码面静态判据，使误置在门禁即红。
  //  R1 **F-09** 措辞订正：本判据自身**有判别力**（下附正向对照），并非「只因 TDZ 才被发现」）。
  // 锚定方式：该 effect 的 payload 是 `store.set({ entryOpen: false })`（全仓**恰一处**）⇒ 以
  // **整个 effect 文本**为锚（全仓唯一），判「该处早于组件早退 `if (open !== true) return null`」。
  // 不用 `ordered()` 的字面串：三条同类 effect 的起手两行逐字相同，且 `compSrc('WorkspaceDialog')`
  // 的边界是**超集**（其 `\n    function ` 落在 66 KB 之后）⇒ 会误配到 BindDialog/NvConsole 的 effect。
  // **判别力（正向对照，防恒真）**：人为把该 effect 挪到早退**之后** ⇒ 该处索引 > 早退索引 ⇒ 必红。
  const wsEscBody = ["      useEffect(() => {",
    "        if (open !== true) return undefined",
    "        const onKey = (e) => { if (e.key === 'Escape' && busy !== true) store.set({ entryOpen: false }) }",
    "        try { if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('keydown', onKey) } catch { /* ignore */ }",
    "        return () => { try { if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('keydown', onKey) } catch { /* ignore */ } }",
    "      }, [open, busy])"].join('\n')
  // 注：`clientSrc` 为磁盘原文（CRLF）⇒ 多行锚串须在 **LF 归一化**副本上匹配（口径同既有 LINE_SEG 面）
  const clientLf = clientSrc.replace(/\r\n/g, '\n')
  const wsEscH = clientLf.indexOf(wsEscBody)
  const wsEscUnique = wsEscH < 0 ? 0 : clientLf.split(wsEscBody).length - 1
  // 组件归属：赋值串前**最近**的组件函数须为 WorkspaceDialog（防空串误配）
  const wsEscOwner = wsEscH < 0 ? null : ['BindDialog', 'NvConsole', 'WorkspaceDialog'].filter((n) => {
    const i = clientLf.lastIndexOf('function ' + n + '(', wsEscH)
    return i >= 0 && i < wsEscH
  }).pop()
  const wsEscR = clientLf.indexOf('if (open !== true) return null', wsEscH)
  const wsEscOk = wsEscH >= 0 && wsEscUnique === 1 && wsEscOwner === 'WorkspaceDialog' && wsEscR > wsEscH
  // 正向对照（防空转）：把该 effect 从原处摘出、插到**本组件早退之后** ⇒ 早退索引 < effect 索引
  // ⇒ 原判据必红（构造实测：`mh=207 / mr=176`）。
  // 注意两处坑（首次实现实测踩到）：① 比较必须写 `!(mr > mh)`——写 `mr > mh === false` 因
  // `===` 优先级高于 `>` 而恒 false；② 「挪动」MUST 限定在 WorkspaceDialog 区段内——全局 replace
  // 会命中 BindDialog 的首个早退（索引比本 effect 小 88 KB）⇒ 构造失真、判据自证失效。
  const wsEscCounterTest = wsEscOk === true
    && (() => {
      const region = clientLf.slice(wsEscH, wsEscH + 3000)
      const movedRegion = region.replace(wsEscBody + '\n', '').replace('if (open !== true) return null', 'if (open !== true) return null\n' + wsEscBody)
      const mh = movedRegion.indexOf(wsEscBody)
      const mr = movedRegion.indexOf('if (open !== true) return null')
      return mh > 0 && !(mr > mh)
    })()
  return clientSrc.includes("return { role: 'dialog', 'aria-modal': 'true', 'aria-label': label }")
    && (clientSrc.match(/\.\.\.modalDialogProps\(/g) ?? []).length === 3      // 三处消费（无第四处、无遗漏）
    && (clientSrc.match(/useModalFocus\(/g) ?? []).length === 4              // 3 消费 + 1 定义
    && bindOk === true && cmodOk === true && wsOk === true
    && wsEscOk === true && wsEscCounterTest === true
    && clientSrc.includes('function modalFocusables(node)')
    && clientSrc.includes("window.addEventListener('focusin', focusTracker, true)")
    && clientSrc.includes("window.removeEventListener('focusin', focusTracker, true)") // apply 清理面
})(), 'clean007 f6 modal a11y missing')
check('客户端源码面：CLEAN-007 F3+F4+F9（closeCreate 关窗即复位 dirName ∧ sessionsById 收窄为绑定叶 ∧ launchMsgOf 死参零残留）', (() => {
  return clientSrc.includes("setCreating(false); setCreateNotice(''); setDirName('')") // F3
    && clientSrc.includes('closeCreate()')                                             // F3：Esc 分支同点复位
    && clientSrc.includes('const boundEntry = sessionsById')                            // F4：叶选择后直接取用
    && (clientSrc.match(/\(s\) => \(boundId !== null && s\.byId !== null/g) ?? []).length === 1 // F4 叶选择形态
    && !clientSrc.includes('? s.byId : {}')                                             // F4 负断言：不再返回整张 byId
    && !clientSrc.includes('forceNew')                                                  // F9 负断言：死参零残留
    && clientSrc.includes('function launchMsgOf(novels, id, title, launchOpts)')
})(), 'clean007 f3/f4/f9 missing')
check('客户端源码面：CLEAN-007 F2 创建链单点收口（launcher.createSessionFor 单一实现 + 两消费点共用；两处内联副本已删）', (() => {
  const defs = (clientSrc.match(/async createSessionFor\(novel, opts\)/g) ?? []).length
  const calls = (clientSrc.match(/launcher\.createSessionFor\(/g) ?? []).length
  const createArgs = (clientSrc.match(/let createArg = /g) ?? []).length // 收口前为 2 份内联构造
  return defs === 1 && calls === 2 && createArgs === 1
    && clientSrc.includes('const r = await launcher.createSessionFor(novel, { t: ctx.t, rootBasis: ctx.wsRoot })')
    && clientSrc.includes('requirePreset: true')   // 第二消费点的缺面口径（sessionsMissing）参数化
    && clientSrc.includes("!launcher.apiHas('sessions', 'create') || (needPreset === true && !launcher.apiHas('agentPresets', 'select'))")
})(), 'clean007 f2 create chain not consolidated')
check('客户端源码面：UX-059 工作流控制条（UX-064 S2：控制条从 44px icon rail 迁入 196 左栏底部，语义/三态/忙碌防连点不变）', (() => {
  return clientSrc.includes("className: 'nv-rb-ico nv-rb-wf-play'")
    && clientSrc.includes("'data-mode': props.wfRunning === true ? 'stop' : 'go'")
    && clientSrc.includes("title: props.mainLabel")
    && clientSrc.includes("t('startWorkflow')") && clientSrc.includes("t('continueWorkflow')")
    && clientSrc.includes("t('stopWorkflow')")
    && clientSrc.includes('bindFirstHint') && clientSrc.includes('setWfBusy')
    && clientSrc.includes('launcher.promptLaunch(sid, current, novels, opt)')
    && clientSrc.includes('.nv-bar-note')                       // 三态提示条（ok/err/info）保留
    && clientSrc.includes('onWfLaunch: () => launchWorkflow(null, true)')
    && clientSrc.includes('onCompact: compactWf') && clientSrc.includes('onBindNew: bindNewSessionCtl')
    && !clientSrc.includes("className: 'nv-bar-launch'")        // 标题栏启动钮已删除（迁移负断言）
})(), 'ux059 wf ctl missing')
check('客户端源码面：UX-059/S2 底部案卷与左栏工作流控制（真实功能保留：go/stop · 压缩 · 绑定 · 三态文案）', (() => {
  return clientSrc.includes("className: 'nv-railbar'")                 // 左栏容器
    && clientSrc.includes("className: 'nv-rb-row'")                    // 真实章节目录行
    && clientSrc.includes("className: 'nv-rb-wf'")                     // 从属工作流控制区
    && clientSrc.includes("className: 'nv-bottom'")                    // 按需下半案卷
    && clientSrc.includes("className: 'nv-status-tab'")                // 状态栏轻入口
    && clientSrc.includes("className: 'nv-rb-ico nv-rb-wf-play'")
    && clientSrc.includes("'data-mode': props.wfRunning === true ? 'stop' : 'go'")  // 形态切换
    && !clientSrc.includes("role: 'toolbar'")                          // 旧 44px icon rail 工具栏已退役（S2 左栏）
    && clientSrc.includes("aria-label': t('studioChapterDir')")         // 左栏可读名称
    && clientSrc.includes("title: props.mainLabel")                    // 图标按钮有可读名称
    && clientSrc.includes("'aria-label': t('compactWorkflow')") && clientSrc.includes("'aria-label': t('bindNewSession')")
    && clientSrc.includes('sessions.cancel') && clientSrc.includes("apiHas('sessions', 'cancel')")  // 停止（队列保留）
    && clientSrc.includes("text: '/compact'") && clientSrc.includes('compactBusyHint') && clientSrc.includes('compactSent')  // 压缩上下文
    && clientSrc.includes("t('bindNewSession')") && clientSrc.includes('bindNewDone') && clientSrc.includes('bindNewSessionCtl')  // 绑定新会话（链唯一函数名，不自动打开）
    && clientSrc.includes("api.agentPresets.select({ sessionId, agentPreset: 'novel-writing' })")  // 绑定链：create → 预设 → 绑定
    && !clientSrc.includes("className: 'nv-bar-launch'")              // 标题栏启动钮整块删除（迁移）
    && !clientSrc.includes('.nv-bar-launch')                          // 样式/选择器残留负断言
    // i18n 11 键 zh/en 成对
    && clientSrc.includes("stopWorkflow: '⏹ 停止工作流'") && clientSrc.includes("stopWorkflow: '⏹ Stop workflow'")
    && clientSrc.includes("compactWorkflow: '压缩上下文'") && clientSrc.includes("compactWorkflow: 'Compact context'")
    && clientSrc.includes("bindNewSession: '绑定新会话'") && clientSrc.includes("bindNewSession: 'Bind new session'")
    && clientSrc.includes("wfRunning: '运行中…'") && clientSrc.includes("wfRunning: 'Running…'")
    && clientSrc.includes("wfIdle: '空闲'") && clientSrc.includes("wfIdle: 'Idle'")
    && clientSrc.includes("compactBusyHint: '请先停止当前工作流，再压缩上下文'") && clientSrc.includes("compactBusyHint: 'Stop the running workflow before compacting'")
    && clientSrc.includes("cancelSentPrefix: '已发送停止指令：'") && clientSrc.includes("cancelSentPrefix: 'Stop instruction sent: '")
    && clientSrc.includes("compactSent: '已发送压缩上下文请求'") && clientSrc.includes("compactSent: 'Compaction requested'")
    && clientSrc.includes("cancelFailPrefix: '停止工作流失败：'") && clientSrc.includes("cancelFailPrefix: 'Stop workflow failed: '")
    && clientSrc.includes("compactFailPrefix: '压缩上下文失败：'") && clientSrc.includes("compactFailPrefix: 'Compaction failed: '")
    && clientSrc.includes("bindNewDone: (id) => `已为本书绑定新会话 ${id}，点「继续工作流」即可续跑`")
    && clientSrc.includes("bindNewDone: (id) => `A new session ${id} is bound to this novel — press \"Continue workflow\" to resume`")
})(), 'ux059 wf control bar missing')
// UX-013（用户批注 6 点）：
//  ①工作区对话框去会话创建（createSessionBtn/done 态/sync 键随链退役；switchHint + 信息性 hasSessionsHint 在位）
//  ②首次点卡片自动建会话并关联（openBookCreate 链：workspace.list 命中 root→workspaceId / cwd 回退 → create →
//    预设挂载 → bindSession → open+ensureSplit；自动链无 prompt——启动归创作台工作流控制条）
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
    && clientSrc.includes("launcher.promptLaunch(sid, current, novels, opt)") // promptLaunch 保留（创作台工作流控制条 ▶）
    && clientSrc.includes("t('autoBindDone'")
})(), 'ux013 card buttons missing')
check('客户端源码面：UX-013 首次开卡自动链（workspaceId/cwd → create → 预设 → bind → open；无 prompt）', (() => {
  // UX-014⑦：链收口为 openCtl.autoCreate 单一事实源（控制台卡片与抽屉卡片共用）
  // CLEAN-007 F2：创建链 a/b/c 进一步收口到 launcher.createSessionFor（openCtl.autoCreate 与
  // 创作台「绑定新会话」共用同一实现）⇒ 本断言改指向**共享实现**的落点字面量（原断言指向已删除的
  // autoCreate 内联副本，属「断言随实现迁移」而非放宽：新增 createSessionFor 存在性 + 打开链保留）。
  return clientSrc.includes('openCtl')
    && clientSrc.includes('autoCreate(novel, ctx)')
    && clientSrc.includes("if (st === 'none') { await openCtl.autoCreate(novel, ctx); return }")
    && clientSrc.includes('async createSessionFor(novel, opts)')          // CLEAN-007 F2 单一事实源
    && clientSrc.includes('hit.workspaceId') && clientSrc.includes('joinNovelRoot(rootBasis, novel.id)')
    && clientSrc.includes("agentPresets.select({ sessionId, agentPreset: 'novel-writing' })")
    && clientSrc.includes('launcher.bindSession(novel.id, sessionId)')
    && clientSrc.includes('launcher.open(r.sessionId)')
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
    && title.includes('font-size:var(--nv-fs-card)') && title.includes('font-weight:600') && title.includes('letter-spacing:.06em')
    && ico.includes('font-size:16px')
    && card.includes('padding:6px 8px') && card.includes('border-radius:10px') && card.includes('margin:4px 0')
    && ct.includes('TYPO.smallTitle') && ct.includes('font-weight:600')    // UX-055⑥：抽屉卡标题 13→13.5px/600（小一档保层级）
    && cs.includes('font-size:var(--nv-fs-base)')
    && dot.includes('width:9px') && dot.includes('height:9px')      // 基型 9px（标题栏状态点）
    && cardDot.includes('width:8px') && cardDot.includes('height:8px') // 抽屉卡小一档 8px
    && sep.includes('--nv-border-strong')
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
    // UX-064 S2：文件树折入左栏「资料」段，仍复用同一 LeftNav（真实 detail.files 过滤）
    && clientSrc.includes('el(LeftNav, {')
    && clientSrc.includes('detail: { ...novel, files: matFiles }')
    && clientSrc.includes('key: props.selectedId, t,')
})(), 'ux014 left pane missing')
check('客户端源码面：UX-014④⑤ 让位观察器容差比较 + 重锚定重挂（CSSOM ≤6 位有效数字归一化自伤修复；S2 R2 起观察器宿主面收口在 DrawerHostAdapter）', (() => {
  const disconnects = (clientSrc.match(/DrawerHost\.yieldObserver\.disconnect\(\)/g) ?? []).length
  return clientSrc.includes('function sameMargin') && clientSrc.includes('Math.abs(pa - pb) < 0.5')
    && clientSrc.includes('sameMargin(DrawerHost.viewArea.style.marginLeft, DrawerHost.lastMarginLeft)')
    && clientSrc.includes('sameMargin(DrawerHost.viewArea.style.marginRight, DrawerHost.lastMarginRight)')
    && disconnects >= 2 && clientSrc.includes("DrawerHost.yieldObserver.observe(viewArea, { attributes: true, attributeFilter: ['style'] })")
})(), 'ux014 yield fix missing')
check('客户端源码面：UX-014⑨ / S2 R2 DrawerHostAdapter 不写 marginTop（对话窗保持整高；仅 marginLeft+width 挤到右缘，top/height 由真实 bar/status rect 决定）', (() => {
  return clientSrc.includes("viewArea.style.marginLeft = contentW + 'px'")
    && clientSrc.includes("viewArea.style.marginRight = ''")
    && clientSrc.includes("viewArea.style.height = height + 'px'")
    && !clientSrc.includes('viewArea.style.marginTop = this.lastMarginTop')
    && !clientSrc.includes('lastMarginTop')
})(), 'ux014 marginTop fix missing')
check('客户端源码面：UX-014⑥ 标题栏 ⇄/✕ 28×28 醒目钮（.nv-bar-ctl 与管理台 ✕ 同型；UX-015① 放大 32×32/18px/600）', (() => {
  const css = (cls) => {
    const m = new RegExp(cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}').exec(clientSrc)
    return m !== null ? m[1] : ''
  }
  const ctl = css('.nv-bar-ctl')
  const count = (clientSrc.match(/barButton\('nv-bar-/g) ?? []).length
  return ctl.includes('width:32px') && ctl.includes('height:32px') && ctl.includes('border:1px solid transparent')
    && ctl.includes('border-radius:4px') && ctl.includes('color:var(--nv-ink-2)')
    // UX-064 S2 R2：右簇 = 主题 palette + 沉浸（条件）+ 带文字抽屉 + 专注 + 关闭；barButton 图标钮 3 个 + 唯一带文字抽屉入口
    && count === 3 && clientSrc.includes("className: 'nv-bar-ctl nv-bar-drawer'")
    && clientSrc.includes("el(ThemePicker, { t, variant: 'split'")
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
//    .nv-bar .nv-mini 24px / .nv-bar-ctl 32×32·18px·600 / TITLE_BAR_H=38 / ▶ 工作流控制条主钮 padding 5px 14px）
//  ②章节列表行显示章节名（中窗左列；UX-019 定案 = 仅「第N章 · 名称」/空名称「第N章」，无字数）
//  ③章节列 160px + 直排滚动（.nv-chlist overflow:auto）；UX-020（用户实机反馈修正
//    UX-019③）恢复 UX-015③ 拖宽条：.nv-chdiv pointer 拖拽 120–360px + chapterW 持久化
//  ④抽屉小一档（.nv-card 13/12px、6·8px padding、4px 间隙、点 8px、空态随动；控制台卡片不动）
//  ⑤聊天区正常 = UX-014⑨ 回归（marginTop 不写断言在位）
check('客户端源码面：UX-015①/S2 标题栏几何（56px 高 / 衬线 16px 书名 / 阶段 chip / 保存态 / 尺寸单一事实源 = CSS 变量）', (() => {
  const css = (cls) => {
    const m = new RegExp(cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}').exec(clientSrc)
    return m !== null ? m[1] : ''
  }
  const split = css('.nv-split')
  const bar = css('.nv-bar')
  const bt = css('.nv-bar-title')
  const chip = css('.nv-bar-chip')
  const save = css('.nv-bar-save')
  const ctl = css('.nv-bar-ctl')
  const sheet = css('.nv-sheet')
  return split.includes('--nv-bar-h:56px') && split.includes('--nv-status-h:40px')
    && split.includes('--nv-rail-w:196px') && split.includes('--nv-rail-collapsed-w:48px')
    && split.includes('--nv-sheet-max:680px') && split.includes('--nv-focus-w:680px')
    && split.includes('--nv-drawer-w:420px') && split.includes('container-type:inline-size')
    && bar.includes('height:var(--nv-bar-h)') && bar.includes('padding:0 14px 0 12px')
    && bt.includes('font-family:var(--nv-serif)') && bt.includes('font-weight:600') && bt.includes('letter-spacing:.02em')
    && chip.includes('border-radius:3px') && save.includes('font-variant-numeric:tabular-nums')
    && ctl.includes('width:32px') && ctl.includes('height:32px')
    && sheet.includes('width:max(var(--nv-sheet-min),min(100%,var(--nv-sheet-max)))')
    && clientSrc.includes('.nv-split[data-focus=true] .nv-sheet{width:var(--nv-focus-w)')
    && !clientSrc.includes('const TITLE_BAR_H') && !clientSrc.includes('const STATUS_BAR_H')
    && !clientSrc.includes('.nv-sheet{width:588px')
})(), 'ux015 bar missing')
check('客户端源码面：UX-019② 章节行仅「第N章 + 名称」（去字数+去装饰圆点〔UX-021〕；有名称「第N章 名称」/空名称回退「第N章」；ellipsis 沿用；UX-053：✓/⚠ 标记图标化〔check/triangle-alert〕）', (() => {
  return clientSrc.includes("const name = typeof c.name === 'string' ? c.name : ''")
    && clientSrc.includes('`第${c.num}章`')           // 无名称回退格式（第N章；标记经图标化）
    && clientSrc.includes("className: 'nv-rb-num'")     // 左栏目录：章号
    && clientSrc.includes("className: 'nv-rb-name'")    // 左栏目录：名称（CSS ellipsis）
    && clientSrc.includes('className: \'nv-rb-mark\'') && clientSrc.includes("'data-kind': 'ok'") && clientSrc.includes("'data-kind': 'warn'")   // ✓/⚠ 图标标记
    && !clientSrc.includes('${c.words}')                // 章节行无任何字数渲染（去字数）
    && !clientSrc.includes('`· ${c.words}${marks}`')
    && !clientSrc.includes('`第${c.num}章 ${c.words}${marks}`')
    && clientSrc.includes('text-overflow:ellipsis')
    && clientSrc.includes("className: 'nv-rb-row'")
    && clientSrc.includes('className: \'nv-rb-row\'')
    && !clientSrc.includes("key: 'sep'")
})(), 'ux019 chapter name row missing')
check('客户端源码面：S2 R2 删除面（旧分栏几何符号零残留；白名单 = v1→v2 一次性迁移函数 + 迁移键声明）', (() => {
  // 删除面 grep gate：旧像素布局的常量/状态/setter/拖拽处理器/CSS 选择器/i18n 键全部不得残留。
  // 白名单仅两处：migrateStudioV1() 内对 LEGACY_SPLIT_KEY 的读取、LEGACY_SPLIT_KEY 常量声明
  // （迁移源；迁移后永不再读写）。
  const banned = [
    'const LEFT_MIN =', 'const LEFT_MAX =', 'const LEFT_DEFAULT =', 'const CHAT_MIN =',
    'const CENTER_MIN =', 'CHAT_DEFAULT_RATIO', 'DRAWER_HANDLE_MIN_COLW', 'DRAWER_TEXT_MAX',
    'DRAWER_RAIL_W', 'DRAWER_GUTTER', 'DRAWER_EDGE_W', 'DRAWER_HINT_H', 'const TITLE_BAR_H',
    'const STATUS_BAR_H', 'resolveChapterW', 'drawerTextW', 'setLeftW(', 'setChatW(',
    'setChatSide(', 'setChapterW(', 'setMidH(', 'setLeftCollapsed(', 'saveAsDefaults(',
    'resetSplit(', 'leftDividerHandler', 'midDividerHandler', 'chatDividerHandler',
    'nv-chlist', 'nv-chdiv', 'nv-chatdiv', 'nv-vdiv', 'nv-left{', 'nv-middiv', 'nv-drawer-hint',
    'nv-drawer-edge', 'this.leftW', 'this.chatW', 'this.chapterW', 'this.midH', 'this.chatSide',
  ]
  const found = banned.filter((sym) => clientSrc.includes(sym))
  const legacyReads = (clientSrc.match(/LEGACY_SPLIT_KEY/g) ?? []).length
  const studioKeys = (clientSrc.match(/dsh\.novel\.studio\.v2/g) ?? []).length
  return found.length === 0 && legacyReads === 2 && studioKeys >= 1
})(), 's2r2 deletion gate failed')
check('客户端源码面：S2 R2 边界线体系（一条边界一条线：rail 右缘 / 稿纸自身边框 / 外框全边线；旧三拖线选择器已删）', (() => {
  return clientSrc.includes('.nv-railbar{flex:none;width:var(--nv-rail-w);')
    && clientSrc.includes('border-right:1px solid var(--nv-rule)')
    && clientSrc.includes('.nv-split{position:fixed;')
    && clientSrc.includes('border:1px solid var(--nv-border-strong,#3a4150)')
    && clientSrc.includes('.nv-sheet{width:max(var(--nv-sheet-min),min(100%,var(--nv-sheet-max)))')
    && clientSrc.includes('border:1px solid var(--nv-rule);border-radius:2px')
    && !clientSrc.includes('nv-vdiv') && !clientSrc.includes('nv-chdiv') && !clientSrc.includes('nv-chatdiv')
})(), 's2r2 boundary lines missing')
check('客户端源码面：UX-034 文件显示复用章节内容列（fileSel 提升到 SplitWorkspace 受控：左窗树仅选择、内容列 fileSel!==null 渲染 FilePreview〔复用章节 nv-scroll 阅读区——无 maxHeight 截断/无左窗内嵌小卡〕；切书复位 fileSel）', (() => {
  return clientSrc.includes("const [fileSel, setFileSel] = useState(null)")
    && clientSrc.includes('setFileSel(null)')        // 切书复位（S2 同时复位章选择/案卷/专注）
    && !clientSrc.includes('fileSel !== null ? el(FilePreview, { novelId: selectedId, path: fileSel, onClose: () => setFileSel(null) }) : null')   // 左窗旧内嵌已除
    && clientSrc.includes("props.fileSel !== null") && clientSrc.includes("el(FilePreview, { novelId: props.novelId, path: props.fileSel")   // 内容列复用渲染
    && !clientSrc.includes("maxHeight: '300px'")                                        // 文件内容不再 300px 截断（整列滚动复用）
    && !clientSrc.includes("borderTop: '1px solid ' + TK.line, marginTop: '8px'")       // 无左窗嵌卡样式残留
    && clientSrc.includes('fileSel, onFileSel: setFileSel')                             // 左窗受控选择
    && clientSrc.includes('fileSel, onFileClose: () => setFileSel(null)')
    && (clientSrc.match(/if \(props\.fileSel !== null && typeof props\.onFileClose === 'function'\) props\.onFileClose\(\)/g) ?? []).length === 3   // UX-035 点章节/点编辑退出文件视图 + S2 R2 章节意图跳转
})(), 'ux034 file view reuses chapter column')
check('客户端源码面：UX-036/S2 工作流与数据面板（按需下半案卷；WorkflowPanel/DataPanel/PublishPanel/RequestPanel 真实数据；状态栏轻入口）', (() => {
  return clientSrc.includes("['workflow', t('studioWorkflow')], ['data', t('studioData')], ['publish', t('studioPublish')], ['requests', t('studioRequests')]")
    && !clientSrc.includes("'chapters', t('chapters')]")                                  // 章节不再页签（章节目录在左栏）
    && clientSrc.includes("className: 'nv-bottom'")                                      // 按需案卷
    && clientSrc.includes("className: 'nv-status-tab'")                                  // 状态栏轻入口
    && clientSrc.includes('panelOpen === true')
    && !clientSrc.includes('detail !== null ? midFooter : null')
    && clientSrc.includes("el(WorkflowPanel, { t, novel: detail })")
    && (clientSrc.match(/el\(WorkflowPanel, \{ t, novel: detail \}\)/g) ?? []).length === 1
    && clientSrc.includes("el(DataPanel, { t, novelId: selectedId, detail })")
    && clientSrc.includes("el(PublishPanel, {")
    && clientSrc.includes("el(RequestPanel, {")
    // UX-041：标题栏居中统计横幅（真实数据；碰撞保护保留）
    && clientSrc.includes("className: 'nv-bar-banner'")
    && clientSrc.includes("const titleStageName = (NOVEL_STAGES.find(([id]) => id === curStage) ?? [])[1] ?? curStage")
    && clientSrc.includes("detail.state?.statistics?.total_words ?? 0} ${t('words')}")
})(), 'ux036 workflow state in left column')
check('客户端源码面：UX-022 拖动条（滚动条）默认隐藏 + 滚动隔离（-webkit-scrollbar track/thumb 透明；UX-024 滚动中显示/停止 1.5s 自动隐藏——.nv-scl 滚动事件驱动、无悬停常驻；.nv-scroll 带 overscroll-behavior:contain；S2 稿纸/左栏目录/资料树/下半案卷/文件预览 = 独立 nv-scroll 容器）', (() => {
  return clientSrc.includes('.nv-scroll::-webkit-scrollbar{width:8px;background:transparent}')
    && clientSrc.includes('.nv-scroll::-webkit-scrollbar-thumb{background:transparent}')
    && clientSrc.includes('.nv-scl::-webkit-scrollbar-thumb{background:var(--nv-border-strong,#3a4150)}')
    && clientSrc.includes('.nv-scl::-webkit-scrollbar-thumb:active{background:var(--nv-accent,#4f8ef7)}')
    && !clientSrc.includes('::-webkit-scrollbar-thumb:hover')
    && !clientSrc.includes('.nv-scroll:hover::-webkit-scrollbar-thumb')
    && !clientSrc.includes('.nv-chlist')
    && clientSrc.includes("el.classList.add('nv-scl')") && clientSrc.includes("el.classList.remove('nv-scl')")
    && clientSrc.includes("document.addEventListener('scroll', onScroll, true)")
    && clientSrc.includes("document.removeEventListener('scroll', onScroll, true)")
    && clientSrc.includes("setTimeout(() => { el.classList.remove('nv-scl'); timers.delete(el) }, 1500)")
    && clientSrc.includes('for (const t of timers.values()) clearTimeout(t)')
    && clientSrc.includes('.nv-scroll{overscroll-behavior:contain}')
    && clientSrc.includes("className: 'nv-sheet-scroll nv-scroll nv-prose'")
    && clientSrc.includes("className: 'nv-sheet-scroll nv-scroll'")
    && clientSrc.includes("className: 'nv-rb-list nv-scroll'")
    && clientSrc.includes("className: 'nv-bottom-body nv-scroll'")
    && clientSrc.includes("className: 'nv-sheet-edit nv-scroll'")
    && clientSrc.includes("el.classList.contains('nv-scroll')")
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
    && ct.includes('TYPO.smallTitle') && cs.includes('font-size:var(--nv-fs-base)')   // UX-055⑥：抽屉卡标题 13→13.5px/600（管理台卡 17px 保层级；UX-061 1b-2 起字号走 --nv-fs-*）
    && cardDot.includes('width:8px') && cardDot.includes('height:8px')
    && empty.includes('padding:6px 8px')
    && !ccard.includes('min-height:180px') && ccard.includes('padding:16px') // 管理层卡片不动（层级感=抽屉小于控制台）
})(), 'ux015 drawer small missing')
// UX-016（用户实机「首次进入还是截断」；Coordinator 1078×593 复现取证）：
//  原钳制 hi = colW − 160 − 420，1078 窗口（colW=798）下 hi=218 → 聊天被压到 240 下限：
//  hero 折行 + 输入框裁切。修复 = 最小预留重分配——左 160→128、中 420→320、聊天 240→300；
//  无存档默认 = clamp(round(colW*0.45), 300, max(300, colW−128−320))（聊天优先 45%，
//  上限 colW−448 保证左 128+中 320 预留；colW<748 上下限收敛 300）；存档超界收敛同钳。
// UX-017（用户强刷后仍见窄聊天——旧包或 300 下 hero 输入行临界溢出未分辨；Coordinator 定案）：
//  宽度再让一档——CHAT_MIN 300→320、LEFT_MIN 128→120、CENTER_MIN 320→300（cap=colW−420）；
//  默认比例 0.45→0.50；存档收敛同按新上下限。常量新值正/负断言都在（旧值不得残留）。
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
//  UX-063 P0-a（连带迁移）：记录/恢复点由「open + syncAnchor 各一份」收敛为
//  **snapshotViewArea / restoreViewArea 单点**（规格 §1A 五路径同一还原函数）——本断言的
//  计数口径随实现收敛 2→1（旧双份内联即「同一事实源两处副本」；边界断言仍要求两串在仓）。
check('客户端源码面：UX-018 / S2 R2 宿主对话窗快照-恢复单点（DrawerHostAdapter 18 属性：快照读面 ≡ 恢复写面；width/margin 覆盖后按快照还原）', (() => {
  const i = clientSrc.indexOf('snapshotViewArea(viewArea) {')
  const j = clientSrc.indexOf('restoreViewArea() {', i)
  const k = clientSrc.indexOf('applyDrawer() {', j)
  const snapB = i >= 0 && j > i ? clientSrc.slice(i, j) : ''
  const restB = j >= 0 && k > j ? clientSrc.slice(j, k) : ''
  return snapB.includes('saved[prop] = viewArea.style[prop]')
    && restB.includes('viewArea.style.width = this.saved.width')
    && restB.includes('viewArea.style.marginLeft = this.saved.marginLeft')
    && restB.includes('viewArea.style.marginTop = this.saved.marginTop')
    && clientSrc.includes('const VIEW_AREA_PROPS =')
})(), 'ux018 snapshot/restore single point missing')
check('客户端源码面：UX-018 / S2 R2 applyDrawer 写 width = CSS 抽屉宽（marginLeft+width 双压；不写 marginTop）', (() => {
  const writes = (clientSrc.match(/viewArea\.style\.width = drawerW \+ 'px'/g) ?? []).length
  return writes === 1
    && clientSrc.includes("viewArea.style.marginLeft = contentW + 'px'")
    && clientSrc.includes("viewArea.style.marginRight = ''")
    && !clientSrc.includes('viewArea.style.marginTop = this.lastMarginTop')
})(), 'ux018 drawer width write missing')
check('客户端源码面：UX-018 / S2 R2 边界（无根/几何缺失不写；快照原值覆盖后关闭恢复）', (() => {
  return clientSrc.includes('if (viewArea === null || g === null) return')
    && clientSrc.includes('if (viewArea === null || this.saved === null) return')
    && clientSrc.includes('viewArea.style.width = this.saved.width')
    && clientSrc.includes('viewArea.style.marginLeft = this.saved.marginLeft')
})(), 'ux018 boundary missing')
// UX-018 探针驱动的引擎健壮性修正：会话切换（卡片打开链 sessions.open）后目标视图以
//  phase='hero' 稳定挂载、宿主重渲染可能替换 viewArea 子节点——原「仅接受 active + 根同
//  即快路径」把引擎永久卡在旧锚点（live viewArea 永不接受挤压）。修正 = 与 open() 同口径
//  有根即锚 + 快路径以 header/viewArea 三元同恒为门槛（子节点被替换走完整重锚定）。
check('客户端源码面：UX-018 syncAnchor 重锚定修正（hero 相位接受 + 根同但子节点替换走完整重锚）', (() => {
  return clientSrc.includes("phase='hero'")
    && clientSrc.includes('next === DrawerHost.root && header === DrawerHost.header && viewArea === DrawerHost.viewArea')
    && !clientSrc.includes("next.dataset.phase !== 'active'")
})(), 'ux018 syncAnchor re-anchor missing')
// UX-063 P0-a 第①步（规格 docs/design/UX-063-redesign-spec.md §1A；断言迁移表 #11/#13/#14/F7/F8）：
//  ①全屏工作台：.nv-split 左缘 = 宿主会话区左缘、宽 = colW（原挤法只覆盖 contentW 内容列）；
//  ②对话抽屉：默认收起；420 抽屉（z 920：.nv-split 900 < 920 < .nv-console 950）；
//     localStorage 记开关；**UX-064 S2 起唯一入口 = 顶栏抽屉按钮**（原右缘 48px 悬浮把手已按用户
//     2026-11-08 截图删除——与稿纸右缘控件争夺命中区）；
//     改由「抽屉态 Esc 先关抽屉」+ 提示行告知——REVIEW-UX-063-P0A-DR1 P1-1）；
//  ③让位：抽屉开 → 文件树/章节列收起 + 正文列 maxWidth = min(544, colW−44−376−24)；真实左偏移 11
//     （.nv-split border 1 + 上部区 padding 10；rail 44 属底部工作台，不在本区）；
//  ④恢复保证（五路径逐条具名）：open / syncAnchor / closeDrawer / close / setBook→closeDrawer；
//     快照 18 读面、恢复 18 写面、applyDrawer chrome 10 写面 = 三处**独立**集合（CR1 P2）；
//  ⑤降级：drawerOpen && colW < 1046 提示（含 Esc 出口）；colW<740 提示「建议全屏」。
// 口径说明：`.nv-home` 880 / CTA 36 属第②步；字体字阶属第③步——本步不实现、不声称。
// —— 断言判别力纪律（CR1 P2「变异后仍全绿」处置）：路径判据一律**先切函数体再断言**，
//    禁止用全文件 includes 做路径判据（同名字符串会被邻近函数旁路）。
const fnBody = (header) => {
  const i = clientSrc.indexOf(header)
  if (i < 0) return ''
  let depth = 0
  let started = false
  for (let k = i; k < clientSrc.length; k += 1) {
    const c = clientSrc[k]
    if (c === '{') { depth += 1; started = true } else if (c === '}') {
      depth -= 1
      if (started && depth === 0) return clientSrc.slice(i, k + 1)
    }
  }
  return ''
}
check('客户端源码面：S2 R2 写作台外壳（.nv-split 全宽 z900）+ StudioLayout/dsh.novel.studio.v2 持久化 + v1 一次性迁移 + 唯一抽屉入口文案', (() => {
  return clientSrc.includes("const STUDIO_PERSIST_KEY = 'dsh.novel.studio.v2'")
    && clientSrc.includes("const LEGACY_SPLIT_KEY = 'dsh.novel.split.v1'")
    && clientSrc.includes('function migrateStudioV1()')
    && clientSrc.includes('railCollapsed: false, drawerOpen: false, panelOpen: false')
    && clientSrc.includes('this.drawerOpen = saved.drawerOpen === true')
    && clientSrc.includes('localStorage.setItem(STUDIO_PERSIST_KEY')
    && clientSrc.includes("left: g.left + 'px', top: g.top + 'px', width: colW + 'px'")
    && !clientSrc.includes("width: contentW + 'px'")
    && clientSrc.includes("chatDrawer: '对话'") && clientSrc.includes("chatDrawer: 'Conversation'")
    && clientSrc.includes("chatDrawerClose: '收起对话'") && clientSrc.includes("chatDrawerClose: 'Hide conversation'")
})(), 's2r2 studio shell missing')
check('S2 R2 P1-1 专注 × 抽屉不变量（StudioLayout.setFocus 先关抽屉并还原宿主；setDrawer 在 focus 态显式拒绝；渲染层专注隐藏入口；Esc 分层先关抽屉）', (() => {
  const focusB = fnBody('setFocus(v) {')
  const drawerB = fnBody('setDrawer(open) {')
  const closeIdx = focusB.indexOf('this.drawerOpen = false')
  const setIdx = focusB.indexOf('this.focus = true')
  return focusB !== '' && drawerB !== ''
    && closeIdx >= 0 && setIdx > closeIdx                       // 先关抽屉，再置 focus
    && focusB.includes('DrawerHost.restoreViewArea()')
    && !focusB.includes('this.drawerOpen = true')               // 退出专注不自动开抽屉
    && drawerB.includes('if (next === true && this.focus === true) return false')
    && clientSrc.includes('.nv-split[data-focus=true] .nv-bar-drawer{display:none}')
    && clientSrc.includes('if (studioLayout.drawerOpen === true) { studioLayout.setDrawer(false); return }')
})(), 's2r2 focus/drawer invariant missing')
check('S2 R2 P1-2 章节意图链路（ChapterPanel 收到 focusChapter + onFocusHandled；消费 effect 选中并回调；意图 effect 随 active 翻转；挂载复位不覆盖 incoming 选章）', (() => {
  const cpFocus = clientSrc.slice(clientSrc.indexOf('function ChapterPanel(props) {'), clientSrc.indexOf('function ChapterPanel(props) {') + 6000)
  return cpFocus !== ''
    && clientSrc.includes('focusChapter, onFocusHandled: () => setFocusChapter(null)')
    && cpFocus.includes('if (typeof props.focusChapter !== \'number\') return undefined')
    && cpFocus.includes('setSelected(props.focusChapter)')
    && cpFocus.includes('props.onFocusHandled()')
    && cpFocus.includes('lastNovelRef.current === props.novelId')
    && clientSrc.includes('}, [intentKey, snap.active])')
    && clientSrc.includes('if (homeIntentSink !== null && homeIntentSink(full) === true) return')
})(), 's2r2 chapter intent chain missing')
check('S2 R2 布局单模型（StudioLayout 四布尔无像素状态 + DrawerHostAdapter 单点 + 无旧像素常量 + 容器查询主断点 + 弹性稿纸无横向溢出）', (() => {
  const layoutB = clientSrc.slice(clientSrc.indexOf('const studioLayout = {'), clientSrc.indexOf('studioLayout.init()'))
  return layoutB.includes('railCollapsed: false,')
    && layoutB.includes('drawerOpen: false,')
    && layoutB.includes('focus: false,')
    && layoutB.includes('panelOpen: false,')
    && !/leftW|chatW|chapterW|midH|chatSide/.test(layoutB)
    && clientSrc.includes('const DrawerHost = {')
    && clientSrc.includes('container-type:inline-size')
    && clientSrc.includes('@container studio (max-width:1120px)')
    && clientSrc.includes('.nv-sheet{width:max(var(--nv-sheet-min),min(100%,var(--nv-sheet-max)))')
    && clientSrc.includes('.nv-sheet-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}')
    && clientSrc.includes("const STUDIO_PERSIST_KEY = 'dsh.novel.studio.v2'")
})(), 's2r2 single layout model missing')
check('UX-064 S2 R3 窄容器布局（≤760 rail 自动 48 + 顶栏 toggle 覆盖层；≤1279 抽屉全幅覆盖；稿纸下限 588/420；无 280 假挤压）', (() => {
  const sideMinJs = Number((/const DRAWER_SIDE_MIN = (\d+)/.exec(clientSrc) ?? [])[1])
  const sideMinCss = Number((/@container studio \(min-width:(\d+)px\)\{\.nv-split\[data-drawer=true\] \.nv-main/.exec(clientSrc) ?? [])[1])
  return sideMinJs === 1280 && sideMinCss === 1280
    && clientSrc.includes('@container studio (max-width:1279px){.nv-split[data-drawer=true] .nv-main{width:100%}}')
    && clientSrc.includes('.nv-railbar[data-peek=true]{position:absolute;left:0;top:0;bottom:0;z-index:2;width:var(--nv-rail-w)')
    && clientSrc.includes('const narrow = containerW > 0 && containerW <= 760')
    && clientSrc.includes('const railCollapsed = narrow === true')
    && clientSrc.includes("'data-drawer-mode': layout.drawerOpen === true ? drawerMode : undefined")
    && clientSrc.includes('--nv-sheet-min:420px')
    && clientSrc.includes("viewArea.style.marginLeft = '0px'")
    && clientSrc.includes("viewArea.style.width = containerW + 'px'")
    && !clientSrc.includes('max(280px')
})(), 's2r3 narrow container layout missing')
check('UX-064 S2 R4 布局变量零未消费（.nv-split 单一事实源块内声明的 --nv-* 布局变量每个至少 1 处真实消费；CSS var() 与 JS cssVarNum 双通道；死布局令牌〔如已清理的 rail 窄宽别名〕回归即红）', (() => {
  // 口径：只解析 `.nv-split{...}` 单一事实源块，不建全局 CSS 解析器；块内 `--nv-*:` 声明
  // 必须在该块之外至少被 1 处消费（`var(--x)` / `var(--x,fallback)` / `cssVarNum('--x')`）。
  // 允许清单只收「确实只能由外部 JS/样式持有、无法在本文件出现消费串」的变量；新增必须写理由。
  // 当前为空：`--nv-drawer-z` 等 JS-only 消费已由 `cssVarNum('--x')` 通道覆盖。
  const LAYOUT_VAR_ALLOWLIST = new Set()
  const blockMatch = /\.nv-split\{([^}]*)\}/.exec(clientSrc)
  if (blockMatch === null) return false
  const declared = [...blockMatch[1].matchAll(/--nv-[a-z0-9-]+(?=\s*:)/g)].map((m) => m[0])
  // 已知布局变量集（声明面基线；新增令牌须同批登记此处，防「悄悄定义」再次逃逸）
  const expected = ['--nv-bar-h', '--nv-status-h', '--nv-rail-w', '--nv-rail-collapsed-w',
    '--nv-sheet-min', '--nv-sheet-max', '--nv-focus-w', '--nv-drawer-w', '--nv-drawer-z', '--nv-sheet-gap']
  const outside = clientSrc.replace(blockMatch[0], '')
  const consumed = (v) => outside.includes('var(' + v + ')') || outside.includes('var(' + v + ',')
    || outside.includes("cssVarNum('" + v + "')") || outside.includes('cssVarNum("' + v + '")')
  const unregistered = declared.filter((v) => !expected.includes(v))
  const missing = expected.filter((v) => !declared.includes(v))
  const dead = declared.filter((v) => !consumed(v) && !LAYOUT_VAR_ALLOWLIST.has(v))
  return unregistered.length === 0 && missing.length === 0 && dead.length === 0
})(), 's2r4 layout variables dead/missing/unregistered')
check('UX-064 S3 panelHeight 纯模型与持久化（唯一新增像素状态；缺失/坏值/非有限/越界→null；运行期 clamp 180..min(父列 60%,520)；studio.v2 读回归一）', (() => {
  // 口径：只提取 S3 纯函数区段真跑（不依赖 DOM），再核持久化三处读/写归一。
  const start = clientSrc.indexOf('const PANEL_MIN_H = 180')
  const end = clientSrc.indexOf('function persistStudioState', start)
  if (start < 0 || end < 0) return false
  const pureSrc = clientSrc.slice(start, end)
  let api = null
  try {
    api = new Function('clampNum', pureSrc + '\nreturn { normalizePanelHeight, clampPanelHeight, defaultPanelHeight }')((v, lo, hi) => Math.min(Math.max(v, lo), hi))
  } catch { return false }
  const n = api.normalizePanelHeight
  const c = api.clampPanelHeight
  const d = api.defaultPanelHeight
  return n(null) === null && n(undefined) === null && n(Number.NaN) === null && n(Number.POSITIVE_INFINITY) === null
    && n('300') === null && n(179) === null && n(521) === null
    && n(180) === 180 && n(300.4) === 300 && n(520) === 520
    && c(600, 421) === 421 && c(100, 421) === 180 && c(300, 421) === 300 && c(300, 0) === 180
    && d(865) === 260 && d(702) === 211 && d(0) === 180
    && clientSrc.includes('panelHeight: normalizePanelHeight(state.panelHeight)')
    && clientSrc.includes('panelHeight: normalizePanelHeight(s.panelHeight)')
    && clientSrc.includes('this.panelHeight = normalizePanelHeight(saved.panelHeight)')
    && clientSrc.includes('panelHeight: this.panelHeight === null ? null : this.panelHeight')
    && clientSrc.includes('setPanelHeight(v, persist)')
    && !/midH|setMidH/.test(pureSrc)
})(), 'ux064 s3 panel height model/persistence missing')
check('UX-064 S3 面板分隔条 ARIA/键盘/指针/Esc（4px visible + role=separator + aria-valuemin/max/now + pointer capture + ArrowUp/Down/Home/End + 双击重置 + focus 隐藏 + Esc 只关面板不连带关台/抽屉）', (() => {
  const sepStart = clientSrc.indexOf("key: 'panel-sep'")
  const sepEnd = clientSrc.indexOf("key: 'panel'", sepStart)
  if (sepStart < 0 || sepEnd < 0) return false
  const sep = clientSrc.slice(sepStart, sepEnd)
  const escIdx = clientSrc.indexOf('// Esc 全局关闭（仅 active 时挂监听）')
  const escBlk = escIdx < 0 ? '' : clientSrc.slice(escIdx, escIdx + 2600)
  const drawerAt = escBlk.indexOf('studioLayout.setDrawer(false); return')
  const panelAt = escBlk.indexOf('studioLayout.setPanelOpen(false); return')
  return sep.includes("role: 'separator'") && sep.includes("'aria-orientation': 'horizontal'")
    && sep.includes("'aria-valuemin': PANEL_MIN_H") && sep.includes("'aria-valuemax': panelMax")
    && sep.includes("'aria-valuenow': panelNow") && sep.includes('tabIndex: 0')
    && clientSrc.includes('setPointerCapture(e.pointerId)') && clientSrc.includes('releasePointerCapture(e.pointerId)')
    && clientSrc.includes("if (e.key === 'ArrowUp')") && clientSrc.includes("if (e.key === 'ArrowDown')")
    && clientSrc.includes("if (e.key === 'Home')") && clientSrc.includes("if (e.key === 'End')")
    && clientSrc.includes('onDoubleClick: () => panelResize(null, true)')
    && clientSrc.includes('panelResize(next, false)') && clientSrc.includes('panelResize(next, true)')
    && clientSrc.includes('.nv-bottom{flex:0 0 clamp(180px,30%,60%)')
    && clientSrc.includes('.nv-panel-sep{flex:none;height:4px;') && clientSrc.includes('touch-action:none')
    && clientSrc.includes('.nv-panel-sep:hover::before,.nv-panel-sep:focus-visible::before')
    && clientSrc.includes('.nv-split[data-focus=true] .nv-panel-sep{display:none}')
    && escBlk !== '' && drawerAt >= 0 && panelAt > drawerAt
})(), 'ux064 s3 panel separator/aria/keyboard/esc missing')
check('UX-064 S3 页码只随真实可滚正文出现（内容不足一屏 ⇒ 隐藏 .nv-sheet-foot，不渲染假「1 / 1」；空章/加载/文件视图不显示）', (() => {
  const start = clientSrc.indexOf('UX-064 S2：稿纸真实页码')
  const end = clientSrc.indexOf('// ── UX-064 S2：稿纸（paper sheet）', start)
  const pageBlock = start < 0 || end <= start ? '' : clientSrc.slice(start, end)
  return pageBlock !== ''
    && pageBlock.includes('if (sh <= h + 1) {')
    && pageBlock.includes('setPaperPage(null)')
    && pageBlock.includes('const total = Math.max(2, Math.ceil(sh / h))')
    && pageBlock.includes('props.fileSel === null && mode === \'read\'')
    && /paperPage !== null\s*\?\s*el\('div', \{ className: 'nv-sheet-foot' \}/.test(clientSrc)
    && clientSrc.includes("t('studioPageOf', paperPage.cur, paperPage.total)")
    && !pageBlock.includes("'1 / 1'")
})(), 'ux064 s3 page count scroll-only guard missing')
check('客户端源码面：S2 R2 z 三值共存（.nv-split 900 < 抽屉 --nv-drawer-z 920 < .nv-console 950）+ 抽屉宽单一事实源 = CSS --nv-drawer-w', (() => {
  const zSplit = Number((/\.nv-split\{[^}]*z-index:(\d+)/.exec(clientSrc) ?? [])[1])
  const zConsole = Number((/\.nv-console\{[^}]*z-index:(\d+)/.exec(clientSrc) ?? [])[1])
  const zDrawerCss = Number((/--nv-drawer-z:(\d+)/.exec(clientSrc) ?? [])[1])
  const drawerW = Number((/--nv-drawer-w:(\d+)px/.exec(clientSrc) ?? [])[1])
  return zSplit === 900 && zConsole === 950 && zDrawerCss === 920 && zSplit < zDrawerCss && zDrawerCss < zConsole
    && drawerW === 420
    && clientSrc.includes("const zDrawer = cssVarNum('--nv-drawer-z')")
    && clientSrc.includes('viewArea.style.zIndex = String(zDrawer')
    && clientSrc.includes("const wantW = cssVarNum('--nv-drawer-w')")
    && clientSrc.includes('Math.round(wantW !== null ? wantW : colW)')
})(), 's2r2 drawer z/width single source missing')
check('UX-064 S2 交互单点：专注/抽屉各 1 个顶栏入口；无右缘 48px 悬浮把手；稿纸头无第二专注钮；无聊天拖线', (() => {
  return (clientSrc.match(/barButton\('nv-bar-focus'/g) ?? []).length === 1
    && (clientSrc.match(/className: 'nv-bar-ctl nv-bar-drawer'/g) ?? []).length === 1
    && clientSrc.includes("el('span', { className: 'nv-bar-ctl-label' }, t('chatDrawer'))")
    && clientSrc.includes("nvIcon('messageCircle', 14)")
    && !clientSrc.includes('nv-paper-focus')
    && !clientSrc.includes("className: 'nv-drawer-edge")
    && !clientSrc.includes("className: 'nv-chatdiv'")
})(), 'ux064 single interaction entry missing')
check('客户端源码面：S2 R2 Esc 分层（抽屉 > 专注 > 沉浸/更多 > 关工作台；先关抽屉再关台）', (() => {
  const i = clientSrc.indexOf('// Esc 全局关闭（仅 active 时挂监听）')
  const blk = i < 0 ? '' : clientSrc.slice(i, i + 2000)
  const a = blk.indexOf('studioLayout.setDrawer(false)')
  const b = blk.indexOf('closeWorkbench(t)')
  return blk !== '' && a >= 0 && b > a
    && blk.includes('if (studioLayout.drawerOpen === true) { studioLayout.setDrawer(false); return }')
    && blk.includes('narrow === true && narrowRailOpen === true')
})(), 'ux063 esc priority missing')

// ── UX-063 P0-a 第②步：任务流首页（规格 §1B；迁移表 #12/#13/#17+）──
check('控制台树：UX-063 P0-a② 默认入口 = 任务流首页（首轮只出整块加载态；空态/CTA/网格/搜索行一律不在首帧）', (() => {
  const dr = slotRegs.find((r) => r.id === 'novel-drawer')
  const con = slotRegs.find((r) => r.id === 'nv-console')
  if (dr === undefined || con === undefined) return false
  let headBtn = null
  const findHead = (n) => {
    if (n === null || n === undefined || typeof n !== 'object') return
    if (Array.isArray(n)) { for (const c of n) findHead(c); return }
    if (n.props !== undefined && n.props.className === 'nv-drawer-head') { headBtn = n; return }
    if (Array.isArray(n.children)) for (const c of n.children) findHead(c)
  }
  findHead(dr.render({ wide: true }))
  if (headBtn === null || typeof headBtn.props.onClick !== 'function') return false
  // 控制台开关是 toggle：先读当前渲染，未开则点一次（幂等，不依赖前序断言残留态）
  let root = con.render({})
  if (root === null || typeof root !== 'object') { headBtn.props.onClick(); root = con.render({}) }
  if (root === null || typeof root !== 'object') return false
  const clsCount = {}
  const walk = (n) => {
    if (n === null || n === undefined) return
    if (typeof n !== 'object') return
    if (Array.isArray(n)) { for (const c of n) walk(c); return }
    const cn = n.props !== undefined && typeof n.props.className === 'string' ? n.props.className : ''
    if (cn !== '') for (const part of cn.split(/\s+/)) if (part !== '') clsCount[part] = (clsCount[part] ?? 0) + 1
    if (Array.isArray(n.children)) for (const c of n.children) walk(c)
  }
  walk(root)
  // R2 口径（S1-fix-brief §4/§8）：首轮 poll.data=null = **加载中**，只渲染 `.nv-home-state`（role=status），
  // 不渲染「无书」假空态、不渲染任何 CTA、不渲染书架/网格/搜索行；顶栏恰一个（不出现双顶栏）。
  return (clsCount['nv-home'] ?? 0) === 1
    && (clsCount['nv-home-state'] ?? 0) === 1
    && (clsCount['nv-home-state-err'] ?? 0) === 0
    && (clsCount['nv-home-empty'] ?? 0) === 0
    && (clsCount['nv-home-hero'] ?? 0) === 0
    && (clsCount['nv-shelf-card'] ?? 0) === 0
    && (clsCount['nv-home-cta'] ?? 0) === 0
    && (clsCount['nv-cgrid'] ?? 0) === 0
    && (clsCount['nv-cfoot'] ?? 0) === 0
    && (clsCount['nv-topbar'] ?? 0) === 1
    && clientSrc.includes("props.initialView === 'books' ? 'books' : 'home'")
    && clientSrc.includes('const homeLoading = poll.data === null')
    && clientSrc.includes('const homeEmpty = poll.data !== null && novels.length === 0')
})(), 'ux063 home default entry mismatch')
check('客户端源码面：UX-064 书斋首页结构（五直接子节点 / 契约类名共存 / 每状态唯一主 CTA / 真实数据派生）', (() => {
  const i = clientSrc.indexOf('const homeBody = () => {')
  const j = i < 0 ? -1 : clientSrc.indexOf('const g = geom !== null', i)
  const blk = i < 0 || j < 0 ? '' : clientSrc.slice(i, j)
  if (blk === '') return false
  // P0-1：`.nv-home` 子节点必须 rest 参数 + 展开（写成 (children) 只转发第一个 ⇒ 网格塌成一行）
  const shellOk = blk.includes("const shell = (...children) => el('div', { className: 'nv-home' }, ...children)")
  const shellBad = blk.includes("const shell = (children) =>")
  // 平铺契约：五个直接子节点在 10 空格缩进上（子节点内层缩进更深，故此判代入缩进层即区分直接子/孙）
  const direct = /\n {10}el\('(?:section|aside|hr|footer)', \{ className: '(?:nv-home-hero nv-hero|nv-quote nv-quote-card|nv-home-rule|nv-home-shelf nv-shelf|nv-home-deskline)'/g
  const directCount = (blk.match(direct) ?? []).length
  return shellOk && !shellBad && directCount === 5
    // 契约类名共存（S1-review P0-2）：新名 + 旧名同时在，旧 CSS 不能靠改名规避
    && blk.includes("className: 'nv-home-hero nv-hero empty-hero nv-empty-hero'")
    // §11.5 空态角色/顺序（h1 不是 eyebrow）：空态 hero 内 eyebrow → homeEmptyTitle → h1 → homeEmptyLead
    && (() => {
      const e0 = blk.indexOf("empty-hero nv-empty-hero'")
      if (e0 < 0) return false
      const e1 = blk.indexOf("className: 'nv-quote nv-quote-card nv-empty-quote'", e0)
      const seg = e1 > e0 ? blk.slice(e0, e1) : ''
      const p = ["className: 'nv-eyebrow'", "t('homeEmptyTitle')", "className: 'nv-hero-title'", "t('homeEmptyLead')"].map((s) => seg.indexOf(s))
      return p.every((v) => v >= 0) && p[0] < p[1] && p[1] < p[2] && p[2] < p[3]
    })()
    && blk.includes("className: 'nv-quote nv-quote-card'") && blk.includes("className: 'nv-quote nv-quote-card nv-empty-quote'")   // 空态三步卡必须有纸卡边框（缺 nv-quote-card ⇒ 视觉不存在）
    && blk.includes("className: 'nv-home-shelf nv-shelf'") && blk.includes("className: 'nv-home-deskline'")
    && blk.includes("className: 'nv-shelf-card nv-book-card'")
    // §9 三态顺序（R3 A）：error 分支必须先于 loading 分支——`homeLoading = poll.data === null`，
    //   usePoll 失败同时 setData(null)+setError ⇒ 顺序反了错误态永不可达（界面永远「正在读取书目…」）
    && (() => {
      const ie = blk.indexOf('if (poll.error !== null)')
      const il = blk.indexOf('if (homeLoading === true)')
      return ie >= 0 && il >= 0 && ie < il
    })()
    // 英雄区：eyebrow/tick + 书名 + 元信息 + 阶段点 + 动作区（唯一主 CTA + quiet 次级入口）
    && blk.includes("className: 'nv-hero-left'")
    && blk.includes("className: 'nv-eyebrow'") && blk.includes("className: 'nv-tick'")
    && blk.includes("className: 'nv-hero-title'") && blk.includes("className: 'nv-hero-meta'")
    && blk.includes("className: 'nv-stage'") && blk.includes("className: 'nv-stage-dot'")
    && blk.includes("className: 'nv-hero-actions'") && blk.includes("className: 'nv-hero-quiet'")
    && (blk.match(/className: 'nv-home-cta nv-btn-lg'/g) ?? []).length === 2            // 空态 + 有书态各一（每状态唯一）
    && blk.includes("className: 'nv-home-cta-text'") && blk.includes("nvIcon('penLine', 15)")
    && blk.includes("nvIcon('arrowRight', 14)")
    && !blk.includes("workflow: 'new'")                                                  // 首页不再有第二个工作流按钮
    // 引文卡四态：loading / ok / empty / fail（+ 重试）；正文 = 一段 dim + <br> + 末段（mock 口径）
    && blk.includes("quoteState === 'ok'") && blk.includes("quoteState === 'loading'")
    && blk.includes("quoteState === 'fail'") && blk.includes("t('homeQuoteEmpty')")
    && blk.includes("className: 'nv-quote-dim'") && blk.includes("className: 'nv-quote-kicker'")
    && blk.includes('el(\'br\', { key: \'qb\' })') && blk.includes("className: 'nv-quote-source'")
    && blk.includes("t('homeQuoteLabel')") && blk.includes('setQuoteNonce((n) => n + 1)')
    // 书架：标题 + 计数 + 最近编辑/全部书籍 + 书卡（封面/题材/竖排书名/印章/章数/书签）+ 新建书尾格
    && blk.includes("t('homeShelfHeading')") && blk.includes("t('homeShelfCount', orderedNovels.length)")
    && blk.includes("className: 'nv-shelf-count'")
    && blk.includes("t('homeShelfRecent')") && blk.includes("t('homeShelfAll')")
    && blk.includes("className: 'nv-shelf-all'")
    && blk.includes('orderedNovels.slice(0, 6).map')
    && blk.includes("className: 'nv-cover'") && blk.includes("className: 'nv-cover-genre'")
    && blk.includes("className: 'nv-cover-frame'") && blk.includes("className: 'nv-cover-title'") && blk.includes("className: 'nv-cover-seal'")
    && blk.includes("className: 'nv-cover-no'") && blk.includes("className: 'nv-bookmark'")
    && blk.includes("className: 'nv-book-stat'") && blk.includes("className: 'nv-book-now'")
    && blk.includes("className: 'nv-shelf-add'") && blk.includes("className: 'nv-shelf-add-t'")
    && blk.includes("t('homeShelfAddHint')")
    // 书案线：书案 / 未发布 / 请求 / 阶段 / 最近保存三态（无记录 / 已保存 / 时间未知）
    && blk.includes("t('homeDesk')") && blk.includes("t('homeDeskUnpublished', homeTodo.unpublished)")
    && blk.includes("t('homeDeskRequests'") && blk.includes("className: 'nv-deskline-right'")
    && blk.includes("t('homeNoSave')") && blk.includes("t('homeDeskSaved', homeSaveAt.num, homeSavedFmt.day, homeSavedFmt.time)")
    && blk.includes("t('homeSaveUnknown')")
    && clientSrc.includes('deriveHomeWords(')
    // 真实数据派生：不得写死演示值（8.9 万字 / 长篇 / 38 / 0 由 data 派生，不落源码常量）
    && !blk.includes('89232') && !blk.includes('长篇') && !blk.includes("'38'")
    && !blk.includes('homeDeskUnpublished: 38')
    && !blk.includes('quality_review') && !clientSrc.includes('homeStageChip')            // §11.4/9：阶段一律走 i18n 映射，不直接渲染枚举
    && !blk.includes('enterWriting({}, n.id)')                                           // §11.11：书卡点击必须带真实 chapter
    // §3 双顶栏防回归：书籍页保留 .nv-console-head，顶栏只在 home 挂载
    && clientSrc.includes("view === 'home' ? el('div', { className: 'nv-topbar' }")
    && clientSrc.includes("className: 'nv-console-head'")
    // §3 视图标记 + 纸张底色只在 home；`.nv-home-wide` 彻底删除（880 死宽不再有落点）
    && clientSrc.includes("'data-view': view")
    && clientSrc.includes('.nv-console[data-view="home"]{background:var(--nv-paper)')
    && !clientSrc.includes('nv-home-wide')
    // §10 首页分组一律 `.nv-home` 前缀（压过 books 旧规则）
    && clientSrc.includes('.nv-home .nv-home-hero{grid-column:1;grid-row:1')
    && clientSrc.includes('.nv-home .nv-quote-card{grid-column:2;grid-row:1')
    && clientSrc.includes('.nv-home .nv-home-shelf{grid-column:1/-1;grid-row:3')
    && clientSrc.includes('.nv-home .nv-home-deskline{grid-column:1/-1;grid-row:4')
})(), 'ux064 home structure missing')
check('UX-064 首页纯派生用例（#region home-model 区段提取后真跑：章号 / 待办 / 字数口径 / 保存时间源 / 引文剪裁 / 短名 / 阶段 / 相对日 / 意图可消费）', (() => {
  const a = clientSrc.indexOf('// #region home-model')
  const b = clientSrc.indexOf('// #endregion home-model')
  if (a < 0 || b <= a) return false
  let HM = null
  try {
    HM = new Function(clientSrc.slice(a, b) + '\nreturn { deriveHomeNextNum, deriveHomeTodo, deriveHomeRecent, deriveHomeChapterTotal, homeIntentConsumable, deriveHomeWords, deriveHomeSaveAt, formatHomeSavedAt, quoteParagraphs, shortWorkType, shortGenre, deriveHomeStage, deriveHomeRelativeDay }')()
  } catch { return false }
  if (HM === null) return false
  const c38 = { chapters: [{ num: 1 }, { num: 38 }] }
  const sparse = { chapters: [{ num: 1 }, { num: 5 }, { num: 9 }] }
  const emptyCh = { chapters: [] }
  const mixed = { chapters: [{ num: 2, published: false, gate: { passed: false } }, { num: 7, published: true, gate: { passed: true } }, { num: null }] }
  const recent = { chapters: [{ num: 3 }, { num: 9 }, { num: 1 }, { num: 8 }, { num: 2 }, { num: 7 }] }
  const todo = HM.deriveHomeTodo(mixed)
  const rec = HM.deriveHomeRecent(recent, 5)
  // 保存时间源：最大章号那条的 updatedAt（顺序无关；不读 statistics.last_updated）
  const saved = HM.deriveHomeSaveAt({ statistics: { last_updated: '2020-01-01T00:00:00Z' }, chapters: [{ num: 38, updatedAt: '2026-08-25T14:26:00Z' }, { num: 1, updatedAt: '2026-08-01T00:00:00Z' }] })
  const fmt = HM.formatHomeSavedAt('2026-08-25T14:26:00Z')
  const paras = HM.quoteParagraphs('---\ntitle: x\n---\n\n# 第 1 章\n\n甲段。\n接续。\n\n\n乙段。')
  const long = HM.quoteParagraphs('甲'.repeat(200))
  const now = Date.parse('2026-08-25T12:00:00Z')
  return HM.deriveHomeNextNum(null) === null                       // 未就绪 ⇒ 未知（禁止猜 1）
    && HM.deriveHomeNextNum(undefined) === null
    && HM.deriveHomeNextNum(emptyCh) === 1                         // 0 章 ⇒ 写第 1 章（真实）
    && HM.deriveHomeNextNum(c38) === 39 && HM.deriveHomeNextNum(sparse) === 10
    && todo.unpublished === 2 && todo.gateFails === 1 && todo.gateFirstNum === 2
    && HM.deriveHomeTodo(null) === null                            // 未就绪 ⇒ null（UI 显示 —，不得显示 0）
    && HM.deriveHomeRecent(null) === null
    && rec.length === 5 && rec[0].num === 9 && rec[4].num === 2     // 倒序取 5 条
    && HM.deriveHomeChapterTotal(null, { totalChapters: 38 }) === 38  // 展示口径回退 overview
    && HM.deriveHomeChapterTotal(emptyCh, { totalChapters: 38 }) === 38 // stale：detail 空 + overview 38 ⇒ 38（不得报 0）
    && HM.deriveHomeChapterTotal(emptyCh, { totalChapters: 0 }) === 0   // 真实 0 章新书仍显示 0（不伪造 overview）
    && HM.deriveHomeChapterTotal(c38, { totalChapters: 38 }) === 2      // detail 有章 ⇒ 真实条数优先
    && HM.homeIntentConsumable({ novelId: 'a' }, 'a') === true
    && HM.homeIntentConsumable({ novelId: 'a' }, 'b') === false     // 跨书不得消费
    && HM.homeIntentConsumable(null, 'a') === false
    && HM.homeIntentConsumable({}, 'a') === false
    // 字数口径：≥10000 → 万（1 位小数，整万不拖 .0）；否则原字数；非法 → null（UI 显示 —）
    && HM.deriveHomeWords(89232).wan === '8.9'                      // 书斋首页实读 8.9 万字
    && HM.deriveHomeWords(10000).wan === '1'                        // 整万 ⇒「1 万字」，不出现「1.0 万字」
    && HM.deriveHomeWords(8923).chars === 8923
    && HM.deriveHomeWords(null) === null && HM.deriveHomeWords(NaN) === null && HM.deriveHomeWords(-1) === null
    // 保存时间：来源 = 末章 updatedAt；缺章 / 坏时间 ⇒ null（不编造）
    && saved.num === 38 && saved.iso === '2026-08-25T14:26:00Z'
    && HM.deriveHomeSaveAt({ chapters: [] }) === null
    && HM.deriveHomeSaveAt({ statistics: { last_updated: '2020-01-01T00:00:00Z' }, chapters: [] }) === null
    && HM.deriveHomeSaveAt({ chapters: [{ num: 3, updatedAt: 'nope' }] }).iso === null
    // 真实宿主 chapterList.updatedAt = mtime 毫秒数（不是 ISO 串）：数字也必须出 saveAt，否则书案线永远「保存时间未知」
    && (() => { const s = HM.deriveHomeSaveAt({ chapters: [{ num: 2, updatedAt: Date.parse('2026-08-25T14:26:00Z') }] }); return s.num === 2 && s.iso === '2026-08-25T14:26:00.000Z' })()
    && HM.deriveHomeSaveAt({ chapters: [{ num: 2, updatedAt: 0 }] }).iso === null
    && HM.deriveHomeSaveAt({ chapters: [{ num: 2, updatedAt: null }] }).iso === null
    && fmt !== null && /^\d+月\d+日$/.test(fmt.day) && /^\d{2}:\d{2}$/.test(fmt.time)
    && HM.formatHomeSavedAt('nope') === null && HM.formatHomeSavedAt(null) === null
    // 引文：剥 frontmatter + 标题行，取最后 2 段并合并折行；空正文 → []
    && paras.length === 2 && paras[0] === '甲段。 接续。' && paras[1] === '乙段。'
    && HM.quoteParagraphs('').length === 0 && HM.quoteParagraphs(null).length === 0
    && HM.quoteParagraphs('甲。\n\n乙。\n\n---\n\n本章字数：12字（含标点）\n').join('|') === '甲。|乙。'   // 分隔线/字数尾巴不算正文引文
    // 超长段落在数据层截断（末 110 字 + 前导 …；总长 111），不做 CSS 裁切冒充
    && long.length === 1 && long[0].charAt(0) === '…' && long[0].length === 111
    // 短名：括号/×/斜杠切分 + 去「小说」后缀；缺省 → null（UI 用兜底文案）
    && HM.shortWorkType('中篇小说（10-50万字）') === '中篇'
    && HM.shortGenre('规则怪谈×现代职业错位喜剧') === '规则怪谈'
    && HM.shortGenre('规则怪谈（素材说明）/ 其二') === '规则怪谈'
    && HM.shortWorkType(null) === null && HM.shortGenre('') === null
    // 阶段映射：未知枚举不得原样抛给 UI（走 homeStageUnknown），色点语气随阶段
    && HM.deriveHomeStage('quality_review').key === 'homeStageReview' && HM.deriveHomeStage('quality_review').tone === 'warn'
    && HM.deriveHomeStage('published').tone === 'ok'
    && HM.deriveHomeStage('draft').tone === null
    && HM.deriveHomeStage('nope').key === 'homeStageUnknown' && HM.deriveHomeStage(null).key === 'homeStageUnknown'
    // 相对日：今天 / 昨天 / N 天前 / 超 30 天或非法 → null（不编造）
    && HM.deriveHomeRelativeDay('2026-08-25T08:00:00Z', now).key === 'homeToday'
    && HM.deriveHomeRelativeDay('2026-08-24T08:00:00Z', now).key === 'homeYesterday'
    && HM.deriveHomeRelativeDay('2026-08-20T08:00:00Z', now).key === 'homeDaysAgo'
    && HM.deriveHomeRelativeDay('2026-08-20T08:00:00Z', now).n === 5
    && HM.deriveHomeRelativeDay('2026-06-01T08:00:00Z', now) === null
    && HM.deriveHomeRelativeDay('nope', now) === null
})(), 'ux064 home model cases failed')
// UX-064 R4 P1-2：stale 行为级 render fixture —— 复用本节上方 __ModuleLoader__ + mockReact 装载面，
// 只把 NvConsole 内的 usePoll 调用替换为固定 poll 数据 / 需要时预置 home 搜索 state，其余 homeBody
// 渲染逻辑全部真跑（不新建测试框架，也不把渲染结果写成源码镜像）。
const renderUx064Home = (pollData, patches) => {
  // 文件里有多个 usePoll（ChapterPanel 也有）；以 overview 请求行定位 NvConsole 那一个。
  const ovIdx = clientSrc.indexOf("const ov = await apiJson('/novel-writing/api/overview')")
  const a = ovIdx < 0 ? -1 : clientSrc.lastIndexOf('const poll = usePoll(async () => {', ovIdx)
  const endMark = '      }, 2500, [open, pollTick], open)'
  const b = a < 0 ? -1 : clientSrc.indexOf(endMark, a)
  if (a < 0 || b < 0) return null
  let src = clientSrc.slice(0, a) + 'const poll = ' + JSON.stringify(pollData) + '\n' + clientSrc.slice(b + endMark.length)
  for (const [from, to] of (patches ?? [])) {
    const k = src.indexOf(from)
    if (k < 0) return null
    src = src.slice(0, k) + to + src.slice(k + from.length)
  }
  let def = null
  globalThis.window = { __ModuleLoader__: { load(d) { def = d } } }
  try { new Function(src)() } finally { delete globalThis.window }
  if (def === null) return null
  let ex = null
  try { ex = def.factory((id) => { if (id === 'react') return mockReact; throw new Error('unexpected require: ' + id) }) } catch { return null }
  if (ex === null) return null
  const regs = []
  let pendingSlot = ''
  const ctx = {
    get: () => undefined,
    slots: {
      inject(name, fn) { pendingSlot = name; fn() },
      register(d, render) { regs.push({ id: d.id, render }) },
    },
  }
  try { ex.apply(ctx) } catch { return null }
  const dr = regs.find((r) => r.id === 'novel-drawer')
  const con = regs.find((r) => r.id === 'nv-console')
  if (dr === undefined || con === undefined) return null
  // 走真实入口：抽屉标题行 onClick 打开控制台（不直接改模块内部 store）
  let head = null
  const findHead = (n) => {
    if (n === null || n === undefined || typeof n !== 'object') return
    if (Array.isArray(n)) { for (const c of n) findHead(c); return }
    if (n.props !== undefined && n.props.className === 'nv-drawer-head') { head = n; return }
    if (Array.isArray(n.children)) for (const c of n.children) findHead(c)
  }
  findHead(dr.render({ wide: true }))
  if (head === null || typeof head.props.onClick !== 'function') return null
  head.props.onClick()
  return con.render({ initialView: 'home' })
}
const walkUx064Tree = (root) => {
  const out = { cls: {}, texts: [], nodes: [] }
  const walk = (n) => {
    if (n === null || n === undefined) return
    if (Array.isArray(n)) { for (const c of n) walk(c); return }
    if (typeof n === 'string') { out.texts.push(n); return }
    if (typeof n !== 'object') return
    const cn = n.props !== undefined && typeof n.props.className === 'string' ? n.props.className : ''
    if (cn !== '') {
      for (const part of cn.split(/\s+/)) if (part !== '') out.cls[part] = (out.cls[part] ?? 0) + 1
      out.nodes.push({ cls: cn, node: n })
    }
    if (Array.isArray(n.children)) for (const c of n.children) walk(c)
  }
  walk(root)
  return out
}
const ux064TextOf = (node) => {
  const parts = []
  const walk = (n) => {
    if (n === null || n === undefined) return
    if (Array.isArray(n)) { for (const c of n) walk(c); return }
    if (typeof n === 'string') { parts.push(n); return }
    if (typeof n === 'object' && Array.isArray(n.children)) for (const c of n.children) walk(c)
  }
  walk(node)
  return parts.join('')
}
const ux064StaleRenderOk = () => {
  const fixture = {
    overview: {
      root: 'D:\\AI\\writing', bindings: {},
      novels: [{
        id: 'novel-stale', title: '诡异副本，先过审', workType: '中篇小说（10-50万字）',
        genre: '规则怪谈×现代职业错位喜剧', totalChapters: 38, totalWords: 89232,
        stage: 'quality_review', requests: 0, lastUpdated: '2026-08-25T08:00:00Z',
      }],
    },
    details: { 'novel-stale': { chapters: [] } },
  }
  const root = renderUx064Home({ data: fixture, error: null }, [
    // 搜索行也纳入回归：预置查询词 + 展开，验证书行章数同样走展示口径（38，不是 0）
    ["const [homeKw, setHomeKw] = useState('')", "const [homeKw, setHomeKw] = useState('诡异')"],
    ["const [homeSearchOpen, setHomeSearchOpen] = useState(false)", "const [homeSearchOpen, setHomeSearchOpen] = useState(true)"],
  ])
  if (root === null) return false
  const w = walkUx064Tree(root)
  const joined = w.texts.join('')
  const cta = w.nodes.find((n) => /\bnv-home-cta\b/.test(n.cls) && /\bnv-btn-lg\b/.test(n.cls))
  const coverNo = w.nodes.find((n) => /\bnv-cover-no\b/.test(n.cls))
  const shelfCard = w.nodes.find((n) => /\bnv-shelf-card\b/.test(n.cls))
  const searchSub = w.nodes.find((n) => /\bnv-tsearch-item-sub\b/.test(n.cls))
  const staleOk = cta !== undefined && cta.node.props.disabled === true           // stale ⇒ CTA 禁用
    && !joined.includes('写第 1 章')                                              // 不猜第 1 章
    && joined.includes('38 章')                                                   // overview 章数上屏（hero/卡/搜索行）
    && coverNo !== undefined && ux064TextOf(coverNo.node) === '38 章'             // 书架卡不是 0 章
    && shelfCard !== undefined && String(shelfCard.node.props['aria-label'] ?? '').includes('38 章') // aria-label 用展示口径
    && searchSub !== undefined && ux064TextOf(searchSub.node).includes('38 章')   // 搜索书行不是 0 章
    && joined.includes('保存时间未知')                                            // stale 保存时间 = 未知（不是尚无保存记录）
    && joined.includes('— 章未发布')                                              // 待办未知 = —
    && !joined.includes('0 章')                                                   // 全树不出现 0 章
    && !joined.includes('还没有章节')                                             // stale 不得假称无章节
    && joined.includes('正在写')                                                  // eyebrow 保留「正在写」，由 note 解释
    && joined.includes('章节数据未就绪') && joined.includes('重试')                 // 既有 stale note + 重试
  if (!staleOk) return false
  // 对照组（真实 0 章新书，overview 也是 0）：仍走 homeNoChapters / 写第 1 章 / 尚无保存记录——stale 窄修不得吞掉新书语义。
  const emptyRoot = renderUx064Home({
    data: {
      overview: { root: 'D:\\AI\\writing', bindings: {}, novels: [{ id: 'novel-empty', title: '新书', totalChapters: 0, totalWords: 0, stage: 'draft', requests: 0 }] },
      details: { 'novel-empty': { chapters: [] } },
    },
    error: null,
  })
  if (emptyRoot === null) return false
  const ew = walkUx064Tree(emptyRoot)
  const ej = ew.texts.join('')
  const eCta = ew.nodes.find((n) => /\bnv-home-cta\b/.test(n.cls) && /\bnv-btn-lg\b/.test(n.cls))
  return ej.includes('还没有章节') && ej.includes('写第 1 章') && ej.includes('0 章') && ej.includes('尚无保存记录')
    && !ej.includes('保存时间未知') && eCta !== undefined && eCta.node.props.disabled !== true
}
const ux064ErrorRenderOk = () => {
  const root = renderUx064Home({ data: null, error: 'boom' })
  if (root === null) return false
  const w = walkUx064Tree(root)
  const joined = w.texts.join('')
  const stateErr = w.nodes.find((n) => /\bnv-home-state-err\b/.test(n.cls))
  return (w.cls['nv-home-state'] ?? 0) === 1
    && (w.cls['nv-home-state-err'] ?? 0) === 1
    && stateErr !== undefined && stateErr.node.props.role === 'alert'
    && joined.includes('读取书目失败') && joined.includes('重试')
    && (w.cls['nv-home-hero'] ?? 0) === 0 && (w.cls['nv-btn-lg'] ?? 0) === 0
}
check('客户端源码面：UX-064 首页主 CTA / 新建书 = 真触发工作流，指令含第 N 章（单主 CTA，无第二工作流按钮）', (() => {
  const i = clientSrc.indexOf('const homeBody = () => {')
  const j = i < 0 ? -1 : clientSrc.indexOf('const g = geom !== null', i)
  const blk = i < 0 || j < 0 ? '' : clientSrc.slice(i, j)
  const msgB = fnBody('function launchMsgOf(novels, id, title, launchOpts) {')
  const promptB = fnBody('async promptLaunch(sessionId, novel, novels, launchOpts) {')
  const launchB = fnBody('const launchWorkflow = async (launchOpts, allowStop) => {')
  return blk !== '' && msgB !== '' && promptB !== '' && launchB !== ''
    && blk.includes("enterWriting({ workflow: 'continue', chapter: homeNextNum })")
    && blk.includes("enterWriting({ chapter: lastNum })")              // quiet 次级入口 = 打开上一章
    && blk.includes("if (homeNextNum !== null) enterWriting(")         // 禁用时不再投递猜测章号
    && blk.includes("onClick: () => { setCreating(true); setCreateNotice('') }")  // 空态/尾格 CTA = 新建书
    && !blk.includes('newChapter:')                                    // 编辑面入口已从首页移除
    && msgB.includes("opt.mode === 'new'") && msgB.includes('请新建并撰写第 ${num} 章')
    && msgB.includes("opt.mode === 'continue'") && msgB.includes('继续写第 ${num} 章')
    && msgB.includes('if (num === null) return base')                  // 无 opts 保持历史指令
    && promptB.includes('launchMsgOf(novels, novel.id, novel.title, launchOpts ?? null)')
    && launchB.includes('launcher.promptLaunch(sid, current, novels, opt)')
    && launchB.includes('allowStop !== true')                          // 首页发起不抢停运行中的轮次
    && clientSrc.includes('onWfLaunch: () => launchWorkflow(null, true)')  // 左栏主按钮仍承担停止
    // BUG-012 修复形态：消费 effect 上移后首页意图经 launchWfRef 间接调用
    && clientSrc.includes('launchWfRef.current({ mode: wf.mode, chapter: wf.chapter }, false)')
    && clientSrc.includes('launchWfRef.current = launchWorkflow')
    && clientSrc.includes('}, [pendingWorkflow, snap.active])')
})(), 'ux064 home workflow trigger missing')
check('客户端源码面：UX-063 P0-a② 返工：客户端「新建章编辑面」已移除（不建空章节文件）', (() => {
  return !clientSrc.includes('saveNewChapter')
    && !clientSrc.includes('closeNewChapter')
    && !clientSrc.includes('newChapterNum')
    && !clientSrc.includes('newDraft')
    && !clientSrc.includes('nv-newch')
    && !clientSrc.includes('homeNewChapterSave')
    && !clientSrc.includes('homeNewChapterHint')
    && !clientSrc.includes('homeNewChapterEmpty')
    // 既有「章节编辑保存」主通道必须保留（写作视图内编辑 → POST /api/chapter）
    && clientSrc.includes("apiJson('/novel-writing/api/chapter', { novel: props.novelId, chapter: active.num, content: draft, force })")
})(), 'ux063 new-chapter editor still present')
check('UX-064 当前书数据未就绪：主 CTA 禁用且不猜章号 / 未知值显示 — / 引文四态 / 意图同书同步投递且不跨书 / 空态文案逐条原样', (() => {
  const i = clientSrc.indexOf('const homeBody = () => {')
  const j = i < 0 ? -1 : clientSrc.indexOf('const g = geom !== null', i)
  const blk = i < 0 || j < 0 ? '' : clientSrc.slice(i, j)
  const enterB = fnBody('const enterWriting = (intent, targetId = homeCurrentId) => {')
  const applyB = fnBody('const applyHomeIntent = (it) => {')
  return blk !== '' && enterB !== '' && applyB !== ''
    // 动作面：未就绪禁用 + 不猜章号 + 失败/加载二分文案 + 失败态单一重试出口
    && blk.includes('disabled: homeDetail === null || homeNextNum === null')
    && blk.includes('const ctaLabel = homeDetail === null')
    && blk.includes("? t('homeReadingNow')")
    && blk.includes("? t('homeStartFirstChapter')")
    && blk.includes(": t('homeContinueCta', homeNextNum)")
    && blk.includes('if (homeNextNum !== null) enterWriting(')
    && blk.includes("const detailNote = homeDetailFailed === true") && blk.includes("t('homeDetailFailedNote')")
    && blk.includes("className: 'nv-hero-note nv-home-note-err'")
    && blk.includes("className: 'nv-home-retry'")
    && blk.includes("const lastNum = homeSaveAt !== null ? homeSaveAt.num : null")
    && clientSrc.includes('const homeDetailFailed = details !== null && homeNovel !== null && homeDetail === null')
    // 未知态：字数 — / 作品类型兜底 / 待办与请求 — / 保存时间三态（不编造 0 或时间）
    && blk.includes("const wordsText = homeWords === null ? '—'")
    && blk.includes("t('homeNovelFallback')")
    && blk.includes("t('homeNoSave')") && blk.includes("t('homeSaveUnknown')") && clientSrc.includes('formatHomeSavedAt(')
    && blk.includes("t('homeDeskUnpublished', '—')")
    && blk.includes("Number.isFinite(homeNovel.requests) ? t('homeDeskRequests', homeNovel.requests) : '—'")
    && blk.includes("quoteState === 'fail'") && blk.includes("t('homeQuoteFailed')")
    && blk.includes("quoteState === 'loading'") && blk.includes("t('homeQuoteEmpty')")
    && blk.includes('setQuoteNonce((n) => n + 1)')
    && clientSrc.includes('function deriveHomeChapterTotal(detail, novel) {')
    // 意图通道：同步投递 + novelId 绑定目标书 + 跨书拒绝 + 失败路径清理
    && enterB.includes('const full = { ...(intent ?? {}), novelId: bookId }')
    && enterB.includes('homeIntentSink(full)')
    && enterB.includes('pendingHomeIntent = null')
    && applyB.includes('homeIntentConsumable(it,')
    && clientSrc.includes('function homeIntentConsumable(intent, novelId) {')
    && !clientSrc.includes('}, [snap.active, selectedId])')            // 旧消费面已退役
    // 书架卡 = 书目集合前 6 本，点击换书并入写作（不跨书）
    && blk.includes('orderedNovels.slice(0, 6).map((n) => {')
    && blk.includes('onClick: () => enterWriting(last !== null ? { chapter: last.num } : {}, n.id)')
    // 空态批准文案逐条原样（console-empty.html 同源；不许静默改写）
    && clientSrc.includes("homeEmptyTitle: '还没有书'")
    && clientSrc.includes("homeEmptyLead: '从第一本书开始。'")
    && clientSrc.includes("homeEmptySub: '一个工作区，一条从初稿到发布的路。'")
    && clientSrc.includes("homeEmptyCta: '新建第一本书'")
    && clientSrc.includes("homeStep1: '起一个书名'")
    && clientSrc.includes("homeStep2: '写下第一章'")
    && clientSrc.includes("homeStep3: '随时回来接着写'")
    && clientSrc.includes("homeEmptyShelf: '书架还空着。'")
    && clientSrc.includes("homeEmptyShelfCount: '书架 0 本'")
    && clientSrc.includes("homeEmptyTodo: '还没有待办'")
    && clientSrc.includes('homeShelfTitle: (n) => `书架 ${n} 本`')
    && clientSrc.includes('homeContinueCta: (n) => `续写第 ${n} 章`')
    && clientSrc.includes("homeOpenChapter: (n) => `打开第 ${n} 章`")
    && clientSrc.includes('homeDeskSaved: (n, md, hm) => `第 ${n} 章保存　${md} ${hm}`')
    // 空态：「继续写」类文案不得出现在首页动作面（R2 批准文案为「续写第 N 章」）
    && !blk.includes('继续写')
    // R4 P1-1 消费面：stale ⇒ 动作面置 null / CTA 禁用 / 保存时间未知 / 搜索书行走展示口径
    && clientSrc.includes('const homeNextNum = homeDetailStale === true ? null : deriveHomeNextNum(homeDetail)')
    && clientSrc.includes('const homeTodo = homeDetailStale === true ? null : deriveHomeTodo(homeDetail)')
    && blk.includes('disabled: homeDetail === null || homeNextNum === null || homeDetailStale === true')
    && blk.includes(': (homeDetailStale === true // stale')
    && clientSrc.includes('? deriveHomeChapterTotal(detail, n)')
    // 行为级 render fixture（R3 P1-1/P1-2 + P2-2）：stale 不渲染 0 章新书 / 错误态 role=alert + 重试。
    // 并入本断言而非新增 check，保持 README「342 项断言」计数闸同步（改动条数须同 commit 改 README，R4 不改）。
    && ux064StaleRenderOk()
    && ux064ErrorRenderOk()
})(), 'ux064 home unknown-state mismatch')
// ── UX-063 P0-a 第③步：正文可读性（规格 §1C；迁移表 A 段 #1~#6 / C 段 #15/#16）──
check('客户端源码面：UX-063 P0-a③ 正文可读性（reading 16 + 行高 1.95 + measure 34em + 中文排版 2em/0.62em + 编辑态同源 + 存量令牌冻结）', (() => {
  return clientSrc.includes('--nv-fs-reading:16px') && clientSrc.includes('--nv-fs-ui:13px')
    && clientSrc.includes('--nv-measure:34em')
    // `.nv-content` 基础规则保留（S1/其他阅读面）；S2 稿纸正文经 `.nv-prose .nv-content` 覆盖行高 1.95
    && clientSrc.includes('.nv-content{font-size:var(--nv-fs-reading,16px);line-height:1.9;color:var(--nv-fg,#e6e8eb)}')
    && clientSrc.includes('.nv-content p{text-indent:2em;margin:0 0 .8em;font-size:inherit;line-height:inherit}')
    && clientSrc.includes('.nv-prose .nv-content{width:100%;max-width:min(34em,100%);min-width:0;')
    && clientSrc.includes('font-family:var(--nv-prose-family);font-size:var(--nv-prose-size);line-height:var(--nv-prose-lh)')
    && clientSrc.includes('.nv-sheet-edit{display:block;width:100%;min-width:0;max-width:100%;')
    && clientSrc.includes('.nv-content h2{font-size:var(--nv-fs-display);')
    && clientSrc.includes('.nv-content h3{font-size:var(--nv-fs-display-s);')
    && clientSrc.includes('padding:22px 0 8px')
    && clientSrc.includes('--nv-fs-body:15px') && clientSrc.includes('--nv-fs-card:13.5px')
    && clientSrc.includes('--nv-fs-caption:11px') && clientSrc.includes('--nv-fs-display-s:17px')
    && clientSrc.includes('--nv-fs-hero:28px') && clientSrc.includes('--nv-fs-base:12px')
    && !clientSrc.includes('.nv-content p{margin:1em 0')
})(), 'ux063 reading typography missing')
check('客户端源码面：UX-063 P0-a① 恢复五路径调用级具名——syncAnchor 内「旧节点还原」单独可判（删该调用必红）', (() => {
  const body = fnBody('syncAnchor() {')
  return body !== ''
    && body.includes('if (DrawerHost.viewArea !== null && DrawerHost.viewArea.isConnected && DrawerHost.viewArea !== viewArea) DrawerHost.restoreViewArea()')
    && body.includes('DrawerHost.snapshotViewArea(viewArea)')
})(), 'ux063 syncAnchor restore call missing')
check('客户端源码面：UX-064 顶栏（仅首页、书籍页不留双顶栏）与首页搜索（combobox ARIA / 未就绪≠无结果）+ 墨纸令牌 light-dark 且蓝色残留零', (() => {
  const ti = clientSrc.indexOf("el('div', { className: 'nv-topbar' }")
  const top = ti < 0 ? '' : clientSrc.slice(ti, ti + 12000)
  const ld = (clientSrc.match(/light-dark\(/g) ?? []).length
  return top !== ''
    && top.includes("className: 'nv-brand'") && top.includes("className: 'nv-seal nv-brand-seal'")
    && top.includes("className: 'nv-brand-word'") && top.includes("className: 'nv-brand-sub'")
    && top.includes("className: 'nv-wsswitch'") && top.includes("className: 'nv-ws-label'")
    && top.includes("className: 'nv-topbar-right'")
    && top.includes("className: 'nv-tghost'") && top.includes("className: 'nv-iconbtn'")
    && top.includes("className: 'nv-iconbtn nv-iconbtn-close'") && top.includes("className: 'nv-topbar-div'")
    // 顶栏只在 home 挂载；书籍页仍用原 .nv-console-head（否则出现双顶栏）
    && clientSrc.includes("view === 'home' ? el('div', { className: 'nv-topbar' }")
    && clientSrc.includes("view === 'home' ? null : el('div', { className: 'nv-console-head' }")
    // 搜索挂件仅「有书的首页」（加载 / 空态 / 失败不渲染假搜索）+ combobox 键盘可达 + 无结果/未就绪二分
    && /poll.data !== null && novels.length > 0\s*\n\s*\? el\('div', \{ className: 'nv-tsearch' \}/.test(top)
    && top.includes("className: 'nv-tsearch-input'") && top.includes("className: 'nv-kbd'")
    && top.includes("role: 'combobox'") && top.includes("'aria-controls': 'nv-tsearch-list'")
    && top.includes("role: 'listbox'") && top.includes("role: 'option'")
    && top.includes("'aria-expanded'") && top.includes("'aria-activedescendant'")
    && top.includes("className: 'nv-tsearch-pop'") && top.includes("className: 'nv-tsearch-item'")
    && top.includes("className: 'nv-tsearch-none'") && top.includes("className: 'nv-tsearch-pending'")
    && top.includes('homeSearchResults.length === 0 && homeSearchPending !== true')   // 未就绪 ≠ 没有找到
    && top.includes("t('homeNoResult')") && top.includes("t('homeReadingNow')")
    && clientSrc.includes("String(e.key).toLowerCase() === 'k'")
    && clientSrc.includes('setHomeSearchOpen(true)') && clientSrc.includes("setHomeKw('')")
    // 墨纸令牌：正文墨色 / 纸色 / 细线 / 朱砂 + 首页字号 + 大按钮高度，均 light-dark 自适应
    && clientSrc.includes('--nv-ink:light-dark(') && clientSrc.includes('--nv-paper:light-dark(')
    && clientSrc.includes('--nv-rule:light-dark(') && clientSrc.includes('--nv-cinnabar:light-dark(')
    && clientSrc.includes('--nv-fs-hero-lg:36px') && clientSrc.includes('--nv-fs-empty:38px')
    && clientSrc.includes('--nv-fs-sec:21px') && clientSrc.includes('--nv-ctl-lg:42px')
    && ld >= 6
    // §10 首页字号/圆角/封面色令牌齐备（--nv-fs-home-* ≥19 组；封面 6 色）
    && (clientSrc.match(/--nv-fs-home-\d+:/g) ?? []).length >= 19
    && clientSrc.includes('--nv-r-home-4:4px') && clientSrc.includes('--nv-r-home-2:2px')
    && clientSrc.includes('--nv-cover-0:') && clientSrc.includes('--nv-cover-5:')
    // 旧蓝色主色在顶栏/首页面上零残留（UX-064 墨纸替换）
    && !/\.nv-topbar[^}]*#4f8ef7/.test(clientSrc) && !/\.nv-home[^}]*#4f8ef7/.test(clientSrc)
    // 全幅网格：宽度交给容器（无 880 死宽）+ 五子节点行轨 + 三档响应式 + 减动效
    && !clientSrc.includes('nv-home-wide')
    && clientSrc.includes('.nv-home{flex:1;min-height:0;width:100%;display:grid;grid-template-columns:minmax(0,1fr) 384px;grid-template-rows:auto 1px auto 1fr;')
    && clientSrc.includes('.nv-home .nv-cover{position:relative;display:block;width:190px;height:274px')
    && clientSrc.includes('.nv-home .nv-ghost{position:relative;display:flex;align-items:center;justify-content:flex-start;width:86px;height:124px')
    && clientSrc.includes('@media (max-width:1100px)') && clientSrc.includes('@media (max-width:900px)')
    && clientSrc.includes('@media (max-width:760px)') && clientSrc.includes('@media (prefers-reduced-motion:reduce)')
})(), 'ux064 topbar/search/tokens mismatch')

// ── BUG-012：Rules-of-Hooks 静态守卫（防再犯；证据 docs/evidence/BUG-012/0.2.2-surface-facts.md）────
// 事故形态：组件函数体内「条件早退」出现在顶层 hook 调用之前 ⇒ 挂载渲染（inactive）hook 数少一个，
// snap.active 翻转（inactive→active）时本渲染 hook 数 > 上一渲染 ⇒ React #310 ⇒ 宿主 SlotErrorBoundary
// 捕获后卸载 novel-split entry =「点小说工作台不出现」（四代宿主同雷，与宿主代际无关）。
// 检测口径（启发式静态扫描，非 AST，边界如实披露）：
//   ① 扫描对象 = function 声明 / const 箭头函数体中**体内出现 hook 调用**（use[A-Z]\w*( ）的函数；
//   ② 条件早退 = 控制块（if/else/try/catch/finally/for/while/do/switch）内的 return——**块状与无块
//      两形态均判**（R1-F1：块头分类改「末行判据」+ 跨行条件括号回扫 + 「块内直层裸 return」内容
//      兜底，三路见 hooksGuardClassify/hooksGuardContentOverride），或与 if(…)/else 同行（括号净差
//      为 0，即条件已闭合）的无块 return；回调（=> / function / 方法头）与对象字面量内的 return
//      不算——它们不是组件语句（useEffect 回调里的 return 是清理/短路，合法）；
//   ③ 顶层 hook 调用 = 函数体直层（不进任何嵌套块/回调）的 hook 调用；
//   ④ 违规 = 存在早退位置早于某顶层 hook 位置；字符串/注释/模板字面量静态部/正则字面量先置空（保留
//      换行与行号）再做括号配平，防样式串内花括号干扰；已知盲区：return 另起一行书写的无块 if 等
//      罕见形态不保证检出（判别力由负例对照证明非恒真）。R1-F1 实战：本判据曾揪出 ChapterPanel
//      预存在同类违规（空章早退在 useRef 之前，chapters 0→N 翻转即 #310）——已随 R1 修复（listRef 上提）。
const hooksGuardBlank = (src) => {
  const out = []
  const frames = [] // { tpl, depth }：tpl=true 模板静态部；false 为模板插值代码部（花括号计数）
  let last = ''
  const kwBeforeRegex = (txt) => {
    const m = /([A-Za-z_$][\w$]*)$/.exec(txt)
    return m !== null && ['return', 'typeof', 'case', 'in', 'of', 'instanceof', 'delete', 'void', 'do', 'else', 'yield', 'await'].includes(m[1])
  }
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    const d = i + 1 < n ? src[i + 1] : ''
    const top = frames.length > 0 ? frames[frames.length - 1] : null
    if (top !== null && top.tpl) {
      if (c === '`') { frames.pop(); out.push(' '); i += 1; last = '`'; continue }
      if (c === '\\' && d !== '') { out.push(' ', ' '); i += 2; continue }
      if (c === '$' && d === '{') { frames.push({ tpl: false, depth: 0 }); out.push('$', '{'); i += 2; last = '{'; continue }
      out.push(c === '\n' ? '\n' : ' '); i += 1; continue
    }
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; for (; i < j; i++) out.push(' '); continue }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; for (; i < j; i++) out.push(src[i] === '\n' ? '\n' : ' '); continue }
    if (c === "'" || c === '"') {
      const q = c; out.push(' '); i += 1
      while (i < n && src[i] !== q) {
        if (src[i] === '\\') { out.push(' '); i += 1; if (i < n) { out.push(src[i] === '\n' ? '\n' : ' '); i += 1 } }
        else { out.push(src[i] === '\n' ? '\n' : ' '); i += 1 }
      }
      i += 1; out.push(' '); last = q; continue
    }
    if (c === '`') { frames.push({ tpl: true, depth: 0 }); out.push(' '); i += 1; continue }
    if (c === '/' && (last === '' || /[({[,;=:?!&|<>+\-*%^~]/.test(last) || kwBeforeRegex(out.join('')))) {
      out.push(' '); i += 1
      let done = false
      while (i < n && !done) {
        if (src[i] === '\\') { out.push(' '); i += 1; if (i < n) { out.push(' '); i += 1 }; continue }
        if (src[i] === '[') {
          out.push(' '); i += 1
          while (i < n && src[i] !== ']') { if (src[i] === '\\') { out.push(' '); i += 1 }; out.push(src[i] === '\n' ? '\n' : ' '); i += 1 }
          if (i < n) { out.push(' '); i += 1 }
          continue
        }
        if (src[i] === '\n') break // 跨行 ⇒ 非正则（防御性终止）
        if (src[i] === '/') done = true
        out.push(src[i] === '\n' ? '\n' : ' '); i += 1
      }
      while (i < n && /[a-z]/i.test(src[i])) { out.push(' '); i += 1 }
      last = '/'; continue
    }
    if (top !== null && !top.tpl && c === '}') {
      if (top.depth === 0) { frames.pop(); out.push('}'); last = '}'; i += 1; continue }
      top.depth -= 1; out.push('}'); last = '}'; i += 1; continue
    }
    if (top !== null && !top.tpl && c === '{') top.depth += 1
    out.push(c); last = c; i += 1
  }
  return out.join('')
}
const HOOKS_GUARD_CTRL = new Set(['if', 'else', 'try', 'catch', 'finally', 'for', 'while', 'do', 'switch'])
const hooksGuardParenNet = (s) => (s.match(/\(/g) ?? []).length - (s.match(/\)/g) ?? []).length
// R1-F1：块头分类改「末行判据」——取 head 的末尾非空行；末行含未配平闭括号（跨行条件）时向前累计
// 至配平，取累计块首行判控制关键字。本仓无分号风格下，回扫 `;{}` 边界会吃到前置语句残尾（Reviewer
// 微测 A/D 形态 0/3 检出的根因）；方法头/对象字面量/回调不受影响（name( 非控制关键字）。
const hooksGuardClassify = (head) => {
  const lines = head.split('\n')
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
  if (lines.length === 0) return 'other'
  let chunk = lines.pop()
  let net = hooksGuardParenNet(chunk)
  while (net < 0 && lines.length > 0) { const prev = lines.pop(); chunk = prev + '\n' + chunk; net += hooksGuardParenNet(prev) }
  if (/=>[ \t]*$/.test(chunk)) return 'other'
  if (/\bfunction\b/.test(chunk)) return 'other'
  const firstLine = chunk.split('\n')[0].trim()
  if (/^[} \t]*(?:else[ \t]+)?(if|for|while|switch|do|try|catch|finally)\b/.test(firstLine)) return 'block'
  return 'other'
}
// R1-F1 兜底：head 未识别为回调/函数/方法头，而块内（至配平 }）直层含裸 return ⇒ 必为语句块
// （对象字面量不可能含裸语句；方法体/回调体的 return 属其自身作用域——前三行排除门保其不翻判）。
const hooksGuardContentOverride = (head, body, openIdx) => {
  const lastLine = head.split('\n').filter((l) => l.trim() !== '').pop() ?? ''
  if (/=>[ \t]*$/.test(head) || /\bfunction\b/.test(head) || /^[A-Za-z_$][\w$]*[ \t]*\(/.test(lastLine.trim())) return 'other'
  let depth = 0; let end = -1
  for (let i2 = openIdx; i2 < body.length; i2++) {
    if (body[i2] === '{') depth += 1
    else if (body[i2] === '}') { depth -= 1; if (depth === 0) { end = i2; break } }
  }
  if (end < 0) return 'other'
  let d = 0; let i3 = openIdx + 1
  while (i3 < end) {
    const ch = body[i3]
    if (ch === '{') { d += 1; i3 += 1; continue }
    if (ch === '}') { d -= 1; i3 += 1; continue }
    if (d === 0 && /[A-Za-z_$]/.test(ch)) {
      let j = i3; while (j < end && /[\w$]/.test(body[j])) j += 1
      if (body.slice(i3, j) === 'return') return 'block'
      i3 = j; continue
    }
    i3 += 1
  }
  return 'other'
}
const scanHooksViolations = (src) => {
  const code = hooksGuardBlank(src)
  const defs = []
  const FN_RE = /(?:^|[\n;])[ \t]*(?:async[ \t]+)?function[ \t]+([A-Za-z_$][\w$]*)[ \t]*\([^()]*\)[ \t]*\{/g
  const AR_RE = /(?:^|[\n;])[ \t]*const[ \t]+([A-Za-z_$][\w$]*)[ \t]*=[ \t]*(?:async[ \t]*)?(?:\([^()]*\)|[A-Za-z_$][\w$]*)[ \t]*=>[ \t]*\{/g
  for (const re of [FN_RE, AR_RE]) for (const m of code.matchAll(re)) defs.push({ name: m[1], open: m.index + m[0].length - 1 })
  const lineStarts = []
  { let acc = 0; for (const l of code.split('\n')) { lineStarts.push(acc); acc += l.length + 1 } }
  const lineOf = (pos) => { let lo = 0, hi = lineStarts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= pos) lo = mid; else hi = mid - 1 } return lo + 1 }
  const hookFns = []
  const violations = []
  const seen = new Set()
  for (const def of defs) {
    if (seen.has(def.open)) continue
    seen.add(def.open)
    let depth = 0; let close = -1
    for (let i = def.open; i < code.length; i++) {
      if (code[i] === '{') depth += 1
      else if (code[i] === '}') { depth -= 1; if (depth === 0) { close = i; break } }
    }
    if (close < 0) continue
    const body = code.slice(def.open + 1, close)
    if (!/\buse[A-Z]\w*[ \t]*\(/.test(body)) continue
    hookFns.push(def.name)
    const scopes = []
    const early = []
    const topHooks = []
    let p = 0
    while (p < body.length) {
      const ch = body[p]
      if (ch === '{') {
        let b = -1
        for (let k = p - 1; k >= 0; k--) { const t = body[k]; if (t === ';' || t === '{' || t === '}') { b = k; break } }
        const head = body.slice(b + 1, p)
        let type = hooksGuardClassify(head)
        if (type === 'other') type = hooksGuardContentOverride(head, body, p) // R1-F1 内容兜底
        scopes.push(type); p += 1; continue
      }
      if (ch === '}') { scopes.pop(); p += 1; continue }
      if (/[A-Za-z_$]/.test(ch)) {
        let j = p; while (j < body.length && /[\w$]/.test(body[j])) j += 1
        const word = body.slice(p, j)
        if (word === 'return') {
          if (scopes.every((s) => s === 'block')) {
            const lineStart = body.lastIndexOf('\n', p) + 1
            const lineBefore = body.slice(lineStart, p).trim()
            const parenNet = (lineBefore.match(/\(/g) ?? []).length - (lineBefore.match(/\)/g) ?? []).length
            const braceless = parenNet === 0
              && (/^(?:}[ \t]*)?(?:else[ \t]+)?(?:if|for|while)[ \t]*\(/.test(lineBefore) || /^(?:}[ \t]*)?else$/.test(lineBefore))
            if (scopes.length >= 1 || braceless) early.push({ pos: p, line: lineOf(def.open + 1 + p) })
          }
        } else if (/^use[A-Z]/.test(word)) {
          let k = j; while (k < body.length && (body[k] === ' ' || body[k] === '\t')) k += 1
          if (body[k] === '(' && scopes.length === 0) topHooks.push({ pos: p, name: word, line: lineOf(def.open + 1 + p) })
        }
        p = j; continue
      }
      p += 1
    }
    for (const e of early) {
      const h = topHooks.find((x) => x.pos > e.pos)
      if (h !== undefined) violations.push({ fn: def.name, earlyReturnLine: e.line, hookLine: h.line, hook: h.name })
    }
  }
  const braceBalance = (code.match(/\{/g) ?? []).length - (code.match(/\}/g) ?? []).length
  return { hookFns, violations, braceBalance }
}
// golden（brittle-by-design）：含 hook 调用的函数清单——增删组件/hook 必须显式改此值（防扫描面静默萎缩）
const HOOKS_GUARD_GOLDEN_FNS = 29 // UX-064 S2：+ChapterRail；S2 R2：+useStudioSnap；UX-066：+TypographyPicker/+TypographySettings
const hooksScan = scanHooksViolations(clientSrc)
check('BUG-012 Rules-of-Hooks 静态守卫：lib/client.js 含 hook 调用的函数 ' + hooksScan.hookFns.length + ' 个（golden ' + HOOKS_GUARD_GOLDEN_FNS + '）全扫——「条件早退早于顶层 hook 调用」违规 = ' + hooksScan.violations.length + '（配平自检 ' + hooksScan.braceBalance + '）',
  hooksScan.violations.length === 0 && hooksScan.hookFns.length === HOOKS_GUARD_GOLDEN_FNS && hooksScan.braceBalance === 0,
  'violations=' + JSON.stringify(hooksScan.violations.slice(0, 3)) + ' fns=' + hooksScan.hookFns.join(','))
check('BUG-012 Rules-of-Hooks 守卫判别力（负例对照，临时字符串直测非变异产品文件；R1-F1 补块状三件套）：无块/块状最小违规各必检出 1（块状例含无分号前置语句——Reviewer 微测 A 形态）∧ 合规形态 0 误报（hook 前置 + 回调内 return〔无块与块状〕+ 对象方法内 return）∧ 修复回退形态（无块版 + 块状版源码副本，块状版上文的 `}, [deps])` 即 D 形态上下文）SplitWorkspace 必检出', (() => {
  const bad = scanHooksViolations(['function Bad(props) {', '  if (props.hide) return null', '  const [x, sx] = useState(0)', '  return x', '}'].join('\n'))
  const badBlock = scanHooksViolations(['function BadBlock(props) {', '  const t = makeT()', '  if (props.hide) {', '    return null', '  }', '  const [x, sx] = useState(0)', '  return x', '}'].join('\n'))
  const good = scanHooksViolations(['function Good(props) {', '  const [x, sx] = useState(0)', '  useEffect(() => {', '    if (x === 0) return', '    sx(1)', '  }, [x])', '  if (props.hide) return null', '  return x', '}'].join('\n'))
  const okayBlock = scanHooksViolations(['function OkayBlock(props) {', '  const [x, sx] = useState(0)', '  useEffect(() => {', '    if (x === 0) {', '      return', '    }', '    sx(1)', '  }, [x])', '  return x', '}'].join('\n'))
  const method = scanHooksViolations(['function M(props) {', '  const ctl = {', '    run(n) {', '      if (n === 0) return', '      return n', '    },', '  }', '  const [x, sx] = useState(0)', '  return x', '}'].join('\n'))
  const reverted = clientSrc.replace(
    '      const launchWfRef = useRef(null)\n      useEffect(() => {\n        if (snap.active !== true) return // 分栏未开：意图保留，开启后由本 deps 变化消费\n        if (pendingWorkflow === null) return\n        const wf = pendingWorkflow\n        setPendingWorkflow(null)\n        if (launchWfRef.current !== null) launchWfRef.current({ mode: wf.mode, chapter: wf.chapter }, false)\n      }, [pendingWorkflow, snap.active])\n\n      if (snap.active !== true) return null',
    '      if (snap.active !== true) return null\n      const [fake, sfake] = useState(null)',
  )
  const rg = scanHooksViolations(reverted)
  const revertedBlock = clientSrc.replace(
    '      const launchWfRef = useRef(null)\n',
    '      if (snap.active !== true) {\n        return null\n      }\n      const launchWfRef = useRef(null)\n',
  )
  const rgb = scanHooksViolations(revertedBlock)
  return reverted !== clientSrc && revertedBlock !== clientSrc
    && bad.violations.length === 1 && bad.violations[0].fn === 'Bad' && bad.violations[0].hook === 'useState'
    && badBlock.violations.length === 1 && badBlock.violations[0].fn === 'BadBlock'
    && good.violations.length === 0 && good.hookFns.length === 1
    && okayBlock.violations.length === 0 && method.violations.length === 0
    && rg.violations.length >= 1 && rg.violations.some((v) => v.fn === 'SplitWorkspace')
    && rgb.violations.length >= 1 && rgb.violations.some((v) => v.fn === 'SplitWorkspace')
})(), '判别力八段在断言内自含；若红请先看上一条守卫读数的 violations 明细')

check('客户端源码面：S2 R2 恢复保证五路径逐条具名（open / syncAnchor / setDrawer(false) / close / setBook）', (() => {
  const openB = fnBody('open(novelId) {')
  const syncB = fnBody('syncAnchor() {')
  const closeB = fnBody('close() {')
  const setBookB = fnBody('setBook(novelId) {')
  const drawerB = fnBody('setDrawer(open) {')
  return openB !== '' && syncB !== '' && closeB !== '' && setBookB !== '' && drawerB !== ''
    && openB.includes('DrawerHost.restoreViewArea()')
    && syncB.includes('DrawerHost.restoreViewArea()')
    && drawerB.includes('DrawerHost.restoreViewArea()')
    && closeB.includes('DrawerHost.restoreViewArea()')
    && setBookB.includes('if (studioLayout.drawerOpen === true) studioLayout.setDrawer(false)')
})(), 'ux063 restore path missing')
check('客户端源码面：S2 R2 三处独立属性集（VIEW_AREA_PROPS 18 声明 / 快照 18 读 / 恢复 18 写 / applyDrawer 13 写）', (() => {
  const snapB = fnBody('snapshotViewArea(viewArea) {')
  const restB = fnBody('restoreViewArea() {')
  const drawerB = fnBody('applyDrawer() {')
  const EXPECT = ['position', 'top', 'right', 'left', 'bottom', 'width', 'height', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'zIndex', 'boxShadow', 'borderLeft', 'background', 'overflow', 'minHeight', 'maxHeight']
  const same = (arr) => arr.length === EXPECT.length && EXPECT.every((x) => arr.includes(x))
  const reads = [...snapB.matchAll(/saved\[prop\] = viewArea\.style/g)].length
  const writes = [...restB.matchAll(/viewArea\.style\.([A-Za-z]+) = this\.saved\./g)].map((m) => m[1])
  const chromeWrites = [...new Set((drawerB.match(/viewArea\.style\.([A-Za-z]+) = /g) ?? []).map((x) => x.split('.')[2].split(' ')[0]))]
  return same(writes) && chromeWrites.length === 13 && chromeWrites.every((p) => EXPECT.includes(p))
    && reads === 1 && clientSrc.includes('for (const prop of VIEW_AREA_PROPS) saved[prop] = viewArea.style[prop]')
    && drawerB.includes('const bar = rectOf(\'.nv-split .nv-bar\')')
    && drawerB.includes('const status = rectOf(\'.nv-split .nv-status\')')
})(), 'ux063 property sets missing')
// UX-053（DEC-019 方向 B+A 点缀，用户「初步优化但简陋缺设计感，保持布局视觉重构」）：
//  ①图标体系 = NV_ICONS 集中映射 + nvIcon 助手（24×24 stroke=2 currentColor，12/14/16 三档），
//    头注释 ISC/Lucide 声明保留；元素级 emoji 图标全部换 Lucide 内联（i18n 字符串内 emoji 拆分渲染，
//    字符串零改动——UX-052 教训）；②焦点双环统一（Vercel：2px bg 缓冲 + 4px accent，搜索框 45% 软焦点）；
//  ③光效收敛（整卡辉光/扫光删除——.nv-csweep 负断言；glow = 中性边框 + 顶部 2px 状态条 color-mix 70%）；
//  ④硬编码 rgba alpha 令牌化（color-mix + 先 rgba 兜底）；⑤字重三档（700→600）；⑥选中态类化
//   （.nv-ft-row/.nv-chrow [data-sel]）；⑦空态 24px 淡图标；⑧弹窗双层阴影；⑨排序 pill 选中 8% 底 + 徽标 pill 999。
check('客户端源码面：UX-053 图标体系（NV_ICONS 映射 + nvIcon 助手 + Lucide ISC 头注释 + 三档尺寸渲染 + 元素级 emoji 负断言）', (() => {
  const names = ['bookOpen', 'search', 'link', 'trash2', 'play', 'arrowLeftRight', 'rotateCcw', 'star', 'x', 'chevronDown', 'chevronRight', 'fileText', 'check', 'circleCheck', 'refreshCw', 'circle', 'database', 'cloudUpload', 'inbox', 'triangleAlert', 'folderOpen']
  return clientSrc.includes('const NV_ICONS = {')
    && names.every((n) => clientSrc.includes(n + ': ['))
    && clientSrc.includes('function nvIcon(name, size = 16)')
    && clientSrc.includes("viewBox: '0 0 24 24'") && clientSrc.includes("strokeWidth: 2")
    && clientSrc.includes("strokeLinecap: 'round'") && clientSrc.includes("strokeLinejoin: 'round'")
    && clientSrc.includes("'aria-hidden': true")
    && clientSrc.includes('Icons: Lucide (https://lucide.dev), ISC License © Lucide contributors')
    && clientSrc.includes("nvIcon('bookOpen', 16)") && clientSrc.includes("nvIcon('search', 16)")     // 16px：控制台/卡片/搜索
    && clientSrc.includes("nvIcon('link', 14)") && clientSrc.includes("nvIcon('trash2', 14)") && clientSrc.includes("nvIcon(props.wfRunning === true ? 'square' : 'play', 14)") // 14px：22px 钮 / 左栏工作流
    && clientSrc.includes("nvIcon('messageCircle', 14)") && clientSrc.includes("nvIcon('maximize', 15)") && clientSrc.includes("nvIcon('x', 15)") // 14/15px：顶栏对话/专注/关闭
    && clientSrc.includes("nvIcon(appSnap.consoleOpen === true ? 'chevronDown' : 'chevronRight', 12)")   // 12px：抽屉 caret（开/合三元）
    && clientSrc.includes("nvIcon('chevronRight', 12)") && clientSrc.includes('rotate(90deg)')          // 12px：目录箭头（展开 rotate 90°）
    && clientSrc.includes("nvIcon('fileText', 12)")                                                      // 12px：文件树/预览头
    && clientSrc.includes("const stIcon = done ? 'circleCheck' : current ? 'refreshCw' : 'circle'") && clientSrc.includes("nvIcon(stIcon, 12)") // 工作流清单 12px
    && clientSrc.includes("nvIcon(id === 'workflow' ? 'refreshCw' : id === 'data' ? 'database' : id === 'publish' ? 'cloudUpload' : 'inbox', 12)") // 案卷页签 12px（workflow/data/publish/requests 四元）
    && clientSrc.includes("nvIcon('triangleAlert', 12)") && clientSrc.includes("nvIcon('check', 10)")      // 角标/章节标记/审计（S2 左栏行内 10px）
    && clientSrc.includes("nvIcon('folderOpen', 24)")                                                     // 空态 24px 淡图标
    && !clientSrc.includes("'🔍'") && !clientSrc.includes("'🗑'") && !clientSrc.includes("'⇄'") && !clientSrc.includes("'⟳'") && !clientSrc.includes("'☆'")
    && !clientSrc.includes("'✕'") && !clientSrc.includes("'▸'") && !clientSrc.includes("'▾'") && !clientSrc.includes("'📄'")
    && !clientSrc.includes("'✅'") && !clientSrc.includes("'🔄'") && !clientSrc.includes("'⬜'")
})(), 'ux053 icons missing')
check('客户端源码面：UX-053 焦点双环统一（Vercel 模式：2px bg 缓冲 + 4px accent@60%；搜索框 45% 软焦点变体；树行/章节行 :focus-visible 补位；三处旧分散焦点样式无残留）', (() => {
  const ring60 = 'box-shadow:0 0 0 2px var(--nv-bg,#0b0e14),0 0 0 4px rgba(79,142,247,.6);box-shadow:0 0 0 2px var(--nv-bg,#0b0e14),0 0 0 4px color-mix(in srgb,var(--nv-accent,#4f8ef7) 60%,transparent)'
  return (clientSrc.match(/box-shadow:0 0 0 2px var\(--nv-bg,#0b0e14\),0 0 0 4px rgba\(79,142,247,\.6\)/g) ?? []).length === 5   // 卡片/输入/树行/章节行 + rail 按钮（UX-061-P2 增，含 rgba 兜底段）
    && clientSrc.includes('.nv-csearch:focus-within{border-color:var(--nv-accent,#4f8ef7);box-shadow:0 0 0 2px var(--nv-bg,#0b0e14),0 0 0 4px rgba(79,142,247,.45)')  // 搜索框 45% 软焦点
    && clientSrc.includes('.nv-cinput:focus{border-color:var(--nv-accent,#4f8ef7);' + ring60)
    && clientSrc.includes('.nv-ccard[data-focus=true]{border-color:var(--nv-accent,#4f8ef7);' + ring60)
    && clientSrc.includes('.nv-ft-row:focus-visible{outline:none;' + ring60)
    && clientSrc.includes('.nv-chrow:focus-visible{outline:none;' + ring60)
    && !clientSrc.includes('.nv-csearch:focus-within{border-color:var(--nv-accent,#4f8ef7);box-shadow:0 0 0 3px')   // 旧搜索 3px 光圈无残留（nv-dot 25% 光晕同为 3px 环——用完整规则前缀区分）
    && !clientSrc.includes('0 0 16px rgba(79,142,247,.25)')    // 旧卡片 16px 光晕无残留
})(), 'ux053 focus ring missing')
check('客户端源码面：UX-053 光效收敛（.nv-csweep 扫光清除负断言 / glow = 中性边框+顶部 2px 状态条 color-mix 70% / nv-dot 微光收敛）', (() => {
  return !clientSrc.includes('.nv-csweep') && !clientSrc.includes('nv-sweep') && !clientSrc.includes('nv-csweep')
    && clientSrc.includes(".nv-ccard[data-glow=need]{border-color:var(--nv-border-strong,#3a4150);box-shadow:inset 0 2px 0 0 rgba(210,153,34,.7);box-shadow:inset 0 2px 0 0 color-mix(in srgb,var(--nv-warn,#d29922) 70%,transparent)}")
    && clientSrc.includes(".nv-ccard[data-glow=done]{border-color:var(--nv-border-strong,#3a4150);box-shadow:inset 0 2px 0 0 rgba(63,185,80,.7);box-shadow:inset 0 2px 0 0 color-mix(in srgb,var(--nv-ok,#3fb950) 70%,transparent)}")
    && clientSrc.includes(".nv-ccard[data-glow=busy]{border-color:var(--nv-border-strong,#3a4150);box-shadow:inset 0 2px 0 0 rgba(79,142,247,.7);box-shadow:inset 0 2px 0 0 color-mix(in srgb,var(--nv-accent,#4f8ef7) 70%,transparent)}")
    // UX-061 1b（DEC-155 方向 A）：书卡去渐变/去重阴影 → 表面令牌 + hover 令牌（迁移表见 docs/verification/UX-061-assertion-migration.md）
    && clientSrc.includes('.nv-ccard{position:relative;display:flex;flex-direction:column;gap:var(--nv-sp-2);box-sizing:border-box;padding:16px;border:1px solid var(--nv-border-strong);border-left:3px solid var(--nv-border-strong);border-radius:var(--nv-r-xl);background:var(--nv-surface);box-shadow:none;')
    && clientSrc.includes('.nv-ccard:hover{border-color:var(--nv-accent);border-left-color:var(--nv-accent)}')
    && !clientSrc.includes('background:linear-gradient(135deg,color-mix(in srgb,var(--nv-fg,#e6e8eb) 4%,transparent)')  // 书卡渐变已撤除（DEC-155）
    && !clientSrc.includes('rgba(255,255,255,.07),rgba(255,255,255,.02) 45%')   // 旧峰值/45% stop 无残留
    && !clientSrc.includes('0 0 22px rgba(210,153,34') && !clientSrc.includes('box-shadow:0 0 24px rgba(79,142,247')  // 大辉光无残留（卡面 box-shadow 域；UX-055 hero 为 drop-shadow 光晕不冲突）
})(), 'ux053 glow converge missing')
check('客户端源码面：UX-053 令牌化与其它（color-mix + rgba 兜底双声明 / 字重三档 700→600 / 选中态类化 .nv-ft-row[data-sel]/.nv-chrow[data-sel] / 空态 flex 图标 / 弹窗双层阴影 / 排序 pill 8% 底 + 徽标 pill 999）', (() => {
  const cm = 'color-mix(in srgb,var(--nv-accent,#4f8ef7)'
  return clientSrc.includes('background:rgba(79,142,247,.12);background:' + cm + ' 12%,transparent)')   // nv-cbtn-ws（双声明）
    && clientSrc.includes('background:rgba(79,142,247,.2);background:' + cm + ' 20%,transparent)')      // nv-cbtn-ws hover 22→20%
    && clientSrc.includes('background:rgba(79,142,247,.08);background:' + cm + ' 8%,transparent)')      // cplus hover / csortbtn 选中（8% 底）
    && clientSrc.includes('.nv-ccard-badge{') && clientSrc.includes('border-radius:999px') && clientSrc.includes('font-weight:500') && clientSrc.includes('letter-spacing:.02em')  // 徽标 pill 化
    && clientSrc.includes('.nv-ft-row{background:transparent;transition:') && clientSrc.includes('.nv-ft-row[data-sel=true]{background:rgba(79,142,247,.12);background:' + cm + ' 12%,transparent)}')
    && clientSrc.includes('.nv-chrow[data-sel=true]{background:transparent;color:var(--nv-fg);box-shadow:inset 2px 0 0 0 var(--nv-accent)}')  // UX-061-B 选中=左竖线+主色文字
    && !clientSrc.includes("TK.line, background: 'transparent',\n")   // F1 回归防护：章节行内联 background 已删（内联特异性压过 [data-sel] 选中态；带换行特征避开 btn 常量同行串）
    && !clientSrc.includes("border: 'none', background: 'transparent'")   // F1 回归防护：文件树行内联 background 已删
    && clientSrc.includes('fontWeight: 600') && !clientSrc.includes('fontWeight: 700')                  // 字重三档（无 700 残留）
    && clientSrc.includes('.nv-empty{display:flex;flex-direction:column;align-items:center;gap:6px;')
    && clientSrc.includes('box-shadow:var(--nv-shadow,0 8px 24px rgba(0,0,0,.4)),0 0 0 1px rgba(0,0,0,.25)')  // 弹窗双层阴影
    && clientSrc.includes('.nv-modal{') && clientSrc.includes('box-shadow:var(--nv-shadow,0 8px 24px rgba(0,0,0,.4)),0 0 0 1px rgba(0,0,0,.25)')
    && clientSrc.includes('color-mix(in srgb,var(--nv-warn,#d29922) 25%,transparent)')  // nv-dot 微光 token 化
    && clientSrc.includes('.nv-ft-glyph{') && clientSrc.includes('rotate(90deg)')                        // 目录箭头 rotate 过渡
})(), 'ux053 tokens missing')
// UX-055（DEC-021 修订版——主题无关自适应 + DEC-022 定向授权；V7 真实截图差距分析驱动：
//  字阶无对比/书卡纯文本堆叠无构成/70% 空白零处理/✓✗ 无色彩语义/正文无节奏）：
//  ①字阶悬崖（TYPO 单点常量：page 20/cardTitle 17/stat 18/body 15·1.75/meta 11/empty 28——参照 5.8 倍极差）
//  ②书卡构成重构（monogram 40×40 accent 14% 色块 + 标题 17px + 1px 分隔 + 数据 chips 6%/9% 派生 + 底部状态带）
//  ③空态英雄区（48px 图标 accent 20% + 光晕 + 28px 大字 + 主按钮；0 本书隐藏网格/磁贴）+ 稀疏居中（≤2 本 justify-content:center）
//  ④状态文案组件化（.nv-chip data-tone ok/warn/danger/muted——状态色 tint 双声明；发布记录 ✓/✗→6px 圆点；noData 新值）
//  ⑤正文阅读排版（15px/1.75/段距 .75em/章节标题 16px+分隔线；编辑 textarea 同步）
//  ⑥细节统一（抽屉小卡 13.5px/当前阶段行 accent 8%+左缘条/排序 pill 600/tabular-nums 数字/＋磁贴 label-primary 15% 虚线）
check('客户端源码面：UX-055① 字阶悬崖（TYPO 单点常量关键值 + page/cardTitle/body/bodyLh 引用面 + 无旧值残留）', (() => {
  return clientSrc.includes('const TYPO = {')
    // UX-061 1b P1-D2：TYPO 收敛为「语义名 → --nv-fs-*」唯一映射（JS 侧不持 px；数值唯一来源 = :root 令牌）
    && clientSrc.includes("page: 'var(--nv-fs-display)'") && clientSrc.includes("cardTitle: 'var(--nv-fs-display-s)'")
    && clientSrc.includes("stat: 'var(--nv-fs-stat)'") && clientSrc.includes("body: 'var(--nv-fs-body)'")
    && clientSrc.includes("bodyLh: 'var(--nv-lh-reading)'") && clientSrc.includes("meta: 'var(--nv-fs-base)'") && clientSrc.includes("empty: 'var(--nv-fs-hero)'")
    // UX-061 1b DR2/CR2 P0-1 守卫：TYPO 值已含单位 ⇒ 任何 + 'px' 拼接都会生成 var(...)px 失效值
    && !/TYPO\.[A-Za-z]+\s*\+\s*'px/.test(clientSrc)          // 负断言：TYPO + 'px' 命中数必须为 0
    && !/TYPO\.[A-Za-z]+\s*\+\s*["']px/.test(clientSrc)       // 1b-2 G-1：单/双引号拼接均须为 0
    && !/\$\{TYPO\.[A-Za-z]+\}px/.test(clientSrc)             // 1b-2 G-1：模板字面量 ${TYPO.x}px 形态亦须为 0
    && !/var\(--nv-[a-z-]+\)px/.test(clientSrc)               // 1b-2 G-1：产出形状负断言（var(...)px 为非法值）
    && /font-size:' \+ TYPO\./.test(clientSrc)                  // 正断言：CSS 内 font-size 走 TYPO 单源（无 px 拼接）
    && clientSrc.includes('--nv-fs-display:20px') && clientSrc.includes('--nv-fs-base:12px') && clientSrc.includes('--nv-fs-stat:18px') && clientSrc.includes('--nv-fs-chapter:16px')
    && clientSrc.includes('TYPO.page')        // 页面标题（管理台标题/创作台书名 20px）
    && clientSrc.includes('TYPO.cardTitle')   // 书卡标题 17px
    && clientSrc.includes("stat: 'var(--nv-fs-stat)'")        // 统计字阶常量保留（S2 状态栏不再渲染 18px 统计数字）
    && clientSrc.includes("body: 'var(--nv-fs-body)'") && clientSrc.includes("bodyLh: 'var(--nv-lh-reading)'")   // 常量保留（存量令牌白名单）
    // UX-063 第③步迁移：正文区改走 `--nv-fs-reading`（16/1.9）⇒ TYPO.body/bodyLh **不再被正文消费**
    && !clientSrc.includes('TYPO.body') && !clientSrc.includes('TYPO.bodyLh')
    && clientSrc.includes('TYPO.meta')        // meta 11px
    && clientSrc.includes('TYPO.empty')       // 空态 28px
    && clientSrc.includes('fontVariantNumeric: \'tabular-nums\'')             // 统计数字/正文标题 tabular
    && !clientSrc.includes('font-size:16px;font-weight:600;color:var(--nv-fg,#e6e8eb);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}')  // 旧书卡标题 16px 无残留
    && !clientSrc.includes('.nv-console-title{flex:none;display:inline-flex;align-items:center;gap:6px;font-size:16px')
})(), 'ux055 typography missing')
check('客户端源码面：UX-061 P2 rail 状态短标签（DR2 P1：可见文字只经 railStatus*、6 态 × zh/en 成对、长度上限 zh≤6 / en≤14）', (() => {
  const keys = ['railStatusIdle', 'railStatusRunning', 'railStatusBusy', 'railStatusUnbound', 'railStatusStale', 'railStatusDegraded']
  const found = []
  const re = /railStatus[A-Za-z]+: ['"]([^'"]*)['"]/g
  let m
  while ((m = re.exec(clientSrc)) !== null) found.push(m[1])
  const hasEach = keys.every((k) => clientSrc.includes("t('" + k + "')"))
  const zh = found.filter((v) => /[\u4e00-\u9fff]/.test(v))
  const en = found.filter((v) => !/[\u4e00-\u9fff]/.test(v))
  const maxZh = zh.length === 6 && zh.every((v) => Array.from(v).length <= 6)
  const maxEn = en.length === 6 && en.every((v) => v.length <= 14)
  // UX-064 S2：左栏从属状态行 = .nv-rb-wf-status；短标签单点收口在 railStatusText 计算块
  const start = clientSrc.indexOf('const railStatusText =')
  const seg = start >= 0 ? clientSrc.slice(start, start + 900) : ''
  // CR3 收紧：段内**每一个** t('...') 调用都必须在 6 键白名单内（换名字的长键也拦得住）
  const calls = Array.from(seg.matchAll(/t\((['"])([A-Za-z]+)\1\)/g)).map((x) => x[2])
  const onlyWhitelisted = calls.length > 0 && calls.every((k) => keys.includes(k))
  const banned = /t\((['"])(sessionsMissing|wfRunning|wfIdle|unbound|stale|railBusy)\1\)/
  const onlyShort = seg !== '' && !banned.test(seg)
  return hasEach && found.length === 12 && maxZh && maxEn && onlyWhitelisted && onlyShort
})(), 'ux061 rail status labels')

check('客户端源码面：UX-061 阶段 2 B-9 阅读宽度令牌（--nv-measure 定义 + .nv-content/.nv-edwrap 消费 + 居中口径）', (() => {
  return clientSrc.includes('--nv-measure:34em')
    && clientSrc.includes('.nv-content{max-width:var(--nv-measure,34em);margin:0 auto}')
    && clientSrc.includes('.nv-edwrap{max-width:calc(var(--nv-measure,34em) + 26px);margin:0 auto;')
    && clientSrc.includes('font-size:var(--nv-fs-reading,16px);line-height:1.9}')   // 第③步：编辑区与阅读区同源 reading 16/1.9
})(), 'ux061 measure missing')

check('客户端源码面：UX-061 阶段 2 B-10 循环动画全零（@keyframes / animation: / infinite 三面均为 0）', (() => {
  return !/@keyframes/.test(clientSrc) && !/animation:/.test(clientSrc) && !/infinite/.test(clientSrc)
})(), 'ux061 loop animation residue')

check('客户端源码面：UX-061 P2 状态可感知与 CSS 卫生（rail 常驻状态文字 + 焦点双环 + 同选择器不重复定义）', (() => {
  const count = (needle) => clientSrc.split(needle).length - 1
  return clientSrc.includes("className: 'nv-rb-wf-status'")
    && clientSrc.includes("t('railStatusBusy')")
    && clientSrc.includes('.nv-rail .nv-wfctl-btn:focus-visible,.nv-rail .nv-wfctl-btn2:focus-visible{outline:none;box-shadow:0 0 0 2px var(--nv-bg,#0b0e14),0 0 0 4px rgba(79,142,247,.6)')
    && clientSrc.includes("'.nv-chrow{box-sizing:border-box;height:28px") && clientSrc.includes('font:inherit;font-size:var(--nv-fs-base)')
    && count("'.nv-chrow{") === 1 && count("'.nv-chrow[data-sel=true]{") === 1
    && count("'.nv-ccard-name{") === 1 && count("'.nv-content p{") === 1
    && !clientSrc.includes('background:rgba(79,142,247,.1);background:color-mix(in srgb,var(--nv-accent,#4f8ef7) 10%,transparent);box-shadow:inset 2px')
})(), 'ux061 p2 status/hygiene')

check('客户端源码面：UX-061 阶段 2 尺度令牌零未消费（定义集合 ⊆ 消费集合：26 个 --nv-{fs,sp,r,ctl,lh}-* 令牌每个至少 1 处 :root 之外的消费者；CR1 P3 口径：排除 :root 定义自身）', (() => {
  const families = ['fs', 'sp', 'r', 'ctl', 'lh']
  const rootMatch = /':root\\{([^\\n]*?)\\}',/.exec(clientSrc)
  const outside = rootMatch !== null ? clientSrc.replace(rootMatch[0], '') : clientSrc
  const defs = new Set()
  const re = new RegExp('--nv-(?:' + families.join('|') + ')-[a-z0-9-]+(?=\\s*:)', 'g')
  let m
  while ((m = re.exec(clientSrc)) !== null) defs.add(m[0])
  const unused = []
  for (const d of defs) {
    if (outside.split(d).length - 1 === 0) unused.push(d)
  }
  return defs.size >= 26 && unused.length === 0
})(), 'ux061 scale tokens unused: ' + (() => {
  const families = ['fs', 'sp', 'r', 'ctl', 'lh']
  const rootMatch = /':root\\{([^\\n]*?)\\}',/.exec(clientSrc)
  const outside = rootMatch !== null ? clientSrc.replace(rootMatch[0], '') : clientSrc
  const defs = new Set()
  const re = new RegExp('--nv-(?:' + families.join('|') + ')-[a-z0-9-]+(?=\\s*:)', 'g')
  let m
  while ((m = re.exec(clientSrc)) !== null) defs.add(m[0])
  const unused = []
  for (const d of defs) { if (outside.split(d).length - 1 === 0) unused.push(d) }
  return unused.join(',')
})())
check('客户端源码面：UX-061 1b-2 尺度令牌治理（CSS font-size 字面量 ⊆ 图标白名单 ∧ 控件令牌类清单逐一对应 ∧ 内联字号基线冻结）', (() => {
  // V-2（DR2/DR3 裁决）：**CSS 规则内** font-size 字面量只允许出现在「图标/字形尺寸」选择器上；
  // 文本字号一律走 --nv-fs-* 尺度令牌（数值唯一来源 = :root）。新增文本字面量即红。
  // 口径限定（CR1 P2-1）：React 内联 `fontSize:'Npx'` 属 1b-3 批次，本检查不覆盖其迁移，只做基线冻结。
  const ICON_FS_SELECTORS = ['.nv-bar .nv-mini', '.nv-console-head .nv-mini', '.nv-cico', '.nv-drawer-title-ico',
    '.nv-console-title-ico', '.nv-csearch-icon', '.nv-bar-ctl', '.nv-cplus-icon']
  const literalFsLines = clientSrc.split('\n').filter((l) => /font-size:\s*[0-9.]+px/.test(l))
  const literalSelectors = literalFsLines.map((l) => (l.match(/^\s*'([^'{]+)\{/) || [])[1] || '?')
  const scaleOnlyIcons = literalSelectors.length > 0 && literalSelectors.every((s) => ICON_FS_SELECTORS.includes(s))
  // V-1（DR2/DR3 裁决 + CR1 P2-2）：--nv-ctl-sm/md 必须有真实消费者，且逐类名对应（少一处即红）
  const CTL_CLASSES = [
    ['.nv-cbtn{min-height:var(--nv-ctl-sm)', 'cbtn'],
    ['.nv-cbtn-accent{min-height:var(--nv-ctl-sm)', 'cbtn-accent'],
    ['.nv-cfold{min-height:var(--nv-ctl-sm)', 'cfold'],
    ['.nv-csortbtn{min-height:var(--nv-ctl-sm)', 'csortbtn'],
    ['.nv-wfctl-btn{min-height:var(--nv-ctl-sm)', 'wfctl-btn'],
    ['.nv-wfctl-btn2{min-height:var(--nv-ctl-sm)', 'wfctl-btn2'],
  ]
  const ctlSmMapped = CTL_CLASSES.every(([needle]) => clientSrc.includes(needle))
  // CR1 P1：<input> 的 UA 默认 content-box ⇒ min-height 会落在内容盒（高度 44/50）。
  // 输入类 MUST 显式 border-box，且固定 --nv-ctl-md 档位（基类覆盖 `.nv-cmodal .nv-cinput`，同一元素）。
  const ctlMdMapped = clientSrc.includes('.nv-cinput{box-sizing:border-box;min-height:var(--nv-ctl-md)')
  const ctlSm = (clientSrc.match(/var\(--nv-ctl-sm\)/g) || []).length
  const ctlMd = (clientSrc.match(/var\(--nv-ctl-md\)/g) || []).length
  // P2-1（CR1）：React 内联字号基线冻结（44 处；11.5px×2 属尺度外，归 1b-3）——新增/变更即红，须同批更新基线
  // UX-061-B：章节行/数据面板内联字号随类化迁移（12px 基线 23→18），按实测重冻
  const INLINE_FS_BASELINE = '11.5px:2,11px:12,12px:15,13px:3,14px:1' // UX-067：旧设置页 loading 内联 13px 随重构退役（-1×13px）
  const inlineSizes = (clientSrc.match(/fontSize:\s*'([0-9.]+)px'/g) || []).map((s) => s.match(/'([0-9.]+)px'/)[1] + 'px')
  const inlineCount = {}
  for (const v of inlineSizes) inlineCount[v] = (inlineCount[v] || 0) + 1
  const inlineSig = Object.keys(inlineCount).sort().map((k) => k + ':' + inlineCount[k]).join(',')
  return scaleOnlyIcons && ctlSmMapped && ctlMdMapped && ctlSm === 6 && ctlMd === 1 && inlineSig === INLINE_FS_BASELINE
})(), 'ux061 scale token governance missing')
check('客户端源码面：UX-055② 书卡构成（UX-061-B：monogram 色块→左侧 3px 书脊线 + 数据 chips 6%/9% + 1px 分隔线 label-primary 8%）', (() => {
  return !clientSrc.includes('.nv-ccard-mono') && clientSrc.includes('border-left:3px solid var(--nv-border-strong)')  // UX-061-B：彩色块→书脊线
    && clientSrc.includes(".nv-ccard-name{flex:1;min-width:0;font-size:' + TYPO.cardTitle")  // 书名 17/600（TYPO.cardTitle → --nv-fs-display-s）
    && clientSrc.includes('.nv-ccard-sep{') && clientSrc.includes('color-mix(in srgb,var(--nv-fg,#e6e8eb) 8%,transparent)')
    && clientSrc.includes('.nv-ccard-chips{') && clientSrc.includes('.nv-ccard-chip{')
    && clientSrc.includes('color-mix(in srgb,var(--nv-fg,#e6e8eb) 6%,transparent)')  // chip 底 6%
    && clientSrc.includes('color-mix(in srgb,var(--nv-fg,#e6e8eb) 9%,transparent)')  // chip 边 9%
    && clientSrc.includes('padding:2px 8px;border-radius:6px')                 // 数据 chip 规格
    && clientSrc.includes("className: 'nv-ccard-chip'")                        // 数据 chip 渲染（章/字/信号）
    && !clientSrc.includes('const mono = titleStr') // 首字提取（surrogate-safe）
})(), 'ux055 card composition missing')
check('客户端源码面：UX-055③ 白 alpha 渐变清零（卡片背景无 rgba(255,255,255 渐变残留——令牌化完成）', (() => {
  // 硬门槛：渐变中白 alpha 硬编码 = 0；所有 rgba(255,255,255 仅允许 var(--dsw-alias-*) 兜底位
  const naked = clientSrc.match(/(?<!var\(--dsw-alias-[a-z0-9-]+[,)])\blinear-gradient\([^)]*rgba\(255,\s*255,\s*255/g)
  return (naked ?? []).length === 0
    && !clientSrc.includes('linear-gradient(135deg,rgba(255,255,255')
    && clientSrc.includes('.nv-ccard:hover{border-color:var(--nv-accent);border-left-color:var(--nv-accent)}') // UX-061 1b：hover 走语义表面令牌（渐变已撤除）
})(), 'ux055 white-alpha gradient cleared')
check('客户端源码面：UX-055④ 状态 chip 组件（.nv-chip + data-tone ok/warn/danger/muted 四态 color-mix 派生 + 卡片/门禁 chip 化 + noData 新值 zh/en + 发布记录状态点）', (() => {
  const tones = ['ok', 'warn', 'danger', 'muted']
  return tones.every((tn) => clientSrc.includes(".nv-chip[data-tone=" + tn + "]{"))
    && clientSrc.includes('.nv-chip[data-tone=danger]{background:rgba(229,72,77,.12);background:color-mix(in srgb,var(--nv-err,#e5484d) 12%,transparent);border:1px solid rgba(229,72,77,.25)') // 规格例：danger 12% 底 + 25% 边
    && clientSrc.includes('className: \'nv-chip\', \'data-tone\': novel.releaseAllowed === true ? \'ok\' : \'danger\'')   // 卡片发布 chip（已发布 ok / 未发布 danger）
    && clientSrc.includes("pubOn: '已发布'") && clientSrc.includes("pubOff: '未发布'")   // 卡片 meta 行文案
    && clientSrc.includes("monOff: '未开通变现'") && clientSrc.includes("monOn: '已开通变现'")
    && clientSrc.includes("pubOn: 'Published'") && clientSrc.includes("pubOff: 'Not published'") && clientSrc.includes("monOn: 'Monetized'") && clientSrc.includes("monOff: 'Not monetized'")
    && clientSrc.includes("noData: '尚无数据信号'") && clientSrc.includes("noData: 'No signals yet'")  // DEC-022 授权占位文案
    && clientSrc.includes("guardrails.release_allowed === true ? 'ok' : 'danger'")        // 门禁卡 chip
    && clientSrc.includes('.nv-status-dot{') && clientSrc.includes('.nv-status-dot[data-ok=true]{')   // 发布记录行 6px 圆点
    && clientSrc.includes("'aria-hidden': true, style: { marginLeft: '4px' } })")                   // 行尾状态点渲染
    && !clientSrc.includes("`${t('rel')}${relFlag}`") && !clientSrc.includes('relFlag')              // ✓/✗ 文本标记退役
})(), 'ux055 status chips missing')
check('客户端源码面：UX-055③⑥ 空态英雄区 + 稀疏居中（hero 门控 poll.data!==null && 0 本；grid 双门控 poll.data===null || 0 本——两分支互斥；≤2 本 auto-fit 420 模板+居中；＋磁贴 label-primary 15% 虚线 + 20px muted 图标）', (() => {
  return clientSrc.includes('className: \'nv-hero\'')
    && clientSrc.includes('poll.data !== null && novels.length === 0')              // P1-2：加载中/错误不闪现英雄区
    && clientSrc.includes('poll.data === null || novels.length === 0')              // P0-0（R2）：grid 双门控（加载中/0 本均不渲染网格——与 hero 同构互斥）
    && clientSrc.includes('.nv-hero{') && clientSrc.includes('.nv-hero-icon{')
    && clientSrc.includes('color:rgba(79,142,247,.2);color:color-mix(in srgb,var(--nv-accent,#4f8ef7) 20%,transparent)')  // accent 20% 图标（先 rgba 后 color-mix）
    && clientSrc.includes('drop-shadow(0 0 24px ')                                                    // 光晕
    && clientSrc.includes('TYPO.empty') && clientSrc.includes('.nv-hero-title{')
    && clientSrc.includes("t('heroStart')") && clientSrc.includes("heroStart: '从第一本书开始'") && clientSrc.includes("heroStart: 'Start your first novel'")
    && clientSrc.includes("className: 'nv-cbtn-accent nv-hero-btn'")                               // 主按钮（accent 实底 = 现有新建链）
    && clientSrc.includes("novels.length >= 1 && novels.length <= 2 ? { gridTemplateColumns: 'repeat(auto-fit,minmax(320px,420px))', justifyContent: 'center' } : undefined")  // P1-1：稀疏真居中（条件模板 + justify-content）
    && clientSrc.includes('.nv-cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))')                    // ≥3 本类模板不变（两分支差异）
    && clientSrc.includes('color-mix(in srgb,var(--nv-fg,#e6e8eb) 15%,transparent)')  // ＋磁贴 label-primary 15% 虚线
    && clientSrc.includes('.nv-cplus-icon{font-size:20px')                                        // ＋图标 20px muted
    && clientSrc.includes('.nv-cplus:hover{background:rgba(230,232,235,.04);background:color-mix(in srgb,var(--nv-fg,#e6e8eb) 4%,transparent)') // hover 4% 底
})(), 'ux055 hero + sparse missing')
check('客户端源码面：UX-055⑤ 正文阅读排版（第③步迁移：reading 16/1.9 + 中文首行缩进 2em / 段距 .8em + 章节标题 TYPO.chapter 分隔线 + textarea 同源 reading + tabular-nums 数字面）', (() => {
  return clientSrc.includes('.nv-content{font-size:var(--nv-fs-reading,16px);line-height:1.9')
    // 第③步（规格 §1C）：中文排版 = 首行缩进 2em + 段距 .8em（0.8em@16 = 12.8px）
    && clientSrc.includes('.nv-content p{text-indent:2em;margin:0 0 .8em;font-size:inherit;line-height:inherit}')
    && clientSrc.includes(".nv-content h2{font-size:var(--nv-fs-display);")             // 第③步 DR1 P1-1：章标题用存量 display 20（> 正文 16）
    && clientSrc.includes('.nv-chapter-sep{')
    && clientSrc.includes("className: 'nv-content'")
    && clientSrc.includes('.nv-sheet-title{margin:11px 0 0;font-family:var(--nv-serif);font-size:var(--nv-fs-studio-29)')  // S2 稿纸标题（阅读↔编辑同源）
    && clientSrc.includes('font-family:var(--nv-prose-family);font-size:var(--nv-prose-size);line-height:var(--nv-prose-lh)')  // UX-066：稿纸正文/编辑共用排版令牌（默认仍 16/1.95）
    && clientSrc.includes("'.nv-chip{flex:none;display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;box-sizing:border-box;font-size:' + TYPO.meta") // P2-1：.nv-chip 11px→TYPO.meta 引用面
})(), 'ux055 body typography missing')
check('客户端源码面：UX-055⑥ 细节统一（抽屉小卡 13.5px / 当前阶段行 accent 8% 底+左缘条 / 排序 pill 选中 600 / 数据/表格 tabular-nums / mono 首字块渲染）', (() => {
  return clientSrc.includes('TYPO.smallTitle')
    && clientSrc.includes('.nv-wf-row[data-cur=true]{background:rgba(79,142,247,.08);background:color-mix(in srgb,var(--nv-accent,#4f8ef7) 8%,transparent);box-shadow:inset 2px 0 0 0 var(--nv-accent,#4f8ef7)')
    && clientSrc.includes(".nv-csortbtn[data-on=true]{border-color:var(--nv-accent,#4f8ef7);color:var(--nv-accent,#4f8ef7);font-weight:600")
    && clientSrc.includes('fontVariantNumeric: \'tabular-nums\'')
    && clientSrc.includes('font-variant-numeric:tabular-nums')                       // 数据 chip/cmeta/正文标题
    && clientSrc.includes("'data-cur': current ? 'true' : undefined")                 // 当前阶段行 data-cur
})(), 'ux055 detail unify missing')
// 交付验证最终修复（A-prime——精确测量；两轮经验合并：A 根因①barRef 未绑定 .nv-bar→监听全未注册
//  ②右检「r.left > b.right」过滤重叠控件；B 残余缺陷=固定阈值 960 覆盖不了「960≤barW<~1300+书名宽」
//  组合）：leftClear = 书名 span 自然宽（rect.left + scrollWidth——不受 flex 裁剪/ellipsis 影响）+M(8)
//   ≤ 横幅左缘；rightClear = 横幅右缘 +M ≤ 右簇首个可见控件 min-left（ctl/note；无重叠过滤——
//   UX-059 启动钮迁出后右簇仅剩 .nv-bar-ctl/.nv-bar-note）；
//  任一不满足 → data-hidden（visibility:hidden 元素保留可测量）；RO 观察 bar/banner/title 三元素 +
//  window resize 兜底 + 切书名（scrollWidth 不触发 RO）deps 含 snap.novelId；BANNER_MIN_WIDTH 已删。
check('客户端源码面：交付验证最终修复 标题栏横幅碰撞防护（A-prime 精确测量：scrollWidth 自然宽 + 右簇 min-left 无重叠过滤 + 三元素 RO + BANNER_MIN_WIDTH 删除）', (() => {
  return clientSrc.includes("const [bannerCollides, setBannerCollides] = useState(false)")
    && clientSrc.includes("title.scrollWidth + M")                              // 书名自然宽（scrollWidth——不受 flex 裁剪）
    && clientSrc.includes("const t = title.getBoundingClientRect()")             // 标题 span rect（左缘基线）
    && clientSrc.includes('Math.min(rightStart, r.left)')                       // 右簇最小 left（天然覆盖重叠控件——无 r.left > b.right 过滤）
    && !clientSrc.includes('r.left > b.right')                                  // A 方案右检过滤形态负断言（注释已回避字面）
    && clientSrc.includes("querySelectorAll('.nv-bar-ctl, .nv-bar-note')")
    && clientSrc.includes('const M = 8')                                        // 安全边距 8px
    && clientSrc.includes('{ ref: barRef, className: \'nv-bar\' }')             // barRef 绑定 .nv-bar（A 根因①修复）
    && clientSrc.includes('ref: bannerRef') && clientSrc.includes('ref: titleTextRef')  // 测量 refs 全绑定
    && clientSrc.includes("if (snap.active !== true || barRef.current === null || bannerRef.current === null || titleTextRef.current === null) return undefined")
    && clientSrc.includes('new ResizeObserver(measure)')
    && clientSrc.includes('ro.observe(bannerRef.current)')                      // 三元素观察（bar/banner/title）
    && clientSrc.includes('ro.observe(titleTextRef.current)')
    && clientSrc.includes("window.addEventListener('resize', measure)")
    && clientSrc.includes("window.removeEventListener('resize', measure)")     // 监听器清理防泄漏
    && clientSrc.includes('if (ro !== null) ro.disconnect()')
    && clientSrc.includes('}, [snap.active, snap.novelId])')                    // 切书名重测（scrollWidth 不触发 RO）
    && clientSrc.includes("className: 'nv-bar-banner'")
    && clientSrc.includes("'data-hidden': bannerCollides === true ? 'true' : undefined")
    && clientSrc.includes('.nv-bar-banner[data-hidden=true]{visibility:hidden}')
    && !clientSrc.includes('BANNER_MIN_WIDTH')                                  // 固定阈值已删（B 残余缺陷方案弃用）
    && !clientSrc.includes('bannerNarrow')                                      // B 方案状态名无残留
    && clientSrc.includes("position: 'absolute', left: '50%', transform: 'translateX(-50%)'") // 横幅既有居中几何未动（宽窗零变化）
})(), 'banner collision guard missing')
// UX-057（用户截图红字反馈——绑定会话弹窗三修）：
//  ①「新建会话并绑定」accent 主按钮从列表尾部移到 bindPick 副标题之后、会话列表之前（视线第一落点）
//  ②只显示当前工作区的会话（meta.root 与 workspace.path 经 normPath 归一化匹配；无命中回退既有全分组）
//  ③会话分组默认折叠（折叠集 useState + open 重置 + chevron 旋转过渡 + 右侧会话数 i18n zh/en 成对）
check('客户端源码面：UX-057 绑定弹窗三修（bindNew 置顶 + normPath 当前工作区过滤/回退 + 分组默认折叠/chevron/会话数 i18n）', (() => {
  const pickIdx = clientSrc.indexOf("el('div', { style: hint }, t('bindPick'))")
  const btnIdx = clientSrc.indexOf("onClick: createAndBind")
  const listIdx = clientSrc.indexOf("wsList.loading ? el('div', { style: hint }, t('loading'))")
  return pickIdx !== -1 && btnIdx > pickIdx && btnIdx < listIdx                        // ① 按钮序：副标题后、列表前
    && clientSrc.includes("gap: '8px', margin: '8px 0'")                               // ① 新置顶按钮行
    && !clientSrc.includes("gap: '8px', marginTop: '10px'")                            // ① 旧尾部按钮行移除
    && clientSrc.includes(String.raw`const normPath = (p) => String(p ?? '').replace(/[\\/]+/g, '/').replace(/\/+$/, '').toLowerCase()`)  // ② 归一化（/ \ 统一+大小写不敏感+去尾分隔）
    && clientSrc.includes('const curWs = curRoot !== \'\' ? wsList.items.find((w) => normPath(w.path) === curRoot) : undefined')
    && clientSrc.includes('if (curWs !== undefined)')                                  // ② 只渲染当前工作区分支
    && clientSrc.includes('UX-057② 回退保护') && clientSrc.includes("t('bindOther')")    // ② 回退全分组保留
    && clientSrc.includes('const [expanded, setExpanded] = useState(new Set())')       // ③ 展开例外集（空 = 默认全折叠，早退之前）
    && clientSrc.includes('setExpanded(new Set())')                                    // ③ open 重置为全折叠（清空展开集）
    && clientSrc.includes("className: 'nv-group nv-bgroup'") && clientSrc.includes('onClick: () => toggleGroup(g.key)')
    && clientSrc.includes("el('button', { type: 'button', className: 'nv-group nv-bgroup'")  // R1 P2-1：分组头原生 button（键盘可达）
    && clientSrc.includes('key: normPath(curWs.path)') && clientSrc.includes('key: normPath(w.path)') && clientSrc.includes("key: '@others'")  // R1 P2-2：展开键唯一化
    && clientSrc.includes("transform: gOpen ? 'rotate(90deg)' : 'none'")               // ③ chevron 旋转过渡
    && clientSrc.includes("t('bindSessionsCount', g.sessions.length)")
    && clientSrc.includes('bindSessionsCount: (n) => `${n} 个会话`')                    // ③ i18n zh
    && clientSrc.includes('bindSessionsCount: (n) => `${n} sessions`')                 // ③ i18n en
    && clientSrc.includes('.nv-bgroup:hover{') && clientSrc.includes('.nv-bgroup-glyph{') && clientSrc.includes('.nv-bgroup-count{')  // ③ 可点击头样式
})(), 'ux057 bind dialog fixes missing')
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

// ── BUG-004：dsh 0.1.2-rc.1 客户端 API 表面迁移（适配层双表面 + last-non-null 联动）──
// 背景：0.1.2-rc.1 的 connection 服务无 .api；API 迁至 remote.<ns> 服务（位置参数、
// {ok,value|error} 无 .result 包装）+ workspaces 快照服务。适配层 makeHostApi 单点收口
// 特性检测，对外维持 {result:{ok,value,error}} 与单对象入参（44 处调用点零改动）。
const pkgJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

// ① 新表面：remote.settings 位置参数映射 + {result} 包装
{
  const calls = []
  const remoteSettings = {
    describe: () => { calls.push(['describe']); return Promise.resolve({ ok: true, value: { writable: true, namespaces: [{ ns: 'novel-writing', value: { enabled: true } }] } }) },
    update: (ns, patch, rev) => { calls.push(['update', ns, patch, rev]); return Promise.resolve({ ok: true, value: { ns } }) },
    mutate: (ns, ops, rev) => { calls.push(['mutate', ns, ops, rev]); return Promise.resolve({ ok: true, value: { ns } }) },
  }
  const api = clientExports.makeHostApi((n) => (n === 'remote.settings' ? remoteSettings : undefined), undefined)
  const r1 = await api.settings.describe({})
  check('BUG-004 新表面：settings.describe 无参调用 + {result} 包装', r1.result.ok === true && Array.isArray(r1.result.value.namespaces) && r1.result.value.namespaces[0].ns === 'novel-writing', JSON.stringify(r1))
  const r2 = await api.settings.update({ ns: 'novel-writing', patch: { enabled: false } })
  check('BUG-004 新表面：settings.update({ns,patch}) → 位置参数 (ns, patch, undefined)', calls.some((c) => c[0] === 'update' && c[1] === 'novel-writing' && c[2] !== undefined && c[2].enabled === false && c[3] === undefined) && r2.result.ok === true, JSON.stringify(calls))
  const r3 = await api.settings.mutate({ ns: 'novel-writing', ops: [{ op: 'unset', path: ['bindings', 'x'] }] })
  check('BUG-004 新表面：settings.mutate({ns,ops}) → 位置参数 (ns, ops, undefined)', calls.some((c) => c[0] === 'mutate' && c[1] === 'novel-writing' && Array.isArray(c[2]) && c[2][0].op === 'unset' && c[3] === undefined) && r3.result.ok === true, JSON.stringify(calls))
  const r4 = await api.settings.update({ ns: 'novel-writing', patch: { enabled: true } })
  // F1（BUG-004-R1 评审遗留 P2）：原断言把「返回 Promise 的 IIFE」当布尔用（Promise 恒真值
  // 且未被 await）→ 错误分支从未被验证。改为先 await 再判定（评审建议口径）。
  remoteSettings.update = () => Promise.resolve({ ok: false, error: { code: 'settings/invalid', message: 'boom' } })
  const rErr = await api.settings.update({ ns: 'x', patch: {} })
  check('BUG-004 新表面：错误分支透传（{ok:false,error} 原样入 .result）', r4.result.ok === true
    && rErr.result.ok === false && rErr.result.error.message === 'boom', JSON.stringify(rErr))
  remoteSettings.describe = () => Promise.reject(new Error('wire broke'))
  const rThrow = await api.settings.describe()
  check('BUG-004 新表面：底层抛错被捕获为 {ok:false,error}（不冒泡 TypeError）', rThrow.result.ok === false && rThrow.result.error.message === 'wire broke', JSON.stringify(rThrow))
  check('BUG-004 新表面：无关域缺席返回 undefined（apiHas 既有降级路径不破）', api.sessions === undefined && api.workspace === undefined && api.host === undefined && api.agentPresets === undefined)
}

// ② 新表面：remote.session（单数）——prompt 自动铸 requestId、create/cancel 直传
{
  const calls = []
  const remoteSession = {
    create: (req) => { calls.push(['create', req]); return Promise.resolve({ ok: true, value: { sessionId: 's-1', agentPreset: 'novel-writing' } }) },
    prompt: (req) => { calls.push(['prompt', req]); return Promise.resolve({ ok: true, value: { accepted: true } }) },
    cancel: (req) => { calls.push(['cancel', req]); return Promise.resolve({ ok: true, value: { accepted: true } }) },
  }
  const api = clientExports.makeHostApi((n) => (n === 'remote.session' ? remoteSession : undefined), undefined)
  const rc = await api.sessions.create({ cwd: 'D:/novels/n1' })
  check('BUG-004 新表面：sessions.create 请求直传（cwd/workspaceId 兼容）', calls[0][0] === 'create' && calls[0][1].cwd === 'D:/novels/n1' && rc.result.ok === true && rc.result.value.sessionId === 's-1')
  const p1 = await api.sessions.prompt({ sessionId: 's-1', mode: 'queue', content: [{ type: 'text', text: '开始' }] })
  const p2 = await api.sessions.prompt({ sessionId: 's-2', mode: 'queue', content: [{ type: 'text', text: '继续' }] })
  const pcalls = calls.filter((c) => c[0] === 'prompt')
  check('BUG-004 新表面：sessions.prompt 自动铸 requestId（非空字符串且两次不同）+ 字段映射', pcalls.length === 2
    && typeof pcalls[0][1].requestId === 'string' && pcalls[0][1].requestId !== '' && pcalls[0][1].requestId !== pcalls[1][1].requestId
    && pcalls[0][1].sessionId === 's-1' && pcalls[0][1].mode === 'queue' && Array.isArray(pcalls[0][1].content) && pcalls[0][1].content[0].text === '开始'
    && p1.result.ok === true && p2.result.ok === true, JSON.stringify(pcalls.map((c) => c[1])))
  const rx = await api.sessions.cancel({ sessionId: 's-1' })
  check('BUG-004 新表面：sessions.cancel({sessionId}) 直传', calls.some((c) => c[0] === 'cancel' && c[1].sessionId === 's-1') && rx.result.ok === true)
}

// ③ 新表面：remote.agentPresets.select 位置参数（agentId=sessionId）
{
  const calls = []
  const remotePresets = { select: (agentId, agentPreset) => { calls.push([agentId, agentPreset]); return Promise.resolve({ ok: true, value: 'novel-writing' }) } }
  const api = clientExports.makeHostApi((n) => (n === 'remote.agentPresets' ? remotePresets : undefined), undefined)
  const r = await api.agentPresets.select({ sessionId: 's-9', agentPreset: 'novel-writing' })
  check('BUG-004 新表面：agentPresets.select({sessionId,agentPreset}) → 位置参数 (agentId, agentPreset)', calls.length === 1 && calls[0][0] === 's-9' && calls[0][1] === 'novel-writing' && r.result.ok === true)
}

// ④ 新表面：remote.directoryPicker —— pick 值→{path}、cancel→value:null、createDirectory 位置参数、list 直传
{
  const calls = []
  let pickValue = 'D:\\AI\\writing'
  const remotePicker = {
    pick: () => { calls.push(['pick']); return Promise.resolve({ ok: true, value: pickValue }) },
    list: (path) => { calls.push(['list', path]); return Promise.resolve({ ok: true, value: { path: 'C:\\Users\\peter', home: 'C:\\Users\\peter', crumbs: [], entries: [], truncated: false } }) },
    createDirectory: (path, name) => { calls.push(['createDirectory', path, name]); return Promise.resolve({ ok: true, value: path + '\\' + name }) },
  }
  const api = clientExports.makeHostApi((n) => (n === 'remote.directoryPicker' ? remotePicker : undefined), undefined)
  const rp = await api.host.pickDirectory({})
  check('BUG-004 新表面：host.pickDirectory 值 string → {path} 包装', rp.result.ok === true && rp.result.value.path === 'D:\\AI\\writing')
  pickValue = null
  const rpc2 = await api.host.pickDirectory({})
  check('BUG-004 新表面：host.pickDirectory 取消（value=null）→ value:null（调用点 pickCancel 路径）', rpc2.result.ok === true && rpc2.result.value === null)
  const rc = await api.host.createDirectory({ path: 'D:\\AI\\writing', name: 'novel-002' })
  check('BUG-004 新表面：host.createDirectory({path,name}) → 位置参数 + 值 string → {path} 包装', calls.some((c) => c[0] === 'createDirectory' && c[1] === 'D:\\AI\\writing' && c[2] === 'novel-002') && rc.result.ok === true && rc.result.value.path === 'D:\\AI\\writing\\novel-002')
  const rl = await api.host.listDirectory({})
  check('BUG-004 新表面：host.listDirectory({}) → directoryPicker.list(undefined) + DirectoryListing 直传（home/path 在位）', calls.some((c) => c[0] === 'list' && c[1] === undefined) && rl.result.ok === true && rl.result.value.home === 'C:\\Users\\peter' && rl.result.value.path === 'C:\\Users\\peter')
}

// ⑤ 新表面：workspace.list 走 workspaces 快照（含 pending→ready 订阅等待，无轮询）+ create 走 remote.workspace
{
  let phase = 'ready'
  const listeners = new Set()
  const wsSvc = {
    list: {
      getSnapshot: () => ({ items: [{ workspaceId: 'w1', path: 'D:\\AI\\writing', title: 'writing', sessionIds: ['s-1'], createdAt: '', updatedAt: '' }], archivedSessionIds: [], state: 'idle', phase, error: null }),
      subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    },
  }
  const remoteWorkspace = { create: (req) => Promise.resolve({ ok: true, value: { workspace: { workspaceId: 'w2', path: req.path, title: '', sessionIds: [], createdAt: '', updatedAt: '' }, created: true } }) }
  const api = clientExports.makeHostApi((n) => (n === 'workspaces' ? wsSvc : n === 'remote.workspace' ? remoteWorkspace : undefined), undefined)
  const rl = await api.workspace.list({})
  check('BUG-004 新表面：workspace.list → workspaces 快照 items 包装 {result:{ok,value:{items}}}', rl.result.ok === true && Array.isArray(rl.result.value.items) && rl.result.value.items[0].workspaceId === 'w1' && rl.result.value.items[0].sessionIds.length === 1)
  phase = 'pending'
  const waitP = api.workspace.list({})
  setTimeout(() => { phase = 'ready'; for (const fn of listeners) fn() }, 20)
  const rw = await waitP
  check('BUG-004 新表面：workspace.list pending→ready 经 subscribe 等待（事件驱动非轮询）', rw.result.ok === true && rw.result.value.items[0].workspaceId === 'w1')
  phase = 'ready'
  const rc = await api.workspace.create({ path: 'D:\\AI\\writing\\novel-002' })
  check('BUG-004 新表面：workspace.create({path}) 请求直传 + value.workspace 保留', rc.result.ok === true && rc.result.value.workspace.workspaceId === 'w2' && rc.result.value.workspace.path === 'D:\\AI\\writing\\novel-002')
}

// ⑥ 旧宿主回退：connection.api 各域对象原样透传（引用相等）
{
  const legacySettings = { describe: () => {}, update: () => {}, mutate: () => {} }
  const legacySessions = { create: () => {}, prompt: () => {}, cancel: () => {} }
  const legacyWorkspace = { list: () => {}, create: () => {} }
  const legacyHost = { pickDirectory: () => {}, createDirectory: () => {}, listDirectory: () => {} }
  const legacyPresets = { select: () => {} }
  const connection = { api: { settings: legacySettings, sessions: legacySessions, workspace: legacyWorkspace, host: legacyHost, agentPresets: legacyPresets } }
  const api = clientExports.makeHostApi(() => undefined, connection)
  check('BUG-004 旧表面回退：connection.api 五域对象原样透传（无 remote.* 服务时）', api.settings === legacySettings && api.sessions === legacySessions && api.workspace === legacyWorkspace && api.host === legacyHost && api.agentPresets === legacyPresets)
}

// ⑦ 双表面皆无：各域 undefined（apiHas 全 false = 既有降级提示路径）
{
  const api = clientExports.makeHostApi(() => undefined, undefined)
  check('BUG-004 双表面皆无：五域全 undefined（apiHas 语义保持）', api.settings === undefined && api.sessions === undefined && api.workspace === undefined && api.host === undefined && api.agentPresets === undefined)
  const apiNullConn = clientExports.makeHostApi(() => undefined, { isLoopback: true, rpc: {} })
  check('BUG-004 新宿主 connection 无 .api：各域 undefined（不抛错不误报）', apiNullConn.settings === undefined && apiNullConn.workspace === undefined && apiNullConn.host === undefined)
}

// ⑧ last-non-null 会话联动守卫：X→null→Y 关、null→X 不关、X→X 不关、X→Y 关
{
  const decide = clientExports.shouldCloseOnCurrentChange
  const step = (states) => {
    // 模拟组件内 ref 演进：null 基准起步（seed 只记非空基准），逐值驱动守卫
    let ref = null
    let closes = 0
    for (const s of states) {
      if (decide(ref, s) === true) closes += 1
      if (s !== null && s !== undefined) ref = s
    }
    return closes
  }
  check('BUG-004 联动守卫：X→null→Y（跨工作区）触发关闭 1 次', step(['X', null, 'Y']) === 1)
  check('BUG-004 联动守卫：null→X 首个非空就位不关', step([null, 'X']) === 0)
  check('BUG-004 联动守卫：X→X 不关', step(['X', 'X']) === 0)
  check('BUG-004 联动守卫：X→Y（同工作区切换）关闭', step(['X', 'Y']) === 1)
  check('BUG-004 联动守卫：null 过渡不丢基准（X→null→X 不关）', step(['X', null, 'X']) === 0)
  check('BUG-004 联动守卫：源码两处守卫均改用 shouldCloseOnCurrentChange', clientSrc.includes('shouldCloseOnCurrentChange(prevCurrentRef.current, sessionsCurrent)') && clientSrc.includes('shouldCloseOnCurrentChange(splitPrevRef.current, splitCurrent)'), 'guard usage missing')
}

// ⑨ SettingsPage 无 api 不抛错（effect 真执行——守卫走 loadError 可读错误态）
{
  const sink = []
  mockReact.__effectSink.setList(sink)
  let renderErr2 = ''
  try {
    const r = slotRegs.find((x) => x.id === 'novel-writing')
    r.render({})
  } catch (e) { renderErr2 = e.message }
  let effectErr = ''
  for (const fn of sink) { try { fn() } catch (e) { if (effectErr === '') effectErr = e.message } }
  mockReact.__effectSink.setList(null)
  check('BUG-004 SettingsPage 无 api：渲染 + effect 执行均不抛 TypeError（守卫生效）', renderErr2 === '' && effectErr === '', renderErr2 + ' | ' + effectErr)
  check('BUG-004 SettingsPage 守卫源码面：refresh 前置 api/settings 存在性检查', clientSrc.includes("api.settings === undefined || typeof api.settings.describe !== 'function'"), 'guard literal missing')
}

// ⑩ 适配层单点收口 + connection.api 唯一引用 + package.json inject 包表
{
  // 剥注释后计数（文档注释提及不计——审查口径 = 代码级引用唯一）
  const noComments = clientSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const connApiCount = (noComments.match(/connection\.api/g) ?? []).length
  check('BUG-004 单点收口：connection.api 代码级引用仅 1 处（适配层回退分支内）', connApiCount === 1, 'count=' + connApiCount)
  check('BUG-004 单点收口：makeHostApi 特性检测函数唯一 + apply 经适配层取 api', clientSrc.includes('function makeHostApi(') && clientSrc.includes('makeHostApi((name) => ctx.get(name), connection)'), 'adapter wiring missing')
  const injectList = pkgJson.dsh?.client?.inject ?? []
  check('BUG-004 包表：dsh.client.inject 移除不存在的 dsh-client-runtime', !injectList.includes('@deepseek-ai/dsh-client-runtime'), JSON.stringify(injectList))
  check('BUG-004 包表：保留 locale/ui-settings/api-remotes（0.1.2-rc.1 实存包）', injectList.includes('@deepseek-ai/dsh-client-locale') && injectList.includes('@deepseek-ai/dsh-client-ui-settings') && injectList.includes('@deepseek-ai/dsh-api-remotes'))
}

// ── BUG-005：useSessions 稳定响应式 hook（服务后到自愈 / 撤离回退 / 函数引用恒定）──
// 旧 makeSessionsHook(svc) 按 apply 时的服务快照冻结：dsh 0.1.2-rc.1 的 sessions 服务由
// dsh-api-session-controller 提供，其 inject 的 remote.* 命名空间经 dsh-api-remotes **异步**
// 挂载 → apply 时恒缺席 → hook 恒 null → 全部消费端永久降级（无状态点/无「找到的会话」/
// 无会话联动退出 = BUG-004 实机遗留根因）。本节用「hooks 跨帧持久 + setter 触发重渲染 +
// useEffect deps/cleanup」的最小 React 语义 harness 驱动完整生命周期。
{
  const createMiniReact = () => {
    let inst = null
    let cursor = 0
    let pending = null
    let dirty = false
    let rendering = false
    let renders = 0
    const sameDeps = (a, b) => (a === undefined && b === undefined)
      || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Object.is(x, b[i])))
    const slot = (init) => {
      const i = cursor++
      if (!(i in inst.hooks)) inst.hooks[i] = typeof init === 'function' ? init() : init
      return i
    }
    const react = {
      createElement: (type, props, ...children) => (typeof type === 'function'
        ? type({ ...(props ?? {}), children })
        : { __el: true, type, props: props ?? {}, children }),
      useState: (init) => {
        const i = slot(init)
        const owner = inst
        return [owner.hooks[i], (next) => {
          if (inst !== owner) return
          const prev = owner.hooks[i]
          const v = typeof next === 'function' ? next(prev) : next
          if (Object.is(prev, v)) return // React bail-out 语义：同值不重渲染（强制扳机才有意义）
          owner.hooks[i] = v
          dirty = true
          if (!rendering) drain() // 渲染期外的 setState = 调度一次重渲染
        }]
      },
      useRef: (init) => { const i = slot({ current: init }); return inst.hooks[i] },
      useMemo: (fn) => fn(),
      /**
       * F1（BUG-009 R1，RISK-008）：`useSyncExternalStore` 的最小忠实实现——React 语义要求
       * ① 渲染期调用 `getSnapshot()`；② `subscribe` 引用变化即重订阅（旧订阅先退订）；
       * ③ 快照引用变化 ⇒ 该次用到它的渲染**不一致** ⇒ 重渲染一次（bail-out 的对偶）。
       * 本 harness 忠实于此：`force()` 走 `dirty`（与 setState 同路径），不制造额外渲染。
       */
      useSyncExternalStore: (subscribe, getSnapshot) => {
        const i = cursor++
        const prev = inst.hooks[i]
        const snap = getSnapshot()
        if (prev === undefined) {
          inst.hooks[i] = { sub: subscribe, cleanup: null, snap }
          if (pending !== null) pending.push({ run: () => subscribe(), setCleanup: (c) => { inst.hooks[i].cleanup = c }, wantsValue: false, onValue: null })
        } else if (prev.sub !== subscribe) {
          if (typeof prev.cleanup === 'function') { try { prev.cleanup() } catch { /* ignore */ } }
          inst.hooks[i] = { sub: subscribe, cleanup: null, snap }
          if (pending !== null) pending.push({ run: () => subscribe(), setCleanup: (c) => { inst.hooks[i].cleanup = c }, wantsValue: false, onValue: null })
        } else if (!Object.is(prev.snap, snap)) {
          inst.hooks[i] = { sub: subscribe, cleanup: prev.cleanup, snap }
          dirty = true
        }
        return snap
      },
      useEffect: (fn, deps) => {
        const i = cursor++
        const prev = inst.hooks[i]
        if (prev !== undefined && sameDeps(prev.deps, deps)) return
        if (prev !== undefined && typeof prev.cleanup === 'function') { try { prev.cleanup() } catch { /* ignore */ } }
        inst.hooks[i] = { deps, run: fn, cleanup: null }
        if (pending !== null) pending.push(inst.hooks[i])
      },
    }
    const runTasks = (tasks) => {
      for (const s of tasks) {
        try {
          const r = s.run()
          if (typeof s.setCleanup === 'function') s.setCleanup(r)
          else s.cleanup = r
        } catch { /* ignore */ }
        s.run = null
      }
    }
    const drain = () => {
      let out
      rendering = true
      try {
        do {
          dirty = false
          cursor = 0
          renders += 1
          pending = []
          out = inst.comp(inst.props)
          while (pending.length > 0) { const tasks = pending; pending = []; runTasks(tasks) }
        } while (dirty)
      } finally { rendering = false }
      return out
    }
    return {
      react,
      mount(Component, props) { inst = { hooks: [], comp: Component, props }; renders = 0; return drain() },
      render(props) { if (props !== undefined) inst.props = props; return drain() },
      unmount() {
        for (const h of inst.hooks) { if (h !== null && h !== undefined && typeof h.cleanup === 'function') { try { h.cleanup() } catch { /* ignore */ } } }
        inst = null
      },
      get renders() { return renders },
    }
  }

  const mini = createMiniReact()
  // 服务替身：形状镜像 node_modules 实证契约（sessions.list = getSnapshot/subscribe 快照，
  // subscribe 返回 disposer——@deepseek-ai/dsh-api-session-controller createSnapshotStore）
  let sessionsProvided = undefined
  const fakeCtx = { get: (name) => (name === 'sessions' ? sessionsProvided : undefined) }
  const mkStore = (snap0) => {
    let snap = snap0
    const subs = []
    return {
      subs,
      svc: { list: { getSnapshot: () => snap, subscribe: (fn) => { subs.push(fn); return () => { const k = subs.indexOf(fn); if (k >= 0) subs.splice(k, 1) } } } },
      set(next) { snap = next; for (const fn of subs.slice()) { try { fn() } catch { /* ignore */ } } },
    }
  }
  const Card = (props) => ({ ids: props.useSessions((s) => (Array.isArray(s.ids) ? s.ids : [])) ?? null })
  const RefCard = (props) => {
    seenRefs.push(props.useSessions)
    return { ids: props.useSessions((s) => (Array.isArray(s.ids) ? s.ids : [])) ?? null }
  }
  const FlatCard = (props) => ({ v: props.useSessions(() => null) === undefined ? 'undef' : 'null' })
  const seenRefs = []

  let ex2 = null
  let ex2Err = ''
  try {
    ex2 = capturedDef.factory((id) => { if (id === 'react') return mini.react; throw new Error('unexpected require: ' + id) })
  } catch (e) { ex2Err = e.message }
  check('BUG-005 二次工厂实例（mini-react 注入）可求值并导出 apply', ex2Err === '' && ex2 !== null && typeof ex2.apply === 'function', ex2Err)
  check('BUG-005 导出：makeSessionsHookReactive 进入纯函数测试面（与 makeHostApi 同口径）',
    ex2 !== null && typeof ex2.makeSessionsHookReactive === 'function'
    && typeof ex2.makeHostApi === 'function' && typeof ex2.shouldCloseOnCurrentChange === 'function',
    ex2 === null ? 'no-ex2' : typeof (ex2 !== null ? ex2.makeSessionsHookReactive : undefined))

  const hook = ex2 !== null && typeof ex2.makeSessionsHookReactive === 'function' ? ex2.makeSessionsHookReactive(fakeCtx) : null
  check('BUG-005 服务缺席时工厂仍返回函数（旧实现返回 null = 永久降级根因）', typeof hook === 'function', String(hook))
  check('BUG-005 hook 附 refresh() 通知面（服务增减由 apply 单一监听器转达）', hook !== null && typeof hook.refresh === 'function')

  const st = mkStore({ ids: ['s-1', 's-2'], byId: { 's-1': { id: 's-1', displayTitle: 'Alpha' }, 's-2': { id: 's-2', displayTitle: 'Beta' } }, current: 's-1' })

  // ① 服务缺席挂载：不抛错 + 返回 undefined + 不订阅
  let absentErr = ''
  let absentOut = null
  try { absentOut = mini.mount(RefCard, { useSessions: hook }) } catch (e) { absentErr = e.message }
  check('BUG-005 服务缺席挂载：hook 返回 undefined 不抛错（消费端 ?? null 容错）', absentErr === '' && absentOut !== null && absentOut.ids === null, absentErr)
  check('BUG-005 服务缺席挂载：不订阅（无对缺席服务的悬挂订阅）', st.subs.length === 0, 'subs=' + st.subs.length)

  // ② 服务后到：refresh 通知 → 已挂载实例重读 + 订阅（免重启自愈）
  sessionsProvided = st.svc
  let arriveErr = ''
  try { hook.refresh() } catch (e) { arriveErr = e.message }
  const arrived = mini.render()
  check('BUG-005 服务后到：已挂载实例经 refresh 重读取到值（React 面自愈）', arriveErr === '' && JSON.stringify(arrived.ids) === '["s-1","s-2"]', arriveErr + ' ids=' + JSON.stringify(arrived.ids))
  check('BUG-005 服务后到：建立 store 订阅（零轮询）', st.subs.length === 1, 'subs=' + st.subs.length)
  check('BUG-005 函数引用恒定：缺席→后到全程同一 hook 实例（条件调用形态 hook 数不翻转）',
    seenRefs.length >= 2 && seenRefs.every((r) => r === hook), 'frames=' + seenRefs.length + ' uniq=' + new Set(seenRefs).size)

  // ③ 快照更新经订阅驱动重读
  st.set({ ids: ['s-1'], byId: { 's-1': { id: 's-1' } }, current: 's-1' })
  const pushed = mini.render()
  check('BUG-005 订阅回调驱动重读：store.set → 订阅扳机 → 渲染期重算 → 取到新快照', JSON.stringify(pushed.ids) === '["s-1"]', JSON.stringify(pushed.ids))

  // ④ 服务撤离：退订 + 返回回 undefined（消费端容错）
  sessionsProvided = undefined
  hook.refresh()
  const left = mini.render()
  check('BUG-005 服务撤离：hook 返回回 undefined（不抛错）', left.ids === null, JSON.stringify(left.ids))
  check('BUG-005 服务撤离：解除订阅（不订阅已撤离服务）', st.subs.length === 0, 'subs=' + st.subs.length)

  // ⑤ 再次到位：换新 store 往返自愈
  const st2 = mkStore({ ids: ['s-9'], byId: { 's-9': { id: 's-9' } }, current: 's-9' })
  sessionsProvided = st2.svc
  hook.refresh()
  const again = mini.render()
  check('BUG-005 服务再次到位：切新 store 并重读（缺席→到位往返自愈 + 旧 store 退订）',
    JSON.stringify(again.ids) === '["s-9"]' && st2.subs.length === 1 && st.subs.length === 0,
    'ids=' + JSON.stringify(again.ids) + ' subs2=' + st2.subs.length + ' subs1=' + st.subs.length)

  // ⑥ 强制重渲染扳机：派生值不变（selector 恒 null）时服务增减仍须重渲染——
  //    degraded 派生自非 React 面（launcher.sessions），不重渲染则降级态永不解除
  mini.unmount()
  check('BUG-005 卸载清理：解除订阅（组件卸载无泄漏订阅）', st2.subs.length === 0, 'subs=' + st2.subs.length)
  const flatOut = mini.mount(FlatCard, { useSessions: hook })
  const afterMount = mini.renders
  hook.refresh() // 服务未变、派生值不变 → 仅强制扳机能让帧数增长
  check('BUG-005 派生值不变时服务增减仍触发重渲染（degraded 扳机，防降级卡死）+ 挂载无重渲染风暴',
    flatOut.v === 'null' && afterMount <= 3 && mini.renders > afterMount,
    'v=' + flatOut.v + ' mount=' + afterMount + ' after=' + mini.renders)
  mini.unmount()

  // ⑦ 形状不合格服务 = 缺席（保持既有形状校验口径，不抛错、不订阅）
  sessionsProvided = { list: { getSnapshot: () => ({ ids: [] }) } }
  let shapeErr = ''
  let shapeOut = null
  try { shapeOut = mini.mount(Card, { useSessions: hook }) } catch (e) { shapeErr = e.message }
  check('BUG-005 形状不合格服务（list 缺 subscribe）按缺席处理：不抛错、不订阅', shapeErr === '' && shapeOut.ids === null, shapeErr)
  mini.unmount()
  sessionsProvided = undefined

  // ⑧ apply 接线（grep 级——**剥注释后**判定，口径同 BUG-004 ⑩「代码级引用唯一」；
  //    本任务 JSDoc 大量提及旧实现名/消费端条件调用形态，计入会污染回归钉）
  const codeSrc = clientSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  check('BUG-005 apply 接线：hook 面改用 makeSessionsHookReactive(ctx)（不再吃 apply 时服务快照）',
    codeSrc.includes('const useSessionsH = makeSessionsHookReactive(ctx)')
    && !/makeSessionsHook\(/.test(codeSrc)
    && !codeSrc.includes("let sessionsSvc = ctx.get('sessions')"), 'wiring')
  check('BUG-005 冻结工厂退役：makeSessionsHook（按快照冻结返回 null 的旧实现）不再存在',
    !/function makeSessionsHook\b/.test(codeSrc) && codeSrc.includes('function makeSessionsHookReactive('))
  {
    const at = codeSrc.indexOf("ctx.on('internal/service'")
    const block = at >= 0 ? codeSrc.slice(at, at + 520) : ''
    const listenerCount = (codeSrc.match(/ctx\.on\('internal\/service'/g) ?? []).length
    // BUG-011：setup 增第三参 resolveService（uiWorkspace 等未 inject 服务的惰性解析通道）——钉死文本随之
    const setupRe = /launcher\.setup\(\{ api: base\.api, sessions: ctx\.get\('sessions'\), resolveService: \(n\) => ctx\.get\(n\) \}\)/g
    const setupCount = (codeSrc.match(setupRe) ?? []).length
    check('BUG-005 单一 internal/service 监听器同时刷新 launcher 面与 hook 面（合并监听不重复注册）',
      listenerCount === 1
      && block.includes("launcher.setup({ api: base.api, sessions: ctx.get('sessions'), resolveService: (n) => ctx.get(n) })")
      && block.includes('useSessionsH.refresh()') && block.includes("if (name !== 'sessions') return"),
      'listeners=' + listenerCount + ' block=' + JSON.stringify(block.slice(0, 220)))
    check('BUG-005 launcher 首装与 hook 同源：apply 期 launcher.setup 直读 ctx.get（无冻结局部变量）',
      setupCount === 2, 'count=' + setupCount)
    check('BUG-005 清理路径保持：监听 disposer 仍在 apply 返回函数内移除',
      codeSrc.includes('if (offServiceEvent !== null)') && codeSrc.includes('offServiceEvent()'))
    // ── BUG-011 客户端会话面双表面（0.2.0-rc.2：sessions.open 消失 / list 快照 current·completed 移出）──
    const currentSelectors = (codeSrc.match(/useSessions\(\(s\) => sessionsCurrentOf\(s\)\)/g) ?? []).length
    check('BUG-011 会话当前派生双表面：sessionsCurrentOf（0.1.x s.current 字段优先 → 0.2.0 retainedBy.mainView>0 派生）定义在场 ∧ 两消费面（控制台 sessionsCurrent / 分栏 splitCurrent）全部改走该 helper ∧ 旧裸 `typeof s.current` 选择器零残留',
      codeSrc.includes('function sessionsCurrentOf(s)') && codeSrc.includes("if (typeof s.current === 'string') return s.current")
      && codeSrc.includes('rb.mainView === \'number\' && rb.mainView > 0') && currentSelectors === 2
      && !/useSessions\(\(s\) => \(typeof s\.current === 'string'/.test(codeSrc),
      'selectors=' + currentSelectors)
    check('BUG-011 打开会话双通道：launcher.open 先 sessions.open（0.1.x）→ 回退 resolveSvc(\'uiWorkspace\').openSession（0.2.0；未 inject 服务经 try/catch 惰性探测，不抛 BUG-003 形态错）∧ 豁免令牌双分支等价（markOpened 因子化）',
      /open\(sessionId\) \{[\s\S]{0,400}typeof s\.open === 'function'[\s\S]{0,300}resolveSvc\('uiWorkspace'\)[\s\S]{0,200}typeof ws\.openSession === 'function'/.test(codeSrc)
      && codeSrc.includes('const markOpened = () => {'),
      'open-dual-channel')
  }
  // ⑨ 消费端与守卫零改动（回归钉：条件调用形态 + degraded 公式 + 联动守卫调用点）
  const neqCount = (codeSrc.match(/useSessions !== null/g) ?? []).length
  const eqCount = (codeSrc.match(/useSessions === null/g) ?? []).length
  const degradedCount = (codeSrc.match(/props\.useSessions === null \|\| launcher\.sessions === null/g) ?? []).length
  check('BUG-005 消费端零改动：条件调用守卫面恒定（useSessions !== null ×8 / === null ×4）',
    neqCount === 8 && eqCount === 4, 'neq=' + neqCount + ' eq=' + eqCount)
  check('BUG-005 守卫/降级判定零改动：degraded 公式 3 处 + 联动守卫两处调用点原样',
    degradedCount === 3
    && codeSrc.includes('shouldCloseOnCurrentChange(prevCurrentRef.current, sessionsCurrent)')
    && codeSrc.includes('shouldCloseOnCurrentChange(splitPrevRef.current, splitCurrent)'), 'degraded=' + degradedCount)
  check('BUG-005 适配层零改动：makeHostApi 单点收口与 connection.api 唯一引用保持',
    codeSrc.includes('function makeHostApi(') && codeSrc.includes('makeHostApi((name) => ctx.get(name), connection)')
    && (codeSrc.match(/connection\.api/g) ?? []).length === 1)

  // ── BUG-009：绑定写入后镜像读取不得停在旧值（行为级；CLEAN-004 D-2 的插件侧机制）──
  // 自动链的真实时序 = 「镜像先含该会话（sessions.create 的 added 事件）→ boundId 才随 overview
  // 轮询后到位」。旧实现把选中值冻结进 useState、只在 store 通知时重算 ⇒ 该帧 selector 明明已能
  // 命中却仍返回旧值（null）⇒ 卡片停「会话失效」，直到下一次**无关**的 store 通知才偶然收敛
  // （实测 ≥2′06″ 未收敛；`report-run1.json` 全程不收敛）。本断言即该时序的最小复现：
  // 第 2 帧（boundId 到位）MUST 立即命中；构造反例 = 去掉渲染期求值（恢复 useState 缓存）⇒ 必红。
  const stB = mkStore({ ids: ['s-bound'], byId: { 's-bound': { id: 's-bound', displayTitle: 'Bound' } }, current: 's-bound' })
  // 消费者与产品同形：selector 捕获 boundId（props 输入），命中返回 entry、未命中返回 null
  const BoundCard = (props) => ({
    hit: props.useSessions((s) => (props.boundId !== null && props.boundId !== undefined ? s.byId[props.boundId] ?? null : null)) !== null,
  })
  sessionsProvided = stB.svc
  let bug009Err = ''
  let b009First = null
  let b009Second = null
  try {
    b009First = mini.mount(BoundCard, { boundId: null, useSessions: hook })
    stB.set({ ids: ['s-bound'], byId: { 's-bound': { id: 's-bound', displayTitle: 'Bound' } }, current: 's-bound' })
    b009Second = mini.render({ boundId: 's-bound', useSessions: hook })
  } catch (e) { bug009Err = e.message }
  check('BUG-009 基线（反例防护）：boundId 未到位时 selector 未命中（谓词能区分两态，非恒真）',
    bug009Err === '' && b009First !== null && b009First.hit === false, bug009Err + ' hit=' + (b009First === null ? 'null' : b009First.hit))
  check('BUG-009 镜像先更新 + boundId 后到位 ⇒ 该帧即命中镜像 entry（不得停留旧值「会话失效」）',
    b009Second !== null && b009Second.hit === true, 'hit=' + (b009Second === null ? 'null' : b009Second.hit))
  mini.unmount()
  sessionsProvided = undefined
}

// ── F1（BUG-009 R1，RISK-008）：hook 渲染期读取改走 useSyncExternalStore 的**契约面**行为断言 ──
// 读面：`useSyncExternalStore(subscribeForCurrent, getSnapshotForRender)`。三条 React 契约 MUST 同时成立
// ① `getSnapshot` 引用**跨渲染稳定**且**返回值引用稳定**（返回每渲染新建对象 ⇒ React 判「持续变化」⇒
//    无限重渲染）；② 服务切换时订阅**换到新 store**（旧订阅退订）；③ 卸载退订（无泄漏订阅）。
// 本段用**带通知面**的 mini-react（`push=true`）真驱动：store 通知 → 订阅回调 → 重渲染。
{
  let f1Err = ''
  let usesyncOn = ''
  let snapStable = false
  let swapOk = false
  let cleanupOk = false
  let f1Direct = null
  let reactCallbackForwarded = 0
  try {
    const RENDER_CAP = 50   // F-03(b)：渲染步数上限（超限抛错 ⇒ 断言红，而非挂死）
    const notifyLog = []     // F-03(d)：store.notify 时各订阅者的分类记录（effect 通道 / React 回调）
    const createMiniReact2 = () => {
      let inst = null
      let cursor = 0
      let pending = null
      let dirty = false
      let rendering = false
      let renders = 0
      const sameDeps = (a, b) => (a === undefined && b === undefined)
        || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Object.is(x, b[i])))
      const slot = (init) => {
        const i = cursor++
        if (!(i in inst.hooks)) inst.hooks[i] = typeof init === 'function' ? init() : init
        return i
      }
      const runTasks = (tasks) => {
        for (const s of tasks) {
          try {
            const r = s.run()
            if (typeof s.setCleanup === 'function') s.setCleanup(r)
            else s.cleanup = r
          } catch { /* ignore */ }
          s.run = null
        }
      }
      const drain = () => {
        let out
        rendering = true
        try {
          do {
            dirty = false
            cursor = 0
            renders += 1
            // R1 F-03(b)：**渲染步数上限**——把「无限重渲染」从**挂死**转为**红灯**（防 getSnapshot
            // 每渲染新建对象这一核心风险的故障形态不可观测）。超限即抛，由外层 catch 记为失败。
            if (renders > RENDER_CAP) throw new Error('render cap exceeded: ' + renders + ' (>' + RENDER_CAP + ')')
            pending = []
            out = inst.comp(inst.props)
            while (pending.length > 0) { const tasks = pending; pending = []; runTasks(tasks) }
          } while (dirty)
        } finally { rendering = false }
        return out
      }
      const react = {
        useState: (init) => {
          const i = slot(init)
          const owner = inst
          return [owner.hooks[i], (next) => {
            if (inst !== owner) return
            const prev = owner.hooks[i]
            const v = typeof next === 'function' ? next(prev) : next
            if (Object.is(prev, v)) return
            owner.hooks[i] = v
            dirty = true
            if (!rendering) drain()
          }]
        },
        useRef: (init) => { const i = slot({ current: init }); return inst.hooks[i] },
        useMemo: (fn) => fn(),
        useSyncExternalStore: (subscribe, getSnapshot) => {
          const i = cursor++
          subArgs.push(subscribe)
          snapshotArgs.push(getSnapshot)
          const prev = inst.hooks[i]
          const snap = getSnapshot()
          if (prev === undefined) {
            // F-03(d)：把 React 生成的「变更通知回调」标上标识（store 侧据此区分 F1 通道与 effect 通道）
            const handler = () => { dirty = true }
            handler.__f1handler = true
            inst.hooks[i] = { sub: subscribe, cleanup: null, snap, deps: [] }
            if (pending !== null) pending.push({ run: () => subscribe(handler), setCleanup: (c) => { inst.hooks[i].cleanup = c } })
          } else if (prev.sub !== subscribe) {
            if (typeof prev.cleanup === 'function') { try { prev.cleanup() } catch { /* ignore */ } }
            const handler = () => { dirty = true }
            handler.__f1handler = true
            inst.hooks[i] = { sub: subscribe, cleanup: null, snap, deps: [] }
            if (pending !== null) pending.push({ run: () => subscribe(handler), setCleanup: (c) => { inst.hooks[i].cleanup = c } })
          } else if (!Object.is(prev.snap, snap)) {
            inst.hooks[i] = { sub: subscribe, cleanup: prev.cleanup, snap, deps: [] }
            dirty = true
          } else {
            inst.hooks[i].deps = []   // 标记本帧仍被使用（供 unmount 的 effect 语义清理）
          }
          return snap
        },
        useEffect: (fn, deps) => {
          const i = cursor++
          const prev = inst.hooks[i]
          if (prev !== undefined && sameDeps(prev.deps, deps)) return
          if (prev !== undefined && typeof prev.cleanup === 'function') { try { prev.cleanup() } catch { /* ignore */ } }
          inst.hooks[i] = { deps, run: fn, cleanup: null }
          if (pending !== null) pending.push(inst.hooks[i])
        },
      }
      return {
        react,
        mount(Component, props) { inst = { hooks: [], comp: Component, props }; renders = 0; return drain() },
        render(props) { if (props !== undefined) inst.props = props; return drain() },
        unmount() {
          for (const h of inst.hooks) { if (h !== null && h !== undefined && typeof h.cleanup === 'function') { try { h.cleanup() } catch { /* ignore */ } } }
          inst = null
        },
        /** 只跑 React 的 effect 清理（不置 inst=null）——供「卸载后订阅应为零」的契约断言观测。 */
        dispose() {
          for (const h of inst.hooks) {
            if (h === null || h === undefined) continue
            const live = h.deps !== undefined && h.deps !== null
            if (live && typeof h.cleanup === 'function') { try { h.cleanup() } catch { /* ignore */ } }
          }
        },
        get renders() { return renders },
      }
    }
    const mini2 = createMiniReact2()
    // 带通知面的 store 替身：`push` 逐订阅者发通知（模拟宿主 createSnapshotStore 的 notify）
    const f1ev = []
    let tagSeq = 0
    const mkStore2 = (snap0) => {
      const tag = String.fromCharCode(65 + (tagSeq++))
      let snap = snap0
      let subs = []
      return {
        get subs() { return subs },
        svc: {
          list: {
            getSnapshot: () => snap,
            subscribe: (fn) => {
              // F-03(d)：分类记录——React 传给 subscribe 的回调落地时会带上标识
              const kind = fn !== null && fn !== undefined && fn.__f1handler === true ? 'react' : 'effect'
              const wrapped = () => { notifyLog.push(kind); return fn() }
              subs.push(wrapped); f1ev.push('sub:' + tag + ':' + kind + ':' + subs.length)
              return () => { subs = subs.filter((f) => f !== wrapped); f1ev.push('off:' + tag + ':' + subs.length) }
            },
          },
        },
        push(next) { snap = next; for (const fn of subs.slice()) { try { fn() } catch { /* ignore */ } } },
        subscriberCount: () => subs.length,
      }
    }
    let svcNow = undefined
    const subArgs = []
    const snapshotArgs = []
    let subscribeForCurrentInUse = null
    const ctx2 = { get: (n) => (n === 'sessions' ? svcNow : undefined) }
    const ex3 = capturedDef.factory((id) => { if (id === 'react') return mini2.react; throw new Error('unexpected require: ' + id) })
    const hook3 = ex3.makeSessionsHookReactive(ctx2)
    const seenSnaps = []
    const Probe = (props) => {
      const v = props.useSessions((s) => (Array.isArray(s.ids) ? s.ids.join(',') : 'none'))
      seenSnaps.push(v)
      return { v }
    }
    const sA = mkStore2({ ids: ['a-1'], byId: {} })
    const sA0 = sA.subscriberCount()            // 挂载前 = 0
    const m0 = mini2.mount(Probe, { useSessions: hook3 })
    const subsAfterAbsentMount = sA.subscriberCount()   // 服务缺席 ⇒ 0
    svcNow = sA.svc
    hook3.refresh()
    const m1 = mini2.render()
    const subsAfterRefresh = sA.subscriberCount()
    usesyncOn = clientSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').includes('useSyncExternalStore(subscribeForCurrent, getSnapshotForRender)') ? 'wired' : 'unwired'
    // ── F-03(a)：F1 通道「订阅**在位**」的**直取**判据（不依赖两通道订阅计数的差分）──────────────
    // 量法：把由 `useSyncExternalStore` 收到的 `subscribe` **实参**（= 工厂级稳定件 `subscribeForCurrent`）
    // 在**当前活 store** 上直接订阅一次，以「本轮新增订阅数 + 退订有效 + 订阅者种类 = `react`」证明：
    // ① 它**确实订阅当前 store**（退化为「不订阅 / 返回 noop」⇒ 计数恒 0 ⇒ 必红）；
    // ② 它把 React 传入的回调**原样转交**（F-04：store 侧分类记录为 `react`）。
    f1Direct = (() => {
      const before = sA.subscriberCount()
      const sub = subArgs.length >= 1 ? subArgs[0] : null
      let off = null
      let handlerCalls = 0
      try { if (typeof sub === 'function') off = sub(() => { handlerCalls += 1 }) } catch { off = null }
      const during = sA.subscriberCount()
      // F-04 直接判据：**该订阅在 notify 时 MUST 调到我们传入的回调**（首版实现另订阅 `noop` ⇒ 恒 0 ⇒ 必红）
      sA.push({ ids: ['probe-forward'], byId: {} })
      if (typeof off === 'function') { try { off() } catch { /* ignore */ } }
      const after = sA.subscriberCount()
      return { before, during, after, offIsFn: typeof off === 'function', subIsFn: typeof sub === 'function', handlerCalls }
    })()
    const rendersBeforePush = mini2.renders
    sA.push({ ids: ['a-1', 'a-2'], byId: {} })
    const m2 = mini2.render()
    // 有界重渲染（防「getSnapshot 每渲染新建对象 ⇒ React 判持续变化 ⇒ 无限重渲染」这一**核心风险**）
    const rendersBounded = mini2.renders <= rendersBeforePush + 3
    // ①②：`subscribe` / `getSnapshot` 的**实参身份**跨渲染稳定（React 的「稳定包装」契约，可机核）；
    // 以及**产品 `getSnapshot` 实参自身**的返回值引用稳定（R1 F-03(c)：不再以 mock store 自身为观测对象）
    subscribeForCurrentInUse = subArgs.length >= 1 ? subArgs[0] : null
    const subArgsStable = subArgs.length >= 2 && subArgs.every((x) => Object.is(x, subArgs[0]))
    const snapFnStable = snapshotArgs.length >= 2 && snapshotArgs.every((x) => Object.is(x, snapshotArgs[0]))
    const productSnapA = snapshotArgs.length >= 1 ? snapshotArgs[0]() : null
    const productSnapB = snapshotArgs.length >= 1 ? snapshotArgs[0]() : null
    const productSnapshotStable = snapshotArgs.length >= 1 && Object.is(productSnapA, productSnapB)
    // F-03(d)：**只对 F1 通道敏感**的通知判据 —— store 通知时 `notifyLog` 是否记录到 `react`。
    // F-04 订正后 `subscribeForCurrent` 把 React 回调**原样转交** store；但 store 只记「回调被调用」，
    // 不记来源 ⇒ 由 `useSyncExternalStore` 侧把 handler 标 `__f1handler`（下）供 store 分类。
    snapStable = subArgsStable === true && snapFnStable === true && productSnapshotStable === true && rendersBounded === true
    if (process.env.NV_SMOKE_F1_DEBUG2 === '1') console.log('F1 pre-swap', JSON.stringify({ sA0, subsAfterAbsentMount, subsAfterRefresh, subCalls: sA.subCalls, offCalls: sA.offCalls, notifyLog, f1ev }))
    // ②服务切换：换新 store ⇒ **订阅确已换到新 store**（功能判据：新 store 的通知能驱动重渲染并取到新数据）
    const sB = mkStore2({ ids: ['b-1'], byId: {} })
    svcNow = sB.svc
    hook3.refresh()
    const m3 = mini2.render()
    sB.push({ ids: ['b-2', 'b-3'], byId: {} })
    const m4 = mini2.render()
    swapOk = m4 !== null && m4.v === 'b-2,b-3'
    // ③卸载：effect 清理跑完后订阅归零（两通道均不得留悬挂订阅）
    mini2.dispose()
    cleanupOk = sB.subscriberCount() === 0 && sA.subscriberCount() === 0
    mini2.unmount()
    // F-03(d) 诊断量（**不作断言**，如实标注覆盖边界，R2 N-5 去重 + N-4 措辞订正）：
    // · 本 harness 的换订判据 = **`subscribe` 引用变化**（`prev.sub !== subscribe`），与真实 React 一致
    //   （React 的订阅 effect 依赖 `[subscribe]`）；两者**都不含**「订阅对象 vs 当前 store」这一判据
    //   ——原注释的反向陈述有误，已按事实改写。
    // · 因 `subscribeForCurrent` 引用恒定 ⇒ **挂载后不换订** ⇒「渲染期 live 订阅收到 notify」这一面在
    //   本 mock 场景下**未被走到**（`reactCallbackForwarded=0` 即其表现）；回调转发的判据改由 ①b 的
    //   **直取探针**承担（不依赖换订语义）。
    // · **失败集未细分口径（R2 N-6c）**：受 `mockReact` 的 `useState`-on-instance 影响，构造性反例下
    //   会有连带项（如末条 `A-F9` 断言计数同步）；「恰 ①b 红」只对**该断言本身**成立，其余连带项成因
    //   已在 CHANGELOG 返工条目列明。
    reactCallbackForwarded = notifyLog.filter((x) => x === 'react').length
    if (process.env.NV_SMOKE_F1_DEBUG === '1') console.log('F1 facts', JSON.stringify({ sA0, subsAfterAbsentMount, subsAfterRefresh, rendersBounded, snapStable, productSnapshotStable, reactCallbackForwarded, cleanupOk, swapOk, m0, m1, m2, m3, m4, seenSnaps }))
  } catch (e) { f1Err = e instanceof Error ? e.message : String(e) }
  check('F1 读面接线：hook 渲染期读取走 useSyncExternalStore（工厂级稳定 subscribe + 稳定 getSnapshot）',
    f1Err === '' && usesyncOn === 'wired', f1Err + ' ' + usesyncOn)
  check('F1 约束①：getSnapshot 参数引用跨渲染恒定 ∧ **该实参自身**返回值引用稳定（非每渲染新建对象——防 React 判持续变化而无限重渲染）∧ 重渲染有界（超限抛错而非挂死）',
    f1Err === '' && snapStable === true, f1Err + ' stable=' + snapStable)
  check('F1 约束①b（F-03a）：F1 通道**真实订阅在位** —— `useSyncExternalStore` 收到的 `subscribe` 实参直取调用 ⇒ store 订阅 +1 ∧ 返回可用退订函数 ∧ 退订后归零 ∧ notify 时**调用到我们传入的回调**（F-04 回调转发的直接判据）',
    f1Err === '' && f1Direct !== null && f1Direct.subIsFn === true && f1Direct.offIsFn === true
    && f1Direct.during === f1Direct.before + 1 && f1Direct.after === f1Direct.before
    && f1Direct.handlerCalls >= 1,
    f1Err + ' direct=' + JSON.stringify(f1Direct))
  check('F1 约束②：服务切换后订阅换到新 store（新 store 的通知驱动重渲染并取到新数据；卸载后订阅全部退订）',
    f1Err === '' && swapOk === true, f1Err + ' swap=' + swapOk)
  check('F1 约束③：卸载退订（useSyncExternalStore 通道不留悬挂订阅）',
    f1Err === '' && cleanupOk === true, f1Err + ' cleanup=' + cleanupOk)
}

// ── COMPAT-002：宿主契约清单（lib/host-contract.mjs）× lib/client.js region 字面量对账（F8 首批）──
{
  const { hostContract } = await import('../lib/host-contract.mjs')
  const contractSrc = readFileSync(new URL('../lib/host-contract.mjs', import.meta.url), 'utf8')
  const codeOnly = clientSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '') // 剥注释——对账提取一律代码级（同 ⑩ 口径）

  // ① 契约结构：六面 52 项分布 11/14/8/7/7/5（面 3 含 COMPAT-003 F1 补录的 3.8；面 5 含 BUG-007 补录的 5.6、
  // BUG-011 补录的 5.7；面 2 含 BUG-011 补录的 2.14；面 4 含 BUG-011 补录的 4.7）
  const faceCount = {}
  for (const it of hostContract.items) faceCount[it.face] = (faceCount[it.face] ?? 0) + 1
  check('COMPAT-002 契约：六面 52 项全覆盖（面分布 11/14/8/7/7/5）',
    hostContract.items.length === 52 && [1, 2, 3, 4, 5, 6].every((f) => faceCount[f] === [11, 14, 8, 7, 7, 5][f - 1]),
    'items=' + hostContract.items.length + ' faces=' + JSON.stringify(faceCount))
  // ② schema：七字段齐全 + item 编号 face 前缀正确且面内连续（§3 溯源结构机检）
  const FIELDS = ['face', 'item', 'kind', 'symbol', 'file', 'line', 'necessity']
  check('COMPAT-002 契约：schema 七字段齐全 + item 编号面内连续（逐项可溯源分析 §3）',
    hostContract.items.every((it, i, arr) => FIELDS.every((k) => it[k] !== undefined)
      && it.item === it.face + '.' + it.item.split('.')[1]
      && (arr[i - 1] !== undefined && arr[i - 1].face === it.face
        ? Number(it.item.split('.')[1]) === Number(arr[i - 1].item.split('.')[1]) + 1
        : Number(it.item.split('.')[1]) === 1)),
    'fields/numbering')
  // ③ F10 口径：自有恰 1 项（3.7）+ 已消除恰 1 项（1.4）在册供历史勾稽
  const nec = {}
  for (const it of hostContract.items) nec[it.necessity] = (nec[it.necessity] ?? 0) + 1
  check('COMPAT-002 契约：F10 口径在册——自有恰 1 项（3.7）+ 已消除恰 1 项（1.4）',
    (nec.own ?? 0) === 1 && (nec.eliminated ?? 0) === 1
      && hostContract.items.some((it) => it.item === '3.7' && it.necessity === 'own')
      && hostContract.items.some((it) => it.item === '1.4' && it.necessity === 'eliminated'),
    JSON.stringify(nec))
  // ④ 纯数据守卫：零 import 语句 / 零函数定义 / 零箭头 / 零模板求值 + JSON 往返无损
  check('COMPAT-002 契约：纯数据零宿主 import 零运行时逻辑（JSON 往返无损）',
    !/^\s*import\b/m.test(contractSrc) && !contractSrc.includes('=>') && !/\bfunction\b/.test(contractSrc)
      && !contractSrc.includes('${') && JSON.stringify(JSON.parse(JSON.stringify(hostContract))) === JSON.stringify(hostContract),
    'pure-data guard')
  // ⑤ F8 槽位名双向对账：client.js slots.inject 提取面 ≡ 契约清单
  const rl = hostContract.regionLiterals
  const srcSlots = [...new Set([...codeOnly.matchAll(/slots\.inject\('([^']+)'/g)].map((m) => m[1]))]
  check('COMPAT-002 F8 槽位名对账：client.js slots.inject 提取面 ≡ 契约清单（双向 ⊆，3 槽位）',
    srcSlots.length === rl.slotNames.length && rl.slotNames.every((s) => srcSlots.includes(s)) && srcSlots.every((s) => rl.slotNames.includes(s)),
    'src=' + JSON.stringify(srcSlots) + ' contract=' + JSON.stringify(rl.slotNames))
  // ⑥ F8 服务名——inject 表双向对账
  const injectDecl = codeOnly.match(/const inject = \[([^\]]*)\]/)
  const srcInject = injectDecl !== null ? [...injectDecl[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
  check('COMPAT-002 F8 服务名对账（inject 表）：client.js 声明三服务 ≡ 契约清单',
    srcInject.length === rl.serviceNames.inject.length && rl.serviceNames.inject.every((s) => srcInject.includes(s)) && srcInject.every((s) => rl.serviceNames.inject.includes(s)),
    'src=' + JSON.stringify(srcInject))
  // ⑦ F8 服务名——ctx.get 字面目标双向对账
  const srcCtxGet = [...new Set([...codeOnly.matchAll(/ctx\.get\('([^']+)'\)/g)].map((m) => m[1]))]
  check('COMPAT-002 F8 服务名对账（ctx.get 目标）：connection/locale/sessions ≡ 契约清单（双向 ⊆）',
    rl.serviceNames.ctxGet.every((s) => srcCtxGet.includes(s)) && srcCtxGet.every((s) => rl.serviceNames.ctxGet.includes(s)),
    'src=' + JSON.stringify(srcCtxGet))
  // ⑧ F8 服务名——makeHostApi svc 域名双向对账（ctx.get(name) 的动态目标全集）
  const srcSvc = [...new Set([...codeOnly.matchAll(/\bsvc\('([^']+)'\)/g)].map((m) => m[1]))]
  check('COMPAT-002 F8 服务名对账（svc 域名）：remote.*/workspaces 六域 ≡ 契约清单（双向 ⊆）',
    rl.serviceNames.svcDomains.every((s) => srcSvc.includes(s)) && srcSvc.every((s) => rl.serviceNames.svcDomains.includes(s)),
    'src=' + JSON.stringify(srcSvc))
  // ⑨ F8 事件名双向对账（COMPAT-003 F3 修订：原为单向断言——删契约项或置空数组仍全绿，属真空方向）
  const srcEvents = [...new Set([...codeOnly.matchAll(/ctx\.on\('([^']+)'/g)].map((m) => m[1]))]
  check('COMPAT-002 F8 事件名对账：client.js ctx.on 提取面 ≡ 契约清单（双向 ⊆，COMPAT-003 F3 修订后）',
    srcEvents.length === rl.serviceNames.events.length
      && rl.serviceNames.events.every((e) => srcEvents.includes(e)) && srcEvents.every((e) => rl.serviceNames.events.includes(e)),
    'src=' + JSON.stringify(srcEvents) + ' contract=' + JSON.stringify(rl.serviceNames.events))
  // ⑩ F8 CSS 令牌——宿主令牌族收紧后双向对账（COMPAT-003 F2 修订：族由 --dsw-alias-* 放宽至 alias+shadow 13；S2 R2 再加 specific + business-accent = 17）
  const srcTokens = [...new Set([...codeOnly.matchAll(/--dsw-(?:alias|shadow|specific)-[a-z0-9-]*[a-z0-9]/g)].map((m) => m[0]))]
  // UX-061 P0：幽灵令牌零引用（宿主 0.2.1-rc.2 声明集内不存在的 6 项——曾 138 调用点静默回落）
  const GHOST_TOKENS = ['--dsw-alias-fill-l1', '--dsw-alias-state-accent-primary', '--dsw-alias-state-success', '--dsw-alias-state-warning', '--dsw-alias-state-danger', '--dsw-alias-bg-elevated']
  const ghostHits = GHOST_TOKENS.filter((t) => srcTokens.includes(t))
  check('COMPAT-002 F8 CSS 令牌对账（UX-061 语义层）：源码去重集合 ≡ 契约清单（双向 ⊆，golden 15 项——两侧同删仍须红）∧ 6 个已知幽灵令牌 0 引用',
    srcTokens.length === rl.cssTokens.length && rl.cssTokens.length === 17 && srcTokens.length === 17
      && rl.cssTokens.every((t) => srcTokens.includes(t)) && srcTokens.every((t) => rl.cssTokens.includes(t))
      && ghostHits.length === 0,
    'src=' + srcTokens.length + ' contract=' + rl.cssTokens.length + ' ghosts=' + JSON.stringify(ghostHits))
  // ⑪ F8 DOM selector——宿主耦合选择器提取面 ≡ 契约清单（.nv- 自有前缀除外）
  const srcSels = [...new Set([...codeOnly.matchAll(/querySelector(?:All)?\('([^']+)'\)/g)].map((m) => m[1]))].filter((s) => !s.startsWith('.nv-'))
  check('COMPAT-002 F8 DOM selector 对账：宿主耦合选择器提取面 ≡ 契约清单（.nv- 自有前缀除外，双向 ⊆）',
    rl.domSelectors.every((s) => srcSels.includes(s)) && srcSels.every((s) => rl.domSelectors.includes(s)),
    'src=' + JSON.stringify(srcSels))
  // ⑫ UX-063 P0-a（P-10 宿主耦合入契约）：宿主对话窗**操纵面**双向对账——
  //  item 3.3 在既有 margin/width 双压之外登记 position/zIndex/boxShadow/borderLeft/background
  //  （UX-063 抽屉 chrome）与右缘 48px 唤出条 DOM；机检对账面 = regionLiterals.viewAreaProps。
  //  双向 ⊆：契约声明集 ≡ 源码 `viewArea.style.<prop> =` 写面——任一侧增删必红；漏登记 =
  //  宿主（会话根 DOM 结构/样式宿主权重）变更时 CI·smoke·诊断三面零信号（P-10 实例同款）。
  const it33 = hostContract.items.find((it) => it.item === '3.3')
  const it37 = hostContract.items.find((it) => it.item === '3.7')
  const DECL_PROPS = Array.isArray(rl.viewAreaProps) ? rl.viewAreaProps : []
  const SRC_PROPS = [...new Set([...codeOnly.matchAll(/(?:this\.)?viewArea\.style\.([A-Za-z]+)\s*=/g)].map((m) => m[1]))]
  const VIEW_KEYS = ['position', 'zIndex', 'boxShadow', 'borderLeft', 'background', 'marginLeft', 'marginRight', 'width']
  check('P-10 UX-063/S2 契约 item 3.3 双向对账：regionLiterals.viewAreaProps（18 属性）≡ client.js viewArea.style 写面 ∧ position/zIndex/boxShadow 在内 ∧ DrawerHostAdapter 单点 ∧ 顶栏唯一抽屉入口（无悬浮右缘把手）∧ item 3.7 S2 R2 存储键',
    it33 !== undefined && it37 !== undefined
      && DECL_PROPS.length === 18 && SRC_PROPS.length === DECL_PROPS.length
      && DECL_PROPS.every((p) => SRC_PROPS.includes(p)) && SRC_PROPS.every((p) => DECL_PROPS.includes(p))
      && VIEW_KEYS.every((p) => DECL_PROPS.includes(p))
      && ['position', 'zIndex', 'boxShadow'].every((p) => it33.symbol.includes(p))
      && it33.symbol.includes('DrawerHostAdapter') && it33.symbol.includes('顶栏')
      && it33.note.includes('restoreViewArea')
      && !codeOnly.includes("className: 'nv-drawer-edge")   // S2 R2：悬浮把手删除（顶栏唯一入口）
      && codeOnly.includes("className: 'nv-bar-ctl nv-bar-drawer'")
      && !codeOnly.includes('const DRAWER_EDGE_W')
      && it37.symbol.includes('dsh.novel.studio.v2'),
    'src=' + JSON.stringify(SRC_PROPS) + ' decl=' + JSON.stringify(DECL_PROPS) + ' it33=' + (it33 !== undefined) + ' it37=' + (it37 !== undefined))

  // UX-064 S2（P-10）：可选宿主布局服务 + 原生会话抽屉稳定 data-* 钩子——双向 ⊆ 对账
  const RL64 = hostContract.regionLiterals
  const METHOD64 = RL64.optionalHostMethods !== undefined ? RL64.optionalHostMethods : {}
  const HOOKS64 = Array.isArray(RL64.conversationHooks) ? RL64.conversationHooks : []
  const CUSTOM64 = Array.isArray(RL64.viewAreaCustomProps) ? RL64.viewAreaCustomProps : []
  const SRC_CUSTOM64 = Array.isArray(clientExports.VIEW_AREA_TOKEN_PROPS) ? clientExports.VIEW_AREA_TOKEN_PROPS : []
  const methodList64 = Array.isArray(METHOD64.layout) ? METHOD64.layout : []
  check('P-10 UX-064 S2 / UX-067：可选宿主布局服务（ctx.get(\'layout\') + toggleSidebar 缺席不渲染）+ 原生抽屉稳定 data-* 钩子（4 项，双向 ⊆；无哈希类名）+ viewArea 11 宿主令牌内联兜底（双向 ⊆，不依赖 [data-nv-theme]）',
    RL64.serviceNames.ctxGet.includes('layout')
      && clientSrc.includes("ctx.get('layout')")
      && methodList64.length === 1 && methodList64[0] === 'toggleSidebar'
      && clientSrc.includes("rawService('layout')") && clientSrc.includes("typeof svc.toggleSidebar !== 'function'")
      && HOOKS64.length === 4 && HOOKS64.every((h) => clientSrc.includes(h))
      && CUSTOM64.length === 11 && SRC_CUSTOM64.length === 11
      && CUSTOM64.every((p) => SRC_CUSTOM64.includes(p)) && SRC_CUSTOM64.every((p) => CUSTOM64.includes(p))
      && clientSrc.includes('html[data-nv-drawer="1"] [data-phase]')
      && !clientSrc.includes('html[data-nv-drawer="1"][data-nv-theme]')
      && clientSrc.includes('const value = viewArea.style.getPropertyValue(prop)')
      && clientSrc.includes('savedTokens[prop] = value === VIEW_AREA_TOKEN_VALUES[prop]')
      && clientSrc.includes('viewArea.style.setProperty(prop, VIEW_AREA_TOKEN_VALUES[prop])')
      && clientSrc.includes('rememberTokens(viewArea)')
      && clientSrc.includes('node.style.removeProperty(prop)')
      && !/\[class\*="[A-Za-z0-9_]{4,}_/.test(clientSrc),
    'ctxGet=' + JSON.stringify(RL64.serviceNames.ctxGet) + ' methods=' + JSON.stringify(methodList64) + ' hooks=' + JSON.stringify(HOOKS64) + ' custom=' + SRC_CUSTOM64.length)
}

// ── COMPAT-003：宿主表面 fixtures 离线对账 + ci.yml mock 面钉（F1）+ 契约 file/line 活性（F5）──
// fixtures 来源口径：test/fixtures/host-surfaces/*.json 由同目录 extract.mjs 从真实包只读提取
// （npm pack tarball 解包 / 已安装闭包），每份头部 source 如实标注（真实包提取 vs 证据构造）。
{
  const { hostContract: hc } = await import('../lib/host-contract.mjs')
  const { extractHeredocs, staticExportKeys, dynamicMockExportKeys, mockFaces } = await import('./fixtures/host-surfaces/ci-mock-face.mjs')
  const hs = hc.hostSurface
  const fixtureUrl = (v) => new URL('./fixtures/host-surfaces/' + v + '.json', import.meta.url)
  const versions = Object.keys(hs.packages)
  const fixtures = Object.fromEntries(versions.map((v) => [v, JSON.parse(readFileSync(fixtureUrl(v), 'utf8'))]))
  const localName = (pkg) => pkg.replace('@deepseek-ai/', '')
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x))

  // ① fixtures 三版本齐备 + 溯源字段完整（source 标注真实来源；禁止无 source 的手写表面）
  // **版本维双向（COMPAT-014 A-F4，收口 REVIEW-COMPAT-007-R1 F4）**：原断言只以**契约 packages 键集**为循环源
  // ⇒ 新增第 4 份 fixture 文件对本断言与探测轨 ① 均不可见（「重建 fixtures 关红」的缝隙）；现同时枚举 fixtures
  // 目录并与契约键集双向对账（目录 ≡ 契约键集 ⇒ 只加文件或只改契约侧任一行为即红）。
  const fixtureFiles = readdirSync(new URL('./fixtures/host-surfaces/', import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort()
  check('COMPAT-003 fixtures：三版本宿主表面快照齐备（' + versions.join(' / ') + '）+ 溯源字段完整 + **fixtures 目录 ≡ 契约 packages 版本键集**（版本维双向，A-F4）',
    versions.length === 3
      && versions.every((v) => fixtures[v].schemaVersion === 1 && fixtures[v].task === 'COMPAT-003'
        && typeof fixtures[v].source === 'string' && fixtures[v].source.length > 30
        && fixtures[v].hostVersion === v && sameSet(Object.keys(fixtures[v].packages), hs.packages[v]))
      && JSON.stringify(fixtureFiles) === JSON.stringify([...versions].sort()),
    'versions=' + versions.length + ' packages=' + versions.map((v) => Object.keys(fixtures[v].packages).length).join('/') + ' files=' + JSON.stringify(fixtureFiles))

  // ①b C5 fixtures 内部版本一致性：非例外包 version MUST === hostVersion（本任务恰有「CLI 0.1.5-rc.1 vs
  // 子包 0.1.5-rc.2」的版本分歧教训）；cordis/schemastery 属独立版本族 → 契约显式例外表，且例外表 MUST 有实据
  // （双向：既防漏列例外，也防例外表腐化成「万能豁免」）。
  const versionMismatch = []
  for (const v of versions) {
    for (const [p, pkgFace] of Object.entries(fixtures[v].packages)) {
      if (hs.versionExceptions.includes(p)) continue
      if (pkgFace.version !== fixtures[v].hostVersion) versionMismatch.push(v + ':' + p + '@' + pkgFace.version + '≠' + fixtures[v].hostVersion)
    }
  }
  const staleExceptions = hs.versionExceptions.filter((p) => {
    const pkgFace = fixtures[hs.current].packages[p]
    return pkgFace === undefined || pkgFace.version === fixtures[hs.current].hostVersion
  })
  check('COMPAT-011 C5 fixtures 版本一致性：非例外包 packages[p].version ≡ hostVersion（' + versions.length + ' 版本 × ' + versions.map((v) => Object.keys(fixtures[v].packages).length).join('/') + ' 包）+ 例外表 ' + JSON.stringify(hs.versionExceptions) + ' 有实据',
    versionMismatch.length === 0 && staleExceptions.length === 0,
    'mismatch=' + JSON.stringify(versionMismatch) + ' stale=' + JSON.stringify(staleExceptions))

  // ② 契约声明面 ⊆ 现行 fixture 实测面（逐包导出依赖；contract ⊆ fixture 的机检形态）
  const missingExports = []
  for (const [pkg, names] of Object.entries(hs.requiredExports)) {
    const fx = fixtures[hs.current].packages[localName(pkg)]
    for (const n of names) if (fx === undefined || !fx.exports.includes(n)) missingExports.push(pkg + '.' + n)
  }
  check('COMPAT-003 契约⊆fixture：requiredExports 逐包 ⊆ fixtures[' + hs.current + '] 实测导出面（' + Object.keys(hs.requiredExports).length + ' 包）',
    missingExports.length === 0, 'missing=' + JSON.stringify(missingExports))

  // ③ eliminated 口径：现行 fixture 无已消除导出（settingsNamespace），与 item 1.4 necessity=eliminated 一致
  const stillExported = []
  for (const [pkg, names] of Object.entries(hs.eliminatedExports)) {
    const fx = fixtures[hs.current].packages[localName(pkg)]
    for (const n of names) if (fx !== undefined && fx.exports.includes(n)) stillExported.push(pkg + '.' + n)
  }
  check('COMPAT-003 消除口径：现行 fixture 不含 settingsNamespace（与 item 1.4 necessity=eliminated 一致）',
    stillExported.length === 0
      && hc.items.some((it) => it.item === '1.4' && it.necessity === 'eliminated' && it.symbol.includes('settingsNamespace')),
    'unexpected=' + JSON.stringify(stillExported) + ' fixture=' + JSON.stringify(fixtures[hs.current].packages['dsh-settings'].exports))

  // ④⑤⑥ 版本差异 golden（三标记 × 三版本）——value + origin 双机检（COMPAT-011 C4）：
  // 「三版本实测」措辞对 remoteNamespaceServicePackages 不成立（该值由命令行注入的注册表事实，origin
  // ='registry-metadata'）⇒ 本断言把 origin 纳入机检：静态提取类的 origin 由 fixture.extraction.layout 决定
  // （packed → 'tarball-static-extract'，checkout → 'checkout-static-extract'），防「注入值伪装成实测」。
  const LAYOUT_ORIGIN = { packed: 'tarball-static-extract', checkout: 'checkout-static-extract' }
  const expectedOrigin = (fact, fx) => (hs.versionFactOrigins[fact] === 'registry-metadata'
    ? 'registry-metadata'
    : (LAYOUT_ORIGIN[fx.extraction.layout] ?? null))
  for (const fact of ['settingsNamespaceExported', 'connectionApiDomainField', 'remoteNamespaceServicePackages']) {
    const got = hs.versionFacts.map((f) => fixtures[f.version].markers[fact].value)
    const want = hs.versionFacts.map((f) => f[fact])
    const originBad = hs.versionFacts.map((f) => f.version).filter((v) => fixtures[v].markers[fact].origin !== expectedOrigin(fact, fixtures[v]))
    check('COMPAT-003 版本差异 ' + fact + '：fixture ≡ 契约 golden [' + want.join(', ') + ']（来源 ' + (hs.versionFactOrigins[fact] === 'registry-metadata' ? '注册表元数据注入' : '静态提取实测，origin 按 layout 分流') + '；0.1.x → 0.1.2-rc.1 断点）',
      JSON.stringify(got) === JSON.stringify(want) && originBad.length === 0,
      'got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want) + ' originBad=' + JSON.stringify(originBad))
  }

  // ⑦ F1 面钉（COMPAT-011 C6 由 dsh-settings 单面扩至 4/4）：ci.yml 每个 mock 的动态 import 导出键集
  // ≡ 契约 requiredExports[本包] ⊆ fixture 现行宿主真实面。三方数据独立：mock 源码（ci.yml）/ 契约声明 /
  // 宿主真实包 —— 即「mock 既不缺我方所需面，也不导出宿主真实面之外的东西」（后者 = BUG-003 假绿防线）。
  const faces = mockFaces()
  const mockResults = []
  for (const f of faces) {
    const { keys } = await dynamicMockExportKeys(join(root, 'ci-mock'), f)
    const keys2 = [...keys].sort()
    const want = [...(f.expected ?? [])].sort()
    const hostFace = fixtures[hs.current].packages[f.localName]
    const hostKeys = hostFace === undefined ? [] : [...hostFace.exports].sort()
    mockResults.push({ pkg: f.localName, keys: keys2, want, ok: JSON.stringify(keys2) === JSON.stringify(want) && want.every((k) => hostKeys.includes(k)) })
  }
  check('COMPAT-003 F1 面钉（COMPAT-011 C6 扩 4/4）：' + faces.length + ' 个 ci.yml mock 运行时导出键集 ≡ 契约 requiredExports ⊆ fixture 宿主真实面',
    faces.length === 4 && faces.every((f) => Array.isArray(f.expected) && f.expected.length > 0) && mockResults.every((r) => r.ok),
    JSON.stringify(mockResults.map((r) => r.pkg + (r.ok ? '✓' : '✗') + JSON.stringify(r.keys))))

  // ⑧ F1 静态/动态互证（C6 4/4）：每个 mock 源码静态解析导出面 ≡ 动态 import 键集（两法独立证据；CI sanity 同口径）
  // C7②：heredoc 改名/缺失时判 undefined → 结构化 FAIL（原为 staticExportKeys(undefined) 抛 TypeError 中断 smoke）
  const ciYmlSrc = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const ciHeredocs = extractHeredocs(ciYmlSrc)
  const staticBad = []
  for (const f of faces) {
    const mockSource = ciHeredocs.get(f.heredocTarget)
    if (mockSource === undefined) { staticBad.push(f.localName + ':heredoc 缺失 ' + f.heredocTarget); continue }
    const mockStatic = staticExportKeys(mockSource)
    const dyn = (mockResults.find((r) => r.pkg === f.localName) ?? { keys: [] }).keys
    if (mockStatic.length !== dyn.length || !sameSet(mockStatic, dyn)) staticBad.push(f.localName + ':static=' + JSON.stringify(mockStatic) + ' dynamic=' + JSON.stringify(dyn))
  }
  check('COMPAT-003 F1 互证（C6 4/4）：' + faces.length + ' 个 mock 静态解析导出面 ≡ 动态 import 键集（两法独立证据）',
    staticBad.length === 0, staticBad.join(' | ') || 'clean')

  // ⑧b COMPAT-014 A-F2**接线守卫**（COMPAT-015 F2 强化：全文子串 ⇒ **sanity 段绑定**）：探测轨判据的离线机检
  // 必须留在 sanity（PR 门禁）内——该步骤若被删，判据脚本又回到「只能等首次 schedule 暴露」的零机检态（正是
  // REVIEW-COMPAT-007-R1 F2 的失效模式本身）。**原实现为 `ciYmlSrc.includes(...)` 全文匹配**：把该步骤移入
  // host-latest-probe（或被注释/步骤名提及）时字符串仍在 ⇒ 守卫仍绿，而 PR 面重新变为零机检 —— 表述强度 > 实现
  // 强度（REVIEW-COMPAT-014-R1 F2）。现改为**段绑定**：命令行 MUST 落在 `jobSection(yml,'sanity')` 段内。
  // 口径**共享模块**（COMPAT-016 P3-4，收口 R1 P3-4）：`jobsStart`/`jobSection`/`jobCmd` 现由
  // `test/fixtures/host-surfaces/yml-jobs.mjs` 提供，本文件与 probe-face.mjs 的 ②/⑦ 消费**同一对象**——
  // 原为两处各写一份镜像（语义等价但无交叉机检 ⇒ ci.yml 结构演化时可能一侧红一侧绿而无法由机检判定哪侧正确）。
  // 先例 = ci-mock-face.mjs 的 `extractHeredocs`。本文件仍**不** import probe-face（顶层脚本，import 即执行全量机检）。
  const probeFaceUrl = new URL('./fixtures/host-surfaces/probe-face.mjs', import.meta.url)
  const sanityCmds = (jobSection(ciYmlSrc, 'sanity') ?? []).map(jobCmd)
  const probeFaceWired = sanityCmds.includes('node test/fixtures/host-surfaces/probe-face.mjs')
    && sanityCmds.includes('node --check test/fixtures/host-surfaces/probe-face.mjs')
    && existsSync(probeFaceUrl)
  // 负例（构造，零落盘）：把两条接线行移入 host-latest-probe 段 ⇒ 旧「全文子串」守卫**仍绿**而段绑定守卫必红。
  const movedCiYml = (() => {
    const isWiring = (l) => ['node test/fixtures/host-surfaces/probe-face.mjs', 'node --check test/fixtures/host-surfaces/probe-face.mjs'].includes(jobCmd(l))
    const out = ciYmlSrc.split('\n').filter((l) => !isWiring(l))
    const at = out.findIndex((l) => l === '  host-latest-probe:')
    out.splice(at < 0 ? out.length : at + 1, 0, '          run: node test/fixtures/host-surfaces/probe-face.mjs')
    return out.join('\n')
  })()
  const oldSubstringGreen = movedCiYml.includes('node test/fixtures/host-surfaces/probe-face.mjs')
  const sectionBoundRed = !(jobSection(movedCiYml, 'sanity') ?? []).map(jobCmd).includes('node test/fixtures/host-surfaces/probe-face.mjs')
  check('COMPAT-014 A-F2 接线守卫（COMPAT-015 F2 强化为 **sanity 段绑定**）：ci.yml sanity 段内含探测轨离线机检步骤（`node test/fixtures/host-surfaces/probe-face.mjs`）+ 语法检查清单含该文件 + 工具文件在仓（删除接线 = 判据回到零机检态）；**负例**：接线行移出 sanity ⇒ 旧全文子串守卫仍绿（' + oldSubstringGreen + '）而本守卫必红（' + sectionBoundRed + '）',
    probeFaceWired && oldSubstringGreen && sectionBoundRed,
    'wired=' + probeFaceWired + ' inSanity=' + sanityCmds.includes('node test/fixtures/host-surfaces/probe-face.mjs') + ' checkInSanity=' + sanityCmds.includes('node --check test/fixtures/host-surfaces/probe-face.mjs') + ' file=' + existsSync(probeFaceUrl) + ' oldSubstringGreen=' + oldSubstringGreen + ' sectionBoundRed=' + sectionBoundRed)

  // ⑧c COMPAT-008（探针固化 `scripts/probe-host.mjs`）接线守卫：脚本在仓 ∧ `node --check` ∧ **离线自检**步骤落在
  // sanity 段内（`--self-check` 是唯一可在 CI 常态执行的面；实机 `--run` 需运行中宿主环境，不进 CI）∧ 脚本自述
  // 保留「实机未验证」固定标记（`REAL-RUN: UNVERIFIED`）——**防「静默转已验证」**（不得伪造实机验证）。
  // **COMPAT-016 P2-1（收口 REVIEW-COMPAT-015-R1 P2-1）**：原判据是**全文子串** `includes('REAL-RUN: UNVERIFIED')`，
  // 而脚本头注释 L13 含**同一串** ⇒ 只改常量定义 L49 的取值即可在守卫全绿的情况下把实机模式自述静默改为
  // 「已验证」（同 F2「表述强度 > 实现强度」家族；README「不得静默转已验证」的安全承诺因此可被一行改动解除）。
  // 现判据锚定**常量赋值行**（`const <NAME> = '<标记>'` 形态——与输出面解耦，头注释保留同串不再污染）：
  // ① 定义行字面量必须存在（改常量值 / 改名 / 删定义 ⇒ 红）；② 全文不得出现「已验证」形态（输出被硬编码为
  // VERIFIED ⇒ 红）；③ 常量必须在输出面被**真实引用**（≥ 定义 + 2 处拼接）⇒ 关闭「定义常量但输出另写字面量」的缝。
  // 判别力对照（零落盘构造）：把 L49 常量值改成 VERIFIED（头注释同串**保留**）⇒ 旧全文子串守卫仍绿而本守卫必红。
  // 真机负例见 COMPAT-016 证据（改常量 → smoke 红 → 还原 + sha256 复核；与 ⑧b 同款「旧守卫仍绿 ∧ 新守卫必红」范式）。
  const probeHostUrl = new URL('../scripts/probe-host.mjs', import.meta.url)
  const probeHostSrc = existsSync(probeHostUrl) ? readFileSync(probeHostUrl, 'utf8') : ''
  const probeHostWired = sanityCmds.includes('node --check scripts/probe-host.mjs') && sanityCmds.includes('node scripts/probe-host.mjs --self-check')
  const REAL_RUN_DEF = /const REAL_RUN_STATE = 'REAL-RUN: UNVERIFIED'/
  const SELF_CHECK_DEF = /const SELF_CHECK_STATE = 'SELF-CHECK: VERIFIED-IN-REPO'/
  const realRunGuard = (src) => REAL_RUN_DEF.test(src) && !/REAL-RUN: VERIFIED/.test(src) && (src.match(/REAL_RUN_STATE/g) ?? []).length >= 3
  const selfCheckGuard = (src) => SELF_CHECK_DEF.test(src) && (src.match(/SELF_CHECK_STATE/g) ?? []).length >= 2
  const forgedProbeHost = probeHostSrc.replace(REAL_RUN_DEF, "const REAL_RUN_STATE = 'REAL-RUN: VERIFIED'")
  const forgedChanged = forgedProbeHost !== probeHostSrc
  const oldFullTextGreen = forgedProbeHost.includes('REAL-RUN: UNVERIFIED')   // 头注释同串仍在 ⇒ 旧「全文子串」守卫仍绿（失效模式本身）
  const anchoredRed = !realRunGuard(forgedProbeHost)
  check('COMPAT-008 探针接线守卫（COMPAT-016 P2-1 强化：固定标记判据锚定**常量定义行**，非全文子串）：`scripts/probe-host.mjs` 在仓 ∧ sanity 段内含 `node --check` 与 `node scripts/probe-host.mjs --self-check`（离线自检）∧ 两枚固定标记的**常量赋值行**在位且在输出面被真实引用（实机模式未验证——不得静默转为「已验证」）；**判别力对照**：改常量值（头注释同串保留）⇒ 旧全文子串守卫仍绿（' + oldFullTextGreen + '）而本守卫必红（' + anchoredRed + '）',
    existsSync(probeHostUrl) && probeHostWired && realRunGuard(probeHostSrc) && selfCheckGuard(probeHostSrc) && forgedChanged && oldFullTextGreen && anchoredRed,
    'exists=' + existsSync(probeHostUrl) + ' wired=' + probeHostWired + ' realRunAnchor=' + realRunGuard(probeHostSrc) + ' selfCheckAnchor=' + selfCheckGuard(probeHostSrc) + ' forged=' + JSON.stringify({ changed: forgedChanged, oldFullTextGreen: oldFullTextGreen, anchoredRed: anchoredRed }))

  // ⑨ fixtures 内容安全边界（BC-05）：无绝对路径/宿主缓存路径/凭据形态（仅导出名·方法名·形状布尔）
  const SENSITIVE = /[A-Za-z]:\\|\/Users\/|\/home\/|AppData|npm-cache|Bearer\s|password|api[_-]?key/i
  const leaked = versions.filter((v) => SENSITIVE.test(readFileSync(fixtureUrl(v), 'utf8')))
  check('COMPAT-003 fixtures 安全边界（BC-05）：无绝对路径/缓存路径/凭据形态字符串',
    leaked.length === 0, 'leaked=' + JSON.stringify(leaked))

  // ⑩ F5a 契约 file/line 活性：file 全为仓库真实文件 + line 命中形态白名单（三形态，F9 修订后）
  const LINE_SEG = 'L\\d+(?:-L?\\d+)?'
  const LINE_SHAPES = [
    new RegExp('^(?:' + LINE_SEG + ')(?: / ' + LINE_SEG + ')*(?: 等)?$'),
    /^L\d+（调用点 L\d+、L\d+）$/,
    /^原 L\d+ → 现 L\d+ 字符串常量$/,
  ]
  const filesOf = (it) => (it.file === null ? [] : Array.isArray(it.file) ? it.file : [it.file])
  const fileBad = hc.items.filter((it) => filesOf(it).some((f) => !existsSync(new URL('../' + f, import.meta.url))))
  const shapeBad = hc.items.filter((it) => it.line !== null && !LINE_SHAPES.some((re) => re.test(it.line)))
  check('COMPAT-003 F5a 契约 file/line 活性：非 null file 全为仓库真实文件 + line 命中形态白名单',
    fileBad.length === 0 && shapeBad.length === 0,
    'fileBad=' + JSON.stringify(fileBad.map((i) => i.item)) + ' shapeBad=' + JSON.stringify(shapeBad.map((i) => i.item + ':' + i.line)))

  // ⑪ F5b 行号活性：每项首个行号 ≤ 目标文件总行数（产品代码增删后行号静默漂移即红）
  const lineCount = new Map()
  const linesOf = (rel) => {
    if (!lineCount.has(rel)) lineCount.set(rel, readFileSync(new URL('../' + rel, import.meta.url), 'utf8').split('\n').length)
    return lineCount.get(rel)
  }
  const lineBad = hc.items.filter((it) => {
    const m = it.line === null ? null : /L(\d+)/.exec(it.line)
    const files = filesOf(it)
    return m !== null && files.length > 0 && Number(m[1]) > linesOf(files[0])
  })
  check('COMPAT-003 F5b 行号活性：每项首个行号 ≤ 目标文件总行数（' + hc.items.filter((i) => i.line !== null).length + ' 项）',
    lineBad.length === 0, 'bad=' + JSON.stringify(lineBad.map((i) => i.item + ':' + i.line)))

  // ⑫ F5c 锚点抽核（COMPAT-011 C3 强化）：每面抽 1 项（该面首个有 file+line 的条目），symbol 的**非通用**
  // 标识符候选须在目标文件命中。修订点：①候选**剥离引号后**入集（原实现保留引号，只有源文件同引号同内容才命中）；
  // ②分级（1 = 引号字面量 > 2 = 点号标识符 > 3 = 裸词 ≥4 字符），报告命中的最佳层级；
  // ③排除通用词表——否则 `package.json`/`name`/`cordis`/`package` 这类「任何 JS/JSON/YAML 都会命中」的词
  // 使 4/6 面近乎恒真，宣称的「防 file 指错文件」不成立；④断言改为「至少一个非通用候选命中」。
  const COMMON_WORDS = new Set([
    'package.json', 'package', 'json', 'yml', 'yaml', 'index.js', 'index', 'main', 'module',
    'default', 'import', 'export', 'class', 'const', 'let', 'var', 'function', 'require', 'return',
    'async', 'await', 'static', 'new', 'this', 'null', 'undefined', 'true', 'false', 'type', 'typeof',
    'string', 'number', 'boolean', 'object', 'array', 'value', 'version', 'name', 'description',
    'deepseek', 'cordis', 'dsh', 'settings', 'home', 'paths', 'tools', 'document', 'window', 'data',
  ])
  // symbol → 非通用候选集（分 3 级：1 = 引号/中文名字面量 > 2 = 点号标识符 > 3 = 裸词 ≥4 字符）。
  // COMPAT-012 抽出为共用函数：F5c（每面锚点抽核）与 F5d（范围型 line 抽核）用**同一候选口径**，
  // 避免两处各写一份后口径漂移（口径定义 = ③注释所述，含通用词表排除）。
  const symbolCandidates = (symbol) => {
    const tiered = [
      ...(symbol.match(/"[^"]{4,}"/g) ?? []).map((c) => [1, c.slice(1, -1)]),
      ...(symbol.match(/'[^']{3,}'/g) ?? []).map((c) => [1, c.slice(1, -1)]),
      ...(symbol.match(/[\u4e00-\u9fff]{3,}/g) ?? []).map((c) => [1, c]), // 中文名字面量（面 5 preset name 即此类）
      ...(symbol.match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+/g) ?? []).map((c) => [2, c]),
      ...(symbol.match(/[A-Za-z_$][\w$]{3,}/g) ?? []).map((c) => [3, c]),
    ]
    const tierOf = new Map()
    for (const [tier, tok] of tiered) tierOf.set(tok, Math.min(tierOf.get(tok) ?? 3, tier))
    return [...tierOf].map(([tok, tier]) => ({ tok, tier })).filter((c) => !COMMON_WORDS.has(c.tok.toLowerCase()))
  }
  const anchors = []
  for (const f of [1, 2, 3, 4, 5, 6]) {
    const it = hc.items.find((x) => x.face === f && filesOf(x).length > 0 && x.line !== null)
    if (it === undefined) { anchors.push({ face: f, item: '—', hit: false, tier: null, sample: [] }); continue }
    const src = readFileSync(new URL('../' + filesOf(it)[0], import.meta.url), 'utf8')
    const cands = symbolCandidates(it.symbol)
    const hits = cands.filter((c) => src.includes(c.tok))
    anchors.push({ face: f, item: it.item, hit: hits.length > 0, tier: hits.length > 0 ? Math.min(...hits.map((c) => c.tier)) : null, sample: hits.slice(0, 2).map((c) => c.tok) })
  }
  check('COMPAT-003 F5c 锚点抽核（C3 强化）：每面 1 项 symbol 的非通用候选在目标文件命中（6/6；通用词表排除 ' + COMMON_WORDS.size + ' 词，候选分 3 级）',
    anchors.every((a) => a.hit),
    JSON.stringify(anchors.map((a) => a.item + (a.hit ? '✓T' + a.tier : '✗'))))
  // COMPAT-004 FIND-1：把实测层级写进机检 golden（原 CHANGELOG 人工转写为 T3/T1/T1/T3/T1/T3，与实测不符——
  // 面 4 由中文 name 字面量「新布局」命中 T1 而非 T3）。此处的 info 行为 CHANGELOG 引用的事实源串。
  const tierString = anchors.map((a) => 'T' + a.tier).join('/')
  console.log('  info COMPAT-004 FIND-1 锚点层级实测: ' + anchors.map((a) => a.item + (a.hit ? '✓T' + a.tier : '✗')).join(' / ') + '  ⇒ ' + tierString)
  check('COMPAT-004 FIND-1 锚点层级 golden：实测 ' + tierString + '（面 4 由中文字面量「新布局」命中 T1，非 T3）',
    tierString === 'T3/T1/T1/T1/T1/T3', 'tier=' + tierString)

  // ⑫b F5d 范围型 line 抽核（COMPAT-012，收口 REVIEW-COMPAT-004-R2 N2）：F5a/b/c 对**范围形态**的 line
  // （`L<起>-L<止>`）只有三重覆盖——形态白名单（F5a）+「首个行号 ≤ 文件总行数」（F5b）+ 每面 1 项锚点
  // 抽核，而面 2 抽到的锚点是 2.1（其范围精确）。于是**终点**是否落在有效行、范围是否真的包住所声明构造、
  // 边界是否落在真实代码行，三项均无信号——2.12/2.13 两处范围偏移即由此逃逸。本检查对**全部**范围型条目:
  //   ① 有效范围：起 ≥ 1 ∧ 止 ≥ 起 ∧ 止 ≤ 目标文件总行数（F5b 只查首个行号，终点越界无信号）；
  //   ② 范围内锚点命中：symbol 的非通用候选至少一个出现在 [起,止] 行内（不是「文件里任意位置命中」——
  //      后者对 file 指向正确但 line 指向别处无分辨力）；
  //   ③（RANGE_STRICT_FACES 声明的面）起止行**非空行/纯注释行**——范围边界必须是真实代码行。
  //      实证：2.12 旧值 `L4391-4397` 两端均落在 BUG-004/005 注释块上 ⇒ 红（本检查设立的直接动因）；
  //      faces 3/5/6 存在**合法**的注释行起段（恰 2 处：3.1 起于 `/**` JSDoc、3.5 起于 `//` 互操作说明——
  //      该计数由 ⑫d golden 锁定）故未纳入——扩面须先逐项核对边界语义，不可盲加；
  //      **口径边界（COMPAT-013 F-5①，如实披露）**：`lineIsComment` 仅识别 **JS 风格**注释（`//` `/*` `*`
  //      与空行）——**YAML `#` 与 JSON（无注释语法）不在识别面内**。现存面 5/6 的边界行均非注释（无现存
  //      误判），但**未来把面 5/6 纳入 RANGE_STRICT_FACES 前 MUST 先按目标语言实现注释口径**（或改以
  //      「起点行是否属于所声明构造」替代注释启发式），不得只把面号加进数组；
  //   ④ 终点不截断同一构造：终点行的**行首点号调用前缀**（如 `ctx.slots.inject(`）不得在终点之后再次
  //      作为行首出现。实证：2.13 旧值 `L4422-4454` 止于第 5 处 `ctx.slots.inject(`，第 6 处在 L4458 ⇒ 红。
  //      **强度边界（COMPAT-013 F-2 如实披露）**：④ 为 **opportunistic**——仅当「终点行恰以点号调用起行」
  //      时生效；2.13 修复后终点为**闭合行**（现行范围见契约 2.13 `line` 字段）⇒ `callPrefix` 取 null ⇒ **对该条目已真空**，其终点的持续
  //      机检力改由判据⑤a（出现次数完整性：截断 ≥1 处注册即 5 ≠ 6 ⇒ 红）承接。保留 ④ 而非删除：对
  //      「终点行即下一次同构造起行」形态（旧值 `L4454` 即此类）④ 是唯一判据，删除会让该形态重新裸奔。
  //      **残余缝（同次实测，未闭合）**：若 2.13 只删**终点闭合行**（**历史锚点**：COMPAT-013 时期值 `L4429-4460`——6 处注册仍全在范围内）
  //      则 ①②③④⑤ **全绿**（实测 262/0：⑤a 计数仍 6 ≡ 6、④ callPrefix = null、⑤b 无 `键: {` 形态构造）
  //      ⇒ 该形态目前无持续机检力。根治需「构造闭合行」口径，而 JS 范围本就可能是**合法语义片段**
  //      （2.1 `L92-94` 花括号净差 +2 / 2.3、3.8 的现行范围为代码片段，实测亦非配平）——
  //      无差别要求配平会误报上述 3 项，故如实留档待另案（非本任务可安全落地）。
  //      **本行 3 个契约行号副本的同步方（CLEAN-006 **N-6** 归属订正，避免审计归因错位）**：本块随
  //      契约 `line` 重基**必须同步**，其**机检执行者 = `COMPAT-015 F3 行号引用对账`**（把本行 2.3
  //      的副本回退为上一版数值后实测：仅 F3 转红）。与本文件的 smoke 断言**计数**无关（计数由末条
  //      `COMPAT-014 A-F9 README smoke 计数同步` 负责）⇒ 两者不可混写为同一断言。
  // R1 承继偏移（2.12 −6 / 2.13 −7）在修复前正是 ①③④ 三项的失败用例，修复后全绿（见 CHANGELOG COMPAT-012）。
  //   ⑤ 范围**完整覆盖**所声明构造（COMPAT-013 F-1 新增，两子句，实现见下方 ⑫c）——见 ⑫c 处的口径论证。
  const RANGE_STRICT_FACES = [2]
  const GOLDEN_RANGE_ITEMS = 22
  // COMPAT-013 F-5②：严格面条目数提为 golden——原守卫 `rangeStrict.length > 0` 允许严格面退化到 1 项仍绿
  // （golden 只锁了总范围条目 21 项）。面 2 实测 10 项（14 项中 **2.2**〔`L97` 单行号形态〕、**2.3**〔UX-063 返工后
  // 收敛为单行 `L5783`——原三行范围随 A3 收敛退役，按 brittle-by-design 约定显式改 golden〕、**2.4**〔多段〕非单段
  // 范围形态），RANGE_STRICT_FACES 的覆盖面即 10 ⇒ 与 GOLDEN_RANGE_ITEMS 同款漂移探测约定（brittle-by-design，扩面/删项须显式改 golden）。
  const GOLDEN_RANGE_STRICT_ITEMS = 11
  const RANGE_LINE = /^L(\d+)-L?(\d+)$/
  const lineIsComment = (l) => l.trim() === '' || /^(\/\/|\/\*|\*)/.test(l.trim())
  const callPrefix = (l) => {
    const m = /^\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\(/.exec(l)
    return m === null ? null : m[1]
  }
  const rangeItems = hc.items.filter((it) => it.line !== null && RANGE_LINE.test(it.line))
  const rangeStrict = rangeItems.filter((it) => RANGE_STRICT_FACES.includes(it.face))
  const rangeBad = []
  for (const it of rangeItems) {
    const files = filesOf(it)
    if (files.length === 0) { rangeBad.push(it.item + ':无 file（范围锚点不可核）'); continue }
    const lines = readFileSync(new URL('../' + files[0], import.meta.url), 'utf8').split('\n')
    const rm = RANGE_LINE.exec(it.line)
    const start = Number(rm[1]); const end = Number(rm[2])
    if (!(start >= 1 && end >= start && end <= lines.length)) {
      rangeBad.push(it.item + ':范围越界(' + it.line + ' / 文件 ' + lines.length + ' 行)'); continue
    }
    const span = lines.slice(start - 1, end)
    if (!symbolCandidates(it.symbol).some((c) => span.some((l) => l.includes(c.tok)))) rangeBad.push(it.item + ':锚点不在范围内')
    if (RANGE_STRICT_FACES.includes(it.face) && (lineIsComment(lines[start - 1]) || lineIsComment(lines[end - 1]))) {
      rangeBad.push(it.item + ':边界落在注释/空行')
    }
    const pre = callPrefix(lines[end - 1])
    if (pre !== null) {
      const off = lines.slice(end).findIndex((l) => callPrefix(l) === pre)
      if (off >= 0) rangeBad.push(it.item + ':终点截断(' + pre + ' 在 L' + (end + off + 1) + ' 再次起行)')
    }
  }
  check('COMPAT-012 N2 F5d 范围型 line 抽核：' + rangeItems.length + '/' + hc.items.length + ' 项范围条目（严格面 ' + RANGE_STRICT_FACES.join(',') + ' 共 ' + rangeStrict.length + ' 项 / golden ' + GOLDEN_RANGE_STRICT_ITEMS + '）范围有效 ∧ 锚点在范围内命中 ∧ 边界非注释 ∧ 终点不截断构造',
    rangeItems.length === GOLDEN_RANGE_ITEMS && rangeStrict.length === GOLDEN_RANGE_STRICT_ITEMS && rangeBad.length === 0,
    'rangeItems=' + rangeItems.length + '(golden ' + GOLDEN_RANGE_ITEMS + ') rangeStrict=' + rangeStrict.length + '(golden ' + GOLDEN_RANGE_STRICT_ITEMS + ') bad=' + JSON.stringify(rangeBad))
  console.log('  info COMPAT-012 N2 F5d 覆盖: 范围型 ' + rangeItems.length + '/' + hc.items.length + ' 项（面分布 ' + [...new Set(rangeItems.map((it) => it.face))].join(',') + '）；严格面 ' + RANGE_STRICT_FACES.join(',') + ' = ' + rangeStrict.map((it) => it.item).join(','))

  // UX-063 返工（REVIEW-UX-063-S2-CR1 P2-2）：**单行型 line 机检**——原 F5c 只抽每面 1 项、
  //   F5d 只覆盖范围型，单行条目写错时零信号（本轮 3.7 四键曾因手改整体 −2 而全错）。
  //   判据：声明行的源码内容 MUST 命中该条 symbol 的候选 token（候选口径同 F5c，排除通用词）。
  const singleItems = hc.items.filter((it) => it.line !== null && /^L\d+$/.test(it.line))
  const singleBad = []
  for (const it of singleItems) {
    const files = filesOf(it)
    if (files.length === 0) { singleBad.push(it.item + ':无 file'); continue }
    const linesOfFile = readFileSync(new URL('../' + files[0], import.meta.url), 'utf8').split('\n')
    const ln = Number(/^L(\d+)$/.exec(it.line)[1])
    const srcLine = linesOfFile[ln - 1] ?? ''
    const cands = symbolCandidates(it.symbol)
    if (cands.length === 0) { singleBad.push(it.item + ':无候选'); continue }
    if (!cands.some((c) => srcLine.toLowerCase().includes(c.tok.toLowerCase()))) singleBad.push(it.item + ':L' + ln + ' 未命中构造')
  }
  check('COMPAT-012 N2 F5d′ 单行型 line 机检：每条声明行命中该条 symbol 候选（' + singleItems.length + ' 项 / golden 6）',
    singleItems.length === 6 && singleBad.length === 0,
    'singles=' + singleItems.length + ' bad=' + JSON.stringify(singleBad))


  // ⑫c F5d 判据⑤「范围完整覆盖所声明构造」（COMPAT-013 F-1，收口 COMPAT-012-R1 F-1）：② 只要求「范围**内**
  // 至少一个候选命中」——范围**起点含无关前导行 / 终点漏构造闭合行**对它零信号（现存实例 = 契约 6.1 旧值
  // `L38-44`：L38 = `"dependencies": {}` 属无关兄弟键、L45 = `}` 为构造闭合行；①③④ 三项对该实例全盲）。
  // 判据⑤ 两子句：
  //   ⑤a **声明基数构造的全部出现**：symbol 以 `×N` 声明构造基数时，凡「点号调用形态候选」（tier 2）在
  //      **全文件**出现次数恰为 N 者，其在 `[起,止]` 内的出现次数 MUST ≡ N（= 全部出现都落在范围内）。
  //      实证：2.13 `ctx.slots.inject` / `ctx.slots.register` 实测 6 ≡ 6；旧值 `L4422-4454` ⇒ 5 ≠ 6 即红。
  //      **口径收窄的依据是实测（非拍脑袋）**：把该等式无差别施加于**全部**候选会使 7/21 项误报——
  //      2.3 `ctx.get` 1≠14 / 2.10 `sessions.list` 1≠6 / 2.11 `launcher.sessions` 1≠10 / 2.12 `ctx.on` 1≠2 /
  //      3.1 `document.querySelectorAll` 2≠3 / 3.8 `document.querySelector` 1≠5 / 4.6 `cordis.patch.yml` 1≠2
  //      ——契约多数候选是「类型名 / 语义片段」，其全文件出现**本就不应**被单个范围条目包住；只有 symbol
  //      自述基数的构造，其「全部出现」才是有定义的量。防空转 = ⑤a 覆盖对数 golden（实测 2 对）。
  //      **同源披露（COMPAT-014 C-F-3，收口 REVIEW-COMPAT-013-R1 F-3）**：实测两对 `ctx.slots.inject` / `ctx.slots.register`
  //      在 `lib/client.js` **同行共现**（6 行均为 `ctx.slots.inject('…', () => ctx.slots.register(`）⇒ 两 token 的出现/缺失
  //      **恒等联动**，「覆盖 2 对」的判别力**等价单构造计数**（整行截断时两者同时 5 ≠ 6 ⇒ 仍红，不产生假绿；golden `=== 2`
  //      的独立作用仅在「仅一 token 计数漂移而另一 token 恰为 6」时显现）。出现非同源 tier-2 构造时再补第 3 对。
  //      **工具口径边界（COMPAT-014 C-F-5，收口同轮 F-5）**：`occ5` 为纯文本**子串计数**（无词边界、不剔除注释与
  //      字符串内容）；⑤b / ⑥ 的花括号配平为**裸字符**计数（不解析字符串/注释中的 `{`/`}`）⇒ 同名子串（如
  //      `ctx.slots.injectExtra(`）可使计数漂移，方向为 fail-closed（`cardPairs < golden ⇒ 红`，报文只报覆盖对数、
  //      不精确定位到该 token）；当前全量实测零误报 / 零漏报。
  //   ⑤b **对象构造块闭合**：范围内出现的「候选键 + `: {`」声明行（如 `"peerDependencies": {`）其配平闭合
  //      行 MUST ≤ 止。实证：6.1 旧值 `L38-44` ⇒ 闭合行 L45 > 止 ⇒ 红；真值 `L39-45` ⇒ 绿。
  //      **为什么 6.1 必须靠 ⑤b、而不能靠计数式 ⑤a（实测，防后续被「简化」掉）**：6.1 的候选
  //      `peerDependencies` / `schemastery` 在旧值 `L38-44` 与真值 `L39-45` 两个范围内的出现次数**同为 1 ≡ 1**
  //      （L38 是 `"dependencies"`、L45 是 `}`，均不含任何候选）⇒ 纯计数口径对**该实例无分辨力**。
  //      ⑤a/⑤b 分工：⑤a 覆盖 2.13 类（多次注册/调用被截断），⑤b 覆盖 6.1 类（范围未包住构造闭合行）。
  //      其余 20 项范围条目在当前契约下 ⑤b 全绿（general 形态全量实测，未收窄到 JSON——JSON 与 JS 的
  //      `键: {` 声明同构，收窄反而丢失 JS 面覆盖力；见 CHANGELOG COMPAT-013）。
  const occ5 = (hay, needle) => hay.split(needle).length - 1
  const openKey5 = (tok) => new RegExp('^\\s*["\']?' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']?\\s*:\\s*\\{\\s*$')
  const GOLDEN_CARDINALITY_PAIRS = 2
  const rangeIncomplete = []
  const cardPairs = []
  for (const it of rangeItems) {
    const files = filesOf(it)
    if (files.length === 0) continue
    const src = readFileSync(new URL('../' + files[0], import.meta.url), 'utf8')
    const lines = src.split('\n')
    const rm = RANGE_LINE.exec(it.line)
    const start = Number(rm[1]); const end = Number(rm[2])
    if (!(start >= 1 && end >= start && end <= lines.length)) continue // ① 已报，避免越界取行
    const span = lines.slice(start - 1, end).join('\n')
    const cands = symbolCandidates(it.symbol)
    const declared = /×(\d+)/.exec(it.symbol)
    if (declared !== null) {
      const n = Number(declared[1])
      for (const c of cands) {
        if (c.tier !== 2 || occ5(src, c.tok) !== n) continue
        cardPairs.push(it.item + '/' + c.tok + '×' + n)
        if (occ5(span, c.tok) !== n) {
          rangeIncomplete.push(it.item + ':⑤a 声明基数未全覆盖(' + c.tok + ' 范围内 ' + occ5(span, c.tok) + ' ≠ 声明 ' + n + ')')
        }
      }
    }
    for (const c of cands) {
      const opener = openKey5(c.tok)
      for (let i = start - 1; i < end; i++) {
        if (!opener.test(lines[i])) continue
        let depth = 0; let closeLine = -1
        for (let j = i; j < lines.length; j++) {
          depth += occ5(lines[j], '{') - occ5(lines[j], '}')
          if (depth <= 0) { closeLine = j + 1; break }
        }
        if (closeLine < 0) rangeIncomplete.push(it.item + ':⑤b ' + c.tok + '(L' + (i + 1) + ') 构造未闭合')
        else if (closeLine > end) rangeIncomplete.push(it.item + ':⑤b ' + c.tok + '(L' + (i + 1) + ') 构造闭合行 L' + closeLine + ' 超出止 L' + end)
      }
    }
  }
  check('COMPAT-013 F1 判据⑤ 范围完整覆盖所声明构造：⑤a 声明基数（×N）构造的全部出现落在范围内（覆盖 ' + cardPairs.length + ' 对 / golden ' + GOLDEN_CARDINALITY_PAIRS + '：' + cardPairs.join(',') + '；**两对同源**=同行共现 ⇒ 判别力等价单构造计数，C-F-3）∧ ⑤b 对象构造块闭合行 ≤ 止',
    cardPairs.length === GOLDEN_CARDINALITY_PAIRS && rangeIncomplete.length === 0,
    'bad=' + JSON.stringify(rangeIncomplete))
  console.log('  info COMPAT-013 F1 判据⑤ 覆盖: ⑤a ' + cardPairs.length + ' 对（' + cardPairs.join(',') + '）；⑤b 对象构造起行扫描 ' + rangeItems.length + ' 项，失配 ' + rangeIncomplete.length)

  // ⑫e 判据⑥「范围内首行构造的配对闭合行 ≤ 止」（COMPAT-014 C-F-4，收口 REVIEW-COMPAT-013-R1 F-4）：
  // ⑤b 的 opener 取自 symbol 候选（含 tier-3 裸词**子串**）⇒ 它对 4.6/6.2 的覆盖是**偶然且不完整**的——
  // **实测订正 R1 F-4 的静态推演（P-01，见 CHANGELOG COMPAT-014 三例实测表）**：F-4 称「4.6 键名 `dsh`
  // 在 COMMON_WORDS 内被剔除、6.2 候选形态为 `engines.node` 与键名不等 ⇒ ⑤b 无匹配 opener」，实测为——
  // 4.6 经裸词候选 `client` 命中 L21 `"client": {`、6.2 经裸词候选 `engines` 命中 L8（故 4.6 止改 L21 /
  // 6.2 止改 L9 时 ⑤b **亦红**）；**但 4.6 止改 L28**（外层 `"dsh": {` 缺自身闭合行 L29，内层 client 仍闭合）
  // 时 ⑤b **green** 而本判据红 ⇒ ⑥ 的覆盖增量 = 「首行键 ≠ 任何 symbol 候选」与「外层构造闭合行 > 止而
  // 内层 ≤ 止」两类。判据⑥ 故**不复用 symbol 候选**，改按**目标语言**从范围内**首行**取构造键（JSON 与 JS
  // 同为 `键: {` 声明；YAML 缩进块与 `[` 数组不入面）：首行起构造时，其花括号配平闭合行 MUST ≤ 止。实测
  // 首行起构造者恰 3 项 = 4.6 `"dsh": {` / 6.1 `"peerDependencies": {` / 6.2 `"engines": {`（面 6 三项
  // JSON 根级子对象；其余 18 项首行为 JS 调用/声明/注释 ⇒ 不适用），项数入 golden（防空转）。
  // **只取首行、不取范围内全部 opener 的理由**：JS 范围可为**合法语义片段**（2.1 `L92-94` 净差 +2 / 2.3
  // 旧值 `L5526-L5528` +1 / 3.8 旧值 `L3418-L3432` +1 实测均非配平〔历史锚点：COMPAT-013 时期量测〕，⑤ 注释已留档）——无差别要求范围内每个 opener 配平
  // 会误报这些条目；而「范围未包住自身构造闭合行」的形态恰以构造键行起段（首行 opener 即充分判据）。
  // 口径边界同 ⑤b（裸字符配平，不剥注释/字符串中的 `{`/`}`）。
  const KEY_OPEN6 = /^\s*(?:"([^"]{1,60})"|'([^']{1,60})'|([A-Za-z_$][\w$.-]{0,60}))\s*:\s*\{\s*$/
  const GOLDEN_KEY_OPEN_ITEMS = 3
  const keyOpenItems = []
  const keyCloseBad = []
  for (const it of rangeItems) {
    const files = filesOf(it)
    if (files.length === 0) continue
    const lines = readFileSync(new URL('../' + files[0], import.meta.url), 'utf8').split('\n')
    const rm = RANGE_LINE.exec(it.line)
    const start = Number(rm[1]); const end = Number(rm[2])
    if (!(start >= 1 && end >= start && end <= lines.length)) continue   // ① 已报，避免越界取行
    if (!KEY_OPEN6.test(lines[start - 1])) continue
    keyOpenItems.push(it.item)
    let depth = 0
    let closeLine = -1
    for (let j = start - 1; j < lines.length; j++) {
      depth += occ5(lines[j], '{') - occ5(lines[j], '}')
      if (depth <= 0) { closeLine = j + 1; break }
    }
    if (closeLine < 0) keyCloseBad.push(it.item + ':⑥ 首行构造未闭合')
    else if (closeLine > end) keyCloseBad.push(it.item + ':⑥ 首行构造（L' + start + '）闭合行 L' + closeLine + ' 超出止 L' + end)
  }
  check('COMPAT-014 C-F-4 判据⑥ 范围首行构造闭合（按目标语言取键名，不依赖 symbol 候选）：' + keyOpenItems.length + ' 项以构造键行起段（golden ' + GOLDEN_KEY_OPEN_ITEMS + '：' + keyOpenItems.join(',') + '）其配平闭合行 MUST ≤ 止',
    keyOpenItems.length === GOLDEN_KEY_OPEN_ITEMS && keyCloseBad.length === 0,
    'keyOpen=' + JSON.stringify(keyOpenItems) + '(golden ' + GOLDEN_KEY_OPEN_ITEMS + ') bad=' + JSON.stringify(keyCloseBad))

  // ⑫d F-3 披露数字入机检（COMPAT-013）：非严格面（**由 rangeItems 动态生成**；实测 **3/4/5/6 共 10 项**——
  // COMPAT-014 C-F-1 订正：原标签「3/5/6」漏面 4，且与下方列举清单自含 `4.6 L17`（面 4）自相矛盾；条目数同时
  // 入 golden）范围条目中「起于注释/空行」者 MUST 恰 2 项
  //（历史锚点：COMPAT-013 时期实测——3.1 起于 `/**` JSDoc L1278、3.8 起于 `/**` JSDoc L3418；现行注释起段以本断言动态计算清单为准）。动因 = 该计数原为**人工转写**且写错
  //（CHANGELOG 曾披露「三处」）——与 COMPAT-004 FIND-1 的 tier 串转写漂移同类，故沿用同款处置：实测值
  // 入 golden（事实源 = 本断言消息内的实读清单）。逐项实读的非注释起段：3.5 `L2033-L2042` `const taClose` / 4.6 `L17`
  // `"dsh": {` / 5.1 `L1` `name:` / 5.2 `L16` `- id:` / 5.4 `L77` `- id:` / 6.1 `L39`（修正后真值；修正前
  // `L38` 亦非注释）/ 6.2 `L8` `"engines": {` / 6.4 `L105`（ci.yml `#` 注释起段——JS 口径不计为注释，见下句口径边界）。严格面（面 2 = 11 项）已由 ③ 逐项约束，
  // 本项只覆盖未纳入严格面的面（动态生成：实测 3/4/5/6）；注释口径同 ③（JS 风格），YAML `#` 不在识别面内（与 F-5① 同源前提）。
  const GOLDEN_RANGE_COMMENT_START = 0 // S2 R2：全部非严格面范围起点重基到代码行（原 3.1 起点落在注释内）
  const rangeNonStrict = rangeItems.filter((it) => !RANGE_STRICT_FACES.includes(it.face))
  const rangeNonStrictFaces = [...new Set(rangeNonStrict.map((it) => it.face))].sort()
  const GOLDEN_RANGE_NONSTRICT_ITEMS = 11
  const commentStartRanges = []
  for (const it of rangeNonStrict) {
    const files = filesOf(it)
    if (files.length === 0) continue
    const lines = readFileSync(new URL('../' + files[0], import.meta.url), 'utf8').split('\n')
    const rm = RANGE_LINE.exec(it.line)
    const start = Number(rm[1])
    if (start <= lines.length && lineIsComment(lines[start - 1])) commentStartRanges.push(it.item + '@L' + start)
  }
  check('COMPAT-013 F3 非严格面（' + rangeNonStrictFaces.join('/') + '，共 ' + rangeNonStrict.length + ' 项 / golden ' + GOLDEN_RANGE_NONSTRICT_ITEMS + '）注释/空行起段 golden：' + commentStartRanges.length + ' 项 ≡ ' + GOLDEN_RANGE_COMMENT_START + '（' + commentStartRanges.join(',') + '）——CHANGELOG 披露数由此锁定（原人工转写「三处」实读为 2 处）；覆盖面与条目数由本断言动态生成（C-F-1 订正「3/5/6」漏面 4）',
    rangeNonStrict.length === GOLDEN_RANGE_NONSTRICT_ITEMS && commentStartRanges.length === GOLDEN_RANGE_COMMENT_START,
    'nonStrict=' + rangeNonStrict.length + '(golden ' + GOLDEN_RANGE_NONSTRICT_ITEMS + ') faces=' + JSON.stringify(rangeNonStrictFaces) + ' commentStart=' + JSON.stringify(commentStartRanges))

  // ⑬ F6 necessity 九值 golden 分布（9 值全量 + 合计 52；防单值静默漂移）
  const GOLDEN_NEC = { required: 43, consolidatable: 1, adapted: 1, optional: 1, improvable: 2, own: 1, eliminated: 1, 'adapted-drift': 1, awareness: 1 }
  const nec3 = {}
  for (const it of hc.items) nec3[it.necessity] = (nec3[it.necessity] ?? 0) + 1
  check('COMPAT-003 F6 necessity 九值 golden 分布（合计 ' + hc.items.length + ' = ' + Object.values(GOLDEN_NEC).reduce((a, b) => a + b, 0) + '）',
    hc.items.length === 52 && Object.keys(nec3).length === 9
      && Object.entries(GOLDEN_NEC).every(([k, n]) => (nec3[k] ?? 0) === n),
    JSON.stringify(nec3))

  // ⑭ F7a kind 封闭枚举：52 项 kind 全部 ∈ kindEnum 且枚举无空置值
  check('COMPAT-003 F7a kind 封闭枚举：items[].kind 全部 ∈ kindEnum（' + hc.kindEnum.length + ' 值）且无空置值',
    hc.items.every((it) => hc.kindEnum.includes(it.kind))
      && hc.kindEnum.every((k) => hc.items.some((it) => it.kind === k)),
    'used=' + new Set(hc.items.map((i) => i.kind)).size + ' enum=' + hc.kindEnum.length)

  // ⑮ F7b faces 结构：恰 6 项、id=1..6 连续、name/scope 非空（003/005 消费入口的结构保证）
  check('COMPAT-003 F7b faces 结构：恰 6 项、id=1..6 连续、name/scope 非空字符串',
    hc.faces.length === 6 && hc.faces.every((f, i) => f.id === i + 1
      && typeof f.name === 'string' && f.name.trim() !== ''
      && typeof f.scope === 'string' && f.scope.trim() !== ''),
    'faces=' + hc.faces.length + ' ids=' + hc.faces.map((f) => f.id).join(','))

  // ⑯ F4 纯数据强化：递归 own-descriptor——自有属性皆数据属性 + 值类型白名单 + 纯对象原型
  // （补 ④ 的缝：JSON 往返对函数值天然免疫；本 check 直接看描述符，方法简写/取值器即刻暴露）
  const ALLOWED_TYPES = new Set(['string', 'number', 'boolean'])
  const scanPureData = (v, path, bad) => {
    if (v === null) return
    const t = typeof v
    if (ALLOWED_TYPES.has(t)) return
    if (Array.isArray(v)) {
      v.forEach((x, i) => scanPureData(x, path + '[' + i + ']', bad))
      // N2：数组分支与对象分支对齐——检自有附加属性（排除索引/length，它们本为数据属性）与原型替换
      for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
        if (k === 'length' || /^\d+$/.test(k)) continue
        if (!('value' in d)) bad.push(path + '.' + k + ':非数据属性')
        else scanPureData(d.value, path + '.' + k, bad)
      }
      if (Object.getPrototypeOf(v) !== Array.prototype) bad.push(path + ':非原生数组原型')
      return
    }
    if (t === 'object') {
      for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
        if (!('value' in d)) bad.push(path + '.' + k + ':非数据属性')
        else scanPureData(d.value, path + '.' + k, bad)
      }
      const proto = Object.getPrototypeOf(v)
      if (proto !== Object.prototype && proto !== null) bad.push(path + ':非纯对象原型')
      return
    }
    bad.push(path + ':' + t)
  }
  const descBad = []
  scanPureData(hc, 'hostContract', descBad)
  check('COMPAT-003 F4 纯数据强化：递归 own-descriptor（数据属性 + 类型白名单 string/number/boolean/null/array/plain-object）',
    descBad.length === 0, descBad.slice(0, 5).join(' | ') || 'clean')
}

// ── COMPAT-004：宿主边界层（服务端收口 + detectHostCapabilities + [nv-compat] D2 告警 + A3 inject 收敛）──
// 收口/探测/告警三面机检：index.js 零直连宿主 API（grep 实证）+ 收口映射表齐备 + 探测项 = 契约面 1 投影且全同步 +
// 缺面结构化告警（含安全边界）+ A3 双路径（service 在/缺）不崩溃 + FIND-1~4 落点。
{
  const { hostContract: hc4 } = await import('../lib/host-contract.mjs')
  const boundary = await import('../lib/host-boundary.js')
  const boundarySrc = readFileSync(new URL('../lib/host-boundary.js', import.meta.url), 'utf8')
  const contractSrc4 = readFileSync(new URL('../lib/host-contract.mjs', import.meta.url), 'utf8')
  const hostSrc4 = readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
  const hostCode = hostSrc4.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const clientCode = clientSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const filesOf4 = (it) => (it.file === null ? [] : Array.isArray(it.file) ? it.file : [it.file])

  // ① 收口（验收① + REVIEW-COMPAT-004-R1 F5 强化）：index.js 宿主调用 100% 经 host-boundary ——
  // **强口径**（F5）：代码面零 `ctx.<标识符>` 属性访问 + 零 `@deepseek-ai/` import。原「9 类模式表」属
  // 开发者自列形态（自指）——新形态（ctx.on/ctx.inject/ctx.provide…）零信号；强口径覆盖**一切**形态。
  // **口径修正（REVIEW-COMPAT-004-R2 N1）**：R1 的 lookbehind `(?<![.\w$])` 把**前导 `.` 也排除** ⇒
  // 漏 `this.ctx.<id>`（类方法内现实的书写形态——本仓 `lib/index.js` 类方法即用 `this.ctx`，如
  // `loggerOf(this.ctx)` / `emitChanged(this.ctx, …)`）⇒ 改为 `(?<![\w$])`；词内/同类标识符形态
  // （`myctx.` / `_ctx.` / `$ctx.`）仍排除，不误报。覆盖力由下条 ①a **双向实证**锁定。
  const CTX_STRONG = /(?<![\w$])ctx\.[A-Za-z_$]/g
  const bareCtxHits = [...hostCode.matchAll(CTX_STRONG)].map((m) => m[0])
  const hostPkgImports = [...hostCode.matchAll(/from\s*'@deepseek-ai\/[^']*'/g)].map((m) => m[0])
  check('COMPAT-004 收口①（强口径，R1-F5）：lib/index.js 代码面零 ctx.<标识符> 属性访问 + 零 @deepseek-ai/ import',
    bareCtxHits.length === 0 && hostPkgImports.length === 0,
    'ctxHits=' + JSON.stringify(bareCtxHits.slice(0, 5)) + ' hostImports=' + JSON.stringify(hostPkgImports))
  // ①a 强口径**覆盖力**双向实证（COMPAT-012 N1）：把审查实测的覆盖缝固化为反向构造——
  //   (i) R1 口径对负向构造 `this.ctx.get(1)` **0 命中**（漏检 = 修复动因，防「改回 R1 口径」）；
  //   (ii) 现行口径对同一构造**恰 1 命中**（修复生效）；
  //   (iii) 词内/同类标识符形态仍 **0 命中**（`[\w$]` 含字母/数字/下划线/`$`，不把别的变量名当宿主访问）。
  // 注：`CTX_STRONG_R1` 是**反例口径**，只在本断言内使用（不参与 ① 判定）。
  const CTX_STRONG_R1 = /(?<![.\w$])ctx\.[A-Za-z_$]/g
  const N1_NEG = 'this.ctx.get(1)'
  const n1R1Hits = [...N1_NEG.matchAll(CTX_STRONG_R1)].length
  const n1NowHits = [...N1_NEG.matchAll(CTX_STRONG)].length
  const N1_WORD_INTERNAL = ['myctx.get(1)', '_ctx.get(1)', '$ctx.get(1)']
  const n1WordInternal = N1_WORD_INTERNAL.filter((s) => [...s.matchAll(CTX_STRONG)].length > 0)
  check('COMPAT-012 N1 强口径覆盖力双向实证：`this.ctx.get(1)` R1 口径漏检(' + n1R1Hits + ') ∧ 现行口径命中(' + n1NowHits + ') ∧ 词内形态仍排除(' + n1WordInternal.length + ' 误报)',
    n1R1Hits === 0 && n1NowHits === 1 && n1WordInternal.length === 0,
    'r1=' + n1R1Hits + ' now=' + n1NowHits + ' wordInternal=' + JSON.stringify(n1WordInternal))
  // ①b 补充面（保留）：非 ctx.* 形态的宿主字面量/调用（webServer.register / resolveDshHome / .agent-presets 等）
  const DIRECT_HOST = [
    ['宿主包 import', /@deepseek-ai\//], ['ctx.settings', /ctx\.settings/], ['ctx.get', /ctx\.get\(/],
    ['ctx.effect', /ctx\.effect\(/], ['ctx.emit', /ctx\.emit\(/], ['ctx.logger', /ctx\.logger/],
    ['resolveDshHome', /resolveDshHome/], ['webServer.register', /webServer\.register/], ['$DSH_HOME 预设路径', /\.agent-presets/],
  ]
  const directHits = DIRECT_HOST.filter(([, re]) => re.test(hostCode)).map(([n]) => n)
  check('COMPAT-004 收口①b（补充面）：index.js 零直连宿主字面量/调用（' + DIRECT_HOST.length + ' 类模式 grep，覆盖 webServer.register / .agent-presets 等非 ctx.* 形态）',
    directHits.length === 0, 'hits=' + JSON.stringify(directHits))
  // ①d BUG-011 P0-2 回归（REVIEW-BUG-011-R1）：SettingsForms 写路径 MUST await + catch——
  // 宿主 `SettingsForms.update` 是 async 且可 reject（双层同 id / 被 home patch 覆盖 / 非法 legacy 值 / I/O）；
  // 原实现丢弃该 Promise ⇒ rejection 成为 unhandledRejection，在宿主 fail-loud 处理器下进程退出
  // （RISK-011③ 的实机形态）。本断言以 mock SettingsForms 驱动**成功 / 拒绝 / 缺面**三形态：
  // 成功须等写落定后 resolve {ok:true}；拒绝须被捕获为 {ok:false,error}（**不得抛出**）；缺面返回结构化失败。
  let updCalls = 0
  const updOkD = await boundary.settingsFormsUpdate({ settings: { update: async () => { updCalls += 1 } } }, 'novel-writing', { a: 1 })
  const updRejectD = await boundary.settingsFormsUpdate({ settings: { update: async () => { throw new Error('overridden by a home patch or command-line overlay') } } }, 'novel-writing', { a: 1 })
  const updMissingD = await boundary.settingsFormsUpdate({ settings: {} }, 'novel-writing', {})
  const updNoSettingsD = await boundary.settingsFormsUpdate({}, 'novel-writing', {})
  check('BUG-011 P0-2 回归（REVIEW-BUG-011-R1）：settingsFormsUpdate await 写落定（成功 {ok:true} / 拒绝被捕获为 {ok:false,error} 且不抛 / 0.1.x 缺面结构化失败）',
    updOkD.ok === true && updOkD.error === undefined && updCalls === 1
      && updRejectD.ok === false && typeof updRejectD.error === 'string' && updRejectD.error.includes('overridden')
      && updMissingD.ok === false && typeof updMissingD.error === 'string'
      && updNoSettingsD.ok === false && typeof updNoSettingsD.error === 'string',
    'ok=' + JSON.stringify(updOkD) + ' reject=' + JSON.stringify(updRejectD) + ' missing=' + JSON.stringify(updMissingD) + ' noSettings=' + JSON.stringify(updNoSettingsD))
  check('COMPAT-004 收口②：index.js 唯一宿主入口 = ./host-boundary.js（import 面断言——宿主包零 import）',
    /^import\s*\{[\s\S]*?\}\s*from\s*'\.\/host-boundary\.js'$/m.test(hostSrc4) && !/from\s*'@deepseek-ai\//.test(hostCode),
    'boundary import')
  const boundaryItems = hc4.items.filter((it) => it.face === 1 && it.necessity !== 'eliminated' && it.item !== '1.11')
  const mapKeys = Object.keys(boundary.BOUNDARY_MAP)
  const mapBad = boundaryItems.filter((it) => !filesOf4(it).includes('lib/host-boundary.js') || !mapKeys.includes(it.item))
  const mapSyms = [...new Set(Object.values(boundary.BOUNDARY_MAP).flat())]
  const symBad = mapSyms.filter((s) => !(s in boundary) || !new RegExp('\\b' + s + '\\b').test(hostCode))
  check('COMPAT-004 收口③：收口映射表齐备（键 ≡ 面 1 可收口项 ' + boundaryItems.length + ' 项 + file 全指边界）+ 映射符号全为边界真实导出且被 index.js 消费（' + mapSyms.length + ' 符号）',
    mapKeys.length === boundaryItems.length && mapBad.length === 0 && symBad.length === 0,
    'keys=' + mapKeys.length + ' mapBad=' + JSON.stringify(mapBad.map((i) => i.item)) + ' symBad=' + JSON.stringify(symBad))

  // ①c 打包面（REVIEW-COMPAT-004-R1 F1，P0 防复发）：F1 的失效模式 = 源码工作区四门禁全绿而 tarball 缺文件
  // （lib/index.js 静态 import ./host-boundary.js → 安装后 ERR_MODULE_NOT_FOUND，插件完全不加载）。
  // 故把「files 覆盖面 ⊇ lib/ 全部实际文件 ∧ ⊇ 入口相对 import 传递闭包」锁进 smoke；
  // 并约束 files 条目形态（精确路径或目录前缀）——出现 glob/否定式即刻红，强制显式评审（不静默失配）。
  const filesEntries = Array.isArray(pkgJson.files) ? pkgJson.files : []
  const LIB_FILES = readdirSync(new URL('../lib', import.meta.url)).sort()
  const pkgCovered = (rel) => filesEntries.some((p) => (p.endsWith('/') ? rel.startsWith(p) : rel === p))
  const pkgUncovered = LIB_FILES.filter((f) => !pkgCovered('lib/' + f))
  const patternBad = filesEntries.filter((p) => !/^[^*?[\]{}]+$/.test(p))
  const entryRels = [...new Set([pkgJson.main, ...Object.values(pkgJson.exports ?? {})])]
    .filter((v) => typeof v === 'string')
    .map((v) => v.replace(/^\.\//, ''))
    .filter((v) => /\.(mjs|js)$/.test(v) && existsSync(new URL('../' + v, import.meta.url)))
  const pkgClosure = new Set()
  const walkImports = (rel) => {
    if (pkgClosure.has(rel)) return
    pkgClosure.add(rel)
    const src = readFileSync(new URL('../' + rel, import.meta.url), 'utf8')
    for (const m of src.matchAll(/from\s*'(\.{1,2}\/[^']+)'/g)) {
      walkImports(join(dirname(rel), m[1]).replace(/\\/g, '/'))
    }
  }
  for (const rel of entryRels) walkImports(rel)
  const closureBad = [...pkgClosure].filter((rel) => !pkgCovered(rel))
  // COMPAT-021：lib/host-compat/（代际清单 + 行投影）是**登记的工具面**子目录——消费方 =
  // scripts/preflight-preset-rows.mjs / test/preflight-preset-rows.test.mjs（非入口运行时闭包；
  // COMPAT-022 起 provider 亦从此层取行）。登记进 LIB_TOOLING_DIRS 后不再按孤儿判；白名单外的
  // lib 顶层条目仍 MUST 被入口闭包消费（孤儿即红的原判据不放宽——子目录级注册 = 显式评审点）。
  const LIB_TOOLING_DIRS = ['host-compat']
  const libOrphans = LIB_FILES.filter((f) => !pkgClosure.has('lib/' + f) && !LIB_TOOLING_DIRS.includes(f))
  check('COMPAT-004 F1 打包面：package.json files ⊇ lib/ 全部 ' + LIB_FILES.length + ' 文件 ∧ ⊇ 入口相对 import 闭包 ' + pkgClosure.size + ' 文件（' + entryRels.length + ' 入口）∧ 条目形态白名单（精确路径/目录前缀）',
    filesEntries.length > 0 && pkgUncovered.length === 0 && closureBad.length === 0 && patternBad.length === 0,
    'files=' + JSON.stringify(filesEntries) + ' uncovered=' + JSON.stringify(pkgUncovered) + ' closureBad=' + JSON.stringify(closureBad) + ' patternBad=' + JSON.stringify(patternBad))
  check('COMPAT-004 F1 打包面：lib/ 零闭包外孤儿文件（files 收编 lib/ 后不夹带未消费文件）+ 边界/契约两文件在包内',
    libOrphans.length === 0 && LIB_FILES.includes('host-boundary.js') && LIB_FILES.includes('host-contract.mjs'),
    'orphans=' + JSON.stringify(libOrphans) + ' lib=' + JSON.stringify(LIB_FILES))

  // ② detectHostCapabilities（验收②）：职责显式 ≤3 句 + 探测项 = 契约面 1 全项投影 + 全同步（F7）+ 未探测项如实披露
  const respLines = boundarySrc.match(/@responsibility[^\n]*/g) ?? []
  check('COMPAT-004 探测①：边界模块职责显式声明 ≤3 句（文件头 @responsibility 标记数 = ' + respLines.length + '，REVIEW-COMPAT-001-R1 F3）',
    respLines.length >= 1 && respLines.length <= 3, 'n=' + respLines.length)
  const okCtx = {
    settings: { register() {}, get() {} },
    get: (n) => (n === 'webServer' ? { register() {} } : undefined),
    effect() {}, emit() {}, logger: {},
  }
  const repOk = boundary.detectHostCapabilities(okCtx)
  const face1Items = hc4.items.filter((it) => it.face === 1)
  check('COMPAT-004 探测②：探测项清单 = 契约 face 1 全 ' + face1Items.length + ' 项投影（逐项同序）+ 每项 sync=true（F7：apply 期零网络/零布局等待）',
    repOk.probes.length === face1Items.length && repOk.probes.every((p, i) => p.item === face1Items[i].item && p.sync === true),
    'probes=' + repOk.probes.length + ' sync=' + repOk.probes.every((p) => p.sync === true))
  check('COMPAT-004 探测③：满面场景零缺面（ok=9）+ 未探测项如实计入 unprobed（ok=null + 原因码；1.4 已退役 / 1.11 越界）+ 面 2~6 披露 notCovered=5',
    repOk.missing.length === 0 && repOk.summary.ok === 9 && repOk.unprobed.length === 2
      && repOk.unprobed.every((u) => typeof u.code === 'string' && u.code !== '')
      && repOk.notCovered.length === 5 && repOk.host.version === null,
    'ok=' + repOk.summary.ok + ' unprobed=' + JSON.stringify(repOk.unprobed.map((u) => u.item)) + ' notCovered=' + repOk.notCovered.length)
  // ③b R1 返工 F2（BC-05 出网纪律）：未探测/未覆盖**原因**一律为**枚举码**（自由文本含仓内相对路径
  //    如「lib/tools.js」⇒ 会经路由原样出网关并在面板渲染）；枚举码取值集由本断言钉住，
  //    未知码即红（生产者新增码而客户端 i18n 未登记时同样暴露——见 D1⑨ diagReason 覆盖断言）。
  const EMITTED_REASON_CODES4 = new Set(['retired', 'out-of-boundary-scope', 'no-runtime-predicate'])
  check('COMPAT-005 F2（R1 返工）探测载荷原因字段 = 枚举码（无自由文本/无仓内路径）：unprobed[].code ∈ 枚举集 ∧ reason 字段不存于载荷 ∧ notCovered[].code 齐备',
    repOk.unprobed.every((u) => EMITTED_REASON_CODES4.has(u.code) && u.reason === undefined)
      && repOk.probes.filter((p) => p.ok === null).every((p) => EMITTED_REASON_CODES4.has(p.code) && p.reason === undefined)
      && repOk.notCovered.every((n) => typeof n.code === 'string' && n.reason === undefined),
    'unprobed=' + JSON.stringify(repOk.unprobed) + ' notCovered=' + JSON.stringify(repOk.notCovered.map((n) => n.code)))

  // ③ D2 启动告警（验收③）：缺面场景样例输出 + 安全边界（仅布尔/名称/版本）+ 满面零输出
  const warnCalls = []
  const repMiss = boundary.detectHostCapabilities({ get: () => undefined })
  const emitted = boundary.warnCompatReport(repMiss, { warn: (...args) => warnCalls.push(args) })
  const payload = warnCalls.length === 1 ? JSON.parse(warnCalls[0][1]) : null
  check('COMPAT-004 D2 告警①：缺面场景单次 [nv-compat] 结构化输出（含缺面域名/方法名/服务名 + 计数）',
    emitted === true && warnCalls.length === 1 && warnCalls[0][0] === '[nv-compat]'
      && payload !== null && payload.domains.includes('ctx') && payload.domains.includes('service')
      && payload.services.includes('settings') && payload.services.includes('webServer')
      && payload.methods.includes('effect') && payload.items.join(',') === '1.6,1.8,1.9,1.10',
    'calls=' + warnCalls.length + ' payload=' + JSON.stringify(payload))
  const SENSITIVE4 = /[A-Za-z]:\\|\/Users\/|\/home\/|AppData|npm-cache|Bearer\s|password|api[_-]?key/i
  check('COMPAT-004 D2 告警② 安全边界（BC-05）：摘要仅布尔/名称/版本——无路径/token/用户数据',
    payload !== null && !SENSITIVE4.test(JSON.stringify(payload)) && !/[A-Za-z]:[\\/]/.test(JSON.stringify(payload))
      && Object.values(payload.counts).every((v) => typeof v === 'number'),
    'sensitive-clean')
  const warnEmpty = []
  check('COMPAT-004 D2 告警③：满面场景零输出（单次告警不刷屏——无缺面即静默，返回 false）',
    boundary.warnCompatReport(repOk, { warn: (...a) => warnEmpty.push(a) }) === false && warnEmpty.length === 0, 'silent')
  // ③b F4（R1）：诊断载荷 task 由契约 revisions 末项**派生**（禁硬编码任务名——否则 COMPAT-005/006 沿用本层
  // 时会把一切缺面误标为 COMPAT-004，污染归因）。断言：值 ≡ 契约末项 ∧ 源码以派生式赋值（无 task 字面量）。
  check('COMPAT-004 F4：载荷 task 派生自契约 revisions 末项（实测 = ' + hc4.revisions.at(-1).task + '，非硬编码）+ 边界源码 task 无字面量赋值',
    payload !== null && payload.task === hc4.revisions.at(-1).task
      && !boundarySrc.includes("task: 'COMPAT-004'") && boundarySrc.includes('task: CONTRACT_TASK')
      && boundarySrc.includes('hostContract.revisions.at(-1).task'),
    'task=' + String(payload === null ? null : payload.task) + ' derived=' + String(boundarySrc.includes('hostContract.revisions.at(-1).task')))

  // ④ A3 双路径（验收④）：connection/locale 在 / 缺 均挂载成功；服务在时 locale 生效，缺时降级默认 zh 不崩溃
  const labelOf = (regs, id) => { const r = regs.find((x) => x.id === id); return r === undefined ? null : r.label() }
  const runClientApply = (getImpl) => {
    const regs = []
    let pending = ''
    const ctxC = { get: getImpl, slots: { inject: (s, fn) => { pending = s; fn() }, register: (def) => regs.push(def) } }
    let err = ''
    let cleanup = null
    try { cleanup = clientExports.apply(ctxC) } catch (e) { err = e.message }
    return { regs, err, cleanup, pending }
  }
  const legacyApiStub = { settings: {}, sessions: {}, workspace: {}, host: {}, agentPresets: {} }
  // 路径 B 先行：localeValue 为模块级状态（apply 期快照），须在「未见 locale」的初始态断言降级默认 zh；
  // 路径 A 随后跑——同时证明「降级挂载后再见服务」仍能生效（服务在 → 标签切英文）。
  const pathOff = runClientApply(() => undefined)
  check('COMPAT-004 A3 路径B（service 缺）：connection/locale 缺席仍挂载（不崩溃）+ 6 席注册 + 降级默认 zh（UI 走既有 apiHas/degraded 提示路径）',
    pathOff.err === '' && pathOff.regs.length === 6 && typeof pathOff.cleanup === 'function'
      && labelOf(pathOff.regs, 'novel-writing') === '小说写作',
    'err=' + pathOff.err + ' n=' + pathOff.regs.length + ' label=' + String(labelOf(pathOff.regs, 'novel-writing')))
  const pathOn = runClientApply((n) => (n === 'locale' ? { getSnapshot: () => ({ active: 'en' }) } : n === 'connection' ? { api: legacyApiStub } : undefined))
  check('COMPAT-004 A3 路径A（service 在）：apply 成功 + 6 席注册 + locale 服务生效（英文标签 = 服务真被消费）',
    pathOn.err === '' && pathOn.regs.length === 6 && typeof pathOn.cleanup === 'function'
      && labelOf(pathOn.regs, 'novel-writing') === 'Novel Writing',
    'err=' + pathOn.err + ' n=' + pathOn.regs.length + ' label=' + String(labelOf(pathOn.regs, 'novel-writing')))
  const LEGACY_FALLBACKS = ['legacyApi.settings', 'legacyApi.sessions', 'legacyApi.workspace', 'legacyApi.host', 'legacyApi.agentPresets']
  check('COMPAT-004 A3：makeHostApi legacyApi 回退分支零改动（connection.api 唯一引用 + 5 域回退返回在位 + 单点收口函数在位）',
    (clientCode.match(/connection\.api/g) ?? []).length === 1
      && LEGACY_FALLBACKS.every((s) => clientCode.includes(s))
      && clientCode.includes('function makeHostApi(')
      && clientCode.includes('makeHostApi((name) => ctx.get(name), connection)'), 'legacy-intact')
  check('COMPAT-004 A3 契约同步：regionLiterals.serviceNames.inject ≡ ["slots"]（硬依赖面）+ ctxGet 仍含 connection/locale（探测面）',
    JSON.stringify(hc4.regionLiterals.serviceNames.inject) === JSON.stringify(['slots'])
      && hc4.regionLiterals.serviceNames.ctxGet.includes('connection')
      && hc4.regionLiterals.serviceNames.ctxGet.includes('locale'),
    'inject=' + JSON.stringify(hc4.regionLiterals.serviceNames.inject) + ' ctxGet=' + JSON.stringify(hc4.regionLiterals.serviceNames.ctxGet))

  // ④b F2（R1 返工）：locale 服务**后到**自愈——方案 a（与 sessions 同构）：**同一个** internal/service
  // 监听器加 locale 分支（重快照 + 通知已挂载组件重渲染）；宿主槽位标签改渲染期惰性取快照，不再固化
  // apply 期字典。构造：先以 locale='zh' 的宿主归零模块快照（消除前序用例残留——localeValue 是模块级状态）
  // → 再以「locale 缺席」的宿主挂载（捕获 internal/service 监听器）→ 服务后到触发事件 → 标签 zh ⇒ en。
  const zhBase = runClientApply((n) => (n === 'locale' ? { getSnapshot: () => ({ active: 'zh' }) } : undefined))
  // 标签现为**渲染期惰性**取值（读模块级 localeValue）——故基线标签必须**立即**读（延迟读会读到后续用例改过的快照）。
  const zhBaseLabel = labelOf(zhBase.regs, 'novel-writing')
  const lateBag = {}
  const lateRegs = []
  const lateHandlers = []
  let lateOff = false
  let lateErr = ''
  let lateCleanup = null
  const ctxLate = {
    get: (n) => lateBag[n],
    on: (ev, fn) => { lateHandlers.push([ev, fn]); return () => { lateOff = true } },
    slots: { inject: (s, fn) => fn(), register: (def) => lateRegs.push(def) },
  }
  try { lateCleanup = clientExports.apply(ctxLate) } catch (e) { lateErr = e.message }
  const lateLabel = () => { const r = lateRegs.find((x) => x.id === 'novel-writing'); return r === undefined ? null : r.label() }
  const labelBefore = lateLabel()
  lateBag.locale = { getSnapshot: () => ({ active: 'en' }) } // 宿主 locale 服务「后到」
  const lateListener = lateHandlers.find(([ev]) => ev === 'internal/service')
  if (lateListener !== undefined) lateListener[1]('locale')
  const labelAfter = lateLabel()
  if (typeof lateCleanup === 'function') lateCleanup()
  check('COMPAT-004 F2：locale 服务「后到」自愈（单一 internal/service 监听器重快照 + 标签渲染期惰性取值）——缺席期 zh → 事件后 en',
    zhBase.err === '' && zhBaseLabel === '小说写作'
      && lateErr === '' && lateHandlers.length === 1 && typeof lateCleanup === 'function'
      && labelBefore === '小说写作' && labelAfter === 'Novel Writing' && lateOff === true,
    'base=' + String(zhBaseLabel) + ' before=' + String(labelBefore) + ' after=' + String(labelAfter)
      + ' handlers=' + lateHandlers.length + ' off=' + lateOff + ' err=' + lateErr)
  // ④c F2：locale 取值路径**零抛出**——本回调运行在宿主事件派发链内，抛错会打断宿主；ctx.get('locale')
  // 抛错 / 服务形态不合格 / getSnapshot 抛错 ⇒ 保持现值（不写入 undefined、不崩）。此处现值 = 上一用例的 en。
  const throwBag = {}
  const throwRegs = []
  const throwHandlers = []
  const ctxThrowGet = {
    get: (n) => { if (n === 'locale') throw new Error('locale service not provided'); return throwBag[n] },
    on: (ev, fn) => { throwHandlers.push([ev, fn]); return () => {} },
    slots: { inject: (s, fn) => fn(), register: (def) => throwRegs.push(def) },
  }
  let throwErr = ''
  let fireErr = ''
  try {
    clientExports.apply(ctxThrowGet)
    try { throwHandlers[0][1]('locale') } catch (e) { fireErr = e.message }
  } catch (e) { throwErr = e.message }
  const throwLabel = throwRegs.find((x) => x.id === 'novel-writing')
  check('COMPAT-004 F2：locale 取值零抛出（ctx.get 抛错 → 保持现值 + 事件回调不抛，不打断宿主事件派发）',
    throwErr === '' && fireErr === '' && throwHandlers.length === 1
      && throwLabel !== undefined && throwLabel.label() === 'Novel Writing',
    'err=' + throwErr + ' fired=' + fireErr + ' label=' + String(throwLabel === undefined ? null : throwLabel.label()))

  // ⑤ FIND-3/FIND-4（验收⑤）：fixtures 过筛项登记 + 契约判据优先级 + extract.mjs 边界披露
  const fieldMissing = []
  const exclAll = []
  for (const v of Object.keys(hc4.hostSurface.packages)) {
    const fx = JSON.parse(readFileSync(new URL('./fixtures/host-surfaces/' + v + '.json', import.meta.url), 'utf8'))
    for (const [pn, pkg] of Object.entries(fx.packages)) {
      for (const [cn, c] of Object.entries(pkg.classes)) {
        if (!Array.isArray(c.methodNamesExcludedByKeyword)) fieldMissing.push(v + ':' + pn + '.' + cn)
        for (const e of c.methodNamesExcludedByKeyword ?? []) exclAll.push(v + ':' + pn + '.' + cn + '.' + e.name + '@L' + e.line)
      }
    }
  }
  const FIND3_KNOWN = ['cordis.DisposableList.delete@L17', 'cordis.Fiber.await@L1398', 'cordis.RegistryService.delete@L1564']
  const curPrefix = hc4.hostSurface.current + ':'
  const excl15 = exclAll.filter((x) => x.startsWith(curPrefix)).map((x) => x.slice(curPrefix.length))
  check('COMPAT-004 FIND-3：三份 fixtures 落 methodNamesExcludedByKeyword（恒存在）+ 现行 fixture 三处过筛点名称·行号精确 ≡ ' + JSON.stringify(FIND3_KNOWN),
    fieldMissing.length === 0 && JSON.stringify(excl15) === JSON.stringify(FIND3_KNOWN)
      && exclAll.filter((x) => !x.startsWith(curPrefix)).length === 0,
    'fieldMissing=' + JSON.stringify(fieldMissing) + ' excl=' + JSON.stringify(excl15))
  const exclSchema = hc4.hostSurface._schema['packages[p].classes[c].methodNamesExcludedByKeyword']
  check('COMPAT-004 FIND-3：契约 _schema 声明该字段 + 判据优先级 exports/AST > methodNames（防假阴性误报缺失）',
    typeof exclSchema === 'string' && exclSchema.includes('exports/AST > methodNames') && exclSchema.includes('恒存在'),
    'schema=' + String(exclSchema).slice(0, 40))
  const extractSrc = readFileSync(new URL('./fixtures/host-surfaces/extract.mjs', import.meta.url), 'utf8')
  check('COMPAT-004 FIND-4：extract.mjs 已知边界补正则字面量/嵌套模板串（花括号配平失真风险，当前未触发）',
    extractSrc.includes('不识别正则字面量') && extractSrc.includes('嵌套模板串') && extractSrc.includes('当前未触发'), 'caveat-recorded')

  // ⑥ F3（R1）：宿主 `ctx.get` 语义**可对账化**——抛错构造断言（探测兜底不崩 + 产品路径透传不吞错，两向锁定）
  // + 语义入契约 ctxGetSemantics（两形态行为 / 依赖面 / 兜底路径 / 复核状态 unverified + 残余风险如实披露）。
  // 背景：本环境无宿主 cordis 源码可及，原仅靠 lib/client.js 注释引用（审查 F3：不可复核）。
  const throwGetCtx = {
    settings: { register() {}, get() {} },
    get: () => { throw new Error('ctx.get: service not provided') },
    effect() {}, emit() {}, logger: {},
  }
  let probeErr = ''
  let repThrow = null
  try { repThrow = boundary.detectHostCapabilities(throwGetCtx) } catch (e) { probeErr = e.message }
  let warnThrowOk = false
  try { warnThrowOk = boundary.warnCompatReport(repThrow, { warn: () => {} }) === true } catch { warnThrowOk = false }
  let passthroughThrew = false
  try { boundary.getWebServer(throwGetCtx) } catch { passthroughThrew = true }
  const sem = hc4.ctxGetSemantics
  check('COMPAT-004 F3：ctx.get 抛错构造断言——safeGet 兜底探测不崩（1.8 如实判缺面）+ 缺面告警可发 + 产品路径透传不吞错',
    probeErr === '' && repThrow !== null && repThrow.missing.length === 1 && repThrow.missing[0].item === '1.8'
      && repThrow.summary.missing === 1 && warnThrowOk === true && passthroughThrew === true,
    'err=' + probeErr + ' missing=' + JSON.stringify(repThrow === null ? null : repThrow.missing.map((m) => m.item))
      + ' passthroughThrew=' + passthroughThrew)
  check('COMPAT-004 F3：契约 ctxGetSemantics 语义入册（两形态行为 + 依赖面 ≥2 + 兜底路径 + 复核状态 unverified + 残余风险非空）',
    sem !== undefined && typeof sem.missingService === 'string' && sem.missingService.includes('undefined')
      && typeof sem.propertyAccess === 'string' && sem.propertyAccess.includes('without inject')
      && Array.isArray(sem.dependent) && sem.dependent.length >= 2
      && typeof sem.fallback === 'string' && typeof sem.evidence === 'string' && sem.evidence !== ''
      && sem.status === 'unverified' && typeof sem.risk === 'string' && sem.risk !== '',
    'sem=' + JSON.stringify(sem === undefined ? null : { status: sem.status, dependent: sem.dependent.length }))

  // ⑦ F6（R1）：`lib/index.js` 的 inject 与边界 hostInject **非共享引用**——宿主/消费方就地改写 inject
  // 不再污染边界层（hostInject 同时是能力探测判据 1.5 的输入）。断言非同一引用 + 内容等价 + 改写零泄漏。
  const injectBefore = JSON.stringify(boundary.hostInject)
  mod.inject.push('__r1_probe__')
  const injectLeaked = boundary.hostInject.includes('__r1_probe__')
  mod.inject.pop()
  check('COMPAT-004 F6：lib/index.js inject = 边界 hostInject 的副本（非共享引用；就地改写零泄漏，内容等价 ' + injectBefore + '）',
    mod.inject !== boundary.hostInject && injectLeaked === false
      && JSON.stringify(mod.inject) === injectBefore && JSON.stringify(boundary.hostInject) === injectBefore,
    'sameRef=' + String(mod.inject === boundary.hostInject) + ' inject=' + JSON.stringify(mod.inject))

  // ⑧ F7（R1）：收口口径**跨文档统一**——「lib/index.js 宿主调用 100% 收口」+ tools 行（契约 1.11）显式排除。
  // 断言口径（不止「某处出现过字面」）：①三处文档均含限定短语（剥 markdown 装饰后比对）；②文档中**每一处**
  // 「100% 收口」都限定在 lib/index.js（把一切「服务端全域收口」式表述挡在门外）；③tools 行显式排除。
  const SCOPE_PHRASE = 'lib/index.js 宿主调用 100% 收口'
  const scopeDocs = [
    ['CHANGELOG.md', readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')],
    ['lib/host-contract.mjs', contractSrc4],
    ['lib/host-boundary.js', boundarySrc],
  ]
  const scopeUnqualified = []
  for (const [f, s] of scopeDocs) {
    for (const line of s.split('\n')) {
      if (/100%\s*收口/.test(line) && !line.includes('lib/index.js')) scopeUnqualified.push(f)
    }
  }
  const scopeBad = scopeDocs.filter(([, s]) => !s.replace(/[`*]/g, '').includes(SCOPE_PHRASE) || !s.includes('lib/tools.js'))
  check('COMPAT-004 F7：收口口径跨文档统一（CHANGELOG/契约/边界头 3 处含「' + SCOPE_PHRASE + '」+ 每处「100% 收口」均限定 lib/index.js + tools 行显式排除）',
    scopeBad.length === 0 && scopeUnqualified.length === 0,
    'bad=' + JSON.stringify(scopeBad.map(([f]) => f)) + ' unqualified=' + JSON.stringify(scopeUnqualified))
// ── COMPAT-005 D1：设置页诊断面板（能力报告 = 契约运行时投影；只读；BC-05 载荷边界 + RB-03 代理信号）──
// 机检面：①报告生成函数可达（exports 纯函数面）+ 载荷仅布尔/名称/版本（BC-05 沿用 COMPAT-004 D2 告警②口径）；
// ②RB-03 代理信号构造断言（**R1 返工 F1**：真实旧表面「域对象带方法」⇒ 触发；新表面 ⇒ 五项探针可用且不触发；双缺不误报）；
// ③数据源单一（报告项全由入参投影 + 客户端探测项 ↔ 契约 clientProbes **双向 ⊆** + item/kind **等价** + 面 4/5/6 零伪造）；
// ④服务端路由**行为**断言（真实 handler 产出整包扫描 + 注入 file 正向对照 + 失败路径 ok:false）；
// ⑤N3/N4 契约登记 + ctxGetSemantics 诚实保持 unverified + **R1 返工 F5~F9 落点**。
{
  const { hostContract: hc5 } = await import('../lib/host-contract.mjs')
  const hostSrc5 = readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
  const boundarySrc5 = readFileSync(new URL('../lib/host-boundary.js', import.meta.url), 'utf8')
  // ① 报告生成函数可达性（验收⑤「诊断报告生成函数可达」）
  const genReachable = clientExports !== null
    && typeof clientExports.buildDiagReport === 'function'
    && typeof clientExports.diagMinSupportSignal === 'function'
    && typeof clientExports.diagStyleProbe === 'function'
    && typeof clientExports.CLIENT_PROBES === 'object' && clientExports.CLIENT_PROBES !== null
    && typeof clientExports.D_PROBE_ITEM === 'object' && clientExports.D_PROBE_ITEM !== null
  check('COMPAT-005 D1①：诊断报告生成函数可达（exports 纯函数面：buildDiagReport / diagMinSupportSignal / diagStyleProbe / CLIENT_PROBES / D_PROBE_ITEM）',
    genReachable,
    'exports=' + (clientExports === null ? 'null' : typeof clientExports.buildDiagReport))

  // ② 载荷安全边界（BC-05，验收②）：沿用 COMPAT-004 D2 告警②口径——仅布尔/名称/版本，
  //    无路径/token/用户数据；且报告**不含**契约 file/line 字段（本任务新增的显式边界，服务端路由同口径）。
  //    **R1 返工 F2**：扫描面由「客户端投影字段子集」改为**整个报告对象**（原 `payload5` 字段集不含
  //    `unprobed`——正是承载真实仓内路径的字段 ⇒ 盲区）；fixture 的 reason 亦由净化文本改为枚举 `code`。
  const serverMock5 = {
    ok: true,
    report: {
      contract: { task: 'COMPAT-002', schemaVersion: 1, items: 48, faces: 6 },
      host: { version: null, versionCode: 'tp4-unprobed' },   // B-N3：自由文本 versionNote → 枚举码（R2 收口）
      scope: { face: 1, probesDeclared: 11, probesCovered: 9, probesUnprobed: 2 },
      probes: [
        { item: '1.1', face: 1, kind: 'import', sync: true, ok: true, mode: 'module-surface', domain: '@deepseek-ai/cordis', service: null, method: 'Service', detail: 'function' },
        { item: '1.4', face: 1, kind: 'import', sync: true, ok: null, mode: 'unprobed', code: 'retired' },
      ],
      missing: [],
      unprobed: [{ item: '1.4', code: 'retired' }],
      notCovered: [{ face: 2, code: 'client-api-surface' }, { face: 3, code: 'host-dom-surface' }, { face: 4, code: 'install-registration' }, { face: 5, code: 'preset-manifest' }, { face: 6, code: 'version-environment' }],
      summary: { total: 11, ok: 9, missing: 0, unprobed: 2 },
    },
    contract: {
      task: 'COMPAT-002', schemaVersion: 1, revision: hc5.revisions.at(-1).task,
      faces: [{ id: 1, name: 'F1' }, { id: 2, name: 'F2' }, { id: 3, name: 'F3' }, { id: 4, name: 'F4' }, { id: 5, name: 'F5' }, { id: 6, name: 'F6' }],
      items: hc5.items.map((it) => ({ item: it.item, face: it.face, kind: it.kind, necessity: it.necessity })),
    },
  }
  const apiFull5 = {
    settings: { describe() {}, update() {}, mutate() {} },
    sessions: { create() {}, prompt() {}, cancel() {} },
    workspace: { list() {}, create() {} },
    host: { pickDirectory() {}, createDirectory() {}, listDirectory() {} },
    agentPresets: { select() {} },
  }
  let diag5 = null
  let diag5Err = ''
  try { diag5 = clientExports.buildDiagReport({ api: apiFull5, server: serverMock5 }) } catch (e) { diag5Err = e.message }
  // BC-05 扫描器（D1②/⑥ 共用）：整包文本——绝对路径/敏感串 + 契约 file/line/模块后缀形态
  const SENSITIVE5 = /[A-Za-z]:\\|\/Users\/|\/home\/|AppData|npm-cache|Bearer\s|password|api[_-]?key/i
  const scanBc05 = (s) => /[A-Za-z]:[\\/]/.test(s) || SENSITIVE5.test(s) || ['file:', 'line:', 'L0', '.js', '.mjs', '.yml', '.json'].some((k) => s.includes(k))
  const payload5 = diag5 === null ? '' : JSON.stringify(diag5) // **整包**（含 unprobed/notCovered——R1 F2 盲区）
  const hasPathish5 = /[A-Za-z]:[\\/]/.test(payload5) || SENSITIVE5.test(payload5)
  const hasFileLine5 = ['file:', 'line:', 'L0', '.js', '.mjs', '.yml', '.json'].some((s) => payload5.includes(s))
  check('COMPAT-005 D1② 载荷安全边界（BC-05）：报告**整包**仅布尔/名称/版本——无路径/token/用户数据 + 无契约 file/line 泄漏（含 unprobed/notCovered 字段）',
    diag5Err === '' && diag5 !== null && diag5.rows.length === 10 && diag5.checks.length === 8
      && diag5.summary.ok === 9 && diag5.hostVersion === null && hasPathish5 === false && hasFileLine5 === false
      && diag5.rows.every((r) => ['ok', 'missing', 'unprobed'].includes(r.state) && typeof r.item === 'string')
      && diag5.faces.every((f) => [f.items, f.probed, f.ok, f.missing, f.unprobed, f.notCovered].every((v) => typeof v === 'number'))
      && Array.isArray(diag5.unprobed) && diag5.unprobed.every((u) => u.reason === undefined && typeof u.code === 'string')
      && scanBc05(payload5) === false,
    'err=' + diag5Err + ' rows=' + String(diag5 === null ? null : diag5.rows.length) + ' pathish=' + hasPathish5 + ' fileline=' + hasFileLine5 + ' scan=' + scanBc05(payload5))

  // ③ RB-03 代理信号**构造断言**（验收③；**R1 返工 F1 重写**）：三形态——
  //    (d) 真实旧表面（**域对象带方法**，复用 ⑥ BUG-004 旧宿主回退用例同形态 fixture）⇒ MUST triggered=true；
  //    (e) 新表面（remote.* 服务就位）⇒ 五项探针 ok=true 且 triggered=false；
  //    (f) 双缺（无宿主表面）⇒ 不触发（无连接载体即无从判定旧表面，不误报）。
  // **F1 根因与口径**：探针判据 = **原始服务命名空间在场性**（apply 期记录的 `ctx.get` 解析器求值），
  //    **不是** facade 域对象形状——facade 在 remote.* 缺席时**原样返回旧表面域对象**（下述 legacy* 域对象
  //    即带方法形态），形状反推会使五谓词全真 ⇒ `remotePresent` 恒真 ⇒ 信号在真实旧宿主上恒不触发 +
  //    面板把 2.5~2.9 报成「可用」（假绿）。故本构造用**带方法**的旧表面 fixture（R1 复现用例，非空壳）。
  // **F4 纪律（R1 返工）**：读数在 `runClientApply` 之后**先直接读 CLIENT_PROBES**（不新建 facade）——
  //    测试自建 facade 会补写模块标记（apply 装配路径的回归会被掩盖）；随后才构报告用 facade。
  const legacySettingsD = { describe: () => {}, update: () => {}, mutate: () => {} }
  const legacySessionsD = { create: () => {}, prompt: () => {}, cancel: () => {} }
  const legacyWorkspaceD = { list: () => {}, create: () => {} }
  const legacyHostD = { pickDirectory: () => {}, createDirectory: () => {}, listDirectory: () => {} }
  const legacyPresetsD = { select: () => {} }
  const rbLegacyConnD = { api: { settings: legacySettingsD, sessions: legacySessionsD, workspace: legacyWorkspaceD, host: legacyHostD, agentPresets: legacyPresetsD } }
  const getLegacyD = (n) => (n === 'connection' ? rbLegacyConnD : undefined)
  const REMOTE_PROBE_IDS5 = ['remote-settings', 'remote-session', 'remote-workspace', 'remote-directory-picker', 'remote-agent-presets']
  runClientApply(getLegacyD)
  // (d-1) F4(a)：apply 装配路径**直读**——代际标记/原始解析器若未由 apply 期的 makeHostApi 写入，此处必红
  const probeLegacyApplyD = clientExports.CLIENT_PROBES['legacy-connection-api']()
  const probeRemoteApplyD = clientExports.CLIENT_PROBES['remote-settings']()
  // (d-2) 报告读数据 = 与 apply 同 getImpl/同 connection 的 facade（标记同值，如实反映 apply 装配实况）
  const apiD = clientExports.makeHostApi(getLegacyD, rbLegacyConnD)
  const repD = clientExports.buildDiagReport({ api: apiD, server: serverMock5 })
  const rbD = repD.minSupport
  const remoteChecksD = repD.checks.filter((c) => REMOTE_PROBE_IDS5.includes(c.id))
  const clientRowD = (it) => repD.rows.find((r) => r.item === it && r.scope === 'client')
  const oldHostNoGreen5 = ['2.5', '2.6', '2.7', '2.8', '2.9'].every((it) => {
    const r = clientRowD(it)
    return r !== undefined && r.state !== 'ok'
  })
  // (e) 新表面：remote.* 五个原始服务就位（方法面与 facade getter 同口径）
  const remoteNsE = {
    settings: { describe() {}, update() {}, mutate() {} },
    session: { create() {}, prompt() {}, cancel() {} },
    workspace: { create() {} },
    directoryPicker: { pick() {}, createDirectory() {}, list() {} },
    agentPresets: { select() {} },
  }
  const getNewE = (n) => ({ 'remote.settings': remoteNsE.settings, 'remote.session': remoteNsE.session, 'remote.workspace': remoteNsE.workspace, 'remote.directoryPicker': remoteNsE.directoryPicker, 'remote.agentPresets': remoteNsE.agentPresets }[n])
  runClientApply(getNewE)
  const apiE = clientExports.makeHostApi(getNewE, undefined)
  const remoteProbesE = REMOTE_PROBE_IDS5.map((k) => clientExports.CLIENT_PROBES[k](apiE))
  const repE = clientExports.buildDiagReport({ api: apiE, server: serverMock5 })
  const rbE = repE.minSupport
  const newHostAllGreen5 = ['2.5', '2.6', '2.7', '2.8', '2.9'].every((it) => {
    const r = repE.rows.find((x) => x.item === it && x.scope === 'client')
    return r !== undefined && r.state === 'ok'
  })
  // (f) 双缺（无宿主表面）→ 不触发（无连接载体即无从判定旧表面，不误报）
  runClientApply(() => undefined)
  const remoteProbesC = REMOTE_PROBE_IDS5.map((k) => clientExports.CLIENT_PROBES[k]())
  const rbC = clientExports.buildDiagReport({ api: undefined, server: serverMock5 }).minSupport
  // (g) **R2 N1 构造（COMPAT-014 B-N1）**：**原始肢在场 ∧ facade 肢不可用** ∧ 旧表面标记在场 ⇒ MUST NOT 触发。
  //     触发判据取自原始服务命名空间（check.raw）；若沿用 raw∧facade 的合并读数 ok，则本形态 remotePresent=false
  //     ∧ legacyPresent=true ⇒ 误报「宿主版本低于最低支持」（R2 指出的理论误报路径，本构造把它固化为反例）。
  const connG = { api: { settings: legacySettingsD } }
  const remoteNsG = { 'remote.settings': remoteNsE.settings, 'remote.session': remoteNsE.session, 'remote.workspace': remoteNsE.workspace, 'remote.directoryPicker': remoteNsE.directoryPicker, 'remote.agentPresets': remoteNsE.agentPresets }
  runClientApply((n) => (n === 'connection' ? connG : remoteNsG[n]))
  const repG = clientExports.buildDiagReport({ api: {}, server: serverMock5 })   // facade 空对象 ⇒ facade 肢不可用
  const rbG = repG.minSupport
  const remoteChecksG = repG.checks.filter((c) => REMOTE_PROBE_IDS5.includes(c.id))
  check('COMPAT-005 D1③ RB-03 代理信号构造断言（R1 返工 F1：判据 = **原始 remote.* 命名空间**在场性；**R2 N1：触发取原始肢 `raw`，facade 肢仅作展示**）：真实旧表面（域对象**带方法**）⇒ triggered=true + 明确文案；新表面 ⇒ 五项探针 ok=true 且 triggered=false；双缺 ⇒ 不误报；原始肢在场 ∧ facade 肢不可用（合并读数 ok=false）⇒ MUST NOT 触发',
    rbD.triggered === true && rbD.text.includes('宿主版本低于最低支持')
      && rbD.text.includes('remote.') && rbD.text.includes('0.1.2-rc.1')
      && remoteChecksD.length === 5 && remoteChecksD.every((c) => c.ok === false) && oldHostNoGreen5
      && remoteProbesE.every((p) => p.ok === true) && rbE.triggered === false && rbE.text === '' && newHostAllGreen5
      && remoteProbesC.every((p) => p.ok === false) && rbC.triggered === false && rbC.text === ''
      && remoteChecksG.length === 5 && remoteChecksG.every((c) => c.ok === false && c.raw === true) && rbG.triggered === false,
    'D=' + JSON.stringify(rbD.triggered) + ' E=' + JSON.stringify(rbE.triggered) + ' C=' + JSON.stringify(rbC.triggered)
      + ' Drows=' + JSON.stringify(remoteChecksD.map((c) => c.ok)) + ' Eprobes=' + JSON.stringify(remoteProbesE.map((p) => p.ok))
      + ' Graw=' + JSON.stringify(remoteChecksG.map((c) => c.raw)) + ' Gok=' + JSON.stringify(remoteChecksG.map((c) => c.ok)) + ' Gtrig=' + String(rbG.triggered)
      + ' Dtext=' + rbD.text.slice(0, 24))
  check('COMPAT-005 D1③b（R1 返工 F4）apply 装配路径**直读**：runClientApply(真实旧表面) 后**不新建 facade** 直读 CLIENT_PROBES —— 代际标记与原始解析器确由 makeHostApi 于 apply 期写入（删除任一处赋值即红）',
    probeLegacyApplyD.ok === true && probeLegacyApplyD.detail.includes('true')
      && probeRemoteApplyD.ok === false,
    'legacyProbe=' + JSON.stringify(probeLegacyApplyD) + ' remoteProbe=' + JSON.stringify(probeRemoteApplyD))

  // ④ 数据源单一（验收①，硬门槛①）：客户端探测项常数 ↔ 契约 clientProbes **双向 ⊆**（防面板自列清单自指）
  //    + 每项 item 真实存在于契约 items[] + 面 4/5/6 零伪造（有 0 个探测项）。
  const CLIENT_PROBES_SRC5 = ['legacy-connection-api', 'remote-settings', 'remote-session', 'remote-workspace', 'remote-directory-picker', 'remote-agent-presets', 'dom-phase', 'dom-observers']
  const srcClientIds5 = (clientSrc.match(/^\s*'([a-z-]+)': \(/gm) ?? []).map((s) => s.trim().replace(/^\s*'/, '').replace(/': \($/, ''))
  const contractProbeIds5 = hc5.clientProbes.map((p) => p.probe)
  const keysOf5 = Object.keys(clientExports.CLIENT_PROBES)
  const itemById5 = {}
  for (const it of hc5.items) itemById5[it.item] = it
  const clientFaceOk5 = hc5.clientProbes.every((p) => {
    const it = itemById5[p.item]
    return it !== undefined && it.kind === p.kind && (it.face === 2 || it.face === 3)
  })
  check('COMPAT-005 D1④ 数据源单一：契约 clientProbes ≡ CLIENT_PROBES 常数 ≡ client.js 源码面（三向同集）+ 每项 item 真实在册且 kind 对账 + 面 4/5/6 零伪造',
    CLIENT_PROBES_SRC5.length === 8
      && srcClientIds5.length === 8 && CLIENT_PROBES_SRC5.every((k) => srcClientIds5.includes(k))
      && JSON.stringify([...contractProbeIds5].sort()) === JSON.stringify([...CLIENT_PROBES_SRC5].sort())
      && JSON.stringify([...keysOf5].sort()) === JSON.stringify([...CLIENT_PROBES_SRC5].sort())
      && clientFaceOk5
      && keysOf5.every((k) => typeof clientExports.D_PROBE_ITEM[k] === 'string' && itemById5[clientExports.D_PROBE_ITEM[k]] !== undefined)
      && hc5.clientProbes.filter((p) => p.item.startsWith('4.') || p.item.startsWith('5.') || p.item.startsWith('6.')).length === 0,
    'src=' + srcClientIds5.length + ' contract=' + JSON.stringify(contractProbeIds5) + ' keys=' + JSON.stringify(keysOf5) + ' kindOk=' + clientFaceOk5)

  // ④b R1 返工 F3（等价断言）：`D_PROBE_ITEM[probe]` MUST **等于**契约 `clientProbes[].item`（原断言只查
  //     「是字符串且在册」⇒ 交换同面两项（2.5↔2.7）时面计数/算术/rows/checks 长度**全部不变**、面板把
  //     探针结果归因到错误的契约项而机检全绿）。同时钉：映射单射（无两项映到同一 item）+ 目标项 kind 对账。
  const dProbeEquiv5 = hc5.clientProbes.every((p) => clientExports.D_PROBE_ITEM[p.probe] === p.item
    && itemById5[p.item] !== undefined && itemById5[p.item].kind === p.kind)
  const dProbeInjective5 = new Set(hc5.clientProbes.map((p) => clientExports.D_PROBE_ITEM[p.probe])).size === hc5.clientProbes.length
  check('COMPAT-005 D1④b（R1 返工 F3）映射等价：D_PROBE_ITEM[probe] ≡ 契约 clientProbes[].item（逐项相等，非仅「在册」）∧ 单射 ∧ 目标项 kind 对账（交换同面两项 2.5↔2.7 必红）',
    dProbeEquiv5 && dProbeInjective5,
    'equiv=' + dProbeEquiv5 + ' injective=' + dProbeInjective5 + ' map=' + JSON.stringify(clientExports.D_PROBE_ITEM))

  // ⑤ 面覆盖台账算术（验收①「披露 notCovered 面 2~6 = 数量摘要」）：探测项总数 ≤ 契约项总数，
  //    未覆盖数 = 契约项 − 服务端探测 − 客户端探测；面 4/5/6 探测数 0（未实现面不伪造状态）。
  const serverProbeCount5 = serverMock5.report.probes.length
  const contractItemTotal5 = hc5.items.length
  const coveredByProbe5 = diag5 === null ? 0 : diag5.faces.reduce((s, f) => s + f.probed, 0)
  const notCoveredSum5 = diag5 === null ? 0 : diag5.faces.reduce((s, f) => s + f.notCovered, 0)
  const face456Probed5 = diag5 === null ? -1 : [4, 5, 6].reduce((s, id) => { const f = diag5.faces.find((x) => x.id === id); return s + (f === undefined ? 0 : f.probed) }, 0)
  check('COMPAT-005 D1⑤ 面覆盖台账：探测项 ' + serverProbeCount5 + '（面1）+ 8（客户端）= ' + (serverProbeCount5 + 8)
      + ' ≤ 契约 ' + contractItemTotal5 + ' 项；未覆盖 ' + notCoveredSum5 + ' 项 = ' + contractItemTotal5 + ' − 19；面 4/5/6 探测数 = 0（未实现面不伪造）',
    diag5 !== null && coveredByProbe5 === serverProbeCount5 + 8
      && coveredByProbe5 + notCoveredSum5 === contractItemTotal5 && face456Probed5 === 0,
    'probed=' + coveredByProbe5 + ' notCovered=' + notCoveredSum5 + ' f456=' + face456Probed5)

  // ⑥ 服务端路由（数据源出口）——**行为断言**（R1 返工 F2/F4）：直接驱动真实路由 handler，
  //    对**真实产出整包**做 BC-05 扫描（含此前盲区字段 `unprobed`）+ **正向对照**（注入 `file`/自由文本
  //    `reason` ⇒ 扫描器必红，判别力已证实）+ 契约投影字段面（file/line/symbol 不出网关）+
  //    失败路径以行为方式驱动（ctx 缺席 ⇒ `{ ok:false, error:'probe-unavailable' }`，不冒泡 500）。
  //    源码级检查保留（标注口径：`report` 出口 + 同源同函数 + 投影经边界层 contractProjection 单点，R1 F7）。
  const compatRouteSrc5 = hostSrc5.includes("api('compat'")
    && hostSrc5.includes('detectHostCapabilities(ctxNow)')
    && hostSrc5.includes("return { ok: false, error: 'probe-unavailable' }")
    && hostSrc5.includes('return {') && hostSrc5.includes('ok: true,') && hostSrc5.includes('report,')
    && hostSrc5.includes('contract: contractProjection()')
    && !/api\('compat'[\s\S]{0,1400}?\bit\.(file|line)\b/.test(hostSrc5)
    && !/from '\.\/host-contract/.test(hostSrc5) // R1 返工 F7：产品代码不直接 import 契约模块
  const routes5 = []
  svc.registerHttp({ register: (r) => { routes5.push(r) } })
  const compatRoute5 = routes5.find((r) => r.path === '/novel-writing/api/compat')
  /** 驱动真实路由 handler：fake req/res（回环来源 + JSON content-type 语义）→ 捕获响应体。 */
  const callRoute5 = async (route, ctxOverride) => {
    const prevCtx = svc.ctx
    svc.ctx = ctxOverride
    const cap = { status: null, body: null }
    const res = {
      writableEnded: false,
      writeHead(status) { cap.status = status; return this },
      end(body) { cap.body = body; res.writableEnded = true },
    }
    const req = {
      method: 'GET', url: route.path, headers: { host: '127.0.0.1:3080', 'content-type': 'application/json' },
      socket: { remoteAddress: '127.0.0.1' },
      on(ev, fn) { if (ev === 'end') fn(); return req },
    }
    await route.handler(req, res)
    await new Promise((r) => setTimeout(r, 0))
    svc.ctx = prevCtx
    return { status: cap.status, payload: cap.body === null ? null : JSON.parse(cap.body) }
  }
  // 满面 ctx（面 1 十一项中九项有判据 ⇒ ok=9、未探测 2）——真实探测路径产出，非手搓载荷
  const routeCtx5 = {
    settings: { register() {}, get() {} },
    get: (n) => (n === 'webServer' ? { register() {} } : undefined),
    effect() {}, emit() {}, logger: { warn() {} },
  }
  const routeOk5 = compatRoute5 !== undefined ? await callRoute5(compatRoute5, routeCtx5) : { status: null, payload: null }
  const routeFail5 = compatRoute5 !== undefined ? await callRoute5(compatRoute5, undefined) : { status: null, payload: null }
  const realPayload5 = routeOk5.payload === null ? '' : JSON.stringify(routeOk5.payload)
  const realClean5 = scanBc05(realPayload5)
  // 正向对照（F2 要求）：给**真实产出**注入契约 file 字段 + 自由文本 reason ⇒ 扫描器 MUST 变红
  const injected5 = routeOk5.payload === null ? null : JSON.parse(realPayload5)
  if (injected5 !== null) {
    injected5.report.probes[0].file = 'lib/client.js'
    injected5.report.unprobed[0].reason = 'out-of-boundary-scope（属 lib/tools.js 行）'
  }
  const injectedRed5 = injected5 !== null && scanBc05(JSON.stringify(injected5)) === true
  const rp5 = routeOk5.payload
  check('COMPAT-005 D1⑥ 服务端路由**行为**断言（R1 返工 F2/F4）：真实 handler 产出整包 BC-05 扫描干净（含 unprobed/notCovered）∧ 正向对照（注入 file/reason ⇒ 必红）∧ 契约投影仅 item/face/kind/necessity ∧ 失败路径 { ok:false, error:\'probe-unavailable\' }',
    compatRouteSrc5 && compatRoute5 !== undefined
      && routeOk5.status === 200 && rp5 !== null && rp5.ok === true
      && rp5.report.probes.length === 11 && rp5.report.summary.ok === 9
      && rp5.report.unprobed.length === 2 && rp5.report.unprobed.every((u) => typeof u.code === 'string' && u.reason === undefined)
      && rp5.report.notCovered.length === 5 && rp5.report.notCovered.every((n) => typeof n.code === 'string' && n.reason === undefined)
      && rp5.contract.items.length === 52 && rp5.contract.faces.length === 6
      && rp5.contract.revision === hc5.revisions.at(-1).task
      && rp5.contract.items.every((it) => it.item !== undefined && it.face !== undefined && it.kind !== undefined && it.necessity !== undefined
        && it.symbol === undefined && it.file === undefined && it.line === undefined)
      && realClean5 === false && injectedRed5 === true
      && routeFail5.status === 200 && routeFail5.payload !== null && routeFail5.payload.ok === false && routeFail5.payload.error === 'probe-unavailable',
    'src=' + compatRouteSrc5 + ' status=' + String(routeOk5.status) + ' realClean=' + realClean5 + ' injectedRed=' + injectedRed5
      + ' fail=' + JSON.stringify(routeFail5.payload) + ' unprobed=' + JSON.stringify(rp5 === null ? null : rp5.report.unprobed.map((u) => u.code)))

  // ⑦ 客户端面板接入点：设置页 section 内渲染诊断面板 + 单一数据源调用（apiJson 取服务端报告）+ 刷新钮；
  //    负向断言：诊断面板自身**不直连宿主 API**（只经 props.api，经 makeHostApi 收口）。
  //    **R1 返工 F4**：源码文本断言**外补行为断言**（见下 `diagStyleProbe()` 真跑 + ⑨ 探针降级 + ⑥ 路由行为）。
  //    **如实披露（不可达面的口径）**：面板**渲染树**断言在本 mock 下不可达——mock react 的 `useState`
  //    返回固定帧值且 setter 为 no-op，SettingsPage 的 `view`（初始 null）永不为非空 ⇒ 诊断区只在其
  //    「已加载」分支内（源码级断言 `el(DiagnosticsPanel, { api, t })` 覆盖挂载点）。故本项以
  //    **面板自身运行期探针真跑**（`diagStyleProbe`：解析真实 NV_STYLE）作为行为读数，不以假绿代替。
  const diagWiredOk5 = clientCode.includes("el(DiagnosticsPanel, { api, t })")
    && clientCode.includes("apiJson('/novel-writing/api/compat')")
    && clientCode.includes("t('diagRefresh')")
    && (() => {
      const block = clientSrc.slice(clientSrc.indexOf('function DiagnosticsPanel('), clientSrc.indexOf('function diagTable('))
      return block.includes('buildDiagReport(') && !/ctx\.[A-Za-z_$]/.test(block)
    })()
  let styleProbe5 = null
  let styleProbeErr5 = ''
  try { styleProbe5 = clientExports.diagStyleProbe() } catch (e) { styleProbeErr5 = e.message }
  check('COMPAT-005 D1⑦ 设置页接入（源码 + **行为**）：DiagnosticsPanel 渲染于 settings.section 内 + 单一数据源（buildDiagReport 投影）+ 服务端报告经 apiJson 读取 + 面板零直连宿主 API + 面板运行期探针真跑（diagStyleProbe 解析真实 NV_STYLE：ok=true 且 vars/rules > 0）',
    diagWiredOk5 && styleProbeErr5 === '' && styleProbe5 !== null
      && styleProbe5.ok === true && styleProbe5.vars > 0 && styleProbe5.rules > 0,
    'wired=' + diagWiredOk5 + ' styleProbe=' + JSON.stringify(styleProbe5) + ' err=' + styleProbeErr5)

  // ⑧ N3/N4 契约登记（验收④）+ ctxGetSemantics 诚实保持（验收「若有新证据才转 verified」——本轮无新证据）。
  const item213 = hc5.items.find((it) => it.item === '2.13')
  const n3Ok5 = item213 !== undefined && typeof item213.note === 'string'
    && item213.note.includes('前提未证实') && item213.note.includes('宿主在 locale 变化后重渲染自身 shell')
    && item213.note.includes('渲染期惰性取值')
  const n4Ok5 = item213 !== undefined && typeof item213.note === 'string'
    && item213.note.includes('N4') && item213.note.includes('撤离') && item213.note.includes('保持最后一次快照')
  check('COMPAT-005 D1⑧ N3/N4 契约登记：item 2.13 note 含「宿主重渲染自身 shell 前提未证实」（N3）+ locale 撤离保持最后快照为已知边界（N4）',
    n3Ok5 && n4Ok5, 'n3=' + n3Ok5 + ' n4=' + n4Ok5)
  const sem5 = hc5.ctxGetSemantics
  check('COMPAT-005 D1⑧b ctxGetSemantics 诚实保持：本轮未取得宿主源码/真机新证据 ⇒ status 仍 unverified + recheck 留痕可复核（不虚假转 verified）',
    sem5 !== undefined && sem5.status === 'unverified'
      && typeof sem5.recheck === 'string' && sem5.recheck.includes('COMPAT-005')
      && sem5.recheck.includes('保持 unverified') && sem5.recheck.includes('转 verified 的判据'),
    'status=' + String(sem5 === undefined ? null : sem5.status))

  // ⑨ R1 返工 F8（健壮性）：**单点**探针抛错只降级该项（ok:null + detail 含 probe-error + 进 unprobed），
  //    其余已完成读数保留。原实现整体 try ⇒ 一个探针抛错使 8 项读数**全量丢弃**、面 2/3 全退化为「未覆盖」。
  //    构造：临时替换 dom-phase 探针为抛错实现（断言后 finally 复原——不污染后续用例与 D1④ 键集断言）。
  const savedProbe5 = clientExports.CLIENT_PROBES['dom-phase']
  let degraded5 = null
  let probeRestored5 = false
  try {
    clientExports.CLIENT_PROBES['dom-phase'] = () => { throw new Error('boom') }
    const repThrow5 = clientExports.buildDiagReport({ api: apiFull5, server: serverMock5 })
    degraded5 = {
      total: repThrow5.checks.length,
      kept: repThrow5.checks.filter((c) => c.ok !== null).length,
      thrown: repThrow5.checks.find((c) => c.id === 'dom-phase'),
      checkErr: repThrow5.checkErr,
    }
  } finally {
    clientExports.CLIENT_PROBES['dom-phase'] = savedProbe5
    probeRestored5 = clientExports.CLIENT_PROBES['dom-phase'] === savedProbe5
  }
  check('COMPAT-005 D1⑨（R1 返工 F8）探针单点抛错**降级**：仅该项 ok:null + detail 含 probe-error，其余 7 项读数保留（整体 catch 会把 8 项全量丢弃）',
    degraded5 !== null && degraded5.total === 8 && degraded5.kept === 7 && degraded5.checkErr === ''
      && degraded5.thrown !== undefined && degraded5.thrown.ok === null && degraded5.thrown.detail.includes('probe-error')
      && probeRestored5,
    JSON.stringify(degraded5) + ' restored=' + probeRestored5)

  // ⑩ R1 返工 F5~F9 落点机检：
  //    F5 契约 note 与行号**解耦**（不内嵌「现 L…」——字段值才是唯一事实源；原 2.3/3.1/3.6/1.8 note 残留旧值）；
  //    **B-N2（COMPAT-014，收口 REVIEW-COMPAT-005-R2 N2）**：原守卫只匹配 `/现\s*L\d/` 且只扫 note ⇒ 两条**现役**
  //    行号副本逃逸（**历史锚点**：COMPAT-014 时期值——1.3 note「index.js 现调用点 L170/L1367」——「现…L…」中间隔词；1.10 note「emit L155 / logger L122」
  //    ——无「现」字）。现：① 词法覆盖「现…L…」与「emit|logger|logWarn + L…」两形态；② 扫描面扩至 items[].symbol、
  //    faces[].scope、revisions[].scope、regionLiterals、ctxGetSemantics、hostSurface（深度遍历字符串值）——
  //    行号唯一事实源 = 各条 `line` 字段，free-text 不得承载**现役**副本（带「原/收口前」限定的历史锚点不受限）。
  //    F6 死样式/死 i18n 键清除 + diagReason 映射覆盖生产者枚举码（双向：生产码 ⊆ 客户端文案表）；**B-N3**：载荷
  //    `report.host` 仅 null + 枚举码（无自由文本字段）；
  //    F7 产品代码零直连契约（改经边界 `contractProjection`）+ 同一派生式收敛单点 + `bindow` 拼写订正；
  //    F9 `diagDesc`（zh/en）去仓内路径硬编码；F1 附带 `diagRbNone` 文案订正（不再宣称「至少其一在场」）。
  const deepStrings5 = (o) => (typeof o === 'string' ? [o] : (o === null || typeof o !== 'object' ? [] : Object.values(o).flatMap(deepStrings5)))
  const contractNoteTexts5 = [
    ...hc5.items.map((it) => it.note), ...hc5.items.map((it) => it.symbol), ...hc5.clientProbes.map((p) => p.note), hc5.clientProbesNote,
    ...hc5.faces.map((f) => f.scope), ...hc5.revisions.map((r) => r.scope),
    ...deepStrings5(hc5.regionLiterals), ...deepStrings5(hc5.ctxGetSemantics), ...deepStrings5(hc5.hostSurface),
  ].filter((n) => typeof n === 'string')
  // COMPAT-016 P2-2（收口 REVIEW-COMPAT-015-R1 P2-2）：两条陈旧行号词法在此**单点定义**——⑩ 的部署面（下方
  // `staleNoteRefs5`）与 ⑩c 的**正向对照**消费**同一 RegExp 对象**（原实现把同一文本在 ⑩c 内重新声明为副本
  // `LEXER_NOW15`/`LEXER_EMIT15` ⇒ 正控只对副本取样，部署面被改窄仍会全绿——F9 声称关闭的缝隙未被真正关闭）。
  const STALE_RE_NOW5 = /现[^。；]{0,10}L\d/
  const STALE_RE_EMIT5 = /(?:emit|logger|logWarn|emitChanged)\s*(?:\/|,|、)?\s*L\d/
  const staleNoteRefs5 = contractNoteTexts5.filter((n) => STALE_RE_NOW5.test(n) || STALE_RE_EMIT5.test(n))
  // B-N3（R2 N3）：`report.host` 的**自由文本**载体已枚举化——只允许 `version: null` + `versionCode: <枚举码>`
  // （人类可读文案在客户端 i18n，不进网关；原 `versionNote` 自由文本为零散漂移面）。
  const hostPayload5 = rp5 === null || rp5.report === undefined ? null : rp5.report.host
  const fHostEnum5 = hostPayload5 !== null && hostPayload5.version === null
    && typeof hostPayload5.versionCode === 'string' && /^[a-z][a-z0-9-]*$/.test(hostPayload5.versionCode)
    && hostPayload5.versionNote === undefined
  const f6Dead5 = !clientSrc.includes('.nv-diag-sub') && !clientSrc.includes('.nv-diag-tbl code')
    && ['diagStOk', 'diagStMissing', 'diagStUnprobed', 'diagNotDetected'].every((k) => !clientSrc.includes(k))
  const reasonBlock5 = clientSrc.slice(clientSrc.indexOf('diagReason: (code) => ({'), clientSrc.indexOf('}[code] ?? String(code))'))
  const emittedCodes5 = [...new Set([
    ...(rp5 === null ? [] : rp5.report.unprobed.map((u) => u.code)),
    ...(rp5 === null ? [] : rp5.report.notCovered.map((n) => n.code)),
  ])]
  const f6ReasonCovered5 = emittedCodes5.length === 7 && emittedCodes5.every((c) => reasonBlock5.includes(c))
    && reasonBlock5.includes('no-runtime-predicate')
  const f7Boundary5 = !/from '\.\/host-contract/.test(hostSrc5) && !/hostContract\./.test(hostSrc5)
    && boundarySrc5.includes('export function contractProjection()') && boundarySrc5.includes('revision: CONTRACT_TASK')
    && boundarySrc5.includes('hostContract.revisions.at(-1).task')
    && !hc5.clientProbes.some((p) => /bindow/.test(p.note ?? ''))
  const diagDescLines5 = clientSrc.split('\n').filter((l) => /diagDesc:/.test(l))
  const f9Desc5 = diagDescLines5.length === 2 && diagDescLines5.every((l) => !/lib\//.test(l) && !/\.mjs/.test(l))
  const f1TextOk5 = clientSrc.includes('触发条件 = remote.* 命名空间服务族全缺')
    && clientSrc.includes('requires all remote.* namespace services absent')
    && !clientSrc.includes('remote.* 与旧连接载体 .api 至少其一在场')
  check('COMPAT-005 D1⑩（R1 返工 F5~F9 + R2 B-N2/B-N3）落点：F5/B-N2 note+symbol+faces+revisions+regionLiterals+ctxGetSemantics+hostSurface 行号解耦（0 处现役副本；词法含「现…L…」与「emit/logger+L…」）+ B-N3 载荷 host 无自由文本（仅 null + 枚举码 '+ String(hostPayload5 === null ? 'n/a' : hostPayload5.versionCode) +'）+ F6 死样式/死键清除且 diagReason 覆盖全部生产者枚举码（' + emittedCodes5.length + ' 码）+ F7 产品零直连契约/派生式收敛单点/拼写订正 + F9 diagDesc 去硬编码 + F1 diagRbNone 文案订正',
    staleNoteRefs5.length === 0 && fHostEnum5 && f6Dead5 && f6ReasonCovered5 && f7Boundary5 && f9Desc5 && f1TextOk5,
    'staleNote=' + JSON.stringify(staleNoteRefs5.map((n) => n.slice(0, 20))) + ' hostEnum=' + fHostEnum5 + ' f6Dead=' + f6Dead5 + ' f6Codes=' + f6ReasonCovered5
      + ' f7=' + f7Boundary5 + ' f9=' + f9Desc5 + ' f1Text=' + f1TextOk5)

  // ⑩b COMPAT-015 F3（收口 REVIEW-COMPAT-014-R1 F3）：**行号引用 ↔ 契约 `line` 字段** 对账——防「陈旧行号副本」
  //   复发（F3 的 4 处中 3 处在本文件注释：旧值 2.3 `L4374-L4377`、3.1/3.5 的 `L838`/`L896`、3.8 `L2411-2421`
  //   ——均已按契约各条 `line` 字段订正）。
  //   扫描面（**精确口径，不夸大**；COMPAT-016 P3-6 扩面后）：
  //     面 A = 本文件**注释行**（`//` / `/*` / `*` 起首——F3 4 处订正中 3 处的实际承载面）；
  //     面 B = `CHANGELOG.md` 的**当前任务条目**：锚点集 `['- **COMPAT-015', '- **COMPAT-016']` 各自顶层 bullet
  //            起至下一条顶层 bullet 止（新增任务 MUST 把自身条目 id 加入锚点集，否则该条目落在面外）；
  //     面 C = `README.md` **全文**（P3-6 扩面：文档面正文/表格同样承载契约行号引用）；
  //     面 D = `scripts/probe-host.mjs` 与 `test/fixtures/host-surfaces/probe-face.mjs` 的**注释行**（P3-6 扩面：
  //            本批新增文本的主要载体）。install 头部块**不在面内**——其约定行只写字面量不写行号（⑧ 已对账
  //            字面量 ∈ 契约 symbol），无行号引用面可对。
  //     **口径边界（如实披露）**：CHANGELOG 的**历史条目**不在扫描面内——那里的行号是各批次落地时点的记录，对其
  //     施加「与当前契约一致」会系统性假阳并要求改写历史（P-01：不改写记录；同 COMPAT-014 C-F-6「历史锚点」纪律）。
  //   判定：注释行内 `<item> L<n>`（或 `<item> … client.js:<n>`）的 n MUST 落在契约该条 `line` 字段的行界内；
  //   带**历史限定词**的行（旧值 / 历史锚点 / 修正前 / 收口前 / 原实现…）豁免。多段/混合形态的 `line`
  //   （如 `L837-850 / L4554 / L4689`）取各段 min…max 为**宽松界**——该形态下只拦「明显无关」的副本（强度边界如实披露）。
  //   判别力正向对照：注入一处**构造**的陈旧引用（代码行拼装，不入自身注释面）⇒ 扫描器 MUST 命中（防空转/恒真面）；
  //   各面另设**扫描量下限**（防空面：某面被删/改名致扫描面静默归零时必红——扩面本身入机检）。
  const ITEM_LINE_REF5 = /(\d+\.\d+)[^\n]{0,20}?(?:L|client\.js:)(\d+)/g
  const HIST_MARK5 = /旧值|历史锚点|修正前|收口前|原实现|原记|原注释|原范围/
  const COMMENT_LINE_RE5 = /^\s*(\/\/|\*|\/\*)/
  const COMMENT_FACE5 = (l) => COMMENT_LINE_RE5.test(l)
  const itemLineRange5 = (id) => {
    const it = hc5.items.find((x) => x.item === id)
    if (it === undefined || it.line === null) return null
    // 行段形态：`L17-29`（同段简写）与 `L92-94 / L4554`（多段）——逐段取两端（同 smoke 的 LINE_SEG 口径）
    const ns = []
    for (const m of String(it.line).matchAll(/L(\d+)(?:-L?(\d+))?/g)) { ns.push(Number(m[1])); if (m[2] !== undefined) ns.push(Number(m[2])) }
    return ns.length === 0 ? null : [Math.min(...ns), Math.max(...ns)]
  }
  const scanItemLineRefs5 = (lines, opts = {}) => {
    const face = opts.face ?? COMMENT_FACE5
    const base = opts.base ?? 0
    const out = []
    lines.forEach((l, i) => {
      if (!face(l) || HIST_MARK5.test(l)) return
      for (const m of l.matchAll(ITEM_LINE_REF5)) {
        const r = itemLineRange5(m[1])
        if (r !== null && (Number(m[2]) < r[0] || Number(m[2]) > r[1])) out.push('L' + (base + i + 1) + ': ' + m[1] + ' L' + m[2] + ' ∉ ' + JSON.stringify(r))
      }
    })
    return out
  }
  const smokeSrc15 = readFileSync(new URL('./smoke.mjs', import.meta.url), 'utf8')
  const smokeLines15 = smokeSrc15.split('\n')
  const changelogLines15 = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').split('\n')
  // COMPAT-021 新条目入锚点集（新增任务 MUST 把自身条目 id 加入锚点集，否则该条目落在面外——本批遵守；
  // BUG-012 同批加入）。
  const CHANGELOG_ENTRY_ANCHORS15 = ['- **COMPAT-015', '- **COMPAT-016', '- **COMPAT-021', '- **BUG-012']
  const changelogEntrySlices15 = CHANGELOG_ENTRY_ANCHORS15.map((anchor) => {
    const start = changelogLines15.findIndex((l) => l.startsWith(anchor))
    if (start < 0) return { anchor, start: -1, lines: [] }
    let end = changelogLines15.length
    for (let i = start + 1; i < changelogLines15.length; i++) if (/^- \*\*/.test(changelogLines15[i])) { end = i; break }
    return { anchor, start, lines: changelogLines15.slice(start, end) }
  })
  const changelogAnchorsMissing15 = changelogEntrySlices15.filter((s) => s.start < 0).map((s) => s.anchor)
  const readmeLines15 = readFileSync(new URL('../README.md', import.meta.url), 'utf8').split('\n')
  // 面 C/D 各读一次（本块与 ⑧b/⑧c 分属不同作用域块，不复用其 const；文件同源 ⇒ 口径一致）。
  const probeHostLines15 = readFileSync(new URL('../scripts/probe-host.mjs', import.meta.url), 'utf8').split('\n')
  const probeFaceLines15 = readFileSync(new URL('./fixtures/host-surfaces/probe-face.mjs', import.meta.url), 'utf8').split('\n')
  const staleRefs15 = [
    ...scanItemLineRefs5(smokeLines15),
    ...changelogEntrySlices15.flatMap((s) => scanItemLineRefs5(s.lines, { face: () => true, base: s.start })),
    ...scanItemLineRefs5(readmeLines15, { face: () => true }),
    ...scanItemLineRefs5(probeHostLines15),
    ...scanItemLineRefs5(probeFaceLines15),
  ]
  const injectedStaleRef15 = '// ' + '2.3' + ' `L' + '4374-L4377`'   // 拼装：避免本守卫自身文本入注释扫描面
  const injectedHit15 = scanItemLineRefs5([injectedStaleRef15]).length
  const surfaceLines15 = {
    'smoke 注释': smokeLines15.filter((l) => COMMENT_LINE_RE5.test(l)).length,
    'CHANGELOG 当前条目': changelogEntrySlices15.flatMap((s) => s.lines).length,
    'README 全文': readmeLines15.length,
    'probe-host 注释': probeHostLines15.filter((l) => COMMENT_LINE_RE5.test(l)).length,
    'probe-face 注释': probeFaceLines15.filter((l) => COMMENT_LINE_RE5.test(l)).length,
  }
  // 防空面下限（P3-6 扩面的非恒真证明）：任一面被删 / 改名 / 缩到不承载文本 ⇒ 该面计数跌落下限即红。
  const surfaceFloors15 = { 'smoke 注释': 400, 'CHANGELOG 当前条目': 5, 'README 全文': 150, 'probe-host 注释': 30, 'probe-face 注释': 80 }
  const surfaceVacuous15 = Object.entries(surfaceFloors15).filter(([k, min]) => surfaceLines15[k] < min).map(([k, min]) => k + '=' + surfaceLines15[k] + '<' + min)
  check('COMPAT-015 F3 行号引用对账（COMPAT-016 P3-6 扩面：' + Object.entries(surfaceLines15).map(([k, v]) => k + ' ' + v + ' 行').join(' + ') + '）：各面内 `<item> L<n>` 引用 MUST 落在契约该条 `line` 字段界内（0 处陈旧副本；历史限定词行豁免）；**判别力正向对照**：注入构造陈旧对 ⇒ 扫描器命中 ' + injectedHit15 + ' 处（>0 ⇒ 非恒真）∧ 各面扫描量 ≥ 下限（防空面）∧ CHANGELOG 锚点集齐备',
    staleRefs15.length === 0 && injectedHit15 > 0 && surfaceVacuous15.length === 0 && changelogAnchorsMissing15.length === 0,
    'stale=' + JSON.stringify(staleRefs15.slice(0, 6)) + '(total ' + staleRefs15.length + ') injectedHit=' + injectedHit15 + ' vacuous=' + JSON.stringify(surfaceVacuous15) + ' anchorsMissing=' + JSON.stringify(changelogAnchorsMissing15) + ' surfaces=' + JSON.stringify(surfaceLines15))

  // ⑩c COMPAT-015 F9（收口 REVIEW-COMPAT-014-R1 F9）：B-N2 扩宽词法的**正向对照**——原断言只有负向（「契约 free-text
  //   内 0 处现役副本」），词法若被误改为更窄形态仍会全绿（退化为「零命中 = 无副本」的恒真面）。仓库先例要求
  //   扩宽能力必须带正向对照（COMPAT-012 N1 ①a「R1 口径漏检 ∧ 现行口径命中」/ COMPAT-005 F2「注入 ⇒ 扫描器必红」）。
  //   此处把两个**历史逃逸形态**固化为正例，并把「原…」历史锚点形态固化为面外负例（词法边界双向）。
  //   **COMPAT-016 P2-2（收口 REVIEW-COMPAT-015-R1 P2-2）**：原实现把这两条词法在此**重新声明为副本**
  //   （`LEXER_NOW15`/`LEXER_EMIT15`，文本与 ⑩ 部署面相同但**不是同一对象**）⇒ 正控只对副本取样：部署词法被改窄
  //   （如 `{0,10}` → `{0,3}`、或删 emit 分支）时本断言**仍全绿**——F9 声称关闭的缝隙只被「看似」关闭。现正控直接
  //   引用 ⑩ 的**同一 RegExp 对象**（`STALE_RE_NOW5` / `STALE_RE_EMIT5`）⇒ 正控与部署面同源、不可能分叉；
  //   「改窄 ⇒ 必红」由两项同时证明：① 对象同一性（`lexerShared15`）；② 把部署词法本体改窄后**同一正例读数变化**
  //   （`narrowedNowHit5 === false`）。真机负例见 COMPAT-016 证据（改窄 ⑩ 部署词法 → smoke 红 → 还原 + sha256 复核）。
  const lexerProbes15 = [
    { form: '「现…（间隔 ≤10 字）L…」', sample: 'index.js ' + '现调用点 ' + 'L' + '170', re: STALE_RE_NOW5 },
    { form: '「emit/logger… + L…」（无「现」字）', sample: 'emit ' + 'L' + '155', re: STALE_RE_EMIT5 },
    { form: '历史锚点「原…L…」（词法面外，Must NOT 命中）', sample: 'index.js ' + '原调用点 ' + 'L' + '170', re: STALE_RE_NOW5 },
  ]
  const lexerShared15 = lexerProbes15[0].re === STALE_RE_NOW5 && lexerProbes15[1].re === STALE_RE_EMIT5 && lexerProbes15[2].re === STALE_RE_NOW5
  const narrowedNow5 = new RegExp(STALE_RE_NOW5.source.replace('{0,10}', '{0,3}'))
  const narrowedNowHit5 = narrowedNow5.test(lexerProbes15[0].sample)
  const lexerProbeHits15 = lexerProbes15.map((p) => p.re.test(p.sample))
  check('COMPAT-015 F9 B-N2 词法正向对照（COMPAT-016 P2-2 强化：正控与**部署面同源**——同一 RegExp 对象，非文本副本）：两个历史逃逸形态（「现…L…」带间隔词 / 「emit|logger(+L…)」无「现」字）MUST 被现行词法命中 ∧ 历史锚点形态（「原…L…」）MUST NOT 命中（3 例双向——词法被改窄或改宽均红）∧ 对象同一性成立（' + lexerShared15 + '）∧ 改窄部署词法（间隔上限 10 → 3）后同一正例 MUST 不再命中（' + narrowedNowHit5 + '）',
    lexerShared15 && narrowedNowHit5 === false && lexerProbeHits15[0] === true && lexerProbeHits15[1] === true && lexerProbeHits15[2] === false,
    'hits=' + JSON.stringify(lexerProbes15.map((p, i) => p.form + '=' + lexerProbeHits15[i])) + ' shared=' + lexerShared15 + ' narrowedNowHit=' + narrowedNowHit5)
}

// ── UX-060：创作台标题栏告警与标题栏文字重叠（告警全文须入流式可读面）─────────────────
// 用户报障（1078×593 实机截图红框「1.告警和上面的文字重叠」）：长错误文本在标题栏 `.nv-bar-note` 里
// max-width:46% + nowrap + ellipsis 单行截断，全文唯一出口 = 浏览器原生 title tooltip（浮层不受插件
// 布局约束，压在标题栏居中横幅与右侧 ⇄⟳☆ 之上）。修复 = 长告警走标题栏**下方**的流式可读面
// （in-flow、pre-wrap 不截断、可关闭），短提示保留标题栏紧凑 chip（窄栏实测相交时同升级）。
// 本节断言「形态裁决 + 结构 + 文案零改动 + 几何占位 + 探针资产」五项；几何数值由
// scripts/probe-nv-bar-geometry.mjs（隔离 DSH 实例 + 无头浏览器 + CDP）两视口实测，不在 smoke 内跑浏览器。
{
  const probeSrc60 = readFileSync(new URL('../scripts/probe-nv-bar-geometry.mjs', import.meta.url), 'utf8')
  const idxBar60 = clientSrc.indexOf("{ ref: barRef, className: 'nv-bar' }")
  const idxNotice60 = clientSrc.indexOf("className: 'nv-notice'")
  const idxMain60 = clientSrc.indexOf("className: 'nv-main'")
  check('UX-060 ①告警形态裁决单一事实源（长文本 > NOTICE_INLINE_MAX 或**实测** chip ∩ 横幅占位区 ⇒ 流式面；短提示保留标题栏 chip）',
    clientSrc.includes('const NOTICE_INLINE_MAX = 24')
      && clientSrc.includes('const noticeStream = barNotice !== null && (barNotice.text.length > NOTICE_INLINE_MAX || noticeEscalate === true)')
      && clientSrc.includes("const chip = bar.querySelector('.nv-bar-note')")
      && clientSrc.includes('if (hit) setNoticeEscalate(true)')                       // 实测相交 ⇒ 单向升级
      && clientSrc.includes('setNoticeEscalate(false) }, [noticeKey])')               // 告警文本变化 ⇒ 复位重测
      && clientSrc.includes('barNotice !== null && noticeStream !== true')             // chip 路径保留（短提示）
      && clientSrc.includes('.nv-bar-note{flex:0 1 auto;min-width:0;max-width:46%'),   // 既有 chip 样式未动
    'inlineMax=' + clientSrc.includes('const NOTICE_INLINE_MAX = 24') + ' escalate=' + clientSrc.includes('if (hit) setNoticeEscalate(true)'))
  check('UX-060 ②流式可读面结构（.nv-bar 兄弟节点 = 标题栏下方一行；pre-wrap 完整换行不截断；关闭钮 + 全文无 title 依赖）',
    idxBar60 >= 0 && idxNotice60 > idxBar60 && idxMain60 > idxNotice60                 // 顺序：标题栏 → 告警条 → 主区（in-flow，非浮层）
      && !clientSrc.includes("'nv-notice', style: { position: 'absolute'")             // 非绝对定位（负断言）
      && clientSrc.includes('.nv-notice{flex:none;')                                   // flex:none 参与列布局（下推而非覆盖）
      && clientSrc.includes('white-space:pre-wrap;overflow-wrap:anywhere')             // 多行换行
      && clientSrc.includes("el('span', { className: 'nv-notice-text' }, barNotice.text)")  // 全文以**文本节点**呈现（非 title 属性）
      && clientSrc.includes("className: 'nv-notice-close'")
      && (clientSrc.match(/t\('noticeClose'\)/g) ?? []).length === 2                   // title + aria-label 双声明
      && clientSrc.includes("'data-form': barNotice.text.length > NOTICE_INLINE_MAX ? 'block' : 'row'"),
    'order=' + idxBar60 + '<' + idxNotice60 + '<' + idxMain60 + ' prewrap=' + clientSrc.includes('white-space:pre-wrap;overflow-wrap:anywhere'))
  check('UX-060 ③文案零改动 + 新 i18n 键 zh/en 成对（noticeClose；既有告警文案逐字不变）',
    (clientSrc.match(/noticeClose: '关闭提示'/g) ?? []).length === 1
      && (clientSrc.match(/noticeClose: 'Dismiss notice'/g) ?? []).length === 1
      && clientSrc.includes("promptFailPrefix: '会话已就绪，但启动指令发送失败：'")
      && clientSrc.includes("promptFailHint: '请打开该会话手动发送启动指令。'")
      && clientSrc.includes("presetFailPrefix: '会话已创建，但「小说写作工作流」预设挂载失败：'")
      && clientSrc.includes("presetFailHint: '请打开该会话手动选择预设后，再发送启动指令。'")
      && clientSrc.includes("promptFailPrefix: 'Session ready, but sending the start instruction failed: '")
      && clientSrc.includes("presetFailHint: 'Mount that preset inside the session, then send the start instruction.'"),
    'zh/en 成对=' + ((clientSrc.match(/noticeClose: '/g) ?? []).length === 2))
  check('UX-060 ⑤几何探针资产在仓（P-04 看护：隔离实例 + 无头浏览器 + 两视口交集判据 + 真实环境只读复核；浏览器不在 smoke 内跑）',
    probeSrc60.includes('DSH_HOME') && probeSrc60.includes('containment')
      && probeSrc60.includes("{ name: '1078x593'") && probeSrc60.includes("{ name: '1400x900'")
      && probeSrc60.includes('Emulation.setDeviceMetricsOverride') && probeSrc60.includes('Fetch.fulfillRequest')
      && probeSrc60.includes("verdict('C2-no-overlap-bar'") && probeSrc60.includes('intersectionSum === 0')
      && probeSrc60.includes('realFingerprint') && probeSrc60.includes('realEnvAfter')
      && probeSrc60.includes('mklink'),
    'probe=' + probeSrc60.length + ' bytes')
}

// ── BUG-007：预设 persona 行 config 键（宿主耦合字面量，P-10）× 契约 presetRowConfig + 看护接线 ──
// 动因：宿主 @deepseek-ai/dsh-persona 0.1.5-rc.2 把 Config 收紧为 `prefix` 必填，本仓 persona 行仍写
// `text` ⇒ 该行 config 校验失败 ⇒ **整棵预设挂载被否决**（工作台 resume/绑定新会话 + 宿主预设切换器两条
// 消费路径同时失败）。① 本节把「组合文件里的键集」与契约 presetRowConfig[].usedKeys/keys 做**双向 ⊆ 对账**
// ——纯文本提取，**离线可跑**（CI sanity 无宿主平面/npm 依赖时同样有效），正是本缺陷的 CI 侧回归信号；
// ② 权威校验（用已装宿主真实 Config + cordis resolveConfig 逐行核对）在 preset-schema-face.mjs，本节断言
// 它被 validate-preset 接线（防静默摘除）且三态自洽（PASS 只允许出现在 checked>0 时）。
{
  const { hostContract: hc7 } = await import('../lib/host-contract.mjs')
  const composition7 = readFileSync(new URL('../agent-presets/novel-writing/agent.cordis.yml', import.meta.url), 'utf8')
  const decl = Array.isArray(hc7.presetRowConfig) ? hc7.presetRowConfig.find((d) => d.row === 'persona') : undefined
  // 组合文件内 persona 行 config 的直接子键（4 空格缩进；块标量正文更深 ⇒ 不入提取面）
  const extraction7 = (() => {
    const lines = composition7.split('\n')
    const start = lines.findIndex((l) => /^- id: persona\s*$/.test(l))
    if (start < 0) return { found: false, keys: [] }
    const end = lines.findIndex((l, i) => i > start && /^- (id|name):/.test(l))
    const block = lines.slice(start, end < 0 ? lines.length : end)
    const cfg = block.findIndex((l) => /^  config:\s*$/.test(l))
    const keys = cfg < 0 ? [] : block.slice(cfg + 1).filter((l) => /^    \S/.test(l)).map((l) => (l.match(/^ {4}([^\s:]+):/) ?? [])[1]).filter((k) => k !== undefined)
    return { found: true, configDeclared: cfg >= 0, keys }
  })()
  const declKeys = decl === undefined ? [] : decl.keys
  const declUsed = decl === undefined ? [] : decl.usedKeys
  const declRequired = decl === undefined ? [] : decl.requiredKeys
  const sameSet7 = (a, b) => a.length === b.length && a.every((x) => b.includes(x))
  check('BUG-007 P-10 契约 presetRowConfig：契约存在 persona 声明（keys ' + JSON.stringify(declKeys) + ' / requiredKeys ' + JSON.stringify(declRequired) + ' / usedKeys ' + JSON.stringify(declUsed) + '）∧ 组合文件 persona 行 config 键集 ≡ usedKeys（**双向 ⊆**）∧ usedKeys ⊆ keys ∧ requiredKeys ⊆ usedKeys ∧ 键面非空（防空面恒真）',
    decl !== undefined && decl.hostPackage === '@deepseek-ai/dsh-persona' && decl.incident === 'BUG-007'
      && typeof decl.source === 'string' && decl.source.includes('dsh-persona@') && decl.source.includes('L23-28')
      && extraction7.found && extraction7.configDeclared && extraction7.keys.length > 0
      && sameSet7(extraction7.keys, declUsed)
      && declUsed.every((k) => declKeys.includes(k)) && declRequired.every((k) => declUsed.includes(k))
      && declKeys.length >= 4 && declRequired.length >= 1,
    'extracted=' + JSON.stringify(extraction7.keys) + ' used=' + JSON.stringify(declUsed) + ' keys=' + JSON.stringify(declKeys) + ' required=' + JSON.stringify(declRequired))
  // 判别力正向对照（**离线**、零宿主依赖）：把提取面喂进同一判据——历史坏形态 `text`（BUG-007 原始缺陷）
  // 必红，现行键集必绿。判据与部署面共用同一比对函数（sameSet7），不是文本副本。
  const mutantBad7 = sameSet7(['text'], declUsed) && ['text'].every((k) => declKeys.includes(k))
  const mutantGood7 = sameSet7(['prefix'], declUsed)
  check('BUG-007 判据正向对照（离线）：键集对账对历史坏形态 `text` **必红**（sameSet=' + mutantBad7 + ' ∧ ⊆ keys=' + (['text'].every((k) => declKeys.includes(k))) + '）∧ 现行 `prefix` 必绿（' + mutantGood7 + '）——对账函数与部署面同源（非恒真）',
    mutantBad7 === false && mutantGood7 === true,
    'bad=' + mutantBad7 + ' good=' + mutantGood7)
  // 看护接线自断言（段/文件级，非全文子串）：validate-preset.mjs 必须调用 preset-schema-face 的三态判定；
  // 且该模块必须导出三态常量与逐行表（摘除接线或降级成两态即红）。
  const validatePresetSrc7 = readFileSync(new URL('./validate-preset.mjs', import.meta.url), 'utf8')
  const guardSrc7 = readFileSync(new URL('./fixtures/host-surfaces/preset-schema-face.mjs', import.meta.url), 'utf8')
  check('BUG-007 看护接线自断言：validate-preset.mjs 调用 checkComposition（第 4 段）∧ preset-schema-face.mjs 导出三态 VERDICT_PASS/FAIL/NOT_RUN 与 formatRows（摘除接线或退化为两态即红）',
    validatePresetSrc7.includes('checkComposition') && validatePresetSrc7.includes('preset-schema-face.mjs')
      && guardSrc7.includes("export const VERDICT_NOT_RUN = 'NOT_RUN'") && guardSrc7.includes("export const VERDICT_PASS = 'PASS'")
      && guardSrc7.includes("export const VERDICT_FAIL = 'FAIL'") && guardSrc7.includes('export function formatRows'),
    'wired=' + validatePresetSrc7.includes('checkComposition') + ' triState=' + guardSrc7.includes('VERDICT_NOT_RUN'))
  // 三态自洽（PASS 语义不可真空）：在**本环境**跑一次看护——PASS 仅当 checked>0；NOT_RUN/FAIL 如实记录在
  // 断言名内（宿主平面缺席的 CI 会显示 NOT_RUN，**不是**把未验证渲染成通过）。
  const { checkComposition: checkComp7, VERDICT_PASS: vPass7 } = await import('./fixtures/host-surfaces/preset-schema-face.mjs')
  const report7 = await checkComp7({})
  const vacuous7 = report7.verdict === vPass7 && (report7.coverage === null || report7.coverage.checked === 0)
  check('BUG-007 看护三态自洽（本环境判定 ' + report7.verdict + (report7.coverage === null ? '' : '，checked=' + report7.coverage.checked + '/' + report7.coverage.enabled) + '）：PASS **只允许**出现在 checked>0（发现项 ' + (report7.coverage?.findings ?? '-') + '）时——NOT_RUN 绝不渲染成 PASS',
    vacuous7 === false && report7.rows.length > 0,
    'verdict=' + report7.verdict + ' vacuous=' + vacuous7 + ' reason=' + String(report7.reason))
}

// ── BUG-011 B2：双源等价机检（agent.cordis.yml = 0.1.x 通道真源 ↔ cordis.patch.yml = 0.2.0 通道真源）──
// 动因：预设组合从 0.2.0 起由 bundle patch 的 `@deepseek-ai/dsh-agent-preset` 声明行承载（`.agent-presets/`
// 目录机制官方废弃），同一份组合行从此存在两份真源——无守卫的双源必然漂移（本批实现期即被本判据抓到
// 两处转录差：persona「无法确证」与 plan-mode「手动切换模式」）。判据（离线、加载器同方言解析）：
//   ① 两源行序列（id 依序）全等，**唯一**允许差异 = 已知代际变体（yml `workflow-worker-thread` ↔
//      patch `workflow-ptc`，同位置成对替换，config 同为 {provider:spawn}）；
//   ② 共享行 config 深度全等，**唯一**例外 = skill-filesystem 的 customSkillDirs 表达式
//      （0.1.x baseUrl=预设目录 `skills/`；0.2.0 baseUrl=profile 目录 ⇒ 包内路径
//      `node_modules/dsh-novel-writing/agent-presets/novel-writing/skills/`——两式各自钉死）；
//   ③ patch 侧声明行形状：name=@deepseek-ai/dsh-agent-preset ∧ config.id=novel-writing ∧ plugins 数组
//      ∧ 显示名与 preset.yml 一致 ∧ order 为数字；宿主行 novel-writing 在 insert 内。
// 判别力正向对照：构造变体（删 ptc 行 / 改共享行 config / 删声明行）喂同一判据必红（非恒真）。
{
  const yaml11mod = await import('js-yaml')
  const yaml11 = yaml11mod.default ?? yaml11mod
  const JsExpr11 = new yaml11.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: (data) => ({ __jsExpr: data }) })
  const schema11 = yaml11.DEFAULT_SCHEMA.extend([JsExpr11])
  const patchText11 = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const ymlText11 = readFileSync(new URL('../agent-presets/novel-writing/agent.cordis.yml', import.meta.url), 'utf8')
  const presetMeta11 = readFileSync(new URL('../agent-presets/novel-writing/preset.yml', import.meta.url), 'utf8')
  const VARIANT_LEGACY_11 = 'workflow-worker-thread:@deepseek-ai/dsh-workflow-worker-thread'
  const VARIANT_CURRENT_11 = 'workflow-ptc:@deepseek-ai/dsh-workflow-ptc'
  const SKILL_LEGACY_11 = "new URL('skills/', baseUrl)"
  const SKILL_PATCH_11 = "new URL('node_modules/dsh-novel-writing/agent-presets/novel-writing/skills/', baseUrl)"
  // COMPAT-020 代际删除行：0.1.x 源保留独立 list-agents 子路径行；0.2.2 起该子路径从包 exports 移除
  // （`list_agents` 并入主包）⇒ 0.2.x 源（bundle patch）MUST 0 行、0.1.x 源 MUST 恰 1 行、patch 主包行在场。
  const DROPPED_LEGACY_11 = 'tool-subagent-list-agents:@deepseek-ai/dsh-tool-subagent-control/list-agents'
  const DROPPED_REPLACEMENT_11 = '@deepseek-ai/dsh-tool-subagent-control'
  const flatRows11 = (rows, out = []) => {
    for (const row of rows) {
      if (row === null || typeof row !== 'object' || Array.isArray(row)) continue
      const { id, config, ...rest } = row
      // 叶行：config 入比较面（漂移即红）；group 行：config=子行列表由递归摊平逐位比较，不入 JSON。
      const comparable = row.group === true ? rest : { ...rest, ...(config !== undefined ? { config } : {}) }
      out.push({ key: String(id ?? '') + ':' + String(row.name ?? ''), rest: JSON.stringify(comparable) })
      if (row.group === true && Array.isArray(config)) flatRows11(config, out)
    }
    return out
  }
  /** 纯判据：两源解析产物 → 问题清单（空 = 等价）。group 行摊平后逐位比较（子行差即组差）。 */
  const dualProblems11 = (patchObj, ymlObj, presetName11) => {
    const problems = []
    const inserts = Array.isArray(patchObj) ? patchObj.flatMap((p) => (p && Array.isArray(p.insert)) ? p.insert : []) : []
    const decl = inserts.find((r) => r && r.name === '@deepseek-ai/dsh-agent-preset')
    if (decl === undefined) return ['patch 缺少 @deepseek-ai/dsh-agent-preset 声明行']
    if (!inserts.some((r) => r && r.id === 'novel-writing' && r.name === 'dsh-novel-writing')) problems.push('patch 缺少宿主行 novel-writing（dsh-novel-writing）')
    if (decl.config?.id !== 'novel-writing') problems.push('声明行 config.id ≠ novel-writing（实为 ' + String(decl.config?.id) + '）')
    if (!Array.isArray(decl.config?.plugins)) problems.push('声明行 config.plugins 不是数组')
    if (typeof decl.config?.order !== 'number') problems.push('声明行 config.order 非数字')
    if (typeof decl.config?.name !== 'string' || decl.config.name !== presetName11) problems.push('声明行显示名 ≠ preset.yml name（' + String(decl.config?.name) + ' ≠ ' + presetName11 + '）')
    const A = flatRows11(Array.isArray(decl.config?.plugins) ? decl.config.plugins : [])
    const B0 = flatRows11(Array.isArray(ymlObj) ? ymlObj : [])
    // COMPAT-020 双源方向性硬不变量（发现项口径，非白名单容忍）：
    //   patch 恰 0 行 legacy-only（0.2.2 exports 已移除 ⇒ 残留即整棵预设加载失败）；
    //   yml 恰 1 行（0 行 = 0.1.x 丢工具）；该行 config 空/未声明；patch 主包行在场（0.2.2+ 注册 list_agents）。
    const aDropped = A.filter((r) => r.key === DROPPED_LEGACY_11)
    const bDropped = B0.filter((r) => r.key === DROPPED_LEGACY_11)
    if (aDropped.length !== 0) problems.push('patch 必须 0 行 legacy-only list-agents（实测 ' + aDropped.length + '；0.2.2 起子路径已从 exports 移除）')
    if (bDropped.length !== 1) problems.push('yml 必须恰 1 行 legacy-only list-agents（实测 ' + bDropped.length + '；0 行 = 0.1.x 丢工具）')
    if (bDropped.length === 1) {
      const droppedCfg = JSON.parse(bDropped[0].rest).config
      const empty = droppedCfg === undefined || droppedCfg === null || (typeof droppedCfg === 'object' && !Array.isArray(droppedCfg) && Object.keys(droppedCfg).length === 0)
      if (!empty) problems.push('legacy-only list-agents 行 config 必须空/未声明（实测 ' + JSON.stringify(droppedCfg) + '）')
    }
    if (!A.some((r) => r.key === 'tool-subagent-control:' + DROPPED_REPLACEMENT_11)) problems.push('patch 缺少主包 ' + DROPPED_REPLACEMENT_11 + ' 行（0.2.2+ 由它注册 list_agents）')
    // 等价比较面：yml 侧剔除这 1 行 legacy-only（patch 侧 0 行已单独断言）⇒ 其余行逐位全等仍成立。
    const B = B0.filter((r) => r.key !== DROPPED_LEGACY_11)
    if (A.length !== B.length) problems.push(`行数不等（patch ${A.length} ≠ yml ${B.length}；已剔除 legacy-only 行）`)
    const n = Math.min(A.length, B.length)
    let variants = 0
    for (let i = 0; i < n; i++) {
      const a = A[i]; const b = B[i]
      if (a.key === b.key) continue
      if (a.key === VARIANT_CURRENT_11 && b.key === VARIANT_LEGACY_11) { variants += 1; continue }
      problems.push(`行 ${i + 1} 不一致：patch=${a.key} ≠ yml=${b.key}`)
    }
    if (variants !== 1) problems.push('代际变体行恰为 1 对（实测 ' + variants + '；0 对 = 变体丢失，>1 = 白名单外差异）')
    for (let i = 0; i < n; i++) {
      if (A[i].key !== B[i].key) continue
      if (A[i].rest === B[i].rest) continue
      if (A[i].key === 'skill-filesystem:@deepseek-ai/dsh-skill-filesystem') continue
      problems.push(`行 ${A[i].key} config 漂移：patch=${A[i].rest.slice(0, 160)} ≠ yml=${B[i].rest.slice(0, 160)}`)
    }
    return problems
  }
  const parse11 = (text) => yaml11.load(text, { schema: schema11 })
  const patchObj11 = parse11(patchText11)
  const ymlObj11 = parse11(ymlText11)
  const presetName11 = ((/^name:\s*(.+)$/m.exec(presetMeta11)) ?? [])[1]?.trim() ?? ''
  const problems11 = dualProblems11(patchObj11, ymlObj11, presetName11)
  // 变体行 config 同构（provider:spawn）与 skills 两式钉死（文本面，防表达式本身被改坏）。
  // 变体行在 delegation group 的子行列表内 ⇒ 按行 id 递归查找（group 行 config = 子行数组）。
  const findRow11 = (rows, id) => {
    for (const row of rows) {
      if (row === null || typeof row !== 'object') continue
      if (row.id === id) return row
      if (row.group === true && Array.isArray(row.config)) {
        const hit = findRow11(row.config, id)
        if (hit !== undefined) return hit
      }
    }
    return undefined
  }
  const decl11 = patchObj11.flatMap((p) => p.insert).find((r) => r.name === '@deepseek-ai/dsh-agent-preset')
  const ptcRow11 = JSON.stringify(findRow11(decl11.config.plugins, 'workflow-ptc')?.config)
  const wtRow11 = JSON.stringify(findRow11(ymlObj11, 'workflow-worker-thread')?.config)
  const skillPatched11 = patchText11.includes(SKILL_PATCH_11)
  const skillLegacy11 = ymlText11.includes(SKILL_LEGACY_11)
  check('BUG-011 B2 双源等价：agent.cordis.yml（0.1.x 真源，worker-thread 行保留）↔ cordis.patch.yml 声明行 plugins（0.2.0 真源，ptc 行）行序列/config 全等（唯一允许差异 = 代际变体 + skills 相对路径两式）∧ 声明行形状（id=novel-writing/显示名=preset.yml/order 数字）∧ 宿主行在场',
    problems11.length === 0 && ptcRow11 === wtRow11 && ptcRow11 === '{"provider":"spawn"}' && skillPatched11 && skillLegacy11,
    'problems=' + JSON.stringify(problems11.slice(0, 4)) + '(total ' + problems11.length + ') ptc=' + ptcRow11 + ' wt=' + wtRow11 + ' skillP=' + skillPatched11 + ' skillL=' + skillLegacy11)
  // 判别力正向对照（同判据喂构造变体，必红）：① 删 patch 的 ptc 行；② 改一个共享行 config；③ 删声明行。
  const declMut1 = structuredClone(decl11)
  declMut1.config.plugins = declMut1.config.plugins.filter((r) => r.id !== 'workflow-ptc')
  const neg1 = dualProblems11([{ insert: [declMut1] }], ymlObj11, presetName11)
  const declMut2 = structuredClone(decl11)
  declMut2.config.plugins.find((r) => r.id === 'tool-todo').config = { allowParallelInProgress: false }
  const neg2 = dualProblems11([{ insert: [declMut2] }], ymlObj11, presetName11)
  const neg3 = dualProblems11([{ insert: [] }], ymlObj11, presetName11)
  // ④ 回归复现变体：把 0.1.x 的 legacy-only 行重新塞回 patch 的 delegation group（= COMPAT-020 原故障形态）⇒ 必红。
  const declMut4 = structuredClone(decl11)
  declMut4.config.plugins.find((r) => r.id === 'delegation').config.push({ id: 'tool-subagent-list-agents', name: '@deepseek-ai/dsh-tool-subagent-control/list-agents' })
  const neg4 = dualProblems11([{ insert: [declMut4] }], ymlObj11, presetName11)
  check('BUG-011 B2 判别力正向对照：删 ptc 行 ⇒ 红（' + neg1.length + ' 项）∧ 改共享行 config ⇒ 红（' + neg2.length + ' 项）∧ 删声明行 ⇒ 红（' + neg3.length + ' 项）∧ patch 残留 legacy-only list-agents 行 ⇒ 红（' + neg4.length + ' 项）——判据非恒真',
    neg1.length > 0 && neg2.length > 0 && neg3.length > 0 && neg4.length > 0,
    'neg1=' + JSON.stringify(neg1.slice(0, 2)) + ' neg2=' + JSON.stringify(neg2.slice(0, 2)) + ' neg3=' + JSON.stringify(neg3.slice(0, 2)) + ' neg4=' + JSON.stringify(neg4.slice(0, 2)))
  // preset-schema-face 双源接线自断言：validate-preset 以 dual 模式调用；工具导出双源常量与抽取器。
  // COMPAT-020：GENERATION_DROPPED（代际删除行）双源看护接线 + P-10 契约登记双向对账（负向字面量
  // 只在 0.1.x 源出现 ⇒ 0.2.x 源零命中；契约 5.2 登记 legacy-only 行 + 主包 `list_agents` 正负两面）。
  const psfSrc11 = readFileSync(new URL('./fixtures/host-surfaces/preset-schema-face.mjs', import.meta.url), 'utf8')
  const vpSrc11 = readFileSync(new URL('./validate-preset.mjs', import.meta.url), 'utf8')
  const hcSrc11 = readFileSync(new URL('../lib/host-contract.mjs', import.meta.url), 'utf8')
  const droppedLiteral11 = '@deepseek-ai/dsh-tool-subagent-control/list-agents'
  const ymlDroppedDecls11 = (ymlText11.match(/'@deepseek-ai\/dsh-tool-subagent-control\/list-agents'/g) ?? []).length
  // 披露枚举**块级**提取（COMPAT-020 复核缺口）：全文 includes 会被 walk 分支的 `kind: 'GENERATION_DROPPED',`
  // 误命中 ⇒ 即便把它从 UNVERIFIED_KINDS 数组删掉也不会红。故只截 `export const X = [...]` 的数组块再判包含。
  const kindsBlock11 = (src, name) => {
    const start = src.indexOf('export const ' + name + ' =')
    if (start < 0) return ''
    const open = src.indexOf('[', start)
    const close = open < 0 ? -1 : src.indexOf(']', open)
    return open < 0 || close < 0 ? '' : src.slice(open, close + 1)
  }
  const unverifiedKinds11 = kindsBlock11(psfSrc11, 'UNVERIFIED_KINDS')
  const findingKinds11 = kindsBlock11(psfSrc11, 'FINDING_KINDS')
  // 提取器判别力自证：只有 walk 分支的 kind 字面量、没有数组块 ⇒ 必须提不出（否则块级断言仍可能被误命中）
  const strayKinds11 = kindsBlock11("entry.rows.push({ ...record, kind: 'GENERATION_DROPPED', message: 'x' })", 'UNVERIFIED_KINDS')
  check('BUG-011 B2 双源看护接线：preset-schema-face 导出 PATCH_COMPOSITION/DECLARATION_PACKAGE/GENERATION_VARIANT/GENERATION_DROPPED/extractDeclarationPlugins ∧ GENERATION_VARIANT 与 GENERATION_DROPPED 均为披露项 ∧ DUAL_SOURCE_DRIFT 为发现项 ∧ validate-preset 以 dual:true 调用并披露 generation-dropped ∧ COMPAT-020 双源字面量方向（patch 零命中 legacy-only 行 / yml 恰 1 行声明）∧ 契约登记（正向主包 list_agents + 负向 legacy-only 子路径）∧ UNVERIFIED_KINDS 数组块含 GENERATION_DROPPED 且 FINDING_KINDS 数组块不含（块级精确，防 walk 分支误命中）',
    psfSrc11.includes('export const PATCH_COMPOSITION') && psfSrc11.includes('export const DECLARATION_PACKAGE')
      && psfSrc11.includes('export const GENERATION_VARIANT') && psfSrc11.includes('export function extractDeclarationPlugins')
      && psfSrc11.includes("'GENERATION_VARIANT',") && psfSrc11.includes("'DUAL_SOURCE_DRIFT',")
      && vpSrc11.includes('dual: true')
      && psfSrc11.includes('export const GENERATION_DROPPED')
      && unverifiedKinds11.includes("'GENERATION_DROPPED'") && findingKinds11.length > 0 && !findingKinds11.includes('GENERATION_DROPPED')
      && strayKinds11 === ''
      && psfSrc11.includes('GENERATION_DROPPED.replacementName')
      && vpSrc11.includes('GENERATION_DROPPED') && vpSrc11.includes('generation-dropped')
      && hcSrc11.includes('GENERATION_DROPPED') && hcSrc11.includes('list_agents') && hcSrc11.includes(droppedLiteral11)
      && !patchText11.includes(droppedLiteral11) && ymlDroppedDecls11 === 1,
    'wired=' + (vpSrc11.includes('dual: true')) + ' dropped=' + (psfSrc11.includes('export const GENERATION_DROPPED')) + ' ukDropped=' + unverifiedKinds11.includes("'GENERATION_DROPPED'") + ' fkDropped=' + findingKinds11.includes('GENERATION_DROPPED') + ' stray=' + JSON.stringify(strayKinds11) + ' vp=' + (vpSrc11.includes('GENERATION_DROPPED')) + ' hc=' + (hcSrc11.includes(droppedLiteral11)) + ' patchHits=' + (patchText11.includes(droppedLiteral11)) + ' ymlDecls=' + ymlDroppedDecls11)
}

// ── COMPAT-023：全依赖面看护（surfaceEvidence × 6 面 + 离线证据缓存 + preflight --surfaces + 探针 boot 统一模式）──
// 动因（BUG-012 教训制度化）：看护面此前只覆盖预设行单格——宿主依赖面（服务端 API / client 槽位 / DOM /
// 安装 / 预设清单 / 版本六面）零看护 ⇒ 宿主升级塌方先由用户发现。本节机检四件事：
// ① generation-manifest SURFACE_EVIDENCE 30 格结构完备 + fail-closed（unknown 代全 unknown）；
// ② 离线证据缓存四代齐备（可解析、schemaVersion 1、无凭据泄漏）且与 manifest 声明同源；
// ③ 采集脚本只读纪律（npm view/pack + tar 解包；零 install/执行 tarball 内容）+ 看护清单导出；
// ④ preflight --surfaces 接线 + 三探针 boot 统一为「官方 CLI + DSH_HOME」（旧 bootChild 自举已退役）。
{
  const gm23 = await import('../lib/host-compat/generation-manifest.mjs')
  const { SURFACE_EVIDENCE, SURFACE_EVIDENCE_STATUSES, GENERATION_IDS } = gm23
  const collectSrc23 = readFileSync(new URL('../scripts/collect-host-surface-evidence.mjs', import.meta.url), 'utf8')
  const preflightSrc23 = readFileSync(new URL('../scripts/preflight-preset-rows.mjs', import.meta.url), 'utf8')
  const probeFiles23 = { ux012: '../scripts/probe-nv-ux012.mjs', bar: '../scripts/probe-nv-bar-geometry.mjs', wb: '../scripts/probe-nv-workbench-mount.mjs' }
  const probeSrc23 = {}
  for (const [k23, p23] of Object.entries(probeFiles23)) probeSrc23[k23] = readFileSync(new URL(p23, import.meta.url), 'utf8')
  const gensKnown23 = GENERATION_IDS.filter((g) => g !== 'unknown')

  // ① 30 格结构完备 + 状态枚举 + known/unknown 两半各自的方向性
  let structOk23 = Array.isArray(SURFACE_EVIDENCE_STATUSES) && SURFACE_EVIDENCE_STATUSES.join(',') === 'verified,fixture-record,unknown'
  const cellStates23 = []
  for (const g of GENERATION_IDS) {
    const gen23 = SURFACE_EVIDENCE[g]
    structOk23 = structOk23 && gen23 !== undefined && gen23 !== null && typeof gen23 === 'object'
    if (gen23 === undefined || gen23 === null) continue
    for (const f of [1, 2, 3, 4, 5, 6]) {
      const cell = gen23.faces === undefined ? undefined : gen23.faces[f]
      const ok23 = cell !== undefined && cell !== null && typeof cell === 'object' && SURFACE_EVIDENCE_STATUSES.includes(cell.status)
      structOk23 = structOk23 && ok23
      cellStates23.push(g + '/F' + f + '=' + (cell === undefined || cell === null ? 'MISSING' : cell.status))
    }
  }
  let knownDir23 = true
  for (const g of gensKnown23) {
    const gen23 = SURFACE_EVIDENCE[g]
    knownDir23 = knownDir23 && gen23.representativeVersion !== undefined && gen23.evidenceSource === 'tarball-scan'
      && typeof gen23.evidenceFile === 'string' && gen23.collectedAt !== undefined && gen23.regenerate !== undefined
    for (const f of [1, 2, 3]) knownDir23 = knownDir23 && gen23.faces[f].status === 'verified'
    for (const f of [4, 5, 6]) knownDir23 = knownDir23 && gen23.faces[f].status === 'fixture-record'
  }
  const unknownCells23 = cellStates23.filter((c) => c.startsWith('unknown/'))
  const unknownDir23 = unknownCells23.length === 6 && unknownCells23.every((c) => c.endsWith('=unknown'))
    && SURFACE_EVIDENCE.unknown.faces[1].reason !== undefined // fail-closed 有因可查（不默认绿）
  check('COMPAT-023 ①manifest surfaceEvidence 结构完备：' + GENERATION_IDS.length + ' 代 × 6 面 = 30 格全在场 ∧ status ∈ 枚举(verified|fixture-record|unknown) ∧ 已知代带 evidenceFile/collectedAt/regenerate 且面 1-3 verified / 面 4-6 fixture-record ∧ unknown 代 6 面全 unknown 且带 reason（fail-closed）',
    structOk23 && cellStates23.length === 30 && knownDir23 && unknownDir23,
    'cells=' + cellStates23.length + ' struct=' + structOk23 + ' known=' + knownDir23 + ' unknown=' + unknownDir23 + ' sample=' + cellStates23.slice(0, 3).join(','))

  // ② 离线证据缓存与 manifest 同源（文件在场、可解析、schemaVersion 1、无凭据泄漏）
  let cacheOk23 = true
  const cacheDetail23 = []
  for (const g of gensKnown23) {
    const rel23 = SURFACE_EVIDENCE[g].evidenceFile
    let state23 = 'ok'
    try {
      const json23 = JSON.parse(readFileSync(new URL('../' + rel23, import.meta.url), 'utf8'))
      const noLeak23 = JSON.stringify(json23).includes('token=') !== true
      const genMeta23 = json23.generation === g || json23.schemaVersion !== undefined // 代际标识或 schema 在场（兼容键名）
      state23 = json23.schemaVersion === 1 && noLeak23 && genMeta23 && Array.isArray(json23.errors) ? 'ok' : 'bad-shape' + (noLeak23 ? '' : '+leak')
    } catch { state23 = 'unreadable' }
    cacheOk23 = cacheOk23 && state23 === 'ok'
    cacheDetail23.push(g + ':' + state23)
  }
  check('COMPAT-023 ②离线证据缓存四代齐备：manifest.evidenceFile 指向的 surfaces.json 全部在场/可解析/schemaVersion=1/带 errors 面 ∧ 全文零 token= 字样（BC-05 凭据不入仓）',
    cacheOk23 && cacheDetail23.length === 4,
    'caches=' + cacheDetail23.join(' '))

  // ③ 采集脚本只读纪律（npm view/pack + tar 解包到临时目录；绝不 install/执行 tarball 内容）
  const collectOk23 = collectSrc23.includes('npm view') && collectSrc23.includes('npm pack') && collectSrc23.includes('--pack-destination')
    && collectSrc23.includes('GENERATION_TARGETS') && collectSrc23.includes('CLIENT_STACK') && collectSrc23.includes('SERVER_WATCHED')
    && collectSrc23.includes('SLOT_NAMES') && collectSrc23.includes('DOM_ANCHORS') && collectSrc23.includes('CROSS_SECTION_KEYS')
    && collectSrc23.includes('npm install') !== true && collectSrc23.includes('npm ci') !== true
  check('COMPAT-023 ③采集脚本只读纪律：npm view + npm pack --pack-destination + tar 解包（宿主包交互只读）∧ 零 npm install / npm ci（不装不执行 tarball 内容）∧ 看护清单常量导出（GENERATION_TARGETS/CLIENT_STACK/SERVER_WATCHED/SLOT_NAMES/DOM_ANCHORS/CROSS_SECTION_KEYS）',
    collectOk23,
    'readonly=' + collectOk23 + ' bytes=' + collectSrc23.length)

  // ④ preflight --surfaces 接线（维度行 + 交叉对账 + 三态晋升 + 缓存缺面 SKIP 语义）
  const preflightOk23 = preflightSrc23.includes("'--surfaces'") && preflightSrc23.includes('surfacesMode')
    && preflightSrc23.includes("'--surfaces-evidence-root'") && preflightSrc23.includes('SURFACE_COVERAGE_GAP')
    && preflightSrc23.includes('STRICT_SURFACE_UNKNOWN') && preflightSrc23.includes('STRICT_SURFACE_SKIP')
    && preflightSrc23.includes('SURFACE_EVIDENCE_CACHE_MISSING') && preflightSrc23.includes('SURFACE_ANCHOR_MISSING')
    && preflightSrc23.includes('SURFACE_VERSION_PROBE_MISMATCH')
  check('COMPAT-023 ④preflight --surfaces 接线：--surfaces/--surfaces-evidence-root 参数 + surfacesMode 分发 + 契约交叉对账（SURFACE_COVERAGE_GAP——BUG-012 教训：契约槽名 ⊆ 每代 face2）+ --strict 晋升（STRICT_SURFACE_UNKNOWN/STRICT_SURFACE_SKIP）+ 缓存缺面 SKIP（SURFACE_EVIDENCE_CACHE_MISSING≠PASS）+ 锚/机制/版本失配 FAIL 码（SURFACE_ANCHOR_MISSING/SURFACE_VERSION_PROBE_MISMATCH）',
    preflightOk23,
    'wired=' + preflightOk23)

  // ⑤ 三探针 boot 统一模式（官方 CLI + DSH_HOME 隔离；旧 bootChild 自举已退役——0.2.1 起 ERR_MODULE_NOT_FOUND 根因）
  const bootMarkers23 = ['resolveHostCli', 'NV_PROBE_DSH', 'prepareIsolatedProfile', 'killTree', "'/T', '/F', '/PID'"]
  let bootOk23 = true
  const bootDetail23 = []
  for (const [k23, src23] of Object.entries(probeSrc23)) {
    const has23 = bootMarkers23.every((m) => src23.includes(m)) && src23.includes('bootChild') !== true
    bootOk23 = bootOk23 && has23
    bootDetail23.push(k23 + '=' + has23)
  }
  check('COMPAT-023 ⑤三探针 boot 统一模式：resolveHostCli（--dsh > NV_PROBE_DSH > 桌面 CLI > PATH）+ prepareIsolatedProfile（junction + bundles 声明）+ killTree（taskkill /T /F /PID 只杀自启进程树）∧ 三文件零 bootChild 残留（0.2.1 宿主闭包不再装 dsh-app-boot ⇒ 旧自举必 ERR_MODULE_NOT_FOUND）',
    bootOk23,
    bootDetail23.join(' '))

  // ⑥ 工作台挂载探针资产（BUG-012 用户真路径固化：W1-W6 + 首跑门处置 + 截图落证据目录 + 入口守卫）
  const wbSrc23 = probeSrc23.wb
  const wbOk23 = ['W1-drawer-rendered', 'W2-console-mounted', 'W3-create-api', 'W4-split-mounted', 'W5-auto-bind-notice', 'W6-console-clean']
      .every((id) => wbSrc23.includes(id))
    && wbSrc23.includes('#310') && wbSrc23.includes('slot entry crashed')
    && wbSrc23.includes('readAutoBindTemplate') && wbSrc23.includes('autoBindDone')
    && wbSrc23.includes("'docs', 'evidence', 'COMPAT-023'") && wbSrc23.includes('GATE_BTN_RE')
    && wbSrc23.includes('elementFromPoint') && wbSrc23.includes('isDirectEntry')
    && wbSrc23.includes('token=<redacted>') && wbSrc23.includes('3081')
  check('COMPAT-023 ⑥工作台挂载探针资产在仓：W1 抽屉→W2 控制台（shell.overlay 消费）→W3 建 API→W4 点书卡 .nv-split→W5 autoBindDone 同源断言→W6 零 React #310/零 slot entry crashed ∧ 首跑门处置（GATE_BTN_RE；关不掉=envBlocked≠断言）∧ 命中性校验（elementFromPoint——BUG-012 阶段 A 误诊防再犯）∧ 截图默认落 docs/evidence/COMPAT-023 ∧ token <redacted> ∧ 端口 3080/3081 纪律 ∧ 入口守卫',
    wbOk23,
    'wb=' + wbOk23 + ' bytes=' + wbSrc23.length)
}

// ── UX-065 工作台主题系统（3 套注册项 + 设置页管理 + 两顶栏快速切换 + 新持久键）──
{
  const { hostContract } = await import('../lib/host-contract.mjs')
  const themeExports = clientExports
  const NV_THEMES = themeExports.NV_THEMES
  const NV_THEME_STYLE = themeExports.NV_THEME_STYLE
  const norm = themeExports.normalizeThemeId
  const themeStore = themeExports.store

  // ① 纯函数：3 个合法 id + 非法/空/旧值/注入 → 默认墨纸（唯一 id）
  const validIds = ['mozhi', 'qingjian', 'yehang']
  const normCases = [
    ['mozhi', 'mozhi'], ['qingjian', 'qingjian'], ['yehang', 'yehang'],
    ['sepia', 'mozhi'], [null, 'mozhi'], ['', 'mozhi'], ['mozhi.v0', 'mozhi'], [42, 'mozhi'],
    ["' onload='alert(1)", 'mozhi'], ['qingjian;--dsw-alias-bg-base:red', 'mozhi'],
  ]
  check('UX-065 纯函数 normalizeThemeId：3 个注册 id 原样通过 ∧ 非法/空/null/旧值/注入串 → 默认墨纸 ∧ NV_THEMES 恰 3 项且 id 唯一',
    Array.isArray(NV_THEMES) && NV_THEMES.length === 3
      && new Set(NV_THEMES.map((th) => th.id)).size === 3
      && validIds.every((id) => NV_THEMES.some((th) => th.id === id))
      && normCases.every(([input, want]) => norm(input) === want),
    'ids=' + JSON.stringify(NV_THEMES.map((th) => th.id)) + ' bad=' + JSON.stringify(normCases.filter(([i, w]) => norm(i) !== w)))

  // ② 令牌完整性：每套 16 对 light/dark 值 + 派生映射单点 + 无宿主全局覆盖
  const themeTokenKeys = ['paper', 'paper-2', 'paper-3', 'ink', 'ink-2', 'ink-3', 'ink-4', 'rule', 'rule-strong', 'cinnabar', 'seal', 'accent', 'on-accent', 'ok', 'warn', 'danger']
  const tokenBad = []
  for (const th of NV_THEMES) {
    for (const key of themeTokenKeys) {
      const lv = th.light[key]
      const dv = th.dark[key]
      if (typeof lv !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(lv)) tokenBad.push(th.id + '.light.' + key)
      if (typeof dv !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(dv)) tokenBad.push(th.id + '.dark.' + key)
    }
  }
  const blocks = NV_THEME_STYLE.split(':root[data-nv-theme=').slice(1)
  const blockBad = []
  for (const id of validIds) {
    const block = blocks.find((b) => b.startsWith('"' + id + '"'))
    if (block === undefined) { blockBad.push(id + ':missing'); continue }
    for (const key of ['paper', 'ink', 'rule', 'cinnabar', 'accent']) {
      if (!block.includes('--nv-' + key + ':light-dark(')) blockBad.push(id + ':' + key)
    }
    if (!block.includes('--nv-bg:var(--nv-paper-2)') || !block.includes('--nv-surface:var(--nv-surface-hover)') && !block.includes('--nv-surface-hover:color-mix(in srgb,var(--nv-ink) 6%,transparent)')) blockBad.push(id + ':derived')
  }
  check('UX-065 主题令牌：3 套 × 16 对 light-dark 值齐备 ∧ 运行时 CSS 恰 3 个 :root[data-nv-theme] 块（含默认墨纸）∧ 每块含 paper/ink/rule/cinnabar/accent + 10 项派生映射 ∧ 零 --dsw-* / color-scheme / data-theme 覆盖',
    tokenBad.length === 0 && blocks.length === 3 && blockBad.length === 0
      && NV_THEME_STYLE.includes('data-nv-theme="mozhi"')
      && NV_THEME_STYLE.includes('--nv-surface-hover:color-mix(in srgb,var(--nv-ink) 6%,transparent)')
      && NV_THEME_STYLE.includes('--nv-surface-raised:var(--nv-paper)')
      && NV_THEME_STYLE.includes('--nv-fg:var(--nv-ink)') && NV_THEME_STYLE.includes('--nv-fg-muted:var(--nv-ink-2)')
      && NV_THEME_STYLE.includes('--nv-fg-subtle:var(--nv-ink-3)') && NV_THEME_STYLE.includes('--nv-border:var(--nv-rule)')
      && NV_THEME_STYLE.includes('--nv-border-strong:var(--nv-rule-strong)') && NV_THEME_STYLE.includes('--nv-err:var(--nv-danger)')
      && !NV_THEME_STYLE.includes('--dsw-') && !NV_THEME_STYLE.includes('color-scheme') && !NV_THEME_STYLE.includes('data-theme='),
    'tokens=' + JSON.stringify(tokenBad) + ' blocks=' + blocks.length + ' bad=' + JSON.stringify(blockBad))

  // ③ store / 持久化：合法写入、非法不写入、读写失败不抛、键名精确、readTheme 缺失/坏档/非法 → 墨纸
  const themeBefore = themeStore.get().theme
  const okValid = themeExports.setTheme('qingjian')
  const afterValid = themeStore.get().theme
  const okInvalid = themeExports.setTheme('not-a-theme')
  const afterInvalid = themeStore.get().theme
  const writes = []
  let throwOnWrite = false
  globalThis.localStorage = {
    getItem: (key) => (key === 'dsh.novel.theme.v1' ? JSON.stringify({ id: 'yehang' }) : null),
    setItem: (key, value) => { if (throwOnWrite) throw new Error('quota'); writes.push([key, value]) },
    removeItem: () => {},
  }
  const wrote = themeExports.writeTheme('yehang')
  const readValid = themeExports.readTheme()
  globalThis.localStorage.getItem = () => 'not-json'
  const readBroken = themeExports.readTheme()
  globalThis.localStorage.getItem = () => JSON.stringify({ id: 'evil' })
  const readInjected = themeExports.readTheme()
  globalThis.localStorage.getItem = () => null
  const readMissing = themeExports.readTheme()
  throwOnWrite = true
  let writeErr = ''
  let writeFailed = null
  try { writeFailed = themeExports.writeTheme('mozhi') } catch (e) { writeErr = e.message }
  delete globalThis.localStorage
  const writesOk = writes.length === 1 && writes[0][0] === 'dsh.novel.theme.v1' && writes[0][1] === JSON.stringify({ id: 'yehang' })
  check('UX-065 store/持久化：setTheme 合法值写 store ∧ 非法值不写入（返回 false）∧ 键名精确 dsh.novel.theme.v1（只存 {id}）∧ readTheme 缺失/坏档/非法 id → 墨纸、合法值 → 原 id ∧ 写入异常返回 false 不抛',
    themeBefore === 'mozhi' && okValid === true && afterValid === 'qingjian'
      && okInvalid === false && afterInvalid === 'qingjian'
      && wrote === true && writesOk && readValid === 'yehang'
      && readBroken === 'mozhi' && readInjected === 'mozhi' && readMissing === 'mozhi'
      && writeErr === '' && writeFailed === false,
    'before=' + themeBefore + ' valid=' + afterValid + ' invalid=' + afterInvalid + ' writes=' + JSON.stringify(writes) + ' reads=' + JSON.stringify([readValid, readBroken, readInjected, readMissing]) + ' writeFailed=' + writeFailed + ' err=' + writeErr)

  // ④ 渲染：书斋顶栏 palette 按钮（1）+ 设置页 3 卡（当前标记）+ 写作台标题栏 1 个（源码面）
  const walkTheme = (node, visit) => {
    if (node === null || node === undefined) return
    if (typeof node === 'string') return
    if (typeof node !== 'object') return
    if (Array.isArray(node)) { for (const child of node) walkTheme(child, visit); return }
    visit(node)
    if (Array.isArray(node.children)) for (const child of node.children) walkTheme(child, visit)
  }
  themeStore.set({ consoleOpen: true, theme: 'yehang' })
  const conReg = slotRegs.find((r) => r.id === 'nv-console')
  let conThemeBtns = 0
  let conMenu = 0
  if (conReg !== undefined) {
    walkTheme(conReg.render({ initialView: 'home' }), (node) => {
      const cls = node.props !== undefined && typeof node.props.className === 'string' ? node.props.className : ''
      if (/\bnv-theme-btn\b/.test(cls)) conThemeBtns += 1
      if (/\bnv-theme-menu\b/.test(cls)) conMenu += 1
    })
  }
  const settingsTree = mockReact.createElement(themeExports.ThemeSettings, { t: (key) => key })
  let cardCount = 0
  let onCards = 0
  let checkMarks = 0
  walkTheme(settingsTree, (node) => {
    const cls = node.props !== undefined && typeof node.props.className === 'string' ? node.props.className : ''
    const tokens = cls.split(/\s+/).filter((t) => t !== '')
    if (tokens.includes('nv-theme-card')) cardCount += 1
    if (tokens.includes('nv-theme-card') && node.props['data-on'] === 'true') onCards += 1
    if (tokens.includes('nv-theme-card-check')) checkMarks += 1
  })
  const splitPickerIdx = clientSrc.indexOf("el(ThemePicker, { t, variant: 'split'")
  const consolePickerIdx = clientSrc.indexOf("el(ThemePicker, { t, variant: 'console'")
  const drawerBtnIdx = clientSrc.indexOf("className: 'nv-bar-ctl nv-bar-drawer'")
  const settingsInsertIdx = clientSrc.indexOf('el(ThemeSettings, { t')
  const pluginLabelIdx = clientSrc.indexOf("'启用插件'")
  check('UX-065 渲染面：书斋顶栏恰 1 个 palette 按钮（菜单关闭态 0）∧ 设置页 3 张主题卡 + 当前卡唯一 data-on + ✓ 恰 1 ∧ 写作台标题栏 1 个（抽屉按钮之前，avoidRight 以分栏真实右缘 g.right 计）∧ 主题区在「启用插件」之前 ∧ 全仓 ThemePicker 恰 2 处（无重复控件）',
    conThemeBtns === 1 && conMenu === 0 && cardCount === 3 && onCards === 1 && checkMarks === 1
      && splitPickerIdx > 0 && consolePickerIdx > 0 && drawerBtnIdx > splitPickerIdx
      && clientSrc.includes("cssVarNum('--nv-drawer-w') ?? 0") && clientSrc.includes('Math.max(0, (typeof window !== \'undefined\' ? window.innerWidth : 0) - g.right) + 8')
      && settingsInsertIdx > 0 && pluginLabelIdx > settingsInsertIdx
      && (clientSrc.match(/el\(ThemePicker, \{/g) ?? []).length === 2,
    'consoleBtns=' + conThemeBtns + ' cards=' + cardCount + ' on=' + onCards + ' checks=' + checkMarks + ' split=' + splitPickerIdx + ' drawer=' + drawerBtnIdx + ' settings=' + settingsInsertIdx + ' plugin=' + pluginLabelIdx)

  // ⑤ 菜单可访问性/关闭路径（源码面 + NV_THEMES 行数）：dialog / aria / 3 行 / Escape / 外部 pointerdown / 焦点归位
  const pickerStart = clientSrc.indexOf('function ThemePicker(props)')
  const pickerEnd = clientSrc.indexOf('function ThemeSettings(props)')
  const pickerSrc = pickerStart >= 0 && pickerEnd > pickerStart ? clientSrc.slice(pickerStart, pickerEnd) : ''
  check('UX-065 主题菜单：role=dialog ∧ aria-label/haspopup/expanded/pressed ∧ 3 行 = NV_THEMES.map（色板 + 名称 + 气质 + 当前 ✓）∧ Escape/外部 pointerdown 关闭 ∧ 打开聚焦当前项、关闭归还按钮焦点',
    pickerSrc !== ''
      && pickerSrc.includes("role: 'dialog'") && pickerSrc.includes("'aria-label': t('themeTitle')")
      && pickerSrc.includes("'aria-haspopup': 'dialog'") && pickerSrc.includes("'aria-expanded'")
      && pickerSrc.includes("'aria-pressed'") && pickerSrc.includes('NV_THEMES.map')
      && pickerSrc.includes('nv-theme-sw') && pickerSrc.includes('nv-theme-opt-name') && pickerSrc.includes('nv-theme-opt-mood')
      && pickerSrc.includes('nv-theme-check')
      && pickerSrc.includes("e.key !== 'Escape'") && pickerSrc.includes("'pointerdown'")
      && pickerSrc.includes('focusTarget.focus()') && pickerSrc.includes('btnRef.current.focus()')
      && pickerSrc.includes('position:fixed') === false // 位置由 CSS .nv-theme-menu 承担（fixed + 钳制坐标）
      && clientSrc.includes('.nv-theme-menu{position:fixed;'),
    'pickerSrc=' + pickerSrc.length)

  // ⑥ 设置页/菜单 CSS：只消费 --nv-*（零白/黑 alpha 假设由既有断言覆盖）+ 三卡窄屏单列
  const themeCssStart = clientSrc.indexOf("'.nv-theme-wrap{")
  const themeCssEnd = clientSrc.indexOf("'.nv-theme-reset:hover{")
  const themeCss = themeCssStart >= 0 && themeCssEnd > themeCssStart ? clientSrc.slice(themeCssStart, themeCssEnd) : ''
  check('UX-065 主题样式：.nv-theme-menu/.nv-theme-opt/.nv-theme-grid/.nv-theme-card 规则在仓 ∧ 菜单 fixed + z-index 990（高于分栏 900/宿主抽屉 920、低于模态 1000）∧ 窄屏 1 列 ∧ 全部色值走 --nv-*（无新 --dsw-* 依赖）∧ 菜单脚注 caption 用 --nv-ink-3（对比度 ≥4.5，非 ink-4）',
    themeCss !== ''
      && themeCss.includes('.nv-theme-menu{position:fixed;z-index:990;')
      && themeCss.includes('.nv-theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))')
      && themeCss.includes('@media (max-width:760px){.nv-theme-grid{grid-template-columns:1fr}}')
      && /\.nv-theme-menu-foot\{[^}]*color:var\(--nv-ink-3\)\}/.test(themeCss)
      && !/\.nv-theme-menu-foot\{[^}]*color:var\(--nv-ink-4\)\}/.test(themeCss)
      && !themeCss.includes('--dsw-'),
    'css=' + themeCss.length)

  // ⑦ i18n zh/en 成对（气质文案 = 已批准设计板用词；旧词零残留）
  const moodPairs = [
    ["themeMozhiMood: '暖纸 · 墨色 · 朱砂'", "themeMozhiMood: 'Warm paper · ink · cinnabar'"],
    ["themeQingjianMood: '青绿纸 · 松墨 · 苔痕'", "themeQingjianMood: 'Green paper · pine ink · moss trace'"],
    ["themeYehangMood: '月白 · 靛青 · 灯影'", "themeYehangMood: 'Moon white · indigo · lamp shadow'"],
  ]
  const labelPairs = [
    ["themeMozhi: '墨纸'", "themeMozhi: 'Ink Paper'"],
    ["themeQingjian: '青简'", "themeQingjian: 'Green Slip'"],
    ["themeYehang: '夜航'", "themeYehang: 'Night Voyage'"],
  ]
  check('UX-065 i18n：主题标题/分组/说明/当前/恢复默认/菜单脚注/3 组名称+气质 zh/en 成对 ∧ 气质用词与设计板一致（松烟/赭石/灯红零残留）',
    moodPairs.every(([zh, en]) => clientSrc.includes(zh) && clientSrc.includes(en))
      && labelPairs.every(([zh, en]) => clientSrc.includes(zh) && clientSrc.includes(en))
      && ['themeTitle:', 'themeFollow:', 'themeGroupTitle:', 'themeGroupHint:', 'themeCurrent:', 'themeReset:', 'themeMenuFoot:'].every((key) => (clientSrc.match(new RegExp(key.replace(/:/g, '\\:'), 'g')) ?? []).length === 2)
      && !clientSrc.includes('松烟') && !clientSrc.includes('赭石') && !clientSrc.includes('灯红'),
    'mood=' + moodPairs.map(([zh, en]) => String(clientSrc.includes(zh) && clientSrc.includes(en))).join('/'))

  // ⑧ 契约 P-10：3.7 登记新键 + 键声明行活性（行号由机械重基维护）
  const themeKeyLine = clientSrc.split('\n').findIndex((line) => line.includes("const THEME_PERSIST_KEY = 'dsh.novel.theme.v1'")) + 1
  const contract37 = hostContract.items.find((it) => it.item === '3.7')
  check('UX-065 契约 3.7：dsh.novel.theme.v1 入册（符号 + note + 第 5 个行锚）∧ 键声明行活性命中',
    contract37 !== undefined && contract37.symbol.includes('dsh.novel.theme.v1')
      && contract37.note.includes('dsh.novel.theme.v1')
      && (contract37.line.match(/L\d+/g) ?? []).length === 6
      && (contract37.line.match(/L\d+/g) ?? []).includes('L' + themeKeyLine),
    'line=' + (contract37 !== undefined ? contract37.line : 'missing') + ' actual=L' + themeKeyLine)

  themeStore.set({ consoleOpen: false, theme: 'mozhi' })
}
// ── UX-066 写作排版（4 字体 × 4 字号；Aa popover + 设置页同 store；新持久键）──
{
  const { hostContract } = await import('../lib/host-contract.mjs')
  const tx = clientExports
  const NV_TYPO = tx.NV_TYPOGRAPHY
  const normT = tx.normalizeTypography
  const normPatch = tx.normalizeTypographyPatch
  const typoStore = tx.store
  const fontIds = ['serif', 'sans', 'kai', 'system']
  const sizeIds = [15, 16, 17, 18]

  // ① 注册表 + normalizeTypography：4×4 合法、其余一律默认
  const regOk = NV_TYPO !== null && typeof NV_TYPO === 'object'
    && Array.isArray(NV_TYPO.fonts) && NV_TYPO.fonts.length === 4
    && NV_TYPO.fonts.every((f) => fontIds.includes(f.id) && typeof f.labelKey === 'string' && typeof f.stack === 'string')
    && Array.isArray(NV_TYPO.sizes) && JSON.stringify(NV_TYPO.sizes) === JSON.stringify(sizeIds)
    && NV_TYPO.default.font === 'serif' && NV_TYPO.default.size === 16
  let combos = 0
  const comboBad = []
  for (const font of fontIds) for (const size of sizeIds) {
    const n = normT({ font, size })
    if (n.font === font && n.size === size) combos += 1
    else comboBad.push(font + '/' + size)
  }
  const badInputs = [null, undefined, {}, [], 'serif', 42, { font: 'serif' }, { font: 'serif', size: 16.5 }, { font: 'serif', size: '16' }, { font: 'evil', size: 16 }, { font: 'sans', size: 19 }, { font: "serif' onload='alert(1)", size: 16 }, { font: 'serif', size: NaN }]
  const badNorm = badInputs.filter((v) => { const n = normT(v); return n.font !== 'serif' || n.size !== 16 })
  check('UX-066 纯函数 normalizeTypography：4 字体 × 4 字号 = 16 组合全通过 ∧ null/缺字段/坏类型/未知/注入/越界一律回落 {serif,16} ∧ NV_TYPOGRAPHY 注册表 4+4+默认',
    regOk && combos === 16 && badNorm.length === 0,
    'combos=' + combos + ' bad=' + JSON.stringify(badNorm) + ' reg=' + regOk)

  // ② patch 合并 + setTypography 三面同步/非法零写入 + 持久化键/读写降级
  typoStore.set({ typography: { font: 'serif', size: 16 } })
  const p1 = normPatch({ font: 'kai' })
  const p2 = normPatch({ size: 18 })
  typoStore.set({ typography: { font: 'kai', size: 18 } })
  const p3 = normPatch({ size: 17 })
  const p4 = normPatch({ font: 'evil' })
  const p5 = normPatch(null)
  const patchOk = p1.font === 'kai' && p1.size === 16 && p2.font === 'serif' && p2.size === 18
    && p3.font === 'kai' && p3.size === 17 && p4.font === 'kai' && p4.size === 18
    && p5.font === 'kai' && p5.size === 18
  const writes = []
  let throwWrite = false
  let raw = null
  globalThis.localStorage = {
    getItem: () => raw,
    setItem: (key, value) => { if (throwWrite) throw new Error('quota'); writes.push([key, value]) },
    removeItem: () => {},
  }
  typoStore.set({ typography: { font: 'serif', size: 16 } })
  const okSet = tx.setTypography({ font: 'sans', size: 17 })
  const afterSet = { ...tx.store.get().typography }
  const okBadFont = tx.setTypography({ font: 'evil' })
  const okBadSize = tx.setTypography({ size: 19 })
  const okNull = tx.setTypography(null)
  const okEmpty = tx.setTypography({})
  const afterBad = { ...tx.store.get().typography }
  const writesAfterIllegal = writes.length
  const writeValid = tx.writeTypography({ font: 'kai', size: 15 })
  throwWrite = true
  let writeThrew = ''
  let writeQuota = null
  try { writeQuota = tx.writeTypography({ font: 'serif', size: 16 }) } catch (e) { writeThrew = e.message }
  raw = JSON.stringify({ font: 'kai', size: 18 })
  const readValid = tx.readTypography()
  raw = 'not-json'
  const readBroken = tx.readTypography()
  raw = JSON.stringify({ font: 'evil', size: 16 })
  const readInjected = tx.readTypography()
  raw = null
  const readMissing = tx.readTypography()
  delete globalThis.localStorage
  const persistOk = writes.length === 2
    && writes[0][0] === 'dsh.novel.typography.v1' && writes[0][1] === JSON.stringify({ font: 'sans', size: 17 })
    && writes[1][1] === JSON.stringify({ font: 'kai', size: 15 })
    && writesAfterIllegal === 1
  check('UX-066 store/持久化：normalizeTypographyPatch 以当前 store 为基合并合法字段（非法字段保留原值）∧ setTypography 合法 = store 同步，非法（未知字体/越界字号/null/空 patch）返回 false 且零写入 ∧ 键名精确 dsh.novel.typography.v1（只存 {font,size}）∧ read 缺失/坏档/未知 → 默认、合法 → 原值 ∧ 写入异常返回 false 不抛',
    patchOk && okSet === true && afterSet.font === 'sans' && afterSet.size === 17
      && okBadFont === false && okBadSize === false && okNull === false && okEmpty === false
      && afterBad.font === 'sans' && afterBad.size === 17
      && writeValid === true && writeQuota === false && writeThrew === '' && persistOk
      && readValid.font === 'kai' && readValid.size === 18
      && readBroken.font === 'serif' && readBroken.size === 16
      && readInjected.font === 'serif' && readInjected.size === 16
      && readMissing.font === 'serif' && readMissing.size === 16,
    'patch=' + JSON.stringify([p1, p2, p3, p4, p5]) + ' afterSet=' + JSON.stringify(afterSet) + ' invalid=' + JSON.stringify([okBadFont, okBadSize, okNull, okEmpty]) + ' writes=' + JSON.stringify(writes) + ' reads=' + JSON.stringify([readValid, readBroken, readInjected, readMissing]) + ' quota=' + writeQuota)

  // ③ 根属性三面同步 + apply 初始化/订阅/清理（可逆性）
  const attrs = new Map()
  globalThis.document = {
    documentElement: {
      setAttribute: (name, value) => attrs.set(name, value),
      removeAttribute: (name) => attrs.delete(name),
    },
  }
  tx.syncTypographyAttrs({ font: 'kai', size: 18 })
  const attrsAfter = { font: attrs.get('data-nv-font'), fs: attrs.get('data-nv-fs') }
  tx.clearTypographyAttrs()
  const attrsCleared = attrs.size === 0
  delete globalThis.document
  const applyInitOk = clientSrc.includes('const initialTypography = readTypography()')
    && clientSrc.includes('store.set({ typography: initialTypography })')
    && clientSrc.includes('syncTypographyAttrs(initialTypography)')
    && clientSrc.includes('const offTypography = store.subscribe((snap) => syncTypographyAttrs(snap.typography))')
    && clientSrc.includes('try { offTypography() }')
    && clientSrc.includes('clearTypographyAttrs()')
  check('UX-066 根属性与生命周期：syncTypographyAttrs 写 <html data-nv-font="kai" data-nv-fs="18"> ∧ clearTypographyAttrs 移除两者 ∧ apply 初始化读 localStorage + store + 订阅同步 ∧ cleanup 退订并移除属性',
    attrsAfter.font === 'kai' && attrsAfter.fs === '18' && attrsCleared === true && applyInitOk,
    'attrs=' + JSON.stringify(attrsAfter) + ' cleared=' + attrsCleared + ' init=' + applyInitOk)

  // ④ CSS：4 字体块 + 3 字号块 + 根令牌 + 仅正文/编辑器消费（UI chrome 零 prose 令牌）
  const ruleBody = (sel) => {
    const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')
    const m = re.exec(clientSrc)
    return m === null ? '' : m[1]
  }
  const fontBlocks = (clientSrc.match(/:root\[data-nv-font="/g) ?? []).length
  const sizeBlocks = (clientSrc.match(/:root\[data-nv-fs="/g) ?? []).length
  const rootTokens = ['--nv-kai:', '--nv-system:', '--nv-prose-family:var(--nv-serif)', '--nv-prose-size:16px', '--nv-prose-lh:1.95'].every((s) => clientSrc.includes(s))
  const proseBody = ruleBody('.nv-prose .nv-content')
  const editBody = ruleBody('.nv-sheet-edit')
  const consumerOk = ['font-family:var(--nv-prose-family)', 'font-size:var(--nv-prose-size)', 'line-height:var(--nv-prose-lh)'].every((s) => proseBody.includes(s) && editBody.includes(s))
  const proseWidthOk = proseBody.includes('width:100%') && proseBody.includes('max-width:min(34em,100%)') && proseBody.includes('min-width:0')
  const proseLines = clientSrc.split('\n').filter((line) => line.includes('var(--nv-prose-'))
  const chromeOk = proseLines.length === 3 && proseLines.every((line) => /^\s*'\.nv-prose \.nv-content/.test(line) || /^\s*'\.nv-sheet-edit\{/.test(line))
  const chromeBodies = ['.nv-bar-title', '.nv-rail-status', '.nv-status', '.nv-theme-menu'].map(ruleBody)
  const chromeClean = chromeBodies.filter((b) => b !== '').length === 4 && chromeBodies.every((b) => !b.includes('--nv-prose-'))
  const typoCssLines = clientSrc.split('\n').filter((line) => /':root\[data-nv-(?:font|fs)="|'\.nv-(?:paper-aa|typo-)/.test(line))
  const typoNoHost = typoCssLines.length >= 20 && typoCssLines.every((line) => !line.includes('--dsw-') && !line.includes('color-scheme'))
  check('UX-066 CSS：根令牌 --nv-prose-family/--nv-prose-size/--nv-prose-lh + --nv-kai/--nv-system ∧ 4 个 data-nv-font 块 + 3 个 data-nv-fs 块 ∧ 正文/编辑器两处消费者用 prose 令牌（max-width:min(34em,100%)）∧ 仅 3 行消费 prose 令牌（全文 UI chrome 零漏用）∧ 排版 CSS 零 --dsw-*/color-scheme',
    fontBlocks === 4 && sizeBlocks === 3 && rootTokens && consumerOk && proseWidthOk && chromeOk && chromeClean && typoNoHost,
    'fontBlocks=' + fontBlocks + ' sizeBlocks=' + sizeBlocks + ' root=' + rootTokens + ' consumer=' + consumerOk + ' width=' + proseWidthOk + ' proseLines=' + proseLines.length + ' chrome=' + chromeClean + ' dsw=' + typoNoHost)

  // ⑤ 纸页头 Aa（唯一按钮）在「编辑」之前 + popover 4+4/状态/关闭路径
  const cpStart = clientSrc.indexOf('function ChapterPanel(props)')
  const cpEnd = clientSrc.indexOf('\n    function ', cpStart + 10)
  const cpSrc = cpStart >= 0 && cpEnd > cpStart ? clientSrc.slice(cpStart, cpEnd) : ''
  const pickerUseIdx = cpSrc.indexOf('el(TypographyPicker, { t })')
  const editIdx = cpSrc.indexOf("title: mode === 'read' ? t('edit')")
  const pickerStart = clientSrc.indexOf('function TypographyPicker(props)')
  const pickerEnd = clientSrc.indexOf('function TypographySettings(props)')
  const pickerSrc = pickerStart >= 0 && pickerEnd > pickerStart ? clientSrc.slice(pickerStart, pickerEnd) : ''
  const pickerOk = pickerSrc !== ''
    && pickerSrc.includes("className: 'nv-paper-btn nv-paper-aa'")
    && pickerSrc.includes("'aria-haspopup': 'dialog'") && pickerSrc.includes("'aria-expanded'")
    && pickerSrc.includes("role: 'dialog'") && pickerSrc.includes("'aria-pressed'")
    && pickerSrc.includes('TYPOGRAPHY_FONTS.map') && pickerSrc.includes('TYPOGRAPHY_SIZES.map')
    && pickerSrc.includes("'data-font': font.id") && pickerSrc.includes("'data-size': String(size)")
    && pickerSrc.includes('nv-typo-check') && pickerSrc.includes('nv-typo-preview-text')
    && pickerSrc.includes("t('typePreview')") && pickerSrc.includes("t('typeMenuFoot')")
    && pickerSrc.includes("e.key !== 'Escape'") && pickerSrc.includes("'pointerdown'")
    && pickerSrc.includes('focusTarget.focus()') && pickerSrc.includes('btnRef.current.focus()')
    && pickerSrc.includes('rect.right - mw')
    && clientSrc.includes('.nv-typo-menu{position:fixed;z-index:990;width:240px;')
  check('UX-066 纸页头 Aa：ChapterPanel 稿纸头恰 1 个 TypographyPicker 且在「编辑」之前（同 .nv-paper-actions）∧ 按钮 Aa + aria-label/haspopup/expanded ∧ popover role=dialog 240px 右对齐 ∧ 4 字体行（各自字体栈/当前 ✓/aria-pressed）+ 4 字号 chip + 正文预览 + 选择即保存脚注 ∧ Escape/外点关闭且焦点归还 Aa',
    cpSrc !== '' && pickerUseIdx > 0 && editIdx > pickerUseIdx && pickerOk,
    'pickerUse=' + pickerUseIdx + ' edit=' + editIdx + ' pickerSrc=' + pickerSrc.length)

  // ⑥ 渲染面：TypographyPicker 关闭态 1 个 Aa；TypographySettings 4+4 + 当前标记 + 恢复默认
  const walkT = (node, visit) => {
    if (node === null || node === undefined) return
    if (typeof node === 'string') return
    if (typeof node !== 'object') return
    if (Array.isArray(node)) { for (const child of node) walkT(child, visit); return }
    visit(node)
    if (Array.isArray(node.children)) for (const child of node.children) walkT(child, visit)
  }
  const collectText = (node, out) => {
    if (node === null || node === undefined) return
    if (typeof node === 'string') { out.push(node); return }
    if (typeof node !== 'object') return
    if (Array.isArray(node)) { for (const child of node) collectText(child, out); return }
    if (Array.isArray(node.children)) for (const child of node.children) collectText(child, out)
  }
  typoStore.set({ typography: { font: 'serif', size: 16 } })
  const pickerTree = mockReact.createElement(tx.TypographyPicker, { t: (key) => key })
  let aaCount = 0
  let aaLabel = null
  let aaPopup = null
  let pickerMenus = 0
  walkT(pickerTree, (node) => {
    const cls = node.props !== undefined && typeof node.props.className === 'string' ? node.props.className : ''
    const tokens = cls.split(/\s+/).filter((t) => t !== '')
    if (tokens.includes('nv-paper-aa')) {
      aaCount += 1
      aaLabel = node.props['aria-label']
      aaPopup = node.props['aria-haspopup']
    }
    if (tokens.includes('nv-typo-menu')) pickerMenus += 1
  })
  const settingsTree = mockReact.createElement(tx.TypographySettings, { t: (key) => key })
  let fontRows = 0
  let sizeChips = 0
  let onFontRows = 0
  let onSizeChips = 0
  let marks = 0
  let resetBtns = 0
  walkT(settingsTree, (node) => {
    const cls = node.props !== undefined && typeof node.props.className === 'string' ? node.props.className : ''
    const tokens = cls.split(/\s+/).filter((t) => t !== '')
    if (tokens.includes('nv-typo-font')) {
      fontRows += 1
      if (node.props['data-on'] === 'true') onFontRows += 1
    }
    if (tokens.includes('nv-typo-size')) {
      sizeChips += 1
      if (node.props['data-on'] === 'true') onSizeChips += 1
    }
    if (tokens.includes('nv-typo-check')) marks += 1
    if (tokens.includes('nv-typo-reset')) resetBtns += 1
  })
  const settingsTexts = []
  collectText(settingsTree, settingsTexts)
  const settingsText = settingsTexts.join('|')
  check('UX-066 渲染面：Aa 关闭态恰 1 个按钮（aria-label/haspopup=dialog、无菜单）∧ 设置页「写作排版」4 字体行 + 4 字号 chip + 当前标记恰 1 ∧ 默认宋体/16 当前命中 ∧ 恢复默认按钮 ∧ 说明只影响正文与编辑器',
    aaCount === 1 && aaLabel === 'typeAa' && aaPopup === 'dialog' && pickerMenus === 0
      && fontRows === 4 && sizeChips === 4 && onFontRows === 1 && onSizeChips === 1 && marks === 1 && resetBtns === 1
      && settingsText.includes('typeSerif') && settingsText.includes('16px') && settingsText.includes('typeHint'),
    'aa=' + aaCount + '/' + aaLabel + '/' + aaPopup + ' menu=' + pickerMenus + ' rows=' + fontRows + ' sizes=' + sizeChips + ' on=' + onFontRows + '/' + onSizeChips + ' marks=' + marks + ' reset=' + resetBtns)

  // ⑦ 设置页安插位置 + i18n zh/en 成对 + 无未本地化新增文案
  const themeInsertIdx = clientSrc.indexOf('el(ThemeSettings, { t')
  const typoInsertIdx = clientSrc.indexOf('el(TypographySettings, { t })')
  const pluginInsertIdx = clientSrc.indexOf("'启用插件'")
  const settingsSrcStart = pickerEnd
  const settingsSrcEnd = clientSrc.indexOf('\n    exports.apply = apply', settingsSrcStart)
  const settingsSrc = settingsSrcStart >= 0 && settingsSrcEnd > settingsSrcStart ? clientSrc.slice(settingsSrcStart, settingsSrcEnd) : ''
  const typeKeys = ['typeTitle', 'typeAa', 'typeFont', 'typeSize', 'typeSerif', 'typeSans', 'typeKai', 'typeSystem', 'typePreview', 'typeCurrent', 'typeReset', 'typeHint', 'typeMenuFoot']
  const i18nBad = typeKeys.filter((key) => (clientSrc.match(new RegExp('\\b' + key + ':', 'g')) ?? []).length !== 2)
  check('UX-066 设置页与 i18n：设置页 TypographySettings 紧接 ThemeSettings 且在「启用插件」之前 ∧ 组件含 4+4 映射/当前标记/恢复默认/仅正文说明且不调用 settings API ∧ 13 个排版键 zh/en 成对（各 2 次）',
    themeInsertIdx > 0 && typoInsertIdx > themeInsertIdx && pluginInsertIdx > typoInsertIdx
      && settingsSrc.includes('TYPOGRAPHY_FONTS.map') && settingsSrc.includes('TYPOGRAPHY_SIZES.map')
      && settingsSrc.includes('setTypography(DEFAULT_TYPOGRAPHY)') && settingsSrc.includes("t('typeHint')")
      && !settingsSrc.includes('api.settings')
      && i18nBad.length === 0,
    'insert=' + themeInsertIdx + '/' + typoInsertIdx + '/' + pluginInsertIdx + ' i18nBad=' + JSON.stringify(i18nBad))

  // ⑧ 契约 3.7：新键入册（符号 + note + 第 6 个行锚 = 键声明行活性）
  const c37 = hostContract.items.find((it) => it.item === '3.7')
  const typoKeyLine = clientSrc.split('\n').findIndex((line) => line.includes("const TYPOGRAPHY_PERSIST_KEY = 'dsh.novel.typography.v1'")) + 1
  const anchors37 = c37 !== undefined ? (c37.line.match(/L\d+/g) ?? []) : []
  check('UX-066 契约 3.7：dsh.novel.typography.v1 入册（symbol + note + 默认 serif/16 与「不写宿主 settings/API」口径 + data-nv-font 根属性 P-10 说明）∧ 第 6 个行锚活性命中',
    c37 !== undefined && c37.symbol.includes('dsh.novel.typography.v1')
      && c37.note.includes('dsh.novel.typography.v1')
      && c37.note.includes('data-nv-font') && c37.note.includes('不写宿主 settings/API')
      && anchors37.length === 6 && anchors37.includes('L' + typoKeyLine),
    'line=' + (c37 !== undefined ? c37.line : 'missing') + ' actual=L' + typoKeyLine)

  // ⑨ apply 真实驱动（fake DOM + localStorage）：初始化读→store→根属性；cleanup 退订并移除两属性
  const attrs2 = new Map()
  let applied2 = null
  let applyErr2 = ''
  let cleanupErr2 = ''
  globalThis.localStorage = { getItem: () => JSON.stringify({ font: 'kai', size: 18 }), setItem: () => {}, removeItem: () => {} }
  globalThis.document = {
    documentElement: { setAttribute: (name, value) => attrs2.set(name, value), removeAttribute: (name) => attrs2.delete(name) },
    getElementById: () => null,
    head: null,
  }
  const ctx2 = { get: () => undefined, slots: { inject: (name, fn) => fn(), register: () => {} } }
  try { applied2 = tx.apply(ctx2) } catch (e) { applyErr2 = e.message }
  const applyStore2 = { ...tx.store.get().typography }
  const applyAttrs2 = { font: attrs2.get('data-nv-font'), fs: attrs2.get('data-nv-fs') }
  try { if (typeof applied2 === 'function') applied2() } catch (e) { cleanupErr2 = e.message }
  const applyCleared2 = attrs2.size === 0
  delete globalThis.document
  delete globalThis.localStorage
  typoStore.set({ typography: { font: 'serif', size: 16 } })
  check('UX-066 apply 真实驱动：初始化 readTypography（kai/18）→ store → html 根属性同步 ∧ cleanup 退订并移除 data-nv-font/data-nv-fs（无残留）',
    applyErr2 === '' && applyStore2.font === 'kai' && applyStore2.size === 18
      && applyAttrs2.font === 'kai' && applyAttrs2.fs === '18'
      && cleanupErr2 === '' && applyCleared2 === true,
    'err=' + applyErr2 + ' store=' + JSON.stringify(applyStore2) + ' attrs=' + JSON.stringify(applyAttrs2) + ' cleared=' + applyCleared2 + ' cleanupErr=' + cleanupErr2)
}

// ── UX-067：设置页重构（宿主原生分区）+ 原生会话抽屉纸色作用域 ─────────────────────
{
  const ux067 = clientExports
  const hostContract = (await import('../lib/host-contract.mjs')).hostContract
  const rl = hostContract.regionLiterals
  const viewTree = mockReact.createElement(ux067.SettingsPageView, {
    t: (key) => key,
    api: {},
    value: { enabled: true, pollMs: 2000, presetAutoSync: true, apiPublic: false },
    notice: '',
    change: () => {},
  })
  const all = []
  const walk = (node) => {
    if (node === null || node === undefined || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(walk); return }
    all.push(node)
    if (Array.isArray(node.children)) node.children.forEach(walk)
  }
  walk(viewTree)
  const clsOf = (n) => (n !== null && n !== undefined && n.props !== undefined && typeof n.props.className === 'string') ? n.props.className : ''
  const hasCls = (n, c) => clsOf(n).split(/\s+/).includes(c)
  const fonts = all.filter((n) => hasCls(n, 'nv-set-font'))
  const samples = all.filter((n) => hasCls(n, 'nv-set-font-sample'))
  const sizes = all.filter((n) => hasCls(n, 'nv-typo-size'))
  const runRows = all.filter((n) => n.props !== undefined && n.props['data-run-row'] !== undefined)
  const sections = all.filter((n) => n.props !== undefined && n.props['data-settings-section'] !== undefined)
    .map((n) => n.props['data-settings-section'])
  const details = all.filter((n) => n.type === 'details' && n.props !== undefined && n.props['data-settings-disclosure'] === 'diagnostics')
  const summaries = all.filter((n) => n.type === 'summary')
  const themeCards = all.filter((n) => hasCls(n, 'nv-theme-card'))
  const viewText = all.flatMap((n) => (n.children ?? []).filter((c) => typeof c === 'string')).join('|')
  const viewSrcStart = clientSrc.indexOf('function SettingsPageView(props) {')
  const viewSrcEnd = clientSrc.indexOf('\n    function SettingsPage(props) {', viewSrcStart)
  const viewSrc = viewSrcStart >= 0 && viewSrcEnd > viewSrcStart ? clientSrc.slice(viewSrcStart, viewSrcEnd) : ''
  check('UX-067 设置页结构（真实渲染树）：外观/运行/诊断/业务配置四段顺序 ∧ 主题 3 卡 + 写作排版 4 字体卡（各自「文」样本 + 字体栈）+ 4 字号 ∧ 4 运行行（switch/数字+ms）∧ 诊断默认折叠 details + summary ∧ 无旧密集说明段 ∧ 头部状态 pill',
    all.length > 40
      && JSON.stringify(sections) === JSON.stringify(['appearance', 'run', 'diagnostics', 'where'])
      && themeCards.length === 3
      && fonts.length === 4 && samples.length === 4 && samples.every((n) => (n.children ?? []).includes('文') && typeof n.props.style.fontFamily === 'string')
      && sizes.length === 4
      && runRows.length === 4 && JSON.stringify(runRows.map((n) => n.props['data-run-row'])) === JSON.stringify(['enabled', 'poll', 'presetAutoSync', 'apiPublic'])
      && details.length === 1 && details[0].props.open !== true && summaries.length === 1
      && all.some((n) => hasCls(n, 'nv-set-switch') && n.props.role === 'switch' && n.props['aria-checked'] === 'true')
      && all.some((n) => hasCls(n, 'nv-set-pill') && n.props['data-on'] === 'true')
      && all.some((n) => hasCls(n, 'nv-set-input') && n.props.type === 'number')
      && viewText.includes('小说写作') && viewText.includes('工作台外观、运行与诊断')
      && !viewText.includes('业务相关的配置不在本页')
      && viewSrc !== '' && !viewSrc.includes('style: {'),
    'nodes=' + all.length + ' sections=' + JSON.stringify(sections) + ' fonts=' + fonts.length + ' sizes=' + sizes.length
      + ' rows=' + JSON.stringify(runRows.map((n) => n.props['data-run-row'])) + ' details=' + details.length + ' theme=' + themeCards.length)

  const setRule = (() => {
    const i = clientSrc.indexOf("'.nv-settings{")
    const j = clientSrc.indexOf("'", i + 2)
    return i >= 0 && j > i ? clientSrc.slice(i, j) : ''
  })()
  // UX-067 R3（P2-5 机检）：选中字号文字色 = --nv-paper-2、底 = 不透明 --nv-cinnabar；
  // 对三套主题 × 明暗逐对算 WCAG 2.x 对比度（必须 ≥4.5，排除再按错令牌层假设）。
  const relLum = (hex) => {
    const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
    return lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722
  }
  const contrast = (a, b) => {
    const la = relLum(a)
    const lb = relLum(b)
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  }
  const sizeChipContrast = []
  for (const theme of ux067.NV_THEMES) {
    for (const mode of ['light', 'dark']) {
      sizeChipContrast.push({ theme: theme.id, mode, ratio: contrast(theme[mode].cinnabar, theme[mode]['paper-2']) })
    }
  }
  // UX-067 R4（用户 2026-11-09 反馈）：设置页不再消费宿主 --dsw-alias-* 中性灰白，改为插件墨纸
  // 语言——页面 paper-2 暖底 + 1px rule 边框 + 12px 圆角 + 软纸影；卡片 paper / 次卡纸-3、
  // 文本 ink/ink-2/ink-3、强调朱砂、开关 on 纸色。宿主对话框外壳仍是页面外的白色「桌面」。
  check('UX-067 设置页 CSS：插件 --nv-* 墨纸暖面（paper-2 页/paper 卡/paper-3 次卡/ink 文本/rule 边框/朱砂强调）∧ 1px 边框 + 12px 圆角 + 软纸影 ∧ 标题衬线 ∧ 最大宽 760 ∧ 底部 padding 28 ∧ 无固定高度/嵌套滚动 ∧ 零宿主 --dsw-alias-* 映射',
    setRule !== ''
      && setRule.includes('max-width:760px') && setRule.includes('padding:24px 28px 28px')
      && setRule.includes('--nvs-bg:var(--nv-paper-2)')
      && setRule.includes('--nvs-card:var(--nv-paper)')
      && setRule.includes('--nvs-card-2:var(--nv-paper-3)')
      && setRule.includes('--nvs-hover:color-mix(in srgb,var(--nv-ink) 5%,transparent)')
      && setRule.includes('--nvs-fg:var(--nv-ink)')
      && setRule.includes('--nvs-fg-2:var(--nv-ink-2)')
      && setRule.includes('--nvs-fg-3:var(--nv-ink-3)')
      && setRule.includes('--nvs-border:var(--nv-rule)')
      && setRule.includes('--nvs-border-2:var(--nv-rule-strong)')
      && setRule.includes('--nvs-accent:var(--nv-cinnabar)')
      && setRule.includes('--nvs-on-accent:var(--nv-paper-2)')
      && setRule.includes('--nvs-ok:var(--nv-home-ok)')
      && setRule.includes('--nvs-warn:var(--nv-home-warn)')
      && setRule.includes('--nvs-err:var(--nv-danger)')
      && setRule.includes('background:var(--nv-paper-2)')
      && setRule.includes('border:1px solid var(--nv-rule)')
      && setRule.includes('border-radius:12px')
      && /\.nv-settings\{[^}]*box-shadow:[^}]*color-mix\(in srgb,#000/.test(setRule)
      && !setRule.includes('--dsw-alias-')
      && !/\.nv-settings\{[^}]*height:/.test(setRule)
      && !/\.nv-settings\{[^}]*overflow:/.test(setRule)
      && clientSrc.includes('.nv-set-title{margin:0;font-family:var(--nv-serif)')
      && clientSrc.includes('.nv-settings .nv-typo-settings-preview') && clientSrc.includes('background:var(--nv-paper-2)')
      && clientSrc.includes('.nv-set-switch[data-on=true]') && clientSrc.includes('.nv-set-row-help')
      // UX-067 R3（P2-5）：选中字号 = 插件朱砂实底 + 纸色文字（不透明填充，宿主 --dsw-alias-bg-overlay
      // 暗色 #61666b 不再透出；旧 6% 透明软底在暗色仅 1.75:1）。对比度按三主题 × 明暗机检 ≥4.5。
      && clientSrc.includes('.nv-settings .nv-typo-size[data-on=true]{background:var(--nv-cinnabar);color:var(--nv-paper-2);box-shadow:inset 0 0 0 1px var(--nv-cinnabar);font-weight:600}')
      && !clientSrc.includes('.nv-settings .nv-typo-size[data-on=true]{background:color-mix(in srgb,var(--nv-cinnabar) 6%,transparent)')
      && !clientSrc.includes('.nv-settings .nv-typo-size[data-on=true]{background:var(--nvs-accent)')
      && sizeChipContrast.length === 6 && sizeChipContrast.every((c) => c.ratio >= 4.5)
      && !clientSrc.includes('style: { padding: \'16px\', maxWidth: \'760px\' }'),
    'rule=' + setRule.slice(0, 260) + ' sizeContrast=' + JSON.stringify(sizeChipContrast.map((c) => c.theme + '/' + c.mode + '=' + c.ratio.toFixed(2))))

  const drawerSrcStart = clientSrc.indexOf('applyDrawer() {')
  const drawerSrcEnd = clientSrc.indexOf('\n    // ── StudioLayout', drawerSrcStart)
  const drawerSrc = drawerSrcStart >= 0 && drawerSrcEnd > drawerSrcStart ? clientSrc.slice(drawerSrcStart, drawerSrcEnd) : ''
  check('UX-067 抽屉作用域/外壳：不再依赖 [data-nv-theme] ∧ viewArea 11 宿主令牌内联覆盖（快照/恢复同生命周期）∧ 纸-3 底 + rule-strong 1px 缝 + 暖墨软影 ∧ 无白/黑/宿主蓝大面',
    !clientSrc.includes('html[data-nv-drawer="1"][data-nv-theme]')
      && clientSrc.includes('html[data-nv-drawer="1"] [data-phase]')
      && (ux067.VIEW_AREA_TOKEN_PROPS ?? []).length === 11
      && (rl.viewAreaCustomProps ?? []).length === 11
      && ux067.VIEW_AREA_TOKEN_PROPS.every((p) => rl.viewAreaCustomProps.includes(p))
      && rl.viewAreaCustomProps.every((p) => ux067.VIEW_AREA_TOKEN_PROPS.includes(p))
      && clientSrc.includes("viewArea.style.background = 'var(--nv-paper-3)'")
      // UX-067 R2（P2-4）：input-major 从 paper-2（#FBF8F1 暖近白）降到 paper-3；内联映射与 CSS 兜底同值。
      && clientSrc.includes("'--dsw-specific-input-major': 'var(--nv-paper-3)'")
      && clientSrc.includes('--dsw-specific-input-major:var(--nv-paper-3)')
      && !clientSrc.includes('--dsw-specific-input-major:var(--nv-paper-2)')
      && !clientSrc.includes("'--dsw-specific-input-major': 'var(--nv-paper-2)'")
      && clientSrc.includes("viewArea.style.borderLeft = '1px solid var(--nv-rule-strong)'")
      && clientSrc.includes("viewArea.style.boxShadow = '-8px 0 24px color-mix(in srgb, var(--nv-ink) 20%, transparent)'")
      && drawerSrc.includes('for (const prop of VIEW_AREA_TOKEN_PROPS)') && drawerSrc.includes('viewArea.style.setProperty(prop, VIEW_AREA_TOKEN_VALUES[prop])')
      && clientSrc.includes('const value = viewArea.style.getPropertyValue(prop)')
      && clientSrc.includes('rememberTokens(viewArea, savedTokens)')
      && clientSrc.includes('node.style.removeProperty(prop)')
      && !drawerSrc.includes('rgba(0,0,0') && !drawerSrc.includes('#fff') && !drawerSrc.includes('#0b0e14') && !drawerSrc.includes('#4f8ef7'),
    'props=' + JSON.stringify(ux067.VIEW_AREA_TOKEN_PROPS) + ' contract=' + JSON.stringify(rl.viewAreaCustomProps))
}
//   至少 4 个任务周期（179 vs 276，正落在 COMPAT-007 修改的代码块内）；本断言把「随 smoke 计数变更同步」由
//   文档纪律升级为机检（改 README 计数与改 smoke 断言数必须同 commit）。**必须保持为本文件最后一条 check**
//   （断言式用 `passed + 1` 计入自身；后续新增 check 会使其红——这正是期望的提示信号）。
const readmeSmokeDeclared = Number((/node test\/smoke\.mjs\s+#[^\n]*?(\d+)\s*项断言/.exec(readFileSync(new URL('../README.md', import.meta.url), 'utf8')) ?? [])[1] ?? NaN)
check('COMPAT-014 A-F9 README smoke 断言计数同步：声明 ' + (Number.isNaN(readmeSmokeDeclared) ? '缺失' : readmeSmokeDeclared) + ' ≡ 实测 ' + (passed + 1) + '（含本断言自身；陈旧即红）',
  readmeSmokeDeclared === passed + 1,
  'declared=' + readmeSmokeDeclared + ' actual=' + (passed + 1))

}

console.log(`\nSMOKE DONE: ${passed} passed, ${failed} failed`)
rmSync(root, { recursive: true, force: true })
process.exit(failed === 0 ? 0 : 1)
