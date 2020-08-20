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
      const data = Mathjs.format(Mathjs.evaluate(equation), {notation: 'fixed'});
      return {data};
    } catch (e) {
      const error = `math: error ${e}. Equation: '${equation}'`;
      global.hybrixd.logger(['error', 'math'], `/p/${qrtzProcessStep.getProcessID()} ${error}`);
      return {error: error};
    }
  } else return {error: 'math: expected non empty string equation.'};
}

exports.calc = calc;
