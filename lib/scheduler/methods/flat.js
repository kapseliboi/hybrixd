const subFlatten = depth => (flattenedArray, arrayValue) => arrayValue instanceof Array
  ? flattenedArray.concat(flatten(arrayValue, typeof depth === 'undefined' ? depth : depth - 1)) // arrayValue is an array value itself, continue flattening
  : flattenedArray.concat(arrayValue);

function flatten (array, depth) {
  return depth === 0
    ? array
    : array.reduce(subFlatten(depth), []);
}
/**
   * Flatten an array or object.
   * @category Array/String
   * @param {Integer} [depth=infinite] - How deep to flatten the array
   * @example
   *  flat         // input: [1,2,3,[4,5]], output: [1,2,3,4,5]
   *  flat         // input: {a:1,b:2,c:3}, output: [[a,b,c],[1,2,3]]
   */
exports.flat = data => function (p, depth) {
  if (typeof depth !== 'undefined' && (isNaN(depth) || depth < 0)) return p.fail('merg: expects positive integer depth.');
  if (data instanceof Array) p.next(flatten(data, depth));
  else if (typeof data === 'object' && data !== null) p.next([Object.keys(data), Object.values(data)]);
  else p.fail('flat: expects array or non null object.');
};
