// CLEAN-004 返工（R2）可失败性机证 —— 从探针源**独立提取**共享谓词登记表并立即求值。
//
// R2 N-02 的指控：旧版从探针源抽取的是 `PREDICATES` 平行副本，**部署断言并不消费它** ⇒
// 「改部署面谓词 ⇒ ALL-PASS 不变」（审查者已注入式证明）。本脚本按两条腿收口：
//   ① **绑定检查（同源）**：登记表每条谓词 MUST 在探针源里有 `evalPred('<id>', …)` 消费点；
//      计数为 0 ⇒ EXIT 1。⇒ 谓词表达式若只写在部署处而不登记，或登记后无人消费，本检查即红。
//   ② **可失败性检查**：对同一 function 实例求值全部 `red*`（MUST false）与 `ok*`（MUST true）
//      向量，逐条打印；向量**全量求值**（按 `<prefix>\d*` 通配），`red3`/`red4` 不再被静默丢弃。
//
// 用法：node docs\evidence\CLEAN-004\falsifiability-check.mjs
// 退出码：0 = 全部谓词「绑定存在 ∧ 反例全红 ∧ 正例全真」；1 = 任一不满足；2 = 提取失败。
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const SRC = new URL('./probe-clean-004.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const src = readFileSync(SRC, 'utf8')
const sha256 = (t) => createHash('sha256').update(t).digest('hex')

// ── ① 提取共享谓词登记表 + 自证/部署消费函数 ──────────────────────────────────
const regStart = src.indexOf('const PREDICATE_REGISTRY = [')
if (regStart < 0) { console.error('EXTRACT-FAIL: PREDICATE_REGISTRY 块未找到'); process.exit(2) }
const regEnd = src.indexOf('// ── 子进程模式', regStart)
if (regEnd < 0) { console.error('EXTRACT-FAIL: 登记表块结束标记未找到'); process.exit(2) }
const fnStart = src.indexOf('function falsifiabilityReport(')
const fnEnd = src.indexOf('/** 运行期部署消费点台账', fnStart)
if (fnStart < 0 || fnEnd < 0) { console.error('EXTRACT-FAIL: falsifiabilityReport 块未找到'); process.exit(2) }
// 抽取块依赖探针顶部的 `sha256`（谓词源指纹）——按源内定义复刻，保持与探针同实现。
const block = "import { createHash } from 'node:crypto'\nconst sha256 = (t) => createHash('sha256').update(t).digest('hex')\n"
  + src.slice(regStart, regEnd) + '\n' + src.slice(fnStart, fnEnd)

// ── ② 绑定检查（同源）：登记谓词 MUST 有部署侧 `evalPred('<id>', …)` 消费点 ──────
const deployRegion = src.slice(src.indexOf('async function main('))
const callSiteIds = [...deployRegion.matchAll(/evalPred\('([^']+)'/g)].map((m) => m[1])
const registryIds = [...src.slice(regStart, regEnd).matchAll(/\n\s+id: '([^']+)',\n\s+finding:/g)].map((m) => m[1])
const unbound = registryIds.filter((id) => callSiteIds.indexOf(id) < 0)
const extra = [...new Set(callSiteIds)].filter((id) => registryIds.indexOf(id) < 0)
if (registryIds.length === 0) { console.error('EXTRACT-FAIL: 登记表 id 解析为 0 条（源结构变更需同步本脚本）'); process.exit(2) }

const mod = await import('data:text/javascript;base64,' + Buffer.from(block + '\nexport { PREDICATE_REGISTRY, falsifiabilityReport }\n').toString('base64'))
const rep = mod.falsifiabilityReport()

console.log('=== ① 同源绑定检查（登记表 ⇄ 部署断言消费点）===')
console.log('  登记表 sha256(块) = ' + sha256(src.slice(regStart, regEnd)).slice(0, 16) + '…')
console.log('  登记谓词 ' + registryIds.length + ' 条 · 部署 evalPred 调用点 ' + callSiteIds.length + ' 处')
for (const id of registryIds) {
  const n = callSiteIds.filter((x) => x === id).length
  console.log('  ' + (n >= 1 ? 'BOUND  ' : 'UNBOUND') + ' ' + id + '  callSites=' + n)
}
if (unbound.length > 0) console.log('  UNBOUND_IDS=' + JSON.stringify(unbound))
if (extra.length > 0) console.log('  EXTRA_IDS(部署消费了未登记 id)=' + JSON.stringify(extra))

console.log('')
console.log('=== ② 可失败性求值（red ⇒ false / ok ⇒ true，向量全量）===')
for (const r of rep.rows) {
  console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.id + '  [' + r.finding + ']  red=' + r.redCount + ' ok=' + r.okCount + ' fnSha256=' + r.fnSha256.slice(0, 12))
  for (const x of r.redResults) console.log('    red ' + x.vector + ': ' + JSON.stringify(x.result) + '  <= ' + x.note)
  for (const x of r.okResults) console.log('    ok  ' + x.vector + ': ' + JSON.stringify(x.result) + '  <= ' + x.note)
}
console.log('')
console.log('VECTOR-TALLY=' + JSON.stringify(rep.vectorTally) + '（实测求值：red ' + rep.vectorTally.red + ' / ok ' + rep.vectorTally.ok + '）')
console.log('ALL-PASS=' + rep.allPass)
const bindingOk = unbound.length === 0 && extra.length === 0
console.log('BINDING-OK=' + bindingOk)
const ok = rep.allPass === true && bindingOk === true
console.log('CHECK-' + (ok ? 'OK' : 'FAILED'))
// 自证方 MUST 全量求值：若登记表内向量数与实测求值数不符 ⇒ 静默丢弃
const declaredRed = (src.slice(regStart, regEnd).match(/\n\s{4}red\d*: \{/g) ?? []).length
const declaredOk = (src.slice(regStart, regEnd).match(/\n\s{4}ok\d*: \{/g) ?? []).length
console.log('DECLARED-VECTORS=' + JSON.stringify({ red: declaredRed, ok: declaredOk }) + ' vs EVALUATED=' + JSON.stringify(rep.vectorTally))
process.exit(ok && declaredRed === rep.vectorTally.red && declaredOk === rep.vectorTally.ok ? 0 : 1)
