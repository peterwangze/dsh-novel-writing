#!/usr/bin/env node
// UX-061 1b 状态色文本档对比度校验（可复跑）
//
// 口径（与迁移表 M-4 一致）：
//   文本令牌 = color-mix(in srgb, <state> 58%, var(--nv-fg))  —— 不透明通道线性加权
//   测量底色 = ① 纯表面 surface  ② chip 底 tint 8%（state 8% + surface）  ③ chip 底 tint 12%
//   对比度   = WCAG 2.x 相对亮度  (L1+0.05)/(L2+0.05)
//
// 输入值（内联；来源标注）：
//   亮态：surface #ffffff / fg #0f1115 / 宿主 state 亮值 #22c55e · #f59e0b · #ec1313
//   暗态：surface #232324（宿主 bg-layer-1）/ fg #f9fafb / state：success #22c55e、warn #f59e0b（宿主 static 值，暗态是否覆盖**待验证**）、error #f25a5a（宿主暗态 error-primary 实值）
// 任何输入值变更 MUST 同步迁移表 M-4。

const THEMES = {
  light: { surface: '#ffffff', fg: '#0f1115', states: { ok: '#22c55e', warn: '#f59e0b', err: '#ec1313' } },
  dark: { surface: '#232324', fg: '#f9fafb', states: { ok: '#22c55e', warn: '#f59e0b', err: '#f25a5a' } },
}
const MIX = 0.58
const BACKGROUNDS = [
  { name: 'surface', tint: 0 },
  { name: 'tint8%', tint: 0.08 },
  { name: 'tint12%', tint: 0.12 },
]

const hex = (h) => {
  const v = h.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}
const mix = (a, b, wa) => a.map((x, i) => Math.round(x * wa + b[i] * (1 - wa)))
const lum = ([r, g, b]) => {
  const f = (c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (fg, bg) => {
  const a = lum(fg), b = lum(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}
const toHex = (arr) => '#' + arr.map((x) => x.toString(16).padStart(2, '0')).join('')

const rows = []
let failures = 0
for (const [themeName, t] of Object.entries(THEMES)) {
  const surface = hex(t.surface)
  const fg = hex(t.fg)
  for (const [stateName, stateHex] of Object.entries(t.states)) {
    const state = hex(stateHex)
    const text = mix(state, fg, MIX)
    for (const bgSpec of BACKGROUNDS) {
      const bg = bgSpec.tint === 0 ? surface : mix(state, surface, bgSpec.tint)
      const r = +ratio(text, bg).toFixed(2)
      if (r < 4.5) failures++
      rows.push({ theme: themeName, token: `--nv-${stateName}-text`, bg: bgSpec.name, bgHex: toHex(bg), textHex: toHex(text), ratio: r, pass: r >= 4.5 })
    }
  }
}
console.table(rows)
console.log(`TEXT_TOKENS=${rows.length} BELOW_4.5=${failures}`)

// ── V-3（UX-061 1b-2，DR2/DR3 裁决）：--nv-fg-subtle 用于 <12px 信息文本不合规 ⟹ 三处改 --nv-fg-muted ──
// 输入值来源：宿主 static neutral（label-secondary 亮 #61666b / 暗 #cfd3d6；label-tertiary 亮 #81858c / 暗 #adb2b8）
// 承载底色：信息文本位于表面（surface）之上（srow-sub / cfound-title / cfold 均为透明底）。
const MUTED_FG = { light: '#61666b', dark: '#cfd3d6' }
const SUBTLE_FG = { light: '#81858c', dark: '#adb2b8' }
const v3rows = []
let v3fail = 0
for (const [themeName, t] of Object.entries(THEMES)) {
  const surface = hex(t.surface)
  for (const [tokenName, fgHex] of [['--nv-fg-muted', MUTED_FG[themeName]], ['--nv-fg-subtle（改前基线）', SUBTLE_FG[themeName]]]) {
    const r = +ratio(hex(fgHex), surface).toFixed(2)
    const enforced = tokenName === '--nv-fg-muted'
    if (enforced && r < 4.5) v3fail++
    v3rows.push({ theme: themeName, token: tokenName, bg: 'surface', bgHex: toHex(surface), textHex: fgHex, ratio: r, enforced, pass: r >= 4.5 })
  }
}
console.table(v3rows)
console.log(`FG_MUTED_ROWS=${v3rows.length} V3_BELOW_4.5=${v3fail}`)
process.exit(failures === 0 && v3fail === 0 ? 0 : 1)
