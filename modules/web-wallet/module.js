// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - web-wallet/module.js
// Module to provide the web wallet

// required libraries in this context
let route = require('../../lib/router/router');

// initialization function
function init () {}

// exec
function exec (properties) {
  let source = properties.target.module;
  let command = properties.command;
  let fileName = command.length === 0
    ? 'modules/' + source + '/files/index.html'
    : 'modules/' + source + '/files/' + command.join('/');

  let request = {
    sessionID: global.hybrixd.proc[properties.processID.split('.')[0]].sid
  };

  let mimeTypes = {
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

  let fileNameSplitByDot = fileName.split('.');
  let extension = fileNameSplitByDot[fileNameSplitByDot.length - 1];
  let mimeType = mimeTypes.hasOwnProperty(extension) ? mimeTypes[extension] : 'text/html';

  if (command.length >= 2 && command[0] === 'api' && command[1] === 'v1') {
    request.url = '/' + command.slice(2).join('/');
    return route.route(request);
  } else if (command.length >= 1 && (command[0] === 'api' || command[0] === 'v1')) {
    request.url = '/' + command.slice(1).join('/');
    return route.route(request);
  }

  return {
    error: 0,
    data: fileName,
    type: 'file:' + mimeType,
    command: command,
    path: ['source', source].concat(command)
  };
}

// exports
exports.init = init;
exports.exec = exec;
