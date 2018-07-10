var H = hybridd;
var BALANCE_UPDATE_BUFFER_TIME_MS = 300000; // 3 minutes.

function mkBalanceStream (asset) {
  var assetID = R.prop('id', asset);
  var assetAddress = R.prop('address', asset);
  var currentBalance = R.path(['balance', 'amount'], asset);
  var url = 'a/' + assetID + '/balance/' + assetAddress;

  var balanceStream = H.mkHybriddCallStream(url)
    .pipe(
      rxjs.operators.map(function (data) {
        if (R.isNil(R.prop('stopped', data)) && R.prop('progress', data) < 1) throw data;
        return data;
      }),
      rxjs.operators.retryWhen(function (errors) { return rxjs.timer(1000); }),
      rxjs.operators.map(R.curry(currentOrUpdatedBalance)(currentBalance, asset)),
      rxjs.operators.map(R.curry(normalizeBalance)(asset)) // When balance has a previously correct amount, but now returns incorrect, we keep the previously known value.
    );

  return balanceStream;
}

function assetOrError (asset) {
  var hasBeenUpdated = R.compose(
    R.compose(
      R.not,
      R.equals(0)
    ),
    R.path(['balance', 'lastUpdateTime'])
  )(asset);

  if (hasBeenUpdated) {
    return asset;
  } else {
    throw {error: 1, msg: 'Balance has not been updated yet.'};
  }
}

function mkRenderBalancesStream (intervalStream, q, n, assetsIDs) {
  var assetsIDsStream = rxjs.from(assetsIDs)
    .pipe(
      rxjs.operators.flatMap(function (assetID) {
        return rxjs.of(assetID)
          .pipe(
            rxjs.operators.map(U.findAsset),
            rxjs.operators.map(assetOrError),
            rxjs.operators.retryWhen(function (errors) { return errors.delay(500); }),
            rxjs.operators.delay(500), // HACK: Make sure assets are rendered in DOM before rendering balances in elements.
            rxjs.operators.map(function (asset) {
              var hyphenizedID = R.compose(
                R.replace('.', '-'),
                R.prop('id')
              )(asset);
              var assetQuery = q + hyphenizedID;
              // TODO move to subscribe
              R.compose(
                R.curry(U.renderDataInDom)(assetQuery, n),
                R.path(['balance', 'amount'])
              )(asset);

              return {
                element: assetQuery,
                assetID,
                amountStr: R.path(['balance', 'amount'], asset)
              };
            })
          );
      })
    );

  var initAssetsIDsStream = intervalStream
    .pipe(
      rxjs.operators.flatMap(function (_) {
        return assetsIDsStream;
      })
    );

  return initAssetsIDsStream;
}

// Add timestamp?
function normalizeBalance (asset, balanceData) {
  var currentBalance = R.path(['balance', 'amount'], asset);
  return R.compose(
    R.curry(lastKnownOrNewBalance)(currentBalance),
    R.defaultTo('n/a'),
    R.prop('data'),
    sanitizeServerObject
  )(balanceData);
}

function sanitizeServerObject (res) {
  var emptyOrIdentityObject = R.merge({}, res);
  return R.compose(
    R.assoc('data', R.__, emptyOrIdentityObject),
    R.ifElse(
      R.equals(0),
      R.toString,
      R.identity
    ),
    R.when(
      R.anyPass([
        R.equals('?'),
        R.isNil
      ]),
      R.always('n/a')
    ),
    R.prop('data')
  )(emptyOrIdentityObject);
}

function lastKnownOrNewBalance (currentBalance, newData) {
  var currentBalanceHasDefaultValue = R.not(isNaN(Number(currentBalance)));
  return newData === 'n/a' &&
    currentBalanceHasDefaultValue
    ? currentBalance
    : newData;
}

function currentOrUpdatedBalance (currentBalance, asset, balanceData) {
  var lastTxTime = R.path(['balance', 'lastTx'], asset);
  var currentTime = Date.now();

  return currentTime > lastTxTime + BALANCE_UPDATE_BUFFER_TIME_MS
    ? balanceData
    : { data: currentBalance };
}

function updateAssetsBalances (assets) {
  R.forEach(function (asset) {
    Balance.mkBalanceStream(asset)
      .pipe(
        rxjs.operators.map(R.curry(updateAssetBalance)(asset))
      )
      .subscribe(R.compose(
        U.updateGlobalAssets,
        R.curry(updateAssets)(U.getGlobalAssets)
      ));
  }, assets);
}

// HACK: assetsFn makes sure we get the latest data from GL.assets...
function updateAssets (assetsFn, updatedAsset) {
  return R.reduce(function (newAssets, asset) {
    return R.compose(
      R.flip(R.append)(newAssets),
      R.unless(
        R.eqProps('id', R.__, asset),
        R.always(asset)
      )
    )(updatedAsset);
  }, [], assetsFn());
}

function updateAssetBalance (a, balance) {
  return R.compose(
    R.assocPath(['balance', 'lastUpdateTime'], Date.now()),
    R.assocPath(['balance', 'amount'], R.__, a)
  )(balance);
}

balance = {
  mkBalanceStream,
  updateAssetsBalances,
  mkRenderBalancesStream
};
