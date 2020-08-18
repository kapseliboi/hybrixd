/**
   * Flip reverse the contents of an array or string
   * @category Array/String
   * @example
   * flip   // input: "hello world", output: 'dlrow olleh'
   * flip   // input: ['a','b','c'], output: ['c','b','a']
   */
exports.flip = ydata => function (p) {
  let str = false;
  if (typeof ydata === 'string') {
    str = true;
    ydata = ydata.split('');
  }
  if (ydata instanceof Array) {
    ydata = ydata.reverse();
    if (str) ydata = ydata.join('');
    p.next(ydata);
  } else p.fail('flip: expects array or string');
};
