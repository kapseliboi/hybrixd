const math = require('../math');
const isFunctionRegex = /^[A-Za-z]*$/; // only a string name of the function, for example "floor"

const functions = ['min', 'max', 'mean', 'median', 'mad', 'mode', 'prod', 'sum', 'std', 'variance'];
const operators = ['+', '-', '*', '/', '^', '%', '==', '<', '>', '<=', '>=', '!=', '||', '&&'];

const resultForEmpty = {
  '+': 0,
  '-': 0,
  '*': 1,
  '/': 1,
  '&&': true,
  '||': false
};

function startsWithAnOperator (equation) {
  for (const operator of operators) {
    if (equation.startsWith(operator)) return true;
  }
  return false;
}

/**
   * Calculates numbers and variables. Mathematical calculations can be done with very large numbers.
   * @param {String} equation - String containing the equation or function to calculate outcome of.
   * @param {String} [followUpEquation...] - optional subsequent equations.
   * @example
   *  math 10*34+8-(3^4)   // returns 267
   *  math ^2*5            // returns the value of data to the power of two times five
   *  math +               // adds all the numbers in the data array
   *  math round           // round the value in data stream
   *  math +3 *2           // adds three to the value in data stream and then multiplies it by two
   *  math '+3 *2'         // adds six to the value in data stream
   *  math *2 round        // multiplies the value in data stream and then rounds it
   *  math abs(-23)        // calculate the absolute value of -23, returns 23
   *  math catalan(7)      // derive the catalan number of 7, returns 429
   *  math conj            // compute the complex conjugate of a complex value in the data stream
   */
exports.math = ydata => function (p, ...steps) {
  if (typeof ydata === 'string') ydata = ydata.trim();

  for (let equationOrOperator of steps) {
    let equation;
    if (ydata instanceof Array && (functions.indexOf(equationOrOperator) !== -1 || operators.indexOf(equationOrOperator) !== -1 || typeof equationOrOperator === 'undefined')) {
      const operator = typeof equationOrOperator === 'undefined' ? '+' : equationOrOperator;

      // join to make equation if not an arithmetic function
      if (functions.indexOf(operator) !== -1) equation = operator + '(' + ydata.join(',') + ')'; // "max(1,2,3,4,5)"
      else if (ydata.length === 0) {
        if (resultForEmpty.hasOwnProperty(operator)) return p.next(resultForEmpty[operator]);
        else return p.fail(`math : no result for empty array with operator ${operator}`);
      } else equation = ydata.join(operator); // "1+2+3+4+5"   for +, -, * , /, ..
    } else { // MATH
      if (typeof equationOrOperator === 'undefined') equationOrOperator = ydata;
      if (typeof equationOrOperator === 'number') equationOrOperator = equationOrOperator.toString();
      if (isFunctionRegex.test(equationOrOperator) === true) equation = equationOrOperator + '(' + ydata + ')'; // "func($)" if the equation is a function then apply it
      else if (startsWithAnOperator(equationOrOperator)) equation = ydata + equationOrOperator; // "$+4" if the equation starts with a mathematical operator eg '+4' then prepend the data
      else equation = equationOrOperator; //  "1+2" compute equation
    }
    const result = math.calc(equation, p);
    if (result.error) return p.fail(result.error);
    ydata = result.data;
  }
  return p.next(ydata);
};

exports.tests = {

  math1: [
    'math 1+1',
    'flow 2 1 2',
    'done $OK',
    'fail'
  ],
  math2: [
    'data [1,2,3]',
    'math +',
    'flow 6 1 2',
    'done $OK',
    'fail'
  ],
  math3: [
    'data 1',
    'math +1',
    'flow 2 1 2',
    'done $OK',
    'fail'
  ],
  math4: [
    'data [1,2]',
    'math +',
    'flow 3 1 2',
    'done $OK',
    'fail'
  ],
  math5: [
    'data 1.2',
    'math floor',
    'flow 1 1 2',
    'done $OK',
    'fail'
  ],
  math6: [
    'math floor(1.2)',
    'flow 1 1 2',
    'done $OK',
    'fail'
  ],
  math7: [
    'math 2 +2 *2',
    'flow 8 1 2',
    'done $OK',
    'fail'
  ]
};
