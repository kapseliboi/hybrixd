const math = require('../math');
const vars = require('../vars');

/**
   * Loop back to position or label based on criteria.
   * @category Flow
   * @param {String} position         - Position to loop back to.
   * @param {String} variable         - Variable to store the loop count.
   * @param {String} condition        - Condition that keeps the loop going.
   * @param {String} [initValue=1]    - Value to initialize the loop.
   * @param {String} [stepOperation=+1] - Optional: How the loop variable is iterated.
   * @example
   * loop @loopStart loopCount <5          // loops back to label loopStart five times
   * loop @loopStart loopCount <10 0 +2    // loops back to label loopStart ten times, starting from zero, iterating by +1
   */
exports.loop = data => function (p, jumpTo, loopVar, condition, initVal, stepOperation) {
  // TODO make position optional (could default to -1)
  // TODO make variable optional (could create a tmp variableName)

  // TODO check if jumpTo is positive integer
  // TODO check if loopVar is string
  // TODO check if condition is string (starting with comparison operator)
  // TODO check if initVal is number
  // TODO check if stepOperator starts with operator
  if (typeof initVal === 'undefined') initVal = '1';
  if (typeof stepOperation === 'undefined') stepOperation = '+1';

  let loopVal = vars.peek(p, loopVar);
  if (loopVal.e > 0) loopVal = initVal;
  else {
    const loopStepResult = math.calc(loopVal.v + stepOperation, p);
    if (loopStepResult.error) return p.fail(loopStepResult.error);
    loopVal = loopStepResult.data;
  }

  const loopCondition = math.calc(loopVal + condition, p);
  if (loopCondition.error) return p.fail(loopCondition.error);
  if (loopCondition.data === 'true') {
    p.poke(loopVar, loopVal);
    return p.jump(jumpTo || 1, data);
  } else {
    p.poke(loopVar, initVal);
    return p.next(data);
  }
};
