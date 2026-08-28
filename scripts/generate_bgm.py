#!/usr/bin/env python3
"""Original Yolk Rush BGM renderer. Cartoon party loops, no third-party samples."""

from __future__ import annotations

import math
import os
import struct
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio"


def midi(n: float) -> float:
    return 440.0 * (2.0 ** ((n - 69.0) / 12.0))


def env_exp(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n, dtype=np.float32) / SR
    a = np.clip(t / max(attack, 1e-4), 0.0, 1.0)
    d = np.exp(-t * decay)
    return (a * d).astype(np.float32)


def place(buf: np.ndarray, start: int, sig: np.ndarray, pan: float = 0.0) -> None:
    if sig.size == 0:
        return
    end = min(buf.shape[1], start + sig.size)
    sl = sig[: end - start]
    g_l = math.cos((pan + 1.0) * 0.25 * math.pi)
    g_r = math.sin((pan + 1.0) * 0.25 * math.pi)
    buf[0, start:end] += sl * g_l
    buf[1, start:end] += sl * g_r


def tone(freq: float, dur: float, kind: str, amp: float) -> np.ndarray:
    n = max(1, int(dur * SR))
    t = np.arange(n, dtype=np.float32) / SR
    if kind == "marimba":
        e = env_exp(n, 0.004, 7.5)
        s = (
            np.sin(2 * np.pi * freq * t)
            + 0.45 * np.sin(2 * np.pi * freq * 2.01 * t)
            + 0.12 * np.sin(2 * np.pi * freq * 4.04 * t)
        )
        return (s * e * amp).astype(np.float32)
    if kind == "glock":
        e = env_exp(n, 0.002, 5.2)
        s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 2.76 * t)
        return (s * e * amp).astype(np.float32)
    if kind == "bell":
        e = env_exp(n, 0.003, 3.6)
        s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2.4 * t)
        return (s * e * amp).astype(np.float32)
    if kind == "pluck":
        e = env_exp(n, 0.003, 9.0)
        s = np.sin(2 * np.pi * freq * t) * (1.0 + 0.15 * np.sin(2 * np.pi * 6 * t))
        return (s * e * amp).astype(np.float32)
    if kind == "bass":
        e = env_exp(n, 0.008, 6.5)
        s = np.sin(2 * np.pi * freq * t) + 0.18 * np.sin(2 * np.pi * freq * 2 * t)
        return (s * e * amp).astype(np.float32)
    if kind == "pad":
        e = np.minimum(t / 0.12, 1.0) * np.minimum((dur - t) / 0.18, 1.0)
        e = np.clip(e, 0.0, 1.0)
        s = np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 1.002 * t)
        return (s * e * amp * 0.45).astype(np.float32)
    if kind == "brass":
        e = env_exp(n, 0.01, 14.0)
        s = np.tanh(1.4 * np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2 * t))
        return (s * e * amp).astype(np.float32)
    if kind == "uke":
        e = env_exp(n, 0.006, 8.2)
        s = np.sin(2 * np.pi * freq * t) + 0.22 * np.sin(2 * np.pi * freq * 3 * t)
        return (s * e * amp).astype(np.float32)
    e = env_exp(n, 0.005, 8.0)
    return (np.sin(2 * np.pi * freq * t) * e * amp).astype(np.float32)


def noise_burst(dur: float, amp: float, hp: float, decay: float) -> np.ndarray:
    n = max(1, int(dur * SR))
    rng = np.random.default_rng(7)
    x = rng.standard_normal(n).astype(np.float32)
    # one-pole hp
    a = np.exp(-2 * np.pi * hp / SR)
    y = np.empty(n, dtype=np.float32)
    prev_x = 0.0
    prev_y = 0.0
    for i in range(n):
        prev_y = a * (prev_y + x[i] - prev_x)
        y[i] = prev_y
        prev_x = x[i]
    e = env_exp(n, 0.001, decay)
    return (y * e * amp).astype(np.float32)


def kick(amp: float) -> np.ndarray:
    n = int(0.18 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    freq = 148 * np.exp(-t * 18) + 42
    e = np.exp(-t * 14)
    click = np.exp(-t * 90) * 0.25
    return (np.sin(2 * np.pi * np.cumsum(freq) / SR) * e * amp + click * amp).astype(np.float32)


def snare(amp: float) -> np.ndarray:
    n = int(0.14 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    body = np.sin(2 * np.pi * 186 * t) * np.exp(-t * 22)
    nz = noise_burst(0.14, 1.0, 1800, 18)
    return ((body * 0.35 + nz[:n] * 0.8) * amp).astype(np.float32)


_HAT = None
_CLAP = None


def hat(amp: float) -> np.ndarray:
    global _HAT
    if _HAT is None:
        _HAT = noise_burst(0.05, 1.0, 7000, 55)
    return _HAT * amp


def clap(amp: float) -> np.ndarray:
    global _CLAP
    if _CLAP is None:
        a = noise_burst(0.04, 1.0, 1200, 28)
        b = noise_burst(0.07, 0.8, 1600, 20)
        out = np.zeros(int(0.12 * SR), dtype=np.float32)
        out[: a.size] += a
        off = int(0.018 * SR)
        out[off : off + b.size] += b
        _CLAP = out
    return _CLAP * amp


def wood(amp: float) -> np.ndarray:
    n = int(0.06 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    s = np.sin(2 * np.pi * 980 * t) + 0.4 * np.sin(2 * np.pi * 1470 * t)
    return (s * np.exp(-t * 40) * amp).astype(np.float32)


def seamless(buf: np.ndarray, ms: float = 40.0) -> np.ndarray:
    n = int(ms * 0.001 * SR)
    n = min(n, buf.shape[1] // 8)
    fade = np.linspace(0.0, 1.0, n, dtype=np.float32)
    head = buf[:, :n].copy()
    tail = buf[:, -n:].copy()
    buf[:, -n:] = tail * (1.0 - fade) + head * fade
    buf[:, :n] = buf[:, -n:]
    return buf


def peak_norm(buf: np.ndarray, peak: float = 0.72) -> np.ndarray:
    m = float(np.max(np.abs(buf))) + 1e-9
    buf *= peak / m
    return np.tanh(buf * 1.05).astype(np.float32)


def write_wav(path: Path, buf: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(buf * 32767.0, -32767, 32767).astype(np.int16)
    interleaved = np.empty(pcm.size, dtype=np.int16)
    interleaved[0::2] = pcm[0]
    interleaved[1::2] = pcm[1]
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(interleaved.tobytes())


def encode_mp3(wav: Path, mp3: Path) -> None:
    mp3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(wav),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "128k",
            "-ar",
            "44100",
            str(mp3),
        ]
    )


PROGRESSION = {
    "party": [0, 7, 9, 5],
    "candy": [5, 0, 2, 7],
    "ice": [9, 4, 6, 0],
    "factory": [4, 0, 7, 2],
    "sky": [2, 9, 11, 7],
    "finale": [0, 5, 7, 9],
}

MELODY_A = [0, 2, 4, 7, 4, 2, 0, 7, 4, 7, 9, 7, 4, 2, 0, 4]
MELODY_B = [4, 7, 9, 12, 9, 7, 4, 0, 2, 4, 7, 4, 2, 0, -3, 0]


def chord_notes(root: int, bar: int) -> list[int]:
    # major triad unless factory-ish minor color
    third = 3 if root in (4, 9) and bar % 8 >= 4 else 4
    return [root, root + third, root + 7]


def render_track(name: str, bpm: float, bars: int = 32) -> dict[str, np.ndarray]:
    beat = 60.0 / bpm
    bar_s = beat * 4
    total = bars * bar_s
    n = int(total * SR)
    base = np.zeros((2, n), dtype=np.float32)
    perc = np.zeros((2, n), dtype=np.float32)
    high = np.zeros((2, n), dtype=np.float32)
    prog = PROGRESSION[name]
    tonic = 60  # C4

    rng = np.random.default_rng({"party": 11, "candy": 22, "ice": 33, "factory": 44, "sky": 55, "finale": 66}[name])

    for bar in range(bars):
        t0 = bar * bar_s
        ch = prog[bar % 4]
        notes = chord_notes(ch, bar)
        # harmony
        for i, deg in enumerate(notes):
            freq = midi(tonic - 12 + deg)
            kind = "uke" if name in ("party", "candy") else "pad" if name in ("ice", "sky") else "pluck"
            dur = bar_s * (0.92 if kind != "pad" else 1.02)
            amp = 0.11 if kind == "pad" else 0.09
            pan = -0.35 + i * 0.35
            place(base, int(t0 * SR), tone(freq, dur, kind, amp), pan)
        # bass
        bass_deg = ch
        bfreq = midi(tonic - 24 + bass_deg)
        place(base, int(t0 * SR), tone(bfreq, beat * 1.6, "bass", 0.16 if name == "finale" else 0.13), 0.0)
        if name in ("factory", "finale") and bar % 2 == 1:
            place(base, int((t0 + beat * 2) * SR), tone(bfreq * 1.5, beat * 0.7, "bass", 0.08), 0.0)

        # melody
        motif = MELODY_A if (bar // 8) % 2 == 0 else MELODY_B
        if name == "ice":
            motif = [x + 12 for x in motif]
        inst = {
            "party": "marimba",
            "candy": "glock",
            "ice": "bell",
            "factory": "pluck",
            "sky": "bell",
            "finale": "marimba",
        }[name]
        step = beat * 0.5
        for k, deg in enumerate(motif):
            if name == "ice" and k % 3 == 2:
                continue
            tt = t0 + k * step
            if tt >= total:
                break
            freq = midi(tonic + 12 + deg + (7 if name == "sky" and bar >= 16 else 0))
            amp = 0.12 + (0.03 if k % 4 == 0 else 0)
            pan = -0.2 if k % 2 == 0 else 0.25
            place(base, int(tt * SR), tone(freq, step * 1.4, inst, amp), pan)
            if name in ("candy", "party") and k % 4 == 0:
                place(high, int(tt * SR), tone(freq * 2, step * 0.8, "glock", 0.045), pan * 0.6)

        # extra high layer hooks
        if name == "finale" and bar % 4 == 0:
            place(high, int(t0 * SR), tone(midi(tonic + 16), beat * 0.45, "brass", 0.1), 0.15)
            place(high, int((t0 + beat) * SR), tone(midi(tonic + 19), beat * 0.35, "brass", 0.08), -0.1)
        if name == "sky" and bar % 2 == 0:
            place(high, int(t0 * SR), tone(midi(tonic + 24 + ch), bar_s * 0.9, "pad", 0.08), 0.4)
        if name == "factory" and bar % 2 == 0:
            place(high, int((t0 + beat * 1.5) * SR), wood(0.12), 0.3)

        # percussion
        heavy = name in ("factory", "finale")
        light = name in ("ice", "sky")
        k_amp = 0.22 if heavy else 0.14 if not light else 0.08
        s_amp = 0.16 if heavy else 0.11 if not light else 0.06
        for b in range(4):
            bt = t0 + b * beat
            if b % 2 == 0:
                place(perc, int(bt * SR), kick(k_amp), 0.0)
            else:
                place(perc, int(bt * SR), snare(s_amp), 0.05)
                if not light:
                    place(perc, int(bt * SR), clap(0.09 if heavy else 0.06), 0.1)
            hats = 2 if light else 4
            for h in range(hats):
                ht = bt + h * (beat / hats)
                ha = 0.035 if h % 2 else 0.055
                if name == "ice":
                    ha *= 0.7
                place(perc, int(ht * SR), hat(ha), -0.15 if h % 2 else 0.2)
            if name == "party" and b == 1:
                place(perc, int((bt + beat * 0.5) * SR), clap(0.05), -0.2)
            if name == "factory" and b == 3:
                place(perc, int(bt * SR), wood(0.1), 0.25)

        # humanize tiny offset already from integer sample rounding
        _ = rng

    return {
        "base": peak_norm(seamless(base), 0.62),
        "perc": peak_norm(seamless(perc), 0.58),
        "high": peak_norm(seamless(high), 0.50),
    }


def render_stinger(kind: str) -> np.ndarray:
    bpm = 128 if kind == "victory" else 96
    beat = 60.0 / bpm
    bars = 4 if kind == "victory" else 3
    n = int(bars * 4 * beat * SR)
    buf = np.zeros((2, n), dtype=np.float32)
    tonic = 60
    if kind == "victory":
        degrees = [0, 4, 7, 12, 16, 19, 24]
        for i, d in enumerate(degrees):
            t0 = i * beat * 0.5
            place(buf, int(t0 * SR), tone(midi(tonic + d), beat * 1.1, "marimba", 0.16), -0.2 + (i % 3) * 0.2)
            place(buf, int(t0 * SR), tone(midi(tonic + d - 12), beat * 0.8, "bass", 0.08), 0.0)
        place(buf, int((bars * 4 * beat - beat * 2) * SR), clap(0.12), 0.0)
        place(buf, int((2 * beat) * SR), kick(0.16), 0.0)
    else:
        degrees = [7, 4, 0, -5]
        for i, d in enumerate(degrees):
            t0 = i * beat
            place(buf, int(t0 * SR), tone(midi(tonic + d), beat * 1.6, "bell", 0.12), 0.1)
            place(buf, int(t0 * SR), tone(midi(tonic + d - 12), beat * 1.4, "bass", 0.1), 0.0)
    # fade out so it is a stinger, not a loop
    fade_n = int(0.35 * SR)
    ramp = np.linspace(1.0, 0.0, fade_n, dtype=np.float32)
    buf[:, -fade_n:] *= ramp
    return peak_norm(buf, 0.7)


TRACKS = [
    ("party", 124, "menu/yolk-party"),
    ("candy", 128, "levels/candy-run"),
    ("ice", 118, "levels/ice-slide"),
    ("factory", 132, "levels/crazy-factory"),
    ("sky", 130, "levels/sky-bounce"),
    ("finale", 140, "levels/final-party"),
]


def main() -> int:
    tmp = ROOT / ".tmp-audio"
    tmp.mkdir(exist_ok=True)
    (OUT / "sfx").mkdir(parents=True, exist_ok=True)
    (OUT / "sfx" / ".gitkeep").write_text("")

    for key, bpm, rel in TRACKS:
        print(f"render {key} {bpm}bpm", flush=True)
        layers = render_track(key, bpm, bars=32)
        for layer, buf in layers.items():
            wav = tmp / f"{key}-{layer}.wav"
            mp3 = OUT / "music" / f"{rel}-{layer}.mp3"
            write_wav(wav, buf)
            encode_mp3(wav, mp3)
            print(f"  {mp3.relative_to(ROOT)}  {mp3.stat().st_size // 1024}k", flush=True)

    for kind, rel in (("victory", "music/victory/victory.mp3"), ("defeat", "music/defeat/defeat.mp3")):
        print(f"render {kind}", flush=True)
        buf = render_stinger(kind)
        wav = tmp / f"{kind}.wav"
        mp3 = OUT / rel
        write_wav(wav, buf)
        encode_mp3(wav, mp3)
        print(f"  {mp3.relative_to(ROOT)}  {mp3.stat().st_size // 1024}k", flush=True)

    for wav in tmp.glob("*.wav"):
        wav.unlink()
    try:
        tmp.rmdir()
    except OSError:
        pass
    print("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
