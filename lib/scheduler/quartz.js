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
        return source(data).apply(this, arguments); // call head(processStep, parameter1, parameter2, ...)
      }.bind(this);
    }
  };

  fs.readdir('./scheduler/methods', (err, files) => {
    if (err) {
      global.hybrixd.logger(['error', 'qrtz'], 'Could not list the directory.', err);
    } else {
      files.forEach((file) => { method(file.split('.')[0]); });
    }
  });
};

function addDefaultPreAndPostAmbles (quartz, isAsset) {
  if (typeof quartz !== 'object' || quartz === null) { return; }
  for (let command in quartz) {
    const steps = quartz[command];
    command = command.split('/')[0]; // remove parameter specifications "balance/address" => "balance"
    if (isAsset) {
      // Preprocess: Prepend validation of input for specific commands
      if (command === 'balance' || command === 'history' || command === 'unspent') {
        steps.unshift(
          'call validate/$1',
          'flow valid 2 1',
          'fail "Invalid address $1"'
        );
      }
      // Postprocess: Append formating of result for specific commands
      if (command === 'balance' || command === 'fee') { // append formatting of returned numbers
        steps.push(
          'form',
          'done'
        );
      }
      if (command === 'transaction') { // append formatting of returned numbers
        steps.push(
          'with .amount form',
          'with .fee form "$fee-factor"',
          'done'
        );
      }
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

const quartz = new Quartz();

const execute = (head, p, parameters) => {
  if (!quartz.hasOwnProperty(head)) throw new Error(`Quartz does not have function "${head}"`);
  quartz[head].apply(quartz, [p].concat(parameters)); // head(p,param1,param2,...)
};

exports.execute = execute; // initialize a new process
exports.addDefaultPreAndPostAmbles = addDefaultPreAndPostAmbles;
