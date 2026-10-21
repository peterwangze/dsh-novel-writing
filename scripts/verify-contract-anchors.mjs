#!/usr/bin/env node
/**
 * scripts/verify-contract-anchors.mjs — 契约行区间可复跑核验（只读；REVIEW-UX-061-R2 P1-3 引入）
 *
 * 为什么存在：REVIEW-UX-061-R1/R2 证明「人工抽几段看起来没问题」不能支撑全量结论——2.12 与 3.8
 * 的漂移都从 smoke ⑫b 的窄判据缝里逃逸（⑫b ②只要求区间内命中一个候选、③只拒注释空行、
 * ④只查终点截断）。本脚本用机器判据枚举**全部** range 形态条目并给出可复现结论。
 *
 * 判据（每条 range 段）：
 *   F1 起点行须命中该 item 的**主构造**（symbol 的首个标识符/引号串/函数名；严格面 face 2 不允许
 *      注释/空行起段；非严格面允许注释/空行起段但降为 WARN）。
 *   F2 区间内须至少命中 1 个 symbol 关键词（证据不能全部落在区间外——3.8 形态的直接成因）。
 *   F3 终点行不得为空行（WARN）或注释（WARN）；FAIL 仅保留给「起点未命中主构造」与「关键词零命中」。
 *   另输出 SUGGEST：该 item 主构造在文件中的所有行号，供人工重基时直接取用。
 *
 * 口径边界（如实披露，禁止据此宣布「无漂移」而不看输出）：
 *   - 关键词抽取与主构造识别为**启发式**，不是 AST；WARN 需人读，FAIL 是不可忽略的取证缺口。
 *   - 本脚本不接 CI、不改 smoke 判据（⑫b 增强归 1b/CLEAN-011）。
 *   - 文件数组（如 install.ps1/install.sh）按 ` / ` 段序映射；单文件多段共享同一文件。
 *
 * 用法：node scripts/verify-contract-anchors.mjs [--json] [--only-fail]
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTRACT = resolve(ROOT, 'lib/host-contract.mjs')
const argv = process.argv.slice(2)
const asJson = argv.includes('--json')
const onlyFail = argv.includes('--only-fail')

const STOP = new Set([
  'function', 'const', 'let', 'var', 'return', 'typeof', 'undefined', 'string', 'number', 'object',
  'required', 'improvable', 'awareness', 'adapted', 'consolidatable', 'native', 'with', 'from',
  'that', 'this', 'when', 'will', 'must', 'should', 'have', 'been', 'these', 'those', 'their',
  'there', 'which', 'line', 'file', 'item', 'face', 'symbol', 'note', 'incident', 'kind', 'name',
  'names', 'value', 'compat', 'dsh', 'into', 'only',
])

/** 抽取 symbol（缺失则整块）里的候选关键词与被反引号/引号标注的主构造 */
function analyze(entryText) {
  const sym = entryText.match(/symbol:\s*(['"])([\s\S]*?)\1\s*,\s*(?:file|line|necessity|incident|note)/)
  const src = sym ? sym[2] : entryText
  const keywords = new Set()
  const push = (t) => {
    const s = String(t).replace(/^[.:'"`]+|[.:'"`]+$/g, '')
    if (s.length >= 3 && !STOP.has(s.toLowerCase())) keywords.add(s)
  }
  for (const m of src.matchAll(/'([^']{2,80})'|"([^"]{2,80})"/g)) push(m[1] ?? m[2])
  for (const m of src.matchAll(/[A-Za-z_$][\w$]*(?:\/[A-Za-z_$][\w$]*)+/g)) for (const part of m[0].split('/')) push(part)
  for (const m of src.matchAll(/`([^`]{2,80})`/g)) push(m[1])
  for (const m of src.matchAll(/\.nv-[a-z0-9-]+|--(?:dsw|nv)-[a-z0-9-]+|[A-Za-z0-9_./-]+\.(?:ps1|sh|yml|json|mjs|js)|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+|[A-Za-z_$][\w$]{3,}/g)) {
    push(m[0])
    for (const part of m[0].split('.')) push(part)
  }
  // 主构造 = symbol 中第一个「函数调用式」标识符（name(）——只对声明式构造做起点强判据，
  // 避免把自然语言词（如 install.sh 的 profile）误当构造名而制造噪声（R2 方法要求的最小子集）。
  // 主构造判据（R2 要求的最小可信集）：仅接受「声明式」形态——
  //   ① function Name(  ② const/let/var Name  ③ 裸 Name()（空参调用，如 `findSidebarEl()`）
  // 不接受 ctx.get( / MutationObserver( 这类**方法/构造器调用**（它们不是被声明对象，会把噪声当漂移）。
  let primary = null
  const decl = src.match(/function\s+([A-Za-z_$][\w$]{2,})\s*\(/) || src.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]{2,})/)
  if (decl && !STOP.has(decl[1].toLowerCase())) primary = decl[1]
  if (!primary) {
    const bare = src.match(/([A-Za-z_$][\w$]{2,})\(\)/)
    if (bare && !STOP.has(bare[1].toLowerCase())) primary = bare[1]
  }
  return { keywords: [...keywords], primary }
}

function parseItems(text) {
  const items = []
  for (const chunk of text.split(/\r?\n(?=\s*\{ face: )/)) {
    if (!/\{ face: \d+/.test(chunk)) continue
    const face = Number(chunk.match(/face: (\d+)/)?.[1] ?? 0)
    const item = chunk.match(/item: '([^']+)'/)?.[1]
    const lineField = chunk.match(/line: (?:'([^']*)'|null)/)?.[1]
    if (!item || !lineField || !/L\d+/.test(lineField)) continue
    const fileBlock = chunk.match(/file: (\[[^\]]*\]|'[^']*')/)?.[1] ?? ''
    const files = [...fileBlock.matchAll(/'([^']+)'/g)].map((m) => m[1])
    const { keywords, primary } = analyze(chunk)
    items.push({ face, item, lineField, files, keywords, primary, necessity: chunk.match(/necessity: '([^']+)'/)?.[1] ?? '' })
  }
  return items
}

const cache = new Map()
const linesOf = (rel) => {
  if (!cache.has(rel)) {
    const p = resolve(ROOT, rel)
    cache.set(rel, existsSync(p) ? readFileSync(p, 'utf8').split(/\r?\n/) : null)
  }
  return cache.get(rel)
}
const isCommentOrBlank = (s) => {
  const t = (s ?? '').trim()
  return t === '' || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('#')
}

const rows = []
for (const it of parseItems(readFileSync(CONTRACT, 'utf8'))) {
  const segs = it.lineField.split(/\s*\/\s*/).filter((s) => /^L\d+(?:-L?\d+)?$/.test(s.trim()))
  segs.forEach((seg, i) => {
    const candFiles = it.files.length === 0 ? ['lib/client.js'] : (it.files.length === 1 ? [it.files[0]] : it.files)
    // 多文件条目（如 install.ps1/install.sh、host-boundary/index）：逐文件试算，任一命中即证据存在
    let file = candFiles[0], lines = linesOf(file), slice = '', hits = []
    for (const cf of candFiles) {
      const ls = linesOf(cf)
      const m0 = seg.match(/L(\d+)(?:\s*-\s*L?(\d+))?/)
      if (!ls || !m0) continue
      const sl = ls.slice(Number(m0[1]) - 1, Number(m0[2] ?? m0[1])).join('\n')
      const low = sl.toLowerCase()
      const h = it.keywords.filter((k) => low.includes(k.toLowerCase()))
      if (h.length > (hits.length)) { hits = h; file = cf; lines = ls; slice = sl }
    }
    const m = seg.match(/L(\d+)(?:\s*-\s*L?(\d+))?/)
    if (!lines || !m) {
      rows.push({ item: it.item, face: it.face, file, range: seg, verdict: 'SKIP（文件缺失/无法解析）' })
      return
    }
    const a = Number(m[1]); const b = m[2] ? Number(m[2]) : a
    slice = lines.slice(a - 1, b).join('\n')
    // 大小写不敏感：symbol 常写 marginLeft/width 这类驼峰词，源码可能以 applyMargin 形态出现
    hits = it.keywords.filter((k) => slice.toLowerCase().includes(k.toLowerCase()))
    const startLine = lines[a - 1]; const endLine = lines[b - 1]
    const fails = []; const warns = []
    if (it.primary) {
      const near = [-2, -1, 0, 1, 2].map((d) => (lines[a - 1 + d] ?? ''))
      if (!near.some((l) => l.toLowerCase().includes(it.primary.toLowerCase()))) {
        if (isCommentOrBlank(startLine) && it.face !== 2) warns.push('起点为注释/空行（非严格面历史形态）')
        else fails.push(`起点±2 行未命中主构造「${it.primary}」`)
      }
    } else if (hits.length > 0 && !hits.some((k) => (startLine ?? '').includes(k))) {
      warns.push('起点未直接命中关键词（无声明式主构造，仅提示）')
    }
    if (hits.length === 0) fails.push('区间内 symbol 关键词零命中（证据全在区间外）')
    if ((endLine ?? '').trim() === '') warns.push('终点为空行')
    else if (isCommentOrBlank(endLine)) warns.push('终点为注释')
    const suggest = it.primary
      ? lines.map((l, idx) => (l.includes(it.primary) ? idx + 1 : 0)).filter(Boolean).slice(0, 8)
      : []
    rows.push({
      item: it.item, face: it.face, file, range: `L${a}${b !== a ? '-' + b : ''}`,
      start: (startLine ?? '').trim().slice(0, 64), end: (endLine ?? '').trim().slice(0, 48),
      hits: hits.length, suggest,
      verdict: fails.length ? 'FAIL：' + fails.join(' + ') : (warns.length ? 'WARN：' + warns.join(' + ') : 'OK'),
      isFail: fails.length > 0,
    })
  })
}

const shown = onlyFail ? rows.filter((r) => r.verdict !== 'OK') : rows
const failCount = rows.filter((r) => r.isFail).length
const warnCount = rows.filter((r) => r.verdict.startsWith('WARN')).length
if (asJson) {
  console.log(JSON.stringify({ checked: rows.length, failed: failCount, warned: warnCount, rows }, null, 2))
} else {
  console.log('契约行区间核验（scripts/verify-contract-anchors.mjs，只读；启发式判据见文件头）')
  console.log('')
  console.log('| # | item | face | file | 声明区间 | 实测起点 | 实测终点 | 命中 | 主构造行号候选 | 判定 |')
  console.log('|---|------|------|------|----------|----------|----------|------|----------------|------|')
  shown.forEach((r, i) => console.log(`| ${i + 1} | ${r.item} | ${r.face} | ${r.file} | ${r.range} | ${r.start} | ${r.end} | ${r.hits} | ${r.suggest.join(',')} | ${r.verdict} |`))
  console.log('')
  console.log(`共 ${rows.length} 段；FAIL = ${failCount}；WARN = ${warnCount}`)
}
process.exit(failCount === 0 ? 0 : 1)
