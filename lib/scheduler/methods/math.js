const math = require('../math');

const functions = ['min', 'max', 'mean', 'median', 'mad', 'mode', 'prod', 'sum', 'std', 'variance'];
const operators = ['+', '-', '*', '/', '^', '%', '==', '<', '>', '<=', '>=', '!=', '||', '&&'];
/**
   * Calculates numbers and variables. Mathematical calculations can be done with very large numbers.
   * @param {String} equation - String containing the equation or function to calculate outcome of.
   * @example
   *  math '10*34+8-(3^4)'   // returns 267
   *  math '^2*5'            // returns the value of data to the power of two times five
   *  math '+'               // adds all the numbers in the data array
   *  math 'round'           // round the value in data stream
   *  math 'abs(-23)'        // calculate the absolute value of -23, returns 23
   *  math 'catalan(7)'      // derive the catalan number of 7, returns 429
   *  math 'conj'            // compute the complex conjugate of a complex value in the data stream
   */
exports.math = ydata => function (p, equationOrOperator) {
  if (typeof ydata === 'string') { ydata = ydata.trim(); }

  let equation;
  const isFunctionRegex = /^[A-Za-z].*/;

  if (ydata instanceof Array && (functions.indexOf(equationOrOperator) !== -1 || operators.indexOf(equationOrOperator) !== -1 || typeof equationOrOperator === 'undefined')) {
    const operator = typeof equationOrOperator === 'undefined' ? '+' : equationOrOperator;

    // join to make equation if not an arithmetic function
    if (functions.indexOf(operator) !== -1) { // "max(1,2,3,4,5)"
      equation = operator + '(' + ydata.join(',') + ')';
    } else { // "1+2+3+4+5"   for +, -, * , /, ..
      equation = ydata.join(operator);
    }
  } else { // MATH
    if (typeof equationOrOperator === 'undefined') { equationOrOperator = ydata; }
    if (typeof equationOrOperator === 'number') { equationOrOperator = equationOrOperator.toString(); }
    const equationChar = equationOrOperator.trim().substr(0, 1);
    if (isFunctionRegex.test(equationOrOperator) === true) { // "func($)" if the equation is a function then apply it
      equation = equationOrOperator + '(' + ydata + ')';
    } else if (isNaN(equationChar) && equationChar !== '(') { // "$+4" if the equation starts with a mathematical operator eg '+4' then prepend the data
      equation = ydata + equationOrOperator;
    } else { //  "1+2" compute equation
      equation = equationOrOperator;
    }
  }

  const result = math.calc(equation, p.processID);
  if (result === null) {
    this.fail(p, 'math failed.');
  } else {
    this.next(p, 0, result);
  }
};
