const test = require('../interface/test.js');
const stdio = require('stdio');
const fs = require('fs');
const ProgressBar = require('progress');

let host = 'http://localhost:1111/';
let path = '../interface';

// command line options and init
const ops = stdio.getopt({
  'symbol': {key: 's', args: 1, description: 'Select a symbol or comma separated symbols to run test'},
  'debug': {key: 'd', args: 0, description: 'Output debug messages.'},
  'host': {key: 'h', args: 1, description: 'Set host Defaults to :' + host},
  'path': {key: 'p', args: 1, description: 'Set path for interface files Defaults to :' + path},
  'verbose': {key: 'v', args: 0, description: 'Output verbose progress'},
  'quiet': {key: 'q', args: 0, description: 'No extra output other than raw data'},
  'xml': {key: 'x', args: 1, description: 'Write xml test results to file'},
  'json': {key: 'j', args: 1, description: 'Write json test results to file'}
});

if (typeof ops.host !== 'undefined') { host = ops.host; }
const symbolsToTest = ops.symbol || '*';
if (ops.path) { path = ops.path; }

const Hybrix = require(path + '/hybrix-lib.nodejs.js');
const hybrix = new Hybrix.Interface({http: require('http'), https: require('https')});

DEBUG = ops.debug;

let lastP;
let bar;

function makeProgressBar (title) {
  bar = new ProgressBar(' [.] ' + title + ': [:bar] :percent, eta: :etas', {
    complete: '▓',
    incomplete: '░',
    width: 76 - title.length,
    total: 100
  });
}

makeProgressBar('test progress');

const progressCallback = progress => {
  if (!ops.quiet) {
    if (ops.verbose) {
      const s = String(progress * 100).split('.');
      let P;
      if (s.length === 1) {
        P = s[0] + '.0';
      } else {
        P = s[0] + '.' + s[1][0];
      }
      if (P !== lastP) {
        process.stdout.write(P + '%\r');
        lastP = P;
      }
    } else {
      bar.update(progress);
    }
  }
};

const renderTable = data => {
  if (ops.xml) {
    fs.writeFileSync(ops.xml, test.xml(data));
  }
  if (ops.json) {
    fs.writeFileSync(ops.json, test.json(data));
  }
  console.log(test.cli(data));
};

test.runTests(symbolsToTest, hybrix, host, renderTable, progressCallback);
