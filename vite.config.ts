import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — приложение работает из любой подпапки (например, GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
});
