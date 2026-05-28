/**
 * ESLint 9 flat config — SuiteScript (AMD/script) + test files.
 * @author Wichit Wongta
 */
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,

  // SuiteScript source — AMD modules (not ES modules)
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: 'script',
      globals: {
        define: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Test files — CommonJS + Jest globals
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      'no-var': 'error',
    },
  },

  {
    ignores: ['node_modules/', 'coverage/', 'playwright-report/', 'guide-output/'],
  },
];
