const math = require('../math');

/**
   * Merge objects.
   * @category Object
   * @param {String|Object} [mergeOperator] - Operator to perform merge with
   * @example
   *  merg                 // input: [{a,1},{b:2}], output: {a:1,b:2}
   *  merg                 // input: [{a:1,b:2},{a:2}], output: {a:2,b:2}
   *  merg +               // input: [{a:1},{a:2}], output: {a:-1}
   *  merg {a:+,b:-}       // input: [{a:1,b:1},{a:2,b:2}], output: {a:3,b:-1}
   */
exports.merg = data => function (p, mergeOperator) {
  if (!(data instanceof Array)) return p.fail('merg: expects array of objects of first parameter');
  const mergedObject = {};
  for (let object of data) {
    if (object instanceof Array || typeof object !== 'object' || object === null) return p.fail('merg: expects array of objects');

    if (mergeOperator) {
      for (let key in object) {
        if (!mergedObject.hasOwnProperty(key)) mergedObject[key] = object[key];
        else {
          let mergeSubOperator;
          if (typeof mergeOperator === 'string') mergeOperator = mergeSubOperator;
          if (typeof mergeOperator === 'object' && mergeOperator !== null) {
            if (mergeOperator.hasOwnProperty(key)) mergeSubOperator = mergeOperator[key];
            else {
              mergedObject[key] = object[key];
              break;
            }
          } else return p.fail(`merge: expected string or object mergeOperator`);

          const mergeOperation = mergedObject[key] + mergeSubOperator + object[key];
          const result = math.calc(mergeOperation, p);
          if (result.error) return p.fail(result.error);
          mergedObject[key] = result.data;
        }
      }
    } else Object.assign(mergedObject, object);
  }
  return p.done(mergedObject);
};
