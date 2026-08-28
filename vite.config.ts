import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/theme/shenlan/',
  plugins: [react()],
  build: {
    outDir: 'dist/assets',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'app.css' : 'media/[name]-[hash][extname]'
      }
    }
  }
})
