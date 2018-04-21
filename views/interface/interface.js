var POW = proofOfWork;
var Valuations = valuations;
var Utils = utils;

var path = 'api';

GL = {
  usercrypto: {
    user_keys: args.user_keys,
    nonce: args.nonce
  },
  powqueue: [],
  coinMarketCapTickers: []
};
// Don't move this yet, as the cur_step is needed by assetModesUrl. Synchronous coding!
GL.cur_step = nextStep();
console.log('steppie', GL.cur_step);
console.log('steppie', session_step);
var assetModesUrl = path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/modes');

function main () {
  Utils.fetchDataFromUrl(assetModesUrl, setAssetModesDataAndRetrieveAssetNames, 'Error retrieving modes.');
  intervals.pow = setInterval(POW.loopThroughProofOfWork, 120000); // once every two minutes, loop through proof-of-work queue
}

function setAssetModesDataAndRetrieveAssetNames (assetModesData) {
  decryptAndSetAssetsProp(assetModesData, 'modes');
  GL.cur_step = nextStep();
  const assetNamesUrl = path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/names');

  Utils.fetchDataFromUrl(assetNamesUrl, setAssetNamesAndFetchView, 'Error retrieving names.');
}

function setAssetNamesAndFetchView (assetNamesData) {
  decryptAndSetAssetsProp(assetNamesData, 'names');

  Valuations.getDollarPrices(function () { console.log('Fetched valuations.'); });
  fetchview('interface.dashboard', args); // Switch to dashboard view
}

function decryptAndSetAssetsProp (data, prop) {
  var decryptedData = zchan_obj(GL.usercrypto, GL.cur_step, data);
  var assetsPropStr = 'asset' + prop;
  GL[assetsPropStr] = decryptedData.data;
}

main();
