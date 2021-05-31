function isVoid (compare, value) {
  return ((compare === 'void' || compare === 'undefined') && typeof value === 'undefined') ||
           ((compare === 'void' || compare === 'null') && value === null) ||

           ((compare === 'empty' || compare === 'string') && typeof value === 'string' && value === '') ||
           ((compare === 'empty' || compare === 'array') && value instanceof Array && value.length === 0) ||
           ((compare === 'empty' || compare === 'object') && typeof value === 'object' && value !== null && Object.keys(value).length === 0) ||

           (compare === 'zero' && value === 0) ||
           (compare === 'false' && value === false) ||
           (compare === 'any' && !value);
}

function checkVoid (p, compare, value, data, onTrue, onFalse) {
  if (typeof compare === 'object' && compare !== null) {
    for (const key in compare) {
      if (isVoid(key, value)) return p.jump(compare[key], data);
    }
    return p.jump(onFalse || 0, data);
  } else if (isVoid(compare, value)) return p.jump(onTrue || 1, data);
  else return p.jump(onFalse || 1, data);
}

/**
   * Change the flow of execution based on void analysis.
   * @category Flow
   * @param {String} [variableName] - Variable to check, uses data stream otherwise.
   * @param {String or Object} [compare=void] - Type of void to analyse. Possible values: void, undefined, null, string, array, object, empty, zero, false, any.
   * @param {Integer} [onTrue=1] - Amount of instructions lines to jump when condition matches true. (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false. (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * void 1 -3                         // test if data is null or undefined, if true jump to the next instruction, if false jump back three instructions
   * void void 1 -3                  // test if data is null or undefined, if true jump to the next instruction, if false jump back three instructions
   * void {null:3,undefined:2}     // if data is null jump three instructions, if undefined jump two instructions, else jump to next instruction
   * void {string:3,array:2} 5     // if data equals '' jump three instructions, if an empty array jump two instructions, else jump five instructions
   * void myVariable any 1 2
   * void myVariable {string:5, array:6} 2
   */
exports.void = data => function (p, ...args) { // [variableName], [compare], [onTrue], [onFalse]
  if (typeof args[0] === 'object' && args[0] !== null && !(args[0] instanceof Array)) { // void {string:1} 2
    const [compare, onFalse] = args;
    return checkVoid(p, compare, data, data, null, onFalse);
  } else if (typeof args[1] === 'string') { // void var string 1 2
    const [variableName, compare, onTrue, onFalse] = args;
    const result = p.peek(variableName);
    if (result.e > 0) return p.fail('void: could not read variable ' + variableName);
    const value = result.v;
    return checkVoid(p, compare, value, data, onTrue, onFalse);
  } else if (typeof args[1] === 'object' && args[1] !== null && !(args[1] instanceof Array)) { // void var {string:1} 2
    const [variableName, compare, onFalse] = args;
    const result = p.peek(variableName);
    if (result.e > 0) return p.fail('void: could not read variable ' + variableName);
    const value = result.v;
    return checkVoid(p, compare, value, data, null, onFalse);
  } else if (args.length === 3 || isNaN(args[0])) { // void string 1 2
    const [compare, onTrue, onFalse] = args;
    return checkVoid(p, compare, data, data, onTrue, onFalse);
  } else {
    const [onTrue, onFalse] = args;
    return checkVoid(p, 'void', data, data, onTrue, onFalse);
  }
};

exports.tests = {
  void1: [
    'data null',
    'void 1 2',
    "done '$OK'",
    'fail'
  ],
  void2: [
    "data ''",
    'void array 2 1',
    "done '$OK'",
    'fail'
  ],
  void3: [
    'data null',
    'void {null:1,string:2} 2',
    "done '$OK'",
    'fail'
  ],
  void4: [
    "data ''",
    'poke myVariable',
    'data notVoid',
    'void myVariable string 1 2',
    "done '$OK'",
    'fail'
  ],
  void5: [
    'data [1,2]',
    'void {array:2} 1',
    "done '$OK'",
    'fail'
  ],
  void6: [
    "data ''",
    'poke myVariable',
    'data notVoid',
    'void myVariable {string:1} 2',
    "done '$OK'",
    'fail'
  ],
  void7: [
    "data 'notVoid'",
    'poke myVariable',
    'data ""',
    'void myVariable {string:1} 2',
    'fail',
    "done '$OK'"
  ]
};
