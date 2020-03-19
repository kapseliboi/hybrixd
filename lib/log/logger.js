function pad (number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}

function logger (categories, messages_) {
  const messages = Array.from(arguments).slice(1); // drop the categories

  let head = '[.]';
  if (categories.includes('error') || categories.includes('warn')) {
    head = '[!]';
  } else if (categories.includes('info')) {
    head = '[i]';
  }

  const now = new Date();
  const timestamp = now.getFullYear() +
        '-' + pad(now.getMonth() + 1) +
        '-' + pad(now.getDate()) +
        'T' + pad(now.getHours()) +
        ':' + pad(now.getMinutes()) +
    ':' + pad(now.getSeconds());

  const categoryString = categories.filter(category => !['error', 'info', 'warn'].includes(category)).join('|');
  messages.unshift(head, timestamp, categoryString);
  console.log.apply(console.log, messages);
}

exports.logger = logger;
