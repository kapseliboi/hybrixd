var fetch_ = fetch;

valuations = {
  getDollarPrices: function (cb) {
    $.ajax({
      url: 'https://api.coinmarketcap.com/v1/ticker/?limit=0',
      dataType: 'json'
    })
      .done(function (data) {
        GL.coinMarketCapTickers = data;
        cb();
      })
      .error(function (e) { console.log('Could not fetch valuations:', e); });
  },
  renderDollarPrice: function (symbolName, assetAmount) {
    var assetSymbolUpperCase = symbolName.toUpperCase();
    var tickers = GL.coinMarketCapTickers;
    var matchedTicker = tickers.filter(function (ticker) {
      return ticker.symbol === assetSymbolUpperCase;
    });

    return matchedTicker.length !== 0
      ? '$' + (assetAmount * matchedTicker[0].price_usd).toFixed(2)
      : 'n/a';
  }
}
