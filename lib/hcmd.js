// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hcmd - simple command line interface for hybrixd

// TODO check if hostname is valid hostname

const DEFAULT_TIMEOUT = 30000; // defailt max miliseconds before

// required libraries in this context
const stdio = require('stdio');
const conf = require('./conf/conf');
const ProgressBar = require('progress');
const request = require('./request.js').request;

process.chdir(__dirname);

// command line options and init
const ops = stdio.getopt({
  'quiet': {key: 'q', args: 0, description: 'No extra output.'},
  'meta': {key: 'm', args: 0, description: 'Display metadata.'},
  'host': {key: 'h', args: 1, description: 'Set hybrixd host.'},
  'conf': {key: 'c', args: 1, description: 'Provide conf file. hybrixd.conf by default.'},
  'pack': {key: 'p', args: 0, description: 'Returned packed JSON instead of prettyfied.'},
  'version': {key: 'v', args: 0, description: 'Display version.'},
  'debug': {key: 'd', args: 0, description: 'Debug.'},
  'first': {key: 'f', args: 0, description: 'First call only, no follow up.'},
  'timeout': {key: 't', args: 1, description: 'Specify timeout in ms, defaults to ' + DEFAULT_TIMEOUT},
  '_meta_': {minArgs: 0}
});

if (!ops.version && !ops.args) {
  console.error(' [!] Expected path.');
  process.exit(1);
}

let confFile;
if (ops.conf) {
  if (ops.conf.startsWith('/')) {
    confFile = ops.conf;
  } else {
    confFile = '../' + ops.conf;
  }
} else {
  confFile = '../hybrixd.conf';
}

if (!conf.setup(confFile)) {
  console.error(' [!] Error: Configuration file ' + confFile + ' not found.');
}

let host, port, protocol;
if (ops.host) {
  const protocolHostport = ops.host.split('://');
  protocol = protocolHostport[0];
  const hostPort = protocolHostport[1].split(':');
  host = hostPort[0];
  port = hostPort[1];
} else {
  const servers = conf.get('host.servers');
  for (let endpoint in servers) {
    if (servers[endpoint] === '/root') {
      const protocolHostport = endpoint.split('://');
      protocol = protocolHostport[0];
      const hostPort = protocolHostport[1].split(':');
      host = hostPort[0];
      port = hostPort[1];
    }
  }
}

let bar;

function makeProgressBar (processID) {
  bar = new ProgressBar(' [.] process ' + processID + ': [:bar] :percent, eta: :etas', {
    complete: '▓',
    incomplete: '░',
    width: 52,
    total: 100
  });
}

const debugOutput = data => {
  const html = require('./router/debug/debug.js').display('cli', data);
  console.log(html);
};

const dataCallback = options => function (data) {
  if (!options.meta && (options.path.startsWith('/proc/debug/') || options.path.startsWith('/p/debug/'))) {
    debugOutput(data);
  } else if (options.pack) {
    console.log(typeof data === 'string' ? data : JSON.stringify(data));
  } else {
    console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }
};

const errorCallback = options => function (errorMessage, errorCode) {
  console.error('\n [!] Error ' + errorCode + ' :', errorMessage);
  process.exit(errorCode || 1);
};

let lastProgress;
const progressCallback = (options) => function (progress, processId) {
  if (!options.quiet) {
    if (typeof bar === 'undefined' && typeof processId !== 'undefined') {
      makeProgressBar(processId);
    }
    if (typeof bar !== 'undefined' && lastProgress !== progress) {
      bar.update(progress);
      lastProgress = progress;
    }
  }
};

const options = {
  protocol,
  host,
  port,
  path: ops.hasOwnProperty('version') ? '/version' : ops.args[0],
  quiet: ops.quiet,
  debug: ops.debug,
  first: ops.first,
  timeout: ops.timeout,
  pack: ops.pack,
  meta: ops.meta
};

request(options,
  dataCallback(options),
  errorCallback(options),
  progressCallback(options)
);
