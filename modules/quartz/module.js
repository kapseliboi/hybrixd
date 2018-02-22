// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - zcash/module.js
// Module to connect to zcash or any of its derivatives

// required libraries in this context
var fs = require('fs');
var Client = require('../../lib/rest').Client;
var functions = require('../../lib/functions');

// exports
exports.init = init;
exports.tick = tick;
exports.exec = exec;
exports.stop = stop;

// initialization function
function init() {
  modules.initexec('quartz',['init']);
}

// stop function
function stop() {
}

// scheduled ticker function
function tick(properties) {
}

// preprocess quartz code
function addSubprocesses(subprocesses,commands,target,xpath) {
  for(var i=0,len=commands.length;i<len;++i){
    var re = /[$][a-zA-Z][\w]+/g; // Search for $property
    var command =  commands[i].replace(re, function(x) {return target[x.substr(1)];}); // Replace all "$property" with target["property"]
    re = /[$][\d]+/g; // Search for $0, $1, ...
    command =  command.replace(re, function(x) {return xpath[x.substr(1)];}); // Replace all "$1" with xpath[1]
    subprocesses.push(command);
  }
}


// standard functions of an asset store results in a process superglobal -> global.hybridd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
function exec(properties) {

  // decode our serialized properties
  var processID = properties.processID;
  var target = properties.target;
  var base = target.symbol.split('.')[0];     // in case of token fallback to base asset
  var mode  = target.mode;
  var factor = (typeof target.factor !== 'undefined'?target.factor:null);
  var subprocesses = [];
  // set request to what command we are performing
  global.hybridd.proc[processID].request = properties.command;
  // define the source address/wallet
  var sourceaddr = (typeof properties.command[1] !== 'undefined'?properties.command[1]:false);
  // handle standard cases here, and construct the sequential process list

  var command = properties.command[0];
  if(command=='init'){
    if(!isToken(target.symbol)) { //TODO why token specialization? Move to
      // set up REST API connection
      if(typeof target.user !== 'undefined' && typeof target.pass !== 'undefined') {
        var options_auth={user:target.user,password:target.pass};
        global.hybridd.asset[target.symbol].link = new Client(options_auth);
      } else if(typeof target.user !== 'undefined') {
        var options_auth={user:target.user};
        global.hybridd.asset[target.symbol].link = new Client(options_auth);
      } else {
        global.hybridd.asset[target.symbol].link = new Client();
      }

      // initialize deterministic code for smart contract calls if module-deterministic is defined
      if(target.hasOwnProperty('module-deterministic')){
        var dcode = String(fs.readFileSync('../modules/deterministic/'+target['module-deterministic']+'/deterministic.js.lzma'));
        global.hybridd.asset[target.symbol].dcode = functions.activate( LZString.decompressFromEncodedURIComponent(dcode) );
      }

    }
  }
  if(target.quartz.hasOwnProperty(command)){
    addSubprocesses(subprocesses,target.quartz[command],target,properties.command);
  }else{
    subprocesses.push('stop(1,"Asset function not supported!")');
  }
  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID,subprocesses);
}
