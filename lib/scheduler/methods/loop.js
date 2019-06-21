const math = require('../math');

const vars = require('../vars');

/**
   * Loop back to position or label based on criteria.
   * @category Flow
   * @param {String} position         - Position to loop back to.
   * @param {String} variable         - Variable to store loop count.
   * @param {String} condition        - Condition that keeps loop going.
   * @param {String} [initvalue='1']  - Value to initialize loop.
   * @param {String} [stepvalue='+1'] - Optional: How variable is iterated.
   * @example
   * loop(@loopStart,'loopCount','<5')             // Loops back to loopStart five times
   * loop(@loopStart,'loopCount','<10','0','+1')   // Loops back to loopStart ten times
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
    loopVal = math.calc(loopVal.v + stepVal);
  }
  if (math.calc(loopVal + condition) === 'true') {
    vars.poke(p, loopVar, loopVal);
    this.jump(p, isNaN(jumpTo) ? 1 : jumpTo || 1, data);
  } else {
    vars.poke(p, loopVar, initVal);
    this.next(p, 0, data);
  }
};
