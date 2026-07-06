// Bulk minify all dist/ JS files - single process for speed
import { transformSync } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const distDirs = [
  'packages/core/dist',
  'packages/cli/dist',
  'packages/studio/dist-server',
];

function walk(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) files.push(...walk(full));
      else files.push(full);
    }
  } catch (e) {}
  return files;
}

let totalJS = 0, totalMaps = 0;
for (const dd of distDirs) {
  const full = join(ROOT, dd);
  const all = walk(full);
  const maps = all.filter(f => f.endsWith('.map'));
  for (const m of maps) { unlinkSync(m); totalMaps++; }
  const js = all.filter(f => f.endsWith('.js'));
  for (const f of js) {
    try {
      const code = readFileSync(f, 'utf-8');
      const result = transformSync(code, {
        minify: true,
        legalComments: 'none',
        target: 'node18',
      });
      writeFileSync(f, result.code);
      totalJS++;
    } catch (e) {
      console.error('FAIL:', relative(ROOT, f), e.message.slice(0, 100));
    }
  }
  console.log(`${dd}: ${js.length} JS minified, ${maps.length} maps removed`);
}
console.log(`\nTotal: ${totalJS} JS minified, ${totalMaps} maps removed`);
