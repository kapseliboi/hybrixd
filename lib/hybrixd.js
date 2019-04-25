//
// hybrixd - main.js
//

// required hybrixd components
const recipes = require('./recipes');
const modules = require('./modules');
const scheduler = require('./scheduler/scheduler');
const APIqueue = require('./APIqueue/APIqueue');
const conf = require('./conf/conf');
const servers = require('./servers/servers');
const cache = require('./cache');
const boot = require('./boot');
const naclFactory = require('./util/naclFactory');
const sequential = require('./util/sequential');

// initialize components sequentially
sequential.next([naclFactory.init,
  recipes.init,
  modules.init,
  conf.init,
  servers.init,
  scheduler.initialize,
  APIqueue.initialize,
  cache.init,
  boot.init]
);
