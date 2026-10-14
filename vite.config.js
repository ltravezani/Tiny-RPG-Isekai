import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

// assets/ e maps/ ficam na raiz (estrutura do roteiro, seção 12). No dev o Vite já
// serve a raiz; no build copiamos para dist/ só o que o jogo carrega, e não o pack
// inteiro (a licença do Sunnyside permite usar no jogo, mas não redistribuir o pack).
const PACK_DIRS = [
  'Characters/Human/IDLE', 'Characters/Human/WALKING', 'Characters/Human/RUN',
  'Characters/Human/DIG', 'Characters/Human/WATERING', 'Characters/Human/DOING',
  'Elements/Crops', 'UI/9slice_box_white',
];
const PACK_UI = ['shovel', 'water', 'plant', 'basket', 'expression_chat', 'expression_love', 'expression_alerted'];
const EXTRA_GM = ['dust_run_strip8'];

function copyGameFiles() {
  const copy = (from, to) => {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true });
  };
  for (const dir of PACK_DIRS) copy(`assets/sunnyside/${dir}`, `dist/assets/sunnyside/${dir}`);
  for (const ui of PACK_UI) copy(`assets/sunnyside/UI/${ui}.png`, `dist/assets/sunnyside/UI/${ui}.png`);
  for (const f of ['tiles16_extruded.png', 'forest16_extruded.png']) copy(`assets/generated/${f}`, `dist/assets/generated/${f}`);

  // Dos sprites do projeto GameMaker, só os que aparecem no mapa.
  const map = JSON.parse(fs.readFileSync('maps/vale.json', 'utf8'));
  const manifest = JSON.parse(fs.readFileSync('assets/generated/gm/sprites.json', 'utf8'));
  const used = new Set([...EXTRA_GM, ...map.layers.filter(l => l.type === 'objectgroup').flatMap(l => l.objects.map(o => o.name))]);
  const usedManifest = {};
  for (const name of used) {
    if (!manifest[name]) continue;
    usedManifest[name] = manifest[name];
    copy(`assets/generated/gm/${name}.png`, `dist/assets/generated/gm/${name}.png`);
  }
  fs.writeFileSync('dist/assets/generated/gm/sprites.json', JSON.stringify(usedManifest));
  copy('maps/vale.json', 'dist/maps/vale.json');
}

export default defineConfig({
  base: './', // caminhos relativos: funciona em https://<usuario>.github.io/<repo>/ e no itch.io
  publicDir: false,
  server: { port: 5173 },
  plugins: [{ name: 'copy-game-files', closeBundle: copyGameFiles }],
  build: { chunkSizeWarningLimit: 2000 }, // o Phaser sozinho passa de 1 MB
});
