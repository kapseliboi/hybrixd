/**
 * Return the intersect of an array or string.
 * @category Array
 * @param {Object} data - Array to compare with.
 * @example
 * isct [1,2,3]        // input: [3,4,5], result: [3]
 * isct ['a','b','c']  // input: ['b', 'c', 'd'], result: ['b','c']
 */
exports.isct = ydata => function (p, input) {
  if (ydata instanceof Array && input instanceof Array) {
    ydata = ydata.filter(x => input.includes(x));
  } else {
    this.fail(p, 'Intersect: expect data and input types to be Array');
    return;
  }
  this.next(p, 0, ydata);
};
