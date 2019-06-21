const JSONfix = require('../../util/jsonfix').parse;

/**
   * Turns a string into a JSON object. In case of failure pass default.
   * @category Array/String
   * @param {String} [onSuccess=1] - TODO
   * @param {String} [onError=1] - TODO
   * @example
   * jpar()         // input: "{key:'Some data.'}", output: {key:"Some data."}
   * jpar(2)        // on successful parse jump 2, else 1, stream stays unchanged
   * jpar(2,1)      // on successful parse jump 2, else 1, stream stays unchanged
   */
exports.jpar = data => function (p, success, fail) {
  const ydata = data.replace(/\\"/g, '"');
  try {
    this.jump(p, isNaN(success) ? 1 : success || 1, JSON.parse(JSONfix(ydata)));
  } catch (e) {
    this.jump(p, isNaN(fail) ? 1 : fail || 1, data);
  }
};
