/**
   * Get the last part or tail of a string or array.
   * @category Array/String
   * @param {Number} [size=1] - The amount of elements to get from the tail.
   * @example
   * data 'abc'
   * tail           // return 'c'
   * tail 1         // return 'c'
   * tail 2         // return 'bc'
   */
exports.tail = ydata => function (p, size) {
  if (typeof ydata === 'string') {
    this.next(p, 0, ydata.substr(ydata.length - size));
  } else {
    this.next(p, 0, ydata.splice(ydata.length - size, ydata.length));
  }
};
