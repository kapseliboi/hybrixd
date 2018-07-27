import { utils_ } from '../../../index/utils.js';
import { Storage } from './../../../interface/js/storage.js';
import * as R from 'ramda';

export function setStarredAssetClass (assetID, isStarred) {
  var id = '#' + assetID.replace(/\./g, '_'); // Mk into function. Being used elsewhere too.
  var addOrRemoveClass = isStarred ? 'add' : 'remove';
  document.querySelector(id + ' > svg').classList[addOrRemoveClass]('starred');
}

function maybeUpdateStarredProp (assetID) {
  return function (acc, asset) {
    var starredLens = R.lensProp('starred');
    var toggledStarredValue = R.not(R.view(starredLens, asset));

    return R.compose(
      R.append(R.__, acc),
      R.when(
        function (a) { return R.equals(R.prop('id', a), assetID); },
        R.set(starredLens, toggledStarredValue)
      )
    )(asset);
  };
}

window.toggleStar = function (assetID) {
  var globalAssets = GL.assets;
  var updatedGlobalAssets = R.reduce(maybeUpdateStarredProp(assetID), [], globalAssets);
  var starredForStorage = R.map(R.pickAll(['id', 'starred']), updatedGlobalAssets);
  var isStarred = R.compose(
    R.defaultTo(false),
    R.prop('starred'),
    R.find(R.propEq('id', assetID))
  )(updatedGlobalAssets);

  Storage.Set(userStorageKey('ff00-0035'), userEncode(starredForStorage)).subscribe();
  utils_.updateGlobalAssets(updatedGlobalAssets);
  setStarredAssetClass(assetID, isStarred);
};
