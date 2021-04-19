/**
   * Trim elements from left and or right side of a string or array.
   * @category Array/String
   * @param {String|Array} [leftOrBothTrim=' '] - The character(s) to trim from the ends of the string, or the left end if the second argument is specified.
   * @param {String|Array} [rightTrim=leftOrBothTrim] - The character(s) to trim from the right side of the string.
   * @example
   * trim                // input: "  hello world  ", output: 'hello world'
   * trim '_'            // input: "__hello_world___", output: 'hello_world'
   * trim ['_','-']      // input: "_-_hello-_world_-_-_", output: 'hello-_world'
   * trim ['_','-'] '_'  // input: "_-_hello-_world_-_-_", output: 'hello-_world_-_-'
   */
exports.trim = data => function (p, leftOrBothTrim, rightTrim) {
  if(typeof data !== 'string' && !(data instanceof Array)) return p.fail('trim: Expected string or array.')

  if (typeof leftOrBothTrim === 'undefined') leftOrBothTrim = [' '];
  if (typeof rightTrim === 'undefined') rightTrim = leftOrBothTrim;

  let start;
  let end;
  for (start = 0; start < data.length && (data[start] === leftOrBothTrim || leftOrBothTrim.indexOf(data[start]) !== -1); ++start) {}
  for (end = data.length - 1; end >= 0 && (data[end] === rightTrim || rightTrim.indexOf(data[end]) !== -1); --end) {}

  const result = typeof data === 'string'
   ? data.substring(start, end + 1)
   : data.slice(start, end - start);

  return p.next(result);
};
