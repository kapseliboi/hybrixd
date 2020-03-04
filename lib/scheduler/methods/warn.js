/**
   * Logs data to error output.
   * @param {String} messages... - The messages you want to log.
   * @category Logging
   * @example
   * warn 'Houston, we have a problem!'       // logs "[!] Houston, we have a problem!"
   */
exports.warn = data => function (p, messages_) {
  const messages = arguments.length === 1
    ? [data]
    : Array.from(arguments).slice(1); // drop p
  global.hybrixd.logger.apply(global.hybrixd.logger, [['error', 'qrtz'], ...messages]);
  this.next(p, 0, data);
};
