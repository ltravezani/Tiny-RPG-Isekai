import Phaser from 'phaser';
import { ZOOM, MAX_ENERGY } from '../config.js';
import { MAX_HP } from '../entities/Player.js';
import { events } from '../systems/EventBus.js';
import { SEASON_NAMES } from '../systems/TimeSystem.js';
import { WEATHER_NAMES } from '../systems/WeatherSystem.js';
import { ACTION_LABEL } from './VillageScene.js';

const BOX = 'w_box_9slice';
const PARTS = ['tl', 'tc', 'tr', 'lc', 'c', 'rc', 'bl', 'bc', 'br'];
const FONT = { fontFamily: 'monospace', fontSize: '15px', color: '#3b2a1e' };
const PAD = 10;

// HUD por cima do mundo, com câmera sem zoom; as peças do pack são ampliadas em ZOOM.
export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  preload() {
    for (const p of PARTS) this.load.image(`${BOX}_${p}`, `assets/sunnyside/UI/9slice_box_white/${BOX}_${p}.png`);
  }

  create() {
    this.village = this.scene.get('Village');

    this.status = this.makePanel();
    this.statusText = this.add.text(0, 0, '', FONT).setLineSpacing(4);
    this.energyBg = this.add.rectangle(0, 0, 120, 8, 0x3b2a1e).setOrigin(0, 0.5);
    this.energyBar = this.add.rectangle(0, 0, 120, 6, 0x6dbb45).setOrigin(0, 0.5);
    this.hpBg = this.add.rectangle(0, 0, 120, 8, 0x3b2a1e).setOrigin(0, 0.5);
    this.hpBar = this.add.rectangle(0, 0, 120, 6, 0xd9573b).setOrigin(0, 0.5);

    this.questPanel = this.makePanel();
    this.questText = this.add.text(0, 0, '', { ...FONT, wordWrap: { width: 260 } }).setLineSpacing(3);

    this.seedPanel = this.makePanel();
    this.seedIcon = this.add.image(0, 0, '__DEFAULT').setScale(ZOOM);
    this.seedText = this.add.text(0, 0, '', FONT).setLineSpacing(3);

    this.hint = this.add.text(0, 0, 'WASD: andar · Shift: correr · Espaço: usar · J: atacar · K: rolar · Q/E: semente · Z: dormir · M: mapa', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', stroke: '#1b2a3a', strokeThickness: 4,
    }).setOrigin(0.5, 1);

    this.toastText = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', stroke: '#1b2a3a', strokeThickness: 5, align: 'center',
      wordWrap: { width: 520 },
    }).setOrigin(0.5, 0).setAlpha(0);

    // Janela modal: diálogo de NPC ou quadro de missões.
    this.modal = null;
    this.modalPanel = this.makePanel().map(p => p.setDepth(10));
    this.modalTitle = this.add.text(0, 0, '', { ...FONT, fontSize: '17px', fontStyle: 'bold', color: '#7a3b1e' }).setDepth(11);
    this.modalText = this.add.text(0, 0, '', { ...FONT, fontSize: '16px', lineSpacing: 6 }).setDepth(11);
    this.modalHint = this.add.text(0, 0, '', { ...FONT, fontSize: '13px', color: '#7a5a40' }).setOrigin(1, 1).setDepth(11);
    this.setModalVisible(false);

    // Indicador da missão na tela, minimapa e mapa completo.
    this.questMark = this.add.image(0, 0, 'ui:indicator').setScale(ZOOM).setOrigin(0.5, 1).setVisible(false);
    this.questArrow = this.add.image(0, 0, 'ui:arrow_right').setScale(ZOOM - 1).setTint(0xffd84a).setVisible(false);
    this.questArrowText = this.add.text(0, 0, '', { ...FONT, fontSize: '12px', color: '#ffffff', stroke: '#1b2a3a', strokeThickness: 4 }).setOrigin(0.5).setVisible(false);
    this.miniPanel = this.makePanel();
    this.mini = this.add.image(0, 0, 'minimap').setOrigin(0);
    this.miniDots = this.add.graphics();
    this.miniHint = this.add.text(0, 0, 'M: mapa', { ...FONT, fontSize: '12px' }).setOrigin(1, 0);

    this.mapLayer = this.add.container(0, 0).setDepth(20).setVisible(false);
    this.mapShade = this.add.rectangle(0, 0, 10, 10, 0x0d1620, 0.7).setOrigin(0);
    this.mapPanel = this.makePanel();
    this.mapImage = this.add.image(0, 0, 'minimap').setOrigin(0);
    this.mapDots = this.add.graphics();
    this.mapTitle = this.add.text(0, 0, 'Vale do Brotar', { ...FONT, fontSize: '18px', fontStyle: 'bold', color: '#7a3b1e' });
    this.mapLegend = this.add.text(0, 0, '★ missão principal   ● diárias   ● aldeões   ◆ você      M: fechar', { ...FONT, fontSize: '13px' });
    this.mapLabels = this.add.group();
    this.mapLayer.add([this.mapShade, ...this.mapPanel, this.mapImage, this.mapDots, this.mapTitle, this.mapLegend]);

    events.on('ui:toast', text => this.showToast(text), this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => events.off('ui:toast', undefined, this));
  }

  makePanel() {
    return PARTS.map(p => this.add.image(0, 0, `${BOX}_${p}`).setOrigin(0).setScale(ZOOM));
  }

  layoutPanel(parts, x, y, w, h) {
    const c = parts[0].width * ZOOM; // canto
    const xs = [x, x + c, x + w - c], ys = [y, y + c, y + h - c];
    const ws = [c, w - 2 * c, c], hs = [c, h - 2 * c, c];
    parts.forEach((img, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      img.setPosition(xs[col], ys[row]).setDisplaySize(ws[col], hs[row]);
    });
  }

  setModalVisible(visible) {
    [...this.modalPanel, this.modalTitle, this.modalText, this.modalHint].forEach(o => o.setVisible(visible));
  }

  openDialog(name, lines, onClose, affinity) {
    this.modal = 'dialog';
    this.dialog = { name, lines, index: 0, shown: 0, onClose };
    this.modalTitle.setText(affinity === undefined ? name : `${name}   ${'♥'.repeat(affinity)}${'♡'.repeat(10 - affinity)}`);
    this.setModalVisible(true);
  }

  openMap() {
    this.modal = 'map';
    this.mapLayer.setVisible(true);
  }

  openBoard() {
    this.modal = 'board';
    this.modalTitle.setText('Quadro de Missões');
    this.setModalVisible(true);
  }

  // Espaço: completa a frase que está sendo escrita, passa para a próxima ou fecha.
  advance() {
    if (this.modal !== 'dialog') return this.close();
    const d = this.dialog;
    const line = d.lines[d.index];
    if (d.shown < line.length) { d.shown = line.length; return; }
    if (++d.index >= d.lines.length) return this.close();
    d.shown = 0;
  }

  close() {
    const onClose = this.modal === 'dialog' ? this.dialog.onClose : null;
    this.modal = null;
    this.dialog = null;
    this.setModalVisible(false);
    this.mapLayer.setVisible(false);
    this.mapLabels.clear(true, true);
    onClose?.();
  }

  updateModal(width, height, dt) {
    if (!this.modal || this.modal === 'map') return;
    const w = Math.min(720, width - 40);
    const x = (width - w) / 2;
    this.modalText.setWordWrapWidth(w - PAD * 4);
    if (this.modal === 'dialog') {
      const d = this.dialog;
      const line = d.lines[d.index];
      d.shown = Math.min(line.length, d.shown + dt * 0.05); // ~50 letras por segundo
      this.modalText.setText(line.slice(0, Math.floor(d.shown)));
      this.modalHint.setText(d.index < d.lines.length - 1 ? 'Espaço ▸' : 'Espaço: fechar');
    } else {
      const q = this.village.quests;
      const rows = q.dailies.map((d, i) => `${d.done ? '✓' : `${i + 1}.`} ${d.title}: ${d.text}  (${d.progress}/${d.objective.count})  +${d.rewards.gold} ouro`);
      rows.push('', `Sequência: ${q.dailyStreak} dia(s) com todas feitas. Complete as 3 para ganhar o bônus.`);
      this.modalText.setText(rows);
      this.modalHint.setText(q.rerolled ? 'Espaço: fechar' : '1-3: trocar uma diária (1x por dia) · Espaço: fechar');
    }
    const h = Math.max(150, this.modalText.height + 90);
    const y = height - h - 40;
    this.layoutPanel(this.modalPanel, x, y, w, h);
    this.modalTitle.setPosition(x + PAD * 2, y + PAD * 2);
    this.modalText.setPosition(x + PAD * 2, y + PAD * 2 + 30);
    this.modalHint.setPosition(x + w - PAD * 2, y + h - PAD * 1.5);
  }

  // Seta na borda da tela apontando para a missão principal (ou a primeira diária);
  // quando o lugar está na tela, um marcador balança em cima dele.
  updateQuestIndicator(width, height, targets) {
    const t = targets.find(x => x.kind === 'main') ?? targets[0];
    const cam = this.village.cameras.main;
    const show = !!t && !this.modal;
    this.questMark.setVisible(false);
    this.questArrow.setVisible(false);
    this.questArrowText.setVisible(false);
    if (!show) return;
    const sx = (t.x - cam.worldView.x) * cam.zoom, sy = (t.y - cam.worldView.y) * cam.zoom;
    const margin = 40;
    if (sx > margin && sx < width - margin && sy > margin + 60 && sy < height - margin) {
      const bob = Math.sin(this.time.now / 200) * 4;
      this.questMark.setVisible(true).setPosition(sx, sy - 20 * cam.zoom / ZOOM - 14 + bob).setTint(t.kind === 'main' ? 0xffd84a : 0x8fd3ff);
      return;
    }
    // A seta anda numa moldura que evita os painéis do topo e de baixo.
    const top = 130, bottom = height - 150;
    const cx = width / 2, cy = (top + bottom) / 2;
    const ang = Math.atan2(sy - cy, sx - cx);
    const rx = cx - margin, ry = (bottom - top) / 2;
    const k = Math.min(Math.abs(rx / Math.cos(ang)), Math.abs(ry / Math.sin(ang)));
    const ax = cx + Math.cos(ang) * k, ay = cy + Math.sin(ang) * k;
    this.questArrow.setVisible(true).setPosition(ax, ay).setRotation(ang).setTint(t.kind === 'main' ? 0xffd84a : 0x8fd3ff);
    const p = this.village.player;
    const meters = Math.round(Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) / 16);
    this.questArrowText.setVisible(true).setText(`${t.label} · ${meters} m`)
      .setPosition(ax - Math.cos(ang) * 34, ay - Math.sin(ang) * 22);
  }

  // Pontos no mapa: aldeões, missões e o jogador.
  drawMapDots(g, ox, oy, scale, targets, big) {
    const v = this.village, T = v.grid.tileSize;
    const toMap = (x, y) => [ox + (x / T) * scale, oy + (y / T) * scale];
    g.clear();
    const r = big ? 4 : 2;
    for (const n of v.life.villagers) {
      if (!n.visible) continue;
      const [x, y] = toMap(n.x, n.y);
      g.fillStyle(0x3b2a1e).fillCircle(x, y, r + 1).fillStyle(0xf2d16b).fillCircle(x, y, r);
    }
    const pulse = 1 + Math.abs(Math.sin(this.time.now / 250)) * 0.6;
    for (const t of targets) {
      const [x, y] = toMap(t.x, t.y);
      if (t.kind === 'main') {
        g.fillStyle(0x3b2a1e).fillCircle(x, y, (r + 3) * pulse).fillStyle(0xffd84a).fillCircle(x, y, (r + 2) * pulse);
      } else {
        g.fillStyle(0x1b2a3a).fillCircle(x, y, r + 1.5).fillStyle(0x8fd3ff).fillCircle(x, y, r + 0.5);
      }
    }
    const [px, py] = toMap(v.player.x, v.player.y);
    const d = r + 2;
    g.fillStyle(0x1b2a3a).fillTriangle(px, py - d - 2, px - d - 2, py + d, px + d + 2, py + d)
      .fillStyle(0xffffff).fillTriangle(px, py - d, px - d, py + d - 1, px + d, py + d - 1);
  }

  updateMinimap(width, height, targets) {
    const scale = 1.4;
    const w = this.mini.width * scale, h = this.mini.height * scale;
    const x = width - w - PAD * 2, y = height - h - PAD * 2 - 30;
    this.layoutPanel(this.miniPanel, x - PAD, y - PAD, w + PAD * 2, h + PAD * 2);
    this.mini.setPosition(x, y).setScale(scale);
    this.miniHint.setPosition(x + w, y + h + 2);
    this.drawMapDots(this.miniDots, x, y, scale, targets, false);
    // Área que a câmera mostra.
    const cam = this.village.cameras.main, T = this.village.grid.tileSize;
    this.miniDots.lineStyle(1, 0xffffff, 0.8).strokeRect(x + (cam.worldView.x / T) * scale, y + (cam.worldView.y / T) * scale, (cam.worldView.width / T) * scale, (cam.worldView.height / T) * scale);
  }

  updateMap(width, height, targets) {
    const iw = this.mapImage.width, ih = this.mapImage.height;
    const scale = Math.max(2, Math.floor(Math.min((width - 100) / iw, (height - 150) / ih)));
    const w = iw * scale, h = ih * scale, x = Math.round((width - w) / 2), y = Math.round((height - h) / 2) + 14;
    this.mapShade.setSize(width, height);
    this.layoutPanel(this.mapPanel, x - PAD * 2, y - 46, w + PAD * 4, h + 80);
    this.mapImage.setPosition(x, y).setScale(scale);
    this.mapTitle.setPosition(x, y - 34);
    this.mapLegend.setPosition(x, y + h + 8);
    this.drawMapDots(this.mapDots, x, y, scale, targets, true);
    // Nomes dos aldeões e das missões.
    this.mapLabels.clear(true, true);
    const T = this.village.grid.tileSize;
    const label = (wx, wy, text, color) => {
      const t = this.add.text(x + (wx / T) * scale, y + (wy / T) * scale - 10, text, { ...FONT, fontSize: '11px', color, stroke: '#1b2a3a', strokeThickness: 3 })
        .setOrigin(0.5, 1).setDepth(21);
      this.mapLabels.add(t);
    };
    const v = this.village;
    for (const [wx, wy, name] of v.mapPlaces()) label(wx, wy, name, '#ffffff');
    for (const n of v.life.villagers) if (n.visible) label(n.x, n.y, n.def.name, '#f2d16b');
    // Missões: a principal em cima do ponto, as diárias embaixo, para não se sobreporem.
    const seen = new Set();
    for (const t of targets) {
      const key = `${Math.round(t.x / 64)},${Math.round(t.y / 64)}`;
      const below = t.kind !== 'main' || seen.has(key);
      seen.add(key);
      label(t.x, t.y + (below ? 30 * T / scale : -8), t.label, t.kind === 'main' ? '#ffd84a' : '#8fd3ff');
    }
  }

  showToast(text) {
    this.toastText.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 3200, duration: 600 });
  }

  update(_, dt) {
    const v = this.village;
    if (!v?.clock) return;
    const { width, height } = this.scale;
    const clock = v.clock;

    // Status: data, hora, ouro e energia.
    this.statusText.setText([
      `Dia ${clock.day} · ${SEASON_NAMES[clock.season]} · Ano ${clock.year}`,
      `${clock.clockText()} · ${WEATHER_NAMES[v.weather.today]}   Ouro: ${v.inventory.gold}`,
      'Vida',
      'Energia',
    ]);
    const sw = Math.max(250, this.statusText.width + PAD * 2), sh = this.statusText.height + PAD * 2 + 6;
    this.layoutPanel(this.status, PAD, PAD, sw, sh);
    this.statusText.setPosition(PAD * 2, PAD * 2);
    const lineH = this.statusText.height / 4, barW = sw - 74 - PAD * 3;
    const bar = (bg, fg, row, ratio) => {
      const y = PAD * 2 + lineH * (row + 0.5);
      bg.setPosition(PAD * 2 + 72, y).setSize(barW + 2, 10);
      fg.setPosition(PAD * 2 + 73, y).setSize(Math.max(0, barW * ratio), 6);
    };
    bar(this.hpBg, this.hpBar, 2, v.player.hp / MAX_HP);
    bar(this.energyBg, this.energyBar, 3, v.energy / MAX_ENERGY);
    this.energyBar.setFillStyle(v.energy > 30 ? 0x6dbb45 : 0xd9a03b);

    // Missão atual.
    const q = v.quests.current();
    const lines = q ? [`★ ${q.title}`, q.description, `${q.progress}/${q.objective.count}`] : ['★ Ato 1 em construção', 'Explore o vale!'];
    lines.push('', 'Diárias');
    if (!v.quests.dailyAccepted) lines.push('Leia o quadro de missões.');
    else for (const d of v.quests.dailies) lines.push(`${d.done ? '✓' : '·'} ${d.text} ${d.done ? '' : `${d.progress}/${d.objective.count}`}`);
    this.questText.setText(lines);
    const qw = 280 + PAD * 2, qh = this.questText.height + PAD * 2;
    this.layoutPanel(this.questPanel, width - qw - PAD, PAD, qw, qh);
    this.questText.setPosition(width - qw, PAD * 2);

    // Semente selecionada e ação no alvo.
    const seed = v.currentSeed();
    const harvested = v.inventory ? Object.entries(v.inventory.items).filter(([k]) => k.startsWith('crop:')).reduce((n, [, c]) => n + c, 0) : 0;
    const action = v.currentTarget ? `Espaço: ${ACTION_LABEL[v.currentTarget]}` : ' ';
    this.seedText.setText([
      seed ? `${seed.name} ×${v.inventory.count(`seed:${seed.id}`)}` : 'Sem sementes',
      `Colheitas: ${harvested} · Madeira: ${v.inventory.count('res:wood')} · Pedra: ${v.inventory.count('res:stone')}`,
      action,
    ]);
    this.seedIcon.setVisible(!!seed);
    if (seed) this.seedIcon.setTexture(`crop:${seed.sprite}:0`);
    const bw = Math.max(230, this.seedText.width + 70), bh = this.seedText.height + PAD * 2;
    const bx = width / 2 - bw / 2, by = height - bh - 34;
    this.layoutPanel(this.seedPanel, bx, by, bw, bh);
    this.seedIcon.setPosition(bx + 30, by + bh / 2);
    this.seedText.setPosition(bx + 56, by + PAD);

    this.hint.setPosition(width / 2, height - 8);
    this.toastText.setPosition(width / 2, height * 0.22);
    this.updateModal(width, height, dt);
    const targets = v.questTargets();
    this.updateQuestIndicator(width, height, targets);
    this.updateMinimap(width, height, targets);
    if (this.modal === 'map') this.updateMap(width, height, targets);
  }
}
