/**
 * UX-061 阶段 2（方向 B）几何基线机检 —— headless Edge 实测。
 *
 * 口径（P-01）：规则**从 lib/client.js 源码抽取**（不复制常量），最小 HTML 注入后用
 * Edge headless 的 getBoundingClientRect()/getComputedStyle() 量算；只读、不写真实环境。
 *
 * 检查项：
 *  1. rail 宽 44px / 正文与编辑区阅读宽 ≈510px（--nv-measure 34em @15px）
 *  2. 章节行高 28px + 字号 12px（--nv-fs-base；CR1 P1-1 回归防线）
 *  3. 输入框高 32px（ctl-md，content-box 回归防线 CR1 P1）
 *  4. 正文段距 = 1em（15px；CR1 P1-2 段距被覆盖的回归防线）
 *  5. rail 状态常驻可见文字（DR P2-1）：`.nv-rail-status` 文本非空；**最坏态（degraded 短标签，5 字）**下
 *     状态标签高度 ≤120px 且 3 个操作按钮仍完全可见（不被挤出/裁切）
 *
 * 退出码：0 = 全部通过；1 = 断言失败；3 = 本机缺 Edge 且未要求严格模式。
 * 严格模式：`--strict` 或环境变量 CI 非空 ⇒ 缺 Edge 视为失败（CI 必须真跑）。
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const strict = process.argv.includes('--strict') || (process.env.CI !== undefined && process.env.CI !== '')
const clientSrc = fs.readFileSync(path.join(root, 'lib', 'client.js'), 'utf8')

function rule(sel, mustHave) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(esc + '\\{([^}]*)\\}', 'g')
  let m
  while ((m = re.exec(clientSrc)) !== null) {
    if (!mustHave || m[1].includes(mustHave)) return sel + '{' + m[1] + '}'
  }
  throw new Error('rule not found: ' + sel)
}

const rootMatch = /':root\{([^\n]*?)\}',/.exec(clientSrc)
if (rootMatch === null) throw new Error('root token block not found')
const rootCss = ':root{' + rootMatch[1] + '}'

// ── UX-063 P0-a 第①步：全屏工作台 + 对话抽屉几何（规格 docs/design/UX-063-redesign-spec.md §1A/§3）──
// 口径：常量与 CSS 规则一律**从 lib/client.js 源码抽取**（不复制实现）。
// UX-063 返工（REVIEW-UX-063-P0A-DR1 P1-2 / CR1 P2）：原实现把正文列注入为 left:0、且两个矩形都由
// **同一个让位公式**生成 ⇒ `drawerLeft − textRight === 24` 是构造恒等式（自证），真实左偏移被忽略。
// 现口径：①正文列按**真实左偏移 11px** 注入（`.nv-split` border 1 + 上部区内联 `padding:'10px 10px 0'`
// 的 10；rail 44 属底部工作台 midFooter，不在上部内容区——DR1 §2.1 代码事实）；
// ②新增**正交判据**（drawer ∩ text = ∅；handle ∩ text = ∅ 且仅在 colW ≥ DRAWER_HANDLE_MIN_COLW 渲染）；
// ③「公式余量」与「实测余量」分别输出（P3-3：公式余量 24 ≠ 实测余量 13，不得混称）。
const u63num = (re, what) => {
  const m = re.exec(clientSrc)
  if (m === null) throw new Error('ux063 source missing: ' + what)
  return Number(m[1])
}
const U63 = { drawerW: 0, edgeW: 0, zDrawer: 0, textMax: 0, railW: 0, gutter: 0, handleMin: 0 }
let U63_RULES = []
let u63Err = null
try {
  U63.drawerW = u63num(/const DRAWER_W = (\d+)/, 'DRAWER_W = 420')
  U63.edgeW = u63num(/const DRAWER_EDGE_W = (\d+)/, 'DRAWER_EDGE_W = 48')
  U63.zDrawer = u63num(/const DRAWER_Z = (\d+)/, 'DRAWER_Z = 920')
  U63.textMax = u63num(/const DRAWER_TEXT_MAX = (\d+)/, 'DRAWER_TEXT_MAX = 544')
  U63.railW = u63num(/const DRAWER_RAIL_W = (\d+)/, 'DRAWER_RAIL_W = 44')
  U63.gutter = u63num(/const DRAWER_GUTTER = (\d+)/, 'DRAWER_GUTTER = 24')
  U63.handleMin = u63num(/const DRAWER_HANDLE_MIN_COLW = (\d+)/, 'DRAWER_HANDLE_MIN_COLW = 1046')
  U63_RULES = [
    rule('.nv-drawer-edge', 'position:fixed'),
    rule('.nv-drawer-edge-ico', 'transform:rotate(180deg)'),
    rule('.nv-split', 'z-index:900'),
    rule('.nv-console', 'z-index:950'),
  ]
} catch (e) {
  u63Err = e.message
}
if (u63Err !== null) {
  console.log('[verify-visual-geometry] FAIL: ux063 抽屉/全屏源面缺失（' + u63Err + '）——先实现再量算')
  process.exit(1)
}
// UX-063 第③步（DR2(第②步) P3-1）：正文列左偏移**不再硬编码**——从源码抽取 `.nv-split` border 与
// 上部区内联 `padding:'10px …'`，二者之和即真实偏移（当前 1 + 10 = 11）。任一侧改动 ⇒ 自动跟随并触发断言。
const U63_SPLIT_BORDER = Number((/\.nv-split\{[^}]*border:(\d+)px/.exec(clientSrc) ?? [])[1])
const U63_UPPER_PAD = Number((/padding: '(\d+)px \d+px 0'/.exec(clientSrc) ?? [])[1])
if (!Number.isFinite(U63_SPLIT_BORDER) || !Number.isFinite(U63_UPPER_PAD)) {
  console.log('[verify-visual-geometry] FAIL: 正文列左偏移来源缺失（.nv-split border / 上部区 padding）')
  process.exit(1)
}
const U63_TEXT_LEFT = U63_SPLIT_BORDER + U63_UPPER_PAD // 真实左偏移（当前 1 + 10 = 11）
// UX-063 第③步（DR2(第②步) P3-2）：提示行高度常量与 CSS 实测绑定，防「常量漂移无信号」。
const DRAWER_HINT_H_SRC = Number((/const DRAWER_HINT_H = (\d+)/.exec(clientSrc) ?? [])[1])
if (!Number.isFinite(DRAWER_HINT_H_SRC)) {
  console.log('[verify-visual-geometry] FAIL: DRAWER_HINT_H 常量缺失')
  process.exit(1)
}
const U63_COLS = [1400, 1086, 1046, 1000, 956, 800] // 覆盖验收视口 + 手柄阈值两侧 + 窄档
const u63TextW = (colW) => Math.max(0, Math.min(U63.textMax, colW - U63.railW - (U63.drawerW - U63.railW) - U63.gutter))
const u63HandleLeft = (colW) => colW - U63.drawerW - U63.edgeW
const u63HandleRendered = (colW) => colW >= U63.handleMin
const u63StageHtml = U63_COLS.map((colW) => {
  const tw = u63TextW(colW)
  const handle = u63HandleRendered(colW)
    ? '<div data-role="handle" style="position:absolute;left:' + u63HandleLeft(colW) + 'px;top:0;width:' + U63.edgeW + 'px;height:120px;background:#3a4150"></div>'
    : ''
  return '<div data-colw="' + colW + '" style="position:relative;width:' + colW + 'px;height:120px;margin:0 0 8px 0">'
    + '<div data-role="text" style="position:absolute;left:' + U63_TEXT_LEFT + 'px;top:0;width:' + tw + 'px;height:120px;background:#1b2433"></div>'
    + '<div data-role="drawer" style="position:absolute;left:' + (colW - U63.drawerW) + 'px;top:0;width:' + U63.drawerW + 'px;height:120px;background:#2b3a55"></div>'
    + handle + '</div>'
}).join('\n')

// ── UX-064 R2：首页 CSS 规则整段抽取（不是逐条镜像）──
// 口径：首页规则全部以 `.nv-home` 前缀作用域；顶栏/控制台/正文盒规则按固定前缀集合取。
// 排除旧 books 页的裸 `.nv-hero*` / `.nv-quote*` / `.nv-shelf*` / `.nv-cover*` 规则——它们不与
// 首页结构同源，注入只会污染量算（S1 复审 P0-2 的教训：同特异性旧规则会覆盖新规则）。
const UX064_SEL_PREFIX = /^\.nv-(?:console|cbody|topbar|brand|seal|wsswitch|ws-|tsearch|kbd|tghost|iconbtn|topbar-div)/
function ux064HomeCss() {
  const out = []
  for (const rawLine of clientSrc.split('\n')) {
    const m = /^\s*'((?:[^'\\]|\\.)*)',?\s*$/.exec(rawLine)
    if (m === null) continue
    const txt = m[1].replace(/\\'/g, "'")
    if (!txt.includes('{') || !txt.startsWith('.')) continue
    const sel = txt.slice(0, txt.indexOf('{'))
    if (sel.includes('.nv-home') || UX064_SEL_PREFIX.test(sel)) out.push(txt)
  }
  return out
}
const UX064_HOME_CSS = ux064HomeCss()
// 旧 books 页的裸 `.nv-hero*` 规则在源码里位于首页 CSS **之后**（≈L6514）——同特异性/低特异性也会
// 污染首页量算（S1 返工实测：宿主里 `.nv-hero{margin:auto;padding:32px 16px;text-align:center}`
// 把首页英雄区挤成 323px 居中块）。这里按**真实源码顺序**追加注入，让回归信号与宿主一致。
function booksHeroCss() {
  const out = []
  for (const rawLine of clientSrc.split('\n')) {
    const m = /^\s*'((?:[^'\\]|\\.)*)',?\s*$/.exec(rawLine)
    if (m === null) continue
    const txt = m[1].replace(/\\'/g, "'")
    if (!txt.includes('{') || !txt.startsWith('.')) continue
    const sel = txt.slice(0, txt.indexOf('{'))
    if (/^\.nv-hero(?:$|[ -.])/.test(sel)) out.push(txt)
  }
  return out
}
const BOOKS_HERO_CSS = booksHeroCss()
if (UX064_HOME_CSS.length < 60 || BOOKS_HERO_CSS.length < 1) {
  console.log('[verify-visual-geometry] FAIL: UX-064 首页 CSS 规则抽取不足（' + UX064_HOME_CSS.length + ' 条 < 60）或旧 books .nv-hero 规则缺失（' + BOOKS_HERO_CSS.length + '）——抽取口径与源码脱节')
  process.exit(1)
}

const rules = [
  rule('.nv-rail', 'width:44px'),
  rule('.nv-rail .nv-wfctl-btn,.nv-rail .nv-wfctl-btn2'),
  rule('.nv-rail-status', 'writing-mode'),
  rule('.nv-edwrap', 'max-width:'),
  rule('.nv-edwrap textarea', 'width:100%'),
  rule('.nv-chrow', 'height:28px'),
  rule('.nv-cinput', 'min-height:var(--nv-ctl-md)'),
  // UX-063 P0-a③：正文/编辑区规则**直接从源码抽取**（不再镜像硬编码）——字号 reading 令牌、
  // 行高 1.9、中文排版（首行缩进 2em + 段距 .8em）。镜像自证已在第①步 DR1 P1-2 被否决。
  // 抽取口径：只要目标是**该选择器的同一规则**（mustHave 取宽口径），取值是否合规由断言判定——
  // 这样「值被改坏」会得到**具名断言失败**而不是抽取期抛错（判别信号更准，仍 fail-closed）。
  rule('.nv-content', 'font-size:var(--nv-fs-reading'),
  rule('.nv-content', 'max-width:var(--nv-measure'),
  rule('.nv-content p', 'margin:0 0 .8em'),
  // DR1 P1-1：标题层级（h2 20 / h3 17 > 正文 16）——同样从源码抽取后实测 computed
  rule('.nv-content h2', 'font-size:'),
  rule('.nv-content h3', 'font-size:'),
  rule('.nv-drawer-hint', 'line-height:16px'),
  // UX-064 R2（S1 返工）：首页几何改由**真实工作区结构**量算——旧 880 上限 / CTA 36 已被批准稿废弃
  // （`.nv-home` 现在是填满 `.nv-cbody` 的四行网格，不是居中窄条）。规则仍从源码抽取，不复制实现。
  ...UX064_HOME_CSS,
  // 真实源码顺序：books 旧规则在首页之后 ⇒ 首页必须靠特异性/显式复位赢，不能靠「定义得晚」
  ...BOOKS_HERO_CSS,
  ...U63_RULES,
]

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${rootCss}
${rules.join('\n')}
</style></head><body>
<div class="nv-rail" id="rail">
  <span class="nv-rail-status" id="railStatus">服务不可用</span>
  <span class="nv-rail-stage">正文生成</span>
  <button class="nv-wfctl-btn" data-mode="go"></button>
  <button class="nv-wfctl-btn2"></button>
  <button class="nv-wfctl-btn2"></button>
</div>
<!-- DR3 P2：面板最小高度 120px 时，rail 必须可滚动且按钮可达（不能被裁切） -->
<div style="height:120px;width:44px;overflow:hidden">
  <div class="nv-rail" id="railMin" style="height:120px">
    <span class="nv-rail-status">服务不可用</span>
    <span class="nv-rail-stage">正文生成</span>
    <button class="nv-wfctl-btn" data-mode="go"></button>
    <button class="nv-wfctl-btn2"></button>
    <button class="nv-wfctl-btn2"></button>
  </div>
</div>
<div class="nv-edwrap"><textarea id="ta" style="min-height:420px;padding:12px;border:1px solid #2a2f3a"></textarea></div>
<div class="nv-content" id="content"><h2 id="h2">第1章 测试章标题</h2><h3 id="h3">小节标题</h3><p id="para">中文正文测试段落，用于测量阅读宽度与段距。</p></div>
<button class="nv-chrow" id="chrow">第1章 测试</button>
<input class="nv-cinput" id="cinput" value="x">
<!-- UX-064 R2：真实工作区结构（1152×840 = 1440 视口扣侧栏后的控制台宽度；固定盒不走 mock 的 1152 断言） -->
<div class="nv-console" id="u64Console" data-view="home" style="width:1152px;height:840px">
  <div class="nv-topbar" id="u64Topbar">
    <div class="nv-brand"><span class="nv-seal nv-brand-seal">砚</span><span class="nv-brand-word">书斋</span><span class="nv-brand-sub">NOVEL</span></div>
    <div class="nv-topbar-right"><span class="nv-tghost" id="u64NewBtn">＋ 新建书</span></div>
  </div>
  <div class="nv-cbody nv-cbody-home" id="u64Cbody">
    <div class="nv-home" id="home">
      <section class="nv-home-hero nv-hero" id="hero">
        <div class="nv-hero-left">
          <div class="nv-eyebrow"><span class="nv-tick"></span><span>正在写</span></div>
          <h1 class="nv-hero-title" id="heroTitle">测试书名，副题</h1>
          <div class="nv-hero-meta"><span>规则怪谈</span><span class="nv-home-meta-sep">·</span><span>38 章</span><span class="nv-home-meta-sep">·</span><span>12.4 万字</span></div>
          <div class="nv-hero-actions">
            <button type="button" class="nv-home-cta nv-btn-lg" id="homeCta"><span class="nv-home-cta-text">续写第 39 章</span></button>
            <button type="button" class="nv-hero-quiet" id="u64Quiet">打开第 38 章</button>
          </div>
        </div>
      </section>
      <aside class="nv-quote nv-quote-card" id="quote" aria-label="今日引文">引文测试段落</aside>
      <hr class="nv-home-rule" id="rule">
      <section class="nv-home-shelf nv-shelf" id="shelf" aria-label="书架">
        <div class="nv-shelf-head"><span>书架</span></div>
        <div class="nv-shelf-grid">
          <article class="nv-shelf-card nv-book-card" id="shelfCard">
            <div class="nv-cover-frame"><div class="nv-cover" data-tone="2"><span class="nv-cover-genre">规则怪谈</span><span class="nv-cover-title">测试书名</span><span class="nv-cover-seal">砚</span><span class="nv-cover-no">38</span></div></div>
            <div class="nv-book-stat">38 章 · 12.4 万字</div>
          </article>
          <button type="button" class="nv-shelf-add" id="shelfAdd"><span class="nv-shelf-add-t">新建书</span></button>
        </div>
      </section>
      <footer class="nv-home-deskline" id="deskline">
        <span class="nv-deskline-label">书案</span><span class="nv-deskline-todo">2 部未发布</span>
      </footer>
    </div>
  </div>
</div>
<!-- UX-064 R2 空态：同一结构（无书），ghost 尺寸来自源码 CSS -->
<div class="nv-console" id="u64ConsoleEmpty" data-view="home" style="width:1152px;height:840px">
  <div class="nv-topbar" id="u64TopbarEmpty"><div class="nv-brand"><span class="nv-seal nv-brand-seal">砚</span><span class="nv-brand-word">书斋</span></div></div>
  <div class="nv-cbody nv-cbody-home" id="u64CbodyEmpty">
    <div class="nv-home" id="homeEmpty">
      <section class="nv-home-hero nv-hero empty-hero nv-empty-hero" id="heroEmpty">
        <div class="nv-hero-left">
          <div class="nv-eyebrow"><span class="nv-tick"></span><span>还没有书</span></div>
          <h1 class="nv-hero-title empty-title" id="heroTitleEmpty">从第一本书开始。</h1>
          <div class="nv-hero-meta"><span>一个工作区，一条从初稿到发布的路。</span></div>
          <div class="nv-hero-actions"><button type="button" class="nv-home-cta nv-btn-lg empty-cta" id="homeCtaEmpty"><span class="nv-home-cta-text">新建第一本书</span></button></div>
        </div>
      </section>
      <aside class="nv-quote nv-quote-card nv-empty-quote" id="quoteEmpty" aria-label="开始写作的三步"><span class="nv-empty-cover" id="emptyCover">书名</span><div class="nv-empty-steps"><div class="nv-empty-steps-title">开书三步</div><ol class="nv-empty-steps-list"><li>起一个书名</li><li>写下第一章</li><li>随时回来接着写</li></ol></div></aside>
      <hr class="nv-home-rule" id="ruleEmpty">
      <section class="nv-home-shelf nv-shelf" id="shelfEmpty" aria-label="书架">
        <div class="nv-shelf-head"><span class="nv-shelf-count">书架 0 本</span></div>
        <div class="nv-empty-shelf" id="emptyShelf">
          <div class="nv-empty-shelf-ghosts" aria-hidden="true"><span class="nv-ghost"></span><span class="nv-ghost"></span><span class="nv-ghost"></span></div>
          <div class="nv-empty-shelf-text"><span class="nv-empty-shelf-t" id="emptyShelfT">书架还空着。</span><span class="nv-empty-shelf-d" id="emptyShelfD">第一本书会立在这里，<br>带着它的封面、章数和最近一次保存。</span></div>
        </div>
      </section>
      <footer class="nv-home-deskline" id="desklineEmpty"><span class="nv-deskline-label">书案</span><span class="nv-deskline-todo">还没有待办</span></footer>
    </div>
  </div>
</div>
<!-- UX-063 P0-a 探针：唤出条（48）/ 抽屉 z（920）/ 三值共存锚点 / 真值表四档正文列 -->
<div class="nv-drawer-edge" id="u63edge" style="left:0;top:0;width:${U63.edgeW}px;height:600px"></div>
<div id="u63zdrawer" style="z-index:${U63.zDrawer}"></div>
<div class="nv-split" id="u63zsplit"></div>
<div class="nv-console" id="u63zconsole"></div>
<!-- UX-063③：窄窗提示行（常量 DRAWER_HINT_H 与 CSS 实测高度绑定，防常量漂移无信号） -->
<div class="nv-drawer-hint" id="u63hint">视口较窄，建议全屏（抽屉可能遮挡部分内容）</div>
${u63StageHtml}
<script>
window.addEventListener('load', function () {
  const r = (el) => { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) } }
  const cs = (el) => getComputedStyle(el)
  const para = document.getElementById('para')
  const out = {
    rail: r(document.getElementById('rail')),
    measure: r(document.getElementById('content')),
    edwrap: r(document.getElementById('ta')),
    chrow: r(document.getElementById('chrow')),
    cinput: r(document.getElementById('cinput')),
    u64: (() => {
      const cbody = document.getElementById('u64Cbody')
      const home = document.getElementById('home')
      const desk = document.getElementById('deskline')
      const cta = document.getElementById('homeCta')
      const cb = cbody.getBoundingClientRect()
      const hb = home.getBoundingClientRect()
      const db = desk.getBoundingClientRect()
      const csHome = getComputedStyle(home)
      const eb = document.getElementById('u64CbodyEmpty').getBoundingClientRect()
      const eh = document.getElementById('homeEmpty').getBoundingClientRect()
      const ghosts = Array.from(document.querySelectorAll('#emptyShelf .nv-ghost')).map((g) => {
        const b = g.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }
      })
      return {
        cbodyW: Math.round(cbody.clientWidth),
        home: { w: Math.round(hb.width), h: Math.round(hb.height) },
        hero: { w: Math.round(document.getElementById('hero').getBoundingClientRect().width) },
        heroPad: getComputedStyle(document.getElementById('hero')).padding,
        ruleY: Math.round(document.getElementById('rule').getBoundingClientRect().y),
        shelfY: Math.round(document.getElementById('shelf').getBoundingClientRect().y),
        quote: { w: Math.round(document.getElementById('quote').getBoundingClientRect().width) },
        ruleH: Math.round(document.getElementById('rule').getBoundingClientRect().height),
        shelfH: Math.round(document.getElementById('shelf').getBoundingClientRect().height),
        deskBottomGap: Math.round(cb.bottom - db.bottom),
        deskH: Math.round(db.height),
        ctaH: Math.round(cta.getBoundingClientRect().height),
        cols: csHome.gridTemplateColumns,
        rows: csHome.gridTemplateRows,
        homePad: [csHome.paddingTop, csHome.paddingRight, csHome.paddingBottom, csHome.paddingLeft].join(' '),
        empty: {
          cbodyW: Math.round(document.getElementById('u64CbodyEmpty').clientWidth),
          home: { w: Math.round(eh.width), h: Math.round(eh.height) },
          ghosts,
          cbodyH: Math.round(eb.height),
          shelfH: Math.round(document.getElementById('emptyShelf').getBoundingClientRect().height),
          titleFont: getComputedStyle(document.getElementById('heroTitleEmpty')).fontSize,
          searchCount: document.querySelectorAll('#u64ConsoleEmpty .nv-tsearch').length,
          // R3 B：空态视觉必须真量（纸卡边框/底色/横排、三步卡封面、横向书架、文案字号）
          quote: (() => {
            const q = document.getElementById('quoteEmpty'); const s = cs(q)
            return { w: Math.round(q.getBoundingClientRect().width), border: s.borderTopWidth, bg: s.backgroundColor, dir: s.flexDirection }
          })(),
          cover: r(document.getElementById('emptyCover')),
          shelfDir: cs(document.getElementById('emptyShelf')).flexDirection,
          shelfTFont: cs(document.getElementById('emptyShelfT')).fontSize,
          shelfDFont: cs(document.getElementById('emptyShelfD')).fontSize,
        },
      }
    })(),
    contentFont: cs(document.getElementById('content')).fontSize,
    contentLineHeight: cs(document.getElementById('content')).lineHeight,
    // DR1 P1-1：标题层级实测（h2 > h3 > 正文）
    h2Font: cs(document.getElementById('h2')).fontSize,
    h3Font: cs(document.getElementById('h3')).fontSize,
    // DR1 P2-1：**文本内容宽**（clientWidth − 左右内边距；元素宽含 padding 会假绿）
    contentTextW: (() => {
      const el = document.getElementById('content'); const s = cs(el)
      return Math.round(el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight))
    })(),
    taTextW: (() => {
      const el = document.getElementById('ta'); const s = cs(el)
      return Math.round(el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight))
    })(),
    paraTextIndent: cs(para).textIndent,
    hint: r(document.getElementById('u63hint')),
    chrowFont: cs(document.getElementById('chrow')).fontSize,
    paraMarginTop: cs(para).marginTop,
    paraMarginBottom: cs(para).marginBottom,
    railStatus: (document.getElementById('railStatus').textContent || '').trim(),
    statusFont: cs(document.getElementById('railStatus')).fontSize,
    statusRect: r(document.getElementById('railStatus')),
    railMin: (() => {
      const el = document.getElementById('railMin')
      const rb = el.getBoundingClientRect()
      const btns = Array.from(el.querySelectorAll('button')).map((b) => {
        const bb = b.getBoundingClientRect()
        const topInContent = bb.top - rb.top + el.scrollTop
        return { h: Math.round(bb.height), reachable: bb.height > 0 && topInContent + bb.height <= el.scrollHeight + 1 }
      })
      return { clientH: Math.round(el.clientHeight), scrollH: Math.round(el.scrollHeight), canScroll: el.scrollHeight > el.clientHeight, btns }
    })(),
    buttons: Array.from(document.getElementById('rail').querySelectorAll('button')).map((b) => {
      const bb = b.getBoundingClientRect()
      const rb = document.getElementById('rail').getBoundingClientRect()
      return { h: Math.round(bb.height), visible: bb.height > 0 && bb.bottom <= rb.bottom + 1 && bb.top >= rb.top - 1 }
    }),
    u63: {
      drawer: r(document.querySelector('[data-role="drawer"]')),
      edge: r(document.getElementById('u63edge')),
      zSplit: cs(document.getElementById('u63zsplit')).zIndex,
      zDrawer: cs(document.getElementById('u63zdrawer')).zIndex,
      zConsole: cs(document.getElementById('u63zconsole')).zIndex,
      cols: ${JSON.stringify(U63_COLS)}.map((c) => {
        const box = document.querySelector('[data-colw="' + c + '"]')
        const base = box.getBoundingClientRect().left
        const rel = (b) => ({ l: Math.round(b.left - base), r: Math.round(b.right - base), w: Math.round(b.width) })
        const t = rel(box.querySelector('[data-role="text"]').getBoundingClientRect())
        const d = rel(box.querySelector('[data-role="drawer"]').getBoundingClientRect())
        const h = box.querySelector('[data-role="handle"]')
        const hr = h === null ? null : rel(h.getBoundingClientRect())
        return { c, text: t, drawer: d, handle: hr }
      }),
    },
  }
  document.body.setAttribute('data-measure', JSON.stringify(out))
})
</script></body></html>`

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
const edge = candidates.find((p) => fs.existsSync(p))
if (edge === undefined) {
  if (strict) {
    console.log('[verify-visual-geometry] FAIL: Edge not found and strict mode is on (CI must run this gate)')
    process.exit(1)
  }
  console.log('[verify-visual-geometry] SKIP: Edge not found (exit 3; pass --strict or set CI to enforce)')
  process.exit(3)
}

const tmp = path.join(os.tmpdir(), 'ux061-b-geometry.html')
fs.writeFileSync(tmp, html, 'utf8')
try {
  const dom = execFileSync(edge, [
    '--headless=new', '--disable-gpu', '--window-size=1280,900',
    '--virtual-time-budget=2000', '--dump-dom',
    'file:///' + tmp.replace(/\\/g, '/'),
  ], { encoding: 'utf8', timeout: 120000 })
  const m = /data-measure="([^"]*)"/.exec(dom)
  if (m === null) throw new Error('measurement attribute missing (DOM head: ' + dom.slice(0, 300) + ')')
  const data = JSON.parse(m[1].replace(/&quot;/g, '"'))
  const checks = {
    rail44: data.rail.w === 44,
    // UX-063③：正文 34em @16px = 544（区间 [512,576]）；编辑区元素宽与**文本内容宽**双判据
    measure544: data.measure.w >= 512 && data.measure.w <= 576,
    // CR1 F-1：下界由 500 提到 512（原下界过松：若编辑区字号回退 15px，34em=510 仍会落在区间内假绿）
    edwrapBox544: data.edwrap.w >= 512 && data.edwrap.w <= 576,
    // DR1 P2-1：阅读↔编辑**文本内容宽**一致（544±2）——防元素宽含内边距导致的假绿
    taTextW544: Math.abs(data.taTextW - 544) <= 2,
    contentTextW544: Math.abs(data.contentTextW - 544) <= 2,
    contentFont16: data.contentFont === '16px',
    contentLh19: Math.abs(parseFloat(data.contentLineHeight) - 30.4) <= 0.6,
    // DR1 P1-1：h2(20) > h3(17) > 正文(16)——标题不得低于正文字号
    headingScale: data.h2Font === '20px' && data.h3Font === '17px' && data.contentFont === '16px',
    paraIndent2em: data.paraTextIndent === '32px',
    para08em: Math.abs(parseFloat(data.paraMarginBottom) - 12.8) <= 0.3,
    u63TextLeftSrc: U63_TEXT_LEFT === 11,
    u63HintH: Math.abs(data.hint.h - DRAWER_HINT_H_SRC) <= 2,
    chrow28: data.chrow.h === 28,
    chrowFont12: data.chrowFont === '12px',
    cinput32: data.cinput.h === 32,
    // UX-064 R2：首页 = 填满 .nv-cbody 的四行网格（旧「880 居中窄条 + CTA 36」已按批准稿废弃）
    // ①根宽 = 实测 .nv-cbody clientWidth（±1，不复制 mock 的 1152）②高度吃满可用高度 ③四行两列网格
    u64HomeRootFills: Math.abs(data.u64.home.w - data.u64.cbodyW) <= 1 && data.u64.home.h >= 700,
    u64GridFourRows: data.u64.rows.trim().split(/\s+/).length === 4 && data.u64.rows.trim().split(/\s+/)[1] === '1px',
    u64QuoteCol384: Math.abs(parseFloat(data.u64.cols.trim().split(/\s+/).pop()) - 384) <= 2,
    u64HeroWide: data.u64.hero.w >= 560,
    // 首页英雄区必须**填满左列**（1fr），不被旧 books `.nv-hero{margin:auto;padding:32px 16px}` 挤成居中块
    u64HeroFillsCol: Math.abs(data.u64.hero.w - (data.u64.home.w - 80 - 384 - 32)) <= 2,
    u64HeroNoBooksPad: data.u64.heroPad === '0px',
    // 分隔线占独立 1px 行：border 底边 == 书架行顶（不压到书架标题）
    u64RuleOwnRow: Math.abs((data.u64.ruleY + data.u64.ruleH) - data.u64.shelfY) <= 2,
    u64Quote384: Math.abs(data.u64.quote.w - 384) <= 2,
    u64RuleThin: data.u64.ruleH <= 1,
    u64ShelfRendered: data.u64.shelfH > 0,
    u64DesklineAtBottom: data.u64.deskBottomGap >= 0 && data.u64.deskBottomGap <= 30,
    u64Cta42: data.u64.ctaH === 42,
    u64HomePad: data.u64.homePad === '30px 40px 22px 40px',
    u64NoCentered880: data.u64.home.w !== 880,
    u64EmptyGhost86x124: data.u64.empty.ghosts.length === 3
      && data.u64.empty.ghosts.every((g) => Math.abs(g.w - 86) <= 2 && Math.abs(g.h - 124) <= 2),
    // 空态书架高度锁死 340（fixture 1152 宽不换行）：box-sizing 缺失时 356 必须红
    u64EmptyShelf340: Math.abs(data.u64.empty.shelfH - 340) <= 2,
    u64EmptyTitle38: data.u64.empty.titleFont === '38px',
    u64EmptyNoSearch: data.u64.empty.searchCount === 0,
    // R3 B：空态视觉与 console-empty.html 对齐（真量，不做源码镜像）
    u64EmptyQuote384: Math.abs(data.u64.empty.quote.w - 384) <= 2,
    u64EmptyQuoteCard: data.u64.empty.quote.border === '1px'
      && data.u64.empty.quote.bg !== 'rgba(0, 0, 0, 0)' && data.u64.empty.quote.bg !== 'transparent',
    u64EmptyQuoteRow: data.u64.empty.quote.dir === 'row',
    u64EmptyCover92x132: Math.abs(data.u64.empty.cover.w - 92) <= 1 && Math.abs(data.u64.empty.cover.h - 132) <= 1,
    u64EmptyShelfRow: data.u64.empty.shelfDir === 'row',
    u64EmptyShelfTitle16: data.u64.empty.shelfTFont === '16px',
    u64EmptyShelfDesc11: data.u64.empty.shelfDFont === '11px',
    railStatusVisible: data.railStatus.length > 0,
    statusFont12: data.statusFont === '12px',
    worstCaseStatusCapped: data.statusRect.h > 0 && data.statusRect.h <= 120,
    railButtonsStayVisible: data.buttons.length === 3 && data.buttons.every((b) => b.visible),
    minPanel120Scrollable: data.railMin.clientH > 60 && data.railMin.clientH <= 120 && data.railMin.canScroll === true,
    minPanelButtonsReachable: data.railMin.btns.length === 3 && data.railMin.btns.every((b) => b.reachable),
    // UX-063 P0-a：抽屉 420 / 唤出条 48 / z 三值共存 / 让位公式 / **正交判据**（DR1 P1-2）
    u63Drawer420: data.u63.drawer.w === 420,
    u63Edge48: data.u63.edge.w === 48,
    u63ZCoexist: data.u63.zSplit === '900' && data.u63.zDrawer === '920' && data.u63.zConsole === '950',
    u63TextCol: data.u63.cols.length === U63_COLS.length
      // ① 正文列宽 = 让位公式（逐档）
      && data.u63.cols.every((x) => x.text.w === u63TextW(x.c))
      // ② 正交：正文列 ∩ 抽屉 = ∅（**实测矩形**，不共用公式）
      && data.u63.cols.every((x) => x.drawer.l - x.text.r >= 0)
      // ③ 手柄渲染档（colW ≥ DRAWER_HANDLE_MIN_COLW）：手柄 ∩ 正文 = ∅；非渲染档：手柄**不存在**
      && data.u63.cols.filter((x) => u63HandleRendered(x.c)).every((x) => x.handle !== null && x.handle.l - x.text.r >= 0)
      && data.u63.cols.filter((x) => !u63HandleRendered(x.c)).every((x) => x.handle === null)
      // ④ 验收档值（544 仅在 colW ≥ 1046 成立；窄档按公式如实收窄）
      && (data.u63.cols.find((x) => x.c === 1400) ?? { text: {} }).text.w === 544
      && (data.u63.cols.find((x) => x.c === 1086) ?? { text: {} }).text.w === 544
      && (data.u63.cols.find((x) => x.c === 1046) ?? { text: {} }).text.w === 544
      && (data.u63.cols.find((x) => x.c === 956) ?? { text: {} }).text.w === 512
      && (data.u63.cols.find((x) => x.c === 800) ?? { text: {} }).text.w === 356,
  }
  console.log('[verify-visual-geometry] MEASURE ' + JSON.stringify(data))
  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k)
  if (failed.length > 0) {
    console.log('[verify-visual-geometry] FAIL: ' + failed.join(', '))
    process.exit(1)
  }
  // 公式余量 = §3 公式自述的呼吸间距常量（24，含 44 预留与正文左缘的旧假设）；
  // 实测余量 = 真实矩形边界差（真实左偏移 11 ⇒ 逐档实测 13~425）。两者分别输出，不得混称（DR1 P3-3）。
  const U63_FORMULA_RESERVE = U63.gutter
  const u63Rows = data.u63.cols.map((x) => ({
    c: x.c,
    textW: x.text.w,
    measuredMargin: x.drawer.l - x.text.r,
    handleMargin: x.handle === null ? null : x.handle.l - x.text.r,
  }))
  console.log('[verify-visual-geometry] OK: rail 44 / measure ' + data.measure.w + ' (34em@16px, 断言 [512,576]) / edwrap ' + data.edwrap.w
    + ' / 正文文本宽 ' + data.contentTextW + '·编辑文本宽 ' + data.taTextW + '（±2 一致性）'
    + ' / 标题 h2 ' + data.h2Font + ' > h3 ' + data.h3Font + ' > 正文 ' + data.contentFont
    + ' / 正文 ' + data.contentFont + '·lh ' + data.contentLineHeight + ' / 段落 首行缩进 ' + data.paraTextIndent + '·段距 ' + data.paraMarginBottom
    + ' / chrow 28+12px / cinput 32 / rail-status visible 12px (worst-case capped, 3 buttons visible, min-panel 120 scrollable)'
    + ' / hint 行高 ' + data.hint.h + 'px vs 常量 ' + DRAWER_HINT_H_SRC
    + ' / ux064 home ' + data.u64.home.w + '×' + data.u64.home.h + '（cbody ' + data.u64.cbodyW + '）hero ' + data.u64.hero.w + ' pad ' + data.u64.heroPad
    + ' / quote ' + data.u64.quote.w + ' / cta ' + data.u64.ctaH + ' / pad ' + data.u64.homePad
    + ' / rows [' + data.u64.rows + '] cols [' + data.u64.cols + ']'
    + ' / deskline gap ' + data.u64.deskBottomGap + 'px（h ' + data.u64.deskH + '）'
    + ' / empty ghost ' + data.u64.empty.ghosts.map((g) => g.w + '×' + g.h).join(',') + ' / empty shelf ' + data.u64.empty.shelfH
    + ' / empty title ' + data.u64.empty.titleFont + ' / empty search ' + data.u64.empty.searchCount
    + ' / empty quote ' + data.u64.empty.quote.w + '×/border ' + data.u64.empty.quote.border + '/' + data.u64.empty.quote.dir + '/bg ' + data.u64.empty.quote.bg
    + ' / empty cover ' + data.u64.empty.cover.w + '×' + data.u64.empty.cover.h + ' / shelf dir ' + data.u64.empty.shelfDir
    + ' / shelf title ' + data.u64.empty.shelfTFont + ' · desc ' + data.u64.empty.shelfDFont
    + ' / ux063 drawer 420 + edge 48 + z 900<920<950'
    + ' / text-col ' + u63Rows.map((x) => x.c + '→' + x.textW).join(',')
    + ' / formula reserve ' + U63_FORMULA_RESERVE + ' vs measured margin '
    + u63Rows.map((x) => x.measuredMargin).join(',')
    + ' / handle >= ' + U63.handleMin + ': ' + u63Rows.filter((x) => x.handleMargin !== null).map((x) => x.c + '@' + x.handleMargin).join(','))
  process.exit(0)
} finally {
  try { fs.unlinkSync(tmp) } catch { /* ignore */ }
}
