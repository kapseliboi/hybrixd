const path = require('path');

module.exports = {
  entry: './interface.dashboard/interface.dashboard.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './interface.dashboard/dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        }
      }
    ]
  }
};
