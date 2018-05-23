var Storage = storage;
var U = utils;
var D = deterministic_;

initAsset = function (entry, fullMode, init) {
  // Else should throw an error to keep things in Stream
  // if (R.not(R.isNil(entry)) && R.not(R.isNil(fullMode))) {
    var mode = fullMode.split('.')[0];
    var submode = fullMode.split('.')[1];
    var hashMode = R.path(['modehashes', mode], assets);
    // if the deterministic code is already cached client-side
    if (typeof hashMode !== 'undefined') {
      var modeHash = assets.modehashes[mode];
      var modeHashStream = Storage.Get_(modeHash + '-LOCAL');
      return modeHashStream
        .flatMap(getDeterministicData(entry, mode, submode, fullMode, init));
    } // else ?????
  // } // else ?????
};

function mkAssetDetailsStream (init, dcode, submode, entry, fullmode, dterm) {
  var url = 'a/' + entry + '/details/';

  var assetDetailsStream = Rx.Observable
    .fromPromise(hybriddcall({r: url, z: false}))
    .filter(R.propEq('error', 0))
    .map(R.merge({r: '/s/deterministic/hashes', z: true}));

  var assetDetailsResponseStream = assetDetailsStream
      .flatMap(function (properties) {
        return Rx.Observable
          .fromPromise(hybriddReturnProcess(properties));
      })
      .map(function (processData) {
        if (R.isNil(R.prop('data', processData)) && R.equals(R.prop('error', processData), 0)) throw processData;
        return processData;
      })
      .retryWhen(function (errors) { return errors.delay(500); });

  return assetDetailsResponseStream
    .map(updateGlobalAssets(init, dcode, entry, submode, fullmode, dterm));
}

function mkDeterministicDetails (init, dcode, entry, submode, mode, assetDetailsResponse) {
  var deterministic = U.activate(LZString.decompressFromEncodedURIComponent(dcode));
  var keyGenBase = R.path(['data', 'keygen-base'], assetDetailsResponse);
  var seed = D.seedGenerator(keyGenBase);
  var keys = deterministic.keys({symbol: entry, seed, mode: submode});
  var assetDetails = R.mergeAll([
        init,
        R.prop('data', assetDetailsResponse),
        {
          mode,
          seed,
          keys,
          address: deterministic.address(Object.assign(keys, {mode: submode}))
        }
      ]);
  return assetDetails;
}

function updateGlobalAssets (init, dcode, entry, submode, mode) {
  return function (assetDetailsResponse) {
    var hasKeyGenBase = R.not(R.isNil(R.path(['data', 'keygen-base'], assetDetailsResponse)));
    return hasKeyGenBase
      ? mkDeterministicDetails(init, dcode, entry, submode, mode, assetDetailsResponse)
      : R.prop('data', assetDetailsResponse);
  };
}

function setStorageAndMkAssetDetails (init, mode, submode, entry, fullmode, dcode) {
  return function (deterministicCodeResponse) {
    var err = R.prop('error', deterministicCodeResponse);
    if (typeof err !== 'undefined' && R.equals(err, 0)) {
      var dcode = R.prop('data', deterministicCodeResponse);
      Storage.Set(assets.modehashes[mode] + '-LOCAL', dcode);
      return mkAssetDetailsStream(dcode, submode, entry, fullmode, init);
    } else {
      return Rx.Observable.of({error: 'Could not set storage.'}); // TODO: Catch error properly!
    }
  };
}

function reinitializeMode (init, mode, submode, entry, fullmode, dcode) {
  var url = 's/deterministic/code/' + mode;
  var modeStream = Rx.Observable.fromPromise(hybriddcall({r: url, z: 0}));
  var modeResponseStream = modeStream
      .flatMap(function (properties) {
        return Rx.Observable
          .fromPromise(hybriddReturnProcess(properties));
      })
      .map(function (processData) {
        if (R.isNil(R.prop('stopped', processData)) && R.prop('progress', processData) < 1) throw processData;
        return processData;
      })
      .retryWhen(function (errors) { return errors.delay(1000); })
      .flatMap(setStorageAndMkAssetDetails(init, mode, submode, entry, fullmode));

  Storage.Del(assets.modehashes[mode] + '-LOCAL'); // TODO: Make pure!
  return modeResponseStream;
}

function getDeterministicData (entry, mode, submode, fullmode, init) {
  return function (dcode) {
    return R.not(R.isNil(dcode))
      ? mkAssetDetailsStream(init, dcode, submode, entry, fullmode, dcode)
      : reinitializeMode(init, mode, submode, entry, fullmode);
  };
}
