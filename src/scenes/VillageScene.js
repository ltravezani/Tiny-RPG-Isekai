import Phaser from 'phaser';
import crops from '../data/crops.json';
import quests from '../data/quests.json';
import { ZOOM, DEPTH, FARM_ZONE, SPAWN_TILE, SELL_BOX_TILE, MAX_ENERGY, ENERGY_COST } from '../config.js';
import { events } from '../systems/EventBus.js';
import { buildWorldGrid } from '../systems/WorldGrid.js';
import { TimeSystem } from '../systems/TimeSystem.js';
import { FarmSystem } from '../systems/FarmSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Player } from '../entities/Player.js';
import { FarmPlot } from '../entities/FarmPlot.js';

// Camadas acima dos personagens (nuvens) e a camada de objetos ordenada por Y junto com eles.
const SKY_LAYERS = new Set(['cloud_shadow', 'clouds_01']);
const YSORT_OBJECTS = 'Assets_1';
const DECO_LAYERS = ['decoration_01', 'decoration_02', 'decoration_03'];
// Na fazenda só ficam objetos fixos; as culturas e os goblins decorativos do exemplo saem.
const KEEP_IN_FARM = /crate|barrel|chest|well/;

const inFarm = (tx, ty) => tx >= FARM_ZONE.x && ty >= FARM_ZONE.y && tx < FARM_ZONE.x + FARM_ZONE.w && ty < FARM_ZONE.y + FARM_ZONE.h;

const ACTION_ANIM = { till: 'dig', plant: 'doing', water: 'water', harvest: 'doing', sell: 'doing' };
export const ACTION_LABEL = { till: 'arar', plant: 'plantar', water: 'regar', harvest: 'colher', sell: 'vender colheitas' };

export class VillageScene extends Phaser.Scene {
  constructor() { super('Village'); }

  create() {
    const gm = this.cache.json.get('gmSprites');
    const mapData = this.cache.tilemap.get('vale').data;
    this.clearFarmZone(mapData, gm);

    this.buildMap(mapData, gm);
    this.grid = buildWorldGrid(mapData, gm);
    this.grid.block(SELL_BOX_TILE.x, SELL_BOX_TILE.y);

    // Estado: carrega o save ou começa um jogo novo.
    const save = SaveSystem.load();
    this.clock = new TimeSystem(save?.time);
    this.inventory = new InventorySystem(save?.player ?? { items: { 'seed:sunflower': 1 } });
    this.energy = save?.player?.energy ?? MAX_ENERGY;
    this.farm = new FarmSystem(crops, (x, y) => inFarm(x, y) && !this.grid.isBlocked(x, y), save?.farm);
    events.removeAllListeners();
    this.quests = new QuestSystem(quests, this.inventory, save?.quests);
    this.selectedSeed = 0;

    this.farmPlot = new FarmPlot(this, this.farm, this.grid.tileSize);
    this.farmPlot.refresh();
    this.addSellBox();

    const T = this.grid.tileSize;
    const spawn = save?.player?.pos ?? { x: SPAWN_TILE.x * T + T / 2, y: SPAWN_TILE.y * T + T / 2 };
    this.player = new Player(this, spawn.x, spawn.y, this.grid);
    this.cursor = this.add.graphics().setDepth(DEPTH.sky - 1);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels).startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(600);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,Q,E,Z');
    this.keys.SPACE.on('down', () => this.useAction());
    this.keys.Q.on('down', () => this.cycleSeed(-1));
    this.keys.E.on('down', () => this.cycleSeed(1));
    this.keys.Z.on('down', () => this.sleep('bed'));

    events.on('player:passedOut', () => this.sleep('passedOut'));
    events.on('quest:completed', q => this.toast(`Missão concluída: ${q.title}`));
    events.on('crop:harvested', ({ cropId }) => {
      this.inventory.add(`crop:${cropId}`);
      this.farmPlot.refresh();
    });

    this.scene.launch('UI');
    if (!save) this.time.delayedCall(800, () => this.toast('Você acordou num campo seco, com uma semente de girassol na mão.'));
  }

  // Limpa as plantações e goblins decorativos da fazenda do mapa de exemplo: ela é do jogador agora.
  clearFarmZone(mapData, gm) {
    if (mapData.__farmCleared) return;
    mapData.__farmCleared = true;
    const { width: W, tilewidth: T } = mapData;
    for (const l of mapData.layers) {
      if (l.type === 'tilelayer' && DECO_LAYERS.includes(l.name)) {
        l.data = l.data.map((g, i) => (inFarm(i % W, Math.floor(i / W)) ? 0 : g));
      } else if (l.type === 'objectgroup') {
        l.objects = l.objects.filter(o => {
          const s = gm[o.name];
          if (!s || KEEP_IN_FARM.test(o.name)) return true;
          const baseY = o.y - s.oy + (s.h === 64 ? 39 : s.h) - 1;
          const cx = o.x - s.ox + s.w / 2;
          return !inFarm(Math.floor(cx / T), Math.floor(baseY / T));
        });
      }
    }
  }

  buildMap(mapData, gm) {
    const map = this.make.tilemap({ key: 'vale' });
    this.map = map;
    const tilesets = [map.addTilesetImage('sunnyside_16', 'tiles16'), map.addTilesetImage('sunnyside_forest', 'tilesForest')];

    // Mantém a ordem do GameMaker: cada camada de objetos fica entre as camadas de tiles vizinhas.
    let depth = 0;
    for (const l of mapData.layers) {
      depth++;
      if (l.type === 'tilelayer') {
        map.createLayer(l.name, tilesets).setDepth(SKY_LAYERS.has(l.name) ? DEPTH.sky + depth : depth);
        continue;
      }
      for (const o of l.objects) {
        const s = gm[o.name];
        if (!s) continue;
        const props = Object.fromEntries((o.properties ?? []).map(p => [p.name, p.value]));
        const frame = (((props.frame ?? 0) % s.frames) + s.frames) % s.frames;
        const spr = this.add.sprite(o.x, o.y, `gm:${o.name}`, frame)
          .setOrigin(s.ox / s.w, s.oy / s.h)
          .setScale(props.scaleX ?? 1, props.scaleY ?? 1)
          .setAngle(o.rotation ?? 0);
        if (s.frames > 1) spr.play({ key: `gm:${o.name}`, startFrame: frame });
        if (l.name !== YSORT_OBJECTS) { spr.setDepth(depth); continue; }
        // Ordena pela base do sprite (pés dos personagens 96x64 ficam na linha 39).
        const base = o.y + ((s.h === 64 ? 39 : s.h) - s.oy) * (props.scaleY ?? 1);
        spr.setDepth(DEPTH.ysort + base);
      }
    }
  }

  addSellBox() {
    const T = this.grid.tileSize;
    const x = SELL_BOX_TILE.x * T + T / 2, y = SELL_BOX_TILE.y * T + T;
    this.add.image(x, y - 1, 'crate_base').setOrigin(0.5, 1).setDepth(DEPTH.ysort + y);
    this.add.image(x, y - 6, 'crate_top').setOrigin(0.5, 1).setDepth(DEPTH.ysort + y + 0.1);
  }

  seeds() {
    return crops.filter(c => this.inventory.count(`seed:${c.id}`) > 0);
  }

  currentSeed() {
    const list = this.seeds();
    if (!list.length) return null;
    this.selectedSeed = Phaser.Math.Wrap(this.selectedSeed, 0, list.length);
    return list[this.selectedSeed];
  }

  cycleSeed(dir) {
    this.selectedSeed += dir;
    this.currentSeed();
  }

  // Ação contextual no tile à frente do jogador.
  targetAction() {
    const t = this.player.targetTile();
    if (t.x === SELL_BOX_TILE.x && t.y === SELL_BOX_TILE.y) {
      return { tile: t, action: crops.some(c => this.inventory.count(`crop:${c.id}`)) ? 'sell' : null };
    }
    let action = this.farm.actionAt(t.x, t.y);
    if (action === 'plant' && !this.currentSeed()) action = null;
    return { tile: t, action };
  }

  useAction() {
    if (this.player.busy || this.sleeping) return;
    const { tile, action } = this.targetAction();
    if (!action) return;
    if (action === 'plant' && !this.farm.canPlant(this.currentSeed().id, this.clock.season)) {
      this.toast(`${this.currentSeed().name} não cresce nesta estação.`);
      return;
    }
    const cost = ENERGY_COST[action] ?? 0;
    if (this.energy < cost) {
      this.toast('Sem energia. Durma para recuperar (Z).');
      return;
    }
    this.player.act(ACTION_ANIM[action], () => {
      this.energy -= cost;
      if (action === 'till') this.farm.till(tile.x, tile.y);
      if (action === 'water') this.farm.water(tile.x, tile.y);
      if (action === 'harvest') this.farm.harvest(tile.x, tile.y);
      if (action === 'plant') {
        const seed = this.currentSeed();
        if (seed && this.farm.plant(tile.x, tile.y, seed.id)) this.inventory.remove(`seed:${seed.id}`);
      }
      if (action === 'sell') this.sellAll();
      this.farmPlot.refresh();
    });
  }

  sellAll() {
    let total = 0;
    for (const c of crops) {
      const n = this.inventory.count(`crop:${c.id}`);
      if (!n) continue;
      this.inventory.remove(`crop:${c.id}`, n);
      total += n * c.sellPrice;
      events.emit('crop:sold', { cropId: c.id, amount: n, gold: n * c.sellPrice });
    }
    this.inventory.addGold(total);
    this.toast(`Vendido por ${total} de ouro.`);
  }

  // Dormir salva e avança o dia. Desmaiar às 2h perde 10% do ouro e acorda com metade da energia.
  sleep(reason) {
    if (this.sleeping || this.player.busy) return;
    this.sleeping = true;
    this.clock.paused = true;
    const cam = this.cameras.main;
    cam.fade(700, 0, 0, 0, true, (_, progress) => {
      if (progress < 1) return;
      const passedOut = reason === 'passedOut';
      if (passedOut) this.inventory.addGold(-Math.floor(this.inventory.gold * 0.1));
      this.clock.nextDay();
      this.farm.onNewDay(this.clock.snapshot());
      this.energy = passedOut ? MAX_ENERGY / 2 : MAX_ENERGY;
      this.farmPlot.refresh();
      this.save();
      this.clock.paused = false;
      this.sleeping = false;
      cam.fadeFrom(700, 0, 0, 0, true);
      this.toast(passedOut ? 'Você desmaiou de cansaço... e perdeu um pouco de ouro.' : `Dia ${this.clock.day}. Jogo salvo.`);
    });
  }

  save() {
    SaveSystem.save({
      time: this.clock.snapshot(),
      player: { ...this.inventory.snapshot(), energy: this.energy, pos: { x: this.player.x, y: this.player.y } },
      farm: this.farm.snapshot(),
      quests: this.quests.snapshot(),
    });
  }

  toast(text) {
    events.emit('ui:toast', text);
  }

  update(_, dt) {
    if (this.sleeping) return;
    this.clock.update(dt);
    const k = this.keys;
    this.player.move({
      x: (k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown),
      y: (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown),
      run: k.SHIFT.isDown,
    }, dt);

    // Moldura no tile alvo quando há algo a fazer nele.
    const { tile, action } = this.targetAction();
    this.currentTarget = action;
    this.cursor.clear();
    if (action) {
      const T = this.grid.tileSize;
      this.cursor.lineStyle(1, 0xffffff, 0.9).strokeRect(tile.x * T + 0.5, tile.y * T + 0.5, T - 1, T - 1);
    }
  }
}
