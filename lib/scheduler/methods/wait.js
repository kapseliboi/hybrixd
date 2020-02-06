/**
   * Wait a specified amount of time before continuing the process.
   * @param {Number} millisecs - Amount of milliseconds to wait.
   * @category Process
   * @example
   * wait 2000            // wait for two seconds, before continuing process
   */
exports.wait = ydata => function (p, millisecs) {
  if (millisecs) { // if no millisecs are given, this proces will wait indefinitely
    p.setTimeOut(p.getTimeOut() + millisecs);
    setTimeout((p, ydata) => {
      this.next(p, 0, ydata);
    }, millisecs, p, ydata);
  }
};
