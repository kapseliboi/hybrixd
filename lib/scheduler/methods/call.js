/**
   * Creates a new process by calling the xpath command and wait for the data to be returned (combines fork and read).
   * TODO: the description below of the command path is incorrect, the path cannot be retrieved in the child fork!
   * @category Process
   * @param {String} command -  A string containg the command path. "command/a/b". processStepID calls command using $1 = "a", $2 = "b"
   * @param {Object} [data=data] -  Optional data to be passed to the new process
   * @example
   * call("balance/_dummyaddress_")          // Retrieve the balance and pass it to next step.
   */
exports.call = data => function (p, command, xdata) {
  const ydata = typeof xdata === 'undefined' ? data : xdata;
  const childProcId = this.fork(p, command, 0, ydata);
  this.read(p, childProcId);
};
