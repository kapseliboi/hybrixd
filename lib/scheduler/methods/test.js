/**
   * Test a condition and choose to jump.
   * @category Flow
   * @param {Boolean} condition -  Condition to test
   * @param {Integer} [onTrue=1] - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * test('a>3',1,-3)    // test if a>3, if true jump to the next instruction, if false jump back three instructions
   * test('b<=1',-4,1)   // test if b<=1, if true jump back four instructions, if false jump to the next instruction
   * test('a>3',-5)      // test if a>3, if true jump back five instructions, else default jump to the next instruction
   */
exports.test = data => function (p, condition, is_true, is_false) {
  if (condition) {
    this.jump(p, isNaN(is_true) ? 1 : is_true || 1, data);
  } else if (typeof is_false === 'undefined') {
    this.next(p, 0, data);
  } else {
    this.jump(p, isNaN(is_false) ? 1 : is_false || 1, data);
  }
};
