import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  root: '.',
  build: {
    outDir: 'dist-v2',
    rollupOptions: {
      input: 'index-v2.html',
    },
  },
  server: {
    port: 3001,
    open: '/index-v2.html',
  },
});
