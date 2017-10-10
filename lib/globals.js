// globals.js - gets all dependency globals (and constants) in place
//  - bundled nicely for overview convenience
// (c) 2016 metasync r&d / internet of coins project

// constants
DEBUG = false;		    // adds debug messages to stdout

//  superglobals
cached = {};
xpath = [];
last_xpath = [];

// include js-NaCl everywhere
nacl_factory = require('./crypto/nacl.js');
nacl = nacl_factory.instantiate();

// global functions
jstr = function(data) { return JSON.stringify(data); }

Decimal = require('./crypto/decimal-light.js');
Decimal.set({ precision: 64});  // cryptocurrencies (like for example Ethereum) require extremely high precision!
DJB2 = require('./crypto/hashDJB2');
hex2dec = require('./crypto/hex2dec');

fromInt = function(input,factor) {
  f = Number(factor);
  x = new Decimal(String(input));
  return x.times((f>1?'0.'+new Array(f).join('0'):'')+'1');
}

toInt = function(input,factor) {
  f = Number(factor);
  x = new Decimal(String(input));
  return x.times('1'+(f>1?new Array(f+1).join('0'):''));
}

padFloat = function(input,factor) {
  f = Number(factor);
  x = new Decimal(String(input));
  return x.toFixed(f).toString();
}
