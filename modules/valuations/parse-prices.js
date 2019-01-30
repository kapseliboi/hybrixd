var scheduler = require('../../lib/scheduler');

var fs = require('fs');
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

exports.parse = parse;
