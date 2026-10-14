import Phaser from 'phaser';
import { DEPTH } from '../config.js';
import { Villager } from '../entities/Villager.js';
import { Animal } from '../entities/Animal.js';

const ANIMAL = /^spr_deco_(chicken_01|cow|sheep_01|pig_01)$/;
const GOBLIN = /^spr_(idle|doing|carry|attack|mining|axe|dig|watering|hammering|waiting|reeling|caught|casting|run|jump|roll|walking|hurt|death)$/;
const PICKUP = { wood: 'res:wood', rock: 'res:stone' };
const RESPAWN_DAYS = 3; // roteiro, seção 7

// Tudo o que se mexe e reage no vale: aldeões, animais, goblins desconfiados e
// gravetos e pedras soltos para coletar.
export class VillageLife {
  constructor(scene, grid, villagerDefs, mapSprites, state = {}) {
    this.scene = scene;
    this.grid = grid;
    this.villagers = villagerDefs.map(def => new Villager(scene, def, grid));
    this.animals = [];
    this.goblins = [];
    this.pickups = [];
    const collected = state.pickups ?? {};
    for (const { sprite, name, id, base } of mapSprites) {
      if (ANIMAL.test(name)) this.animals.push(new Animal(scene, sprite, grid, base));
      else if (GOBLIN.test(name)) this.goblins.push({ sprite, cooldown: 0 });
      else if (PICKUP[name]) {
        const p = { id, sprite, item: PICKUP[name], respawnDay: collected[id] ?? 0 };
        sprite.setVisible(!p.respawnDay);
        this.pickups.push(p);
      }
    }
  }

  update(dt, { hour, player }) {
    for (const v of this.villagers) v.update(dt, hour, player);
    for (const a of this.animals) a.update(dt);
    // Goblins tocados pela Murcha ficam alertas quando o Semeador chega perto.
    for (const g of this.goblins) {
      g.cooldown -= dt;
      const s = g.sprite;
      if (g.cooldown > 0 || Phaser.Math.Distance.Between(s.x, s.y + 7, player.x, player.y) > 40) continue;
      g.cooldown = 6000;
      s.setFlipX(player.x < s.x);
      const mark = this.scene.add.image(s.x, s.y - 12, 'ui:expression_alerted').setDepth(DEPTH.sky - 2);
      this.scene.tweens.add({ targets: mark, y: mark.y - 4, yoyo: true, duration: 180, repeat: 2,
        onComplete: () => this.scene.tweens.add({ targets: mark, alpha: 0, duration: 400, onComplete: () => mark.destroy() }) });
    }
  }

  // O que está no ponto à frente do jogador (aldeão, animal ou item no chão).
  find(px, py) {
    const v = this.villagers.find(n => n.visible && n.near(px, py));
    if (v) return { kind: 'villager', ref: v };
    const a = this.animals.find(n => n.near(px, py));
    if (a) return { kind: 'animal', ref: a };
    const p = this.pickups.find(n => n.sprite.visible && Phaser.Math.Distance.Between(n.sprite.getCenter().x, n.sprite.getCenter().y, px, py) <= 10);
    if (p) return { kind: 'pickup', ref: p };
    return null;
  }

  villager(id) { return this.villagers.find(v => v.id === id); }

  gather(pickup, day) {
    pickup.sprite.setVisible(false);
    pickup.respawnDay = day + RESPAWN_DAYS;
  }

  onNewDay(day) {
    for (const p of this.pickups) {
      if (p.respawnDay && day >= p.respawnDay) {
        p.respawnDay = 0;
        p.sprite.setVisible(true);
      }
    }
  }

  snapshot() {
    return { pickups: Object.fromEntries(this.pickups.filter(p => p.respawnDay).map(p => [p.id, p.respawnDay])) };
  }
}
