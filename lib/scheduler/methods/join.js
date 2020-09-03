/**
   * Join an array into a string.
   * @category Array/String
   * @param {String} [separator=''] - Implode an array to a string, split by separator.
   * @param {String} [separator2=''] - Implode key value pairs in an object to a string, split by separator.
   * @example
   * join       // input: ["This","is","nice."], output: "Thisisnice."
   * join       // input: [{a:1},{b:2}], output: "{a:1,b:2}"
   * join ' '   // input: ["Some","list","of","stuff"], output: "Some list of stuff"
   * join = ;   // input: {a:1,b:2}, output: "a=1;b=2"
   */
exports.join = data => function (p, separator, separator2) {
  if (data instanceof Array) {
    if (data.length === 0) return p.next('');
    else {
      if (typeof separator === 'undefined') separator = '';
      const head = data[0];
      const result = typeof head === 'object' && head !== null
        ? Object.assign.apply({}, data) // merge objects
        : data.join(separator); // join as strings
      return p.next(result);
    }
  } else if (typeof data === 'object' && data !== null) {
    if (typeof separator === 'undefined') separator = '';
    if (typeof separator2 === 'undefined') separator2 = '';
    const result = Object.entries(data).map(keyValuePair => keyValuePair.join(separator2)).join(separator);
    return p.next(result);
  } else return p.fail('Expect array or object for join');
};
