/**
   * Wallet functions to control hybrix accounts from Qrtz.
   * @param {String} method - One of create, ...
   * @param {String} userID - The user ID of the hybrix account.
   * @param {String} passwd - The password of the hybrix account.
   * @category Process
   * @example
   * wllt('create')           // create new wallet credentials
   * wllt('importKey','s0m3Pr1v4teK3y','balance','eth')           // create new wallet credentials
   */

const fs = require('fs');
const DJB2 = require('../../../common/crypto/hashDJB2.js');
const Hybrix = require('../../../interface/hybrix-lib.nodejs.js');
const hybrixd = new Hybrix.Interface({http: require('http'),https: require('https')});
const hostname = 'http://127.0.0.1:1111/';

exports.wllt = ydata => function (p, userid, passwd, properties) {
  
  const blobImport = function(data, dataCallback, errorCallback) {
    const modename = data.deterministic.split('.')[0];
    const blob = String(fs.readFileSync('../modules/deterministic/'+modename+'/deterministic.js.lzma'));
    
    hybrixd.sequential(
      [
        {id: modename, blob: blob},
        'import'
      ],
      (data) => { dataCallback({import:true,symbol:data}); },
      (error) => { console.log('Import error!!!'); errorCallback(error); }
    );
  }

  const args = arguments[3];
  const method = args[0];
  const symbol = args[1];  
  let actions, amount, target, tx;
  
  if (userid === 'create') {
    actions = ['createAccount'];
  } else if(userid && passwd) {
    if(userid === 'importKey') {
      let privateKey = arguments[3];
      userid = 'DUMMYDUMMYDUMMY0';
      passwd = 'DUMMYDUMMYDUMMY0';
    }
    actions = [
      'init',
      {username: userid, password: passwd}, 'session',
      {host: hostname}, 'addHost',
      {query:'s/deterministic/hash/'+symbol},'rout',
      remotehash => { return {data: remotehash, func: blobImport}; }, 'call'
    ];
    if(userid === 'importKey') {
      actions.splice(5,0,{symbol:symbol,privateKey:privateKey},'setPrivateKey');
    }
  }
  
  switch(method) {
    case 'balance':
      actions.push({symbol:symbol});
      actions.push('addAsset');
      actions.push({symbol:symbol});
      actions.push('getAddress');
      actions.push(address => { return {query:'/asset/'+symbol+'/balance/'+address}; });
      actions.push('rout');    
    break;
    case 'rawTransaction':
      amount = args[2];
      target = args[3];
      tx = {symbol:symbol, amount:amount, target:target };
      if(args[4] && args[4].forceEthNonce) {
        tx.unspent = {nonce:args[4].forceEthNonce};
      }
      actions.push(tx);
      actions.push('rawTransaction');
      actions.push( result => { return result.replace(/[*+?^${}()|[\[\]\\\"']/g, '\\$&'); } );  // proper escapes for terminal output
    break;
    case 'transaction':
      amount = args[2];
      target = args[3];
      tx = {symbol:symbol, amount:amount, target:target };
      if(args[4] && args[4].forceEthNonce) {
        tx.unspent = {nonce:args[4].forceEthNonce};
      }
      actions.push(tx);
      actions.push('transaction');
    break;
    case 'address':
      actions.push('addAsset');
      actions.push({symbol:symbol});
      actions.push('getAddress');
    break;
    case 'publicKey':
      actions.push({symbol:symbol});
      actions.push('addAsset');
      actions.push({symbol:symbol});
      actions.push('getPublicKey');    
    break;
    case 'secretKey':
      actions.push({symbol:symbol});
      actions.push('addAsset');
      actions.push({symbol:symbol});
      actions.push('getPrivateKey');
    case 'keysObject':
      actions.push({symbol:symbol});
      actions.push('addAsset');
      actions.push({symbol:symbol});
      actions.push('getKeys');
    break;
    default:
    break;
  }

  // take action
  hybrixd.sequential(
    actions,
    (data) => {
      let success, failure, jumpTo;
      if(arguments[1]==='create') {
          success = arguments[2] || 1;
          failure = arguments[3] || 1;
      } else {
          success = arguments[4] || 1;
          failure = arguments[5] || 1;
      }
      jumpTo = success;
      this.jump(p, jumpTo || 1, data);
    },
    (error) => {
      let failure;
      if(arguments[1]==='create') {
        failure = arguments[3] || 1;
      } else {
        failure = arguments[5] || 1;
      }
      this.jump(p, failure || 1, failure+' '+error);
    },
    (progress) => { if(progress) { global.hybrixd.proc[p.processID].progress = progress; } }
  );

}
