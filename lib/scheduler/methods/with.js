const scheduler = require('../../scheduler/scheduler');
const vars = require('../vars');

function handleWithCmds (p, command, subprocesses, argsArray) {
  if (typeof command === 'string') {
    let args = '';
    for (let i = 3; i < Object.keys(argsArray).length; i++) {
      args = args + ' ' + JSON.stringify(argsArray[String(i)]);
    }
    if (command.substr(0, 4) === 'done') {
      if (args !== '') {
        subprocesses.push('data ' + args);
      }
      subprocesses.push('jump ' + (Object.keys(argsArray).length - i));
    } else {
      subprocesses.push(command.substr(0, 4) + args);
    }
  } else {
    if (Object.keys(argsArray).length > 10) {
      this.fail(p, 'with error: contains more than 10 commands! (Hint: split your code into multiple lines!)');
    } else {
      for (let j = 2; j < Object.keys(argsArray).length; j++) {
        command = argsArray[String(j)];
        let args = '';
        for (let i = 1; i < command.length; i++) {
          args = args + ' ' + JSON.stringify(command[i]);
        }
        if (command[0].substr(0, 4) === 'done') {
          if (args !== '') {
            subprocesses.push('data ' + args);
          }
          subprocesses.push('jump ' + (Object.keys(argsArray).length - j));
        } else {
          subprocesses.push(command[0].substr(0, 4) + args);
        }
      }
    }
  }
}

/**
   * Performs a data command using a specific variable. The data buffer is left untouched.
   * @category Process
   * @param {String} variable      -  Variable to read/write to.
   * @param {String} qrtz command  -  A string containg the Qrtz command.
   * @param {Object} a, b, c, etc. -  Arguments to be passed to the Qrtz command.
   * @example
   * with("someVariable","math","+1")                              // Increment $someVariable by +1.
   * with("someVariable",["math","+1"])                            // Increment $someVariable by +1. (same as above, different notation)
   * with("someVariable",["math","+1"],["math","+100"],["atom"])   // Increment $someVariable by +1, +100, then convert to atomic units.
   */
exports.with = data => function (p, variable, command, properties) {
  const subprocesses = ['time "$timeout"'];
  let result;
  if (variable.substr(-2) === '[]') {
    variable = variable.substr(0, (variable.length - 2));
    result = vars.peek(p, variable);
    if (result.e > 0) {
      result.v = undefined;
    }
    if (result.v instanceof Array) {
      subprocesses.push('poke tmp_WalkA []');
      for (let k = 0; k < result.v.length; k++) {
        subprocesses.push('data ' + JSON.stringify(result.v[k]));
        handleWithCmds(p, command, subprocesses, arguments);
        subprocesses.push('poke tmp_WalkB');
        subprocesses.push('peek tmp_WalkA');
        subprocesses.push('push $tmp_WalkB');
      }
    } else {
      this.fail(p, 'with error: specified variable is not an array!');
    }
  } else {
    result = vars.peek(p, variable);
    if (result.e > 0) {
      result.v = undefined;
    }
    handleWithCmds(p, command, subprocesses, arguments);
  }
  subprocesses.push('@done_with');
  subprocesses.push('done');
  // fire the Qrtz-language program into the subprocess queue
  const processStepIdSplit = p.processID.split('.');
  const rootID = processStepIdSplit[0];
  const rootProcess = global.hybrixd.proc[rootID];
  // TODO make proper childof p.processID+'.'
  const childPID = scheduler.init(p.processID + '.', {data: result.v, sessionID: rootProcess.sessionID, recipe: rootProcess.recipe});
  scheduler.fire(childPID, subprocesses);
  scheduler.wait(p, childPID, 0, (p, err, xdata) => {
    if (err) {
      this.fail(p, err);
    } else {
      const result = vars.poke(p, variable, xdata);
      if (result.e > 0) {
        this.fail(p, result.v);
      } else {
        this.next(p, 0, data);
      }
    }
  });
};
