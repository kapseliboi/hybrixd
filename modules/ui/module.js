// (C) 2020 hybrix Rouke Pouw
// ui module
// Module to provide the user interface

const fs = require('fs');

// exec
function ui (proc) {
  const source = 'ui';
  const command = proc.command;
  command.shift();

  let fileName = command.length === 0 || command[0].startsWith('?')
    ? 'modules/' + source + '/files/index.html'
    : 'modules/' + source + '/files/' + command.join('/');

  const mimeTypes = {
    css: 'text/css',
    ico: 'image/x-icon',
    js: 'text/javascript',
    json: 'application/json',
    svg: 'image/svg+xml',
    png: 'image/png',
    html: 'text/html',
    ttf: 'application/x-font-ttf',
    woff2: 'application/x-font-woff',
    eot: 'application/vnd.ms-fontobject',
    txt: 'text/plain',
    xml: 'application/xml'
  };

  fileName = fileName.split('?')[0];
  if (!fs.existsSync('../' + fileName)) { // as 404  redirect to main
    fileName = 'modules/' + source + '/files/index.html';
  }

  const fileNameSplitByDot = fileName.split('.');
  const extension = fileNameSplitByDot[fileNameSplitByDot.length - 1];
  const mimeType = mimeTypes.hasOwnProperty(extension) ? mimeTypes[extension] : 'text/html';

  proc.mime('file:' + mimeType);
  proc.done(fileName);
}

// exports
exports.ui = ui;
