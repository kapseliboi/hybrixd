const math = require('../math');
const vars = require('../vars');

/**
   * Loop back to position or label based on criteria.
   * @category Flow
   * @param {String} position         - Position to loop back to.
   * @param {String} variable         - Variable to store the loop count.
   * @param {String} condition        - Condition that keeps the loop going.
   * @param {String} [initvalue='1']  - Value to initialize the loop.
   * @param {String} [stepvalue='+1'] - Optional: How the loop variable is iterated.
   * @example
   * loop @loopStart 'loopCount' '<5'              // loops back to label loopStart five times
   * loop @loopStart 'loopCount' '<10' '0' '+1'    // loops back to label loopStart ten times, starting from zero, iterating by +1
   */
exports.loop = data => function (p, jumpTo, loopVar, condition, initVal, stepVal) {
  if (typeof initVal === 'undefined') {
    initVal = '1';
  }
  if (typeof stepVal === 'undefined') {
    stepVal = '+1';
  }
  let loopVal = vars.peek(p, loopVar);
  if (loopVal.e > 0) {
    loopVal = initVal;
  } else {
    loopVal = math.calc(loopVal.v + stepVal, p);
  }
  if (math.calc(loopVal + condition, p) === 'true') {
    p.poke(loopVar, loopVal);
    p.jump(isNaN(jumpTo) ? 1 : jumpTo || 1, data);
  } else {
    p.poke(loopVar, initVal);
    p.next(data);
  }
};
