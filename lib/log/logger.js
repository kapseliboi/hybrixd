const conf = require('../conf/conf');
const fs = require('fs');
const { exec } = require('child_process');

function pad (number) {
  return number < 10 ? '0' + number : number;
}
let count = 990;

function write (categories, messages) {
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

function logger (categories, messages_) {
  ++count;
  if (count === 1000) {
    let logFileName = conf.get('log.hstatloglocation');
    if (!logFileName.startsWith('/')) logFileName = '../' + logFileName;
    count = 0;
    fs.stat(logFileName, (error, stats) => {
      if (error) return;
      const maxSizeInBytes = conf.get('log.maxfilesize') * 1000000;
      if (stats.size > maxSizeInBytes) {
        const halfSize = Math.floor(maxSizeInBytes / 2);
        exec(`tail -c ${halfSize} ${logFileName} > ${logFileName}.tmp; mv ${logFileName}.tmp ${logFileName}`, error => {
          if (error) write(['error', 'logger'], ['Failed to truncate log!', error]);
          else write(['info', 'logger'], ['Truncated log.']);
        });
      }
    });
  }
  const messages = Array.from(arguments).slice(1); // drop the categories
  write(categories, messages);
}

exports.logger = logger;
