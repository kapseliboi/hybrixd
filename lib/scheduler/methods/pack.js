const LZString = require('../../../common/crypto/lz-string');

/**
   * Compress and serialize data into an URL-safe format.
   * @example
   * pack       // serializes and compresses the data stream into an URL-safe format
   */
exports.pack = data => function (p) {
  const ydata = LZString.compressToEncodedURIComponent(JSON.stringify(data));
  this.next(p, 0, ydata);
};
