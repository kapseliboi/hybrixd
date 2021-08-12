// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - web-wallet/module.js
// Module to provide the web wallet

// exec
function web_wallet (proc) {
  const source = 'web-wallet';
  const command = proc.command.slice(1);

  const fileName = command.length === 0
    ? 'modules/' + source + '/files/index.html'
    : 'modules/' + source + '/files/' + command.join('/');

  proc.serv(fileName);
}

function version (proc) {
  proc.done(proc.peek('version'));
}

// exports
exports.web_wallet = web_wallet;
exports.version = version;
