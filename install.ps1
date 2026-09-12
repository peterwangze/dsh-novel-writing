# dsh-novel-writing 安装脚本（Windows / PowerShell 5.1+）
# 在线：powershell -ExecutionPolicy Bypass -Command "iex (((irm https://raw.githubusercontent.com/peterwangze/dsh-novel-writing/main/install.ps1) -join [Environment]::NewLine).TrimStart([char]0xFEFF))"
# 离线：解压发行包后，在包目录内执行  .\install.ps1 -LocalPath .
# 环境变量 DSH_HOME 可覆盖配置目录（默认 ~/.dsh）；-Profile 指定目标 profile（默认 web）。
#
# 安装内容（自动检测 dsh 布局版本，双通道自适应）：
#   1) 把插件包接入 node_modules（junction 优先，失败回退拷贝）——
#      新布局（dsh ≥0.1.5，特征 = <DSH_HOME>\profiles\<Profile>\package.json 存在）：
#        接入 <DSH_HOME>\profiles\<Profile>\node_modules，并幂等注册 profile package.json
#        （dependencies.dsh-novel-writing = file:<源码路径> + dsh.profile.bundles 追加，
#        dsh ≥0.1.5 官方注册通道）；
#      旧布局（≤0.1.2）：接入 <DSH_HOME>\profiles\node_modules（行为不变）；
#   2) 在 <DSH_HOME>\profiles\<Profile>\cordis.patch.yml 幂等插入一行（两种布局通用兜底，
#      已独立验证有效）：
#        - id: novel-writing
#          name: dsh-novel-writing
#      （dual-face 包：宿主小说管理服务 + 浏览器「小说工作台」）；
#   3) 同步 agent 预设到 <DSH_HOME>\.agent-presets\novel-writing\（agent.cordis.yml +
#      26+ SKILL + agents 参考文档，之后 roster 里可直接选择「小说写作工作流」）；
#   4) 若 settings.yaml 没有 novel-writing 节，写入默认配置（开箱即用）。
#
# ─────────────────────────────────────────────────────────────────────────────
# 宿主布局契约（HOST LAYOUT CONTRACT）——单点清单；唯一事实源 = lib/host-contract.mjs 面 4 / 面 5。
# host-contract:v1
#   [4.1] 布局特征名 = profiles/<Profile>/package.json
#   [4.2] 接入通道名 = junction/symlink
#   [4.3] 注册通道名 = dependencies.dsh-novel-writing + dsh.profile.bundles
#   [4.4] 兜底注册通道 = cordis.patch.yml
#   [5.5] 预设目录约定 = .agent-presets/<preset-id>/
# 固定标记行 `host-contract:v1` 是 CI 正则对账锚点（test/fixtures/host-surfaces/probe-face.mjs ⑧，在 sanity 步骤内
# 执行）：改动任一约定字面量 MUST 同步本块 + lib/host-contract.mjs 对应条目——三者不一致即 CI 红（防「脚本知识
# vs 契约声明」静默漂移）。本块为纯注释、无可执行语句：install 行为零变化（COMPAT-009 强等价证据见 CHANGELOG）。
# ─────────────────────────────────────────────────────────────────────────────

param(
  [string]$RepoUrl = 'https://github.com/peterwangze/dsh-novel-writing.git',
  [string]$Ref = 'main',
  [string]$LocalPath = '',
  [string]$Profile = 'web'
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

# ── 3c. 幂等写入 cordis.patch.yml（两种布局通用兜底，已独立验证有效）────────────
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

if (-not (Test-Path $patch)) {
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

# ── 4. 同步 agent 预设 ─────────────────────────────────────────────────
$presetSrc = Join-Path $src 'agent-presets\novel-writing'
$presetDst = Join-Path $dshHome '.agent-presets\novel-writing'
if (Test-Path (Join-Path $presetSrc 'agent.cordis.yml')) {
  New-Item -ItemType Directory -Path $presetDst -Force | Out-Null
  robocopy $presetSrc $presetDst /E /XD .git /NFL /NDL /NJH /NJS | Out-Null
  if ($LASTEXITCODE -gt 7) { Write-Error "预设同步失败（robocopy 退出码 $LASTEXITCODE）" }
  Write-Step "agent 预设已同步：$presetDst（roster 中显示为「小说写作工作流」）"
} else {
  Write-Warning "未找到包内预设目录：$presetSrc（跳过预设同步）"
}

# ── 5. 幂等写入默认配置（settings.yaml：novel-writing 节）─────────────
$settingsFile = Join-Path $dshHome 'settings.yaml'
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

Write-Host ''
Write-Host "[OK] dsh-novel-writing 安装完成（源码：$src；profile：$Profile）"
if ($newLayout) {
  Write-Host "  已注册 profile dependencies + bundles（dsh ≥0.1.5）+ patch 行兜底双保险。"
} else {
  Write-Host "  已接入全局 profiles\node_modules + patch 行（dsh 旧布局）。"
}
Write-Host "  请重启 DSH。然后在预设选择器中选「小说写作工作流」开始创作；"
Write-Host "  浏览器会话顶部「小说」标签 = 工作台（实时渲染/章节编辑/发布/数据）。"
