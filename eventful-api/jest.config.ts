import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': { tsconfig: './tsconfig.test.json' },
  },
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    // Mock external I/O — must come before the @/ catch-all
    '^@/lib/redis$':   '<rootDir>/tests/__mocks__/redis.mock.ts',
    '^@/lib/tranzak$': '<rootDir>/tests/__mocks__/tranzak.mock.ts',
    '^bullmq$':        '<rootDir>/tests/__mocks__/bullmq.mock.ts',
    // Path alias (mirrors tsconfig paths)
    '^@/(.*)$':        '<rootDir>/src/$1',
  },
  // Loads .env.test before any module is imported — dotenv/config in env.ts
  // then sees vars already set and does NOT overwrite them.
  setupFiles: ['<rootDir>/tests/setup.env.ts'],
  testTimeout: 30000,
  clearMocks: true,
  // Serial execution — tests share a hosted Neon DB
  maxWorkers: 1,
};

export default config;
