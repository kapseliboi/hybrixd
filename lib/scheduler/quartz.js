const fs = require('fs');

const Quartz = function () {
  const method = head => {
    if (head === '') { return; }
    const source = require('./methods/' + head + '.js')[head];

    if (typeof source !== 'function') {
      global.hybrixd.logger(['error', 'qrtz'], `Error initializing qrtz method '${head}'`);
    } else {
      this[head] = function (processStep, parameter1, parameter2) {
        const data = processStep.getData();
        try {
          const result = source(data).apply(this, arguments); // call head(processStep, parameter1, parameter2, ...)
          return result;
        } catch (e) {
          global.hybrixd.logger(['error', 'qrtz'], `Error process /p/'${processStep.getProcessID()}'`, e);
          return null;
        }
      }.bind(this);
    }
  };

  fs.readdir('./scheduler/methods', (err, files) => {
    if (err) global.hybrixd.logger(['error', 'qrtz'], 'Could not list the directory.', err);
    else files.forEach((file) => method(file.split('.')[0]));
  });
};

function addDefaultPreAndPostAmbles (quartz, isAsset) {
  if (typeof quartz !== 'object' || quartz === null) { return; }
  for (let functionSignature in quartz) {
    const steps = quartz[functionSignature];
    const command = functionSignature.split('/')[0]; // remove parameter specifications "balance/address" => "balance"
    if (!(steps instanceof Array)) continue; // skip if its a compiled QrtzFunction
    if (isAsset) {
      if (steps.indexOf('#Start of default') !== -1) continue;
      // Preprocess: Prepend validation of input for specific commands

      if (command === 'balance' || command === 'history' || command === 'unspent') {
        steps.unshift(
          '#Start of default',
          'call validate/$1',
          'flow valid 2 1',
          'fail "Invalid address $1"',
          '#End of default'
        );
      }
      // Postprocess: Append formating of result for specific commands
      if (command === 'balance') { // append formatting of returned numbers
        steps.push('#Start of default', 'form', '#End of default');
      } else if (command === 'fee') { // append formatting of returned numbers
        steps.push('#Start of default', 'call formFee', '#End of default');
      } else if (command === 'transaction') { // append formatting of returned numbers
        steps.push(
          '#Start of default',
          'with .amount form',
          'with .fee call formFee',
          'have .spends 2 1',
          'with .spends data {\'${.target}\':\'${.amount}\'}',
          'flow 2 {undefined:1} 2',
          'done',
          'have .spends.$2 2 1',
          'fail "Unknown target address"',
          'with .target [data,$2] [done]',
          'poke tx',
          'tran .spends.$2',
          'poke tx.amount',
          'peek tx',
          'drop spends',
          '#End of default'
        );
      } else if (command === 'status') { // significantly shorten the status hash to save bandwidth
        steps.push('#Start of default', 'take 24 16', '#End of default');
      }
    }

    if (steps.length > 0) { // add a done if process does not end with stop,done or fail
      const lastSubprocess = steps[steps.length - 1];
      if (!lastSubprocess.startsWith('done') && !lastSubprocess.startsWith('fail') && !lastSubprocess.startsWith('stop')) steps.push('done');
    } else steps.push('done');
  }
}

const quartz = new Quartz();

const execute = (head, p, parameters) => {
  if (!quartz.hasOwnProperty(head)) throw new Error(`Quartz does not have function "${head}"`);
  quartz[head].apply(quartz, [p].concat(parameters)); // head(p,param1,param2,...)
};

exports.execute = execute; // initialize a new process
exports.addDefaultPreAndPostAmbles = addDefaultPreAndPostAmbles;
