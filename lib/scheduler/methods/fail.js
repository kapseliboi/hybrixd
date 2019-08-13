/**
   * Fail processing and return message.
   * @category Process
   * @param {Number} [err=1] - Set the error flag of the subprocess.   (0 = no error, 1 (Default), or higher = error)
   * @param {Object} [data=data] - Message/data passed to parent process.
   * @example
   * fail                          // stop processing and set error to 1
   * fail "Something wrong"        // stop processing, set error to 1, and put "Something wrong." in main process data field
   * fail 404 "HELP! Not found."   // stop processing, set error to 404, and put "HELP! Not found." in main process data field
   */
exports.fail = () => function (p, err, xdata) {
  const ydata = typeof xdata === 'undefined' ? err : xdata;
  this.stop(p, typeof xdata === 'undefined' ? 1 : err, ydata);
};
