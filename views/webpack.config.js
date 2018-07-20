const path = require('path');

module.exports = {
  entry: './login/login.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './login/dist')
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
