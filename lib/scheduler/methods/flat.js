function flattenDeep (arr1, depth) {
  if (depth === 0) {
    return arr1;
  } else {
    return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val, typeof depth === 'undefined' ? depth : depth - 1)) : acc.concat(val), []);
  }
}
/**
   * Flatten an array or object.
   * @category Array/String
   * @param {Integer} [depth=infinite] - Amount of elements to delete from start
   * @example
   *  flat         // input: [1,2,3,[4,5]], output: [1,2,3,4,5]
   *  flat         // input: {'a':1,'b':2,'c':3], output: [['a','b','c'],[1,2,3]]
   */
exports.flat = data => function (p, depth) {
  if (data instanceof Array) {
    this.next(p, 0, flattenDeep(data, depth));
  } else if (typeof data === 'object' && data !== null) {
    this.next(p, 0, [Object.keys(data), Object.values(data)]);
  } else {
    this.fail('flat expects array or non null object.');
  }
};
