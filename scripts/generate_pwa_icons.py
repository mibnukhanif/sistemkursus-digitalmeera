import zlib
import struct
import math
import os

def write_png(filename, width, height, pixels):
    """
    pixels: list of (r, g, b, a) tuples of length width * height
    """
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter byte: None
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw_data.extend((r, g, b, a))

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
    png += chunk(b'IEND', b'')

    with open(filename, 'wb') as f:
        f.write(png)

def render_icon(size, is_maskable=False):
    pixels = []
    w, h = size, size
    cx, cy = w / 2.0, h / 2.0

    # Colors
    c_sky_top = (14, 165, 233, 255)    # #0ea5e9
    c_sky_mid = (3, 105, 161, 255)     # #0369a1
    c_sky_dark = (15, 23, 42, 255)     # #0f172a
    c_cyan = (56, 189, 248, 255)       # #38bdf8
    c_white = (255, 255, 255, 255)
    c_card_bg = (15, 23, 42, 240)

    # Corner radius
    radius = w * 0.22 if not is_maskable else 0

    for y in range(h):
        for x in range(w):
            # Check rounded rectangle boundaries if not maskable
            in_shape = True
            if not is_maskable:
                dx = max(0, abs(x - cx) - (w / 2.0 - radius))
                dy = max(0, abs(y - cy) - (h / 2.0 - radius))
                dist = math.sqrt(dx * dx + dy * dy)
                if dist > radius:
                    in_shape = False

            if not in_shape:
                pixels.append((0, 0, 0, 0))
                continue

            # Background gradient from sky to dark navy
            t = (x + y) / (float(w + h))
            r = int(c_sky_top[0] * (1 - t) + c_sky_dark[0] * t)
            g = int(c_sky_top[1] * (1 - t) + c_sky_dark[1] * t)
            b = int(c_sky_top[2] * (1 - t) + c_sky_dark[2] * t)

            # Central Icon element: Card / Badge
            scale = 0.75 if is_maskable else 0.85
            nx = (x - cx) / (w * scale / 2.0)
            ny = (y - cy) / (h * scale / 2.0)

            # Draw outer ID card rounded rect
            card_half_w = 0.78
            card_half_h = 0.52
            card_y_off = -0.15
            cdx = max(0, abs(nx) - (card_half_w - 0.12))
            cdy = max(0, abs(ny - card_y_off) - (card_half_h - 0.12))
            cdist = math.sqrt(cdx * cdx + cdy * cdy)

            if cdist <= 0.12:
                # Inside card
                if cdist >= 0.09:
                    # Card border (cyan glow)
                    r, g, b = c_cyan[0], c_cyan[1], c_cyan[2]
                elif ny - card_y_off < -0.38:
                    # Card top header stripe
                    r, g, b = c_cyan[0], c_cyan[1], c_cyan[2]
                else:
                    # Inside card dark glass
                    r, g, b = c_card_bg[0], c_card_bg[1], c_card_bg[2]

                    # Photo avatar box (left side of card)
                    p_cx, p_cy = -0.42, card_y_off + 0.05
                    p_dist = math.sqrt((nx - p_cx)**2 + (ny - p_cy)**2)
                    if p_dist < 0.22:
                        r, g, b = c_cyan[0], c_cyan[1], c_cyan[2]
                        if p_dist < 0.10:
                            r, g, b = c_card_bg[0], c_card_bg[1], c_card_bg[2]
                    
                    # Student ID lines (middle)
                    if -0.12 <= nx <= 0.22 and abs(ny - (card_y_off - 0.08)) < 0.025:
                        r, g, b = c_white[0], c_white[1], c_white[2]
                    if -0.12 <= nx <= 0.15 and abs(ny - (card_y_off + 0.04)) < 0.02:
                        r, g, b = 148, 163, 184
                    if -0.12 <= nx <= 0.08 and abs(ny - (card_y_off + 0.14)) < 0.02:
                        r, g, b = c_cyan[0], c_cyan[1], c_cyan[2]

                    # QR Code box (right side of card)
                    qr_cx, qr_cy = 0.48, card_y_off + 0.05
                    if abs(nx - qr_cx) < 0.18 and abs(ny - qr_cy) < 0.18:
                        r, g, b = c_white[0], c_white[1], c_white[2]
                        # QR pattern inside
                        rel_qx = int((nx - qr_cx + 0.18) / 0.36 * 7)
                        rel_qy = int((ny - qr_cy + 0.18) / 0.36 * 7)
                        # Finder patterns corners
                        if (rel_qx in (0, 1, 5, 6) and rel_qy in (0, 1, 5, 6)) or (rel_qx == 3 and rel_qy == 3):
                            r, g, b = c_sky_dark[0], c_sky_dark[1], c_sky_dark[2]

            # Letters "DM" typography below card
            if 0.48 <= ny <= 0.78:
                # Text region
                t_y = ny - 0.63
                # Letter D
                if -0.42 <= nx <= -0.10:
                    d_nx = nx - (-0.42)
                    # Stem of D
                    if 0 <= d_nx <= 0.06 and abs(t_y) <= 0.12:
                        r, g, b = c_white[0], c_white[1], c_white[2]
                    # Curve of D
                    if abs(t_y) <= 0.12 and 0.04 <= d_nx <= 0.28:
                        d_arch = math.sqrt((d_nx - 0.04)**2 + (t_y / 1.3)**2)
                        if 0.08 <= d_arch <= 0.14:
                            r, g, b = c_white[0], c_white[1], c_white[2]

                # Letter M
                if 0.02 <= nx <= 0.44:
                    m_nx = (nx - 0.02) / 0.40  # 0 to 1
                    if abs(t_y) <= 0.12:
                        # left stem
                        if 0.0 <= m_nx <= 0.15:
                            r, g, b = c_white[0], c_white[1], c_white[2]
                        # right stem
                        elif 0.85 <= m_nx <= 1.0:
                            r, g, b = c_white[0], c_white[1], c_white[2]
                        # diagonal V of M
                        else:
                            expected_y = abs(m_nx - 0.5) * 0.45 - 0.09
                            if abs(t_y - expected_y) < 0.04:
                                r, g, b = c_cyan[0], c_cyan[1], c_cyan[2]

            pixels.append((r, g, b, 255))

    return pixels

os.makedirs('public', exist_ok=True)
print("Generating pwa-192x192.png...")
write_png('public/pwa-192x192.png', 192, 192, render_icon(192, False))

print("Generating pwa-512x512.png...")
write_png('public/pwa-512x512.png', 512, 512, render_icon(512, False))

print("Generating pwa-maskable-512x512.png...")
write_png('public/pwa-maskable-512x512.png', 512, 512, render_icon(512, True))

print("Generating apple-touch-icon.png...")
write_png('public/apple-touch-icon.png', 180, 180, render_icon(180, False))

print("Generating favicon.png & favicon.ico...")
write_png('public/favicon.png', 64, 64, render_icon(64, False))
# write standard ico with header wrapping the 64x64 png
with open('public/favicon.png', 'rb') as f_png:
    png_bytes = f_png.read()
# ICO format with PNG payload
ico_header = struct.pack('<HHH', 0, 1, 1)  # reserved, type (1=icon), count (1)
ico_entry = struct.pack('<BBBBHHII', 64, 64, 0, 0, 1, 32, len(png_bytes), 6 + 16)
with open('public/favicon.ico', 'wb') as f_ico:
    f_ico.write(ico_header + ico_entry + png_bytes)

print("All PWA icons generated successfully!")
