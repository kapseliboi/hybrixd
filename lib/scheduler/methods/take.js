/**
   * Take elements cutting them from an array or input string.
   * @category Array/String
   * @param {Number} [start] - Amount of elements to take off the start.
   * @param {Number} [lenght=all] - How many elements to keep
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

  if (typeof ydata === 'string') {
    p.next(ydata.substring(start, end));
  } else if (ydata instanceof Array) {
    p.next(ydata.slice(start, end));
  } else {
    p.fail('take expects array of string');
  }
};
