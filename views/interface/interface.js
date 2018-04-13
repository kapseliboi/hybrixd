var POW = proofOfWork;
var Valuations = valuations;
var fetch_ = fetch;

var path = 'api';

GL = {
  usercrypto: {
    user_keys: args.user_keys,
    nonce: args.nonce
  },
  powqueue: [],
  coinMarketCapTickers: []
};
// Don't move this yet, as the cur_step is needed by assetModesUrl
GL.cur_step = nextStep();
var assetModesUrl = path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/modes');

function fetchDataFromUrl (url, cb, errStr) {
  fetch_(url)
    .then(r => r.json()
          .then(cb)
          .catch(e => console.log(errStr, e)))
    .catch(e => console.log(errStr, e));
}

function setAssetModesDataAndRetrieveAssetNames (assetModesData) {
  var decryptedData = zchan_obj(GL.usercrypto, GL.cur_step, assetModesData);
  GL.assetmodes = decryptedData.data;
  GL.cur_step = nextStep();
  const assetNamesUrl = path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/names');

  fetchDataFromUrl(assetNamesUrl, setAssetNamesAndFetchView, 'Error retrieving names.');
}

function setAssetNamesAndFetchView (assetNamesData) {
  var decryptedData = zchan_obj(GL.usercrypto, GL.cur_step, assetNamesData);
  GL.assetnames = decryptedData.data;

  Valuations.getDollarPrices(function () {
    console.log('Fetched valuations.');
  });
  // Switch to dashboard view
  fetchview('interface.dashboard', args);
}

// once every two minutes, loop through proof-of-work queue
fetchDataFromUrl(assetModesUrl, setAssetModesDataAndRetrieveAssetNames, 'Error retrieving modes.');
intervals.pow = setInterval(POW.loopThroughProofOfWork, 120000);
