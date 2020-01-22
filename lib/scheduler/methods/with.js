const scheduler = require('../../scheduler/scheduler');
const vars = require('../vars');

function handleWithCmds (p, func, subprocesses, argsArray, k) {
  if (typeof func === 'string') { // with func arg1 arg2
    if (func.length !== 4) {
      this.fail(p, 'with error: illegal func ' + func);
      return;
    }
    let args = '';
    for (let i = 3; i < Object.keys(argsArray).length; i++) {
      args = args + ' ' + JSON.stringify(argsArray[String(i)]);
    }
    subprocesses.push(func.substr(0, 4) + args);
  } else { // with [func1,arg1_2,arg1_2] [func2,arg2_2,arg2_2]
    const length = Object.keys(argsArray).length;
    if (length > 10) {
      this.fail(p, 'with error: contains more than 10 commands! (Hint: split your code into multiple lines!)');
    } else {
      for (let j = 2; j < length; j++) {
        const funcAndArgs = argsArray[String(j)]; //   [funcj,argj_2,argj_2
        let args = '';
        for (let i = 1; i < funcAndArgs.length; i++) {
          args = args + ' ' + JSON.stringify(funcAndArgs[i]);
        }
        const func = funcAndArgs[0];
        if (func === true) {
          subprocesses.push('true' + args);
        } else if (typeof func !== 'string') {
          this.fail(p, 'with error: func not a string');
        } else if (func.length !== 4) {
          this.fail(p, 'with error: illegal func ' + func);
        } else if (func.substr(0, 4) === 'done') {
          if (args !== '') {
            subprocesses.push('data ' + args);
          }
          subprocesses.push('jump ' + (Object.keys(argsArray).length - j));
        } else {
          subprocesses.push(func + args);
        }
      }
    }
  }
}

/**
   * Performs a data command using a specific variable. The data buffer is left untouched.
   * @category Process
   * @param {String} variable - Variable to read/write to.
   * @param {String|Array} qrtz command - A string containg the Qrtz command. When using an array, the arguments may be specified as elements in the array.
   * @param {String|Array} a, b, c, etc. - Arguments to be passed to the Qrtz command, or further commands.
   * @example
   * with someVariable math '+1'                               // increment $someVariable by +1
   * with someVariable [math,'+1']                             // increment $someVariable by +1 (same as above, but array notation which is used for multiple commands)
   * with someVariable [math,'+1'] [math,'+100'] [atom]        // increment $someVariable by +1, then +100, then convert to atomic units
   */
exports.with = data => function (p, variable, command, properties) {
  const subprocesses = [];
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
        handleWithCmds(p, command, subprocesses, arguments, k);
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
  subprocesses.push('done');
  // fire the Qrtz-language program into the subprocess queue
  const processStepIdSplit = p.processID.split('.');
  const rootID = processStepIdSplit[0];
  const rootProcess = global.hybrixd.proc[rootID];
  // TODO make proper childof p.processID+'.'
  const childPID = scheduler.init(p.processID + '.', {data: result.v, sessionID: rootProcess.sessionID, recipe: rootProcess.recipe, timeout: rootProcess.timeout});
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
