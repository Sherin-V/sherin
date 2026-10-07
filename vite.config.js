import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import seoPrerender from './seo-prerender.js'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project repo from /<repo>/; the deploy workflow passes that path in
  base: process.env.BASE_PATH || '/',
  plugins: [react(), seoPrerender()],
})
