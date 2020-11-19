// (C) 2015 Internet of Coins / hybrix / Joachim de Koning / Rouke Pouw
// hcmd - simple command line interface for hybrixd

// TODO check if hostname is valid hostname

const DEFAULT_TIMEOUT = 30000; // default max miliseconds before

// required libraries in this context
const stdio = require('stdio');
const conf = require('./conf/conf');
const ProgressBar = require('progress');
const request = require('./request.js').request;
const fs = require('fs');

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
  'noroot': {key: 'n', args: 0, description: 'Run as unprivileged user'},
  'verbose': {key: 'V', args: 0, description: 'Display verbose output.'},
  '_meta_': {minArgs: 0}
});

if (ops.verbose) {
  console.error('[i] verbose = ' + !!ops.verbose);
  console.error('[i] quiet = ' + !!ops.quiet);
  console.error('[i] meta = ' + !!ops.meta);
  console.error('[i] debug = ' + !!ops.debug);
  console.error('[i] pack = ' + !!ops.pack);
  console.error('[i] noroot = ' + !!ops.noroot);
  console.error('[i] first = ' + !!ops.first);

  console.error('[i] conf = ' + (ops.conf || '../hybrixd.conf')); // todo mark if default
  console.error('[i] timeout = ' + (ops.timeout || DEFAULT_TIMEOUT) + 'ms'); // todo mark if default
  console.error('[i] request = ' + ops.args.join('/'));
}

if (!ops.version && !ops.args) {
  console.error('[!] Expected path.');
  process.exit(1);
}

if (ops.conf) {
  const confFile = ops.conf;
  if (!conf.setup(confFile)) console.log(`[!] Error: Configuration file ${confFile} not found.`);
} else if (fs.existsSync('../hybrixd.conf')) {
  if (!conf.setup('../hybrixd.conf')) console.log(`[!] Error loading hybrixd.conf.`);
}

let host, port, protocol;
let pathPrefix = '';
if (ops.host) {
  if (!ops.host.includes('://')) {
    console.error('[!] Expected host to start with http:// or https://.');
    process.exit(1);
  }
  const protocolHostport = ops.host.split('://');
  protocol = protocolHostport[0];
  const hostPort = protocolHostport[1].split(':');

  host = hostPort[0];
  port = hostPort[1];
  if (port && port.includes('/')) { // if host='http://foo.bar:1111/api' then pathPrefix ='/api'
    [port, pathPrefix] = port.split('/');
    pathPrefix = '/' + pathPrefix;
  }
} else {
  const servers = conf.get('host.servers');
  for (let endpoint in servers) {
    const server = servers[endpoint];
    if ((server === '/root' && !ops.noroot) || !host || ops.noroot) { // use /root if available and not noroot
      const protocolHostport = endpoint.split('://');
      protocol = protocolHostport[0];
      const hostPort = protocolHostport[1].split(':');

      if ((!host || ops.noroot) && !['/root', '/', ''].includes(server)) pathPrefix = '/api';

      host = hostPort[0];
      port = hostPort[1];
    }
  }
  if (!host) {
    console.error('[!] Could not find an available host.');
    process.exit(1);
  }
}
if (ops.verbose) {
  console.error('[i] host = ' + protocol + '://' + host + ':' + port + pathPrefix);
}

let bar;

function makeProgressBar (processID) {
  bar = new ProgressBar('[.] process ' + processID + ': [:bar] :percent, eta: :etas', {
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
  if (!options.meta && (options.path.startsWith('/proc/debug/') || options.path.startsWith('/p/debug/'))) debugOutput(data);
  else if (options.pack) console.log(typeof data === 'string' ? data : JSON.stringify(data));
  else console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
};

const errorCallback = options => function (errorMessage, errorCode) {
  if (typeof errorCode === 'undefined') console.error('\n [!] Error :', errorMessage);
  else console.error('\n[!] Error ' + errorCode + ' :', errorMessage);
  process.exit(errorCode || 1);
};

let lastProgress;
const progressCallback = (options) => function (progress, processId) {
  if (!options.quiet) {
    if (typeof bar === 'undefined' && typeof processId !== 'undefined') makeProgressBar(processId);
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
  pathPrefix,
  path: ops.version ? '/version' : ops.args[0],
  quiet: ops.quiet,
  debug: ops.debug,
  first: ops.first,
  timeout: ops.timeout,
  pack: ops.pack,
  meta: ops.meta,
  verbose: ops.verbose
};

request(options,
  dataCallback(options),
  errorCallback(options),
  progressCallback(options)
);
