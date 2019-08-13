/**
   * Test a number to be positive, zero or negative (named after the spaceship operator)
   * @category Flow
   * @param {Integer} [onPositive=1] -Amount of instructions lines to jump when number is positive.
   * @param {Integer} [onZero=1] - Amount of instructions lines to jump when number is zero.
   * @param {Integer} [onNegative=1] - Amount of instructions lines to jump when number is negative.
   * @param {Integer} [onNaN=1] - Amount of instructions lines to jump when data is not a number.
   * @example
   * ship 1 2 2 3    // if data value is positive jump one step, if zero or negative jump two steps, if not a number jump three steps
   */
exports.ship = ydata => function (p, onPositive, onZero, onNegative, onNaN) {
  if (isNaN(ydata)) {
    this.jump(p, onNaN || 1, ydata);
  } else if (Number(ydata) > 0) {
    this.jump(p, onPositive || 1, ydata);
  } else if (Number(ydata) === 0) {
    this.jump(p, onZero || 1, ydata);
  } else if (Number(ydata) < 0) {
    this.jump(p, onNegative || 1, ydata);
  } else {
    this.jump(p, onNaN || 1, ydata);
  }
};
