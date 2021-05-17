
/**
   * Delete a storage item
   * @category Storage
   * @param {String} key - key for the item to delete
   * @example
   * incl needle 1 2 // if data is an array or string that includes "needle" then jump 1, 2 otherwise
   * incl myVar needle 1 2 // if myVar is an array or string that includes "needle" then jump 1, 2 otherwise
   */
exports.incl = data => function (p, ...args) {
  let haystack, needle, onSuccess, onFail;
  if (args.length === 4 || typeof args[1] === 'string') {
    const variableName = args[0];
    const result = p.peek(variableName);
    if (result.e > 0) return p.fail(`incl: failed to read ${variableName}`);
    haystack = result.v;
    [needle, onSuccess, onFail] = args.slice(1);
  } else {
    haystack = data;
    [needle, onSuccess, onFail] = args;
  }
  if (typeof haystack === 'string' || (haystack instanceof Array)) {
    p.jump(haystack.includes(needle) ? onSuccess || 1 : onFail || 1);
  } else p.fail('incl: expects array or string.');
};

exports.tests = {
  incl1: [
    'data ab',
    'incl a 1 2',
    'done $OK',
    'fail'
  ],
  incl2: [
    'data ab',
    'incl c 2 1',
    'done $OK',
    'fail'
  ],
  incl3: [
    'data [a,b]',
    'incl a 1 2',
    'done $OK',
    'fail'
  ],
  incl4: [
    'data [a,b]',
    'incl c 2 1',
    'done $OK',
    'fail'
  ],
  incl5: [
    'data [a,b]',
    'poke array',
    'data [c,d]',
    'incl array a 1 2',
    'done $OK',
    'fail'
  ]

};
