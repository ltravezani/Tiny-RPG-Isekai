import fs from 'node:fs';
import { defineConfig } from 'vite';

// assets/ e maps/ ficam na raiz (estrutura do roteiro, seção 12). No dev o Vite já
// serve a raiz; no build copiamos as duas pastas para dist/.
const copyStatic = () => ({
  name: 'copy-static',
  closeBundle() {
    for (const dir of ['assets', 'maps']) fs.cpSync(dir, `dist/${dir}`, { recursive: true });
  },
});

export default defineConfig({
  publicDir: false,
  server: { port: 5173 },
  plugins: [copyStatic()],
  build: { chunkSizeWarningLimit: 2000 }, // o Phaser sozinho passa de 1 MB
});
