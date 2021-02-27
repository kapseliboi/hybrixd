
function addQuote (accumulator, quoteCurrency, baseCurrency, price) {
  // Don't add quote if the input fails these requirements
  if (typeof quoteCurrency !== 'string' || typeof baseCurrency !== 'string' || isNaN(price)) return accumulator;
  quoteCurrency = quoteCurrency.toUpperCase();
  baseCurrency = baseCurrency.toUpperCase();
  if (quoteCurrency === baseCurrency || price === 0 || !isFinite(price)) return accumulator;

  if (!accumulator.hasOwnProperty(quoteCurrency)) accumulator[quoteCurrency] = {quotes: {}};

  accumulator[quoteCurrency].quotes[baseCurrency] = price;
  return accumulator;
}

function addBiQuote (accumulator, quoteCurrency, baseCurrency, price) {
  addQuote(accumulator, quoteCurrency, baseCurrency, price);
  addQuote(accumulator, baseCurrency, quoteCurrency, 1 / price);
}

function parseCoinmarketcap (obj) {
  const name = 'coinmarketcap';
  const quoteAccumulator = {};
  if (typeof obj !== 'object' || obj === null || !obj.hasOwnProperty('data')) return {name, quotes: quoteAccumulator};

  Object.keys(obj.data).forEach(function (key, index) {
    const price = obj.data[key].quotes.USD.price;
    const quoteCurrency = obj.data[key].symbol;

    addBiQuote(quoteAccumulator, 'USD', quoteCurrency, 1 / price);
  });
  return {name: name, quotes: quoteAccumulator};
}

function parseBiki (obj) {
  // {"code":"0","msg":"suc","data":{"amount":"50834.305317","high":"3.4206","vol":"15804.03","last":3.2491000000000000,"low":"3.02","buy":3.0899,"sell":3.2734,"rose":"0.0338233422","time":1590480524000},"message":null}
  const name = 'biki';
  const quoteAccumulator = {};
  if (typeof obj === 'object' && obj !== null && (obj.code === 0 || obj.code === '0')) {
    const price = (Number(obj.data.high) + Number(obj.data.low) + Number(obj.data.buy) + Number(obj.data.sell)) * 0.25; // average over all available data
    addBiQuote(quoteAccumulator, 'HY', 'USD', price);
  }
  return {name, quotes: quoteAccumulator};
}

function parseCoinbase (obj) {
  const name = 'coinbase';
  const quoteAccumulator = {};
  if (typeof obj !== 'object' || obj === null) return {name, quotes: quoteAccumulator};
  Object.keys(obj.data.rates).forEach(function (key, index) {
    const price = parseFloat(obj.data.rates[key]);
    addBiQuote(quoteAccumulator, 'USD', key, price);
  });
  return {name: name, quotes: quoteAccumulator};
}

function parseBinance (obj) {
  const name = 'binance';
  const baseCurrencies = [
    'BTC', 'ETH', 'BNB', 'TRX',
    'USDT', 'USDC', 'BUSD', 'DAI',
    'EUR', 'AUD', 'GBP', 'RUB', 'VAI', 'TRY', 'BRL', 'BIDR', 'PAX'
  ];
  const quoteAccumulator = {};
  if (typeof obj !== 'object' || obj === null) return {name, quotes: quoteAccumulator};

  Object.keys(obj).forEach(function (key, index) {
    const symbolPair = obj[key].symbol;
    const baseCurrency = baseCurrencies.find(function (currency) { return symbolPair.endsWith(currency); });
    if (baseCurrency) {
      const quoteCurrency = symbolPair.slice(0, symbolPair.length - baseCurrency.length);
      const price = parseFloat(obj[key].price);

      addBiQuote(quoteAccumulator, quoteCurrency, baseCurrency, price);
    }
  });
  return {name: name, quotes: quoteAccumulator};
}

// if symbol = 'BLA' and hybrix symbol BLA does not exists but ETH.BLA does, then use that
function sanitizeSymbol (symbol, symbols) {
  const lSymbol = symbol.toLowerCase();
  if (symbols.includes(lSymbol)) return symbol.toUpperCase(); // 'BLA' exists
  for (const hybrixSymbol of symbols) {
    if (hybrixSymbol.endsWith('.' + lSymbol)) return hybrixSymbol.toUpperCase(); // return 'ETH.BLA'
  }
  if ([
    'usd','usdt','tusd','dai',
    'eur','eurs',
    'aud','cad','gpb','jpy','rub','zar'
  ].includes(lSymbol)) return symbol.toUpperCase(); // white list currencies
  return null; // no matching symbol found
}

function parseHitbtc (priceObjects, symbolObjects, symbols) {
  const name = 'hitbtc';
  const quotes = {};
  if (!(priceObjects instanceof Array) || !(symbolObjects instanceof Array)) return {name, quotes};

  /*
priceObjects [
  {
    id: 'BRDETH',
    baseCurrency: 'BRD',
    quoteCurrency: 'ETH',
    quantityIncrement: '0.1',
    tickSize: '0.00000001',
    takeLiquidityRate: '0.0025',
    provideLiquidityRate: '0.001',
    feeCurrency: 'ETH'
  }, ...
  symbolObjects [
    {
      symbol: 'VEOBTC',
      ask: '0.001519',
      bid: '0.001300',
      last: '0.001398',
      low: '0.001398',
      high: '0.001400',
      open: '0.001516',
      volume: '0.267',
      volumeQuote: '0.000373268',
      timestamp: '2021-02-24T08:55:00.001Z'
    }, ...
 */
  const symbolObjectsByPair = {};
  symbolObjects.forEach(symbolObject => { symbolObjectsByPair[symbolObject.symbol] = symbolObject; });
  const priceObjectsByPair = {};
  priceObjects.forEach(priceObject => { priceObjectsByPair[priceObject.id] = priceObject; });
  for (const pair in priceObjectsByPair) {
    const priceObject = priceObjectsByPair[pair];
    if (symbolObjectsByPair.hasOwnProperty(pair)) {
      const symbolObject = symbolObjectsByPair[pair];
      const baseCurrency = sanitizeSymbol(priceObject.baseCurrency, symbols);
      const quoteCurrency = sanitizeSymbol(priceObject.quoteCurrency, symbols);
      if (quoteCurrency && baseCurrency) { // only if symbols are known in hybrix
        const price = (parseFloat(symbolObject.bid) + parseFloat(symbolObject.ask)) * 0.5;
        addBiQuote(quotes, baseCurrency, quoteCurrency, price);
      }
    }
  }
  return {name, quotes};
}

function parseDefault (data, name) {
  // baseCurrencies are included in the downloaded data
  const quoteAccumulator = {};
  if (!(data instanceof Array)) return {name, quotes: quoteAccumulator};
  for (const pair of data) addBiQuote(quoteAccumulator, pair.from, pair.to, Number(pair.price));
  return {name: name, quotes: quoteAccumulator};
}

function combineQuoteSources (sources) {
  const combinedQuotes = sources.reduce(function (accumulatedSources, newSource) {
    const newQuotes = newSource.quotes;
    Object.keys(newQuotes).forEach(function (quoteCurrency, index) {
      if (!accumulatedSources.hasOwnProperty(quoteCurrency)) {
        accumulatedSources[quoteCurrency] = {quotes: {}};
      }
      Object.keys(newQuotes[quoteCurrency].quotes).forEach(function (baseCurrency, index) {
        if (!accumulatedSources[quoteCurrency].quotes.hasOwnProperty(baseCurrency)) {
          accumulatedSources[quoteCurrency].quotes[baseCurrency] = {sources: {}};
        }
        accumulatedSources[quoteCurrency].quotes[baseCurrency].sources[newSource.name] = newQuotes[quoteCurrency].quotes[baseCurrency];
      });
    });
    return accumulatedSources;
  }, {});

  return combinedQuotes;
}

function updateMinAndMedians (exchangeRates) {
  Object.keys(exchangeRates).forEach(function (sourceCurrency, _) {
    const quotes = exchangeRates[sourceCurrency].quotes;
    Object.keys(quotes).forEach(function (targetCurrency, _) {
      const exchanges = quotes[targetCurrency].sources;
      const sortedExchanges = Object.keys(exchanges).sort(function (exchange1, exchange2) {
        return exchanges[exchange2] - exchanges[exchange1];
      });

      exchangeRates[sourceCurrency].quotes[targetCurrency].highest_rate = {exchange: sortedExchanges[0], rate: exchanges[sortedExchanges[0]]};
      const lowPoint = sortedExchanges.length - 1;
      exchangeRates[sourceCurrency].quotes[targetCurrency].lowest_rate = {exchange: sortedExchanges[lowPoint], rate: exchanges[sortedExchanges[lowPoint]]};
      const midPoint = (sortedExchanges.length - 1) / 2;
      const floorExchange = sortedExchanges[Math.floor(midPoint)];
      const ceilExchange = sortedExchanges[Math.ceil(midPoint)];

      const exchange = floorExchange === ceilExchange ? ceilExchange : (floorExchange + '|' + ceilExchange);

      exchangeRates[sourceCurrency].quotes[targetCurrency].median_rate = {
        exchange,
        rate: (Number(exchanges[floorExchange]) + Number(exchanges[ceilExchange])) / 2
      };
    });
  });
  return exchangeRates;
}

function parse (proc, data) {
  const sourcesOut = combineQuoteSources([
    parseDefault(data.EUCentralBank, 'EUCentralBank'),
    parseHitbtc(data.hitbtc_symbols, data.hitbtc_prices, data.symbols),
    parseBinance(data.binance),
    parseCoinmarketcap(data.coinmarketcap),
    parseCoinbase(data.coinbase),
    parseBiki(data.biki_hyusdt),
    parseDefault(data.uni_swap, 'uni_swap'),
    parseDefault(data.tomo_dex, 'tomo_dex')
  ]);
  const result = updateMinAndMedians(sourcesOut);
  //  store hy volume
  if (typeof data.biki_hyusdt === 'object' && (data.biki_hyusdt.code === 0 || data.biki_hyusdt.code === '0')) {
    const hyVolume = data.biki_hyusdt.data.vol;
    proc.poke('local::hy-volume', hyVolume);
  }
  const symbols = [];
  for (const symbol1 in result) {
    if (!symbols.includes(symbol1)) symbols.push(symbol1);
    for (const symbol2 in result[symbol1].quotes) {
      if (!symbols.includes(symbol2)) symbols.push(symbol2);
    }
  }
  proc.poke('local::symbols', symbols);

  proc.done(result);
}

exports.parse = parse;
