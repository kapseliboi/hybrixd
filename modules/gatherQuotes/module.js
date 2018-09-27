exports.init = init;
exports.exec = exec;

quotesGenerator = require('./price-check/parse-prices')

function init() {
  //modules.initexec('gatherQuotes',["init"]);
}

function exec(properties) {
  processID = properties.processID;
  quotes = quotesGenerator.getQuotes();
  
  scheduler.stop(processID,{err:0, data:quotes});
}
