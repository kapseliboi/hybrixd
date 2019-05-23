// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - web-wallet/module.js
// Module to provide the web wallet

// exec
function web_blockexplorer (proc) {
  let source = 'web-blockexplorer';
  let command = proc.command;
  proc.sync();
  let fileName = command.length === 0 || command[0].startsWith('?')
    ? 'modules/' + source + '/files/index.html'
    : 'modules/' + source + '/files/' + command.join('/');

  let mimeTypes = {
    css: 'text/css',
    ico: 'image/x-icon',
    js: 'text/javascript',
    json: 'application/json',
    svg: 'image/svg+xml',
    png: 'image/png',
    html: 'text/html',
    ttf: 'application/x-font-ttf',
    woff2: 'application/x-font-woff',
    eot: 'application/vnd.ms-fontobject'
  };

  let fileNameSplitByDot = fileName.split('?')[0].split('.');
  let extension = fileNameSplitByDot[fileNameSplitByDot.length - 1];
  let mimeType = mimeTypes.hasOwnProperty(extension) ? mimeTypes[extension] : 'text/html';

  proc.mime('file:' + mimeType);
  proc.done(fileName);
}

// exports
exports.web_blockexplorer = web_blockexplorer;
