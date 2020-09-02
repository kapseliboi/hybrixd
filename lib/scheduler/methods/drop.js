function isInteger (x) {
  return !isNaN(x) && Math.floor(Number(x)) === Number(x);
}
/**
   * Drop elements from the start or end of an array or string.
   * (Reversed function of pick and push.)
   * @category Array/String
   * @param {Integer} [offset=1] - Amount of elements to delete from start.
   * @param {Integer} [ending=0] - Amount of elements to include or trim from end.
   * @example
   *  drop 5      // drop from the left    input: 'this_is_my_data', output: 'is_my_data'
   *  drop -5     // drop from the right   input: 'this_is_my_data', output: 'this_is_my'
   *  drop 5 5    // drop from both edges  input: 'this_is_my_data', output: 'is_my'
   */
exports.drop = ydata => function (p, offset, ending) {
  let str;
  if (typeof ydata === 'string') {
    str = true;
    ydata = ydata.split('');
  }
  if (typeof offset === 'undefined') offset = 1;

  if (ydata instanceof Array) {
    if (isInteger(offset)) {
      let a;
      let b;
      if (offset < 0) {
        if (typeof ending === 'undefined') {
          a = 0;
          b = ydata.length + offset;
        } else {
          p.fail('drop: illegal ending for negative offset');
          return;
        }
      } else {
        if (typeof ending === 'undefined') {
          a = offset;
          b = ydata.length;
        } else if (isInteger(ending) && ending >= 0) {
          a = offset;
          b = ydata.length - ending;
        } else {
          p.fail('drop: expected non negative integer ending for array');
          return;
        }
      }
      ydata = ydata.slice(a, b);
    } else {
      p.fail('drop: expected integer offset for array');
      return;
    }
    if (str) ydata = ydata.join('');
  } else if (typeof ydata === 'object' && ydata !== null) {
    delete ydata[offset];
  } else {
    p.fail('drop: expects array, string or object');
    return;
  }

  p.next(ydata);
};
