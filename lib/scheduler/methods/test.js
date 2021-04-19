/**
   * Evaluate condition and jump accordingly. For mathematical conditionals use the 'true' function.
   * @category Flow
   * @param {String|Integer} [variableName] - Variable to test, defaults to data stream
   * @param {Integer} onTrue - Amount of statements to jump when condition evaluates to true. (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of statements to jump when condition evaluates to false. (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * test 4 1               // if data contains a truthy value jump four statements else 1 statement
   * test myVariable 1 -3   // if the myVariable variable evaluates to true jump one statement, else jump back three
   * test [a,b,c] 2 1       // if all variables a,b and c evaluate to true jump two statements, else jump one
   **/
exports.test = data => function (p, variableName, onTrue, onFalse) {
  let condition;
  if (!isNaN(variableName) && typeof onFalse === 'undefined') {
    condition = data;
    onFalse = onTrue;
    onTrue = variableName; // nb: already tested on being a number
    if (isNaN(onFalse)) return p.fail('test: expected integer onFalse label');
  } else {
    if (isNaN(onFalse) && typeof onFalse !== 'undefined') return p.fail('test: expected integer onFalse label');
    if (isNaN(onTrue)) return p.fail('test: expected integer onTrue label');

    const variableNames = variableName instanceof Array ? variableName : [variableName];
    condition = true;
    for (const variableName of variableNames) {
      const result = p.peek(variableName);
      if (result.e > 0) return p.fail(`test: failed to read variable ${variableName}`);
      if (!result.v) {
        condition = false;
        break;
      }
    }
  }
  return p.jump((condition ? onTrue : onFalse) || 1, data);
};

exports.tests = {
  test1: [
    'data true',
    'test 1 2',
    "done '$OK'",
    'fail'
  ],
  test2: [
    'data false',
    'test 2 1',
    "done '$OK'",
    'fail'
  ],
  test3: [
    "data ''",
    'test 2 1',
    "done '$OK'",
    'fail'
  ],
  test4: [
    'data 0',
    'test 2 1',
    "done '$OK'",
    'fail'
  ],
  test5: [
    'data true',
    'poke a',
    'test a 1 2',
    "done '$OK'",
    'fail'
  ],
  test6: [
    'data true',
    'poke a',
    'data true',
    'poke b',
    'test [a,b] 1 2',
    "done '$OK'",
    'fail'
  ],
  test7: [
    'data true',
    'poke a',
    'data false',
    'poke b',
    'test [a,b] 2 1',
    "done '$OK'",
    'fail'
  ]

};
