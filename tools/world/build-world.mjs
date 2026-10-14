// Gera maps/vale.json: o Vale do Brotar redesenhado.
//
// Vila cercada por muro de pedra (guilda, templo, taverna, ferraria, mercado, casas),
// praça com poço e quadro de missões, estradas de terra ligando os portões; fora dos
// muros a fazenda do Semeador (cercada, com casinha, moinho, poço e curral), um lago,
// a Floresta dos Goblins ao norte, o Cemitério Antigo a sudeste e a pedreira a sudoeste.
//
// Casas vêm inteiras do mapa de exemplo do pack (carimbos); muros, cercas, caminhos e
// água usam tiles do tileset; estradas e lagos usam o autotile aprendido do exemplo.
// Também escreve a camada "poi" com os pontos que o jogo usa (fazenda, portões, casas...).

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { learnAutotile, paintAutotile } from './autotile.mjs';
import { extractStamp, pasteStamp } from './stamps.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const T = 16;
const W = 150, H = 110;
const GID = 0x1fffffff;
const gid = id => id + 1; // id do tileset 16px -> gid

// --- Peças do tileset (ids 0-based) ---------------------------------------
const GRASS = 194, GRASS_VARIANTS = [129, 130, 131, 132, 133, 134];
const DIRT_FULL = 460, WATER_FULL = 470;
const PATH2 = [460, 461, 462, 463, 464, 465, 466, 467, 524, 525, 526, 527, 528, 529, 530];
const PATH2_SOLID = [460, 461, 462, 464, 524];
const RIVER = [470, 471, 472, 473, 474, 475, 476, 477, 534, 535, 536, 537, 538, 539, 540];
const RIVER_SOLID = [470, 471, 472, 474, 534];
const FENCE = { h: 39, left: 38, right: 170, v: 232, top: 104, bottom: 296, tl: 103, tr: 102, post: 233 };
const WALL = { h: [109, 110], left: 108, right: 111, v: [236, 300], top: 172, bottom: 364, gate: 174, gateL: 173, gateR: 175 };
const FLOWERS = [98, 162, 226, 227];
const PEBBLE = 290, STUMP = 352;
const GRAVES = [1003, 1004, 1005, 1006, 1007];           // lápide baixa
const TALL_GRAVES = [1067, 1068, 1069, 1070, 1071];      // lápide alta

// Casas (componentes do prédio no mapa de exemplo: x0, y0, x1, y1).
const HOUSES = {
  guild: [39, 24, 47, 29], temple: [13, 26, 18, 31], tavern: [17, 33, 27, 38], forge: [55, 31, 60, 34],
  red: [32, 19, 36, 23], green: [21, 25, 24, 28], redSmall: [30, 26, 33, 29], greenSmall: [70, 26, 73, 28],
  greenTall: [40, 33, 44, 37], redTall: [76, 39, 79, 44], hut: [22, 17, 24, 19], windmill: [38, 14, 42, 19],
};

// Gerador determinístico.
let seed = 777;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = a => a[Math.floor(rand() * a.length)];
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));

export function buildWorld(example) {
  const layerNames = ['ground', 'land', 'paths', 'shadows', 'decoration_01', 'building', 'walls', 'forest', 'decoration_02', 'decoration_03'];
  const map = {
    type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'orthogonal', renderorder: 'right-down',
    width: W, height: H, tilewidth: T, tileheight: T, infinite: false,
    tilesets: example.tilesets,
    properties: [{ name: 'origem', type: 'string', value: 'Gerado por tools/world/build-world.mjs' }],
    layers: [
      ...layerNames.map(name => ({ name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data: new Array(W * H).fill(0) })),
      { name: 'Assets_1', type: 'objectgroup', draworder: 'index', x: 0, y: 0, opacity: 1, visible: true, objects: [] },
      { name: 'poi', type: 'objectgroup', draworder: 'index', x: 0, y: 0, opacity: 1, visible: false, objects: [] },
    ],
  };
  const L = name => map.layers.find(l => l.name === name).data;
  const set = (name, x, y, id) => { if (x >= 0 && y >= 0 && x < W && y < H) L(name)[y * W + x] = id < 0 ? 0 : gid(id); };
  let nextId = 1;
  const newId = () => nextId++;
  const occupied = new Uint8Array(W * H); // onde não pode ter árvore/enfeite aleatório
  const occupy = (x, y, w, h, pad = 0) => {
    for (let j = y - pad; j < y + h + pad; j++) for (let i = x - pad; i < x + w + pad; i++) if (i >= 0 && j >= 0 && i < W && j < H) occupied[j * W + i] = 1;
  };
  const sprite = (name, px, py, frame = 0) => map.layers.find(l => l.name === 'Assets_1').objects.push({
    id: newId(), name, type: 'sprite', x: px, y: py, width: 0, height: 0, rotation: 0, visible: true,
    properties: [{ name: 'frame', type: 'int', value: frame }, { name: 'scaleX', type: 'float', value: 1 }, { name: 'scaleY', type: 'float', value: 1 }, { name: 'animSpeed', type: 'float', value: 1 }],
  });
  const poi = (name, x, y, w = 1, h = 1, props = {}) => map.layers.find(l => l.name === 'poi').objects.push({
    id: newId(), name, type: 'poi', x: x * T, y: y * T, width: w * T, height: h * T, rotation: 0, visible: true,
    properties: Object.entries(props).map(([k, v]) => ({ name: k, type: typeof v === 'number' ? 'int' : 'string', value: v })),
  });

  // Grama de base.
  L('ground').forEach((_, i, a) => { a[i] = gid(rand() < 0.08 ? pick(GRASS_VARIANTS) : GRASS); });

  // --- Estradas e áreas de terra ---------------------------------------------
  const dirt = new Uint8Array(W * H);
  const dirtRect = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) dirt[j * W + i] = 1; };
  const water = new Uint8Array(W * H);
  const waterBlob = (cx, cy, rx, ry) => {
    for (let j = cy - ry; j <= cy + ry; j++) for (let i = cx - rx; i <= cx + rx; i++) {
      const d = ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2;
      if (d <= 1 && i >= 0 && j >= 0 && i < W && j < H) water[j * W + i] = 1;
    }
  };

  // Vila (muro em volta de x 78..128, y 30..76).
  const V = { x0: 78, y0: 30, x1: 128, y1: 76 };
  const MAIN_Y = 52, MAIN_X = 102; // estradas principais (3 de largura)
  dirtRect(4, MAIN_Y, W - 8, 3);            // leste-oeste
  dirtRect(MAIN_X, 4, 3, H - 8);            // norte-sul
  dirtRect(95, 46, 17, 13);                 // praça
  dirtRect(V.x0 + 2, 41, V.x1 - V.x0 - 3, 2); // rua norte dentro dos muros
  dirtRect(V.x0 + 2, 64, V.x1 - V.x0 - 3, 2); // rua sul dentro dos muros

  // Fazenda (cerca em volta de x 20..62, y 36..70) e caminho até o portão oeste.
  const F = { x0: 20, y0: 36, x1: 62, y1: 70 };
  dirtRect(52, 38, 9, 8);                   // terreiro em frente à casinha
  dirtRect(F.x0 + 4, F.y1 - 9, 12, 6);      // curral
  // Clareira da floresta (norte), cemitério (sudeste) e pedreira (sudoeste).
  const FOREST = { x0: 88, y0: 6, x1: 118, y1: 20 };
  dirtRect(FOREST.x0 + 4, FOREST.y0 + 3, FOREST.x1 - FOREST.x0 - 8, FOREST.y1 - FOREST.y0 - 6);
  const GRAVE = { x0: 112, y0: 84, x1: 138, y1: 100 };
  dirtRect(MAIN_X, 92, GRAVE.x0 - MAIN_X, 3);
  const QUARRY = { x0: 22, y0: 82, x1: 58, y1: 100 };
  dirtRect(QUARRY.x0 + 2, QUARRY.y0 + 2, QUARRY.x1 - QUARRY.x0 - 4, QUARRY.y1 - QUARRY.y0 - 4);
  dirtRect(QUARRY.x1 - 2, 90, MAIN_X - QUARRY.x1 + 2, 3);
  // Lago perto da fazenda e um laguinho na vila.
  waterBlob(10, 22, 7, 5);
  waterBlob(130, 18, 6, 4);

  // --- Fazenda: cerca de madeira com porteira a leste --------------------------
  const fenceRing = (r, gates) => {
    const isGate = (x, y) => gates.some(([gx, gy, gw, gh]) => x >= gx && y >= gy && x < gx + gw && y < gy + gh);
    for (let x = r.x0; x <= r.x1; x++) for (const y of [r.y0, r.y1]) {
      if (isGate(x, y)) continue;
      const id = x === r.x0 ? (y === r.y0 ? FENCE.tl : FENCE.bottom) : x === r.x1 ? (y === r.y0 ? FENCE.tr : FENCE.bottom) : FENCE.h;
      set('walls', x, y, isGate(x - 1, y) ? FENCE.left : isGate(x + 1, y) ? FENCE.right : id);
    }
    for (let y = r.y0 + 1; y < r.y1; y++) for (const x of [r.x0, r.x1]) {
      if (isGate(x, y)) continue;
      set('walls', x, y, isGate(x, y + 1) ? FENCE.bottom : isGate(x, y - 1) ? FENCE.top : FENCE.v);
    }
  };
  fenceRing(F, [[F.x1, MAIN_Y, 1, 3]]);
  fenceRing({ x0: F.x0 + 3, y0: F.y1 - 10, x1: F.x0 + 16, y1: F.y1 - 2 }, [[F.x0 + 9, F.y1 - 10, 3, 1]]); // curral

  // --- Vila: muro de pedra com quatro portões ---------------------------------
  const gates = [[V.x0, MAIN_Y, 1, 3], [V.x1, MAIN_Y, 1, 3], [MAIN_X, V.y0, 3, 1], [MAIN_X, V.y1, 3, 1]];
  const isGate = (x, y) => gates.some(([gx, gy, gw, gh]) => x >= gx && y >= gy && x < gx + gw && y < gy + gh);
  for (let x = V.x0; x <= V.x1; x++) for (const y of [V.y0, V.y1]) {
    if (isGate(x, y)) continue;
    let id = WALL.h[(x + y) % 2];
    if (x === V.x0 || isGate(x - 1, y)) id = WALL.left;
    if (x === V.x1 || isGate(x + 1, y)) id = WALL.right;
    set('walls', x, y, id);
  }
  for (let y = V.y0 + 1; y < V.y1; y++) for (const x of [V.x0, V.x1]) {
    if (isGate(x, y)) continue;
    let id = WALL.v[y % 2];
    if (isGate(x, y + 1)) id = WALL.bottom;
    if (isGate(x, y - 1) || y === V.y0 + 1) id = WALL.top;
    set('walls', x, y, id);
  }
  // Tochas (fogo) nos portões.
  for (const [gx, gy, gw, gh] of gates) {
    const horiz = gw > 1;
    const a = horiz ? [gx - 1, gy] : [gx, gy - 1], b = horiz ? [gx + gw, gy] : [gx, gy + gh];
    for (const [x, y] of [a, b]) sprite('spr_deco_fire_01', x * T + 8, y * T - 2, between(0, 3));
  }
  occupy(V.x0, V.y0, V.x1 - V.x0 + 1, V.y1 - V.y0 + 1); // dentro dos muros nada é aleatório

  // --- Casas ------------------------------------------------------------------
  const stamps = Object.fromEntries(Object.entries(HOUSES).map(([k, [x0, y0, x1, y1]]) =>
    [k, extractStamp(example, { x: x0, y: y0 - 1, w: x1 - x0 + 1, h: y1 - y0 + 2 })]));
  // Coloca o carimbo com a base (porta) na linha "baseY", centrado em cx.
  const placeHouse = (key, cx, baseY, poiName) => {
    const s = stamps[key];
    const x = cx - Math.floor(s.w / 2), y = baseY - s.h + 1;
    pasteStamp(map, s, x, y, newId);
    occupy(x, y, s.w, s.h, 1);
    dirtRect(cx - 1, baseY + 1, 3, 1); // soleira de terra na frente da porta
    if (poiName) poi(poiName, x, y, s.w, s.h, { doorX: cx, doorY: baseY + 1 });
    return { x, y, w: s.w, h: s.h };
  };
  // Quadrante noroeste
  placeHouse('temple', 86, 40, 'temple');
  placeHouse('red', 94, 40, 'house_clara');
  placeHouse('green', 84, 50, 'house_1');
  placeHouse('redSmall', 92, 50, 'house_2');
  // Quadrante nordeste
  placeHouse('guild', 113, 40, 'guild');
  placeHouse('greenTall', 123, 40, 'house_dario');
  placeHouse('redTall', 123, 50, 'house_3');
  // Mercado: barracas improvisadas com caixotes, barris e jarros.
  for (const [dx, dy, name] of [[0, 0, 'spr_deco_crate_01'], [1, 0, 'spr_deco_crate_02'], [3, 0, 'spr_deco_barrel_closed'], [0, 2, 'spr_deco_jar_01'], [2, 2, 'spr_deco_jar_02'], [4, 2, 'spr_deco_barrel_open'], [5, 0, 'spr_deco_crate_01']]) {
    sprite(name, (113 + dx) * T + 8, (45 + dy) * T + 12);
  }
  occupy(113, 44, 7, 4);
  poi('market', 113, 44, 7, 4);
  poi('dario_spot', 116, 48);
  // Quadrante sudoeste: ferraria
  placeHouse('forge', 87, 62, 'forge');
  sprite('spr_deco_anvil', 92 * T + 8, 61 * T + 12);
  sprite('spr_deco_barrel_swords', 93 * T + 8, 60 * T + 12);
  sprite('spr_deco_firepit', 82 * T + 8, 61 * T + 8);
  placeHouse('greenSmall', 85, 73, 'house_4');
  placeHouse('red', 94, 73, 'house_bruno');
  // Quadrante sudeste: taverna
  placeHouse('tavern', 115, 62, 'tavern');
  placeHouse('green', 110, 73, 'house_lina');
  placeHouse('redSmall', 120, 73, 'house_5');

  // Praça: poço, quadro de missões (posto pelo jogo), estátua e bancos de flores.
  sprite('spr_deco_well', 106 * T + 8, 49 * T + 8);
  occupy(105, 47, 3, 3);
  for (const [x, y] of [[96, 47], [110, 47], [96, 57], [110, 57]]) set('decoration_01', x, y, pick(FLOWERS));
  poi('quest_board', 99, 49);
  poi('guild_master', 116, 42);
  poi('plaza_walk', 97, 55, 12, 3);
  poi('plaza', 95, 46, 17, 13);

  // Vida dentro dos muros: árvores junto ao muro, canteiros de flores e fogueiras na praça.
  for (let x = V.x0 + 2; x < V.x1 - 1; x += 1) for (const y of [V.y0 + 2, V.y1 - 2]) {
    if (!occupied[y * W + x] && !dirt[y * W + x] && rand() < 0.18) set('decoration_01', x, y, pick(FLOWERS));
  }
  for (const [x, y] of [[V.x0 + 2, V.y0 + 3], [V.x1 - 2, V.y0 + 3], [V.x0 + 2, V.y1 - 3], [V.x1 - 2, V.y1 - 3], [V.x0 + 2, 46], [V.x1 - 2, 60]]) {
    occupied[y * W + x] = 0;
    treeAt(x, y);
  }
  for (const [x, y] of [[95, 46], [111, 46], [95, 58], [111, 58]]) sprite('spr_deco_fire_02', x * T + 8, y * T + 10, between(0, 3));

  // --- Fazenda: casinha, moinho, poço, caixa de vendas, curral -----------------
  placeHouse('hut', 56, 40, 'player_home');
  placeHouse('windmill', 25, 43, 'windmill');
  sprite('spr_deco_well_covered', 59 * T + 8, 44 * T + 8);
  occupy(58, 42, 3, 3);
  poi('sell_box', 54, 44);
  poi('spawn', 56, 42);
  poi('tereza', 52, 42);
  poi('farm_zone', 30, 46, 22, 18); // onde dá para arar
  poi('pen', F.x0 + 4, F.y1 - 9, 12, 6);
  occupy(F.x0, F.y0, F.x1 - F.x0 + 1, F.y1 - F.y0 + 1);
  // Animais no curral e galinhas soltas no terreiro.
  for (let k = 0; k < 3; k++) sprite('spr_deco_cow', (F.x0 + 6 + k * 3) * T, (F.y1 - 7) * T + 8);
  for (let k = 0; k < 3; k++) sprite('spr_deco_sheep_01', (F.x0 + 7 + k * 3) * T, (F.y1 - 4) * T + 8);
  for (let k = 0; k < 2; k++) sprite('spr_deco_pig_01', (F.x0 + 13) * T, (F.y1 - 7 + k * 3) * T + 8);
  for (let k = 0; k < 4; k++) sprite('spr_deco_chicken_01', (53 + k * 2) * T, 46 * T + 8);
  sprite('spr_deco_trough', (F.x0 + 5) * T + 8, (F.y1 - 4) * T + 8);

  // --- Áreas de caça ------------------------------------------------------------
  poi('hunt_goblins', FOREST.x0 + 5, FOREST.y0 + 4, FOREST.x1 - FOREST.x0 - 10, FOREST.y1 - FOREST.y0 - 8, { enemy: 'goblin', count: 5, label: 'Floresta dos Goblins' });
  sprite('spr_deco_campfire', ((FOREST.x0 + FOREST.x1) / 2) * T, ((FOREST.y0 + FOREST.y1) / 2) * T);
  for (let k = 0; k < 4; k++) sprite(pick(['spr_deco_barrel_closed', 'spr_deco_crate_02']), (FOREST.x0 + 6 + k * 5) * T, (FOREST.y0 + 4) * T + 12);
  occupy(FOREST.x0 + 3, FOREST.y0 + 2, FOREST.x1 - FOREST.x0 - 6, FOREST.y1 - FOREST.y0 - 4);
  // Floresta densa em volta da clareira.
  for (let y = FOREST.y0 - 4; y <= FOREST.y1 + 3; y += 2) for (let x = FOREST.x0 - 14; x <= FOREST.x1 + 14; x += 2) {
    const inClearing = x > FOREST.x0 + 2 && x < FOREST.x1 - 2 && y > FOREST.y0 + 1 && y < FOREST.y1 - 1;
    if (inClearing || occupied[y * W + x] || (x >= MAIN_X - 1 && x <= MAIN_X + 3) || rand() < 0.2) continue;
    tree(x, y);
  }

  poi('hunt_skeletons', GRAVE.x0 + 2, GRAVE.y0 + 2, GRAVE.x1 - GRAVE.x0 - 4, GRAVE.y1 - GRAVE.y0 - 4, { enemy: 'skeleton', count: 5, label: 'Cemitério Antigo' });
  // Cemitério: muro baixo de pedra e lápides.
  for (let x = GRAVE.x0; x <= GRAVE.x1; x++) { set('walls', x, GRAVE.y0, x === GRAVE.x0 ? WALL.left : x === GRAVE.x1 ? WALL.right : WALL.h[x % 2]); }
  for (let x = GRAVE.x0; x <= GRAVE.x1; x++) { if (x < GRAVE.x0 + 2 || x > GRAVE.x0 + 4) set('walls', x, GRAVE.y1, x === GRAVE.x0 ? WALL.left : x === GRAVE.x1 ? WALL.right : x === GRAVE.x0 + 5 ? WALL.left : WALL.h[x % 2]); }
  for (let y = GRAVE.y0 + 1; y < GRAVE.y1; y++) {
    if (y < 91 || y > 95) set('walls', GRAVE.x0, y, y === 90 ? WALL.bottom : y === 96 ? WALL.top : WALL.v[y % 2]);
    set('walls', GRAVE.x1, y, y === GRAVE.y0 + 1 ? WALL.top : WALL.v[y % 2]);
  }
  for (let y = GRAVE.y0 + 3; y < GRAVE.y1 - 2; y += 3) for (let x = GRAVE.x0 + 4; x < GRAVE.x1 - 2; x += 3) {
    if (rand() > 0.75) continue;
    set('decoration_02', x, y, pick(rand() < 0.5 ? GRAVES : TALL_GRAVES));
  }
  occupy(GRAVE.x0, GRAVE.y0, GRAVE.x1 - GRAVE.x0 + 1, GRAVE.y1 - GRAVE.y0 + 1);

  poi('quarry', QUARRY.x0, QUARRY.y0, QUARRY.x1 - QUARRY.x0, QUARRY.y1 - QUARRY.y0, { label: 'Pedreira' });
  for (let k = 0; k < 14; k++) {
    sprite(pick(['spr_deco_ore_stone', 'spr_deco_ore_coal', 'spr_deco_ore_silver', 'spr_deco_ore_stone']), between(QUARRY.x0 + 3, QUARRY.x1 - 3) * T + 8, between(QUARRY.y0 + 3, QUARRY.y1 - 3) * T + 12);
  }
  for (let k = 0; k < 10; k++) sprite('rock', between(QUARRY.x0 + 3, QUARRY.x1 - 3) * T + 3, between(QUARRY.y0 + 3, QUARRY.y1 - 3) * T + 3);
  sprite('spr_deco_minecart', (QUARRY.x0 + 5) * T, (QUARRY.y0 + 4) * T);
  occupy(QUARRY.x0, QUARRY.y0, QUARRY.x1 - QUARRY.x0 + 1, QUARRY.y1 - QUARRY.y0 + 1);

  // --- Água, estradas -----------------------------------------------------------
  // Suaviza os lagos: o autotile só tem peças para degraus de 1 tile.
  for (let pass = 0; pass < 3; pass++) {
    const next = water.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const n4 = water[i - 1] + water[i + 1] + water[i - W] + water[i + W];
      if (water[i] && n4 <= 2) next[i] = 0;
      if (!water[i] && n4 >= 3) next[i] = 1;
    }
    water.set(next);
  }
  for (let i = 0; i < W * H; i++) if (water[i]) { dirt[i] = 0; occupied[i] = 1; }
  for (let i = 0; i < W * H; i++) if (dirt[i]) occupied[i] = 1;
  const pathTable = learnAutotile(example, 'paths', PATH2_SOLID, PATH2);
  const riverTable = learnAutotile(example, 'land', RIVER_SOLID, RIVER);
  paintAutotile(L('paths'), W, H, dirt, pathTable, gid(DIRT_FULL));
  paintAutotile(L('land'), W, H, water, riverTable, gid(WATER_FULL));
  // Patos no lago.
  for (const [x, y] of [[9, 21], [12, 23], [131, 18]]) sprite('spr_deco_duck_01', x * T, y * T);

  // --- Natureza -------------------------------------------------------------------
  function treeAt(x, y) {
    occupied[y * W + x] = 0;
    tree(x, y);
  }
  function tree(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H || occupied[y * W + x]) return;
    const px = x * T + 8 + between(-4, 4), py = y * T + 14 + between(0, 4);
    if (rand() < 0.5) sprite('spr_deco_tree_02', px, py, between(0, 3));
    else sprite('spr_deco_tree_01', px - 16, py - 34, between(0, 3));
    occupy(x, y, 1, 1);
  }
  // Mata fechada nas bordas do mapa.
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (edge < 5 && rand() < 0.92 && !dirt[y * W + x]) tree(x, y);
  }
  // Bosques.
  for (let n = 0; n < 40; n++) {
    const cx = between(8, W - 9), cy = between(8, H - 9);
    if (occupied[cy * W + cx]) continue;
    const count = between(4, 12);
    for (let k = 0; k < count; k++) tree(cx + between(-4, 4), cy + between(-3, 3));
  }
  // Árvores ao longo das estradas fora dos muros.
  for (let x = 8; x < W - 8; x += between(3, 6)) for (const y of [MAIN_Y - 2, MAIN_Y + 4]) if (rand() < 0.5) tree(x, y);
  // Enfeites soltos: flores, arbustos, tocos, cogumelos, gravetos e pedras.
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = Math.floor(i / W);
    if (occupied[i] || x < 4 || y < 4 || x > W - 5 || y > H - 5) continue;
    const r = rand();
    if (r < 0.025) set('decoration_01', x, y, pick(FLOWERS));
    else if (r < 0.029) set('decoration_01', x, y, PEBBLE);
    else if (r < 0.031) set('decoration_01', x, y, STUMP);
    else if (r < 0.037) sprite(rand() < 0.5 ? 'spr_deco_mushroom_red_01' : 'spr_deco_mushroom_blue_01', x * T + 8, y * T + 12, between(0, 3));
    else if (r < 0.042) sprite(rand() < 0.65 ? 'wood' : 'rock', x * T + 3, y * T + 3);
  }

  // Tiles praticamente vazios atrapalhariam a colisão: tira das camadas que bloqueiam.
  const opacity = tileOpacity(map);
  for (const name of ['building', 'walls', 'forest']) {
    const d = L(name);
    d.forEach((g, i) => { if (g && opacity(g) < 24) d[i] = 0; });
  }

  // Pontos de interesse das estradas e portões, para o mapa do jogo.
  poi('gate_west', V.x0, MAIN_Y, 1, 3);
  poi('gate_east', V.x1, MAIN_Y, 1, 3);
  poi('gate_north', MAIN_X, V.y0, 3, 1);
  poi('gate_south', MAIN_X, V.y1, 3, 1);
  poi('village', V.x0, V.y0, V.x1 - V.x0 + 1, V.y1 - V.y0 + 1, { label: 'Vila do Brotar' });
  poi('farm', F.x0, F.y0, F.x1 - F.x0 + 1, F.y1 - F.y0 + 1, { label: 'Fazenda' });
  poi('lake', 3, 17, 15, 11, { label: 'Lago' });

  map.nextlayerid = map.layers.length + 1;
  map.nextobjectid = nextId;
  map.layers.forEach((l, i) => { l.id = i + 1; });
  return map;
}

function tileOpacity(map) {
  const sheets = map.tilesets.map(ts => ({ ...ts, png: PNG.sync.read(fs.readFileSync(path.resolve(ROOT, 'maps', ts.image))) }));
  const cache = new Map();
  return g => {
    const id = g & GID;
    if (cache.has(id)) return cache.get(id);
    const ts = [...sheets].reverse().find(t => id >= t.firstgid);
    const local = id - ts.firstgid, sx = (local % ts.columns) * T, sy = Math.floor(local / ts.columns) * T;
    let n = 0;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (ts.png.data[((sy + y) * ts.png.width + sx + x) * 4 + 3]) n++;
    cache.set(id, n);
    return n;
  };
}

if (import.meta.filename === path.resolve(process.argv[1])) {
  const example = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/vale_exemplo.json'), 'utf8'));
  const out = buildWorld(example);
  fs.writeFileSync(path.join(ROOT, 'maps/vale.json'), JSON.stringify(out));
  console.log(`maps/vale.json: ${out.width}x${out.height} tiles`);
}
