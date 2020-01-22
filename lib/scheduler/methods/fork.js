const modules = require('../../modules');
const scheduler = require('../scheduler');

/**
   * Creates a new process by calling the command asynchronously.
   * @category Process
   * @param {String} command - A string containing the call and path. "command/a/b". This calls 'command' using $1 = "a", $2 = "b".
   * @param {Object} [data=data] - Optional data to be passed to the new process.
   * @param {Number} [childId=0] - If undefined then the new process will be independant. If 0 or larger it will be instantiated as a child process of the current process.
   * @example
   * fork "balance/_dummyaddress_"   // starts a process to retrieve the dummy balance and continue without waiting for a reply
   */
exports.fork = data => function (p, command, xdata, childId) {
  const ydata = typeof xdata === 'undefined' ? data : xdata;
  const rootProcessID = p.processID.split('.')[0];
  const rootProcess = global.hybrixd.proc[rootProcessID]; // the root process
  command = command.split('/'); // "dummy/balance/_dummyaddress_" => ["dummy","balance","_dummyaddress_"]
  const path = rootProcess.path && rootProcess.command
    ? rootProcess.path.slice(0, rootProcess.path.length - rootProcess.command.length).concat(command) // "/asset/dummy/do/something" => "/asset/dummy/fork/me" (as arrays)
    : null;
  let requestPID;
  let waitForChildren = false;
  if (typeof childId === 'undefined') {
    requestPID = 0;
  } else {
    waitForChildren = true;
    requestPID = p.processID + '.';
  }

  const childPID = scheduler.init(requestPID, {data: ydata, sessionID: rootProcess.sessionID, recipe: rootProcess.recipe, path: path, command: command});
  global.hybrixd.proc[childPID].timeout = rootProcess.timeout; // set initial timeout to what our current process is using
  // the command xpath passed to the Quartz function: "functionId/$1/$2/$3/..."
  const module = rootProcess.recipe.module || 'quartz';
  let main = modules.module[module].main;
  if (!main.hasOwnProperty('exec')) {
    main = modules.module['quartz'].main;
  }
  if (rootProcess.recipe.hasOwnProperty('quartz') && rootProcess.recipe.quartz.hasOwnProperty(command[0])) {
    main = global.hybrixd.module['quartz'].main;
  }
  main.exec({processID: childPID, parentID: p.processID, target: rootProcess.recipe, mode: rootProcess.recipe.mode, factor: rootProcess.recipe.factor, command: command});
  if (!waitForChildren) {
    this.next(p, 0, childPID);
  }
  return childPID;
};
