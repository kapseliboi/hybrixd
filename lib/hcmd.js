// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hcmd - simple command line interface for hybrixd

// TODO parse help (html into CLI friendly output)
// TODO check if hostname is valid hostname

var waitInterval = 100; // amount of time between each recheck of availibity of process result.
var maxWaitCounter = 800; // max nr of checks before timing out.

// required libraries in this context
var fs = require('fs');
var stdio = require('stdio');
var ini = require('./ini');
var ProgressBar = require('progress');

// command line options and init
var ops = stdio.getopt({
  'quiet': {key: 'q', args: 0, description: 'No extra output.'},
  'meta': {key: 'm', args: 0, description: 'Display metadata.'},
  'host': {key: 'h', args: 1, description: 'Set hybrixd host.'},
  'conf': {key: 'c', args: 1, description: 'Provide conf file. hybrixd.conf by default.'},
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
  confFile = '../hybrixd.conf';
}

if (fs.existsSync(confFile)) {
  global.hybrixd = ini.parse(fs.readFileSync(confFile, 'utf-8')); // TODO check if file exists
} else {
  console.log('Error: Configuration file ' + confFile + ' not found.');
}

var http = require('http');

var host, port;
if (ops.host) {
  host = ops.host.split(':')[0];
  port = ops.host.split(':')[1];
} else if (global.hybrixd) {
  host = global.hybrixd.restbind;
  port = global.hybrixd.restport;
}

function makeProgressBar (processID) {
  bar = new ProgressBar(' [.] process ' + processID + ': [:bar] :percent, eta: :etas', {
    complete: '▓',
    incomplete: '░',
    width: 52,
    total: 100
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
      console.log(`Error: JSON Parse failed : ${e}`);
      return;
    }

    var id = P.id;
    var progress = P.progress;
    var stopped = typeof P.stopped !== 'undefined' ? P.stopped : null;
    var data = P.data;

    // if we are returned a processID, we fetch that data...
    if (id === 'id') {
      // DEBUG: console.log("[ returning process data for "+data+" ]");
      if (!ops.quiet) {
        makeProgressBar(data);
      }
      setTimeout(function () {
        options.path = `/proc/${data}`;
        var req = http.get(options, function (response) {
          responder(response, options);
        });
        req.on('error', function (err) {
          console.log(`Error: Request failed! ${err.message}`);
        });
      }, waitInterval);
    } else if (progress < 1 && waitCounter < maxWaitCounter && stopped === null && id !== undefined && id !== null && [
      'asset', 'a',
      'engine', 'e',
      'source', 's',
      'command', 'c'
    ].indexOf(id.split('/')[0]) === -1 && options.firstPath.substr(1, 1) !== 'p') {
      waitCounter++;
      if (!ops.quiet) {
        if (typeof bar === 'undefined') { makeProgressBar(id); }
        bar.update(progress);
      }
      setTimeout(function () {
        var req = http.get(options, function (response) {
          responder(response, options, waitCounter);
        });
        req.on('error', function (err) {
          process.stdout.write('x\n\nError : Connection dropped. Please check if hybrixd is still running.\n\n');
        });
      }, waitInterval, waitCounter);
    } else {
      if (!ops.quiet) {
        if (typeof bar !== 'undefined') {
          bar.update(1);
        }
        process.stdout.write('\n');
        if (P.error !== 0) {
          process.stdout.write('Error: Process returned an error. [' + P.error + ']\n');
        }
        process.stdout.write('\n');
      }
      if (P.error !== 0 && P.hasOwnProperty('help') && !ops.meta) { // Error occured, non meta
        P.help.split('<br/>').reduce(function (a, b) { console.log(b); }, true);
      } else if (!ops.meta && data) { // Non meta output
        if (options.path.startsWith('/proc/debug/') || options.path.startsWith('/p/debug/')) {
          // Debug output
          const procs = {};
          Object.keys(data).sort().forEach(function (key) {
            procs[key] = data[key];
          });
          for (var pid in procs) {
            var proc = procs[pid];
            var output = pid + ' : ';
            if (proc.err !== 0) {
              output += '[ERROR]';
            }
            if (proc.progress !== 1.0) {
              output += Math.floor(proc.progress * 100) + '%';
            }
            if (proc.qrtz) {
              output += JSON.stringify(proc.qrtz) + ' > ';
              output += JSON.stringify(proc.data);
            } else {
              output += '[func]';
            }
            console.log(output);
          }
        } else if (typeof data === 'string') { // String data output
          console.log(data);
        } else { // Data output
          console.log(JSON.stringify(data));
        }
      } else { // Raw meta output
        console.log(rawData);
      }
      if (waitCounter === maxWaitCounter) {
        console.log('\n\nError: Time out. Process is unfinished!');
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
      console.log(`Error : Request failed : ${err.message}`);
    });
  }
};

if (host && port) {
  makeRequest(ops.args);
} else {
  if (!host) { console.log('Error: Missing hostname.'); }
  if (!port) { console.log('Error: Missing port.'); }
}
