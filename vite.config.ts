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
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg'],
      manifest: {
        id: 'mozgalica',
        name: 'Mozgalica — matematički kvizovi',
        short_name: 'Mozgalica',
        description: 'Zabavno obnavljanje matematike za 3. razred',
        lang: 'sr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f4f7ff',
        theme_color: '#5b6ee1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Keširamo samo shell aplikacije; Supabase pozivi se NIKAD ne keširaju
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: null,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
