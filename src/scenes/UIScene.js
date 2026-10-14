import Phaser from 'phaser';
import { ZOOM, MAX_ENERGY } from '../config.js';
import { events } from '../systems/EventBus.js';
import { SEASON_NAMES } from '../systems/TimeSystem.js';
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

    this.questPanel = this.makePanel();
    this.questText = this.add.text(0, 0, '', { ...FONT, wordWrap: { width: 260 } }).setLineSpacing(3);

    this.seedPanel = this.makePanel();
    this.seedIcon = this.add.image(0, 0, '__DEFAULT').setScale(ZOOM);
    this.seedText = this.add.text(0, 0, '', FONT).setLineSpacing(3);

    this.hint = this.add.text(0, 0, 'WASD/setas: andar · Shift: correr · Espaço: usar · Q/E: semente · Z: dormir', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', stroke: '#1b2a3a', strokeThickness: 4,
    }).setOrigin(0.5, 1);

    this.toastText = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', stroke: '#1b2a3a', strokeThickness: 5, align: 'center',
      wordWrap: { width: 520 },
    }).setOrigin(0.5, 0).setAlpha(0);

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

  showToast(text) {
    this.toastText.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 3200, duration: 600 });
  }

  update() {
    const v = this.village;
    if (!v?.clock) return;
    const { width, height } = this.scale;
    const clock = v.clock;

    // Status: data, hora, ouro e energia.
    this.statusText.setText([
      `Dia ${clock.day} · ${SEASON_NAMES[clock.season]} · Ano ${clock.year}`,
      `${clock.clockText()}   Ouro: ${v.inventory.gold}`,
      'Energia',
    ]);
    const sw = Math.max(250, this.statusText.width + PAD * 2), sh = this.statusText.height + PAD * 2 + 14;
    this.layoutPanel(this.status, PAD, PAD, sw, sh);
    this.statusText.setPosition(PAD * 2, PAD * 2);
    const barY = PAD * 2 + this.statusText.height - 9;
    this.energyBg.setPosition(PAD * 2 + 72, barY).setSize(sw - 72 - PAD * 3, 10);
    this.energyBar.setPosition(PAD * 2 + 73, barY).setSize((sw - 74 - PAD * 3) * (v.energy / MAX_ENERGY), 6);
    this.energyBar.setFillStyle(v.energy > 30 ? 0x6dbb45 : 0xd9573b);

    // Missão atual.
    const q = v.quests.current();
    this.questText.setText(q ? [`★ ${q.title}`, q.description, `${q.progress}/${q.objective.count}`] : ['★ Ato 1 em construção', 'Explore o vale!']);
    const qw = 280 + PAD * 2, qh = this.questText.height + PAD * 2;
    this.layoutPanel(this.questPanel, width - qw - PAD, PAD, qw, qh);
    this.questText.setPosition(width - qw, PAD * 2);

    // Semente selecionada e ação no alvo.
    const seed = v.currentSeed();
    const harvested = v.inventory ? Object.entries(v.inventory.items).filter(([k]) => k.startsWith('crop:')).reduce((n, [, c]) => n + c, 0) : 0;
    const action = v.currentTarget ? `Espaço: ${ACTION_LABEL[v.currentTarget]}` : ' ';
    this.seedText.setText([
      seed ? `${seed.name} ×${v.inventory.count(`seed:${seed.id}`)}` : 'Sem sementes',
      `Colheitas: ${harvested}`,
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
  }
}
