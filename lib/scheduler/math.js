const Mathjs = require('../../common/crypto/mathjs.js');
Mathjs.config({
  number: 'BigNumber', // Default type of number:
  precision: 64 // Number of significant digits for BigNumbers
});

function calc (equation, qrtzProcessStep) {
  if (typeof equation === 'string' && equation.length > 0) {
    // make sure equation does not reference itself
    equation = equation.replace('equation', '0');
    try {
      return Mathjs.format(Mathjs.evaluate(equation), {notation: 'fixed'});
    } catch (e) {
      const errorMessage = `math calculation error: ${e}. Equation: '${equation}'`;
      global.hybrixd.logger(['error', 'math'], `/p/${qrtzProcessStep.getProcessID()} ${errorMessage}`);
      qrtzProcessStep.fail(errorMessage);
      return null;
    }
  } else {
    return null;
  }
}

exports.calc = calc;
