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
    return function (element, assetID, active) {

      R.compose(
        updateGlobalAssetsAndRenderInDom,
        R.map(updateAsset)
      )(GL.assetSelect);

      function updateAsset (a) {
        var key = R.compose(
          R.nth(0),
          R.keys
        )(a);

        return R.equals(key, assetID)
          ? R.assoc(key, active, {})
          : a;
      }

      // EFF ::
      function updateGlobalAssetsAndRenderInDom (assets) {
        GL.assetSelect = assets;
        document.querySelector('#manage-assets .assetbuttons-' + element).innerHTML = cb(element, assetID, active);
      }
    };
  },
  saveAssetList: function (cb) {
    return function () {
      var newActiveAssets = R.compose(
        R.map(existingOrNewAssetEntry),
        R.filter(function (a) {
          return R.compose(
            R.not,
            R.isNil,
            R.find(R.prop(a))
          )(GL.assetSelect);
        }),
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
    function mkAssetExistsObj (name) {
      var assetAlreadyExists = R.compose(
        R.not,
        R.isNil,
        R.find(R.propEq('id', name))
      )(GL.assets);

      return R.assoc(name, assetAlreadyExists, {});
    }

    GL.assetSelect = R.compose(
      R.map(mkAssetExistsObj),
      R.keys
    )(GL.assetnames);
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

function initializeAsset (asset) { return function (entry) { return initAsset(entry, R.prop(entry, GL.assetmodes), asset); }; }
