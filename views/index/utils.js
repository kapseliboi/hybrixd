var fetch_ = fetch;

utils = {
  documentReady: function (fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      document.attachEvent('onreadystatechange', function () {
        if (document.readyState !== 'loading') {
          fn();
        }
      });
    }
  },
  fetchDataFromUrl: function (url, errStr) {
    return fetch_(url)
      .then(r => r.json()
            .then(r => r)
            .catch(e => console.log(errStr, e)))
      .catch(e => console.log(errStr, e));
  },
  getCurrentTime: function () {
    var currentTime = new Date;
    return currentTime.getTime();
  },
  updateGlobalAssets: function (a) {
    GL.assets = a;
  },
  getTargetValue: function (e) {
    return e.target.value;
  },
  mkUpdatedAssets: function (details) {
    return function (assets, asset) {
      var assetOrUpdatedDetails = R.equals(asset.id, details.symbol)
          ? R.merge(asset, details)
          : asset;
      return R.append(assetOrUpdatedDetails, assets);
    };
  }
};
