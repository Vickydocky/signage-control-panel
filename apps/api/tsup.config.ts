import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  // @signage/shared dikirim sebagai source TS, jadi harus di-bundle ke output
  noExternal: ['@signage/shared'],
});
