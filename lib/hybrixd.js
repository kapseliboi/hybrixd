//
// hybrixd - main.js
//
/*DISABLED const introspection = require('why-is-node-running');
exports.introspection = introspection;
*/

require('./globals');
global.hybrixd.logger(['info', 'hybrixd'], 'hybrixd is running...');

process.on('uncaughtException', error => {
  global.hybrixd.logger(['error', 'fatal'], error);
  process.exit(1);
});

let flagStopped = false;
const stop = require('./stop').stop;

const closer = type => () => {
  if (flagStopped) {
    global.hybrixd.logger(['warn', 'hybrixd'], 'Forcing stop.');
    process.exitCode = 0;
    process.exit(0);
  } else {
    if (type === 'TERM') {
      flagStopped = true;
      global.hybrixd.logger(['info', 'hybrixd'], 'Shutdown requested.');
      stop();
    }
  }
};
process.on('SIGTERM', closer('TERM'));
process.on('SIGINT', closer('INT'));

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
