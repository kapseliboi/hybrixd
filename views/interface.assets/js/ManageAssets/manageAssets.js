import { utils_ } from './../../../index/utils.js';
import * as R from 'ramda';
import { Storage } from './../../../interface/js/storage.js';
import { black } from './../../../files/svg/black.js';

import { initAsset } from './../../../interface/js/assetInitialization.js';

import { from } from 'rxjs/observable/from';
import { map, flatMap, bufferCount } from 'rxjs/operators';

var uiIcons = svg;

export var manageAssets = {
  renderManageButton: function (element, asset, active) {
    var activeToggled = R.not(active);
    var btnText = active ? 'Hide' : 'Show';
    var btnClass = active ? 'pure-button-error selectedAsset' : 'pure-button-success';
    var svgName = active ? 'hide' : 'show';

    return '<a onclick="changeManageButton(\'' + element + '\',\'' + asset + '\',' + activeToggled + ');" class="pure-button ' + btnClass + '" role="button"><div class="actions-icon">' + R.prop(svgName, uiIcons) + '</div>' + btnText + '</a>';
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

        return R.equals(key, assetID) // TODO: factor assetID up.
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
      var newActiveAssets = mkNewActiveAssets(GL.assetnames);
      var newActiveAssetsForStorage = R.map(R.pick(['id', 'starred']), newActiveAssets);
      console.log('newActiveAssetsForStorage = ', newActiveAssetsForStorage);
      var newAssetsToInitialize = R.filter(idDoesNotExist, newActiveAssetsForStorage);
      console.log('newAssetsToInitialize = ', newAssetsToInitialize);

      var assetsDetailsStream = R.isEmpty(newAssetsToInitialize)
        ? from([[]])
        : from(newAssetsToInitialize)
          .pipe(
            flatMap(function (asset) {
              return R.compose(
                initializeAsset(asset),
                R.prop('id')
              )(asset);
            }),
            map(utils_.addIcon),
            bufferCount(R.length(newAssetsToInitialize))
          );

      assetsDetailsStream.subscribe(assetsDetails => {
        var newGlobalAssets = R.reduce(function (newAssets, asset) {
          return R.compose(
            R.sortBy(R.compose(R.toLower, R.prop('id'))),
            R.flip(R.append)(newAssets),
            R.merge(asset),
            R.defaultTo(asset),
            R.find(R.eqProps('id', asset))
          )(assetsDetails);
        }, [], newActiveAssets);

        // GLOBAL STUFF
        Storage.Set(userStorageKey('ff00-0035'), userEncode(newActiveAssetsForStorage))
          .subscribe(function (_) {});
        utils_.updateGlobalAssets(newGlobalAssets);
        cb(); // RE-RENDER VIEW
      });
    };
  },
  manageAssets: function () {
    GL.assetSelect = R.compose(
      R.map(mkAssetExistsObj),
      R.keys
    )(GL.assetnames);
  }
};

function mkAssetExistsObj (name) {
  var assetAlreadyExists = R.compose(
    R.not,
    R.isNil,
    R.find(R.propEq('id', name))
  )(GL.assets);

  return R.assoc(name, assetAlreadyExists, {});
}

function idDoesNotExist (asset) {
  return R.compose(
    R.not,
    R.any(R.propEq('id', R.prop('id', asset)))
  )(GL.assets);
}

function mkNewActiveAssets (names) {
  return R.compose(
    R.map(existingOrNewAssetEntry),
    R.filter(assetIsSelected),
    R.keys
  )(names);
}

function assetIsSelected (a) {
  return R.compose(
    R.not,
    R.isNil,
    R.find(R.prop(a))
  )(GL.assetSelect);
}

function existingOrNewAssetEntry (assetName) {
  var defaultAsset = { id: assetName, starred: false, balance: {amount: 0, lastTx: 0} };
  return R.compose(
    R.defaultTo(defaultAsset),
    R.find(R.propEq('id', assetName))
  )(GL.assets);
}

function initializeAsset (asset) { return function (entry) { return initAsset(entry, R.prop(entry, GL.assetmodes), asset); }; }
