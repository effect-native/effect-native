import nkzw from '@nkzw/eslint-config'
import fbtee from '@nkzw/eslint-plugin-fbtee'
import rootConfig from '../../eslint.config.mjs'

// Deduplicate plugin definitions across layered flat configs to avoid
// "Cannot redefine plugin" errors when combining nkzw + root.
const seenPlugins = new Set()
const stripDuplicatePlugins = (cfg) => {
  if (cfg && cfg.plugins) {
    const entries = Object.entries(cfg.plugins).filter(([name]) => {
      if (seenPlugins.has(name)) return false
      seenPlugins.add(name)
      return true
    })
    return { ...cfg, plugins: Object.fromEntries(entries) }
  }
  return cfg
}

const layered = [
  ...rootConfig.map(stripDuplicatePlugins),
  ...nkzw.map(stripDuplicatePlugins),
  ...(Array.isArray(fbtee.configs.strict)
    ? fbtee.configs.strict.map(stripDuplicatePlugins)
    : [stripDuplicatePlugins(fbtee.configs.strict)])
]

export default [
  ...layered,
  {
    ignores: [
      '__generated__',
      '.expo',
      'android/',
      'ios/',
      'dist/',
      'web-build/',
      'vite.config.ts.timestamp-*'
    ]
  },
  {
    files: ['scripts/**/*.tsx'],
    rules: {
      'no-console': 0
    }
  },
  {
    files: ['metro.config.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 0
    }
  },
  {
    rules: {
      '@nkzw/fbtee/no-untranslated-strings': 0,
      '@typescript-eslint/array-type': [2, { default: 'generic' }],
      '@typescript-eslint/no-restricted-imports': [
        2,
        {
          paths: [
            {
              importNames: ['Text'],
              message:
                'Please use the corresponding UI components from `src/ui/` instead.',
              name: 'react-native'
            },
            {
              importNames: ['ScrollView'],
              message:
                'Please use the corresponding UI component from `react-native-gesture-handler` instead.',
              name: 'react-native'
            },
            {
              importNames: ['BottomSheetModal'],
              message:
                'Please use the corresponding UI components from `src/ui/` instead.',
              name: '@gorhom/bottom-sheet'
            }
          ]
        }
      ],
      'import-x/no-extraneous-dependencies': [
        2,
        {
          devDependencies: [
            './eslint.config.mjs',
            './scripts/**.tsx',
            './tailwind.config.ts',
            './vitest.config.js',
            '**/*.test.tsx'
          ]
        }
      ]
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: './tsconfig.json'
        }
      }
    }
  }
]
