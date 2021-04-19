const Decimal = require('../../../common/crypto/decimal-light.js');

function padFloat (input, factor) { // "12.34" => "12.34000000" (Number of decimals equal to factor)
  const f = Number(factor);
  const x = new Decimal(String(input));
  return x.toFixed(f).toString();
}

/**
   * Format a (floating point) number and return a neatly padded string.
   * @param {Number|String} [factor=$factor] - The amount of decimals desired or the symbol of the asset which factor will be used
   * @example
   * form       // input: 10, output: "10.00000000" (using $factor = 8)
   * form 8     // input: 10, output: "10.00000000"
   * form 4     // input: 8, output: "0.8000"
   * form btc   // input: 10, output: "10.00000000"
   * form eth   // input: 10, output: "10.000000000000000000"
   */
exports.form = data => function (p, factor) {
  if (typeof factor === 'undefined' || factor === 'undefined') factor = p.getRecipe().symbol;

  const form = factor => {
    let result;
    try {
      result = padFloat(data, factor);
    } catch (e) {
      return p.fail('form: could not parse number');
    }
    return p.next(result);
  };

  if (typeof factor === 'string' && isNaN(factor)) {
    p.rout('/a/' + factor + '/factor', null,
      form,
      error => p.fail(error)
    );
  } else if (isNaN(factor)) return p.fail('form: Expected numerical factor. None provided or found in recipe');
  else form(factor);
};

exports.tests = {
  form1: [
    'data 12.3',
    'form 8',
    "flow '12.30000000' 1 2",
    'done $OK',
    'fail'
  ],
  form2: [
    'data 12.3',
    'form btc',
    "flow '12.30000000' 1 2",
    'done $OK',
    'fail'
  ]
};
