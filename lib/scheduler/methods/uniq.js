/**
   * Remove all duplicate elements from an array, leaving only unique entries.
   * @category Array/String
   * @param {Number} [groupSize=1] - Maximum group size of which to keep elements.
   * @example
   *  uniq            // input: ['g','l','o','l','l','s','s'], output: ['g','l','o','s']
   *  uniq 2          // input: ['g','l','o','l','l','s','s'], output: ['g','l','l','o','s','s'] - two or less unique entries
   */
exports.uniq = ydata => function (p, amount) {
  if (isNaN(amount) && typeof amount !== 'undefined') return p.fail('uniq: expects numerical amount');

  let str;
  if (typeof ydata === 'string') {
    str = true;
    ydata = ydata.split('');
  }
  if (!(ydata instanceof Array)) return p.fail('uniq: expects array or string input');

  amount = amount || 1;

  for (let i = 0; i < ydata.length; i++) {
    let entries = 1;
    for (let j = i + 1; j < ydata.length; j++) {
      if (ydata[i] === ydata[j]) {
        if (entries >= amount) {
          ydata.splice(j, 1);
          --j;
        }
        entries++;
      }
    }
  }
  if (str) ydata = ydata.join('');
  return p.next(ydata);
};
