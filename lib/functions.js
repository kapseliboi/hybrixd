// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd - functions.js
// Collection of process and other ubiquitous functions.

// var jsdom = require('jsdom'); // virtual DOM for executing deterministic code
var crypto = require('crypto'); // override browserify's crypto

var Decimal = require('../common/crypto/decimal-light.js');
Decimal.set({precision: 64}); // cryptocurrencies (like for example Ethereum) require extremely high precision!

// cleans a string
function clean (dirty) {
  var clean_str = dirty.toString().replace(/[^A-Za-z0-9\.\*]/g, '');
  return clean_str;
}

var logger = function (text) {
  if (typeof UI !== 'undefined' && typeof UI.logger !== 'undefined') {
    UI.logger.insertBottom(text);
  } else { console.log(text); }
};

// activate (deterministic) code from a string
function activate (code) {
  if (typeof code === 'string') {
    // interpret deterministic library in a virtual DOM environment
    //    const {JSDOM} = jsdom;
  //  var dom = (new JSDOM('', {runScripts: 'outside-only'})).window;
    //    dom.window.nacl = nacl; // inject NACL into virtual DOM
  //  dom.window.crypto = crypto; // inject nodeJS crypto to supersede crypto-browserify
    //    dom.window.logger = logger; // inject the logger function into virtual DOM
    // var window = dom.window;
    eval('window.deterministic = (function(){})(); ' + code); // init deterministic code
    return window.deterministic;
  }
  console.log(' [!] error: cannot activate deterministic code!');
  return function () {};
}

// implode like in PHP
// Used by modules
function implode (glue, pieces) {
  //  discuss at: http://phpjs.org/functions/implode/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Waldo Malqui Silva
  // improved by: Itsacon (http://www.itsacon.net/)
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  //   example 1: implode(' ', ['Kevin', 'van', 'Zonneveld']);
  //   returns 1: 'Kevin van Zonneveld'
  //   example 2: implode(' ', {first:'Kevin', last: 'van Zonneveld'});
  //   returns 2: 'Kevin van Zonneveld'
  var i = '';

  var retVal = '';

  var tGlue = '';
  if (arguments.length === 1) {
    pieces = glue;
    glue = '';
  }
  if (typeof pieces === 'object') {
    if (Object.prototype.toString.call(pieces) === '[object Array]') {
      return pieces.join(glue);
    }
    for (i in pieces) {
      retVal += tGlue + pieces[i];
      tGlue = glue;
    }
    return retVal;
  }
  return pieces;
}

// replace multiple strings
// example: replacebulk("testme",['es','me'],['1','2']); => "t1t2"
function replaceBulk( str, findArray, replaceArray ){
  var i, regex = [], map = {}; 
  for( i=0; i<findArray.length; i++ ){ 
    regex.push( findArray[i].replace(/([-[\]{}()*+?.\\^$|#,])/g,'\\$1') );
    map[findArray[i]] = replaceArray[i]; 
  }
  regex = regex.join('|');
  str = str.replace( new RegExp( regex, 'g' ), function(matched){
    return map[matched];
  });
  return str;
}

// sort an array by Object Key
// Used by blockexplorer module
function sortArrayByObjKey (arr, key, desc) {
  // make key value index for unspents
  order = (typeof order !== 'undefined' ? desc : false);
  var unordered = {};
  for (var i in arr) {
    unordered[arr[i][key]] = i;
  }
  // sort unspent list
  var ordered = [];
  var cnt = 0;
  Object.keys(unordered).sort()
    .forEach((key) => {
      ordered[cnt] = arr[unordered[key]];
      cnt++;
    });
  if (desc) { ordered = ordered.reverse(); }
  return ordered;
}

// sort an object by key
// Used by list and source to return their items sorted
function sortObjectByKey (obj) {
  return Object.keys(obj)
    .sort()
    .reduce((a, v) => {
      a[v] = obj[v];
      return a;
    }, {});
}

// handle a list of callbacks sequentially
function sequential (callbackArray) {
  if (typeof callbackArray === 'undefined') { return; }
  if (callbackArray.constructor === Array) { // list of sequential functions
    if (callbackArray.length > 0) {
      var f = callbackArray[0];
      f(callbackArray.slice(1));
    }
  } else { // singular function
    callbackArray();
  }
}

function uglyClone (obj) { return JSON.parse(JSON.stringify(obj)); }

function uglyMerge (target, source) {
  for (var key in source) {
    target[key] = uglyClone(source[key]);
  }
}

var fromInt = function (input, factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times((f > 1 ? '0.' + new Array(f).join('0') : '') + '1');
};

var toInt = function (input, factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times('1' + (f > 1 ? new Array(f + 1).join('0') : ''));
};

// used in a couple of asset/blockexplorer modules
var padFloat = function (input, factor) { // "12.34" => "12.34000000" (Number of decimals equal to factor)
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.toFixed(f).toString();
};

var isToken = function isToken (symbol) {
  return (symbol.indexOf('.') !== -1 ? 1 : 0);
};

var hex2dec = require('../common/crypto/hex2dec'); // convert long HEX to decimal still being used by ethereum quartz code

// handy functions that can be imported into modules
exports.clean = clean;
exports.activate = activate;
exports.sortArrayByObjKey = sortArrayByObjKey;
exports.sortObjectByKey = sortObjectByKey;
exports.sequential = sequential;
exports.implode = implode;
exports.uglyMerge = uglyMerge; // Used for recipe inheritance
exports.fromInt = fromInt;
exports.toInt = toInt;
exports.padFloat = padFloat;
exports.isToken = isToken;
exports.hex2dec = hex2dec;
