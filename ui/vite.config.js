import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import YAML from 'yaml';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [react(), viteCompression(), viteCompression({ algorithm: 'brotliCompress' })],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:443',
        secure: false,
      },
      '/images': {
        target: 'https://localhost:443',
        secure: false,
      },
    },
  },
  define: {
    ...parseYamlConfigFile(),
  },
});

function parseYamlConfigFile() {
  const config = YAML.parse(fs.readFileSync('../ui-config.yaml', 'utf-8'));
  if (typeof config !== 'object') {
    throw new Error('config.yaml file is not an object');
  }

  const define = {
    'import.meta.env.VITE_CACHESTORAGEVERSION': JSON.stringify(makeid(8)),
  };
  for (const key in config) {
    define[`import.meta.env.VITE_${key.toUpperCase()}`] = JSON.stringify(config[key]);
  }

  console.log(define);
  return define;
}

function makeid(length) {
  let result = '';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = chars.length;
  let counter = 0;
  while (counter < length) {
    result += chars.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
