/**
   * Logs data to console.
   * @param {Number} [level] - Log level between 0-2.
   * @param {String} message... - The messages you want to log.
   * @category Logging
   * @example
   * logs 'No level!'       // logs "[.] No level!" to console
   * logs 0 'Nice dude!'    // logs "[.] Nice dude!" to console
   * logs 1 'I like you'    // logs "[i] I like you" to console
   * logs 2 'Be careful'    // logs "[!] Be careful" to console
   */
exports.logs = data => function (p, level) {
  const messages = Array.from(arguments);
  messages.splice(0, 1);

  if (typeof level !== 'number') {
    level = 0;
  } else {
    messages.splice(0, 1);
  }
  if (messages.length === 0) { messages.push(data); }
  let log = ' [' + (level === 2 ? '!' : (level === 1 ? 'i' : '.')) + ']';
  for (let i = 0; i < messages.length; ++i) {
    log += ' ' + (typeof messages[i] === 'string' ? messages[i] : JSON.stringify(messages[i]));
  }
  console.log(log);
  this.next(p, 0, data);
};
