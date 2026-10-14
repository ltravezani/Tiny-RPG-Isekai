import { DEPTH } from '../config.js';

// O pack não tem quadro de avisos; este é desenhado em pixel art com a paleta da madeira do tileset.
const PIXELS = [
  '....................',
  '.DDDDDDDDDDDDDDDDDD.',
  '.DMMMMMMMMMMMMMMMMD.',
  '.DMPPPMMPPPPMMPPPMD.',
  '.DMPLPMMPLLPMMPLPMD.',
  '.DMPPPMMPPPPMMPPPMD.',
  '.DMPLPMMPLLPMMPPPMD.',
  '.DMPPPMMPPPPMMPLPMD.',
  '.DMMMMMMMMMMMMPPPMD.',
  '.DMMRMMMMMMMMMMMMMD.',
  '.DDDDDDDDDDDDDDDDDD.',
  '...DL..........DL...',
  '...DL..........DL...',
  '...DL..........DL...',
  '...DL..........DL...',
  '..DDLL........DDLL..',
];
const COLORS = { D: 0x6b3f2a, M: 0xb87a4b, L: 0xe2b77f, P: 0xf6edd3, R: 0xd9573b };

export function createQuestBoardTexture(scene) {
  if (scene.textures.exists('questBoard')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  PIXELS.forEach((row, y) => [...row].forEach((c, x) => {
    if (COLORS[c] === undefined) return;
    g.fillStyle(COLORS[c]).fillRect(x, y, 1, 1);
  }));
  g.generateTexture('questBoard', PIXELS[0].length, PIXELS.length);
  g.destroy();
}

export function placeQuestBoard(scene, tileX, tileY, tileSize = 16) {
  createQuestBoardTexture(scene);
  const x = tileX * tileSize + tileSize / 2, y = tileY * tileSize + tileSize;
  return scene.add.image(x, y - 1, 'questBoard').setOrigin(0.5, 1).setDepth(DEPTH.ysort + y);
}
