// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hcmd - simple command line interface for hybrixd

// TODO check if hostname is valid hostname

const DEFAULT_TIMEOUT = 30000; // defailt max miliseconds before

// required libraries in this context
const fs = require('fs');
const stdio = require('stdio');
const conf = require('./conf/conf');
const ProgressBar = require('progress');
const request = require('./request').request;

const path = require('path');
const workingDir = path.resolve(process.cwd(), '.');
process.chdir(__dirname);


const red= '\033[0;31m';
const green= '\033[0;32m';
const blue= '\033[0;34m';
const grey= '\033[0;37m';
const noColor = '\033[0m';

function resolveFilePath (filePath) {
  if (filePath.startsWith('/')) {
    return filePath;
  } else {
    return path.join(workingDir, filePath);
  }
}

// command line options and init
const ops = stdio.getopt({
  'verbose': {key: 'v', args: 0, description: 'Show progress indicator.'},
  'interactive': {key: 'i', args: 0, description: 'Run interactive mode.'},
  'source': {key: 's', args: 1, description: 'provide source script.'},
  'debug': {key: 'd', args: 0, description: 'Run in debug mode.'},
  'pack': {key: 'p', args: 0, description: 'Returned packed JSON instead of prettyfied.'},
  'host': {key: 'h', args: 1, description: 'Set hybrixd host.'},
  'conf': {key: 'c', args: 1, description: 'Provide conf file. hybrixd.conf by default.'},
  'timeout': {key: 't', args: 1, description: 'Specify timeout in ms, defaults to ' + DEFAULT_TIMEOUT},
  '_meta_': {minArgs: 0}
});

const confFile = ops.conf
      ? resolveFilePath(ops.conf)
      : '../hybrixd.conf';

if (!conf.setup(confFile)) {
  console.log(`${red} [!] Error: Configuration file ${confFile} not found. ${noColor}`);
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

const progressCallback = function (progress, processId) {
  if (ops.verbose) {
    if (typeof bar === 'undefined' && typeof processId !== 'undefined') {
      makeProgressBar(processId);
    }
    if (typeof bar !== 'undefined') {
      bar.update(progress);
    }
  }
};

function execute (script, command, dataCallback, errorCallback, progressCallback) {
  request(
    {
      port,
      host,
      meta: false,
      quiet: true,
      debug: ops.debug,
      /* interval
            timeout
            debug */

      path: '/p/exec/' + command.join('/') + '/POST=' + encodeURIComponent(script)
      // todo data
    },

    dataCallback,
    errorCallback,
    progressCallback
  );
}

function interactiveMode (data) {
  const prompt = 'qrtz$ ';
  process.stdout.write(prompt);
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });
  let pdata = data;

  const dataCallback = data => {
    if (ops.debug) {
      debugOutput(data);
    }else if (ops.pack) {
      process.stdout.write(typeof data === 'string' && data.indexOf(' ') === -1 ? (data + '\n') : JSON.stringify(data) + '\n');
    } else {
      process.stdout.write(typeof data === 'string' && data.indexOf(' ') === -1 ? (data + '\n') : JSON.stringify(data, null, 2) + '\n');
    }
    pdata = data;
    process.stdout.write(prompt);
  };
  const errorCallback = (errorMessage, errorCode) => {
    console.error(`${red} [!] Error ${errorCode || 1} : ${errorMessage}${noColor}`);
    process.stdout.write(prompt);
  };
  rl.on('line', function (line) {
    if (line === 'q' || line === 'quit' || line === 'exit') {
      process.exit(0);
    } else {
      const script = typeof pdata === 'undefined' ? line : (`data ${JSON.stringify(pdata)}\n${line}`);
      execute(script, ops.args||[], dataCallback, errorCallback, progressCallback);
    }
  });
}

const hasPipeInput = !process.stdin.isTTY;

let stdin = '';

if (hasPipeInput) {
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (chunk) {
    stdin += chunk;
  });
}

/*
  1. Interactive
  $ qrtz
  $ qrtz -i $1 $2

  2. pipe to interactive
  $ cat data | qrtz -i
  $ qrtz -i < cat data

  3. Excute script
  $ qrtz script.qrtz $1 $2
  $ qrtz -s script.qrtz $1 $2

  4. Use pipe for script:
  $ qrtz $1 $2 < cat script.qrtz
  $ cat script.qrtz | qrtz $1 $2

  TODO 5. Use pipe for input data to script:
  $ qrtz -s script.qrtz $1 $2 < cat data
  $ cat data |  qrtz -s script.qrtz $1 $2

  TODO 6. Use source for interactive
  $ qrtz -i -s script.qrtz

*/

const interactive = !hasPipeInput && (ops.interactive || typeof ops.args === 'undefined') && !ops.source;
const pipeInteractive = hasPipeInput && ops.interactive;
const executeScript = !hasPipeInput && (typeof ops.args !== 'undefined' || ops.source);
const pipeScript = hasPipeInput && !ops.source && !ops.interactive;
const pipeDataToScript = hasPipeInput && ops.source;

const debugOutput = data => {
  const html = require('./router/debug/debug.js').display('cli', data);
  console.log(html);
};

const dataCallback = function (data) {
  if (ops.debug) {
    debugOutput(data);
  } else if (ops.pack) {
    console.log(typeof data === 'string' && data.indexOf(' ') === -1 ? data : JSON.stringify(data));
  } else {
    console.log(typeof data === 'string' && data.indexOf(' ') === -1 ? data : JSON.stringify(data, null, 2));
  }
};

if (interactive) {
  interactiveMode();
} else if (pipeInteractive) {
  process.stdin.on('end', function () {
    interactiveMode(stdin);
  });
} else if (executeScript) {
  const source = resolveFilePath(ops.source || ops.args[0]);

  if (fs.existsSync(source)) {
    const command = ops.source ? ops.args || [] : ops.args.slice(1);
    const script = fs.readFileSync(source);
    const errorCallback = (errorMessage, errorCode) => {
      console.error(`${red} [!] Error ${errorCode || 1} : ${errorMessage}${noColor}`);
      process.exit(errorCode || 1);
    };
    execute(script, command, dataCallback, errorCallback, progressCallback);
  } else {
    console.error(`${red} [!] Error 404 : qrzt: ${source} : No such file or directory${noColor}`);
    process.exit(1);
  }
} else if (pipeScript) {
  process.stdin.on('end', function () {
    const errorCallback = (errorMessage, errorCode) => {
      console.error(`${red} [!] Error ${errorCode || 1} : ${errorMessage}${noColor}`);
      process.exit(errorCode || 1);
    };
    execute(stdin, ops.args || [], dataCallback, errorCallback, progressCallback);
  });
} else if (pipeDataToScript) {
  process.stdin.on('end', function () {
    const errorCallback = (errorMessage, errorCode) => {
      console.error(`${red} [!] Error ${errorCode || 1} : ${errorMessage}${noColor}`);
      process.exit(errorCode || 1);
    };
    // TODO inject data into script
    //    execute(stdin, dataCallback, errorCallback);
  });
}
