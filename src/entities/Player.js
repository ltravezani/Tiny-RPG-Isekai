import Phaser from 'phaser';
import { HUMAN_LAYERS } from '../scenes/PreloadScene.js';
import { DEPTH } from '../config.js';

const WALK_SPEED = 60;  // px/s
const RUN_SPEED = 100;
const FEET_Y = 39 / 64; // linha dos pés no quadro 96x64 do pack
const HALF_W = 4, HALF_H = 2; // caixa de colisão nos pés
const ROLL_SPEED = 150, ROLL_MS = 380; // rolar: rápido e invulnerável (roteiro: 0,3 s)
const HURT_INVULN_MS = 700;
export const MAX_HP = 50;

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
    this.actToken = 0;
    this.hp = MAX_HP;
    this.invulnMs = 0;
    this.rollMs = 0;
    this.dead = false;
    scene.add.existing(this);
    this.play('idle');
  }

  play(name) {
    if (this.anim === name) return;
    this.anim = name;
    HUMAN_LAYERS.forEach((layer, i) => this.parts[i].play(`human:${layer}:${name}`));
  }

  // Toca uma animação de trabalho e trava o movimento até ela terminar.
  // Se outra ação interromper (levar golpe, por exemplo), o onDone da antiga não roda.
  act(name, onDone) {
    const token = ++this.actToken;
    this.busy = true;
    this.anim = null;
    this.play(name);
    const finish = () => {
      if (token !== this.actToken) return;
      this.busy = false;
      this.anim = null;
      this.play('idle');
      onDone?.();
    };
    this.parts[0].once(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
    // Garantia: se a animação não avisar o fim, libera mesmo assim.
    const anim = this.parts[0].anims.currentAnim;
    this.scene.time.delayedCall(anim ? anim.duration + 120 : 800, finish);
  }

  cancelAction() {
    this.actToken++;
    this.busy = false;
    this.anim = null;
  }

  // Rolar: desvia na direção em que está olhando, sem levar dano.
  roll() {
    if (this.busy || this.dead) return false;
    this.rollMs = ROLL_MS;
    this.invulnMs = Math.max(this.invulnMs, ROLL_MS);
    this.act('roll');
    return true;
  }

  takeHit(damage, fromX) {
    if (this.dead || this.invulnMs > 0) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.invulnMs = HURT_INVULN_MS;
    this.rollMs = 0;
    this.parts.forEach(p => p.setTint(0xff7070));
    this.scene.time.delayedCall(160, () => this.parts.forEach(p => p.clearTint()));
    this.scene.tweens.add({ targets: this, alpha: 0.4, yoyo: true, repeat: 3, duration: 80, onComplete: () => this.setAlpha(1) });
    const dir = this.x < fromX ? -1 : 1;
    for (let k = 0; k < 4; k++) this.tryMove(dir * 2, 0);
    this.scene.events.emit('player:hurt', { damage, hp: this.hp });
    if (this.hp <= 0) {
      this.dead = true;
      this.cancelAction();
      this.busy = true;
      this.play('death');
      this.scene.events.emit('player:died');
    } else {
      this.cancelAction();
      this.act('hurt');
    }
    return true;
  }

  revive() {
    this.dead = false;
    this.hp = MAX_HP;
    this.invulnMs = 0;
    this.cancelAction();
    this.setAlpha(1);
    this.play('idle');
  }

  tick(dt) {
    if (this.invulnMs > 0) this.invulnMs -= dt;
    if (this.rollMs > 0) {
      this.rollMs -= dt;
      const v = ROLL_SPEED * dt / 1000;
      this.tryMove(this.facing.x * v, 0);
      this.tryMove(0, this.facing.y * v);
      this.setDepth(DEPTH.ysort + this.y);
    }
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
