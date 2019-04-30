// (C) 2018 Internet of Coins / Rouke Pouw
// swap module
const router = require('../../lib/router/router');
let Hybrix = require('../../interface/hybrix-lib.nodejs.js');

let rout = query => {
  const request = {url: query, sessionID: 0};
  const result = JSON.stringify(router.route(request));
  return result;
};

let hybrix = new Hybrix.Interface({local: {rout}});

// exports
exports.init = init;
exports.request = request;
exports.register = register;
exports.list = list;
exports.public_ = public_;
exports.sum = sum;

// initialization function
function init () {
  hybrix.sequential(['init',
    {host: 'http://localhost:8080/api'}, 'addHost'
  ],
  () => {}, () => {}); // TODO init also needs a proper proc
}

function request (proc) {
  const symbol = proc.command[1];

  hybrix.sequential(['createAccount', 'session',
    {
      publicKey: {data: {symbol}, step: 'getPublicKey'},
      privateKey: {data: {symbol}, step: 'getPrivateKey'}
    }, 'parallel',
    keyPair => { proc.poke('local::keyPairs[' + keyPair.publicKey + ']', {privateKey: keyPair.privateKey, time: Date.now()}); return keyPair.publicKey; }
  ],
  proc.done, proc.fail, proc.prog);
}

function public_ (proc) {
  const symbol = proc.command[1];
  hybrix.sequential([{username: global.hybrixd.node.publicKey, password: global.hybrixd.node.privateKey}, 'session',
    {symbol}, 'getPublicKey'
  ],
  proc.done, proc.fail, proc.prog);
}

// sum provided public keys
function sum (proc) {
  const symbol = proc.command[1];
  const publicKey1 = proc.command[3];
  const publicKey2 = proc.command[4];

  hybrix.sequential(['createAccount', 'session',
    {
      publicKey1: { data: {data: {publicKey: publicKey1}, symbol, func: 'importPublic'}, step: 'client' },
      publicKey2: { data: {data: {publicKey: publicKey2}, symbol, func: 'importPublic'}, step: 'client' }
    }, 'parallel', // import public keys to required format
    importedKeys => {
      return {
        symbol,
        func: 'sumKeys',
        data: {
          keys: [importedKeys.publicKey1, importedKeys.publicKey2]
        }
      };
    }, 'client', // sum provided public keys
    summedKeys => {
      return {
        symbol,
        func: 'address',
        data: summedKeys
      };
    }, 'client' // get address for summed public keys
  ],

  proc.done, proc.fail, proc.prog);
}

function register (proc, balance) {
  const symbol = proc.command[1];
  const nodeID = proc.command[2];
  const publicKey1 = proc.command[3];
  const publicKey2 = proc.command[4];
  const tradingAddresses = proc.command[5]; // TODO parse and validate trading addresses
  const address = proc.command[6];

  const peers = proc.peek('local::peers');
  const keyPairs = proc.peek('local::keyPairs');

  if (keyPairs.hasOwnProperty(publicKey1)) {
    if (peers && peers.hasOwnProperty(nodeID)) {
      // TODO update peers
      proc.fail('Cannot update a peer yet');// TODO
    } else {
      proc.poke('local::peers[' + nodeID + ']', {
        tradingAddresses: tradingAddresses,
        deposits: {
          [symbol]: {[publicKey1]: {state: 'confirmed', publicKey2, address, balance, privateKey: keyPairs[publicKey1].privateKey, time: Date.now()}}
        }
      });
      proc.poke('local::keyPairs[' + publicKey1 + ']', undefined);
      proc.done(publicKey1);
    }
  } else {
    proc.fail('Public key ' + publicKey1 + ' is unknown.');
  }
}

function list (proc) {
  const result = {};
  const peers = proc.peek('local::peers');
  for (let nodeID in peers) {
    const peer = peers[nodeID];
    result[nodeID] = {tradingAddresses: peer.tradingAddresses, deposits: {}};
    for (let symbol in peer.deposits) {
      result[nodeID].deposits[symbol] = {};
      for (let publicKey in peer.deposits[symbol]) {
        const deposit = peer.deposits[symbol][publicKey];
        result[nodeID].deposits[symbol][publicKey] = {state: deposit.state, address: deposit.address, balance: deposit.balance, time: deposit.time, publicKey2: deposit.publicKey2 };
      }
    }
  }
  proc.done(result);
}
