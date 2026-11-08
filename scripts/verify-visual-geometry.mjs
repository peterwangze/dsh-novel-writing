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
// UX-066 R2（R1 P2-1）：根块在源码里是 JS 单引号字符串，字体栈写的是 \'Noto Serif SC\'。
// 注入 CSS 前必须还原 JS 求值结果（\\' → '），否则 CSS 会把 \' 当作标识符内的字面引号，
// 族名变成 "'Noto Serif SC'"，匹配不到已安装字体而回退 generic——测试保真缺陷。只做这一种
// 确定性反转义，不 eval 任意源码。
const rootCss = ':root{' + rootMatch[1].replace(/\\'/g, "'") + '}'
if (rootCss.includes("\\'")) throw new Error("rootCss still contains literal \\' escape after JS-unescape")
// 字体令牌语法守卫：族名只能是单/双引号字符串、合法标识符（可含空格/连字符），不允许残余
// 反斜杠转义或裸引号；--nv-prose-family 必须引用四族令牌之一。
const FONT_TOKENS = ['--nv-serif', '--nv-sans', '--nv-kai', '--nv-system']
for (const token of FONT_TOKENS) {
  const m = new RegExp(token + ':([^;}]+)[;}]').exec(rootCss)
  if (m === null) throw new Error('font token missing: ' + token)
  for (const rawFam of m[1].split(',')) {
    const fam = rawFam.trim()
    if (/^'[^'\\]+'$/.test(fam) || /^"[^"\\]+"$/.test(fam)) continue
    if (/^-?[A-Za-z_][A-Za-z0-9_-]*(?: [A-Za-z_][A-Za-z0-9_-]*)*$/.test(fam)) continue
    throw new Error('font token ' + token + ' has invalid family: ' + JSON.stringify(fam))
  }
}
const proseFamily = /--nv-prose-family:([^;}]+)[;}]/.exec(rootCss)
if (proseFamily === null || !/^var\(--nv-(?:serif|sans|kai|system)\)$/.test(proseFamily[1].trim())) {
  throw new Error('--nv-prose-family is not a valid font-token reference')
}

// ── UX-064 S2 R2：写作台几何（尺寸单一事实源 = .nv-split 上的 CSS 变量）──────────────
// 口径：抽屉宽/层级从 CSS 变量抽取（JS 已不再持有 DRAWER_W 等常量）；「让位公式」随旧像素
// 布局模型删除——抽屉宽 = min(--nv-drawer-w, 容器宽)，正文区 = 剩余宽度，二者由 CSS flex 决定。
const NV_DRAWER_W = Number((/--nv-drawer-w:(\d+)px/.exec(clientSrc) ?? [])[1])
const NV_DRAWER_Z = Number((/--nv-drawer-z:(\d+)/.exec(clientSrc) ?? [])[1])
// UX-064 S2 R3：稿纸下限/专注上限/抽屉模式阈值——全部从源码抽取（不复制常量）。
const NV_SHEET_MIN = Number((/--nv-sheet-min:(\d+)px/.exec(clientSrc) ?? [])[1])
const NV_FOCUS_W = Number((/--nv-focus-w:(\d+)px/.exec(clientSrc) ?? [])[1])
const DRAWER_SIDE_MIN_JS = Number((/const DRAWER_SIDE_MIN = (\d+)/.exec(clientSrc) ?? [])[1])
const DRAWER_SIDE_MIN_CSS = Number((/@container studio \(min-width:(\d+)px\)\{\.nv-split\[data-drawer=true\] \.nv-main/.exec(clientSrc) ?? [])[1])
if (!Number.isFinite(NV_DRAWER_W) || !Number.isFinite(NV_DRAWER_Z)
  || !Number.isFinite(NV_SHEET_MIN) || !Number.isFinite(NV_FOCUS_W)
  || !Number.isFinite(DRAWER_SIDE_MIN_JS) || !Number.isFinite(DRAWER_SIDE_MIN_CSS)) {
  console.log('[verify-visual-geometry] FAIL: S2 R3 抽屉/稿纸 CSS 变量或模式阈值缺失（--nv-drawer-w / --nv-drawer-z / --nv-sheet-min / --nv-focus-w / DRAWER_SIDE_MIN）')
  process.exit(1)
}
// 真实宿主侧栏展开后的实际容器宽（review §5.2：1680:1400 / 1440:1160 / 1152:872 /
// 1086:806 / 956:676 / 800:520）。合成容器只验证 CSS/几何，真实行为由探针证明。
const S2_CASES = [
  { vw: 1680, w: 1400 },
  { vw: 1440, w: 1160 },
  { vw: 1152, w: 872 },
  { vw: 1086, w: 806 },
  { vw: 956, w: 676 },
  { vw: 800, w: 520 },
].map((c) => ({ ...c, containerW: c.w - 2, narrow: c.w - 2 <= 760, side: c.w - 2 >= DRAWER_SIDE_MIN_JS }))
// review P1 的验收下限（真实容器）：956/1086/1152/1440/1680 ≥588；800 ≥420。
const S2_REQUIRED_FLOOR = { 1680: 588, 1440: 588, 1152: 588, 1086: 588, 956: 588, 800: 420 }
const U63_RULES = [rule('.nv-split', 'z-index:900'), rule('.nv-console', 'z-index:950')]
const u63StageHtml = ''

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
  // UX-066：正文/编辑器排版消费者（prose 令牌）+ 根属性覆盖块（从源码逐行抽取，不镜像）
  rule('.nv-prose .nv-content', 'font-family:var(--nv-prose-family)'),
  rule('.nv-prose .nv-content', 'font-size:var(--nv-prose-size)'),
  rule('.nv-prose .nv-content', 'line-height:var(--nv-prose-lh)'),
  rule('.nv-sheet-edit', 'font-family:var(--nv-prose-family)'),
  rule('.nv-sheet-edit', 'font-size:var(--nv-prose-size)'),
  rule('.nv-sheet-edit', 'line-height:var(--nv-prose-lh)'),
  ...clientSrc.split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith("':root[data-nv-font=\"") || l.startsWith("':root[data-nv-fs=\""))
    .map((l) => l.replace(/^'/, '').replace(/',?$/, '')),
  rule('.nv-content p', 'margin:0 0 .8em'),
  // DR1 P1-1：标题层级（h2 20 / h3 17 > 正文 16）——同样从源码抽取后实测 computed
  rule('.nv-content h2', 'font-size:'),
  rule('.nv-content h3', 'font-size:'),
  // UX-064 R2（S1 返工）：首页几何改由真实工作区结构量算（规则仍从源码抽取）
  ...UX064_HOME_CSS,
  ...BOOKS_HERO_CSS,
  ...U63_RULES,
  // UX-064 S2 R2：写作台几何（尺寸全部来自 .nv-split CSS 变量；容器查询）
  rule('.nv-split', 'container-type:inline-size'),
  rule('.nv-split', '--nv-bar-h:56px'),
  rule('.nv-bar', 'height:var(--nv-bar-h)'),
  rule('.nv-main', 'flex-direction:row'),
  rule('.nv-split[data-drawer=true] .nv-main', 'width:calc(100% - var(--nv-drawer-w))'),
  rule('.nv-paper-col', 'flex:1'),
  rule('.nv-paper-area', 'flex:1'),
  rule('.nv-sheet-wrap', 'justify-content:center'),
  rule('.nv-paper-top', 'height:34px'),
  rule('.nv-paper-actions', 'display:flex'),
  rule('.nv-railbar', 'width:var(--nv-rail-w)'),
  rule('.nv-railbar[data-collapsed=true]', 'width:var(--nv-rail-collapsed-w)'),
  rule('.nv-sheet', 'width:max(var(--nv-sheet-min),min(100%,var(--nv-sheet-max)))'),
  rule('.nv-split[data-focus=true] .nv-sheet', 'width:var(--nv-focus-w)'),
  rule('.nv-status', 'height:var(--nv-status-h)'),
  // 容器查询块（主断点）——从源码逐行抽取（@container 不能走 rule() 的单选择器解析）
  ...clientSrc.split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith("'@container"))
    .map((l) => l.replace(/^'/, '').replace(/',?$/, '')),
]

// UX-064 S2 R3：真实容器宽的写作台 fixture（base / focus / drawer / narrow-peek）。
// 只注入源码 CSS；rail 的窄态 collapsed / peek 是 React 派生结果，这里按设计状态显式标注。
function s2PaperHtml(prefix, vw) {
  return `<div class="nv-paper-col" id="${prefix}paper${vw}">
      <div class="nv-paper-area">
        <div class="nv-sheet-wrap" id="${prefix}wrap${vw}">
          <article class="nv-sheet" id="${prefix}sheet${vw}">
            <div class="nv-paper-top"><div class="nv-paper-crumb">第 1 章 / 2</div><div class="nv-paper-actions"><span class="nv-paper-words">88 字</span><span class="nv-paper-save">已保存</span><button type="button" class="nv-paper-btn nv-paper-aa">Aa</button><button class="nv-paper-btn">编辑</button></div></div>
            <div class="nv-sheet-scroll nv-scroll nv-prose" id="${prefix}scroll${vw}"><div class="nv-content" id="${prefix}content${vw}"><p>中文正文测试段落，用于测量稿纸内宽是否产生横向溢出；这一行故意写得比较长，模拟真实章节正文的换行行为与行宽约束。</p><p>第二段同样用于测量段距与行宽。</p></div></div>
            <div class="nv-sheet-foot">1 / 1</div>
          </article>
        </div>
      </div>
    </div>`
}
const S2_CASES_HTML = S2_CASES.map((c) => {
  const mode = c.side ? 'side' : 'overlay'
  const railAttr = c.narrow ? ' data-collapsed="true"' : ''
  const base = `<div class="nv-split" id="s2w${c.vw}" data-focus="false" style="position:relative;left:0;top:0;width:${c.w}px;height:840px;display:flex;flex-direction:column">
    <div class="nv-bar" id="s2bar${c.vw}"></div>
    <div class="nv-main" id="s2main${c.vw}"><aside class="nv-railbar" id="s2rail${c.vw}"${railAttr}></aside>${s2PaperHtml('s2', c.vw)}</div>
    <footer class="nv-status" id="s2status${c.vw}"></footer>
  </div>`
  const focus = `<div class="nv-split" id="s2f${c.vw}" data-focus="true" style="position:relative;left:0;top:0;width:${c.w}px;height:840px;display:flex;flex-direction:column">
    <div class="nv-bar" id="s2fbar${c.vw}"></div>
    <div class="nv-main" id="s2fmain${c.vw}">${s2PaperHtml('s2f', c.vw)}</div>
  </div>`
  const drawer = `<div class="nv-split" id="s2d${c.vw}" data-focus="false" data-drawer="true" data-drawer-mode="${mode}" style="position:relative;left:0;top:0;width:${c.w}px;height:840px;display:flex;flex-direction:column">
    <div class="nv-bar" id="s2dbar${c.vw}"></div>
    <div class="nv-main" id="s2dmain${c.vw}"><aside class="nv-railbar" id="s2drail${c.vw}" data-collapsed="true"></aside>${s2PaperHtml('s2d', c.vw)}</div>
    <footer class="nv-status" id="s2dstatus${c.vw}"></footer>
  </div>`
  const peek = c.narrow
    ? `<div class="nv-split" id="s2p${c.vw}" data-focus="false" style="position:relative;left:0;top:0;width:${c.w}px;height:840px;display:flex;flex-direction:column">
    <div class="nv-bar" id="s2pbar${c.vw}"></div>
    <div class="nv-main" id="s2pmain${c.vw}"><aside class="nv-railbar" id="s2prail${c.vw}" data-narrow="true" data-peek="true"></aside>${s2PaperHtml('s2p', c.vw)}</div>
  </div>`
    : ''
  return base + '\n' + focus + '\n' + drawer + '\n' + peek
}).join('\n')

// UX-066：排版 fixture（稿纸 450 / 680 两档；同页顺序切换 data-nv-font/data-nv-fs 后量算 computed）
// 正文 + textarea 共用 prose 令牌；长中文段落用于验证 15/18px 下 scrollWidth ≤ clientWidth。
const TYPO_TEXT = '中文正文测试段落用于验证写作排版在不同字体与字号下的换行与横向溢出行为这一行故意写得足够长以覆盖窄稿纸内的完整换行路径并检查行高与字号的联动变化第二段继续测量段落间距与实际行宽约束不产生任何横向滚动。'
// UX-066 R2（R1 P2-1）：四族 computed font-family 必须命中目标族名，且不得含单引号字面量
// （旧 fixture 的非法签名）。只断言字体栈语法/族名，不要求本机已安装字体文件。
const TYPO_FAMILY_TARGET = {
  serif: /Noto Serif|Songti|SimSun/i,
  sans: /Noto Sans|YaHei/i,
  kai: /Kaiti|STKaiti/i,
  system: /system-ui|Segoe|YaHei/i,
}
const TYPO_FIXTURE = [450, 680].map((w) => {
  const wrapW = w + 20
  return `<div class="nv-sheet-wrap" id="typoWrap${w}" style="width:${wrapW}px;--nv-sheet-min:420px;--nv-sheet-gap:10px">
    <article class="nv-sheet" id="typoSheet${w}" style="height:620px">
      <div class="nv-paper-top"><div class="nv-paper-crumb">第 1 章</div><div class="nv-paper-actions"><span class="nv-paper-save">已保存</span><button type="button" class="nv-paper-btn nv-paper-aa" id="typoAa${w}">Aa</button><button type="button" class="nv-paper-btn">编辑</button></div></div>
      <div class="nv-sheet-scroll nv-scroll nv-prose" id="typoScroll${w}"><div class="nv-content" id="typoContent${w}"><p>${TYPO_TEXT}</p><p>${TYPO_TEXT}</p><p>${TYPO_TEXT}</p></div></div>
      <textarea class="nv-sheet-edit" id="typoEdit${w}" style="height:110px;min-height:110px">${TYPO_TEXT}${TYPO_TEXT}</textarea>
    </article>
  </div>`
}).join('\n')

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
<!-- UX-064 S2 R2：z 三值共存锚点（抽屉 z 来自 CSS --nv-drawer-z；旧右缘 48px 手柄/提示行已删） -->
<div id="u63zdrawer" style="z-index:${NV_DRAWER_Z}"></div>
<div class="nv-split" id="u63zsplit"></div>
<div class="nv-console" id="u63zconsole"></div>
${u63StageHtml}
<!-- UX-064 S2 R3：真实容器宽六档（1680:1400 … 800:520）+ 专注 + 抽屉 side/overlay + 窄态 peek -->
${S2_CASES_HTML}
<!-- UX-066：写作排版 fixture（稿纸 450 / 680；按 data-nv-font/data-nv-fs 顺序量算 15/16/17/18） -->
${TYPO_FIXTURE}
<script>
const S2_CASES = ${JSON.stringify(S2_CASES)};
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
    s2: S2_CASES.map((c) => {
      const w = c.vw
      const split = document.getElementById('s2w' + w)
      const fs = document.getElementById('s2f' + w)
      const rr = (id) => {
        const el = document.getElementById(id)
        if (el === null) return null
        const b = el.getBoundingClientRect()
        return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.x), y: Math.round(b.y), right: Math.round(b.right), bottom: Math.round(b.bottom) }
      }
      const scroll = document.getElementById('s2scroll' + w)
      const sc = document.getElementById('s2content' + w)
      const focusScroll = document.getElementById('s2fscroll' + w)
      const sheetEl = document.getElementById('s2sheet' + w)
      const wrapEl = document.getElementById('s2wrap' + w)
      const paper = rr('s2paper' + w)
      const csWrap = getComputedStyle(wrapEl)
      const sheetMin = parseFloat(getComputedStyle(sheetEl).getPropertyValue('--nv-sheet-min'))
      const sheetMax = parseFloat(getComputedStyle(split).getPropertyValue('--nv-sheet-max'))
      const padL = parseFloat(csWrap.paddingLeft)
      const padR = parseFloat(csWrap.paddingRight)
      const paperContentW = Math.round(paper.w - padL - padR)
      const sheetExpected = Math.min(paperContentW, Math.max(sheetMin, Math.min(paperContentW, sheetMax)))
      // 专注：width = --nv-focus-w，max-width:100% 由可用宽收敛
      const fpaper = rr('s2fpaper' + w)
      const fwrap = document.getElementById('s2fwrap' + w)
      const fcsWrap = getComputedStyle(fwrap)
      const focusW = parseFloat(getComputedStyle(fs).getPropertyValue('--nv-focus-w'))
      const fContentW = Math.round(fpaper.w - parseFloat(fcsWrap.paddingLeft) - parseFloat(fcsWrap.paddingRight))
      const focusExpected = Math.min(focusW, fContentW)
      // 抽屉 fixture：side/overlay 由容器查询决定 .nv-main 宽度；drawerLeft = 宿主 viewArea 左缘
      const dsplit = document.getElementById('s2d' + w)
      const dsplitRect = rr('s2d' + w)
      const dmain = rr('s2dmain' + w)
      const dpaper = rr('s2dpaper' + w)
      const dsheetEl = document.getElementById('s2dsheet' + w)
      const dwrapEl = document.getElementById('s2dwrap' + w)
      const dcsWrap = getComputedStyle(dwrapEl)
      const dsheetMin = parseFloat(getComputedStyle(dsheetEl).getPropertyValue('--nv-sheet-min'))
      const dpaperContentW = Math.round(dpaper.w - parseFloat(dcsWrap.paddingLeft) - parseFloat(dcsWrap.paddingRight))
      const dsheetExpected = Math.min(dpaperContentW, Math.max(dsheetMin, Math.min(dpaperContentW, sheetMax)))
      const drawerW = parseFloat(getComputedStyle(dsplit).getPropertyValue('--nv-drawer-w'))
      const drawerLeft = c.side ? Math.round(dsplitRect.x + dsplitRect.w - drawerW) : Math.round(dsplitRect.x)
      let peek = null
      if (c.narrow === true) {
        const prailEl = document.getElementById('s2prail' + w)
        const psheetEl = document.getElementById('s2psheet' + w)
        const pwrapEl = document.getElementById('s2pwrap' + w)
        const pcsWrap = getComputedStyle(pwrapEl)
        const pmin = parseFloat(getComputedStyle(psheetEl).getPropertyValue('--nv-sheet-min'))
        const ppaper = rr('s2ppaper' + w)
        const pContentW = Math.round(ppaper.w - parseFloat(pcsWrap.paddingLeft) - parseFloat(pcsWrap.paddingRight))
        const pscroll = document.getElementById('s2pscroll' + w)
        const pcontent = document.getElementById('s2pcontent' + w)
        const pSplit = document.getElementById('s2p' + w)
        peek = {
          rail: rr('s2prail' + w),
          railPos: getComputedStyle(prailEl).position,
          sheet: rr('s2psheet' + w),
          sheetExpected: Math.min(pContentW, Math.max(pmin, Math.min(pContentW, sheetMax))),
          overflow: pSplit.scrollWidth > pSplit.clientWidth + 1,
          sheetScrollX: pscroll.scrollWidth > pscroll.clientWidth + 1,
          contentOverflowX: pcontent.scrollWidth > pcontent.clientWidth + 1,
        }
      }
      const dcontent = document.getElementById('s2dcontent' + w)
      return {
        vw: w,
        splitW: c.w,
        containerW: c.containerW,
        narrow: c.narrow,
        side: c.side,
        bar: rr('s2bar' + w),
        rail: rr('s2rail' + w),
        sheet: rr('s2sheet' + w),
        status: rr('s2status' + w),
        paper,
        content: rr('s2content' + w),
        padL,
        sheetMin,
        sheetMax,
        paperContentW,
        sheetExpected,
        paperHit: (() => {
          const b = split.querySelector('.nv-paper-btn:not(.nv-paper-aa)')
          const br = b.getBoundingClientRect()
          window.scrollTo(0, window.scrollY + br.top - 120)
          const r = b.getBoundingClientRect()
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b
        })(),
        paperAaHit: (() => {
          const b = split.querySelector('.nv-paper-aa')
          if (b === null) return false
          const br = b.getBoundingClientRect()
          window.scrollTo(0, window.scrollY + br.top - 120)
          const r = b.getBoundingClientRect()
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b
        })(),
        overflow: split.scrollWidth > split.clientWidth + 1,
        sheetScrollX: scroll.scrollWidth > scroll.clientWidth + 1,
        contentOverflowX: sc.scrollWidth > sc.clientWidth + 1,
        focus: {
          sheet: rr('s2fsheet' + w),
          expected: focusExpected,
          overflow: fs.scrollWidth > fs.clientWidth + 1,
          sheetScrollX: focusScroll.scrollWidth > focusScroll.clientWidth + 1,
          bar: rr('s2fbar' + w),
        },
        drawer: {
          main: dmain,
          rail: rr('s2drail' + w),
          sheet: rr('s2dsheet' + w),
          expected: dsheetExpected,
          mode: dsplit.getAttribute('data-drawer-mode'),
          expectedMode: c.side ? 'side' : 'overlay',
          drawerLeft,
          drawerW,
          overflow: dsplit.scrollWidth > dsplit.clientWidth + 1,
          sheetScrollX: document.getElementById('s2dscroll' + w).scrollWidth > document.getElementById('s2dscroll' + w).clientWidth + 1,
          contentOverflowX: dcontent.scrollWidth > dcontent.clientWidth + 1,
        },
        peek,
      }
    }),
    // UX-066：同一页顺序切换根属性后量算（默认 / serif15 / sans16 / kai17 / system18 × 稿纸 450/680）
    typo: (() => {
      const variants = [
        { font: 'serif', size: 15 },
        { font: 'sans', size: 16 },
        { font: 'kai', size: 17 },
        { font: 'system', size: 18 },
      ]
      const rows = []
      for (const v of variants) {
        document.documentElement.setAttribute('data-nv-font', v.font)
        document.documentElement.setAttribute('data-nv-fs', String(v.size))
        for (const w of [450, 680]) {
          const content = document.getElementById('typoContent' + w)
          const scroll = document.getElementById('typoScroll' + w)
          const edit = document.getElementById('typoEdit' + w)
          const ccs = getComputedStyle(content)
          const ecs = getComputedStyle(edit)
          rows.push({
            font: v.font, size: v.size, sheet: w,
            fontFamily: ccs.fontFamily, fontSize: ccs.fontSize, lineHeight: ccs.lineHeight,
            contentOverflow: content.scrollWidth > content.clientWidth + 1,
            scrollOverflow: scroll.scrollWidth > scroll.clientWidth + 1,
            editFontFamily: ecs.fontFamily, editFontSize: ecs.fontSize,
            editOverflow: edit.scrollWidth > edit.clientWidth + 1,
            contentW: Math.round(content.getBoundingClientRect().width),
          })
        }
      }
      document.documentElement.removeAttribute('data-nv-font')
      document.documentElement.removeAttribute('data-nv-fs')
      const dc = getComputedStyle(document.getElementById('typoContent450'))
      const de = getComputedStyle(document.getElementById('typoEdit450'))
      const btn = document.getElementById('typoAa450')
      const b0 = btn.getBoundingClientRect()
      window.scrollTo(0, window.scrollY + b0.top - 120)
      const br = btn.getBoundingClientRect()
      return {
        rows,
        defaultFontSize: dc.fontSize,
        defaultFontFamily: dc.fontFamily,
        defaultLineHeight: dc.lineHeight,
        defaultEditFontSize: de.fontSize,
        aa: {
          w: Math.round(br.width),
          h: Math.round(br.height),
          hit: document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2) === btn,
        },
      }
    })(),
    s2Collapsed: (() => {
      const el = document.getElementById('s2rail1152')
      el.style.transition = 'none'
      el.setAttribute('data-collapsed', 'true')
      const b = el.getBoundingClientRect()
      return { w: Math.round(b.width) }
    })(),
    s2Styles: (() => {
      const split = document.getElementById('s2w1152')
      const cs = getComputedStyle(split)
      return {
        containerType: cs.containerType,
        drawerW: cs.getPropertyValue('--nv-drawer-w').trim(),
        drawerZ: cs.getPropertyValue('--nv-drawer-z').trim(),
        sheetMin: cs.getPropertyValue('--nv-sheet-min').trim(),
        sheetMax: cs.getPropertyValue('--nv-sheet-max').trim(),
        focusW: cs.getPropertyValue('--nv-focus-w').trim(),
      }
    })(),
    u63: {
      zSplit: cs(document.getElementById('u63zsplit')).zIndex,
      zDrawer: cs(document.getElementById('u63zdrawer')).zIndex,
      zConsole: cs(document.getElementById('u63zconsole')).zIndex,
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
    // UX-064 S2 R3：真实容器宽写作台几何（顶栏 56 / rail 196↔48 / 稿纸下限 588·420 / 专注 ≤680 /
    // 抽屉 side↔overlay / 窄态 rail 覆盖 / 0 横向溢出）。阈值 = review P1 的实际验收下限。
    s2Bar56: data.s2.every((x) => x.bar.h === 56),
    s2Status40: data.s2.every((x) => x.status.h === 40),
    // 窄容器（≤760 内容宽）rail 自动收 48，不再消费 168/196；其余 196
    s2RailByContainer: data.s2.every((x) => x.rail.w === (x.narrow ? 48 : 196)),
    s2RailCollapsed48: data.s2Collapsed.w === 48,
    // 稿纸下限（真实容器）：1086/956 必须 ≥588；800 必须 ≥420（review §5.2 / §10）
    s2SheetFloor: data.s2.every((x) => x.sheet.w >= S2_REQUIRED_FLOOR[x.vw] - 1),
    // 弹性稿纸 = min(纸列有效宽, 680) 且不低于下限（文档流），与源码变量计算一致
    s2SheetFluid: data.s2.every((x) => Math.abs(x.sheet.w - x.sheetExpected) <= 2
      && x.sheet.w <= x.sheetMax && x.sheet.w <= x.paper.w),
    s2SheetFits: data.s2.every((x) => x.sheet.w <= x.paper.w && x.sheet.w <= x.paperContentW + 1),
    // 专注 = min(--nv-focus-w, 可用宽)（800 物理上限 498；不溢出）
    s2FocusCapped: data.s2.every((x) => x.focus.bar.h === 56
      && Math.abs(x.focus.sheet.w - x.focus.expected) <= 2 && x.focus.sheet.w <= x.focus.expected + 2),
    // 抽屉模式由容器内容宽判定：≥1280 side（1680），其余 overlay（1440/1152/1086/956/800）
    s2DrawerMode: data.s2.every((x) => x.drawer.mode === x.drawer.expectedMode
      && x.drawer.expectedMode === (x.containerW >= DRAWER_SIDE_MIN_JS ? 'side' : 'overlay')),
    // side：420 让位 + 稿纸不与抽屉相交
    s2DrawerSideNoIntersect: data.s2.filter((x) => x.side === true).length === 1
      && data.s2.filter((x) => x.side === true).every((x) => x.drawer.main.w <= x.containerW - x.drawer.drawerW + 2
        && x.drawer.sheet.right <= x.drawer.drawerLeft + 1
        && x.drawer.sheet.w >= 420),
    // overlay：main 恢复 100%（无 280 假挤压）；稿纸仍 ≥ 下限（只是被全幅面板覆盖）
    s2DrawerOverlayFull: data.s2.filter((x) => x.side !== true).length === 5
      && data.s2.filter((x) => x.side !== true).every((x) => x.drawer.main.w >= x.containerW - 1
        && x.drawer.sheet.w >= S2_REQUIRED_FLOOR[x.vw] - 1),
    // 窄态顶栏 toggle 展开 = 绝对定位覆盖层（196），稿纸不因展开而变窄（宽度只增不减）
    s2NarrowRailOverlay: data.s2.filter((x) => x.narrow === true).length === 2
      && data.s2.filter((x) => x.narrow === true).every((x) => x.peek !== null
        && x.peek.rail.w === 196 && x.peek.railPos === 'absolute'
        && x.peek.sheet.w >= x.sheet.w - 1
        && Math.abs(x.peek.sheet.w - x.peek.sheetExpected) <= 2
        && x.peek.sheet.w >= S2_REQUIRED_FLOOR[x.vw] - 1),
    s2NoOverflow: data.s2.every((x) => x.overflow === false && x.focus.overflow === false && x.drawer.overflow === false
      && (x.peek === null || x.peek.overflow === false)),
    s2NoHorizontalScroll: data.s2.every((x) => x.sheetScrollX === false && x.contentOverflowX === false
      && x.focus.sheetScrollX === false && x.drawer.sheetScrollX === false && x.drawer.contentOverflowX === false
      && (x.peek === null || (x.peek.sheetScrollX === false && x.peek.contentOverflowX === false))),
    s2PaperControlHit: data.s2.every((x) => x.paperHit === true && x.paperAaHit === true),
    // UX-066：排版默认 16/1.95；4 组字体/字号 × 450/680 稿纸 —— computed font-family/font-size 命中
    // 对应字体栈与字号，行高恒 1.95；正文/滚动容器/textarea 均无横向溢出；450 稿纸 Aa 可命中。
    typoDefault: data.typo.defaultFontSize === '16px'
      && Math.abs(parseFloat(data.typo.defaultLineHeight) - 31.2) <= 0.6
      && TYPO_FAMILY_TARGET.serif.test(data.typo.defaultFontFamily)
      && !data.typo.defaultFontFamily.includes("'")
      && data.typo.defaultEditFontSize === '16px',
    typoVariants: data.typo.rows.length === 8
      && data.typo.rows.every((r) => r.fontSize === r.size + 'px' && r.editFontSize === r.size + 'px')
      && data.typo.rows.every((r) => Math.abs(parseFloat(r.lineHeight) - r.size * 1.95) <= 0.6)
      // 四族目标 token 必须真实出现在 computed 栈（正文与 textarea 各自检查），且无单引号字面量
      && data.typo.rows.every((r) => TYPO_FAMILY_TARGET[r.font].test(r.fontFamily)
        && TYPO_FAMILY_TARGET[r.font].test(r.editFontFamily)
        && !r.fontFamily.includes("'") && !r.editFontFamily.includes("'")),
    typoNoOverflow: data.typo.rows.every((r) => r.contentOverflow === false && r.scrollOverflow === false && r.editOverflow === false),
    typoAaReachable: data.typo.aa.w > 0 && data.typo.aa.h > 0 && data.typo.aa.hit === true,
    // 模式阈值单一事实源：JS 常量 ≡ CSS 容器查询字面量；旧 max(280px) 假挤压不得回归
    s2DrawerThreshold: DRAWER_SIDE_MIN_JS === 1280 && DRAWER_SIDE_MIN_CSS === 1280
      && clientSrc.includes('@container studio (max-width:1279px){.nv-split[data-drawer=true] .nv-main{width:100%}}')
      && !clientSrc.includes('max(280px'),
    s2SingleControls: (clientSrc.match(/barButton\('nv-bar-focus'/g) ?? []).length === 1
      && (clientSrc.match(/className: 'nv-bar-ctl nv-bar-drawer'/g) ?? []).length === 1
      && clientSrc.includes("className: 'nv-bar-ctl-label' }, t('chatDrawer')")
      && !clientSrc.includes('nv-paper-focus')
      && !clientSrc.includes("className: 'nv-drawer-edge"),
    // 尺寸单一事实源：CSS 变量在 .nv-split 定义一次；JS 无 bar/status/rail/sheet 像素常量
    s2CssSingleSource: data.s2Styles.containerType === 'inline-size'
      && data.s2Styles.drawerW === '420px' && data.s2Styles.drawerZ === '920'
      && data.s2Styles.sheetMax === '680px' && data.s2Styles.focusW === '680px'
      && data.s2Styles.sheetMin === '588px'
      && !clientSrc.includes('const TITLE_BAR_H')
      && !clientSrc.includes('const STATUS_BAR_H')
      && !clientSrc.includes('const DRAWER_W =')
      && !clientSrc.includes('const LEFT_MIN =')
      && clientSrc.includes("cssVarNum('--nv-drawer-w')")
      && clientSrc.includes("rectOf('.nv-split .nv-bar')")
      && clientSrc.includes("rectOf('.nv-split .nv-status')"),
    // 容器查询为主断点（@container studio）；S2 布局不再依赖 viewport media
    s2ContainerQueries: (clientSrc.match(/@container studio /g) ?? []).length >= 7
      && clientSrc.includes('container-type:inline-size')
      && clientSrc.includes('@container studio (max-width:1279px)')
      && clientSrc.includes('@container studio (min-width:1280px)')
      && !/@media \(max-width:1400px\)\{\.nv-bar-banner/.test(clientSrc)
      && !/@media \(max-width:960px\)\{\.nv-railbar/.test(clientSrc)
      && !/@media \(max-width:1100px\)\{\.nv-bar-title/.test(clientSrc),
    // 宿主 chrome 边界：真实页眉下缘（DrawerHostAdapter 的 hostHeaderBottom 单一实现）
    s2HeaderAware: clientSrc.includes('hostHeaderBottom() {') && clientSrc.includes('top: this.hostHeaderBottom()')
      && clientSrc.includes("[data-conversation-header-leading]") && !clientSrc.includes('top: hr.bottom'),
    // 抽屉边界：top = 顶栏真实下缘；bottom = 状态栏真实上缘；side/overlay 分流（R3）
    s2DrawerBounded: clientSrc.includes('const bar = rectOf(\'.nv-split .nv-bar\')')
      && clientSrc.includes('const status = rectOf(\'.nv-split .nv-status\')')
      && clientSrc.includes('const containerW = Math.max(0, Math.round(colW) - 2)')
      && clientSrc.includes('const mode = drawerModeFor(containerW)')
      && clientSrc.includes('const inset = bar !== null ? Math.max(0, Math.round(bar.bottom - g.top)) : 0')
      && clientSrc.includes('const bottom = status !== null ? Math.round(status.top) : Math.round(g.bottom)')
      && clientSrc.includes("viewArea.style.top = inset + 'px'")
      && clientSrc.includes("viewArea.style.height = height + 'px'")
      && clientSrc.includes("viewArea.style.maxHeight = height + 'px'")
      && clientSrc.includes("viewArea.style.overflow = 'hidden'")
      && clientSrc.includes("viewArea.style.marginLeft = '0px'")
      && clientSrc.includes("viewArea.style.width = containerW + 'px'")
      && clientSrc.includes("const drawerW = clampNum(Math.round(wantW !== null ? wantW : colW), 0, Math.round(colW))"),
    // z 三值共存：.nv-split 900 < 抽屉 --nv-drawer-z 920 < .nv-console 950（CSS 单一来源）
    u63ZCoexist: data.u63.zSplit === '900' && data.u63.zDrawer === '920' && data.u63.zConsole === '950',
    u63DrawerWidthCss: data.s2Styles.drawerW === '420px' && data.s2Styles.drawerZ === '920',
  }
  console.log('[verify-visual-geometry] MEASURE ' + JSON.stringify(data))
  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k)
  if (failed.length > 0) {
    console.log('[verify-visual-geometry] FAIL: ' + failed.join(', '))
    process.exit(1)
  }
  console.log('[verify-visual-geometry] OK: rail 44 / measure ' + data.measure.w + ' (34em@16px, 断言 [512,576]) / edwrap ' + data.edwrap.w
    + ' / 正文文本宽 ' + data.contentTextW + '·编辑文本宽 ' + data.taTextW + '（±2 一致性）'
    + ' / 标题 h2 ' + data.h2Font + ' > h3 ' + data.h3Font + ' > 正文 ' + data.contentFont
    + ' / 正文 ' + data.contentFont + '·lh ' + data.contentLineHeight + ' / 段落 首行缩进 ' + data.paraTextIndent + '·段距 ' + data.paraMarginBottom
    + ' / chrow 28+12px / cinput 32 / rail-status visible 12px (worst-case capped, 3 buttons visible, min-panel 120 scrollable)'
    + ' / S2 R3 studio（真实容器）顶栏 ' + data.s2.map((x) => x.vw + ':' + x.bar.h).join(',')
    + ' 左栏 ' + data.s2.map((x) => x.vw + ':' + x.rail.w).join(',') + '（收起 ' + data.s2Collapsed.w + '）'
    + ' 稿纸 ' + data.s2.map((x) => x.vw + ':' + x.sheet.w + '/纸列' + x.paper.w).join(',')
    + ' 专注 ' + data.s2.map((x) => x.vw + ':' + x.focus.sheet.w).join(',')
    + ' 抽屉 ' + data.s2.map((x) => x.vw + ':' + x.drawer.expectedMode + '/' + x.drawer.main.w + '·稿纸' + x.drawer.sheet.w).join(',')
    + ' 窄栏覆盖 ' + data.s2.filter((x) => x.peek !== null).map((x) => x.vw + ':' + x.peek.rail.w + '/' + x.peek.railPos).join(',')
    + ' 状态栏 ' + data.s2.map((x) => x.vw + ':' + x.status.h).join(',')
    + ' 横向溢出 ' + data.s2.filter((x) => x.overflow || x.sheetScrollX || x.contentOverflowX || x.drawer.overflow).length
    + ' / CSS 单源 container=' + data.s2Styles.containerType + ' drawer=' + data.s2Styles.drawerW + ' z=' + data.s2Styles.drawerZ
    + ' sheetMin=' + data.s2Styles.sheetMin + ' sheetMax=' + data.s2Styles.sheetMax + ' focus=' + data.s2Styles.focusW
    + ' / mode threshold JS=' + DRAWER_SIDE_MIN_JS + ' CSS=' + DRAWER_SIDE_MIN_CSS
    + ' / ux064 home ' + data.u64.home.w + '×' + data.u64.home.h + '（cbody ' + data.u64.cbodyW + '）hero ' + data.u64.hero.w + ' pad ' + data.u64.heroPad
    + ' / quote ' + data.u64.quote.w + ' / cta ' + data.u64.ctaH + ' / pad ' + data.u64.homePad
    + ' / rows [' + data.u64.rows + '] cols [' + data.u64.cols + ']'
    + ' / deskline gap ' + data.u64.deskBottomGap + 'px（h ' + data.u64.deskH + '）'
    + ' / empty ghost ' + data.u64.empty.ghosts.map((g) => g.w + '×' + g.h).join(',') + ' / empty shelf ' + data.u64.empty.shelfH
    + ' / empty title ' + data.u64.empty.titleFont + ' / empty search ' + data.u64.empty.searchCount
    + ' / empty quote ' + data.u64.empty.quote.w + '×/border ' + data.u64.empty.quote.border + '/' + data.u64.empty.quote.dir + '/bg ' + data.u64.empty.quote.bg
    + ' / empty cover ' + data.u64.empty.cover.w + '×' + data.u64.empty.cover.h + ' / shelf dir ' + data.u64.empty.shelfDir
    + ' / shelf title ' + data.u64.empty.shelfTFont + ' · desc ' + data.u64.empty.shelfDFont
    + ' / ux063 z 900<' + data.u63.zDrawer + '<950'
    + ' / UX-066 排版 默认 ' + data.typo.defaultFontSize + '/' + data.typo.defaultLineHeight
    + ' 变体 ' + data.typo.rows.map((r) => r.font + r.size + '@' + r.sheet + ':' + r.fontSize).join(',')
    + ' 横向溢出 ' + data.typo.rows.filter((r) => r.contentOverflow || r.scrollOverflow || r.editOverflow).length
    + ' / 450 稿纸 Aa ' + (data.typo.aa.hit === true ? 'hit' : 'miss'))
  process.exit(0)
} finally {
  try { fs.unlinkSync(tmp) } catch { /* ignore */ }
}
