// if symbol = 'BLA' and hybrix symbol BLA does not exists but ETH.BLA does, then use that
function sanitizeSymbol (symbol, symbols) {
  const lSymbol = symbol.toLowerCase();
  if (symbols.includes(lSymbol)) return symbol.toUpperCase(); // 'BLA' exists
  for (const hybrixSymbol of symbols) {
    if (hybrixSymbol.endsWith('.' + lSymbol)) return hybrixSymbol.toUpperCase(); // return 'ETH.BLA'
  }
  if ([
    'usd', 'usdt', 'tusd', 'dai',
    'eur', 'eurs',
    'aud', 'cad', 'gpb', 'jpy', 'rub', 'zar'
  ].includes(lSymbol)) return symbol.toUpperCase(); // white list currencies
  return null; // no matching symbol found
}

function addQuote (quotes, sourceSymbol, targetSymbol, price) {
  // Don't add quote if the input fails these requirements
  if (typeof sourceSymbol !== 'string' || typeof targetSymbol !== 'string' || isNaN(price)) return quotes;
  sourceSymbol = sourceSymbol.toUpperCase();
  targetSymbol = targetSymbol.toUpperCase();
  if (sourceSymbol === targetSymbol || price === 0 || !isFinite(price)) return quotes;

  if (!quotes.hasOwnProperty(sourceSymbol)) quotes[sourceSymbol] = {quotes: {}};

  quotes[sourceSymbol].quotes[targetSymbol] = price;
  return quotes;
}

function addBiQuote (quotes, sourceSymbol, targetSymbol, price) {
  addQuote(quotes, sourceSymbol, targetSymbol, price);
  addQuote(quotes, targetSymbol, sourceSymbol, 1 / price);
}

function parseCoinmarketcap (obj) {
  const name = 'coinmarketcap';
  const quotes = {};
  if (typeof obj !== 'object' || obj === null || !obj.hasOwnProperty('data')) return {name, quotes};

  Object.keys(obj.data).forEach(function (key, index) {
    const price = obj.data[key].quotes.USD.price;
    const targetSymbol = obj.data[key].symbol;

    addBiQuote(quotes, 'USD', targetSymbol, 1 / price);
  });
  return {name: name, quotes};
}

function parseBiki (obj) {
  // {"code":"0","msg":"suc","data":{"amount":"50834.305317","high":"3.4206","vol":"15804.03","last":3.2491000000000000,"low":"3.02","buy":3.0899,"sell":3.2734,"rose":"0.0338233422","time":1590480524000},"message":null}
  const name = 'biki';
  const quotes = {};
  if (typeof obj === 'object' && obj !== null && (obj.code === 0 || obj.code === '0')) {
    const price = (Number(obj.data.high) + Number(obj.data.low) + Number(obj.data.buy) + Number(obj.data.sell)) * 0.25; // average over all available data
    addBiQuote(quotes, 'HY', 'USD', price);
  }
  return {name, quotes};
}

function parseCoinbase (obj) {
  const name = 'coinbase';
  const quotes = {};
  if (typeof obj !== 'object' || obj === null || typeof obj.data !== 'object' || obj.data === null) return {name, quotes};

  Object.keys(obj.data.rates).forEach(targetSymbol => {
    const price = parseFloat(obj.data.rates[targetSymbol]);
    addBiQuote(quotes, 'USD', targetSymbol, price);
  });
  return {name, quotes};
}

function parseBinance (obj) {
  const name = 'binance';
  const baseCurrencies = [
    'BTC', 'ETH', 'BNB', 'TRX',
    'USDT', 'USDC', 'BUSD', 'DAI',
    'EUR', 'AUD', 'GBP', 'RUB', 'VAI', 'TRY', 'BRL', 'BIDR', 'PAX'
  ];
  const quotes = {};
  if (typeof obj !== 'object' || obj === null) return {name, quotes};

  Object.keys(obj).forEach(key => {
    const symbolPair = obj[key].symbol;
    const targetSymbol = baseCurrencies.find(currency => symbolPair.endsWith(currency));
    if (targetSymbol) {
      const sourceSymbol = symbolPair.slice(0, symbolPair.length - targetSymbol.length);
      const price = parseFloat(obj[key].price);
      addBiQuote(quotes, sourceSymbol, targetSymbol, price);
    }
  });
  return {name, quotes};
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
  const quotes = {};
  if (!(data instanceof Array)) return {name, quotes};
  for (const pair of data) addBiQuote(quotes, pair.from, pair.to, Number(pair.price));
  return {name, quotes};
}

/*
exchangeRates =  {
[sourceCurrency]: {
 quotes: {
   [targetCurrency]: {
     sources,
     highest_rate  {exchange, rate},
     lowest_rate: {exchange, rate},
     median_rate: {exchange, rate}
     }
   }
 }
}

sources = [{name, quotes},...]
 */
function addUpdatedExchangeRates (proc, exchangeRates, sources) {
  for (const source of sources) { // source = {name, quotes}
    try {
      const name = source.name;
      for (const sourceSymbol in source.quotes) {
        if (!exchangeRates.hasOwnProperty(sourceSymbol)) exchangeRates[sourceSymbol] = {quotes: {}};
        const newQuotes = source.quotes[sourceSymbol].quotes;
        for (const targetSymbol in newQuotes) {
          if (!exchangeRates[sourceSymbol].quotes.hasOwnProperty(targetSymbol)) exchangeRates[sourceSymbol].quotes[targetSymbol] = {sources: {}};
          exchangeRates[sourceSymbol].quotes[targetSymbol].sources[name] = newQuotes[targetSymbol];
        }
      }
    } catch (error) {
      const name = typeof source === 'object' && source !== null ? source.name : 'unknown';
      proc.logs(`Failed to add source ${name} : ${error}`);
    }
  }
  return exchangeRates;
}

/* IN exchangeRates =  {[sourceCurrency]: {quotes:{[targetCurrency] : {sources}}}} // might not all have rates yet
 OUT exchangeRates =  {
 [sourceCurrency]: {
  quotes: {
    [targetCurrency]: {
      sources,
      highest_rate  {exchange, rate},
      lowest_rate: {exchange, rate},
      median_rate: {exchange, rate}
      }
    }
  }
}
*/
function enrichExchangeRatesWithMinMaxAndMedians (exchangeRates) {
  Object.keys(exchangeRates).forEach(sourceSymbol => {
    const quotes = exchangeRates[sourceSymbol].quotes;
    Object.keys(quotes).forEach(targetSymbol => {
      const exchanges = quotes[targetSymbol].sources;
      const sortedExchanges = Object.keys(exchanges).sort(function (exchange1, exchange2) {
        return exchanges[exchange2] - exchanges[exchange1];
      });

      exchangeRates[sourceSymbol].quotes[targetSymbol].highest_rate = {exchange: sortedExchanges[0], rate: exchanges[sortedExchanges[0]]};
      const lowPoint = sortedExchanges.length - 1;
      exchangeRates[sourceSymbol].quotes[targetSymbol].lowest_rate = {exchange: sortedExchanges[lowPoint], rate: exchanges[sortedExchanges[lowPoint]]};
      const midPoint = (sortedExchanges.length - 1) / 2;
      const floorExchange = sortedExchanges[Math.floor(midPoint)];
      const ceilExchange = sortedExchanges[Math.ceil(midPoint)];

      const exchange = floorExchange === ceilExchange ? ceilExchange : (floorExchange + '|' + ceilExchange);

      exchangeRates[sourceSymbol].quotes[targetSymbol].median_rate = {
        exchange,
        rate: (Number(exchanges[floorExchange]) + Number(exchanges[ceilExchange])) / 2
      };
    });
  });
  return exchangeRates;
}

function createAndStoreSymbolList (proc, enrichedExchangeRates) {
  const symbols = [];
  for (const sourceSymbol in enrichedExchangeRates) {
    if (!symbols.includes(sourceSymbol)) symbols.push(sourceSymbol);
    for (const targetSymbol in enrichedExchangeRates[sourceSymbol].quotes) {
      if (!symbols.includes(targetSymbol)) symbols.push(targetSymbol);
    }
  }
  proc.poke('local::symbols', symbols);
}

function storeBikiHyVolume (proc, data) {
  if (typeof data.biki_hyusdt === 'object' && data.biki_hyusdt !== null && (data.biki_hyusdt.code === 0 || data.biki_hyusdt.code === '0') &&
      typeof data.biki_hyusdt.data === 'object' && data.biki_hyusdt.data !== null && data.biki_hyusdt.data.hasOwnProperty('vol')
  ) {
    const hyVolume = data.biki_hyusdt.data.vol;
    proc.poke('local::hy-volume', hyVolume);
  }
}

function parse (proc, data) {
  proc.logs('Updating sources.');

  const currentExchangeRates = typeof data === 'object' && data !== null && typeof data.rates === 'object' && data.rates !== null ? data.rates : {};

  const updatedExchangeRates = addUpdatedExchangeRates(proc, currentExchangeRates, [
    parseDefault(data.EUCentralBank, 'EUCentralBank'),
    parseHitbtc(data.hitbtc_symbols, data.hitbtc_prices, data.symbols),
    parseBinance(data.binance),
    parseCoinmarketcap(data.coinmarketcap),
    parseCoinbase(data.coinbase),
    parseBiki(data.biki_hyusdt),
    parseDefault(data.uni_swap, 'uni_swap'),
    parseDefault(data.tomo_dex, 'tomo_dex')
  ]);

  const enrichedExchangeRates = enrichExchangeRatesWithMinMaxAndMedians(updatedExchangeRates);

  storeBikiHyVolume(proc, data);
  createAndStoreSymbolList(proc, enrichedExchangeRates);

  proc.done(enrichedExchangeRates);
}

exports.parse = parse;
