/**
   * Provides help on provided qrtz command, only available in interactive cli mode.
   * @category Interactive
   * @param {String} [func] - function to find help for
   * @example
   * help done
   */
exports.help = ydata => function (p) {
  p.fail('help: only available in interactive cli mode');
};
