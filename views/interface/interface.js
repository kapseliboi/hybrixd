// - Get assetmodes and names
// - Get modehashes
// - Retrieve user's assets from storage
// - Initialize user assets

// NOPE \/\/\/ Render DOM independently!!!!
//   When ready:
// - Fetch view: dashboard

// - Async: Fetch valuations
// - Async: Initialize Proof of Work loop

var POW = proofOfWork;
var Valuations = valuations;
var U = utils;

var path = 'api';

GL = {
  assets: [],
  assetnames: {},
  assetmodes: {},
  coinMarketCapTickers: [],
  powqueue: [],
  usercrypto: {
    user_keys: args.user_keys,
    nonce: args.nonce
  },
  initCount: 0
};

// Don't move this yet, as the cur_step is needed by assetModesUrl. Synchronous coding!
GL.cur_step = nextStep();
var assetModesUrl = path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/details');

var defaultAssetData = [
  { id: 'btc', starred: false },
  { id: 'eth', starred: false }
];

var assetDetailsStream = Rx.Observable
    .fromPromise(U.fetchDataFromUrl(assetModesUrl, 'Error retrieving asset details.'))
    .map(setAssetsData);

var deterministicHashesStream = Rx.Observable
    .fromPromise(hybriddcall({r: '/s/deterministic/hashes', z: true}))
    .filter(R.propEq('error', 0))
    .map(R.merge({r: '/s/deterministic/hashes', z: true}));

var deterministicHashesResponseProcessStream = deterministicHashesStream
    .flatMap(function (properties) {
      return Rx.Observable
        .fromPromise(hybriddReturnProcess(properties));
    })
    .map(function (modehashesResponse) { assets.modehashes = modehashesResponse.data; }); // TODO: MAKE PURE!!!!

var storedUserDataStream = storage.Get_(userStorageKey('ff00-0034'))
    .map(userDecode)
    .map(storedOrDefaultUserData);
// Almost same code is used in ManageAssets. Refactor if possible....
var assetsDetailsStream = storedUserDataStream
    .flatMap(a => a) // Flatten Array structure...
    .flatMap(function (asset) {
      return R.compose(
        initializeAsset(asset),
        R.prop('id')
      )(asset);
    });

var initializationStream = Rx.Observable
    .combineLatest(
      storedUserDataStream,
      assetDetailsStream,
      deterministicHashesResponseProcessStream
    );

// All synchronous dependencies. Make async with Streamzzzz
function main () {
  Valuations.getDollarPrices(function () { console.log('Fetched valuations.'); });
  intervals.pow = setInterval(POW.loopThroughProofOfWork, 120000); // once every two minutes, loop through proof-of-work queue
  // TODO: Separate data retrieval from DOM rendering. Dashboard should be rendered in any case.
  initializationStream.subscribe(function (z) {
    var globalAssets = R.compose(
      R.map(R.merge({balance: { amount: 0, lastTx: 0 }})),
      R.nth(0)
    )(z);

    U.updateGlobalAssets(globalAssets);
  });

  assetsDetailsStream.subscribe(function (assetDetails) {
    GL.initCount += 1;
    GL.assets = R.reduce(U.mkUpdatedAssets(assetDetails), [], GL.assets);

    // HACK: Assets can only be viewed when all details have been retrieved. Otherwise, transactions will not work.
    if (GL.initCount === R.length(GL.assets)) {
      document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args);
      document.querySelector('#topmenu-assets').classList.add('active');

      fetchview('interface.dashboard', args); // UNTIL VIEW IS RENDERED SEPARATELY:
    }
  });
}

function initializeAsset (asset) {
  return function (entry) {
    return initAsset(entry, GL.assetmodes[entry], asset);
  };
}

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

// TODO: Make pure!!!
function storedOrDefaultUserData (decodeUserData) {
  var hasCorrectFormat = R.has('id', decodeUserData) && R.has('starred', decodeUserData);
  if (R.isNil(decodeUserData)) {
    storage.Set(userStorageKey('ff00-0034'), userEncode(defaultAssetData));
  }

  return R.isNil(decodeUserData) && R.not(hasCorrectFormat)
    ? defaultAssetData
    : decodeUserData;
}

function fetchAssetsViews (args) { return function () { fetchview('interface.assets', args); }; }

main();
