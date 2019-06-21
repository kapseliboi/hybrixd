const LZString = require('../../../common/crypto/lz-string');

/**
   * Compress and serialize data
   * @example
   * pack
   */
exports.pack = data => function (p) {
  const ydata = LZString.compressToEncodedURIComponent(JSON.stringify(data));
  this.next(p, 0, ydata);
};
