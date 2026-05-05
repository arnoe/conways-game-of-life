import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  // Per Story 2.1 (architecture §9 R2, project-context rule #4): libs/sim is
  // a pure simulation core. The @nx/enforce-module-boundaries rule covers
  // workspace libs but does not catch external npm packages like react/next
  // or DOM globals. This block bans them outright at the per-lib level.
  // Spec files are exempt — Jest helpers occasionally reference globals that
  // look restricted but are harmless in test scope.
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'libs/sim is pure — no React imports allowed.',
            },
            {
              name: 'react-dom',
              message: 'libs/sim is pure — no React DOM imports allowed.',
            },
          ],
          patterns: [
            {
              group: ['next', 'next/*'],
              message: 'libs/sim is pure — no Next.js imports allowed.',
            },
            {
              group: ['@nestjs/*'],
              message: 'libs/sim is pure — no NestJS imports allowed.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'libs/sim is pure — no network I/O allowed.',
        },
        {
          name: 'window',
          message: 'libs/sim is pure — no DOM globals allowed.',
        },
        {
          name: 'document',
          message: 'libs/sim is pure — no DOM globals allowed.',
        },
      ],
    },
  },
  {
    ignores: ['**/out-tsc'],
  },
];
