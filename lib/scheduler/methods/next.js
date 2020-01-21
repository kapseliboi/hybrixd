const scheduler = require('../scheduler');
/*
    Not used by qrtz programmers. Internally used by scheduler. Goes to the next step of execution.
    err:    Set the error flag of the subprocess.  (0 = no error, 1 or higher = error)
    data:   Store data in the subprocess data field.
  */
exports.next = () => function (p, err, xdata) {
  if (err !== 0) {
    scheduler.stop(p.processID, err, xdata);
  } else {
    global.hybrixd.proc[p.processID].err = (typeof err === 'undefined' ? 1 : err);
    global.hybrixd.proc[p.processID].busy = false;
    global.hybrixd.proc[p.processID].progress = 1;
    global.hybrixd.proc[p.processID].stopped = Date.now();
    global.hybrixd.proc[p.processID].data = xdata;
  }
};
