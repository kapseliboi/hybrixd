var fetch_ = fetch;

valuations = {
  getDollarPrices: function (cb) {
    var url = 'https://api.coinmarketcap.com/v1/ticker/?limit=0';
    var valuationsStream = Rx.Observable.fromPromise(U.fetchDataFromUrl(url, 'Could not fetch valuations.'));

    valuationsStream.subscribe(function (coinMarketCapData) {
      GL.coinMarketCapTickers = coinMarketCapData;
      cb();
    });
  },
  renderDollarPrice: function (symbolName, amount) {
    var assetSymbolUpperCase = symbolName.toUpperCase();
    var tickers = GL.coinMarketCapTickers;
    var matchedTicker = tickers.filter(function (ticker) {
      return ticker.symbol === assetSymbolUpperCase;
    });

    return matchedTicker.length !== 0 && R.not(isNaN(amount))
      ? '$' + (amount * matchedTicker[0].price_usd).toFixed(2)
      : 'n/a';
  }
};
