var Valuations = valuations;
var TxValidations = transactionValidations;
var SendAsset = sendAsset;
var ReceiveAsset = receiveAsset;
var M = manageAssets;
var U = utils;
var H = hybridd;
var A = asset;

init.interface.assets = function (args) {
  // Expose functions globally
  changeManageButton = M.changeManageButton(M.renderManageButton); // TODO: Remove messy callback structure......
  getAmountValue = function () {
    var sendBalance = document.querySelector('#action-send .modal-send-balance').innerHTML;
    document.querySelector('#modal-send-amount').value = sendBalance;
  };
  U.setViewTab('assets'); // top menu UI change

  // INITIALIZE BUTTONS IN MANAGE ASSETS MODALS
  document.querySelector('#save-assetlist').onclick = M.saveAssetList(main());

  U.documentReady(main(args));
};

function renderBalances (assets) {
  assets.forEach(U.retrieveBalance(updateGlobalAssetsAndRenderDataInDOM, 11, '.assets-main > .data .balance-'));
}

function updateGlobalAssetsAndRenderDataInDOM (element, numberOfSignificantDigits, sanitizedData, assetID) {
  A.toggleAssetButtons(element, assetID, Number(sanitizedData));
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

function renderDollarPriceInAsset (asset, amount) {
  var symbolName = asset.slice(asset.indexOf('.') + 1);
  var assetDollarPrice = Valuations.renderDollarPrice(symbolName, amount);
  var query = document.getElementById(symbolName + '-dollar');
  if (query !== null) { query.innerHTML = assetDollarPrice; }
}

function main (args) {
  return function () {
    var globalAssets = GL.assets;
    document.querySelector('.assets-main > .data').innerHTML = mkHtmlToRender(globalAssets);
    globalAssets.forEach(function (asset) { setStarredAssetClass(R.prop('id', asset), R.prop('starred', asset)); });
    U.scrollToAnchor(args);
    initializeAssetsInterfaceStreams();
  };
};

function mkAssetButtonStream (query) {
  return Rx.Observable.fromEvent(document.querySelectorAll('.' + query), 'click')
    .map(R.compose(
      // TODO: Make safe!!! Now can return undefined === UNSAFE!
      R.find(R.compose(
        R.test(new RegExp(query)),
        R.prop('className')
      )),
      R.prop('path')
    ))
    .map(function (elem) {
      return elem.getAttribute('data');
    });
}

function initializeAssetsInterfaceStreams () {
  var sendAssetButtonStream = mkAssetButtonStream('sendAssetButton');
  var receiveAssetButtonStream = mkAssetButtonStream('receiveAssetButton');

  var stopBalanceStream = Rx.Observable
      .fromEvent(document.querySelector('#topmenu-dashboard'), 'click');

  var retrieveBalanceStream = Rx.Observable
      .interval(30000)
      .startWith(0)
      .takeUntil(stopBalanceStream);

  retrieveBalanceStream.subscribe(function (_) { renderBalances(GL.assets); });
  sendAssetButtonStream.subscribe(function (assetID) {
    SendAsset.renderAssetDetailsInModal(assetID);
    TxValidations.toggleSendButtonClass();
  });
  receiveAssetButtonStream.subscribe(function (assetID) {
    ReceiveAsset.renderAssetDetailsInModal(assetID);
  });
}
