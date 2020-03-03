/**
   * Logs data to log output.
   * @param {String} messages... - The messages you want to log.
   * @category Logging
   * @example
   * logs 'Hello everybody!'       // logs "[i] Hello everybody!"
   */
exports.logs = data => function (p, messages_) {
  const messages = Array.from(arguments).slice(1); // drop p
  global.hybrixd.logger.apply(global.hybrixd.logger, [['info', 'qrtz'], ...messages]);
  this.next(p, 0, data);
};
