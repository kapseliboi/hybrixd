var BALANCE_UPDATE_BUFFER_TIME_MS = 300000; // 3 minutes.
var H = hybridd;

function mkBalanceStream (asset) {
  var assetID = R.prop('id', asset);
  var assetAddress = R.prop('address', asset);
  var currentBalance = R.path(['balance', 'amount'], asset);
  var url = 'a/' + assetID + '/balance/' + assetAddress;

  var balanceStream = H.mkHybriddCallStream(url)
    .map(data => {
      if (R.isNil(R.prop('stopped', data)) && R.prop('progress', data) < 1) throw data;
      return data;
    })
    .retryWhen(function (errors) { return errors.delay(1000); })
    .map(R.curry(currentOrUpdatedBalance)(currentBalance, asset))
    .map(R.curry(normalizeBalance)(asset)); // When balance has a previously correct amount, but now returns incorrect, we keep the previously known value.

  return balanceStream;
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

// MOVE: Utility function
function retrieveLatestGlobalAssets () {
  return GL.assets;
}

function updateAssetsBalances (assets) {
  R.forEach(function (asset) {
    Balance.mkBalanceStream(asset)
      .map(R.curry(updateAssetBalance)(asset))
      .subscribe(R.compose(
        U.updateGlobalAssets,
        R.curry(updateAssets)(retrieveLatestGlobalAssets)
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
  updateAssetsBalances
};
