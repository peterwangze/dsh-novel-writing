#!/usr/bin/env node
/**
 * scan-i18n-dead-keys.mjs — CLEAN-004 ⑤/H-2 评估用：清点 lib/client.js 里 **未被消费的 i18n 键**。
 *
 * 口径（单一事实源 = lib/client.js 自身的 zh/en 键表）：
 *   · 键表位置：`const LANG = { zh: { ... }, en: { ... } }` 里两个语言块的行首 `key:` 声明；
 *   · 消费位置：同一文件内除键表行之外的 `t('key')` / `t("key")` / `t('key', …)` 及其他引用形态；
 *   · 判定：某键在键表之外出现 0 次 ⇒ 「键表已声明、产品代码未消费」（H-2 清理对象候选）；
 *   · 反向自检（防恒真）：对已知在用键（entryLabel 等）与已知已删键（title 等）各做正/负对照。
 *
 * 只读脚本：不写任何文件；输出 JSON 到 stdout。
 * 用法：node scan-i18n-dead-keys.mjs [--json]
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CLIENT_SRC = join(dirname(dirname(dirname(HERE))), 'lib', 'client.js')
const src = readFileSync(CLIENT_SRC, 'utf8')
const lines = src.split('\n')

// 定位 LANG 块（zh/en 两个语言块）
const zhStart = lines.findIndex((l) => /^\s*zh:\s*\{/.test(l))
const enStart = lines.findIndex((l) => /^\s*en:\s*\{/.test(l))
if (zhStart < 0 || enStart < 0) { console.error('未定位到 LANG.zh / LANG.en 块（口径失效，需同步脚本）'); process.exit(2) }

/** 语言块内的行首键声明（含函数型 `key: (x) =>`）。 */
function keysIn(startLine) {
  const keys = []
  let depth = 0
  for (let i = startLine; i < lines.length; i += 1) {
    const line = lines[i]
    if (i === startLine) { depth = 1; continue }
    for (const ch of line) { if (ch === '{') depth += 1; else if (ch === '}') depth -= 1 }
    const m = /^\s{6,}([A-Za-z_][A-Za-z0-9_]*):\s/.exec(line)
    if (m !== null) keys.push({ key: m[1], line: i + 1 })
    if (depth <= 0) break
  }
  return keys
}

const zhKeys = keysIn(zhStart)
const enKeys = keysIn(enStart)

/** 消费计数：键名作为「字符串字面量」或「对象字面量键」出现；排除 LANG 键表区间的所有行。 */
function langBlockEnd(startLine) {
  let depth = 0
  for (let i = startLine; i < lines.length; i += 1) {
    for (const ch of lines[i]) { if (ch === '{') depth += 1; else if (ch === '}') depth -= 1 }
    if (i > startLine && depth <= 0) return i
  }
  return lines.length - 1
}
const langEnd = langBlockEnd(enStart)
function usageCount(key) {
  const literal = new RegExp("['\"]" + key + "['\"]", 'g')
  const member = new RegExp('(?:^|[\\s{,])' + key + '\\s*:', 'g')
  let n = 0
  for (let i = 0; i < lines.length; i += 1) {
    if (i >= zhStart && i <= langEnd) continue // LANG 键表区间整体排除（避免把邻键前缀当消费）
    const line = lines[i]
    const m1 = line.match(literal)
    if (m1 !== null) n += m1.length
    const m2 = line.match(member)
    if (m2 !== null) n += m2.length
  }
  return n
}

const all = [
  ...zhKeys.map((k) => ({ ...k, lang: 'zh' })),
  ...enKeys.map((k) => ({ ...k, lang: 'en' })),
]
const dead = []
for (const k of all) {
  const n = usageCount(k.key)
  if (n === 0) dead.push({ key: k.key, lang: k.lang, declLine: k.line })
}
const perKey = Object.fromEntries([...new Set(all.map((k) => k.key))].map((key) => [key, {
  usages: usageCount(key),
  zhLine: zhKeys.find((k) => k.key === key)?.line ?? null,
  enLine: enKeys.find((k) => k.key === key)?.line ?? null,
}]))

// 正/负对照（防恒真）：在用键必须 >0；历史已删键必须不存在于键表
const positiveControls = ['entryLabel', 'creationLabel', 'searchPh', 'plusTitle']
const negativeControls = ['title', 'openBtn', 'bindShort', 'continueBtn']
const controls = {
  positive: Object.fromEntries(positiveControls.map((k) => [k, perKey[k]?.usages ?? null])),
  negative: Object.fromEntries(negativeControls.map((k) => [k, perKey[k] === undefined ? 'absent' : perKey[k].usages])),
}
const zhSet = new Set(zhKeys.map((k) => k.key))
const enSet = new Set(enKeys.map((k) => k.key))
const pairMissingZh = [...enSet].filter((k) => !zhSet.has(k))
const pairMissingEn = [...zhSet].filter((k) => !enSet.has(k))

const out = {
  file: CLIENT_SRC,
  zhKeys: zhKeys.length, enKeys: enKeys.length,
  deadCount: dead.length, dead,
  pairing: { missingInZh: pairMissingZh, missingInEn: pairMissingEn },
  controls,
  ok: controls.positive.entryLabel > 0 && controls.negative.title === 'absent' && pairMissingZh.length === 0 && pairMissingEn.length === 0,
}
console.log(JSON.stringify(out, null, 2))
