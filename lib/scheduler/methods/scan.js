const math = require('../math');

/**
   * Scan through the values of an array or object, and return values that pass the test.
   * @param {String} test       - Test to perform when scanning
   * @param {String} cumulative - Cumulative operation
   * @param {Number} [cinit=0]      - Initial value of cumulative counter
   * @example
   * scan('val>5')             // input: [1,2,3,4,5,6,7,8], output: [6,7,8]
   * scan('val>5')             // val is shorthand for value - input: [1,2,3,4,5,6,7,8], output: [6,7,8]
   * scan('cnt>5')             // input: [1,2,3,4,5,6,7,8], output: [4,5,6,7,8]
   * scan('cnt>20','+(val*2)') // input: [2,4,6,8,10,12,14,16], output: [6,8,10,12,14,16]
   * scan('cnt>5','',3)        // input: [1,2,3,4,5,6,7,8], output: [3,4,5,6,7,8]
   * scan('cnt>1','+val.b')    // input: [{a:'a',b:1},{a:'b',b:1},{a:'c',b:1}], output: [{a:'b',b:1},{a:'c',b:1}]
   */
exports.scan = scanArray => function (p, test, cumulative, cinit) {
  if (Object.prototype.toString.call(scanArray) !== '[object Array]') {
    scanArray = [scanArray];
  }
  if (typeof cinit === 'undefined') { cinit = 0; } else { cinit = math.calc('0+' + cinit); }
  let val;
  let cnt = '0';
  let matches = [];
  let cumulstr = '';
  let teststr = '';
  if (!cumulative) { cumulative = '+val'; }
  for (let key = 0; key < scanArray.length; key++) {
    val = scanArray[key];
    cumulstr = String(cnt) + cumulative.replace(/(key|val|cnt)[.|a-z|A-Z]*/g, function (x) { return (+eval(x)).toFixed(17); });
    cnt = math.calc(cumulstr);
    teststr = test.replace(/(key|val|cnt)[.|a-z|A-Z]*/g, function (x) { return (+eval(x)).toFixed(17); });
    if (math.calc(teststr) === 'true') {
      matches.push(val);
    }
  }
  this.next(p, 0, matches);
};
