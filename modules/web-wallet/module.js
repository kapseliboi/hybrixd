// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - web-wallet/module.js
// Module to provide the web wallet

// exec
function web_wallet (proc) {
  const source = 'web-wallet';
  const command = proc.command;
  command.shift();

  const fileName = command.length === 0
    ? 'modules/' + source + '/files/index.html'
    : 'modules/' + source + '/files/' + command.join('/');

  const mimeTypes = {
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

  const fileNameSplitByDot = fileName.split('.');
  const extension = fileNameSplitByDot[fileNameSplitByDot.length - 1];
  const mimeType = mimeTypes.hasOwnProperty(extension) ? mimeTypes[extension] : 'text/html';

  proc.mime('file:' + mimeType);
  proc.done(fileName.split('?')[0]);
}

function version (proc) {
  proc.done(proc.peek('version'));
}

// exports
exports.web_wallet = web_wallet;
exports.version = version;
