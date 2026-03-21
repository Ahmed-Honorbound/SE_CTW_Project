import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    pool: 'vmForks',
    server: {
      deps: {
        external: ['@csstools/css-calc', '@asamuzakjp/css-color'],
      },
    },
  },
});
