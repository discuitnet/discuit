import react from '@vitejs/plugin-react';
import fs from 'fs';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import YAML from 'yaml';

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

  const allowedKeys = [
    'siteName',
    'captchaSiteKey',
    'emailContact',
    'facebookURL',
    'twitterURL',
    'instagramURL',
    'discordURL',
    'githubURL',
    'substackURL',
    'disableImagePosts',
    'disableForumCreation',
    'forumCreationReqPoints',
    'defaultFeedSort',
    'maxImagesPerPost',
  ];

  const define = {};
  for (const key in config) {
    if (allowedKeys.includes(key)) {
      define[`import.meta.env.VITE_${key.toUpperCase()}`] = JSON.stringify(config[key]);
    }
  }

  return define;
}
