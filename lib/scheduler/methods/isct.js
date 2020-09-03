/**
 * Return the intersect of an array or string.
 * @category Array
 * @param {Object} data - Array to compare with.
 * @example
 * isct [1,2,3]        // input: [3,4,5], result: [3]
 * isct ['a','b','c']  // input: ['b', 'c', 'd'], result: ['b','c']
 * isct {a:1,b:2}      // input: {b:3,c:4} result: {b:2}
 */
exports.isct = data => function (p, input) {
  if (data instanceof Array && input instanceof Array) {
    return p.next(data.filter(x => input.includes(x)));
  } else if (typeof data === 'object' && data !== null && typeof input === 'object' && input !== null) {
    const result = {};
    for (let key in data) {
      if (input.hasOwnProperty(key)) result[key] = data[key];
    }
    return p.next(result);
  } else return p.fail('isct: expect data and input types to be both array or both object');
};
