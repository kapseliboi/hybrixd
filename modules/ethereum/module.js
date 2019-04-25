// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - ethereum/module.js
// Module to connect to ethereum or any of its derivatives

// required libraries in this context
let fs = require('fs');
let LZString = require('../../common/crypto/lz-string');
let hex2dec = require('../../common/crypto/hex2dec'); // convert long HEX to decimal still being used by ethereum quartz code

let Decimal = require('../../common/crypto/decimal-light.js');
Decimal.set({precision: 64}); // cryptocurrencies (like for example Ethereum) require extremely high precision!

function fromInt (input, factor) {
  let f = Number(factor);
  let x = new Decimal(String(input));
  return x.times((f > 1 ? '0.' + new Array(f).join('0') : '') + '1');
}

function isToken (symbol) {
  return (symbol.indexOf('.') !== -1 ? 1 : 0);
}

// exports
exports.init = init;
exports.getFee = getFee;
exports.updateFee = updateFee;
exports.encode = encode;

// activate (deterministic) code from a string
function activate (code) {
  if (typeof code === 'string') {
    eval('window.deterministic = (function(){})(); ' + code); // init deterministic code
    return window.deterministic;
  }
  console.log(' [!] error: cannot activate deterministic code!');
  return function () {};
}

let ethDeterministic;

// initialization function
function init () {
  let dcode = String(fs.readFileSync('../modules/deterministic/ethereum/deterministic.js.lzma'));
  ethDeterministic = activate(LZString.decompressFromEncodedURIComponent(dcode));
}

function encode (proc, address) {
  // returns the encoded binary (as a Buffer) data
  const encoded = ethDeterministic.encode({func: 'balanceOf(address):(uint256)', vars: ['address'], 'address': proc.command[1]});
  proc.done(encoded);
}

function getFee (proc) {
  const symbol = proc.peek('symbol');
  const base = symbol.split('.')[0]; // in case of token fallback to base asset

  let fee;
  if (!isToken(symbol)) {
    fee = proc.peek('fee');
  } else {
    fee = (typeof global.hybrixd.asset[base].fee !== 'undefined' ? global.hybrixd.asset[base].fee * 2.465 : null);
  }
  proc.done(fee);
}

// standard function for postprocessing the data of a sequential set of instructions
function updateFee (proc, data) {
  let feefactor = 18;
  const symbol = 'eth';
  if (data === null) {
    console.log(' [!] Failed to update ' + symbol + ' fee');
    proc.fail(data);
  } else {
    if (typeof data.result !== 'undefined' && data.result > 0) {
      const newFee = fromInt(hex2dec.toDec(String(data.result)).times((21000 * 2)), feefactor);
      global.hybrixd.asset[symbol].fee = newFee;
      console.log(' [.] Update ' + symbol + ' fee to ' + newFee);
    }
    proc.done(data);
  }
}
