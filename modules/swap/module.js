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
exports.test = test;

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

function test (proc) {
  const symbol = 'mock.btc';

  hybrix.sequential(['createAccount', 'session',
    {
      symbol,
      func: 'sumKeys',
      data: {
        publicKeys: [100, 10, 1],
        privateKeys: [200, 30, 4]

      }
    }, 'client'
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

function register (proc) {
  const symbol = proc.command[1];
  const nodeID = proc.command[2];
  const publicKey = proc.command[3];
  const tradingAddresses = proc.command[4]; // TODO parse and validate trading addresses
  const peers = proc.peek('local::peers');
  const keyPairs = proc.peek('local::keyPairs');
  if (keyPairs.hasOwnProperty(publicKey)) {
    if (peers && peers.hasOwnProperty(nodeID)) {
      // TODO update peers
      proc.fail('Cannot update a peer yet');// TODO
    } else {
      proc.poke('local::peers[' + nodeID + ']', {
        tradingAddresses: tradingAddresses,
        deposits: {
          [symbol]: {[publicKey]: {state: 'unconfirmed', privateKey: keyPairs[publicKey].privateKey, time: Date.now()}}
        }
      });
      proc.poke('local::keyPairs[' + publicKey + ']', undefined);
      proc.done(publicKey);
    }
  } else {
    proc.fail('Public key ' + publicKey + ' is unknown.');
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
        result[nodeID].deposits[symbol][publicKey] = deposit.state;
      }
    }
  }
  proc.done(result);
}
