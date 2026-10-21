import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',   // barrel re-export
        'src/events.ts',   // type-only
        'src/errors.ts',   // re-exports config
        'src/replay.ts',   // stub
      ],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 85,
        branches: 85,
        functions: 85,
        statements: 85,
      },
    },
  },
});
