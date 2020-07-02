/**
   * Join an array into a string.
   * @category Array/String
   * @param {String} [separator=''] - Implode an array to a string, split by separator.
   * @example
   * join       // input: ["This","is","nice."], output: "Thisisnice."
   * join       // input: [{a:1},{b:2}], output: "{a:1,b:2}"
   * join ' '   // input: ["Some","list","of","stuff"], output: "Some list of stuff"
   */
exports.join = data => function (p, separator) {
  if (typeof separator === 'undefined') { separator = ''; }

  if (data instanceof Array) {
    if (data.length === 0) {
      this.next(p, 0, '');
    } else {
      const head = data[0];
      const result = typeof head === 'object' && head !== null
        ? Object.assign.apply({}, data) // merge objects
        : data.join(separator); // join as strings
      this.next(p, 0, result);
    }
  } else {
    this.fail(p, 'Expect array for join');
  }
};
