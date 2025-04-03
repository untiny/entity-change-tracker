import antfu from '@antfu/eslint-config'

export default antfu({
  stylistic: {
    indent: 2,
    quotes: 'single',
  },
  typescript: true,
  type: 'lib',
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
})
