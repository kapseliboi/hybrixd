const JSONfix = require('../../util/jsonfix').parse;

/**
   * Attempt to turn a string into a JSON object. In case of success or failure jump.
   * @category Array/String
   * @param {String} [success=1] - Amount of steps to jump on success.
   * @param {String} [failure=1] - Amount of steps to jump on failure.
   * @example
   * jpar           // input: "{key:'Some data.'}", output: {key:"Some data."}
   * jpar 2         // on successful parse jump 2, else 1, stream stays unchanged
   * jpar 2 1       // on successful parse jump 2, else 1, stream stays unchanged
   */
exports.jpar = data => function (p, success, fail) {
  const ydata = data.replace(/\\"/g, '"');
  try {
    this.jump(p, isNaN(success) ? 1 : success || 1, JSON.parse(JSONfix(ydata)));
  } catch (e) {
    this.jump(p, isNaN(fail) ? 1 : fail || 1, data);
  }
};
