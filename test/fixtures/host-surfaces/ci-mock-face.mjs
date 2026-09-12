/**
 * ci-mock-face.mjs — ci.yml 宿主替身（mock）导出面 × 宿主表面 fixtures 对齐（COMPAT-003；C 部分 + F1 面钉共用）
 *
 * 背景：CI 的宿主替身（mock）是**手写**的宿主替身；若 mock 导出了真实宿主已删除的表面（如 settingsNamespace，
 * BUG-003 根因），插件代码在 CI 里假绿而实机启动崩溃——COMPAT-010 修正过该实例。本模块把「mock 导出面」
 * 与「fixtures 记录的真实宿主导出面」做成机检闭环，并提供 smoke 动态 import 所需的提取/落地能力。
 *
 * 职责（单一）：从 .github/workflows/ci.yml 提取内联 mock 源码/包壳 → 静态解析导出键集 → 与 fixtures + 契约比对。
 * 覆盖范围（COMPAT-011 C6）：契约 hostSurface.ciMock 声明的 **4/4** 个 mock（cordis / dsh-settings /
 * dsh-home-paths / dsh-tools；schemastery 无 mock，CI 装真包）。
 * 直接运行（CI sanity 步骤，离线、无依赖、不执行被测代码）：
 *   node test/fixtures/host-surfaces/ci-mock-face.mjs
 * 退出码：0 = 一致；1 = 不一致（列出差异）；2 = 输入缺失（ci.yml/fixture/包面/契约声明缺项）。
 *
 * 只读纪律：只读 ci.yml / fixtures / 契约；写操作仅发生在调用方显式给出的临时目录（smoke 用 mkdtemp）。
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { hostContract } from '../../../lib/host-contract.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..', '..', '..')
const CI_YML = join(REPO_ROOT, '.github', 'workflows', 'ci.yml')

/** 提取 YAML run 块内的 `cat > <target> <<'EOF' … EOF` heredoc：返回 target → 去公共缩进后的内容。 */
export function extractHeredocs(yamlText) {
  const out = new Map()
  const re = /^([ \t]*)cat > (\S+) <<'EOF'\n([\s\S]*?)\n[ \t]*EOF[ \t]*$/gm
  let m
  while ((m = re.exec(yamlText)) !== null) {
    const indent = m[1]
    const body = m[3].split('\n').map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l)).join('\n')
    out.set(m[2], body + '\n')
  }
  return out
}

/** 提取 `printf '<json>\n' > <target>` 形式的包壳（ci.yml 用 printf 写 mock 的 package.json）。 */
export function extractPrintfFiles(yamlText) {
  const out = new Map()
  const re = /^[ \t]*printf '([^']*)' > (\S+)[ \t]*$/gm
  let m
  while ((m = re.exec(yamlText)) !== null) out.set(m[2], m[1].replace(/\\n$/, ''))
  return out
}

/**
 * 静态解析 ESM 源码的导出键集（不含运行时求值）：export {…} / export class|const|let|var|function /
 * export default。与 smoke 的动态 import 结果互为独立证据（静态可进 CI sanity，动态可验运行时真值）。
 */
export function staticExportKeys(source) {
  const keys = new Set()
  const src = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
  for (const m of src.matchAll(/^export\s*\{([\s\S]*?)\}\s*(?:from\s*['"][^'"]+['"])?\s*;?\s*$/gm)) {
    for (const part of m[1].split(',')) {
      const t = part.trim()
      if (t === '') continue
      keys.add(t.split(/\s+as\s+/).pop().trim())
    }
  }
  for (const m of src.matchAll(/^export\s+(?:default\s+)?(?:class|const|let|var|function)\s+([A-Za-z_$][\w$]*)/gm)) keys.add(m[1])
  if (/^export\s+default\b/m.test(src)) keys.add('default')
  return [...keys].sort()
}

/** 契约声明的全部 CI mock 面（单一事实源 = 契约 hostSurface.ciMock 数组；COMPAT-011 C6 扩 4/4）。 */
export function mockFaces() {
  const version = hostContract.hostSurface.current
  const fixturePath = join(HERE, version + '.json')
  return hostContract.hostSurface.ciMock.map((m) => ({
    pkg: m.package,
    localName: m.package.replace('@deepseek-ai/', ''),
    version,
    fixturePath,
    heredocTarget: m.heredocTarget,
    expected: hostContract.hostSurface.requiredExports[m.package] ?? null,
  }))
}

/** 单个 mock 面的上下文（默认 dsh-settings——F1/COMPAT-010 原始诉求面）。 */
export function mockFaceContext(pkg = '@deepseek-ai/dsh-settings') {
  const face = mockFaces().find((f) => f.pkg === pkg)
  if (face === undefined) throw new Error('契约 hostSurface.ciMock 未声明该包：' + pkg)
  return face
}

/**
 * 把 ci.yml 内联 mock 落盘到给定目录（仅临时目录！）以便动态 import。
 * 返回 { written, files }：files = heredoc 目标路径 → 落盘绝对路径（供按面 import）。
 * 依赖解析：mock 源码 `import { Service } from '@deepseek-ai/cordis'` 由同目录 node_modules 下的 cordis 替身满足。
 */
export function materializeCiMocks(tmpDir) {
  const yml = readFileSync(CI_YML, 'utf8')
  const heredocs = extractHeredocs(yml)
  const shells = extractPrintfFiles(yml)
  // 按 ci.yml 原目标路径落到 tmpDir 下（保留 `node_modules/` 前缀——Node 包解析依赖该层级）
  const base = resolve(tmpDir)
  const files = new Map()
  const written = []
  for (const [target, content] of [...heredocs, ...shells]) {
    if (!target.startsWith('node_modules/@deepseek-ai/')) continue
    const abs = resolve(tmpDir, target)
    // C7③ 路径包含性：目标必须落在 tmpDir 之内（前缀过滤外的第二道收敛，防 `../` 越界写）
    if (abs !== base && !abs.startsWith(base + sep)) throw new Error('ci.yml heredoc 目标越出临时目录：' + target)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content.endsWith('\n') ? content : content + '\n')
    written.push(abs)
    if (heredocs.has(target)) files.set(target, abs)
  }
  return { written, files }
}

/** 动态 import 落地后的某个 mock 面，返回其运行时导出键集（排序）。未声明目标 → 结构化报错（C7①）。 */
export async function dynamicMockExportKeys(tmpDir, face = null) {
  const ctx = face ?? mockFaceContext()
  const { files } = materializeCiMocks(tmpDir)
  const entry = files.get(ctx.heredocTarget)
  if (entry === undefined || !existsSync(entry)) throw new Error('ci.yml 未找到 mock heredoc：' + ctx.heredocTarget)
  const mod = await import(pathToFileURL(entry).href)
  return { keys: Object.keys(mod).sort(), ctx }
}

// ── CLI：CI sanity 步骤（静态面：mock 源码 ↔ fixtures ↔ 契约逐面一致，COMPAT-011 C6 覆盖 4/4）──
function main() {
  if (!existsSync(CI_YML)) { console.error('missing ci.yml: ' + CI_YML); process.exit(2) }
  const faces = mockFaces()
  if (faces.length === 0) { console.error('契约 hostSurface.ciMock 为空'); process.exit(2) }
  const heredocs = extractHeredocs(readFileSync(CI_YML, 'utf8'))
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
  let failed = 0
  for (const ctx of faces) {
    if (!existsSync(ctx.fixturePath)) { console.error('missing fixture: ' + ctx.fixturePath); process.exit(2) }
    const source = heredocs.get(ctx.heredocTarget)
    if (source === undefined) { console.error('heredoc not found in ci.yml: ' + ctx.heredocTarget); process.exit(2) }
    if (!Array.isArray(ctx.expected) || ctx.expected.length === 0) { console.error('契约 requiredExports 未声明该 mock 的期望面：' + ctx.pkg); process.exit(2) }
    const mockKeys = staticExportKeys(source)
    const fixture = JSON.parse(readFileSync(ctx.fixturePath, 'utf8'))
    const pkgFace = fixture.packages?.[ctx.localName] // C7① fixture 缺包 → 结构化 exit 2（原为 TypeError）
    if (pkgFace === undefined || !Array.isArray(pkgFace.exports)) {
      console.error('fixture ' + ctx.version + ' 缺少包 ' + ctx.localName + '（或 exports 非数组）：' + ctx.fixturePath)
      process.exit(2)
    }
    const fixtureKeys = [...pkgFace.exports].sort()
    const expected = [...ctx.expected].sort()
    const hostHas = expected.every((k) => fixtureKeys.includes(k))
    console.log('[' + ctx.localName + '] mock 静态导出面: ' + JSON.stringify(mockKeys))
    console.log('  契约 requiredExports: ' + JSON.stringify(expected) + ' | ⊆ fixture ' + ctx.version + ' 宿主真实面: ' + String(hostHas) + ' ' + JSON.stringify(fixtureKeys))
    if (!same(mockKeys, expected) || !hostHas) {
      console.error('FAIL: ' + ctx.pkg + ' mock 面 ≠ 契约声明面/fixture 真实面（mock 漂移 = BUG-003 类假绿温床）')
      failed += 1
    }
  }
  if (failed > 0) process.exit(1)
  console.log('OK: ' + faces.length + '/' + faces.length + ' CI mock 面 ≡ 契约声明面 ⊆ fixture ' + faces[0].version + ' 宿主真实面（COMPAT-003 F1 面钉 / COMPAT-011 C6）')
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) main()
