/**
   * Return a random number between 0 and 1
   * @example
   * rand          // 0.233
   * rand(200)     // return integer number between 0 and 200
   */
exports.rand = () => function (p, range) {
  if (typeof range === 'undefined') {
    this.next(p, 0, Math.random());
  } else {
    this.next(p, 0, Math.floor(Math.random() * range));
  }
};
