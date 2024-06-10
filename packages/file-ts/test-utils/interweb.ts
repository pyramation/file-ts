import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { fs } from '../src';

export const fixturesDir = '__fixtures__/interweb';

export function setup(_p: string = fixturesDir) {
  const p = relative(fixturesDir, _p) || '/';
  const stats = statSync(_p);

  if (!stats.isDirectory()) {
    fs.writeFileSync(p, readFileSync(_p));
    return;
  }

  if (p != '/') {
    fs.mkdirSync(p);
  }
  for (const file of readdirSync(_p)) {
    setup(join(_p, file));
  }
}

export { fs };
