function filterThese (input, value) {
  let output = [];
  for (let i = 0; i < input.length; i++) {
    if (value.constructor === Array) {
      for (let j = 0; j < value.length; j++) {
        if (input[i] === value[j]) {
          output.push(input[i]);
        }
      }
    } else {
      if (input[i] === value) {
        output.push(input[i]);
      }
    }
  }
  return output;
}
/**
   * Filter all specified elements from an array, removing all other entries.
   * (Reversed function of excl.)
   * @category Array/String
   * @example
   *  filt(['o','g'])           // input: ['g','l','o','l','l','s','s'], output: ['g','o']
   */
exports.filt = ydata => function (p, value) {
  let str;
  if (typeof ydata === 'string') {
    str = true;
    ydata = ydata.split('');
  }
  ydata = filterThese(ydata, value);
  if (str) {
    ydata = ydata.join('');
  }

  this.next(p, 0, ydata);
};
