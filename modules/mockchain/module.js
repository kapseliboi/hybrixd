// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - mockchain/module.js
// Module to provide a mock chain for testing

let fs = require('fs');

// exports
exports.mine = mine;
exports.balance = balance;
exports.push = push;
exports.history = history;
exports.transaction = transaction;
exports.message = message;

const filePath = '../modules/mockchain/test.mockchain.json';

function mine (proc) {
  let mockchain;
  try {
    if (fs.existsSync(filePath)) {
      mockchain = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      mockchain = [];
    }
  } catch (e) {
    proc.fail('This node does not support mockchain.');
  }

  let contract = proc.command[1];
  let target = Number(proc.command[2]);
  let amount = Number(proc.command[3]);
  let newTransaction = {type: 'mine', contract, target, amount, id: mockchain.length};
  mockchain.push(newTransaction);
  fs.writeFileSync(filePath, JSON.stringify(mockchain));

  proc.done(newTransaction);
}

function balance (proc) {
  let mockchain;
  try {
    if (fs.existsSync(filePath)) {
      mockchain = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      mockchain = [];
    }
  } catch (e) {
    proc.fail('This node does not support mockchain.');
  }

  let contract = proc.command[1];
  let address = Number(proc.command[2]);
  let balance = 0;
  for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
    let transaction = mockchain[transactionId];
    if (transaction.target === address && transaction.contract === contract) { balance += transaction.amount; }
    if (transaction.source === address && transaction.contract === contract) { balance -= transaction.amount + transaction.fee; }
  }
  proc.done('' + balance);
}

function push (proc) {
  let mockchain;
  try {
    if (fs.existsSync(filePath)) {
      mockchain = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      mockchain = [];
    }
  } catch (e) {
    proc.fail('This node does not support mockchain.');
  }

  let newTransaction = JSON.parse(proc.command[1]);
  let source = newTransaction.source;
  let target = newTransaction.target;
  let contract = newTransaction.contract;
  let amount = newTransaction.amount;
  let fee = newTransaction.fee;
  let message = typeof newTransaction.message === 'string' ? newTransaction.message : '';
  let signature = newTransaction.signature;
  if (signature !== source * target + amount + fee * 3.14 + contract.length * 1001 + message.length * 123) {
    proc.fail('illegal signature');
  } else {
    let balance = 0;
    for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
      let transaction = mockchain[transactionId];
      if (transaction.target === source && transaction.contract === contract) { balance += transaction.amount; }
      if (transaction.source === source && transaction.contract === contract) { balance -= transaction.amount + transaction.fee; }
    }
    if (balance >= amount + fee) {
      newTransaction.timestamp = Date.now();
      newTransaction.id = mockchain.length;
      newTransaction.type = 'tran';
      mockchain.push(newTransaction);
      fs.writeFileSync(filePath, JSON.stringify(mockchain));
      proc.done(newTransaction.id);
    } else {
      proc.fail('insufficient balance');
    }
  }
}

function history (proc) {
  let mockchain;
  try {
    if (fs.existsSync(filePath)) {
      mockchain = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      mockchain = [];
    }
  } catch (e) {
    proc.fail('This node does not support mockchain.');
  }

  let contract = proc.command[1];
  let address = Number(proc.command[2]);
  let history = [];
  for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
    let transaction = mockchain[transactionId];
    if ((transaction.target === address || transaction.source === address) && transaction.contract === contract) {
      history.push(transactionId);
    }
  }
  proc.done(history);
}

function transaction (proc) {
  let mockchain;
  try {
    if (fs.existsSync(filePath)) {
      mockchain = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      mockchain = [];
    }
  } catch (e) {
    proc.fail('This node does not support mockchain.');
  }

  let transactionId = Number(proc.command[1]);
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
      confirmed: 1
    };
    proc.done(normalizedTransaction);
  } else {
    proc.fail('unknown transaction');
  }
}

// message/attachment
function message (proc) {
  let mockchain;
  try {
    if (fs.existsSync(filePath)) {
      mockchain = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      mockchain = [];
    }
  } catch (e) {
    proc.fail('This node does not support mockchain.');
  }

  let transactionId = Number(proc.command[1]);
  if (transactionId < mockchain.length) {
    let transaction = mockchain[transactionId];
    proc.done(transaction.message);
  } else {
    proc.fail('unknown transaction');
  }
}
