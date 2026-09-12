# REL-006 隔离演练环境重定向（M7.7）——所有路径指向 %TEMP% 隔离根，零真实 $HOME 写入
# v2：修正 $home/$HOME 自动变量冲突（首轮真实环境写入事件根因）；新增 fail-closed 守卫 + 真实路径泄漏检测
# 用法：. "$ISO\isolate-env.ps1" ; Invoke-IsoInstall -Tree <导出树> -DshHome <隔离 DSH_HOME>
$ErrorActionPreference = 'Stop'
$script:ISO = 'C:\Users\peter\AppData\Local\Temp\rel006-drill-20260912'
$script:RealNodeModules = 'D:\AI\agent\deepseek\harness\writing-workflow\node_modules'
$script:RealHomePrefix = 'C:\Users\peter\'

# ── fail-closed 路径守卫：任何目标路径 MUST 位于隔离根内 ──────────────────────
function Assert-IsoPath {
  param([Parameter(Mandatory=$true)][string]$Path)
  $full = [System.IO.Path]::GetFullPath($Path)
  if (-not $full.StartsWith($script:ISO, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "ISOLATION GUARD FAIL: '$full' 不在隔离根 '$($script:ISO)' 内 —— 已中止（禁止真实环境写入）"
  }
  return $full
}

function Set-IsoEnv {
  param([Parameter(Mandatory=$true)][string]$DshHome)
  $DshHome = Assert-IsoPath $DshHome
  $env:DSH_HOME                = $DshHome
  $env:npm_config_cache        = Assert-IsoPath (Join-Path $script:ISO 'cache\npm')
  $env:npm_config_userconfig   = Join-Path $script:ISO 'cache\npm\userconfig.npmrc'
  $env:npm_config_globalconfig = Join-Path $script:ISO 'cache\npm\globalconfig.npmrc'
  $env:npm_config_prefix       = Join-Path $script:ISO 'npm-global'
  $env:npm_config_ignore_scripts = 'true'
  $env:USERPROFILE             = Assert-IsoPath (Join-Path $script:ISO 'user')
  $env:HOME                    = Join-Path $script:ISO 'user'
  $env:APPDATA                 = Assert-IsoPath (Join-Path $script:ISO 'appdata')
  $env:LOCALAPPDATA            = Join-Path $script:ISO 'appdata'
  $env:XDG_CONFIG_HOME         = Join-Path $script:ISO 'user\.config'
  $env:XDG_DATA_HOME           = Join-Path $script:ISO 'user\.local\share'
  $env:XDG_CACHE_HOME          = Join-Path $script:ISO 'user\.cache'
  $env:XDG_STATE_HOME          = Join-Path $script:ISO 'user\.local\state'
  $env:PNPM_HOME               = Join-Path $script:ISO 'pnpm'
  # 二次断言：环境变量实际生效值必须仍是隔离路径
  if ($env:DSH_HOME -ne $DshHome)    { throw "ENV GUARD FAIL: DSH_HOME='$env:DSH_HOME' expected='$DshHome'" }
  if ($env:USERPROFILE -ne (Join-Path $script:ISO 'user')) { throw "ENV GUARD FAIL: USERPROFILE='$env:USERPROFILE'" }
  if ($env:USERPROFILE -eq $script:RealHomePrefix.TrimEnd('\')) { throw "ENV GUARD FAIL: USERPROFILE 仍是真实用户目录" }
}

function Get-IsoEnvLine {
  (@(
    "DSH_HOME=$env:DSH_HOME",
    "USERPROFILE=$env:USERPROFILE",
    "HOME=$env:HOME",
    "APPDATA=$env:APPDATA",
    "LOCALAPPDATA=$env:LOCALAPPDATA",
    "npm_config_cache=$env:npm_config_cache",
    "npm_config_userconfig=$env:npm_config_userconfig",
    "npm_config_globalconfig=$env:npm_config_globalconfig",
    "npm_config_ignore_scripts=$env:npm_config_ignore_scripts",
    "XDG_CONFIG_HOME=$env:XDG_CONFIG_HOME",
    "PNPM_HOME=$env:PNPM_HOME"
  ) -join ' ; ')
}

# ── 真实路径泄漏检测：输出行含真实前缀且不含隔离根 ⇒ FAIL ────────────────────
function Test-RealPathLeak {
  param([string[]]$Lines)
  $leaks = @($Lines | Where-Object { $_ -match [regex]::Escape($script:RealHomePrefix) -and ($_ -notmatch [regex]::Escape($script:ISO)) })
  return $leaks
}

# ── 单步演练：设置重定向 → 守卫 → 子进程执行 install.ps1 → 校验 → 返回结果 ──
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
  $out = @(& powershell.exe -ExecutionPolicy Bypass -NoProfile -File $scriptPath -LocalPath $Tree -Profile $Profile 2>&1 | ForEach-Object { "$_" })
  $rc = $LASTEXITCODE
  $leaks = Test-RealPathLeak -Lines $out
  if ($leaks.Count -gt 0) {
    Write-Host "!! REAL-PATH LEAK DETECTED ($($leaks.Count)):"
    $leaks | ForEach-Object { Write-Host ("   LEAK| " + $_) }
    throw "真实环境路径泄漏 —— 已中止演练（禁止继续）"
  }
  # 注意：以下 echo 用 Write-Host（不进入管道），避免污染函数返回值
  foreach ($l in $out) { Write-Host ("  | " + $l) }
  Write-Host ("EXIT=$rc  ; realPathLeak=0")
  $script:LastInstallOut = $out
  return [int]$rc
}

# ── 文件面快照：相对路径 + 长度 + SHA256；reparse 记 LINK 且不递归 ────────────
function Get-TreeSnapshot {
  param([Parameter(Mandatory=$true)][string]$Root)
  $Root = Assert-IsoPath $Root
  $list = New-Object System.Collections.Generic.List[string]
  if (-not (Test-Path $Root)) { return @('MISSING|' + $Root) }
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
  }
  $legacy = Join-Path $DshHome "profiles\node_modules\dsh-novel-writing"
  $res.LegacyLinkExists = Test-Path $legacy
  if ($res.LegacyLinkExists) {
    $it2 = Get-Item $legacy -Force
    $res.LegacyLinkTarget = ($it2.Target -join ',')
    $pj2 = Join-Path $legacy 'package.json'
    $res.LegacyInstalledVersion = if (Test-Path $pj2) { (Get-Content $pj2 -Raw | ConvertFrom-Json).version } else { 'n/a' }
  }
  $ppj = Join-Path $pd 'package.json'
  if (Test-Path $ppj) {
    $p = Get-Content $ppj -Raw | ConvertFrom-Json
    $res.ProfileDep     = $p.dependencies.'dsh-novel-writing'
    $res.ProfileBundles = (@($p.dsh.profile.bundles) -join ',')
  }
  $cp = Join-Path $pd 'cordis.patch.yml'
  if (Test-Path $cp) { $res.PatchRowCount = ([regex]::Matches((Get-Content $cp -Raw),'name: dsh-novel-writing')).Count }
  $preset = Join-Path $DshHome '.agent-presets\novel-writing'
  $res.PresetExists = Test-Path (Join-Path $preset 'agent.cordis.yml')
  $res.PresetFiles  = (Get-ChildItem $preset -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object).Count
  $sy = Join-Path $DshHome 'settings.yaml'
  if (Test-Path $sy) {
    $res.SettingsHasSection = [bool](Select-String -Path $sy -Pattern '(?m)^novel-writing:\s*$' -Quiet)
    $res.SettingsNsCount    = @(Select-String -Path $sy -Pattern '(?m)^novel-writing:\s*$' -AllMatches).Count
  }
  return $res
}

# ── 断开插件链接（模拟「换版本重装」需要重建链接的场景；仅隔离根内）──────────
function Reset-PluginLink {
  param([Parameter(Mandatory=$true)][string]$DshHome,[string]$Profile='web')
  $DshHome = Assert-IsoPath $DshHome
  foreach ($cand in @((Join-Path $DshHome "profiles\$Profile\node_modules\dsh-novel-writing"),(Join-Path $DshHome 'profiles\node_modules\dsh-novel-writing'))) {
    if (Test-Path $cand) {
      $it = Get-Item $cand -Force
      if ([bool]($it.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { $it.Delete(); Write-Output "  已移除隔离链接：$cand" }
    }
  }
}
