/**
   * Trim elements from left and or right side
   * @category Array/String
   * @param {String} [leftOrBothTrim=' '] - TODO
   * @param {String} [rightTrim=leftOrBothTrim] - TODO
   * @example
   * trim            // input: "  hello world  ", output: 'hello world'
   * trim '_'        // input: "__hello_world___", output: 'hello_world'
   * trim ['_','-']  // input: "_-_hello-_world_-_-_", output: 'hello-_world'
   * trim ['_','-'] '_'  // input: "_-_hello-_world_-_-_", output: 'hello-_world_-_-'
   */
exports.trim = ydata => function (p, leftOrBothTrim, rightTrim) {
  if (typeof leftOrBothTrim === 'undefined') { leftOrBothTrim = [' ']; }
  if (typeof rightTrim === 'undefined') { rightTrim = leftOrBothTrim; }
  let start;
  let end;
  for (start = 0; start < ydata.length && (ydata[start] === leftOrBothTrim || leftOrBothTrim.indexOf(ydata[start]) !== -1); ++start) {}
  for (end = ydata.length - 1; end >= 0 && (ydata[end] === rightTrim || rightTrim.indexOf(ydata[end]) !== -1); --end) {}
  let result;
  if (typeof ydata === 'string') {
    result = ydata.substring(start, end + 1);
  } else {
    result = ydata.slice(start, end - start);
  }

  this.next(p, 0, result);
};
