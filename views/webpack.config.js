const path = require('path');

module.exports = {
  entry: './interface/interface.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './interface/dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        // exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        }
      }
      // {
      //   test: /.js/,
      //   use: [
      //     {
      //       loader: `expose-loader`
      //       // options: {...options}
      //     }
      //   ]
      // }
    ]
  },
  mode: 'production'
};
