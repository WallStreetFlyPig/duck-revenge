import { cp, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'docs'), { recursive: true });
await cp(path.join(root, 'dist'), path.join(root, 'docs'), { recursive: true });
await writeFile(path.join(root, 'docs', '.nojekyll'), '');
console.log('GitHub Pages files prepared in docs/');
