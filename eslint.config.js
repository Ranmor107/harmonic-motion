import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'artifacts/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['src/domain/**', 'src/engine/**', 'src/playback/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['react', 'react-dom', 'three', '@react-three/*', 'tone', '**/visual/**', '**/render/**', '**/state/**'],
      }],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Use a seeded PRNG.' }],
    },
  },
)
