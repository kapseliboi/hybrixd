/**
   * Get the front of a string or array
   * @category Array/String
   * @param {Number} [size=1]  - size to use
   * @example
   * data 'abc'
   * head           // return 'a'
   * head 1         // return 'a'
   * head 2         // return 'ab'
   */
exports.head = ydata => function (p, size) {
  if (typeof ydata === 'string') {
    this.next(p, 0, ydata.substr(0, size));
  } else {
    this.next(p, 0, ydata.splice(0, size));
  }
};
