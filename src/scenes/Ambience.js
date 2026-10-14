import Phaser from 'phaser';
import { DEPTH } from '../config.js';

// Cor da luz ao longo do dia (minutos desde 0h), aplicada com MULTIPLY por cima do mundo.
const LIGHT = [
  [5 * 60, 0x5a64a8], [6 * 60, 0x9a90c8], [7 * 60, 0xffffff], [17 * 60, 0xffffff],
  [18 * 60 + 30, 0xffcf9a], [20 * 60, 0x7b7fc0], [21 * 60, 0x5a64a8], [26 * 60, 0x5a64a8],
];
const RAIN_TINT = 0xb4bccb;
const CLOUDY_TINT = 0xdcdde4;

const lerpColor = (a, b, t) => {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};
const multiply = (a, b) => {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor((ca.red * cb.red) / 255, (ca.green * cb.green) / 255, (ca.blue * cb.blue) / 255);
};

export function lightAt(minutes) {
  const m = minutes < LIGHT[0][0] ? minutes + 24 * 60 : minutes;
  for (let i = 0; i < LIGHT.length - 1; i++) {
    const [m0, c0] = LIGHT[i], [m1, c1] = LIGHT[i + 1];
    if (m >= m0 && m <= m1) return lerpColor(c0, c1, (m - m0) / (m1 - m0));
  }
  return LIGHT[LIGHT.length - 1][1];
}

// Luz do dia, chuva, vagalumes à noite e poeira de corrida. Tudo só visual.
export class Ambience {
  constructor(scene) {
    this.scene = scene;
    const cam = scene.cameras.main;
    this.makeTextures();

    // Retângulo de luz preso à câmera; o zoom escala em volta do centro, então ele cobre a tela.
    this.light = scene.add.rectangle(0, 0, 10, 10, 0xffffff).setOrigin(0.5).setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(DEPTH.sky + 50);

    this.rainZone = new Phaser.Geom.Rectangle(0, 0, 400, 1);
    this.rain = scene.add.particles(0, 0, 'fx:rain', {
      emitZone: { type: 'random', source: this.rainZone }, lifespan: 700, speedY: { min: 260, max: 320 }, speedX: -40,
      quantity: 3, frequency: 16, alpha: { start: 0.7, end: 0.3 }, emitting: false,
    }).setScrollFactor(0).setDepth(DEPTH.sky + 60);

    this.fireflies = [];
    for (let i = 0; i < 28; i++) {
      this.fireflies.push(scene.add.image(0, 0, 'fx:firefly').setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.sky + 55).setVisible(false));
    }
    this.dustMs = 0;
    this.cam = cam;
  }

  makeTextures() {
    const { scene } = this;
    if (!scene.textures.exists('fx:rain')) {
      const g = scene.make.graphics({}, false);
      g.fillStyle(0xcfe3ff).fillRect(0, 0, 1, 5);
      g.generateTexture('fx:rain', 1, 5);
      g.clear().fillStyle(0xfff6a0, 0.35).fillCircle(2, 2, 2).fillStyle(0xfffbd0).fillRect(1, 1, 2, 2);
      g.generateTexture('fx:firefly', 4, 4);
      g.destroy();
    }
  }

  update(dt, { minutes, weather, player, running }) {
    const cam = this.cam, z = cam.zoom;
    const w = cam.width, h = cam.height;

    let color = lightAt(minutes);
    if (weather === 'rain') color = multiply(color, RAIN_TINT);
    else if (weather === 'cloudy') color = multiply(color, CLOUDY_TINT);
    this.light.setPosition(w / 2, h / 2).setSize(w, h).setFillStyle(color);

    // Chuva: emite na borda de cima da área visível (coordenadas antes do zoom).
    const raining = weather === 'rain';
    if (raining !== this.rain.emitting) raining ? this.rain.start() : this.rain.stop();
    if (raining) {
      const vw = w / z, vh = h / z;
      this.rain.setPosition(w / 2 - vw / 2, h / 2 - vh / 2 - 10);
      this.rainZone.width = vw + 40;
    }

    // Vagalumes entre 20h e 5h, flutuando em volta do jogador.
    const night = minutes >= 20 * 60 || minutes < 5 * 60;
    const t = this.scene.time.now / 1000;
    this.fireflies.forEach((f, i) => {
      f.setVisible(night && !raining);
      if (!f.visible) return;
      if (!f.home || Phaser.Math.Distance.Between(f.home.x, f.home.y, player.x, player.y) > 200) {
        f.home = { x: player.x + Phaser.Math.Between(-140, 140), y: player.y + Phaser.Math.Between(-90, 90) };
      }
      f.setPosition(f.home.x + Math.sin(t * 0.7 + i) * 14, f.home.y + Math.cos(t * 0.5 + i * 1.7) * 9);
      f.setAlpha(0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + i * 0.9)));
    });

    // Poeira nos pés ao correr.
    if (running && (this.dustMs -= dt) <= 0) {
      this.dustMs = 160;
      const d = this.scene.add.sprite(player.x, player.y + 2, 'gm:dust_run_strip8').setOrigin(0.5, 1)
        .setDepth(DEPTH.ysort + player.y - 1).setFlipX(player.parts[0].flipX);
      d.play('fx:dust');
      d.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => d.destroy());
    }
  }
}
