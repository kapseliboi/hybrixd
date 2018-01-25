// globals.js - gets all dependency globals (and constants) in place
//  - bundled nicely for overview convenience
// (c) 2016 metasync r&d / internet of coins project

// add enough event emitter listeners
require('events').EventEmitter.defaultMaxListeners = 20;

//  superglobals
cached = {};
last_xpath = []; // avoid double display logging of routing

// proc and auth globals
global.hybridd = {};
global.hybridd.proc = {};
global.hybridd.procqueue = {};
global.hybridd.APIqueue = {};
global.hybridd.APIthrottle = {};
global.hybridd.asset = {};
global.hybridd.source = {};
global.hybridd.xauth = {};
global.hybridd.xauth.session = [];
global.hybridd.schedulerInterval = null; // the schedulers main interval loop
global.hybridd.schedulerInitiated = false;  // whether the scheduler has been initiated
global.hybridd.APIqueueInterval = null;  // the API queue main interval loop
global.hybridd.APIqueueInitiated = false;  // whether the API queue has been initiated
global.hybridd.uiServer = null;

// static configuration recipe's for essential functionality
//global.hybridd.asset['*']={module:'meta'};
global.hybridd.source['storage']={id:'storage',module:'storage'};

// include js-NaCl everywhere
nacl_factory = require("./crypto/nacl.js");
nacl = nacl_factory.instantiate();

// global functions
jstr = function(data) { return JSON.stringify(data); };
jsdom = require("jsdom");                         // virtual DOM for executing deterministic code
crypto = require("crypto");                       // override browserify's crypto
Decimal = require("./crypto/decimal-light.js");
Decimal.set({precision: 64});                     // cryptocurrencies (like for example Ethereum) require extremely high precision!
DJB2 = require("./crypto/hashDJB2");              // fast DJB2 hashing
hex2dec = require("./crypto/hex2dec");            // convert long HEX to decimal
RESTclient = require("./rest").Client;            // connect to REST API's
storage = require("./storage");                   // key-value storage

//
// quick go-to global functions (to be cleaned up)
//

logger = function(text) {
  if(typeof UI!="undefined" && typeof UI.logger!="undefined") {
    UI.logger.insertBottom(text);
  } else { console.log(text); }
};

fromInt = function(input,factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times((f>1?"0."+new Array(f).join("0"):"")+"1");
};

toInt = function(input,factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times("1"+(f>1?new Array(f+1).join("0"):""));
};

padFloat = function(input,factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.toFixed(f).toString();
};

isToken = function isToken(symbol) {
  return (symbol.indexOf('.')!==-1?1:0);
}

// constants
DEBUG = false; // adds debug messages to stdout
