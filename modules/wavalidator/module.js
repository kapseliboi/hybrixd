// (C) 2015 Internet of Coins / Metasync / Joachim de Koning

// required libraries in this context

// exports
exports.init = init;
exports.exec = exec;

// https://github.com/ognus/wallet-address-validator
var WAValidator;

// initialization function
function init () {
//  modules.initexec('validator',["init"]);
  WAValidator = require('wallet-address-validator');
}
function exec (properties) {
  var command = properties.command;
  var processID = properties.processID;
  var subprocesses = [];
  // set request to what command we are performing
  global.hybridd.proc[processID].request = properties.command;

  var symbol = command[0].toUpperCase();
  var address = command[1];

  if (symbol === 'UBQ' || symbol === 'EXP') { symbol = 'ETH'; }
  if (symbol === 'XCP' || symbol === 'OMNI') { symbol = 'BTC'; }

  if (symbol === 'DUMMY') {
    if (address === '_dummyaddress_') {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'BCH') {
    if (/^(q|p)[a-z0-9]{41}$/.test(address)) {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'NXT') {
    if (address.length === 24 && address.startsWith('NXT-')) {
      // TODO fully implement https://bitcoin.stackexchange.com/questions/30341/programmatically-validating-nxt-addresses
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'XEL') {
    if (address.length === 24 && address.startsWith('XEL-')) {
      // TODO fully implement https://bitcoin.stackexchange.com/questions/30341/programmatically-validating-nxt-addresses
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'BURST') {
    if (address.length === 20 || (address.length === 26 && address.startsWith('BURST-'))) {
      // TODO fully implement https://bitcoin.stackexchange.com/questions/30341/programmatically-validating-nxt-addresses
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'ARK') {
    if (address.length === 34 && address.startsWith('A')) {
      // TODO improve
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'LSK') {
    if ((address.length === 21 || address.length === 20) && address.endsWith('L') && /^\d+$/.test(address.substr(0, address.length - 1))) {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'SHIFT') {
    if ((address.length === 21 || address.length === 20) && address.endsWith('S') && /^\d+$/.test(address.substr(0, address.length - 1))) {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'RISE') {
    if ((address.length === 21 || address.length === 20) && address.endsWith('R') && /^\d+$/.test(address.substr(0, address.length - 1))) {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else {
    try {
      var valid = WAValidator.validate(address, symbol);// '1KFzzGtDdnq5hrwxXGjwVnKzRbvf8WVxck', 'BTC'

      if (valid) {
        subprocesses.push("stop(0,'valid')");
      } else {
        subprocesses.push("stop(0,'invalid')");
      }
    } catch (e) {
      subprocesses.push("stop(1,'Symbol " + symbol + " is not supported by wallet-address-validator')");
    }
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}
