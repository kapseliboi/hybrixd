// conf.js -> handles loading of configuration
//
// (c)2018 internet of coins project - Rouke Pouw
//

// export every function
exports.init = init;
exports.reload = reload;

const ini = require('./ini');
const functions = require('./functions');
const fs = require('fs');

function init (callbackArray) {
  Object.assign(global.hybrixd, ini.parse(fs.readFileSync('../hybrixd.conf', 'utf-8'))); // merge object
  if (fs.existsSync('../hybrixd.local.conf')) { //  load local conf if available
    Object.assign(global.hybrixd, ini.parse(fs.readFileSync('../hybrixd.local.conf', 'utf-8'))); // merge object
  }

  // ignore TLS certificate errors?
  if (typeof global.hybrixd.ignoreTLSerror !== 'undefined' && global.hybrixd.ignoreTLSerror) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  // load route tree from file
  global.hybrixd.routetree = JSON.parse(fs.readFileSync('./router/routetree.json', 'utf8')); // iterate through routes.json
  Object.keys(global.hybrixd.engine).forEach(id => {
    if (global.hybrixd.engine[id].hasOwnProperty('router')) { // load router data for engines
      global.hybrixd.routetree.engine[id] = global.hybrixd.engine[id].router;
    }
  });

  Object.keys(global.hybrixd.source).forEach(id => {
    if (global.hybrixd.source[id].hasOwnProperty('router')) { // load router data for sources
      global.hybrixd.routetree.source[id] = global.hybrixd.source[id].router;
    }
  });

  if (global.hybrixd.hasOwnProperty('defaultMaxListeners')) {
    require('events').EventEmitter.defaultMaxListeners = Number(global.hybrixd.defaultMaxListeners);
  } else {
    require('events').EventEmitter.defaultMaxListeners = 25;
  }

  // "hostname" => ["hostname"]   ,  "[hostname1,hostname2]" =>  ["hostname1","hostname2"]
  if (global.hybrixd.hostname) {
    if (global.hybrixd.hostname.startsWith('[')) {
      global.hybrixd.hostname = global.hybrixd.hostname.substr(1, global.hybrixd.hostname.length - 2).split(',');
    } else {
      global.hybrixd.hostname = [global.hybrixd.hostname];
    }
  } else {
    global.hybrixd.hostname = ['localhost'];
  }

  // load default quartz functions
  global.hybrixd.defaultQuartz = JSON.parse(fs.readFileSync('../modules/quartz/default.quartz.json', 'utf8'));
  functions.sequential(callbackArray);
}

function reload (callbackArray) {
  // TODO clear current conf and reset everything to default
  init(callbackArray);
  // Todo: if conf for ui/rest ports changes we need to reload those as well
}
