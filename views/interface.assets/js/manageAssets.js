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
        R.concat(GL.assets),
        R.map(mkNewAssetEntry),
        R.filter(entryIsSelected),
        R.keys
      )(GL.assetnames);

      function mkNewAssetEntry (assetName) {
        return R.merge({ id: null, starred: false }, { id: assetName });
      }

      // GLOBAL STUFF
      GL.assets = newActiveAssets;
      R.forEach(R.compose(initializeAsset, R.prop('id')), newActiveAssets);
      storage.Set(userStorageKey('ff00-0034'), userEncode(newActiveAssets));

      // RE-RENDER VIEW
      cb();
    };
  },
  searchAssets: function (cb) {
    if (!GL.searchingactive) {
      GL.searchingactive = true;
      // delay the search to avoid many multiple spawns of renderManageAssetsList
      setTimeout(function () {
        if ($('#search-assets').val() !== GL.searchval) {
          cb(GL.assetnames, $('#search-assets').val());
          GL.searchval = $('#search-assets').val();
        }
        GL.searchingactive = false;
      }, 250);
    }
  },
  manageAssets: function (fn) {
    return function () {
      GL.assetSelect = [];
      fn(GL.assetnames);
      // renderManageAssetsList(GL.assetnames);
    }
  },  // TODO: I'm sure I have to refactor this :D \/\/\/\/\/\/\/\/
  renderManageAssetsList: function (cb, cb2) {
    return function (assetNames, searchQuery) {
      if (typeof searchQuery !== 'undefined') { searchQuery = searchQuery.toLowerCase(); }

      for (var entry in GL.assetnames) {
        var hasCorrectType = typeof GL.assetSelect[entry] === 'undefined' || typeof GL.assetSelect[entry] === 'function';
        if (GL.assets.indexOf(entry) === -1) {
          // Check if type is function for Shift asset. TODO: Refactor.
          if (hasCorrectType) {
            GL.assetSelect[entry] = false;
          }
        } else {
          // Check if type is function for Shift asset.
          if (hasCorrectType) {
            GL.assetSelect[entry] = true;
          }
        }
      }

      var tableHTMLStr = '<div class="table">' +
          '<div class="thead">' +
          '<div class="tr">' +
          '<div class="th col1">Asset</div>' +
          '<div class="th col2" style="text-align:right;">Add / remove from wallet</div>' +
          '</div>' +
          '</div>' +
          '<div class="tbody">';

      function queryMatchesEntry (entry) {
        var assetID = R.toLower(R.nth(0, entry));
        var assetName = R.toLower(R.nth(1, entry));
        return R.test(new RegExp(searchQuery, 'g'), assetID) ||
          R.test(new RegExp(searchQuery, 'g'), assetName);
      }

      var matchedEntries = R.compose(
        R.keys,
        R.fromPairs,
        R.filter(queryMatchesEntry),
        R.toPairs
      )(assetNames);

      var assetsHTMLStr = matchedEntries.reduce(function (acc, entry) {
        var symbolName = entry.slice(entry.indexOf('.') + 1);
        var icon = (symbolName in black.svgs) ? black.svgs[symbolName] : mkSvgIcon(symbolName);
        var entryExists = R.any(R.propEq('id', entry), GL.assets);
        var element = entry.replace('.', '-');

        var assetIconHTMLStr = '<div class="icon">' + icon + '</div>';
        var assetIDHTMLSTr = '<div class="asset">' + entry.toUpperCase() + '</div>';
        var assetFullNameHTMLStr = '<div class="full-name">' + assetNames[entry] + '</div>';
        var actionBtns = '<div class="assetbuttons assetbuttons-' + element + '">' + cb(element, entry, entryExists) + '</div>';

        var htmlStr = '<div class="tr">' +
            '<div class="td col1">' + assetIconHTMLStr + assetIDHTMLSTr + assetFullNameHTMLStr + '</div>' +
            '<div class="td col2 actions">' + actionBtns + '</div>' +
            '</div>';
        return acc + htmlStr;
      }, '');

      var output = tableHTMLStr + assetsHTMLStr + '</div></div>';
      document.querySelector('.data.manageAssets').innerHTML = output; // insert new data into DOM
    };
  }
};

function entryIsSelected (entry) { return GL.assetSelect[entry]; } // R.has...? R.hasIn???
function initializeAsset (entry) { initAsset(entry, R.prop(entry, GL.assetmodes)); }
