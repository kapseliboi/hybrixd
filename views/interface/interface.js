var Valuations = valuations;

var dollarPriceStream = Rx.Observable
    .interval(30000)
    .startWith(0);

function main () {
  document.querySelector('#topmenu-assets').onclick = fetchAssetsViews(pass_args);
  document.querySelector('#topmenu-assets').classList.add('active');
  dollarPriceStream.subscribe(function (_) { Valuations.getDollarPrices(); });
  alertOnBeforeUnload();
}

// EFF ::
function initialize (z) {
  var globalAssets = R.nth(0, z);
  var assetsModesAndNames = R.nth(1, z);

  GL.assetnames = mkAssetData(assetsModesAndNames, 'name');
  GL.assetmodes = mkAssetData(assetsModesAndNames, 'mode');
  initializeGlobalAssets(globalAssets);
  // DEPRECATED: Storage.Set(userStorageKey('ff00-0035'), userEncode(globalAssets))
  //                 .subscribe();
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

function alertOnBeforeUnload () {
  function warning () {
    return 'Are you sure you want to leave?';
  }
  window.onbeforeunload = warning;
}

function fetchAssetsViews (args) { return function () { fetchview('interface.assets', args); }; }

main();
