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
var Storage = storage;
var Icons = black;
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

var assetsModesAndNamesStream = Rx.Observable
    .fromPromise(U.fetchDataFromUrl(assetModesUrl, 'Error retrieving asset details.'))
    .map(decryptData);

var deterministicHashesStream = Rx.Observable
    .fromPromise(hybriddcall({r: '/s/deterministic/hashes', z: true}))
    .filter(R.propEq('error', 0))
    .map(R.merge({r: '/s/deterministic/hashes', z: true}));

var deterministicHashesResponseProcessStream = deterministicHashesStream
    .flatMap(function (properties) {
      return Rx.Observable
        .fromPromise(hybriddReturnProcess(properties));
    })
    .map(R.prop('data')) // VALIDATE?
    .map(function (deterministicHashes) { assets.modehashes = deterministicHashes; }); // TODO: Make storedUserStream dependent on this stream!

var storedUserDataStream = storage.Get_(userStorageKey('ff00-0035'))
    .map(userDecode)
    .map(storedOrDefaultUserData); // TODO: make pure!

var assetsDetailsStream = storedUserDataStream
    .flatMap(a => a) // Flatten Array structure...
    .flatMap(function (asset) {
      return R.compose(
        initializeAsset(asset),
        R.prop('id')
      )(asset);
    })
    .map(addIcon);

var initializationStream = Rx.Observable
    .combineLatest(
      storedUserDataStream,
      assetsModesAndNamesStream,
      deterministicHashesResponseProcessStream
    );

function main () {
  Valuations.getDollarPrices();
  intervals.pow = setInterval(POW.loopThroughProofOfWork, 120000); // once every two minutes, loop through proof-of-work queue
  initializationStream.subscribe(initialize);
  assetsDetailsStream.subscribe(updateAssetDetailsAndRenderDashboardView); // TODO: Separate data retrieval from DOM rendering. Dashboard should be rendered in any case.
}

// EFF ::
function initialize (z) {
  var globalAssets = R.nth(0, z);
  var assetsModesAndNames = R.nth(1, z);

  GL.assetnames = mkAssetData(assetsModesAndNames, 'name');
  GL.assetmodes = mkAssetData(assetsModesAndNames, 'mode');
  initializeGlobalAssets(globalAssets);
  Storage.Set(userStorageKey('ff00-0035'), userEncode(globalAssets));
}

// EFF ::
function updateAssetDetailsAndRenderDashboardView (assetDetails) {
    GL.initCount += 1; // HACK!
    GL.assets = R.reduce(U.mkUpdatedAssets(assetDetails), [], GL.assets);

    // HACK: Assets can only be viewed when all details have been retrieved. Otherwise, transactions will not work.
    if (GL.initCount === R.length(GL.assets)) {
      document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args);
      document.querySelector('#topmenu-assets').classList.add('active');

      fetchview('interface.dashboard', args); // UNTIL VIEW IS RENDERED SEPARATELY:
    }
  }

function initializeAsset (asset) {
  return function (entry) {
    return initAsset(entry, GL.assetmodes[entry], asset);
  };
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

function storedOrDefaultUserData (decodeUserData) {
  return R.compose(
    R.unless(
      R.allPass([
        R.all(R.allPass([
          R.has('id'),
          R.has('starred')
        ])),
        R.compose(R.not, R.isEmpty)
      ]),
      R.always(defaultAssetData)
    ),
    R.defaultTo(defaultAssetData)
  )(decodeUserData);
}

function initializeGlobalAssets (assets) {
  R.compose(
    U.updateGlobalAssets,
    R.map(R.merge({balance: { amount: 0, lastTx: 0 }}))
  )(assets);
}

function addIcon (asset) {
  return R.when(
    R.has('symbol'),
    R.compose(
      R.assoc('icon', R.__, asset),
      U.mkIcon,
      R.prop('symbol')
    )
  )(asset);
}

function decryptData (d) { return R.curry(zchan_obj)(GL.usercrypto)(GL.cur_step)(d); }
function fetchAssetsViews (args) { return function () { fetchview('interface.assets', args); }; }

main();
