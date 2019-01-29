// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - web-wallet/module.js
// Module to provide the web wallet

// required libraries in this context
var route = require('../../lib/router');

// initialization function
function init () {}

// exec
function exec (properties) {
  var source = properties.target.module;
  var command = properties.command;

  var request = {sessionID: global.hybrixd.proc[properties.processID.split('.')[0]].sid};
  if (command.length >= 2 && command[0] === 'api' && command[1] === 'v1') {
    request.url = '/' + command.slice(2).join('/');
    return route.route(request);
  } else if (command.length >= 1 && (command[0] === 'api' || command[0] === 'v1')) {
    request.url = '/' + command.slice(1).join('/');
    return route.route(request);
  }

  var fileName;
  if (command.length === 0) {
    fileName = 'modules/' + source + '/files/index.html';
  } else {
    fileName = 'modules/' + source + '/files/' + command.join('/');
  }

  var mimeTypes = {
    css: 'text/css',
    ico: 'image/x-icon',
    js: 'text/javascript',
    json: 'application/json',
    svg: 'image/svg+xml',
    html: 'text/html',
    ttf: 'application/x-font-ttf',
    woff2: 'application/x-font-woff',
    eot: 'application/vnd.ms-fontobject'
  };

  var fileNameSplitByDot = fileName.split('.');
  var extension = fileNameSplitByDot[fileNameSplitByDot.length - 1];
  var mimeType = mimeTypes.hasOwnProperty(extension) ? mimeTypes[extension] : 'text/html';

  return {error: 0, data: fileName, type: 'file:' + mimeType, command: command, path: ['source', source].concat(command)};
}

// exports
exports.init = init;
exports.exec = exec;
