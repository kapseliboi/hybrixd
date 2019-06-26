const Mathjs = require('../../common/crypto/mathjs.js');
Mathjs.config({
  number: 'BigNumber', // Default type of number:
  precision: 64 // Number of significant digits for BigNumbers
});

function calc (equation, operator, data) {
  if (typeof equation === 'string' && equation.length > 0) {
    // make sure equation does not reference itself
    const isFunctionRegex = /^[A-Za-z].*/;
    let result = null;
    equation = equation.replace('equation', '0');
    // join to make equation if not an arithmetic function
    try {
      if (isFunctionRegex.test(equation) === true) {
        if (equation.indexOf('(') === -1 || equation.indexOf(')') === -1) {
          equation = equation + '(' + data + ')';
        }
      }
      result = Mathjs.evaluate(equation).toString();
    } catch (e) {
      console.log(' [!] math calculation error: ' + e);
      result = null;
    }
    return result;
  } else { return null; }
  // We decided not to split strings into multiple operations:
  // equations = equation.split('<-').reverse().join('->').split('->');
}

exports.calc = calc;
