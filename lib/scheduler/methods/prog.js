/**
   * Set progress of parent process directly, or incrementally in a set amount of time.
   * @param {Number} [start] - Current progress amount, specified as a number between 0 and 1, or the starting value.
   * @param {Number} [end] - When specified, sets progress from the start value, finishing at the end value.
   * @param {Number} [second] - Amount of seconds to automatically set progress.
   * @example
   * prog 0.5       // progress is set to 0.5 (which means 50%)
   * prog 0 1 5     // progress is automatically set ranging from 0 to 1, in a matter of 5 seconds
   * prog           // restore automatic progress reporting
   */

exports.prog = data => function (p, start, finish, milliseconds) {
  if (typeof start === 'undefined') {
    p.setAutoProg(true);
  } else {
    if (typeof milliseconds === 'undefined') {
      p.prog(start);
    } else {
      milliseconds = Math.min(milliseconds, p.getTimeOut());
      finish = Math.min(finish, 1);

      p.prog(start);

      for (let i = 0; i <= (milliseconds * 0.002); i = i + 0.5) {
        let progressvalue = start + (((finish - start) / (milliseconds * 2)) * i * 1000);
        if (progressvalue >= 1) { progressvalue = 0.999; }
        setTimeout(function () { // TODO rogue setTimeout. what happens if process stops or errors in between
          p.prog(this.progressvalue);
        }.bind({progressvalue: progressvalue}), i * 500);
      }
    }
  }
  p.next(data);
};
