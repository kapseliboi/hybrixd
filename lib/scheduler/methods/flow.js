/**
   * Change the flow of execution based on a string or value comparison.
   * @category Flow
   * @param {String}  [compare]   -  Javascript condition to analyse. (Example: a>5)
   * @param {Integer} [onTrue=1]  - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * flow('yes',1,-3)          // test if data equals 'yes', if true jump to the next instruction, if false jump back three instructions
   * flow({'yes':3,'no':2})    // if data equals 'yes' jump three instructions, if no jump two instructions, else jump to next instruction
   * flow({'yes':3,'no':2},5)  // if data equals 'yes' jump three instructions, if no jump two instructions, else jump five instructions
   */
exports.flow = ydata => function (p, compare, success, failure) {
  let jumpTo = success || 1;
  if (typeof compare === 'object' || compare instanceof Array) {
    for (let key in compare) {
      if (key === ydata) {
        jumpTo = compare[key];
      }
    }
  } else {
    jumpTo = compare === ydata ? (success || 1) : (failure || 1);
  }
  this.jump(p, jumpTo, ydata);
};
