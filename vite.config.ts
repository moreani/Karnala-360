import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base keeps the build portable: the repo root, GitHub Pages
  // project sites (/Karnala-360/) and Vercel all resolve the same assets.
  base: './',
  plugins: [react(), tailwindcss()],
})