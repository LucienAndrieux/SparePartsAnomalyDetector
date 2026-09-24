import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Netlify Dev proxifie vers ce port précis (voir netlify.toml) :
    // échouer plutôt que basculer silencieusement sur un autre port.
    port: 5173,
    strictPort: true,
  },
  test: {
    // .netlify contient les copies bundlées générées par `netlify dev`.
    exclude: [...configDefaults.exclude, '.netlify/**'],
  },
})
