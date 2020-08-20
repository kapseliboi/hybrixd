const math = require('../math');

/**
   * Scan through the values of an array or object, and return values that pass the test.
   * @param {String} test - Test to perform when scanning.
   * @param {String} [cumulative] - Cumulative operation.
   * @param {Number} [cinit=0] - Initial value of cumulative counter.
   * @example
   * scan val>5              // input: [1,2,3,4,5,6,7,8], output: [6,7,8]
   * scan cnt>5              // input: [1,2,3,4,5,6,7,8], output: [4,5,6,7,8]
   * scan cnt>20 +(val*2)  // input: [2,4,6,8,10,12,14,16], output: [6,8,10,12,14,16]
   * scan cnt>5 '' 3         // input: [1,2,3,4,5,6,7,8], output: [3,4,5,6,7,8]
   * scan cnt>1 +val.b     // input: [{a:'a',b:1},{a:'b',b:1},{a:'c',b:1}], output: [{a:'b',b:1},{a:'c',b:1}]
   */
exports.scan = scanArray => function (p, test, cumulative, cinit) {
  // TODO check if test is string
  // TODO check if cumulative is string
  // TODO check if cinit is string or number

  if (!(scanArray instanceof Array)) return p.fail('scan: expects data to be of array type.');

  if (typeof cinit === 'undefined') cinit = 0;
  else {
    const result = math.calc('0+' + cinit, p);
    if (result.error) return p.fail(result.error);
    cinit = result.data;
  }

  let cnt = '0';
  const matches = [];
  if (!cumulative) cumulative = '+val';
  for (let key = 0; key < scanArray.length; key++) {
    const val = scanArray[key];

    const replace = function (x) {
      if (x === 'key') return key;
      if (x === 'cnt') return cnt;
      if (x === 'val') return val;
      if (x.startsWith('val.')) return val[x.split('.')[1]];
      return NaN;
    };

    const cumulstr = String(cnt) + cumulative.replace(/(key|val|cnt)[.|a-z|A-Z]*/g, replace);
    const result = math.calc(cumulstr, p);
    if (result.error) return p.fail(result.error);
    cnt = result.data;

    if (isNaN(cnt)) return p.fail('scan encountered NaN');

    const testCondition = test.replace(/(key|val|cnt)[.|a-z|A-Z]*/g, replace);
    const testResult = math.calc(testCondition, p);
    if (testResult.error) return p.fail(testResult.error);
    if (testResult.data === 'true') matches.push(val);
  }
  return p.next(matches);
};
