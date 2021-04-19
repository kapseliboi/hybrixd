
const fs = require('fs');
const router = require('../../../lib/router/router');
const Hybrix = require('../../../interface/hybrix-lib.nodejs.js');

const rout = query => {
  const request = {url: query, sessionID: 0};
  const result = JSON.stringify(router.route(request));
  return result;
};

const hostname = 'http://127.0.0.1:1111/'; // dummy value as we are using rout to rout internally

function handleLogin (p, login, data, method) {
  if (typeof login !== 'object' || login === null) return 'bank: expected login to be an object';
  if (typeof data !== 'object' || data === null) return 'bank: expected data to be an object';

  const loginActions = [{host: hostname}, 'addHost'];
  if (login.hasOwnProperty('auth')) {
    if (login.auth === 'node') {
      const permissions = p.getRecipe().permissions;
      if (p.getSessionID() === 1 || (typeof permissions === 'object' && permissions !== null && permissions.nodeKeys === true)) {
        if (p.getSessionID() !== 1 && ['getKeys', 'getPrivateKey'].includes(method)) return `bank: method '${method}' not allowed for node authentication.`;
        loginActions.push({publicKey: global.hybrixd.node.publicKey, secretKey: global.hybrixd.node.secretKey}, 'session');
      } else return 'bank: No permission for authentication method \'node\'.';
    } else return 'bank: Unknown authethication method';
  } else if (login.hasOwnProperty('username') && login.hasOwnProperty('password')) {
    loginActions.push(login, 'session');
  } else if (login.hasOwnProperty('publicKey') && login.hasOwnProperty('secretKey')) {
    loginActions.push(login, 'session');
  } else if (login.hasOwnProperty('accountFile')) {
    if (fs.existsSync(login.accountFile)) {
      try {
        const content = String(fs.readFileSync(login.accountFile));
        login = JSON.parse(content);
      } catch (e) {
        return 'bank: Failed to parse accountFile!';

        /* TODO importAccount = importAccount.replace(' ', ',').replace('|', ',').replace('\n', ',').split(',');
        objectOrUsernameOrDirective = importAccount[0];
        password = importAccount[1]; */
      }
      loginActions.push(login, 'session');
    } else return 'bank: accountFile does not exist!';
  } else if (login.hasOwnProperty('importKey') || login.hasOwnProperty('importKeyFile')) {
    if (!data.hasOwnProperty('symbol')) return 'bank: expected data to have a symbol property.';

    let privateKey;
    if (login.hasOwnProperty('importKey')) privateKey = login.importKey;
    else {
      if (fs.existsSync(login.importKeyFile)) {
        privateKey = String(fs.readFileSync(privateKey));
      } else return 'bank: importKeyFile does not exist!';
    }

    const symbol = data.symbol;
    loginActions.push(
      {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
      {symbol}, 'addAsset', // first add asset so we can inject the private keys
      {symbol: symbol, privateKey}, 'setPrivateKey'
    );
  } else {
    return 'Login object does not contain valid login details.';
  }
  return loginActions;
}

/**
   * Banking functions to control hybrix accounts from Qrtz.
   * bank uses the hybrix-jslib methods to check balances, manage keys and perform transactions.
   * See https://api.hybrix.io/help/hybrix-jslib#reference for all methods.
   *
   * Note: if you want to use deterministic transactions client-side, please use the
   * hybrix-jslib for this purpose.
   * For security, this command can only be used as sessionID root.
   * @param {String} method - The propertiesOrKey of the hybrix account.
   * @param {Object} [login] -
   * @param {Object} [login.username] - Use a username password pair to create a session
   * @param {Object} [login.password] -  Use a username password pair to create a session
   * @param {Object} [login.publicKey] - Use a publicKey secretKey pair to create a session
   * @param {Object} [login.secretKey] - Use a publicKey secretKey pair to create a session
   * @param {Object} [login.accountFile] - Import username password object from a json file
   * @param {Object} [login.importKey] - Use a privateKey for the given asset to import directly instead of using a hybrix session
   * @param {Object} [login.importKeyFile] - Import privateKey from a file for the given asset to import directly instead of using a hybrix session
   * @param {Object} [login.auth] - Use {auth:node} to login with node keys. Requires permissions: {nodeKeys:true}
   * @param {Int} [onSuccess=1] -
   * @param {Int} [onFailure] -
   * @category Finance
   * @example
   * bank createAccount                              // create new account credentials
   *
   * data {symbol:btc}
   * bank getBalance $login                          // Get the account balance of Bitcoin
   *
   * data {symbol:nxt}
   * bank getPublicKey $login                        // Get the account public key of NXT
   *
   * data {symbol:flo}
   * bank getSecretKey $login                        // Get the account secret/private key of Florincoin
   *
   * data {symbol:eth}
   * bank getKeys $login                             // Get the account keys in an object of Ethereum
   *
   * data {symbol:doge, amount: 0.1 target}
   * bank transaction $login                         // Send 0.1 Dogecoin to address $target
   *
   * data {symbol:lsk, amount: 0.1 target}
   * bank rawTransaction $login                      // Return the raw transaction bytecode for sending 0.1 Lisk to address $target, without pushing it to the network.
**/
exports.bank = data => function (p, method, login, onSuccess, onFailure) {
  const hybrixd = new Hybrix.Interface({local: {rout}});

  const loginSteps = [];
  if (typeof method !== 'string') return this.fail(p, 'bank: expected a string method!');
  else if (!hybrixd.hasOwnProperty(method)) return this.fail(p, `bank: method '${method}' is unknown.`);
  if (method === 'createAccount') {
    // nothing to do
  } else {
    if (typeof login === 'undefined') return this.fail(p, 'bank: expected a login object');
    const loginActionsOrError = handleLogin(p, login, data, method);
    if (typeof loginActionsOrError === 'string') return this.fail(p, loginActionsOrError);
    loginSteps.push(...loginActionsOrError);
  }

  if (typeof onSuccess === 'undefined') onSuccess = 1;

  hybrixd.sequential(
    [
      ...loginSteps, // handle the login and setting of keys if applicable
      data, method //  execute the method
    ],
    data => p.jump(onSuccess, data),
    error => {
      if (typeof onFailure === 'undefined') return this.fail(p, 'bank: ' + error);
      else p.jump(onFailure, error);
    },
    progress => p.prog(progress)
  );
};

exports.tests = {
  bank1: [
    'data {symbol:dummy}',
    'bank getBalance {username:DUMMYDUMMYDUMMY0,password:DUMMYDUMMYDUMMY0} 1 2',
    'done $OK',
    'fail'
  ]
};
