var POW = proofOfWork;
var Valuations = valuations;
var U = utils;

var path = 'api';

GL = {
  usercrypto: {
    user_keys: args.user_keys,
    nonce: args.nonce
  },
  powqueue: [],
  coinMarketCapTickers: [],
  assets: []
};

assets.seed = {};
assets.keys = {};
assets.addr = {};

// Don't move this yet, as the cur_step is needed by assetModesUrl. Synchronous coding!
GL.cur_step = nextStep();
var assetModesUrl = path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/details');

// All synchronous dependencies. Make async with Streamzzzz
function main () {
  // Valuations.getDollarPrices(function () { console.log('Fetched valuations.'); });
  // intervals.pow = setInterval(POW.loopThroughProofOfWork, 120000); // once every two minutes, loop through proof-of-work queue

  var assetDetailsStream = Rx.Observable
      .fromPromise(U.fetchDataFromUrl(assetModesUrl, 'Error retrieving asset details.'))
      .map(setAssetsData);

  var hybriddCallStream = Rx.Observable
      .fromPromise(hybriddcall({r: '/s/deterministic/hashes', z: true}))
      .filter(R.propEq('error', 0))
      .map(R.merge({r: '/s/deterministic/hashes', z: true}));

  var hybriddCallResponseProcessStream = hybriddCallStream
      .flatMap(function (properties) {
        return Rx.Observable
          .fromPromise(hybriddReturnProcess(properties));
      })
      .map((z) => {
        assets.modehashes = z.data;
        return true;
      });

  var storedUserDataStream = storage.Get_(userStorageKey('ff00-0034'))
      .map(function (z) {
        var decodedData = userDecode(z);
        GL.assets = decodedData;

        GL.assets.forEach(R.compose(
          initializeDeterministicEncryptionRoutines,
          R.prop('id')
        ));

        return decodedData;
      });

  var combinedStream = Rx.Observable
      .combineLatest(
        storedUserDataStream,
        assetDetailsStream,
        hybriddCallResponseProcessStream
      ).map(z => true);

  // storedUserDataStream.subscribe();
  // assetDetailsStream.subscribe();
  // hybriddCallResponseProcessStream.subscribe();

  // retrieveUserAssetData();
  combinedStream.subscribe(z => {

    fetchview('interface.dashboard', args);    // Switch to dashboard view
  });
}

// TODO Move this up to just after login, when retrieving hash, modes, etc
function initializeDeterministicEncryptionRoutines (assetID, i) {
  initializeAsset(assetID);
}

// - Get assetmodes and names
// - Get modehashes
// - Retrieve user's assets from storage
// - Initialize user assets

//   When ready:
// - Fetch view: dashboard

// - Async: Fetch valuations
// - Async: Initialize Proof of Work loop

function initializeAsset (entry, passdata) { initAsset(entry, GL.assetmodes[entry]); }

function setAssetsData (assetModesData) {
  var decryptedData = zchan_obj(GL.usercrypto, GL.cur_step, assetModesData);

  GL.assetnames = mkAssetData(decryptedData, 'name');
  GL.assetmodes = mkAssetData(decryptedData, 'mode');

  return true;
}

function mkAssetData (data, key) {
  return R.compose(
    R.mergeAll,
    R.map(R.curry(matchSymbolWithData)(key)),
    R.prop('data')
  )(data);
}

function matchSymbolWithData (key, data) {
  return R.assoc(
    R.prop('symbol', data),
    R.prop(key, data),
    {}
  );
}

// function retrieveUserAssetData () {
//   storage.Get(userStorageKey('ff00-0034'), function (crypted) {
//     var decodedData = userDecode(crypted);

//     GL.assets = R.isNil(decodedData)
//       ? [
//         {id: 'btc', starred: false},
//         {id: 'eth', starred: false}
//       ]
//       : decodedData;

//     GL.assets.forEach(R.compose(
//       initializeDeterministicEncryptionRoutines,
//       R.prop('id')
//     ));

//     // TRANSITION TO SINGLE STORAGE KEY FOR DATA
//     storage.Set(userStorageKey('ff00-0035'), userEncode(decodedData));
//   });
// }

main();
