const ACCEPTED_RATE_RANGE_THRESHOLD = 1.2; // only a 20% difference between lowest and highest is accepted

const unifications = { // some more hardcoded sanitations
  usd: [
    'tusd', 'usdc', 'usdt',
    'hy.usd', 'tomo.usdo', 'tomo.usdt',
    'eth.eusd', 'eth.tusd', 'eth.usdc', 'eth.usdt', 'trx.usdt', 'waves.usd', 'xrp.usd'
  ], // not included:  omni.usdt, tomo.usdt
  eur: [
    'eurs', 'eurt',
    'hy.eur', 'tomo.euro',
    'eth.eurs', 'eth.eurt', 'waves.eur'
  ], // not included omni.eurt
  cny: [
    'cnht', 'ecny',
    'hy.cny', 'tomo.cnyo',
    'eth.cnht', 'bnb.ecny'
  ],
  hy: [
    'bnb.hy', 'eth.hy', 'tomo.hy'
  ]
};

const FIAT_SYMBOLS = ['usd', 'eur', 'cny', 'aud', 'cad', 'gpb', 'jpy', 'rub', 'zar'];

// if symbol = 'BLA' and hybrix symbol BLA does not exists but BASE.BLA does, then use that
function sanitizeSymbol (symbol) {
  if (typeof symbol !== 'string') return null;

  symbol = symbol.toLowerCase();

  for (const unifiedSymbol in unifications) {
    if (unifications[unifiedSymbol].includes(symbol)) return unifiedSymbol.toUpperCase();
  }

  const hybrixSymbols = Object.keys(global.hybrixd.asset);
  if (hybrixSymbols.includes(symbol)) return symbol.toUpperCase(); // 'BLA' exists as hybrix asset
  else if (FIAT_SYMBOLS.includes(symbol)) return symbol.toUpperCase(); // 'BLA' exists as fiat currency
  else {
    const tokenSymbols = [];
    for (const hybrixSymbol of hybrixSymbols) {
      if (hybrixSymbol.endsWith('.' + symbol)) tokenSymbols.push(hybrixSymbol); // 'BASE.BLA' exists as hybrix asset
    }
    if (tokenSymbols.length === 1) return tokenSymbols[0].toUpperCase(); // return 'BASE.BLA'
    // if both 'ETH.BLA' and 'WAVES.BLA' exist. Do not sanitize
    return null; // no matching symbol found
  }
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
function enrichExchangeRatesWithMinMaxAndMedians (exchangeRates, proc) {
  Object.keys(exchangeRates).forEach(sourceSymbol => {
    const quotes = exchangeRates[sourceSymbol].quotes;
    Object.keys(quotes).forEach(targetSymbol => {
      const exchanges = quotes[targetSymbol].sources;
      const sortedExchangePrices = Object.keys(exchanges).sort((exchange1, exchange2) => exchanges[exchange2] - exchanges[exchange1]);

      const lowPoint = sortedExchangePrices.length - 1;
      const highestPrice = exchanges[sortedExchangePrices[0]];
      const lowestPrice = exchanges[sortedExchangePrices[lowPoint]];

      if (lowestPrice * ACCEPTED_RATE_RANGE_THRESHOLD < highestPrice && sortedExchangePrices.length === 2) {
        // DEBUG: proc.warn(`Unstable pair ${sourceSymbol}:${targetSymbol} for sources: ${JSON.stringify(exchanges)}.`);
        // in case of only two sources, the median will not filter any outliers and the pair must be considered unstable
        delete exchangeRates[sourceSymbol].quotes[targetSymbol];
      } else {
        exchangeRates[sourceSymbol].quotes[targetSymbol].highest_rate = {exchange: sortedExchangePrices[0], rate: highestPrice};
        exchangeRates[sourceSymbol].quotes[targetSymbol].lowest_rate = {exchange: sortedExchangePrices[lowPoint], rate: lowestPrice};
        const midPoint = (sortedExchangePrices.length - 1) / 2;
        const floorExchange = sortedExchangePrices[Math.floor(midPoint)];
        const ceilExchange = sortedExchangePrices[Math.ceil(midPoint)];

        const exchange = floorExchange === ceilExchange ? ceilExchange : (floorExchange + '|' + ceilExchange);

        exchangeRates[sourceSymbol].quotes[targetSymbol].median_rate = {
          exchange,
          rate: (Number(exchanges[floorExchange]) + Number(exchanges[ceilExchange])) / 2
        };
      }
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

function parse (proc, data) {
  proc.logs('Updating sources.');

  const currentExchangeRates = typeof data === 'object' && data !== null && typeof data.rates === 'object' && data.rates !== null ? data.rates : {};

  const updatedExchangeRates = addUpdatedExchangeRates(proc, currentExchangeRates, [
    parseDefault(data.EUCentralBank, 'EUCentralBank'),
    parseHitbtc(data.hitbtc_symbols, data.hitbtc_prices, data.symbols),
    parseBinance(data.binance),
    parseCoinmarketcap(data.coinmarketcap),
    parseCoinbase(data.coinbase),
    parseDefault(data.uni_swap, 'uni_swap'),
    parseDefault(data.tomo_dex, 'tomo_dex')
  ]);

  const enrichedExchangeRates = enrichExchangeRatesWithMinMaxAndMedians(updatedExchangeRates, proc);

  createAndStoreSymbolList(proc, enrichedExchangeRates);

  proc.done(enrichedExchangeRates);
}

exports.parse = parse;
exports.sanitizeSymbol = sanitizeSymbol;
