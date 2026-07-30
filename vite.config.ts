import { defineConfig } from 'vite';

export default defineConfig({
  base: '/beard-laws-casino/',
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsInlineLimit: 0,
  },
});
