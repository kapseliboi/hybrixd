/**
   * Quits the interactive shell, only available in interactive cli mode.
   * @category Interactive
   * @example
   * quit
   */
exports.quit = ydata => function (p) {
  p.fail('quit: only available in interactive cli mode');
};
