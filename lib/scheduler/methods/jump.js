const scheduler = require('../scheduler');

/**
   * Jump forward or backward several instructions.
   * @category Flow
   * @param {Integer} step - Amount of instructions lines to jump.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * jump(2)         // jump over the next instruction
   * jump(-3)        // jump backwards three instructions
   */
this.jump = data => function (p, stepTo, xdata) {
  scheduler.jump(p.processID, stepTo, xdata, e => this.fail(p, e));
};
