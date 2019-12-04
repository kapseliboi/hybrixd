/**
   * Move elements from one array to another
   * @category Array/String
   * @param {Number} sourceKey - Group amount above which to keep elements.
   * @param {Number} [sourceCount=0] - Optional:
   * @param {Number} [sourceOffset=0] - Optional:
   * @param {Number} [targetOffset=0] - Optional:
   * @param {Number} [targetCount=0] - Optional:
   * @example
   *  move a 1 1 1 1   // input: [0,1], a: [2,3], output: [0,3], a: [2]
   */
exports.move = data => function (p, sourceKey, a, b, targetOffset, targetCount) {
  // TODO check if data is array/string
  const sourceOffset = typeof b === 'undefined' ? 0 : (a || 0);
  const vars = require('../vars');
  const result = vars.peek(p, sourceKey);
  if (result.e > 0) {
    this.fail('Could not find variable ' + sourceKey);
  } else {
    const source = result.v;
    // TODO check if source is array/string
    const sourceCount = typeof b === 'undefined' ? (a || source.length) : b;
    data.splice(targetOffset, targetCount, ...source.splice(sourceOffset, sourceCount));
    this.next(p, 0, data);
  }
};
