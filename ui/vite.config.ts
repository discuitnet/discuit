/* eslint-disable no-undef */
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import YAML from 'yaml';
import { hostnameToURL } from './src/helper';

const { define: yamlConfigDefine, config: yamlConfig } = parseYamlConfigFile();

const proxyAddr = hostnameToURL(process.env.VITE_DEV_PROXY ?? yamlConfig.addr);

export default defineConfig({
  plugins: [react(), viteCompression(), viteCompression({ algorithm: 'brotliCompress' })],
  server: {
    proxy: {
      '/api': {
        target: proxyAddr,
        secure: false,
      },
      '/images': {
        target: proxyAddr,
        secure: false,
      },
    },
  },
  build: {
    emptyOutDir: false,
  },
  define: yamlConfigDefine,
});

/**
 * AppConfig contains a subset of the config values in the config.yaml file.
 *
 */
interface AppConfig {
  addr: string;
  siteName: string;
  captchaSiteKey: string;
  emailContact: string;
  facebookURL: string;
  twitterURL: string;
  instagramURL: string;
  discordURL: string;
  githubURL: string;
  substackURL: string;
  disableImagePosts: boolean;
  disableForumCreation: boolean;
  forumCreationReqPoints: number;
  defaultFeedSort: string;
  maxImagesPerPost: number;
}

function parseYamlConfigFile(): { define: { [index: string]: string }; config: AppConfig } {
  const configFile = YAML.parse(fs.readFileSync('../ui-config.yaml', 'utf-8'));
  if (typeof configFile !== 'object') {
    throw new Error('config.yaml file is not an object');
  }

  const config: AppConfig = {
    addr: configFile.addr,
    siteName: configFile.siteName,
    captchaSiteKey: configFile.captchaSiteKey,
    emailContact: configFile.emailContact,
    facebookURL: configFile.facebookURL,
    twitterURL: configFile.twitterURL,
    instagramURL: configFile.instagramURL,
    discordURL: configFile.discordURL,
    githubURL: configFile.githubURL,
    substackURL: configFile.substackURL,
    disableImagePosts: configFile.disableImagePosts,
    disableForumCreation: configFile.disableForumCreation,
    forumCreationReqPoints: configFile.forumCreationReqPoints,
    defaultFeedSort: configFile.defaultFeedSort,
    maxImagesPerPost: configFile.maxImagesPerPost,
  };

  const define: { [key: string]: string } = {};
  for (const key in config) {
    if (Object.keys(config).includes(key)) {
      define[`import.meta.env.VITE_${key.toUpperCase()}`] = JSON.stringify(
        config[key as keyof typeof config]
      );
    }
  }

  return { define, config };
}
