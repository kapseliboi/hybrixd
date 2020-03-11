/**
   * Fail processing and return message.
   * @category Process
   * @param {Object} [data=data] - Message/data passed to parent process.
   * @example
   * fail                          // stop processing and set error to 1
   * fail "Something wrong"        // stop processing, set error to 1, and put "Something wrong." in main process data field
   */
exports.fail = data => function (p, xdata) {
  const ydata = typeof xdata === 'undefined' ? data : xdata;
  p.fail(1, ydata);
};
