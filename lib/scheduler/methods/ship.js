/**
   * Test a number to be positive, zero or negative (named after the spaceship operator)
   * @category Flow
   * @param {String} [variable] - which variable to test,defaults to data stream.
   * @param {Integer} [onPositive=1] - Amount of instructions lines to jump when number is positive.
   * @param {Integer} [onZero=1] - Amount of instructions lines to jump when number is zero.
   * @param {Integer} [onNegative=1] - Amount of instructions lines to jump when number is negative.
   * @param {Integer} [onNaN=1] - Amount of instructions lines to jump when data is not a number.
   * @example
   * ship 1 2 2 3           // if data value is positive jump one step, if zero or negative jump two steps, if not a number jump three steps
   * ship variable 1 2 2 3  // if value in variable is positive jump one step, if zero or negative jump two steps, if not a number jump three steps
   */
exports.ship = data => function (p, ...parameters) {
  const useVar = isNaN(parameters[0]) || parameters.length === 5;
  const [onPositive, onZero, onNegative, onNaN] = useVar
    ? parameters.slice(1)
    : parameters;
  let test;
  if (useVar) {
    const result = p.peek(parameters[0]);
    if (result.e) return p.fail(result.e);
    test = result.v;
  } else test = data;

  if (isNaN(test)) return p.jump(onNaN || 1, data);
  else if (Number(test) > 0) return p.jump(onPositive || 1, data);
  else if (Number(test) === 0) return p.jump(onZero || 1, data);
  else if (Number(test) < 0) return p.jump(onNegative || 1, data);
  else return p.jump(onNaN || 1, data);
};
