# CLEAN-014 实施证据：bar-geometry C5 判据形态感知刷新（COMPAT-023 R1-F1 移交）+ R2 N1 顺修

- 日期：2026-11-08 · 执行角色：Developer（triage = `.governance/change-triage/CLEAN-014.json`；裁决出处 = docs/review/COMPAT-023-R1.md §3 C5 裁决 A「判据过时，非产品回归」；N1 = docs/review/COMPAT-023-R2.md §5）
- 约束遵守：零 commit（Coordinator session clean014-dev 持锁）；零 `.governance/` 写入（工作树既有的 `tpa-last-run.json`/`plan-tracker.md.lock` 非本会话所为）；零 `package.json` 改动；`lib/` 零改动（git diff 佐证：仅 `scripts/probe-nv-bar-geometry.mjs` + `scripts/preflight-preset-rows.mjs`）；其余 6 判据（C1-C4/C6/C7）与其测量零改动；其它探针零改动
- 本目录产物：本 README + `probe/report.json` + 5 张截图（终跑，8/8 绿态）

## 1. 改动点

### 1.1 scripts/probe-nv-bar-geometry.mjs — C5 形态感知双臂

| 层 | 位置 | 内容 |
|---|---|---|
| 注释区 | L47-55（WIDE_VIEWPORT 头注） | 消除「参考视口非判据」与 C5 的表述张力：注明 CLEAN-014 起 chip/row **两形态均为 C5 判据形态（分臂断言）**，参考位（1800×900）保留为「零变化观测」对照而非暗示 chip 仅为参考形态；注明裁决出处（REVIEW-COMPAT-023-R1 §3 C5 = 裁决 A）与形态演进原因（UX-061 icon rail + UX-063 全屏工作台释放标题栏横向空间 ⇒ 1400×900 判据视口常态 chip；chip/row 分界点归设计所有 = NOTICE_INLINE_MAX + SplitWorkspace measure） |
| 测量层 MEASURE_JS | noticeShape（新） | 形态标记：**chip** = 类名 `nv-bar-note` ∧ 无 `.nv-notice-text` 文本子元素（几何旁证 w < barW/2，实测 77 ≪ 559）；**非 chip** = 类名 `nv-notice` ∧ 有 `.nv-notice-text` 子元素 ⇒ 取 `data-form`（短提示 'row'；长告警 'block'，非 C5 消费面）；两结构信号冲突 → `'ambiguous'`（fail-closed：C5 双臂均不过） |
| 测量层 MEASURE_JS | noticeTextLine | 补 `whiteSpace`（实测 chip='nowrap'、row 的 .nv-notice-text='pre-wrap'）；**line-height 不可算（chip 未声明 ⇒ computed 'normal'）时 lh/lines = null = 测量事实，不再视为测量失败** |
| 记录层 | measureScenario rec | 补 `noticeShape: m.noticeShape`（additive；`noticeForm`/`noticeTextLine`/`overflow` 等既有字段不动） |
| 判据层 | C5-short-compact | **形态感知双臂**：总谓词 = 每条记录按其 form 过对应臂。chip 臂 = `whiteSpace nowrap（CSS 构造性单行）∧ h≤32 ∧ 交集∅ ∧ 无截断 ∧ 文本逐字匹配`；row 臂 = `lines===1（.nv-notice-text line-height 16px 可算）∧ h≤32 ∧ 其余同 chip 臂`；ambiguous 双臂均不过。label 改「——两判据视口（chip/row 分界归设计所有）」；detail 每条记录标 form/h/w/lh/lines/ws/barW/dataForm/sum/truncated + 臂统计（chip 臂 n 条 / row 臂 m 条） |
| 注释区 | 参考视口测量处（原 L582 段） | 同步：CLEAN-014 起 chip 已是判据形态之一，参考位仍非判据（价值 = 宽栏「短提示不劣化/零变化」对照，与两判据视点分臂断言互补）；保留「先切宽栏再触发新短提示」实测纪律注 |
| 控制台读数 | scenarios/reference 两行 | 补 `形态=/lh=/ws=`（证据可读性；判据语义不变） |

**C1/C2/C3/C4/C6/C7 判据与其谓词、测量字段零改动**（git diff 仅触碰上述各处；C6 的 `noticeForm==='block' ∧ lines>=2` 原样）。

### 1.2 scripts/preflight-preset-rows.mjs — R2 N1 顺修

`--global-root` 闭包存在性校验（L109-111 族）并入 surfaces 守卫：`opts.surfaces !== true && opts.globalRoot !== null && …`——行级（真平面）模式校验位置与次序逐字节不变；`--surfaces` 模式不再触发（main() 先分发 surfacesMode，不读 globalRoot——面证据对账零宿主平面依赖）。与 R2-F3（`--patch/--legacy/--profile` 守卫）同族：surfaces fail-fast 仅对 surfaces 自身输入。

## 2. 落码前实测（先确认两形态可判特征，再写判据——P-01）

改码前先真跑**未改动**探针（0.2.2-rc.1 桌面 CLI = `D:\app\dsh\resources\runtime\cli\bin\dsh.cmd`，隔离根 `%TEMP%\ux060-probe-*`）：复现 R1 读数 7/8（C5 红，exit 1，红仅源自 1400×900 `lines=null`），并从 report.json 确认两形态实测可判特征：

| 特征 | S2-ok @1078×593（row） | S2-ok @1400×900（chip） |
|---|---|---|
| noticeClass / data-form | `nv-notice` / `row` | `nv-bar-note` / 无（null） |
| `.nv-notice-text` 子元素 | 有（span 承载文本） | **无**（测 chip 自身） |
| computed line-height / lines | 16px / 1 可算 | `'normal'` ⇒ lh=null / lines=null 不可算 |
| computed whiteSpace（测得 span） | pre-wrap（.nv-notice-text） | **nowrap**（chip CSS 声明） |
| 几何 | w=796 = barW 全宽（非 < barW/2） | w=77 ≪ barW/2=559（barW=1118） |
| 栏内 | 否（标题栏下流式行） | 是 |

⇒ 落码采用**双结构信号**（类名 ∧ 文本子元素在场性）为主判（确定性，源自产品 DOM 构造 lib/client.js L5042/L5080-5092），几何（w < barW/2）为旁证记入 detail；两信号冲突 fail-closed。

## 3. bar-geometry 双视口终跑（新判据，全部真跑）

- 隔离纪律（探针内建，与 COMPAT-023 §4.1 同款）：官方 CLI + `DSH_HOME` 重定向至 `mkdtemp` 临时根（containment 校验全真）；真实 `$DSH_HOME` 只读指纹前后逐项一致（C7 绿 = 零写入）；浏览器 env 原样 + `--user-data-dir` 落临时根；随机端口（本轮 56502）；token 全文脱敏（report.json `instanceUrlRedacted` = `token=***`，全文 0 处裸 token）；收尾 taskkill /T /F 只杀自启树（复核 0 残留进程）。
- **8/8 判据绿（exit 0）**：C1/C2/C3/C4/C5/C6/C7 全绿。口径说明：R1「7/8」按「6 条判据 + C5 两条视口记录 = 8 单元」计（C5@1078 绿、C5@1400 红）；本轮同口径 = 6 判据全绿 + C5 两视口记录双绿 = **8/8**。
- **C5 detail 全量（含 form/h/w/lh/lines）**：

```
1078x593: form=row h=29 w=796 lh=16 lines=1 ws=pre-wrap barW=796 dataForm=row sum=0 truncated=false
1400x900: form=chip h=15 w=77 lh=null lines=null ws=nowrap barW=1118 dataForm=null sum=0 truncated=false
｜臂统计：chip 臂 1 条 / row 臂 1 条（共 2）
```

- 其余判据读数（两视口一致）：C1 长 err 259 字逐字前缀+后缀+实质中段、无截断、textOverflow=clip、栏外；C2 交集 0（title/banner/ctl0-4 全 0）；C3 notice.y=37 ≥ bar.bottom；C4 不覆盖下方=true；C6 form=block lines=3/2（1078/1400）；C7 指纹一致。
- 参考视口 1800×900（非判据，零变化观测）：`cls=nv-bar-note/null 形态=chip rect w=110 h=15 lh=null ws=nowrap 交集=0 栏内=true`——宽栏 chip 零变化（与改码前基线跑读数一致）。
- 截图（本目录 `probe/`）：两视口 S1-err/S2-ok + 1800×900 S2-ok 共 5 张；完整读数 `probe/report.json`。

## 4. preflight 双向读数（N1，真跑）

| 命令 | 退出码 | 读数 |
|---|---|---|
| `--surfaces --global-root Z:\no-such` | **0** | 正常跑完 30 格：24 PASS + 6 WARN + 0 SKIP + 0 FAIL（WARN 全部 unknown 代 fail-closed，与基线同） |
| `--global-root Z:\no-such`（行级） | **2** | `[nv-compat] 用法错误（exit 2）：--global-root 目录缺少 @deepseek-ai 闭包：Z:\no-such`——行级行为不变 |
| `--surfaces`（pristine） | **0** | 汇总 total 30 \| pass 24 \| warn 6 \| skip 0 \| fail 0 |

## 5. 门禁读数（全部真跑）

| 门禁 | 结果 |
|---|---|
| `node --check scripts/probe-nv-bar-geometry.mjs` / `node --check scripts/preflight-preset-rows.mjs` | 0 错（×2） |
| `node test/smoke.mjs` | **SMOKE DONE: 342 passed, 0 failed**（exit 0） |
| `node test/preflight-preset-rows.test.mjs` | **PREFLIGHT TEST PASSED (16)**（exit 0；含 ⑥ surfaces 组与 R2 N1 注入可审计断言） |
| `node scripts/verify-contract-anchors.mjs` | 共 79 段；**FAIL = 0**；WARN = 24（与基线同） |

## 6. 偏离说明

1. **隔离实例通道**：任务书验证段附 Start-Process + 固定 `DSH_HOME=%TEMP%\dsh-O6knv8\dsh-compat-probe` + Playwright 的手动配方；本轮按探针脚本**内建隔离**（COMPAT-023 boot 统一模式：官方 CLI + mkdtemp 临时根 + CDP）真跑——与该配方同一隔离纪律（DSH_HOME 重定向/真实 home 只读指纹复核/token 脱敏/只杀自启树/浏览器 env 原样），且额外带 C7 零写入判据；落码前特征确认（§2）同样由真跑 report.json 取证，非静态推断。
2. **noticeShape 对长告警记录返回 'block'**（= data-form 事实值）而非任务书字面的 'chip'|'row' 二值：短提示测量标记仍严格 chip/row（C5 只消费这两种 + ambiguous fail-closed）；长告警（S1-err，非 C5 消费面）如实标记 block，避免报告事实失真。
3. **「8/8」口径**：探针 verdict 对象为 7 条（C1-C7）；8/8 按 R1 的「6 判据 + C5×2 视口记录」单元口径计（见 §3），C5 两记录双绿。
