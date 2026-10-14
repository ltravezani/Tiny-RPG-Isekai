// Prepara os assets do Sunnyside World a partir dos .zip originais do pack.
//
// 1. Extrai Sunnyside_World_Assets/ para assets/sunnyside/ (nomes do pack intactos).
// 2. Junta os sprites que só existem no projeto GameMaker do pack (barris, baús,
//    poços, minérios...) em tiras PNG em assets/generated/gm/, com um manifesto.
// 3. Converte a sala de exemplo do pack (Room1) em um mapa Tiled: maps/vale_exemplo.json.
// 4. Gera o Vale do Brotar amplo, sem ilhas, a partir dele: maps/vale.json.
//
// Os assets não vão para o git (a licença proíbe redistribuir o pack); rode
// `npm run setup:assets` depois de clonar, com os .zip na raiz do projeto.

import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { PNG } from 'pngjs';
import { buildVale } from './build-vale.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACK_ZIP = path.join(ROOT, 'Sunnyside_World_ASSET_PACK_V2.1.zip');
const PACK_PREFIX = 'Sunnyside_World_ASSET_PACK_V2.1/';
const ASSETS_DIR = path.join(ROOT, 'assets/sunnyside');
const GM_OUT = path.join(ROOT, 'assets/generated/gm');
const MAP_OUT = path.join(ROOT, 'maps/vale_exemplo.json');

if (!fs.existsSync(PACK_ZIP)) {
  console.error(`Não encontrei ${path.basename(PACK_ZIP)} na raiz do projeto.`);
  process.exit(1);
}

const zip = new AdmZip(PACK_ZIP);
const entries = new Map();
for (const e of zip.getEntries()) {
  if (e.isDirectory || e.entryName.startsWith('__MACOSX') || e.entryName.endsWith('.DS_Store')) continue;
  entries.set(e.entryName.slice(PACK_PREFIX.length), e);
}

// Os .yy do GameMaker são JSON com vírgulas sobrando.
const readYY = name => JSON.parse(entries.get(name).getData().toString('utf8').replace(/,(\s*[}\]])/g, '$1'));
const writeJSON = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
};

// 1. Assets do pack -------------------------------------------------------
let copied = 0;
for (const [name, e] of entries) {
  if (!name.startsWith('Sunnyside_World_Assets/')) continue;
  const out = path.join(ASSETS_DIR, name.slice('Sunnyside_World_Assets/'.length));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, e.getData());
  copied++;
}
console.log(`assets/sunnyside: ${copied} arquivos`);

// 2. Sprites do projeto GameMaker -----------------------------------------
const GM = 'Sunnyside_World_Gamemaker/';
const manifest = {};
for (const name of entries.keys()) {
  const m = name.match(/^Sunnyside_World_Gamemaker\/sprites\/([^/]+)\/\1\.yy$/);
  if (!m || m[1].startsWith('spr_tileset')) continue;
  const spr = readYY(name);
  const keyframes = [...spr.sequence.tracks[0].keyframes.Keyframes].sort((a, b) => a.Key - b.Key);
  const frames = keyframes.map(k => PNG.sync.read(entries.get(`${GM}sprites/${m[1]}/${k.Channels['0'].Id.name}.png`).getData()));
  const { width: w, height: h } = spr;
  const strip = new PNG({ width: w * frames.length, height: h });
  frames.forEach((f, i) => PNG.bitblt(f, strip, 0, 0, w, h, i * w, 0));
  fs.mkdirSync(GM_OUT, { recursive: true });
  fs.writeFileSync(path.join(GM_OUT, `${m[1]}.png`), PNG.sync.write(strip));
  const seq = spr.sequence;
  manifest[m[1]] = {
    w, h, frames: frames.length,
    ox: seq.xorigin, oy: seq.yorigin,
    // playbackSpeedType 0 = quadros por segundo; 1 = quadros por passo de jogo (60/s)
    fps: seq.playbackSpeedType === 0 ? seq.playbackSpeed : seq.playbackSpeed * 60,
  };
}
writeJSON(path.join(GM_OUT, 'sprites.json'), manifest);
console.log(`assets/generated/gm: ${Object.keys(manifest).length} sprites`);

// 3. Sala de exemplo -> Tiled ---------------------------------------------
const room = readYY(`${GM}rooms/Room1/Room1.yy`);
const TILE = 16;
const grid = room.layers.find(l => l.resourceType === 'GMRTileLayer' && l.tiles.SerialiseWidth * TILE >= room.roomSettings.Width).tiles;
const W = grid.SerialiseWidth;
const H = grid.SerialiseHeight;
const FOREST_FIRSTGID = 4097;
const FOREST_COLS_32 = 10;

function decodeTiles(tiles) {
  if (tiles.TileSerialiseData) return tiles.TileSerialiseData;
  const src = tiles.TileCompressedData;
  const out = [];
  for (let i = 0; i < src.length;) {
    const n = src[i++];
    if (n < 0) { const v = src[i++]; for (let k = 0; k < -n; k++) out.push(v); }
    else for (let k = 0; k < n; k++) out.push(src[i++]);
  }
  return out;
}

// Transformações de tile do GameMaker (espelhar, inverter, girar 90°) para as
// flags do Tiled (H, V, diagonal), comparando as matrizes resultantes.
const mul = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
const I = [1, 0, 0, 1], MH = [-1, 0, 0, 1], MV = [1, 0, 0, -1], MD = [0, 1, 1, 0], ROT = [0, -1, 1, 0];
const tiledFlags = new Map();
for (let f = 0; f < 8; f++) {
  let m = I;
  if (f & 4) m = mul(MD, m);
  if (f & 1) m = mul(MH, m);
  if (f & 2) m = mul(MV, m);
  tiledFlags.set(m.join(), ((f & 1) ? 0x80000000 : 0) + ((f & 2) ? 0x40000000 : 0) + ((f & 4) ? 0x20000000 : 0));
}
function gmToGid(v, firstgid) {
  const idx = v & 0x7ffff;
  if (!idx) return 0;
  let m = I;
  if (v & (1 << 28)) m = mul(MH, m);
  if (v & (1 << 29)) m = mul(MV, m);
  if (v & (1 << 30)) m = mul(ROT, m);
  return firstgid + idx + tiledFlags.get(m.join());
}

const layers = [];
let nextId = 1;
const sorted = [...room.layers].sort((a, b) => b.depth - a.depth); // Tiled desenha o primeiro embaixo
for (const l of sorted) {
  if (l.resourceType === 'GMRTileLayer') {
    const raw = decodeTiles(l.tiles);
    const data = new Array(W * H).fill(0);
    if (l.tiles.SerialiseWidth === W) {
      raw.forEach((v, i) => { data[i] = gmToGid(v >>> 0, 1); });
    } else {
      // Camada da floresta usa tiles de 32px; quebra cada um em 4 tiles de 16px.
      const sw = l.tiles.SerialiseWidth;
      raw.forEach((v, i) => {
        const idx = (v >>> 0) & 0x7ffff;
        if (!idx) return;
        const mirror = v & (1 << 28);
        const c = idx % FOREST_COLS_32, r = Math.floor(idx / FOREST_COLS_32);
        const x = (i % sw) * 2, y = Math.floor(i / sw) * 2;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const sx = mirror ? 1 - dx : dx;
          data[(y + dy) * W + x + sx] = FOREST_FIRSTGID + (2 * r + dy) * FOREST_COLS_32 * 2 + 2 * c + dx + (mirror ? 0x80000000 : 0);
        }
      });
    }
    layers.push({ id: nextId++, name: l.name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data });
  } else if (l.resourceType === 'GMRAssetLayer') {
    layers.push({
      id: nextId++, name: l.name, type: 'objectgroup', draworder: 'index', opacity: 1, visible: true, x: 0, y: 0,
      objects: l.assets.map(a => ({
        id: nextId++, name: a.spriteId.name, type: 'sprite',
        x: a.x, y: a.y, width: 0, height: 0, rotation: -a.rotation, visible: true,
        properties: [
          { name: 'frame', type: 'int', value: Math.floor(a.headPosition) },
          { name: 'scaleX', type: 'float', value: a.scaleX },
          { name: 'scaleY', type: 'float', value: a.scaleY },
          { name: 'animSpeed', type: 'float', value: a.animationSpeed },
        ],
      })),
    });
  }
}

writeJSON(MAP_OUT, {
  type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'orthogonal', renderorder: 'right-down',
  width: W, height: H, tilewidth: TILE, tileheight: TILE, infinite: false,
  nextlayerid: nextId, nextobjectid: nextId,
  properties: [{ name: 'origem', type: 'string', value: 'Sunnyside World V2.1, Room1 do projeto GameMaker' }],
  tilesets: [
    { firstgid: 1, name: 'sunnyside_16', image: '../assets/sunnyside/Tileset/spr_tileset_sunnysideworld_16px.png',
      imagewidth: 1024, imageheight: 1024, tilewidth: 16, tileheight: 16, columns: 64, tilecount: 4096, margin: 0, spacing: 0 },
    { firstgid: FOREST_FIRSTGID, name: 'sunnyside_forest', image: '../assets/sunnyside/Tileset/spr_tileset_sunnysideworld_forest_32px.png',
      imagewidth: 320, imageheight: 576, tilewidth: 16, tileheight: 16, columns: 20, tilecount: 720, margin: 0, spacing: 0 },
  ],
  layers,
});
console.log(`maps/vale_exemplo.json: ${W}x${H} tiles, ${layers.length} camadas`);

// 4. Vale amplo, sem ilhas ---------------------------------------------------
const vale = buildVale(JSON.parse(fs.readFileSync(MAP_OUT, 'utf8')));
writeJSON(path.join(ROOT, 'maps/vale.json'), vale);
console.log(`maps/vale.json: ${vale.width}x${vale.height} tiles`);
