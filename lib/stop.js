exports.stop = stop;

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

// 'blabla %d bla', 1 -> 'blabla 1 bla'
function printf (a, b) {
  if (typeof b === 'undefined') return a + '\n';
  return a.replace(/%./g, () => b) + '\n';
}

function stop (action, debug = false) {
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
      /*DISABLED if (debug) {
        setTimeout(() => {
          const {introspection} = require('./hybrixd');

          let data = '';
          const logger = {
            log: (a, b) => { data += printf(a, b); },
            error: (a, b) => { data += printf(a, b); }
          };

          introspection(logger);
          console.log(data);
          process.exitCode = 0;
        }, 5000);
      } else {*/
        process.exitCode = 0;
      //}
    }
  ]);
  return data;
}
