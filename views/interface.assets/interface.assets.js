var Valuations = valuations;

init.interface.assets = function (args) {
  topmenuset('assets'); // top menu UI change
  clearInterval(intervals); // clear all active intervals

  scrollToAnchor = scrollToAnchor(args);
  clipb_success = clipboardSucces;
  clipb_fail = clipboardError;

  document.querySelector('#send-transfer').onclick = sendTransfer;
  document.querySelector('#save-assetlist').onclick = saveAssetList;
  GL.searchingactive = false;
  GL.searchval = '';

  var events = ['change', 'keydown', 'paste', 'input'];
  events.forEach(function (event) { document.querySelector('#search-assets').addEventListener(event, searchAssets); });

  // modal helper functions
  manageAssets = manageAssets;
  renderManageAssetsList = renderManageAssetsList;
  renderManageButton = renderManageButton;
  changeManageButton = changeManageButton;
  setStarredAssetClass = setStarredAssetClass;
  toggle_star = toggleStar;

  fill_send = fillSend;
  fill_recv = receiveAction;
  stop_recv = stopReceiveAction;
  check_tx = checkTx;

  // fill asset elements
  ui_assets = uiAssets(balance);
};

function renderAssetsButtons (element, balance, i) {
  return function (object) {
    var assetbuttonsClass = '.assets-main > .data .assetbuttons-' + balance.asset[i].replace(/\./g,'-');
    var objectDataIsValid = object.data !== null && !isNaN(object.data);
    if (objectDataIsValid) {
      renderDollarPriceInAsset(balance.asset[i], Number(object.data));
      setTimeout(function () { document.querySelector(assetbuttonsClass).classList.remove('disabled'); }, 1000);
      document.querySelector(assetbuttonsClass + ' a').removeAttribute('disabled');
      document.querySelector(assetbuttonsClass + ' a').setAttribute('data-toggle', 'modal');
      document.querySelector(element).setAttribute('amount', object.data);
      object.data = UItransform.formatFloat(object.data, 11);
    } else {
      document.querySelector(assetbuttonsClass).classList.add('disabled');
      document.querySelector(assetbuttonsClass + ' a').removeAttribute('data-toggle');
      document.querySelector(element).setAttribute('amount', '?');
      object.data = 'n/a';
    }
    return object;
  };
}

function renderDollarPriceInAsset (asset, amount) {
  var symbolName = asset.slice(asset.indexOf('.') + 1);
  var assetDollarPrice = Valuations.renderDollarPrice(symbolName, amount);
  var query = document.getElementById(symbolName + '-dollar');
  if (query !== null) { query.innerHTML = assetDollarPrice; }
}

function getNewMarketPrices () { Valuations.getDollarPrices(() => {}); }
function entryExists (entry) { return GL.assetSelect[entry]; }
function initializeAsset (entry) { initAsset(entry, R.prop(entry, GL.assetmodes)); }

function saveAssetList () {
  var newActiveAssets = R.filter(entryExists, R.keys(GL.assetnames));

  GL.assets = newActiveAssets;
  R.forEach(initializeAsset, newActiveAssets);
  storage.Set(userStorageKey('ff00-0033'), userEncode(newActiveAssets));
  starNewAssets(newActiveAssets);
  displayAssets(); // Re-render the view;
}

// NOW BREAKING
function starNewAssets (activeAssets) {
  var newAssetsToStar = activeAssets.filter(function (asset) {
    var foundOrUndefinedId = GL.assets.find(function (starred) {
      return starred.id === asset;
    });
    return foundOrUndefinedId === undefined;
  });

  console.log("newAssetsToStar = ", newAssetsToStar);

  // GL.assets = activeAssets.map(function (asset) {
  //   var foundOrUndefinedId = GL.assets.find(function (starred) {
  //     return asset === starred.id;
  //   });
  //   return foundOrUndefinedId === undefined ? {id: asset, starred: false} : foundOrUndefinedId;
  // });

  // storage.Set(userStorageKey('ff00-0034') , userEncode(GL.assets));
}

function sendTransfer () {
  if ($("#send-transfer").hasClass("disabled")) {
    // cannot send transaction
  } else {
    // send transfer
    loadSpinner();
    var symbol = $('#action-send .modal-send-currency').attr('asset');
    sendTransaction({
      element: '.assets-main > .data .balance-'+symbol.replace(/\./g,'-'),
      asset:symbol,
      amount:Number($("#modal-send-amount").val().replace(/\,/g,'.')),
      source:String($('#action-send .modal-send-addressfrom').html()).trim(),
      target:String($('#modal-send-target').val()).trim()
    });
  }
}

function searchAssets () {
  if (!GL.searchingactive) {
    GL.searchingactive = true;
    // delay the search to avoid many multiple spawns of renderManageAssetsList
    setTimeout(function () {
      if ($('#search-assets').val() !== GL.searchval) {
        renderManageAssetsList(GL.assetnames, $('#search-assets').val());
        GL.searchval = $('#search-assets').val();
      }
      GL.searchingactive = false;
    }, 250);
  }
}

function manageAssets() {
  GL.assetSelect = [];
  renderManageAssetsList(GL.assetnames);
}

function renderManageAssetsList (assetNames, searchQuery) {
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
    var entryExists = GL.assets.includes(entry);
    var element = entry.replace('.', '-');

    var assetIconHTMLStr = '<div class="icon">' + icon + '</div>';
    var assetIDHTMLSTr = '<div class="asset">' + entry.toUpperCase() + '</div>';
    var assetFullNameHTMLStr = '<div class="full-name">' + assetNames[entry] + '</div>';
    var actionBtns = '<div class="assetbuttons assetbuttons-' + element + '">' + renderManageButton(element, entry, entryExists) + '</div>';

    var htmlStr = '<div class="tr">' +
        '<div class="td col1">' + assetIconHTMLStr + assetIDHTMLSTr + assetFullNameHTMLStr + '</div>' +
        '<div class="td col2 actions">' + actionBtns + '</div>' +
        '</div>';
    return acc + htmlStr;
  }, '');

  var output = tableHTMLStr + assetsHTMLStr + '</div></div>';
  document.querySelector('.data.manageAssets').innerHTML = output; // insert new data into DOM
}

function setStarredAssetClass (i, isStarred) {
  var id = '#' + GL.assets[i]['id'].replace(/\./g, '_');
  $(id).children('svg').toggleClass('starred', isStarred);
};

// TODO REMOVE INDEX, USE NAME
function toggleStar (i) {
  var globalAssets = GL.assets;
  var updatedGlobalAssets = R.reduce(function (acc, asset) {
    var starredLens = R.lensProp('starred');
    var toggledStarredValue = R.not(R.view(starredLens, asset));
    var updatedOrCurrentAsset = asset.id === GL.assets[i]['id']
        ? R.set(starredLens, toggledStarredValue, asset)
        : asset;
    return R.append(updatedOrCurrentAsset, acc);
  }, [], globalAssets);
  var isStarred = updatedGlobalAssets[i]['starred'];
  var starredForStorage = R.map(R.pickAll(['id', 'starred']), updatedGlobalAssets);

  storage.Set(userStorageKey('ff00-0034'), userEncode(starredForStorage));
  GL.assets = updatedGlobalAssets;

  setStarredAssetClass(i, isStarred);
}

function uiAssets (balance) {
  return function (properties) {
    GL.assets.forEach(function (asset, i) {
      // setTimeout(
      // function () {
      if (typeof balance.asset[i] !== 'undefined') {
        var element = '.assets-main > .data .balance-' + balance.asset[i].replace(/\./g,'-');
        var timeIsCurrent = balance.lasttx[i] + 120000 < (new Date).getTime();
        var url = 'a/' + balance.asset[i] + '/balance/' + window.assets.addr[balance.asset[i]];
        if (timeIsCurrent) {
          hybriddcall({r: url, z: 0},
                      function (returnedObjFromServer, stuffToPassDown) {
                        var sanitizedData = sanitizeServerObject(returnedObjFromServer).data;
                        renderDataInDom(element, 11, sanitizedData);
                        fillAssetElement(element, asset.id, returnedObjFromServer);
                      });



          // renderAssetsButtons(element, balance, i));
        }
      }
      // }, i * 500);
    });
    setTimeout(getNewMarketPrices, 5000);
  };
}

function fillAssetElement (element, assetbuttons, object) {
  if (object.data !== null && !isNaN(object.data)) {
    $(assetbuttons).delay(1000).removeClass('disabled');
    $(assetbuttons + ' a').removeAttr('disabled');
    $(assetbuttons + ' a').attr('data-toggle', 'modal');
  } else {
    $(assetbuttons).addClass('disabled');
    $(assetbuttons + ' a').removeAttr('data-toggle');
    $(element).attr('amount', '?');
  }
  return object;
}
