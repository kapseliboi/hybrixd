var Valuations = valuations;
var M = manageAssets;
var U = utils;
var H = hybridd;
var Storage = storage;

var events = ['change', 'keydown', 'paste', 'input'];

init.interface.assets = function (args) {
  changeManageButton = M.changeManageButton(M.renderManageButton); // TODO: Remove messy callback structure......
  toggleStar = toggleStar;
  fillSend = fillSend;
  fillRecv = receiveAction;
  stopRecv = stopReceiveAction;
  checkTx = checkTx;

  topmenuset('assets'); // top menu UI change

  // INITIALIZE BUTTONS IN MANAGE ASSETS MODALS
  document.querySelector('#send-transfer').onclick = sendTransfer;
  document.querySelector('#save-assetlist').onclick = M.saveAssetList(displayAssets);
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
      asset: symbol,
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
  GL.assets.forEach(U.retrieveBalance(updateGlobalAssetsAndRenderDataInDOM, 11, '.assets-main > .data .balance-'));
}

function updateGlobalAssetsAndRenderDataInDOM (element, numberOfSignificantDigits, sanitizedData, assetID) {
  renderDataInDom(element, numberOfSignificantDigits, sanitizedData);
  renderDollarPriceInAsset(assetID, Number(sanitizedData));
  toggleAssetButtons(element, assetID, Number(sanitizedData));
  U.updateGlobalAssets(updateBalanceData(GL.assets, assetID, sanitizedData));
}

function updateBalanceData (assets, assetID, amount) {
  function updateBalances (updatedAssets, asset) {
    var amountLens = R.lensPath(['balance', 'amount']);
    var updatedBalanceAsset = R.set(amountLens, amount, asset);
    var defaultOrUpdatedAsset = R.equals(R.prop('id', asset), assetID)
        ? updatedBalanceAsset
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

function toggleAssetButtons (element, assetID, balance) {
  var assetbuttonsClass = '.assets-main > .data .assetbuttons-' + assetID.replace(/\./g,'-');
  var balanceIsValid = R.allPass([
    R.compose(R.not, R.isNil),
    R.compose(R.not, isNaN)
  ])(balance);

  balanceIsValid
    ? toggleTransactionButtons(element, assetbuttonsClass, 'remove', enableAttribute, balance)
    : toggleTransactionButtons(element, assetbuttonsClass, 'add', disableAttribute, '?');
}

function toggleTransactionButtons (elem, query, addOrRemove, fn, attr) {
  document.querySelector(query).classList[addOrRemove]('disabled');
  document.querySelectorAll(query + ' a').forEach(fn);
  document.querySelector(elem).setAttribute('amount', attr);
}

function disableAttribute (elem) {
  elem.setAttribute('disabled', 'disabled');
  elem.removeAttribute('data-toggle');
}

function enableAttribute (elem) {
  elem.removeAttribute('disabled');
  elem.setAttribute('data-toggle', 'modal');
}
