import Phaser from 'phaser';
import crops from '../data/crops.json';
import { recolorSpritesheet, RECOLOR } from '../systems/Palette.js';

export const PACK = 'assets/sunnyside';
const GM = 'assets/generated/gm';

// Animações do humano usadas pelo jogador: [pasta do pack, sufixo do arquivo, quadros, fps, repete]
export const HUMAN_ANIMS = {
  idle: ['IDLE', 'idle_strip9', 9, 10, true],
  walk: ['WALKING', 'walk_strip8', 8, 12, true],
  run: ['RUN', 'run_strip8', 8, 14, true],
  dig: ['DIG', 'dig_strip13', 13, 22, false],
  water: ['WATERING', 'watering_strip5', 5, 8, false],
  doing: ['DOING', 'doing_strip8', 8, 16, false],
};
export const HUMAN_LAYERS = ['base', 'shorthair', 'tools'];
// Penteados extras carregados só para os aldeões (animação idle).
export const VILLAGER_HAIR = ['longhair'];

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2 - 100, height / 2, 0, 8, 0xf2d16b).setOrigin(0, 0.5);
    this.add.text(width / 2, height / 2 - 20, 'Raízes de Solária', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5);
    this.load.on('progress', p => { bar.width = 200 * p; });

    this.load.image('tiles16', `${PACK}/Tileset/spr_tileset_sunnysideworld_16px.png`);
    this.load.image('tilesForest', `${PACK}/Tileset/spr_tileset_sunnysideworld_forest_32px.png`);

    // Sprites colocados no mapa de exemplo (tiras geradas do projeto GameMaker).
    const gm = this.cache.json.get('gmSprites');
    const map = this.cache.tilemap.get('vale').data;
    const used = new Set(map.layers.filter(l => l.type === 'objectgroup').flatMap(l => l.objects.map(o => o.name)));
    for (const name of used) {
      const s = gm[name];
      if (s) this.load.spritesheet(`gm:${name}`, `${GM}/${name}.png`, { frameWidth: s.w, frameHeight: s.h });
    }

    for (const [key, [dir, suffix]] of Object.entries(HUMAN_ANIMS)) {
      for (const layer of HUMAN_LAYERS) {
        this.load.spritesheet(`human:${layer}:${key}`, `${PACK}/Characters/Human/${dir}/${layer}_${suffix}.png`, { frameWidth: 96, frameHeight: 64 });
      }
    }

    for (const hair of VILLAGER_HAIR) {
      this.load.spritesheet(`human:${hair}:idle`, `${PACK}/Characters/Human/IDLE/${hair}_idle_strip9.png`, { frameWidth: 96, frameHeight: 64 });
    }

    for (const c of crops) {
      for (let i = 0; i <= 5; i++) this.load.image(`crop:${c.sprite}:${i}`, `${PACK}/Elements/Crops/${c.sprite}_0${i}.png`);
    }
    for (const s of ['soil_00', 'soil_01', 'soil_03', 'soil_04', 'crate_base', 'crate_top']) this.load.image(s, `${PACK}/Elements/Crops/${s}.png`);
    for (const ui of ['shovel', 'water', 'plant', 'basket']) this.load.image(`ui:${ui}`, `${PACK}/UI/${ui}.png`);
  }

  create() {
    const gm = this.cache.json.get('gmSprites');
    for (const key of this.textures.getTextureKeys()) {
      if (!key.startsWith('gm:')) continue;
      const s = gm[key.slice(3)];
      if (s.frames > 1) this.anims.create({ key, frames: this.anims.generateFrameNumbers(key), frameRate: s.fps, repeat: -1 });
    }
    for (const [key, [, , , fps, loop]] of Object.entries(HUMAN_ANIMS)) {
      for (const layer of HUMAN_LAYERS) {
        const tex = `human:${layer}:${key}`;
        this.anims.create({ key: tex, frames: this.anims.generateFrameNumbers(tex), frameRate: fps, repeat: loop ? -1 : 0 });
      }
    }
    // Versão grisalha dos penteados, para a Vovó Tereza e outros aldeões mais velhos.
    for (const hair of VILLAGER_HAIR) {
      recolorSpritesheet(this, `human:${hair}:idle`, `human:${hair}_grey:idle`, RECOLOR.grey, { frameWidth: 96, frameHeight: 64 });
      for (const tex of [`human:${hair}:idle`, `human:${hair}_grey:idle`]) {
        this.anims.create({ key: tex, frames: this.anims.generateFrameNumbers(tex), frameRate: 10, repeat: -1 });
      }
    }
    this.scene.start('Village');
  }
}
