import { defineConfig } from 'steiger'
import fsd from '@feature-sliced/steiger-plugin'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // app — точка сборки (providers/router/layout/styles), а не слайс; публичный API и purpose-naming ей не нужны
    files: ['./src/app/**'],
    rules: { 'fsd/public-api': 'off', 'fsd/segments-by-purpose': 'off' },
  },
])
