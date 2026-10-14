import Phaser from 'phaser';
import { DEPTH } from '../config.js';

// Tipos de inimigo (roteiro, seção 8). Os goblins usam os sprites 96x64 do projeto
// GameMaker do pack (pés na linha 39); os esqueletos, 32x32 com origem nos pés.
export const ENEMY_TYPES = {
  goblin: {
    name: 'goblin', hp: 18, damage: 4, speed: 34, sight: 80, reach: 16, windup: 600, gold: [5, 12],
    anims: { idle: 'spr_idle', walk: 'spr_walking', attack: 'spr_attack', hurt: 'spr_hurt', death: 'spr_death' },
    feet: 7, // pixels da origem do sprite até os pés
  },
  skeleton: {
    name: 'esqueleto', hp: 26, damage: 6, speed: 28, sight: 90, reach: 14, windup: 700, gold: [10, 18],
    anims: { idle: 'skeleton_idle', walk: 'skeleton_walk', attack: 'skeleton_attack', hurt: 'skeleton_hurt', death: 'skeleton_death' },
    feet: 0,
  },
};

const HALF_W = 4, HALF_H = 2;

// Inimigo de tempo real: passeia na área dele, persegue o jogador quando vê, avisa
// antes de atacar (pisca e mostra "!") e pode ser acertado e empurrado.
export class Enemy {
  constructor(scene, type, x, y, zone, grid) {
    this.scene = scene;
    this.type = type;
    this.def = ENEMY_TYPES[type];
    this.zone = zone; // retângulo em px
    this.grid = grid;
    this.x = x;
    this.y = y;
    this.home = { x, y };
    this.hp = this.def.hp;
    this.state = 'idle';
    this.timer = Phaser.Math.Between(500, 2500);
    this.target = null;
    this.knock = { x: 0, y: 0 };
    this.sprite = scene.add.sprite(x, y - this.def.feet, `gm:${this.def.anims.idle}`).setOrigin(...this.origin());
    this.play('idle');
    this.shadow = scene.add.image(x, y + 1, 'gm:spr_deco_charactershadow').setAlpha(0.5);
    this.hpBar = scene.add.graphics();
    this.alive = true;
  }

  origin() {
    const m = this.scene.cache.json.get('gmSprites')[this.def.anims.idle];
    return [m.ox / m.w, m.oy / m.h];
  }

  play(name, ignoreIfPlaying = true) {
    this.sprite.play(`gm:${this.def.anims[name]}`, ignoreIfPlaying);
  }

  get dead() { return !this.alive; }

  distTo(p) { return Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y); }

  update(dt, player) {
    if (!this.alive) return;
    const def = this.def;
    this.timer -= dt;

    // Empurrão depois de levar golpe.
    if (this.knock.x || this.knock.y) {
      this.tryMove(this.knock.x * dt / 1000, this.knock.y * dt / 1000);
      this.knock.x *= 0.85;
      this.knock.y *= 0.85;
      if (Math.abs(this.knock.x) + Math.abs(this.knock.y) < 4) this.knock = { x: 0, y: 0 };
    }

    const seesPlayer = !player.dead && this.distTo(player) < def.sight && Phaser.Geom.Rectangle.Contains(this.leash(), player.x, player.y);
    switch (this.state) {
      case 'idle':
        this.play('idle');
        if (seesPlayer) this.state = 'chase';
        else if (this.timer <= 0) { this.pickWander(); this.state = 'wander'; }
        break;
      case 'wander':
        if (seesPlayer) { this.state = 'chase'; break; }
        if (!this.target || this.moveTowards(this.target, def.speed * 0.5, dt)) { this.state = 'idle'; this.timer = Phaser.Math.Between(1000, 3000); }
        break;
      case 'chase':
        if (!seesPlayer) { this.target = this.home; this.state = 'wander'; break; }
        if (this.distTo(player) <= def.reach + 4) { this.windup(player); break; }
        this.moveTowards(player, def.speed, dt);
        break;
      case 'windup':
        if (this.timer <= 0) this.attack(player);
        break;
      case 'attack':
      case 'hurt':
        if (this.timer <= 0) this.state = 'chase';
        break;
    }
    this.sync();
  }

  leash() {
    const z = this.zone;
    return new Phaser.Geom.Rectangle(z.x - 48, z.y - 48, z.width + 96, z.height + 96);
  }

  pickWander() {
    const z = this.zone;
    this.target = { x: Phaser.Math.Between(z.x, z.x + z.width), y: Phaser.Math.Between(z.y, z.y + z.height) };
  }

  // Anda até o alvo; devolve true quando chega ou trava.
  moveTowards(t, speed, dt) {
    const dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const step = Math.min(d, speed * dt / 1000);
    const moved = this.tryMove((dx / d) * step, (dy / d) * step);
    if (Math.abs(dx) > 0.5) this.sprite.setFlipX(dx < 0);
    this.play('walk');
    return !moved;
  }

  // Se já estiver preso num tile bloqueado (nasceu ou foi empurrado para lá), deixa sair.
  tryMove(dx, dy) {
    let moved = false;
    const stuck = this.collides(this.x, this.y);
    if (stuck || !this.collides(this.x + dx, this.y)) { this.x += dx; moved = true; }
    if (stuck || !this.collides(this.x, this.y + dy)) { this.y += dy; moved = true; }
    return moved;
  }

  collides(x, y) {
    const T = this.grid.tileSize;
    return [[x - HALF_W, y - HALF_H], [x + HALF_W, y - HALF_H], [x - HALF_W, y + HALF_H], [x + HALF_W, y + HALF_H]]
      .some(([cx, cy]) => this.grid.isBlocked(Math.floor(cx / T), Math.floor(cy / T)));
  }

  // Aviso antes do golpe: pisca em branco e mostra "!" (roteiro: aviso visual antes de atacar).
  windup(player) {
    this.state = 'windup';
    this.timer = this.def.windup;
    this.sprite.setFlipX(player.x < this.x);
    this.play('idle');
    this.scene.tweens.add({ targets: this.sprite, alpha: 0.35, yoyo: true, repeat: 1, duration: this.def.windup / 4, onComplete: () => this.sprite.setAlpha(1) });
    const mark = this.scene.add.image(this.x, this.y - 26, 'ui:expression_alerted').setDepth(DEPTH.sky - 2);
    this.scene.time.delayedCall(this.def.windup, () => mark.destroy());
  }

  attack(player) {
    this.state = 'attack';
    this.play('attack', false);
    this.timer = 900; // respiro depois do golpe
    // O golpe acerta no meio da animação, se o jogador ainda estiver perto.
    this.scene.time.delayedCall(220, () => {
      if (!this.alive || this.state !== 'attack') return;
      const facing = this.sprite.flipX ? -1 : 1;
      const hx = this.x + facing * 8;
      if (Phaser.Math.Distance.Between(hx, this.y, player.x, player.y) <= this.def.reach + 6) {
        player.takeHit(this.def.damage, this.x);
      }
    });
  }

  // Leva golpe do jogador. Devolve true se morreu.
  hit(damage, fromX) {
    if (!this.alive) return false;
    this.hp -= damage;
    const dir = this.x < fromX ? -1 : 1;
    this.knock = { x: dir * 160, y: 0 };
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.sprite.clearTint());
    this.floatText(`-${damage}`, '#ffffff');
    if (this.hp <= 0) { this.die(); return true; }
    this.state = 'hurt';
    this.timer = 350;
    this.play('hurt', false);
    return false;
  }

  die() {
    this.alive = false;
    this.state = 'dead';
    this.hpBar.clear();
    this.shadow.setVisible(false);
    this.play('death', false);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.scene.tweens.add({ targets: this.sprite, alpha: 0, delay: 600, duration: 500, onComplete: () => this.sprite.setVisible(false) });
    });
  }

  respawn() {
    this.alive = true;
    this.hp = this.def.hp;
    this.x = this.home.x;
    this.y = this.home.y;
    this.state = 'idle';
    this.knock = { x: 0, y: 0 };
    this.sprite.setVisible(true).setAlpha(1);
    this.shadow.setVisible(true);
    this.play('idle', false);
    this.sync();
  }

  floatText(text, color) {
    const t = this.scene.add.text(this.x, this.y - 30, text, { fontFamily: 'monospace', fontSize: '8px', color, stroke: '#1b2a3a', strokeThickness: 2 })
      .setOrigin(0.5).setDepth(DEPTH.sky - 1).setResolution(4);
    this.scene.tweens.add({ targets: t, y: t.y - 10, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  sync() {
    this.sprite.setPosition(this.x, this.y - this.def.feet).setDepth(DEPTH.ysort + this.y);
    this.shadow.setPosition(this.x, this.y + 1).setDepth(DEPTH.ysort + this.y - 1);
    this.hpBar.clear();
    if (this.alive && this.hp < this.def.hp) {
      const w = 14, p = Math.max(0, this.hp / this.def.hp);
      this.hpBar.fillStyle(0x1b2a3a).fillRect(this.x - w / 2 - 1, this.y - 25, w + 2, 3)
        .fillStyle(0xd9573b).fillRect(this.x - w / 2, this.y - 24, w * p, 1).setDepth(DEPTH.sky - 3);
    }
  }
}
