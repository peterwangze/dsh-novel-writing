#!/bin/sh
# dsh-novel-writing 安装脚本（macOS / Linux / Git Bash）
# 在线：curl -fsSL https://raw.githubusercontent.com/peterwangze/dsh-novel-writing/main/install.sh | sh
# 离线：解压发行包后，在包目录内执行  ./install.sh --local .
# 环境变量 DSH_HOME 可覆盖配置目录（默认 ~/.dsh）；--profile 指定目标 profile（默认 web）。
# 自动检测 dsh 布局版本与宿主代系（双通道自适应）：0.1.5+ per-profile（profiles/<Profile>/package.json
# 存在 → 接入 profile 私有 node_modules 并注册 package.json dependencies + dsh.profile.bundles，
# 注册用 node -e，无 node 时回退 python3，两者皆无则降级仅写 patch 行并提示）/ 旧版全局（行为不变）；
# 两种布局均以 cordis.patch.yml 插行兜底。
# 宿主代系（BUG-011）：0.2.0+ 声明代（dsh 安装闭包含 @deepseek-ai/dsh-agent-preset）下，
# 预设由 bundle patch 声明行承载（跳过 .agent-presets 同步）、不写 settings.yaml 默认节
# （改打数据迁移提示）；0.1.x 分支行为不变。
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
#   （dsh 可执行文件位置 → npm 全局根）后判其闭包含 @deepseek-ai/dsh-agent-preset 包 ⇒ 0.2.0 声明代；
#   0.1.5-rc.2 闭包无此包。[5.5] 目录机制 0.2.0+ 已废弃（预设组合由 bundle patch 声明行承载）。
#   三态 decl / legacy / unknown；**unknown 时 fail-safe：不插 insert、不写 settings.yaml、不同步预设目录**
#   （0.2.x 上插 insert 会制造「双层同 id」fatal，RISK-011③ 实证），可用 --host-generation 显式指定代系。
# 固定标记行 `host-contract:v1` 是 CI 正则对账锚点（test/fixtures/host-surfaces/probe-face.mjs ⑧，在 sanity 步骤内
# 执行）：改动任一约定字面量 MUST 同步本块 + lib/host-contract.mjs 对应条目——三者不一致即 CI 红（防「脚本知识
# vs 契约声明」静默漂移）。本块为纯注释、无可执行语句：install 行为零变化（COMPAT-009 强等价证据见 CHANGELOG）。
# ─────────────────────────────────────────────────────────────────────────────
set -e

REPO_URL='https://github.com/peterwangze/dsh-novel-writing.git'
REF='main'
LOCAL=''
PROFILE='web'
# 宿主代系覆盖（R1 P1-5 / R2 P2-13）：auto / decl（0.2.0+）/ legacy（0.1.x）/ unknown（显式 fail-safe）。
HOST_GEN_OVERRIDE='auto'
while [ $# -gt 0 ]; do
  case "$1" in
    --local) LOCAL="$2"; shift 2 ;;
    --profile) PROFILE="$2"; shift 2 ;;
    --host-generation) case "$2" in auto|decl|legacy|unknown) HOST_GEN_OVERRIDE="$2" ;; *) echo "错误：--host-generation 的值非法：'$2'（合法值：auto|decl|legacy|unknown）" >&2; exit 2 ;; esac; shift 2 ;;
    *) shift ;;
  esac
done

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PLUGIN='dsh-novel-writing'

echo "==> 定位源码"
if [ -n "$LOCAL" ]; then
  SRC="$(cd "$LOCAL" && pwd)"
  [ -f "$SRC/package.json" ] || { echo "离线安装目录无效：$SRC 下找不到 package.json" >&2; exit 1; }
  echo "    离线模式：$SRC"
else
  SRC="$DSH_HOME/plugins-src/$PLUGIN"
  if [ -d "$SRC/.git" ]; then
    echo "    已存在，git 更新（$REF）…"
    git -C "$SRC" fetch --depth 1 origin "$REF"
    git -C "$SRC" checkout -q "$REF"
    git -C "$SRC" pull -q --ff-only origin "$REF"
  else
    echo "    git clone $REPO_URL（$REF）…"
    mkdir -p "$(dirname "$SRC")"
    git clone --depth 1 --branch "$REF" "$REPO_URL" "$SRC"
    [ -f "$SRC/package.json" ] || { echo "git clone 未生成源码目录" >&2; exit 1; }
  fi
fi

# 布局检测（步骤按此分流）：profiles/<Profile>/package.json 存在 = dsh >=0.1.5 新布局
PDIR="$DSH_HOME/profiles/$PROFILE"
if [ -f "$PDIR/package.json" ]; then
  NEW_LAYOUT=1
  NM="$PDIR/node_modules"
  echo "==> 检测到 dsh 新布局（>=0.1.5 per-profile）：接入 $NM"
else
  NEW_LAYOUT=0
  NM="$DSH_HOME/profiles/node_modules"
  echo "==> 检测到 dsh 旧布局（<=0.1.2 全局 node_modules）：接入 $NM"
fi

# 宿主代系探测（BUG-011；能力检测，非版本号字符串）────────────────────────────
# 判据 = dsh **实际安装根**闭包含 @deepseek-ai/dsh-agent-preset（0.2.0 声明代首版包；0.1.5-rc.2 闭包无）。
# 安装根按「dsh 可执行文件位置 → npm 全局根」逐一解析（覆盖 npm/pnpm/yarn 全局、非 npm 前缀、源码 checkout）。
# 三态 + fail-safe（REVIEW-BUG-011-R1 P1-5）：decl / legacy / unknown；
#   unknown ⇒ 不插 insert、不写 settings.yaml、不同步预设目录（0.2.x 上插 insert 会制造「双层同 id」
#   fatal——RISK-011③ 隔离实例实证；0.1.x 上撤除自有 insert 会摘掉宿主行）。--host-generation 可显式指定。
HOST_GEN='unknown'
DSH_INSTALL_ROOT=''
resolve_dsh_roots() {
  if command -v dsh >/dev/null 2>&1; then
    dshbin=$(command -v dsh)
    i=0
    while [ -L "$dshbin" ] && [ "$i" -lt 5 ]; do
      tgt=$(readlink "$dshbin" 2>/dev/null) || break
      case "$tgt" in
        /*) dshbin="$tgt" ;;
        *) dshbin="$(dirname "$dshbin")/$tgt" ;;
      esac
      i=$((i + 1))
    done
    d=$(cd "$(dirname "$dshbin")" 2>/dev/null && pwd) || d=''
    if [ -n "$d" ]; then
      printf '%s\n' "$d/node_modules/@deepseek-ai/dsh"
      printf '%s\n' "$d/../lib/node_modules/@deepseek-ai/dsh"
      printf '%s\n' "$d/../node_modules/@deepseek-ai/dsh"
    fi
  fi
  if command -v npm >/dev/null 2>&1; then
    nr=$(npm root -g 2>/dev/null | head -n 1 | tr -d '\r') || nr=''
    if [ -n "$nr" ]; then printf '%s\n' "$nr/@deepseek-ai/dsh"; fi
  fi
  return 0
}
# 候选路径按**行**切分（保留路径中的空格，如 "C:\Program Files\nodejs\..."）
old_ifs=$IFS
IFS='
'
for cand in $(resolve_dsh_roots); do
  [ -f "$cand/package.json" ] || continue
  if [ -d "$cand/node_modules/@deepseek-ai/dsh-agent-preset" ]; then
    HOST_GEN='decl'; DSH_INSTALL_ROOT="$cand"; break
  fi
  if [ "$HOST_GEN" != 'decl' ]; then HOST_GEN='legacy'; DSH_INSTALL_ROOT="$cand"; fi
done
IFS=$old_ifs
HOST_GEN_SOURCE='auto'
if [ "$HOST_GEN_OVERRIDE" != 'auto' ]; then
  HOST_GEN="$HOST_GEN_OVERRIDE"
  HOST_GEN_SOURCE='override'
fi
if [ "$HOST_GEN_SOURCE" = 'override' ]; then
  if [ "$HOST_GEN" = 'unknown' ]; then
    echo "==> 已按 --host-generation unknown 指定：fail-safe 跳过 insert/settings/预设目录写入" >&2
  else
    echo "    宿主代系：按 --host-generation $HOST_GEN 强制指定（未做能力探测）"
  fi
else
  case "$HOST_GEN" in
    decl) echo "==> 检测到 dsh 0.2.0+ 声明代宿主（dsh-agent-preset 在安装闭包）" ;;
    legacy) echo "==> 检测到 dsh 0.1.x 宿主（安装根 $DSH_INSTALL_ROOT，无 dsh-agent-preset）" ;;
    *) echo "==> ⚠ 无法定位 dsh 安装根 ⇒ 无法判定宿主代系；按 fail-safe 跳过 insert/settings/预设目录写入（不制造「双层同 id」fatal）。确认代系后请加 --host-generation legacy|decl 重跑。" >&2 ;;
  esac
fi
DST="$NM/$PLUGIN"
mkdir -p "$NM"
if [ -e "$DST" ]; then
  echo "    已存在：$DST（跳过，如需重装请先删除）"
else
  if ln -s "$SRC" "$DST" 2>/dev/null; then
    echo "    已创建符号链接：$DST -> $SRC"
    if [ ! -d "$SRC/node_modules" ]; then
      ln -s "$NM" "$SRC/node_modules" 2>/dev/null || echo "    提示：依赖链接创建失败（插件依赖将由 profile 平坦树解析）"
    fi
  else
    cp -R "$SRC" "$DST"
    rm -rf "$DST/.git" "$DST/node_modules" 2>/dev/null || true
    echo "    已拷贝：$DST"
  fi
fi

# 注册 profile package.json（新布局官方通道：dependencies + dsh.profile.bundles；幂等）
PKG_REG=0
if [ "$NEW_LAYOUT" = "1" ]; then
  echo "==> 注册 profile package.json（dependencies + bundles）"
  SRC_NORM=$(printf '%s' "$SRC" | sed 's#\\#/#g')
  # Git Bash / Cygwin：pwd 给出 MSYS 风格路径（/d/...），Windows 原生 pnpm 无法解析——
  # 归一为 D:/... 混合形式（与 install.ps1 输出形态一致；cygpath 为 Git Bash 自带）。
  case "$(uname -s)" in
    MSYS*|MINGW*|CYGWIN*)
      command -v cygpath >/dev/null 2>&1 && SRC_NORM=$(cygpath -m "$SRC")
      ;;
  esac
  PKG_FILE="$PDIR/package.json"
  if command -v node >/dev/null 2>&1; then
    node -e '
const fs = require("fs");
const file = process.argv[1], val = process.argv[2], name = process.argv[3];
let pkg;
try { pkg = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")); }
catch (e) { console.error("    解析失败：" + file + "（" + e.message + "）"); process.exit(1); }
let changed = false;
const depOk = pkg.dependencies && typeof pkg.dependencies === "object" && !Array.isArray(pkg.dependencies);
if (!depOk) {
  const dep = {}; dep[name] = val;
  const out = {}; let ins = false;
  for (const k of Object.keys(pkg)) {
    if (!ins && k === "dsh") { out["dependencies"] = dep; ins = true; }
    out[k] = pkg[k];
  }
  if (!ins) out["dependencies"] = dep;
  pkg = out; changed = true;
  console.log("    已写入 dependencies." + name + " = " + val);
} else if (!Object.prototype.hasOwnProperty.call(pkg.dependencies, name)) {
  pkg.dependencies[name] = val; changed = true;
  console.log("    已写入 dependencies." + name + " = " + val);
} else {
  console.log("    dependencies." + name + " 已注册，跳过");
}
const dshOk = pkg.dsh && typeof pkg.dsh === "object" && !Array.isArray(pkg.dsh);
if (!dshOk) { pkg.dsh = { profile: { bundles: [name] } }; changed = true; }
else {
  const profOk = pkg.dsh.profile && typeof pkg.dsh.profile === "object" && !Array.isArray(pkg.dsh.profile);
  if (!profOk) { pkg.dsh.profile = { bundles: [name] }; changed = true; }
  else if (!Array.isArray(pkg.dsh.profile.bundles)) { pkg.dsh.profile.bundles = [name]; changed = true; }
  else if (pkg.dsh.profile.bundles.indexOf(name) < 0) { pkg.dsh.profile.bundles.push(name); changed = true; }
}
if (changed) {
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
  console.log("    已注册 profile dependencies + bundles（dsh >=0.1.5）：" + file);
} else {
  console.log("    profile package.json 注册项已齐全，跳过写入");
}
' "$PKG_FILE" "file:$SRC_NORM" "$PLUGIN"
    PKG_REG=1
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$PKG_FILE" "file:$SRC_NORM" "$PLUGIN" <<'PYEOF'
import json, sys
path, val, name = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, "r", encoding="utf-8-sig") as f:
    pkg = json.load(f)
changed = False
deps = pkg.get("dependencies")
if not isinstance(deps, dict):
    dep = {name: val}
    out = {}
    ins = False
    for k in pkg:
        if not ins and k == "dsh":
            out["dependencies"] = dep
            ins = True
        out[k] = pkg[k]
    if not ins:
        out["dependencies"] = dep
    pkg = out
    changed = True
    print("    已写入 dependencies." + name + " = " + val)
elif name not in deps:
    deps[name] = val
    changed = True
    print("    已写入 dependencies." + name + " = " + val)
else:
    print("    dependencies." + name + " 已注册，跳过")
dsh = pkg.get("dsh")
if not isinstance(dsh, dict):
    pkg["dsh"] = {"profile": {"bundles": [name]}}
    changed = True
else:
    prof = dsh.get("profile")
    if not isinstance(prof, dict):
        dsh["profile"] = {"bundles": [name]}
        changed = True
    else:
        bundles = prof.get("bundles")
        if not isinstance(bundles, list):
            prof["bundles"] = [name]
            changed = True
        elif name not in bundles:
            bundles.append(name)
            changed = True
if changed:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(pkg, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("    已注册 profile dependencies + bundles（dsh >=0.1.5）：" + path)
else:
    print("    profile package.json 注册项已齐全，跳过写入")
PYEOF
    PKG_REG=1
  else
    echo "    提示：未找到 node/python3，跳过 package.json 注册（仅写 cordis.patch.yml 兜底）" >&2
  fi
fi

# ── cordis.patch.yml 宿主行（按宿主代系分流）──────────────────────────────
PATCH="$PDIR/cordis.patch.yml"
mkdir -p "$PDIR"
if [ "$HOST_GEN" = "decl" ]; then
  # 0.2.0 声明代（BUG-011）：宿主行 + 预设声明行由包内 cordis.patch.yml 经 bundles 通道承载——
  # 此处不插入；且幂等撤除本安装器历史版本插入的同 id insert 行（双层同 id 条目会让宿主
  # SettingsForms 对本条目写 config 即 fatal，隔离实例实证）。撤除范围严格限定 `- insert:` 块内
  # 的 novel-writing 条目；顶层 id-targeted 覆盖行（宿主设置面写的 config）绝不触碰。
  # 撤除用 node 行级处理（HOST_GEN=decl ⇒ dsh 安装根可解析 ⇒ node 必在场）。
  if [ -f "$PATCH" ] && grep -q "name: dsh-novel-writing" "$PATCH" 2>/dev/null; then
    REMOVED=$(node -e '
const fs = require("fs");
const p = process.argv[1];
const lines = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n").split("\n");
let removed = false;
for (let i = 0; i < lines.length && !removed; i++) {
  const m = lines[i].match(/^(\s*)(-\s+)?insert:\s*$/);
  if (!m) continue;
  const insertIndent = m[1].length;
  let itemIndent = -1; let blockEnd = i + 1;
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j];
    if (/^\s*$/.test(l) || /^\s*#/.test(l)) continue;
    const ind = (l.match(/^\s*/) || [""])[0].length;
    if (ind <= insertIndent) { blockEnd = j; break }
    blockEnd = j + 1;
    if (itemIndent < 0) itemIndent = ind;
  }
  if (itemIndent < 0) continue;
  const itemRe = new RegExp("^ {" + itemIndent + "}- ");
  const keep = [];
  let skipping = false; let sawTarget = false;
  for (let j = i + 1; j < blockEnd; j++) {
    const l = lines[j];
    if (itemRe.test(l)) {
      const isOurs = new RegExp("^ {" + itemIndent + "}- id:\\s*novel-writing\\s*$").test(l)
        && j + 1 < blockEnd && /^\s*name:\s*dsh-novel-writing\s*$/.test(lines[j + 1]);
      if (isOurs) sawTarget = true;
      skipping = isOurs;
    }
    if (!skipping) keep.push(l);
  }
  if (!sawTarget) continue;
  const hasItem = keep.some((l) => itemRe.test(l));
  const rebuilt = lines.slice(0, i);
  if (hasItem) { rebuilt.push(lines[i]); rebuilt.push(...keep); }
  rebuilt.push(...lines.slice(blockEnd));
  lines.length = 0; lines.push(...rebuilt);
  removed = true;
}
if (!removed) { console.log("NONE"); process.exit(0); }
const hasAnyEntry = lines.some((l) => /^\s*-\s+/.test(l));
fs.writeFileSync(p, hasAnyEntry ? lines.join("\n") + "\n" : "[]\n", "utf8");
console.log("REMOVED");
' "$PATCH" 2>/dev/null)
    case "$REMOVED" in
      REMOVED) echo "==> 已撤除历史 insert 宿主行（0.2.0 双通道同 id 冲突防护）：$PATCH" ;;
      *) echo "==> 0.2.0+ 宿主：宿主行/预设声明行由 bundle patch 承载，跳过 insert（顶层 id-targeted 行保持不动）" ;;
    esac
  else
    echo "==> 0.2.0+ 宿主：宿主行/预设声明行由 bundle patch 承载，跳过 insert"
  fi
elif [ "$HOST_GEN" = "unknown" ]; then
  # fail-safe（REVIEW-BUG-011-R1 P1-5）：代系未知 ⇒ 不插 insert（0.2.x 上会制造「双层同 id」fatal，
  # RISK-011③）也不撤除（0.1.x 上撤除自有 insert 会摘掉宿主行）。只提示。
  echo "==> 宿主代系未知（fail-safe）：跳过 cordis.patch.yml 的 insert 写入/撤除；确认代系后用 --host-generation 重跑" >&2
elif grep -q "name: dsh-novel-writing" "$PATCH" 2>/dev/null; then
  echo "==> 幂等写入 cordis.patch.yml"
  echo "    已配置，跳过"
else
  echo "==> 幂等写入 cordis.patch.yml"
  if [ -f "$PATCH" ]; then
    printf '%s\n' '' '- insert:' '    - id: novel-writing' '      name: dsh-novel-writing' >> "$PATCH"
  else
    cat > "$PATCH" <<'EOF'
# Added by dsh-novel-writing installer: automated novel writing & publishing pipeline.
- insert:
    - id: novel-writing
      name: dsh-novel-writing
EOF
  fi
  echo "    已更新 $PATCH"
fi

# ── agent 预设（按宿主代系分流）──────────────────────────────────────────
PRESET_SRC="$SRC/agent-presets/novel-writing"
PRESET_DST="$DSH_HOME/.agent-presets/novel-writing"
if [ "$HOST_GEN" = "decl" ]; then
  # 0.2.0+：.agent-presets 目录机制官方废弃（Nothing reads that directory any more）——
  # 预设组合由包内 cordis.patch.yml 的 @deepseek-ai/dsh-agent-preset 声明行经 bundles 通道承载。
  echo "==> 0.2.0+ 宿主：预设由 bundle patch 声明行承载（preset-novel-writing），跳过 .agent-presets 目录同步"
elif [ "$HOST_GEN" = "unknown" ]; then
  # fail-safe（REVIEW-BUG-011-R1 P1-5）：代系未知 ⇒ 不写 $DSH_HOME 预设目录（宁可少做），只提示。
  echo "==> 宿主代系未知（fail-safe）：跳过 .agent-presets 目录同步；0.2.0+ 由 bundle patch 声明行承载，0.1.x 需同步本目录" >&2
elif [ -f "$PRESET_SRC/agent.cordis.yml" ]; then
  echo "==> 同步 agent 预设"
  mkdir -p "$PRESET_DST"
  cp -R "$PRESET_SRC/." "$PRESET_DST/"
  echo "    预设已同步：$PRESET_DST"
else
  echo "==> 同步 agent 预设"
  echo "    未找到包内预设目录，跳过" >&2
fi

# ── 配置默认值 / 数据迁移提示（按宿主代系分流）────────────────────────────
SETTINGS="$DSH_HOME/settings.yaml"
IMPORTED="$DSH_HOME/settings.yaml.imported"
if [ "$HOST_GEN" = "decl" ]; then
  # 0.2.0+：全局 settings.yaml 机制整体移除——不写默认节（插件 Config 声明承载默认值；
  # 写了也会触发宿主一次性 importLegacyDocument rename 副作用）。
  if [ -f "$IMPORTED" ] && grep -q '^novel-writing:' "$IMPORTED" 2>/dev/null; then
    echo ''
    echo "[数据迁移] 检测到 $IMPORTED 含 novel-writing 配置节（小说↔会话绑定等）。"
    echo "  0.2.0 宿主的旧文档导入器存在时序缺陷（inactive context 写入失败即丢节，隔离实例实证），"
    echo "  本插件已内置自动迁移：下次启动 dsh 后自动把该节读入 profile（工作区根/绑定/平台配置恢复）；"
    echo "  也可在工作台调用 /novel-writing/api/settings-migrate 手动触发（body {\"force\":true} 可越过全新护栏）。"
    echo "  迁移成功后 .imported 存档不再被读取，确认工作台数据无误后可自行归档删除。"
  else
    echo "==> 0.2.0+ 宿主：配置默认值由插件 Config 声明承载，跳过 settings.yaml 写入"
  fi
elif [ "$HOST_GEN" = "legacy" ]; then
  echo "==> 幂等写入 settings.yaml"
  if grep -q '^novel-writing:' "$SETTINGS" 2>/dev/null; then
    echo "    已含 novel-writing 节，跳过"
  else
    {
      echo ''
      echo 'novel-writing:'
      echo '  enabled: true'
      echo '  workspaceRoot: ""'
      echo '  pollMs: 2000'
      echo '  apiPublic: false'
    } >> "$SETTINGS"
    echo "    已写入默认配置"
  fi
else
  # fail-safe（REVIEW-BUG-011-R1 P1-5）：代系未知 ⇒ 不写 settings.yaml——在 0.2.x 上写会触发宿主
  # importLegacyDocument rename 副作用；在 0.1.x 上少写仅损失「开箱默认值」（插件 Config 有默认值）。
  echo "==> 宿主代系未知（fail-safe）：跳过 settings.yaml 默认节写入" >&2
fi

echo ''
echo "[OK] dsh-novel-writing 安装完成（源码：$SRC；profile：$PROFILE）"
if [ "$NEW_LAYOUT" = "1" ] && [ "$PKG_REG" = "1" ]; then
  echo "  已注册 profile dependencies + bundles（dsh >=0.1.5）+ patch 行兜底双保险。"
elif [ "$NEW_LAYOUT" = "1" ]; then
  echo "  仅写入 patch 行（未注册 profile package.json——node/python3 均不可用）；建议可用后重跑以启用官方注册通道。"
else
  echo "  已接入全局 profiles/node_modules$([ "$HOST_GEN" = "unknown" ] && echo "（patch 行按 fail-safe 跳过：宿主代系未知）" || echo " + patch 行（dsh 旧布局）")。"
fi
if [ "$HOST_GEN" = "decl" ]; then
  echo "  0.2.0+ 宿主：预设「小说写作工作流」由 bundle patch 声明行注册（重启后在预设选择器可选）。"
elif [ "$HOST_GEN" = "unknown" ]; then
  echo "  ⚠ 宿主代系未知：已按 fail-safe 跳过 insert/settings/预设目录写入——确认代系后加 --host-generation 重跑。" >&2
fi
echo "  请重启 DSH。然后在预设选择器中选「小说写作工作流」开始创作；"
echo "  浏览器会话顶部「小说」标签 = 工作台（实时渲染/章节编辑/发布/数据）。"
