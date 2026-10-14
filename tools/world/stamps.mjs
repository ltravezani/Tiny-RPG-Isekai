// Recorta "carimbos" (casas inteiras, com telhado, paredes, enfeites e objetos) do mapa
// de exemplo do pack, para colar no mapa novo.
const STAMP_LAYERS = ['building', 'walls', 'decoration_02', 'decoration_03'];
// Objetos que fazem parte da casa (o resto do recorte, como goblins e plantações, fica de fora).
const HOUSE_OBJECTS = /chimn|smoke|flowers_house|windmill|picture|well|anvil|barrel|crate|jar|sidetable|chair|book|mug|plate|rug/;

export function extractStamp(example, rect) {
  const { width: W } = example;
  const { x, y, w, h } = rect;
  const layers = {};
  for (const name of STAMP_LAYERS) {
    const src = example.layers.find(l => l.name === name)?.data;
    if (!src) continue;
    const out = new Array(w * h).fill(0);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[j * w + i] = src[(y + j) * W + x + i];
    layers[name] = out;
  }
  const T = example.tilewidth;
  const objects = example.layers.filter(l => l.type === 'objectgroup').flatMap(l => l.objects.map(o => ({ ...o, layer: l.name })))
    .filter(o => HOUSE_OBJECTS.test(o.name) && o.x >= x * T && o.x < (x + w) * T && o.y >= y * T && o.y < (y + h) * T)
    .map(o => ({ ...o, x: o.x - x * T, y: o.y - y * T }));
  return { w, h, layers, objects };
}

// Cola o carimbo no mapa novo (tx, ty em tiles). Só sobrescreve células não vazias.
export function pasteStamp(map, stamp, tx, ty, nextId) {
  const W = map.width, T = map.tilewidth;
  for (const [name, data] of Object.entries(stamp.layers)) {
    const dst = map.layers.find(l => l.name === name).data;
    data.forEach((g, i) => {
      if (!g) return;
      const x = tx + (i % stamp.w), y = ty + Math.floor(i / stamp.w);
      if (x >= 0 && y >= 0 && x < W && y < map.height) dst[y * W + x] = g;
    });
  }
  for (const o of stamp.objects) {
    const layer = map.layers.find(l => l.name === o.layer) ?? map.layers.find(l => l.name === 'Assets_1');
    const { layer: _, ...rest } = o;
    layer.objects.push({ ...rest, id: nextId(), x: o.x + tx * T, y: o.y + ty * T });
  }
}
