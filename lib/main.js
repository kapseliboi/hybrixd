//
// hybrixd - main.js
//

// exports
exports.main = main;

// required hybrixd components
var recipes = require('./recipes');
var modules = require('./modules');
var scheduler = require('./scheduler');
var APIqueue = require('./APIqueue');
var conf = require('./conf');
var servers = require('./servers');
var cache = require('./cache');
var boot = require('./boot');
var naclFactory = require('./naclFactory');
var functions = require('./functions');

function main (route) {
  // initialize components sequentially
  functions.sequential([naclFactory.init,
    conf.init,
    recipes.init,
    modules.init,
    servers.init,
    scheduler.initialize,
    APIqueue.initialize,
    cache.init,
    boot.init]
  );
}
