var A = animations;
var U = utils;
var S = loginInputStreams;
var POW = proofOfWork_;

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

  var assetsModesAndNamesStream = rxjs
    .from(U.fetchDataFromUrl(assetsModesUrl, 'Error retrieving asset details.'))
    .pipe(
      rxjs.operators.map(decryptData)
    );

  var initialAnimationStateStream = rxjs.interval(200)
    .pipe(
      rxjs.operators.startWith(0),
      rxjs.operators.take(2)
    );

  var deterministicHashesStream = rxjs
    .from(hybriddcall({r: '/s/deterministic/hashes', z: true}))
    .pipe(
      rxjs.operators.filter(R.propEq('error', 0))
    );

  var deterministicHashesResponseProcessStream = deterministicHashesStream
    .pipe(
      rxjs.operators.flatMap(function (properties) {
        return rxjs
          .from(hybriddReturnProcess(properties));
      }),
      rxjs.operators.map(R.when(
        R.propEq('error', 1),
        function (_) { throw _; }
      )),
      // rxjs.operators.map(_ => {
      //   throw { error: 1, msg: 'meh'};
      // }),
      rxjs.operators.switchMap(value => {
        return rxjs.of(value)
          .pipe(
            rxjs.operators.catchError(e => rxjs.of(e))
          );
      }),
      rxjs.operators.map(R.prop('data')), // VALIDATE?
      rxjs.operators.map(function (deterministicHashes) { assets.modehashes = deterministicHashes; }) // TODO: Make storedUserStream dependent on this stream!
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
      rxjs.operators.tap(initialize_)
    );

  var assetsDetailsStream = initializationStream
    .pipe(
      rxjs.operators.flatMap(function (initializedData) {
        return rxjs.of(initializedData)
          .pipe(
            rxjs.operators.map(R.nth(0)),
            rxjs.operators.flatMap(a => a), // Flatten Array structure...
            rxjs.operators.filter(existsInAssetNames), // TODO: Now REMOVES assets that have been disabled in the backend. Need to disable / notify user when this occurs.
            rxjs.operators.flatMap(function (asset) {
              return R.compose(
                initializeAsset(asset),
                R.prop('id')
              )(asset);
            }),
            rxjs.operators.map(U.addIcon),
            rxjs.operators.bufferCount(R.length(R.nth(0, initializedData)))
          );
      })
    );

    // .retry(_ => {
    //   resetFlipOverAnimation();
    //   return Rx.Observable.of(_);
    // });

  var animationStream = rxjs
    .concat(
      initialAnimationStateStream,
      storedUserDataStream,
      assetsModesAndNamesStream,
      deterministicHashesResponseProcessStream,
      assetsDetailsStream
    )
    .pipe(
      rxjs.operators.scan(function (acc, curr) { return acc + 1; }),
      rxjs.operators.map(function (n) { return n <= ANIMATION_STEPS ? n : ANIMATION_STEPS; }),
      rxjs.operators.map(A.doProgressAnimation),
      rxjs.operators.retry(_ => {
        resetFlipOverAnimation();
        return rxjs.of(_);
      })
    );

  var powQueueIntervalStream = rxjs
    .interval(30000);

  // animationStream.subscribe();
  // powQueueIntervalStream.subscribe(function (_) { POW.loopThroughProofOfWork(); }); // once every two minutes, loop through proof-of-work queue
  // initializationStream.subscribe(initialize_);
  // assetsDetailsStream.subscribe(updateAssetDetailsAndRenderDashboardView); // TODO: Separate data retrieval from DOM rendering. Dashboard should be rendered in any case.
  return assetsDetailsStream;
}

function resetFlipOverAnimation () {
  document.querySelector('.flipper').classList.remove('active'); // FLIP LOGIN FORM BACK
  document.querySelector('#generateform').classList.remove('inactive');
  document.querySelector('#alertbutton').classList.remove('inactive');
  document.querySelector('#helpbutton').classList.remove('inactive');
  document.querySelector('.user-login-notification').classList.add('active');
  document.querySelector('.user-login-notification').innerHTML = 'Something went wrong while loading your wallet. </br> </br> Please try again.';
  loginModule.validatedUserCredentialsStream.subscribe(loginModule.continueLoginOrNotifyUser);
  S.credentialsStream.subscribe(loginModule.disableUserNotificationBox);
}

// EFF ::
function updateAssetDetailsAndRenderDashboardView (assetDetails) {
  if (R.equals(assetDetails, 'meh')) { return; }
  GL.initCount += 1; // HACK!
  GL.assets = R.reduce(U.mkUpdatedAssets(assetDetails), [], GL.assets);

  // HACK: Assets can only be viewed when all details have been retrieved. Otherwise, transactions will not work.
  if (GL.initCount === R.length(GL.assets)) {
    fetchview('interface');
  }
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
};
