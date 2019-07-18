/**
   * Banking functions to control hybrix accounts from Qrtz.
   * @param {String} username - The username/ID of the hybrix account.
   * @param {String} password - The password of the hybrix account.
   * @param {Array}  action - An array containing the account action and its parameters.
   * @category Finance
   * @example
   * bank('create')                                               // create new account credentials
   * bank('username','password',['balance','eth'])                // create new account credentials
   * bank('importKey','s0m3Pr1v4teK3y',['balance','eth'])         // get the account balance of Ethereum
   */

const fs = require('fs');
const Hybrix = require('../../../interface/hybrix-lib.nodejs.js');
const hybrixd = new Hybrix.Interface({http: require('http'), https: require('https')});
const hostname = 'http://127.0.0.1:1111/';

exports.bank = ydata => function (p, username, password, properties) {
  const blobImport = function (data, dataCallback, errorCallback) {
    const modename = data.deterministic.split('.')[0];
    const blob = String(fs.readFileSync('../modules/deterministic/' + modename + '/deterministic.js.lzma'));

    hybrixd.sequential(
      [
        {id: modename, blob: blob},
        'import'
      ],
      (data) => { dataCallback({import: true, symbol: data}); },
      (error) => { console.log('Import error!!!'); errorCallback(error); }
    );
  };

  let passwd, args, method, symbol, actions, amount, target, tx;

  if (username === 'create') {
    actions = ['createAccount'];
  } else if (username && password) {
    args = arguments[3];
    method = args[0];
    symbol = args[1];
    switch (username) {
      case 'accountJSON': // format: {username:"username", password:"password"}
        username = password.username;
        passwd = password.password;
        break;
      case 'accountFile':
        let importAccount = String(fs.readFileSync(password));
        try {
          importAccount = JSON.parse(importAccount);
          username = importAccount.username;
          passwd = importAccount.password;
        } catch(e) {
          importAccount = importAccount.replace(' ',',').replace('|',',').replace("\n",',').split(',');
          username = importAccount[0];
          passwd = importAccount[1];
        }
        break;
      case 'importKey':
        username = 'DUMMYDUMMYDUMMY0';
        passwd = 'DUMMYDUMMYDUMMY0';
        break;
      case 'importKeyFile':
        username = 'DUMMYDUMMYDUMMY0';
        passwd = 'DUMMYDUMMYDUMMY0';
        password = String(fs.readFileSync(password));
        break;
      default:
        passwd = password;
    }
    actions = [
      'init',
      {username: username.replace(/\s+/g, ' ').trim(), password: passwd.replace(/\s+/g, ' ').trim()}, 'session',
      {host: hostname}, 'addHost',
      {query: 's/deterministic/hash/' + symbol}, 'rout',
      remotehash => { return {data: remotehash, func: blobImport}; }, 'call'
    ];
    if (username === 'importKey') {
      actions.splice(5, 0, {symbol: symbol, privateKey: password}, 'setPrivateKey');
    }
  }

  switch (method) {
    case 'balance':
      actions.push({symbol: symbol});
      actions.push('addAsset');
      actions.push({symbol: symbol});
      actions.push('getAddress');
      actions.push(address => { return {query: '/asset/' + symbol + '/balance/' + address}; });
      actions.push('rout');
      break;
    case 'rawTransaction':
      amount = args[2];
      target = args[3];
      tx = { symbol: symbol, amount: amount, target: target };
      if (args[4] && args[4].forceEthNonce) {
        tx.unspent = {nonce: args[4].forceEthNonce};
      }
      actions.push(tx);
      actions.push('rawTransaction');
      actions.push(result => { return result.replace(/[*+?^${}()|[[\]\\"']/g, '\\$&'); }); // proper escapes for terminal output
      break;
    case 'transaction':
      amount = args[2];
      target = args[3];
      tx = { symbol: symbol, amount: amount, target: target };
      if (args[4] && args[4].forceEthNonce) {
        tx.unspent = {nonce: args[4].forceEthNonce};
      }
      actions.push(tx);
      actions.push('transaction');
      break;
    case 'address':
      actions.push('addAsset');
      actions.push({symbol: symbol});
      actions.push('getAddress');
      break;
    case 'publicKey':
      actions.push({symbol: symbol});
      actions.push('addAsset');
      actions.push({symbol: symbol});
      actions.push('getPublicKey');
      break;
    case 'secretKey':
      actions.push({symbol: symbol});
      actions.push('addAsset');
      actions.push({symbol: symbol});
      actions.push('getPrivateKey');
      break;
    case 'keysObject':
      actions.push({symbol: symbol});
      actions.push('addAsset');
      actions.push({symbol: symbol});
      actions.push('getKeys');
      break;
    default:
      break;
  }

  // take action
  hybrixd.sequential(
    actions,
    (data) => {
      let success, jumpTo;
      if (arguments[1] === 'create') {
        success = arguments[2] || 1;
      } else {
        success = arguments[4] || 1;
      }
      jumpTo = success;
      this.jump(p, jumpTo || 1, data);
    },
    (error) => {
      let failure;
      if (arguments[1] === 'create') {
        failure = arguments[3] || 1;
      } else {
        failure = arguments[5] || 1;
      }
      this.jump(p, failure || 1, failure + ' ' + error);
    },
    (progress) => { if (progress) { global.hybrixd.proc[p.processID].progress = progress; } }
  );
};
