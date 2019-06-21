function excludeEntries (input, value) {
  let found = 0;
  let entries;
  let result = [];
  if (value instanceof Array) {
    for (let key = 0; key < input.length; key++) {
      if (value.indexOf(input[key]) > -1) {
        found += 1;
      } else {
        result.push(input[key]);
      }
    }
  } else {
    for (let key = 0; key < input.length; key++) {
      if (input[key] === value) {
        found += 1;
      } else {
        result.push(input[key]);
      }
    }
  }
  return {n: found, v: result};
}
/**
   * Exclude elements from an array or input string based on their value.
   * Jump to a target based on success or failure.
   * (Reversed function of filt.)
   * @category Array/String
   * @param {String} value - Amount of elements to delete from start
   * @example
   *  excl('g')        // matching exclude           input: ['g','l','o','v','e','s'], output: ['l','o','v','e','s']
   *  excl(['g','s'])  // multiple exclude           input: ['g','l','o','v','e','s'], output: ['l','o','v','e']
   *  excl('g',2)      // matching exclude, jump two places
   */
exports.excl = ydata => function (p, value, success, failure) {
  let str = false;
  if (typeof ydata === 'string') {
    str = true;
    ydata = ydata.split('');
  }
  const result = excludeEntries(ydata, value);
  if (str) {
    ydata = result.v.join('');
  } else {
    ydata = result.v;
  }
  if (result.n) {
    this.jump(p, isNaN(success) ? 1 : success || 1, ydata);
  } else {
    this.jump(p, isNaN(failure) ? 1 : failure || 1, ydata);
  }
};
