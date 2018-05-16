var U = utils;

var manageAssets = {
  renderManageButton: function (element, asset, active) {
    var activeToggled = R.not(active);
    var btnText = active ? 'Remove' : 'Add';
    var btnClass = active ? 'pure-button-error selectedAsset' : 'pure-button-success';
    var svgName = active ? 'remove' : 'add';

    return '<a onclick="changeManageButton(\'' + element + '\',\'' + asset + '\',' + activeToggled + ');" class="pure-button ' + btnClass + '" role="button"><div class="actions-icon">' + svg[svgName] + '</div>' + btnText + '</a>';
  },
  changeManageButton: function (cb) {
    return function (element, asset, active) {
      GL.assetSelect[asset] = active;
      document.querySelector('#manage-assets .assetbuttons-' + element).innerHTML = cb(element, asset, active);
    };
  },
  saveAssetList: function (cb) {
    return function () {
      var newActiveAssets = R.compose(
        R.map(existingOrNewAssetEntry),
        R.filter(entryIsSelected),
        R.keys
      )(GL.assetnames);
      var newActiveAssetsForStorage = R.map(R.pick(['id', 'starred']), newActiveAssets);
      var newAssetsToInitialize = R.filter(idDoesNotExist, newActiveAssetsForStorage);
      var assetsDetailsStream = R.isEmpty(newAssetsToInitialize)
        ? Rx.Observable.from([[]])
        : Rx.Observable.from(newAssetsToInitialize)
          .flatMap(function (asset) {
            return R.compose(
              initializeAsset(asset),
              R.prop('id')
            )(asset);
          })
          .bufferCount(R.length(newAssetsToInitialize));

      assetsDetailsStream.subscribe(assetsDetails => {
        var newGlobalAssets = R.reduce(function (newAssets, asset) {
          return R.compose(
            R.flip(R.append)(newAssets),
            R.merge(asset),
            R.defaultTo(asset),
            R.find(R.eqProps('id', asset))
          )(assetsDetails);
        }, [], newActiveAssets);

        // GLOBAL STUFF
        storage.Set(userStorageKey('ff00-0035'), userEncode(newActiveAssetsForStorage));
        U.updateGlobalAssets(newGlobalAssets);
        cb(); // RE-RENDER VIEW
      });
    };
  },
  manageAssets: function () {
    GL.assetSelect = [];
    for (var assetName in GL.assetnames) {
      var assetAlreadyExists = R.compose(
        R.not,
        R.isNil,
        R.find(R.propEq('id', assetName))
      )(GL.assets);
      var hasCorrectType = typeof GL.assetSelect[assetName] === 'undefined' || typeof GL.assetSelect[assetName] === 'function';

      GL.assetSelect[assetName] = hasCorrectType ? assetAlreadyExists : false;
    }
  }
};

function idDoesNotExist (asset) {
  return R.compose(
    R.not,
    R.any(R.propEq('id', asset.id))
  )(GL.assets);
}

function existingOrNewAssetEntry (assetName) {
  var foo = { id: assetName, starred: false, balance: {amount: 0, lastTx: 0} };
  return R.compose(
    R.defaultTo(foo),
    R.find(R.propEq('id', assetName))
  )(GL.assets);
}
function entryIsSelected (entry) { return GL.assetSelect[entry]; } // R.has...? R.hasIn???
function initializeAsset (asset) { return function (entry) { return initAsset(entry, R.prop(entry, GL.assetmodes), asset); }; }
