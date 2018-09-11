// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - web-wallet/module.js
// Module to provide the web wallet

// required libraries in this context

// initialization function
function init () {}

// exec
function exec (properties) {
  var source = properties.target.module;
  var command = properties.command;

  var fileName;
  if (command.length === 0) {
    fileName = 'modules/' + source + '/index.html';
  } else {
    switch (command[0]) {
      case 'favicon.ico' :
      case 'index.html' :
        fileName = 'modules/' + source + '/' + command.join('/');
        break;
      default:
        fileName = 'modules/' + source + '/files/' + command.join('/');
        break;
    }
  }

  return {error: 0, data: fileName, type: 'file:text/html', command: command, path: ['source', source].concat(command)};
}

// exports
exports.init = init;
exports.exec = exec;
