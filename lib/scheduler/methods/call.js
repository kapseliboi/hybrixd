/**
   * Execute a quartz routine in the same engine. Call creates a new process and waits for the data of that process
   * to be returned (combining Qrtz commands fork and read).
   * @category Process
   * @param {String} command - A string containg the command path. E.g. "command/a/b". The child process provides its arguments: $1 = "a", $2 = "b"
   * @param {Object} [data=data] - Optional data to be passed to the new process.
   * @example
   * call balance/_dummyaddress_  // Call the balance routing and pass the result to next step.
   */
exports.call = data => function (p, command, xdata) {
  const ydata = typeof xdata === 'undefined' ? data : xdata;
  this.fork(p, command, ydata, true);
};
