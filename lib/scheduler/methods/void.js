/**
   * Change the flow of execution based on void analysis.
   * @category Flow
   * @param {String or Object} [compare] - Javascript void to analyse. Possible values: void, undefined, null, string, array, object, empty, zero, false, any
   * @param {Integer} [onTrue=1]         - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1]        - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * void(1,-3)                        // test if data is null or undefined, if true jump to the next instruction, if false jump back three instructions
   * void('void',1,-3)                 // test if data is null or undefined, if true jump to the next instruction, if false jump back three instructions
   * void({'null':3,'undefined':2})    // if data is null jump three instructions, if undefined jump two instructions, else jump to next instruction
   * void({'string':3,'array':2},5)    // if data equals '' jump three instructions, if an empty array jump two instructions, else jump five instructions
   */
exports.void = ydata => function (p, compare, success, failure) {
  let jumpTo = success || 1;
  function isVoid (key, val) {
    return ((key === 'void' || key === 'undefined') && typeof val === 'undefined') ||
             ((key === 'void' || key === 'null') && val === null) ||

             ((key === 'empty' || key === 'string') && typeof val === 'string' && val === '') ||
             ((key === 'empty' || key === 'array') && val instanceof Array && val.length === 0) ||
             ((key === 'empty' || key === 'object') && typeof val === 'object' && val !== null && Object.keys(val).length === 0) ||

             (key === 'zero' && val === 0) ||
             (key === 'false' && val === false) ||
             (key === 'any' && !val);
  }
  if (typeof compare === 'object' || compare instanceof Array) {
    for (let key in compare) {
      if (isVoid(key, ydata)) {
        jumpTo = compare[key];
      }
    }
  } else {
    if (isNaN(compare)) {
      jumpTo = isVoid(compare, ydata) ? (success || 1) : (failure || 1);
    } else {
      jumpTo = isVoid('void', ydata) ? (compare || 1) : (success || 1);
    }
  }
  this.jump(p, jumpTo, ydata);
};
