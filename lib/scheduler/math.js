const Mathjs = require('../../common/crypto/mathjs.js');
Mathjs.config({
  number: 'BigNumber', // Default type of number:
  precision: 64 // Number of significant digits for BigNumbers
});

function calc (equation, processID) {
  if (typeof equation === 'string' && equation.length > 0) {
    // make sure equation does not reference itself
    equation = equation.replace('equation', '0');
    try {
      return Mathjs.evaluate(equation).toString();
    } catch (e) {
      console.log(` [!] /p/${processID} math calculation error: ${e}. Equation: '${equation}'}`);
      return null;
    }
  } else {
    return null;
  }
}

exports.calc = calc;
