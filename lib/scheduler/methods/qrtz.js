/**
   * Run a Qrtz command contained in a string. The result of the command is stored in a variable.
   * @category Meta
   * @param {String} variable      -  Variable to read/write to.
   * @param {String} qrtz command  -  A string containg the Qrtz command.
   * @param {Object} a, b, c, etc. -  Arguments to be passed to the Qrtz command.
   * @example
   */
exports.qrtz = () => function (p) {
  const recipe = p.getRecipe();
  if (recipe.hasOwnProperty('quartz')) {
    p.next(Object.keys(recipe.quartz));
  } else {
    p.next([]);
  }
};
