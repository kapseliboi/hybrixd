/**
   * Count the amount of entries a list, string or object has.
   * @category Array/String
   * @param {Boolean} [input] - List, string or object.
   * @example
   * size                // input: 'abcde', result: 5
   * size ['a','b',5]    // result: 3
   * size {'a':1,'b':2}   // result: 2
   */
exports.size = data => function (p, xdata) {
  const ydata = typeof xdata !== 'undefined' ? xdata : data;
  let result = 0;
  if (ydata === null) {
    result = 0;
  } else if (typeof ydata === 'object') {
    if (ydata.constructor === 'Array') {
      result = ydata.length;
    } else {
      result = Object.keys(ydata).length;
    }
  } else if (typeof ydata === 'string') {
    result = ydata.length;
  }
  this.next(p, 0, result);
};
