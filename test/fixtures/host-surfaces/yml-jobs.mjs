/**
 * yml-jobs.mjs — ci.yml **job 段切分**共享纯函数（COMPAT-016 P3-4；先例 = 同目录 `ci-mock-face.mjs` 的 `extractHeredocs`）。
 *
 * 动因（收口 REVIEW-COMPAT-015-R1 P3-4）：`jobsStart` / `jobSection` / `cmdOf` 原在
 * `test/fixtures/host-surfaces/probe-face.mjs`（② 接线自断言 / ⑦ 变异负例）与 `test/smoke.mjs`（⑧b sanity 段绑定守卫）
 * **各写一份镜像**——两份语义等价，但**无任何交叉机检**：ci.yml 结构演化（job 键带引号 / 嵌套 / 缩进变化）时可能出现
 * 一侧红一侧绿，而「红的一侧是否正确地指示问题」无法由机检判定。抽为共享模块后两处 import **同一对象**，
 * 镜像面消除（口径一致性不再依赖人工同步）。
 *
 * 模块纪律（P-08 复用先例 + 可 import 性）：**纯函数模块**——不读文件、不写盘、不打印、零顶层副作用，故
 * `test/smoke.mjs` 可直接 import（**不**import 顶层脚本 `probe-face.mjs`：那会触发其全量机检并落临时目录）。
 *
 * 口径（与 `.github/workflows/ci.yml` 实状绑定，属「结构断言」而非 YAML 全解析）：
 *   · `jobsStart`：`jobs:` 行（0 缩进）之后的下标（无 `jobs:` ⇒ 0）；
 *   · `jobSection`：job 键 = **恰 2 空格缩进**且整行为 `  <name>:`；段 = 自该行起至**下一个 2 空格键行**或文件末；
 *   · `jobCmd`：run 行归一（trim + 剥 `run:` 前缀）——用于「命令是否落在某段内」的比对。
 * 边界如实披露：只认 2 空格无引号 job 键形态（带引号 / 更深缩进 ⇒ `jobSection` 返回 null ⇒ 调用方 fail-closed）。
 */

/** `jobs:` 段起始行号（`on:` 的子键与 job 键同为 2 空格缩进 ⇒ 必须从 `jobs:` 之后开始扫描）。 */
export function jobsStart(lines) {
  const i = lines.findIndex((l) => l === 'jobs:')
  return i < 0 ? 0 : i + 1
}

/** 某个 job 的 YAML 段（本 workflow 的 job 键 = 顶层缩进 2 空格；到下一个 job 键或文件末为止）。 */
export function jobSection(yml, job) {
  const lines = yml.split('\n')
  const start = lines.findIndex((l, i) => i >= jobsStart(lines) && l === '  ' + job + ':')
  if (start < 0) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[i])) { end = i; break }
  return lines.slice(start, end)
}

/** 命令归一：trim + 剥 `run:` 前缀（两种写法等价——块标量内独立一行、同一步骤的 `run:` 单行）。 */
export function jobCmd(line) {
  return line.trim().replace(/^run:\s*/, '')
}
