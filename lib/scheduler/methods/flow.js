/**
   * Change the flow of execution based on a string or value comparison.
   * @category Flow
   * @param {String|Object}  [compare] - String(s) or value(s) to compare to.
   * @param {Integer} [onTrue=1] - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * flow yes 1 -3          // test if data equals 'yes', if true jump to the next instruction, if false jump back three instructions
   * flow {yes:3,no:2}      // if data equals 'yes' jump three instructions, if no jump two instructions, else jump to next instruction
   * flow {yes:3,no:2} 5    // if data equals 'yes' jump three instructions, if no jump two instructions, else jump five instructions
   * flow {0:3,3:2} 5       // if data equals 0 jump three instructions, if data equals 3 jump two instructions, else jump five instructions
   * flow [3,2] 5           // if data equals 0 jump three instructions, if 1 jump two instructions, else jump five instructions
   */
exports.flow = ydata => function (p, compare, successOrDefault, failure) {
  let jumpTo = successOrDefault || 1;
  if ((typeof compare === 'object' && compare !== null) || compare instanceof Array) { //
    for (let key in compare) {
      if (key === String(ydata)) {
        jumpTo = compare[key];
        break;
      }
    }
  } else {
    jumpTo = compare === ydata ? (successOrDefault || 1) : (failure || 1);
  }
  this.jump(p, jumpTo, ydata);
};
