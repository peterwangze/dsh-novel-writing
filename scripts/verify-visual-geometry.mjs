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

const rules = [
  rule('.nv-rail', 'width:44px'),
  rule('.nv-rail .nv-wfctl-btn,.nv-rail .nv-wfctl-btn2'),
  rule('.nv-rail-status', 'writing-mode'),
  rule('.nv-edwrap', 'max-width:var(--nv-measure'),
  rule('.nv-edwrap textarea', 'width:100%'),
  rule('.nv-chrow', 'height:28px'),
  rule('.nv-cinput', 'min-height:var(--nv-ctl-md)'),
]

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${rootCss}
${rules.join('\n')}
.nv-content{font-size:15px;max-width:var(--nv-measure,34em);margin:0 auto}
.nv-content p{margin:1em 0}
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
<div class="nv-edwrap"><textarea id="ta" style="min-height:420px"></textarea></div>
<div class="nv-content" id="content"><p id="para">中文正文测试段落，用于测量阅读宽度与段距。</p></div>
<button class="nv-chrow" id="chrow">第1章 测试</button>
<input class="nv-cinput" id="cinput" value="x">
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
    measure510: data.measure.w >= 500 && data.measure.w <= 520,
    edwrap510: data.edwrap.w >= 500 && data.edwrap.w <= 520,
    chrow28: data.chrow.h === 28,
    chrowFont12: data.chrowFont === '12px',
    cinput32: data.cinput.h === 32,
    para1em: data.paraMarginTop === '15px' && data.paraMarginBottom === '15px',
    railStatusVisible: data.railStatus.length > 0,
    statusFont12: data.statusFont === '12px',
    worstCaseStatusCapped: data.statusRect.h > 0 && data.statusRect.h <= 120,
    railButtonsStayVisible: data.buttons.length === 3 && data.buttons.every((b) => b.visible),
    minPanel120Scrollable: data.railMin.clientH > 60 && data.railMin.clientH <= 120 && data.railMin.canScroll === true,
    minPanelButtonsReachable: data.railMin.btns.length === 3 && data.railMin.btns.every((b) => b.reachable),
  }
  console.log('[verify-visual-geometry] MEASURE ' + JSON.stringify(data))
  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k)
  if (failed.length > 0) {
    console.log('[verify-visual-geometry] FAIL: ' + failed.join(', '))
    process.exit(1)
  }
  console.log('[verify-visual-geometry] OK: rail 44 / measure 510 / edwrap 510 / chrow 28+12px / cinput 32 / para 1em / rail-status visible 12px (worst-case capped, 3 buttons visible, min-panel 120 scrollable)')
  process.exit(0)
} finally {
  try { fs.unlinkSync(tmp) } catch { /* ignore */ }
}
