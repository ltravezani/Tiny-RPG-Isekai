// Autotile aprendido do mapa de exemplo do pack.
//
// Os autotiles do Sunnyside (caminhos, rio) têm peças "sólidas" (cheia ou cortada em
// diagonal) e peças de borda que ficam nas células vizinhas, desenhando o contorno.
// Em vez de adivinhar as regras, contamos no exemplo qual tile aparece para cada
// vizinhança 3x3 de células sólidas e usamos o mais frequente.

const GID = 0x1fffffff;

export function learnAutotile(example, layerName, solidIds, familyIds) {
  const { width: W, height: H } = example;
  const data = example.layers.find(l => l.name === layerName).data;
  const solid = new Set(solidIds), family = new Set(familyIds);
  const isSolid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && solid.has((data[y * W + x] & GID) - 1);
  const votes = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = data[y * W + x];
    const id = g ? (g & GID) - 1 : -1;
    if (g && !family.has(id)) continue; // célula com outra coisa (não ensina nada)
    const key = patternKey((dx, dy) => isSolid(x + dx, y + dy));
    if (!votes.has(key)) votes.set(key, new Map());
    const v = votes.get(key), out = g && family.has(id) ? g : 0;
    v.set(out, (v.get(out) ?? 0) + 1);
  }
  const table = new Map();
  for (const [key, v] of votes) table.set(key, [...v.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  return table;
}

export function patternKey(solidAt) {
  let k = 0, bit = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) k |= (solidAt(dx, dy) ? 1 : 0) << bit++;
  return k;
}

// Pinta numa camada (array W*H de gids) a máscara de terreno usando a tabela aprendida.
// fullGid é o tile cheio, usado quando a vizinhança nunca apareceu no exemplo.
export function paintAutotile(layerData, W, H, mask, table, fullGid) {
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const key = patternKey((dx, dy) => at(x + dx, y + dy));
    const self = at(x, y);
    const near = key !== 0;
    if (!self && !near) continue;
    const learned = table.get(key);
    if (learned !== undefined) { if (learned) layerData[y * W + x] = learned; }
    else if (self) layerData[y * W + x] = fullGid;
  }
}
