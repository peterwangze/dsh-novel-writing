# REL-006 回滚演练驱动 v2（权威单次运行）——rollback-plan §3 路径 A 的隔离开等价物
# 忠实建模：路径 A = `git checkout <tag>` 就地换树 + 重跑 install.<ext>。
# 隔离等价物 = 单一 repo-sim 目录就地换内容（junction 目标路径不变）+ 重跑 install.ps1。
# 全部读写限于 $ISO 隔离根（Assert-IsoPath fail-closed 守卫 + 真实路径泄漏检测）。
$ErrorActionPreference = 'Stop'
$ISO = 'C:\Users\peter\AppData\Local\Temp\rel006-drill-20260912'
. "$ISO\isolate-env.ps1"
$script:RealNM = 'D:\AI\agent\deepseek\harness\writing-workflow\node_modules'
$LOG = Join-Path $ISO 'drill-log.txt'
function W([string]$s) { Write-Host $s; $s | Add-Content -Path $LOG -Encoding utf8 }

"=== REL-006 隔离回滚演练（权威运行） $(Get-Date -Format o) ===" | Set-Content -Path $LOG -Encoding utf8
W "ISOLATED_ROOT = $ISO"
W "REF: v0.5.1 tag=7d4d89923e4e572d9af0003182a344d0acb0f2e9 peel=cd1911e9f1e3bbb90b6197fa3cf7a5e95a1ea373"
W "REF: v0.5.2 tag=7ca99d6d612d90aadeba83d4c7ad40ed61feafa4 peel=e1f25df84ead0a4d07c655f9afcd379a8a96a2a8"
W "TREE SOURCE: git archive <tag> --format=tar -o <ISO>\<tree>.tar ; tar -xf <ISO>\<tree>.tar -C <ISO>\<tree>  (禁止 git checkout 切换工作树)"
W "ENV REDIRECT: DSH_HOME / USERPROFILE / HOME / APPDATA / LOCALAPPDATA / XDG_* / PNPM_HOME / npm_config_(cache|userconfig|globalconfig|prefix|ignore_scripts) 全部指向隔离根"

# ── 夹具：HOME_A 新布局 / HOME_B 旧布局（每次运行前重置为纯净态）────────────
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
$homeNew    = Assert-IsoPath (Join-Path $ISO 'home-new')
$homeLegacy = Assert-IsoPath (Join-Path $ISO 'home-legacy')
foreach ($h in @($homeNew,$homeLegacy)) {
  if (Test-Path $h) { Remove-Item $h -Recurse -Force }
  New-Item -ItemType Directory -Path $h -Force | Out-Null
}
$pdNew = Join-Path $homeNew 'profiles\web'
New-Item -ItemType Directory -Path $pdNew -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path $pdNew 'package.json'), $fixtureNew, (New-Object System.Text.UTF8Encoding($false)))

# ── 隔离 repo-sim（模拟工作树；node_modules 常驻 junction，与真实仓库一致）──
$sim = Assert-IsoPath (Join-Path $ISO 'repo-sim')
if (Test-Path $sim) { Remove-Item $sim -Recurse -Force }
New-Item -ItemType Directory -Path $sim -Force | Out-Null
New-Item -ItemType Junction -Path (Join-Path $sim 'node_modules') -Target $script:RealNM | Out-Null
W "repo-sim node_modules junction -> $script:RealNM (只读复用真实依赖树；工具有 node_modules 的仓库状态一致)"

function Sync-RepoSim([string]$TreeDir) {
  $TreeDir = Assert-IsoPath $TreeDir
  Get-ChildItem $sim -Force | Where-Object { $_.Name -ne 'node_modules' } | ForEach-Object { Remove-Item $_.FullName -Recurse -Force }
  Get-ChildItem $TreeDir -Force | Where-Object { $_.Name -ne 'node_modules' } | ForEach-Object { Copy-Item $_.FullName -Destination $sim -Recurse -Force }
  return (Get-Content (Join-Path $sim 'package.json') -Raw | ConvertFrom-Json).version
}

$legs = New-Object System.Collections.Generic.List[object]
$snaps = @{}
function Run-Leg {
  param([string]$Label,[string]$Tag,[string]$DshHome,[string]$SnapName)
  $ver = Sync-RepoSim (Join-Path $ISO "tree-$Tag")
  W ""
  W "==== LEG $Label : checkout-equivalent -> $Tag (repo-sim package.json = $ver) ; re-run install.ps1 ; DSH_HOME = $DshHome ===="
  $rc = Invoke-IsoInstall -Tree $sim -DshHome $DshHome -Profile web
  $face = Assert-InstallFace -DshHome $DshHome
  $snap = Get-TreeSnapshot -Root $DshHome
  $snap | Set-Content -Path (Join-Path $ISO "snap-$SnapName.txt") -Encoding utf8
  $snapScript = $snap
  $snaps[$SnapName] = $snapScript
  $row = [pscustomobject][ordered]@{
    Leg=$Label; Ref=$Tag; RepoSimVer=$ver; Exit=$rc
    EffVer=$face.InstalledVersion; LegacyVer=$face.LegacyInstalledVersion
    NewLink=$face.LinkExists; LegacyLink=$face.LegacyLinkExists
    ProfileDep=$(if ($face.ProfileDep) { 'YES' } else { 'no' })
    PatchRows=$face.PatchRowCount; PresetFiles=$face.PresetFiles; SettingsNs=$face.SettingsNsCount
    SnapLines=$snap.Count; Snap=$SnapName
  }
  $legs.Add($row)
  W ("  RESULT: exit={0} ; 有效版本(profile link)={1} ; legacy link 版本={2} ; newLink={3} ; legacyLink={4} ; profileDep={5} ; patchRows={6} ; presetFiles={7} ; settingsNs={8} ; snapLines={9}" -f `
     $row.Exit,$row.EffVer,$row.LegacyVer,$row.NewLink,$row.LegacyLink,$row.ProfileDep,$row.PatchRows,$row.PresetFiles,$row.SettingsNs,$row.SnapLines)
  return ,$snapScript
}

# ── 场景 1（新布局 HOME_A）：0.5.1 → 0.5.1(重装) → 0.5.2 → 0.5.2(重装) → 回滚 0.5.1 ──
$a1 = Run-Leg -Label 'A1' -Tag 'v0.5.1' -DshHome $homeNew -SnapName 'A1-v051'
$a2 = Run-Leg -Label 'A2' -Tag 'v0.5.1' -DshHome $homeNew -SnapName 'A2-v051-idem'
$a3 = Run-Leg -Label 'A3' -Tag 'v0.5.2' -DshHome $homeNew -SnapName 'A3-v052'
$a4 = Run-Leg -Label 'A4' -Tag 'v0.5.2' -DshHome $homeNew -SnapName 'A4-v052-idem'
$a5 = Run-Leg -Label 'A5' -Tag 'v0.5.1' -DshHome $homeNew -SnapName 'A5-v051-back'

W ""
W "======== 判定（新布局 HOME_A） ========"
$d12 = Compare-Snapshot -Before $a1 -After $a2 -Label 'A1->A2 同版本重装(v0.5.1) 幂等'
$d34 = Compare-Snapshot -Before $a3 -After $a4 -Label 'A3->A4 同版本重装(v0.5.2) 幂等'
$d45 = Compare-Snapshot -Before $a4 -After $a5 -Label 'A4->A5 回滚 v0.5.2 -> v0.5.1'
$d25 = Compare-Snapshot -Before $a2 -After $a5 -Label 'A2(原始 v0.5.1 态) -> A5(往返后) 闭环'
$d13 = Compare-Snapshot -Before $a1 -After $a3 -Label 'A1->A3 升版 v0.5.1 -> v0.5.2'

# ── 场景 2（旧布局 HOME_B）：0.5.1 → 0.5.2 ──
$b1 = Run-Leg -Label 'B1' -Tag 'v0.5.1' -DshHome $homeLegacy -SnapName 'B1-legacy-v051'
$b2 = Run-Leg -Label 'B2' -Tag 'v0.5.2' -DshHome $homeLegacy -SnapName 'B2-legacy-v052'
W ""
W "======== 判定（旧布局 HOME_B）========"
$db = Compare-Snapshot -Before $b1 -After $b2 -Label 'B1->B2 旧布局 v0.5.1 -> v0.5.2'

W ""
W "======== 结构化汇总 ========"
$legs | Format-Table -AutoSize | Out-String -Width 300 | ForEach-Object { W $_ }
W ("IDEMPOTENCY: A1->A2={0}  A3->A4={1}  A4->A5(回滚)={2}  A2->A5(闭环)={3}  A1->A3(升版)={4}  B1->B2(旧布局)={5}" -f $d12,$d34,$d45,$d25,$d13,$db)
$legs | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $ISO 'drill-summary.json') -Encoding utf8
W "DRILL_END"
