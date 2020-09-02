// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - mockchain/module.js
// Module to provide a mock chain for testing

const fs = require('fs');
const Decimal = require('../../common/crypto/decimal-light.js');
const TIME_RANGE = 30; // number of time intervals before exchange history is looped
const MAX_NONYOU_ORDERS = 20; // for random order generation on the mockchange

const BLOCK_SIZE = 5; // Size of a mock "block"
// exports
exports.mine = mine;
exports.balance = balance;
exports.push = push;
exports.history = history;
exports.transaction = transaction;
exports.message = message;
exports.cron = cron;
exports.serve = serve;
exports.block = block;
exports.sample = sample;

const filePath = '../modules/mockchain/test.mockchain.json';

function getMockchain () {
  try {
    const mockchain = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
      : [{'type': 'mine', 'timestamp': 1590486950, 'contract': 'btc', 'target': 543, 'amount': 100, 'id': 0}, {'type': 'mine', 'timestamp': 1590487060, 'contract': 'btc', 'target': 543, 'amount': 100, 'id': 1}, {'source': 543, 'target': 123, 'contract': 'btc', 'amount': 10.2, 'fee': {'mock.btc': 0.01}, 'signature': 1023209792, 'message': '', 'timestamp': 1591096822, 'id': 2, 'type': 'tran'}, {'source': 543, 'target': 123, 'contract': 'btc', 'amount': 10.3, 'fee': {'mock.btc': 0.01}, 'signature': 1033209792, 'message': '', 'timestamp': 1591097334, 'id': 3, 'type': 'tran'}, {'source': 543, 'target': 123, 'contract': 'btc', 'amount': 32, 'fee': {'mock.btc': 0.01}, 'signature': 3203209792, 'message': '', 'timestamp': 1591097773, 'id': 4, 'type': 'tran'}];
    return mockchain;
  } catch (e) {
    return null;
  }
}

function mine (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) return proc.fail('This node does not support mockchain.');

  const contract = proc.command[1];
  const target = Number(proc.command[2]);
  const amount = Number(proc.command[3]);
  const timestamp = Math.round(Date.now() * 0.001);
  const newTransaction = {type: 'mine', timestamp, contract, target, amount, id: mockchain.length};

  mockchain.push(newTransaction);
  fs.writeFileSync(filePath, JSON.stringify(mockchain));

  return proc.done(newTransaction);
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
  if (mockchain === null) return proc.fail('This node does not support mockchain.');

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
  if (mockchain === null) return proc.fail('This node does not support mockchain.');

  const newTransaction = JSON.parse(proc.command[2]);
  const source = Number(newTransaction.source);
  const target = Number(newTransaction.target);
  const contract = newTransaction.contract;
  const contract_ = proc.command[1];
  if (contract_ !== contract) return proc.fail(`pushed ${contract} to ${contract_}`);

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
  if (signature !== expectedSignature) return proc.fail('illegal signature');
  else {
    // check if has sufficient base balance
    const baseBalance = getBalance(mockchain, contract, source);
    if (baseBalance < amount + baseFee) return proc.fail('insufficient ' + symbol.toUpperCase() + ' balance. Required ' + (amount + baseFee) + ', Available ' + baseBalance);
    // check if sufficient fee balances
    for (let feeSymbol in fees) {
      if (feeSymbol !== symbol) {
        const feeBalance = getBalance(mockchain, getContract(feeSymbol), source);
        const feeAmount = fees[feeSymbol];
        if (feeBalance < feeAmount) return proc.fail('insufficient ' + feeSymbol.toUpperCase() + ' balance. Required ' + feeAmount + ', Available ' + feeBalance);
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
    return proc.done(newTransaction.id);
  }
}

function history (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) return proc.fail('This node does not support mockchain.');

  const contract = proc.command[1];
  const address = Number(proc.command[2]);
  const length = (proc.command[3]);
  const offset = (proc.command[4]);

  const history = [];
  for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
    const transaction = mockchain[transactionId];
    if ((Number(transaction.target) === address || Number(transaction.source) === address) && transaction.contract === contract) {
      history.unshift(String(transactionId));
    }
  }
  if (!isNaN(offset)) history.splice(0, offset);
  if (!isNaN(length) && length < history.length) history.length = length;

  return proc.done(history);
}

function block (proc) {
  const contract = proc.command[1];
  const mockchain = getMockchain();
  const transactionIds = [];
  if (mockchain === null) return proc.fail('This node does not support mockchain.');
  for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
    const transaction = mockchain[transactionId];
    if (transaction.contract === contract) transactionIds.push(transactionId);
  }
  let blockId = proc.command[2];
  if (typeof blockId === 'undefined') blockId = Math.floor(transactionIds.length / BLOCK_SIZE);
  const transactions = transactionIds.slice(Number(blockId) * BLOCK_SIZE, 5);
  return proc.done({transactions, blockId});
}

function sample (proc) {
  const contract = proc.command[1];
  const mockchain = getMockchain();
  for (let transactionId = 0; transactionId < mockchain.length; ++transactionId) {
    const transaction = mockchain[transactionId];
    if (transaction.contract === contract) return proc.done({address: String(transaction.target || transaction.source || 123), transaction: String(transactionId)});
  }
  return proc.done({address: 123, transaction: 1});
}

function transaction (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) return proc.fail('This node does not support mockchain.');

  const contract = proc.command[1];
  const transactionId = Number(proc.command[2]);

  if (transactionId < mockchain.length) {
    const transaction = mockchain[transactionId];
    if (transaction.contract !== contract) return proc.fail('transaction belongs to ' + transaction.contract + ' mockchain');
    else {
      const normalizedTransaction = {
        id: String(transaction.id),
        timestamp: transaction.timestamp,
        amount: transaction.amount,
        symbol: transaction.contract === 'main' ? 'mock' : 'mock.' + transaction.contract,
        fee: transaction.fee || '0',
        'fee-symbol': transaction.contract === 'main' ? 'mock' : 'mock.' + transaction.contract,
        source: String(transaction.source) || 'unknown',
        target: String(transaction.target) || 'unknown',
        confirmed: 1
      };
      return proc.done(normalizedTransaction);
    }
  } else return proc.fail('unknown transaction2');
}

// message/attachment
function message (proc) {
  const mockchain = getMockchain();
  if (mockchain === null) return proc.fail('This node does not support mockchain.');

  const transactionId = Number(proc.command[2]);
  if (transactionId < mockchain.length) {
    const contract = proc.command[1];
    const transaction = mockchain[transactionId];
    if (transaction.contract !== contract) return proc.fail('unknown transaction');
    else return proc.done(transaction.message);
  } else return proc.fail('unknown transaction');
}

function resolveOrders (proc, price, pair, asks, bids) {
  for (let i = 0; i < asks.length; ++i) {
    const ask = asks[i];
    for (let j = 0; j < bids.length; ++j) {
      const bid = bids[j];
      if (ask.price <= bid.price) {
        price = bid.price;
        const amount = Math.min(ask.amount, bid.amount);
        let delta = 0;
        if (ask.account === 'you' && bid.account === 'you') delta = 0;
        else if (ask.account === 'you') delta = Number(price) * Number(amount); // TODO tx fee?
        else if (bid.account === 'you') delta = -Number(price) * Number(amount);// TODO tx fee?

        if (Number(ask.amount) === Number(bid.amount)) {
          asks.splice(i, 1);
          bids.splice(j, 1);
        } else if (Number(ask.amount) < Number(bid.amount)) {
          bid.amount = Number(bid.amount) - Number(ask.amount);
          asks.splice(i, 1);
        } else {
          ask.amount = Number(ask.amount) - Number(bid.amount);
          bids.splice(j, 1);
        }
        const [symbol, base] = pair.split('_');
        proc.logs('Sale:', amount + ' ' + symbol, '@', price + ' ' + base);
        if (delta) { // add/deduct moneys for you
          const balance = proc.peek(`local::balance[${pair}]`, 0);
          proc.poke(`local::balance[${pair}]`, Number(balance) + delta);
        }
        return resolveOrders(proc, price, pair, asks, bids);
      }
    }
  }
  return price;
}

function updatePrice (proc, price, pair, time) {
  proc.poke(`local::price[${pair}]`, price);
  proc.poke(`local::history[${pair}][${time % TIME_RANGE}]`, price);
}

function rebuildOrderBook (proc, pair, asks, bids) {
  const orderBook = {};
  for (let ask of asks) orderBook[ask.id] = ask;
  for (let bid of bids) orderBook[bid.id] = bid;
  proc.poke(`local::orderBook[${pair}]`, orderBook);
}

function randPrice (side, price) {
  // TODO improve
  if (side === 'ask') return Number(price) * (Math.random() + 0.1);
  else return Number(price) * (Math.random() * 0.9 + 0.1);
}

function createOrders (proc, pair, orders, price, asks, bids) {
  const nonYouOrders = orders.filter(order => order.account !== 'you');
  if (nonYouOrders.length > 0) { // Cancel a random order
    const orderId = nonYouOrders[Math.floor(Math.random() * nonYouOrders.length)].id;
    proc.fork(`orderCancelInternal/${orderId}`);
  }

  if (nonYouOrders.length < MAX_NONYOU_ORDERS) { // at some random orders
    const [symbol, base] = pair.split('_');
    for (let i = 0; i < 3; ++i) {
      const side = Math.random() < 0.5 ? 'ask' : 'bid';
      const amount = Math.floor(Math.random() * 20 + 1); // TODO improve
      const createPrice = randPrice(side, price);
      proc.fork(`orderCreateInternal/${side}/${symbol}/${amount}/${base}/${createPrice}/other`);
    }
  }
}

function cron (proc) {
  const time = proc.peek('local::time', -1) + 1;
  proc.poke('local::time', time);
  const orderBook = proc.peek('local::orderBook');
  for (let pair in orderBook) {
    const orders = Object.values(orderBook[pair]);

    const asks = orders
      .filter(order => order.side === 'ask')
      .sort((order1, order2) => order1.price - order2.price);

    const bids = orders
      .filter(order => order.side === 'bid')
      .sort((order1, order2) => order2.price - order1.price);
    let price = proc.peek(`local::price[${pair}]`, 1);
    price = resolveOrders(proc, price, pair, asks, bids);
    rebuildOrderBook(proc, pair, asks, bids);
    updatePrice(proc, price, pair, time);
    createOrders(proc, pair, orders, price, asks, bids);
  }
  proc.done();
}

function serve (proc) {
  const source = 'mockchain';

  const command = proc.command;
  command.shift();
  const fileName = command.length === 0
    ? 'modules/' + source + '/files/index.html'
    : 'modules/' + source + '/files/' + command.join('/');

  const mimeTypes = {
    css: 'text/css',
    ico: 'image/x-icon',
    js: 'text/javascript',
    json: 'application/json',
    svg: 'image/svg+xml',
    html: 'text/html',
    ttf: 'application/x-font-ttf',
    woff2: 'application/x-font-woff',
    eot: 'application/vnd.ms-fontobject'
  };

  const fileNameSplitByDot = fileName.split('.');
  const extension = fileNameSplitByDot[fileNameSplitByDot.length - 1];
  const mimeType = mimeTypes.hasOwnProperty(extension) ? mimeTypes[extension] : 'text/html';

  proc.mime('file:' + mimeType);
  proc.done(fileName.split('?')[0]);
}
