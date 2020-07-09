const Decimal = require('../../../common/crypto/decimal-light.js');

function padFloat (input, factor) { // "12.34" => "12.34000000" (Number of decimals equal to factor)
  const f = Number(factor);
  const x = new Decimal(String(input));
  return x.toFixed(f).toString();
}

/**
   * Format a (floating point) number and return a neatly padded string.
   * @param {Number} [factor=$factor] - The amount of decimals desired.
   * @example
   * form       // input: 10, output: "10.00000000" (using $factor = 8)
   * form 8     // input: 10, output: "10.00000000"
   * form 4     // input: 8, output: "0.8000"
   */
exports.form = data => function (p, factor) {
  if (typeof factor === 'undefined' || factor === 'undefined') factor = p.getRecipe().factor;
  if (isNaN(factor)) {
    p.fail('form: Expected numerical factor. None provided or found in recipe');
    return;
  }
  const result = padFloat(data, factor);
  p.next(result);
};
