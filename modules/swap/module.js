// (C) 2018 Internet of Coins / Rouke Pouw
// swap module
const router = require('../../lib/router/router');
const Hybrix = require('../../interface/hybrix-lib.nodejs.js');

const rout = query => {
  const request = {url: query, sessionID: 0};
  const result = JSON.stringify(router.route(request));
  return result;
};

const hybrix = new Hybrix.Interface({local: {rout}});

// exports
exports.init = init;
exports.request = request;
exports.register = register;
exports.deposits = deposits;
exports.describe = describe;
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
    //    keyPair => { proc.poke('local::keyPairs[' + keyPair.publicKey + ']', {privateKey: keyPair.privateKey, time: Date.now()}); return keyPair.publicKey; }

    keyPair => { proc.poke('local::keyPairs[' + 100 + ']', {privateKey: 100, time: Date.now()}); return 100; }
  ],
  proc.done, proc.fail, proc.prog);
}

/* function public_ (proc) {
  const symbol = proc.command[1];
  hybrix.sequential([{username: global.hybrixd.node.publicKey, password: global.hybrixd.node.privateKey}, 'session',
    {symbol}, 'getPublicKey'
  ],
  proc.done, proc.fail, proc.prog);
} */

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
  const tradingSymbol = proc.command[5];
  const tradingAddress = proc.command[6]; // TODO validate trading addresses
  const summedAddress = proc.command[7];

  const address = {symbol: tradingSymbol, address: tradingAddress};
  const keyPairs = proc.peek('local::keyPairs');

  const deposit = {
    state: 'confirmed',

    symbol,
    publicKey1,
    publicKey2,
    address: summedAddress,

    balance,
    privateKey: keyPairs[publicKey1].privateKey,
    time: Date.now()
  };

  if (keyPairs.hasOwnProperty(publicKey1)) {
    const peerDeposits = proc.peek('local::peerDeposits');
    if (peerDeposits && peerDeposits.hasOwnProperty(nodeID) && typeof peerDeposits[nodeID] === 'object' && peerDeposits[nodeID] !== null) {
      peerDeposits[nodeID].tradingAddresses.push(address);
      peerDeposits[nodeID].deposits.push(deposit);
      proc.poke('local::peerDeposits[' + nodeID + ']', peerDeposits[nodeID]);
    } else {
      proc.poke('local::peerDeposits[' + nodeID + ']', {
        tradingAddresses: [address],
        deposits: [deposit]
      });
    }
    proc.poke('local::keyPairs[' + publicKey1 + ']', undefined);
    proc.done(publicKey1);
  } else {
    proc.fail('Public key ' + publicKey1 + ' is unknown.');
  }
}

function describe (proc) {
  const nodeID = proc.command[1];
  const peerDeposits = proc.peek('local::peerDeposits');
  if (peerDeposits && peerDeposits.hasOwnProperty(nodeID)) {
    const peerDeposit = peerDeposits[nodeID];
    const result = {tradingAddresses: peerDeposit.tradingAddresses, deposits: []};
    result.deposits = [];
    for (let i = 0; i < peerDeposit.deposits.length; ++i) {
      const deposit = peerDeposit.deposits[i];
      result.deposits.push({
        state: deposit.state,
        symbol: deposit.symbol,
        address: deposit.address,
        balance: deposit.balance,
        time: deposit.time
      });
    }

    proc.done(result);
  } else {
    proc.fail('Peer ' + nodeID + ' is unknown.');
  }
}

function deposits (proc) {
  const result = {};
  const peerDeposits = proc.peek('local::peerDeposits');
  if (peerDeposits) {
    for (let nodeID in peerDeposits) {
      const peerDeposit = peerDeposits[nodeID];
      result[nodeID] = {tradingAddresses: peerDeposit.tradingAddresses, deposits: []};
      result[nodeID].deposits = [];
      for (let i = 0; i < peerDeposit.deposits.length; ++i) {
        const deposit = peerDeposit.deposits[i];
        result[nodeID].deposits.push({
          state: deposit.state,
          symbol: deposit.symbol,
          address: deposit.address,
          balance: deposit.balance,
          time: deposit.time
        });
      }
    }
  }
  proc.done(result);
}
