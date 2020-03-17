//
// hybrixd - main.js
//

require('./globals');
global.hybrixd.logger(['info', 'hybrixd'], 'hybrixd is running...');
process.on('uncaughtException', function (error) {
  global.hybrixd.logger(['error', 'fatal'], error);
  process.exit(1);
});

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
sequential.next([
  naclFactory.init,
  recipes.init,
  conf.init,
  modules.init,
  servers.init,
  scheduler.initialize,
  APIqueue.initialize,
  cache.init,
  boot.init
]);
