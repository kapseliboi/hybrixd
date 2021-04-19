function stringify (x) {
  return typeof x === 'string' ? x : JSON.stringify(x);
}

function errorHostFailure (p, error) {
  let data = '';
  const recipe = p.getRecipe();
  if (recipe.hasOwnProperty('symbol')) {
    const symbol = recipe.symbol;
    data = `The ${symbol} asset is unavailable right now. The external host is not responding to our requests for information.`;
  } else {
    const id = recipe.id || '';
    data = `The ${id} engine is unavailable right now. The external host is not responding to our requests for information.`;
  }
  data += ` ${stringify(error)} (${p.getName()})`; // TODO can we het http status info here?
  return data;
}

/**
   * Fail processing and return message.
   * @category Process
   * @param {Object} [data=data] - Message/data passed to parent process.
   * @example
   * fail                          // stop processing and set error to 1
   * fail "Something wrong"        // stop processing, set error to 1, and put "Something wrong." in main process data field
   */
exports.fail = data => function (p, xdata) {
  if (xdata === '__HOST_FAILURE__') xdata = errorHostFailure(p, data);
  const ydata = typeof xdata === 'undefined' ? data : xdata;
  p.fail(1, ydata);
};

exports.tests = {
  fail: [
    'hook @hook',
    'fail',
    '@hook',
    "done '$OK'"
  ]
};
