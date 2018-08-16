import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
// import babel from 'rollup-plugin-babel';

export default {
  entry: './../interface.dashboard/js/AssetDashboard/assetDashboard.js',
  dest: './',
  output: {
    file: 'bundle.js',
    format: 'cjs'
  },
  format: 'iife',
  sourceMap: 'inline',
  plugins: [
    // babel({
    //   babelrc: true
    // }),
    resolve({
      jsnext: true,
      browser: true,
      main: true,
      preferBuiltins: false
    }),
    commonjs({
      include: 'node_modules/**'
    })
  ]

};
