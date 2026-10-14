import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy.js';
import { events } from './EventBus.js';

const ATTACK_DAMAGE = 7;     // espada velha
const ATTACK_REACH = 20;     // px à frente do jogador
const HIT_DELAY = 180;       // ms depois de começar a animação

const blockedAround = (grid, x, y) => [[-5, -3], [5, -3], [-5, 3], [5, 3]]
  .some(([dx, dy]) => grid.isBlocked(Math.floor((x + dx) / 16), Math.floor((y + dy) / 16)));

// Inimigos das áreas de caça (camada "poi" do mapa: hunt_goblins, hunt_skeletons).
// Os mortos voltam na virada do dia.
export class CombatSystem {
  constructor(scene, grid, huntZones) {
    this.scene = scene;
    this.enemies = [];
    for (const z of huntZones) {
      const rect = new Phaser.Geom.Rectangle(z.x, z.y, z.width, z.height);
      for (let k = 0; k < (z.props.count ?? 4); k++) {
        let x, y, tries = 0;
        do {
          x = Phaser.Math.Between(rect.x, rect.right);
          y = Phaser.Math.Between(rect.y, rect.bottom);
        } while (blockedAround(grid, x, y) && ++tries < 30);
        this.enemies.push(new Enemy(scene, z.props.enemy, x, y, rect, grid));
      }
    }
  }

  update(dt, player) {
    for (const e of this.enemies) e.update(dt, player);
  }

  // Golpe de espada: acerta quem estiver na frente do jogador.
  playerAttack(player) {
    this.scene.time.delayedCall(HIT_DELAY, () => {
      const f = player.facing;
      const hx = player.x + f.x * ATTACK_REACH * 0.6, hy = player.y + f.y * ATTACK_REACH * 0.6;
      for (const e of this.enemies) {
        if (e.dead || Phaser.Math.Distance.Between(hx, hy, e.x, e.y) > ATTACK_REACH) continue;
        if (e.hit(ATTACK_DAMAGE, player.x)) {
          const gold = Phaser.Math.Between(...e.def.gold);
          events.emit('enemy:killed', { type: e.type, gold, x: e.x, y: e.y });
        }
      }
    });
  }

  nearestZone(type, from) {
    const alive = this.enemies.filter(e => !e.dead && (!type || e.type === type));
    if (!alive.length) return null;
    return alive.reduce((a, b) => (Phaser.Math.Distance.Between(a.x, a.y, from.x, from.y) < Phaser.Math.Distance.Between(b.x, b.y, from.x, from.y) ? a : b));
  }

  onNewDay() {
    for (const e of this.enemies) if (e.dead) e.respawn();
  }
}
