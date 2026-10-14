import Phaser from 'phaser';
import { DEPTH } from '../config.js';

const FEET_Y = 39 / 64;
const SPEED = 22; // px/s, passo tranquilo
const HALF_W = 3, HALF_H = 2;

// Aldeão montado com as camadas do humano do pack (corpo + cabelo). Passeia em volta
// de casa nos horários dele, para quando o jogador conversa e mostra um balão de fala
// quando o jogador chega perto.
export class Villager extends Phaser.GameObjects.Container {
  constructor(scene, def, grid) {
    const T = grid.tileSize;
    super(scene, def.home.x * T + T / 2, def.home.y * T + T / 2);
    this.def = def;
    this.id = def.id;
    this.grid = grid;
    this.home = { x: this.x, y: this.y };
    this.hair = def.hair;
    this.parts = ['base', def.hair].map(layer => scene.add.sprite(0, 0, `human:${layer}:idle`).setOrigin(0.5, FEET_Y));
    this.add(this.parts);
    this.bubble = scene.add.image(0, -22, 'ui:expression_chat').setOrigin(0.5, 1).setVisible(false);
    this.add(this.bubble);
    this.anim = null;
    this.target = null;
    this.waitMs = Phaser.Math.Between(500, 3000);
    this.talking = false;
    this.play('idle');
    scene.add.existing(this);
  }

  play(name) {
    if (this.anim === name) return;
    this.anim = name;
    this.parts[0].play(`human:base:${name}`, true);
    this.parts[1].play(`human:${this.hair}:${name}`, true);
  }

  faceTowards(x) {
    this.parts.forEach(p => p.setFlipX(x < this.x));
  }

  isAwake(hour) {
    const [from, to] = this.def.hours;
    return hour >= from && hour < to;
  }

  // Está perto o bastante do ponto (em px) para o jogador interagir?
  near(px, py, radius = 12) {
    return Phaser.Math.Distance.Between(this.x, this.y, px, py) <= radius;
  }

  update(dt, hour, player) {
    const awake = this.isAwake(hour);
    if (this.visible !== awake) {
      this.setVisible(awake);
      if (awake) this.setPosition(this.home.x, this.home.y);
    }
    if (!awake) return;

    const close = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 36;
    this.bubble.setVisible(close && !this.talking);

    if (this.talking || !this.def.wander) {
      this.play('idle');
    } else if (this.target) {
      this.walk(dt);
    } else if ((this.waitMs -= dt) <= 0) {
      this.pickTarget();
    }
    this.setDepth(DEPTH.ysort + this.y);
  }

  pickTarget() {
    const T = this.grid.tileSize, r = this.def.wander;
    for (let tries = 0; tries < 8; tries++) {
      const tx = Math.floor(this.home.x / T) + Phaser.Math.Between(-r, r);
      const ty = Math.floor(this.home.y / T) + Phaser.Math.Between(-r, r);
      if (!this.grid.isBlocked(tx, ty)) {
        this.target = { x: tx * T + T / 2, y: ty * T + T / 2 };
        return;
      }
    }
    this.waitMs = 1000;
  }

  walk(dt) {
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = SPEED * dt / 1000;
    if (dist <= step) return this.arrive();
    const nx = this.x + (dx / dist) * step, ny = this.y + (dy / dist) * step;
    if (this.collides(nx, ny)) return this.arrive(); // caminho bloqueado: desiste e espera
    if (Math.abs(dx) > 0.5) this.parts.forEach(p => p.setFlipX(dx < 0));
    this.setPosition(nx, ny);
    this.play('walk');
  }

  arrive() {
    this.target = null;
    this.waitMs = Phaser.Math.Between(1500, 5000);
    this.play('idle');
  }

  collides(x, y) {
    const T = this.grid.tileSize;
    return [[x - HALF_W, y - HALF_H], [x + HALF_W, y - HALF_H], [x - HALF_W, y + HALF_H], [x + HALF_W, y + HALF_H]]
      .some(([cx, cy]) => this.grid.isBlocked(Math.floor(cx / T), Math.floor(cy / T)));
  }

  startTalk(playerX) {
    this.talking = true;
    this.target = null;
    this.faceTowards(playerX);
  }

  endTalk() {
    this.talking = false;
    this.waitMs = 2500;
  }
}
