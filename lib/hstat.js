/*
Examples
   hstat error --range 1h
   hstat fatal error --range 1d
   hstat router --range 1d --search transport
*/

const path = require('path');
const child = require('child_process');

const hybrixdLogFile = path.resolve(__dirname, '../var/log/hybrixd.log');

const logTypes = {
  '.': 'log',
  'i': 'info',
  '!': 'error',
  'd': 'debug'
};

const timeUnits = {
  's': 1000,
  'm': 60 * 1000,
  'h': 3600 * 1000,
  'd': 3600 * 24 * 1000,
  'w': 3600 * 24 * 7 * 1000
};

const stdio = require('stdio');

// command line options and init
const ops = stdio.getopt({
  'range': {key: 'r', args: 1, description: 'Time range (Defaults to 1h).'},
  //  'before': {key: 'b', args: 0, description: 'Show progress indicator.'},
  //  'after': {key: 'a', args: 0, description: 'Run interactive mode.'},
  'search': {key: 's', args: 1, description: 'Search keyword.'},
  '_meta_': {minArgs: 0}
});
ops.range = ops.range || '1h';

const now = Date.now();
const requestedCategories = ops.args || [];

let range;

if (isNaN(ops.range)) {
  const unit = ops.range.charAt(ops.range.length - 1);
  if (timeUnits.hasOwnProperty(unit)) {
    const value = ops.range.substr(0, ops.range.length - 1);
    if (isNaN(value)) {
      console.log(`Illegal time range '${ops.range}'.  Examples: '23s','1d'.`);
      process.exit(1);
    } else {
      range = Number(value) * timeUnits[unit];
    }
  } else {
    console.log(`Illegal unit '${unit}' for time range '${ops.range}'. Examples: '23s','1d'.`);
    process.exit(1);
  }
} else {
  range = Number(ops.range);
}

function LogEntry (line) {
  const lineSplitOnSpace = line.split(' ');
  const [logTypeString, timeString, categoryString] = lineSplitOnSpace;
  const logTypeChar = logTypeString.charAt(1);
  const typeCategory = logTypes.hasOwnProperty(logTypeChar) ? logTypes[logTypeChar] : 'log';
  const timestamp = Date.parse(timeString);
  const categories = [typeCategory].concat(categoryString.split('|'));
  const message = lineSplitOnSpace.slice(3).join(' ');

  this.print = () => {
    const remainingCategories = categories.filter(x => !requestedCategories.includes(x));
    console.log(`${logTypeString} ${timeString} ${remainingCategories.join('|')} ${message}`);
  };

  const checkFilter = () => {
    const filteredCategories = requestedCategories.filter(x => categories.includes(x));
    if (timestamp < now - range) return false;
    if (filteredCategories.length !== requestedCategories.length) return false;
    if (typeof ops.search === 'string' && message.indexOf(ops.search) === -1) return false;
    return true;
  };

  if (checkFilter()) {
    logEntries.push(this);
  }
}

const logEntries = [];
const additionalMessageLines = [];

const handleLines = lines => {
  let index = 0;
  let prevIndex = 0;
  while ((index = lines.indexOf('\n', index + 1)) !== -1) {
    const line = lines.substring(prevIndex + 1, index);
    if (line.charAt(0) === '[' && line.charAt(2) === ']' && line.charAt(3) === ' ') {
      const logEntry = new LogEntry(line + (additionalMessageLines.length ? '\n' : '') + additionalMessageLines.join('\n'));
      additionalMessageLines.length = 0;
    } else {
      additionalMessageLines.unshift(line);
    }
    prevIndex = index;
  }
};

// this is neeeded because chunks are not neccisarily seperated by line endings
// first chunk was 'item1\nite'
//  run 'item1\n' directly
//  prevChunk = 'ite'
// next chunk is 'm2\nitem3\n'
//  run ''ite'+'m2\n'
//  prevChunk = 'item3\n'
// last chunk
//  run 'item3\n'

let prevChunk;
function handleChunk (chunk) {
  const string = chunk.toString();
  const firstLineEnding = string.lastIndexOf('\n');
  const firstLine = string.substr(firstLineEnding);
  const remainingLines = string.substr(0, firstLineEnding);

  if (typeof prevChunk === 'string') {
    handleLines(prevChunk + firstLine);
  } else {
    handleLines(firstLine);
  }
  prevChunk = remainingLines;
}

function handleLastChunk () {
  handleLines(prevChunk);
}

function retrieveLogEntries (macOs) {
  const readLogFileBackwards = macOs
    ? child.spawn('tail', ['-r', hybrixdLogFile])
    : child.spawn('tac', [hybrixdLogFile]);

  readLogFileBackwards.on('error', error => {
    console.error('[!] Failed to retrieve logs.', error);
    process.exit(1);
  });

  readLogFileBackwards.stdout.on('data', handleChunk);
  readLogFileBackwards.on('close', (code) => {
    handleLastChunk();
    logEntries.forEach(logEntry => logEntry.print());
  });
}

child.exec('uname', function (error, architecture) {
  if (error) {
    console.error('[!] Failed to retrieve logs.', error);
    process.exit(1);
  } else {
    retrieveLogEntries(architecture === 'Darwin\n');
  }
});
