/**
   * Drop elements from the start or end of an array or string.
   * (Reversed function of pick and push.)
   * @category Array/String
   * @param {Integer} [offset=1] - Amount of elements to delete from start.
   * @param {Integer} ending - Amount of elements to include or trim from end.
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
  if (typeof offset === 'undefined') {
    offset = 1;
  }

  if (!isNaN(offset)) {
    let a;
    let b;
    if (offset < 0) {
      if (isNaN(ending)) {
        a = 0;
        b = ydata.length + offset;
      } else if (ending < 0) {
        // undefined
      } else {

      }
    } else {
      if (isNaN(ending)) {
        a = offset;
        b = ydata.length;
      } else if (ending < 0) {
        // undefined
      } else {
        a = offset;
        b = ydata.length - ending;
      }
    }

    ydata = ydata.slice(a, b);
  }
  if (str) {
    ydata = ydata.join('');
  }
  this.next(p, 0, ydata);
};
