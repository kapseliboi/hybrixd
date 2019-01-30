function singleHop (exchangeRates, startSymbol, history, rate_mode) {
  var accumulator = {};
  if (exchangeRates.hasOwnProperty(startSymbol)) {
    var quotes = exchangeRates[startSymbol]['quotes'];
    Object.keys(quotes).map(function (intermediateCurrency, _) {
      var rate = quotes[intermediateCurrency][rate_mode];
      accumulator[intermediateCurrency] = {rate: history.rate * rate['rate'],
        transactionPath: history['transactionPath'].concat([{exchange: rate['exchange'], to: intermediateCurrency}])};
    });
  }
  return accumulator;
}

function optimalTransaction (history1, history2) {
  var currencies = [...new Set(Object.keys(history1).concat(Object.keys(history2)))];

  var accumulator = {};
  currencies.map(function (currency, _) {
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

function bestTransactionChain (exchangeRates, startSymbol, targetSymbol, maxHops, shortestPath, rate_mode, whitelist, useWhitelist) {
  var emptyHistory = {rate: 1, transactionPath: []};

  whitelist = new Set(whitelist.concat([startSymbol, targetSymbol]));

  var transactionChains = {};
  transactionChains[startSymbol] = emptyHistory;
  for (var i = 0; i < maxHops; i++) {
    if (shortestPath && transactionChains.hasOwnProperty(targetSymbol)) {
      break;
    }
    var intermediarySymbols = Object.keys(transactionChains);
    if (useWhitelist) {
      intermediarySymbols = Array.from(new Set([...intermediarySymbols].filter(i => whitelist.has(i))));
    }
    var accumulator = intermediarySymbols.map(function (currency, _) {
      return singleHop(exchangeRates, currency, transactionChains[currency], rate_mode);
    }).concat(transactionChains);
    transactionChains = accumulator.reduce(function (history1, history2) { return optimalTransaction(history1, history2); });
  }

  if (transactionChains.hasOwnProperty(targetSymbol)) {
    return transactionChains[targetSymbol];
  } else {
    var result = emptyHistory;
    result.error = 1;
    result.rate = 0;
    return result;
  }
}

function valuate (quotes, source, target) {
  source = source.toUpperCase();
  target = target.toUpperCase();
  var rate_mode = 'median_rate';
  var whitelist = ['BTC', 'ETH', 'USD', 'EUR'];
  return bestTransactionChain(quotes, source, target, 5, true, rate_mode, whitelist, true);
}
exports.valuate = valuate;
