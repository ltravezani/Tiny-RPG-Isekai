import Phaser from 'phaser';
import crops from '../data/crops.json';
import quests from '../data/quests.json';
import dailies from '../data/dailies.json';
import dialogues from '../data/dialogues.json';
import villagers from '../data/villagers.json';
import { ZOOM, DEPTH, FARM_ZONE, SPAWN_TILE, SELL_BOX_TILE, QUEST_BOARD_TILE, MAX_ENERGY, ENERGY_COST } from '../config.js';
import { events } from '../systems/EventBus.js';
import { buildWorldGrid } from '../systems/WorldGrid.js';
import { TimeSystem } from '../systems/TimeSystem.js';
import { FarmSystem } from '../systems/FarmSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { WeatherSystem, WEATHER_NAMES } from '../systems/WeatherSystem.js';
import { Player } from '../entities/Player.js';
import { FarmPlot } from '../entities/FarmPlot.js';
import { placeQuestBoard } from '../entities/QuestBoard.js';
import { VillageLife } from './VillageLife.js';
import { Ambience } from './Ambience.js';
import { buildMinimapCanvas } from '../systems/Minimap.js';

// Camadas acima dos personagens (nuvens) e a camada de objetos ordenada por Y junto com eles.
const SKY_LAYERS = new Set(['cloud_shadow', 'clouds_01']);
const YSORT_OBJECTS = 'Assets_1';
const DECO_LAYERS = ['decoration_01', 'decoration_02', 'decoration_03'];
// Na fazenda só ficam objetos fixos; as culturas e os goblins decorativos do exemplo saem.
const KEEP_IN_FARM = /crate|barrel|chest|well/;

const inFarm = (tx, ty) => tx >= FARM_ZONE.x && ty >= FARM_ZONE.y && tx < FARM_ZONE.x + FARM_ZONE.w && ty < FARM_ZONE.y + FARM_ZONE.h;

const ACTION_ANIM = { till: 'dig', plant: 'doing', water: 'water', harvest: 'doing', sell: 'doing', gather: 'doing' };
export const ACTION_LABEL = {
  till: 'arar', plant: 'plantar', water: 'regar', harvest: 'colher', sell: 'vender colheitas',
  talk: 'conversar', board: 'ler o quadro de missões', pet: 'fazer carinho', gather: 'pegar',
};
const MAX_AFFINITY = 10;
// Ferramenta necessária para cada ação (a Vovó Tereza entrega na primeira conversa).
const TOOL_FOR = { till: ['tool:hoe', 'uma enxada'], water: ['tool:watering_can', 'um regador'] };

export class VillageScene extends Phaser.Scene {
  constructor() { super('Village'); }

  create() {
    const gm = this.cache.json.get('gmSprites');
    const mapData = this.cache.tilemap.get('vale').data;
    this.clearFarmZone(mapData, gm);

    const mapSprites = this.buildMap(mapData, gm);
    this.grid = buildWorldGrid(mapData, gm);
    const tereza = villagers.find(v => v.id === 'tereza').home;
    for (const t of [SELL_BOX_TILE, tereza, QUEST_BOARD_TILE]) this.grid.block(t.x, t.y);

    // Estado: carrega o save ou começa um jogo novo.
    const save = SaveSystem.load();
    this.clock = new TimeSystem(save?.time);
    this.inventory = new InventorySystem(save?.player ?? { items: { 'seed:sunflower': 1 } });
    this.energy = save?.player?.energy ?? MAX_ENERGY;
    this.farm = new FarmSystem(crops, (x, y) => inFarm(x, y) && !this.grid.isBlocked(x, y), save?.farm);
    events.removeAllListeners();
    this.quests = new QuestSystem({ main: quests, dailies, crops }, this.inventory, save?.quests);
    if (!save) this.quests.rollDailies(this.dailyState());
    this.social = { affinity: {}, talkedDay: {}, ...(save?.social ?? {}) };
    this.dialogue = new DialogueSystem(dialogues, this.quests, id => this.social.affinity[id] ?? 0);
    this.weather = new WeatherSystem(save?.weather);
    this.selectedSeed = 0;

    this.farmPlot = new FarmPlot(this, this.farm, this.grid.tileSize);
    this.farmPlot.refresh();
    this.addSellBox();
    this.life = new VillageLife(this, this.grid, villagers, mapSprites, save?.world);
    placeQuestBoard(this, QUEST_BOARD_TILE.x, QUEST_BOARD_TILE.y);

    const T = this.grid.tileSize;
    const spawn = save?.player?.pos ?? { x: SPAWN_TILE.x * T + T / 2, y: SPAWN_TILE.y * T + T / 2 };
    this.player = new Player(this, spawn.x, spawn.y, this.grid);
    this.cursor = this.add.graphics().setDepth(DEPTH.sky - 1);
    this.ambience = new Ambience(this);
    if (new URLSearchParams(location.search).has('grid')) this.drawGridDebug();
    if (!this.textures.exists('minimap')) this.textures.addCanvas('minimap', buildMinimapCanvas(this, mapData, this.grid));

    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels).startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(600);

    this.ui = this.scene.get('UI');
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,ESC,Q,E,Z,M,ONE,TWO,THREE');
    // Com uma janela aberta (diálogo ou quadro), as teclas vão para ela.
    this.keys.SPACE.on('down', () => (this.ui.modal ? this.ui.advance() : this.useAction()));
    this.keys.ESC.on('down', () => this.ui.modal && this.ui.close());
    this.keys.Q.on('down', () => !this.ui.modal && this.cycleSeed(-1));
    this.keys.E.on('down', () => !this.ui.modal && this.cycleSeed(1));
    this.keys.Z.on('down', () => !this.ui.modal && this.sleep('bed'));
    this.keys.M.on('down', () => {
      if (this.ui.modal === 'map') this.ui.close();
      else if (!this.ui.modal) this.ui.openMap();
    });
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => this.keys[k].on('down', () => this.rerollDaily(i)));

    events.on('player:passedOut', () => this.sleep('passedOut'));
    events.on('quest:completed', q => this.toast(`Missão concluída: ${q.title}`));
    events.on('daily:completed', d => this.toast(`Diária concluída: ${d.title} (+${d.rewards.gold} de ouro)`));
    events.on('daily:bonus', b => this.toast(b.weekly
      ? `Sete dias seguidos! Baú semanal: ${b.rewards.gold} de ouro e sementes raras.`
      : `Todas as diárias feitas! Bônus: ${b.rewards.gold} de ouro e sementes.`));
    events.on('crop:harvested', ({ cropId }) => {
      this.inventory.add(`crop:${cropId}`);
      this.farmPlot.refresh();
    });

    this.scene.launch('UI');
    events.on('resource:collected', ({ item }) => this.inventory.add(item));
    if (!save) this.time.delayedCall(800, () => this.toast('Você acordou num campo seco, com uma semente de girassol na mão. Há uma senhora ali perto.'));
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
    const tilesets = [
      map.addTilesetImage('sunnyside_16', 'tiles16', 16, 16, 1, 2),
      map.addTilesetImage('sunnyside_forest', 'tilesForest', 16, 16, 1, 2),
    ];

    // Mantém a ordem do GameMaker: cada camada de objetos fica entre as camadas de tiles vizinhas.
    // Devolve os sprites da camada principal, para a VillageLife dar vida a eles.
    const ysorted = [];
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
        const base = ((s.h === 64 ? 39 : s.h) - s.oy) * (props.scaleY ?? 1);
        spr.setDepth(DEPTH.ysort + o.y + base);
        ysorted.push({ sprite: spr, name: o.name, id: o.id, base: Math.max(0, base - 4) });
      }
    }
    return ysorted;
  }

  // ?grid na URL: pinta de vermelho os tiles bloqueados (ajuda a revisar o mapa).
  drawGridDebug() {
    const g = this.add.graphics().setDepth(DEPTH.sky + 100);
    const T = this.grid.tileSize;
    g.fillStyle(0xff0000, 0.35);
    for (let y = 0; y < this.grid.height; y++) for (let x = 0; x < this.grid.width; x++) {
      if (this.grid.isBlocked(x, y)) g.fillRect(x * T, y * T, T, T);
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
    const is = p => t.x === p.x && t.y === p.y;
    // Alvo de pessoas, animais e itens: um ponto à frente dos pés, não o tile inteiro.
    const f = this.player.facing;
    const thing = this.life.find(this.player.x + f.x * 12, this.player.y + f.y * 12);
    if (thing?.kind === 'villager') return { tile: t, action: 'talk', ref: thing.ref };
    if (thing?.kind === 'animal') return { tile: t, action: 'pet', ref: thing.ref };
    if (thing?.kind === 'pickup') return { tile: t, action: 'gather', ref: thing.ref };
    if (is(QUEST_BOARD_TILE)) return { tile: t, action: 'board' };
    if (is(SELL_BOX_TILE)) {
      return { tile: t, action: crops.some(c => this.inventory.count(`crop:${c.id}`)) ? 'sell' : null };
    }
    let action = this.farm.actionAt(t.x, t.y);
    if (action === 'plant' && !this.currentSeed()) action = null;
    return { tile: t, action };
  }

  useAction() {
    if (this.player.busy || this.sleeping) return;
    const { tile, action, ref } = this.targetAction();
    if (!action) return;
    if (action === 'talk') return this.talkTo(ref);
    if (action === 'board') return this.openBoard();
    if (action === 'pet') {
      if (ref.pet(this.clock.day)) events.emit('animal:petted', { kind: ref.kind });
      else this.toast(`A ${ref.name} já ganhou carinho hoje.`);
      return;
    }
    const tool = TOOL_FOR[action];
    if (tool && !this.inventory.count(tool[0])) {
      this.toast(`Você ainda não tem ${tool[1]}. Fale com a Vovó Tereza.`);
      return;
    }
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
      if (action === 'gather') {
        this.life.gather(ref, this.clock.day);
        events.emit('resource:collected', { item: ref.item, amount: 1 });
      }
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
      this.quests.rollDailies(this.dailyState());
      this.life.onNewDay(this.clock.day);
      const weather = this.weather.roll(this.clock.season);
      if (weather === 'rain') for (const t of this.farm.tiles.values()) t.watered = true; // chuva rega tudo
      this.energy = passedOut ? MAX_ENERGY / 2 : MAX_ENERGY;
      this.farmPlot.refresh();
      this.save();
      this.clock.paused = false;
      this.sleeping = false;
      cam.fadeFrom(700, 0, 0, 0, true);
      const forecast = weather === 'rain' ? ' Está chovendo: a fazenda já amanheceu regada.' : ` Tempo: ${WEATHER_NAMES[weather].toLowerCase()}.`;
      this.toast((passedOut ? 'Você desmaiou de cansaço... e perdeu um pouco de ouro.' : `Dia ${this.clock.day}. Jogo salvo.`) + forecast);
    });
  }

  // Conversar sobe a afinidade uma vez por dia (roteiro, seção 4: corações de 0 a 10).
  talkTo(npc) {
    npc.startTalk(this.player.x);
    const talk = this.dialogue.start(npc.id);
    const s = this.social;
    if (s.talkedDay[npc.id] !== this.clock.day) {
      s.talkedDay[npc.id] = this.clock.day;
      s.affinity[npc.id] = Math.min(MAX_AFFINITY, (s.affinity[npc.id] ?? 0) + 1);
    }
    this.ui.openDialog(talk.name, talk.lines, () => { npc.endTalk(); talk.finish(); }, s.affinity[npc.id]);
  }

  openBoard() {
    const first = this.quests.acceptDailies();
    this.ui.openBoard();
    if (first) this.toast('Diárias aceitas. Boa sorte, Semeador!');
  }

  rerollDaily(index) {
    if (this.ui.modal !== 'board') return;
    if (this.quests.reroll(index, this.dailyState())) this.toast('Diária trocada. Só dá para trocar uma por dia.');
    else this.toast(this.quests.rerolled ? 'Você já trocou uma diária hoje.' : 'Essa diária não pode ser trocada.');
  }

  // Nomes de lugares no mapa (pixels do mundo).
  mapPlaces() {
    const T = this.grid.tileSize;
    return [
      [(FARM_ZONE.x + FARM_ZONE.w / 2) * T, (FARM_ZONE.y - 1) * T, 'Fazenda'],
      [86 * T, 50 * T, 'Vale do Brotar'],
    ];
  }

  // Onde fazer cada missão ativa, em pixels do mundo (para o mapa e a seta na tela).
  questTargets() {
    const T = this.grid.tileSize;
    const tileCenter = t => ({ x: t.x * T + T / 2, y: t.y * T + T / 2 });
    const places = {
      farm: tileCenter({ x: FARM_ZONE.x + Math.floor(FARM_ZONE.w / 2), y: FARM_ZONE.y + Math.floor(FARM_ZONE.h / 2) }),
      sellBox: tileCenter(SELL_BOX_TILE),
      board: tileCenter(QUEST_BOARD_TILE),
    };
    const p = this.player;
    const nearest = list => list.reduce((best, o) => (!best || Phaser.Math.Distance.Between(o.x, o.y, p.x, p.y) < Phaser.Math.Distance.Between(best.x, best.y, p.x, p.y) ? o : best), null);
    const resolve = marker => {
      if (!marker) return null;
      if (marker.npc) { const v = this.life.villager(marker.npc); return v && { x: v.x, y: v.y }; }
      if (marker.place) return places[marker.place];
      if (marker.nearest === 'villager') return nearest(this.life.villagers.filter(v => v.visible));
      if (marker.nearest === 'animal') return nearest(this.life.animals.map(a => a.feet));
      if (marker.nearest === 'pickup') return nearest(this.life.pickups.filter(k => k.sprite.visible).map(k => k.sprite.getCenter()));
      return null;
    };
    // Diárias não têm marcador no JSON: o lugar sai do evento que elas esperam.
    const DAILY_MARKER = {
      'crop:harvested': { place: 'farm' }, 'crop:planted': { place: 'farm' }, 'tile:watered': { place: 'farm' },
      'tile:tilled': { place: 'farm' }, 'crop:sold': { place: 'sellBox' }, 'animal:petted': { nearest: 'animal' },
      'resource:collected': { nearest: 'pickup' }, 'npc:talked': { nearest: 'villager' },
    };
    const targets = [];
    const main = this.quests.current();
    const mainPos = main && resolve(main.marker);
    if (mainPos) targets.push({ ...mainPos, kind: 'main', label: main.title });
    if (!this.quests.dailyAccepted) {
      targets.push({ ...places.board, kind: 'daily', label: 'Quadro de Missões' });
    } else {
      for (const d of this.quests.dailies) {
        if (d.done) continue;
        const f = d.objective.filter?.npcId ? { npc: d.objective.filter.npcId } : DAILY_MARKER[d.objective.event];
        const pos = resolve(f);
        if (pos) targets.push({ ...pos, kind: 'daily', label: d.title });
      }
    }
    return targets;
  }

  // Dados que o sorteio das diárias usa.
  dailyState() {
    const planted = [...this.farm.tiles.values()].map(t => t.cropId).filter(Boolean);
    const owned = crops.filter(c => this.inventory.count(`seed:${c.id}`)).map(c => c.id);
    return { villageLevel: 1, day: this.clock.day, season: this.clock.season, unlockedCrops: [...new Set([...planted, ...owned])] };
  }

  save() {
    SaveSystem.save({
      time: this.clock.snapshot(),
      player: { ...this.inventory.snapshot(), energy: this.energy, pos: { x: this.player.x, y: this.player.y } },
      farm: this.farm.snapshot(),
      quests: this.quests.snapshot(),
      social: this.social,
      weather: this.weather.snapshot(),
      world: this.life.snapshot(),
    });
  }

  toast(text) {
    events.emit('ui:toast', text);
  }

  update(_, dt) {
    if (this.sleeping) return;
    const hour = Math.floor(this.clock.minutes / 60) % 24;
    this.life.update(dt, { hour, player: this.player });
    this.ambience.update(dt, {
      minutes: this.clock.minutes % (24 * 60), weather: this.weather.today, player: this.player,
      running: !this.ui.modal && this.keys.SHIFT.isDown && this.player.anim === 'run',
    });
    if (this.ui.modal) {
      this.player.move({ x: 0, y: 0 }, dt);
      return;
    }
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
