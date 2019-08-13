const scheduler = require('../scheduler');

/**
   * Stop processing and return data.
   * @category Process
   * @param {Number} [err=0] - Set the error flag of the subprocess. (0 = no error, 1 or higher = error)
   * @param {Object} [data=data] - Store data in this subprocess data field. (Passed to parent process on stop.)
   * @example
   *  stop                            // stop processing and set no error
   *  stop "OK"                       // stop processing, set no error, and put "OK" in main process data field
   *  stop 0 "All is good."           // stop processing, set no error, and put "All is good." in main process data field
   *  stop 404 "HELP! Not found."     // stop processing, set error to 404, and put "HELP! Not found." in main process data field
   */
exports.stop = data => function (p, err, xdata) {
  let ydata;
  if (typeof err === 'undefined' && typeof xdata === 'undefined') {
    ydata = data;
    err = 0;
  } else if (typeof err !== 'number' && typeof xdata === 'undefined') {
    ydata = err;
    err = 0;
  } else {
    ydata = typeof xdata === 'undefined' ? data : xdata;
  }
  if (typeof global.hybrixd.proc[p.processID] !== 'undefined') {
    global.hybrixd.proc[p.processID].data = ydata;
  }
  scheduler.stop(p.processID, typeof err === 'undefined' ? 0 : err, ydata);
};
