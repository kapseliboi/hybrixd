/*
Examples
   hstat error --range 1h
   hstat fatal error --range 1d
   hstat router --range 1d --search transport
*/

const path = require('path');
const child = require('child_process');
const conf = require('../conf/conf');

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

function timeWithUnitsToSeconds (range) { // '1h' -> 3600
  if (isNaN(range)) {
    const unit = range.charAt(range.length - 1);
    if (timeUnits.hasOwnProperty(unit)) {
      const value = range.substr(0, range.length - 1);
      if (isNaN(value)) {
        return `Illegal time range '${range}'.  Examples: '23s','1d'.`;
      } else {
        return Number(value) * timeUnits[unit];
      }
    } else {
      return `Illegal unit '${unit}' for time range '${range}'. Examples: '23s','1d'.`;
    }
  } else {
    return Number(range) * 1000;
  }
}

function LogEntry (line, hostname) {
  const lineSplitOnSpace = line.split(' ');
  const [logTypeString, timeString, categoryString] = lineSplitOnSpace;
  const logTypeChar = logTypeString.charAt(1);
  const typeCategory = logTypes.hasOwnProperty(logTypeChar) ? logTypes[logTypeChar] : 'log';
  const timestamp = Date.parse(timeString);
  const categories = typeof categoryString === 'string'
    ? [typeCategory, ...categoryString.split('|')]
    : [typeCategory];
  if (typeof hostname === 'string') categories.push(hostname);
  const message = lineSplitOnSpace.slice(3).join(' ');

  this.print = options => {
    const remainingCategories = categories.filter(x => !options.categories.includes(x));
    console.log(`${logTypeString} ${timeString} ${remainingCategories.join('|')} ${message}`);
  };

  this.getJson = () => {
    return {timestamp: timestamp, categories, message};
  };
  this.getTimeStamp = () => timestamp;

  this.checkFilter = options => {
    const filteredCategories = options.categories.filter(x => categories.includes(x));
    if (timestamp > options.end) return false;
    if (filteredCategories.length !== options.categories.length) return false;
    if (typeof options.search === 'string' && message.indexOf(options.search) === -1) return false;
    return true;
  };
}

const handleLines = (options, lines, state, readLogFileBackwards, hostname) => {
  let index = -1;
  let prevIndex = -1;
  while ((index = lines.indexOf('\n', index + 1)) !== -1) {
    const line = lines.substring(prevIndex + 1, index);
    if (line.charAt(0) === '[' && line.charAt(2) === ']' && line.charAt(3) === ' ') {
      const message = line + (state.additionalMessageLines.length ? '\n' : '') + state.additionalMessageLines.join('\n');
      const logEntry = new LogEntry(message, hostname);
      if (logEntry.getTimeStamp() < options.start) {
        readLogFileBackwards.kill();
        return;
      } else if (logEntry.checkFilter(options)) {
        state.logEntries.push(logEntry);
      }
      state.additionalMessageLines.length = 0;
    } else {
      state.additionalMessageLines.unshift(line);
    }
    prevIndex = index;
  }
};

// extra logic is needed because chunks are not neccisarily seperated by line endings
// remaining parts need to be passed to the next chunk
const handleChunk = (options, readLogFileBackwards, state, hostname) => chunk => {
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

    handleLines(options, lines, state, readLogFileBackwards, hostname);
    state.remaingingString = remainingLines;
  } else { // multiple lines
    const firstLine = string.substr(0, firstLineEnding + 1);

    const lines = typeof state.remaingingString === 'string'
      ? state.remaingingString + firstLine
      : firstLine;

    handleLines(options, lines, state, readLogFileBackwards, hostname);

    const middleLines = string.substring(firstLineEnding + 1, lastLineEnding + 1);
    handleLines(options, middleLines, state, readLogFileBackwards, hostname);

    const lastLine = string.substr(lastLineEnding + 1);
    state.remaingingString = lastLine;
  }
};

function handleLastChunk (options, readLogFileBackwards, state, hostname) {
  handleLines(options, state.remaingingString, state, readLogFileBackwards, hostname);
}

function retrieveLogEntries (options, hybrixdLogFile, architecture, hostname, callback) {
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
  readLogFileBackwards.stdout.on('data', handleChunk(options, readLogFileBackwards, state, hostname));

  readLogFileBackwards.on('close', code => {
    handleLastChunk(options, readLogFileBackwards, state, hostname);
    callback(hostname, state.logEntries);
  });
}

function retrieveLogFiles (options, hybrixdLogLocations, architecture, dataCallback, errorCallback) {
  child.exec('ls ' + hybrixdLogLocations, function (error, string) {
    if (error) {
      errorCallback('Failed to retrieve logs from ' + hybrixdLogLocations);
      process.exit(1);
    } else {
      const hybrixdLogFiles = string.split('\n').filter(file => file !== '');
      const finishedHosts = [];
      let allLogEntries = [];
      hybrixdLogFiles.forEach(hybrixdLogFile => {
        const path = hybrixdLogFile.split('/');
        const hostname = path[path.length - 2];
        retrieveLogEntries(options, hybrixdLogFile, architecture, hostname, (hostname, logEntries) => {
          finishedHosts.push(hostname);
          allLogEntries = allLogEntries.concat(logEntries);
          if (finishedHosts.length === hybrixdLogFiles.length) {
            allLogEntries.sort(sortLogEntries);
            dataCallback(allLogEntries);
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

// options = {categories, start, end, search}
function get (options, dataCallback, errorCallback) {
  const now = Date.now();

  options.start = timeWithUnitsToSeconds(options.start || '1h');
  if (typeof options.start === 'string') {
    errorCallback(options.start);
    return;
  }
  options.start = now - options.start;

  options.end = timeWithUnitsToSeconds(options.end || 0);
  if (typeof options.end === 'string') {
    errorCallback(options.start);
    return;
  }
  options.end = now - options.end;

  options.categories = options.categories || [];

  const hstatLogLocation = conf.get('log.hstatLogLocation');
  const hybrixdLogLocations = hstatLogLocation.startsWith('/')
    ? hstatLogLocation
    : path.resolve(__dirname, '../../' + hstatLogLocation);

  child.exec('uname', function (error, architecture) {
    if (error) {
      errorCallback('Failed to retrieve logs.');
    } else {
      retrieveLogFiles(options, hybrixdLogLocations, architecture, dataCallback, errorCallback);
    }
  });
}

exports.get = get;
exports.timeWithUnitsToSeconds = timeWithUnitsToSeconds;
