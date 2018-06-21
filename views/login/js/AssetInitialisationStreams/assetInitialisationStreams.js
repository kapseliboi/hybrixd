var A = animations;
var U = utils;
var UserFeedback = userFeedback;

var path = 'api';

var defaultAssetData = [
  { id: 'btc', starred: false },
  { id: 'eth', starred: false }
];

function mkAssetInitializationStream (loginAnimationSubject, z) {
  GL.cur_step = nextStep();
  var assetsModesUrl = path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/details');

  var assetsModesAndNamesStream = rxjs
    .from(U.fetchDataFromUrl(assetsModesUrl, 'Error retrieving asset details.'))
    .pipe(
      rxjs.operators.map(decryptData)
    );

  var deterministicHashesStream = rxjs
    .from(hybriddcall({r: '/s/deterministic/hashes', z: true}))
    .pipe(
      rxjs.operators.switchMap(value => {
        return rxjs.of(value)
          .pipe(
            rxjs.operators.map(function (deterministicHashesResponse) {
              if (R.not(R.propEq('error', 0))) {
                throw { error: 1, msg: 'Could not start process.'};
              } else {
                return deterministicHashesResponse;
              }
            }),
            rxjs.operators.catchError(UserFeedback.resetLoginFlipOverErrorStream)
          );
      }),
      rxjs.operators.filter(R.propEq('error', 0))
    );

  var deterministicHashesResponseProcessStream = deterministicHashesStream
    .pipe(
      rxjs.operators.switchMap(value => {
        return rxjs.of(value)
          .pipe(
            rxjs.operators.flatMap(function (properties) {
              return rxjs
                .from(hybriddReturnProcess(properties));
            }),
            rxjs.operators.map(function (deterministicHashesProcessResponse) {
              if (R.not(R.propEq('error', 0, deterministicHashesProcessResponse))) {
                throw { error: 1, msg: 'Error retrieving deterministic hashes..'};
              } else {
                return deterministicHashesProcessResponse;
              }
            }),
            rxjs.operators.catchError(UserFeedback.resetLoginFlipOverErrorStream)
          );
      }),
      rxjs.operators.filter(R.propEq('error', 0)),
      rxjs.operators.map(R.prop('data')), // VALIDATE?
      rxjs.operators.map(function (deterministicHashes) { assets.modehashes = deterministicHashes; }) // TODO: Make storedUserStream dependent on this stream! USE TAP
    );

  var storedUserDataStream = Storage.Get_(userStorageKey('ff00-0035'))
    .pipe(
      rxjs.operators.map(userDecode),
      rxjs.operators.map(storedOrDefaultUserData) // TODO: make pure!
    );

  var initializationStream = rxjs
    .combineLatest(
      storedUserDataStream,
      assetsModesAndNamesStream,
      deterministicHashesResponseProcessStream
    )
    .pipe(
      rxjs.operators.map(initialize_)
    );

  var assetsDetailsStream = initializationStream
    .pipe(
      rxjs.operators.flatMap(function (initializedData) {
        return rxjs.of(initializedData)
          .pipe(
            rxjs.operators.map(R.nth(0)),
            rxjs.operators.flatMap(a => a), // Flatten Array structure...
            rxjs.operators.filter(existsInAssetNames), // TODO: Now IGNORES assets that have been disabled in the backend. Need to disable / notify user when this occurs.
            rxjs.operators.flatMap(function (asset) {
              return R.compose(
                initializeAsset(asset),
                R.prop('id')
              )(asset);
            }),
            rxjs.operators.map(U.addIcon),
            rxjs.operators.bufferCount(R.length(R.nth(0, initializedData)))
            // rxjs.operators.map(R.assoc('detailedAssets', R.__, {}))
          );
      })
    );

  // var detailedAssetsStream = rxjs
  //   .concat(
  //     // assetsModesAndNamesStream,
  //     // deterministicHashesResponseProcessStream,
  //     // storedUserDataStream,
  //     // initializationStream,
  //     assetsDetailsStream
  //   )
  //   .pipe(
  //     // rxjs.operators.tap(val => loginAnimationSubject.next(val)),
  //     rxjs.operators.delay(500), // HACK: Delay data somewhat so browser gives priority to DOM manipulation instead of initiating all further streams.
  //     rxjs.operators.filter(R.compose(
  //       R.has('detailedAssets'),
  //       R.defaultTo({})
  //     )),
  //     rxjs.operators.map(R.prop('detailedAssets'))
  //   );

  return assetsDetailsStream;
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

  return z;
}

function initializeGlobalAssets (assets) {
  return R.compose(
    U.updateGlobalAssets,
    R.map(R.merge({balance: { amount: 'n/a', lastTx: 0, lastUpdateTime: 0}})),
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
    return initAsset(entry, GL.assetmodes[entry], asset); // TODO: interface/js/assetInitialisation
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

assetInitialisation = {
  mkAssetInitializationStream
};
