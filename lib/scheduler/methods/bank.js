/**
   * Banking functions to control hybrix accounts from Qrtz. It is useful for quick
   * implementations of automated and responsive transactions on the node side.
   * Note that this command is not intended for situations where a great amount of
   * parallelized transactions are required. Please use the interface library for this.
   * Also, if you want to use deterministic transactions client-side, please use the
   * hybrix interface library for this purpose.
   * For security, this command can only be used as sessionID root.
   * @param {String} username - The username/ID of the hybrix account.
   * @param {String} passwordOrKeyOrFile - The passwordOrKeyOrFile of the hybrix account.
   * @param {Array}  action - An array containing the account action and its parameters.
   * @category Finance
   * @example
   * bank create                                                     // create new account credentials
   * bank accountJSON $ ['balance','btc']                            // using JSON credentials as input, get the account balance of Bitcoin
   * bank accountFile /tmp/myAccount.json ['balance','doge']         // using JSON credentials in file /tmp/myAccount.json, get the account balance of Dogecoin
   * bank importKey $privkey ['balance','xrp']                       // using the private key in $privkey, get the account balance of Ripple
   * bank importKeyFile /tmp/key.txt ['balance','dash']              // using the key in file /tmp/key.txt, get the account balance of Dash
   * bank $username $password ['balance','btc']                      // using credentials, get the account balance of Bitcoin
   * bank $username $password ['address','ltc']                      // using credentials, get the account address of Litecoin
   * bank $username $password ['publicKey','nxt']                    // using credentials, get the account public key of NXT
   * bank $username $password ['secretKey','flo']                    // using credentials, get the account secret/private key of Florincoin
   * bank $username $password ['keysObject','btc']                   // using credentials, get the account keys in an object of Bitcoin
   * bank $username $password ['transaction','eth',0.1,'$target']    // using credentials, send 0.1 Ethereum to address $target
   * bank $username $password ['rawTransaction','eth',0.1,'$target'] // using credentials, return the raw transaction bytecode for sending 0.1 Ethereum to address $target, without pushing it to the network.
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
  if (p.getSessionID() === 1) {
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
        actions.push({symbol: symbol});
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
        (progress) => { if (progress) { p.prog(progress); } }
      );
    } else {
      this.jump(p, arguments[5] || 1, 'Credentials file cannot be read or does not exist!');
    }
  } else {
    this.fail(p, 'Account control using bank() may only be done by root!');
  }
};
