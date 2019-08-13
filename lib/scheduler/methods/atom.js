const Decimal = require('../../../common/crypto/decimal-light.js');

const toInt = function (input, factor) {
  const f = Number(factor);
  const x = new Decimal(String(input));
  return x.times('1' + (f > 1 ? new Array(f + 1).join('0') : ''));
};

const fromInt = function (input, factor) {
  const f = Number(factor);
  const x = new Decimal(String(input));
  return x.times((f > 1 ? '0.' + new Array(f).join('0') : '') + '1').toFixed();
};

/**
   * Convert a number from atomic units (large integer), or convert to atomic units.
   * @param {Number} [reduce=false] - When true reduces the input data.
   * @param {Number} [factor=$factor] - Factor to use (sometimes also called decimals).
   * @example
   * atom           // input: 1000000000, output: "10.00000000" (using $factor = 8)
   * atom false     // input: 1000000000, output: "10.00000000" (using $factor = 8)
   * atom true      // input: 10, output: "1000000000" (using $factor = 8)
   * atom false 4   // input: 8, output: "0.0008"
   * atom true 4    // input: 8, output: "80000"
   */

exports.atom = ydata => function (p, reduce, factor) {
  if (typeof factor === 'undefined') {
    const rootProcessID = p.processID.split('.')[0];
    const rootProcess = global.hybrixd.proc[rootProcessID]; // the root process
    factor = rootProcess.recipe.factor;
  }
  let result;
  if (reduce) {
    result = toInt(ydata, factor).toInteger();
  } else {
    result = fromInt(ydata, factor);
  }
  this.next(p, 0, result);
};
