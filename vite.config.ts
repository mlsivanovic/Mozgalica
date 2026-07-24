import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Aplikacija se služi sa GitHub Pages podputanje /Mozgalica/
export default defineConfig({
  base: '/Mozgalica/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Registracija se radi ručno u src/pwa.ts (custom toast obaveštenje) —
      // ne dozvoli pluginu da ubaci sopstveni auto-registracioni skript
      injectRegister: false,
      devOptions: { enabled: false },
      // Manifesti su statički jer admin i dečja aplikacija moraju da imaju različite ID-eve.
      manifest: false,
      injectManifest: {
        // Keširamo samo shell aplikacije; Supabase pozivi se NIKAD ne keširaju
        globPatterns: ['**/*.{js,css,html,webmanifest,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
