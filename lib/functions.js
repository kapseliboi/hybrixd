// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd - functions.js
// Collection of process and other ubiquitous functions.

// handy functions that can be imported into modules

exports.clean = clean;
exports.activate = activate;
exports.sortArrayByObjKey = sortArrayByObjKey;
exports.sortObjectByKey = sortObjectByKey;
exports.sequential = sequential;

// cleans a string
function clean(dirty) {
  var clean_str = dirty.toString().replace(/[^A-Za-z0-9\.\*]/g,"");
  return clean_str;
}

// activate (deterministic) code from a string
function activate(code) {
  if(typeof code == "string") {
    // interpret deterministic library in a virtual DOM environment
    const {JSDOM} = jsdom;
    var dom = (new JSDOM("", {runScripts: "outside-only"})).window;
    dom.window.nacl = nacl; // inject NACL into virtual DOM
    dom.window.crypto = crypto; // inject nodeJS crypto to supersede crypto-browserify
    dom.window.logger = logger; // inject the logger function into virtual DOM
    dom.eval("var deterministic = (function(){})(); "+code+";"); // init deterministic code
    return dom.window.deterministic;
  }
  console.log(" [!] Error: cannot activate deterministic code!");
  return function() {};

}

// sort an array by Object Key
// Used by blockexplorer module
function sortArrayByObjKey(arr,key,desc) {
  // make key value index for unspents
  order = (typeof order!="undefined"?desc:false);
  var unordered = {};
  for (var i in arr) {
    unordered[arr[i][key]] = i;
  }
  // sort unspent list
  var ordered = [];
  var cnt = 0;
  Object.keys(unordered).sort().
    forEach((key) => {
      ordered[cnt] = arr[unordered[key]];
      cnt++;
    });
  if(desc) { ordered = ordered.reverse(); }
  return ordered;
}

// sort an object by key
// Used by list and source to return their items sorted
function sortObjectByKey(obj) {
  return Object.keys(obj).
    sort().
    reduce((a, v) => {
      a[v] = obj[v];
      return a;
    }, {});
}

// handle a list of callbacks sequentially
function sequential(callbackArray){
  if(typeof callbackArray === 'undefined'){return;}
  if(callbackArray.constructor === Array){ // list of sequential functions
    if(callbackArray.length>0){
      var f = callbackArray[0];
      f(callbackArray.slice(1));
    }
  }else{ // singular function
    callbackArray();
  }
}
