import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  manifest: true,
  plugins: [viteCompression(), viteCompression({ algorithm: 'brotliCompress' })],
  build: {
    outDir: 'dist-sw',
    rollupOptions: {
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
