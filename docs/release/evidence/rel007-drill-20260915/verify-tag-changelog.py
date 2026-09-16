# -*- coding: utf-8 -*-
"""REL-007 终局复核：**tag 内** CHANGELOG 相对发布前状态的逐字移动判定。

old = git show bab9687:CHANGELOG.md（发布前 HEAD）
new = git show v0.5.3:CHANGELOG.md（tag 指向的发布提交树内）
判据 V1~V6 与发布前工作树复核同口径（无共享代码：本文件独立重写）。
V2b（F-07 订正）：恢复的 CLEAN-007 标题 MUST 与 a04ea89:CHANGELOG.md L44 逐字节相同
（且在 a04ea89 恰 1 次、在发布前 bab9687 0 次）——非仅前缀存在性。
"""
import subprocess, json
from collections import Counter

REPO = r"D:\AI\agent\deepseek\harness\writing-workflow"

def blob(ref):
    p = subprocess.run(["git", "-C", REPO, "show", ref], capture_output=True, check=True)
    t = p.stdout.decode("utf-8").replace("\r\n", "\n")
    ls = t.split("\n")
    if ls and ls[-1] == "":
        ls = ls[:-1]
    return ls

old = blob("bab9687:CHANGELOG.md")
new = blob("v0.5.3:CHANGELOG.md")
co, cn = Counter(old), Counter(new)
lost = co - cn
added = cn - co

V = {}
V["old_lines"] = len(old)
V["new_lines"] = len(new)
V["V1_lost"] = {k: v for k, v in lost.items()}
V["V2_added_keys"] = {("<blank>" if k == "" else k[:50]): v for k, v in added.items()}
V["V2_added_ok"] = (added.get("## [0.5.3] - 2026-09-15", 0) == 1 and added.get("### 修复", 0) == 1
                    and added.get("", 0) == 7 and len(added) == 4)
c007 = [l for l in new if l.startswith("- **CLEAN-007 UX-012 R1 备注批次")]
# V2b（订正，来源 docs/review/REL-007-R1.md F-07）：恢复标题 MUST 与 `a04ea89:CHANGELOG.md` L44
# **逐字节相同**——原实现只校验「前缀存在恰 1 次」，单独运行无法发现恢复被改写；
# 另加两侧计数断言：在 a04ea89 恰 1 次 ∧ 在发布前 bab9687 **0 次**（证明属「恢复」而非既有行）。
ref = [l for l in blob("a04ea89:CHANGELOG.md") if l.startswith("- **CLEAN-007 UX-012 R1 备注批次")]
in_old = [l for l in old if l.startswith("- **CLEAN-007 UX-012 R1 备注批次")]
V["V2b_detail"] = {
    "restored_count_in_new": len(c007),
    "ref_count_in_a04ea89": len(ref),
    "count_in_pre_release_bab9687": len(in_old),
    "byte_identical_to_a04ea89_L44": bool(len(c007) == 1 and len(ref) == 1 and c007[0] == ref[0]),
}
V["V2_c007_heading_restored"] = bool(len(c007) == 1 and len(ref) == 1 and len(in_old) == 0
                                     and c007[0] == ref[0])
V["V1_ok"] = len(lost) == 0

def section(lines, marker):
    s = lines.index(marker)
    e = next((i for i in range(s + 1, len(lines)) if lines[i].startswith("## [")), len(lines))
    return lines[s + 1:e]

def entries(body):
    out, cur = [], None
    for l in body:
        if l.startswith("- "):
            if cur: out.append(cur)
            cur = [l]
        elif cur is not None and l.startswith("  "):
            cur.append(l)
        elif l.strip() == "":
            if cur: out.append(cur); cur = None
        else:
            cur = None
    if cur: out.append(cur)
    return out

ve = entries(section(new, "## [0.5.3] - 2026-09-15"))
ue = entries(section(new, "## [Unreleased]"))
TASKS = ["BUG-007", "UX-060", "BUG-009", "CLEAN-007", "BUG-010", "CLEAN-006"]
V["V4_v053_entries"] = len(ve)
V["V4_missing_tasks"] = [t for t in TASKS if not any(t in e[0] for e in ve)]
V["V4_compat_in_v053"] = [e[0][:30] for e in ve if e[0].startswith(("- **COMPAT-", "- **REVIEW-COMPAT-"))]
V["V5_unreleased_entries"] = len(ue)
V["V5_non_compat"] = [e[0][:30] for e in ue if "COMPAT-" not in e[0][:90]]
V["V4_ok"] = len(ve) == 9 and not V["V4_missing_tasks"] and not V["V4_compat_in_v053"]
V["V5_ok"] = len(ue) == 15 and not V["V5_non_compat"]

# V6：9 条正文（CLEAN-007 去恢复标题）在 old 中连续命中、互不重叠、合计 100 行、源序保持
spans, picked, detail = [], [], []
for e in ve:
    is_c007 = e[0].startswith("- **CLEAN-007")
    body = e[1:] if is_c007 else e
    cand = [i for i in range(len(old) - len(body) + 1) if old[i:i + len(body)] == body]
    pick = next((i for i in cand if all(i + len(body) <= s or i >= t for s, t in spans)), None)
    if pick is not None:
        spans.append((pick, pick + len(body))); picked.append(pick)
    detail.append({"anchor": e[0][:34], "lines": len(body), "at_HEAD_L": pick + 1 if pick is not None else None})
V["V6_detail"] = detail
V["V6_covered"] = sum(t - s for s, t in spans)
V["V6_ok"] = (all(d["at_HEAD_L"] for d in detail) and V["V6_covered"] == 100 and picked == sorted(picked))
V["ALL_OK"] = bool(V["V1_ok"] and V["V2_added_ok"] and V["V2_c007_heading_restored"] and V["V4_ok"] and V["V5_ok"] and V["V6_ok"])
print(json.dumps(V, ensure_ascii=False, indent=2))
