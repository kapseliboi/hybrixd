/**
   * Take elements cutting them from an array or input string.
   * @category Array/String
   * @param {Number} start - Amount of elements to take off the start.
   * @param {Number} [lenght=all] - How many elements to keep
   * @example
   * take 2           // input: 'abcdefg', output: 'cdefg'
   * take 2 2         // input: 'abcdefg', output: 'cd'
   * take -2          // input: 'abcdefg', output: 'abcde'
   * take -2 2        // input: 'abcdefg', output: 'de'
   */
exports.take = data => function (p, start, length) {
  if (!(data instanceof Array) && typeof data !== 'string') return p.fail('take: expects array or string.');

  if (typeof start === 'string') start = Number(start);
  if (typeof length === 'string') length = Number(length);
  if (typeof start !== 'number' || isNaN(start)) return p.fail('take: expects start to be a number');
  if (typeof length === 'undefined') length = data.length;
  if (typeof length !== 'number' || isNaN(length)) return p.fail('take: expects length to be a number');

  let end;
  if (start >= 0 && typeof length === 'undefined') {
    end = data.length;
  } else if (start < 0 && typeof length === 'undefined') {
    end = data.length + start;
    start = 0;
  } else if (start >= 0) {
    end = start + length;
  } else {
    end = data.length + start - length;
    start = data.length + start;
  }
  if (typeof data === 'string') p.next(data.substring(start, end));
  else p.next(data.slice(start, end));
};
