function singleHop (exchangeRates, startSymbol, history, rateMode) {
  const accumulator = {};
  if (!exchangeRates) return accumulator;
  if (exchangeRates.hasOwnProperty(startSymbol)) {
    const quotes = exchangeRates[startSymbol]['quotes'];
    Object.keys(quotes).map(function (intermediateCurrency) {
      const rate = quotes[intermediateCurrency][rateMode];
      accumulator[intermediateCurrency] = {rate: history.rate * rate['rate'],
        transactionPath: history['transactionPath'].concat([{exchange: rate['exchange'], to: intermediateCurrency}])};
    });
  }
  return accumulator;
}

function optimalTransaction (history1, history2) {
  const currencies = [...new Set(Object.keys(history1).concat(Object.keys(history2)))];

  const accumulator = {};
  currencies.map(function (currency) {
    if (!history1.hasOwnProperty(currency)) {
      accumulator[currency] = history2[currency];
    } else if (!history2.hasOwnProperty(currency)) {
      accumulator[currency] = history1[currency];
    } else if (history1[currency].rate > history2[currency].rate) {
      accumulator[currency] = history1[currency];
    } else {
      accumulator[currency] = history2[currency];
    }
  });

  return accumulator;
}

function bestTransactionChain (exchangeRates, startSymbol, targetSymbol, maxHops, shortestPath, rateMode, whitelist, useWhitelist) {
  const emptyHistory = {rate: 1, transactionPath: []};

  whitelist = new Set(whitelist.concat([startSymbol, targetSymbol]));

  let transactionChains = {};
  transactionChains[startSymbol] = emptyHistory;
  for (let i = 0; i < maxHops; i++) {
    if (shortestPath && transactionChains.hasOwnProperty(targetSymbol)) {
      break;
    }
    let intermediarySymbols = Object.keys(transactionChains);
    if (useWhitelist) {
      intermediarySymbols = Array.from(new Set([...intermediarySymbols].filter(i => whitelist.has(i))));
    }
    let accumulator = intermediarySymbols.map(function (currency, _) {
      return singleHop(exchangeRates, currency, transactionChains[currency], rateMode);
    }).concat(transactionChains);
    transactionChains = accumulator.reduce(function (history1, history2) { return optimalTransaction(history1, history2); }, {});
  }
  if (transactionChains.hasOwnProperty(targetSymbol)) {
    return transactionChains[targetSymbol];
  } else {
    const result = emptyHistory;
    result.error = 1;
    result.rate = 0;
    return result;
  }
}

function valuate (proc, data) {
  let source = data.source.toUpperCase();
  let target = data.target.toUpperCase();

  // TODO fix hardcoded override for HY unified asset market
  if (source.split('.')[1] === 'HY') { source = 'HY'; }
  if (target.split('.')[1] === 'HY') { target = 'HY'; }

  const amount = data.amount === 'undefined' || typeof data.amount === 'undefined' ? 1 : Number(data.amount);
  let mode = 'median_rate';
  if (data.mode === 'max') {
    mode = 'highest_rate';
  } else if (data.mode === 'min') {
    mode = 'lowest_rate';
  } else if (data.mode === 'meta') {
    mode = 'meta';
  }

  const whitelist = ['BTC', 'ETH', 'USD', 'EUR'];
  let r;
  if (mode === 'meta') {
    const resultLow = bestTransactionChain(data.prices, source, target, 5, true, 'lowest_rate', whitelist, true);
    const resultMedian = bestTransactionChain(data.prices, source, target, 5, true, 'median_rate', whitelist, true);
    const resultHigh = bestTransactionChain(data.prices, source, target, 5, true, 'highest_rate', whitelist, true);

    if (resultLow.error) {
      proc.fail(resultLow.error, 'Failed to compute rate');
    } else {
      r = {
        min: {rate: resultLow.rate * amount, path: JSON.parse(JSON.stringify(resultLow.transactionPath))},
        median: {rate: resultMedian.rate * amount, path: JSON.parse(JSON.stringify(resultMedian.transactionPath))},
        max: {rate: resultHigh.rate * amount, path: JSON.parse(JSON.stringify(resultHigh.transactionPath))}
      };
    }
  } else {
    const result = bestTransactionChain(data.prices, source, target, 5, true, mode, whitelist, true);
    if (result.error) {
      proc.fail(result.error, 'Failed to compute rate');
      return;
    } else {
      r = result.rate * amount;
    }
  }
  proc.done(r);
}

exports.valuate = valuate;
exports.parse = require('./parse').parse;
