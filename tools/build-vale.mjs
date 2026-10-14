// Gera maps/vale.json a partir do mapa de exemplo do pack: tira o formato de ilhas
// (o mar vira campo, a costa de penhascos é aplainada) e amplia o mapa com campos e
// floresta em volta. Penhascos internos, rios, pontes e escadas do exemplo continuam.
//
// Uso: node tools/build-vale.mjs  (o setup:assets já chama)

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'maps/vale_exemplo.json');
const OUT = path.join(ROOT, 'maps/vale.json');

const PAD = { left: 40, right: 34, top: 26, bottom: 28 }; // margem em tiles em volta do exemplo
const COAST_DEPTH = 3;      // quantos tiles da costa são aplainados
const ISLET_MAX = 40;       // ilhas menores que isso (em tiles) são removidas
const GID = 0x1fffffff;
const T = 16;

const GRASS = 194;
const GRASS_VARIANTS = [129, 130, 131, 132, 133, 134];
// Tiles que pertencem ao mar: vazio, tile "vazio" do autotile Land e bordas com espuma.
const SEA = new Set([264, 148, 151, 211, 212, 215, 339, 340, 341, 403, 405, 414, 416]);
// Bordas de planalto e faces de penhasco que somem quando ficam perto do antigo mar.
const COAST = new Set([101, 147, 149, 150, 196, 197, 198, 199, 200, 202, 203, 259, 260, 261, 262, 263, 266, 267, 268, 330, 332, 394, 396, 418, 536]);
const KEEP_ON_SEA = new Set(['building', 'forest']);
const DROP_LAYERS = new Set(['sea', 'clouds_01', 'clouds_02', 'cloud_shadow']);
// Objetos que só fazem sentido na água.
const SEA_OBJECTS = /coracle|oar|duck|swimming|reeling|caught/;

// Gerador determinístico, para o mapa sair igual a cada setup.
let seed = 20261014;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

export function buildVale(src) {
  const W0 = src.width, H0 = src.height;
  const W = W0 + PAD.left + PAD.right, H = H0 + PAD.top + PAD.bottom;
  const layer = name => src.layers.find(l => l.name === name);
  const land0 = layer('land').data;
  const tile = g => (g & GID) - 1;

  // 1. Mar e faixa costeira no mapa original.
  const sea = new Uint8Array(W0 * H0);
  land0.forEach((g, i) => { if (!g || SEA.has(tile(g))) sea[i] = 1; });
  const dist = new Uint8Array(W0 * H0).fill(255);
  const queue = [];
  sea.forEach((s, i) => { if (s) { dist[i] = 0; queue.push(i); } });
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], x = i % W0, y = Math.floor(i / W0);
    if (dist[i] >= COAST_DEPTH) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy, j = ny * W0 + nx;
      if (nx < 0 || ny < 0 || nx >= W0 || ny >= H0 || dist[j] !== 255) continue;
      if (!COAST.has(tile(land0[j]))) continue; // só avança por borda/penhasco
      dist[j] = dist[i] + 1;
      queue.push(j);
    }
  }
  // Ilhotas que sobraram (pedaços pequenos de terra cercados de mar) também somem.
  const seen = new Uint8Array(W0 * H0);
  for (let i = 0; i < W0 * H0; i++) {
    if (seen[i] || dist[i] !== 255) continue;
    const comp = [i];
    seen[i] = 1;
    for (let q = 0; q < comp.length; q++) {
      const x = comp[q] % W0, y = Math.floor(comp[q] / W0);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = ny * W0 + nx;
        if (nx < 0 || ny < 0 || nx >= W0 || ny >= H0 || seen[j] || dist[j] !== 255) continue;
        seen[j] = 1;
        comp.push(j);
      }
    }
    if (comp.length < ISLET_MAX) for (const j of comp) dist[j] = 0;
  }
  const flattened = i => dist[i] !== 255; // mar, costa aplainada ou ilhota

  // 2. Copia as camadas para o mapa maior, limpando o que era mar e costa.
  const at = (x, y) => (y + PAD.top) * W + x + PAD.left;
  const layers = [];
  const ground = new Array(W * H).fill(0).map(() => 1 + (rand() < 0.08 ? GRASS_VARIANTS[Math.floor(rand() * GRASS_VARIANTS.length)] : GRASS));
  layers.push({ name: 'ground', type: 'tilelayer', data: ground });

  for (const l of src.layers) {
    if (DROP_LAYERS.has(l.name)) continue;
    if (l.type === 'tilelayer') {
      const data = new Array(W * H).fill(0);
      l.data.forEach((g, i) => {
        if (!g) return;
        const x = i % W0, y = Math.floor(i / W0);
        // Em cima do antigo mar só ficam prédios e floresta; píeres, cercas e escadas soltas saem.
        if (flattened(i) && !KEEP_ON_SEA.has(l.name)) return;
        data[at(x, y)] = g;
      });
      layers.push({ name: l.name, type: 'tilelayer', data });
    } else {
      const objects = l.objects
        .filter(o => {
          const x = Math.floor(o.x / T), y = Math.floor(o.y / T);
          const onSea = x >= 0 && y >= 0 && x < W0 && y < H0 && flattened(y * W0 + x);
          return !SEA_OBJECTS.test(o.name) && !(onSea && !/bird/.test(o.name));
        })
        .map(o => ({ ...o, x: o.x + PAD.left * T, y: o.y + PAD.top * T }));
      layers.push({ ...l, objects });
    }
  }

  // 3. Natureza em volta: floresta densa nas bordas e árvores soltas pelo campo.
  const trees = layers.find(l => l.name === 'Assets_1');
  const insideExample = (x, y) => x >= PAD.left - 2 && y >= PAD.top - 2 && x < PAD.left + W0 + 2 && y < PAD.top + H0 + 2;
  let nextId = 100000;
  const addSprite = (name, x, y, frame = 0) => trees.objects.push({
    id: nextId++, name, type: 'sprite', x, y, width: 0, height: 0, rotation: 0, visible: true,
    properties: [{ name: 'frame', type: 'int', value: frame }, { name: 'scaleX', type: 'float', value: 1 }, { name: 'scaleY', type: 'float', value: 1 }, { name: 'animSpeed', type: 'float', value: 1 }],
  });
  const BORDER = 6;
  const free = (x, y) => !insideExample(x, y);
  const plantTree = (px, py) => {
    // tree_02 tem origem na base; tree_01 no canto superior esquerdo (32x34).
    if (rand() < 0.5) addSprite('spr_deco_tree_02', px, py, Math.floor(rand() * 4));
    else addSprite('spr_deco_tree_01', px - 16, py - 34, Math.floor(rand() * 4));
  };
  // Mata fechada nas bordas do mapa.
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    if (free(x, y) && Math.min(x, y, W - 1 - x, H - 1 - y) < BORDER && rand() < 0.9) {
      plantTree(x * T + 8 + Math.floor(rand() * 12) - 6, y * T + 16 + Math.floor(rand() * 10));
    }
  }
  // Bosques espalhados pelo campo, com cogumelos por perto.
  for (let n = 0; n < 34; n++) {
    const cx = BORDER + 4 + Math.floor(rand() * (W - 2 * BORDER - 8)), cy = BORDER + 4 + Math.floor(rand() * (H - 2 * BORDER - 8));
    if (!free(cx, cy)) continue;
    const count = 4 + Math.floor(rand() * 10);
    for (let k = 0; k < count; k++) {
      const x = cx + Math.round((rand() - 0.5) * 8), y = cy + Math.round((rand() - 0.5) * 6);
      if (free(x, y)) plantTree(x * T + 8, y * T + 16);
    }
    if (rand() < 0.6) addSprite(rand() < 0.5 ? 'spr_deco_mushroom_red_01' : 'spr_deco_mushroom_blue_01', cx * T + 20, cy * T + 30);
  }
  // Gravetos e pedras soltos para coletar no campo aberto.
  for (let n = 0; n < 70; n++) {
    const x = BORDER + 2 + Math.floor(rand() * (W - 2 * BORDER - 4)), y = BORDER + 2 + Math.floor(rand() * (H - 2 * BORDER - 4));
    if (free(x, y)) addSprite(rand() < 0.6 ? 'wood' : 'rock', x * T + 3, y * T + 3);
  }
  // Galinhas soltas perto da fazenda e um rebanho de ovelhas no pasto ao sul.
  for (const [name, tx, ty, count] of [['spr_deco_chicken_01', 36, 44, 4], ['spr_deco_sheep_01', 30, 62, 5], ['spr_deco_cow', 44, 70, 2]]) {
    for (let k = 0; k < count; k++) addSprite(name, (tx + k * 2) * T + Math.floor(rand() * 8), (ty + (k % 2)) * T + 8);
  }

  let id = 1;
  return {
    ...src,
    width: W, height: H,
    properties: [
      { name: 'origem', type: 'string', value: 'Gerado por tools/build-vale.mjs a partir do exemplo do Sunnyside World V2.1' },
      { name: 'offsetX', type: 'int', value: PAD.left },
      { name: 'offsetY', type: 'int', value: PAD.top },
    ],
    layers: layers.map(l => ({ id: id++, x: 0, y: 0, opacity: 1, visible: true, ...(l.type === 'tilelayer' ? { width: W, height: H } : {}), ...l })),
    nextlayerid: id, nextobjectid: nextId,
  };
}

if (import.meta.filename === path.resolve(process.argv[1])) {
  const out = buildVale(JSON.parse(fs.readFileSync(SRC, 'utf8')));
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`maps/vale.json: ${out.width}x${out.height} tiles`);
}
