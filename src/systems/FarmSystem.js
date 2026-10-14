import { events } from './EventBus.js';

// Estado da fazenda (roteiro, seção 5): arar -> semear -> regar -> crescer -> colher.
// Só lógica; a FarmPlot desenha. Culturas só avançam na troca de dia.
export class FarmSystem {
  constructor(crops, isFarmable, state = {}) {
    this.crops = Object.fromEntries(crops.map(c => [c.id, c]));
    this.isFarmable = isFarmable;
    this.tiles = new Map((state.tiles ?? []).map(t => [`${t.x},${t.y}`, { ...t }]));
  }

  get(x, y) { return this.tiles.get(`${x},${y}`); }

  // O que a ação contextual faria neste tile, sem executar.
  actionAt(x, y) {
    const t = this.get(x, y);
    if (!t) return this.isFarmable(x, y) ? 'till' : null;
    if (!t.cropId) return 'plant';
    if (this.isRipe(t)) return 'harvest';
    if (!t.watered) return 'water';
    return null;
  }

  till(x, y) {
    if (this.get(x, y) || !this.isFarmable(x, y)) return false;
    const t = { x, y, watered: false, cropId: null, daysGrown: 0 };
    this.tiles.set(`${x},${y}`, t);
    events.emit('tile:tilled', t);
    return true;
  }

  plant(x, y, cropId) {
    const t = this.get(x, y);
    if (!t || t.cropId || !this.crops[cropId]) return false;
    Object.assign(t, { cropId, daysGrown: 0 });
    events.emit('crop:planted', { ...t });
    return true;
  }

  water(x, y) {
    const t = this.get(x, y);
    if (!t || t.watered) return false;
    t.watered = true;
    events.emit('tile:watered', { ...t });
    return true;
  }

  harvest(x, y) {
    const t = this.get(x, y);
    if (!t || !this.isRipe(t)) return null;
    const crop = this.crops[t.cropId];
    events.emit('crop:harvested', { x, y, cropId: crop.id, amount: 1 });
    if (crop.regrows) t.daysGrown = Math.floor(crop.days / 2);
    else Object.assign(t, { cropId: null, daysGrown: 0 });
    return crop;
  }

  isRipe(t) { return !!t.cropId && t.daysGrown >= this.crops[t.cropId].days; }

  // 0 = semente na terra, 1..4 = sprites _01.._04 do pack (4 = madura).
  stageOf(t) {
    if (!t.cropId) return -1;
    const p = t.daysGrown / this.crops[t.cropId].days;
    if (p >= 1) return 4;
    if (p === 0) return 0;
    return 1 + Math.min(2, Math.floor(p * 3));
  }

  canPlant(cropId, season) { return !!this.crops[cropId]?.seasons.includes(season); }

  onNewDay({ day, season }) {
    for (const [key, t] of this.tiles) {
      if (t.cropId) {
        const crop = this.crops[t.cropId];
        // Fora de estação, murcha no primeiro dia da estação seguinte.
        if (day === 1 && !crop.seasons.includes(season)) Object.assign(t, { cropId: null, daysGrown: 0 });
        else if (t.watered && !this.isRipe(t)) t.daysGrown++;
      } else if (!t.watered && Math.random() < 0.25) {
        this.tiles.delete(key); // solo arado vazio e seco volta a ser grama aos poucos
        continue;
      }
      t.watered = false;
    }
  }

  snapshot() { return { tiles: [...this.tiles.values()].map(t => ({ ...t })) }; }
}
