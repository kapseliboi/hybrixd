// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - mockchain/module.js
// Module to provide a mock chain for testing

const fs = require('fs');
const Decimal = require('../../common/crypto/decimal-light.js');

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
  const contract = proc.command[1];
  const target = Number(proc.command[2]);
  const amount = Number(proc.command[3]);
  const timestamp = Math.round(Date.now() * 0.001);
  const newTransaction = {type: 'mine', timestamp, contract, target, amount, id: mockchain.length};

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

  const contract = proc.command[1];
  const address = Number(proc.command[2]);
  let balance = 0;
  for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
    const transaction = mockchain[transactionId];
    if (transaction.target === address && transaction.contract === contract) { balance += transaction.amount; }
    if (transaction.source === address && transaction.contract === contract) { balance -= transaction.amount + transaction.fee; }
  }
  proc.done('' + balance);
}

const fromInt = function (input, factor) {
  const f = Number(factor);
  const x = new Decimal(String(input));
  return x.times((f > 1 ? '0.' + new Array(f).join('0') : '') + '1').toFixed();
};

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

  const newTransaction = JSON.parse(proc.command[2]);
  const source = newTransaction.source;
  const target = newTransaction.target;
  const contract = newTransaction.contract;
  const contract_ = proc.command[1];
  if (contract_ !== contract) {
    proc.fail(`pushed ${contract} to ${contract_}`);
    return;
  }

  const factor = newTransaction.factor;

  const atomicAmount = newTransaction.amount;
  const amount = fromInt(atomicAmount, factor);
  const fee = newTransaction.fee;
  const message = typeof newTransaction.message === 'string' ? newTransaction.message : '';
  const signature = newTransaction.signature;

  const expectedSignature = Number(source) * Number(target) + Number(atomicAmount) + Number(fee) * 3.14 + contract.length * 1001 + message.length * 123;
  if (signature !== expectedSignature) {
    proc.fail('illegal signature');
  } else {
    let balance = 0;
    for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
      const transaction = mockchain[transactionId];
      if (transaction.target === source && transaction.contract === contract) { balance += transaction.amount; }
      if (transaction.source === source && transaction.contract === contract) { balance -= transaction.amount + transaction.fee; }
    }
    if (balance >= amount + fee) {
      delete newTransaction.factor;
      newTransaction.amount = amount;
      newTransaction.timestamp = Math.round(Date.now() * 0.001);
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

  const contract = proc.command[1];
  const address = Number(proc.command[2]);
  const length = (proc.command[3]);
  const offset = (proc.command[4]);

  const history = [];
  for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
    const transaction = mockchain[transactionId];
    if ((Number(transaction.target) === address || Number(transaction.source) === address) && transaction.contract === contract) {
      history.unshift(transactionId);
    }
  }
  if (!isNaN(offset)) {
    history.splice(0, offset);
  }
  if (!isNaN(length) && length < history.length) {
    history.length = length;
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

  const contract = proc.command[1];
  const transactionId = Number(proc.command[2]);

  if (transactionId < mockchain.length) {
    const transaction = mockchain[transactionId];
    if (transaction.contract !== contract) {
      proc.fail('transaction belongs to ' + transaction.contract + ' mockchain');
    } else {
      const normalizedTransaction = {
        id: transaction.id,
        timestamp: transaction.timestamp,
        amount: transaction.amount,
        symbol: transaction.contract === 'main' ? 'mock' : 'mock.' + transaction.contract,
        fee: transaction.fee || '0',
        'fee-symbol': transaction.contract === 'main' ? 'mock' : 'mock.' + transaction.contract,
        source: transaction.source,
        target: transaction.target,
        confirmed: 1
      };
      proc.done(normalizedTransaction);
    }
  } else {
    proc.fail('unknown transaction2');
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

  const transactionId = Number(proc.command[2]);
  if (transactionId < mockchain.length) {
    const contract = proc.command[1];
    const transaction = mockchain[transactionId];
    if (transaction.contract !== contract) {
      proc.fail('unknown transaction');
    } else {
      proc.done(transaction.message);
    }
  } else {
    proc.fail('unknown transaction');
  }
}
