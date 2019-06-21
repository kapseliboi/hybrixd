/**
   * Turns JSON object into a string.
   * @category Array/String
   * @example
   * jstr()         // input: {key:"Some data."}, output: '{key:"Some data."}'
   */
exports.jstr = data => function (p) {
  this.next(p, 0, JSON.stringify(data));
};
