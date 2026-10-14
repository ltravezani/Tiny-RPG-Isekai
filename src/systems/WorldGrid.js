// Grade de colisão derivada das camadas e objetos do mapa.
// Funções puras sobre o JSON do Tiled, para poder rodar no jogo e em scripts.

const GID_MASK = 0x1fffffff;

// IDs de tile (0-based) do tileset 16px do Sunnyside, classificados olhando a folha.
const CLIFF = new Set([101, 147, 149, 150, 202, 203, 266, 267, 268, 330, 332, 394, 396, 418, 1803, 1804, 1868]);
const WATER = new Set([148, 151, 211, 212, 215, 264, 339, 340, 341, 403, 405, 414, 416, 470, 478, 540, 542, 543, 544, 545]);
// Pontes, escadas e passarelas da camada "paths": liberam a passagem por cima de água e penhasco.
const CROSSING = new Set([357, 358, 359, 360, 361, 422, 424, 650, 743, 744, 745, 807, 808, 809, 810]);
const BLOCKING_LAYERS = ['building', 'walls', 'forest'];

const BLOCKING_SPRITE = /tree|barrel|chest|crate|well|windmill$|windmill_withshadow|minecart|anvil|trough|jar|firepit|campfire|ore_|^rock$|cow|pig|sheep|^spr_(idle|doing|carry|attack|mining|axe|dig|watering|hammering|waiting|reeling|caught|casting)$|skeleton/;

export function buildWorldGrid(mapData, spriteManifest) {
  const { width: W, height: H, tilewidth: T } = mapData;
  const layer = name => mapData.layers.find(l => l.name === name && l.type === 'tilelayer');
  const tileAt = (l, i) => (l ? (l.data[i] & GID_MASK) - 1 : -1);

  const blocked = new Uint8Array(W * H);
  const land = layer('land'), paths = layer('paths');
  const blockers = BLOCKING_LAYERS.map(layer).filter(Boolean);

  for (let i = 0; i < W * H; i++) {
    const g = tileAt(land, i);
    if (CROSSING.has(tileAt(paths, i))) continue;
    blocked[i] = g < 0 || CLIFF.has(g) || WATER.has(g) || blockers.some(l => l.data[i]) ? 1 : 0;
  }

  // Objetos grandes (árvores, barris, baús, animais...) bloqueiam o tile da base.
  for (const group of mapData.layers.filter(l => l.type === 'objectgroup')) {
    for (const o of group.objects) {
      const s = spriteManifest[o.name];
      if (!s || !BLOCKING_SPRITE.test(o.name)) continue;
      const props = Object.fromEntries((o.properties ?? []).map(p => [p.name, p.value]));
      const sx = props.scaleX ?? 1, sy = props.scaleY ?? 1;
      const left = o.x - s.ox * sx, top = o.y - s.oy * sy;
      // Base do sprite: personagens 96x64 têm os pés na linha 39 do quadro.
      const footY = s.h === 64 ? top + 39 * sy - 2 : top + s.h * sy - 3;
      const cx = left + (s.w * sx) / 2;
      const tx = Math.floor(cx / T), ty = Math.floor(footY / T);
      if (tx >= 0 && ty >= 0 && tx < W && ty < H) blocked[ty * W + tx] = 1;
    }
  }

  return {
    width: W, height: H, tileSize: T, blocked,
    isBlocked(tx, ty) { return tx < 0 || ty < 0 || tx >= W || ty >= H || blocked[ty * W + tx] === 1; },
    block(tx, ty) { if (tx >= 0 && ty >= 0 && tx < W && ty < H) blocked[ty * W + tx] = 1; },
  };
}
