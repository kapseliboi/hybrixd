import { Storage } from './storage.js';
import { deterministic_ } from './deterministic.js';
import { hybridd } from './hybriddcall.js';

import * as R from 'ramda';

import { from } from 'rxjs/observable/from';
import { of } from 'rxjs/observable/of';
import { timer } from 'rxjs/observable/timer';
import { map, filter, flatMap, retryWhen, delayWhen } from 'rxjs/operators';

export function initAsset (entry, fullMode, init) {
  var mode = fullMode.split('.')[0];
  var submode = fullMode.split('.')[1];
  var modeHash = R.path(['modehashes', mode], assets);

  // if the deterministic code is already cached client-side
  return R.not(R.isNil(modeHash))
    ? Storage.Get_(modeHash + '-LOCAL')
      .pipe(
        flatMap(getDeterministicData(entry, mode, submode, fullMode, init))
      )
    : of(init); // TODO: Give asset 'disabled' prop?
}

function mkAssetDetailsStream (init, dcode, submode, entry, fullmode) {
  var url = 'a/' + entry + '/details/';

  var assetDetailsStream = from(hybridd.hybriddcall({r: url, z: false}))
    .pipe(
      filter(R.propEq('error', 0)),
      map(R.merge({r: '/s/deterministic/hashes', z: true}))
    );

  var assetDetailsResponseStream = assetDetailsStream
    .pipe(
      flatMap(function (properties) {
        return from(hybridd.hybriddReturnProcess(properties));
      }),
      map(function (processData) {
        if (R.isNil(R.prop('data', processData)) && R.equals(R.prop('error', processData), 0)) throw processData;
        return processData;
      }),
      retryWhen(function (errors) {
        return errors.pipe(
          delayWhen(_ => timer(500))
        );
      })
    );

  return assetDetailsResponseStream
    .pipe(
      map(R.prop('data')),
      map(updateAsset(init, dcode, entry, submode, fullmode))
    );
}

// TODO: Split concerns and move effects up.
function setStorageAndMkAssetDetails (init, mode, submode, entry, fullmode, dcode) {
  return function (deterministicCodeResponse) {
    var err = R.prop('error', deterministicCodeResponse);
    var dcode = R.prop('data', deterministicCodeResponse);

    Storage.Del(assets.modehashes[mode] + '-LOCAL');

    if (typeof err !== 'undefined' && R.equals(err, 0)) {
      Storage.Set(assets.modehashes[mode] + '-LOCAL', dcode);
      return mkAssetDetailsStream(init, dcode, submode, entry, fullmode);
    } else {
      return of(init); // TODO: Catch error properly!
    }
  };
}

// TODO: Make pure!
function reinitializeDeterministicMode (init, mode, submode, entry, fullmode) {
  var url = 's/deterministic/code/' + mode;
  var modeStream = from(hybridd.hybriddcall({r: url, z: 0}));
  var modeResponseStream = modeStream
    .pipe(
      flatMap(function (properties) {
        return from(hybridd.hybriddReturnProcess(properties));
      }),
      map(function (processData) {
        if (R.isNil(R.prop('stopped', processData)) && R.prop('progress', processData) < 1) throw processData;
        return processData;
      }),
      retryWhen(function (errors) {
        return errors.pipe(
          delayWhen(_ => timer(1000))
        );
      })
    );

  return modeResponseStream;
}

function mkAssetDetails (initialDetails, dcode, entry, submode, mode, assetDetails) {
  var keyGenBase = R.prop('keygen-base', assetDetails);
  var deterministicDetails = deterministic_.mkDeterministicDetails(dcode, entry, submode, mode, keyGenBase);
  return R.mergeAll([
    initialDetails,
    assetDetails,
    deterministicDetails
  ]);
}

function updateAsset (init, dcode, entry, submode, mode) {
  return function (assetDetails) {
    var hasKeyGenBase = R.compose(
      R.not,
      R.isNil,
      R.prop('keygen-base')
    )(assetDetails);

    return hasKeyGenBase
      ? mkAssetDetails(init, dcode, entry, submode, mode, assetDetails)
      : assetDetails;
  };
}

function getDeterministicData (entry, mode, submode, fullmode, init) {
  return function (dcode) {
    return R.not(R.isNil(dcode))
      ? mkAssetDetailsStream(init, dcode, submode, entry, fullmode)
      : reinitializeDeterministicMode(init, mode, submode, entry, fullmode)
        .pipe(
          flatMap(setStorageAndMkAssetDetails(init, mode, submode, entry, fullmode))
        );
  };
}
