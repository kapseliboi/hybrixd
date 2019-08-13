/**
   * Join an array into a string.
   * @category Array/String
   * @param {String} [separator=''] - Implode an array to a string, split by separator.
   * @example
   * join       // input: ["This","is","nice."], output: "Thisisnice."
   * join ' '   // input: ["Some","list","of","stuff"], output: "Some list of stuff"
   */
exports.join = data => function (p, separator) {
  if (typeof separator === 'undefined') { separator = ''; }
  const result = data.join(separator);
  this.next(p, 0, result);
};
