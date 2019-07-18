/**
   * Banking functions to control hybrix accounts from Qrtz.
   * @param {String} username - The username/ID of the hybrix account.
   * @param {String} passwordOrKeyOrFile - The passwordOrKeyOrFile of the hybrix account.
   * @param {Array}  action - An array containing the account action and its parameters.
   * @category Finance
   * @example
   * bank('create')                                               // create new account credentials
   * bank('username','passwordOrKeyOrFile',['balance','eth'])                // create new account credentials
   * bank('importKey','s0m3Pr1v4teK3y',['balance','eth'])         // get the account balance of Ethereum
   */

const fs = require('fs');
const router = require('../../../lib/router/router');
const Hybrix = require('../../../interface/hybrix-lib.nodejs.js');
const rout = query => {
  const request = {url: query, sessionID: 0};
  const result = JSON.stringify(router.route(request));
  return result;
};
const hybrixd = new Hybrix.Interface({local: {rout}});
const hostname = 'http://127.0.0.1:1111/';

exports.bank = ydata => function (p, username, passwordOrKeyOrFile, properties) {
  if (global.hybrixd.proc[p.processID].sid === 0) {
    let passwd, args, method, symbol, actions, amount, target, tx;
    let importAccount = '';
    let fileError = false;

    if (username === 'create') {
      actions = ['createAccount'];
    } else if (username && passwordOrKeyOrFile) {
      args = arguments[3];
      method = args[0];
      symbol = args[1];
      switch (username) {
        case 'accountJSON': // format: {username:"username", passwordOrKeyOrFile:"passwordOrKeyOrFile"}
          username = passwordOrKeyOrFile.username;
          passwd = passwordOrKeyOrFile.passwordOrKeyOrFile;
          break;
        case 'accountFile':
          if (fs.existsSync(passwordOrKeyOrFile)) {
            importAccount = String(fs.readFileSync(passwordOrKeyOrFile));
            try {
              importAccount = JSON.parse(importAccount);
              username = importAccount.username;
              passwd = importAccount.passwordOrKeyOrFile;
            } catch (e) {
              importAccount = importAccount.replace(' ', ',').replace('|', ',').replace('\n', ',').split(',');
              username = importAccount[0];
              passwd = importAccount[1];
            }
          } else {
            username = 'DUMMYDUMMYDUMMY0';
            passwd = 'DUMMYDUMMYDUMMY0';
            fileError = true;
          }
          break;
        case 'importKey':
          username = 'DUMMYDUMMYDUMMY0';
          passwd = 'DUMMYDUMMYDUMMY0';
          break;
        case 'importKeyFile':
          username = 'DUMMYDUMMYDUMMY0';
          passwd = 'DUMMYDUMMYDUMMY0';
          if (fs.existsSync(passwordOrKeyOrFile)) {
            passwordOrKeyOrFile = String(fs.readFileSync(passwordOrKeyOrFile));
          } else {
            fileError = true;
          }
          break;
        default:
          passwd = passwordOrKeyOrFile;
      }
      actions = [
        'init',
        {username: username.replace(/\s+/g, ' ').trim(), password: passwd.replace(/\s+/g, ' ').trim()}, 'session',
        {host: hostname}, 'addHost',
        {query: 's/deterministic/hash/' + symbol}, 'rout'
      ];
      if (username === 'importKey') {
        actions.splice(5, 0, {symbol: symbol, privateKey: passwordOrKeyOrFile}, 'setPrivateKey');
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
        actions.push(result => { return result; }); // DEPRECATED: .replace(/[*+?^${}()|[[\]\\"']/g, '\\$&') proper escapes for terminal output
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
    if (!fileError) {
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
          this.jump(p, failure || 1, error);
        },
        (progress) => { if (progress) { global.hybrixd.proc[p.processID].progress = progress; } }
      );
    } else {
      this.jump(p, arguments[5] || 1, 'Credentials file cannot be read or does not exist!');
    }
  } else {
    this.fail(p, 'Account control using bank() may only be done by root!');
  }
};
