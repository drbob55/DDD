const { build } = require('esbuild');
const { dependencies = {}, peerDependencies = {} } = require('./package.json');

const external = [
  ...Object.keys(dependencies),
  ...Object.keys(peerDependencies),
];

// Build CommonJS
build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: false,
  sourcemap: true,
  target: ['es2020'],
  format: 'cjs',
  outfile: 'dist/index.js',
  external,
}).catch(() => process.exit(1));

// Build ESM
build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: false,
  sourcemap: true,
  target: ['es2020'],
  format: 'esm',
  outfile: 'dist/index.mjs',
  external,
}).catch(() => process.exit(1));
