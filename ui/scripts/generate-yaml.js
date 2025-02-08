import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.join(__dirname, '../../');


// Run the command to get the config
(async () => {
  await exec('./discuit inject-config', { cwd: '../' }, async (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }

    // Make ui-config.yaml
    await fs.writeFile(path.join(rootPath, 'ui-config.yaml'), stdout, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('ui-config.yaml has been written');
      }
    });
  });
})();
