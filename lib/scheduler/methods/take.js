/**
   * Take elements from an array or input string.
   * @category Array/String
   * @param {String} start - TODO
   * @param {String} [length] - TODO
   * @example
   * take 2           // input: 'abcdefg', output: 'cdefg'
   * take 2 2         // input: 'abcdefg', output: 'cd'
   * take -2          // input: 'abcdefg', output: 'abcde'
   * take -2 2        // input: 'abcdefg', output: 'de'
   */
exports.take = ydata => function (p, start, length) {
  let end;
  if (start >= 0 && typeof length === 'undefined') {
    end = ydata.length;
  } else if (start < 0 && typeof length === 'undefined') {
    end = ydata.length + start;
    start = 0;
  } else if (start >= 0) {
    end = start + length;
  } else {
    end = ydata.length + start - length;
    start = ydata.length + start;
  }
  let result;
  if (typeof ydata === 'string') {
    result = ydata.substring(start, end);
  } else {
    result = ydata.slice(start, end);
  }
  this.next(p, 0, result);
};
