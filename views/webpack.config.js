const path = require('path');

module.exports = {
  entry: './interface.dashboard/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './interface.dashboard/dist')
  }
};
