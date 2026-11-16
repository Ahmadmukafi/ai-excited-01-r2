// draw.mjs — deterministic code-drawn art for ai-excited-01-r2.
// "The Dandelion That Became Stars": a giant dandelion on a hill at dusk;
// its seeds lift off as glowing lanterns and spiral upward, becoming stars.
// Pure Node stdlib (node:fs, node:zlib). Fixed seed -> byte-identical output.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 4);

// --- deterministic PRNG (mulberry32) ---------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261116);

// --- pixel helpers -----------------------------------------------------------
function blend(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H || a <= 0) return;
  const i = (y * W + x) * 4;
  const ia = 1 - a;
  px[i] = Math.round(r * a + px[i] * ia);
  px[i + 1] = Math.round(g * a + px[i + 1] * ia);
  px[i + 2] = Math.round(b * a + px[i + 2] * ia);
  px[i + 3] = 255;
}
function fillRect(x0, y0, x1, y1, r, g, b) {
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
      const i = (y * W + x) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }
}
function disc(cx, cy, rad, r, g, b, a) {
  const r2 = rad * rad;
  const x0 = Math.max(0, Math.floor(cx - rad));
  const x1 = Math.min(W - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad));
  const y1 = Math.min(H - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) blend(x, y, r, g, b, a);
    }
  }
}
// soft radial glow: alpha falls off quadratically from centre
function glow(cx, cy, rad, r, g, b, peak) {
  const x0 = Math.max(0, Math.floor(cx - rad));
  const x1 = Math.min(W - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad));
  const y1 = Math.min(H - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rad, dy = (y - cy) / rad;
      const d = dx * dx + dy * dy;
      if (d < 1) {
        const f = (1 - d) * (1 - d);
        blend(x, y, r, g, b, peak * f);
      }
    }
  }
}
function thickLine(x0, y0, x1, y1, w, r, g, b, a) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len / Math.max(1, w * 0.5)));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    disc(x0 + dx * t, y0 + dy * t, w / 2, r, g, b, a);
  }
}
function lerp(a, b, t) { return a + (b - a) * t; }
function mix3(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// --- 1. sky: vertical gradient, deep indigo -> violet -> amber horizon ------
const SKY = [
  [0.00, [10, 14, 42]],
  [0.38, [29, 20, 69]],
  [0.58, [87, 42, 99]],
  [0.70, [198, 90, 60]],
  [0.72, [242, 166, 90]],
  [1.00, [242, 166, 90]],
];
for (let y = 0; y < 730; y++) {
  const t = y / 730;
  let c = SKY[SKY.length - 1][1];
  for (let s = 0; s < SKY.length - 1; s++) {
    if (t >= SKY[s][0] && t <= SKY[s + 1][0]) {
      const f = (t - SKY[s][0]) / (SKY[s + 1][0] - SKY[s][0]);
      c = mix3(SKY[s][1], SKY[s + 1][1], f);
      break;
    }
  }
  fillRect(0, y, W, y + 1, Math.round(c[0]), Math.round(c[1]), Math.round(c[2]));
}
// ground base
fillRect(0, 730, W, H, 16, 10, 32);

// --- 2. stars (upper sky) ----------------------------------------------------
for (let i = 0; i < 240; i++) {
  const x = rand() * W;
  const y = rand() * 560;
  const b = 0.35 + rand() * 0.65;
  const s = rand();
  const r = s < 0.12 ? 2.2 : 1.1;
  disc(x, y, r, 255, 244, 214, b * 0.9);
  if (s < 0.05) { // sparkle cross
    thickLine(x - 6, y, x + 6, y, 1, 255, 244, 214, b * 0.55);
    thickLine(x, y - 6, x, y + 6, 1, 255, 244, 214, b * 0.55);
  }
}

// --- 3. crescent moon with halo (upper right) --------------------------------
glow(838, 148, 150, 255, 226, 160, 0.30);
glow(838, 148, 80, 255, 240, 200, 0.55);
disc(838, 148, 58, 255, 246, 214, 1);
disc(862, 132, 52, 29, 22, 66, 1); // bite -> crescent (sky tone at that height)

// --- 4. distant mountain ridge ----------------------------------------------
function ridge(baseY, amp, col, seedOff) {
  const pts = [];
  const r2 = mulberry32(777 + seedOff);
  let y = baseY;
  for (let x = 0; x <= W; x += 8) {
    y += (r2() - 0.5) * amp;
    y = Math.max(baseY - amp * 1.6, Math.min(baseY + amp * 0.6, y));
    pts.push([x, y]);
  }
  for (let x = 0; x < W; x++) {
    const seg = Math.floor(x / 8);
    const t = (x - seg * 8) / 8;
    const yy = lerp(pts[seg][1], pts[Math.min(seg + 1, pts.length - 1)][1], t);
    fillRect(x, Math.round(yy), x + 1, H, col[0], col[1], col[2]);
  }
}
ridge(690, 26, [38, 26, 61], 1);
ridge(745, 20, [23, 16, 46], 2);

// --- 5. rolling hills ----------------------------------------------------------
function hill(topY, col) {
  for (let x = 0; x < W; x++) {
    const yy = topY + Math.sin(x / 260) * 26 + Math.sin(x / 97 + 2) * 9;
    fillRect(x, Math.round(yy), x + 1, H, col[0], col[1], col[2]);
  }
}
hill(800, [18, 12, 38]);
hill(880, [10, 8, 24]);

// --- 6. sleeping village on the far hill --------------------------------------
const vr = mulberry32(4242);
for (let i = 0; i < 15; i++) {
  const hx = 30 + vr() * 420;
  const hy = 812 + Math.sin(hx / 260) * 26 + Math.sin(hx / 97 + 2) * 9;
  const hw = 16 + vr() * 22;
  const hh = 12 + vr() * 12;
  fillRect(Math.round(hx), Math.round(hy - hh), Math.round(hx + hw), Math.round(hy), 8, 6, 20);
  // roof
  thickLine(hx - 2, hy - hh, hx + hw / 2, hy - hh - 9, 3, 8, 6, 20, 1);
  thickLine(hx + hw / 2, hy - hh - 9, hx + hw + 2, hy - hh, 3, 8, 6, 20, 1);
  // warm window
  const wx = hx + 4 + vr() * (hw - 10);
  const wy = hy - hh + 4 + vr() * (hh - 9);
  disc(wx, wy, 2.4, 255, 190, 90, 0.95);
  glow(wx, wy, 9, 255, 180, 80, 0.35);
}
// a few chimney smoke curls
for (let i = 0; i < 3; i++) {
  const sx = 90 + i * 130;
  const sy = 790;
  for (let s = 0; s < 5; s++) {
    disc(sx + Math.sin(s * 1.3 + i) * 8 - s * 3, sy - s * 12, 7 - s, 200, 190, 220, 0.10);
  }
}

// --- 7. the giant dandelion ----------------------------------------------------
// soft halo behind the head
glow(618, 322, 210, 255, 214, 130, 0.20);
glow(618, 322, 130, 255, 236, 170, 0.35);
// stem: gentle S-curve from head down to the hill
const stemPts = [];
for (let t = 0; t <= 1.0001; t += 0.05) {
  const x = 618 - 40 * Math.sin(t * 2.4) - t * 55;
  const y = 430 + t * 520;
  stemPts.push([x, y]);
}
for (let i = 0; i < stemPts.length - 1; i++) {
  thickLine(stemPts[i][0], stemPts[i][1], stemPts[i + 1][0], stemPts[i + 1][1], 9 - i * 0.25, 46, 92, 52, 1);
}
// two solid tapered leaves (overlapping discs merge into one shape)
for (const [lx, ly, dir] of [[585, 780, -1], [600, 880, 1]]) {
  for (let s = 0; s <= 40; s++) {
    const t = s / 40;
    const x = lx + dir * t * 95;
    const y = ly - Math.sin(t * Math.PI) * 26 + t * 18;
    disc(x, y, 8.5 * (1 - t * 0.55), 34, 74, 40, 1);
  }
}
// seed head: fine radiating filaments, denser at the rim
const fr = mulberry32(99);
for (let i = 0; i < 260; i++) {
  const ang = (i / 260) * Math.PI * 2 + (fr() - 0.5) * 0.09;
  const len = 96 + fr() * 42;
  const bend = (fr() - 0.5) * 26;
  const x1 = 618 + Math.cos(ang) * len + bend * 0.4;
  const y1 = 322 + Math.sin(ang) * len * 0.92 + bend * 0.3;
  const bright = 0.55 + fr() * 0.45;
  thickLine(618, 322, x1, y1, 1.6, 255, 248, 220, bright * 0.85);
  // tiny tuft at the tip
  disc(x1, y1, 2.6, 255, 250, 225, bright);
}
// glowing heart of the head
glow(618, 322, 62, 255, 232, 150, 0.30);
disc(618, 322, 26, 255, 240, 190, 0.95);

// --- 8. seeds lifting off: spiral upward, lanterns becoming stars ------------
const sr = mulberry32(31337);
for (let i = 0; i < 92; i++) {
  const t = i / 92; // 0 = just left the head, 1 = high in the sky
  const ang = 0.6 + t * 4.6; // spiral sweep
  const rad = 60 + t * 330;
  const cx = 618 + Math.cos(ang) * rad * 0.9 + (sr() - 0.5) * 46;
  const cy = 322 - t * 235 - Math.sin(t * Math.PI) * 30 + (sr() - 0.5) * 30;
  const size = 7.5 - t * 4.5;
  // glowing tail back toward the head
  const tx = cx - Math.cos(ang) * 26;
  const ty = cy + 20;
  thickLine(tx, ty, cx, cy, 1.4, 255, 214, 130, 0.45 * (1 - t * 0.4));
  // lantern glow + core
  glow(cx, cy, size * 3.4, 255, 200, 100, 0.55);
  disc(cx, cy, size * 0.55, 255, 244, 200, 1);
  if (t > 0.62) { // high seeds have become four-point stars
    const L = size * 2.1;
    thickLine(cx - L, cy, cx + L, cy, 1.2, 255, 246, 214, 0.9);
    thickLine(cx, cy - L, cx, cy + L, 1.2, 255, 246, 214, 0.9);
  }
}

// --- 9. foreground grass silhouettes + a few low fireflies --------------------
const gr = mulberry32(555);
for (let i = 0; i < 90; i++) {
  const gx = gr() * W;
  const gh = 14 + gr() * 42;
  const lean = (gr() - 0.5) * 26;
  thickLine(gx, H, gx + lean, H - gh, 2.4, 7, 10, 22, 1);
}
const fr2 = mulberry32(808);
for (let i = 0; i < 16; i++) {
  const fx = 60 + fr2() * (W - 120);
  const fy = 920 + fr2() * 90;
  glow(fx, fy, 12, 190, 255, 140, 0.5);
  disc(fx, fy, 2.2, 220, 255, 170, 1);
}

// --- 10. gentle vignette --------------------------------------------------------
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2);
    const dy = (y - H / 2) / (H / 2);
    const d = dx * dx + dy * dy;
    if (d > 1.15) {
      const f = Math.min(0.28, (d - 1.15) * 0.35);
      const i = (y * W + x) * 4;
      px[i] = Math.round(px[i] * (1 - f));
      px[i + 1] = Math.round(px[i + 1] * (1 - f));
      px[i + 2] = Math.round(px[i + 2] * (1 - f));
    }
  }
}

// --- PNG encode (filter 0 rows, zlib, CRC32) ------------------------------------
const CRC_TABLE = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0;
  raw.set(px.subarray(y * W * 4, (y + 1) * W * 4), y * (1 + W * 4) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync("art.png", png);
console.log("art.png bytes:", png.length);
