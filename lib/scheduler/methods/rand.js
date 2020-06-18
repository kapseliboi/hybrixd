/**
   * Return a random number between 0 and 1, or an integer.
   * @param {Number} [start] - When specified, becomes the range or start to return a random integer.
   * @param {Number} [until] - When specified returns a random integer between start and until.
   * @example
   * rand          // return a random float between 0 and 1, like for instance 0.233
   * rand 1        // return a random integer number: 0 or 1
   * rand 200      // return a random integer number: between 0 and 200
   * rand 20 30    // return a random integer number: between 20 and 30
   */
exports.rand = () => function (p, start, until) {
  if (typeof start === 'undefined') {
    this.next(p, 0, Math.random());
  } else if (typeof until === 'undefined') {
    this.next(p, 0, Math.round(Math.random() * start));
  } else {
    this.next(p, 0, Math.round(Math.random() * (until - start)) + start);
  }
};
