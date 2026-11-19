/**
 * Testes unitários da lógica sem UI: cálculo (src/domain), base de dados (src/db,
 * via node:sqlite), backup e partilha. Não carregam React Native.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          module: 'commonjs',
          target: 'es2022',
          isolatedModules: true,
          rootDir: '.',
          types: ['jest'],
        },
      },
    ],
  },
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/db/**/*.ts', 'src/share/**/*.ts', '!src/**/*.test.ts', '!src/db/testDb.ts'],
  coverageThreshold: {
    // O cálculo de preços é a parte crítica da app: exige cobertura quase total.
    './src/domain/': { statements: 95, branches: 90, functions: 100, lines: 95 },
  },
};
