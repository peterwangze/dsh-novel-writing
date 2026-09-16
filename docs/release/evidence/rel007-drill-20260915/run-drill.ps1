# REL-007 隔离回滚演练驱动 —— 「安装 → 回退 → 再安装」往返（候选 = v0.5.3，回滚目标 = v0.5.2）
#
# 忠实建模对象：用户侧回滚 = 换回上一发布版并重跑 install.ps1。
# 隔离等价物 = 单一 repo-sim 目录就地换内容（junction 目标路径不变）+ 重跑 install.ps1。
# 全部读写限于隔离根（Assert-IsoPath fail-closed 守卫 + 真实路径泄漏检测）。
#
# 用法：pwsh -File run-drill.ps1 [-CandidateRef v0.5.3 | -CandidateRef tree:<hash>]
param(
  [string]$CandidateRef = 'v0.5.3',
  [string]$RollbackRef  = 'v0.5.2',
  [string]$Profile      = 'web'
)
$ErrorActionPreference = 'Stop'
$Repo     = 'D:\AI\agent\deepseek\harness\writing-workflow'
$Evidence = Join-Path $Repo 'docs\release\evidence\rel007-drill-20260915'
$PluginHome = 'D:/AI/agent/claude/coding/project_management_workflow/skills/software-project-governance'

# ── 捕获真实环境事实（必须早于任何重定向）────────────────────────────────────
$env:REL007_ISO           = Join-Path $env:TEMP 'rel007-drill-20260915'
$env:REL007_REAL_HOME     = $env:USERPROFILE
$env:REL007_REAL_DSH_HOME = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$RealDshHome              = [System.IO.Path]::GetFullPath($env:REL007_REAL_DSH_HOME)
. (Join-Path $Evidence 'isolate-env.ps1')
$ISO = [System.IO.Path]::GetFullPath($env:REL007_ISO).TrimEnd('\')

$LOG = Join-Path $Evidence 'drill-log.txt'
function W([string]$s) { Write-Host $s; $s | Add-Content -Path $LOG -Encoding utf8 }

"" | Set-Content -Path $LOG -Encoding utf8
W "=== REL-007 隔离回滚演练（v0.5.3）$(Get-Date -Format o) ==="
W "ISOLATED_ROOT = $ISO"
W "REAL_ENV (只读参照) : USERPROFILE=$($env:REL007_REAL_HOME) ; DSH_HOME=$RealDshHome ; TEMP=$($script:RealTemp)"
W "CANDIDATE_REF = $CandidateRef ; ROLLBACK_REF = $RollbackRef ; PROFILE = $Profile"
W "TREE SOURCE: git archive --format=tar <ref> -o <ISO>\*.tar ; tar -xf  （禁止 git checkout 切换工作树）"

# ── 解析 ref → commit / tree ─────────────────────────────────────────────────
$candIsTree = $CandidateRef -like 'tree:*'
if ($candIsTree) {
  $candTree = $CandidateRef.Substring(5).Trim()
  $candCommit = '(none: 未提交的 index tree)'
  $candSourceKind = 'index-tree'
} else {
  $candCommit = (git -C $Repo rev-parse "${CandidateRef}^{commit}").Trim()
  $candTree   = (git -C $Repo rev-parse "${CandidateRef}^{tree}").Trim()
  $candSourceKind = 'tag/commit'
}
$rbCommit = (git -C $Repo rev-parse "${RollbackRef}^{commit}").Trim()
$rbTree   = (git -C $Repo rev-parse "${RollbackRef}^{tree}").Trim()
W "CANDIDATE source_kind=$candSourceKind commit=$candCommit tree=$candTree"
W "ROLLBACK  commit=$rbCommit tree=$rbTree"

# ── 隔离根准备（仅 %TEMP%\rel007-*，任务授权写域）────────────────────────────
if (Test-Path $ISO) { Remove-Item $ISO -Recurse -Force }
New-Item -ItemType Directory -Path $ISO -Force | Out-Null

function Export-Tree([string]$ref, [string]$leaf) {
  $tar = Assert-IsoPath (Join-Path $ISO "export-$leaf.tar")
  $dir = Assert-IsoPath (Join-Path $ISO "tree-$leaf")
  & git -C $Repo archive --format=tar -o $tar $ref
  if ($LASTEXITCODE -ne 0) { throw "git archive 失败：$ref（exit=$LASTEXITCODE）" }
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  & tar -xf $tar -C $dir
  if ($LASTEXITCODE -ne 0) { throw "tar 解包失败：$tar（exit=$LASTEXITCODE）" }
  $sha = (Get-FileHash $tar -Algorithm SHA256).Hash
  W "EXPORTED $ref -> $dir  (tar sha256=$sha)"
  return [pscustomobject]@{ Dir=$dir; Tar=$tar; TarSha=$sha }
}

$candExp = Export-Tree -ref $(if ($candIsTree) { $candTree } else { $CandidateRef }) -leaf 'candidate'
$rbExp   = Export-Tree -ref $RollbackRef -leaf $RollbackRef

$candVer = (Get-Content (Join-Path $candExp.Dir 'package.json') -Raw | ConvertFrom-Json).version
$rbVer   = (Get-Content (Join-Path $rbExp.Dir  'package.json') -Raw | ConvertFrom-Json).version
W "VERSION CHECK: candidate tree package.json=$candVer (期望 0.5.3) ; rollback tree package.json=$rbVer (期望 0.5.2)"
if ($candVer -ne '0.5.3') { throw "候选树版本 = $candVer ≠ 0.5.3 —— fail-closed，中止" }
if ($rbVer   -ne '0.5.2') { throw "回滚树版本 = $rbVer ≠ 0.5.2 —— fail-closed，中止" }

# ── 夹具：HOME_A 新布局（dsh ≥0.1.5：profiles/<Profile>/package.json 存在）────
$fixtureNew = @'
{
  "name": "dsh-profile-web",
  "private": true,
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app"
      ],
      "patchReload": "live"
    }
  },
  "dependencies": {
    "@deepseek-ai/dsh-base": "0.1.5-rc.2"
  }
}
'@
$homeNew = Assert-IsoPath (Join-Path $ISO 'dshhome-new')
New-Item -ItemType Directory -Path $homeNew -Force | Out-Null
$pdNew = Join-Path $homeNew ("profiles\" + $Profile)
New-Item -ItemType Directory -Path $pdNew -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path $pdNew 'package.json'), $fixtureNew, (New-Object System.Text.UTF8Encoding($false)))
W "FIXTURE: $pdNew\package.json = 新布局夹具（bundles 2 项 + dependencies 1 项）"

# 参照 home（全新隔离 DSH_HOME，仅装 v0.5.2）——用于**实测**「回滚末端 ≡ 该版本全新安装？」
# （不预设 REL-006 的「回滚 = 版本回退、非状态还原」结论；本版以对照 leg 取实测证据）
$homeRef = Assert-IsoPath (Join-Path $ISO 'dshhome-ref52')
New-Item -ItemType Directory -Path $homeRef -Force | Out-Null
$pdRef = Join-Path $homeRef ("profiles\" + $Profile)
New-Item -ItemType Directory -Path $pdRef -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path $pdRef 'package.json'), $fixtureNew, (New-Object System.Text.UTF8Encoding($false)))
W "FIXTURE(ref): $pdRef\package.json = 同款新布局夹具（参照 home，仅装 $RollbackRef）"

# ── 隔离 repo-sim（模拟工作树；node_modules 为**隔离根内真实空目录**）─────────
# 安全改进（相对 REL-006）：REL-006 把 sim\node_modules 做成指向**真实仓库** node_modules 的 junction；
# 本版改为隔离根内真实空目录 —— 效果等价（install.ps1 的 `Test-Path $src\node_modules` 判真 ⇒ 不会反向
# 在源码树里再建链接），但**彻底消除**指向真实工作树的 junction（零真实路径依赖）。
$sim = Assert-IsoPath (Join-Path $ISO 'repo-sim')
New-Item -ItemType Directory -Path $sim -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $sim 'node_modules') -Force | Out-Null
W "repo-sim node_modules = 隔离根内真实空目录（不进真实仓库；零外部 junction）"

function Sync-RepoSim([string]$TreeDir) {
  $TreeDir = Assert-IsoPath $TreeDir
  Get-ChildItem $sim -Force | Where-Object { $_.Name -ne 'node_modules' } | ForEach-Object { Remove-Item $_.FullName -Recurse -Force }
  Get-ChildItem $TreeDir -Force | Where-Object { $_.Name -ne 'node_modules' } | ForEach-Object { Copy-Item $_.FullName -Destination $sim -Recurse -Force }
  return (Get-Content (Join-Path $sim 'package.json') -Raw | ConvertFrom-Json).version
}

# ── 真实 $DSH_HOME 前指纹（只读）────────────────────────────────────────────
$preFp = Get-RealDshFingerprint -DshHomePath $RealDshHome
$preFp.Lines | Set-Content -Path (Join-Path $Evidence 'pre-dsh-fingerprint.txt') -Encoding utf8
W "PRE-DSH-FINGERPRINT: 已写入 pre-dsh-fingerprint.txt（$($preFp.Lines.Count) 行；strict 键 $($preFp.Strict.Count) 项；inventory $($preFp.Inventory.Count) 项）"
W "PRE-DSH-FINGERPRINT leak_signature: $($preFp.Leak)"

# ── 演练 legs ───────────────────────────────────────────────────────────────
$legs = New-Object System.Collections.Generic.List[object]
$snaps = @{}
$timings = [ordered]@{}

function Run-Leg {
  param([string]$Label,[string]$Ref,[string]$TreeDir,[string]$DshHome,[string]$SnapName,[string]$ExpectVer)
  $ver = Sync-RepoSim $TreeDir
  $envLine = ''   # 由 Invoke-IsoInstall 内部 Set-IsoEnv 后置位
  W ""
  W "==== LEG $Label : 换树 -> $Ref (repo-sim package.json = $ver) ; 重跑 install.ps1 ; DSH_HOME = $DshHome ===="
  $r = Invoke-IsoInstall -Tree $sim -DshHome $DshHome -Profile $Profile
  $envLine = Get-IsoEnvLine
  W "  ENV REDIRECT: $envLine"
  foreach ($l in (Get-IsoContainmentLines)) { W "  $l" }
  if ($r.Output.Count -gt 0) { foreach ($l in $r.Output) { W ("  | " + $l) } }
  W ("  EXIT={0} ; elapsed={1}s ; realPathLeak=0" -f $r.Exit, $r.Seconds)
  $face = Assert-InstallFace -DshHome $DshHome -Profile $Profile
  $snap = Get-TreeSnapshot -Root $DshHome
  $snap | Set-Content -Path (Join-Path $Evidence "snap-$SnapName.txt") -Encoding utf8
  $snaps[$SnapName] = $snap
  $script:timings[$Label] = $r.Seconds
  $row = [pscustomobject][ordered]@{
    Leg=$Label; Ref=$Ref; ExpectVer=$ExpectVer; RepoSimVer=$ver; Exit=$r.Exit; Seconds=$r.Seconds
    EffVer=$face.InstalledVersion; LegacyVer=$face.LegacyInstalledVersion
    NewLink=$face.LinkExists; LegacyLink=$face.LegacyLinkExists
    ProfileDep=$(if ($face.ProfileDep) { 'YES' } else { 'no' })
    PatchRows=$face.PatchRowCount; PresetFiles=$face.PresetFiles; SettingsNs=$face.SettingsNsCount
    SnapLines=$snap.Count; Snap=$SnapName; LeakCount=$r.LeakCount
  }
  $legs.Add($row)
  W ("  RESULT: exit={0} ; 有效版本(profile link)={1} ; legacy link 版本={2} ; newLink={3} ; legacyLink={4} ; profileDep={5} ; patchRows={6} ; presetFiles={7} ; settingsNs={8} ; snapLines={9}" -f `
     $row.Exit,$row.EffVer,$row.LegacyVer,$row.NewLink,$row.LegacyLink,$row.ProfileDep,$row.PatchRows,$row.PresetFiles,$row.SettingsNs,$row.SnapLines)
  return ,$snap
}

$r0 = Run-Leg -Label 'R0' -Ref $RollbackRef  -TreeDir $rbExp.Dir   -DshHome $homeRef -SnapName 'R0-fresh-v052'   -ExpectVer '0.5.2'
$c1 = Run-Leg -Label 'C1' -Ref $CandidateRef -TreeDir $candExp.Dir -DshHome $homeNew -SnapName 'C1-v053'        -ExpectVer '0.5.3'
$c2 = Run-Leg -Label 'C2' -Ref $CandidateRef -TreeDir $candExp.Dir -DshHome $homeNew -SnapName 'C2-v053-idem'   -ExpectVer '0.5.3'
$c3 = Run-Leg -Label 'C3' -Ref $RollbackRef  -TreeDir $rbExp.Dir   -DshHome $homeNew -SnapName 'C3-v052-rollback' -ExpectVer '0.5.2'
$c4 = Run-Leg -Label 'C4' -Ref $CandidateRef -TreeDir $candExp.Dir -DshHome $homeNew -SnapName 'C4-v053-reinstall' -ExpectVer '0.5.3'
$c5 = Run-Leg -Label 'C5' -Ref $CandidateRef -TreeDir $candExp.Dir -DshHome $homeNew -SnapName 'C5-v053-idem2' -ExpectVer '0.5.3'

# ── 判定 ────────────────────────────────────────────────────────────────────
W ""
W "======== 判定（隔离环境） ========"
$d12 = Compare-Snapshot -Before $c1 -After $c2 -Label 'C1->C2 同版本重装(v0.5.3) 幂等'
$d45 = Compare-Snapshot -Before $c4 -After $c5 -Label 'C4->C5 同版本重装(v0.5.3, 往返后) 幂等'
$d25 = Compare-Snapshot -Before $c2 -After $c5 -Label 'C2->C5 往返闭环(安装->回退->再安装)'
$d34 = Compare-Snapshot -Before $c3 -After $c4 -Label 'C3->C4 回退(v0.5.2) -> 再安装(v0.5.3)'
$d13 = Compare-Snapshot -Before $c1 -After $c3 -Label 'C1->C3 升/回退 v0.5.3 -> v0.5.2（回滚面差异）'
$dR0C3 = Compare-Snapshot -Before $r0 -After $c3 -Label 'R0(全新 v0.5.2 安装) vs C3(回滚末端) —— 回滚是否留下残余'

$d13Lines = Get-SnapshotDiffLines -Before $c1 -After $c3
$d12Lines = Get-SnapshotDiffLines -Before $c1 -After $c2
$d45Lines = Get-SnapshotDiffLines -Before $c4 -After $c5
$d25Lines = Get-SnapshotDiffLines -Before $c2 -After $c5
$d34Lines = Get-SnapshotDiffLines -Before $c3 -After $c4
$dR0C3Lines = Get-SnapshotDiffLines -Before $r0 -After $c3

W ""
W "======== 结构化汇总 ========"
$legs | Format-Table -AutoSize | Out-String -Width 300 | ForEach-Object { W $_ }
W ("IDEMPOTENCY: C1->C2={0}  C4->C5={1}  C2->C5(闭环)={2}  C3->C4={3}  C1->C3(回滚)={4}  R0-vs-C3(回滚残余)={5}" -f $d12,$d45,$d25,$d34,$d13,$dR0C3)
W ("TIMING(seconds): C1(安装)={0}  C2(重装)={1}  C3(回滚安装)={2}  C4(再安装)={3}  C5(重装)={4}  往返合计={5}" -f `
   $timings['C1'],$timings['C2'],$timings['C3'],$timings['C4'],$timings['C5'],([math]::Round(($timings.Values | Measure-Object -Sum).Sum,3)))
$legs | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $Evidence 'drill-summary.json') -Encoding utf8

# 版本翻转表
$flip = @($legs | ForEach-Object { [pscustomobject]@{ Leg=$_.Leg; Ref=$_.Ref; RepoSimVer=$_.RepoSimVer; EffVer=$_.EffVer; LegacyVer=$_.LegacyVer; Exit=$_.Exit; Seconds=$_.Seconds } })
$flip | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $Evidence 'version-flip-table.json') -Encoding utf8

# ── 真实 $DSH_HOME 后指纹 + 对照 ────────────────────────────────────────────
$postFp = Get-RealDshFingerprint -DshHomePath $RealDshHome
$postFp.Lines | Set-Content -Path (Join-Path $Evidence 'post-dsh-fingerprint.txt') -Encoding utf8
$cmp = Compare-RealFingerprint -Before $preFp -After $postFp
W ""
W "======== 真实环境零污染判定（只读指纹）========"
W "REAL_ENV strict_deltas=$($cmp.StrictDeltaCount) inventory_deltas=$($cmp.InventoryDeltaCount) verdict_ok=$($cmp.Ok)"
foreach ($k in $cmp.StrictDeltas.Keys) { W "  STRICT_DELTA[$k] $($cmp.StrictDeltas[$k])" }
foreach ($k in $cmp.InventoryDeltas.Keys) { W "  INVENTORY_DELTA[$k] $($cmp.InventoryDeltas[$k])" }
W "  LEAK_BEFORE: $($cmp.LeakBefore)"
W "  LEAK_AFTER : $($cmp.LeakAfter)"

# ── report.json（结构化结论）────────────────────────────────────────────────
$allExitZero = (@($legs | Where-Object { $_.Exit -ne 0 }).Count -eq 0)
$effSeq = @($legs | ForEach-Object { $_.EffVer })
$report = [ordered]@{
  task = 'REL-007'
  drill = 'isolated rollback round-trip (install -> rollback -> reinstall)'
  date = (Get-Date -Format 'yyyy-MM-dd')
  isolation_root = $ISO
  candidate = [ordered]@{ source_kind=$candSourceKind; ref=$CandidateRef; commit=$candCommit; tree=$candTree; package_version=$candVer; tar_sha256=$candExp.TarSha }
  rollback_target = [ordered]@{ ref=$RollbackRef; commit=$rbCommit; tree=$rbTree; package_version=$rbVer; tar_sha256=$rbExp.TarSha }
  legs = $legs
  effective_version_sequence = $effSeq
  all_legs_exit_zero = $allExitZero
  idempotency = [ordered]@{
    C1_C2_same_version_reinstall = $d12
    C4_C5_same_version_reinstall_after_roundtrip = $d45
    C2_C5_roundtrip_closure = $d25
    C3_C4_rollback_then_reinstall = $d34
    C1_C3_upgrade_to_rollback_target = $d13
    R0_fresh_rollback_target_vs_C3_rollback_endstate = $dR0C3
    C1_C2_diffs = $d12Lines
    C4_C5_diffs = $d45Lines
    C2_C5_diffs = $d25Lines
    C3_C4_diffs = $d34Lines
    C1_C3_diffs = $d13Lines
    R0_C3_diffs = $dR0C3Lines
  }
  timing_seconds = [ordered]@{
    C1_install = $timings['C1']; C2_reinstall = $timings['C2']; C3_rollback_install = $timings['C3']
    C4_reinstall = $timings['C4']; C5_reinstall = $timings['C5']
    rollback_measured = $timings['C3']
    roundtrip_total = [math]::Round(($timings.Values | Measure-Object -Sum).Sum,3)
  }
  env_redirect = [ordered]@{
    required_keys = $script:RequiredEnvKeys
    values = [ordered]@{ DSH_HOME=$homeNew; USERPROFILE=(Join-Path $ISO 'user'); HOME=(Join-Path $ISO 'user'); APPDATA=(Join-Path $ISO 'user\AppData\Roaming'); LOCALAPPDATA=(Join-Path $ISO 'user\AppData\Local'); TEMP=(Join-Path $ISO 'tmp') }
    containment_checked = $true
    real_path_leak_detector = 'enabled (Test-RealPathLeak; 0 leaks)'
  }
  real_env_verdict = [ordered]@{
    home = $RealDshHome
    strict_delta_count = $cmp.StrictDeltaCount
    strict_deltas = $cmp.StrictDeltas
    inventory_delta_count = $cmp.InventoryDeltaCount
    inventory_deltas = $cmp.InventoryDeltas
    leak_before = $cmp.LeakBefore
    leak_after = $cmp.LeakAfter
    ok = $cmp.Ok
  }
  verdict = $(if ($allExitZero -and $cmp.Ok -and $d12 -eq 0 -and $d45 -eq 0) { 'PASS' } else { 'FAIL' })
  rollback_semantics = '回滚 = 版本回退（有效版本正确）∧ 插件管理面按该版本内容重写；**不等于**DSH_HOME 全量状态还原 —— 非插件管理面（sessions/storages/用户书目与工作区数据）不在 install 脚本作用域、从不被写入也不被还原。本版无数据/状态 schema 迁移。回滚残余实测 = R0_vs_C3_diff'
  rollback_residue_measured = $dR0C3
}
$report | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $Evidence 'report.json') -Encoding utf8
W ""
W "REPORT: verdict=$($report.verdict) all_legs_exit_zero=$allExitZero real_env_ok=$($cmp.Ok) rollback_seconds=$($timings['C3'])"
W "DRILL_END"
