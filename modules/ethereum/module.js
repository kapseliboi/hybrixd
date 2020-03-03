// (C) 2015 Internet of Coins / Joachim de Koning
// hybrixd module - ethereum/module.js
// Module to connect to ethereum or any of its derivatives

// required libraries in this context
const fs = require('fs');
const LZString = require('../../common/crypto/lz-string');

// exports
exports.encode = encode;

// activate (deterministic) code from a string
function activate (code) {
  if (typeof code === 'string') {
    eval('window.deterministic = (function(){})(); ' + code); // init deterministic code
    return window.deterministic;
  }
  global.hybrixd.logger(['error', 'ethereum'], 'Cannot activate deterministic code!');
  return function () {};
}

const dcode = String(fs.readFileSync('../modules/deterministic/ethereum/deterministic.js.lzma'));
const ethDeterministic = activate(LZString.decompressFromEncodedURIComponent(dcode));

function encode (proc, address) {
  // returns the encoded binary (as a Buffer) data
  const encoded = ethDeterministic.encode({func: 'balanceOf(address):(uint256)', vars: ['address'], 'address': proc.command[1]});
  proc.done(encoded);
}
