import Phaser from 'phaser';
import { DEPTH } from '../config.js';

const FEET_Y = 39 / 64;

// Aldeão parado num tile, montado com as camadas do humano do pack.
// O cabelo pode usar uma variante recolorida gerada na PreloadScene (ex.: 'longhair_grey').
export class Villager extends Phaser.GameObjects.Container {
  constructor(scene, tileX, tileY, { id, hair = 'longhair', tileSize = 16 }) {
    super(scene, tileX * tileSize + tileSize / 2, tileY * tileSize + tileSize / 2);
    this.id = id;
    this.tile = { x: tileX, y: tileY };
    this.parts = ['base', hair].map(layer => {
      const spr = scene.add.sprite(0, 0, `human:${layer}:idle`).setOrigin(0.5, FEET_Y);
      spr.play({ key: `human:${layer}:idle`, startFrame: 3 });
      return spr;
    });
    this.add(this.parts);
    this.setDepth(DEPTH.ysort + this.y);
    scene.add.existing(this);
  }

  faceTowards(x) {
    this.parts.forEach(p => p.setFlipX(x < this.x));
  }
}
