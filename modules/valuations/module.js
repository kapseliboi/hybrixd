exports.init = init;
exports.exec = exec;

priceParser = require('./price-check/parse-prices')

function init() {
  //modules.initexec('valuations',["init"]);
}

function exec(properties) {
  processID = properties.processID;
  source = properties.source.toUpperCase();
  target = properties.target.toUpperCase();
  amount = parseFloat(properties.amount);
  if( isNaN(amount)) {
    amount = 1;
  }

  valuation = priceParser.valuation(properties.quotes, source, target);
  conversion = amount * valuation;
  
  
  scheduler.stop(processID,{err:0, data:conversion});
}
