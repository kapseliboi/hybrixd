exports.init = init;
exports.exec = exec;


function init() {
  //modules.initexec('parseQuotes',["init"]);
}

function exec(properties) {
  processID = properties.processID;
  rawText   = properties.rawText;
  source    = properties.source;
  
  switch(source){
    case 'binance':
        baseCurrencies = ['BTC', 'ETH', 'USDT', 'BNB'];
        
        var obj = rawText;
        
        quote_accumulator = {}
        Object.keys(obj).map(function(key,index) {
            symbolPair = obj[key].symbol;
            
            base_currency = baseCurrencies.find(function(currency) { return symbolPair.endsWith(currency)});
            quote_currency = symbolPair.slice(0,symbolPair.length - base_currency.length);
            price = parseFloat(obj[key].price)

            quote_accumulator = addQuote(quote_accumulator, quote_currency, base_currency, price);
            quote_accumulator = addQuote(quote_accumulator, base_currency, quote_currency, 1/price);
        });
        result = {name: source, quotes: quote_accumulator};
    case 'coinmarketcap':
      var obj = rawText;

      quote_accumulator = {};
      Object.keys(obj.data).map(function(key,index) {
          price = obj.data[key].quotes.USD.price
          quote_currency = obj.data[key].symbol
          
          quote_accumulator = addQuote(quote_accumulator, 'USD', quote_currency, 1/price);
          quote_accumulator = addQuote(quote_accumulator, quote_currency, 'USD', price);
      });
      result = {name: source, quotes: quote_accumulator};
    case 'hitbtc':
      var symbols = properties.symbols;
      var prices = rawText;
      
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
      result = {name: source, quotes: quote_accumulator};
    
  }
  scheduler.stop(processID,{err:0, data:result});
}

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
