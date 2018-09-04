// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - ethereum/module.js
// Module to connect to ethereum or any of its derivatives

// required libraries in this context
var fs = require('fs');
var Client = require('../../lib/rest').Client;
var functions = require('../../lib/functions');
var APIqueue = require('../../lib/APIqueue');
var scheduler = require('../../lib/scheduler');
var modules = require('../../lib/modules');

var jstr = function (data) { return JSON.stringify(data); };

// exports
exports.init = init;
exports.tick = tick;
exports.exec = exec;
exports.stop = stop;
exports.link = link;
exports.post = post;

// initialization function
function init () {
  modules.initexec('ethereum', ['init']);
}

// stop function
function stop () {
}

// scheduled ticker function
function tick (properties) {
}

// standard functions of an asset store results in a process superglobal -> global.hybridd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
// http://docs.ethereum.org/en/latest/protocol.html
function exec (properties) {
  // decode our serialized properties
  var processID = properties.processID;
  var target = properties.target;
  var base = target.symbol.split('.')[0]; // in case of token fallback to base asset
  var mode = target.mode;
  var factor = (typeof target.factor !== 'undefined' ? target.factor : null);
  var tokenfeeMultiply = 16;
  var subprocesses = [];
  // set request to what command we are performing
  global.hybridd.proc[processID].request = properties.command;
  // define the source address/wallet
  var sourceaddr = (typeof properties.command[1] !== 'undefined' ? properties.command[1] : false);
  // handle standard cases here, and construct the sequential process list
  switch (properties.command[0]) {
    case 'init':
      if (!functions.isToken(target.symbol)) {
      // set up REST API connection
        if (typeof target.user !== 'undefined' && typeof target.pass !== 'undefined') {
          var options_auth = {user: target.user, password: target.pass};
          global.hybridd.asset[target.symbol].link = new Client(options_auth);
        } else { global.hybridd.asset[target.symbol].link = new Client(); }
        // initialize deterministic code for smart contract calls
        var dcode = String(fs.readFileSync('../modules/deterministic/ethereum/deterministic.js.lzma'));
        global.hybridd.asset[target.symbol].dcode = functions.activate(LZString.decompressFromEncodedURIComponent(dcode));
        // set up init probe command to check if RPC and block explorer are responding and connected
        subprocesses.push('func("ethereum","link",{target:' + jstr(target) + ',command:["eth_gasPrice"]})');
        subprocesses.push('func("ethereum","post",{target:' + jstr(target) + ',command:["init"],data:data,data})');
        subprocesses.push('pass( (data != null && typeof data.result=="string" && data.result[1]=="x" ? 1 : 0) )');
        subprocesses.push('logs(1,"module ethereum: "+(data?"connected":"failed connection")+" to [' + target.symbol + '] host ' + target.host + '")');
      }
      break;
    case 'status':
    // set up init probe command to check if Altcoin RPC is responding and connected
      subprocesses.push('func("ethereum","link",{target:' + jstr(target) + ',command:["eth_protocolVersion"]})');
      subprocesses.push('func("ethereum","post",{target:' + jstr(target) + ',command:["status"],data:data})');
      break;
    case 'factor':
    // directly return factor, post-processing not required!
      subprocesses.push('stop(0,"' + factor + '")');
      break;
    case 'fee':
    // directly return fee, post-processing not required!
      var fee;
      if (!functions.isToken(target.symbol)) {
        fee = (typeof target.fee !== 'undefined' ? target.fee : null);
      } else {
        fee = (typeof global.hybridd.asset[base].fee !== 'undefined' ? global.hybridd.asset[base].fee * 2.465 : null);
        factor = (typeof global.hybridd.asset[base].factor !== 'undefined' ? global.hybridd.asset[base].factor : null);
      }
      subprocesses.push('stop((' + jstr(fee) + '!==null && ' + jstr(factor) + '!==null?0:1),' + (fee != null && factor != null ? '"' + functions.padFloat(fee, factor) + '"' : null) + ')');
      break;
    case 'balance':
      if (sourceaddr) {
        if (!functions.isToken(target.symbol)) {
          subprocesses.push('func("ethereum","link",{target:' + jstr(target) + ',command:["eth_getBalance",["' + sourceaddr + '","latest"]]})'); // send balance query
        } else {
          var symbol = target.symbol.split('.')[0];
          // DEPRECATED: var encoded = '0x'+abi.simpleEncode('balanceOf(address):(uint256)',sourceaddr).toString('hex'); // returns the encoded binary (as a Buffer) data to be sent
          var encoded = global.hybridd.asset[symbol].dcode.encode({'func': 'balanceOf(address):(uint256)', 'vars': ['address'], 'address': sourceaddr}); // returns the encoded binary (as a Buffer) data to be sent
          subprocesses.push('func("ethereum","link",{target:' + jstr(target) + ',command:["eth_call",[{"to":"' + target.contract + '","data":"' + encoded + '"},"pending"]]})'); // send token balance ABI query
        }
        subprocesses.push('stop((data!==null && typeof data.result!=="undefined"?0:1),(data!==null && typeof data.result!=="undefined"? functions.padFloat(functions.fromInt(functions.hex2dec.toDec(data.result),' + factor + '),' + factor + ') :null))');
      } else {
        subprocesses.push('stop(1,"Error: missing address!")');
      }
      break;
    case 'push':
      var deterministic_script = (typeof properties.command[1] !== 'undefined' ? properties.command[1] : false);
      if (deterministic_script) {
        subprocesses.push('func("ethereum","link",{target:' + jstr(target) + ',command:["eth_sendRawTransaction",["' + deterministic_script + '"]]})');
        // returns: { "id":1, "jsonrpc": "2.0", "result": "0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331" }
        subprocesses.push('stop((typeof data.result!="undefined"?0:1),(typeof data.result!="undefined"?data.result:data.error.message))');
      } else {
        subprocesses.push('stop(1,"Missing or badly formed deterministic transaction!")');
      }
      break;
    case 'unspent':
    // Checks if the given string is a plausible ETH address
      function isEthAddress (address) {
        return (/^(0x){1}[0-9a-fA-F]{40}$/i.test(address));
      }
      if (isEthAddress(sourceaddr)) {
        var targetaddr = (typeof properties.command[3] !== 'undefined' ? properties.command[3] : false);
        if (isEthAddress(targetaddr)) {
          subprocesses.push('func("ethereum","link",{target:' + jstr(target) + ',command:["eth_getTransactionCount",["' + sourceaddr + '","pending"]]})');
          subprocesses.push('stop(0,{"nonce":functions.hex2dec.toDec(data.result)})');
        } else {
          subprocesses.push('stop(1,"Error: bad or missing target address!")');
        }
      } else {
        subprocesses.push('stop(1,"Error: bad or missing source address!")');
      }
      break;
    case 'contract':
    // directly return factor, post-processing not required!
      var contract = (typeof target.contract !== 'undefined' ? target.contract : null);
      subprocesses.push('stop(0,"' + contract + '")');
      break;
    case 'transaction' :
      subprocesses.push('func("ethereum","link",{target:' + jstr(target) + ',command:["eth_getTransactionByHash",["' + sourceaddr + '"]]})');
      subprocesses.push("tran({id:'.result.hash',fee:'.result.gas',attachment:'.result.input',timestamp:'unknown',symbol:'" + target.symbol + "','fee-symbol':'eth',ammount:'.result.value',source:'.result.from',target:'.result.to',data:'.result'},data,2,1)");//, data:'.'
      subprocesses.push('stop(1,data)');
      subprocesses.push('stop(0,data)');
      break;
    case 'history':
      subprocesses.push('func("ethereum","link",{target:' + jstr(target) + ',command:["eth_getLogs",[{"fromBlock":"earliest","address":["' + sourceaddr + '"]}]]})');

      // TODO formatting
      break;
    case 'details':
      var symbol = target.symbol;
      var name = target.name;
      var fee;
      if (!functions.isToken(target.symbol)) {
        fee = (typeof target.fee !== 'undefined' ? target.fee : null);
      } else {
        fee = (typeof global.hybridd.asset[base].fee !== 'undefined' ? global.hybridd.asset[base].fee * 2.465 : null);
      }
      fee = fee && factor ? functions.padFloat(fee, factor) : null;
      var contract = (typeof target.contract !== 'undefined' ? target.contract : null);

      subprocesses.push("stop(0,{symbol:'" + symbol + "', name:'" + name + "',mode:'" + mode + "',fee:'" + fee + "',contract:'" + contract + "',factor:'" + factor + "','keygen-base':'" + base + "','fee-symbol':'" + base + "'})");

      break;

    case 'sample':
      var address;
      var transaction;

      switch (base) {
        case 'eth' : address = '0x896a0b2b259d62fd27aeab05c81bb1897ecf767b'; transaction = '0x3960bbb7a7697cd76917243cd760e465c7d5b6013f7b62b41f76de3f8901dad8'; break;
        case 'etc' : address = '0xfc9ab9b2833c4df13cea63da666906b565522f12'; transaction = '0x59c8e36e6e4e9a8697419ad66f245dc21970b9e69efe3898ddd4435b821a43aa'; break;
        case 'exp' : address = '0x6dbfe39370adc9e0f284ed4fd8025342e99d21d6'; transaction = '0x0806279052d792ef077bfa593af5f7e06fe5c4cf9810d82f83b53f38758fd9fe'; break;
        case 'ubq' : address = '0xbb1e3c386a01826bbae330870b96870d2b571d12'; transaction = '0xa0cb3baf5105be78e4f52218f371592cd64cd154cdf75ac5eaeb114ff6da7a15'; break;
      }
      subprocesses.push('stop(0,{address:"' + address + '",transaction:"' + transaction + '"})');
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
  var processID = properties.processID;
  var target = properties.target;
  var postdata = properties.data;
  var factor = (typeof target.factor !== 'undefined' ? target.factor : null);
  // set data to what command we are performing
  global.hybridd.proc[processID].data = properties.command;
  // handle the command
  if (postdata == null) {
    var success = false;
  } else {
    var success = true;
    switch (properties.command[0]) {
      case 'init':
        if (typeof postdata.result !== 'undefined' && postdata.result) {
          global.hybridd.asset[target.symbol].fee = functions.fromInt(functions.hex2dec.toDec(postdata.result).times(21000), factor);
        }
        break;
      case 'status':
        // nicely cherrypick and reformat status data
        var collage = {};
        collage.module = 'ethereum';
        collage.synced = null;
        collage.blocks = null;
        collage.fee = null;
        collage.supply = null;
        collage.difficulty = null;
        collage.testmode = null;
        collage.version = (typeof postdata.result === 'string' ? postdata.result : null);
        postdata = collage;
        break;
      default:
        success = false;
    }
  }
  // stop and send data to parent
  scheduler.stop(processID, success ? 0 : 1, postdata);
}

// data returned by this connector is stored in a process superglobal -> global.hybridd.process[processID]
function link (properties) {
  var target = properties.target;
  var base = target.symbol.split('.')[0]; // in case of token fallback to base asset
  // decode our serialized properties
  var processID = properties.processID;
  var command = properties.command;
  if (DEBUG) { console.log(' [D] module ethereum: sending REST call for [' + target.symbol + '] -> ' + JSON.stringify(command)); }
  // separate method and arguments
  var method = command.shift();
  var params = command.shift();
  // launch the asynchronous rest functions and store result in global.hybridd.proc[processID]
  // do a GET or PUT/POST based on the command input
  if (typeof params === 'string') { try { params = JSON.parse(params); } catch (e) {} }
  var args = {
    headers: {'Content-Type': 'application/json'},
    data: {'jsonrpc': '2.0', 'method': method, 'params': params, 'id': Math.floor(Math.random() * 10000)}
  };
  // construct the APIqueue object
  APIqueue.add({ 'method': 'POST',
    'link': 'asset["' + base + '"]', // make sure APIqueue can use initialized API link
    'host': (typeof target.host !== 'undefined' ? target.host : global.hybridd.asset[base].host), // in case of token fallback to base asset hostname
    'args': args,
    'throttle': (typeof target.throttle !== 'undefined' ? target.throttle : global.hybridd.asset[base].throttle), // in case of token fallback to base asset throttle
    'pid': processID,
    'target': target.symbol });
}
