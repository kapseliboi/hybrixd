// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// required libraries in this context
let scheduler = require('../../lib/scheduler');

// exports
exports.init = init;
exports.exec = exec;

// https://github.com/ognus/wallet-address-validator
let WAValidator;

// initialization function
function init () {
  WAValidator = require('wallet-address-validator');
}
function exec (properties) {
  let command = properties.command;
  let processID = properties.processID;
  let subprocesses = [];
  // set request to what command we are performing
  global.hybrixd.proc[processID].request = properties.command;

  let symbol = command[0].toUpperCase().split('.')[0];
  let address = command[1];

  if (symbol === 'UBQ' || symbol === 'EXP') { symbol = 'ETH'; }
  if (symbol === 'XCP' || symbol === 'OMNI') { symbol = 'BTC'; }

  if (symbol === 'DUMMY') { // MOVED TO RECIPE
    if (address === '_dummyaddress_') {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol.startsWith('MOCK')) { // MOVED TO RECIPE
    if (Number(address) >= 0 && Number(address) < 1000) {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'BCH') { // MOVED TO RECIPE
    if (/^[a-zA-Z0-9]{34}$/.test(address)) {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'BTS') { // MOVED TO RECIPE
    subprocesses.push("data {'method':'call', 'params':[0,'get_account_by_name',['" + address + "']], id: Math.floor(Math.random()*10000)}");
    subprocesses.push("curl('asset://bts','','POST')");
    subprocesses.push("tran('.result.id',2,1)");
    subprocesses.push("stop(0,'invalid')");
    subprocesses.push("stop(0,'valid')");
  } else if (symbol === 'XEM') { // MOVED TO RECIPE
    if (/^([a-zA-Z0-9]{6}-){6}[a-zA-Z0-9]{4}$/.test(address)) {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'WAVES') { // MOVED TO RECIPE
    // Reference https://docs.wavesplatform.com/en/technical-details/data-structures.html
    // TODO can be improved (checksum)
    if (/^3[A-Za-z0-9]{34}$/.test(address)) {
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    } //
  } else if (symbol === 'NXT') { // MOVED TO RECIPE
    if (/^NXT(-[A-HJ-N-P-Z2-9]{4}){4}[A-HJ-N-P-Z2-9]$/.test(address)) {
      // Reference implement https://bitcoin.stackexchange.com/questions/30341/programmatically-validating-nxt-addresses
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'XEL') { // MOVED TO RECIPE
    if (/^XEL(-[A-HJ-N-P-Z2-9]{4}){4}[A-HJ-N-P-Z2-9]$/.test(address)) {
      // Reference https://bitcoin.stackexchange.com/questions/30341/programmatically-validating-nxt-addresses
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'BURST') { // MOVED TO RECIPE
    if (/^(BURST-)?([A-HJ-N-P-Z2-9]{4}-){3}[A-Z0-9]{5}$/.test(address)) {
      // Reference https://bitcoin.stackexchange.com/questions/30341/programmatically-validating-nxt-addresses
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'ARK') { // MOVED TO RECIPE
    if (address.length === 34 && address.startsWith('A')) {
      // TODO improve
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'LSK') { // MOVED TO RECIPE
    if ((address.length === 21 || address.length === 20) && address.endsWith('L') && /^\d+$/.test(address.substr(0, address.length - 1))) {
      // TODO should be improved
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'SHIFT') { // MOVED TO RECIPE
    if ((address.length === 21 || address.length === 20) && address.endsWith('S') && /^\d+$/.test(address.substr(0, address.length - 1))) {
      // TODO should be improved
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'RISE') { // MOVED TO RECIPE
    if ((address.length === 21 || address.length === 20) && address.endsWith('R') && /^\d{20}R$/.test(address.substr(0, address.length - 1))) {
      // TODO should be improved
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else if (symbol === 'TRX') { // MOVED TO RECIPE
    if (address.length === 34 && address.startsWith('T')) {
      // TODO should be improved
      subprocesses.push("stop(0,'valid')");
    } else {
      subprocesses.push("stop(0,'invalid')");
    }
  } else {
    try {
      let valid = WAValidator.validate(address, symbol); // '1KFzzGtDdnq5hrwxXGjwVnKzRbvf8WVxck', 'BTC'

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
