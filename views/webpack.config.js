const path = require('path');

module.exports = {
  entry: {
    'login': './login/login.js',
    'interface': './interface/interface.js',
    'interface.dashboard': './interface.dashboard/interface.dashboard.js',
    'interface.assets': './interface.assets/interface.assets.js'
  },
  output: {
    path: path.resolve(__dirname),
    filename: '[name]/dist/bundle.js'
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
