/**
   * Merge objects.
   * @category Object
   * @example
   *  merg         // input: [{a,1},{b:2}], output: {a:1,b:2}
   *  merg         // input: [{a:1,b:2},{a:2}], output: {a:2,b:2}
   */
exports.merg = data => function (p) {
  if (!(data instanceof Array)) return p.fail('merg: expects array of objects of first parameter');
  const mergedObject = {};
  for (let object of data) {
    if (object instanceof Array || typeof object !== 'object' || object === null) return p.fail('merg: expects array of objects');
    Object.assign(mergedObject, object);
  }
  return p.done(mergedObject);
};
