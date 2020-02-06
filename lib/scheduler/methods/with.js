const QrtzFunction = require('../function').QrtzFunction;

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
exports.with = data => function (p, variableName, head, properties) {
  const args = [].slice.call(arguments).slice(2); // loose p and variableName
  const statements = [];

  // TODO create statements directly with static paramers so no parsing is required
  if (typeof head === 'string') { // single step with process
    statements.push(args);
  } else if (head instanceof Array) { // multi step with process
    for (let statement of args) {
      // TODO check if array
      if (statement[0] === true) { statement[0] = 'true'; }
      statements.push(statement);
    }
  } else {
    p.fail('with: expects qrtz command to be a string or array.');
    return;
  }
  statements.push('done');

  const r = p.peek(variableName);
  const vdata = r.v;
  const qrtzFunction = new QrtzFunction(statements);
  const callback = (error, vdata) => {
    if (error === 0) {
      p.poke(variableName, vdata);
      p.next(data);
    } else {
      p.fail(error, vdata);
    }
  };
  p.fork(qrtzFunction, vdata, true, {callback, shareScope: true});
};
