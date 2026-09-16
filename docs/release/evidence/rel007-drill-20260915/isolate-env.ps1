# REL-007 隔离回滚演练 —— 环境重定向 + fail-closed 守卫 + 真实路径泄漏检测（M7.7 / 破坏性红线 R1）
#
# 机制承接 REL-006（docs/release/evidence/rel006-drill-20260912/isolate-env.ps1 **v2**）——该 v2 本体即是
# REL-006「误写真实 profile 根 3 项」事件的纠正措施。本版 REL-007 **逐条保留**其全部机制，并按要求加固：
#   [保留] Assert-IsoPath fail-closed 路径守卫（任何目标路径 MUST 位于隔离根内，否则 throw 中止）
#   [保留] Test-RealPathLeak 真实路径泄漏检测器（首轮事故的正向拦截器）
#   [保留] Get-TreeSnapshot / Compare-Snapshot / Assert-InstallFace 快照与安装面校验
#   [新增 A] TEMP/TMP 亦重定向至隔离根——REL-007 任务书要求 6 项
#            （DSH_HOME / USERPROFILE / HOME / APPDATA / LOCALAPPDATA / TEMP）**全部**指向隔离根
#   [新增 B] 对该 6 项**逐项**做包含性断言（值 MUST 位于隔离根内 ∧ MUST NOT 等于真实值）
#            —— REL-006 v2 只断言 DSH_HOME / USERPROFILE
#   [新增 C] TEMP 亦纳入「真实值未残留」断言
#
# 用法：run-drill.ps1 先设置 REL007_ISO / REL007_REAL_HOME / REL007_REAL_DSH_HOME，再 . 本文件。
$ErrorActionPreference = 'Stop'

if (-not $env:REL007_ISO)           { throw 'ISOLATION GUARD FAIL: REL007_ISO 未设置——拒绝在未定义隔离根时加载（fail-closed）' }
if (-not $env:REL007_REAL_HOME)     { throw 'ISOLATION GUARD FAIL: REL007_REAL_HOME 未设置（fail-closed）' }
if (-not $env:REL007_REAL_DSH_HOME) { throw 'ISOLATION GUARD FAIL: REL007_REAL_DSH_HOME 未设置（fail-closed）' }

$script:ISO            = [System.IO.Path]::GetFullPath($env:REL007_ISO).TrimEnd('\')
$script:RealHome       = [System.IO.Path]::GetFullPath($env:REL007_REAL_HOME).TrimEnd('\')
$script:RealDshHome    = [System.IO.Path]::GetFullPath($env:REL007_REAL_DSH_HOME).TrimEnd('\')
$script:RealHomePrefix = $script:RealHome + '\'
$script:RealTemp       = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')   # 捕获于重定向之前
$script:RequiredEnvKeys = @('DSH_HOME','USERPROFILE','HOME','APPDATA','LOCALAPPDATA','TEMP')

# ── fail-closed 路径守卫：任何目标路径 MUST 位于隔离根内 ─────────────────────
function Assert-IsoPath {
  param([Parameter(Mandatory=$true)][string]$Path)
  $full = [System.IO.Path]::GetFullPath($Path)
  $inside = $full.Equals($script:ISO, [System.StringComparison]::OrdinalIgnoreCase) -or
            $full.StartsWith($script:ISO + '\', [System.StringComparison]::OrdinalIgnoreCase)
  if (-not $inside) {
    throw "ISOLATION GUARD FAIL: '$full' 不在隔离根 '$($script:ISO)' 内 —— 已中止（禁止真实环境写入）"
  }
  return $full
}

function Set-IsoEnv {
  param([Parameter(Mandatory=$true)][string]$DshHome)
  $DshHome = Assert-IsoPath $DshHome
  $user = Assert-IsoPath (Join-Path $script:ISO 'user')
  $tmp  = Assert-IsoPath (Join-Path $script:ISO 'tmp')
  $roaming = Assert-IsoPath (Join-Path $script:ISO 'user\AppData\Roaming')
  $local   = Assert-IsoPath (Join-Path $script:ISO 'user\AppData\Local')
  $npmcache = Assert-IsoPath (Join-Path $script:ISO 'cache\npm')

  $env:DSH_HOME     = $DshHome
  $env:USERPROFILE  = $user
  $env:HOME         = $user
  $env:APPDATA      = $roaming
  $env:LOCALAPPDATA = $local
  $env:TEMP         = $tmp
  $env:TMP          = $tmp
  $env:XDG_CONFIG_HOME = Join-Path $script:ISO 'user\.config'
  $env:XDG_DATA_HOME   = Join-Path $script:ISO 'user\.local\share'
  $env:XDG_CACHE_HOME  = Join-Path $script:ISO 'user\.cache'
  $env:XDG_STATE_HOME  = Join-Path $script:ISO 'user\.local\state'
  $env:PNPM_HOME       = Join-Path $script:ISO 'pnpm'
  $env:npm_config_cache        = $npmcache
  $env:npm_config_userconfig   = Join-Path $npmcache 'userconfig.npmrc'
  $env:npm_config_globalconfig = Join-Path $npmcache 'globalconfig.npmrc'
  $env:npm_config_prefix       = Assert-IsoPath (Join-Path $script:ISO 'npm-global')
  $env:npm_config_ignore_scripts = 'true'

  foreach ($d in @($tmp, $user, $roaming, $local, $npmcache, (Join-Path $script:ISO 'pnpm'),
                   (Join-Path $script:ISO 'npm-global'), (Join-Path $script:ISO 'user\.config'),
                   (Join-Path $script:ISO 'user\.cache'))) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
  }

  # ── [新增 B] 6 项必备变量逐项包含性断言（fail-closed）─────────────────────
  $vals = [ordered]@{
    DSH_HOME=$env:DSH_HOME; USERPROFILE=$env:USERPROFILE; HOME=$env:HOME
    APPDATA=$env:APPDATA; LOCALAPPDATA=$env:LOCALAPPDATA; TEMP=$env:TEMP
  }
  foreach ($k in $script:RequiredEnvKeys) {
    $raw = [string]$vals[$k]
    if ([string]::IsNullOrWhiteSpace($raw)) { throw "ENV GUARD FAIL: $k 为空（隔离重定向未生效）" }
    $vf = [System.IO.Path]::GetFullPath($raw)
    $inside = $vf.Equals($script:ISO, [System.StringComparison]::OrdinalIgnoreCase) -or
              $vf.StartsWith($script:ISO + '\', [System.StringComparison]::OrdinalIgnoreCase)
    if (-not $inside) { throw "ENV GUARD FAIL: $k='$vf' 不在隔离根 '$($script:ISO)' 内" }
  }
  # ── [新增 C] 真实值未残留断言 ─────────────────────────────────────────────
  if ($env:USERPROFILE -eq $script:RealHome)    { throw "ENV GUARD FAIL: USERPROFILE 仍是真实用户目录 '$($script:RealHome)'" }
  if ($env:HOME        -eq $script:RealHome)    { throw "ENV GUARD FAIL: HOME 仍是真实用户目录" }
  if ($env:DSH_HOME    -eq $script:RealDshHome) { throw "ENV GUARD FAIL: DSH_HOME 仍是真实配置目录 '$($script:RealDshHome)'" }
  if ($env:TEMP        -eq $script:RealTemp)    { throw "ENV GUARD FAIL: TEMP 仍是真实临时目录 '$($script:RealTemp)'" }
}

function Get-IsoEnvLine {
  $pairs = [ordered]@{
    DSH_HOME=$env:DSH_HOME; USERPROFILE=$env:USERPROFILE; HOME=$env:HOME
    APPDATA=$env:APPDATA; LOCALAPPDATA=$env:LOCALAPPDATA; TEMP=$env:TEMP; TMP=$env:TMP
    XDG_CONFIG_HOME=$env:XDG_CONFIG_HOME; PNPM_HOME=$env:PNPM_HOME
    npm_config_cache=$env:npm_config_cache; npm_config_ignore_scripts=$env:npm_config_ignore_scripts
  }
  return (@($pairs.Keys | ForEach-Object { "$_=$($pairs[$_])" }) -join ' ; ')
}

# ── 隔离包含性校验证据行（逐项 PASS/FAIL + 值）────────────────────────────────
function Get-IsoContainmentLines {
  $vals = [ordered]@{
    DSH_HOME=$env:DSH_HOME; USERPROFILE=$env:USERPROFILE; HOME=$env:HOME
    APPDATA=$env:APPDATA; LOCALAPPDATA=$env:LOCALAPPDATA; TEMP=$env:TEMP
  }
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($k in $script:RequiredEnvKeys) {
    $vf = [System.IO.Path]::GetFullPath([string]$vals[$k])
    $inside = $vf.Equals($script:ISO, [System.StringComparison]::OrdinalIgnoreCase) -or
              $vf.StartsWith($script:ISO + '\', [System.StringComparison]::OrdinalIgnoreCase)
    $out.Add(("CONTAINMENT {0,-14} inside_isolation={1} value={2}" -f $k, $inside, $vf))
  }
  return $out
}

# ── 真实路径泄漏检测：输出行含真实前缀且不含隔离根 ⇒ LEAK ─────────────────────
function Test-RealPathLeak {
  param([string[]]$Lines)
  $leaks = @($Lines | Where-Object {
    $_ -match [regex]::Escape($script:RealHomePrefix) -and ($_ -notmatch [regex]::Escape($script:ISO))
  })
  return $leaks
}

# ── 单步演练：重定向 → 守卫 → 子进程执行 install.ps1 → 泄漏检测 → 返回读数 ────
function Invoke-IsoInstall {
  param(
    [Parameter(Mandatory=$true)][string]$Tree,
    [Parameter(Mandatory=$true)][string]$DshHome,
    [string]$Profile = 'web'
  )
  $Tree    = Assert-IsoPath $Tree
  $DshHome = Assert-IsoPath $DshHome
  Set-IsoEnv -DshHome $DshHome
  $scriptPath = Join-Path $Tree 'install.ps1'
  if (-not (Test-Path $scriptPath)) { throw "install.ps1 不存在：$scriptPath" }
  $t0 = Get-Date
  $out = @(& powershell.exe -ExecutionPolicy Bypass -NoProfile -File $scriptPath -LocalPath $Tree -Profile $Profile 2>&1 | ForEach-Object { "$_" })
  $rc = $LASTEXITCODE
  $secs = [math]::Round(((Get-Date) - $t0).TotalSeconds, 3)
  $leaks = Test-RealPathLeak -Lines $out
  if ($leaks.Count -gt 0) {
    Write-Host "!! REAL-PATH LEAK DETECTED ($($leaks.Count)):"
    $leaks | ForEach-Object { Write-Host ("   LEAK| " + $_) }
    throw "真实环境路径泄漏 —— 已中止演练（禁止继续）"
  }
  return [pscustomobject]@{ Exit=[int]$rc; Seconds=$secs; Output=$out; LeakCount=0 }
}

# ── 文件面快照：相对路径 + 长度 + SHA256；reparse 记 LINK 且不递归 ─────────────
function Get-TreeSnapshot {
  param([Parameter(Mandatory=$true)][string]$Root)
  $Root = Assert-IsoPath $Root
  $list = New-Object System.Collections.Generic.List[string]
  if (-not (Test-Path $Root)) { return @("MISSING|$Root") }
  $rootFull = (Get-Item $Root).FullName
  $walk = {
    param($dir)
    foreach ($e in (Get-ChildItem $dir -Force -ErrorAction SilentlyContinue | Sort-Object Name)) {
      $rel = $e.FullName.Substring($rootFull.Length).TrimStart('\') -replace '\\','/'
      if ([bool]($e.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        $list.Add("LINK|$rel|->" + ($e.Target -join ',')); continue
      }
      if ($e.PSIsContainer) { $list.Add("DIR |$rel"); & $walk $e.FullName }
      else {
        $h = (Get-FileHash $e.FullName -Algorithm SHA256 -ErrorAction SilentlyContinue)
        if ($null -eq $h) { $list.Add("FILE|$rel|$($e.Length)|UNREADABLE") }
        else { $list.Add("FILE|$rel|$($e.Length)|$($h.Hash)") }
      }
    }
  }
  & $walk $rootFull
  return $list
}

function Compare-Snapshot {
  param([string[]]$Before,[string[]]$After,[string]$Label)
  $d = @(Compare-Object -ReferenceObject $Before -DifferenceObject $After)
  if ($d.Count -eq 0) { Write-Host "IDEMPOTENCY[$Label]: diff=0 (零差异)"; return 0 }
  Write-Host "IDEMPOTENCY[$Label]: diff=$($d.Count) 项"
  $d | ForEach-Object { Write-Host ("  {0} {1}" -f $_.SideIndicator,$_.InputObject) }
  return [int]$d.Count
}

function Get-SnapshotDiffLines {
  param([string[]]$Before,[string[]]$After)
  return @(Compare-Object -ReferenceObject $Before -DifferenceObject $After | ForEach-Object {
    ("{0} {1}" -f $_.SideIndicator, $_.InputObject)
  })
}

# ── 安装结果校验（版本 / 注册面 / 兜底行 / 预设 / 配置）──────────────────────
function Assert-InstallFace {
  param([Parameter(Mandatory=$true)][string]$DshHome,[string]$Profile='web')
  $DshHome = Assert-IsoPath $DshHome
  $pd  = Join-Path $DshHome "profiles\$Profile"
  $dst = Join-Path $pd "node_modules\dsh-novel-writing"
  $res = [ordered]@{}
  $res.DshHome    = $DshHome
  $res.NewLayout  = Test-Path (Join-Path $pd 'package.json')
  $res.LinkPath   = $dst
  $res.LinkExists = Test-Path $dst
  if ($res.LinkExists) {
    $it = Get-Item $dst -Force
    $res.LinkTarget    = ($it.Target -join ',')
    $res.LinkIsReparse = [bool]($it.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
    $pj = Join-Path $dst 'package.json'
    $res.InstalledVersion = if (Test-Path $pj) { (Get-Content $pj -Raw | ConvertFrom-Json).version } else { 'n/a' }
  } else {
    $res.LinkTarget = $null; $res.LinkIsReparse = $false; $res.InstalledVersion = 'n/a'
  }
  $legacy = Join-Path $DshHome "profiles\node_modules\dsh-novel-writing"
  $res.LegacyLinkExists = Test-Path $legacy
  if ($res.LegacyLinkExists) {
    $it2 = Get-Item $legacy -Force
    $res.LegacyLinkTarget = ($it2.Target -join ',')
    $pj2 = Join-Path $legacy 'package.json'
    $res.LegacyInstalledVersion = if (Test-Path $pj2) { (Get-Content $pj2 -Raw | ConvertFrom-Json).version } else { 'n/a' }
  } else {
    $res.LegacyLinkTarget = $null; $res.LegacyInstalledVersion = 'n/a'
  }
  $ppj = Join-Path $pd 'package.json'
  if (Test-Path $ppj) {
    $p = Get-Content $ppj -Raw | ConvertFrom-Json
    $res.ProfileDep     = $p.dependencies.'dsh-novel-writing'
    $res.ProfileBundles = (@($p.dsh.profile.bundles) -join ',')
  } else { $res.ProfileDep = $null; $res.ProfileBundles = $null }
  $cp = Join-Path $pd 'cordis.patch.yml'
  if (Test-Path $cp) { $res.PatchRowCount = ([regex]::Matches((Get-Content $cp -Raw),'name: dsh-novel-writing')).Count }
  else { $res.PatchRowCount = 0 }
  $preset = Join-Path $DshHome '.agent-presets\novel-writing'
  $res.PresetExists = Test-Path (Join-Path $preset 'agent.cordis.yml')
  $res.PresetFiles  = (Get-ChildItem $preset -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object).Count
  $sy = Join-Path $DshHome 'settings.yaml'
  if (Test-Path $sy) {
    $res.SettingsHasSection = [bool](Select-String -Path $sy -Pattern '(?m)^novel-writing:\s*$' -Quiet)
    $res.SettingsNsCount    = @(Select-String -Path $sy -Pattern '(?m)^novel-writing:\s*$' -AllMatches).Count
  } else { $res.SettingsHasSection = $false; $res.SettingsNsCount = 0 }
  return $res
}

# ── 真实 $DSH_HOME 只读指纹（strict 面 = 安装可写面；inventory 面 = 全根条目，如实记录）
#    口径对齐仓内既有机制：scripts/probe-nv-ux012.mjs realFingerprint()/realEnvVerdict()
function Get-RealDshFingerprint {
  # ⚠️ 参数名 MUST NOT 为 $Home / $HOME —— 二者是 PowerShell **只读自动变量**，参数绑定即抛
  #    「无法覆盖变量 Home，因为它是只读变量或常量」。此类「自动变量名冲突」正是 REL-006 首轮
  #    真实环境写入事件（$home 赋值静默失效）的同一根因类别；本版以 Fail-closed 命名（$DshHomePath）规避，
  #    并由 REL007_REAL_DSH_HOME 显式传入真实路径（不做任何 $HOME/$Home 推导）。
  param([Parameter(Mandatory=$true)][string]$DshHomePath)
  $hp = [System.IO.Path]::GetFullPath($DshHomePath)
  $lines = New-Object System.Collections.Generic.List[string]
  $strict = [ordered]@{}
  $lines.Add("DSH_HOME=$hp")
  $lines.Add("EXISTS=" + (Test-Path $hp))
  $targets = [ordered]@{
    'settings.yaml'                  = (Join-Path $hp 'settings.yaml')
    'profiles/web/package.json'      = (Join-Path $hp 'profiles\web\package.json')
    'profiles/web/cordis.patch.yml'  = (Join-Path $hp 'profiles\web\cordis.patch.yml')
  }
  foreach ($k in $targets.Keys) {
    $p = $targets[$k]
    if (Test-Path $p -PathType Leaf) {
      $h = (Get-FileHash $p -Algorithm SHA256 -ErrorAction SilentlyContinue)
      $strict[$k] = if ($h) { $h.Hash } else { 'UNREADABLE' }
      $lines.Add("STRICT $k sha256=$($strict[$k]) len=$((Get-Item $p).Length) mtime=$((Get-Item $p).LastWriteTime.ToString('o'))")
    } else {
      $strict[$k] = 'MISSING'
      $lines.Add("STRICT $k MISSING")
    }
  }
  # 预设目录（只读列举）
  $preset = Join-Path $hp '.agent-presets\novel-writing'
  if (Test-Path $preset) {
    $names = @(Get-ChildItem $preset -Force -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object { "$($_.Name):$($_.Length)" })
    $strict['.agent-presets/novel-writing'] = ($names -join ',')
    $lines.Add("STRICT .agent-presets/novel-writing entries=" + $names.Count + " listing_sha256_unused=1")
  } else {
    $strict['.agent-presets/novel-writing'] = 'MISSING'
    $lines.Add("STRICT .agent-presets/novel-writing MISSING")
  }
  # 安装目标自身是否被写入（true ⇒ 真实环境被污染）
  $strict['profiles/web/node_modules/dsh-novel-writing'] = if (Test-Path (Join-Path $hp 'profiles\web\node_modules\dsh-novel-writing')) { 'PRESENT' } else { 'ABSENT' }
  $strict['profiles/node_modules/dsh-novel-writing'] = if (Test-Path (Join-Path $hp 'profiles\node_modules\dsh-novel-writing')) { 'PRESENT' } else { 'ABSENT' }
  $lines.Add("STRICT 新布局链接 = " + $strict['profiles/web/node_modules/dsh-novel-writing'])
  $lines.Add("STRICT 旧布局链接 = " + $strict['profiles/node_modules/dsh-novel-writing'])
  # inventory 面
  $inv = [ordered]@{}
  if (Test-Path $hp) {
    foreach ($e in (Get-ChildItem $hp -Force -ErrorAction SilentlyContinue | Sort-Object Name)) {
      try {
        $st = Get-Item $e.FullName -Force
        $inv[$e.Name] = "$(if($st.PSIsContainer){'dir'}else{'file'})|$($st.Length)|$($st.LastWriteTime.ToString('o'))"
      } catch { $inv[$e.Name] = 'ERROR' }
    }
  }
  foreach ($k in $inv.Keys) { $lines.Add("INVENTORY $k = $($inv[$k])") }
  # 污染签名（口径同 probe-nv-ux012 realEnvVerdict）：settings.yaml 的 novel-writing.workspaceRoot 是否指向隔离根
  $leak = 'none'
  try {
    $sy = Join-Path $hp 'settings.yaml'
    if (Test-Path $sy) {
      $txt = Get-Content $sy -Raw
      $m = [regex]::Match($txt, 'novel-writing:[\s\S]{0,400}?workspaceRoot:\s*(\S+)')
      if ($m.Success) {
        $root = $m.Groups[1].Value
        $pointsInto = $root -like "*rel007-drill*"
        $leak = "workspaceRoot=$root pointsIntoIsolation=$pointsInto"
      }
    }
  } catch { $leak = "error=$($_.Exception.Message)" }
  $lines.Add("LEAK_SIGNATURE novel-writing.workspaceRoot: $leak")
  return [pscustomobject]@{ Home=$hp; Lines=$lines; Strict=$strict; Inventory=$inv; Leak=$leak }
}

function Compare-RealFingerprint {
  param($Before, $After)
  $strictDeltas = [ordered]@{}
  foreach ($k in $Before.Strict.Keys) {
    if ($Before.Strict[$k] -ne $After.Strict[$k]) { $strictDeltas[$k] = "before=$($Before.Strict[$k]) after=$($After.Strict[$k])" }
  }
  $invDeltas = [ordered]@{}
  $names = @($Before.Inventory.Keys) + @($After.Inventory.Keys) | Select-Object -Unique
  foreach ($n in $names) {
    $b = if ($Before.Inventory.Contains($n)) { $Before.Inventory[$n] } else { '<absent>' }
    $a = if ($After.Inventory.Contains($n))  { $After.Inventory[$n] }  else { '<absent>' }
    if ($b -ne $a) { $invDeltas[$n] = "before=$b after=$a" }
  }
  return [pscustomobject]@{
    StrictDeltas = $strictDeltas
    StrictDeltaCount = $strictDeltas.Count
    InventoryDeltas = $invDeltas
    InventoryDeltaCount = $invDeltas.Count
    LeakBefore = $Before.Leak
    LeakAfter  = $After.Leak
    Ok = ($strictDeltas.Count -eq 0)
  }
}
