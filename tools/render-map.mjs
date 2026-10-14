// Renderiza maps/vale.json num PNG (tiles + sprites), para revisar o mapa fora do jogo.
// Uso: node tools/render-map.mjs saida.png [--grid]   (--grid pinta os tiles bloqueados)
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { buildWorldGrid } from '../src/systems/WorldGrid.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const [out = 'mapa.png', ...flags] = process.argv.slice(2);
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/vale.json'), 'utf8'));
const gm = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/generated/gm/sprites.json'), 'utf8'));
const T = map.tilewidth;
const W = map.width * T, H = map.height * T;
const img = new PNG({ width: W, height: H });
img.data.fill(0);
for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;

const sheets = map.tilesets.map(ts => ({ ...ts, png: PNG.sync.read(fs.readFileSync(path.resolve(ROOT, 'maps', ts.image))) }));
const blend = (dx, dy, r, g, b, a) => {
  if (dx < 0 || dy < 0 || dx >= W || dy >= H || !a) return;
  const i = (dy * W + dx) * 4, k = a / 255;
  img.data[i] = r * k + img.data[i] * (1 - k);
  img.data[i + 1] = g * k + img.data[i + 1] * (1 - k);
  img.data[i + 2] = b * k + img.data[i + 2] * (1 - k);
};

function drawTile(gid, tx, ty) {
  const flags = gid >>> 29, id = gid & 0x1fffffff;
  const ts = [...sheets].reverse().find(s => id >= s.firstgid);
  const local = id - ts.firstgid, sx0 = (local % ts.columns) * T, sy0 = Math.floor(local / ts.columns) * T;
  const H_ = flags & 4, V_ = flags & 2, D_ = flags & 1;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let u = x, v = y;
    if (D_) [u, v] = [v, u];
    if (H_) u = T - 1 - u;
    if (V_) v = T - 1 - v;
    const si = ((sy0 + v) * ts.png.width + sx0 + u) * 4, p = ts.png.data;
    blend(tx * T + x, ty * T + y, p[si], p[si + 1], p[si + 2], p[si + 3]);
  }
}

const spriteCache = {};
function drawSprite(o) {
  const s = gm[o.name];
  if (!s) return;
  const png = spriteCache[o.name] ??= PNG.sync.read(fs.readFileSync(path.join(ROOT, `assets/generated/gm/${o.name}.png`)));
  const left = Math.round(o.x - s.ox), top = Math.round(o.y - s.oy);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const si = (y * png.width + x) * 4;
    blend(left + x, top + y, png.data[si], png.data[si + 1], png.data[si + 2], png.data[si + 3]);
  }
}

for (const l of map.layers) {
  if (l.type === 'tilelayer') l.data.forEach((g, i) => g && drawTile(g, i % map.width, Math.floor(i / map.width)));
  else [...l.objects].sort((a, b) => a.y - b.y).forEach(drawSprite);
}

if (flags.includes('--grid')) {
  const grid = buildWorldGrid(map, gm);
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    if (!grid.isBlocked(tx, ty)) continue;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) blend(tx * T + x, ty * T + y, 255, 0, 0, 90);
  }
}
fs.writeFileSync(out, PNG.sync.write(img));
console.log(`${out}: ${W}x${H}`);
