var fs = require('fs');
var xmldoc = require('xmldoc');

var folder = __dirname + '/prices'

exports.getQuotes = getQuotes

function addQuote(accumulator, quote_currency, base_currency, price) {
  // Don't add quote if the input fails these requirements
  if(quote_currency == base_currency || price == 0 || !isFinite(price))
  {
    return accumulator;
  } 
  
  if(!accumulator.hasOwnProperty(quote_currency)) {
      accumulator[quote_currency] = { quotes: {}};
  }
  accumulator[quote_currency]['quotes'][base_currency] = price;
  return accumulator;
}

function parseEUCentralBank (folder) {
  filename = '/EUCentralBank-prices.xml';
  name = 'EUCentralBank';
  
  var document = new xmldoc.XmlDocument(fs.readFileSync(folder + filename, 'utf8'));
  xmlElements = document.children[5].children[1].children.filter(node => node.constructor.name == "XmlElement");
  
  quote_accumulator = {};
  xmlElements.map(function(key,index) {
      price = key.attr.rate;
      quote_currency = key.attr.currency;
      
      quote_accumulator = addQuote(quote_accumulator, 'EUR', quote_currency, price);
      quote_accumulator = addQuote(quote_accumulator, quote_currency, 'EUR', 1/price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseCoinmarketcap (folder) {
  filename = '/coinmarketcap-prices.json';
  name = 'coinmarketcap';
  var obj = JSON.parse(fs.readFileSync(folder + filename, 'utf8'));

  quote_accumulator = {};
  Object.keys(obj.data).map(function(key,index) {
      price = obj.data[key].quotes.USD.price
      quote_currency = obj.data[key].symbol
      
      quote_accumulator = addQuote(quote_accumulator, 'USD', quote_currency, 1/price);
      quote_accumulator = addQuote(quote_accumulator, quote_currency, 'USD', price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseCoinbase (folder) {
  filename = '/coinbase-prices.json';
  name = 'coinbase'
  var obj = JSON.parse(fs.readFileSync(folder + filename, 'utf8'));
  
  quote_accumulator = {};
  Object.keys(obj.data.rates).map(function(key,index) {
    price = parseFloat(obj.data.rates[key]);
    
    quote_accumulator = addQuote(quote_accumulator, 'USD', key, price);
    quote_accumulator = addQuote(quote_accumulator, key, 'USD', 1/price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseBinance (folder) {
  filename = '/binance-prices.json';
  name = 'binance'
  baseCurrencies = ['BTC', 'ETH', 'USDT', 'BNB'];
  
  var obj = JSON.parse(fs.readFileSync(folder + filename, 'utf8'));
  
  quote_accumulator = {}
  Object.keys(obj).map(function(key,index) {
      symbolPair = obj[key].symbol;
      
      base_currency = baseCurrencies.find(function(currency) { return symbolPair.endsWith(currency)});
      quote_currency = symbolPair.slice(0,symbolPair.length - base_currency.length);
      price = parseFloat(obj[key].price)

      quote_accumulator = addQuote(quote_accumulator, quote_currency, base_currency, price);
      quote_accumulator = addQuote(quote_accumulator, base_currency, quote_currency, 1/price);
  });
  return {name: name, quotes: quote_accumulator};
}

function parseHitbtc (folder) {
  price_file = '/hitbtc-prices.json';
  symbol_file = '/hitbtc-symbols.json';
  name = 'hitbtc'
  
  var symbols = JSON.parse(fs.readFileSync(folder + symbol_file, 'utf8'));
  var prices = JSON.parse(fs.readFileSync(folder + price_file, 'utf8'));
  
  symbols_obj = {}
  symbols.map(function(key,index) {
    symbols_obj[key.id] = key
  });
  
  quote_accumulator = {}
  prices.map(function(key,index) {
    exchange_symbol = symbols_obj[key['symbol']]
    
    base_currency= exchange_symbol['baseCurrency'];
    quote_currency = exchange_symbol['quoteCurrency'];
    price = parseFloat(key.last);
    
    quote_accumulator = addQuote(quote_accumulator, base_currency, quote_currency, price);
    quote_accumulator = addQuote(quote_accumulator, quote_currency, base_currency, 1/price);
  });
  return {name: name, quotes: quote_accumulator};
}

function combineQuoteSources(sources)
{
  combinedQuotes = sources.reduce(function(accumulatedSources, newSource) {
    newQuotes = newSource["quotes"]
    Object.keys(newQuotes).map(function(quoteCurrency,index) {
      if (!accumulatedSources.hasOwnProperty(quoteCurrency)) {
        accumulatedSources[quoteCurrency] = {quotes: {}};
      }
      Object.keys(newQuotes[quoteCurrency]["quotes"]).map(function(baseCurrency,index) {
        
        if (!accumulatedSources[quoteCurrency]["quotes"].hasOwnProperty(baseCurrency)) {
          accumulatedSources[quoteCurrency]["quotes"][baseCurrency] = {sources: {}}
        }
        accumulatedSources[quoteCurrency]["quotes"][baseCurrency]['sources'][newSource['name']] = newQuotes[quoteCurrency]["quotes"][baseCurrency]
      });
    });
    return accumulatedSources;
  }, {});
  
  return combinedQuotes
}

function updateMinAndMedians(exchangeRates) {
  Object.keys(exchangeRates).map(function(sourceCurrency, _) {
    quotes = exchangeRates[sourceCurrency]['quotes'];
    Object.keys(quotes).map(function(targetCurrency, _) {
      exchanges = quotes[targetCurrency]['sources'];
      sortedExchanges = Object.keys(exchanges).sort(function(exchange1, exchange2) {
        return exchanges[exchange2] - exchanges[exchange1];
      });
      exchangeRates[sourceCurrency]['quotes'][targetCurrency]['highest_rate'] =  {'exchange': sortedExchanges[0], rate: exchanges[sortedExchanges[0]]};
      
      midPoint = (sortedExchanges.length - 1)/2;
      exchangeRates[sourceCurrency]['quotes'][targetCurrency]['median_rate'] = {'exchange': "", 
                                                                                'rate': (exchanges[sortedExchanges[Math.floor(midPoint)]] + exchanges[sortedExchanges[Math.ceil(midPoint)]]) / 2};
    });
  });
  return exchangeRates;
}

function getQuotes() {
  sourcesOut = combineQuoteSources([parseEUCentralBank(folder), parseHitbtc(folder), parseBinance(folder), parseCoinmarketcap(folder), parseCoinbase(folder)]);
  return updateMinAndMedians(sourcesOut);

}
//console.dir(getQuotes().USD.quotes.TRY, { depth: null });
