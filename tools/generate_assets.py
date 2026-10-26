import os
import struct
import math
import wave
import zlib

os.makedirs('godot_project/assets/sprites', exist_ok=True)
os.makedirs('godot_project/assets/audio', exist_ok=True)
os.makedirs('godot_project/scenes', exist_ok=True)
os.makedirs('godot_project/scripts', exist_ok=True)

def make_png(width, height, rgba_data):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type none
        for x in range(width):
            r, g, b, a = rgba_data(x, y, width, height)
            raw_data.extend([r, g, b, a])
    compressed = zlib.compress(raw_data)
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png.extend(struct.pack('>I', len(ihdr)) + b'IHDR' + ihdr + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr) & 0xffffffff))
    png.extend(struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff))
    png.extend(struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff))
    return png

# Player sprite (Cyan/Blue operative survivor)
def player_pixel(x, y, w, h):
    cx, cy = w / 2, h / 2
    dist = math.hypot(x - cx, y - cy)
    if dist <= 14:
        if dist <= 12:
            if y < 13 and 9 <= x <= 23:
                return (120, 240, 255, 255)  # glowing visor
            return (30, 140, 230, 255)  # blue armor
        return (15, 60, 110, 255)  # outline
    return (0, 0, 0, 0)

with open('godot_project/assets/sprites/player.png', 'wb') as f:
    f.write(make_png(32, 32, player_pixel))

# Enemy sprite (Crimson/Amber tactical sentinel)
def enemy_pixel(x, y, w, h):
    cx, cy = w / 2, h / 2
    dist = math.hypot(x - cx, y - cy)
    if dist <= 14:
        if dist <= 12:
            if dist <= 5:
                return (255, 230, 100, 255)  # eye/core
            return (230, 50, 60, 255)  # red armor
        return (110, 15, 20, 255)  # dark border
    return (0, 0, 0, 0)

with open('godot_project/assets/sprites/enemy.png', 'wb') as f:
    f.write(make_png(32, 32, enemy_pixel))

# Wall sprite (Industrial metal plate)
def wall_pixel(x, y, w, h):
    if x in (0, 31) or y in (0, 31):
        return (40, 48, 60, 255)
    if x in (3, 28) and y in (3, 28):
        return (180, 190, 210, 255)  # rivets
    return (75, 85, 100, 255)

with open('godot_project/assets/sprites/wall.png', 'wb') as f:
    f.write(make_png(32, 32, wall_pixel))

# Floor sprite (Subtle sci-fi dark floor grid)
def floor_pixel(x, y, w, h):
    if x == 0 or y == 0:
        return (30, 34, 44, 255)
    return (20, 22, 28, 255)

with open('godot_project/assets/sprites/floor.png', 'wb') as f:
    f.write(make_png(32, 32, floor_pixel))

# Synthesize audio wav files
def create_wav(filename, samples, sample_rate=22050):
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        raw_bytes = bytearray()
        for s in samples:
            val = int(max(-1.0, min(1.0, s)) * 32767)
            raw_bytes.extend(struct.pack('<h', val))
        wav_file.writeframes(raw_bytes)

sr = 22050
# Alert sound
alert_samples = [math.sin(2 * math.pi * (440 + 700 * (t/sr)) * (t/sr)) * (1.0 - t/(0.25*sr)) for t in range(int(0.25 * sr))]
create_wav('godot_project/assets/audio/alert.wav', alert_samples, sr)

# Attack sound
attack_samples = [math.sin(2 * math.pi * (240 - 160 * (t/sr)) * (t/sr)) * (0.8 - 0.8 * (t/(0.15*sr))) for t in range(int(0.15 * sr))]
create_wav('godot_project/assets/audio/attack.wav', attack_samples, sr)

# Hurt sound
hurt_samples = [((math.sin(2 * math.pi * 90 * (t/sr)) + 0.4 * math.sin(2 * math.pi * 150 * (t/sr))) * (1.0 - t/(0.2*sr))) for t in range(int(0.2 * sr))]
create_wav('godot_project/assets/audio/hurt.wav', hurt_samples, sr)

# Game Over sound
go_samples = [math.sin(2 * math.pi * (320 - 180 * (t/sr)) * (t/sr)) * (1.0 - t/(0.8*sr)) for t in range(int(0.8 * sr))]
create_wav('godot_project/assets/audio/gameover.wav', go_samples, sr)

print("SUCCESS: Assets generated!")
