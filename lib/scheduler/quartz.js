const fs = require('fs');

const Quartz = function () {
  const method = name => {
    if (name === '') { return; }
    const source = require('./methods/' + name + '.js')[name];

    if (typeof source !== 'function') {
      console.log(` [!] Error initializing qrtz method '${name}'`);
    } else {
      this[name] = function (p) {
        if (global.hybrixd.proc.hasOwnProperty(p.processID)) {
          const data = global.hybrixd.proc[p.processID].data;
          return source(data).apply(this, arguments);
        } else {
          console.log(` [!] Process not available '${p.processID}'`);
          return null;
        }
      }.bind(this);
    }
  };

  fs.readdir('./scheduler/methods', (err, files) => {
    if (err) {
      console.error('Could not list the directory.', err);
    } else {
      files.forEach((file) => { method(file.split('.')[0]); });
    }
  });
};

function addDefaultPreAndPostAmbles (quartz, isAsset) {
  if (typeof quartz !== 'object' || quartz === null) { return; }
  for (let command in quartz) {
    const steps = quartz[command];
    if (isAsset) {
      // Preprocess: Prepend validation of input for specific commands
      if (command === 'balance' || command === 'history' || command === 'unspent') {
        steps.unshift(
          'call validate/$1',
          'flow valid 2 1',
          'fail "Invalid address $1"'
        );
      }
      if (command === 'transactionData') { // cache data
      // attempt reload of data
        steps.unshift(
          'time $timeout',
          'data "$1_$symbol"',
          'hash',
          'data "tx$"',
          'poke storageHash',
          'load "$storageHash" 1 @requestData',
          'unpk 1 @requestData',
          'logs "Getting transaction data from storage $1"',
          'done',
          '@requestData'
        );
      }
      /* DISABLED BY ROUKE : CACHING BREAKS FUNCTIONALITY

      if (command === 'history') { // cache data
      steps.push('poke count "$2" 12');
      steps.push('poke offset "$3" 0');
      steps.push('data "$1_$count_$offset_$symbol"');
      steps.push('hash');
      steps.push('data tx$');
      steps.push('poke storageHash');
    } */

      // Postprocess: Append formating of result for specific commands
      if (command === 'balance' || command === 'fee') { // append formatting of returned numbers
        steps.push(
          'form',
          'done'
        );
      }
      if (command === 'transactionData') { // cache data
      // save/cache rawtx data
        steps.push(
          'poke txData',
          'pack',
          'hook @returnResult',
          'save "$storageHash"',
          '@returnResult',
          'peek txData',
          'done'
        );
      }

      if (command === 'transaction') { // append formatting of returned numbers
        steps.push(
          'poke formAmount ${.amount}',
          'with formAmount form',
          'poke formFee ${.fee}',
          'with formFee form $fee-factor',
          'data {id:"${.id}",timestamp:${.timestamp},height:${.height},amount:"$formAmount",symbol:"${.symbol}",fee:"$formFee",fee-symbol:"${.fee-symbol}",source:"${.source}",target:"${.target}",confirmed:${.confirmed}}',
          'done'
        );
      }
      /*  DISABLED BY ROUKE : CACHING BREAKS FUNCTIONALITY
        if (command === 'history') { // take into account the offset and record count
      steps.push('take $offset $count');
      steps.push('poke historyData');
      steps.push('pack');
      steps.push('save "$storageHash"');
      steps.push('peek historyData');
      steps.push('done');
      steps.push('@returnCache');
      steps.push('load "$storageHash" 1 @failCache');
      steps.push('unpk 1 @failCache');
      steps.push('logs "getting history data from storage $1"');
      steps.push('done');
      steps.push('@failCache');
      steps.push('fail "Cannot get history!"');
    } */
      if (command === 'status') { // significantly shorten the status hash to save bandwidth
        steps.push(
          'take 24 16',
          'done'
        );
      }
    }

    if (steps.length > 0) { // add a done if process does not end with stop,done or fail
      const lastSubprocess = steps[steps.length - 1];
      if (!lastSubprocess.startsWith('done') && !lastSubprocess.startsWith('fail') && !lastSubprocess.startsWith('stop')) {
        steps.push('done');
      }
    } else {
      steps.push('done');
    }
  }
}

exports.Quartz = Quartz; // initialize a new process
exports.addDefaultPreAndPostAmbles = addDefaultPreAndPostAmbles;
