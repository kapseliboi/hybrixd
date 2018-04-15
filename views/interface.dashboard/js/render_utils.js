function mkHtmlForStarredAssets (acc, asset) {
  var assetID = asset.id;
  var hyphenizedID = assetID.replace(/\./g, '-');
  var assetElementID = 'asset-' + hyphenizedID;
  var symbolName = assetID.slice(assetID.indexOf('.') + 1);
  var icon = (symbolName in black.svgs) ? black.svgs[symbolName] : mkSvgIcon(symbolName);

  var str = asset.starred
      ? acc.str + '<div onclick="fetchview(\'interface.assets\',{user_keys: pass_args.user_keys, nonce: pass_args.nonce, asset:\'' + assetID + '\', element: \'' + assetElementID + '\'});" class="balance">' +
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
      : acc.str;
  return {i: acc.i + 1, str: str};
}
