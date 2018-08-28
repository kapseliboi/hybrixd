// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hcmd - simple command line interface for hybridd

var waitInterval = 100; // amount of time between each recheck of availibity of process result.
var maxWaitCounter = 80; // max nr of checks before timing out.

// required libraries in this context
var fs = require('fs');
var ini = require('./ini');
var stdio = require('stdio');

// command line options and init
var ops = stdio.getopt({
  'quiet': {key: 'q', args: 0, description: 'No extra output.'},
  'meta': {key: 'm', args: 0, description: 'Display metadata.'},
  'host': {key: 'h', args: 1, description: 'Set hybridd host.'},
  'conf': {key: 'c', args: 1, description: 'Provide conf file. hybridd.conf by default.'},
  '_meta_': {minArgs: 1}
});

var confFile;
if (ops.conf) {
  if (ops.conf.startsWith('/')) {
    confFile = ops.conf;
  } else {
    confFile = '../' + ops.conf;
  }
} else {
  confFile = '../hybridd.conf';
}
global.hybridd = ini.parse(fs.readFileSync(confFile, 'utf-8')); // TODO check if file exists

var http = require('http');

var host, port;
if (ops.host) {
  host = ops.host.split(':')[0];
  port = ops.host.split(':')[1];
} else {
  host = global.hybridd.restbind;
  port = global.hybridd.restport;
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
      if (!ops.quiet) {
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
      if (!ops.quiet) {
        process.stdout.write('\n');
        if (P.error !== 0) {
          process.stdout.write('Error ' + P.error + '\n');
        }
        process.stdout.write('\n');
      }
      if (P.error !== 0 && P.hasOwnProperty('help') && !ops.meta) {
        P.help.split('<br/>').reduce(function (a, b) { console.log(b); }, true);
      } else if (!ops.meta && data) {
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
      if (!ops.quiet) {
        process.stdout.write('\n');
      }
    }
  });
}

var makeRequest = (paths) => {
  if (paths.length > 0) {
    var options = {
      host: host,
      port: port,
      path: paths[0],
      firstPath: paths[0]
    };

    var req = http.get(options, (response) => {
      responder(response, options);
      paths.shift(); // first element is handled, continue with next.
      makeRequest(paths);
    });
    req.on('error', function (err) {
      console.log(`Request error: ${err.message}`);
    });
  }
};

makeRequest(ops.args);
