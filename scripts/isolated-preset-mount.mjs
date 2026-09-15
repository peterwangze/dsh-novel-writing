#!/usr/bin/env node
/**
 * isolated-preset-mount.mjs — 隔离实例预设挂载冒烟（BUG-007；`DSH_HOME` 重定向到临时目录）
 *
 * 目标：把「插件同步预设 → 宿主加载**同步产物** → 组合进会话 system prompt」这条链在**隔离环境**
 * （环境变量重定向至临时目录）里端到端跑通，覆盖 BUG-007 的两条消费路径：
 *   ① 插件侧链（工作台「继续工作流／绑定新会话」→ `remote.agentPresets.select` → session resume）；
 *   ② 宿主预设切换器 / 预设预览应用路径（宿主读同一份 `$DSH_HOME/.agent-presets/novel-writing/agent.cordis.yml`
 *      后 apply loader entry）。
 * 两条路径在服务端**汇于同一处**（`@deepseek-ai/dsh-agent-presets` 的 `ensureStanding` → `mountPreset`）；
 * 差别只在客户端读取的报文字段——本脚本把两个字段都打出来：
 *   `error.message`       = 带 `agent-presets: preset "…" failed to mount:` 包装（路径 ① 的 UI 报文）
 *   `error.details.reason`= **原文**（路径 ② 的 toast 报文，宿主切换器读 details.reason）
 * 判定对象是**同步产物**（`$DSH_HOME/.agent-presets/novel-writing/agent.cordis.yml`，即宿主实际加载的那份），
 * 不是包内源文件——这证明「版本 bump 触发 `ensurePreset()` 重同步」这一步确实让宿主可见的副本变合法。
 *
 * 隔离与只读纪律（真实环境三选一之第一项；硬约束）：
 *   · 全部写入落在 `mkdtempSync(tmpdir())` 的临时根内：`DSH_HOME=<临时根>/dsh-home` 派生 profiles /
 *     `.agent-presets` / settings.yaml；宿主平面以**只读** junction 接入隔离 profile（不改宿主目录）；
 *   · `DSH_HOME` 越出临时根 ⇒ 拒绝执行（fail-closed，照 ci-mock-face.mjs L113-114 的路径包含性口径）；
 *   · 用户真实 `$DSH_HOME`（`~/.dsh`）**只读**：脚本记录其 `.agent-presets/novel-writing/` 的指纹
 *     （`.dsh-bundle-version` + agent.cordis.yml 的 sha256）并在收尾复核**未变**；不写、不删、不重建；
 *   · 变异实验只改**隔离根内**的同步副本，实验后按字节还原。
 *
 * 退出码：0 = 全部通过；1 = 有失败项（含变异实验未翻转）；2 = 环境/工具不可用（无宿主平面、宿主 launcher 不可解析等）。
 *
 * 用法：
 *   node scripts/isolated-preset-mount.mjs [--plane <node_modules>] [--keep] [--json-out <path>]
 *   --plane：显式宿主平面（默认自动定位 `$DSH_HOME` / `~/.dsh` 的 profile 平面，与加载器同源）。
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, realpathSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const PRESET_ID = 'novel-writing'
const PROFILE_NAME = 'nvbug007'
const results = []
const record = (name, ok, detail) => { results.push({ name, ok, detail }); return ok }
const die = (kind, msg) => { console.error(`[isolated-preset-mount] ${kind}：${msg}`); process.exit(2) }

function parseArgs(argv) {
  const opts = { plane: null, keep: false, jsonOut: null }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--plane') opts.plane = argv[++i]
    else if (a === '--keep') opts.keep = true
    else if (a === '--json-out') opts.jsonOut = argv[++i]
    else if (a === '--help' || a === '-h') opts.help = true
    else die('用法错误', '未知参数 ' + a + '（--help 查看用法）')
  }
  return opts
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex')
const pkgJson = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'))

/** 用户真实 `$DSH_HOME` 的**只读**指纹（收尾复核未变 ⇒ 真实环境零写入）。 */
function realEnvFingerprint(home) {
  const presetDir = join(home, '.agent-presets', PRESET_ID)
  const versionFile = join(presetDir, '.dsh-bundle-version')
  const composition = join(presetDir, 'agent.cordis.yml')
  return {
    home,
    presetDir,
    exists: existsSync(presetDir),
    bundleVersion: existsSync(versionFile) ? readFileSync(versionFile, 'utf8').trim() : null,
    compositionSha256: existsSync(composition) ? sha256(readFileSync(composition, 'utf8')) : null,
  }
}

/** 宿主平面定位（只读）：显式 `--plane` → `$DSH_HOME` profile → `~/.dsh` profile；与加载器同源。 */
function resolvePlane(explicit, env) {
  if (explicit !== null) {
    if (!existsSync(join(explicit, '@deepseek-ai'))) die('环境错误', `--plane 下没有 @deepseek-ai 目录：${explicit}`)
    return { nodeModules: explicit, scopeDir: join(explicit, '@deepseek-ai'), source: '--plane' }
  }
  const home = (env.DSH_HOME ?? '').trim() !== '' ? env.DSH_HOME : join(env.USERPROFILE ?? env.HOME ?? '', '.dsh')
  for (const [profileDir, source] of [[join(home, 'profiles', 'web'), 'DSH_HOME'], [join(home, 'profiles'), 'DSH_HOME'], [join(home, 'profiles', 'web'), '~/.dsh']]) {
    if (!existsSync(profileDir)) continue
    try {
      const resolved = createRequire(join(profileDir, 'index.js')).resolve('@deepseek-ai/dsh/package.json')
      // <plane>/@deepseek-ai/dsh/package.json → <plane>/@deepseek-ai
      return { nodeModules: dirname(dirname(resolved)), scopeDir: dirname(dirname(resolved)), source, dshPackageJson: resolved }
    } catch { /* 不是平面，试下一个候选 */ }
  }
  return null
}

/** 隔离 profile：宿主平面以只读 junction 接入，本仓以 junction 接入（均不改目标目录）。 */
function prepareIsolatedProfile(home, plane, compositionSrcVersion) {
  const profileDir = join(home, 'profiles', PROFILE_NAME)
  const nm = join(profileDir, 'node_modules')
  mkdirSync(nm, { recursive: true })
  const link = (target, path) => {
    const r = spawnSync('cmd', ['/c', 'mklink', '/J', path, target], { stdio: 'ignore' })
    if (r.status !== 0 && !existsSync(path)) die('环境错误', `junction 创建失败：${path} → ${target}`)
  }
  if (process.platform !== 'win32') die('环境错误', '本脚本当前仅在 Windows（mklink /J）下验证过；其他平台请改用符号链接并补证据')
  link(plane.scopeDir, join(nm, '@deepseek-ai'))
  link(REPO_ROOT, join(nm, 'dsh-novel-writing'))
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
    name: 'dsh-profile-' + PROFILE_NAME,
    private: true,
    dependencies: { 'dsh-novel-writing': 'link:' + REPO_ROOT },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-novel-writing'], patchReload: 'live' } },
  }, null, 2) + '\n')
  writeFileSync(join(profileDir, 'cordis.yml'), '[]\n')
  writeFileSync(join(profileDir, 'cordis.patch.yml'), '[]\n')
  return { profileDir, expectedBundleVersion: compositionSrcVersion }
}

/** 宿主 launcher 的 `runProfile`（dsh 包内 re-export shim；bin.js 用同一个）——按导出符号定位，改名即环境错误。 */
async function loadRunProfile(dshPackageJson) {
  const lib = join(dirname(dshPackageJson), 'lib')
  const fsMod = await import('node:fs')
  const candidate = fsMod.readdirSync(lib).filter((f) => /^profile-boot-.*\.js$/.test(f))
    .find((f) => fsMod.readFileSync(join(lib, f), 'utf8').includes('export { runProfile }'))
  if (candidate === undefined) die('工具与宿主失配', `dsh 包内未找到 re-export runProfile 的 profile-boot shim（${lib}）——宿主布局变更后需同步本脚本`)
  return (await import(pathToFileURL(join(lib, candidate)).href)).runProfile
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help === true) {
    console.log('用法：node scripts/isolated-preset-mount.mjs [--plane <node_modules>] [--keep] [--json-out <path>]')
    process.exit(0)
  }
  const realHomeEnv = (process.env.DSH_HOME ?? '').trim() !== '' ? process.env.DSH_HOME : join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
  const realBefore = realEnvFingerprint(realHomeEnv)
  const plane = resolvePlane(opts.plane, process.env)
  if (plane === null) die('环境错误', '宿主平面不可达（未找到可解析 @deepseek-ai/dsh 的 profile 平面）；用 --plane <node_modules> 显式指定')

  const root = mkdtempSync(join(tmpdir(), 'nv-bug007-'))
  const home = join(root, 'dsh-home')
  const isolated = { root, home }
  const containment = home.startsWith(root + sep) && home !== root
  if (!containment) { rmSync(root, { recursive: true, force: true }); die('隔离校验失败', 'DSH_HOME 不在临时根内（拒绝执行）') }
  process.env.DSH_HOME = home
  console.log('[isolated-preset-mount] 隔离环境（环境变量重定向至临时目录；真实 $DSH_HOME 只读）')
  console.log('  临时根 = ' + root)
  console.log('  DSH_HOME = ' + home + '（containment 校验：' + containment + '）')
  console.log('  宿主平面（只读 junction 接入）= ' + plane.nodeModules + '（来源 ' + plane.source + '）')
  console.log('  真实 $DSH_HOME 只读指纹 = ' + JSON.stringify({ exists: realBefore.exists, bundleVersion: realBefore.bundleVersion, sha256: realBefore.compositionSha256 === null ? null : realBefore.compositionSha256.slice(0, 12) }))
  mkdirSync(home, { recursive: true })
  prepareIsolatedProfile(home, plane, pkgJson.version)

  const report = { tool: 'isolated-preset-mount', isolation: { root, dshHome: home, plane: plane.nodeModules, realEnvReadOnly: realBefore }, checks: results, mount: null, mutation: null, jsonOut: opts.jsonOut }
  try {
    const appBoot = await import(pathToFileURL(join(plane.nodeModules, 'dsh-app-boot', 'lib', 'index.js')).href)
    const runProfile = await loadRunProfile(plane.dshPackageJson)
    const booted = await runProfile({
      environment: appBoot.loadLayeredEnv('dsh'),
      profile: PROFILE_NAME,
      fromDefaultProfile: undefined,
      patchFiles: [],
      args: ['--no-open', '--port', '0'],
    })
    const ctx = booted.ctx
    record('隔离实例启动（宿主 launcher 自身 runProfile；profile = ' + PROFILE_NAME + '，bundles 含 dsh-novel-writing）', ctx.get('loader') !== undefined && ctx.get('agentPresets') !== undefined,
      'loader=' + (ctx.get('loader') !== undefined) + ' agentPresets=' + (ctx.get('agentPresets') !== undefined))

    // ── 同步产物（宿主实际加载的那一份）────────────────────────────────────
    const presetDir = join(home, '.agent-presets', PRESET_ID)
    const syncedComposition = join(presetDir, 'agent.cordis.yml')
    const versionFile = join(presetDir, '.dsh-bundle-version')
    for (let i = 0; i < 60 && !existsSync(syncedComposition); i += 1) await new Promise((r) => setTimeout(r, 500))
    const syncedText = existsSync(syncedComposition) ? readFileSync(syncedComposition, 'utf8') : null
    const bundleVersion = existsSync(versionFile) ? readFileSync(versionFile, 'utf8').trim() : null
    record('插件 ensurePreset 同步生效（同步产物存在）：' + syncedComposition, syncedText !== null, 'bytes=' + (syncedText === null ? 0 : syncedText.length))
    record('重同步触发标记 .dsh-bundle-version ≡ package.json version（' + pkgJson.version + '）', bundleVersion === pkgJson.version, 'marker=' + bundleVersion)
    const syncedHasPrefix = syncedText !== null && /^ {4}prefix: \|-/m.test(syncedText)
    const syncedHasText = syncedText !== null && /^ {4}text: \|-/m.test(syncedText)
    record('同步产物的 persona 行键 = prefix（rc.2 schema 必填键）∧ 无旧键 text', syncedHasPrefix && !syncedHasText, 'prefix=' + syncedHasPrefix + ' text=' + syncedHasText)

    const mount = { attempts: [] }
    // 读「本预设自己的」system prompt 组合：经宿主导出的 livePresetMounts() 取该预设挂载的 fiber →
    // 其作用域 ctx 上注册的 systemPrompt（**不能**用新建同 key 作用域读——那会读到部署默认人设，
    // 即本脚本首轮跑出来的假阳性）。断言文本含本预设人设的开头标记（判别力：非默认人设）。
    const PERSONA_MARKER = '小说创作工作流'
    const tryMount = async (label) => {
      const agentPresets = ctx.get('agentPresets')
      const attempt = { label, ok: false, message: null, reason: null, personaSection: null }
      try {
        const key = await agentPresets.standingKeyFor(PRESET_ID)
        attempt.ok = true
        attempt.key = JSON.stringify(key)
        const presetMod = await import(pathToFileURL(join(plane.nodeModules, 'dsh-agent-presets', 'lib', 'index.js')).href)
        const standing = presetMod.livePresetMounts().find((m) => m.presetId === PRESET_ID)
        if (standing === undefined) attempt.personaSection = { present: false, reason: '宿主 livePresetMounts() 未记录本预设挂载' }
        else {
          // systemPrompt 的层表按**作用域键**索引（dsh-system-prompt：`layers = new ScopedLayers`，
          // `assemble({ scope })` 走 `chainLayers(scope)`）——必须传本预设挂载的 standing key；
          // 不带 scope 地 `assemble({})` 读到的是**部署默认人设**（首轮实测的假阳性，已由 isPresetPersona 判别）。
          const sp = ctx.get('systemPrompt')
          if (sp === undefined) attempt.personaSection = { present: false, reason: '进程内无 systemPrompt 服务' }
          else {
            const assembly = await sp.assemble({ scope: standing.key })
            const persona = assembly.sections.find((s) => s.name === 'deployment:persona-prefix')
            const text = persona === undefined ? '' : persona.text
            attempt.personaSection = {
              present: persona !== undefined,
              sectionCount: assembly.sections.length,
              bytes: text.length,
              isPresetPersona: text.includes(PERSONA_MARKER),
              sample: text.slice(0, 60),
            }
          }
        }
      } catch (error) {
        attempt.message = String((error && error.message) || error)
        attempt.reason = String((error && error.details && error.details.reason) || '')
      }
      mount.attempts.push(attempt)
      return attempt
    }

    // ── 路径 ①/②：宿主自身的 preset mount（服务端唯一汇合点）──────────────
    const roster = await ctx.get('agentPresets').list()
    const rosterRow = Array.isArray(roster) ? roster.find((p) => p.id === PRESET_ID) : undefined
    record('宿主预设名录（agentPresets.list → scanRoot/compositionProblem 健康判定）含 "' + PRESET_ID + '" 且无 broken 标记（= 切换器下拉的 roster 读取面）',
      rosterRow !== undefined && rosterRow.broken === undefined,
      'row=' + JSON.stringify(rosterRow === undefined ? null : { id: rosterRow.id, broken: rosterRow.broken ?? null, path: rosterRow.path }))
    const first = await tryMount('同步产物（修复后）')
    record('预设挂载成功：宿主 agentPresets.standingKeyFor("' + PRESET_ID + '")（= mountPreset → 路径 ① agentPresets.select/resume 与路径 ② 宿主切换器共用的服务端 mount）',
      first.ok, first.ok ? 'key=' + first.key : 'message=' + first.message)
    if (!first.ok) {
      console.error('  路径 ① 报文（error.message）=' + first.message)
      console.error('  路径 ② 报文（error.details.reason）=' + first.reason)
    }
    record('persona 正文进入会话 system prompt 的 deployment:persona-prefix 段（隔离实例实测；断言为本预设人设文本，非部署默认人设）',
      first.ok && first.personaSection !== null && first.personaSection.present === true && first.personaSection.isPresetPersona === true,
      JSON.stringify(first.personaSection))

    // ── 变异实验（只改隔离根内的同步副本）：prefix → text 必翻转，还原必复位 ──
    const mutated = syncedText === null ? null : syncedText.replace(/^ {4}prefix: \|-$/m, '    text: |-')
    const mutationApplied = mutated !== null && /^ {4}text: \|-/m.test(mutated) && !/^ {4}prefix: \|-/m.test(mutated)
    record('变异实验构造（隔离根内同步副本：persona 键 prefix → text）', mutationApplied, 'applied=' + mutationApplied)
    if (mutationApplied) {
      writeFileSync(syncedComposition, mutated)
      const failed = await tryMount('变异体（text 键）')
      const flipped = !failed.ok && /failed to apply loader entry persona/.test(failed.message) && /invalid config/.test(failed.message)
      record('变异实验红态：容器挂载被否决且报文含宿主原文 `failed to apply loader entry persona` + `invalid config`（路径 ① 报文 `error.message` / 路径 ② toast 原文 `error.details.reason`）',
        flipped, 'message=' + String(failed.message).split('\n').slice(0, 3).join(' ⏎ ') + ' || reason=' + String(failed.reason).split('\n').slice(0, 3).join(' ⏎ '))
      writeFileSync(syncedComposition, syncedText)   // 字节还原
      const restored = await tryMount('还原（prefix 键）')
      record('变异实验绿态复位：还原同步副本后挂载恢复成功 ∧ persona 段回到 system prompt（本预设人设文本）',
        restored.ok && restored.personaSection !== null && restored.personaSection.present === true && restored.personaSection.isPresetPersona === true,
        'ok=' + restored.ok + ' persona=' + JSON.stringify(restored.personaSection))
      report.mutation = { applied: true, red: { ok: failed.ok, message: failed.message, reason: failed.reason }, green: { ok: restored.ok, personaSection: restored.personaSection } }
    } else {
      report.mutation = { applied: false }
    }
    report.mount = { first: mount.attempts[0] ?? null }

    // ── 真实环境零写入复核（收尾）────────────────────────────────────────
    const realAfter = realEnvFingerprint(realHomeEnv)
    record('真实 $DSH_HOME 只读复核：.agent-presets/' + PRESET_ID + '/ 指纹与开跑前一致（零写入）',
      realAfter.exists === realBefore.exists && realAfter.bundleVersion === realBefore.bundleVersion && realAfter.compositionSha256 === realBefore.compositionSha256,
      'before=' + JSON.stringify({ v: realBefore.bundleVersion, sha: realBefore.compositionSha256 === null ? null : realBefore.compositionSha256.slice(0, 12) })
        + ' after=' + JSON.stringify({ v: realAfter.bundleVersion, sha: realAfter.compositionSha256 === null ? null : realAfter.compositionSha256.slice(0, 12) }))

    await booted.shutdown.shutdown(0)
  } finally {
    if (opts.jsonOut !== null) writeFileSync(opts.jsonOut, JSON.stringify(report, null, 2) + '\n')
    if (!opts.keep) rmSync(root, { recursive: true, force: true })
    else console.log('[isolated-preset-mount] --keep：临时根保留在 ' + root)
  }

  const failedChecks = results.filter((r) => !r.ok)
  console.log('\n[isolated-preset-mount] 检查项（隔离环境安装冒烟；真实 $DSH_HOME 只读）')
  for (const r of results) console.log('  ' + (r.ok ? '✅' : '❌') + ' ' + r.name + (r.ok ? '' : ' :: ' + r.detail))
  console.log(`[isolated-preset-mount] ${results.length - failedChecks.length}/${results.length} 项通过`)
  process.exit(failedChecks.length === 0 ? 0 : 1)
}


// ── 入口守卫（CLEAN-006 R1 F-12 / P-05）────────────────────────────────────────────────────
// 本脚本在被**直接执行**时才自举隔离实例（含子进程 / 临时目录 / 无头浏览器）；被 import() 时
// MUST NOT 产生任何副作用。判据 = process.argv[1] 解析后与本文件真实路径相同（**不用**
// import.meta.main——本运行时无该 API）。
const isDirectEntry = (() => {
  try {
    if (process.argv[1] === undefined || process.argv[1] === null) return false
    const self = realpathSync(fileURLToPath(import.meta.url))
    const arg = pathToFileURL(process.argv[1])
    return arg.protocol === 'file:' && realpathSync(fileURLToPath(arg)) === self
  } catch { return false }
})()
if (isDirectEntry) await main()
