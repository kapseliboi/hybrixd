const LZString = require('../../../common/crypto/lz-string');

/**
   * Deserialize and decompress data, jump on success or failure.
   * @param {Number} [onSuccess=1] - Amount of instructions lines to jump on success.
   * @param {Number} [onFailure=1] - Amount of instructions lines to jump on success.
   * @param {Boolean} [parse=true] - Parse as json
   * @example
   * unpk @success @failure    // unpack the data stream, if successful jump to label @success, else jump to label @failure
   */
exports.unpk = data => function (p, onSuccess, onFailure, parseJSON) {
  let ydata, jumpTo;
  parse = parseJSON !== 'undefined'
            ? parseJSON
              :
                isNaN(onFailure)
                ? onFailure
                : isNaN(onSuccess)
                  ? onSuccess
                  : true;
  try {
    const unpackedData = LZString.decompressFromEncodedURIComponent(data);
    ydata = parse !== false ? JSON.parse(unpackedData) : unpackedData;
    jumpTo = onSuccess || 1;
  } catch (e) {
    ydata = data;
    jumpTo = onFailure || 1;
  }
  if (ydata === null) {
    ydata = data;
    jumpTo = onFailure || 1;
  }
  this.jump(p, !isNaN(jumpTo) ? jumpTo : 1, ydata);
};
