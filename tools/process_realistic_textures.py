import os
from PIL import Image

brain_dir = r"C:\Users\UKESH\.gemini\antigravity-ide\brain\7204809e-921d-44fd-905e-4acd55902496"
cargo_src = os.path.join(brain_dir, "cargo_container_1792985698446.jpg")
gen_src = os.path.join(brain_dir, "power_generator_1792985737611.jpg")
floor_src = os.path.join(brain_dir, "industrial_floor_1792985778714.jpg")

os.makedirs("assets/sprites", exist_ok=True)
os.makedirs("godot_project/assets/sprites", exist_ok=True)

# Process cargo container (remove outer dark border)
def process_obstacle(src_path, out_path, threshold=40):
    img = Image.open(src_path).convert("RGBA")
    datas = img.getdata()
    c0 = img.getpixel((5, 5))
    bg_r, bg_g, bg_b = c0[0], c0[1], c0[2]
    new_data = []
    for item in datas:
        r, g, b, a = item
        dist = ((r - bg_r)**2 + (g - bg_g)**2 + (b - bg_b)**2)**0.5
        if dist < 30 or (r < threshold and g < threshold and b < threshold):
            new_data.append((0, 0, 0, 0))
        elif dist < 45:
            alpha = int(255 * ((dist - 30) / 15.0))
            new_data.append((r, g, b, alpha))
        else:
            new_data.append((r, g, b, 255))
    img.putdata(new_data)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(out_path, "PNG")
    print(f"Saved {out_path} ({img.size})")

process_obstacle(cargo_src, "assets/sprites/container.png")
process_obstacle(gen_src, "assets/sprites/generator.png")

# Floor tile (resize to 256x256 for repeating seamless background pattern)
floor_img = Image.open(floor_src)
floor_img = floor_img.resize((256, 256), Image.Resampling.LANCZOS)
floor_img.save("assets/sprites/floor_tile.png", "PNG")
print("Saved assets/sprites/floor_tile.png (256, 256)")
