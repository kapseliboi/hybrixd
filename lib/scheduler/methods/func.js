const modules = require('../../modules');
const scheduler = require('../../scheduler/scheduler');
const vars = require('../vars');

/**
   * Execute a node side module function. Only if the script is run from a recipe with a non Quartz module defined.
   * @param {String} name - Name of the function.
   * @param {String} [legacyData] - Depreciated pass data in an depreciated manner to a func.
   * @category Process
   * @example
   * qrtz:
   * data 'hello'
   * func 'myFunction'
   * done               // returns 'hello world'
   *
   * module.js:
   * function myFunction(proc,data){
   *   proc.done(data+' world');
   * }
   */
exports.func = data => function (p, command, xdata) { // TODO remove legacy xdata now used by ethereum module
  const processIDSplit = p.processID.split('.');
  const rootProcessID = processIDSplit[0];
  const rootProcess = global.hybrixd.proc[rootProcessID];

  command = command.split('/'); // "dummy/balance/_dummyaddress_" => ["dummy","balance","_dummyaddress_"]
  const funcname = command[0];

  const moduleID = rootProcess.recipe.module;
  let ydata = typeof xdata === 'undefined' ? data : xdata;
  if (!modules.module.hasOwnProperty(moduleID)) {
    this.fail(p, `Unknown module '${moduleID}'`);
  } else if (!modules.module[moduleID].main.hasOwnProperty(funcname)) {
    this.fail(p, `Unknown function '${funcname}' for module '${moduleID}'`);
  } else {
    if (typeof xdata !== 'undefined') { // TODO legacy mode. DEPRICIATED
      if (typeof ydata !== 'object') { ydata = {}; }
      ydata.processID = p.processID;
      modules.module[moduleID].main[ funcname ](ydata);
    } else {
      const pass = data => { global.hybrixd.proc[p.parentID].data = data; };
      const done = data => { this.pass(p, data); };
      const stop = (err, data) => { if (err !== 0) { this.stop(p, err, data); } else { global.hybrixd.proc[p.parentID].data = data; } };
      const fail = (err, data) => { this.fail(p, err, data); };
      const prog = (step, steps) => { global.hybrixd.proc[p.parentID].progress = typeof steps === 'undefined' ? step : (step / steps); };

      const mime = mimetype => { scheduler.mime(p.processID, mimetype); };
      const peek = key => { const result = vars.peek(p, key); return result.e ? undefined : result.v; };
      const poke = (key, value) => { vars.poke(p, key, value); };
      // TODO help
      const sessionID = global.hybrixd.proc[p.processID].sessionID;
      // If no explicit command is supplied then loop through all parents to down root to find the first available command
      if (command.length === 1) { // only a function name has been passed, so no explicit command
        for (let i = 0; i < processIDSplit.length; ++i) {
          const parentProcessID = processIDSplit.slice(0, processIDSplit.length - i).join('.');
          const parentCommand = global.hybrixd.proc[parentProcessID].command;
          if (parentCommand && parentCommand.length > 1) {
            command = parentCommand;
            break;
          }
        }
      }
      modules.module[moduleID].main[ funcname ]({pass, done, stop, fail, peek, poke, sessionID, command: JSON.parse(JSON.stringify(command))}, ydata);
    }
  }
};
