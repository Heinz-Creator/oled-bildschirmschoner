import { build } from 'esbuild';
import { access } from 'node:fs/promises';
import { AMBIENT_OCCASIONS, AMBIENT_WORLD_IDS } from './src/ambient-data.js';

const seasons = ['spring','summer','autumn','winter'];
for (const theme of AMBIENT_WORLD_IDS) {
  for (const occasion of [...seasons, ...AMBIENT_OCCASIONS.map(entry => entry.id)]) {
    for (const time of ['morning', 'evening']) {
      const name = (theme === 'tree' ? '' : theme + '-') + occasion + '-' + time;
      await access(new URL('./dist/' + name + '.webp', import.meta.url));
    }
  }
}
await access(new URL('./dist/torn-paper.webp', import.meta.url));
await build({
  entryPoints: ['src/card.js'],
  outfile: 'dist/oled-bildschirmschoner.js',
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['chrome100','safari15','firefox102'],
  legalComments: 'inline',
});
