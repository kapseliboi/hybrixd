/**
   * Return a timestamp.
   * @category Array/String
   * @example
   * date           // output: '1549468836' (The current date/time epoch.)
   */

// TODO: Return date in a specified format.
exports.date = dat => function (p) {
  const datetime = (new Date()).getTime() / 1E3 | 0;
  this.next(p, 0, datetime);
};
