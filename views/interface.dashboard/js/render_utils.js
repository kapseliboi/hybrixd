var noStarredAssetsHTML = '<p>No starred assets found. <br>You can star your favorite assets in the Asset tab to make them appear here. <br><br><a class="pure-button pure-button-primary" onclick="fetchview(\'interface.assets\', pass_args);"><span>Go to My Assets</span></a></p>';

function mkHtmlForStarredAssets (htmlStr, asset) {
  var assetID = asset.id;
  var hyphenizedID = assetID.replace(/\./g, '-');
  var assetElementID = 'asset-' + hyphenizedID;
  var symbolName = assetID.slice(assetID.indexOf('.') + 1);
  var icon = (symbolName in black.svgs) ? black.svgs[symbolName] : mkSvgIcon(symbolName);

  return asset.starred
    ? htmlStr + '<div onclick="fetchview(\'interface.assets\',{user_keys: pass_args.user_keys, nonce: pass_args.nonce, asset:\'' + assetID + '\', element: \'' + assetElementID + '\'});" class="balance">' +
      '<div class="icon">' +
    icon +
    '</div>' +
    '<h5>' +
    assetID +
    '</h5>' +
    '<h3 class="balance balance-' + hyphenizedID + '">' +
    progressbar() +
    '</h3>' +
    '</div>'
    : htmlStr;
}

function formatFloatInHtmlStr (amount, maxLengthSignificantDigits) {
  var normalizedAmount = Number(amount);

  function regularOrZeroedBalance (balanceStr, maxLen) {
    var decimalNumberString = balanceStr.substring(2).split('');
    var zeros = R.compose(
      R.concat('0.'),
      R.reduce((baseStr, n) => baseStr + n, ''),
      R.takeWhile((n) => n === '0')
    )(decimalNumberString);
    var numbers = balanceStr.replace(zeros, '');
    var defaultOrFormattedBalanceStr = balanceStr.includes('0.') ? mkAssetBalanceHtmlStr(zeros, numbers, maxLen) : balanceStr;

    return defaultOrFormattedBalanceStr;
  }

  function mkAssetBalanceHtmlStr (zeros_, numbers_, maxLen) {
    var emptyOrBalanceEndHtmlStr = numbers_.length < maxLen ? '' : '<span class="balance-end" style="color: grey;">&hellip;</span>';
    var numbersFormatted = numbers_.slice(0, maxLen);
    return '<span style="font-size: 0.75em; color: grey;">' + zeros_ + '</span>' + numbersFormatted + emptyOrBalanceEndHtmlStr;
  }

  if (isNaN(normalizedAmount)) {
    return '?';
  } else {
    var balance = R.compose(bigNumberToString, toInt)(normalizedAmount);
    return balance === '0' ? '0' : regularOrZeroedBalance(balance, maxLengthSignificantDigits);
  }
}
