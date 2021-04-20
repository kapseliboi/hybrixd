/**
   * Turns JSON object into a string.
   * @category Array/String
   * @example
   * jstr           // input: {key:"Some data."}, output: '{key:"Some data."}'
   */
exports.jstr = data => function (p) {
  return typeof data === 'undefined'
    ? p.next('undefined')
    : p.next(JSON.stringify(data));
};

exports.tests = {
  jstr: [
    'data {key:value,array:[1,2,3]}',
    'jstr',
    "flow '{\"key\":\"value\",\"array\":[1,2,3]}' 1 2",
    'done $OK',
    'fail'
  ]
};
