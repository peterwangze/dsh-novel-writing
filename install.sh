#!/bin/sh
# dsh-novel-writing 安装脚本（macOS / Linux / Git Bash）
# 在线：curl -fsSL https://raw.githubusercontent.com/peterwangze/dsh-novel-writing/main/install.sh | sh
# 离线：解压发行包后，在包目录内执行  ./install.sh --local .
# 环境变量 DSH_HOME 可覆盖配置目录（默认 ~/.dsh）；--profile 指定目标 profile（默认 web）。
# 自动检测 dsh 布局版本（双通道自适应）：0.1.5+ per-profile（profiles/<Profile>/package.json
# 存在 → 接入 profile 私有 node_modules 并注册 package.json dependencies + dsh.profile.bundles，
# 注册用 node -e，无 node 时回退 python3，两者皆无则降级仅写 patch 行并提示）/ 旧版全局（行为不变）；
# 两种布局均以 cordis.patch.yml 插行兜底。
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
set -e

REPO_URL='https://github.com/peterwangze/dsh-novel-writing.git'
REF='main'
LOCAL=''
PROFILE='web'
while [ $# -gt 0 ]; do
  case "$1" in
    --local) LOCAL="$2"; shift 2 ;;
    --profile) PROFILE="$2"; shift 2 ;;
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

echo "==> 幂等写入 cordis.patch.yml"
PATCH="$PDIR/cordis.patch.yml"
mkdir -p "$PDIR"
if grep -q "name: dsh-novel-writing" "$PATCH" 2>/dev/null; then
  echo "    已配置，跳过"
else
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

echo "==> 同步 agent 预设"
PRESET_SRC="$SRC/agent-presets/novel-writing"
PRESET_DST="$DSH_HOME/.agent-presets/novel-writing"
if [ -f "$PRESET_SRC/agent.cordis.yml" ]; then
  mkdir -p "$PRESET_DST"
  cp -R "$PRESET_SRC/." "$PRESET_DST/"
  echo "    预设已同步：$PRESET_DST"
else
  echo "    未找到包内预设目录，跳过" >&2
fi

echo "==> 幂等写入 settings.yaml"
SETTINGS="$DSH_HOME/settings.yaml"
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

echo ''
echo "[OK] dsh-novel-writing 安装完成（源码：$SRC；profile：$PROFILE）"
if [ "$NEW_LAYOUT" = "1" ] && [ "$PKG_REG" = "1" ]; then
  echo "  已注册 profile dependencies + bundles（dsh >=0.1.5）+ patch 行兜底双保险。"
elif [ "$NEW_LAYOUT" = "1" ]; then
  echo "  仅写入 patch 行（未注册 profile package.json——node/python3 均不可用）；建议可用后重跑以启用官方注册通道。"
else
  echo "  已接入全局 profiles/node_modules + patch 行（dsh 旧布局）。"
fi
echo "  请重启 DSH。然后在预设选择器中选「小说写作工作流」开始创作；"
echo "  浏览器会话顶部「小说」标签 = 工作台（实时渲染/章节编辑/发布/数据）。"
