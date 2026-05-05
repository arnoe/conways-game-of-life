import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/test-output'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:app',
              onlyDependOnLibsWithTags: [
                'scope:sim',
                'scope:ui',
                'scope:api-client',
                'scope:types',
              ],
            },
            {
              sourceTag: 'scope:server',
              onlyDependOnLibsWithTags: ['scope:sim', 'scope:types'],
            },
            {
              sourceTag: 'scope:api-client',
              onlyDependOnLibsWithTags: ['scope:types'],
            },
            {
              sourceTag: 'scope:ui',
              onlyDependOnLibsWithTags: ['scope:types'],
            },
            {
              sourceTag: 'scope:sim',
              onlyDependOnLibsWithTags: ['scope:types'],
            },
            {
              sourceTag: 'scope:types',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'scope:e2e',
              onlyDependOnLibsWithTags: ['scope:app', 'scope:types'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
