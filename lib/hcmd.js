// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hcmd - simple command line interface for hybrixd

// TODO check if hostname is valid hostname

const DEFAULT_TIMEOUT = 30000; // defailt max miliseconds before

// required libraries in this context
const fs = require('fs');
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
  'direct': {key: 'd', args: 0, description: 'Direct call, no follow up.'},
  'timeout': {key: 't', args: 1, description: 'Specify timeout in ms, defaults to ' + DEFAULT_TIMEOUT},
  '_meta_': {minArgs: 1}
});

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

conf.defaults();

if (fs.existsSync(confFile)) {
  conf.import(confFile, true);
} else {
  console.log('Error: Configuration file ' + confFile + ' not found.');
}

let host, port;
if (ops.host) {
  host = ops.host.split(':')[0];
  port = ops.host.split(':')[1];
} else {
  const servers = conf.get('host.servers');
  for (let endpoint in servers) {
    if (servers[endpoint] === '/root') {
      const protocolHostport = endpoint.split('://');
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

const sortNumeric = (n, m) => {
  if (n === m) return 0;

  const nSplit = n.split('.');
  const mSplit = m.split('.');
  const nLength = nSplit.length;
  const mLength = mSplit.length;
  const baseLength = Math.min(nLength, mLength);

  const nBase = nSplit.slice(0, baseLength);
  const mBase = mSplit.slice(0, baseLength);

  const elemIsEqual = (e, i) => e === mBase[i];
  const hasEqualBase = nBase.every(elemIsEqual);

  const getValueByComparison = (n, m) => {
    for (let i = 0; i < baseLength; ++i) {
      if (Number(n[i]) > Number(m[i])) { return 1; }
    }
    return -1;
  };
  const getValueByLengthComparison = (n, m) => {
    return nLength > mLength ? -1 : 1;
  };

  return hasEqualBase
    ? getValueByLengthComparison(n, m)
    : getValueByComparison(nBase, mBase);
};

const debugOutput = data => {
  // Debug output
  const procs = {};

  Object.keys(data).sort(sortNumeric).forEach(function (key) {
    procs[key] = data[key];
  });

  for (let pid in procs) {
    const proc = procs[pid];
    let output = pid + ' : ';
    if (proc.err !== 0 && proc.progress) {
      output += '[ERROR @ ' + Math.floor(proc.progress * 100) + '%]';
    } else if (proc.progress !== 1.0 && proc.progress) {
      output += '[UNFINISHED ' + Math.floor(proc.progress * 100) + '%]';
    }
    if (proc.qrtz) {
      if (typeof proc.progress !== 'undefined' && proc.progress !== null) {
        output += JSON.stringify(proc.qrtz) + ' > ' + JSON.stringify(proc.data);
      } else {
        output += '[NOT STARTED] ' + JSON.stringify(proc.qrtz);
      }
    } else if (proc.path) {
      output += 'func ' + proc.path.join('/');
    } else {
      output += 'func UKNOWN';
    }
    console.log(output);
  }
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
  console.error(' [!] Error ' + errorCode + ' :', errorMessage);
  process.exit(errorCode || 1);
};

const progressCallback = (options) => function (progress, processId) {
  if (!options.quiet) {
    if (typeof bar === 'undefined' && typeof processId !== 'undefined') {
      makeProgressBar(processId);
    }
    if (typeof bar !== 'undefined') {
      bar.update(progress);
    }
  }
};

const options = {
  host,
  port,
  path: ops.args[0],
  quiet: ops.quiet,
  direct: ops.direct,
  timeout: ops.timeout,
  pack: ops.pack,
  meta: ops.meta
};

request(options,
  dataCallback(options),
  errorCallback(options),
  progressCallback(options)
);
