var Storage = storage;
var Valuations = valuations;
var M = manageAssets;
var U = utils;
var H = hybridd;

init.interface.assets = function (args) {
  // Expose functions globally
  changeManageButton = M.changeManageButton(M.renderManageButton); // TODO: Remove messy callback structure......
  getAmountValue = function () {
    var sendBalance = document.querySelector('#action-send .modal-send-balance').innerHTML;
    document.querySelector('#modal-send-amount').value = sendBalance;
  };
  U.setViewTab('assets'); // top menu UI change

  // INITIALIZE BUTTONS IN MANAGE ASSETS MODALS
  document.querySelector('#send-transfer').onclick = sendTransfer;
  document.querySelector('#save-assetlist').onclick = M.saveAssetList(displayAssets());

  U.documentReady(displayAssets(args));
};

function renderDollarPriceInAsset (asset, amount) {
  var symbolName = asset.slice(asset.indexOf('.') + 1);
  var assetDollarPrice = Valuations.renderDollarPrice(symbolName, amount);
  var query = document.getElementById(symbolName + '-dollar');
  if (query !== null) { query.innerHTML = assetDollarPrice; }
}

// Streamify!
function sendTransfer () {
  if (document.querySelector('#send-transfer').classList.contains('disabled')) {
    // cannot send transaction
  } else {
    // send transfer
    loadSpinner();
    var symbol = document.querySelector('#action-send .modal-send-currency').getAttribute('asset');
    var asset = R.find(R.propEq('id', symbol), GL.assets);
    sendTransaction({
      element: '.assets-main > .data .balance-' + symbol.replace(/\./g, '-'),
      asset,
      amount: Number(document.querySelector('#modal-send-amount').value.replace(/, /g, '.')), // Streamify!
      source: String(document.querySelector('#action-send .modal-send-addressfrom').innerHTML).trim(), // Streamify!
      target: String(document.querySelector('#modal-send-target').value.trim()) // Streamify!
    });
  }
}

function setStarredAssetClass (assetID, isStarred) {
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

toggleStar = function (assetID) {
  var globalAssets = GL.assets;
  var updatedGlobalAssets = R.reduce(maybeUpdateStarredProp(assetID), [], globalAssets);
  var isStarred = R.defaultTo(false, R.find(R.propEq('id', assetID, updatedGlobalAssets)));
  var starredForStorage = R.map(R.pickAll(['id', 'starred']), updatedGlobalAssets);

  Storage.Set(userStorageKey('ff00-0034'), userEncode(starredForStorage));
  U.updateGlobalAssets(updatedGlobalAssets);
  setStarredAssetClass(assetID, isStarred);
};

function uiAssets () {
  renderBalances();
  getNewMarketPrices(); // Should be done on a higher level. Move to interface.js
}

function renderBalances () {
  GL.assets.forEach(U.retrieveBalance(updateGlobalAssetsAndRenderDataInDOM, 11, '.assets-main > .data .balance-'));
}

function updateGlobalAssetsAndRenderDataInDOM (element, numberOfSignificantDigits, sanitizedData, assetID) {
  toggleAssetButtons(element, assetID, Number(sanitizedData));
  U.updateGlobalAssets(updateBalanceData(GL.assets, assetID, sanitizedData));
  U.renderDataInDom(element, numberOfSignificantDigits, sanitizedData);
  renderDollarPriceInAsset(assetID, Number(sanitizedData));
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
  var assetbuttonsClass = '.assets-main > .data .assetbuttons-' + assetID.replace(/\./g, '-');
  var balanceIsValid = R.allPass([
    R.compose(R.not, R.isNil),
    R.compose(R.not, isNaN)
  ])(balance);

  balanceIsValid
    ? toggleTransactionButtons(element, assetbuttonsClass, 'remove', 'data-toggle', 'modal', 'disabled', balance)
    : toggleTransactionButtons(element, assetbuttonsClass, 'add', 'disabled', 'disabled', 'data-toggle', '?');
}

function toggleTransactionButtons (elem, query, addOrRemove, attrToSet, val, attrToRemove, attr) {
  // HACK! Bug is not breaking functionality, but hack is ugly nonetheless. Optimize!
  var exists = R.not(R.isNil(document.querySelector(query))) || R.not(R.isNil(document.querySelector(elem)));
  if (exists) {
    document.querySelector(query).classList[addOrRemove]('disabled');
    document.querySelectorAll(query + ' a').forEach(toggleAttribute(attrToSet, val, attrToRemove));
    document.querySelector(elem).setAttribute('amount', attr);
  }
}

function toggleAttribute (attrToSet, val, attrToRemove) {
  return function (elem) {
    elem.setAttribute(attrToSet, val);
    elem.removeAttribute(attrToRemove);
  };
}
