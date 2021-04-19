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
   *  drop a      // drop key from object   input: {a:1,b:2}, output: {b:2}}
   *  drop [1,3]  // drop indices    input: 'this_is_my_data', output: 'ti_is_my_data'
   *  drop [a,b]  // drop keys from object   input: {a:1,b:2,c:3}, output: {c:3}}
   */
exports.drop = ydata => function (p, offset, ending) {
  let str;
  if (typeof ydata === 'string') {
    str = true;
    ydata = ydata.split('');
  }

  if (ydata instanceof Array) {
    if (typeof offset === 'undefined') offset = 1;

    if (offset instanceof Array && typeof ending === 'undefined') {
      offset.sort().reverse();
      for (const index of offset) ydata.splice(index, 1);
    } else if (isInteger(offset)) {
      let a;
      let b;
      if (offset < 0) {
        if (typeof ending === 'undefined') {
          a = 0;
          b = ydata.length + offset;
        } else return p.fail('drop: illegal ending for negative offset');
      } else {
        if (typeof ending === 'undefined') {
          a = offset;
          b = ydata.length;
        } else if (isInteger(ending) && ending >= 0) {
          a = offset;
          b = ydata.length - ending;
        } else return p.fail('drop: expected non negative integer ending for array');
      }
      ydata = ydata.slice(a, b);
    } else return p.fail('drop: expected integer offset for array');

    if (str) ydata = ydata.join('');
  } else if (typeof ydata === 'object' && ydata !== null) {
    if (typeof offset === 'undefined') return p.fail('drop: Expected key');
    if (offset instanceof Array) {
      for (const key of offset) delete ydata[key];
    } else delete ydata[offset];
  } else return p.fail('drop: expects array, string or object');

  return p.next(ydata);
};

exports.tests = {
  drop1: [
    "data 'abc'",
    'drop 1',
    "flow 'bc' 1 2",
    'done $OK',
    'fail'
  ],
  drop2: [
    "data 'abc'",
    'drop -1',
    "flow 'ab' 1 2",
    'done $OK',
    'fail'
  ],
  drop3: [
    "data 'abc'",
    'drop 1 1',
    "flow 'b' 1 2",
    'done $OK',
    'fail'
  ],
  drop4: [
    'data {a:1,b:2}',
    'drop b',
    'jstr',
    "flow '{\"a\":1}' 1 2",
    'done $OK',
    'fail'
  ],
  drop5: [
    'data abcde',
    'drop [1,3]',
    'flow ace 1 2',
    'done $OK',
    'fail'
  ],
  drop6: [
    'data {a:1,b:2,c:3}',
    'drop [b,c]',
    'jstr',
    "flow '{\"a\":1}' 1 2",
    'done $OK',
    'fail'
  ]
};
