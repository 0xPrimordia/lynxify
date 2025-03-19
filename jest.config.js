module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: [
    '<rootDir>/src/tests/setup.js',
    '<rootDir>/src/tests/hardhat/setup.js'
  ],
  moduleNameMapper: {
    '^next/font/google$': '<rootDir>/src/app/__mocks__/next/font/google.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@hashgraph/hedera-wallet-connect$': '<rootDir>/src/app/__mocks__/@hashgraph/hedera-wallet-connect.js'
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true
        },
        transform: {
          react: {
            runtime: 'automatic'
          }
        },
        target: 'es2020'
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@hashgraph/hedera-wallet-connect)/)'
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  maxWorkers: 1,
  testTimeout: 30000,
  verbose: true,
  workerIdleMemoryLimit: '512MB',
  maxConcurrency: 1,
  forceExit: true,
  detectOpenHandles: true
}; 