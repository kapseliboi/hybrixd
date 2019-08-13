/**
   * Stop processing and return message.
   * @category Process
   * @param {Object} [data=data] - Message/data passed to parent process.
   * @example
   * done                  // stop processing without error
   * done "Success"        // stop processing without error and put "Success" in main process data field
   */
exports.done = data => function (p, xdata) {
  const ydata = typeof xdata === 'undefined' ? data : xdata;
  this.stop(p, 0, ydata);
};
