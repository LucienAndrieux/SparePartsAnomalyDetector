import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Port du serveur Express (npm start), cible du proxy /api en développement.
const apiPort = Number(process.env.PORT) || 3000

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // En dev, le front (Vite) relaie /api vers le serveur Express s'il tourne.
    proxy: {
      '/api': `http://127.0.0.1:${apiPort}`,
    },
  },
})
