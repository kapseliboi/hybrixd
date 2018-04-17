// conf.js -> handles loading of configuration
//
// (c)2018 internet of coins project - Rouke Pouw
//

// export every function
exports.init = init;
exports.reload = reload;

var ini = require("./ini");
var functions = require("./functions");
var fs = require("fs");

function init(callbackArray){
  Object.assign(global.hybridd, ini.parse(fs.readFileSync("../hybridd.conf", "utf-8"))); // merge object
  if (fs.existsSync("../hybridd.local.conf")) { //  load local conf if available
    Object.assign(global.hybridd, ini.parse(fs.readFileSync("../hybridd.local.conf", "utf-8"))); // merge object
  }

  // ignore TLS certificate errors?
  if(typeof global.hybridd.ignoreTLSerror !== 'undefined' && global.hybridd.ignoreTLSerror) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  //load route tree from file
  global.hybridd.routetree = JSON.parse(fs.readFileSync("./router/routetree.json", "utf8")); // iterate through routes.json

  if( global.hybridd.hasOwnProperty('defaultMaxListeners')){
    require('events').EventEmitter.defaultMaxListeners = global.hybridd.defaultMaxListeners;
  }else{
    require('events').EventEmitter.defaultMaxListeners = 25;
  }

  // load default quartz functions
  global.hybridd.defaultQuartz = JSON.parse(fs.readFileSync("../modules/quartz/default.quartz.json", "utf8"));


  functions.sequential(callbackArray);
}

function reload(callbackArray){
  //TODO clear current conf and reset everything to default
  init(callbackArray);
  //Todo: if conf for ui/rest ports changes we need to reload those as well
}
