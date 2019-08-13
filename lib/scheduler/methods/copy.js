const vars = require('../vars');

/**
   * Copy a variable to another variable. The data stream is left untouched.
   * @category Variables
   * @param {String} source - Variable to copy.
   * @param {String} target - Variable(s) to store copies in.
   * @example
   * copy('variableA','variableB')                  // copy variableA to variableB
   * copy('variableA','variableB','variableC')      // copy variableA to variableB and variableC
   */
exports.copy = data => function (p, variable, properties) {
  for (let i = 2; i < Object.keys(arguments).length; i++) {
    const result = vars.peek(p, variable);
    if (result.e > 0) {
      result.v = undefined;
    }
    vars.poke(p, arguments[i], result.v);
  }
  this.next(p, 0, data);
};
