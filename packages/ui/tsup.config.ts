import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  splitting: false,
  sourcemap: false,
  clean: true,
  external: [
    'react',
    'react-dom',
    'next-auth',
    'next-auth/react',
    'three',
    'three/examples/jsm/controls/OrbitControls',
    'three/examples/jsm/loaders/STLLoader',
    'three/examples/jsm/loaders/OBJLoader',
    'three/examples/jsm/loaders/PLYLoader',
    '@dental/shared'
  ]
})
