/* eslint-disable no-undef */
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import YAML from 'yaml';

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
  define: yamlConfigDefine,
});

function parseYamlConfigFile() {
  const config = YAML.parse(fs.readFileSync('../ui-config.yaml', 'utf-8'));
  if (typeof config !== 'object') {
    throw new Error('config.yaml file is not an object');
  }

  const allowedKeys = [
    'addr',
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

  const define = {},
    retConfig = {};
  for (const key in config) {
    if (allowedKeys.includes(key)) {
      define[`import.meta.env.VITE_${key.toUpperCase()}`] = JSON.stringify(config[key]);
      retConfig[key] = config[key];
    }
  }

  return { define, config: retConfig };
}

/**
 * Takes in a string of the form 'host:port' and returns a full URL. Either the
 * 'host' part or the 'port' could be ommitted, but not both.
 *
 * @param {string} addr - Either a full URL or a partial URL of the form 'host:port'.
 * @returns {string}
 */
function hostnameToURL(addr) {
  let scheme, hostname, port;

  let n = addr.indexOf('://');
  if (n !== -1) {
    scheme = addr.substring(0, n);
    addr = addr.substring(n + 3);
    if (!(scheme === 'http' || scheme === 'https')) {
      throw new Error(`unknown scheme: ${scheme}`);
    }
  }

  n = addr.indexOf(':');
  if (n !== -1) {
    hostname = addr.substring(0, n);
    port = addr.substring(n);
    const portErr = new Error('port is not a number');
    if (port.length === 1) {
      throw portErr;
    }
    port = port.substring(1);
    if (isNaN(parseInt(port.substring(1), 10))) {
      throw portErr;
    }
  } else {
    hostname = addr;
  }

  if (!hostname && !port) {
    throw new Error('empty address');
  }

  if (!hostname) {
    hostname = 'localhost';
  }

  if (!scheme) {
    scheme = port === '443' ? 'https' : 'http';
  }

  let portString = '';
  if (port && !((scheme === 'http' && port === '80') || (scheme === 'https' && port === '443'))) {
    portString = `:${port}`;
  }
  return `${scheme}://${hostname}${portString}`;
}
