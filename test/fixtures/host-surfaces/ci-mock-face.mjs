/**
 * ci-mock-face.mjs — ci.yml 宿主替身（mock）导出面 × 宿主表面 fixtures 对齐（COMPAT-003；C 部分 + F1 面钉共用）
 *
 * 背景：CI 的 dsh-settings mock 是**手写**的宿主替身；若 mock 导出了真实宿主已删除的表面（如 settingsNamespace，
 * BUG-003 根因），插件代码在 CI 里假绿而实机启动崩溃——COMPAT-010 修正过该实例。本模块把「mock 导出面」
 * 与「fixtures 记录的真实宿主导出面」做成机检闭环，并提供 smoke 动态 import 所需的提取/落地能力。
 *
 * 职责（单一）：从 .github/workflows/ci.yml 提取内联 mock 源码/包壳 → 静态解析导出键集 → 与 fixtures + 契约比对。
 * 直接运行（CI sanity 步骤，离线、无依赖、不执行被测代码）：
 *   node test/fixtures/host-surfaces/ci-mock-face.mjs
 * 退出码：0 = 一致；1 = 不一致（列出差异）；2 = 输入缺失。
 *
 * 只读纪律：只读 ci.yml / fixtures / 契约；写操作仅发生在调用方显式给出的临时目录（smoke 用 mkdtemp）。
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
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

/** fixtures 路径 + 现行契约声明的 mock 目标面（供 CI 与 smoke 共用，单一事实源 = 契约 hostSurface）。 */
export function mockFaceContext() {
  const pkg = hostContract.hostSurface.ciMock.package
  const version = hostContract.hostSurface.current
  const fixturePath = join(HERE, version + '.json')
  return {
    pkg,
    version,
    fixturePath,
    expected: hostContract.hostSurface.requiredExports[pkg],
    heredocTarget: hostContract.hostSurface.ciMock.heredocTarget,
  }
}

/**
 * 把 ci.yml 内联 mock 落盘到给定目录（仅临时目录！）以便动态 import。返回 dsh-settings mock 的导入路径。
 * 依赖解析：mock 源码 `import { Service } from '@deepseek-ai/cordis'` 由同目录 node_modules 下的 cordis 替身满足。
 */
export function materializeCiMocks(tmpDir) {
  const yml = readFileSync(CI_YML, 'utf8')
  const heredocs = extractHeredocs(yml)
  const shells = extractPrintfFiles(yml)
  const ctx = mockFaceContext()
  if (!heredocs.has(ctx.heredocTarget)) throw new Error('ci.yml 未找到 mock heredoc：' + ctx.heredocTarget)
  // 按 ci.yml 原目标路径落到 tmpDir 下（保留 `node_modules/` 前缀——Node 包解析依赖该层级）
  const written = []
  for (const [target, content] of [...heredocs, ...shells]) {
    if (!target.startsWith('node_modules/@deepseek-ai/')) continue
    const abs = join(tmpDir, target)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content.endsWith('\n') ? content : content + '\n')
    written.push(abs)
  }
  return { entry: join(tmpDir, ctx.heredocTarget), written, ctx }
}

/** 动态 import 落地后的 mock，返回其运行时导出键集（排序）。 */
export async function dynamicMockExportKeys(tmpDir) {
  const { entry, ctx } = materializeCiMocks(tmpDir)
  const mod = await import(pathToFileURL(entry).href)
  return { keys: Object.keys(mod).sort(), ctx }
}

// ── CLI：CI sanity 步骤（静态面：mock 源码 ↔ fixtures ↔ 契约三方一致）────────────────
function main() {
  const ctx = mockFaceContext()
  if (!existsSync(CI_YML)) { console.error('missing ci.yml: ' + CI_YML); process.exit(2) }
  if (!existsSync(ctx.fixturePath)) { console.error('missing fixture: ' + ctx.fixturePath); process.exit(2) }
  const yml = readFileSync(CI_YML, 'utf8')
  const source = extractHeredocs(yml).get(ctx.heredocTarget)
  if (source === undefined) { console.error('heredoc not found in ci.yml: ' + ctx.heredocTarget); process.exit(2) }
  const mockKeys = staticExportKeys(source)
  const fixture = JSON.parse(readFileSync(ctx.fixturePath, 'utf8'))
  const fixtureKeys = [...(fixture.packages[ctx.pkg.replace('@deepseek-ai/', '')].exports ?? [])].sort()
  const expected = [...ctx.expected].sort()
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
  const ok = same(mockKeys, fixtureKeys) && same(mockKeys, expected)
  console.log('ci mock 导出面（' + ctx.pkg + '）: ' + JSON.stringify(mockKeys))
  console.log('fixture ' + ctx.version + ' 真实宿主导出面: ' + JSON.stringify(fixtureKeys))
  console.log('契约 hostSurface.requiredExports: ' + JSON.stringify(expected))
  if (!ok) {
    console.error('FAIL: mock 面 ≠ fixtures/契约（mock 漂移 = BUG-003 类假绿温床）')
    process.exit(1)
  }
  console.log('OK: ci.yml mock 导出面 ≡ fixtures ' + ctx.version + ' ≡ 契约声明面（COMPAT-003 F1 面钉）')
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) main()
