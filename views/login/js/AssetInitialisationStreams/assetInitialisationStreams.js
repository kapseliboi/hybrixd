var A = animations;
var U = utils;

var path = 'api';

var ANIMATION_STEPS = R.compose(
  R.dec,
  R.length,
  R.keys
)(A.progressMessages);

var defaultAssetData = [
  { id: 'btc', starred: false },
  { id: 'eth', starred: false }
];

function doAssetInitialisation (z) {
  GL.cur_step = nextStep();
  var assetsModesUrl = path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/details');

  var assetsModesAndNamesStream = Rx.Observable
      .fromPromise(U.fetchDataFromUrl(assetsModesUrl, 'Error retrieving asset details.'))
      .map(decryptData);

  var initialAnimationStateStream = Rx.Observable.interval(200)
      .startWith(0)
      .take(2);

  var deterministicHashesStream = Rx.Observable
      .fromPromise(hybriddcall({r: '/s/deterministic/hashes', z: true}))
      .filter(R.propEq('error', 0));

  var deterministicHashesResponseProcessStream = deterministicHashesStream
      .flatMap(function (properties) {
        return Rx.Observable
          .fromPromise(hybriddReturnProcess(properties));
      })
      .map(R.prop('data')) // VALIDATE?
      .map(function (deterministicHashes) { assets.modehashes = deterministicHashes; }); // TODO: Make storedUserStream dependent on this stream!

  var storedUserDataStream = Storage.Get_(userStorageKey('ff00-0035'))
      .map(userDecode)
      .map(storedOrDefaultUserData); // TODO: make pure!

  var assetsDetailsStream = storedUserDataStream
      .flatMap(a => a) // Flatten Array structure...
      .filter(existsInAssetNames) // TODO: Now REMOVES assets that have been disabed in the backed. Need to disable / notify user when this occurs.
      .flatMap(function (asset) {
        return R.compose(
          initializeAsset(asset),
          R.prop('id')
        )(asset);
      })
      .map(U.addIcon);

  var initializationStream = Rx.Observable
      .combineLatest(
        storedUserDataStream,
        assetsModesAndNamesStream,
        deterministicHashesResponseProcessStream
      );

  var animationStream = Rx.Observable
      .concat(
        initialAnimationStateStream,
        storedUserDataStream,
        assetsModesAndNamesStream,
        deterministicHashesResponseProcessStream,
        assetsDetailsStream
      )
      .scan(function (acc, curr) { return acc + 1; })
      .map(function (n) { return n <= ANIMATION_STEPS ? n : ANIMATION_STEPS; })
      .map(A.doProgressAnimation);

  var powQueueIntervalStream = Rx.Observable
      .interval(30000);

  // EFF ::
  function updateAssetDetailsAndRenderDashboardView (assetDetails) {
    GL.initCount += 1; // HACK!
    GL.assets = R.reduce(U.mkUpdatedAssets(assetDetails), [], GL.assets);

    // HACK: Assets can only be viewed when all details have been retrieved. Otherwise, transactions will not work.
    if (GL.initCount === R.length(GL.assets)) {
      fetchview('interface', {
        user_keys: R.nth(0, z),
        nonce: R.path(['3', 'current_nonce'], z),
        userid: R.path(['2', 'userID'], z)
      });
      // HACK: Fix race condition for now.......
      setTimeout(function () {
        fetchview('interface.dashboard', args); // UNTIL VIEW IS RENDERED SEPARATELY:
      }, 500);
    }
  }

  animationStream.subscribe();
  powQueueIntervalStream.subscribe(function (_) { POW.loopThroughProofOfWork(); } ); // once every two minutes, loop through proof-of-work queue
  initializationStream.subscribe(initialize_);
  assetsDetailsStream.subscribe(updateAssetDetailsAndRenderDashboardView); // TODO: Separate data retrieval from DOM rendering. Dashboard should be rendered in any case.
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

// EFF ::
function initialize_ (z) {
  var globalAssets = R.nth(0, z);
  var assetsModesAndNames = R.nth(1, z);

  GL.assetnames = mkAssetData(assetsModesAndNames, 'name');
  GL.assetmodes = mkAssetData(assetsModesAndNames, 'mode');
  initializeGlobalAssets(globalAssets);
  Storage.Set(userStorageKey('ff00-0035'), userEncode(globalAssets));
}

function initializeGlobalAssets (assets) {
  return R.compose(
    U.updateGlobalAssets,
    R.map(R.merge({balance: { amount: 'n/a', lastTx: 0 }})),
    R.filter(existsInAssetNames)
  )(assets);
}

function existsInAssetNames (asset) {
  return R.compose(
    R.defaultTo(false),
    R.find(R.equals(R.prop('id', asset))),
    R.keys
  )(GL.assetnames);
}

function initializeAsset (asset) {
  return function (entry) {
    return initAsset(entry, GL.assetmodes[entry], asset); // interface/js/assetInitialisation
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

function decryptData (d) { return R.curry(zchan_obj)(GL.usercrypto)(GL.cur_step)(d); }

assetInitialisationStreams = {
  doAssetInitialisation
}
