var fs = require('fs');

var folder = __dirname + '/../../gatherQuotes/price-check/prices'

exports.valuation = valuation
exports.sklgnsfdkl = valuation

function singleHop(exchangeRates, startSymbol, history, rate_mode) {
  accumulator = {}
  quotes = exchangeRates[startSymbol]['quotes']
  Object.keys(quotes).map(function(intermediateCurrency,_) {
    rate = quotes[intermediateCurrency][rate_mode]
    accumulator[intermediateCurrency] = {rate: history.rate * rate['rate']
                                       , transactionPath: history['transactionPath'].concat([{exchange: rate['exchange'], to: intermediateCurrency}])};
  });
  return accumulator;
}

function optimalTransaction(history1, history2) {
  currencies = [...new Set(Object.keys(history1).concat(Object.keys(history2)))];
  
  accumulator = {};
  currencies.map(function(currency, _) {
    if(!history1.hasOwnProperty(currency)) {
      accumulator[currency] = history2[currency]
      return;
    }
    if(!history2.hasOwnProperty(currency)) {
      accumulator[currency] = history1[currency]
      return;
    }
    if( history1[currency].rate > history2[currency].rate ) {
      accumulator[currency] = history1[currency]
      return;
    }
    accumulator[currency] = history2[currency]
  });
  
  return accumulator
}


function bestTransactionChain(exchangeRates, startSymbol, targetSymbol, maxHops, shortestPath, rate_mode, whitelist, useWhitelist) {  
  emptyHistory = {rate: 1, transactionPath: []};
  
  whitelist = new Set(whitelist.concat([startSymbol, targetSymbol]))
  
  transactionChains = {};
  transactionChains[startSymbol] = emptyHistory;
  for(var i =0; i < maxHops; i++) {
    if(shortestPath && transactionChains.hasOwnProperty(targetSymbol)) {
      break;
    }
    intermediarySymbols = Object.keys(transactionChains);
    if (useWhitelist) {

      intermediarySymbols = Array.from(new Set([...intermediarySymbols].filter(i => whitelist.has(i))));
    }
    accumulator = intermediarySymbols.map(function(currency, _) {
      return singleHop(exchangeRates, currency, transactionChains[currency], rate_mode)
    }).concat(transactionChains);
    transactionChains = accumulator.reduce(function(history1, history2) {return optimalTransaction(history1, history2)});
  }
  
  if(transactionChains.hasOwnProperty(targetSymbol)) {
    return transactionChains[targetSymbol];
  }
  else {
    result = emptyHistory;
    result.rate = 0;
    return result;
  }
}

function valuation(quotes, source, target) {
  rate_mode = 'median_rate'
  whitelist = ['BTC', 'ETH', 'USD', 'EUR']
  
  return bestTransactionChain(quotes, source, target, 5, true, rate_mode, whitelist, true).rate;
}
/*
console.dir(valuation('BTC', 'USD', 'median_rate'), { depth: null });
console.dir(valuation('BTC', 'USD', 'highest_rate'), { depth: null });
console.dir(valuation('ZWL', 'MONA', 'median_rate'), { depth: null });
console.dir(valuation('ZWL', 'MONA', 'highest_rate'), { depth: null });
console.dir(valuation('ZWL', 'XZC', 'median_rate'), { depth: null });
console.dir(valuation('ZWL', 'XZC', 'highest_rate'), { depth: null });*/


//console.dir(updatedQuotes, { depth: null });
//test = 

//console.dir(bestTransactionChain(updatedQuotes, 'BTC', 'BTC', 0), { depth: null });
