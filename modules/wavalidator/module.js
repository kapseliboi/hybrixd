// (C) 2015 Internet of Coins / Metasync / Joachim de Koning

// required libraries in this context

// exports
exports.init = init;
exports.exec = exec;


// https://github.com/ognus/wallet-address-validator
var WAValidator

// initialization function
function init() {
//  modules.initexec('validator',["init"]);
  WAValidator = require('wallet-address-validator');
}

function exec(properties) {

  var command = properties.command;
  var processID = properties.processID;
  console.log("command"+ JSON.stringify(command));
  var subprocesses = [];
  // set request to what command we are performing
  global.hybridd.proc[processID].request = properties.command;

  var symbol = command[0].toUpperCase();
  var address = command[1];

  try{
    var valid = WAValidator.validate(address,symbol);//'1KFzzGtDdnq5hrwxXGjwVnKzRbvf8WVxck', 'BTC'


    if(valid){
      subprocesses.push("stop(0,'valid')");
    }else{
      subprocesses.push("stop(0,'invalid')");
    }
  }catch(e){
    subprocesses.push("stop(1,'Symbol is not supported by wallet-address-validator')");
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID,subprocesses);
}
