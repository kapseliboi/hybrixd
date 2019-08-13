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
  let ydata = typeof xdata === 'undefined' ? data : xdata;
  global.hybrixd.proc[p.parentID].data = ydata;
  this.next(p, 0, ydata);
};
