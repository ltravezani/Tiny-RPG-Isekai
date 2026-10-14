import Phaser from 'phaser';
import { DEPTH } from '../config.js';

const SPEED = { 'spr_deco_chicken_01': 18, 'spr_deco_cow': 8, 'spr_deco_sheep_01': 10, 'spr_deco_pig_01': 12 };
const NAMES = { 'spr_deco_chicken_01': 'galinha', 'spr_deco_cow': 'vaca', 'spr_deco_sheep_01': 'ovelha', 'spr_deco_pig_01': 'porco' };

// Animal de fazenda do mapa: passeia devagar em volta de onde nasceu e gosta de carinho.
// O pack só tem animação parada, então o andar é um deslize com um pulinho.
export class Animal {
  constructor(scene, sprite, grid, baseOffset) {
    this.scene = scene;
    this.sprite = sprite;
    this.kind = sprite.texture.key.slice(3);
    this.name = NAMES[this.kind];
    this.grid = grid;
    this.baseOffset = baseOffset; // distância da origem do sprite até as patas
    this.home = { x: sprite.x, y: sprite.y };
    this.target = null;
    this.waitMs = Phaser.Math.Between(0, 4000);
    this.hop = 0;
    this.pettedDay = -1;
  }

  get feet() { return { x: this.sprite.x, y: this.sprite.y + this.baseOffset }; }

  near(px, py, radius = 14) {
    const f = this.feet;
    return Phaser.Math.Distance.Between(f.x, f.y, px, py) <= radius;
  }

  update(dt) {
    const s = this.sprite;
    if (this.target) {
      const dx = this.target.x - s.x, dy = this.target.y - s.y, dist = Math.hypot(dx, dy);
      const step = (SPEED[this.kind] ?? 10) * dt / 1000;
      if (dist <= step) {
        this.target = null;
        this.waitMs = Phaser.Math.Between(2000, 7000);
      } else {
        s.x += (dx / dist) * step;
        s.y += (dy / dist) * step;
        if (Math.abs(dx) > 0.3) s.setFlipX(dx < 0);
        this.hop += dt * 0.012;
      }
    } else if ((this.waitMs -= dt) <= 0) {
      this.pickTarget();
    }
    s.y -= this.hopOffset ?? 0;
    this.hopOffset = this.target ? Math.abs(Math.sin(this.hop)) * 1.5 : 0;
    s.y += this.hopOffset;
    s.setDepth(DEPTH.ysort + s.y + this.baseOffset);
  }

  pickTarget() {
    const T = this.grid.tileSize;
    for (let tries = 0; tries < 6; tries++) {
      const x = this.home.x + Phaser.Math.Between(-40, 40), y = this.home.y + Phaser.Math.Between(-28, 28);
      const fx = Math.floor(x / T), fy = Math.floor((y + this.baseOffset) / T);
      if (this.grid.isBlocked(fx, fy)) continue;
      // Caminho reto livre? Confere alguns pontos no meio.
      const ok = [0.25, 0.5, 0.75].every(t => !this.grid.isBlocked(
        Math.floor((this.sprite.x + (x - this.sprite.x) * t) / T),
        Math.floor((this.sprite.y + this.baseOffset + (y - this.sprite.y) * t) / T)));
      if (ok) { this.target = { x, y }; return; }
    }
    this.waitMs = 2000;
  }

  // Carinho: coração por cima e o animal para um pouco. Só conta uma vez por dia.
  pet(day) {
    this.target = null;
    this.waitMs = 4000;
    const s = this.sprite;
    const heart = this.scene.add.image(s.x, s.y - 12, 'ui:expression_love').setDepth(DEPTH.sky - 2);
    this.scene.tweens.add({ targets: heart, y: heart.y - 8, alpha: 0, delay: 600, duration: 900, onComplete: () => heart.destroy() });
    const first = this.pettedDay !== day;
    this.pettedDay = day;
    return first;
  }
}
