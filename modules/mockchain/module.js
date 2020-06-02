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

function getMockchain () {
  try {
    const mockchain = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
      : [];
    return mockchain;
  } catch (e) {
    return null;
  }
}

function mine (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) {
    proc.fail('This node does not support mockchain.');
    return;
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

function getSymbol (contract) {
  return contract === 'main' ? 'mock' : 'mock.' + contract;
}

function getContract (symbol) {
  return symbol === 'mock' ? 'main' : symbol.substr(5);
}

function getBalance (mockchain, contract, address) {
  let balance = 0;
  for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
    const transaction = mockchain[transactionId];
    if (Number(transaction.target) === Number(address) && transaction.contract === contract) { balance += Number(transaction.amount); }
    if (Number(transaction.source) === Number(address)) {
      if (transaction.contract === contract) balance -= Number(transaction.amount);
      const symbol = getSymbol(contract);
      if (typeof transaction.fee === 'object' && transaction.fee !== null && transaction.fee.hasOwnProperty(symbol)) balance -= Number(transaction.fee[symbol]);
    }
  }
  return balance;
}

function balance (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) {
    proc.fail('This node does not support mockchain.');
    return;
  }

  const contract = proc.command[1];
  const address = Number(proc.command[2]);
  proc.done('' + getBalance(mockchain, contract, address));
}

const fromInt = function (input, factor) {
  const f = Number(factor);
  const x = new Decimal(String(input));
  return Number(x.times((f > 1 ? '0.' + new Array(f).join('0') : '') + '1').toFixed(factor));
};

function push (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) {
    proc.fail('This node does not support mockchain.');
    return;
  }

  const newTransaction = JSON.parse(proc.command[2]);
  const source = Number(newTransaction.source);
  const target = Number(newTransaction.target);
  const contract = newTransaction.contract;
  const contract_ = proc.command[1];
  if (contract_ !== contract) {
    proc.fail(`pushed ${contract} to ${contract_}`);
    return;
  }
  const symbol = getSymbol(contract);
  const factor = proc.peek(symbol + '::factor');

  const atomicAmount = newTransaction.amount;

  const amount = fromInt(atomicAmount, factor);

  let fees = newTransaction.fee; // "fee" or {[fee-symbol]:fee}
  if (typeof fees === 'number' || typeof fees === 'string') { // "fee" -> {[fee-symbol]:fee}
    const feeSymbol = proc.peek(symbol + '::fee-symbol');
    fees = {[feeSymbol]: fees};
  }
  let totalAtomicFee = 0;
  for (let feeSymbol in fees) {
    const feeFactor = proc.peek(feeSymbol + '::factor');
    const fee = fees[feeSymbol];
    totalAtomicFee += Number(fee);
    fees[feeSymbol] = fromInt(fee, feeFactor);
  }

  const baseFee = fees.hasOwnProperty(symbol) ? fees[symbol] : 0;

  const message = typeof newTransaction.message === 'string' ? newTransaction.message : '';
  const signature = newTransaction.signature;

  const expectedSignature = Number(source) * Number(target) + Number(atomicAmount) + totalAtomicFee * 3.14 + contract.length * 1001 + message.length * 123;
  if (signature !== expectedSignature) {
    proc.fail('illegal signature');
  } else {
    // check if has sufficient base balance
    const baseBalance = getBalance(mockchain, contract, source);
    if (baseBalance < amount + baseFee) {
      proc.fail('insufficient ' + symbol.toUpperCase() + ' balance. Required ' + (amount + baseFee) + ', Available ' + baseBalance);
      return;
    }
    // check if sufficient fee balances
    for (let feeSymbol in fees) {
      if (feeSymbol !== symbol) {
        const feeBalance = getBalance(mockchain, getContract(feeSymbol), source);
        const feeAmount = fees[feeSymbol];
        if (feeBalance < feeAmount) {
          proc.fail('insufficient ' + feeSymbol.toUpperCase() + ' balance. Required ' + feeAmount + ', Available ' + feeBalance);
          return;
        }
      }
    }

    delete newTransaction.factor;
    newTransaction.source = source;
    newTransaction.target = target;
    newTransaction.amount = Number(amount);
    newTransaction.fee = fees;
    newTransaction.timestamp = Math.round(Date.now() * 0.001);
    newTransaction.id = mockchain.length;
    newTransaction.type = 'tran';
    mockchain.push(newTransaction);
    fs.writeFileSync(filePath, JSON.stringify(mockchain));
    proc.done(newTransaction.id);
  }
}

function history (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) {
    proc.fail('This node does not support mockchain.');
    return;
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
  if (!isNaN(offset)) history.splice(0, offset);
  if (!isNaN(length) && length < history.length) history.length = length;

  proc.done(history);
}

function transaction (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) {
    proc.fail('This node does not support mockchain.');
    return;
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
  } else proc.fail('unknown transaction2');
}

// message/attachment
function message (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) {
    proc.fail('This node does not support mockchain.');
    return;
  }

  const transactionId = Number(proc.command[2]);
  if (transactionId < mockchain.length) {
    const contract = proc.command[1];
    const transaction = mockchain[transactionId];
    if (transaction.contract !== contract) proc.fail('unknown transaction');
    else proc.done(transaction.message);
  } else proc.fail('unknown transaction');
}
