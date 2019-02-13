// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - nxt/module.js
// Module to connect to NXT or any of its derivatives

// required libraries in this context
let fs = require('fs');
let Client = require('../../lib/rest').Client;
let functions = require('../../lib/functions');
let APIqueue = require('../../lib/APIqueue');
let scheduler = require('../../lib/scheduler');
let modules = require('../../lib/modules');

let jstr = function (data) { return JSON.stringify(data).replace(/[$]/g, () => '$$'); };

// exports
exports.init = init;
exports.tick = tick;
exports.exec = exec;
exports.stop = stop;
exports.link = link;
exports.post = post;

// initialization function
function init () {
  modules.initexec('nxt', ['init']);
}

// stop function
function stop () {
}

// scheduled ticker function
function tick (properties) {
}

// standard functions of an asset store results in a process superglobal -> global.hybrixd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
// http://docs.nxt.org/en/latest/protocol.html
function exec (properties) {
  // decode our serialized properties
  let processID = properties.processID;
  let target = properties.target;
  let base = target.symbol.split('.')[0]; // in case of token fallback to base asset
  let mode = target.mode;
  let factor = (typeof target.factor !== 'undefined' ? target.factor : null);
  let subprocesses = [];
  // set request to what command we are performing
  global.hybrixd.proc[processID].request = properties.command;
  // define the source address/wallet
  let sourceaddr = (typeof properties.command[1] !== 'undefined' ? properties.command[1] : false);
  // handle standard cases here, and construct the sequential process list
  switch (properties.command[0]) {
    case 'init':
      if (!functions.isToken(target.symbol)) {
      // set up REST API connection
        if (typeof target.user !== 'undefined' && typeof target.pass !== 'undefined') {
          let options_auth = {user: target.user, password: target.pass};
          global.hybrixd.asset[target.symbol].link = new Client(options_auth);
        } else { global.hybrixd.asset[target.symbol].link = new Client(); }

        if (typeof global.hybrixd.asset[target.symbol].fee === 'undefined') {
          global.hybrixd.asset[target.symbol].fee = 1;
        }

      // set up init probe command to check if RPC and block explorer are responding and connected
      // subprocesses.push('func("link",{target:' + jstr(target) + ',command:["getBlockchainStatus"]})');
      // subprocesses.push('logs(1,"module nxt: "+(data?"connected":"failed connection")+" to [' + target.symbol + '] host ' + target.host + '")');
      }
      break;
    case 'status':
    // set up init probe command to check if Altcoin RPC is responding and connected
      subprocesses.push('func("link",{target:' + jstr(target) + ',command:["getBlockchainStatus",[]]})'); // send balance query
      subprocesses.push('func("post",{target:' + jstr(target) + ',command:["status"],data:data})');
      break;
    case 'factor':
    // directly return factor, post-processing not required!
      subprocesses.push('stop(0,"' + factor + '")');
      break;
    case 'fee':
    // directly return fee, post-processing not required!
      let fee;
      if (!functions.isToken(target.symbol)) {
        fee = (typeof target.fee !== 'undefined' ? target.fee : 1);
      } else {
        fee = (typeof global.hybrixd.asset[base].fee !== 'undefined' ? global.hybrixd.asset[base].fee : 1);
        factor = (typeof global.hybrixd.asset[base].factor !== 'undefined' ? global.hybrixd.asset[base].factor : null);
      }
      subprocesses.push('stop((' + jstr(fee) + '!=null && ' + jstr(factor) + '!=null?0:1),' + (fee != null && factor != null ? '"' + functions.padFloat(fee, factor) + '"' : null) + ')');
      break;
    case 'balance':
      if (sourceaddr) {
        if (!functions.isToken(target.symbol)) {
          if (target.symbol === 'burst' && !sourceaddr.startsWith('BURST-')) {
            sourceaddr = 'BURST-' + sourceaddr;
          }
          subprocesses.push('@retryLoop');
          subprocesses.push('func("link",{target:' + jstr(target) + ',command:["getBalance",["account=' + sourceaddr + '"]]})'); // send balance query
          subprocesses.push('tran ".unconfirmedBalanceNQT" @returnBalance 1');
          subprocesses.push('logs(2,"module nxt: bad RPC response, retrying request...")');
          subprocesses.push('wait(1500)');
          subprocesses.push('loop(@retryLoop,"retries","<5","1")');
          subprocesses.push('data 0');
          subprocesses.push('@returnBalance');
          subprocesses.push('atom');
          subprocesses.push('done');
        } else {
          subprocesses.push('func("link",{target:' + jstr(target) + ',command:["getAccount",["account=' + sourceaddr + '","includeAssets=true","includeCurrencies=true"]]})'); // send balance query
          subprocesses.push('func("post",{target:' + jstr(target) + ',command:["balance"],data:data})');
        }
      } else {
        subprocesses.push('fail("Error: missing address!")');
      }
      break;
    case 'push':
      var deterministic_script = (typeof properties.command[1] !== 'undefined' ? properties.command[1] : false);
      if (deterministic_script) {
        subprocesses.push('@retryLoop');
        subprocesses.push('func("link",{target:' + jstr(target) + ',command:["broadcastTransaction",["transactionBytes=' + deterministic_script + '"]]})');
        // returns: { "requestProcessingTime": 4, "fullHash": "3a304584f20cf3d2cbbdd9698ff9a166427005ab98fbe9ca4ad6253651ee81f1", "transaction": "15200507403046301754" }
        subprocesses.push('tran(".transaction",1,3)');
        subprocesses.push('done()');
        subprocesses.push('logs(2,"module nxt: bad RPC response, retrying request...")');
        subprocesses.push('wait(1500)');
        subprocesses.push('loop(@retryLoop,"retries","<5","1")');
        subprocesses.push('fail("Error: NXT network not responding. Cannot push transaction!")');

        subprocesses.push('stop((typeof data.transaction==="undefined"?1:0),(typeof data.transaction==="undefined"?data.errorDescription:data.transaction))');
      } else {
        subprocesses.push('stop(1,"Missing or badly formed deterministic transaction!")');
      }
      break;
    // NXT has no concept of unspents, instead we have to prepare an unsigned transaction here
    // this is then returned to the deterministic library in the browser for signing, and pushing (broadcast)
    case 'unspent':
      var amount = Number(properties.command[2]);
      var targetaddr = properties.command[3];
      var publicKey = properties.command[4];
      if (sourceaddr) {
        if (typeof amount === 'undefined' || !amount) {
          subprocesses.push('stop(1,"Error: please specify an amount above zero!")');
        } else {
          if (targetaddr) {
            if (publicKey) {
              publicKey = '"publicKey=' + publicKey + '"';
            } else {
              publicKey = '"publicKey="+data.publicKey';
              subprocesses.push('func("link",{target:' + jstr(target) + ',command:["getAccount",["account=' + sourceaddr + '"]]})'); // send balance query
              subprocesses.push('test((typeof data.publicKey!=="undefined" && data.publicKey),2,1,data)');
              subprocesses.push('stop(1,"Error: missing NXT public key!")');
            }
            if (target.symbol === 'burst') { // without doNotSign parameter
              let fee = (typeof global.hybrixd.asset[base].fee !== 'undefined' ? global.hybrixd.asset[base].fee : null);
              let feefactor = (typeof global.hybrixd.asset[base].factor !== 'undefined' ? global.hybrixd.asset[base].factor : null);
              // if(base==='nxt' && functions.toInt(amount,factor).toString()!==functions.toInt(amount,factor).toInteger().toString() ) {
              //  subprocesses.push('stop(1,"Error: NXT token transactions support only integer amounts!")');
              // }
              amount = functions.fromInt(functions.toInt(amount, factor).minus(functions.toInt(fee, factor)).toInteger(), factor).toString(); // with NXT the unspent function is a transaction preparation, so must subtract the fee
              subprocesses.push('func("link",{target:' + jstr(target) + ',command:["transferAsset",["recipient=' + targetaddr + '","asset=' + target.contract + '",' + publicKey + ',"quantityQNT=' + functions.toInt(amount, factor) + '","feeNQT=' + functions.toInt(fee, feefactor) + '","deadline=300","broadcast=false"] ]})');
            } else if (!functions.isToken(target.symbol)) {
              let fee = (typeof global.hybrixd.asset[base].fee !== 'undefined' ? global.hybrixd.asset[base].fee : null);
              amount = functions.fromInt(functions.toInt(amount, factor).minus(functions.toInt(fee, factor)), factor).toString(); // with NXT the unspent function is a transaction preparation, so must subtract the fee
              if (base === 'xel') {
                amount = functions.toInt(amount, factor);
              }
              subprocesses.push('func("link",{target:' + jstr(target) + ',command:["sendMoney",["recipient=' + targetaddr + '",' + publicKey + ',"amountNQT=' + functions.toInt(amount, factor) + '","feeNQT=' + functions.toInt(fee, factor) + '","deadline=300","doNotSign=1","broadcast=false"] ]})');
            } else {
              let fee = (typeof global.hybrixd.asset[base].fee !== 'undefined' ? global.hybrixd.asset[base].fee : null);
              let feefactor = (typeof global.hybrixd.asset[base].factor !== 'undefined' ? global.hybrixd.asset[base].factor : null);
              // if(base==='nxt' && functions.toInt(amount,factor).toString()!==functions.toInt(amount,factor).toInteger().toString() ) {
              //  subprocesses.push('stop(1,"Error: NXT token transactions support only integer amounts!")');
              // }
              amount = functions.fromInt(functions.toInt(amount, factor).minus(functions.toInt(fee, factor)).toInteger(), factor).toString(); // with NXT the unspent function is a transaction preparation, so must subtract the fee
              if (base === 'xel') {
                amount = functions.toInt(amount, factor);
              }

              subprocesses.push('func("link",{target:' + jstr(target) + ',command:["transferAsset",["recipient=' + targetaddr + '","asset=' + target.contract + '",' + publicKey + ',"quantityQNT=' + functions.toInt(amount, factor) + '","feeNQT=' + functions.toInt(fee, feefactor) + '","deadline=300","doNotSign=1","broadcast=false"] ]})');
            }
            subprocesses.push('stop((typeof data.errorCode==="undefined"?0:data.errorCode),(typeof data.errorCode==="undefined"?data:data.errorDescription))');
          } else {
            subprocesses.push('stop(1,"Error: missing target address!")');
          }
        }
      } else {
        subprocesses.push('stop(1,"Error: missing source address!")');
      }
      break;
    case 'contract':
    // directly return factor, post-processing not required!
      let contract = (typeof target.contract !== 'undefined' ? target.contract : null);
      subprocesses.push('stop(0,"' + contract + '")');
      break;
    case 'history':
    // getBlockchainTransactions
      break;
    case 'transaction':
      subprocesses.push('func("link",{target:' + jstr(target) + ',command:["getTransaction",["transaction=' + properties.command[1] + '"] ]})');
      subprocesses.push("tran({id:'.transaction',fee:'.feeNQT',attachment:'=.attachment|none',timestamp:'.timestamp',symbol:'" + target.symbol + "','fee-symbol':'" + target['symbol'] + "',amount:'.amountNQT',source:'.sender',target:'.recipient'},2,1)");//, data:'.'
      subprocesses.push('stop(1,data)');
      subprocesses.push('stop(0,data)');

      break;
    case 'details':
      var symbol = target.symbol;
      var name = target.name;
      let feeFactor;
      let feeFix;
      if (!functions.isToken(target.symbol)) {
        feeFix = (typeof target.fee !== 'undefined' ? target.fee : 1);
        feeFactor = factor;
      } else {
        feeFix = (typeof global.hybrixd.asset[base].fee !== 'undefined' ? global.hybrixd.asset[base].fee : 1);
        feeFactor = (typeof global.hybrixd.asset[base].factor !== 'undefined' ? global.hybrixd.asset[base].factor : null);
      }
      feeFix = functions.padFloat(feeFix, factor);
      // var base; already defined
      // var mode; already defined
      // var factor; already defined
      var contractFix = (typeof target.contract !== 'undefined' ? target.contract : null);
      subprocesses.push("stop(0,{'symbol':'" + symbol + "','name':'" + name + "','mode':'" + mode + "','contract':'" + contractFix + "','fee':'" + feeFix + "','fee-factor':'" + feeFactor + "','factor':'" + factor + "','keygen-base':'" + base + "','fee-symbol':'" + base + "','generated':'never'})");
      break;
    case 'sample':
      let address;
      let transaction;
      switch (mode.split('.')[1]) {
        case 'main' : address = 'NXT-4RU9-TNCT-F3MU-8952K'; transaction = '13821793329980543744'; publicKey = '32f5fa059b39fae92e41fee6606c5afa4db80d426532fa94f50415c062794c4b'; break;
        case 'elastic' : address = 'XEL-WVUH-342G-KUK2-BJCAU'; transaction = '12238083156285810252'; publicKey = 'ac98288464ff917788a49d2ca4ccf078b66e4090e2b81c8daef8b492bcc1ef0e'; break;
        case 'burst' : address = 'HKML-NRG6-VBRA-2F8PS'; transaction = '11439896918258012006'; publicKey = '25cc2bb30ee7665737c9721090313c85176e485cd9a15495a0f3abc359d8d632'; break;
      }
      subprocesses.push('stop(0,{address:"' + address + '",transaction:"' + transaction + '",publicKey:"' + publicKey + '"})');
      break;
    default:
      subprocesses.push('stop(1,"Asset function not supported!")');
  }
  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}

// standard function for postprocessing the data of a sequential set of instructions
function post (properties) {
  // decode our serialized properties
  let processID = properties.processID;
  let target = properties.target;
  let postdata = properties.data;
  let factor = (typeof target.factor !== 'undefined' ? target.factor : null);
  // set data to what command we are performing
  global.hybrixd.proc[processID].data = properties.command;
  // handle the command
  let success;
  if (postdata == null) {
    success = false;
  } else {
    success = true;
    switch (properties.command[0]) {
      case 'init':
        break;
      case 'status':
      // nicely cherrypick and reformat status data
        var collage = {};
        collage.module = 'nxt';
        collage.synced = postdata.blockchainState === 'UP_TO_DATE';
        collage.blocks = postdata.numberOfBlocks;
        collage.fee = null;
        collage.supply = null;
        collage.difficulty = postdata.cumulativeDifficulty;
        collage.testmode = postdata.isTestnet;
        collage.version = postdata.version;
        postdata = collage;
        break;
      case 'balance':

        var balance = 0;
        if (typeof postdata.unconfirmedAssetBalances !== 'undefined' && Array.isArray(postdata.unconfirmedAssetBalances)) {
        // subprocesses.push('stop((data===null || typeof data.assetBalances==="undefined"?1:0),(data===null || typeof data.assetBalances==="undefined"?data.assetBalances:[]))');
          for (let i = 0; i < postdata.unconfirmedAssetBalances.length; i++) {
            if (postdata.unconfirmedAssetBalances[i].asset === target.contract) {
              balance += postdata.assetBalances[i].balanceQNT;
            }
          }
        }

        postdata = functions.padFloat(functions.fromInt(balance, factor), factor);
        break;
      default:
        success = false;
    }
  }
  // stop and send data to parent
  scheduler.stop(processID, success ? 0 : 1, postdata);
}

// data returned by this connector is stored in a process superglobal -> global.hybrixd.process[processID]
function link (properties) {
  let target = properties.target;
  let symbol = target.symbol;
  let addRandom = symbol !== 'burst'; // Burst fails with an error if random parameter is provided
  let base = target.symbol.split('.')[0]; // in case of token fallback to base asset
  // decode our serialized properties
  let processID = properties.processID;
  let command = properties.command;
  if (DEBUG) { console.log(' [D] module nxt: sending REST call for [' + target.symbol + '] -> ' + JSON.stringify(command)); }
  // separate method and arguments
  let method = command.shift();
  let params = command.shift();
  // launch the asynchronous rest functions and store result in global.hybrixd.proc[processID]
  // do a GET or PUT/POST based on the command input
  let type;
  let args;
  let upath;
  if (typeof params === 'object') {
    type = 'POST';
    upath = '?requestType=' + method;
    args = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
      data: params.join('&') + (addRandom ? '&random=' + Math.random() : ''),
      path: upath
    };
  } else {
    type = 'GET';
    upath = '?requestType=' + method + (typeof params === 'undefined' ? '' : '&' + params) + (addRandom ? '&random=' + Math.random() : '');
    args = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
      path: upath
    };
  }
  // construct the APIqueue object
  APIqueue.add({ 'method': type,
    'link': 'asset["' + base + '"]', // make sure APIqueue can use initialized API link
    'host': (typeof target.host !== 'undefined' ? target.host : global.hybrixd.asset[base].host), // in case of token fallback to base asset hostname
    'args': args,
    'throttle': (typeof target.throttle !== 'undefined' ? target.throttle : global.hybrixd.asset[base].throttle), // in case of token fallback to base asset throttle
    'pid': processID,
    'target': target.symbol });
}
