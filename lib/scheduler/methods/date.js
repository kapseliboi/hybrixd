/**
   * Convert a date String and return it's Unix timestamp.
   * Returns '0' on a failed conversion and the current time epoch on an empty argument.
   * @param {String} [option=''] - Specify 'now' to use the current time.
   * @category Array/String
   * @example
   * date           // input 07-01-1985 output: 473904000 (The date/time epoch for Januray 7th 1985.)
   * date now          // output: '1549468836' (The current date/time epoch.)
   */

exports.date = data => function (p, option) {
  const d = data !== undefined && option !== 'now'
    ? new Date(data).getTime()
    : Date.now();
  const dateInSeconds = d / 1E3 | 0;
  this.next(p, 0, dateInSeconds);
};
