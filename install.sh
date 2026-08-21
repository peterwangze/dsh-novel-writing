#!/bin/sh
# dsh-novel-writing 安装脚本（macOS / Linux / Git Bash）
# 在线：curl -fsSL https://raw.githubusercontent.com/peterwangze/dsh-novel-writing/main/install.sh | sh
# 离线：解压发行包后，在包目录内执行  ./install.sh --local .
# 环境变量 DSH_HOME 可覆盖配置目录（默认 ~/.dsh）；--profile 指定目标 profile（默认 web）。
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

echo "==> 接入 profiles/node_modules"
NM="$DSH_HOME/profiles/node_modules"
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

echo "==> 幂等写入 cordis.patch.yml"
PDIR="$DSH_HOME/profiles/$PROFILE"
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
echo "  请重启 DSH。然后在预设选择器中选「小说写作工作流」开始创作；"
echo "  浏览器会话顶部「小说」标签 = 工作台（实时渲染/章节编辑/发布/数据）。"
