/**
   * TODO
   * @category Meta
   * @param {String} variable      -  Variable to read/write to.
   * @param {String} qrtz command  -  A string containg the Qrtz command.
   * @param {Object} a, b, c, etc. -  Arguments to be passed to the Qrtz command.
   * @example
   */
exports.qrtz = () => function (p) {
  const processStepIdSplit = p.processID.split('.');
  const rootID = processStepIdSplit[0];
  const rootProcess = global.hybrixd.proc[rootID];

  const recipe = rootProcess.recipe;
  if (typeof recipe === 'object' && recipe != null && recipe.hasOwnProperty('quartz')) {
    this.next(p, 0, Object.keys(recipe.quartz));
  } else {
    this.next(p, 0, []);
  }
};
