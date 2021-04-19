/**
   * Get the front of a string or array.
   * @category Array/String
   * @param {Number} [size=1] - The amount of characters to get.
   * @example
   * data 'abc'
   * head           // return 'a'
   * head 1         // return 'a'
   * head 2         // return 'ab'
   */
exports.head = data => function (p, size) {
  if (typeof data === 'string') return p.next(data.substr(0, size));
  else if (data instanceof Array) return p.next(data.splice(0, size));
  else return p.fail('head: expects string or array.');
};

exports.tests = {
  head: [
    'data appeltaart',
    'head 5',
    "flow 'appel' 1 2",
    'done $OK',
    'fail'
  ]
};
