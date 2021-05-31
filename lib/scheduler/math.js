const Mathjs = require('../../common/crypto/mathjs.js');
Mathjs.config({
  number: 'BigNumber', // Default type of number:
  precision: 64 // Number of significant digits for BigNumbers
});

function parseToTypeIfPossible (string) {
  if (typeof string !== 'string') return string; // already a nr or something else that we won't touch
  if (string === 'true') return true;
  if (string === 'false') return false;
  const toNumber = Number(string);
  if (isNaN(toNumber)) return string; // not a number, let's keep it a string
  const toNumberToString = String(toNumber);
  if (toNumberToString !== string) return string; // something changed, rounding, scientific notation, let's keep it the original string
  return toNumber;
}

function calc (equation, qrtzProcessStep) {
  if (typeof equation === 'string' && equation.length > 0) {
    // make sure equation does not reference itself
    equation = equation.replace('equation', '0');
    try {
      const data = parseToTypeIfPossible(Mathjs.format(Mathjs.evaluate(equation), {notation: 'fixed'}));
      return {data};
    } catch (e) {
      const error = `math: error ${e}. Equation: '${equation}'`;
      global.hybrixd.logger(['error', 'math'], `/p/${qrtzProcessStep.getProcessID()} ${error}`);
      return {error};
    }
  } else return {error: 'math: expected non empty string equation.'};
}

exports.calc = calc;
