const baseCode = require('../../../common/basecode');

/**
   * Change encoding of a string from one format to the other.
   * @category Array/String
   * @param {String} target   - Target encoding
   * @param {String} [source='base256'] - Source encoding
   * @example
   *  code('bin')             // input: 'woot', returns: '1110111011011110110111101110100'
   *  code('utf-8','base58')  // input: 'this_is_my_data', returns: '4FtePA9kj2RpFH4tBkPUt'
   *  code('hex','base58')    // input: '8BA9C1B4', returns: '4a4JJF'
   */
exports.code = input => function (p, source, target) {
  const output = baseCode.recode(source, target, input);
  this.next(p, 0, output);
};
