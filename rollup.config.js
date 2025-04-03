// rollup.config.js
export default [
  {
    input: 'node_modules/jsondiffpatch/lib/index.js',
    output: { file: 'jsondiffpatch.cjs.js', format: 'cjs' },
  },
]
