import Phaser from 'phaser';
import crops from '../data/crops.json';
import quests from '../data/quests.json';
import dailies from '../data/dailies.json';
import dialogues from '../data/dialogues.json';
import villagers from '../data/villagers.json';
import { ZOOM, DEPTH, MAX_ENERGY, ENERGY_COST } from '../config.js';
import { events } from '../systems/EventBus.js';
import { buildWorldGrid } from '../systems/WorldGrid.js';
import { TimeSystem } from '../systems/TimeSystem.js';
import { FarmSystem } from '../systems/FarmSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { WeatherSystem, WEATHER_NAMES } from '../systems/WeatherSystem.js';
import { Player, MAX_HP } from '../entities/Player.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { FarmPlot } from '../entities/FarmPlot.js';
import { placeQuestBoard } from '../entities/QuestBoard.js';
import { VillageLife } from './VillageLife.js';
import { Ambience } from './Ambience.js';
import { buildMinimapCanvas } from '../systems/Minimap.js';

// Camadas acima dos personagens (nuvens) e a camada de objetos ordenada por Y junto com eles.
const SKY_LAYERS = new Set(['cloud_shadow', 'clouds_01']);
const YSORT_OBJECTS = 'Assets_1';

// Pontos de interesse do mapa (camada "poi"), em tiles: { x, y, w, h, props }.
function readPoi(mapData) {
  const T = mapData.tilewidth;
  const layer = mapData.layers.find(l => l.name === 'poi');
  return Object.fromEntries((layer?.objects ?? []).map(o => [o.name, {
    x: o.x / T, y: o.y / T, w: o.width / T, h: o.height / T,
    props: Object.fromEntries((o.properties ?? []).map(p => [p.name, p.value])),
  }]));
}
// Tile de referência de um ponto: a porta da casa, ou o centro da área.
const poiTile = p => (p.props.doorX !== undefined
  ? { x: p.props.doorX, y: p.props.doorY + 1 }
  : { x: Math.floor(p.x + p.w / 2 - (p.w > 1 ? 0 : 0.5)), y: Math.floor(p.y + p.h / 2 - (p.h > 1 ? 0 : 0.5)) });

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
    this.poi = readPoi(mapData);
    const P = this.poi, zone = P.farm_zone;
    this.sellBoxTile = poiTile(P.sell_box);
    this.boardTile = poiTile(P.quest_board);
    const inFarm = (tx, ty) => tx >= zone.x && ty >= zone.y && tx < zone.x + zone.w && ty < zone.y + zone.h;

    const mapSprites = this.buildMap(mapData, gm);
    this.grid = buildWorldGrid(mapData, gm);
    // Aldeões: a casa de cada um vem do mapa (a porta, ou o centro da área).
    const villagerDefs = villagers.map(v => ({ ...v, home: poiTile(P[v.home]) }));
    for (const t of [this.sellBoxTile, this.boardTile, ...villagerDefs.filter(v => !v.wander).map(v => v.home)]) this.grid.block(t.x, t.y);

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
    this.life = new VillageLife(this, this.grid, villagerDefs, mapSprites, save?.world);
    placeQuestBoard(this, this.boardTile.x, this.boardTile.y);

    const T = this.grid.tileSize;
    const spawnTile = poiTile(P.spawn);
    this.home = { x: spawnTile.x * T + T / 2, y: spawnTile.y * T + T / 2 };
    const spawn = save?.player?.pos ?? this.home;
    this.player = new Player(this, spawn.x, spawn.y, this.grid);
    this.player.hp = save?.player?.hp ?? MAX_HP;
    const huntZones = Object.values(P).filter(p => p.props.enemy).map(p => ({ x: p.x * T, y: p.y * T, width: p.w * T, height: p.h * T, props: p.props }));
    this.combat = new CombatSystem(this, this.grid, huntZones);
    this.cursor = this.add.graphics().setDepth(DEPTH.sky - 1);
    this.ambience = new Ambience(this);
    if (new URLSearchParams(location.search).has('grid')) this.drawGridDebug();
    if (!this.textures.exists('minimap')) this.textures.addCanvas('minimap', buildMinimapCanvas(this, mapData, this.grid));

    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels).startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(600);

    this.ui = this.scene.get('UI');
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,ESC,Q,E,Z,M,J,K,ONE,TWO,THREE');
    this.keys.J.on('down', () => !this.ui.modal && this.attack());
    this.keys.K.on('down', () => !this.ui.modal && !this.sleeping && this.player.roll());
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
    events.on('enemy:killed', ({ type, gold, x, y }) => {
      this.inventory.addGold(gold);
      this.dropCoin(x, y, gold);
      if (type === 'goblin' && !this.quests.completed.includes('main_04') && Math.random() < 0.3) this.toast('O goblin deixou cair um saquinho de sementes roubadas.');
    });
    this.events.on('player:died', () => this.time.delayedCall(1400, () => this.sleep('died')));
    if (!save) this.time.delayedCall(800, () => this.toast('Você acordou num campo seco, com uma semente de girassol na mão. Há uma senhora ali perto.'));
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
      if (l.name === 'poi') continue;
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
    const x = this.sellBoxTile.x * T + T / 2, y = this.sellBoxTile.y * T + T;
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
    if (is(this.boardTile)) return { tile: t, action: 'board' };
    if (is(this.sellBoxTile)) {
      return { tile: t, action: crops.some(c => this.inventory.count(`crop:${c.id}`)) ? 'sell' : null };
    }
    let action = this.farm.actionAt(t.x, t.y);
    if (action === 'plant' && !this.currentSeed()) action = null;
    return { tile: t, action };
  }

  attack() {
    if (this.player.busy || this.sleeping || this.player.dead) return;
    if (!this.inventory.count('tool:sword')) {
      this.toast('Você ainda não tem uma espada. A Guilda de Aventureiros, na vila, pode ajudar.');
      return;
    }
    if (this.energy < 1) {
      this.toast('Sem energia para lutar. Durma para recuperar (Z).');
      return;
    }
    this.energy -= 1;
    this.player.act('attack');
    this.combat.playerAttack(this.player);
  }

  // Moedas que saltam do inimigo derrotado.
  dropCoin(x, y, gold) {
    const c = this.add.image(x, y - 6, 'gm:spr_deco_coin').setDepth(DEPTH.sky - 2);
    this.tweens.add({ targets: c, y: y - 22, duration: 250, yoyo: true, onComplete: () => {
      this.tweens.add({ targets: c, x: this.player.x, y: this.player.y - 10, alpha: 0, duration: 300, onComplete: () => c.destroy() });
    } });
    const t = this.add.text(x, y - 34, `+${gold}`, { fontFamily: 'monospace', fontSize: '8px', color: '#ffd84a', stroke: '#1b2a3a', strokeThickness: 2 })
      .setOrigin(0.5).setDepth(DEPTH.sky - 1).setResolution(4);
    this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  useAction() {
    if (this.player.busy || this.sleeping || this.player.dead) return;
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
    if (this.sleeping || (this.player.busy && reason === 'bed')) return;
    this.sleeping = true;
    this.clock.paused = true;
    const cam = this.cameras.main;
    cam.fade(700, 0, 0, 0, true, (_, progress) => {
      if (progress < 1) return;
      // Desmaiar ou ser derrotado: perde 10% do ouro e acorda em casa (roteiro, seções 8 e 10).
      const passedOut = reason !== 'bed';
      if (passedOut) {
        this.inventory.addGold(-Math.floor(this.inventory.gold * 0.1));
        this.player.setPosition(this.home.x, this.home.y);
      }
      this.player.revive();
      this.combat.onNewDay();
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
      const why = { passedOut: 'Você desmaiou de cansaço... e perdeu um pouco de ouro.', died: 'Você foi derrotado e acordou em casa, sem um pouco do ouro.' };
      this.toast((why[reason] ?? `Dia ${this.clock.day}. Jogo salvo.`) + forecast);
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

  // Nomes de lugares no mapa (pixels do mundo): áreas da camada "poi" que têm rótulo.
  mapPlaces() {
    const T = this.grid.tileSize;
    return Object.values(this.poi).filter(p => p.props.label).map(p => [(p.x + p.w / 2) * T, (p.y + 1) * T, p.props.label]);
  }

  // Onde fazer cada missão ativa, em pixels do mundo (para o mapa e a seta na tela).
  questTargets() {
    const T = this.grid.tileSize;
    const tileCenter = t => ({ x: t.x * T + T / 2, y: t.y * T + T / 2 });
    const places = {
      farm: tileCenter(poiTile(this.poi.farm_zone)),
      sellBox: tileCenter(this.sellBoxTile),
      board: tileCenter(this.boardTile),
    };
    const p = this.player;
    const nearest = list => list.reduce((best, o) => (!best || Phaser.Math.Distance.Between(o.x, o.y, p.x, p.y) < Phaser.Math.Distance.Between(best.x, best.y, p.x, p.y) ? o : best), null);
    const resolve = marker => {
      if (!marker) return null;
      if (marker.npc) { const v = this.life.villager(marker.npc); return v && { x: v.x, y: v.y }; }
      if (marker.place) return places[marker.place];
      if (marker.zone) return tileCenter(poiTile(this.poi[marker.zone]));
      if (marker.enemy) { const e = this.combat.nearestZone(marker.enemy, p); return e && { x: e.x, y: e.y }; }
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
    const markerFor = d => (d.objective.filter?.npcId ? { npc: d.objective.filter.npcId }
      : d.objective.event === 'enemy:killed' ? { enemy: d.objective.filter?.type } : DAILY_MARKER[d.objective.event]);
    const targets = [];
    const main = this.quests.current();
    const mainPos = main && resolve(main.marker);
    if (mainPos) targets.push({ ...mainPos, kind: 'main', label: main.title });
    if (!this.quests.dailyAccepted) {
      targets.push({ ...places.board, kind: 'daily', label: 'Quadro de Missões' });
    } else {
      for (const d of this.quests.dailies) {
        if (d.done) continue;
        const pos = resolve(markerFor(d));
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
      player: { ...this.inventory.snapshot(), energy: this.energy, hp: this.player.hp, pos: { x: this.player.x, y: this.player.y } },
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
    this.player.tick(dt);
    if (!this.ui.modal) this.combat.update(dt, this.player);
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
