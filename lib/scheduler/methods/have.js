const tran = require('./tran');

/**
   * Checks for data object to contain other objects.
   * Also for arrays and dictionaries of property paths, and for explicit primitive values.
   * @param {Object} pattern - A (or nested array/dicationary of) strings containing:
   * - explicit values (Example: "Hello")
   * - property paths to test and pass, prefixed with "." (Example: ".foo.bar")
   * - expressions, prefixed with "=" (Example: "=a+b", "=.foo.bar|default")
   * @param {Object} objectDefinition - The data object to check for.
   * @param {Number} [success=1] - Amount of instructions lines to jump on success.
   * @param {Number} [failure=1] - Amount of instructions lines to jump on failure.
   * @example
   * have '.foo' 1 2                        // input: {foo:"bar"} : jumps 1 instruction
   * have '.foo.bar[2]' 1 2                 // input: {foo:{bar:[0,1,5]}} : jumps 1 instruction
   * have '.foo.bar[2]' 1 2                 // input: {foo:"bar"} : jumps 2 instructions
   */
exports.have = ydata => function (p, property, is_valid, is_invalid) {
  const checkVar = tran.chckVar(p, property, ydata);
  if (checkVar.valid) {
    this.jump(p, isNaN(is_valid) ? 1 : is_valid || 1, ydata);
  } else {
    this.jump(p, isNaN(is_invalid) ? 1 : is_invalid || 1, ydata);
  }
};
