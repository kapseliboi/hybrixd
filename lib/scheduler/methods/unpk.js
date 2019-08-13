const LZString = require('../../../common/crypto/lz-string');

/**
   * Deserialize and decompress data, jump on success or failure.
   * @example
   * unpk @success @failure    // unpack the data stream, if successful jump to label @success, else jump to label @failure
   */
exports.unpk = data => function (p, success, failure) {
  let ydata, jumpTo;
  try {
    ydata = JSON.parse(LZString.decompressFromEncodedURIComponent(data));
    jumpTo = success || 1;
  } catch (e) {
    ydata = data;
    jumpTo = failure || 1;
  }
  if (ydata === null) {
    ydata = data;
    jumpTo = failure || 1;
  }
  this.jump(p, jumpTo || 1, ydata);
};
