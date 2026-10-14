import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { VillageScene } from './scenes/VillageScene.js';
import { UIScene } from './scenes/UIScene.js';

// Resolução interna pequena + zoom inteiro, como pede o roteiro (seção 11).
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#3d7fb8',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 320, height: 180 },
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, PreloadScene, VillageScene, UIScene],
});

window.__game = game;
