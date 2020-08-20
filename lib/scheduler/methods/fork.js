/**
   * Creates a new process by calling the command asynchronously.
   * @category Process
   * @param {String} command - A string containing the call and path. "command/a/b". This calls 'command' using $1 = "a", $2 = "b".
   * @param {Object} [data=data] - Optional data to be passed to the new process.
   * @param {Number} [childReferenceID] - If undefined then the new process will be independant. If true this will be a single child. Otherwise it will be instantiated as one of multiple child processes of the current process.
   * @example
   * fork "balance/_dummyaddress_"   // starts a process to retrieve the dummy balance and continue without waiting for a reply
   */
exports.fork = data => function (p, command, xdata, childReferenceID) {
  if (typeof command !== 'string') return p.fail('fork: expected command to be a string');

  const ydata = typeof xdata === 'undefined' ? data : xdata;

  command = command.split('/'); // "dummy/balance/_dummyaddress_" => ["dummy","balance","_dummyaddress_"]
  const subProcessId = p.fork(command, ydata, childReferenceID);
  return subProcessId;
};
