initAsset = function (entry, fullmode, init) {
  var mode = fullmode.split('.')[0];
  var submode = fullmode.split('.')[1];
  var hashMode = R.path(['modehashes', mode], assets);
  // if the deterministic code is already cached client-side
  if (typeof hashMode !== 'undefined') {
    var modeHashStream = Storage.Get_(assets.modehashes[mode] + '-LOCAL');
    return modeHashStream
      .flatMap(getDeterministicData(entry, mode, submode, fullmode, init));
  } // else ?????
};

function mkAssetDetailsStream (init, deterministic, submode, entry, fullmode) {
  var url = 'a/' + entry + '/details/';
  var seed = deterministicSeedGenerator(entry);
  var keys = deterministic.keys({symbol: entry, seed, mode: submode});
  var addr = deterministic.address(Object.assign(keys, {mode: submode}));

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
      .retryWhen(function (errors) { return errors.delay(500); })

  return assetDetailsResponseStream
    .map(updateGlobalAssets(init, seed, keys, addr, fullmode));
}

function updateGlobalAssets (init, seed, keys, addr, mode) {
  return function (assetDetailsResponse) {
    var assetDetails = R.mergeAll([
      init,
      R.prop('data', assetDetailsResponse),
      {
        mode,
        seed,
        keys,
        address: addr
      }
    ]);
    return assetDetails;
  };
}

function initializeDetermisticAndMkDetailsStream (dcode, submode, entry, fullmode, init) {
  var deterministic = deterministic = activate(LZString.decompressFromEncodedURIComponent(dcode));
  return mkAssetDetailsStream(init, deterministic, submode, entry, fullmode);
}

function setStorageAndMkAssetDetails (init, mode, submode, entry, fullmode) {
  return function (deterministicCodeResponse) {
    var err = R.prop('error', deterministicCodeResponse);
    if (typeof err !== 'undefined' && R.equals(err, 0)) {
      var deterministic = deterministic = activate(LZString.decompressFromEncodedURIComponent(deterministicCodeResponse.data)); // decompress and make able to run the deterministic routine
      Storage.Set(assets.modehashes[mode] + '-LOCAL', R.prop('data', deterministicCodeResponse));
      return mkAssetDetailsStream(init, deterministic, submode, entry, fullmode);
    } else {
      return Rx.Observable.of({error: 'Could not set storage.'}); // TODO: Catch error properly!
    }
  };
}

function reinitializeMode (init, mode, submode, entry, fullmode) {
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
      .map(setStorageAndMkAssetDetails(init, mode, submode, entry, fullmode));

  Storage.Del(assets.modehashes[mode] + '-LOCAL'); // TODO: Make pure!
  return modeResponseStream;
}

function getDeterministicData (entry, mode, submode, fullmode, init) {
  return function (dcode) {
    return R.not(R.isNil(dcode))
      ? initializeDetermisticAndMkDetailsStream(dcode, submode, entry, fullmode, init)
      : reinitializeMode(init, mode, submode, entry, fullmode);
  };
}

// activate (deterministic) code from a string
function activate (code) {
  if (typeof code === 'string') {
    eval('var deterministic = (function(){})(); ' + code); // interpret deterministic library into an object
    return deterministic;
  } else {
    console.log('Cannot activate deterministic code!');
    return function () {};
  }
};

// creates a unique seed for deterministic asset code
function deterministicSeedGenerator (asset) {
  // this salt need not be too long (if changed: adjust slice according to tests)
  var salt = '1nT3rN3t0Fc01NsB1nD5tH3cRyPt05Ph3R3t093Th3Rf0Rp30Pl3L1k3M34nDy0U';
  // slightly increases entropy by XOR obfuscating and mixing data with a key
  function xorEntropyMix (key, str) {
    var c = '';
    var k = 0;
    for (i = 0; i < str.length; i++) {
      c += String.fromCharCode(str[i].charCodeAt(0).toString(10) ^ key[k].charCodeAt(0).toString(10)); // XORing with key
      k++;
      if (k >= key.length) { k = 0; }
    }
    return c;
  }
  // return deterministic seed
  return UrlBase64.Encode(xorEntropyMix(nacl.to_hex(GL.usercrypto.user_keys.boxPk), xorEntropyMix(asset.split('.')[0], xorEntropyMix(salt, nacl.to_hex(GL.usercrypto.user_keys.boxSk))))).slice(0, -2);
}
