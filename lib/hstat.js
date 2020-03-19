/*
Examples
   hstat error --start 1h
   hstat error --start 2h --end 1h
   hstat fatal error --start 1d
   hstat router --start 1d --search transport
*/

const stat = require('./log/stat');
const conf = require('./conf/conf');
const stdio = require('stdio');

// command line options and init
const ops = stdio.getopt({
  'start': {key: 's', args: 1, description: 'Time range (Defaults to 1h).'},
  'end': {key: 'e', args: 1, description: 'Time range (Defaults to 0).'},
  'keywords': {key: 'k', args: 1, description: 'Search keyword.'},
  '_meta_': {minArgs: 0}
});

function outputLogEntries (logEntries) {
  logEntries.forEach(logEntry => logEntry.print({categories: ops.args || []}));
}

conf.setup();

stat.get({
  start: ops.start || '1h',
  end: ops.end || '0',
  categories: ops.args || [],
  search: ops.search
},
outputLogEntries,
error => {
  console.error(error);
  process.exit(1);
}
);
