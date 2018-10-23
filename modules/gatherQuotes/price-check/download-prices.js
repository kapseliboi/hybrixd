var fs = require('fs');
var request = require('request');
var path = require('path')

var folder = __dirname + '/prices'


function downloadPricesFromSource (source, destinationFolder) {
  request(source.site, function (error, response, body) {
      if (!error && response.statusCode == 200) {
          //console.log(body)
       }
  }).pipe(fs.createWriteStream(destinationFolder+source.filename))
}


//European central bank for fiat-exchange rates: http://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
var EUCentralBank = { 
  site: 'http://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
  filename: '/EUCentralBank-prices.xml'}
  
downloadPricesFromSource(EUCentralBank, folder)

// coinmarketcap: https://coinmarketcap.com/api/
var coinmarketcap = { 
  site: 'https://api.coinmarketcap.com/v2/ticker/',
  filename: '/coinmarketcap-prices.json'}
  
downloadPricesFromSource(coinmarketcap, folder)


// coinbase: https://developers.coinbase.com/api/v2#exchange-rates
var coinbase = {
  site: ' https://api.coinbase.com/v2/exchange-rates',
  filename: '/coinbase-prices.json'}
  
downloadPricesFromSource(coinbase, folder)


//binance: https://github.com/binance-exchange/binance-official-api-docs/blob/master/rest-api.md
var binance = {
  site: 'https://api.binance.com/api/v1/ticker/price',
  filename: '/binance-prices.json'}
  
downloadPricesFromSource(binance, folder)


//hitbtc: https://api.hitbtc.com/
var hitbtc_symbols = {
  site: 'https://api.hitbtc.com/api/2/public/symbol',
  filename: '/hitbtc-symbols.json'}
var hitbtc_prices = {
  site: 'https://api.hitbtc.com/api/2/public/ticker',
  filename: '/hitbtc-prices.json'}
downloadPricesFromSource(hitbtc_symbols, folder)
downloadPricesFromSource(hitbtc_prices, folder)



//bitfinex alleen per coin prijs opvragen: https://docs.bitfinex.com/docs/public-endpoints  
//gdax can only poll each currency-pair individually, 3 request per second max: https://docs.gdax.com/#get-product-ticker
