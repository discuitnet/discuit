import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootPath = path.resolve(import.meta.dirname, '../..');

// Fail here so a broken backend can't leave the build using old config.
const yaml = execFileSync(path.join(rootPath, 'discuit'), ['inject-config'], {
  cwd: rootPath,
  encoding: 'utf8',
});
fs.writeFileSync(path.join(rootPath, 'ui-config.yaml'), yaml);
console.log('ui-config.yaml has been written');
