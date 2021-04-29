const fs = require('fs');
// const recipes = require('./recipes');
// const modules = require('./modules');
const scheduler = require('./scheduler/scheduler');
const APIqueue = require('./APIqueue/APIqueue');
// const conf = require('./conf/conf');
const servers = require('./servers/servers');
const cache = require('./cache');
// const boot = require('./boot');
// const naclFactory = require('./util/naclFactory');
const sequential = require('./util/sequential');

function setOnStopAction (action) {
  fs.writeFileSync('../var/onstop', action);
}

function clearOnStopAction () {
  if (fs.existsSync('../var/onstop')) fs.unlinkSync('../var/onstop');
}

const stop = action => {
  let data;
  switch (action) {
    case 'restart' :
      data = 'Restarting...';
      setOnStopAction('restart');
      break;
    case 'update' :
      setOnStopAction('update');
      data = 'Updating...';
      break;
    default:
      clearOnStopAction();
      data = 'Stopping...';
  }
  global.hybrixd.logger(['info', 'hybrixd'], data);
  sequential.next([
    APIqueue.pause,
    cache.pause,
    servers.closeAll,
    scheduler.stopAll,
    () => {
      global.hybrixd.logger(['info', 'hybrixd'], 'All shutdown requests have been made. (Ctrl+C to force shutdown)');
      // introspection(logger) -> "x processes pending."
      process.exitCode = 0;
    }
  ]);
  return data;
};

exports.stop = stop;
