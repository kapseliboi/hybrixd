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

const red = '\033[0;31m';
const green = '\033[0;32m';
const blue = '\033[0;34m';
const grey = '\033[0;37m';
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
  'verbose': {key: 'v', args: 0, description: 'Show progress indicator and toggles.'},
  'interactive': {key: 'i', args: 0, description: 'Run interactive mode.'},
  'source': {key: 's', args: 1, description: 'provide source script.'},
  'debug': {key: 'd', args: 0, description: 'Run in debug mode.'},
  'pack': {key: 'p', args: 0, description: 'Returned packed JSON instead of prettyfied.'},
  'host': {key: 'h', args: 1, description: 'Set hybrixd host.'},
  'conf': {key: 'c', args: 1, description: 'Provide conf file. hybrixd.conf by default.'},
  'timeout': {key: 't', args: 1, description: 'Specify timeout in ms, defaults to ' + DEFAULT_TIMEOUT},
  'import': {key: 'I', args: 1, description: 'Import other recipe(s).'},
  '_meta_': {minArgs: 0}
});

if(ops.verbose){
  console.log('[i] mode verbose = on');
  console.log('[i] mode debug = '+(ops.debug?'on':'off'));
  if(ops.import)  console.log('[i] import = '+ops.import);
  //TODO source, pack, conf, timeout
}


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

if(ops.verbose) console.log('[i] host = '+ host+':'+port);

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

function parseScript(script){
   if (script.startsWith('{')) { // JSON script: parse directly into recipe
    try {
      return JSON.parse(script);
    } catch (e) {
      return script;
    }
  } else { // flat script: parse line by line looking for methods
    const recipe = {quartz:{}};
    let method = 'main';
    for(let line of script.split('\n')){
      line = line.trim();
      if(line.startsWith('/'))  method = line.split('/').slice(1).join('/'); // resolve methods (qrtz functions)
      else {
        if(!recipe.quartz.hasOwnProperty(method)) recipe.quartz[method] = [];
        recipe.quartz[method].push(line);
      }
    }
    return recipe;
  }
}



function handleImportsAndMethods (script) {

  const recipe= parseScript(script);
  const imports = ops.import ? ops.import.split(','):[];
  if(ops.interactive && ops.source){
    const source = resolveFilePath(ops.source || ops.args[0]);
    if (fs.existsSync(source)) {
      const sourceScript = fs.readFileSync(source).toString();
      const sourceRecipe = parseScript(sourceScript);
      for(let key in  sourceRecipe){
        if(!recipe.hasOwnProperty(key)) recipe[key] = sourceRecipe[key];
        else if(key === 'quartz'){
          for(let method in sourceRecipe.quartz){
            if(method!=='main') recipe.quartz[method] =  sourceRecipe.quartz[method];
          }
        }
      }
    }
  }

  if (recipe.import instanceof Array) recipe.import = recipe.import.concat(imports);
  else if (typeof recipe.import === 'string') recipe.import = [recipe.import].concat(imports);
  else recipe.import = imports;
  return JSON.stringify(recipe);
}

function execute (script, command, dataCallback, errorCallback, progressCallback) {
  script = handleImportsAndMethods(script);
  request(
    {
      port,
      host,
      meta: false,
      quiet: true,
      debug: ops.debug,
      /* interval
            timeout          */
      path: '/p/exec/' + command.join('/') + '/POST=' + encodeURIComponent(script)
      // todo data
    },

    dataCallback,
    errorCallback,
    progressCallback
  );
}

function handleMode(line, dataCallback, errorCallback){
  const modes = line.split(' ').slice(1) // 'mode debug=on verbose' => ['debug=on','verbose']
        .map(string => string.split('=')); // ['debug=on','verbose'] -> [['debug','on'],['verbose']]

  let debug = ops.debug;
  for(let [mode,value] of modes){ //TODO if verbose log all toggles
    if(mode === 'debug' && value === 'off') debug=false;
    else if(mode === 'debug' && value === 'on' ) debug=true;
    else if(mode === 'debug' && typeof value === 'undefined' ) debug=!debug;
    if(mode === 'verbose' && value === 'off') ops.verbose=false;
    else if(mode === 'verbose' && value === 'on' ) ops.verbose=true;
    else if(mode === 'verbose' && typeof value === 'undefined' ) ops.verbose=!ops.verbose;
  }
  dataCallback('');
  ops.debug =debug;
}

function displayHelp(line, dataCallback, errorCallback){
  if(line==='help' || line===''){
    console.log(`interactive qrtz cli for hybrixd

@usage  $func $parameter1 $parameter2 ...
@example

help math           // get help on the math function

@example

data 1              // sets the data stream to 1
math +1             // adds one to the data stream (now 2)


exit                // exit the shell

For further reference see: api.hybrix.io/help/qrtz
`);
    return dataCallback('');
  }

  const [help, head] = line.split(' ');
  if(head.length!==4) return errorCallback(`Illegal command '${head}', expected 4 characters.`); //TODO did you mean?
  if(fs.existsSync(`./scheduler/methods/${head}.js`)){
    const fileContent = fs.readFileSync(`./scheduler/methods/${head}.js`).toString();
    const jsdoc  = /\/\*\*([\s\S]+?)exports\.(\w*)/.exec(fileContent);
    const lines = jsdoc[0].split('\n')
          .filter(line=>!line.includes('/**') && !line.includes('*/') && !line.includes('exports.'))
          .map(line => {line=line.trim(); if(line.startsWith('*')){line = line.substr(1).trim();} return line;}  );
    ;
    console.log('\n'+head+': '+lines.join('\n'));
    return dataCallback('');
  }else{
    return errorCallback(`Method '${head}' does not exist.`); //TODO did you mean?
  }
}


function interactiveMode (data) {
  const prompt = 'qrtz$ ';
  process.stdout.write(prompt);

  const dataCallback = data => {
    if (ops.debug) {
      debugOutput(data);
    } else if (ops.pack) {
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
  const readLine =  line => {
    line = line.toString().replace('\n',''); // debuffer and remove trailing newline
    if (line === '' || line === 'help' || line.startsWith('help ')) displayHelp(line, dataCallback, errorCallback);
    else if (line.startsWith('mode ')) handleMode(line, dataCallback, errorCallback);
    else if ( line === 'quit' || line === 'exit') process.exit(0);
    else {
      const script = typeof pdata === 'undefined' ? line : (`data ${JSON.stringify(pdata)}\n${line}`);
      execute(script, ops.args || [], dataCallback, errorCallback, progressCallback);
    }
  }
  process.stdin.addListener('data', readLine);
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

  5. Use source for interactive
  $ qrtz -i -s script.qrtz

  6. Use pipe for input data to script:
  $ qrtz -s script.qrtz $1 $2 < cat data
  $ cat data |  qrtz -s script.qrtz $1 $2


*/

const interactive = !hasPipeInput && (ops.interactive || (typeof ops.args === 'undefined' && !ops.source));
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
    const script = fs.readFileSync(source).toString();
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
