import { DEPTH } from '../config.js';

// Desenha a fazenda a partir do FarmSystem: solo (seco/molhado, com ou sem semente) e a cultura.
export class FarmPlot {
  constructor(scene, farm, tileSize) {
    this.scene = scene;
    this.farm = farm;
    this.T = tileSize;
    this.views = new Map();
  }

  refresh() {
    const seen = new Set();
    for (const [key, t] of this.farm.tiles) {
      seen.add(key);
      let v = this.views.get(key);
      if (!v) {
        const cx = t.x * this.T + this.T / 2, by = t.y * this.T + this.T;
        v = {
          soil: this.scene.add.image(cx, by - 2, 'soil_00').setOrigin(0.5, 1).setDepth(DEPTH.ysort - 1),
          crop: this.scene.add.image(cx, by - 3, 'soil_00').setOrigin(0.5, 1).setVisible(false),
        };
        this.views.set(key, v);
      }
      const stage = this.farm.stageOf(t);
      v.soil.setTexture(stage === 0 ? (t.watered ? 'soil_04' : 'soil_03') : (t.watered ? 'soil_01' : 'soil_00'));
      if (stage >= 1) {
        const crop = this.farm.crops[t.cropId];
        v.crop.setTexture(`crop:${crop.sprite}:${stage}`).setVisible(true).setDepth(DEPTH.ysort + v.crop.y);
      } else {
        v.crop.setVisible(false);
      }
    }
    for (const [key, v] of this.views) {
      if (seen.has(key)) continue;
      v.soil.destroy();
      v.crop.destroy();
      this.views.delete(key);
    }
  }
}
