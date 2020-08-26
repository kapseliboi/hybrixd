/**
   * Toggles modes in interactive shell, only available in interactive cli mode.
   * @category Interactive
   * @param {String} switch1 - Toggle for modes
   * @param {String} [switch2...] - Toggle for modes
   * @example
   * mode debug=on
   * mode verbose=off debug=off
   */
exports.mode = ydata => function (p) {
  p.fail('mode: only available in interactive cli mode');
};
