// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - storage/module.js
// Module to provide clustering

var scheduler = require('../../lib/scheduler');
var fs = require('fs');
// exports
exports.init = init;
exports.exec = exec;

// initialization function
function init () {
}

// exec
function exec (properties) {
  var filePath = '../../test.mockchain.json';

  // decode our serialized properties
  var processID = properties.processID;
  // var source = properties.source;
  var command = properties.command;
  var subprocesses = [];
  // set request to what command we are performing
  global.hybrixd.proc[processID].request = properties.command;

  var mockchain;
  if (fs.existsSync(filePath)) {
    mockchain = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else {
    mockchain = [];
  }

  switch (command[0]) {
    case 'mine' :
      var contract = command[1];
      var target = Number(command[2]);
      var amount = Number(command[3]);
      var newTransaction = {type: 'mine', contract, target, amount, id: mockchain.length};
      mockchain.push(newTransaction);
      fs.writeFileSync(filePath, JSON.stringify(mockchain));
      subprocesses.push('pass(' + JSON.stringify(newTransaction) + ')');
      break;
    case 'balance' :
      var contract = command[1];
      var address = Number(command[2]);
      var balance = 0;
      for (var i = 0; i < mockchain.length; ++i) {
        var transaction = mockchain[i];
        if (transaction.target === address && transaction.contract === contract) { balance += transaction.amount; }
        if (transaction.source === address && transaction.contract === contract) { balance -= transaction.amount + transaction.fee; }
      }
      subprocesses.push('pass("' + balance + '")');
      break;
    case 'push' :
      var newTransaction = JSON.parse(command[1]);
      var source = newTransaction.source;
      var target = newTransaction.target;
      var contract = newTransaction.contract;
      var amount = newTransaction.amount;
      var fee = newTransaction.fee;
      var message = typeof newTransaction.message === 'string' ? newTransaction.message : '';
      var signature = newTransaction.signature;
      if (signature !== source * target + amount + fee * 3.14 + contract.length * 1001 + message.length * 123) {
        subprocesses.push("fail 'illegal signature'");
      } else {
        var balance = 0;
        for (var i = 0; i < mockchain.length; ++i) {
          var transaction = mockchain[i];
          if (transaction.target === source && transaction.contract === contract) { balance += transaction.amount; }
          if (transaction.source === source && transaction.contract === contract) { balance -= transaction.amount + transaction.fee; }
        }
        if (balance >= amount + fee) {
          newTransaction.timestamp = Date.now();
          newTransaction.id = mockchain.length;
          newTransaction.type = 'tran';
          mockchain.push(newTransaction);
          fs.writeFileSync(filePath, JSON.stringify(mockchain));
          subprocesses.push('pass(' + JSON.stringify(newTransaction) + ')');
        } else {
          subprocesses.push("fail 'insufficient balance'");
        }
      }
      break;
    case 'history' :

      var contract = command[1];
      var address = Number(command[2]);
      var history = [];
      for (let i = 0; i < mockchain.length; ++i) {
        let transaction = mockchain[i];
        if ((transaction.target === address || transaction.source === address) && transaction.contract === contract) {
          var normalizedTransaction = {
            id: transaction.id,
            timestamp: transaction.id,
            amount: transaction.amount,
            symbol: transaction.contract === 'main' ? 'mock' : 'mock.' + transaction.contract,
            fee: transaction.fee,
            'fee-symbol': transaction.contract === 'main' ? 'mock' : 'mock.' + transaction.contract,
            source: transaction.source,
            target: transaction.target,
            data: transaction.message
          };
          history.push(normalizedTransaction);
        }
      }
      subprocesses.push('pass(' + JSON.stringify(history) + ')');
      break;
    case 'transaction' :
      var transactionId = Number(command[1]);
      if (transactionId < mockchain.length) {
        let transaction = mockchain[transactionId];
        let normalizedTransaction = {
          id: transaction.id,
          timestamp: transaction.id,
          amount: transaction.amount,
          symbol: transaction.contract === 'main' ? 'mock' : 'mock.' + transaction.contract,
          fee: transaction.fee,
          'fee-symbol': transaction.contract === 'main' ? 'mock' : 'mock.' + transaction.contract,
          source: transaction.source,
          target: transaction.target,
          data: transaction.message,
          details: {type: transaction.type}
        };
        subprocesses.push('pass(' + JSON.stringify(normalizedTransaction) + ')');
      } else {
        subprocesses.push("fail 'unknown transaction'");
      }
      break;
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}
