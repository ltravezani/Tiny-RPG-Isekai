// Publica o build em dist/ na branch gh-pages do GitHub (GitHub Pages).
// O build precisa dos assets locais (npm run setup:assets), por isso roda na sua máquina
// e não no GitHub Actions: o pack não vai para o repositório.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = cmd => execSync(cmd, { cwd: ROOT }).toString().trim();

if (!fs.existsSync(path.join(ROOT, 'maps/vale.json'))) {
  console.error('Rode npm run setup:assets antes de publicar.');
  process.exit(1);
}

const remote = out('git remote get-url origin');
const commit = out('git rev-parse --short HEAD');
run('npm run build');
fs.writeFileSync(path.join(DIST, '.nojekyll'), ''); // o Pages não deve processar o site com Jekyll

fs.rmSync(path.join(DIST, '.git'), { recursive: true, force: true });
run('git init -q -b gh-pages', DIST);
run('git add -A', DIST);
run(`git -c user.name="deploy" -c user.email="deploy@localhost" commit -q -m "Build de ${commit}"`, DIST);
run(`git push -f -q "${remote}" gh-pages`, DIST);
fs.rmSync(path.join(DIST, '.git'), { recursive: true, force: true });
console.log('Publicado na branch gh-pages.');
