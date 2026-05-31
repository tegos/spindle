import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Builds the examples/ folder as a static site for GitHub Pages.
// Served under https://tegos.github.io/spindle/ — hence the base path.
export default defineConfig({
  root: resolve(__dirname, 'examples'),
  base: '/spindle/',
  build: {
    outDir: resolve(__dirname, 'site-dist'),
    emptyOutDir: true,
  },
})
