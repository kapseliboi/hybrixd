const JSONfix = require('../../util/jsonfix').parse;

/**
   * Attempt to turn a string into a JSON object. In case of success or failure jump.
   * @category Array/String
   * @param {String} [onSuccess=1] - Amount of steps to jump on success.
   * @param {String} [onFailure=1] - Amount of steps to jump on failure.
   * @example
   * jpar           // input: "{key:'Some data.'}", output: {key:"Some data."}
   * jpar 2         // on successful parse jump 2, else 1, stream stays unchanged
   * jpar 2 1       // on successful parse jump 2, else 1, stream stays unchanged
   */
exports.jpar = data => function (p, onSuccess, onFailure) {
  if (typeof onSuccess !== 'undefined' && isNaN(onSuccess)) return p.fail('jpar: expects numeric onSuccess jump.');
  if (typeof onFailure !== 'undefined' && isNaN(onFailure)) return p.fail('jpar: expects numeric onFailure jump.');

  let result;
  try {
    result = JSON.parse(data);
  } catch (originalError) {
    try {
      result = JSON.parse(JSONfix(data.replace(/\\"/g, '"'))); // try to parse 'dirty' JSON
    } catch (jsonFixError) {
      if (typeof onFailure === 'undefined') return p.fail('jpar: ' + originalError);
      else return p.jump(onFailure || 1, data);
    }
  }
  return p.jump(onSuccess || 1, result);
};
