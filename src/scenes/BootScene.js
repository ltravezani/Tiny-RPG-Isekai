import Phaser from 'phaser';

// Carrega só os manifestos; a PreloadScene usa eles para saber o que baixar.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.json('gmSprites', 'assets/generated/gm/sprites.json');
    this.load.tilemapTiledJSON('vale', 'maps/vale_exemplo.json');
  }

  create() {
    this.scene.start('Preload');
  }
}
