const scheduler = require('../scheduler');

/**
   * Jump forward or backward several instructions. Using labels is also supported.
   * @category Flow
   * @param {Integer} step - Amount of instructions lines to jump.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * jump 2          // jump over the next instruction
   * jump -3         // jump backwards three instructions
   * jump @myLabel   // jump to where myLabel is
   */
exports.jump = data => function (p, delta, xdata) {
  const ydata = typeof xdata === 'undefined' ? data : xdata;
  p.jump(delta, ydata);
};
