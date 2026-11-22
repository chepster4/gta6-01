// PALMIRA BAY — Streets of the Sun (gta6-01, Node 22, stdlib only).
// Hands the entry in: copies game/ and screenshots/ beside this file
// into /output (or $MAKEFUN_OUTPUT_DIR) and writes dossier.json with
// the vendored make.fun library.
//
// Play it locally first: `node serve.ts`, then http://localhost:8080.
// Build the hand-in bundle: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Scorer caps (reference/gate.json): text_max_bytes shapes the dossier
// bytes; the rest refuse an entry the scorer would refuse — more than
// 4 screenshots, one over 256 KiB, more than 993 files / 48 MiB in
// game/, or a game/ path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`dossier written to ${join(out, 'dossier.json')}`);
