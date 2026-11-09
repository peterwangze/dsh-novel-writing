# v0.6.0 回滚方案

## A. 回滚点

- 上一稳定版：`v0.5.3`
- 发布 tag：`v0.6.0`
- 回滚命令（仓库）：

```sh
git checkout v0.5.3
```

## B. 插件回滚（推荐给用户）

```sh
dsh plugin --profile <web|desktop> remove dsh-novel-writing
dsh plugin --profile <web|desktop> add peterwangze/dsh-novel-writing#v0.5.3
```

然后重启 DSH。

## C. 数据影响

- v0.6.0 新增 `dsh.novel.studio.v2`、`dsh.novel.theme.v1`、`dsh.novel.typography.v1`，并首次迁移旧 `split.v1.leftCollapsed`/`drawer.v1.open`。
- 回退到 v0.5.3 后：新键被忽略；布局/主题/排版偏好可能重置；**书稿、章节、发布、数据文件不改、不删**。
- v0.5.3 不会读取 `studio.v2` 的 `panelHeight`；下方面板恢复旧版行为。

## D. 回滚后检查

- 普通 DSH 会话不受插件样式影响；
- 小说书目可打开，章节/保存/发布数据仍在；
- 预设加载无 `broken`；
- 必要时删除新键回到默认主题/排版：
  `dsh.novel.theme.v1`、`dsh.novel.typography.v1`、`dsh.novel.studio.v2`。

## E. 未演练说明

本版以 GitHub tag 发布；发布前未执行完整“安装→回退→再安装”耗时演练。回滚路径沿用 v0.5.3 的 tag/安装方式；首次真实回滚后建议在回滚报告中补充耗时与残留检查。
