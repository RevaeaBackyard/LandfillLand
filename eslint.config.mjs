import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  astro: true,
  unocss: true,
  ignores: ['src/content/**'],
  rules: {
    'e18e/prefer-static-regex': 'off',
  },
}, {
  // JavaScript uses value references; avoid TypeScript-only reference classification.
  files: ['**/*.{js,mjs,cjs}'],
  rules: {
    'unused-imports/no-unused-vars': 'off',
    'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }],
  },
})
