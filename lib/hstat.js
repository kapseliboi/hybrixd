/*
Examples
   hstat error --range 1h
   hstat fatal error --range 1d
   hstat router --range 1d --search transport
*/

const path = require('path');
const child = require('child_process');
const conf = require('./conf/conf');

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
      console.error(`Illegal time range '${ops.range}'.  Examples: '23s','1d'.`);
      process.exit(1);
    } else {
      range = Number(value) * timeUnits[unit];
    }
  } else {
    console.error(`Illegal unit '${unit}' for time range '${ops.range}'. Examples: '23s','1d'.`);
    process.exit(1);
  }
} else {
  range = Number(ops.range);
}

function LogEntry (line, hostname) {
  const lineSplitOnSpace = line.split(' ');
  const [logTypeString, timeString, categoryString] = lineSplitOnSpace;
  const logTypeChar = logTypeString.charAt(1);
  const typeCategory = logTypes.hasOwnProperty(logTypeChar) ? logTypes[logTypeChar] : 'log';
  const timestamp = Date.parse(timeString);
  const categories = [typeCategory].concat(categoryString.split('|'));
  if (typeof hostname === 'string') categories.push(hostname);
  const message = lineSplitOnSpace.slice(3).join(' ');

  this.print = () => {
    const remainingCategories = categories.filter(x => !requestedCategories.includes(x));
    console.log(`${logTypeString} ${timeString} ${remainingCategories.join('|')} ${message}`);
  };

  this.getTimeStamp = () => timestamp;
  this.checkTime = () => timestamp >= now - range;

  this.checkFilter = () => {
    const filteredCategories = requestedCategories.filter(x => categories.includes(x));
    if (!this.checkTime()) return false;
    if (filteredCategories.length !== requestedCategories.length) return false;
    if (typeof ops.search === 'string' && message.indexOf(ops.search) === -1) return false;
    return true;
  };
}

const handleLines = (lines, state, readLogFileBackwards, hostname) => {
  let index = -1;
  let prevIndex = -1;
  while ((index = lines.indexOf('\n', index + 1)) !== -1) {
    const line = lines.substring(prevIndex + 1, index);
    if (line.charAt(0) === '[' && line.charAt(2) === ']' && line.charAt(3) === ' ') {
      const message = line + (state.additionalMessageLines.length ? '\n' : '') + state.additionalMessageLines.join('\n');
      const logEntry = new LogEntry(message, hostname);
      if (logEntry.checkFilter()) {
        state.logEntries.push(logEntry);
      } else if (!logEntry.checkTime()) {
        readLogFileBackwards.kill();
        return;
      }
      state.additionalMessageLines.length = 0;
    } else {
      state.additionalMessageLines.unshift(line);
    }
    prevIndex = index;
  }
};

function debug (name, string) {
  console.log(name + ' [' + string.replace(/\n/g, '&') + ']');
}

// extra logic is needed because chunks are not neccisarily seperated by line endings
// remaining parts need to be passed to the next chunk
const handleChunk = (readLogFileBackwards, state, hostname) => chunk => {
  const string = chunk.toString();

  const firstLineEnding = string.indexOf('\n');
  const lastLineEnding = string.lastIndexOf('\n');
  if (firstLineEnding === -1) { // no line endings means partial result, merge into remainingChunk
    state.remaingingString = typeof state.remaingingString === 'string'
      ? state.remaingingString + string
      : string;
  } else if (firstLineEnding === lastLineEnding) { // one line ending handle the first line, add rest to remainingChunk
    const firstLine = string.substr(0, firstLineEnding + 1);
    const remainingLines = string.substr(firstLineEnding + 1);

    const lines = typeof state.remaingingString === 'string'
      ? state.remaingingString + firstLine
      : firstLine;

    handleLines(lines, state, readLogFileBackwards, hostname);
    state.remaingingString = remainingLines;
  } else { // multiple lines
    const firstLine = string.substr(0, firstLineEnding + 1);

    const lines = typeof state.remaingingString === 'string'
      ? state.remaingingString + firstLine
      : firstLine;

    handleLines(lines, state, readLogFileBackwards, hostname);

    const middleLines = string.substring(firstLineEnding + 1, lastLineEnding + 1);
    handleLines(middleLines, state, readLogFileBackwards, hostname);

    const lastLine = string.substr(lastLineEnding + 1);
    state.remaingingString = lastLine;
  }
};

function handleLastChunk (readLogFileBackwards, state, hostname) {
  handleLines(state.remaingingString, state, readLogFileBackwards, hostname);
}

function retrieveLogEntries (hybrixdLogFile, architecture, hostname, callback) {
  const readLogFileBackwards = architecture === 'Darwin\n'
    ? child.spawn('tail', ['-r', hybrixdLogFile])
    : child.spawn('tac', [hybrixdLogFile]);

  readLogFileBackwards.on('error', error => {
    console.error('[!] Failed to retrieve logs from ' + hybrixdLogFile, error);
    process.exit(1);
  });
  const state = {
    logEntries: [],
    additionalMessageLines: []
  };
  readLogFileBackwards.stdout.on('data', handleChunk(readLogFileBackwards, state, hostname));

  readLogFileBackwards.on('close', code => {
    handleLastChunk(readLogFileBackwards, state, hostname);
    callback(hostname, state.logEntries);
  });
}

function retrieveLogFiles (hybrixdLogLocations, architecture) {
  child.exec('ls ' + hybrixdLogLocations, function (error, string) {
    if (error) {
      console.error('[!] Failed to retrieve logs from ' + hybrixdLogLocations, error);
      process.exit(1);
    } else {
      const hybrixdLogFiles = string.split('\n').filter(file => file !== '');
      const finishedHosts = [];
      let allLogEntries = [];
      hybrixdLogFiles.forEach(hybrixdLogFile => {
        const path = hybrixdLogFile.split('/');
        const hostname = path[path.length - 2];
        retrieveLogEntries(hybrixdLogFile, architecture, hostname, (hostname, logEntries) => {
          finishedHosts.push(hostname);
          allLogEntries = allLogEntries.concat(logEntries);
          if (finishedHosts.length === hybrixdLogFiles.length) {
            outputLogEntries(allLogEntries);
          }
        });
      });
    }
  });
}

function sortLogEntries (a, b) {
  const tA = a.getTimeStamp();
  const tB = b.getTimeStamp();
  if (tA === tB) {
    return 0;
  } else {
    return tA < tB ? -1 : 1;
  }
}

function outputLogEntries (logEntries) {
  logEntries
    .sort(sortLogEntries)
    .forEach(logEntry => logEntry.print());
}

conf.setup();

const hstatLogLocation = conf.get('log.hstatLogLocation');
const hybrixdLogLocations = hstatLogLocation.startsWith('/')
  ? hstatLogLocation
  : path.resolve(__dirname, '../' + hstatLogLocation);

child.exec('uname', function (error, architecture) {
  if (error) {
    console.error('[!] Failed to retrieve logs.', error);
    process.exit(1);
  } else {
    retrieveLogFiles(hybrixdLogLocations, architecture);
  }
});
