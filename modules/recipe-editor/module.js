// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - web-wallet/module.js
// Module to provide the web wallet

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
  eot: 'application/vnd.ms-fontobject'
};

function recipe_editor (proc, data) {
  const command = proc.command;
  const source = 'recipe-editor';
  command.shift();

  let fileName = command.length === 0 || command[0].startsWith('?')
    ? 'modules/' + source + '/files/index.html'
    : 'modules/' + source + '/files/' + command.join('/');

  fileName = fileName.split('?')[0];

  const fileNameSplitByDot = fileName.split('.');
  const extension = fileNameSplitByDot[fileNameSplitByDot.length - 1];
  const mimeType = mimeTypes.hasOwnProperty(extension) ? mimeTypes[extension] : 'text/html';

  proc.mime('file:' + mimeType);
  proc.done(fileName);
}

// exports

exports.recipe_editor = recipe_editor;
