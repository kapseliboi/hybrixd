// (C) 2020 hybrix / Rouke Pouw

function serve (proc) {
  const source = 'resources';
  const command = proc.command;
  command.shift();
  const path = command.join('/');
  let fileName;

  if (path === 'hybrix-lib.web.js' || path === 'hybrix-lib.node.js') fileName = 'interface/' + path;
  else fileName = 'modules/' + source + '/files/' + path;

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

exports.serve = serve;
