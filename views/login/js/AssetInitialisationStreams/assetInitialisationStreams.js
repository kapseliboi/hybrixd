import { animations } from './../animations.js';
import { utils_ } from './../../../index/utils.js';
import { userFeedback } from './../UserFeedback/userFeedback.js';
import { Storage } from './../../../interface/js/Storage.js';
import { commonUtils } from './../../../common/index.js';
import { hybridd } from './../../../interface/js/hybriddcall.js';
import { initAsset } from './../../../interface/js/assetInitialization.js';

import * as R from 'ramda';

import { from } from 'rxjs/observable/from';
import { of } from 'rxjs/observable/of';
import { merge } from 'rxjs/observable/merge';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { empty } from 'rxjs/observable/empty';
import { scan, bufferCount, map, filter, flatMap, catchError, tap, switchMap, withLatestFrom } from 'rxjs/operators';

var path = 'api';

var defaultAssetData = [
  { id: 'btc', starred: false },
  { id: 'eth', starred: false }
];

function mkAssetInitializationStream (z) {
  GL.cur_step = commonUtils.nextStep();
  var assetsModesUrl = path + zchan(GL.usercrypto, GL.cur_step, 'l/asset/details');

  var assetsModesAndNamesStream = from(utils_.fetchDataFromUrl(assetsModesUrl, 'Error retrieving asset details.'))
    .pipe(
      map(decryptData)
    );

  var deterministicHashesStream = from(hybridd.hybriddcall({r: '/s/deterministic/hashes', z: true}))
    .pipe(
      switchMap(value => {
        return of(value)
          .pipe(
            map(function (deterministicHashesResponse) {
              if (R.not(R.propEq('error', 0))) {
                throw { error: 1, msg: 'Could not start process.'};
              } else {
                return deterministicHashesResponse;
              }
            }),
            catchError(userFeedback.resetLoginFlipOverErrorStream)
          );
      }),
      filter(R.propEq('error', 0))
    );

  var deterministicHashesResponseProcessStream = deterministicHashesStream
    .pipe(
      switchMap(function (value) {
        return of(value)
          .pipe(
            flatMap(function (properties) {
              return from(hybridd.hybriddReturnProcess(properties));
            }),
            map(function (deterministicHashesProcessResponse) {
              if (R.not(R.propEq('error', 0, deterministicHashesProcessResponse))) {
                throw { error: 1, msg: 'Error retrieving deterministic hashes..'};
              } else {
                return deterministicHashesProcessResponse;
              }
            }),
            catchError(userFeedback.resetLoginFlipOverErrorStream)
          );
      }),
      filter(R.propEq('error', 0)),
      map(R.prop('data')), // VALIDATE?
      tap(function (deterministicHashes) { assets.modehashes = deterministicHashes; }) // TODO: Make storedUserStream dependent on this stream! USE TAP
    );

  var storedUserDataStream = Storage.Get_(userStorageKey('ff00-0035'))
    .pipe(
      map(userDecode),
      map(storedOrDefaultUserData) // TODO: make pure!
    );

  var initializationStream = combineLatest(
    storedUserDataStream,
    assetsModesAndNamesStream,
    deterministicHashesResponseProcessStream
  )
    .pipe(
      map(setAssetModesAndNames),
      map(initialize_)
    );

  var assetsDetailsStream = initializationStream
    .pipe(
      flatMap(function (initializedData) {
        return of(initializedData)
          .pipe(
            flatMap(function (a) { return a; }), // Flatten Array structure...
            filter(existsInAssetNames), // TODO: Now IGNORES assets that have been disabled in the backend. Need to disable / notify user when this occurs.
            flatMap(function (asset) {
              return R.compose(
                initializeAsset(asset),
                R.prop('id')
              )(asset);
            }),
            map(utils_.addIcon),
            bufferCount(R.length(initializedData))
          );
      })
    );

  var finalizedWalletStream = empty()
    .pipe(
      withLatestFrom(assetsDetailsStream)
    );

  var assetsDetailsAnimationStream = merge(
    animations.initialAnimationStateStream(1),
    assetsModesAndNamesStream,
    deterministicHashesResponseProcessStream,
    storedUserDataStream,
    initializationStream,
    finalizedWalletStream
  )
    .pipe(
      scan(R.inc),
      map(R.when(
        R.lte(animations.ANIMATION_STEPS),
        R.always(animations.ANIMATION_STEPS)
      )),
      map(animations.doProgressAnimation)
    );

  // TODO: Refactor. Can''t modularize now, because CSS is not being rendered at the same time streams are being initialized.
  assetsDetailsAnimationStream.subscribe();

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

function setAssetModesAndNames (z) {
  var assetsModesAndNames = R.nth(1, z);
  GL.assetnames = mkAssetData(assetsModesAndNames, 'name');
  GL.assetmodes = mkAssetData(assetsModesAndNames, 'mode');
  return z;
}

// EFF ::
function initialize_ (z) {
  var globalAssets = R.nth(0, z);
  var initializedGlobalAssets = initializeGlobalAssets(globalAssets);

  Storage.Set(userStorageKey('ff00-0035'), userEncode(initializedGlobalAssets));
  utils_.updateGlobalAssets(initializedGlobalAssets);

  return initializedGlobalAssets;
}

function initializeGlobalAssets (assets) {
  return R.compose(
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

export var assetInitialisation = {
  mkAssetInitializationStream
};
