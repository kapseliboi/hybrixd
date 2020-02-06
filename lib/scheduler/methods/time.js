/**
   * Set timeout of current process.
   * @category Process
   * @param {Number} [millisecs] - Amount of milliseconds to wait. If not specified the timeout is unlimited, and only limited by the scheduler engine.
   * @param {Object} [data=data] - Set data variable as soon as the process times out.
   * @param {Object} [err=1] - Value to set the error flag to as soon as the process times out.
   * @example
   * time                      // set unlimited timeout
   * time 0                    // immediately timeout the process
   * time 1000                 // set timeout to one second
   * time 1000 "Time's up!" 0  // set timeout to one second, if exceeded set data to "Time's up!" and give no error
   */
exports.time = data => function (p, millisecs, hookData, hookErr) {
  // TODO check if NaN

  /*
TODO Moet hier nog iets mee?

  if (typeof hookData !== 'undefined' || typeof hookErr !== 'undefined') {
    process.timeHook = {data: typeof hookData === 'undefined' ? global.hybrixd.proc[p.processID].data : hookData, err: (typeof hookErr === 'undefined' ? 1 : hookErr)};
  } */
  p.setTimeOut(millisecs);
  p.next(data);
};
