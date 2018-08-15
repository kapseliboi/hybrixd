// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hcmd - simple command line interface for hybridd

var waitInterval = 100; // amount of time between each recheck of availibity of process result.
var maxWaitCounter = 80; // max nr of checks before timing out.

// required libraries in this context
var fs = require('fs');
var ini = require('./ini');
global.hybridd = ini.parse(fs.readFileSync('../hybridd.conf', 'utf-8'));

var http = require('http');

var path;
var showHelp = false;
var quietMode = false;
var showMetaData = false;

for (var i = 2; i < process.argv.length; ++i) {
  var arg = process.argv[i];
  if (arg.startsWith('/')) { path = arg; }

  if (arg.startsWith('--')) {
    if (arg === '--help') { showHelp = true; }
    if (arg === '--quiet') { quietMode = true; }
    if (arg === '--meta') { showMetaData = true; }
  } else if (arg.startsWith('-')) {
    if (arg.indexOf('h') !== -1) { showHelp = true; }
    if (arg.indexOf('q') !== -1) { quietMode = true; }
    if (arg.indexOf('m') !== -1) { showMetaData = true; }
  }
}

if (!path) { showHelp = true; }

if (showHelp) {
  process.stdout.write('Usage: hybridd [options] [path] \n');
  process.stdout.write('       hybridd                        Start Hybridd node service.\n');
  process.stdout.write('       hybridd /asset/btc/details     Retrieve bitcoin details.\n\n');

  process.stdout.write(' See hybridd /help/$PATH for help on specific paths.\n\n');

  process.stdout.write('Options: \n\n');
  process.stdout.write(' --help,  -h     Display help.\n');
  process.stdout.write(' --meta,  -m     Display metadata.\n');
  process.stdout.write(' --quiet, -q     Only display end result.\n');
  process.stdout.write('\n');
}

if (path) {
  var options = {
    host: global.hybridd.restbind,
    port: global.hybridd.restport,
    path: path,
    firstPath: path
  };

  var req = http.get(options, function (response) {
    responder(response, options);
  });

  req.on('error', function (err) {
    console.log(`Request error: ${err.message}`);
  });
}

function responder (response, options, waitCounter) {
  if (typeof waitCounter === 'undefined') {
    waitCounter = 0;
  }
  // handle the response
  var rawData = '';

  response.on('data', chunk => { rawData += chunk; });

  response.on('end', () => {
    var P;
    try {
      P = JSON.parse(rawData);
    } catch (e) {
      console.log(`JSON Parse error: ${e}`);
      return;
    }

    var id = P.id;
    var progress = P.progress;
    var stopped = typeof P.stopped !== 'undefined' ? P.stopped : null;
    var data = P.data;

    // if we are returned a processID, we fetch that data...
    if (id === 'id') {
      // DEBUG: console.log("[ returning process data for "+data+" ]");
      setTimeout(function () {
        options.path = `/proc/${data}`;
        var req = http.get(options, function (response) {
          responder(response, options);
        });
        req.on('error', function (err) {
          console.log(`Request error: ${err.message}`);
        });
      }, waitInterval);
    } else if (waitCounter < maxWaitCounter && progress !== 1 && stopped === null && id !== undefined && id !== null && [
      'asset', 'a',
      'engine', 'e',
      'source', 's',
      'command', 'c'
    ].indexOf(id.split('/')[0]) === -1 && options.firstPath.substr(1, 1) !== 'p') {
      waitCounter++;
      if (!quietMode) {
        process.stdout.write('.');
      }
      setTimeout(function () {
        var req = http.get(options, function (response) {
          responder(response, options, waitCounter);
        });
        req.on('error', function (err) {
          process.stdout.write('x\n\nSerious error occurred. Please check if hybridd is still running.\n\n');
        });
      }, waitInterval, waitCounter);
    } else {
      if (!quietMode) {
        process.stdout.write('\n');
        if (P.error !== 0) {
          process.stdout.write('Error\n');
        }
        process.stdout.write('\n');
      }
      if (P.error !== 0 && P.hasOwnProperty('help') && !showMetaData) {
        P.help.split('<br/>').reduce(function (a, b) { console.log(b); }, true);
      } else if (!showMetaData && data) {
        if (typeof data === 'string') {
          console.log(data);
        } else {
          console.log(JSON.stringify(data));
        }
      } else {
        console.log(rawData);
      }
      if (waitCounter === maxWaitCounter) {
        console.log('\n\nError: Time out. Process is unfinished.');
      }
      if (!quietMode) {
        process.stdout.write('\n');
      }
    }
  });
}
