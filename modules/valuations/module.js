let xmldoc = require('xmldoc');

function addQuote (accumulator, quote_currency, base_currency, price) {
  // Don't add quote if the input fails these requirements
  if (quote_currency === base_currency || price === 0 || !isFinite(price)) {
    return accumulator;
  }

  if (!accumulator.hasOwnProperty(quote_currency)) {
    accumulator[quote_currency] = {quotes: {}};
  }
  accumulator[quote_currency]['quotes'][base_currency] = price;
  return accumulator;
}

function parseEUCentralBank (xmlString) {
  let name = 'EUCentralBank';

  let xmlElements;
  try {
    let document = new xmldoc.XmlDocument(xmlString);
    xmlElements = document.children[5].children[1].children.filter(node => node.constructor.name === 'XmlElement');
  } catch (e) {
    return {name: name, quotes: {}};
  }
  let quote_accumulator = {};
  xmlElements.map(function (key, index) {
    let price = key.attr.rate;
    let quote_currency = key.attr.currency;

    quote_accumulator = addQuote(quote_accumulator, 'EUR', quote_currency, price);
    quote_accumulator = addQuote(quote_accumulator, quote_currency, 'EUR', 1 / price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseCoinmarketcap (obj) {
  let name = 'coinmarketcap';
  let quote_accumulator = {};
  if (!obj) {
    return {name, quotes: quote_accumulator};
  }
  Object.keys(obj.data).map(function (key, index) {
    let price = obj.data[key].quotes.USD.price;
    let quote_currency = obj.data[key].symbol;

    quote_accumulator = addQuote(quote_accumulator, 'USD', quote_currency, 1 / price);
    quote_accumulator = addQuote(quote_accumulator, quote_currency, 'USD', price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseCoinbase (obj) {
  let name = 'coinbase';
  let quote_accumulator = {};
  if (!obj) {
    return {name, quotes: quote_accumulator};
  }

  Object.keys(obj.data.rates).map(function (key, index) {
    let price = parseFloat(obj.data.rates[key]);

    quote_accumulator = addQuote(quote_accumulator, 'USD', key, price);
    quote_accumulator = addQuote(quote_accumulator, key, 'USD', 1 / price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseBinance (obj) {
  let name = 'binance';
  let baseCurrencies = ['BTC', 'ETH', 'USDT', 'BNB'];
  let quote_accumulator = {};
  if (!obj) {
    return {name, quotes: quote_accumulator};
  }
  Object.keys(obj).map(function (key, index) {
    let symbolPair = obj[key].symbol;

    let base_currency = baseCurrencies.find(function (currency) { return symbolPair.endsWith(currency); });
    if (base_currency) {
      let quote_currency = symbolPair.slice(0, symbolPair.length - base_currency.length);
      let price = parseFloat(obj[key].price);

      quote_accumulator = addQuote(quote_accumulator, quote_currency, base_currency, price);
      quote_accumulator = addQuote(quote_accumulator, base_currency, quote_currency, 1 / price);
    }
  });
  return {name: name, quotes: quote_accumulator};
}

function parseHitbtc (prices, symbols) {
  let name = 'hitbtc';
  let quote_accumulator = {};
  if (!prices || !symbols) {
    return {name, quotes: quote_accumulator};
  }

  let symbols_obj = {};
  symbols.map(function (key, index) {
    symbols_obj[key.id] = key;
  });

  prices.map(function (key, index) {
    let exchange_symbol = symbols_obj[key['symbol']];

    let base_currency = exchange_symbol['baseCurrency'];
    let quote_currency = exchange_symbol['quoteCurrency'];
    let price = parseFloat(key.last);

    quote_accumulator = addQuote(quote_accumulator, base_currency, quote_currency, price);
    quote_accumulator = addQuote(quote_accumulator, quote_currency, base_currency, 1 / price);
  });
  return {name: name, quotes: quote_accumulator};
}

function combineQuoteSources (sources) {
  let combinedQuotes = sources.reduce(function (accumulatedSources, newSource) {
    let newQuotes = newSource['quotes'];
    Object.keys(newQuotes).map(function (quoteCurrency, index) {
      if (!accumulatedSources.hasOwnProperty(quoteCurrency)) {
        accumulatedSources[quoteCurrency] = {quotes: {}};
      }
      Object.keys(newQuotes[quoteCurrency]['quotes']).map(function (baseCurrency, index) {
        if (!accumulatedSources[quoteCurrency]['quotes'].hasOwnProperty(baseCurrency)) {
          accumulatedSources[quoteCurrency]['quotes'][baseCurrency] = {sources: {}};
        }
        accumulatedSources[quoteCurrency]['quotes'][baseCurrency]['sources'][newSource['name']] = newQuotes[quoteCurrency]['quotes'][baseCurrency];
      });
    });
    return accumulatedSources;
  }, {});

  return combinedQuotes;
}

function updateMinAndMedians (exchangeRates) {
  Object.keys(exchangeRates).map(function (sourceCurrency, _) {
    let quotes = exchangeRates[sourceCurrency]['quotes'];
    Object.keys(quotes).map(function (targetCurrency, _) {
      let exchanges = quotes[targetCurrency]['sources'];
      let sortedExchanges = Object.keys(exchanges).sort(function (exchange1, exchange2) {
        return exchanges[exchange2] - exchanges[exchange1];
      });

      exchangeRates[sourceCurrency]['quotes'][targetCurrency]['highest_rate'] = {'exchange': sortedExchanges[0], rate: exchanges[sortedExchanges[0]]};
      let lowPoint = sortedExchanges.length - 1;
      exchangeRates[sourceCurrency]['quotes'][targetCurrency]['lowest_rate'] = {'exchange': sortedExchanges[lowPoint], rate: exchanges[sortedExchanges[lowPoint]]};
      let midPoint = (sortedExchanges.length - 1) / 2;
      let floorExchange = sortedExchanges[Math.floor(midPoint)];
      let ceilExchange = sortedExchanges[Math.ceil(midPoint)];
      let exchange = floorExchange === ceilExchange ? ceilExchange : (floorExchange + '|' + ceilExchange);
      exchangeRates[sourceCurrency]['quotes'][targetCurrency]['median_rate'] = {exchange,
        rate: (exchanges[floorExchange] + exchanges[ceilExchange]) / 2};
    });
  });
  return exchangeRates;
}

function parse (proc, data) {
  let sourcesOut = combineQuoteSources([
    parseEUCentralBank(data.EUCentralBank),
    parseHitbtc(data.hitbtc_symbols, data.hitbtc_prices),
    parseBinance(data.binance),
    parseCoinmarketcap(data.coinmarketcap),
    parseCoinbase(data.coinbase)
  ]);
  let result = updateMinAndMedians(sourcesOut);

  proc.done(result);
}

function singleHop (exchangeRates, startSymbol, history, rate_mode) {
  let accumulator = {};
  if (exchangeRates.hasOwnProperty(startSymbol)) {
    let quotes = exchangeRates[startSymbol]['quotes'];
    Object.keys(quotes).map(function (intermediateCurrency, _) {
      let rate = quotes[intermediateCurrency][rate_mode];
      accumulator[intermediateCurrency] = {rate: history.rate * rate['rate'],
        transactionPath: history['transactionPath'].concat([{exchange: rate['exchange'], to: intermediateCurrency}])};
    });
  }
  return accumulator;
}

function optimalTransaction (history1, history2) {
  let currencies = [...new Set(Object.keys(history1).concat(Object.keys(history2)))];

  let accumulator = {};
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
  let emptyHistory = {rate: 1, transactionPath: []};

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
      return singleHop(exchangeRates, currency, transactionChains[currency], rate_mode);
    }).concat(transactionChains);
    transactionChains = accumulator.reduce(function (history1, history2) { return optimalTransaction(history1, history2); });
  }
  if (transactionChains.hasOwnProperty(targetSymbol)) {
    return transactionChains[targetSymbol];
  } else {
    let result = emptyHistory;
    result.error = 1;
    result.rate = 0;
    return result;
  }
}

function valuate (proc, data) {
  let source = data.source.toUpperCase();
  let target = data.target.toUpperCase();
  let amount = data.amount === 'undefined' || typeof data.amount === 'undefined' ? 1 : Number(data.amount);
  let mode = 'median_rate';
  if (data.mode === 'max') {
    mode = 'highest_rate';
  } else if (data.mode === 'min') {
    mode = 'lowest_rate';
  } else if (data.mode === 'meta') {
    mode = 'meta';
  }

  let whitelist = ['BTC', 'ETH', 'USD', 'EUR'];
  let r;
  if (mode === 'meta') {
    let resultLow = bestTransactionChain(data.prices, source, target, 5, true, 'lowest_rate', whitelist, true);
    let resultMedian = bestTransactionChain(data.prices, source, target, 5, true, 'median_rate', whitelist, true);
    let resultHigh = bestTransactionChain(data.prices, source, target, 5, true, 'highest_rate', whitelist, true);

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
    let result = bestTransactionChain(data.prices, source, target, 5, true, mode, whitelist, true);
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
exports.parse = parse;
