//
// hybrixd - main.js
//

// exports
exports.main = main;

// required hybrixd components
const recipes = require('./recipes');
const modules = require('./modules');
const scheduler = require('./scheduler/scheduler');
const APIqueue = require('./APIqueue');
const conf = require('./conf/conf');
const servers = require('./servers/servers');
const cache = require('./cache');
const boot = require('./boot');
const naclFactory = require('./naclFactory');
const functions = require('./functions');

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
