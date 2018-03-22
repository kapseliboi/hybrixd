
  // fill local usercrypto object with keys and nonce later on
  GL = {
    usercrypto:{ user_keys: args.user_keys, nonce: args.nonce },
    powqueue:[]
  }

  // retrieve modes supported by node
  GL.cur_step = next_step();
  $.ajax({ url: path+zchan(GL.usercrypto,GL.cur_step,'l/asset/modes'),
    success: function(object){
      object = zchan_obj(GL.usercrypto,GL.cur_step,object);
      GL.assetmodes=object.data;
      // retrieve names supported by node
      GL.cur_step = next_step();
      $.ajax({ url: path+zchan(GL.usercrypto,GL.cur_step,'l/asset/names'),
        success: function(object){
          object = zchan_obj(GL.usercrypto,GL.cur_step,object);
          GL.assetnames=object.data;

          getDollarPrices(function () {
            // Switch to dashboard view
            fetchview('interface.dashboard',args);
          });
        }
      });
    }
  });

  // once every two minutes, loop through proof-of-work queue
  intervals.pow = setInterval(function() {
    var req = GL.powqueue.shift();
    if(typeof req !== 'undefined') {
      // attempt to send proof-of-work to node
      proofOfWork.solve(req.split('/')[1],
        function(proof){
          // DEBUG:
          logger('submitting storage proof: '+req.split('/')[0]+'/'+proof);
          hybriddcall({r:'s/storage/pow/'+req.split('/')[0]+'/'+proof,z:0},0, function(object) {});
        },
        function(){
          // DEBUG:
          logger('failed storage proof: '+req.split('/')[0]);
        }
      );
    }
  },120000);

getDollarPrices = function (cb) {
  $.ajax({
    url: 'https://api.coinmarketcap.com/v1/ticker/?limit=0',
    dataType: 'json'
  })
    .done(function (data) {
      GL.coinMarketCapTickers = data;
      cb();
    })
    .error(function (e) {
    });
};

renderDollarPrice = function (symbolName, assetAmount) {
  var assetSymbolUpperCase = symbolName.toUpperCase();
  var tickers = GL.coinMarketCapTickers;
  var matchedTicker = tickers.filter(function (ticker) {
    return ticker.symbol === assetSymbolUpperCase;
  });

  return matchedTicker.length !== 0
    ? (assetAmount * matchedTicker[0].price_usd).toFixed(2)
    : '-';
};
