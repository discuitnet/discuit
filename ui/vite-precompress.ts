import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import type { Logger, Plugin } from 'vite';

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

const compressible = /\.(js|mjs|json|css|html)$/i;
const minSize = 1025; // bytes

/** Writes .gz and .br copies of the build output. */
export default function precompress(): Plugin {
  let outDir = '';
  let logger: Logger | undefined;
  return {
    name: 'discuit:precompress',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      logger = config.logger;
    },
    async closeBundle(error) {
      // A failed build might not have an outDir.
      if (error || !existsSync(outDir)) return;
      const entries = await fs.readdir(outDir, { recursive: true, withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile() && compressible.test(entry.name))
        .map((entry) => path.join(entry.parentPath, entry.name));
      let count = 0;
      await Promise.all(
        files.map(async (file) => {
          const content = await fs.readFile(file);
          if (content.byteLength < minSize) return;
          count++;
          const [gz, br] = await Promise.all([
            gzip(content, { level: zlib.constants.Z_BEST_COMPRESSION }),
            brotliCompress(content, {
              params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
                [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
              },
            }),
          ]);
          await Promise.all([fs.writeFile(`${file}.gz`, gz), fs.writeFile(`${file}.br`, br)]);
        })
      );
      logger?.info(`precompress: wrote .gz and .br for ${count} files in ${outDir}`);
    },
  };
}
