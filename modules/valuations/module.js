const {sanitizeSymbol} = require('./parse');

const INTERMEDIATE_SYMBOL_WHITELIST = ['BTC', 'ETH', 'USD', 'EUR'];

function unique (array) {
  const set = new Set(array);
  return [...set];
}

function copy (data) {
  return JSON.parse(JSON.stringify(data));
}

function singleHop (exchangeRates, startSymbol, history, rateMode) {
  const accumulator = {};
  if (!exchangeRates) return accumulator;
  if (exchangeRates.hasOwnProperty(startSymbol)) {
    const quotes = exchangeRates[startSymbol].quotes;
    Object.keys(quotes).forEach(intermediateSymbol => {
      const rate = quotes[intermediateSymbol][rateMode];
      accumulator[intermediateSymbol] = {
        rate: history.rate * rate.rate,
        transactionPath: history.transactionPath.concat([{exchange: rate.exchange, from: startSymbol, to: intermediateSymbol, rate: rate.rate}])
      };
    });
  }
  return accumulator;
}

function optimalTransaction (history1, history2) {
  const currencies = [...new Set(Object.keys(history1).concat(Object.keys(history2)))];

  const accumulator = {};
  currencies.forEach(symbol => {
    if (!history1.hasOwnProperty(symbol)) accumulator[symbol] = history2[symbol];
    else if (!history2.hasOwnProperty(symbol)) accumulator[symbol] = history1[symbol];
    else if (history1[symbol].rate > history2[symbol].rate) accumulator[symbol] = history1[symbol];
    else accumulator[symbol] = history2[symbol];
  });

  return accumulator;
}

function bestTransactionChain (exchangeRates, startSymbol, targetSymbol, maxHops, shortestPath, rateMode, whitelist, useWhitelist) {
  whitelist = unique(whitelist.concat([startSymbol, targetSymbol]));

  let transactionChains = {};
  transactionChains[startSymbol] = {rate: 1, transactionPath: []};
  for (let i = 0; i < maxHops; i++) {
    if (shortestPath && transactionChains.hasOwnProperty(targetSymbol)) break;

    let intermediarySymbols = unique(Object.keys(transactionChains));
    if (useWhitelist) intermediarySymbols = intermediarySymbols.filter(symbol => whitelist.includes(symbol));

    const accumulator = intermediarySymbols
      .map(symbol => singleHop(exchangeRates, symbol, transactionChains[symbol], rateMode))
      .concat(transactionChains);
    transactionChains = accumulator.reduce(optimalTransaction, {});
  }
  if (transactionChains.hasOwnProperty(targetSymbol)) return transactionChains[targetSymbol];
  else {
    const result = {rate: 1, transactionPath: []};
    result.error = 1;
    result.rate = 0;
    return result;
  }
}

function rate (proc, data) {
  let sourceSymbol = data.source.toUpperCase();
  let targetSymbol = data.target.toUpperCase();

  sourceSymbol = sanitizeSymbol(sourceSymbol);
  targetSymbol = sanitizeSymbol(targetSymbol);
  if (sourceSymbol === null) return proc.fail(`Symbol '${data.source}' is unknown.`);
  if (targetSymbol === null) return proc.fail(`Symbol '${data.target}' is unknown.`);

  const amount = data.amount === 'undefined' || typeof data.amount === 'undefined' ? 1 : Number(data.amount);
  if (isNaN(amount)) return proc.fail('Expected a numeric amount.');

  let mode = 'median_rate';
  if (data.mode === 'max') mode = 'highest_rate';
  else if (data.mode === 'min') mode = 'lowest_rate';
  else if (data.mode === 'meta') mode = 'meta';

  let r;
  if (sourceSymbol === targetSymbol && mode !== 'meta') {
    r = amount;
  } else if (mode === 'meta') {
    if (sourceSymbol.startsWith('MOCK.') && targetSymbol.startsWith('MOCK.')) {
      r = {
        min: {rate: amount, path: []},
        median: {rate: amount, path: []},
        max: {rate: amount, path: []}
      };
    } else {
      const resultLow = bestTransactionChain(data.prices, sourceSymbol, targetSymbol, 5, false, 'lowest_rate', INTERMEDIATE_SYMBOL_WHITELIST, true);
      const resultMedian = bestTransactionChain(data.prices, sourceSymbol, targetSymbol, 5, false, 'median_rate', INTERMEDIATE_SYMBOL_WHITELIST, true);
      const resultHigh = bestTransactionChain(data.prices, sourceSymbol, targetSymbol, 5, false, 'highest_rate', INTERMEDIATE_SYMBOL_WHITELIST, true);
      if (resultLow.error) return proc.fail(resultLow.error, 'Failed to compute rate');
      else {
        r = {
          min: {rate: resultLow.rate * amount, path: copy(resultLow.transactionPath)},
          median: {rate: resultMedian.rate * amount, path: copy(resultMedian.transactionPath)},
          max: {rate: resultHigh.rate * amount, path: copy(resultHigh.transactionPath)}
        };
      }
    }
  } else {
    if (amount === 0) r = 0; // shortcut
    else if (sourceSymbol.startsWith('MOCK.') && targetSymbol.startsWith('MOCK.')) r = amount;
    else {
      const result = bestTransactionChain(data.prices, sourceSymbol, targetSymbol, 5, false, mode, INTERMEDIATE_SYMBOL_WHITELIST, true);
      if (result.error) return proc.fail(result.error, 'Failed to compute rate');
      else r = result.rate * amount;
    }
  }

  return proc.done(r);
}

exports.rate = rate;
exports.parse = require('./parse').parse;
