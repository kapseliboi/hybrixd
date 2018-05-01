var Valuations = valuations;
var M = manageAssets;
var U = utils;
var Storage = storage;

var events = ['change', 'keydown', 'paste', 'input'];

init.interface.assets = function (args) {
  GL.searchingactive = false;
  GL.searchval = '';

  scrollToAnchor = scrollToAnchor(args);
  clipb_success = clipboardSucces;
  clipb_fail = clipboardError;

  // modal helper functions
  // TODO: Remove messy callback structure......
  manageAssets = M.manageAssets(M.renderManageAssetsList(M.renderManageButton));
  changeManageButton = M.changeManageButton(M.renderManageButton);
  toggleStar = toggleStar;

  fill_send = fillSend;
  fill_recv = receiveAction;
  stop_recv = stopReceiveAction;
  check_tx = checkTx;

  ui_assets = uiAssets();

  topmenuset('assets'); // top menu UI change

  // INITIALIZE BUTTONS IN MANAGE ASSETS MODALS
  document.querySelector('#send-transfer').onclick = sendTransfer;
  document.querySelector('#save-assetlist').onclick = M.saveAssetList(displayAssets);

  events.forEach(function (event) {
    document.querySelector('#search-assets').addEventListener(event, M.searchAssets(M.renderManageAssetsList(M.renderManageButton)));
  });
};

function renderDollarPriceInAsset (asset, amount) {
  var symbolName = asset.slice(asset.indexOf('.') + 1);
  var assetDollarPrice = Valuations.renderDollarPrice(symbolName, amount);
  var query = document.getElementById(symbolName + '-dollar');
  if (query !== null) { query.innerHTML = assetDollarPrice; }
}

function sendTransfer () {
  if (document.querySelector('#send-transfer').classList.contains('disabled')) {
    // cannot send transaction
  } else {
    // send transfer
    loadSpinner();
    var symbol = $('#action-send .modal-send-currency').attr('asset');
    sendTransaction({
      element: '.assets-main > .data .balance-' + symbol.replace(/\./g,'-'),
      asset:symbol,
      amount:Number($('#modal-send-amount').val().replace(/\,/g,'.')),
      source:String($('#action-send .modal-send-addressfrom').html()).trim(),
      target:String($('#modal-send-target').val()).trim()
    });
  }
}

function setStarredAssetClass (assetID, isStarred) {
  var id = '#' + assetID.replace(/\./g, '_'); // Mk into function. Being used elsewhere too.
  $(id).children('svg').toggleClass('starred', isStarred); // DAMN YOU JQUERY!!!!
}

function maybeUpdateStarredProp (assetID) {
  return function (acc, asset) {
    var starredLens = R.lensProp('starred');
    var toggledStarredValue = R.not(R.view(starredLens, asset));
    var updatedOrCurrentAsset = R.equals(R.prop('id', asset), assetID)
        ? R.set(starredLens, toggledStarredValue, asset)
        : asset;
    return R.append(updatedOrCurrentAsset, acc);
  };
}

function toggleStar (assetID) {
  var globalAssets = GL.assets;
  var updatedGlobalAssets = R.reduce(maybeUpdateStarredProp(assetID), [], globalAssets);
  var isStarred = R.defaultTo(false, R.find(R.propEq('id', assetID, updatedGlobalAssets)));
  var starredForStorage = R.map(R.pickAll(['id', 'starred']), updatedGlobalAssets);

  Storage.Set(userStorageKey('ff00-0034'), userEncode(starredForStorage));
  U.updateGlobalAssets(updatedGlobalAssets);
  setStarredAssetClass(assetID, isStarred);
}

function uiAssets () {
  renderBalances();
  getNewMarketPrices();
}

function renderBalances () {
  GL.assets.forEach(function (asset) {
    var assetID = R.prop('id', asset);
    var hyphenizedID = assetID.replace(/\./g,'-');
    var assetBalance = R.prop('balance', asset);
    var assetAddress = R.prop('address', asset);
    var element = '.assets-main > .data .balance-' + hyphenizedID;
    var timeIsCurrent = R.prop('lastTx', assetBalance) + 120000 < U.getCurrentTime();
    var url = 'a/' + assetID + '/balance/' + assetAddress;

    if (timeIsCurrent) {
      var balanceStream = H.mkHybriddCallStream(url)
          .map(data => {
            if (R.isNil(data.stopped) && data.progress < 1) {
              throw data; // error will be picked up by retryWhen
            }
            return data;
          })
          .retryWhen(function (errors) { return errors.delay(100); });

      balanceStream.subscribe(returnedObjectFromServer => {
        var sanitizedData = R.compose(
          R.prop('data'),
          sanitizeServerObject
        )(returnedObjectFromServer);

        renderDataInDom(element, 11, sanitizedData);
        fillAssetElement(element, R.prop('id', asset), Number(sanitizedData));
        renderDollarPriceInAsset(assetID, Number(sanitizedData));

        // Update globals
        GL.assets = updateBalanceData(GL.assets, assetID, sanitizedData);
      });
    }
  });
}

function updateBalanceData (assets, assetID, amount) {
  function updateBalances (updatedAssets, asset) {
    var amountLens = R.lensPath(['balance', 'amount']);
    var lastTxLens = R.lensPath(['balance', 'lastTx']);
    var defaultOrUpdatedAsset = asset.id === assetID
        ? R.compose(
          R.set(amountLens, amount),
          R.set(lastTxLens, U.getCurrentTime()))(asset)
        : asset;

    return R.append(defaultOrUpdatedAsset, updatedAssets);
  }
  return R.reduce(updateBalances, [], assets);
}

function getNewMarketPrices () {
  var dollarPriceStream = Rx.Observable
      .interval(5000);

  dollarPriceStream.subscribe(function (_) {
    Valuations.getDollarPrices(() => {});
  });
}

function fillAssetElement (element, assetID, balance) {
  if (balance !== null && !isNaN(balance)) {
    $(assetID).delay(1000).removeClass('disabled');
    $(assetID + ' a').removeAttr('disabled');
    $(assetID + ' a').attr('data-toggle', 'modal');
  } else {
    $(assetID).addClass('disabled');
    $(assetID + ' a').removeAttr('data-toggle');
    $(element).attr('amount', '?');
  }
}
