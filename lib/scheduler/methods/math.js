const math = require('../math');

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
// TODO split into math and redu
exports.math = ydata => function (p, equationOrOperator, operator) {
  if (typeof ydata === 'string') { ydata = ydata.trim(); }

  let equation;
  const isFunctionRegex = /^[A-Za-z].*/;

  if (ydata instanceof Array) { // REDU(CE)
    if (typeof equationOrOperator === 'undefined') {
      operator = '+';
    } else {
      operator = equationOrOperator;
    }
    // join to make equation if not an arithmetic function
    if (['min', 'max', 'mean', 'median', 'mad', 'mode', 'prod', 'sum', 'std', 'variance'].indexOf(operator) !== -1) {
      equation = operator + '(' + ydata.join(',') + ')';
    } else { // for +, -, * , /, ..
      equation = ydata.join(operator);
    }
  } else { // MATH
    if (typeof equationOrOperator === 'undefined') { equationOrOperator = ydata; }
    if (typeof equationOrOperator === 'number') { equationOrOperator = equationOrOperator.toString(); }
    const equationChar = equationOrOperator.trim().substr(0, 1);
    if (isNaN(equationChar) && equationChar !== '(' && isFunctionRegex.test(equationOrOperator) === false) { // if the equation starts with a mathematical operator eg '+4' then prepend the data
      equation = ydata + equationOrOperator;
    } else {
      equation = equationOrOperator;
    }
  }
  const result = math.calc(equation, operator, ydata);
  if (result === null) {
    this.fail(p, 'math failed.');
  } else {
    this.next(p, 0, result);
  }
};
