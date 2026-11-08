#!/usr/bin/env python3
"""UX-064 design-artifact verifier.

Checks the review package is complete and internally consistent without
touching product code. Run from the repository root:

    python docs/design/UX-064-mockups/verify-mockups.py
"""
from __future__ import annotations

import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MOCK = ROOT / "docs" / "design" / "UX-064-mockups"
SHOTS = MOCK / "shots"
PROPOSAL = ROOT / "docs" / "design" / "UX-064-redesign-proposal.md"

HTML_EXPECT = {
    "console.html": ["续写第 39 章", "打开第 38 章", "上次写到", "书架", "4 本", "第 38 章保存　8月25日 22:26"],
    "console-empty.html": ["从第一本书开始", "新建第一本书", "开书三步"],
    "studio.html": ["专注模式", "协作编辑", "待确认", "查看差异", "已保存", "本章保存 8月25日 22:26"],
    "components.html": ["字体与排版", "纸与墨", "控件", "目录与对话", "空白", "间距"],
}

# The statistics-state timestamp must not be presented as a manuscript save time.
HTML_FORBIDDEN = {
    "console.html": ["9月23日 11:37", "上次保存"],
    "studio.html": ["已保存 11:37", "最后保存 9月23日 11:37"],
}

# 01-07: review canvas 1240x960 at 2x. 08-09: components 1240x2400 at 2x.
# 00: contact sheet 1824x1716.
PNG_EXPECT = {
    "00-contact-sheet.png": (1824, 1716),
    "01-console-light.png": (2480, 1920),
    "02-console-dark.png": (2480, 1920),
    "03-console-empty-light.png": (2480, 1920),
    "04-studio-light.png": (2480, 1920),
    "05-studio-dark.png": (2480, 1920),
    "06-studio-focus-light.png": (2480, 1920),
    "07-studio-focus-dark.png": (2480, 1920),
    "08-components-light.png": (2480, 4800),
    "09-components-dark.png": (2480, 4800),
}

BEFORE = [
    MOCK / "assets" / "UX-064-before-console.png",
    MOCK / "assets" / "UX-064-before-studio.png",
    MOCK / "assets" / "UX-064-before-empty.png",
]

PROPOSAL_MARKERS = [
    "待用户审核",
    "零产品代码改动",
    "示意数据",
    "1152×840",
    "S1 书斋",
    "S2 写作台",
    "S3 收口",
]


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as fh:
        head = fh.read(24)
    if len(head) < 24 or head[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not a PNG: {path}")
    width, height = struct.unpack(">II", head[16:24])
    return width, height


def main() -> int:
    errors: list[str] = []

    for name, markers in HTML_EXPECT.items():
        path = MOCK / name
        if not path.is_file():
            errors.append(f"missing HTML: {path.relative_to(ROOT)}")
            continue
        text = path.read_text(encoding="utf-8")
        for marker in markers:
            if marker not in text:
                errors.append(f"{name}: missing marker {marker!r}")
        for forbidden in HTML_FORBIDDEN.get(name, []):
            if forbidden in text:
                errors.append(f"{name}: forbidden copy {forbidden!r}")

    for name, expected in PNG_EXPECT.items():
        path = SHOTS / name
        if not path.is_file():
            errors.append(f"missing PNG: {path.relative_to(ROOT)}")
            continue
        try:
            actual = png_size(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        if actual != expected:
            errors.append(f"{name}: expected {expected}, got {actual}")

    for path in BEFORE:
        if not path.is_file():
            errors.append(f"missing before-image: {path.relative_to(ROOT)}")

    if not PROPOSAL.is_file():
        errors.append(f"missing proposal: {PROPOSAL.relative_to(ROOT)}")
    else:
        text = PROPOSAL.read_text(encoding="utf-8")
        for marker in PROPOSAL_MARKERS:
            if marker not in text:
                errors.append(f"proposal: missing marker {marker!r}")

    if errors:
        print("FAIL: UX-064 design artifacts")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(
        "PASS: UX-064 design artifacts - "
        f"{len(HTML_EXPECT)} HTML, {len(PNG_EXPECT)} PNG, "
        f"{len(BEFORE)} before-images, proposal; product code untouched"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
