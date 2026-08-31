#!/usr/bin/env python3
"""Free Hunyuan3D-2 Image-to-3D via the public Hugging Face Space (no paid key).

Turbo + shape_generation stays inside anonymous ZeroGPU. Textured /generation_all
needs more quota — pass --textured when a Hugging Face token is available.

Usage:
  python3 scripts/hunyuan-img2-3d.py <image> <out.glb>
  python3 scripts/hunyuan-img2-3d.py <image> <out.glb> --textured
"""
from __future__ import annotations

import argparse
import os
import shutil
import sys

from gradio_client import Client, handle_file


def _path(item) -> str | None:
    if item is None:
        return None
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        return item.get("value") or item.get("path") or item.get("name")
    return getattr(item, "path", None)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("out")
    parser.add_argument("--textured", action="store_true")
    parser.add_argument("--space", default="tencent/Hunyuan3D-2")
    args = parser.parse_args()

    if not os.path.isfile(args.image):
        print(f"missing image: {args.image}", file=sys.stderr)
        return 1

    client = Client(args.space)
    client.predict("Turbo", api_name="/on_gen_mode_change")
    client.predict("Low", api_name="/on_decode_mode_change")
    api = "/generation_all" if args.textured else "/shape_generation"
    result = client.predict(
        None,
        handle_file(args.image),
        None,
        None,
        None,
        None,
        20,
        5.0,
        1234,
        128,
        True,
        8000,
        False,
        api_name=api,
    )
    candidates = []
    if isinstance(result, (list, tuple)):
        for item in result[:2]:
            p = _path(item)
            if p:
                candidates.append(p)
    else:
        p = _path(result)
        if p:
            candidates.append(p)
    glb = next((p for p in candidates if p.endswith(".glb") and os.path.isfile(p)), None)
    if not glb:
        print(f"no glb in result: {result!r}"[:500], file=sys.stderr)
        return 2
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    shutil.copy(glb, args.out)
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes) from {api}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
