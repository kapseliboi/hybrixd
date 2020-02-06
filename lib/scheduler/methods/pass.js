/**
   * Pass data to parent process.
   * @param {Object} [data=data] -  Store data in this subprocess data field. Passed to parent process.
   * @category Process
   * @example
   * pass                 // push data stream contents to master process
   * pass 'Nice dude!'    // push data "Nice dude!" to master process
   * pass 'Wow: $'        // push data "Wow:" with previous subprocess data concatenated
   */
exports.pass = data => function (p, xdata) {
  const ydata = typeof xdata === 'undefined' ? data : xdata;
  p.pass(ydata);
  p.next(ydata);
};
