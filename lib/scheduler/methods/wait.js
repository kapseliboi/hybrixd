/**
   * Wait a specified amount of time before continuing the process.
   * @param {Number} millisecs - Amount of milliseconds to wait.
   * @category Process
   * @example
   * wait 2000            // wait for two seconds, before continuing process
   */
exports.wait = ydata => function (p, millisecs) {
  if (global.hybrixd.proc[p.parentID].timeout > 0 && millisecs < global.hybrixd.proc[p.parentID].timeout && global.hybrixd.proc[p.parentID].timeout !== -1) {
    global.hybrixd.proc[p.parentID].timeout = global.hybrixd.proc[p.parentID].timeout + millisecs;
  }
  if (global.hybrixd.proc[p.processID].timeout > 0 && millisecs < global.hybrixd.proc[p.processID].timeout && global.hybrixd.proc[p.processID].timeout !== -1) {
    global.hybrixd.proc[p.processID].timeout = global.hybrixd.proc[p.processID].timeout + millisecs;
  }
  if (millisecs) { // if no millisecs are given, this proces will wait indefinitely
    setTimeout((p, ydata) => {
      this.next(p, 0, ydata);
    }, millisecs, p, ydata);
  }
};
