#!/usr/bin/env python3
# 生成 data/woodfish.wav —— 一段经过调校的"木鱼/木梆"敲击声（无需任何外部音频文件）
import math, struct, wave, os

SR = 44100
DUR = 0.26
n = int(SR * DUR)
samples = [0.0] * n

# 木质敲击：两个快速衰减的谐波（基频 ~ 720Hz 下滑到 ~ 540Hz，+ 一个 1.9kHz 弱泛音）+ 起始噪声瞬态
def env(t, tau):
    return math.exp(-t / tau)

for i in range(n):
    t = i / SR
    # 基频轻微下滑，模拟木头空腔
    f = 720 - 180 * (t / DUR)
    s = math.sin(2 * math.pi * f * t) * env(t, 0.055)
    s += 0.35 * math.sin(2 * math.pi * 1900 * t) * env(t, 0.018)   # 木头的"芯"
    # 起始 2.5ms 噪声瞬态（敲击的"嗒"）
    if t < 0.0025:
        s += (0.6 * (1 - t / 0.0025)) * (1 if (i * 9301 + 49297) % 233280 / 233280 < 0.5 else -1) * 0.5
    samples[i] = s

# 归一化到 16bit
peak = max(1e-6, max(abs(x) for x in samples))
out = bytearray()
for x in samples:
    v = int(max(-1.0, min(1.0, x / peak)) * 30000 * (0.9 if False else 1.0))
    out += struct.pack("<h", v)

os.makedirs("data", exist_ok=True)
with wave.open("data/woodfish.wav", "w") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(bytes(out))

print("wrote data/woodfish.wav  samples=", n, "bytes=", len(out))
