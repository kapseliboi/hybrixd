var fs = require('fs');
// var request = require('request');
var path = require('path');

var folder = path.join(__dirname, '/var/prices');

function downloadPricesFromSource (source, destinationFolder) {
/*  request(source.site, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      // console.log(body)
    }
  }).pipe(fs.createWriteStream(destinationFolder + source.filename)); */
}

function download () {
  // TODO use recipe sources
}
// bitfinex alleen per coin prijs opvragen: https://docs.bitfinex.com/docs/public-endpoints
// gdax can only poll each currency-pair individually, 3 request per second max: https://docs.gdax.com/#get-product-ticker

exports.download = download;
