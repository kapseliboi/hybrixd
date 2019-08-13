/**
   * Remove all duplicate elements from an array, leaving only unique entries.
   * @category Array/String
   * @param {Number} [groupSize=1] - Optional: Maximum group size of which to keep elements.
   * @example
   *  uniq            // input: ['g','l','o','l','l','s','s'], output: ['g','l','o','s']
   *  uniq 2          // input: ['g','l','o','l','l','s','s'], output: ['g','l','l','o','s','s'] - two or less unique entries
   */
exports.uniq = ydata => function (p, amount) {
  amount = amount || 1;
  let str;
  if (typeof ydata === 'string') {
    str = true;
    ydata = ydata.split('');
  }
  let sorted = ydata.sort();
  for (let i = 0; i < ydata.length; i++) {
    let entries = 0;
    for (let j = 0; j < ydata.length; j++) {
      if (ydata[i] === sorted[j]) {
        if (entries >= amount) {
          ydata.splice(i, 1);
        }
        entries++;
      }
    }
  }
  if (str) {
    ydata = ydata.join('');
  }
  this.next(p, 0, ydata);
};
