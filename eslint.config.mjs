import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-plugin-prettier'
import eslintConfigPrettier from 'eslint-config-prettier'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.js',         // during migration — JS files in old services are not linted yet
      '**/prisma/migrations/**',
      // Generated Prisma clients — build output, git-ignored, and ~254MB of .ts across
      // 14 services (one index.d.ts is 1.1MB). Type-aware linting them exhausted the
      // 4GB V8 heap and made `npm run lint` fail outright rather than slowly.
      '**/generated/**',
    ],
  },

  // TypeScript files across all services
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      // Prettier formatting as ESLint errors
      'prettier/prettier': 'error',

      // TypeScript — enforce good habits from the .NET world
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      // `null: 'ignore'` permits the deliberate `x != null` idiom, which means
      // "neither null nor undefined". Rewriting those as `!== null` would let
      // undefined through — a real behaviour change. Strict equality is still
      // required everywhere else.
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      ...eslintConfigPrettier.rules,
    },
  },
  // Test files: linted WITHOUT type-aware rules.
  //
  // Each service's tsconfig includes only src/**, so test/** belongs to no
  // TypeScript project and `project: true` fails with a parsing error. That made
  // every spec file unlintable — which mattered once CI started gating on the
  // files a PR touches: any PR containing a test would fail lint for a config
  // reason, not a code one.
  //
  // Adding test/** to the build tsconfig would make `nest build` compile tests
  // into dist. Turning off type-aware parsing here keeps formatting and syntax
  // rules working, and only loses rules that need type information.
  {
    files: ['**/test/**/*.ts', '**/*.spec.ts', '**/*.test.ts', '**/vitest.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', project: false },
    },
    plugins: { '@typescript-eslint': tseslint, prettier },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Rules that need type information cannot run without a project.
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },
]
