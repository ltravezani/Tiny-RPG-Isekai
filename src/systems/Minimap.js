// Desenha o mapa do vale em miniatura (1 pixel por tile): cada tile vira a cor média
// da arte que aparece por cima nele, e árvores e objetos que bloqueiam ficam por cima.
const GID = 0x1fffffff;
const SKIP = new Set(['shadows']);
const TREE = [46, 112, 58];

// Lê os tilesets já carregados no Phaser (versões extrudadas: 1px de margem, 2px entre tiles).
function tileColors(scene, mapData) {
  const sheets = mapData.tilesets.map((ts, i) => {
    const img = scene.textures.get(i === 0 ? 'tiles16' : 'tilesForest').getSourceImage();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return { firstgid: ts.firstgid, columns: ts.columns, data: ctx.getImageData(0, 0, img.width, img.height), width: img.width };
  });
  const cache = new Map();
  return gid => {
    const id = gid & GID;
    if (cache.has(id)) return cache.get(id);
    const ts = [...sheets].reverse().find(s => id >= s.firstgid);
    const local = id - ts.firstgid;
    const sx = 1 + (local % ts.columns) * 18, sy = 1 + Math.floor(local / ts.columns) * 18;
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const i = ((sy + y) * ts.width + sx + x) * 4;
      if (ts.data.data[i + 3] < 128) continue;
      r += ts.data.data[i]; g += ts.data.data[i + 1]; b += ts.data.data[i + 2]; n++;
    }
    const color = n > 40 ? [r / n, g / n, b / n] : null; // tiles quase vazios não mudam a cor de baixo
    cache.set(id, color);
    return color;
  };
}

export function buildMinimapCanvas(scene, mapData, grid) {
  const { width: W, height: H } = mapData;
  const colorOf = tileColors(scene, mapData);
  const layers = mapData.layers.filter(l => l.type === 'tilelayer' && !SKIP.has(l.name));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    let c = [109, 187, 69];
    let fromTiles = false;
    for (const l of layers) {
      const g = l.data[i];
      const col = g && colorOf(g);
      if (col) { c = col; fromTiles = l.name !== 'ground' && l.name !== 'land'; }
    }
    // Bloqueado sem tile visível por cima = árvore ou objeto grande.
    if (!fromTiles && grid.isBlocked(i % W, Math.floor(i / W))) c = TREE;
    img.data.set([c[0], c[1], c[2], 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
