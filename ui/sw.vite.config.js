import { defineConfig } from 'vite';
import precompress from './vite-precompress.ts';

export default defineConfig({
  manifest: true,
  plugins: [precompress()],
  build: {
    outDir: 'dist-sw',
    // Keep this in sync with vite.config.ts.
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    rolldownOptions: {
      input: './service-worker.js',
      output: {
        entryFileNames: '[name].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  define: {
    'import.meta.env.VITE_SW_BUILD_ID': JSON.stringify(makeid(8)),
  },
});

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
