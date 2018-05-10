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
          .retryWhen(function (errors) { return errors.delay(1000); });

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
  },
  formatFloatInHtmlStr: function (amount, maxLengthSignificantDigits) {
    var normalizedAmount = Number(amount);

    function regularOrZeroedBalance (maxLen, balanceStr) {
      var decimalNumberString = balanceStr.substring(2).split('');
      var zeros = '0.' + R.takeWhile((n) => n === '0', decimalNumberString).reduce((baseStr, n) => baseStr + n, ''); // use R.takeWhile later!
      var numbers = balanceStr.replace(zeros, '');
      var defaultOrFormattedBalanceStr = balanceStr.includes('0.') ? mkAssetBalanceHtmlStr(zeros, numbers, maxLen) : balanceStr;

      return defaultOrFormattedBalanceStr;
    }

    function mkAssetBalanceHtmlStr (zeros, amountStr_, maxLen) {
      var emptyOrBalanceEndHtmlStr = R.length(amountStr_) <= maxLen ? '' : '<span class="balance-end mini-balance">&hellip;</span>';
      var numbersFormatted = amountStr_.slice(0, maxLen);
      return '<span class="mini-balance">' + zeros + '</span>' + numbersFormatted + emptyOrBalanceEndHtmlStr;
    }

    function mkBalance (amount) {
      return R.compose(
        R.ifElse(
          R.equals('0'),
          R.always('0'),
          R.curry(regularOrZeroedBalance)(maxLengthSignificantDigits)
        ),
        bigNumberToString,
        toInt
      )(amount);
    }

    return R.isNil(normalizedAmount) || isNaN(normalizedAmount)
      ? '?'
      : mkBalance(normalizedAmount);
  },
  renderDataInDom: function (element, maxLengthSignificantDigits, data) {
    var formattedBalanceStr = U.formatFloatInHtmlStr(data, maxLengthSignificantDigits);
    renderElementInDom(element, formattedBalanceStr);
  }
};

fromInt = function (input, factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times((f > 1 ? '0.' + new Array(f).join('0') : '') + '1');
};

toInt = function (input, factor) {
  var f = Number(factor);
  var x = new Decimal(String(input));
  return x.times('1' + (f > 1 ? new Array(f + 1).join('0') : ''));
};

/* TO BE DEPRECATED */
formatFloat = function (n) {
  return String(Number(n));
};

isToken = function (symbol) {
  return (symbol.indexOf('.') !== -1 ? 1 : 0);
};

progressbar = function (size) { return '<div class="progress-radial" proc-data=""' + (size > 0 ? ' style="font-size: ' + size + 'em;" size="' + size + '"' : '') + '><div class="dot" style="' + (size > 0 ? 'width:' + size + 'px;height:' + size + 'px;"' : 'width:1em;height:1em;overflow:visible;"') + '"></div><svg style="margin-left:-' + (size > 0 ? size + 'px' : '1em') + ';" viewbox="0 0 80 80" height="120" width="120"><circle cx="40" cy="40" r="35" fill="rgba(255,255,255,0.0)" stroke="#BBB" stroke-width="10" stroke-dasharray="239" stroke-dashoffset="239" /></svg></div>'; };

// creates a unique user storage key for storing information and settings
userStorageKey = function (key) {
  return nacl.to_hex(sha256(GL.usercrypto.user_keys.boxPk)) + '-' + String(key);
};

userEncode = function (data) {
  var nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
  var crypt_utf8 = nacl.encode_utf8(JSON.stringify(data));
  var crypt_bin = nacl.crypto_box(crypt_utf8, nonce_salt, GL.usercrypto.user_keys.boxPk, GL.usercrypto.user_keys.boxSk);
  return UrlBase64.safeCompress(nacl.to_hex(crypt_bin));
};

userDecode = function (data) {
  var object = null;
  if (data != null) {
    var nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
    var crypt_hex = nacl.from_hex(UrlBase64.safeDecompress(data));
    // use nacl to create a crypto box containing the data
    var crypt_bin = nacl.crypto_box_open(crypt_hex, nonce_salt, GL.usercrypto.user_keys.boxPk, GL.usercrypto.user_keys.boxSk);
    try {
      object = JSON.parse(nacl.decode_utf8(crypt_bin));
    } catch (err) {
      object = null;
    }
  }
  return object;
};

function sanitizeServerObject (res) {
  var emptyOrIdentityObject = R.merge({}, res);
  return R.compose(
    R.assoc('data', R.__, emptyOrIdentityObject),
    R.ifElse(
      R.equals(0),
      R.toString,
      R.identity
    ),
    R.defaultTo('?'),
    R.prop('data')
  )(emptyOrIdentityObject);
};

function renderElementInDom (query, data) {
  var element = document.querySelector(query);
  // HACK to prevent innerHTML of undefined error when switching views.
  if (R.not(R.isNil(element))) {
    document.querySelector(query).innerHTML = data;
  }
}
