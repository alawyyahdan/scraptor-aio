import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  envDir: '../',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    /** Produksi: tanpa source map agar struktur sumber tidak terlalu mudah di-debug orang lain. */
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    port: 3009,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3008',
        changeOrigin: true,
      },
    },
  },
})
