/**
 * preset-projection.mjs — 预设行投影器（COMPAT-021；纯函数，零环境 IO）
 *
 * 职责（docs/COMPATIBILITY.md §4 目标 2.3 / §7）：把「基础行 + 代际差异」按
 * generation-manifest 投影成某一宿主代际的 `plugins[]`——
 *   · projectRows(generation, baseRows)：含/排 legacy dropped 行、variant 替换；输出**纯数据**
 *     （普通对象数组，行对象为克隆、不含 YAML 标签外的特殊形态），供预检与测试复用；
 *     未来 COMPAT-022 的运行期 provider 亦从此层取行（本任务不做 provider）。
 *   · dispositionFor(generation, name)：单行在某代的处置（keep/drop/replace + 原因），
 *     供预检的「代际处置」检查与 `--explain` 逐代解释。
 *   · reconcileDualSources(patchPlugins, legacyRows)：双源对账（§7.2 第 7 步）——0.1.x 源与
 *     0.2.x patch 行差 MUST 与 manifest 一致，否则产出 DUAL_SOURCE_DRIFT 问题单。
 *
 * fail-closed：generation 为 'unknown'（或未登记 id）时**不投影**——返回
 * `{ error: 'unknown-generation' }`，绝不静默按任何一代处理（RISK-C8）。
 *
 * 纯度：只 import ./generation-manifest.mjs（纯数据）；不做任何文件/进程/网络 IO。
 */
import {
  GENERATIONS, GENERATION_IDS, GENERATION_VARIANT, GENERATION_DROPPED, SOURCE_CHANNEL_DIFFERENCES,
} from './generation-manifest.mjs'

/** 「decl 系」代际 = 使用 cordis.patch.yml 真源的一侧（0.2.x 声明代）。 */
export function isDeclarationFamily(generation) {
  return generation === 'decl-0.2.0' || generation === 'decl-0.2.1' || generation === 'decl-0.2.2'
}

/** 「legacy 系」代际 = 使用 agent.cordis.yml 真源的一侧（0.1.x）。 */
export function isLegacyFamily(generation) {
  return generation === 'legacy-0.1'
}

/**
 * 单行处置（按代际 × 行包名；sourceFamily 供双源对账用）：
 * @returns {{ action: 'keep'|'drop'|'replace'|'fail-closed', replacementName?: string, reason: string }}
 *   keep        该代原生行（照常进入包存在性/exports/schema 检查）
 *   drop        该代不投影此行（0.2.x 源 MUST 不声明；在 0.1.x 源在场属合法 legacy-only 行）
 *   replace     该代用对侧变体包替换（同行换包名，config 保持）
 *   fail-closed unknown / 未登记代际——不判定（调用方 MUST 整体失败，不得逐行放行）
 */
export function dispositionFor(generation, name) {
  if (typeof generation !== 'string' || GENERATIONS[generation] === undefined || generation === 'unknown') {
    return { action: 'fail-closed', reason: 'unknown/未登记代际——fail-closed 不投影' }
  }
  if (name === GENERATION_DROPPED.name) {
    if (isLegacyFamily(generation)) {
      return { action: 'keep', reason: 'legacy-0.1 原生行：0.1.x 的 list_agents 由该独立子路径行注册（MUST 恰 1 行且 config 空）' }
    }
    return { action: 'drop', replacementName: GENERATION_DROPPED.replacementName, reason: '0.2.x 源 MUST 0 行（0.2.2 起子路径已从 exports 移除；0.2.2 请使用主包行，勿声明 ./list-agents）' }
  }
  if (name === GENERATION_VARIANT.legacy.name) {
    if (isLegacyFamily(generation)) return { action: 'keep', reason: 'legacy-0.1 原生变体行（dsh-workflow-worker-thread）' }
    return { action: 'replace', replacementName: GENERATION_VARIANT.current.name, reason: '0.2.x 闭包已无 dsh-workflow-worker-thread——对应行为 dsh-workflow-ptc' }
  }
  if (name === GENERATION_VARIANT.current.name) {
    if (isDeclarationFamily(generation)) return { action: 'keep', reason: 'decl 代原生变体行（dsh-workflow-ptc，provider:spawn）' }
    return { action: 'replace', replacementName: GENERATION_VARIANT.legacy.name, reason: '0.1.x 平面用 dsh-workflow-worker-thread（ptc 为 0.2.x 包）' }
  }
  return { action: 'keep', reason: '普通行（无代际特判）——由包存在性/exports/schema 检查覆盖' }
}

/** 深克隆纯数据（普通对象/数组/基元；YAML `!!js` 求值标记 `{ __jsExpr }` 是普通对象，原样保留）。 */
function cloneData(value) {
  if (Array.isArray(value)) return value.map(cloneData)
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) out[key] = cloneData(value[key])
    return out
  }
  return value
}

function projectList(generation, rows) {
  const out = []
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) { out.push(cloneData(row)); continue }
    if (row.group === true) {
      const groupRow = cloneData(row)
      if (Array.isArray(groupRow.config)) groupRow.config = projectList(generation, groupRow.config)
      out.push(groupRow)
      continue
    }
    const name = typeof row.name === 'string' ? row.name : ''
    const d = dispositionFor(generation, name)
    if (d.action === 'drop') continue
    if (d.action === 'replace' && typeof d.replacementName === 'string') {
      const replaced = cloneData(row)
      replaced.name = d.replacementName
      if (name === GENERATION_VARIANT.legacy.name) replaced.id = GENERATION_VARIANT.current.id
      else if (name === GENERATION_VARIANT.current.name) replaced.id = GENERATION_VARIANT.legacy.id
      out.push(replaced)
      continue
    }
    out.push(cloneData(row))
  }
  return out
}

/**
 * 把基础行投影成某代的 plugins[]。
 * @param {string} generation GENERATIONS 的 id
 * @param {Array} baseRows 基础行（通常 = 0.1.x 完整源或双源共享骨架；group 行递归投影其 config 子列表）
 * @returns {Array|{ error: string }} 投影后的普通对象数组；unknown/未登记代际 →
 *   `{ error: 'unknown-generation' }`（fail-closed，绝默默认代）；入参不是数组 → `{ error: 'invalid-base-rows' }`。
 */
export function projectRows(generation, baseRows) {
  if (typeof generation !== 'string' || GENERATIONS[generation] === undefined || generation === 'unknown') {
    return { error: 'unknown-generation' }
  }
  if (!Array.isArray(baseRows)) return { error: 'invalid-base-rows' }
  return projectList(generation, baseRows)
}

// ── 双源对账（§7.2 第 7 步；纯函数，问题单由调用方渲染）──────────────────────────

/** 稳定序列化（键排序；`{ __jsExpr }` 标记按数据比较——两侧字面量不同即差异，属白名单面）。 */
export function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort()
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}'
  }
  return JSON.stringify(value) ?? 'null'
}

/** 递归摊平行列表（group 行的 config = 子行数组）；保持先序顺序。 */
export function flattenRows(rows, out = []) {
  for (const row of rows ?? []) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) continue
    out.push(row)
    if (row.group === true && Array.isArray(row.config)) flattenRows(row.config, out)
  }
  return out
}

const rowKey = (row) => String(row?.id ?? '') + ':' + String(row?.name ?? '')

/** 行比较键（variant 两侧归一为 canonical 键；dropped 行由计数不变量单独看护，不进序列比较）。 */
function canonicalKey(row) {
  const key = rowKey(row)
  if (row?.name === GENERATION_VARIANT.legacy.name && row?.id === GENERATION_VARIANT.legacy.id) {
    return GENERATION_VARIANT.current.id + ':' + GENERATION_VARIANT.current.name
  }
  return key
}

/** 叶/group 行的「自身形状」比较面（group 的 config 子列表由递归摊平逐位比较，不入本面）。 */
function shapeOf(row) {
  const clone = {}
  for (const key of Object.keys(row ?? {})) {
    if (key === 'config') continue
    clone[key] = row[key]
  }
  return stableStringify(clone)
}

/** config 比较面：剔除源通道差异白名单键后比较（白名单差异另行校验片段命中；比较面与通道无关）。 */
function configComparable(row) {
  if (row?.config === undefined || row?.config === null || typeof row.config !== 'object' || Array.isArray(row.config)) {
    return stableStringify(row?.config)
  }
  const whitelist = SOURCE_CHANNEL_DIFFERENCES.find((w) => w.name === row.name)
  if (whitelist === undefined) return stableStringify(row.config)
  const clone = { ...row.config }
  const topKey = whitelist.key[1]
  delete clone[topKey]
  return stableStringify(clone)
}

/**
 * 双源对账：0.2.x patch 声明行 plugins 与 0.1.x legacy 源的行差 MUST 与 manifest 一致。
 * 不变量（COMPAT-020 方向性硬不变量的 manifest 单源化）：
 *   ① legacy 源恰 1 行 GENERATION_DROPPED.name 且 config 空/未声明；
 *   ② patch 源 0 行该名字（残留 = ERR_PACKAGE_PATH_NOT_EXPORTED 整棵失败）；
 *   ③ patch 源恰 1 行主包 GENERATION_DROPPED.replacementName（0.2.2+ 由它注册 list_agents）；
 *   ④ variant 成对：legacy 恰 1 行 worker-thread、patch 恰 1 行 ptc，且两侧 config ≡ manifest
 *      GENERATION_VARIANT.config；patch 出现 worker-thread / legacy 出现 ptc = 漂移；
 *   ⑤ 剔除上述已知差异后，两源摊平行序（canonical 键）与共享行 config 全等（唯一白名单 =
 *      SOURCE_CHANNEL_DIFFERENCES 的 skill-filesystem customSkillDirs，且片段 MUST 命中）。
 * @returns {{ ok: boolean, problems: Array<{ code: string, rowId?: string, name?: string, message: string }> }}
 */
export function reconcileDualSources(patchPlugins, legacyRows) {
  const problems = []
  const problem = (code, message, extra = {}) => problems.push({ code, message, ...extra })
  if (!Array.isArray(patchPlugins) || !Array.isArray(legacyRows)) {
    problem('DUAL_SOURCE_DRIFT', '双源输入不是行列表（无法对账）')
    return { ok: false, problems }
  }
  const patchFlat = flattenRows(patchPlugins)
  const legacyFlat = flattenRows(legacyRows)

  const legacyDropped = legacyFlat.filter((r) => r.name === GENERATION_DROPPED.name)
  const patchDropped = patchFlat.filter((r) => r.name === GENERATION_DROPPED.name)
  const patchReplacement = patchFlat.filter((r) => r.name === GENERATION_DROPPED.replacementName)
  if (legacyDropped.length !== 1) {
    problem('DUAL_SOURCE_DRIFT', `agent.cordis.yml MUST 恰 1 行 ${GENERATION_DROPPED.name}（实测 ${legacyDropped.length}——0 行 = 0.1.x 丢工具；>1 = 重复挂载）`, { name: GENERATION_DROPPED.name })
  } else {
    const cfg = legacyDropped[0].config
    const empty = cfg === undefined || cfg === null || (typeof cfg === 'object' && !Array.isArray(cfg) && Object.keys(cfg).length === 0)
    if (!empty) problem('DUAL_SOURCE_DRIFT', `legacy 行 ${GENERATION_DROPPED.name} config MUST 空/未声明（实测 ${stableStringify(cfg).slice(0, 120)}——删除行不得「借壳」承载配置）`, { name: GENERATION_DROPPED.name })
  }
  for (const row of patchDropped) {
    problem('DUAL_SOURCE_DRIFT', `cordis.patch.yml MUST 0 行 ${GENERATION_DROPPED.name}（残留即整棵预设激活抛 ERR_PACKAGE_PATH_NOT_EXPORTED——COMPAT-020 修复的那个故障；0.2.2 请使用主包行 ${GENERATION_DROPPED.replacementName}，勿声明 ./list-agents）`, { rowId: String(row.id ?? GENERATION_DROPPED.rowId), name: GENERATION_DROPPED.name })
  }
  if (patchReplacement.length !== 1) {
    problem('DUAL_SOURCE_DRIFT', `cordis.patch.yml MUST 恰 1 行主包 ${GENERATION_DROPPED.replacementName}（实测 ${patchReplacement.length}；0.2.2+ 由它注册 list_agents，替代被删子路径行）`, { name: GENERATION_DROPPED.replacementName })
  }

  const legacyVariantRows = legacyFlat.filter((r) => r.name === GENERATION_VARIANT.legacy.name)
  const patchVariantRows = patchFlat.filter((r) => r.name === GENERATION_VARIANT.current.name)
  const patchStrayLegacyVariant = patchFlat.filter((r) => r.name === GENERATION_VARIANT.legacy.name)
  const legacyStrayCurrentVariant = legacyFlat.filter((r) => r.name === GENERATION_VARIANT.current.name)
  if (legacyVariantRows.length !== 1) problem('DUAL_SOURCE_DRIFT', `agent.cordis.yml MUST 恰 1 行 ${GENERATION_VARIANT.legacy.name}（实测 ${legacyVariantRows.length}）`, { name: GENERATION_VARIANT.legacy.name })
  if (patchVariantRows.length !== 1) problem('DUAL_SOURCE_DRIFT', `cordis.patch.yml MUST 恰 1 行 ${GENERATION_VARIANT.current.name}（实测 ${patchVariantRows.length}）`, { name: GENERATION_VARIANT.current.name })
  for (const row of patchStrayLegacyVariant) {
    problem('DUAL_SOURCE_DRIFT', `cordis.patch.yml 出现 0.1.x 变体行 ${GENERATION_VARIANT.legacy.name}（0.2.x 源应声明 ${GENERATION_VARIANT.current.name}）`, { rowId: String(row.id ?? ''), name: row.name })
  }
  for (const row of legacyStrayCurrentVariant) {
    problem('DUAL_SOURCE_DRIFT', `agent.cordis.yml 出现 0.2.x 变体行 ${GENERATION_VARIANT.current.name}（0.1.x 源应声明 ${GENERATION_VARIANT.legacy.name}）`, { rowId: String(row.id ?? ''), name: row.name })
  }
  const wantVariantConfig = stableStringify(GENERATION_VARIANT.config)
  for (const [side, rows] of [['agent.cordis.yml', legacyVariantRows], ['cordis.patch.yml', patchVariantRows]]) {
    for (const row of rows) {
      if (stableStringify(row.config) !== wantVariantConfig) {
        problem('DUAL_SOURCE_DRIFT', `${side} 的代际变体行 ${row.name} config MUST ≡ manifest GENERATION_VARIANT.config ${wantVariantConfig}（实测 ${stableStringify(row.config)}）`, { rowId: String(row.id ?? ''), name: row.name })
      }
    }
  }

  // ⑤ 序列比较（canonical 键；dropped 行已由 ①② 计数看护，从 legacy 侧剔除后比较）
  const patchSeq = patchFlat.map(canonicalKey)
  const legacySeq = legacyFlat.filter((r) => r.name !== GENERATION_DROPPED.name).map(canonicalKey)
  if (patchSeq.join('|') !== legacySeq.join('|')) {
    const at = patchSeq.findIndex((k, i) => k !== legacySeq[i])
    const detail = at < 0 ? `行数差（patch ${patchSeq.length} / legacy ${legacySeq.length}）` : `第 ${at + 1} 行键差（patch "${patchSeq[at]}" / legacy "${legacySeq[at]}"）`
    problem('DUAL_SOURCE_DRIFT', `双源行序漂移（manifest 未登记的差异）：${detail}——唯一允许差异 = GENERATION_VARIANT（同行换包名）与 GENERATION_DROPPED（legacy-only 整行）`)
  } else {
    // 共享行 config/形状全等（白名单 = 源通道差异键）
    const patchMap = new Map(patchFlat.map((r) => [canonicalKey(r), r]))
    for (const row of legacyFlat) {
      if (row.name === GENERATION_DROPPED.name) continue
      const twin = patchMap.get(canonicalKey(row))
      if (twin === undefined) continue
      if (row.group === true || twin.group === true) {
        if (shapeOf(row) !== shapeOf(twin)) {
          problem('DUAL_SOURCE_DRIFT', `group 行形状漂移 ${rowKey(row)}（patch ${shapeOf(twin)} / legacy ${shapeOf(row)}）`, { rowId: String(row.id ?? ''), name: row.name })
        }
        continue
      }
      const wl = SOURCE_CHANNEL_DIFFERENCES.find((w) => w.name === row.name)
      if (configComparable(row) !== configComparable(twin)) {
        problem('DUAL_SOURCE_DRIFT', `共享行 config 漂移 ${rowKey(row)}（patch ${stableStringify(twin.config).slice(0, 160)} / legacy ${stableStringify(row.config).slice(0, 160)}）`, { rowId: String(row.id ?? ''), name: row.name })
      }
      if (wl !== undefined && Array.isArray(row.config?.[wl.key[1]]) && Array.isArray(twin.config?.[wl.key[1]])) {
        const legacyExpr = stableStringify(row.config[wl.key[1]])
        const patchExpr = stableStringify(twin.config[wl.key[1]])
        if (!legacyExpr.includes(wl.legacyExprIncludes) || !patchExpr.includes(wl.patchExprIncludes)) {
          problem('DUAL_SOURCE_DRIFT', `源通道差异白名单行 ${rowKey(row)} 的表达式未命中登记片段（legacy 需含 ${wl.legacyExprIncludes} / patch 需含 ${wl.patchExprIncludes}；实测 legacy ${legacyExpr.slice(0, 160)} / patch ${patchExpr.slice(0, 160)}）`, { rowId: String(row.id ?? ''), name: row.name })
        }
      }
    }
  }
  return { ok: problems.length === 0, problems }
}

/** `--explain` 用：某行在各代际的处置序列（纯数据）。 */
export function explainDispositions(name) {
  return GENERATION_IDS.map((id) => ({ generation: id, ...dispositionFor(id, name) }))
}
