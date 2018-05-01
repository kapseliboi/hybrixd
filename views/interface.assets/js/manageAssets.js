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
        R.map(mkNewAssetEntry),
        R.filter(entryIsSelected),
        R.keys
      )(GL.assetnames);
      var newActiveAssetsForStorage = R.map(R.pick(['id', 'starred']), newActiveAssets);
      var assetsDetailsStream = Rx.Observable.from(newActiveAssetsForStorage)
          .flatMap(R.compose(
            initializeAsset,
            R.prop('id')
          ));

      // GLOBAL STUFF
      storage.Set(userStorageKey('ff00-0034'), userEncode(newActiveAssetsForStorage));
      // MAKE SIMPLER!!!!
      GL.assets = newActiveAssets;
      assetsDetailsStream.subscribe(assetDetails => {
        GL.assets = R.reduce(U.mkUpdatedAssets(assetDetails), [], GL.assets); // MAKE SIMPLER!!!!
        cb(); // RE-RENDER VIEW
      });
    };
  },
  manageAssets: function () {
    GL.assetSelect = [];
    for (var entry in GL.assetnames) {
      var assetAlreadyExists = R.not(R.isNil(R.find(R.propEq('id', entry), GL.assets)));
      var hasCorrectType = typeof GL.assetSelect[entry] === 'undefined' || typeof GL.assetSelect[entry] === 'function';

      GL.assetSelect[entry] = hasCorrectType ? assetAlreadyExists : false;
    }
  }
};

function mkNewAssetEntry (assetName) { return { id: assetName, starred: false, balance: {amount: 0, lastTx: 0} }; }
function entryIsSelected (entry) { return GL.assetSelect[entry]; } // R.has...? R.hasIn???
function initializeAsset (entry) { return initAsset(entry, R.prop(entry, GL.assetmodes)); }
