/**
   * Exits the interactive shell, only available in interactive cli mode.
   * @category Interactive
   * @example
   * exit
   */
exports.exit = ydata => function (p) {
  p.fail('exit: only available in interactive cli mode');
};
