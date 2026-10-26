import os
from PIL import Image

brain_dir = r"C:\Users\UKESH\.gemini\antigravity-ide\brain\7204809e-921d-44fd-905e-4acd55902496"
player_src = os.path.join(brain_dir, "player_character_1792984620647.jpg")
enemy_src = os.path.join(brain_dir, "enemy_sentinel_1792984644950.jpg")

os.makedirs("assets/sprites", exist_ok=True)
os.makedirs("godot_project/assets/sprites", exist_ok=True)

def remove_dark_bg(img_path, out_paths, threshold=38, tolerance=25):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    # Sample corner color
    c0 = img.getpixel((5, 5))
    bg_r, bg_g, bg_b = c0[0], c0[1], c0[2]
    
    new_data = []
    for item in datas:
        r, g, b, a = item
        # Calculate distance to background color
        dist = ((r - bg_r)**2 + (g - bg_g)**2 + (b - bg_b)**2)**0.5
        # If very close to background color or very dark
        if dist < tolerance or (r < threshold and g < threshold and b < threshold):
            new_data.append((0, 0, 0, 0))
        elif dist < tolerance + 15:
            # Feather alpha
            alpha = int(255 * ((dist - tolerance) / 15.0))
            new_data.append((r, g, b, alpha))
        else:
            new_data.append((r, g, b, 255))
            
    img.putdata(new_data)
    
    # Crop bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    for p in out_paths:
        img.save(p, "PNG")
    print(f"Saved {out_paths[0]} successfully (size: {img.size})")

remove_dark_bg(player_src, ["assets/sprites/player_sprite.png", "godot_project/assets/sprites/player.png"])
remove_dark_bg(enemy_src, ["assets/sprites/enemy_sprite.png", "godot_project/assets/sprites/enemy.png"])

print("Sprites processed cleanly!")
