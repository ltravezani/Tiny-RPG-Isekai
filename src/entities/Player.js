import Phaser from 'phaser';
import { HUMAN_LAYERS } from '../scenes/PreloadScene.js';
import { DEPTH } from '../config.js';

const WALK_SPEED = 60;  // px/s
const RUN_SPEED = 100;
const FEET_Y = 39 / 64; // linha dos pés no quadro 96x64 do pack
const HALF_W = 4, HALF_H = 2; // caixa de colisão nos pés

// Rafa: três camadas do pack (corpo, cabelo, ferramentas) animadas juntas.
// Os sprites só olham para os lados; virar é espelhar (roteiro, seção 11).
export class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, grid) {
    super(scene, x, y);
    this.grid = grid;
    this.parts = HUMAN_LAYERS.map(layer => scene.add.sprite(0, 0, `human:${layer}:idle`).setOrigin(0.5, FEET_Y));
    this.add(this.parts);
    this.facing = { x: 1, y: 0 };
    this.busy = false;
    this.anim = null;
    scene.add.existing(this);
    this.play('idle');
  }

  play(name) {
    if (this.anim === name) return;
    this.anim = name;
    HUMAN_LAYERS.forEach((layer, i) => this.parts[i].play(`human:${layer}:${name}`));
  }

  // Toca uma animação de trabalho e trava o movimento até ela terminar.
  act(name, onDone) {
    this.busy = true;
    this.anim = null;
    this.play(name);
    this.parts[0].once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.busy = false;
      this.play('idle');
      onDone?.();
    });
  }

  // Tile à frente do jogador, na direção em que está olhando.
  targetTile() {
    const T = this.grid.tileSize;
    return { x: Math.floor(this.x / T) + this.facing.x, y: Math.floor(this.y / T) + this.facing.y };
  }

  move(input, dt) {
    if (this.busy) return;
    let dx = input.x, dy = input.y;
    if (dx || dy) {
      if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
      this.facing = Math.abs(input.x) >= Math.abs(input.y) && input.x ? { x: Math.sign(input.x), y: 0 } : { x: 0, y: Math.sign(input.y) };
      if (input.x) this.parts.forEach(p => p.setFlipX(input.x < 0));
      const v = (input.run ? RUN_SPEED : WALK_SPEED) * dt / 1000;
      this.tryMove(dx * v, 0);
      this.tryMove(0, dy * v);
      this.play(input.run ? 'run' : 'walk');
    } else {
      this.play('idle');
    }
    this.setDepth(DEPTH.ysort + this.y);
  }

  tryMove(dx, dy) {
    const nx = this.x + dx, ny = this.y + dy;
    if (!this.collides(nx, ny)) this.setPosition(nx, ny);
  }

  collides(x, y) {
    const T = this.grid.tileSize;
    for (const [cx, cy] of [[x - HALF_W, y - HALF_H], [x + HALF_W, y - HALF_H], [x - HALF_W, y + HALF_H], [x + HALF_W, y + HALF_H]]) {
      if (this.grid.isBlocked(Math.floor(cx / T), Math.floor(cy / T))) return true;
    }
    return false;
  }
}
