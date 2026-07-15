import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '.nuxt/**',
      '.output/**',
      'components/ui/**',
    ],
  },

  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),

  {
    ...pluginVitest.configs.recommended,
    files: ['tests/unit/**/*.{spec,test}.ts'],
  },

  {
    // Nuxt route files are single-word by convention (index.vue, [id].vue, ...)
    name: 'app/nuxt-pages',
    files: ['pages/**/*.vue', 'layouts/**/*.vue', 'app.vue', 'error.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  skipFormatting,
]
