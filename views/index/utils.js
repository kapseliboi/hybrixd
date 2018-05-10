var fetch_ = fetch;

sanitizeServerObject = function (obj) {
  var emptyOrIdentityObject = Object.assign({}, obj);
  if (typeof emptyOrIdentityObject.data !== 'undefined') {
    if (emptyOrIdentityObject.data === null) { emptyOrIdentityObject.data = '?'; }
    if (emptyOrIdentityObject.data === 0) { emptyOrIdentityObject.data = '0'; }
  } else {
    emptyOrIdentityObject.data = '?';
  }
  return emptyOrIdentityObject;
};


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
  triggerEvent: function (el, type) {
    if ('createEvent' in document) {
      // modern browsers, IE9+
      var e = document.createEvent('HTMLEvents');
      e.initEvent(type, false, true);
      el.dispatchEvent(e);
    } else {
      // IE 8
      var e = document.createEventObject();
      e.eventType = type;
      el.fireEvent('on'+e.eventType, e);
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
      var assetOrUpdatedDetails = R.equals(R.prop('id', asset), R.prop('symbol', details))
          ? R.merge(asset, details)
          : asset;
      return R.append(assetOrUpdatedDetails, assets);
    };
  },
  retrieveBalance: function (fn, numberOfSignificantDigits, classStr) {
    return function (asset) {
      var assetID = R.prop('id', asset);
      var assetAddress = R.prop('address', asset);
      var hypenizedID = assetID.replace(/\./g, '-');
      var element = classStr + hypenizedID;
      var url = 'a/' + assetID + '/balance/' + assetAddress;

      var balanceStream = H.mkHybriddCallStream(url)
          .map(data => {
            if (R.isNil(R.prop('stopped', data)) && R.prop('progress', data) < 1) throw data;
            return data;
          })
          .retryWhen(function (errors) { return errors.delay(500); });

      balanceStream.subscribe(function (balanceData) {
        var sanitizedData = R.compose(
          R.defaultTo('n/a'),
          R.prop('data'),
          sanitizeServerObject
        )(balanceData);

        fn(element, numberOfSignificantDigits, sanitizedData, assetID);
      });
    };
  },
  setViewTab: function (target) {
    document.querySelectorAll('.pure-menu-link').forEach(function (elem) {
      elem.classList.remove('selected');
    });
    document.querySelector('#topmenu-' + target).classList.add('selected');
  }
};
