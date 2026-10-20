# dsh-novel-writing 安装脚本（Windows / PowerShell 5.1+）
# 在线：powershell -ExecutionPolicy Bypass -Command "iex (((irm https://raw.githubusercontent.com/peterwangze/dsh-novel-writing/main/install.ps1) -join [Environment]::NewLine).TrimStart([char]0xFEFF))"
# 离线：解压发行包后，在包目录内执行  .\install.ps1 -LocalPath .
# 环境变量 DSH_HOME 可覆盖配置目录（默认 ~/.dsh）；-Profile 指定目标 profile（默认 web）。
#
# 安装内容（自动检测 dsh 布局版本与宿主代系，双通道自适应）：
#   1) 把插件包接入 node_modules（junction 优先，失败回退拷贝）——
#      新布局（dsh ≥0.1.5，特征 = <DSH_HOME>\profiles\<Profile>\package.json 存在）：
#        接入 <DSH_HOME>\profiles\<Profile>\node_modules，并幂等注册 profile package.json
#        （dependencies.dsh-novel-writing = file:<源码路径> + dsh.profile.bundles 追加，
#        dsh ≥0.1.5 官方注册通道）；
#      旧布局（≤0.1.2）：接入 <DSH_HOME>\profiles\node_modules（行为不变）；
#   2) 在 <DSH_HOME>\profiles\<Profile>\cordis.patch.yml 幂等插入宿主行（按宿主代系分流）：
#      0.1.x（两种布局通用兜底，已独立验证有效）：
#        - id: novel-writing
#          name: dsh-novel-writing
#      0.2.0+（声明代）：**不插入**，并撤除本安装器历史版本插入的同 id insert 行——宿主行 + 预设
#      声明行均由包内 cordis.patch.yml 经 bundles 通道承载；profile patch 同 id insert 会形成
#      双层同 id 条目，宿主 SettingsForms 对该条目写 config 即 fatal（"Configuration for
#      novel-writing is overridden by a home patch or command-line overlay"，隔离实例 2026-10-16
#      实证；宿主自身的 id-targeted config 覆盖行不受影响、保持不动）；
#   3) agent 预设（按宿主代系分流）：
#      0.1.x：同步到 <DSH_HOME>\.agent-presets\novel-writing\（agent.cordis.yml + 26+ SKILL）；
#      0.2.0+：跳过（.agent-presets 目录机制已废弃——预设组合由 bundle patch 声明行承载）；
#   4) 配置（按宿主代系分流）：
#      0.1.x：settings.yaml 无 novel-writing 节则写默认配置（开箱即用）；
#      0.2.0+：不写（配置默认值由插件 Config 声明承载）；若检测到 settings.yaml.imported
#      残留 novel-writing 节（旧配置被宿主一次性迁移丢弃），打印恢复指引。
#
# ─────────────────────────────────────────────────────────────────────────────
# 宿主布局契约（HOST LAYOUT CONTRACT）——单点清单；唯一事实源 = lib/host-contract.mjs 面 4 / 面 5。
# host-contract:v1
#   [4.1] 布局特征名 = profiles/<Profile>/package.json
#   [4.2] 接入通道名 = junction/symlink
#   [4.3] 注册通道名 = dependencies.dsh-novel-writing + dsh.profile.bundles
#   [4.4] 兜底注册通道 = cordis.patch.yml
#   [4.7] 0.2.0 声明代探测 = @deepseek-ai/dsh-agent-preset
#   [5.5] 预设目录约定 = .agent-presets/<preset-id>/
# 注（BUG-011 / REVIEW-BUG-011-R1 P1-5）：[4.7] = 宿主闭包能力探测——解析**实际 dsh 安装根**
#   （dsh 可执行文件位置 → npm/pnpm 全局根）后判其闭包含 @deepseek-ai/dsh-agent-preset 包 ⇒ 0.2.0 声明代；
#   0.1.5-rc.2 闭包无此包。[5.5] 目录机制 0.2.0+ 已废弃（预设组合由 bundle patch 声明行承载）。
#   三态 decl / legacy / unknown；**unknown 时 fail-safe：不插 insert、不写 settings.yaml、不同步预设目录**
#   （0.2.x 上插 insert 会制造「双层同 id」fatal，RISK-011③ 实证），可用 -HostGeneration 显式指定代系。
# （旧注：0.1.x 行为不变——步骤 3/4 仍按代系分流。）
# 固定标记行 `host-contract:v1` 是 CI 正则对账锚点（test/fixtures/host-surfaces/probe-face.mjs ⑧，在 sanity 步骤内
# 执行）：改动任一约定字面量 MUST 同步本块 + lib/host-contract.mjs 对应条目——三者不一致即 CI 红（防「脚本知识
# vs 契约声明」静默漂移）。本块为纯注释、无可执行语句：install 行为零变化（COMPAT-009 强等价证据见 CHANGELOG）。
# ─────────────────────────────────────────────────────────────────────────────

param(
  [string]$RepoUrl = 'https://github.com/peterwangze/dsh-novel-writing.git',
  [string]$Ref = 'main',
  [string]$LocalPath = '',
  [string]$Profile = 'web',
  # 宿主代系覆盖（R1 P1-5 / R2 P2-14）：auto=自动探测；decl=强制 0.2.0+；legacy=强制 0.1.x；
  # unknown=显式 fail-safe（与 install.sh 对称：不插 insert / 不写 settings / 不同步预设 / 不撤除）。
  # 自动探测定位不到 dsh 安装根时同样 fail-safe（宁可少做，不可制造「双层同 id」fatal）。
  [ValidateSet('auto', 'decl', 'legacy', 'unknown')]
  [string]$HostGeneration = 'auto'
)

$ErrorActionPreference = 'Stop'
$script:PluginName = 'dsh-novel-writing'
$script:RowId = 'novel-writing'

function Write-Step([string]$text) { Write-Host "==> $text" }

# ── JSON 工具（新布局 profile package.json 幂等注册用；PS 5.1 兼容，保留既有键与键序）──
function ConvertTo-JsonText([string]$s) {
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    $code = [int]$ch
    if ($ch -eq '"') { [void]$sb.Append('\"') }
    elseif ($ch -eq '\') { [void]$sb.Append('\\') }
    elseif ($code -eq 10) { [void]$sb.Append('\n') }
    elseif ($code -eq 13) { [void]$sb.Append('\r') }
    elseif ($code -eq 9) { [void]$sb.Append('\t') }
    elseif ($code -lt 32) { [void]$sb.AppendFormat('\u{0:x4}', $code) }
    else { [void]$sb.Append($ch) }
  }
  '"' + $sb.ToString() + '"'
}

function ConvertTo-JsonIndented($value, [int]$indent) {
  $pad = ' ' * $indent
  if ($null -eq $value) { return 'null' }
  if ($value -is [bool]) { if ($value) { return 'true' } else { return 'false' } }
  if ($value -is [string]) { return (ConvertTo-JsonText $value) }
  if ($value -is [System.Management.Automation.PSCustomObject]) {
    $props = @($value.PSObject.Properties)
    if ($props.Count -eq 0) { return '{}' }
    $inner = ' ' * ($indent + 2)
    $parts = New-Object System.Collections.Generic.List[string]
    foreach ($p in $props) { $parts.Add(($inner + (ConvertTo-JsonText $p.Name) + ': ' + (ConvertTo-JsonIndented $p.Value ($indent + 2)))) }
    return "{`n" + ($parts -join ",`n") + "`n" + $pad + '}'
  }
  if ($value -is [System.Array] -or $value -is [System.Collections.IEnumerable]) {
    $items = @($value)
    if ($items.Count -eq 0) { return '[]' }
    $inner = ' ' * ($indent + 2)
    $parts = New-Object System.Collections.Generic.List[string]
    foreach ($item in $items) { $parts.Add(($inner + (ConvertTo-JsonIndented $item ($indent + 2)))) }
    return "[`n" + ($parts -join ",`n") + "`n" + $pad + ']'
  }
  return $value.ToString([System.Globalization.CultureInfo]::InvariantCulture)
}

function Add-PropertyBefore([object]$obj, [string]$before, [string]$name, $value) {
  # 在键 $before 之前插入新键 $name（$before 不存在则追加到末尾），其余键序原样保留
  $new = New-Object psobject
  $inserted = $false
  foreach ($p in $obj.PSObject.Properties) {
    if ((-not $inserted) -and ($p.Name -eq $before)) {
      Add-Member -InputObject $new -MemberType NoteProperty -Name $name -Value $value
      $inserted = $true
    }
    Add-Member -InputObject $new -MemberType NoteProperty -Name $p.Name -Value $p.Value
  }
  if (-not $inserted) { Add-Member -InputObject $new -MemberType NoteProperty -Name $name -Value $value }
  return $new
}

$homeRaw = $env:DSH_HOME
if (-not $homeRaw) { $homeRaw = Join-Path $env:USERPROFILE '.dsh' }
$dshHome = [System.IO.Path]::GetFullPath($homeRaw)
$src = ''
$offline = $false

# ── 1. 定位源码 ────────────────────────────────────────────────────────
if ($LocalPath) {
  $src = [System.IO.Path]::GetFullPath($LocalPath)
  if (-not (Test-Path (Join-Path $src 'package.json'))) {
    Write-Error "离线安装目录无效：$src 下找不到 package.json（请指向解压后的包根目录）"
  }
  $offline = $true
  Write-Step "离线模式：使用本地源码 $src"
} else {
  $src = Join-Path $dshHome "plugins-src\$script:PluginName"
  if (Test-Path (Join-Path $src '.git')) {
    Write-Step "源码目录已存在，git 更新（分支 $Ref）…"
    git -C $src fetch --depth 1 origin $Ref
    if ($LASTEXITCODE -ne 0) { Write-Error "git fetch 失败（退出码 $LASTEXITCODE）：请检查网络/代理后重试，或改用离线安装" }
    git -C $src checkout -q $Ref
    if ($LASTEXITCODE -ne 0) { Write-Error "git checkout 失败（退出码 $LASTEXITCODE）" }
    git -C $src pull -q --ff-only origin $Ref
    if ($LASTEXITCODE -ne 0) { Write-Error "git pull 失败（退出码 $LASTEXITCODE）" }
  } else {
    Write-Step "git clone ${RepoUrl}（分支 $Ref）…"
    New-Item -ItemType Directory -Path (Split-Path $src -Parent) -Force | Out-Null
    git clone --depth 1 --branch $Ref $RepoUrl $src
    if ($LASTEXITCODE -ne 0) { Write-Error "git clone 失败（退出码 $LASTEXITCODE）：请检查网络/代理后重试，或改用离线安装" }
    if (-not (Test-Path (Join-Path $src 'package.json'))) { Write-Error "git clone 未生成源码目录：$src 下找不到 package.json" }
  }
}

# ── 布局检测（步骤 2/3 按此分流）：profiles\<Profile>\package.json 存在 = dsh ≥0.1.5 新布局
$profileDir = Join-Path $dshHome "profiles\$Profile"
$newLayout = Test-Path (Join-Path $profileDir 'package.json')

# ── 宿主代系探测（BUG-011；能力检测，非版本号字符串）──────────────────────────
# 判据 = dsh **实际安装根**的闭包内含 @deepseek-ai/dsh-agent-preset（0.2.0 声明代首版包；0.1.5-rc.2 闭包无）。
# 安装根按「dsh 可执行文件位置 → npm 全局根」逐一解析（覆盖 npm/pnpm/yarn 全局、非 npm 前缀、
# 源码 checkout 运行等形态）——原实现只查 `npm root -g`，在非 npm-global 安装下误判 0.1.x。
# **三态 + fail-safe（REVIEW-BUG-011-R1 P1-5）**：
#   decl    = 0.2.0+ 声明代 → 不插 insert、不写 settings.yaml（行为同前）
#   legacy  = 确定的 0.1.x → 原 0.1.x 分支（插 insert / 同步 .agent-presets / 写 settings.yaml）
#   unknown = 定位不到 dsh 安装根 → **不插行、不写 settings.yaml、也不撤除**（在 0.2.x 上插 insert
#             会制造「双层同 id」fatal —— RISK-011③ 隔离实例实证；在 0.1.x 上撤除自有 insert 会摘掉宿主行），
#             只打印指引并要求用 -HostGeneration 显式指定代系后重跑。
$hostGen = 'unknown'
$dshInstallRoot = ''
function Resolve-DshInstallRoots {
  $roots = New-Object System.Collections.Generic.List[string]
  $dshCmd = Get-Command dsh -ErrorAction SilentlyContinue
  if ($dshCmd -and $dshCmd.Source) {
    $binDir = Split-Path -Parent $dshCmd.Source
    foreach ($cand in @(
        (Join-Path $binDir 'node_modules\@deepseek-ai\dsh'),
        (Join-Path $binDir '..\lib\node_modules\@deepseek-ai\dsh'),
        (Join-Path $binDir '..\node_modules\@deepseek-ai\dsh'))) {
      try { $roots.Add([System.IO.Path]::GetFullPath($cand)) } catch { }
    }
  }
  if ($env:npm_config_prefix) {
    try { $roots.Add([System.IO.Path]::GetFullPath((Join-Path $env:npm_config_prefix 'node_modules\@deepseek-ai\dsh'))) } catch { }
  }
  try {
    $npmRootRaw = (npm root -g 2>$null | Select-Object -First 1)
    if ($npmRootRaw) {
      $npmRoot = (([string]$npmRootRaw) -replace [char]0xFEFF, '').Trim() -replace "`r|`n", ''
      if ($npmRoot -ne '') { $roots.Add((Join-Path $npmRoot '@deepseek-ai\dsh')) }
    }
  } catch { }
  return $roots
}
try {
  foreach ($candRoot in (Resolve-DshInstallRoots)) {
    if ((-not $candRoot) -or (-not (Test-Path (Join-Path $candRoot 'package.json')))) { continue }
    if (Test-Path (Join-Path $candRoot 'node_modules\@deepseek-ai\dsh-agent-preset')) {
      $hostGen = 'decl'; $dshInstallRoot = $candRoot; break   # 声明代优先（多候选时不被先见的旧根覆盖）
    }
    if ($hostGen -ne 'decl') { $hostGen = 'legacy'; $dshInstallRoot = $candRoot }
  }
} catch { $hostGen = 'unknown' }
$genSource = 'auto'
if ($HostGeneration -ne 'auto') {
  $hostGen = $HostGeneration
  $genSource = 'override'
}
if ($genSource -eq 'override') {
  if ($hostGen -eq 'unknown') { Write-Warning "已按 -HostGeneration unknown 指定：fail-safe 跳过 insert 行 / settings.yaml / 预设目录写入。" }
  else { Write-Step "宿主代系：按 -HostGeneration $hostGen 强制指定（未做能力探测）" }
} elseif ($hostGen -eq 'decl') {
  Write-Step "检测到 dsh 0.2.0+ 声明代宿主（dsh-agent-preset 在安装闭包）"
} elseif ($hostGen -eq 'legacy') {
  Write-Step "检测到 dsh 0.1.x 宿主（安装根 $dshInstallRoot，无 dsh-agent-preset）"
} else {
  Write-Warning "无法定位 dsh 安装根 ⇒ 无法判定宿主代系。按 fail-safe 跳过 insert 行 / settings.yaml 写入 / 预设目录同步（不制造「双层同 id」fatal）。确认宿主代系后请加 -HostGeneration legacy（0.1.x）/ decl（0.2.0+）重跑，或显式 -HostGeneration unknown 声明 fail-safe。"
}

# ── 2. 链接 / 拷贝到 node_modules（新布局 = profile 私有；旧布局 = 全局）────────
if ($newLayout) {
  $nodeModules = Join-Path $profileDir 'node_modules'
  Write-Step "检测到 dsh 新布局（≥0.1.5 per-profile）：接入 $nodeModules"
} else {
  $nodeModules = Join-Path $dshHome 'profiles\node_modules'
  Write-Step "检测到 dsh 旧布局（≤0.1.2 全局 node_modules）：接入 $nodeModules"
}
$dst = Join-Path $nodeModules $script:PluginName
New-Item -ItemType Directory -Path $nodeModules -Force | Out-Null

$linked = $false
if (Test-Path $dst) {
  $item = Get-Item $dst -Force
  $isLink = $item.LinkType -or ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
  if (-not $isLink) { Write-Error "$dst 已存在且不是链接：请先手动移除后重试" }
  Write-Step "链接已存在：$dst"
  $linked = $true
} else {
  try {
    New-Item -ItemType Junction -Path $dst -Target $src | Out-Null
    Write-Step "已创建 junction：$dst -> $src"
    $linked = $true
  } catch {
    Write-Warning "junction 创建失败（$($_.Exception.Message)）：改用目录拷贝"
  }
}

if ($linked) {
  $srcNodeModules = Join-Path $src 'node_modules'
  $hasDepTree = Test-Path $srcNodeModules
  if (-not $hasDepTree) {
    $dangling = Get-Item $srcNodeModules -Force -ErrorAction SilentlyContinue
    if ($dangling -and ($dangling.LinkType -or ($dangling.Attributes -band [System.IO.FileAttributes]::ReparsePoint))) { $dangling.Delete() }
    try {
      New-Item -ItemType Junction -Path $srcNodeModules -Target $nodeModules | Out-Null
      Write-Step "已创建依赖链接：$srcNodeModules -> $nodeModules"
    } catch {
      Write-Warning "依赖链接创建失败（$($_.Exception.Message)）：改用目录拷贝"
      (Get-Item $dst -Force).Delete()
      $linked = $false
    }
  }
}
if (-not $linked) {
  if (Test-Path $dst) { Write-Error "$dst 仍存在（链接移除失败）：已中止拷贝，请手动删除该链接后重试" }
  Write-Step "拷贝源码到 $dst …"
  robocopy $src $dst /E /XD .git node_modules /NFL /NDL /NJH /NJS | Out-Null
  if ($LASTEXITCODE -gt 7) { Write-Error "拷贝失败（robocopy 退出码 $LASTEXITCODE）" }
  Write-Step "拷贝完成：$dst"
}

# ── 3. 注册插件（新布局：profile package.json dependencies + bundles，官方通道）──
if ($newLayout) {
  $pkgFile = Join-Path $profileDir 'package.json'
  $srcNorm = ($src -replace '\\', '/')
  $depValue = "file:$srcNorm"
  try { $pkg = ConvertFrom-Json (([System.IO.File]::ReadAllText($pkgFile)).TrimStart([char]0xFEFF)) }
  catch { Write-Error "解析失败：$pkgFile（$($_.Exception.Message)）" }
  $pkgChanged = $false

  # 3a. dependencies.dsh-novel-writing = file:<src>（幂等：已有则跳过，不重复写）
  $depObj = $pkg.PSObject.Properties['dependencies']
  if ($null -eq $depObj -or -not ($depObj.Value -is [System.Management.Automation.PSCustomObject])) {
    $dep = New-Object psobject
    Add-Member -InputObject $dep -MemberType NoteProperty -Name $script:PluginName -Value $depValue
    $pkg = Add-PropertyBefore $pkg 'dsh' 'dependencies' $dep
    $pkgChanged = $true
    Write-Step "已写入 dependencies.$($script:PluginName) = $depValue"
  } elseif ($null -eq $depObj.Value.PSObject.Properties[$script:PluginName]) {
    Add-Member -InputObject $depObj.Value -MemberType NoteProperty -Name $script:PluginName -Value $depValue
    $pkgChanged = $true
    Write-Step "已写入 dependencies.$($script:PluginName) = $depValue"
  } else {
    Write-Step "dependencies.$($script:PluginName) 已注册，跳过"
  }

  # 3b. dsh.profile.bundles 追加（幂等：已含则跳过，不重复追加）
  $dshObj = $pkg.PSObject.Properties['dsh']
  if ($null -eq $dshObj -or -not ($dshObj.Value -is [System.Management.Automation.PSCustomObject])) {
    $bundles0 = New-Object psobject
    Add-Member -InputObject $bundles0 -MemberType NoteProperty -Name 'bundles' -Value @($script:PluginName)
    $prof = New-Object psobject
    Add-Member -InputObject $prof -MemberType NoteProperty -Name 'profile' -Value $bundles0
    Add-Member -InputObject $pkg -MemberType NoteProperty -Name 'dsh' -Value $prof
    $pkgChanged = $true
  } else {
    $profObj = $dshObj.Value.PSObject.Properties['profile']
    if ($null -eq $profObj -or -not ($profObj.Value -is [System.Management.Automation.PSCustomObject])) {
      $bundles0 = New-Object psobject
      Add-Member -InputObject $bundles0 -MemberType NoteProperty -Name 'bundles' -Value @($script:PluginName)
      Add-Member -InputObject $dshObj.Value -MemberType NoteProperty -Name 'profile' -Value $bundles0
      $pkgChanged = $true
    } else {
      $bundlesObj = $profObj.Value.PSObject.Properties['bundles']
      if ($null -eq $bundlesObj) {
        Add-Member -InputObject $profObj.Value -MemberType NoteProperty -Name 'bundles' -Value @($script:PluginName)
        $pkgChanged = $true
      } elseif (@($bundlesObj.Value) -notcontains $script:PluginName) {
        $profObj.Value.bundles = @($bundlesObj.Value) + $script:PluginName
        $pkgChanged = $true
      }
    }
  }

  if ($pkgChanged) {
    [System.IO.File]::WriteAllText($pkgFile, ((ConvertTo-JsonIndented $pkg 0) + "`n"), (New-Object System.Text.UTF8Encoding($false)))
    Write-Step "已注册 profile dependencies + bundles（dsh ≥0.1.5）：$pkgFile"
  } else {
    Write-Step "profile package.json 注册项已齐全，跳过写入"
  }
}

# ── 3c. cordis.patch.yml 宿主行（按宿主代系分流）─────────────────────────────
New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
$patch = Join-Path $profileDir 'cordis.patch.yml'

function New-PatchTemplate {
  @(
    '# Added by dsh-novel-writing installer: automated novel writing & publishing pipeline.',
    '# - `novel-writing` : novel management service + agent preset sync + browser studio',
    '- insert:',
    '    - id: novel-writing',
    '      name: dsh-novel-writing',
    ''
  ) -join "`n"
}

if ($hostGen -eq 'decl') {
  # 0.2.0 声明代（BUG-011）：宿主行 + 预设声明行由包内 cordis.patch.yml 经 bundles 通道承载——
  # 此处**不插入**；且幂等撤除本安装器历史版本（≤0.1.5 双保险时代）插入的同 id insert 行：
  # 双层同 id 条目会让宿主 SettingsForms 对本条目写 config 即 fatal（隔离实例实证
  # "Configuration for novel-writing is overridden by a home patch or command-line overlay"）。
  # 撤除范围严格限定在 `- insert:` 块内的 novel-writing 条目；顶层的 id-targeted 覆盖行
  # （宿主设置面写入的 config，形如顶格 `- id: novel-writing` + `config:`）**绝不触碰**。
  $removed = $false
  if (Test-Path $patch) {
    $content = [System.IO.File]::ReadAllText($patch)
    if ($content.Contains('name: dsh-novel-writing') -and $content -match '(?m)^\s*-\s+insert:\s*$') {
      $lines = ($content -replace "`r`n", "`n").Split("`n")
      for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -notmatch '^\s*(-\s+)?insert:\s*$') { continue }
        $insertIndent = ([regex]::Match($lines[$i], '^\s*')).Value.Length
        # 求该 insert 块的条目缩进（块内首个非空非注释行）
        $itemIndent = -1
        for ($j = $i + 1; $j -lt $lines.Length; $j++) {
          $l = $lines[$j]
          if ($l -match '^\s*$' -or $l -match '^\s*#') { continue }
          $ind = ([regex]::Match($l, '^\s*')).Value.Length
          if ($ind -le $insertIndent) { break }
          if ($itemIndent -lt 0) { $itemIndent = $ind }
        }
        if ($itemIndent -lt 0) { continue }
        # 块边界（首个缩进 ≤ insert 键缩进的行之前）
        $blockEnd = $i + 1
        while ($blockEnd -lt $lines.Length) {
          $l = $lines[$blockEnd]
          if ($l -match '^\s*$' -or $l -match '^\s*#') { $blockEnd++; continue }
          $ind = ([regex]::Match($l, '^\s*')).Value.Length
          if ($ind -le $insertIndent) { break }
          $blockEnd++
        }
        # 块内逐条目过滤：条目起始行 = 恰在 itemIndent 缩进的 `- `；命中「- id: novel-writing 且次行 name: dsh-novel-writing」即整条摘除
        $window = New-Object System.Collections.Generic.List[string]
        $keep = $true; $sawTarget = $false
        for ($j2 = $i + 1; $j2 -lt $blockEnd; $j2++) {
          $l = $lines[$j2]
          if ($l -match ('^ {' + $itemIndent + '}- ')) {
            $isOurs = ($l -match ('^ {' + $itemIndent + '}- id:\s*novel-writing\s*$')) -and ($j2 + 1 -lt $blockEnd) -and ($lines[$j2 + 1] -match '^\s*name:\s*dsh-novel-writing\s*$')
            if ($isOurs) { $sawTarget = $true }
            $keep = -not $isOurs
          }
          if ($keep) { $window.Add($l) }
        }
        if (-not $sawTarget) { continue }
        # 块内已无任何条目 ⇒ 连 insert 键一并撤除
        $hasItem = $false
        foreach ($wl in $window) { if ($wl -match ('^ {' + $itemIndent + '}- ')) { $hasItem = $true; break } }
        $rebuilt = New-Object System.Collections.Generic.List[string]
        for ($k = 0; $k -lt $i; $k++) { $rebuilt.Add($lines[$k]) }
        if ($hasItem) { $rebuilt.Add($lines[$i]); foreach ($wl in $window) { $rebuilt.Add($wl) } }
        for ($k = $blockEnd; $k -lt $lines.Length; $k++) { $rebuilt.Add($lines[$k]) }
        $lines = $rebuilt.ToArray()
        $removed = $true
        break # 单块处理即可：本安装器只写过一个 insert 块
      }
      if ($removed) {
        $body = ($lines -join "`n") + "`n"
        # 文件已无任何条目（只剩注释/空行）⇒ 归一为空列表根（注释型空文档对 loader 是 null，不安全）
        $hasAnyEntry = $false
        foreach ($l in $lines) { if ($l -match '^\s*-\s+') { $hasAnyEntry = $true; break } }
        if (-not $hasAnyEntry) { $body = "[]`n" }
        [System.IO.File]::WriteAllText($patch, $body, (New-Object System.Text.UTF8Encoding($false)))
        Write-Step "已撤除历史 insert 宿主行（0.2.0 双通道同 id 冲突防护）：$patch"
      } else {
        Write-Step "0.2.0+ 宿主：宿主行/预设声明行由 bundle patch 承载，跳过 insert（检测到顶层 id-targeted 行，保持不动）"
      }
    } else {
      Write-Step "0.2.0+ 宿主：宿主行/预设声明行由 bundle patch 承载，跳过 insert"
    }
  } else {
    Write-Step "0.2.0+ 宿主：宿主行/预设声明行由 bundle patch 承载，跳过 insert"
  }
} elseif ($hostGen -eq 'unknown') {
  # fail-safe（REVIEW-BUG-011-R1 P1-5）：代系未知 ⇒ **不插 insert**（0.2.x 上会制造「双层同 id」fatal，
  # RISK-011③ 实证）**也不撤除**（0.1.x 上撤除自有 insert 会摘掉宿主行）。只提示，不做写操作。
  Write-Step "宿主代系未知（fail-safe）：跳过 cordis.patch.yml 的 insert 写入/撤除；确认代系后用 -HostGeneration 重跑"
} elseif (-not (Test-Path $patch)) {
  Write-Step "创建 $patch"
  [System.IO.File]::WriteAllText($patch, (New-PatchTemplate), (New-Object System.Text.UTF8Encoding($false)))
} else {
  $content = [System.IO.File]::ReadAllText($patch)
  if ($content.Contains("name: dsh-novel-writing")) {
    Write-Step "$patch 已配置，跳过"
  } else {
    $lines = ($content -replace "`r`n", "`n").Split("`n")
    # 找到顶层 insert 块并追加；找不到则新增条目（处理 [] 空根形态）
    $insertIndex = -1; $insertIndent = 0
    for ($i = 0; $i -lt $lines.Length; $i++) {
      if ($lines[$i] -match '^\s*(-\s+)?insert:\s*$') { $insertIndex = $i; $insertIndent = ([regex]::Match($lines[$i], '^\s*')).Value.Length; break }
    }
    $newEntry = @('', '- insert:', '    - id: novel-writing', '      name: dsh-novel-writing')
    if ($insertIndex -lt 0) {
      $result = New-Object System.Collections.Generic.List[string]
      $replaced = $false
      foreach ($line in $lines) {
        if (-not $replaced -and $line -match '^\s*\[\]\s*$') { $result.Add($newEntry[1]); $result.Add($newEntry[2]); $result.Add($newEntry[3]); $replaced = $true; continue }
        $result.Add($line)
      }
      if (-not $replaced) {
        $result.Add('')
        $result.Add($newEntry[1]); $result.Add($newEntry[2]); $result.Add($newEntry[3])
      }
      $lines = $result.ToArray()
    } else {
      $last = $insertIndex; $itemIndent = -1
      for ($i = $insertIndex + 1; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        if ($line -match '^\s*$' -or $line -match '^\s*#') { continue }
        $indent = ([regex]::Match($line, '^\s*')).Value.Length
        if ($indent -le $insertIndent) { break }
        if ($itemIndent -lt 0) { $itemIndent = $indent }
        $last = $i
      }
      if ($itemIndent -lt 0) { $itemIndent = 4 }
      $pad = ' ' * $itemIndent
      $result = New-Object System.Collections.Generic.List[string]
      for ($i = 0; $i -le $last; $i++) { $result.Add($lines[$i]) }
      $result.Add("${pad}- id: novel-writing")
      $result.Add("${pad}  name: dsh-novel-writing")
      for ($i = $last + 1; $i -lt $lines.Length; $i++) { $result.Add($lines[$i]) }
      $lines = $result.ToArray()
    }
    [System.IO.File]::WriteAllText($patch, (($lines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding($false)))
    Write-Step "已更新 ${patch}（插入 novel-writing 宿主行）"
  }
}

# ── 4. agent 预设（按宿主代系分流）───────────────────────────────────────
$presetSrc = Join-Path $src 'agent-presets\novel-writing'
$presetDst = Join-Path $dshHome '.agent-presets\novel-writing'
if ($hostGen -eq 'decl') {
  # 0.2.0+：.agent-presets 目录机制官方废弃（Nothing reads that directory any more）——
  # 预设组合由包内 cordis.patch.yml 的 @deepseek-ai/dsh-agent-preset 声明行经 bundles 通道承载。
  Write-Step "0.2.0+ 宿主：预设由 bundle patch 声明行承载（preset-novel-writing），跳过 .agent-presets 目录同步"
} elseif ($hostGen -eq 'unknown') {
  # fail-safe（REVIEW-BUG-011-R1 P1-5）：代系未知 ⇒ 不写 $DSH_HOME 预设目录（宁可少做），只提示。
  Write-Step "宿主代系未知（fail-safe）：跳过 .agent-presets 目录同步；0.2.0+ 由 bundle patch 声明行承载，0.1.x 需同步本目录"
} elseif (Test-Path (Join-Path $presetSrc 'agent.cordis.yml')) {
  New-Item -ItemType Directory -Path $presetDst -Force | Out-Null
  robocopy $presetSrc $presetDst /E /XD .git /NFL /NDL /NJH /NJS | Out-Null
  if ($LASTEXITCODE -gt 7) { Write-Error "预设同步失败（robocopy 退出码 $LASTEXITCODE）" }
  Write-Step "agent 预设已同步：$presetDst（roster 中显示为「小说写作工作流」）"
} else {
  Write-Warning "未找到包内预设目录：$presetSrc（跳过预设同步）"
}

# ── 5. 配置默认值 / 数据迁移提示（按宿主代系分流）────────────────────────
$settingsFile = Join-Path $dshHome 'settings.yaml'
$importedFile = Join-Path $dshHome 'settings.yaml.imported'
if ($hostGen -eq 'decl') {
  # 0.2.0+：全局 settings.yaml 机制整体移除——不写默认节（插件 Config 声明承载默认值；
  # 写了也会触发宿主一次性 importLegacyDocument rename 副作用）。
  $importedHasNv = $false
  if (Test-Path $importedFile) {
    try { if (([System.IO.File]::ReadAllText($importedFile) -match '(?m)^novel-writing:\s*$')) { $importedHasNv = $true } } catch { }
  }
  if ($importedHasNv) {
    Write-Host ''
    Write-Host "[数据迁移] 检测到 $importedFile 含 novel-writing 配置节（小说↔会话绑定等）。" -ForegroundColor Yellow
    Write-Host "  0.2.0 宿主的旧文档导入器存在时序缺陷（inactive context 写入失败即丢节，隔离实例实证），" -ForegroundColor Yellow
    Write-Host "  本插件已内置自动迁移：下次启动 dsh 后自动把该节读入 profile（工作区根/绑定/平台配置恢复）；" -ForegroundColor Yellow
    Write-Host "  也可在工作台调用 /novel-writing/api/settings-migrate 手动触发（body {""force"":true} 可越过全新护栏）。" -ForegroundColor Yellow
    Write-Host "  迁移成功后 .imported 存档不再被读取，确认工作台数据无误后可自行归档删除。" -ForegroundColor Yellow
  } else {
    Write-Step "0.2.0+ 宿主：配置默认值由插件 Config 声明承载，跳过 settings.yaml 写入"
  }
} elseif ($hostGen -eq 'legacy') {
  $defaultConfig = @(
    'novel-writing:'
    '  enabled: true'
    '  workspaceRoot: ""'
    '  pollMs: 2000'
    '  apiPublic: false'
  ) -join "`n"
  if (Test-Path $settingsFile) {
    $settingsContent = [System.IO.File]::ReadAllText($settingsFile)
    if ($settingsContent -match '(?m)^novel-writing:\s*$') {
      Write-Step "$settingsFile 已含 novel-writing 节，跳过默认配置写入"
    } else {
      $nl = if ($settingsContent.EndsWith("`n")) { '' } else { "`n" }
      [System.IO.File]::WriteAllText($settingsFile, $settingsContent + $nl + $defaultConfig + "`n", (New-Object System.Text.UTF8Encoding($false)))
      Write-Step "已写入默认配置到 ${settingsFile}"
    }
  } else {
    [System.IO.File]::WriteAllText($settingsFile, $defaultConfig + "`n", (New-Object System.Text.UTF8Encoding($false)))
    Write-Step "已创建 ${settingsFile}（默认配置）"
  }
} else {
  # fail-safe（REVIEW-BUG-011-R1 P1-5）：代系未知 ⇒ 不写 settings.yaml——在 0.2.x 上写会触发宿主
  # importLegacyDocument rename 副作用；在 0.1.x 上少写仅损失「开箱默认值」（可由插件 Config 兜底）。
  Write-Step "宿主代系未知（fail-safe）：跳过 settings.yaml 默认节写入"
}

Write-Host ''
Write-Host "[OK] dsh-novel-writing 安装完成（源码：$src；profile：$Profile）"
if ($newLayout) {
  Write-Host "  已注册 profile dependencies + bundles（dsh ≥0.1.5）+ patch 行兜底双保险。"
} else {
  Write-Host "  已接入全局 profiles\node_modules + patch 行（dsh 旧布局）。"
}
if ($hostGen -eq 'decl') {
  Write-Host "  0.2.0+ 宿主：预设「小说写作工作流」由 bundle patch 声明行注册（重启后在预设选择器可选）。"
} elseif ($hostGen -eq 'unknown') {
  Write-Host "  ⚠ 宿主代系未知：已按 fail-safe 跳过 insert/settings/预设目录写入——确认代系后加 -HostGeneration 重跑。"
}
Write-Host "  请重启 DSH。然后在预设选择器中选「小说写作工作流」开始创作；"
Write-Host "  浏览器会话顶部「小说」标签 = 工作台（实时渲染/章节编辑/发布/数据）。"
