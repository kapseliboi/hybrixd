const baseCode = require('../../../common/basecode');

/**
   * Change encoding of a string from one format to the other.
   * @category Array/String
   * @param {String} target - Target encoding.
   * @param {String} [source='base256'] - Source encoding.
   * @example
   *  code bin           // convert ASCII to binary - input: 'woot', returns: '1110111011011110110111101110100'
   *  code utf8 base58   // convert UTF8 to base58 - input: 'this_is_my_data', returns: '4FtePA9kj2RpFH4tBkPUt'
   *  code hex base58    // convert HEX to base58 - input: '8BA9C1B4', returns: '4a4JJF'
   */
exports.code = input => function (p, source, target) {
  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    const output = baseCode.recode(source, target, String(input));
    return p.next(output);
  } else return p.fail('code: expects string, boolean or number input');
};

exports.tests = {
  code: [
    'data woot',
    'code utf-8 bin',
    "flow '1110111011011110110111101110100' 1 2",
    'done $OK',
    'fail'
  ]
};
