const tran = require('./tran');

/**
   * Checks for data object to contain other objects.
   * also for arrays and dictionaries of property paths
   * also for explicit primitive values
   * @param {Object} pattern - A (or nested array/dicationary of) strings containing
   * - explicit values (Example: "Hello")
   * - property paths to test and pass (prefixed with ".") (Example: ".foo.bar"
   * - expressions (prefixed with "=") (Example: "=a+b", "=.foo.bar|default")
   * @param {Object} input - The input
   * @param {Number} [onSuccess=1] - amount of instructions lines to jump on success.
   * @param {Number} [onError=1] - amount of instructions lines to jump on failure.
   * @example
   * have(".foo",1,2)                                         // Input: {foo:"bar"} : Jumps 1 instruction
   * have(".foo.bar[2]",1,2)                                  // Input: {foo:{bar:[0,1,5]}} :  Jumps 1 instruction
   * have(".foo.bar[2]",1,2)                                  // Input: {foo:"bar"} : Jumps 2 instructions
   */
exports.have = ydata => function (p, property, is_valid, is_invalid) {
  const checkVar = tran.chckVar(p, property, ydata);
  if (checkVar.valid) {
    this.jump(p, isNaN(is_valid) ? 1 : is_valid || 1, ydata);
  } else {
    this.jump(p, isNaN(is_invalid) ? 1 : is_invalid || 1, ydata);
  }
};
