var scheduler = require('../../lib/scheduler');
var xmldoc = require('xmldoc');

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
  var name = 'EUCentralBank';

  var xmlElements;
  try {
    var document = new xmldoc.XmlDocument(xmlString);
    xmlElements = document.children[5].children[1].children.filter(node => node.constructor.name === 'XmlElement');
  } catch (e) {
    return {name: name, quotes: {}};
  }
  var quote_accumulator = {};
  xmlElements.map(function (key, index) {
    var price = key.attr.rate;
    var quote_currency = key.attr.currency;

    quote_accumulator = addQuote(quote_accumulator, 'EUR', quote_currency, price);
    quote_accumulator = addQuote(quote_accumulator, quote_currency, 'EUR', 1 / price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseCoinmarketcap (obj) {
  var name = 'coinmarketcap';
  var quote_accumulator = {};
  if (!obj) {
    return {name, quotes: quote_accumulator};
  }
  Object.keys(obj.data).map(function (key, index) {
    var price = obj.data[key].quotes.USD.price;
    var quote_currency = obj.data[key].symbol;

    quote_accumulator = addQuote(quote_accumulator, 'USD', quote_currency, 1 / price);
    quote_accumulator = addQuote(quote_accumulator, quote_currency, 'USD', price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseCoinbase (obj) {
  var name = 'coinbase';
  var quote_accumulator = {};
  if (!obj) {
    return {name, quotes: quote_accumulator};
  }

  Object.keys(obj.data.rates).map(function (key, index) {
    var price = parseFloat(obj.data.rates[key]);

    quote_accumulator = addQuote(quote_accumulator, 'USD', key, price);
    quote_accumulator = addQuote(quote_accumulator, key, 'USD', 1 / price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseBinance (obj) {
  var name = 'binance';
  var baseCurrencies = ['BTC', 'ETH', 'USDT', 'BNB'];
  var quote_accumulator = {};
  if (!obj) {
    return {name, quotes: quote_accumulator};
  }
  Object.keys(obj).map(function (key, index) {
    var symbolPair = obj[key].symbol;

    var base_currency = baseCurrencies.find(function (currency) { return symbolPair.endsWith(currency); });
    if (base_currency) {
      var quote_currency = symbolPair.slice(0, symbolPair.length - base_currency.length);
      var price = parseFloat(obj[key].price);

      quote_accumulator = addQuote(quote_accumulator, quote_currency, base_currency, price);
      quote_accumulator = addQuote(quote_accumulator, base_currency, quote_currency, 1 / price);
    }
  });
  return {name: name, quotes: quote_accumulator};
}

function parseHitbtc (prices, symbols) {
  var name = 'hitbtc';
  var quote_accumulator = {};
  if (!prices || !symbols) {
    return {name, quotes: quote_accumulator};
  }

  var symbols_obj = {};
  symbols.map(function (key, index) {
    symbols_obj[key.id] = key;
  });

  prices.map(function (key, index) {
    var exchange_symbol = symbols_obj[key['symbol']];

    var base_currency = exchange_symbol['baseCurrency'];
    var quote_currency = exchange_symbol['quoteCurrency'];
    var price = parseFloat(key.last);

    quote_accumulator = addQuote(quote_accumulator, base_currency, quote_currency, price);
    quote_accumulator = addQuote(quote_accumulator, quote_currency, base_currency, 1 / price);
  });
  return {name: name, quotes: quote_accumulator};
}

function combineQuoteSources (sources) {
  combinedQuotes = sources.reduce(function (accumulatedSources, newSource) {
    newQuotes = newSource['quotes'];
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
    quotes = exchangeRates[sourceCurrency]['quotes'];
    Object.keys(quotes).map(function (targetCurrency, _) {
      exchanges = quotes[targetCurrency]['sources'];
      sortedExchanges = Object.keys(exchanges).sort(function (exchange1, exchange2) {
        return exchanges[exchange2] - exchanges[exchange1];
      });
      exchangeRates[sourceCurrency]['quotes'][targetCurrency]['highest_rate'] = {'exchange': sortedExchanges[0], rate: exchanges[sortedExchanges[0]]};

      midPoint = (sortedExchanges.length - 1) / 2;
      exchangeRates[sourceCurrency]['quotes'][targetCurrency]['median_rate'] = {'exchange': '',
        'rate': (exchanges[sortedExchanges[Math.floor(midPoint)]] + exchanges[sortedExchanges[Math.ceil(midPoint)]]) / 2};
    });
  });
  return exchangeRates;
}

function parse (data) {
  var processID = data.processID;
  var sourcesOut = combineQuoteSources([
    parseEUCentralBank(data.EUCentralBank),
    parseHitbtc(data.hitbtc_symbols, data.hitbtc_prices),
    parseBinance(data.binance),
    parseCoinmarketcap(data.coinmarketcap),
    parseCoinbase(data.coinbase)
  ]);
  var result = updateMinAndMedians(sourcesOut);

  scheduler.pass(processID, 0, result);
}

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

function valuate (data) {
  var processID = data.processID;

  var source = data.source.toUpperCase();
  var target = data.target.toUpperCase();
  var amount = typeof data.amount === 'undefined' ? 1 : Number(data.amount);

  var rate_mode = 'median_rate';
  var whitelist = ['BTC', 'ETH', 'USD', 'EUR'];
  var result = bestTransactionChain(data.prices, source, target, 5, true, rate_mode, whitelist, true);
  if (result.error) {
    scheduler.pass(processID, result.error, 'Failed to compute rate');
  } else {
    var r = result.rate * amount;
    scheduler.pass(processID, 0, r);
  }
}

exports.valuate = valuate;
exports.parse = parse;
