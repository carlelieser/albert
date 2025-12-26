import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['es'],
      fileName: 'main',
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        /^@anthropic-ai/,
      ],
    },
    target: 'node22',
    outDir: 'dist',
  },
})
