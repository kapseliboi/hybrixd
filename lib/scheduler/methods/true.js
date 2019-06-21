const math = require('../math');
/**
   * Test truth of a condition and choose to jump.
   * @category Flow
   * @param {Boolean} condition -  Javascript condition to analyse. (Example: a>5)
   * @param {Integer} [onTrue=1] - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * true('>3',1,-3)       // test if data>3, if true jump to the next instruction, if false jump back three instructions
   * true('<=1',-4,1)      // test if data<=1, if true jump back four instructions, if false jump to the next instruction
   * true('>3',-5)         // test if data>3, if true jump back five instructions, else default jump to the next instruction
   * true('=3',-5)         // test if data=3, if true jump back five instructions, else default jump to the next instruction
   */
exports.true = data => function (p, condition, is_true, is_false) {
  if (typeof condition === 'string' && isNaN(condition.substr(0, 1))) {
    condition = data + condition;
  } else if (typeof condition === 'undefined') {
    condition = data;
  }
  if (math.calc(condition) === 'true') {
    this.jump(p, isNaN(is_true) ? 1 : is_true || 1, data);
  } else {
    this.jump(p, isNaN(is_false) ? 1 : is_false || 1, data);
  }
};
