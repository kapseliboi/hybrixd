var Starred = starredAssets
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
  document.querySelector('#save-assetlist').onclick = M.saveAssetList(displayAssets());

  U.documentReady(displayAssets(args));
};

var txAmountStream = Rx.Observable
    .fromEvent(document.querySelector('#modal-send-amount'), 'input')
    .map(U.getTargetValue);

var txTargetAddressStream = Rx.Observable
    .fromEvent(document.querySelector('#modal-send-target'), 'input')
    .map(U.getTargetValue);
// .map(validateAddress) // ENTER ADDRESS VALIDATIONS

var sendTxButtonStream = Rx.Observable.fromEvent(document.querySelector('#send-transfer'), 'click')
    .filter(U.btnIsNotDisabled);

var transactionDataStream = Rx.Observable
    .combineLatest(
      txAmountStream,
      txTargetAddressStream,
      sendTxButtonStream
    );

function sendTransfer (z) {
  var symbol = document.querySelector('#action-send .modal-send-currency').getAttribute('asset');
  var asset = R.find(R.propEq('id', symbol), GL.assets); // TODO: Factor up
  var globalAssets = GL.assets; // TODO: Factor up
  var modeHashes = R.prop('modehashes', assets); // TODO: Factor up
  var txData = {
    element: '.assets-main > .data .balance-' + symbol.replace(/\./g, '-'),
    asset,
    amount: Number(R.nth(0, z)),
    source: R.prop('address', asset).trim(),
    target: String(R.nth(1, z)).trim()
  };

  loadSpinner();
  sendTransaction(txData, globalAssets, modeHashes, hideModal, alertError);
}

function hideModal (z) {
  var txData = R.nth(0, z);
  var transactionID = R.nth(1, z);
  UItransform.deductBalance(
    R.prop('element', txData),
    R.path(['asset', 'symbol'], txData),
    R.prop('balanceAfterTransaction', txData)
  );
  UItransform.txStop();
  UItransform.txHideModal();
  console.log(transactionID);
}

function alertError (err) {
  if (err !== 'Handling in deterministic.') {
    UItransform.txStop();
    alert('Error: ' + err);
    console.log('err = ', err);
  }
}

function uiAssets () {
  var assets = GL.assets;
  renderBalances(assets);
}

function renderBalances (assets) {
  assets.forEach(U.retrieveBalance(updateGlobalAssetsAndRenderDataInDOM, 11, '.assets-main > .data .balance-'));
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

function toggleAssetButtons (element, assetID, balance) {
  var assetbuttonsClass = '.assets-main > .data .assetbuttons-' + assetID.replace(/\./g, '-');
  var balanceIsValid = R.allPass([
    R.compose(R.not, R.isNil),
    R.compose(R.not, isNaN)
  ])(balance);

  balanceIsValid
    ? toggleTransactionButtons(element, assetbuttonsClass, 'remove', 'data-toggle', 'modal', 'disabled', balance)
    : toggleTransactionButtons(element, assetbuttonsClass, 'add', 'disabled', 'disabled', 'data-toggle', 'n/a');
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


function renderDollarPriceInAsset (asset, amount) {
  var symbolName = asset.slice(asset.indexOf('.') + 1);
  var assetDollarPrice = Valuations.renderDollarPrice(symbolName, amount);
  var query = document.getElementById(symbolName + '-dollar');
  if (query !== null) { query.innerHTML = assetDollarPrice; }
}

transactionDataStream.subscribe(sendTransfer);
