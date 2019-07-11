const DEFAULT_PROCESS_TIMEOUT = 15000;

// process ID decomposition
function procpart (processID) {
  const procsplit = processID.split('.');
  const pieces = [];
  const procinfo = [];
  procinfo[0] = '';
  // store parent in first element
  for (let i = 0; i < procsplit.length - 1; i += 1) {
    pieces[i] = procsplit[i];
  }
  procinfo[0] = pieces.join('.');
  // store child in next element
  procinfo[1] = procsplit[procsplit.length - 1];
  // store previous child in next element
  if (procinfo[1] - 1 > -1) {
    procinfo[2] = procinfo[0] + '.' + (procinfo[1] - 1);
  } else {
    procinfo[2] = procinfo[0];
  }
  return procinfo;
}
/**
   * Set timeout of current process.
   * @category Process
   * @param {Number} millisecs -  Amount of milliseconds to wait.
   * @param {Object} [data=data] - Set data when process times out
   * @param {Object} [err=1] - Set error flag when process times out
   * @example
   * time()                  // set unlimited timeout
   * time(0)                 // immediately timeout the process
   * time(1000)              // set timeout to one second
   * time(1000 "Time's up!" 0)    // set timeout to one second, if exceeded set data to "Time's up!" and give no error
   */
exports.time = data => function (p, millisecs, hookData, hookErr) {
  if (typeof millisecs === 'undefined') { millisecs = DEFAULT_PROCESS_TIMEOUT; }
  // increase timeout of all siblings
  let loopid;
  let process = global.hybrixd.proc[p.parentID];
  for (let i = 0; i <= process.steps; i += 1) {
    loopid = p.parentID + '.' + i;
    if (global.hybrixd.proc[loopid].timeout < millisecs || millisecs <= 0) {
      global.hybrixd.proc[loopid].timeout = millisecs;
    }
  }
  // increase timeout of all parents
  let parentID = true;
  let processID = p.processID;
  while (parentID) {
    let procinfo = procpart(processID);
    if (procinfo[1] > -1) { parentID = procinfo[0]; processID = parentID; } else { parentID = false; }
    if (parentID) {
      // DEBUG: console.log(' [#] setting timeout of parentID '+parentID);
      if (global.hybrixd.proc[parentID].timeout < millisecs || millisecs <= 0) {
        global.hybrixd.proc[parentID].timeout = millisecs;
      }
    }
  }
  if (typeof hookData !== 'undefined' || typeof hookErr !== 'undefined') {
    process.timeHook = {data: typeof hookData === 'undefined' ? global.hybrixd.proc[p.processID].data : hookData, err: (typeof hookErr === 'undefined' ? 1 : hookErr)};
  }

  this.next(p, 0, global.hybrixd.proc[p.processID].data);
};
