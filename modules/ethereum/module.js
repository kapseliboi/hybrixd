// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - ethereum/module.js
// Module to connect to ethereum or any of its derivatives

// required libraries in this context
let fs = require('fs');
let Client = require('../../lib/rest').Client;
let functions = require('../../lib/functions');
let APIqueue = require('../../lib/APIqueue');
let scheduler = require('../../lib/scheduler');
let modules = require('../../lib/modules');
let LZString = require('../../common/crypto/lz-string');

let jstr = function (data) { return JSON.stringify(data).replace(/[$]/g, () => '$$'); };

// exports
exports.init = init;
exports.exec = exec;
exports.link = link;
exports.post = post;

// Checks if the given string is a plausible ETH address
function isEthAddress (address) {
  return (/^(0x){1}[0-9a-fA-F]{40}$/i.test(address));
}

// initialization function
function init () {
  modules.initexec('ethereum', ['init']);
}

let ethDeterministic;
// standard functions of an asset store results in a process superglobal -> global.hybrixd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
// http://docs.ethereum.org/en/latest/protocol.html
function exec (properties) {
  // decode our serialized properties
  let processID = properties.processID;
  let target = properties.target;
  let base = target.symbol.split('.')[0]; // in case of token fallback to base asset
  let factor = (typeof target.factor !== 'undefined' ? target.factor : null);
  let subprocesses = [];
  // set request to what command we are performing
  global.hybrixd.proc[processID].request = properties.command;
  // define the source address/wallet
  let sourceaddr = (typeof properties.command[1] !== 'undefined' ? properties.command[1] : false);
  // handle standard cases here, and construct the sequential process list
  subprocesses.push('time(45000)');
  switch (properties.command[0]) {
    case 'init':
      if (typeof ethDeterministic === 'undefined') {
      // set up REST API connection
        if (typeof target.user !== 'undefined' && typeof target.pass !== 'undefined') {
          let options_auth = {user: target.user, password: target.pass};
          global.hybrixd.asset[target.symbol].link = new Client(options_auth);
        } else { global.hybrixd.asset[target.symbol].link = new Client(); }
        // initialize deterministic code for smart contract calls
        let dcode = String(fs.readFileSync('../modules/deterministic/ethereum/deterministic.js.lzma'));
        ethDeterministic = functions.activate(LZString.decompressFromEncodedURIComponent(dcode));

        // set up init probe command to check if RPC and block explorer are responding and connected
        subprocesses.push('func("link",{target:' + jstr(target) + ',command:["eth_gasPrice"]})');
        subprocesses.push('func("post",{target:' + jstr(target) + ',command:["init"],data:data,data})');
        subprocesses.push('pass( (data !== null && typeof data.result==="string" && data.result[1]==="x" ? 1 : 0) )');
      }
      break;
    case 'cron':
      subprocesses.push('logs(1,"module ethereum: updating fee")');
      subprocesses.push('func("link",{target:' + jstr(target) + ',command:["eth_gasPrice"]})');
      subprocesses.push('func("post",{target:' + jstr(target) + ',command:["updateFee"],data:data,data})');
      break;
    case 'fee':
    // directly return fee, post-processing not required!
      let fee;
      if (!functions.isToken(target.symbol)) {
        fee = (typeof target.fee !== 'undefined' ? target.fee : null);
      } else {
        fee = (typeof global.hybrixd.asset[base].fee !== 'undefined' ? global.hybrixd.asset[base].fee * 2.465 : null);
        factor = (typeof global.hybrixd.asset[base].factor !== 'undefined' ? global.hybrixd.asset[base].factor : 18);
      }
      subprocesses.push('stop((' + jstr(fee) + '!==null && ' + jstr(factor) + '!==null?0:1),' + (fee != null && factor != null ? '"' + functions.padFloat(fee, factor) + '"' : null) + ')');
      break;
    case 'balance':
      if (sourceaddr) {
        subprocesses.push('@retryLoop');
        if (!functions.isToken(target.symbol)) {
          subprocesses.push('func("link",{target:' + jstr(target) + ',command:["eth_getBalance",["' + sourceaddr + '","latest"]]})'); // send balance query
        } else {
          let encoded = ethDeterministic.encode({'func': 'balanceOf(address):(uint256)', 'vars': ['address'], 'address': sourceaddr}); // returns the encoded binary (as a Buffer) data to be sent
          subprocesses.push('func("link",{target:' + jstr(target) + ',command:["eth_call",[{"to":"' + target.contract + '","data":"' + encoded + '"},"pending"]]})'); // send token balance ABI query
        }
        // when bad result returned: {"status":"0","message":"NOTOK","result":"Error! Missing Or invalid Module name"
        // UBQ {"jsonrpc":"2.0","id":8123,"address":"0xa8201e4dacbe1f098791a0f11ab6271570277bb8","result":"0"}
        subprocesses.push('tran(".result",1,3)');
        if (base === 'ubq') {
          subprocesses.push('test(!isNaN(data.substr(0,1)),1,2)');
          subprocesses.push('atom');
          subprocesses.push('done');
        } else {
          subprocesses.push('test((data.substr(0,2)==="0x"),1,4)');
          subprocesses.push('data(functions.hex2dec.toDec(data))');
          subprocesses.push('atom');
          subprocesses.push('done');
          subprocesses.push('logs(2,"module ethereum: bad RPC response, retrying request...")');
          subprocesses.push('wait(1500)');
          subprocesses.push('loop(@retryLoop,"retries","<9","1")');
        }
        subprocesses.push('fail("Error: Ethereum network not responding. Cannot get balance!")');
      } else {
        subprocesses.push('stop(1,"Error: missing address!")');
      }
      break;
    case 'push':
      var deterministic_script = (typeof properties.command[1] !== 'undefined' ? properties.command[1] : false);
      if (deterministic_script) {
        subprocesses.push('@retryLoop');
        subprocesses.push('func("link",{target:' + jstr(target) + ',command:["eth_sendRawTransaction",["' + deterministic_script + '"]]})');
        // returns: { "id":1, "jsonrpc": "2.0", "result": "0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331" }
        subprocesses.push('tran(".result",1,3)');
        subprocesses.push('test((data.substr(0,2)==="0x"),1,2)');
        subprocesses.push('done()');
        subprocesses.push('tran(".error",1,2)');
        subprocesses.push('fail()');
        subprocesses.push('logs(2,"module ethereum: bad RPC response, retrying request...")');
        subprocesses.push('wait(1500)');
        subprocesses.push('loop(@retryLoop,"retries","<9","1")');
        subprocesses.push('fail("Error: Ethereum network not responding. Cannot push transaction!")');
      } else {
        subprocesses.push('fail("Missing or badly formed deterministic transaction!")');
      }
      break;
    case 'unspent':

      if (isEthAddress(sourceaddr)) {
        let targetaddr = (typeof properties.command[3] !== 'undefined' ? properties.command[3] : false);
        if (isEthAddress(targetaddr)) {
          subprocesses.push('@retryLoop');
          subprocesses.push('func("link",{target:' + jstr(target) + ',command:["eth_getTransactionCount",["' + sourceaddr + '","pending"]]})');
          subprocesses.push('tran(".result",1,2)');
          subprocesses.push('done({"nonce":functions.hex2dec.toDec(data)})');
          subprocesses.push('logs(2,"module ethereum: bad RPC response, retrying request...")');
          subprocesses.push('wait(1500)');
          subprocesses.push('loop(@retryLoop,"retries","<9","1")');
          subprocesses.push('fail("Error: Ethereum network not responding. Cannot get nonce!")');
        } else {
          subprocesses.push('stop(1,"Error: bad or missing target address!")');
        }
      } else {
        subprocesses.push('stop(1,"Error: bad or missing source address!")');
      }
      break;
    case 'transaction' :
      subprocesses.push('func("link",{target:' + jstr(target) + ',command:["eth_getTransactionByHash",["' + sourceaddr + '"]]})');
      subprocesses.push("tran({id:'.result.hash',fee:'.result.gas',attachment:'.result.input',timestamp:'unknown',symbol:'" + target.symbol + "','fee-symbol':'eth',ammount:'.result.value',source:'.result.from',target:'.result.to',data:'.result'},2,1)");//, data:'.'
      subprocesses.push('stop(1,data)');
      subprocesses.push('stop(0,data)');
      break;
    case 'history':
      subprocesses.push('func("link",{target:' + jstr(target) + ',command:["eth_getLogs",[{"fromBlock":"earliest","address":["' + sourceaddr + '"]}]]})');

      // TODO formatting
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
  let base = target.symbol.split('.')[0]; // in case of token fallback to base asset
  let feefactor = (typeof global.hybrixd.asset[base].factor !== 'undefined' ? global.hybrixd.asset[base].factor : 18);
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
        if (typeof postdata.result !== 'undefined' && postdata.result > 0) {
          global.hybrixd.asset[target.symbol].fee = functions.fromInt(functions.hex2dec.toDec(String(postdata.result)).times((21000 * 2)), feefactor);
        } else {
          global.hybrixd.asset[target.symbol].fee = global.hybrixd.asset[base].fee;
        }
        break;
      case 'updateFee':
        if (typeof postdata.result !== 'undefined' && postdata.result > 0) {
          global.hybrixd.asset[target.symbol].fee = functions.fromInt(functions.hex2dec.toDec(String(postdata.result)).times((21000 * 2)), feefactor);
        }
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
  let base = target.symbol.split('.')[0]; // in case of token fallback to base asset
  // decode our serialized properties
  let processID = properties.processID;
  let command = properties.command;
  if (DEBUG) { console.log(' [D] module ethereum: sending REST call for [' + target.symbol + '] -> ' + JSON.stringify(command)); }
  // separate method and arguments
  let method = command.shift();
  let params = command.shift();
  // launch the asynchronous rest functions and store result in global.hybrixd.proc[processID]
  // do a GET or PUT/POST based on the command input
  if (typeof params === 'string') { try { params = JSON.parse(params); } catch (e) {} }
  let args = {
    headers: {'Content-Type': 'application/json'},
    data: {'jsonrpc': '2.0', 'method': method, 'params': params, 'id': Math.floor(Math.random() * 10000)}
  };
  // construct the APIqueue object
  APIqueue.add({ 'method': 'POST',
    'link': 'asset["' + base + '"]', // make sure APIqueue can use initialized API link
    'host': (typeof target.host !== 'undefined' ? target.host : global.hybrixd.asset[base].host), // in case of token fallback to base asset hostname
    'args': args,
    'timeout': (typeof target.timeout !== 'undefined' ? target.timeout : global.hybrixd.asset[base].timeout), // in case of token fallback to base asset throttle
    'throttle': (typeof target.throttle !== 'undefined' ? target.throttle : global.hybrixd.asset[base].throttle), // in case of token fallback to base asset throttle
    'pid': processID,
    'target': target.symbol});
}
