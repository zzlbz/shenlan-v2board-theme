import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'standalone' ? './' : '/theme/shenlan/',
  publicDir: mode === 'standalone' ? 'standalone' : false,
  plugins: [react(), {
    name: 'standalone-runtime-config',
    transformIndexHtml(html) {
      return mode === 'standalone' ? html.replace('</head>', '  <script src="./env.js"></script>\n  </head>') : html
    }
  }],
  build: {
    outDir: mode === 'standalone' ? 'dist/standalone' : 'dist/assets',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: mode === 'standalone' ? 'assets/app-[hash].js' : 'app.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? (mode === 'standalone' ? 'assets/app-[hash].css' : 'app.css') : 'media/[name]-[hash][extname]'
      }
    }
  }
}))
