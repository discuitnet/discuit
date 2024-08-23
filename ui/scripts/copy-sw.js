import fs from 'fs';
import path from 'path';

const rootPath = path.join(import.meta.dirname, '../');

fs.cpSync(path.join(rootPath, 'dist-sw'), path.join(rootPath, 'dist'), { recursive: true });

fs.rmSync(path.join(rootPath, 'dist-sw'), { recursive: true, force: true });
