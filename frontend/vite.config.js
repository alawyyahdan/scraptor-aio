import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Hostnames behind reverse proxy / DNS (Host header). ".bica.ca" matches subdomains.
const allowedHosts = ['scraptor.bica.ca', '.bica.ca']

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
    host: true,
    port: 3009,
    strictPort: true,
    allowedHosts,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3008',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 3009,
    strictPort: true,
    allowedHosts,
  },
})
