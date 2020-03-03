function logger (categories, messages_) {
  const messages = Array.from(arguments).slice(1); // drop the categories

  let head = '[.]';
  if (categories.includes('error') || categories.includes('warn')) {
    head = '[!]';
  } else if (categories.includes('info')) {
    head = '[i]';
  }

  const timestamp = (new Date()).toISOString();
  const categoryString = categories.filter(category => !['error', 'info', 'warn'].includes(category)).join('|');
  messages.unshift(head, timestamp, categoryString);
  console.log.apply(console.log, messages);
}

exports.logger = logger;
