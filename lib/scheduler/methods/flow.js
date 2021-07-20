const vars = require('../vars');

function stringify (x) {
  if (typeof x === 'string') return x;
  else if (typeof x === 'number') return x.toString();
  else if (typeof x === 'undefined') return 'undefined';
  else if (x === null) return 'null';
  else if (x === true) return 'true';
  else if (x === false) return 'false';
  else return JSON.stringify(x);
}

function dataFlow (data, compare, successOrDefault, failure) {
  let jumpTo = successOrDefault || 1;
  data = stringify(data);
  if ((typeof compare === 'object' && compare !== null) || compare instanceof Array) { //
    for (const key in compare) {
      if (key === data) {
        jumpTo = compare[key];
        break;
      }
    }
  } else {
    compare = stringify(compare);
    jumpTo = compare === data ? (successOrDefault || 1) : (failure || 1);
  }
  return [0, jumpTo];
}

function variableFlow (p, variable, compare, successOrDefault, failure) {
  if (variable instanceof Array) variable = '.' + variable[0];
  const result = vars.peek(p, variable);
  if (result.e > 0) return [result.v];
  const value = result.v;
  return dataFlow(value, compare, successOrDefault, failure);
}

/**
   * Change the flow of execution based on a string or value comparison.
   * @category Flow
   * @param {String}  [variableName] - Variable to check
   * @param {String|Object}  [compare] - String(s) or value(s) to compare to.
   * @param {Integer} [onTrue=1] - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * flow yes 1 -3          // test if data equals 'yes', if true jump to the next instruction, if false jump back three instructions
   * flow {yes:3,no:2}      // if data equals 'yes' jump three instructions, if no jump two instructions, else jump to next instruction
   * flow {yes:3,no:2} 5    // if data equals 'yes' jump three instructions, if no jump two instructions, else jump five instructions
   * flow {0:3,3:2} 5       // if data equals 0 jump three instructions, if data equals 3 jump two instructions, else jump five instructions
   * flow [3,2] 5           // if data equals 0 jump three instructions, if 1 jump two instructions, else jump five instructions
   * flow variable {0:3,3:2} 5 // if variable equals 0 jump three instructions, if variable equals 3 jump two instructions, else jump five instructions
   */
exports.flow = data => function (p, compare, successOrDefault, failure, x) {
  const [error, jumpTo] = x || ((typeof compare === 'string' || typeof compare === 'number' || (compare instanceof Array && compare.length === 1)) && typeof successOrDefault === 'object')
    ? variableFlow(p, compare, successOrDefault, failure, x)
    : dataFlow(data, compare, successOrDefault, failure);
  return error
    ? this.fail(p, error)
    : this.jump(p, jumpTo, data);
};

exports.tests = {
  flow1: [
    'data appel',
    'flow appel 1 2',
    'done $OK',
    'fail'
  ],
  flow2: [
    'data appel',
    'flow {appel:1} 2',
    'done $OK',
    'fail'
  ],
  flow3: [
    'poke fruit appel',
    'flow fruit {appel:1} 2',
    'done $OK',
    'fail'
  ],
  flow4: [
    '# $1 has null so flow should fail',
    'flow 1 {fruit:2} 1',
    'done $OK',
    'fail'
  ]
};
