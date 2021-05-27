const {QrtzFunction} = require('../function');

function multiArrayWith (p, variableName, qrtzFunction, data) {
  let hasFailed = false;
  let count = 0;
  for (let index = 0; index < variableName.length; ++index) {
    const variable = variableName[index];
    const r = p.peek(variable);
    const vdata = r.v;
    const callback = (error, vdata) => {
      if (hasFailed) return; // only fail once
      if (error === 0) {
        ++count;
        p.poke(variable, vdata);
        if (count === variableName.length) p.next(data); // if all have succeeded continue
      } else {
        p.fail(error, vdata);
        hasFailed = true;
      }
    };
    p.fork(qrtzFunction, vdata, index, {callback, shareScope: true});
  }
}

function multiObjectWith (p, variableName, qrtzFunction, data) {
  let hasFailed = false;
  let count = 0;
  for (const variable in variableName) {
    const vdata = variableName[variable];
    const callback = (error, vdata) => {
      if (hasFailed) return; // only fail once
      if (error === 0) {
        ++count;
        p.poke(variable, vdata);
        if (count === Object.keys(variableName).length) p.next(data); // if all have succeeded continue
      } else {
        p.fail(error, vdata);
        hasFailed = true;
      }
    };
    p.fork(qrtzFunction, vdata, variable, {callback, shareScope: true});
  }
}

function eachArrayWith (p, variableName, qrtzFunction, data) {
  const [prefix, postfix] = variableName.split('[]'); // 'variable[].key'
  if (prefix) data = p.peek(prefix).v;
  if (data instanceof Array) {
    let hasFailed = false;
    let count = 0;
    for (let index = 0; index < data.length; ++index) {
      const subVariableName = prefix + '[' + index + ']' + postfix;
      const vdata = p.peek(subVariableName).v;
      const callback = (error, vdata) => {
        if (hasFailed) return; // only fail once
        if (error === 0) {
          ++count;
          p.poke(subVariableName, vdata);
          if (count === data.length) p.next(data); // if all have succeeded continue
        } else {
          p.fail(error, vdata);
          hasFailed = true;
        }
      };
      p.fork(qrtzFunction, vdata, index, {callback, shareScope: true});
    }
  } else p.fail('with: expects data of array type.');
}

function eachObjectWith (p, variableName, qrtzFunction, data) {
  const [prefix, postfix] = variableName.split('{}'); // 'variable[].key'
  if (prefix) data = p.peek(prefix).v;
  if (!(data instanceof Array) && typeof data === 'object' && data !== null) {
    let hasFailed = false;
    let count = 0;
    for (const key in data) {
      const subVariableName = prefix + '[' + key + ']' + postfix;
      const vdata = p.peek(subVariableName).v;
      const callback = (error, vdata) => {
        if (hasFailed) return; // only fail once
        if (error === 0) {
          ++count;
          p.poke(subVariableName, vdata);
          if (count === Object.keys(data).length) p.next(data); // if all have succeeded continue
        } else {
          p.fail(error, vdata);
          hasFailed = true;
        }
      };
      p.fork(qrtzFunction, vdata, key, {callback, shareScope: true});
    }
  } else p.fail('with: expects data of object type.');
}

function regularWith (p, variableName, qrtzFunction, data) {
  const r = p.peek(variableName);
  const vdata = r.v;
  const callback = (error, vdata) => {
    if (error === 0) {
      p.poke(variableName, vdata);
      return p.next(data);
    } else return p.fail(error, vdata);
  };
  p.fork(qrtzFunction, vdata, true, {callback, shareScope: true});
}
/**
   * Performs a data command using a specific variable. The data buffer is left untouched.
   * @category Process
   * @param {String} variable - Variable to read/write to.
   * @param {String|Array} qrtz command - A string containg the Qrtz command. When using an array, the arguments may be specified as elements in the array.
   * @param {String|Array} a, b, c, etc. - Arguments to be passed to the Qrtz command, or further commands.
   * @example
   * with someVariable math +1                             // increment $someVariable by +1
   * with someVariable [math,+1]                           // increment $someVariable by +1 (same as above, but array notation which is used for multiple commands)
   * with someVariable [math,+1] [math,+100] [atom]      // increment $someVariable by +1, then +100, then convert to atomic units
   * with [var1,var2] [math,+1] [math,+100] [atom]       // increment both variables by +1, then +100, then convert to atomic units
   * with {var1:1,var2:3} [math,+1] [math,+100] [atom]   // initializes and then increment both variables by +1, then +100, then convert to atomic units
   * with var[].a math +1       // if var = [{a:1},{a:2}] update to [{a:2},{a:3}]
   * with var{}.a math +1       // if var = {x:{a:1},y:{a:2}} update to {x:{a:2},y:{a:3}}
   */
exports.with = data => function (p, variableName, head, properties) {
  const args = [].slice.call(arguments).slice(2); // loose p and variableName
  const statements = [];

  // TODO create statements directly with static paramers so no parsing is required
  if (typeof head === 'string') { // single step with process
    statements.push(args);
  } else if (head instanceof Array) { // multi step with process
    for (const statement of args) {
      // TODO check if array
      if (statement[0] === true) { statement[0] = 'true'; }
      statements.push(statement);
    }
  } else {
    p.fail('with: expects qrtz command to be a string or array.');
    return;
  }
  statements.push('done');
  const qrtzFunction = new QrtzFunction(statements);
  if (typeof variableName === 'string' && variableName.includes('[]')) return eachArrayWith(p, variableName, qrtzFunction, data);
  if (typeof variableName === 'string' && variableName.includes('{}')) return eachObjectWith(p, variableName, qrtzFunction, data);
  if (variableName instanceof Array) {
    if (variableName.length === 0) return eachArrayWith(p, '[]', qrtzFunction, data);
    else return multiArrayWith(p, variableName, qrtzFunction, data);
  } else if (typeof variableName === 'object' && variableName !== null) {
    if (Object.keys(variableName).length === 0) return eachObjectWith(p, '{}', qrtzFunction, data);
    else return multiObjectWith(p, variableName, qrtzFunction, data);
  } else return regularWith(p, variableName, qrtzFunction, data);
};

exports.tests = {
  with1: [
    "data '$NOT_OK'",
    'poke with_test',
    'with with_test done $OK',
    'peek with_test'
  ],
  with2: [
    "data '$NOT_OK'",
    'poke with_test',
    "with with_test [data,3] [true,'==3',2,1] [fail] [done,$OK]",
    'peek with_test'
  ],
  with3: [
    "data '$NOT_OK'",
    'poke test $OK',
    'poke with_test',
    'with with_test peek test',
    'peek with_test'
  ],
  with4: [
    'poke [a,b] [x,y]',
    'with [a,b] case upper',
    "data '$a$b'",
    'flow XY 1 2',
    'done $OK',
    'fail'
  ],
  with5: [
    'with {a:x,b:y} case upper',
    "data '$a$b'",
    'flow XY 1 2',
    'done $OK',
    'fail'
  ],
  with6: [
    'data [{a:1},{a:2}]',
    'with [].a math +1',
    'jstr',
    "flow '[{\"a\":2},{\"a\":3}]' 1 2",
    'done $OK',
    'fail'
  ],
  with7: [
    'data {x:{a:1},y:{a:2}}',
    'with {}.a math +1',
    'jstr',
    "flow '{\"x\":{\"a\":2},\"y\":{\"a\":3}}' 1 2",
    'done $OK',
    'fail'
  ]
};
